import { say, sfx } from '../audio';
import {
  CANYON_ORDER,
  SPECIES,
  TRIPS_PER_ROUND,
  TRIPS_TO_BEFRIEND,
  type SpeciesId,
  type Stage,
} from '../data/monsters';
import {
  addBlocks,
  blocksValue,
  classifyError,
  coaching,
  isAddition,
  makeProblem,
  pack,
  toBlocks,
  topRung,
  unpack,
  type Blocks,
  type Delivery,
  type ErrorPattern,
  type Problem,
} from '../math/regroup';
import { record, wantsStretch, type Mark } from '../ladder';
import { gainLines, onRound, onTrip } from '../rewards';
import { fluent } from '../skill';
import { befriend, dayKey, displayName, giveStar, growth, growthLine, isFriend, monster, today } from '../state';
import {
  backButton,
  backdrop,
  button,
  celebrate,
  floatUp,
  icon,
  monsterImg,
  speaker,
  starRow,
  toasts,
  type Screen,
} from '../ui/common';
import { h, pick, replace, times } from '../ui/dom';
import { berry, cart, crate } from '../ui/models';
import { LESSON_FOR_KIND, type LessonId } from '../lessons';
import { teach, teachIfDue } from '../tutor';
import { addStory, nameClip, subStory } from '../voice/lines';

const COACH_CLIP: Record<ErrorPattern, string> = {
  'no-carry': 'c_no_carry',
  'smaller-from-larger': 'c_need_open',
  'forgot-borrowed-ten': 'c_need_open',
  'reversed-digits': 'c_reversed',
  'wrong-operation': 'c_grows',
  'off-by-one': 'c_off_one',
  'off-by-ten': 'c_off_ten',
  other: 'c_other',
};

const PLACE = ['h', 't', 'o'] as const;
const PLACE_VALUE = [100, 10, 1] as const;
const PLACE_NAME = ['carts', 'crates', 'loose'] as const;

/**
 * Berry Canyon: 2-digit addition and subtraction with place-value blocks.
 * A crate is ten berries. Packing a crate is carrying; opening one is borrowing.
 */
