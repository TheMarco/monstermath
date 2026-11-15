import { sameValue, type Frac } from './fractions';

/**
 * The Bakery: work for grades 4 and 5. Multiplying bigger numbers in parts,
 * dividing in parts, adding and taking away fractions, and decimals. One
 * picture language runs through all of it: buns on baking trays. A tray of ten
 * buns is a ten, a rack is a hundred, a loaf is cut into equal slices, and a
 * tray of one hundred small squares is one whole.
 *
 * Decimals are kept as whole numbers of hundredths (0.47 is 47, 1.3 is 130),
 * so no sum ever goes through floating point.
 */

export type UpperKind = 'mult' | 'div' | 'fadd' | 'dec';
export const UPPER_KINDS: UpperKind[] = ['mult', 'div', 'fadd', 'dec'];

export type Side = 'left' | 'right';

export type UpperProblem =
  /** `b` rows of `a` buns. The tray is split along `cols` (the parts of a) and `rows` (the parts of b). */
  | { kind: 'mult'; a: number; b: number; cols: number[]; rows: number[]; answer: number }
  /** `total` buns shared into `by` baskets. `parts` is the split for partial quotients; empty when it is shared in one go. */
  | { kind: 'div'; total: number; by: number; parts: number[]; answer: number; left: number; asksLeft: boolean; loose: boolean }
  /** Two amounts of loaf, added or taken away. `cut` is the slice size both can be cut into. */
  | { kind: 'fadd'; op: '+' | '-'; a: Frac; b: Frac; cut: number; answer: Frac }
  /** Read a decimal from a tray. `n` is in hundredths; `places` is how many digits follow the point. */
  | { kind: 'dec'; mode: 'read'; n: number; places: 1 | 2 }
  /** Two decimals, in hundredths: which is more? */
  | { kind: 'dec'; mode: 'more'; a: number; b: number; answer: Side }
  /** Add or take away two decimals, in hundredths. */
  | { kind: 'dec'; mode: 'sum'; op: '+' | '-'; a: number; b: number; answer: number; places: 1 | 2 };

/** Each idea is a ladder of rungs, easiest first. */
export const UPPER_RUNG_TEXT: Record<UpperKind, string[]> = {
  mult: [
    'Multiplies tens by one digit (30 × 4)',
    'Multiplies two digits by one digit, in a tens part and a ones part (23 × 4)',
    'Multiplies three digits by one digit, in three parts (123 × 4)',
    'Multiplies by tens (20 × 30, 23 × 40)',
    'Multiplies two digits by two digits, with a four-part tray (23 × 45)',
  ],
  div: [
    'Shares within the times tables, with leftovers (17 ÷ 5 is 3, and 2 left)',
    'Shares tens (80 ÷ 4, 120 ÷ 4)',
    'Divides two digits by one digit in two parts, nothing left (84 ÷ 4)',
    'Divides two digits by one digit in two parts, with a leftover (86 ÷ 4)',
    'Divides three digits by one digit in parts (248 ÷ 4)',
  ],
  fadd: [
    'Adds slices of the same size (2/8 + 3/8)',
    'Takes away slices of the same size (5/8 − 2/8)',
    'Adds when one slice size fits in the other (1/2 + 1/4)',
    'Takes away when one slice size fits in the other (3/4 − 1/2)',
    'Adds when both loaves have to be cut again (1/2 + 1/3)',
  ],
  dec: [
    'Reads tenths from a tray (0.3)',
    'Reads hundredths from a tray (0.47)',
    'Says which decimal is more (0.5 or 0.45)',
    'Adds and takes away tenths, also past 1 (0.7 + 0.6)',
    'Adds and takes away with hundredths (1.25 + 0.4)',
  ],
};

export function upperTop(kind: UpperKind): number {
  return UPPER_RUNG_TEXT[kind].length - 1;
}

