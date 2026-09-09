import Link from 'next/link';

import { StatCard } from '@/components/StatCard';
import { getDashboardStats } from '@/lib/queries/stats';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Überblick über Inhalte und Nutzung.</p>
        </div>
        <div className="btn-row">
          <Link className="btn btn--primary" href="/questions/new">
            Neue Frage
          </Link>
          <Link className="btn" href="/import">
            Import
          </Link>
        </div>
      </div>

      <div className="grid grid--stats" style={{ marginBottom: 18 }}>
        <StatCard label="Fragen gesamt" value={stats.questionsTotal} />
        <StatCard label="Veröffentlicht" value={stats.questionsPublished} />
        <StatCard label="Entwürfe" value={stats.questionsDraft} />
        <StatCard label="Im Review" value={stats.questionsReview} href="/questions?status=review" />
        <StatCard label="Archiviert" value={stats.questionsArchived} />
        <StatCard label="Kategorien" value={`${stats.categoriesActive} / ${stats.categoriesTotal}`} hint="aktiv / gesamt" />
      </div>

      <div className="grid grid--stats">
        <StatCard label="Audio fehlt" value={stats.questionsMissingAudio} href="/questions?audio=missing" />
        <StatCard label="Bild fehlt" value={stats.questionsMissingImage} href="/questions?image=missing" />
        <StatCard label="Nutzer" value={stats.usersTotal} />
        <StatCard label="Beantwortete Fragen" value={stats.attemptsTotal} />
      </div>
    </>
  );
}
