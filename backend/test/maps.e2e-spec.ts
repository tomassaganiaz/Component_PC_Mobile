import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Google Maps / tracking del paquete (e2e)", () => {
  let app: INestApplication;
  let seller: TestUser;
  let buyer: TestUser;
  const suffix = Date.now();

  const shipOrder = async (): Promise<string> => {
    const product = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({
        title: `Maps GPU ${Date.now()}`,
        description: "Producto para tracking con descripción válida",
        price: 100,
        condition: "used",
        category: "gpu",
        stock: 1,
      });
    const order = await request(app.getHttpServer())
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        productId: product.body.id,
        shippingAddress: "Av. Corrientes 1234, CABA",
        paymentMethod: "card",
      });
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
    return orderId;
  };

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "Maps Seller",
      email: `maps.seller.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "Maps Buyer",
      email: `maps.buyer.${suffix}@test.com`,
      role: "buyer",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/shipping/order/:id/tracking", () => {
    it("devuelve ubicación del paquete, distancia y ETA", async () => {
      const orderId = await shipOrder();

      const res = await request(app.getHttpServer())
        .get(`/api/shipping/order/${orderId}/tracking`)
        .set("Authorization", `Bearer ${buyer.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("courier");
      expect(res.body.courier).toHaveProperty("lat");
      expect(res.body.courier).toHaveProperty("lng");
      expect(res.body).toHaveProperty("origin");
      expect(res.body).toHaveProperty("destination");
      expect(typeof res.body.etaMinutes).toBe("number");
      expect(res.body.etaMinutes).toBeGreaterThanOrEqual(0);
      expect(typeof res.body.distanceRemainingKm).toBe("number");
      expect(res.body.distanceRemainingKm).toBeGreaterThanOrEqual(0);
      expect(typeof res.body.progress).toBe("number");
      expect(res.body.progress).toBeGreaterThanOrEqual(0);
      expect(res.body.progress).toBeLessThanOrEqual(1);
      expect(typeof res.body.etaText).toBe("string");
      // Sin GOOGLE_MAPS_API_KEY en test → no se arma el mapa.
      expect(res.body.mapUrl).toBeNull();
    });

    it("el envío sigue visible (shipment) tras despachar", async () => {
      const orderId = await shipOrder();
      const res = await request(app.getHttpServer())
        .get(`/api/shipping/order/${orderId}`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(200);
      expect(res.body.trackingCode).toMatch(/^TS-/);
      expect(res.body.status).toBe("in_transit");
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/shipping/order/00000000-0000-0000-0000-000000000000/tracking",
      );
      expect(res.status).toBe(401);
    });

    it("400 con id que no es uuid", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/shipping/order/not-a-uuid/tracking")
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(400);
    });
  });
});
