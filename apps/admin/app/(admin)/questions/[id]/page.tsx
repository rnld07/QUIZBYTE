import { notFound } from 'next/navigation';

import { MediaPanel } from '@/components/MediaPanel';
import { QuestionForm } from '@/components/QuestionForm';
import { StatusBadge } from '@/components/StatusBadge';
import { listCategories } from '@/lib/queries/categories';
import { getQuestion } from '@/lib/queries/questions';

export const dynamic = 'force-dynamic';

interface EditQuestionPageProps {
  searchParams: Promise<{ media?: string }>;
  params: Promise<{ id: string }>;
}

export default async function EditQuestionPage({ params, searchParams }: EditQuestionPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const [question, categories] = await Promise.all([getQuestion(id), listCategories()]);
  if (!question) notFound();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Frage bearbeiten</h1>
          <p>
            <StatusBadge status={question.status} /> · zuletzt geändert {new Date(question.updated_at).toLocaleString('de-DE')} ·{' '}
            <code>{question.id}</code>
          </p>
        </div>
      </div>
      {/* The question was created, only its file did not make it up. */}
      {query.media === 'failed' ? (
        <div className="error">Die Frage wurde gespeichert, die Datei konnte aber nicht hochgeladen werden. Versuch es rechts noch einmal.</div>
      ) : null}

      <div className="form-layout">
        <QuestionForm question={question} categories={categories} />
        {/* key resets local upload state whenever the server delivers new media URLs */}
        <MediaPanel
          key={`${question.image_url ?? ''}|${question.audio_url ?? ''}`}
          questionId={question.id}
          imageUrl={question.image_url}
          audioUrl={question.audio_url}
        />
      </div>
    </>
  );
}
