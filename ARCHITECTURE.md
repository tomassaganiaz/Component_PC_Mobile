# TechShield - Architecture Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        FE[Frontend App\nReact/Next.js]
        DA[Driver App\nReact Native/Expo]
    end

    subgraph "API Gateway / Load Balancer"
        LB[Nginx / Cloudflare\nRate Limit, SSL, WAF]
    end

    subgraph "Backend Services (NestJS Monolith)"
        AUTH[Auth Module\nJWT, Refresh, 2FA]
        USR[Users Module\nProfile, Address, Push Token]
        PRD[Products Module\nCRUD, Variaciones, Stock]
        ORD[Orders Module\nEscrow, Wallet, Coupons, Cart]
        VER[Verifications Module\nTécnica, Fotos, Videos]
        REV[Reviews Module\nRating, Quejas, Resolución]
        SHP[Shipping Module\nQuote, Tracking, Carrier API]
        DPL[Delivery Planning\nCron 06:00, Zonas, Optimización]
        DRV[Driver App Module\nDashboard, Navegación, Estados]
        ML[MercadoLibre Module\nOAuth, Pub, Sync, Webhooks]
        MAP[Google Maps Module\nGeocoding, Directions, Places]
        NOT[Notifications Module\nPush/Email/SMS/In-App]
        ANA[Analytics Module\nEventos, Métricas]
    end

    subgraph "External APIs"
        ML_API[Mercado Libre API\nOAuth, Items, Orders, Webhooks]
        GM_API[Google Maps API\nGeocoding, Directions, Places]
        FCM[Firebase Cloud Messaging\nPush Notifications]
        SG[SendGrid\nEmail Transaccional]
        TW[Twilio\nSMS]
        CARRIER[Carrier APIs\nAndreani, OCA, Correo]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL\nTypeORM)]
        REDIS[(Redis\nCache, Sessions, Queue)]
    end

    FE --> LB
    DA --> LB
    LB --> AUTH
    LB --> USR
    LB --> PRD
    LB --> ORD
    LB --> VER
    LB --> REV
    LB --> SHP
    LB --> DPL
    LB --> DRV
    LB --> ML
    LB --> MAP
    LB --> NOT
    LB --> ANA

    AUTH --> PG
    USR --> PG
    PRD --> PG
    ORD --> PG
    VER --> PG
    REV --> PG
    SHP --> PG
    DPL --> PG
    DRV --> PG
    ML --> PG
    MAP --> PG
    NOT --> PG
    ANA --> PG

    ML --> ML_API
    MAP --> GM_API
    NOT --> FCM
    NOT --> SG
    NOT --> TW
    SHP --> CARRIER
    DPL --> MAP

    ML --> REDIS
    DPL --> REDIS
    ORD --> REDIS
```

## 2. Backend Module Architecture (NestJS)

```mermaid
graph TD
    subgraph "Core"
        CORE[CoreModule\nConfig, Database, Redis, Guards]
        COMMON[CommonModule\nPipes, Filters, Interceptors, Decorators]
    end

    subgraph "Auth & Users"
        AUTH[AuthModule\nJWT, Refresh, 2FA, Roles]
        USR[UsersModule\nProfile, Address, PushToken]
    end

    subgraph "Marketplace Core"
        PRD[ProductsModule\nEntity: Product, Variation\nService: CRUD, Stock, Filters]
        ORD[OrdersModule\nEntity: Order, OrderItem\nService: Escrow, Wallet, Coupons, Cart]
        VER[VerificationsModule\nEntity: Verification\nService: Foto/Video, Aprobación]
        REV[ReviewsModule\nEntity: Review\nService: Rating, Quejas, Resolución]
    end

    subgraph "Shipping & Logistics"
        SHP[ShippingModule\nEntity: Shipment\nService: Quote, Create, Tracking]
        DPL[DeliveryPlanningModule\nEntity: DeliveryRoute, RouteStop\nService: PlanCron, Optimize, Assign]
        DRV[DriverAppModule\nService: Dashboard, Arrive, Deliver, Fail, Nav]
    end

    subgraph "Integrations"
        ML[MercadoLibreModule\nEntity: MlCredential, MlWebhook, MlWebhookDLQ\nService: OAuth, Publish, Sync, WebhookRetry]
        MAP[GoogleMapsModule\nService: Geocode, Directions, Places, StaticMap]
        NOT[NotificationsModule\nEntity: Notification\nService: MultiChannel Push/Email/SMS/InApp]
    end

    subgraph "Cross-cutting"
        ANA[AnalyticsModule\nEvents, Metrics]
        ADM[AdminModule\nDashboard, Métricas, Reports]
    end

    CORE --> AUTH
    CORE --> USR
    CORE --> PRD
    CORE --> ORD
    CORE --> VER
    CORE --> REV
    CORE --> SHP
    CORE --> DPL
    CORE --> DRV
    CORE --> ML
    CORE --> MAP
    CORE --> NOT
    CORE --> ANA
    CORE --> ADM

    COMMON --> AUTH
    COMMON --> USR
    COMMON --> PRD
    COMMON --> ORD
    COMMON --> VER
    COMMON --> REV
    COMMON --> SHP
    COMMON --> DPL
    COMMON --> DRV
    COMMON --> ML
    COMMON --> MAP
    COMMON --> NOT
    COMMON --> ANA

    PRD --> ORD
    ORD --> SHP
    SHP --> DPL
    DPL --> DRV
    ORD --> NOT
    DPL --> NOT
    DRV --> NOT
    PRD --> ML
    ORD --> ML
    DPL --> MAP
    DRV --> MAP
    SHP --> MAP
    ML --> NOT
