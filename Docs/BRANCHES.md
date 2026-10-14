# ERS - Estrategia de Ramificación e Informe de Implementaciones Backend

## Estrategia de Ramificación

### Diagrama de Ramas

```
                    main
                   ╱    ╲
              develop    release/v1.0
             ╱    ╲          ╲
      feature/auth   feature/users
      feature/products feature/orders
      feature/verifications feature/reviews
      feature/database hotfix/patch
```

### Convención de Nombres

```
main                    → Código listo para producción
develop                 → Integración continua
feature/{nombre}        → Nuevas funcionalidades
release/{versión}       → Preparación de release
hotfix/{descripción}    → Correcciones de emergencia
```

### Flujo de Trabajo

```
1. Crear rama desde develop
2. Implementar funcionalidad
3. Hacer commits atómicos
4. Push a origin/feature/{nombre}
5. Pull Request a develop
6. Code review
7. Merge a develop
8. Cuando esté listo, merge develop → main
9. Crear tag de versión
```

---

## Ramas de Funcionalidades

### 🔹 Rama: develop

**Base de todas las funcionalidades**

| Atributo | Descripción |
|----------|-------------|
| **Desde** | `main` |
| **Hacia** | `main` (via release) |
| **Estado** | 🟢 Activa |
| **Propósito** | Integración de todas las features |

**Contenido:**
- Estructura base del proyecto NestJS
- Configuración TypeORM
- Configuración Swagger
- Dependencias instaladas
- Conexión a base de datos PostgreSQL
- Configuración CORS

---

### 🔹 Rama: feature/auth

**Módulo de autenticación**

| Atributo | Detalle |
|----------|---------|
| **Desde** | `develop` |
| **Estado** | ✅ Completada |
| **Commits** | ~15 archivos |

**Implementaciones:**

#### Archivos Creados

```
backend/src/auth/
├── auth.controller.ts          # Endpoints REST
├── auth.service.ts             # Lógica de negocio
├── auth.module.ts              # Configuración del módulo
├── decorators/
│   └── roles.decorator.ts      # @Roles() para permisos
├── guards/
│   ├── jwt-auth.guard.ts       # Guard para verificar JWT
│   └── roles.guard.ts          # Guard para verificar roles
└── strategies/
    └── jwt.strategy.ts         # Estrategia de validación JWT
```

#### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Registro de usuario | No |
| POST | `/api/auth/login` | Inicio de sesión | No |
| GET | `/api/auth/profile` | Perfil del usuario | Sí (JWT) |

#### DTOs

- `CreateUserDto` - Registro con validación
- `UpdateUserDto` - Actualización de perfil
- `LoginDto` - Credenciales con validación

#### Validaciones Implementadas

```typescript
// Email único
findOne({ where: { email } })

// Hash con bcrypt (10 rounds)
bcrypt.hash(password, 10)

// Verificación de contraseña
bcrypt.compare(password, user.password)

// JWT con configuración desde variables de entorno
JwtModule.registerAsync({
  secret: configService.get('JWT_SECRET'),
  signOptions: { expiresIn: configService.get('JWT_EXPIRATION', '7d') }
})
```

#### Pruebas

- `auth.service.spec.ts` - Tests del servicio (validateUser, login, getProfile)
- `auth.controller.spec.ts` - Tests del controlador
- `auth.e2e-spec.ts` - Tests end-to-end (register, login, profile)

---

### 🔹 Rama: feature/users

**Gestión de usuarios**

| Atributo | Detalle |
|----------|---------|
| **Desde** | `develop` |
| **Estado** | ✅ Completada |

**Implementaciones:**

#### Entidad User

```typescript
@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['deleted_at'])
export class User {
  // Campos
  id: UUID
  name: VARCHAR(100)
  email: VARCHAR(255) UNIQUE
  password: VARCHAR(255) SELECT: false
  phone: VARCHAR(20)
  avatar: VARCHAR(500)
  role: user_role DEFAULT 'buyer'
  is_active: BOOLEAN DEFAULT true
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  deleted_at: TIMESTAMPTZ  // Soft delete

  // Relaciones
  products: Product[]
  orders: Order[]
  reviewsGiven: Review[]
  reviewsReceived: Review[]
}
```

#### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/users` | Listar usuarios | Sí |
| GET | `/api/users/:id` | Obtener usuario | No |
| PATCH | `/api/users/:id` | Actualizar usuario | Sí |
| DELETE | `/api/users/:id` | Eliminar usuario (soft) | Sí |

#### Servicios

| Método | Descripción | Validaciones |
|--------|-------------|--------------|
| `create()` | Crear usuario | Email único, hash password |
| `findAll()` | Listar usuarios | - |
| `findOne()` | Buscar por ID | NotFoundException |
| `findByEmail()` | Buscar por email | Incluye password |
| `update()` | Actualizar | NotFoundException |
| `remove()` | Soft delete | NotFoundException |

#### Pruebas

- `users.service.spec.ts` - Tests completos del servicio
- `users.controller.spec.ts` - Tests del controlador

---

### 🔹 Rama: feature/products

**CRUD de productos nuevos y usados**

| Atributo | Detalle |
|----------|---------|
| **Desde** | `develop` |
| **Estado** | ✅ Completada |

**Implementaciones:**

#### Entidad Product

```typescript
@Entity('products')
@Index(['status', 'category'])
@Index(['sellerId', 'status'])
@Index(['condition', 'status'])
@Index(['price'])
export class Product {
  // Estados: DRAFT, PENDING, VERIFIED, PUBLISHED, SOLD
  // Condiciones: NEW, USED
  // Categorías: CPU, GPU, RAM, STORAGE, MOTHERBOARD, PSU,
  //             CASE, COOLING, MONITOR, KEYBOARD, MOUSE, PHONE, TABLET, OTHER

  // Campos
  id: UUID
  title: VARCHAR(200)
  description: TEXT
  price: DECIMAL(10,2)
  condition: product_condition
  category: product_category
  status: product_status DEFAULT 'draft'
  images: TEXT[]
  hours_of_use: INTEGER (solo usado)
  physical_state: VARCHAR(500)
  brand: VARCHAR(100)
  model: VARCHAR(200)
  average_rating: DECIMAL(3,2)
  review_count: INTEGER DEFAULT 0
  seller_id: UUID FK → users(id) ON DELETE CASCADE
}
```

#### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/products` | Listar con filtros | No |
| GET | `/api/products/:id` | Detalle de producto | No |
| POST | `/api/products` | Publicar producto | Sí |
| PATCH | `/api/products/:id` | Actualizar | Sí |
| DELETE | `/api/products/:id` | Eliminar | Sí |
| GET | `/api/products/seller/:sellerId` | Productos por vendedor | No |

#### Filtros Disponibles

```typescript
interface FilterProductDto {
  category?: ProductCategory;      // GPU, CPU, RAM, etc.
  condition?: ProductCondition;    // new, used
  minPrice?: number;               // Precio mínimo
  maxPrice?: number;               // Precio máximo
  search?: string;                 // Búsqueda en título y descripción
}
```

#### Estados del Producto

```
DRAFT ──► PENDING ──► VERIFIED ──► PUBLISHED ──► SOLD
  │           │              │
  │           ▼              ▼
  │        REJECTED       FAILED
  │           │              │
  └───────────┴──────────────┘
```

#### Pruebas

- `products.service.spec.ts` - Tests completos (create, findAll con filtros, findOne, findBySeller, update, remove)
- `products.controller.spec.ts` - Tests del controlador
- `products.e2e-spec.ts` - Tests e2e (CRUD completo)

---

### 🔹 Rama: feature/orders

**Sistema de órdenes con custodia de pago (3 días)**

| Atributo | Detalle |
|----------|---------|
| **Desde** | `develop` |
| **Estado** | ✅ Completada |

