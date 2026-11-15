import { ALL_SPECIES, CANYON_ORDER, GRASS_ORDER, HOLLOW_ORDER, SPECIES, type SpeciesId } from './data/monsters';
import { COUNT_ERROR_TEXT, COUNT_KINDS, COUNT_RUNG_TEXT, type CountError, type CountKind } from './math/count';
import { OP_SYMBOL, type Kind } from './math/expr';
import { FRAC_ERROR_TEXT, FRAC_KINDS, FRAC_RUNG_TEXT, type FracError, type FracKind } from './math/fractions';
import { ERROR_TEXT, RUNG_TEXT, type Delivery, type ErrorPattern } from './math/regroup';
import { ALL_STRANDS, belowFloor, reached, STRANDS } from './intake';
import { LESSONS } from './lessons';
import { daysPlayed, type Save } from './state';

/** Numbers for the grown-up page and the teacher summary. No judgement, only counts. */

export const KIND_TEXT: Record<Kind, string> = {
  identity: 'Easy ones (+0, −0, ×1, ÷1)',
  near: 'Near-easy (+1, −1)',
  add: 'Addition with real parts',
  sub: 'Subtraction',
  mul: 'Multiplication',
  div: 'Division',
};

export const TYPE_TEXT: Record<Delivery, string> = {
  add: 'Addition, no regrouping',
  addR: 'Addition with regrouping',
  sub: 'Subtraction, no regrouping',
  subR: 'Subtraction with regrouping',
};

export interface ExprStats {
  attempts: number;
  correct: number;
  hinted: number;
  byKind: Record<Kind, number>;
  easyShare: number | null;
}

export function exprStats(save: Save, sinceDay?: string): ExprStats {
  const log = save.exprLog.filter((e) => !sinceDay || e.day >= sinceDay);
  const byKind: Record<Kind, number> = { identity: 0, near: 0, add: 0, sub: 0, mul: 0, div: 0 };
  let correct = 0;
  let hinted = 0;
  for (const e of log) {
    if (e.hinted) hinted += 1;
    if (!e.correct || !e.kind) continue;
    correct += 1;
    byKind[e.kind] += 1;
  }
  const easy = byKind.identity + byKind.near;
  return { attempts: log.length, correct, hinted, byKind, easyShare: correct > 0 ? easy / correct : null };
}

export interface TripStats {
  type: Delivery;
  trips: number;
  firstTry: number;
  withBlocks: number;
  errors: Array<{ pattern: ErrorPattern; count: number }>;
}

export function tripStats(save: Save): TripStats[] {
  const types: Delivery[] = ['add', 'addR', 'sub', 'subR'];
  return types.map((type) => {
    const log = save.tripLog.filter((t) => t.type === type);
    const counts = new Map<ErrorPattern, number>();
    for (const t of log) for (const e of t.errors) counts.set(e, (counts.get(e) ?? 0) + 1);
    return {
      type,
      trips: log.length,
      firstTry: log.filter((t) => t.firstTry).length,
      withBlocks: log.filter((t) => t.usedBlocks).length,
      errors: [...counts.entries()].map(([pattern, count]) => ({ pattern, count })).sort((x, y) => y.count - x.count),
    };
  });
}

export const FRAC_TEXT: Record<FracKind, string> = {
  name: 'What a fraction is (naming and building)',
  same: 'Comparing and equal fractions',
  times: 'Fraction times a whole number',
  tray: 'Fraction times a fraction',
};

export interface FracStats {
  kind: FracKind;
  problems: number;
  firstTry: number;
  helped: number;
  errors: Array<{ pattern: FracError; count: number }>;
}

export function fracStats(save: Save): FracStats[] {
  return FRAC_KINDS.map((kind) => {
    const log = (save.fracLog ?? []).filter((f) => f.kind === kind);
    const counts = new Map<FracError, number>();
    for (const f of log) for (const e of f.errors) counts.set(e, (counts.get(e) ?? 0) + 1);
    return {
      kind,
      problems: log.length,
      firstTry: log.filter((f) => f.firstTry).length,
      helped: log.filter((f) => f.helped).length,
      errors: [...counts.entries()].map(([pattern, count]) => ({ pattern, count })).sort((x, y) => y.count - x.count),
    };
  });
}

