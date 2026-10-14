# Guía Frontend — ERS / TechShield (Expo / React Native)

Guía general para entender **qué hace cada carpeta** del frontend y poder explicarlo en una defensa oral.

## 1. Qué es

App del marketplace que corre en **web, Android e iOS** desde una sola base de código. Stack: **Expo + React Native + Expo Router + NativeWind (Tailwind) + TypeScript**.

- Metro/Dev server: `http://localhost:8081`
- Se conecta a la API en `http://<host>:3000/api` (ver `src/config.ts`)

```bash
cd Frontend
npm install
npx expo start            # dev server (QR para móvil, tecla w para web)
npm run typecheck         # tsc --noEmit
npm run lint              # expo lint
npm test                  # Jest (jest-expo)
npm run smoke             # smoke del dev server
npm run build:web         # export web estático + SRI
```

## 2. Estructura de carpetas (lo importante para defender)

```
Frontend/
├── app.json                 # Config de Expo (nombre, iconos, plugins, web output)
├── babel.config.js          # Babel (NativeWind + Expo)
├── metro.config.js          # Bundler Metro (NativeWind)
├── tailwind.config.js       # Tokens de diseño (colores, etc.)
├── global.css               # Variables CSS (:root claro / .dark oscuro)
├── src/
│   ├── app/                 # RUTAS (Expo Router, file-based). 1 archivo = 1 ruta
│   │   ├── _layout.tsx      # Layout raíz: providers + Stack + protección de sesión
│   │   ├── index.tsx        # "/" → Explorar (marketplace)
│   │   ├── login.tsx · register.tsx
│   │   ├── filters.tsx · publish.tsx · profile.tsx · sales.tsx · analytics.tsx
│   │   ├── inspection.tsx   # Seguimiento de orden en custodia
│   │   ├── product/[id].tsx # Detalle de producto (ruta dinámica)
│   │   └── +html.tsx        # HTML base para la versión web
│   │
│   ├── screens/             # Lógica/pantallas reales (los archivos de app/ son wrappers finos)
│   │   ├── ExploreScreen.tsx        # Listado + búsqueda + filtros + scroll infinito
│   │   ├── ProductDetailScreen.tsx  # Detalle, seguridad del vendedor, checkout
│   │   ├── PublishScreen.tsx        # Crear producto (vendedor)
│   │   ├── ProfileScreen.tsx        # Perfil, KYC, mis compras, mis publicaciones
│   │   ├── SalesScreen.tsx          # "Mis ventas" del vendedor
│   │   ├── InspectionScreen.tsx     # Seguimiento + acciones de la orden
│   │   ├── FiltersScreen.tsx · AnalyticsScreen.tsx · Login/Register
│   │
│   ├── components/          # Componentes reutilizables de UI
│   │   ├── ProductCard.tsx  # Tarjeta de producto (badges, stock, comprar)
│   │   ├── AppHeader.tsx · BottomNav.tsx · AppIcon.tsx
│   │   ├── ProductImage.tsx # Imagen con fallback/optimización
│   │   ├── ReviewModal.tsx  # Reseñar compra
│   │   └── ui.tsx           # Primitivos (Avatar, Pill, ProgressBar, Segmented…)
│   │
│   ├── context/             # Estado global con React Context
│   │   ├── AuthContext.tsx        # Sesión (login/logout) + tokens + restaurar sesión
│   │   ├── MarketplaceContext.tsx # Filtros, búsqueda y resultados cacheados (useReducer)
│   │   └── ThemeContext.tsx       # Tema claro/oscuro/sistema
│   │
│   ├── services/            # Acceso a datos/servicios externos
│   │   ├── api.ts           # Cliente REST: fetch + refresh automático ante 401
│   │   ├── storage.ts       # Persistencia local (expo-secure-store)
│   │   ├── analytics.ts     # Envío de eventos al backend
│   │   └── webVitals.ts     # Core Web Vitals (web)
│   │
│   ├── hooks/               # Hooks propios (useTrack: registrar evento con la ruta actual)
│   ├── i18n/                # Internacionalización (es/en) + hook useI18n / t()
│   ├── data/mock.ts         # Datos demo (fallback si el backend no responde)
│   ├── utils/               # Helpers (product.ts: ApiProduct → ExploreCard)
│   ├── navigation.ts        # Helper de navegación (nav.go / nav.back)
│   ├── theme.ts             # Paleta de colores y helpers (glow, shadow)
│   ├── types.ts             # Tipos/interfaces compartidos (Product, Order, etc.)
│   └── config.ts            # API_URL según plataforma/entorno
└── __tests__/               # Tests (reducer, navegación, componentes)
```

