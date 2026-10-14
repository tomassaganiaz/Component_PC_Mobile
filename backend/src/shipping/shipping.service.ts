import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
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

export interface ShipmentTracking {
  orderId: string;
  status: ShipmentStatus;
  carrier: string;
  trackingCode: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  courier: { lat: number; lng: number };
  progress: number; // 0..1
  totalKm: number;
  distanceRemainingKm: number;
  etaMinutes: number;
  etaText: string;
  mapUrl: string | null;
  updatedAt: string;
}

const FREE_SHIPPING_THRESHOLD = 250000;

// Depósito (origen) simulado en Buenos Aires.
const WAREHOUSE = { lat: -34.635, lng: -58.46 };

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(Shipment)
    private readonly repository: Repository<Shipment>,
    private readonly config: ConfigService,
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

  private hash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  private haversineKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  private staticMapUrl(
    origin: { lat: number; lng: number },
    courier: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): string | null {
    const key = this.config.get("GOOGLE_MAPS_API_KEY");
    if (!key) return null;
    const params = new URLSearchParams({
      size: "600x320",
      scale: "2",
      maptype: "roadmap",
      key,
    });
    const markers = [
      `markers=color:green|label:C|${courier.lat},${courier.lng}`,
      `markers=color:red|label:D|${destination.lat},${destination.lng}`,
      `markers=color:blue|label:O|${origin.lat},${origin.lng}`,
      `path=color:0x00a884FF|weight:4|${origin.lat},${origin.lng}|${courier.lat},${courier.lng}|${destination.lat},${destination.lng}`,
    ];
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&${markers.join("&")}`;
  }

  /**
   * Seguimiento simulado del paquete: posición del camión, distancia y ETA.
   * El mapa (Maps Static API) se incluye sólo si hay GOOGLE_MAPS_API_KEY.
   */
  async getTracking(orderId: string): Promise<ShipmentTracking | null> {
    const shipment = await this.getByOrder(orderId);
    if (!shipment) return null;

    const seed = this.hash(orderId);
    const origin = WAREHOUSE;
    const destination = {
      lat: -34.58 - (seed % 40) / 1000,
      lng: -58.4 - (seed % 55) / 1000,
    };

    const totalKm = this.haversineKm(origin, destination);
    const totalMs = shipment.estimatedDays * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(shipment.createdAt).getTime();

    const progress =
      shipment.status === ShipmentStatus.DELIVERED
        ? 1
        : Math.min(0.95, Math.max(0.05, elapsed / totalMs));

    const courier = {
      lat: origin.lat + (destination.lat - origin.lat) * progress,
      lng: origin.lng + (destination.lng - origin.lng) * progress,
    };
    const distanceRemainingKm = totalKm * (1 - progress);
    const etaMinutes = Math.max(0, Math.round((totalMs - elapsed) / 60000));

    return {
      orderId,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      origin,
      destination,
      courier,
      progress: Math.round(progress * 100) / 100,
      totalKm: Math.round(totalKm * 10) / 10,
      distanceRemainingKm: Math.round(distanceRemainingKm * 10) / 10,
      etaMinutes,
      etaText: this.formatEta(etaMinutes),
      mapUrl: this.staticMapUrl(origin, courier, destination),
      updatedAt: new Date().toISOString(),
    };
  }

  private formatEta(minutes: number): string {
    if (minutes <= 0) return "Llegando";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days >= 1) return `${days} día(s)`;
    return `${hours} h`;
  }
}