**Implementaciones:**

#### Entidad Order

```typescript
@Entity('orders')
@Index(['buyerId', 'status'])
@Index(['status', 'createdAt'])
export class Order {
  // Estados: pending, paid, in_custody, shipped, delivered, cancelled, refunded
  id: UUID
  total: DECIMAL(10,2)
  status: order_status DEFAULT 'pending'
  shipping_address: VARCHAR(500)
  payment_method: VARCHAR(50)
  custody_start_date: TIMESTAMPTZ  // Inicio custodia
  custody_end_date: TIMESTAMPTZ    // Fin custodia (+3 días)
  cancellation_reason: TEXT
  buyer_id: UUID FK → users(id) ON DELETE CASCADE
  product_id: UUID FK → products(id) ON DELETE CASCADE
}
```

#### Lógica de Custodia

```typescript
// Al crear la orden
order.custodyStartDate = new Date();
order.custodyEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 días

// Al cancelar (solo pending)
if (order.status !== OrderStatus.PENDING) {
  throw new BadRequestException('Solo se pueden cancelar órdenes pendientes');
}
// Liberar el producto de vuelta a published
```

#### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/orders` | Mis órdenes | Sí |
| GET | `/api/orders/:id` | Detalle orden | Sí |
| POST | `/api/orders` | Crear orden | Sí |
| PATCH | `/api/orders/:id` | Actualizar estado | Sí |
| POST | `/api/orders/:id/cancel` | Cancelar orden | Sí |

#### Validaciones

- Solo se pueden crear órdenes de productos no vendidos
- Solo el comprador puede ver/sus órdenes
- Solo se puede cancelar si está en estado `pending`
- El producto se marca como `sold` al crear la orden

#### Pruebas

- `orders.service.spec.ts` - Tests completos (create, findByBuyer, findOne, update, cancel)
- `orders.controller.spec.ts` - Tests del controlador

---

### 🔹 Rama: feature/verifications

**Sistema de verificación profesional de productos usados (solo admin)**

| Atributo | Detalle |
|----------|---------|
| **Desde** | `develop` |
| **Estado** | ✅ Completada |

**Implementaciones:**

#### Entidad Verification

```typescript
@Entity('verifications')
@Index(['productId', 'result'])
@Index(['verifiedBy'])
export class Verification {
  // Resultados: pass, fail, conditional
  id: UUID
  result: verification_result
  notes: TEXT  // Notas detalladas del testeo
  hours_of_use: INTEGER  // Horas reales de uso
  physical_state: VARCHAR(500)
  functional_test: VARCHAR(500)
  cosmetic_grade: VARCHAR(10)  // A, B, C, D
  quality_score: DECIMAL(3,2)  // 0.00 - 5.00
  product_id: UUID FK → products(id) ON DELETE CASCADE
  verified_by: UUID FK → users(id) ON DELETE SET NULL
}
```

#### Flujo de Verificación

```
1. Vendedor publica producto (status: PENDING)
2. Empleado ERS retira producto
3. Testing profesional:
   - Verificación de declaración del vendedor
   - Tests de calidad general
   - Tests en uso según tipo de producto
   - Revisión interna de horas de uso
4. Calificación:
   - PASS → status: VERIFIED
   - FAIL → status: DRAFT
   - CONDITIONAL → status: VERIFIED (con notas)
```

#### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/verifications/product/:id` | Verificaciones de producto | No |
| GET | `/api/verifications/:id` | Detalle verificación | No |
| POST | `/api/verifications` | Crear verificación | Admin |

#### Lógica del Servicio

```typescript
async create(dto, verifiedBy) {
  // Solo productos usados
  if (product.condition !== ProductCondition.USED) {
    throw new BadRequestException('Solo productos usados');
  }

  // Crear verificación
  // Actualizar estado del producto según resultado
  // Si PASS → VERIFIED
  // Si FAIL → DRAFT
}
```

