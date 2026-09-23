import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProductCondition,
  ProductCategory,
  ProductStatus,
  SellerSecurityTier,
} from '../product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'RTX 3080 Ti' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Tarjeta gráfica en excelente estado' })
  @IsString()
  description: string;

  @ApiProperty({ example: 450.0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ enum: ProductCondition, example: ProductCondition.USED })
  @IsEnum(ProductCondition)
  condition: ProductCondition;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.GPU })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiPropertyOptional({ example: ['url1.jpg', 'url2.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  hoursOfUse?: number;

  @ApiPropertyOptional({ example: 500, description: 'Horas de uso declaradas por el vendedor' })
  @IsOptional()
  @IsNumber()
  reportedHoursOfUse?: number;

  @ApiPropertyOptional({ example: 'Gaming / uso intensivo' })
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional({ example: 'Buen estado, sin rayones' })
  @IsOptional()
  @IsString()
  physicalState?: string;

  @ApiPropertyOptional({ example: 'NVIDIA' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'RTX 3080 Ti Founders Edition' })
  @IsOptional()
  @IsString()
  model?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: true, description: 'Producto chequeado para compra' })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Producto nuevo: sin uso y sin sacar de la caja' })
  @IsOptional()
  @IsBoolean()
  sealed?: boolean;

  @ApiPropertyOptional({ example: 'A+' })
  @IsOptional()
  @IsString()
  conditionGrade?: string;

  @ApiPropertyOptional({ example: 'Gaming' })
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional({ example: 'Cinebench 30 min, pico 67°C' })
  @IsOptional()
  @IsString()
  stressTest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hoursOfUse?: number;

  @ApiPropertyOptional({ description: 'Horas de uso declaradas por el vendedor' })
  @IsOptional()
  @IsNumber()
  reportedHoursOfUse?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  physicalState?: string;
}

export class FilterProductDto {
  @ApiPropertyOptional({ enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiPropertyOptional({ enum: ProductCondition })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 'RTX' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true, description: 'Solo productos chequeados para compra' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verified?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Solo productos nuevos: sin uso y sin sacar de la caja' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sealed?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Solo productos con custodia/escrow habilitada' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  escrow?: boolean;

  @ApiPropertyOptional({
    enum: ['techshield', 'extended'],
    description: 'Garantía TechShield (90 días) o cobertura extendida',
  })
  @IsOptional()
  @IsEnum(['techshield', 'extended'])
  warranty?: 'techshield' | 'extended';

  @ApiPropertyOptional({ example: 80, description: 'Positividad mínima del vendedor (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minPositivity?: number;

  @ApiPropertyOptional({ example: 500, description: 'Horas de uso máximas (productos usados)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxHoursOfUse?: number;

  @ApiPropertyOptional({ example: true, description: 'Excluir productos usados en minería' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  noMining?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Ocultar productos con quejas abiertas' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hideWithComplaints?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Ocultar productos con precio sospechoso (anti-estafa)' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hideSuspicious?: boolean;

  @ApiPropertyOptional({
    enum: SellerSecurityTier,
    description: 'Tier de seguridad del vendedor',
  })
  @IsOptional()
  @IsEnum(SellerSecurityTier)
  sellerTier?: SellerSecurityTier;
}