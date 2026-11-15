import { describe, expect, it } from 'vitest';
import {
  classifyCountError,
  COUNT_ERROR_TEXT,
  COUNT_KINDS,
  countAnswer,
  countCoaching,
  countText,
  countTop,
  isRightCount,
  makeCountProblem,
  type CountProblem,
} from '../src/math/count';

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function each(check: (p: CountProblem, rung: number) => void): void {
  for (const kind of COUNT_KINDS) {
    for (let rung = 0; rung <= countTop(kind); rung++) {
      const random = rng(11 + rung);
      for (let i = 0; i < 300; i++) {
        const p = makeCountProblem(kind, random, rung);
        expect(p.kind).toBe(kind);
        check(p, rung);
      }
    }
  }
}

describe('early number problems', () => {
  it('every kind and rung makes a problem with a sound answer', () => {
    each((p) => {
      expect(countText(p).length).toBeGreaterThan(4);
      expect(isRightCount(p, countAnswer(p))).toBe(true);
      if (p.kind === 'more') {
        const bigger = p.a > p.b ? 'left' : 'right';
        expect(p.a).not.toBe(p.b);
        const wantsFewer = p.mode === 'piles' && p.ask === 'fewer';
        expect(p.answer).toBe(wantsFewer ? (bigger === 'left' ? 'right' : 'left') : bigger);
      }
    });
  });

  it('keeps each rung inside its number range', () => {
    each((p, rung) => {
      if (p.kind === 'count') {
        expect(p.n).toBeLessThanOrEqual(rung <= 2 ? 10 : 20);
        if (rung === 0) expect(p.n).toBeLessThanOrEqual(5);
        if (p.mode === 'give') expect(p.pile).toBeGreaterThan(p.n);
      }
      if (p.kind === 'more' && rung <= 3) expect(Math.max(p.a, p.b)).toBeLessThanOrEqual([5, 10, 10, 20][rung] as number);
      if (p.kind === 'more' && rung === 0) expect(Math.abs(p.a - p.b)).toBeGreaterThanOrEqual(2);
      if (p.kind === 'ten' && p.mode === 'fill') {
        expect(p.have + p.answer).toBe(p.whole);
        expect(p.answer).toBeGreaterThan(0);
        expect(p.bare).toBe(rung === 4);
      }
      if (p.kind === 'ten' && p.mode !== 'fill') expect(p.n).toBeGreaterThan(10);
      if (p.kind === 'place' && p.mode === 'shift') {
        expect(p.answer).toBeGreaterThan(10);
        expect(p.answer).toBeLessThan(100);
      }
      if (p.kind === 'place' && rung <= 2) expect(p.n).toBeLessThan(100);
      if (p.kind === 'place' && (rung === 1 || rung === 2)) expect(p.n % 11).not.toBe(0);
    });
  });

  it('the first rung of each kind is the easiest thing the game asks', () => {
    expect(makeCountProblem('count', rng(1), 0)).toMatchObject({ mode: 'howMany', scatter: false });
    expect(makeCountProblem('more', rng(1), 0)).toMatchObject({ mode: 'piles', ask: 'more' });
    expect(makeCountProblem('ten', rng(1), 0)).toMatchObject({ mode: 'fill', whole: 5 });
    expect(makeCountProblem('place', rng(1), 0)).toMatchObject({ mode: 'read' });
  });

  it('a rung outside the ladder is clamped', () => {
    expect(makeCountProblem('count', rng(3), 99)).toMatchObject({ mode: 'give' });
    expect(makeCountProblem('ten', rng(3), -4)).toMatchObject({ whole: 5 });
  });
});

describe('what a wrong answer says', () => {
  it('names counting slips and the wrong pile', () => {
    expect(classifyCountError({ kind: 'count', mode: 'howMany', n: 7, scatter: true }, 8)).toBe('count-slip');
    expect(classifyCountError({ kind: 'count', mode: 'give', n: 7, pile: 10 }, 4)).toBe('other');
    expect(classifyCountError({ kind: 'more', mode: 'piles', a: 3, b: 6, ask: 'more', answer: 'right' }, 'left')).toBe('other-pile');
  });

  it('tells the missing part from the part that is there', () => {
    const fill: CountProblem = { kind: 'ten', mode: 'fill', whole: 10, have: 6, answer: 4, bare: false };
    expect(classifyCountError(fill, 6)).toBe('said-what-is-there');
    expect(classifyCountError(fill, 10)).toBe('said-the-whole');
    expect(classifyCountError(fill, 5)).toBe('count-slip');
  });

  it('sees a crate counted as one berry', () => {
    expect(classifyCountError({ kind: 'ten', mode: 'teen', n: 14, answer: 14 }, 5)).toBe('crates-as-ones');
    expect(classifyCountError({ kind: 'place', mode: 'read', n: 34, answer: 34 }, 7)).toBe('crates-as-ones');
    expect(classifyCountError({ kind: 'place', mode: 'read', n: 34, answer: 34 }, 43)).toBe('reversed-digits');
    expect(classifyCountError({ kind: 'place', mode: 'build', n: 52, answer: 52 }, 25)).toBe('reversed-digits');
  });

  it('sees ten more answered with the ones, or the wrong way', () => {
    const more: CountProblem = { kind: 'place', mode: 'shift', n: 34, by: 10, answer: 44 };
    expect(classifyCountError(more, 35)).toBe('changed-the-ones');
    expect(classifyCountError(more, 24)).toBe('wrong-way');
    expect(classifyCountError(more, 44)).toBe('other');
  });

  it('has spoken coaching and a grown-up text for every pattern', () => {
    const p: CountProblem = { kind: 'place', mode: 'shift', n: 34, by: -10, answer: 24 };
    for (const pattern of Object.keys(COUNT_ERROR_TEXT) as Array<keyof typeof COUNT_ERROR_TEXT>) {
      expect(COUNT_ERROR_TEXT[pattern].length).toBeGreaterThan(8);
      expect(countCoaching(p, pattern).length).toBeGreaterThan(8);
    }
  });
});
