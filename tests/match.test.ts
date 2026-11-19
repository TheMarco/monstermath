// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { BETWEEN_MATCHES, canMatch, jumps, MATCH_TURNS, MATCHES_PER_DAY, matchInvite, matchPlayed, matchRungs, planMatch, type Rungs } from '../src/match';
import { isAddition, topRung, type Delivery } from '../src/math/regroup';
import { matchScreen } from '../src/screens/match';
import { befriend, freshSave, today, type Save } from '../src/state';
import type { App } from '../src/ui/common';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('planning a match', () => {
  it('chains each bar from its own last answer, at her own level where it can', () => {
    let chained = 0;
    let total = 0;
    for (let sub = 0; sub <= topRung('sub'); sub++) {
      for (let add = 0; add <= topRung('add'); add++) {
        const rungs: Rungs = { add, addR: Math.min(add, topRung('addR')), sub, subR: Math.min(sub, topRung('subR')) };
        for (let seed = 1; seed <= 6; seed++) {
          const plan = planMatch(rungs, seeded(seed * 97 + sub * 7 + add));
          expect(plan).toHaveLength(MATCH_TURNS);
          const bar: Record<string, number | null> = { hit: null, block: null };
          plan.forEach((t, i) => {
            expect(t.kind).toBe(i % 2 === 1 ? 'block' : 'hit');
            expect(isAddition(t.p.type)).toBe(t.kind === 'block');
            expect(t.p.answer).toBe(t.kind === 'block' ? t.p.a + t.p.b : t.p.a - t.p.b);
            expect(t.p.answer).toBeGreaterThan(0);
            expect(t.p.a).toBeLessThanOrEqual(200);
            expect(t.rung).toBeLessThanOrEqual(rungs[t.p.type] as number);
            expect(t.own).toBe(t.rung === rungs[t.p.type]);
            if (bar[t.kind] === null) expect(t.fresh).toBe(true);
            else if (!t.fresh) expect(t.p.a).toBe(bar[t.kind]);
            bar[t.kind] = t.p.answer;
            total += 1;
            if (t.own && (bar[t.kind] === null || !t.fresh || i < 2)) chained += 1;
          });
        }
      }
    }
    // Three hits in a row can run a low power out of room; most turns still chain.
    expect(chained / total).toBeGreaterThan(0.8);
  });

  it('is all hits for a child who only takes away, all blocks for one who only adds', () => {
    expect(planMatch({ sub: 2 }, seeded(4)).map((t) => t.kind)).toEqual(['hit', 'hit', 'hit', 'hit', 'hit']);
    expect(planMatch({ add: 2, addR: 1 }, seeded(4)).map((t) => t.kind)).toEqual(['block', 'block', 'block', 'block', 'block']);
    expect(planMatch({}, seeded(4))).toEqual([]);
  });

  it('starts each sort of turn with the kind she has practised least lately', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const plan = planMatch({ add: 3, addR: 3, sub: 3, subR: 3 }, seeded(seed), ['subR', 'addR', 'sub', 'add']);
      expect(plan[0]?.p.type).toBe('subR');
      expect(plan[1]?.p.type).toBe('addR');
    }
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
  /** Six clean trips of a kind: it goes well without the berries. */
  function fluentIn(save: Save, type: Delivery): void {
    for (let i = 0; i < 6; i++) save.tripLog.push({ t: i + 1, day: '2026-01-01', monster: 'nub', type, a: 5, b: 2, answers: [7], firstTry: true, errors: [], usedBlocks: false });
  }
  function setup(kinds: Delivery[] = ['add', 'addR', 'sub', 'subR']) {
    const save = freshSave();
    for (const id of ['puff', 'nub', 'plum', 'dusk', 'chip'] as const) befriend(save, id);
    save.starter = 'puff';
    kinds.forEach((k) => fluentIn(save, k));
    const went: string[] = [];
    const app = { save, go: (name: string) => went.push(name), commit: () => undefined, reset: () => undefined, reload: () => undefined } as unknown as App;
    return { save, app, went, logged: save.tripLog.length };
  }
  const sumOf = (el: HTMLElement): { a: number; b: number; answer: number; plus: boolean } => {
    const m = /(\d+)\s*([−+])\s*(\d+)/.exec(el.querySelector('.mt-sum')?.textContent ?? '');
    if (!m) throw new Error('no sum on the screen');
    const a = Number(m[1]);
    const b = Number(m[3]);
    return { a, b, plus: m[2] === '+', answer: m[2] === '+' ? a + b : a - b };
  };
  const key = (handle: ReturnType<typeof matchScreen>, k: string): void => handle.onKey?.(new KeyboardEvent('keydown', { key: k }));
  const typeIn = (handle: ReturnType<typeof matchScreen>, n: number): void => {
    for (const d of String(n)) key(handle, d);
    key(handle, 'Enter');
  };

  it('is offered for a kind once it goes well without the berries', () => {
    const save = freshSave();
    for (const id of ['puff', 'nub', 'dusk'] as const) befriend(save, id);
    save.starter = 'puff';
    expect(canMatch(save)).toBe(false);
    expect(matchInvite(save, ['puff', 'nub', 'dusk'])).toBeNull();
    fluentIn(save, 'add');
    expect(canMatch(save)).toBe(true);
    expect(Object.keys(matchRungs(save))).toEqual(['add']);
    fluentIn(save, 'sub');
    expect(Object.keys(matchRungs(save)).sort()).toEqual(['add', 'sub']);
  });

  it('has one friend a day ask for a match, never the buddy, and nobody once it is played', () => {
    const { save } = setup();
    const foe = matchInvite(save, ['puff', 'nub', 'plum'], seeded(3));
    expect(['nub', 'plum']).toContain(foe);
    for (let seed = 1; seed < 6; seed++) expect(matchInvite(save, ['puff', 'nub', 'plum'], seeded(seed))).toBe(foe);
    expect(matchInvite(save, ['puff'])).toBeNull();
  });

  it('has a second friend ask later the same day, once she has played something else', () => {
    const { save } = setup();
    const meadow = ['puff', 'nub', 'plum'] as const;
    const first = matchInvite(save, [...meadow], seeded(3)) as 'nub' | 'plum';
    // The match itself is five trips; they do not count as "something else".
    today(save).trips += 5;
    matchPlayed(save, first);
    expect(matchInvite(save, [...meadow])).toBeNull();
    today(save).trips += BETWEEN_MATCHES - 1;
    expect(matchInvite(save, [...meadow])).toBeNull();
    today(save).treats += 1;
    const second = matchInvite(save, [...meadow], seeded(5));
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    expect(matchInvite(save, [...meadow], seeded(9))).toBe(second);
    matchPlayed(save, second as 'nub');
    today(save).trips += 50;
    expect(matchInvite(save, [...meadow])).toBeNull();
    expect(today(save).match?.played).toBe(MATCHES_PER_DAY);
  });

  it('takes turns: her hit takes their power away, her block adds to her shield', () => {
    const { save, app, logged } = setup();
    const handle = matchScreen(app, { id: 'puff', foe: 'nub' });
    document.body.replaceChildren(handle.el);
    for (let i = 0; i < MATCH_TURNS; i++) {
      const { a, answer, plus } = sumOf(handle.el);
      expect(plus).toBe(i % 2 === 1);
      expect(handle.el.querySelector('.mt-story')?.textContent).toContain(plus ? `shield is ${a}` : `has ${a} power`);
      expect(handle.el.querySelector(plus ? '.mt-hud-mine' : '.mt-hud-foe')?.classList.contains('live')).toBe(true);
      typeIn(handle, answer);
      expect(handle.el.querySelector('.mt-slot')?.textContent).toBe(String(answer));
      expect(handle.el.querySelector(`${plus ? '.mt-hud-mine' : '.mt-hud-foe'} .mt-whole`)?.textContent).toBe(String(answer));
      key(handle, 'Enter');
    }
    expect(save.tripLog).toHaveLength(logged + MATCH_TURNS);
    expect(save.tripLog.slice(logged).every((t) => t.firstTry && t.monster === 'puff')).toBe(true);
    expect(handle.el.querySelector('.mt-finish')).not.toBeNull();
    handle.dispose?.();
  });

  it('is an adding-only match for a child who has only adding', () => {
    const { app } = setup(['add']);
    const handle = matchScreen(app, { id: 'puff', foe: 'nub' });
    document.body.replaceChildren(handle.el);
    expect(sumOf(handle.el).plus).toBe(true);
    expect(handle.el.querySelector('.mt-hud-foe')?.classList.contains('none')).toBe(true);
    handle.dispose?.();
  });

  it('gives the small steps after two misses and the answer after three, and a copied answer earns nothing', () => {
    const { save, app, logged } = setup();
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
    expect(save.tripLog).toHaveLength(logged + 1);
    expect(save.tripLog.at(-1)).toMatchObject({ firstTry: false, helped: true, answers: [answer + 1, answer + 2, answer + 3, answer] });
    expect(save.xp).toBe(before);
    handle.dispose?.();
  });

  it('sends her to the monster that teaches a kind when its answer had to be shown twice', () => {
    const { app } = setup(['sub']);
    const handle = matchScreen(app, { id: 'puff', foe: 'nub' });
    document.body.replaceChildren(handle.el);
    for (let i = 0; i < 2; i++) {
      const { answer } = sumOf(handle.el);
      for (let miss = 1; miss <= 3; miss++) typeIn(handle, answer + miss);
      typeIn(handle, answer);
      if (i === 0) key(handle, 'Enter');
    }
    const buttons = Array.from(handle.el.querySelectorAll('.mt-action button')).map((b) => b.textContent);
    expect(buttons).toEqual(['Play with Dusk']);
    handle.dispose?.();
  });

  it('saves nothing when a grown-up is having a look', () => {
    const { save, app, logged } = setup();
    const handle = matchScreen(app, { id: 'puff', practice: true, rung: 2 });
    document.body.replaceChildren(handle.el);
    typeIn(handle, sumOf(handle.el).answer);
    expect(save.tripLog).toHaveLength(logged);
    handle.dispose?.();
  });
});

describe('match stickers', () => {
  it('come at 1, 5, 10, 20 and 50 matches won', async () => {
    const { claimStickers } = await import('../src/rewards');
    const save = freshSave();
    const ids = (): string[] => save.stickers.filter((s) => s.startsWith('match'));
    claimStickers(save);
    expect(ids()).toEqual([]);
    for (const [wins, have] of [[1, 1], [4, 1], [5, 2], [10, 3], [20, 4], [49, 4], [50, 5]] as const) {
      save.matchWins = wins;
      claimStickers(save);
      expect(ids()).toHaveLength(have);
    }
    expect(ids()).toEqual(['match1', 'match5', 'match10', 'match20', 'match50']);
  });
});
