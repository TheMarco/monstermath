import { describe, expect, it } from 'vitest';
import { fracStartStep } from '../src/intake';
import {
  bottomChoices,
  classifyFracError,
  classifyPick,
  compare,
  FRAC_KINDS,
  fracTop,
  fracWords,
  isRight,
  makeFracProblem,
  MAX_TOP,
  problemText,
  sameValue,
  type FracProblem,
} from '../src/math/fractions';
import { findAnchor } from '../src/ui/charms';
import { buyCharm, buyDecor, CHARMS, DECOR, DECOR_BOUNDS, moveDecor } from '../src/shop';
import { freshSave } from '../src/state';
import { recordingScript } from '../src/voice/lines';

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('fraction problems', () => {
  it('every kind and size makes problems the answer chips can express', () => {
    for (const kind of FRAC_KINDS) {
      for (let step = 0; step <= fracTop(kind); step++) {
        const random = rng(7 + step);
        for (let i = 0; i < 300; i++) {
          const p = makeFracProblem(kind, random, step);
          if (step === fracTop(kind) && 'bare' in p) expect(p.bare).toBe(true);
          expect(p.kind).toBe(kind);
          expect(problemText(p).length).toBeGreaterThan(2);
          if (p.kind === 'times') {
            expect(p.answer).toEqual({ n: p.whole * p.f.n, d: p.f.d });
            expect(p.answer.n).toBeLessThanOrEqual(MAX_TOP);
            expect(bottomChoices(p)).toContain(p.answer.d);
            if (step === 0) expect(p.answer.n).toBeLessThanOrEqual(p.answer.d);
          } else if (p.kind === 'tray') {
            expect(p.answer).toEqual({ n: p.a.n * p.b.n, d: p.a.d * p.b.d });
            expect(p.answer.n).toBeLessThanOrEqual(MAX_TOP);
            expect(p.answer.d).toBeLessThanOrEqual(20);
            expect(bottomChoices(p)).toContain(p.answer.d);
            expect(bottomChoices(p).length).toBeLessThanOrEqual(10);
            if (step === 0) expect(p.a.n * p.b.n).toBe(1);
          } else if (p.kind === 'name') {
            expect(p.f.n).toBeGreaterThan(0);
            expect(p.f.n).toBeLessThan(p.f.d);
            if (p.mode === 'name') expect(bottomChoices(p)).toContain(p.f.d);
            if (step <= 2) expect(p.mode).toBe('name');
            if (step === 0) expect(p.f.n).toBe(1);
            if (p.mode === 'name' && p.on) {
              expect(p.on).toHaveLength(p.f.n);
              expect(new Set(p.on).size).toBe(p.f.n);
            }
          } else if (p.mode === 'compare') {
            expect(p.answer).toBe(compare(p.a, p.b));
          } else {
            expect(sameValue(p.a, { n: p.answer, d: p.d })).toBe(true);
          }
        }
      }
    }
  });

  it('accepts equal forms of a product, but wants the exact count when naming', () => {
    const times: FracProblem = { kind: 'times', whole: 2, f: { n: 1, d: 4 }, answer: { n: 2, d: 4 } };
    expect(isRight(times, { n: 2, d: 4 })).toBe(true);
    expect(isRight(times, { n: 1, d: 2 })).toBe(true);
    expect(isRight(times, { n: 2, d: 8 })).toBe(false);
    const naming: FracProblem = { kind: 'name', mode: 'name', f: { n: 2, d: 4 } };
    expect(isRight(naming, { n: 2, d: 4 })).toBe(true);
    expect(isRight(naming, { n: 1, d: 2 })).toBe(false);
  });

  it('names the common wrong ideas', () => {
    const naming: FracProblem = { kind: 'name', mode: 'name', f: { n: 3, d: 4 } };
    expect(classifyFracError(naming, { n: 4, d: 3 })).toBe('swapped');
    expect(classifyFracError(naming, { n: 1, d: 4 })).toBe('counted-empty');
    expect(classifyFracError(naming, { n: 3, d: 1 })).toBe('part-to-part');
    const times: FracProblem = { kind: 'times', whole: 3, f: { n: 1, d: 4 }, answer: { n: 3, d: 4 } };
    expect(classifyFracError(times, { n: 3, d: 12 })).toBe('times-both');
    expect(classifyFracError(times, { n: 1, d: 12 })).toBe('times-bottom');
    expect(classifyFracError(times, { n: 4, d: 4 })).toBe('times-added');
    const tray: FracProblem = { kind: 'tray', a: { n: 1, d: 2 }, b: { n: 1, d: 3 }, answer: { n: 1, d: 6 } };
    expect(classifyFracError(tray, { n: 1, d: 5 })).toBe('tray-added');
    expect(classifyFracError(tray, { n: 1, d: 3 })).toBe('tray-one-cut');
    const pair: FracProblem = { kind: 'same', mode: 'compare', a: { n: 1, d: 2 }, b: { n: 1, d: 8 }, answer: 'left' };
    expect(classifyPick(pair, 'right')).toBe('bigger-bottom');
  });

  it('has a recorded name for every fraction it reads aloud', () => {
    const recorded = new Set(recordingScript().map(([key]) => key));
    expect(fracWords({ n: 3, d: 4 })).toBe('three fourths');
    expect(fracWords({ n: 1, d: 2 })).toBe('one half');
    expect(fracWords({ n: 3, d: 7 })).toBeNull();
    for (let step = 0; step <= 4; step++) {
      const random = rng(99 + step);
      for (let i = 0; i < 300; i++) {
        const p = makeFracProblem('name', random, step);
        if (p.kind === 'name') expect(recorded.has(`f_${p.f.n}_${p.f.d}`), `${p.f.n}/${p.f.d}`).toBe(true);
      }
    }
  });

  it('starts fraction work from what the first-day check showed', () => {
    expect(fracStartStep(undefined, 'name')).toBe(0);
    expect(fracStartStep({ frac: 1 }, 'name')).toBe(1);
    expect(fracStartStep({ frac: 2 }, 'name')).toBe(2);
    expect(fracStartStep({ frac: 2 }, 'same')).toBe(0);
    expect(fracStartStep({ frac: 4 }, 'same')).toBe(3);
    expect(fracStartStep({ frac: 5 }, 'times')).toBe(1);
    expect(fracStartStep({ frac: 5 }, 'tray')).toBe(0);
  });
});

