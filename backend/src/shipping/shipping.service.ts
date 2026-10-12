import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import {
  Shipment,
  ShipmentService,
  ShipmentStatus,
} from "./shipment.entity";

export interface ShippingQuoteOption {
  service: ShipmentService;
  carrier: string;
  cost: number;
  estimatedDays: number;
  free: boolean;
}

const FREE_SHIPPING_THRESHOLD = 50000;

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(Shipment)
    private readonly repository: Repository<Shipment>,
  ) {}

  /**
   * Cotización (mock). El umbral de envío gratis simula la lógica de ML:
   * compras grandes acceden a envío sin costo.
   */
  quote(subtotal = 0): { options: ShippingQuoteOption[] } {
    const freeStandard = subtotal >= FREE_SHIPPING_THRESHOLD;
    const options: ShippingQuoteOption[] = [
      {
        service: ShipmentService.STANDARD,
        carrier: "Andreani",
        cost: freeStandard ? 0 : 1500,
        estimatedDays: 5,
        free: freeStandard,
      },
      {
        service: ShipmentService.EXPRESS,
        carrier: "OCA",
        cost: 3200,
        estimatedDays: 2,
        free: false,
      },
      {
        service: ShipmentService.PICKUP,
        carrier: "Colecta",
        cost: 0,
        estimatedDays: 4,
        free: true,
      },
    ];
    return { options };
  }

  private optionFor(service: ShipmentService): ShippingQuoteOption {
    const { options } = this.quote(0);
    return (
      options.find((o) => o.service === service) ??
      (options[0] as ShippingQuoteOption)
    );
  }

  /** Crea el envío (tracking) al despachar la orden. */
  async createForOrder(
    orderId: string,
    service: ShipmentService = ShipmentService.STANDARD,
  ): Promise<Shipment> {
    const option = this.optionFor(service);
    const existing = await this.repository.findOne({ where: { orderId } });
    if (existing) {
      existing.status = ShipmentStatus.IN_TRANSIT;
      return this.repository.save(existing);
    }

    const shipment = this.repository.create({
      orderId,
      carrier: option.carrier,
      service: option.service,
      trackingCode: `TS-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: ShipmentStatus.IN_TRANSIT,
      cost: option.cost,
      estimatedDays: option.estimatedDays,
    });
    return this.repository.save(shipment);
  }

  async markDelivered(orderId: string): Promise<void> {
    const shipment = await this.repository.findOne({ where: { orderId } });
    if (shipment) {
      shipment.status = ShipmentStatus.DELIVERED;
      await this.repository.save(shipment);
    }
  }

  async getByOrder(orderId: string): Promise<Shipment | null> {
    return this.repository.findOne({ where: { orderId } });
  }
}
