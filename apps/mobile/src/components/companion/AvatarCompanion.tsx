import { Suspense, lazy } from 'react';
import { View } from 'react-native';

import { normalizeAvatarConfig } from '@quizbyte/shared';
import type { AvatarConfig, CompanionState } from '@quizbyte/shared';

import { hasCompanionArtwork } from '@/content/companionRive';

import { FallbackCompanion } from './FallbackCompanion';

/*
  Loaded only once there is artwork to play.

  Rive is a native module: importing it at the top of this file would pull the
  native side in the moment anything renders an avatar, and that throws in Expo
  Go, where there is no native side. Behind a lazy import the app keeps running
  in Expo Go for as long as no .riv file is registered – which is exactly the
  window in which the stand-in is doing the work anyway.
*/
const RiveCompanion = lazy(() => import('./RiveCompanion'));

export interface AvatarCompanionProps {
  /**
   * The wearer's avatar.
   *
   * The whole configuration, not just the species: the companion is the same
   * animal as the profile picture, down to its coat and its cap, and a second
   * source of truth for what it looks like is the one thing this must not be.
   */
  config: AvatarConfig | null | undefined;
  state: CompanionState;
  /** Changes on every trigger, replays included – see the companion store. */
  cue: number;
  size?: number;
  label?: string;
}

/**
 * The animated companion.
 *
 * One component for the whole app: it takes a state and draws the animal in it.
 * Whether that happens through Rive or through the drawn stand-in is decided
 * here and nowhere else, so the day the `.riv` files land, this is the only
 * file that notices.
 *
 * Never interactive. The companion lives on top of the screen, and something up
 * there that could swallow a tap is a bug waiting for its first bad review.
 */
export function AvatarCompanion({ config, state, cue, size = 88, label = 'Dein Begleiter' }: AvatarCompanionProps) {
  // Normalised because the ids come from the database, which does not check
  // them – the same route every other avatar in the app takes.
  const avatar = normalizeAvatarConfig(config);

  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size }}
    >
      {hasCompanionArtwork(avatar.species) ? (
        // Nothing while it loads: an empty corner for a frame beats a stand-in
        // that flashes past on its way out.
        <Suspense fallback={null}>
          <RiveCompanion species={avatar.species} state={state} cue={cue} size={size} />
        </Suspense>
      ) : (
        <FallbackCompanion config={avatar} state={state} cue={cue} size={size} />
      )}
    </View>
  );
}
