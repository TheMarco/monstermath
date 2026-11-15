import { beforeEach, describe, expect, it } from 'vitest';
import { record, steadiness, tuning, wantsStretch, type Mark, type Progress } from '../src/ladder';
import type { Delivery } from '../src/math/regroup';
import { levelRows } from '../src/report';
import type { SpeciesId } from '../src/data/monsters';
import { goodDays, metToday, missing, nextWild, secure } from '../src/skill';
import { befriend, canyonQueue, clock, earlyQueue, freshSave, giveStar, hollowQueue, monster, starsLeftToday, upperQueue, type Save } from '../src/state';

const at = (rung: number, ...recent: Mark[]): Progress => ({ rung, recent });

function play(p: Progress, top: number, results: Array<[boolean, boolean]>): Progress {
  let now = p;
  for (const [clean, stretch] of results) now = record(now, top, clean, stretch);
  return now;
}

beforeEach(() => {
  clock.now = () => new Date(2026, 10, 13, 16, 0, 0);
  tuning.stretchChance = 0.25;
});

describe('moving up and down a ladder', () => {
  it('moves up after five problems with at most one miss, ending on a clean one', () => {
    let p = play(at(1), 5, [[true, false], [true, false], [true, false], [true, false]]);
    expect(p.rung).toBe(1); // four is not enough
    p = record(p, 5, true, false);
    expect(p).toMatchObject({ rung: 2, recent: [] });

    // One miss in the window is fine.
    p = play(at(1), 5, [[true, false], [false, false], [true, false], [true, false], [true, false]]);
    expect(p.rung).toBe(2);
    // But not when the latest answer is the miss.
    p = play(at(1), 5, [[true, false], [true, false], [true, false], [true, false], [false, false]]);
    expect(p.rung).toBe(1);
  });

  it('does not move up on a lucky streak of three', () => {
    expect(play(at(1), 5, [[true, false], [true, false], [true, false]]).rung).toBe(1);
  });

  it('moves down after two misses in a row at her own rung', () => {
    const p = play(at(2), 5, [[true, false], [false, false], [false, false]]);
    expect(p).toMatchObject({ rung: 1, recent: [] });
  });

  it('a missed stretch problem never counts against her', () => {
    let p = play(at(2), 5, [[true, false], [false, false], [false, true], [true, false]]);
    expect(p.rung).toBe(2);
    p = play(at(2), 5, [[false, true], [false, true], [false, true], [false, true]]);
    expect(p.rung).toBe(2);
    // A miss, a missed stretch problem, then another miss: that is two misses in a row at her rung.
    p = play(at(2), 5, [[false, false], [false, true], [false, false]]);
    expect(p.rung).toBe(1);
  });

  it('two stretch problems solved cleanly move her up early', () => {
    const p = play(at(2), 5, [[true, false], [true, true], [true, false], [true, true]]);
    expect(p.rung).toBe(3);
  });

  it('stays inside the ladder', () => {
    expect(play(at(0), 5, [[false, false], [false, false], [false, false]]).rung).toBe(0);
    expect(play(at(5), 5, [[true, false], [true, false], [true, false], [true, false], [true, false], [true, false]]).rung).toBe(5);
  });

  it('reports how steady she is at her own rung', () => {
    expect(steadiness(at(1, 1, 1))).toBeNull();
    expect(steadiness(at(1, 1, 0, 3, 1, 1))).toBe(0.75);
  });
});

describe('stretch problems', () => {
  it('come about one time in four, once she has settled', () => {
    let count = 0;
    let seed = 5;
    const rng = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 4000; i++) if (wantsStretch(at(1, 1, 1), 5, rng)) count += 1;
    expect(count).toBeGreaterThan(800);
    expect(count).toBeLessThan(1200);
  });

  it('never come first, twice in a row, right after a miss, or on the top rung', () => {
    const always = (): number => 0;
    expect(wantsStretch(at(1), 5, always)).toBe(false);
    expect(wantsStretch(at(1, 1), 5, always)).toBe(false);
    expect(wantsStretch(at(1, 1, 3), 5, always)).toBe(false);
    expect(wantsStretch(at(1, 1, 2), 5, always)).toBe(false);
    expect(wantsStretch(at(1, 1, 0), 5, always)).toBe(false);
    expect(wantsStretch(at(5, 1, 1), 5, always)).toBe(false);
    expect(wantsStretch(at(1, 1, 1), 5, always)).toBe(true);
  });
});

