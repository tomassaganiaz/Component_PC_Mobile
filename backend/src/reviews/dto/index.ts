import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewType } from '../review.entity';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID del producto comprado' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID de la orden de compra' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Calificación general (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ enum: ReviewType, description: 'Tipo de reseña' })
  @IsEnum(ReviewType)
  type: ReviewType;

  @ApiPropertyOptional({ description: 'Comentario o reseña textual' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ description: 'Calificación al vendedor (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  sellerRating?: number;

  @ApiPropertyOptional({ description: 'Calificación al producto (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  productRating?: number;

  @ApiPropertyOptional({ description: 'Razón de la queja (obligatorio si type es complaint)' })
  @ValidateIf((o) => o.type === ReviewType.COMPLAINT)
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  complaintReason?: string;
}

export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ['approved', 'rejected', 'resolved'] })
  @IsEnum(['approved', 'rejected', 'resolved'])
  status: string;

  @ApiPropertyOptional({ description: 'Notas de resolución' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNotes?: string;
}

export class FilterReviewDto {
  @ApiPropertyOptional({ description: 'ID del vendedor' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional({ description: 'ID del producto' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ enum: ReviewType })
  @IsOptional()
  @IsEnum(ReviewType)
  type?: ReviewType;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Límite por página', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
