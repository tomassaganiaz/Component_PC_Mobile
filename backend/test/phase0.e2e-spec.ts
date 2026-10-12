import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Fase 0 (e2e): reputación, notificaciones y cupones", () => {
  let app: INestApplication;
  let seller: TestUser;
  let buyer: TestUser;
  let admin: TestUser;
  let productId: string;
  const suffix = Date.now();

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "F0 Seller",
      email: `f0.seller.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "F0 Buyer",
      email: `f0.buyer.${suffix}@test.com`,
      role: "buyer",
    });
    admin = await registerAndLogin(app, {
      name: "F0 Admin",
      email: `f0.admin.${suffix}@test.com`,
      role: "admin",
    });

    const product = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({
        title: "F0 GPU",
        description: "Producto fase 0 con descripción válida",
        price: 200,
        condition: "used",
        category: "gpu",
        stock: 3,
      });
    productId = product.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Reputación", () => {
    it("devuelve termómetro, medalla y métricas", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/reviews/reputation/${seller.id}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.level).toBeGreaterThanOrEqual(1);
      expect(res.body.level).toBeLessThanOrEqual(5);
      expect(res.body.color).toMatch(/^#/);
      expect(["none", "silver", "gold", "platinum"]).toContain(res.body.medal);
      expect(typeof res.body.totalSales).toBe("number");
      expect(typeof res.body.transactionsLast60d).toBe("number");
    });

    it("400 si el sellerId no es uuid", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/reviews/reputation/not-a-uuid",
      );
      expect(res.status).toBe(400);
    });
  });

  describe("Cupones", () => {
    let couponCode: string;

    it("admin crea un cupón", async () => {
      couponCode = `F0${suffix.toString().slice(-6)}`;
      const res = await request(app.getHttpServer())
        .post("/api/coupons")
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ code: couponCode, type: "percent", value: 10, minPurchase: 0 });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(couponCode.toUpperCase());
    });

    it("un comprador no puede crear cupones -> 403", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/coupons")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ code: "HACK10", type: "percent", value: 99 });
      expect(res.status).toBe(403);
    });

    it("valida el cupón y calcula el descuento", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/coupons/validate")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ code: couponCode, amount: 200 });
      expect(res.status).toBe(201);
      expect(res.body.discount).toBe(20);
      expect(res.body.finalTotal).toBe(180);
    });

    it("rechaza un cupón inexistente -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/coupons/validate")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ code: "NOEXISTE", amount: 200 });
      expect(res.status).toBe(400);
    });

    it("aplica el descuento al crear la orden", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId,
          shippingAddress: "Calle 123",
          paymentMethod: "card",
          couponCode,
        });
      expect(res.status).toBe(201);
      expect(Number(res.body.discount)).toBe(20);
      expect(Number(res.body.total)).toBe(180);
      expect(res.body.couponCode).toBe(couponCode.toUpperCase());
    });
  });

  describe("Notificaciones", () => {
    it("el vendedor recibe una notificación de venta", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/notifications")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("title");
      expect(res.body[0]).toHaveProperty("read");
    });

    it("el conteo de no leídas es numérico", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/notifications/unread-count")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.count).toBe("number");
      expect(res.body.count).toBeGreaterThan(0);
    });

    it("marca todas como leídas", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/notifications/read-all")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const count = await request(app.getHttpServer())
        .get("/api/notifications/unread-count")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(count.body.count).toBe(0);
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer()).get("/api/notifications");
      expect(res.status).toBe(401);
    });
  });
});
