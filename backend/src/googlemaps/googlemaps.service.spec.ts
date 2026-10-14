import { Test, TestingModule } from "@nestjs/testing";
import { GoogleMapsService } from "./googlemaps.service";
import { ConfigService } from "@nestjs/config";

describe("GoogleMapsService", () => {
  let service: GoogleMapsService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        GOOGLE_MAPS_API_KEY: "test-api-key",
      };
      return config[key] ?? "";
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleMapsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GoogleMapsService>(GoogleMapsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("isConfigured", () => {
    it("returns true when API key is set", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("returns false when API key is missing", () => {
      const moduleWithoutKey = Test.createTestingModule({
        providers: [
          GoogleMapsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => (key === "GOOGLE_MAPS_API_KEY" ? "" : "test")),
            },
          },
        ],
      }).compile();

      return moduleWithoutKey.then((m) => {
        const svc = m.get<GoogleMapsService>(GoogleMapsService);
        expect(svc.isConfigured()).toBe(false);
      });
    });
  });

  describe("geocode", () => {
    it("returns null when not configured", async () => {
      const moduleWithoutKey = Test.createTestingModule({
        providers: [
          GoogleMapsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => (key === "GOOGLE_MAPS_API_KEY" ? "" : "test")),
            },
          },
        ],
      }).compile();

      return moduleWithoutKey.then((m) => {
        const svc = m.get<GoogleMapsService>(GoogleMapsService);
        return expect(svc.geocode("Av. Corrientes 1234, CABA")).resolves.toBeNull();
      });
    });
  });

  describe("reverseGeocode", () => {
    it("returns null when not configured", async () => {
      const moduleWithoutKey = Test.createTestingModule({
        providers: [
          GoogleMapsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => (key === "GOOGLE_MAPS_API_KEY" ? "" : "test")),
            },
          },
        ],
      }).compile();

      return moduleWithoutKey.then((m) => {
        const svc = m.get<GoogleMapsService>(GoogleMapsService);
        return expect(svc.reverseGeocode(-34.6, -58.4)).resolves.toBeNull();
      });
    });
  });

  describe("getDirections", () => {
    it("returns null when not configured", async () => {
      const moduleWithoutKey = Test.createTestingModule({
        providers: [
          GoogleMapsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => (key === "GOOGLE_MAPS_API_KEY" ? "" : "test")),
            },
          },
        ],
      }).compile();

      return moduleWithoutKey.then((m) => {
        const svc = m.get<GoogleMapsService>(GoogleMapsService);
        return expect(
          svc.getDirections({ lat: -34.6, lng: -58.4 }, { lat: -34.5, lng: -58.3 }),
        ).resolves.toBeNull();
      });
    });
  });

  describe("getDistanceMatrix", () => {
    it("returns null when not configured", async () => {
      const moduleWithoutKey = Test.createTestingModule({
        providers: [
          GoogleMapsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => (key === "GOOGLE_MAPS_API_KEY" ? "" : "test")),
            },
          },
        ],
      }).compile();

      return moduleWithoutKey.then((m) => {
        const svc = m.get<GoogleMapsService>(GoogleMapsService);
        return expect(
          svc.getDistanceMatrix([{ lat: -34.6, lng: -58.4 }], [{ lat: -34.5, lng: -58.3 }]),
        ).resolves.toBeNull();
      });
    });
  });

  describe("staticMapUrl", () => {
    it("returns null when not configured", async () => {
      const moduleWithoutKey = Test.createTestingModule({
        providers: [
          GoogleMapsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => (key === "GOOGLE_MAPS_API_KEY" ? "" : "test")),
            },
          },
        ],
      }).compile();

      return moduleWithoutKey.then((m) => {
        const svc = m.get<GoogleMapsService>(GoogleMapsService);
        const url = svc.staticMapUrl(
          { lat: -34.6037, lng: -58.3816 },
          { lat: -34.5997, lng: -58.3716 },
        );
        expect(url).toBeNull();
      });
    });

    it("generates valid static map URL when configured", () => {
      const url = service.staticMapUrl(
        { lat: -34.6037, lng: -58.3816 },
        { lat: -34.5997, lng: -58.3716 },
        undefined,
        { width: 600, height: 400, zoom: 12 },
      );
      expect(url).toContain("maps.googleapis.com/maps/api/staticmap");
      expect(url).toContain("key=test-api-key");
      expect(url).toContain("size=600x400");
      expect(url).toContain("markers=color:green|label:O");
      expect(url).toContain("markers=color:red|label:D");
      expect(url).toContain("path=color:0x00a884FF");
    });

    it("includes waypoints when provided", () => {
      const url = service.staticMapUrl(
        { lat: -34.6, lng: -58.4 },
        { lat: -34.5, lng: -58.3 },
        [{ lat: -34.55, lng: -58.35 }],
        { width: 600, height: 400 },
      );
      expect(url).toContain("markers=color:blue|label:A|-34.55,-58.35");
      expect(url).toContain("-34.55,-58.35");
    });
  });

  describe("findNearbyPlaces", () => {
    it("returns null when not configured", async () => {
      const moduleWithoutKey = Test.createTestingModule({
        providers: [
          GoogleMapsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => (key === "GOOGLE_MAPS_API_KEY" ? "" : "test")),
            },
          },
        ],
      }).compile();

      return moduleWithoutKey.then((m) => {
        const svc = m.get<GoogleMapsService>(GoogleMapsService);
        return expect(svc.findNearbyPlaces({ lat: -34.6, lng: -58.4 })).resolves.toBeNull();
      });
    });
  });

  describe("estimateDeliveryDate", () => {
    it("estimates delivery for standard shipping", () => {
      const result = service.estimateDeliveryDate(100, "standard", new Date("2026-10-14"));
      expect(result.estimatedDays).toBeGreaterThanOrEqual(1);
      expect(result.estimatedDate).toBeInstanceOf(Date);
      expect(typeof result.text).toBe("string");
    });

    it("estimates faster delivery for express", () => {
      const standard = service.estimateDeliveryDate(100, "standard", new Date("2026-10-14"));
      const express = service.estimateDeliveryDate(100, "express", new Date("2026-10-14"));
      expect(express.estimatedDays).toBeLessThanOrEqual(standard.estimatedDays);
    });

    it("avoids Sundays", () => {
      const result = service.estimateDeliveryDate(400, "standard", new Date("2026-10-11"));
      expect(result.estimatedDate.getDay()).not.toBe(0);
    });
  });
});