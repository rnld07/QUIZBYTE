import { useEffect, useRef } from 'react';
import Rive, { Alignment, Fit } from 'rive-react-native';
import type { RiveRef } from 'rive-react-native';

import type { AvatarSpecies, CompanionState } from '@quizbyte/shared';

import {
  COMPANION_SLEEP_INPUT,
  COMPANION_STATE_MACHINE,
  COMPANION_TRIGGERS,
  companionRiveFile,
} from '@/content/companionRive';

interface RiveCompanionProps {
  species: AvatarSpecies;
  state: CompanionState;
  /** Changes on every trigger, replays included – see the companion store. */
  cue: number;
  size: number;
}

/**
 * The companion, played from its Rive file.
 *
 * The state machine is driven, never the animations directly: a trigger is
 * fired and the file decides how to get there and back, which is what keeps a
 * blink from cutting a celebration in half. Only ever rendered when a file is
 * actually registered – the fallback covers the rest.
 */
export default function RiveCompanion({ species, state, cue, size }: RiveCompanionProps) {
  const riveRef = useRef<RiveRef>(null);
  const source = companionRiveFile(species);

  useEffect(() => {
    const rive = riveRef.current;
    if (!rive) return;

    /*
      Sleep is a held state, so it is a boolean and has to be cleared again;
      everything else is a trigger the file plays out on its own. Wrapped
      because the native side throws when a file is missing an input, and a
      companion is never worth taking the screen down for.
    */
    try {
      rive.setInputState(COMPANION_STATE_MACHINE, COMPANION_SLEEP_INPUT, state === 'sleep');

      const trigger = state === 'idle' || state === 'sleep' ? null : COMPANION_TRIGGERS[state];
      if (trigger) rive.fireState(COMPANION_STATE_MACHINE, trigger);
    } catch {
      // A file that does not answer to our inputs simply stands there.
    }
    // `cue` rather than `state` alone: the same reaction twice has to play twice.
  }, [cue, state]);

  if (source === undefined) return null;

  return (
    <Rive
      ref={riveRef}
      source={source}
      stateMachineName={COMPANION_STATE_MACHINE}
      artboardName={species === 'cat' ? 'Cat' : 'Dog'}
      fit={Fit.Contain}
      alignment={Alignment.BottomCenter}
      autoplay
      style={{ width: size, height: size }}
    />
  );
}
