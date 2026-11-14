import { SPECIES, type SpeciesId } from './data/monsters';
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

/** The monster whose skill has to be secure before this one is met. */
export const NEEDS: Partial<Record<SpeciesId, SpeciesId>> = {
  plum: 'nub',
  dusk: 'nub',
  chip: 'dusk',
  fenn: 'glim',
  tam: 'bix',
  zim: 'bix',
  lux: 'zim',
};

export const SECURE_PROBLEMS = 6;
export const SECURE_RATE = 0.7;

/**
 * A skill is secure when she has done a fair number of its problems and most
 * recent ones were right the first time. The first-day check can show that
 * straight away.
 */
export function secure(save: Save, id: SpeciesId): boolean {
  if (!isFriend(save, id)) return false;
  const sp = SPECIES[id];
  let marks: boolean[];
  if (sp.habitat === 'canyon' && sp.delivery) {
    if (save.fast[sp.delivery]) return true;
    marks = save.tripLog.filter((t) => t.type === sp.delivery).map((t) => t.firstTry);
  } else if (sp.habitat === 'hollow') {
    marks = (save.fracLog ?? []).filter((f) => f.kind === sp.frac).map((f) => f.firstTry);
  } else {
    return (save.monsters[id]?.rounds ?? 0) >= 2;
  }
  const recent = marks.slice(-8);
  return marks.length >= SECURE_PROBLEMS && recent.filter(Boolean).length / recent.length >= SECURE_RATE;
}

export interface NextWild {
  id: SpeciesId;
  /** False when the skill before it still needs practice. */
  ready: boolean;
  /** The friend to practise with first. */
  needs?: SpeciesId;
}

/** The next monster to meet in a place, in teaching order, and whether she is ready for it. */
export function nextWild(save: Save, order: SpeciesId[]): NextWild | null {
  const waiting = order.filter((id) => !isFriend(save, id));
  for (const id of waiting) {
    const needs = NEEDS[id];
    if (save.openAll || !needs || secure(save, needs)) return { id, ready: true };
  }
  const first = waiting[0];
  return first ? { id: first, ready: false, needs: NEEDS[first] } : null;
}
