import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Cart (e2e)", () => {
  let app: INestApplication;
  let seller: TestUser;
  let buyer: TestUser;
  let productA: string;
  let productB: string;
  const suffix = Date.now();

  const createProduct = async (title: string, price: number, stock: number) => {
    const res = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({
        title,
        description: "Producto carrito e2e con descripción válida",
        price,
        condition: "used",
        category: "gpu",
        stock,
      });
    expect(res.status).toBe(201);
    return res.body.id as string;
  };

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "Cart Seller",
      email: `cart.seller.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "Cart Buyer",
      email: `cart.buyer.${suffix}@test.com`,
      role: "buyer",
    });
    productA = await createProduct("Cart GPU A", 100, 5);
    productB = await createProduct("Cart GPU B", 50, 2);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Gestión del carrito", () => {
    it("agrega una unidad y suma si repite producto", async () => {
      const first = await request(app.getHttpServer())
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId: productA, quantity: 2 });
      expect(first.status).toBe(201);
      expect(first.body.items).toHaveLength(1);
      expect(first.body.items[0].quantity).toBe(2);

      const second = await request(app.getHttpServer())
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId: productA, quantity: 1 });
      expect(second.status).toBe(201);
      expect(second.body.items[0].quantity).toBe(3);
    });

    it("agrega un segundo producto", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId: productB, quantity: 1 });
      expect(res.status).toBe(201);
      expect(res.body.items).toHaveLength(2);
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/cart/items")
        .send({ productId: productA, quantity: 1 });
      expect(res.status).toBe(401);
    });

    it("falla con producto inexistente -> 404", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId: "00000000-0000-0000-0000-000000000000",
          quantity: 1,
        });
      expect(res.status).toBe(404);
    });

    it("permite quitar un ítem", async () => {
      const cart = await request(app.getHttpServer())
        .get("/api/cart")
        .set("Authorization", `Bearer ${buyer.token}`);
      const itemB = cart.body.items.find(
        (i: { productId: string }) => i.productId === productB,
      );
      const res = await request(app.getHttpServer())
        .delete(`/api/cart/items/${itemB.id}`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
    });
  });

  describe("Checkout", () => {
    it("crea una orden multi-ítem y descuenta stock", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/orders/checkout")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          shippingAddress: "Av. Siempreviva 742",
          paymentMethod: "card",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");
      expect(res.body.items).toHaveLength(1); // solo quedó el producto A x3
      expect(Number(res.body.total)).toBe(300);
      expect(res.body.items[0].quantity).toBe(3);

      const cart = await request(app.getHttpServer())
        .get("/api/cart")
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(cart.body.items).toHaveLength(0);

      const product = await request(app.getHttpServer()).get(
        `/api/products/${productA}`,
      );
      expect(product.body.stock).toBe(2);
    });

    it("falla el checkout con carrito vacío -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/orders/checkout")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ shippingAddress: "x", paymentMethod: "card" });
      expect(res.status).toBe(400);
    });
  });
});
