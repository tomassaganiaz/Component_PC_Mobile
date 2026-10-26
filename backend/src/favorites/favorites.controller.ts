import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FavoritesService } from "./favorites.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Favorites")
@Controller("favorites")
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "IDs de productos de interés del usuario" })
  async list(@Request() req: ExpressRequest) {
    const productIds = await this.favoritesService.listProductIds(
      (req.user as any).id,
    );
    return { productIds };
  }

  @Post(":productId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Marcar/desmarcar un producto como de interés" })
  toggle(
    @Param("productId", new ParseUUIDPipe()) productId: string,
    @Request() req: ExpressRequest,
  ) {
    return this.favoritesService.toggle((req.user as any).id, productId);
  }
}
