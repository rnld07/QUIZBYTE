'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

import { signOutAction } from '@/lib/actions/auth';

interface NavItem {
  href: Route;
  label: string;
}

/**
 * Die Navigation, in drei Gruppen.
 *
 * Nicht alphabetisch und nicht nach Häufigkeit, sondern danach, worum es geht:
 * was gerade passiert, woraus die App besteht, und was man selten anfasst. Bei
 * neun Einträgen ist eine flache Liste eine Suchaufgabe.
 */
const NAV: { group: string; items: readonly NavItem[] }[] = [
  {
    group: 'Überblick',
    items: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/users', label: 'Nutzer' },
      { href: '/moderation', label: 'Moderation' },
    ],
  },
  {
    group: 'Inhalte',
    items: [
      { href: '/questions', label: 'Fragen' },
      { href: '/categories', label: 'Kategorien' },
      { href: '/daily', label: 'Daily Quiz' },
      { href: '/study-sheets', label: 'Lernzettel' },
      { href: '/import', label: 'Import' },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/gamification', label: 'Gamification' },
      { href: '/flags', label: 'Feature Flags' },
      { href: '/system', label: 'System' },
    ],
  },
];

export function Sidebar({ email, openReports }: { email: string; openReports: number }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span>QB</span>
        QuizByte Admin
      </div>

      {NAV.map((section) => (
        <div key={section.group}>
          <div className="sidebar__group">{section.group}</div>
          {section.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`sidebar__link ${active ? 'sidebar__link--active' : ''}`}>
                {item.label}
                {/* Nur die Moderation trägt eine Zahl – sie ist der einzige
                    Punkt, an dem etwas liegen bleiben kann. */}
                {item.href === '/moderation' && openReports > 0 ? (
                  <span className="sidebar__count">{openReports > 99 ? '99+' : openReports}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}

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
