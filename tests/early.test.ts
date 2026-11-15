import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { earlyStartStep } from '../src/intake';
import { tuning } from '../src/ladder';
import { LESSONS } from '../src/lessons';
import { COUNT_KINDS, countTop, type CountKind } from '../src/math/count';
import { countStats, teacherSummary } from '../src/report';
import type { Save } from '../src/state';
import type { App } from '../src/ui/common';
import { recordingScript } from '../src/voice/lines';
import source from '../src/screens/early.ts?raw';

tuning.stretchChance = 0;

let app: App;
const stage = (): HTMLElement => document.getElementById('game') as HTMLElement;
const q = <T extends Element = HTMLElement>(sel: string): T | null => stage().querySelector<T>(sel);
const qa = <T extends Element = HTMLElement>(sel: string): T[] => Array.from(stage().querySelectorAll<T>(sel));
const text = (sel: string): string => q(sel)?.textContent ?? '';
const saved = (): Save => JSON.parse(localStorage.getItem('monstermath.save.v1') ?? '{}') as Save;

function click(label: string): void {
  const found = qa<HTMLElement>('button').find((b) => (b.textContent ?? '').trim() === label);
  if (!found) throw new Error(`No button "${label}" on: ${text('.story')}`);
  found.click();
}

function chip(row: string, n: number): void {
  const found = qa<HTMLElement>(`${row} .ans-chip`).find((b) => b.textContent === String(n));
  if (!found) throw new Error(`No chip ${n} in ${row} for: ${text('.story')}`);
  found.click();
}

/** Works the problem out from what is on the screen, the way a child would. */
function rightAnswer(): number | 'left' | 'right' {
  const story = text('.story');
  const sides = qa('.e-side');
  if (sides.length === 2) {
    const size = (el: Element): number => (el.querySelector('.e-numeral') ? Number(el.querySelector('.e-numeral')?.textContent) : el.querySelectorAll('.eb').length);
    const [a, b] = [size(sides[0] as Element), size(sides[1] as Element)];
    return a > b !== story.includes('fewer') ? 'left' : 'right';
  }
  const inStory = Number(/\d+/.exec(story)?.[0]);
  if (story.startsWith('Put') || story.startsWith('Make')) return inStory;
  if (story.includes('ten more')) return inStory + 10;
  if (story.includes('ten less')) return inStory - 10;
  if (story.includes('is one crate')) return inStory - 10;
  if (story.startsWith('How many more')) {
    const [have, whole] = (text('.early-note').match(/\d+/g) ?? []).map(Number);
    return (whole as number) - (have as number);
  }
  if (story.startsWith('One crate')) return 10 + qa('.e-teen .eb').length;
  if (q('.e-cols')) return qa('.e-col-body .cart').length * 100 + qa('.e-col-body .crate').length * 10 + qa('.e-col-body .berry').length;
  return qa('.early-model .eb').length;
}

function give(n: number | 'left' | 'right'): void {
  if (n === 'left' || n === 'right') {
    (qa('.e-side')[n === 'left' ? 0 : 1] as HTMLElement).click();
    return;
  }
  const story = text('.story');
  if (story.startsWith('Put')) {
    while (qa('.e-basket .eb').length > n) (q('.e-basket .eb') as HTMLElement).click();
    while (qa('.e-basket .eb').length < n) (q('.e-pile .eb') as HTMLElement).click();
  } else if (story.startsWith('Make')) {
    const want = [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
    for (const [i, place] of (['h', 't', 'o'] as const).entries()) {
      const col = `.e-col.pl-${place}`;
      if (!q(col)) continue;
      const have = (): number => qa(`${col} .e-col-body > *`).length;
      while (have() < (want[i] as number)) (q(`${col} .e-plus`) as HTMLElement).click();
      while (have() > (want[i] as number)) (q(`${col} .e-minus`) as HTMLElement).click();
    }
  } else if (q('.e-chips')) {
    chip('.e-chips', n);
  } else {
    if (q('.ans-row.pl-h')) chip('.ans-row.pl-h', Math.floor(n / 100));
    chip('.ans-row.pl-t', Math.floor(n / 10) % 10);
    chip('.ans-row.pl-o', n % 10);
  }
  click('Check');
}

function solve(): void {
  if (q('.mat-actions .btn') && /^Show the/.test(text('.mat-actions .btn'))) (q('.mat-actions .btn') as HTMLElement).click();
  give(rightAnswer());
  expect(text('.cy-bubble')).toContain('Yes');
}

beforeAll(async () => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.innerHTML = '<div id="game"></div>';
  const { startApp } = await import('../src/main');
  app = startApp(stage());
});

