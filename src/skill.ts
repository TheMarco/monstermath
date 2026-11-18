import { EGG_ORDER, SPECIES, type SpeciesId } from './data/monsters';
import { recordRound, wantsStretch, type Mark, type Moved } from './ladder';
import type { Treat } from './math/expr';
import type { Delivery } from './math/regroup';
import { clock, dayKey, daysPlayed, friends, isFriend, nextTarget, type MonsterState, type Round, type Save, type TreatProgress } from './state';
import { steppedDown } from './start';

/**
 * What the game knows about where she is, and how it uses it: how big the
 * treat numbers are (one shared ladder per kind of treat), when the berry blocks can step back, which skill most
 * needs another visit, and easing off after a long break.
 */

type Levels = Partial<Record<string, number>>;

/** Monsters that play treats: the starters, the Tall Grass monsters and the egg monsters. */
export function playsTreats(id: SpeciesId): boolean {
  const habitat = SPECIES[id].habitat;
  return habitat === 'starter' || habitat === 'grass' || habitat === 'egg';
}

/** The biggest treats size for a kind of treat, over every monster that asks for it. */
export function treatTop(fav: Treat): number {
  const sizes = (Object.keys(SPECIES) as SpeciesId[]).filter((id) => playsTreats(id) && SPECIES[id].fav === fav).map((id) => SPECIES[id].pools.length);
  return Math.max(0, Math.max(0, ...sizes) - 1);
}

/** Where a kind of treat starts (0 is the smallest numbers), from the first-day check. */
export function treatStart(levels: Levels | undefined, fav: Treat): number {
  if (!levels) return 0;
  const passed = (strand: string): number => levels[strand] ?? 0;
  // Adding and taking away: sums within 20, then two-digit plus one-digit, then two-digit plus two-digit with regrouping.
  const sums = (n: number): number => (n >= 6 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0);
  const facts = (n: number): number => (n >= 5 ? 2 : n >= 3 ? 1 : 0);
  let pool: number;
  switch (fav) {
    case 'sub':
      pool = sums(passed('sub'));
      break;
    case 'mul':
      pool = facts(passed('mul'));
      break;
    case 'div':
      pool = facts(passed('div'));
      break;
    default:
      pool = sums(passed('add'));
  }
  // Until two-digit numbers read as tens and ones, stay with numbers up to about 20.
  if (passed('place') < 3) pool = Math.min(pool, 1);
  return Math.min(pool, treatTop(fav));
}

/**
 * Her treats ladder for a kind of treat. Every monster that asks for that
 * kind shares it, so getting better with one shows with all of them. Saves
 * from before kept a size per monster: the biggest one carries over.
 */
export function treatLevel(save: Save, fav: Treat): TreatProgress {
  save.treatLevels ??= {};
  let p = save.treatLevels[fav];
  if (!p) {
    p = { rung: treatRung(save, fav), recent: [] };
    save.treatLevels[fav] = p;
  }
  p.rung = Math.max(0, Math.min(treatTop(fav), p.rung));
  return p;
}

/** Her treats size for a kind of treat, without saving anything: for the grown-up page. */
export function treatRung(save: Save, fav: Treat): number {
  const kept = save.treatLevels?.[fav];
  if (kept) return Math.max(0, Math.min(treatTop(fav), kept.rung));
  const held = (Object.values(save.monsters) as MonsterState[])
    .filter((m) => playsTreats(m.id) && SPECIES[m.id].fav === fav && m.pool !== undefined)
    .map((m) => m.pool as number);
  return Math.max(0, Math.min(treatTop(fav), Math.max(treatStart(save.intakeLevels, fav), ...held)));
}

/**
 * A new treats round with this monster: a number from her size, or now and
 * then a stretch round from the size above. The very first round ever is a
 * size down, as a warm-up.
 */
