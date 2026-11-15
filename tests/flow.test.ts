import { beforeAll, describe, expect, it, vi } from 'vitest';
import { STRANDS, type IntakeItem } from '../src/intake';
import { LESSONS, type LessonId } from '../src/lessons';
import { tuning } from '../src/ladder';
import { clock, type Save } from '../src/state';

/** New monsters are limited per day and a skill has to hold overnight: the script sleeps between them. */
let nights = 0;
const tomorrow = (): void => {
  nights += 1;
  const shift = nights * 86_400_000;
  clock.now = () => new Date(Date.now() + shift);
};

// The scripted sessions play at her own rung; stretch problems have their own tests.
tuning.stretchChance = 0;

/** Plays the first session end to end in jsdom, the way a child would click through it. */

const stage = (): HTMLElement => document.getElementById('stage') as HTMLElement;
const q = <T extends Element = HTMLElement>(sel: string): T | null => stage().querySelector<T>(sel);
const qa = <T extends Element = HTMLElement>(sel: string): T[] => Array.from(stage().querySelectorAll<T>(sel));
/** Open a friend's card: tap it in the meadow, or call it out from "All friends" when it is resting. */
const openFriend = (id: string): void => {
  const inMeadow = q(`.friend[data-id="${id}"]`);
  if (inMeadow) inMeadow.click();
  else {
    q('.friends-btn')!.click();
    q(`.friends-tile[data-id="${id}"]`)!.click();
  }
};
const text = (sel: string): string => q(sel)?.textContent ?? '';

function buttonByText(label: string): HTMLElement {
  const found = qa<HTMLElement>('button').find((b) => (b.textContent ?? '').trim() === label);
  if (!found) throw new Error(`No button "${label}". Buttons: ${qa('button').map((b) => (b.textContent ?? '').trim()).filter(Boolean).join(' | ')}`);
  return found;
}

const click = (label: string): void => buttonByText(label).click();
const key = (k: string): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
};
const type = (s: string): void => s.split('').forEach(key);
const wait = (ms: number): void => {
  vi.advanceTimersByTime(ms);
};
const saved = (): Save => JSON.parse(localStorage.getItem('monstermath.save.v1') ?? '{}') as Save;

/** The no-math welcome after picking: say hello, keep the name, feed five berries. */
function meetFriend(): void {
  expect(text('.meet-bubble')).toContain('are friends now');
  for (let k = 0; k < 3; k++) (q('.meet-card .pet-target') as HTMLElement).click();
  wait(1100);
  expect(text('.meet-bubble')).toContain('need a new name');
  click('This name!');
  expect(qa('.big-berry')).toHaveLength(5);
  for (let k = 0; k < 5; k++) (q('.big-berry') as HTMLElement).click();
  click('Let us go!');
}

/** Between strands the monster wants three taps. */
function cuddleIfAsked(): void {
  if (!q('.cuddle')) return;
  for (let k = 0; k < 3; k++) (q('.feed-left .pet-target') as HTMLElement).click();
  wait(1000);
}

function answer(item: IntakeItem): void {
  cuddleIfAsked();
  expect(text('.feed-show')).toBe(item.show);
  if (item.choices) click(item.expected);
  else {
    type(item.expected);
    click('Feed');
  }
  wait(1000);
}

/** Works through the lesson on screen, if there is one, and returns its id. */
function finishLesson(): string | null {
  const screen = q('.lesson-screen');
  if (!screen) return null;
  const id = screen.getAttribute('data-lesson') as LessonId;
  for (const step of LESSONS[id].steps) {
    expect(text('.lesson-bubble')).toBe(step.text);
    const ask = step.ask;
    if (!ask) (q('.lesson-next') as HTMLElement).click();
    else if (ask.kind === 'tap') click(ask.label);
    else if (ask.kind === 'choice') (q(`[data-choice="${ask.expected}"]`) as HTMLElement).click();
    else {
      type(String(ask.expected));
      key('Enter');
    }
  }
  return id;
}