function int(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function oneOf<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

// ---- making problems ----------------------------------------------------------

function makeMult(rng: () => number, rung: number): UpperProblem {
  const make = (cols: number[], rows: number[]): UpperProblem => {
    const a = cols.reduce((sum, c) => sum + c, 0);
    const b = rows.reduce((sum, r) => sum + r, 0);
    return { kind: 'mult', a, b, cols, rows, answer: a * b };
  };
  if (rung === 0) return make([int(rng, 2, 9) * 10], [int(rng, 2, 9)]);
  if (rung === 1) return make([int(rng, 1, 6) * 10, int(rng, 1, 9)], [int(rng, 2, 9)]);
  if (rung === 2) return make([int(rng, 1, 3) * 100, int(rng, 1, 9) * 10, int(rng, 1, 9)], [int(rng, 2, 5)]);
  if (rung === 3) {
    if (rng() < 0.5) return make([int(rng, 2, 9) * 10], [int(rng, 2, 9) * 10]);
    return make([int(rng, 1, 4) * 10, int(rng, 1, 9)], [int(rng, 2, 6) * 10]);
  }
  return make([int(rng, 1, 5) * 10, int(rng, 1, 9)], [int(rng, 1, 3) * 10, int(rng, 1, 9)]);
}

/** The split for partial quotients: the hundreds, tens and ones of the answer, each times the divisor. */
function quotientParts(by: number, q: number, left: number): number[] {
  const parts = [Math.floor(q / 100) * 100, (Math.floor(q / 10) % 10) * 10, q % 10].filter((x) => x > 0).map((x) => x * by);
  parts[parts.length - 1] = (parts[parts.length - 1] ?? 0) + left;
  return parts;
}

function makeDiv(rng: () => number, rung: number): UpperProblem {
  const make = (by: number, q: number, left: number, split: boolean, asksLeft: boolean, loose = false): UpperProblem => ({
    kind: 'div',
    total: by * q + left,
    by,
    parts: split ? quotientParts(by, q, left) : [],
    answer: q,
    left,
    asksLeft,
    loose,
  });
  if (rung === 0) {
    const by = int(rng, 2, 6);
    // Now and then nothing is left, so "there is always some left" cannot become a habit.
    return make(by, int(rng, 2, 9), rng() < 0.85 ? int(rng, 1, by - 1) : 0, false, true, true);
  }
  if (rung === 1) {
    const by = int(rng, 2, 9);
    // At most 36 trays of ten, so the picture can show every one.
    return make(by, int(rng, 2, Math.min(9, Math.floor(36 / by))) * 10, 0, false, false);
  }
  if (rung === 2) {
    if (rng() < 0.5) {
      // Each digit shares out by itself: 84 ÷ 4 is 80 ÷ 4 and 4 ÷ 4.
      const by = int(rng, 2, 4);
      const digit = (): number => int(rng, 1, Math.floor(9 / by));
      return make(by, digit() * 10 + digit(), 0, true, false);
    }
    const by = int(rng, 2, 8);
    let q = int(rng, 11, Math.floor(99 / by));
    if (q % 10 === 0) q += 1;
    return make(by, q, 0, true, false);
  }
  if (rung === 3) {
    const by = int(rng, 2, 8);
    // One short of 99, so there is room for a leftover.
    let q = int(rng, 11, Math.floor(98 / by));
    if (q % 10 === 0) q += 1;
    const left = int(rng, 1, Math.min(by - 1, 99 - by * q));
    return make(by, q, left, true, true);
  }
  const by = int(rng, 2, 6);
  let q = int(rng, Math.ceil(100 / by), Math.floor(999 / by));
  if (q % 10 === 0) q += 1;
  return make(by, q, 0, true, false);
}

const SAME_SLICES = [3, 4, 5, 6, 8, 10, 12];
/** A slice size and one it fits into: halves into fourths, thirds into sixths. */
const FITS: Array<[number, number]> = [[2, 4], [2, 6], [2, 8], [3, 6], [4, 8], [5, 10], [2, 10], [3, 9], [3, 12], [4, 12], [6, 12]];
/** Two slice sizes that both have to be cut again, and the size they share. */
const BOTH: Array<[number, number, number]> = [[2, 3, 6], [2, 3, 6], [2, 5, 10], [3, 4, 12], [4, 6, 12], [2, 5, 10]];

function makeFadd(rng: () => number, rung: number): UpperProblem {
  if (rung === 0) {
    const d = oneOf(rng, SAME_SLICES);
    const an = int(rng, 1, d - 1);
    const bn = int(rng, 1, d - an);
    return { kind: 'fadd', op: '+', a: { n: an, d }, b: { n: bn, d }, cut: d, answer: { n: an + bn, d } };
  }
  if (rung === 1) {
    const d = oneOf(rng, SAME_SLICES);
    const an = int(rng, 2, d - 1);
    const bn = int(rng, 1, an - 1);
    return { kind: 'fadd', op: '-', a: { n: an, d }, b: { n: bn, d }, cut: d, answer: { n: an - bn, d } };
  }
  if (rung === 2 || rung === 3) {
    const [small, big] = oneOf(rng, FITS);
    const k = big / small;
    const coarse = { n: int(rng, 1, small - 1), d: small };
    const inFine = coarse.n * k;
    if (rung === 2) {
      const fine = { n: int(rng, 1, big - inFine), d: big };
      const [a, b] = rng() < 0.5 ? [coarse, fine] : [fine, coarse];
      return { kind: 'fadd', op: '+', a, b, cut: big, answer: { n: inFine + fine.n, d: big } };
    }
    let fineN = int(rng, 1, big - 1);
    if (fineN === inFine) fineN = fineN > 1 ? fineN - 1 : fineN + 1;
    const fine = { n: fineN, d: big };
    const [a, b] = inFine > fineN ? [coarse, fine] : [fine, coarse];
    return { kind: 'fadd', op: '-', a, b, cut: big, answer: { n: Math.abs(inFine - fineN), d: big } };
  }
  for (;;) {
    const [d1, d2, cut] = oneOf(rng, BOTH);
    const first = { n: int(rng, 1, d1 - 1), d: d1 };
    const second = { n: int(rng, 1, d2 - 1), d: d2 };
    const sum = (first.n * cut) / d1 + (second.n * cut) / d2;
    if (sum > cut) continue;
    const [a, b] = rng() < 0.5 ? [first, second] : [second, first];
    return { kind: 'fadd', op: '+', a, b, cut, answer: { n: sum, d: cut } };
  }
}

function makeDec(rng: () => number, rung: number): UpperProblem {
  if (rung === 0) {
    // Mostly less than one tray; now and then a full tray and some strips.
    return { kind: 'dec', mode: 'read', n: int(rng, 1, 9) * 10 + (rng() < 0.25 ? 100 : 0), places: 1 };
  }
  if (rung === 1) {
    // No strips at all (0.07) comes up often: it is the one that gets read as 0.7.
    let n = rng() < 0.3 ? int(rng, 1, 9) : int(rng, 11, 99);
    if (n % 10 === 0) n += int(rng, 1, 9);
    return { kind: 'dec', mode: 'read', n: n + (rng() < 0.2 ? 100 : 0), places: 2 };
  }
  if (rung === 2) {
    const roll = rng();
    let short: number;
    let long: number;
    if (roll < 0.5) {
      // The longer number is the smaller one: 0.5 and 0.45.
      short = int(rng, 2, 9) * 10;
      long = int(rng, 0, short / 10 - 1) * 10 + int(rng, 1, 9);
    } else if (roll < 0.8) {
      // The longer number really is more, so "shorter is more" does not work either.
      short = int(rng, 1, 8) * 10;
      long = int(rng, short / 10, 9) * 10 + int(rng, 1, 9);
    } else {
      // Same length, digits swapped: 0.47 and 0.74.
      const t = int(rng, 1, 8);
      const o = int(rng, t + 1, 9);
      short = t * 10 + o;
      long = o * 10 + t;
    }
    const [a, b] = rng() < 0.5 ? [short, long] : [long, short];
    return { kind: 'dec', mode: 'more', a, b, answer: a > b ? 'left' : 'right' };
  }
  if (rung === 3) {
    if (rng() < 0.55) {
      const a = int(rng, 1, 9) * 10;
      const b = int(rng, 1, 9) * 10;
      return { kind: 'dec', mode: 'sum', op: '+', a, b, answer: a + b, places: 1 };
    }
    const a = int(rng, 2, 18) * 10;
    const b = int(rng, 1, Math.min(9, a / 10 - 1)) * 10;
    return { kind: 'dec', mode: 'sum', op: '-', a, b, answer: a - b, places: 1 };
  }
  const withHundredths = (lo: number, hi: number): number => {
    const n = int(rng, lo, hi);
    return n % 10 === 0 ? n + int(rng, 1, 9) : n;
  };
  if (rng() < 0.55) {
    const first = withHundredths(11, 189);
    // Mostly a number with tenths only: the pair that tempts her to line up the wrong places.
    const second = rng() < 0.6 ? int(rng, 1, 9) * 10 : withHundredths(11, 89);
    const [a, b] = rng() < 0.5 ? [first, second] : [second, first];
    return { kind: 'dec', mode: 'sum', op: '+', a, b, answer: a + b, places: 2 };
  }
  if (rng() < 0.3) {
    // 0.5 take away 0.25: the tenths-only number comes first.
    const a = int(rng, 2, 15) * 10;
    const b = withHundredths(11, Math.min(89, a - 10));
    return { kind: 'dec', mode: 'sum', op: '-', a, b, answer: a - b, places: 2 };
  }
  const a = withHundredths(31, 189);
  const b = rng() < 0.6 ? int(rng, 1, Math.min(9, Math.floor(a / 10))) * 10 : withHundredths(11, Math.min(89, a - 10));
  return { kind: 'dec', mode: 'sum', op: '-', a, b, answer: a - b, places: 2 };
}

/** A problem of this kind at this rung. */
export function makeUpperProblem(kind: UpperKind, rng: () => number = Math.random, rung = 0): UpperProblem {
  const at = Math.max(0, Math.min(upperTop(kind), rung));
  if (kind === 'mult') return makeMult(rng, at);
  if (kind === 'div') return makeDiv(rng, at);
  if (kind === 'fadd') return makeFadd(rng, at);
  return makeDec(rng, at);
}

// ---- parts, answers and text ----------------------------------------------------

/** A decimal kept in hundredths, written out: 30 is "0.3", 47 is "0.47", 130 is "1.3". */
export function decText(n: number, places?: 1 | 2): string {
  const whole = Math.floor(n / 100);
  const rest = n % 100;
  if (places === 2 || rest % 10 !== 0) return `${whole}.${String(rest).padStart(2, '0')}`;
  return `${whole}.${rest / 10}`;
}

export interface Part {
  /** The part as she reads it: "20 × 4", "80 ÷ 4". */
  text: string;
  value: number;
}

/** The parts she fills in before the total. Empty when the problem is done in one go. */
export function upperParts(p: UpperProblem): Part[] {
  if (p.kind === 'mult') {
    const cells = p.rows.flatMap((r) => p.cols.map((c) => ({ text: `${c} × ${r}`, value: c * r })));
    return cells.length > 1 ? cells : [];
  }
  if (p.kind === 'div') return p.parts.map((part) => ({ text: `${part} ÷ ${p.by}`, value: Math.floor(part / p.by) }));
  return [];
}

/** What she hands in for a tray or a sharing problem. */
export interface Boxes {
  parts: number[];
  total: number;
  left?: number;
}

/** Boxes for multiplying and dividing, a fraction for slices, hundredths or a side for decimals. */
export type UpperGiven = Boxes | Frac | number | Side;

const isBoxes = (g: UpperGiven): g is Boxes => typeof g === 'object' && 'total' in g;
const isFrac = (g: UpperGiven): g is Frac => typeof g === 'object' && 'd' in g;

/** The right answer, in the shape she gives it. */
export function upperAnswer(p: UpperProblem): UpperGiven {
  if (p.kind === 'mult') return { parts: upperParts(p).map((x) => x.value), total: p.answer };
  if (p.kind === 'div') return { parts: upperParts(p).map((x) => x.value), total: p.answer, ...(p.asksLeft ? { left: p.left } : {}) };
  if (p.kind === 'fadd') return p.answer;
  if (p.mode === 'read') return p.n;
  return p.answer;
}

export function isRightUpper(p: UpperProblem, given: UpperGiven): boolean {
  if (p.kind === 'mult' || p.kind === 'div') {
    if (!isBoxes(given)) return false;
    const parts = upperParts(p);
    if (given.total !== p.answer || parts.some((part, i) => given.parts[i] !== part.value)) return false;
    return p.kind === 'mult' || !p.asksLeft || given.left === p.left;
  }
  if (p.kind === 'fadd') return isFrac(given) && given.d > 0 && sameValue(given, p.answer);
  return given === upperAnswer(p);
}

/** The problem in a few words, for the grown-up page. */
export function upperText(p: UpperProblem): string {
  if (p.kind === 'mult') return `${p.a} × ${p.b}`;
  if (p.kind === 'div') return `${p.total} ÷ ${p.by}`;
  if (p.kind === 'fadd') return `${p.a.n}/${p.a.d} ${p.op === '+' ? '+' : '−'} ${p.b.n}/${p.b.d}`;
  if (p.mode === 'read') return `Read ${decText(p.n, p.places)}`;
  if (p.mode === 'more') return `Which is more: ${decText(p.a)} or ${decText(p.b)}`;
  return `${decText(p.a)} ${p.op === '+' ? '+' : '−'} ${decText(p.b)}`;
}

/** An answer she gave, in a few words, for the log. */
export function givenText(p: UpperProblem, given: UpperGiven): string {
  if (isBoxes(given)) {
    const parts = given.parts.length ? `${given.parts.join(', ')}: ` : '';
    return `${parts}${given.total}${given.left !== undefined ? ` left ${given.left}` : ''}`;
  }
  if (isFrac(given)) return `${given.n}/${given.d}`;
  if (typeof given === 'number') return decText(given);
  return p.kind === 'dec' && p.mode === 'more' ? decText(given === 'left' ? p.a : p.b) : given;
}

// ---- what went wrong --------------------------------------------------------------

export type UpperError =
  | 'place-value'
  | 'added'
  | 'part-wrong'
  | 'total-wrong'
  | 'leftover-as-answer'
  | 'leftover-too-big'
  | 'multiplied'
  | 'off-one-group'
  | 'added-bottoms'
  | 'no-recut'
  | 'wrong-way'
  | 'wrong-sign'
  | 'hundredths-as-tenths'
  | 'longer-bigger'
  | 'lined-up'
  | 'past-one'
  | 'other';

export const UPPER_ERROR_TEXT: Record<UpperError, string> = {
  'place-value': 'Lost the place value of the tens (20 × 4 = 8, or 80 ÷ 4 = 2)',
  added: 'Added instead of multiplying',
  'part-wrong': 'A part was wrong',
  'total-wrong': 'The parts were right, the total was not',
  'leftover-as-answer': 'Gave the leftover as the answer',
  'leftover-too-big': 'Left more over than the number of baskets (could share once more)',
  multiplied: 'Multiplied instead of dividing',
  'off-one-group': 'Off by one in each basket',
  'added-bottoms': 'Added the bottom numbers too (2/8 + 3/8 = 5/16)',
  'no-recut': 'Added or took away the top numbers without making the slices the same size',
  'wrong-way': 'Took the smaller top number from the bigger one, whichever came first',
  'wrong-sign': 'Added where it was take away, or the reverse',
  'hundredths-as-tenths': 'Mixed up tenths and hundredths (0.07 for 0.7)',
  'longer-bigger': 'Chose the longer decimal as the bigger one (0.45 over 0.5)',
  'lined-up': 'Lined up the wrong places (0.25 + 0.4 = 0.29)',
  'past-one': 'Did not turn ten tenths into one whole (0.7 + 0.6 = 0.13)',
  other: 'No clear pattern',
};

/** The right number with a zero dropped or added: 8 for 80, 60 for 600, 800 for 80. */
function shifted(given: number, right: number): boolean {
  if (given <= 0 || right <= 0 || given === right) return false;
  return given * 10 === right || given * 100 === right || right * 10 === given || right * 100 === given;
}

function classifyMult(p: UpperProblem & { kind: 'mult' }, given: Boxes): UpperError {
  const cells = p.rows.flatMap((r) => p.cols.map((c) => ({ c, r, value: c * r })));
  if (cells.length === 1) {
    if (shifted(given.total, p.answer)) return 'place-value';
    return given.total === p.a + p.b ? 'added' : 'other';
  }
  const wrong = cells.filter((cell, i) => given.parts[i] !== cell.value);
  if (cells.some((cell, i) => shifted(given.parts[i] ?? 0, cell.value))) return 'place-value';
  if (cells.some((cell, i) => given.parts[i] !== cell.value && given.parts[i] === cell.c + cell.r)) return 'added';
  if (wrong.length > 0) return 'part-wrong';
  return given.total === p.a + p.b ? 'added' : 'total-wrong';
}

function classifyDiv(p: UpperProblem & { kind: 'div' }, given: Boxes): UpperError {
  const parts = upperParts(p);
  if (p.asksLeft && given.left !== undefined && given.left >= p.by && given.total * p.by + given.left === p.total) return 'leftover-too-big';
  if (p.asksLeft && p.left > 0 && p.left !== p.answer && given.total === p.left) return 'leftover-as-answer';
  if (given.total === p.total * p.by || parts.some((part, i) => given.parts[i] === p.parts[i]! * p.by && given.parts[i] !== part.value)) return 'multiplied';
  if (shifted(given.total, p.answer) || parts.some((part, i) => shifted(given.parts[i] ?? 0, part.value))) return 'place-value';
  if (parts.some((part, i) => given.parts[i] !== part.value)) return 'part-wrong';
  if (Math.abs(given.total - p.answer) === 1) return 'off-one-group';
  return parts.length > 0 && given.total !== p.answer ? 'total-wrong' : 'other';
}

function classifyFadd(p: UpperProblem & { kind: 'fadd' }, given: Frac): UpperError {
  const plus = p.op === '+';
  const rawTop = plus ? p.a.n + p.b.n : p.a.n - p.b.n;
  const rawBottom = plus ? p.a.d + p.b.d : Math.abs(p.a.d - p.b.d);
  if (given.n === rawTop && given.d === rawBottom && rawBottom > 0) return 'added-bottoms';
  // The other sign, worked out in the common slice size.
  const an = (p.a.n * p.cut) / p.a.d;
  const bn = (p.b.n * p.cut) / p.b.d;
  const other = plus ? an - bn : an + bn;
  if (other > 0 && given.d > 0 && given.n * p.cut === other * given.d) return 'wrong-sign';
  if (p.a.d !== p.b.d) {
    if (!plus && p.b.n > p.a.n && given.n === p.b.n - p.a.n) return 'wrong-way';
    if (rawTop > 0 && given.n === rawTop && [p.a.d, p.b.d, p.cut].includes(given.d)) return 'no-recut';
  }
  return 'other';
}

function classifyDec(p: UpperProblem & { kind: 'dec' }, given: number | Side): UpperError {
  if (p.mode === 'more') {
    const digits = (n: number): number => (n % 10 === 0 ? 1 : 2);
    const [right, chosen] = p.answer === 'left' ? [p.a, p.b] : [p.b, p.a];
    return digits(chosen) > digits(right) ? 'longer-bigger' : 'other';
  }
  if (typeof given !== 'number') return 'other';
  if (p.mode === 'read') return given * 10 === p.n || given === p.n * 10 ? 'hundredths-as-tenths' : 'other';
  const sign = p.op === '+' ? 1 : -1;
  // The tenths-only number put under the hundredths: 0.4 treated as 0.04.
  const slips: number[] = [];
  if (p.a % 10 !== 0 && p.b % 10 === 0) slips.push(p.a + (sign * p.b) / 10);
  if (p.a % 10 === 0 && p.b % 10 !== 0) slips.push(p.a / 10 + sign * p.b);
  if (slips.some((s) => s > 0 && s === given)) return 'lined-up';
  if (p.op === '+' && p.answer >= 100 && p.places === 1 && (given * 10 === p.answer || given === p.answer - 100)) return 'past-one';
  if (given === (p.op === '+' ? p.a - p.b : p.a + p.b)) return 'wrong-sign';
  if (given * 10 === p.answer || given === p.answer * 10) return 'hundredths-as-tenths';
  return 'other';
}

/** Name the likely misconception behind a wrong answer. */
export function classifyUpperError(p: UpperProblem, given: UpperGiven): UpperError {
  if (isRightUpper(p, given)) return 'other';
  if (p.kind === 'mult') return isBoxes(given) ? classifyMult(p, given) : 'other';
  if (p.kind === 'div') return isBoxes(given) ? classifyDiv(p, given) : 'other';
  if (p.kind === 'fadd') return isFrac(given) ? classifyFadd(p, given) : 'other';
  return isBoxes(given) || isFrac(given) ? 'other' : classifyDec(p, given);
}

/**
 * The coaching line after a miss, as the key of a spoken line in
 * src/voice/lines.ts. The screen shows that line's text and plays its clip.
 * Every line points at the picture, never at the child.
 */
export type UpperCoach =
  | 'uc_tens'
  | 'uc_rows'
  | 'uc_part'
  | 'uc_total'
  | 'uc_leftover'
  | 'uc_left_big'
  | 'uc_share'
  | 'uc_basket'
  | 'uc_bottoms'
  | 'uc_recut'
  | 'uc_first'
  | 'uc_sign'
  | 'uc_tenths'
  | 'uc_longer'
  | 'uc_line_up'
  | 'uc_past_one'
  | 'uc_other';

export function upperCoaching(_p: UpperProblem, pattern: UpperError): UpperCoach {
  switch (pattern) {
    case 'place-value':
      return 'uc_tens';
    case 'added':
      return 'uc_rows';
    case 'part-wrong':
      return 'uc_part';
    case 'total-wrong':
      return 'uc_total';
    case 'leftover-as-answer':
      return 'uc_leftover';
    case 'leftover-too-big':
      return 'uc_left_big';
    case 'multiplied':
      return 'uc_share';
    case 'off-one-group':
      return 'uc_basket';
    case 'added-bottoms':
      return 'uc_bottoms';
    case 'no-recut':
      return 'uc_recut';
    case 'wrong-way':
      return 'uc_first';
    case 'wrong-sign':
      return 'uc_sign';
    case 'hundredths-as-tenths':
      return 'uc_tenths';
    case 'longer-bigger':
      return 'uc_longer';
    case 'lined-up':
      return 'uc_line_up';
    case 'past-one':
      return 'uc_past_one';
    default:
      return 'uc_other';
  }
}

/** Bottom numbers to choose from for a slices problem: the right one, the tempting wrong ones, and a few fillers. */
export function sliceChoices(p: UpperProblem): number[] {
  if (p.kind !== 'fadd') return [];
  const picks = new Set<number>([p.cut, p.a.d, p.b.d, p.a.d + p.b.d]);
  // An equal fraction in smaller numbers is right too, so its bottom number has to be there.
  for (let d = 2; d < p.cut; d++) if ((p.answer.n * d) % p.cut === 0) picks.add(d);
  for (const filler of [2, 3, 4, 6, 8, 10, 12, 5, 16, 20]) {
    if (picks.size >= 9) break;
    picks.add(filler);
  }
  return [...picks].sort((x, y) => x - y);
}

/** The most slices a top-number chip can show. */
export const MAX_SLICES = 12;
