import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product, ProductCondition, ProductCategory, ProductStatus } from './product.entity';
import { Review } from '../reviews/review.entity';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockReviewRepository = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockRepository },
        { provide: getRepositoryToken(Review), useValue: mockReviewRepository },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createProductDto = {
      title: 'RTX 3080 Ti',
      description: 'Tarjeta gráfica en excelente estado',
      price: 450.0,
      condition: ProductCondition.USED,
      category: ProductCategory.GPU,
    };

    it('should create a product successfully', async () => {
      const savedProduct = {
        id: 'uuid-123',
        ...createProductDto,
        sellerId: 'seller-uuid',
        status: ProductStatus.DRAFT,
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(savedProduct);
      mockRepository.save.mockResolvedValue(savedProduct);

      const result = await service.create(createProductDto, 'seller-uuid');

      expect(result).toEqual(savedProduct);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createProductDto,
        sellerId: 'seller-uuid',
      });
    });
  });

  describe('findAll', () => {
    it('should return products with filters', async () => {
      const fixture = (o: Record<string, unknown>) => ({
        id: 'uuid-1',
        title: 'Product 1',
        price: 100,
        status: ProductStatus.PUBLISHED,
        sellerId: 'seller-1',
        seller: { acceptsTesting: true },
        createdAt: new Date('2026-01-01'),
        warrantyDays: 90,
        coverageExtended: false,
        condition: ProductCondition.USED,
        category: ProductCategory.GPU,
        ...o,
      });
      const expectedProducts = [fixture({ id: 'uuid-1' }), fixture({ id: 'uuid-2', title: 'Product 2', price: 200 })];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(expectedProducts),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll();

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it('should apply category filter', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll({ category: ProductCategory.GPU });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.category = :category',
        { category: ProductCategory.GPU },
      );
    });

    it('should apply price range filter', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll({ minPrice: 100, maxPrice: 500 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 100 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 500 },
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const fullProduct = {
        id: 'uuid-123',
        title: 'RTX 3080 Ti',
        price: 500,
        status: ProductStatus.PUBLISHED,
        sellerId: 'seller-uuid',
        seller: { id: 'seller-uuid', name: 'Seller', acceptsTesting: true },
        verifications: [],
        createdAt: new Date('2026-01-01'),
        warrantyDays: 90,
        coverageExtended: false,
        condition: ProductCondition.USED,
        category: ProductCategory.GPU,
      };

      mockRepository.findOne.mockResolvedValue(fullProduct);

      const result = await service.findOne('uuid-123');

      expect(result.id).toEqual('uuid-123');
      expect(result.securityTier).toBeDefined();
      expect(result.sellerStats).toBeDefined();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        relations: ['seller', 'verifications'],
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySeller', () => {
    it('should return products by seller', async () => {
      const expectedProducts = [
        { id: 'uuid-1', title: 'Product 1', sellerId: 'seller-uuid' },
        { id: 'uuid-2', title: 'Product 2', sellerId: 'seller-uuid' },
      ];

      mockRepository.find.mockResolvedValue(expectedProducts);

      const result = await service.findBySeller('seller-uuid');

      expect(result).toEqual(expectedProducts);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { sellerId: 'seller-uuid' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const existingProduct = {
        id: 'uuid-123',
        title: 'Old Title',
        price: 100,
        status: ProductStatus.PUBLISHED,
        sellerId: 'seller-uuid',
        seller: { acceptsTesting: true },
        createdAt: new Date('2026-01-01'),
        warrantyDays: 90,
        coverageExtended: false,
        condition: ProductCondition.USED,
        category: ProductCategory.GPU,
      };

      const updateDto = { title: 'New Title', price: 200 };

      mockRepository.findOne.mockResolvedValue(existingProduct);
      mockRepository.save.mockResolvedValue({ ...existingProduct, ...updateDto });

      const result = await service.update('uuid-123', updateDto);

      expect(result.title).toEqual('New Title');
      expect(result.price).toEqual(200);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      const existingProduct = {
        id: 'uuid-123',
        title: 'Product',
        status: ProductStatus.PUBLISHED,
        sellerId: 'seller-uuid',
        seller: { acceptsTesting: true },
        createdAt: new Date('2026-01-01'),
        warrantyDays: 90,
        coverageExtended: false,
      };

      mockRepository.findOne.mockResolvedValue(existingProduct);
      mockRepository.softRemove.mockResolvedValue(existingProduct);

      await service.remove('uuid-123');

      expect(mockRepository.softRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'uuid-123', title: 'Product' }),
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
