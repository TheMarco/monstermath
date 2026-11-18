import {
  CANYON_ORDER,
  GRASS_ORDER,
  HOLLOW_ORDER,
  EARLY_ORDER,
  UPPER_ORDER,
  SPECIES,
  STARS_PER_DAY,
  STARS_TO_EVOLVE,
  STARS_TO_GROW,
  STARTERS,
  type SpeciesId,
  type Stage,
} from './data/monsters';
import type { CountError, CountKind } from './math/count';
import type { Expr, Kind, Op, Treat } from './math/expr';
import type { FracError, FracKind } from './math/fractions';
import type { Delivery, ErrorPattern } from './math/regroup';
import type { UpperError, UpperKind } from './math/upper';

const KEY = 'monstermath.save.v1';
const PLAYERS_KEY = 'monstermath.players.v1';
const LOG_LIMIT = 3000;
const FIRST = 'p1';
export const NAME_MAX = 12;

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
  /** Her treats size when the round began, and whether the number came from the size above. */
  rung?: number;
  stretch?: boolean;
  /** Answers finished from a hint, "your turn" answers she then made alone, and ones that were let go. */
  helped?: number;
  solo?: number;
  dropped?: number;
  /** The hint on screen: the number and sign it filled in. */
  hint?: { give: number; op: Op };
  /** After an answer made with a hint: one more of her own, without the hint's number. Null kind means any kind. */
  turn?: { kind: Kind | null; avoid: number; misses: number };
}

