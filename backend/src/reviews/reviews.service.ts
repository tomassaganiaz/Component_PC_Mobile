import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review, ReviewType, ReviewStatus, TrustBadge } from './review.entity';
import { CreateReviewDto, UpdateReviewStatusDto, FilterReviewDto } from './dto';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/order.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly ordersService: OrdersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createReviewDto: CreateReviewDto, buyerId: string): Promise<Review> {
    const { productId, orderId, type, complaintReason } = createReviewDto;

    // Verify order exists and belongs to buyer
    const order = await this.ordersService.findOne(orderId);

    if (order.buyerId !== buyerId) {
      throw new BadRequestException('Solo puedes reseñar tus propias compras');
    }

    if (order.productId !== productId) {
      throw new BadRequestException('El producto no corresponde a esta orden');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Solo puedes reseñar productos entregados');
    }

    // Check if review already exists for this order
    const existingReview = await this.reviewRepository.findOne({
      where: { orderId, buyerId },
    });

    if (existingReview) {
      throw new ConflictException('Ya has reseñado esta compra');
    }

    // Validate complaint has reason
    if (type === ReviewType.COMPLAINT && !complaintReason) {
      throw new BadRequestException('Las quejas deben incluir una razón');
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      buyerId,
      sellerId: order.product.sellerId,
      isVerifiedPurchase: true,
      status: type === ReviewType.COMPLAINT ? ReviewStatus.PENDING : ReviewStatus.APPROVED,
    });

    return this.reviewRepository.save(review);
  }

  async findAll(filters?: FilterReviewDto): Promise<{ data: Review[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.reviewRepository.createQueryBuilder('review')
      .leftJoinAndSelect('review.buyer', 'buyer')
      .leftJoinAndSelect('review.product', 'product')
      .where('review.status = :status', { status: ReviewStatus.APPROVED });

    if (filters?.sellerId) {
      query.andWhere('review.sellerId = :sellerId', { sellerId: filters.sellerId });
    }

    if (filters?.productId) {
      query.andWhere('review.productId = :productId', { productId: filters.productId });
    }

    if (filters?.type) {
      query.andWhere('review.type = :type', { type: filters.type });
    }

    const [data, total] = await query
      .orderBy('review.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findBySeller(sellerId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { sellerId, status: ReviewStatus.APPROVED },
      relations: ['buyer', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProduct(productId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { productId, status: ReviewStatus.APPROVED },
      relations: ['buyer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['buyer', 'seller', 'product', 'order'],
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    return review;
  }

  async updateStatus(
    id: string,
    updateDto: UpdateReviewStatusDto,
    resolvedBy: string,
  ): Promise<Review> {
    const review = await this.findOne(id);

    review.status = updateDto.status as ReviewStatus;
    review.resolutionNotes = updateDto.resolutionNotes;
    review.resolvedBy = resolvedBy;

    return this.reviewRepository.save(review);
  }

  async getTrustBadge(sellerId: string): Promise<{
    badge: TrustBadge;
    averageRating: number;
    totalReviews: number;
    complaintRate: number;
    breakdown: { positive: number; neutral: number; complaint: number };
  }> {
    const reviews = await this.reviewRepository.find({
      where: { sellerId, status: ReviewStatus.APPROVED },
    });

    if (reviews.length < 3) {
      return {
        badge: TrustBadge.INTERMEDIATE,
        averageRating: 0,
        totalReviews: reviews.length,
        complaintRate: 0,
        breakdown: { positive: 0, neutral: 0, complaint: 0 },
      };
    }

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    const complaints = reviews.filter((r) => r.type === ReviewType.COMPLAINT).length;
    const complaintRate = (complaints / totalReviews) * 100;

    const breakdown = {
      positive: reviews.filter((r) => r.type === ReviewType.POSITIVE).length,
      neutral: reviews.filter((r) => r.type === ReviewType.NEUTRAL).length,
      complaint: complaints,
    };

    let badge: TrustBadge;

    if (averageRating >= 4.0 && complaintRate < 10) {
      badge = TrustBadge.SAFE;
    } else if (averageRating >= 3.0 && complaintRate < 25) {
      badge = TrustBadge.INTERMEDIATE;
    } else {
      badge = TrustBadge.UNSAFE;
    }

    return {
      badge,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      complaintRate: Math.round(complaintRate * 10) / 10,
      breakdown,
    };
  }

  async getSellerStats(sellerId: string): Promise<{
    totalSales: number;
    averageRating: number;
    responseRate: number;
    badge: TrustBadge;
  }> {
    const badgeData = await this.getTrustBadge(sellerId);

    const totalSales = await this.dataSource
      .getRepository('Order')
      .createQueryBuilder('order')
      .innerJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .getCount();

    return {
      totalSales,
      averageRating: badgeData.averageRating,
      responseRate: 95, // Placeholder - implement actual calculation
      badge: badgeData.badge,
    };
  }
}
