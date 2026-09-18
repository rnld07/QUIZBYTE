'use client';

import { useActionState } from 'react';

import type { Enums } from '@quizbyte/database';

import {
  EMPTY_MODERATION_STATE,
  resetUsernameAction,
  saveReportNoteAction,
  setQuestionReportStatusAction,
  setReportStatusAction,
  suspendUserAction,
  unsuspendUserAction,
} from '@/lib/actions/moderation';

interface ReportActionsProps {
  reportId: string;
  kind: 'user' | 'question';
  status: Enums<'report_status'>;
  note: string;
  /** Nur bei Nutzermeldungen: die Person, gegen die es geht. */
  reportedId?: string;
  reportedUsername?: string;
  isSuspended?: boolean;
}

/**
 * Was sich mit einer Meldung tun lässt.
 *
 * Drei Statusknöpfe, ein Notizfeld, und bei Nutzermeldungen zusätzlich die
 * beiden Eingriffe. Jeder Knopf ist ein eigenes Formular mit einer Server-
 * Action dahinter – kein Client-Zustand, der mit der Datenbank in Takt
 * gehalten werden müsste, und ein Fehlschlag meldet sich an der Meldung, zu
 * der er gehört.
 *
 * "In Prüfung" steht bewusst zwischen offen und erledigt: eine Meldung, an der
 * jemand sitzt, sah vorher aus wie eine, die niemand angefasst hat.
 */
export function ReportActions({
  reportId,
  kind,
  status,
  note,
  reportedId,
  reportedUsername,
  isSuspended = false,
}: ReportActionsProps) {
  const statusFn = kind === 'question' ? setQuestionReportStatusAction : setReportStatusAction;
  const [statusState, statusAction, statusPending] = useActionState(statusFn, EMPTY_MODERATION_STATE);
  const [noteState, noteAction, notePending] = useActionState(saveReportNoteAction, EMPTY_MODERATION_STATE);
  const [nameState, nameAction, namePending] = useActionState(resetUsernameAction, EMPTY_MODERATION_STATE);
  const [suspendState, suspendAction, suspendPending] = useActionState(suspendUserAction, EMPTY_MODERATION_STATE);
  const [unsuspendState, unsuspendAction, unsuspendPending] = useActionState(unsuspendUserAction, EMPTY_MODERATION_STATE);

  const error = statusState.error ?? noteState.error ?? nameState.error ?? suspendState.error ?? unsuspendState.error;
  const done = statusState.message ?? noteState.message ?? nameState.message ?? suspendState.message ?? unsuspendState.message;

  return (
    <div className="report__actions">
      <form action={statusAction}>
        <input type="hidden" name="reportId" value={reportId} />
        {status !== 'in_review' && status !== 'reviewed' ? (
          <button className="btn btn--sm" type="submit" name="status" value="in_review" disabled={statusPending}>
            In Prüfung
          </button>
        ) : null}
        {status !== 'reviewed' ? (
          <button className="btn btn--sm btn--success" type="submit" name="status" value="reviewed" disabled={statusPending}>
            Erledigt
          </button>
        ) : null}
        {status !== 'rejected' && status !== 'reviewed' ? (
          <button className="btn btn--sm btn--ghost" type="submit" name="status" value="rejected" disabled={statusPending}>
            Ablehnen
          </button>
        ) : null}
        {status !== 'open' ? (
          <button className="btn btn--sm btn--ghost" type="submit" name="status" value="open" disabled={statusPending}>
            Wieder öffnen
          </button>
        ) : null}
      </form>

      {/* Die Notiz ändert den Status nicht: sie ist oft der erste Schritt, und
          ein Speichern, das die Meldung gleich schließt, schreibt niemand. */}
      <form action={noteAction}>
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="currentStatus" value={status} />
        <input className="input" name="note" defaultValue={note} placeholder="Admin-Notiz" maxLength={500} />
        <button className="btn btn--sm btn--ghost" type="submit" disabled={notePending}>
          Notiz
        </button>
      </form>

      {/* Der häufigste Fall bei „Benutzername" als Grund: nicht sperren,
          sondern den Namen neutral zurücksetzen. */}
      {kind === 'user' && reportedId ? (
        <form action={nameAction}>
          <input type="hidden" name="userId" value={reportedId} />
          <button className="btn btn--sm" type="submit" disabled={namePending}>
            Namen zurücksetzen
          </button>
        </form>
      ) : null}

      {kind === 'user' && reportedId ? (
        isSuspended ? (
          <form action={unsuspendAction}>
            <input type="hidden" name="userId" value={reportedId} />
            <button className="btn btn--sm" type="submit" disabled={unsuspendPending}>
              Entsperren
            </button>
          </form>
        ) : (
          <form action={suspendAction}>
            <input type="hidden" name="userId" value={reportedId} />
            {/* Der Grund steht auf der Wand, die die Person danach sieht – ein
                Satz ist dafür angemessener als ein Kürzel. */}
            <input className="input" name="reason" placeholder={`Grund für die Sperre von @${reportedUsername}`} maxLength={500} />
            <button className="btn btn--sm btn--danger" type="submit" disabled={suspendPending}>
              Sperren
            </button>
          </form>
        )
      ) : null}

      {error ? <p className="report-actions__error">{error}</p> : null}
      {done ? <p className="report-actions__done">{done}</p> : null}
    </div>
  );
}
