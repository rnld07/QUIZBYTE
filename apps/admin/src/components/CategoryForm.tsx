'use client';

import { useActionState } from 'react';

import type { Tables } from '@quizbyte/database';

import { saveCategoryAction } from '@/lib/actions/categories';
import type { CategoryActionState } from '@/lib/actions/categories';

const initialState: CategoryActionState = { error: null };

export function CategoryForm({ category }: { category: Tables<'categories'> | null }) {
  const action = saveCategoryAction.bind(null, category?.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card" style={{ maxWidth: 640 }}>
      {state.error ? <div className="error">{state.error}</div> : null}
      <div className="grid grid--2">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" className="input" defaultValue={category?.name ?? ''} required />
        </div>
        <div className="field">
          <label htmlFor="slug">Slug</label>
          <input id="slug" name="slug" className="input" defaultValue={category?.slug ?? ''} placeholder="wird aus dem Namen erzeugt" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Beschreibung</label>
        <input id="description" name="description" className="input" defaultValue={category?.description ?? ''} />
      </div>
      <div className="grid grid--2">
        <div className="field">
          <label htmlFor="icon">Icon (Ionicons-Name)</label>
          <input id="icon" name="icon" className="input" defaultValue={category?.icon ?? ''} placeholder="z. B. shield-checkmark" />
        </div>
        <div className="field">
          <label htmlFor="accentColor">Akzentfarbe</label>
          <input id="accentColor" name="accentColor" className="input" defaultValue={category?.accent_color ?? ''} placeholder="#3B82F6" />
        </div>
      </div>
      <div className="grid grid--2">
        <div className="field">
          <label htmlFor="sortOrder">Sortierung</label>
          <input id="sortOrder" name="sortOrder" type="number" className="input" defaultValue={category?.sort_order ?? 0} />
        </div>
        <div>
          <div className="field field--inline">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked={category?.is_active ?? true} />
            <label htmlFor="isActive">Aktiv</label>
          </div>
          <div className="field field--inline">
            <input id="requiresPro" name="requiresPro" type="checkbox" defaultChecked={category?.requires_pro ?? false} />
            <label htmlFor="requiresPro">Pro erforderlich</label>
          </div>
        </div>
      </div>
      <div className="btn-row">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          Speichern
        </button>
      </div>
    </form>
  );
}
