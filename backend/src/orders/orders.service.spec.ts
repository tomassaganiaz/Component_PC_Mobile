import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { Order, OrderFulfillmentStage, OrderStatus } from "./order.entity";
import { ProductsService } from "../products/products.service";
import { ProductStatus } from "../products/product.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { CouponsService } from "../coupons/coupons.service";
import { CartService } from "../cart/cart.service";
import { WalletService } from "../wallets/wallet.service";
import { ShippingService } from "../shipping/shipping.service";
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
    createQueryBuilder: jest.fn(),
  };

  const mockProductsService = {
    findOne: jest.fn(),
    findVariation: jest.fn(),
    update: jest.fn(),
    decrementStock: jest.fn(),
    incrementStock: jest.fn(),
    decrementVariationStock: jest.fn(),
    incrementVariationStock: jest.fn(),
  };

  const mockNotifications = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockCouponsService = {
    validate: jest.fn(),
    redeem: jest.fn().mockResolvedValue(undefined),
  };

  const mockCartService = {
    getCart: jest.fn(),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  const mockWalletService = {
    credit: jest.fn().mockResolvedValue(undefined),
    debit: jest.fn().mockResolvedValue(undefined),
  };

  const mockShippingService = {
    createForOrder: jest.fn().mockResolvedValue({}),
    markDelivered: jest.fn().mockResolvedValue(undefined),
  };

  /** Query builder para los UPDATEs condicionales atómicos (pay/cancel/deliver). */
  const updateQb = (affected = 1) => ({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockRepository },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: CouponsService, useValue: mockCouponsService },
        { provide: CartService, useValue: mockCartService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ShippingService, useValue: mockShippingService },
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

    it("should create a PENDING order without reserving stock", async () => {
      const mockProduct = {
        id: "product-uuid",
        price: 450,
        status: "published",
        stock: 5,
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
      mockRepository.create.mockReturnValue(savedOrder);
      mockRepository.save.mockResolvedValue(savedOrder);

      const result = await service.create(createOrderDto, "buyer-uuid");

      expect(result).toEqual(savedOrder);
      // La reserva se difiere a pay(): crear no debe tocar stock ni avisar al vendedor.
      expect(mockProductsService.decrementStock).not.toHaveBeenCalled();
      expect(mockProductsService.update).not.toHaveBeenCalled();
      expect(mockNotifications.create).not.toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should reject when there is no stock available", async () => {
      mockProductsService.findOne.mockResolvedValue({
        id: "product-uuid",
        price: 450,
        status: "published",
        stock: 0,
      });

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
        relations: ["product", "items", "items.product"],
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

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(orders),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findBySeller("seller-1");

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("order");
      expect(qb.where).toHaveBeenCalled();
      expect(result[0].buyer).toEqual({
        id: "buyer-1",
        name: "Buyer One",
        email: "buyer@test.com",
      });
      expect(
        (result[0].buyer as Record<string, unknown>).password,
      ).toBeUndefined();
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
    it("should update the shipping address", async () => {
      const existingOrder = {
        id: "order-uuid",
        status: OrderStatus.PENDING,
        shippingAddress: "vieja",
      };

      const updateDto = { shippingAddress: "nueva" };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.save.mockResolvedValue({ ...existingOrder, ...updateDto });

      const result = await service.update("order-uuid", updateDto);

      expect(result.shippingAddress).toEqual("nueva");
    });

    it("should reject direct status changes (use pay/ship/deliver/cancel)", async () => {
      await expect(
        service.update("order-uuid", { status: OrderStatus.PAID }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if order not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update("nonexistent-id", {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("cancel", () => {
    it("should cancel a pending order WITHOUT restoring stock (nothing reserved yet)", async () => {
      const existingOrder = {
        id: "order-uuid",
        status: OrderStatus.PENDING,
        productId: "product-uuid",
        buyerId: "buyer-uuid",
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.createQueryBuilder.mockReturnValue(updateQb());
      mockRepository.save.mockResolvedValue({
        ...existingOrder,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancel("order-uuid", "buyer-uuid");

      expect(result.status).toEqual(OrderStatus.CANCELLED);
      expect(mockProductsService.incrementStock).not.toHaveBeenCalled();
      expect(mockProductsService.update).not.toHaveBeenCalled();
      expect(mockWalletService.credit).not.toHaveBeenCalled();
    });

    it("should cancel a paid order and restore stock", async () => {
      const existingOrder = {
        id: "order-uuid",
        status: OrderStatus.PAID,
        productId: "product-uuid",
        buyerId: "buyer-uuid",
        items: [{ productId: "product-uuid", variationId: null, quantity: 1 }],
        product: { id: "product-uuid", sellerId: "seller-uuid" },
      };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.createQueryBuilder.mockReturnValue(updateQb());
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
      // Cancelar una orden PAGADA debe reembolsar al comprador.
      expect(mockWalletService.credit).toHaveBeenCalledWith(
        "buyer-uuid",
        expect.any(Number),
        expect.stringContaining("Reembolso"),
        "order-uuid",
      );
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

      await expect(
        service.cancel("nonexistent-id", "buyer-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("pay / ship / deliver", () => {
    const baseOrder = {
      id: "order-uuid",
      buyerId: "buyer-uuid",
      product: { id: "product-uuid", sellerId: "seller-uuid" },
    };

    it("pay: buyer confirms payment and reserves stock atomically", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        items: [{ productId: "product-uuid", variationId: null, quantity: 1 }],
      });
      mockRepository.createQueryBuilder.mockReturnValue(updateQb());
      mockProductsService.decrementStock.mockResolvedValue(4);
      mockRepository.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.pay("order-uuid", "buyer-uuid");

      expect(result.status).toEqual(OrderStatus.PAID);
      expect(result.fulfillmentStage).toEqual(
        OrderFulfillmentStage.CENTER_RECEPTION,
      );
      expect(result.custodyStartDate).toBeInstanceOf(Date);
      expect(mockProductsService.decrementStock).toHaveBeenCalledWith(
        "product-uuid",
      );
      // El vendedor se notifica recién en el pago, no al crear la PENDING.
      expect(mockNotifications.create).toHaveBeenCalled();
    });

    it("pay: rejects an expired pending order", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PENDING,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        items: [],
      });
      mockRepository.save.mockImplementation((o) => Promise.resolve(o));

      await expect(service.pay("order-uuid", "buyer-uuid")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockProductsService.decrementStock).not.toHaveBeenCalled();
    });

    it("admin advances each technical-center stage in order", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PAID,
        fulfillmentStage: OrderFulfillmentStage.CENTER_RECEPTION,
      });
      mockRepository.save.mockImplementation((order) => Promise.resolve(order));

      const inspection = await service.advanceFulfillmentStage("order-uuid");

      expect(inspection.fulfillmentStage).toBe(
        OrderFulfillmentStage.TECHNICAL_INSPECTION,
      );
      expect(inspection.status).toBe(OrderStatus.IN_CUSTODY);
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
        fulfillmentStage: OrderFulfillmentStage.DISPATCH,
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
      mockRepository.createQueryBuilder.mockReturnValue(updateQb());
      mockRepository.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.deliver("order-uuid", "buyer-uuid");

      expect(result.status).toEqual(OrderStatus.DELIVERED);
      expect(result.custodyEndDate).toBeInstanceOf(Date);
    });

    it("deliver: rejects an order that was not shipped", async () => {
      mockRepository.findOne.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PENDING,
      });

      await expect(service.deliver("order-uuid", "buyer-uuid")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockWalletService.credit).not.toHaveBeenCalled();
    });
  });

  describe("requestReturn", () => {
    const returnedOrder = (status: OrderStatus) => ({
      id: "order-uuid",
      buyerId: "buyer-uuid",
      status,
      custodyStartDate: new Date(),
      total: 100,
      discount: 0,
      repairFee: 0,
      productId: "product-uuid",
      items: [
        {
          productId: "product-uuid",
          variationId: null,
          quantity: 1,
          unitPrice: 100,
          product: { sellerId: "seller-uuid" },
        },
      ],
      product: { id: "product-uuid", sellerId: "seller-uuid" },
    });

    it("reembolsa al comprador SIN debitar vendedores si aún no fue entregada", async () => {
      mockRepository.findOne.mockResolvedValue(returnedOrder(OrderStatus.PAID));
      mockRepository.createQueryBuilder.mockReturnValue(updateQb());
      mockProductsService.findOne.mockResolvedValue({
        id: "product-uuid",
        status: ProductStatus.PUBLISHED,
      });
      mockProductsService.incrementStock.mockResolvedValue(undefined);
      mockProductsService.update.mockResolvedValue({});

      const result = await service.requestReturn(
        "order-uuid",
        "buyer-uuid",
        "Producto con fallas",
      );

      expect(result.status).toEqual(OrderStatus.REFUNDED);
      // Los vendedores nunca recibieron esta venta: no se les debe debitar.
      expect(mockWalletService.debit).not.toHaveBeenCalled();
      expect(mockWalletService.credit).toHaveBeenCalledWith(
        "buyer-uuid",
        100,
        expect.stringContaining("Reembolso"),
        "order-uuid",
      );
    });

    it("debita a los vendedores cuando la orden SÍ fue entregada", async () => {
      mockRepository.findOne.mockResolvedValue(
        returnedOrder(OrderStatus.DELIVERED),
      );
      mockRepository.createQueryBuilder.mockReturnValue(updateQb());
      mockProductsService.findOne.mockResolvedValue({
        id: "product-uuid",
        status: ProductStatus.PUBLISHED,
      });
      mockProductsService.incrementStock.mockResolvedValue(undefined);
      mockProductsService.update.mockResolvedValue({});

      const result = await service.requestReturn(
        "order-uuid",
        "buyer-uuid",
        "Producto con fallas",
      );

      expect(result.status).toEqual(OrderStatus.REFUNDED);
      expect(mockWalletService.debit).toHaveBeenCalledWith(
        "seller-uuid",
        100,
        expect.stringContaining("Reembolso"),
        "order-uuid",
        { clampToZero: true },
      );
      expect(mockWalletService.credit).toHaveBeenCalledWith(
        "buyer-uuid",
        100,
        expect.stringContaining("Reembolso"),
        "order-uuid",
      );
    });
  });

  describe("expirePendingOrders / getProtection", () => {
    it("expirePendingOrders: cancels expired PENDING without touching stock", async () => {
      const expired = {
        id: "order-uuid",
        status: OrderStatus.PENDING,
        buyerId: "buyer-uuid",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      };
      mockRepository.find.mockResolvedValue([expired]);
      mockRepository.save.mockImplementation((o) => Promise.resolve(o));

      const count = await service.expirePendingOrders();

      expect(count).toEqual(1);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
      );
      expect(mockProductsService.incrementStock).not.toHaveBeenCalled();
    });

    it("getProtection: pending order has no protection window", async () => {
      mockRepository.findOne.mockResolvedValue({
        id: "order-uuid",
        status: OrderStatus.PENDING,
        total: 100,
        createdAt: new Date(),
        custodyStartDate: null,
      });

      const protection = await service.getProtection("order-uuid");

      expect(protection.pendingPayment).toEqual(true);
      expect(protection.returnWindowOpen).toEqual(false);
      expect(protection.coverageActive).toEqual(false);
    });

    it("getProtection: paid order counts windows from custodyStartDate", async () => {
      const paidAt = new Date();
      mockRepository.findOne.mockResolvedValue({
        id: "order-uuid",
        status: OrderStatus.PAID,
        total: 100,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        custodyStartDate: paidAt,
      });

      const protection = await service.getProtection("order-uuid");

      expect(protection.pendingPayment).toEqual(false);
      expect(protection.returnWindowOpen).toEqual(true);
    });
  });
});
