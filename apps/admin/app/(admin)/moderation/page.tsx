import Link from 'next/link';

import type { Enums } from '@quizbyte/database';

import { ReportActions } from '@/components/ReportActions';
import { Empty, Section, formatDateTime, formatRelative } from '@/components/Ui';
import { listAdminActions, listQuestionReports, listUserReports } from '@/lib/queries/moderation';

export const dynamic = 'force-dynamic';

const USER_REASONS: Record<Enums<'user_report_reason'>, string> = {
  username: 'Benutzername',
  spam: 'Spam',
  harassment: 'Belästigung',
  cheating: 'Betrug',
  other: 'Sonstiges',
};

const QUESTION_REASONS: Record<Enums<'report_reason'>, string> = {
  wrong_answer: 'Falsche Antwort',
  wrong_question: 'Falsche Frage',
  outdated: 'Veraltet',
  typo: 'Tippfehler',
  unclear: 'Unklar',
  other: 'Sonstiges',
};

const STATUS_LABELS: Record<Enums<'report_status'>, string> = {
  open: 'Offen',
  in_review: 'In Prüfung',
  reviewed: 'Erledigt',
  rejected: 'Abgelehnt',
};

const ACTION_LABELS: Record<Enums<'admin_action_kind'>, string> = {
  suspend_user: 'Nutzer gesperrt',
  unsuspend_user: 'Sperre aufgehoben',
  reset_username: 'Name zurückgesetzt',
  resolve_report: 'Nutzermeldung bearbeitet',
  resolve_question_report: 'Fragemeldung bearbeitet',
  note_report: 'Notiz gespeichert',
  set_feature_flag: 'Feature-Schalter',
  plan_daily_quiz: 'Tagesquiz geplant',
  edit_question: 'Frage geändert',
  edit_category: 'Kategorie geändert',
};

const TABS = [
  { value: 'open', label: 'Offen' },
  { value: 'in_review', label: 'In Prüfung' },
  { value: 'reviewed', label: 'Erledigt' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'all', label: 'Alle' },
] as const;

const KINDS = [
  { value: 'all', label: 'Alles' },
  { value: 'user', label: 'Nutzer' },
  { value: 'question', label: 'Fragen' },
] as const;

/**
 * Nutzer- und Fragemeldungen an einem Ort.
 *
 * Bewusst eine Seite für beides: der Arbeitsschritt ist derselbe – ansehen,
 * entscheiden, notieren –, und zwei Listen in zwei Menüpunkten hätten
 * bedeutet, dass die kleinere von beiden regelmäßig vergessen wird.
 *
 * Offene zuerst, weil das die Frage ist, die die Seite beantwortet.
 */
