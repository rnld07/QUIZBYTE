import { describe, expect, it } from 'vitest';

import {
  NO_FRAME_ID,
  PROFILE_FRAMES,
  bestUnlockedFrame,
  equippedFrame,
  frameById,
  isFrameUnlocked,
  nextFrame,
  resolveFrame,
  unlockedFrames,
} from './frames';

describe('PROFILE_FRAMES', () => {
  it('has unique ids', () => {
    expect(new Set(PROFILE_FRAMES.map((frame) => frame.id)).size).toBe(PROFILE_FRAMES.length);
  });

  it('is ordered by required level', () => {
    const levels = PROFILE_FRAMES.map((frame) => frame.requiredLevel);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });

  it('starts at level 1 and ends at level 100', () => {
    expect(PROFILE_FRAMES[0]?.requiredLevel).toBe(1);
    expect(PROFILE_FRAMES.at(-1)?.requiredLevel).toBe(100);
  });

  it('offers five frames beside the empty one', () => {
    expect(PROFILE_FRAMES.filter((frame) => frame.id !== NO_FRAME_ID)).toHaveLength(5);
  });

  it('carries an emblem from bronze upwards and none below', () => {
    expect(frameById('graphite')?.badge).toBeUndefined();
    for (const id of ['bronze', 'silver', 'gold', 'platinum']) {
      expect(frameById(id)?.badge).toBeTruthy();
    }
  });

  it('never requires a level beyond 100', () => {
    expect(PROFILE_FRAMES.every((frame) => frame.requiredLevel <= 100)).toBe(true);
  });

  it('gives every ramp enough stops to read as metal', () => {
    for (const frame of PROFILE_FRAMES) {
      if (frame.id === NO_FRAME_ID) continue;
      const minimum = frame.style === 'solid' || frame.style === 'dashed' ? 1 : 4;
      expect(frame.colors.length).toBeGreaterThanOrEqual(minimum);
    }
  });
});

describe('unlockedFrames', () => {
  it('gives a fresh account the empty frame and grey', () => {
    expect(unlockedFrames(1).map((frame) => frame.id)).toEqual([NO_FRAME_ID, 'graphite']);
  });

  it('grows with the level', () => {
    expect(unlockedFrames(50).length).toBeGreaterThan(unlockedFrames(25).length);
  });

  it('unlocks everything at level 100', () => {
    expect(unlockedFrames(100)).toHaveLength(PROFILE_FRAMES.length);
  });
});

describe('isFrameUnlocked', () => {
  it('is true from the required level on', () => {
    expect(isFrameUnlocked('bronze', 25)).toBe(true);
    expect(isFrameUnlocked('bronze', 26)).toBe(true);
  });

  it('is false below it', () => {
    expect(isFrameUnlocked('bronze', 24)).toBe(false);
  });

  it('rejects unknown ids', () => {
    expect(isFrameUnlocked('does-not-exist', 100)).toBe(false);
    expect(isFrameUnlocked(null, 100)).toBe(false);
  });
});

describe('nextFrame', () => {
  it('names the next one still to come', () => {
    expect(nextFrame(1)?.requiredLevel).toBe(25);
    expect(nextFrame(25)?.requiredLevel).toBe(50);
  });

  it('is null once everything is unlocked', () => {
    expect(nextFrame(100)).toBeNull();
  });
});

describe('resolveFrame', () => {
  it('returns the frame once it is earned', () => {
    expect(resolveFrame('bronze', 25)?.id).toBe('bronze');
  });

  it('draws nothing for a frame that is not earned yet', () => {
    expect(resolveFrame('platinum', 20)).toBeNull();
  });

  it('draws nothing for the empty frame', () => {
    expect(resolveFrame(NO_FRAME_ID, 100)).toBeNull();
  });

  it('draws nothing for an unknown id', () => {
    expect(resolveFrame('made-up', 100)).toBeNull();
  });
});

describe('frameById', () => {
  it('finds a known frame', () => {
    expect(frameById('gold')?.name).toBe('Gold');
  });

  it('returns undefined otherwise', () => {
    expect(frameById('nope')).toBeUndefined();
  });
});

describe('equippedFrame', () => {
  it('trusts a stored id without checking the level', () => {
    expect(equippedFrame('platinum')?.id).toBe('platinum');
  });

  it('draws nothing for the empty frame or an unknown id', () => {
    expect(equippedFrame(NO_FRAME_ID)).toBeNull();
    expect(equippedFrame('made-up')).toBeNull();
    expect(equippedFrame(null)).toBeNull();
  });
});

describe('bestUnlockedFrame', () => {
  it('is nothing at the very start', () => {
    expect(bestUnlockedFrame(1)?.id).toBe('graphite');
  });

  it('follows the highest rank reached', () => {
    expect(bestUnlockedFrame(24)?.id).toBe('graphite');
    expect(bestUnlockedFrame(25)?.id).toBe('bronze');
    expect(bestUnlockedFrame(80)?.id).toBe('gold');
    expect(bestUnlockedFrame(100)?.id).toBe('platinum');
  });

  it('never returns the empty frame', () => {
    expect(bestUnlockedFrame(1)?.id).not.toBe(NO_FRAME_ID);
  });
});

describe('resolveFrame without a choice', () => {
  /*
    A rank used to be worn the moment it was earned. It is offered now instead –
    the home screen says a frame is ready and puts it on when asked. Arriving on
    its own was a change nobody made, and it left the picker showing every entry
    as unchosen while one of them was on the face above it.
  */
  it('wears nothing until something is picked', () => {
    expect(resolveFrame(null, 50)).toBeNull();
    expect(resolveFrame(undefined, 100)).toBeNull();
    expect(bestUnlockedFrame(100)?.id).toBe('platinum');
  });

  it('keeps a deliberate "no frame" empty', () => {
    expect(resolveFrame(NO_FRAME_ID, 100)).toBeNull();
  });

  it('keeps a deliberate lower rank', () => {
    expect(resolveFrame('bronze', 100)?.id).toBe('bronze');
  });
});