#### Pruebas

- `verifications.service.spec.ts` - Tests completos (create, findByProduct, findOne)
- `verifications.controller.spec.ts` - Tests del controlador

---

### 🔹 Rama: feature/reviews

**Sistema de reseñas, quejas y etiquetas de confianza**

| Atributo | Detalle |
|----------|---------|
| **Desde** | `develop` |
| **Estado** | ✅ Completada |

**Implementaciones:**

#### Entidad Review

```typescript
@Entity('reviews')
@Index(['buyerId', 'productId'], { unique: true })  // Una reseña por compra
@Index(['sellerId', 'status'])
@Index(['productId', 'status'])
@Check('"rating" >= 1 AND "rating" <= 5')
export class Review {
  // Tipos: positive, neutral, complaint
  // Estados: pending, approved, rejected, resolved
  id: UUID
  rating: SMALLINT  // 1-5
  type: review_type
  status: review_status DEFAULT 'pending'
  comment: TEXT
  seller_rating: SMALLINT  // Calificación específica al vendedor
  product_rating: SMALLINT  // Calificación específica al producto
  complaint_reason: TEXT  // Obligatorio si type = complaint
  resolution_notes: TEXT
  is_verified_purchase: BOOLEAN DEFAULT false
  buyer_id: UUID FK → users(id) ON DELETE CASCADE
  seller_id: UUID FK → users(id) ON DELETE CASCADE
  product_id: UUID FK → products(id) ON DELETE CASCADE
  order_id: UUID FK → orders(id) ON DELETE SET NULL
  resolved_by: UUID FK → users(id)
}
```

#### TrustBadge - Etiquetas de Confianza

```typescript
enum TrustBadge {
  SAFE = 'safe',              // 🟢 4.0-5.0★, <10% quejas, 5+ ventas
  INTERMEDIATE = 'intermediate', // 🟡 3.0-3.9★, 10-25% quejas
  UNSAFE = 'unsafe',          // 🔴 <3.0★ o >25% quejas
}
```

#### Cálculo de TrustBadge

```typescript
// Fórmula:
// Puntuación = (Promedio calificaciones × 0.6) + (Factor quejas × 0.4)
// Factor quejas = 5 - (porcentaje de quejas × 5)

// Ejemplo:
// Vendedor con 4.2★ promedio y 8% de quejas
// Puntuación = (4.2 × 0.6) + (4.6 × 0.4) = 4.36 → ✓ SEGURO

// Vendedor con 3.1★ promedio y 30% de quejas
// Puntuación = (3.1 × 0.6) + (3.5 × 0.4) = 3.26 → ✗ NO SEGURO
```

#### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/reviews` | Listar con filtros | No |
| GET | `/api/reviews/:id` | Detalle reseña | No |
| GET | `/api/reviews/seller/:id` | Reseñas de vendedor | No |
| GET | `/api/reviews/product/:id` | Reseñas de producto | No |
| GET | `/api/reviews/trust-badge/:sellerId` | Etiqueta de confianza | No |
| GET | `/api/reviews/stats/:sellerId` | Estadísticas de vendedor | No |
| POST | `/api/reviews` | Crear reseña | Sí (comprador) |
| PATCH | `/api/reviews/:id/resolve` | Resolver queja | Admin |

#### Validaciones de Reseña

```typescript
// Solo compradores que compraron el producto
if (order.buyerId !== buyerId) throw BadRequestException();

// Solo productos entregados
if (order.status !== OrderStatus.DELIVERED) throw BadRequestException();

// Una reseña por compra
if (existingReview) throw ConflictException();

// Quejas requieren razón
if (type === COMPLAINT && !complaintReason) throw BadRequestException();

// Quejas van a revisión, aprobaciones son automáticas
status = type === COMPLAINT ? PENDING : APPROVED;
```

#### Pruebas

- `reviews.service.spec.ts` - Tests completos (create, findAll, TrustBadge, getSellerStats)
- `reviews.controller.spec.ts` - Tests del controlador

