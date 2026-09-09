'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signOutAction } from '@/lib/actions/auth';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/questions', label: 'Fragen' },
  { href: '/categories', label: 'Kategorien' },
  { href: '/import', label: 'Import' },
] as const;

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span>QB</span>
        QuizByte Admin
      </div>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={`sidebar__link ${active ? 'sidebar__link--active' : ''}`}>
            {item.label}
          </Link>
        );
      })}
      <div className="sidebar__footer">
        <span title={email}>{email}</span>
        <form action={signOutAction}>
          <button type="submit" className="btn btn--ghost btn--sm">
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  );
}
