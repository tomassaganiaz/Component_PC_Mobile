import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Reviews (e2e)", () => {
  let app: INestApplication;
  let buyer: TestUser;
  let seller: TestUser;
  let productId: string;
  const suffix = Date.now();

  beforeAll(async () => {
    app = await createTestApp();
    buyer = await registerAndLogin(app, {
      name: "Review Buyer",
      email: `reviews.buyer.${suffix}@test.com`,
      role: "buyer",
    });
    seller = await registerAndLogin(app, {
      name: "Review Seller",
      email: `reviews.seller.${suffix}@test.com`,
      role: "seller",
    });

    const product = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({
        title: "Product for Review",
        description: "Producto para reseñas e2e con descripción válida",
        price: 200,
        condition: "used",
        category: "gpu",
      });
    productId = product.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/reviews", () => {
    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer()).post("/api/reviews").send({
        productId,
        orderId: "nonexistent",
        rating: 5,
        type: "positive",
      });
      expect(res.status).toBe(401);
    });

    it("falla con pedido inexistente -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/reviews")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId,
          orderId: "nonexistent",
          rating: 5,
          type: "positive",
        });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/reviews", () => {
    it("devuelve listado paginado de reseñas", async () => {
      const res = await request(app.getHttpServer()).get("/api/reviews");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe("number");
    });

    it("devuelve reseñas de un producto", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/reviews/product/${productId}`,
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("devuelve reseñas de un vendedor", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/reviews/seller/${seller.id}`,
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("devuelve el trust-badge del vendedor", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/reviews/trust-badge/${seller.id}`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("badge");
    });

    it("devuelve las estadísticas del vendedor", async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/reviews/stats/${seller.id}`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalSales");
    });

    it("devuelve 404 para una reseña inexistente", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/reviews/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status).toBe(404);
    });

    it("devuelve 400 para un id que no es uuid", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/reviews/not-a-uuid",
      );
      expect(res.status).toBe(400);
    });
  });
});
