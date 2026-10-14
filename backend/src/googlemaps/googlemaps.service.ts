import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = "https://maps.googleapis.com/maps/api";

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get("GOOGLE_MAPS_API_KEY", "");
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /** Geocodifica una dirección → { lat, lng, formattedAddress } */
  async geocode(address: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    if (!this.isConfigured()) return null;

    try {
      const params = new URLSearchParams({
        address,
        key: this.apiKey,
        language: "es",
        region: "ar",
      });
      const res = await fetch(`${this.baseUrl}/geocode/json?${params}`);
      const data = (await res.json()) as { status: string; results: any[] };
      if (data.status !== "OK" || !data.results?.length) return null;

      const r = data.results[0];
      return {
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        formattedAddress: r.formatted_address,
      };
    } catch (err) {
      this.logger.warn(`Geocode error: ${String(err)}`);
      return null;
    }
  }

  /** Reverse geocoding: lat/lng → dirección */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.isConfigured()) return null;

    try {
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: this.apiKey,
        language: "es",
      });
      const res = await fetch(`${this.baseUrl}/geocode/json?${params}`);
      const data = (await res.json()) as { status: string; results: any[] };
      if (data.status !== "OK" || !data.results?.length) return null;
      return data.results[0].formatted_address;
    } catch (err) {
      this.logger.warn(`Reverse geocode error: ${String(err)}`);
      return null;
    }
  }

  /** Obtiene ruta y distancia entre dos puntos (Directions API) */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: "driving" | "walking" | "transit" = "driving",
  ): Promise<{
    distanceKm: number;
    durationMinutes: number;
    polyline: string;
    steps: Array<{ instruction: string; distanceKm: number; durationMinutes: number }>;
  } | null> {
    if (!this.isConfigured()) return null;

    try {
      const params = new URLSearchParams({
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode,
        key: this.apiKey,
        language: "es",
        alternatives: "false",
      });
      const res = await fetch(`${this.baseUrl}/directions/json?${params}`);
      const data = (await res.json()) as { status: string; routes: any[] };
      if (data.status !== "OK" || !data.routes?.length) return null;

      const route = data.routes[0];
      const leg = route.legs[0];
      const steps = leg.steps.map((s: any) => ({
        instruction: s.html_instructions.replace(/<[^>]*>/g, ""),
        distanceKm: Math.round(s.distance.value / 1000 * 10) / 10,
        durationMinutes: Math.round(s.duration.value / 60),
      }));

      return {
        distanceKm: Math.round(leg.distance.value / 1000 * 10) / 10,
        durationMinutes: Math.round(leg.duration.value / 60),
        polyline: route.overview_polyline.points,
        steps,
      };
    } catch (err) {
      this.logger.warn(`Directions error: ${String(err)}`);
      return null;
    }
  }

  /** Distance Matrix: distancia y tiempo entre múltiples orígenes/destinos */
  async getDistanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>,
    mode: "driving" | "walking" = "driving",
  ): Promise<Array<{ originIndex: number; destIndex: number; distanceKm: number; durationMinutes: number }> | null> {
    if (!this.isConfigured()) return null;

    try {
      const params = new URLSearchParams({
        origins: origins.map((o) => `${o.lat},${o.lng}`).join("|"),
        destinations: destinations.map((d) => `${d.lat},${d.lng}`).join("|"),
        mode,
        key: this.apiKey,
        language: "es",
      });
      const res = await fetch(`${this.baseUrl}/distancematrix/json?${params}`);
      const data = (await res.json()) as { status: string; rows: any[] };
      if (data.status !== "OK") return null;

      const results: Array<{ originIndex: number; destIndex: number; distanceKm: number; durationMinutes: number }> = [];
      data.rows.forEach((row, oi) => {
        row.elements.forEach((el: any, di: number) => {
          if (el.status === "OK") {
            results.push({
              originIndex: oi,
              destIndex: di,
              distanceKm: Math.round(el.distance.value / 1000 * 10) / 10,
              durationMinutes: Math.round(el.duration.value / 60),
            });
          }
        });
      });
      return results;
    } catch (err) {
      this.logger.warn(`Distance Matrix error: ${String(err)}`);
      return null;
    }
  }

  /** URL de mapa estático con ruta (Static Maps API) */
  staticMapUrl(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: Array<{ lat: number; lng: number }>,
    options: { width?: number; height?: number; zoom?: number } = {},
  ): string | null {
    if (!this.isConfigured()) return null;

    const { width = 600, height = 320, zoom = 10 } = options;
    const params = new URLSearchParams({
      size: `${width}x${height}`,
      scale: "2",
      maptype: "roadmap",
      key: this.apiKey,
      zoom: String(zoom),
    });

    const markers = [
      `markers=color:green|label:O|${origin.lat},${origin.lng}`,
      `markers=color:red|label:D|${destination.lat},${destination.lng}`,
    ];
    if (waypoints?.length) {
      waypoints.forEach((w, i) => {
        markers.push(`markers=color:blue|label:${String.fromCharCode(65 + i)}|${w.lat},${w.lng}`);
      });
    }

    const path = `path=color:0x00a884FF|weight:4|${origin.lat},${origin.lng}`;
    const pathPoints = [origin, ...(waypoints || []), destination];
    const pathStr = pathPoints.map((p) => `${p.lat},${p.lng}`).join("|");
    const pathParam = `path=color:0x00a884FF|weight:4|${pathStr}`;

    return `${this.baseUrl}/staticmap?${params.toString()}&${markers.join("&")}&${pathParam}`;
  }

  /** Busca lugares cercanos (Places API - Nearby Search) */
  async findNearbyPlaces(
    location: { lat: number; lng: number },
    radiusMeters: number = 5000,
    type: string = "store",
    keyword?: string,
  ): Promise<Array<{ name: string; lat: number; lng: number; address: string; placeId: string; rating?: number }> | null> {
    if (!this.isConfigured()) return null;

    try {
      const params = new URLSearchParams({
        location: `${location.lat},${location.lng}`,
        radius: String(radiusMeters),
        type,
        key: this.apiKey,
        language: "es",
      });
      if (keyword) params.append("keyword", keyword);

      const res = await fetch(`${this.baseUrl}/place/nearbysearch/json?${params}`);
      const data = (await res.json()) as { status: string; results: any[] };
      if (data.status !== "OK" || !data.results?.length) return [];

      return data.results.slice(0, 10).map((r) => ({
        name: r.name,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        address: r.vicinity,
        placeId: r.place_id,
        rating: r.rating,
      }));
    } catch (err) {
      this.logger.warn(`Nearby places error: ${String(err)}`);
      return null;
    }
  }

  /** Estimación simple de fecha de entrega basada en distancia y modo de envío */
  estimateDeliveryDate(
    distanceKm: number,
    service: "standard" | "express" | "pickup" = "standard",
    fromDate: Date = new Date(),
  ): { estimatedDate: Date; estimatedDays: number; text: string } {
    const avgSpeedKmh = service === "express" ? 60 : service === "pickup" ? 30 : 50;
    const hours = distanceKm / avgSpeedKmh;
    const workingHoursPerDay = 8;
    const estimatedDays = Math.max(1, Math.ceil(hours / workingHoursPerDay));

    const estimatedDate = new Date(fromDate);
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

    // Evitar domingos
    while (estimatedDate.getDay() === 0) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
    }

    return {
      estimatedDate,
      estimatedDays,
      text: estimatedDays === 1 ? "Mañana" : estimatedDays === 2 ? "En 2 días" : `En ${estimatedDays} días`,
    };
  }
}