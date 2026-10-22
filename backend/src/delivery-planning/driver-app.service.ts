import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeliveryRoute, RouteStop, RouteStatus } from "./delivery-route.entity";
import { GoogleMapsService } from "../googlemaps/googlemaps.service";

const ROUTE_STATUS = {
  ASSIGNED: RouteStatus.ASSIGNED,
  IN_PROGRESS: RouteStatus.IN_PROGRESS,
  COMPLETED: RouteStatus.COMPLETED,
  PLANNED: RouteStatus.PLANNED,
};

export interface DriverRouteSummary {
  routeId: string;
  zone: string;
  status: RouteStatus;
  totalStops: number;
  completedStops: number;
  pendingStops: number;
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  carrierName: string;
  driverName: string | null;
  vehiclePlate: string | null;
  deliveryDate: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface DriverStopDetail {
  stopId: string;
  sequence: number;
  orderId: string;
  deliveryAddress: string;
  lat: number;
  lng: number;
  contactName: string;
  contactPhone: string;
  status: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  distanceFromPreviousKm: number;
  travelTimeMinutes: number;
  arrivedAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  staticMapUrl: string | null;
  navigationUrl: string;
}

export interface DriverDashboard {
  currentRoute: DriverRouteSummary | null;
  upcomingRoutes: DriverRouteSummary[];
  completedToday: number;
  totalDistanceTodayKm: number;
  efficiency: number;
}

@Injectable()
export class DriverAppService {
  private readonly logger = new Logger(DriverAppService.name);

  constructor(
    @InjectRepository(DeliveryRoute)
    private readonly routeRepository: Repository<DeliveryRoute>,
    @InjectRepository(RouteStop)
    private readonly stopRepository: Repository<RouteStop>,
    private readonly maps: GoogleMapsService,
  ) {}

  async getDashboard(driverId: string): Promise<DriverDashboard> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [assigned, inProgress, completed] = await Promise.all([
      this.routeRepository.find({
        where: { carrierId: driverId, status: RouteStatus.ASSIGNED },
        relations: ["stops"],
        order: { deliveryDate: "ASC" },
      }),
      this.routeRepository.find({
        where: { carrierId: driverId, status: RouteStatus.IN_PROGRESS },
        relations: ["stops"],
        order: { deliveryDate: "ASC" },
      }),
      this.routeRepository.find({
        where: {
          carrierId: driverId,
          status: RouteStatus.COMPLETED,
          createdAt: { $gte: today, $lt: tomorrow } as any,
        },
        relations: ["stops"],
      }),
    ]);

    const currentRoute = inProgress[0] || assigned[0] || null;

    const totalDistanceToday = [...inProgress, ...completed].reduce(
      (sum, r) => sum + Number(r.totalDistanceKm || 0),
      0,
    );

    const allStopsToday = [...inProgress, ...completed].flatMap(
      (r) => r.stops || [],
    );
    const deliveredOnTime = allStopsToday.filter(
      (s) => s.status === "delivered",
    ).length;
    const efficiency =
      allStopsToday.length > 0
        ? Math.round((deliveredOnTime / allStopsToday.length) * 100)
        : 100;

    return {
      currentRoute: currentRoute ? this.mapRouteSummary(currentRoute) : null,
      upcomingRoutes: assigned.slice(1).map((r) => this.mapRouteSummary(r)),
      completedToday: completed.length,
      totalDistanceTodayKm: Math.round(totalDistanceToday * 10) / 10,
      efficiency,
    };
  }

  async getCurrentRouteDetail(driverId: string): Promise<{
    route: DriverRouteSummary;
    stops: DriverStopDetail[];
  } | null> {
    const route = await this.routeRepository.findOne({
      where: [
        { carrierId: driverId, status: RouteStatus.IN_PROGRESS },
        { carrierId: driverId, status: RouteStatus.ASSIGNED },
      ],
      relations: ["stops"],
      order: { deliveryDate: "ASC" },
    });

    if (!route) return null;

    const stops = await this.stopRepository.find({
      where: { routeId: route.id },
      order: { sequence: "ASC" },
    });

    return {
      route: this.mapRouteSummary(route),
      stops: stops.map((stop, idx) =>
        this.mapStopDetail(stop, route, idx === 0 ? null : stops[idx - 1]),
      ),
    };
  }

