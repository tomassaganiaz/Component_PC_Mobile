# Implementaciones Backend - ERS

## Documentación Técnica de Implementaciones

Este documento detalla todas las implementaciones realizadas en el backend de ERS, explicando la arquitectura, decisiones técnicas y cómo funciona cada componente.

---

## 1. Autenticación JWT

### Descripción
Sistema de autenticación basado en JSON Web Tokens con soporte para roles de usuario.

### Archivos Implementados

```
backend/src/auth/
├── auth.controller.ts      # Endpoints de login/register/profile
├── auth.module.ts          # Configuración del módulo
├── auth.service.ts         # Lógica de negocio
├── decorators/
│   └── roles.decorator.ts  # Decorador @Roles()
├── guards/
│   ├── jwt-auth.guard.ts   # Guard para verificar JWT
│   └── roles.guard.ts      # Guard para verificar roles
└── strategies/
    └── jwt.strategy.ts     # Estrategia de validación JWT
```

### Flujo de Autenticación

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Cliente │────►│  Login   │────►│  Auth    │────►│  JWT     │
│          │     │  Request │     │  Service │     │  Token   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                      │
                                      ▼
                                 ┌──────────┐
                                 │  bcrypt  │
                                 │  compare │
                                 └──────────┘
```

### Código Clave

**JwtStrategy** - Valida el token en cada request:
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

**RolesGuard** - Verifica permisos por rol:
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### Uso en Controladores

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
create(@Body() dto: CreateDto, @Request() req) {
  // req.user contiene { id, email, role }
}
```

---

## 2. Módulo Users

### Descripción
Gestión completa de usuarios con soft deletes y validación de email único.

### Entidad User

```typescript
@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })  // No se incluye en queries normales
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.BUYER })
  role: UserRole;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Relaciones
  @OneToMany(() => Product, (product) => product.seller)
  products: Product[];

  @OneToMany(() => Review, (review) => review.buyer)
  reviewsGiven: Review[];

  @OneToMany(() => Review, (review) => review.seller)
  reviewsReceived: Review[];

  // Timestamps con timezone
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;  // Soft delete
}
```

### Servicio - Métodos Principales

| Método | Descripción | Validaciones |
|--------|-------------|--------------|
| `create()` | Crear usuario | Email único, hash password |
| `findAll()` | Listar usuarios | - |
| `findOne()` | Buscar por ID | NotFoundException |
| `findByEmail()` | Buscar por email | Incluye password para auth |
| `update()` | Actualizar | NotFoundException |
| `remove()` | Soft delete | NotFoundException |

### Hash de Contraseñas

```typescript
// Al crear usuario
const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

// Al validar login
const isPasswordValid = await bcrypt.compare(password, user.password);
```

---

## 3. Módulo Products

### Descripción
CRUD de productos con filtros avanzados, soporte para productos nuevos y usados.

### Entidad Product

```typescript
@Entity('products')
@Index(['status', 'category'])      // Filtro principal
@Index(['sellerId', 'status'])      // Productos por vendedor
@Index(['condition', 'status'])     // Filtro nuevo/usado
@Index(['price'])                   // Ordenamiento por precio
export class Product {
  // ... campos básicos

  @Column({ type: 'enum', enum: ProductCondition })
  condition: ProductCondition;  // NEW | USED

  @Column({ type: 'enum', enum: ProductCategory })
  category: ProductCategory;    // CPU, GPU, RAM, etc.

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;        // DRAFT, PENDING, VERIFIED, PUBLISHED, SOLD

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'average_rating' })
  averageRating: number;        // Calculado desde reviews

  @Column({ type: 'integer', default: 0, name: 'review_count' })
  reviewCount: number;          // Contador de reviews
}
```

### Estados del Producto

```
DRAFT ─────► PENDING ─────► VERIFIED ─────► PUBLISHED ─────► SOLD
  │            │               │
  │            ▼               ▼
  │         REJECTED        FAILED
  │            │               │
  └────────────┴───────────────┘
              (vuelve a DRAFT)
```

### Filtros con QueryBuilder

