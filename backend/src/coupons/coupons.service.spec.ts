import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException } from "@nestjs/common";
import { CouponsService } from "./coupons.service";
import { Coupon, CouponType } from "./coupon.entity";

describe("CouponsService", () => {
  let service: CouponsService;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve(v)),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getRepositoryToken(Coupon), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  afterEach(() => jest.clearAllMocks());

  const baseCoupon = (o: Partial<Coupon> = {}): Coupon =>
    ({
      id: "c1",
      code: "TECH10",
      type: CouponType.PERCENT,
      value: 10,
      minPurchase: 0,
      expiresAt: null,
      usageLimit: null,
      usedCount: 0,
      active: true,
      createdAt: new Date(),
      ...o,
    }) as Coupon;

  describe("create", () => {
    it("normaliza el código y crea el cupón", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.create({
        code: "tech10",
        type: CouponType.PERCENT,
        value: 10,
      });
      expect(result.code).toBe("TECH10");
    });

    it("rechaza un código duplicado", async () => {
      mockRepository.findOne.mockResolvedValue(baseCoupon());
      await expect(
        service.create({ code: "TECH10", type: CouponType.PERCENT, value: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("validate", () => {
    it("calcula el descuento porcentual", async () => {
      mockRepository.findOne.mockResolvedValue(baseCoupon({ value: 10 }));
      const res = await service.validate("tech10", 500);
      expect(res.discount).toBe(50);
      expect(res.finalTotal).toBe(450);
      expect(res.code).toBe("TECH10");
    });

    it("calcula el descuento fijo sin pasar el monto", async () => {
      mockRepository.findOne.mockResolvedValue(
        baseCoupon({ type: CouponType.FIXED, value: 999 }),
      );
      const res = await service.validate("TECH10", 200);
      expect(res.discount).toBe(200);
      expect(res.finalTotal).toBe(0);
    });

    it("rechaza cupón inexistente/inactivo", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.validate("NOPE", 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rechaza cupón vencido", async () => {
      mockRepository.findOne.mockResolvedValue(
        baseCoupon({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.validate("TECH10", 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rechaza por compra mínima no alcanzada", async () => {
      mockRepository.findOne.mockResolvedValue(
        baseCoupon({ minPurchase: 1000 }),
      );
      await expect(service.validate("TECH10", 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rechaza cuando se alcanzó el límite de uso", async () => {
      mockRepository.findOne.mockResolvedValue(
        baseCoupon({ usageLimit: 1, usedCount: 1 }),
      );
      await expect(service.validate("TECH10", 100)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("redeem", () => {
    const qb = (affected: number) => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected }),
    });

    it("incrementa el contador de uso de forma condicional", async () => {
      const query = qb(1);
      mockRepository.createQueryBuilder.mockReturnValue(query);

      await service.redeem("tech10");

      expect(query.execute).toHaveBeenCalled();
      expect(query.andWhere).toHaveBeenCalledWith(
        "(usage_limit IS NULL OR used_count < usage_limit)",
      );
    });

    it("rechaza si el cupón está inactivo o agotado (affected = 0)", async () => {
      mockRepository.createQueryBuilder.mockReturnValue(qb(0));

      await expect(service.redeem("TECH10")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
