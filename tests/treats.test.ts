import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EARLY_ORDER } from '../src/data/monsters';
import { recordRound, tuning } from '../src/ladder';
import { isOwnTurn, missedTurn, turnKind } from '../src/math/hints';
import { climbed, roundStars } from '../src/rewards';
import { missing, nextWild, secure } from '../src/skill';
import { befriend, clock, earlyQueue, freshSave, giveStar, monster, persist, type Save } from '../src/state';
import type { App } from '../src/ui/common';

tuning.stretchChance = 0;

let app: App;
const stage = (): HTMLElement => document.getElementById('game') as HTMLElement;
const q = <T extends Element = HTMLElement>(sel: string): T | null => stage().querySelector<T>(sel);
const qa = <T extends Element = HTMLElement>(sel: string): T[] => Array.from(stage().querySelectorAll<T>(sel));
const text = (sel: string): string => q(sel)?.textContent ?? '';
const key = (k: string): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
};
const type = (s: string): void => s.split('').forEach(key);
const hearts = (): number => qa('.meter .icon.on').length;

function click(label: string): void {
  const found = qa<HTMLElement>('button').find((b) => (b.textContent ?? '').trim() === label);
  if (!found) throw new Error(`No button "${label}"`);
  found.click();
}

function give(a: number, op: string, b: number): void {
  type(String(a));
  key(op);
  type(String(b));
  key('Enter');
}

/** Coco's first-day check: 27 + 5 done, two-digit numbers read as tens and ones. Puff is a friend. */
function cocoSave(): Save {
  const save = freshSave();
  save.intakeLevels = { place: 4, add: 4, sub: 3, mul: 1, div: 1, frac: 1 };
  save.starter = 'puff';
  save.introDone = true;
  befriend(save, 'puff');
  // Not her very first round, so no warm-up size.
  save.exprLog.push({ t: 0, day: '2026-11-13', monster: 'puff', target: 12, a: 10, op: '+', b: 2, correct: true, kind: 'add', hearts: 4, hinted: false });
  return save;
}

/** Open a treats round with Puff. The number is the top of her size: 36 at size 3. */
function playPuff(save: Save): number {
  persist(save);
  app.reload();
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
  app.go('befriend', { id: 'puff' });
  random.mockRestore();
  return Number(text('.target-badge'));
}

beforeAll(async () => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.innerHTML = '<div id="game"></div>';
  const { startApp } = await import('../src/main');
  app = startApp(stage());
});

beforeEach(() => {
  clock.now = () => new Date(2026, 10, 18, 16, 0, 0);
  localStorage.clear();
});

