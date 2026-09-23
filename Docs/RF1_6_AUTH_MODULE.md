# RF1.6 – Implementar autenticación y roles

## Informe de Implementación

| Campo | Detalle |
|-------|---------|
| **ID** | RF1.6 |
| **Tipo** | Subtarea de RF1 |
| **Prioridad** | Alta |
| **Área** | Backend |
| **Tecnologías** | NestJS, JWT, Passport, bcrypt, class-validator |
| **Estado** | ✅ Completada |
| **Rama** | `main` / `develop` |

---

## Objetivo

Implementar registro y login, JWT, proteger endpoints mediante Guards, implementar roles y permisos, validar tokens y expiración, probar accesos autorizados y no autorizados.

---

## Alcance Implementado

### 1. Autenticación con JWT ✅

**Archivo:** `backend/src/auth/auth.service.ts`

**Flujo de autenticación:**
```
1. Usuario envía email/password
        │
        ▼
2. validateUser busca por email
        │
        ▼
3. bcrypt.compare verifica contraseña
        │
        ▼
4. Si válido → JWT.sign() genera token
        │
        ▼
5. Retorna { access_token, user }
```

**Implementación:**
```typescript
async validateUser(email: string, password: string): Promise<any> {
  const user = await this.usersService.findByEmail(email);

  if (!user) {
    throw new UnauthorizedException('Credenciales inválidas');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Credenciales inválidas');
  }

  delete user.password;
  return user;
}

async login(loginDto: LoginDto) {
  const user = await this.validateUser(loginDto.email, loginDto.password);

  const payload = { sub: user.id, email: user.email, role: user.role };

  return {
    access_token: this.jwtService.sign(payload),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
```

**Configuración JWT:**
```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get('JWT_SECRET'),
    signOptions: {
      expiresIn: configService.get('JWT_EXPIRATION', '7d'),
    },
  }),
});
```

### 2. Registro y Login ✅

**Archivo:** `backend/src/auth/auth.controller.ts`

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `POST /api/auth/register` | POST | Registro de usuario | No |
| `POST /api/auth/login` | POST | Inicio de sesión | No |
| `GET /api/auth/profile` | GET | Perfil del usuario | Sí (JWT) |

**Registro:**
```typescript
@Post('register')
register(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
  // El servicio maneja: email único, hash de password
}
```

**Login:**
```typescript
@Post('login')
login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
  // Retorna: { access_token, user }
}
```

**Perfil:**
```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
getProfile(@Request() req) {
  return this.authService.getProfile(req.user.id);
}
```

### 3. Estructura JWT ✅

**Payload del token:**
```typescript
const payload = { sub: user.id, email: user.email, role: user.role };
```

**Campos:**
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `sub` | ID de usuario | `uuid-123` |
| `email` | Email del usuario | `test@example.com` |
| `role` | Rol del usuario | `buyer`, `seller`, `admin` |
| `exp` | Fecha de expiración | 7 días después |

**Configuración:**
```typescript
// .env
JWT_SECRET=your_super_secret_jwt_key_change_this_minimum_32_chars
JWT_EXPIRATION=7d
```

### 4. Guards de Protección ✅

**Archivo:** `backend/src/auth/guards/jwt-auth.guard.ts`

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Uso:**
```typescript
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
getProfile(@Request() req) { ... }
```

**Archivo:** `backend/src/auth/guards/roles.guard.ts`

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

**Uso:**
```typescript
@Post()
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
create(...) { ... }
```

### 5. Roles y Permisos ✅

**Roles disponibles:**
```typescript
export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  ADMIN = 'admin',
}
```

