// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { canMatch, jumps, MATCH_TURNS, matchRungs, planMatch, type Rungs } from '../src/match';
import { isAddition, topRung, type Delivery } from '../src/math/regroup';
import { matchScreen } from '../src/screens/match';
import { befriend, freshSave, monster } from '../src/state';
import type { App } from '../src/ui/common';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('planning a match', () => {
  it('chains every turn from the answer before it, at her own level where it can', () => {
    let chained = 0;
    let total = 0;
    for (let sub = 0; sub <= topRung('sub'); sub++) {
      for (let add = 0; add <= topRung('add'); add++) {
        const rungs: Rungs = { add, addR: Math.min(add, topRung('addR')), sub, subR: Math.min(sub, topRung('subR')) };
        for (let seed = 1; seed <= 6; seed++) {
          const plan = planMatch(rungs, seeded(seed * 97 + sub * 7 + add));
          expect(plan).toHaveLength(MATCH_TURNS);
          plan.forEach((t, i) => {
            expect(t.kind).toBe(i % 2 === 1 ? 'boost' : 'hit');
            expect(isAddition(t.p.type)).toBe(t.kind === 'boost');
            expect(t.p.answer).toBe(t.kind === 'boost' ? t.p.a + t.p.b : t.p.a - t.p.b);
            expect(t.p.answer).toBeGreaterThan(0);
            expect(t.p.a).toBeLessThanOrEqual(200);
            expect(t.rung).toBeLessThanOrEqual(rungs[t.p.type] as number);
            expect(t.own).toBe(t.rung === rungs[t.p.type]);
            if (i === 0) expect(t.fresh).toBe(true);
            else if (!t.fresh) expect(t.p.a).toBe(plan[i - 1]!.p.answer);
            total += 1;
            if (t.own && (i === 0 || !t.fresh)) chained += 1;
          });
        }
      }
    }
    // Levels far apart cannot chain; the rest should.
    expect(chained / total).toBeGreaterThan(0.6);
  });

  it('chains fully when adding and taking away are at the same level', () => {
    for (let rung = 0; rung <= 4; rung++) {
      for (let seed = 1; seed <= 10; seed++) {
        const plan = planMatch({ add: rung, addR: rung, sub: rung, subR: Math.min(rung, topRung('subR')) }, seeded(seed * 31 + rung));
        expect(plan.every((t, i) => t.own && (i === 0 || !t.fresh))).toBe(true);
      }
    }
  });

  it('is all hits for a child who only takes away, and nothing without taking away', () => {
    expect(planMatch({ sub: 2 }, seeded(4)).map((t) => t.kind)).toEqual(['hit', 'hit', 'hit', 'hit', 'hit']);
    expect(planMatch({ add: 2, addR: 1 }, seeded(4))).toEqual([]);
  });
});

describe('small steps', () => {
  const p = (type: Delivery, a: number, b: number) => ({ type, a, b, answer: isAddition(type) ? a + b : a - b });
  it('takes tens first and stops at the ten on the way', () => {
    expect(jumps(p('subR', 52, 27)).map((j) => [j.from, j.by, j.to])).toEqual([[52, 20, 32], [32, 2, 30], [30, 5, 25]]);
    expect(jumps(p('sub', 47, 23)).map((j) => j.by)).toEqual([20, 3]);
    expect(jumps(p('subR', 60, 37)).map((j) => j.by)).toEqual([30, 7]);
    expect(jumps(p('addR', 47, 39)).map((j) => [j.from, j.by, j.to])).toEqual([[47, 30, 77], [77, 3, 80], [80, 6, 86]]);
    expect(jumps(p('add', 45, 14)).map((j) => j.by)).toEqual([10, 4]);
    expect(jumps(p('sub', 9, 4)).map((j) => j.by)).toEqual([4]);
  });
  it('always lands on the answer', () => {
    for (const type of ['add', 'addR', 'sub', 'subR'] as Delivery[]) {
      for (let a = 11; a < 190; a += 7) {
        for (let b = 1; b < Math.min(a - 1, 97); b += 5) {
          const prob = p(type, a, b);
          expect(jumps(prob).at(-1)?.to).toBe(prob.answer);
        }
      }
    }
  });
});

