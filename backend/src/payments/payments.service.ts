import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment, PaymentStatus } from "./payment.entity";
import { OrdersService } from "../orders/orders.service";
import { OrderStatus } from "../orders/order.entity";
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from "./providers/payment-provider.interface";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly repository: Repository<Payment>,
    private readonly ordersService: OrdersService,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProvider,
  ) {}

  /** Crea una intención de pago (mock) para una orden pendiente. */
  async createIntent(
    orderId: string,
    buyerId: string,
  ): Promise<{
    paymentId: string;
    provider: string;
    status: PaymentStatus;
    amount: number;
    clientSecret: string;
  }> {
    const order = await this.ordersService.findOne(orderId);
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException("Esta orden no te pertenece");
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("La orden no está pendiente de pago");
    }

    const result = await this.provider.createPayment(Number(order.total), {
      orderId,
    });

    const payment = this.repository.create({
      orderId,
      provider: this.provider.name,
      status: PaymentStatus.PENDING,
      amount: Number(order.total),
      externalId: result.externalId,
    });
    const saved = await this.repository.save(payment);

    return {
      paymentId: saved.id,
      provider: saved.provider,
      status: saved.status,
      amount: Number(saved.amount),
      clientSecret: result.clientSecret,
    };
  }

  /** Confirma el pago (usado por el webhook simulado o por el cliente). */
  async confirm(
    orderId: string,
    requester: { id: string; role: string },
  ): Promise<{
    payment: Payment;
    orderId: string;
    status: OrderStatus;
  }> {
    const order = await this.ordersService.findOne(orderId);
    if (order.buyerId !== requester.id && requester.role !== "admin") {
      throw new ForbiddenException("Esta orden no te pertenece");
    }

    const payment = await this.repository.findOne({
      where: { orderId, status: PaymentStatus.PENDING },
      order: { createdAt: "DESC" },
    });
    if (!payment) {
      throw new NotFoundException("No hay un pago pendiente para esta orden");
    }

    // El pago recién queda SUCCEEDED si pay() tuvo éxito: antes un fallo de
    // pay() (ej: sin stock) dejaba un cobro fantasma marcado como exitoso.
    const paidOrder = await this.ordersService.pay(orderId, order.buyerId);

    payment.status = PaymentStatus.SUCCEEDED;
    await this.repository.save(payment);

    return { payment, orderId, status: paidOrder.status };
  }

  /** Marca el pago como reembolsado. */
  async refund(orderId: string): Promise<Payment> {
    const payment = await this.repository.findOne({
      where: { orderId, status: PaymentStatus.SUCCEEDED },
      order: { createdAt: "DESC" },
    });
    if (!payment) {
      throw new NotFoundException("No hay un pago confirmado para reembolsar");
    }
    if (payment.externalId) {
      await this.provider.refund(payment.externalId);
    }
    payment.status = PaymentStatus.REFUNDED;
    return this.repository.save(payment);
  }
}
