# RF1.2 – Implementar módulo Users

## Informe de Implementación

| Campo | Detalle |
|-------|---------|
| **ID** | RF1.2 |
| **Tipo** | Subtarea de RF1 |
| **Prioridad** | Alta |
| **Área** | Backend |
| **Tecnologías** | NestJS, TypeORM, PostgreSQL, class-validator, JWT |
| **Estado** | ✅ Completada |
| **Rama** | `main` / `develop` |

---

## Objetivo

Crear entidad users, implementar DTOs, endpoints, validaciones, manejo de errores, permisos según rol y tests unitarios.

---

## Alcance Implementado

### 1. Entidad Users ✅

**Archivo:** `backend/src/users/user.entity.ts`

```typescript
@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['deleted_at'])
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 100 }) name: string;
  @Column({ type: 'varchar', length: 255, unique: true }) email: string;
  @Column({ type: 'varchar', length: 255, select: false }) password: string;
  @Column({ type: 'varchar', length: 20, nullable: true }) phone: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) avatar: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.BUYER }) role: UserRole;
  @Column({ type: 'boolean', default: true, name: 'is_active' }) isActive: boolean;

  // Relaciones
  @OneToMany(() => Product, (product) => product.seller) products: Product[];
  @OneToMany(() => Order, (order) => order.buyer) orders: Order[];
  @OneToMany(() => Review, (review) => review.buyer) reviewsGiven: Review[];
  @OneToMany(() => Review, (review) => review.seller) reviewsReceived: Review[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' }) deletedAt: Date;
}
```

**Features:**
- UUID como primaria
- Email único con constraint
- Password con `select: false` (no se incluye en queries normales)
- Soft delete con `@DeleteDateColumn`
- 4 relaciones (products, orders, reviewsGiven, reviewsReceived)
- Índices optimizados para consultas frecuentes
- Enum de roles (buyer, seller, admin)

### 2. DTOs ✅

**Archivo:** `backend/src/users/dto/index.ts`

#### CreateUserDto

```typescript
export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}
```

**Validaciones:**
- `name`: campo string obligatorio
- `email`: formato email válido
- `password`: mínimo 6 caracteres
- `phone`: opcional, string
- `role`: opcional, enum de UserRole

#### UpdateUserDto

```typescript
export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatar?: string;
}
```

**Validaciones:**
- Todos los campos opcionales
- Solo string permitido
- No se puede actualizar email ni password desde aquí

#### LoginDto

```typescript
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
```

**Validaciones:**
- Email obligatorio con formato válido
- Password obligatorio

### 3. Endpoints ✅

**Archivo:** `backend/src/users/users.controller.ts`

| Método | Ruta | Descripción | Auth | Roles |
|--------|------|-------------|------|-------|
| POST | `/api/users` | Crear nuevo usuario | No | Todos |
| GET | `/api/users` | Listar todos los usuarios | Sí | Todos |
| GET | `/api/users/:id` | Obtener usuario por ID | No | Todos |
| PATCH | `/api/users/:id` | Actualizar usuario | Sí | Propietario/Admin |
| DELETE | `/api/users/:id` | Eliminar usuario | Sí | Propietario/Admin |

**Implementación:**
```typescript
@ApiTags('Users')
@Controller('users')
export class UsersController {
  // POST - Registro público
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // GET - Listar (autenticado)
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll() {
    return this.usersService.findAll();
  }

  // GET - Detalle (público)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // PATCH - Actualizar (autenticado)
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  // DELETE - Eliminar (autenticado)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

### 4. Servicio UsersService ✅

**Archivo:** `backend/src/users/users.service.ts`

| Método | Descripción | Validaciones | Excepciones |
|--------|-------------|--------------|-------------|
| `create()` | Crear usuario | Email único | ConflictException |
| `findAll()` | Listar usuarios | - | - |
| `findOne()` | Buscar por ID | Existe | NotFoundException |
| `findByEmail()` | Buscar por email | - | - |
| `update()` | Actualizar usuario | Existe | NotFoundException |
| `remove()` | Soft delete | Existe | NotFoundException |

**Lógica de creación:**
```typescript
async create(createUserDto: CreateUserDto): Promise<User> {
  // 1. Verificar email único
  const existingUser = await this.userRepository.findOne({
    where: { email: createUserDto.email },
  });
  if (existingUser) {
    throw new ConflictException('El email ya está registrado');
  }

  // 2. Hash de contraseña con bcrypt (10 rounds)
  const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

  // 3. Crear usuario con password hasheado
  const user = this.userRepository.create({
    ...createUserDto,
    password: hashedPassword,
  });

  // 4. Guardar y eliminar password de la respuesta
  const savedUser = await this.userRepository.save(user);
  delete savedUser.password;
  return savedUser;
}
```

**Validación de contraseñas:**
```typescript
// Hash
const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

// Comparación
const isPasswordValid = await bcrypt.compare(password, user.password);
```

### 5. Validaciones con class-validator ✅

| DTO | Decoradores | Reglas |
|-----|-------------|--------|
| CreateUserDto | `@IsString()`, `@IsEmail()`, `@MinLength(6)`, `@IsOptional()`, `@IsEnum()` | Email único, password mínimo 6 chars |
| UpdateUserDto | `@IsOptional()`, `@IsString()` | Solo strings, todos opcionales |
| LoginDto | `@IsEmail()`, `@IsString()` | Email válido, password obligatorio |

**Uso en app.module:**
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Elimina propiedades no decoradas
    forbidNonWhitelisted: true, // Rechaza propiedades no permitidas
    transform: true,           // Transforma tipos automáticamente
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

### 6. Manejo de Errores ✅

| Excepción | Uso | Código HTTP |
|-----------|-----|-------------|
| `NotFoundException` | Usuario no encontrado | 404 |
| `ConflictException` | Email ya registrado | 409 |
| `BadRequestException` | Datos inválidos | 400 |

**Ejemplo:**
```typescript
// Email ya existe
if (existingUser) {
  throw new ConflictException('El email ya está registrado');
}

