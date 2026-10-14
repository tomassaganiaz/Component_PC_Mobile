# Guía para la presentación (PowerPoint) — TechShield

Documento para armar el PPT que explica el sitio/app. Va **de lo básico a lo técnico**.
Todos los colores son los del **modo oscuro** del sitio (usar exactamente estos hex).

---

## 1. Objetivo de la presentación

1. **Primero (básico):** qué es, para quién y qué problema resuelve, con un recorrido visual por las pantallas.
2. **Después (técnico):** arquitectura, stack, modelo de datos, APIs externas (Mercado Libre y Google Maps), seguridad y testing.

Regla de oro: **una idea por slide**, poco texto (máx. 6 viñetas cortas), mucho visual (capturas/diagramas).

---

## 2. Identidad visual (colores del sitio — MODO OSCURO)

### Paleta principal
| Rol | Hex | Uso en el PPT |
|---|---|---|
| Fondo general (canvas) | `#0a0f1d` | Fondo de secciones/portada |
| Fondo base (surface) | `#0b1326` | **Fondo estándar de los slides** |
| Tarjeta (card/panel) | `#111a2e` | Cajas, bloques de contenido |
| Elevado | `#162238` | Cajas que se destacan, tablas |
| Borde/línea | `#233554` | Bordes de cajas, separadores |
| Texto primario | `#f8fafc` | Títulos y texto principal |
| Texto secundario | `#94a3b8` | Subtítulos, texto de apoyo |
| Texto tenue | `#64748b` | Notas, pie de slide |

### Colores de acento
| Rol | Hex | Uso |
|---|---|---|
| Primary (azul) | `#adc6ff` | Titulares, énfasis, links, iconos clave |
| Primary mid | `#1e3a73` | Botones/bloques primarios con relleno |
| Secondary (verde) | `#4edea3` | "OK/seguro", métricas positivas, check verificado |
| Accent emerald | `#34d399` | Confirmaciones, "Chequeado" |
| Tertiary / Cyan | `#4cd7f6` / `#06b6d4` | Datos técnicos, badges, telemetría |
| Accent blue | `#60a5fa` | Info, enlaces secundarios |
| Ámbar (alerta) | `#f59e0b` | Advertencias (ej. precio sospechoso) |
| Rojo (peligro) | `#ef4444` | Errores, "No seguro", quejas |

### Fondos suaves (para chips/etiquetas)
`success-soft #06271a` · `info-soft #0a1b2e` · `warning-soft #2a1f08` · `danger-soft #2a1010` · `primary-soft #182845`

### Tipografía
- **Títulos / cuerpo:** sans limpia (System → usá **Inter** o **Poppins**).
- **Datos, etiquetas y badges:** **monoespaciada** (**JetBrains Mono** o **Roboto Mono**), como en el sitio (ej. `ID #E6FF94`, `TECHSHIELD`, `$260 USD`).
- Jerarquía sugerida: Título 32–40pt (bold), Subtítulo 20–24pt, Cuerpo 16–18pt, Notas 12pt.

### Formato
- **16:9** (13,33 × 7,5 pulgadas).
- Fondo `#0b1326` en todos los slides.
- Acento de línea superior/inferior con `#adc6ff` (fina).
- Cajas con borde `#233554` y relleno `#111a2e`.
- Logo TechShield arriba a la izquierda en cada slide.
- Numeración de slide en `#64748b`.

---

## 3. Estructura del deck (slide por slide)

> Columna “Notas” = lo que decís oralmente; “En pantalla” = qué mostrar.

### PARTE A — BÁSICA

**Slide 1 — Portada**
- Título: **TechShield** · subtítulo: *Marketplace verificado de hardware y móviles*.
- Materia, integrantes, fecha.
- En pantalla: logo + fondo `#0a0f1d` + acento verde.

**Slide 2 — ¿Qué es? (1 frase)**
- "Una app para **comprar y vender componentes de PC y celulares** con **verificación técnica** y **pago protegido (custodia)**."
- Notas: no entrar en tecnicismos.

**Slide 3 — El problema / la solución**
- Problema: comprar usado es riesgoso (estafas, estado real desconocido).
- Solución: verificación en laboratorio + custodia del dinero + reputación del vendedor.
- En pantalla: 2 columnas (rojo `#ef4444` problema / verde `#4edea3` solución).

**Slide 4 — ¿Para quién?**
- **Comprador:** explora, compra protegido, reseña.
- **Vendedor:** publica, gestiona stock, ve sus ventas e ingresos.
- **Admin:** modera quejas/reportes y verifica productos.
- En pantalla: 3 tarjetas (`#111a2e`) con íconos.

**Slide 5 — Funciones principales**
- Explorar con filtros · Carrito · Compra con custodia · Publicar · Seguimiento del envío · Reseñas y reputación.
- En pantalla: íconos grandes + label mono.

**Slide 6 — Cómo funciona (flujo simple)**
- 1) El vendedor publica → 2) El comprador compra (paga, queda **en custodia**) → 3) Se envía y se sigue el paquete → 4) Al confirmar la entrega, el vendedor **cobra**.
- En pantalla: línea de tiempo horizontal con 4 pasos.

