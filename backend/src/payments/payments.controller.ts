import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  BadRequestException,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { PaymentWebhookDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(":orderId/intent")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear intención de pago (comprador)" })
  createIntent(
    @Param("orderId", new ParseUUIDPipe()) orderId: string,
    @Request() req: ExpressRequest,
  ) {
    return this.paymentsService.createIntent(orderId, (req.user as any).id);
  }

  @Post("webhook")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Confirmar el pago de la orden (cliente autenticado)",
  })
  webhook(@Body() dto: PaymentWebhookDto, @Request() req: ExpressRequest) {
    // Solo payment.succeeded confirma pagos: un evento de fallo ya no puede
    // marcar la orden como pagada (antes el campo se ignoraba por completo).
    if (dto.event && dto.event !== "payment.succeeded") {
      throw new BadRequestException(`Evento no soportado: ${dto.event}`);
    }
    // Antes era público: cualquiera que conociera un orderId podía marcar una
    // orden ajena como PAID. Ahora solo el comprador (o un admin).
    const user = req.user as { id: string; role: string };
    return this.paymentsService.confirm(dto.orderId, user);
  }

  @Post(":orderId/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reembolsar el pago (solo admin)" })
  refund(@Param("orderId", new ParseUUIDPipe()) orderId: string) {
    return this.paymentsService.refund(orderId);
  }
}
