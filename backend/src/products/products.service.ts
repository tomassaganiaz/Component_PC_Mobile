import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Product,
  ProductStatus,
  SellerSecurityTier,
} from './product.entity';
import { CreateProductDto, UpdateProductDto, FilterProductDto } from './dto';
import { Review, ReviewStatus } from '../reviews/review.entity';

interface SellerStats {
  total: number;
  positive: number;
  complaints: number;
  positivity: number;
  identityVerified: boolean;
}

export interface ProductWithSecurity extends Product {
  securityTier: SellerSecurityTier;
  sellerStats: SellerStats;
  openComplaints: number;
  priceFlag: 'normal' | 'suspicious';
  marketAveragePrice: number | null;
  priceDiffPct: number | null;
  warranty: {
    days: number;
    extended: boolean;
    remainingDays: number;
    label: string;
  };
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(createProductDto: CreateProductDto, sellerId: string): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      sellerId,
    });
    return this.productRepository.save(product);
  }

  private computeTier(stats: SellerStats, acceptsTesting: boolean): SellerSecurityTier {
    if (stats.total === 0) {
      return acceptsTesting ? SellerSecurityTier.NORMAL : SellerSecurityTier.NOT_SECURE;
    }
    if (stats.positivity < 50 || stats.complaints >= 3 || !acceptsTesting) {
      return SellerSecurityTier.NOT_SECURE;
    }
    if (stats.positivity >= 75 && stats.complaints === 0 && acceptsTesting) {
      return SellerSecurityTier.SECURE;
    }
    return SellerSecurityTier.NORMAL;
  }

  private async getSellerStatsMap(
    products: Product[],
  ): Promise<Map<string, SellerStats>> {
    const sellerIds = [...new Set(products.map((p) => p.sellerId))];
    const statsMap = new Map<string, SellerStats>();

    const reviews =
      sellerIds.length > 0
        ? await this.reviewRepository
            .createQueryBuilder('review')
            .select('review.sellerId', 'sellerId')
            .addSelect('review.type', 'type')
            .where('review.sellerId IN (:...sellerIds)', { sellerIds })
            .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
            .getRawMany<{ sellerId: string; type: string }>()
        : [];

    for (const sellerId of sellerIds) {
      const sellerReviews = reviews.filter((r) => r.sellerId === sellerId);
      const total = sellerReviews.length;
      const positive = sellerReviews.filter((r) => r.type === 'positive').length;
      const complaints = sellerReviews.filter((r) => r.type === 'complaint').length;
      const seller = products.find((p) => p.sellerId === sellerId)?.seller;
      statsMap.set(sellerId, {
        total,
        positive,
        complaints,
        positivity: total === 0 ? 0 : Math.round((positive / total) * 100),
        identityVerified: seller?.phoneVerified === true || seller?.documentVerified === true,
      });
    }

    return statsMap;
  }

  private async getOpenComplaintsMap(productIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (productIds.length === 0) return map;

    const rows = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.productId', 'productId')
      .addSelect('COUNT(*)', 'count')
      .where('review.productId IN (:...productIds)', { productIds })
      .andWhere('review.type = :type', { type: 'complaint' })
      .andWhere('review.status != :resolved', { resolved: ReviewStatus.RESOLVED })
      .groupBy('review.productId')
      .getRawMany<{ productId: string; count: string }>();

    for (const row of rows) {
      map.set(row.productId, Number(row.count));
    }
    return map;
  }

  private skuKey(title: string): string {
    return title
      .toLowerCase()
      .replace(/[0-9]+(gb|tb|ghz|gbps|mb)/g, '')
      .replace(/\b(fe|oc|selledo|sellado|nueva|nuevo|new|pro|plus|128|256|512|1tb|2tb)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private enrich(
    products: Product[],
    statsMap: Map<string, SellerStats>,
    openComplaints: Map<string, number>,
  ): ProductWithSecurity[] {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const byTitle = new Map<string, Product[]>();
    for (const p of products) {
      const key = this.skuKey(p.title);
      const list = byTitle.get(key) ?? [];
      list.push(p);
      byTitle.set(key, list);
    }

    return products.map((product) => {
      const stats = statsMap.get(product.sellerId) ?? {
        total: 0,
        positive: 0,
        complaints: 0,
        positivity: 0,
        identityVerified: false,
      };
      const tier = this.computeTier(stats, product.seller?.acceptsTesting ?? false);

      const group = byTitle.get(this.skuKey(product.title)) ?? [product];
      const marketAverage =
        group.reduce((sum, p) => sum + Number(p.price), 0) / group.length;
      const priceDiffPct =
        marketAverage > 0 ? ((Number(product.price) - marketAverage) / marketAverage) * 100 : 0;
      const priceFlag: 'normal' | 'suspicious' =
        group.length >= 2 && priceDiffPct <= -20 ? 'suspicious' : 'normal';

      const remainingDays = Math.max(
        0,
        Math.ceil((product.createdAt.getTime() + product.warrantyDays * day - now) / day),
      );

      return {
        ...product,
        securityTier: tier,
        sellerStats: stats,
        openComplaints: openComplaints.get(product.id) ?? 0,
        priceFlag,
        marketAveragePrice: Math.round(marketAverage * 100) / 100,
        priceDiffPct: Math.round(priceDiffPct * 10) / 10,
        warranty: {
          days: product.warrantyDays,
          extended: product.coverageExtended,
          remainingDays,
          label: product.coverageExtended
            ? `Cobertura extendida · ${remainingDays} días restantes`
            : `Garantía TechShield ${product.warrantyDays} días`,
        },
      };
    });
  }

  async findAll(filters?: FilterProductDto): Promise<ProductWithSecurity[]> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('product.status = :status', { status: ProductStatus.PUBLISHED });

    if (filters?.category) {
      query.andWhere('product.category = :category', { category: filters.category });
    }

    if (filters?.condition) {
      query.andWhere('product.condition = :condition', { condition: filters.condition });
    }

    if (filters?.minPrice) {
      query.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters?.maxPrice) {
      query.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    if (filters?.verified === true) {
      query.andWhere('product.verified = :verified', { verified: true });
    }

    if (filters?.sealed === true) {
      query.andWhere('product.sealed = :sealed', { sealed: true });
    }

    if (filters?.escrow === true) {
      query.andWhere('product.escrowProtected = :escrow', { escrow: true });
    }

    if (filters?.warranty === 'extended') {
      query.andWhere('product.coverageExtended = :extended', { extended: true });
    } else if (filters?.warranty === 'techshield') {
      query.andWhere('product.warrantyDays >= :minWarranty', { minWarranty: 90 });
    }

    if (filters?.maxHoursOfUse !== undefined) {
      query.andWhere(
        '(product.hoursOfUse IS NULL OR product.hoursOfUse <= :maxHours)',
        { maxHours: filters.maxHoursOfUse },
      );
    }

    if (filters?.noMining === true) {
      query.andWhere("(product.usageType IS NULL OR product.usageType NOT ILIKE '%miner%')");
    }

    if (filters?.search) {
      query.andWhere('(product.title ILIKE :search OR product.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const products = await query.orderBy('product.createdAt', 'DESC').getMany();

    const [statsMap, openComplaints] = await Promise.all([
      this.getSellerStatsMap(products),
      this.getOpenComplaintsMap(products.map((p) => p.id)),
    ]);

    let result = this.enrich(products, statsMap, openComplaints);

    if (filters?.minPositivity !== undefined) {
      result = result.filter((p) => p.sellerStats.positivity >= (filters.minPositivity ?? 0));
    }

    if (filters?.hideWithComplaints === true) {
      result = result.filter((p) => p.openComplaints === 0);
    }

    if (filters?.hideSuspicious === true) {
      result = result.filter((p) => p.priceFlag === 'normal');
    }

    if (filters?.sellerTier) {
      result = result.filter((p) => p.securityTier === filters.sellerTier);
    }

    return result;
  }

  async findOne(id: string): Promise<ProductWithSecurity> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['seller', 'verifications'],
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const [statsMap, openComplaints] = await Promise.all([
      this.getSellerStatsMap([product]),
      this.getOpenComplaintsMap([product.id]),
    ]);

    return this.enrich([product], statsMap, openComplaints)[0];
  }

  async findBySeller(sellerId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.softRemove(product);
  }
}