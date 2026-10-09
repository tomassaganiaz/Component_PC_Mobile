import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

interface CacheEntry {
  buffer: Buffer;
  contentType: string;
  at: number;
}

const ALLOWED_HOST_SUFFIXES = ['googleusercontent.com', 'ggpht.com'];
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const CACHE_MAX_ENTRIES = 200;

@Injectable()
export class MediaService {
  private readonly cache = new Map<string, CacheEntry>();

  private assertAllowed(url: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('URL inválida');
    }
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('Solo se permiten URLs https');
    }
    const host = parsed.hostname.toLowerCase();
    const allowed = ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
    if (!allowed) {
      throw new BadRequestException('Host no permitido');
    }
    return parsed;
  }

  private remember(key: string, entry: CacheEntry) {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(key, entry);
  }

  async getOptimized(
    url: string,
    width: number,
    quality: number,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    this.assertAllowed(url);

    const w = Math.min(Math.max(Math.round(width) || 400, 16), 1600);
    const q = Math.min(Math.max(Math.round(quality) || 72, 20), 90);
    const key = `${url}|${w}|${q}`;

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return { buffer: cached.buffer, contentType: cached.contentType };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      throw new BadRequestException(`No se pudo descargar la imagen (${res.status})`);
    }

    const input = Buffer.from(await res.arrayBuffer());
    const buffer = await sharp(input)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: q })
      .toBuffer();

    const entry: CacheEntry = { buffer, contentType: 'image/webp', at: Date.now() };
    this.remember(key, entry);
    return { buffer, contentType: entry.contentType };
  }
}