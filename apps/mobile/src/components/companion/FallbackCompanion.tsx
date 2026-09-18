import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import type { AvatarConfig, CompanionState } from '@quizbyte/shared';

import { PetBody } from './PetBody';

interface FallbackCompanionProps {
  config: AvatarConfig;
  state: CompanionState;
  /** Changes on every trigger, replays included – see the companion store. */
  cue: number;
  size: number;
}

/**
 * The companion without its Rive file.
 *
 * The whole animal, drawn from the same avatar the rest of the app uses – same
 * breed, same coat, same cap – and moved about by hand. It is a stand-in, not a
 * rival: every state is here so the system can be wired up and watched today,
 * and the day the artwork lands this component stops being rendered.
 *
 * All of it runs on the native driver, so a blinking cat costs no JavaScript
 * frames while a quiz is being answered.
 */
export function FallbackCompanion({ config, state, cue, size }: FallbackCompanionProps) {
  // One value per kind of motion, so states can be written as short scripts.
  const [lift] = useState(() => new Animated.Value(0));
  const [lean] = useState(() => new Animated.Value(0));
  const [squash] = useState(() => new Animated.Value(1));
  const [breath] = useState(() => new Animated.Value(0));

  // The slow rise and fall underneath everything else. Started once and never
  // stopped: it is what keeps the animal from looking like a sticker.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  useEffect(() => {
    const animation = scriptFor(state, { lift, lean, squash });
    animation.start();
    return () => animation.stop();
    // `cue` rather than `state` alone: the same reaction twice has to play twice.
  }, [cue, lean, lift, squash, state]);

  const unit = size / 100;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        transform: [
          { translateX: Animated.multiply(lean, 7 * unit) },
          {
            translateY: Animated.add(
              Animated.multiply(lift, -14 * unit),
              breath.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5 * unit] }),
            ),
          },
          // Leaning is half a turn of the head: a pure sideways slide reads as
          // the whole animal being dragged.
          { rotate: lean.interpolate({ inputRange: [-1, 1], outputRange: ['5deg', '-5deg'] }) },
          { scaleY: squash },
        ],
      }}
    >
      <PetBody size={size} config={config} />
    </Animated.View>
  );
}

interface Channels {
  lift: Animated.Value;
  lean: Animated.Value;
  squash: Animated.Value;
}

/** How each state is performed with the three channels above. */
function scriptFor(state: CompanionState, { lift, lean, squash }: Channels): Animated.CompositeAnimation {
  const to = (value: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.quad)) =>
    Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });

  switch (state) {
    case 'blink':
      // A quick dip of the whole head: the drawn eyes are not their own layer,
      // so this is as close to a blink as the stand-in gets.
      return Animated.sequence([to(squash, 0.9, 110), to(squash, 1, 190, Easing.out(Easing.back(2)))]);

    case 'lookLeft':
      return Animated.sequence([to(lean, -1, 420), Animated.delay(620), to(lean, 0, 360)]);

    case 'lookRight':
      return Animated.sequence([to(lean, 1, 420), Animated.delay(620), to(lean, 0, 360)]);

    case 'happy':
      // Two small hops – one is an accident, two is a reaction.
      return Animated.sequence([
        to(lift, 1, 200, Easing.out(Easing.quad)),
        to(lift, 0, 240, Easing.bounce),
        to(lift, 0.6, 170),
        to(lift, 0, 220, Easing.bounce),
      ]);

    case 'sad':
      return Animated.sequence([
        Animated.parallel([to(lift, -0.35, 420), to(squash, 0.94, 420)]),
        Animated.delay(500),
        Animated.parallel([to(lift, 0, 500), to(squash, 1, 500)]),
      ]);

    case 'celebrate':
      return Animated.sequence([
        Animated.parallel([to(lift, 1.4, 260, Easing.out(Easing.back(2.4))), to(lean, -0.6, 260)]),
        Animated.parallel([to(lean, 0.6, 300)]),
        Animated.parallel([to(lift, 0, 420, Easing.bounce), to(lean, 0, 420)]),
      ]);

    case 'sleep':
      return Animated.parallel([to(lift, -0.25, 900), to(squash, 0.96, 900), to(lean, 0.25, 900)]);

    case 'idle':
    default:
      // Back to standing straight, whatever it was doing.
      return Animated.parallel([to(lift, 0, 320), to(lean, 0, 320), to(squash, 1, 320)]);
  }
}
