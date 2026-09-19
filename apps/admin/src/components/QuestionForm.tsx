'use client';

import { useActionState, useState } from 'react';

import type { Tables } from '@quizbyte/database';
import { Constants } from '@quizbyte/database';

import { saveQuestionAction } from '@/lib/actions/questions';
import { uploadQuestionMedia } from '@/lib/media/questionMedia';
import type { MediaKind } from '@/lib/media/mediaLimits';
import type { QuestionActionState, QuestionIntent } from '@/lib/actions/questions';
import type { CategoryOverviewRow } from '@/lib/queries/categories';

import { DIFFICULTY_LABELS } from './StatusBadge';

interface QuestionFormProps {
  question: Tables<'questions'> | null;
  categories: CategoryOverviewRow[];
}

const initialState: QuestionActionState = { error: null, issues: [], savedAt: null };

const ANSWER_FIELDS = [
  { key: 'A', name: 'answerA', column: 'answer_a' },
  { key: 'B', name: 'answerB', column: 'answer_b' },
  { key: 'C', name: 'answerC', column: 'answer_c' },
  { key: 'D', name: 'answerD', column: 'answer_d' },
] as const;

/** Die beiden Dateifelder: hochladen im Browser, Adresse ins Formular. */
function useMediaFields(question: Tables<'questions'> | null) {
  const [image, setImage] = useState<MediaFieldState>({ url: question?.image_url ?? '', error: null, pending: false });
  const [audio, setAudio] = useState<MediaFieldState>({ url: question?.audio_url ?? '', error: null, pending: false });

  const setState = (kind: MediaKind, next: MediaFieldState) => (kind === 'image' ? setImage(next) : setAudio(next));

  return {
    image,
    audio,
    setUrl: (kind: MediaKind, url: string) => setState(kind, { url, error: null, pending: false }),
    upload: async (kind: MediaKind, file: File | null) => {
      if (!file) return;
      setState(kind, { url: kind === 'image' ? image.url : audio.url, error: null, pending: true });
      const uploaded = await uploadQuestionMedia(kind, file);
      setState(kind, {
        url: uploaded.url ?? (kind === 'image' ? image.url : audio.url),
        error: uploaded.error,
        pending: false,
      });
    },
  };
}

interface MediaFieldState {
  url: string;
  error: string | null;
  pending: boolean;
}

