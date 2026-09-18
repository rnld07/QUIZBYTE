import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

export type KpiTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface KpiProps {
  label: string;
  value: number | string;
  /** Steht unter der Zahl – der Bezug, ohne den eine Zahl nichts sagt. */
  hint?: ReactNode;
  /** Vergleichswert von gestern oder der Vorwoche; erzeugt den Pfeil. */
  previous?: number;
  tone?: KpiTone;
  href?: Route;
}

const nf = new Intl.NumberFormat('de-DE');

/**
 * Eine Kennzahl.
 *
 * Der Vergleich ist optional und wird bewusst nicht als Prozentwert gezeigt,
 * wenn es vorher null gab: "+∞ %" ist keine Auskunft, "+3" schon.
 */
export function Kpi({ label, value, hint, previous, tone = 'primary', href }: KpiProps) {
  const numeric = typeof value === 'number';
  const delta = numeric && previous !== undefined ? value - previous : null;

  const body = (
    <div className={`kpi kpi--${tone}${href ? ' kpi--link' : ''}`}>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{numeric ? nf.format(value) : value}</span>
      <span className="kpi__foot">
        {delta !== null && delta !== 0 ? (
          <span className={`kpi__delta kpi__delta--${delta > 0 ? 'up' : 'down'}`}>
            {delta > 0 ? '▲' : '▼'} {nf.format(Math.abs(delta))}
          </span>
        ) : null}
        {hint}
      </span>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="kpis">{children}</div>;
}
