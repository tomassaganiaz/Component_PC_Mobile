# Comparativa Mercado Libre vs. ERS / TechShield — Plan de acción y modificaciones

> Documento de análisis y planificación. No implementa código: define **qué** falta, **por qué** y **cómo** cambiarlo (backend, base de datos, frontend y tests).

## 1. Objetivo y alcance

- **Objetivo:** comparar el proyecto (marketplace vertical de hardware/móviles con verificación y custodia) contra el ecosistema de **Mercado Libre (ML)** para identificar mejoras y planificar su implementación.
- **Alcance:** funcional (producto, confianza, pagos, envíos, postventa, notificaciones, promociones) y técnico (endpoints, entidades, migraciones, pantallas).
- **Fuera de alcance inmediato:** integraciones reales de pasarela y logística (se describen como fase de integración).

## 2. Metodología

Revisión de la documentación pública de ML (developers por país), páginas de vendedores/compradores (reputación, Envíos, Mercado Pago/Crédito, Mercado Shops, Mercado Ads) y contraste con el estado real del repositorio.

## 3. Resumen ejecutivo

ML es un **ecosistema** (marketplace + pagos + envíos + crédito + ads). Este proyecto es un **marketplace vertical** con un diferenciador claro: **verificación técnica obligatoria + custodia (escrow)**. La base técnica es sólida (auth con refresh, roles, stock atómico, ciclo de orden, tests). Las brechas principales son de **producto**: carrito multi-ítem, reputación formal, notificaciones/mensajería y pago/logística reales.

**Prioridad recomendada (mayor valor / menor costo):**
1. Reputación formal + Notificaciones (quick wins, datos ya existentes).
2. Carrito multi-producto (gap más visible frente a ML).
3. Cupones + Wallet/payouts + Reembolso efectivo.
4. Variaciones/SKU y Panel admin.
5. Integraciones reales (Mercado Pago, envíos) — largo plazo.

## 4. Tabla comparativa

| Área | Mercado Libre | ERS / TechShield (hoy) | Estado |
|---|---|---|---|
| Publicación | Catálogo, variaciones, atributos por categoría, SKU, size chart, listing types (destacados) | Título, descripción, categoría, condición, precio, `stock`, imágenes | ⚠️ Falta variaciones/SKU/atributos |
| Confianza del vendedor | Termómetro por niveles/colores, MercadoLíder (Silver/Gold/Platinum), métricas a 60 días | `securityTier` (secure/normal/not_secure), trust-badge, positividad, quejas | ⚠️ Falta reputación formal + métricas |
| Anti-fraude | Reclamos, moderación, reputación | **Precio sospechoso vs mercado**, quejas abiertas, ID verificado | ✅ Fuerte |
| Custodia | Escrow vía Mercado Pago (libera ~48 h post-entrega) | **Escrow propio + auditoría técnica + horas de uso** | ✅ Diferenciador |
| Pagos | Mercado Pago, cuotas, “meses sin tarjeta”, Mercado Crédito (BNPL) | `paymentMethod` simulado; orden a `paid` (mock) | ❌ Sin pasarela ni cuotas |
| Envíos | Envíos Full/Flex, Colecta, ME1, etiquetas, tracking, envío gratis | `shippingAddress` + estado `shipped` | ❌ Sin logística/tracking |
| Carrito | Carrito (agrupa productos) + Packs (varias órdenes) | 1 orden = 1 producto | ❌ Sin carrito |
| Postventa | Mensajería, reclamos, devolución express (hasta 30 días), facturación | Devolución 10 días + cobertura 45 días, reviews/quejas, chat *safety-check* | ⚠️ Falta mensajería/facturación |
| Notificaciones | Webhooks + push | No hay (campana del header sin sistema) | ❌ Falta |
| Promos/Ads | Mercado Ads, campañas, cupones | Filtros y orden por relevancia | ❌ Faltan destacados/cupones |
| Tienda propia | Mercado Shops | — | ⏭️ Fuera de alcance |
| API/Auth | OAuth, webhooks, rate limits, `orders/search`, `reputation` | JWT access+refresh rotado, roles, rate-limit por usuario, Swagger, `GET /orders/sales` | ✅ Sólido |

## 5. Fortalezas actuales (para la defensa)

- Auth robusta: access + refresh rotado/revocado, OTP opcional, roles `buyer/seller/admin`, KYC ligero.
- **Verificación técnica** e informe de laboratorio; comparación de horas declaradas vs verificadas.
- **Custodia/escrow** con devolución (10 d) y cobertura (45 d); stock **atómico** (sin sobreventa).
- Anti-estafa (precio sospechoso), perfil de seguridad del vendedor, quejas/reclamos.
- Multiplataforma (web + móvil), i18n es/en, PWA, fallback offline.
- Tests: **113 unit + 58 e2e + smokes**.

## 6. Brechas (gaps) detalladas

