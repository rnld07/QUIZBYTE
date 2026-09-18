import Link from 'next/link';
import type { Route } from 'next';

import { Meter } from '@/components/Ui';
import type { QuestionStat } from '@/lib/queries/insights';
import type { QuestionFilters, QuestionListResult } from '@/lib/queries/questions';

import { DifficultyBadge, StatusBadge } from './StatusBadge';

interface QuestionTableProps {
  result: QuestionListResult;
  filters: QuestionFilters;
  /** Antworten, Fehlerquote und Meldungen – nur für die Zeilen dieser Seite. */
  stats: Map<string, QuestionStat>;
}

const nf = new Intl.NumberFormat('de-DE');

function pageHref(filters: QuestionFilters, page: number): Route {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' || value === '' || value === undefined) continue;
    params.set(key, String(value));
  }
  params.set('page', String(page));
  return `/questions?${params.toString()}` as Route;
}

/**
 * Die Fragenliste.
 *
 * Neben dem Bestand steht jetzt, wie die Frage läuft: wie oft sie beantwortet
 * wurde, wie viele daran scheitern und ob sie gemeldet ist. Das ist der
 * Unterschied zwischen einer Inventarliste und einer, mit der man arbeitet –
 * eine Frage, die 90 % falsch beantworten, ist meistens keine schwere Frage,
 * sondern eine schlechte.
 */
export function QuestionTable({ result, filters, stats }: QuestionTableProps) {
  return (
    <div className="card card--flush">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Frage</th>
              <th>Kategorie</th>
              <th>Schwierigkeit</th>
              <th>Richtig</th>
              <th>Status</th>
              <th className="num">Antworten</th>
              <th>Fehlerquote</th>
              <th className="num">Meldungen</th>
              <th>Bild</th>
              <th>Audio</th>
              <th>Geändert</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((question) => {
              const stat = stats.get(question.id);
              const errorRate = stat && stat.attempts > 0 ? 100 - stat.accuracy : null;
              return (
                <tr key={question.id} className={stat && stat.openReports > 0 ? 'row--flag' : ''}>
                  <td className="cell--truncate" title={question.question_text}>
                    <Link href={`/questions/${question.id}`}>{question.question_text || <em>(ohne Text)</em>}</Link>
                    {question.tags.length > 0 ? (
                      <div>
                        {question.tags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {question.categories?.name ?? '–'}
                    {question.subcategory ? <span className="cell--sub">{question.subcategory}</span> : null}
                  </td>
                  <td>
                    <DifficultyBadge difficulty={question.difficulty} />
                  </td>
                  <td className="cell--strong">{question.correct_answer}</td>
                  <td>
                    <StatusBadge status={question.status} />
                  </td>
                  <td className="num cell--muted">{stat ? nf.format(stat.attempts) : '–'}</td>
                  <td style={{ minWidth: 130 }}>
                    {/* Umgedreht dargestellt: hier ist die hohe Zahl das
                        Problem, deshalb ist viel rot und wenig grün. */}
                    {errorRate === null ? (
                      <span className="cell--muted">–</span>
                    ) : (
                      <Meter
                        value={errorRate}
                        tone={errorRate >= 55 ? 'var(--danger)' : errorRate >= 30 ? 'var(--warning)' : 'var(--success)'}
                      />
                    )}
                  </td>
                  <td className="num">
                    {stat && stat.totalReports > 0 ? (
                      <span className={stat.openReports > 0 ? 'badge badge--open' : 'badge'}>
                        {stat.openReports > 0 ? `${stat.openReports} offen` : stat.totalReports}
                      </span>
                    ) : (
                      <span className="cell--muted">–</span>
                    )}
                  </td>
                  <td>
                    <span className={`dot ${question.image_url ? 'dot--on' : ''}`} title={question.image_url ? 'Bild vorhanden' : 'Bild fehlt'} />
                  </td>
                  <td>
                    <span className={`dot ${question.audio_url ? 'dot--on' : ''}`} title={question.audio_url ? 'Audio vorhanden' : 'Audio fehlt'} />
                  </td>
                  <td className="cell--muted">{new Date(question.updated_at).toLocaleDateString('de-DE')}</td>
                </tr>
              );
            })}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="cell--muted">
                  Keine Fragen für diese Filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="pagination" style={{ padding: '12px 18px' }}>
        <span>
          {result.total} Treffer · Seite {result.page} von {result.pageCount}
        </span>
        <div className="btn-row">
          {result.page > 1 ? (
            <Link className="btn btn--ghost btn--sm" href={pageHref(filters, result.page - 1)}>
              Zurück
            </Link>
          ) : null}
          {result.page < result.pageCount ? (
            <Link className="btn btn--ghost btn--sm" href={pageHref(filters, result.page + 1)}>
              Weiter
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
