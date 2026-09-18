import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Enums } from '@quizbyte/database';

import { Empty, Meter, Section, UserChip, formatDateTime, formatRelative } from '@/components/Ui';
import { UserActions } from '@/components/UserActions';
import { listReportsAbout } from '@/lib/queries/moderation';
import { getUserDetail } from '@/lib/queries/users';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('de-DE');

const REASON_LABELS: Record<Enums<'user_report_reason'>, string> = {
  username: 'Benutzername',
  spam: 'Spam',
  harassment: 'Belästigung',
  cheating: 'Betrug',
  other: 'Sonstiges',
};

const STATUS_LABELS: Record<Enums<'report_status'>, string> = {
  open: 'Offen',
  in_review: 'In Prüfung',
  reviewed: 'Erledigt',
  rejected: 'Abgelehnt',
};

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="detail__label">{label}</span>
      <span className="detail__value">{typeof value === 'number' ? nf.format(value) : value}</span>
    </div>
  );
}

/**
 * Ein Konto im Detail.
 *
 * Die Meldungen über diese Person stehen auf derselben Seite wie die Knöpfe,
 * mit denen man darauf reagiert – zwischen "warum" und "was jetzt" sollte kein
 * Seitenwechsel liegen.
 */
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, reports] = await Promise.all([getUserDetail(id), listReportsAbout(id)]);
  if (!user) notFound();

  const accuracy =
    user.questionsAnswered > 0 ? Math.round((user.correctAnswers / user.questionsAnswered) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            <UserChip username={user.username} />
          </h1>
          <p>
            {user.displayName ?? 'Kein Anzeigename'}
            {user.role === 'admin' ? <span className="badge badge--admin"> Admin</span> : null}
            {user.suspendedAt ? <span className="badge badge--suspended"> gesperrt</span> : null}
            {user.isAnonymous ? <span className="badge"> Gastkonto</span> : null}
          </p>
          <p className="page-header__meta">
            {user.email ?? 'keine E-Mail'} · Konto-Id <code>{user.id}</code>
          </p>
        </div>
        <div className="btn-row">
          <Link className="btn btn--ghost" href="/users">
            Zurück
          </Link>
        </div>
      </div>

      {user.suspendedAt ? (
        <div className="error">
          Gesperrt seit {formatDateTime(user.suspendedAt)}
          {user.suspendedReason ? ` – „${user.suspendedReason}"` : '.'}
        </div>
      ) : null}

      <div className="grid grid--split">
        <div className="card">
          <h2>Fortschritt</h2>
          <div className="detail-grid" style={{ marginTop: 14 }}>
            <Fact label="Level" value={user.level} />
            <Fact label="XP gesamt" value={user.totalXp} />
            <Fact label="Streak" value={`${user.currentStreak} (max ${user.longestStreak})`} />
            <Fact label="Beantwortet" value={user.questionsAnswered} />
            <Fact label="Davon richtig" value={user.correctAnswers} />
            <Fact label="Quizze beendet" value={user.sessionsCompleted} />
            <Fact label="Freunde" value={user.friends} />
            <Fact label="Duelle" value={user.duels} />
          </div>
          <div style={{ marginTop: 16, maxWidth: 260 }}>
            <span className="detail__label">Trefferquote</span>
            <Meter value={accuracy} />
          </div>
        </div>

        <div className="card">
          <h2>Konto</h2>
          <div className="detail-grid" style={{ marginTop: 14 }}>
            <Fact label="Registriert" value={formatDateTime(user.createdAt)} />
            <Fact label="Letzter Login" value={formatRelative(user.lastSignInAt)} />
            <Fact label="Zuletzt aktiv" value={user.lastActiveDate ?? '–'} />
            <Fact label="Name geändert" value={user.usernameChangedAt ? formatDateTime(user.usernameChangedAt) : 'nie'} />
            <Fact label="Auffindbar" value={user.searchable ? 'ja' : 'nein'} />
            <Fact label="Anfragen" value={user.allowFriendRequests ? 'erlaubt' : 'gesperrt'} />
            <Fact label="Meldungen gegen" value={user.reportsAgainst} />
            <Fact label="Selbst gemeldet" value={user.reportsFiled} />
          </div>

          <h2 style={{ marginTop: 22 }}>Moderation</h2>
          <UserActions userId={user.id} username={user.username} isSuspended={user.suspendedAt !== null} />
        </div>
      </div>

      <Section title="Meldungen" hint="Was über dieses Konto vorliegt.">
        {reports.length === 0 ? (
          <Empty title="Keine Meldungen" hint="Über dieses Konto hat sich noch niemand beschwert." />
        ) : (
          <div className="card card--flush table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Zeitpunkt</th>
                  <th>Grund</th>
                  <th>Beschreibung</th>
                  <th>Von</th>
                  <th>Status</th>
                  <th>Notiz</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="cell--muted">{formatDateTime(report.createdAt)}</td>
                    <td>{REASON_LABELS[report.reason]}</td>
                    <td className="cell--muted">{report.details || '–'}</td>
                    <td className="cell--muted">@{report.reporterUsername}</td>
                    <td>
                      <span className={`badge badge--${report.status}`}>{STATUS_LABELS[report.status]}</span>
                    </td>
                    <td className="cell--muted">{report.adminNote || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Letzte Runden" hint="Die zehn zuletzt gestarteten Quizze.">
        {user.recentSessions.length === 0 ? (
          <Empty title="Noch nichts gespielt" />
        ) : (
          <div className="card card--flush table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Start</th>
                  <th>Modus</th>
                  <th>Kategorie</th>
                  <th className="num">Ergebnis</th>
                  <th className="num">XP</th>
                  <th>Beendet</th>
                </tr>
              </thead>
              <tbody>
                {user.recentSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="cell--muted">{formatDateTime(session.started_at)}</td>
                    <td>{session.mode}</td>
                    <td className="cell--muted">{session.category_name ?? session.session_type}</td>
                    <td className="num">
                      {session.correct_answers} / {session.total_questions}
                    </td>
                    <td className="num">{nf.format(session.xp_earned)}</td>
                    <td className="cell--muted">
                      {session.completed_at ? formatRelative(session.completed_at) : <span className="badge">abgebrochen</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
