import type { SpeciesId } from './data/monsters';
import type { BarPart } from './ui/models';

/**
 * Taught mini-lessons. Each follows the same shape: the helper shows it
 * ("watch me"), then one together with a single thing for her to do, then one
 * part on her own. A lesson cannot be failed: after two misses the answer is
 * shown and explained.
 */

export type LessonId = 'parts' | 'pack' | 'open' | 'rows' | 'share' | 'frac' | 'same' | 'ftimes' | 'ftray';

export type Scene =
  | { t: 'mat'; tens: number; ones: number; moreTens?: number; moreOnes?: number; caption?: string }
  | { t: 'array'; rows: number; cols: number; caption?: string }
  | { t: 'groups'; total: number; groups: number; caption?: string }
  | { t: 'dots'; n: number; caption?: string }
  | { t: 'bar'; parts: BarPart[]; caption?: string }
  | { t: 'fbar'; parts: number; shaded: number; caption?: string }
  | { t: 'fbars'; bars: Array<{ parts: number; shaded: number }>; caption?: string }
  | { t: 'tray'; cols: number; shaded: number; rows?: number; taken?: number; caption?: string };

export type Ask =
  | { kind: 'tap'; label: string }
  | { kind: 'number'; expected: number }
  | { kind: 'choice'; choices: string[]; expected: string };

export interface LessonStep {
  /** Voice clip key; the same text shows in the helper's bubble. */
  clip: string;
  text: string;
  scene: Scene;
  /** Absent on a "watch me" step: she just presses Next. */
  ask?: Ask;
}

export interface Lesson {
  id: LessonId;
  title: string;
  /** For the grown-up page. */
  teaches: string;
  steps: LessonStep[];
}

const bar = (a: number, b: number, bLabel = String(b)): BarPart[] => [
  { value: a, label: String(a), tone: 'a' },
  { value: b, label: bLabel, tone: 'b' },
];

