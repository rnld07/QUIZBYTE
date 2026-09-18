'use client';

import { useActionState, useRef } from 'react';

import { createStudyFolderAction } from '@/lib/actions/studySheets';
import type { StudySheetActionState } from '@/lib/actions/studySheets';

const INITIAL: StudySheetActionState = { error: null, ok: false };

/**
 * Creates a folder for study sheets that belong together.
 *
 * A folder holds nothing of its own – no file, no pages. It is a title that
 * several sheets point at, which is why this is one short form rather than the
 * upload apparatus next to it.
 */
export function StudyFolderForm() {
  const [state, formAction, pending] = useActionState(createStudyFolderAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        // Emptied straight away: the next folder has nothing in common with
        // this one, unlike an upload where the fields are worth keeping.
        formRef.current?.reset();
      }}
      className="card"
    >
      <div className="field">
        <label htmlFor="folder-title">Ordnername</label>
        <input id="folder-title" name="title" required minLength={3} maxLength={120} placeholder="z. B. Tastenkombinationen" />
        <p className="hint">
          Ein Ordner fasst mehrere Lernzettel zusammen – etwa je einen für Windows und für macOS. In der App liegen sie als
          Stapel übereinander; angetippt kann man auswählen, welchen man öffnet.
        </p>
      </div>

      <div className="answers-grid">
        <div className="field">
          <label htmlFor="folder-description">Beschreibung (optional)</label>
          <input id="folder-description" name="description" maxLength={500} placeholder="Worum geht es in diesem Ordner?" />
        </div>

        <div className="field">
          <label htmlFor="folder-order">Sortierung</label>
          <input id="folder-order" name="sortOrder" type="number" defaultValue={0} />
        </div>
      </div>

      {state.error ? <p className="error">{state.error}</p> : null}
      {state.ok ? <p className="success">Ordner angelegt.</p> : null}

      <button type="submit" className="btn" disabled={pending}>
        {pending ? 'Wird angelegt …' : 'Ordner anlegen'}
      </button>
    </form>
  );
}
