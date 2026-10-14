import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  MinLength,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ProductCondition,
  ProductCategory,
  ProductStatus,
  SellerSecurityTier,
  BrokenTag,
} from "../product.entity";

export class CreateProductDto {
  @ApiProperty({ example: "RTX 3080 Ti" })
  @IsString()
  title: string;

  @ApiProperty({ example: "Tarjeta gráfica en excelente estado" })
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

  @ApiPropertyOptional({ example: ["url1.jpg", "url2.jpg"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  hoursOfUse?: number;

  @ApiPropertyOptional({
    example: 500,
    description: "Horas de uso declaradas por el vendedor",
  })
  @IsOptional()
  @IsNumber()
  reportedHoursOfUse?: number;

  @ApiPropertyOptional({
    example: 1,
    description: "Unidades disponibles en stock",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: "Gaming / uso intensivo" })
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional({ example: "Buen estado, sin rayones" })
  @IsOptional()
  @IsString()
  physicalState?: string;

  @ApiPropertyOptional({ example: "NVIDIA" })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: "RTX 3080 Ti Founders Edition" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Producto roto (repuestos o reparable)",
  })
  @IsOptional()
  @IsBoolean()
  broken?: boolean;

  @ApiPropertyOptional({ enum: BrokenTag, description: "reparable | parts" })
  @IsOptional()
  @IsEnum(BrokenTag)
  brokenTag?: BrokenTag;

  @ApiPropertyOptional({
    example: 80,
    description: "Costo de reparación (solo si brokenTag=reparable)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  repairPrice?: number;
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

  @ApiPropertyOptional({
    example: true,
    description: "Producto chequeado para compra",
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Producto nuevo: sin uso y sin sacar de la caja",
  })
  @IsOptional()
  @IsBoolean()
  sealed?: boolean;

  @ApiPropertyOptional({ example: "A+" })
  @IsOptional()
  @IsString()
  conditionGrade?: string;

  @ApiPropertyOptional({ example: "Gaming" })
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional({ example: "Cinebench 30 min, pico 67°C" })
  @IsOptional()
  @IsString()
  stressTest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hoursOfUse?: number;

  @ApiPropertyOptional({
    description: "Horas de uso declaradas por el vendedor",
  })
  @IsOptional()
  @IsNumber()
  reportedHoursOfUse?: number;

  @ApiPropertyOptional({
    example: 1,
    description: "Unidades disponibles en stock",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  physicalState?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  broken?: boolean;

  @ApiPropertyOptional({ enum: BrokenTag })
  @IsOptional()
  @IsEnum(BrokenTag)
  brokenTag?: BrokenTag;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  repairPrice?: number;
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

  @ApiPropertyOptional({ example: "A+", description: "Grado de condición" })
  @IsOptional()
  @IsString()
  conditionGrade?: string;

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

  @ApiPropertyOptional({ example: "RTX" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Solo productos chequeados para compra",
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verified?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Solo productos nuevos: sin uso y sin sacar de la caja",
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sealed?: boolean;

  @ApiPropertyOptional({ example: true, description: "Solo productos rotos" })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  broken?: boolean;

  @ApiPropertyOptional({ enum: BrokenTag, description: "reparable | parts" })
  @IsOptional()
  @IsEnum(BrokenTag)
  brokenTag?: BrokenTag;

  @ApiPropertyOptional({
    example: true,
    description: "Solo productos con custodia / escrow",
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  escrow?: boolean;

  @ApiPropertyOptional({
    enum: ["techshield", "extended"],
    description: "Garantía TechShield (90 días) o cobertura extendida",
  })
  @IsOptional()
  @IsEnum(["techshield", "extended"])
  warranty?: "techshield" | "extended";

  @ApiPropertyOptional({
    example: 80,
    description: "Positividad mínima del vendedor (0-100)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minPositivity?: number;

  @ApiPropertyOptional({
    example: 500,
    description: "Horas de uso máximas (productos usados)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxHoursOfUse?: number;

  @ApiPropertyOptional({
    example: true,
    description: "Excluir productos usados en minería",
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  noMining?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Ocultar productos con quejas abiertas",
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hideWithComplaints?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Ocultar productos con precio sospechoso (anti-estafa)",
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hideSuspicious?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Solo productos con stock disponible",
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  inStock?: boolean;

  @ApiPropertyOptional({
    enum: SellerSecurityTier,
    description: "Tier de seguridad del vendedor",
  })
  @IsOptional()
  @IsEnum(SellerSecurityTier)
  sellerTier?: SellerSecurityTier;

  @ApiPropertyOptional({
    example: 1,
    description: "Página a devolver (empieza en 1)",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: "Cantidad de ítems por página (máx 100)",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class CreateVariationDto {
  @ApiProperty({ example: "RTX3080-16GB" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  sku: string;

  @ApiPropertyOptional({ example: { ram: "16GB", color: "negro" } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ example: 50, description: "Ajuste de precio (+/-)" })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceDelta?: number;
}

export class UpdateVariationDto {
  @ApiPropertyOptional({ example: "RTX3080-32GB" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional({ example: { ram: "32GB" } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceDelta?: number;
}