**Decorador de roles:**
```typescript
// backend/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

**Uso:**
```typescript
@Roles('admin')           // Solo admin
@Roles('buyer', 'seller') // Buyer o seller
@Roles('admin', 'buyer')  // Admin o buyer
```

**Tabla de permisos:**

| Recurso | Roles permitidos |
|---------|------------------|
| Auth/register | Todos |
| Auth/login | Todos |
| Auth/profile | Cualquier usuario autenticado |
| Users | Todos los usuarios |
| Products | Todos los usuarios |
| Products POST | Usuarios autenticados |
| Products PATCH/DELETE | Propietario |
| Verifications POST | Admin |
| Orders | Usuarios autenticados |
| Reviews | Compradores |
| Reviews complaint POST | Compradores |
| Reviews resolve PATCH | Admin |

### 6. Validación de Tokens y Expiración ✅

**Validación automática por Passport:**
```typescript
// JwtStrategy
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,      // ❌ Rechaza tokens expirados
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

**Validaciones:**
- Token con formato Bearer `Authorization` header
- Token no expirado (`ignoreExpiration: false`)
- Firma válida con `JWT_SECRET`
- Payload con `sub`, `email`, `role`

**Error handling:**
- Token inválido → 401 Unauthorized
- Token expirado → 401 Unauthorized
- Token malformado → 401 Unauthorized

### 7. Arquitectura de Módulos ✅

**Archivo:** `backend/src/auth/auth.module.ts`

```typescript
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**Dependencias:**
- `PassportModule` para autenticación
- `JwtModule` para generación/validación de tokens
- `UsersModule` para operaciones de usuario
- `ConfigModule` para variables de entorno

### 8. Tests Unitarios ✅

**Archivo:** `backend/src/auth/auth.service.spec.ts`

| Test | Descripción |
|------|-------------|
| `validateUser` | Retorna usuario sin password con credenciales válidas |
| `validateUser` | Lanza UnauthorizedException cuando usuario no existe |
| `validateUser` | Lanza UnauthorizedException cuando password inválido |
| `login` | Retorna access_token y user data |
| `login` | Lanza UnauthorizedException con credenciales inválidas |
| `getProfile` | Retorna perfil de usuario |

**Archivo:** `backend/src/auth/auth.controller.spec.ts`

| Test | Descripción |
|------|-------------|
| `register` | Crea usuario |
| `login` | Retorna token y user |
| `getProfile` | Retorna perfil con token válido |

**Archivo:** `backend/test/auth.e2e-spec.ts`

| Test | Descripción |
|------|-------------|
| POST `/api/auth/register` | Registro exitoso |
| POST `/api/auth/register` | Error con email inválido |
| POST `/api/auth/register` | Error con password corto |
| POST `/api/auth/login` | Login con credenciales válidas |
| POST `/api/auth/login` | Error con password incorrecto |
| POST `/api/auth/login` | Error con email inexistente |
| GET `/api/auth/profile` | Perfil con token válido |
| GET `/api/auth/profile` | Error sin token (401) |
| GET `/api/auth/profile` | Error con token inválido (401) |

### 9. Seguridad Implementada ✅

| Aspecto | Implementación |
|---------|----------------|
| Hash de password | bcrypt con 10 rounds |
| Token JWT | Secret configurable, expiración 7 días |
| Select: false | password no incluido en queries |
| Rate limiting | Configurable en main.ts |
| CORS | Configurable con CORS_ORIGIN |
| Validación global | ValidationPipe con whitelist + forbidNonWhitelisted |
| HTTPS | Configurable en producción |

**Password:**
```typescript
// Hash
const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

// Comparación
const isPasswordValid = await bcrypt.compare(password, user.password);
```

### 10. Swagger Documentation ✅

```typescript
const config = new DocumentBuilder()
  .setTitle('ERS API')
  .setDescription('API para plataforma de compra y venta de componentes')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Auth', 'Autenticación y registro')
  .build();
```

**Endpoints documentados:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`

---

## Estructura de Archivos

```
backend/src/auth/
├── auth.controller.ts        # Endpoints register, login, profile
├── auth.service.ts             # validateUser, login, getProfile
├── auth.module.ts              # Configuración JwtModule + PassportModule
├── decorators/
│   └── roles.decorator.ts    # @Roles() decorator
├── guards/
│   ├── jwt-auth.guard.ts     # Extiende AuthGuard('jwt')
│   └── roles.guard.ts        # CanActivate con Reflector
└── strategies/
    └── jwt.strategy.ts       # PassportStrategy con ExtractJwt
```

