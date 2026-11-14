import { beforeEach, describe, expect, it } from 'vitest';
import type { Delivery } from '../src/math/regroup';
import { ensureWishes } from '../src/rewards';
import { adaptPool, easeAfterBreak, fluent, poolOf, roundQuality, skillHealth, startPool, weakestFriend } from '../src/skill';
import { befriend, clock, freshSave, monster, today, type Save } from '../src/state';

function setDay(day: number): void {
  clock.now = () => new Date(2026, 10, day, 16, 0, 0);
}

function trip(save: Save, type: Delivery, firstTry: boolean, helped = false): void {
  save.tripLog.push({ t: 0, day: '2026-11-13', monster: 'nub', type, a: 20, b: 11, answers: [31], firstTry, errors: [], usedBlocks: false, helped });
}

beforeEach(() => setDay(13));

describe('where treat numbers start', () => {
  it('follows the first-day check, strand by strand', () => {
    expect(startPool(undefined, 'glim', false)).toBe(0);
    expect(startPool({ place: 5, mul: 1 }, 'glim', false)).toBe(0);
    expect(startPool({ place: 5, mul: 3 }, 'glim', false)).toBe(1);
    expect(startPool({ place: 5, mul: 6 }, 'glim', false)).toBe(2);
    expect(startPool({ place: 5, div: 5 }, 'fenn', false)).toBe(2);
    expect(startPool({ place: 5, add: 2 }, 'dab', false)).toBe(1);
    expect(startPool({ place: 5, sub: 1 }, 'moss', false)).toBe(0);
    // The first starter begins smallest; a starter met later begins a pool up.
    expect(startPool({ place: 5, add: 3 }, 'puff', true)).toBe(0);
    expect(startPool({ place: 5, add: 3 }, 'pim', false)).toBe(1);
  });

  it('keeps numbers small until two-digit numbers read as tens and ones', () => {
    expect(startPool({ place: 2, mul: 6 }, 'glim', false)).toBe(1);
    expect(startPool({ place: 2, add: 7 }, 'dab', false)).toBe(1);
  });
});

describe('treat numbers follow how the rounds go', () => {
  it('two clean rounds move up, one rough round moves down', () => {
    const save = freshSave();
    save.intakeLevels = { place: 5, mul: 3 };
    expect(poolOf(save, 'glim')).toBe(1);
    adaptPool(save, 'glim', 'clean');
    expect(poolOf(save, 'glim')).toBe(1);
    adaptPool(save, 'glim', 'clean');
    expect(poolOf(save, 'glim')).toBe(2);
    adaptPool(save, 'glim', 'ok');
    expect(poolOf(save, 'glim')).toBe(2);
    adaptPool(save, 'glim', 'rough');
    expect(poolOf(save, 'glim')).toBe(1);
    adaptPool(save, 'glim', 'rough');
    adaptPool(save, 'glim', 'rough');
    expect(poolOf(save, 'glim')).toBe(0);
  });

  it('a few wrong tries are exploring, many wrong tries or two hints are a rough round', () => {
    expect(roundQuality(0, 0)).toBe('clean');
    expect(roundQuality(2, 0)).toBe('clean');
    expect(roundQuality(3, 0)).toBe('ok');
    expect(roundQuality(1, 1)).toBe('ok');
    expect(roundQuality(5, 0)).toBe('rough');
    expect(roundQuality(0, 2)).toBe('rough');
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
    expect(monster(save, 'glim').pool).toBe(2);
    expect(easeAfterBreak(save)).toBe(false);
    expect(monster(save, 'plum').step).toBe(1);
  });
});
