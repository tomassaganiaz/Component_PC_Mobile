#!/usr/bin/env node
/**
 * Agrega Subresource Integrity (SRI) a los assets compilados en dist/.
 * Evita que un tercero modifique el JS/CSS servido sin que el navegador lo detecte.
 *
 * Uso: node scripts/add-sri.js   (después de `expo export -p web`)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIST = path.join(__dirname, '..', 'dist');

function sha384(file) {
  const buf = fs.readFileSync(file);
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.html$/.test(e.name)) out.push(p);
  }
  return out;
}

let touched = 0;
for (const html of walk(DIST)) {
  const src = fs.readFileSync(html, 'utf8');
  const next = src.replace(
    /<(script[^>]*\bsrc="([^"]+)"|link\b[^>]*rel="stylesheet"[^>]*\bhref="([^"]+)")/g,
    (full) => {
      if (full.includes('integrity=')) return full;
      const url = /(?:src|href)="([^"]+)"/.exec(full)?.[1];
      if (!url || !url.includes('/_expo/')) return full;
      const file = path.join(DIST, url.startsWith('/') ? url.slice(1) : url);
      if (!fs.existsSync(file)) return full;
      return `${full} integrity="${sha384(file)}" crossorigin="anonymous"`;
    },
  );
  if (next !== src) {
    fs.writeFileSync(html, next, 'utf8');
    touched++;
  }
}

console.log(`SRI aplicado en ${touched} archivo(s) HTML.`);