beforeEach(() => {
  localStorage.clear();
  app.reload();
});

describe('the early number games', () => {
  it('every kind and level can be played and solved from what is on the screen', () => {
    for (const kind of COUNT_KINDS) {
      for (let rung = 0; rung <= countTop(kind); rung++) {
        app.go('early', { id: 'puff', kind, practice: true, rung });
        for (let i = 0; i < 12; i++) {
          solve();
          if (i < 11) click('Next one');
        }
      }
    }
  });

  it('trying a game from the grown-up page leaves no trace in the save', () => {
    app.go('early', { id: 'puff', kind: 'ten', practice: true, rung: 1 });
    solve();
    app.commit();
    const save = saved();
    expect(save.early).toBeUndefined();
    expect(save.countLog).toBeUndefined();
    expect(save.monsters).toEqual({});
    expect(save.days).toEqual({});
  });

  it('five clean problems move a level up', () => {
    app.go('early', { id: 'puff', kind: 'count', practice: true, rung: 0 });
    for (let i = 0; i < 5; i++) {
      expect(text('.cy-status')).toContain('level 1 of 5');
      solve();
      click('Next one');
    }
    expect(text('.cy-status')).toContain('level 2 of 5');
  });

  it('a miss gets coaching, a second brings counting help, a third shows the answer', () => {
    app.go('early', { id: 'puff', kind: 'ten', practice: true, rung: 1 });
    const right = rightAnswer() as number;
    const wrong = right === 10 - right ? right + 1 : 10 - right;
    chip('.e-chips', wrong);
    click('Check');
    expect(text('.cy-bubble')).toContain('Count the empty spots');
    chip('.e-chips', wrong);
    click('Check');
    vi.advanceTimersByTime(2700);
    // The empty spots are numbered now.
    expect(qa('.e-cell.empty').map((c) => c.textContent)).toContain('1');
    chip('.e-chips', wrong);
    click('Check');
    expect(text('.cy-bubble')).toContain('Let me show you');
    const glowing = qa('.e-chips .ans-chip.shown');
    expect(glowing).toHaveLength(1);
    expect(glowing[0]?.textContent).toBe(String(right));
    (glowing[0] as HTMLElement).click();
    click('Check');
    expect(text('.cy-bubble')).toContain('Yes');
  });

  it('picking the wrong pile lines the piles up', () => {
    app.go('early', { id: 'puff', kind: 'more', practice: true, rung: 0 });
    const right = rightAnswer();
    give(right === 'left' ? 'right' : 'left');
    expect(q('.e-versus.lined')).toBeNull();
    vi.advanceTimersByTime(2700);
    expect(q('.e-versus.lined')).not.toBeNull();
    give(right);
    expect(text('.cy-bubble')).toContain('Yes');
  });

  it('with a wild monster, five clean problems make a friend and are logged', () => {
    app.go('early', { id: 'tup', kind: 'count' });
    for (let i = 0; i < 5; i++) {
      solve();
      if (i < 4) click('Next one');
    }
    vi.advanceTimersByTime(1500);
    expect(text('.party')).toContain('Tup is your friend!');
    const save = saved();
    expect(save.monsters.tup?.friend).toBe(true);
    expect(save.countLog).toHaveLength(5);
    expect(save.countLog?.[0]).toMatchObject({ kind: 'count', monster: 'tup', firstTry: true, rung: 0 });
    expect(save.early?.count?.step).toBe(1);
    expect(save.days[Object.keys(save.days)[0] as string]?.trips).toBe(5);

    // The grown-up page and the teacher summary report it.
    const stats = countStats(save).find((s) => s.kind === 'count');
    expect(stats).toMatchObject({ problems: 5, firstTry: 5, helped: 0, level: '2 of 5', working: 'Counts up to 10 berries' });
    expect(teacherSummary(save)).toContain('Counting a set: level 2 of 5 (Counts up to 10 berries), 5 problems, 100% right on the first try');
    app.go('grownups');
    expect(stage().textContent).toContain('Early numbers (counting, comparing, ten, tens and ones)');
  });
});

