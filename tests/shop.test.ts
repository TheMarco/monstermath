import { describe, expect, it } from 'vitest';
import { buyDecor, buyTheme, CHARMS, dayGift, DECOR, DECOR_OUT_MAX, decorOut, setDecorOut, setTheme } from '../src/shop';
import { freshSave } from '../src/state';

describe('the meadow stays clear', () => {
  it('holds five decorations; more wait in the shop until one is put away', () => {
    const save = freshSave();
    save.berries = 1000;
    for (const d of DECOR.slice(0, DECOR_OUT_MAX + 2)) expect(buyDecor(save, d.id)).toBe('ok');
    expect(decorOut(save)).toHaveLength(DECOR_OUT_MAX);
    const waiting = DECOR[DECOR_OUT_MAX]!.id;
    expect(setDecorOut(save, waiting, true)).toBe(false);
    expect(setDecorOut(save, DECOR[0]!.id, false)).toBe(true);
    expect(setDecorOut(save, waiting, true)).toBe(true);
    expect(decorOut(save).map((d) => d.id)).toContain(waiting);
    expect(decorOut(save)).toHaveLength(DECOR_OUT_MAX);
  });

  it('a meadow look is bought once, used, and can be switched off', () => {
    const save = freshSave();
    save.berries = 70;
    expect(buyTheme(save, 'autumn')).toBe('poor');
    expect(buyTheme(save, 'sunset')).toBe('ok');
    expect(save.theme).toBe('sunset');
    expect(save.berries).toBe(10);
    setTheme(save, undefined);
    expect(save.theme).toBeUndefined();
    setTheme(save, 'snow'); // not owned
    expect(save.theme).toBeUndefined();
  });
});

describe('the gift for finishing the day', () => {
  it('is a cheap charm she does not own, then berries when she has them all', () => {
    const save = freshSave();
    const cheap = CHARMS.filter((c) => c.price <= 20);
    const got = new Set<string>();
    for (let i = 0; i < cheap.length; i++) got.add(dayGift(save).charm!.id);
    expect(got.size).toBe(cheap.length);
    const before = save.berries ?? 0;
    expect(dayGift(save)).toEqual({ berries: 8 });
    expect(save.berries).toBe(before + 8);
  });
});