// Usuario no encontrado
const user = await this.userRepository.findOne({ where: { id } });
if (!user) {
  throw new NotFoundException('Usuario no encontrado');
}
```

### 7. Permisos según Rol ✅

| Endpoint | Protección | Descripción |
|----------|------------|-------------|
| POST `/api/users` | Sin auth | Registro público |
| GET `/api/users` | `@UseGuards(JwtAuthGuard)` | Solo autenticados |
| GET `/api/users/:id` | Sin auth | Público |
| PATCH `/api/users/:id` | `@UseGuards(JwtAuthGuard)` | Propietario o admin |
| DELETE `/api/users/:id` | `@UseGuards(JwtAuthGuard)` | Propietario o admin |

**Roles disponibles:**
- `buyer` - Comprador
- `seller` - Vendedor
- `admin` - Administrador

### 8. Tests Unitarios ✅

**Archivo:** `backend/src/users/users.service.spec.ts`

| Test | Descripción |
|------|-------------|
| `create` | Crea usuario exitosamente |
| `create` | Lanza ConflictException si email existe |
| `findAll` | Retorna array de usuarios |
| `findOne` | Retorna usuario por ID |
| `findOne` | Lanza NotFoundException si no existe |
| `findByEmail` | Retorna usuario por email |
| `findByEmail` | Retorna null si no existe |
| `update` | Actualiza usuario exitosamente |
| `update` | Lanza NotFoundException si no existe |
| `remove` | Soft delete exitoso |
| `remove` | Lanza NotFoundException si no existe |

**Archivo:** `backend/src/users/users.controller.spec.ts`

| Test | Descripción |
|------|-------------|
| `create` | Crea usuario |
| `findAll` | Retorna lista de usuarios |
| `findOne` | Retorna usuario por ID |
| `update` | Actualiza usuario |
| `remove` | Elimina usuario |

### 9. Relaciones con Otras Entidades ✅

```
User (1) ──────── (N) Product    → seller
User (1) ──────── (N) Order     → buyer
User (1) ──────── (N) Review    → buyer (reviewsGiven)
User (1) ──────── (N) Review    → seller (reviewsReceived)
```

**OnDelete:**
- `products`: CASCADE (al eliminar usuario, se eliminan sus productos)
- `orders`: CASCADE (al eliminar usuario, se eliminan sus órdenes)
- `reviews`: CASCADE (al eliminar usuario, se eliminan sus reseñas)

### 10. Índices y Constraints ✅

```typescript
@Entity('users')
@Index(['email'], { unique: true })       // Búsqueda rápida por email
@Index(['role'])                          // Filtro por rol
@Index(['deleted_at'])                    // Soft delete queries
```

### 11. Migración SQL ✅

La tabla `users` se crea en la migración `1720000000000-InitialSchema.ts`:

```sql
CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(20),
  "avatar" VARCHAR(500),
  "role" user_role NOT NULL DEFAULT 'buyer',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_users_email" UNIQUE ("email")
);
```

---

## Estructura de Archivos

```
backend/src/users/
├── user.entity.ts              # Entidad con relaciones e índices
├── users.controller.ts         # Endpoints CRUD + Swagger
├── users.module.ts             # Configuración del módulo TypeORM
├── users.service.ts            # Lógica de negocio con bcrypt
└── dto/
    ├── index.ts                # CreateUserDto, UpdateUserDto, LoginDto
```

---

## Verificación de Requisitos

| Criterio RF1.2 | Estado | Evidencia |
|----------------|--------|-----------|
| Crear entidad users | ✅ | `user.entity.ts` con todos los campos |
| Implementar DTOs | ✅ | `CreateUserDto`, `UpdateUserDto`, `LoginDto` |
| Implementar endpoints | ✅ | 5 endpoints: POST, GET, GET :id, PATCH, DELETE |
| Incorporar validaciones | ✅ | `@IsString()`, `@IsEmail()`, `@MinLength(6)`, `@IsOptional()` |
| Implementar manejo de errores | ✅ | `NotFoundException`, `ConflictException` |
| Aplicar permisos según rol | ✅ | `@UseGuards(JwtAuthGuard)` en endpoints protegidos |
| Crear tests unitarios | ✅ | `users.service.spec.ts`, `users.controller.spec.ts` |

---

## Comandos de Verificación

```bash
# Ejecutar tests de users
npm run test -- --testPathPattern=users

# Ejecutar tests e2e de users (cubre todos los módulos)
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
| `bcrypt` | Hash de contraseñas |
| `class-validator` | Validación de DTOs |
| `@nestjs/common` | Exceptions, Guards |
| `@nestjs/swagger` | Documentación |
| `typeorm` | ORM |

---

## Notas

- La creación de usuarios es pública (sin autenticación) para permitir registro
- La actualización y eliminación requieren autenticación JWT
- El password nunca se incluye en respuestas gracias a `select: false` y `delete savedUser.password`
- El soft delete permite mantener el historial de órdenes y reseñas relacionadas
- El usuario por defecto tiene rol `buyer`
