import { IsEnum, IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus, ReportTargetType } from '../report.entity';

export class CreateReportDto {
  @ApiProperty({ description: 'ID del usuario reportado (vendedor o comprador)' })
  @IsUUID()
  reportedId: string;

  @ApiProperty({ enum: ReportTargetType, description: 'Tipo de usuario reportado' })
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty({ example: 'Intentó vender fuera de la plataforma' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ example: 'Me pidió el pago por transferencia directa' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ReportStatus, example: ReportStatus.RESOLVED })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({ description: 'Notas de resolución' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNotes?: string;
}

export class FilterReportDto {
  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Límite por página', default: 20 })
  @IsOptional()
  limit?: number;
}