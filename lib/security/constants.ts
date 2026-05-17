/** Free analyses per browser (unsigned visitor cookie) before login is required. */
export const ANON_SCAN_LIMIT = 3;

/** Short-lived token required for each analyze POST (issued by GET /api/analyze/token). */
export const ANALYZE_TOKEN_TTL_SEC = 120;

export const VISITOR_COOKIE_NAME = 'dermaiq_visitor';
export const VISITOR_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** Per-IP sliding window (all visitors). */
export const IP_RATE_WINDOW_MS = 15 * 60 * 1000;
export const IP_RATE_MAX = 12;

/** Global burst protection across all IPs. */
export const GLOBAL_RATE_WINDOW_MS = 5 * 60 * 1000;
export const GLOBAL_RATE_MAX = 100;

/** Webhook alert cooldown per alert kind (ms). */
export const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
