import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CartService } from "./cart.service";
import { AddCartItemDto, UpdateCartItemDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Cart")
@Controller("cart")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Obtener mi carrito" })
  getCart(@Request() req: ExpressRequest) {
    return this.cartService.getCart((req.user as any).id);
  }

  @Post("items")
  @ApiOperation({ summary: "Agregar un producto al carrito" })
  addItem(@Body() dto: AddCartItemDto, @Request() req: ExpressRequest) {
    return this.cartService.addItem(
      (req.user as any).id,
      dto.productId,
      dto.quantity ?? 1,
    );
  }

  @Patch("items/:id")
  @ApiOperation({ summary: "Cambiar la cantidad de un ítem" })
  updateItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCartItemDto,
    @Request() req: ExpressRequest,
  ) {
    return this.cartService.updateItem((req.user as any).id, id, dto.quantity);
  }

  @Delete("items/:id")
  @ApiOperation({ summary: "Quitar un ítem del carrito" })
  removeItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: ExpressRequest,
  ) {
    return this.cartService.removeItem((req.user as any).id, id);
  }

  @Delete()
  @ApiOperation({ summary: "Vaciar el carrito" })
  async clear(@Request() req: ExpressRequest) {
    await this.cartService.clear((req.user as any).id);
    return { success: true };
  }
}
