import { useMutation } from '@tanstack/react-query';

import { reportQuestion } from '@/services/api/questionsApi';
import type { ReportReason } from '@/services/api/questionsApi';
import { useAuthStore } from '@/state/authStore';

export interface ReportQuestionVariables {
  questionId: string;
  reason: ReportReason;
  details: string;
}

/** Sends a report for one question. Nothing is cached – reports are write-only here. */
export function useReportQuestion() {
  const userId = useAuthStore((state) => state.userId);

  return useMutation({
    mutationFn: (variables: ReportQuestionVariables) => reportQuestion({ userId: userId as string, ...variables }),
  });
}
