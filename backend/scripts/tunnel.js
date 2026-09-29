#!/usr/bin/env node
/**
 * Dev tunnel para exponer el backend (puerto 3000) a un dispositivo físico
 * usando la misma infraestructura de túnel que Expo (@expo/ngrok + exp.direct).
 *
 * Uso:
 *   npm run tunnel
 *
 * Opcional: export NGROK_AUTHTOKEN=<token>  para usar tu propio token de ngrok.
 * Si no se provee, se reutiliza el token que trae embebido el CLI de Expo
 * (ubicado en Frontend/node_modules/expo/node_modules/@expo/cli).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const DOMAIN = 'exp.direct';

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
      // eslint-disable-next-line import/no-dynamic-require
      return require(candidate);
    } catch {
      // try next
    }
  }
  throw new Error(
    'No se encontró @expo/ngrok. Instalalo con: npm install --save-dev @expo/ngrok en Frontend/ (o global: npm i -g @expo/ngrok).',
  );
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

async function main() {
  const ngrok = resolveNgrokModule();
  const authtoken = process.env.NGROK_AUTHTOKEN || extractExpoAuthToken();
  if (!authtoken) {
    throw new Error(
      'No se pudo obtener un token de ngrok. Configuralo con: $env:NGROK_AUTHTOKEN="tu_token"',
    );
  }

  const hostname = `backend-${Date.now().toString(36)}-${crypto
    .randomBytes(3)
    .toString('hex')}.${DOMAIN}`;

  console.log(`Abriendo túnel hacia http://localhost:${PORT} ...`);
  const url = await ngrok.connect({
    authtoken,
    hostname,
    port: PORT,
    onStatusChange(status) {
      if (status === 'connected') {
        console.log('Túnel conectado.');
      } else if (status === 'closed') {
        console.error('El túnel fue cerrado.');
      }
    },
  });

  console.log('\n============================================================');
  console.log('  API pública:', url);
  console.log(`  Swagger:    ${url}/api/docs`);
  console.log('============================================================');
  console.log('Para que el frontend use esta API en modo túnel:\n');
  console.log(`  $env:EXPO_PUBLIC_API_URL="${url}/api"; npm run start:tunnel`);
  console.log('\nPresiona Ctrl+C para cerrar el túnel.\n');

  process.on('SIGINT', async () => {
    await ngrok.kill();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await ngrok.kill();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});