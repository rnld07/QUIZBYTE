import Link from 'next/link';
import type { Route } from 'next';

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  href?: Route;
}

export function StatCard({ label, value, hint, href }: StatCardProps) {
  const content = (
    <div className="card stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
      {hint ? <span className="help">{hint}</span> : null}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
