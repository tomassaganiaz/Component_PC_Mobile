#!/usr/bin/env node
/**
 * Túnel del dev server de Expo para usar la app fuera de la LAN.
 *
 * Escaneás el QR con Expo Go desde cualquier red (datos móviles, otra Wi-Fi)
 * sin necesidad de crear ninguna cuenta.
 *
 * Modos (automático):
 *  1. Si existe NGROK_AUTHTOKEN → túnel ngrok propio (hostname exp.direct).
 *  2. Si no → túnel cloudflared Quick Tunnel (trycloudflare.com, sin cuenta).
 *
 * Uso:
 *   cd Frontend
 *   npm run start:tunnel
 *
 *   # Opcional: apuntar la app a la API pública (ver backend: npm run tunnel)
 *   $env:EXPO_PUBLIC_API_URL="https://tu-api.trycloudflare.com/api"
 *   npm run start:tunnel
 *
 *   # Opcional (modo 1): cuenta gratis en https://ngrok.com
 *   $env:NGROK_AUTHTOKEN="tu_token"
 *   npm run start:tunnel
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8081);
const DOMAIN = 'exp.direct';
const TUNNEL_URL_RE = /https:\/\/[a-zA-Z0-9.-]*trycloudflare\.com/i;

function resolveNgrokModule() {
  const candidates = [
    path.join(__dirname, '..', 'node_modules', '@expo', 'ngrok'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@expo', 'ngrok'),
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next
    }
  }
  return null;
}

function cloudflaredBin() {
  const dir = path.join(os.tmpdir(), 'opencode');
  const name = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  return { dir, bin: path.join(dir, name) };
}

function cloudflaredDownloadUrl() {
  const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download';
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  if (process.platform === 'win32') return `${base}/cloudflared-windows-amd64.exe`;
  if (process.platform === 'darwin')
    return `${base}/cloudflared-darwin-${arch === 'arm64' ? 'arm64' : 'amd64'}`;
  return `${base}/cloudflared-linux-${arch}`;
}

async function ensureCloudflared() {
  const { dir, bin } = cloudflaredBin();
  if (fs.existsSync(bin)) return bin;
  console.log('Descargando cloudflared (una sola vez, sin cuenta)...');
  fs.mkdirSync(dir, { recursive: true });
  const url = cloudflaredDownloadUrl();
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`No se pudo descargar cloudflared (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(bin, buf);
  if (process.platform !== 'win32') fs.chmodSync(bin, 0o755);
  return bin;
}

/** Abre un Quick Tunnel hacia localhost:port y resuelve con la URL pública. */
function openCloudflaredTunnel(port) {
  return ensureCloudflared().then(
    (bin) =>
      new Promise((resolve, reject) => {
        const child = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let output = '';
        const timer = setTimeout(() => {
          child.kill();
          reject(
            new Error(
              'Timeout esperando la URL del túnel (cloudflared). Revisá tu conexión a internet.',
            ),
          );
        }, 90000);

        const onData = (data) => {
          output += data.toString();
          const m = output.match(TUNNEL_URL_RE);
          if (m) {
            clearTimeout(timer);
            child.stdout.removeAllListeners('data');
            child.stderr.removeAllListeners('data');
            resolve({ url: m[0], child });
          }
        };
        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
        child.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            clearTimeout(timer);
            reject(new Error(`cloudflared terminó con código ${code}.`));
          }
        });
      }),
  );
}

function printQr(expUrl) {
  console.log('\n============================================================');
  console.log('  Escaneá este QR con Expo Go (vale desde cualquier red):\n');
  try {
    const qrcode = require('qrcode-terminal');
    qrcode.generate(expUrl, { small: true });
  } catch {
    console.log('  (QR no disponible en terminal, usá la URL de abajo)');
  }
  console.log(`\n  ${expUrl}`);
  console.log('============================================================\n');
}

async function main() {
  const authtoken = process.env.NGROK_AUTHTOKEN;
  let tunnelUrl = null;
  let ngrok = null;
  let cfChild = null;

  if (authtoken) {
    ngrok = resolveNgrokModule();
    if (!ngrok) {
      console.warn(
        'Aviso: hay NGROK_AUTHTOKEN pero no se encontró @expo/ngrok. Uso cloudflared.',
      );
    } else {
      const hostname = `app-${Date.now().toString(36)}-${crypto
        .randomBytes(3)
        .toString('hex')}.${DOMAIN}`;
      console.log(`Abriendo túnel ngrok hacia http://localhost:${PORT} ...`);
      try {
        tunnelUrl = await ngrok.connect({ authtoken, hostname, port: PORT });
      } catch (err) {
        console.warn(`ngrok con hostname falló (${err.message}). Reintento con URL aleatoria...`);
        try {
          tunnelUrl = await ngrok.connect({ authtoken, port: PORT });
        } catch (err2) {
          console.warn(`ngrok falló (${err2.message}). Uso cloudflared (sin cuenta)...`);
          ngrok = null;
        }
      }
    }
  }

  if (!tunnelUrl) {
    console.log(`Abriendo túnel (cloudflared) hacia http://localhost:${PORT} ...`);
    const opened = await openCloudflaredTunnel(PORT);
    tunnelUrl = opened.url;
    cfChild = opened.child;
    cfChild.stderr.on('data', () => {});
    console.log('Túnel conectado:', tunnelUrl);
  } else {
    console.log('Túnel conectado:', tunnelUrl);
  }

  const expUrl = 'exp://' + tunnelUrl.replace(/^https?:\/\//, '');
  printQr(expUrl);
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log(`API de la app: ${process.env.EXPO_PUBLIC_API_URL}`);
  } else {
    console.log(
      'API de la app: detección automática (LAN). Si el celu está fuera de la LAN,',
      'levantá la API pública (cd backend && npm run tunnel) y reintentá con:',
    );
    console.log('  $env:EXPO_PUBLIC_API_URL="https://tu-api.trycloudflare.com/api"');
    console.log('  npm run start:tunnel\n');
  }

  // Expo usa EXPO_PACKAGER_PROXY_URL como base del manifest para el device.
  // shell:true evita EINVAL de spawn en Windows con npx.cmd.
  const child = spawn('npx expo start', {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      EXPO_PACKAGER_PROXY_URL: tunnelUrl,
    },
  });

  const cleanup = async () => {
    child.kill();
    try {
      if (ngrok) await ngrok.kill();
    } catch {
      // ignore
    }
    if (cfChild) cfChild.kill();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  child.on('exit', () => cleanup());
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
