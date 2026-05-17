import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuotaForClient } from '@/lib/security/analyze-guard';
import { getVisitorState, setVisitorState } from '@/lib/security/visitor-cookie';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  const visitor = await getVisitorState();
  await setVisitorState(visitor);
  const quota = await getQuotaForClient(Boolean(session?.user?.id));
  return NextResponse.json(quota, { headers: { 'Cache-Control': 'no-store' } });
}
