# Backend - Guía de Avance y Recomendaciones

## Estado Actual

Backend NestJS + TypeORM + PostgreSQL con módulos completos: Auth, Users, Products, Orders, Verifications y Reviews. Entidades con índices, constraints y relaciones configuradas.

---

## Estructura del Proyecto

```
backend/src/
├── auth/                    # Autenticación JWT + roles
│   ├── decorators/          # Decoradores personalizados
│   ├── guards/              # JwtAuthGuard, RolesGuard
│   ├── strategies/          # JwtStrategy
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── users/                   # Gestión de usuarios
│   ├── dto/                 # CreateUserDto, UpdateUserDto, LoginDto
│   ├── user.entity.ts       # Índices: email, role
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
├── products/                # Productos nuevos y usados
│   ├── dto/                 # CreateProductDto, FilterProductDto
│   ├── product.entity.ts    # Índices: status+category, sellerId, price
│   ├── products.controller.ts
│   ├── products.module.ts
│   └── products.service.ts
├── orders/                  # Órdenes con custodia
│   ├── dto/                 # CreateOrderDto, UpdateOrderDto
│   ├── order.entity.ts      # Índices: buyerId+status, status+createdAt
│   ├── orders.controller.ts
│   ├── orders.module.ts
│   └── orders.service.ts
├── verifications/           # Verificación productos usados
│   ├── dto/                 # CreateVerificationDto
│   ├── verification.entity.ts # Índices: productId+result
│   ├── verifications.controller.ts
│   ├── verifications.module.ts
│   └── verifications.service.ts
├── reviews/                 # Reseñas y quejas
│   ├── dto/                 # CreateReviewDto, FilterReviewDto
│   ├── review.entity.ts     # Índices: buyerId+productId (unique), sellerId
│   ├── reviews.controller.ts
│   ├── reviews.module.ts
│   └── reviews.service.ts
├── database/
│   ├── data-source.ts       # Configuración TypeORM CLI
│   └── migrations/          # Migraciones
├── app.module.ts            # Módulo raíz
└── main.ts                  # Bootstrap con Swagger
```

---

## Buenas Prácticas TypeORM Implementadas

### 1. Entidades

```typescript
// ✅ Índices compuestos para queries frecuentes
@Entity('products')
@Index(['status', 'category'])
@Index(['sellerId', 'status'])

// ✅ Constraints de validación a nivel DB
@Check(`"rating" >= 1 AND "rating" <= 5`)

// ✅ Tipos explícitos en columnas
@Column({ type: 'varchar', length: 200 })
@Column({ type: 'timestamptz' })  // Timestamps con timezone

// ✅ Soft deletes
@DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })

// ✅ Relaciones con onDelete configurado
@ManyToOne(() => User, { onDelete: 'CASCADE' })
@ManyToOne(() => User, { onDelete: 'SET NULL' })
```

### 2. Servicios

```typescript
// ✅ QueryBuilder para queries complejas
const query = this.productRepository.createQueryBuilder('product')
  .leftJoinAndSelect('product.seller', 'seller')
  .where('product.status = :status', { status: ProductStatus.PUBLISHED });

// ✅ Paginación
const [data, total] = await query
  .skip(skip)
  .take(limit)
  .getManyAndCount();

// ✅ Transacciones para operaciones críticas
async create(dto: CreateReviewDto, buyerId: string): Promise<Review> {
  return this.dataSource.transaction(async (manager) => {
    const review = manager.create(Review, { ...dto, buyerId });
    return manager.save(review);
  });
}
```

### 3. DTOs

```typescript
// ✅ Validación estricta con class-validator
@IsNumber()
@Min(1)
@Max(5)
rating: number;

// ✅ Validación condicional
@ValidateIf((o) => o.type === ReviewType.COMPLAINT)
@IsString()
@MinLength(20)
complaintReason?: string;

// ✅ Transformación automática
transform: true,
transformOptions: { enableImplicitConversion: true }
```

### 4. Controladores

```typescript
// ✅ Documentación Swagger completa
@ApiTags('Reviews')
@ApiOperation({ summary: 'Crear reseña' })
@ApiResponse({ status: 201, description: 'Creada exitosamente' })
@ApiResponse({ status: 400, description: 'Datos inválidos' })

// ✅ Guards y decoradores
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
```

---

## Fase 1: Configuración Inicial (Semana 1)

### 1.1 Instalar dependencias
```bash
cd backend
npm install
```

### 1.2 Configurar PostgreSQL
```bash
docker run --name ers-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ers_components \
  -p 5432:5432 \
  -d postgres:15
```

### 1.3 Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con credenciales correctas
```

### 1.4 Ejecutar migraciones
```bash
npm run migration:run
npm run start:dev
```

**Verificar:** Swagger en `http://localhost:3000/api/docs`

---

## Fase 2: Completar Módulos Base (Semana 2)

### 2.1 Auth - Pendiente
- [ ] Login con Google OAuth
- [ ] Refresh tokens
- [ ] Rate limiting en endpoints de auth
- [ ] Bloqueo de cuenta tras intentos fallidos

