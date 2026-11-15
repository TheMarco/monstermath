/**
 * Early number work, for a child who is not yet adding within 10: counting a
 * set, comparing, the pairs that make ten and the teen numbers, and tens and
 * ones. The pictures are the canyon's own: loose berries, a crate that holds
 * ten, a cart that holds ten crates. A child who learns the crate here meets
 * it again when sums start to regroup.
 */

export type CountKind = 'count' | 'more' | 'ten' | 'place';
export const COUNT_KINDS: CountKind[] = ['count', 'more', 'ten', 'place'];

export type Side = 'left' | 'right';

export type CountProblem =
  /** How many berries are there? */
  | { kind: 'count'; mode: 'howMany'; n: number; scatter: boolean }
  /** Put this many berries in the basket, from a bigger pile. */
  | { kind: 'count'; mode: 'give'; n: number; pile: number }
  /** Two piles: which has more, or fewer? */
  | { kind: 'more'; mode: 'piles'; a: number; b: number; ask: 'more' | 'fewer'; answer: Side }
  /** Two written numbers: which is bigger? The berries are one press away. */
  | { kind: 'more'; mode: 'numbers'; a: number; b: number; answer: Side }
  /** A frame of five or a crate of ten with some berries in it: how many more fill it? */
  | { kind: 'ten'; mode: 'fill'; whole: 5 | 10; have: number; answer: number; bare: boolean }
  /** One full crate and some loose berries: how many in all? */
  | { kind: 'ten'; mode: 'teen'; n: number; answer: number }
  /** A teen number: one crate, and how many loose? */
  | { kind: 'ten'; mode: 'split'; n: number; answer: number }
  /** Crates and loose berries (and carts): which number is it? */
  | { kind: 'place'; mode: 'read'; n: number; answer: number }
  /** A written number: make it with crates and loose berries. */
  | { kind: 'place'; mode: 'build'; n: number; answer: number }
  /** Ten more or ten less than a number. */
  | { kind: 'place'; mode: 'shift'; n: number; by: 10 | -10; answer: number };

/** Each idea is a ladder of rungs, easiest first. */
export const COUNT_RUNG_TEXT: Record<CountKind, string[]> = {
  count: [
    'Counts up to 5 berries in a row',
    'Counts up to 10 berries',
    'Counts out a given number of berries, up to 10',
    'Counts up to 20 berries that are scattered',
    'Counts out a given number of berries, up to 20',
  ],
  more: [
    'Says which pile has more, up to 5',
    'Says which pile has more or fewer, up to 10',
    'Says which number is bigger, up to 10',
    'Says which number is bigger, up to 20',
    'Compares two-digit numbers (34 and 43)',
    'Compares three-digit numbers',
  ],
  ten: [
    'Finds how many more make 5',
    'Finds how many more fill a crate of ten',
    'Reads a teen number as one crate and loose berries',
    'Splits a teen number into ten and ones',
    'Knows the pairs that make ten, from the numbers first',
  ],
  place: [
    'Counts crates by tens (3 crates is 30)',
    'Reads crates and loose berries as a two-digit number',
    'Builds a two-digit number from crates and loose berries',
    'Finds ten more and ten less',
    'Reads and builds three-digit numbers with carts',
  ],
};

export function countTop(kind: CountKind): number {
  return COUNT_RUNG_TEXT[kind].length - 1;
}

