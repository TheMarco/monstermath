/**
 * "Make the number": the child builds a two-part expression that equals a
 * target. Scoring rewards variety and non-trivial parts, and never punishes.
 */

export type Op = '+' | '-' | '*' | '/';

export interface Expr {
  a: number;
  op: Op;
  b: number;
}

export type Kind = 'identity' | 'near' | 'add' | 'sub' | 'mul' | 'div';
export type Tag = 'double' | 'tens' | 'new-move';
export type Treat = 'any' | 'add' | 'sub' | 'mul' | 'div';

export type Evaluation =
  | { ok: true; value: number }
  | { ok: false; reason: 'zero-divide' }
  | { ok: false; reason: 'not-even'; quotient: number; remainder: number };

export function evaluate(e: Expr): Evaluation {
  switch (e.op) {
    case '+':
      return { ok: true, value: e.a + e.b };
    case '-':
      return { ok: true, value: e.a - e.b };
    case '*':
      return { ok: true, value: e.a * e.b };
    case '/': {
      if (e.b === 0) return { ok: false, reason: 'zero-divide' };
      const remainder = e.a % e.b;
      if (remainder !== 0) return { ok: false, reason: 'not-even', quotient: Math.floor(e.a / e.b), remainder };
      return { ok: true, value: e.a / e.b };
    }
  }
}

export function isCorrect(e: Expr, target: number): boolean {
  const r = evaluate(e);
  return r.ok && r.value === target;
}

export function sameExpr(x: Expr, y: Expr): boolean {
  return x.a === y.a && x.op === y.op && x.b === y.b;
}

/** 3 + 5 is a flip of 5 + 3. Only + and x flip. */
export function isFlip(x: Expr, y: Expr): boolean {
  return (x.op === '+' || x.op === '*') && x.op === y.op && x.a === y.b && x.b === y.a && x.a !== x.b;
}

/** What sort of thinking the expression shows. Assumes it equals the target. */
export function classify(e: Expr): Kind {
  switch (e.op) {
    case '+':
      if (e.a === 0 || e.b === 0) return 'identity';
      if (e.a === 1 || e.b === 1) return 'near';
      return 'add';
    case '-':
      if (e.b === 0) return 'identity';
      if (e.b === 1) return 'near';
      return 'sub';
    case '*':
      if (e.a === 1 || e.b === 1) return 'identity';
      return 'mul';
    case '/':
      if (e.b === 1) return 'identity';
      return 'div';
  }
}

export const OP_SYMBOL: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
export const OP_WORD: Record<Op, string> = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' };

export function show(e: Expr): string {
  return `${e.a} ${OP_SYMBOL[e.op]} ${e.b}`;
}

export function speak(e: Expr): string {
  return `${e.a} ${OP_WORD[e.op]} ${e.b}`;
}

const BASE_HEARTS: Record<Kind, number> = { identity: 1, near: 2, add: 3, sub: 4, mul: 5, div: 5 };

/** After this many treats of one kind for the same number, that kind stops paying well. */
export const TIRED_AFTER = 3;

export type Repeat = 'none' | 'same' | 'flip' | 'easy-again';

export interface Score {
  hearts: number;
  kind: Kind;
  tags: Tag[];
  repeat: Repeat;
  /** Too many treats of this kind already: nudge toward another operation. */
  tired: boolean;
}

/**
 * Score a correct expression against the correct expressions already found
 * for the same target.
 */
export function score(e: Expr, prior: readonly Expr[]): Score {
  const kind = classify(e);
  const base: Score = { hearts: 0, kind, tags: [], repeat: 'none', tired: false };

  if (prior.some((p) => sameExpr(p, e))) return { ...base, repeat: 'same' };

  const flipped = prior.some((p) => isFlip(p, e));
  if (kind === 'identity' || kind === 'near') {
    // The safe answers are true, so they count once per operation and no more.
    if (flipped) return { ...base, repeat: 'flip' };
    const usedThisOp = prior.some((p) => classify(p) === kind && p.op === e.op);
    if (usedThisOp) return { ...base, repeat: 'easy-again' };
    return { ...base, hearts: BASE_HEARTS[kind] };
  }

  if (flipped) return { ...base, hearts: 1, repeat: 'flip' };

  const sameKind = prior.filter((p) => classify(p) === kind).length;
  if (sameKind >= TIRED_AFTER) return { ...base, hearts: 1, tired: true };

  let hearts = BASE_HEARTS[kind];
  const tags: Tag[] = [];
  if (sameKind === 0) {
    hearts += 1;
    tags.push('new-move');
  }
  if (e.op === '+' && e.a === e.b) {
    hearts += 1;
    tags.push('double');
  } else if (e.op === '+' && (isRound(e.a) || isRound(e.b))) {
    hearts += 1;
    tags.push('tens');
  }
  return { ...base, hearts, tags };
}

function isRound(n: number): boolean {
  return n >= 10 && n % 10 === 0;
}

export function matchesTreat(kind: Kind, treat: Treat): boolean {
  if (treat === 'any') return true;
  return kind === treat;
}

/** A round is complete when the meter is full and the favorite treat was given. */
export function roundComplete(hearts: number, meter: number, found: readonly Expr[], fav: Treat): boolean {
  if (hearts < meter) return false;
  return fav === 'any' || found.some((f) => classify(f) === fav);
}
