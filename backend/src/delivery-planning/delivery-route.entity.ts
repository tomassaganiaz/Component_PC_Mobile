import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Order } from "../orders/order.entity";
import { User } from "../users/user.entity";

export enum RouteStatus {
  PLANNED = "planned",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum DeliveryZone {
  CABA = "caba",
  GRAN_BUENOS_AIRES_NORTE = "gba_norte",
  GRAN_BUENOS_AIRES_SUR = "gba_sur",
  GRAN_BUENOS_AIRES_OESTE = "gba_oeste",
  LA_PLATA = "la_plata",
  MAR_DEL_PLATA = "mar_del_plata",
  BOLIVAR = "bolivar",
  AZUL = "azul",
  TANDIL = "tandil",
  OLAVARRIA = "olavarria",
  CHIVILCOY = "chivilcoy",
  PERGAMINO = "pergamino",
  JUNIN = "junin",
  OTHER = "other",
}

@Entity("delivery_routes")
@Index(["date", "status"])
@Index(["zone", "date"])
export class DeliveryRoute {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "date", name: "delivery_date" })
  deliveryDate: Date;

  @Column({ type: "enum", enum: DeliveryZone })
  zone: DeliveryZone;

  @Column({ type: "enum", enum: RouteStatus, default: RouteStatus.PLANNED })
  status: RouteStatus;

  @Column({ type: "varchar", length: 100, nullable: true, name: "carrier_id" })
  carrierId: string;

  @Column({ type: "varchar", length: 100, nullable: true, name: "carrier_name" })
  carrierName: string;

  @Column({ type: "varchar", length: 100, nullable: true, name: "driver_name" })
  driverName: string | null;

  @Column({ type: "varchar", length: 20, nullable: true, name: "vehicle_plate" })
  vehiclePlate: string | null;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0, name: "total_distance_km" })
  totalDistanceKm: number;

  @Column({ type: "integer", default: 0, name: "estimated_duration_minutes" })
  estimatedDurationMinutes: number;

  @Column({ type: "integer", default: 0, name: "orders_count" })
  ordersCount: number;

  @Column({ type: "timestamptz", nullable: true, name: "started_at" })
  startedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "completed_at" })
  completedAt: Date;

  @Column({ type: "text", nullable: true, name: "notes" })
  notes: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(() => RouteStop, (stop) => stop.route)
  stops: RouteStop[];
}

@Entity("route_stops")
@Index(["routeId", "sequence"])
@Index(["orderId"])
export class RouteStop {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => DeliveryRoute, (route) => route.stops, { onDelete: "CASCADE" })
  @JoinColumn({ name: "route_id" })
  route: DeliveryRoute;

  @Column({ name: "route_id" })
  routeId: string;

  @Column({ name: "order_id" })
  orderId: string;

  @Column({ type: "integer" })
  sequence: number;

  @Column({ type: "varchar", length: 500, name: "delivery_address" })
  deliveryAddress: string;

  @Column({ type: "decimal", precision: 10, scale: 7, name: "lat" })
  lat: number;

  @Column({ type: "decimal", precision: 10, scale: 7, name: "lng" })
  lng: number;

  @Column({ type: "varchar", length: 100, nullable: true, name: "contact_name" })
  contactName: string;

  @Column({ type: "varchar", length: 20, nullable: true, name: "contact_phone" })
  contactPhone: string;

  @Column({ type: "varchar", length: 50, nullable: true, name: "time_window_start" })
  timeWindowStart: string;

  @Column({ type: "varchar", length: 50, nullable: true, name: "time_window_end" })
  timeWindowEnd: string;

  @Column({
    type: "enum",
    enum: ["pending", "arrived", "delivered", "failed", "skipped"],
    default: "pending",
  })
  status: string;

  @Column({ type: "text", nullable: true, name: "failure_reason" })
  failureReason: string;

  @Column({ type: "timestamptz", nullable: true, name: "arrived_at" })
  arrivedAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "delivered_at" })
  deliveredAt: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, name: "distance_from_previous_km" })
  distanceFromPreviousKm: number;

  @Column({ type: "integer", nullable: true, name: "travel_time_minutes" })
  travelTimeMinutes: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

export interface ZoneConfig {
  name: DeliveryZone;
  center: { lat: number; lng: number };
  radiusKm: number;
  cities: string[];
  estimatedDaysFromCABA: { standard: number; express: number; pickup: number };
}

