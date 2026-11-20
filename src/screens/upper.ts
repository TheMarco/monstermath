import { say, sfx } from '../audio';
import { BAKERY_BG, TRIPS_PER_ROUND, TRIPS_TO_BEFRIEND, SPECIES, type SpeciesId, type Stage } from '../data/monsters';
import { upperStartStep } from '../intake';
import { record, wantsStretch, type Mark } from '../ladder';
import { LESSON_FOR_UPPER, type LessonId } from '../lessons';
import {
  classifyUpperError,
  decText,
  givenText,
  isRightUpper,
  makeUpperProblem,
  MAX_SLICES,
  sliceChoices,
  UPPER_KINDS,
  upperCoaching,
  upperParts,
  upperText,
  upperTop,
  type Side,
  type UpperError,
  type UpperGiven,
  type UpperKind,
  type UpperProblem,
} from '../math/upper';
import { bonusLines, climbed, gainLines, levelUpLine, onRound, onTrip, roundStars } from '../rewards';
import { teach, teachIfDue } from '../tutor';
import { befriend, dayKey, displayName, freshSave, growth, growthLine, monster, today, type EarlyProgress } from '../state';
import { bunTray, crumbTrays, loaf, loafOf, shareModel, type Slice } from '../ui/bakery';
import { backButton, backdrop, button, celebrate, floatUp, icon, monsterImg, speaker, starRow, toasts, type Screen } from '../ui/common';
import { h, replace, times, type Child } from '../ui/dom';
import { keypad, pushDigit } from '../ui/keypad';
import { berry, fracEl, rich } from '../ui/models';
import { LINES, nameClip, type LineKey } from '../voice/lines';

/** Decimal places, each with its own colour: ones, tenths, hundredths. */
const PLACE = ['o', 'd1', 'd2'] as const;
const PLACE_NAME = ['ones', 'tenths', 'hundredths'];

/** Practice from the grown-up page keeps its ladders here, so nothing touches the save. */
const tryStore: Partial<Record<UpperKind, EarlyProgress>> = {};

/** One number she types: a part of the tray, the total, or the leftover. */
interface Box {
  label: string;
  tone: string;
  right: number;
  role: 'part' | 'total' | 'left';
}

/**
 * The Bakery: multiplying and dividing bigger numbers in parts, adding and
 * taking away fractions, and decimals, all with buns on baking trays. One
 * monster stands for each idea. With `practice` set, a grown-up is trying the
 * screen: nothing is saved and nothing is earned.
 */
