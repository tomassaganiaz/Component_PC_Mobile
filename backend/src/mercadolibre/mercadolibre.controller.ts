import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  UseGuards,
  Request,
  Post,
  Param,
  Body,
  Put,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { Request as ExpressRequest, Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiHeader, ApiQuery } from "@nestjs/swagger";
import { MercadoLibreService } from "./mercadolibre.service";
import { MlImportService } from "./ml-import.service";
import { MlWebhookRetryService } from "./ml-webhook-retry.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Logger } from "@nestjs/common";

@ApiTags("Mercado Libre")
@Controller("mercadolibre")
export class MercadoLibreController {
  private readonly logger = new Logger("MercadoLibreWebhook");
  constructor(
    private readonly service: MercadoLibreService,
    private readonly importService: MlImportService,
    private readonly webhookRetry: MlWebhookRetryService,
  ) {
    this.service.setImportService(importService);
  }

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
  sales(
    @Request() req: ExpressRequest,
    @Query("offset") offset?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.getSales((req.user as any).id, {
      offset: offset ? parseInt(offset, 10) : 0,
      limit: limit ? Math.min(parseInt(limit, 10), 200) : 50,
    });
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Desconectar Mercado Libre" })
  async disconnect(@Request() req: ExpressRequest) {
    await this.service.disconnect((req.user as any).id);
    return { success: true };
  }

  @Post("publish/:productId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Publicar producto en Mercado Libre" })
  @ApiParam({ name: "productId", description: "ID del producto local a publicar" })
  async publish(
    @Request() req: ExpressRequest,
    @Param("productId") productId: string,
  ) {
    return this.service.publishItem((req.user as any).id, productId);
  }

  @Post("import-sales")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Importar ventas de ML como órdenes locales (escrow/wallet/shipping)" })
  async importSales(@Request() req: ExpressRequest) {
    return this.importService.importSales((req.user as any).id);
  }

  @Put("items/:mlItemId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar publicación en ML (precio, stock, estado)" })
  @ApiParam({ name: "mlItemId", description: "ID del item en Mercado Libre (ej: MLA123456789)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        price: { type: "number", example: 450.0 },
        available_quantity: { type: "integer", example: 5 },
        status: { type: "string", enum: ["active", "paused", "closed"], example: "active" },
      },
    },
  })
  async updateItem(
    @Request() req: ExpressRequest,
    @Param("mlItemId") mlItemId: string,
    @Body() body: { price?: number; available_quantity?: number; status?: "active" | "paused" | "closed" },
  ) {
    return this.service.updateItem((req.user as any).id, mlItemId, body);
  }

  @Get("items/:mlItemId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener detalle de una publicación en ML" })
  @ApiParam({ name: "mlItemId", description: "ID del item en Mercado Libre" })
  async getItem(
    @Request() req: ExpressRequest,
    @Param("mlItemId") mlItemId: string,
  ) {
    return this.service.getItem((req.user as any).id, mlItemId);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Webhook de notificaciones de Mercado Libre (público)" })
  @ApiHeader({ name: "x-meli-signature", description: "Firma HMAC-SHA256 de ML (opcional)" })
  async webhook(
    @Headers("x-meli-signature") signature: string,
    @Query("topic") topic: string,
    @Query("resource") resource: string,
    @Query("user_id") userId: string,
    @Req() req: ExpressRequest,
  ) {
    const rawBody = JSON.stringify(req.body ?? {});
    this.logger.log(`Webhook ML: topic=${topic} resource=${resource} user_id=${userId}`);
    if (!topic || !resource || !userId) {
      return { processed: false, message: "Missing required query params: topic, resource, user_id" };
    }
    
    // Encolar para procesamiento asíncrono con retry logic
    const webhookId = await this.webhookRetry.enqueueWebhook({
      topic,
      resource,
      userId,
      signature,
      rawBody,
      receivedAt: new Date(),
    });
    
    return { 
      processed: false, 
      message: "Webhook encolado para procesamiento asíncrono", 
      webhookId 
    };
  }

  @Post("subscriptions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Suscribir tópicos de notificación en ML (programático)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        topics: {
          type: "array",
          items: { type: "string", enum: ["orders_v2", "orders", "payments", "shipments", "questions", "claims"] },
          example: ["orders_v2", "payments", "shipments"],
        },
      },
    },
  })
  async subscribe(
    @Request() req: ExpressRequest,
    @Body() body: { topics?: string[] },
  ) {
    return this.service.subscribeTopics((req.user as any).id, body.topics);
  }

  @Get("subscriptions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar suscripciones activas en ML" })
  async listSubscriptions(@Request() req: ExpressRequest) {
    return this.service.listSubscriptions((req.user as any).id);
  }

  @Delete("subscriptions/:topic")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar suscripción a un tópico en ML" })
  @ApiParam({ name: "topic", description: "Tópico a desuscribir (ej: orders_v2)" })
  async unsubscribe(
    @Request() req: ExpressRequest,
    @Param("topic") topic: string,
  ) {
    await this.service.unsubscribeTopic((req.user as any).id, topic);
    return { success: true };
  }

  @Get("category-attributes/:category")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Ver atributos requeridos/opcionales de una categoría ML" })
  @ApiParam({ name: "category", description: "Categoría local (cpu, gpu, ram, storage, motherboard, psu, case, cooling, monitor, keyboard, mouse, phone, tablet, laptop, other)" })
  async categoryAttributes(@Request() req: ExpressRequest, @Param("category") category: string) {
    return this.service.getCategoryAttributesForLocal(category);
  }

  @Get("webhook/health")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Métricas de salud del sistema de webhooks" })
  async webhookHealth() {
    return this.webhookRetry.getWebhookHealth();
  }

  @Get("webhook/dead-letter")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar webhooks en Dead Letter Queue" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Límite (default 50)" })
  @ApiQuery({ name: "offset", required: false, type: Number, description: "Offset (default 0)" })
  async listDeadLetter(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const l = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const o = offset ? parseInt(offset, 10) : 0;
    return this.webhookRetry.listDeadLetter(l, o);
  }

  @Post("webhook/dead-letter/:id/replay")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reprocesar un webhook de Dead Letter Queue" })
  @ApiParam({ name: "id", description: "ID del registro en Dead Letter Queue" })
  async replayDeadLetter(@Param("id") id: string) {
    const success = await this.webhookRetry.replayDeadLetter(id);
    return { success, message: success ? "Re-enviado para procesamiento" : "No se pudo re-procesar" };
  }
}
