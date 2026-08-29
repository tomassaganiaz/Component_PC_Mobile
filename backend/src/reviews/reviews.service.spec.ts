import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { Review, ReviewType, ReviewStatus, TrustBadge } from './review.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/order.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let ordersService: OrdersService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOrdersService = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: mockRepository },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      productId: 'product-uuid',
      orderId: 'order-uuid',
      rating: 5,
      type: ReviewType.POSITIVE,
      comment: 'Excelente producto',
      sellerRating: 5,
      productRating: 5,
    };

    it('should create a review for delivered order', async () => {
      const mockOrder = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        productId: 'product-uuid',
        status: OrderStatus.DELIVERED,
        product: { sellerId: 'seller-uuid' },
      };

      const savedReview = {
        id: 'review-uuid',
        ...createDto,
        buyerId: 'buyer-uuid',
        sellerId: 'seller-uuid',
        isVerifiedPurchase: true,
        status: ReviewStatus.APPROVED,
      };

      mockOrdersService.findOne.mockResolvedValue(mockOrder);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedReview);
      mockRepository.save.mockResolvedValue(savedReview);

      const result = await service.create(createDto, 'buyer-uuid');

      expect(result).toEqual(savedReview);
    });

    it('should throw BadRequestException if order not delivered', async () => {
      const mockOrder = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        productId: 'product-uuid',
        status: OrderStatus.PENDING,
      };

      mockOrdersService.findOne.mockResolvedValue(mockOrder);

      await expect(service.create(createDto, 'buyer-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if buyer is not order owner', async () => {
      const mockOrder = {
        id: 'order-uuid',
        buyerId: 'other-buyer-uuid',
        productId: 'product-uuid',
        status: OrderStatus.DELIVERED,
      };

      mockOrdersService.findOne.mockResolvedValue(mockOrder);

      await expect(service.create(createDto, 'buyer-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if review already exists', async () => {
      const mockOrder = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        productId: 'product-uuid',
        status: OrderStatus.DELIVERED,
        product: { sellerId: 'seller-uuid' },
      };

      mockOrdersService.findOne.mockResolvedValue(mockOrder);
      mockRepository.findOne.mockResolvedValue({ id: 'existing-review' });

      await expect(service.create(createDto, 'buyer-uuid')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should set status to PENDING for complaints', async () => {
      const complaintDto = {
        ...createDto,
        type: ReviewType.COMPLAINT,
        complaintReason: 'El producto no funciona correctamente según lo descrito',
      };

      const mockOrder = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        productId: 'product-uuid',
        status: OrderStatus.DELIVERED,
        product: { sellerId: 'seller-uuid' },
      };

      mockOrdersService.findOne.mockResolvedValue(mockOrder);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.create(complaintDto, 'buyer-uuid');

      expect(result.status).toEqual(ReviewStatus.PENDING);
    });

    it('should throw BadRequestException if complaint has no reason', async () => {
      const complaintDto = {
        ...createDto,
        type: ReviewType.COMPLAINT,
        complaintReason: undefined,
      };

      const mockOrder = {
        id: 'order-uuid',
        buyerId: 'buyer-uuid',
        productId: 'product-uuid',
        status: OrderStatus.DELIVERED,
        product: { sellerId: 'seller-uuid' },
      };

      mockOrdersService.findOne.mockResolvedValue(mockOrder);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.create(complaintDto, 'buyer-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated reviews', async () => {
      const expectedReviews = [
        { id: 'review-1', rating: 5 },
        { id: 'review-2', rating: 4 },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([expectedReviews, 2]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll();

      expect(result).toEqual({ data: expectedReviews, total: 2 });
    });
  });

  describe('findBySeller', () => {
    it('should return reviews for a seller', async () => {
      const expectedReviews = [
        { id: 'review-1', sellerId: 'seller-uuid', status: ReviewStatus.APPROVED },
      ];

      mockRepository.find.mockResolvedValue(expectedReviews);

      const result = await service.findBySeller('seller-uuid');

      expect(result).toEqual(expectedReviews);
    });
  });

  describe('findByProduct', () => {
    it('should return reviews for a product', async () => {
      const expectedReviews = [
        { id: 'review-1', productId: 'product-uuid', status: ReviewStatus.APPROVED },
      ];

      mockRepository.find.mockResolvedValue(expectedReviews);

      const result = await service.findByProduct('product-uuid');

      expect(result).toEqual(expectedReviews);
    });
  });

  describe('findOne', () => {
    it('should return a review by id', async () => {
      const expectedReview = {
        id: 'review-uuid',
        rating: 5,
        buyer: { id: 'buyer-uuid' },
        seller: { id: 'seller-uuid' },
        product: { id: 'product-uuid' },
      };

      mockRepository.findOne.mockResolvedValue(expectedReview);

      const result = await service.findOne('review-uuid');

      expect(result).toEqual(expectedReview);
    });

    it('should throw NotFoundException if review not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update review status', async () => {
      const existingReview = {
        id: 'review-uuid',
        status: ReviewStatus.PENDING,
      };

      const updateDto = {
        status: 'resolved',
        resolutionNotes: 'Queja resuelta satisfactoriamente',
      };

      mockRepository.findOne.mockResolvedValue(existingReview);
      mockRepository.save.mockResolvedValue({ ...existingReview, ...updateDto });

      const result = await service.updateStatus('review-uuid', updateDto, 'admin-uuid');

      expect(result.status).toEqual('resolved');
      expect(result.resolutionNotes).toEqual('Queja resuelta satisfactoriamente');
    });
  });

  describe('getTrustBadge', () => {
    it('should return INTERMEDIATE badge for less than 3 reviews', async () => {
      mockRepository.find.mockResolvedValue([
        { rating: 5, type: ReviewType.POSITIVE },
        { rating: 4, type: ReviewType.POSITIVE },
      ]);

      const result = await service.getTrustBadge('seller-uuid');

      expect(result.badge).toEqual(TrustBadge.INTERMEDIATE);
      expect(result.totalReviews).toEqual(2);
    });

    it('should return SAFE badge for high rating and low complaints', async () => {
      const reviews = Array(10).fill(null).map(() => ({
        rating: 5,
        type: ReviewType.POSITIVE,
      }));
      reviews.push({ rating: 3, type: ReviewType.COMPLAINT });

      mockRepository.find.mockResolvedValue(reviews);

      const result = await service.getTrustBadge('seller-uuid');

      expect(result.badge).toEqual(TrustBadge.SAFE);
      expect(result.averageRating).toBeGreaterThanOrEqual(4.0);
    });

    it('should return UNSAFE badge for low rating', async () => {
      const reviews = [
        { rating: 1, type: ReviewType.COMPLAINT },
        { rating: 2, type: ReviewType.COMPLAINT },
        { rating: 2, type: ReviewType.NEUTRAL },
        { rating: 1, type: ReviewType.COMPLAINT },
      ];

      mockRepository.find.mockResolvedValue(reviews);

      const result = await service.getTrustBadge('seller-uuid');

      expect(result.badge).toEqual(TrustBadge.UNSAFE);
    });

    it('should return UNSAFE badge for high complaint rate', async () => {
      const reviews = [
        { rating: 5, type: ReviewType.POSITIVE },
        { rating: 1, type: ReviewType.COMPLAINT },
        { rating: 1, type: ReviewType.COMPLAINT },
        { rating: 1, type: ReviewType.COMPLAINT },
      ];

      mockRepository.find.mockResolvedValue(reviews);

      const result = await service.getTrustBadge('seller-uuid');

      expect(result.badge).toEqual(TrustBadge.UNSAFE);
      expect(result.complaintRate).toBeGreaterThanOrEqual(25);
    });
  });
});
