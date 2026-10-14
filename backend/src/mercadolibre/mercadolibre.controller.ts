import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Request as ExpressRequest, Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MercadoLibreService } from "./mercadolibre.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Mercado Libre")
@Controller("mercadolibre")
export class MercadoLibreController {
  constructor(private readonly service: MercadoLibreService) {}

  @Get("status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Estado de la conexión con Mercado Libre" })
  status(@Request() req: ExpressRequest) {
    return this.service.getStatus((req.user as any).id);
  }

  @Get("auth-url")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "URL de autorización OAuth de Mercado Libre" })
  authUrl(@Request() req: ExpressRequest) {
    return this.service.getAuthUrl((req.user as any).id);
  }

  @Get("callback")
  @ApiOperation({ summary: "Callback OAuth de Mercado Libre" })
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    try {
      await this.service.handleCallback(code, state);
      res
        .status(200)
        .send(
          "<html><body style='font-family:sans-serif;padding:24px'><h2>Mercado Libre conectado ✔</h2><p>Ya podés volver a la app TechShield.</p></body></html>",
        );
    } catch (err) {
      res
        .status(400)
        .send(
          `<html><body style='font-family:sans-serif;padding:24px'><h2>Error</h2><p>${(err as Error).message}</p></body></html>`,
        );
    }
  }

  @Get("sales")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Ventas del vendedor (Mercado Libre / demo)" })
  sales(@Request() req: ExpressRequest) {
    return this.service.getSales((req.user as any).id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Desconectar Mercado Libre" })
  async disconnect(@Request() req: ExpressRequest) {
    await this.service.disconnect((req.user as any).id);
    return { success: true };
  }
}
