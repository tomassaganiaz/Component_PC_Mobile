import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCondition, ProductCategory, ProductStatus } from '../product.entity';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
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
}
