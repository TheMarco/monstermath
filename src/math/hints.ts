import { classify, isFlip, sameExpr, type Expr, type Kind, type Treat } from './expr';

/**
 * A hint shows a picture and gives one of the two numbers. The child still
 * finds the other number, so the hint never hands over a full answer.
 */
export type Hint =
  | { kind: 'add'; a: number; b: number; give: number; text: string; clip: string }
  | { kind: 'sub'; a: number; b: number; give: number; text: string; clip: string }
  | { kind: 'mul'; rows: number; cols: number; give: number; text: string; clip: string }
  | { kind: 'div'; total: number; groups: number; give: number; text: string; clip: string };

export function factorPairs(n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let a = 2; a * a <= n; a++) {
    if (n % a === 0) out.push([a, n / a]);
  }
  return out;
}

function used(found: readonly Expr[], kind: Kind): Expr[] {
  return found.filter((f) => classify(f) === kind);
}

function addHint(target: number, found: readonly Expr[]): Hint | null {
  if (target < 4) return null;
  const tens = Math.floor(target / 10) * 10;
  const ones = target - tens;
  const half = Math.floor(target / 2);
  const candidates: Array<[number, number]> = [];
  if (tens >= 10 && ones >= 2) candidates.push([tens, ones]);
  if (target % 2 === 0) candidates.push([half, half]);
  candidates.push([target - 2, 2], [target - 5, 5], [half, target - half], [target - 3, 3]);
  for (const [a, b] of candidates) {
    if (a < 2 || b < 2) continue;
    const taken = found.some((f) => f.op === '+' && ((f.a === a && f.b === b) || (f.a === b && f.b === a)));
    if (taken) continue;
    return {
      kind: 'add',
      a,
      b,
      give: a,
      text: `${a} + ? = ${target}`,
      clip: 'hint_add',
    };
  }
  return null;
}

function subHint(target: number, found: readonly Expr[]): Hint | null {
  const starts = [Math.ceil((target + 1) / 10) * 10, target + 5, target + 2, target + 10, target + 3];
  for (const a of starts) {
    const b = a - target;
    if (b < 2) continue;
    if (found.some((f) => f.op === '-' && f.a === a)) continue;
    return {
      kind: 'sub',
      a,
      b,
      give: a,
      text: `${a} − ? = ${target}`,
      clip: 'hint_sub',
    };
  }
  return null;
}

function mulHint(target: number, found: readonly Expr[]): Hint | null {
  for (const [rows, cols] of factorPairs(target)) {
    const taken = found.some(
      (f) => f.op === '*' && ((f.a === rows && f.b === cols) || (f.a === cols && f.b === rows)),
    );
    if (taken) continue;
    return {
      kind: 'mul',
      rows,
      cols,
      give: rows,
      text: `${rows} × ? = ${target}`,
      clip: 'hint_mul',
    };
  }
  return null;
}

function divHint(target: number, found: readonly Expr[]): Hint | null {
  for (const groups of [2, 3, 5, 4, 10]) {
    const total = target * groups;
    if (total > 250) continue;
    if (found.some((f) => f.op === '/' && f.b === groups)) continue;
    return {
      kind: 'div',
      total,
      groups,
      give: total,
      text: `${total} ÷ ? = ${target}`,
      clip: 'hint_div',
    };
  }
  return null;
}

const MAKERS: Record<Exclude<Treat, 'any'>, (t: number, f: readonly Expr[]) => Hint | null> = {
  add: addHint,
  sub: subHint,
  mul: mulHint,
  div: divHint,
};

/**
 * Choose the most useful hint: the favorite treat if it is still missing,
 * otherwise an operation the child has not used yet for this number.
 */
export function hintFor(target: number, fav: Treat, found: readonly Expr[]): Hint | null {
  const order: Array<Exclude<Treat, 'any'>> = [];
  if (fav !== 'any' && used(found, fav).length === 0) order.push(fav);
  const byUse = (['add', 'sub', 'mul', 'div'] as const)
    .slice()
    .sort((x, y) => used(found, x).length - used(found, y).length);
  for (const k of byUse) if (!order.includes(k)) order.push(k);
  for (const k of order) {
    const hint = MAKERS[k](target, found);
    if (hint) return hint;
  }
  return null;
}

// ---- your turn, after a hint -------------------------------------------------

/** Extra hearts for a "your turn" answer made alone. */
export const SOLO_BONUS = 2;
/** Tries at a "your turn" before the game lets it go. */
export const TURN_TRIES = 2;

type RealKind = 'add' | 'sub' | 'mul' | 'div';
const isReal = (k: Kind): k is RealKind => k === 'add' || k === 'sub' || k === 'mul' || k === 'div';

function isNew(e: Expr, avoid: number, found: readonly Expr[]): boolean {
  return e.a !== avoid && e.b !== avoid && !found.some((f) => sameExpr(f, e) || isFlip(f, e));
}

/** Is there still a way of this kind to make the number, without the hint's number and not one she has? */
export function ownWayLeft(target: number, kind: RealKind, avoid: number, found: readonly Expr[]): boolean {
  const ok = (e: Expr): boolean => classify(e) === kind && isNew(e, avoid, found);
  if (kind === 'add') {
    for (let a = 2; a <= target - 2; a++) if (ok({ a, op: '+', b: target - a })) return true;
  } else if (kind === 'sub') {
    for (let b = 2; b <= 100; b++) if (ok({ a: target + b, op: '-', b })) return true;
  } else if (kind === 'mul') {
    for (let a = 2; a <= target / 2; a++) if (target % a === 0 && ok({ a, op: '*', b: target / a })) return true;
  } else {
    for (let b = 2; b <= 12; b++) if (ok({ a: target * b, op: '/', b })) return true;
  }
  return false;
}

/**
 * After an answer made with a hint, she makes one more of her own: the same
 * kind, without the number the hint gave. When that kind has no new way
 * left (12 has only so many times treats), any kind of her own will do: null.
 */
export function turnKind(target: number, helped: Expr, avoid: number, found: readonly Expr[]): RealKind | null {
  const kind = classify(helped);
  return isReal(kind) && ownWayLeft(target, kind, avoid, found) ? kind : null;
}

/** Does this correct answer count as her own "your turn"? */
export function isOwnTurn(e: Expr, turn: { kind: Kind | null; avoid: number }, prior: readonly Expr[]): boolean {
  const kind = classify(e);
  if (!isReal(kind) || !isNew(e, turn.avoid, prior)) return false;
  return turn.kind === null || kind === turn.kind;
}

/** A correct answer that tried the "your turn" but reused the hint's number or an old answer. */
export function missedTurn(e: Expr, turn: { kind: Kind | null; avoid: number }, prior: readonly Expr[]): boolean {
  if (isOwnTurn(e, turn, prior)) return false;
  if (prior.some((f) => sameExpr(f, e))) return true;
  const kind = classify(e);
  return (turn.kind === null ? isReal(kind) : kind === turn.kind) && (e.a === turn.avoid || e.b === turn.avoid || prior.some((f) => isFlip(f, e)));
}
