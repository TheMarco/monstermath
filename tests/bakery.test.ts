import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPPER_ORDER } from '../src/data/monsters';
import { START_POINTS, strandPlan, upperStartStep } from '../src/intake';
import { tuning } from '../src/ladder';
import { LESSON_FOR_UPPER, LESSONS } from '../src/lessons';
import { UPPER_KINDS, upperTop, type UpperKind } from '../src/math/upper';
import { intakeWarning, skillLevel, teacherSummary, upperStats } from '../src/report';
import { nextWild } from '../src/skill';
import { readBackup, upperQueue, type Save } from '../src/state';
import type { App } from '../src/ui/common';
import { recordingScript } from '../src/voice/lines';
import source from '../src/screens/upper.ts?raw';

tuning.stretchChance = 0;

let app: App;
const stage = (): HTMLElement => document.getElementById('game') as HTMLElement;
const q = <T extends Element = HTMLElement>(sel: string): T | null => stage().querySelector<T>(sel);
const qa = <T extends Element = HTMLElement>(sel: string): T[] => Array.from(stage().querySelectorAll<T>(sel));
const text = (sel: string): string => q(sel)?.textContent ?? '';
const saved = (): Save => JSON.parse(localStorage.getItem('monstermath.save.v1') ?? '{}') as Save;
const key = (k: string): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
};

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

