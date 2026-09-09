import Link from 'next/link';
import type { Route } from 'next';

import type { QuestionFilters, QuestionListResult } from '@/lib/queries/questions';

import { DifficultyBadge, StatusBadge } from './StatusBadge';

interface QuestionTableProps {
  result: QuestionListResult;
  filters: QuestionFilters;
}

function pageHref(filters: QuestionFilters, page: number): Route {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' || value === '' || value === undefined) continue;
    params.set(key, String(value));
  }
  params.set('page', String(page));
  return `/questions?${params.toString()}` as Route;
}

export function QuestionTable({ result, filters }: QuestionTableProps) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Frage</th>
              <th>Kategorie</th>
              <th>Unterkategorie</th>
              <th>Schwierigkeit</th>
              <th>Status</th>
              <th>Audio</th>
              <th>Bild</th>
              <th>Geändert</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((question) => (
              <tr key={question.id}>
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
                <td>{question.categories?.name ?? '–'}</td>
                <td className="cell--muted">{question.subcategory ?? '–'}</td>
                <td>
                  <DifficultyBadge difficulty={question.difficulty} />
                </td>
                <td>
                  <StatusBadge status={question.status} />
                </td>
                <td>
                  <span className={`dot ${question.audio_url ? 'dot--on' : ''}`} title={question.audio_url ? 'Audio vorhanden' : 'Audio fehlt'} />
                </td>
                <td>
                  <span className={`dot ${question.image_url ? 'dot--on' : ''}`} title={question.image_url ? 'Bild vorhanden' : 'Bild fehlt'} />
                </td>
                <td className="cell--muted">{new Date(question.updated_at).toLocaleDateString('de-DE')}</td>
              </tr>
            ))}
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="cell--muted">
                  Keine Fragen für diese Filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          Seite {result.page} von {result.pageCount}
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
