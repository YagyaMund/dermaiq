import type { NextRequest } from 'next/server';
import { hashIp } from './crypto';

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function ipHashFromRequest(request: NextRequest): string {
  return hashIp(clientIp(request));
}

const BLOCKED_UA =
  /curl\/|wget\/|python-requests|httpx\/|aiohttp|go-http-client|postman|insomnia|scrapy|java\/|libwww-perl/i;

export function isBlockedUserAgent(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua.trim()) return true;
  return BLOCKED_UA.test(ua);
}

export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    // Same-origin form posts from file input may omit Origin in some cases.
    const secFetchSite = request.headers.get('sec-fetch-site');
    return secFetchSite === 'same-origin' || secFetchSite === 'none' || !secFetchSite;
  }
  const allowed = allowedOrigins();
  return allowed.some((base) => origin === base || origin.startsWith(`${base}/`));
}

function allowedOrigins(): string[] {
  const fromEnv = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[];
  if (process.env.NODE_ENV !== 'production') {
    fromEnv.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return [...new Set(fromEnv.map((u) => u.replace(/\/$/, '')))];
}

export function isMultipartImageUpload(request: NextRequest): boolean {
  const ct = request.headers.get('content-type') ?? '';
  return ct.includes('multipart/form-data');
}