describe('the match screen', () => {
  function setup() {
    const save = freshSave();
    for (const id of ['puff', 'nub', 'plum', 'dusk', 'chip'] as const) befriend(save, id);
    save.starter = 'puff';
    const went: string[] = [];
    const app = { save, go: (name: string) => went.push(name), commit: () => undefined, reset: () => undefined, reload: () => undefined } as unknown as App;
    return { save, app, went };
  }
  const sumOf = (el: HTMLElement): { a: number; b: number; answer: number } => {
    const m = /(\d+)\s*([−+])\s*(\d+)/.exec(el.querySelector('.mt-sum')?.textContent ?? '');
    if (!m) throw new Error('no sum on the screen');
    const a = Number(m[1]);
    const b = Number(m[3]);
    return { a, b, answer: m[2] === '+' ? a + b : a - b };
  };
  const key = (handle: ReturnType<typeof matchScreen>, k: string): void => handle.onKey?.(new KeyboardEvent('keydown', { key: k }));
  const typeIn = (handle: ReturnType<typeof matchScreen>, n: number): void => {
    for (const d of String(n)) key(handle, d);
    key(handle, 'Enter');
  };

  it('is offered once a take-away monster is a friend', () => {
    const save = freshSave();
    befriend(save, 'puff');
    befriend(save, 'nub');
    expect(canMatch(save)).toBe(false);
    befriend(save, 'dusk');
    expect(canMatch(save)).toBe(true);
    expect(Object.keys(matchRungs(save)).sort()).toEqual(['add', 'sub']);
  });

  it('plays five problems, logs them, and ends with a round for her monster', () => {
    const { save, app } = setup();
    const handle = matchScreen(app, { id: 'puff', foe: 'nub' });
    document.body.replaceChildren(handle.el);
    for (let i = 0; i < MATCH_TURNS; i++) {
      const { a, answer } = sumOf(handle.el);
      expect(handle.el.querySelector('.mt-story')?.textContent).toContain(`has ${a} power`);
      typeIn(handle, answer);
      expect(handle.el.querySelector('.mt-slot')?.textContent).toBe(String(answer));
      key(handle, 'Enter');
    }
    expect(save.tripLog).toHaveLength(MATCH_TURNS);
    expect(save.tripLog.every((t) => t.firstTry && t.monster === 'puff')).toBe(true);
    expect(handle.el.querySelector('.mt-finish')).not.toBeNull();
    expect(monster(save, 'puff').rounds).toBe(0);
    handle.dispose?.();
  });

  it('gives the small steps after two misses and the answer after three, and a copied answer earns nothing', () => {
    const { save, app } = setup();
    const handle = matchScreen(app, { id: 'puff', foe: 'nub' });
    document.body.replaceChildren(handle.el);
    const { answer } = sumOf(handle.el);
    const before = save.xp;
    typeIn(handle, answer + 1);
    expect(handle.el.querySelectorAll('.mt-step')).toHaveLength(0);
    typeIn(handle, answer + 2);
    expect(handle.el.querySelectorAll('.mt-step').length).toBeGreaterThan(0);
    expect(handle.el.querySelector('.mt-steps')?.textContent).toContain('?');
    typeIn(handle, answer + 3);
    expect(handle.el.querySelector('.mt-coach')?.textContent).toContain(`Type ${answer}`);
    typeIn(handle, answer);
    expect(save.tripLog).toHaveLength(1);
    expect(save.tripLog[0]).toMatchObject({ firstTry: false, helped: true, answers: [answer + 1, answer + 2, answer + 3, answer] });
    expect(save.xp).toBe(before);
    handle.dispose?.();
  });

  it('saves nothing when a grown-up is having a look', () => {
    const { save, app } = setup();
    const handle = matchScreen(app, { id: 'puff', practice: true, rung: 2 });
    document.body.replaceChildren(handle.el);
    typeIn(handle, sumOf(handle.el).answer);
    expect(save.tripLog).toHaveLength(0);
    handle.dispose?.();
  });
});
