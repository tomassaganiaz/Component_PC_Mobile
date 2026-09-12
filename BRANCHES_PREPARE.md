# ERS - Branches Prepare

## Documento de Preparación de Ramas

Este documento describe el estado actual de las ramas y el plan para preparar nuevas funcionalidades.

---

## Estado Actual de Ramas

| Rama | Estado | Último Commit | Descripción |
|------|--------|---------------|-------------|
| `main` | 🟢 Activa | `0318eb2` | Código estable en producción |
| `develop` | 🟢 Activa | `0318eb2` | Integración continua |
| `feature/auth` | ⬜ No creada | - | Autenticación JWT |
| `feature/users` | ⬜ No creada | - | Gestión de usuarios |
| `feature/products` | ⬜ No creada | - | CRUD productos |
| `feature/orders` | ⬜ No creada | - | Sistema de órdenes |
| `feature/verifications` | ⬜ No creada | - | Verificación productos usados |
| `feature/reviews` | ⬜ No creada | - | Reseñas y TrustBadge |
| `feature/database` | ⬜ No creada | - | Schema SQL |
| `hotfix/*` | ⬜ No creada | - | Correcciones de emergencia |

---

## Proceso de Creación de Rama

### Paso 1: Desde develop

```bash
# Asegurarse de estar en develop
git checkout develop
git pull origin develop

# Crear nueva rama
git checkout -b feature/nombre-feature
```

### Paso 2: Trabajar en la rama

```bash
# Hacer commits atómicos
git add .
git commit -m "feat(nombre-feature): descripción corta"

# Push a origin
git push -u origin feature/nombre-feature
```

### Paso 3: Pull Request

```bash
# Crear PR en GitHub
# https://github.com/tomassaganiaz/Component_PC_Mobile/pull/new/feature/nombre-feature
```

---

## Preparación de Feature Branches Existentes

### 📋 feature/auth - YA EN main

**Estado:** Implementada y en main

**Para crear rama desde main:**
```bash
git checkout main
git pull origin main
git checkout -b feature/auth
git push -u origin feature/auth
```

**Contenido de la rama:**
- Autenticación JWT completa
- Roles (buyer, seller, admin)
- Guards: JwtAuthGuard, RolesGuard
- Strategy: JwtStrategy
- Endpoints: register, login, profile

**Archivos:**
```
backend/src/auth/
├── auth.controller.ts
├── auth.service.ts
├── auth.module.ts
├── decorators/roles.decorator.ts
├── guards/jwt-auth.guard.ts
├── guards/roles.guard.ts
└── strategies/jwt.strategy.ts
```

**Tests:**
- `backend/src/auth/auth.service.spec.ts`
- `backend/src/auth/auth.controller.spec.ts`
- `backend/test/auth.e2e-spec.ts`

---

### 📋 feature/users - YA EN main

**Estado:** Implementada y en main

**Para crear rama:**
```bash
git checkout main
git checkout -b feature/users
git push -u origin feature/users
```

**Contenido:**
- CRUD completo de usuarios
- Soft delete
- Email único
- Relaciones con products, orders, reviews

**Archivos:**
```
backend/src/users/
├── user.entity.ts
├── users.controller.ts
├── users.module.ts
├── users.service.ts
└── dto/
    ├── CreateUserDto.ts
    ├── UpdateUserDto.ts
    └── LoginDto.ts
```

---

### 📋 feature/products - YA EN main

**Estado:** Implementada y en main

**Para crear rama:**
```bash
git checkout main
git checkout -b feature/products
git push -u origin feature/products
```

**Contenido:**
- CRUD con filtros avanzados
- 14 categorías de productos
- Estados: draft, pending, verified, published, sold
- Condiciones: new, used
- Índices compuestos para optimización

**Archivos:**
```
backend/src/products/
├── product.entity.ts
├── products.controller.ts
├── products.module.ts
├── products.service.ts
└── dto/
    ├── CreateProductDto.ts
    ├── UpdateProductDto.ts
    └── FilterProductDto.ts
```

**Tests:**
- `backend/src/products/products.service.spec.ts`
- `backend/src/products/products.controller.spec.ts`
- `backend/test/products.e2e-spec.ts`

---

### 📋 feature/orders - YA EN main

**Estado:** Implementada y en main

**Para crear rama:**
```bash
git checkout main
git checkout -b feature/orders
git push -u origin feature/orders
```

**Contenido:**
- Sistema de custodia de 3 días
- Estados: pending, paid, in_custody, shipped, delivered, cancelled, refunded
- Validación de cancelación
- Relaciones con users y products

**Archivos:**
```
backend/src/orders/
├── order.entity.ts
├── orders.controller.ts
├── orders.module.ts
├── orders.service.ts
└── dto/
    ├── CreateOrderDto.ts
    └── UpdateOrderDto.ts
```

---

### 📋 feature/verifications - YA EN main

**Estado:** Implementada y en main

**Para crear rama:**
```bash
git checkout main
git checkout -b feature/verifications
git push -u origin feature/verifications
```

**Contenido:**
- Verificación profesional de productos usados
- Solo admin puede crear verificaciones
- Resultados: pass, fail, conditional
- Quality score
- Checklist predefinido por categoría

**Archivos:**
```
backend/src/verifications/
├── verification.entity.ts
├── verifications.controller.ts
├── verifications.module.ts
├── verifications.service.ts
└── dto/
    └── CreateVerificationDto.ts
```

---

### 📋 feature/reviews - YA EN main

**Estado:** Implementada y en main

