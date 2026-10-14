import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from "@nestjs/swagger";
import { DriverAppService, DriverDashboard, DriverRouteSummary, DriverStopDetail } from "./driver-app.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RouteStop } from "./delivery-route.entity";

@ApiTags("Driver App")
@Controller("driver")
export class DriverAppController {
  constructor(private readonly driverApp: DriverAppService) {}

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Dashboard principal del driver" })
  async getDashboard(@Request() req: any): Promise<DriverDashboard> {
    return this.driverApp.getDashboard(req.user.id);
  }

  @Get("current-route")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Detalle de la ruta actual (asignada o en progreso)" })
  async getCurrentRoute(@Request() req: any): Promise<{
    route: DriverRouteSummary;
    stops: DriverStopDetail[];
  } | null> {
    return this.driverApp.getCurrentRouteDetail(req.user.id);
  }

  @Get("route-history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Historial de rutas del driver" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Default 20" })
  @ApiQuery({ name: "offset", required: false, type: Number, description: "Default 0" })
  async getRouteHistory(
    @Request() req: any,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.driverApp.getRouteHistory(
      req.user.id,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get("routes/:routeId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Detalle de una ruta específica" })
  @ApiParam({ name: "routeId", description: "ID de la ruta" })
  async getRouteDetail(@Request() req: any, @Param("routeId") routeId: string) {
    const route = await this.driverApp.getRouteDetailForDriver(req.user.id, routeId);
    if (!route) throw new NotFoundException("Ruta no encontrada o no autorizada");
    return route;
  }

  @Post("stops/:stopId/arrive")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Marcar llegada a parada" })
  @ApiParam({ name: "stopId", description: "ID de la parada" })
  async arriveAtStop(
    @Request() req: any,
    @Param("stopId") stopId: string,
  ): Promise<RouteStop> {
    return this.driverApp.arriveAtStop(req.user.id, stopId);
  }

  @Post("stops/:stopId/deliver")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Marcar entrega exitosa" })
  @ApiParam({ name: "stopId", description: "ID de la parada" })
  async deliverStop(
    @Request() req: any,
    @Param("stopId") stopId: string,
  ): Promise<RouteStop> {
    return this.driverApp.deliverStop(req.user.id, stopId);
  }

  @Post("stops/:stopId/fail")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reportar fallo de entrega" })
  @ApiParam({ name: "stopId", description: "ID de la parada" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["reason"],
      properties: {
        reason: { type: "string", example: "Cliente no atiende / dirección incorrecta" },
      },
    },
  })
  async failStop(
    @Request() req: any,
    @Param("stopId") stopId: string,
    @Body() body: { reason: string },
  ): Promise<RouteStop> {
    if (!body.reason) throw new BadRequestException("Motivo requerido");
    return this.driverApp.failStop(req.user.id, stopId, body.reason);
  }

  @Get("stops/:stopId/navigation")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "URL de navegación (Google Maps) y mapa estático para una parada" })
  @ApiParam({ name: "stopId", description: "ID de la parada" })
  async getNavigation(
    @Request() req: any,
    @Param("stopId") stopId: string,
  ) {
    return this.driverApp.getNavigationUrl(req.user.id, stopId);
  }
}