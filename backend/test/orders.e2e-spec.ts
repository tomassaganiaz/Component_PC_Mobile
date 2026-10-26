import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Orders (e2e)", () => {
  let app: INestApplication;
  let seller: TestUser;
  let buyer: TestUser;
  let stranger: TestUser;
  let admin: TestUser;
  let productId: string;
  let orderId: string;
  const suffix = Date.now();

  const createProduct = async (stock: number, title: string) => {
    const res = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${seller.token}`)
      .send({
        title,
        description: "Producto para órdenes e2e con descripción válida",
        price: 250,
        condition: "used",
        category: "gpu",
        stock,
      });
    expect(res.status).toBe(201);
    return res.body.id as string;
  };

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "Order Seller",
      email: `orders.seller.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "Order Buyer",
      email: `orders.buyer.${suffix}@test.com`,
      role: "buyer",
    });
    stranger = await registerAndLogin(app, {
      name: "Order Stranger",
      email: `orders.stranger.${suffix}@test.com`,
      role: "buyer",
    });
    admin = await registerAndLogin(app, {
      name: "Order Admin",
      email: `orders.admin.${suffix}@test.com`,
      role: "admin",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/orders", () => {
    it("crea una orden en pending SIN consumir stock (la reserva es en pay)", async () => {
      productId = await createProduct(1, "Order GPU");

      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId,
          shippingAddress: "Av. Corrientes 1234",
          paymentMethod: "credit_card",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");
      expect(Number(res.body.total)).toBe(250);
      orderId = res.body.id;

      const product = await request(app.getHttpServer()).get(
        `/api/products/${productId}`,
      );
      // La orden PENDING no bloquea el producto: el stock se reserva al pagar.
      expect(product.body.stock).toBe(1);
      expect(product.body.status).toBe("published");
    });

    it("rechaza la compra si el producto no tiene stock -> 400", async () => {
      const outOfStockId = await createProduct(0, "Order GPU sin stock");
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${stranger.token}`)
        .send({
          productId: outOfStockId,
          shippingAddress: "Otra dirección",
          paymentMethod: "credit_card",
        });
      expect(res.status).toBe(400);
    });

    it("falla sin autenticación -> 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .send({ productId, shippingAddress: "x" });
      expect(res.status).toBe(401);
    });

    it("falla con uuid de producto inexistente -> 404", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({
          productId: "00000000-0000-0000-0000-000000000000",
          shippingAddress: "x",
        });
      expect(res.status).toBe(404);
    });

    it("falla con productId inválido -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId: "not-a-uuid", shippingAddress: "x" });
      expect(res.status).toBe(400);
    });
  });

  describe("Ciclo de vida (pay / ship / deliver)", () => {
    it("el comprador paga -> paid (y recién ahí se reserva el stock)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/pay`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe("paid");
      expect(res.body.custodyStartDate).toBeTruthy();

      const product = await request(app.getHttpServer()).get(
        `/api/products/${productId}`,
      );
      expect(product.body.stock).toBe(0);
      expect(product.body.status).toBe("sold");
    });

    it("un comprador no puede marcar como enviado -> 403", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/ship`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(403);
    });

    it("solo admin avanza recepción, inspección y sellado antes del envío", async () => {
      const forbidden = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/advance-fulfillment`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(forbidden.status).toBe(403);

      const stages = ["technical_inspection", "secure_packaging", "dispatch"];
      for (const stage of stages) {
        const res = await request(app.getHttpServer())
          .post(`/api/orders/${orderId}/advance-fulfillment`)
          .set("Authorization", `Bearer ${admin.token}`);
        expect(res.status).toBe(201);
        expect(res.body.fulfillmentStage).toBe(stage);
      }
    });

    it("el vendedor marca como enviado -> shipped", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/ship`)
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe("shipped");
    });

    it("el comprador confirma recepción -> delivered", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/deliver`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe("delivered");
      expect(res.body.custodyEndDate).toBeTruthy();
    });

    it("no se puede entregar una orden que no fue enviada -> 400", async () => {
      const pid = await createProduct(2, "Order GPU pending");
      const created = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId: pid, shippingAddress: "x", paymentMethod: "card" });

      const res = await request(app.getHttpServer())
        .post(`/api/orders/${created.body.id}/deliver`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(400);
    });
  });

  describe("Cancelación y reposición de stock", () => {
    it("cancelar una orden PAGADA repone el stock", async () => {
      const pid = await createProduct(2, "Order GPU cancel");

      const created = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId: pid, shippingAddress: "x", paymentMethod: "card" });
      expect(created.status).toBe(201);

      // Al pagar se reserva stock (2 → 1); recién ahí cancelar debe reponerlo.
      const paid = await request(app.getHttpServer())
        .post(`/api/orders/${created.body.id}/pay`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(paid.status).toBe(201);

      const reserved = await request(app.getHttpServer()).get(
        `/api/products/${pid}`,
      );
      expect(reserved.body.stock).toBe(1);

      const cancel = await request(app.getHttpServer())
        .post(`/api/orders/${created.body.id}/cancel`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(cancel.status).toBe(201);
      expect(cancel.body.status).toBe("cancelled");

      const after = await request(app.getHttpServer()).get(
        `/api/products/${pid}`,
      );
      expect(after.body.stock).toBe(2);
      expect(after.body.status).toBe("published");
    });
  });

  describe("Autorización de órdenes", () => {
    it("GET /api/orders/:id: buyer y seller OK, ajeno 403, admin OK", async () => {
      expect(
        (
          await request(app.getHttpServer())
            .get(`/api/orders/${orderId}`)
            .set("Authorization", `Bearer ${buyer.token}`)
        ).status,
      ).toBe(200);
      expect(
        (
          await request(app.getHttpServer())
            .get(`/api/orders/${orderId}`)
            .set("Authorization", `Bearer ${seller.token}`)
        ).status,
      ).toBe(200);
      expect(
        (
          await request(app.getHttpServer())
            .get(`/api/orders/${orderId}`)
            .set("Authorization", `Bearer ${stranger.token}`)
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app.getHttpServer())
            .get(`/api/orders/${orderId}`)
            .set("Authorization", `Bearer ${admin.token}`)
        ).status,
      ).toBe(200);
    });

    it("GET /api/orders/:id/protection: ajeno 403, buyer OK", async () => {
      expect(
        (
          await request(app.getHttpServer())
            .get(`/api/orders/${orderId}/protection`)
            .set("Authorization", `Bearer ${stranger.token}`)
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app.getHttpServer())
            .get(`/api/orders/${orderId}/protection`)
            .set("Authorization", `Bearer ${buyer.token}`)
        ).status,
      ).toBe(200);
    });

    it("PATCH /api/orders/:id: buyer 403, admin 200", async () => {
      const asBuyer = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ status: "delivered" });
      expect(asBuyer.status).toBe(403);

      const asAdmin = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ shippingAddress: "Actualizada por admin" });
      expect(asAdmin.status).toBe(200);
    });
  });

  describe("GET /api/orders/sales", () => {
    it("el vendedor ve sus ventas (comprador sanitizado)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/orders/sales")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const sale = res.body.find((s: { id: string }) => s.id === orderId);
      expect(sale).toBeDefined();
      expect(sale.buyer).toHaveProperty("name");
      expect(sale.buyer.password).toBeUndefined();
    });

    it("un comprador no puede ver ventas -> 403", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/orders/sales")
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/orders", () => {
    it("devuelve las compras del comprador", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
