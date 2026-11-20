import { say, sfx } from '../audio';
import { ALL_SPECIES, arenaFor, bg, looksLeft, SPECIES, type SpeciesId, type Stage } from '../data/monsters';
import { record, type Mark } from '../ladder';
import { jumps, matchPlayed, matchRungs, ownerOf, planMatch, stalestFirst, type Rungs, type Turn, type TurnKind } from '../match';
import { classifyError, isAddition, topRung, type Delivery, type ErrorPattern } from '../math/regroup';
import { bonusLines, climbed, gainLines, levelUpLine, onRound, onTrip, roundStars } from '../rewards';
import { dayKey, displayName, friends, growthLine, isFriend, monster, today } from '../state';
import { backButton, button, celebrate, floatUp, icon, monsterImg, speaker, toasts, type Screen } from '../ui/common';
import { h, pick, replace, times } from '../ui/dom';
import { keypad, pushDigit } from '../ui/keypad';
import { playWithFriend } from '../tutor';
import { nameClip, num } from '../voice/lines';

/** How wide each bar is drawn, in stage pixels. */
const BAR_W = 520;

/**
 * A match, in turns. The other monster's power and her monster's shield are
 * two numbers, each on a bar. Her move takes power away and she works out
 * what is left; the other monster attacks and her block adds shield, and she
 * works out the new total. See `src/match.ts`.
 *
 * With `practice` set, a grown-up is having a look: nothing is saved or earned.
 */
