import { say, sfx } from '../audio';
import { METER, SPECIES, TREAT_LABEL, type SpeciesId, type Stage } from '../data/monsters';
import {
  evaluate,
  OP_SYMBOL,
  roundComplete,
  score,
  show,
  type Expr,
  type Op,
  type Score,
} from '../math/expr';
import { hintFor, isOwnTurn, missedTurn, SOLO_BONUS, TURN_TRIES, turnKind, type Hint } from '../math/hints';
import { bonusLines, climbed, gainLines, levelUpLine, onRound, onTreat, roundStars } from '../rewards';
import { befriend, buddyOf, dayKey, displayName, growthLine, monster, today, type Round } from '../state';
import {
  backButton,
  backdrop,
  button,
  celebrate,
  floatUp,
  icon,
  monsterImg,
  speaker,
  toasts,
  type Screen,
} from '../ui/common';
import { h, replace, times } from '../ui/dom';
import { LESSON_FOR_KIND } from '../lessons';
import { finishTreatRound, startTreatRound } from '../skill';
import { STUCK_AFTER, teach, teachIfDue } from '../tutor';
import { makeClip, nameClip } from '../voice/lines';
import { keypad, pushDigit } from '../ui/keypad';
import {
  arrayModel,
  barModel,
  canDrawArray,
  canDrawGroups,
  compareBars,
  exprChip,
  exprModel,
  groupsModel,
} from '../ui/models';

const OPS: Op[] = ['+', '-', '*', '/'];
const OP_FOR_KIND: Record<string, Op> = { add: '+', sub: '-', mul: '*', div: '/' };
const PRAISE = ['Nice one!', 'Great treat!', 'Good thinking!', 'That works!'];

/**
 * Treats: the monster has a number and she builds expressions that equal it.
 * Used both to befriend a wild monster and to play with a friend for stars.
 */
