import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { ProductsService } from '../products/products.service';

const RETURN_WINDOW_DAYS = 10;
const COVERAGE_DAYS = 45;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly productsService: ProductsService,
  ) {}

  async create(createOrderDto: CreateOrderDto, buyerId: string): Promise<Order> {
    const product = await this.productsService.findOne(createOrderDto.productId);

    if (product.status === 'sold') {
      throw new BadRequestException('El producto ya fue vendido');
    }

    const order = this.orderRepository.create({
      ...createOrderDto,
      buyerId,
      total: product.price,
      status: OrderStatus.IN_CUSTODY,
      custodyStartDate: new Date(),
    });

    const savedOrder = await this.orderRepository.save(order);

    await this.productsService.update(product.id, { status: 'sold' as any });

    return savedOrder;
  }

  private daysLeft(from: Date, until: Date): number {
    return Math.max(0, Math.ceil((until.getTime() - from.getTime()) / MS_PER_DAY));
  }

  async getProtection(orderId: string): Promise<Record<string, unknown>> {
    const order = await this.findOne(orderId);
    const now = new Date();
    const escrowUntil = new Date(order.createdAt.getTime() + RETURN_WINDOW_DAYS * MS_PER_DAY);
    const coverageUntil = new Date(order.createdAt.getTime() + COVERAGE_DAYS * MS_PER_DAY);

    return {
      orderId,
      status: order.status,
      total: order.total,
      escrowUntil,
      coverageUntil,
      returnWindowOpen: now <= escrowUntil,
      returnDaysLeft: this.daysLeft(now, escrowUntil),
      coverageActive: now <= coverageUntil,
      coverageDaysLeft: this.daysLeft(now, coverageUntil),
      rules: {
        returnWindowDays: RETURN_WINDOW_DAYS,
        coverageDays: COVERAGE_DAYS,
        returnPolicy:
          'El dinero de la compra queda paralizado durante 10 días. Durante ese plazo podés solicitar la devolución. Pasados los 10 días ya no se aceptan devoluciones, pero la cobertura de la empresa sigue activa.',
        coveragePolicy:
          'La cobertura de TechShield llega hasta 45 días desde la compra: un técnico de la empresa puede revisar o reparar el producto en tu domicilio.',
        damagePolicy:
          'Si el producto devuelto presenta daños que no estaban antes de la compra, el comprador o la empresa se hacen cargo de los daños según la evaluación del laboratorio.',
      },
    };
  }

  async requestReturn(orderId: string, buyerId: string, reason: string): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Esta orden no te pertenece');
    }

    const refundable = [OrderStatus.PAID, OrderStatus.IN_CUSTODY, OrderStatus.DELIVERED];
    if (!refundable.includes(order.status)) {
      throw new BadRequestException('Esta orden no puede devolverse');
    }

    const protection = await this.getProtection(orderId);
    if (!protection.returnWindowOpen) {
      throw new BadRequestException(
        'La ventana de devolución de 10 días ya venció. Podés solicitar cobertura de la empresa (hasta 45 días).',
      );
    }

    order.status = OrderStatus.REFUNDED;
    order.cancellationReason = reason || 'Devolución solicitada por el comprador';
    order.custodyEndDate = new Date();
    const saved = await this.orderRepository.save(order);

    // El producto vuelve al laboratorio: se le hacen revisiones y testeo antes de revenderlo
    await this.productsService.update(order.productId, {
      status: 'published' as any,
      verified: false,
    });

    return saved;
  }

  async requestCoverage(orderId: string, buyerId: string): Promise<Record<string, unknown>> {
    const order = await this.findOne(orderId);

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Esta orden no te pertenece');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('La cobertura aplica solo a productos entregados');
    }

    const protection = await this.getProtection(orderId);
    if (!protection.coverageActive) {
      throw new BadRequestException('La cobertura de la empresa (45 días) ya venció');
    }

    return {
      ticketId: `COV-${order.id.slice(0, 8).toUpperCase()}`,
      orderId,
      message:
        'Solicitud de cobertura registrada. Un técnico de TechShield se contactará para revisar o reparar el producto.',
      coverageDaysLeft: protection.coverageDaysLeft,
      coverageUntil: protection.coverageUntil,
    };
  }

  async findByBuyer(buyerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { buyerId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['buyer', 'product'],
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    Object.assign(order, updateOrderDto);
    return this.orderRepository.save(order);
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Solo se pueden cancelar órdenes pendientes');
    }

    order.status = OrderStatus.CANCELLED;
    await this.productsService.update(order.productId, { status: 'published' as any });

    return this.orderRepository.save(order);
  }
}
