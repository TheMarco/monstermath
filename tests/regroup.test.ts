import { describe, expect, it } from 'vitest';
import {
  addBlocks, blocksValue, classifyError, isTidy, makeProblem, pack, RUNG_TEXT, toBlocks, topRung, unpack, type Delivery, type Problem,
} from '../src/math/regroup';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('makeProblem', () => {
  const rng = seeded(7);
  it('keeps each type true to its name', () => {
    for (let i = 0; i < 400; i++) {
      for (const type of ['add', 'addR', 'sub', 'subR'] as Delivery[]) {
        const p = makeProblem(type, rng);
        const carries = (p.a % 10) + (p.b % 10) >= 10;
        const borrows = p.a % 10 < p.b % 10;
        expect(p.a).toBeGreaterThanOrEqual(10);
        expect(p.b).toBeGreaterThanOrEqual(10);
        if (type === 'add') { expect(carries).toBe(false); expect(p.answer).toBe(p.a + p.b); expect(p.answer).toBeLessThan(100); }
        if (type === 'addR') { expect(carries).toBe(true); expect(p.answer).toBeLessThan(100); }
        if (type === 'sub') { expect(borrows).toBe(false); expect(p.answer).toBe(p.a - p.b); expect(p.answer).toBeGreaterThan(0); }
        if (type === 'subR') { expect(borrows).toBe(true); expect(p.answer).toBeGreaterThan(0); }
      }
    }
  });
  it('has a rung where sums pass 100', () => {
    const sums = Array.from({ length: 300 }, () => makeProblem('addR', rng, 4).answer);
    expect(Math.min(...sums)).toBeGreaterThanOrEqual(100);
    expect(Math.max(...sums)).toBeLessThan(190);
  });
});

describe('blocks', () => {
  it('packing is carrying', () => {
    const joined = addBlocks(toBlocks(27), toBlocks(15));
    expect(joined).toEqual([0, 3, 12]);
    expect(isTidy(joined)).toBe(false);
    const packed = pack(joined, 2);
    expect(packed).toEqual([0, 4, 2]);
    expect(blocksValue(packed!)).toBe(42);
    expect(pack([0, 4, 2], 2)).toBeNull();
  });
  it('opening a crate is borrowing', () => {
    expect(unpack(toBlocks(52), 1)).toEqual([0, 4, 12]);
    expect(unpack([0, 0, 5], 1)).toBeNull();
  });
  it('ten crates make a cart', () => {
    expect(pack([0, 12, 5], 1)).toEqual([1, 2, 5]);
  });
});

describe('classifyError', () => {
  const add: Problem = { type: 'addR', a: 27, b: 15, answer: 42 };
  const sub: Problem = { type: 'subR', a: 52, b: 28, answer: 24 };
  it('spots a dropped carry', () => expect(classifyError(add, 32)).toBe('no-carry'));
  it('spots smaller-from-larger', () => expect(classifyError(sub, 36)).toBe('smaller-from-larger'));
  it('spots a forgotten borrowed ten', () => expect(classifyError(sub, 34)).toBe('forgot-borrowed-ten'));
  it('spots a transposition', () => expect(classifyError(add, 24)).toBe('reversed-digits'));
  it('spots the wrong operation', () => {
    expect(classifyError(add, 12)).toBe('wrong-operation');
    expect(classifyError(sub, 80)).toBe('wrong-operation');
  });
  it('spots slips', () => {
    expect(classifyError(add, 43)).toBe('off-by-one');
    expect(classifyError(add, 52)).toBe('off-by-ten');
    expect(classifyError(add, 77)).toBe('other');
  });
});

describe('ladders', () => {
  const rng = seeded(11);
  const types = ['add', 'addR', 'sub', 'subR'] as Delivery[];

  it('every rung of every kind keeps the idea of the kind', () => {
    for (const type of types) {
      expect(topRung(type)).toBe(RUNG_TEXT[type].length - 1);
      for (let rung = 0; rung <= topRung(type); rung++) {
        for (let i = 0; i < 200; i++) {
          const p = makeProblem(type, rng, rung);
          const adding = type === 'add' || type === 'addR';
          expect(p.answer, `${type} ${rung}`).toBe(adding ? p.a + p.b : p.a - p.b);
          expect(p.answer).toBeGreaterThan(0);
          expect(p.answer).toBeLessThan(200);
          if (adding) expect((p.a % 10) + (p.b % 10) >= 10).toBe(type === 'addR');
          else expect(p.a % 10 < p.b % 10).toBe(type === 'subR');
          // A cart (one hundred) is never opened or split: past 100 the answer keeps its hundred.
          if (!adding && p.a >= 100) expect(p.answer).toBeGreaterThanOrEqual(100);
        }
      }
    }
  });

  it('starts below two-digit numbers and ends above them', () => {
    for (let i = 0; i < 200; i++) {
      expect(makeProblem('add', rng, 0).answer).toBeLessThanOrEqual(10);
      expect(makeProblem('sub', rng, 0).a).toBeLessThan(10);
      const cross = makeProblem('addR', rng, 0);
      expect(cross.a).toBeLessThan(10);
      expect(cross.b).toBeLessThan(10);
      expect(cross.answer).toBeGreaterThan(10);
      expect(makeProblem('subR', rng, 0).a).toBeLessThan(20);
      expect(makeProblem('add', rng, 5).a).toBeGreaterThan(100);
      expect(makeProblem('subR', rng, 4).a).toBeGreaterThan(100);
    }
  });

  it('two digits and one digit sit in the middle, same idea as the full problem', () => {
    for (let i = 0; i < 300; i++) {
      for (const type of types) {
        const p = makeProblem(type, rng, type === 'add' || type === 'sub' ? 2 : 1);
        expect(p.b).toBeLessThan(10);
        expect(p.a).toBeGreaterThanOrEqual(12);
        expect(p.answer).toBeLessThan(100);
      }
    }
  });
});
