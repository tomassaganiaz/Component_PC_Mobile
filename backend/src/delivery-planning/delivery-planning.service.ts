import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, In } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  DeliveryRoute,
  RouteStop,
  RouteStatus,
  DeliveryZone,
  DELIVERY_ZONES,
  getZoneForLocation,
  getEstimatedDays,
  haversineKm,
} from "./delivery-route.entity";
import { Order, OrderStatus } from "../orders/order.entity";
import { User } from "../users/user.entity";
import { GoogleMapsService } from "../googlemaps/googlemaps.service";
import { DeliveryNotificationsService, TrackingLinkData } from "./delivery-notifications.service";

export interface EnrichedOrder {
  order: Order;
  buyerLat: number | null;
  buyerLng: number | null;
  buyerAddress: string | null;
  buyerName: string | null;
  zone: DeliveryZone;
  distanceFromOriginKm: number;
  estimatedDays: number;
}

export interface PlannedRoute {
  zone: DeliveryZone;
  date: Date;
  orders: EnrichedOrder[];
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  optimizedSequence: number[];
}

export interface DailyPlanResult {
  date: string;
  routes: PlannedRoute[];
  totalOrders: number;
  unassignedOrders: number;
}

@Injectable()
export class DeliveryPlanningService {
  private readonly logger = new Logger(DeliveryPlanningService.name);
  private readonly cabaCenter = { lat: -34.6037, lng: -58.3816 };

  constructor(
    @InjectRepository(DeliveryRoute)
    private readonly routeRepository: Repository<DeliveryRoute>,
    @InjectRepository(RouteStop)
    private readonly stopRepository: Repository<RouteStop>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly maps: GoogleMapsService,
    private readonly notifications: DeliveryNotificationsService,
  ) {}

  /**
   * Planifica rutas para una fecha específica (ejecutado por cron o manualmente).
   */
  async planDailyRoutes(date: Date = new Date()): Promise<DailyPlanResult> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar órdenes listas para despachar sin ruta asignada
    const orders = await this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.buyer", "buyer")
      .where("order.status IN (:...statuses)", { statuses: [OrderStatus.PAID, OrderStatus.IN_CUSTODY] })
      .andWhere("order.createdAt BETWEEN :start AND :end", { start: startOfDay, end: endOfDay })
      .andWhere(
        "NOT EXISTS (SELECT 1 FROM route_stops rs WHERE rs.order_id = order.id)",
      )
      .orderBy("order.createdAt", "ASC")
      .getMany();

    this.logger.log(`Planificando rutas para ${orders.length} órdenes del ${startOfDay.toISOString().split("T")[0]}`);

    if (orders.length === 0) {
      return { date: startOfDay.toISOString().split("T")[0], routes: [], totalOrders: 0, unassignedOrders: 0 };
    }

    // Enriquecer órdenes con ubicación del comprador
    const enrichedOrders = await this.enrichOrdersWithLocation(orders);

    // Filtrar solo las que tienen coordenadas válidas
    const validOrders = enrichedOrders.filter((o) => o.buyerLat != null && o.buyerLng != null);
    const unassignedOrders = orders.length - validOrders.length;

    if (unassignedOrders > 0) {
      this.logger.warn(`${unassignedOrders} órdenes sin coordenadas válidas, no se pueden planificar`);
    }

    // Agrupar por zona de entrega
    const ordersByZone = this.groupByZone(validOrders);

    // Planificar ruta por zona
    const plannedRoutes: PlannedRoute[] = [];
    for (const [zone, zoneOrders] of Object.entries(ordersByZone)) {
      const route = await this.optimizeRouteForZone(zone as DeliveryZone, zoneOrders, startOfDay);
      if (route.orders.length > 0) {
        plannedRoutes.push(route);
      }
    }

    // Persistir rutas y paradas
    await this.persistRoutes(plannedRoutes, startOfDay);

