import { QuestionForm } from '@/components/QuestionForm';
import { listCategories } from '@/lib/queries/categories';

export const dynamic = 'force-dynamic';

export default async function NewQuestionPage() {
  const categories = await listCategories();
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Neue Frage</h1>
          <p>Wird als Entwurf angelegt, bis du sie veröffentlichst.</p>
        </div>
      </div>
      <QuestionForm question={null} categories={categories} />
    </>
  );
}
