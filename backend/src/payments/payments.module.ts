import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "./payment.entity";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { OrdersModule } from "../orders/orders.module";
import { PAYMENT_PROVIDER } from "./providers/payment-provider.interface";
import { MockPaymentProvider } from "./providers/mock-payment.provider";

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // Para integrar una pasarela real: reemplazar por el nuevo provider.
    { provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
