import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { MlCredential } from "./ml-credential.entity";
import { MlWebhook } from "./ml-webhook.entity";
import { MlWebhookDeadLetter } from "./ml-webhook.entity";
import { MercadoLibreService } from "./mercadolibre.service";
import { MlImportService } from "./ml-import.service";
import { MlWebhookRetryService } from "./ml-webhook-retry.service";
import { MercadoLibreController } from "./mercadolibre.controller";
import { User } from "../users/user.entity";
import { Product } from "../products/product.entity";
import { Order } from "../orders/order.entity";
import { OrderItemEntity } from "../orders/order-item.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([MlCredential, MlWebhook, MlWebhookDeadLetter, User, Product, Order, OrderItemEntity]),
    ScheduleModule.forRoot(),
  ],
  controllers: [MercadoLibreController],
  providers: [MercadoLibreService, MlImportService, MlWebhookRetryService],
  exports: [MercadoLibreService, MlImportService, MlWebhookRetryService],
})
export class MercadoLibreModule {}
