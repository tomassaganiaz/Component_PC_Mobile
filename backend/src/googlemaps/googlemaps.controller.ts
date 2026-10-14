import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { GoogleMapsService } from "./googlemaps.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ProductsService } from "../products/products.service";
import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";
import { Product } from "../products/product.entity";

@ApiTags("Google Maps")
@Controller("maps")
export class GoogleMapsController {
  constructor(
    private readonly maps: GoogleMapsService,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
  ) {}

  private getProductLocation(product: Product): { lat: number; lng: number } | null {
    // Prioridad: ubicación del producto > ubicación del vendedor
    if (product.lat != null && product.lng != null) {
      return { lat: Number(product.lat), lng: Number(product.lng) };
    }
    if (product.seller?.lat != null && product.seller?.lng != null) {
      return { lat: Number(product.seller.lat), lng: Number(product.seller.lng) };
    }
    return null;
  }

  private getBuyerLocation(buyer: User): { lat: number; lng: number } | null {
    if (buyer.lat != null && buyer.lng != null) {
      return { lat: Number(buyer.lat), lng: Number(buyer.lng) };
    }
    return null;
  }

  @Get("product-location/:productId")
  @ApiOperation({ summary: "Ubicación del producto (lat/lng, dirección, mapa estático)" })
  @ApiParam({ name: "productId", description: "ID del producto" })
  async productLocation(@Param("productId") productId: string) {
    const product = await this.productsService.findOne(productId);
    const location = this.getProductLocation(product);

    let staticMapUrl: string | null = null;
    if (location && this.maps.isConfigured()) {
      // Mapa centrado en el producto con zoom 14
      staticMapUrl = this.maps.staticMapUrl(
        location,
        location, // mismo origen/destino para centrar
        undefined,
        { width: 600, height: 400, zoom: 14 },
      );
    }

    return {
      productId: product.id,
      title: product.title,
      location: location
        ? {
            lat: location.lat,
            lng: location.lng,
            address: product.address ?? product.seller?.address ?? null,
            city: product.city ?? product.seller?.city ?? null,
            province: product.province ?? product.seller?.province ?? null,
            postalCode: product.postalCode ?? product.seller?.postalCode ?? null,
          }
        : null,
      seller: product.seller
        ? {
            id: product.seller.id,
            name: product.seller.name,
            address: product.seller.address,
            city: product.seller.city,
            province: product.seller.province,
            lat: product.seller.lat ? Number(product.seller.lat) : null,
            lng: product.seller.lng ? Number(product.seller.lng) : null,
          }
        : null,
      staticMapUrl,
    };
  }

