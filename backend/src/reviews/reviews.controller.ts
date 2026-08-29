import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewStatusDto, FilterReviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TrustBadge } from './review.entity';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear reseña de compra (solo compradores verificados)' })
  @ApiResponse({ status: 201, description: 'Reseña creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o compra no verificada' })
  @ApiResponse({ status: 409, description: 'Ya existe una reseña para esta compra' })
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.reviewsService.create(createReviewDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar reseñas con filtros' })
  findAll(@Query() filters: FilterReviewDto) {
    return this.reviewsService.findAll(filters);
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Obtener reseñas de un vendedor' })
  findBySeller(@Param('sellerId') sellerId: string) {
    return this.reviewsService.findBySeller(sellerId);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Obtener reseñas de un producto' })
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get('trust-badge/:sellerId')
  @ApiOperation({ summary: 'Obtener etiqueta de confianza de un vendedor' })
  @ApiResponse({
    status: 200,
    description: 'Retorna badge, promedio, total y desglose',
    schema: {
      properties: {
        badge: { enum: ['safe', 'intermediate', 'unsafe'] },
        averageRating: { type: 'number' },
        totalReviews: { type: 'number' },
        complaintRate: { type: 'number' },
        breakdown: {
          type: 'object',
          properties: {
            positive: { type: 'number' },
            neutral: { type: 'number' },
            complaint: { type: 'number' },
          },
        },
      },
    },
  })
  getTrustBadge(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getTrustBadge(sellerId);
  }

  @Get('stats/:sellerId')
  @ApiOperation({ summary: 'Obtener estadísticas de un vendedor' })
  getSellerStats(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getSellerStats(sellerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una reseña' })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolver queja (solo admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateReviewStatusDto,
    @Request() req,
  ) {
    return this.reviewsService.updateStatus(id, updateDto, req.user.id);
  }
}
