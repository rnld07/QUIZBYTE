import Link from 'next/link';

import { QuestionFilters } from '@/components/QuestionFilters';
import { QuestionTable } from '@/components/QuestionTable';
import { listCategories } from '@/lib/queries/categories';
import { listQuestions, parseQuestionFilters } from '@/lib/queries/questions';

export const dynamic = 'force-dynamic';

interface QuestionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const params = await searchParams;
  const filters = parseQuestionFilters(params);
  const [categories, result] = await Promise.all([listCategories(), listQuestions(filters)]);

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
      <QuestionTable result={result} filters={filters} />
    </>
  );
}
