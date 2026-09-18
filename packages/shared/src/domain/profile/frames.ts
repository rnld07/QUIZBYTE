/**
 * How a frame is drawn. Deliberately descriptive rather than platform specific –
 * this package must stay framework-agnostic, so the renderer decides what a
 * "double ring" or a "glow" actually looks like.
 */
export type FrameStyle =
  /** One continuous ring. */
  | 'solid'
  /** Ring that fades between its two colours. */
  | 'gradient'
  /** Segmented ring – reads like a circuit trace. */
  | 'dashed'
  /** Two rings with a gap between them. */
  | 'double'
  /** Ring plus a soft halo in the same colour. */
  | 'glow';

export interface ProfileFrame {
  id: string;
  name: string;
  /** Level from which the frame can be equipped; 1 means "from the start". */
  requiredLevel: number;
  style: FrameStyle;
  /**
   * The ring's colours, from the outer edge inwards. One is a flat ring; more
   * than one is a ramp, and a metal look needs at least four so the highlight
   * band does not smear across the whole ring.
   */
  colors: readonly string[];
  /** Ring thickness in points. */
  width: number;
  /**
   * Small rank emblem shown on the picture. The value is an Ionicons name –
   * the same convention `categories.icon` already uses. Absent for the ranks
   * that carry no emblem.
   */
  badge?: string;
}

/** The frame everyone has – no ring at all. */
export const NO_FRAME_ID = 'none';

/**
 * Every frame, ordered by the level that unlocks it.
 *
 * Four ranks on top of a plain grey starter, spread evenly across the road to
 * level 100 so each one is a real milestone rather than a trinket every few
 * levels. From bronze upwards a rank also carries a small emblem; grey is the
 * everyday look and stays quiet.
 *
 * IMPORTANT: the required levels are mirrored by `public.frame_required_level`
 * in the database, which is what actually guards equipping. Keep both in sync.
 */
export const PROFILE_FRAMES: readonly ProfileFrame[] = [
  { id: NO_FRAME_ID, name: 'Ohne Rahmen', requiredLevel: 1, style: 'solid', colors: ['transparent'], width: 0 },
  { id: 'graphite', name: 'Grau', requiredLevel: 1, style: 'solid', colors: ['#8A94A6'], width: 2 },
  { id: 'bronze', name: 'Bronze', requiredLevel: 25, style: 'gradient', colors: ['#E3A063', '#8C5A21', '#D08B45', '#7A4A18'], width: 3, badge: 'medal' },
  { id: 'silver', name: 'Silber', requiredLevel: 50, style: 'gradient', colors: ['#F2F5FA', '#8A93A0', '#D6DCE5', '#79828F'], width: 3, badge: 'medal' },
  { id: 'gold', name: 'Gold', requiredLevel: 75, style: 'gradient', colors: ['#FFE79B', '#C8901A', '#F2C14E', '#A9740E'], width: 4, badge: 'trophy' },
  // Deliberately iridescent rather than another grey: next to silver a neutral
  // platinum was barely a different frame. The cyan and lilac bands separate it
  // at a glance, the halo does the rest.
  {
    id: 'platinum',
    name: 'Platin',
    requiredLevel: 100,
    style: 'glow',
    colors: ['#FFFFFF', '#7FE3FF', '#D9C4FF', '#8FB6FF', '#FFFFFF'],
    // Narrower than gold rather than wider: the halo is what makes platinum
    // stand out, so the band itself does not have to shout as well.
    width: 3,
    badge: 'diamond',
  },
];

const BY_ID = new Map(PROFILE_FRAMES.map((frame) => [frame.id, frame]));

/** The frame with this id, or `undefined` for an unknown one. */
export function frameById(id: string | null | undefined): ProfileFrame | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function isFrameUnlocked(id: string | null | undefined, level: number): boolean {
  const frame = frameById(id);
  return frame !== undefined && level >= frame.requiredLevel;
}

/** Every frame the given level has earned, in catalogue order. */
export function unlockedFrames(level: number): ProfileFrame[] {
  return PROFILE_FRAMES.filter((frame) => level >= frame.requiredLevel);
}

/** The next frame still to come, or `null` once everything is unlocked. */
export function nextFrame(level: number): ProfileFrame | null {
  return PROFILE_FRAMES.find((frame) => frame.requiredLevel > level) ?? null;
}

/**
 * The best frame the level has earned.
 *
 * Not worn by itself – a frame is always chosen by hand. This is what the home
 * screen announces when a new rank is reached, so the offer can be made instead
 * of the change simply happening.
 */
export function bestUnlockedFrame(level: number): ProfileFrame | null {
  const earned = PROFILE_FRAMES.filter((frame) => frame.id !== NO_FRAME_ID && level >= frame.requiredLevel);
  return earned.at(-1) ?? null;
}

/**
 * The frame to actually draw.
 *
 * Nothing is worn until it is picked: `null` and `'none'` both draw empty. A
 * rank that arrives on its own is a change nobody asked for, and it made the
 * picker look broken – every entry said "choose me" while one of them was
 * already on.
 *
 * Anything unknown or not (yet) unlocked draws nothing either, so a stale id –
 * an old app version, a level reset – can never paint a frame that was not
 * earned.
 */
export function resolveFrame(id: string | null | undefined, level: number): ProfileFrame | null {
  if (id === null || id === undefined) return null;
  const frame = frameById(id);
  if (!frame || frame.id === NO_FRAME_ID || level < frame.requiredLevel) return null;
  return frame;
}

/**
 * The frame another user is wearing.
 *
 * Unlike `resolveFrame` this does not re-check the level: equipping goes
 * through the server, which verifies the unlock, and their XP is not something
 * every list carries. Use `resolveFrame` wherever the level is known – for the
 * signed-in user – so a progress reset takes the frame off right away.
 */
export function equippedFrame(id: string | null | undefined): ProfileFrame | null {
  const frame = frameById(id);
  return !frame || frame.id === NO_FRAME_ID ? null : frame;
}
