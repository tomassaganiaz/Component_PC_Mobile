import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationResult } from '../verification.entity';

export class CreateVerificationDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ enum: VerificationResult, example: VerificationResult.PASS })
  @IsEnum(VerificationResult)
  result: VerificationResult;

  @ApiProperty({ example: 'Producto en excelente estado, todas las pruebas pasaron' })
  @IsString()
  notes: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  hoursOfUse?: number;

  @ApiPropertyOptional({ example: 'Buen estado, mínimos rayones' })
  @IsOptional()
  @IsString()
  physicalState?: string;

  @ApiPropertyOptional({ example: 'Todas las funciones operativas' })
  @IsOptional()
  @IsString()
  functionalTest?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  cosmeticGrade?: string;
}
