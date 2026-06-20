/** Returns a usable HTTPS image URL or null (blocks LLM placeholders and bad hosts). */
export function sanitizeProductImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return null;
  if (/example\.com|placeholder|via\.placeholder|dummyimage/i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Prefer local scan data URL, else sanitized remote HTTPS. */
export function resolveDisplayImageUrl(
  localUrl?: string | null,
  remoteUrl?: string | null
): string | null {
  if (localUrl?.trim().startsWith('data:image/')) return localUrl.trim();
  return sanitizeProductImageUrl(remoteUrl);
}
