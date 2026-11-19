import { say, sfx } from '../audio';
import { ALL_SPECIES, SPECIES, type SpeciesId, type Stage } from '../data/monsters';
import { record, type Mark } from '../ladder';
import { jumps, matchRungs, MATCH_TURNS, ownerOf, planMatch, type Rungs, type Turn } from '../match';
import { classifyError, isAddition, topRung, type ErrorPattern } from '../math/regroup';
import { bonusLines, climbed, gainLines, levelUpLine, onRound, onTrip, roundStars } from '../rewards';
import { dayKey, displayName, friends, growthLine, monster, today } from '../state';
import { backButton, backdrop, button, celebrate, floatUp, icon, monsterImg, speaker, toasts, type Screen } from '../ui/common';
import { h, pick, replace, times } from '../ui/dom';
import { keypad, pushDigit } from '../ui/keypad';
import { nameClip, num } from '../voice/lines';

/** How wide the power bar is drawn, in stage pixels. */
const BAR_W = 600;

/**
 * A match. The other monster's power is a number on a bar. Her monster's move
 * takes some of it away and she works out what is left; then the other
 * monster powers up and she works out the new total. See `src/match.ts`.
 *
 * With `practice` set, a grown-up is having a look: nothing is saved or earned.
 */
export const matchScreen: Screen = (app, params) => {
  const { save } = app;
  const practice = params.practice === true;
  const id = params.id as SpeciesId;
  const mine = save.monsters[id];
  const myStage: Stage = mine?.stage ?? 1;
  const name = displayName(save, id);

  const others = friends(save).map((f) => f.id).filter((f) => f !== id);
  const foe = (params.foe as SpeciesId | undefined) ?? (others.length > 0 ? pick(others) : pick(ALL_SPECIES.filter((s) => s !== id)));
  const foeStage: Stage = save.monsters[foe]?.stage ?? 1;
  const foeName = displayName(save, foe);

  const tryRung = typeof params.rung === 'number' ? params.rung : 3;
  const rungs: Rungs = practice ? { add: tryRung, addR: tryRung, sub: tryRung, subR: Math.min(tryRung, topRung('subR')) } : matchRungs(save);
  const plan = planMatch(rungs);
  const scale = Math.max(10, Math.ceil(Math.max(...plan.flatMap((t) => [t.p.a, t.p.answer])) / 10) * 10);
  const unit = BAR_W / scale;

  let at = 0;
  let typed = '';
  let answers: number[] = [];
  let errors: ErrorPattern[] = [];
  let helped = false;
  let revealed = false;
  let solved = false;
  /** How much help is on the screen: 0 none, 1 the small steps, 2 the answer to copy. */
  let help = 0;
  let phase: 'play' | 'finish' | 'done' = 'play';
  let gone = false;

  const pet = monsterImg(id, myStage, 220, 'bob');
  const foePet = monsterImg(foe, foeStage, 220, 'bob');
  const meter = h('div', { class: 'trip-meter mt-meter' });
  const barHost = h('div', { class: 'mt-bar-host' });
  const story = h('p', { class: 'story mt-story' });
  const coachEl = h('p', { class: 'mt-coach' });
  const stepsEl = h('div', { class: 'mt-steps' });
  const sumEl = h('div', { class: 'mt-sum', 'data-sum': true });
  const action = h('div', { class: 'mt-action' });
  const pad = keypad(
    (d) => type(d),
    () => erase(),
  );

  const turn = (): Turn => plan[Math.min(at, plan.length - 1)] as Turn;

  function storyText(): string {
    if (phase !== 'play') return `${name}'s power move is ready! Press the power button.`;
    const t = turn();
    const start = t.fresh && at > 0 ? `${foeName} catches their breath. ` : '';
    return t.kind === 'hit'
      ? `${start}${foeName} has ${t.p.a} power. ${name}'s move takes away ${t.p.b}. How much power is left?`
      : `${start}${foeName} has ${t.p.a} power, and powers up by ${t.p.b}. How much power now?`;
  }

  function storyClips(): Array<string | null> {
    if (phase !== 'play') return ['mt_finish'];
    const t = turn();
    const start = t.fresh && at > 0 ? 'mt_breath' : null;
    return t.kind === 'hit'
      ? [start, 'mt_power', num(t.p.a), 'mt_takes', num(t.p.b), 'mt_left']
      : [start, 'mt_power', num(t.p.a), 'mt_up', num(t.p.b), 'mt_now'];
  }

  function coach(text: string, clip?: string): void {
    replace(coachEl, text);
    if (clip) say(clip);
  }

  function react(who: HTMLElement, cls: 'jump' | 'tilt' | 'spin'): void {
    who.classList.remove('jump', 'tilt', 'spin');
    void who.offsetWidth;
    who.classList.add(cls);
  }

  // ---- what she sees -----------------------------------------------------

  /** One stretch of the bar, with its number underneath. */
  function part(value: number, cls: string, label: string | number): HTMLElement {
    return h('div', { class: `mt-part ${cls}`, style: `width:${Math.max(0, value * unit)}px` }, h('span', { class: 'mt-part-label' }, String(label)));
  }

  /**
   * The bar is a part-whole picture. For a hit the whole is known and one part
   * is taken; for a power-up the two parts are known and the whole is asked.
   */
  function drawBar(): void {
    if (phase !== 'play') {
      replace(barHost, h('div', { class: 'mt-whole' }, 'Power ', h('b', null, phase === 'done' ? '0' : String(turn().p.answer))), h('div', { class: 'mt-bar' }, phase === 'done' ? null : part(turn().p.answer, 'rest low', '')));
      return;
    }
    const { p, kind } = turn();
    const total = kind === 'hit' ? p.a : p.answer;
    const whole = kind === 'hit' || solved ? String(solved ? p.answer : p.a) : '?';
    // With the small steps showing, the piece is cut the same way: 47 as 40, 2 and 5.
    const cuts = help > 0 && !solved ? jumps(p).map((j) => j.by) : [p.b];
    const small = cuts.length > 1 ? 'cut' : '';
    const parts =
      kind === 'hit'
        ? [part(p.answer, 'rest', solved ? p.answer : '?'), ...[...cuts].reverse().map((by) => part(by, `take ${small} ${solved ? 'gone' : ''}`, by))]
        : [part(p.a, 'rest', p.a), ...cuts.map((by) => part(by, `grow ${small} ${solved ? 'joined' : ''}`, by))];
    replace(
      barHost,
      h('div', { class: 'mt-whole' }, 'Power ', h('b', { class: whole === '?' ? 'ask' : '' }, whole)),
      h(
        'div',
        { class: 'mt-bar' },
        parts,
        // A mark at every ten, so tens and ones can be counted off the bar.
        h('div', { class: 'mt-ticks', style: `width:${total * unit}px;background-size:${10 * unit}px 100%` }),
      ),
    );
  }

  function drawMeter(): void {
    const done = phase === 'play' ? at + (solved ? 1 : 0) : MATCH_TURNS;
    replace(meter, times(plan.length, (i) => h('i', { class: `mt-dot ${i < done ? 'on' : ''}` })));
  }

  function drawSum(): void {
    if (phase !== 'play') {
      replace(sumEl);
      return;
    }
    const { p, kind } = turn();
    const shown = solved ? String(p.answer) : typed;
    replace(
      sumEl,
      h('span', null, String(p.a)),
      h('span', { class: 'mt-op' }, kind === 'hit' ? '−' : '+'),
      h('span', null, String(p.b)),
      h('span', { class: 'mt-op' }, '='),
      h('button', { class: `mt-slot ${solved ? 'ok' : ''} ${shown ? '' : 'empty'}`, type: 'button', 'data-hear': true, 'aria-label': 'Your answer' }, shown || '?'),
    );
  }

  function drawSteps(): void {
    if (phase !== 'play' || help === 0) {
      replace(stepsEl);
      return;
    }
    const { p, kind } = turn();
    const sign = kind === 'hit' ? '−' : '+';
    const list = jumps(p);
    replace(
      stepsEl,
      list.map((j, i) => {
        const last = i === list.length - 1;
        // The last result is hers to find, until the third miss shows it.
        const result = last && help < 2 && !solved ? '?' : String(j.to);
        return h('div', { class: 'mt-step' }, `${j.from} ${sign} ${j.by} = `, h('b', { class: result === '?' ? 'ask' : '' }, result));
      }),
    );
  }

  function drawAction(): void {
    pad.classList.toggle('off', solved || phase !== 'play');
    if (phase === 'finish') {
      replace(action, button('Power move!', finish, 'btn-primary btn-big pulse mt-finish'));
      return;
    }
    if (phase === 'done') {
      replace(action);
      return;
    }
    if (solved) {
      replace(action, button(at === plan.length - 1 ? 'Next' : 'Next move', next, 'btn-primary btn-big'));
      return;
    }
    const check = button([icon('check'), 'Check'], doCheck, 'btn-primary btn-big');
    check.toggleAttribute('disabled', typed === '');
    replace(action, check, button('Show me', showSteps, 'btn-small help-walk'));
  }

  function draw(): void {
    replace(story, storyText());
    drawBar();
    drawMeter();
    drawSum();
    drawSteps();
    drawAction();
  }

  // ---- the moves, drawn by the game ---------------------------------------

  const fxHost = h('div', { class: 'mt-fx', 'aria-hidden': 'true' });
  const habitat = SPECIES[id].habitat;

  /** Her monster's power move: a ball of light crosses to the other monster and bursts there. */
  function shoot(big = false): void {
    const orb = h('i', { class: `mt-orb mt-${habitat} ${big ? 'big' : ''}` });
    fxHost.appendChild(orb);
    sfx('pop');
    window.setTimeout(() => {
      orb.remove();
      if (gone) return;
      const burst = h(
        'div',
        { class: `mt-burst mt-${habitat} ${big ? 'big' : ''}` },
        times(big ? 14 : 9, (i) => h('i', { style: `--a:${Math.round((360 / (big ? 14 : 9)) * i)}deg` })),
      );
      fxHost.appendChild(burst);
      sfx('pack');
      react(foePet, big ? 'spin' : 'tilt');
      window.setTimeout(() => burst.remove(), 700);
    }, 430);
  }

  /** The other monster powering up: rings of light rise around it. */
  function powerUp(): void {
    const rings = h('div', { class: 'mt-rings' }, times(3, (i) => h('i', { style: `animation-delay:${i * 0.14}s` })));
    fxHost.appendChild(rings);
    sfx('buy');
    react(foePet, 'jump');
    window.setTimeout(() => rings.remove(), 1100);
  }

  // ---- playing -----------------------------------------------------------

  function type(d: string): void {
    if (solved || phase !== 'play') return;
    typed = pushDigit(typed, d);
    drawSum();
    drawAction();
  }

  function erase(): void {
    if (solved || phase !== 'play') return;
    typed = typed.slice(0, -1);
    drawSum();
    drawAction();
  }

  function begin(): void {
    typed = '';
    answers = [];
    errors = [];
    helped = false;
    revealed = false;
    solved = false;
    help = 0;
    const t = turn();
    coach(t.kind === 'hit' ? `${name} is ready. What will be left?` : `${foeName} powers up!`);
    draw();
    if (t.kind === 'boost') powerUp();
    say(at === 0 ? 'mt_start' : null, ...storyClips());
  }

  function showSteps(): void {
    if (solved || phase !== 'play') return;
    helped = true;
    help = Math.max(help, 1);
    coach('Take it in small steps. Tens first, then ones.', 'mt_steps');
    drawSteps();
    drawBar();
  }

  function doCheck(): void {
    if (solved || phase !== 'play' || typed === '') return;
    const { p, kind } = turn();
    const value = Number(typed);
    answers.push(value);
    if (value === p.answer) {
      succeed();
      return;
    }
    errors.push(classifyError(p, value));
    sfx('soft');
    react(pet, 'tilt');
    typed = '';
    if (answers.length >= 3) {
      // More tries would be guessing. Show the answer and let her type it.
      revealed = true;
      helped = true;
      help = 2;
      coach(`${p.a} ${kind === 'hit' ? '−' : '+'} ${p.b} = ${p.answer}. Type ${p.answer}.`, 'mt_copy');
    } else if (answers.length === 2) {
      helped = true;
      help = 1;
      coach('Take it in small steps. Tens first, then ones.', 'mt_steps');
    } else {
      coach(kind === 'hit' ? 'The move missed. Look at the bar and try again.' : 'Not yet. Look at the bar and try again.', kind === 'hit' ? 'mt_miss' : 'mt_not_yet');
    }
    draw();
  }

  function succeed(): void {
    const t = turn();
    const { p } = t;
    solved = true;
    const firstTry = answers.length === 1 && !helped;
    const worked = !revealed;
    if (!practice) {
      const day = today(save);
      const o = ownerOf(p.type);
      // Only a problem at her own level says something about her level.
      if (o && t.own) {
        const om = monster(save, o);
        const moved = record({ rung: t.rung, recent: (om.recent ?? []) as Mark[] }, topRung(p.type), firstTry, false);
        om.step = moved.rung;
        om.recent = moved.recent;
        if (moved.moved > 0) {
          sfx('level');
          toasts(el, [levelUpLine(climbed(save, `trip.${p.type}`, t.rung, moved.rung, id), name, 'numbers')]);
        }
      }
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
        usedBlocks: false,
        helped,
        rung: t.rung,
        stretch: false,
      });
      // Working it out earns the reward, with or without help. Copying the shown answer does not.
      if (worked) toasts(el, gainLines(onTrip(save, firstTry)));
      app.commit();
    }
    sfx('yes');
    react(pet, 'jump');
    if (t.kind === 'hit') shoot();
    if (worked) floatUp(pet, 'heart', firstTry ? 3 : 1);
    coach(`Yes! ${p.a} ${isAddition(p.type) ? '+' : '−'} ${p.b} = ${p.answer}`, t.kind === 'hit' ? 'mt_hit' : 'yes');
    draw();
  }

  function next(): void {
    if (!solved || phase !== 'play') return;
    if (at < plan.length - 1) {
      at += 1;
      begin();
      return;
    }
    phase = 'finish';
    coach('');
    draw();
    say('mt_finish');
  }

  function finish(): void {
    if (phase !== 'finish') return;
    phase = 'done';
    sfx('charge');
    react(pet, 'jump');
    coach('');
    draw();
    shoot(true);
    window.setTimeout(() => !gone && shoot(true), 260);
    window.setTimeout(() => !gone && win(), 1500);
  }

  function win(): void {
    const again = { label: 'Another match', onClick: () => app.go('match', practice ? { ...params } : { id }) };
    if (practice) {
      celebrate(el, { id, stage: myStage, title: `${name} won the match!`, voice: ['mt_won'], lines: ['Preview only. Nothing is saved.'], buttons: [again, { label: 'Back', onClick: () => app.go('grownups'), primary: true }] });
      return;
    }
    const m = monster(save, id);
    m.rounds += 1;
    today(save).wins += 1;
    toasts(el, gainLines(onRound(save, id)));
    const { result, bonus } = roundStars(save, id);
    app.commit();
    const home = { label: 'Meadow', onClick: () => app.go('home'), primary: true };
    if (result === 'grown') {
      celebrate(el, { id, stage: m.stage, title: `${name} evolved!`, fx: { kind: 'evolve', from: (m.stage - 1) as Stage }, voice: [nameClip(id), 'grew_up'], lines: [...bonusLines(bonus), 'Look how strong!'], buttons: [home], big: true });
    } else if (result === 'star') {
      celebrate(el, { id, stage: m.stage, title: `${name} won the match!`, voice: ['mt_won', 'got_star'], lines: [...bonusLines(bonus), growthLine(m, name)], buttons: [again, home] });
    } else {
      celebrate(el, { id, stage: m.stage, title: `${name} won the match!`, voice: ['mt_won'], lines: [`${name} is full of stars for today. More stars tomorrow!`], buttons: [again, home] });
    }
  }

  const el = h(
    'div',
    { class: 'screen match-screen' },
    backdrop('canyon'),
    h('div', { class: 'topbar' }, practice ? button([icon('back'), 'Back'], () => app.go('grownups'), 'btn-back') : backButton(app)),
    h('div', { class: 'mt-side mt-mine' }, pet, h('div', { class: 'nameplate' }, name)),
    h('div', { class: 'mt-side mt-foe' }, h('div', { class: 'mt-flip' }, foePet), h('div', { class: 'nameplate' }, foeName)),
    h('div', { class: 'card mt-top' }, meter, barHost),
    fxHost,
    h(
      'div',
      { class: 'card mt-panel' },
      h('div', { class: 'mt-words' }, h('div', { class: 'cy-head' }, story, speaker(storyClips)), coachEl, stepsEl),
      h('div', { class: 'mt-work' }, sumEl, pad, action),
    ),
  );

  if (plan.length === 0) {
    // No take-away problems yet: there is nothing to play. Go back where she came from.
    window.setTimeout(() => !gone && app.go(practice ? 'grownups' : 'home'), 0);
  } else {
    begin();
  }

  return {
    el,
    dispose() {
      gone = true;
    },
    onKey(e) {
      if (/^[0-9]$/.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') erase();
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'finish') finish();
        else if (solved) next();
        else doCheck();
      }
    },
  };
};
