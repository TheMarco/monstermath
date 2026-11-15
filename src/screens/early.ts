import { say, sfx } from '../audio';
import { TRIPS_PER_ROUND, TRIPS_TO_BEFRIEND, SPECIES, type SpeciesId, type Stage } from '../data/monsters';
import { earlyStartStep } from '../intake';
import { record, wantsStretch, type Mark } from '../ladder';
import {
  classifyCountError,
  COUNT_KINDS,
  countAnswer,
  countCoaching,
  countText,
  countTop,
  makeCountProblem,
  type CountError,
  type CountKind,
  type CountProblem,
  type Side,
} from '../math/count';
import { toBlocks } from '../math/regroup';
import { gainLines, onRound, onTrip } from '../rewards';
import { befriend, dayKey, displayName, freshSave, giveStar, growth, growthLine, monster, today, type EarlyProgress } from '../state';
import { backButton, backdrop, button, celebrate, floatUp, icon, monsterImg, speaker, starRow, toasts, type Screen } from '../ui/common';
import { h, replace, times, type Child } from '../ui/dom';
import { berry, cart, crate } from '../ui/models';
import { nameClip, num } from '../voice/lines';

const COACH_CLIP: Record<CountError, string> = {
  'count-slip': 'ec_slip',
  'other-pile': 'ec_line_up',
  'said-what-is-there': 'ec_there',
  'said-the-whole': 'ec_whole',
  'crates-as-ones': 'ec_crate_ten',
  'reversed-digits': 'ec_reversed',
  'changed-the-ones': 'eh_crate_more',
  'wrong-way': 'eh_crate_more',
  other: 'c_other',
};

const PLACE = ['h', 't', 'o'] as const;
const PLACE_NAME = ['carts', 'crates', 'loose'];

/** Practice from the grown-up page keeps its ladders here, so nothing touches the save. */
const tryStore: Partial<Record<CountKind, EarlyProgress>> = {};

/** Places for scattered berries: a loose grid, shuffled, read left to right and top to bottom. */
function scatter(n: number): Array<[number, number]> {
  const cols = 7;
  const rows = 4;
  const cells = times(cols * rows, (i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j] as number, cells[i] as number];
  }
  return cells
    .slice(0, n)
    .sort((x, y) => x - y)
    .map((c) => [((c % cols) + 0.3 + Math.random() * 0.4) / cols, (Math.floor(c / cols) + 0.3 + Math.random() * 0.4) / rows]);
}

/**
 * Early number work with berries and crates: counting a set, comparing,
 * making ten and the teen numbers, and tens and ones. One monster stands for
 * each idea. With `practice` set, a grown-up is trying the screen: nothing is
 * saved and nothing is earned.
 */
