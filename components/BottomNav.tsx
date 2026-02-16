'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const tabs = [
    {
      href: '/',
      label: 'Analyze',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      href: '/history',
      label: 'History',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/recommendations',
      label: 'Better Picks',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  // Don't show login-required tabs if not logged in (still show them but they redirect)
  if (pathname === '/login') return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t z-50"
      style={{ backgroundColor: 'white', borderColor: 'var(--border)' }}
    >
      <div className="max-w-2xl mx-auto flex">
        {tabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          const needsAuth = tab.href !== '/';
          const href = needsAuth && !session ? '/login' : tab.href;

          return (
            <Link
              key={tab.href}
              href={href}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors"
            >
              {tab.icon(isActive)}
              <span
                className="text-xs font-medium"
                style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
