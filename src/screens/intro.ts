import { cry, say, sayAlso, sfx } from '../audio';
import { ALL_SPECIES, SPECIES, STARTERS, type SpeciesId } from '../data/monsters';
import {
  advance,
  currentItem,
  newRun,
  fastTrack,
  startSteps,
  strandPlan,
  type IntakeItem,
  type Strand,
  type StrandRun,
  type Visual,
} from '../intake';
import { befriend, displayName, monster } from '../state';
import { backdrop, button, celebrate, confetti, floatUp, icon, monsterImg, speaker, type Screen } from '../ui/common';
import { h, replace, times } from '../ui/dom';
import { keypad, pushDigit } from '../ui/keypad';
import { arrayModel, berry, blocksView, dotsModel, fractionBar, groupsModel } from '../ui/models';
import { aboutClip, nameClip } from '../voice/lines';

/** Berries earned for each finished round of the first-day check. */
const ROUND_BERRIES = 3;

const YUM = ['Thanks!', 'Got it!', 'Okay!', 'Next one!', 'Noted!'];

function drawVisual(v: Visual): HTMLElement {
  switch (v.type) {
    case 'dots':
      return dotsModel(v.n);
    case 'blocks':
      return blocksView(v.n, 'blocks-big');
    case 'array':
      return arrayModel(v.rows, v.cols);
    case 'groups':
      return groupsModel(v.total, v.groups);
    case 'bar':
      return fractionBar(v.parts, v.shaded);
  }
}

/**
 * First run: pick a starter, then feed it. The feeding is the intake: six
 * short staircases that each stop when she starts to struggle. It never says
 * right or wrong, "Not sure" is always allowed, and she can take a break
 * between strands and pick up where she left off.
 */
