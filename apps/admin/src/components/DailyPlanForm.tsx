'use client';

import { useActionState } from 'react';

import { EMPTY_ACTION_STATE, setDailyPlanAction } from '@/lib/actions/controlCenter';

interface DailyPlanFormProps {
  day: string;
  /** Die aktuell geplanten Ids, eine je Zeile – leer heißt "automatisch". */
  questionIds: string[];
  note: string;
}

/**
 * Der Plan für einen Tag.
 *
 * Die Fragen kommen als Ids in ein Textfeld. Das ist roh, aber es passt zum
 * Weg, den man ohnehin geht: in der Fragenliste suchen, filtern, Id kopieren.
 * Ein Auswahldialog über alle Fragen wäre eine zweite, schlechtere Suche.
 *
 * Ein leeres Feld gibt den Tag wieder frei – dann wählt wieder der Tages-Hash,
 * und das Tagesquiz fällt nicht aus, nur weil hier jemand etwas gelöscht hat.
 */
export function DailyPlanForm({ day, questionIds, note }: DailyPlanFormProps) {
  const [state, action, pending] = useActionState(setDailyPlanAction, EMPTY_ACTION_STATE);

  return (
    <form action={action} className="card">
      <input type="hidden" name="day" value={day} />

      <div className="field">
        <label htmlFor={`ids-${day}`}>Frage-Ids · eine je Zeile</label>
        <textarea
          id={`ids-${day}`}
          name="questionIds"
          className="textarea"
          defaultValue={questionIds.join('\n')}
          placeholder="Leer lassen für die automatische Auswahl"
          spellCheck={false}
        />
        <p className="help">
          Nur veröffentlichte Fragen. Die Reihenfolge hier ist die Reihenfolge im Quiz. Höchstens 50.
        </p>
      </div>

      <div className="field">
        <label htmlFor={`note-${day}`}>Notiz</label>
        <input id={`note-${day}`} name="note" className="input" defaultValue={note} maxLength={200} placeholder="z. B. Prüfungsvorbereitung AP1" />
      </div>

      {state.error ? <p className="error">{state.error}</p> : null}
      {state.message ? <p className="success">{state.message}</p> : null}

      <button className="btn btn--primary" type="submit" disabled={pending}>
        {pending ? 'Wird gespeichert …' : 'Plan speichern'}
      </button>
    </form>
  );
}
