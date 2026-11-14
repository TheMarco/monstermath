/**
 * Honey Hollow: what a fraction is, comparing and equal fractions, a fraction
 * times a whole number, and a fraction of a fraction. The picture is always a
 * honey bar (or a tray) cut into equal pieces.
 */

export type FracKind = 'name' | 'same' | 'times' | 'tray';
export const FRAC_KINDS: FracKind[] = ['name', 'same', 'times', 'tray'];

export interface Frac {
  n: number;
  d: number;
}

export type Side = 'left' | 'right' | 'same';

export type FracProblem =
  /** Read a fraction off a bar, or fill a bar to make one. */
  | { kind: 'name'; mode: 'name'; f: Frac; /** Which pieces are gold, when they are not the first ones. */ on?: number[] }
  | { kind: 'name'; mode: 'build'; f: Frac; chooseCuts: boolean }
  /** Which bar has more honey, or fill a bar to match another. */
  | { kind: 'same'; mode: 'compare'; a: Frac; b: Frac; answer: Side; /** Start from the numbers; the bars are one press away. */ bare?: boolean }
  | { kind: 'same'; mode: 'match'; a: Frac; d: number; answer: number }
  /** `whole` copies of a fraction. */
  | { kind: 'times'; whole: number; f: Frac; answer: Frac; bare?: boolean }
  /** `a` of `b`: a fraction of a fraction. */
  | { kind: 'tray'; a: Frac; b: Frac; answer: Frac; bare?: boolean };

/** Each idea is a ladder of rungs, easiest first. */
export const FRAC_RUNG_TEXT: Record<FracKind, string[]> = {
  name: [
    'Names one piece of a bar (halves, thirds, fourths)',
    'Names several pieces (halves, thirds, fourths)',
    'Names fractions with up to eight pieces',
    'Fills a cut bar to make a fraction',
    'Cuts and fills a bar to make a fraction',
    'Names fractions when the gold pieces are scattered, up to twelve pieces',
  ],
  same: [
    'Compares fractions with the same bottom number',
    'Compares single pieces (1/2 and 1/4)',
    'Spots equal fractions (1/2 and 2/4)',
    'Fills a bar to make an equal fraction',
    'Compares from the numbers first (same top number, equal pairs)',
    'Compares any two fractions from the numbers first',
  ],
  times: [
    'A whole number times one piece, up to one whole',
    'A whole number times one piece, past one whole',
    'A whole number times several pieces',
    'Fraction times a whole number, from the numbers first',
  ],
  tray: [
    'One piece of one piece (1/2 of 1/3)',
    'A piece of a piece, one fraction with a top number above 1',
    'A piece of a piece, both fractions with a top number above 1',
    'Fraction times a fraction, from the numbers first',
  ],
};

export function fracTop(kind: FracKind): number {
  return FRAC_RUNG_TEXT[kind].length - 1;
}

