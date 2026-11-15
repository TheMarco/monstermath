import { describe, expect, it } from 'vitest';
import {
  classifyUpperError,
  decText,
  givenText,
  isRightUpper,
  makeUpperProblem,
  MAX_SLICES,
  sliceChoices,
  UPPER_ERROR_TEXT,
  UPPER_KINDS,
  UPPER_RUNG_TEXT,
  upperAnswer,
  upperCoaching,
  upperParts,
  upperText,
  upperTop,
  type UpperError,
  type UpperKind,
  type UpperProblem,
} from '../src/math/upper';
import { LINES } from '../src/voice/lines';

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Of<K extends UpperKind> = UpperProblem & { kind: K };

function each<K extends UpperKind>(kind: K, check: (p: Of<K>, rung: number) => void): void {
  for (let rung = 0; rung <= upperTop(kind); rung++) {
    const random = rng(7 + rung * 13);
    for (let i = 0; i < 400; i++) {
      const p = makeUpperProblem(kind, random, rung);
      expect(p.kind).toBe(kind);
      check(p as Of<K>, rung);
    }
  }
}

const sum = (xs: number[]): number => xs.reduce((total, x) => total + x, 0);
const whole = (...xs: number[]): void => {
  for (const x of xs) expect(Number.isInteger(x), String(x)).toBe(true);
};

