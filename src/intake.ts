import type { FracKind } from './math/fractions';
import type { Delivery } from './math/regroup';
import { addStory, subStory } from './voice/lines';

/**
 * The intake: six short staircases, one per strand. Each starts with an easy
 * win and climbs one level per right answer. A miss gets one more try at the
 * same level; a second miss ends the strand. What she passed sets where the
 * game starts, and gives her teacher a map.
 */

export type StrandId = 'place' | 'add' | 'sub' | 'mul' | 'div' | 'frac';

export type Visual =
  | { type: 'dots'; n: number }
  | { type: 'blocks'; n: number }
  | { type: 'array'; rows: number; cols: number }
  | { type: 'groups'; total: number; groups: number }
  | { type: 'bar'; parts: number; shaded: number };

export interface IntakeItem {
  show: string;
  expected: string;
  /** Present for a pick-one question; absent for a typed number. */
  choices?: string[];
  clips: Array<string | null>;
  visual?: Visual;
}

export interface Level {
  /** For the grown-up page. */
  label: string;
  grade: string;
  /** The question, and a second one of the same kind for the retry. */
  items: [IntakeItem, IntakeItem];
}

export interface Strand {
  id: StrandId;
  name: string;
  levels: Level[];
}

function plus(a: number, b: number): IntakeItem {
  return { show: `${a} + ${b}`, expected: String(a + b), clips: addStory(a, b) };
}

function minus(a: number, b: number): IntakeItem {
  return { show: `${a} − ${b}`, expected: String(a - b), clips: subStory(a, b) };
}

function fact(show: string, answer: number): IntakeItem {
  return { show, expected: String(answer), clips: ['i_what_make'] };
}

function blocks(count: number, clip: string): IntakeItem {
  return { show: 'How many berries?', expected: String(count), clips: [clip], visual: { type: 'blocks', n: count } };
}

function pickOne(show: string, expected: string, choices: string[], clip: string, visual?: Visual): IntakeItem {
  return { show, expected, choices, clips: [clip], visual };
}

function level(label: string, grade: string, first: IntakeItem, retry: IntakeItem): Level {
  return { label, grade, items: [first, retry] };
}

