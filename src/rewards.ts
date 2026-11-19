import { EGG_ORDER, SPECIES, type SpeciesId } from './data/monsters';
import type { Kind } from './math/expr';
import type { FracKind } from './math/fractions';
import type { Delivery } from './math/regroup';
import { weakestFriend } from './skill';
import { befriend, dayKey, daysPlayed, friends, giveStar, isFriend, monster, today, type Save, type StarResult } from './state';

/**
 * The reward layer around the math: ranger levels, eggs, bonds, wishes and
 * stickers. Everything here is earned by playing, and nothing is ever lost.
 */

// ---- ranger level ---------------------------------------------------------

/** Points needed to reach a level: 20, 50, 90, 140, 200, 270... */
export function xpForLevel(level: number): number {
  return 5 * level * (level + 3);
}

export function levelFor(xp: number): number {
  let level = 0;
  while (xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelFor(xp);
  const base = xpForLevel(level);
  return { level, into: xp - base, span: xpForLevel(level + 1) - base };
}

// ---- eggs -----------------------------------------------------------------

export const EGG_WARMTH = 10;

export function unhatched(save: Save): SpeciesId[] {
  return EGG_ORDER.filter((id) => !isFriend(save, id));
}

function settleEgg(save: Save): void {
  if (!save.egg && save.eggsOwed > 0 && unhatched(save).length > 0) {
    save.egg = { warmth: 0 };
    save.eggsOwed -= 1;
  }
}

/** One egg hatches per day: a warm egg waits for tomorrow when one has already hatched today. */
export function hatchedToday(save: Save): boolean {
  const day = dayKey();
  return EGG_ORDER.some((id) => save.monsters[id]?.friend && save.monsters[id]?.friendOn === day);
}

export function eggReady(save: Save): boolean {
  return !!save.egg && save.egg.warmth >= EGG_WARMTH && !hatchedToday(save);
}

/** Hatch the warm egg into the next egg monster. */
export function hatch(save: Save): SpeciesId | null {
  if (!eggReady(save)) return null;
  const next = unhatched(save)[0];
  if (!next) return null;
  befriend(save, next);
  save.egg = null;
  settleEgg(save);
  return next;
}

// ---- bonds ----------------------------------------------------------------

const BOND_STEPS = [0, 5, 12, 22, 36];
const BOND_TITLES = ['New friend', 'Good friend', 'Great friend', 'Best friend', 'Super friend'];
export const PETS_PER_DAY = 3;

export function bondLevel(points: number): { level: number; title: string } {
  let level = 1;
  for (let i = 1; i < BOND_STEPS.length; i++) if (points >= (BOND_STEPS[i] as number)) level = i + 1;
  return { level, title: BOND_TITLES[level - 1] as string };
}

/** Returns the new level when the bond just levelled up. */
function addBond(save: Save, id: SpeciesId, points: number): number | null {
  const m = monster(save, id);
  const before = bondLevel(m.bond ?? 0).level;
  m.bond = (m.bond ?? 0) + points;
  const after = bondLevel(m.bond).level;
  return after > before ? after : null;
}

/** Petting adds a little bond, a few times a day. It always gets a happy reaction. */
export function pet(save: Save, id: SpeciesId): { counted: boolean; bondUp: number | null } {
  const m = monster(save, id);
  const key = dayKey();
  const pets = m.petsByDay ?? {};
  const count = pets[key] ?? 0;
  if (count >= PETS_PER_DAY) return { counted: false, bondUp: null };
  m.petsByDay = { [key]: count + 1 };
  return { counted: true, bondUp: addBond(save, id, 1) };
}

// ---- feeding and playing ---------------------------------------------------

export const FEEDS_PER_DAY = 3;

/**
 * Feed one earned berry. The first few each day deepen the bond; after that
 * the monster is full but still eats happily. Nothing is taken without a berry.
 */
export function feed(save: Save, id: SpeciesId): { ok: boolean; full: boolean; bondUp: number | null } {
  if ((save.berries ?? 0) < 1) return { ok: false, full: false, bondUp: null };
  save.berries = (save.berries ?? 0) - 1;
  const m = monster(save, id);
  const key = dayKey();
  const count = m.fedByDay?.[key] ?? 0;
  m.fedByDay = { [key]: count + 1 };
  if (count >= FEEDS_PER_DAY) return { ok: true, full: true, bondUp: null };
  return { ok: true, full: count + 1 >= FEEDS_PER_DAY, bondUp: addBond(save, id, 1) };
}

export function fedToday(save: Save, id: SpeciesId): number {
  return Math.min(FEEDS_PER_DAY, save.monsters[id]?.fedByDay?.[dayKey()] ?? 0);
}

/** A game of catch. Free and repeatable; the first one each day deepens the bond. */
export function playBall(save: Save, id: SpeciesId): { bondUp: number | null } {
  const m = monster(save, id);
  const key = dayKey();
  if (m.ballDay === key) return { bondUp: null };
  m.ballDay = key;
  return { bondUp: addBond(save, id, 2) };
}

// ---- wishes ---------------------------------------------------------------

export const WISHES_PER_DAY = 2;

/**
 * Once a day, two friends ask to play. This is the review schedule in
 * disguise: first the friend whose skill has gone worst lately, then the ones
 * she has played with least.
 */
export function ensureWishes(save: Save, rng: () => number = Math.random): void {
  const day = today(save);
  if (day.wishes) return;
  const pool = friends(save)
    .map((m) => ({ id: m.id, rounds: m.rounds, tie: rng() }))
    .sort((x, y) => x.rounds - y.rounds || x.tie - y.tie);
  if (pool.length < 2) return; // the very first session has its own path
  const weak = weakestFriend(save);
  const order = weak ? [weak, ...pool.map((w) => w.id).filter((id) => id !== weak)] : pool.map((w) => w.id);
  day.wishes = order.slice(0, WISHES_PER_DAY).map((id) => ({ id, done: false }));
}

export function wishing(save: Save, id: SpeciesId): boolean {
  return (today(save).wishes ?? []).some((w) => w.id === id && !w.done);
}

// ---- stickers -------------------------------------------------------------

export interface Sticker {
  id: string;
  name: string;
  mark: string;
  tone: 'add' | 'sub' | 'mul' | 'div' | 'gold' | 'mint';
  how: string;
  earned: (s: Save) => boolean;
}

function kindCount(save: Save, kind: Kind): number {
  return save.exprLog.filter((e) => e.correct && e.kind === kind && e.hearts > 0).length;
}

function tripCount(save: Save, type: Delivery, firstTryOnly = false): number {
  return save.tripLog.filter((t) => t.type === type && (!firstTryOnly || t.firstTry)).length;
}

function fracCount(save: Save, kind: FracKind): number {
  return (save.fracLog ?? []).filter((f) => f.kind === kind).length;
}

function mostWays(save: Save): number {
  let best = 0;
  for (const m of Object.values(save.monsters)) {
    for (const ways of Object.values(m?.ways ?? {})) best = Math.max(best, ways.length);
  }
  return best;
}

/** True when one number has been made with all four operations. */
function fourWays(save: Save): boolean {
  for (const m of Object.values(save.monsters)) {
    for (const ways of Object.values(m?.ways ?? {})) {
      if (new Set(ways.map((w) => w.op)).size === 4) return true;
    }
  }
  return false;
}

export const STICKERS: Sticker[] = [
  { id: 'friend', name: 'First wild friend', mark: '♥', tone: 'gold', how: 'Make friends with a wild monster', earned: (s) => friends(s).length >= 2 },
  { id: 'plus', name: 'Plus pro', mark: '+', tone: 'add', how: 'Give 10 plus treats with real parts', earned: (s) => kindCount(s, 'add') >= 10 },
  { id: 'minus', name: 'Minus master', mark: '−', tone: 'sub', how: 'Give 10 minus treats', earned: (s) => kindCount(s, 'sub') >= 10 },
  { id: 'times', name: 'Times star', mark: '×', tone: 'mul', how: 'Give 10 times treats', earned: (s) => kindCount(s, 'mul') >= 10 },
  { id: 'share', name: 'Super sharer', mark: '÷', tone: 'div', how: 'Give 10 sharing treats', earned: (s) => kindCount(s, 'div') >= 10 },
  { id: 'ways', name: 'Six ways', mark: '6', tone: 'mint', how: 'Find 6 ways to make one number', earned: (s) => mostWays(s) >= 6 },
  { id: 'four', name: 'All four', mark: '4', tone: 'gold', how: 'Make one number with +, −, × and ÷', earned: fourWays },
  { id: 'pack', name: 'Crate packer', mark: '10', tone: 'add', how: 'Pack crates on 5 berry trips', earned: (s) => tripCount(s, 'addR') >= 5 },
  { id: 'open', name: 'Crate opener', mark: '10', tone: 'sub', how: 'Open crates on 5 berry trips', earned: (s) => tripCount(s, 'subR') >= 5 },
  { id: 'sharp', name: 'Sharp eyes', mark: '✓', tone: 'mint', how: 'Get 10 berry trips right the first time', earned: (s) => s.tripLog.filter((t) => t.firstTry).length >= 10 },
  { id: 'slice', name: 'Fair slicer', mark: '½', tone: 'gold', how: 'Name or build 10 fractions', earned: (s) => fracCount(s, 'name') >= 10 },
  { id: 'twin', name: 'Honey twins', mark: '=', tone: 'mint', how: 'Compare or match 8 pairs of honey bars', earned: (s) => fracCount(s, 'same') >= 8 },
  { id: 'stack', name: 'Honey stacker', mark: '×', tone: 'add', how: 'Solve 8 fraction times problems', earned: (s) => fracCount(s, 'times') >= 8 },
  { id: 'tray', name: 'Tray master', mark: '▦', tone: 'div', how: 'Find 8 pieces of a piece', earned: (s) => fracCount(s, 'tray') >= 8 },
  { id: 'grow', name: 'Evolved', mark: '★', tone: 'gold', how: 'Help a monster evolve', earned: (s) => friends(s).some((m) => m.stage >= 2) },
  { id: 'hatch', name: 'Egg hatcher', mark: '●', tone: 'mint', how: 'Hatch an egg', earned: (s) => EGG_ORDER.some((id) => isFriend(s, id)) },
  { id: 'best', name: 'Best friends', mark: '♥', tone: 'sub', how: 'Become best friends with a monster', earned: (s) => friends(s).some((m) => bondLevel(m.bond ?? 0).level >= 4) },
  { id: 'eight', name: 'Full meadow', mark: '8', tone: 'mul', how: 'Have 8 monster friends', earned: (s) => friends(s).length >= 8 },
  { id: 'days3', name: 'Three days', mark: '3', tone: 'div', how: 'Play on 3 different days', earned: (s) => daysPlayed(s).length >= 3 },
  { id: 'days7', name: 'Seven days', mark: '7', tone: 'gold', how: 'Play on 7 different days', earned: (s) => daysPlayed(s).length >= 7 },
  // Matches won. At most two matches a day, so the last of these is a month of playing or more.
  { id: 'match1', name: 'First match', mark: '1', tone: 'mint', how: 'Win your first match', earned: (s) => (s.matchWins ?? 0) >= 1 },
  { id: 'match5', name: 'Five matches', mark: '5', tone: 'add', how: 'Win 5 matches', earned: (s) => (s.matchWins ?? 0) >= 5 },
  { id: 'match10', name: 'Ten matches', mark: '10', tone: 'sub', how: 'Win 10 matches', earned: (s) => (s.matchWins ?? 0) >= 10 },
  { id: 'match20', name: 'Twenty matches', mark: '20', tone: 'mul', how: 'Win 20 matches', earned: (s) => (s.matchWins ?? 0) >= 20 },
  { id: 'match50', name: 'Match champion', mark: '50', tone: 'gold', how: 'Win 50 matches', earned: (s) => (s.matchWins ?? 0) >= 50 },
];

/** Award any stickers earned since the last check. Each is returned once. */
export function claimStickers(save: Save): Sticker[] {
  return newStickers(save);
}

function newStickers(save: Save): Sticker[] {
  const fresh = STICKERS.filter((st) => !save.stickers.includes(st.id) && st.earned(save));
  for (const st of fresh) save.stickers.push(st.id);
  return fresh;
}

// ---- events ---------------------------------------------------------------

export interface Gain {
  levelUp: number | null;
  /** The egg just became warm enough to hatch. */
  eggWarm: boolean;
  newEgg: boolean;
  stickers: Sticker[];
  wishGranted: boolean;
  bondUp: { id: SpeciesId; level: number; title: string } | null;
}

function earn(save: Save, xp: number, warmth: number, berries: number): Gain {
  save.berries = (save.berries ?? 0) + berries;
  const before = levelFor(save.xp);
  save.xp += xp;
  const after = levelFor(save.xp);
  const hadEgg = !!save.egg;
  if (after > before) save.eggsOwed += after - before;
  const wasWarm = eggReady(save);
  if (save.egg) save.egg.warmth = Math.min(EGG_WARMTH, save.egg.warmth + warmth);
  settleEgg(save);
  return {
    levelUp: after > before ? after : null,
    eggWarm: !wasWarm && eggReady(save),
    newEgg: !hadEgg && !!save.egg,
    stickers: newStickers(save),
    wishGranted: false,
    bondUp: null,
  };
}

/** A correct treat that earned hearts. */
export function onTreat(save: Save, hearts: number): Gain {
  return earn(save, hearts, 1, 1);
}

/** A finished berry trip. */
export function onTrip(save: Save, firstTry: boolean): Gain {
  return earn(save, firstTry ? 3 : 1, 1, firstTry ? 2 : 1);
}

/** A finished round with a monster: bond, and its wish if it had one. */
export function onRound(save: Save, id: SpeciesId): Gain {
  const wish = (today(save).wishes ?? []).find((w) => w.id === id && !w.done);
  if (wish) wish.done = true;
  const level = addBond(save, id, wish ? 5 : 3);
  const gain = earn(save, wish ? 5 : 0, wish ? 2 : 0, 3);
  return {
    ...gain,
    wishGranted: !!wish,
    bondUp: level ? { id, level, title: bondLevel(monster(save, id).bond ?? 0).title } : null,
  };
}

// ---- stars for climbing ----------------------------------------------------

/** The highest level reached on a skill so far. Saves from before this was kept read it from the problem logs. */
function bestSoFar(save: Save, skill: string): number {
  const kept = save.best?.[skill];
  if (kept !== undefined) return kept;
  const [place, kind] = skill.split('.');
  const rungs: Array<number | undefined> =
    place === 'trip'
      ? save.tripLog.filter((t) => t.type === kind).map((t) => t.rung)
      : place === 'frac'
        ? (save.fracLog ?? []).filter((f) => f.kind === kind).map((f) => f.rung)
        : place === 'count'
          ? (save.countLog ?? []).filter((c) => c.kind === kind).map((c) => c.rung)
          : place === 'upper'
            ? (save.upperLog ?? []).filter((u) => u.kind === kind).map((u) => u.rung)
            : [];
  return Math.max(-1, ...rungs.filter((r): r is number => r !== undefined));
}

/**
 * She moved from one level of a skill to another. When that is higher than
 * she has ever been on it, the friend she is playing with earns a bonus star,
 * given at the end of the round. Climbing back after a step down pays nothing.
 * Returns true for a new best.
 */
export function climbed(save: Save, skill: string, from: number, to: number, id: SpeciesId): boolean {
  const best = Math.max(bestSoFar(save, skill), from);
  save.best = { ...(save.best ?? {}), [skill]: Math.max(best, to) };
  if (to <= best) return false;
  const m = monster(save, id);
  m.climbStars = (m.climbStars ?? 0) + 1;
  return true;
}

/** The toast for moving up: a bonus star is on its way when the level is a new best. */
export function levelUpLine(best: boolean, name: string, words = 'problems'): GainLine {
  return best
    ? { text: `Level up! ${name} gets a bonus star.`, kind: 'level', clip: 't_best' }
    : { text: `Level up! The ${words} grow with you.`, kind: 'level', clip: 't_harder' };
}

/**
 * The star for a finished round with a friend, plus the bonus stars waiting
 * from new levels. Bonus stars do not count toward the daily limits.
 */
export function roundStars(save: Save, id: SpeciesId): { result: StarResult; bonus: number } {
  const m = monster(save, id);
  const bonus = m.climbStars ?? 0;
  m.climbStars = 0;
  let result = giveStar(save, id);
  for (let i = 0; i < bonus; i++) {
    const r = giveStar(save, id, { bonus: true });
    if (r === 'grown') result = 'grown';
    else if (result === 'full-today') result = 'star';
  }
  return { result, bonus };
}

/** The line on a round's party that explains a bonus star. */
export function bonusLines(bonus: number): string[] {
  if (bonus <= 0) return [];
  return [bonus === 1 ? 'Plus a bonus star for a new level!' : `Plus ${bonus} bonus stars for new levels!`];
}

/** Short lines for the toasts, in the order they should appear. */
export interface GainLine {
  text: string;
  kind: 'sticker' | 'level' | 'egg' | 'bond' | 'wish';
  sticker?: Sticker;
  /** Voice clip to play with the banner. */
  clip?: string;
}

export function gainLines(gain: Gain): GainLine[] {
  const lines: GainLine[] = [];
  if (gain.wishGranted) lines.push({ text: 'Wish granted!', kind: 'wish', clip: 't_wish' });
  if (gain.bondUp) lines.push({ text: `${SPECIES[gain.bondUp.id].name}: ${gain.bondUp.title}!`, kind: 'bond', clip: 't_bond' });
  if (gain.levelUp) lines.push({ text: `Ranger level ${gain.levelUp}!`, kind: 'level', clip: 't_level' });
  if (gain.newEgg) lines.push({ text: 'You got a mystery egg!', kind: 'egg', clip: 't_egg' });
  if (gain.eggWarm) lines.push({ text: 'Your egg is ready to hatch!', kind: 'egg', clip: 'egg_ready' });
  for (const st of gain.stickers) lines.push({ text: `New sticker: ${st.name}`, kind: 'sticker', sticker: st, clip: 't_sticker' });
  return lines;
}