function giveTreat(a: number, op: string, b: number): void {
  type(String(a));
  key(op);
  type(String(b));
  key('Enter');
}

function pickAnswer(n: number): void {
  const rows = qa('.ans-row');
  const digits = String(n).padStart(rows.length, '0').split('');
  rows.forEach((row, i) => {
    (row.querySelectorAll('.ans-chip')[Number(digits[i])] as HTMLElement).click();
  });
}

function readProblem(): { a: number; b: number; adding: boolean } {
  const story = text('.story');
  const nums = (story.match(/\d+/g) ?? []).map(Number);
  return { a: nums[0] as number, b: nums[1] as number, adding: story.includes('Here come') };
}

function solveTrip(): void {
  const { a, b, adding } = readProblem();
  pickAnswer(adding ? a + b : a - b);
  click('Check');
}

/** Pick the top and bottom numbers of a fraction answer. */
function pickFrac(n: number, d: number): void {
  const rows = qa('.ans-row');
  const chip = (row: Element, value: number): HTMLElement =>
    Array.from(row.querySelectorAll<HTMLElement>('.ans-chip')).find((c) => c.textContent === String(value)) as HTMLElement;
  chip(rows[0] as Element, n).click();
  chip(rows[1] as Element, d).click();
}

/** Solves the honey bar problem on screen (naming a fraction, or building one). */
function solveHoney(): void {
  const target = q('.hollow-note .frac');
  const n = Number(target?.querySelector('.frac-n')?.textContent);
  const d = Number(target?.querySelector('.frac-d')?.textContent);
  if (text('.hollow-note .note-word') === 'make') {
    const cut = qa('.cut-chip').find((c) => c.textContent === String(d));
    if (cut) cut.click();
    expect(qa('.hollow-model button.hpiece')).toHaveLength(d);
    for (let k = 0; k < n; k++) (qa('.hollow-model button.hpiece')[k] as HTMLElement).click();
  } else {
    pickFrac(qa('.hollow-model .hpiece.on').length, qa('.hollow-model .hpiece').length);
  }
  click('Check');
}

