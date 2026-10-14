# RF1.3 – Implementar módulo Products

## Informe de Implementación

| Campo | Detalle |
|-------|---------|
| **ID** | RF1.3 |
| **Tipo** | Subtarea de RF1 |
| **Prioridad** | Alta |
| **Área** | Backend |
| **Tecnologías** | NestJS, TypeORM, PostgreSQL, class-validator, JWT |
| **Estado** | ✅ Completada |
| **Rama** | `main` / `develop` |

---

## Objetivo

Crear entidad products, implementar CRUD, DTOs y validaciones, gestionar estados de publicación, integrar información de productos usados y verificados, aplicar autorización y crear tests unitarios.

---

## Alcance Implementado

### 1. Entidad Products ✅

**Archivo:** `backend/src/products/product.entity.ts`

```typescript
@Entity('products')
@Index(['status', 'category'])
@Index(['sellerId', 'status'])
@Index(['condition', 'status'])
@Index(['price'])
export class Product {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 200 }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) price: number;
  @Column({ type: 'enum', enum: ProductCondition }) condition: ProductCondition;
  @Column({ type: 'enum', enum: ProductCategory }) category: ProductCategory;
  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT }) status: ProductStatus;
  @Column({ type: 'simple-array', nullable: true }) images: string[];
  @Column({ type: 'integer', nullable: true, name: 'hours_of_use' }) hoursOfUse: number;
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'physical_state' }) physicalState: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) brand: string;
  @Column({ type: 'varchar', length: 200, nullable: true }) model: string;
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'average_rating' }) averageRating: number;
  @Column({ type: 'integer', default: 0, name: 'review_count' }) reviewCount: number;

  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' }) seller: User;
  @Column({ name: 'seller_id' }) sellerId: string;

  @OneToMany(() => Verification, (verification) => verification.product) verifications: Verification[];
  @OneToMany(() => Review, (review) => review.product) reviews: Review[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' }) deletedAt: Date;
}
```

**Features:**
- 14 categorías de productos
- 5 estados de publicación
- 2 condiciones (new/used)
- Campos específicos para productos usados
- Promedio de rating y conteo de reviews
- Índices compuestos para optimización
- `onDelete: 'CASCADE'` con users

### 2. Enums ✅

#### ProductCondition

```typescript
export enum ProductCondition {
  NEW = 'new',
  USED = 'used',
}
```

#### ProductCategory (14 categorías)

```typescript
export enum ProductCategory {
  CPU, GPU, RAM, STORAGE, MOTHERBOARD, PSU,
  CASE, COOLING, MONITOR, KEYBOARD, MOUSE, PHONE, TABLET, OTHER
}
```

#### ProductStatus (5 estados)

```typescript
export enum ProductStatus {
  DRAFT = 'draft',       // Borrador
  PENDING = 'pending',   // En revisión
  VERIFIED = 'verified', // Verificado por ERS
  PUBLISHED = 'published', // Publicado
  SOLD = 'sold',         // Vendido
}
```

### 3. DTOs y Validaciones ✅

**Archivo:** `backend/src/products/dto/index.ts`

#### CreateProductDto

```typescript
export class CreateProductDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsNumber() @Min(0) price: number;
  @IsEnum(ProductCondition) condition: ProductCondition;
  @IsEnum(ProductCategory) category: ProductCategory;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsNumber() hoursOfUse?: number;      // Solo para usados
  @IsOptional() @IsString() physicalState?: string;    // Solo para usados
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
}
```

#### UpdateProductDto

```typescript
export class UpdateProductDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}
```

#### FilterProductDto

```typescript
export class FilterProductDto {
  @IsOptional() @IsEnum(ProductCategory) category?: ProductCategory;
  @IsOptional() @IsEnum(ProductCondition) condition?: ProductCondition;
  @IsOptional() @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @IsString() search?: string;
}
```

### 4. Gestión de Estados de Publicación ✅