describe('bakery problems', () => {
  it('every ladder has five rungs', () => {
    for (const kind of UPPER_KINDS) {
      expect(UPPER_RUNG_TEXT[kind]).toHaveLength(5);
      expect(upperTop(kind)).toBe(4);
    }
  });

  it('every kind and rung makes a problem whose own answer is right', () => {
    for (const kind of UPPER_KINDS) {
      each(kind, (p) => {
        expect(upperText(p).length).toBeGreaterThan(4);
        expect(isRightUpper(p, upperAnswer(p))).toBe(true);
        expect(classifyUpperError(p, upperAnswer(p))).toBe('other');
        expect(givenText(p, upperAnswer(p)).length).toBeGreaterThan(0);
      });
    }
  });

  it('big trays: the parts add up to the product, and each rung has its shape', () => {
    each('mult', (p, rung) => {
      whole(p.a, p.b, p.answer);
      expect(sum(p.cols)).toBe(p.a);
      expect(sum(p.rows)).toBe(p.b);
      expect(p.answer).toBe(p.a * p.b);
      const parts = upperParts(p);
      if (parts.length > 0) expect(sum(parts.map((x) => x.value))).toBe(p.answer);
      // Every number she types fits in a box of four digits.
      expect(p.answer).toBeLessThan(10000);
      if (rung === 0) {
        expect(p.a % 10).toBe(0);
        expect(p.b).toBeLessThanOrEqual(9);
        expect(parts).toHaveLength(0);
      }
      if (rung === 1) expect([parts.length, p.a < 100, p.b <= 9]).toEqual([2, true, true]);
      if (rung === 2) expect([parts.length, p.a >= 100, p.b <= 9]).toEqual([3, true, true]);
      if (rung === 3) {
        expect(p.b % 10).toBe(0);
        expect([0, 2]).toContain(parts.length);
      }
      if (rung === 4) expect([parts.length, p.a < 100, p.b > 10]).toEqual([4, true, true]);
      // No part is a times-zero.
      for (const x of [...p.cols, ...p.rows]) expect(x).toBeGreaterThan(0);
    });
  });

  it('sharing: the numbers divide the way the problem says', () => {
    each('div', (p, rung) => {
      whole(p.total, p.by, p.answer, p.left);
      expect(p.by).toBeGreaterThanOrEqual(2);
      expect(p.by).toBeLessThanOrEqual(9);
      expect(p.by * p.answer + p.left).toBe(p.total);
      expect(p.left).toBeLessThan(p.by);
      const parts = upperParts(p);
      if (p.parts.length > 0) {
        expect(sum(p.parts)).toBe(p.total);
        expect(sum(parts.map((x) => x.value))).toBe(p.answer);
        expect(p.parts.length).toBeGreaterThanOrEqual(2);
        // Every part but the last shares out with nothing left.
        for (const part of p.parts.slice(0, -1)) expect(part % p.by).toBe(0);
        for (const x of parts) expect(x.value).toBeGreaterThan(0);
      }
      if (rung === 0) {
        expect(p.total).toBeLessThanOrEqual(59);
        expect([p.asksLeft, p.loose, p.parts.length]).toEqual([true, true, 0]);
        expect(p.answer).toBeLessThanOrEqual(9);
      }
      if (rung === 1) {
        expect([p.total % 10, p.answer % 10, p.left, p.parts.length]).toEqual([0, 0, 0, 0]);
        // Every tray of ten can be drawn.
        expect(p.total / 10).toBeLessThanOrEqual(36);
      }
      if (rung === 2) expect([p.total >= 10 && p.total <= 99, p.left, p.parts.length, p.asksLeft]).toEqual([true, 0, 2, false]);
      if (rung === 3) expect([p.total >= 10 && p.total <= 99, p.left >= 1, p.parts.length, p.asksLeft]).toEqual([true, true, 2, true]);
      if (rung === 4) expect([p.total >= 100 && p.total <= 999, p.left, p.asksLeft]).toEqual([true, 0, false]);
    });
  });

  it('slices: the answer is the exact sum or difference, never more than one loaf', () => {
    each('fadd', (p, rung) => {
      whole(p.a.n, p.a.d, p.b.n, p.b.d, p.cut, p.answer.n, p.answer.d);
      expect(p.cut % p.a.d).toBe(0);
      expect(p.cut % p.b.d).toBe(0);
      expect(p.answer.d).toBe(p.cut);
      // Cross-multiplied, so no fraction is ever turned into a decimal.
      const sign = p.op === '+' ? 1 : -1;
      expect(p.answer.n * p.a.d * p.b.d).toBe((p.a.n * p.b.d + sign * p.b.n * p.a.d) * p.cut);
      expect(p.answer.n).toBeGreaterThan(0);
      expect(p.answer.n).toBeLessThanOrEqual(p.cut);
      for (const f of [p.a, p.b]) {
        expect(f.n).toBeGreaterThan(0);
        expect(f.n).toBeLessThanOrEqual(f.d);
      }
      // The chips can show it.
      expect(p.cut).toBeLessThanOrEqual(MAX_SLICES);
      const bottoms = sliceChoices(p);
      expect(bottoms).toContain(p.cut);
      expect(bottoms).toContain(p.a.d + p.b.d);
      expect(bottoms.length).toBeLessThanOrEqual(12);
      expect(p.op).toBe(rung === 1 || rung === 3 ? '-' : '+');
      const [small, big] = [Math.min(p.a.d, p.b.d), Math.max(p.a.d, p.b.d)];
      if (rung <= 1) expect(p.a.d).toBe(p.b.d);
      if (rung === 2 || rung === 3) expect([small < big, big % small, p.cut]).toEqual([true, 0, big]);
      if (rung === 4) {
        expect(big % small).not.toBe(0);
        expect(p.cut).toBeGreaterThan(big);
      }
    });
  });

  it('an equal fraction is right, the same top over another bottom is not', () => {
    const p: UpperProblem = { kind: 'fadd', op: '+', a: { n: 2, d: 8 }, b: { n: 2, d: 8 }, cut: 8, answer: { n: 4, d: 8 } };
    expect(isRightUpper(p, { n: 4, d: 8 })).toBe(true);
    expect(isRightUpper(p, { n: 1, d: 2 })).toBe(true);
    expect(isRightUpper(p, { n: 2, d: 4 })).toBe(true);
    expect(isRightUpper(p, { n: 4, d: 16 })).toBe(false);
    expect(isRightUpper(p, { n: 4, d: 0 })).toBe(false);
    expect(sliceChoices(p)).toEqual(expect.arrayContaining([2, 4, 8, 16]));
  });

  it('crumbs: decimals are whole hundredths from start to end', () => {
    each('dec', (p, rung) => {
      if (p.mode === 'read') {
        whole(p.n);
        expect(p.n).toBeGreaterThan(0);
        expect(p.n).toBeLessThan(200);
        expect(rung).toBeLessThanOrEqual(1);
        if (rung === 0) expect([p.n % 10, p.places]).toEqual([0, 1]);
        if (rung === 1) {
          expect(p.n % 10).not.toBe(0);
          expect(p.places).toBe(2);
        }
        expect(decText(p.n, p.places)).toMatch(rung === 0 ? /^[01]\.\d$/ : /^[01]\.\d\d$/);
      } else if (p.mode === 'more') {
        whole(p.a, p.b);
        expect(rung).toBe(2);
        expect(p.a).not.toBe(p.b);
        expect(p.answer).toBe(p.a > p.b ? 'left' : 'right');
        for (const n of [p.a, p.b]) {
          expect(n).toBeGreaterThan(0);
          expect(n).toBeLessThan(100);
        }
      } else {
        whole(p.a, p.b, p.answer);
        expect(p.answer).toBe(p.op === '+' ? p.a + p.b : p.a - p.b);
        expect(p.answer).toBeGreaterThan(0);
        // At most three trays in the picture.
        expect(Math.max(p.a, p.answer)).toBeLessThan(300);
        expect(p.b).toBeGreaterThan(0);
        if (rung === 3) expect([p.a % 10, p.b % 10, p.places]).toEqual([0, 0, 1]);
        if (rung === 4) {
          expect(p.a % 10 !== 0 || p.b % 10 !== 0).toBe(true);
          expect(p.places).toBe(2);
        }
        expect(decText(p.answer, p.places)).toMatch(p.places === 1 ? /^\d\.\d$/ : /^\d\.\d\d$/);
      }
    });
  });

  it('writes decimals without floating point slips', () => {
    expect(decText(30)).toBe('0.3');
    expect(decText(47)).toBe('0.47');
    expect(decText(7)).toBe('0.07');
    expect(decText(130)).toBe('1.3');
    expect(decText(100)).toBe('1.0');
    expect(decText(170, 2)).toBe('1.70');
    expect(decText(125)).toBe('1.25');
    // The sums that go wrong in floating point: 0.1 + 0.2, 0.7 + 0.6, 1.1 − 0.3.
    const add = (a: number, b: number): UpperProblem => ({ kind: 'dec', mode: 'sum', op: '+', a, b, answer: a + b, places: 1 });
    expect(isRightUpper(add(10, 20), 30)).toBe(true);
    expect(isRightUpper(add(70, 60), 130)).toBe(true);
    expect(upperText(add(70, 60))).toBe('0.7 + 0.6');
    expect(givenText(add(70, 60), 130)).toBe('1.3');
    const sub: UpperProblem = { kind: 'dec', mode: 'sum', op: '-', a: 110, b: 30, answer: 80, places: 1 };
    expect(isRightUpper(sub, 80)).toBe(true);
    expect(upperText(sub)).toBe('1.1 − 0.3');
  });

  it('names the mistake in a big tray', () => {
    const one: UpperProblem = { kind: 'mult', a: 20, b: 4, cols: [20], rows: [4], answer: 80 };
    expect(classifyUpperError(one, { parts: [], total: 8 })).toBe('place-value');
    expect(classifyUpperError(one, { parts: [], total: 24 })).toBe('added');
    expect(classifyUpperError(one, { parts: [], total: 81 })).toBe('other');
    const two: UpperProblem = { kind: 'mult', a: 23, b: 4, cols: [20, 3], rows: [4], answer: 92 };
    expect(upperParts(two)).toEqual([{ text: '20 × 4', value: 80 }, { text: '3 × 4', value: 12 }]);
    expect(classifyUpperError(two, { parts: [8, 12], total: 20 })).toBe('place-value');
    expect(classifyUpperError(two, { parts: [24, 7], total: 31 })).toBe('added');
    expect(classifyUpperError(two, { parts: [80, 14], total: 94 })).toBe('part-wrong');
    expect(classifyUpperError(two, { parts: [80, 12], total: 82 })).toBe('total-wrong');
    expect(isRightUpper(two, { parts: [80, 12], total: 92 })).toBe(true);
    // The total alone is not enough: the parts are the method.
    expect(isRightUpper(two, { parts: [70, 22], total: 92 })).toBe(false);
    const tens: UpperProblem = { kind: 'mult', a: 20, b: 30, cols: [20], rows: [30], answer: 600 };
    expect(classifyUpperError(tens, { parts: [], total: 60 })).toBe('place-value');
    expect(classifyUpperError(tens, { parts: [], total: 6 })).toBe('place-value');
  });

  it('names the mistake in a share', () => {
    const p: UpperProblem = { kind: 'div', total: 17, by: 5, parts: [], answer: 3, left: 2, asksLeft: true, loose: true };
    expect(classifyUpperError(p, { parts: [], total: 2, left: 3 })).toBe('leftover-as-answer');
    expect(classifyUpperError(p, { parts: [], total: 2, left: 7 })).toBe('leftover-too-big');
    expect(classifyUpperError(p, { parts: [], total: 85, left: 0 })).toBe('multiplied');
    expect(classifyUpperError(p, { parts: [], total: 4, left: 2 })).toBe('off-one-group');
    expect(isRightUpper(p, { parts: [], total: 3, left: 2 })).toBe(true);
    expect(isRightUpper(p, { parts: [], total: 3, left: 1 })).toBe(false);
    const tens: UpperProblem = { kind: 'div', total: 80, by: 4, parts: [], answer: 20, left: 0, asksLeft: false, loose: false };
    expect(classifyUpperError(tens, { parts: [], total: 2 })).toBe('place-value');
    const split: UpperProblem = { kind: 'div', total: 84, by: 4, parts: [80, 4], answer: 21, left: 0, asksLeft: false, loose: false };
    expect(upperParts(split)).toEqual([{ text: '80 ÷ 4', value: 20 }, { text: '4 ÷ 4', value: 1 }]);
    expect(classifyUpperError(split, { parts: [20, 4], total: 24 })).toBe('part-wrong');
    expect(classifyUpperError(split, { parts: [20, 1], total: 23 })).toBe('total-wrong');
    expect(classifyUpperError(split, { parts: [2, 1], total: 3 })).toBe('place-value');
    expect(classifyUpperError(split, { parts: [320, 16], total: 336 })).toBe('multiplied');
  });

  it('names the mistake with slices', () => {
    const same: UpperProblem = { kind: 'fadd', op: '+', a: { n: 2, d: 8 }, b: { n: 3, d: 8 }, cut: 8, answer: { n: 5, d: 8 } };
    expect(classifyUpperError(same, { n: 5, d: 16 })).toBe('added-bottoms');
    expect(classifyUpperError(same, { n: 6, d: 8 })).toBe('other');
    const fits: UpperProblem = { kind: 'fadd', op: '+', a: { n: 1, d: 2 }, b: { n: 1, d: 4 }, cut: 4, answer: { n: 3, d: 4 } };
    expect(classifyUpperError(fits, { n: 2, d: 6 })).toBe('added-bottoms');
    expect(classifyUpperError(fits, { n: 2, d: 4 })).toBe('no-recut');
    expect(classifyUpperError(fits, { n: 1, d: 4 })).toBe('wrong-sign');
    const away: UpperProblem = { kind: 'fadd', op: '-', a: { n: 1, d: 2 }, b: { n: 3, d: 8 }, cut: 8, answer: { n: 1, d: 8 } };
    expect(classifyUpperError(away, { n: 2, d: 8 })).toBe('wrong-way');
    expect(classifyUpperError(away, { n: 7, d: 8 })).toBe('wrong-sign');
  });

  it('names the mistake with decimals', () => {
    expect(classifyUpperError({ kind: 'dec', mode: 'read', n: 70, places: 1 }, 7)).toBe('hundredths-as-tenths');
    expect(classifyUpperError({ kind: 'dec', mode: 'read', n: 7, places: 2 }, 70)).toBe('hundredths-as-tenths');
    expect(classifyUpperError({ kind: 'dec', mode: 'more', a: 50, b: 45, answer: 'left' }, 'right')).toBe('longer-bigger');
    expect(classifyUpperError({ kind: 'dec', mode: 'more', a: 60, b: 72, answer: 'right' }, 'left')).toBe('other');
    expect(classifyUpperError({ kind: 'dec', mode: 'sum', op: '+', a: 25, b: 40, answer: 65, places: 2 }, 29)).toBe('lined-up');
    expect(classifyUpperError({ kind: 'dec', mode: 'sum', op: '-', a: 125, b: 40, answer: 85, places: 2 }, 121)).toBe('lined-up');
    expect(classifyUpperError({ kind: 'dec', mode: 'sum', op: '+', a: 70, b: 60, answer: 130, places: 1 }, 13)).toBe('past-one');
    expect(classifyUpperError({ kind: 'dec', mode: 'sum', op: '-', a: 90, b: 30, answer: 60, places: 1 }, 120)).toBe('wrong-sign');
  });

  it('every mistake has a description for grown-ups and a spoken line for her', () => {
    const p = makeUpperProblem('mult');
    for (const pattern of Object.keys(UPPER_ERROR_TEXT) as UpperError[]) {
      expect(UPPER_ERROR_TEXT[pattern].length).toBeGreaterThan(8);
      const line = LINES[upperCoaching(p, pattern)];
      expect(line.length).toBeGreaterThan(10);
      // Coaching points at the picture, never at the child.
      expect(line).not.toMatch(/wrong|mistake|you forgot|careless/i);
    }
  });
});
