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
  ParseUUIDPipe,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import {
  CreateProductDto,
  UpdateProductDto,
  FilterProductDto,
  CreateVariationDto,
  UpdateVariationDto,
} from "./dto";
import { ProductStatus } from "./product.entity";
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
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
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
    @Param("id", new ParseUUIDPipe()) id: string,
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

    let dto = updateProductDto;
    if (user.role !== UserRole.ADMIN) {
      // El vendedor no puede auto-marcarse "verified" ni saltarse la
      // auditoría (pending → published): solo pausar/reactivar el listado
      // (PUBLISHED <-> DRAFT). El resto de cambios de estado es de admin.
      const { status, ...rest } = updateProductDto;
      delete rest.verified;
      const publishable = [ProductStatus.PUBLISHED, ProductStatus.DRAFT];
      const canToggleStatus =
        status !== undefined &&
        publishable.includes(status) &&
        publishable.includes(product.status);
      dto = { ...rest, ...(canToggleStatus ? { status } : {}) };
    }
    return this.productsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Eliminar producto vendido (vendedor dueño o admin)",
  })
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: ExpressRequest,
  ) {
    const product = await this.productsService.findOne(id);
    const user = req.user as { id: string; role: string };
    if (user.role !== UserRole.ADMIN && product.sellerId !== user.id) {
      throw new ForbiddenException(
        "Solo el vendedor del catálogo o un admin pueden eliminarlo",
      );
    }
    if (user.role !== UserRole.ADMIN && product.status !== ProductStatus.SOLD) {
      throw new ForbiddenException(
        "Solo podés eliminar productos que ya fueron vendidos",
      );
    }
    return this.productsService.remove(id);
  }

  /* ------------------------------ Variaciones ------------------------------ */

  @Get(":id/variations")
  @ApiOperation({ summary: "Listar variaciones de un producto" })
  listVariations(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productsService.listVariations(id);
  }

  @Post(":id/variations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Agregar variación (vendedor dueño o admin)" })
  async addVariation(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CreateVariationDto,
    @Request() req: ExpressRequest,
  ) {
    await this.assertProductOwner(id, req);
    return this.productsService.addVariation(id, dto);
  }

  @Patch(":id/variations/:variationId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar variación (vendedor dueño o admin)" })
  async updateVariation(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("variationId", new ParseUUIDPipe()) variationId: string,
    @Body() dto: UpdateVariationDto,
    @Request() req: ExpressRequest,
  ) {
    await this.assertProductOwner(id, req);
    return this.productsService.updateVariation(id, variationId, dto);
  }

  @Delete(":id/variations/:variationId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar variación (vendedor dueño o admin)" })
  async removeVariation(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("variationId", new ParseUUIDPipe()) variationId: string,
    @Request() req: ExpressRequest,
  ) {
    await this.assertProductOwner(id, req);
    return this.productsService.removeVariation(id, variationId);
  }

  private async assertProductOwner(id: string, req: ExpressRequest) {
    const product = await this.productsService.findOne(id);
    const user = req.user as { id: string; role: string };
    if (user.role !== UserRole.ADMIN && product.sellerId !== user.id) {
      throw new ForbiddenException(
        "Solo el vendedor del catálogo o un admin pueden modificarlo",
      );
    }
    return product;
  }
}