function int(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function makeCount(rng: () => number, rung: number): CountProblem {
  if (rung === 0) return { kind: 'count', mode: 'howMany', n: int(rng, 2, 5), scatter: false };
  if (rung === 1) return { kind: 'count', mode: 'howMany', n: int(rng, 5, 10), scatter: rng() < 0.5 };
  if (rung === 2) {
    const n = int(rng, 3, 10);
    return { kind: 'count', mode: 'give', n, pile: Math.min(14, n + int(rng, 2, 4)) };
  }
  if (rung === 3) return { kind: 'count', mode: 'howMany', n: int(rng, 11, 20), scatter: true };
  const n = int(rng, 11, 20);
  return { kind: 'count', mode: 'give', n, pile: n + int(rng, 2, 4) };
}

function makeMore(rng: () => number, rung: number): CountProblem {
  const side = (a: number, b: number, bigger = true): Side => (a > b === bigger ? 'left' : 'right');
  if (rung <= 1) {
    const top = rung === 0 ? 5 : 10;
    // The easiest piles differ by two or more, so the answer can be seen without counting.
    const gap = rung === 0 ? 2 : 1;
    let a = int(rng, 1, top);
    let b = int(rng, 1, top);
    while (Math.abs(a - b) < gap) {
      a = int(rng, 1, top);
      b = int(rng, 1, top);
    }
    const ask = rung === 1 && rng() < 0.4 ? 'fewer' : 'more';
    return { kind: 'more', mode: 'piles', a, b, ask, answer: side(a, b, ask === 'more') };
  }
  let a: number;
  let b: number;
  if (rung === 2) {
    a = int(rng, 1, 10);
    b = int(rng, 1, 10);
  } else if (rung === 3) {
    a = int(rng, 8, 20);
    b = int(rng, 8, 20);
  } else if (rung === 4) {
    // Half the pairs are swapped digits, the mix-up that matters most for a child who reverses.
    const tens = int(rng, 1, 9);
    let ones = int(rng, 1, 9);
    while (ones === tens) ones = int(rng, 1, 9);
    a = tens * 10 + ones;
    b = rng() < 0.5 ? ones * 10 + tens : int(rng, 11, 99);
  } else {
    const h = int(rng, 1, 8);
    const t = int(rng, 0, 9);
    const o = int(rng, 0, 9);
    a = h * 100 + t * 10 + o;
    // Same hundreds half the time, so the tens have to be looked at.
    b = rng() < 0.5 ? h * 100 + int(rng, 0, 9) * 10 + int(rng, 0, 9) : int(rng, 101, 989);
  }
  while (a === b) b = b > 1 ? b - 1 : b + 1;
  return { kind: 'more', mode: 'numbers', a, b, answer: side(a, b) };
}

function makeTen(rng: () => number, rung: number): CountProblem {
  if (rung === 0) {
    const have = int(rng, 1, 4);
    return { kind: 'ten', mode: 'fill', whole: 5, have, answer: 5 - have, bare: false };
  }
  if (rung === 1 || rung === 4) {
    const have = int(rng, 1, 9);
    return { kind: 'ten', mode: 'fill', whole: 10, have, answer: 10 - have, bare: rung === 4 };
  }
  const n = int(rng, 11, 19);
  if (rung === 2) return { kind: 'ten', mode: 'teen', n, answer: n };
  return { kind: 'ten', mode: 'split', n, answer: n - 10 };
}

function makePlace(rng: () => number, rung: number): CountProblem {
  if (rung === 0) {
    const n = int(rng, 2, 9) * 10;
    return { kind: 'place', mode: 'read', n, answer: n };
  }
  if (rung === 1 || rung === 2) {
    const tens = int(rng, 2, 9);
    let ones = int(rng, 1, 9);
    // No double digits: 33 cannot show whether the crates and the loose berries were told apart.
    while (ones === tens) ones = int(rng, 1, 9);
    const n = tens * 10 + ones;
    return { kind: 'place', mode: rung === 1 ? 'read' : 'build', n, answer: n };
  }
  if (rung === 3) {
    const by = rng() < 0.5 ? 10 : -10;
    const n = int(rng, by === 10 ? 11 : 21, by === 10 ? 89 : 99);
    return { kind: 'place', mode: 'shift', n, by, answer: n + by };
  }
  const n = int(rng, 1, 2) * 100 + int(rng, 0, 9) * 10 + int(rng, 1, 9);
  return { kind: 'place', mode: rng() < 0.5 ? 'read' : 'build', n, answer: n };
}

/** A problem of this kind at this rung. */
export function makeCountProblem(kind: CountKind, rng: () => number = Math.random, rung = 0): CountProblem {
  const at = Math.max(0, Math.min(countTop(kind), rung));
  if (kind === 'count') return makeCount(rng, at);
  if (kind === 'more') return makeMore(rng, at);
  if (kind === 'ten') return makeTen(rng, at);
  return makePlace(rng, at);
}

/** The right answer: a number, or a side for "which has more". */
export function countAnswer(p: CountProblem): number | Side {
  if (p.kind === 'count') return p.n;
  return p.answer;
}

export function isRightCount(p: CountProblem, given: number | Side): boolean {
  return given === countAnswer(p);
}

/** The problem in a few words, for the grown-up page. */
export function countText(p: CountProblem): string {
  switch (p.kind) {
    case 'count':
      return p.mode === 'howMany' ? `Count ${p.n} berries` : `Count out ${p.n} berries`;
    case 'more':
      return p.mode === 'piles' ? `Which pile has ${p.ask}: ${p.a} or ${p.b}` : `Which is bigger: ${p.a} or ${p.b}`;
    case 'ten':
      if (p.mode === 'fill') return `${p.have} and how many make ${p.whole}`;
      if (p.mode === 'teen') return `One crate and ${p.n - 10} loose`;
      return `${p.n} is ten and how many`;
    default:
      if (p.mode === 'read') return `Read ${p.n} from crates and berries`;
      if (p.mode === 'build') return `Build ${p.n} with crates and berries`;
      return `${p.n}, ten ${p.by > 0 ? 'more' : 'less'}`;
  }
}

export type CountError =
  | 'count-slip'
  | 'other-pile'
  | 'said-what-is-there'
  | 'said-the-whole'
  | 'crates-as-ones'
  | 'reversed-digits'
  | 'changed-the-ones'
  | 'wrong-way'
  | 'other';

export const COUNT_ERROR_TEXT: Record<CountError, string> = {
  'count-slip': 'Off by one (skipped a berry or counted one twice)',
  'other-pile': 'Chose the other one (the smaller for "more", or the bigger for "fewer")',
  'said-what-is-there': 'Gave the berries that are there instead of the ones that are missing',
  'said-the-whole': 'Gave the whole (5 or 10) instead of the missing part',
  'crates-as-ones': 'Counted a crate as one berry instead of ten',
  'reversed-digits': 'Right digits in reversed order (crates and loose berries swapped)',
  'changed-the-ones': 'Changed the ones instead of the tens',
  'wrong-way': 'Went ten the wrong way (more instead of less, or the reverse)',
  other: 'No clear pattern',
};

function reversed(n: number): number {
  return Number(String(n).split('').reverse().join(''));
}

/** Name the likely misconception behind a wrong answer. */
export function classifyCountError(p: CountProblem, given: number | Side): CountError {
  if (isRightCount(p, given)) return 'other';
  if (typeof given !== 'number') return 'other-pile';
  if (p.kind === 'more') return 'other';
  if (p.kind === 'count') return Math.abs(given - p.n) === 1 ? 'count-slip' : 'other';
  if (p.kind === 'ten') {
    if (p.mode === 'fill') {
      if (given === p.have) return 'said-what-is-there';
      if (given === p.whole) return 'said-the-whole';
    } else {
      // One crate and four loose read as 5, or 14 split as "1 and 4".
      if (p.mode === 'teen' && given === 1 + (p.n - 10)) return 'crates-as-ones';
      if (p.mode === 'split' && given === p.n) return 'said-the-whole';
      if (p.mode === 'split' && given === 10) return 'said-what-is-there';
    }
    return Math.abs(given - p.answer) === 1 ? 'count-slip' : 'other';
  }
  if (p.mode === 'shift') {
    if (given === p.n + (p.by > 0 ? 1 : -1)) return 'changed-the-ones';
    if (given === p.n - p.by) return 'wrong-way';
    return 'other';
  }
  const digits = String(p.n).split('').map(Number);
  if (given === digits.reduce((sum, d) => sum + d, 0)) return 'crates-as-ones';
  if (p.n % 11 !== 0 && given === reversed(p.n)) return 'reversed-digits';
  return Math.abs(given - p.answer) === 1 ? 'count-slip' : 'other';
}

/** Short spoken coaching after a miss. Points at the berries, never at the child. */
export function countCoaching(p: CountProblem, pattern: CountError): string {
  switch (pattern) {
    case 'count-slip':
      return 'So close! Touch each berry once as you count.';
    case 'other-pile':
      return p.kind === 'more' && p.mode === 'piles' && p.ask === 'fewer'
        ? 'Fewer means not as many. Look again.'
        : 'Line them up, side by side. Which one goes further?';
    case 'said-what-is-there':
      return 'Those are the berries that are there. Count the empty spots.';
    case 'said-the-whole':
      return 'That is how many fit in all. Count only the ones that are missing.';
    case 'crates-as-ones':
      return 'A crate holds ten berries. Count the crate as ten, then count on.';
    case 'reversed-digits':
      return 'So close! Crates come first, then the loose berries.';
    case 'changed-the-ones':
    case 'wrong-way':
      return p.kind === 'place' && p.mode === 'shift' && p.by < 0
        ? 'Ten less is one crate less. The loose berries stay the same.'
        : 'Ten more is one more crate. The loose berries stay the same.';
    default:
      return 'Not yet. Let us use the berries to find out.';
  }
}
