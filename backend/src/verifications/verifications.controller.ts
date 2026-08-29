import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationsService } from './verifications.service';
import { CreateVerificationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Verifications')
@Controller('verifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VerificationsController {
  constructor(private readonly verificationsService: VerificationsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear verificación de producto (solo admin)' })
  create(@Body() createVerificationDto: CreateVerificationDto, @Request() req) {
    return this.verificationsService.create(createVerificationDto, req.user.id);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Obtener verificaciones de un producto' })
  findByProduct(@Param('productId') productId: string) {
    return this.verificationsService.findByProduct(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de verificación' })
  findOne(@Param('id') id: string) {
    return this.verificationsService.findOne(id);
  }
}
