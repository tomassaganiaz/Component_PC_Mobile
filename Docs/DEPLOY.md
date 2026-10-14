# Guía de despliegue

## 1. Base de datos en la nube (PostgreSQL)

Recomendado: **Neon**, **Supabase** o **Railway**. Creá la base y copiá la URL de conexión.
El backend soporta `DATABASE_URL` con SSL (`DATABASE_SSL=true`).

```env
# backend/.env  (producción)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
DATABASE_SSL=true
JWT_SECRET=<secreto aleatorio de 32+ chars>   # obligatorio en prod (el server no arranca si es débil)
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d
CORS_ORIGIN=https://tu-frontend.com
```

Generá un secreto fuerte: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

Aplicá el esquema: en desarrollo TypeORM `synchronize` crea las tablas; en producción ejecutá migraciones:

```bash
npm run migration:run
```

> No uses `synchronize` en producción. `main.ts` bloquea `JWT_SECRET` débil cuando `NODE_ENV=production`.

## 2. Backend (NestJS)

```bash
cd backend
npm ci
npm run build
node dist/main      # o: npm run start:prod  (PORT configurable)
```

Variables sensibles (no commitear `.env`): `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.

## 3. Frontend web (SSG + PWA)

```bash
cd Frontend
npm ci
EXPO_PUBLIC_API_URL="https://api.tu-dominio.com/api" npm run build:web
# genera dist/ con index.html por ruta + SRI + manifest + service worker
```

Desplegar `dist/` en:
- **Netlify**: el workflow `.github/workflows/web.yml` ya hace deploy si configurás
  `NETLIFY_AUTH_TOKEN` y `NETLIFY_SITE_ID` (Settings → Secrets → Actions).
- **EAS Hosting** / Vercel / Cloudflare Pages: subir `dist/` como sitio estático.

Configurá `EXPO_PUBLIC_API_URL` para que el build apunte a la API de producción (si no, usa detección de host).

## 4. App móvil

- **Expo Go** (dev): `npm run start` (LAN) o túnel propio `npm run start:tunnel` con `NGROK_AUTHTOKEN`.
- **Build/EAS**: `eas build --platform android|ios` (perfiles en `eas.json`, si existe).

## 5. CI/CD

- `.github/workflows/ci.yml`: tests/lint/build del **backend** (usa Postgres de servicio).
- `.github/workflows/web.yml`: typecheck/lint/tests + build del **frontend** + deploy a Netlify.

## 6. Smoke tests

Con backend y dev server levantados:

```bash
cd backend  && npm run smoke   # API, refresh, regla de catálogo (10 checks)
cd Frontend && npm run smoke   # web, rutas y QR/manifiesto
```
