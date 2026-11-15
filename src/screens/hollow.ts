import { say, sfx } from '../audio';
import { HOLLOW_ORDER, SPECIES, TRIPS_PER_ROUND, TRIPS_TO_BEFRIEND, type SpeciesId, type Stage } from '../data/monsters';
import { fracStartStep } from '../intake';
import { LESSON_FOR_KIND, type LessonId } from '../lessons';
import {
  bottomChoices,
  classifyFracError,
  classifyPick,
  fracTop,
  isRight,
  makeFracProblem,
  MAX_TOP,
  problemText,
  type FracError,
  type FracKind,
  type FracProblem,
  type Side,
} from '../math/fractions';
import { record, wantsStretch, type Mark } from '../ladder';
import { gainLines, onRound, onTrip } from '../rewards';
import { befriend, dayKey, displayName, giveStar, growth, growthLine, isFriend, monster, today } from '../state';
import { teach, teachIfDue } from '../tutor';
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
import { h, pick, replace, times, type Child } from '../ui/dom';
import { fracEl, honeyBar, honeyTray, rich } from '../ui/models';
import { fracClip, nameClip } from '../voice/lines';

const COACH: Record<FracError, [string, string]> = {
  swapped: ['So close! The bottom number is how many pieces in all. The top number is how many are gold.', 'fc_swapped'],
  'counted-empty': ['Count the gold pieces, not the empty ones.', 'fc_empty'],
  'part-to-part': ['The bottom number counts all the pieces, gold and empty together.', 'fc_partpart'],
  'bigger-bottom': ['A bigger bottom number means more cuts. More cuts make smaller pieces.', 'fc_bigger_bottom'],
  'times-both': ['The pieces stay the same size, so the bottom number stays the same. Only the top number grows.', 'fc_times_both'],
  'times-bottom': ['The pieces stay the same size, so the bottom number stays the same. Only the top number grows.', 'fc_times_both'],
  'times-added': ['It is times, not plus. Count every piece you put down.', 'fc_times_added'],
  'tray-added': ['Do not add the bottom numbers. Count all the small pieces in the whole tray.', 'fc_tray_added'],
  'tray-one-cut': ['That is only one of the two cuts. Cut the tray both ways and count.', 'fc_tray_one'],
  'wrong-cuts': ['Look at the bottom number. That is how many equal pieces the bar needs.', 'fc_cuts'],
  'wrong-fill': ['Look at the top number. That is how many pieces to fill.', 'fc_fill'],
  other: ['Not yet. Count the pieces in the whole bar. Then count the gold ones.', 'fc_count'],
};

const CUT_CHOICES = [2, 3, 4, 5, 6, 8];

/**
 * Honey Hollow: fractions with honey bars cut into equal pieces. Four
 * monsters, four ideas: what a fraction is, equal and bigger fractions, a
 * fraction times a whole number, and a piece of a piece.
 */