/** Where she is on one treats ladder: the size of the numbers, and how recent rounds went. */
export interface TreatProgress {
  rung: number;
  recent: number[];
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
  /** Problems in a row where the answer had to be shown. */
  shownRun?: number;
  /** Treats, before sizes were shared: this monster's own pool and streak. Read once to carry the size over. */
  pool?: number;
  poolRun?: number;
  /** Bonus stars for new best levels, given at the end of the next round with this monster. */
  climbStars?: number;
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

export interface CountEvent {
  t: number;
  day: string;
  monster: SpeciesId;
  kind: CountKind;
  /** The problem in short text: "Count 7 berries", "Build 34 with crates and berries". */
  text: string;
  /** Every answer checked, in order. The last one is correct. */
  answers: string[];
  firstTry: boolean;
  errors: CountError[];
  rung?: number;
  stretch?: boolean;
  /** She asked for, or was given, the counting help. */
  helped?: boolean;
}

export interface UpperEvent {
  t: number;
  day: string;
  monster: SpeciesId;
  kind: UpperKind;
  /** The problem in short text: "23 × 4", "17 ÷ 5", "1/2 + 1/4", "Read 0.47". */
  text: string;
  /** Every answer checked, in order. The last one is correct. */
  answers: string[];
  firstTry: boolean;
  errors: UpperError[];
  rung?: number;
  stretch?: boolean;
  /** She asked for, or was given, the picture help. */
  helped?: boolean;
}

/** Where she is on one early-number or Bakery ladder (see ladder.ts). */
export interface EarlyProgress {
  step?: number;
  recent?: number[];
  /** Problems in a row where the answer had to be shown. */
  shownRun?: number;
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
  /** The player's name, copied from the player list so a backup file carries it. */
  name?: string;
  started: string;
  starter: SpeciesId | null;
  introDone: boolean;
  placement: PlacementItem[];
  monsters: Partial<Record<SpeciesId, MonsterState>>;
  exprLog: ExprEvent[];
  tripLog: TripEvent[];
  days: Record<string, DayState>;
  settings: { voice: boolean; sound: boolean; voiceName?: string; music?: boolean };
  /** Trip types the placement check showed she can already do: fewer trips needed. */
  fast: Partial<Record<Delivery, boolean>>;
  seenTips: string[];
  /** Taught lessons: how often each was seen, and the last day. */
  lessons?: Record<string, { seen: number; lastDay: string }>;
  /** Intake: levels passed per strand, and the strand to resume at if she took a break. */
  intakeLevels?: Partial<Record<string, number>>;
  intakeAt?: number;
  /** Where a grown-up chose to begin the first-day check. Unset: the game finds out. */
  startAt?: 'early' | 'sums' | 'middle' | 'upper';
  /** The level a grown-up picked, 0 for kindergarten to 5. The check plan comes from startAt. */
  startGrade?: number;
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
  /** Early number work: her rung on each idea's ladder, and every problem she finished. */
  early?: Partial<Record<CountKind, EarlyProgress>>;
  countLog?: CountEvent[];
  /** The Bakery: her rung on each idea's ladder, and every problem she finished. */
  upper?: Partial<Record<UpperKind, EarlyProgress>>;
  upperLog?: UpperEvent[];
  /** Charms she owns, and decorations placed in the meadow. */
  charms?: string[];
  decor?: Array<{ id: string; x: number; y: number; away?: boolean }>;
  /** Meadow looks she owns, and the one in use. */
  themes?: string[];
  theme?: string;
  /** Friends called out to the meadow, latest first. The meadow shows only a few at a time. */
  out?: SpeciesId[];
  /** Friends she sent to rest; they stay out of the meadow until called out. */
  rest?: SpeciesId[];
  /** The last day played before a long break that the game already eased off for. */
  easedFor?: string;
  /** Set on the grown-up page: every monster can be met, whatever the skills before it look like. */
  openAll?: boolean;
  /** 2 once problem sizes are rungs on the longer ladders. */
  ladder?: number;
  /** Treats: one ladder per kind of treat, shared by every monster that asks for that kind. */
  treatLevels?: Partial<Record<Treat, TreatProgress>>;
  /** The highest level she has reached on each skill ("trip.add", "treat.any"), so a level pays a bonus star once. */
  best?: Record<string, number>;
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

/** One child playing in this browser. Each has a separate save. */
export interface Player {
  id: string;
  name: string;
}

interface Roster {
  current: string;
  list: Player[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function cleanName(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '';
}

/** The first player keeps the key the game used before it had players, so that save needs no move. */
function saveKey(id: string): string {
  return id === FIRST ? KEY : `${KEY}.${id}`;
}

function roster(): Roster {
  try {
    const raw: unknown = JSON.parse(storage()?.getItem(PLAYERS_KEY) ?? 'null');
    if (isObj(raw) && Array.isArray(raw.list)) {
      const list = (raw.list as unknown[])
        .filter((p): p is Record<string, unknown> => isObj(p) && typeof p.id === 'string' && /^[a-z0-9]+$/.test(p.id))
        .map((p, i) => ({ id: p.id as string, name: cleanName(p.name) || `Player ${i + 1}` }));
      const first = list[0];
      if (first) return { current: list.some((p) => p.id === raw.current) ? (raw.current as string) : first.id, list };
    }
  } catch {
    /* unreadable list: start over with the first player */
  }
  return { current: FIRST, list: [{ id: FIRST, name: 'Player 1' }] };
}

function writeRoster(r: Roster): void {
  try {
    storage()?.setItem(PLAYERS_KEY, JSON.stringify(r));
  } catch {
    /* storage full or blocked */
  }
}

export function players(): Player[] {
  return roster().list;
}

export function currentPlayer(): Player {
  const r = roster();
  return r.list.find((p) => p.id === r.current) ?? (r.list[0] as Player);
}

export function switchPlayer(id: string): void {
  const r = roster();
  if (!r.list.some((p) => p.id === id)) return;
  writeRoster({ ...r, current: id });
}

/** Adds a player with an empty save and makes them the current one. */
export function addPlayer(name: string): Player {
  const r = roster();
  const taken = new Set(r.list.map((p) => p.id));
  let id = `p${Date.now().toString(36)}`;
  while (taken.has(id) || id === FIRST) id += Math.floor(Math.random() * 36).toString(36);
  const player = { id, name: cleanName(name) || `Player ${r.list.length + 1}` };
  storage()?.removeItem(saveKey(id));
  writeRoster({ current: id, list: [...r.list, player] });
  return player;
}

export function renamePlayer(id: string, name: string): void {
  const clean = cleanName(name);
  if (!clean) return;
  const r = roster();
  writeRoster({ ...r, list: r.list.map((p) => (p.id === id ? { ...p, name: clean } : p)) });
}

/** Erases a player and their save. The last player cannot be removed, only reset. */
export function removePlayer(id: string): void {
  const r = roster();
  if (r.list.length < 2 || !r.list.some((p) => p.id === id)) return;
  storage()?.removeItem(saveKey(id));
  const list = r.list.filter((p) => p.id !== id);
  writeRoster({ current: r.current === id ? (list[0] as Player).id : r.current, list });
}

export function loadSave(id: string = currentPlayer().id): Save {
  const raw = storage()?.getItem(saveKey(id));
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
 * Reads a backup file made on the grown-up page. Returns null when the text is
 * not a MonsterMath save. Monsters this version does not know are dropped.
 */
export function readBackup(text: string): Save | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(raw) || raw.version !== 1 || !isObj(raw.monsters) || !isObj(raw.days) || !isObj(raw.settings)) return null;
  if (!Array.isArray(raw.exprLog) || !Array.isArray(raw.tripLog) || !Array.isArray(raw.placement)) return null;
  const parsed = raw as unknown as Save;
  const save: Save = { ...freshSave(), ...parsed, ladder: parsed.ladder };
  const monsters: Save['monsters'] = {};
  for (const [id, m] of Object.entries(raw.monsters)) {
    if (id in SPECIES && isObj(m)) monsters[id as SpeciesId] = { ...(m as unknown as MonsterState), id: id as SpeciesId };
  }
  save.monsters = monsters;
  if (typeof save.starter !== 'string' || !(save.starter in SPECIES) || !monsters[save.starter]) {
    save.starter = null;
    save.introDone = false;
  }
  if (typeof save.buddy !== 'string' || !monsters[save.buddy]) delete save.buddy;
  for (const key of ['treatLevels', 'best'] as const) {
    if (save[key] !== undefined && !isObj(save[key])) delete save[key];
  }
  for (const [fav, p] of Object.entries(save.treatLevels ?? {})) {
    if (!isObj(p) || typeof p.rung !== 'number' || !Array.isArray(p.recent)) delete save.treatLevels?.[fav as keyof typeof save.treatLevels];
  }
  for (const key of ['seenTips', 'stickers', 'charms', 'decor', 'fracLog', 'countLog', 'upperLog', 'out', 'rest', 'themes'] as const) {
    if (save[key] !== undefined && !Array.isArray(save[key])) delete save[key];
  }
  save.seenTips ??= [];
  save.stickers ??= [];
  save.xp = Number(save.xp) || 0;
  save.eggsOwed = Number(save.eggsOwed) || 0;
  const name = cleanName(raw.name);
  if (name) save.name = name;
  else delete save.name;
  return toLadders(save);
}

/**
 * Puts a backup into this browser without touching anyone's progress: it fills
 * the current player when they have not started yet, and otherwise becomes a
 * new player. Either way that player is now the current one.
 */
export function adoptBackup(save: Save): Player {
  const now = currentPlayer();
  const untouched = !loadSave(now.id).starter;
  const player = untouched ? now : addPlayer(save.name ?? '');
  if (untouched && save.name) renamePlayer(now.id, save.name);
  persist(save);
  return currentPlayer().id === player.id ? currentPlayer() : player;
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
  if (save.countLog && save.countLog.length > LOG_LIMIT) save.countLog = save.countLog.slice(-LOG_LIMIT);
  if (save.upperLog && save.upperLog.length > LOG_LIMIT) save.upperLog = save.upperLog.slice(-LOG_LIMIT);
  const player = currentPlayer();
  save.name = player.name;
  try {
    storage()?.setItem(saveKey(player.id), JSON.stringify(save));
  } catch {
    /* storage full or blocked: keep playing in memory */
  }
}

/** Erases the current player's progress. The player stays in the list. */
export function wipeSave(): void {
  storage()?.removeItem(saveKey(currentPlayer().id));
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
    callOut(save, id);
  }
}

/** How many friends stand in the meadow at once. The others rest and can be called out. */
export const MEADOW_MAX = 6;

/** Bring a friend out to the meadow, ahead of the ones called before. */
export function callOut(save: Save, id: SpeciesId): void {
  save.out = [id, ...(save.out ?? []).filter((x) => x !== id)].slice(0, MEADOW_MAX);
  save.rest = (save.rest ?? []).filter((x) => x !== id);
}

/** The buddy and the friends who asked to play today always stay out. */
export function canRest(save: Save, id: SpeciesId): boolean {
  if (buddyOf(save) === id) return false;
  return !(today(save).wishes ?? []).some((w) => w.id === id);
}

/** Send a friend to rest. It stays in until it is called out or asks to play. */
export function sendRest(save: Save, id: SpeciesId): void {
  if (!canRest(save, id)) return;
  save.out = (save.out ?? []).filter((x) => x !== id);
  save.rest = [...(save.rest ?? []).filter((x) => x !== id), id];
}

/**
 * Who is in the meadow today: the buddy, the friends who asked to play, the
 * friends called out or met most recently, then the rest in turns, a different
 * group each day, so every friend is seen again.
 */
export function meadowFriends(save: Save): SpeciesId[] {
  const all = friends(save)
    .sort((x, y) => (x.friendOn ?? '').localeCompare(y.friendOn ?? ''))
    .map((m) => m.id);
  if (all.length === 0) return [];
  const turn = Object.keys(save.days).length % all.length;
  const wishes = (today(save).wishes ?? []).map((w) => w.id);
  const fixed = [buddyOf(save), ...wishes];
  const resting = new Set((save.rest ?? []).filter((id) => !fixed.includes(id)));
  const order = [...fixed, ...(save.out ?? []), ...all.slice(turn), ...all.slice(0, turn)];
  return [...new Set(order)].filter((id) => all.includes(id) && !resting.has(id)).slice(0, MEADOW_MAX);
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

export function earlyQueue(save: Save): SpeciesId[] {
  return EARLY_ORDER.filter((id) => !isFriend(save, id));
}

export function upperQueue(save: Save): SpeciesId[] {
  return UPPER_ORDER.filter((id) => !isFriend(save, id));
}

export type StarResult = 'star' | 'grown' | 'full-today';

/** Give a growth star. Capped per day so that growing needs a return visit. */
export function giveStar(save: Save, id: SpeciesId, opts: { bonus?: boolean } = {}): StarResult {
  const m = monster(save, id);
  const key = dayKey();
  const todayCount = m.starsByDay[key] ?? 0;
  if (!opts.bonus && (todayCount >= STARS_PER_DAY || starsToday(save) >= DAY_STARS)) return 'full-today';
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

/** Stars a whole day can give, over all friends. After that everyone is sleepy: a soft end to the session. */
export const DAY_STARS = 6;

export function starsToday(save: Save): number {
  const key = dayKey();
  return friends(save).reduce((sum, m) => sum + (m.starsByDay[key] ?? 0), 0);
}

export function starsLeftToday(save: Save, id: SpeciesId): number {
  const m = save.monsters[id];
  if (!m) return STARS_PER_DAY;
  if (starsToday(save) >= DAY_STARS) return 0;
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