export const STRANDS: Strand[] = [
  {
    id: 'place',
    name: 'Numbers and place value',
    levels: [
      level('Counts up to 10 objects', 'K-1',
        { show: 'How many berries?', expected: '7', clips: ['i_count'], visual: { type: 'dots', n: 7 } },
        { show: 'How many berries?', expected: '9', clips: ['i_count'], visual: { type: 'dots', n: 9 } }),
      level('Reads a teen number as one ten and ones', '1', blocks(14, 'q_place'), blocks(17, 'q_place')),
      level('Reads a two-digit number as tens and ones', '1-2', blocks(34, 'q_place'), blocks(52, 'q_place')),
      level('Compares two-digit numbers with swapped digits', '1-2',
        pickOne('Which is bigger?', '74', ['47', '74'], 'i_bigger'),
        pickOne('Which is bigger?', '63', ['63', '36'], 'i_bigger')),
      level('Reads a three-digit number as hundreds, tens and ones', '2', blocks(125, 'i_carts'), blocks(143, 'i_carts')),
    ],
  },
  {
    id: 'add',
    name: 'Addition',
    levels: [
      level('Adds within 10', '1', plus(5, 3), plus(4, 5)),
      level('Adds within 20, crossing ten', '1-2', plus(8, 5), plus(7, 6)),
      level('Two-digit plus one-digit, no regrouping', '2', plus(23, 4), plus(32, 5)),
      level('Two-digit plus one-digit, with regrouping', '2', plus(27, 5), plus(36, 7)),
      level('Two-digit plus two-digit, no regrouping', '2', plus(23, 14), plus(41, 25)),
      level('Two-digit plus two-digit, with regrouping', '2', plus(27, 15), plus(38, 24)),
      level('Three-digit plus two-digit, with regrouping', '3', plus(125, 48), plus(136, 27)),
    ],
  },
  {
    id: 'sub',
    name: 'Subtraction',
    levels: [
      level('Subtracts within 10', '1', minus(8, 3), minus(9, 4)),
      level('Subtracts within 20, crossing ten', '1-2', minus(13, 5), minus(15, 7)),
      level('Two-digit minus one-digit, no regrouping', '2', minus(47, 3), minus(58, 6)),
      level('Two-digit minus one-digit, with regrouping', '2', minus(32, 5), minus(43, 7)),
      level('Two-digit minus two-digit, no regrouping', '2', minus(46, 12), minus(67, 23)),
      level('Two-digit minus two-digit, with regrouping', '2', minus(52, 27), minus(63, 38)),
      level('Three-digit minus two-digit, with regrouping', '3', minus(134, 18), minus(152, 27)),
    ],
  },
  {
    id: 'mul',
    name: 'Multiplication',
    levels: [
      level('Finds the total of equal groups from a picture', '2',
        { show: 'How many in all?', expected: '12', clips: ['i_in_all'], visual: { type: 'groups', total: 12, groups: 3 } },
        { show: 'How many in all?', expected: '10', clips: ['i_in_all'], visual: { type: 'groups', total: 10, groups: 2 } }),
      level('Matches an array to a multiplication expression', '3',
        pickOne('Which one matches?', '3 × 5', ['3 + 5', '3 × 5', '5 − 3'], 'q_array', { type: 'array', rows: 3, cols: 5 }),
        pickOne('Which one matches?', '2 × 6', ['2 × 6', '2 + 6', '6 − 2'], 'q_array', { type: 'array', rows: 2, cols: 6 })),
      level('Knows facts with 2, 5 and 10', '3', fact('5 × 2', 10), fact('10 × 3', 30)),
      level('Knows facts with 3 and 4', '3', fact('4 × 6', 24), fact('3 × 7', 21)),
      level('Knows the harder facts (6 to 9)', '3', fact('7 × 8', 56), fact('6 × 9', 54)),
      level('Finds a missing factor', '3',
        { show: '3 × ? = 12', expected: '4', clips: ['i_missing'] },
        { show: '5 × ? = 30', expected: '6', clips: ['i_missing'] }),
    ],
  },
  {
    id: 'div',
    name: 'Division',
    levels: [
      level('Shares equally from a picture', '3',
        { show: 'How many each?', expected: '4', clips: ['i_each'], visual: { type: 'groups', total: 12, groups: 3 } },
        { show: 'How many each?', expected: '5', clips: ['i_each'], visual: { type: 'groups', total: 10, groups: 2 } }),
      level('Matches equal groups to a division expression', '3',
        pickOne('Which one matches?', '12 ÷ 3', ['12 − 3', '12 + 3', '12 ÷ 3'], 'i_match_groups', { type: 'groups', total: 12, groups: 3 }),
        pickOne('Which one matches?', '8 ÷ 2', ['8 ÷ 2', '8 − 2', '8 + 2'], 'i_match_groups', { type: 'groups', total: 8, groups: 2 })),
      level('Divides by 2, 3 and 5', '3', fact('15 ÷ 3', 5), fact('20 ÷ 5', 4)),
      level('Divides by 4 and 7', '3', fact('24 ÷ 4', 6), fact('28 ÷ 7', 4)),
      level('Divides with the harder facts (6 to 9)', '3', fact('56 ÷ 8', 7), fact('54 ÷ 6', 9)),
    ],
  },
  {
    id: 'frac',
    name: 'Fractions',
    levels: [
      level('Names a unit fraction from a picture', '2-3',
        pickOne('How much is purple?', '1/2', ['1/3', '1/2', '1/4'], 'i_frac_part', { type: 'bar', parts: 2, shaded: 1 }),
        pickOne('How much is purple?', '1/4', ['1/2', '1/3', '1/4'], 'i_frac_part', { type: 'bar', parts: 4, shaded: 1 })),
      level('Names a fraction with more than one part', '3',
        pickOne('How much is purple?', '3/4', ['1/4', '3/4', '4/3'], 'i_frac_part', { type: 'bar', parts: 4, shaded: 3 }),
        pickOne('How much is purple?', '2/3', ['3/2', '1/3', '2/3'], 'i_frac_part', { type: 'bar', parts: 3, shaded: 2 })),
      level('Compares unit fractions (a bigger bottom number is a smaller piece)', '3',
        pickOne('Which is bigger?', '1/3', ['1/6', '1/3'], 'i_frac_bigger'),
        pickOne('Which is bigger?', '1/2', ['1/2', '1/8'], 'i_frac_bigger')),
      level('Recognises equivalent fractions', '3-4',
        pickOne('Which is the same amount?', '1/2', ['1/4', '2/2', '1/2'], 'i_frac_same', { type: 'bar', parts: 4, shaded: 2 }),
        pickOne('Which is the same amount?', '1/2', ['1/2', '1/3', '3/3'], 'i_frac_same', { type: 'bar', parts: 6, shaded: 3 })),
      level('Multiplies a fraction by a whole number', '4',
        pickOne('3 × 1/4', '3/4', ['1/12', '3/4', '4/3'], 'i_what_make'),
        pickOne('2 × 1/3', '2/3', ['2/3', '1/6', '3/2'], 'i_what_make')),
    ],
  },
];

