import Link from 'next/link';

import { ActivityChart } from '@/components/ActivityChart';
import { Kpi, KpiGrid } from '@/components/Kpi';
import { Empty, Meter, Section, UserChip, formatRelative } from '@/components/Ui';
import {
  getActivityHistory,
  getDashboardKpis,
  getHardestQuestions,
  getRecentUsers,
  getTopCategories,
} from '@/lib/queries/dashboard';
import { listQuestionReports, listUserReports } from '@/lib/queries/moderation';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('de-DE');

/**
 * Das Dashboard.
 *
 * Oben die Zahlen des Tages, darunter der Verlauf, dann das, was auffällt.
 * Alles in einem Durchgang geladen: die sieben Abfragen hängen nicht
 * voneinander ab, und nacheinander wären sie siebenmal die Latenz zur
 * Datenbank.
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const range = params.range === '7' ? 7 : 30;

  const [kpis, history, topCategories, hardest, recentUsers, userReports, questionReports] = await Promise.all([
    getDashboardKpis(),
    getActivityHistory(range),
    getTopCategories(range, 6),
    getHardestQuestions(6),
    getRecentUsers(6),
    listUserReports('open'),
    listQuestionReports('open'),
  ]);

  const openReports = [
    ...userReports.map((report) => ({
      id: report.id,
      kind: 'Nutzer' as const,
      subject: `@${report.reportedUsername}`,
      details: report.details,
      createdAt: report.createdAt,
      by: report.reporterUsername,
    })),
    ...questionReports.map((report) => ({
      id: report.id,
      kind: 'Frage' as const,
      subject: report.questionText,
      details: report.details,
      createdAt: report.createdAt,
      by: report.reporterUsername,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  const totalOpen = kpis.openUserReports + kpis.openQuestionReports;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Wie QuizByte heute läuft.</p>
        </div>
        <div className="btn-row">
          <Link className="btn btn--primary" href="/questions/new">
            Neue Frage
          </Link>
          <Link className="btn" href="/import">
            Import
          </Link>
        </div>
      </div>

      {/* Die sieben Zahlen, nach denen gefragt wurde – Vergleichswerte dort,
          wo es einen gibt, der etwas bedeutet. */}
      <KpiGrid>
        <Kpi
          label="Aktiv heute"
          value={kpis.activeToday}
          previous={kpis.activeYesterday}
          hint="gegenüber gestern"
          tone="primary"
        />
        <Kpi label="Aktiv (7 Tage)" value={kpis.active7d} hint={`von ${nf.format(kpis.usersTotal)} Konten`} tone="info" />
        <Kpi label="Neu heute" value={kpis.newUsersToday} hint={`${nf.format(kpis.newUsers7d)} diese Woche`} tone="success" />
        <Kpi
          label="Quizze heute"
          value={kpis.sessionsToday}
          hint={`${nf.format(kpis.sessionsCompletedToday)} beendet`}
          tone="primary"
        />
        <Kpi
          label="Quizze beendet"
          value={kpis.sessionsCompletedTotal}
          hint={`von ${nf.format(kpis.sessionsTotal)} gestartet`}
          tone="muted"
        />
        <Kpi label="Trefferquote" value={`${kpis.avgAccuracy} %`} hint="über alle Antworten" tone="warning" />
        <Kpi
          label="Offene Meldungen"
          value={totalOpen}
          hint={`${nf.format(kpis.openUserReports)} Nutzer · ${nf.format(kpis.openQuestionReports)} Fragen`}
          tone={totalOpen > 0 ? 'danger' : 'muted'}
          href="/moderation"
        />
      </KpiGrid>

      <Section
        title="Aktivität"
        hint={`Gestartete Quizze der letzten ${range} Tage.`}
        action={
          <div className="btn-row">
            <Link className={`btn btn--sm ${range === 7 ? 'btn--primary' : 'btn--ghost'}`} href="/dashboard?range=7">
              7 Tage
            </Link>
            <Link className={`btn btn--sm ${range === 30 ? 'btn--primary' : 'btn--ghost'}`} href="/dashboard?range=30">
              30 Tage
            </Link>
          </div>
        }
      >
        <div className="card">
          <ActivityChart days={history} metric="sessions" />
        </div>
      </Section>

      <div className="grid grid--3" style={{ marginTop: 26 }}>
        <div className="card">
          <div className="section__head">
            <div>
              <h2>Meistgespielte Kategorien</h2>
              <p>Letzte {range} Tage.</p>
            </div>
          </div>
          {topCategories.length === 0 ? (
            <p className="cell--muted">Noch nichts gespielt.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {topCategories.map((category) => (
                    <tr key={category.categoryId}>
                      <td className="cell--strong">{category.name}</td>
                      <td className="num cell--muted">{nf.format(category.attempts)}</td>
                      <td style={{ width: 150 }}>
                        <Meter value={category.accuracy} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section__head">
            <div>
              <h2>Schwierigste Fragen</h2>
              <p>Ab 5 Antworten, nach Trefferquote.</p>
            </div>
          </div>
          {hardest.length === 0 ? (
            <p className="cell--muted">Noch zu wenig Antworten.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {hardest.map((question) => (
                    <tr key={question.questionId}>
                      <td>
                        <Link href={`/questions/${question.questionId}`} className="cell--truncate">
                          {question.questionText}
                        </Link>
                        <span className="cell--sub">
                          {question.categoryName} · {nf.format(question.attempts)} Antworten
                        </span>
                      </td>
                      <td style={{ width: 130 }}>
                        <Meter value={question.accuracy} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid--3" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="section__head">
            <div>
              <h2>Letzte Meldungen</h2>
              <p>Nur offene.</p>
            </div>
            <Link className="btn btn--sm btn--ghost" href="/moderation">
              Alle
            </Link>
          </div>
          {openReports.length === 0 ? (
            <p className="cell--muted">Nichts offen.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {openReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <span className="badge">{report.kind}</span>
                      </td>
                      <td>
                        <span className="cell--truncate">{report.subject}</span>
                        <span className="cell--sub">
                          von @{report.by} · {formatRelative(report.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section__head">
            <div>
              <h2>Neueste Nutzer</h2>
              <p>Zuletzt registriert.</p>
            </div>
            <Link className="btn btn--sm btn--ghost" href="/users">
              Alle
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <Empty title="Noch keine Konten" />
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <UserChip username={user.username} userId={user.id} />
                        {user.suspended ? <span className="badge badge--suspended"> gesperrt</span> : null}
                      </td>
                      <td className="num cell--muted">Lvl {user.level}</td>
                      <td className="cell--muted">{formatRelative(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Der Inhaltsbestand ganz unten: er ändert sich langsam, und wer ihn
          sucht, sucht ihn gezielt. */}
      <Section title="Inhalte" hint="Bestand und Lücken.">
        <KpiGrid>
          <Kpi label="Fragen" value={kpis.questionsTotal} hint={`${nf.format(kpis.questionsPublished)} veröffentlicht`} tone="muted" />
          <Kpi label="Im Review" value={kpis.questionsReview} tone={kpis.questionsReview > 0 ? 'warning' : 'muted'} href="/questions?status=review" />
          <Kpi label="Entwürfe" value={kpis.questionsDraft} tone="muted" href="/questions?status=draft" />
          <Kpi label="Bild fehlt" value={kpis.questionsMissingImage} tone="muted" href="/questions?image=missing" />
          <Kpi label="Audio fehlt" value={kpis.questionsMissingAudio} tone="muted" href="/questions?audio=missing" />
          <Kpi
            label="Kategorien"
            value={`${kpis.categoriesActive} / ${kpis.categoriesTotal}`}
            hint="aktiv / gesamt"
            tone="muted"
            href="/categories"
          />
        </KpiGrid>
      </Section>
    </>
  );
}