export function startTreatRound(save: Save, id: SpeciesId, rng: () => number = Math.random): Round {
  const fav = SPECIES[id].fav;
  const p = treatLevel(save, fav);
  const last = Math.max(0, SPECIES[id].pools.length - 1);
  const warmUp = save.exprLog.length === 0;
  const stretch = !warmUp && wantsStretch({ rung: p.rung, recent: p.recent as Mark[] }, Math.min(last, treatTop(fav)), rng);
  const pool = warmUp ? Math.max(0, p.rung - 1) : Math.min(last, p.rung + (stretch ? 1 : 0));
  // A warm-up round is below her size, so it is not marked on the ladder (no rung).
  return { target: nextTarget(save, id, rng, pool), hearts: 0, found: [], hints: 0, misses: 0, rung: warmUp ? undefined : p.rung, stretch, helped: 0, solo: 0, dropped: 0 };
}

export type RoundQuality = 'clean' | 'ok' | 'rough';

/**
 * Wrong tries are free and part of exploring, so a few do not count against a
 * round. A hint is fine when she then made one of her own; letting a "your
 * turn" go means the numbers were too big.
 */
export function roundQuality(round: Pick<Round, 'misses' | 'helped' | 'solo' | 'dropped'>): RoundQuality {
  const misses = round.misses ?? 0;
  if (misses >= 5 || (round.dropped ?? 0) > 0) return 'rough';
  return misses <= 2 && (round.solo ?? 0) >= (round.helped ?? 0) ? 'clean' : 'ok';
}

/**
 * After a treats round: move her treats size by how it went. A round that
 * began at another size (she left it and came back later) says nothing about
 * this one. Returns null when nothing was recorded.
 */
export function finishTreatRound(save: Save, id: SpeciesId, round: Round): Moved | null {
  const fav = SPECIES[id].fav;
  const p = treatLevel(save, fav);
  if (round.rung !== p.rung) return null;
  const moved = recordRound({ rung: p.rung, recent: p.recent as Mark[] }, Math.min(SPECIES[id].pools.length - 1, treatTop(fav)), roundQuality(round), !!round.stretch);
  p.rung = moved.rung;
  p.recent = moved.recent;
  return moved;
}

/**
 * True when her recent berry trips of this kind were right the first time
 * without help. Only then do the berries start hidden and the sums go past 100.
 */
export function fluent(save: Save, type: Delivery): boolean {
  const recent = save.tripLog.filter((t) => t.type === type).slice(-6);
  if (recent.length < 4) return false;
  if (recent.slice(-3).some((t) => t.helped)) return false;
  return recent.filter((t) => t.firstTry).length >= Math.ceil(recent.length * 0.8);
}

/**
 * How well the skill behind a monster has gone lately, 0 to 1. Null when
 * there is too little to tell.
 */
export function skillHealth(save: Save, id: SpeciesId): number | null {
  const sp = SPECIES[id];
  let marks: boolean[];
  if (sp.habitat === 'canyon') {
    marks = save.tripLog.filter((t) => t.type === sp.delivery).slice(-8).map((t) => t.firstTry);
  } else if (sp.habitat === 'hollow') {
    marks = (save.fracLog ?? []).filter((f) => f.kind === sp.frac).slice(-8).map((f) => f.firstTry);
  } else if (sp.habitat === 'early') {
    marks = (save.countLog ?? []).filter((c) => c.kind === sp.count).slice(-8).map((c) => c.firstTry);
  } else if (sp.habitat === 'upper') {
    marks = (save.upperLog ?? []).filter((u) => u.kind === sp.upper).slice(-8).map((u) => u.firstTry);
  } else {
    marks = save.exprLog.filter((e) => e.monster === id).slice(-12).map((e) => e.correct && !e.hinted);
  }
  if (marks.length < 3) return null;
  return marks.filter(Boolean).length / marks.length;
}

/** Below this, a skill is asked for again before the ones she simply has not played much. */
export const WEAK_BELOW = 0.7;

/** The friend whose skill has gone worst lately, when one is clearly shaky. */
export function weakestFriend(save: Save): SpeciesId | null {
  const rated = friends(save)
    .map((m) => ({ id: m.id, health: skillHealth(save, m.id) }))
    .filter((x): x is { id: SpeciesId; health: number } => x.health !== null && x.health < WEAK_BELOW)
    .sort((x, y) => x.health - y.health);
  return rated[0]?.id ?? null;
}

