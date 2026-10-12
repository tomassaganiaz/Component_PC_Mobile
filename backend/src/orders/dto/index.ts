import { IsString, IsOptional, IsEnum, IsUUID } from "class-validator";
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
