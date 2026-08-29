import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.entity';
import { ProductsService } from '../products/products.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
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

  describe('create', () => {
    const createOrderDto = {
      productId: 'product-uuid',
      shippingAddress: 'Av. Corrientes 1234',
      paymentMethod: 'credit_card',
    };

    it('should create an order successfully', async () => {
      const mockProduct = {
        id: 'product-uuid',
        price: 450,
        status: 'published',
        sellerId: 'seller-uuid',
      };

      const savedOrder = {
        id: 'order-uuid',
        ...createOrderDto,
        buyerId: 'buyer-uuid',
        total: 450,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      };

      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockRepository.create.mockReturnValue(savedOrder);
      mockRepository.save.mockResolvedValue(savedOrder);
      mockProductsService.update.mockResolvedValue({});

      const result = await service.create(createOrderDto, 'buyer-uuid');

      expect(result).toEqual(savedOrder);
      expect(mockProductsService.update).toHaveBeenCalledWith('product-uuid', { status: 'sold' });
    });

    it('should throw BadRequestException if product is already sold', async () => {
      const mockProduct = {
        id: 'product-uuid',
        price: 450,
        status: 'sold',
      };

      mockProductsService.findOne.mockResolvedValue(mockProduct);

      await expect(service.create(createOrderDto, 'buyer-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByBuyer', () => {
    it('should return orders by buyer', async () => {
      const expectedOrders = [
        { id: 'order-1', buyerId: 'buyer-uuid', total: 100 },
        { id: 'order-2', buyerId: 'buyer-uuid', total: 200 },
      ];

      mockRepository.find.mockResolvedValue(expectedOrders);

      const result = await service.findByBuyer('buyer-uuid');

      expect(result).toEqual(expectedOrders);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { buyerId: 'buyer-uuid' },
        relations: ['product'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const expectedOrder = {
        id: 'order-uuid',
        buyer: { id: 'buyer-uuid' },
        product: { id: 'product-uuid' },
      };

      mockRepository.findOne.mockResolvedValue(expectedOrder);

      const result = await service.findOne('order-uuid');

      expect(result).toEqual(expectedOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an order', async () => {
      const existingOrder = {
        id: 'order-uuid',
        status: OrderStatus.PENDING,
      };

      const updateDto = { status: OrderStatus.PAID };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.save.mockResolvedValue({ ...existingOrder, ...updateDto });

      const result = await service.update('order-uuid', updateDto);

      expect(result.status).toEqual(OrderStatus.PAID);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending order', async () => {
      const existingOrder = {
        id: 'order-uuid',
        status: OrderStatus.PENDING,
        productId: 'product-uuid',
      };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.save.mockResolvedValue({ ...existingOrder, status: OrderStatus.CANCELLED });
      mockProductsService.update.mockResolvedValue({});

      const result = await service.cancel('order-uuid');

      expect(result.status).toEqual(OrderStatus.CANCELLED);
      expect(mockProductsService.update).toHaveBeenCalledWith('product-uuid', {
        status: 'published',
      });
    });

    it('should throw BadRequestException if order is not pending', async () => {
      const existingOrder = {
        id: 'order-uuid',
        status: OrderStatus.PAID,
      };

      mockRepository.findOne.mockResolvedValue(existingOrder);

      await expect(service.cancel('order-uuid')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.cancel('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
