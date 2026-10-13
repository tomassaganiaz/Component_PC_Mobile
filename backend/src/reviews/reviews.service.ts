import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Review, ReviewType, ReviewStatus, TrustBadge } from "./review.entity";
import { CreateReviewDto, UpdateReviewStatusDto, FilterReviewDto } from "./dto";
import { OrdersService } from "../orders/orders.service";
import { OrderStatus } from "../orders/order.entity";
import { UsersService } from "../users/users.service";
import { SellerSecurityTier } from "../products/product.entity";

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

export type ReputationMedal = "none" | "silver" | "gold" | "platinum";

export interface SellerReputation {
  level: number; // 1..5 (termómetro)
  color: string; // color del termómetro
  label: string; // etiqueta legible
  medal: ReputationMedal;
  averageRating: number;
  positivity: number;
  complaintRate: number;
  totalReviews: number;
  totalSales: number;
  transactionsLast60d: number;
  cancelledLast60d: number;
  breakdown: { positive: number; neutral: number; complaint: number };
}

const REPUTATION_LEVELS: { level: number; color: string; label: string }[] = [
  { level: 1, color: "#ef4444", label: "Malo" },
  { level: 2, color: "#f97316", label: "Regular" },
  { level: 3, color: "#facc15", label: "Bueno" },
  { level: 4, color: "#84cc16", label: "Muy bueno" },
  { level: 5, color: "#10b981", label: "Excelente" },
];

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createReviewDto: CreateReviewDto,
    buyerId: string,
  ): Promise<Review> {
    const { productId, orderId, type, complaintReason } = createReviewDto;

    // Verify order exists and belongs to buyer
    const order = await this.ordersService.findOne(orderId);

    if (order.buyerId !== buyerId) {
      throw new BadRequestException("Solo puedes reseñar tus propias compras");
    }

    const item = order.items?.find((i) => i.productId === productId);
    const sourceProduct =
      item?.product ??
      (order.productId === productId ? order.product : null) ??
      undefined;
    if (!sourceProduct) {
      throw new BadRequestException("El producto no corresponde a esta orden");
    }

    // Solo compradores que recibieron el producto o lo devolvieron pueden reseñar
    const canReview =
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.REFUNDED;
    if (!canReview) {
      throw new BadRequestException(
        "Solo puedes reseñar productos entregados o devueltos (compra verificada)",
      );
    }

    // Check if review already exists for this order
    const existingReview = await this.reviewRepository.findOne({
      where: { orderId, buyerId },
    });

    if (existingReview) {
      throw new ConflictException("Ya has reseñado esta compra");
    }

    // Validate complaint has reason
    if (type === ReviewType.COMPLAINT && !complaintReason) {
      throw new BadRequestException("Las quejas deben incluir una razón");
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      buyerId,
      sellerId: sourceProduct.sellerId,
      isVerifiedPurchase: true,
      status:
        type === ReviewType.COMPLAINT
          ? ReviewStatus.PENDING
          : ReviewStatus.APPROVED,
    });

    return this.reviewRepository.save(review);
  }

  async findAll(
    filters?: FilterReviewDto,
  ): Promise<{ data: Review[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.reviewRepository
      .createQueryBuilder("review")
      .leftJoinAndSelect("review.buyer", "buyer")
      .leftJoinAndSelect("review.product", "product")
      .where("review.status = :status", { status: ReviewStatus.APPROVED });

    if (filters?.sellerId) {
      query.andWhere("review.sellerId = :sellerId", {
        sellerId: filters.sellerId,
      });
    }

    if (filters?.productId) {
      query.andWhere("review.productId = :productId", {
        productId: filters.productId,
      });
    }

    if (filters?.type) {
      query.andWhere("review.type = :type", { type: filters.type });
    }

    const [data, total] = await query
      .orderBy("review.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findBySeller(sellerId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { sellerId, status: ReviewStatus.APPROVED },
      relations: ["buyer", "product"],
      order: { createdAt: "DESC" },
    });
  }

  async findByProduct(productId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { productId, status: ReviewStatus.APPROVED },
      relations: ["buyer"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ["buyer", "seller", "product", "order"],
    });

    if (!review) {
      throw new NotFoundException("Reseña no encontrada");
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
      this.reviewRepository.find({
        where: { sellerId, status: ReviewStatus.APPROVED },
      }),
      this.usersService.findOne(sellerId),
    ]);

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews === 0
        ? 0
        : reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    const positive = reviews.filter(
      (r) => r.type === ReviewType.POSITIVE,
    ).length;
    const complaints = reviews.filter(
      (r) => r.type === ReviewType.COMPLAINT,
    ).length;
    const neutral = reviews.filter((r) => r.type === ReviewType.NEUTRAL).length;
    const positivity =
      totalReviews === 0 ? 0 : Math.round((positive / totalReviews) * 100);
    const complaintRate =
      totalReviews === 0 ? 0 : (complaints / totalReviews) * 100;

    const acceptsTesting = seller?.acceptsTesting ?? false;

    let tier: SellerSecurityTier;
    // Sin historial no se penaliza: queda NORMAL hasta tener evidencia.
    if (totalReviews === 0) {
      tier = SellerSecurityTier.NORMAL;
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
      identityVerified:
        seller?.phoneVerified === true || seller?.documentVerified === true,
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
      .getRepository("Order")
      .createQueryBuilder("order")
      .innerJoin("order.product", "product")
      .where("product.sellerId = :sellerId", { sellerId })
      .andWhere("order.status = :status", { status: OrderStatus.DELIVERED })
      .getCount();

    return {
      totalSales,
      averageRating: badgeData.averageRating,
      responseRate: 95, // Placeholder - implement actual calculation
      badge: badgeData.badge,
      tier: badgeData.tier,
    };
  }

  private computeReputationLevel(
    positivity: number,
    complaints: number,
    totalReviews: number,
    totalSales: number,
  ): number {
    // Sin historial suficiente: nivel base según ventas cerradas.
    if (totalReviews < 3) {
      return totalSales >= 5 ? 3 : 2;
    }
    if (positivity >= 90 && complaints === 0) return 5;
    if (positivity >= 75) return 4;
    if (positivity >= 60) return 3;
    if (positivity >= 40) return 2;
    return 1;
  }

  private computeMedal(
    level: number,
    totalSales: number,
  ): ReputationMedal {
    if (level >= 5 && totalSales >= 50) return "platinum";
    if (level >= 4 && totalSales >= 10) return "gold";
    if (level >= 3 && totalSales >= 3) return "silver";
    return "none";
  }

  /** Reputación formal del vendedor (termómetro + medalla + métricas). */
  async getSellerReputation(sellerId: string): Promise<SellerReputation> {
    const badge = await this.getTrustBadge(sellerId);

    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const orderRepo = this.dataSource.getRepository("Order");
    const base = () =>
      orderRepo
        .createQueryBuilder("o")
        .innerJoin("o.product", "p")
        .where("p.sellerId = :sellerId", { sellerId });

    const [totalSales, transactionsLast60d, cancelledLast60d] =
      await Promise.all([
        base()
          .andWhere("o.status = :s", { s: OrderStatus.DELIVERED })
          .getCount(),
        base()
          .andWhere("o.status = :s", { s: OrderStatus.DELIVERED })
          .andWhere("o.createdAt >= :since", { since })
          .getCount(),
        base()
          .andWhere("o.status = :s", { s: OrderStatus.CANCELLED })
          .andWhere("o.createdAt >= :since", { since })
          .getCount(),
      ]);

    const level = this.computeReputationLevel(
      badge.positivity,
      badge.complaints,
      badge.totalReviews,
      totalSales,
    );
    const meta =
      REPUTATION_LEVELS.find((l) => l.level === level) ?? REPUTATION_LEVELS[0];

    return {
      level,
      color: meta.color,
      label: meta.label,
      medal: this.computeMedal(level, totalSales),
      averageRating: badge.averageRating,
      positivity: badge.positivity,
      complaintRate: badge.complaintRate,
      totalReviews: badge.totalReviews,
      totalSales,
      transactionsLast60d,
      cancelledLast60d,
      breakdown: badge.breakdown,
    };
  }
}