export const matchScreen: Screen = (app, params) => {
  const { save } = app;
  const practice = params.practice === true;
  const id = params.id as SpeciesId;
  const myStage: Stage = save.monsters[id]?.stage ?? 1;
  const name = displayName(save, id);

  const others = friends(save).map((f) => f.id).filter((f) => f !== id);
  const foe = (params.foe as SpeciesId | undefined) ?? (others.length > 0 ? pick(others) : pick(ALL_SPECIES.filter((s) => s !== id)));
  const foeStage: Stage = save.monsters[foe]?.stage ?? 1;
  const foeName = displayName(save, foe);

  const tryRung = typeof params.rung === 'number' ? params.rung : 3;
  const rungs: Rungs = practice ? { add: tryRung, addR: tryRung, sub: tryRung, subR: Math.min(tryRung, topRung('subR')) } : matchRungs(save);
  const plan = planMatch(rungs, Math.random, practice ? [] : stalestFirst(save, rungs));
  const scale = Math.max(10, Math.ceil(Math.max(10, ...plan.flatMap((t) => [t.p.a, t.p.answer])) / 10) * 10);
  const unit = BAR_W / scale;
  const firstOf = (kind: TurnKind): number | null => plan.find((t) => t.kind === kind)?.p.a ?? null;

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
  /** Where each bar stands between turns. Null: this match has no turns of that sort. */
  const value: Record<TurnKind, number | null> = { hit: firstOf('hit'), block: firstOf('block') };
  /** How often the answer had to be shown, by kind. Twice for one kind: it is not ready for matches. */
  const shown: Partial<Record<Delivery, number>> = {};
  let sendBack: SpeciesId | null = null;

  const pet = monsterImg(id, myStage, 250, 'bob');
  const foePet = monsterImg(foe, foeStage, 250, 'bob');
  const meter = h('div', { class: 'mt-meter' });
  const hud: Record<TurnKind, HTMLElement> = { block: h('div', { class: 'mt-hud mt-hud-mine' }), hit: h('div', { class: 'mt-hud mt-hud-foe' }) };
  const story = h('p', { class: 'mt-story' });
  const coachEl = h('p', { class: 'mt-coach' });
  const stepsEl = h('div', { class: 'mt-steps' });
  const sumEl = h('div', { class: 'mt-sum', 'data-sum': true });
  const action = h('div', { class: 'mt-action' });
  const pad = keypad(
    (d) => type(d),
    () => erase(),
  );

  const turn = (): Turn => plan[Math.min(at, plan.length - 1)] as Turn;
  const sign = (kind: TurnKind): string => (kind === 'hit' ? '−' : '+');

  function storyText(): string {
    if (phase !== 'play') return `${name}'s power move is ready! Press the power button.`;
    const t = turn();
    if (t.kind === 'hit') {
      const start = t.fresh && at > 0 ? `${foeName} catches their breath. ` : '';
      return `${start}${foeName} has ${t.p.a} power. ${name}'s move takes away ${t.p.b}. How much power is left?`;
    }
    return `${foeName} attacks! ${name}'s shield is ${t.p.a}. A good block adds ${t.p.b}. How much shield now?`;
  }

  function storyClips(): Array<string | null> {
    if (phase !== 'play') return ['mt_finish'];
    const t = turn();
    return t.kind === 'hit'
      ? [t.fresh && at > 0 ? 'mt_breath' : null, 'mt_power', num(t.p.a), 'mt_takes', num(t.p.b), 'mt_left']
      : ['mt_shield', num(t.p.a), 'mt_block', num(t.p.b), 'mt_shield_now'];
  }

  function coach(text: string, clip?: string | null): void {
    replace(coachEl, text);
    coachEl.classList.toggle('off', text === '');
    if (clip) say(clip);
  }

  function react(who: HTMLElement, cls: 'jump' | 'tilt' | 'spin'): void {
    who.classList.remove('jump', 'tilt', 'spin');
    void who.offsetWidth;
    who.classList.add(cls);
  }

  // ---- what she sees -----------------------------------------------------

  /** One stretch of a bar, with its number underneath. */
  function part(n: number, cls: string, label: string | number): HTMLElement {
    return h('div', { class: `mt-part ${cls}`, style: `width:${Math.max(0, n * unit)}px` }, label === '' ? null : h('span', { class: 'mt-part-label' }, String(label)));
  }

  /**
   * A bar is a part-whole picture while its turn is on. For a hit the whole is
   * known and one part is taken; for a block the two parts are known and the
   * whole is asked. Between its turns a bar just shows where it stands.
   */
  function drawHud(kind: TurnKind): void {
    const host = hud[kind];
    const who = kind === 'hit' ? foeName : name;
    const what = kind === 'hit' ? 'Power' : 'Shield';
    const now = value[kind];
    host.classList.toggle('none', now === null);
    if (now === null) {
      replace(host, h('div', { class: 'mt-hud-top' }, h('span', { class: 'mt-who' }, who)));
      return;
    }
    const live = phase === 'play' && turn().kind === kind;
    host.classList.toggle('live', live);
    let whole = String(now);
    let total = now;
    let parts = [part(now, 'rest', '')];
    if (live) {
      const { p } = turn();
      // With the small steps showing, the piece is cut the same way: 47 as 40, 2 and 5.
      const cuts = help > 0 && !solved ? jumps(p).map((j) => j.by) : [p.b];
      const small = cuts.length > 1 ? 'cut' : '';
      if (kind === 'hit') {
        whole = String(solved ? p.answer : p.a);
        total = p.a;
        parts = [part(p.answer, 'rest', solved ? p.answer : '?'), ...[...cuts].reverse().map((by) => part(by, `take ${small} ${solved ? 'gone' : ''}`, by))];
      } else {
        whole = solved ? String(p.answer) : '?';
        total = p.answer;
        parts = [part(p.a, 'rest', p.a), ...cuts.map((by) => part(by, `grow ${small} ${solved ? 'joined' : ''}`, by))];
      }
    }
    replace(
      host,
      h('div', { class: 'mt-hud-top' }, h('span', { class: 'mt-who' }, who), h('span', { class: 'mt-what' }, what), h('b', { class: `mt-whole ${whole === '?' ? 'ask' : ''}` }, whole)),
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
    const done = phase === 'play' ? at + (solved ? 1 : 0) : plan.length;
    replace(meter, times(plan.length, (i) => h('i', { class: `mt-dot ${i < done ? 'on' : ''}` })));
  }

  function drawSum(): void {
    if (phase !== 'play') {
      replace(sumEl);
      return;
    }
    const { p, kind } = turn();
    const text = solved ? String(p.answer) : typed;
    replace(
      sumEl,
      h('span', null, String(p.a)),
      h('span', { class: 'mt-op' }, sign(kind)),
      h('span', null, String(p.b)),
      h('span', { class: 'mt-op' }, '='),
      h('button', { class: `mt-slot ${solved ? 'ok' : ''} ${text ? '' : 'empty'}`, type: 'button', 'data-hear': true, 'aria-label': 'Your answer' }, text || '?'),
    );
  }

  function drawSteps(): void {
    if (phase !== 'play' || help === 0) {
      replace(stepsEl);
      stepsEl.classList.add('off');
      return;
    }
    const { p, kind } = turn();
    const list = jumps(p);
    stepsEl.classList.remove('off');
    replace(
      stepsEl,
      list.map((j, i) => {
        const last = i === list.length - 1;
        // The last result is hers to find, until the third miss shows it.
        const result = last && help < 2 && !solved ? '?' : String(j.to);
        return h('div', { class: 'mt-step' }, `${j.from} ${sign(kind)} ${j.by} = `, h('b', { class: result === '?' ? 'ask' : '' }, result));
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
      if (sendBack) {
        const back = sendBack;
        replace(action, button(`Play with ${displayName(save, back)}`, () => playWithFriend(app, back), 'btn-primary btn-big'));
        return;
      }
      replace(action, button(at === plan.length - 1 ? 'Next' : 'Next turn', next, 'btn-primary btn-big'));
      return;
    }
    const check = button([icon('check'), 'Check'], doCheck, 'btn-primary btn-big');
    check.toggleAttribute('disabled', typed === '');
    replace(action, check, button('Show me', showSteps, 'btn-small help-walk'));
  }

  function draw(): void {
    replace(story, storyText());
    drawHud('hit');
    drawHud('block');
    drawMeter();
    drawSum();
    drawSteps();
    drawAction();
  }

  // ---- the moves, drawn by the game ---------------------------------------

  const fxHost = h('div', { class: 'mt-fx', 'aria-hidden': 'true' });

  /** A ball of light crosses from one monster to the other and bursts there. */
  function shoot(from: 'mine' | 'foe', big = false): void {
    const colour = `mt-${SPECIES[from === 'mine' ? id : foe].habitat}`;
    const orb = h('i', { class: `mt-orb from-${from} ${colour} ${big ? 'big' : ''}` });
    fxHost.appendChild(orb);
    sfx('pop');
    window.setTimeout(() => {
      orb.remove();
      if (gone) return;
      const n = big ? 14 : 9;
      const burst = h('div', { class: `mt-burst at-${from === 'mine' ? 'foe' : 'mine'} ${colour} ${big ? 'big' : ''}` }, times(n, (i) => h('i', { style: `--a:${Math.round((360 / n) * i)}deg` })));
      fxHost.appendChild(burst);
      sfx('pack');
      if (from === 'mine') react(foePet, big ? 'spin' : 'tilt');
      window.setTimeout(() => burst.remove(), 700);
    }, 430);
  }

  /** Her monster's block: a shield of light stands in front of it while the attack breaks on it. */
  function block(): void {
    const guard = h('i', { class: 'mt-guard' });
    fxHost.appendChild(guard);
    shoot('foe');
    window.setTimeout(() => guard.remove(), 1100);
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
    value[t.kind] = t.p.a;
    coach(t.kind === 'hit' ? `${name}'s turn!` : `${foeName}'s turn. Block it!`);
    draw();
    if (t.kind === 'block') react(foePet, 'jump');
    say(at === 0 && t.kind === 'hit' ? 'mt_start' : null, t.kind === 'block' ? 'mt_attack' : null, ...storyClips());
  }

  function showSteps(): void {
    if (solved || phase !== 'play') return;
    helped = true;
    help = Math.max(help, 1);
    coach('Take it in small steps. Tens first, then ones.', 'mt_steps');
    drawSteps();
    drawHud(turn().kind);
  }

  function doCheck(): void {
    if (solved || phase !== 'play' || typed === '') return;
    const { p, kind } = turn();
    const given = Number(typed);
    answers.push(given);
    if (given === p.answer) {
      succeed();
      return;
    }
    errors.push(classifyError(p, given));
    sfx('soft');
    react(pet, 'tilt');
    typed = '';
    if (answers.length >= 3) {
      // More tries would be guessing. Show the answer and let her type it.
      revealed = true;
      helped = true;
      help = 2;
      coach(`${p.a} ${sign(kind)} ${p.b} = ${p.answer}. Type ${p.answer}.`, 'mt_copy');
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
    value[t.kind] = p.answer;
    const firstTry = answers.length === 1 && !helped;
    const worked = !revealed;
    if (revealed) shown[p.type] = (shown[p.type] ?? 0) + 1;
    const o = ownerOf(p.type);
    if (!practice) {
      const day = today(save);
      // Only a problem at her own level says something about her level.
      if (o && t.own) {
        const om = monster(save, o);
        const moved = record({ rung: t.rung, recent: (om.recent ?? []) as Mark[], missed: om.missed }, topRung(p.type), firstTry, false);
        om.step = moved.rung;
        om.recent = moved.recent;
    om.missed = moved.missed;
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
      // The answer shown twice for one kind: the berries are still needed. Its monster takes over.
      if (o && (shown[p.type] ?? 0) >= 2 && isFriend(save, o)) sendBack = o;
      app.commit();
    }
    sfx('yes');
    react(pet, 'jump');
    if (t.kind === 'hit') shoot('mine');
    else block();
    if (worked) floatUp(pet, 'heart', firstTry ? 3 : 1);
    if (sendBack) {
      coach(`${displayName(save, sendBack)} can help with this one. Play there first.`);
      say(nameClip(sendBack), 'wants_play');
    } else {
      coach(`Yes! ${p.a} ${isAddition(p.type) ? '+' : '−'} ${p.b} = ${p.answer}`, t.kind === 'hit' ? 'mt_hit' : 'mt_blocked');
    }
    draw();
  }

  function next(): void {
    if (!solved || phase !== 'play' || sendBack) return;
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
    if (value.hit !== null) value.hit = 0;
    sfx('charge');
    react(pet, 'jump');
    draw();
    shoot('mine', true);
    window.setTimeout(() => !gone && shoot('mine', true), 260);
    window.setTimeout(() => !gone && win(), 1500);
  }

  function win(): void {
    if (practice) {
      const again = { label: 'Another match', onClick: () => app.go('match', { ...params }) };
      celebrate(el, { id, stage: myStage, title: `${name} won the match!`, voice: ['mt_won'], lines: ['Preview only. Nothing is saved.'], buttons: [again, { label: 'Back', onClick: () => app.go('grownups'), primary: true }] });
      return;
    }
    const m = monster(save, id);
    const day = today(save);
    m.rounds += 1;
    day.wins += 1;
    matchPlayed(save, foe);
    save.matchWins = (save.matchWins ?? 0) + 1;
    toasts(el, gainLines(onRound(save, id)));
    const { result, bonus } = roundStars(save, id);
    app.commit();
    const home = { label: 'Meadow', onClick: () => app.go('home'), primary: true };
    const good = `Good match, ${foeName}!`;
    if (result === 'grown') {
      celebrate(el, { id, stage: m.stage, title: `${name} evolved!`, fx: { kind: 'evolve', from: (m.stage - 1) as Stage }, voice: [nameClip(id), 'grew_up'], lines: [...bonusLines(bonus), 'Look how strong!'], buttons: [home], big: true });
    } else if (result === 'star') {
      celebrate(el, { id, stage: m.stage, title: `${name} won the match!`, voice: ['mt_won', 'got_star'], lines: [good, ...bonusLines(bonus), growthLine(m, name)], buttons: [home] });
    } else {
      celebrate(el, { id, stage: m.stage, title: `${name} won the match!`, voice: ['mt_won'], lines: [good, `${name} is full of stars for today. More stars tomorrow!`], buttons: [home] });
    }
  }

  const arena = arenaFor(foe);
  const el = h(
    'div',
    { class: 'screen match-screen' },
    // Until an arena has its picture, the canyon stands in.
    h('div', { class: 'backdrop mt-arena', style: `background-image:url("${bg(arena)}"),url("${bg('canyon')}")` }),
    h('div', { class: 'topbar' }, practice ? button([icon('back'), 'Back'], () => app.go('grownups'), 'btn-back') : backButton(app)),
    hud.block,
    hud.hit,
    // Hers looks right and the other one looks left, whichever way each was drawn.
    h('div', { class: 'mt-side mt-mine' }, h('div', { class: looksLeft(id) ? 'mt-flip' : '' }, pet)),
    h('div', { class: 'mt-side mt-foe' }, h('div', { class: looksLeft(foe) ? '' : 'mt-flip' }, foePet)),
    h('div', { class: 'mt-mid' }, meter, coachEl, stepsEl),
    fxHost,
    h('div', { class: 'mt-panel' }, h('div', { class: 'mt-words' }, story, speaker(storyClips)), h('div', { class: 'mt-work' }, sumEl, action), pad),
  );

  if (plan.length === 0) {
    // Nothing is ready for a match yet. Go back where she came from.
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
