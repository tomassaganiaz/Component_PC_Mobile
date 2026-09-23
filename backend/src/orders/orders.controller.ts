import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, ReturnOrderDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear orden de compra (dinero en custodia)' })
  create(@Body() createOrderDto: CreateOrderDto, @Request() req: ExpressRequest) {
    return this.ordersService.create(createOrderDto, (req.user as any).id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener órdenes del usuario' })
  findMyOrders(@Request() req: ExpressRequest) {
    return this.ordersService.findByBuyer((req.user as any).id);
  }

  @Get(':id/protection')
  @ApiOperation({ summary: 'Ventana de protección: devolución 10 días / cobertura 45 días' })
  getProtection(@Param('id') id: string) {
    return this.ordersService.getProtection(id);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Solicitar devolución (dentro de los 10 días)' })
  requestReturn(
    @Param('id') id: string,
    @Body() returnOrderDto: ReturnOrderDto,
    @Request() req: ExpressRequest,
  ) {
    return this.ordersService.requestReturn(id, (req.user as any).id, returnOrderDto.reason);
  }

  @Post(':id/coverage')
  @ApiOperation({ summary: 'Solicitar cobertura de la empresa (hasta 45 días)' })
  requestCoverage(@Param('id') id: string, @Request() req: ExpressRequest) {
    return this.ordersService.requestCoverage(id, (req.user as any).id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de orden' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar estado de orden' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar orden' })
  cancel(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }
}