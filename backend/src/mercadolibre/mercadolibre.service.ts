import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { MlCredential } from "./ml-credential.entity";
import {
  Product,
  ProductCategory,
  ProductCondition,
} from "../products/product.entity";
import { ProductVariation } from "../products/product-variation.entity";
import { ProductsService } from "../products/products.service";

export interface MlSaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: Record<string, unknown>;
}

export interface MlSale {
  id: string;
  total: number;
  status: string;
  shippingAddress?: string;
  paymentMethod?: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  product: Record<string, unknown> | null;
  items: MlSaleItem[];
  buyer: { id: string; name: string; email: string } | null;
}

export interface MlPublishResult {
  id: string;
  permalink: string;
  status: string;
}

const ML_STATUS_MAP: Record<string, string> = {
  paid: "paid",
  confirmed: "in_custody",
  payment_in_process: "pending",
  payment_required: "pending",
  partially_paid: "pending",
  cancelled: "cancelled",
};

const CATEGORY_MAP: Record<ProductCategory, string> = {
  [ProductCategory.CPU]: "MLA1743",
  [ProductCategory.GPU]: "MLA1744",
  [ProductCategory.RAM]: "MLA1745",
  [ProductCategory.STORAGE]: "MLA1746",
  [ProductCategory.MOTHERBOARD]: "MLA1742",
  [ProductCategory.PSU]: "MLA1748",
  [ProductCategory.CASE]: "MLA1749",
  [ProductCategory.COOLING]: "MLA1750",
  [ProductCategory.MONITOR]: "MLA1001",
  [ProductCategory.KEYBOARD]: "MLA1751",
  [ProductCategory.MOUSE]: "MLA1752",
  [ProductCategory.PHONE]: "MLA1055",
  [ProductCategory.TABLET]: "MLA1056",
  [ProductCategory.LAPTOP]: "MLA1057",
  [ProductCategory.OTHER]: "MLA1753",
};

const CONDITION_MAP: Record<ProductCondition, string> = {
  [ProductCondition.NEW]: "new",
  [ProductCondition.USED]: "used",
};

interface MlAttribute {
  id: string;
  name: string;
  value_type: string;
  values: Array<{ id: string; name: string }>;
  attribute_group_id: string;
  attribute_group_name: string;
  tags: {
    required?: boolean;
    fixed?: boolean;
    catalog_required?: boolean;
    variation_attribute?: boolean;
    allow_variations?: boolean;
    [key: string]: any;
  };
  hierarchy?: string;
}

interface MlCategoryAttributes {
  attributes: MlAttribute[];
}

@Injectable()
export class MercadoLibreService {
  private readonly logger = new Logger("MercadoLibre");

