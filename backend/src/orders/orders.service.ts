import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "./order.entity";
import { CreateOrderDto, UpdateOrderDto } from "./dto";
import { ProductsService } from "../products/products.service";
import { ProductStatus } from "../products/product.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification.entity";
import { CouponsService } from "../coupons/coupons.service";

const RETURN_WINDOW_DAYS = 10;
const COVERAGE_DAYS = 45;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly productsService: ProductsService,
    private readonly notifications: NotificationsService,
    private readonly coupons: CouponsService,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    buyerId: string,
  ): Promise<Order> {
    const product = await this.productsService.findOne(
      createOrderDto.productId,
    );

    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException("El producto ya fue vendido");
    }

    // Cupón (opcional): se valida ANTES de reservar stock.
    let total = Number(product.price);
    let discount = 0;
    let couponCode: string | null = null;
    if (createOrderDto.couponCode) {
      const applied = await this.coupons.validate(
        createOrderDto.couponCode,
        total,
      );
      discount = applied.discount;
      total = applied.finalTotal;
      couponCode = applied.code;
    }

    // Reserva atómica de stock: si no hay disponible, se rechaza la compra.
    const remainingStock = await this.productsService.decrementStock(
      product.id,
    );
    if (remainingStock === null) {
      throw new BadRequestException("El producto no tiene stock disponible");
    }

    try {
      const order = this.orderRepository.create({
        ...createOrderDto,
        buyerId,
        total,
        discount,
        couponCode,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await this.orderRepository.save(order);

      // Si se agotó la última unidad, el producto queda marcado como vendido.
      if (remainingStock === 0) {
        await this.productsService.update(product.id, {
          status: ProductStatus.SOLD,
        } as any);
      }

      if (couponCode) {
        await this.coupons.redeem(couponCode);
      }

      await this.notifications.create(
        product.sellerId,
        NotificationType.SALE,
        "Nueva venta",
        `Tenés una nueva orden por "${product.title}".`,
        { orderId: savedOrder.id, productId: product.id },
      );

      return savedOrder;
    } catch (err) {
      // Compensación: devuelve la unidad reservada si la orden no se pudo crear.
      await this.productsService.incrementStock(product.id);
      throw err;
    }
  }

  /** Restaura una unidad de stock y reabre el producto si estaba vendido. */
  private async restoreStock(productId: string): Promise<void> {
    const product = await this.productsService.findOne(productId);
    await this.productsService.incrementStock(productId);
    if (product.status === ProductStatus.SOLD) {
      await this.productsService.update(productId, {
        status: ProductStatus.PUBLISHED,
      } as any);
    }
  }

  private assertOwner(order: Order, userId: string, relation: 'buyer' | 'seller') {
    const isBuyer = order.buyerId === userId;
    const isSeller = order.product?.sellerId === userId;
    const allowed = relation === 'buyer' ? isBuyer : isSeller;
    if (!allowed) {
      throw new ForbiddenException(
        relation === 'buyer'
          ? 'Esta orden no te pertenece'
          : 'Solo el vendedor del producto puede gestionar esta orden',
      );
    }
  }

  /** Confirma el pago del comprador y deja los fondos en custodia. */
  async pay(orderId: string, buyerId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    this.assertOwner(order, buyerId, 'buyer');

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('La orden no está pendiente de pago');
    }

    order.status = OrderStatus.PAID;
    order.custodyStartDate = new Date();
    const saved = await this.orderRepository.save(order);

    if (order.product?.sellerId) {
      await this.notifications.create(
        order.product.sellerId,
        NotificationType.ORDER_PAID,
        "Venta pagada",
        `El comprador pagó "${order.product.title}". Prepará el envío.`,
        { orderId: order.id },
      );
    }

    return saved;
  }

  /** El vendedor marca el producto como enviado. */
  async ship(orderId: string, sellerId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    this.assertOwner(order, sellerId, 'seller');

    const shippable = [OrderStatus.PAID, OrderStatus.IN_CUSTODY];
    if (!shippable.includes(order.status)) {
      throw new BadRequestException(
        'Solo se pueden enviar órdenes pagadas y en custodia',
      );
    }

    order.status = OrderStatus.SHIPPED;
    const saved = await this.orderRepository.save(order);

    await this.notifications.create(
      order.buyerId,
      NotificationType.ORDER_SHIPPED,
      "Pedido enviado",
      `Tu pedido "${order.product?.title ?? ""}" está en camino.`,
      { orderId: order.id },
    );

    return saved;
  }

  /** El comprador confirma la recepción del producto. */
  async deliver(orderId: string, buyerId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    this.assertOwner(order, buyerId, 'buyer');

    if (order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException('Solo se pueden recibir órdenes enviadas');
    }

    order.status = OrderStatus.DELIVERED;
    order.custodyEndDate = new Date();
    const saved = await this.orderRepository.save(order);

    await this.notifications.create(
      order.buyerId,
      NotificationType.ORDER_DELIVERED,
      "Entrega confirmada",
      `Confirmaste la recepción de "${order.product?.title ?? "tu pedido"}".`,
      { orderId: order.id },
    );
    if (order.product?.sellerId) {
      await this.notifications.create(
        order.product.sellerId,
        NotificationType.ORDER_DELIVERED,
        "Producto entregado",
        `El comprador confirmó la entrega de "${order.product.title}".`,
        { orderId: order.id },
      );
    }

    return saved;
  }

  private daysLeft(from: Date, until: Date): number {
    return Math.max(
      0,
      Math.ceil((until.getTime() - from.getTime()) / MS_PER_DAY),
    );
  }

  async getProtection(orderId: string): Promise<Record<string, unknown>> {
    const order = await this.findOne(orderId);
    const now = new Date();
    const escrowUntil = new Date(
      order.createdAt.getTime() + RETURN_WINDOW_DAYS * MS_PER_DAY,
    );
    const coverageUntil = new Date(
      order.createdAt.getTime() + COVERAGE_DAYS * MS_PER_DAY,
    );

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
          "El dinero de la compra queda paralizado durante 10 días. Durante ese plazo podés solicitar la devolución. Pasados los 10 días ya no se aceptan devoluciones, pero la cobertura de la empresa sigue activa.",
        coveragePolicy:
          "La cobertura de TechShield llega hasta 45 días desde la compra: un técnico de la empresa puede revisar o reparar el producto en tu domicilio.",
        damagePolicy:
          "Si el producto devuelto presenta daños que no estaban antes de la compra, el comprador o la empresa se hacen cargo de los daños según la evaluación del laboratorio.",
      },
    };
  }

  async requestReturn(
    orderId: string,
    buyerId: string,
    reason: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException("Esta orden no te pertenece");
    }

    const refundable = [
      OrderStatus.PAID,
      OrderStatus.IN_CUSTODY,
      OrderStatus.DELIVERED,
    ];
    if (!refundable.includes(order.status)) {
      throw new BadRequestException("Esta orden no puede devolverse");
    }

    const protection = await this.getProtection(orderId);
    if (!protection.returnWindowOpen) {
      throw new BadRequestException(
        "La ventana de devolución de 10 días ya venció. Podés solicitar cobertura de la empresa (hasta 45 días).",
      );
    }

    order.status = OrderStatus.REFUNDED;
    order.cancellationReason =
      reason || "Devolución solicitada por el comprador";
    order.custodyEndDate = new Date();
    const saved = await this.orderRepository.save(order);

    // El producto vuelve al laboratorio: se le hacen revisiones y testeo antes de revenderlo
    await this.restoreStock(order.productId);
    await this.productsService.update(order.productId, {
      status: ProductStatus.PUBLISHED,
      verified: false,
    } as any);

    return saved;
  }

  async requestCoverage(
    orderId: string,
    buyerId: string,
  ): Promise<Record<string, unknown>> {
    const order = await this.findOne(orderId);

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException("Esta orden no te pertenece");
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        "La cobertura aplica solo a productos entregados",
      );
    }

    const protection = await this.getProtection(orderId);
    if (!protection.coverageActive) {
      throw new BadRequestException(
        "La cobertura de la empresa (45 días) ya venció",
      );
    }

    return {
      ticketId: `COV-${order.id.slice(0, 8).toUpperCase()}`,
      orderId,
      message:
        "Solicitud de cobertura registrada. Un técnico de TechShield se contactará para revisar o reparar el producto.",
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

  async findBySeller(sellerId: string): Promise<Record<string, unknown>[]> {
    const orders = await this.orderRepository.find({
      where: { product: { sellerId } },
      relations: ['product', 'buyer'],
      order: { createdAt: 'DESC' },
    });

    // Se expone solo la información necesaria del comprador (sin datos sensibles).
    return orders.map((order) => ({
      id: order.id,
      total: order.total,
      status: order.status,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      custodyStartDate: order.custodyStartDate,
      custodyEndDate: order.custodyEndDate,
      cancellationReason: order.cancellationReason,
      productId: order.productId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      product: order.product,
      buyer: order.buyer
        ? {
            id: order.buyer.id,
            name: order.buyer.name,
            email: order.buyer.email,
          }
        : null,
    }));
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ["product"],
    });

    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    Object.assign(order, updateOrderDto);
    return this.orderRepository.save(order);
  }

  async cancel(id: string, userId: string): Promise<Order> {
    const order = await this.findOne(id);

    const isBuyer = order.buyerId === userId;
    const isSeller = order.product?.sellerId === userId;
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException("Esta orden no te pertenece");
    }

    const cancellable = [OrderStatus.PENDING, OrderStatus.PAID];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(
        "Solo se pueden cancelar órdenes pendientes o pagadas",
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.custodyEndDate = new Date();
    const saved = await this.orderRepository.save(order);
    await this.restoreStock(order.productId);

    const counterpart = isBuyer ? order.product?.sellerId : order.buyerId;
    if (counterpart) {
      await this.notifications.create(
        counterpart,
        NotificationType.ORDER_CANCELLED,
        "Orden cancelada",
        `Se canceló la orden por "${order.product?.title ?? "un producto"}".`,
        { orderId: order.id },
      );
    }

    return saved;
  }
}
