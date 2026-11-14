/**
 * The ladder every skill is climbed on. A skill has rungs from easiest to
 * hardest. She works at her rung; about one problem in four is a stretch
 * problem from the rung above. A window of recent problems decides when she
 * moves: mostly clean answers move her up, repeated misses move her down.
 * Stretch problems can only help: a miss on one never counts against her.
 */

/** One finished problem: 1 clean at her rung, 0 not clean at her rung, 3 clean stretch, 2 stretch not clean. */
export type Mark = 0 | 1 | 2 | 3;

export interface Progress {
  rung: number;
  recent: Mark[];
}

export const WINDOW = 6;
/** How many problems the game wants to see before it moves her up. */
export const ENOUGH = 5;
/** About one problem in four comes from the rung above. Tests set this to 0 to play a fixed script. */
export const tuning = { stretchChance: 0.25 };

const isStretch = (m: Mark | undefined): boolean => m === 2 || m === 3;
const isClean = (m: Mark | undefined): boolean => m === 1 || m === 3;

/**
 * Should the next problem come from the rung above? Never two in a row, never
 * right after a miss, and not before she has settled at her rung.
 */
export function wantsStretch(p: Progress, top: number, rng: () => number = Math.random): boolean {
  if (p.rung >= top || p.recent.length < 2) return false;
  const last = p.recent.at(-1);
  if (isStretch(last) || last === 0) return false;
  return rng() < tuning.stretchChance;
}

export interface Moved extends Progress {
  /** 1 moved up a rung, -1 moved down, 0 stayed. */
  moved: -1 | 0 | 1;
}

/** Add a finished problem and decide whether she moves. `clean` means right the first time, without help. */
export function record(p: Progress, top: number, clean: boolean, stretch: boolean): Moved {
  const mark: Mark = stretch ? (clean ? 3 : 2) : clean ? 1 : 0;
  const recent = [...p.recent, mark].slice(-WINDOW);
  const misses = recent.filter((m) => m === 0).length;
  const stretchWins = recent.filter((m) => m === 3).length;
  const own = recent.filter((m) => !isStretch(m));

  // Up: a window with at most one miss that ends on a clean answer, or two stretch problems solved cleanly.
  const steady = recent.length >= ENOUGH && misses <= 1 && isClean(mark);
  const leaping = stretchWins >= 2 && misses === 0 && recent.length >= 3;
  if (p.rung < top && (steady || leaping)) return { rung: p.rung + 1, recent: [], moved: 1 };

  // Down: two misses in a row at her own rung, or half a window of misses.
  const twoInARow = own.length >= 2 && own.at(-1) === 0 && own.at(-2) === 0;
  if (p.rung > 0 && (twoInARow || misses >= 3)) return { rung: p.rung - 1, recent: [], moved: -1 };

  return { rung: p.rung, recent, moved: 0 };
}

/** Share of recent problems at her own rung that were clean. Null when there are too few. */
export function steadiness(p: Progress): number | null {
  const own = p.recent.filter((m) => !isStretch(m));
  if (own.length < 3) return null;
  return own.filter((m) => m === 1).length / own.length;
}