```

## 3. Data Flow - Mercado Libre Integration & Webhook Retry

```mermaid
sequenceDiagram
    autonumber
    actor Seller
    participant FE as Frontend
    participant BE as Backend (NestJS)
    participant ML as Mercado Libre API
    participant DB as PostgreSQL
    participant Redis as Redis Queue
    participant DLQ as Dead Letter Queue

    Note over Seller,FE: 1. OAuth Connection
    Seller->>FE: Click "Conectar Mercado Libre"
    FE->>BE: GET /api/mercadolibre/auth-url
    BE->>FE: { url: "https://auth.mercadolibre.com/..." }
    FE->>Seller: Redirect to ML OAuth
    Seller->>ML: Authorize App
    ML->>BE: GET /api/mercadolibre/callback?code=xxx&state=userId
    BE->>ML: POST /oauth/token (exchange code)
    ML-->>BE: { access_token, refresh_token, expires_in }
    BE->>DB: Save MlCredential (encrypted tokens)
    BE->>Seller: Success page

    Note over Seller,FE: 2. Publish Product
    Seller->>FE: Create Product + "Publicar en ML"
    FE->>BE: POST /api/mercadolibre/publish/:productId
    BE->>DB: Validate product (stock, images, attrs)
    BE->>ML: POST /items (with variations, attrs)
    ML-->>BE: { id: "MLA123", permalink, status }
    BE->>DB: Save mlItemId on Product
    BE->>Seller: { mlItemId, permalink }

    Note over Seller,ML: 3. Sale on ML → Webhook
    Seller->>ML: Buyer purchases item
    ML->>BE: POST /api/mercadolibre/webhook\nTopic: orders_v2\nResource: /orders/123\nUser: 456\nSignature: HMAC-SHA256
    BE->>DB: Save MlWebhook (status=PENDING)
    BE-->>ML: 200 OK (immediate)
    
    par Async Processing with Retry
        BE->>Redis: Enqueue webhook for processing
        loop Retry Loop (max 5 retries, exp backoff)
            BE->>Redis: Dequeue webhook
            BE->>ML: GET /orders/123 (with token)
            ML-->>BE: Order details
            BE->>BE: handleWebhook() → importSales()
            BE->>DB: Create Order + OrderItems + Wallet + Escrow
            BE->>DB: Update MlWebhook status=COMPLETED
            BE->>NOT: notifyRouteAssigned() → Push/Email/SMS
        end
        alt Max retries exceeded
            BE->>DB: Move to MlWebhookDeadLetter
            BE->>DLQ: Alert admin (log/monitoring)
        end
    end

    Note over Seller,BE: 4. Driver Delivery
    BE->>DPL: Cron 06:00 planDailyRoutes()
    DPL->>DB: Create DeliveryRoute + RouteStops
    DPL->>NOT: notifyRouteAssigned()
    Driver->>DRV: GET /driver/dashboard
    Driver->>DRV: GET /driver/stops/:id/navigation
    Driver->>DRV: POST /driver/stops/:id/arrive
    Driver->>DRV: POST /driver/stops/:id/deliver
    DRV->>NOT: notifyDelivered() / notifyDeliveryFailed()
    DRV->>DB: Update RouteStop + check Route COMPLETED