**Flujo de estados:**
```
DRAFT ──► PENDING ──► VERIFIED ──► PUBLISHED ──► SOLD
  │           │              │
  │           ▼              ▼
  │        REJECTED       FAILED
  │           │              │
  └───────────┴──────────────┘
```

**Lógica en el servicio:**
```typescript
// Al crear producto → estado default: DRAFT
@Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
status: ProductStatus;

// Al actualizar → se puede cambiar estado
@IsOptional()
@IsEnum(ProductStatus)
status?: ProductStatus;

// Al publicar producto usado → PENDING
// Al verificar → VERIFIED o DRAFT (si falla)
// Al vender → SOLD
```

### 5. Productos Usados y Verificados ✅

| Campo | Propósito | Tipo |
|-------|-----------|------|
| `condition` | Nuevo o usado | `ProductCondition` |
| `hours_of_use` | Horas de uso reales | `INTEGER` |
| `physical_state` | Estado físico | `VARCHAR(500)` |
| `brand` | Marca del producto | `VARCHAR(100)` |
| `model` | Modelo del producto | `VARCHAR(200)` |
| `average_rating` | Calificación promedio | `DECIMAL(3,2)` |
| `review_count` | Cantidad de reviews | `INTEGER` |

**Relaciones para verificación:**
```typescript
@OneToMany(() => Verification, (verification) => verification.product)
verifications: Verification[];  // Informes de verificación

@OneToMany(() => Review, (review) => review.product)
reviews: Review[];              // Reseñas de compradores
```

### 6. CRUD Completo ✅

**Archivo:** `backend/src/products/products.service.ts`

| Método | Descripción | QueryBuilder/Filters |
|--------|-------------|---------------------|
| `create()` | Crear producto | `repository.create()` |
| `findAll()` | Listar con filtros | QueryBuilder con joins dinámicos |
| `findOne()` | Buscar por ID | Con relaciones `seller`, `verifications` |
| `findBySeller()` | Productos por vendedor | `find()` con where |
| `update()` | Actualizar producto | `findOne()` + `Object.assign()` |
| `remove()` | Soft delete | `softRemove()` |

**Filtros avanzados con QueryBuilder:**
```typescript
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
```

### 7. Autorización ✅

| Endpoint | Protección | Descripción |
|----------|------------|-------------|
| POST `/api/products` | `@UseGuards(JwtAuthGuard)` | Solo autenticados (vendedores) |
| GET `/api/products` | Sin auth | Público |
| GET `/api/products/:id` | Sin auth | Público |
| GET `/api/products/seller/:id` | Sin auth | Público |
| PATCH `/api/products/:id` | `@UseGuards(JwtAuthGuard)` | Solo propietario |
| DELETE `/api/products/:id` | `@UseGuards(JwtAuthGuard)` | Solo propietario |

**Lógica de creación:**
```typescript
@Post()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
create(@Body() createProductDto: CreateProductDto, @Request() req) {
  return this.productsService.create(createProductDto, req.user.id);
  // sellerId se asigna automáticamente desde el JWT
}
```

### 8. Tests Unitarios ✅

**Archivo:** `backend/src/products/products.service.spec.ts`

| Test | Descripción |
|------|-------------|
| `create` | Crea producto exitosamente |
| `findAll` | Retorna productos |
| `findAll` | Aplica filtro por categoría |
| `findAll` | Aplica filtro por rango de precio |
| `findOne` | Retorna producto por ID |
| `findOne` | Lanza NotFoundException |
| `findBySeller` | Retorna productos por vendedor |
| `update` | Actualiza producto |
| `update` | Lanza NotFoundException |
| `remove` | Soft delete exitoso |
| `remove` | Lanza NotFoundException |

**Archivo:** `backend/src/products/products.controller.spec.ts`

| Test | Descripción |
|------|-------------|
| `create` | Crea producto con auth |
| `findAll` | Lista productos |
| `findOne` | Detalle de producto |
| `findBySeller` | Productos por vendedor |
| `update` | Actualiza producto |
| `remove` | Elimina producto |

**Archivo:** `backend/test/products.e2e-spec.ts`

