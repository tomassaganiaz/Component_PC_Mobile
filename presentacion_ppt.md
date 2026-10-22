# TechShield - Presentación del Proyecto

---

## Slide 1: Portada

# TechShield
### Marketplace de Componentes PC y Móviles con Escrow, Verificación y Logística Integrada

**Backend API + Driver App + Integraciones Externas**

**Stack:** NestJS + TypeORM + PostgreSQL + Redis + React/Next.js

**Fecha:** 2025 | **Versión:** 1.0 | **Rama:** `develop`

---

## Slide 2: Problema y Solución

### ❌ Problema Actual
- **Fraude en marketplace** de componentes usados (GPUs, CPUs, móviles)
- **Sin protección al comprador** - pagos directos sin garantía
- **Logística fragmentada** - múltiples carriers, sin tracking unificado
- **Sin verificación técnica** - estado real del producto desconocido
- **Vendedores sin canal oficial** para publicar en Mercado Libre

### ✅ Solución TechShield
| Pilar | Implementación |
|-------|----------------|
| **Escrow** | Pago retenido hasta entrega confirmada |
| **Verificación** | Fotos, videos, stress-test, checklist técnico |
| **Logística** | Multi-carrier (Andreani, OCA, Correo) + planificación rutas |
| **Driver App** | Navegación GPS, estados: LLEGÓ → ENTREGADO/FALLÓ |
| **ML Integration** | Publicar en ML desde TechShield, sync automático |
| **Notificaciones** | Push/Email/SMS/In-App multi-canal |

---

## Slide 3: Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Frontend App   │         │   Driver App     │             │
│  │   (Next.js)      │         │   (React Native) │             │
│  └────────┬─────────┘         └────────┬─────────┘             │
└───────────┼────────────────────────────┼────────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Nginx)                          │
│              Rate Limit • SSL • CORS • WAF                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Auth/Users │ │  Marketplace │ │  Logistics   │
    │   Module    │ │   (Products, │ │  (Shipping,  │
    │             │ │  Orders,     │ │   Delivery,  │
    │             │ │  Verification)│ │   Driver)    │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
    ┌──────┴───────────────┴───────────────┴──────┐
    │           INTEGRATIONS LAYER                 │
    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
    │  │Mercado   │ │ Google   │ │ Notifications│  │
    │  │Libre     │ │ Maps     │ │ (Push/Email/ │  │
    │  │(OAuth,    │ │(Geocode, │ │ SMS/In-App)  │  │
    │  │ Webhooks)│ │ Directions)│             │  │
    │  └──────────┘ └──────────┘ └──────────────┘  │
    └──────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        ┌──────────┐                ┌──────────┐
        │PostgreSQL│                │   Redis  │
        │(TypeORM) │                │(Cache,    │
        │          │                │ Queue,    │
        └──────────┘                │ Sessions) │
                                    └──────────┘
```

---

## Slide 4: Módulos Backend Implementados

### Core Modules (19 módulos)

| Módulo | Entidades | Funcionalidad Clave |
|--------|-----------|---------------------|
| **Auth** | User, Session | JWT, Refresh, 2FA, Roles |
| **Users** | User, Address | Profile, Push Token, ML Connect |
| **Products** | Product, Variation | CRUD, Stock atómico, Variaciones |
| **Orders** | Order, OrderItem, Wallet | Escrow, Coupons, Cart |
| **Verifications** | Verification | Foto/Video, Stress-test, Aprobación |
| **Reviews** | Review | Rating, Quejas, Resolución |
| **Shipping** | Shipment | Quote, Tracking, Multi-carrier |
| **Delivery Planning** | DeliveryRoute, RouteStop | Cron 06:00, 14 zonas, Optimización |
| **Driver App** | - | Dashboard, Navegación, Estados |
| **MercadoLibre** | MlCredential, MlWebhook, DLQ | OAuth, Publish, Sync, Webhooks |
| **Google Maps** | - | Geocoding, Directions, Places, Static Maps |
| **Notifications** | Notification | Push/Email/SMS/In-App multi-canal |
| **Analytics** | Event | Eventos, Métricas, Funnels |

---

## Slide 5: Integración Mercado Libre (Completa)

### Flujo OAuth + Publicación
```
Seller → Frontend → GET /auth-url → Redirect ML OAuth
                                    ↓
                              ML Callback → Exchange Code
                                    ↓
                              Save Tokens (encrypted)
                                    ↓
                              POST /publish/:productId
                                    ↓
                              ML API /items (con variaciones)
                                    ↓
                              Save mlItemId on Product
