import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { avatarBreed, avatarFur, describeAvatar } from '@quizbyte/shared';
import type { AvatarConfig } from '@quizbyte/shared';

import { PetAvatar } from '../ui/PetAvatar';

interface PetBodyProps {
  /** Height of the whole animal; the width follows from it. */
  size: number;
  config: AvatarConfig;
}

/**
 * The whole animal, sitting.
 *
 * The head is the avatar the rest of the app already draws – same breed, same
 * coat, same cap – and everything below it is added here. One head, drawn in
 * one place: a second copy would drift from the profile picture the first time
 * either of them was touched.
 *
 * Sitting rather than standing: a seated pose is stable at the edge of a screen,
 * reads as friendly rather than as an interruption, and needs no walk cycle to
 * look like it belongs there. Proportions are deliberately chibi – a big head on
 * a small round body – which is what keeps it cute at 24 pt of head.
 *
 * Drawn from plain views on a 100×100 grid, like the face: no asset, sharp at
 * any size, and it costs nothing to render next to a quiz.
 */
export function PetBody({ size, config }: PetBodyProps) {
  const fur = avatarFur(config.fur);
  const breed = avatarBreed(config.species, config.breed);
  const u = size / 100;
  const isCat = config.species === 'cat';

  // Head takes the top two thirds; the body is what is left under it.
  const headSize = 62 * u;

  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={describeAvatar(config)}>
      {/* The ground shadow. Without something under it the animal floats. */}
      <View
        style={{
          position: 'absolute',
          bottom: 1 * u,
          left: 24 * u,
          width: 52 * u,
          height: 7 * u,
          borderRadius: 999,
          backgroundColor: 'rgba(3, 7, 13, 0.28)',
        }}
      />

      <Tail u={u} isCat={isCat} base={fur.base} shade={fur.shade} />

      {/* Hind legs first: the body sits in front of them and hides the join. */}
      <Paw u={u} left={20} bottom={7} width={20} height={13} color={fur.shade} />
      <Paw u={u} left={60} bottom={7} width={20} height={13} color={fur.shade} />

      {/* The body: one rounded blob, a little wider on the fluffy breeds. */}
      <View
        style={{
          position: 'absolute',
          bottom: 8 * u,
          left: (breed.traits.fluffy ? 22 : 25) * u,
          width: (breed.traits.fluffy ? 56 : 50) * u,
          height: 44 * u,
          borderTopLeftRadius: 26 * u,
          borderTopRightRadius: 26 * u,
          borderBottomLeftRadius: 22 * u,
          borderBottomRightRadius: 22 * u,
          backgroundColor: fur.base,
        }}
      />

      {/* A lighter chest, so the body is not one flat shape. Painted in white
          rather than in the coat's shade: it has to lift on a black cat as
          well as on a white one. */}
      <View
        style={{
          position: 'absolute',
          bottom: 12 * u,
          left: 36 * u,
          width: 28 * u,
          height: 30 * u,
          borderRadius: 14 * u,
          backgroundColor: 'rgba(255, 255, 255, 0.16)',
        }}
      />

      {/* Front paws, resting against the chest. */}
      <Paw u={u} left={31} bottom={9} width={15} height={12} color={fur.base} outline />
      <Paw u={u} left={54} bottom={9} width={15} height={12} color={fur.base} outline />

      {/* The head last, on top of the shoulders. */}
      <View style={{ position: 'absolute', top: 0, left: (100 * u - headSize) / 2 }}>
        <PetAvatar size={headSize} config={config} />
      </View>
    </View>
  );
}

/**
 * The tail.
 *
 * A cat's curls up behind the body, a dog's is a short stub – two rectangles
 * with a rounded cap is enough at this size, and a real curve would want a path
 * and a drawing library for something nobody will look at twice.
 */
function Tail({ u, isCat, base, shade }: { u: number; isCat: boolean; base: string; shade: string }) {
  if (isCat) {
    return (
      <>
        <View
          style={{
            position: 'absolute',
            bottom: 12 * u,
            right: 8 * u,
            width: 9 * u,
            height: 34 * u,
            borderRadius: 999,
            backgroundColor: shade,
            transform: [{ rotate: '22deg' }],
          }}
        />
        {/* The tip flicks the other way, which is what makes it read as a
            curl rather than as a stick. */}
        <View
          style={{
            position: 'absolute',
            bottom: 38 * u,
            right: 2 * u,
            width: 9 * u,
            height: 16 * u,
            borderRadius: 999,
            backgroundColor: base,
            transform: [{ rotate: '-24deg' }],
          }}
        />
      </>
    );
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 26 * u,
        right: 12 * u,
        width: 9 * u,
        height: 20 * u,
        borderRadius: 999,
        backgroundColor: shade,
        transform: [{ rotate: '34deg' }],
      }}
    />
  );
}

/** One paw or hind foot: a rounded pad, optionally with a hairline around it. */
function Paw({
  u,
  left,
  bottom,
  width,
  height,
  color,
  outline,
}: {
  u: number;
  left: number;
  bottom: number;
  width: number;
  height: number;
  color: string;
  outline?: boolean;
}) {
  const style: ViewStyle = {
    position: 'absolute',
    left: left * u,
    bottom: bottom * u,
    width: width * u,
    height: height * u,
    borderRadius: 999,
    backgroundColor: color,
  };

  // The front paws sit on the chest in the same colour as the body, so they
  // need an edge to be visible at all.
  return <View style={outline ? [style, { borderWidth: Math.max(1, 1.2 * u), borderColor: 'rgba(3, 7, 13, 0.22)' }] : style} />;
}
