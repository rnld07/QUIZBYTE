import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettingsStore } from '@/state/settingsStore';

function enabled(): boolean {
  return Platform.OS !== 'web' && useSettingsStore.getState().hapticsEnabled;
}

async function run(action: () => Promise<void>): Promise<void> {
  if (!enabled()) return;
  try {
    await action();
  } catch {
    // Haptics are best-effort; never surface errors to the user.
  }
}

/** Subtle, semantic haptic feedback. Respects the user's setting. */
export const haptics = {
  correct: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  wrong: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  levelUp: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  select: () => run(() => Haptics.selectionAsync()),
};