export const COUNT_TEXT: Record<CountKind, string> = {
  count: 'Counting a set',
  more: 'Comparing',
  ten: 'Making ten and the teen numbers',
  place: 'Tens and ones',
};

export interface CountStats {
  kind: CountKind;
  problems: number;
  firstTry: number;
  helped: number;
  /** "2 of 5", and what that level covers. Empty when she has not played this idea. */
  level: string;
  working: string;
  errors: Array<{ pattern: CountError; count: number }>;
}

/** Early number work, one row per idea. */
export function countStats(save: Save): CountStats[] {
  return COUNT_KINDS.map((kind) => {
    const log = (save.countLog ?? []).filter((c) => c.kind === kind);
    const counts = new Map<CountError, number>();
    for (const c of log) for (const e of c.errors) counts.set(e, (counts.get(e) ?? 0) + 1);
    const step = save.early?.[kind]?.step;
    const rungs = COUNT_RUNG_TEXT[kind];
    return {
      kind,
      problems: log.length,
      firstTry: log.filter((c) => c.firstTry).length,
      helped: log.filter((c) => c.helped).length,
      level: step === undefined ? '' : `${step + 1} of ${rungs.length}`,
      working: step === undefined ? '' : (rungs[step] ?? ''),
      errors: [...counts.entries()].map(([pattern, count]) => ({ pattern, count })).sort((x, y) => y.count - x.count),
    };
  });
}

export function monsterStatus(save: Save, id: SpeciesId): string {
  const m = save.monsters[id];
  if (!m) return 'Not met';
  const pools = SPECIES[id].pools.length;
  const size =
    m.step !== undefined
      ? `, level ${m.step + 1}`
      : m.pool !== undefined && pools > 0
        ? `, number size ${m.pool + 1} of ${pools}`
        : '';
  if (!m.friend) return `Met, not yet a friend${size}`;
  return `Friend, stage ${m.stage} of 3 (${m.stars} stars)` + size;
}

/** Where a friend's own skill stands, for the medals on its card: level 1 is the first. */
export function skillLevel(save: Save, id: SpeciesId): { have: number; of: number } | null {
  const m = save.monsters[id];
  const sp = SPECIES[id];
  if (!m) return null;
  if (sp.habitat === 'canyon' && sp.delivery) return { have: (m.step ?? save.startStep?.[sp.delivery] ?? 0) + 1, of: RUNG_TEXT[sp.delivery].length };
  if (sp.habitat === 'hollow' && sp.frac) return { have: (m.step ?? 0) + 1, of: FRAC_RUNG_TEXT[sp.frac].length };
  if (m.pool !== undefined && sp.pools.length > 0) return { have: m.pool + 1, of: sp.pools.length };
  return null;
}

export interface LevelRow {
  skill: string;
  monster: string;
  /** "3 of 6", or a note that she has not started. */
  level: string;
  working: string;
  /** Share of her recent problems of this kind that were right the first time. */
  recent: string;
}