### 2.2 Users - Pendiente
- [ ] Upload de avatar (S3/Cloudinary)
- [ ] Reset de contraseña por email
- [ ] Verificación de email

### 2.3 Products - Pendiente
- [ ] Upload múltiple de imágenes
- [ ] Sistema de favoritos/wishlist
- [ ] Productos relacionados
- [ ] Búsqueda full-text con Elasticsearch

### 2.4 Orders - Pendiente
- [ ] Integrar pasarela de pago (Stripe/MercadoPago)
- [ ] Sistema de envíos con tracking
- [ ] Facturación electrónica

### 2.5 Verifications - Pendiente
- [ ] Checklist predefinido por categoría
- [ ] Fotos del proceso de verificación
- [ ] Certificado PDF descargable

### 2.6 Reviews - Implementado
- [x] CRUD de reseñas (solo compradores verificados)
- [x] Calificación de vendedor y producto
- [x] Sistema de quejas con revisión de ERS
- [x] Cálculo automático de etiqueta de confianza
- [x] Protección contra quejas falsas
- [x] Estadísticas de vendedor

---

## Fase 3: Mejoras de Arquitectura (Semana 3-4)

### 3.1 Seguridad
```typescript
// helmet + rate limiting
import helmet from 'helmet';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
})
```

### 3.2 Logging y Monitoreo
- [ ] Winston o Pino para logs estructurados
- [ ] Sentry para error tracking
- [ ] Health checks endpoint

### 3.3 Caching
```typescript
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

CacheModule.registerAsync({
  useFactory: async () => ({
    store: redisStore,
    host: 'localhost',
    port: 6379,
    ttl: 60 * 1000,
  }),
});
```

### 3.4 WebSockets
- [ ] Notificaciones en tiempo real
- [ ] Chat comprador-vendedor
- [ ] Actualización de estado de órdenes

---

## Fase 4: Testing (Semana 4-5)

```bash
npm run test          # Tests unitarios
npm run test:cov      # Con cobertura
npm run test:e2e      # Tests end-to-end
```

| Módulo | Cobertura Objetivo |
|--------|-------------------|
| Services | 80% |
| Controllers | 70% |
| Guards/Strategies | 90% |

---

## Fase 5: Optimización (Semana 5-6)

### 5.1 Base de Datos
- [x] Índices en columnas frecuentemente consultadas
- [x] Pagination en endpoints de listado
- [ ] Query optimization avanzada

### 5.2 API
- [ ] Versionado de API (`/api/v1/`)
- [ ] Compresión de respuestas

### 5.3 Deploy
- [ ] Dockerfile para producción
- [ ] docker-compose con todos los servicios
- [ ] CI/CD con GitHub Actions

---

## Endpoints Implementados

### Auth
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Registro | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/profile` | Perfil | Sí |

### Users
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/users` | Listar usuarios | Sí |
| GET | `/api/users/:id` | Obtener usuario | No |
| PATCH | `/api/users/:id` | Actualizar | Sí |
| DELETE | `/api/users/:id` | Eliminar | Sí |

### Products
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/products` | Listar con filtros | No |
| GET | `/api/products/:id` | Detalle | No |
| POST | `/api/products` | Crear | Sí |
| PATCH | `/api/products/:id` | Actualizar | Sí |
| DELETE | `/api/products/:id` | Eliminar | Sí |

### Orders
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/orders` | Mis órdenes | Sí |
| GET | `/api/orders/:id` | Detalle orden | Sí |
| POST | `/api/orders` | Crear orden | Sí |
| PATCH | `/api/orders/:id` | Actualizar | Sí |
| POST | `/api/orders/:id/cancel` | Cancelar | Sí |

### Verifications
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/verifications/product/:id` | Verificaciones producto | No |
| GET | `/api/verifications/:id` | Detalle verificación | No |
| POST | `/api/verifications` | Crear | Admin |

### Reviews
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/reviews` | Listar con filtros | No |
| GET | `/api/reviews/:id` | Detalle reseña | No |
| GET | `/api/reviews/seller/:id` | Reseñas vendedor | No |
| GET | `/api/reviews/product/:id` | Reseñas producto | No |
| GET | `/api/reviews/trust-badge/:sellerId` | Etiqueta confianza | No |
| GET | `/api/reviews/stats/:sellerId` | Estadísticas vendedor | No |
| POST | `/api/reviews` | Crear reseña | Sí |
| PATCH | `/api/reviews/:id/resolve` | Resolver queja | Admin |

---

## Tecnologías Pendientes de Integración

| Tecnología | Propósito | Prioridad |
|------------|-----------|-----------|
| Redis | Cache + Sessions | Alta |
| Stripe/MercadoPago | Pagos | Alta |
| Cloudinary/S3 | Imágenes | Alta |
| Bull | Colas de jobs | Media |
| Elasticsearch | Búsqueda avanzada | Media |
| Socket.io | WebSockets | Media |
| Sentry | Error tracking | Baja |
| Grafana | Monitoreo | Baja |
