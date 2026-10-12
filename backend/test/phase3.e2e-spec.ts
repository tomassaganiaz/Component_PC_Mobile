import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Fase 3 (e2e): variaciones/SKU y panel admin", () => {
  let app: INestApplication;
  let seller: TestUser;
  let otherSeller: TestUser;
  let buyer: TestUser;
  let admin: TestUser;
  let productId: string;
  const suffix = Date.now();

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "F3 Seller",
      email: `f3.seller.${suffix}@test.com`,
      role: "seller",
    });
    otherSeller = await registerAndLogin(app, {
      name: "F3 Other",
      email: `f3.other.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "F3 Buyer",
      email: `f3.buyer.${suffix}@test.com`,
      role: "buyer",
    });
    admin = await registerAndLogin(app, {
      name: "F3 Admin",
      email: `f3.admin.${suffix}@test.com`,
      role: "admin",
    });

    const product = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({
        title: "F3 GPU con variantes",
        description: "Producto fase 3 con descripción válida",
        price: 100,
        condition: "new",
        category: "gpu",
        stock: 10,
      });
    productId = product.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Variaciones", () => {
    let variationId: string;

    it("el vendedor agrega una variación", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/products/${productId}/variations`)
        .set("Authorization", `Bearer ${seller.token}`)
        .send({
          sku: `F3-SKU-${suffix}`,
          attributes: { ram: "16GB", color: "negro" },
          stock: 1,
          priceDelta: 50,
        });
      expect(res.status).toBe(201);
      expect(res.body.stock).toBe(1);
      variationId = res.body.id;
    });

    it("lista las variaciones del producto", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/products/${productId}/variations`,
      );
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it("otro vendedor no puede agregar variaciones -> 403", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/products/${productId}/variations`)
        .set("Authorization", `Bearer ${otherSeller.token}`)
        .send({ sku: `HACK-${suffix}`, stock: 1 });
      expect(res.status).toBe(403);
    });

    it("compra de la variante usa su precio y descuenta su stock", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId,
          variationId,
          shippingAddress: "x",
          paymentMethod: "card",
        });
      expect(res.status).toBe(201);
      expect(Number(res.body.total)).toBe(150);

      const variations = await request(app.getHttpServer()).get(
        `/api/products/${productId}/variations`,
      );
      expect(variations.body[0].stock).toBe(0);
    });

    it("sin stock de la variante -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId, variationId, shippingAddress: "x" });
      expect(res.status).toBe(400);
    });
  });

  describe("Panel admin", () => {
    it("devuelve el overview para admin", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/admin/overview")
        .set("Authorization", `Bearer ${admin.token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.users).toBe("number");
      expect(typeof res.body.products).toBe("number");
      expect(typeof res.body.revenue).toBe("number");
      expect(res.body).toHaveProperty("pendingComplaints");
      expect(res.body).toHaveProperty("openReports");
    });

    it("un no-admin no puede ver el overview -> 403", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/admin/overview")
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(403);
    });
  });
});
