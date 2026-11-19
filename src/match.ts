import { CANYON_ORDER, SPECIES, type SpeciesId } from './data/monsters';
import { isAddition, makeProblem, problemFrom, topRung, type Delivery, type Problem } from './math/regroup';
import { fluent } from './skill';
import { buddyOf, friends, isFriend, today, type Save } from './state';

/**
 * A match between two monsters, in turns. On her turn her monster's move takes
 * some of the other monster's power away, and she works out what is left. On
 * the other monster's turn it attacks and her monster blocks: a good block
 * adds to her monster's shield, and she works out the new total. So the fight
 * is the sum: there is nothing else to do in a match.
 *
 * Nothing is timed and nothing can be lost. Her shield only grows. A wrong
 * answer means the move or the block did not come off, and she tries again.
 *
 * A match is practice, not teaching. The Berry Canyon teaches a kind of
 * problem with crates and berries she can move; a match shows a bar and the
 * numbers. So a kind comes into matches only once it goes well without the
 * berries, and a match mixes every kind she has, the least practised first.
 */

export const MATCH_TURNS = 5;
/** Two matches a day at most: matches are a treat between the teaching games, not a way around them. */
export const MATCHES_PER_DAY = 2;
/** After a match, this many treats or trips in the other games before another friend asks. */
export const BETWEEN_MATCHES = 5;

/** What she has done today in the games: treats given and trips made. */
const doneToday = (save: Save): number => today(save).treats + today(save).trips;

/** A match was won: count it, and hold the next invitation back until she has played something else. */
export function matchPlayed(save: Save, foe: SpeciesId): void {
  const day = today(save);
  day.match = { foe, played: (day.match?.played ?? 0) + 1, over: true, nextAt: doneToday(save) + BETWEEN_MATCHES };
}

/** `hit`: her move takes power away (taking away). `block`: her block adds shield (adding). */
export type TurnKind = 'hit' | 'block';

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

/** Her level for each kind that is ready for matches: the kinds that go well without the berries. */
export function matchRungs(save: Save): Rungs {
  const out: Rungs = {};
  for (const type of KINDS) {
    const o = ownerOf(type);
    if (!o || !isFriend(save, o) || !fluent(save, type)) continue;
    const step = save.monsters[o]?.step ?? (save.startStep ? (save.startStep[type] ?? 0) : topRung(type) - 1);
    out[type] = Math.max(0, Math.min(topRung(type), step));
  }
  return out;
}

/** The kinds in a match, the one she has gone longest without first. */
export function stalestFirst(save: Save, rungs: Rungs): Delivery[] {
  const last = (type: Delivery): number => save.tripLog.reduce((t, e) => (e.type === type && e.t > t ? e.t : t), 0);
  return KINDS.filter((t) => rungs[t] !== undefined).sort((x, y) => last(x) - last(y));
}

/** A match needs a kind that is ready for it, and a second monster to play against. */
export function canMatch(save: Save): boolean {
  return Object.keys(matchRungs(save)).length > 0 && friends(save).length >= 2;
}

/**
 * The friend who asks for a match today, out of the monsters in the meadow.
 * The same one keeps asking until its match is played. Then nobody asks until
 * she has played something else for a while, and after the day's last match
 * nobody asks at all.
 */
export function matchInvite(save: Save, inMeadow: SpeciesId[], rng: () => number = Math.random): SpeciesId | null {
  const day = today(save);
  if ((day.match?.played ?? 0) >= MATCHES_PER_DAY || !canMatch(save)) return null;
  const mine = buddyOf(save);
  const asked = new Set((day.wishes ?? []).filter((w) => !w.done).map((w) => w.id));
  const pool = inMeadow.filter((id) => id !== mine && isFriend(save, id));
  if (pool.length === 0) return null;
  if (day.match?.over && doneToday(save) < (day.match.nextAt ?? 0)) return null;
  if (day.match && !day.match.over && pool.includes(day.match.foe)) return day.match.foe;
  // A friend who already asks to play keeps that bubble, and the friend from the last match has had its turn.
  const last = day.match?.over ? day.match.foe : null;
  const others = pool.filter((id) => id !== last);
  const free = others.filter((id) => !asked.has(id));
  const from = free.length > 0 ? free : others.length > 0 ? others : pool;
  const foe = from[Math.floor(rng() * from.length)] as SpeciesId;
  day.match = { foe, played: day.match?.played ?? 0 };
  return foe;
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * The turns of one match. Hits and blocks take turns when she has both taking
 * away and adding. Each side has its own bar: a hit starts from the other
 * monster's power after the last hit, a block from her shield after the last block.
 * `order` puts the kind to practise first at the front.
 */
export function planMatch(rungs: Rungs, rng: () => number = Math.random, order: Delivery[] = []): Turn[] {
  const hits = KINDS.filter((t) => !isAddition(t) && rungs[t] !== undefined);
  const blocks = KINDS.filter((t) => isAddition(t) && rungs[t] !== undefined);
  if (hits.length === 0 && blocks.length === 0) return [];
  const pattern: TurnKind[] = Array.from({ length: MATCH_TURNS }, (_, i) =>
    hits.length === 0 ? 'block' : blocks.length === 0 ? 'hit' : i % 2 === 1 ? 'block' : 'hit',
  );
  const typesFor = (kind: TurnKind, first: boolean): Delivery[] => {
    const all = shuffled(kind === 'hit' ? hits : blocks, rng);
    // The first turn of each sort goes to the kind she has practised least lately.
    return first ? [...all].sort((x, y) => (order.indexOf(x) + 1 || 99) - (order.indexOf(y) + 1 || 99)) : all;
  };

  /** The next problem from `value`, at her own level only. */
  const next = (kind: TurnKind, value: number | null): Turn | null => {
    for (const type of typesFor(kind, value === null)) {
      const rung = rungs[type] as number;
      const p = value === null ? makeProblem(type, rng, rung) : problemFrom(type, value, rng, rung);
      if (p) return { kind, p, rung, own: true, fresh: value === null };
    }
    return null;
  };

  // Most matches chain all the way at her own level. Try a few starts before settling for less.
  for (let attempt = 0; attempt < 30; attempt++) {
    const turns: Turn[] = [];
    const bar: Record<TurnKind, number | null> = { hit: null, block: null };
    for (const kind of pattern) {
      const turn = next(kind, bar[kind]);
      if (!turn) break;
      turns.push(turn);
      bar[kind] = turn.p.answer;
    }
    if (turns.length === pattern.length) return turns;
  }

  // A bar ran out of room at her level (a power too low to take more from).
  // Carry on with an easier problem where one fits, and start the bar again where none does.
  const turns: Turn[] = [];
  const bar: Record<TurnKind, number | null> = { hit: null, block: null };
  for (const kind of pattern) {
    const value = bar[kind];
    let turn = next(kind, value);
    if (!turn && value !== null) {
      for (const type of typesFor(kind, false)) {
        for (let rung = (rungs[type] as number) - 1; rung >= 0 && !turn; rung--) {
          const p = problemFrom(type, value, rng, rung);
          if (p) turn = { kind, p, rung, own: false, fresh: false };
        }
        if (turn) break;
      }
    }
    turn ??= next(kind, null) as Turn;
    turns.push(turn);
    bar[kind] = turn.p.answer;
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
