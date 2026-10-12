import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { Order, OrderStatus } from "./order.entity";
import { ProductsService } from "../products/products.service";
import { ProductStatus } from "../products/product.entity";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";

describe("OrdersService", () => {
  let service: OrdersService;
  let productsService: ProductsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockProductsService = {
    findOne: jest.fn(),
    update: jest.fn(),
    decrementStock: jest.fn(),
    incrementStock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockRepository },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    productsService = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createOrderDto = {
      productId: "product-uuid",
      shippingAddress: "Av. Corrientes 1234",
      paymentMethod: "credit_card",
    };

    it("should create an order successfully", async () => {
      const mockProduct = {
        id: "product-uuid",
        price: 450,
        status: "published",
        sellerId: "seller-uuid",
      };

      const savedOrder = {
        id: "order-uuid",
        ...createOrderDto,
        buyerId: "buyer-uuid",
        total: 450,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      };

      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockProductsService.decrementStock.mockResolvedValue(0);
      mockRepository.create.mockReturnValue(savedOrder);
      mockRepository.save.mockResolvedValue(savedOrder);
      mockProductsService.update.mockResolvedValue({});

      const result = await service.create(createOrderDto, "buyer-uuid");

      expect(result).toEqual(savedOrder);
      expect(mockProductsService.decrementStock).toHaveBeenCalledWith(
        "product-uuid",
      );
      expect(mockProductsService.update).toHaveBeenCalledWith("product-uuid", {
        status: "sold",
      });
    });

    it("should reject when there is no stock (atomic reserve)", async () => {
      mockProductsService.findOne.mockResolvedValue({
        id: "product-uuid",
        price: 450,
        status: "published",
      });
      mockProductsService.decrementStock.mockResolvedValue(null);

      await expect(
        service.create(createOrderDto, "buyer-uuid"),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if product is already sold", async () => {
      const mockProduct = {
        id: "product-uuid",
        price: 450,
        status: "sold",
      };

      mockProductsService.findOne.mockResolvedValue(mockProduct);

      await expect(
        service.create(createOrderDto, "buyer-uuid"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findByBuyer", () => {
    it("should return orders by buyer", async () => {
      const expectedOrders = [
        { id: "order-1", buyerId: "buyer-uuid", total: 100 },
        { id: "order-2", buyerId: "buyer-uuid", total: 200 },
      ];

      mockRepository.find.mockResolvedValue(expectedOrders);

      const result = await service.findByBuyer("buyer-uuid");

      expect(result).toEqual(expectedOrders);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { buyerId: "buyer-uuid" },
        relations: ["product"],
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("findBySeller", () => {
    it("should return sales with sanitized buyer data", async () => {
      const orders = [
        {
          id: "order-1",
          total: 100,
          status: OrderStatus.DELIVERED,
          shippingAddress: "Av. Corrientes 1234",
          productId: "product-1",
          createdAt: new Date("2026-01-01"),
          product: { id: "product-1", title: "GPU", sellerId: "seller-1" },
          buyer: {
            id: "buyer-1",
            name: "Buyer One",
            email: "buyer@test.com",
            password: "hashed-secret",
          },
        },
      ];

      mockRepository.find.mockResolvedValue(orders);

      const result = await service.findBySeller("seller-1");

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { product: { sellerId: "seller-1" } },
        relations: ["product", "buyer"],
        order: { createdAt: "DESC" },
      });
      expect(result[0].buyer).toEqual({
        id: "buyer-1",
        name: "Buyer One",
        email: "buyer@test.com",
      });
      expect((result[0].buyer as Record<string, unknown>).password).toBeUndefined();
    });
  });

  describe("findOne", () => {
    it("should return an order by id", async () => {
      const expectedOrder = {
        id: "order-uuid",
        buyer: { id: "buyer-uuid" },
        product: { id: "product-uuid" },
      };

      mockRepository.findOne.mockResolvedValue(expectedOrder);

      const result = await service.findOne("order-uuid");

      expect(result).toEqual(expectedOrder);
    });

    it("should throw NotFoundException if order not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update an order", async () => {
      const existingOrder = {
        id: "order-uuid",
        status: OrderStatus.PENDING,
      };

      const updateDto = { status: OrderStatus.PAID };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.save.mockResolvedValue({ ...existingOrder, ...updateDto });

      const result = await service.update("order-uuid", updateDto);

      expect(result.status).toEqual(OrderStatus.PAID);
    });

    it("should throw NotFoundException if order not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update("nonexistent-id", {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("cancel", () => {
    it("should cancel a pending order and restore stock", async () => {
      const existingOrder = {
        id: "order-uuid",
        status: OrderStatus.PENDING,
        productId: "product-uuid",
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.save.mockResolvedValue({
        ...existingOrder,
        status: OrderStatus.CANCELLED,
      });
      mockProductsService.findOne.mockResolvedValue({
        id: "product-uuid",
        stock: 0,
        status: ProductStatus.SOLD,
      });
      mockProductsService.incrementStock.mockResolvedValue(undefined);
      mockProductsService.update.mockResolvedValue({});

      const result = await service.cancel("order-uuid", "buyer-uuid");

      expect(result.status).toEqual(OrderStatus.CANCELLED);
      expect(mockProductsService.incrementStock).toHaveBeenCalledWith(
        "product-uuid",
      );
      expect(mockProductsService.update).toHaveBeenCalledWith("product-uuid", {
        status: ProductStatus.PUBLISHED,
      });
    });

    it("should forbid cancelling someone else's order", async () => {
      mockRepository.findOne.mockResolvedValue({
        id: "order-uuid",
        status: OrderStatus.PENDING,
        productId: "product-uuid",
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      });

      await expect(service.cancel("order-uuid", "stranger")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw BadRequestException if order is not cancellable", async () => {
      mockRepository.findOne.mockResolvedValue({
        id: "order-uuid",
        status: OrderStatus.SHIPPED,
        productId: "product-uuid",
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      });

      await expect(service.cancel("order-uuid", "buyer-uuid")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException if order not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.cancel("nonexistent-id", "buyer-uuid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("pay / ship / deliver", () => {
    const baseOrder = {
      id: "order-uuid",
      buyerId: "buyer-uuid",
      product: { id: "product-uuid", sellerId: "seller-uuid" },
    };

    it("pay: buyer confirms payment", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PENDING,
      });
      mockRepository.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.pay("order-uuid", "buyer-uuid");

      expect(result.status).toEqual(OrderStatus.PAID);
      expect(result.custodyStartDate).toBeInstanceOf(Date);
    });

    it("pay: rejects a non-owner", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PENDING,
      });

      await expect(service.pay("order-uuid", "stranger")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("ship: seller marks the order as shipped", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PAID,
      });
      mockRepository.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.ship("order-uuid", "seller-uuid");

      expect(result.status).toEqual(OrderStatus.SHIPPED);
    });

    it("ship: rejects a non-seller", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PAID,
      });

      await expect(service.ship("order-uuid", "stranger")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("deliver: buyer confirms reception", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.SHIPPED,
      });
      mockRepository.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.deliver("order-uuid", "buyer-uuid");

      expect(result.status).toEqual(OrderStatus.DELIVERED);
      expect(result.custodyEndDate).toBeInstanceOf(Date);
    });
  });
});
