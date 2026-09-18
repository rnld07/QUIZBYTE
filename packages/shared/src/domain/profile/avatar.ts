/**
 * The customisable pet avatar.
 *
 * Everyone draws the same cat or dog; what makes it yours is the fur, the
 * breed and what it wears. Nothing here is an image – the app draws the face
 * from these values, so an avatar costs no upload, no storage and no traffic,
 * and it stays sharp at every size.
 *
 * The ids are stored on the profile and read by other players, so they are part
 * of the wire format: rename one and every profile wearing it falls back to the
 * default. Add new ones instead.
 */

export const AVATAR_SPECIES = ['cat', 'dog'] as const;
export type AvatarSpecies = (typeof AVATAR_SPECIES)[number];

export const AVATAR_SPECIES_NAMES: Record<AvatarSpecies, string> = {
  cat: 'Katze',
  dog: 'Hund',
};

export interface AvatarOption {
  id: string;
  name: string;
}

/** A coat: the main colour plus the darker one used for ears, muzzle and markings. */
export interface AvatarFur extends AvatarOption {
  base: string;
  shade: string;
  /** Eye and nose colour – dark fur needs a light face, and the other way round. */
  ink: string;
}

/**
 * What a breed changes about the drawing. The face reads these traits, never
 * the breed id, so a new breed is one entry here and nothing else.
 */
export interface AvatarBreedTraits {
  /** Cats have pointed or tufted ears, dogs floppy, upright or short ones. */
  ears: 'pointed' | 'tufted' | 'floppy' | 'upright' | 'short';
  /** Drawn over the face in the shade colour. */
  markings: 'none' | 'stripes' | 'mask' | 'spots' | 'patch';
  /** Wide cheeks – long-haired cats and heavy dog breeds. */
  fluffy: boolean;
  /** A short, wide muzzle instead of the standard one. */
  flatFace: boolean;
}

export interface AvatarBreed extends AvatarOption {
  traits: AvatarBreedTraits;
}

export const AVATAR_FURS: readonly AvatarFur[] = [
  { id: 'slate', name: 'Grau', base: '#8A94A6', shade: '#5F6980', ink: '#1B2233' },
  { id: 'ginger', name: 'Hellbraun', base: '#A9784E', shade: '#7C5433', ink: '#2A1B0C' },
  { id: 'cream', name: 'Creme', base: '#F0DCBE', shade: '#CBAE86', ink: '#3A2A18' },
  { id: 'midnight', name: 'Schwarz', base: '#3A3F50', shade: '#222632', ink: '#F4F7FF' },
  { id: 'snow', name: 'Weiß', base: '#F4F7FF', shade: '#C9D2E4', ink: '#27304A' },
  { id: 'berry', name: 'Beere', base: '#C97FC0', shade: '#985293', ink: '#2C0F2A' },
];

export const AVATAR_BREEDS: Record<AvatarSpecies, readonly AvatarBreed[]> = {
  cat: [
    { id: 'shorthair', name: 'Kurzhaar', traits: { ears: 'pointed', markings: 'none', fluffy: false, flatFace: false } },
    { id: 'tabby', name: 'Getigert', traits: { ears: 'pointed', markings: 'stripes', fluffy: false, flatFace: false } },
    { id: 'siam', name: 'Siam', traits: { ears: 'pointed', markings: 'mask', fluffy: false, flatFace: false } },
    { id: 'longhair', name: 'Langhaar', traits: { ears: 'tufted', markings: 'none', fluffy: true, flatFace: false } },
    { id: 'perser', name: 'Perser', traits: { ears: 'tufted', markings: 'patch', fluffy: true, flatFace: true } },
  ],
  dog: [
    { id: 'beagle', name: 'Beagle', traits: { ears: 'floppy', markings: 'patch', fluffy: false, flatFace: false } },
    { id: 'shepherd', name: 'Schäferhund', traits: { ears: 'upright', markings: 'mask', fluffy: false, flatFace: false } },
    { id: 'dalmatiner', name: 'Dalmatiner', traits: { ears: 'floppy', markings: 'spots', fluffy: false, flatFace: false } },
    { id: 'mops', name: 'Mops', traits: { ears: 'short', markings: 'mask', fluffy: false, flatFace: true } },
    { id: 'husky', name: 'Husky', traits: { ears: 'upright', markings: 'none', fluffy: true, flatFace: false } },
  ],
};

/** Eyewear. `none` is a real option, not a missing value. */
export const AVATAR_GLASSES: readonly AvatarOption[] = [
  { id: 'none', name: 'Keine' },
  { id: 'round', name: 'Rund' },
  { id: 'square', name: 'Eckig' },
  { id: 'shades', name: 'Sonnenbrille' },
];

/** Worn at the neck or on the head. */
export const AVATAR_ACCESSORIES: readonly AvatarOption[] = [
  { id: 'none', name: 'Nichts' },
  { id: 'bow', name: 'Schleife' },
  { id: 'collar', name: 'Halsband' },
  { id: 'cap', name: 'Mütze' },
  { id: 'headphones', name: 'Kopfhörer' },
];

