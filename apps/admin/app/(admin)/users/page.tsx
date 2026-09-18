import Link from 'next/link';

import { Empty, Meter, Pagination, UserChip, formatDate, formatRelative } from '@/components/Ui';
import { listUsers, parseUserFilters } from '@/lib/queries/users';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('de-DE');

const SORTS: { value: string; label: string }[] = [
  { value: 'created_at', label: 'Neueste zuerst' },
  { value: 'last_seen', label: 'Zuletzt gesehen' },
  { value: 'xp', label: 'XP' },
  { value: 'streak', label: 'Streak' },
  { value: 'sessions', label: 'Gespielte Quizze' },
  { value: 'reports', label: 'Meldungen' },
  { value: 'username', label: 'Name (A–Z)' },
];

const STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'suspended', label: 'Gesperrt' },
  { value: 'reported', label: 'Gemeldet' },
  { value: 'admin', label: 'Admins' },
];

/**
 * Die Nutzertabelle.
 *
 * Gefiltert und sortiert wird auf dem Server, geblättert auch – eine Liste,
 * die erst vollständig geladen und dann im Browser sortiert wird, funktioniert
 * genau so lange, wie es wenige Konten gibt.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseUserFilters(params);
  const result = await listUsers(filters);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Nutzer</h1>
          <p>Konten, Fortschritt und was dagegen vorliegt.</p>
        </div>
      </div>

      <form method="get" className="card filters">
        <div className="field filters--wide">
          <label htmlFor="q">Suche</label>
          <input id="q" name="q" className="input" defaultValue={filters.q} placeholder="Benutzername oder Anzeigename" />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" className="select" defaultValue={filters.status}>
            {STATUSES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sort">Sortierung</label>
          <select id="sort" name="sort" className="select" defaultValue={filters.sort}>
            {SORTS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn--primary" type="submit">
          Anzeigen
        </button>
      </form>

      {result.rows.length === 0 ? (
        <Empty
          title="Keine Treffer"
          hint={filters.q ? `Für „${filters.q}" gibt es kein Konto.` : 'Mit diesem Filter ist die Liste leer.'}
          action={
            <Link className="btn btn--ghost btn--sm" href="/users">
              Filter zurücksetzen
            </Link>
          }
        />
      ) : (
        <>
          <div className="card card--flush table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nutzer</th>
                  <th className="num">Level</th>
                  <th className="num">XP</th>
                  <th className="num">Streak</th>
                  <th>Quote</th>
                  <th className="num">Quizze</th>
                  <th>Registriert</th>
                  <th>Zuletzt</th>
                  <th>Status</th>
                  <th className="num">Meldungen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.rows.map((user) => (
                  <tr key={user.id} className={user.suspendedAt ? 'row--danger' : user.reportCount > 0 ? 'row--flag' : ''}>
                    <td>
                      <UserChip username={user.username} userId={user.id} />
                      {user.displayName ? <span className="cell--sub">{user.displayName}</span> : null}
                    </td>
                    <td className="num">{user.level}</td>
                    <td className="num">{nf.format(user.totalXp)}</td>
                    <td className="num">
                      {user.currentStreak}
                      {user.longestStreak > user.currentStreak ? (
                        <span className="cell--sub">max {user.longestStreak}</span>
                      ) : null}
                    </td>
                    <td style={{ minWidth: 130 }}>
                      {user.questionsAnswered > 0 ? <Meter value={user.accuracy} /> : <span className="cell--muted">–</span>}
                    </td>
                    <td className="num">{nf.format(user.sessionsCompleted)}</td>
                    <td className="cell--muted">{formatDate(user.createdAt)}</td>
                    <td className="cell--muted">{formatRelative(user.lastSignInAt)}</td>
                    <td>
                      {user.suspendedAt ? (
                        <span className="badge badge--suspended">gesperrt</span>
                      ) : user.role === 'admin' ? (
                        <span className="badge badge--admin">Admin</span>
                      ) : (
                        <span className="badge badge--ok">aktiv</span>
                      )}
                    </td>
                    <td className="num">
                      {user.reportCount > 0 ? (
                        <Link href={`/users/${user.id}`}>{user.reportCount}</Link>
                      ) : (
                        <span className="cell--muted">–</span>
                      )}
                    </td>
                    <td>
                      <Link className="btn btn--sm btn--ghost" href={`/users/${user.id}`}>
                        Ansehen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            basePath="/users"
            params={{ q: filters.q, status: filters.status, sort: filters.sort }}
          />
        </>
      )}
    </>
  );
}
