import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ShippingService } from "./shipping.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Shipping")
@Controller("shipping")
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get("quote")
  @ApiOperation({ summary: "Cotizar opciones de envío (mock)" })
  quote(@Query("subtotal") subtotal?: string) {
    return this.shippingService.quote(Number(subtotal) || 0);
  }

  @Get("order/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Envío y tracking de una orden" })
  getByOrder(@Param("orderId", new ParseUUIDPipe()) orderId: string) {
    return this.shippingService.getByOrder(orderId);
  }

  @Get("order/:orderId/tracking")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Ubicación del paquete y ETA (Google Maps / simulado)",
  })
  getTracking(@Param("orderId", new ParseUUIDPipe()) orderId: string) {
    return this.shippingService.getTracking(orderId);
  }
}
