# Entrega final — App móvil TechShield

Guía de entrega para la materia **Aplicaciones Móviles** (Expo / React Native + NestJS).

## 1. Qué es

Marketplace verificado de hardware/móviles. **App móvil** (Expo Router, multiplataforma Android/iOS/Web) + **API** NestJS/PostgreSQL. Incluye custodia (escrow), auditoría técnica, carrito multi-producto, pagos, wallet, envíos con tracking, notificaciones, reputación, variantes/SKU y panel admin.

## 2. Features móviles (nativo)

- **Biometría** (Face ID / huella) con `expo-local-authentication` → login sin escribir clave (guarda credenciales en `expo-secure-store`).
- **Cámara / galería** con `expo-image-picker` → fotos del producto al publicar.
- **Notificaciones locales/push** con `expo-notifications` → aviso al recibir una notificación (venta, envío, entrega).
- **Deep linking** (`scheme: techshield`), PWA, i18n (es/en), tema claro/oscuro, offline fallback.
- **Build instalable**: config EAS lista (`eas.json`, `android.package`, `ios.bundleIdentifier`).

## 3. Cómo correr en el celular

```bash
# Backend (en la PC, misma red)
cd backend && npm run start:dev      # puerto 3000

# App
cd Frontend
npx expo start                        # escaneá el QR con Expo Go
# o
npx expo start --tunnel               # fuera de la LAN (requiere NGROK_AUTHTOKEN)
```

> La app detecta el host del backend automáticamente (`src/config.ts`) o definí `EXPO_PUBLIC_API_URL`.

## 4. Generar el APK (build instalable)

Requisitos: cuenta Expo + `npm i -g eas-cli` + `eas login`.

```bash
cd Frontend
eas init                              # crea/liga el projectId (una vez)
eas build -p android --profile preview   # genera APK (perfil preview)
# al terminar, eas da un link de descarga del .apk
```

`eas.json` define los perfiles `development`, `preview` (APK) y `production`.

## 5. Credenciales demo

| Rol | Email | Password | Notas |
|---|---|---|---|
| Admin | `owner22@gmail.com` | `owner123` | Login con OTP |
| Vendedor | `techlab.pro@test.com` | `demo12345` | Publica/edita su catálogo |
| Comprador | `buyer1@test.com` | `demo12345` | Compra, carrito, reseñas |

## 6. Requisitos funcionales cubiertos (resumen)

- Autenticación (registro, login, OTP, refresh, roles) y KYC ligero.
- Catálogo con filtros, búsqueda, paginación, anti-estafa (precio sospechoso).
- Publicación de productos con stock y **fotos**, variantes/SKU, mis publicaciones.
- Carrito multi-producto y checkout con **pago (intent/webhook)** y cupones.
- Órdenes con custodia: `pending → paid → shipped → delivered`, cancelación, devolución/cobertura.
- **Envíos** (cotización + tracking), **wallet/payouts** del vendedor.
- Reseñas/quejas y **reputación** del vendedor (termómetro + medalla).
- **Notificaciones** in-app + locales, **panel admin** (overview, moderación por endpoints).

## 7. Calidad

| Suite | Resultado |
|---|---|
| Backend unit (Jest) | 122 |
| Backend e2e (Supertest, Postgres de test) | 95 |
| Frontend (Jest) | 18 |
| Lint / typecheck / build | OK |

## 8. Revisión en múltiples dispositivos (QR)

### Opción A — Misma red Wi-Fi (lo más simple)
1. Backend: `cd backend && npm run start:dev` (queda en `http://<IP-LAN>:3000`).
2. Compilar la web apuntando a tu IP de LAN:
   ```bash
   cd Frontend
   npm run build:web:lan
   ```
3. Servir + QR:
   ```bash
   npm run serve:web
   ```
   Muestra la URL (ej. `http://192.168.0.111:4173`) **y un QR**. Cualquier celular en la misma Wi-Fi lo escanea y abre la web (PWA). Cualquier cantidad de dispositivos.
4. Si Windows bloquea: permitir **Node.js** en la red privada (Firewall).

### Opción B — Redes distintas (público)
- **Web pública**: el repo ya trae el workflow `.github/workflows/web.yml` (deploy a **Netlify**). Configurá los secrets `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` y `EXPO_PUBLIC_API_URL` (URL pública del backend) y hacé push → la web queda publicada; mostrá el QR de esa URL.
- **Backend público**: `cd backend && npm run tunnel` (expone la API por un túnel) y compilá la web con `EXPO_PUBLIC_API_URL="<url-túnel>/api"`.
- **QR de un túnel de la web**: `PUBLIC_URL="https://tu-web.ngrok.io" npm run serve:web`.

### Opción C — App móvil nativa (Expo Go)
```bash
cd backend && npm run tunnel            # API pública
cd Frontend
$env:EXPO_PUBLIC_API_URL="<url-túnel>/api"; npm run start:tunnel
```
Escaneás el QR con **Expo Go** (funciona desde cualquier red). En iOS/Android.

## 8.b. Comandos de build web

| Comando | Qué hace |
|---|---|
| `npm run build:web` | Export estático (usa `EXPO_PUBLIC_API_URL` o config por defecto) |
| `npm run build:web:lan` | Export apuntando a la IP de tu LAN (para QR local) |
| `npm run serve:web` | Sirve `dist/` y muestra QR |

## 9. Checklist de entrega

- [ ] `app.json` con nombre y bundle IDs (hecho).
- [ ] `eas.json` configurado (hecho).
- [ ] **APK generado** con `eas build` (pendiente de cuenta EAS).
- [ ] Video demo en celular (recomendado).
- [ ] Informe final (objetivos, arquitectura, RF, decisiones, conclusiones).
- [ ] Credenciales demo para el evaluador.
