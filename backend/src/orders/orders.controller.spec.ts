import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderStatus } from "./order.entity";

describe("OrdersController", () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findByBuyer: jest.fn(),
    findBySeller: jest.fn(),
    findOne: jest.fn(),
    getProtection: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create an order", async () => {
      const createDto = {
        productId: "product-uuid",
        shippingAddress: "Av. Corrientes 1234",
      };

      const expectedOrder = {
        id: "order-uuid",
        ...createDto,
        buyerId: "buyer-uuid",
        total: 450,
        status: OrderStatus.PENDING,
      };

      mockOrdersService.create.mockResolvedValue(expectedOrder);

      const result = await controller.create(createDto, {
        user: { id: "buyer-uuid" },
      } as any);

      expect(result).toEqual(expectedOrder);
    });
  });

  describe("findMyOrders", () => {
    it("should return buyer orders", async () => {
      const expectedOrders = [
        { id: "order-1", total: 100 },
        { id: "order-2", total: 200 },
      ];

      mockOrdersService.findByBuyer.mockResolvedValue(expectedOrders);

      const result = await controller.findMyOrders({
        user: { id: "buyer-uuid" },
      } as any);

      expect(result).toEqual(expectedOrders);
    });
  });

  describe("findOne", () => {
    it("should return an order by id for its buyer", async () => {
      const expectedOrder = {
        id: "order-uuid",
        total: 450,
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      };

      mockOrdersService.findOne.mockResolvedValue(expectedOrder);

      const result = await controller.findOne("order-uuid", {
        user: { id: "buyer-uuid", role: "buyer" },
      } as any);

      expect(result).toEqual(expectedOrder);
    });

    it("should allow the seller of the product", async () => {
      const expectedOrder = {
        id: "order-uuid",
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      };
      mockOrdersService.findOne.mockResolvedValue(expectedOrder);

      const result = await controller.findOne("order-uuid", {
        user: { id: "seller-uuid", role: "seller" },
      } as any);

      expect(result).toEqual(expectedOrder);
    });

    it("should forbid an unrelated user", async () => {
      mockOrdersService.findOne.mockResolvedValue({
        id: "order-uuid",
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      });

      await expect(
        controller.findOne("order-uuid", {
          user: { id: "stranger", role: "buyer" },
        } as any),
      ).rejects.toThrow();
    });
  });

  describe("getProtection", () => {
    it("should return protection for the buyer", async () => {
      const protection = { orderId: "order-uuid", coverageDaysLeft: 45 };
      mockOrdersService.findOne.mockResolvedValue({
        id: "order-uuid",
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      });
      mockOrdersService.getProtection.mockResolvedValue(protection);

      const result = await controller.getProtection("order-uuid", {
        user: { id: "buyer-uuid", role: "buyer" },
      } as any);

      expect(result).toEqual(protection);
    });

    it("should forbid an unrelated user", async () => {
      mockOrdersService.findOne.mockResolvedValue({
        id: "order-uuid",
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      });

      await expect(
        controller.getProtection("order-uuid", {
          user: { id: "stranger", role: "buyer" },
        } as any),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update an order", async () => {
      const updateDto = { status: OrderStatus.PAID };
      const expectedOrder = {
        id: "order-uuid",
        status: OrderStatus.PAID,
      };

      mockOrdersService.update.mockResolvedValue(expectedOrder);

      const result = await controller.update("order-uuid", updateDto);

      expect(result).toEqual(expectedOrder);
    });
  });

  describe("cancel", () => {
    it("should cancel an order", async () => {
      const expectedOrder = {
        id: "order-uuid",
        status: OrderStatus.CANCELLED,
      };

      mockOrdersService.cancel.mockResolvedValue(expectedOrder);

      const result = await controller.cancel("order-uuid", {
        user: { id: "buyer-uuid" },
      } as any);

      expect(result).toEqual(expectedOrder);
      expect(mockOrdersService.cancel).toHaveBeenCalledWith(
        "order-uuid",
        "buyer-uuid",
      );
    });
  });
});
