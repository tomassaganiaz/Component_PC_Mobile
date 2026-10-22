import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { MercadoLibreService } from "./mercadolibre.service";
import { MlCredential } from "./ml-credential.entity";
import {
  Product,
  ProductCondition,
  ProductCategory,
  ProductStatus,
} from "../products/product.entity";
import { ProductVariation } from "../products/product-variation.entity";
import { ProductsService } from "../products/products.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("MercadoLibreService", () => {
  let service: MercadoLibreService;

  const createMocks = () => {
    const mockCredentialRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          ML_CLIENT_ID: "test-client-id",
          ML_CLIENT_SECRET: "test-client-secret",
          ML_SITE: "MLA",
          ML_REDIRECT_URI: "http://localhost:3000/api/mercadolibre/callback",
          ML_WEBHOOK_URL: "http://localhost:3000/api/mercadolibre/webhook",
        };
        return config[key] ?? "";
      }),
    };

    const mockProductsService = {
      findOne: jest.fn(),
      listVariations: jest.fn(),
    };

    // Create a proper fetch mock that returns a Response-like object
    const createFetchMock = () => {
      const responses: any[] = [];
      const mockFn = jest.fn((...args: any[]) => {
        const response = responses.shift() || {
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        };
        return Promise.resolve(response);
      });
      (mockFn as any).mockResponse = (response: any) => {
        responses.push(response);
        return mockFn;
      };
      (mockFn as any).mockResponseOnce = (response: any) => {
        responses.push(response);
        return mockFn;
      };
      return mockFn;
    };

    const mockFetch = createFetchMock();

    return {
      mockCredentialRepository,
      mockConfigService,
      mockProductsService,
      mockFetch,
    };
  };

  beforeEach(async () => {
    const {
      mockCredentialRepository,
      mockConfigService,
      mockProductsService,
      mockFetch,
    } = createMocks();
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoLibreService,
        {
          provide: getRepositoryToken(MlCredential),
          useValue: mockCredentialRepository,
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<MercadoLibreService>(MercadoLibreService);
    (service as any).mockCredentialRepository = mockCredentialRepository;
    (service as any).mockConfigService = mockConfigService;
    (service as any).mockProductsService = mockProductsService;
    (service as any).mockFetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global.fetch as any).mockClear?.();
  });

  describe("isConfigured", () => {
    it("returns true when ML_CLIENT_ID and ML_CLIENT_SECRET are set", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("returns false when ML_CLIENT_ID is missing", () => {
      (service as any).mockConfigService.get.mockImplementation(
        (key: string) => {
          if (key === "ML_CLIENT_ID") return "";
          if (key === "ML_CLIENT_SECRET") return "secret";
          return "test";
        },
      );
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe("getAuthUrl", () => {
    it("returns auth URL with userId as state", () => {
      const result = service.getAuthUrl("user-123");
      expect(result.url).toContain(
        "https://auth.mercadolibre.com.ar/authorization",
      );
      expect(result.url).toContain("client_id=test-client-id");
      expect(result.url).toContain("state=user-123");
      expect(result.configured).toBe(true);
    });
  });

  describe("getStatus", () => {
    it("returns connected=true when credential exists", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue({
        userId: "user-123",
        accessToken: "token-abc",
        mlUserId: "ml-456",
      });

      const result = await service.getStatus("user-123");

      expect(result.configured).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.mlUserId).toBe("ml-456");
    });

    it("returns connected=false when no credential", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue(null);

      const result = await service.getStatus("user-123");

      expect(result.connected).toBe(false);
      expect(result.mlUserId).toBeNull();
    });
  });

  describe("getSales", () => {
    it("returns mock sales when not configured", async () => {
      (service as any).mockConfigService.get.mockImplementation(
        (key: string) => {
          if (key === "ML_CLIENT_ID") return "";
          return "test";
        },
      );

      const result = await service.getSales("user-123");

      expect(result.source).toBe("mock");
      expect(result.sales.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
    });

    it("returns not_connected when configured but no token", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue({
        userId: "user-123",
        accessToken: null,
      });

      const result = await service.getSales("user-123");

      expect(result.source).toBe("not_connected");
      expect(result.sales).toEqual([]);
    });

    it("returns real sales with pagination from ML API", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue({
        userId: "user-123",
        accessToken: "valid-token",
        mlUserId: "ml-456",
      });
      (service as any).mockFetch
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 456 }),
        }) // users/me
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [
              {
                id: "order-1",
                total_amount: 100,
                status: "paid",
                date_created: "2026-01-01",
                order_items: [],
              },
            ],
            paging: { total: 100 },
          }),
        });

      const result = await service.getSales("user-123", {
        offset: 0,
        limit: 50,
      });

      expect(result.source).toBe("mercadolibre");
      expect(result.sales.length).toBe(1);
      expect(result.pagination?.total).toBe(100);
      expect(result.pagination?.hasMore).toBe(true);
    });
  });

  describe("publishItem", () => {
    const mockProduct = {
      id: "prod-123",
      title: "RTX 4070 Super",
      description: "Excelente estado",
      price: 600,
      condition: ProductCondition.USED,
      category: ProductCategory.GPU,
      images: ["https://img.com/1.jpg"],
      brand: "NVIDIA",
      model: "RTX 4070 Super",
      stock: 2,
      status: ProductStatus.PUBLISHED,
      sellerId: "user-123",
      hoursOfUse: 100,
      warrantyDays: 90,
      sealed: false,
      verified: true,
    };

    const mockVariations: ProductVariation[] = [];

    beforeEach(() => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue({
        userId: "user-123",
        accessToken: "valid-token",
        mlUserId: "ml-456",
      });
      (service as any).mockProductsService.findOne.mockResolvedValue(
        mockProduct,
      );
      (service as any).mockProductsService.listVariations.mockResolvedValue(
        mockVariations,
      );
    });

    it("throws if ML not configured", async () => {
      (service as any).mockConfigService.get.mockImplementation(
        (key: string) => {
          if (key === "ML_CLIENT_ID") return "";
          return "test";
        },
      );

      await expect(service.publishItem("user-123", "prod-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws if account not connected", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue(null);

      await expect(service.publishItem("user-123", "prod-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws if product not owned by user", async () => {
      (service as any).mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        sellerId: "other-user",
      });

      await expect(service.publishItem("user-123", "prod-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws if product not published/verified", async () => {
      (service as any).mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.DRAFT,
      });

      await expect(service.publishItem("user-123", "prod-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws if no stock", async () => {
      (service as any).mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        stock: 0,
      });

      await expect(service.publishItem("user-123", "prod-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws if no images", async () => {
      (service as any).mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        images: [],
      });

      await expect(service.publishItem("user-123", "prod-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws if missing required attributes", async () => {
      (service as any).mockFetch
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 456 }),
        }) // users/me
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            attributes: [
              { id: "BRAND", tags: { required: true } },
              { id: "VIDEO_CARD_MODEL", tags: { required: true } },
            ],
          }),
        }); // category attributes
      (service as any).mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        brand: undefined,
        model: undefined,
      });

      await expect(service.publishItem("user-123", "prod-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("publishes successfully with valid product", async () => {
      (service as any).mockFetch
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 456 }),
        }) // users/me
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ attributes: [] }),
        }) // category attributes
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: "MLA123456",
            permalink: "https://ml.com/item",
            status: "active",
          }),
        }); // POST /items

      const result = await service.publishItem("user-123", "prod-123");

      expect(result.id).toBe("MLA123456");
      expect(result.permalink).toBe("https://ml.com/item");
      expect(result.status).toBe("active");
      expect((service as any).mockFetch).toHaveBeenCalledTimes(3);
    });

    it("includes variations when product has them", async () => {
      const mockProductForVariations = {
        ...mockProduct,
        id: "prod-123",
      } as any;
      const variations: ProductVariation[] = [
        {
          id: "var-1",
          productId: "prod-123",
          sku: "RTX-BLACK",
          attributes: { color: "negro" },
          stock: 3,
          priceDelta: 0,
          product: mockProductForVariations,
        },
        {
          id: "var-2",
          productId: "prod-123",
          sku: "RTX-WHITE",
          attributes: { color: "blanco" },
          stock: 2,
          priceDelta: 20,
          product: mockProductForVariations,
        },
      ];
      (service as any).mockProductsService.listVariations.mockResolvedValue(
        variations,
      );

      (service as any).mockFetch
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 456 }),
        })
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            attributes: [
              {
                id: "COLOR",
                name: "Color",
                tags: { variation_attribute: true },
                values: [
                  { id: "1", name: "Negro" },
                  { id: "2", name: "Blanco" },
                ],
              },
            ],
          }),
        })
        .mockResponseOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: "MLA123456",
            permalink: "https://ml.com/item",
            status: "active",
          }),
        });

      const result = await service.publishItem("user-123", "prod-123");

      expect(result.id).toBe("MLA123456");
      const postCall = (service as any).mockFetch.mock.calls[2];
      const body = JSON.parse(postCall[1].body);
      expect(body.variations).toBeDefined();
      expect(body.variations.length).toBe(2);
      expect(body.available_quantity).toBeUndefined();
    });
  });

  describe("updateItem", () => {
    it("throws if no fields to update", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue({
        userId: "user-123",
        accessToken: "valid-token",
      });

      await expect(
        service.updateItem("user-123", "MLA123", {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("updates price and quantity", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue({
        userId: "user-123",
        accessToken: "valid-token",
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      });
      // Mock ensureFreshToken to avoid token refresh fetch
      jest
        .spyOn(service as any, "ensureFreshToken")
        .mockResolvedValue("valid-token");
      (service as any).mockFetch.mockResponseOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: "MLA123", status: "active" }),
      });

      const result = await service.updateItem("user-123", "MLA123", {
        price: 550,
        available_quantity: 5,
      });

      expect(result.id).toBe("MLA123");
      expect(result.status).toBe("active");
    });
  });

  describe("getCategoryAttributesForLocal", () => {
    it("returns required and optional attributes", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue({
        accessToken: "valid-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      jest
        .spyOn(service as any, "ensureFreshToken")
        .mockResolvedValue("valid-token");
      (service as any).mockFetch.mockResponseOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          attributes: [
            {
              id: "BRAND",
              name: "Marca",
              value_type: "string",
              tags: { required: true },
            },
            {
              id: "COLOR",
              name: "Color",
              value_type: "string",
              tags: { variation_attribute: true },
            },
          ],
        }),
      });

      const result = await service.getCategoryAttributesForLocal("gpu");

      expect(result.mlCategoryId).toBe("MLA1744");
      expect(result.required.length).toBe(1);
      expect(result.required[0].id).toBe("BRAND");
      expect(result.optional.length).toBe(1);
      expect(result.optional[0].id).toBe("COLOR");
    });
  });

  describe("subscribeTopics", () => {
    it("subscribes to topics successfully", async () => {
      (service as any).mockCredentialRepository.findOne.mockResolvedValue({
        userId: "user-123",
        accessToken: "valid-token",
      });
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      (service as any).mockFetch
        .mockResponseOnce(mockResponse) // orders_v2
        .mockResponseOnce(mockResponse); // payments

      const result = await service.subscribeTopics("user-123", [
        "orders_v2",
        "payments",
      ]);

      expect(result.subscribed).toContain("orders_v2");
      expect(result.subscribed).toContain("payments");
      expect(result.failed).toHaveLength(0);
    });
  });

  describe("verifySignature", () => {
    it("validates correct HMAC signature", () => {
      const payload = '{"test": "data"}';
      const secret = "test-secret";
      const expected = require("crypto")
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = (service as any).verifySignature(
        payload,
        expected,
        secret,
      );

      expect(result).toBe(true);
    });

    it("rejects invalid signature", () => {
      const payload = "payload";
      const secret = "secret";
      const expected = require("crypto")
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
      // Corrupt the signature
      const invalid =
        expected.slice(0, -1) + (expected.slice(-1) === "a" ? "b" : "a");

      const result = (service as any).verifySignature(payload, invalid, secret);

      expect(result).toBe(false);
    });
  });
});
