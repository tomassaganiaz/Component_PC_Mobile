import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { MlCredential } from "./ml-credential.entity";

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
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product: Record<string, unknown>;
  }[];
  buyer: { id: string; name: string; email: string } | null;
}

const ML_STATUS_MAP: Record<string, string> = {
  paid: "paid",
  confirmed: "in_custody",
  payment_in_process: "pending",
  payment_required: "pending",
  partially_paid: "pending",
  cancelled: "cancelled",
};

@Injectable()
export class MercadoLibreService {
  private readonly logger = new Logger("MercadoLibre");

  constructor(
    @InjectRepository(MlCredential)
    private readonly credentialRepository: Repository<MlCredential>,
    private readonly config: ConfigService,
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
      expiresAt: new Date(Date.now() + Number(token.expires_in ?? 21600) * 1000),
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
      shippingAddress: order.shipping?.receiver_address?.address_line ?? undefined,
      paymentMethod: order.payments?.[0]?.payment_type ?? undefined,
      productId: first?.productId ?? "",
      createdAt: order.date_created ?? new Date().toISOString(),
      updatedAt: order.last_updated ?? order.date_created ?? new Date().toISOString(),
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
      mk(2, "NVIDIA RTX 4070 Super verificada", 620, "in_custody", "maria.gomez"),
      mk(3, "Samsung Galaxy S24 Ultra Sellado", 980, "pending", "comprador_uy_22"),
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
  ): Promise<{ source: "mercadolibre" | "mock" | "not_connected"; sales: MlSale[] }> {
    if (!this.isConfigured()) {
      return { source: "mock", sales: this.mockSales() };
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

      const res = await fetch(
        `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&sort=date_desc&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await res.json()) as { results?: unknown[] };
      const sales = (data.results ?? []).map((o) => this.mapOrder(o));
      return { source: "mercadolibre", sales };
    } catch (err) {
      this.logger.warn(`Fallo consultando ventas ML: ${String(err)}`);
      return { source: "mercadolibre", sales: [] };
    }
  }

  async disconnect(userId: string): Promise<void> {
    await this.credentialRepository.delete({ userId });
  }
}
