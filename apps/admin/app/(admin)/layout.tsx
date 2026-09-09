import type { ReactNode } from 'react';

import { Sidebar } from '@/components/Sidebar';
import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="shell">
      <Sidebar email={admin.email ?? admin.profile.username} />
      <main className="main">{children}</main>
    </div>
  );
}
