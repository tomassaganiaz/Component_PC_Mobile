import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product, ProductCondition, ProductCategory, ProductStatus } from './product.entity';
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockRepository },
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
      const expectedProducts = [
        { id: 'uuid-1', title: 'Product 1', price: 100 },
        { id: 'uuid-2', title: 'Product 2', price: 200 },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(expectedProducts),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll();

      expect(result).toEqual(expectedProducts);
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
      const expectedProduct = {
        id: 'uuid-123',
        title: 'RTX 3080 Ti',
        seller: { id: 'seller-uuid', name: 'Seller' },
        verifications: [],
      };

      mockRepository.findOne.mockResolvedValue(expectedProduct);

      const result = await service.findOne('uuid-123');

      expect(result).toEqual(expectedProduct);
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
      const existingProduct = { id: 'uuid-123', title: 'Product' };

      mockRepository.findOne.mockResolvedValue(existingProduct);
      mockRepository.softRemove.mockResolvedValue(existingProduct);

      await service.remove('uuid-123');

      expect(mockRepository.softRemove).toHaveBeenCalledWith(existingProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