function int(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function oneOf<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

export function sameValue(x: Frac, y: Frac): boolean {
  return x.n * y.d === y.n * x.d;
}

export function compare(a: Frac, b: Frac): Side {
  const left = a.n * b.d;
  const right = b.n * a.d;
  return left === right ? 'same' : left > right ? 'left' : 'right';
}

/** The most pieces a top-number chip can show. */
export const MAX_TOP = 10;

const EQUAL_PAIRS: Array<[Frac, Frac]> = [
  [{ n: 1, d: 2 }, { n: 2, d: 4 }],
  [{ n: 1, d: 2 }, { n: 3, d: 6 }],
  [{ n: 1, d: 2 }, { n: 4, d: 8 }],
  [{ n: 1, d: 3 }, { n: 2, d: 6 }],
  [{ n: 2, d: 3 }, { n: 4, d: 6 }],
  [{ n: 1, d: 4 }, { n: 2, d: 8 }],
  [{ n: 3, d: 4 }, { n: 6, d: 8 }],
];

function makeName(rng: () => number, rung: number): FracProblem {
  if (rung <= 1) {
    const d = oneOf(rng, [2, 3, 4]);
    const n = rung === 0 || d === 2 ? 1 : int(rng, 2, d - 1);
    return { kind: 'name', mode: 'name', f: { n, d } };
  }
  if (rung === 5) {
    const d = oneOf(rng, [5, 6, 8, 10, 12]);
    const n = int(rng, 2, Math.min(d - 1, MAX_TOP));
    const all = Array.from({ length: d }, (_, i) => i);
    for (let i = all.length - 1; i > 0; i--) {
      const j = int(rng, 0, i);
      [all[i], all[j]] = [all[j] as number, all[i] as number];
    }
    return { kind: 'name', mode: 'name', f: { n, d }, on: all.slice(0, n).sort((x, y) => x - y) };
  }
  const d = oneOf(rng, rung === 3 ? [3, 4, 5, 6] : [3, 4, 5, 6, 8]);
  const f = { n: int(rng, 1, d - 1), d };
  if (rung === 2) return { kind: 'name', mode: 'name', f };
  return { kind: 'name', mode: 'build', f, chooseCuts: rung === 4 };
}

function makeSame(rng: () => number, rung: number): FracProblem {
  const bare = rung >= 4;
  const flip = (a: Frac, b: Frac): FracProblem =>
    rng() < 0.5 ? { kind: 'same', mode: 'compare', a, b, answer: compare(a, b), bare } : { kind: 'same', mode: 'compare', a: b, b: a, answer: compare(b, a), bare };
  const unitPair = (): FracProblem => {
    const d1 = oneOf(rng, [2, 3, 4, 6, 8]);
    let d2 = oneOf(rng, [2, 3, 4, 6, 8]);
    while (d2 === d1) d2 = oneOf(rng, [2, 3, 4, 6, 8]);
    return flip({ n: 1, d: d1 }, { n: 1, d: d2 });
  };
  const sameBottom = (): FracProblem => {
    const d = oneOf(rng, [3, 4, 5, 6, 8]);
    const n1 = int(rng, 1, d - 1);
    let n2 = int(rng, 1, d - 1);
    while (n2 === n1) n2 = int(rng, 1, d - 1);
    return flip({ n: n1, d }, { n: n2, d });
  };
  const equal = (): FracProblem => {
    const [a, b] = oneOf(rng, EQUAL_PAIRS);
    return flip(a, b);
  };
  const match = (): FracProblem => {
    const [a, b] = oneOf(rng, EQUAL_PAIRS);
    return { kind: 'same', mode: 'match', a, d: b.d, answer: b.n };
  };
  const sameTop = (): FracProblem => {
    // Same top number, different bottoms: the bigger bottom is the smaller amount.
    const n = oneOf(rng, [2, 3]);
    return flip({ n, d: oneOf(rng, [4, 5, 6]) }, { n, d: oneOf(rng, [8, 10]) });
  };
  const unlike = (): FracProblem => {
    for (let tries = 0; tries < 100; tries++) {
      const d1 = oneOf(rng, [2, 3, 4, 5, 6, 8]);
      const d2 = oneOf(rng, [2, 3, 4, 5, 6, 8]);
      const a = { n: int(rng, 1, d1 - 1), d: d1 };
      const b = { n: int(rng, 1, d2 - 1), d: d2 };
      if (d1 !== d2 && a.n !== b.n && a.n > 0 && b.n > 0) return flip(a, b);
    }
    return flip({ n: 2, d: 3 }, { n: 3, d: 4 });
  };
  if (rung === 0) return sameBottom();
  if (rung === 1) return unitPair();
  if (rung === 2) return rng() < 0.7 ? equal() : unitPair();
  if (rung === 3) return match();
  if (rung === 4) return rng() < 0.5 ? sameTop() : equal();
  return rng() < 0.7 ? unlike() : sameTop();
}

function makeTimes(rng: () => number, rung: number): FracProblem {
  const bare = rung >= 3;
  // From the numbers first: any of the easier kinds.
  const shape = bare ? int(rng, 0, 2) : rung;
  for (let tries = 0; tries < 200; tries++) {
    const d = oneOf(rng, [2, 3, 4, 5, 6, 8]);
    const n = shape === 2 ? int(rng, 2, 3) : 1;
    if (n >= d) continue;
    const whole = shape === 0 ? int(rng, 2, Math.min(d, 5)) : shape === 1 ? int(rng, d + 1, Math.min(d + 3, 8)) : int(rng, 2, 4);
    if (whole * n > MAX_TOP) continue;
    return { kind: 'times', whole, f: { n, d }, answer: { n: whole * n, d }, bare };
  }
  return { kind: 'times', whole: 3, f: { n: 1, d: 4 }, answer: { n: 3, d: 4 }, bare };
}

function makeTray(rng: () => number, rung: number): FracProblem {
  const bare = rung >= 3;
  const shape = bare ? int(rng, 0, 2) : rung;
  for (let tries = 0; tries < 200; tries++) {
    const p = oneOf(rng, shape === 2 ? [3, 4, 5] : [2, 3, 4]);
    const q = oneOf(rng, shape === 2 ? [3, 4, 5] : [2, 3, 4, 5]);
    if (p * q > 20) continue;
    let a = 1;
    let c = 1;
    if (shape === 1) {
      if (rng() < 0.5 && q > 2) c = int(rng, 2, q - 1);
      else if (p > 2) a = int(rng, 2, p - 1);
      else continue;
    } else if (shape === 2) {
      a = int(rng, 2, p - 1);
      c = int(rng, 2, q - 1);
    }
    if (a * c > MAX_TOP) continue;
    return { kind: 'tray', a: { n: a, d: p }, b: { n: c, d: q }, answer: { n: a * c, d: p * q }, bare };
  }
  return { kind: 'tray', a: { n: 1, d: 2 }, b: { n: 1, d: 3 }, answer: { n: 1, d: 6 }, bare };
}

export function makeFracProblem(kind: FracKind, rng: () => number = Math.random, rung = 0): FracProblem {
  const at = Math.max(0, Math.min(fracTop(kind), rung));
  switch (kind) {
    case 'name':
      return makeName(rng, at);
    case 'same':
      return makeSame(rng, at);
    case 'times':
      return makeTimes(rng, at);
    case 'tray':
      return makeTray(rng, at);
  }
}

/** The problem as short text, for the logs and the grown-up page. */
export function problemText(p: FracProblem): string {
  const f = (x: Frac): string => `${x.n}/${x.d}`;
  if (p.kind === 'name') return p.mode === 'name' ? `name ${f(p.f)}` : `build ${f(p.f)}`;
  if (p.kind === 'same') return p.mode === 'compare' ? `${f(p.a)} or ${f(p.b)}` : `${f(p.a)} = ?/${p.d}`;
  if (p.kind === 'times') return `${p.whole} × ${f(p.f)}`;
  return `${f(p.a)} × ${f(p.b)}`;
}

/** The fraction a top-and-bottom answer must equal, when the problem has one. */
export function expectedFrac(p: FracProblem): Frac | null {
  if (p.kind === 'name' && p.mode === 'name') return p.f;
  if (p.kind === 'times' || p.kind === 'tray') return p.answer;
  return null;
}

/** Reading a fraction off a bar wants the exact counts; products may be given in any equal form. */
export function isRight(p: FracProblem, given: Frac): boolean {
  const want = expectedFrac(p);
  if (!want || given.d === 0) return false;
  return p.kind === 'name' ? given.n === want.n && given.d === want.d : sameValue(given, want);
}

export type FracError =
  | 'swapped'
  | 'counted-empty'
  | 'part-to-part'
  | 'bigger-bottom'
  | 'times-both'
  | 'times-bottom'
  | 'times-added'
  | 'tray-added'
  | 'tray-one-cut'
  | 'wrong-cuts'
  | 'wrong-fill'
  | 'other';

export const FRAC_ERROR_TEXT: Record<FracError, string> = {
  swapped: 'Swapped the top and bottom numbers',
  'counted-empty': 'Counted the empty pieces instead of the filled ones',
  'part-to-part': 'Compared filled pieces to empty pieces (bottom number was not the whole)',
  'bigger-bottom': 'Chose the fraction with the bigger bottom number as the larger amount (whole-number thinking)',
  'times-both': 'Multiplied the top and the bottom by the whole number',
  'times-bottom': 'Multiplied only the bottom number',
  'times-added': 'Added the whole number to the top instead of multiplying',
  'tray-added': 'Added the bottom numbers instead of multiplying',
  'tray-one-cut': 'Gave one of the two fractions as the answer',
  'wrong-cuts': 'Cut the bar into the wrong number of pieces',
  'wrong-fill': 'Filled the wrong number of pieces',
  other: 'No clear pattern',
};

/** Name the likely idea behind a wrong top-and-bottom answer. */
export function classifyFracError(p: FracProblem, given: Frac): FracError {
  if (p.kind === 'name' && p.mode === 'name') {
    const { n, d } = p.f;
    if (given.n === d && given.d === n) return 'swapped';
    if (given.n === d - n && given.d === d) return 'counted-empty';
    if (given.n === n && given.d === d - n) return 'part-to-part';
    return 'other';
  }
  if (p.kind === 'times') {
    const { n, d } = p.f;
    if (given.n === p.whole * n && given.d === p.whole * d) return 'times-both';
    if (given.n === n && given.d === p.whole * d) return 'times-bottom';
    if (given.n === p.whole + n && given.d === d) return 'times-added';
    return 'other';
  }
  if (p.kind === 'tray') {
    if (given.d === p.a.d + p.b.d) return 'tray-added';
    if ((given.n === p.a.n && given.d === p.a.d) || (given.n === p.b.n && given.d === p.b.d)) return 'tray-one-cut';
    return 'other';
  }
  return 'other';
}

/** A wrong pick between two bars: did she go by the size of the bottom number? */
export function classifyPick(p: FracProblem, picked: Side): FracError {
  if (p.kind !== 'same' || p.mode !== 'compare' || picked === 'same') return 'other';
  const chosen = picked === 'left' ? p.a : p.b;
  const other = picked === 'left' ? p.b : p.a;
  return chosen.d > other.d && chosen.n <= other.n ? 'bigger-bottom' : 'other';
}

/** Bottom numbers to choose from: the right one, the tempting wrong ones, and a few fillers. */
export function bottomChoices(p: FracProblem): number[] {
  const picks = new Set<number>();
  if (p.kind === 'name') return [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  if (p.kind === 'times') {
    picks.add(p.f.d);
    picks.add(p.whole * p.f.d);
    picks.add(p.whole + p.f.d);
  } else if (p.kind === 'tray') {
    picks.add(p.answer.d);
    picks.add(p.a.d + p.b.d);
    picks.add(p.a.d);
    picks.add(p.b.d);
  }
  for (const filler of [2, 3, 4, 6, 8, 10, 12, 5, 16, 20]) {
    if (picks.size >= 9) break;
    picks.add(filler);
  }
  return [...picks].sort((x, y) => x - y);
}

const BOTTOM_WORD: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['fourth', 'fourths'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  8: ['eighth', 'eighths'],
};
const COUNT_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

/** Bottom numbers whose fractions have a recorded name. */
export const SPOKEN_BOTTOMS = [2, 3, 4, 5, 6, 8];

/** "three fourths", for the fractions that are read aloud. */
export function fracWords(f: Frac): string | null {
  const words = BOTTOM_WORD[f.d];
  const count = COUNT_WORD[f.n];
  if (!words || !count || f.n < 1 || f.n >= f.d) return null;
  return `${count} ${f.n === 1 ? words[0] : words[1]}`;
}
