import Link from 'next/link';

import { QuestionFilters } from '@/components/QuestionFilters';
import { QuestionTable } from '@/components/QuestionTable';
import { listCategories } from '@/lib/queries/categories';
import { getQuestionIdsBySignal, getQuestionStats } from '@/lib/queries/insights';
import { listQuestions, parseQuestionFilters } from '@/lib/queries/questions';

export const dynamic = 'force-dynamic';

interface QuestionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Die Fragenverwaltung.
 *
 * In drei Schritten geladen, und die Reihenfolge ist Absicht: erst die Filter,
 * dann die Seite, dann die Statistik zu genau diesen fünfundzwanzig Zeilen.
 * Die Antwortzahlen für den ganzen Bestand zu aggregieren wäre für jede Seite
 * dieselbe Arbeit, und man sieht immer nur eine.
 */
export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const params = await searchParams;
  const filters = parseQuestionFilters(params);

  const signalIds = filters.signal ? await getQuestionIdsBySignal(filters.signal) : undefined;
  const [categories, result] = await Promise.all([listCategories(), listQuestions(filters, signalIds)]);
  const stats = await getQuestionStats(result.rows.map((row) => row.id));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Fragen</h1>
          <p>{result.total} Fragen gefunden.</p>
        </div>
        <Link className="btn btn--primary" href="/questions/new">
          Neue Frage
        </Link>
      </div>

      <QuestionFilters filters={filters} categories={categories} />
      <QuestionTable result={result} filters={filters} stats={stats} />
    </>
  );
}
