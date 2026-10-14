#!/usr/bin/env node
/**
 * Smoke test del frontend: verifica que el dev server sirva la web, el QR/manifiesto
 * y que las rutas clave respondan 200.
 * Uso: npm run smoke   (el dev server debe correr en localhost:8081)
 */
const BASE = process.env.WEB_URL || 'http://localhost:8081';

async function fetchOk(url) {
  return fetch(url, { signal: AbortSignal.timeout(15000) }).catch(() => null);
}

async function ok(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  return cond;
}

async function main() {
  let pass = true;

  const root = await fetchOk(`${BASE}/`);
  pass = (await ok('raíz responde 200', root?.status === 200)) && pass;

  const bundle = await fetchOk(
    `${BASE}/node_modules/expo-router/entry.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=src%2Fapp&unstable_transformProfile=hermes-stable`,
  );
  pass = (await ok('bundle Android compila (200)', bundle?.status === 200)) && pass;

  for (const route of ['/login', '/register', '/filters', '/inspection', '/profile']) {
    const r = await fetchOk(`${BASE}${route}`);
    pass = (await ok(`ruta ${route} → 200`, r?.status === 200)) && pass;
  }

  const open = await fetchOk(`${BASE}/_expo/open?platform=android`);
  const body = open ? await open.text() : '';
  pass = (await ok('QR/manifiesto exp:// generado', open?.status === 200 && body.includes('exp://'))) && pass;

  console.log(`\nSmoke web: ${pass ? 'OK' : 'FALLÓ'}`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error('Smoke web falló (¿dev server levantado?).', e.message);
  process.exit(1);
});