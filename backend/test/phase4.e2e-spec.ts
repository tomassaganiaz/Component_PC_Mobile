import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Fase 4 (e2e): envíos y tracking", () => {
  let app: INestApplication;
  let seller: TestUser;
  let buyer: TestUser;
  const suffix = Date.now();

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "F4 Seller",
      email: `f4.seller.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "F4 Buyer",
      email: `f4.buyer.${suffix}@test.com`,
      role: "buyer",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Cotización", () => {
    it("devuelve opciones de envío", async () => {
      const res = await request(app.getHttpServer()).get("/api/shipping/quote");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.options)).toBe(true);
      expect(res.body.options.length).toBeGreaterThanOrEqual(3);
    });

    it("el envío estándar es gratis sobre el umbral", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/shipping/quote?subtotal=300000",
      );
      const standard = res.body.options.find(
        (o: { service: string }) => o.service === "standard",
      );
      expect(standard.cost).toBe(0);
      expect(standard.free).toBe(true);
    });
  });

  describe("Tracking de la orden", () => {
    it("genera tracking al enviar y lo marca entregado", async () => {
      const product = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send({
          title: "F4 GPU envío",
          description: "Producto fase 4 con descripción válida",
          price: 100,
          condition: "used",
          category: "gpu",
          stock: 1,
        });
      const productId = product.body.id;

      const order = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId, shippingAddress: "x", paymentMethod: "card" });
      const orderId = order.body.id;

      await request(app.getHttpServer())
        .post(`/api/payments/${orderId}/intent`)
        .set("Authorization", `Bearer ${buyer.token}`)
        .expect(201);
      await request(app.getHttpServer())
        .post("/api/payments/webhook")
        .send({ orderId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/ship`)
        .set("Authorization", `Bearer ${seller.token}`)
        .expect(201);

      const tracking = await request(app.getHttpServer())
        .get(`/api/shipping/order/${orderId}`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(tracking.status).toBe(200);
      expect(tracking.body.trackingCode).toMatch(/^TS-/);
      expect(tracking.body.status).toBe("in_transit");

      await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/deliver`)
        .set("Authorization", `Bearer ${buyer.token}`)
        .expect(201);

      const delivered = await request(app.getHttpServer())
        .get(`/api/shipping/order/${orderId}`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(delivered.body.status).toBe("delivered");
    });

    it("el tracking requiere autenticación -> 401", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/shipping/order/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status).toBe(401);
    });
  });
});
