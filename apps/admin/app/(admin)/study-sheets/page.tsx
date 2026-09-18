import { StudyFolderForm } from '@/components/StudyFolderForm';
import { StudySheetForm } from '@/components/StudySheetForm';
import {
  deleteStudyFolderAction,
  deleteStudySheetAction,
  moveStudySheetAction,
  toggleStudyFolderAction,
  toggleStudySheetAction,
} from '@/lib/actions/studySheets';
import { listCategories } from '@/lib/queries/categories';
import { listStudyFolders, listStudySheets } from '@/lib/queries/studySheets';

export const dynamic = 'force-dynamic';

export default async function StudySheetsPage() {
  const [sheets, folders, categories] = await Promise.all([listStudySheets(), listStudyFolders(), listCategories()]);
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const sheetsInFolder = new Map<string, number>();
  for (const sheet of sheets) {
    if (sheet.folder_id) sheetsInFolder.set(sheet.folder_id, (sheetsInFolder.get(sheet.folder_id) ?? 0) + 1);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Lernzettel</h1>
          <p>PDFs hochladen – die App zeigt sie als Bildstrecke mit Vorschau und bietet das PDF zum Speichern an.</p>
        </div>
      </div>

      <StudySheetForm
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        folders={folders.map((folder) => ({ id: folder.id, title: folder.title }))}
      />

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sortierung</th>
              <th>Vorschau</th>
              <th>Titel</th>
              <th>Ordner</th>
              <th>Kategorie</th>
              <th>Seiten</th>
              <th>Sichtbar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sheets.map((sheet) => (
              <tr key={sheet.id}>
                <td className="cell--muted">{sheet.sort_order}</td>
                <td>
                  {sheet.page_urls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote storage URL, no loader configured
                    <img src={sheet.page_urls[0]} alt="" className="sheet-thumb" />
                  ) : (
                    <span className="cell--muted">–</span>
                  )}
                </td>
                <td>
                  <a href={sheet.pdf_url} target="_blank" rel="noreferrer">
                    {sheet.title}
                  </a>
                  {sheet.description ? <p className="cell--muted">{sheet.description}</p> : null}
                </td>
                <td>
                  {/* Changing the folder is a one-field form that submits
                      itself – a sheet lands in the wrong folder often enough
                      that re-uploading it would be absurd. */}
                  <form
                    action={async (formData: FormData) => {
                      'use server';
                      const target = String(formData.get('folderId') ?? '');
                      await moveStudySheetAction(sheet.id, target || null);
                    }}
                  >
                    <select name="folderId" defaultValue={sheet.folder_id ?? ''} aria-label="Ordner">
                      <option value="">– ohne –</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.title}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn--ghost btn--sm">
                      Verschieben
                    </button>
                  </form>
                </td>
                <td className="cell--muted">{sheet.category_id ? (categoryName.get(sheet.category_id) ?? '–') : '–'}</td>
                <td className="cell--muted">{sheet.page_count}</td>
                <td>{sheet.is_published ? 'Ja' : 'Nein'}</td>
                <td className="cell--actions">
                  <form
                    action={async () => {
                      'use server';
                      await toggleStudySheetAction(sheet.id, !sheet.is_published);
                    }}
                  >
                    <button type="submit" className="btn btn--ghost btn--sm">
                      {sheet.is_published ? 'Ausblenden' : 'Einblenden'}
                    </button>
                  </form>
                  <form
                    action={async () => {
                      'use server';
                      await deleteStudySheetAction(sheet.id);
                    }}
                  >
                    <button type="submit" className="btn btn--ghost btn--sm">
                      Löschen
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {sheets.length === 0 ? (
              <tr>
                <td colSpan={8} className="cell--muted">
                  Noch keine Lernzettel hochgeladen.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="page-header">
        <div>
          <h2>Ordner</h2>
          <p>
            Fasst Lernzettel zusammen, die zusammengehören, aber nicht derselbe Lernzettel sind – Tastenkombinationen unter
            Windows und unter macOS etwa.
          </p>
        </div>
      </div>

      <StudyFolderForm />

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sortierung</th>
              <th>Name</th>
              <th>Lernzettel</th>
              <th>Sichtbar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {folders.map((folder) => (
              <tr key={folder.id}>
                <td className="cell--muted">{folder.sort_order}</td>
                <td>
                  {folder.title}
                  {folder.description ? <p className="cell--muted">{folder.description}</p> : null}
                </td>
                <td className="cell--muted">{sheetsInFolder.get(folder.id) ?? 0}</td>
                <td>{folder.is_published ? 'Ja' : 'Nein'}</td>
                <td className="cell--actions">
                  <form
                    action={async () => {
                      'use server';
                      await toggleStudyFolderAction(folder.id, !folder.is_published);
                    }}
                  >
                    <button type="submit" className="btn btn--ghost btn--sm">
                      {folder.is_published ? 'Ausblenden' : 'Einblenden'}
                    </button>
                  </form>
                  {/* Deleting is safe: the sheets stay and go back to standing
                      on their own in the app. */}
                  <form
                    action={async () => {
                      'use server';
                      await deleteStudyFolderAction(folder.id);
                    }}
                  >
                    <button type="submit" className="btn btn--ghost btn--sm">
                      Löschen
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {folders.length === 0 ? (
              <tr>
                <td colSpan={5} className="cell--muted">
                  Noch keine Ordner. Ohne Ordner steht jeder Lernzettel einzeln in der App.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
