import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import {
  DeliveryPlanningService,
  DailyPlanResult,
} from "./delivery-planning.service";
import { DeliveryRoute } from "./delivery-route.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";
import { RouteStop } from "./delivery-route.entity";

/**
 * Operación de logística: solo administración.
 * (Antes cualquier usuario autenticado veía direcciones/coords de compradores
 * y podía autoasignarse rutas.)
 */
@ApiTags("Delivery Planning")
@Controller("delivery-planning")
export class DeliveryPlanningController {
  constructor(private readonly planning: DeliveryPlanningService) {}

  @Post("plan")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Planificar rutas para una fecha (manual, admin)" })
  @ApiQuery({
    name: "date",
    required: false,
    description: "Fecha YYYY-MM-DD (default: hoy)",
  })
  async planRoutes(@Query("date") date?: string): Promise<DailyPlanResult> {
    const planDate = date ? new Date(date) : new Date();
    if (isNaN(planDate.getTime()))
      throw new BadRequestException("Fecha inválida");
    return this.planning.planDailyRoutes(planDate);
  }

  @Get("routes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Obtener rutas planificadas para una fecha (admin)",
  })
  @ApiQuery({
    name: "date",
    required: false,
    description: "Fecha YYYY-MM-DD (default: hoy)",
  })
  async getRoutes(@Query("date") date?: string): Promise<DeliveryRoute[]> {
    const planDate = date ? new Date(date) : new Date();
    if (isNaN(planDate.getTime()))
      throw new BadRequestException("Fecha inválida");
    return this.planning.getRoutesForDate(planDate);
  }

  @Get("routes/:routeId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener detalle de una ruta con paradas (admin)" })
  @ApiParam({ name: "routeId", description: "ID de la ruta" })
  async getRoute(@Param("routeId") routeId: string): Promise<DeliveryRoute> {
    const route = await this.planning.getRouteWithStops(routeId);
    if (!route) throw new NotFoundException("Ruta no encontrada");
    return route;
  }

  @Get("routes/:routeId/progress")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Progreso en tiempo real de una ruta (admin)" })
  @ApiParam({ name: "routeId", description: "ID de la ruta" })
  async getProgress(@Param("routeId") routeId: string) {
    return this.planning.getRouteProgress(routeId);
  }

  @Post("routes/:routeId/assign")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Asignar carrier/conductor a una ruta (admin)" })
  @ApiParam({ name: "routeId", description: "ID de la ruta" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["carrierId", "carrierName"],
      properties: {
        carrierId: { type: "string", example: "carrier-123" },
        carrierName: { type: "string", example: "Andreani" },
        driverName: { type: "string", example: "Juan Pérez" },
        vehiclePlate: { type: "string", example: "ABC123" },
      },
    },
  })
  async assignCarrier(
    @Param("routeId") routeId: string,
    @Body()
    body: {
      carrierId: string;
      carrierName: string;
      driverName?: string;
      vehiclePlate?: string;
    },
  ): Promise<DeliveryRoute> {
    return this.planning.assignCarrier(
      routeId,
      body.carrierId,
      body.carrierName,
      body.driverName,
      body.vehiclePlate,
    );
  }

  @Post("routes/:routeId/start")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Iniciar ruta (estado IN_PROGRESS, admin)" })
  @ApiParam({ name: "routeId", description: "ID de la ruta" })
  async startRoute(@Param("routeId") routeId: string): Promise<DeliveryRoute> {
    return this.planning.startRoute(routeId);
  }

  @Post("stops/:stopId/complete")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Marcar parada como entregada o fallida (admin)" })
  @ApiParam({ name: "stopId", description: "ID de la parada" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        failureReason: { type: "string", example: "Cliente no encontrado" },
      },
    },
  })
  async completeStop(
    @Param("stopId") stopId: string,
    @Body() body: { failureReason?: string },
  ): Promise<RouteStop> {
    return this.planning.completeStop(stopId, body.failureReason);
  }

  @Get("zones")
  @ApiOperation({ summary: "Listar zonas de entrega configuradas" })
  async getZones() {
    const { DELIVERY_ZONES } = await import("./delivery-route.entity");
    return DELIVERY_ZONES.map((z) => ({
      name: z.name,
      center: z.center,
      radiusKm: z.radiusKm,
      cities: z.cities,
      estimatedDays: z.estimatedDaysFromCABA,
    }));
  }
}
