import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "../order.entity";

export class CreateOrderDto {
  @ApiProperty({ example: "3f1e2d4c-...-uuid" })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ example: "Av. Corrientes 1234, CABA" })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: "credit_card" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: "TECH10" })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: "3f1e2d4c-...-uuid" })
  @IsOptional()
  @IsUUID()
  variationId?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Solicitar reparación (solo productos rotos 'reparables')",
  })
  @IsOptional()
  @IsBoolean()
  repairRequested?: boolean;
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingAddress?: string;
}

export class ReturnOrderDto {
  @ApiProperty({ example: "El producto llegó con fallas" })
  @IsString()
  reason: string;
}

export class CheckoutCartDto {
  @ApiPropertyOptional({ example: "Av. Corrientes 1234, CABA" })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: "credit_card" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: "TECH10" })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
