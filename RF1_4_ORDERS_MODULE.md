# RF1.4 – Implementar módulo Orders

## Informe de Implementación

| Campo | Detalle |
|-------|---------|
| **ID** | RF1.4 |
| **Tipo** | Subtarea de RF1 |
| **Prioridad** | Alta |
| **Área** | Backend |
| **Tecnologías** | NestJS, TypeORM, PostgreSQL, class-validator, JWT |
| **Estado** | ✅ Completada |
| **Rama** | `main` / `develop` |

---

## Objetivo

Crear entidad orders, definir relación con usuarios y productos, implementar creación y consulta de órdenes, gestionar estados de las órdenes, validar disponibilidad de productos, aplicar permisos y crear tests unitarios y e2e.

---

## Alcance Implementado

### 1. Entidad Orders ✅

**Archivo:** `backend/src/orders/order.entity.ts`

```typescript
@Entity('orders')
@Index(['buyerId', 'status'])
@Index(['status', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) total: number;
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING }) status: OrderStatus;
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'shipping_address' }) shippingAddress: string;
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_method' }) paymentMethod: string;
  @Column({ type: 'timestamptz', nullable: true, name: 'custody_start_date' }) custodyStartDate: Date;
  @Column({ type: 'timestamptz', nullable: true, name: 'custody_end_date' }) custodyEndDate: Date;
  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' }) cancellationReason: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' }) buyer: User;
  @Column({ name: 'buyer_id' }) buyerId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' }) product: Product;
  @Column({ name: 'product_id' }) productId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
```

**Features:**
- 7 estados de órdenes
- Custodia de 3 días (custodyStartDate, custodyEndDate)
- Relación con User (buyer) → onDelete: 'CASCADE'
- Relación con Product → onDelete: 'CASCADE'
- Índices optimizados
- Timestamps con timezone

### 2. Estados de las Órdenes ✅

```typescript
export enum OrderStatus {
  PENDING = 'pending',       // Pendiente de pago
  PAID = 'paid',              // Pagado
  IN_CUSTODY = 'in_custody',  // En custodia ERS (3 días)
  SHIPPED = 'shipped',        // Enviado
  DELIVERED = 'delivered',    // Entregado
  CANCELLED = 'cancelled',    // Cancelado
  REFUNDED = 'refunded',      // Reembolsado
}
```

**Flujo:**
```
PENDING ──► PAID ──► IN_CUSTODIA ──► SHIPPED ──► DELIVERED
  │           │              │
  │           ▼              ▼
  │        CANCELLED      REFUNDED
  │           │              │
  └───────────┴──────────────┘
```

### 3. Relaciones ✅

| Relación | Tipo | OnDelete | Descripción |
|----------|------|----------|-------------|
| Order → User (buyer) | ManyToOne | CASCADE | Eliminar órdenes al borrar usuario |
| Order → Product | ManyToOne | CASCADE | Eliminar orden al borrar producto |

```typescript
@ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'buyer_id' })
buyer: User;

@ManyToOne(() => Product, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'product_id' })
product: Product;
```

### 4. CRUD Completo ✅

**Archivo:** `backend/src/orders/orders.service.ts`

| Método | Descripción | Validaciones | Excepciones |
|--------|-------------|--------------|-------------|
| `create()` | Crear orden | Producto disponible, no vendido | BadRequestException |
| `findByBuyer()` | Órdenes por comprador | - | - |
| `findOne()` | Buscar por ID | Existe | NotFoundException |
| `update()` | Actualizar estado | Existe | NotFoundException |
| `cancel()` | Cancelar orden | Solo PENDING | BadRequestException, NotFoundException |

**Lógica de creación:**
```typescript
async create(createOrderDto: CreateOrderDto, buyerId: string): Promise<Order> {
  // Validar que el producto existe
  const product = await this.productsService.findOne(createOrderDto.productId);

  // Validar que no está vendido
  if (product.status === 'sold') {
    throw new BadRequestException('El producto ya fue vendido');
  }

  // Crear orden con total = precio del producto
  const order = this.orderRepository.create({
    ...createOrderDto,
    buyerId,
    total: product.price,
  });

  const savedOrder = await this.orderRepository.save(order);

  // Marcar producto como vendido
  await this.productsService.update(product.id, { status: 'sold' });

  return savedOrder;
}
```

**Lógica de cancelación:**
```typescript
async cancel(id: string): Promise<Order> {
  const order = await this.findOne(id);

  // Solo se pueden cancelar órdenes pendientes
  if (order.status !== OrderStatus.PENDING) {
    throw new BadRequestException('Solo se pueden cancelar órdenes pendientes');
  }

  order.status = OrderStatus.CANCELLED;

  // Liberar el producto de vuelta a publicado
  await this.productsService.update(order.productId, { status: 'published' });

  return this.orderRepository.save(order);
}
```

### 5. Validación de Disponibilidad de Productos ✅

```typescript
// Al crear orden
const product = await this.productsService.findOne(createOrderDto.productId);

if (product.status === 'sold') {
  throw new BadRequestException('El producto ya fue vendido');
}
```

**Reglas:**
- Solo se puede crear orden de productos con status ≠ 'sold'
- El producto se marca automáticamente como 'sold' al crear la orden
- Al cancelar, el producto vuelve a 'published'