export function QuestionForm({ question, categories }: QuestionFormProps) {
  const action = saveQuestionAction.bind(null, question?.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const media = useMediaFields(question);
  const issueFor = (field: string): string | undefined => state.issues.find((issue) => issue.field === field)?.message;
  const status = question?.status ?? 'draft';

  const intentButton = (intent: QuestionIntent, label: string, className: string) => (
    <button type="submit" name="intent" value={intent} className={`btn ${className}`} disabled={pending}>
      {label}
    </button>
  );

  return (
    <form action={formAction} className="card">
      {state.error ? (
        <div className="error">
          {state.error}
          {state.issues.length > 0 ? (
            <ul className="issue-list">
              {state.issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>
                  {issue.field}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {state.savedAt ? <div className="success">Gespeichert.</div> : null}

      <input type="hidden" name="currentStatus" value={status} />

      <div className="field">
        <label htmlFor="questionText">Frage</label>
        <textarea id="questionText" name="questionText" className="textarea" defaultValue={question?.question_text ?? ''} required />
        {issueFor('questionText') ? <span className="help" style={{ color: 'var(--danger)' }}>{issueFor('questionText')}</span> : null}
      </div>

      <div className="answers-grid">
        {ANSWER_FIELDS.map((answer) => (
          <div className="field" key={answer.key}>
            <label htmlFor={answer.name}>Antwort {answer.key}</label>
            <input id={answer.name} name={answer.name} className="input" defaultValue={question?.[answer.column] ?? ''} />
          </div>
        ))}
      </div>

      <div className="grid grid--2">
        <div className="field">
          <label htmlFor="correctAnswer">Richtige Antwort</label>
          <select id="correctAnswer" name="correctAnswer" className="select" defaultValue={question?.correct_answer ?? 'A'}>
            {Constants.public.Enums.answer_key.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="difficulty">Schwierigkeit</label>
          <select id="difficulty" name="difficulty" className="select" defaultValue={question?.difficulty ?? 'medium'}>
            {Constants.public.Enums.difficulty_level.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {DIFFICULTY_LABELS[difficulty]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="explanation">Erklärung</label>
        <textarea id="explanation" name="explanation" className="textarea" defaultValue={question?.explanation ?? ''} />
        <span className="help">Wird nach der Antwort angezeigt – zentraler Teil der Lernfunktion.</span>
      </div>

      <div className="grid grid--2">
        <div className="field">
          <label htmlFor="categoryId">Kategorie</label>
          <select id="categoryId" name="categoryId" className="select" defaultValue={question?.category_id ?? ''} required>
            <option value="">Bitte wählen</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="subcategory">Unterkategorie</label>
          <input id="subcategory" name="subcategory" className="input" defaultValue={question?.subcategory ?? ''} placeholder="z. B. OSI-Modell" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input id="tags" name="tags" className="input" defaultValue={question?.tags.join(', ') ?? ''} placeholder="tcp, layer 4, transport" />
        <span className="help">Kommagetrennt, werden klein geschrieben gespeichert.</span>
      </div>

      {/*
        Hochgeladen wird direkt in den Bucket, nicht durch das Formular.

        Eine neue Frage hat noch keine Id – frueher ritten die Dateien deshalb
        im Formular mit und wurden nach dem Anlegen hochgeladen, durch eine
        Server-Action mit einem Rumpflimit von einem Megabyte. Ein Bild darf
        fuenf haben. Jetzt laedt der Browser die Datei, sobald sie gewaehlt ist,
        und traegt die Adresse in das Feld darunter ein – vor dem Speichern und
        unabhaengig davon, ob die Frage schon existiert.
      */}
      <div className="grid grid--2">
        <div className="field">
          <label htmlFor="imageUrl">Bild (1:1)</label>
          <input
            id="imageFile"
            type="file"
            className="input"
            accept="image/png,image/jpeg,image/webp"
            disabled={media.image.pending}
            onChange={(event) => void media.upload('image', event.target.files?.[0] ?? null)}
          />
          <input
            id="imageUrl"
            name="imageUrl"
            className="input"
            value={media.image.url}
            onChange={(event) => media.setUrl('image', event.target.value)}
            placeholder="https://…"
          />
          <p className="help">
            {media.image.pending ? 'Wird hochgeladen…' : 'PNG, JPG oder WEBP, bis 5 MB. Optional.'}
          </p>
          {media.image.error ? <p className="error">{media.image.error}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="audioUrl">Audio</label>
          <input
            id="audioFile"
            type="file"
            className="input"
            accept="audio/mpeg,audio/mp4,audio/aac,audio/wav"
            disabled={media.audio.pending}
            onChange={(event) => void media.upload('audio', event.target.files?.[0] ?? null)}
          />
          <input
            id="audioUrl"
            name="audioUrl"
            className="input"
            value={media.audio.url}
            onChange={(event) => media.setUrl('audio', event.target.value)}
            placeholder="https://…"
          />
          <p className="help">
            {media.audio.pending
              ? 'Wird hochgeladen…'
              : 'MP3, M4A, AAC oder WAV, bis 10 MB. Optional – lässt sich später auch generieren.'}
          </p>
          {media.audio.error ? <p className="error">{media.audio.error}</p> : null}
        </div>
      </div>

      <div className="field field--inline">
        <input id="requiresPro" name="requiresPro" type="checkbox" defaultChecked={question?.requires_pro ?? false} />
        <label htmlFor="requiresPro">Pro erforderlich</label>
      </div>

      <div className="field field--inline">
        <input id="duelPool" name="duelPool" type="checkbox" defaultChecked={question?.duel_pool ?? false} />
        <label htmlFor="duelPool">Nur für Duelle</label>
        <p className="help">
          Kommt in keiner Solo-Runde vor – auch nicht im Tagesquiz, im Training oder als geteilte Frage. Nur so bleibt
          ihre Lösung bis zur Abgabe beim Server. Der Schutz greift, sobald genug Fragen so markiert sind.
        </p>
      </div>

      <div className="btn-row" style={{ marginTop: 8 }}>
        {intentButton('save', 'Speichern', 'btn--primary')}
        {status !== 'draft' ? intentButton('draft', 'Als Entwurf', '') : null}
        {status !== 'review' ? intentButton('review', 'Zum Review', '') : null}
        {status !== 'published' ? intentButton('publish', 'Veröffentlichen', 'btn--success') : null}
        {question && status !== 'archived' ? intentButton('archive', 'Archivieren', 'btn--danger') : null}
      </div>
    </form>
  );
}
