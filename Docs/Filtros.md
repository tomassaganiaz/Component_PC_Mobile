# Sistema de Filtros - TechShield Marketplace

Este documento describe los filtros implementados en la plataforma (Backend `GET /api/products` y pantalla de Filtros del Frontend), junto con los sistemas de seguridad asociados.

## Resumen

| # | Filtro | Dónde se usa | Parámetro API |
|---|--------|--------------|---------------|
| 1 | Búsqueda por texto | Explorar | `search` |
| 2 | Categoría de silicio | Explorar / Filtros | `category` |
| 3 | Condición (nuevo/usado) | Explorar / Filtros | `condition` |
| 4 | Rango de precio mínimo | API | `minPrice` |
| 5 | Rango de precio máximo | API | `maxPrice` |
| 6 | Seguridad del vendedor | Filtros | `sellerTier` |
| 7 | Chequeado para Compra | Filtros | `verified` |
| 8 | Productos Nuevos | Filtros | `condition=new` + `sealed` |
| 9 | Garantía / Cobertura | Filtros | `warranty` |
| 10 | Positividad mínima del vendedor | Filtros | `minPositivity` |
| 11 | Horas de uso máximas | Filtros | `maxHoursOfUse` |
| 12 | Sin estrés de minería | Filtros | `noMining` |
| 13 | Solo con custodia / escrow | Filtros | `escrow` |
| 14 | Ocultar productos con quejas abiertas | Filtros | `hideWithComplaints` |
| 15 | Ocultar precios sospechosos (anti-estafa) | Filtros | `hideSuspicious` |

**Total: 15 filtros combinables** entre sí (todos los parámetros se pueden usar al mismo tiempo).

---

## 1. Búsqueda por texto (`search`)

Busca coincidencias en `title` y `description` del producto (case-insensitive).

```
GET /api/products?search=rtx
```

---

## 2. Categoría de silicio (`category`)

Filtra por el tipo de componente. Valores: `cpu`, `gpu`, `ram`, `storage`, `motherboard`, `psu`, `case`, `cooling`, `monitor`, `keyboard`, `mouse`, `phone`, `tablet`, `other`.

```
GET /api/products?category=gpu
```

---

## 3. Condición (`condition`)

`new` (nuevo) o `used` (usado).

```
GET /api/products?condition=new
```

---

## 4 y 5. Rango de precio (`minPrice` / `maxPrice`)

```
GET /api/products?minPrice=100&maxPrice=500
```

---

## 6. Seguridad del Vendedor (`sellerTier`)

Clasifica a los vendedores en tres niveles según **positividad**, **quejas** y **aceptación de revisiones**:

### Cálculo

- **Positividad** = (reseñas `positive` / total de reseñas aprobadas) x 100
- **Quejas** = reseñas `complaint` aprobadas (o devoluciones por fallas)
- **acceptsTesting** = el vendedor acepta que sus productos pasen revisiones y testeos antes de venderse

Reglas en orden:

1. Si **positividad < 50%** o **quejas >= 3** o **no acepta testeos** → **No Seguro**
2. Si no, y **positividad >= 75%**, **0 quejas** y **acepta testeos** → **Seguro**
3. Si no → **Normal**
4. Vendedor sin reseñas → **Normal** (si acepta testeos) o **No Seguro** (si no los acepta)

### Valores

| Tier | Positividad | Quejas/devoluciones | Revisiones y testeos |
|------|-------------|---------------------|----------------------|
| `secure` | 75% o más | Sin quejas ni devoluciones por fallas | Acepta todas |
| `normal` | 50% o más | Pocas | Acepta algunas |
| `not_secure` | Menos de 50% | Quejas y devoluciones por fallas | No acepta (o muy pocas) |

```
GET /api/products?sellerTier=secure
GET /api/products?sellerTier=not_secure
```

Cada producto devuelve `securityTier` y `sellerStats` (positividad, total, positivas, quejas, `identityVerified`).

---

## 7. Chequeado para Compra (`verified`)

Filtra solo productos que pasaron la revisión y el testeo del laboratorio. Si el comprador ve el **check verde** ("Chequeado para Compra"), puede ver los **datos reales** del producto (horas de uso, tipo de uso, estrés soportado, grado) y **compararlos con lo declarado por el vendedor** en el detalle, detectando discrepancias.

```
GET /api/products?verified=true
```

En el Frontend, el check aparece en la esquina superior derecha de la tarjeta como una línea verde con el texto "Chequeado para Compra".

---

## 8. Productos Nuevos (`condition=new` + `sealed`)

Productos sin uso y sin sacar de la caja. Llevan su etiqueta especial **azul "Nuevo"**.

```
GET /api/products?condition=new&sealed=true
```

---

## 9. Garantía / Cobertura (`warranty`)

- `techshield`: productos con **Garantía TechShield Total** (90 días o más).
- `extended`: productos con **cobertura extendida** (`coverageExtended`).