export const DELIVERY_ZONES: ZoneConfig[] = [
  {
    name: DeliveryZone.CABA,
    center: { lat: -34.6037, lng: -58.3816 },
    radiusKm: 15,
    cities: ["CABA", "Ciudad de Buenos Aires"],
    estimatedDaysFromCABA: { standard: 1, express: 1, pickup: 1 },
  },
  {
    name: DeliveryZone.GRAN_BUENOS_AIRES_NORTE,
    center: { lat: -34.52, lng: -58.5 },
    radiusKm: 30,
    cities: ["Vicente López", "San Isidro", "San Fernando", "Tigre", "Pilar", "Escobar"],
    estimatedDaysFromCABA: { standard: 2, express: 1, pickup: 2 },
  },
  {
    name: DeliveryZone.GRAN_BUENOS_AIRES_SUR,
    center: { lat: -34.78, lng: -58.35 },
    radiusKm: 35,
    cities: ["Lomas de Zamora", "Avellaneda", "Quilmes", "Berazategui", "Florencio Varela", "Almirante Brown"],
    estimatedDaysFromCABA: { standard: 2, express: 1, pickup: 2 },
  },
  {
    name: DeliveryZone.GRAN_BUENOS_AIRES_OESTE,
    center: { lat: -34.65, lng: -58.65 },
    radiusKm: 40,
    cities: ["Morón", "Ituzaingó", "Hurlingham", "Merlo", "Moreno", "General Rodríguez", "Luján"],
    estimatedDaysFromCABA: { standard: 2, express: 1, pickup: 2 },
  },
  {
    name: DeliveryZone.LA_PLATA,
    center: { lat: -34.92, lng: -57.95 },
    radiusKm: 25,
    cities: ["La Plata", "Berisso", "Ensenada"],
    estimatedDaysFromCABA: { standard: 2, express: 1, pickup: 2 },
  },
  {
    name: DeliveryZone.MAR_DEL_PLATA,
    center: { lat: -38.0, lng: -57.55 },
    radiusKm: 30,
    cities: ["Mar del Plata", "Balcarce", "Miramar"],
    estimatedDaysFromCABA: { standard: 3, express: 2, pickup: 3 },
  },
  {
    name: DeliveryZone.BOLIVAR,
    center: { lat: -36.23, lng: -61.1 },
    radiusKm: 50,
    cities: ["Bolivar", "General Alvear", "Saladillo"],
    estimatedDaysFromCABA: { standard: 3, express: 2, pickup: 3 },
  },
  {
    name: DeliveryZone.AZUL,
    center: { lat: -36.78, lng: -59.85 },
    radiusKm: 40,
    cities: ["Azul", "Tapalqué", "Las Flores"],
    estimatedDaysFromCABA: { standard: 3, express: 2, pickup: 3 },
  },
  {
    name: DeliveryZone.TANDIL,
    center: { lat: -37.32, lng: -59.13 },
    radiusKm: 35,
    cities: ["Tandil", "Rauch", "Ayacucho"],
    estimatedDaysFromCABA: { standard: 3, express: 2, pickup: 3 },
  },
  {
    name: DeliveryZone.OLAVARRIA,
    center: { lat: -36.89, lng: -60.32 },
    radiusKm: 30,
    cities: ["Olavarría", "Laprida", "General La Madrid"],
    estimatedDaysFromCABA: { standard: 3, express: 2, pickup: 3 },
  },
  {
    name: DeliveryZone.CHIVILCOY,
    center: { lat: -34.9, lng: -60.02 },
    radiusKm: 30,
    cities: ["Chivilcoy", "Suipacha", "Navarro"],
    estimatedDaysFromCABA: { standard: 2, express: 2, pickup: 2 },
  },
  {
    name: DeliveryZone.PERGAMINO,
    center: { lat: -33.89, lng: -60.57 },
    radiusKm: 30,
    cities: ["Pergamino", "Colón", "Rojas"],
    estimatedDaysFromCABA: { standard: 2, express: 2, pickup: 2 },
  },
  {
    name: DeliveryZone.JUNIN,
    center: { lat: -34.58, lng: -60.94 },
    radiusKm: 30,
    cities: ["Junín", "Lincoln", "General Viamonte"],
    estimatedDaysFromCABA: { standard: 3, express: 2, pickup: 2 },
  },
  {
    name: DeliveryZone.OTHER,
    center: { lat: -34.6, lng: -58.4 },
    radiusKm: 1000,
    cities: [],
    estimatedDaysFromCABA: { standard: 4, express: 3, pickup: 4 },
  },
];

export function getZoneForLocation(lat: number, lng: number): DeliveryZone {
  for (const zone of DELIVERY_ZONES) {
    const distance = haversineKm(zone.center, { lat, lng });
    if (distance <= zone.radiusKm) {
      return zone.name;
    }
  }
  return DeliveryZone.OTHER;
}

export function getEstimatedDays(
  zone: DeliveryZone,
  service: "standard" | "express" | "pickup" = "standard",
): number {
  const zoneConfig = DELIVERY_ZONES.find((z) => z.name === zone);
  if (!zoneConfig) return DELIVERY_ZONES[DELIVERY_ZONES.length - 1].estimatedDaysFromCABA[service];
  return zoneConfig.estimatedDaysFromCABA[service];
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}