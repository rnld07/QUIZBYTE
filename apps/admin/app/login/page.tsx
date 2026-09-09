import { LoginForm } from '@/components/LoginForm';

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hint = params.error === 'forbidden' ? 'Dieses Konto hat keine Admin-Berechtigung.' : null;

  return (
    <main className="login">
      <div className="card">
        <h1>QuizByte Admin</h1>
        <p className="help" style={{ marginBottom: 16 }}>
          Anmeldung nur für Administratoren.
        </p>
        <LoginForm hint={hint} />
      </div>
    </main>
  );
}
