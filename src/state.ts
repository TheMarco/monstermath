import {
  CANYON_ORDER,
  GRASS_ORDER,
  HOLLOW_ORDER,
  SPECIES,
  STARS_PER_DAY,
  STARS_TO_EVOLVE,
  STARS_TO_GROW,
  STARTERS,
  type SpeciesId,
  type Stage,
} from './data/monsters';
import type { Expr, Kind, Op } from './math/expr';
import type { FracError, FracKind } from './math/fractions';
import type { Delivery, ErrorPattern } from './math/regroup';

const KEY = 'monstermath.save.v1';
const LOG_LIMIT = 3000;

/** Replaceable clock so tests can move through days. */
export const clock = { now: (): Date => new Date() };

export function dayKey(d: Date = clock.now()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface Round {
  target: number;
  hearts: number;
  found: Expr[];
  hints: number;
  /** Tries in this round that did not make the number. */
  misses?: number;
}

export interface MonsterState {
  id: SpeciesId;
  friend: boolean;
  metOn: string;
  friendOn?: string;
  nickname?: string;
  stage: Stage;
  stars: number;
  starsByDay: Record<string, number>;
  /** Finished rounds: treats rounds for grass monsters, trip rounds for canyon ones. */
  rounds: number;
  /** Every way found, by target number. */
  ways: Record<string, Expr[]>;
  /** A treats round in progress. */
  current?: Round;
  /** Canyon: progress toward friendship, in half steps (a corrected trip counts half). */
  trips: number;
  /** Canyon: trips done in the play round in progress. */
  roundTrips: number;
  /** Canyon: current problem size (0 easiest to 2) and the streak that moves it. */
  step?: number;
  run?: number;
  /** The skill this monster owns: marks for her last few problems (see ladder.ts). */
  recent?: number[];
  /** Treats: which pool of numbers this monster asks from, and the streak of clean rounds. */
  pool?: number;
  poolRun?: number;
  /** Friendship points from playing, petting and granted wishes. */
  bond?: number;
  petsByDay?: Record<string, number>;
  /** Berries fed and ball games played, by day. */
  fedByDay?: Record<string, number>;
  ballDay?: string;
  /** The charm floating over its head, when it wears one. */
  charm?: string;
}

export interface ExprEvent {
  t: number;
  day: string;
  monster: SpeciesId;
  target: number;
  a: number;
  op: Op;
  b: number;
  correct: boolean;
  kind?: Kind;
  hearts: number;
  hinted: boolean;
}

export interface TripEvent {
  t: number;
  day: string;
  monster: SpeciesId;
  type: Delivery;
  a: number;
  b: number;
  /** Every answer checked, in order. The last one is correct. */
  answers: number[];
  firstTry: boolean;
  errors: ErrorPattern[];
  usedBlocks: boolean;
  /** The rung she was on, and whether this was a stretch problem from the rung above. */
  rung?: number;
  stretch?: boolean;
  /** She asked for, or was given, the step-by-step walkthrough. */
  helped?: boolean;
}

export interface FracEvent {
  t: number;
  day: string;
  monster: SpeciesId;
  kind: FracKind;
  /** The problem in short text: "3 × 1/4", "1/2 or 2/4", "build 3/4". */
  text: string;
  /** Every answer checked, in order. The last one is correct. */
  answers: string[];
  firstTry: boolean;
  errors: FracError[];
  rung?: number;
  stretch?: boolean;
  /** She asked for, or was given, the counting help. */
  helped?: boolean;
}

export interface PlacementItem {
  id: string;
  prompt: string;
  expected: string;
  given: string | null;
  correct: boolean;
  unsure: boolean;
}

export interface DayState {
  treats: number;
  trips: number;
  wins: number;
  rewarded: boolean;
  /** Friends who asked to play today. */
  wishes?: Array<{ id: SpeciesId; done: boolean }>;
  /** She said good night: the meadow sleeps until she wakes it. */
  asleep?: boolean;
}

export interface Save {
  version: 1;
  started: string;
  starter: SpeciesId | null;
  introDone: boolean;
  placement: PlacementItem[];
  monsters: Partial<Record<SpeciesId, MonsterState>>;
  exprLog: ExprEvent[];
  tripLog: TripEvent[];
  days: Record<string, DayState>;
  settings: { voice: boolean; sound: boolean; voiceName?: string };
  /** Trip types the placement check showed she can already do: fewer trips needed. */
  fast: Partial<Record<Delivery, boolean>>;
  seenTips: string[];
  /** Taught lessons: how often each was seen, and the last day. */
  lessons?: Record<string, { seen: number; lastDay: string }>;
  /** Intake: levels passed per strand, and the strand to resume at if she took a break. */
  intakeLevels?: Partial<Record<string, number>>;
  intakeAt?: number;
  /** Where each kind of berry trip starts, from the first-day check (0 easiest to 2). */
  startStep?: Partial<Record<Delivery, number>>;
  /** Ranger points: every heart and berry trip counts. */
  xp: number;
  /** The egg being warmed, and eggs earned but not yet in the nest. */
  egg: { warmth: number } | null;
  eggsOwed: number;
  stickers: string[];
  /** Berries earned by playing, spent on feeding monsters. */
  berries?: number;
  /** The friend who comes along as helper and teacher. Defaults to the starter. */
  buddy?: SpeciesId;
  /** Honey Hollow: every fraction problem she finished. */
  fracLog?: FracEvent[];
  /** Charms she owns, and decorations placed in the meadow. */
  charms?: string[];
  decor?: Array<{ id: string; x: number; y: number }>;
  /** The last day played before a long break that the game already eased off for. */
  easedFor?: string;
  /** Set on the grown-up page: every monster can be met, whatever the skills before it look like. */
  openAll?: boolean;
  /** 2 once problem sizes are rungs on the longer ladders. */
  ladder?: number;
}

export function freshSave(): Save {
  return {
    version: 1,
    started: dayKey(),
    starter: null,
    introDone: false,
    placement: [],
    monsters: {},
    exprLog: [],
    tripLog: [],
    days: {},
    settings: { voice: true, sound: true },
    fast: {},
    seenTips: [],
    xp: 0,
    egg: null,
    eggsOwed: 0,
    stickers: [],
    ladder: 2,
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSave(): Save {
  const raw = storage()?.getItem(KEY);
  if (!raw) return freshSave();
  try {
    const parsed = JSON.parse(raw) as Save;
    if (parsed.version !== 1) return freshSave();
    return toLadders({ ...freshSave(), ...parsed, ladder: parsed.ladder });
  } catch {
    return freshSave();
  }
}

/**
 * Saves from before the longer ladders kept three problem sizes per skill.
 * Put each one on the rung that holds the same problems.
 */
function toLadders(save: Save): Save {
  if (save.ladder === 2) return save;
  const plain = [2, 3, 4];
  const regroup = [1, 2, 3];
  const frac = [0, 2, 4];
  const at = (map: number[], old: number | undefined): number | undefined => (old === undefined ? undefined : (map[Math.max(0, Math.min(2, old))] as number));
  for (const m of Object.values(save.monsters)) {
    if (!m) continue;
    const sp = SPECIES[m.id];
    if (sp.habitat === 'canyon') m.step = at(sp.delivery === 'add' || sp.delivery === 'sub' ? plain : regroup, m.step);
    else if (sp.habitat === 'hollow') m.step = sp.frac === 'name' || sp.frac === 'same' ? at(frac, m.step) : m.step;
    m.run = 0;
  }
  if (save.startStep) {
    const old = save.startStep;
    save.startStep = { add: at(plain, old.add), addR: at(regroup, old.addR), sub: at(plain, old.sub), subR: at(regroup, old.subR) };
  }
  save.ladder = 2;
  return save;
}

export function persist(save: Save): void {
  if (save.exprLog.length > LOG_LIMIT) save.exprLog = save.exprLog.slice(-LOG_LIMIT);
  if (save.tripLog.length > LOG_LIMIT) save.tripLog = save.tripLog.slice(-LOG_LIMIT);
  if (save.fracLog && save.fracLog.length > LOG_LIMIT) save.fracLog = save.fracLog.slice(-LOG_LIMIT);
  try {
    storage()?.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage full or blocked: keep playing in memory */
  }
}

export function wipeSave(): void {
  storage()?.removeItem(KEY);
}

export function today(save: Save): DayState {
  const key = dayKey();
  let day = save.days[key];
  if (!day) {
    day = { treats: 0, trips: 0, wins: 0, rewarded: false };
    save.days[key] = day;
  }
  return day;
}

export function monster(save: Save, id: SpeciesId): MonsterState {
  let m = save.monsters[id];
  if (!m) {
    m = {
      id,
      friend: false,
      metOn: dayKey(),
      stage: 1,
      stars: 0,
      starsByDay: {},
      rounds: 0,
      ways: {},
      trips: 0,
      roundTrips: 0,
    };
    save.monsters[id] = m;
  }
  return m;
}

export function isFriend(save: Save, id: SpeciesId): boolean {
  return save.monsters[id]?.friend === true;
}

export function friends(save: Save): MonsterState[] {
  return Object.values(save.monsters).filter((m): m is MonsterState => !!m && m.friend);
}

export function displayName(save: Save, id: SpeciesId): string {
  return save.monsters[id]?.nickname?.trim() || SPECIES[id].name;
}

export function befriend(save: Save, id: SpeciesId): void {
  const m = monster(save, id);
  if (!m.friend) {
    m.friend = true;
    m.friendOn = dayKey();
  }
}

/** The grass monsters she can still meet, in teaching order, then the other starters. */
export function grassQueue(save: Save): SpeciesId[] {
  const others = STARTERS.filter((s) => s !== save.starter);
  return [...GRASS_ORDER, ...others].filter((id) => !isFriend(save, id));
}

export function canyonQueue(save: Save): SpeciesId[] {
  return CANYON_ORDER.filter((id) => !isFriend(save, id));
}

export function hollowQueue(save: Save): SpeciesId[] {
  return HOLLOW_ORDER.filter((id) => !isFriend(save, id));
}

export type StarResult = 'star' | 'grown' | 'full-today';

/** Give a growth star. Capped per day so that growing needs a return visit. */
export function giveStar(save: Save, id: SpeciesId, opts: { bonus?: boolean } = {}): StarResult {
  const m = monster(save, id);
  const key = dayKey();
  const todayCount = m.starsByDay[key] ?? 0;
  if (!opts.bonus && todayCount >= STARS_PER_DAY) return 'full-today';
  m.stars += 1;
  if (!opts.bonus) m.starsByDay[key] = todayCount + 1;
  if (m.stage === 1 && m.stars >= STARS_TO_GROW) {
    m.stage = 2;
    return 'grown';
  }
  if (m.stage === 2 && m.stars >= STARS_TO_EVOLVE) {
    m.stage = 3;
    return 'grown';
  }
  return 'star';
}

export function starsLeftToday(save: Save, id: SpeciesId): number {
  const m = save.monsters[id];
  if (!m) return STARS_PER_DAY;
  return Math.max(0, STARS_PER_DAY - (m.starsByDay[dayKey()] ?? 0));
}

/**
 * Pick the next target number for a treats round with this monster, from the
 * given pool. Numbers not done yet come first; when the pool is used up its
 * numbers come round again, so stepping down really does mean smaller numbers.
 */
export function nextTarget(save: Save, id: SpeciesId, rng: () => number = Math.random, pool = 0): number {
  const m = monster(save, id);
  const pools = SPECIES[id].pools;
  const from = pools[Math.max(0, Math.min(pools.length - 1, pool))] ?? [12];
  const unused = from.filter((n) => !m.ways[String(n)]);
  const choices = unused.length > 0 ? unused : from;
  return choices[Math.floor(rng() * choices.length)] as number;
}

export const DAILY_GOAL = { treats: 3, trips: 3, wins: 1 };

export function dailyDone(day: DayState): boolean {
  return day.treats >= DAILY_GOAL.treats && day.trips >= DAILY_GOAL.trips && day.wins >= DAILY_GOAL.wins;
}

export function daysPlayed(save: Save): string[] {
  return Object.keys(save.days)
    .filter((k) => {
      const d = save.days[k];
      return !!d && (d.treats > 0 || d.trips > 0 || d.wins > 0);
    })
    .sort();
}

/** The monster that helps and teaches: her chosen buddy, or her first friend. */
export function buddyOf(save: Save): SpeciesId {
  const chosen = save.buddy;
  if (chosen && save.monsters[chosen]?.friend) return chosen;
  return save.starter ?? 'puff';
}

/** Progress toward the next stage: stars earned in this stage, and stars it needs. */
export function growth(m: MonsterState): { have: number; need: number; final: boolean } {
  if (m.stage === 1) return { have: Math.min(m.stars, STARS_TO_GROW), need: STARS_TO_GROW, final: false };
  if (m.stage === 2) {
    const need = STARS_TO_EVOLVE - STARS_TO_GROW;
    return { have: Math.max(0, Math.min(m.stars - STARS_TO_GROW, need)), need, final: false };
  }
  return { have: 0, need: 0, final: true };
}

export function growthLine(m: MonsterState, name: string): string {
  const g = growth(m);
  if (g.final) return `${name} has ${m.stars} stars.`;
  const left = g.need - g.have;
  return `${left} more ${left === 1 ? 'star' : 'stars'} to evolve.`;
}
