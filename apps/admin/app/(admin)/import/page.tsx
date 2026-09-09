import { ImportWizard } from '@/components/ImportWizard';
import { listCategories } from '@/lib/queries/categories';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const categories = await listCategories();
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Bulk-Import</h1>
          <p>JSON oder CSV einfügen, prüfen, importieren. Importierte Fragen landen im Status „Review“.</p>
        </div>
      </div>
      <ImportWizard categories={categories.map((category) => ({ id: category.id, name: category.name, slug: category.slug }))} />
    </>
  );
}