```

## 4. Delivery Planning & Driver App Flow

```mermaid
flowchart TD
    subgraph "Nightly Cron (06:00)"
        CRON[Cron 06:00] --> PLAN[planDailyRoutes()]
        PLAN --> QUERY[Query Orders: PAID/IN_CUSTODY\nsin ruta asignada]
        QUERY --> ENRICH[Enrich con buyer lat/lng\n+ geocoding fallback]
        ENRICH --> ZONE[getZoneForLocation()\n14 zonas Argentina]
        ZONE --> GROUP[Agrupar por zona\nCABA, GBA_N/S/O, La Plata, Bolívar...]
        GROUP --> OPT[optimizeRouteForZone()\nNearest Neighbor desde CABA]
        OPT --> CALC[Calcular km, duración, ETA]
        CALC --> MAP[getDirections() sample\npara distancia real]
        MAP --> PERSIST[Save DeliveryRoute + RouteStops]
        PERSIST --> NOTIFY[notifyRouteAssigned()\nPush/Email/In-App]
    end

    subgraph "Driver Mobile App"
        DASH[GET /driver/dashboard] --> CURRENT[Ruta actual + próximas]
        CURRENT --> DETAIL[GET /driver/current-route\nParadas con mapas estáticos]
        DETAIL --> NAV[GET /stops/:id/navigation\nGoogle Maps / Waze URL]
        NAV --> ARRIVE[POST /stops/:id/arrive\nStatus=ARRIVED]
        ARRIVE --> DELIVER{Entrega exitosa?}
        DELIVER -- Sí --> DELIVERED[POST /stops/:id/deliver\nStatus=DELIVERED]
        DELIVER -- No --> FAILED[POST /stops/:id/fail\nMotivo + reintento mañana]
        DELIVERED --> CHECK[checkRouteCompletion()\nTodas delivered/failed?]
        FAILED --> CHECK
        CHECK -- Sí --> COMPLETE[Route=COMPLETED\nnotifyDelivered/Failed]
        CHECK -- No --> NEXT[Siguiente parada]
    end

    subgraph "Notifications (Multi-channel)"
        ASSIGNED[notifyRouteAssigned] --> PUSH[Firebase Push]
        ASSIGNED --> EMAIL[SendGrid HTML Template]
        ASSIGNED --> IN_APP[DB Notification]
        STARTED[notifyRouteStarted] --> PUSH
        STARTED --> IN_APP
        APPROACHING[notifyDriverApproaching] --> PUSH
        APPROACHING --> SMS[Twilio]
        COMPLETED[notifyDelivered] --> PUSH
        COMPLETED --> EMAIL
        COMPLETED --> IN_APP
        FAILED[notifyDeliveryFailed] --> PUSH
        FAILED --> EMAIL
        FAILED --> IN_APP
        FAILED --> SMS
    end

    subgraph "Real-time Tracking (Future)"
        WS[WebSocket / Socket.io] --> GPS[Driver GPS Location]
        GPS --> FE[Frontend Map Update]
        FE --> BUYER[Buyer sees driver approaching]
    end