/** "0.47" as 47 hundredths, without going through a decimal number. */
function hundredths(written: string): number {
  const [whole, rest = ''] = written.split('.');
  return Number(whole) * 100 + Number(`${rest}0`.slice(0, 2));
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const fracIn = (el: Element): { n: number; d: number } => ({ n: Number(el.querySelector('.frac-n')?.textContent), d: Number(el.querySelector('.frac-d')?.textContent) });

/** The number that belongs in each box, worked out from the sum written beside it. */
function boxAnswers(): number[] {
  const [a, b] = (text('.u-head').match(/\d+/g) ?? []).map(Number) as [number, number];
  const dividing = text('.u-head').includes('÷');
  return qa('.u-line').map((line) => {
    const role = line.querySelector('.u-box')?.getAttribute('data-role');
    if (role === 'part') {
      const [x, y] = (line.querySelector('.u-label')?.textContent?.match(/\d+/g) ?? []).map(Number) as [number, number];
      return dividing ? Math.floor(x / y) : x * y;
    }
    if (role === 'left') return a % b;
    return dividing ? Math.floor(a / b) : a * b;
  });
}

function fillBoxes(values: number[]): void {
  qa<HTMLElement>('.u-box').forEach((box, i) => {
    if (box.classList.contains('ok')) return;
    box.click();
    for (let k = 0; k < 4; k++) key('Backspace');
    String(values[i]).split('').forEach(key);
  });
}

/** The right fraction, from the two written beside the loaves. */
function sliceAnswer(): { n: number; d: number } {
  const [a, b] = qa('.upper-note .u-fsum .frac').slice(0, 2).map(fracIn) as [{ n: number; d: number }, { n: number; d: number }];
  const d = (a.d * b.d) / gcd(a.d, b.d);
  const sign = text('.upper-note .e-sign') === '+' ? 1 : -1;
  return { n: (a.n * d) / a.d + (sign * b.n * d) / b.d, d };
}

/** The right decimal in hundredths, from the trays or from the sum in the story. */
function crumbAnswer(): number {
  const story = text('.story');
  if (story.startsWith('A full tray')) return qa('.early-model .crumb.one, .early-model .crumb.tenth, .early-model .crumb.hund').length;
  const [a, b] = (story.match(/\d+\.\d+/g) ?? []).map(hundredths) as [number, number];
  return story.includes('take away') ? a - b : a + b;
}

function givePlaces(n: number): void {
  chip('.ans-row.pl-o', Math.floor(n / 100));
  chip('.ans-row.pl-d1', Math.floor(n / 10) % 10);
  if (q('.ans-row.pl-d2')) chip('.ans-row.pl-d2', n % 10);
}

function moreSide(): 0 | 1 {
  const [a, b] = qa('.e-side .e-numeral').map((el) => hundredths(el.textContent ?? '')) as [number, number];
  return a > b ? 0 : 1;
}

/** Works the problem out from what is on the screen, the way a child would, and hands it in. */
function solve(): void {
  if (q('.u-box')) {
    fillBoxes(boxAnswers());
    click('Check');
  } else if (q('.u-slices')) {
    const right = sliceAnswer();
    chip('.pl-top', right.n);
    chip('.pl-bottom', right.d);
    click('Check');
  } else if (q('.e-side')) {
    (qa('.e-side')[moreSide()] as HTMLElement).click();
  } else {
    givePlaces(crumbAnswer());
    click('Check');
  }
  expect(text('.cy-bubble'), text('.story')).toContain('Yes');
}

function playLesson(kind: UpperKind): void {
  for (const step of LESSONS[LESSON_FOR_UPPER[kind]].steps) {
    expect(q('.lesson-scene')).not.toBeNull();
    if (!step.ask) (q('.lesson-next') as HTMLElement).click();
    else if (step.ask.kind === 'choice') (q(`[data-choice="${step.ask.expected}"]`) as HTMLElement).click();
    else if (step.ask.kind === 'number') {
      String(step.ask.expected).split('').forEach(key);
      click('OK');
    }
  }
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

describe('the bakery games', () => {
  it('every kind and level can be played and solved from what is on the screen', () => {
    for (const kind of UPPER_KINDS) {
      for (let rung = 0; rung <= upperTop(kind); rung++) {
        app.go('upper', { id: 'belch', kind, practice: true, rung });
        for (let i = 0; i < 12; i++) {
          solve();
          if (i < 11) click('Next one');
        }
      }
    }
  });

  it('the keyboard works too: Enter moves to the next box, then checks, then brings the next problem', () => {
    app.go('upper', { id: 'belch', kind: 'mult', practice: true, rung: 1 });
    const before = text('.u-head');
    for (const value of boxAnswers()) {
      String(value).split('').forEach(key);
      key('Enter');
    }
    expect(text('.cy-bubble')).toContain('Yes');
    key('Enter');
    expect(text('.cy-bubble')).not.toContain('Yes');
    expect(text('.u-head')).not.toBe(before);
  });

  it('trying a game from the grown-up page leaves no trace in the save', () => {
    for (const kind of UPPER_KINDS) {
      app.go('upper', { id: 'belch', kind, practice: true, rung: 1 });
      solve();
    }
    app.commit();
    const save = saved();
    expect(save.upper).toBeUndefined();
    expect(save.upperLog).toBeUndefined();
    expect(save.monsters).toEqual({});
    expect(save.days).toEqual({});
    expect(save.seenTips).toEqual([]);
  });

  it('five clean problems move a level up', () => {
    app.go('upper', { id: 'drift', kind: 'div', practice: true, rung: 0 });
    for (let i = 0; i < 5; i++) {
      expect(text('.cy-status')).toContain('level 1 of 5');
      solve();
      click('Next one');
    }
    expect(text('.cy-status')).toContain('level 2 of 5');
  });

  it('a tray: a miss gets coaching, a second lights up the parts, a third shows the answer', () => {
    app.go('upper', { id: 'belch', kind: 'mult', practice: true, rung: 1 });
    const right = boxAnswers();
    const off = right.map((v, i) => (i === right.length - 1 ? v + 1 : v));
    fillBoxes(off);
    click('Check');
    expect(text('.cy-bubble')).toContain('The parts are right');
    // The parts stay; only the total is asked again.
    expect(qa('.u-box.ok')).toHaveLength(2);
    expect(qa('.u-box.bad')).toHaveLength(1);
    fillBoxes(off);
    click('Check');
    expect(q('.bk-cell.lit')).toBeNull();
    vi.advanceTimersByTime(2700);
    expect(qa('.bk-cell.lit')).toHaveLength(2);
    expect(qa('.bk-product').map((el) => el.textContent)).toEqual(right.slice(0, 2).map(String));
    fillBoxes(off);
    click('Check');
    expect(text('.cy-bubble')).toContain('Let me show you');
    expect(qa('.u-box.shown').map((b) => b.textContent)).toEqual(right.map(String));
    click('Check');
    expect(text('.cy-bubble')).toContain('Yes');
  });

  it('slices: adding the bottoms gets coaching, then the counted loaf, then the glowing numbers', () => {
    app.go('upper', { id: 'bug', kind: 'fadd', practice: true, rung: 0 });
    const right = sliceAnswer();
    const wrong = (): void => {
      chip('.pl-top', right.n);
      chip('.pl-bottom', right.d * 2);
      click('Check');
    };
    wrong();
    expect(text('.cy-bubble')).toContain('Only the top numbers are added');
    expect(q('.loaf-row.result')).toBeNull();
    wrong();
    vi.advanceTimersByTime(2700);
    expect(qa('.loaf-row.result .slice.on-a, .loaf-row.result .slice.on-b')).toHaveLength(right.n);
    wrong();
    expect(text('.cy-bubble')).toContain('Let me show you');
    const glowing = qa('.ans-chip.shown');
    expect(glowing.map((c) => c.textContent)).toEqual([String(right.n), String(right.d)]);
    glowing.forEach((c) => (c as HTMLElement).click());
    click('Check');
    expect(text('.cy-bubble')).toContain('Yes');
  });

  it('slices of two sizes: "Cut to match" cuts both loaves into the same slices', () => {
    app.go('upper', { id: 'bug', kind: 'fadd', practice: true, rung: 4 });
    const right = sliceAnswer();
    const sizes = (): number[] => qa('.loaf-row .loaf').map((l) => l.querySelectorAll('.slice').length);
    expect(new Set(sizes()).size).toBe(2);
    click('Cut to match');
    expect(sizes()).toEqual([right.d, right.d]);
    expect(qa('.loaf-row .slice.on-a, .loaf-row .slice.on-b')).toHaveLength(right.n);
  });

  it('crumbs: reading hundredths as tenths gets coaching about strips and squares', () => {
    app.go('upper', { id: 'cook', kind: 'dec', practice: true, rung: 0 });
    const right = crumbAnswer();
    expect(right % 10).toBe(0);
    if (right < 100) {
      // 0.07 for 0.7 cannot be picked on a tenths-only problem, so the nearest slip is the ones place.
      chip('.ans-row.pl-o', (right / 10) % 10);
      chip('.ans-row.pl-d1', 0);
      click('Check');
      expect(text('.cy-bubble').length).toBeGreaterThan(10);
      expect(text('.cy-bubble')).not.toContain('Yes');
    }
    givePlaces(right);
    click('Check');
    expect(text('.cy-bubble')).toContain('Yes');
  });

  it('crumbs: picking the smaller decimal brings out the trays', () => {
    app.go('upper', { id: 'cook', kind: 'dec', practice: true, rung: 2 });
    const right = moreSide();
    expect(q('.e-side .crumb-tray')).toBeNull();
    (qa('.e-side')[1 - right] as HTMLElement).click();
    expect(text('.cy-bubble')).not.toContain('Yes');
    expect(qa('.e-side .crumb-tray').length).toBeGreaterThanOrEqual(2);
    (qa('.e-side')[right] as HTMLElement).click();
    expect(text('.cy-bubble')).toContain('Yes');
    expect(text('.upper-note')).toMatch(/[<>]/);
  });

  it('with a wild monster, five clean problems make a friend and are logged and reported', () => {
    app.go('upper', { id: 'belch' });
    expect(text('.nameplate')).toBe('Wild Belch');
    for (let i = 0; i < 5; i++) {
      solve();
      if (i < 4) click('Next one');
    }
    vi.advanceTimersByTime(1500);
    expect(text('.party')).toContain('Belch is your friend!');
    const save = saved();
    expect(save.monsters.belch?.friend).toBe(true);
    expect(save.upperLog).toHaveLength(5);
    expect(save.upperLog?.[0]).toMatchObject({ kind: 'mult', monster: 'belch', firstTry: true, rung: 0, errors: [], helped: false });
    expect(save.upperLog?.[0]?.text).toMatch(/^\d0 × \d$/);
    expect(save.upper?.mult?.step).toBe(1);
    expect(save.days[Object.keys(save.days)[0] as string]?.trips).toBe(5);
    expect(save.seenTips).toContain('upper');

    // The grown-up page, the teacher summary and the journal report it.
    const stats = upperStats(save).find((s) => s.kind === 'mult');
    expect(stats).toMatchObject({ problems: 5, firstTry: 5, helped: 0, level: '2 of 5' });
    expect(teacherSummary(save)).toContain('Multiplying in parts: level 2 of 5 (Multiplies two digits by one digit, in a tens part and a ones part (23 × 4)), 5 problems, 100% right on the first try');
    expect(skillLevel(save, 'belch')).toEqual({ have: 2, of: 5 });
    app.go('grownups');
    expect(stage().textContent).toContain('Bakery (multiplying and dividing in parts, fractions, decimals)');
    app.go('journal', { id: 'belch' });
    expect(stage().textContent).toContain('Bakery problems solved');
    expect(text('.big-number')).toBe('5');
    // A backup keeps the log.
    expect(readBackup(JSON.stringify(save))?.upperLog).toHaveLength(5);
    expect(readBackup(JSON.stringify({ ...save, upperLog: 'x' }))?.upperLog).toBeUndefined();
  });

  it('a friend plays rounds of three, and a miss is logged with what went wrong', () => {
    app.save.monsters.cook = { id: 'cook', friend: true, metOn: '2026-11-01', friendOn: '2026-11-01', stage: 1, stars: 0, starsByDay: {}, rounds: 0, ways: {}, trips: 0, roundTrips: 0 };
    app.go('upper', { id: 'cook' });
    expect(text('.nameplate')).toBe('Cook');
    // One wrong try first: every digit one too high.
    const right = crumbAnswer();
    chip('.ans-row.pl-o', 1);
    chip('.ans-row.pl-d1', ((right / 10) % 10) + 1 > 9 ? 0 : ((right / 10) % 10) + 1);
    click('Check');
    expect(text('.cy-bubble')).not.toContain('Yes');
    givePlaces(right);
    click('Check');
    expect(text('.cy-bubble')).toContain('Yes');
    for (let i = 0; i < 2; i++) {
      click('Next one');
      solve();
    }
    vi.advanceTimersByTime(1500);
    expect(text('.party')).toContain('Cook got a star!');
    const save = saved();
    expect(save.upperLog).toHaveLength(3);
    expect(save.upperLog?.[0]).toMatchObject({ kind: 'dec', firstTry: false });
    expect(save.upperLog?.[0]?.answers).toHaveLength(2);
    expect(save.upperLog?.[0]?.errors).toHaveLength(1);
    expect(save.monsters.cook?.stars).toBe(1);
  });

  it('the grown-up page opens each game at the level chosen', () => {
    app.go('grownups');
    expect(stage().textContent).toContain('Bakery games');
    const level = qa<HTMLSelectElement>('.gu-select').at(-1) as HTMLSelectElement;
    level.value = '3';
    click('Crumbs');
    expect(q('.upper-screen')).not.toBeNull();
    expect(text('.cy-status')).toContain('level 4 of 5');
    expect(text('.nameplate')).toBe('Cook');
    click('Back');
    expect(q('.grownups-screen')).not.toBeNull();
  });
});

describe('lessons for the bakery', () => {
  it('the pictures agree with the numbers', () => {
    for (const kind of UPPER_KINDS) {
      const lesson = LESSONS[LESSON_FOR_UPPER[kind]];
      expect(lesson.steps).toHaveLength(6);
      for (const step of lesson.steps) {
        const { scene, ask } = step;
        if (scene.t === 'btray' && ask?.kind === 'number') expect(ask.expected).toBe(scene.a * scene.b);
        if (scene.t === 'share' && ask?.kind === 'number') expect(ask.expected).toBe(scene.total - scene.by * scene.dealt);
        if (scene.t === 'share') expect(scene.total - scene.by * scene.dealt).toBeGreaterThanOrEqual(0);
        if (scene.t === 'loaves' && ask?.kind === 'number') expect(ask.expected).toBe(scene.loaves.reduce((sum, l) => sum + (l.shaded * (l.recut ?? l.parts)) / l.parts, 0));
        if (scene.t === 'crumbs' && ask?.kind === 'choice') expect(hundredths(ask.expected)).toBe(Math.max(scene.n, scene.other ?? 0));
      }
    }
  });

  it('"Teach me" plays the lesson and comes back; a grown-up trying it leaves no trace', () => {
    for (const [i, kind] of UPPER_KINDS.entries()) {
      app.go('upper', { id: UPPER_ORDER[i], kind, practice: true, rung: 0 });
      click('Teach me');
      expect(q('.lesson-screen')?.getAttribute('data-lesson')).toBe(kind);
      playLesson(kind);
      expect(q('.upper-screen')).not.toBeNull();
    }
    app.commit();
    expect(saved().lessons).toBeUndefined();
  });

  it('with a real monster the lesson counts as taught', () => {
    app.go('upper', { id: 'drift' });
    click('Teach me');
    playLesson('div');
    expect(q('.upper-screen')).not.toBeNull();
    expect(saved().lessons?.div?.seen).toBe(1);
  });
});

describe('a first-day check that starts at the Bakery', () => {
  it('is offered on the grown-up page and asks about numbers, multiplying, dividing and fractions', () => {
    expect(START_POINTS.map((s) => s.id)).toEqual(['auto', 'early', 'sums', 'middle', 'upper']);
    expect(strandPlan('upper', {}).map((s) => s.id)).toEqual(['place', 'mul', 'div', 'frac']);
    app.go('grownups');
    const select = q<HTMLSelectElement>('.gu-start') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toContain('upper');
    select.value = 'upper';
    select.dispatchEvent(new Event('change'));
    expect(app.save.startAt).toBe('upper');
    expect(stage().textContent).toContain('already multiplies and divides with small numbers');
  });

  it('leaves out adding and subtracting, ends with a first friend, and opens the Bakery', () => {
    app.save.startAt = 'upper';
    app.go('intro');
    (qa('.pick-card')[0] as HTMLElement).click();
    click('Pick Puff');
    for (let k = 0; k < 3; k++) (q('.meet-card .pet-target') as HTMLElement).click();
    vi.advanceTimersByTime(1100);
    click('This name!');
    for (let k = 0; k < 5; k++) (q('.big-berry') as HTMLElement).click();
    click('Let us go!');

    expect(qa('.feed-progress i')).toHaveLength(4);
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
    expect(save.intakeLevels).toEqual({ place: 0, mul: 0, div: 0, frac: 0 });
    expect(save.startAt).toBe('upper');
    // Sums were not asked, so there is no warning about them.
    expect(intakeWarning(save)).toBeNull();
    expect(nextWild(save, upperQueue(save))).toEqual({ id: 'belch', ready: true });

    // On the meadow the Bakery button leads to Belch, by way of the lesson.
    click('Go to the meadow');
    expect(qa('.place')).toHaveLength(5);
    click('Bakery');
    expect(q('.lesson-screen')?.getAttribute('data-lesson')).toBe('mult');
    playLesson('mult');
    expect(q('.upper-screen')).not.toBeNull();
    expect(text('.nameplate')).toBe('Wild Belch');
  });
});

describe('where the bakery ladders start', () => {
  it('starts at the bottom without a first-day check, and one rung up for what was shown', () => {
    for (const kind of UPPER_KINDS) expect(upperStartStep(undefined, kind)).toBe(0);
    expect(upperStartStep({ mul: 4 }, 'mult')).toBe(0);
    expect(upperStartStep({ mul: 5 }, 'mult')).toBe(1);
    expect(upperStartStep({ div: 5 }, 'div')).toBe(1);
    expect(upperStartStep({ frac: 4 }, 'fadd')).toBe(1);
    expect(upperStartStep({ place: 5, frac: 5 }, 'dec')).toBe(0);
    for (const kind of UPPER_KINDS) expect(upperStartStep({ place: 5, mul: 6, div: 5, frac: 5 }, kind)).toBeLessThanOrEqual(upperTop(kind));
  });
});

describe('spoken lines', () => {
  it('every clip the bakery asks for is in the recording script', () => {
    const recorded = new Set(recordingScript().map(([k]) => k));
    const keys = [...source.matchAll(/'((?:u[qhc]|upper|show_you|stretch)_[a-z0-9_]+|yes|show_you)'/g)].map((m) => m[1] as string);
    expect(keys.length).toBeGreaterThan(20);
    for (const k of keys) expect(recorded, k).toContain(k);
    for (const id of UPPER_ORDER) {
      expect(recorded).toContain(`name_${id}`);
      expect(recorded).toContain(`about2_${id}`);
    }
    const about = new Map(recordingScript());
    expect(about.get('about2_belch')).toBe('Belch. A burp pod beast. Has two pods on its head. They burp. Loves big trays.');
    expect(about.get('about2_cook')).toBe('Cook. A sail hound. Has eight legs and a sail on its back. Loves crumbs.');
  });

  it('every line in a speech bubble is short enough to fit', () => {
    const lines = new Map(recordingScript());
    for (const [k, line] of lines) if (/^u[qhc]_|^upper_tip$/.test(k)) expect(line.length, k).toBeLessThanOrEqual(84);
    for (const kind of UPPER_KINDS) for (const step of LESSONS[LESSON_FOR_UPPER[kind]].steps) expect(step.text.length, step.clip).toBeLessThanOrEqual(84);
  });
});