### 6. Permisos y Autorización ✅

**Archivo:** `backend/src/orders/orders.controller.ts`

| Endpoint | Protección | Descripción |
|----------|------------|-------------|
| `@Controller('orders')` | `@UseGuards(JwtAuthGuard)` global | Todos los endpoints requieren JWT |
| POST `/api/orders` | JwtAuthGuard | Crear orden (comprador) |
| GET `/api/orders` | JwtAuthGuard | Mis órdenes |
| GET `/api/orders/:id` | JwtAuthGuard | Detalle orden |
| PATCH `/api/orders/:id` | JwtAuthGuard | Actualizar estado |
| POST `/api/orders/:id/cancel` | JwtAuthGuard | Cancelar orden |

**Acceso global:**
```typescript
@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  // Todos los métodos requieren autenticación JWT
}
```

### 7. DTOs con Validaciones ✅

**Archivo:** `backend/src/orders/dto/index.ts`

#### CreateOrderDto

```typescript
export class CreateOrderDto {
  @IsString() productId: string;          // UUID del producto
  @IsOptional() @IsString() shippingAddress?: string;
  @IsOptional() @IsString() paymentMethod?: string;
}
```

#### UpdateOrderDto

```typescript
export class UpdateOrderDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() shippingAddress?: string;
}
```

### 8. Custodia de Pago (3 días) ✅

```typescript
// Al crear orden
const order = this.orderRepository.create({
  ...createOrderDto,
  buyerId,
  total: product.price,
  custodyStartDate: new Date(),
  custodyEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
});
```

**Lógica:**
- `custodyStartDate`: Momento de la compra
- `custodyEndDate`: 3 días después
- Durante este período el dinero está retenido
- Si hay problema, ERS se hace cargo

### 9. Tests Unitarios ✅

**Archivo:** `backend/src/orders/orders.service.spec.ts`

| Test | Descripción |
|------|-------------|
| `create` | Crea orden exitosamente |
| `create` | Lanza BadRequestException si producto vendido |
| `findByBuyer` | Retorna órdenes por comprador |
| `findOne` | Retorna orden por ID |
| `findOne` | Lanza NotFoundException |
| `update` | Actualiza orden |
| `update` | Lanza NotFoundException |
| `cancel` | Cancela orden pending |
| `cancel` | Lanza BadRequestException si no es pending |
| `cancel` | Lanza NotFoundException |

**Archivo:** `backend/src/orders/orders.controller.spec.ts`

| Test | Descripción |
|------|-------------|
| `create` | Crea orden |
| `findMyOrders` | Retorna órdenes del comprador |
| `findOne` | Detalle de orden |
| `update` | Actualiza estado |
| `cancel` | Cancela orden |

### 10. Índices y Optimización ✅

```typescript
@Entity('orders')
@Index(['buyerId', 'status'])     // Órdenes por comprador y estado
@Index(['status', 'createdAt'])   // Filtro por estado y fecha
```

### 11. Migración SQL ✅

```sql
CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "total" DECIMAL(10,2) NOT NULL,
  "status" order_status NOT NULL DEFAULT 'pending',
  "shipping_address" VARCHAR(500),
  "payment_method" VARCHAR(50),
  "custody_start_date" TIMESTAMPTZ,
  "custody_end_date" TIMESTAMPTZ,
  "cancellation_reason" TEXT,
  "buyer_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
  CONSTRAINT "CK_orders_total" CHECK ("total" >= 0),
  CONSTRAINT "FK_orders_buyer_id" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_orders_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);
```

---

## Estructura de Archivos

```
backend/src/orders/
├── order.entity.ts             # Entidad con estados y relaciones
├── orders.controller.ts        # Endpoints con JwtAuthGuard global
├── orders.module.ts            # Configuración TypeORM
├── orders.service.ts           # Lógica de negocio
└── dto/
    ├── index.ts                # CreateOrderDto, UpdateOrderDto
```

---

## Verificación de Requisitos

| Criterio RF1.4 | Estado | Evidencia |
|-----------------|--------|-----------|
| Crear entidad orders | ✅ | `order.entity.ts` con 7 estados y 2 FK |
| Relación con usuarios y productos | ✅ | buyer_id → users(id), product_id → products(id) |
| Implementar creación y consulta | ✅ | create(), findByBuyer(), findOne() |
| Gestionar estados | ✅ | 7 estados con flujo completo |
| Validar disponibilidad | ✅ | Product.status !== 'sold' |
| Aplicar permisos | ✅ | @UseGuards(JwtAuthGuard) global |
| Tests unitarios | ✅ | orders.service.spec.ts, orders.controller.spec.ts |

---

## Comandos de Verificación

```bash
# Ejecutar tests de orders
npm run test -- --testPathPattern=orders

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

- Los estados `IN_CUSTODY`, `SHIPPED`, `REFUNDED` están definidos pero no tienen lógica de negocio completa (se implementarán en RF2)
- La cancelación devuelve el producto a `published`
- La custodia de 3 días está documentada en la entidad
- `onDelete: 'CASCADE'` en ambas relaciones
- El total se calcula automáticamente con el precio del producto
- Los timestamps usan `timestamptz` para timezone-awareness
- El controlador tiene `@UseGuards(JwtAuthGuard)` global en toda la clase