| Test | Descripción |
|------|-------------|
| POST `/api/products` | Crea producto |
| GET `/api/products` | Lista productos |
| GET `/api/products/:id` | Detalle |
| PATCH `/api/products/:id` | Actualiza |
| DELETE `/api/products/:id` | Elimina |

### 9. Índices y Optimización ✅

```typescript
@Entity('products')
@Index(['status', 'category'])    // Filtro principal
@Index(['sellerId', 'status'])    // Productos por vendedor
@Index(['condition', 'status'])   // Filtro nuevo/usado
@Index(['price'])                  // Ordenamiento por precio
```

**Beneficios:**
- Búsqueda rápida por estado y categoría
- Consultas eficientes por vendedor
- Filtros combinados optimizados
- Ordenamiento de precios sin full table scan

### 10. Migración SQL ✅

La tabla `products` se crea en la migración:

```sql
CREATE TABLE "products" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "condition" product_condition NOT NULL,
  "category" product_category NOT NULL,
  "status" product_status NOT NULL DEFAULT 'draft',
  "images" TEXT,
  "hours_of_use" INTEGER,
  "physical_state" VARCHAR(500),
  "brand" VARCHAR(100),
  "model" VARCHAR(200),
  "average_rating" DECIMAL(3,2),
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "seller_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
  CONSTRAINT "CK_products_price" CHECK ("price" >= 0),
  CONSTRAINT "FK_products_seller_id" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE
);
```

---

## Estructura de Archivos

```
backend/src/products/
├── product.entity.ts           # Entidad con enums, índices, relaciones
├── products.controller.ts      # Endpoints con JwtAuthGuard
├── products.module.ts          # Configuración TypeORM
├── products.service.ts         # Lógica con QueryBuilder
└── dto/
    ├── index.ts                # CreateProductDto, UpdateProductDto, FilterProductDto
```

---

## Verificación de Requisitos

| Criterio RF1.3 | Estado | Evidencia |
|----------------|--------|-----------|
| Crear entidad products | ✅ | `product.entity.ts` con 14 categorías, 5 estados, 2 condiciones |
| Implementar CRUD | ✅ | create, findAll, findOne, findBySeller, update, remove |
| Implementar DTOs | ✅ | CreateProductDto, UpdateProductDto, FilterProductDto |
| Validaciones | ✅ | `@IsString()`, `@IsNumber()`, `@IsEnum()`, `@Min(0)` |
| Gestionar estados de publicación | ✅ | DRAFT, PENDING, VERIFIED, PUBLISHED, SOLD |
| Integrar productos usados | ✅ | hoursOfUse, physicalState, condition |
| Integrar productos verificados | ✅ | Relación con Verification, status VERIFIED |
| Aplicar autorización | ✅ | `@UseGuards(JwtAuthGuard)` en POST/PATCH/DELETE |
| Crear tests unitarios | ✅ | 3 archivos de tests (service, controller, e2e) |

---

## Comandos de Verificación

```bash
# Ejecutar tests de products
npm run test -- --testPathPattern=products

# Ejecutar tests e2e
npm run test:e2e

# Linting
npm run lint

# Typecheck
npx tsc --noEmit
```

---

## Dependencias

| Dependencia | Uso |
|-------------|-----|
| `@nestjs/typeorm` | Inyección de repositorio |
| `class-validator` | Validación de DTOs |
| `@nestjs/common` | Exceptions, Guards, Controller |
| `@nestjs/swagger` | Documentación |
| `typeorm` | ORM |
| `@nestjs/jwt` | Autenticación |

---

## Notas

- `findAll()` solo muestra productos con status `PUBLISHED` por defecto
- El precio usa `DECIMAL(10,2)` para precisión monetaria
- `images` usa `simple-array` para almacenar múltiples URLs
- `average_rating` y `review_count` se actualizan automáticamente
- Los productos nuevos no tienen `hoursOfUse` ni `physicalState`
- El `search` usa `ILIKE` para búsqueda insensible a mayúsculas
- `onDelete: 'CASCADE'` elimina productos al borrar vendedor
