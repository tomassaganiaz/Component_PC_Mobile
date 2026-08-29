# Repository Guidelines

## Project Structure & Module Organization

Monorepo con dos aplicaciones independientes:

- **`backend/`** — API REST con NestJS. Módulos organizados por dominio: `users`, `products`, `orders`, `verifications`. Cada módulo contiene su propio controller, service, entity y DTOs. Configuración TypeORM en `src/database/`.
- **`frontend/`** — App React Native con Expo. Screens en `src/screens/`, componentes reutilizables en `src/components/`, servicios API en `src/services/`, hooks personalizados en `src/hooks/`.

## Build, Test, and Development Commands

### Backend (`cd backend`)

```bash
npm run start:dev          # Servidor con hot-reload (puerto 3000)
npm run build              # Compilar TypeScript
npm run test               # Tests unitarios (Jest)
npm run test:e2e           # Tests end-to-end
npm run lint               # ESLint
npm run migration:generate # Generar migración TypeORM
npm run migration:run      # Ejecutar migraciones pendientes
```

### Frontend (`cd frontend`)

```bash
npx expo start             # Dev server con Expo
npx expo start --android   # Abrir en emulador Android
npx expo start --ios       # Abrir en emulador iOS
npm run lint               # ESLint
npm run typecheck          # tsc --noEmit
```

## Coding Style & Naming Conventions

- **TypeScript strict mode** habilitado en ambos proyectos
- **ESLint** con reglas recomendadas + Prettier
- **Nombres**: PascalCase para entities/clases, camelCase para funciones/variables, kebab-case para archivos
- **DTOs**: Usar class-validator para validación de datos en NestJS
- **Entities**: Decoradores TypeORM, una entity por tabla
- **Components**: Functional components con hooks, un componente por archivo
- **Imports**: Ordenar por librerías externas → módulos internos → estilos

## Testing Guidelines

- **Backend**: Jest para unit tests, Supertest para e2e. Tests junto al código en archivos `.spec.ts`
- **Frontend**: Jest + React Native Testing Library. Tests en carpeta `__tests__/`
- Cobertura mínima: 70% en services y controllers

## Commit & Pull Request Guidelines

- Commits en formato: `tipo(scope): descripción`
- Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Ejemplo: `feat(products): agregar filtro por estado de verificación`
- PRs deben incluir descripción del cambio y referencia a issue si aplica

## Database Conventions

- Tablas en snake_case (ej: `verification_reports`)
- Columnas created_at y updated_at automáticas con TypeORM
- Soft deletes con columna `deleted_at`
- Migraciones nombradas: `TIMESTAMP-nombre-migracion`
