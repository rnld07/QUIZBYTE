import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioStatus } from 'expo-audio';

import { logger } from '@/services/errors';

export type QuestionAudioState = 'idle' | 'loading' | 'playing';

type Listener = (state: QuestionAudioState, url: string | null) => void;

/**
 * Single shared player for pre-generated question audio.
 *
 * - only one stream at a time (tapping again toggles play/stop)
 * - never blocks answering – playback is fire-and-forget
 * - `stop()` is called when the question changes
 */
class QuestionAudioService {
  private player: AudioPlayer | null = null;
  private currentUrl: string | null = null;
  private state: QuestionAudioState = 'idle';
  private listeners = new Set<Listener>();
  private subscription: { remove: () => void } | null = null;
  private modeConfigured = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.currentUrl);
    return () => this.listeners.delete(listener);
  }

  getState(): QuestionAudioState {
    return this.state;
  }

  /** Toggle playback for the given URL. Returns true when playback started. */
  async toggle(url: string): Promise<boolean> {
    if (this.currentUrl === url && this.state !== 'idle') {
      this.stop();
      return false;
    }
    await this.play(url);
    return true;
  }

  async play(url: string): Promise<void> {
    try {
      await this.ensureAudioMode();
      this.stop();
      this.currentUrl = url;
      this.setState('loading');

      const player = createAudioPlayer({ uri: url }, { updateInterval: 500 });
      this.player = player;
      this.subscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (this.player !== player) return;
        if (status.didJustFinish) {
          this.stop();
          return;
        }
        if (status.playing && this.state !== 'playing') this.setState('playing');
      });
      player.play();
    } catch (error) {
      logger.warn('question audio failed', error);
      this.stop();
    }
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch {
        // player may already be released
      }
    }
    this.player = null;
    this.currentUrl = null;
    this.setState('idle');
  }

  private async ensureAudioMode(): Promise<void> {
    if (this.modeConfigured) return;
    this.modeConfigured = true;
    // Respect the system volume, but play even when the ringer switch is muted:
    // the user explicitly tapped to hear the question.
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
  }

  private setState(state: QuestionAudioState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state, this.currentUrl);
  }
}

export const questionAudio = new QuestionAudioService();
