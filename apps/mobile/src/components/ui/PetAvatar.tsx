import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { avatarAccentColor, avatarBreed, avatarFur, describeAvatar } from '@quizbyte/shared';
import type { AvatarBreedTraits, AvatarConfig, AvatarFur } from '@quizbyte/shared';

import { accessoryArtwork, petArtwork } from '@/content/petArtwork';
import type { ArtworkLayers } from '@/content/petArtwork';

interface PetAvatarProps {
  /** Outer diameter in px – every part scales with it. */
  size: number;
  config: AvatarConfig;
}

/**
 * The profile picture: a cat or dog face.
 *
 * Drawn from plain views on a 100×100 grid by default – no asset, sharp at any
 * size, and a friend's avatar arrives as five short strings instead of an image.
 * Each part is replaced by artwork as soon as one is registered in
 * `content/petArtwork`, so the folder can be filled a breed at a time.
 */
export function PetAvatar({ size, config }: PetAvatarProps) {
  const fur = avatarFur(config.fur);
  const breed = avatarBreed(config.species, config.breed);
  const accent = avatarAccentColor(config.accent);
  const u = size / 100;

  const body = petArtwork(config.species, breed.id);
  const glasses = accessoryArtwork(config.glasses);
  const accessory = accessoryArtwork(config.accessory);

  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={describeAvatar(config)}>
      {/* Artwork replaces the whole animal; the drawn parts only fill in for
          breeds that have none yet. */}
      {body ? (
        <ArtworkStack id={`${config.species}-${breed.id}`} layers={body} tint={fur.base} size={size} />
      ) : (
        <>
          <Ears u={u} fur={fur} traits={breed.traits} />
          <Head u={u} fur={fur} traits={breed.traits} />
          <Markings u={u} fur={fur} traits={breed.traits} species={config.species} />
          <Face u={u} fur={fur} traits={breed.traits} species={config.species} />
        </>
      )}

      {glasses ? (
        <ArtworkStack id={config.glasses} layers={glasses} tint={accent} size={size} />
      ) : (
        <Glasses u={u} kind={config.glasses} accent={accent} ink={fur.ink} />
      )}

      {accessory ? (
        <ArtworkStack id={config.accessory} layers={accessory} tint={accent} size={size} />
      ) : (
        <Accessory u={u} kind={config.accessory} accent={accent} />
      )}
    </View>
  );
}

interface ArtworkStackProps {
  /**
   * What is being shown – the breed or the accessory id.
   *
   * Passed on as `recyclingKey`: the image view is reused when only the source
   * changes, and it keeps showing the picture it already had. That is why
   * picking a different breed did nothing until the screen was rebuilt. The
   * same value keys the elements, so a switch also gets fresh React nodes.
   */
  id: string;
  layers: ArtworkLayers;
  tint: string;
  /** The avatar's diameter – placement offsets are fractions of it. */
  size: number;
}

/**
 * One piece of artwork: the colourable layer, then the fixed one on top.
 *
 * `tintColor` paints every non-transparent pixel in one colour, which is why
 * the two layers are separate files – outlines and eyes would be swallowed by
 * the coat colour otherwise.
 */
