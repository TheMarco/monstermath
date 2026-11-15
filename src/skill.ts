import { EGG_ORDER, SPECIES, type SpeciesId } from './data/monsters';
import type { Delivery } from './math/regroup';
import { clock, dayKey, daysPlayed, friends, isFriend, monster, type MonsterState, type Save } from './state';

/**
 * What the game knows about where she is, and how it uses it: how big the
 * treat numbers are, when the berry blocks can step back, which skill most
 * needs another visit, and easing off after a long break.
 */

type Levels = Partial<Record<string, number>>;

/** Where a monster's treat numbers start (0 is the smallest pool), from the first-day check. */
export function startPool(levels: Levels | undefined, id: SpeciesId, isFirstStarter: boolean): number {
  const sp = SPECIES[id];
  const last = Math.max(0, sp.pools.length - 1);
  if (!levels) return 0;
  const passed = (strand: string): number => levels[strand] ?? 0;
  const ladder = (n: number, high: number, mid: number): number => (n >= high ? 2 : n >= mid ? 1 : 0);
  let pool: number;
  switch (sp.fav) {
    case 'add':
      pool = ladder(passed('add'), 5, 2);
      break;
    case 'sub':
      pool = ladder(passed('sub'), 5, 2);
      break;
    case 'mul':
      pool = ladder(passed('mul'), 5, 3);
      break;
    case 'div':
      pool = ladder(passed('div'), 5, 3);
      break;
    default:
      // Any-treat monsters: the first starter begins smallest; later ones a pool up, when sums within 20 are solid.
      pool = (passed('add') >= 5 ? 1 : 0) + (!isFirstStarter && passed('add') >= 2 ? 1 : 0);
  }
  // Until two-digit numbers read as tens and ones, stay with numbers up to about 20.
  if (passed('place') < 3) pool = Math.min(pool, 1);
  return Math.min(pool, last);
}

/** The pool a monster's next number comes from. Set once, then moved by how rounds go. */
export function poolOf(save: Save, id: SpeciesId): number {
  const m = monster(save, id);
  const last = Math.max(0, SPECIES[id].pools.length - 1);
  if (m.pool === undefined) {
    m.pool = save.intakeLevels
      ? startPool(save.intakeLevels, id, save.starter === id)
      : // Saves from before the first-day check: the old rule, a pool every two rounds.
        Math.floor(m.rounds / 2) + (SPECIES[id].habitat === 'starter' && save.starter !== id ? 1 : 0);
  }
  m.pool = Math.max(0, Math.min(last, m.pool));
  return m.pool;
}

export type RoundQuality = 'clean' | 'ok' | 'rough';

/** Wrong tries are free and part of exploring, so a few do not count against a round. */
export function roundQuality(misses: number, hints: number): RoundQuality {
  if (misses >= 5 || hints >= 2) return 'rough';
  return misses <= 2 && hints === 0 ? 'clean' : 'ok';
}

/** After a treats round: two clean rounds move the numbers up, one rough round moves them down. */
export function adaptPool(save: Save, id: SpeciesId, quality: RoundQuality): void {
  const m = monster(save, id);
  const last = Math.max(0, SPECIES[id].pools.length - 1);
  const pool = poolOf(save, id);
  if (quality === 'rough') {
    m.pool = Math.max(0, pool - 1);
    m.poolRun = 0;
  } else if (quality === 'clean') {
    const run = (m.poolRun ?? 0) + 1;
    if (run >= 2) {
      m.pool = Math.min(last, pool + 1);
      m.poolRun = 0;
    } else {
      m.poolRun = run;
    }
  }
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
  for (const m of Object.values(save.monsters) as MonsterState[]) {
    if (m.step !== undefined && m.step > 0) m.step -= 1;
    m.run = 0;
    m.recent = [];
    if (m.pool !== undefined && m.pool > 0) m.pool -= 1;
    m.poolRun = 0;
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
  } else {
    marks = save.exprLog.filter((e) => e.monster === id).map((e) => [e.day, e.correct && !e.hinted]);
  }
  const days = new Map<string, boolean[]>();
  for (const [day, ok] of marks) days.set(day, [...(days.get(day) ?? []), ok]);
  return days;
}

/** How many different days she practised this skill enough, and well. Capped at SECURE_DAYS. */
export function goodDays(save: Save, id: SpeciesId): number {
  if (!isFriend(save, id)) return 0;
  const sp = SPECIES[id];
  if (sp.habitat === 'canyon' && sp.delivery && save.fast[sp.delivery]) return SECURE_DAYS;
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
  return (NEEDS[id] ?? []).filter((n) => !secure(save, n)).sort((x, y) => goodDays(save, x) - goodDays(save, y));
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