```typescript
async findAll(filters?: FilterProductDto): Promise<Product[]> {
  const query = this.productRepository.createQueryBuilder('product')
    .leftJoinAndSelect('product.seller', 'seller')
    .where('product.status = :status', { status: ProductStatus.PUBLISHED });

  if (filters?.category) {
    query.andWhere('product.category = :category', { category: filters.category });
  }

  if (filters?.condition) {
    query.andWhere('product.condition = :condition', { condition: filters.condition });
  }

  if (filters?.minPrice) {
    query.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
  }

  if (filters?.maxPrice) {
    query.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
  }

  if (filters?.search) {
    query.andWhere(
      '(product.title ILIKE :search OR product.description ILIKE :search)',
      { search: `%${filters.search}%` },
    );
  }

  return query.orderBy('product.createdAt', 'DESC').getMany();
}
```

### Categorías Disponibles

```typescript
enum ProductCategory {
  CPU = 'cpu',
  GPU = 'gpu',
  RAM = 'ram',
  STORAGE = 'storage',
  MOTHERBOARD = 'motherboard',
  PSU = 'psu',
  CASE = 'case',
  COOLING = 'cooling',
  MONITOR = 'monitor',
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  PHONE = 'phone',
  TABLET = 'tablet',
  OTHER = 'other',
}
```

---

## 4. Módulo Orders

### Descripción
Sistema de órdenes con custodia de pago (3 días) y estados controlados.

### Entidad Order

```typescript
@Entity('orders')
@Index(['buyerId', 'status'])      // Órdenes por comprador
@Index(['status', 'createdAt'])    // Filtros por estado
export class Order {
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'custody_start_date' })
  custodyStartDate: Date;  // Inicio custodia

  @Column({ type: 'timestamptz', nullable: true, name: 'custody_end_date' })
  custodyEndDate: Date;    // Fin custodia (3 días después)
}
```

### Estados de la Orden

```
PENDING ─────► PAID ─────► IN_CUSTODIA ─────► SHIPPED ─────► DELIVERED
   │             │              │
   │             ▼              ▼
   │          CANCELLED      REFUNDED
   │             │              │
   └─────────────┴──────────────┘
```

### Lógica de Custodia

```typescript
async create(createOrderDto: CreateOrderDto, buyerId: string): Promise<Order> {
  const product = await this.productsService.findOne(createOrderDto.productId);

  if (product.status === 'sold') {
    throw new BadRequestException('El producto ya fue vendido');
  }

  const order = this.orderRepository.create({
    ...createOrderDto,
    buyerId,
    total: product.price,
    custodyStartDate: new Date(),
    custodyEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
  });

  const savedOrder = await this.orderRepository.save(order);

  // Marcar producto como vendido
  await this.productsService.update(product.id, { status: 'sold' as any });

  return savedOrder;
}
```

### Cancelación con Validación

```typescript
async cancel(id: string): Promise<Order> {
  const order = await this.findOne(id);

  if (order.status !== OrderStatus.PENDING) {
    throw new BadRequestException('Solo se pueden cancelar órdenes pendientes');
  }

  order.status = OrderStatus.CANCELLED;
  
  // Liberar producto
  await this.productsService.update(order.productId, { status: 'published' as any });

  return this.orderRepository.save(order);
}
```

---

## 5. Módulo Verifications

### Descripción
Sistema de verificación profesional para productos usados. Solo administradores pueden crear verificaciones.

### Entidad Verification

```typescript
@Entity('verifications')
@Index(['productId', 'result'])    // Verificaciones por producto
@Index(['verifiedBy'])             // Verificaciones por verificador
export class Verification {
  @Column({ type: 'enum', enum: VerificationResult })
  result: VerificationResult;  // PASS | FAIL | CONDITIONAL

  @Column({ type: 'text' })
  notes: string;

  @Column({ type: 'integer', nullable: true, name: 'hours_of_use' })
  hoursOfUse: number;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'cosmetic_grade' })
  cosmeticGrade: string;  // A, B, C, D

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'quality_score' })
  qualityScore: number;   // 0.00 - 5.00
}
```

### Flujo de Verificación

