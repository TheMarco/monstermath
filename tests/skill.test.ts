import { beforeEach, describe, expect, it } from 'vitest';
import type { Delivery } from '../src/math/regroup';
import { ensureWishes } from '../src/rewards';
import { easeAfterBreak, finishTreatRound, fluent, roundQuality, skillHealth, startTreatRound, treatLevel, treatStart, weakestFriend } from '../src/skill';
import { befriend, clock, freshSave, monster, today, type Save } from '../src/state';

function setDay(day: number): void {
  clock.now = () => new Date(2026, 10, day, 16, 0, 0);
}

function trip(save: Save, type: Delivery, firstTry: boolean, helped = false): void {
  save.tripLog.push({ t: 0, day: '2026-11-13', monster: 'nub', type, a: 20, b: 11, answers: [31], firstTry, errors: [], usedBlocks: false, helped });
}

beforeEach(() => setDay(13));

describe('where treat numbers start', () => {
  it('follows the first-day check, one kind of treat at a time', () => {
    expect(treatStart(undefined, 'mul')).toBe(0);
    expect(treatStart({ place: 5, mul: 1 }, 'mul')).toBe(0);
    expect(treatStart({ place: 5, mul: 3 }, 'mul')).toBe(1);
    expect(treatStart({ place: 5, mul: 6 }, 'mul')).toBe(2);
    expect(treatStart({ place: 5, div: 5 }, 'div')).toBe(2);
    expect(treatStart({ place: 5, add: 2 }, 'add')).toBe(1);
    expect(treatStart({ place: 5, sub: 1 }, 'sub')).toBe(0);
    expect(treatStart({ place: 5, sub: 7 }, 'sub')).toBe(3);
    // Any-treat monsters follow addition: 27 + 5 done means numbers from 24 to 36.
    expect(treatStart({ place: 4, add: 4 }, 'any')).toBe(2);
    expect(treatStart({ place: 4, add: 3 }, 'any')).toBe(1);
    expect(treatStart({ place: 5, add: 7 }, 'any')).toBe(3);
  });

  it('keeps numbers small until two-digit numbers read as tens and ones', () => {
    expect(treatStart({ place: 2, mul: 6 }, 'mul')).toBe(1);
    expect(treatStart({ place: 2, add: 7 }, 'add')).toBe(1);
    expect(treatStart({ place: 2, add: 7 }, 'any')).toBe(1);
  });

  it('is one ladder for every monster that wants the same kind of treat', () => {
    const save = freshSave();
    save.intakeLevels = { place: 4, add: 4 };
    save.starter = 'puff';
    save.exprLog.push({ t: 0, day: '2026-11-13', monster: 'puff', target: 12, a: 10, op: '+', b: 2, correct: true, kind: 'add', hearts: 4, hinted: false });
    // The first starter is no longer held back: it starts where the check says.
    expect(treatLevel(save, 'any').rung).toBe(2);
    treatLevel(save, 'any').rung = 3;
    for (const id of ['puff', 'pim', 'fizz', 'tup'] as const) {
      const round = startTreatRound(save, id, () => 0.99);
      expect(round.rung).toBe(3);
      expect([40, 48, 50, 60]).toContain(round.target);
    }
    // Glim loves times treats and keeps its own ladder.
    expect(treatLevel(save, 'mul').rung).toBe(0);
  });

  it('carries over the biggest size from saves that kept one per monster', () => {
    const save = freshSave();
    save.intakeLevels = { place: 4, add: 2 };
    monster(save, 'puff').pool = 0;
    monster(save, 'fizz').pool = 3;
    monster(save, 'tup').pool = 1;
    monster(save, 'glim').pool = 2;
    expect(treatLevel(save, 'any').rung).toBe(3);
    expect(treatLevel(save, 'mul').rung).toBe(2);
  });

  it('starts the very first round a size down, as a warm-up', () => {
    const save = freshSave();
    save.intakeLevels = { place: 4, add: 4 };
    const warm = startTreatRound(save, 'puff', () => 0.99);
    expect(warm.target).toBe(20);
    // Not marked on the ladder: it was below her size.
    expect(finishTreatRound(save, 'puff', { ...warm, misses: 0 })).toBeNull();
    save.exprLog.push({ t: 0, day: '2026-11-13', monster: 'puff', target: 20, a: 10, op: '+', b: 10, correct: true, kind: 'add', hearts: 4, hinted: false });
    expect(startTreatRound(save, 'puff', () => 0.99).target).toBe(36);
  });
});

