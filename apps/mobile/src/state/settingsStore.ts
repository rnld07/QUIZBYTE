import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { normalizeDifficulties } from '@quizbyte/shared';
import type { Difficulty } from '@quizbyte/shared';

import type { ThemeMode } from '@/theme/ThemeProvider';

export interface SettingsState {
  /**
   * Plays a question's audio the moment it appears, without tapping.
   *
   * Off by default: sound that starts on its own is the kind of thing you want
   * to ask for. Tapping the question always reads it out, whatever this says.
   */
  autoPlayAudio: boolean;
  hapticsEnabled: boolean;
  /** Light, dark, or whatever the device is set to. */
  themeMode: ThemeMode;
  /** Levels a quiz may draw from; empty means all of them. */
  difficulties: Difficulty[];
  /** Rounds draw unanswered questions first while this is on. */
  onlyNewQuestions: boolean;
  /**
   * Frames whose unlock has been seen on the home screen.
   *
   * `null` means the app has not looked yet: whatever is unlocked at that
   * moment was earned before the announcements existed, and is taken as read.
   * Without that distinction an existing player would be greeted by a stack of
   * cards for ranks they have worn for weeks.
   *
   * On the device rather than on the server: it is about a card that has been
   * read, not about anything the account owns.
   */
  seenFrames: string[] | null;
  /**
   * Shows the animated companion on the main tabs.
   *
   * On by default, off in one tap: it is the only thing in the app that moves
   * without being asked to, and that is exactly the kind of thing some people
   * want gone.
   */
  companionEnabled: boolean;
  setAutoPlayAudio: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setDifficulties: (value: readonly Difficulty[]) => void;
  setThemeMode: (value: ThemeMode) => void;
  setOnlyNewQuestions: (value: boolean) => void;
  setCompanionEnabled: (value: boolean) => void;
  /** Marks an unlock as read, so the home screen stops announcing it. */
  markFrameSeen: (id: string) => void;
  /** Takes everything already unlocked as read – the one-time baseline. */
  markFramesSeen: (ids: readonly string[]) => void;
}

/** User preferences, persisted on the device. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoPlayAudio: false,
      hapticsEnabled: true,
      difficulties: [],
      themeMode: 'dark',
      onlyNewQuestions: true,
      seenFrames: null,
      companionEnabled: true,
      setAutoPlayAudio: (autoPlayAudio) => set({ autoPlayAudio }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setDifficulties: (value) => set({ difficulties: normalizeDifficulties(value) }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setOnlyNewQuestions: (onlyNewQuestions) => set({ onlyNewQuestions }),
      setCompanionEnabled: (companionEnabled) => set({ companionEnabled }),
      markFrameSeen: (id) =>
        set((state) => (state.seenFrames?.includes(id) ? state : { seenFrames: [...(state.seenFrames ?? []), id] })),
      markFramesSeen: (ids) => set((state) => ({ seenFrames: [...new Set([...(state.seenFrames ?? []), ...ids])] })),
    }),
    {
      name: 'quizbyte.settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      /**
       * v0 stored a single `difficulty` string (`all` | one level).
       *
       * v1 had `soundEnabled`, which decided whether audio could play at all.
       * It is gone: tapping a question always reads it out now, and the setting
       * that replaces it only decides whether that happens by itself. Everyone
       * starts with it off rather than inheriting a `true` that meant something
       * else.
       */
      migrate: (persisted, version) => {
        const previous = persisted as Partial<SettingsState> & { difficulty?: string; soundEnabled?: boolean };
        const { difficulty, soundEnabled, ...rest } = previous;

        return {
          ...rest,
          difficulties:
            version >= 1
              ? (previous.difficulties ?? [])
              : difficulty && difficulty !== 'all'
                ? normalizeDifficulties([difficulty])
                : [],
          autoPlayAudio: false,
          // v3 added the list of unlocks already seen. Null on the way in, so
          // the first look takes whatever is unlocked as read.
          seenFrames: previous.seenFrames ?? null,
          // v4 added the companion. Everyone meets it once and can send it away.
          companionEnabled: previous.companionEnabled ?? true,
        } as SettingsState;
      },
    },
  ),
);
