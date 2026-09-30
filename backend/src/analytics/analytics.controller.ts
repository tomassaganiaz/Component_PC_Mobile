import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsEventDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @ApiOperation({ summary: 'Registrar evento de analytics (fire-and-forget, público)' })
  create(@Body() dto: CreateAnalyticsEventDto, @Request() req: ExpressRequest) {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.analyticsService.create(dto, userId);
  }

  @Get('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar eventos recientes (debug/analytics)' })
  findRecent(@Query('limit') limit?: string) {
    return this.analyticsService.findRecent(limit ? Number(limit) : 100);
  }
}