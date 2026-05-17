import { createHash } from 'crypto';

/** Stable hash of raw image bytes for catalog deduplication. */
export function hashImageBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
