import { describe, expect, it } from 'vitest';
import { animName, removeKey } from '../src/ui/anim';

const px = (...rgba: number[]): Uint8ClampedArray => new Uint8ClampedArray(rgba);

describe('background removal', () => {
  it('makes the pure magenta background fully transparent', () => {
    const d = px(255, 0, 255, 255, 240, 12, 236, 255);
    removeKey(d);
    expect(d[3]).toBe(0);
    expect(d[7]).toBe(0);
  });

  it('leaves the monsters alone, including the pink, purple and green ones', () => {
    const colours = [
      [255, 255, 255], // storm fleece
      [28, 27, 46], // outline
      [220, 50, 110], // reef axolotl gills
      [240, 110, 150], // dusk bat fur
      [120, 80, 200], // dusk bat wings
      [130, 70, 160], // orchard bird
      [100, 190, 60], // leaves
      [40, 140, 70], // leaf dragon
      [255, 150, 190], // lotus
      [255, 223, 60], // lightning
      [60, 200, 220], // crystal
      [235, 60, 50], // berry bear
    ];
    for (const [r, g, b] of colours) {
      const d = px(r as number, g as number, b as number, 255);
      removeKey(d);
      expect(d[3], `${r},${g},${b}`).toBe(255);
      expect(d[0]).toBe(r);
    }
  });

  it('fades edge pixels and takes their tint off', () => {
    // Half outline, half background.
    const d = px(142, 14, 150, 255);
    removeKey(d);
    expect(d[3]).toBeGreaterThan(0);
    expect(d[3]).toBeLessThan(255);
    expect(d[0]).toBe(14);
    expect(d[2]).toBe(14);
  });
});

describe('clip names', () => {
  it('follow the picture names', () => {
    expect(animName('puff', 1, 'idle')).toBe('puff-idle');
    expect(animName('puff', 2, 'happy')).toBe('puff-2-happy');
    expect(animName('puff', 3, 'idle')).toBe('puff-3-idle');
  });
});