```

## 5. Frontend Architecture (React/Next.js)

```mermaid
graph TB
    subgraph "Next.js App Router"
        LAYOUT[layout.tsx\nProviders, Headers, Footer]
        PROVIDERS[Providers.tsx\nQueryClient, AuthContext, Theme]
    end

    subgraph "Authentication"
        AUTH_PAGES[(auth)\nlogin, register, forgot-password]
        AUTH_HOOKS[useAuth.ts\nlogin, register, logout, refresh, user]
        AUTH_GUARD[AuthGuard.tsx\nProtected Routes]
    end

    subgraph "Pages Structure"
        HOME[page.tsx\nHero, Featured, Categories]
        PRODUCTS[(products)\nlist, filters, [id] detail]
        PRODUCT_CREATE[create/page.tsx\nForm + ML Publish Button]
        CART[cart/page.tsx\nItems, Coupon, Checkout]
        CHECKOUT[checkout/page.tsx\nAddress, Shipping, Payment]
        ORDERS[(orders)\nlist, [id] detail, tracking]
        PROFILE[(profile)\ninfo, address, push token, ML connect]
        DRIVER[(driver)\ndashboard, current-route, navigation]
    end

    subgraph "Components"
        UI[UI Library\nButton, Input, Modal, Card, Map, Badge]
        PRODUCT_CARD[ProductCard.tsx\nImage, Price, ML Badge]
        PRODUCT_FORM[ProductForm.tsx\nImages, Variations, ML Attrs]
        ORDER_CARD[OrderCard.tsx\nStatus Badge, Tracking Link]
        MAP_COMPONENT[MapView.tsx\nStatic Map + Navigation Link]
        DRIVER_STOP[DriverStopCard.tsx\nArrive/Deliver/Fail Buttons]
        NOTIF_BELL[NotificationBell.tsx\nIn-App List]
    end

    subgraph "State & Data Fetching"
        TANSTACK[TanStack Query\nuseQuery, useMutation, invalidate]
        AUTH_CTX[AuthContext\nuser, token, refresh, logout]
        ZUSTAND[Zustand Store\nCart, UI State, Filters]
    end

    subgraph "API Layer"
        API_CLIENT[api/client.ts\naxios + interceptors\nJWT auto-attach, refresh]
        ENDPOINTS[api/endpoints.ts\nTyped endpoints per module]
        TYPES[types/api.ts\nZod schemas + TS types]
    end

    subgraph "External Integrations"
        MAP_LIB[react-google-maps / leaflet\nStatic Map + Navigation]
        PUSH_FCM[firebase/messaging\nService Worker + Foreground]
        ANALYTICS[PostHog / Mixpanel\nEvents, Funnels]
    end

    LAYOUT --> PROVIDERS
    PROVIDERS --> AUTH_CTX
    PROVIDERS --> TANSTACK
    PROVIDERS --> ZUSTAND

    LAYOUT --> AUTH_PAGES
    LAYOUT --> HOME
    LAYOUT --> PRODUCTS
    LAYOUT --> CART
    LAYOUT --> CHECKOUT
    LAYOUT --> ORDERS
    LAYOUT --> PROFILE
    LAYOUT --> DRIVER

    PRODUCTS --> PRODUCT_CARD
    PRODUCTS --> PRODUCT_FORM
    PRODUCT_CARD --> MAP_COMPONENT
    PRODUCT_FORM --> ML_INTEGRATION[ML Publish Button]

    ORDERS --> ORDER_CARD
    ORDER_CARD --> MAP_COMPONENT
    ORDER_CARD --> TRACKING[Tracking Page]

    DRIVER --> DASH
    DASH --> CURRENT_ROUTE
    CURRENT_ROUTE --> DRIVER_STOP
    DRIVER_STOP --> MAP_COMPONENT
    DRIVER_STOP --> NAV_BUTTON[Google Maps / Waze]

    AUTH_PAGES --> AUTH_HOOKS
    AUTH_HOOKS --> AUTH_CTX
    AUTH_GUARD --> AUTH_CTX

    TANSTACK --> API_CLIENT
    API_CLIENT --> ENDPOINTS
    ENDPOINTS --> TYPES
    API_CLIENT --> AUTH_CTX[JWT Interceptor]

    MAP_COMPONENT --> MAP_LIB[react-google-maps / Static Maps]
    NOTIF_BELL --> PUSH_FCM
    PUSH_FCM --> AUTH_CTX[Token for FCM]

    ML_INTEGRATION --> ML_API[MercadoLibre OAuth/Publish]
```

---

## Diagram Key

| Symbol | Meaning |
|--------|---------|
| `solid arrow` | Synchronous call / data flow |
| `dashed arrow` | Async / event-driven |
| `par` block | Parallel execution |
| `alt` block | Conditional flow |
| `subgraph` | Logical grouping / bounded context |
| `actor` | External user/system |
| `participant` | Service/component |
| `DB` | Database |
| `Redis` | Cache/Queue |
| `FE`/`DA` | Frontend / Driver App |

---

## How to Render

These diagrams use **Mermaid.js** syntax. Render in:
- GitHub/GitLab markdown files
- Notion, Obsidian, VS Code (with Mermaid extension)
- Mermaid Live Editor: https://mermaid.live
- Documentation sites: Docusaurus, MkDocs, GitBook

```bash
# Install Mermaid CLI for local rendering
npm install -g @mermaid-js/mermaid-cli
mmdc -i architecture.mmd -o architecture.png
```