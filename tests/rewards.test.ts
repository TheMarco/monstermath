import { beforeEach, describe, expect, it } from 'vitest';
import {
  bondLevel, feed, fedToday, FEEDS_PER_DAY, playBall, EGG_WARMTH, eggReady, ensureWishes, hatch, levelFor, onRound, onTreat, onTrip, pet, PETS_PER_DAY,
  STICKERS, wishing, xpForLevel,
} from '../src/rewards';
import { befriend, buddyOf, clock, freshSave, monster, today } from '../src/state';

beforeEach(() => {
  clock.now = () => new Date(2026, 10, 13, 16, 0, 0);
});

describe('ranger level', () => {
  it('needs more points for each level', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([20, 50, 90, 140]);
    expect(levelFor(0)).toBe(0);
    expect(levelFor(19)).toBe(0);
    expect(levelFor(20)).toBe(1);
    expect(levelFor(95)).toBe(3);
  });
});

describe('eggs', () => {
  it('a level gives an egg, right answers warm it, and it hatches into the next egg monster', () => {
    const save = freshSave();
    const gain = onTreat(save, 20);
    expect(gain.levelUp).toBe(1);
    expect(gain.newEgg).toBe(true);
    expect(save.egg).toEqual({ warmth: 0 });
    expect(hatch(save)).toBeNull();
    let warmed = false;
    for (let i = 0; i < EGG_WARMTH; i++) warmed = onTrip(save, true).eggWarm || warmed;
    expect(warmed).toBe(true);
    expect(eggReady(save)).toBe(true);
    expect(hatch(save)).toBe('tup');
    expect(save.monsters.tup?.friend).toBe(true);
    // The trips also raised the level, so the next egg is already in the nest.
    expect(save.egg).toEqual({ warmth: 0 });
  });

  it('stops giving eggs when all six have hatched', () => {
    const save = freshSave();
    for (const id of ['tup', 'jam', 'mint', 'pom', 'nox', 'fizz'] as const) befriend(save, id);
    onTreat(save, 500);
    expect(save.egg).toBeNull();
  });
});

describe('bonds and petting', () => {
  it('petting counts a few times a day', () => {
    const save = freshSave();
    befriend(save, 'dab');
    for (let i = 0; i < PETS_PER_DAY; i++) expect(pet(save, 'dab').counted).toBe(true);
    expect(pet(save, 'dab').counted).toBe(false);
    expect(monster(save, 'dab').bond).toBe(PETS_PER_DAY);
    clock.now = () => new Date(2026, 10, 14, 16, 0, 0);
    expect(pet(save, 'dab').counted).toBe(true);
  });

  it('playing rounds deepens the bond', () => {
    const save = freshSave();
    befriend(save, 'dab');
    expect(bondLevel(0).title).toBe('New friend');
    const first = onRound(save, 'dab');
    const second = onRound(save, 'dab');
    expect(first.bondUp).toBeNull();
    expect(second.bondUp?.title).toBe('Good friend');
  });
});

describe('wishes', () => {
  it('the least played friends ask to play, and a round grants the wish', () => {
    const save = freshSave();
    for (const id of ['puff', 'dab', 'moss', 'nub'] as const) befriend(save, id);
    monster(save, 'puff').rounds = 5;
    monster(save, 'dab').rounds = 4;
    monster(save, 'moss').rounds = 1;
    monster(save, 'nub').rounds = 0;
    ensureWishes(save);
    expect((today(save).wishes ?? []).map((w) => w.id).sort()).toEqual(['moss', 'nub']);
    expect(wishing(save, 'nub')).toBe(true);
    expect(onRound(save, 'nub').wishGranted).toBe(true);
    expect(wishing(save, 'nub')).toBe(false);
    expect(onRound(save, 'nub').wishGranted).toBe(false);
  });

  it('waits until there are two friends', () => {
    const save = freshSave();
    befriend(save, 'puff');
    ensureWishes(save);
    expect(today(save).wishes).toBeUndefined();
  });
});

describe('stickers', () => {
  it('awards each sticker once', () => {
    const save = freshSave();
    befriend(save, 'puff');
    befriend(save, 'dab');
    const first = onTreat(save, 1).stickers.map((s) => s.id);
    expect(first).toContain('friend');
    expect(onTreat(save, 1).stickers).toEqual([]);
  });

  it('rewards making one number with all four operations', () => {
    const save = freshSave();
    const four = STICKERS.find((s) => s.id === 'four');
    monster(save, 'puff').ways = { '12': [{ a: 10, op: '+', b: 2 }, { a: 15, op: '-', b: 3 }, { a: 3, op: '*', b: 4 }] };
    expect(four?.earned(save)).toBe(false);
    monster(save, 'puff').ways['12']?.push({ a: 24, op: '/', b: 2 });
    expect(four?.earned(save)).toBe(true);
  });
});

describe('berries, feeding and the buddy', () => {
  it('playing earns berries and feeding spends them', () => {
    const save = freshSave();
    befriend(save, 'dab');
    expect(feed(save, 'dab').ok).toBe(false);
    onTreat(save, 3);
    onTrip(save, true);
    onRound(save, 'dab');
    expect(save.berries).toBe(6);
    const bondBefore = monster(save, 'dab').bond ?? 0;
    for (let i = 0; i < FEEDS_PER_DAY; i++) expect(feed(save, 'dab').ok).toBe(true);
    expect(fedToday(save, 'dab')).toBe(FEEDS_PER_DAY);
    expect(monster(save, 'dab').bond).toBe(bondBefore + FEEDS_PER_DAY);
    // A full monster still eats, but the bond does not grow further today.
    expect(feed(save, 'dab')).toMatchObject({ ok: true, full: true, bondUp: null });
    expect(monster(save, 'dab').bond).toBe(bondBefore + FEEDS_PER_DAY);
    expect(save.berries).toBe(2);
  });

  it('a game of ball deepens the bond once a day', () => {
    const save = freshSave();
    befriend(save, 'dab');
    playBall(save, 'dab');
    playBall(save, 'dab');
    expect(monster(save, 'dab').bond).toBe(2);
  });

  it('the buddy is the starter until she chooses a friend', () => {
    const save = freshSave();
    save.starter = 'pim';
    befriend(save, 'pim');
    expect(buddyOf(save)).toBe('pim');
    save.buddy = 'dab';
    expect(buddyOf(save)).toBe('pim'); // not a friend yet
    befriend(save, 'dab');
    expect(buddyOf(save)).toBe('dab');
  });
});