describe('help, then your turn', () => {
  it('an answer made with Help earns no hearts; her own one after it earns the hearts and a bonus', () => {
    const target = playPuff(cocoSave());
    expect(target).toBe(36);
    give(30, '+', 6);
    const before = hearts();
    click('Help me');
    expect(text('.hint-text')).toBe('40 − ? = 36');
    type('4');
    key('Enter');
    expect(hearts()).toBe(before);
    expect(text('.feedback-text')).toContain('We did that one together. Your turn: make 36 with\u00a0−, without 40.');
    expect(app.save.monsters.puff?.current?.turn).toMatchObject({ kind: 'sub', avoid: 40 });
    give(46, '-', 10);
    expect(text('.feedback-text')).toContain('All by yourself');
    // 4 for a minus treat, plus 2 for making it alone.
    expect(app.save.exprLog.at(-1)?.hearts).toBe(6);
    vi.advanceTimersByTime(1600);
    expect(text('.party h2')).toBe('Puff got a star!');
    // Help backed by her own answer still counts as a clean round.
    expect(app.save.treatLevels?.any?.recent).toEqual([1]);
  });

  it('the old loop no longer fills the meter: plus, flip, then Help', () => {
    const save = cocoSave();
    save.treatLevels = { any: { rung: 1, recent: [] } };
    const target = playPuff(save);
    expect(target).toBe(20);
    give(11, '+', 9);
    give(9, '+', 11);
    click('Help me');
    type(String(Number(text('.slot')) - target));
    key('Enter');
    vi.advanceTimersByTime(1600);
    expect(q('.party')).toBeNull();
    expect(hearts()).toBeLessThan(10);
    expect(text('.feedback-text')).toContain('Your turn');
  });

  it('two tries that are not her own let the your-turn go, and the round counts as rough', () => {
    playPuff(cocoSave());
    give(30, '+', 6);
    click('Help me');
    type('4');
    key('Enter');
    give(50, '-', 10); // makes 40: a miss
    expect(app.save.monsters.puff?.current?.turn?.misses).toBe(1);
    // A miss keeps the expression on screen to adjust; clear it.
    for (let i = 0; i < 6; i++) key('Backspace');
    give(40, '-', 4); // the hint's answer again
    expect(app.save.monsters.puff?.current?.turn).toBeUndefined();
    expect(app.save.monsters.puff?.current?.dropped).toBe(1);
    give(20, '+', 16);
    give(45, '-', 9);
    vi.advanceTimersByTime(1600);
    expect(q('.party')).not.toBeNull();
    expect(app.save.treatLevels?.any?.recent).toEqual([0]);
  });

  it('with the meter full, answers of another kind use up the your-turn tries, so the round can end', () => {
    playPuff(cocoSave());
    give(30, '+', 6);
    give(20, '+', 16);
    click('Help me');
    type('4');
    key('Enter');
    expect(app.save.monsters.puff?.current?.turn?.kind).toBe('sub');
    give(12, '*', 3);
    vi.advanceTimersByTime(1600);
    expect(q('.party')).toBeNull();
    give(18, '+', 18);
    vi.advanceTimersByTime(1600);
    expect(q('.party')).not.toBeNull();
    // Her own answers in other kinds: not clean (the hint was not backed), not rough either.
    expect(app.save.treatLevels?.any?.recent).toEqual([]);
  });

  it('a your-turn waits for her when she leaves and comes back', () => {
    playPuff(cocoSave());
    give(30, '+', 6);
    click('Help me');
    type('4');
    key('Enter');
    app.go('home');
    app.go('befriend', { id: 'puff' });
    expect(text('.feedback-text')).toBe('Your turn: make 36 with\u00a0−, without 40.');
  });
});

describe('climbing', () => {
  it('a new best treats size moves every any-treat monster up and gives a bonus star', () => {
    const save = cocoSave();
    save.treatLevels = { any: { rung: 2, recent: [1, 1] } };
    const stars = save.monsters.puff?.stars ?? 0;
    playPuff(save);
    give(30, '+', 6);
    give(6, '+', 30);
    give(40, '-', 4);
    vi.advanceTimersByTime(1600);
    expect(app.save.treatLevels?.any?.rung).toBe(3);
    expect(qa('.toast').map((t) => t.textContent)).toContain('Level up! Puff gets a bonus star.');
    expect(text('.party')).toContain('Plus a bonus star for a new level!');
    expect(app.save.monsters.puff?.stars).toBe(stars + 2);
  });

  it('climbing back to a level she had before pays no bonus star', () => {
    const save = cocoSave();
    save.treatLevels = { any: { rung: 2, recent: [1, 1] } };
    save.best = { 'treat.any': 3 };
    const stars = save.monsters.puff?.stars ?? 0;
    playPuff(save);
    give(30, '+', 6);
    give(6, '+', 30);
    give(40, '-', 4);
    vi.advanceTimersByTime(1600);
    expect(app.save.treatLevels?.any?.rung).toBe(3);
    expect(qa('.toast').map((t) => t.textContent)).toContain('Level up! The numbers grow with you.');
    expect(text('.party')).not.toContain('bonus star');
    expect(app.save.monsters.puff?.stars).toBe(stars + 1);
  });

  it('reads the best level of older saves from the problem logs', () => {
    const save = freshSave();
    befriend(save, 'nub');
    save.tripLog.push({ t: 0, day: '2026-11-14', monster: 'nub', type: 'add', a: 30, b: 22, answers: [52], firstTry: true, errors: [], usedBlocks: true, rung: 4 });
    expect(climbed(save, 'trip.add', 3, 4, 'nub')).toBe(false);
    expect(climbed(save, 'trip.add', 4, 5, 'nub')).toBe(true);
    expect(save.best?.['trip.add']).toBe(5);
    expect(monster(save, 'nub').climbStars).toBe(1);
  });

  it('bonus stars come at the end of the round, past the daily limit', () => {
    const save = freshSave();
    befriend(save, 'nub');
    giveStar(save, 'nub');
    giveStar(save, 'nub');
    expect(roundStars(save, 'nub')).toEqual({ result: 'full-today', bonus: 0 });
    monster(save, 'nub').climbStars = 1;
    expect(roundStars(save, 'nub')).toEqual({ result: 'star', bonus: 1 });
    expect(monster(save, 'nub').stars).toBe(3);
    expect(monster(save, 'nub').climbStars).toBe(0);
  });
});

