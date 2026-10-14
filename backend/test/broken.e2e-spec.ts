import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Productos rotos + reparación + envío gratis (e2e)", () => {
  let app: INestApplication;
  let seller: TestUser;
  let buyer: TestUser;
  const suffix = Date.now();

  const base = (title: string, extra: Record<string, unknown> = {}) => ({
    title,
    description: "Producto roto de prueba con descripción válida",
    price: 40,
    condition: "used",
    category: "gpu",
    ...extra,
  });

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "Broken Seller",
      email: `broken.seller.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "Broken Buyer",
      email: `broken.buyer.${suffix}@test.com`,
      role: "buyer",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Reglas de creación (productos rotos)", () => {
    it("rechaza un roto sin etiqueta (no hay pérdida total) -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send(base("Roto sin etiqueta", { broken: true }));
      expect(res.status).toBe(400);
    });

    it("rechaza 'repuestos' con precio de reparación -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send(
          base("Repuestos con repair", {
            broken: true,
            brokenTag: "parts",
            repairPrice: 50,
          }),
        );
      expect(res.status).toBe(400);
    });

    it("crea un roto 'reparable' (queda en revisión: pending)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send(
          base("Placa reparable", {
            broken: true,
            brokenTag: "reparable",
            repairPrice: 60,
          }),
        );
      expect(res.status).toBe(201);
      expect(res.body.broken).toBe(true);
      expect(res.body.brokenTag).toBe("reparable");
      // Pasa por revisión obligatoria antes de publicarse.
      expect(res.body.status).toBe("pending");
    });
  });

  describe("Compra con reparación", () => {
    const createProduct = async (extra: Record<string, unknown>) => {
      const res = await request(app.getHttpServer())
        .post("/api/products")
        .set("Authorization", `Bearer ${seller.token}`)
        .send(base(`Reparable ${Date.now()}`, extra));
      expect(res.status).toBe(201);
      return res.body.id as string;
    };

    it("suma el costo de reparación al total", async () => {
      const productId = await createProduct({
        broken: true,
        brokenTag: "reparable",
        repairPrice: 60,
      });
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId,
          shippingAddress: "x",
          paymentMethod: "card",
          repairRequested: true,
        });
      expect(res.status).toBe(201);
      expect(Number(res.body.total)).toBe(100); // 40 + 60
      expect(res.body.repairRequested).toBe(true);
      expect(Number(res.body.repairFee)).toBe(60);
    });

    it("rechaza reparación en un producto de 'repuestos' -> 400", async () => {
      const productId = await createProduct({
        broken: true,
        brokenTag: "parts",
      });
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId,
          shippingAddress: "x",
          paymentMethod: "card",
          repairRequested: true,
        });
      expect(res.status).toBe(400);
    });
  });

  describe("Envío gratis sobre $250.000", () => {
    it("estándar gratis con subtotal >= 250000", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/shipping/quote?subtotal=300000",
      );
      const standard = res.body.options.find(
        (o: { service: string }) => o.service === "standard",
      );
      expect(standard.cost).toBe(0);
      expect(standard.free).toBe(true);
    });

    it("estándar con costo por debajo del umbral", async () => {
      const res = await request(app.getHttpServer()).get(
        "/api/shipping/quote?subtotal=100000",
      );
      const standard = res.body.options.find(
        (o: { service: string }) => o.service === "standard",
      );
      expect(standard.cost).toBeGreaterThan(0);
      expect(standard.free).toBe(false);
    });
  });
});