---

## Verificación de Requisitos

| Criterio RF1.6 | Estado | Evidencia |
|-----------------|--------|-----------|
| Implementar registro y login | ✅ | POST `/api/auth/register`, `/api/auth/login` |
| Implementar JWT | ✅ | JwtModule.registerAsync con secret y expiration |
| Proteger endpoints mediante Guards | ✅ | `@UseGuards(JwtAuthGuard)` en profile |
| Implementar roles y permisos | ✅ | `@Roles('admin')` + RolesGuard |
| Validar tokens y expiración | ✅ | `ignoreExpiration: false` + JwtStrategy |
| Probar accesos autorizados | ✅ | auth.service.spec.ts, auth.controller.spec.ts |
| Probar accesos no autorizados | ✅ | UnauthorizedException tests en e2e |

---

## Comandos de Verificación

```bash
# Ejecutar tests de auth
npm run test -- --testPathPattern=auth

# Ejecutar tests e2e de auth
npm run test:e2e -- --testPathPattern=auth

# Linting
npm run lint

# Typecheck
npx tsc --noEmit
```

---

## Dependencias

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| `@nestjs/jwt` | ^10.2.0 | Generación y validación de tokens |
| `@nestjs/passport` | ^10.0.3 | Integración de estrategias |
| `passport` | ^0.7.0 | Framework de autenticación |
| `passport-jwt` | ^4.0.1 | Estrategia JWT |
| `bcrypt` | ^5.1.1 | Hash de contraseñas |
| `class-validator` | ^0.14.1 | Validación de DTOs |
| `@nestjs/config` | ^3.1.1 | Variables de entorno |

---

## Flujo Completo de Autenticación

```
REGISTRO:
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Cliente │──►  │  POST    │──►  │  Auth    │
│          │     │ /auth/   │     │ Controller│
│          │     │ register │     │          │
└──────────┘     └──────────┘     └────┬─────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ UsersService │
                               │ create()     │
                               │ • Check email│
                               │ • bcrypt.hash│
                               │ • Save user  │
                               └──────────────┘

LOGIN:
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Cliente │──►  │  POST    │──►  │  Auth    │
│          │     │ /auth/   │     │ Controller│
│          │     │ login    │     │          │
└──────────┘     └──────────┘     └────┬─────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ validateUser │
                               │ • findByEmail│
                               │ • bcrypt cmp │
                               └──────┬───────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ JwtService   │
                               │ .sign({      │
                               │   sub,       │
                               │   email,     │
                               │   role       │
                               │ })           │
                               └──────┬───────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ {            │
                               │   access_token│
                               │   user       │
                               │ }            │
                               └──────────────┘

PERFIL PROTEGIDO:
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Cliente │──►  │  GET     │──►  │  JwtAuth │──►  │  Auth    │
│          │     │ /auth/   │     │  Guard   │     │ Controller│
│          │     │ profile  │     │          │     │          │
│ Bearer   │     │          │     │ • Decod  │     │ • Perfil │
│ Token    │     │          │     │ • Verific│     │ • Retorna│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

---

## Notas

- El password nunca se incluye en respuestas gracias a `select: false` y `delete user.password`
- El token expira en 7 días por defecto (configurable en .env)
- El `sub` en el payload es el ID del usuario (UUID)
- `RolesGuard` usa `@nestjs/core` Reflector para leer metadatos
- El `JwtStrategy` valida el token en cada request protegida
- `AuthModule` exporta `AuthService` para uso en otros módulos
- Los tests usan `jest.mock('bcrypt')` para evitar hashing real
- La expiración del token se valida con `ignoreExpiration: false`
- El `CORS_ORIGIN` permite configurar el origen permitido
