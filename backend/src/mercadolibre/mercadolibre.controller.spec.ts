import { Test, TestingModule } from "@nestjs/testing";
import { MercadoLibreController } from "./mercadolibre.controller";
import { MercadoLibreService } from "./mercadolibre.service";
import { MlImportService } from "./ml-import.service";
import { MlWebhookRetryService } from "./ml-webhook-retry.service";
import { BadRequestException } from "@nestjs/common";

describe("MercadoLibreController", () => {
  let controller: MercadoLibreController;
  let service: MercadoLibreService;
  let importService: MlImportService;
  let webhookRetry: MlWebhookRetryService;

  const mockService = {
    getStatus: jest.fn(),
    getAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
    getSales: jest.fn(),
    disconnect: jest.fn(),
    publishItem: jest.fn(),
    updateItem: jest.fn(),
    getItem: jest.fn(),
    handleWebhook: jest.fn(),
    subscribeTopics: jest.fn(),
    listSubscriptions: jest.fn(),
    unsubscribeTopic: jest.fn(),
    getCategoryAttributesForLocal: jest.fn(),
    setImportService: jest.fn(),
  };

  const mockImportService = {
    importSales: jest.fn(),
  };

  const mockWebhookRetry = {
    enqueueWebhook: jest.fn(),
    getWebhookHealth: jest.fn(),
    listDeadLetter: jest.fn(),
    replayDeadLetter: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercadoLibreController],
      providers: [
        { provide: MercadoLibreService, useValue: mockService },
        { provide: MlImportService, useValue: mockImportService },
        { provide: MlWebhookRetryService, useValue: mockWebhookRetry },
      ],
    }).compile();

    controller = module.get<MercadoLibreController>(MercadoLibreController);
    service = module.get<MercadoLibreService>(MercadoLibreService);
    importService = module.get<MlImportService>(MlImportService);
    webhookRetry = module.get<MlWebhookRetryService>(MlWebhookRetryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("status", () => {
    it("returns connection status", async () => {
      mockService.getStatus.mockResolvedValue({
        configured: true,
        connected: true,
        mlUserId: "ml-123",
      });

      const result = await controller.status({
        user: { id: "user-123" },
      } as any);

      expect(result).toEqual({
        configured: true,
        connected: true,
        mlUserId: "ml-123",
      });
      expect(mockService.getStatus).toHaveBeenCalledWith("user-123");
    });
  });

  describe("authUrl", () => {
    it("returns auth URL", async () => {
      mockService.getAuthUrl.mockReturnValue({
        url: "https://auth.mercadolibre.com.ar/authorization?client_id=test&state=user-123",
        configured: true,
      });

      const result = await controller.authUrl({
        user: { id: "user-123" },
      } as any);

      expect(result.url).toContain("mercadolibre.com.ar");
      expect(result.configured).toBe(true);
    });
  });

  describe("sales", () => {
    it("returns sales with pagination", async () => {
      mockService.getSales.mockResolvedValue({
        source: "mercadolibre",
        sales: [{ id: "order-1", total: 100 }],
        pagination: { offset: 0, limit: 50, total: 100, hasMore: true },
      });

      const result = await controller.sales(
        { user: { id: "user-123" } } as any,
        "0",
        "50",
      );

      expect(result.source).toBe("mercadolibre");
      expect(result.sales).toHaveLength(1);
      expect(result.pagination).toEqual({
        offset: 0,
        limit: 50,
        total: 100,
        hasMore: true,
      });
    });

    it("uses defaults when offset/limit not provided", async () => {
      mockService.getSales.mockResolvedValue({
        source: "mock",
        sales: [],
        pagination: { offset: 0, limit: 50, total: 4, hasMore: false },
      });

      await controller.sales({ user: { id: "user-123" } } as any);

      expect(mockService.getSales).toHaveBeenCalledWith("user-123", {
        offset: 0,
        limit: 50,
      });
    });
  });

  describe("disconnect", () => {
    it("disconnects account", async () => {
      mockService.disconnect.mockResolvedValue(undefined);

      const result = await controller.disconnect({
        user: { id: "user-123" },
      } as any);

      expect(result).toEqual({ success: true });
      expect(mockService.disconnect).toHaveBeenCalledWith("user-123");
    });
  });

  describe("publish", () => {
    it("publishes product successfully", async () => {
      mockService.publishItem.mockResolvedValue({
        id: "MLA123456",
        permalink: "https://ml.com/item",
        status: "active",
      });

      const result = await controller.publish(
        { user: { id: "user-123" } } as any,
        "prod-123",
      );

      expect(result.id).toBe("MLA123456");
      expect(mockService.publishItem).toHaveBeenCalledWith(
        "user-123",
        "prod-123",
      );
    });

    it("propagates BadRequestException from service", async () => {
      mockService.publishItem.mockRejectedValue(
        new BadRequestException("No stock"),
      );

      await expect(
        controller.publish({ user: { id: "user-123" } } as any, "prod-123"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("importSales", () => {
    it("imports sales via import service", async () => {
      mockImportService.importSales.mockResolvedValue({
        source: "mercadolibre",
        total: 5,
        imported: 3,
        skipped: 2,
      });

      const result = await controller.importSales({
        user: { id: "user-123" },
      } as any);

      expect(result.imported).toBe(3);
      expect(result.skipped).toBe(2);
      expect(mockImportService.importSales).toHaveBeenCalledWith("user-123");
    });
  });

  describe("updateItem", () => {
    it("updates ML item", async () => {
      mockService.updateItem.mockResolvedValue({
        id: "MLA123",
        status: "active",
      });

      const result = await controller.updateItem(
        { user: { id: "user-123" } } as any,
        "MLA123",
        { price: 500, available_quantity: 3 },
      );

      expect(result.id).toBe("MLA123");
      expect(mockService.updateItem).toHaveBeenCalledWith(
        "user-123",
        "MLA123",
        {
          price: 500,
          available_quantity: 3,
        },
      );
    });
  });

  describe("getItem", () => {
    it("returns ML item details", async () => {
      mockService.getItem.mockResolvedValue({ id: "MLA123", title: "Test" });

      const result = await controller.getItem(
        { user: { id: "user-123" } } as any,
        "MLA123",
      );

      expect(result.id).toBe("MLA123");
      expect(mockService.getItem).toHaveBeenCalledWith("user-123", "MLA123");
    });
  });

  describe("webhook", () => {
    it("processes webhook and returns result", async () => {
      mockWebhookRetry.enqueueWebhook.mockResolvedValue("webhook-123");

      const result = await controller.webhook(
        "signature",
        "orders_v2",
        "/orders/123",
        "user-123",
        { body: {} } as any,
      );

      expect(result.processed).toBe(false);
      expect(result.message).toBe(
        "Webhook encolado para procesamiento asíncrono",
      );
      expect(result.webhookId).toBe("webhook-123");
      expect(mockWebhookRetry.enqueueWebhook).toHaveBeenCalledWith({
        topic: "orders_v2",
        resource: "/orders/123",
        userId: "user-123",
        signature: "signature",
        rawBody: "{}",
        receivedAt: expect.any(Date),
      });
    });

    it("returns error when missing required params", async () => {
      const result = await controller.webhook("", "", "", "", {
        body: {},
      } as any);

      expect(result.processed).toBe(false);
      expect(result.message).toContain("Missing required");
      expect(mockWebhookRetry.enqueueWebhook).not.toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("subscribes to topics", async () => {
      mockService.subscribeTopics.mockResolvedValue({
        subscribed: ["orders_v2", "payments"],
        failed: [],
      });

      const result = await controller.subscribe(
        { user: { id: "user-123" } } as any,
        {
          topics: ["orders_v2", "payments"],
        },
      );

      expect(result.subscribed).toContain("orders_v2");
      expect(result.subscribed).toContain("payments");
    });
  });

  describe("listSubscriptions", () => {
    it("returns active subscriptions", async () => {
      mockService.listSubscriptions.mockResolvedValue([
        { topic: "orders_v2", callback_url: "https://..." },
      ]);

      const result = await controller.listSubscriptions({
        user: { id: "user-123" },
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].topic).toBe("orders_v2");
    });
  });

  describe("unsubscribe", () => {
    it("unsubscribes from topic", async () => {
      mockService.unsubscribeTopic.mockResolvedValue(undefined);

      const result = await controller.unsubscribe(
        { user: { id: "user-123" } } as any,
        "orders_v2",
      );

      expect(result.success).toBe(true);
      expect(mockService.unsubscribeTopic).toHaveBeenCalledWith(
        "user-123",
        "orders_v2",
      );
    });
  });

  describe("categoryAttributes", () => {
    it("returns category attributes", async () => {
      mockService.getCategoryAttributesForLocal.mockResolvedValue({
        mlCategoryId: "MLA1744",
        required: [{ id: "BRAND", name: "Marca" }],
        optional: [{ id: "COLOR", name: "Color" }],
      });

      const result = await controller.categoryAttributes(
        { user: { id: "user-123" } } as any,
        "gpu",
      );

      expect(result.mlCategoryId).toBe("MLA1744");
      expect(result.required).toHaveLength(1);
    });
  });
});
