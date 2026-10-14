import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
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
  @ApiOperation({
    summary: "Webhook de la pasarela (mock): confirma el pago",
  })
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentsService.confirm(dto.orderId);
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