export const LESSONS: Record<LessonId, Lesson> = {
  parts: {
    id: 'parts',
    title: 'Numbers are made of parts',
    teaches: 'A number can be split into parts in many ways (the idea behind writing varied expressions)',
    steps: [
      { clip: 'l_parts_1', text: 'Every number is made of parts. Here is 12.', scene: { t: 'bar', parts: [{ value: 12, label: '12', tone: 'a' }] } },
      { clip: 'l_parts_2', text: 'I can break it into 10 and 2. 10 + 2 makes 12.', scene: { t: 'bar', parts: bar(10, 2), caption: '10 + 2 = 12' } },
      { clip: 'l_parts_3', text: 'Or 6 and 6. A double!', scene: { t: 'bar', parts: bar(6, 6), caption: '6 + 6 = 12' } },
      {
        clip: 'l_parts_4',
        text: 'I can also start bigger and take some away. 15 − 3.',
        scene: { t: 'bar', parts: [{ value: 12, label: '12', tone: 'a' }, { value: 3, label: '−3', tone: 'gone' }], caption: '15 − 3 = 12' },
      },
      {
        clip: 'l_parts_5',
        text: 'Your turn. 7, and how many more, to make 12?',
        scene: { t: 'bar', parts: [{ value: 7, label: '7', tone: 'a' }, { value: 5, label: '?', tone: 'ghost' }], caption: '7 + ? = 12' },
        ask: { kind: 'number', expected: 5 },
      },
      { clip: 'l_parts_6', text: 'Monsters love treats with real parts. Try bigger parts!', scene: { t: 'bar', parts: bar(7, 5), caption: '7 + 5 = 12' } },
    ],
  },
  pack: {
    id: 'pack',
    title: 'Packing a crate',
    teaches: 'Regrouping in addition: ten ones become one ten (carrying)',
    steps: [
      { clip: 'l_pack_1', text: 'Watch me add. 27 berries, and 15 more.', scene: { t: 'mat', tens: 2, ones: 7, moreTens: 1, moreOnes: 5, caption: '27 + 15' } },
      { clip: 'l_pack_2', text: 'I put them together. 3 crates and 12 loose berries. Too many loose ones!', scene: { t: 'mat', tens: 3, ones: 12, caption: '27 + 15' } },
      { clip: 'l_pack_3', text: 'Ten loose berries fit in one crate. I pack ten. Now 4 crates and 2 loose.', scene: { t: 'mat', tens: 4, ones: 2, caption: '27 + 15' } },
      { clip: 'l_pack_4', text: '4 crates and 2 loose berries is 42.', scene: { t: 'mat', tens: 4, ones: 2, caption: '27 + 15 = 42' } },
      {
        clip: 'l_pack_5',
        text: 'Your turn. 36 and 18. Too many loose berries. Press "Pack 10".',
        scene: { t: 'mat', tens: 4, ones: 14, caption: '36 + 18' },
        ask: { kind: 'tap', label: 'Pack 10' },
      },
      {
        clip: 'l_pack_6',
        text: 'How many berries now? Count the crates, then the loose ones.',
        scene: { t: 'mat', tens: 5, ones: 4, caption: '36 + 18 = ?' },
        ask: { kind: 'number', expected: 54 },
      },
      { clip: 'l_pack_7', text: 'You packed a crate! Grown-ups call that regrouping.', scene: { t: 'mat', tens: 5, ones: 4, caption: '36 + 18 = 54' } },
    ],
  },
  open: {
    id: 'open',
    title: 'Opening a crate',
    teaches: 'Regrouping in subtraction: one ten becomes ten ones (borrowing)',
    steps: [
      { clip: 'l_open_1', text: 'Watch me take away. 52 berries. My friend eats 27.', scene: { t: 'mat', tens: 5, ones: 2, caption: '52 − 27' } },
      { clip: 'l_open_2', text: 'First the crates. 2 crates gone.', scene: { t: 'mat', tens: 3, ones: 2, caption: '52 − 27' } },
      { clip: 'l_open_3', text: 'Now 7 loose berries. But there are only 2! So I open a crate.', scene: { t: 'mat', tens: 2, ones: 12, caption: '52 − 27' } },
      { clip: 'l_open_4', text: 'Now I can take 7. 2 crates and 5 loose are left. 25.', scene: { t: 'mat', tens: 2, ones: 5, caption: '52 − 27 = 25' } },
      {
        clip: 'l_open_5',
        text: 'Your turn. 43 take away 18. One crate is gone. Now 8 loose, but there are only 3. Press "Open a crate".',
        scene: { t: 'mat', tens: 3, ones: 3, caption: '43 − 18' },
        ask: { kind: 'tap', label: 'Open a crate' },
      },
      {
        clip: 'l_open_6',
        text: 'Now 8 can go. How many berries are left?',
        scene: { t: 'mat', tens: 2, ones: 5, caption: '43 − 18 = ?' },
        ask: { kind: 'number', expected: 25 },
      },
      { clip: 'l_open_7', text: 'You opened a crate! That is how to take away when there are not enough loose ones.', scene: { t: 'mat', tens: 2, ones: 5, caption: '43 − 18 = 25' } },
    ],
  },
  rows: {
    id: 'rows',
    title: 'Rows of berries',
    teaches: 'Multiplication as equal rows (arrays), and that the order of the factors does not matter',
    steps: [
      { clip: 'l_rows_1', text: 'Look. Berries in rows. 3 rows, with 4 berries in each row.', scene: { t: 'array', rows: 3, cols: 4 } },
      { clip: 'l_rows_2', text: 'I could count 4, and 4, and 4. That is 12.', scene: { t: 'array', rows: 3, cols: 4, caption: '4 + 4 + 4 = 12' } },
      { clip: 'l_rows_3', text: 'A faster way to say it: 3 times 4. 3 rows of 4 makes 12.', scene: { t: 'array', rows: 3, cols: 4, caption: '3 × 4 = 12' } },
      { clip: 'l_rows_4', text: 'Turn it around: 4 rows of 3. Still 12!', scene: { t: 'array', rows: 4, cols: 3, caption: '4 × 3 = 12' } },
      {
        clip: 'l_rows_5',
        text: 'Your turn. 2 rows of 5. Which treat matches?',
        scene: { t: 'array', rows: 2, cols: 5 },
        ask: { kind: 'choice', choices: ['2 + 5', '2 × 5', '5 − 2'], expected: '2 × 5' },
      },
      { clip: 'l_rows_6', text: 'How many berries is 2 times 5?', scene: { t: 'array', rows: 2, cols: 5, caption: '2 × 5 = ?' }, ask: { kind: 'number', expected: 10 } },
      { clip: 'l_rows_7', text: 'That is multiplication: equal rows.', scene: { t: 'array', rows: 2, cols: 5, caption: '2 × 5 = 10' } },
    ],
  },
  share: {
    id: 'share',
    title: 'Sharing berries',
    teaches: 'Division as equal sharing, and its link to multiplication',
    steps: [
      { clip: 'l_share_1', text: '12 berries, and 3 friends. Everyone gets the same.', scene: { t: 'dots', n: 12 } },
      { clip: 'l_share_2', text: 'I share them out, one each, until they are gone. Each friend gets 4.', scene: { t: 'groups', total: 12, groups: 3 } },
      { clip: 'l_share_3', text: 'We say: 12 divided by 3 is 4.', scene: { t: 'groups', total: 12, groups: 3, caption: '12 ÷ 3 = 4' } },
      { clip: 'l_share_4', text: 'Look, it is the rows again! 3 rows of 4 is 12. Sharing is times, backwards.', scene: { t: 'array', rows: 3, cols: 4, caption: '3 × 4 = 12   and   12 ÷ 3 = 4' } },
      {
        clip: 'l_share_5',
        text: 'Your turn. 10 berries, 2 friends. Which treat matches?',
        scene: { t: 'groups', total: 10, groups: 2 },
        ask: { kind: 'choice', choices: ['10 − 2', '10 ÷ 2', '10 + 2'], expected: '10 ÷ 2' },
      },
      { clip: 'l_share_6', text: 'How many does each friend get?', scene: { t: 'groups', total: 10, groups: 2, caption: '10 ÷ 2 = ?' }, ask: { kind: 'number', expected: 5 } },
      { clip: 'l_share_7', text: 'That is division: sharing equally.', scene: { t: 'groups', total: 10, groups: 2, caption: '10 ÷ 2 = 5' } },
    ],
  },
  frac: {
    id: 'frac',
    title: 'Equal pieces',
    teaches: 'A fraction is equal pieces of one whole: the bottom number counts the pieces in the whole, the top number counts the pieces we have',
    steps: [
      { clip: 'l_frac_1', text: 'Here is one whole honey bar.', scene: { t: 'fbar', parts: 1, shaded: 0 } },
      { clip: 'l_frac_2', text: 'I cut it into four equal pieces. Every piece is the same size.', scene: { t: 'fbar', parts: 4, shaded: 0 } },
      { clip: 'l_frac_3', text: 'I fill one piece with honey. That is one fourth of the bar.', scene: { t: 'fbar', parts: 4, shaded: 1, caption: '1/4' } },
      {
        clip: 'l_frac_4',
        text: 'The bottom number says how many equal pieces are in the whole bar. The top number says how many are gold.',
        scene: { t: 'fbar', parts: 4, shaded: 1, caption: '1/4' },
      },
      { clip: 'l_frac_5', text: 'Now three pieces are gold. Three fourths.', scene: { t: 'fbar', parts: 4, shaded: 3, caption: '3/4' } },
      {
        clip: 'l_frac_6',
        text: 'Your turn. How many equal pieces are in this whole bar?',
        scene: { t: 'fbar', parts: 3, shaded: 2, caption: '?/?' },
        ask: { kind: 'number', expected: 3 },
      },
      { clip: 'l_frac_7', text: 'And how many pieces are gold?', scene: { t: 'fbar', parts: 3, shaded: 2, caption: '?/3' }, ask: { kind: 'number', expected: 2 } },
      { clip: 'l_frac_8', text: 'Two thirds! Two gold pieces, out of three.', scene: { t: 'fbar', parts: 3, shaded: 2, caption: '2/3' } },
    ],
  },
  same: {
    id: 'same',
    title: 'Same amount, different pieces',
    teaches: 'Equal fractions (1/2 = 2/4), and that more cuts make smaller pieces (1/4 is less than 1/2)',
    steps: [
      { clip: 'l_same_1', text: 'This honey bar is cut in two. One half is gold.', scene: { t: 'fbars', bars: [{ parts: 2, shaded: 1 }] } },
      {
        clip: 'l_same_2',
        text: 'This bar is the same size, but cut in four. Two fourths are gold.',
        scene: { t: 'fbars', bars: [{ parts: 2, shaded: 1 }, { parts: 4, shaded: 2 }] },
      },
      {
        clip: 'l_same_3',
        text: 'Look! The gold goes just as far. One half and two fourths are the same amount.',
        scene: { t: 'fbars', bars: [{ parts: 2, shaded: 1 }, { parts: 4, shaded: 2 }], caption: '1/2 = 2/4' },
      },
      {
        clip: 'l_same_4',
        text: 'Now one half, and one fourth. Four is a bigger number than two. But one fourth is a smaller piece!',
        scene: { t: 'fbars', bars: [{ parts: 2, shaded: 1 }, { parts: 4, shaded: 1 }] },
      },
      {
        clip: 'l_same_5',
        text: 'More cuts make smaller pieces.',
        scene: { t: 'fbars', bars: [{ parts: 2, shaded: 1 }, { parts: 4, shaded: 1 }, { parts: 8, shaded: 1 }] },
      },
      {
        clip: 'l_same_6',
        text: 'Your turn. Which one is more honey?',
        scene: { t: 'fbars', bars: [{ parts: 3, shaded: 1 }, { parts: 6, shaded: 1 }] },
        ask: { kind: 'choice', choices: ['1/3', '1/6'], expected: '1/3' },
      },
      { clip: 'l_same_7', text: 'Yes. Thirds are bigger pieces than sixths.', scene: { t: 'fbars', bars: [{ parts: 3, shaded: 1 }, { parts: 6, shaded: 1 }] } },
    ],
  },
  ftimes: {
    id: 'ftimes',
    title: 'The same piece, many times',
    teaches: 'A whole number times a fraction: the pieces stay the same size, so only the top number grows',
    steps: [
      { clip: 'l_ftimes_1', text: 'My friend eats one fourth of a honey bar every day.', scene: { t: 'fbar', parts: 4, shaded: 1, caption: '1/4' } },
      { clip: 'l_ftimes_2', text: 'After two days, that is two pieces. Two fourths.', scene: { t: 'fbar', parts: 4, shaded: 2, caption: '2 × 1/4 = 2/4' } },
      {
        clip: 'l_ftimes_3',
        text: 'After three days, three pieces. Three times one fourth is three fourths.',
        scene: { t: 'fbar', parts: 4, shaded: 3, caption: '3 × 1/4 = 3/4' },
      },
      {
        clip: 'l_ftimes_4',
        text: 'The pieces stay the same size, so the bottom number stays the same. Only the top number grows.',
        scene: { t: 'fbar', parts: 4, shaded: 3, caption: '3 × 1/4 = 3/4' },
      },
      {
        clip: 'l_ftimes_5',
        text: 'Five days is five pieces. That is more than one whole bar!',
        scene: { t: 'fbars', bars: [{ parts: 4, shaded: 4 }, { parts: 4, shaded: 1 }], caption: '5 × 1/4 = 5/4' },
      },
      {
        clip: 'l_ftimes_6',
        text: 'Your turn. Two times one third. How many pieces are gold?',
        scene: { t: 'fbar', parts: 3, shaded: 2, caption: '2 × 1/3 = ?/3' },
        ask: { kind: 'number', expected: 2 },
      },
      { clip: 'l_ftimes_7', text: 'Two thirds. Two pieces, and each piece is one third.', scene: { t: 'fbar', parts: 3, shaded: 2, caption: '2 × 1/3 = 2/3' } },
    ],
  },
  ftray: {
    id: 'ftray',
    title: 'A piece of a piece',
    teaches: 'A fraction times a fraction, with an area model: cut one way, then the other, and count all the small pieces',
    steps: [
      { clip: 'l_ftray_1', text: 'Here is a whole tray of honey. I cut it into three equal strips, and fill one. One third.', scene: { t: 'tray', cols: 3, shaded: 1, caption: '1/3' } },
      { clip: 'l_ftray_2', text: 'My friend wants half of that third. So I cut the tray across, into two.', scene: { t: 'tray', cols: 3, shaded: 1, rows: 2 } },
      { clip: 'l_ftray_3', text: 'Half of the gold strip is this one small, dark piece.', scene: { t: 'tray', cols: 3, shaded: 1, rows: 2, taken: 1 } },
      {
        clip: 'l_ftray_4',
        text: 'How big is it? Count all the small pieces in the tray. Six. So it is one sixth.',
        scene: { t: 'tray', cols: 3, shaded: 1, rows: 2, taken: 1, caption: '1/2 × 1/3 = 1/6' },
      },
      {
        clip: 'l_ftray_5',
        text: 'Your turn. Half of one fourth. How many small pieces are in the whole tray?',
        scene: { t: 'tray', cols: 4, shaded: 1, rows: 2, taken: 1, caption: '1/2 × 1/4 = 1/?' },
        ask: { kind: 'number', expected: 8 },
      },
      {
        clip: 'l_ftray_6',
        text: 'One half of one fourth is one eighth. A piece of a piece is a smaller piece.',
        scene: { t: 'tray', cols: 4, shaded: 1, rows: 2, taken: 1, caption: '1/2 × 1/4 = 1/8' },
      },
    ],
  },
};

