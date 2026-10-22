import { IsUUID, IsInt, IsOptional, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddCartItemDto {
  @ApiProperty({ example: "3f1e2d4c-...-uuid" })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  quantity?: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  quantity: number;
}