  constructor(
    @InjectRepository(MlCredential)
    private readonly credentialRepository: Repository<MlCredential>,
    private readonly config: ConfigService,
    private readonly productsService: ProductsService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get("ML_CLIENT_ID") && this.config.get("ML_CLIENT_SECRET"),
    );
  }

  private site(): string {
    return this.config.get("ML_SITE", "MLA");
  }

  private authBase(): string {
    return this.site() === "MLB"
      ? "https://auth.mercadolivre.com.br"
      : "https://auth.mercadolibre.com.ar";
  }

  private redirectUri(): string {
    return this.config.get(
      "ML_REDIRECT_URI",
      "http://localhost:3000/api/mercadolibre/callback",
    );
  }

  /** URL de autorización OAuth (el `state` lleva el id del usuario). */
  getAuthUrl(userId: string): { url: string; configured: boolean } {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.get("ML_CLIENT_ID", ""),
      redirect_uri: this.redirectUri(),
      state: userId,
    });
    return {
      url: `${this.authBase()}/authorization?${params.toString()}`,
      configured: this.isConfigured(),
    };
  }

  private async exchange(
    body: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(body).toString(),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new BadRequestException(
        `Mercado Libre: ${(data as any).message ?? res.statusText}`,
      );
    }
    return data;
  }

  /** Procesa el callback OAuth: guarda tokens y el id de usuario de ML. */
  async handleCallback(code: string, userId: string): Promise<MlCredential> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        "Mercado Libre no está configurado (faltan ML_CLIENT_ID/ML_CLIENT_SECRET).",
      );
    }
    const token = await this.exchange({
      grant_type: "authorization_code",
      client_id: this.config.get("ML_CLIENT_ID", ""),
      client_secret: this.config.get("ML_CLIENT_SECRET", ""),
      code,
      redirect_uri: this.redirectUri(),
    });

    const accessToken = String(token.access_token);
    let mlUserId: string | null = null;
    try {
      const meRes = await fetch("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const me = (await meRes.json()) as { id?: number };
      mlUserId = me?.id ? String(me.id) : null;
    } catch {
      // sin id no pasa nada crítico
    }

    return this.saveCredential(userId, {
      mlUserId,
      accessToken,
      refreshToken: String(token.refresh_token),
      expiresAt: new Date(
        Date.now() + Number(token.expires_in ?? 21600) * 1000,
      ),
    });
  }

  private async saveCredential(
    userId: string,
    data: Partial<MlCredential>,
  ): Promise<MlCredential> {
    let cred = await this.credentialRepository.findOne({ where: { userId } });
    if (!cred) {
      cred = this.credentialRepository.create({ userId });
    }
    Object.assign(cred, data);
    return this.credentialRepository.save(cred);
  }

  private async ensureFreshToken(cred: MlCredential): Promise<string | null> {
    if (!cred.accessToken) return null;
    const stillValid =
      cred.expiresAt && cred.expiresAt.getTime() - Date.now() > 5 * 60 * 1000;
    if (stillValid) return cred.accessToken;

    try {
      const token = await this.exchange({
        grant_type: "refresh_token",
        client_id: this.config.get("ML_CLIENT_ID", ""),
        client_secret: this.config.get("ML_CLIENT_SECRET", ""),
        refresh_token: cred.refreshToken ?? "",
      });
      const saved = await this.saveCredential(cred.userId, {
        accessToken: String(token.access_token),
        refreshToken: String(token.refresh_token ?? cred.refreshToken),
        expiresAt: new Date(
          Date.now() + Number(token.expires_in ?? 21600) * 1000,
        ),
      });
      return saved.accessToken;
    } catch (err) {
      this.logger.warn(`No se pudo refrescar el token ML: ${String(err)}`);
      return cred.accessToken;
    }
  }

  private mapStatus(status: string): string {
    return ML_STATUS_MAP[status] ?? "pending";
  }

  private mapOrder(order: any): MlSale {
    const items = (order.order_items ?? []).map((i: any) => ({
      id: String(i.item?.id ?? ""),
      productId: String(i.item?.id ?? ""),
      quantity: Number(i.quantity ?? 1),
      unitPrice: Number(i.unit_price ?? 0),
      product: {
        id: String(i.item?.id ?? ""),
        title: i.item?.title ?? "Producto",
        images: i.item?.thumbnail ? [i.item.thumbnail] : [],
        price: Number(i.unit_price ?? 0),
      },
    }));
    const first = items[0];
    return {
      id: String(order.id),
      total: Number(order.total_amount ?? (first ? first.unitPrice : 0)),
      status: this.mapStatus(order.status),
      shippingAddress:
        order.shipping?.receiver_address?.address_line ?? undefined,
      paymentMethod: order.payments?.[0]?.payment_type ?? undefined,
      productId: first?.productId ?? "",
      createdAt: order.date_created ?? new Date().toISOString(),
      updatedAt:
        order.last_updated ?? order.date_created ?? new Date().toISOString(),
      product: first?.product ?? null,
      items,
      buyer: order.buyer
        ? {
            id: String(order.buyer.id),
            name: order.buyer.nickname ?? "Comprador ML",
            email: order.buyer.nickname ?? "",
          }
        : null,
    };
  }

  private mockSales(): MlSale[] {
    const now = Date.now();
    const mk = (
      n: number,
      title: string,
      total: number,
      status: string,
      buyer: string,
    ): MlSale => ({
      id: `ML-MOCK-${n}`,
      total,
      status,
      shippingAddress: "Av. Corrientes 1234, CABA",
      paymentMethod: "credit_card",
      productId: `ML-MOCK-ITEM-${n}`,
      createdAt: new Date(now - n * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - n * 3600 * 1000).toISOString(),
      product: { id: `ML-MOCK-ITEM-${n}`, title, images: [], price: total },
      items: [
        {
          id: `ML-MOCK-ITEM-${n}`,
          productId: `ML-MOCK-ITEM-${n}`,
          quantity: 1,
          unitPrice: total,
          product: { id: `ML-MOCK-ITEM-${n}`, title, images: [], price: total },
        },
      ],
      buyer: { id: `ML-BUYER-${n}`, name: buyer, email: "" },
    });

    return [
      mk(1, "AMD Ryzen 7 7800X3D", 340, "paid", "juan_perez_ml"),
      mk(
        2,
        "NVIDIA RTX 4070 Super verificada",
        620,
        "in_custody",
        "maria.gomez",
      ),
      mk(
        3,
        "Samsung Galaxy S24 Ultra Sellado",
        980,
        "pending",
        "comprador_uy_22",
      ),
      mk(4, "DDR5 Corsair 32GB 6000MHz", 130, "paid", "mateo_dev"),
    ];
  }

  async getStatus(userId: string): Promise<{
    configured: boolean;
    connected: boolean;
    mlUserId: string | null;
  }> {
    const cred = await this.credentialRepository.findOne({
      where: { userId },
    });
    return {
      configured: this.isConfigured(),
      connected: Boolean(cred?.accessToken),
      mlUserId: cred?.mlUserId ?? null,
    };
  }

  /** Ventas del vendedor: reales desde ML si hay credenciales/token; si no, mock. */
  async getSales(
    userId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<{
    source: "mercadolibre" | "mock" | "not_connected";
    sales: MlSale[];
    pagination?: {
      offset: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const { offset = 0, limit = 50 } = options;

    if (!this.isConfigured()) {
      const mock = this.mockSales();
      const paginated = mock.slice(offset, offset + limit);
      return {
        source: "mock",
        sales: paginated,
        pagination: {
          offset,
          limit,
          total: mock.length,
          hasMore: offset + limit < mock.length,
        },
      };
    }

    const cred = await this.credentialRepository.findOne({
      where: { userId },
    });
    if (!cred?.accessToken) {
      return { source: "not_connected", sales: [] };
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      return { source: "not_connected", sales: [] };
    }

    try {
      let mlUserId = cred.mlUserId;
      if (!mlUserId) {
        const meRes = await fetch("https://api.mercadolibre.com/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const me = (await meRes.json()) as { id?: number };
        mlUserId = me?.id ? String(me.id) : null;
        if (mlUserId) {
          await this.saveCredential(userId, { mlUserId });
        }
      }

      const url = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&sort=date_desc&offset=${offset}&limit=${limit}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        results?: unknown[];
        paging?: { total: number };
      };
      const sales = (data.results ?? []).map((o) => this.mapOrder(o));
      const total = data.paging?.total ?? sales.length;

      return {
        source: "mercadolibre",
        sales,
        pagination: { offset, limit, total, hasMore: offset + limit < total },
      };
    } catch (err) {
      this.logger.warn(`Fallo consultando ventas ML: ${String(err)}`);
      return { source: "mercadolibre", sales: [] };
    }
  }

  async disconnect(userId: string): Promise<void> {
    await this.credentialRepository.delete({ userId });
  }

  async publishItem(
    userId: string,
    productId: string,
  ): Promise<MlPublishResult> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        "Mercado Libre no está configurado (faltan ML_CLIENT_ID/ML_CLIENT_SECRET).",
      );
    }

    const cred = await this.credentialRepository.findOne({ where: { userId } });
    if (!cred?.accessToken) {
      throw new BadRequestException("Cuenta de Mercado Libre no conectada.");
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      throw new BadRequestException(
        "No se pudo obtener token válido de Mercado Libre.",
      );
    }

    const product = await this.productsService.findOne(productId);
    if (product.sellerId !== userId) {
      throw new BadRequestException(
        "No tenés permiso para publicar este producto.",
      );
    }
    if (product.status !== "published" && product.status !== "verified") {
      throw new BadRequestException(
        "El producto debe estar publicado o verificado para sincronizar con ML.",
      );
    }
    if (product.stock <= 0) {
      throw new BadRequestException("El producto no tiene stock disponible.");
    }

    const mlCategoryId = CATEGORY_MAP[product.category];
    if (!mlCategoryId) {
      throw new BadRequestException(
        `Categoría ${product.category} no mapeada para Mercado Libre.`,
      );
    }

    const pictures = (product.images ?? []).map((url) => ({ source: url }));
    if (pictures.length === 0) {
      throw new BadRequestException(
        "El producto debe tener al menos una imagen para publicar en ML.",
      );
    }

    // Cargar variaciones del producto local
    const variations = await this.productsService.listVariations(productId);

    const { attributes, missingRequired } =
      await this.validateAndBuildAttributes(product, token);
    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Faltan atributos obligatorios para la categoría en ML: ${missingRequired.join(", ")}. ` +
          `Completá marca, modelo y campos específicos del producto antes de publicar.`,
      );
    }

    // Obtener atributos de variación permitidos por ML para esta categoría
    const variationAttrs = await this.getVariationAttributes(
      mlCategoryId,
      token,
    );

    // Construir body base
    const body: Record<string, unknown> = {
      title: product.title.slice(0, 60),
      category_id: mlCategoryId,
      price: Number(product.price),
      currency_id: this.site() === "MLB" ? "BRL" : "ARS",
      buying_mode: "buy_it_now",
      listing_type_id: "gold_special",
      condition: CONDITION_MAP[product.condition],
      description: { plain_text: product.description },
      pictures,
      attributes,
      warranty:
        product.warrantyDays > 0
          ? `Garantía de ${product.warrantyDays} días`
          : undefined,
      video_id: undefined,
    };

    // Si hay variaciones locales, construir array de variaciones para ML
    if (variations.length > 0) {
      const mlVariations = this.buildMlVariations(
        variations,
        product,
        variationAttrs,
        pictures,
      );
      if (mlVariations.length > 0) {
        body.variations = mlVariations;
        // Con variaciones, available_quantity y price van en cada variación, no en root
        delete body.available_quantity;
      } else {
        body.available_quantity = product.stock;
      }
    } else {
      body.available_quantity = product.stock;
    }

    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.error(`Error publicando en ML: ${JSON.stringify(data)}`);
      throw new BadRequestException(
        `Mercado Libre: ${(data as any).message ?? res.statusText}`,
      );
    }

    return {
      id: String(data.id),
      permalink: String(data.permalink),
      status: String(data.status),
    };
  }

  private buildAttributes(
    product: Product,
  ): Array<{ id: string; value_name?: string; value_id?: string }> {
    const attrs: Array<{ id: string; value_name?: string; value_id?: string }> =
      [];

    if (product.brand) attrs.push({ id: "BRAND", value_name: product.brand });
    if (product.model) attrs.push({ id: "MODEL", value_name: product.model });

    if (product.condition === ProductCondition.USED && product.hoursOfUse) {
      attrs.push({
        id: "ITEM_CONDITION",
        value_id: "2230284",
        value_name: "Usado",
      });
      attrs.push({
        id: "HOURS_OF_USE",
        value_name: String(product.hoursOfUse),
      });
    }

    if (product.category === ProductCategory.CPU) {
      if (product.model)
        attrs.push({ id: "PROCESSOR_MODEL", value_name: product.model });
    }
    if (product.category === ProductCategory.GPU) {
      if (product.model)
        attrs.push({ id: "VIDEO_CARD_MODEL", value_name: product.model });
    }
    if (product.category === ProductCategory.RAM) {
      if (product.model)
        attrs.push({ id: "RAM_MODEL", value_name: product.model });
    }
    if (product.category === ProductCategory.STORAGE) {
      if (product.model)
        attrs.push({ id: "STORAGE_MODEL", value_name: product.model });
    }

    if (product.sealed) attrs.push({ id: "SEALED", value_name: "Sí" });
    if (product.verified) attrs.push({ id: "VERIFIED", value_name: "Sí" });

    return attrs;
  }

  /** Obtiene atributos de una categoría de ML (cache simple en memoria). */
  private categoryAttributesCache = new Map<string, MlAttribute[]>();

  async getCategoryAttributes(
    categoryId: string,
    token: string,
  ): Promise<MlAttribute[]> {
    if (this.categoryAttributesCache.has(categoryId)) {
      return this.categoryAttributesCache.get(categoryId)!;
    }

    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/categories/${categoryId}/attributes`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const data = (await res.json()) as MlCategoryAttributes;
    if (!res.ok) {
      this.logger.warn(
        `No se pudieron obtener atributos de ${categoryId}: ${JSON.stringify(data)}`,
      );
      return [];
    }

    const attrs = data.attributes ?? [];
    this.categoryAttributesCache.set(categoryId, attrs);
    return attrs;
  }

  /** Valida y completa atributos requeridos para una categoría antes de publicar. */
  async validateAndBuildAttributes(
    product: Product,
    token: string,
  ): Promise<{
    attributes: Array<{ id: string; value_name?: string; value_id?: string }>;
    missingRequired: string[];
  }> {
    const mlCategoryId = CATEGORY_MAP[product.category];
    if (!mlCategoryId) {
      return { attributes: this.buildAttributes(product), missingRequired: [] };
    }

    const mlAttrs = await this.getCategoryAttributes(mlCategoryId, token);
    const requiredAttrs = mlAttrs.filter(
      (a) => a.tags?.required || a.tags?.catalog_required,
    );
    const userAttrs = this.buildAttributes(product);

    const providedIds = new Set(userAttrs.map((a) => a.id));
    const missingRequired: string[] = [];

    for (const req of requiredAttrs) {
      if (!providedIds.has(req.id)) {
        missingRequired.push(`${req.id} (${req.name})`);
      }
    }

    return { attributes: userAttrs, missingRequired };
  }

  /** Obtiene atributos que permiten variaciones (tags.variation_attribute o allow_variations). */
  private async getVariationAttributes(
    categoryId: string,
    token: string,
  ): Promise<MlAttribute[]> {
    const attrs = await this.getCategoryAttributes(categoryId, token);
    return attrs.filter(
      (a) =>
        a.tags?.variation_attribute === true ||
        a.tags?.allow_variations === true,
    );
  }

  /** Construye array de variaciones formato ML. */
  private buildMlVariations(
    localVariations: ProductVariation[],
    product: Product,
    variationAttrs: MlAttribute[],
    pictures: Array<{ source: string }>,
  ): Array<Record<string, unknown>> {
    // Mapear nombre de atributo local → ID de atributo ML
    const attrNameToMlId = new Map<string, string>();
    for (const attr of variationAttrs) {
      // Normalizar nombre para matching (ej: "color" → "COLOR", "capacidad" → "STORAGE_CAPACITY")
      const normalized = attr.name.toLowerCase().replace(/\s+/g, "_");
      attrNameToMlId.set(normalized, attr.id);
      // También por ID si coincide
      attrNameToMlId.set(attr.id.toLowerCase(), attr.id);
    }

    const result: Array<Record<string, unknown>> = [];

    for (const v of localVariations) {
      if (v.stock <= 0) continue; // Saltar variaciones sin stock

      const attributeCombinations: Array<{
        id: string;
        value_name?: string;
        value_id?: string;
      }> = [];

      if (v.attributes) {
        for (const [localName, localValue] of Object.entries(
          v.attributes as Record<string, string>,
        )) {
          const mlAttrId = attrNameToMlId.get(localName.toLowerCase());
          if (mlAttrId) {
            // Buscar value_id en valores permitidos del atributo ML
            const mlAttr = variationAttrs.find((a) => a.id === mlAttrId);
            let valueId: string | undefined;
            if (mlAttr?.values) {
              const match = mlAttr.values.find(
                (val) => val.name.toLowerCase() === localValue.toLowerCase(),
              );
              if (match) valueId = match.id;
            }
            attributeCombinations.push({
              id: mlAttrId,
              value_id: valueId,
              value_name: valueId ? undefined : localValue,
            });
          }
        }
      }

      if (attributeCombinations.length === 0) continue; // Sin atributos de variación válidos

      const price = Number(product.price) + Number(v.priceDelta);
      const variation: Record<string, unknown> = {
        attribute_combinations: attributeCombinations,
        available_quantity: v.stock,
        price,
        seller_custom_field: v.sku,
      };

      // Si la variación tiene imágenes específicas, asignarlas (por ahora usa las del producto principal)
      // TODO: permitir imágenes por variación en el futuro
      if (pictures.length > 0) {
        variation.picture_ids = pictures.map((_, i) => i); // índices en array pictures
      }

      result.push(variation);
    }

    return result;
  }

  async updateItem(
    userId: string,
    mlItemId: string,
    updates: {
      price?: number;
      available_quantity?: number;
      status?: "active" | "paused" | "closed";
    },
  ): Promise<{ id: string; status: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException("Mercado Libre no está configurado.");
    }

    const cred = await this.credentialRepository.findOne({ where: { userId } });
    if (!cred?.accessToken) {
      throw new BadRequestException("Cuenta de Mercado Libre no conectada.");
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      throw new BadRequestException(
        "No se pudo obtener token válido de Mercado Libre.",
      );
    }

    const body: Record<string, unknown> = {};
    if (updates.price !== undefined) body.price = updates.price;
    if (updates.available_quantity !== undefined)
      body.available_quantity = updates.available_quantity;
    if (updates.status !== undefined) body.status = updates.status;
    if (Object.keys(body).length === 0) {
      throw new BadRequestException(
        "Debe enviar al menos un campo para actualizar (price, available_quantity o status).",
      );
    }

    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/items/${mlItemId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.error(
        `Error actualizando item ML ${mlItemId}: ${JSON.stringify(data)}`,
      );
      throw new BadRequestException(
        `Mercado Libre: ${(data as any).message ?? res.statusText}`,
      );
    }

    return { id: String(data.id), status: String(data.status) };
  }

  async getItem(
    userId: string,
    mlItemId: string,
  ): Promise<Record<string, unknown>> {
    if (!this.isConfigured()) {
      throw new BadRequestException("Mercado Libre no está configurado.");
    }

    const cred = await this.credentialRepository.findOne({ where: { userId } });
    if (!cred?.accessToken) {
      throw new BadRequestException("Cuenta de Mercado Libre no conectada.");
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      throw new BadRequestException(
        "No se pudo obtener token válido de Mercado Libre.",
      );
    }

    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/items/${mlItemId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new BadRequestException(
        `Mercado Libre: ${(data as any).message ?? res.statusText}`,
      );
    }
    return data;
  }

  /** URL pública donde ML enviará notificaciones (configurar en ML Applications). */
  getWebhookUrl(): string {
    return this.config.get(
      "ML_WEBHOOK_URL",
      "http://localhost:3000/api/mercadolibre/webhook",
    );
  }

  /** Suscribe tópicos de notificación en ML (programático, evita ir a Developers manual). */
  async subscribeTopics(
    userId: string,
    topics: string[] = ["orders_v2", "payments", "shipments"],
  ): Promise<{ subscribed: string[]; failed: string[] }> {
    if (!this.isConfigured()) {
      throw new BadRequestException("Mercado Libre no está configurado.");
    }

    const cred = await this.credentialRepository.findOne({ where: { userId } });
    if (!cred?.accessToken) {
      throw new BadRequestException("Cuenta de Mercado Libre no conectada.");
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      throw new BadRequestException(
        "No se pudo obtener token válido de Mercado Libre.",
      );
    }

    const callbackUrl = this.getWebhookUrl();
    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const appId = this.config.get("ML_CLIENT_ID");

    const subscribed: string[] = [];
    const failed: string[] = [];

    for (const topic of topics) {
      try {
        const res = await fetch(
          `${apiBase}/applications/${appId}/subscriptions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              topic,
              callback_url: callbackUrl,
            }),
          },
        );

        const data = (await res.json()) as Record<string, unknown>;
        if (res.ok) {
          subscribed.push(topic);
          this.logger.log(`Suscrito a ${topic} en ML`);
        } else {
          failed.push(`${topic}: ${(data as any).message ?? res.statusText}`);
          this.logger.warn(
            `Falló suscripción a ${topic}: ${JSON.stringify(data)}`,
          );
        }
      } catch (err) {
        failed.push(`${topic}: ${String(err)}`);
        this.logger.error(`Error suscribiendo a ${topic}: ${String(err)}`);
      }
    }

    return { subscribed, failed };
  }

  /** Lista suscripciones activas. */
  async listSubscriptions(userId: string): Promise<Record<string, unknown>[]> {
    if (!this.isConfigured()) {
      throw new BadRequestException("Mercado Libre no está configurado.");
    }

    const cred = await this.credentialRepository.findOne({ where: { userId } });
    if (!cred?.accessToken) {
      throw new BadRequestException("Cuenta de Mercado Libre no conectada.");
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      throw new BadRequestException(
        "No se pudo obtener token válido de Mercado Libre.",
      );
    }

    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const appId = this.config.get("ML_CLIENT_ID");

    const res = await fetch(`${apiBase}/applications/${appId}/subscriptions`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const data = (await res.json()) as Record<string, unknown>[];
    if (!res.ok) {
      throw new BadRequestException(
        `Mercado Libre: ${(data as any).message ?? res.statusText}`,
      );
    }
    return data;
  }

  /** Elimina una suscripción. */
  async unsubscribeTopic(userId: string, topic: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new BadRequestException("Mercado Libre no está configurado.");
    }

    const cred = await this.credentialRepository.findOne({ where: { userId } });
    if (!cred?.accessToken) {
      throw new BadRequestException("Cuenta de Mercado Libre no conectada.");
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      throw new BadRequestException(
        "No se pudo obtener token válido de Mercado Libre.",
      );
    }

    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const appId = this.config.get("ML_CLIENT_ID");

    const res = await fetch(
      `${apiBase}/applications/${appId}/subscriptions/${topic}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      throw new BadRequestException(
        `Mercado Libre: ${(data as any).message ?? res.statusText}`,
      );
    }
  }

  /** Procesa notificación entrante de ML (orders, payments, shipments, questions, etc.). */
  async handleWebhook(
    topic: string,
    resource: string,
    userId: string,
    signature?: string,
    rawBody?: string,
  ): Promise<{ processed: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { processed: false, message: "ML no configurado" };
    }

    const cred = await this.credentialRepository.findOne({ where: { userId } });
    if (!cred?.accessToken) {
      return { processed: false, message: "Usuario no conectado a ML" };
    }

    if (signature && rawBody) {
      const valid = this.verifySignature(
        rawBody,
        signature,
        this.config.get("ML_CLIENT_SECRET", ""),
      );
      if (!valid) {
        this.logger.warn(`Webhook: firma inválida para user ${userId}`);
        return { processed: false, message: "Invalid signature" };
      }
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      return { processed: false, message: "Token inválido" };
    }

    try {
      const apiBase =
        this.site() === "MLB"
          ? "https://api.mercadolivre.com"
          : "https://api.mercadolibre.com";
      const res = await fetch(`${apiBase}${resource}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        this.logger.warn(
          `Webhook: error fetching ${resource}: ${JSON.stringify(data)}`,
        );
        return {
          processed: false,
          message: `Error fetching resource: ${res.status}`,
        };
      }

      switch (topic) {
        case "orders_v2":
        case "orders": {
          const orderId = String(data.id);
          await this.importSingleOrder(userId, orderId, token);
          return { processed: true, message: `Order ${orderId} imported` };
        }
        case "payments": {
          const paymentId = String(data.id);
          await this.handlePaymentUpdate(userId, paymentId, token);
          return { processed: true, message: `Payment ${paymentId} processed` };
        }
        case "shipments": {
          const shipmentId = String(data.id);
          await this.handleShipmentUpdate(userId, shipmentId, token);
          return {
            processed: true,
            message: `Shipment ${shipmentId} processed`,
          };
        }
        case "questions": {
          const questionId = String(data.id);
          await this.handleQuestion(userId, questionId, token);
          return {
            processed: true,
            message: `Question ${questionId} processed`,
          };
        }
        case "claims": {
          const claimId = String(data.id);
          await this.handleClaim(userId, claimId, token);
          return { processed: true, message: `Claim ${claimId} processed` };
        }
        default:
          this.logger.log(`Webhook topic no manejado: ${topic}`);
          return { processed: false, message: `Topic ${topic} not handled` };
      }
    } catch (err) {
      this.logger.error(`Webhook error: ${String(err)}`);
      return { processed: false, message: String(err) };
    }
  }

  private async importSingleOrder(
    userId: string,
    orderId: string,
    token: string,
  ): Promise<void> {
    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const order = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Failed to fetch order ${orderId}`);

    const sale = this.mapOrder(order);
    await this.importService.importSales(userId);
  }

  private async handlePaymentUpdate(
    userId: string,
    paymentId: string,
    token: string,
  ): Promise<void> {
    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const payment = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Failed to fetch payment ${paymentId}`);

    const orderId = payment.order_id ? String(payment.order_id) : null;
    if (orderId) {
      await this.importSingleOrder(userId, orderId, token);
    }
  }

  private async handleShipmentUpdate(
    userId: string,
    shipmentId: string,
    token: string,
  ): Promise<void> {
    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/shipments/${shipmentId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const shipment = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Failed to fetch shipment ${shipmentId}`);

    const orderId = shipment.order_id ? String(shipment.order_id) : null;
    if (orderId) {
      await this.importSingleOrder(userId, orderId, token);
    }
  }

  private async handleQuestion(
    userId: string,
    questionId: string,
    token: string,
  ): Promise<void> {
    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/questions/${questionId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const question = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Failed to fetch question ${questionId}`);

    const from = question.from as Record<string, unknown> | undefined;
    this.logger.log(
      `Pregunta recibida en ML: item=${question.item_id}, from=${from?.id}, text=${question.text}`,
    );
    // TODO: Notificar al vendedor local (push, email, in-app notification)
    // TODO: Opcional: auto-responder preguntas frecuentes
  }

  private async handleClaim(
    userId: string,
    claimId: string,
    token: string,
  ): Promise<void> {
    const apiBase =
      this.site() === "MLB"
        ? "https://api.mercadolivre.com"
        : "https://api.mercadolibre.com";
    const res = await fetch(`${apiBase}/claims/${claimId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const claim = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Failed to fetch claim ${claimId}`);

    this.logger.warn(
      `Reclamo recibido en ML: claim_id=${claimId}, type=${claim.type}, status=${claim.status}, order_id=${claim.order_id}`,
    );
    // TODO: Crear/actualizar disputa local, notificar al vendedor, integrar con flujo de resolución
    const orderId = claim.order_id ? String(claim.order_id) : null;
    if (orderId) {
      await this.importSingleOrder(userId, orderId, token);
    }
  }

  setImportService(importService: any): void {
    this.importService = importService;
  }

  /** Obtiene atributos de categoría ML para una categoría local (para UI de validación previa). */
  async getCategoryAttributesForLocal(localCategory: string): Promise<{
    mlCategoryId: string | null;
    required: Array<{
      id: string;
      name: string;
      value_type: string;
      values?: Array<{ id: string; name: string }>;
    }>;
    optional: Array<{
      id: string;
      name: string;
      value_type: string;
      values?: Array<{ id: string; name: string }>;
    }>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        mlCategoryId: null,
        required: [],
        optional: [],
        error: "ML no configurado",
      };
    }

    const cred = await this.credentialRepository.findOne({
      where: { userId: "" },
    });
    if (!cred?.accessToken) {
      return {
        mlCategoryId: null,
        required: [],
        optional: [],
        error: "Sin token ML",
      };
    }

    const token = await this.ensureFreshToken(cred);
    if (!token) {
      return {
        mlCategoryId: null,
        required: [],
        optional: [],
        error: "Token inválido",
      };
    }

    const mlCategoryId = CATEGORY_MAP[localCategory as ProductCategory];
    if (!mlCategoryId) {
      return {
        mlCategoryId: null,
        required: [],
        optional: [],
        error: `Categoría ${localCategory} no mapeada`,
      };
    }

    const attrs = await this.getCategoryAttributes(mlCategoryId, token);

    const required = attrs
      .filter((a) => a.tags?.required || a.tags?.catalog_required)
      .map((a) => ({
        id: a.id,
        name: a.name,
        value_type: a.value_type,
        values: a.values?.slice(0, 20),
      }));

    const optional = attrs
      .filter(
        (a) => !a.tags?.required && !a.tags?.catalog_required && !a.tags?.fixed,
      )
      .map((a) => ({
        id: a.id,
        name: a.name,
        value_type: a.value_type,
        values: a.values?.slice(0, 20),
      }));

    return { mlCategoryId, required, optional };
  }

  private verifySignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    if (!secret) {
      this.logger.warn(
        "ML_CLIENT_SECRET no configurado, saltando verificación de firma",
      );
      return true;
    }
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }

  private importService: any;
}