export const earlyScreen: Screen = (app, params) => {
  const { save } = app;
  const id = params.id as SpeciesId;
  const ownKind = (COUNT_KINDS.includes(params.kind as CountKind) ? params.kind : 'count') as CountKind;
  const practice = params.practice === true;
  const sp = SPECIES[id];
  // Trying it out must not leave a trace in the save, not even a blank monster entry.
  const m = practice ? (save.monsters[id] ?? monster(freshSave(), id)) : monster(save, id);
  const wild = !practice && !m.friend;
  if (practice && typeof params.rung === 'number') tryStore[ownKind] = { step: params.rung };
  const name = displayName(save, id);
  const goal = TRIPS_TO_BEFRIEND * 2;

  function progress(kind: CountKind): EarlyProgress {
    const store = practice ? tryStore : (save.early ??= {});
    const at = (store[kind] ??= {});
    if (at.step === undefined) at.step = earlyStartStep(save.intakeLevels, kind);
    at.step = Math.max(0, Math.min(countTop(kind), at.step));
    return at;
  }

  let p: CountProblem;
  /** A picked number, for the problems answered with one row of chips. */
  let picked: number | null = null;
  /** Picked digits, for the problems answered per place: carts, crates, loose. */
  let digits: Array<number | null> = [null, null, null];
  /** Counting: the berries she touched. */
  let touched = new Set<number>();
  let spots: Array<[number, number]> = [];
  /** Counting out: berries in the basket. */
  let basket = 0;
  /** Filling a crate: the empty spots she filled. */
  let added = 0;
  /** A teen number: the ten berries have been packed into a crate. */
  let packed = false;
  /** Building a number: carts, crates and loose berries on the mat. */
  let built: [number, number, number] = [0, 0, 0];
  /** The berries are on the mat (top rungs start from the numbers). */
  let shown = true;
  /** Help is on: berries are numbered, piles are lined up, the extra crate is drawn. */
  let counting = false;
  let stretch = false;
  let tried = new Set<Side>();
  let answers: string[] = [];
  let errors: CountError[] = [];
  let solved = false;
  let partied = false;
  let helped = false;
  /** Three misses on one problem: the answer is shown and she copies it. */
  let revealed = false;
  let gone = false;

  const pet = monsterImg(id, m.stage, 220, 'bob');
  const status = h('div', { class: 'cy-status' });
  const bubble = h('div', { class: 'bubble cy-bubble' });
  const story = h('p', { class: 'story' });
  const mat = h('div', { class: 'mat early-mat' });
  const notation = h('div', { class: 'notation early-note' });
  const answer = h('div', { class: 'answer' });
  const action = h('div', { class: 'cy-check' });

  type Way = 'chips' | 'places' | 'side' | 'model';
  function way(): Way {
    if (p.kind === 'more') return 'side';
    if (p.kind === 'count') return p.mode === 'give' ? 'model' : 'chips';
    if (p.kind === 'ten') return 'chips';
    return p.mode === 'build' ? 'model' : 'places';
  }

  /** The numbers on the answer chips. */
  function chipRange(): number[] {
    if (p.kind === 'ten' && p.mode === 'fill') return times(p.whole + 1, (i) => i);
    if (p.kind === 'ten' && p.mode === 'split') return times(10, (i) => i);
    const high = (p.kind === 'count' && p.n > 10) || (p.kind === 'ten' && p.mode === 'teen') ? 20 : 10;
    return times(high, (i) => i + 1);
  }

  const needH = (): boolean => p.kind === 'place' && Math.max(p.n, p.answer) >= 100;

  function storyText(): string {
    switch (p.kind) {
      case 'count':
        return p.mode === 'howMany' ? 'How many berries?' : `Put ${p.n} berries in the basket.`;
      case 'more':
        return p.mode === 'piles' ? `Which pile has ${p.ask}?` : 'Which number is bigger?';
      case 'ten':
        if (p.mode === 'fill') return p.whole === 5 ? 'How many more make 5?' : p.bare ? 'How many more make 10?' : 'How many more fill the crate?';
        if (p.mode === 'teen') return 'One crate and some loose berries. How many?';
        return `${p.n} is one crate, and how many loose berries?`;
      default:
        if (p.mode === 'read') return 'How many berries?';
        if (p.mode === 'build') return `Make ${p.n} with crates and berries.`;
        return p.by > 0 ? `What is ten more than ${p.n}?` : `What is ten less than ${p.n}?`;
    }
  }

  function storyClips(): Array<string | null> {
    switch (p.kind) {
      case 'count':
        return p.mode === 'howMany' ? ['i_count'] : ['eq_give', num(p.n)];
      case 'more':
        return [p.mode === 'piles' ? (p.ask === 'more' ? 'eq_more' : 'eq_fewer') : 'i_bigger'];
      case 'ten':
        if (p.mode === 'fill') return [p.whole === 5 ? 'eq_fill5' : p.bare ? 'eq_pair' : 'eq_fill10'];
        return [p.mode === 'teen' ? 'eq_teen' : 'eq_split'];
      default:
        if (p.mode === 'read') return [needH() ? 'i_carts' : 'eq_read'];
        if (p.mode === 'build') return ['eq_build', num(p.n)];
        return [p.by > 0 ? 'eq_more10' : 'eq_less10', num(p.n)];
    }
  }

  function newProblem(): void {
    const at = progress(ownKind);
    const rung = at.step ?? 0;
    stretch = wantsStretch({ rung, recent: (at.recent ?? []) as Mark[] }, countTop(ownKind));
    const before = p ? countText(p) : '';
    // Never the same problem twice in a row.
    for (let tries = 0; tries < 6; tries++) {
      p = makeCountProblem(ownKind, Math.random, rung + (stretch ? 1 : 0));
      if (countText(p) !== before) break;
    }
    picked = null;
    digits = [null, null, null];
    touched = new Set();
    spots = p.kind === 'count' && p.mode === 'howMany' && p.scatter ? scatter(p.n) : [];
    basket = 0;
    added = 0;
    packed = false;
    built = [0, 0, 0];
    shown = !((p.kind === 'ten' && p.mode === 'fill' && p.bare) || (p.kind === 'more' && p.mode === 'numbers'));
    counting = false;
    tried = new Set();
    answers = [];
    errors = [];
    solved = false;
    helped = false;
    revealed = false;
    replace(story, storyText());
    replace(bubble, stretch ? 'A tricky one! Give it a try.' : 'Berry time!');
    draw();
    const veryFirst = !practice && !save.seenTips.includes('early');
    if (veryFirst) {
      save.seenTips.push('early');
      app.commit();
    }
    say(veryFirst ? 'early_tip' : null, stretch ? 'stretch_try' : null, nameClip(id), ...storyClips());
  }

  function coach(text: string, clip: string): void {
    replace(bubble, text);
    say(clip);
  }

  function react(cls: 'jump' | 'tilt' | 'munch'): void {
    pet.classList.remove('jump', 'tilt', 'munch');
    void pet.offsetWidth;
    pet.classList.add(cls);
  }

  /** Counting help: number the berries, line the piles up, or show the berries behind the numbers. */
  function helpNow(): void {
    if (solved || counting) return;
    helped = true;
    counting = true;
    shown = true;
    if (p.kind === 'ten' && p.mode === 'split') packed = true;
    if (p.kind === 'count') coach(p.mode === 'howMany' ? 'Let us count together. Touch each berry once.' : 'Count each berry as it goes in the basket.', p.mode === 'howMany' ? 'eh_count' : 'eh_basket');
    else if (p.kind === 'more') coach(p.mode === 'piles' ? 'Here they are, side by side. Which row goes further?' : 'Here are the berries. More crates means a bigger number.', p.mode === 'piles' ? 'eh_line' : 'eh_crates_first');
    else if (p.kind === 'ten' && p.mode === 'fill') coach('Count the empty spots.', 'eh_empty');
    else if (p.kind === 'ten') coach('The crate is ten. Count on from ten.', 'eh_count_on');
    else if (p.mode === 'shift') coach(p.by > 0 ? 'Ten more is one more crate.' : 'Ten less is one crate less.', p.by > 0 ? 'eh_crate_more' : 'eh_crate_less');
    else coach('Count the crates. Then count the loose berries.', 'eh_places');
    draw();
  }

  // ---- drawing --------------------------------------------------------------

  /** One big berry. With a number on it when the game counts along. */
  function dot(cls: string, label?: number, onTap?: () => void, style?: string): HTMLElement {
    const inner = label !== undefined ? String(label) : null;
    if (!onTap) return h('span', { class: `eb ${cls}`, style }, inner);
    return h('button', { class: `eb tap ${cls}`, type: 'button', style, 'aria-label': 'Berry', onclick: onTap }, inner);
  }

  function touch(i: number): void {
    if (solved) return;
    sfx('tap');
    if (touched.has(i)) touched.delete(i);
    else touched.add(i);
    drawMat();
  }

  function shownButton(label: string): HTMLElement {
    return button(label, () => {
      shown = true;
      draw();
    });
  }

  /** Carts, crates and loose berries in columns, as in the canyon. */
  function columns(blocks: number[], opts: { counts?: boolean; extra?: -1 | 0 | 1; step?: (col: number, by: number) => void } = {}): HTMLElement {
    const cols = (blocks[0] ?? 0) > 0 || needH() ? [0, 1, 2] : [1, 2];
    return h(
      'div',
      { class: `e-cols ${cols.length === 3 ? 'three' : ''}` },
      cols.map((col) => {
        const count = blocks[col] ?? 0;
        const unit = (cls = ''): HTMLElement => (col === 0 ? cart(cls) : col === 1 ? crate(cls) : berry(cls));
        // Ten more: the new crate is drawn in the other colour. Ten less: one crate fades.
        const extra = col === 1 ? (opts.extra ?? 0) : 0;
        return h(
          'div',
          { class: `e-col pl-${PLACE[col]}` },
          h('div', { class: 'e-col-head' }, unit('tiny'), PLACE_NAME[col], opts.counts ? h('b', { class: 'count' }, String(count + (extra > 0 ? 1 : 0))) : null),
          h(
            'div',
            { class: `e-col-body ${col === 2 ? 'ones' : ''}` },
            times(count, (i) => unit(extra < 0 && i === count - 1 ? 'going' : '')),
            extra > 0 ? unit('alt') : null,
          ),
          opts.step
            ? h(
                'div',
                { class: 'e-step' },
                button('−', () => opts.step?.(col, -1), 'btn-small e-minus'),
                button('+', () => opts.step?.(col, 1), 'btn-small btn-primary e-plus'),
              )
            : null,
        );
      }),
    );
  }

  function drawMat(): void {
    const buttons: Child[] = [];
    let note: Child = null;
    let body: Child;

    if (p.kind === 'count' && p.mode === 'howMany') {
      const one = (i: number, style?: string): HTMLElement => dot(touched.has(i) ? 'counted' : '', counting ? i + 1 : undefined, () => touch(i), style);
      body = p.scatter
        ? h('div', { class: 'e-scatter' }, spots.map(([x, y], i) => one(i, `left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%`)))
        : h('div', { class: 'e-rows' }, times(p.n, (i) => one(i)));
      note = 'Tap a berry when you count it.';
    } else if (p.kind === 'count') {
      const move = (by: number): void => {
        if (solved || revealed) return;
        sfx(by > 0 ? 'pop' : 'tap');
        basket += by;
        draw();
      };
      body = h(
        'div',
        { class: 'e-give' },
        h('div', { class: 'e-rows e-pile' }, times(p.pile - basket, () => dot('', undefined, () => move(1)))),
        h(
          'div',
          { class: 'e-basket' },
          h('div', { class: 'e-rows' }, times(basket, (i) => dot('counted', counting ? i + 1 : undefined, () => move(-1)))),
          h('span', { class: 'e-basket-label' }, 'basket'),
        ),
      );
      note = 'Tap berries to put them in the basket.';
    } else if (p.kind === 'more' && p.mode === 'piles') {
      const pile = (which: Side, n: number): HTMLElement => {
        const b = h('button', { class: 'e-side', type: 'button', 'aria-label': `${n} berries`, onclick: () => choose(which) }, h('div', { class: counting ? 'e-line' : 'e-rows' }, times(n, () => dot(which === 'right' ? 'alt' : ''))));
        b.toggleAttribute('disabled', solved || tried.has(which));
        return b;
      };
      body = h('div', { class: `e-versus ${counting ? 'lined' : ''}` }, pile('left', p.a), pile('right', p.b));
      note = 'Tap the pile.';
    } else if (p.kind === 'more') {
      const side = (which: Side, n: number): HTMLElement => {
        const b = h('button', { class: 'e-side e-num', type: 'button', onclick: () => choose(which) }, h('span', { class: 'e-numeral' }, String(n)), shown ? blocksOf(n) : null);
        b.toggleAttribute('disabled', solved || tried.has(which));
        return b;
      };
      body = h('div', { class: 'e-versus' }, side('left', p.a), side('right', p.b));
      if (!shown) buttons.push(shownButton('Show the berries'));
      else note = 'Tap the bigger number.';
    } else if (p.kind === 'ten' && p.mode === 'fill') {
      if (!shown) {
        body = h('span', { class: 'mat-note' }, 'Can you see it in your head?');
        buttons.push(shownButton('Show the crate'));
      } else {
        const fill = p;
        body = h(
          'div',
          { class: `e-frame ${fill.whole === 5 ? 'five' : ''}` },
          times(fill.whole, (i) => {
            if (i < fill.have) return h('span', { class: 'e-cell' }, dot(''));
            const k = i - fill.have;
            if (k < added) return h('span', { class: 'e-cell' }, dot('alt', counting ? k + 1 : undefined, () => setAdded(k)));
            return h('button', { class: 'e-cell empty', type: 'button', 'aria-label': 'Empty spot', onclick: () => setAdded(k + 1) }, counting ? String(k + 1) : null);
          }),
        );
        note = 'Tap the empty spots to fill them.';
      }
    } else if (p.kind === 'ten' && p.mode === 'teen') {
      const loose = p.n - 10;
      body = h(
        'div',
        { class: 'e-teen' },
        h('div', { class: 'e-crate-big' }, crate(), counting ? h('b', { class: 'e-ten' }, '10') : null),
        h('div', { class: 'e-rows' }, times(loose, (i) => dot('', counting ? 11 + i : undefined))),
      );
    } else if (p.kind === 'ten') {
      const loose = p.n - 10;
      if (packed) {
        body = h(
          'div',
          { class: 'e-teen' },
          h('div', { class: 'e-crate-big' }, crate(), h('b', { class: 'e-ten' }, '10')),
          h('div', { class: 'e-rows' }, times(loose, (i) => dot('', counting ? i + 1 : undefined))),
        );
        note = 'Ten went in the crate. Count the loose berries.';
      } else {
        body = h('div', { class: 'e-rows wide' }, times(p.n, (i) => dot(i < 10 ? 'ten-of' : '')));
        buttons.push(
          button(
            'Pack a crate',
            () => {
              sfx('pack');
              packed = true;
              draw();
            },
            'btn-primary pulse',
          ),
        );
      }
    } else if (p.mode === 'build') {
      const step = (col: number, by: number): void => {
        if (solved || revealed) return;
        const next = (built[col] ?? 0) + by;
        if (next < 0 || next > 9) return;
        sfx(by > 0 ? 'pop' : 'tap');
        built[col] = next;
        draw();
      };
      body = columns(built, { counts: counting, step });
      note = counting ? `${p.n} needs ${toBlocks(p.n).map((c, i) => (c > 0 || i > 0 ? `${c} ${PLACE_NAME[i]}` : '')).filter(Boolean).join(', ')}.` : 'Press + to add a crate or a berry.';
    } else {
      body = columns(toBlocks(p.n), { counts: counting, extra: p.mode === 'shift' && counting ? (p.by > 0 ? 1 : -1) : 0 });
    }

    replace(mat, h('div', { class: 'early-model' }, body), h('div', { class: 'mat-actions' }, note ? h('span', { class: 'mat-note' }, note) : null, buttons));
  }

  function blocksOf(n: number): HTMLElement {
    const [hundreds, tens, ones] = toBlocks(n);
    return h(
      'div',
      { class: 'e-mini' },
      hundreds > 0 ? h('div', { class: 'blocks-group' }, times(hundreds, () => cart('tiny'))) : null,
      tens > 0 ? h('div', { class: 'blocks-group' }, times(tens, () => crate('tiny'))) : null,
      ones > 0 ? h('div', { class: 'blocks-group ones' }, times(ones, () => berry('tiny'))) : null,
    );
  }

  function setAdded(n: number): void {
    if (solved) return;
    sfx('pop');
    added = n;
    drawMat();
  }

  /** A number with each digit in its place colour. Unpicked digits show as a blank. */
  function placed(values: Array<number | null>, withH: boolean): HTMLElement {
    const cols = withH ? [0, 1, 2] : [1, 2];
    return h(
      'span',
      { class: 'e-digits' },
      cols.map((col) => h('span', { class: `e-digit pl-${PLACE[col]} ${values[col] === null ? 'blank' : ''}` }, values[col] === null ? '?' : String(values[col]))),
    );
  }

  const word = (text: string): HTMLElement => h('span', { class: 'note-word' }, text);
  const blank = (): HTMLElement => h('span', { class: `e-pick ${picked === null ? 'blank' : ''}` }, picked === null ? '?' : String(picked));

  function drawNotation(): void {
    if (p.kind === 'count') {
      replace(notation, p.mode === 'howMany' ? blank() : [word('make'), h('span', { class: 'e-pick' }, String(p.n))]);
    } else if (p.kind === 'more') {
      const sign = !solved ? '?' : p.a > p.b ? '>' : '<';
      replace(notation, h('div', { class: 'e-sum' }, String(p.a), h('span', { class: 'e-sign' }, sign), String(p.b)));
    } else if (p.kind === 'ten') {
      if (p.mode === 'fill') replace(notation, h('div', { class: 'e-sum' }, `${p.have} +`, blank()), h('div', { class: 'e-sum' }, `= ${p.whole}`));
      else if (p.mode === 'teen') replace(notation, h('div', { class: 'e-sum' }, `10 + ${p.n - 10}`), h('div', { class: 'e-sum' }, '=', blank()));
      else replace(notation, h('div', { class: 'e-sum' }, `${p.n} =`), h('div', { class: 'e-sum' }, '10 +', blank()));
    } else if (p.mode === 'build') {
      replace(notation, word('make'), placed(toBlocks(p.n), p.n >= 100));
    } else if (p.mode === 'read') {
      replace(notation, placed(digits, needH()));
    } else {
      replace(notation, h('div', { class: 'e-sum' }, `${p.n} ${p.by > 0 ? '+' : '−'} 10`), h('div', { class: 'e-sum' }, '=', placed(digits, needH())));
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

  function drawAnswer(): void {
    const how = way();
    if (how === 'chips') {
      const range = chipRange();
      const right = countAnswer(p);
      const rows = range.length > 11 ? [range.slice(0, 10), range.slice(10)] : [range];
      replace(answer, rows.map((row) => h('div', { class: 'ans-row pl-o e-chips' }, row.map((n) => chip(n, picked === n, right === n, () => (picked = n))))));
    } else if (how === 'places') {
      const cols = needH() ? [0, 1, 2] : [1, 2];
      const right = toBlocks(p.kind === 'place' ? p.answer : 0);
      replace(
        answer,
        cols.map((col) =>
          h(
            'div',
            { class: `ans-row pl-${PLACE[col]}` },
            h('span', { class: 'ans-label' }, col === 0 ? cart('tiny') : col === 1 ? crate('tiny') : berry('tiny'), PLACE_NAME[col]),
            times(10, (d) => chip(d, digits[col] === d, right[col] === d, () => (digits[col] = d))),
          ),
        ),
      );
    } else if (how === 'side') {
      replace(answer, h('span', { class: 'mat-note' }, p.kind === 'more' && p.mode === 'piles' ? 'Tap the pile.' : 'Tap the number.'));
    } else {
      replace(answer, h('span', { class: 'mat-note' }, p.kind === 'count' ? 'Fill the basket, then press Check.' : 'Make the number, then press Check.'));
    }
  }

  function ready(): boolean {
    const how = way();
    if (how === 'chips') return picked !== null;
    if (how === 'places') return digits[1] !== null && digits[2] !== null && (!needH() || digits[0] !== null);
    if (how === 'model') return p.kind === 'count' ? basket > 0 : built.some((c) => c > 0);
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
      replace(status, h('span', { class: 'mat-note' }, `Trying it out: level ${(progress(ownKind).step ?? 0) + 1} of ${countTop(ownKind) + 1}`));
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

  function miss(error: CountError): void {
    errors.push(error);
    sfx('soft');
    react('tilt');
    shown = true;
    // A third miss: more tries would be guessing. Show the answer and let her copy it.
    if (answers.length >= 3 && way() !== 'side') {
      revealed = true;
      helped = true;
      picked = null;
      digits = [null, null, null];
      if (way() === 'model') {
        if (p.kind === 'count') basket = p.n;
        else if (p.kind === 'place') built = toBlocks(p.n);
        coach('Let me show you. Look, then press Check.', 'show_you_look');
      } else {
        coach('Let me show you. Press the glowing numbers.', 'show_you');
      }
      draw();
      return;
    }
    if (stretch && answers.length === 1) coach('That one was extra tricky. Let us look at it together.', 'stretch_miss');
    else if (error === 'other-pile' && p.kind === 'more' && p.mode === 'numbers') coach('Not yet. Look at the crates first. More crates means a bigger number.', 'eh_crates_first');
    else if (error === 'other-pile' && p.kind === 'more' && p.mode === 'piles' && p.ask === 'fewer') coach(countCoaching(p, error), 'ec_fewer');
    else if (error === 'wrong-way' || error === 'changed-the-ones') coach(countCoaching(p, error), p.kind === 'place' && p.mode === 'shift' && p.by < 0 ? 'eh_crate_less' : 'eh_crate_more');
    else coach(countCoaching(p, error), COACH_CLIP[error]);
    // A second miss on the same problem, or any miss on a stretch or a pick-one problem: count it together.
    if ((answers.length >= 2 || stretch || way() === 'side') && !counting) {
      window.setTimeout(() => {
        if (!gone && !solved) helpNow();
      }, 2600);
    }
    draw();
  }

  function choose(which: Side): void {
    if (solved || p.kind !== 'more') return;
    answers.push(which);
    if (which === p.answer) {
      succeed();
      return;
    }
    tried.add(which);
    miss(classifyCountError(p, which));
  }

  function doCheck(): void {
    if (solved || !ready()) return;
    const how = way();
    let given: number;
    if (how === 'chips') given = picked ?? 0;
    else if (how === 'places') given = (digits[0] ?? 0) * 100 + (digits[1] ?? 0) * 10 + (digits[2] ?? 0);
    else given = p.kind === 'count' ? basket : built[0] * 100 + built[1] * 10 + built[2];
    answers.push(String(given));
    if (given === countAnswer(p)) succeed();
    else miss(classifyCountError(p, given));
  }

  function succeed(): void {
    solved = true;
    const firstTry = answers.length === 1 && !helped;
    const worked = answers.length <= 3;
    const at = progress(p.kind);
    const before = at.step ?? 0;
    const moved = record({ rung: before, recent: (at.recent ?? []) as Mark[] }, countTop(p.kind), firstTry, stretch);
    at.step = moved.rung;
    at.recent = moved.recent;
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
    save.countLog ??= [];
    save.countLog.push({
      t: Date.now(),
      day: dayKey(),
      monster: id,
      kind: p.kind,
      text: countText(p),
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
    if (moved.moved > 0) toasts(el, [{ text: 'Level up! The problems grow with you.', kind: 'level', clip: 't_harder' }]);

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
            lines: [`${sp.name} is full of berries and very happy.`],
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
        const result = giveStar(save, id);
        app.commit();
        draw();
        const again = { label: 'Play again', onClick: () => app.go('early', { id, kind: ownKind }) };
        const home = { label: 'Meadow', onClick: () => app.go('home'), primary: true };
        window.setTimeout(() => {
          if (result === 'grown') {
            celebrate(el, { id, stage: m.stage, title: `${name} evolved!`, fx: { kind: 'evolve', from: (m.stage - 1) as Stage }, voice: [nameClip(id), 'grew_up'], lines: ['Look how strong!'], buttons: [home], big: true });
          } else if (result === 'star') {
            celebrate(el, { id, stage: m.stage, title: `${name} got a star!`, voice: [nameClip(id), 'got_star'], lines: [growthLine(m, name)], buttons: [again, home] });
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
    { class: 'screen canyon-screen early-screen' },
    backdrop('canyon'),
    h('div', { class: 'topbar' }, practice ? button('Back', () => app.go('grownups'), 'btn-small') : backButton(app)),
    h(
      'div',
      { class: 'cy-left' },
      bubble,
      pet,
      h('div', { class: 'nameplate' }, wild ? `Wild ${sp.name}` : name),
      status,
      h('div', { class: 'cy-help' }, button('Show me', helpNow, 'btn-small help-walk')),
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
  p = makeCountProblem(ownKind);
  newProblem();

  return {
    el,
    dispose() {
      gone = true;
    },
    onKey(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (solved && !partied) newProblem();
      else doCheck();
    },
  };
};
