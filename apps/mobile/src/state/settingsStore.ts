import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SettingsState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
}

/** User preferences, persisted on the device. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    {
      name: 'quizbyte.settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
