import { describe, expect, it } from 'vitest';
import { classify, evaluate, isCorrect, roundComplete, score, type Expr } from '../src/math/expr';
import { factorPairs, hintFor } from '../src/math/hints';

const e = (a: number, op: Expr['op'], b: number): Expr => ({ a, op, b });

describe('evaluate', () => {
  it('handles the four operations', () => {
    expect(evaluate(e(100, '+', 25))).toEqual({ ok: true, value: 125 });
    expect(evaluate(e(30, '-', 6))).toEqual({ ok: true, value: 24 });
    expect(evaluate(e(25, '*', 5))).toEqual({ ok: true, value: 125 });
    expect(evaluate(e(48, '/', 2))).toEqual({ ok: true, value: 24 });
  });
  it('rejects division by zero and uneven sharing', () => {
    expect(evaluate(e(5, '/', 0))).toEqual({ ok: false, reason: 'zero-divide' });
    expect(evaluate(e(25, '/', 4))).toEqual({ ok: false, reason: 'not-even', quotient: 6, remainder: 1 });
    expect(isCorrect(e(25, '/', 4), 6)).toBe(false);
  });
});

describe('classify', () => {
  it("names the teacher's default answers as easy", () => {
    expect(classify(e(125, '+', 0))).toBe('identity');
    expect(classify(e(0, '+', 125))).toBe('identity');
    expect(classify(e(125, '*', 1))).toBe('identity');
    expect(classify(e(125, '/', 1))).toBe('identity');
    expect(classify(e(125, '-', 0))).toBe('identity');
    expect(classify(e(124, '+', 1))).toBe('near');
    expect(classify(e(126, '-', 1))).toBe('near');
  });
  it('names real work by operation', () => {
    expect(classify(e(100, '+', 25))).toBe('add');
    expect(classify(e(130, '-', 5))).toBe('sub');
    expect(classify(e(25, '*', 5))).toBe('mul');
    expect(classify(e(250, '/', 2))).toBe('div');
  });
});

describe('score', () => {
  it('pays more for richer thinking', () => {
    const easy = score(e(24, '+', 0), []).hearts;
    const near = score(e(23, '+', 1), []).hearts;
    const add = score(e(13, '+', 11), []).hearts;
    const mul = score(e(6, '*', 4), []).hearts;
    expect(easy).toBeLessThan(near);
    expect(near).toBeLessThan(add);
    expect(add).toBeLessThan(mul);
  });
  it('gives nothing for an exact repeat', () => {
    const s = score(e(20, '+', 4), [e(20, '+', 4)]);
    expect(s.hearts).toBe(0);
    expect(s.repeat).toBe('same');
  });
  it('treats a flip as a small win, once', () => {
    const s = score(e(4, '+', 20), [e(20, '+', 4)]);
    expect(s.repeat).toBe('flip');
    expect(s.hearts).toBe(1);
  });
  it('tags doubles and round numbers', () => {
    expect(score(e(12, '+', 12), []).tags).toContain('double');
    expect(score(e(20, '+', 4), []).tags).toContain('tens');
    expect(score(e(20, '+', 4), []).tags).toContain('new-move');
  });
  it('nudges toward another operation after three of a kind', () => {
    const prior = [e(20, '+', 4), e(12, '+', 12), e(14, '+', 10)];
    const s = score(e(18, '+', 6), prior);
    expect(s.tired).toBe(true);
    expect(s.hearts).toBe(1);
  });
  it('cannot fill the meter with easy answers alone', () => {
    const target = 24;
    const easy: Expr[] = [
      e(target, '+', 0), e(0, '+', target), e(target, '-', 0), e(target, '*', 1), e(1, '*', target), e(target, '/', 1),
      e(target - 1, '+', 1), e(1, '+', target - 1), e(target + 1, '-', 1),
      e(target, '+', 0), e(target, '*', 1),
    ];
    const found: Expr[] = [];
    let hearts = 0;
    for (const x of easy) {
      const s = score(x, found);
      hearts += s.hearts;
      if (s.repeat !== 'same') found.push(x);
    }
    expect(hearts).toBeLessThan(10);
  });
  it('three thoughtful treats fill the meter', () => {
    const found: Expr[] = [];
    let hearts = 0;
    for (const x of [e(20, '+', 4), e(30, '-', 6), e(6, '*', 4)]) {
      hearts += score(x, found).hearts;
      found.push(x);
    }
    expect(hearts).toBeGreaterThanOrEqual(10);
  });
});

describe('roundComplete', () => {
  it('needs the favorite treat as well as a full meter', () => {
    const adds = [e(20, '+', 4), e(12, '+', 12), e(14, '+', 10)];
    expect(roundComplete(10, 10, adds, 'mul')).toBe(false);
    expect(roundComplete(10, 10, [...adds, e(6, '*', 4)], 'mul')).toBe(true);
    expect(roundComplete(10, 10, adds, 'any')).toBe(true);
    expect(roundComplete(9, 10, adds, 'any')).toBe(false);
  });
});

describe('hints', () => {
  it('finds factor pairs', () => {
    expect(factorPairs(24)).toEqual([[2, 12], [3, 8], [4, 6]]);
    expect(factorPairs(13)).toEqual([]);
  });
  it('leads with the favorite treat and leaves one number to find', () => {
    const hint = hintFor(24, 'mul', []);
    expect(hint?.kind).toBe('mul');
    if (hint?.kind === 'mul') expect(hint.rows * hint.cols).toBe(24);
  });
  it('gives a place-value split for addition', () => {
    const hint = hintFor(24, 'add', []);
    expect(hint).toMatchObject({ kind: 'add', a: 20, b: 4 });
  });
  it('every hint leads to a correct expression', () => {
    for (let target = 4; target <= 125; target++) {
      for (const fav of ['add', 'sub', 'mul', 'div', 'any'] as const) {
        const hint = hintFor(target, fav, []);
        expect(hint).not.toBeNull();
        if (!hint) continue;
        const built: Expr =
          hint.kind === 'add' ? e(hint.a, '+', hint.b)
          : hint.kind === 'sub' ? e(hint.a, '-', hint.b)
          : hint.kind === 'mul' ? e(hint.rows, '*', hint.cols)
          : e(hint.total, '/', hint.groups);
        expect(isCorrect(built, target)).toBe(true);
        expect(['identity', 'near']).not.toContain(classify(built));
      }
    }
  });
  it('falls back to another operation for a prime number', () => {
    expect(hintFor(13, 'mul', [])?.kind).not.toBe('mul');
  });
});
