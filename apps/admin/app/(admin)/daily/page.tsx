import Link from 'next/link';

import { DailyPlanForm } from '@/components/DailyPlanForm';
import { Empty, Meter, Section } from '@/components/Ui';
import { getDailyOverview, getDailyPlan } from '@/lib/queries/insights';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('de-DE');

/** Heute in Berlin – dieselbe Rechnung wie `daily_quiz_day()` in der Datenbank. */
function berlinToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Das Tagesquiz.
 *
 * Standardmäßig wählt die Datenbank die Fragen über einen Hash aus Frage-Id
 * und Datum – für alle gleich, stabil über den Tag, ohne dass jemand morgens
 * etwas eintragen muss. Diese Seite ist die Ausnahme davon: ein Tag lässt sich
 * von Hand belegen, und liegt kein Plan, bleibt alles wie bisher.
 *
 * Vergangene Tage und kommende stehen in derselben Liste, weil man beim Planen
 * wissen will, wie die letzten angenommen wurden.
 */
export default async function DailyPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const params = await searchParams;
  const today = berlinToday();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(params.day ?? '') ? (params.day as string) : today;

  const [overview, plan] = await Promise.all([getDailyOverview(14, 14), getDailyPlan(selected)]);

  const past = overview.filter((row) => row.day <= today);
  const played = past.filter((row) => row.sessions > 0);
  const avgPlayers = played.length > 0 ? Math.round(played.reduce((sum, row) => sum + row.players, 0) / played.length) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Daily Quiz</h1>
          <p>Was am jeweiligen Tag gespielt wird – und wie es lief.</p>
          <p className="page-header__meta">
            Ohne Plan wählt die Datenbank die Fragen selbst. Ein leerer Plan ist deshalb kein Ausfall.
          </p>
        </div>
      </div>

      <div className="grid grid--split">
        <div className="card card--flush table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tag</th>
                <th>Plan</th>
                <th className="num">Spieler</th>
                <th className="num">Runden</th>
                <th>Quote</th>
                <th className="num">Fehlerfrei</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overview.map((row) => (
                <tr key={row.day} className={row.day === selected ? 'row--flag' : ''}>
                  <td>
                    <span className="cell--strong">{formatDay(row.day)}</span>
                    {row.day === today ? <span className="badge badge--admin"> heute</span> : null}
                    {row.note ? <span className="cell--sub">{row.note}</span> : null}
                  </td>
                  <td>
                    {row.plannedCount > 0 ? (
                      <span className="badge badge--ok">{row.plannedCount} Fragen</span>
                    ) : (
                      <span className="badge badge--off">automatisch</span>
                    )}
                  </td>
                  <td className="num">{row.players > 0 ? nf.format(row.players) : '–'}</td>
                  <td className="num">{row.sessions > 0 ? nf.format(row.sessions) : '–'}</td>
                  <td style={{ minWidth: 120 }}>
                    {row.sessions > 0 ? <Meter value={row.avgAccuracy} /> : <span className="cell--muted">–</span>}
                  </td>
                  <td className="num cell--muted">{row.sessions > 0 ? row.perfectRounds : '–'}</td>
                  <td>
                    <Link className="btn btn--sm btn--ghost" href={`/daily?day=${row.day}`}>
                      Planen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2>{formatDay(selected)}</h2>
          <p className="hint" style={{ marginBottom: 12 }}>
            {selected < today
              ? 'Vergangener Tag – eine Änderung wirkt sich nicht mehr aus.'
              : selected === today
                ? 'Heute. Eine Änderung greift sofort für alle, die noch nicht gespielt haben.'
                : 'Zukünftiger Tag.'}
          </p>

          <DailyPlanForm day={selected} questionIds={plan.map((entry) => entry.questionId)} note={overview.find((row) => row.day === selected)?.note ?? ''} />

          {plan.length > 0 ? (
            <div className="card card--flush table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Frage</th>
                    <th>Kategorie</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((entry) => (
                    <tr key={entry.questionId}>
                      <td className="cell--muted">{entry.position}</td>
                      <td className="cell--truncate">
                        <Link href={`/questions/${entry.questionId}`}>{entry.questionText}</Link>
                      </td>
                      <td className="cell--muted">{entry.categoryName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <Section title="Zahlen" hint="Über die Tage, an denen gespielt wurde.">
        {played.length === 0 ? (
          <Empty title="Noch keine Teilnahme" hint="Sobald jemand das Tagesquiz spielt, steht hier die Bilanz." />
        ) : (
          <div className="kpis">
            <div className="kpi kpi--primary">
              <span className="kpi__label">Spieler je Tag</span>
              <span className="kpi__value">{avgPlayers}</span>
              <span className="kpi__foot">Durchschnitt über {played.length} Tage</span>
            </div>
            <div className="kpi kpi--warning">
              <span className="kpi__label">Trefferquote</span>
              <span className="kpi__value">
                {Math.round(played.reduce((sum, row) => sum + row.avgAccuracy, 0) / played.length)} %
              </span>
              <span className="kpi__foot">im Tagesquiz</span>
            </div>
            <div className="kpi kpi--success">
              <span className="kpi__label">Fehlerfreie Runden</span>
              <span className="kpi__value">{nf.format(played.reduce((sum, row) => sum + row.perfectRounds, 0))}</span>
              <span className="kpi__foot">Sie öffnen das Glücksrad</span>
            </div>
            <div className="kpi kpi--muted">
              <span className="kpi__label">Geplante Tage</span>
              <span className="kpi__value">{overview.filter((row) => row.plannedCount > 0).length}</span>
              <span className="kpi__foot">von {overview.length} im Zeitraum</span>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