  async getRouteDetailForDriver(
    driverId: string,
    routeId: string,
  ): Promise<{
    route: DriverRouteSummary;
    stops: DriverStopDetail[];
  } | null> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId, carrierId: driverId },
      relations: ["stops"],
    });
    if (!route) return null;

    const stops = await this.stopRepository.find({
      where: { routeId },
      order: { sequence: "ASC" },
    });

    return {
      route: this.mapRouteSummary(route),
      stops: stops.map((stop, idx) =>
        this.mapStopDetail(stop, route, idx === 0 ? null : stops[idx - 1]),
      ),
    };
  }

  async arriveAtStop(driverId: string, stopId: string): Promise<RouteStop> {
    const stop = await this.stopRepository.findOne({
      where: { id: stopId },
      relations: ["route"],
    });
    if (!stop) throw new NotFoundException("Parada no encontrada");
    if (stop.route.carrierId !== driverId)
      throw new BadRequestException("No autorizado");

    if (stop.status !== "pending") {
      throw new BadRequestException(`Parada ya está en estado ${stop.status}`);
    }

    stop.status = "arrived";
    stop.arrivedAt = new Date();
    return this.stopRepository.save(stop);
  }

  async deliverStop(driverId: string, stopId: string): Promise<RouteStop> {
    const stop = await this.stopRepository.findOne({
      where: { id: stopId },
      relations: ["route"],
    });
    if (!stop) throw new NotFoundException("Parada no encontrada");
    if (stop.route.carrierId !== driverId)
      throw new BadRequestException("No autorizado");

    if (stop.status === "delivered") {
      throw new BadRequestException("Parada ya entregada");
    }

    stop.status = "delivered";
    stop.deliveredAt = new Date();
    const saved = await this.stopRepository.save(stop);

    await this.checkRouteCompletion(stop.routeId);

    return saved;
  }

  async failStop(
    driverId: string,
    stopId: string,
    reason: string,
  ): Promise<RouteStop> {
    const stop = await this.stopRepository.findOne({
      where: { id: stopId },
      relations: ["route"],
    });
    if (!stop) throw new NotFoundException("Parada no encontrada");
    if (stop.route.carrierId !== driverId)
      throw new BadRequestException("No autorizado");

    stop.status = "failed";
    stop.failureReason = reason;
    stop.deliveredAt = new Date();
    const saved = await this.stopRepository.save(stop);

    await this.checkRouteCompletion(stop.routeId);

    return saved;
  }

  async getNavigationUrl(
    driverId: string,
    stopId: string,
  ): Promise<{ url: string; staticMapUrl: string | null }> {
    const stop = await this.stopRepository.findOne({
      where: { id: stopId },
      relations: ["route"],
    });
    if (!stop) throw new NotFoundException("Parada no encontrada");
    if (stop.route.carrierId !== driverId)
      throw new BadRequestException("No autorizado");

    const origin = await this.getDriverCurrentLocation(driverId);
    const destination = { lat: Number(stop.lat), lng: Number(stop.lng) };

    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;

    const staticMapUrl = this.maps.staticMapUrl(
      origin,
      destination,
      undefined,
      { width: 400, height: 300 },
    );

    return { url: navUrl, staticMapUrl };
  }

  async getRouteHistory(
    driverId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ routes: DriverRouteSummary[]; total: number }> {
    const [routes, total] = await this.routeRepository.findAndCount({
      where: { carrierId: driverId },
      relations: ["stops"],
      order: { deliveryDate: "DESC" },
      take: limit,
      skip: offset,
    });

    return {
      routes: routes.map((r) => this.mapRouteSummary(r)),
      total,
    };
  }

  private mapRouteSummary(route: DeliveryRoute): DriverRouteSummary {
    const stops = route.stops || [];
    const completed = stops.filter((s) => s.status === "delivered").length;
    const failed = stops.filter((s) => s.status === "failed").length;

    return {
      routeId: route.id,
      zone: route.zone,
      status: route.status,
      totalStops: stops.length,
      completedStops: completed,
      pendingStops: stops.length - completed - failed,
      totalDistanceKm: Number(route.totalDistanceKm || 0),
      estimatedDurationMinutes: route.estimatedDurationMinutes || 0,
      carrierName: route.carrierName,
      driverName: route.driverName ?? null,
      vehiclePlate: route.vehiclePlate ?? null,
      deliveryDate: route.deliveryDate,
      startedAt: route.startedAt,
      completedAt: route.completedAt,
    };
  }

  private mapStopDetail(
    stop: RouteStop,
    route: DeliveryRoute,
    previousStop: RouteStop | null,
  ): DriverStopDetail {
    const origin = previousStop
      ? { lat: Number(previousStop.lat), lng: Number(previousStop.lng) }
      : { lat: -34.6037, lng: -58.3816 };

    const staticMapUrl = this.maps.staticMapUrl(
      origin,
      { lat: Number(stop.lat), lng: Number(stop.lng) },
      undefined,
      { width: 400, height: 300 },
    );

    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`;

    return {
      stopId: stop.id,
      sequence: stop.sequence,
      orderId: stop.orderId,
      deliveryAddress: stop.deliveryAddress,
      lat: Number(stop.lat),
      lng: Number(stop.lng),
      contactName: stop.contactName,
      contactPhone: stop.contactPhone,
      status: stop.status,
      timeWindowStart: stop.timeWindowStart,
      timeWindowEnd: stop.timeWindowEnd,
      distanceFromPreviousKm: Number(stop.distanceFromPreviousKm || 0),
      travelTimeMinutes: stop.travelTimeMinutes || 0,
      arrivedAt: stop.arrivedAt,
      deliveredAt: stop.deliveredAt,
      failureReason: stop.failureReason,
      staticMapUrl,
      navigationUrl: navUrl,
    };
  }

  private async checkRouteCompletion(routeId: string): Promise<void> {
    const stops = await this.stopRepository.find({ where: { routeId } });
    const allDone = stops.every(
      (s) => s.status === "delivered" || s.status === "failed",
    );

    if (allDone) {
      const route = await this.routeRepository.findOne({
        where: { id: routeId },
      });
      if (route) {
        route.status = RouteStatus.COMPLETED;
        route.completedAt = new Date();
        await this.routeRepository.save(route);
      }
    }
  }

  private async getDriverCurrentLocation(
    driverId: string,
  ): Promise<{ lat: number; lng: number }> {
    return { lat: -34.6037, lng: -58.3816 };
  }
}
