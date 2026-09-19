'use client';

import { useActionState } from 'react';

import type { Tables } from '@quizbyte/database';
import { Constants } from '@quizbyte/database';

import { saveQuestionAction } from '@/lib/actions/questions';
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

export function QuestionForm({ question, categories }: QuestionFormProps) {
  const action = saveQuestionAction.bind(null, question?.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
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
        A new question has no id yet, so the media panel beside the form cannot
        exist. The files ride along with the form instead and are uploaded right
        after the question is created.
      */}
      {question === null ? (
        <div className="grid grid--2">
          <div className="field">
            <label htmlFor="imageFile">Bild (1:1)</label>
            <input id="imageFile" name="imageFile" type="file" className="input" accept="image/png,image/jpeg,image/webp" />
            <p className="help">PNG, JPG oder WEBP, bis 5 MB. Optional.</p>
            {issueFor('imageFile') ? <p className="error">{issueFor('imageFile')}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="audioFile">Audio</label>
            <input id="audioFile" name="audioFile" type="file" className="input" accept="audio/mpeg,audio/mp4,audio/aac,audio/wav" />
            <p className="help">MP3, M4A, AAC oder WAV, bis 10 MB. Optional – lässt sich später auch generieren.</p>
            {issueFor('audioFile') ? <p className="error">{issueFor('audioFile')}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid--2">
        <div className="field">
          <label htmlFor="imageUrl">Bild-URL</label>
          <input id="imageUrl" name="imageUrl" className="input" defaultValue={question?.image_url ?? ''} placeholder="https://…" />
          <p className="help">Wird beim Hochladen automatisch gesetzt.</p>
        </div>
        <div className="field">
          <label htmlFor="audioUrl">Audio-URL</label>
          <input id="audioUrl" name="audioUrl" className="input" defaultValue={question?.audio_url ?? ''} placeholder="https://…" />
          <p className="help">Wird beim Hochladen automatisch gesetzt.</p>
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
