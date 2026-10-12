import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Verifications (e2e)", () => {
  let app: INestApplication;
  let admin: TestUser;
  let seller: TestUser;
  let productId: string;
  let verificationId: string;
  const suffix = Date.now();

  beforeAll(async () => {
    app = await createTestApp();
    admin = await registerAndLogin(app, {
      name: "Verif Admin",
      email: `verif.admin.${suffix}@test.com`,
      role: "admin",
    });
    seller = await registerAndLogin(app, {
      name: "Verif Seller",
      email: `verif.seller.${suffix}@test.com`,
      role: "seller",
    });

    const product = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({
        title: "Used GPU for Verification",
        description: "GPU usada para verificación e2e con descripción válida",
        price: 300,
        condition: "used",
        category: "gpu",
      });
    productId = product.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/verifications", () => {
    it("crea una verificación como admin", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/verifications")
        .set("Authorization", `Bearer ${admin.token}`)
        .send({
          productId,
          result: "pass",
          notes: "Producto verificado correctamente",
          hoursOfUse: 500,
          physicalState: "Good",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.result).toBe("pass");
      expect(res.body.verifiedBy).toBe(admin.id);
      verificationId = res.body.id;
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/verifications")
        .send({ productId, result: "pass", notes: "Test" });
      expect(res.status).toBe(401);
    });

    it("falla con rol no admin -> 403", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/verifications")
        .set("Authorization", `Bearer ${seller.token}`)
        .send({ productId, result: "pass", notes: "Test" });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/verifications", () => {
    it("devuelve las verificaciones de un producto", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/verifications/product/${productId}`)
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("devuelve una verificación por id", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/verifications/${verificationId}`)
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/verifications/product/${productId}`,
      );
      expect(res.status).toBe(401);
    });
  });
});
