import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { WalletService } from "./wallet.service";
import { RequestPayoutDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Wallet")
@Controller("wallet")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: "Saldo, movimientos y retiros" })
  getWallet(@Request() req: ExpressRequest) {
    return this.walletService.getWallet((req.user as any).id);
  }

  @Post("payouts")
  @ApiOperation({ summary: "Solicitar un retiro" })
  requestPayout(
    @Body() dto: RequestPayoutDto,
    @Request() req: ExpressRequest,
  ) {
    return this.walletService.requestPayout((req.user as any).id, dto.amount);
  }
}
