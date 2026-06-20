import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuotaForClient } from '@/lib/security/analyze-guard';
import { getVisitorState } from '@/lib/security/visitor-cookie';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  await getVisitorState(); // ensure signed visitor cookie exists for quota
  const quota = await getQuotaForClient(Boolean(session?.user?.id));
  return NextResponse.json(quota, { headers: { 'Cache-Control': 'no-store' } });
}
