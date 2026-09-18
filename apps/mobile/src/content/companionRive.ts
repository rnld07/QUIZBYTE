import type { AvatarSpecies } from '@quizbyte/shared';

/**
 * The Rive files behind the animated companion.
 *
 * Metro resolves `require()` at build time, so every file needs a static entry
 * here – see `assets/rive/README.md` for what the file has to contain. While an
 * entry is undefined the app falls back to the drawn avatar with simple motion,
 * so the companion works today and gets better the day the artwork lands.
 */
const COMPANION_FILES: Record<AvatarSpecies, number | undefined> = {
  cat: undefined,
  dog: undefined,
  // cat: require('../../assets/rive/companion-cat.riv'),
  // dog: require('../../assets/rive/companion-dog.riv'),
};

/** The name of the state machine every companion file must expose. */
export const COMPANION_STATE_MACHINE = 'Companion';

/**
 * What each companion state is called inside the file.
 *
 * All six reactions are triggers; sleeping is a boolean, because it holds until
 * something wakes the animal. Idle needs no input at all – it is where the
 * state machine rests when nothing has been fired.
 *
 * One table, so a file that names things differently is adapted here instead of
 * in the component.
 */
export const COMPANION_TRIGGERS = {
  blink: 'blink',
  lookLeft: 'lookLeft',
  lookRight: 'lookRight',
  happy: 'happy',
  sad: 'sad',
  celebrate: 'celebrate',
} as const;

/** The boolean input that holds the animal asleep. */
export const COMPANION_SLEEP_INPUT = 'sleep';

/** The registered file for a species, or undefined while none is set. */
export function companionRiveFile(species: AvatarSpecies): number | undefined {
  return COMPANION_FILES[species];
}

/** Whether any companion artwork is registered at all. */
export function hasCompanionArtwork(species: AvatarSpecies): boolean {
  return companionRiveFile(species) !== undefined;
}