export const canyonScreen: Screen = (app, params) => {
  const { save } = app;
  const id = params.id as SpeciesId;
  const sp = SPECIES[id];
  const m = monster(save, id);
  const wild = !m.friend;
  const name = displayName(save, id);
  const ownType = sp.delivery ?? 'add';
  const goal = TRIPS_TO_BEFRIEND * 2;

  // The placement check showed she can already do this kind: a shorter road to friendship.
  if (wild && m.trips === 0 && save.fast[ownType] && !save.tripLog.some((t) => t.monster === id)) {
    m.trips = 6;
  }

  /** The monster that owns a kind of trip keeps that kind's problem size. */
  function owner(type: Delivery): SpeciesId {
    return CANYON_ORDER.find((c) => SPECIES[c].delivery === type) ?? id;
  }

  /** Her rung on this kind's ladder. It starts from the first-day check. */
  function rungFor(type: Delivery): number {
    const o = monster(save, owner(type));
    // Saves from before the first-day check start at the full two-digit range.
    if (o.step === undefined) o.step = save.startStep ? (save.startStep[type] ?? 0) : topRung(type) - 1;
    o.step = Math.max(0, Math.min(topRung(type), o.step));
    return o.step;
  }

  let p: Problem;
  let adding = true;
  let needH = false;
  let pile: Blocks = [0, 0, 0];
  let incoming: Blocks | null = null;
  let eaten = 0;
  let packed: [number, number] = [0, 0]; // packs into hundreds, into tens
  let opened = 0;
  let shown = true;
  let showCounts = false;
  let usedBlocks = false;
  let answers: number[] = [];
  let errors: ErrorPattern[] = [];
  let digits: [number | null, number | null, number | null] = [null, null, null];
  let solved = false;
  let partied = false;
  /** The step-by-step walkthrough is running. */
  let walking = false;
  let helped = false;
  /** This trip comes from the rung above hers: a miss costs nothing and brings help at once. */
  let stretch = false;
  /** A lesson to replay before the next trip, set when the game sees a repeated struggle. */
  let lessonDue: LessonId | undefined;
  const here = { screen: 'canyon' as const, params: { id } };

  const pet = monsterImg(id, m.stage, 220, 'bob');
  const status = h('div', { class: 'cy-status' });
  const bubble = h('div', { class: 'bubble cy-bubble' });
  const story = h('p', { class: 'story' });
  const mat = h('div', { class: 'mat' });
  const notation = h('div', { class: 'notation' });
  const answer = h('div', { class: 'answer' });
  const action = h('div', { class: 'cy-check' });

  function storyText(): string {
    return adding
      ? `${name} has ${p.a} berries. Here come ${p.b} more. How many now?`
      : `${name} has ${p.a} berries and eats ${p.b}. How many are left?`;
  }

  function storyClips(): Array<string | null> {
    return [nameClip(id), ...(adding ? addStory(p.a, p.b) : subStory(p.a, p.b))];
  }

  function chooseType(): Delivery {
    if (wild) return ownType;
    // The last trip of a round with a friend reviews another kind she already knows.
    if (m.roundTrips === TRIPS_PER_ROUND - 1) {
      const others = CANYON_ORDER.filter((c) => c !== id && isFriend(save, c)).map((c) => SPECIES[c].delivery as Delivery);
      if (others.length > 0) return pick(others);
    }
    return ownType;
  }

  function newTrip(): void {
    if (lessonDue) {
      const due = lessonDue;
      lessonDue = undefined;
      if (teachIfDue(app, due, here)) return;
    }
    walking = false;
    helped = false;
    const type = chooseType();
    adding = isAddition(type);
    const rung = rungFor(type);
    stretch = wantsStretch({ rung, recent: (monster(save, owner(type)).recent ?? []) as Mark[] }, topRung(type));
    // The berries step back only once this kind of trip goes well without them.
    const sure = !wild && !stretch && fluent(save, type);
    p = makeProblem(type, Math.random, rung + (stretch ? 1 : 0));
    needH = p.answer >= 100;
    pile = toBlocks(p.a);
    incoming = adding ? toBlocks(p.b) : null;
    eaten = 0;
    packed = [0, 0];
    opened = 0;
    shown = !sure;
    showCounts = false;
    usedBlocks = false;
    answers = [];
    errors = [];
    // Sums within 10 have no crates at all: that place starts at 0, so she only picks the loose berries.
    digits = [null, p.a < 10 && p.answer < 10 ? 0 : null, null];
    solved = false;
    replace(story, storyText());
    replace(bubble, stretch ? 'A tricky one! Give it a try.' : adding ? 'More berries!' : 'I am hungry!');
    draw();
    const firstTip = adding ? 'canyon-add' : 'canyon-sub';
    if (!save.seenTips.includes(firstTip)) {
      save.seenTips.push(firstTip);
      app.commit();
      say(...storyClips(), adding ? 'tip_add' : 'tip_sub');
    } else {
      say(stretch ? 'stretch_try' : null, ...storyClips());
    }
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

  // ---- block moves -------------------------------------------------------

  function join(): void {
    if (!incoming || solved) return;
    pile = addBlocks(pile, incoming);
    incoming = null;
    usedBlocks = true;
    sfx('pop');
    if (pile[2] >= 10) coach('So many loose berries! Ten fit in a crate. Pack a crate.', 'so_many_loose');
    else coach('Now count the crates and the loose berries.', 'now_count');
    draw();
  }

  function doPack(col: 1 | 2): void {
    const next = pack(pile, col);
    if (!next || solved) return;
    pile = next;
    usedBlocks = true;
    sfx('pack');
    if (!adding) {
      // Packing back a crate she opened and did not need.
      opened = Math.max(0, opened - 1);
      coach('Packed back into a crate. Now count what is left.', 'packed_back');
      draw();
      return;
    }
    packed[col - 1] = (packed[col - 1] ?? 0) + 1;
    if (col === 2 && pile[2] < 10) coach('Packed! Ten berries made one new crate. Now count.', 'packed');
    else if (col === 1) coach('Ten crates made one cart. That is one hundred!', 'made_cart');
    draw();
  }

  function doOpen(): void {
    if (pile[2] >= 10) return;
    const next = unpack(pile, 1);
    if (!next || solved) return;
    pile = next;
    opened += 1;
    usedBlocks = true;
    sfx('pack');
    coach('One crate opened. Now there are ten more loose berries.', 'opened');
    draw();
  }

  function feed(col: 1 | 2): void {
    if (adding || solved) return;
    const left = p.b - eaten;
    if (left === 0) {
      coach(`${name} is full. Count what is left.`, 'is_full');
      return;
    }
    const value = PLACE_VALUE[col];
    if (value > left) {
      coach(`A whole crate is too much. ${name} wants only ${left} more. Open a crate to get loose berries.`, 'crate_too_much');
      return;
    }
    if (pile[col] < 1) return;
    pile[col] -= 1;
    eaten += value;
    usedBlocks = true;
    sfx('tap');
    react('munch');
    if (eaten === p.b) coach(`${name} ate ${p.b}. How many are left? Count them.`, 'all_eaten');
    else if (p.b - eaten < 10 && pile[2] === 0 && pile[1] > 0) coach(`${name} wants ${p.b - eaten} more loose berries, but there are none. Open a crate!`, 'need_open');
    draw();
  }

  // ---- walkthrough: the game does the block moves, one step per press ----

  function startWalk(auto: boolean): void {
    if (solved || walking) return;
    walking = true;
    helped = true;
    shown = true;
    usedBlocks = true;
    coach(auto ? 'Let me show you. Press Next.' : 'Let us do it together. Press Next.', 'show_you');
    draw();
  }

  function walkStep(): void {
    if (solved) return;
    sfx('pop');
    if (adding) {
      if (incoming) {
        pile = addBlocks(pile, incoming);
        incoming = null;
        coach('First, put the berries together.', 'w_add');
      } else if (pile[2] >= 10) {
        pile = pack(pile, 2) ?? pile;
        packed[1] += 1;
        coach('More than nine loose berries. Ten of them go in a crate.', 'w_pack');
      } else if (pile[1] >= 10 && needH) {
        pile = pack(pile, 1) ?? pile;
        packed[0] += 1;
        coach('Ten crates made one cart. That is one hundred!', 'made_cart');
      } else {
        endWalk();
      }
    } else {
      const left = p.b - eaten;
      if (left >= 10 && pile[1] > 0) {
        const crates = Math.min(Math.floor(left / 10), pile[1]);
        pile[1] -= crates;
        eaten += crates * 10;
        react('munch');
        coach(`First, feed the crates: ${crates}.`, 'w_sub');
      } else if (left > 0 && pile[2] < left) {
        pile = unpack(pile, 1) ?? pile;
        opened += 1;
        coach('Not enough loose berries. So we open a crate.', 'w_open');
      } else if (left > 0) {
        pile[2] -= left;
        eaten += left;
        react('munch');
        coach(`Now feed the loose berries: ${left}.`, 'w_feed');
      } else if (pile[2] >= 10) {
        pile = pack(pile, 2) ?? pile;
        opened = Math.max(0, opened - 1);
        coach('Too many loose berries to count. Pack ten back.', 'w_pack');
      } else {
        endWalk();
      }
    }
    draw();
  }

  function endWalk(): void {
    walking = false;
    showCounts = true;
    coach('Now count. Crates first, then the loose berries. Pick the numbers below.', 'w_count');
  }

  // ---- drawing -----------------------------------------------------------

  function unit(col: number, cls = ''): HTMLElement {
    return col === 0 ? cart(cls) : col === 1 ? crate(cls) : berry(cls);
  }

  function group(col: number, count: number, cls: string): HTMLElement {
    const clickable = !adding && !solved && col > 0;
    return h(
      'div',
      { class: `grp grp-${PLACE[col]} ${cls}` },
      times(count, () =>
        clickable
          ? h('button', { class: 'feedable', type: 'button', 'aria-label': 'Feed', onclick: () => feed(col as 1 | 2) }, unit(col))
          : unit(col, cls),
      ),
    );
  }

  function drawMat(): void {
    if (!shown) {
      replace(
        mat,
        h(
          'div',
          { class: 'mat-hidden' },
          button(
            [icon('berry'), 'Show the berries'],
            () => {
              shown = true;
              usedBlocks = true;
              draw();
            },
            'btn-big',
          ),
        ),
      );
      return;
    }
    const cols = needH ? [0, 1, 2] : [1, 2];
    const colEls = cols.map((col) =>
      h(
        'div',
        { class: `mat-col col-${PLACE[col]}` },
        h(
          'div',
          { class: 'mat-col-head' },
          PLACE_NAME[col],
          showCounts && !incoming ? h('b', { class: 'count' }, String(pile[col])) : null,
        ),
        h(
          'div',
          { class: 'mat-col-body' },
          group(col, pile[col] ?? 0, ''),
          incoming ? group(col, incoming[col] ?? 0, 'alt') : null,
        ),
      ),
    );

    const buttons: HTMLElement[] = [];
    let note = '';
    if (walking) {
      note = 'Watch, then press Next.';
      buttons.push(button('Next', walkStep, 'btn-primary pulse'));
    } else if (adding) {
      if (incoming) buttons.push(button('Put together', join, 'btn-primary'));
      else {
        if (pile[2] >= 10) buttons.push(button('Pack 10 berries in a crate', () => doPack(2), 'btn-primary pulse'));
        if (pile[1] >= 10 && needH) buttons.push(button('Pack 10 crates in a cart', () => doPack(1), 'btn-primary pulse'));
        if (buttons.length === 0) note = 'Count the crates and the loose berries.';
      }
    } else if (eaten < p.b) {
      note = `Click berries to feed ${name}: ${eaten} of ${p.b}`;
      if (pile[1] > 0 && pile[2] < 10) {
        const needsOpen = p.b - eaten < 10 && pile[2] < p.b - eaten;
        buttons.push(button('Open a crate', doOpen, needsOpen ? 'btn-primary pulse' : ''));
      }
    } else if (pile[2] >= 10) {
      note = 'Too many loose berries to count.';
      buttons.push(button('Pack 10 berries in a crate', () => doPack(2), 'btn-primary pulse'));
    } else {
      note = `${name} ate ${p.b}. Count what is left.`;
    }

    replace(
      mat,
      h('div', { class: 'mat-cols' }, colEls),
      h('div', { class: 'mat-actions' }, note ? h('span', { class: 'mat-note' }, note) : null, buttons),
    );
  }

  function drawNotation(): void {
    const top = toBlocks(p.a);
    const bottom = toBlocks(p.b);
    const cols = needH ? [0, 1, 2] : [1, 2];
    const cell = (col: number, content: HTMLElement | string | null, cls = ''): HTMLElement =>
      h('span', { class: `n-cell pl-${PLACE[col]} ${cls}` }, content);
    const digitOf = (b: Blocks, col: number): string => {
      const hasHigher = col === 2 ? b[0] > 0 || b[1] > 0 : col === 1 ? b[0] > 0 : false;
      return b[col] === 0 && !hasHigher && col !== 2 ? '' : String(b[col]);
    };

    const marks = cols.map((col) => {
      if (adding) {
        const carried = col === 1 ? packed[1] : col === 0 ? packed[0] : 0;
        return cell(col, carried > 0 ? String(carried) : '', 'n-mark');
      }
      if (opened > 0 && col === 1) return cell(col, String(top[1] - opened), 'n-mark');
      if (opened > 0 && col === 2) return cell(col, String(top[2] + opened * 10), 'n-mark');
      return cell(col, '', 'n-mark');
    });

    replace(
      notation,
      h('div', { class: 'n-row n-marks' }, h('span', { class: 'n-sign' }), marks),
      h(
        'div',
        { class: 'n-row' },
        h('span', { class: 'n-sign' }),
        cols.map((col) => cell(col, digitOf(top, col), !adding && opened > 0 && col > 0 ? 'struck' : '')),
      ),
      h(
        'div',
        { class: 'n-row' },
        h('span', { class: 'n-sign' }, adding ? '+' : '−'),
        cols.map((col) => cell(col, digitOf(bottom, col))),
      ),
      h('div', { class: 'n-line' }),
      h(
        'div',
        { class: 'n-row n-answer' },
        h('span', { class: 'n-sign' }),
        cols.map((col) => cell(col, digits[col] === null ? '' : String(digits[col]), digits[col] === null ? 'blank' : 'filled')),
      ),
    );
  }

  function drawAnswer(): void {
    const cols = needH ? [0, 1, 2] : [1, 2];
    replace(
      answer,
      cols.map((col) =>
        h(
          'div',
          { class: `ans-row pl-${PLACE[col]}` },
          h('span', { class: 'ans-label' }, unit(col, 'tiny'), PLACE_NAME[col]),
          times(10, (d) =>
            h(
              'button',
              {
                class: `ans-chip ${digits[col] === d ? 'on' : ''}`,
                type: 'button',
                disabled: solved,
                onclick: () => {
                  if (solved) return;
                  sfx('tap');
                  digits[col] = d;
                  drawAnswer();
                  drawNotation();
                  drawAction();
                },
              },
              String(d),
            ),
          ),
        ),
      ),
    );
  }

  function ready(): boolean {
    return digits[1] !== null && digits[2] !== null && (!needH || digits[0] !== null);
  }

  function drawAction(): void {
    if (solved) {
      replace(action, partied ? null : button('Next trip', newTrip, 'btn-primary btn-big'));
      return;
    }
    const check = button([icon('check'), 'Check'], doCheck, 'btn-primary btn-big');
    check.toggleAttribute('disabled', !ready());
    replace(action, check);
  }

  function drawStatus(): void {
    if (wild) {
      replace(
        status,
        h(
          'div',
          { class: 'trip-meter' },
          times(TRIPS_TO_BEFRIEND, (i) => berry(m.trips >= 2 * (i + 1) ? 'full' : m.trips === 2 * i + 1 ? 'half' : 'empty')),
        ),
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

  // ---- checking ----------------------------------------------------------

  function doCheck(): void {
    if (solved || !ready()) return;
    const value = (digits[0] ?? 0) * 100 + (digits[1] ?? 0) * 10 + (digits[2] ?? 0);
    answers.push(value);
    if (value === p.answer) {
      succeed();
      return;
    }
    const pattern = classifyError(p, value);
    errors.push(pattern);
    sfx('soft');
    react('tilt');
    const wasHidden = !shown;
    shown = true;
    if (answers.length >= 2) showCounts = true;
    let text = coaching(p, pattern, name);
    let clip = COACH_CLIP[pattern];
    if (pattern === 'wrong-operation') clip = adding ? 'c_grows' : 'c_shrinks';
    if (adding && !incoming && blocksValue(pile) === p.answer && pile[2] < 10 && pile[1] < 10) {
      text = 'Not yet. Count the crates, then the loose berries.';
      clip = 'c_count';
    } else if (adding && incoming && pattern !== 'no-carry') {
      text = 'Not yet. Put the berries together and count.';
      clip = 'c_together';
    } else if (wasHidden) {
      text = 'Not yet. Here are the berries to help.';
      clip = 'c_here';
    }
    if (stretch && answers.length === 1) {
      text = 'That one was extra tricky. Let us look at it together.';
      clip = 'stretch_miss';
    }
    coach(text, clip);
    // A second miss on the same problem, or any miss on a stretch problem: work it together.
    if ((answers.length >= 2 || stretch) && !walking) {
      window.setTimeout(() => {
        if (!gone) startWalk(true);
      }, 2600);
    }
    draw();
  }

  function succeed(): void {
    solved = true;
    const firstTry = answers.length === 1 && !helped;
    const worked = answers.length <= 3;
    walking = false;
    const o = monster(save, owner(p.type));
    const before = rungFor(p.type);
    const moved = record({ rung: before, recent: (o.recent ?? []) as Mark[] }, topRung(p.type), firstTry, stretch);
    // Stepping down means repeated misses: reteach the idea before the next trip.
    if (moved.moved < 0) lessonDue = LESSON_FOR_KIND[p.type];
    o.step = moved.rung;
    o.recent = moved.recent;
    const day = today(save);
    if (worked) day.trips += 1;
    save.tripLog.push({
      t: Date.now(),
      day: dayKey(),
      monster: id,
      type: p.type,
      a: p.a,
      b: p.b,
      answers: [...answers],
      firstTry,
      errors: [...errors],
      usedBlocks,
      helped,
      rung: before,
      stretch,
    });
    sfx('yes');
    react('jump');
    if (worked) floatUp(pet, 'heart', firstTry ? 3 : 1);
    // Working it out earns the reward, with or without help. Trying answers until one fits does not.
    if (worked) toasts(el, gainLines(onTrip(save, firstTry)));
    if (moved.moved > 0) sfx('level');
    if (moved.moved > 0) toasts(el, [{ text: 'Level up! The numbers grow with you.', kind: 'level', clip: 't_harder' }]);
    replace(bubble, `Yes! ${p.a} ${adding ? '+' : '−'} ${p.b} = ${p.answer}`);
    say(stretch && firstTry ? 'stretch_yes' : 'yes');

    if (wild) {
      // Friendship grows from problems she worked out: two for a first try, one for a
      // later try, none when the answer was reached by trying many.
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
            title: `${sp.name} is your friend!`, voice: [nameClip(id), 'new_friend'],
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
        const again = { label: 'Play again', onClick: () => app.go('canyon', { id }) };
        const home = { label: 'Meadow', onClick: () => app.go('home'), primary: true };
        window.setTimeout(() => {
          if (result === 'grown') {
            celebrate(el, { id, stage: m.stage, title: `${name} evolved!`, fx: { kind: 'evolve', from: (m.stage - 1) as Stage }, voice: [nameClip(id), 'grew_up'], lines: ['Look how strong!'], buttons: [home], big: true });
          } else if (result === 'star') {
            celebrate(el, {
              id,
              stage: m.stage,
              title: `${name} got a star!`, voice: [nameClip(id), 'got_star'],
              lines: [growthLine(m, name)],
              buttons: [again, home],
            });
          } else {
            celebrate(el, {
              id,
              stage: m.stage,
              title: `${name} had so much fun!`, voice: [nameClip(id), 'full_today'],
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

  let gone = false;
  const lessonHere = LESSON_FOR_KIND[ownType];
  const helpRow = h(
    'div',
    { class: 'cy-help' },
    button('Show me', () => startWalk(false), 'btn-small help-walk'),
    lessonHere ? button('Teach me', () => teach(app, lessonHere, here), 'btn-small teach') : null,
  );

  const el = h(
    'div',
    { class: 'screen canyon-screen' },
    backdrop('canyon'),
    h('div', { class: 'topbar' }, backButton(app)),
    h('div', { class: 'cy-left' }, bubble, pet, h('div', { class: 'nameplate' }, wild ? `Wild ${sp.name}` : name), status, helpRow),
    h(
      'div',
      { class: 'card cy-panel' },
      h('div', { class: 'cy-head' }, story, speaker(storyClips)),
      h('div', { class: 'cy-main' }, mat, notation),
      h('div', { class: 'cy-bottom' }, answer, action),
    ),
  );

  // `p` is assigned by newTrip before anything reads it.
  p = makeProblem(ownType);
  newTrip();

  return {
    el,
    dispose() {
      gone = true;
    },
    onKey(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (solved && !partied) newTrip();
      else doCheck();
    },
  };
};
