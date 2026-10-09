import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { CreateProductDto, UpdateProductDto, FilterProductDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

@ApiTags("Products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Publicar nuevo producto (solo vendedor/admin)" })
  create(
    @Body() createProductDto: CreateProductDto,
    @Request() req: ExpressRequest,
  ) {
    return this.productsService.create(createProductDto, (req.user as any).id);
  }

  @Get()
  @ApiOperation({ summary: "Listar productos con filtros" })
  findAll(@Query() filters: FilterProductDto) {
    return this.productsService.findAll(filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de producto" })
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Get("seller/:sellerId")
  @ApiOperation({ summary: "Obtener productos de un vendedor" })
  findBySeller(@Param("sellerId") sellerId: string) {
    return this.productsService.findBySeller(sellerId);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar producto (vendedor dueño o admin)" })
  async update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: ExpressRequest,
  ) {
    const product = await this.productsService.findOne(id);
    const user = req.user as { id: string; role: string };
    if (user.role !== UserRole.ADMIN && product.sellerId !== user.id) {
      throw new ForbiddenException(
        "Solo el vendedor del catálogo o un admin pueden modificarlo",
      );
    }
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar producto (vendedor dueño o admin)" })
  async remove(@Param("id") id: string, @Request() req: ExpressRequest) {
    const product = await this.productsService.findOne(id);
    const user = req.user as { id: string; role: string };
    if (user.role !== UserRole.ADMIN && product.sellerId !== user.id) {
      throw new ForbiddenException(
        "Solo el vendedor del catálogo o un admin pueden eliminarlo",
      );
    }
    return this.productsService.remove(id);
  }
}
