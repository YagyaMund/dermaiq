import { ALERT_COOLDOWN_MS } from './constants';

type AlertKind = 'ip_burst' | 'global_burst' | 'suspicious_client';

const lastSent = new Map<AlertKind, number>();

function canSend(kind: AlertKind): boolean {
  const now = Date.now();
  const prev = lastSent.get(kind) ?? 0;
  if (now - prev < ALERT_COOLDOWN_MS) return false;
  lastSent.set(kind, now);
  return true;
}

export async function sendAbuseAlert(params: {
  kind: AlertKind;
  message: string;
  meta?: Record<string, string | number>;
}): Promise<void> {
  const webhook = process.env.ABUSE_WEBHOOK_URL?.trim();
  if (!webhook) {
    console.warn('[DermaIQ abuse]', params.kind, params.message, params.meta ?? '');
    return;
  }
  if (!canSend(params.kind)) return;

  const body = {
    text: [
      `*DermaIQ abuse alert* (${params.kind})`,
      params.message,
      params.meta
        ? Object.entries(params.meta)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n')
        : '',
      `time: ${new Date().toISOString()}`,
    ].join('\n'),
  };

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('Failed to send abuse webhook:', e);
  }
}