---

### 🔹 Rama: feature/database

**Schema y datos de la base de datos**

| Atributo | Detalle |
|----------|---------|
| **Desde** | `develop` |
| **Estado** | ✅ Completada |

**Implementaciones:**

#### Archivos Creados

```
database/
├── 01_schema.sql         # Schema completo (13 tablas, índices, triggers)
├── 02_seed_data.sql      # Datos de prueba (50+ registros)
└── README.md             # Documentación del schema
```

#### Tablas Creadas

| Tabla | Tipo | Descripción |
|-------|------|-------------|
| `users` | Principal | Usuarios con roles |
| `products` | Principal | Productos nuevos y usados |
| `orders` | Principal | Órdenes con custodia |
| `verifications` | Principal | Verificaciones de productos |
| `reviews` | Principal | Reseñas y quejas |
| `categories` | Secundaria | Categorías de productos |
| `product_images` | Secundaria | Imágenes de productos |
| `addresses` | Secundaria | Direcciones de usuarios |
| `favorites` | Secundaria | Favoritos |
| `messages` | Secundaria | Mensajes entre usuarios |
| `notifications` | Secundaria | Notificaciones |
| `verification_checklist` | Secundaria | Checklist de verificación |
| `verification_items` | Secundaria | Items verificados |

#### Features del Schema

```sql
-- UUID como primaria
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos enum
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');

-- Índices compuestos
CREATE INDEX idx_products_status_category ON products(status, category);

-- Constraints
CREATE CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5);

-- Soft delete
@DeleteDateColumn({ type: 'timestamptz' })
deleted_at TIMESTAMPTZ;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Diagrama de Dependencias entre Ramas

```
feature/auth ──────────────┐
                           ├──► feature/users ────────┐
                           │                           │
feature/database ──────────┤                           ├──► feature/products
                           │                           │
                           └──► feature/orders ────────┤
                                                       │
feature/verifications ─────────────────────────────────┤
                                                       │
                                                       ▼
                                               feature/reviews
                                                       │
                                                       ▼
                                                 develop → main
```

## Flujo de Merge

```
1. feature/auth ──────► develop
2. feature/users ─────► develop
3. feature/database ──► develop
4. feature/products ──► develop
5. feature/orders ────► develop
6. feature/verifications ─► develop
7. feature/reviews ───► develop

8. develop ──────────► release/v1.0
9. release/v1.0 ─────► main (con tag v1.0.0)
```

## Plan de Testing por Rama

| Rama | Test Unitarios | Test E2E | Coverage Objetivo |
|------|----------------|----------|-------------------|
| feature/auth | ✅ | ✅ | 80% |
| feature/users | ✅ | ✅ | 70% |
| feature/products | ✅ | ✅ | 80% |
| feature/orders | ✅ | ✅ | 70% |
| feature/verifications | ✅ | - | 80% |
| feature/reviews | ✅ | - | 80% |
| feature/database | - | ✅ | - |

## Checklist por Rama antes de Merge

```
✅ Todos los tests pasan
✅ Linting sin errores
✅ Documentación actualizada
✅ No hay conflictos con develop
✅ Code review aprobado
✅ Cambios en DB documentados
✅ DTOs validados
✅ Swagger actualizado
```

## Próximos Pasos (Ramas Futuras)

| Rama | Descripción | Prioridad |
|------|-------------|-----------|
| feature/payments | Integración Stripe/MercadoPago | Alta |
| feature/upload | Upload de imágenes (S3/Cloudinary) | Alta |
| feature/notifications | Sistema de notificaciones | Media |
| feature/chat | Chat comprador-vendedor | Media |
| feature/search | Búsqueda avanzada con Elasticsearch | Media |
| feature/webapp | Versión web con Next.js | Baja |
| feature/analytics | Dashboard de analytics | Baja |
| feature/ai | Recomendaciones con IA | Baja |