```
1. Vendedor publica producto (status: PENDING)
2. Empleado retira producto
3. Testing profesional:
   - Verificación de declaración del vendedor
   - Tests de calidad general
   - Tests en uso (según tipo de producto)
   - Revisión interna de horas de uso
4. Calificación y resultado:
   - PASS → status: VERIFIED
   - FAIL → status: DRAFT (rechazado)
   - CONDITIONAL → status: VERIFIED (con notas)
5. Publicación con certificado
```

### Lógica de Verificación

```typescript
async create(dto: CreateVerificationDto, verifiedBy: string): Promise<Verification> {
  const product = await this.productsService.findOne(dto.productId);

  // Solo productos usados pueden verificarse
  if (product.condition !== ProductCondition.USED) {
    throw new BadRequestException('Solo se pueden verificar productos usados');
  }

  const verification = this.verificationRepository.create({
    ...dto,
    verifiedBy,
  });

  const savedVerification = await this.verificationRepository.save(verification);

  // Actualizar estado del producto según resultado
  const newStatus = dto.result === VerificationResult.PASS
    ? ProductStatus.VERIFIED
    : ProductStatus.DRAFT;

  await this.productsService.update(product.id, {
    status: newStatus,
    hoursOfUse: dto.hoursOfUse,
    physicalState: dto.physicalState,
  });

  return savedVerification;
}
```

---

## 6. Módulo Reviews

### Descripción
Sistema de reseñas y quejas con cálculo automático de etiqueta de confianza para vendedores.

### Entidad Review

```typescript
@Entity('reviews')
@Index(['buyerId', 'productId'], { unique: true })  // Una reseña por compra
@Index(['sellerId', 'status'])                       // Reseñas por vendedor
@Index(['productId', 'status'])                      // Reseñas por producto
@Check(`"rating" >= 1 AND "rating" <= 5`)            // Constraint DB
export class Review {
  @Column({ type: 'smallint' })
  rating: number;  // 1-5

  @Column({ type: 'enum', enum: ReviewType })
  type: ReviewType;  // POSITIVE | NEUTRAL | COMPLAINT

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
  status: ReviewStatus;  // PENDING | APPROVED | REJECTED | RESOLVED

  @Column({ type: 'smallint', nullable: true, name: 'seller_rating' })
  sellerRating: number;  // Calificación específica al vendedor

  @Column({ type: 'smallint', nullable: true, name: 'product_rating' })
  productRating: number;  // Calificación específica al producto

  @Column({ type: 'text', nullable: true, name: 'complaint_reason' })
  complaintReason: string;  // Razón de queja (obligatorio si type = COMPLAINT)

  @Column({ type: 'boolean', default: false, name: 'is_verified_purchase' })
  isVerifiedPurchase: boolean;  // Siempre true para compras reales
}
```

### TrustBadge - Etiqueta de Confianza

```typescript
enum TrustBadge {
  SAFE = 'safe',              // 🟢 4.0-5.0★, <10% quejas
  INTERMEDIATE = 'intermediate', // 🟡 3.0-3.9★, 10-25% quejas
  UNSAFE = 'unsafe',          // 🔴 <3.0★ o >25% quejas
}
```

### Cálculo de TrustBadge

```typescript
async getTrustBadge(sellerId: string) {
  const reviews = await this.reviewRepository.find({
    where: { sellerId, status: ReviewStatus.APPROVED },
  });

  // Mínimo 3 reseñas para badge
  if (reviews.length < 3) {
    return { badge: TrustBadge.INTERMEDIATE, ... };
  }

  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  const complaints = reviews.filter((r) => r.type === ReviewType.COMPLAINT).length;
  const complaintRate = (complaints / totalReviews) * 100;

  let badge: TrustBadge;

  if (averageRating >= 4.0 && complaintRate < 10) {
    badge = TrustBadge.SAFE;
  } else if (averageRating >= 3.0 && complaintRate < 25) {
    badge = TrustBadge.INTERMEDIATE;
  } else {
    badge = TrustBadge.UNSAFE;
  }

  return {
    badge,
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
    complaintRate: Math.round(complaintRate * 10) / 10,
    breakdown: {
      positive: reviews.filter((r) => r.type === ReviewType.POSITIVE).length,
      neutral: reviews.filter((r) => r.type === ReviewType.NEUTRAL).length,
      complaint: complaints,
    },
  };
}
```

