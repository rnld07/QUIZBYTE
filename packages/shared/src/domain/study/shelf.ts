/**
 * Minimum a folder has to look like to be arranged on the shelf.
 *
 * Deliberately just the id: everything the folder is called or looks like is
 * the caller's business, and this way the shelf works with whatever shape the
 * app and the admin panel each carry around.
 */
export interface StudyFolderLike {
  id: string;
}

/** Minimum a sheet has to look like: which folder it belongs to, if any. */
export interface StudySheetLike {
  id: string;
  folderId: string | null;
  /** The quiz topic it belongs to, or null when it is extra material. */
  categoryId?: string | null;
}

/**
 * One entry on the shelf: either a sheet on its own, or a folder with the
 * sheets inside it.
 */
export type StudyShelfItem<Folder extends StudyFolderLike, Sheet extends StudySheetLike> =
  | { kind: 'sheet'; sheet: Sheet }
  | { kind: 'folder'; folder: Folder; sheets: Sheet[] };

/**
 * Arranges sheets and folders into the shelf the app shows.
 *
 * The sheets arrive in the order the admin gave them, and that order is kept:
 * a folder takes the place of the first of its sheets, so moving a sheet up
 * moves its folder up. The alternative – all folders first – would make the
 * sort order mean two different things depending on whether a sheet sits in a
 * folder.
 *
 * A folder whose sheets are all unpublished never appears; there would be
 * nothing behind it. A sheet pointing at a folder that is not in the list (an
 * unpublished one, say) is shown on its own rather than hidden with it – a
 * published sheet should stay reachable.
 */
export function buildStudyShelf<Folder extends StudyFolderLike, Sheet extends StudySheetLike>(
  folders: Folder[],
  sheets: Sheet[],
): StudyShelfItem<Folder, Sheet>[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const grouped = new Map<string, Sheet[]>();
  const items: StudyShelfItem<Folder, Sheet>[] = [];

  for (const sheet of sheets) {
    const folder = sheet.folderId === null ? undefined : byId.get(sheet.folderId);
    if (!folder) {
      items.push({ kind: 'sheet', sheet });
      continue;
    }

    const existing = grouped.get(folder.id);
    if (existing) {
      existing.push(sheet);
      continue;
    }

    // First sheet of this folder: the folder claims this spot, and the array
    // pushed here is the same one later sheets are appended to.
    const collected = [sheet];
    grouped.set(folder.id, collected);
    items.push({ kind: 'folder', folder, sheets: collected });
  }

  return items;
}

/** How many sheets an entry stands for – 1 for a single sheet. */
export function studyShelfItemCount<Folder extends StudyFolderLike, Sheet extends StudySheetLike>(
  item: StudyShelfItem<Folder, Sheet>,
): number {
  return item.kind === 'folder' ? item.sheets.length : 1;
}

/** The shelf split in two: sheets that belong to a quiz topic, and the rest. */
export interface StudyShelfSections<Folder extends StudyFolderLike, Sheet extends StudySheetLike> {
  /** Sheets sitting on one of the home screen's topics. */
  categories: StudyShelfItem<Folder, Sheet>[];
  /** Everything else – material that stands on its own. */
  extra: StudyShelfItem<Folder, Sheet>[];
}

/**
 * Sorts the shelf into "Kategorien" and "Extra".
 *
 * A sheet with a category is one of the topics you can also be quizzed on, and
 * that link is what the two sections are about – only those sheets carry the
 * "Abfragen" button. Everything without one is extra material.
 *
 * A folder follows its sheets: one sheet with a category is enough to put it
 * under Kategorien, because that is where a reader would look for it. Mixing
 * the two inside one folder is the admin's call, not something to split apart
 * here – a folder is shown whole or not at all.
 */
export function splitStudyShelf<Folder extends StudyFolderLike, Sheet extends StudySheetLike>(
  items: StudyShelfItem<Folder, Sheet>[],
): StudyShelfSections<Folder, Sheet> {
  const categories: StudyShelfItem<Folder, Sheet>[] = [];
  const extra: StudyShelfItem<Folder, Sheet>[] = [];

  for (const item of items) {
    const sheets = item.kind === 'folder' ? item.sheets : [item.sheet];
    if (sheets.some((sheet) => sheet.categoryId !== null && sheet.categoryId !== undefined)) {
      categories.push(item);
    } else {
      extra.push(item);
    }
  }

  return { categories, extra };
}
