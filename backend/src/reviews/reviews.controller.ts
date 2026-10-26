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
  ParseUUIDPipe,
  ForbiddenException,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto, UpdateReviewStatusDto, FilterReviewDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { TrustBadge, ReviewStatus } from "./review.entity";
import { UserRole } from "../users/user.entity";

@ApiTags("Reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Crear reseña de compra (solo compradores verificados)",
  })
  @ApiResponse({ status: 201, description: "Reseña creada exitosamente" })
  @ApiResponse({
    status: 400,
    description: "Datos inválidos o compra no verificada",
  })
  @ApiResponse({
    status: 409,
    description: "Ya existe una reseña del comprador para este producto",
  })
  create(
    @Body() createReviewDto: CreateReviewDto,
    @Request() req: ExpressRequest,
  ) {
    return this.reviewsService.create(createReviewDto, (req.user as any).id);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reseñas del comprador autenticado" })
  findMyReviews(@Request() req: ExpressRequest) {
    return this.reviewsService.findMyReviews((req.user as any).id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar reseñas con filtros (autenticado)" })
  async findAll(
    @Query() filters: FilterReviewDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as { id: string; role: string };
    // Solo admins pueden ver estados de moderación (pending/rejected/resolved):
    // expone quejas aún no aprobadas y la PII de sus compradores.
    if (
      filters.status &&
      filters.status !== ReviewStatus.APPROVED &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Solo administradores pueden filtrar reseñas por estado",
      );
    }
    return this.reviewsService.findAll(filters);
  }

  @Get("seller/:sellerId")
  @ApiOperation({ summary: "Obtener reseñas de un vendedor" })
  findBySeller(@Param("sellerId") sellerId: string) {
    return this.reviewsService.findBySeller(sellerId);
  }

  @Get("product/:productId")
  @ApiOperation({ summary: "Obtener reseñas de un producto" })
  findByProduct(@Param("productId") productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get("trust-badge/:sellerId")
  @ApiOperation({ summary: "Obtener etiqueta de confianza de un vendedor" })
  @ApiResponse({
    status: 200,
    description: "Retorna badge, promedio, total y desglose",
    schema: {
      properties: {
        badge: { enum: ["safe", "intermediate", "unsafe"] },
        averageRating: { type: "number" },
        totalReviews: { type: "number" },
        complaintRate: { type: "number" },
        breakdown: {
          type: "object",
          properties: {
            positive: { type: "number" },
            neutral: { type: "number" },
            complaint: { type: "number" },
          },
        },
      },
    },
  })
  getTrustBadge(@Param("sellerId") sellerId: string) {
    return this.reviewsService.getTrustBadge(sellerId);
  }

  @Get("stats/:sellerId")
  @ApiOperation({ summary: "Obtener estadísticas de un vendedor" })
  getSellerStats(@Param("sellerId") sellerId: string) {
    return this.reviewsService.getSellerStats(sellerId);
  }

  @Get("reputation/:sellerId")
  @ApiOperation({
    summary: "Reputación formal del vendedor (termómetro, medalla y métricas)",
  })
  getSellerReputation(
    @Param("sellerId", new ParseUUIDPipe()) sellerId: string,
  ) {
    return this.reviewsService.getSellerReputation(sellerId);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Obtener detalle de una reseña (partes interesadas)",
  })
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: ExpressRequest,
  ) {
    const review = await this.reviewsService.findOne(id);
    const user = req.user as { id: string; role: string };
    const isInterested =
      user.role === UserRole.ADMIN ||
      review.buyerId === user.id ||
      review.sellerId === user.id;
    if (!isInterested) {
      throw new ForbiddenException(
        "Solo las partes de la reseña pueden ver su detalle",
      );
    }
    return review;
  }

  @Patch(":id/resolve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Resolver queja (solo admin)" })
  updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdateReviewStatusDto,
    @Request() req: ExpressRequest,
  ) {
    return this.reviewsService.updateStatus(
      id,
      updateDto,
      (req.user as any).id,
    );
  }
}