**Para crear rama:**
```bash
git checkout main
git checkout -b feature/reviews
git push -u origin feature/reviews
```

**Contenido:**
- Sistema de reseñas y quejas
- TrustBadge: Safe/Intermediate/Unsafe
- Cálculo automático de etiqueta
- Protección contra quejas falsas
- Una reseña por compra

**Archivos:**
```
backend/src/reviews/
├── review.entity.ts
├── reviews.controller.ts
├── reviews.module.ts
├── reviews.service.ts
└── dto/
    └── index.ts
```

---

### 📋 feature/database - YA EN main

**Estado:** Implementada y en main

**Para crear rama:**
```bash
git checkout main
git checkout -b feature/database
git push -u origin feature/database
```

**Contenido:**
- Schema SQL completo (13 tablas)
- Seed data (50+ registros)
- Índices, constraints, triggers

**Archivos:**
```
database/
├── 01_schema.sql
├── 02_seed_data.sql
└── README.md
```

---

## Plan de Migración de Features a Ramas

### Paso 1: Crear ramas desde main

```bash
# Crear todas las feature branches desde main
git checkout main

# Auth
git checkout -b feature/auth
git push -u origin feature/auth
git checkout main

# Users
git checkout -b feature/users
git push -u origin feature/users
git checkout main

# Products
git checkout -b feature/products
git push -u origin feature/products
git checkout main

# Orders
git checkout -b feature/orders
git push -u origin feature/orders
git checkout main

# Verifications
git checkout -b feature/verifications
git push -u origin feature/verifications
git checkout main

# Reviews
git checkout -b feature/reviews
git push -u origin feature/reviews
git checkout main

# Database
git checkout -b feature/database
git push -u origin feature/database
git checkout main
```

### Paso 2: Reset each feature branch to match main

```bash
# Para cada feature, asegurar que está actualizada con main
git checkout feature/auth
git reset --hard main
git push --force origin feature/auth
```

### Paso 3: Crear PRs

Para cada feature branch, crear un Pull Request desde `feature/{nombre}` hacia `develop`.

---

## Hotfix Procedure

```bash
# 1. Crear rama desde main
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-corta

# 2. Hacer la corrección
git add .
git commit -m "fix: descripcion de la corrección"
git push -u origin hotfix/descripcion-corta

# 3. Crear PR a main
# 4. Merge a main y develop
git checkout main
git merge hotfix/descripcion-corta
git checkout develop
git merge hotfix/descripcion-corta

# 5. Tag de versión
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin v1.0.1
```

---

## Release Process

### Preparar Release v1.0.0

```bash
# 1. Merge develop a main
git checkout main
git merge develop

# 2. Crear tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 3. Crear rama release
git checkout -b release/v1.0.0
git push -u origin release/v1.0.0

# 4. Si hay cambios en release, merge de vuelta a develop
git checkout develop
git merge release/v1.0.0
```

---

## Verificación de Rama

### Antes de crear PR, verificar:

```bash
# Verificar que la rama está actualizada
git fetch origin
git log --oneline origin/main..HEAD

# Verificar tests pasan
cd backend
npm run test
npm run test:e2e

# Verificar linting
npm run lint

# Verificar build
npm run build
```

---

## Estructura de Commits por Rama

```
feature/auth:
  - feat(auth): implement JWT authentication
  - feat(auth): add guards and strategies
  - feat(auth): add roles decorator
  - feat(auth): add DTOs for validation
  - test(auth): add service and controller tests
  - test(auth): add e2e tests

feature/users:
  - feat(users): implement CRUD operations
  - feat(users): add soft delete functionality
  - feat(users): add indexes for optimization
  - test(users): add comprehensive tests

feature/products:
  - feat(products): implement product CRUD
  - feat(products): add filtering capabilities
  - feat(products): add indexes for performance
  - test(products): add service and controller tests

feature/orders:
  - feat(orders): implement order system
  - feat(orders): add custody logic (3 days)
  - feat(orders): add cancellation validation
  - test(orders): add comprehensive tests

feature/verifications:
  - feat(verifications): implement verification system
  - feat(verifications): add admin-only access
  - feat(verifications): add quality scoring
  - test(verifications): add comprehensive tests

feature/reviews:
  - feat(reviews): implement review system
  - feat(reviews): add TrustBadge calculation
  - feat(reviews): add complaint handling
  - test(reviews): add comprehensive tests
```

---

## Notas Importantes

### Reglas de Rama

1. **Nunca hacer push directo a main** - Solo vía PR desde release
2. **Siempre hacer PR a develop** - Para merge de features
3. **No borrar ramas sin merge** - Mantener historial
4. **Commits atómicos** - Un cambio por commit
5. **Mensajes descriptivos** - Usar conventional commits

### Convención de Commits

```
tipo(scope): descripción

Tipos:
- feat: Nueva funcionalidad
- fix: Corrección de bug
- docs: Documentación
- refactor: Refactorización
- test: Tests
- chore: Tareas de mantenimiento

Ejemplos:
- feat(auth): agregar JWT authentication
- fix(orders): corregir validación de cancelación
- docs(reviews): actualizar TrustBadge en README
```

---

## Links Útiles

| Recurso | URL |
|---------|-----|
| Repositorio | https://github.com/tomassaganiaz/Component_PC_Mobile |
| Pull Requests | https://github.com/tomassaganiaz/Component_PC_Mobile/pulls |
| Issues | https://github.com/tomassaganiaz/Component_PC_Mobile/issues |
| Swagger | http://localhost:3000/api/docs |
| Deploy | [Por configurar] |
