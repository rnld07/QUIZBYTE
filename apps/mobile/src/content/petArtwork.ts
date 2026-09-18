import type { ImageSourcePropType } from 'react-native';

import type { AvatarSpecies } from '@quizbyte/shared';

/**
 * One layer of a drawn pet.
 *
 * Two files, because a single one cannot do both jobs: `fur` is a flat shape
 * that gets painted in the chosen coat colour, `lines` sits on top and keeps
 * whatever colours it was drawn in – outlines, eyes, nose, markings.
 *
 * Both are optional. Only `lines` means a fully coloured drawing that ignores
 * the coat setting; only `fur` means a silhouette in the coat colour.
 */
export interface ArtworkLayers {
  /** Painted in the chosen colour – draw it in solid white. */
  fur?: ImageSourcePropType;
  /** Drawn exactly as it is, over the coloured layer. */
  lines?: ImageSourcePropType;
  /** Nudges the whole piece into place – see `Placement`. */
  placement?: Placement;
}

/**
 * Where a piece of artwork sits, relative to the avatar's own box.
 *
 * The files are drawn one by one and never line up by themselves: a hat has to
 * ride high on the head, a collar low on the neck, and one cat's eyes sit a
 * few pixels above another's. Correcting that here rather than in the files
 * means a redraw does not have to hit the same margins again.
 *
 * Offsets are fractions of the avatar's size, so they hold at every size the
 * avatar is shown at – 0.1 is a tenth of the picture, up or left when negative.
 */
export interface Placement {
  /** 1 is the file as drawn; 0.8 makes it a fifth smaller. */
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

/**
 * Artwork for the pet avatars.
 *
 * Metro resolves `require()` at build time, so every file needs a static entry
 * here – see `assets/pets/README.md`. Anything left out falls back to the shape
 * the app draws itself, and a breed can be swapped in on its own: a single
 * registered entry does not oblige you to draw the other nine.
 *
 * The keys must match the breed ids in `packages/shared` avatar.ts.
 */
const PET_ARTWORK: Record<AvatarSpecies, Record<string, ArtworkLayers>> = {
  cat: {
     shorthair: {
       fur: require('../../assets/pets/cat/shorthair-fur.png'),
       lines: require('../../assets/pets/cat/shorthair-lines.png'),
     },
     tabby: {
       fur: require('../../assets/pets/cat/tabby-fur.png'),
       lines: require('../../assets/pets/cat/tabby-lines.png'),
     },
     siam: {
       fur: require('../../assets/pets/cat/siam-fur.png'),
       lines: require('../../assets/pets/cat/siam-lines.png'),
     },
     longhair: {
       fur: require('../../assets/pets/cat/longhair-fur.png'),
       lines: require('../../assets/pets/cat/longhair-lines.png'),
    },
     perser: {
       fur: require('../../assets/pets/cat/perser-fur.png'),
       lines: require('../../assets/pets/cat/perser-lines.png'),
       // Drawn a touch high in its file – this puts the eyes on the same line
       // as every other cat's.
       placement: { offsetY: 0.015 },
    },
  },
  dog: {
     beagle: {
       fur: require('../../assets/pets/dog/beagle-fur.png'),
       lines: require('../../assets/pets/dog/beagle-lines.png'),
       // Drawn high in its file – this brings the eyes down onto the line the
       // other breeds share.
       placement: { offsetY: 0.15 },
     },
     shepherd: {
       fur: require('../../assets/pets/dog/shepherd-fur.png'),
       lines: require('../../assets/pets/dog/shepherd-lines.png'),
     },
     dalmatiner: {
       fur: require('../../assets/pets/dog/dalmatiner-fur.png'),
       lines: require('../../assets/pets/dog/dalmatiner-lines.png'),
       // Drawn high in its file – this brings the eyes down onto the line the
       // other breeds share.
       placement: { offsetY: 0.1 },
     },
     mops: {
       fur: require('../../assets/pets/dog/mops-fur.png'),
       lines: require('../../assets/pets/dog/mops-lines.png'),
       // Drawn high in its file – this brings the eyes down onto the line the
       // other breeds share.
       placement: { offsetY: 0.07 },
     },
     husky: {
       fur: require('../../assets/pets/dog/husky-fur.png'),
       lines: require('../../assets/pets/dog/husky-lines.png'),
     },
  },
};

/**
 * Glasses and accessories, keyed by the ids from `packages/shared` avatar.ts.
 *
 * Here the `fur` layer takes the chosen **accent** colour, not the coat colour –
 * that is what the "Farbe des Zubehörs" setting drives.
 */
const ACCESSORY_ARTWORK: Record<string, ArtworkLayers> = {
   round: {
     fur: require('../../assets/pets/accessories/glasses-round-fur.png'),
     lines: require('../../assets/pets/accessories/glasses-round-lines.png'),
     // A shade smaller: drawn to the full width of the file, they sat wider
     // than the face they belong on.
     placement: { scale: 0.88 },
   },
   square: {
     fur: require('../../assets/pets/accessories/glasses-square-fur.png'),
     lines: require('../../assets/pets/accessories/glasses-square-lines.png'),
     // A shade smaller: drawn to the full width of the file, they sat wider
     // than the face they belong on.
     placement: { scale: 0.88 },
   },
   shades: {
     fur: require('../../assets/pets/accessories/glasses-shades-fur.png'),
     lines: require('../../assets/pets/accessories/glasses-shades-lines.png'),
     // A shade smaller: drawn to the full width of the file, they sat wider
     // than the face they belong on.
     placement: { scale: 0.88 },
   },
   bow: {
     fur: require('../../assets/pets/accessories/bow-fur.png'),
     lines: require('../../assets/pets/accessories/bow-lines.png'),
     // Low at the neck, and small – it is a ribbon, not a bonnet.
     placement: { scale: 0.5, offsetY: 0.33 },
   },
   collar: {
     fur: require('../../assets/pets/accessories/collar-fur.png'),
     lines: require('../../assets/pets/accessories/collar-lines.png'),
     // The same low line as the bow – both go round the neck.
     placement: { scale: 0.82, offsetY: 0.31 },
   },
   cap: {
     fur: require('../../assets/pets/accessories/cap-fur.png'),
     lines: require('../../assets/pets/accessories/cap-lines.png'),
     // Right on top of the head. The crown runs off the top of the frame, which
     // is what a worn hat does – one that fits inside the picture floats above
     // the ears instead.
     placement: { offsetY: -0.5 },
   },
   headphones: {
     fur: require('../../assets/pets/accessories/headphones-fur.png'),
     lines: require('../../assets/pets/accessories/headphones-lines.png'),
     placement: { offsetY: -0.14 },
   },
};

/** The artwork for one breed, or undefined while none is registered. */
export function petArtwork(species: AvatarSpecies, breed: string): ArtworkLayers | undefined {
  const layers = PET_ARTWORK[species][breed];
  return layers && (layers.fur || layers.lines) ? layers : undefined;
}

/** The artwork for one accessory or pair of glasses. `none` never has any. */
export function accessoryArtwork(id: string): ArtworkLayers | undefined {
  if (id === 'none') return undefined;
  const layers = ACCESSORY_ARTWORK[id];
  return layers && (layers.fur || layers.lines) ? layers : undefined;
}
