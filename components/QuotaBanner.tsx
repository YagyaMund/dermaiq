'use client';

import Link from 'next/link';
import type { AnalyzeQuota } from '@/types';

export default function QuotaBanner({
  quota,
  isLoggedIn,
}: {
  quota: AnalyzeQuota | null;
  isLoggedIn: boolean;
}) {
  if (!quota || isLoggedIn || quota.authenticated) return null;

  if (quota.requiresLogin || quota.remaining === 0) {
    return (
      <div
        className="mt-3 mx-auto max-w-md rounded-lg border px-4 py-3 text-center text-xs sm:text-sm"
        style={{
          borderColor: '#FECACA',
          backgroundColor: '#FEF2F2',
          color: '#B85C50',
        }}
      >
        <p className="font-medium">
          You have used all 3 free scans without logging in.
        </p>
        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
          To scan more products, please log in or create an account.
        </p>
        <Link
          href="/login"
          className="inline-block mt-2 font-semibold underline"
          style={{ color: 'var(--primary)' }}
        >
          Log in to continue
        </Link>
      </div>
    );
  }

  return (
    <p className="text-xs mt-2 px-2" style={{ color: 'var(--text-secondary)' }}>
      Without logging in, you can scan up to 3 products.{' '}
      <span className="font-medium" style={{ color: 'var(--primary)' }}>
        {quota.remaining} free scan{quota.remaining === 1 ? '' : 's'} left.
      </span>
    </p>
  );
}
