import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Coupon, CouponType } from "./coupon.entity";
import { CreateCouponDto } from "./dto";

export interface CouponValidation {
  code: string;
  type: CouponType;
  discount: number;
  finalTotal: number;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly repository: Repository<Coupon>,
  ) {}

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.repository.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException("El código de cupón ya existe");
    }

    const coupon = this.repository.create({
      code,
      type: dto.type,
      value: dto.value,
      minPurchase: dto.minPurchase ?? 0,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      usageLimit: dto.usageLimit ?? null,
      active: dto.active ?? true,
    });
    return this.repository.save(coupon);
  }

  async findAll(): Promise<Coupon[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }

  /** Valida un cupón y calcula el descuento para un monto dado. */
  async validate(code: string, amount: number): Promise<CouponValidation> {
    const normalized = code.trim().toUpperCase();
    const coupon = await this.repository.findOne({
      where: { code: normalized },
    });

    if (!coupon || !coupon.active) {
      throw new BadRequestException("Cupón inválido o inactivo");
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("El cupón está vencido");
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException("El cupón alcanzó su límite de uso");
    }
    if (amount < Number(coupon.minPurchase)) {
      throw new BadRequestException(
        `El cupón requiere una compra mínima de ${coupon.minPurchase}`,
      );
    }

    const raw =
      coupon.type === CouponType.PERCENT
        ? (amount * Number(coupon.value)) / 100
        : Number(coupon.value);
    const discount = Math.min(amount, this.round(raw));

    return {
      code: coupon.code,
      type: coupon.type,
      discount,
      finalTotal: this.round(amount - discount),
    };
  }

  /**
   * Registra el uso de un cupón de forma atómica y condicional:
   * el UPDATE solo incrementa si sigue activo y debajo del límite, así que
   * dos pagos concurrentes jamás exceden `usageLimit`.
   */
  async redeem(code: string): Promise<void> {
    const normalized = code.trim().toUpperCase();
    const result = await this.repository
      .createQueryBuilder()
      .update(Coupon)
      .set({ usedCount: () => "used_count + 1" })
      .where("code = :code", { code: normalized })
      .andWhere("active = true")
      .andWhere("(usage_limit IS NULL OR used_count < usage_limit)")
      .execute();

    if (!result.affected) {
      throw new BadRequestException(
        "El cupón alcanzó su límite de uso o está inactivo",
      );
    }
  }
}