export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const statusParam = params.status ?? 'open';
  const status = statusParam === 'all' ? undefined : (statusParam as Enums<'report_status'>);
  const kind = params.kind === 'user' || params.kind === 'question' ? params.kind : 'all';

  const [userReports, questionReports, actions] = await Promise.all([
    kind === 'question' ? Promise.resolve([]) : listUserReports(status),
    kind === 'user' ? Promise.resolve([]) : listQuestionReports(status),
    listAdminActions(25),
  ]);

  // Beides in einer Liste, nach Zeit – so liest sich die Seite als Posteingang
  // und nicht als zwei Tabellen, die nichts miteinander zu tun haben.
  const entries = [
    ...userReports.map((report) => ({ sort: report.createdAt, kind: 'user' as const, report })),
    ...questionReports.map((report) => ({ sort: report.createdAt, kind: 'question' as const, report })),
  ].sort((a, b) => b.sort.localeCompare(a.sort));

  const tabHref = (value: string) => `/moderation?status=${value}${kind === 'all' ? '' : `&kind=${kind}`}` as const;
  const kindHref = (value: string) => `/moderation?status=${statusParam}${value === 'all' ? '' : `&kind=${value}`}` as const;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Moderation</h1>
          <p>Gemeldete Nutzer und Fragen, mit dem, was sich dagegen tun lässt.</p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
        <div className="btn-row">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              className={`btn btn--sm ${statusParam === tab.value ? 'btn--primary' : 'btn--ghost'}`}
              href={tabHref(tab.value)}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="btn-row">
          {KINDS.map((entry) => (
            <Link
              key={entry.value}
              className={`btn btn--sm ${kind === entry.value ? 'btn--primary' : 'btn--ghost'}`}
              href={kindHref(entry.value)}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ marginTop: 14 }}>
          <Empty
            title="Hier ist gerade nichts zu tun"
            hint={statusParam === 'open' ? 'Keine offenen Meldungen.' : 'Mit diesem Filter ist die Liste leer.'}
          />
        </div>
      ) : (
        <div className="card card--flush" style={{ marginTop: 14 }}>
          {entries.map((entry) =>
            entry.kind === 'user' ? (
              <article key={`u-${entry.report.id}`} className="report">
                <div>
                  <div className="report__head">
                    <span className="badge">Nutzer</span>
                    <span className="report__subject">
                      <Link href={`/users/${entry.report.reportedId}`}>@{entry.report.reportedUsername}</Link>
                    </span>
                    <span className={`badge badge--${entry.report.status}`}>{STATUS_LABELS[entry.report.status]}</span>
                    {entry.report.reportedSuspendedAt ? <span className="badge badge--suspended">gesperrt</span> : null}
                    {entry.report.reportedReportCount > 1 ? (
                      <span className="badge badge--open">{entry.report.reportedReportCount} Meldungen</span>
                    ) : null}
                  </div>

                  <strong>{USER_REASONS[entry.report.reason]}</strong>
                  <p className="report__details">{entry.report.details || 'Keine Beschreibung.'}</p>

                  <p className="report__meta">
                    <span>von @{entry.report.reporterUsername}</span>
                    <span>{formatDateTime(entry.report.createdAt)}</span>
                    {entry.report.reviewedAt ? <span>bearbeitet {formatRelative(entry.report.reviewedAt)}</span> : null}
                  </p>

                  {entry.report.adminNote ? <p className="report__note">{entry.report.adminNote}</p> : null}
                </div>

                <ReportActions
                  reportId={entry.report.id}
                  kind="user"
                  status={entry.report.status}
                  note={entry.report.adminNote}
                  reportedId={entry.report.reportedId}
                  reportedUsername={entry.report.reportedUsername}
                  isSuspended={entry.report.reportedSuspendedAt !== null}
                />
              </article>
            ) : (
              <article key={`q-${entry.report.id}`} className="report">
                <div>
                  <div className="report__head">
                    <span className="badge">Frage</span>
                    <span className={`badge badge--${entry.report.status}`}>{STATUS_LABELS[entry.report.status]}</span>
                    <span className={`badge badge--${entry.report.questionStatus}`}>{entry.report.questionStatus}</span>
                    {entry.report.questionReportCount > 1 ? (
                      <span className="badge badge--open">{entry.report.questionReportCount} Meldungen</span>
                    ) : null}
                  </div>

                  <span className="report__subject">
                    <Link href={`/questions/${entry.report.questionId}`}>{entry.report.questionText}</Link>
                  </span>
                  <p className="report__details">
                    <strong>{QUESTION_REASONS[entry.report.reason]}</strong>
                    {entry.report.details ? ` – ${entry.report.details}` : ''}
                  </p>

                  <p className="report__meta">
                    <span>{entry.report.categoryName}</span>
                    <span>von @{entry.report.reporterUsername}</span>
                    <span>{formatDateTime(entry.report.createdAt)}</span>
                  </p>

                  {entry.report.adminNote ? <p className="report__note">{entry.report.adminNote}</p> : null}
                </div>

                <ReportActions
                  reportId={entry.report.id}
                  kind="question"
                  status={entry.report.status}
                  note={entry.report.adminNote}
                />
              </article>
            ),
          )}
        </div>
      )}

      {/* Das Protokoll. Kurz gehalten: es beantwortet „wer war das", nicht
          „was ist dieses Jahr alles passiert". */}
      <Section title="Adminprotokoll" hint="Die letzten 25 Eingriffe.">
        <div className="card card--flush table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Admin</th>
                <th>Aktion</th>
                <th>Betrifft</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {actions.length === 0 ? (
                <tr>
                  <td className="cell--muted" colSpan={5}>
                    Noch nichts.
                  </td>
                </tr>
              ) : (
                actions.map((action) => (
                  <tr key={action.id}>
                    <td className="cell--muted">{formatDateTime(action.createdAt)}</td>
                    <td>{action.adminUsername ? `@${action.adminUsername}` : '–'}</td>
                    <td>{ACTION_LABELS[action.kind]}</td>
                    <td className="cell--muted">
                      {action.targetUserId && action.targetUsername ? (
                        <Link href={`/users/${action.targetUserId}`}>@{action.targetUsername}</Link>
                      ) : (
                        '–'
                      )}
                    </td>
                    <td className="cell--muted">{action.details || '–'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