function ArtworkStack({ id, layers, tint, size }: ArtworkStackProps) {
  const { scale = 1, offsetX = 0, offsetY = 0 } = layers.placement ?? {};
  // Translate before scale, so an offset means the same thing whatever the
  // piece has been shrunk to.
  const placed =
    scale === 1 && offsetX === 0 && offsetY === 0
      ? null
      : { transform: [{ translateX: offsetX * size }, { translateY: offsetY * size }, { scale }] };

  return (
    <View style={[StyleSheet.absoluteFill, placed]} pointerEvents="none">
      {layers.fur ? (
        <Image
          key={`${id}-fur`}
          recyclingKey={`${id}-fur`}
          source={layers.fur}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          tintColor={tint}
          cachePolicy="memory-disk"
        />
      ) : null}
      {layers.lines ? (
        <Image
          key={`${id}-lines`}
          recyclingKey={`${id}-lines`}
          source={layers.lines}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
}

interface PartProps {
  u: number;
  fur: AvatarFur;
  traits: AvatarBreedTraits;
}

/** Ears sit behind the head, so the head covers where they join it. */
function Ears({ u, fur, traits }: PartProps) {
  if (traits.ears === 'floppy') {
    const ear: ViewStyle = {
      position: 'absolute',
      top: 24 * u,
      width: 24 * u,
      height: 46 * u,
      borderRadius: 12 * u,
      backgroundColor: fur.shade,
    };
    return (
      <>
        <View style={[ear, { left: 1 * u, transform: [{ rotate: '-10deg' }] }]} />
        <View style={[ear, { right: 1 * u, transform: [{ rotate: '10deg' }] }]} />
      </>
    );
  }

  if (traits.ears === 'short') {
    // A pug's ears: small folded flaps close to the head.
    const ear: ViewStyle = {
      position: 'absolute',
      top: 22 * u,
      width: 18 * u,
      height: 20 * u,
      borderRadius: 9 * u,
      backgroundColor: fur.shade,
    };
    return (
      <>
        <View style={[ear, { left: 8 * u, transform: [{ rotate: '-18deg' }] }]} />
        <View style={[ear, { right: 8 * u, transform: [{ rotate: '18deg' }] }]} />
      </>
    );
  }

  // Pointed, tufted and upright ears are all triangles – only the size and the
  // tilt differ, so one shape covers the three of them.
  const wide = traits.ears === 'upright' ? 11 : 13;
  const tall = traits.ears === 'upright' ? 26 : 22;
  const tilt = traits.ears === 'upright' ? 6 : 14;

  const ear: ViewStyle = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: wide * u,
    borderRightWidth: wide * u,
    borderBottomWidth: tall * u,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: fur.base,
  };

  const inner: ViewStyle = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: (wide - 7) * u,
    borderRightWidth: (wide - 7) * u,
    borderBottomWidth: (tall - 12) * u,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: fur.shade,
  };

  const top = traits.ears === 'upright' ? 2 : 5;

  return (
    <>
      <View style={[ear, { top: top * u, left: 11 * u, transform: [{ rotate: `-${tilt}deg` }] }]} />
      <View style={[ear, { top: top * u, right: 11 * u, transform: [{ rotate: `${tilt}deg` }] }]} />
      <View style={[inner, { top: (top + 9) * u, left: 18 * u, transform: [{ rotate: `-${tilt}deg` }] }]} />
      <View style={[inner, { top: (top + 9) * u, right: 18 * u, transform: [{ rotate: `${tilt}deg` }] }]} />

      {/* Long-haired breeds get a tuft poking out of each ear. */}
      {traits.ears === 'tufted' ? (
        <>
          <View
            style={{
              position: 'absolute',
              top: (top + 4) * u,
              left: 8 * u,
              width: 9 * u,
              height: 3 * u,
              borderRadius: 999,
              backgroundColor: fur.shade,
              transform: [{ rotate: '-40deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: (top + 4) * u,
              right: 8 * u,
              width: 9 * u,
              height: 3 * u,
              borderRadius: 999,
              backgroundColor: fur.shade,
              transform: [{ rotate: '40deg' }],
            }}
          />
        </>
      ) : null}
    </>
  );
}

function Head({ u, fur, traits }: PartProps) {
  const width = traits.fluffy ? 88 : 80;
  const left = (100 - width) / 2;

  return (
    <>
      {/* Cheek tufts on the fluffy breeds – drawn under the head so they read
          as fur sticking out rather than as ears. */}
      {traits.fluffy ? (
        <>
          <View
            style={{
              position: 'absolute',
              top: 40 * u,
              left: 1 * u,
              width: 20 * u,
              height: 30 * u,
              borderRadius: 10 * u,
              backgroundColor: fur.shade,
              transform: [{ rotate: '-16deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 40 * u,
              right: 1 * u,
              width: 20 * u,
              height: 30 * u,
              borderRadius: 10 * u,
              backgroundColor: fur.shade,
              transform: [{ rotate: '16deg' }],
            }}
          />
        </>
      ) : null}

      <View
        style={{
          position: 'absolute',
          top: 22 * u,
          left: left * u,
          width: width * u,
          height: 70 * u,
          borderRadius: 36 * u,
          backgroundColor: fur.base,
        }}
      />
    </>
  );
}

interface MarkingProps extends PartProps {
  species: 'cat' | 'dog';
}

/** Stripes, a dark mask, spots or a single patch over one eye. */
function Markings({ u, fur, traits }: MarkingProps) {
  if (traits.markings === 'stripes') {
    const stripe: ViewStyle = {
      position: 'absolute',
      width: 4 * u,
      height: 12 * u,
      borderRadius: 999,
      backgroundColor: fur.shade,
    };
    return (
      <>
        <View style={[stripe, { top: 26 * u, left: 44 * u }]} />
        <View style={[stripe, { top: 28 * u, left: 34 * u, transform: [{ rotate: '-18deg' }] }]} />
        <View style={[stripe, { top: 28 * u, right: 34 * u, transform: [{ rotate: '18deg' }] }]} />
        <View style={[stripe, { top: 26 * u, right: 44 * u }]} />
      </>
    );
  }

  if (traits.markings === 'mask') {
    // A darker snout area – the Siamese point and the pug's black mask are the
    // same shape at this size.
    return (
      <View
        style={{
          position: 'absolute',
          top: 52 * u,
          left: 28 * u,
          width: 44 * u,
          height: 38 * u,
          borderRadius: 22 * u,
          backgroundColor: fur.shade,
          opacity: 0.85,
        }}
      />
    );
  }

  if (traits.markings === 'spots') {
    const spot = (top: number, left: number, size: number): ViewStyle => ({
      position: 'absolute',
      top: top * u,
      left: left * u,
      width: size * u,
      height: size * u,
      borderRadius: 999,
      backgroundColor: fur.shade,
    });
    return (
      <>
        <View style={spot(28, 26, 12)} />
        <View style={spot(34, 62, 9)} />
        <View style={spot(70, 22, 8)} />
        <View style={spot(74, 68, 7)} />
      </>
    );
  }

  if (traits.markings === 'patch') {
    // One eye patch – the classic beagle and two-tone cat marking.
    return (
      <View
        style={{
          position: 'absolute',
          top: 30 * u,
          left: 20 * u,
          width: 30 * u,
          height: 32 * u,
          borderRadius: 16 * u,
          backgroundColor: fur.shade,
        }}
      />
    );
  }

  return null;
}

/** Eyes, nose, muzzle and – for cats – whiskers. */
function Face({ u, fur, traits, species }: MarkingProps) {
  const eye: ViewStyle = {
    position: 'absolute',
    top: 46 * u,
    width: 10 * u,
    height: 12 * u,
    borderRadius: 5 * u,
    backgroundColor: fur.ink,
  };

  const glint: ViewStyle = {
    position: 'absolute',
    top: 48 * u,
    width: 3.5 * u,
    height: 3.5 * u,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  };

  const muzzleWidth = traits.flatFace ? 44 : 36;
  const muzzleHeight = traits.flatFace ? 22 : 26;

  return (
    <>
      <View style={[eye, { left: 29 * u }]} />
      <View style={[eye, { right: 29 * u }]} />
      {/* The catchlight is what makes the face look alive rather than printed. */}
      <View style={[glint, { left: 31 * u }]} />
      <View style={[glint, { right: 31 * u }]} />

      {species === 'dog' ? (
        <View
          style={{
            position: 'absolute',
            top: 62 * u,
            left: (100 - muzzleWidth) / 2 * u,
            width: muzzleWidth * u,
            height: muzzleHeight * u,
            borderRadius: 13 * u,
            backgroundColor: fur.base,
            opacity: 0.55,
          }}
        />
      ) : null}

      {/* Nose: a triangle for cats, a rounded button for dogs. */}
      {species === 'cat' ? (
        <View
          style={{
            position: 'absolute',
            top: 63 * u,
            left: 45 * u,
            width: 0,
            height: 0,
            borderLeftWidth: 5 * u,
            borderRightWidth: 5 * u,
            borderTopWidth: 5 * u,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: fur.ink,
          }}
        />
      ) : (
        <View
          style={{
            position: 'absolute',
            top: 63 * u,
            left: 42 * u,
            width: 16 * u,
            height: 11 * u,
            borderRadius: 6 * u,
            backgroundColor: fur.ink,
          }}
        />
      )}

      {/* Mouth – a short line down from the nose. */}
      <View
        style={{
          position: 'absolute',
          top: species === 'cat' ? 69 * u : 74 * u,
          left: 49 * u,
          width: Math.max(1, 2 * u),
          height: 7 * u,
          borderRadius: 999,
          backgroundColor: fur.ink,
          opacity: 0.7,
        }}
      />

      {species === 'cat' ? <Whiskers u={u} /> : null}
    </>
  );
}

function Whiskers({ u }: { u: number }) {
  const whisker: ViewStyle = {
    position: 'absolute',
    top: 64 * u,
    width: 16 * u,
    height: Math.max(1, 1.6 * u),
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  };
  return (
    <>
      <View style={[whisker, { left: 3 * u, transform: [{ rotate: '-8deg' }] }]} />
      <View style={[whisker, { left: 3 * u, top: 72 * u, transform: [{ rotate: '6deg' }] }]} />
      <View style={[whisker, { right: 3 * u, transform: [{ rotate: '8deg' }] }]} />
      <View style={[whisker, { right: 3 * u, top: 72 * u, transform: [{ rotate: '-6deg' }] }]} />
    </>
  );
}

interface GlassesProps {
  u: number;
  kind: string;
  accent: string;
  ink: string;
}

/** Sits over the eyes, so it is drawn after the face. */
function Glasses({ u, kind, accent, ink }: GlassesProps) {
  if (kind === 'none') return null;

  const shades = kind === 'shades';
  const lens: ViewStyle = {
    position: 'absolute',
    top: 42 * u,
    width: 22 * u,
    height: 20 * u,
    borderRadius: kind === 'square' ? 4 * u : 11 * u,
    borderWidth: Math.max(1, 2 * u),
    borderColor: shades ? ink : accent,
    backgroundColor: shades ? ink : 'rgba(255, 255, 255, 0.18)',
  };

  return (
    <>
      <View style={[lens, { left: 22 * u }]} />
      <View style={[lens, { right: 22 * u }]} />
      {/* The bridge between the lenses. */}
      <View
        style={{
          position: 'absolute',
          top: 50 * u,
          left: 44 * u,
          width: 12 * u,
          height: Math.max(1, 2 * u),
          borderRadius: 999,
          backgroundColor: shades ? ink : accent,
        }}
      />
    </>
  );
}

interface AccessoryProps {
  u: number;
  kind: string;
  accent: string;
}

/** Bow, collar, cap or headphones – at most one is worn. */
function Accessory({ u, kind, accent }: AccessoryProps) {
  if (kind === 'bow') {
    const wing: ViewStyle = {
      position: 'absolute',
      top: 12 * u,
      width: 15 * u,
      height: 13 * u,
      borderRadius: 6 * u,
      backgroundColor: accent,
    };
    return (
      <>
        <View style={[wing, { right: 6 * u, transform: [{ rotate: '-18deg' }] }]} />
        <View style={[wing, { right: 19 * u, transform: [{ rotate: '18deg' }] }]} />
        <View
          style={{
            position: 'absolute',
            top: 16 * u,
            right: 18 * u,
            width: 7 * u,
            height: 7 * u,
            borderRadius: 999,
            backgroundColor: accent,
            borderWidth: Math.max(1, 1.5 * u),
            borderColor: 'rgba(0, 0, 0, 0.18)',
          }}
        />
      </>
    );
  }

  if (kind === 'collar') {
    return (
      <>
        <View
          style={{
            position: 'absolute',
            top: 86 * u,
            left: 22 * u,
            width: 56 * u,
            height: 10 * u,
            borderRadius: 5 * u,
            backgroundColor: accent,
          }}
        />
        {/* The tag, so the collar is not just a stripe. */}
        <View
          style={{
            position: 'absolute',
            top: 93 * u,
            left: 46 * u,
            width: 8 * u,
            height: 8 * u,
            borderRadius: 999,
            backgroundColor: '#F1B434',
            borderWidth: Math.max(1, 1 * u),
            borderColor: 'rgba(0, 0, 0, 0.2)',
          }}
        />
      </>
    );
  }

  if (kind === 'cap') {
    return (
      <>
        {/* The dome, cut off at the bottom by the peak in front of it. */}
        <View
          style={{
            position: 'absolute',
            top: 6 * u,
            left: 24 * u,
            width: 52 * u,
            height: 26 * u,
            borderTopLeftRadius: 26 * u,
            borderTopRightRadius: 26 * u,
            backgroundColor: accent,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 28 * u,
            left: 18 * u,
            width: 64 * u,
            height: 8 * u,
            borderRadius: 4 * u,
            backgroundColor: accent,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 2 * u,
            left: 46 * u,
            width: 8 * u,
            height: 8 * u,
            borderRadius: 999,
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
          }}
        />
      </>
    );
  }

  if (kind === 'headphones') {
    const cup: ViewStyle = {
      position: 'absolute',
      top: 40 * u,
      width: 14 * u,
      height: 24 * u,
      borderRadius: 7 * u,
      backgroundColor: accent,
    };
    return (
      <>
        {/*
          Only the upper arc of the band: a full ring would draw its lower half
          straight across the muzzle. Dropping the bottom border leaves a ∩,
          whose two ends read as the arms running down to the cups.
        */}
        <View
          style={{
            position: 'absolute',
            top: 14 * u,
            left: 8 * u,
            width: 84 * u,
            height: 40 * u,
            borderTopLeftRadius: 42 * u,
            borderTopRightRadius: 42 * u,
            borderTopWidth: Math.max(2, 5 * u),
            borderLeftWidth: Math.max(2, 5 * u),
            borderRightWidth: Math.max(2, 5 * u),
            borderBottomWidth: 0,
            borderColor: accent,
            backgroundColor: 'transparent',
          }}
        />
        <View style={[cup, { left: 2 * u }]} />
        <View style={[cup, { right: 2 * u }]} />
      </>
    );
  }

  return null;
}
