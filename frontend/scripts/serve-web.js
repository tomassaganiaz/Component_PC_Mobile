#!/usr/bin/env node
/**
 * Sirve el build web estático (dist/) y muestra un QR para abrirlo en varios
 * dispositivos móviles.
 *
 * Uso:
 *   npm run build:web:lan     # genera dist/ apuntando a la API de tu LAN
 *   npm run serve:web         # sirve dist/ y muestra el QR
 *
 * Opcional: PUBLIC_URL="https://mi-web.ngrok.io" npm run serve:web
 *   (para mostrar un QR de una URL pública/túnel en vez de la IP de la LAN)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const qrcode = require('qrcode-terminal');

const PORT = Number(process.env.PORT || 4173);
const DIST = path.join(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function lanIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return 'localhost';
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(data);
}

if (!fs.existsSync(DIST)) {
  console.error(
    'No existe dist/. Generá el build web primero:  npm run build:web:lan',
  );
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const candidates = [];
  if (urlPath === '/' || urlPath === '') {
    candidates.push(path.join(DIST, 'index.html'));
  } else {
    const clean = urlPath.replace(/^\/+/, '');
    candidates.push(path.join(DIST, clean));
    candidates.push(path.join(DIST, `${clean}.html`));
    candidates.push(path.join(DIST, 'index.html'));
  }

  for (const candidate of candidates) {
    // Evita salir del directorio dist/
    if (!candidate.startsWith(DIST)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return sendFile(res, candidate);
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404');
});

server.listen(PORT, '0.0.0.0', () => {
  const url = process.env.PUBLIC_URL || `http://${lanIP()}:${PORT}`;
  console.log('\n============================================================');
  console.log('  Web TechShield:', url);
  console.log('============================================================');
  console.log('  Escaneá el QR desde cualquier celular (misma red / URL pública):\n');
  qrcode.generate(url, { small: true });
  console.log('\n  Presioná Ctrl+C para detener.\n');
});
