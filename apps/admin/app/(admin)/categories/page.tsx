import Link from 'next/link';

import { listCategories } from '@/lib/queries/categories';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Kategorien</h1>
          <p>Reihenfolge, Sichtbarkeit und Pro-Kennzeichnung.</p>
        </div>
        <Link className="btn btn--primary" href="/categories/new">
          Neue Kategorie
        </Link>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sortierung</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Icon</th>
              <th>Veröffentlicht</th>
              <th>Aktiv</th>
              <th>Pro</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="cell--muted">{category.sort_order}</td>
                <td>
                  <Link href={`/categories/${category.id}`}>{category.name}</Link>
                  {category.description ? <div className="help">{category.description}</div> : null}
                </td>
                <td className="cell--muted">{category.slug}</td>
                <td className="cell--muted">{category.icon ?? '–'}</td>
                <td>{category.published_question_count}</td>
                <td>
                  <span className={`dot ${category.is_active ? 'dot--on' : ''}`} title={category.is_active ? 'aktiv' : 'inaktiv'} />
                </td>
                <td className="cell--muted">{category.requires_pro ? 'Pro' : '–'}</td>
              </tr>
            ))}
            {categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="cell--muted">
                  Noch keine Kategorien.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
