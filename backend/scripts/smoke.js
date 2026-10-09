#!/usr/bin/env node
/**
 * Smoke test del backend: API viva, paginación, auth+refresh y regla de catálogo
 * (comprador no publica; vendedor publica y edita su propio catálogo).
 * Uso: npm run smoke   (el backend debe estar corriendo en localhost:3000)
 */
const BASE = process.env.API_URL || 'http://localhost:3000/api';

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.text() };
}

function req(method, path, body, token) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async (res) => ({ status: res.status, body: await res.text() }));
}

function json(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function loginFlow(email, password) {
  const login = json((await req('POST', '/auth/login', { email, password })).body);
  if (login && login.requiresOtp) {
    const otp = json((await req('POST', '/auth/otp/request', { otpToken: login.otpToken })).body);
    const sess = json(
      (await req('POST', '/auth/otp/verify', { otpToken: login.otpToken, code: otp.code })).body,
    );
    return sess;
  }
  return login;
}

async function main() {
  const checks = [];
  const ok = (name, cond) => checks.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);

  let r = await get('/products?limit=1');
  ok('GET /products es 200', r.status === 200);

  r = await get('/products?page=1&limit=2');
  ok('paginación (page/limit) responde', r.status === 200);

  r = await get('/auth/profile');
  ok('GET /auth/profile sin token → 401', r.status === 401);

  // Login de prueba + refresh
  const sess = await loginFlow('owner22@gmail.com', 'owner123');
  ok('login devuelve refresh_token', !!sess.refresh_token);

  const prof = await get('/auth/profile', sess.access_token);
  ok('GET /auth/profile con token → 200', prof.status === 200);

  const refreshed = json((await req('POST', '/auth/refresh', { refreshToken: sess.refresh_token })).body);
  ok('POST /auth/refresh rota el par', !!refreshed.access_token && refreshed.refresh_token !== sess.refresh_token);

  // Regla de catálogo: comprador ≠ publica; vendedor sí (y solo edita su catálogo).
  const suffix = Date.now().toString(36);
  const buyerMail = `buyer_${suffix}@test.com`;
  const sellerMail = `seller_${suffix}@test.com`;
  const pw = 'passtest123';

  await req('POST', '/auth/register', { name: 'Buyer Smoke', email: buyerMail, password: pw, role: 'buyer' });
  const buyer = await loginFlow(buyerMail, pw);
  const buyerProduct = await req(
    'POST',
    '/products',
    { title: 'X Smoke', description: 'desc', price: 1, condition: 'used', category: 'cpu' },
    buyer.access_token,
  );
  ok('comprador NO puede publicar → 403', buyerProduct.status === 403);

  await req('POST', '/auth/register', { name: 'Seller Smoke', email: sellerMail, password: pw, role: 'seller' });
  const seller = await loginFlow(sellerMail, pw);
  const created = await req(
    'POST',
    '/products',
    { title: 'Cat Smoke', description: 'descripción válida', price: 200, condition: 'used', category: 'gpu' },
    seller.access_token,
  );
  ok('vendedor publica → 201', created.status === 201);
  const productId = json(created.body).id;

  const patched = await req('PATCH', `/products/${productId}`, { title: 'Cat Smoke v2' }, seller.access_token);
  ok('vendedor edita su producto → 200', patched.status === 200);

  const buyerPatch = await req('PATCH', `/products/${productId}`, { title: 'hack' }, buyer.access_token);
  ok('comprador NO edita catálogo ajeno → 403', buyerPatch.status === 403);

  console.log(checks.join('\n'));
  const failed = checks.filter((c) => c.startsWith('FAIL')).length;
  console.log(`\nSmoke: ${checks.length - failed}/${checks.length} OK`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('Smoke falló (¿backend levantado?).', e.message);
  process.exit(1);
});