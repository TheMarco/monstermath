import { beforeEach, describe, expect, it } from 'vitest';
import { STARS_PER_DAY, STARS_TO_GROW } from '../src/data/monsters';
import {
  befriend, canyonQueue, growth, clock, dailyDone, freshSave, giveStar, grassQueue, monster, nextTarget, today,
} from '../src/state';

function setDay(day: number): void {
  clock.now = () => new Date(2026, 10, day, 16, 0, 0);
}

describe('stars and growing', () => {
  beforeEach(() => setDay(13));

  it('caps stars per day, so growing takes a second visit', () => {
    const save = freshSave();
    befriend(save, 'dab');
    for (let i = 0; i < STARS_PER_DAY; i++) expect(giveStar(save, 'dab')).toBe('star');
    expect(giveStar(save, 'dab')).toBe('full-today');
    expect(monster(save, 'dab').stage).toBe(1);
    setDay(14);
    const results = [giveStar(save, 'dab'), giveStar(save, 'dab')];
    expect(STARS_TO_GROW).toBe(4);
    expect(results).toEqual(['star', 'grown']);
    expect(monster(save, 'dab').stage).toBe(2);
  });

  it('a third stage comes at ten stars', () => {
    const save = freshSave();
    befriend(save, 'dab');
    const results: string[] = [];
    for (let day = 13; day < 18; day++) {
      setDay(day);
      results.push(giveStar(save, 'dab'), giveStar(save, 'dab'));
    }
    expect(results.filter((r) => r === 'grown')).toHaveLength(2);
    expect(monster(save, 'dab').stage).toBe(3);
    expect(growth(monster(save, 'dab')).final).toBe(true);
  });

  it('bonus stars ignore the daily cap', () => {
    const save = freshSave();
    befriend(save, 'puff');
    giveStar(save, 'puff');
    giveStar(save, 'puff');
    expect(giveStar(save, 'puff', { bonus: true })).toBe('star');
    expect(monster(save, 'puff').stars).toBe(3);
  });
});

describe('queues and targets', () => {
  it('meets grass monsters in teaching order, then the other starters', () => {
    const save = freshSave();
    save.starter = 'pim';
    befriend(save, 'pim');
    expect(grassQueue(save)).toEqual(['dab', 'moss', 'glim', 'fenn', 'puff', 'bop']);
    befriend(save, 'dab');
    expect(grassQueue(save)[0]).toBe('moss');
    expect(canyonQueue(save)).toEqual(['nub', 'plum', 'dusk', 'chip']);
  });

  it('takes numbers from the pool it is given, and reuses a pool that is used up', () => {
    const save = freshSave();
    expect([6, 8, 10, 12]).toContain(nextTarget(save, 'glim', () => 0));
    expect(nextTarget(save, 'glim', () => 0, 4)).toBeGreaterThanOrEqual(54);
    monster(save, 'glim').ways = { '6': [], '8': [], '10': [], '12': [] };
    expect([6, 8, 10, 12]).toContain(nextTarget(save, 'glim', () => 0.5, 0));
  });

  it('does not repeat a number already done with that monster', () => {
    const save = freshSave();
    const m = monster(save, 'fenn');
    m.ways = { '2': [], '3': [], '4': [] };
    expect(nextTarget(save, 'fenn', () => 0)).toBe(5);
  });
});

describe('daily goals', () => {
  it('needs treats, trips and one win', () => {
    setDay(13);
    const save = freshSave();
    const day = today(save);
    day.treats = 3;
    day.trips = 3;
    expect(dailyDone(day)).toBe(false);
    day.wins = 1;
    expect(dailyDone(day)).toBe(true);
  });
});

describe('older saves', () => {
  it('puts the old three problem sizes on the matching rungs', async () => {
    const { loadSave } = await import('../src/state');
    const old = { ...freshSave(), ladder: undefined, startStep: { add: 0, addR: 2, sub: 1, subR: 0 } };
    befriend(old, 'nub');
    befriend(old, 'plum');
    monster(old, 'nub').step = 2;
    monster(old, 'plum').step = 0;
    localStorage.setItem('monstermath.save.v1', JSON.stringify(old));
    const save = loadSave();
    expect(save.ladder).toBe(2);
    expect(save.monsters.nub?.step).toBe(4);
    expect(save.monsters.plum?.step).toBe(1);
    expect(save.startStep).toEqual({ add: 2, addR: 3, sub: 3, subR: 1 });
    localStorage.clear();
  });
});
