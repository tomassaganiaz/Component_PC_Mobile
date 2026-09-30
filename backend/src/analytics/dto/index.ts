import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnalyticsEventDto {
  @ApiProperty({ example: 'product_view' })
  @IsString()
  @MaxLength(100)
  event: string;

  @ApiPropertyOptional({ example: '/product/TS-9482' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  page?: string;

  @ApiPropertyOptional({ example: 'TS-9482' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  productId?: string;

  @ApiPropertyOptional({ example: '4a889870' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderId?: string;

  @ApiPropertyOptional({ example: { title: 'AMD Ryzen 7 7800X3D', price: 340 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}