```

### Webhooks con Retry + DLQ
| Feature | Implementación |
|---------|----------------|
| **Tópicos** | orders_v2, payments, shipments, questions, claims |
| **Seguridad** | HMAC-SHA256 (`x-meli-signature`) |
| **Procesamiento** | Async con queue en Redis |
| **Retry** | Exponencial: 1s × 2^attempt + jitter (máx 5 min, 5 retries) |
| **Dead Letter** | Tras 6 intentos → tabla `ml_webhook_dead_letter` |
| **Replay** | `POST /webhook/dead-letter/:id/replay` |
| **Health** | `GET /webhook/health` → métricas 24h |

### Endpoints ML (13 endpoints)
- `GET /status` - Estado conexión
- `GET /auth-url` - URL OAuth
- `POST /publish/:productId` - Publicar (con variaciones)
- `PUT /items/:mlItemId` - Sync precio/stock/status
- `POST /webhook` - Recibir notificaciones (async)
- `POST /subscriptions` - Suscribir tópicos programático
- `POST /import-sales` - Importar ventas → órdenes locales

---

## Slide 6: Google Maps Integration

### Servicios Implementados
| Servicio | Endpoint | Uso |
|----------|----------|-----|
| **Geocoding** | `GET /maps/geocode?address=` | Dirección → lat/lng |
| **Reverse Geocoding** | `GET /maps/reverse-geocode?lat=&lng=` | Coords → dirección |
| **Directions** | `GET /maps/directions` | Ruta, distancia, tiempo, pasos |
| **Distance Matrix** | `GET /maps/distance-matrix` | Múltiples orígenes/destinos |
| **Static Maps** | `GET /maps/static-map` | Imagen con ruta + marcadores |
| **Places Nearby** | `GET /maps/nearby-pickups` | Correo, tiendas, lockers cercanos |

### Estimación de Entrega
```typescript
estimateDeliveryDate(distanceKm, service: 'standard'|'express'|'pickup')
// Retorna: { estimatedDate, estimatedDays, text: "En 2 días" }
```

### Zonas de Entrega (14 zonas Argentina)
| Zona | Ciudades | Días Std/Express |
|------|----------|------------------|
| CABA | CABA | 1 / 1 |
| GBA Norte | Vicente López, San Isidro, Tigre, Pilar | 2 / 1 |
| GBA Sur | Lomas, Quilmes, Berazategui | 2 / 1 |
| GBA Oeste | Morón, Merlo, Moreno, Luján | 2 / 1 |
| La Plata | La Plata, Berisso | 2 / 1 |
| **Bolívar** | **Bolívar, Gral. Alvear, Saladillo** | **3 / 2** |
| Mar del Plata | Mar del Plata, Balcarce | 3 / 2 |
| Azul, Tandil, Olavarría | Ciudades interior | 3 / 2 |
| Chivilcoy, Pergamino, Junín | Interior | 2-3 / 2 |

---

## Slide 7: Delivery Planning & Driver App

### Planificación Automática (Cron 06:00)
```mermaid
Cron 06:00
    ↓
Query Orders: PAID/IN_CUSTODY sin ruta
    ↓
Geocodificar compradores (user.lat/lng + fallback)
    ↓
Asignar zona (14 zonas por haversine)
    ↓
Agrupar por zona → Nearest Neighbor desde CABA
    ↓
Calcular km, duración, ETA por zona
    ↓
Guardar DeliveryRoute + RouteStops
    ↓
