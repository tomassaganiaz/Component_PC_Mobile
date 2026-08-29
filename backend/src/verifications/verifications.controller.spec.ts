import { Test, TestingModule } from '@nestjs/testing';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';
import { VerificationResult } from './verification.entity';

describe('VerificationsController', () => {
  let controller: VerificationsController;
  let service: VerificationsService;

  const mockVerificationsService = {
    create: jest.fn(),
    findByProduct: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationsController],
      providers: [{ provide: VerificationsService, useValue: mockVerificationsService }],
    }).compile();

    controller = module.get<VerificationsController>(VerificationsController);
    service = module.get<VerificationsService>(VerificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a verification', async () => {
      const createDto = {
        productId: 'product-uuid',
        result: VerificationResult.PASS,
        notes: 'Producto verificado',
      };

      const expectedVerification = {
        id: 'verification-uuid',
        ...createDto,
        verifiedBy: 'admin-uuid',
      };

      mockVerificationsService.create.mockResolvedValue(expectedVerification);

      const result = await controller.create(createDto, { user: { id: 'admin-uuid' } });

      expect(result).toEqual(expectedVerification);
    });
  });

  describe('findByProduct', () => {
    it('should return verifications for a product', async () => {
      const expectedVerifications = [
        { id: 'v1', result: VerificationResult.PASS },
        { id: 'v2', result: VerificationResult.FAIL },
      ];

      mockVerificationsService.findByProduct.mockResolvedValue(expectedVerifications);

      const result = await controller.findByProduct('product-uuid');

      expect(result).toEqual(expectedVerifications);
    });
  });

  describe('findOne', () => {
    it('should return a verification by id', async () => {
      const expectedVerification = {
        id: 'verification-uuid',
        result: VerificationResult.PASS,
      };

      mockVerificationsService.findOne.mockResolvedValue(expectedVerification);

      const result = await controller.findOne('verification-uuid');

      expect(result).toEqual(expectedVerification);
    });
  });
});