describe('first session', () => {
  beforeAll(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    document.body.innerHTML = '<div id="stage-wrap"><div id="stage"></div></div>';
    await import('../src/main');
  });

  it('starts on the title screen', () => {
    expect(q('.logo-art img')?.getAttribute('alt')).toBe('MonsterMath');
    click('Start');
    expect(qa('.pick-card')).toHaveLength(3);
  });

  it('picks a starter and feeds it through the placement check', () => {
    (qa('.pick-card')[0] as HTMLElement).click();
    click('Pick Puff');
    meetFriend();
    expect(q('.feed-card')).not.toBeNull();
    // Answer every level of every strand correctly: the full staircase.
    for (const strand of STRANDS) {
      for (const level of strand.levels) {
        answer(level.items[0]);
        // A pick-one level asks both of its questions.
        if (level.items[0].choices) answer(level.items[1]);
      }
    }
    expect(text('.party h2')).toBe('Puff is your friend!');
    const save = saved();
    expect(save.introDone).toBe(true);
    expect(save.placement).toHaveLength(43);
    expect(save.intakeLevels).toEqual({ place: 5, add: 7, sub: 7, mul: 6, div: 5, frac: 5 });
    expect(save.startStep).toEqual({ add: 4, addR: 4, sub: 4, subR: 4 });
    expect(save.placement.every((p) => p.correct)).toBe(true);
    expect(save.fast).toEqual({ add: true, addR: true, sub: true, subR: true });
    click('Go to the meadow');
    expect(qa('.friend')).toHaveLength(1);
  });

  it('befriends Dab with treats, and safe answers do not get there alone', () => {
    click('Tall Grass');
    expect(finishLesson()).toBe('parts');
    expect(text('.nameplate')).toBe('Wild Dab');
    const target = Number(text('.target-badge'));
    expect(target).toBeGreaterThanOrEqual(7);

    giveTreat(target, '+', 0);
    giveTreat(target, '*', 1);
    expect(qa('.meter .icon.on').length).toBe(2);

    giveTreat(target - 2, '+', 3); // a miss: nothing lost
    expect(qa('.meter .icon.on').length).toBe(2);
    expect(text('.feedback-text')).toContain(`makes ${target + 1}`);
    key('Backspace');
    key('Backspace');
    key('Backspace');
    key('Backspace');
    key('Backspace');

    giveTreat(target - 2, '+', 2);
    giveTreat(target - 3, '+', 3);
    giveTreat(target + 4, '-', 4);
    wait(1600);
    expect(text('.party h2')).toBe('Dab is your friend!');
    click('Hooray!');
    expect(qa('.friend')).toHaveLength(2);
    expect(saved().monsters.dab?.friend).toBe(true);
    expect(Object.values(saved().monsters.dab?.ways ?? {})[0]?.length).toBeGreaterThanOrEqual(4);
  });

  it('asks for the favorite treat when the meter fills without it', () => {
    // She passed every subtraction level in the first-day check, so Moss starts two pools up.
    // Pin the number to the top of that pool (35).
    tomorrow();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    click('Tall Grass');
    random.mockRestore();
    expect(text('.nameplate')).toBe('Wild Moss');
    const target = Number(text('.target-badge'));
    expect(target).toBe(35);
    expect(saved().monsters.moss?.pool).toBe(2);
    giveTreat(target - 2, '+', 2);
    giveTreat(target - 3, '+', 3);
    giveTreat(target - 4, '+', 4);
    wait(1600);
    expect(q('.party')).toBeNull();
    expect(text('.feedback-text')).toContain('loves minus treats');
    click('Help me');
    expect(text('.hint-text')).toContain('−');
    const start = Number(text('.slot'));
    type(String(start - target));
    key('Enter');
    wait(1600);
    expect(text('.party h2')).toBe('Moss is your friend!');
    click('Hooray!');
  });

  it('feeds Nub in the canyon: joining berries', () => {
    tomorrow();
    click('Berry Canyon');
    expect(text('.nameplate')).toBe('Wild Nub');
    click('Put together');
    solveTrip();
    click('Next trip');
    solveTrip();
    wait(1500);
    expect(text('.party h2')).toBe('Nub is your friend!');
    click('Hooray!');
  });

  it('feeds Plum: a wrong answer gets coaching, packing a crate fixes it', () => {
    tomorrow();
    click('Berry Canyon');
    expect(finishLesson()).toBe('pack');
    expect(text('.nameplate')).toBe('Wild Plum');
    const { a, b } = readProblem();
    const noCarry = (Math.floor(a / 10) + Math.floor(b / 10)) * 10 + ((a % 10) + (b % 10)) % 10;
    pickAnswer(noCarry);
    click('Check');
    expect(text('.cy-bubble')).toContain('Pack a crate');
    click('Put together');
    click('Pack 10 berries in a crate');
    expect(qa('.n-mark').some((m) => m.textContent === '1')).toBe(true);
    pickAnswer(a + b);
    click('Check');
    expect(text('.cy-bubble')).toContain('Yes!');
    click('Next trip');
    solveTrip();
    click('Next trip');
    solveTrip();
    wait(1500);
    expect(text('.party h2')).toBe('Plum is your friend!');
    click('Hooray!');
    const log = saved().tripLog;
    expect(log.some((t) => !t.firstTry && t.errors.includes('no-carry'))).toBe(true);
  });

  it('feeds Dusk and Chip: eating berries and opening a crate', () => {
    tomorrow();
    click('Berry Canyon');
    expect(text('.nameplate')).toBe('Wild Dusk');
    let p = readProblem();
    for (let i = 0; i < Math.floor(p.b / 10); i++) (q('.grp-t .feedable') as HTMLElement).click();
    for (let i = 0; i < p.b % 10; i++) (q('.grp-o .feedable') as HTMLElement).click();
    expect(text('.mat-note')).toContain('Count what is left');
    expect(qa('.grp-h .cart').length * 100 + qa('.grp-t .crate').length * 10 + qa('.grp-o .berry').length).toBe(p.a - p.b);
    solveTrip();
    click('Next trip');
    solveTrip();
    wait(1500);
    click('Hooray!');

    tomorrow();
    click('Berry Canyon');
    expect(finishLesson()).toBe('open');
    expect(text('.nameplate')).toBe('Wild Chip');
    p = readProblem();
    for (let i = 0; i < Math.floor(p.b / 10); i++) (q('.grp-t .feedable') as HTMLElement).click();
    expect(q('.grp-o .feedable') === null || p.a % 10 < p.b % 10).toBe(true);
    click('Open a crate');
    for (let i = 0; i < p.b % 10; i++) (q('.grp-o .feedable') as HTMLElement).click();
    expect(qa('.grp-h .cart').length * 100 + qa('.grp-t .crate').length * 10 + qa('.grp-o .berry').length).toBe(p.a - p.b);
    expect(qa('.n-cell.struck').length).toBe(2);
    solveTrip();
    click('Next trip');
    solveTrip();
    wait(1500);
    expect(text('.party h2')).toBe('Chip is your friend!');
    click('Hooray!');
  });

  it('shows the journal', () => {
    expect(q('.party')).toBeNull();
    // Seven friends, six in the meadow: the seventh rests until it is called out.
    expect(qa('.friend')).toHaveLength(6);
    q('.friends-btn')!.click();
    expect(qa('.friends-tile')).toHaveLength(7);
    const resting = q('.friends-tile.resting')!.dataset.id as string;
    q('.friends-tile.resting')!.click();
    expect(q(`.friend[data-id="${resting}"]`)).not.toBeNull();
    expect(q('.friend-card')).not.toBeNull();
    expect(qa('.friend')).toHaveLength(6);
    // She can send that friend back to rest, and the one it pushed out returns.
    click('Rest');
    expect(q(`.friend[data-id="${resting}"]`)).toBeNull();
    expect(qa('.friend')).toHaveLength(6);
    click('Journal');
    expect(text('.journal-count')).toBe('7 of 21');
    (qa('.journal-tile.known')[1] as HTMLElement).click();
    expect(q('.journal-page')).not.toBeNull();
    click('Meadow');
  });

  it('plays with a friend for a star', () => {
    openFriend('dab');
    click('Play');
    const target = Number(text('.target-badge'));
    giveTreat(target - 2, '+', 2);
    giveTreat(target - 3, '+', 3);
    giveTreat(target + 5, '-', 5);
    wait(1600);
    expect(text('.party h2')).toContain('got a star!');
    click('Meadow');
  });

  it('plays a canyon round with a friend', () => {
    click('Berry Canyon');
    expect(text('.nameplate')).not.toContain('Wild');
    solveTrip();
    click('Next trip');
    solveTrip();
    click('Next trip');
    solveTrip();
    wait(1500);
    expect(text('.party h2')).toContain('got a star!');
    click('Meadow');
  });

  it('hatches the egg she earned and shows the sticker book', () => {
    if (text('.party h2') === 'You did it all today!') click('Okay');
    expect(saved().xp).toBeGreaterThan(50);
    expect(q('.egg-nest.ready')).not.toBeNull();
    (q('.egg-nest') as HTMLElement).click();
    expect(text('.party h2')).toBe('It is Tup!');
    // The hatching sequence plays first; the card fills in when it ends.
    expect(q('.party.pending .fx-hatch')).not.toBeNull();
    wait(3100);
    expect(q('.party.pending')).toBeNull();
    expect(q('.party .monster')).not.toBeNull();
    click('Hello!');
    expect(qa('.friend')).toHaveLength(6);
    expect(q('.friend[data-id="tup"]')).not.toBeNull();
    expect(saved().monsters.tup?.friend).toBe(true);
    expect(text('.rank-label')).toMatch(/Ranger level [2-9]/);

    // Feeding spends earned berries; a new buddy takes over as helper.
    const berriesBefore = saved().berries ?? 0;
    expect(berriesBefore).toBeGreaterThan(10);
    openFriend('dab');
    click('Feed');
    click('Ball');
    expect(saved().berries).toBe(berriesBefore - 1);
    click('Make buddy');
    expect(saved().buddy).toBe('dab');
    expect(qa('.friend.is-buddy')).toHaveLength(1);
    wait(6000); // friends wander without errors

    openFriend('puff');
    click('Pet');
    click('Pet');
    expect(saved().monsters.puff?.bond).toBeGreaterThanOrEqual(2);

    const earned = saved().stickers;
    expect(earned).toContain('friend');
    expect(earned).toContain('hatch');
    expect(earned).toContain('eight');
    const label = qa('button').find((b) => (b.textContent ?? '').startsWith('Stickers'));
    (label as HTMLElement).click();
    expect(qa('.sticker-tile.earned').length).toBe(earned.length);
    click('Meadow');
  });

  it('learns what a fraction is in Honey Hollow', () => {
    tomorrow();
    click('Honey Hollow');
    expect(finishLesson()).toBe('frac');
    expect(text('.nameplate')).toBe('Wild Bix');

    // A swapped answer on a naming problem gets the coaching for that mistake.
    if (text('.hollow-note .note-word') !== 'make') {
      const gold = qa('.hollow-model .hpiece.on').length;
      const all = qa('.hollow-model .hpiece').length;
      if (gold >= 2 && gold !== all - gold) {
        pickFrac(all, gold);
        click('Check');
        expect(text('.cy-bubble')).toContain('bottom number is how many pieces in all');
      }
    }
    for (let k = 0; k < 6 && !q('.party'); k++) {
      if (k > 0) click('Next one');
      solveHoney();
      wait(1500);
    }
    expect(text('.party h2')).toBe('Bix is your friend!');
    click('Hooray!');
    const log = saved().fracLog ?? [];
    expect(log.length).toBeGreaterThanOrEqual(5);
    expect(log.every((f) => f.kind === 'name')).toBe(true);
    expect(saved().monsters.bix?.friend).toBe(true);
    expect(qa('.friend')).toHaveLength(6);
    expect(q('.friend[data-id="bix"]')).not.toBeNull();
  });

  it('meets the next hollow monster after its lesson, and gets counting help after two misses', () => {
    // Bix is a friend, but the next monster waits until the skill went well on three different days.
    click('Journal');
    click('Meadow');
    expect(q('.place-hollow .peek-soon')).not.toBeNull();
    const marks = (): number => qa('.place-hollow .peek-steps i.on').length;
    for (let day = 0; day < 3 && q('.place-hollow .peek-soon'); day++) {
      const before = marks();
      tomorrow();
      openFriend('bix');
      click('Play');
      for (let k = 0; k < 4; k++) {
        if (k > 0) click(q('.party') ? 'Play again' : 'Next one');
        solveHoney();
        wait(1500);
      }
      click('Meadow');
      // Each good day lights one mark, until the third brings the monster out.
      if (q('.place-hollow .peek-soon')) expect(marks()).toBeGreaterThanOrEqual(Math.max(1, before));
    }
    tomorrow();
    click('Journal');
    click('Meadow');
    expect(q('.place-hollow .peek-soon')).toBeNull();

    click('Honey Hollow');
    expect(finishLesson()).toBe('same');
    expect(text('.nameplate')).toBe('Wild Tam');
    click('Show me');
    expect(text('.cy-bubble').length).toBeGreaterThan(10);
    click('Meadow');
  });

  it('spends berries on a charm and a decoration', () => {
    const before = saved().berries ?? 0;
    expect(before).toBeGreaterThanOrEqual(18);
    q('.shop-btn')!.click();
    // The day's gift was already a charm; the shop sells the rest.
    const owned = (saved().charms ?? []).length;
    expect(owned).toBe(1);
    (q('.shop-buy') as HTMLElement).click();
    expect(saved().charms).toHaveLength(owned + 1);
    click('Decorations');
    (q('.shop-buy') as HTMLElement).click(); // the flowers
    expect(saved().decor?.map((d) => d.id)).toEqual(['flowers']);
    expect(saved().berries).toBeLessThan(before - 15);
    // A decoration can be put away to keep the meadow clear, and brought back.
    click('Put away');
    expect(saved().decor?.[0]?.away).toBe(true);
    click('Put out');
    expect(saved().decor?.[0]?.away).toBeUndefined();
    click('Meadow');
    expect(qa('.decor')).toHaveLength(1);

    openFriend('puff');
    (q('.charm-pick') as HTMLElement).click();
    expect(saved().monsters.puff?.charm).toBeTruthy();
    expect(q('.friend-card .charm')).not.toBeNull();
    expect(q('.friend[data-id="puff"] .charm')).not.toBeNull();
    (q('.card-close') as HTMLElement).click();
    wait(16000); // friends meet, greet and play tag without errors
  });

  it('says good night when the day is done, and can wake the meadow again', () => {
    // Three treats, three trips and a star: the day's goals are met.
    openFriend('bix');
    click('Play');
    for (let k = 0; k < 3; k++) {
      if (k > 0) click(q('.party') ? 'Play again' : 'Next one');
      solveHoney();
      wait(1500);
    }
    click('Meadow');
    openFriend('dab');
    click('Play');
    const target = Number(text('.target-badge'));
    giveTreat(target - 2, '+', 2);
    giveTreat(target - 3, '+', 3);
    giveTreat(target + 5, '-', 5);
    wait(1600);
    click('Meadow');
    expect(text('.party h2')).toBe('You did it all today!');
    click('Okay');
    click('Good night');
    expect(Object.values(saved().days).some((d) => d.asleep)).toBe(true);
    wait(4000);
    expect(text('.night-card h3')).toBe('Good night!');
    expect(qa('.friend.sleepy').length).toBe(qa('.friend').length);
    click('Bye for now');
    click('Play');
    expect(q('.night-sky.on')).not.toBeNull();
    click('Wake up!');
    expect(q('.night-sky.on')).toBeNull();
    expect(Object.values(saved().days).some((d) => d.asleep)).toBe(false);
  });

  it('only speaks lines that have a recording', async () => {
    const { spokenLog } = await import('../src/audio');
    const { recordingScript } = await import('../src/voice/lines');
    const recorded = new Set(recordingScript().map(([key]) => key));
    expect(spokenLog.length).toBeGreaterThan(60);
    expect([...new Set(spokenLog)].filter((id) => !recorded.has(id))).toEqual([]);
  });

  it('opens the grown-up page with real numbers', () => {
    const hold = q('.hold') as HTMLElement;
    hold.dispatchEvent(new Event('pointerdown'));
    wait(1600);
    expect(text('.gu-top h1')).toBe('For grown-ups: Player 1');
    const page = text('.gu-scroll');
    expect(page).toContain('Addition with regrouping');
    expect(page).toContain('Added each column but dropped the extra ten');
    expect(page).toContain('First-day check');
    click('Back to the game');
    expect(q('.home-screen')).not.toBeNull();
  });
});