1. **Carrito / multi-ítem:** no se pueden agrupar varios productos en una compra (ML lo tiene como pilar).
2. **Reputación:** el “tier” es binario/simple; ML usa niveles con colores y medallas y métricas por período.
3. **Notificaciones:** no hay avisos de cambios de estado (venta, envío, entrega, mensajes).
4. **Mensajería real:** solo existe `chat/safety-check`; falta chat comprador–vendedor.
5. **Cupones/promociones:** sin descuentos ni destacados.
6. **Pago/escrow real:** simulado; sin reembolso efectivo ni liberación de fondos.
7. **Wallet/payouts:** el vendedor nunca “cobra” explícitamente (ML acredita tras la entrega).
8. **Envíos:** sin cotización, etiquetas ni tracking.
9. **Variaciones/SKU:** no hay variantes (RAM/color) ni stock por variante.
10. **Panel admin:** sin UI para moderar reportes/quejas y aprobar verificaciones.

## 7. Plan de acción por fases

Prioridad **MoSCoW**. Esfuerzo en puntos (≈1 pto ≈ 2–3 h).

### Fase 0 — Quick wins (1–2 días)
- [ ] **Reputación formal**: extender `reviews` → nivel 1–5 + color + medallas + métricas (ventas 60 d, cancelaciones). Endpoint `GET /reviews/reputation/:sellerId`.
- [ ] **Notificaciones in-app**: entidad + servicio + campana del header funcional.
- [ ] **Cupones**: entidad `coupon` + validación al comprar.

### Fase 1 — Carrito multi-producto (3–5 días)
- [ ] `carts` + `cart_items` y checkout que genera **una orden con varios ítems** (`order_items`).
- [ ] UI de carrito en web/móvil y contador en el header.

### Fase 2 — Pagos y dinero (3–5 días)
- [ ] **Pago simulado con estados reales** + **reembolso efectivo** (repone stock).
- [ ] **Wallet del vendedor**: saldo se acredita al `delivered`; retiros.

### Fase 3 — Catálogo y confianza (3–5 días)
- [ ] **Variaciones/SKU** con stock por variante.
- [ ] **Panel admin** (reportes/quejas/verificaciones).

### Fase 4 — Integraciones (largo, opcional)
- [ ] Pasarela real (Mercado Pago/Stripe) con OAuth + webhooks.
- [ ] Logística (cotización, etiquetas, tracking) y “envío gratis”.

## 8. Plan de modificación técnico

### 8.1 Backend

#### Fase 0
- **Reputación** — modificar `src/reviews/reviews.service.ts` (calcular nivel/color/medallas y métricas) y `reviews.controller.ts` (nuevo `GET /reviews/reputation/:sellerId`). Reusar `Review` y `Order`.
- **Notificaciones** — nuevo módulo `src/notifications/`:
  - `notification.entity.ts` (`userId`, `type`, `title`, `body`, `read`, `metadata`, `created_at`).
  - `notifications.service.ts` (crear al cambiar estado de orden, al vender, al recibir reseña).
  - `notifications.controller.ts` (`GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`).
  - Enganchar en `orders.service.ts` (`pay/ship/deliver/cancel`) y `reviews.service.ts`.
- **Cupones** — nuevo módulo `src/coupons/`:
  - `coupon.entity.ts` (`code`, `type`, `value`, `minPurchase`, `expiresAt`, `usageLimit`, `usedCount`, `active`).
  - `coupons.controller.ts` (`POST /coupons` admin, `GET /coupons` admin, `POST /coupons/validate`).
  - Aplicar en el checkout (fase carrito) y guardar `couponCode` + `discount` en `Order`.
- **Migración:** `src/database/migrations/*-AddNotificationsAndCoupons.ts`.

