import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Mercado Libre API (e2e)", () => {
  let app: INestApplication;
  let seller: TestUser;
  const suffix = Date.now();

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "ML Seller",
      email: `ml.seller.${suffix}@test.com`,
      role: "seller",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/mercadolibre/status", () => {
    it("devuelve el estado de configuración/conexión", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/mercadolibre/status")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("configured");
      expect(res.body).toHaveProperty("connected");
      // Sin ML_CLIENT_ID/SECRET en el entorno de test → no configurado.
      expect(res.body.configured).toBe(false);
      expect(res.body.connected).toBe(false);
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/mercadolibre/status",
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/mercadolibre/auth-url", () => {
    it("devuelve la URL de autorización OAuth", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/mercadolibre/auth-url")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.url).toBe("string");
      expect(res.body.url).toContain("authorization");
      expect(res.body.url).toContain("response_type=code");
      expect(res.body.configured).toBe(false);
    });
  });

  describe("GET /api/mercadolibre/sales", () => {
    it("devuelve ventas (mock cuando no hay credenciales)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/mercadolibre/sales")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(res.body.source).toBe("mock");
      expect(Array.isArray(res.body.sales)).toBe(true);
      expect(res.body.sales.length).toBeGreaterThan(0);

      const sale = res.body.sales[0];
      expect(sale).toHaveProperty("id");
      expect(sale).toHaveProperty("total");
      expect(sale).toHaveProperty("status");
      expect(sale).toHaveProperty("product");
      expect(typeof sale.product.title).toBe("string");
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/mercadolibre/sales",
      );
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/mercadolibre", () => {
    it("desconecta (idempotente) -> success", async () => {
      const res = await request(app.getHttpServer())
        .delete("/api/mercadolibre")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
