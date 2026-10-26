import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { CreateAnalyticsEventDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("events")
  @ApiOperation({
    summary: "Registrar evento de analytics (fire-and-forget, pǧblico)",
  })
  create(@Body() dto: CreateAnalyticsEventDto, @Request() req: ExpressRequest) {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.analyticsService.create(dto, userId);
  }

  @Get("events")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar eventos recientes (solo admin)" })
  findRecent(@Query("limit") limit?: string) {
    return this.analyticsService.findRecent(limit ? Number(limit) : 100);
  }
}
