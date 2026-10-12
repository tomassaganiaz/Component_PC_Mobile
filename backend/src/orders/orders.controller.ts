import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto, UpdateOrderDto, ReturnOrderDto, CheckoutCartDto } from "./dto";
import { Order } from "./order.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

@ApiTags("Orders")
@Controller("orders")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Autoriza la lectura de una orden: comprador, vendedor del producto o admin. */
  private assertCanView(
    order: Order,
    user: { id: string; role: string },
  ): void {
    if (user.role === UserRole.ADMIN) return;
    const isBuyer = order.buyerId === user.id;
    const isSeller = order.product?.sellerId === user.id;
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException("No tenés acceso a esta orden");
    }
  }

  @Post()
  @ApiOperation({ summary: "Crear orden de compra (dinero en custodia)" })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: ExpressRequest,
  ) {
    return this.ordersService.create(createOrderDto, (req.user as any).id);
  }

  @Post("checkout")
  @ApiOperation({ summary: "Crear una orden desde el carrito (multi-ítem)" })
  checkout(@Body() dto: CheckoutCartDto, @Request() req: ExpressRequest) {
    return this.ordersService.createFromCart((req.user as any).id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Obtener órdenes del usuario" })
  findMyOrders(@Request() req: ExpressRequest) {
    return this.ordersService.findByBuyer((req.user as any).id);
  }

  @Get("sales")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: "Obtener ventas del vendedor (órdenes de sus productos)" })
  findMySales(@Request() req: ExpressRequest) {
    return this.ordersService.findBySeller((req.user as any).id);
  }

  @Get(":id/protection")
  @ApiOperation({
    summary: "Ventana de protección: devolución 10 días / cobertura 45 días",
  })
  async getProtection(@Param("id", new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    const order = await this.ordersService.findOne(id);
    this.assertCanView(order, req.user as { id: string; role: string });
    return this.ordersService.getProtection(id);
  }

  @Post(":id/return")
  @ApiOperation({ summary: "Solicitar devolución (dentro de los 10 días)" })
  requestReturn(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() returnOrderDto: ReturnOrderDto,
    @Request() req: ExpressRequest,
  ) {
    return this.ordersService.requestReturn(
      id,
      (req.user as any).id,
      returnOrderDto.reason,
    );
  }

  @Post(":id/coverage")
  @ApiOperation({
    summary: "Solicitar cobertura de la empresa (hasta 45 días)",
  })
  requestCoverage(@Param("id", new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    return this.ordersService.requestCoverage(id, (req.user as any).id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de orden (comprador, vendedor o admin)" })
  async findOne(@Param("id", new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    const order = await this.ordersService.findOne(id);
    this.assertCanView(order, req.user as { id: string; role: string });
    return order;
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Actualizar orden (solo admin; usar /pay, /ship, /deliver, /cancel)",
  })
  update(@Param("id", new ParseUUIDPipe()) id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Post(":id/pay")
  @ApiOperation({
    summary: "Confirmar pago del comprador y dejar los fondos en custodia",
  })
  pay(@Param("id", new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    return this.ordersService.pay(id, (req.user as any).id);
  }

  @Post(":id/ship")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: "Marcar pedido como enviado (vendedor)" })
  ship(@Param("id", new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    return this.ordersService.ship(id, (req.user as any).id);
  }

  @Post(":id/deliver")
  @ApiOperation({ summary: "Confirmar recepción del producto (comprador)" })
  deliver(@Param("id", new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    return this.ordersService.deliver(id, (req.user as any).id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancelar orden (comprador o vendedor)" })
  cancel(@Param("id", new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    return this.ordersService.cancel(id, (req.user as any).id);
  }
}
