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
import { ProductsService, ProductWithSecurity } from "../products/products.service";
import { ProductStatus } from "../products/product.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notification.entity";
import { CouponsService } from "../coupons/coupons.service";
import { CartService } from "../cart/cart.service";
import { WalletService } from "../wallets/wallet.service";

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
    private readonly cartService: CartService,
    private readonly walletService: WalletService,
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

    // Variante (opcional): define precio y stock específicos.
    let unitPrice = Number(product.price);
    let variationId: string | null = null;
    if (createOrderDto.variationId) {
      const variation = await this.productsService.findVariation(
        createOrderDto.variationId,
      );
      if (variation.productId !== product.id) {
        throw new BadRequestException(
          "La variación no corresponde al producto",
        );
      }
      variationId = variation.id;
      unitPrice = Number(product.price) + Number(variation.priceDelta);
    }

    // Cupón (opcional): se valida ANTES de reservar stock.
    let total = unitPrice;
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

    // Reserva atómica de stock (variante o producto).
    const remainingStock = variationId
      ? await this.productsService.decrementVariationStock(variationId)
      : await this.productsService.decrementStock(product.id);
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
        productId: product.id,
        items: [
          {
            productId: product.id,
            variationId,
            quantity: 1,
            unitPrice,
          },
        ],
      });

      const savedOrder = await this.orderRepository.save(order);

      // Si se agotó la última unidad del producto (sin variante), queda vendido.
      if (!variationId && remainingStock === 0) {
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
      if (variationId) {
        await this.productsService.incrementVariationStock(variationId);
      } else {
        await this.productsService.incrementStock(product.id);
      }
      throw err;
    }
  }

  /** Genera una orden a partir del carrito del comprador. */
  async createFromCart(
    buyerId: string,
    dto: {
      shippingAddress?: string;
      paymentMethod?: string;
      couponCode?: string;
    },
  ): Promise<Order> {
    const cart = await this.cartService.getCart(buyerId);
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException("El carrito está vacío");
    }

    const itemsData: { product: ProductWithSecurity; quantity: number }[] = [];
    let total = 0;
    for (const item of cart.items) {
      const product = await this.productsService.findOne(item.productId);
      if (product.status === ProductStatus.SOLD) {
        throw new BadRequestException(`"${product.title}" ya fue vendido`);
      }
      if ((product.stock ?? 0) < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.title}"`,
        );
      }
      itemsData.push({ product, quantity: item.quantity });
      total += Number(product.price) * item.quantity;
    }

    let discount = 0;
    let couponCode: string | null = null;
    if (dto.couponCode) {
      const applied = await this.coupons.validate(dto.couponCode, total);
      discount = applied.discount;
      total = applied.finalTotal;
      couponCode = applied.code;
    }

    const reserved: string[] = [];
    try {
      // Reserva atómica de stock por cada unidad.
      for (const { product, quantity } of itemsData) {
        for (let i = 0; i < quantity; i++) {
          const remaining = await this.productsService.decrementStock(
            product.id,
          );
          if (remaining === null) {
            throw new BadRequestException(
              `Stock insuficiente para "${product.title}"`,
            );
          }
          reserved.push(product.id);
          if (remaining === 0) {
            await this.productsService.update(product.id, {
              status: ProductStatus.SOLD,
            } as any);
          }
        }
      }

      const order = this.orderRepository.create({
        buyerId,
        total,
        discount,
        couponCode,
        status: OrderStatus.PENDING,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod,
        items: itemsData.map((d) => ({
          productId: d.product.id,
          quantity: d.quantity,
          unitPrice: Number(d.product.price),
        })),
      });
      const saved = await this.orderRepository.save(order);

      if (couponCode) {
        await this.coupons.redeem(couponCode);
      }
      await this.cartService.clear(buyerId);

      for (const d of itemsData) {
        await this.notifications.create(
          d.product.sellerId,
          NotificationType.SALE,
          "Nueva venta",
          `Tenés una nueva orden por "${d.product.title}".`,
          { orderId: saved.id, productId: d.product.id },
        );
      }

      return saved;
    } catch (err) {
      for (const pid of reserved) {
        await this.productsService.incrementStock(pid);
      }
      throw err;
    }
  }

  /** Restaura el stock de todos los ítems de una orden. */
  private async restoreOrderStock(order: Order): Promise<void> {
    const items =
      order.items && order.items.length > 0
        ? order.items.map((i) => ({
            productId: i.productId,
            variationId: i.variationId,
            quantity: i.quantity,
          }))
        : order.productId
          ? [{ productId: order.productId, variationId: null, quantity: 1 }]
          : [];

    for (const { productId, variationId, quantity } of items) {
      const product = await this.productsService.findOne(productId);
      for (let i = 0; i < quantity; i++) {
        if (variationId) {
          await this.productsService.incrementVariationStock(variationId);
        } else {
          await this.productsService.incrementStock(productId);
        }
      }
      if (!variationId && product.status === ProductStatus.SOLD) {
        await this.productsService.update(productId, {
          status: ProductStatus.PUBLISHED,
        } as any);
      }
    }
  }

  private assertOwner(order: Order, userId: string, relation: 'buyer' | 'seller') {
    const isBuyer = order.buyerId === userId;
    const isSeller =
      order.product?.sellerId === userId ||
      (order.items?.some((i) => i.product?.sellerId === userId) ?? false);
    const allowed = relation === 'buyer' ? isBuyer : isSeller;
    if (!allowed) {
      throw new ForbiddenException(
        relation === 'buyer'
          ? 'Esta orden no te pertenece'
          : 'Solo el vendedor del producto puede gestionar esta orden',
      );
    }
  }

  private orderSellerIds(order: Order): string[] {
    const ids = new Set<string>();
    if (order.product?.sellerId) ids.add(order.product.sellerId);
    order.items?.forEach((i) => {
      if (i.product?.sellerId) ids.add(i.product.sellerId);
    });
    return [...ids];
  }

  private orderTitle(order: Order): string {
    if (order.product?.title) return order.product.title;
    const first = order.items?.[0]?.product?.title;
    const count = order.items?.length ?? 0;
    if (count > 1) return `${first ?? 'producto'} + ${count - 1} más`;
    return first ?? 'tu pedido';
  }

  /** Monto de la orden por vendedor (para acreditar/debitar en la wallet). */
  private sellerShares(order: Order): Map<string, number> {
    const shares = new Map<string, number>();
    order.items?.forEach((i) => {
      const sellerId = i.product?.sellerId;
      if (!sellerId) return;
      shares.set(
        sellerId,
        (shares.get(sellerId) ?? 0) + Number(i.unitPrice) * i.quantity,
      );
    });
    if (shares.size === 0 && order.product?.sellerId) {
      shares.set(order.product.sellerId, Number(order.total));
    }
    return shares;
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

    for (const sellerId of this.orderSellerIds(order)) {
      await this.notifications.create(
        sellerId,
        NotificationType.ORDER_PAID,
        "Venta pagada",
        `El comprador pagó "${this.orderTitle(order)}". Prepará el envío.`,
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
      `Tu pedido "${this.orderTitle(order)}" está en camino.`,
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
      `Confirmaste la recepción de "${this.orderTitle(order)}".`,
      { orderId: order.id },
    );
    for (const sellerId of this.orderSellerIds(order)) {
      await this.notifications.create(
        sellerId,
        NotificationType.ORDER_DELIVERED,
        "Producto entregado",
        `El comprador confirmó la entrega de "${this.orderTitle(order)}".`,
        { orderId: order.id },
      );
    }

    // Libera los fondos: acredita a cada vendedor su parte.
    for (const [sellerId, amount] of this.sellerShares(order)) {
      await this.walletService.credit(
        sellerId,
        amount,
        `Venta entregada · orden #${order.id.slice(0, 8).toUpperCase()}`,
        order.id,
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
    await this.restoreOrderStock(order);
    const productIds = new Set<string>();
    if (order.productId) productIds.add(order.productId);
    order.items?.forEach((i) => productIds.add(i.productId));
    for (const pid of productIds) {
      await this.productsService.update(pid, {
        status: ProductStatus.PUBLISHED,
        verified: false,
      } as any);
    }

    // Reembolso efectivo: debita al vendedor y acredita al comprador.
    for (const [sellerId, amount] of this.sellerShares(order)) {
      await this.walletService.debit(
        sellerId,
        amount,
        `Reembolso · orden #${order.id.slice(0, 8).toUpperCase()}`,
        order.id,
      );
    }
    await this.walletService.credit(
      order.buyerId,
      Number(order.total),
      `Reembolso de compra · orden #${order.id.slice(0, 8).toUpperCase()}`,
      order.id,
    );

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
    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.items", "item")
      .leftJoinAndSelect("item.product", "itemProduct")
      .leftJoinAndSelect("order.product", "product")
      .leftJoinAndSelect("order.buyer", "buyer")
      .where(
        "(itemProduct.sellerId = :sellerId OR product.sellerId = :sellerId)",
        { sellerId },
      )
      .orderBy("order.createdAt", "DESC")
      .getMany();

    // Se expone solo la información necesaria del comprador (sin datos sensibles).
    return orders.map((order) => ({
      id: order.id,
      total: order.total,
      discount: order.discount,
      status: order.status,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      custodyStartDate: order.custodyStartDate,
      custodyEndDate: order.custodyEndDate,
      cancellationReason: order.cancellationReason,
      productId: order.productId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      product: order.product ?? order.items?.[0]?.product ?? null,
      items: (order.items ?? []).map((i) => ({
        id: i.id,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        product: i.product,
      })),
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
      relations: ["product", "items", "items.product"],
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
    const isSeller =
      order.product?.sellerId === userId ||
      (order.items?.some((i) => i.product?.sellerId === userId) ?? false);
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
    await this.restoreOrderStock(order);

    if (isBuyer) {
      for (const sellerId of this.orderSellerIds(order)) {
        await this.notifications.create(
          sellerId,
          NotificationType.ORDER_CANCELLED,
          "Orden cancelada",
          `Se canceló la orden por "${this.orderTitle(order)}".`,
          { orderId: order.id },
        );
      }
    } else {
      await this.notifications.create(
        order.buyerId,
        NotificationType.ORDER_CANCELLED,
        "Orden cancelada",
        `El vendedor canceló la orden por "${this.orderTitle(order)}".`,
        { orderId: order.id },
      );
    }

    return saved;
  }
}