describe('a child who finds the sums hard', () => {
  it('each strand stops after two misses, she can take a break, and the canyon starts easy', async () => {
    vi.useFakeTimers();
    localStorage.clear();
    const { startApp } = await import('../src/main');
    document.body.innerHTML = '<div id="stage-wrap"><div id="stage"></div></div>';
    startApp(stage());
    click('Start');
    (qa('.pick-card')[1] as HTMLElement).click();
    click('Pick Pim');
    meetFriend();

    // Place value: passes counting and teens, then misses both tries at the next level.
    const place = STRANDS[0]!;
    answer(place.levels[0]!.items[0]);
    answer(place.levels[1]!.items[0]);
    expect(text('.feed-show')).toBe('How many berries?');
    click('Not sure');
    wait(1000);
    type('25'); // the retry shows 52: a transposed answer
    click('Feed');
    wait(1000);
    expect(saved().intakeLevels).toEqual({ place: 2 });
    expect(text('.cuddle h2')).toBe('Quick break!');
    cuddleIfAsked();

    // Addition: first question right, then two misses at the next level.
    expect(text('.feed-show')).toBe('5 + 3');
    type('8');
    click('Feed');
    wait(1000);
    click('Not sure');
    wait(1000);
    click('Not sure');
    wait(1000);
    expect(saved().intakeLevels).toEqual({ place: 2, add: 1 });
    cuddleIfAsked();

    // A break, then back to the same place.
    click('Take a break');
    click('Start');
    expect(qa('.feed-progress i.done')).toHaveLength(2);
    expect(text('.feed-show')).toBe('8 − 3');

    for (let i = 0; i < 40 && !q('.party'); i++) {
      cuddleIfAsked();
      click('Not sure');
      wait(1000);
    }
    const save = saved();
    expect(save.intakeLevels).toEqual({ place: 2, add: 1, sub: 0, mul: 0, div: 0, frac: 0 });
    // 4 + 3 questions before the break, then two per typed strand and one for fractions (pick-one).
    expect(save.placement).toHaveLength(14);
    // She passed sums within 10 only, so addition starts one rung up from the bottom.
    expect(save.startStep).toEqual({ add: 1, addR: 0, sub: 0, subR: 0 });

    click('Go to the meadow');
    tomorrow();
    click('Berry Canyon');
    const first = readProblem();
    expect(first.b).toBeLessThan(10);
    solveTrip();
    click('Next trip');
    solveTrip();
    click('Next trip');
    solveTrip();
    // Three clean trips are not yet enough to move up: the game wants five of six.
    expect(saved().monsters.nub?.step).toBe(1);
    expect(saved().monsters.nub?.recent).toEqual([1, 1, 1]);

    // She asks to be shown: the game does the block moves one press at a time.
    click('Next trip');
    click('Show me');
    for (let i = 0; i < 8 && qa('button').some((b) => b.textContent === 'Next'); i++) click('Next');
    expect(text('.cy-bubble')).toContain('Now count');
    expect(qa('.mat .count').length).toBeGreaterThan(0);
    solveTrip();
    const shown = saved().tripLog.at(-1);
    expect(shown?.helped).toBe(true);
    expect(shown?.firstTry).toBe(false);

    // Two wrong answers on one problem: the game steps in without being asked.
    click('Next trip');
    const { a, b } = readProblem();
    pickAnswer(a + b + 1);
    click('Check');
    pickAnswer(a + b + 2);
    click('Check');
    wait(3000);
    expect(text('.cy-bubble')).toContain('Let me show you');
    for (let i = 0; i < 8 && qa('button').some((x) => x.textContent === 'Next'); i++) click('Next');
    pickAnswer(a + b);
    click('Check');
    expect(saved().tripLog.at(-1)?.helped).toBe(true);
    // Two trips in a row that needed help: one rung down, to sums within 10.
    expect(saved().monsters.nub?.step).toBe(0);

    const { intakeWarning } = await import('../src/report');
    expect(intakeWarning(saved())).toContain('In subtraction the check stopped before sums within 10');

    // Stretch problems: after two clean trips at her rung, one comes from the rung above.
    click('Next trip');
    finishLesson(); // stepping down replays the lesson first
    expect(readProblem().a).toBeLessThan(10);
    solveTrip();
    wait(1500);
    expect(text('.party h2')).toBe('Nub is your friend!');
    click('Hooray!');
    // Two of her six trips needed help, so the next monster waits and she plays with Nub again.
    expect(q('.place-canyon .peek-soon')).not.toBeNull();
    click('Berry Canyon');
    expect(text('.nameplate')).toBe('Nub');
    solveTrip();
    tuning.stretchChance = 1;
    click('Next trip');
    tuning.stretchChance = 0;
    expect(text('.cy-bubble')).toContain('A tricky one');
    const tricky = readProblem();
    expect(tricky.a).toBeGreaterThan(10); // a teen number plus ones: the rung above sums within 10
    pickAnswer(tricky.a + tricky.b + 1);
    click('Check');
    expect(text('.cy-bubble')).toContain('extra tricky');
    wait(3000); // one miss on a stretch problem brings the walkthrough
    expect(text('.cy-bubble')).toContain('Let me show you');
    for (let i = 0; i < 8 && qa('button').some((x) => x.textContent === 'Next'); i++) click('Next');
    pickAnswer(tricky.a + tricky.b);
    click('Check');
    expect(saved().tripLog.at(-1)).toMatchObject({ stretch: true, rung: 0, firstTry: false });
    // A missed stretch problem never moves her down.
    expect(saved().monsters.nub?.step).toBe(0);
    expect(saved().monsters.nub?.recent).toEqual([1, 1, 2]);

    // Three misses on one trip: the answer is shown, she copies it, and it earns nothing.
    click('Next trip');
    const hard = readProblem();
    for (const off of [1, 2, 3]) {
      pickAnswer(hard.a + hard.b + off);
      click('Check');
    }
    expect(text('.cy-bubble')).toContain('Let me show you');
    expect(qa('.ans-chip.shown').length).toBe(qa('.ans-row').length);
    expect(qa<HTMLButtonElement>('.ans-chip').filter((c) => !c.disabled)).toHaveLength(qa('.ans-row').length);
    const berries = saved().berries;
    qa('.ans-chip.shown').forEach((c) => c.click());
    click('Check');
    expect(text('.cy-bubble')).toContain('Yes!');
    expect(saved().tripLog.at(-1)).toMatchObject({ firstTry: false, helped: true });
    expect(saved().berries).toBe(berries);
  });
});

