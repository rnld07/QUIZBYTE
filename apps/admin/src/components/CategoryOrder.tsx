'use client';

import { useActionState } from 'react';

import { EMPTY_ACTION_STATE, moveCategoryAction } from '@/lib/actions/controlCenter';

/**
 * Die beiden Pfeile, mit denen eine Kategorie ihren Platz tauscht.
 *
 * Getauscht wird, nicht neu nummeriert: die Reihenfolge ist das, was man in
 * der App sieht, und wer sie von Hand durchnummeriert, hat früher oder später
 * zwei Kategorien auf derselben Position.
 */
export function CategoryOrder({ categoryId, first, last }: { categoryId: string; first: boolean; last: boolean }) {
  const [state, action, pending] = useActionState(moveCategoryAction, EMPTY_ACTION_STATE);

  return (
    <form action={action} className="cell--actions">
      <input type="hidden" name="categoryId" value={categoryId} />
      <button
        className="btn btn--sm btn--ghost"
        type="submit"
        name="direction"
        value="up"
        disabled={pending || first}
        aria-label="Nach oben"
        title="Nach oben"
      >
        ↑
      </button>
      <button
        className="btn btn--sm btn--ghost"
        type="submit"
        name="direction"
        value="down"
        disabled={pending || last}
        aria-label="Nach unten"
        title="Nach unten"
      >
        ↓
      </button>
      {state.error ? <span className="report-actions__error">{state.error}</span> : null}
    </form>
  );
}
