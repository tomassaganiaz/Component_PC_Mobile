import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, Between, In } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { MercadoLibreService } from "./mercadolibre.service";
import {
  MlWebhook,
  MlWebhookDeadLetter,
  WebhookStatus,
} from "./ml-webhook.entity";

export interface WebhookPayload {
  topic: string;
  resource: string;
  userId: string;
  signature?: string;
  rawBody?: string;
  receivedAt: Date;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface WebhookHealthMetrics {
  pending: number;
  processing: number;
  completedLast24h: number;
  failedLast24h: number;
  deadLetterCount: number;
  avgProcessingTimeMs: number;
}

@Injectable()
export class MlWebhookRetryService {
  private readonly logger = new Logger(MlWebhookRetryService.name);
  private readonly retryConfig: RetryConfig;

  constructor(
    @InjectRepository(MlWebhook)
    private readonly webhookRepository: Repository<MlWebhook>,
    @InjectRepository(MlWebhookDeadLetter)
    private readonly deadLetterRepository: Repository<MlWebhookDeadLetter>,
    private readonly config: ConfigService,
    private readonly mlService: MercadoLibreService,
  ) {
    this.retryConfig = {
      maxRetries: this.config.get("ML_WEBHOOK_MAX_RETRIES", 5),
      baseDelayMs: this.config.get("ML_WEBHOOK_BASE_DELAY_MS", 1000),
      maxDelayMs: this.config.get("ML_WEBHOOK_MAX_DELAY_MS", 300000),
      backoffMultiplier: this.config.get("ML_WEBHOOK_BACKOFF_MULTIPLIER", 2),
    };
  }

  /**
   * Guarda un webhook entrante para procesamiento asíncrono con reintentos.
   */
  async enqueueWebhook(payload: WebhookPayload): Promise<string> {
    const webhook = this.webhookRepository.create({
      topic: payload.topic,
      resource: payload.resource,
      userId: payload.userId,
      signature: payload.signature,
      rawBody: payload.rawBody,
      status: WebhookStatus.PENDING,
      receivedAt: payload.receivedAt,
      attempts: 0,
      nextRetryAt: payload.receivedAt,
    });

    const saved = await this.webhookRepository.save(webhook);
    this.logger.log(`Webhook encolado: ${saved.id} (${payload.topic})`);

    // Procesar de forma asíncrona (no bloquear el webhook HTTP)
    this.processWithRetry(saved.id).catch((err) => {
      this.logger.error(`Error procesando webhook ${saved.id}: ${String(err)}`);
    });

    return saved.id;
  }

