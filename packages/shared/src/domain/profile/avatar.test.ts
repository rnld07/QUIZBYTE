import { describe, expect, it } from 'vitest';

import {
  AVATAR_BREEDS,
  AVATAR_FURS,
  AVATAR_SPECIES,
  DEFAULT_AVATAR_CONFIG,
  avatarAccentColor,
  avatarBreed,
  avatarFur,
  describeAvatar,
  normalizeAvatarConfig,
  switchAvatarSpecies,
} from './avatar';

describe('avatar catalogue', () => {
  it('gives both species their own breeds', () => {
    for (const species of AVATAR_SPECIES) {
      expect(AVATAR_BREEDS[species].length).toBeGreaterThan(1);
    }
    const catIds = AVATAR_BREEDS.cat.map((breed) => breed.id);
    const dogIds = AVATAR_BREEDS.dog.map((breed) => breed.id);
    expect(catIds.some((id) => dogIds.includes(id))).toBe(false);
  });

  it('keeps every fur id unique', () => {
    expect(new Set(AVATAR_FURS.map((fur) => fur.id)).size).toBe(AVATAR_FURS.length);
  });

  it('gives every fur a readable colour pair', () => {
    for (const fur of AVATAR_FURS) {
      expect(fur.base).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(fur.shade).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(fur.ink).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('falls back instead of returning nothing', () => {
    expect(avatarFur('does-not-exist').id).toBe('slate');
    expect(avatarBreed('dog', 'shorthair').id).toBe(AVATAR_BREEDS.dog[0]?.id);
    expect(avatarAccentColor('nonsense')).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('normalizeAvatarConfig', () => {
  it('returns the default for anything that is not an object', () => {
    expect(normalizeAvatarConfig(null)).toEqual(DEFAULT_AVATAR_CONFIG);
    expect(normalizeAvatarConfig(undefined)).toEqual(DEFAULT_AVATAR_CONFIG);
    expect(normalizeAvatarConfig('cat')).toEqual(DEFAULT_AVATAR_CONFIG);
    expect(normalizeAvatarConfig(7)).toEqual(DEFAULT_AVATAR_CONFIG);
  });

  it('fills in what a partial config is missing', () => {
    expect(normalizeAvatarConfig({ species: 'dog' })).toEqual({
      species: 'dog',
      fur: DEFAULT_AVATAR_CONFIG.fur,
      breed: AVATAR_BREEDS.dog[0]?.id,
      glasses: 'none',
      accessory: 'none',
      accent: DEFAULT_AVATAR_CONFIG.accent,
    });
  });

  it('drops a breed that belongs to the other species', () => {
    expect(normalizeAvatarConfig({ species: 'cat', breed: 'beagle' }).breed).toBe(AVATAR_BREEDS.cat[0]?.id);
  });

  it('keeps every value it recognises', () => {
    const config = { species: 'dog', fur: 'ginger', breed: 'husky', glasses: 'shades', accessory: 'cap', accent: 'gold' };
    expect(normalizeAvatarConfig(config)).toEqual(config);
  });

  it('ignores unknown ids rather than failing', () => {
    const config = normalizeAvatarConfig({ species: 'cat', fur: 'neon', glasses: 'monocle', accent: 'beige' });
    expect(config.fur).toBe(DEFAULT_AVATAR_CONFIG.fur);
    expect(config.glasses).toBe('none');
    expect(config.accent).toBe(DEFAULT_AVATAR_CONFIG.accent);
  });
});

describe('switchAvatarSpecies', () => {
  const dressed = normalizeAvatarConfig({
    species: 'cat',
    fur: 'berry',
    breed: 'tabby',
    glasses: 'round',
    accessory: 'bow',
    accent: 'pink',
  });

  it('keeps fur and accessories across the switch', () => {
    const asDog = switchAvatarSpecies(dressed, 'dog');
    expect(asDog.fur).toBe('berry');
    expect(asDog.glasses).toBe('round');
    expect(asDog.accessory).toBe('bow');
    expect(asDog.accent).toBe('pink');
  });

  it('resets the breed, which cannot cross species', () => {
    expect(switchAvatarSpecies(dressed, 'dog').breed).toBe(AVATAR_BREEDS.dog[0]?.id);
  });

  it('changes nothing when the species is already right', () => {
    expect(switchAvatarSpecies(dressed, 'cat')).toBe(dressed);
  });
});

describe('describeAvatar', () => {
  it('names breed, species and fur', () => {
    const text = describeAvatar(normalizeAvatarConfig({ species: 'cat', breed: 'tabby', fur: 'ginger' }));
    expect(text).toContain('Getigert');
    expect(text).toContain('Katze');
    expect(text).toContain('Hellbraun');
  });

  it('mentions accessories only when something is worn', () => {
    const bare = describeAvatar(normalizeAvatarConfig({ species: 'dog' }));
    expect(bare).not.toContain('Brille');

    const dressed = describeAvatar(normalizeAvatarConfig({ species: 'dog', glasses: 'shades', accessory: 'cap' }));
    expect(dressed).toContain('Sonnenbrille');
    expect(dressed).toContain('Mütze');
  });
});