**Slide 7 — Recorrido por pantallas**
- Capturas: **Explorar**, **Detalle de producto** (2 columnas), **Carrito**, **Seguimiento**, **Mis ventas**.
- En pantalla: 2–3 capturas por slide, con marco `#233554`.

**Slide 8 — Mi perfil y confianza**
- Nivel de seguridad del vendedor, reseñas, verificado, panel según rol.
- En pantalla: captura de Perfil + badge de nivel.

### PARTE B — TÉCNICA

**Slide 9 — Arquitectura general**
- Diagrama: **App (móvil/web)** ⟶ **API REST (NestJS)** ⟶ **PostgreSQL**. + Servicios externos (Mercado Libre, Google Maps).
- En pantalla: cajas `#111a2e`, flechas `#adc6ff`.

**Slide 10 — Stack tecnológico**
- Backend: NestJS, TypeORM, PostgreSQL, JWT.
- Frontend: Expo, React Native, Expo Router, NativeWind (Tailwind), TypeScript.
- En pantalla: logos + una línea por tecnología.

**Slide 11 — Módulos del backend (por dominio)**
- `auth, users, products, orders, cart, payments, wallets, shipping, notifications, coupons, reviews, verifications, reports, analytics, mercadolibre, admin`.
- En pantalla: grilla de chips (`primary-soft`) con nombres.

**Slide 12 — Modelo de datos**
- Tablas: `users, products, orders, order_items, carts/cart_items, payments, wallets, shipments, reviews, notifications, coupons, ml_credentials`.
- En pantalla: mini diagrama de relaciones (users→products→orders→order_items…).

**Slide 13 — Ciclo de vida de la orden + stock atómico**
- Estados: `pending → paid → shipped → delivered` (+ `cancelled`, `refunded`).
- Stock: `UPDATE ... WHERE stock > 0` (sin sobreventa).
- En pantalla: pipeline de estados + nota "sin sobreventa".

**Slide 14 — Integración Mercado Libre (ventas)**
- OAuth de ML → token → `orders/search` del vendedor; se muestran en **Mis ventas**.
- Modo **demo (mock)** si no hay credenciales; **real** con `ML_CLIENT_ID/SECRET`.
- En pantalla: diagrama de flujo OAuth (App → ML → Backend).

**Slide 15 — Integración Google Maps (seguimiento + ETA)**
- `GET /shipping/order/:id/tracking` → posición del camión, distancia, **ETA**; mapa con **Maps Static API** (`GOOGLE_MAPS_API_KEY`).
- Aclaración: Fleet Engine se descartó (requiere Google Cloud + allowlist); se usó Maps Static + ETA.
- En pantalla: captura del seguimiento con mapa/ETA (o placeholder).

**Slide 16 — Seguridad**
- JWT access + refresh (rotación), roles (`buyer/seller/admin`), validación de UUID, sin exponer contraseñas.
- En pantalla: íconos candado + 4 bullets.

**Slide 17 — Testing y calidad**
- Backend: **122** unit + **95** e2e (Postgres de test).
- Frontend: **18** tests. Lint/typecheck OK.
- En pantalla: 3 métricas grandes en `#4edea3`.

**Slide 18 — Deploy y entrega**
- Web estática (Netlify) + APK (EAS). Servidor local + QR para revisar en varios celulares.
- Credenciales demo (admin/vendedor/comprador).
- En pantalla: QR + URLs + tabla de usuarios.

**Slide 19 — Roadmap / mejoras**
- Push real, pago con pasarela real, carrito avanzado, más reportes admin.
- En pantalla: 4 bullets.

**Slide 20 — Cierre**
- "TechShield: comprar hardware sin miedo." + gracias + QR.

---

## 4. Recursos a incluir

- **Logo:** `Frontend/assets/icon.png` (o `android-icon-foreground.png`).
- **Imágenes de productos:** `backend/public/products/*.webp`.
- **Capturas a tomar** (en la app, modo oscuro):
  1. Explorar con filtros y chips de categoría.
  2. Detalle de producto (imagen + datos a la derecha).
  3. Carrito.
  4. Seguimiento con barra Depósito→Camión→Destino.
  5. Mis ventas (módulo Mercado Libre).
  6. Panel admin.
- **QR de revisión:** `npm run serve:web` (o el QR de Expo Go).

---

## 5. Guía de estilo (do / don't)

**Sí**
- Fondo oscuro `#0b1326`; un solo acento por slide (azul o verde).
- Datos con monoespaciada (IDs, precios, métricas).
- Capturas reales del sitio (no stock photos).
- Transición limpia: A (básico) → B (técnico).

**No**
- No usar blanco de fondo (rompe la identidad oscura).
- No más de ~6 viñetas por slide ni párrafos largos.
- No mezclar colores fuera de la paleta (evitar verdes/azules “por defecto” de PowerPoint).
- No usar el logo estirado; respetar proporción.

---

## 6. Checklist final

- [ ] Fuente Inter/Poppins + JetBrains/Roboto Mono instaladas (o embebidas).
- [ ] Fondo y acentos con los hex exactos de la sección 2.
- [ ] Capturas del sitio en modo oscuro (sección 4).
- [ ] Orden: 8 slides básicos → 11 técnicos → cierre.
- [ ] Notas del orador escritas (qué decir en cada slide).
- [ ] QR de la demo funcionando (web o Expo Go).
