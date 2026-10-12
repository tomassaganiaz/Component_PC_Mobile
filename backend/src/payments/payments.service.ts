import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import { Payment, PaymentStatus } from "./payment.entity";
import { OrdersService } from "../orders/orders.service";
import { OrderStatus } from "../orders/order.entity";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly repository: Repository<Payment>,
    private readonly ordersService: OrdersService,
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

    const payment = this.repository.create({
      orderId,
      provider: "mock",
      status: PaymentStatus.PENDING,
      amount: Number(order.total),
      externalId: `mock_${randomUUID()}`,
    });
    const saved = await this.repository.save(payment);

    return {
      paymentId: saved.id,
      provider: saved.provider,
      status: saved.status,
      amount: Number(saved.amount),
      clientSecret: saved.externalId as string,
    };
  }

  /** Confirma el pago (usado por el webhook simulado o por el cliente). */
  async confirm(orderId: string): Promise<{
    payment: Payment;
    orderId: string;
    status: OrderStatus;
  }> {
    const payment = await this.repository.findOne({
      where: { orderId, status: PaymentStatus.PENDING },
      order: { createdAt: "DESC" },
    });
    if (!payment) {
      throw new NotFoundException("No hay un pago pendiente para esta orden");
    }

    const order = await this.ordersService.findOne(orderId);

    payment.status = PaymentStatus.SUCCEEDED;
    await this.repository.save(payment);

    const paidOrder = await this.ordersService.pay(orderId, order.buyerId);

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
    payment.status = PaymentStatus.REFUNDED;
    return this.repository.save(payment);
  }
}
