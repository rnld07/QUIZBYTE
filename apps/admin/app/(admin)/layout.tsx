import type { ReactNode } from 'react';

import { Sidebar } from '@/components/Sidebar';
import { requireAdmin } from '@/lib/auth';
import { getDashboardKpis } from '@/lib/queries/dashboard';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  /*
    Die Zahl offener Meldungen steht am Menüpunkt und wird deshalb im Layout
    geladen. Wenn das schiefgeht, ist das kein Grund, das ganze Panel nicht zu
    zeigen – dann steht eben keine Zahl daran.
  */
  let openReports = 0;
  try {
    const kpis = await getDashboardKpis();
    openReports = kpis.openUserReports + kpis.openQuestionReports;
  } catch {
    openReports = 0;
  }

  return (
    <div className="shell">
      <Sidebar email={admin.email ?? admin.profile.username} openReports={openReports} />
      <main className="main">{children}</main>
    </div>
  );
}
