#!/usr/bin/env node
/**
 * Dev tunnel para exponer el backend (puerto 3000) a un dispositivo físico
 * que está fuera de la LAN. Sin necesidad de crear ninguna cuenta.
 *
 * Modos (automático):
 *  1. Si existe NGROK_AUTHTOKEN → túnel ngrok propio (hostname exp.direct).
 *  2. Si no → túnel cloudflared Quick Tunnel (trycloudflare.com, sin cuenta).
 *
 * Uso:
 *   cd backend
 *   npm run tunnel
 *
 * Después, en otra terminal, apuntá el frontend a esta API pública:
 *   cd Frontend
 *   $env:EXPO_PUBLIC_API_URL="https://tu-api.trycloudflare.com/api"
 *   npm run start:tunnel
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 3000);
const DOMAIN = 'exp.direct';
const TUNNEL_URL_RE = /https:\/\/[a-zA-Z0-9.-]*trycloudflare\.com/i;

const PROJECT_ROOT = path.join(__dirname, '..');
const FRONTEND_ROOT = path.join(PROJECT_ROOT, '..', 'Frontend');

function resolveNgrokModule() {
  const candidates = [
    path.join(FRONTEND_ROOT, 'node_modules', '@expo', 'ngrok'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@expo', 'ngrok'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', 'ngrok'),
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

function extractExpoAuthToken() {
  const candidates = [
    path.join(
      FRONTEND_ROOT,
      'node_modules',
      'expo',
      'node_modules',
      '@expo',
      'cli',
      'build',
      'src',
      'start',
      'server',
      'AsyncNgrok.js',
    ),
    path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'npm',
      'node_modules',
      '@expo',
      'cli',
      'build',
      'src',
      'start',
      'server',
      'AsyncNgrok.js',
    ),
  ];
  for (const file of candidates) {
    try {
      const source = fs.readFileSync(file, 'utf8');
      const match = source.match(/authToken:\s*'([^']+)'/);
      if (match) return match[1];
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
  const res = await fetch(cloudflaredDownloadUrl(), { redirect: 'follow' });
  if (!res.ok) throw new Error(`No se pudo descargar cloudflared (${res.status}).`);
  fs.writeFileSync(bin, Buffer.from(await res.arrayBuffer()));
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

async function main() {
  // OJO: el token embebido de Expo está saturado (ERR_NGROK_108). Solo se usa
  // ngrok si el usuario configuró su propio NGROK_AUTHTOKEN; si no, cloudflared.
  const ownToken = process.env.NGROK_AUTHTOKEN;
  let url = null;
  let ngrok = null;
  let cfChild = null;

  if (ownToken) {
    ngrok = resolveNgrokModule();
    if (!ngrok) {
      console.warn('Aviso: hay NGROK_AUTHTOKEN pero no se encontró @expo/ngrok. Uso cloudflared.');
    } else {
      const hostname = `backend-${Date.now().toString(36)}-${crypto
        .randomBytes(3)
        .toString('hex')}.${DOMAIN}`;
      console.log(`Abriendo túnel ngrok hacia http://localhost:${PORT} ...`);
      try {
        url = await ngrok.connect({ authtoken: ownToken, hostname, port: PORT });
      } catch (err) {
        console.warn(`ngrok falló (${err.message}). Uso cloudflared (sin cuenta)...`);
        ngrok = null;
      }
    }
  } else if (extractExpoAuthToken()) {
    console.log(
      'Sin NGROK_AUTHTOKEN propio: no uso el token compartido de Expo (saturado). Uso cloudflared.',
    );
  }

  if (!url) {
    console.log(`Abriendo túnel (cloudflared) hacia http://localhost:${PORT} ...`);
    const opened = await openCloudflaredTunnel(PORT);
    url = opened.url;
    cfChild = opened.child;
    cfChild.stderr.on('data', () => {});
    console.log('Túnel conectado.');
  } else {
    console.log('Túnel conectado.');
  }

  console.log('\n============================================================');
  console.log('  API pública:', url);
  console.log(`  Swagger:    ${url}/api/docs`);
  console.log('============================================================');
  console.log('Para que el frontend use esta API en modo túnel:\n');
  console.log(`  $env:EXPO_PUBLIC_API_URL="${url}/api"; npm run start:tunnel`);
  console.log('\nPresiona Ctrl+C para cerrar el túnel.\n');

  const cleanup = async () => {
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
  // Mantiene el proceso vivo mientras el túnel está abierto.
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
