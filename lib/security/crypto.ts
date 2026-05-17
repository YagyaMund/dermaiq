import { createHmac, randomUUID, timingSafeEqual, createHash } from 'crypto';

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) {
    throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is required for analyze security');
  }
  return s;
}

export function signPayload(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function verifySignedPayload(payload: string, signature: string): boolean {
  const expected = signPayload(payload);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${secret()}:${ip}`).digest('hex').slice(0, 32);
}

export function newVisitorId(): string {
  return randomUUID();
}
