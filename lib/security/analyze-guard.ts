import type { NextRequest } from 'next/server';
import { verifyAnalyzeToken } from './analyze-token';
import {
  anonLimitReached,
  anonRemaining,
  getVisitorState,
  setVisitorState,
} from './visitor-cookie';
import {
  clientIp,
  ipHashFromRequest,
  isAllowedOrigin,
  isBlockedUserAgent,
  isMultipartImageUpload,
} from './request-meta';
import { checkUsageRates, recordAnalyzeUsage } from './usage-log';
import { sendAbuseAlert } from './abuse-alerts';
import { ANON_SCAN_LIMIT } from './constants';

const ANALYZE_TOKEN_HEADER = 'x-dermaiq-analyze-token';

export type AnalyzeGuardResult =
  | {
      ok: true;
      visitorId: string;
      isAuthenticated: boolean;
      incrementOnSuccess: boolean;
    }
  | { ok: false; status: number; error: string; details?: string; requiresLogin?: boolean };

export async function enforceAnalyzeRequest(
  request: NextRequest,
  isAuthenticated: boolean,
  userId?: string
): Promise<AnalyzeGuardResult> {
  if (request.method !== 'POST') {
    return { ok: false, status: 405, error: 'Method not allowed' };
  }

  if (!isMultipartImageUpload(request)) {
    return {
      ok: false,
      status: 403,
      error: 'Invalid request',
      details: 'Analysis is only available via photo upload from the DermaIQ app.',
    };
  }

  if (isBlockedUserAgent(request)) {
    void sendAbuseAlert({
      kind: 'suspicious_client',
      message: 'Blocked non-browser client on /api/analyze',
      meta: { ip: clientIp(request), ua: request.headers.get('user-agent') ?? 'empty' },
    });
    return {
      ok: false,
      status: 403,
      error: 'Invalid request',
      details: 'Use the website upload or camera to analyze a product.',
    };
  }

  if (!isAllowedOrigin(request)) {
    return {
      ok: false,
      status: 403,
      error: 'Invalid request',
      details: 'Cross-origin API access is not allowed.',
    };
  }

  const token = request.headers.get(ANALYZE_TOKEN_HEADER);
  if (!token) {
    return {
      ok: false,
      status: 403,
      error: 'Invalid request',
      details: 'Missing analyze session. Refresh the page and try again.',
    };
  }

  const visitor = await getVisitorState();
  if (!verifyAnalyzeToken(token, visitor.visitorId)) {
    return {
      ok: false,
      status: 403,
      error: 'Invalid request',
      details: 'Analyze session expired. Refresh the page and try again.',
    };
  }

  const ipHash = ipHashFromRequest(request);
  const rates = await checkUsageRates(ipHash);
  if (!rates.allowed) {
    return { ok: false, status: 429, error: 'Too many requests', details: rates.reason };
  }

  if (!isAuthenticated && anonLimitReached(visitor)) {
    return {
      ok: false,
      status: 403,
      error: 'Free scan limit reached',
      details: `You have used all ${ANON_SCAN_LIMIT} free scans in this browser. Sign in to continue analyzing products.`,
      requiresLogin: true,
    };
  }

  await recordAnalyzeUsage({
    ipHash,
    visitorId: visitor.visitorId,
    userId,
  });

  return {
    ok: true,
    visitorId: visitor.visitorId,
    isAuthenticated,
    incrementOnSuccess: !isAuthenticated,
  };
}

export async function incrementVisitorScanCount(): Promise<void> {
  const visitor = await getVisitorState();
  await setVisitorState({
    visitorId: visitor.visitorId,
    scanCount: visitor.scanCount + 1,
  });
}

export async function getQuotaForClient(isAuthenticated: boolean) {
  if (isAuthenticated) {
    return {
      authenticated: true,
      remaining: null as number | null,
      limit: null as number | null,
      requiresLogin: false,
    };
  }
  const visitor = await getVisitorState();
  return {
    authenticated: false,
    remaining: anonRemaining(visitor),
    limit: ANON_SCAN_LIMIT,
    requiresLogin: anonLimitReached(visitor),
  };
}

export { ANALYZE_TOKEN_HEADER };