Notificar carrier + compradores (Push/Email/In-App)
```

### Zonas y Tiempos
| Zona | Radio | Días Std | Días Express |
|------|-------|----------|--------------|
| CABA | 15km | 1 | 1 |
| GBA Norte/Sur/Oeste | 30-40km | 2 | 1 |
| La Plata | 25km | 2 | 1 |
| **Bolívar** | **50km** | **3** | **2** |
| Mar del Plata, Azul, Tandil, Olavarría | 30-35km | 3 | 2 |
| Chivilcoy, Pergamino, Junín | 30km | 2-3 | 2 |
| Other | 1000km | 4 | 3 |

### Driver App Endpoints (8)
| Endpoint | Acción |
|----------|--------|
| `GET /driver/dashboard` | Dashboard: ruta actual, próximas, stats |
| `GET /driver/current-route` | Ruta actual con paradas + mapas |
| `POST /driver/stops/:id/arrive` | Marcar "LLEGÓ" |
| `POST /driver/stops/:id/deliver` | Marcar "ENTREGADO" |
| `POST /driver/stops/:id/fail` | Reportar fallo + motivo |
| `GET /driver/stops/:id/navigation` | URL Google Maps + mapa estático |
| `GET /driver/route-history` | Historial paginado |

---

## Slide 8: Notificaciones Multi-Canal

### Eventos y Canales
| Evento | Push | Email | SMS | In-App |
|--------|------|-------|-----|--------|
| **delivery_assigned** | ✅ | ✅ | | ✅ |
| **delivery_started** | ✅ | | | ✅ |
| **delivery_approaching** | ✅ | | ✅ | |
| **delivery_completed** | ✅ | ✅ | | ✅ |
| **delivery_failed** | ✅ | ✅ | ✅ | ✅ |

### Implementación
| Canal | Librería | Template |
|-------|----------|----------|
| **Push** | `firebase-admin` | FCM con data tracking, icono, sonido |
| **Email** | `@sendgrid/mail` | HTML responsive + botón "Ver tracking" |
| **SMS** | `twilio` | Texto + link tracking + formato AR (+54) |
| **In-App** | PostgreSQL | Tabla `notifications` con metadata JSON |

### Variables de Entorno
```env
# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# SendGrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@techshield.com

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+54911xxxxxxxx
```

---

## Slide 9: Swagger / OpenAPI Documentation

### Acceso
```
http://localhost:3000/api/docs
```

### Características
- **13 Tags** con emojis: 🔐 Auth, 👤 Users, 🛒 Products, 🛍️ Orders, ✅ Verifications, ⭐ Reviews, 📊 Analytics, 🚚 Shipping, 🗺️ Delivery Planning, 📱 Driver App, 🔗 Mercado Libre, 🗺️ Google Maps, 🔔 Notifications
- **2 Servers**: Local (localhost:3000) + Producción (api.techshield.com)
- **Auth**: JWT Bearer con botón "Authorize" persistente
- **UI Custom**: Tema verde TechShield, request duration, filter, try-it-out
- **Descripción completa**: Markdown con módulos, códigos error, paginación, webhooks

---

## Slide 10: Testing & Quality

### Tests (208 passing)
| Suite | Tests | Cobertura |
|-------|-------|-----------|
| Mercadolibre Service | 27 | OAuth, publish, sync, webhooks, retry |
| Mercadolibre Controller | 16 | Endpoints, webhook async, subscriptions |
| Google Maps Service | 13 | Geocoding, Directions, Static Maps, Delivery |
| Google Maps Controller | 16 | Endpoints, params validation |
| Driver App Service | 18 | Dashboard, arrive/deliver/fail, navigation |
| Products, Orders, Users, Auth, etc. | 118 | CRUD, business logic, edge cases |

**Total: 208 tests** ✅

### Quality Gates
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ 208 unit/integration tests
- ✅ Build exitoso (`npm run build`)
- ✅ Swagger generado sin errores

---

## Slide 11: Variables de Entorno Requeridas

```env
# ==================== APP ====================
NODE_ENV=development
PORT=3000
JWT_SECRET=super-secret-random-32-chars-min
CORS_ORIGIN=http://localhost:3000
APP_FRONTEND_URL=http://localhost:3000

# ==================== DATABASE ====================
DATABASE_URL=postgresql://user:pass@localhost:5432/techshield
# O individual:
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=techshield
DATABASE_SSL=false

# ==================== REDIS ====================
REDIS_HOST=localhost
REDIS_PORT=6379

# ==================== MERCADO LIBRE ====================
ML_CLIENT_ID=xxx
ML_CLIENT_SECRET=xxx
ML_REDIRECT_URI=https://tudominio.com/api/mercadolibre/callback
ML_WEBHOOK_URL=https://tudominio.com/api/mercadolibre/webhook
ML_SITE=MLA

# ==================== GOOGLE MAPS ====================
GOOGLE_MAPS_API_KEY=AIzaSy...

# ==================== NOTIFICACIONES ====================
# Firebase (Push)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
# O solo: FIREBASE_PROJECT_ID=tu-proyecto

