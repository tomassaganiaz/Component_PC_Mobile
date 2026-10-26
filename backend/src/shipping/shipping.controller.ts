import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Request,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ShippingService } from "./shipping.service";
import { Order } from "../orders/order.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

type AuthedRequest = ExpressRequest & { user: { id: string; role: string } };

@ApiTags("Shipping")
@Controller("shipping")
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  @Get("quote")
  @ApiOperation({ summary: "Cotizar opciones de envío (mock)" })
  quote(@Query("subtotal") subtotal?: string) {
    return this.shippingService.quote(Number(subtotal) || 0);
  }

  @Get("order/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Envío y tracking de una orden (comprador/vendedor/admin)",
  })
  async getByOrder(
    @Param("orderId", new ParseUUIDPipe()) orderId: string,
    @Request() req: AuthedRequest,
  ) {
    await this.assertCanView(orderId, req);
    return this.shippingService.getByOrder(orderId);
  }

  @Get("order/:orderId/tracking")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Ubicación del paquete y ETA (comprador/vendedor/admin)",
  })
  async getTracking(
    @Param("orderId", new ParseUUIDPipe()) orderId: string,
    @Request() req: AuthedRequest,
  ) {
    await this.assertCanView(orderId, req);
    return this.shippingService.getTracking(orderId);
  }

  /** Solo el comprador, los vendedores de la orden o un admin pueden verlo. */
  private async assertCanView(
    orderId: string,
    req: AuthedRequest,
  ): Promise<void> {
    const user = req.user;
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["product", "items", "items.product"],
    });
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }
    if (user.role === "admin" || order.buyerId === user.id) {
      return;
    }
    const isSeller =
      order.product?.sellerId === user.id ||
      (order.items ?? []).some((i) => i.product?.sellerId === user.id);
    if (!isSeller) {
      throw new ForbiddenException("No podés ver el envío de esta orden");
    }
  }
}
