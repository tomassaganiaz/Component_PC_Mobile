import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto, UpdateReportStatusDto, FilterReportDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reportar un vendedor o comprador' })
  create(@Body() createReportDto: CreateReportDto, @Request() req: ExpressRequest) {
    return this.reportsService.create(createReportDto, (req.user as any).id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar reportes (solo admin)' })
  findAll(@Query() filters: FilterReportDto) {
    return this.reportsService.findAll(filters);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolver o descartar un reporte (solo admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateReportStatusDto,
    @Request() req: ExpressRequest,
  ) {
    return this.reportsService.updateStatus(id, updateDto, (req.user as any).id);
  }
}