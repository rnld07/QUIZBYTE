import { describe, expect, it } from 'vitest';

import { buildStudyShelf, splitStudyShelf, studyShelfItemCount } from './shelf';

const folder = (id: string) => ({ id });
const sheet = (id: string, folderId: string | null = null) => ({ id, folderId });

describe('buildStudyShelf', () => {
  it('leaves sheets without a folder on their own', () => {
    const shelf = buildStudyShelf([], [sheet('a'), sheet('b')]);

    expect(shelf).toEqual([
      { kind: 'sheet', sheet: sheet('a') },
      { kind: 'sheet', sheet: sheet('b') },
    ]);
  });

  it('collects the sheets of a folder into one entry', () => {
    const shortcuts = folder('f1');
    const shelf = buildStudyShelf([shortcuts], [sheet('win', 'f1'), sheet('mac', 'f1')]);

    expect(shelf).toEqual([{ kind: 'folder', folder: shortcuts, sheets: [sheet('win', 'f1'), sheet('mac', 'f1')] }]);
  });

  it('puts the folder where its first sheet was', () => {
    const shelf = buildStudyShelf([folder('f1')], [sheet('loose'), sheet('win', 'f1'), sheet('after'), sheet('mac', 'f1')]);

    expect(shelf.map((item) => (item.kind === 'folder' ? item.folder.id : item.sheet.id))).toEqual(['loose', 'f1', 'after']);
  });

  it('shows a sheet on its own when its folder is not in the list', () => {
    const shelf = buildStudyShelf([], [sheet('win', 'missing')]);

    expect(shelf).toEqual([{ kind: 'sheet', sheet: sheet('win', 'missing') }]);
  });

  it('drops a folder that has no sheets', () => {
    expect(buildStudyShelf([folder('empty')], [])).toEqual([]);
  });

  it('counts what an entry stands for', () => {
    const shelf = buildStudyShelf([folder('f1')], [sheet('win', 'f1'), sheet('mac', 'f1'), sheet('loose')]);

    expect(shelf.map(studyShelfItemCount)).toEqual([2, 1]);
  });
});

describe('splitStudyShelf', () => {
  const topic = (id: string, categoryId: string | null, folderId: string | null = null) => ({ id, folderId, categoryId });

  it('sorts sheets by whether they sit on a quiz topic', () => {
    const sections = splitStudyShelf(buildStudyShelf([], [topic('netze', 'cat-1'), topic('cheatsheet', null)]));

    expect(sections.categories.map((item) => (item.kind === 'sheet' ? item.sheet.id : ''))).toEqual(['netze']);
    expect(sections.extra.map((item) => (item.kind === 'sheet' ? item.sheet.id : ''))).toEqual(['cheatsheet']);
  });

  it('keeps a folder whole and follows its sheets', () => {
    const sections = splitStudyShelf(buildStudyShelf([folder('f1')], [topic('win', null, 'f1'), topic('mac', 'cat-1', 'f1')]));

    expect(sections.categories).toHaveLength(1);
    expect(sections.extra).toHaveLength(0);
  });

  it('treats a sheet without the field as extra', () => {
    const sections = splitStudyShelf(buildStudyShelf([], [sheet('loose')]));

    expect(sections.extra).toHaveLength(1);
  });
});