/** What the accessory is drawn in – picked separately from the fur. */
export const AVATAR_ACCENTS: readonly AvatarOption[] = [
  { id: 'red', name: 'Rot' },
  { id: 'blue', name: 'Blau' },
  { id: 'green', name: 'Grün' },
  { id: 'violet', name: 'Violett' },
  { id: 'gold', name: 'Gold' },
  { id: 'pink', name: 'Pink' },
  { id: 'black', name: 'Schwarz' },
];

const FALLBACK_ACCENT = '#3B82F6';

const ACCENT_COLORS: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  violet: '#8B5CF6',
  gold: '#F1B434',
  pink: '#EC4899',
  black: '#15191F',
};

export interface AvatarConfig {
  species: AvatarSpecies;
  /** Id from {@link AVATAR_FURS}. */
  fur: string;
  /** Id from {@link AVATAR_BREEDS} for the chosen species. */
  breed: string;
  /** Id from {@link AVATAR_GLASSES}. */
  glasses: string;
  /** Id from {@link AVATAR_ACCESSORIES}. */
  accessory: string;
  /** Id from {@link AVATAR_ACCENTS} – the colour of the accessory. */
  accent: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  species: 'cat',
  fur: 'slate',
  breed: 'shorthair',
  glasses: 'none',
  accessory: 'none',
  accent: 'blue',
};

function isSpecies(value: unknown): value is AvatarSpecies {
  return value === 'cat' || value === 'dog';
}

function pickId(options: readonly AvatarOption[], value: unknown, fallback: string): string {
  return typeof value === 'string' && options.some((option) => option.id === value) ? value : fallback;
}

/**
 * Turns whatever is stored on a profile into a complete config.
 *
 * Tolerant on purpose: the value comes from the database as free-form JSON, an
 * older client may have written fewer fields, and an avatar must never be the
 * reason a screen fails to render. Anything unknown falls back to the default.
 */
export function normalizeAvatarConfig(value: unknown): AvatarConfig {
  if (!value || typeof value !== 'object') return DEFAULT_AVATAR_CONFIG;
  const raw = value as Record<string, unknown>;
  const species = isSpecies(raw.species) ? raw.species : DEFAULT_AVATAR_CONFIG.species;
  const breeds = AVATAR_BREEDS[species];

  return {
    species,
    fur: pickId(AVATAR_FURS, raw.fur, DEFAULT_AVATAR_CONFIG.fur),
    // The default breed follows the species: a cat cannot be a Beagle.
    breed: pickId(breeds, raw.breed, breeds[0]?.id ?? DEFAULT_AVATAR_CONFIG.breed),
    glasses: pickId(AVATAR_GLASSES, raw.glasses, 'none'),
    accessory: pickId(AVATAR_ACCESSORIES, raw.accessory, 'none'),
    accent: pickId(AVATAR_ACCENTS, raw.accent, DEFAULT_AVATAR_CONFIG.accent),
  };
}

const FALLBACK_FUR: AvatarFur = { id: 'slate', name: 'Grau', base: '#8A94A6', shade: '#5F6980', ink: '#1B2233' };

export function avatarFur(id: string): AvatarFur {
  return AVATAR_FURS.find((fur) => fur.id === id) ?? FALLBACK_FUR;
}

const FALLBACK_BREED: AvatarBreed = {
  id: 'shorthair',
  name: 'Kurzhaar',
  traits: { ears: 'pointed', markings: 'none', fluffy: false, flatFace: false },
};

export function avatarBreed(species: AvatarSpecies, id: string): AvatarBreed {
  const breeds = AVATAR_BREEDS[species];
  return breeds.find((breed) => breed.id === id) ?? breeds[0] ?? FALLBACK_BREED;
}

export function avatarAccentColor(id: string): string {
  return ACCENT_COLORS[id] ?? FALLBACK_ACCENT;
}

/**
 * Switches species while keeping everything that still applies.
 *
 * The breed cannot survive the switch – it belongs to one species – so it falls
 * back to that species' first one. Fur and accessories are kept: losing them
 * for looking at the other animal would be annoying.
 */
export function switchAvatarSpecies(config: AvatarConfig, species: AvatarSpecies): AvatarConfig {
  if (config.species === species) return config;
  return normalizeAvatarConfig({ ...config, species, breed: AVATAR_BREEDS[species][0]?.id });
}

/** "Getigerte Katze mit Sonnenbrille" – used for accessibility labels. */
export function describeAvatar(config: AvatarConfig): string {
  const breed = avatarBreed(config.species, config.breed);
  const parts = [`${breed.name}-${AVATAR_SPECIES_NAMES[config.species]}`, `in ${avatarFur(config.fur).name}`];
  if (config.glasses !== 'none') {
    parts.push(`mit ${AVATAR_GLASSES.find((option) => option.id === config.glasses)?.name ?? 'Brille'}-Brille`);
  }
  if (config.accessory !== 'none') {
    parts.push(`mit ${AVATAR_ACCESSORIES.find((option) => option.id === config.accessory)?.name ?? 'Zubehör'}`);
  }
  return parts.join(' ');
}