function trips(save: Save, type: Delivery, results: boolean[], day = '2026-11-13'): void {
  for (const firstTry of results) {
    save.tripLog.push({ t: 0, day, monster: 'nub', type, a: 5, b: 3, answers: [8], firstTry, errors: [], usedBlocks: true });
  }
}

/** Pretend a friend was made on an earlier day. */
function met(save: Save, id: SpeciesId, day: string): void {
  (save.monsters[id] as { friendOn?: string }).friendOn = day;
}

const GOOD = [true, true, true, false];

describe('the next monster comes out when the skill before it is secure', () => {
  it('a skill is secure after three good days, not after one long sitting', () => {
    const save = freshSave();
    befriend(save, 'nub');
    met(save, 'nub', '2026-11-01');
    trips(save, 'add', [true, true, true, true, true, true, true, true, true, true, true, true], '2026-11-10');
    expect(goodDays(save, 'nub')).toBe(1);
    expect(secure(save, 'nub')).toBe(false);
    expect(nextWild(save, canyonQueue(save))).toEqual({ id: 'plum', ready: false, needs: 'nub', progress: 1 });
    trips(save, 'add', GOOD, '2026-11-11');
    // A day with too few problems, or too many misses, does not count.
    trips(save, 'add', [true, true], '2026-11-12');
    expect(goodDays(save, 'nub')).toBe(2);
    trips(save, 'add', [true, false, false, true], '2026-11-13');
    expect(secure(save, 'nub')).toBe(false);
    trips(save, 'add', GOOD, '2026-11-14');
    expect(secure(save, 'nub')).toBe(true);
    expect(nextWild(save, canyonQueue(save))).toEqual({ id: 'plum', ready: true });
  });

  it('one new friend a day, then the next one waits for tomorrow', () => {
    const save = freshSave();
    expect(nextWild(save, canyonQueue(save))).toEqual({ id: 'nub', ready: true });
    befriend(save, 'dab');
    expect(metToday(save)).toBe(1);
    expect(nextWild(save, canyonQueue(save))).toEqual({ id: 'nub', ready: false });
    met(save, 'dab', '2026-11-01');
    expect(nextWild(save, canyonQueue(save))).toEqual({ id: 'nub', ready: true });
  });

  it('skips ahead to a monster whose own skill is ready', () => {
    const save = freshSave();
    befriend(save, 'nub');
    befriend(save, 'plum');
    met(save, 'nub', '2026-11-01');
    met(save, 'plum', '2026-11-01');
    for (const day of ['2026-11-10', '2026-11-11', '2026-11-12']) trips(save, 'add', GOOD, day);
    // Regrouping is shaky, but taking away only needs plain addition.
    trips(save, 'addR', [false, false, false]);
    expect(nextWild(save, canyonQueue(save))).toEqual({ id: 'dusk', ready: true });
  });

  it('fractions that multiply wait for multiplication too', () => {
    const save = freshSave();
    for (const id of ['bix', 'glim'] as const) {
      befriend(save, id);
      met(save, id, '2026-11-01');
    }
    save.fast = {};
    for (const day of ['2026-11-10', '2026-11-11', '2026-11-12']) {
      for (let i = 0; i < 4; i++) save.fracLog = [...(save.fracLog ?? []), { t: 0, day, monster: 'bix', kind: 'name', text: '', answers: ['1/2'], firstTry: true, errors: [] }];
    }
    expect(secure(save, 'bix')).toBe(true);
    expect(missing(save, 'tam')).toEqual([]);
    expect(missing(save, 'zim')).toEqual(['glim']);
    expect(missing(save, 'lux')).toEqual(['zim', 'tam']);
  });

  it('the first-day check can show a skill is secure straight away', () => {
    const save = freshSave();
    save.fast = { add: true };
    befriend(save, 'nub');
    expect(secure(save, 'nub')).toBe(true);
  });

  it('a grown-up can open everything', () => {
    const save = freshSave();
    befriend(save, 'bix');
    met(save, 'bix', '2026-11-01');
    expect(nextWild(save, hollowQueue(save))).toEqual({ id: 'tam', ready: false, needs: 'bix', progress: 0 });
    save.openAll = true;
    expect(nextWild(save, hollowQueue(save))).toEqual({ id: 'tam', ready: true });
  });

  it('the Berry Patch starts with Fig, and Flam waits for counting to be secure', () => {
    const save = freshSave();
    expect(nextWild(save, earlyQueue(save))).toEqual({ id: 'fig', ready: true });
    befriend(save, 'fig');
    met(save, 'fig', '2026-11-01');
    expect(nextWild(save, earlyQueue(save))).toEqual({ id: 'flam', ready: false, needs: 'fig', progress: 0 });
    for (const day of ['2026-11-02', '2026-11-03', '2026-11-04']) {
      for (let i = 0; i < 4; i++) (save.countLog ??= []).push({ t: 0, day, monster: 'fig', kind: 'count', text: 'Count 5 berries', answers: ['5'], firstTry: true, errors: [], helped: false, rung: 0 } as never);
    }
    expect(secure(save, 'fig')).toBe(true);
    expect(nextWild(save, earlyQueue(save))).toEqual({ id: 'flam', ready: true });
  });

  it('the Bakery waits for rows and crates, unless a grown-up starts her there', () => {
    const save = freshSave();
    // Belch stands on equal rows (Glim) and packing a crate (Plum).
    expect(missing(save, 'belch')).toEqual(['glim', 'plum']);
    expect(nextWild(save, upperQueue(save))).toEqual({ id: 'belch', ready: false, needs: 'glim', progress: 0 });
    expect(missing(save, 'drift')).toEqual(['belch', 'fenn']);
    expect(missing(save, 'bug')).toEqual(['tam']);
    expect(missing(save, 'cook')).toEqual(['bix']);

    // Started at the Bakery: the other places are taken as known, so only Drift waits, for Belch.
    save.startAt = 'upper';
    expect(nextWild(save, upperQueue(save))).toEqual({ id: 'belch', ready: true });
    expect(missing(save, 'drift')).toEqual(['belch']);
    expect(missing(save, 'bug')).toEqual([]);
    expect(missing(save, 'cook')).toEqual([]);
    // That choice opens nothing outside the Bakery.
    expect(missing(save, 'plum')).toEqual(['nub']);

    befriend(save, 'belch');
    met(save, 'belch', '2026-11-01');
    // Drift is not ready, so Bug is next in line.
    expect(nextWild(save, upperQueue(save))).toEqual({ id: 'bug', ready: true });
    befriend(save, 'bug');
    met(save, 'bug', '2026-11-01');
    befriend(save, 'cook');
    met(save, 'cook', '2026-11-01');
    expect(nextWild(save, upperQueue(save))).toEqual({ id: 'drift', ready: false, needs: 'belch', progress: 0 });
    for (const day of ['2026-11-02', '2026-11-03', '2026-11-04']) {
      for (let i = 0; i < 4; i++) (save.upperLog ??= []).push({ t: 0, day, monster: 'belch', kind: 'mult', text: '30 × 4', answers: ['120'], firstTry: true, errors: [], helped: false, rung: 0 });
    }
    expect(goodDays(save, 'belch')).toBe(3);
    expect(secure(save, 'belch')).toBe(true);
    expect(nextWild(save, upperQueue(save))).toEqual({ id: 'drift', ready: true });
  });

  it('a day gives six stars in all, then everyone is sleepy', () => {
    const save = freshSave();
    for (const id of ['dab', 'moss', 'glim', 'nub'] as const) befriend(save, id);
    expect(giveStar(save, 'dab')).toBe('star');
    expect(giveStar(save, 'dab')).toBe('star');
    expect(giveStar(save, 'dab')).toBe('full-today');
    for (const id of ['moss', 'moss', 'glim', 'glim'] as const) expect(giveStar(save, id)).toBe('star');
    expect(giveStar(save, 'nub')).toBe('full-today');
    expect(starsLeftToday(save, 'nub')).toBe(0);
  });
});

describe('the level table for grown-ups', () => {
  it('shows the rung, what she is working on, and how it has gone lately', () => {
    const save = freshSave();
    save.startStep = { add: 1, addR: 0, sub: 0, subR: 0 };
    monster(save, 'plum').step = 3;
    trips(save, 'addR', [true, false, true]);
    const rows = levelRows(save);
    expect(rows).toHaveLength(12);
    const plum = rows.find((r) => r.monster === 'Plum');
    expect(plum).toMatchObject({ level: '4 of 6', working: 'Two-digit plus two-digit with regrouping, up to 99', recent: '2 of last 3 right first try' });
    expect(rows.find((r) => r.monster === 'Nub')?.level).toBe('2 of 6');
    expect(rows.find((r) => r.monster === 'Lux')?.level).toBe('not started');
  });
});
