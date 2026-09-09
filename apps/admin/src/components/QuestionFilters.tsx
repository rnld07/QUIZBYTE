import Link from 'next/link';

import { Constants } from '@quizbyte/database';

import type { CategoryOverviewRow } from '@/lib/queries/categories';
import type { QuestionFilters as Filters } from '@/lib/queries/questions';

import { DIFFICULTY_LABELS, STATUS_LABELS } from './StatusBadge';

interface QuestionFiltersProps {
  filters: Filters;
  categories: CategoryOverviewRow[];
}

/** GET form – filters live in the URL so they are shareable and survive reloads. */
export function QuestionFilters({ filters, categories }: QuestionFiltersProps) {
  return (
    <form method="get" className="card filters">
      <div className="field filters--wide">
        <label htmlFor="q">Suche</label>
        <input id="q" name="q" className="input" defaultValue={filters.q} placeholder="Frage, Unterkategorie, Erklärung…" />
      </div>
      <div className="field">
        <label htmlFor="category">Kategorie</label>
        <select id="category" name="category" className="select" defaultValue={filters.category}>
          <option value="">Alle</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" className="select" defaultValue={filters.status}>
          <option value="">Alle</option>
          {Constants.public.Enums.question_status.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="difficulty">Schwierigkeit</label>
        <select id="difficulty" name="difficulty" className="select" defaultValue={filters.difficulty}>
          <option value="">Alle</option>
          {Constants.public.Enums.difficulty_level.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {DIFFICULTY_LABELS[difficulty]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="audio">Audio</label>
        <select id="audio" name="audio" className="select" defaultValue={filters.audio}>
          <option value="">Egal</option>
          <option value="missing">fehlt</option>
          <option value="present">vorhanden</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="image">Bild</label>
        <select id="image" name="image" className="select" defaultValue={filters.image}>
          <option value="">Egal</option>
          <option value="missing">fehlt</option>
          <option value="present">vorhanden</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="pro">Pro</label>
        <select id="pro" name="pro" className="select" defaultValue={filters.pro}>
          <option value="">Egal</option>
          <option value="yes">nur Pro</option>
          <option value="no">nur frei</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="tag">Tag</label>
        <input id="tag" name="tag" className="input" defaultValue={filters.tag} placeholder="z. B. tcp" />
      </div>
      <div className="btn-row">
        <button type="submit" className="btn btn--primary">
          Filtern
        </button>
        <Link className="btn btn--ghost" href="/questions">
          Zurücksetzen
        </Link>
      </div>
    </form>
  );
}
