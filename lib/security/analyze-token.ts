import { randomUUID } from 'crypto';
import { signPayload, verifySignedPayload } from './crypto';
import { ANALYZE_TOKEN_TTL_SEC } from './constants';

export type AnalyzeTokenPayload = {
  visitorId: string;
  exp: number;
  nonce: string;
};

export function createAnalyzeToken(visitorId: string): string {
  const payload: AnalyzeTokenPayload = {
    visitorId,
    exp: Math.floor(Date.now() / 1000) + ANALYZE_TOKEN_TTL_SEC,
    nonce: randomUUID(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signPayload(body);
  return `${body}.${sig}`;
}

export function verifyAnalyzeToken(token: string, visitorId: string): boolean {
  const lastDot = token.lastIndexOf('.');
  if (lastDot <= 0) return false;
  const body = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!verifySignedPayload(body, sig)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    ) as AnalyzeTokenPayload;
    if (payload.visitorId !== visitorId) return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return Boolean(payload.nonce);
  } catch {
    return false;
  }
}
