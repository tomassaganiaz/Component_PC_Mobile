import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CouponType } from "../coupon.entity";

export class CreateCouponDto {
  @ApiProperty({ example: "TECH10" })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code: string;

  @ApiProperty({ enum: CouponType, example: CouponType.PERCENT })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ example: 10, description: "10 (%) o monto fijo" })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @ApiPropertyOptional({ example: "2026-12-31T23:59:59.000Z" })
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ example: "TECH10" })
  @IsString()
  code: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}