/** Where she is now on every ladder: one row per skill. */
export function levelRows(save: Save): LevelRow[] {
  const rows: LevelRow[] = [];
  const rate = (marks: boolean[]): string => {
    const last = marks.slice(-8);
    return last.length === 0 ? 'no problems yet' : `${last.filter(Boolean).length} of last ${last.length} right first try`;
  };
  for (const id of GRASS_ORDER) {
    const m = save.monsters[id];
    const pools = SPECIES[id].pools;
    const pool = m?.pool;
    const from = pool !== undefined ? (pools[pool] ?? []) : [];
    rows.push({
      skill: SPECIES[id].skill,
      monster: SPECIES[id].name,
      level: pool === undefined ? 'not started' : `${pool + 1} of ${pools.length}`,
      working: from.length ? `Makes numbers from ${Math.min(...from)} to ${Math.max(...from)}` : '',
      recent: rate(save.exprLog.filter((e) => e.monster === id).map((e) => e.correct && !e.hinted)),
    });
  }
  for (const id of CANYON_ORDER) {
    const type = SPECIES[id].delivery as Delivery;
    const rung = save.monsters[id]?.step ?? save.startStep?.[type];
    const texts = RUNG_TEXT[type];
    rows.push({
      skill: TYPE_TEXT[type],
      monster: SPECIES[id].name,
      level: rung === undefined ? 'not started' : `${rung + 1} of ${texts.length}`,
      working: rung === undefined ? '' : (texts[rung] ?? ''),
      recent: rate(save.tripLog.filter((t) => t.type === type).map((t) => t.firstTry)),
    });
  }
  for (const id of HOLLOW_ORDER) {
    const kind = SPECIES[id].frac as FracKind;
    const rung = save.monsters[id]?.step;
    const texts = FRAC_RUNG_TEXT[kind];
    rows.push({
      skill: FRAC_TEXT[kind],
      monster: SPECIES[id].name,
      level: rung === undefined ? 'not started' : `${rung + 1} of ${texts.length}`,
      working: rung === undefined ? '' : (texts[rung] ?? ''),
      recent: rate((save.fracLog ?? []).filter((f) => f.kind === kind).map((f) => f.firstTry)),
    });
  }
  return rows;
}

export interface IntakeRow {
  strand: string;
  reached: string;
  next: string;
}

/** One row per strand: the highest level passed, and the level that stopped her. */
export function intakeRows(save: Save): IntakeRow[] {
  const levels = save.intakeLevels ?? {};
  return ALL_STRANDS.filter((s) => levels[s.id] !== undefined).map((s) => {
    const info = reached(s, levels[s.id] ?? 0);
    return { strand: s.name, reached: info.reached, next: info.next ?? 'Passed every level in the check' };
  });
}

/** Strands where she is below the easiest thing the game offers. */
export function intakeWarning(save: Save): string | null {
  if (!save.intakeLevels) return null;
  const low = belowFloor(save.intakeLevels);
  if (low.length === 0) return null;
  const names = low.map((id) => (id === 'add' ? 'addition' : 'subtraction')).join(' and ');
  return `In ${names} the check stopped before sums within 10. The game starts there, with berries to count one by one. If that stays hard, counting practice with real objects comes first, which a screen cannot replace.`;
}

/** Strands where she passed every level of the check: the game has little new to teach there. */
export function intakeCeiling(save: Save): string | null {
  const levels = save.intakeLevels;
  if (!levels) return null;
  const top = STRANDS.filter((s) => (levels[s.id] ?? 0) >= s.levels.length);
  if (top.length === 0) return null;
  if (top.length === STRANDS.length) {
    return 'Every topic of the check was passed in full. The hardest work in this game is about the end of grade 3, with fractions reaching into grade 4, so it has little new to teach here. What is left is multiplying a fraction by a fraction and the top one or two levels of each skill; after that it is practice.';
  }
  const names = top.map((s) => s.name.toLowerCase());
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `The check was passed in full in ${list}. The game has little new to teach in ${names.length === 1 ? 'that topic' : 'those topics'}: expect practice there, and new learning in the others.`;
}

/** How often each taught lesson has been seen, and how often she needed the step-by-step help. */
export function tutoringRows(save: Save): Array<{ lesson: string; teaches: string; seen: number }> {
  return Object.values(LESSONS).map((l) => ({ lesson: l.title, teaches: l.teaches, seen: save.lessons?.[l.id]?.seen ?? 0 }));
}

export function walkthroughCount(save: Save): number {
  return save.tripLog.filter((t) => t.helped).length;
}

function pct(part: number, whole: number): string {
  return whole === 0 ? 'n/a' : `${Math.round((part / whole) * 100)}%`;
}

