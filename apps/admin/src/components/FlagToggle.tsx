'use client';

import { useActionState } from 'react';

import { EMPTY_ACTION_STATE, setFeatureFlagAction } from '@/lib/actions/controlCenter';

interface FlagToggleProps {
  flagKey: string;
  /** Was in `features.ts` steht – die Voreinstellung. */
  fallback: boolean;
  /** Was in der Datenbank steht, oder null wenn dort nichts liegt. */
  override: boolean | null;
}

/**
 * Drei Zustände statt zwei: an, aus, oder "wie im Code".
 *
 * Ohne den dritten wäre der erste Klick unumkehrbar – eine einmal gesetzte
 * Zeile hätte für immer Vorrang, auch wenn `features.ts` längst etwas anderes
 * sagt. Der Weg zurück gehört zum Schalter dazu.
 */
export function FlagToggle({ flagKey, fallback, override }: FlagToggleProps) {
  const [state, action, pending] = useActionState(setFeatureFlagAction, EMPTY_ACTION_STATE);
  const effective = override ?? fallback;

  return (
    <div className="flag-row__actions">
      <span className={`badge ${effective ? 'badge--ok' : 'badge--off'}`}>{effective ? 'an' : 'aus'}</span>

      <form action={action} className="btn-row">
        <input type="hidden" name="key" value={flagKey} />
        <button
          className={`btn btn--sm ${override === true ? 'btn--primary' : 'btn--ghost'}`}
          type="submit"
          name="value"
          value="on"
          disabled={pending}
        >
          An
        </button>
        <button
          className={`btn btn--sm ${override === false ? 'btn--primary' : 'btn--ghost'}`}
          type="submit"
          name="value"
          value="off"
          disabled={pending}
        >
          Aus
        </button>
        <button
          className={`btn btn--sm ${override === null ? 'btn--primary' : 'btn--ghost'}`}
          type="submit"
          name="value"
          value="default"
          disabled={pending}
          title={`Im Code: ${fallback ? 'an' : 'aus'}`}
        >
          Standard
        </button>
      </form>

      {state.error ? <span className="report-actions__error">{state.error}</span> : null}
    </div>
  );
}
