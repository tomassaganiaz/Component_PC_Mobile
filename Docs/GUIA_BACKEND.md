# Guía Backend — ERS / TechShield (NestJS)

Guía general para entender **qué hace cada carpeta** del backend y poder explicarlo en una defensa oral.

## 1. Qué es

API REST del marketplace. Stack: **NestJS + TypeORM + PostgreSQL**, autenticación **JWT** (access + refresh), validación con **class-validator**, documentación **Swagger**.

- Base URL: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- Prefijo global: `api`

```bash
cd backend
npm install
npm run start:dev        # servidor con hot-reload (3000)
npm run build            # compilar
npm run test             # unit tests
npm run test:e2e         # e2e (usa Postgres de test)
npm run smoke            # smoke contra la API levantada
npm run migration:run    # migraciones
```

## 2. Estructura de carpetas (lo importante para defender)

```
backend/
├── src/
│   ├── main.ts                 # Bootstrap: prefijo /api, ValidationPipe global, CORS, Swagger
│   ├── app.module.ts           # Módulo raíz: conecta TypeORM y registra todos los módulos
│   ├── app.controller.ts       # Endpoints base (health)
│   │
│   ├── auth/                   # Autenticación y autorización
│   │   ├── guards/             # JwtAuthGuard (¿token válido?) + RolesGuard (¿rol permitido?)
│   │   ├── strategies/         # JwtStrategy (valida el token y arma req.user)
│   │   ├── decorators/         # @Roles(...)
│   │   ├── entities/           # refresh-token.entity.ts (rotación de refresh tokens)
│   │   ├── dto/                # OTP, refresh token
│   │   └── auth.service.ts     # login, refresh, logout, OTP
│   │
│   ├── users/                  # Usuarios (comprador / vendedor / admin)
│   │   ├── user.entity.ts      # Tabla users + índices
│   │   ├── users.seed.ts       # Cuenta demo (owner/admin)
│   │   └── users.service.ts
│   │
│   ├── products/               # Catálogo de productos
│   │   ├── product.entity.ts   # Tabla products (stock, status, precio, índices)
│   │   ├── dto/                # CreateProductDto, UpdateProductDto, FilterProductDto
│   │   ├── products.seed.ts    # Datos demo (vendedores, productos, reseñas)
│   │   └── products.service.ts # Búsqueda/filtros, enriquecimiento, STOCK ATÓMICO
│   │
│   ├── orders/                 # Órdenes de compra (custodia/escrow)
│   │   ├── order.entity.ts     # Tabla orders (estados, fechas de custodia)
│   │   ├── dto/
│   │   └── orders.service.ts   # create, pay, ship, deliver, cancel, return, protection, sales
│   │
│   ├── verifications/          # Auditoría técnica de productos usados (rol admin)
│   │   └── verification.entity.ts
│   │
│   ├── reviews/                # Reseñas y quejas + trust-badge del vendedor
│   │   ├── review.entity.ts
│   │   └── reviews.service.ts  # cálculo de positividad, badge, stats
│   │
│   ├── reports/                # Reportes/denuncias de usuarios
│   ├── chat/                   # Chequeo de seguridad de mensajes (anti-estafa)
│   ├── analytics/              # Eventos del frontend (vistas, compras, etc.)
│   ├── media/                  # Proxy/optimización de imágenes (sharp)
│   │
│   ├── common/                 # Utilidades transversales (ThrottlerUserGuard)
│   └── database/
│       ├── data-source.ts      # Config TypeORM para la CLI
│       └── migrations/         # Migraciones (esquema + AddProductStock)
│
├── test/                       # Tests E2E (Jest + Supertest) y helpers
│   ├── test-app.ts             # Crea la app real contra la DB de test
│   ├── setup-env.ts            # Fuerza env de test
│   ├── global-setup.js         # Crea/limpia la DB de test
│   └── *.e2e-spec.ts
└── scripts/
    ├── smoke.js                # Prueba rápida de la API viva
    └── tunnel.js              # Túnel ngrok para exponer la API
```

**Idea clave:** cada dominio (users, products, orders…) es un **módulo** con 4 piezas típicas:
`controller` (rutas HTTP) → `service` (lógica) → `entity` (tabla) → `dto` (validación de entrada).

## 3. Request lifecycle (cómo viaja una petición)

```
HTTP → Controller → Guards (JwtAuthGuard + RolesGuard)
     → Pipes (ValidationPipe / ParseUUIDPipe) → Service → Repository (TypeORM) → PostgreSQL
```

- **Guards**: `JwtAuthGuard` verifica el token; `RolesGuard` + `@Roles('admin')` restringe por rol.
- **Pipes**: `ValidationPipe` global valida y limpia el body (`whitelist` + `forbidNonWhitelisted`); `ParseUUIDPipe` valida que los `:id` sean UUID (si no → **400**, antes daba 500).

## 4. Autenticación y roles

