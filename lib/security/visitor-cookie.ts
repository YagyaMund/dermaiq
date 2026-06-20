import { cookies } from 'next/headers';
import {
  ANON_SCAN_LIMIT,
  VISITOR_COOKIE_MAX_AGE_SEC,
  VISITOR_COOKIE_NAME,
} from './constants';
import { newVisitorId, signPayload, verifySignedPayload } from './crypto';

export type VisitorState = {
  visitorId: string;
  scanCount: number;
};

function encodeState(state: VisitorState): string {
  const payload = `${state.visitorId}:${state.scanCount}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

function decodeState(raw: string | undefined): VisitorState | null {
  if (!raw) return null;
  const lastDot = raw.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const payload = raw.slice(0, lastDot);
  const sig = raw.slice(lastDot + 1);
  if (!verifySignedPayload(payload, sig)) return null;
  const [visitorId, countStr] = payload.split(':');
  const scanCount = Number.parseInt(countStr ?? '', 10);
  if (!visitorId || !Number.isFinite(scanCount) || scanCount < 0) return null;
  return { visitorId, scanCount };
}

async function writeVisitorCookie(state: VisitorState): Promise<void> {
  try {
    const jar = await cookies();
    jar.set(visitorCookieOptions(encodeState(state)));
  } catch (error) {
    console.warn('visitor cookie write failed:', error);
  }
}

export async function getVisitorState(): Promise<VisitorState> {
  const jar = await cookies();
  const existing = decodeState(jar.get(VISITOR_COOKIE_NAME)?.value);
  if (existing) return existing;

  const state = { visitorId: newVisitorId(), scanCount: 0 };
  await writeVisitorCookie(state);
  return state;
}

export function visitorCookieOptions(value: string) {
  return {
    name: VISITOR_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: VISITOR_COOKIE_MAX_AGE_SEC,
  };
}

export async function setVisitorState(state: VisitorState): Promise<void> {
  await writeVisitorCookie(state);
}

export function anonRemaining(state: VisitorState): number {
  return Math.max(0, ANON_SCAN_LIMIT - state.scanCount);
}

export function anonLimitReached(state: VisitorState): boolean {
  return state.scanCount >= ANON_SCAN_LIMIT;
}
