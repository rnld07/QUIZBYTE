import { useCallback, useEffect, useState } from 'react';

import { analytics } from '@/services/analytics/analytics';
import { useSettingsStore } from '@/state/settingsStore';

import { questionAudio } from './questionAudio';
import type { QuestionAudioState } from './questionAudio';

/**
 * Binds a question's audio_url to the shared player.
 *
 * `enabled` is what keeps a preview quiet. The chat draws whole question cards
 * as miniatures, and with "Sound automatisch abspielen" on, opening the chat
 * read a question aloud that nobody had opened – several of them, in fact,
 * each stopping the last.
 */
export function useQuestionAudio(questionId: string, audioUrl: string | null, enabled = true) {
  const autoPlay = useSettingsStore((state) => state.autoPlayAudio);
  const [state, setState] = useState<QuestionAudioState>('idle');

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = questionAudio.subscribe((next, url) => {
      setState(url === audioUrl ? next : 'idle');
    });
    return unsubscribe;
  }, [audioUrl, enabled]);

  // Stop any running audio when the question changes or the screen unmounts.
  // Not from a preview: a list of them unmounting would silence the player a
  // real question owns.
  useEffect(() => {
    if (!enabled) return;
    return () => questionAudio.stop();
  }, [enabled, questionId]);

  /**
   * Reads the question out by itself when the setting asks for it.
   *
   * `play`, not `toggle`: a toggle would stop the audio again if this ever ran
   * twice for the same question.
   */
  useEffect(() => {
    if (!enabled || !autoPlay || !audioUrl) return;
    void questionAudio.play(audioUrl);
    analytics.track('question_audio_played', { questionId });
  }, [autoPlay, audioUrl, enabled, questionId]);

  const toggle = useCallback(async () => {
    if (!enabled || !audioUrl) return;
    const started = await questionAudio.toggle(audioUrl);
    if (started) analytics.track('question_audio_played', { questionId });
  }, [audioUrl, enabled, questionId]);

  return {
    /** The only thing that can stop a tap now is a question without audio. */
    available: enabled && Boolean(audioUrl),
    state,
    toggle,
  };
}
