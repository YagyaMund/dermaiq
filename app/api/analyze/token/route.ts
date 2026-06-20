import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAnalyzeToken } from '@/lib/security/analyze-token';
import { getQuotaForClient, ANALYZE_TOKEN_HEADER } from '@/lib/security/analyze-guard';
import { getVisitorState } from '@/lib/security/visitor-cookie';
import { ANALYZE_TOKEN_TTL_SEC } from '@/lib/security/constants';

export const runtime = 'nodejs';

/** Issue a short-lived token for the next analyze POST (browser UI only). */
export async function GET() {
  try {
    let isAuthenticated = false;
    try {
      const session = await auth();
      isAuthenticated = Boolean(session?.user?.id);
    } catch (error) {
      console.warn('auth() failed during token issue (continuing as guest):', error);
    }

    const visitor = await getVisitorState();
    const token = createAnalyzeToken(visitor.visitorId);
    const quota = await getQuotaForClient(isAuthenticated);

    return NextResponse.json(
      {
        token,
        tokenHeader: ANALYZE_TOKEN_HEADER,
        expiresInSec: ANALYZE_TOKEN_TTL_SEC,
        ...quota,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/analyze/token failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to issue analyze token';
    const missingSecret = /AUTH_SECRET|NEXTAUTH_SECRET/i.test(message);
    return NextResponse.json(
      {
        error: missingSecret ? 'Server misconfigured' : 'Could not start analysis',
        details: missingSecret
          ? 'AUTH_SECRET or NEXTAUTH_SECRET is not set on the server.'
          : 'Please refresh the page and try again.',
      },
      { status: missingSecret ? 503 : 500 }
    );
  }
}