# SendGrid (Email)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@techshield.com
SENDGRID_FROM_NAME=TechShield

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+54911xxxxxxxx

# ==================== WEBHOOK RETRY ====================
ML_WEBHOOK_MAX_RETRIES=5
ML_WEBHOOK_BASE_DELAY_MS=1000
ML_WEBHOOK_MAX_DELAY_MS=300000
ML_WEBHOOK_BACKOFF_MULTIPLIER=2
ML_WEBHOOK_RETENTION_DAYS=30
ML_WEBHOOK_DLQ_RETENTION_DAYS=90
```

---

## Slide 12: Deployment & DevOps

### Docker (Backend)
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: techshield
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/techshield
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=production
    depends_on: [postgres, redis]

volumes:
  postgres_data:
```

### GitHub Actions CI/CD (`.github/workflows/ci.yml`)
```yaml
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: techshield, POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres }
        ports: [5432:5432]
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - run: npm run test
  deploy:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: echo "Deploy to staging server"
```

---

## Slide 13: Próximos Pasos (Roadmap)

### Q1 2025 - Core Platform
- [ ] **WebSocket Tracking Real-time** - Socket.io para GPS driver en vivo
- [ ] **Admin Analytics Dashboard** - Métricas por zona/carrier/vendedor
- [ ] **Rate Limiting Avanzado** - Throttling por IP/user, circuit breaker
- [ ] **CI/CD Pipeline** - GitHub Actions completado

### Q2 2025 - Platform Features
- [ ] **Chat In-App** - Comprador ↔ Vendedor ↔ Driver
- [ ] **Pagos Integrados** - Mercado Pago / Stripe nativo
- [ ] **App Mobile Nativa** - React Native / Expo para compradores
- [ ] **Marketplace Público** - SEO, landing pages, marketplace público

### Q3 2025 - Scale & Intelligence
- [ ] **ML/AI Pricing** - Precios sugeridos por demanda/historial
- [ ] **Fraud Detection** - Anomalías en patrones de compra/venta
- [ ] **Multi-region** - Expansión a más países (MLB, MLC, MCO)
- [ ] **Kubernetes** - Migración a K8s con Helm charts

---

## Slide 14: Métricas de Éxito (KPIs)

### Técnicas
| Métrica | Target |
|---------|--------|
| **Uptime** | 99.9% |
| **API Latency (p95)** | < 200ms |
| **Webhook Processing** | < 5s (async) |
| **Test Coverage** | > 80% |
| **Build Time** | < 3 min |

### Negocio
| Métrica | Target |
|---------|--------|
| **Órdenes con Escrow** | 100% |
| **Tasa Entrega Exitosa** | > 95% |
| **Tiempo Promedio Entrega** | < 48h (CABA/GBA) |
| **Satisfacción Comprador** | > 4.5/5 |
| **Vendedores Activos ML** | > 500 en 6 meses |

---

## Slide 15: Contacto y Próximos Pasos

### Repositorio
```
https://github.com/tomassaganiaz/Component_PC_Mobile
Rama: develop
```

### Documentación
- **API Docs:** `http://localhost:3000/api/docs` (Swagger)
- **Architecture:** `ARCHITECTURE.md` (5 diagramas Mermaid)
- **Postman Collection:** Disponible en `/docs/postman/`

### Equipo
- **Backend:** NestJS + TypeORM + PostgreSQL
- **Frontend:** Next.js 14 + TanStack Query + Zustand
- **Driver App:** React Native / Expo
- **Infra:** Docker, GitHub Actions, PostgreSQL, Redis

### Próxima Reunión
**Demo Técnica** - Próxima semana
- Demo end-to-end: ML Publish → Sale → Webhook → Delivery → Driver
- Review arquitectura y decisiones técnicas
- Definir sprints Q1 2025

---

## Appendix: Comandos Útiles

```bash
# Desarrollo
cd backend
npm run start:dev          # Hot reload
npm run build              # Compilar
npm run test               # Tests (208)
npm run test:cov           # Coverage
npm run lint               # ESLint

# Base de datos
npm run migration:generate -- -n nombre
npm run migration:run
npm run migration:revert

# Docker
docker-compose up -d
docker-compose logs -f backend

# Swagger
open http://localhost:3000/api/docs
```

---

**TechShield** - *Donde la confianza se entrega* 🛡️

**¡Gracias!** Preguntas y feedback bienvenidos.