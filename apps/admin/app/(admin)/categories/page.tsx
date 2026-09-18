import Link from 'next/link';

import { CategoryOrder } from '@/components/CategoryOrder';
import { Empty, Meter } from '@/components/Ui';
import { listCategories } from '@/lib/queries/categories';
import { getCategoryStats } from '@/lib/queries/insights';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('de-DE');

/**
 * Die Kategorien.
 *
 * Neben Name und Sichtbarkeit steht jetzt, was dahinter liegt: wie viele
 * Fragen es gibt, wie gut sie beantwortet werden und wo Bilder fehlen. Eine
 * aktive Kategorie ohne veröffentlichte Frage ist in der App ein leeres Feld –
 * und genau das sieht man hier sonst nirgends.
 */
export default async function CategoriesPage() {
  const [categories, stats] = await Promise.all([listCategories(), getCategoryStats()]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Kategorien</h1>
          <p>Reihenfolge, Sichtbarkeit und wie sie laufen.</p>
        </div>
        <Link className="btn btn--primary" href="/categories/new">
          Neue Kategorie
        </Link>
      </div>

      {categories.length === 0 ? (
        <Empty
          title="Noch keine Kategorien"
          hint="Ohne Kategorie gibt es keine Frage – das ist der erste Schritt."
          action={
            <Link className="btn btn--primary btn--sm" href="/categories/new">
              Neue Kategorie
            </Link>
          }
        />
      ) : (
        <div className="card card--flush table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reihenfolge</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Icon</th>
                <th className="num">Fragen</th>
                <th>Trefferquote</th>
                <th className="num">Antworten</th>
                <th>Medien</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => {
                const stat = stats.get(category.id);
                const emptyActive = category.is_active && category.published_question_count === 0;
                return (
                  <tr key={category.id} className={emptyActive ? 'row--flag' : ''}>
                    <td>
                      <CategoryOrder categoryId={category.id} first={index === 0} last={index === categories.length - 1} />
                    </td>
                    <td>
                      <Link href={`/categories/${category.id}`} className="cell--strong">
                        {category.name}
                      </Link>
                      {category.description ? <span className="cell--sub">{category.description}</span> : null}
                    </td>
                    <td className="cell--muted">{category.slug}</td>
                    <td className="cell--muted">
                      {category.icon ?? '–'}
                      {category.accent_color ? (
                        <span
                          className="dot"
                          style={{ background: category.accent_color, marginLeft: 6 }}
                          title={category.accent_color}
                        />
                      ) : null}
                    </td>
                    <td className="num">
                      {category.published_question_count}
                      {stat && stat.questionsTotal > category.published_question_count ? (
                        <span className="cell--sub">von {stat.questionsTotal}</span>
                      ) : null}
                    </td>
                    <td style={{ minWidth: 130 }}>
                      {stat && stat.attempts > 0 ? <Meter value={stat.accuracy} /> : <span className="cell--muted">–</span>}
                    </td>
                    <td className="num cell--muted">
                      {stat ? nf.format(stat.attempts) : '–'}
                      {stat && stat.players > 0 ? <span className="cell--sub">{stat.players} Spieler</span> : null}
                    </td>
                    <td className="cell--muted">
                      {stat && (stat.questionsMissingImage > 0 || stat.questionsMissingAudio > 0) ? (
                        <>
                          {stat.questionsMissingImage > 0 ? (
                            <Link href={`/questions?category=${category.id}&image=missing`}>
                              {stat.questionsMissingImage} ohne Bild
                            </Link>
                          ) : null}
                          {stat.questionsMissingImage > 0 && stat.questionsMissingAudio > 0 ? <br /> : null}
                          {stat.questionsMissingAudio > 0 ? (
                            <Link href={`/questions?category=${category.id}&audio=missing`}>
                              {stat.questionsMissingAudio} ohne Audio
                            </Link>
                          ) : null}
                        </>
                      ) : (
                        'vollständig'
                      )}
                    </td>
                    <td>
                      {category.is_active ? (
                        <span className="badge badge--ok">aktiv</span>
                      ) : (
                        <span className="badge badge--off">inaktiv</span>
                      )}
                      {category.requires_pro ? <span className="badge badge--admin"> Pro</span> : null}
                      {emptyActive ? <span className="cell--sub">aktiv, aber ohne Frage</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint" style={{ marginTop: 12 }}>
        Kategorien werden nicht gelöscht, sondern deaktiviert – zu jeder hängen Fragen und Antworten, und die
        wären mit ihr weg. Die Sichtbarkeit steht in der Kategorie selbst.
      </p>
    </>
  );
}