export const befriendScreen: Screen = (app, params) => {
  const { save } = app;
  const id = params.id as SpeciesId;
  const sp = SPECIES[id];
  const m = monster(save, id);
  const wild = !m.friend;
  const name = displayName(save, id);
  const fav = sp.fav;
  const favLabel = TREAT_LABEL[fav];

  if (!m.current) {
    m.current = startTreatRound(save, id);
    app.commit();
  }
  const round = m.current;
  const target = round.target;
  // A hint on screen is gone once she leaves; a "your turn" waits for her.
  round.hint = undefined;

  let a = '';
  let b = '';
  let op: Op | null = null;
  let slot: 'a' | 'b' = 'a';
  let finished = false;
  let gone = false;
  /** Streaks the game watches to decide when to step in. */
  let missStreak = 0;
  let easyStreak = 0;
  let afterFull = 0;
  const here = { screen: 'befriend' as const, params: { id } };

  /** Step in after a moment, so the feedback on her last try is not cut off. */
  function stepIn(action: () => void): void {
    window.setTimeout(() => {
      if (!gone && !finished) action();
    }, 2200);
  }

  const pet = monsterImg(id, m.stage, 290, 'bob');
  const meter = h('div', { class: 'meter' });
  const exprRow = h('div', { class: 'expr-row' });
  const feedback = h('div', { class: 'feedback' });
  const foundRow = h('div', { class: 'found-row' });
  const giveBtn = button('Give treat', () => give(), 'btn-primary btn-big give');
  const opButtons = new Map<Op, HTMLElement>();

  function drawMeter(): void {
    replace(
      meter,
      times(METER, (i) => icon('heart', i < round.hearts ? 'on' : 'off')),
    );
  }

  function drawExpr(): void {
    const box = (which: 'a' | 'b', value: string): HTMLElement =>
      h(
        'button',
        {
          class: `slot ${slot === which ? 'active' : ''} ${value ? '' : 'empty'}`,
          type: 'button',
          onclick: () => {
            slot = which;
            drawExpr();
          },
        },
        value || '?',
      );
    replace(
      exprRow,
      box('a', a),
      h('div', { class: `slot slot-op ${op ? '' : 'empty'}` }, op ? OP_SYMBOL[op] : ''),
      box('b', b),
      h('div', { class: 'equals' }, '='),
      h('div', { class: 'target-inline' }, String(target)),
    );
    giveBtn.toggleAttribute('disabled', !(a && b && op));
    for (const [o, el] of opButtons) el.classList.toggle('active', o === op);
  }

  function drawFound(): void {
    replace(
      foundRow,
      round.found.length === 0
        ? h('span', { class: 'found-empty' }, `Ways to make ${target} show up here`)
        : round.found.map((e) => exprChip(e)),
    );
  }

  function digit(d: string): void {
    if (finished) return;
    if (slot === 'a') a = pushDigit(a, d);
    else b = pushDigit(b, d);
    drawExpr();
  }

  function erase(): void {
    if (finished) return;
    if (slot === 'b' && b) b = b.slice(0, -1);
    else if (slot === 'b' && op) {
      op = null;
      slot = 'a';
    } else {
      slot = 'a';
      a = a.slice(0, -1);
    }
    drawExpr();
  }

  function setOp(o: Op): void {
    if (finished) return;
    op = o;
    if (a) slot = 'b';
    drawExpr();
  }

  const promptClips = (): Array<string | null> => [
    ...(wild ? [nameClip(id), `wild2_${fav}`, makeClip(target)] : [nameClip(id), 'lets_play', makeClip(target)]),
    round.stretch ? 'stretch_try' : null,
  ];

  /** What a waiting "your turn" asks for, in words and as a clip. */
  function turnAsk(turn: NonNullable<Round['turn']>): { text: string; clip: string } {
    const kind = turn.kind && turn.kind in OP_FOR_KIND ? turn.kind : null;
    // A no-break space keeps the sign on the same line as "with".
    const how = kind ? `with\u00a0${OP_SYMBOL[OP_FOR_KIND[kind] as Op]}` : 'your own way';
    return { text: `Your turn: make ${target} ${how}, without ${turn.avoid}.`, clip: `turn_${kind ?? 'any'}` };
  }

  /** A "your turn" she could not make in two tries is let go without a word. */
  function letGo(): void {
    round.turn = undefined;
    round.dropped = (round.dropped ?? 0) + 1;
  }

  function tell(text: string, visual: HTMLElement | null, clips: Array<string | null>): void {
    replace(feedback, visual ?? null, h('p', { class: 'feedback-text' }, text));
    say(...clips);
  }

  function react(cls: 'jump' | 'tilt'): void {
    pet.classList.remove('jump', 'tilt');
    void pet.offsetWidth;
    pet.classList.add(cls);
  }

  function praise(e: Expr, s: Score): { text: string; clips: string[] } {
    const makes = `${show(e)} = ${target}.`;
    if (s.repeat === 'same') return { text: 'You found that one already. Try a new one!', clips: ['already'] };
    if (s.repeat === 'easy-again') return { text: `True! But ${name} has had that kind of easy treat.`, clips: ['easy_again'] };
    if (s.repeat === 'flip') {
      return s.hearts > 0
        ? { text: `${makes} A flip! Same parts, other way round.`, clips: ['flip'] }
        : { text: `${makes} True! That is a flip of one you have.`, clips: ['flip_have'] };
    }
    if (s.tired) {
      const kindWord = TREAT_LABEL[s.kind as 'add' | 'sub' | 'mul' | 'div'].text;
      return { text: `${makes} ${name} has had lots of ${kindWord}. Try another kind!`, clips: [`tired2_${s.kind}`] };
    }
    if (s.kind === 'identity') return { text: `${makes} True! That is the easy one. Can you make a trickier treat?`, clips: ['easy_one'] };
    if (s.kind === 'near') return { text: `${makes} True! Now try bigger parts.`, clips: ['bigger_parts'] };
    if (s.tags.includes('double')) return { text: `${makes} A double!`, clips: ['double2'] };
    if (s.tags.includes('tens')) return { text: `${makes} A round number. Smart!`, clips: ['round_number'] };
    if (s.tags.includes('new-move')) return { text: `${makes} A new kind of treat!`, clips: ['new_kind'] };
    const i = Math.floor(Math.random() * PRAISE.length);
    return { text: `${makes} ${PRAISE[i] as string}`, clips: [`nice${i + 1}`] };
  }

  function give(): void {
    if (finished || !a || !b || !op) return;
    const e: Expr = { a: Number(a), op, b: Number(b) };
    const result = evaluate(e);
    const correct = result.ok && result.value === target;
    const day = today(save);
    const hint = round.hint;
    // An answer made with the hint keeps its number and sign. Typing over them makes it her own.
    const usedHint = !!hint && e.op === hint.op && e.a === hint.give;

    if (!correct) {
      round.misses = (round.misses ?? 0) + 1;
      missStreak += 1;
      easyStreak = 0;
      const hadTurn = !!round.turn;
      if (round.turn) {
        round.turn.misses += 1;
        if (round.turn.misses >= TURN_TRIES) letGo();
      }
      if (missStreak === STUCK_AFTER) {
        missStreak = 0;
        stepIn(() => help(true));
      }
      save.exprLog.push({ t: Date.now(), day: dayKey(), monster: id, target, a: e.a, op: e.op, b: e.b, correct: false, hearts: 0, hinted: usedHint });
      app.commit();
      sfx('soft');
      react('tilt');
      if (!result.ok && result.reason === 'zero-divide') {
        tell('You cannot share into 0 groups. Try another number.', null, ['zero_groups']);
      } else if (!result.ok) {
        tell(`${show(e)} does not share evenly. ${result.remainder} left over.`, null, ['not_even']);
      } else if (result.value < 0) {
        tell(`${show(e)} takes away too much.`, null, ['too_much_away']);
      } else {
        tell(
          `${show(e)} makes ${result.value}. ${name} wants ${target}.`,
          result.value <= 400 ? compareBars(result.value, target, String(result.value)) : null,
          [result.value > target ? 'too_many' : 'not_enough'],
        );
      }
      // Keep the expression so she can adjust one part instead of starting over.
      slot = 'b';
      drawExpr();
      // The meter was already full: letting the "your turn" go ends the round.
      if (hadTurn && !round.turn && roundComplete(round.hearts, METER, round.found, fav)) finish();
      return;
    }

    const prior = [...round.found];
    const s = score(e, prior);
    missStreak = 0;
    const easy = s.kind === 'identity' || s.kind === 'near' || s.repeat === 'same' || s.repeat === 'easy-again';
    easyStreak = easy ? easyStreak + 1 : 0;
    if (s.repeat !== 'same') {
      round.found.push(e);
      const key = String(target);
      (m.ways[key] ??= []).push(e);
    }

    let hearts = s.hearts;
    let words = praise(e, s);
    const turn = round.turn;
    if (usedHint) {
      // Made with the hint: true, and shown, but the hearts come from the next one she makes alone.
      hearts = 0;
      round.helped = (round.helped ?? 0) + 1;
      round.turn = { kind: turnKind(target, e, hint.give, round.found), avoid: hint.give, misses: 0 };
      const ask = turnAsk(round.turn);
      words = { text: `${show(e)} = ${target}. We did that one together. ${ask.text}`, clips: ['together', ask.clip] };
    } else if (turn && isOwnTurn(e, turn, prior)) {
      hearts = s.hearts + SOLO_BONUS;
      round.solo = (round.solo ?? 0) + 1;
      round.turn = undefined;
      words = { text: `${show(e)} = ${target}. All by yourself! Bonus hearts.`, clips: ['solo_yes'] };
    } else if (turn) {
      // With the meter already full, any answer that is not the your-turn uses up a try, so she cannot get stuck.
      // Answers of her own in another kind are not a struggle: that your-turn ends without counting against her.
      const tried = missedTurn(e, turn, prior);
      if (tried || round.hearts + hearts >= METER) {
        turn.misses += 1;
        if (turn.misses >= TURN_TRIES) {
          if (tried) letGo();
          else round.turn = undefined;
        }
      }
      if (round.turn) {
        const ask = turnAsk(round.turn);
        words = { text: `${words.text} ${ask.text}`, clips: [...words.clips, ask.clip] };
      }
    }
    round.hint = undefined;

    round.hearts = Math.min(METER, round.hearts + hearts);
    if (hearts > 0) {
      day.treats += 1;
      toasts(el, gainLines(onTreat(save, hearts)));
    }
    save.exprLog.push({ t: Date.now(), day: dayKey(), monster: id, target, a: e.a, op: e.op, b: e.b, correct: true, kind: s.kind, hearts, hinted: usedHint });

    const showModel = s.repeat !== 'same' && s.repeat !== 'easy-again';
    if (hearts > 0) {
      sfx('yes');
      react('jump');
      floatUp(pet, 'heart', hearts);
    } else if (usedHint) {
      sfx('yes');
      react('jump');
    } else {
      sfx('soft');
      react('tilt');
    }

    a = '';
    b = '';
    op = null;
    slot = 'a';
    drawMeter();
    drawExpr();
    drawFound();

    const done = !round.turn && roundComplete(round.hearts, METER, round.found, fav);
    if (done) {
      tell(words.text, showModel ? exprModel(e) : null, words.clips);
      finish();
      return;
    }
    if (round.turn) {
      // Waiting for her own one: no other nudges until then.
      easyStreak = 0;
      tell(words.text, showModel ? exprModel(e) : null, words.clips);
      app.commit();
      return;
    }
    if (easyStreak === STUCK_AFTER) {
      // Three safe answers in a row: teach that numbers have parts, or at least show one.
      easyStreak = 0;
      stepIn(() => {
        if (!teachIfDue(app, 'parts', here)) help(true);
      });
    }
    if (round.hearts >= METER && fav !== 'any') {
      afterFull += 1;
      if (afterFull === 2) {
        // The meter is full and she still has not found the favorite kind: teach it.
        stepIn(() => {
          if (!teachIfDue(app, fav === 'sub' ? undefined : LESSON_FOR_KIND[fav], here)) help(true);
        });
      }
      // Meter is full but the favorite treat is missing: point at it.
      const line = `${name} is almost ready! ${name} loves ${favLabel.text}. Make one with ${OP_SYMBOL[OP_FOR_KIND[fav] as Op]}.`;
      tell(`${words.text} ${line}`, showModel ? exprModel(e) : null, [...words.clips, `almost_${fav}`]);
      opButtons.get(OP_FOR_KIND[fav] as Op)?.classList.add('pulse');
    } else {
      tell(words.text, showModel ? exprModel(e) : null, words.clips);
    }
    app.commit();
  }

  function finish(): void {
    finished = true;
    const ways = round.found.length;
    m.current = undefined;
    m.rounds += 1;
    // How the round went sets how big the next numbers are, for every monster that wants this kind of treat.
    const moved = finishTreatRound(save, id, round);
    const best = moved !== null && moved.moved > 0 && climbed(save, `treat.${fav}`, moved.rung - 1, moved.rung, id);
    today(save).wins += 1;
    if (wild) befriend(save, id);
    toasts(el, gainLines(onRound(save, id)));
    if (moved && moved.moved > 0) {
      sfx('level');
      toasts(el, [levelUpLine(best, name, 'numbers')]);
    }
    const waysLine = `You found ${ways} ${ways === 1 ? 'way' : 'ways'} to make ${target}.`;

    if (wild) {
      befriend(save, id);
      app.commit();
      window.setTimeout(() => {
        celebrate(el, {
          id,
          title: `${sp.name} is your friend!`, voice: [nameClip(id), 'new_friend'],
          lines: [waysLine, fav === 'any' ? `${sp.name} loves all treats.` : `${sp.name} loves ${favLabel.text}.`],
          buttons: [{ label: 'Hooray!', onClick: () => app.go('home'), primary: true }],
          big: true,
        });
      }, 1500);
      return;
    }

    const { result, bonus } = roundStars(save, id);
    app.commit();
    const again = { label: 'Play again', onClick: () => app.go('befriend', { id }) };
    const home = { label: 'Meadow', onClick: () => app.go('home'), primary: true };
    window.setTimeout(() => {
      if (result === 'grown') {
        celebrate(el, {
          id,
          stage: m.stage,
          title: `${name} evolved!`, fx: { kind: 'evolve', from: (m.stage - 1) as Stage }, voice: [nameClip(id), 'grew_up'],
          lines: [waysLine, ...bonusLines(bonus), 'Look how strong!'],
          buttons: [home],
          big: true,
        });
      } else if (result === 'star') {
        celebrate(el, {
          id,
          stage: m.stage,
          title: `${name} got a star!`, voice: [nameClip(id), 'got_star'],
          lines: [waysLine, ...bonusLines(bonus), growthLine(m, name)],
          buttons: [again, home],
        });
      } else {
        celebrate(el, {
          id,
          stage: m.stage,
          title: `${name} had so much fun!`, voice: [nameClip(id), 'full_today'],
          lines: [waysLine, `${name} is full of stars for today. More stars tomorrow!`],
          buttons: [again, home],
        });
      }
    }, 1500);
  }

  function hintVisual(hint: Hint): HTMLElement {
    switch (hint.kind) {
      case 'add':
        return barModel([
          { value: hint.a, label: String(hint.a), tone: 'a' },
          { value: hint.b, label: '?', tone: 'ghost' },
        ]);
      case 'sub':
        return barModel([
          { value: target, label: String(target), tone: 'a' },
          { value: hint.b, label: '?', tone: 'gone' },
        ]);
      case 'mul':
        return canDrawArray(hint.rows, hint.cols) ? arrayModel(hint.rows, hint.cols) : h('span');
      case 'div':
        return canDrawGroups(hint.total, hint.groups) ? groupsModel(hint.total, hint.groups) : h('span');
    }
  }

  function help(auto = false): void {
    if (finished) return;
    const hint = hintFor(target, fav, round.found);
    if (!hint) {
      tell('You found so many! Try any numbers you like.', null, ['no_hint']);
      return;
    }
    // Asking again before her own one: that "your turn" is let go.
    if (round.turn) letGo();
    round.hints += 1;
    round.hint = { give: hint.give, op: OP_FOR_KIND[hint.kind] as Op };
    a = String(hint.give);
    op = OP_FOR_KIND[hint.kind] as Op;
    b = '';
    slot = 'b';
    drawExpr();
    sfx('pop');
    replace(feedback, hintVisual(hint), h('p', { class: 'feedback-text hint-text' }, hint.text));
    if (auto) say('help_hint', hint.clip);
    else say(hint.clip);
    app.commit();
  }

  const opsEl = h(
    'div',
    { class: 'ops' },
    OPS.map((o) => {
      const el = h(
        'button',
        {
          class: `key key-op ${fav !== 'any' && OP_FOR_KIND[fav] === o ? 'fav' : ''}`,
          type: 'button',
          onclick: () => {
            sfx('tap');
            el.classList.remove('pulse');
            setOp(o);
          },
        },
        OP_SYMBOL[o],
      );
      opButtons.set(o, el);
      return el;
    }),
  );

  const helper = buddyOf(save) !== id && save.monsters[buddyOf(save)]?.friend ? buddyOf(save) : null;

  const el = h(
    'div',
    { class: 'screen befriend-screen' },
    backdrop('grass'),
    h('div', { class: 'topbar' }, backButton(app)),
    h(
      'div',
      { class: 'bf-left' },
      h('div', { class: 'pet-stage' }, pet, h('div', { class: 'target-badge' }, String(target))),
      h('div', { class: 'nameplate' }, wild ? `Wild ${sp.name}` : name),
      meter,
      h(
        'button',
        { class: 'btn help', type: 'button', onclick: () => help() },
        helper ? monsterImg(helper, save.monsters[helper]?.stage ?? 1, 56) : icon('bulb'),
        h('span', null, 'Help me'),
      ),
      LESSON_FOR_KIND[fav]
        ? button('Teach me', () => teach(app, LESSON_FOR_KIND[fav] ?? 'parts', here), 'btn-small teach')
        : null,
    ),
    h(
      'div',
      { class: 'card bf-panel' },
      h(
        'div',
        { class: 'bf-head' },
        h('h2', null, `Make ${target}`),
        speaker(promptClips),
        fav !== 'any' ? h('span', { class: 'fav-chip' }, h('b', null, favLabel.symbol), `${sp.name} loves ${favLabel.text}`) : null,
        round.stretch ? h('span', { class: 'fav-chip tricky-chip' }, 'A tricky one') : null,
      ),
      exprRow,
      h('div', { class: 'bf-controls' }, keypad(digit, erase), opsEl, giveBtn),
      feedback,
      foundRow,
    ),
  );

  drawMeter();
  drawExpr();
  drawFound();

  if (!save.seenTips.includes('treats')) {
    save.seenTips.push('treats');
    app.commit();
    say(...promptClips(), 'how_to');
    replace(feedback, h('p', { class: 'feedback-text' }, 'Pick a number, a sign, and another number. Then give the treat!'));
  } else {
    if (round.turn) {
      const ask = turnAsk(round.turn);
      say(...promptClips(), ask.clip);
      replace(feedback, h('p', { class: 'feedback-text' }, ask.text));
    } else {
      say(...promptClips());
      if (round.found.length > 0) {
        replace(feedback, h('p', { class: 'feedback-text' }, `Keep going! ${name} still wants treats.`));
      }
    }
  }

  return {
    el,
    dispose() {
      gone = true;
    },
    onKey(e) {
      if (/^[0-9]$/.test(e.key)) digit(e.key);
      else if (e.key === '+') setOp('+');
      else if (e.key === '-') setOp('-');
      else if (e.key === '*' || e.key === 'x' || e.key === 'X') setOp('*');
      else if (e.key === '/') {
        e.preventDefault();
        setOp('/');
      } else if (e.key === 'Backspace') erase();
      else if (e.key === 'Enter') {
        e.preventDefault();
        give();
      }
      else if (e.key === 'Tab') {
        e.preventDefault();
        slot = slot === 'a' ? 'b' : 'a';
        drawExpr();
      }
    },
  };
};
