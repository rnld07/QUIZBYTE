import { notFound } from 'next/navigation';

import { CategoryForm } from '@/components/CategoryForm';
import { getCategory } from '@/lib/queries/categories';

export const dynamic = 'force-dynamic';

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Kategorie bearbeiten</h1>
          <p>
            <code>{category.id}</code>
          </p>
        </div>
      </div>
      <CategoryForm category={category} />
    </>
  );
}