describe('shop', () => {
  it('sells each thing once, and only for enough berries', () => {
    const save = freshSave();
    save.berries = 20;
    expect(buyCharm(save, 'crown')).toBe('ok');
    expect(save.berries).toBe(0);
    expect(buyCharm(save, 'crown')).toBe('owned');
    expect(buyDecor(save, 'flowers')).toBe('poor');
    save.berries = 10;
    expect(buyDecor(save, 'flowers')).toBe('ok');
    expect(save.decor).toHaveLength(1);
    moveDecor(save, 'flowers', 5000, -40);
    expect(save.decor?.[0]).toEqual({ id: 'flowers', x: DECOR_BOUNDS.right, y: DECOR_BOUNDS.top });
    expect(new Set(CHARMS.map((c) => c.id)).size).toBe(CHARMS.length);
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
  });

  it('finds the top of a monster for its charm', () => {
    // A body from row 10 down, columns 20 to 29, with a thin horn tip far left at rows 4 to 5.
    const solid = (x: number, y: number): boolean => (y >= 10 && x >= 20 && x < 30) || (y >= 4 && y < 6 && x === 5);
    const a = findAnchor(solid, 48);
    expect(a.y).toBeCloseTo(10 / 48, 2);
    expect(a.x).toBeCloseTo(25 / 48, 2);
    expect(findAnchor(() => false, 48)).toEqual({ x: 0.5, y: 0.06 });
  });
});
