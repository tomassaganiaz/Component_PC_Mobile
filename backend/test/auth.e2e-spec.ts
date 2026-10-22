import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./test-app";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  const suffix = Date.now();
  const email = `auth.e2e.${suffix}@test.com`;
  const password = "password123";

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/auth/register", () => {
    it("registra un usuario sin exponer el password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ name: "Auth User", email, password });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.email).toBe(email);
      expect(res.body.password).toBeUndefined();
    });

    it("falla con email inválido -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ name: "Bad", email: "invalid-email", password });
      expect(res.status).toBe(400);
    });

    it("falla con password corto -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          name: "Bad",
          email: `short.${suffix}@test.com`,
          password: "12345",
        });
      expect(res.status).toBe(400);
    });

    it("falla con email duplicado -> 409", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ name: "Auth User", email, password });
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/auth/login", () => {
    it("loguea con credenciales válidas", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email, password });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("access_token");
      expect(res.body.user.email).toBe(email);
    });

    it("falla con password incorrecto -> 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email, password: "wrong-password" });
      expect(res.status).toBe(401);
    });

    it("falla con email inexistente -> 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: `nope.${suffix}@test.com`, password });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/profile", () => {
    let token = "";

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email, password });
      token = res.body.access_token;
    });

    it("devuelve el perfil con token válido", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(email);
    });

    it("falla sin token -> 401", async () => {
      const res = await request(app.getHttpServer()).get("/api/auth/profile");
      expect(res.status).toBe(401);
    });

    it("falla con token inválido -> 401", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
    });
  });
});