export const hollowScreen: Screen = (app, params) => {
  const { save } = app;
  const id = params.id as SpeciesId;
  const sp = SPECIES[id];
  const m = monster(save, id);
  const wild = !m.friend;
  const name = displayName(save, id);
  const ownKind: FracKind = sp.frac ?? 'name';
  const goal = TRIPS_TO_BEFRIEND * 2;
  const here = { screen: 'hollow' as const, params: { id } };

  function owner(kind: FracKind): SpeciesId {
    return HOLLOW_ORDER.find((c) => SPECIES[c].frac === kind) ?? id;
  }

  /** Her rung on this idea's ladder. It starts from the first-day check. */
  function rungFor(kind: FracKind): number {
    const o = monster(save, owner(kind));
    if (o.step === undefined) o.step = fracStartStep(save.intakeLevels, kind);
    o.step = Math.max(0, Math.min(fracTop(kind), o.step));
    return o.step;
  }

  let p: FracProblem;
  let top: number | null = null;
  let bottom: number | null = null;
  /** Building and matching: how the bar is cut, and which pieces she filled. */
  let cuts = 0;
  let fill = new Set<number>();
  /** Fraction times a whole number: how many days of honey are on the bars. */
  let placed = 0;
  /** A piece of a piece: 0 whole tray, 1 first cut, 2 both cuts. */
  let trayStage: 0 | 1 | 2 = 0;
  let barsShown = true;
  /** This problem comes from the rung above hers: a miss costs nothing and brings help at once. */
  let stretch = false;
  let tried = new Set<Side>();
  let answers: string[] = [];
  let errors: FracError[] = [];
  let solved = false;
  let partied = false;
  let helped = false;
  /** Help is on: pieces are numbered, or the pieces to tap glow. */
  let counting = false;
  let lessonDue: LessonId | undefined;
  let gone = false;

  const pet = monsterImg(id, m.stage, 220, 'bob');
  const status = h('div', { class: 'cy-status' });
  const bubble = h('div', { class: 'bubble cy-bubble' });
  const story = h('p', { class: 'story' });
  const mat = h('div', { class: 'mat hollow-mat' });
  const notation = h('div', { class: 'notation hollow-note' });
  const answer = h('div', { class: 'answer' });
  const action = h('div', { class: 'cy-check' });

  const usesChips = (): boolean => (p.kind === 'name' && p.mode === 'name') || p.kind === 'times' || p.kind === 'tray';
  const usesFill = (): boolean => (p.kind === 'name' && p.mode === 'build') || (p.kind === 'same' && p.mode === 'match');

  function storyParts(): Child[] {
    if (p.kind === 'name') return p.mode === 'name' ? ['How much of the bar is gold?'] : rich(`Make ${p.f.n}/${p.f.d} of a bar.`);
    if (p.kind === 'same') return p.mode === 'compare' ? ['Which bar has more honey?'] : ['Make the same amount of honey.'];
    if (p.kind === 'times') return rich(`${name} eats ${p.f.n}/${p.f.d} of a bar each day. How much in ${p.whole} days?`);
    return rich(`${name} wants ${p.a.n}/${p.a.d} of ${p.b.n}/${p.b.d} of the tray. How much is that?`);
  }

  function storyClips(first = false): Array<string | null> {
    if (p.kind === 'name') {
      if (p.mode === 'name') return [first ? 'fq_name' : 'fq_name_s'];
      return [p.chooseCuts ? 'fq_build_cut' : 'fq_build', fracClip(p.f)];
    }
    if (p.kind === 'same') return [p.mode === 'compare' ? 'fq_compare' : 'fq_match'];
    if (p.kind === 'times') return [first ? 'fq_times' : 'fq_times_s'];
    return [first ? 'fq_tray' : 'fq_tray_s'];
  }

  function chooseKind(): FracKind {
    if (wild) return ownKind;
    // The last problem of a round with a friend reviews another idea she already knows.
    if (m.roundTrips === TRIPS_PER_ROUND - 1) {
      const others = HOLLOW_ORDER.filter((c) => c !== id && isFriend(save, c)).map((c) => SPECIES[c].frac as FracKind);
      if (others.length > 0) return pick(others);
    }
    return ownKind;
  }

  function newProblem(): void {
    if (lessonDue) {
      const due = lessonDue;
      lessonDue = undefined;
      if (teachIfDue(app, due, here)) return;
    }
    const kind = chooseKind();
    const rung = rungFor(kind);
    stretch = wantsStretch({ rung, recent: (monster(save, owner(kind)).recent ?? []) as Mark[] }, fracTop(kind));
    p = makeFracProblem(kind, Math.random, rung + (stretch ? 1 : 0));
    top = null;
    bottom = null;
    cuts = p.kind === 'name' && p.mode === 'build' ? (p.chooseCuts ? 0 : p.f.d) : p.kind === 'same' && p.mode === 'match' ? p.d : 0;
    fill = new Set();
    placed = 0;
    trayStage = 0;
    // On the top rungs she starts from the numbers; the picture is one press away.
    barsShown = !('bare' in p && p.bare);
    tried = new Set();
    answers = [];
    errors = [];
    solved = false;
    helped = false;
    counting = false;
    replace(story, storyParts());
    replace(bubble, stretch ? 'A tricky one! Give it a try.' : 'Honey time!');
    draw();
    const tip = `hollow-${p.kind}${p.kind === 'tray' || p.kind === 'times' ? '' : `-${p.mode}`}`;
    const first = !save.seenTips.includes(tip);
    const veryFirst = !save.seenTips.includes('hollow');
    if (first) save.seenTips.push(tip);
    if (veryFirst) save.seenTips.push('hollow');
    if (first || veryFirst) app.commit();
    say(veryFirst ? 'hollow_tip' : null, stretch ? 'stretch_try' : null, nameClip(id), ...storyClips(first));
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

  // ---- moves on the model -------------------------------------------------

  function setCuts(n: number): void {
    if (solved) return;
    sfx('pack');
    cuts = n;
    fill = new Set();
    draw();
  }

  function tapPiece(i: number): void {
    if (solved) return;
    sfx('tap');
    if (fill.has(i)) fill.delete(i);
    else fill.add(i);
    draw();
  }

  function addPiece(): void {
    if (p.kind !== 'times' || solved || placed >= p.whole) return;
    placed += 1;
    sfx('pop');
    react('munch');
    if (placed === p.whole) coach('All the pieces are down. Count them. The pieces are still the same size.', 'f_all_pieces');
    draw();
  }

  function cutTray(): void {
    if (p.kind !== 'tray' || solved || trayStage >= 2) return;
    trayStage = (trayStage + 1) as 1 | 2;
    sfx('pack');
    if (trayStage === 1) coach('That is the first piece, in gold. Now take a part of the gold.', 'f_tray_cut1');
    else coach('The dark gold is the piece of the piece. Count the dark pieces. Then count all the small pieces in the tray.', 'f_tray_cut2');
    draw();
  }

  /** Counting help: finish the model, number the pieces, or light up what to tap. */
  function helpNow(): void {
    if (solved || counting) return;
    helped = true;
    counting = true;
    barsShown = true;
    if (p.kind === 'times') placed = p.whole;
    if (p.kind === 'tray') trayStage = 2;
    if (p.kind === 'name' && p.mode === 'build') {
      cuts = p.f.d;
      fill = new Set();
    }
    if (usesFill()) coach('Let me help. Tap the pieces that glow.', 'f_tap_glow');
    else if (usesChips()) coach('Let us count together. The gold pieces go on top. The pieces in one whole go on the bottom.', 'f_count_with_me');
    else coach('Here are the bars to help.', 'f_show_bars');
    draw();
  }

  // ---- drawing --------------------------------------------------------------

  function barRow(label: HTMLElement, bar: HTMLElement): HTMLElement {
    return h('div', { class: 'fbars-row' }, label, bar);
  }

  function drawMat(): void {
    const buttons: Child[] = [];
    let note: Child = null;
    let body: Child;

    if (p.kind === 'name' && p.mode === 'name') {
      const lit = p.on;
      body = honeyBar(p.f.d, lit ? (i) => lit.includes(i) : p.f.n, { width: 540, height: 120, numbers: counting });
      note = counting ? `Gold pieces: ${p.f.n}. Pieces in all: ${p.f.d}.` : 'Count the gold pieces, and all the pieces.';
    } else if (p.kind === 'name') {
      const want = p.f;
      body = honeyBar(Math.max(cuts, 1), (i) => fill.has(i), {
        width: 540,
        height: 120,
        onTap: cuts > 0 ? tapPiece : undefined,
        ghost: counting ? (i) => i < want.n : undefined,
      });
      if (p.chooseCuts && !counting) {
        note = 'Cut into';
        for (const n of CUT_CHOICES) buttons.push(button(String(n), () => setCuts(n), `cut-chip ${cuts === n ? 'on' : ''}`));
      } else {
        note = cuts > 0 ? 'Tap pieces to fill them with honey.' : null;
      }
    } else if (p.kind === 'same' && p.mode === 'compare') {
      if (barsShown) {
        body = h(
          'div',
          { class: 'fbars' },
          barRow(fracEl(p.a.n, p.a.d), honeyBar(p.a.d, p.a.n, { width: 460, height: 84 })),
          barRow(fracEl(p.b.n, p.b.d), honeyBar(p.b.d, p.b.n, { width: 460, height: 84 })),
        );
      } else {
        body = h('div', { class: 'fbars' }, h('div', { class: 'frac-versus' }, fracEl(p.a.n, p.a.d, 'big'), h('span', null, '?'), fracEl(p.b.n, p.b.d, 'big')));
        buttons.push(
          button('Show the bars', () => {
            barsShown = true;
            draw();
          }),
        );
      }
    } else if (p.kind === 'same') {
      const want = p.answer;
      body = h(
        'div',
        { class: 'fbars' },
        barRow(fracEl(p.a.n, p.a.d), honeyBar(p.a.d, p.a.n, { width: 460, height: 84 })),
        barRow(
          fracEl(fill.size, p.d),
          honeyBar(p.d, (i) => fill.has(i), { width: 460, height: 84, onTap: tapPiece, ghost: counting ? (i) => i < want : undefined }),
        ),
      );
      note = 'Tap pieces in the bottom bar.';
    } else if (!barsShown) {
      body = h('div', { class: 'fbars' }, h('span', { class: 'mat-note' }, 'Can you see it in your head?'));
      buttons.push(
        button(p.kind === 'times' ? 'Show the bars' : 'Show the tray', () => {
          barsShown = true;
          draw();
        }),
      );
    } else if (p.kind === 'times') {
      const total = placed * p.f.n;
      const bars = Math.max(1, Math.ceil(total / p.f.d));
      const d = p.f.d;
      body = h(
        'div',
        { class: 'fbars tight' },
        times(bars, (k) => honeyBar(d, Math.max(0, Math.min(d, total - k * d)), { width: 500, height: bars > 3 ? 46 : 64, numbers: counting, countFrom: k * d })),
      );
      if (placed < p.whole) {
        note = `Day ${placed + 1} of ${p.whole}`;
        buttons.push(button(['Add ', fracEl(p.f.n, p.f.d, 'small')], addPiece, 'btn-primary pulse'));
      } else {
        note = counting ? `Gold pieces: ${total}. Pieces in one whole bar: ${d}.` : `All ${p.whole} days are down. Count the gold pieces.`;
      }
    } else {
      body =
        trayStage === 0
          ? honeyTray(1, 0)
          : trayStage === 1
            ? honeyTray(p.b.d, p.b.n)
            : honeyTray(p.b.d, p.b.n, p.a.d, p.a.n, { numbers: counting });
      if (trayStage === 0) buttons.push(button(['First: ', fracEl(p.b.n, p.b.d, 'small'), ' of the tray'], cutTray, 'btn-primary pulse'));
      else if (trayStage === 1) buttons.push(button(['Then: ', fracEl(p.a.n, p.a.d, 'small'), ' of the gold'], cutTray, 'btn-primary pulse'));
      else note = counting ? `Dark pieces: ${p.answer.n}. Small pieces in the tray: ${p.answer.d}.` : 'Count the dark pieces, and all the small pieces.';
    }

    replace(mat, h('div', { class: 'hollow-model' }, body), h('div', { class: 'mat-actions' }, note ? h('span', { class: 'mat-note' }, note) : null, buttons));
  }

  function drawNotation(): void {
    const mine = fracEl(top ?? '?', bottom ?? '?', `big ${top !== null && bottom !== null ? 'filled' : 'blank'}`);
    if (p.kind === 'name' && p.mode === 'name') replace(notation, mine);
    else if (p.kind === 'name') replace(notation, h('span', { class: 'note-word' }, 'make'), fracEl(p.f.n, p.f.d, 'big'));
    else if (p.kind === 'same' && p.mode === 'compare') {
      const sign = !solved ? '?' : p.answer === 'same' ? '=' : p.answer === 'left' ? '>' : '<';
      replace(notation, h('div', { class: 'frac-versus' }, fracEl(p.a.n, p.a.d, 'big'), h('span', null, sign), fracEl(p.b.n, p.b.d, 'big')));
    } else if (p.kind === 'same') {
      replace(notation, h('div', { class: 'frac-versus' }, fracEl(p.a.n, p.a.d, 'big'), h('span', null, '='), fracEl(fill.size, p.d, 'big')));
    } else if (p.kind === 'times') {
      replace(notation, h('div', { class: 'frac-versus' }, h('span', null, `${p.whole} ×`), fracEl(p.f.n, p.f.d, 'big')), h('span', { class: 'note-word' }, '='), mine);
    } else {
      replace(notation, h('div', { class: 'frac-versus' }, fracEl(p.a.n, p.a.d, 'big'), h('span', null, '×'), fracEl(p.b.n, p.b.d, 'big')), h('span', { class: 'note-word' }, '='), mine);
    }
  }

  function chipRow(cls: string, label: string, values: number[], current: number | null, set: (n: number) => void): HTMLElement {
    return h(
      'div',
      { class: `ans-row ${cls}` },
      h('span', { class: 'ans-label' }, label),
      values.map((n) =>
        h(
          'button',
          {
            class: `ans-chip ${current === n ? 'on' : ''}`,
            type: 'button',
            disabled: solved,
            onclick: () => {
              if (solved) return;
              sfx('tap');
              set(n);
              drawAnswer();
              drawNotation();
              drawAction();
            },
          },
          String(n),
        ),
      ),
    );
  }

  function drawAnswer(): void {
    if (usesChips()) {
      const naming = p.kind === 'name';
      replace(
        answer,
        chipRow('pl-top', naming ? 'gold' : 'top', times(MAX_TOP, (i) => i + 1), top, (n) => (top = n)),
        chipRow('pl-bottom', naming ? 'in all' : 'bottom', bottomChoices(p), bottom, (n) => (bottom = n)),
      );
    } else if (p.kind === 'same' && p.mode === 'compare') {
      const side = (which: Side, label: Child): HTMLElement => {
        const b = button(label, () => choose(which), 'btn-choice side-choice');
        b.toggleAttribute('disabled', solved || tried.has(which));
        return b;
      };
      replace(
        answer,
        h('div', { class: 'choice-row side-row' }, side('left', fracEl(p.a.n, p.a.d)), side('same', 'same'), side('right', fracEl(p.b.n, p.b.d))),
      );
    } else {
      replace(answer, h('span', { class: 'mat-note' }, 'Fill the bar, then press Check.'));
    }
  }

  function ready(): boolean {
    if (usesChips()) return top !== null && bottom !== null;
    if (usesFill()) return cuts > 0 && fill.size > 0;
    return false;
  }

  function drawAction(): void {
    if (solved) {
      replace(action, partied ? null : button('Next one', newProblem, 'btn-primary btn-big'));
      return;
    }
    if (p.kind === 'same' && p.mode === 'compare') {
      replace(action, null);
      return;
    }
    const check = button([icon('check'), 'Check'], doCheck, 'btn-primary btn-big');
    check.toggleAttribute('disabled', !ready());
    replace(action, check);
  }

  function drawStatus(): void {
    const drop = (cls: string): HTMLElement => h('span', { class: `drop ${cls}` });
    if (wild) {
      replace(
        status,
        h(
          'div',
          { class: 'trip-meter' },
          times(TRIPS_TO_BEFRIEND, (i) => drop(m.trips >= 2 * (i + 1) ? 'full' : m.trips === 2 * i + 1 ? 'half' : 'empty')),
        ),
      );
    } else {
      replace(
        status,
        h('div', { class: 'trip-meter' }, times(TRIPS_PER_ROUND, (i) => drop(i < m.roundTrips ? 'full' : 'empty'))),
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

  function miss(error: FracError, text?: string, clip?: string): void {
    errors.push(error);
    sfx('soft');
    react('tilt');
    barsShown = true;
    const [t, c] = COACH[error];
    if (stretch && answers.length === 1) coach('That one was extra tricky. Let us look at it together.', 'stretch_miss');
    else coach(text ?? t, clip ?? c);
    // A second miss on the same problem, or any miss on a stretch problem: count it together.
    if ((answers.length >= 2 || stretch) && !counting) {
      window.setTimeout(() => {
        if (!gone && !solved) helpNow();
      }, 2600);
    }
    draw();
  }

  function choose(which: Side): void {
    if (solved || p.kind !== 'same' || p.mode !== 'compare') return;
    answers.push(which);
    if (which === p.answer) {
      succeed();
      return;
    }
    tried.add(which);
    barsShown = true;
    const error = classifyPick(p, which);
    if (error === 'bigger-bottom') miss(error);
    else miss('other', 'Not yet. Look at how far the gold goes in each bar.', 'fc_look_bars');
  }

  function doCheck(): void {
    if (solved || !ready()) return;
    if (usesChips()) {
      const given = { n: top ?? 0, d: bottom ?? 0 };
      answers.push(`${given.n}/${given.d}`);
      if (isRight(p, given)) {
        succeed();
        return;
      }
      const error = classifyFracError(p, given);
      if (error === 'other' && p.kind === 'times') miss(error, 'Not yet. Put the pieces down and count them.', 'fc_times_other');
      else if (error === 'other' && p.kind === 'tray') miss(error, 'Not yet. Cut the tray both ways. Then count the dark pieces, and all the small pieces.', 'fc_tray_other');
      else miss(error);
      return;
    }
    if (p.kind === 'name' && p.mode === 'build') {
      answers.push(`${fill.size}/${cuts}`);
      if (cuts === p.f.d && fill.size === p.f.n) succeed();
      else miss(cuts !== p.f.d ? 'wrong-cuts' : 'wrong-fill');
      return;
    }
    if (p.kind === 'same' && p.mode === 'match') {
      answers.push(`${fill.size}/${p.d}`);
      if (fill.size === p.answer) succeed();
      else miss('wrong-fill', 'Not yet. Make the gold go just as far as in the top bar.', 'fc_match');
    }
  }

  function succeed(): void {
    solved = true;
    const firstTry = answers.length === 1 && !helped;
    const worked = answers.length <= 3;
    const o = monster(save, owner(p.kind));
    const before = rungFor(p.kind);
    const moved = record({ rung: before, recent: (o.recent ?? []) as Mark[] }, fracTop(p.kind), firstTry, stretch);
    // Stepping down means repeated misses: reteach the idea before the next problem.
    if (moved.moved < 0) lessonDue = LESSON_FOR_KIND[p.kind];
    o.step = moved.rung;
    o.recent = moved.recent;
    const day = today(save);
    if (worked) day.trips += 1;
    save.fracLog ??= [];
    save.fracLog.push({
      t: Date.now(),
      day: dayKey(),
      monster: id,
      kind: p.kind,
      text: problemText(p),
      answers: [...answers],
      firstTry,
      errors: [...errors],
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
    if (moved.moved > 0) toasts(el, [{ text: 'Level up! The problems grow with you.', kind: 'level', clip: 't_harder' }]);
    const equal = p.kind === 'same' && (p.mode === 'match' || p.answer === 'same');
    replace(bubble, equal ? 'Yes! Different pieces, same amount.' : 'Yes! You got it!');
    say(stretch && firstTry ? 'stretch_yes' : equal ? 'f_same_yes' : 'yes');

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
            title: `${sp.name} is your friend!`,
            voice: [nameClip(id), 'new_friend'],
            lines: [`${sp.name} is full of honey and very happy.`],
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
        const again = { label: 'Play again', onClick: () => app.go('hollow', { id }) };
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

  const lessonHere = LESSON_FOR_KIND[ownKind];
  const helpRow = h(
    'div',
    { class: 'cy-help' },
    button('Show me', helpNow, 'btn-small help-walk'),
    lessonHere ? button('Teach me', () => teach(app, lessonHere, here), 'btn-small teach') : null,
  );

  const el = h(
    'div',
    { class: 'screen canyon-screen hollow-screen' },
    backdrop('hollow'),
    h('div', { class: 'topbar' }, backButton(app)),
    h('div', { class: 'cy-left' }, bubble, pet, h('div', { class: 'nameplate' }, wild ? `Wild ${sp.name}` : name), status, helpRow),
    h(
      'div',
      { class: 'card cy-panel' },
      h('div', { class: 'cy-head' }, story, speaker(() => [nameClip(id), ...storyClips()])),
      h('div', { class: 'cy-main' }, mat, notation),
      h('div', { class: 'cy-bottom' }, answer, action),
    ),
  );

  // `p` is assigned by newProblem before anything reads it.
  p = makeFracProblem(ownKind);
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