  /**
   * Procesa un webhook con lógica de reintentos exponenciales.
   */
  async processWithRetry(webhookId: string): Promise<void> {
    const webhook = await this.webhookRepository.findOne({
      where: { id: webhookId },
    });
    if (!webhook) {
      this.logger.warn(`Webhook ${webhookId} no encontrado para procesar`);
      return;
    }

    const maxRetries = this.retryConfig.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      webhook.attempts = attempt + 1;
      webhook.status = WebhookStatus.PROCESSING;
      webhook.updatedAt = new Date();
      await this.webhookRepository.save(webhook);

      const startTime = Date.now();

      try {
        this.logger.log(
          `Procesando webhook ${webhook.id} (intento ${attempt + 1}/${maxRetries + 1})`,
        );

        const result = await this.mlService.handleWebhook(
          webhook.topic,
          webhook.resource,
          webhook.userId,
          webhook.signature,
          webhook.rawBody,
        );

        const processingTime = Date.now() - startTime;

        if (result.processed) {
          webhook.status = WebhookStatus.COMPLETED;
          webhook.processingTimeMs = processingTime;
          webhook.updatedAt = new Date();
          await this.webhookRepository.save(webhook);
          this.logger.log(
            `Webhook ${webhook.id} completado en ${processingTime}ms`,
          );
          return;
        }

        // No procesado: una firma inválida es permanente → FAILED (visible en
        // las métricas de salud y la DLQ) en vez de COMPLETED silencioso.
        // El resto de "no procesados" se da por manejado como antes.
        const permanent = result.message === "Invalid signature";
        webhook.status = permanent
          ? WebhookStatus.FAILED
          : WebhookStatus.COMPLETED;
        webhook.lastError = result.message;
        webhook.processingTimeMs = processingTime;
        webhook.updatedAt = new Date();
        await this.webhookRepository.save(webhook);
        return;
      } catch (error) {
        const processingTime = Date.now() - startTime;
        const errorMessage = String(error);
        webhook.lastError = errorMessage;
        webhook.processingTimeMs = processingTime;

        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateBackoff(attempt);
          webhook.nextRetryAt = new Date(Date.now() + delay);
          webhook.updatedAt = new Date();
          await this.webhookRepository.save(webhook);

          this.logger.warn(
            `Webhook ${webhook.id} falló (intento ${attempt + 1}): ${errorMessage}. ` +
              `Reintentando en ${delay}ms...`,
          );

          await this.sleep(delay);
        } else {
          // Dead Letter Queue
          await this.moveToDeadLetterQueue(webhook, errorMessage);
          return;
        }
      }
    }
  }

  private calculateBackoff(attempt: number): number {
    const { baseDelayMs, maxDelayMs, backoffMultiplier } = this.retryConfig;
    const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mueve webhook fallido a Dead Letter Queue.
   */
  private async moveToDeadLetterQueue(
    webhook: MlWebhook,
    errorMessage: string,
  ): Promise<void> {
    webhook.status = WebhookStatus.DEAD_LETTER;
    webhook.lastError = errorMessage;
    webhook.updatedAt = new Date();
    await this.webhookRepository.save(webhook);

    const dlqEntry = this.deadLetterRepository.create({
      originalId: webhook.id,
      topic: webhook.topic,
      resource: webhook.resource,
      userId: webhook.userId,
      signature: webhook.signature,
      rawBody: webhook.rawBody,
      lastError: errorMessage,
      attempts: webhook.attempts,
      receivedAt: webhook.receivedAt,
      movedAt: new Date(),
      originalRecord: {
        id: webhook.id,
        topic: webhook.topic,
        resource: webhook.resource,
        userId: webhook.userId,
        status: webhook.status,
        attempts: webhook.attempts,
        lastError: webhook.lastError,
        receivedAt: webhook.receivedAt,
        createdAt: webhook.createdAt,
      },
    });

    await this.deadLetterRepository.save(dlqEntry);

    this.logger.error(
      `[DLQ] Webhook ${webhook.id} | Topic: ${webhook.topic} | Resource: ${webhook.resource} | ` +
        `User: ${webhook.userId} | Error: ${errorMessage} | Intentos: ${webhook.attempts}`,
    );
  }

  /**
   * Reprocesa un webhook de la Dead Letter Queue.
   */
  async replayDeadLetter(deadLetterId: string): Promise<boolean> {
    const dlqEntry = await this.deadLetterRepository.findOne({
      where: { id: deadLetterId },
    });
    if (!dlqEntry) {
      this.logger.warn(`Dead letter entry ${deadLetterId} no encontrado`);
      return false;
    }

    if (dlqEntry.replayed) {
      this.logger.warn(`Dead letter ${deadLetterId} ya fue re-procesado`);
      return false;
    }

    // Crear nuevo webhook para reprocesar
    const newWebhook = this.webhookRepository.create({
      topic: dlqEntry.topic,
      resource: dlqEntry.resource,
      userId: dlqEntry.userId,
      signature: dlqEntry.signature,
      rawBody: dlqEntry.rawBody,
      status: WebhookStatus.PENDING,
      receivedAt: dlqEntry.receivedAt,
      attempts: 0,
      nextRetryAt: new Date(),
    });

    const saved = await this.webhookRepository.save(newWebhook);

    // Marcar DLQ como re-procesado
    dlqEntry.replayed = true;
    dlqEntry.replayedAt = new Date();
    await this.deadLetterRepository.save(dlqEntry);

    // Procesar asíncrono
    this.processWithRetry(saved.id).catch((err) => {
      this.logger.error(`Error en replay de ${saved.id}: ${String(err)}`);
    });

    this.logger.log(
      `Dead letter ${deadLetterId} re-enviado como webhook ${saved.id}`,
    );
    return true;
  }

  /**
   * Limpia webhooks procesados antiguos (cron diario).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: "cleanup-old-webhooks",
    timeZone: "America/Argentina/Buenos_Aires",
  })
  async cleanupOldWebhooks(): Promise<void> {
    const retentionDays = this.config.get("ML_WEBHOOK_RETENTION_DAYS", 30);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const dlqRetentionDays = this.config.get(
      "ML_WEBHOOK_DLQ_RETENTION_DAYS",
      90,
    );
    const dlqCutoffDate = new Date();
    dlqCutoffDate.setDate(dlqCutoffDate.getDate() - dlqRetentionDays);

    this.logger.log(
      `Limpiando webhooks completados anteriores a ${cutoffDate.toISOString()}`,
    );

    // Borrar webhooks completados antiguos
    const deletedWebhooks = await this.webhookRepository
      .createQueryBuilder()
      .delete()
      .where("status = :status", { status: WebhookStatus.COMPLETED })
      .andWhere("createdAt < :cutoff", { cutoff: cutoffDate })
      .execute();

    // Borrar DLQ antiguas
    const deletedDlq = await this.deadLetterRepository
      .createQueryBuilder()
      .delete()
      .where("movedAt < :cutoff", { cutoff: dlqCutoffDate })
      .execute();

    this.logger.log(
      `Limpieza completada: ${deletedWebhooks.affected} webhooks, ${deletedDlq.affected} DLQ eliminados`,
    );
  }

  /**
   * Procesa webhooks pendientes de reintento (cron cada 5 min).
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: "process-webhook-retries",
    timeZone: "America/Argentina/Buenos_Aires",
  })
  async processPendingRetries(): Promise<void> {
    const pending = await this.webhookRepository.find({
      where: {
        status: In([WebhookStatus.PENDING, WebhookStatus.PROCESSING]),
        nextRetryAt: LessThan(new Date()),
      },
      order: { nextRetryAt: "ASC" },
      take: 50, // procesar en lotes
    });

    if (pending.length === 0) return;

    this.logger.log(
      `Procesando ${pending.length} webhooks pendientes de reintento`,
    );

    for (const webhook of pending) {
      // Evitar procesar el mismo webhook concurrentemente
      const lockResult = await this.webhookRepository
        .createQueryBuilder()
        .update()
        .set({ status: WebhookStatus.PROCESSING, updatedAt: new Date() })
        .where("id = :id AND status IN (:...statuses)", {
          id: webhook.id,
          statuses: [WebhookStatus.PENDING, WebhookStatus.PROCESSING],
        })
        .execute();

      if (lockResult.affected === 0) continue; // Ya fue tomado por otro proceso

      this.processWithRetry(webhook.id).catch((err) => {
        this.logger.error(`Error en retry de ${webhook.id}: ${String(err)}`);
      });
    }
  }

  /**
   * Métricas de salud del sistema de webhooks.
   */
  async getWebhookHealth(): Promise<WebhookHealthMetrics> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      pending,
      processing,
      completedLast24h,
      failedLast24h,
      deadLetterCount,
      avgTimeResult,
    ] = await Promise.all([
      this.webhookRepository.count({
        where: { status: WebhookStatus.PENDING },
      }),
      this.webhookRepository.count({
        where: { status: WebhookStatus.PROCESSING },
      }),
      this.webhookRepository.count({
        where: {
          status: WebhookStatus.COMPLETED,
          createdAt: Between(last24h, new Date()),
        },
      }),
      this.webhookRepository.count({
        where: {
          status: In([WebhookStatus.FAILED, WebhookStatus.DEAD_LETTER]),
          createdAt: Between(last24h, new Date()),
        },
      }),
      this.deadLetterRepository.count(),
      this.webhookRepository
        .createQueryBuilder("w")
        .select("AVG(w.processingTimeMs)", "avg")
        .where("w.status = :status", { status: WebhookStatus.COMPLETED })
        .andWhere("w.createdAt > :last24h", { last24h })
        .getRawOne(),
    ]);

    return {
      pending,
      processing,
      completedLast24h,
      failedLast24h,
      deadLetterCount,
      avgProcessingTimeMs: Math.round(Number(avgTimeResult?.avg) || 0),
    };
  }

  async listDeadLetter(
    limit: number = 50,
    offset: number = 0,
  ): Promise<MlWebhookDeadLetter[]> {
    return this.deadLetterRepository.find({
      order: { movedAt: "DESC" },
      take: limit,
      skip: offset,
    });
  }
}