- **Access token** JWT (corto) + **Refresh token** JWT (largo) con **rotación y revocación** (tabla `refresh_tokens`, guardado como hash).
- Login puede requerir **OTP** si el usuario lo tiene activo.
- Roles: `buyer`, `seller`, `admin`.
  - `seller`: gestiona **su propio** catálogo (crear/editar/borrar sus productos).
  - `admin`: verifica productos, resuelve quejas, modera.

## 5. Modelo de datos (tablas principales)

| Tabla | Qué guarda |
|---|---|
| `users` | Nombre, email, password (hash), rol, KYC (teléfono/documento), OTP |
| `products` | Título, descripción, precio, categoría, estado, **stock**, garantía, seller_id |
| `orders` | Compra: total, estado, dirección, método de pago, fechas de custodia, buyer_id, product_id |
| `verifications` | Informe técnico de productos usados (admin) |
| `reviews` | Reseñas/quejas + rating (vendedor/producto) |
| `refresh_tokens` | Refresh tokens rotados |

Estados de **product**: `draft, pending, verified, published, sold`.
Estados de **order**: `pending, paid, in_custody, shipped, delivered, cancelled, refunded`.

## 6. Flujo de compra (lo más importante de la defensa)

1. **Vendedor** publica producto → `status = published`, `stock` (default 1).
2. **Comprador** compra → `POST /orders`:
   - **reserva stock de forma atómica** (`UPDATE ... WHERE stock > 0`). Si no hay → **400**. Evita sobreventa.
   - la orden nace en `pending`; si el stock llega a 0 el producto pasa a `sold`.
3. `POST /orders/:id/pay` (comprador) → `paid` + inicio de custodia.
4. `POST /orders/:id/ship` (vendedor) → `shipped`.
5. `POST /orders/:id/deliver` (comprador) → `delivered` + fin de custodia.
6. **Protección**: devolución 10 días / cobertura 45 días (`GET /orders/:id/protection`). Cancelar/devolver **repone stock**.

## 7. Endpoints principales

| Módulo | Método y ruta | Descripción | Auth |
|---|---|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` | Registro / login | No |
| Auth | `POST /auth/refresh` · `POST /auth/logout` | Rotar / cerrar sesión | No |
| Auth | `GET /auth/profile` | Perfil | Sí |
| Products | `GET /products` (filtros + paginación) | Catálogo | No |
| Products | `GET /products/:id` · `GET /products/seller/:sellerId` | Detalle / por vendedor | No |
| Products | `POST /products` · `PATCH /products/:id` | Crear / editar (dueño) | Seller/Admin |
| Products | `DELETE /products/:id` | Borrar **solo vendidos** | Seller/Admin |
| Orders | `POST /orders` | Comprar | Sí |
| Orders | `GET /orders` · `GET /orders/sales` | Mis compras / mis ventas | Sí (sales: seller) |
| Orders | `GET /orders/:id` · `/protection` | Detalle / protección | dueño/vendedor/admin |
| Orders | `POST /orders/:id/pay\|ship\|deliver\|cancel` | Transiciones de estado | según rol |
| Orders | `PATCH /orders/:id` | Override manual | Admin |
| Reviews | `GET /reviews*` · `POST /reviews` | Listar / crear reseña | mixto |
| Verifications | `POST /verifications` | Crear informe | Admin |

## 8. Testing

- **Unit (Jest)**: 113 tests (services y controllers con repos mockeados).
- **E2E (Supertest)**: 58 tests contra **PostgreSQL de test** (`ers_components_test`, se crea/limpia en `test/global-setup.js`).
- **Smoke**: `npm run smoke` (10 checks contra la API levantada).

## 9. Defensa oral — preguntas probables

- **¿Por qué NestJS?** Arquitectura modular por dominio, inyección de dependencias, guards/pipes reutilizables y Swagger integrado.
- **¿Cómo autenticás?** JWT con access + refresh; el refresh se rota y se revoca (hash en DB).
- **¿Cómo evitás sobreventa?** Decremento **atómico** de stock con `UPDATE ... WHERE stock > 0`; si no afecta filas, rechazo 400.
- **¿Cómo protegés rutas?** `JwtAuthGuard` (token) + `RolesGuard`/`@Roles` (rol); en órdenes además se valida **dueño** (comprador/vendedor/admin).
- **¿Cómo validás datos?** `class-validator` en DTOs + `ValidationPipe` global con `whitelist`. IDs con `ParseUUIDPipe` (400 si no es UUID).
- **¿Qué es la custodia?** Los fondos quedan “retenidos” y el vendedor no cobra hasta la confirmación; la orden modela el ciclo con estados y ventanas de devolución/cobertura.
- **¿Cómo corren los tests?** Unit mockean repositorios; E2E levantan la app real contra una DB Postgres de test aislada.

## 10. Pendiente (para reconocer límites)

Carrito multi-producto, pasarela de pago real + reembolso efectivo, wallet/payouts del vendedor, notificaciones en tiempo real (WebSockets), panel admin completo.
