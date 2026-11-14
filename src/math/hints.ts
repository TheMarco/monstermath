import { classify, type Expr, type Kind, type Treat } from './expr';

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