```
GET /api/products?warranty=techshield
GET /api/products?warranty=extended
```

Cada producto devuelve `warranty { days, extended, remainingDays, label }` para ver el estado de la cobertura.

---

## 10. Positividad mínima (`minPositivity`)

Filtra vendedores con un piso de positividad (0-100). Ej.: solo vendedores con 80% o más de positividad.

```
GET /api/products?minPositivity=80
```

---

## 11. Horas de uso máximas (`maxHoursOfUse`)

Incluye productos usados con **menos de N horas** de uso verificadas (los nuevos sin horas también se incluyen).

```
GET /api/products?maxHoursOfUse=500
```

---

## 12. Sin estrés de minería (`noMining`)

Excluye componentes que fueron usados en **minería de criptomonedas** (busca en `usageType`).

```
GET /api/products?noMining=true
```

---

## 13. Solo con custodia / escrow (`escrow`)

Solo productos con el pago protegido en custodia. Todos los de la plataforma tienen `escrowProtected=true`; este filtro garantiza que el comprador vea solo compras protegidas.

```
GET /api/products?escrow=true
```

---

## 14. Ocultar quejas abiertas (`hideWithComplaints`)

Excluye productos con quejas **activas o sin resolver** (reseñas tipo `complaint` con estado distinto de `resolved`).

```
GET /api/products?hideWithComplaints=true
```

---

## 15. Ocultar precios sospechosos / Anti-estafa (`hideSuspicious`)

Sistema **anti-estafa de precio**: agrupa productos por **SKU normalizado** (mismo modelo, ignorando capacidad, color, "sellado", "oc"...) y calcula el **precio promedio de mercado** del grupo.

- Si un producto está **20% o más por debajo** del promedio del grupo → `priceFlag: "suspicious"`.
- Con este filtro se ocultan esos productos (red flag de estafa).

```
GET /api/products?hideSuspicious=true
```

Cada producto devuelve `marketAveragePrice` y `priceDiffPct`.

---

## Combinación de filtros

Todos los filtros son acumulables:

```
GET /api/products?sellerTier=secure&verified=true&warranty=techshield&minPositivity=80&maxHoursOfUse=500&noMining=true&hideSuspicious=true
```

---

## Pantalla de Filtros (Frontend)

La pestaña **Filtros** (`FiltersScreen`) organiza los filtros en 7 secciones:

1. **Seguridad del Vendedor** - Seguro / Normal / No Seguro / Todos (con la descripción de cada uno).
2. **Chequeo del Producto** - toggle "Chequeado para Compra".
3. **Estado del Producto** - toggle "Productos Nuevos" (etiqueta azul "Nuevo").
4. **Garantía / Cobertura** - Todas / Garantía TechShield 90 días / Cobertura extendida.
5. **Positividad mínima** - Todas / 75%+ / 85%+ / 90%+.
6. **Uso del producto** - "Menos de 500 h de uso" y "Sin estrés de minería".
7. **Seguridad extra** - "Solo con custodia / escrow", "Ocultar productos con quejas abiertas" y "Ocultar precios sospechosos".

Al aplicar, el Explorar muestra una franja con los filtros activos y consulta el backend con los parámetros correspondientes. Si el backend no está disponible, se usan datos de demostración aplicando los mismos filtros localmente.

---

## Sistemas de seguridad asociados

Además de los filtros, la plataforma incluye:

- **2FA / OTP**: cuentas con `otpEnabled` requieren código de 6 dígitos tras el login (`/api/auth/otp/request`, `/api/auth/otp/verify`).
- **KYC ligero**: `phoneVerified` / `documentVerified` para vendedores; se muestra "ID VERIFICADO".
- **Reportes / denuncias**: `POST /api/reports` para denunciar vendedores/compradores; moderación admin en `GET/PATCH /api/reports`.
- **Chat seguro**: `POST /api/chat/safety-check` detecta emails, teléfonos, enlaces acortados/http y pagos fuera de custodia, y sanea el mensaje.
- **Devolución y cobertura**: dinero paralizado 10 días (devolución) y cobertura de la empresa hasta 45 días (`GET /api/orders/:id/protection`).

---

## Referencia rápida de endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Lista con todos los filtros (parámetros de la tabla superior) |
| GET | `/api/products/:id` | Detalle con `securityTier`, `sellerStats`, `warranty`, `priceFlag` |
| GET | `/api/reviews/trust-badge/:sellerId` | Perfil de seguridad del vendedor |
| POST | `/api/auth/otp/request` | Solicitar código OTP |
| POST | `/api/auth/otp/verify` | Verificar código OTP |
| POST | `/api/chat/safety-check` | Analizar mensaje del chat |
| POST | `/api/reports` | Denunciar usuario |
| GET | `/api/orders/:id/protection` | Ventana devolución 10 días / cobertura 45 días |