describe('more than one player', () => {
  it('adds a second player, asks who is playing, and loads a backup as a new player', async () => {
    vi.useFakeTimers();
    localStorage.clear();
    const { startApp } = await import('../src/main');
    const { freshSave, befriend, players, currentPlayer, persist } = await import('../src/state');
    const first = freshSave();
    first.starter = 'puff';
    first.introDone = true;
    befriend(first, 'puff');
    persist(first);
    document.body.innerHTML = '<div id="stage-wrap"><div id="stage"></div></div>';
    const app = startApp(stage());
    expect(q('.title-screen')).not.toBeNull();
    click('Players');
    expect(qa('.player-card')).toHaveLength(1);
    click('New player');
    const input = q<HTMLInputElement>('.player-input')!;
    input.value = 'Sam';
    click('OK');
    expect(q('.title-screen')).not.toBeNull();
    expect(currentPlayer().name).toBe('Sam');
    expect(app.save.starter).toBeNull();
    buttonByText('Start');

    // A new visit with two players starts at the picker.
    startApp(stage());
    expect(text('.players-title')).toBe('Who is playing?');
    expect(qa('.player-name').map((n) => n.textContent)).toEqual(['Player 1', 'Sam']);
    (qa('.player-card')[0] as HTMLElement).click();
    expect(currentPlayer().id).toBe('p1');
    buttonByText('Play');
    buttonByText('Player 1: change player');

    // Removing a player from the grown-up page.
    const app2 = startApp(stage());
    (qa('.player-card')[1] as HTMLElement).click();
    app2.go('grownups');
    click('Remove Sam');
    click('Click again to remove Sam and erase their progress');
    expect(players()).toHaveLength(1);
    expect(q('.players-screen')).not.toBeNull();
    vi.useRealTimers();
  });
});
