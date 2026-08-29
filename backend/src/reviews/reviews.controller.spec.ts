import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewType, ReviewStatus, TrustBadge } from './review.entity';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  const mockReviewsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findBySeller: jest.fn(),
    findByProduct: jest.fn(),
    findOne: jest.fn(),
    getTrustBadge: jest.fn(),
    getSellerStats: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockReviewsService }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a review', async () => {
      const createDto = {
        productId: 'product-uuid',
        orderId: 'order-uuid',
        rating: 5,
        type: ReviewType.POSITIVE,
        comment: 'Excelente producto',
      };

      const expectedReview = {
        id: 'review-uuid',
        ...createDto,
        buyerId: 'buyer-uuid',
        sellerId: 'seller-uuid',
        status: ReviewStatus.APPROVED,
      };

      mockReviewsService.create.mockResolvedValue(expectedReview);

      const result = await controller.create(createDto, { user: { id: 'buyer-uuid' } });

      expect(result).toEqual(expectedReview);
    });
  });

  describe('findAll', () => {
    it('should return paginated reviews', async () => {
      const expectedResponse = {
        data: [{ id: 'review-1', rating: 5 }],
        total: 1,
      };

      mockReviewsService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findBySeller', () => {
    it('should return reviews for a seller', async () => {
      const expectedReviews = [
        { id: 'review-1', sellerId: 'seller-uuid' },
      ];

      mockReviewsService.findBySeller.mockResolvedValue(expectedReviews);

      const result = await controller.findBySeller('seller-uuid');

      expect(result).toEqual(expectedReviews);
    });
  });

  describe('findByProduct', () => {
    it('should return reviews for a product', async () => {
      const expectedReviews = [
        { id: 'review-1', productId: 'product-uuid' },
      ];

      mockReviewsService.findByProduct.mockResolvedValue(expectedReviews);

      const result = await controller.findByProduct('product-uuid');

      expect(result).toEqual(expectedReviews);
    });
  });

  describe('getTrustBadge', () => {
    it('should return trust badge for a seller', async () => {
      const expectedBadge = {
        badge: TrustBadge.SAFE,
        averageRating: 4.5,
        totalReviews: 10,
        complaintRate: 5,
        breakdown: { positive: 8, neutral: 1, complaint: 1 },
      };

      mockReviewsService.getTrustBadge.mockResolvedValue(expectedBadge);

      const result = await controller.getTrustBadge('seller-uuid');

      expect(result).toEqual(expectedBadge);
    });
  });

  describe('getSellerStats', () => {
    it('should return seller statistics', async () => {
      const expectedStats = {
        totalSales: 15,
        averageRating: 4.2,
        responseRate: 95,
        badge: TrustBadge.SAFE,
      };

      mockReviewsService.getSellerStats.mockResolvedValue(expectedStats);

      const result = await controller.getSellerStats('seller-uuid');

      expect(result).toEqual(expectedStats);
    });
  });

  describe('findOne', () => {
    it('should return a review by id', async () => {
      const expectedReview = {
        id: 'review-uuid',
        rating: 5,
        comment: 'Great product',
      };

      mockReviewsService.findOne.mockResolvedValue(expectedReview);

      const result = await controller.findOne('review-uuid');

      expect(result).toEqual(expectedReview);
    });
  });

  describe('updateStatus', () => {
    it('should update review status (admin only)', async () => {
      const updateDto = {
        status: 'resolved',
        resolutionNotes: 'Queja resuelta',
      };

      const expectedReview = {
        id: 'review-uuid',
        status: ReviewStatus.RESOLVED,
        resolutionNotes: 'Queja resuelta',
      };

      mockReviewsService.updateStatus.mockResolvedValue(expectedReview);

      const result = await controller.updateStatus(
        'review-uuid',
        updateDto,
        { user: { id: 'admin-uuid' } },
      );

      expect(result).toEqual(expectedReview);
      expect(mockReviewsService.updateStatus).toHaveBeenCalledWith(
        'review-uuid',
        updateDto,
        'admin-uuid',
      );
    });
  });
});
