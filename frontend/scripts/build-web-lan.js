#!/usr/bin/env node
/**
 * Compila la web apuntando la API a la IP de tu LAN (para revisar desde el
 * celular vía QR) y genera dist/.
 *
 * Uso:
 *   npm run build:web:lan
 *   # Opcional: LAN_IP=192.168.0.10  ó  EXPO_PUBLIC_API_URL=https://api.dominio/api
 */
const os = require('os');
const { spawnSync } = require('child_process');

function lanIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return 'localhost';
}

const ip = process.env.LAN_IP || lanIP();
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL || `http://${ip}:3000/api`;

console.log(`Compilando web con EXPO_PUBLIC_API_URL=${apiUrl}`);

const exportRes = spawnSync('npx', ['expo', 'export', '-p', 'web'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl },
});
if (exportRes.status !== 0) process.exit(exportRes.status ?? 1);

const sriRes = spawnSync('node', ['scripts/add-sri.js'], {
  stdio: 'inherit',
  shell: true,
});
process.exit(sriRes.status ?? 0);