export const upperScreen: Screen = (app, params) => {
  const { save } = app;
  const id = params.id as SpeciesId;
  const ownKind = (UPPER_KINDS.includes(params.kind as UpperKind) ? params.kind : (SPECIES[id].upper ?? 'mult')) as UpperKind;
  const practice = params.practice === true;
  const sp = SPECIES[id];
  // Trying it out must not leave a trace in the save, not even a blank monster entry.
  const m = practice ? (save.monsters[id] ?? monster(freshSave(), id)) : monster(save, id);
  const wild = !practice && !m.friend;
  if (practice && typeof params.rung === 'number') tryStore[ownKind] = { step: params.rung };
  const name = displayName(save, id);
  const goal = TRIPS_TO_BEFRIEND * 2;
  const here = { screen: 'upper' as const, params: practice ? { id, kind: ownKind, practice: true } : { id, kind: ownKind } };

  function progress(kind: UpperKind): EarlyProgress {
    const store = practice ? tryStore : (save.upper ??= {});
    const at = (store[kind] ??= {});
    if (at.step === undefined) {
      at.step = upperStartStep(save.intakeLevels, kind, practice ? undefined : save.startGrade);
      at.missed = false;
    }
    at.step = Math.max(0, Math.min(upperTop(kind), at.step));
    return at;
  }

  let p: UpperProblem;
  /** The numbers typed into the boxes, and which box the keys go to. */
  let typed: string[] = [];
  let active = 0;
  /** Boxes checked and found right stay; boxes found wrong are marked until she types again. */
  let locked: boolean[] = [];
  let bad: boolean[] = [];
  /** Slices: the picked top and bottom number. */
  let top: number | null = null;
  let bottom: number | null = null;
  /** Slices: the loaves have been cut again so the slices match. */
  let recut = false;
  /** Decimals: the picked digit for ones, tenths and hundredths. */
  let digits: Array<number | null> = [null, null, null];
  /** The trays are on the mat (comparing starts from the numbers). */
  let shown = true;
  /** Help is on: the picture shows each product, shares the buns out, or counts the slices. */
  let counting = false;
  let stretch = false;
  let tried = new Set<Side>();
  let answers: string[] = [];
  let errors: UpperError[] = [];
  let solved = false;
  let partied = false;
  let helped = false;
  /** Three misses on one problem: the answer is shown and she copies it. */
  let revealed = false;
  let lessonDue: LessonId | undefined;
  let gone = false;

  const pet = monsterImg(id, m.stage, 220, 'bob');
  const status = h('div', { class: 'cy-status' });
  const bubble = h('div', { class: 'bubble cy-bubble' });
  const story = h('p', { class: 'story' });
  const mat = h('div', { class: 'mat early-mat upper-mat' });
  const notation = h('div', { class: 'notation early-note upper-note' });
  const answer = h('div', { class: 'answer' });
  const action = h('div', { class: 'cy-check' });

  type Way = 'boxes' | 'frac' | 'places' | 'side';
  function way(): Way {
    if (p.kind === 'mult' || p.kind === 'div') return 'boxes';
    if (p.kind === 'fadd') return 'frac';
    return p.mode === 'more' ? 'side' : 'places';
  }

  function boxes(): Box[] {
    if (p.kind !== 'mult' && p.kind !== 'div') return [];
    const parts: Box[] = upperParts(p).map((part, i) => ({ label: `${part.text} =`, tone: `tone-${i}`, right: part.value, role: 'part' }));
    const total: Box = { label: p.kind === 'mult' ? 'in all' : 'in each', tone: '', right: p.answer, role: 'total' };
    const left: Box[] = p.kind === 'div' && p.asksLeft ? [{ label: 'left', tone: '', right: p.left, role: 'left' }] : [];
    return [...parts, total, ...left];
  }

  /** How many digits follow the point in the answer. */
  const places = (): 1 | 2 => (p.kind === 'dec' && p.mode !== 'more' ? p.places : 1);
  const needsCut = (): boolean => p.kind === 'fadd' && (p.a.d !== p.cut || p.b.d !== p.cut);
  const sign = (): string => ((p.kind === 'fadd' || (p.kind === 'dec' && p.mode === 'sum')) && p.op === '-' ? '−' : '+');

  function storyText(): string {
    switch (p.kind) {
      case 'mult':
        return `${p.b} rows of ${p.a} buns. How many buns?`;
      case 'div':
        return `${p.total} buns, ${p.by} baskets. How many in each?${p.asksLeft ? ' How many left?' : ''}`;
      case 'fadd':
        return p.op === '+'
          ? `${p.a.n}/${p.a.d} of a loaf, and ${p.b.n}/${p.b.d} more. How much in all?`
          : `${p.a.n}/${p.a.d} of a loaf. Take away ${p.b.n}/${p.b.d}. How much is left?`;
      default:
        if (p.mode === 'read') return 'A full tray is 1. How much is here?';
        if (p.mode === 'more') return 'Which is more?';
        return p.op === '+' ? `${decText(p.a)} and ${decText(p.b)} more. How much in all?` : `${decText(p.a)}, take away ${decText(p.b)}. How much is left?`;
    }
  }

  function storyClips(): LineKey[] {
    switch (p.kind) {
      case 'mult':
        return ['uq_mult'];
      case 'div':
        return [p.asksLeft ? 'uq_div_left' : 'uq_div'];
      case 'fadd':
        return [p.op === '+' ? 'uq_fadd' : 'uq_fsub'];
      default:
        if (p.mode === 'read') return ['uq_dec_read'];
        if (p.mode === 'more') return ['uq_dec_more'];
        return [p.op === '+' ? 'uq_dec_add' : 'uq_dec_sub'];
    }
  }

  function newProblem(): void {
    if (lessonDue) {
      const due = lessonDue;
      lessonDue = undefined;
      if (teachIfDue(app, due, here)) return;
    }
    const at = progress(ownKind);
    const rung = at.step ?? 0;
    stretch = wantsStretch({ rung, recent: (at.recent ?? []) as Mark[], missed: at.missed }, upperTop(ownKind));
    const before = p ? upperText(p) : '';
    // Never the same problem twice in a row.
    for (let tries = 0; tries < 6; tries++) {
      p = makeUpperProblem(ownKind, Math.random, rung + (stretch ? 1 : 0));
      if (upperText(p) !== before) break;
    }
    typed = boxes().map(() => '');
    locked = typed.map(() => false);
    bad = typed.map(() => false);
    active = 0;
    top = null;
    bottom = null;
    recut = false;
    digits = [null, null, null];
    shown = !(p.kind === 'dec' && p.mode === 'more');
    counting = false;
    tried = new Set();
    answers = [];
    errors = [];
    solved = false;
    helped = false;
    revealed = false;
    replace(story, rich(storyText()));
    replace(bubble, stretch ? 'A tricky one! Give it a try.' : 'Fresh from the oven!');
    draw();
    const veryFirst = !practice && !save.seenTips.includes('upper');
    if (veryFirst) {
      save.seenTips.push('upper');
      app.commit();
    }
    say(veryFirst ? 'upper_tip' : null, stretch ? 'stretch_try' : null, nameClip(id), ...storyClips());
  }

  function coach(text: string, clip: string): void {
    replace(bubble, text);
    say(clip);
  }

  /** A spoken line, shown in the bubble as it is said. */
  function line(key: LineKey): void {
    coach(LINES[key], key);
  }

  function react(cls: 'jump' | 'tilt' | 'munch'): void {
    pet.classList.remove('jump', 'tilt', 'munch');
    void pet.offsetWidth;
    pet.classList.add(cls);
  }

  /** Picture help: every part shows its product, the buns go in the baskets, the slices are counted. */
  function helpNow(): void {
    if (solved || counting) return;
    helped = true;
    counting = true;
    shown = true;
    recut = true;
    if (p.kind === 'mult') line('uh_mult');
    else if (p.kind === 'div') line(p.parts.length ? 'uh_div_parts' : 'uh_div');
    else if (p.kind === 'fadd') line(p.op === '+' ? 'uh_slices' : 'uh_slices_left');
    else if (p.mode === 'read') line('uh_dec_read');
    else if (p.mode === 'more') line('uh_dec_more');
    else line(p.op === '+' ? 'uh_dec_sum' : 'uh_dec_left');
    draw();
  }

  // ---- drawing --------------------------------------------------------------

  /** Trays, strips and squares in words, each in the colour of its place. */
  function legend(n: number): HTMLElement {
    const count = (k: number, one: string, many: string): string => `${k} ${k === 1 ? one : many}`;
    const whole = Math.floor(n / 100);
    return h(
      'div',
      { class: 'crumb-legend' },
      whole > 0 ? h('span', { class: 'pl-o' }, count(whole, 'full tray', 'full trays')) : null,
      h('span', { class: 'pl-d1' }, count(Math.floor(n / 10) % 10, 'strip', 'strips')),
      n % 10 > 0 || places() === 2 ? h('span', { class: 'pl-d2' }, count(n % 10, 'square', 'squares')) : null,
    );
  }

  function drawMat(): void {
    const buttons: Child[] = [];
    let note: Child = null;
    let body: Child;

    if (p.kind === 'mult') {
      const parts = upperParts(p);
      body = bunTray(p.cols, p.rows, { lit: counting, typed: parts.map((_, i) => typed[i] || null), width: 590 });
      if (parts.length > 0 && !counting) note = 'Fill in each part. Then add them.';
    } else if (p.kind === 'div') {
      body = shareModel({ total: p.total, by: p.by, dealt: counting ? p.answer : 0, parts: p.parts, loose: p.loose, counts: counting });
      if (p.parts.length > 0 && !counting) note = 'Share each part. Then add them.';
    } else if (p.kind === 'fadd') {
      const cut = recut ? p.cut : undefined;
      const an = (p.a.n * p.cut) / p.a.d;
      const bn = (p.b.n * p.cut) / p.b.d;
      const size = p.cut;
      const name = (f: { n: number; d: number }): Child =>
        counting && f.d !== size ? [fracEl(f.n, f.d), h('span', { class: 'loaf-same' }, '='), fracEl((f.n * size) / f.d, size)] : fracEl(f.n, f.d);
      const result: Slice[] =
        p.op === '+' ? times(p.cut, (i) => (i < an ? 'a' : i < an + bn ? 'b' : '')) : times(p.cut, (i) => (i < an - bn ? 'a' : i < an ? 'gone' : ''));
      body = h(
        'div',
        { class: 'loaves' },
        h('div', { class: 'loaf-row' }, h('span', { class: 'loaf-name' }, name(p.a)), loafOf(p.a.d, p.a.n, 'a', cut, { width: 400, height: 58 })),
        h('div', { class: 'loaf-row' }, h('span', { class: 'loaf-name' }, h('b', { class: 'loaf-sign' }, sign()), name(p.b)), loafOf(p.b.d, p.b.n, 'b', cut, { width: 400, height: 58 })),
        counting ? h('div', { class: 'loaf-row result' }, h('span', { class: 'loaf-name' }, h('b', { class: 'loaf-sign' }, '=')), loaf(result, { width: 400, height: 58, numbers: true })) : null,
      );
      if (needsCut() && !recut) {
        buttons.push(
          button(
            'Cut to match',
            () => {
              sfx('pack');
              recut = true;
              line('uh_cut');
              draw();
            },
            'btn-primary pulse',
          ),
        );
      }
    } else if (p.mode === 'read') {
      body = h('div', { class: 'crumb-col' }, crumbTrays(p.n, { size: p.n > 100 ? 180 : 210 }), counting ? legend(p.n) : null);
    } else if (p.mode === 'more') {
      const side = (which: Side, n: number): HTMLElement => {
        const b = h('button', { class: 'e-side e-num', type: 'button', onclick: () => choose(which) }, h('span', { class: 'e-numeral' }, decText(n)), shown ? crumbTrays(n, { size: 130 }) : null);
        b.toggleAttribute('disabled', solved || tried.has(which));
        return b;
      };
      body = h('div', { class: 'e-versus' }, side('left', p.a), side('right', p.b));
      if (!shown) {
        buttons.push(
          button('Show the trays', () => {
            shown = true;
            draw();
          }),
        );
      } else note = 'Tap the one that is more.';
    } else if (!counting) {
      body = h('div', { class: 'crumb-sum' }, crumbTrays(p.a, { size: 130 }), h('b', { class: 'crumb-sign' }, sign()), crumbTrays(p.b, { size: 130 }));
    } else {
      body = h(
        'div',
        { class: 'crumb-col' },
        p.op === '+' ? crumbTrays(p.answer, { size: 150 }) : crumbTrays(p.a, { gone: p.b, size: 150 }),
        legend(p.answer),
      );
    }

    replace(mat, h('div', { class: 'early-model' }, body), h('div', { class: 'mat-actions' }, note ? h('span', { class: 'mat-note' }, note) : null, buttons));
  }

  /** A decimal with each digit in its place colour. Unpicked digits show as a blank. */
  function placed(values: Array<number | null>): HTMLElement {
    const digit = (col: number): HTMLElement => h('span', { class: `e-digit pl-${PLACE[col]} ${values[col] === null ? 'blank' : ''}` }, values[col] === null ? '?' : String(values[col]));
    return h('span', { class: 'e-digits u-dec' }, digit(0), h('span', { class: 'u-point' }, '.'), digit(1), places() === 2 ? digit(2) : null);
  }

  function pickBox(i: number): void {
    if (solved || revealed || locked[i]) return;
    sfx('tap');
    active = i;
    drawNotation();
  }

  function drawNotation(): void {
    if (p.kind === 'mult' || p.kind === 'div') {
      const all = boxes();
      const head = p.kind === 'mult' ? `${p.a} × ${p.b}` : `${p.total} ÷ ${p.by}`;
      replace(
        notation,
        h('div', { class: 'u-head' }, head),
        all.map((box, i) =>
          h(
            'div',
            { class: `u-line ${box.tone} ${box.role}` },
            h('span', { class: 'u-label' }, box.label),
            h(
              'button',
              {
                class: `u-box ${i === active && !solved && !revealed ? 'on' : ''} ${locked[i] ? 'ok' : ''} ${bad[i] ? 'bad' : ''} ${revealed && !solved ? 'shown' : ''}`,
                type: 'button',
                'data-role': box.role,
                'data-hear': true,
                'aria-label': box.label,
                onclick: () => pickBox(i),
              },
              typed[i] || ' ',
            ),
          ),
        ),
      );
    } else if (p.kind === 'fadd') {
      replace(
        notation,
        h('div', { class: 'e-sum u-fsum' }, fracEl(p.a.n, p.a.d), h('span', { class: 'e-sign' }, sign()), fracEl(p.b.n, p.b.d)),
        h('div', { class: 'e-sum u-fsum' }, '=', fracEl(top ?? '?', bottom ?? '?', `big ${top === null ? 'no-top' : ''} ${bottom === null ? 'no-bottom' : ''}`)),
      );
    } else if (p.mode === 'more') {
      if (!solved) replace(notation, h('span', { class: 'e-pick blank' }, '?'));
      else replace(notation, h('div', { class: 'e-sum u-more' }, decText(p.a), h('span', { class: 'e-sign' }, p.a > p.b ? '>' : '<'), decText(p.b)));
    } else if (p.mode === 'read') {
      replace(notation, placed(digits));
    } else {
      replace(notation, h('div', { class: 'e-sum' }, `${decText(p.a)} ${sign()} ${decText(p.b)}`), h('div', { class: 'e-sum' }, '=', placed(digits)));
    }
  }

  function chip(n: number, on: boolean, right: boolean, set: () => void): HTMLElement {
    return h(
      'button',
      {
        class: `ans-chip ${on ? 'on' : ''} ${revealed && !solved && right ? 'shown' : ''}`,
        type: 'button',
        disabled: solved || (revealed && !right),
        onclick: () => {
          if (solved) return;
          sfx('tap');
          set();
          drawAnswer();
          drawNotation();
          drawAction();
        },
      },
      String(n),
    );
  }

  function typeDigit(d: string): void {
    if (solved || revealed || way() !== 'boxes') return;
    if (locked[active]) {
      const open = locked.findIndex((isLocked) => !isLocked);
      if (open < 0) return;
      active = open;
    }
    if (bad[active]) {
      bad[active] = false;
      typed[active] = '';
    }
    typed[active] = pushDigit(typed[active] ?? '', d, 4);
    draw();
  }

  function erase(): void {
    if (solved || revealed || way() !== 'boxes' || locked[active]) return;
    bad[active] = false;
    typed[active] = (typed[active] ?? '').slice(0, -1);
    draw();
  }

  /** Move to the next box that still needs a number. False when there is none. */
  function nextBox(): boolean {
    const order = [...typed.keys()].map((k) => (active + 1 + k) % typed.length);
    const open = order.find((i) => !locked[i] && (typed[i] === '' || bad[i]));
    if (open === undefined) return false;
    active = open;
    drawNotation();
    return true;
  }

  function drawAnswer(): void {
    const how = way();
    if (how === 'boxes') {
      replace(answer, h('div', { class: 'u-pad' }, keypad(typeDigit, erase)));
    } else if (how === 'frac' && p.kind === 'fadd') {
      const want = p.answer;
      replace(
        answer,
        h('div', { class: 'ans-row pl-top u-slices' }, h('span', { class: 'ans-label' }, 'top'), times(MAX_SLICES, (i) => chip(i + 1, top === i + 1, want.n === i + 1, () => (top = i + 1)))),
        h('div', { class: 'ans-row pl-bottom u-slices' }, h('span', { class: 'ans-label' }, 'bottom'), sliceChoices(p).map((d) => chip(d, bottom === d, want.d === d, () => (bottom = d)))),
      );
    } else if (how === 'places' && p.kind === 'dec' && p.mode !== 'more') {
      const value = p.mode === 'read' ? p.n : p.answer;
      const right = [Math.floor(value / 100), Math.floor(value / 10) % 10, value % 10];
      replace(
        answer,
        (places() === 2 ? [0, 1, 2] : [0, 1]).map((col) =>
          h(
            'div',
            { class: `ans-row pl-${PLACE[col]}` },
            h('span', { class: 'ans-label' }, h('i', { class: `crumb-icon ${PLACE[col]}` }), PLACE_NAME[col]),
            times(10, (d) => chip(d, digits[col] === d, right[col] === d, () => (digits[col] = d))),
          ),
        ),
      );
    } else {
      replace(answer, null);
    }
  }

  function ready(): boolean {
    const how = way();
    if (how === 'boxes') return typed.every((t) => t !== '');
    if (how === 'frac') return top !== null && bottom !== null;
    if (how === 'places') return digits[0] !== null && digits[1] !== null && (places() === 1 || digits[2] !== null);
    return false;
  }

  function drawAction(): void {
    if (solved) {
      replace(action, partied ? null : button('Next one', newProblem, 'btn-primary btn-big'));
      return;
    }
    if (way() === 'side') {
      replace(action, null);
      return;
    }
    const check = button([icon('check'), 'Check'], doCheck, 'btn-primary btn-big');
    check.toggleAttribute('disabled', !ready());
    replace(action, check);
  }

  function drawStatus(): void {
    if (practice) {
      replace(status, h('span', { class: 'mat-note' }, `Trying it out: level ${(progress(ownKind).step ?? 0) + 1} of ${upperTop(ownKind) + 1}`));
    } else if (wild) {
      replace(
        status,
        h('div', { class: 'trip-meter' }, times(TRIPS_TO_BEFRIEND, (i) => berry(m.trips >= 2 * (i + 1) ? 'full' : m.trips === 2 * i + 1 ? 'half' : 'empty'))),
      );
    } else {
      replace(
        status,
        h('div', { class: 'trip-meter' }, times(TRIPS_PER_ROUND, (i) => berry(i < m.roundTrips ? 'full' : 'empty'))),
        growth(m).final ? null : starRow(growth(m).have, growth(m).need),
      );
    }
  }

  function draw(): void {
    drawMat();
    drawNotation();
    drawAnswer();
    drawAction();
    drawStatus();
  }

  // ---- checking -------------------------------------------------------------

  function miss(error: UpperError): void {
    errors.push(error);
    sfx('soft');
    react('tilt');
    shown = true;
    // A third miss: more tries would be guessing. Show the answer and let her copy it.
    if (answers.length >= 3 && way() !== 'side') {
      revealed = true;
      helped = true;
      if (way() === 'boxes') {
        typed = boxes().map((box) => String(box.right));
        bad = typed.map(() => false);
        locked = typed.map(() => true);
        coach('Let me show you. Look, then press Check.', 'show_you_look');
      } else {
        top = null;
        bottom = null;
        digits = [null, null, null];
        coach('Let me show you. Press the glowing numbers.', 'show_you');
      }
      draw();
      return;
    }
    if (stretch && answers.length === 1) coach('That one was extra tricky. Let us look at it together.', 'stretch_miss');
    else line(upperCoaching(p, error));
    // A second miss on the same problem, or any miss on a stretch or a pick-one problem: let the picture show it.
    if ((answers.length >= 2 || stretch || way() === 'side') && !counting) {
      window.setTimeout(() => {
        if (!gone && !solved) helpNow();
      }, 2600);
    }
    draw();
  }

  function choose(which: Side): void {
    if (solved || p.kind !== 'dec' || p.mode !== 'more') return;
    answers.push(givenText(p, which));
    if (which === p.answer) {
      succeed();
      return;
    }
    tried.add(which);
    miss(classifyUpperError(p, which));
  }

  function doCheck(): void {
    if (solved || !ready()) return;
    const how = way();
    let given: UpperGiven;
    if (how === 'boxes') {
      const all = boxes();
      const at = (role: Box['role']): number[] => all.flatMap((box, i) => (box.role === role ? [Number(typed[i])] : []));
      const left = at('left')[0];
      given = { parts: at('part'), total: at('total')[0] ?? 0, ...(left === undefined ? {} : { left }) };
      // Right boxes stay. Wrong ones are marked, and the first of them is next.
      locked = all.map((box, i) => Number(typed[i]) === box.right);
      bad = locked.map((isLocked) => !isLocked);
      active = Math.max(0, bad.indexOf(true));
    } else if (how === 'frac') {
      given = { n: top ?? 0, d: bottom ?? 0 };
    } else {
      given = (digits[0] ?? 0) * 100 + (digits[1] ?? 0) * 10 + (digits[2] ?? 0);
    }
    answers.push(givenText(p, given));
    if (isRightUpper(p, given)) succeed();
    else miss(classifyUpperError(p, given));
  }

  function succeed(): void {
    solved = true;
    const firstTry = answers.length === 1 && !helped;
    const worked = answers.length <= 3;
    const at = progress(p.kind);
    const before = at.step ?? 0;
    const moved = record({ rung: before, recent: (at.recent ?? []) as Mark[], missed: at.missed }, upperTop(p.kind), firstTry, stretch);
    at.step = moved.rung;
    at.recent = moved.recent;
    at.missed = moved.missed;
    // Stepping down means repeated misses: reteach the idea before the next problem.
    if (moved.moved < 0 && !practice) lessonDue = LESSON_FOR_UPPER[p.kind];
    at.shownRun = revealed ? (at.shownRun ?? 0) + 1 : 0;
    sfx('yes');
    react('jump');
    if (moved.moved > 0) sfx('level');
    replace(bubble, 'Yes! You got it!');
    say(stretch && firstTry ? 'stretch_yes' : 'yes');
    if (practice) {
      if (moved.moved !== 0) toasts(el, [{ text: moved.moved > 0 ? 'Level up! The problems grow with you.' : 'One level down, to make it easier.', kind: 'level' }]);
      draw();
      return;
    }

    const day = today(save);
    if (worked) day.trips += 1;
    save.upperLog ??= [];
    save.upperLog.push({
      t: Date.now(),
      day: dayKey(),
      monster: id,
      kind: p.kind,
      text: upperText(p),
      answers: [...answers],
      firstTry,
      errors: [...errors],
      helped,
      rung: before,
      stretch,
    });
    if (worked) floatUp(pet, 'heart', firstTry ? 3 : 1);
    // Working it out earns the reward, with or without help. Trying answers until one fits does not.
    if (worked) toasts(el, gainLines(onTrip(save, firstTry)));
    // A level she has never reached before earns the friend here a bonus star at the end of the round.
    const best = moved.moved > 0 && climbed(save, `upper.${p.kind}`, before, moved.rung, id);
    if (moved.moved > 0) toasts(el, [levelUpLine(best, name, 'problems')]);

    if (wild) {
      m.trips = Math.min(goal, m.trips + (firstTry ? 2 : worked ? 1 : 0));
      if (m.trips >= goal) {
        befriend(save, id);
        m.rounds += 1;
        day.wins += 1;
        partied = true;
        toasts(el, gainLines(onRound(save, id)));
        app.commit();
        draw();
        window.setTimeout(() => {
          celebrate(el, {
            id,
            title: `${sp.name} is your friend!`,
            voice: [nameClip(id), 'new_friend'],
            lines: [`${sp.name} is full of buns and very happy.`],
            buttons: [{ label: 'Hooray!', onClick: () => app.go('home'), primary: true }],
            big: true,
          });
        }, 1400);
        return;
      }
    } else {
      if (worked) m.roundTrips += 1;
      if (m.roundTrips >= TRIPS_PER_ROUND) {
        m.roundTrips = 0;
        m.rounds += 1;
        day.wins += 1;
        partied = true;
        toasts(el, gainLines(onRound(save, id)));
        const { result, bonus } = roundStars(save, id);
        app.commit();
        draw();
        const again = { label: 'Play again', onClick: () => app.go('upper', { id, kind: ownKind }) };
        const home = { label: 'Meadow', onClick: () => app.go('home'), primary: true };
        window.setTimeout(() => {
          if (result === 'grown') {
            celebrate(el, { id, stage: m.stage, title: `${name} evolved!`, fx: { kind: 'evolve', from: (m.stage - 1) as Stage }, voice: [nameClip(id), 'grew_up'], lines: [...bonusLines(bonus), 'Look how strong!'], buttons: [home], big: true });
          } else if (result === 'star') {
            celebrate(el, { id, stage: m.stage, title: `${name} got a star!`, voice: [nameClip(id), 'got_star'], lines: [...bonusLines(bonus), growthLine(m, name)], buttons: [again, home] });
          } else {
            celebrate(el, {
              id,
              stage: m.stage,
              title: `${name} had so much fun!`,
              voice: [nameClip(id), 'full_today'],
              lines: [`${name} is full of stars for today. More stars tomorrow!`],
              buttons: [again, home],
            });
          }
        }, 1400);
        return;
      }
    }
    app.commit();
    draw();
  }

  const el = h(
    'div',
    { class: 'screen canyon-screen early-screen upper-screen' },
    backdrop(BAKERY_BG),
    h('div', { class: 'topbar' }, practice ? button('Back', () => app.go('grownups'), 'btn-small') : backButton(app)),
    h(
      'div',
      { class: 'cy-left' },
      bubble,
      pet,
      h('div', { class: 'nameplate' }, wild ? `Wild ${sp.name}` : name),
      status,
      h(
        'div',
        { class: 'cy-help' },
        button('Show me', helpNow, 'btn-small help-walk'),
        button('Teach me', () => (practice ? app.go('lesson', { id: LESSON_FOR_UPPER[ownKind], back: here, preview: true }) : teach(app, LESSON_FOR_UPPER[ownKind], here)), 'btn-small teach'),
      ),
    ),
    h(
      'div',
      { class: 'card cy-panel' },
      h('div', { class: 'cy-head' }, story, speaker(() => [nameClip(id), ...storyClips()])),
      h('div', { class: 'cy-main' }, mat, notation),
      h('div', { class: 'cy-bottom' }, answer, action),
    ),
  );

  // `p` is assigned by newProblem before anything reads it.
  p = makeUpperProblem(ownKind);
  newProblem();

  return {
    el,
    dispose() {
      gone = true;
    },
    onKey(e) {
      if (way() === 'boxes' && !solved && !revealed) {
        if (/^[0-9]$/.test(e.key)) {
          typeDigit(e.key);
          return;
        }
        if (e.key === 'Backspace') {
          erase();
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          nextBox();
          return;
        }
      }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (solved && !partied) newProblem();
      else if (way() === 'boxes' && !revealed && !ready() && typed[active] !== '') nextBox();
      else doCheck();
    },
  };
};
