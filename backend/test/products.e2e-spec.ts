import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Products (e2e)", () => {
  let app: INestApplication;
  let seller: TestUser;
  let otherSeller: TestUser;
  let productId: string;
  const suffix = Date.now();

  const validProduct = (title: string, extra: Record<string, unknown> = {}) => ({
    title,
    description: "Producto de prueba con descripción válida",
    price: 450,
    condition: "used",
    category: "gpu",
    ...extra,
  });

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "Product Seller",
      email: `products.seller.${suffix}@test.com`,
      role: "seller",
    });
    otherSeller = await registerAndLogin(app, {
      name: "Other Seller",
      email: `products.other.${suffix}@test.com`,
      role: "seller",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/products", () => {
    it("crea un producto publicado con stock por defecto", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send(validProduct("RTX 3080 Ti"));

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.title).toBe("RTX 3080 Ti");
      expect(Number(res.body.price)).toBe(450);
      expect(res.body.status).toBe("published");
      expect(res.body.stock).toBe(1);
      productId = res.body.id;
    });

    it("respeta el stock indicado", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send(validProduct("Stock x5", { stock: 5 }));
      expect(res.status).toBe(201);
      expect(res.body.stock).toBe(5);
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .send(validProduct("No auth"));
      expect(res.status).toBe(401);
    });

    it("falla con datos inválidos -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send({ title: "", price: -10 });
      expect(res.status).toBe(400);
    });

    it("un comprador no puede publicar -> 403", async () => {
      const buyer = await registerAndLogin(app, {
        name: "Products Buyer",
        email: `products.buyer.${suffix}@test.com`,
        role: "buyer",
      });
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send(validProduct("Buyer product"));
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/products", () => {
    it("devuelve listado paginado", async () => {
      const res = await request(app.getHttpServer()).get("/api/products");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe("number");
      expect(res.body).toHaveProperty("page");
      expect(res.body).toHaveProperty("hasMore");
    });

    it("filtra por categoría", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/products?category=gpu",
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it("filtra por rango de precio", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/products?minPrice=100&maxPrice=500",
      );
      expect(res.status).toBe(200);
    });

    it("filtra solo con stock (inStock)", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/products?inStock=true",
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe("GET /api/products/:id", () => {
    it("devuelve el producto por id", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/products/${productId}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(productId);
    });

    it("devuelve 404 si el uuid no existe", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/products/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status).toBe(404);
    });

    it("devuelve 400 si el id no es un uuid", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/products/not-a-uuid",
      );
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/products/:id", () => {
    it("el dueño actualiza su producto", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${seller.token}`)
        .send({ title: "RTX 3080 Ti Updated", price: 500 });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("RTX 3080 Ti Updated");
      expect(Number(res.body.price)).toBe(500);
    });

    it("otro vendedor no puede editarlo -> 403", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${otherSeller.token}`)
        .send({ title: "hack" });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("no permite borrar un producto no vendido -> 403", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/products/${productId}`)
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(403);
    });

    it("permite borrar un producto vendido", async () => {
      // Producto con stock 1 y se vende para que quede en estado "sold".
      const created = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send(validProduct("To be sold", { stock: 1 }));
      const id = created.body.id;

      const buyer = await registerAndLogin(app, {
        name: "Delete Buyer",
        email: `products.delbuyer.${suffix}@test.com`,
        role: "buyer",
      });
      await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId: id,
          shippingAddress: "Calle 123",
          paymentMethod: "credit_card",
        })
        .expect(201);

      const del = await request(app.getHttpServer())
        .delete(`/api/products/${id}`)
        .set("Authorization", `Bearer ${seller.token}`);
      expect(del.status).toBe(200);

      const after = await request(app.getHttpServer()).get(`/api/products/${id}`);
      expect(after.status).toBe(404);
    });
  });
});