/** The lesson taught before a monster is met for the first time. */
export const LESSON_BEFORE: Partial<Record<SpeciesId, LessonId>> = {
  dab: 'parts',
  glim: 'rows',
  fenn: 'share',
  plum: 'pack',
  chip: 'open',
  bix: 'frac',
  tam: 'same',
  zim: 'ftimes',
  lux: 'ftray',
};

/** The lesson that explains a kind of treat or berry trip, when there is one. */
export const LESSON_FOR_KIND: Partial<Record<string, LessonId>> = {
  any: 'parts',
  add: 'parts',
  sub: 'parts',
  mul: 'rows',
  div: 'share',
  addR: 'pack',
  subR: 'open',
  name: 'frac',
  same: 'same',
  times: 'ftimes',
  tray: 'ftray',
};

export interface LessonLog {
  seen: number;
  lastDay: string;
}

export function lessonSeen(log: Record<string, LessonLog> | undefined, id: LessonId): boolean {
  return (log?.[id]?.seen ?? 0) > 0;
}

/** A lesson is replayed on its own at most once a day, so help never turns into nagging. */
export function canReplay(log: Record<string, LessonLog> | undefined, id: LessonId, day: string): boolean {
  return log?.[id]?.lastDay !== day;
}

export function markLesson(log: Record<string, LessonLog>, id: LessonId, day: string): void {
  const entry = log[id] ?? { seen: 0, lastDay: '' };
  log[id] = { seen: entry.seen + 1, lastDay: day };
}
