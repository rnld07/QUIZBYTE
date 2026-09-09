import { Share } from 'react-native';

import { buildQuestionShareText } from '@quizbyte/shared';
import type { QuizQuestion } from '@quizbyte/shared';

import { analytics } from '@/services/analytics/analytics';
import { logger } from '@/services/errors';

/**
 * Opens the native share sheet with the question text (without the answer).
 * Deep links are prepared in `buildQuestionDeepLink` and can be appended once
 * universal links are configured.
 */
export async function shareQuestion(question: QuizQuestion): Promise<void> {
  const message = buildQuestionShareText(question);
  try {
    const result = await Share.share({ message });
    if (result.action === Share.sharedAction) {
      analytics.track('question_shared', { questionId: question.id });
    }
  } catch (error) {
    logger.warn('share failed', error);
  }
}
