import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VerificationsService } from './verifications.service';
import { Verification, VerificationResult } from './verification.entity';
import { ProductsService } from '../products/products.service';
import { ProductCondition, ProductStatus } from '../products/product.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VerificationsService', () => {
  let service: VerificationsService;
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
        VerificationsService,
        { provide: getRepositoryToken(Verification), useValue: mockRepository },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<VerificationsService>(VerificationsService);
    productsService = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      productId: 'product-uuid',
      result: VerificationResult.PASS,
      notes: 'Producto en excelente estado',
      hoursOfUse: 500,
      physicalState: 'Buen estado',
      functionalTest: 'Todas las funciones operativas',
      cosmeticGrade: 'A',
    };

    it('should create a verification for used product', async () => {
      const mockProduct = {
        id: 'product-uuid',
        condition: ProductCondition.USED,
        status: ProductStatus.PENDING,
      };

      const savedVerification = {
        id: 'verification-uuid',
        ...createDto,
        verifiedBy: 'admin-uuid',
        createdAt: new Date(),
      };

      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockRepository.create.mockReturnValue(savedVerification);
      mockRepository.save.mockResolvedValue(savedVerification);
      mockProductsService.update.mockResolvedValue({});

      const result = await service.create(createDto, 'admin-uuid');

      expect(result).toEqual(savedVerification);
      expect(mockProductsService.update).toHaveBeenCalledWith('product-uuid', {
        status: ProductStatus.VERIFIED,
        hoursOfUse: 500,
        physicalState: 'Buen estado',
      });
    });

    it('should throw BadRequestException for new products', async () => {
      const mockProduct = {
        id: 'product-uuid',
        condition: ProductCondition.NEW,
      };

      mockProductsService.findOne.mockResolvedValue(mockProduct);

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set product status to DRAFT when verification fails', async () => {
      const failDto = { ...createDto, result: VerificationResult.FAIL };

      const mockProduct = {
        id: 'product-uuid',
        condition: ProductCondition.USED,
      };

      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockRepository.create.mockReturnValue(failDto);
      mockRepository.save.mockResolvedValue(failDto);
      mockProductsService.update.mockResolvedValue({});

      await service.create(failDto, 'admin-uuid');

      expect(mockProductsService.update).toHaveBeenCalledWith('product-uuid', {
        status: ProductStatus.DRAFT,
        hoursOfUse: 500,
        physicalState: 'Buen estado',
      });
    });
  });

  describe('findByProduct', () => {
    it('should return verifications for a product', async () => {
      const expectedVerifications = [
        { id: 'v1', result: VerificationResult.PASS, productId: 'product-uuid' },
        { id: 'v2', result: VerificationResult.FAIL, productId: 'product-uuid' },
      ];

      mockRepository.find.mockResolvedValue(expectedVerifications);

      const result = await service.findByProduct('product-uuid');

      expect(result).toEqual(expectedVerifications);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { productId: 'product-uuid' },
        relations: ['verifier'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a verification by id', async () => {
      const expectedVerification = {
        id: 'verification-uuid',
        result: VerificationResult.PASS,
        product: { id: 'product-uuid' },
        verifier: { id: 'admin-uuid' },
      };

      mockRepository.findOne.mockResolvedValue(expectedVerification);

      const result = await service.findOne('verification-uuid');

      expect(result).toEqual(expectedVerification);
    });

    it('should throw NotFoundException if verification not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
