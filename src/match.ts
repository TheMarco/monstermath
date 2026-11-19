import { CANYON_ORDER, SPECIES, type SpeciesId } from './data/monsters';
import { isAddition, makeProblem, problemFrom, topRung, type Delivery, type Problem } from './math/regroup';
import { friends, isFriend, type Save } from './state';

/**
 * A match between two monsters. The other monster's power is a number, drawn
 * as a bar. Her monster's move takes some away, and she works out what is
 * left. Then the other monster powers up, and she works out the new total.
 * So the fight is the sum: there is nothing else to do in a match.
 *
 * The problems are the Berry Canyon's own, at her own level, and each answer
 * is the first number of the next problem. Nothing is timed and nothing can
 * be lost. A wrong answer means the move missed and she tries again.
 */

export const MATCH_TURNS = 5;

export type TurnKind = 'hit' | 'boost';

export interface Turn {
  kind: TurnKind;
  p: Problem;
  rung: number;
  /** At her own level. A chain that runs out of room takes an easier problem, which does not count for her level. */
  own: boolean;
  /** The bar starts again from a new number instead of carrying on from the last answer. */
  fresh: boolean;
}

export type Rungs = Partial<Record<Delivery, number>>;

const KINDS: Delivery[] = ['add', 'addR', 'sub', 'subR'];

/** The canyon monster that teaches a kind of problem. */
export function ownerOf(type: Delivery): SpeciesId | undefined {
  return CANYON_ORDER.find((c) => SPECIES[c].delivery === type);
}

/** Her level for each kind she has learned: the kinds whose canyon monster is her friend. */
export function matchRungs(save: Save): Rungs {
  const out: Rungs = {};
  for (const type of KINDS) {
    const o = ownerOf(type);
    if (!o || !isFriend(save, o)) continue;
    const step = save.monsters[o]?.step ?? (save.startStep ? (save.startStep[type] ?? 0) : topRung(type) - 1);
    out[type] = Math.max(0, Math.min(topRung(type), step));
  }
  return out;
}

/** A match needs taking away, which she has once a take-away monster is her friend, and a second monster to play against. */
export function canMatch(save: Save): boolean {
  const rungs = matchRungs(save);
  return (rungs.sub !== undefined || rungs.subR !== undefined) && friends(save).length >= 2;
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** The turns of one match. Hits and power-ups take turns when she knows both adding and taking away. */
export function planMatch(rungs: Rungs, rng: () => number = Math.random): Turn[] {
  const hits = KINDS.filter((t) => !isAddition(t) && rungs[t] !== undefined);
  const boosts = KINDS.filter((t) => isAddition(t) && rungs[t] !== undefined);
  if (hits.length === 0) return [];
  const pattern: TurnKind[] = Array.from({ length: MATCH_TURNS }, (_, i) => (boosts.length > 0 && i % 2 === 1 ? 'boost' : 'hit'));
  const typesFor = (kind: TurnKind): Delivery[] => shuffled(kind === 'hit' ? hits : boosts, rng);

  /** The next problem from `value`, at her own level only. */
  const next = (kind: TurnKind, value: number | null): Turn | null => {
    for (const type of typesFor(kind)) {
      const rung = rungs[type] as number;
      const p = value === null ? makeProblem(type, rng, rung) : problemFrom(type, value, rng, rung);
      if (p) return { kind, p, rung, own: true, fresh: value === null };
    }
    return null;
  };

  // Most matches chain all the way at her own level. Try a few starts before settling for less.
  for (let attempt = 0; attempt < 30; attempt++) {
    const turns: Turn[] = [];
    let value: number | null = null;
    for (const kind of pattern) {
      const turn = next(kind, value);
      if (!turn) break;
      turns.push(turn);
      value = turn.p.answer;
    }
    if (turns.length === pattern.length) return turns;
  }

  // Her levels for adding and taking away are too far apart to chain. Carry on
  // with an easier problem where one fits, and start the bar again where none does.
  const turns: Turn[] = [];
  let value: number | null = null;
  for (const kind of pattern) {
    let turn = next(kind, value);
    if (!turn && value !== null) {
      for (const type of typesFor(kind)) {
        for (let rung = (rungs[type] as number) - 1; rung >= 0 && !turn; rung--) {
          const p = problemFrom(type, value, rng, rung);
          if (p) turn = { kind, p, rung, own: false, fresh: false };
        }
        if (turn) break;
      }
    }
    turn ??= next(kind, null) as Turn;
    turns.push(turn);
    value = turn.p.answer;
  }
  return turns;
}

export interface Jump {
  from: number;
  by: number;
  to: number;
}

/**
 * The problem in small jumps, the way it is done on an empty number line:
 * the tens first, then the ones, stopping at the ten on the way when the ones
 * cross it. 52 take away 27: 52 to 32, 32 to 30, 30 to 25.
 */
export function jumps(p: Problem): Jump[] {
  const sign = isAddition(p.type) ? 1 : -1;
  const out: Jump[] = [];
  let at = p.a;
  const go = (by: number): void => {
    if (by <= 0) return;
    out.push({ from: at, by, to: at + sign * by });
    at += sign * by;
  };
  const ones = p.b % 10;
  go(p.b - ones);
  const toTen = sign > 0 ? (10 - (at % 10)) % 10 : at % 10;
  if (toTen > 0 && ones > toTen) {
    go(toTen);
    go(ones - toTen);
  } else {
    go(ones);
  }
  return out;
}
