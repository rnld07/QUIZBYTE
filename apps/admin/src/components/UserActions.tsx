'use client';

import { useActionState } from 'react';

import {
  EMPTY_MODERATION_STATE,
  resetUsernameAction,
  suspendUserAction,
  unsuspendUserAction,
} from '@/lib/actions/moderation';

interface UserActionsProps {
  userId: string;
  username: string;
  isSuspended: boolean;
  /** Kompakt für die Tabelle, ausführlich für die Detailseite. */
  compact?: boolean;
}

/**
 * Sperren, entsperren, Namen zurücksetzen.
 *
 * Ein Formular je Knopf: so braucht keiner der drei einen gemeinsamen
 * Client-Zustand, und ein Fehlschlag meldet sich dort, wo der Knopf steht,
 * statt irgendwo oben auf der Seite.
 *
 * Der Grund für eine Sperre ist ein Textfeld und keine Auswahl: die gesperrte
 * Person bekommt ihn zu lesen, und "Verstoß gegen die Regeln" beantwortet
 * niemandem die Frage, warum.
 */
export function UserActions({ userId, username, isSuspended, compact = false }: UserActionsProps) {
  const [nameState, nameAction, namePending] = useActionState(resetUsernameAction, EMPTY_MODERATION_STATE);
  const [suspendState, suspendAction, suspendPending] = useActionState(suspendUserAction, EMPTY_MODERATION_STATE);
  const [unsuspendState, unsuspendAction, unsuspendPending] = useActionState(unsuspendUserAction, EMPTY_MODERATION_STATE);

  const error = nameState.error ?? suspendState.error ?? unsuspendState.error;
  const done = nameState.message ?? suspendState.message ?? unsuspendState.message;
  const size = compact ? 'btn btn--sm' : 'btn';

  return (
    <div className="report-actions">
      <form action={nameAction}>
        <input type="hidden" name="userId" value={userId} />
        <button className={size} type="submit" disabled={namePending}>
          Name zurücksetzen
        </button>
      </form>

      {isSuspended ? (
        <form action={unsuspendAction}>
          <input type="hidden" name="userId" value={userId} />
          <button className={size} type="submit" disabled={unsuspendPending}>
            Entsperren
          </button>
        </form>
      ) : (
        <form action={suspendAction} className="report-actions__suspend">
          <input type="hidden" name="userId" value={userId} />
          <input className="input" name="reason" placeholder={`Grund für die Sperre von @${username}`} maxLength={500} />
          <button className={`${size} btn--danger`} type="submit" disabled={suspendPending}>
            Sperren
          </button>
        </form>
      )}

      {error ? <p className="report-actions__error">{error}</p> : null}
      {done ? <p className="report-actions__done">{done}</p> : null}
    </div>
  );
}
