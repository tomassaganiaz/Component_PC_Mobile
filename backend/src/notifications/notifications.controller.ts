import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Listar notificaciones del usuario" })
  findAll(@Request() req: ExpressRequest) {
    return this.notificationsService.findAll((req.user as any).id);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Cantidad de notificaciones sin leer" })
  async unreadCount(@Request() req: ExpressRequest) {
    const count = await this.notificationsService.unreadCount(
      (req.user as any).id,
    );
    return { count };
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Marcar todas como leídas" })
  markAllRead(@Request() req: ExpressRequest) {
    return this.notificationsService.markAllRead((req.user as any).id);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Marcar una notificación como leída" })
  markRead(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: ExpressRequest,
  ) {
    return this.notificationsService.markRead(id, (req.user as any).id);
  }
}