describe('your turn rules', () => {
  it('asks for the same kind without the hint number, or any kind when none is left', () => {
    expect(turnKind(36, { a: 40, op: '-', b: 4 }, 40, [{ a: 40, op: '-', b: 4 }])).toBe('sub');
    expect(turnKind(12, { a: 2, op: '*', b: 6 }, 2, [{ a: 2, op: '*', b: 6 }])).toBe('mul');
    // 10 is only 2 × 5: without the 2 there is no times treat left.
    expect(turnKind(10, { a: 2, op: '*', b: 5 }, 2, [{ a: 2, op: '*', b: 5 }])).toBeNull();
  });

  it('counts only a new answer of her own', () => {
    const turn = { kind: 'sub' as const, avoid: 40 };
    const prior = [{ a: 40, op: '-' as const, b: 4 }];
    expect(isOwnTurn({ a: 46, op: '-', b: 10 }, turn, prior)).toBe(true);
    expect(isOwnTurn({ a: 40, op: '-', b: 4 }, turn, prior)).toBe(false);
    expect(isOwnTurn({ a: 37, op: '-', b: 1 }, turn, prior)).toBe(false);
    expect(isOwnTurn({ a: 30, op: '+', b: 6 }, turn, prior)).toBe(false);
    expect(isOwnTurn({ a: 7, op: '+', b: 3 }, { kind: null, avoid: 2 }, [])).toBe(true);
    // Reusing the hint's number is a missed try; a new answer of another kind is not.
    expect(missedTurn({ a: 40, op: '-', b: 4 }, turn, prior)).toBe(true);
    expect(missedTurn({ a: 30, op: '+', b: 6 }, turn, prior)).toBe(false);
  });
});

describe('treats rounds on the ladder', () => {
  it('three clean rounds out of four move up; in-between rounds are not marked', () => {
    let p = { rung: 1, recent: [] as Array<0 | 1 | 2 | 3> };
    p = recordRound(p, 4, 'clean', false);
    p = recordRound(p, 4, 'ok', false);
    p = recordRound(p, 4, 'rough', false);
    p = recordRound(p, 4, 'clean', false);
    expect(p.rung).toBe(1);
    const up = recordRound(p, 4, 'clean', false);
    expect(up).toMatchObject({ rung: 2, moved: 1, recent: [] });
  });

  it('two clean stretch rounds move up; a rough stretch round never counts against her', () => {
    let p = { rung: 1, recent: [1] as Array<0 | 1 | 2 | 3> };
    p = recordRound(p, 4, 'rough', true);
    p = recordRound(p, 4, 'clean', true);
    expect(p.rung).toBe(1);
    expect(recordRound(p, 4, 'clean', true).rung).toBe(2);
  });

  it('two rough rounds in a row move down', () => {
    let p = { rung: 2, recent: [1, 1] as Array<0 | 1 | 2 | 3> };
    p = recordRound(p, 4, 'rough', false);
    expect(p.rung).toBe(2);
    expect(recordRound(p, 4, 'rough', false)).toMatchObject({ rung: 1, moved: -1 });
  });
});

describe('the Berry Patch and the first-day check', () => {
  it('counting and the crate of ten count as secure when the check showed two-digit numbers', () => {
    const save = freshSave();
    save.intakeLevels = { place: 4, add: 4 };
    befriend(save, 'fig');
    monster(save, 'fig').friendOn = '2026-11-16';
    expect(secure(save, 'fig')).toBe(true);
    expect(nextWild(save, earlyQueue(save))).toMatchObject({ id: 'flam', ready: true });
    befriend(save, 'kelp');
    expect(missing(save, 'beary')).toEqual([]);
  });

  it('a child still counting has to practise first', () => {
    const save = freshSave();
    save.intakeLevels = { place: 2, add: 2, count: 4 };
    befriend(save, 'fig');
    monster(save, 'fig').friendOn = '2026-11-16';
    expect(secure(save, 'fig')).toBe(false);
    expect(nextWild(save, earlyQueue(save))).toMatchObject({ id: EARLY_ORDER[1], ready: false, needs: 'fig' });
  });
});
