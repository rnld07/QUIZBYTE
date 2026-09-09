/**
 * Central feature flags.
 *
 * Every feature that is prepared in the architecture but not part of the current
 * release lives here. UI and services must read these flags instead of scattering
 * `if` statements around the code base. Flip a flag to `true` once the feature ships.
 */
export const features = {
  /** Pro subscription: premium categories, paywall, "Pro verwalten" menu entries. */
  pro: false,
  /** Friends tab, add-by-username, friend profiles. */
  friends: false,
  /** Asynchronous quiz duels between two users. */
  duels: false,
  /** Public groups, feeds, comments – explicitly out of scope for now. */
  community: false,
  /** Daily quiz session type. */
  dailyQuiz: false,
  /** Exam simulation (e.g. AP1) with time limit. */
  examMode: false,
  /** "Schwächen trainieren" – part of V1. */
  weaknessTraining: true,
  /** Native share sheet on questions – part of V1. */
  questionSharing: true,
} as const satisfies Record<string, boolean>;

export type FeatureFlag = keyof typeof features;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
