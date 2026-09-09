import { useCallback, useEffect, useState } from 'react';

import { analytics } from '@/services/analytics/analytics';
import { useSettingsStore } from '@/state/settingsStore';

import { questionAudio } from './questionAudio';
import type { QuestionAudioState } from './questionAudio';

/** Hook binding a question's audio_url to the shared player. */
export function useQuestionAudio(questionId: string, audioUrl: string | null) {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const [state, setState] = useState<QuestionAudioState>('idle');

  useEffect(() => {
    const unsubscribe = questionAudio.subscribe((next, url) => {
      setState(url === audioUrl ? next : 'idle');
    });
    return unsubscribe;
  }, [audioUrl]);

  // Stop any running audio when the question changes or the screen unmounts.
  useEffect(() => () => questionAudio.stop(), [questionId]);

  const toggle = useCallback(async () => {
    if (!audioUrl || !soundEnabled) return;
    const started = await questionAudio.toggle(audioUrl);
    if (started) analytics.track('question_audio_played', { questionId });
  }, [audioUrl, questionId, soundEnabled]);

  return {
    available: Boolean(audioUrl) && soundEnabled,
    state,
    toggle,
  };
}
