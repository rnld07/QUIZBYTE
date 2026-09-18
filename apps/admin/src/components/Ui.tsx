import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

/** Ein Abschnitt mit Überschrift – und optional etwas am rechten Rand. */
export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2>{title}</h2>
          {hint ? <p>{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Was statt einer Liste steht, wenn nichts da ist.
 *
 * Immer mit einem Satz dazu, was fehlt: eine leere Fläche liest sich wie ein
 * Ladefehler, ein Satz wie ein Zustand.
 */
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card empty">
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
      {action ? <div className="btn-row" style={{ justifyContent: 'center', marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}

/** Ein Anteil als Balken mit Zahl – für Quoten in Tabellenzellen. */
export function Meter({ value, tone }: { value: number; tone?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = tone ?? (clamped >= 70 ? 'var(--success)' : clamped >= 45 ? 'var(--warning)' : 'var(--danger)');
  return (
    <span className="meter">
      <span className="meter__track">
        <span className="meter__fill" style={{ width: `${clamped}%`, background: color }} />
      </span>
      <span className="meter__value">{clamped} %</span>
    </span>
  );
}

/**
 * Blätterung, die die übrigen Filter mitnimmt.
 *
 * Der Link wird aus den aktuellen Suchparametern gebaut statt aus einer
 * gemerkten Seite: sonst verliert man beim Umblättern den Filter, nach dem man
 * gerade gesucht hat.
 */
export function Pagination({
  page,
  pageCount,
  total,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const href = (target: number): Route => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    query.set('page', String(target));
    return `${basePath}?${query.toString()}` as Route;
  };

  return (
    <div className="pagination">
      <span>
        {total === 0 ? 'Keine Treffer' : `${total} Treffer · Seite ${page} von ${pageCount}`}
      </span>
      <span className="pagination__pages">
        {page > 1 ? (
          <Link className="btn btn--sm btn--ghost" href={href(page - 1)}>
            Zurück
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link className="btn btn--sm btn--ghost" href={href(page + 1)}>
            Weiter
          </Link>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Das runde Namenskürzel vor einem Benutzernamen.
 *
 * Verlinkt wird über die Konto-Id, nicht über ein fertiges `href`: der Pfad
 * einer dynamischen Route lässt sich von außen nicht als `Route` typisieren,
 * innerhalb der Komponente prüft Next das Template dagegen sauber.
 */
export function UserChip({ username, userId }: { username: string; userId?: string }) {
  const mark = username.slice(0, 2).toUpperCase();
  const body = (
    <span className="avatar-chip">
      <span className="avatar-chip__mark">{mark}</span>
      <span>@{username}</span>
    </span>
  );
  return userId ? <Link href={`/users/${userId}`}>{body}</Link> : body;
}

/** Ein Datum, wie es im Panel überall aussieht. */
export function formatDateTime(value: string | null): string {
  if (!value) return '–';
  return new Date(value).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDate(value: string | null): string {
  if (!value) return '–';
  return new Date(value).toLocaleDateString('de-DE', { dateStyle: 'medium' });
}

/** "vor 3 Tagen" – für Spalten, in denen das Datum selbst nicht die Frage ist. */
export function formatRelative(value: string | null): string {
  if (!value) return 'nie';
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor(diff / 3_600_000);
    if (hours <= 0) return 'gerade eben';
    return hours === 1 ? 'vor 1 Stunde' : `vor ${hours} Stunden`;
  }
  if (days === 1) return 'gestern';
  if (days < 31) return `vor ${days} Tagen`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'vor 1 Monat' : `vor ${months} Monaten`;
}
