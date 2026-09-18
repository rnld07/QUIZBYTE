import { useState } from 'react';

import { useReportUser } from '@/features/friends/useModeration';
import type { UserReportReason } from '@/services/api/moderationApi';
import { getUserMessage } from '@/services/errors';

import { ReportSheet } from './ReportSheet';
import type { ReportOption } from './ReportSheet';

const REASONS: ReportOption<UserReportReason>[] = [
  { value: 'username', label: 'Unangemessener Name', hint: 'Der Benutzername ist beleidigend oder anstößig.' },
  { value: 'spam', label: 'Spam', hint: 'Schickt Werbung oder immer wieder dasselbe.' },
  { value: 'harassment', label: 'Belästigung', hint: 'Beleidigt, bedroht oder lässt nicht in Ruhe.' },
  { value: 'cheating', label: 'Betrug', hint: 'Verschafft sich unfair Punkte oder Siege.' },
  { value: 'other', label: 'Etwas anderes', hint: 'Beschreibe es unten kurz.' },
];

interface ReportUserDialogProps {
  visible: boolean;
  userId: string;
  username: string;
  onClose: () => void;
}

/**
 * Report form for another player.
 *
 * The same sheet as reporting a question. Nothing of this reaches the person
 * reported – no notice, no change to their account, nothing they could read
 * back – which is what makes it safe to use.
 */
export function ReportUserDialog({ visible, userId, username, onClose }: ReportUserDialogProps) {
  const report = useReportUser();
  const [sent, setSent] = useState(false);

  return (
    <ReportSheet
      visible={visible}
      eyebrow={`@${username}`.toUpperCase()}
      title="Nutzer melden"
      question="WAS IST DAS PROBLEM?"
      options={REASONS}
      placeholder="Was ist vorgefallen?"
      doneTitle="Danke für deine Meldung"
      doneText="Wir sehen uns das an. Der andere erfährt nicht, dass du gemeldet hast."
      pending={report.isPending}
      error={report.isError ? getUserMessage(report.error) : null}
      sent={sent}
      onSubmit={(reason, details) =>
        report.mutate({ reportedId: userId, reason, details }, { onSuccess: () => setSent(true) })
      }
      onClose={onClose}
    />
  );
}
