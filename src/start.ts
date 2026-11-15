import type { IntakeLevels, StrandId } from './intake';

/**
 * Where the first-day check begins and what it asks. Kept apart from the
 * questions themselves so the rules for meeting monsters can read it.
 */
export type StartPoint = 'early' | 'sums' | 'middle' | 'upper';

/**
 * True when the chosen range turned out too hard: the check then also asked
 * the range below it. Only known once the chosen range has been asked.
 */
export function steppedDown(start: StartPoint | undefined, levels: IntakeLevels): boolean {
  if (!start || start === 'early') return false;
  if (!PLAN[start].every((id) => levels[id] !== undefined)) return false;
  // Bakery: the times tables or sharing are not there yet.
  if (start === 'upper') return (levels.mul ?? 0) < 3 || (levels.div ?? 0) < 1;
  // Not reading teen numbers, or not adding within 10.
  return (levels.place ?? 0) < 2 || (levels.add ?? 0) < 1;
}

/** What the check adds when the chosen range was too hard. */
export const BELOW: Record<StartPoint, StrandId[]> = {
  early: [],
  sums: ['count'],
  middle: ['count'],
  upper: ['add', 'sub'],
};

export const PLAN: Record<StartPoint, StrandId[]> = {
  early: ['count', 'place', 'add', 'sub'],
  sums: ['place', 'add', 'sub', 'mul'],
  middle: ['place', 'add', 'sub', 'mul', 'div', 'frac'],
  upper: ['place', 'mul', 'div', 'frac'],
};