### Validaciones de Reseña

```typescript
async create(dto: CreateReviewDto, buyerId: string): Promise<Review> {
  // Verificar que la orden existe y pertenece al comprador
  const order = await this.ordersService.findOne(dto.orderId);

  if (order.buyerId !== buyerId) {
    throw new BadRequestException('Solo puedes reseñar tus propias compras');
  }

  if (order.productId !== dto.productId) {
    throw new BadRequestException('El producto no corresponde a esta orden');
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new BadRequestException('Solo puedes reseñar productos entregados');
  }

  // Verificar que no existe reseña previa
  const existingReview = await this.reviewRepository.findOne({
    where: { orderId: dto.orderId, buyerId },
  });

  if (existingReview) {
    throw new ConflictException('Ya has reseñado esta compra');
  }

  // Quejas requieren razón
  if (dto.type === ReviewType.COMPLAINT && !dto.complaintReason) {
    throw new BadRequestException('Las quejas deben incluir una razón');
  }

  // Quejas van a revisión manual, aprobaciones son automáticas
  const status = dto.type === ReviewType.COMPLAINT
    ? ReviewStatus.PENDING
    : ReviewStatus.APPROVED;

  const review = this.reviewRepository.create({
    ...dto,
    buyerId,
    sellerId: order.product.sellerId,
    isVerifiedPurchase: true,
    status,
  });

  return this.reviewRepository.save(review);
}
```

### Resolución de Quejas (Admin)

```typescript
async updateStatus(id: string, dto: UpdateReviewStatusDto, resolvedBy: string) {
  const review = await this.findOne(id);

  review.status = dto.status as ReviewStatus;
  review.resolutionNotes = dto.resolutionNotes;
  review.resolvedBy = resolvedBy;

  return this.reviewRepository.save(review);
}
```

---

## 7. Configuración TypeORM

### Índices Implementados

| Entidad | Índice | Propósito |
|---------|--------|-----------|
| User | `email` (unique) | Login rápido |
| User | `role` | Filtro por rol |
| Product | `status + category` | Filtro principal |
| Product | `sellerId + status` | Productos por vendedor |
| Product | `condition + status` | Filtro nuevo/usado |
| Product | `price` | Ordenamiento |
| Order | `buyerId + status` | Órdenes por comprador |
| Order | `status + createdAt` | Filtros por estado |
| Verification | `productId + result` | Verificaciones por producto |
| Review | `buyerId + productId` (unique) | Una reseña por compra |
| Review | `sellerId + status` | Reseñas por vendedor |

### Constraints

```typescript
// CHECK constraint en Review
@Check(`"rating" >= 1 AND "rating" <= 5`)

// Unique constraint en User
@Column({ unique: true })
email: string;

// Unique composite index en Review
@Index(['buyerId', 'productId'], { unique: true })
```

### Relaciones con onDelete

| Relación | onDelete | Razón |
|----------|----------|-------|
| User → Products | CASCADE | Eliminar productos al borrar usuario |
| User → Orders | CASCADE | Eliminar órdenes al borrar usuario |
| User → Reviews | CASCADE | Eliminar reseñas al borrar usuario |
| Product → Verifications | CASCADE | Eliminar verificaciones al borrar producto |
| Product → Reviews | CASCADE | Eliminar reseñas al borrar producto |
| Order → Product | CASCADE | Eliminar orden al borrar producto |
| Verification → User | SET NULL | Mantener verificación si se borra verificador |
| Review → Order | SET NULL | Mantener reseña si se borra orden |

### Tipos de Columnas

```typescript
// UUID para IDs
@PrimaryGeneratedColumn('uuid')

// Timestamps con timezone
@CreateDateColumn({ type: 'timestamptz' })

// Decimales con precisión
@Column({ type: 'decimal', precision: 10, scale: 2 })

// Enums
@Column({ type: 'enum', enum: UserRole })

// Texto largo
@Column({ type: 'text' })

// VARCHAR con longitud
@Column({ type: 'varchar', length: 255 })

// Soft delete
@DeleteDateColumn({ type: 'timestamptz' })
```