describe('lessons for the early number ideas', () => {
  it('the pictures agree with the numbers', () => {
    for (const id of ['count', 'more', 'ten', 'place'] as const) {
      for (const step of LESSONS[id].steps) {
        const { scene, ask } = step;
        if (ask?.kind !== 'number' && ask?.kind !== 'choice') continue;
        if (scene.t === 'dots' && ask.kind === 'number') expect(ask.expected).toBe(scene.n);
        if (scene.t === 'frame' && ask.kind === 'number') expect(scene.have + ask.expected).toBe(10);
        if (scene.t === 'mat' && ask.kind === 'number') expect(ask.expected).toBe(scene.tens * 10 + scene.ones);
        if (scene.t === 'piles' && ask.kind === 'choice') expect(ask.expected).toBe(String(Math.max(scene.a, scene.b)));
      }
    }
  });

  it('"Teach me" plays the lesson and comes back; a grown-up trying it leaves no trace', () => {
    for (const kind of COUNT_KINDS) {
      app.go('early', { id: 'puff', kind, practice: true, rung: 0 });
      click('Teach me');
      expect(q('.lesson-screen')?.getAttribute('data-lesson')).toBe(kind);
      const lesson = LESSONS[kind];
      for (const step of lesson.steps) {
        expect(q('.lesson-scene')).not.toBeNull();
        if (!step.ask) (q('.lesson-next') as HTMLElement).click();
        else if (step.ask.kind === 'choice') (q(`[data-choice="${step.ask.expected}"]`) as HTMLElement).click();
        else if (step.ask.kind === 'number') {
          String(step.ask.expected).split('').forEach((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })));
          click('OK');
        }
      }
      expect(q('.early-screen')).not.toBeNull();
    }
    app.commit();
    expect(saved().lessons).toBeUndefined();
  });

  it('with a real friend the lesson counts as taught', () => {
    app.go('early', { id: 'tup', kind: 'ten' });
    click('Teach me');
    for (const step of LESSONS.ten.steps) {
      if (!step.ask) (q('.lesson-next') as HTMLElement).click();
      else if (step.ask.kind === 'number') {
        String(step.ask.expected).split('').forEach((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })));
        click('OK');
      }
    }
    expect(q('.early-screen')).not.toBeNull();
    expect(saved().lessons?.ten?.seen).toBe(1);
  });
});

describe('a first-day check that starts with counting', () => {
  it('asks counting first, leaves out the later topics, and still ends with a first friend', () => {
    app.save.startAt = 'early';
    app.go('intro');
    (qa('.pick-card')[0] as HTMLElement).click();
    click('Pick Puff');
    for (let k = 0; k < 3; k++) (q('.meet-card .pet-target') as HTMLElement).click();
    vi.advanceTimersByTime(1100);
    click('This name!');
    for (let k = 0; k < 5; k++) (q('.big-berry') as HTMLElement).click();
    click('Let us go!');

    expect(qa('.feed-progress i')).toHaveLength(4);
    expect(text('.feed-show')).toBe('How many berries?');
    expect(qa('.feed-visual .berry')).toHaveLength(4);
    // She counts the first set, then is not sure about anything else.
    '4'.split('').forEach((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })));
    click('Feed');
    vi.advanceTimersByTime(1000);
    for (let i = 0; i < 40 && !q('.party'); i++) {
      if (q('.cuddle')) {
        for (let k = 0; k < 3; k++) (q('.feed-left .pet-target') as HTMLElement).click();
      } else {
        click('Not sure');
      }
      vi.advanceTimersByTime(1000);
    }
    expect(text('.party')).toContain('is your friend!');
    const save = saved();
    expect(save.introDone).toBe(true);
    expect(save.intakeLevels).toEqual({ count: 1, place: 0, add: 0, sub: 0 });
    expect(save.startAt).toBe('early');
  });
});

describe('where the early number ladders start', () => {
  it('starts at the bottom without a first-day check, and higher for what was shown', () => {
    for (const kind of COUNT_KINDS) expect(earlyStartStep(undefined, kind)).toBe(0);
    expect(earlyStartStep({ place: 1 }, 'count')).toBe(3);
    expect(earlyStartStep({ place: 3 }, 'more')).toBe(4);
    expect(earlyStartStep({ add: 1 }, 'ten')).toBe(1);
    expect(earlyStartStep({ place: 5 }, 'place')).toBe(4);
    for (const kind of COUNT_KINDS) expect(earlyStartStep({ place: 5, add: 7 }, kind as CountKind)).toBeLessThanOrEqual(countTop(kind));
  });
});

describe('spoken lines', () => {
  it('every clip the early number games ask for is in the recording script', () => {
    const recorded = new Set(recordingScript().map(([key]) => key));
    const keys = [...source.matchAll(/'((?:e[qhc]|early|show_you|stretch|i|c)_[a-z0-9_]+|yes|show_you)'/g)].map((m) => m[1] as string);
    expect(keys.length).toBeGreaterThan(25);
    for (const key of keys) expect(recorded, key).toContain(key);
  });
});