  @Get("delivery-estimate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Estimación de entrega: fecha, distancia, ruta y mapa" })
  @ApiQuery({ name: "productId", required: true, description: "ID del producto" })
  @ApiQuery({ name: "service", required: false, enum: ["standard", "express", "pickup"], description: "Tipo de envío" })
  async deliveryEstimate(
    @Request() req: any,
    @Query("productId") productId: string,
    @Query("service") service: "standard" | "express" | "pickup" = "standard",
  ) {
    const buyerId = req.user.id;

    const [product, buyer] = await Promise.all([
      this.productsService.findOne(productId),
      this.usersService.findOne(buyerId),
    ]);

    const origin = this.getProductLocation(product);
    const destination = this.getBuyerLocation(buyer);

    if (!origin) {
      throw new NotFoundException("El producto no tiene ubicación definida (ni vendedor)");
    }
    if (!destination) {
      throw new BadRequestException("Tu usuario no tiene dirección/coordenadas configuradas");
    }

    // Obtener ruta y distancia
    const directions = await this.maps.getDirections(origin, destination, "driving");
    const distanceKm = directions?.distanceKm ?? this.haversineKm(origin, destination);
    const durationMinutes = directions?.durationMinutes ?? Math.round(distanceKm / 50 * 60);

    // Estimar fecha de entrega
    const deliveryEstimate = this.maps.estimateDeliveryDate(distanceKm, service);

    // Mapa estático con la ruta
    let staticMapUrl: string | null = null;
    if (this.maps.isConfigured()) {
      staticMapUrl = this.maps.staticMapUrl(origin, destination, undefined, { width: 600, height: 400 });
    }

    return {
      productId: product.id,
      productTitle: product.title,
      buyerId,
      service,
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      distanceKm,
      durationMinutes,
      estimatedDelivery: {
        date: deliveryEstimate.estimatedDate.toISOString(),
        days: deliveryEstimate.estimatedDays,
        text: deliveryEstimate.text,
      },
      route: directions
        ? {
            polyline: directions.polyline,
            steps: directions.steps,
          }
        : null,
      staticMapUrl,
    };
  }

  @Get("nearby-pickups")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Locales/puntos de recogida cercanos al producto" })
  @ApiQuery({ name: "productId", required: true, description: "ID del producto" })
  @ApiQuery({ name: "radius", required: false, type: Number, description: "Radio en metros (default 5000)" })
  @ApiQuery({ name: "type", required: false, description: "Tipo de place (store, post_office, shipping_company, etc.)" })
  async nearbyPickups(
    @Query("productId") productId: string,
    @Query("radius") radius?: string,
    @Query("type") type?: string,
  ) {
    const product = await this.productsService.findOne(productId);
    const location = this.getProductLocation(product);

    if (!location) {
      throw new NotFoundException("El producto no tiene ubicación definida");
    }

    const radiusMeters = radius ? parseInt(radius, 10) : 5000;
    const placeType = type || "store";

    // Buscar lugares cercanos (tiendas, puntos de envío, etc.)
    const places = await this.maps.findNearbyPlaces(location, radiusMeters, placeType);

    // También buscar específicamente puntos de envío/correos
    const shippingPlaces = await this.maps.findNearbyPlaces(location, radiusMeters, "post_office");
    const courierPlaces = await this.maps.findNearbyPlaces(location, radiusMeters, "shipping_company");

    const allPlaces = [
      ...(places || []),
      ...(shippingPlaces || []),
      ...(courierPlaces || []),
    ]
      // Deduplicar por placeId
      .filter((place, index, self) => index === self.findIndex((p) => p.placeId === place.placeId))
      // Ordenar por distancia (aproximado via haversine)
      .sort((a, b) => this.haversineKm(location, a) - this.haversineKm(location, b))
      .slice(0, 20);

    return {
      productId: product.id,
      productTitle: product.title,
      searchLocation: location,
      radiusMeters,
      type: placeType,
      places: allPlaces.map((p) => ({
        ...p,
        distanceKm: Math.round(this.haversineKm(location, p) * 10) / 10,
      })),
    };
  }

  @Get("geocode")
  @ApiOperation({ summary: "Geocodificar dirección → lat/lng" })
  @ApiQuery({ name: "address", required: true, description: "Dirección a geocodificar" })
  async geocode(@Query("address") address: string) {
    if (!address) throw new BadRequestException("address requerido");
    const result = await this.maps.geocode(address);
    return { address, result };
  }

  @Get("reverse-geocode")
  @ApiOperation({ summary: "Reverse geocodificar lat/lng → dirección" })
  @ApiQuery({ name: "lat", required: true, type: Number })
  @ApiQuery({ name: "lng", required: true, type: Number })
  async reverseGeocode(@Query("lat") lat: string, @Query("lng") lng: string) {
    const result = await this.maps.reverseGeocode(parseFloat(lat), parseFloat(lng));
    return { lat, lng, result };
  }

  @Get("directions")
  @ApiOperation({ summary: "Ruta entre dos puntos (origen → destino)" })
  @ApiQuery({ name: "originLat", required: true, type: Number })
  @ApiQuery({ name: "originLng", required: true, type: Number })
  @ApiQuery({ name: "destLat", required: true, type: Number })
  @ApiQuery({ name: "destLng", required: true, type: Number })
  @ApiQuery({ name: "mode", required: false, enum: ["driving", "walking", "transit"] })
  async directions(
    @Query("originLat") originLat: string,
    @Query("originLng") originLng: string,
    @Query("destLat") destLat: string,
    @Query("destLng") destLng: string,
    @Query("mode") mode: "driving" | "walking" | "transit" = "driving",
  ) {
    const result = await this.maps.getDirections(
      { lat: parseFloat(originLat), lng: parseFloat(originLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) },
      mode,
    );
    return { result };
  }

  @Get("static-map")
  @ApiOperation({ summary: "URL de mapa estático con ruta" })
  @ApiQuery({ name: "originLat", required: true, type: Number })
  @ApiQuery({ name: "originLng", required: true, type: Number })
  @ApiQuery({ name: "destLat", required: true, type: Number })
  @ApiQuery({ name: "destLng", required: true, type: Number })
  @ApiQuery({ name: "waypoints", required: false, description: "lat,lng|lat,lng..." })
  @ApiQuery({ name: "width", required: false, type: Number, description: "Default 600" })
  @ApiQuery({ name: "height", required: false, type: Number, description: "Default 320" })
  staticMap(
    @Query("originLat") originLat: string,
    @Query("originLng") originLng: string,
    @Query("destLat") destLat: string,
    @Query("destLng") destLng: string,
    @Query("waypoints") waypoints?: string,
    @Query("width") width?: string,
    @Query("height") height?: string,
  ) {
    const wp = waypoints
      ? waypoints.split("|").map((w) => {
          const [lat, lng] = w.split(",");
          return { lat: parseFloat(lat), lng: parseFloat(lng) };
        })
      : undefined;

    const url = this.maps.staticMapUrl(
      { lat: parseFloat(originLat), lng: parseFloat(originLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) },
      wp,
      { width: width ? parseInt(width, 10) : 600, height: height ? parseInt(height, 10) : 320 },
    );
    return { staticMapUrl: url };
  }

  private haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
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
}