/**
 * Berry Canyon: 2-digit addition and subtraction, with and without
 * regrouping. Problems, place-value block moves, and error patterns.
 */

export type Delivery = 'add' | 'addR' | 'sub' | 'subR';

export interface Problem {
  type: Delivery;
  a: number;
  b: number;
  answer: number;
}

export const isAddition = (type: Delivery): boolean => type === 'add' || type === 'addR';

function int(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * Each kind of trip is a ladder of rungs, from sums she can do on her fingers
 * to three-digit numbers. The idea of the kind (regroup or not) is the same on
 * every rung; only the numbers grow.
 */
export const RUNG_TEXT: Record<Delivery, string[]> = {
  add: [
    'Sums within 10',
    'A teen number plus ones (14 + 3)',
    'Two-digit plus one-digit',
    'Two-digit plus two-digit, small numbers',
    'Two-digit plus two-digit, up to 99',
    'Three-digit plus two-digit',
  ],
  addR: [
    'One-digit sums that cross ten (8 + 5)',
    'Two-digit plus one-digit, with regrouping',
    'Two-digit plus two-digit with regrouping, small numbers',
    'Two-digit plus two-digit with regrouping, up to 99',
    'Two-digit sums that pass 100',
    'Three-digit plus two-digit, with regrouping',
  ],
  sub: [
    'Taking away within 10',
    'A teen number minus ones (17 − 4)',
    'Two-digit minus one-digit',
    'Two-digit minus two-digit, small numbers',
    'Two-digit minus two-digit, up to 99',
    'Three-digit minus two-digit',
  ],
  subR: [
    'Teen numbers that cross ten (13 − 5)',
    'Two-digit minus one-digit, with regrouping',
    'Two-digit minus two-digit with regrouping, small numbers',
    'Two-digit minus two-digit with regrouping, up to 99',
    'Three-digit minus two-digit, with regrouping',
  ],
};

export function topRung(type: Delivery): number {
  return RUNG_TEXT[type].length - 1;
}

/** The numbers for one try at a rung; the caller keeps the pairs that fit the kind. */
function draw(type: Delivery, rung: number, rng: () => number): [number, number] {
  const adding = type === 'add' || type === 'addR';
  const regroup = type === 'addR' || type === 'subR';
  if (adding) {
    if (!regroup) {
      if (rung === 0) return [int(rng, 1, 8), int(rng, 1, 8)];
      if (rung === 1) return [int(rng, 11, 18), int(rng, 1, 8)];
      if (rung === 2) return [int(rng, 12, 89), int(rng, 1, 9)];
      if (rung === 3) return [int(rng, 11, 45), int(rng, 11, 40)];
      if (rung === 4) return [int(rng, 12, 78), int(rng, 11, 78)];
      return [int(rng, 101, 168), int(rng, 11, 48)];
    }
    if (rung === 0) return [int(rng, 2, 9), int(rng, 2, 9)];
    if (rung === 1) return [int(rng, 12, 89), int(rng, 2, 9)];
    if (rung === 2) return [int(rng, 11, 45), int(rng, 11, 40)];
    if (rung === 3) return [int(rng, 12, 78), int(rng, 11, 78)];
    if (rung === 4) return [int(rng, 12, 95), int(rng, 11, 95)];
    return [int(rng, 101, 168), int(rng, 11, 48)];
  }
  if (!regroup) {
    if (rung === 0) return [int(rng, 3, 9), int(rng, 1, 8)];
    if (rung === 1) return [int(rng, 12, 19), int(rng, 1, 8)];
    if (rung === 2) return [int(rng, 12, 89), int(rng, 1, 9)];
    if (rung === 3) return [int(rng, 23, 59), int(rng, 11, 57)];
    if (rung === 4) return [int(rng, 23, 98), int(rng, 11, 96)];
    return [int(rng, 121, 198), int(rng, 11, 88)];
  }
  if (rung === 0) return [int(rng, 11, 18), int(rng, 2, 9)];
  if (rung === 1) return [int(rng, 21, 89), int(rng, 2, 9)];
  if (rung === 2) return [int(rng, 23, 59), int(rng, 11, 57)];
  if (rung === 3) return [int(rng, 23, 98), int(rng, 11, 96)];
  return [int(rng, 121, 198), int(rng, 11, 79)];
}

function fits(type: Delivery, rung: number, a: number, b: number): boolean {
  const a0 = a % 10;
  const b0 = b % 10;
  const aTens = Math.floor(a / 10) % 10;
  const bTens = Math.floor(b / 10) % 10;
  if (type === 'add' || type === 'addR') {
    const sum = a + b;
    const carries = a0 + b0 >= 10;
    if (carries !== (type === 'addR')) return false;
    if (a0 === 0 && b0 === 0) return false;
    if (type === 'add') {
      if (rung === 0) return sum <= 10;
      if (rung === 1) return sum <= 19;
      if (rung === 2) return sum <= 99 && a0 !== 0;
      if (rung === 3) return sum <= 59;
      if (rung === 4) return sum <= 99;
      return aTens + bTens <= 9;
    }
    if (rung === 0) return sum >= 11;
    if (rung === 1) return sum <= 99;
    if (rung === 2) return sum <= 59;
    if (rung === 3) return sum <= 99;
    if (rung === 4) return sum >= 100 && sum <= 189;
    return aTens + bTens + 1 <= 9;
  }
  if (b >= a - 1) return false;
  const borrows = a0 < b0;
  if (borrows !== (type === 'subR')) return false;
  if (a0 === 0 && b0 === 0) return false;
  // Past 100 the cart stays whole: the tens never need it.
  if (a >= 100) return (borrows ? aTens - 1 : aTens) >= bTens;
  return true;
}

const FALLBACK: Record<Delivery, Problem> = {
  add: { type: 'add', a: 23, b: 14, answer: 37 },
  addR: { type: 'addR', a: 27, b: 15, answer: 42 },
  sub: { type: 'sub', a: 46, b: 12, answer: 34 },
  subR: { type: 'subR', a: 52, b: 27, answer: 25 },
};

/** A problem of this kind at this rung. Without a rung, the full two-digit range. */
export function makeProblem(type: Delivery, rng: () => number = Math.random, rung?: number): Problem {
  const full = type === 'add' || type === 'sub' ? 4 : 3;
  const at = Math.max(0, Math.min(topRung(type), rung ?? full));
  for (let tries = 0; tries < 800; tries++) {
    const [a, b] = draw(type, at, rng);
    if (!fits(type, at, a, b)) continue;
    const adding = type === 'add' || type === 'addR';
    return { type, a, b, answer: adding ? a + b : a - b };
  }
  // Unreachable in practice; a fixed fallback keeps the game moving.
  return FALLBACK[type];
}

/**
 * A problem of this kind at this rung that starts from a given number, for a
 * match where one answer is the next problem's first number. Null when the
 * rung has no problem that starts there.
 */
export function problemFrom(type: Delivery, a: number, rng: () => number = Math.random, rung?: number): Problem | null {
  const full = type === 'add' || type === 'sub' ? 4 : 3;
  const at = Math.max(0, Math.min(topRung(type), rung ?? full));
  const adding = type === 'add' || type === 'addR';
  for (let tries = 0; tries < 3000; tries++) {
    const [first, b] = draw(type, at, rng);
    if (first !== a || !fits(type, at, a, b)) continue;
    return { type, a, b, answer: adding ? a + b : a - b };
  }
  return null;
}

/** Place-value blocks: [hundreds (carts), tens (crates), ones (loose berries)]. */
export type Blocks = [number, number, number];

export function toBlocks(n: number): Blocks {
  return [Math.floor(n / 100), Math.floor((n % 100) / 10), n % 10];
}

export function blocksValue(b: Blocks): number {
  return b[0] * 100 + b[1] * 10 + b[2];
}

export function addBlocks(x: Blocks, y: Blocks): Blocks {
  return [x[0] + y[0], x[1] + y[1], x[2] + y[2]];
}

/** Pack ten of a place into one of the next bigger place. col: 1 = tens, 2 = ones. */
export function pack(b: Blocks, col: 1 | 2): Blocks | null {
  if (b[col] < 10) return null;
  const next: Blocks = [...b];
  next[col] -= 10;
  next[col - 1] += 1;
  return next;
}

/** Open one of a place into ten of the next smaller place. col: 0 = hundreds, 1 = tens. */
export function unpack(b: Blocks, col: 0 | 1): Blocks | null {
  if (b[col] < 1) return null;
  const next: Blocks = [...b];
  next[col] -= 1;
  next[col + 1] += 10;
  return next;
}

/** True when every place holds 0-9, so the blocks can be read off as digits. */
export function isTidy(b: Blocks): boolean {
  return b[1] <= 9 && b[2] <= 9;
}

export type ErrorPattern =
  | 'no-carry'
  | 'smaller-from-larger'
  | 'forgot-borrowed-ten'
  | 'reversed-digits'
  | 'wrong-operation'
  | 'off-by-one'
  | 'off-by-ten'
  | 'other';

export const ERROR_TEXT: Record<ErrorPattern, string> = {
  'no-carry': 'Added each column but dropped the extra ten (did not regroup)',
  'smaller-from-larger': 'Subtracted the smaller digit from the larger in the ones column instead of regrouping',
  'forgot-borrowed-ten': 'Regrouped the ones but did not take the ten away from the tens column',
  'reversed-digits': 'Right digits in reversed order (a transposition, likely not a math error)',
  'wrong-operation': 'Used the other operation (added instead of subtracting, or the reverse)',
  'off-by-one': 'Off by one (a counting slip)',
  'off-by-ten': 'Off by exactly ten (a tens-column slip)',
  other: 'No clear pattern',
};

function reverse2(n: number): number {
  const s = String(n);
  return Number(s.split('').reverse().join(''));
}

/** Name the likely misconception behind a wrong answer. */
export function classifyError(p: Problem, given: number): ErrorPattern {
  const { a, b, answer } = p;
  if (given === answer) return 'other';
  const a1 = Math.floor(a / 10);
  const a0 = a % 10;
  const b1 = Math.floor(b / 10);
  const b0 = b % 10;

  if (isAddition(p.type)) {
    if (a0 + b0 >= 10 && given === (a1 + b1) * 10 + ((a0 + b0) % 10)) return 'no-carry';
    if (given === a - b || given === b - a) return 'wrong-operation';
  } else {
    if (a0 < b0) {
      // Check the more specific pattern first: both give the same result when b0 - a0 = 5.
      if (given === (a1 - b1) * 10 + (b0 - a0)) return 'smaller-from-larger';
      if (given === answer + 10) return 'forgot-borrowed-ten';
    }
    if (given === a + b) return 'wrong-operation';
  }
  if (answer >= 10 && answer % 11 !== 0 && given === reverse2(answer)) return 'reversed-digits';
  if (Math.abs(given - answer) === 1) return 'off-by-one';
  if (Math.abs(given - answer) === 10) return 'off-by-ten';
  return 'other';
}

/** Short spoken coaching after a miss. Points at the blocks, never at the child. */
export function coaching(p: Problem, pattern: ErrorPattern, name: string): string {
  const b0 = p.b % 10;
  const a0 = p.a % 10;
  switch (pattern) {
    case 'no-carry':
      return 'Look at the loose berries. Ten of them fit in a crate. Pack a crate, then count again.';
    case 'smaller-from-larger':
    case 'forgot-borrowed-ten':
      return `${name} eats ${b0} loose berries, but there are only ${a0}. Open a crate to get more.`;
    case 'reversed-digits':
      return 'So close. Check which number is crates and which is loose berries.';
    case 'wrong-operation':
      return isAddition(p.type)
        ? 'More berries are coming, so the pile grows. Put them together.'
        : `${name} is eating berries, so the pile shrinks. Feed ${name} and count what is left.`;
    case 'off-by-one':
      return 'So close. Count the berries one more time.';
    case 'off-by-ten':
      return 'So close. Count the crates one more time.';
    default:
      return 'Not yet. Let us use the berries to find out.';
  }
}
