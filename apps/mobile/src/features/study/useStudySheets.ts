import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { buildStudyShelf, splitStudyShelf } from '@quizbyte/shared';
import type { StudyShelfItem } from '@quizbyte/shared';

import { queryKeys } from '@/services/api/queryKeys';
import { fetchStudyFolders, fetchStudySheets } from '@/services/api/studySheetsApi';
import type { StudyFolder, StudySheet } from '@/services/api/studySheetsApi';
import { useAuthStore } from '@/state/authStore';

export type StudyShelfEntry = StudyShelfItem<StudyFolder, StudySheet>;

/**
 * The study sheets, and the shelf they form.
 *
 * Held for a good while: sheets change when an admin uploads one, which is rare,
 * and the pages behind them are images the device caches anyway.
 *
 * Sheets and folders are two queries rather than one join – the folders are a
 * short list that hardly ever changes, and keeping them apart means a screen
 * that only needs the sheets is not waiting on both.
 */
export function useStudySheets() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const [sheetQuery, folderQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.studySheets, queryFn: fetchStudySheets, enabled: ready, staleTime: 10 * 60 * 1000 },
      { queryKey: queryKeys.studyFolders, queryFn: fetchStudyFolders, enabled: ready, staleTime: 10 * 60 * 1000 },
    ],
  });

  const sheets = useMemo(() => sheetQuery.data ?? [], [sheetQuery.data]);
  const folders = useMemo(() => folderQuery.data ?? [], [folderQuery.data]);
  const shelf = useMemo(() => buildStudyShelf(folders, sheets), [folders, sheets]);
  // Kategorien vs. Extra – the split the full list is grouped by.
  const sections = useMemo(() => splitStudyShelf(shelf), [shelf]);

  return {
    sheets,
    folders,
    shelf,
    sections,
    isLoading: sheetQuery.isLoading || folderQuery.isLoading,
    isError: sheetQuery.isError || folderQuery.isError,
    error: sheetQuery.error ?? folderQuery.error,
    refetch: async () => {
      await Promise.all([sheetQuery.refetch(), folderQuery.refetch()]);
    },
  };
}

/** One folder with its sheets, or null while loading or when it is gone. */
export function useStudyFolder(folderId: string | undefined) {
  const study = useStudySheets();

  const entry = useMemo(
    () => study.shelf.find((item): item is Extract<StudyShelfEntry, { kind: 'folder' }> => item.kind === 'folder' && item.folder.id === folderId),
    [study.shelf, folderId],
  );

  return { ...study, folder: entry?.folder ?? null, sheets: entry?.sheets ?? [] };
}
