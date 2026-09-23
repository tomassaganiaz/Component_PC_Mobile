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
import { UsersService } from '../users/users.service';
import { SellerSecurityTier } from '../products/product.entity';

export interface SecurityProfile {
  tier: SellerSecurityTier;
  badge: TrustBadge;
  averageRating: number;
  totalReviews: number;
  positivity: number;
  complaintRate: number;
  complaints: number;
  acceptsTesting: boolean;
  identityVerified: boolean;
  breakdown: { positive: number; neutral: number; complaint: number };
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
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

    // Solo compradores que recibieron el producto o lo devolvieron pueden reseñar
    const canReview =
      order.status === OrderStatus.DELIVERED || order.status === OrderStatus.REFUNDED;
    if (!canReview) {
      throw new BadRequestException(
        'Solo puedes reseñar productos entregados o devueltos (compra verificada)',
      );
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
    review.resolutionNotes = updateDto.resolutionNotes as string;
    review.resolvedBy = resolvedBy;

    return this.reviewRepository.save(review);
  }

  async getTrustBadge(sellerId: string): Promise<SecurityProfile> {
    const [reviews, seller] = await Promise.all([
      this.reviewRepository.find({ where: { sellerId, status: ReviewStatus.APPROVED } }),
      this.usersService.findOne(sellerId),
    ]);

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    const positive = reviews.filter((r) => r.type === ReviewType.POSITIVE).length;
    const complaints = reviews.filter((r) => r.type === ReviewType.COMPLAINT).length;
    const neutral = reviews.filter((r) => r.type === ReviewType.NEUTRAL).length;
    const positivity = totalReviews === 0 ? 0 : Math.round((positive / totalReviews) * 100);
    const complaintRate = totalReviews === 0 ? 0 : (complaints / totalReviews) * 100;

    const acceptsTesting = seller?.acceptsTesting ?? false;

    let tier: SellerSecurityTier;
    if (totalReviews === 0) {
      tier = acceptsTesting ? SellerSecurityTier.NORMAL : SellerSecurityTier.NOT_SECURE;
    } else if (positivity < 50 || complaints >= 3 || !acceptsTesting) {
      tier = SellerSecurityTier.NOT_SECURE;
    } else if (positivity >= 75 && complaints === 0 && acceptsTesting) {
      tier = SellerSecurityTier.SECURE;
    } else {
      tier = SellerSecurityTier.NORMAL;
    }

    const badge: TrustBadge =
      tier === SellerSecurityTier.SECURE
        ? TrustBadge.SAFE
        : tier === SellerSecurityTier.NORMAL
          ? TrustBadge.INTERMEDIATE
          : TrustBadge.UNSAFE;

    return {
      tier,
      badge,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      positivity,
      complaintRate: Math.round(complaintRate * 10) / 10,
      complaints,
      acceptsTesting,
      identityVerified: seller?.phoneVerified === true || seller?.documentVerified === true,
      breakdown: { positive, neutral, complaint: complaints },
    };
  }

  async getSellerStats(sellerId: string): Promise<{
    totalSales: number;
    averageRating: number;
    responseRate: number;
    badge: TrustBadge;
    tier: SellerSecurityTier;
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
      tier: badgeData.tier,
    };
  }
}
