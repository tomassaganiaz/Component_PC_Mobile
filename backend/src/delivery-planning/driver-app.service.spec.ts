import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DriverAppService, DriverDashboard, DriverRouteSummary, DriverStopDetail } from "./driver-app.service";
import { DeliveryRoute, RouteStop, RouteStatus, DeliveryZone } from "./delivery-route.entity";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { GoogleMapsService } from "../googlemaps/googlemaps.service";

describe("DriverAppService", () => {
  let service: DriverAppService;

  const mockRouteRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
  };

  const mockStopRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockMapsService = {
    staticMapUrl: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
  };

  const driverId = "driver-123";
  const routeId = "route-456";
  const stopId = "stop-789";

  const mockRoute: Partial<DeliveryRoute> = {
    id: routeId,
    zone: DeliveryZone.CABA,
    status: RouteStatus.ASSIGNED,
    totalDistanceKm: 25.5,
    estimatedDurationMinutes: 120,
    carrierName: "Andreani",
    driverName: "Juan Pérez",
    vehiclePlate: "ABC123",
    deliveryDate: new Date("2026-10-15"),
    startedAt: undefined,
    completedAt: undefined,
    stops: [],
  };

  const mockStops: Partial<RouteStop>[] = [
    {
      id: "stop-1",
      routeId,
      sequence: 1,
      orderId: "order-1",
      deliveryAddress: "Av. Corrientes 1234, CABA",
      lat: -34.6037,
      lng: -58.3816,
      contactName: "María González",
      contactPhone: "+5491112345678",
      status: "pending",
      timeWindowStart: "09:00",
      timeWindowEnd: "12:00",
      distanceFromPreviousKm: 5.2,
      travelTimeMinutes: 15,
      arrivedAt: undefined,
      deliveredAt: undefined,
      failureReason: undefined,
    },
    {
      id: "stop-2",
      routeId,
      sequence: 2,
      orderId: "order-2",
      deliveryAddress: "Av. Santa Fe 2000, CABA",
      lat: -34.595,
      lng: -58.39,
      contactName: "Carlos López",
      contactPhone: "+5491187654321",
      status: "pending",
      timeWindowStart: "12:00",
      timeWindowEnd: "15:00",
      distanceFromPreviousKm: 3.1,
      travelTimeMinutes: 10,
      arrivedAt: undefined,
      deliveredAt: undefined,
      failureReason: undefined,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverAppService,
        { provide: getRepositoryToken(DeliveryRoute), useValue: mockRouteRepository },
        { provide: getRepositoryToken(RouteStop), useValue: mockStopRepository },
        { provide: GoogleMapsService, useValue: mockMapsService },
      ],
    }).compile();

    service = module.get<DriverAppService>(DriverAppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getDashboard", () => {
    it("returns dashboard with current route, upcoming, and stats", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockRouteRepository.find
        .mockResolvedValueOnce([mockRoute]) // assigned
        .mockResolvedValueOnce([]) // inProgress
        .mockResolvedValueOnce([]); // completed

      const result = await service.getDashboard("driver-123");

      expect(result.currentRoute).toBeDefined();
      expect(result.currentRoute?.routeId).toBe(routeId);
      expect(result.upcomingRoutes).toHaveLength(0);
      expect(result.completedToday).toBe(0);
      expect(result.efficiency).toBe(100);
      expect(mockRouteRepository.find).toHaveBeenCalledTimes(3);
    });

    it("calculates efficiency based on delivered stops", async () => {
      const routeWithStops = {
        ...mockRoute,
        stops: [
          { status: "delivered" },
          { status: "delivered" },
          { status: "failed" },
        ],
      };

      mockRouteRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockRoute, stops: [{ status: "delivered" }, { status: "delivered" }] }])
        .mockResolvedValueOnce([{ ...mockRoute, stops: [{ status: "delivered" }] }]);

      const result = await service.getDashboard("driver-123");

      expect(result.efficiency).toBeGreaterThan(0);
    });
  });

  describe("getCurrentRouteDetail", () => {
    it("returns route with stops when route exists", async () => {
      const routeWithStops = { ...mockRoute, stops: mockStops };
      mockRouteRepository.findOne.mockResolvedValue(routeWithStops);
      mockStopRepository.find.mockResolvedValue(mockStops);
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      const result = await service.getCurrentRouteDetail("driver-123");

      expect(result).not.toBeNull();
      expect(result!.route.routeId).toBe(routeId);
      expect(result!.stops).toHaveLength(2);
      expect(result!.stops[0].stopId).toBe("stop-1");
      expect(result!.stops[0].staticMapUrl).toBeDefined();
      expect(result!.stops[0].navigationUrl).toContain("google.com/maps");
    });

    it("returns null when no route assigned", async () => {
      mockRouteRepository.findOne.mockResolvedValue(null);

      const result = await service.getCurrentRouteDetail("driver-123");

      expect(result).toBeNull();
    });
  });

  describe("getRouteDetailForDriver", () => {
    it("returns route detail when driver owns the route", async () => {
      const routeWithStops = { ...mockRoute, stops: mockStops };
      mockRouteRepository.findOne.mockResolvedValue(routeWithStops);
      mockStopRepository.find.mockResolvedValue(mockStops);
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      const result = await service.getRouteDetailForDriver("driver-123", routeId);

      expect(result).not.toBeNull();
      expect(result!.route.routeId).toBe(routeId);
      expect(result!.stops).toHaveLength(2);
    });

    it("returns null when driver does not own route", async () => {
      mockRouteRepository.findOne.mockResolvedValue(null);

      const result = await service.getRouteDetailForDriver("driver-123", routeId);

      expect(result).toBeNull();
    });
  });

  describe("arriveAtStop", () => {
    it("marks stop as arrived", async () => {
      const stop = { ...mockStops[0], status: "pending", route: { carrierId: "driver-123" } };
      mockStopRepository.findOne.mockResolvedValue(stop);
      mockStopRepository.save.mockResolvedValue({ ...stop, status: "arrived", arrivedAt: new Date() });

      const result = await service.arriveAtStop("driver-123", stopId);

      expect(result.status).toBe("arrived");
      expect(result.arrivedAt).toBeDefined();
    });

    it("throws NotFoundException when stop not found", async () => {
      mockStopRepository.findOne.mockResolvedValue(null);

      await expect(service.arriveAtStop("driver-123", "non-existent")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when stop not pending", async () => {
      const stop = { ...mockStops[0], status: "arrived", route: { carrierId: "driver-123" } };
      mockStopRepository.findOne.mockResolvedValue(stop);

      await expect(service.arriveAtStop("driver-123", stopId)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when driver doesn't own route", async () => {
      const stop = { ...mockStops[0], status: "pending", route: { carrierId: "other-driver" } };
      mockStopRepository.findOne.mockResolvedValue(stop);

      await expect(service.arriveAtStop("driver-123", stopId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("deliverStop", () => {
    it("marks stop as delivered", async () => {
      const stop = { ...mockStops[0], status: "arrived", route: { carrierId: "driver-123", id: routeId } };
      mockStopRepository.findOne.mockResolvedValue(stop);
      mockStopRepository.save.mockResolvedValue({ ...stop, status: "delivered", deliveredAt: new Date() });
      mockStopRepository.find.mockResolvedValue([{ ...mockStops[0], status: "delivered" }, mockStops[1]]);
      mockRouteRepository.findOne.mockResolvedValue({ ...mockRoute, id: routeId });
      mockRouteRepository.save.mockResolvedValue({ ...mockRoute, status: RouteStatus.COMPLETED });

      const result = await service.deliverStop("driver-123", stopId);

      expect(result.status).toBe("delivered");
      expect(result.deliveredAt).toBeDefined();
    });

    it("throws NotFoundException when stop not found", async () => {
      mockStopRepository.findOne.mockResolvedValue(null);

      await expect(service.deliverStop("driver-123", "non-existent")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when already delivered", async () => {
      const stop = { ...mockStops[0], status: "delivered", route: { carrierId: "driver-123" } };
      mockStopRepository.findOne.mockResolvedValue(stop);

      await expect(service.deliverStop("driver-123", stopId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("failStop", () => {
    it("marks stop as failed with reason", async () => {
      const stop = { ...mockStops[0], status: "arrived", route: { carrierId: "driver-123", id: routeId } };
      mockStopRepository.findOne.mockResolvedValue(stop);
      mockStopRepository.save.mockResolvedValue({ ...stop, status: "failed", failureReason: "Cliente no atiende" });
      mockStopRepository.find.mockResolvedValue([{ ...mockStops[0], status: "failed" }, mockStops[1]]);
      mockRouteRepository.findOne.mockResolvedValue({ ...mockRoute, id: routeId });
      mockRouteRepository.save.mockResolvedValue({ ...mockRoute, status: RouteStatus.COMPLETED });

      const result = await service.failStop("driver-123", stopId, "Cliente no atiende");

      expect(result.status).toBe("failed");
      expect(result.failureReason).toBe("Cliente no atiende");
    });

    it("throws NotFoundException when stop not found", async () => {
      mockStopRepository.findOne.mockResolvedValue(null);

      await expect(service.failStop("driver-123", "non-existent", "Motivo")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getNavigationUrl", () => {
    it("returns navigation URL and static map", async () => {
      const stop = { ...mockStops[0], route: { carrierId: "driver-123" } };
      mockStopRepository.findOne.mockResolvedValue(stop);
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      const result = await service.getNavigationUrl("driver-123", stopId);

      expect(result.url).toContain("google.com/maps");
      expect(result.url).toContain("travelmode=driving");
      expect(result.staticMapUrl).toContain("maps.googleapis.com/staticmap");
    });

    it("throws NotFoundException when stop not found", async () => {
      mockStopRepository.findOne.mockResolvedValue(null);

      await expect(service.getNavigationUrl("driver-123", "non-existent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getRouteHistory", () => {
    it("returns paginated route history", async () => {
      const routes = [mockRoute, { ...mockRoute, id: "route-2" }];
      mockRouteRepository.findAndCount.mockResolvedValue([routes, 2]);

      const result = await service.getRouteHistory("driver-123", 10, 0);

      expect(result.routes).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});