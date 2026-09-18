import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { DEFAULT_AVATAR_CONFIG } from '@quizbyte/shared';
import type { AvatarConfig, ProfileFrame } from '@quizbyte/shared';

import { darkColors, makeStyles, radius } from '@/theme';

import { PetAvatar } from './PetAvatar';

interface AvatarProps {
  name: string;
  size?: number;
  /** The pet to draw; the default cat stands in while a profile is loading. */
  config?: AvatarConfig | null;
  /** Unlocked profile frame drawn around the picture; `null` draws none. */
  frame?: ProfileFrame | null;
}

/** Gap between the picture and its frame, so the ring never touches the face. */
const FRAME_GAP = 3;
/** How many segments a `dashed` ring is built from. */
const DASH_SEGMENTS = 12;

/**
 * Profile picture: the pet the user put together, drawn at the given size.
 *
 * A frame is drawn *around* the given size rather than inside it, so adding one
 * never shrinks the picture and every existing call site keeps its layout.
 */
export function Avatar({ name, size = 36, config, frame }: AvatarProps) {
  const styles = useStyles();

  const picture = (
    <View style={[styles.circle, { width: size, height: size }]} accessibilityLabel={`Avatar von ${name}`}>
      <PetAvatar size={size} config={config ?? DEFAULT_AVATAR_CONFIG} />
    </View>
  );

  if (!frame) return picture;

  const ring = frame.width + FRAME_GAP;
  const outer = size + ring * 2;

  // The emblem grows with the avatar but stays legible on the small ones.
  const badgeSize = Math.max(14, Math.round(size * 0.3));

  return (
    // The box stays exactly `size`, whatever frame is on: the ring is drawn
    // outside it. Otherwise picking a thicker frame would grow the avatar and
    // push everything below it down.
    <View style={[styles.frameBox, { width: size, height: size }]}>
      <View pointerEvents="none" style={[styles.ringLayer, { width: outer, height: outer, top: -ring, left: -ring }]}>
        <ProfileFrameRing frame={frame} size={outer} />
      </View>
      {picture}

      {/*
        The rank emblem sits centred on the lower edge of the picture: centred
        over the face would cover it, and below the frame it would add height to
        every list row.
      */}
      {frame.badge ? (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              bottom: -badgeSize * 0.15,
              backgroundColor: frame.colors[1] ?? frame.colors[0],
            },
          ]}
        >
          <Ionicons name={resolveBadgeIcon(frame.badge)} size={Math.round(badgeSize * 0.62)} color={darkColors.white} />
        </View>
      ) : null}
    </View>
  );
}

type IoniconName = keyof typeof Ionicons.glyphMap;

/** The catalogue stores plain Ionicons names; anything unknown falls back. */
function resolveBadgeIcon(name: string): IoniconName {
  return name in Ionicons.glyphMap ? (name as IoniconName) : 'ribbon';
}

/** Draws one frame style at the given outer size. */
function ProfileFrameRing({ frame, size }: { frame: ProfileFrame; size: number }) {
  const styles = useStyles();
  const [first, second] = frame.colors;
  const second_ = second ?? first;
  // A hair outside the band at any size – two points is the floor, below which
  // it stops being visible at all. Kept deliberately tight: in a list a halo
  // wider than this reads as a second ring rather than as a glow.
  const haloWidth = Math.max(2, Math.round(size * 0.035));

  if (frame.style === 'gradient' || frame.style === 'glow') {
    // A ring is a filled gradient with the middle punched out by the picture on
    // top. Several stops across the diagonal give the band a light and a dark
    // side, which is what makes it read as metal rather than as a flat circle.
    const ramp = frame.colors.length >= 2 ? frame.colors : [first, second_];
    return (
      <>
        {frame.style === 'glow' ? (
          /*
            The halo takes the accent, not the first stop: on platinum that is
            white, and a white haze on a dark screen is barely visible.

            Its width is a share of the ring rather than a fixed eight points.
            Eight points is a hair around a 96 pt profile picture and a second
            ring around a 32 pt one in a list – which is exactly how it looked
            in the friends tab.
          */
          <View
            style={[
              styles.ring,
              {
                width: size + haloWidth * 2,
                height: size + haloWidth * 2,
                top: -haloWidth,
                left: -haloWidth,
                backgroundColor: `${second_}40`,
              },
            ]}
          />
        ) : null}
        <LinearGradient
          colors={ramp as [string, string, ...string[]]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.ring, { width: size, height: size }]}
        />
        <FrameBezel size={size} width={frame.width} />
      </>
    );
  }

  if (frame.style === 'double') {
    return (
      <>
        <View style={[styles.ring, styles.hollow, { width: size, height: size, borderWidth: frame.width, borderColor: first }]} />
        <View
          style={[
            styles.ring,
            styles.hollow,
            {
              width: size - frame.width * 2 - 2,
              height: size - frame.width * 2 - 2,
              top: frame.width + 1,
              left: frame.width + 1,
              borderWidth: 1,
              borderColor: second_,
            },
          ]}
        />
      </>
    );
  }

  if (frame.style === 'dashed') {
    // Real dashes are not available on a circle, so short bars are placed
    // around it – close enough to read as a segmented ring at avatar size.
    const radiusPx = (size - frame.width) / 2;
    return (
      <>
        {Array.from({ length: DASH_SEGMENTS }, (_, index) => {
          const angle = (index / DASH_SEGMENTS) * 2 * Math.PI;
          return (
            <View
              key={index}
              style={[
                styles.dash,
                {
                  width: frame.width,
                  height: Math.max(4, size / DASH_SEGMENTS),
                  backgroundColor: first,
                  left: size / 2 + Math.cos(angle) * radiusPx - frame.width / 2,
                  top: size / 2 + Math.sin(angle) * radiusPx - Math.max(4, size / DASH_SEGMENTS) / 2,
                  transform: [{ rotate: `${angle + Math.PI / 2}rad` }],
                },
              ]}
            />
          );
        })}
      </>
    );
  }

  return (
    <>
      <View style={[styles.ring, styles.hollow, { width: size, height: size, borderWidth: frame.width, borderColor: first }]} />
      <FrameBezel size={size} width={frame.width} />
    </>
  );
}

/**
 * The two hairlines that turn a coloured band into a mount: a bright one along
 * the inner edge and a dark one along the outer. Without them the ring looks
 * like a circle someone filled in.
 */
function FrameBezel({ size, width }: { size: number; width: number }) {
  const styles = useStyles();
  const inner = size - width * 2;

  return (
    <>
      <View style={[styles.ring, styles.hollow, styles.outerEdge, { width: size, height: size }]} />
      <View
        style={[
          styles.ring,
          styles.hollow,
          styles.innerEdge,
          { width: inner, height: inner, top: width, left: width },
        ]}
      />
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  circle: {
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frameBox: { alignItems: 'center', justifyContent: 'center' },
  ringLayer: { position: 'absolute' },
  ring: { position: 'absolute', top: 0, left: 0, borderRadius: radius.full },
  hollow: { backgroundColor: 'transparent' },
  outerEdge: { borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.30)' },
  innerEdge: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.30)' },
  dash: { position: 'absolute', borderRadius: radius.full },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
}));
