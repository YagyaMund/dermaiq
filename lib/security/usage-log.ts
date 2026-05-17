import { prisma } from '@/lib/prisma';
import {
  GLOBAL_RATE_MAX,
  GLOBAL_RATE_WINDOW_MS,
  IP_RATE_MAX,
  IP_RATE_WINDOW_MS,
} from './constants';
import { sendAbuseAlert } from './abuse-alerts';

export async function recordAnalyzeUsage(params: {
  ipHash: string;
  visitorId?: string;
  userId?: string;
}): Promise<void> {
  try {
    await prisma.apiUsageLog.create({
      data: {
        ipHash: params.ipHash,
        visitorId: params.visitorId,
        userId: params.userId,
        route: 'analyze',
      },
    });
  } catch (e) {
    console.warn('api_usage_log insert failed:', e);
  }
}

export async function checkUsageRates(ipHash: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const now = new Date();
  const ipSince = new Date(now.getTime() - IP_RATE_WINDOW_MS);
  const globalSince = new Date(now.getTime() - GLOBAL_RATE_WINDOW_MS);

  try {
    const [ipCount, globalCount] = await Promise.all([
      prisma.apiUsageLog.count({
        where: { ipHash, createdAt: { gte: ipSince }, route: 'analyze' },
      }),
      prisma.apiUsageLog.count({
        where: { createdAt: { gte: globalSince }, route: 'analyze' },
      }),
    ]);

    if (ipCount >= IP_RATE_MAX) {
      void sendAbuseAlert({
        kind: 'ip_burst',
        message: 'High analyze volume from a single IP',
        meta: { ipHash, count: ipCount, windowMin: IP_RATE_WINDOW_MS / 60000 },
      });
      return {
        allowed: false,
        reason: 'Too many requests from your network. Please try again later.',
      };
    }

    if (globalCount >= GLOBAL_RATE_MAX) {
      void sendAbuseAlert({
        kind: 'global_burst',
        message: 'Site-wide analyze spike detected',
        meta: { count: globalCount, windowMin: GLOBAL_RATE_WINDOW_MS / 60000 },
      });
      return {
        allowed: false,
        reason: 'DermaIQ is busy right now. Please try again in a few minutes.',
      };
    }

    return { allowed: true };
  } catch (e) {
    console.warn('usage rate check failed (allowing request):', e);
    return { allowed: true };
  }
}
