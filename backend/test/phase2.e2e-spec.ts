import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerAndLogin, type TestUser } from "./test-app";

describe("Fase 2 (e2e): pagos y wallet", () => {
  let app: INestApplication;
  let seller: TestUser;
  let buyer: TestUser;
  let admin: TestUser;
  const suffix = Date.now();

  const createProduct = async (token: string, price: number) => {
    const res = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: `F2 GPU ${Date.now()}`,
        description: "Producto fase 2 con descripción válida",
        price,
        condition: "used",
        category: "gpu",
        stock: 5,
      });
    expect(res.status).toBe(201);
    return res.body.id as string;
  };

  const buyAndPay = async (productId: string): Promise<string> => {
    const order = await request(app.getHttpServer())
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ productId, shippingAddress: "x", paymentMethod: "card" });
    expect(order.status).toBe(201);
    const orderId = order.body.id;

    const intent = await request(app.getHttpServer())
      .post(`/api/payments/${orderId}/intent`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(intent.status).toBe(201);
    expect(intent.body.status).toBe("pending");

    const webhook = await request(app.getHttpServer())
      .post("/api/payments/webhook")
      .send({ orderId, event: "payment.succeeded" });
    expect(webhook.status).toBe(201);
    expect(webhook.body.status).toBe("paid");

    return orderId;
  };

  beforeAll(async () => {
    app = await createTestApp();
    seller = await registerAndLogin(app, {
      name: "F2 Seller",
      email: `f2.seller.${suffix}@test.com`,
      role: "seller",
    });
    buyer = await registerAndLogin(app, {
      name: "F2 Buyer",
      email: `f2.buyer.${suffix}@test.com`,
      role: "buyer",
    });
    admin = await registerAndLogin(app, {
      name: "F2 Admin",
      email: `f2.admin.${suffix}@test.com`,
      role: "admin",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Pagos", () => {
    it("intent + webhook confirman el pago (→ paid)", async () => {
      const productId = await createProduct(seller.token, 200);
      const orderId = await buyAndPay(productId);

      const order = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(order.body.status).toBe("paid");
    });

    it("no permite crear intent de una orden ya pagada -> 400", async () => {
      const productId = await createProduct(seller.token, 100);
      const orderId = await buyAndPay(productId);
      const intent = await request(app.getHttpServer())
        .post(`/api/payments/${orderId}/intent`)
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(intent.status).toBe(400);
    });

    it("un tercero no puede crear intent de una orden ajena -> 403", async () => {
      const productId = await createProduct(seller.token, 100);
      const order = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ productId, shippingAddress: "x" });
      const intent = await request(app.getHttpServer())
        .post(`/api/payments/${order.body.id}/intent`)
        .set("Authorization", `Bearer ${seller.token}`);
      expect(intent.status).toBe(403);
    });
  });

  describe("Wallet", () => {
    it("acredita al vendedor al confirmar la entrega", async () => {
      const productId = await createProduct(seller.token, 200);
      const orderId = await buyAndPay(productId);

      await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/ship`)
        .set("Authorization", `Bearer ${seller.token}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/deliver`)
        .set("Authorization", `Bearer ${buyer.token}`)
        .expect(201);

      const wallet = await request(app.getHttpServer())
        .get("/api/wallet")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(wallet.status).toBe(200);
      expect(Number(wallet.body.balance)).toBeGreaterThanOrEqual(200);
      expect(wallet.body.entries.length).toBeGreaterThan(0);
    });

    it("permite solicitar un retiro y descuenta del saldo", async () => {
      const before = await request(app.getHttpServer())
        .get("/api/wallet")
        .set("Authorization", `Bearer ${seller.token}`);

      const payout = await request(app.getHttpServer())
        .post("/api/wallet/payouts")
        .set("Authorization", `Bearer ${seller.token}`)
        .send({ amount: 50 });
      expect(payout.status).toBe(201);
      expect(payout.body.status).toBe("pending");

      const after = await request(app.getHttpServer())
        .get("/api/wallet")
        .set("Authorization", `Bearer ${seller.token}`);
      expect(Number(after.body.balance)).toBe(
        Number(before.body.balance) - 50,
      );
    });

    it("rechaza un retiro mayor al saldo -> 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/wallet/payouts")
        .set("Authorization", `Bearer ${seller.token}`)
        .send({ amount: 99999 });
      expect(res.status).toBe(400);
    });

    it("el reembolso acredita al comprador y debita al vendedor", async () => {
      const productId = await createProduct(seller.token, 150);
      const orderId = await buyAndPay(productId);

      await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/ship`)
        .set("Authorization", `Bearer ${seller.token}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/deliver`)
        .set("Authorization", `Bearer ${buyer.token}`)
        .expect(201);

      const buyerBefore = await request(app.getHttpServer())
        .get("/api/wallet")
        .set("Authorization", `Bearer ${buyer.token}`);

      const ret = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/return`)
        .set("Authorization", `Bearer ${buyer.token}`)
        .send({ reason: "Producto con fallas de fábrica" });
      expect(ret.status).toBe(201);
      expect(ret.body.status).toBe("refunded");

      const buyerAfter = await request(app.getHttpServer())
        .get("/api/wallet")
        .set("Authorization", `Bearer ${buyer.token}`);
      expect(Number(buyerAfter.body.balance)).toBe(
        Number(buyerBefore.body.balance) + 150,
      );
    });

    it("permite reembolsar el pago como admin", async () => {
      const productId = await createProduct(seller.token, 100);
      const orderId = await buyAndPay(productId);
      const res = await request(app.getHttpServer())
        .post(`/api/payments/${orderId}/refund`)
        .set("Authorization", `Bearer ${admin.token}`);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe("refunded");
    });
  });
});
