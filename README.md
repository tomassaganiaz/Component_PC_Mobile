# ERS - Plataforma de Compra y Venta de Componentes

Marketplace para componentes de PC y móviles con verificación de productos usados y garantía de calidad.

## Arquitectura

```
Component_PC_Celu/
├── backend/          # API NestJS + TypeORM + PostgreSQL
├── frontend/         # App React Native + Expo + Tailwind
├── AGENTS.md         # Guía de contribución
└── .gitignore
```

## Requisitos Previos

- Node.js >= 18
- npm >= 9
- PostgreSQL >= 15
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Xcode (para emuladores)

## Inicio Rápido

### Backend

```bash
cd backend
npm install
cp .env.example .env    # Configurar variables de entorno
npm run migration:run   # Ejecutar migraciones
npm run start:dev       # Servidor en http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npx expo start          # Abrir en emulador o dispositivo
```

## Comandos Disponibles

### Backend

| Comando | Descripción |
|---------|-------------|
| `npm run start:dev` | Servidor con hot-reload |
| `npm run build` | Compilar producción |
| `npm run start:prod` | Ejecutar compilación |
| `npm run test` | Tests unitarios |
| `npm run test:e2e` | Tests end-to-end |
| `npm run lint` | Linting con ESLint |
| `npm run migration:generate` | Generar migración |
| `npm run migration:run` | Ejecutar migraciones |

### Frontend

| Comando | Descripción |
|---------|-------------|
| `npx expo start` | Dev server |
| `npx expo start --android` | Abrir en Android |
| `npx expo start --ios` | Abrir en iOS |
| `npm run lint` | Linting con ESLint |
| `npm run typecheck` | Verificación de tipos |

## Base de Datos

### Esquema Principal

- **users**: Usuarios compradores/vendedores
- **products**: Productos (nuevos/usados) con fotos y descripción
- **orders**: Órdenes de compra
- **verifications**: Informes de verificación de productos usados

### Variables de Entorno

```env
# Backend (.env)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=ers_components
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=7d
PORT=3000
```

## Stack Tecnológico

- **Backend**: NestJS, TypeORM, PostgreSQL, JWT, class-validator
- **Frontend**: React Native, Expo, Tailwind CSS (NativeWind), TypeScript
- **Testing**: Jest, Supertest (backend), Jest (frontend)

## Flujo de Productos Usados

1. Vendedor publica producto usado
2. Producto recibido por equipo de verificación
3. Tests de calidad y funcionalidad
4. Registro de horas de uso y estado físico
5. Publicación con etiqueta **"Verificado"**

## Licencia

MIT