**Idea clave:** `src/app/` = **rutas** (URLs); `src/screens/` = **pantallas** (contenido); `src/components/` = **bloques de UI**; `src/services/` = **comunicación con el backend**.

## 3. Routing (Expo Router, file-based)

- Cada archivo en `src/app/` es una ruta: `src/app/profile.tsx` → `/profile`; `src/app/product/[id].tsx` → `/product/123`.
- `_layout.tsx` envuelve todo con los **providers** (Theme, I18n, Auth, Marketplace) y decide si mostrar login o la app (si no hay sesión → redirige a `/login`).
- Navegación programática vía `navigation.ts` (`nav.go({ name: 'detail', productId })`).

## 4. Estado global (contextos)

| Contexto | Responsabilidad |
|---|---|
| `AuthContext` | Sesión del usuario, login/logout, tokens y restauración al abrir la app |
| `MarketplaceContext` | Filtros, búsqueda, resultados y paginación del catálogo (con `useReducer`) |
| `ThemeContext` | Tema claro/oscuro/sistema |
| `I18nProvider` | Idioma (es/en) y formateo de moneda/fechas |

## 5. Cliente API (`src/services/api.ts`)

- Centraliza **todas** las llamadas (`getProducts`, `createOrder`, `payOrder`, `getMySales`, …).
- Maneja el JWT: agrega `Authorization: Bearer`.
- **Ante un 401**, rota el refresh token y reintenta la petición una vez de forma automática.
- Convierte errores del backend en mensajes legibles (`ApiError`).

## 6. Flujo de compra en la app

`ExploreScreen` (listado) → `ProductDetailScreen` (detalle + checkout) → crea la orden y confirma el pago → `InspectionScreen` (seguimiento en custodia) donde se ven las acciones según rol/estado (pagar, marcar enviado, confirmar recepción, cancelar).

## 7. Diseño y multiplataforma

- **NativeWind**: clases tipo Tailwind en componentes React Native (`className`), con tokens en `tailwind.config.js` y `global.css` (variables por tema).
- **Web**: export estático (SSG), PWA (manifest + service worker) y **SRI** en los assets.
- **Offline/fallback**: si el backend no responde, `ExploreScreen` usa `data/mock.ts`.

## 8. Testing

- **Jest + jest-expo**: 18 tests (reducer del marketplace, `createNav`, componente `ProductImage`).
- Verificación estática: `npm run typecheck` (tsc) y `npm run lint` (expo lint).
- **Smoke**: `npm run smoke` (web, bundle Android, rutas clave, QR/manifiesto).

## 9. Defensa oral — preguntas probables

- **¿Por qué Expo/React Native?** Una sola base de código para web y móvil, con Expo Router y dev rápido.
- **¿Cómo funciona el routing?** File-based: cada archivo de `src/app/` es una ruta; `_layout.tsx` define providers y protección de sesión.
- **¿Cómo manejás el estado?** Contextos (Auth, Marketplace, Theme, i18n); el marketplace usa `useReducer`.
- **¿Cómo te comunicás con el backend?** `services/api.ts` con fetch; ante 401 renueva el token y reintenta.
- **¿Cómo protegés las pantallas?** `_layout.tsx` redirige a `/login` si no hay sesión.
- **¿Multi-idioma?** `src/i18n` con diccionarios es/en y hook `t()`.
- **¿Y si el backend está caído?** Se muestra el modo offline con datos demo (`data/mock.ts`).
- **¿Cómo estilás?** NativeWind (Tailwind) + tokens en `theme.ts` / `global.css`.

## 10. Pendiente

Carrito multi-ítem, pasarela de pago real, notificaciones, wishlist/favoritos, cupones y panel admin (consumo de esos endpoints).