export const BREAK_DAYS = 7;

function daysBetween(from: string, to: string): number {
  const at = (key: string): number => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y as number, (m as number) - 1, d as number);
  };
  return Math.round((at(to) - at(from)) / 86400000);
}

/**
 * Back after a week or more: every problem size and treat pool steps down
 * one, so the first problems are ones she can do. Once per break.
 */
export function easeAfterBreak(save: Save): boolean {
  const last = daysPlayed(save).at(-1);
  const now = dayKey(clock.now());
  if (!last || last === now || save.easedFor === last) return false;
  if (daysBetween(last, now) < BREAK_DAYS) return false;
  save.easedFor = last;
  // Treats sizes kept per monster in older saves become shared first, so they step down too.
  for (const m of Object.values(save.monsters) as MonsterState[]) if (playsTreats(m.id)) treatLevel(save, SPECIES[m.id].fav);
  for (const m of Object.values(save.monsters) as MonsterState[]) {
    if (m.step !== undefined && m.step > 0) m.step -= 1;
    m.run = 0;
    m.recent = [];
  }
  const ladders: Array<{ step?: number; recent?: number[] } | undefined> = [...Object.values(save.early ?? {}), ...Object.values(save.upper ?? {})];
  for (const at of ladders) {
    if (!at) continue;
    if (at.step !== undefined && at.step > 0) at.step -= 1;
    at.recent = [];
  }
  for (const p of Object.values(save.treatLevels ?? {})) {
    if (!p) continue;
    if (p.rung > 0) p.rung -= 1;
    p.recent = [];
  }
  return true;
}

// ---- when the next monster comes out ----------------------------------------

/** The monsters whose skills have to be secure before this one is met. */
export const NEEDS: Partial<Record<SpeciesId, SpeciesId[]>> = {
  plum: ['nub'],
  dusk: ['nub'],
  chip: ['dusk'],
  fenn: ['glim'],
  tam: ['bix'],
  // Many copies of a piece is multiplication: equal rows come first.
  zim: ['bix', 'glim'],
  lux: ['zim', 'tam'],
  // Counting comes before comparing two amounts.
  flam: ['fig'],
  kelp: ['fig'],
  // Tens and ones stand on the full crate of ten.
  beary: ['kelp'],
  // Big trays stand on equal rows and on packing a crate of ten.
  belch: ['glim', 'plum'],
  // Dividing in parts is multiplying in parts, backwards.
  drift: ['belch', 'fenn'],
  // Slices can only be added once equal fractions are known.
  bug: ['tam'],
  // Tenths and hundredths are equal pieces of one whole.
  cook: ['bix'],
};

/** A good day for a skill: at least this many problems, this share right the first time. */
export const GOOD_DAY_PROBLEMS = 4;
export const SECURE_RATE = 0.7;
/** Good days needed before a skill counts as secure. */
export const SECURE_DAYS = 3;

/** First-try marks for a skill, with the day each problem was done. */
function marksByDay(save: Save, id: SpeciesId): Map<string, boolean[]> {
  const sp = SPECIES[id];
  let marks: Array<[string, boolean]>;
  if (sp.habitat === 'canyon' && sp.delivery) {
    marks = save.tripLog.filter((t) => t.type === sp.delivery).map((t) => [t.day, t.firstTry]);
  } else if (sp.habitat === 'hollow') {
    marks = (save.fracLog ?? []).filter((f) => f.kind === sp.frac).map((f) => [f.day, f.firstTry]);
  } else if (sp.habitat === 'early') {
    marks = (save.countLog ?? []).filter((c) => c.kind === sp.count).map((c) => [c.day, c.firstTry]);
  } else if (sp.habitat === 'upper') {
    marks = (save.upperLog ?? []).filter((u) => u.kind === sp.upper).map((u) => [u.day, u.firstTry]);
  } else {
    marks = save.exprLog.filter((e) => e.monster === id).map((e) => [e.day, e.correct && !e.hinted]);
  }
  const days = new Map<string, boolean[]>();
  for (const [day, ok] of marks) days.set(day, [...(days.get(day) ?? []), ok]);
  return days;
}