export interface StrandRun {
  level: number;
  /** 0 for the first question at a level, 1 for the retry. */
  attempt: 0 | 1;
  /** How many levels she passed. */
  passed: number;
  misses: number;
  done: boolean;
}

export const newRun = (): StrandRun => ({ level: 0, attempt: 0, passed: 0, misses: 0, done: false });

export function currentItem(strand: Strand, run: StrandRun): IntakeItem | null {
  if (run.done) return null;
  return strand.levels[run.level]?.items[run.attempt] ?? null;
}

/** A third miss in one strand also ends it, so it cannot drag on. */
export const MAX_MISSES = 3;

export function advance(strand: Strand, run: StrandRun, correct: boolean): StrandRun {
  if (run.done) return run;
  if (correct) {
    const level = run.level + 1;
    return { ...run, level, attempt: 0, passed: level, done: level >= strand.levels.length };
  }
  const misses = run.misses + 1;
  if (run.attempt === 1 || misses >= MAX_MISSES) return { ...run, misses, done: true };
  return { ...run, misses, attempt: 1 };
}

export type IntakeLevels = Partial<Record<StrandId, number>>;

/**
 * Where each kind of berry trip starts on its ladder, from the levels she
 * passed. She starts on the rung of the first thing she has not shown yet.
 */
export function startSteps(levels: IntakeLevels): Record<Delivery, number> {
  const add = levels.add ?? 0;
  const sub = levels.sub ?? 0;
  const plain = (passed: number): number => (passed >= 5 ? 4 : passed >= 3 ? 3 : passed);
  const regroup = (passed: number): number => (passed >= 7 ? 4 : passed >= 6 ? 3 : passed >= 4 ? 2 : passed >= 2 ? 1 : 0);
  return { add: plain(add), addR: regroup(add), sub: plain(sub), subR: regroup(sub) };
}

/** Kinds she already showed she can do at full two-digit size: a shorter road to friendship. */
export function fastTrack(levels: IntakeLevels): Record<Delivery, boolean> {
  const add = levels.add ?? 0;
  const sub = levels.sub ?? 0;
  return { add: add >= 5, addR: add >= 6, sub: sub >= 5, subR: sub >= 6 };
}

/** Where each kind of fraction work starts on its ladder, from the fraction levels she passed. */
export function fracStartStep(levels: IntakeLevels | undefined, kind: FracKind): number {
  const passed = levels?.frac ?? 0;
  if (kind === 'name') return Math.min(passed, 2);
  if (kind === 'same') return passed >= 4 ? 3 : passed >= 3 ? 2 : 0;
  if (kind === 'times') return passed >= 5 ? 1 : 0;
  return 0;
}

/** The game's easiest sums are within 10, with berries to count. Below that it has nothing to offer. */
export function belowFloor(levels: IntakeLevels): StrandId[] {
  return (['add', 'sub'] as StrandId[]).filter((id) => (levels[id] ?? 0) < 1);
}

export function reached(strand: Strand, passed: number): { reached: string; next: string | null } {
  const top = strand.levels[passed - 1];
  const next = strand.levels[passed];
  return {
    reached: top ? `${top.label} (grade ${top.grade})` : 'Did not pass the first level',
    next: next ? `${next.label} (grade ${next.grade})` : null,
  };
}
