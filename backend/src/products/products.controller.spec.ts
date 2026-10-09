import { Test, TestingModule } from "@nestjs/testing";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import {
  ProductCondition,
  ProductCategory,
  ProductStatus,
} from "./product.entity";

describe("ProductsController", () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySeller: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a product", async () => {
      const createDto = {
        title: "RTX 3080 Ti",
        description: "GPU en excelente estado",
        price: 450,
        condition: ProductCondition.USED,
        category: ProductCategory.GPU,
      };

      const expectedProduct = {
        id: "uuid-123",
        ...createDto,
        sellerId: "seller-uuid",
        status: ProductStatus.DRAFT,
      };

      mockProductsService.create.mockResolvedValue(expectedProduct);

      const result = await controller.create(createDto, {
        user: { id: "seller-uuid" },
      } as any);

      expect(result).toEqual(expectedProduct);
      expect(mockProductsService.create).toHaveBeenCalledWith(
        createDto,
        "seller-uuid",
      );
    });
  });

  describe("findAll", () => {
    it("should return products with filters", async () => {
      const expectedProducts = [
        { id: "uuid-1", title: "Product 1" },
        { id: "uuid-2", title: "Product 2" },
      ];

      mockProductsService.findAll.mockResolvedValue(expectedProducts);

      const result = await controller.findAll({});

      expect(result).toEqual(expectedProducts);
    });
  });

  describe("findOne", () => {
    it("should return a product by id", async () => {
      const expectedProduct = {
        id: "uuid-123",
        title: "RTX 3080 Ti",
      };

      mockProductsService.findOne.mockResolvedValue(expectedProduct);

      const result = await controller.findOne("uuid-123");

      expect(result).toEqual(expectedProduct);
    });
  });

  describe("findBySeller", () => {
    it("should return products by seller", async () => {
      const expectedProducts = [
        { id: "uuid-1", title: "Product 1", sellerId: "seller-uuid" },
      ];

      mockProductsService.findBySeller.mockResolvedValue(expectedProducts);

      const result = await controller.findBySeller("seller-uuid");

      expect(result).toEqual(expectedProducts);
    });
  });

  describe("update", () => {
    it("should update a product", async () => {
      const updateDto = { title: "Updated Title" };
      const expectedProduct = {
        id: "uuid-123",
        title: "Updated Title",
      };

      mockProductsService.findOne.mockResolvedValue({ id: "uuid-123", sellerId: "seller-1" });
      mockProductsService.update.mockResolvedValue(expectedProduct);

      const req = { user: { id: "seller-1", role: "seller" } } as any;
      const result = await controller.update("uuid-123", updateDto, req);

      expect(result).toEqual(expectedProduct);
    });

    it("should forbid updating another seller's product", async () => {
      mockProductsService.findOne.mockResolvedValue({ id: "uuid-123", sellerId: "owner-x" });
      const req = { user: { id: "seller-1", role: "seller" } } as any;

      await expect(controller.update("uuid-123", { title: "hack" }, req)).rejects.toThrow();
      expect(mockProductsService.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should remove a product", async () => {
      mockProductsService.findOne.mockResolvedValue({ id: "uuid-123", sellerId: "seller-1" });
      mockProductsService.remove.mockResolvedValue(undefined);

      const req = { user: { id: "seller-1", role: "seller" } } as any;
      await controller.remove("uuid-123", req);

      expect(mockProductsService.remove).toHaveBeenCalledWith("uuid-123");
    });
  });
});