---

## 8. Configuración Swagger

### Tags por Módulo

```typescript
const config = new DocumentBuilder()
  .addTag('Auth', 'Autenticación y registro')
  .addTag('Users', 'Gestión de usuarios')
  .addTag('Products', 'Productos (nuevos y usados)')
  .addTag('Orders', 'Órdenes de compra')
  .addTag('Verifications', 'Verificación de productos usados')
  .addTag('Reviews', 'Reseñas y quejas')
  .build();
```

### Decoradores de Respuesta

```typescript
@ApiResponse({ status: 201, description: 'Creada exitosamente' })
@ApiResponse({ status: 400, description: 'Datos inválidos' })
@ApiResponse({ status: 401, description: 'No autorizado' })
@ApiResponse({ status: 403, description: 'Sin permisos' })
@ApiResponse({ status: 404, description: 'No encontrado' })
@ApiResponse({ status: 409, description: 'Conflicto (duplicado)' })
```

---

## 9. Validación con DTOs

### Patrón de DTOs

```typescript
// DTO de creación - campos requeridos
export class CreateProductDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsNumber()
  @Min(0)
  price: number;
}

// DTO de actualización - todos opcionales
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

// DTO de filtros - para queries
export class FilterProductDto {
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;
}
```

### Validación Condicional

```typescript
// Solo requerido si type es COMPLAINT
@ValidateIf((o) => o.type === ReviewType.COMPLAINT)
@IsString()
@MinLength(20)
complaintReason?: string;
```

---

## 10. Manejo de Errores

### Excepciones de NestJS

```typescript
// 404 - No encontrado
throw new NotFoundException('Producto no encontrado');

// 400 - Bad request
throw new BadRequestException('Solo puedes reseñar productos entregados');

// 409 - Conflicto
throw new ConflictException('El email ya está registrado');

// 403 - Sin permisos
throw new ForbiddenException('No tienes permisos');
```

### Excepciones en Servicios

```typescript
async findOne(id: string): Promise<Product> {
  const product = await this.productRepository.findOne({
    where: { id },
    relations: ['seller', 'verifications'],
  });

  if (!product) {
    throw new NotFoundException('Producto no encontrado');
  }

  return product;
}
```

---

## 11. Variables de Entorno

### Archivo .env

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=ers_components

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_minimum_32_chars
JWT_EXPIRATION=7d

# App
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=*
```

### Uso en ConfigService

```typescript
// Con valor por defecto
const port = configService.get('PORT', 3000);

// Sin valor por defecto (requerido)
const dbHost = configService.get('DATABASE_HOST');

// Con tipo
const dbPort = configService.get<number>('DATABASE_PORT', 5432);
```

---

## 12. Comandos Útiles

### Desarrollo

```bash
# Iniciar con hot-reload
npm run start:dev

# Compilar TypeScript
npm run build

# Ejecutar compilación
npm run start:prod
```

### Base de Datos

```bash
# Generar migración
npm run migration:generate

# Ejecutar migraciones
npm run migration:run

# Revertir última migración
npm run migration:revert
```

### Testing

```bash
# Tests unitarios
npm run test

# Con cobertura
npm run test:cov

# Watch mode
npm run test:watch

# Tests e2e
npm run test:e2e
```

### Linting

```bash
# Ver errores
npm run lint

# Auto-fix
npm run lint -- --fix

# Formatear
npm run format
```

---

## Resumen de Implementaciones

| Módulo | Estado | Endpoints | Entidad | Servicio |
|--------|--------|-----------|---------|----------|
| Auth | ✅ Completo | 3 | - | AuthService |
| Users | ✅ Completo | 5 | User | UsersService |
| Products | ✅ Completo | 6 | Product | ProductsService |
| Orders | ✅ Completo | 5 | Order | OrdersService |
| Verifications | ✅ Completo | 3 | Verification | VerificationsService |
| Reviews | ✅ Completo | 8 | Review | ReviewsService |

**Total: 30 endpoints implementados**
