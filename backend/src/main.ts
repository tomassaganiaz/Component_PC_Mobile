import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, RequestMethod } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  const nodeEnv = configService.get("NODE_ENV", "development");
  const jwtSecret = configService.get("JWT_SECRET");
  if (nodeEnv === "production") {
    const weak =
      !jwtSecret ||
      jwtSecret === "default_secret" ||
      jwtSecret.includes("your_super_secret") ||
      jwtSecret.length < 32;
    if (weak) {
      logger.error(
        "JWT_SECRET inválido para producción: usá un secreto aleatorio de al menos 32 caracteres.",
      );
      process.exit(1);
    }
  }

  // Global prefix
  app.setGlobalPrefix("api", {
    exclude: [{ path: "/", method: RequestMethod.GET }],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Logging estructurado de peticiones (morgan-like)
  app.use((req: any, res: any, next: () => void) => {
    const start = Date.now();
    res.on("finish", () => {
      const uid = req.user?.id ? req.user.id.slice(0, 8) : "-";
      logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms user=${uid}`,
        "HTTP",
      );
    });
    next();
  });

  // CORS
  app.enableCors({
    origin: configService.get("CORS_ORIGIN", "*"),
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  // Imágenes locales de producto (backend/public servido en /static/...)
  app.useStaticAssets(join(process.cwd(), "public"), { prefix: "/static/" });

  // Swagger - Configuración completa
  const swaggerConfig = new DocumentBuilder()
    .setTitle("TechShield API")
    .setDescription(`
# TechShield API - Marketplace de Componentes PC y Móviles

Plataforma completa de compra-venta de componentes de hardware (CPUs, GPUs, RAM, almacenamiento, etc.) y dispositivos móviles con sistema de **escrow**, **verificación técnica**, **envíos integrados** y **integración con Mercado Libre**.

## Autenticación
- **JWT Bearer Token** en header: \`Authorization: Bearer <token>\`
- Obtener token: \`POST /api/auth/login\`
- Registrar usuario: \`POST /api/auth/register\`
- Refresh token: \`POST /api/auth/refresh\`

## Módulos principales

### 🛒 Products
- CRUD completo de productos (nuevos/usados/rotos)
- Variaciones (color, capacidad, etc.)
- Filtros avanzados: categoría, condición, precio, vendedor, garantía
- Stock atómico (previene sobreventa)

### 🛍️ Orders & Escrow
- Flujo completo: PENDING → PAID → IN_CUSTODY → SHIPPED → DELIVERED
- Wallet integrado (saldo, transacciones, retiros)
- Cupones de descuento
- Carrito de compras

### 🚚 Shipping & Delivery Planning
- Cotización de envíos (Andreani, OCA, retiro en sucursal)
- Tracking en tiempo real con mapa estático
- **Planificación automática de rutas** (cron 06:00 diario)
- 14 zonas de entrega en Argentina (CABA, GBA, La Plata, Mar del Plata, Bolívar, etc.)
- Optimización de rutas (Nearest Neighbor desde CABA)

### 📱 Driver App
- Dashboard del repartidor
- Navegación GPS (Google Maps / Waze)
- Estados: LLEGÓ → ENTREGADO / FALLÓ
- Notificaciones push/email/SMS automáticas

### 🔗 Mercado Libre Integration
- OAuth 2.0 completo (connect/disconnect/callback)
- Publicar productos en ML (con variaciones)
- Sync stock/precio/estado
- Webhooks asíncronos con **retry exponencial + Dead Letter Queue**
- Importar ventas ML → órdenes locales (escrow/wallet/shipping)

### 🗺️ Google Maps
- Geocoding / Reverse Geocoding
- Directions (ruta, distancia, tiempo, pasos)
- Distance Matrix
- Static Maps con ruta y marcadores
- Places Nearby (puntos de recogida: correo, tiendas, lockers)
- Estimación de fecha de entrega por zona/servicio

### 🔔 Notifications
- Multi-canal: Push (Firebase), Email (SendGrid), SMS (Twilio), In-App
- Tipos: delivery_assigned, delivery_started, delivery_approaching, delivery_completed, delivery_failed
- Templates HTML responsivos para email

## Códigos de error comunes
| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Validación fallida |
| 401 | Unauthorized - Token inválido/expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no existe |
| 409 | Conflict - Conflicto (ej. stock insuficiente) |
| 422 | Unprocessable Entity - Error de negocio |
| 500 | Internal Server Error |

## Paginación
- Parámetros: \`page\` (default 1), \`limit\` (default 20, max 100)
- Respuesta incluye: \`total\`, \`page\`, \`limit\`, \`totalPages\`, \`hasMore\`

## Webhooks Mercado Libre
- Endpoint: \`POST /api/mercadolibre/webhook\`
- Firma HMAC-SHA256 en header \`x-meli-signature\`
- Procesamiento asíncrono con retry exponencial (max 5 reintentos)
- Dead Letter Queue tras 6 intentos fallidos
- Health check: \`GET /api/mercadolibre/webhook/health\`
    `)
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Ingresar token JWT",
        in: "header",
      },
      "JWT-auth",
    )
    .addTag("Auth", "🔐 Autenticación y registro")
    .addTag("Users", "👤 Gestión de usuarios y perfiles")
    .addTag("Products", "🛒 Productos (nuevos, usados, rotos) y variaciones")
    .addTag("Orders", "🛍️ Órdenes, escrow, wallet, cupones, carrito")
    .addTag("Verifications", "✅ Verificación técnica de productos usados")
    .addTag("Reviews", "⭐ Reseñas y quejas")
    .addTag("Analytics", "📊 Eventos de analytics")
    .addTag("Shipping", "🚚 Envíos, cotizaciones, tracking")
    .addTag("Delivery Planning", "🗺️ Planificación automática de rutas de reparto")
    .addTag("Driver App", "📱 App del repartidor (dashboard, navegación, estados)")
    .addTag("Mercado Libre", "🔗 Integración completa con Mercado Libre (OAuth, publicaciones, webhooks)")
    .addTag("Google Maps", "🗺️ Geocoding, Directions, Places, Static Maps, estimaciones")
    .addTag("Notifications", "🔔 Notificaciones multi-canal (Push, Email, SMS, In-App)")
    .addServer("http://localhost:3000", "Desarrollo local")
    .addServer("https://api.techshield.com", "Producción")
    .setContact("TechShield Team", "https://techshield.com", "dev@techshield.com")
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: "TechShield API Docs",
    customfavIcon: "/static/favicon.ico",
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #00a884; font-size: 36px; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 8px; }
      .swagger-ui .opblock-tag { font-weight: 600; }
      .swagger-ui .opblock-summary-method { font-weight: 700; }
    `,
  });

  const port = configService.get("PORT", 3000);
  await app.listen(port);

  logger.log(`Application running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
