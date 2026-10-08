#!/usr/bin/env node
/**
 * Túnel del dev server de Expo con TU propia cuenta de ngrok.
 *
 * Expo `--tunnel` usa el token compartido de Expo, que en este proyecto está
 * saturado (ERR_NGROK_108). Esta alternativa abre un túnel propio hacia
 * http://localhost:8081 y lanza `expo start` con EXPO_PACKAGER_PROXY_URL para
 * que el QR/manifiesto apunten al túnel (funciona desde cualquier red).
 *
 * Uso:
 *   $env:NGROK_AUTHTOKEN="tu_token"   # cuenta gratis en ngrok.com
 *   npm run start:tunnel
 *   # Opcional: $env:EXPO_PUBLIC_API_URL="https://backend.exp.direct/api"
 */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8081);
const DOMAIN = 'exp.direct';

function resolveNgrokModule() {
  const candidates = [
    path.join(__dirname, '..', 'node_modules', '@expo', 'ngrok'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@expo', 'ngrok'),
  ];
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line import/no-dynamic-require
      return require(candidate);
    } catch {
      // try next
    }
  }
  throw new Error(
    'No se encontró @expo/ngrok. Instalalo con: npm install --save-dev @expo/ngrok',
  );
}

async function main() {
  const ngrok = resolveNgrokModule();
  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    console.error(
      'Falta NGROK_AUTHTOKEN. Creá una cuenta gratis en https://ngrok.com y configurá el token:\n' +
        '  $env:NGROK_AUTHTOKEN="tu_token"',
    );
    process.exit(1);
  }

  const hostname = `app-${Date.now().toString(36)}-${crypto
    .randomBytes(3)
    .toString('hex')}.${DOMAIN}`;

  console.log(`Abriendo túnel hacia http://localhost:${PORT} ...`);
  const url = await ngrok.connect({ authtoken, hostname, port: PORT });

  console.log('\n============================================================');
  console.log('  Túnel Metro:', url);
  console.log('  Abrí en Expo Go: exp://' + url.replace(/^https?:\/\//, ''));
  console.log('============================================================');

  // Expo usa EXPO_PACKAGER_PROXY_URL como base del manifest para el device.
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['expo', 'start'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        EXPO_PACKAGER_PROXY_URL: url,
      },
    },
  );

  const cleanup = async () => {
    child.kill();
    await ngrok.kill();
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