export const introScreen: Screen = (app) => {
  const { save } = app;
  const body = h('div', { class: 'intro-body' });
  const el = h('div', { class: 'screen intro-screen' }, backdrop('meadow'), body);
  let onKey: (e: KeyboardEvent) => void = () => {};

  function pickStep(): void {
    let chosen: SpeciesId | null = null;
    const confirm = h('div', { class: 'pick-confirm' });
    const cards = STARTERS.map((id) => {
      const sp = SPECIES[id];
      const card = h(
        'button',
        {
          class: 'pick-card',
          type: 'button',
          onclick: () => {
            chosen = id;
            sfx('pop');
            cards.forEach((c) => c.classList.toggle('chosen', c === card));
            say(aboutClip(id));
            replace(
              confirm,
              button(
                `Pick ${sp.name}`,
                () => {
                  if (!chosen) return;
                  save.starter = chosen;
                  save.intakeAt = 0;
                  save.intakeLevels = {};
                  save.placement = [];
                  app.commit();
                  meetStep(chosen);
                },
                'btn-primary btn-big',
              ),
            );
          },
        },
        monsterImg(id, 1, 210, 'bob'),
        h('div', { class: 'pick-name' }, sp.name),
        h('div', { class: 'pick-what' }, sp.what),
      );
      return card;
    });
    replace(
      body,
      h(
        'div',
        { class: 'card intro-card' },
        h('h2', null, 'Pick your first friend', speaker(() => ['welcome'])),
        h('div', { class: 'pick-row' }, cards),
        confirm,
      ),
    );
    say('welcome');
    onKey = () => {};
  }

  /**
   * Getting to know each other, before any question: say hello, choose a
   * name, feed a few berries. No math, nothing to get wrong.
   */
  function meetStep(starter: SpeciesId): void {
    const sp = SPECIES[starter];
    const voiceIndex = ALL_SPECIES.indexOf(starter);
    const pet = monsterImg(starter, 1, 300, 'bob');
    const bubble = h('div', { class: 'bubble meet-bubble' });
    const below = h('div', { class: 'meet-below' });
    let onPet: () => void = () => {};
    const react = (cls: string): void => {
      pet.classList.remove('jump', 'spin', 'munch');
      void pet.offsetWidth;
      pet.classList.add(cls);
    };
    const hearts = (filled: number, total: number): HTMLElement =>
      h('div', { class: 'meter' }, times(total, (k) => icon('heart', k < filled ? 'on' : 'off')));

    replace(
      body,
      confetti(36),
      h(
        'div',
        { class: 'card meet-card' },
        bubble,
        h('button', { class: 'pet-target', type: 'button', 'aria-label': `Pet ${sp.name}`, onclick: () => onPet() }, pet),
        below,
      ),
    );
    onKey = () => {};

    function hello(): void {
      let taps = 0;
      replace(bubble, `You and ${sp.name} are friends now! Tap ${sp.name} to say hello.`);
      replace(below, hearts(0, 3));
      sfx('win');
      react('jump');
      say(nameClip(starter), 'm_hello');
      onPet = () => {
        taps += 1;
        cry(voiceIndex);
        floatUp(pet, 'heart', 2);
        react(taps >= 3 ? 'spin' : 'jump');
        replace(below, hearts(taps, 3));
        if (taps >= 3) {
          onPet = () => {
            cry(voiceIndex);
            floatUp(pet, 'heart', 1);
          };
          window.setTimeout(naming, 1000);
        }
      };
    }

    function naming(): void {
      const input = h('input', { class: 'name-input', type: 'text', maxlength: '12', value: sp.name, 'aria-label': 'Name' });
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') done();
      });
      const done = (): void => {
        const typed = input.value.trim();
        monster(save, starter).nickname = typed && typed !== sp.name ? typed : undefined;
        app.commit();
        feeding();
      };
      replace(bubble, `Does ${sp.name} need a new name? Type one, or keep this one.`);
      replace(below, h('div', { class: 'meet-name' }, input, button('This name!', done, 'btn-primary btn-big')));
      say('m_name');
    }

    function feeding(): void {
      const name = displayName(save, starter);
      let left = 5;
      replace(bubble, `${name} is hungry! Tap the berries to feed ${name}.`);
      say('m_feed');
      const row = h(
        'div',
        { class: 'meet-berries' },
        times(5, () => {
          const b = h(
            'button',
            {
              class: 'big-berry',
              type: 'button',
              'aria-label': 'Berry',
              onclick: () => {
                b.remove();
                left -= 1;
                sfx('munch');
                react('munch');
                floatUp(pet, 'heart', 1);
                if (left === 0) {
                  replace(bubble, `Nice. Now let us see what you and ${name} can do together.`);
                  say('m_more2');
                  replace(below, button('Let us go!', () => feedStep(starter, true), 'btn-primary btn-big pulse'));
                }
              },
            },
            berry(),
          );
          return b;
        }),
      );
      replace(below, row);
    }

    hello();
  }

  function feedStep(starter: SpeciesId, fresh: boolean): void {
    const name = displayName(save, starter);
    const voiceIndex = ALL_SPECIES.indexOf(starter);
    /** The rounds to ask. Counting can be added at the end, once the other rounds are in. */
    const plan = (): Strand[] => strandPlan(save.startAt, save.intakeLevels ?? {});
    let strandIndex = Math.min(save.intakeAt ?? 0, plan().length);
    let run: StrandRun = newRun();
    let busy = false;
    let asked = 0;

    const pet = monsterImg(starter, 1, 300, 'bob');
    const pat = (): void => {
      cry(voiceIndex);
      floatUp(pet, 'heart', 1);
    };
    let onPet: () => void = pat;
    const petButton = h('button', { class: 'pet-target', type: 'button', 'aria-label': `Pet ${name}`, onclick: () => onPet() }, pet);
    const bubble = h('div', { class: 'bubble' });
    const progress = h('div', { class: 'feed-progress' });
    const panel = h('div', { class: 'card feed-card' });
    replace(
      body,
      h('div', { class: 'feed-left' }, bubble, petButton, progress),
      panel,
      h(
        'div',
        { class: 'feed-break' },
        button(
          'Take a break',
          () => {
            app.commit();
            app.go('title');
          },
          'btn-quiet',
        ),
      ),
    );

    const strand = (): Strand | undefined => plan()[strandIndex];

    function drawProgress(): void {
      replace(
        progress,
        times(plan().length, (i) => h('i', { class: i < strandIndex ? 'done' : i === strandIndex ? 'now' : '' })),
      );
    }

    function record(item: IntakeItem, given: string | null): void {
      const s = strand();
      if (busy || !s) return;
      busy = true;
      const correct = given === item.expected;
      save.placement.push({
        id: `${s.id}.${run.level + 1}`,
        prompt: item.visual || item.choices ? `${item.show} (${s.levels[run.level]?.label ?? ''})` : item.show,
        expected: item.expected,
        given,
        correct,
        unsure: given === null,
      });
      run = advance(s, run, correct);
      asked += 1;

      sfx('munch');
      pet.classList.remove('munch');
      void pet.offsetWidth;
      pet.classList.add('munch');
      const yum = Math.floor(Math.random() * YUM.length);
      replace(bubble, given === null ? 'That is okay!' : (YUM[yum] as string));
      say(given === null ? 'thats_okay' : `got${yum + 1}`);
      onKey = () => {};
      panel.classList.add('fading');

      let moved = false;
      if (run.done) {
        // Strand finished: store what she passed and move on. This is also the save point for a break.
        save.intakeLevels = { ...(save.intakeLevels ?? {}), [s.id]: run.passed };
        // Berries for finishing the round, whatever the answers were: something to spend in the meadow.
        save.berries = (save.berries ?? 0) + ROUND_BERRIES;
        strandIndex += 1;
        save.intakeAt = strandIndex;
        run = newRun();
        moved = true;
      }
      app.commit();

      window.setTimeout(() => {
        panel.classList.remove('fading');
        busy = false;
        drawProgress();
        // Between strands: a cuddle, so the questions come in short runs.
        if (moved && strand()) cuddle(() => showItem(true));
        else showItem(moved);
      }, 900);
    }

    function cuddle(then: () => void): void {
      let taps = 0;
      const hearts = h('div', { class: 'meter' });
      const drawHearts = (): void => replace(hearts, times(3, (k) => icon('heart', k < taps ? 'on' : 'off')));
      replace(bubble, 'High five!');
      replace(panel, h('div', { class: 'cuddle' }, h('h2', null, 'Quick break!'), h('p', null, `Tap ${name} for a high five.`), hearts, h('p', { class: 'cuddle-berries' }, times(ROUND_BERRIES, () => h('i', { class: 'berry' })), `${save.berries ?? 0} berries for the shop`)));
      drawHearts();
      say('m_break2');
      onKey = () => {};
      onPet = () => {
        taps += 1;
        cry(voiceIndex);
        floatUp(pet, 'heart', 2);
        drawHearts();
        if (taps < 3) return;
        onPet = pat;
        pet.classList.remove('spin');
        void pet.offsetWidth;
        pet.classList.add('spin');
        sfx('star');
        window.setTimeout(then, 900);
      };
    }

    function showItem(newStrand: boolean): void {
      const s = strand();
      const item = s ? currentItem(s, run) : null;
      if (!s || !item) {
        finish();
        return;
      }
      replace(bubble, asked === 0 ? 'Ready when you are!' : newStrand ? 'New round!' : 'Next!');
      const head = h('div', { class: 'feed-head' }, h('div', { class: 'feed-show' }, item.show), speaker(() => item.clips));
      const visual = item.visual ? h('div', { class: 'feed-visual' }, drawVisual(item.visual)) : null;

      if (item.choices) {
        replace(
          panel,
          head,
          visual,
          h(
            'div',
            { class: 'choice-row' },
            item.choices.map((c) => button(c, () => record(item, c), 'btn-choice')),
          ),
          h('div', { class: 'feed-actions' }, button('Not sure', () => record(item, null), 'btn-quiet')),
        );
        onKey = () => {};
      } else {
        let typed = '';
        const display = h('div', { class: 'entry' });
        const feed = button('Feed', () => typed && record(item, typed), 'btn-primary btn-big');
        const draw = (): void => {
          replace(display, typed || ' ');
          display.classList.toggle('empty', !typed);
          feed.toggleAttribute('disabled', !typed);
        };
        const digit = (d: string): void => {
          typed = pushDigit(typed, d);
          draw();
        };
        const erase = (): void => {
          typed = typed.slice(0, -1);
          draw();
        };
        replace(
          panel,
          head,
          visual,
          h('div', { class: 'entry-row' }, display),
          keypad(digit, erase),
          h('div', { class: 'feed-actions' }, button('Not sure', () => record(item, null), 'btn-quiet'), feed),
        );
        draw();
        onKey = (e) => {
          if (/^[0-9]$/.test(e.key)) digit(e.key);
          else if (e.key === 'Backspace') erase();
          else if (e.key === 'Enter') {
            e.preventDefault();
            if (typed) record(item, typed);
          }
        };
      }

      if (asked === 0 && fresh) say('i_intro2', ...item.clips);
      else if (newStrand && asked > 0) sayAlso('i_next2', ...item.clips);
      else if (asked === 0) say(...item.clips);
      else sayAlso(...item.clips);
    }

    function finish(): void {
      const levels = save.intakeLevels ?? {};
      const steps = startSteps(levels);
      save.startStep = steps;
      save.fast = fastTrack(levels);
      save.introDone = true;
      befriend(save, starter);
      app.commit();
      replace(panel);
      panel.classList.add('hidden');
      onKey = () => {};
      celebrate(el, {
        id: starter,
        title: `${name} is your friend!`,
        voice: [nameClip(starter), 'first_friend'],
        lines: [`${name} is full and happy.`, 'Now let us go find more monsters.'],
        buttons: [{ label: 'Go to the meadow', onClick: () => app.go('home'), primary: true }],
        big: true,
      });
    }

    drawProgress();
    showItem(false);
  }

  // Coming back after a break: straight to where she left off.
  if (save.starter && !save.introDone) feedStep(save.starter, false);
  else pickStep();

  return { el, onKey: (e) => onKey(e) };
};