export function daysAgo(n: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Plain text a parent can paste into an email to the teacher. */
export function teacherSummary(save: Save): string {
  const days = daysPlayed(save);
  const all = exprStats(save);
  const lines: string[] = [];
  lines.push(save.name ? `MonsterMath progress summary for ${save.name}` : 'MonsterMath progress summary');
  lines.push(`Days played: ${days.length}${days.length ? ` (first ${days[0]}, latest ${days[days.length - 1]})` : ''}`);
  lines.push('');
  lines.push('Current level on each skill ladder:');
  for (const row of levelRows(save)) {
    lines.push(`  ${row.skill}: level ${row.level}${row.working ? `. ${row.working}` : ''}. ${row.recent}.`);
  }
  lines.push('');
  lines.push('Number sentences (make a given number):');
  lines.push(`  Correct sentences: ${all.correct} of ${all.attempts} tries. Hints used: ${all.hinted}.`);
  for (const kind of Object.keys(KIND_TEXT) as Kind[]) {
    lines.push(`  ${KIND_TEXT[kind]}: ${all.byKind[kind]}`);
  }
  if (all.easyShare !== null) lines.push(`  Share of easy sentences: ${Math.round(all.easyShare * 100)}%`);
  const recent = save.exprLog.filter((e) => e.correct).slice(-12);
  if (recent.length) {
    lines.push(`  Latest: ${recent.map((e) => `${e.a} ${OP_SYMBOL[e.op]} ${e.b} = ${e.target}`).join(', ')}`);
  }
  lines.push('');
  lines.push('2-digit addition and subtraction:');
  for (const s of tripStats(save)) {
    lines.push(`  ${TYPE_TEXT[s.type]}: ${s.trips} problems, ${pct(s.firstTry, s.trips)} right on the first try, blocks used on ${s.withBlocks}.`);
    for (const e of s.errors) lines.push(`    ${e.count}x ${ERROR_TEXT[e.pattern]}`);
  }
  lines.push('');
  lines.push('Fractions (honey bars):');
  for (const s of fracStats(save)) {
    lines.push(`  ${FRAC_TEXT[s.kind]}: ${s.problems} problems, ${pct(s.firstTry, s.problems)} right on the first try, counting help on ${s.helped}.`);
    for (const e of s.errors) lines.push(`    ${e.count}x ${FRAC_ERROR_TEXT[e.pattern]}`);
  }
  if ((save.countLog ?? []).length > 0) {
    lines.push('');
    lines.push('Early numbers (counting, comparing, ten, tens and ones):');
    for (const s of countStats(save)) {
      if (s.problems === 0) continue;
      lines.push(`  ${COUNT_TEXT[s.kind]}: level ${s.level} (${s.working}), ${s.problems} problems, ${pct(s.firstTry, s.problems)} right on the first try, counting help on ${s.helped}.`);
      for (const e of s.errors) lines.push(`    ${e.count}x ${COUNT_ERROR_TEXT[e.pattern]}`);
    }
  }
  lines.push('');
  lines.push('Skills by monster:');
  for (const id of ALL_SPECIES) {
    lines.push(`  ${SPECIES[id].name} (${SPECIES[id].skill}): ${monsterStatus(save, id)}`);
  }
  const rows = intakeRows(save);
  if (rows.length) {
    lines.push('');
    lines.push('First-day check, by strand:');
    for (const row of rows) lines.push(`  ${row.strand}: reached "${row.reached}". Stopped at: ${row.next}.`);
  }
  for (const note of [intakeWarning(save), intakeCeiling(save)]) {
    if (note) lines.push('', `Note: ${note}`);
  }
  if (save.placement.length) {
    lines.push('');
    lines.push('First-day check, every question:');
    for (const p of save.placement) {
      lines.push(`  ${p.prompt}: ${p.unsure ? 'not sure' : p.given} (${p.correct ? 'correct' : `expected ${p.expected}`})`);
    }
  }
  return lines.join('\n');
}

export { pct };
