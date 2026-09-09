'use client';

import Papa from 'papaparse';
import { useMemo, useState, useTransition } from 'react';

import { validateImportRows } from '@quizbyte/shared';
import type { ImportRowResult } from '@quizbyte/shared';

import { importQuestionsAction } from '@/lib/actions/import';
import type { ImportResult } from '@/lib/actions/import';

interface ImportWizardProps {
  categories: { id: string; name: string; slug: string }[];
}

const JSON_EXAMPLE = `[
  {
    "category": "Netzwerke",
    "subcategory": "OSI-Modell",
    "question": "Welche Schicht im OSI-Modell ist die Transportschicht?",
    "answers": ["Layer 2", "Layer 3", "Layer 4", "Layer 7"],
    "correctAnswer": 2,
    "explanation": "Die Transportschicht ist Layer 4.",
    "difficulty": "easy",
    "tags": ["OSI", "TCP", "Transport"]
  }
]`;

const CSV_COLUMNS = 'category,subcategory,question,answerA,answerB,answerC,answerD,correctAnswer,explanation,difficulty,tags';

/** Maps a CSV record (header row above) into the JSON import shape. */
function csvRecordToRow(record: Record<string, string>): unknown {
  const value = (key: string): string => (record[key] ?? '').trim();
  return {
    category: value('category'),
    subcategory: value('subcategory') || undefined,
    question: value('question'),
    answers: [value('answerA'), value('answerB'), value('answerC'), value('answerD')],
    correctAnswer: value('correctAnswer'),
    explanation: value('explanation'),
    difficulty: value('difficulty') || undefined,
    tags: value('tags')
      ? value('tags')
          .split(/[|;]/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
  };
}

function parseInput(text: string, format: 'json' | 'csv'): { rows: unknown[]; error: string | null } {
  if (!text.trim()) return { rows: [], error: null };
  if (format === 'json') {
    try {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) return { rows: [], error: 'JSON muss ein Array von Fragen sein.' };
      return { rows: parsed, error: null };
    } catch {
      return { rows: [], error: 'Ungültiges JSON.' };
    }
  }
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    return { rows: [], error: `CSV-Fehler: ${result.errors[0]?.message ?? 'unbekannt'}` };
  }
  return { rows: result.data.map(csvRecordToRow), error: null };
}

export function ImportWizard({ categories }: ImportWizardProps) {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = useMemo(() => parseInput(text, format), [text, format]);
  const validated: ImportRowResult[] = useMemo(() => validateImportRows(parsed.rows), [parsed.rows]);
  const categoryKeys = useMemo(
    () => new Set(categories.flatMap((category) => [category.name.toLowerCase(), category.slug.toLowerCase()])),
    [categories],
  );

  const preview = validated.map((row) => {
    const unknownCategory = row.ok && row.question ? !categoryKeys.has(row.question.category.toLowerCase()) : false;
    return { ...row, unknownCategory };
  });
  const validCount = preview.filter((row) => row.ok && !row.unknownCategory).length;
  const invalidCount = preview.length - validCount;

  const onFile = async (file: File | null) => {
    if (!file) return;
    setText(await file.text());
    if (file.name.toLowerCase().endsWith('.csv')) setFormat('csv');
    if (file.name.toLowerCase().endsWith('.json')) setFormat('json');
  };

  const runImport = () => {
    setResult(null);
    const rows = preview.filter((row) => row.ok && !row.unknownCategory).map((row) => parsed.rows[row.index]);
    startTransition(async () => {
      const outcome = await importQuestionsAction(rows);
      setResult(outcome);
      if (outcome.error === null) setText('');
    });
  };

  return (
    <div className="grid grid--2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <button type="button" className={`btn btn--sm ${format === 'json' ? 'btn--primary' : ''}`} onClick={() => setFormat('json')}>
            JSON
          </button>
          <button type="button" className={`btn btn--sm ${format === 'csv' ? 'btn--primary' : ''}`} onClick={() => setFormat('csv')}>
            CSV
          </button>
          <input type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => void onFile(event.target.files?.[0] ?? null)} />
        </div>
        <textarea
          className="textarea"
          style={{ minHeight: 320, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={format === 'json' ? JSON_EXAMPLE : `${CSV_COLUMNS}\nNetzwerke,OSI-Modell,"Welche Schicht …",Layer 2,Layer 3,Layer 4,Layer 7,C,"Die Transportschicht ist Layer 4.",easy,osi|tcp`}
        />
        <p className="help" style={{ marginTop: 8 }}>
          {format === 'json'
            ? 'Array von Objekten mit category, subcategory, question, answers[4], correctAnswer (0–3 oder A–D), explanation, difficulty, tags.'
            : `Kopfzeile: ${CSV_COLUMNS}. Tags mit | trennen.`}
        </p>
        <p className="help">Bekannte Kategorien: {categories.map((category) => category.name).join(', ') || '–'}</p>
      </div>

      <div className="card">
        <h2>Vorschau</h2>
        {parsed.error ? <div className="error">{parsed.error}</div> : null}
        {result ? (
          result.error ? (
            <div className="error">{result.error}</div>
          ) : (
            <div className="success">
              {result.inserted} Fragen importiert (Status: Review).
              {result.failed.length > 0 ? ` ${result.failed.length} Zeilen übersprungen.` : ''}
            </div>
          )
        ) : null}
        {preview.length === 0 ? (
          <p className="help">Noch keine Daten.</p>
        ) : (
          <>
            <p>
              {validCount} gültig · {invalidCount} fehlerhaft
            </p>
            <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Frage</th>
                    <th>Kategorie</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.index}>
                      <td className="cell--muted">{row.index + 1}</td>
                      <td className="cell--truncate">{row.question?.questionText ?? <em>ungültig</em>}</td>
                      <td>{row.question?.category ?? '–'}</td>
                      <td>
                        {!row.ok ? (
                          <span className="badge badge--archived" title={row.issues.map((issue) => `${issue.field}: ${issue.message}`).join('\n')}>
                            Fehler
                          </span>
                        ) : row.unknownCategory ? (
                          <span className="badge badge--review">Kategorie unbekannt</span>
                        ) : (
                          <span className="badge badge--published">OK</span>
                        )}
                        {!row.ok ? (
                          <ul className="issue-list help">
                            {row.issues.map((issue) => (
                              <li key={`${issue.field}-${issue.message}`}>
                                {issue.field}: {issue.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn--primary" disabled={validCount === 0 || pending} onClick={runImport}>
                {pending ? 'Importiere…' : `${validCount} Fragen importieren`}
              </button>
              {invalidCount > 0 ? <span className="help">Fehlerhafte Zeilen werden nicht importiert.</span> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
