import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useProfile } from '@/features/profile/useProfile';
import { companionPlacement, glanceState } from '@/features/companion/placements';
import { noteCompanionInteraction, useCompanionStore } from '@/state/companionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { makeStyles } from '@/theme';

import { AvatarCompanion } from './AvatarCompanion';

/**
 * The companion, on top of the tabs.
 *
 * Mounted once beside the tab navigator rather than inside each tab: switching
 * tabs moves the animal, it does not build a new one, so a blink that started
 * on the progress tab finishes on the friends tab. Everything below it stays
 * reachable – the layer never takes a touch.
 *
 * A tab with no placement simply shows nothing, which is how the running quiz
 * stays free of it: nothing sits next to the answers.
 */
export function CompanionLayer() {
  const styles = useStyles();
  const pathname = usePathname();
  const profile = useProfile();
  const enabled = useSettingsStore((store) => store.companionEnabled);
  const state = useCompanionStore((store) => store.state);
  const cue = useCompanionStore((store) => store.cue);

  const placement = companionPlacement(pathname);

  /*
    Arriving on a tab counts as the user being there, and the companion takes a
    look at what is on it. Both go through the store, so the glance obeys the
    same rules as everything else – it will not cut off a celebration.
  */
  useEffect(() => {
    if (!enabled || !placement) return;
    noteCompanionInteraction();
    const timer = setTimeout(() => useCompanionStore.getState().trigger(glanceState(placement)), 700);
    return () => clearTimeout(timer);
  }, [enabled, pathname, placement]);

  if (!enabled || !placement) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.layer,
        { bottom: placement.bottom },
        placement.side === 'right' ? { right: placement.inset } : { left: placement.inset },
      ]}
    >
      <AvatarCompanion
        config={profile.data?.avatarConfig}
        state={state}
        cue={cue}
        size={placement.size}
        label={placement.label}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  layer: { position: 'absolute', zIndex: 10 },
}));