#### Fase 1 (carrito)
- Nuevo módulo `src/cart/`:
  - `cart.entity.ts` (1:1 con `User`), `cart-item.entity.ts` (`productId`, `quantity`).
  - `cart.controller.ts`: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart`, `POST /cart/checkout`.
  - `cart.service.ts`: valida stock, calcula total, aplica cupón.
- **Orders con ítems**: `src/orders/order-item.entity.ts` (`orderId`, `productId`, `quantity`, `unitPrice`). `Order` deja de depender de un único `productId` (mantener campo por compatibilidad o migrar). El checkout reserva stock **atómico por ítem** y crea la orden en `pending`.
- **Migración:** `*-AddCartAndOrderItems.ts` (con backfill de órdenes existentes a `order_items`).
- **Refactor:** `orders.service.create` pasa a `createFromCart` (o acepta `items[]`); conservar `create` para compra directa.

#### Fase 2 (pagos/dinero)
- `src/payments/`: `payment.entity.ts` (`orderId`, `provider`, `status`, `amount`, `externalId`), `payments.controller.ts` (`POST /payments/:orderId/intent`, `POST /payments/webhook`), mock de confirmación → mueve la orden a `paid`.
- `src/wallets/`: `wallet.entity.ts`, `wallet-entry.entity.ts` (ledger), `payouts` (`pending/paid`). Acreditar al `delivered`, debitar al cancelar/reembolsar.
- **Reembolso efectivo:** al `cancel`/`requestReturn`, reponer stock + asiento de crédito al comprador y débito al vendedor.

#### Fase 3 (catálogo/admin)
- `src/products/product-variation.entity.ts` (`productId`, `sku`, `attributes`, `stock`, `priceDelta`). Ajustar `decrementStock` para variante.
- **Panel admin**: rutas ya existentes (`reviews/:id/resolve`, `reports`, `verifications`) + guardar rol (ya está) y exponer filtros de administración.

### 8.2 Base de datos
- Migraciones nuevas: notificaciones/cupones, carrito/order_items, pagos/wallets, variaciones.
- Índices: `notifications(userId, read, createdAt)`, `cart_items(cartId)`, `order_items(orderId)`, `product_variations(productId)`, `wallet_entries(walletId, createdAt)`.
- Mantener soft-deletes y `created_at/updated_at` (convención del repo).

### 8.3 Frontend
- **`src/services/api.ts`**: agregar `getCart`, `addToCart`, `updateCartItem`, `removeCartItem`, `checkoutCart`, `getNotifications`, `markNotificationRead`, `validateCoupon`, `getSellerReputation`.
- **Carrito:** `src/app/cart.tsx` + `src/screens/CartScreen.tsx`; ícono/contador en `src/components/AppHeader.tsx`; estado en `src/context/CartContext.tsx`.
- **Notificaciones:** `src/context/NotificationsContext.tsx` + `src/app/notifications.tsx` + `src/screens/NotificationsScreen.tsx`; la campana de `AppHeader` navega y muestra badge.
- **Reputación:** componente termómetro reutilizable (`src/components/ReputationMeter.tsx`) usado en `ProductDetailScreen` y `ProfileScreen`.
- **Cupones:** input en el checkout de `ProductDetailScreen`/`CartScreen`.
- **Wallet:** sección en `ProfileScreen` (“Mis ingresos”) + `src/screens/WalletScreen.tsx`.
- **i18n:** claves nuevas en `src/i18n/translations.ts` (es/en).
- **Tipos:** `src/types.ts` (`CartItem`, `Notification`, `WalletEntry`, `ProductVariation`).

### 8.4 Testing
- Unit: `cart.service.spec.ts`, `notifications.service.spec.ts`, `coupons.service.spec.ts`, `wallets.service.spec.ts`, `payments.service.spec.ts`.
- E2E: `test/cart.e2e-spec.ts`, `test/notifications.e2e-spec.ts`, `test/coupons.e2e-spec.ts`, `test/wallet.e2e-spec.ts` (extender el patrón actual con Postgres de test).
- Frontend: reducer de carrito/notificaciones + render de pantallas.

## 9. Criterios de aceptación (resumen)

- **Carrito:** agrego N productos, el checkout crea una orden con N ítems, el stock se descuenta atómicamente y no hay sobreventa.
- **Reputación:** `GET /reviews/reputation/:sellerId` devuelve nivel (1–5), color y métricas coherentes con ventas/reseñas.
- **Notificaciones:** al cambiar el estado de una orden, el vendedor/comprador recibe una notificación y la campana muestra badge.
- **Cupón:** un cupón válido descuenta el total; inválido/expirado → 400; se registra el uso.
- **Wallet:** al `delivered`, el vendedor recibe el saldo; al reembolsar, se revierte.

## 10. Riesgos y supuestos

- Migrar `Order.productId` a `order_items` requiere **backfill** y cuidado con la API existente (compatibilidad).
- Integraciones reales (pago/envío) dependen de cuentas/credenciales externas → se dejan como fase final; en la demo se usa el modo simulado.
- Nuevas notificaciones sin WebSocket son por *polling*; ML usa push. Se puede sumar SSE/WebSocket luego.

## 11. Mapeo para la defensa oral

- “A diferencia de un marketplace genérico, priorizamos **confianza**: verificación técnica obligatoria y custodia”.
- “Tomamos de ML: **carrito**, **reputación con niveles** y **notificaciones**; y agregamos como diferencial **auditoría de uso** y **anti-estafa por precio**”.
- “Las integraciones de pago/envío se planificaron como fases y hoy corren en **modo simulado** para poder demostrar el flujo end-to-end”.

## 12. Checklist de avance

| Fase | Ítem | Estado |
|---|---|---|
| 0 | Reputación formal | ✅ |
| 0 | Notificaciones in-app | ✅ |
| 0 | Cupones | ✅ |
| 1 | Carrito multi-producto + order_items | ✅ |
| 2 | Pago simulado + reembolso efectivo | ✅ |
| 2 | Wallet/payouts | ✅ |
| 3 | Variaciones/SKU | ⬜ |
| 3 | Panel admin | ⬜ |
| 4 | Pasarela real + envíos | ⬜ |

---

**Sugerencia de arranque:** Fase 0 (reputación + notificaciones) para impacto rápido en la demo, seguida de Fase 1 (carrito), que es la brecha más visible frente a Mercado Libre.
