import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Admin (moderación) y upload de imágenes (e2e)", () => {
  let app: INestApplication;
  let seller: TestUser;
  let buyer: TestUser;
  let admin: TestUser;
  const suffix = Date.now();

  // PNG mínimo (1x1) para probar el upload.
  const pngBytes = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082",
    "hex",
  );

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "Admin Seller",
      email: `adm.seller.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "Admin Buyer",
      email: `adm.buyer.${suffix}@test.com`,
      role: "buyer",
    });
    admin = await registerAndLogin(app, {
      name: "Admin Root",
      email: `adm.root.${suffix}@test.com`,
      role: "admin",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const deliveredOrder = async (): Promise<{ orderId: string; productId: string }> => {
    const product = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({
        title: `Admin GPU ${Date.now()}`,
        description: "Producto admin e2e con descripción válida",
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
      .set("Authorization", `Bearer ${buyer.token}`);
    await request(app.getHttpServer()).post("/api/payments/webhook").send({ orderId });
    await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/ship`)
      .set("Authorization", `Bearer ${seller.token}`);
    await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/deliver`)
      .set("Authorization", `Bearer ${buyer.token}`);
    return { orderId, productId };
  };

  describe("Moderación de quejas", () => {
    it("el admin lista y resuelve una queja pendiente", async () => {
      const { orderId, productId } = await deliveredOrder();
      const review = await request(app.getHttpServer())
        .post("/api/reviews")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId,
          orderId,
          rating: 1,
          type: "complaint",
          complaintReason: "Producto defectuoso, no cumple la descripción.",
        });
      expect(review.status).toBe(201);

      const list = await request(app.getHttpServer())
        .get("/api/reviews?type=complaint&status=pending")
        .set("Authorization", `Bearer ${admin.token}`);
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body.data)).toBe(true);
      const found = list.body.data.find((r: { id: string }) => r.id === review.body.id);
      expect(found).toBeDefined();

      const resolved = await request(app.getHttpServer())
        .patch(`/api/reviews/${review.body.id}/resolve`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ status: "resolved", resolutionNotes: "Resuelta en el test" });
      expect(resolved.status).toBe(200);
      expect(resolved.body.status).toBe("resolved");
    });

    it("un no-admin no puede resolver quejas -> 403", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/reviews/00000000-0000-0000-0000-000000000000/resolve")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ status: "resolved" });
      expect(res.status).toBe(403);
    });
  });

  describe("Moderación de reportes", () => {
    it("el admin lista y resuelve un reporte", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/reports")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          reportedId: seller.id,
          targetType: "seller",
          reason: "Intentó vender fuera de la plataforma",
        });
      expect(created.status).toBe(201);

      const list = await request(app.getHttpServer())
        .get("/api/reports?status=pending")
        .set("Authorization", `Bearer ${admin.token}`);
      expect(list.status).toBe(200);
      const found = list.body.data.find((r: { id: string }) => r.id === created.body.id);
      expect(found).toBeDefined();

      const resolved = await request(app.getHttpServer())
        .patch(`/api/reports/${created.body.id}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ status: "resolved", resolutionNotes: "Resuelto en el test" });
      expect(resolved.status).toBe(200);
      expect(resolved.body.status).toBe("resolved");
    });
  });

  describe("Upload de imágenes", () => {
    it("sube una imagen con sesión y devuelve la URL /static", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/media/upload")
        .set("Authorization", `Bearer ${seller.token}`)
        .attach("file", pngBytes, "test.png");
      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/^\/static\/uploads\/.+\.png$/);
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/media/upload")
        .attach("file", pngBytes, "test.png");
      expect(res.status).toBe(401);
    });
  });
});
