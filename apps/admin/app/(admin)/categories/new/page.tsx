import { CategoryForm } from '@/components/CategoryForm';

export default function NewCategoryPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Neue Kategorie</h1>
        </div>
      </div>
      <CategoryForm category={null} />
    </>
  );
}
