import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import { User, UserRole } from "../users/user.entity";
import {
  Product,
  ProductCategory,
  ProductCondition,
  ProductStatus,
} from "../products/product.entity";
import {
  Order,
  OrderFulfillmentStage,
  OrderStatus,
} from "../orders/order.entity";
import { OrderItemEntity } from "../orders/order-item.entity";
import {
  MercadoLibreService,
  MlSale,
  MlSaleItem,
} from "./mercadolibre.service";

/** Marca que identifica los productos espejo creados por la importación. */
const ML_PRODUCT_MARKER = "[ML-IMPORT:";
const IMPORT_ALIAS_DOMAIN = "mercadolibre.local";

export interface MlImportResult {
  source: "mercadolibre" | "mock" | "not_connected";
  total: number;
  imported: number;
  skipped: number;
}

/**
 * Importa ventas reales de Mercado Libre como órdenes de TechShield.
 *
 * Como las ventas de ML no traen los IDs internos, se crean "registros espejo":
 * un comprador (usuario) y un producto por ítem, de modo que la orden respeta
 * las claves foráneas y aparece en "Mis ventas" del vendedor. La importación es
 * idempotente: no vuelve a crear órdenes ya importadas.
 */
@Injectable()
export class MlImportService {
  private readonly logger = new Logger("MlImport");

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepository: Repository<OrderItemEntity>,
    private readonly mercadoLibre: MercadoLibreService,
  ) {}

  async importSales(userId: string): Promise<MlImportResult> {
    const { source, sales } = await this.mercadoLibre.getSales(userId);

    if (source === "not_connected" || sales.length === 0) {
      return { source, total: sales.length, imported: 0, skipped: 0 };
    }

    let imported = 0;
    let skipped = 0;

    for (const sale of sales) {
      try {
        const existed = await this.importOne(userId, sale);
        if (existed) {
          skipped++;
        } else {
          imported++;
        }
      } catch (err) {
        this.logger.warn(
          `No se pudo importar la venta ${sale.id}: ${String(err)}`,
        );
        skipped++;
      }
    }

    return { source, total: sales.length, imported, skipped };
  }

  /** Devuelve true si la orden ya existía (no se creó nada). */
  private async importOne(userId: string, sale: MlSale): Promise<boolean> {
    const items = this.saleItems(sale);
    if (items.length === 0) return true;

    const buyer = await this.ensureBuyer(sale);

    const orderItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
    }[] = [];
    for (const item of items) {
      const product = await this.ensureProduct(userId, sale, item);
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    const total =
      Number(sale.total) ||
      orderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    if (await this.orderExists(buyer.id, orderItems, total)) {
      return true;
    }

    const status = this.mapStatus(sale.status);
    // Las ventas de ML ya están pagadas: si el estado es distinto de PENDING,
    // la protección debe correr desde ahora (si no, getProtection las trata
    // como "pendiente de pago" y el cron de expiración las cancelaría).
    const isPaid = status !== OrderStatus.PENDING;
    const order = this.orderRepository.create({
      buyerId: buyer.id,
      total,
      status,
      fulfillmentStage: isPaid
        ? OrderFulfillmentStage.CENTER_RECEPTION
        : OrderFulfillmentStage.AWAITING_PAYMENT,
      custodyStartDate: isPaid ? new Date() : undefined,
      shippingAddress: sale.shippingAddress,
      paymentMethod: sale.paymentMethod,
      productId: orderItems[0]?.productId ?? null,
      items: orderItems,
    });
    await this.orderRepository.save(order);
    return false;
  }

  /** Ítems de la venta; si ML no los trae, se usa el producto principal. */
  private saleItems(sale: MlSale): MlSaleItem[] {
    if (sale.items && sale.items.length > 0) return sale.items;
    if (sale.product) {
      return [
        {
          id: sale.productId,
          productId: sale.productId,
          quantity: 1,
          unitPrice: Number(sale.total),
          product: sale.product,
        },
      ];
    }
    return [];
  }

  private buyerAlias(mlBuyerId: string): string {
    const safe = String(mlBuyerId)
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 80);
    return `ml-buyer-${safe}@${IMPORT_ALIAS_DOMAIN}`;
  }

  private async ensureBuyer(sale: MlSale): Promise<User> {
    const key = sale.buyer?.id ?? `sale-${sale.id}`;
    const email = this.buyerAlias(key);

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) return existing;

    const buyer = this.userRepository.create({
      name: (sale.buyer?.name ?? "Comprador Mercado Libre").slice(0, 100),
      email,
      password: await bcrypt.hash(randomUUID(), 10),
      role: UserRole.BUYER,
    });
    return this.userRepository.save(buyer);
  }

  private async ensureProduct(
    userId: string,
    sale: MlSale,
    item: MlSaleItem,
  ): Promise<Product> {
    const mlItemId = item.productId || item.id || `sale-${sale.id}`;
    const marker = `${ML_PRODUCT_MARKER}${mlItemId}]`;

    const existing = await this.productRepository
      .createQueryBuilder("p")
      .where("p.sellerId = :sellerId", { sellerId: userId })
      .andWhere("p.description LIKE :like", { like: `${marker}%` })
      .getOne();
    if (existing) return existing;

    const title = String(
      item.product?.title ?? sale.product?.title ?? "Producto Mercado Libre",
    ).slice(0, 200);
    const rawImages = (item.product as any)?.images ?? [];
    const images = rawImages
      .map((img: any) => (typeof img === "string" ? img : img?.source))
      .filter(Boolean) as string[];

    const product = this.productRepository.create({
      title,
      description: `${marker} Importado desde Mercado Libre · venta ${sale.id}.`,
      price: Number(item.unitPrice) || Number(sale.total) || 0,
      condition: ProductCondition.USED,
      category: ProductCategory.OTHER,
      status: ProductStatus.SOLD,
      images: images.length > 0 ? images : undefined,
      sellerId: userId,
      stock: 0,
      verified: true,
    });
    return this.productRepository.save(product);
  }

  private signature(
    items: { productId: string; quantity: number; unitPrice: number }[],
    total: number,
  ): string {
    const parts = items
      .map(
        (i) => `${i.productId}:${i.quantity}:${Number(i.unitPrice).toFixed(2)}`,
      )
      .sort();
    return `${parts.join("|")}#${total.toFixed(2)}`;
  }

  private async orderExists(
    buyerId: string,
    items: { productId: string; quantity: number; unitPrice: number }[],
    total: number,
  ): Promise<boolean> {
    const existing = await this.orderRepository.find({
      where: { buyerId },
      relations: ["items"],
    });
    const target = this.signature(items, total);
    return existing.some(
      (o) =>
        this.signature(
          (o.items ?? []).map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
          Number(o.total),
        ) === target,
    );
  }

  private mapStatus(status: string): OrderStatus {
    switch (status) {
      case "paid":
        return OrderStatus.PAID;
      case "in_custody":
        return OrderStatus.IN_CUSTODY;
      case "shipped":
        return OrderStatus.SHIPPED;
      case "delivered":
        return OrderStatus.DELIVERED;
      case "cancelled":
        return OrderStatus.CANCELLED;
      case "refunded":
        return OrderStatus.REFUNDED;
      default:
        return OrderStatus.PENDING;
    }
  }
}