/**
 * Skills the first-day check already showed, so the monsters that wait on
 * them do not hold her on work below her level: berry trips she did at full
 * two-digit size, counting once she reads two-digit numbers as tens and
 * ones, and the crate of ten once she also adds across ten.
 */
export function shownByCheck(save: Save, id: SpeciesId): boolean {
  const sp = SPECIES[id];
  const passed = (strand: string): number => save.intakeLevels?.[strand] ?? 0;
  if (sp.habitat === 'canyon' && sp.delivery) return !!save.fast[sp.delivery];
  if (sp.habitat === 'early' && sp.count === 'count') return passed('place') >= 3 || passed('count') >= 5;
  if (sp.habitat === 'early' && sp.count === 'ten') return passed('place') >= 3 && passed('add') >= 2;
  return false;
}

/** How many different days she practised this skill enough, and well. Capped at SECURE_DAYS. */
export function goodDays(save: Save, id: SpeciesId): number {
  if (!isFriend(save, id)) return 0;
  if (shownByCheck(save, id)) return SECURE_DAYS;
  let good = 0;
  for (const marks of marksByDay(save, id).values()) {
    if (marks.length >= GOOD_DAY_PROBLEMS && marks.filter(Boolean).length / marks.length >= SECURE_RATE) good += 1;
  }
  return Math.min(SECURE_DAYS, good);
}

/**
 * A skill is secure when it went well on three different days: same-day
 * success says little about whether it will still be there next week. The
 * first-day check can show a skill is secure straight away.
 */
export function secure(save: Save, id: SpeciesId): boolean {
  return goodDays(save, id) >= SECURE_DAYS;
}

/** New monsters she can befriend in the places per day. The starter and egg monsters are not counted. */
export const NEW_FRIENDS_PER_DAY = 1;

export function metToday(save: Save): number {
  const day = dayKey();
  return friends(save).filter((m) => m.friendOn === day && m.id !== save.starter && !EGG_ORDER.includes(m.id)).length;
}

export interface NextWild {
  id: SpeciesId;
  /** False when a skill before it still needs practice, or today already had a new friend. */
  ready: boolean;
  /** The friend to practise with first: the one whose skill is furthest from secure. */
  needs?: SpeciesId;
  /** Good days so far with that friend, out of SECURE_DAYS. */
  progress?: number;
}

/** The skills still missing before this monster can be met, least practised first. */
export function missing(save: Save, id: SpeciesId): SpeciesId[] {
  // A grown-up said she starts in the Bakery: the skills from the other places are taken as known.
  const known = (n: SpeciesId): boolean => save.startAt === 'upper' && !steppedDown('upper', save.intakeLevels ?? {}) && SPECIES[id].habitat === 'upper' && SPECIES[n].habitat !== 'upper';
  return (NEEDS[id] ?? []).filter((n) => !known(n) && !secure(save, n)).sort((x, y) => goodDays(save, x) - goodDays(save, y));
}

/** The next monster to meet in a place, in teaching order, and whether she is ready for it. */
export function nextWild(save: Save, order: SpeciesId[]): NextWild | null {
  const waiting = order.filter((id) => !isFriend(save, id));
  // Enough new friends for one day: the next one waits until tomorrow.
  if (!save.openAll && metToday(save) >= NEW_FRIENDS_PER_DAY) {
    // One she has already started with can still be finished.
    const begun = waiting.find((id) => (save.monsters[id]?.trips ?? 0) > 0 || save.monsters[id]?.current);
    if (begun && missing(save, begun).length === 0) return { id: begun, ready: true };
    return waiting[0] ? { id: waiting[0], ready: false } : null;
  }
  for (const id of waiting) {
    if (save.openAll || missing(save, id).length === 0) return { id, ready: true };
  }
  const first = waiting[0];
  if (!first) return null;
  const needs = missing(save, first)[0];
  return { id: first, ready: false, needs, progress: needs ? goodDays(save, needs) : 0 };
}