describe('treat numbers follow how the rounds go', () => {
  const clean = { misses: 0, helped: 0, solo: 0, dropped: 0 };
  const rough = { misses: 6, helped: 0, solo: 0, dropped: 0 };
  function play(save: Save, id: 'puff' | 'fizz' | 'glim', how: typeof clean): void {
    const round = startTreatRound(save, id, () => 0.99);
    finishTreatRound(save, id, { ...round, ...how });
  }

  it('three clean rounds out of four move up, with any monster of the kind; two rough rounds move down', () => {
    const save = freshSave();
    save.intakeLevels = { place: 4, add: 2 };
    save.exprLog.push({ t: 0, day: '2026-11-13', monster: 'puff', target: 12, a: 10, op: '+', b: 2, correct: true, kind: 'add', hearts: 4, hinted: false });
    expect(treatLevel(save, 'any').rung).toBe(1);
    play(save, 'puff', clean);
    play(save, 'fizz', { ...clean, misses: 3 });
    play(save, 'fizz', clean);
    expect(treatLevel(save, 'any').rung).toBe(1);
    play(save, 'puff', clean);
    expect(treatLevel(save, 'any').rung).toBe(2);
    play(save, 'fizz', rough);
    expect(treatLevel(save, 'any').rung).toBe(2);
    play(save, 'puff', rough);
    expect(treatLevel(save, 'any').rung).toBe(1);
    // The times-treat ladder did not move.
    expect(treatLevel(save, 'mul').rung).toBe(0);
  });

  it('a round that began at another size says nothing about this one', () => {
    const save = freshSave();
    save.intakeLevels = { place: 4, add: 4 };
    save.exprLog.push({ t: 0, day: '2026-11-13', monster: 'puff', target: 12, a: 10, op: '+', b: 2, correct: true, kind: 'add', hearts: 4, hinted: false });
    const old = startTreatRound(save, 'puff', () => 0.99);
    treatLevel(save, 'any').rung = 3;
    expect(finishTreatRound(save, 'puff', { ...old, ...rough })).toBeNull();
    expect(treatLevel(save, 'any').recent).toEqual([]);
  });

  it('a few wrong tries are exploring; a hint counts when she then makes one of her own', () => {
    expect(roundQuality({ misses: 0 })).toBe('clean');
    expect(roundQuality({ misses: 2 })).toBe('clean');
    expect(roundQuality({ misses: 3 })).toBe('ok');
    expect(roundQuality({ misses: 5 })).toBe('rough');
    expect(roundQuality({ misses: 1, helped: 1, solo: 0 })).toBe('ok');
    expect(roundQuality({ misses: 1, helped: 1, solo: 1 })).toBe('clean');
    expect(roundQuality({ misses: 0, helped: 2, solo: 2 })).toBe('clean');
    expect(roundQuality({ misses: 0, helped: 1, solo: 0, dropped: 1 })).toBe('rough');
  });

  it('steps every treats ladder down after a long break', () => {
    const save = freshSave();
    save.intakeLevels = { place: 4, add: 4 };
    monster(save, 'puff');
    save.days['2026-11-01'] = { treats: 3, trips: 0, wins: 1, rewarded: false };
    expect(easeAfterBreak(save)).toBe(true);
    expect(save.treatLevels?.any?.rung).toBe(1);
  });
});

describe('berry blocks step back only when the sums go well', () => {
  it('needs several recent trips right the first time, with no recent help', () => {
    const save = freshSave();
    expect(fluent(save, 'addR')).toBe(false);
    for (let i = 0; i < 3; i++) trip(save, 'addR', true);
    expect(fluent(save, 'addR')).toBe(false);
    trip(save, 'addR', true);
    expect(fluent(save, 'addR')).toBe(true);
    expect(fluent(save, 'subR')).toBe(false);
    trip(save, 'addR', false, true);
    expect(fluent(save, 'addR')).toBe(false);
  });
});

describe('review goes to the weakest skill first', () => {
  it('rates a skill from its recent problems', () => {
    const save = freshSave();
    befriend(save, 'plum');
    expect(skillHealth(save, 'plum')).toBeNull();
    trip(save, 'addR', false);
    trip(save, 'addR', false);
    trip(save, 'addR', true);
    trip(save, 'addR', true);
    expect(skillHealth(save, 'plum')).toBe(0.5);
    expect(weakestFriend(save)).toBe('plum');
  });

  it('the shaky skill asks to play before the least played friend', () => {
    const save = freshSave();
    for (const id of ['puff', 'dab', 'nub', 'plum'] as const) befriend(save, id);
    monster(save, 'plum').rounds = 9;
    monster(save, 'puff').rounds = 5;
    monster(save, 'dab').rounds = 1;
    for (let i = 0; i < 4; i++) trip(save, 'add', true);
    for (let i = 0; i < 4; i++) trip(save, 'addR', i === 0);
    ensureWishes(save);
    expect((today(save).wishes ?? []).map((w) => w.id)).toEqual(['plum', 'nub']);
  });
});

describe('after a long break', () => {
  it('steps every size down once, and not again for the same break', () => {
    const save = freshSave();
    befriend(save, 'plum');
    befriend(save, 'glim');
    monster(save, 'plum').step = 2;
    monster(save, 'glim').pool = 3;
    setDay(3);
    today(save).trips = 2;
    setDay(6);
    expect(easeAfterBreak(save)).toBe(false); // three days is not a break
    expect(monster(save, 'plum').step).toBe(2);
    setDay(13);
    expect(easeAfterBreak(save)).toBe(true);
    expect(monster(save, 'plum').step).toBe(1);
    // Glim's old size of its own becomes the shared times-treat size, then steps down.
    expect(save.treatLevels?.mul?.rung).toBe(2);
    expect(easeAfterBreak(save)).toBe(false);
    expect(monster(save, 'plum').step).toBe(1);
  });
});
