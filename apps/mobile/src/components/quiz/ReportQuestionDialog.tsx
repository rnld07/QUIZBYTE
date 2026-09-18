import { useState } from 'react';

import type { QuizQuestion } from '@quizbyte/shared';

import { ReportSheet } from '@/components/moderation/ReportSheet';
import type { ReportOption } from '@/components/moderation/ReportSheet';
import { useReportQuestion } from '@/features/quiz/useReportQuestion';
import type { ReportReason } from '@/services/api/questionsApi';
import { getUserMessage } from '@/services/errors';

const REASONS: ReportOption<ReportReason>[] = [
  { value: 'wrong_answer', label: 'Antwort ist falsch', hint: 'Die als richtig markierte Antwort stimmt nicht.' },
  { value: 'wrong_question', label: 'Frage ist fehlerhaft', hint: 'Die Frage selbst ist inhaltlich falsch.' },
  { value: 'outdated', label: 'Nicht mehr aktuell', hint: 'Der Inhalt ist veraltet.' },
  { value: 'unclear', label: 'Unklar gestellt', hint: 'Die Frage lässt mehrere Antworten zu.' },
  { value: 'typo', label: 'Rechtschreibfehler', hint: 'Ein Tipp- oder Grammatikfehler.' },
  { value: 'other', label: 'Etwas anderes', hint: 'Beschreibe es unten kurz.' },
];

interface ReportQuestionDialogProps {
  visible: boolean;
  question: QuizQuestion;
  onClose: () => void;
}

/**
 * Report form for the question currently on screen.
 *
 * The form itself is `ReportSheet`, shared with reporting a player; this only
 * says what is being reported and what the reasons are. Mounted only while open
 * (see the quiz screen), so every visit starts with an empty form.
 */
export function ReportQuestionDialog({ visible, question, onClose }: ReportQuestionDialogProps) {
  const report = useReportQuestion();
  const [sent, setSent] = useState(false);

  return (
    <ReportSheet
      visible={visible}
      eyebrow={question.categoryName.toUpperCase()}
      title="Frage melden"
      subject={question.questionText}
      question="WAS STIMMT NICHT?"
      options={REASONS}
      placeholder="Was ist dir aufgefallen?"
      doneTitle="Danke für deine Meldung"
      doneText="Wir sehen uns die Frage an. Du kannst das Quiz einfach weiterspielen."
      pending={report.isPending}
      error={report.isError ? getUserMessage(report.error) : null}
      sent={sent}
      onSubmit={(reason, details) =>
        report.mutate({ questionId: question.id, reason, details }, { onSuccess: () => setSent(true) })
      }
      onClose={onClose}
    />
  );
}
