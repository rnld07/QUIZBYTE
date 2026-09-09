'use client';

import { useActionState } from 'react';

import { signInAction } from '@/lib/actions/auth';
import type { AuthActionState } from '@/lib/actions/auth';

const initialState: AuthActionState = { error: null };

export function LoginForm({ hint }: { hint: string | null }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const error = state.error ?? hint;

  return (
    <form action={formAction}>
      {error ? <div className="error">{error}</div> : null}
      <div className="field">
        <label htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Passwort</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn--primary" disabled={pending} style={{ width: '100%' }}>
        {pending ? 'Anmelden…' : 'Anmelden'}
      </button>
    </form>
  );
}
