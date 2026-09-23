import { Injectable } from '@nestjs/common';

const SHORTENERS = ['bit.ly', 't.co', 'goo.gl', 'tinyurl.com', 'cutt.ly', 'ow.ly', 'is.gd', 'rebrand.ly'];
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_RE = /https?:\/\/[^\s<>"']+/g;
const ESCROW_RISK_WORDS = [
  'transferencia directa',
  'westerunion',
  'western union',
  'paypal directo',
  'sin custodia',
  'fuera de la plataforma',
  'pago por fuera',
];

export interface ChatSafetyResult {
  safe: boolean;
  warnings: string[];
  sanitizedText: string;
}

@Injectable()
export class ChatSafetyService {
  check(text: string): ChatSafetyResult {
    const warnings: string[] = [];
    let sanitized = text ?? '';

    const emails = text.match(EMAIL_RE) ?? [];
    if (emails.length > 0) {
      warnings.push('No compartas direcciones de email fuera de la plataforma.');
      sanitized = sanitized.replace(EMAIL_RE, '[email oculto]');
    }

    const phones = text.match(PHONE_RE) ?? [];
    if (phones.length > 0) {
      warnings.push('No compartas números de teléfono fuera de la plataforma.');
      sanitized = sanitized.replace(PHONE_RE, '[teléfono oculto]');
    }

    const urls = text.match(URL_RE) ?? [];
    for (const url of urls) {
      const host = url.replace(/^https?:\/\//, '').split('/')[0].toLowerCase().replace(/^www\./, '');
      if (SHORTENERS.includes(host)) {
        warnings.push(`El enlace acortado (${host}) es sospechoso. Comprá siempre dentro de TechShield.`);
      } else if (url.startsWith('http://')) {
        warnings.push('Detectado enlace sin cifrado (http). No lo abras.');
      } else {
        warnings.push('No uses enlaces externos: las compras se hacen dentro de TechShield con custodia.');
      }
    }
    if (urls.length > 0) {
      sanitized = sanitized.replace(URL_RE, '[enlace oculto]');
    }

    const lower = text.toLowerCase();
    for (const word of ESCROW_RISK_WORDS) {
      if (lower.includes(word)) {
        warnings.push('Detectada sugerencia de pago fuera de la custodia/escrow. Esto está prohibido.');
      }
    }

    return {
      safe: warnings.length === 0,
      warnings: [...new Set(warnings)],
      sanitizedText: sanitized,
    };
  }
}