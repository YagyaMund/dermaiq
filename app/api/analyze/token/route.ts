import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAnalyzeToken } from '@/lib/security/analyze-token';
import {
  getQuotaForClient,
} from '@/lib/security/analyze-guard';
import { getVisitorState, setVisitorState } from '@/lib/security/visitor-cookie';
import { ANALYZE_TOKEN_HEADER } from '@/lib/security/analyze-guard';
import { ANALYZE_TOKEN_TTL_SEC } from '@/lib/security/constants';

export const runtime = 'nodejs';

/** Issue a short-lived token for the next analyze POST (browser UI only). */
export async function GET() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);

  const visitor = await getVisitorState();
  await setVisitorState(visitor);

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
}
