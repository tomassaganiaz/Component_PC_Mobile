import { Test, TestingModule } from "@nestjs/testing";
import { GoogleMapsController } from "./googlemaps.controller";
import { GoogleMapsService } from "./googlemaps.service";
import { ProductsService } from "../products/products.service";
import { UsersService } from "../users/users.service";
import { Product, ProductCondition, ProductCategory, ProductStatus } from "../products/product.entity";
import { User, UserRole } from "../users/user.entity";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("GoogleMapsController", () => {
  let controller: GoogleMapsController;
  let mapsService: GoogleMapsService;
  let productsService: ProductsService;
  let usersService: UsersService;

  const mockMapsService = {
    isConfigured: jest.fn().mockReturnValue(true),
    geocode: jest.fn(),
    reverseGeocode: jest.fn(),
    getDirections: jest.fn(),
    getDistanceMatrix: jest.fn(),
    staticMapUrl: jest.fn(),
    findNearbyPlaces: jest.fn(),
    estimateDeliveryDate: jest.fn(),
  };

  const mockProductsService = {
    findOne: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockProduct: Partial<Product> = {
    id: "prod-123",
    title: "RTX 4070",
    lat: -34.6037,
    lng: -58.3816,
    address: "Av. Corrientes 1234",
    city: "CABA",
    province: "Buenos Aires",
    postalCode: "1043",
    seller: {
      id: "seller-1",
      name: "Juan Pérez",
      lat: -34.61,
      lng: -58.39,
      address: "Av. Santa Fe 500",
      city: "CABA",
      province: "Buenos Aires",
      postalCode: "1000",
    } as any,
  };

  const mockBuyer: Partial<User> = {
    id: "buyer-1",
    name: "María González",
    lat: -34.55,
    lng: -58.45,
    address: "Av. Libertador 2000",
    city: "Vicente López",
    province: "Buenos Aires",
    postalCode: "1638",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleMapsController],
      providers: [
        { provide: GoogleMapsService, useValue: mockMapsService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<GoogleMapsController>(GoogleMapsController);
    mapsService = module.get<GoogleMapsService>(GoogleMapsService);
    productsService = module.get<ProductsService>(ProductsService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("productLocation", () => {
    it("returns product location with seller info and static map", async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      const result = await controller.productLocation("prod-123");

      expect(result.productId).toBe("prod-123");
      expect(result.title).toBe("RTX 4070");
      expect(result.location).toEqual({
        lat: -34.6037,
        lng: -58.3816,
        address: "Av. Corrientes 1234",
        city: "CABA",
        province: "Buenos Aires",
        postalCode: "1043",
      });
      expect(result.seller).toEqual({
        id: "seller-1",
        name: "Juan Pérez",
        address: "Av. Santa Fe 500",
        city: "CABA",
        province: "Buenos Aires",
        lat: -34.61,
        lng: -58.39,
      });
      expect(result.staticMapUrl).toBe("https://maps.googleapis.com/staticmap?...");
      expect(mockProductsService.findOne).toHaveBeenCalledWith("prod-123");
    });

    it("falls back to seller location when product has no coords", async () => {
      const productNoCoords = { ...mockProduct, lat: null, lng: null, address: null, city: null, province: null, postalCode: null };
      mockProductsService.findOne.mockResolvedValue(productNoCoords);
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      const result = await controller.productLocation("prod-123");

      expect(result.location).toEqual({
        lat: -34.61,
        lng: -58.39,
        address: "Av. Santa Fe 500",
        city: "CABA",
        province: "Buenos Aires",
        postalCode: "1000",
      });
    });

    it("returns location: null when neither product nor seller has location", async () => {
      const productNoLocation = {
        ...mockProduct,
        lat: null,
        lng: null,
        seller: { ...mockProduct.seller, lat: null, lng: null, address: null, city: null, province: null, postalCode: null },
      };
      mockProductsService.findOne.mockResolvedValue(productNoLocation);
      mockMapsService.staticMapUrl.mockReturnValue(null);

      const result = await controller.productLocation("prod-123");

      expect(result.location).toBeNull();
      expect(result.seller?.lat).toBeNull();
      expect(result.staticMapUrl).toBeNull();
    });
  });

  describe("deliveryEstimate", () => {
    it("returns delivery estimate with route and map", async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockUsersService.findOne.mockResolvedValue(mockBuyer);
      mockMapsService.getDirections.mockResolvedValue({
        distanceKm: 15.5,
        durationMinutes: 25,
        polyline: "encoded_polyline",
        steps: [{ instruction: "Head north", distanceKm: 2, durationMinutes: 5 }],
      });
      mockMapsService.estimateDeliveryDate.mockReturnValue({
        estimatedDate: new Date("2026-10-16"),
        estimatedDays: 2,
        text: "En 2 días",
      });
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      const result = await controller.deliveryEstimate(
        { user: { id: "buyer-1" } },
        "prod-123",
        "standard",
      );

      expect(result.productId).toBe("prod-123");
      expect(result.service).toBe("standard");
      expect(result.distanceKm).toBe(15.5);
      expect(result.durationMinutes).toBe(25);
      expect(result.estimatedDelivery).toEqual({
        date: "2026-10-16T00:00:00.000Z",
        days: 2,
        text: "En 2 días",
      });
      expect(result.route).toEqual({
        polyline: "encoded_polyline",
        steps: [{ instruction: "Head north", distanceKm: 2, durationMinutes: 5 }],
      });
      expect(result.staticMapUrl).toBe("https://maps.googleapis.com/staticmap?...");
    });

    it("throws NotFoundException when product has no location", async () => {
      mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        lat: null,
        lng: null,
        seller: { ...mockProduct.seller, lat: null, lng: null },
      });
      mockUsersService.findOne.mockResolvedValue(mockBuyer);

      await expect(
        controller.deliveryEstimate({ user: { id: "buyer-1" } }, "prod-123", "standard"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when buyer has no location", async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockUsersService.findOne.mockResolvedValue({ ...mockBuyer, lat: null, lng: null });

      await expect(
        controller.deliveryEstimate({ user: { id: "buyer-1" } }, "prod-123", "standard"),
      ).rejects.toThrow(BadRequestException);
    });

    it("uses haversine fallback when directions API fails", async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockUsersService.findOne.mockResolvedValue(mockBuyer);
      mockMapsService.getDirections.mockResolvedValue(null);
      mockMapsService.estimateDeliveryDate.mockReturnValue({
        estimatedDate: new Date("2026-10-16"),
        estimatedDays: 2,
        text: "En 2 días",
      });
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      const result = await controller.deliveryEstimate(
        { user: { id: "buyer-1" } },
        "prod-123",
        "standard",
      );

      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.durationMinutes).toBeGreaterThan(0);
    });
  });

  describe("nearbyPickups", () => {
    it("returns nearby places sorted by distance", async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockMapsService.findNearbyPlaces
        .mockResolvedValueOnce([
          { name: "Tienda A", lat: -34.604, lng: -58.382, address: "Cerca 1", placeId: "1", rating: 4.5 },
        ])
        .mockResolvedValueOnce([
          { name: "Correo Central", lat: -34.605, lng: -58.383, address: "Cerca 2", placeId: "2", rating: 4.0 },
        ])
        .mockResolvedValueOnce([
          { name: "Envíos Rápidos", lat: -34.606, lng: -58.384, address: "Cerca 3", placeId: "3", rating: 4.8 },
        ]);

      const result = await controller.nearbyPickups("prod-123", "5000", "store");

      expect(result.productId).toBe("prod-123");
      expect(result.places).toHaveLength(3);
      expect(result.places[0].distanceKm).toBeLessThanOrEqual(result.places[1].distanceKm);
      expect(result.places[0].name).toBe("Tienda A");
    });

    it("deduplicates places by placeId", async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockMapsService.findNearbyPlaces
        .mockResolvedValueOnce([
          { name: "Tienda A", lat: -34.604, lng: -58.382, address: "Cerca 1", placeId: "1", rating: 4.5 },
        ])
        .mockResolvedValueOnce([
          { name: "Correo Central", lat: -34.605, lng: -58.383, address: "Cerca 2", placeId: "2", rating: 4.0 },
        ])
        .mockResolvedValueOnce([
          { name: "Tienda A duplicada", lat: -34.604, lng: -58.382, address: "Cerca 1", placeId: "1", rating: 4.5 },
        ]);

      const result = await controller.nearbyPickups("prod-123", "5000", "store");

      expect(result.places).toHaveLength(2);
    });

    it("throws NotFoundException when product has no location", async () => {
      mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        lat: null,
        lng: null,
        seller: { ...mockProduct.seller, lat: null, lng: null },
      });

      await expect(controller.nearbyPickups("prod-123")).rejects.toThrow(NotFoundException);
    });
  });

  describe("geocode", () => {
    it("returns geocoded result", async () => {
      mockMapsService.geocode.mockResolvedValue({
        lat: -34.6037,
        lng: -58.3816,
        formattedAddress: "Av. Corrientes 1234, CABA, Argentina",
      });

      const result = await controller.geocode("Av. Corrientes 1234, CABA");

      expect(result.address).toBe("Av. Corrientes 1234, CABA");
      expect(result.result).toEqual({
        lat: -34.6037,
        lng: -58.3816,
        formattedAddress: "Av. Corrientes 1234, CABA, Argentina",
      });
    });

    it("throws BadRequestException when address missing", async () => {
      await expect(controller.geocode("")).rejects.toThrow(BadRequestException);
    });
  });

  describe("reverseGeocode", () => {
    it("returns reverse geocoded address", async () => {
      mockMapsService.reverseGeocode.mockResolvedValue("Av. Corrientes 1234, CABA, Argentina");

      const result = await controller.reverseGeocode("-34.6037", "-58.3816");

      expect(result.lat).toBe("-34.6037");
      expect(result.lng).toBe("-58.3816");
      expect(result.result).toBe("Av. Corrientes 1234, CABA, Argentina");
    });
  });

  describe("directions", () => {
    it("returns directions between two points", async () => {
      mockMapsService.getDirections.mockResolvedValue({
        distanceKm: 10.5,
        durationMinutes: 20,
        polyline: "polyline_encoded",
        steps: [],
      });

      const result = await controller.directions("-34.6", "-58.4", "-34.5", "-58.3");

      expect(result.result).toEqual({
        distanceKm: 10.5,
        durationMinutes: 20,
        polyline: "polyline_encoded",
        steps: [],
      });
    });
  });

  describe("staticMap", () => {
    it("returns static map URL", async () => {
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      const result = await controller.staticMap("-34.6", "-58.4", "-34.5", "-58.3");

      expect(result.staticMapUrl).toBe("https://maps.googleapis.com/staticmap?...");
    });

    it("parses waypoints correctly", async () => {
      mockMapsService.staticMapUrl.mockReturnValue("https://maps.googleapis.com/staticmap?...");

      await controller.staticMap("-34.6", "-58.4", "-34.5", "-58.3", "-34.55,-58.35|-34.52,-58.32");

      expect(mockMapsService.staticMapUrl).toHaveBeenCalledWith(
        { lat: -34.6, lng: -58.4 },
        { lat: -34.5, lng: -58.3 },
        [
          { lat: -34.55, lng: -58.35 },
          { lat: -34.52, lng: -58.32 },
        ],
        { width: 600, height: 320 },
      );
    });
  });
});