    return {
      date: startOfDay.toISOString().split("T")[0],
      routes: plannedRoutes,
      totalOrders: validOrders.length,
      unassignedOrders,
    };
  }

  /**
   * Ejecuta la planificación diaria automáticamente (cron a las 06:00).
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM, { name: "daily-route-planning", timeZone: "America/Argentina/Buenos_Aires" })
  async handleDailyPlanningCron(): Promise<void> {
    this.logger.log("Ejecutando planificación diaria automática de rutas");
    try {
      await this.planDailyRoutes(new Date());
      this.logger.log("Planificación diaria completada");
    } catch (err) {
      this.logger.error(`Error en planificación diaria: ${String(err)}`);
    }
  }

  /**
   * Obtiene rutas planificadas para una fecha.
   */
  async getRoutesForDate(date: Date): Promise<DeliveryRoute[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.routeRepository.find({
      where: { deliveryDate: Between(start, end) },
      relations: ["stops"],
      order: { zone: "ASC", createdAt: "ASC" },
    });
  }

  /**
   * Obtiene detalle de una ruta con sus paradas.
   */
  async getRouteWithStops(routeId: string): Promise<DeliveryRoute | null> {
    return this.routeRepository.findOne({
      where: { id: routeId },
      relations: ["stops"],
    });
  }

  /**
   * Asigna un carrier/conductor a una ruta.
   */
  async assignCarrier(
    routeId: string,
    carrierId: string,
    carrierName: string,
    driverName?: string,
    vehiclePlate?: string,
  ): Promise<DeliveryRoute> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) throw new Error("Ruta no encontrada");

    route.carrierId = carrierId;
    route.carrierName = carrierName;
    route.driverName = driverName ?? null;
    route.vehiclePlate = vehiclePlate ?? null;
    route.status = RouteStatus.ASSIGNED;
    const savedRoute = await this.routeRepository.save(route);

    // Notificar a compradores de todas las paradas
    if (savedRoute.stops?.length) {
      for (const stop of savedRoute.stops) {
        try {
          await this.notifications.notifyRouteAssigned(savedRoute, stop);
        } catch (err) {
          this.logger.warn(`Error notificando asignación para parada ${stop.id}: ${String(err)}`);
        }
      }
    }

    return savedRoute;
  }

  /**
   * Inicia una ruta (cambia estado a IN_PROGRESS).
   */
  async startRoute(routeId: string): Promise<DeliveryRoute> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId },
      relations: ["stops"],
    });
    if (!route) throw new Error("Ruta no encontrada");

    route.status = RouteStatus.IN_PROGRESS;
    route.startedAt = new Date();
    const savedRoute = await this.routeRepository.save(route);

    // Notificar inicio de ruta a todos los compradores
    if (savedRoute.stops?.length) {
      try {
        await this.notifications.notifyRouteStarted(savedRoute, savedRoute.stops);
      } catch (err) {
        this.logger.warn(`Error notificando inicio de ruta: ${String(err)}`);
      }
    }

    return savedRoute;
  }

  /**
   * Marca una parada como entregada.
   */
  async completeStop(stopId: string, failureReason?: string): Promise<RouteStop> {
    const stop = await this.stopRepository.findOne({
      where: { id: stopId },
      relations: ["route"],
    });
    if (!stop) throw new Error("Parada no encontrada");
    if (!stop.route) throw new Error("Parada sin ruta asociada");

    if (failureReason) {
      stop.status = "failed";
      stop.failureReason = failureReason;
    } else {
      stop.status = "delivered";
      stop.deliveredAt = new Date();
    }
    const savedStop = await this.stopRepository.save(stop);

    // Notificar entrega o fallo
    try {
      if (failureReason) {
        await this.notifications.notifyDeliveryFailed(savedStop, savedStop.route, failureReason);
      } else {
        await this.notifications.notifyDelivered(savedStop, savedStop.route);
      }
    } catch (err) {
      this.logger.warn(`Error notificando completado de parada ${stopId}: ${String(err)}`);
    }

    return savedStop;
  }

  /**
   * Obtiene el progreso de una ruta en tiempo real.
   */
  async getRouteProgress(routeId: string): Promise<{
    route: DeliveryRoute;
    progress: { completed: number; total: number; percent: number };
    nextStop: RouteStop | null;
  }> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId },
      relations: ["stops"],
    });
    if (!route) throw new Error("Ruta no encontrada");

    const stops = route.stops ?? [];
    const completed = stops.filter((s) => s.status === "delivered").length;
    const nextStop = stops.find((s) => s.status === "pending" || s.status === "arrived") ?? null;

    return {
      route,
      progress: { completed, total: stops.length, percent: stops.length ? Math.round((completed / stops.length) * 100) : 0 },
      nextStop,
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async enrichOrdersWithLocation(orders: Order[]): Promise<EnrichedOrder[]> {
    const buyerIds = [...new Set(orders.map((o) => o.buyerId))];
    const buyers = await this.userRepository.findBy({ id: In(buyerIds) });
    const buyerMap = new Map(buyers.map((b) => [b.id, b]));

    return orders.map((order) => {
      const buyer = buyerMap.get(order.buyerId);
      const buyerLat = buyer?.lat ? Number(buyer.lat) : null;
      const buyerLng = buyer?.lng ? Number(buyer.lng) : null;
      let zone: DeliveryZone = DeliveryZone.OTHER;
      let distanceFromOrigin = 0;
      let estimatedDays = 4;

      if (buyerLat != null && buyerLng != null) {
        zone = getZoneForLocation(buyerLat, buyerLng);
        distanceFromOrigin = haversineKm(this.cabaCenter, { lat: buyerLat, lng: buyerLng });
        estimatedDays = getEstimatedDays(zone, "standard");
      }

      return {
        order,
        buyerLat,
        buyerLng,
        buyerAddress: buyer?.address ?? order.shippingAddress ?? "",
        buyerName: buyer?.name ?? "Sin nombre",
        zone,
        distanceFromOriginKm: distanceFromOrigin,
        estimatedDays,
      };
    });
  }

  private groupByZone(orders: EnrichedOrder[]): Record<DeliveryZone, EnrichedOrder[]> {
    const grouped: Record<DeliveryZone, EnrichedOrder[]> = {} as any;
    for (const zone of DELIVERY_ZONES.map((z) => z.name)) {
      grouped[zone] = [];
    }

    for (const order of orders) {
      grouped[order.zone].push(order);
    }
    return grouped;
  }

  private async optimizeRouteForZone(
    zone: DeliveryZone,
    orders: EnrichedOrder[],
    date: Date,
  ): Promise<PlannedRoute> {
    if (orders.length === 0) {
      return { zone, date, orders: [], totalDistanceKm: 0, estimatedDurationMinutes: 0, optimizedSequence: [] };
    }

    // Ordenar por distancia desde CABA (más cercano primero)
    const sorted = [...orders].sort((a, b) => a.distanceFromOriginKm - b.distanceFromOriginKm);

    // Optimizar secuencia usando nearest neighbor (greedy TSP simple)
    const optimized = this.optimizeSequence(sorted, this.cabaCenter);

    // Calcular distancia total y duración estimada
    let totalDistance = 0;
    let totalDuration = 0;
    let prev = this.cabaCenter;

    for (const stop of optimized) {
      const dist = haversineKm(prev, { lat: stop.buyerLat!, lng: stop.buyerLng! });
      totalDistance += dist;
      totalDuration += Math.round(dist / 50 * 60) + 10; // 50 km/h + 10 min por parada
      prev = { lat: stop.buyerLat!, lng: stop.buyerLng! };
    }
    // Vuelta al depósito
    totalDistance += haversineKm(prev, this.cabaCenter);
    totalDuration += Math.round(haversineKm(prev, this.cabaCenter) / 50 * 60);

    // Si hay Google Maps API, intentar obtener ruta real para la primera orden (sample)
    let realDistance = totalDistance;
    let realDuration = totalDuration;
    if (this.maps.isConfigured() && optimized.length > 0) {
      try {
        const directions = await this.maps.getDirections(
          this.cabaCenter,
          { lat: optimized[0].buyerLat!, lng: optimized[0].buyerLng! },
        );
        if (directions) {
          realDistance = directions.distanceKm;
          realDuration = directions.durationMinutes;
        }
      } catch {
        // Ignorar errores de Maps
      }
    }

    return {
      zone,
      date,
      orders: optimized,
      totalDistanceKm: Math.round(realDistance * 10) / 10,
      estimatedDurationMinutes: realDuration,
      optimizedSequence: optimized.map((_, i) => i),
    };
  }

  private optimizeSequence(
    stops: EnrichedOrder[],
    origin: { lat: number; lng: number },
  ): EnrichedOrder[] {
    if (stops.length <= 1) return stops;

    // Nearest Neighbor greedy algorithm
    const unvisited = [...stops];
    const result: EnrichedOrder[] = [];
    let current = origin;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = haversineKm(current, { lat: unvisited[i].buyerLat!, lng: unvisited[i].buyerLng! });
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const next = unvisited.splice(nearestIdx, 1)[0];
      result.push(next);
      current = { lat: next.buyerLat!, lng: next.buyerLng! };
    }

    return result;
  }

  private async persistRoutes(routes: PlannedRoute[], date: Date): Promise<void> {
    for (const planned of routes) {
      const route = this.routeRepository.create({
        deliveryDate: date,
        zone: planned.zone,
        status: RouteStatus.PLANNED,
        totalDistanceKm: planned.totalDistanceKm,
        estimatedDurationMinutes: planned.estimatedDurationMinutes,
        ordersCount: planned.orders.length,
      });
      const savedRoute: DeliveryRoute = await this.routeRepository.save(route);

      // Crear paradas
      const stops: RouteStop[] = [];
      for (let idx = 0; idx < planned.orders.length; idx++) {
        const order = planned.orders[idx];
        const distanceFromPrev = idx === 0
          ? haversineKm(this.cabaCenter, { lat: order.buyerLat!, lng: order.buyerLng! })
          : haversineKm(
              { lat: planned.orders[idx - 1].buyerLat!, lng: planned.orders[idx - 1].buyerLng! },
              { lat: order.buyerLat!, lng: order.buyerLng! },
            );

        const stop = new RouteStop();
        stop.routeId = savedRoute.id;
        stop.orderId = order.order.id;
        stop.sequence = idx + 1;
        stop.deliveryAddress = order.buyerAddress ?? "";
        stop.lat = order.buyerLat!;
        stop.lng = order.buyerLng!;
        stop.contactName = order.buyerName ?? "";
        stop.distanceFromPreviousKm = Math.round(distanceFromPrev * 10) / 10;
        stop.travelTimeMinutes = Math.round(distanceFromPrev / 50 * 60) + 10;
        stop.status = "pending";
        stops.push(stop);
      }

      await this.stopRepository.save(stops);
      this.logger.log(`Ruta creada: zona=${planned.zone}, paradas=${planned.orders.length}, km=${planned.totalDistanceKm}`);
    }
  }
}