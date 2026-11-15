import { say, sfx } from '../audio';
import { LESSONS, markLesson, type LessonId, type LessonStep, type Scene } from '../lessons';
import { BAKERY_BG } from '../data/monsters';
import { decText } from '../math/upper';
import { buddyOf, dayKey } from '../state';
import { bunTray, crumbTrays, loafOf, shareModel } from '../ui/bakery';
import { backdrop, button, monsterImg, speaker, type Screen, type ScreenName } from '../ui/common';
import { h, replace, times } from '../ui/dom';
import { keypad, pushDigit } from '../ui/keypad';
import { arrayModel, barModel, berry, crate, dotsModel, fracEl, groupsModel, honeyBar, honeyTray, rich } from '../ui/models';

function drawScene(scene: Scene): HTMLElement {
  let picture: HTMLElement;
  switch (scene.t) {
    case 'mat': {
      const col = (cls: string, name: string, count: number, more: number | undefined, unit: () => HTMLElement): HTMLElement =>
        h(
          'div',
          { class: `mat-col ${cls}` },
          h('div', { class: 'mat-col-head' }, name, h('b', { class: 'count' }, String(count + (more ?? 0)))),
          h(
            'div',
            { class: 'mat-col-body' },
            h('div', { class: `grp ${cls === 'col-o' ? 'grp-o' : 'grp-t'}` }, times(count, unit)),
            more ? h('div', { class: `grp alt ${cls === 'col-o' ? 'grp-o' : 'grp-t'}` }, times(more, unit)) : null,
          ),
        );
      picture = h(
        'div',
        { class: 'mat-cols lesson-mat' },
        col('col-t', 'crates', scene.tens, scene.moreTens, () => crate()),
        col('col-o', 'loose', scene.ones, scene.moreOnes, () => berry()),
      );
      break;
    }
    case 'array':
      picture = h('div', { class: 'lesson-big' }, arrayModel(scene.rows, scene.cols));
      break;
    case 'groups':
      picture = h('div', { class: 'lesson-big' }, groupsModel(scene.total, scene.groups));
      break;
    case 'dots':
      picture = h('div', { class: 'lesson-dots' }, dotsModel(scene.n));
      break;
    case 'piles': {
      const pile = (n: number, cls: string): HTMLElement =>
        h('div', { class: 'lesson-pile' }, h('div', { class: scene.lined ? 'e-line' : 'e-rows' }, times(n, () => h('span', { class: `eb ${cls}` }))), h('b', null, String(n)));
      picture = h('div', { class: `e-versus lesson-piles ${scene.lined ? 'lined' : ''}` }, pile(scene.a, ''), pile(scene.b, 'alt'));
      break;
    }
    case 'frame': {
      const { have, added = 0 } = scene;
      picture = h(
        'div',
        { class: 'e-frame' },
        times(10, (i) =>
          i < have
            ? h('span', { class: 'e-cell' }, h('span', { class: 'eb' }))
            : i < have + added
              ? h('span', { class: 'e-cell' }, h('span', { class: 'eb alt' }, String(i - have + 1)))
              : h('span', { class: 'e-cell empty' }),
        ),
      );
      break;
    }
    case 'bar':
      picture = barModel(scene.parts, 520);
      break;
    case 'fbar':
      picture = honeyBar(scene.parts, scene.shaded, { width: 520, height: 110 });
      break;
    case 'fbars':
      picture = h(
        'div',
        { class: 'fbars' },
        scene.bars.map((b) => h('div', { class: 'fbars-row' }, fracEl(b.shaded, b.parts), honeyBar(b.parts, b.shaded, { width: 440, height: 70 }))),
      );
      break;
    case 'tray':
      picture = honeyTray(scene.cols, scene.shaded, scene.rows ?? 1, scene.taken ?? 0, { size: 250 });
      break;
    case 'btray':
      picture = bunTray([Math.floor(scene.a / 10) * 10, scene.a % 10].filter((c) => c > 0), [scene.b], { lit: scene.lit ?? [], width: 600 });
      break;
    case 'share':
      picture = shareModel({ total: scene.total, by: scene.by, dealt: scene.dealt, loose: scene.loose, counts: !scene.quiet });
      break;
    case 'loaves':
      picture = h(
        'div',
        { class: 'fbars' },
        scene.loaves.map((l, i) =>
          h('div', { class: 'fbars-row' }, l.recut ? fracEl((l.shaded * l.recut) / l.parts, l.recut) : fracEl(l.shaded, l.parts), loafOf(l.parts, l.shaded, i === 0 ? 'a' : 'b', l.recut, { width: 440, height: 70 })),
        ),
      );
      break;
    case 'crumbs':
      picture = h(
        'div',
        { class: 'crumb-pair' },
        [scene.n, scene.other].map((n) => (n === undefined ? null : h('div', { class: 'crumb-one' }, crumbTrays(n, { size: 190 }), scene.other === undefined ? null : h('b', null, decText(n))))),
      );
      break;
  }
  return h('div', { class: 'lesson-scene' }, picture, scene.caption ? h('div', { class: 'lesson-caption' }, rich(scene.caption)) : null);
}

/**
 * Plays one taught lesson, then returns to where she was going. The helper
 * is her first monster. Demonstration steps wait for "Next"; her own steps
 * wait for the right move, and show the answer after two misses.
 */
export const lessonScreen: Screen = (app, params) => {
  const { save } = app;
  const lesson = LESSONS[params.id as LessonId];
  const back = (params.back as { screen: ScreenName; params?: Record<string, unknown> } | undefined) ?? { screen: 'home' as ScreenName };
  let index = 0;
  let misses = 0;
  let onKey: (e: KeyboardEvent) => void = () => {};

  const helper = buddyOf(save);
  const pet = monsterImg(helper, save.monsters[helper]?.stage ?? 1, 210, 'bob');
  const bubble = h('div', { class: 'bubble lesson-bubble' });
  const sceneHost = h('div', { class: 'lesson-scene-host' });
  const controls = h('div', { class: 'lesson-controls' });
  const dots = h('div', { class: 'feed-progress' });

  function finish(): void {
    // A grown-up looking at a lesson does not count as the child having had it.
    if (params.preview !== true) {
      save.lessons ??= {};
      markLesson(save.lessons, lesson.id, dayKey());
      app.commit();
    }
    app.go(back.screen, back.params ?? {});
  }

  function next(): void {
    index += 1;
    misses = 0;
    if (index >= lesson.steps.length) finish();
    else show();
  }

  function miss(step: LessonStep, reveal: string): void {
    misses += 1;
    sfx('soft');
    pet.classList.remove('tilt');
    void pet.offsetWidth;
    pet.classList.add('tilt');
    if (misses >= 2) {
      // Never stuck: show the answer and why, then move on.
      replace(bubble, `It is ${reveal}. Look at the picture and count with me.`);
      say('l_show_answer');
      replace(controls, h('div', { class: 'lesson-reveal' }, rich(reveal)), button('Next', next, 'btn-primary btn-big lesson-next'));
      onKey = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          next();
        }
      };
    } else {
      replace(bubble, `Not quite. ${step.text}`);
      say('l_try');
    }
  }

  function right(): void {
    sfx('yes');
    pet.classList.remove('jump');
    void pet.offsetWidth;
    pet.classList.add('jump');
    next();
  }

  function show(): void {
    const step = lesson.steps[index] as LessonStep;
    replace(bubble, step.text);
    replace(sceneHost, drawScene(step.scene));
    replace(dots, times(lesson.steps.length, (i) => h('i', { class: i < index ? 'done' : i === index ? 'now' : '' })));
    const ask = step.ask;
    onKey = () => {};

    if (!ask) {
      const last = index === lesson.steps.length - 1;
      replace(controls, button(last ? 'Let us go!' : 'Next', next, 'btn-primary btn-big lesson-next'));
      onKey = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          next();
        }
      };
    } else if (ask.kind === 'tap') {
      replace(controls, button(ask.label, right, 'btn-primary btn-big pulse lesson-tap'));
    } else if (ask.kind === 'choice') {
      replace(
        controls,
        h(
          'div',
          { class: 'choice-row' },
          ask.choices.map((c) => {
            const b = button(rich(c), () => (c === ask.expected ? right() : miss(step, ask.expected)), 'btn-choice');
            b.dataset.choice = c;
            return b;
          }),
        ),
      );
    } else {
      let typed = '';
      const display = h('div', { class: 'entry lesson-entry' });
      const ok = button('OK', () => submit(), 'btn-primary btn-big');
      const draw = (): void => {
        replace(display, typed || ' ');
        display.classList.toggle('empty', !typed);
        ok.toggleAttribute('disabled', !typed);
      };
      const submit = (): void => {
        if (!typed) return;
        if (Number(typed) === ask.expected) right();
        else {
          typed = '';
          draw();
          miss(step, String(ask.expected));
        }
      };
      const digit = (d: string): void => {
        typed = pushDigit(typed, d);
        draw();
      };
      const erase = (): void => {
        typed = typed.slice(0, -1);
        draw();
      };
      replace(controls, display, keypad(digit, erase), ok);
      draw();
      onKey = (e) => {
        if (/^[0-9]$/.test(e.key)) digit(e.key);
        else if (e.key === 'Backspace') erase();
        else if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      };
    }
    say(index === 0 ? 'l_intro' : null, step.clip);
  }

  const el = h(
    'div',
    { class: 'screen lesson-screen', 'data-lesson': lesson.id },
    backdrop(
      ['mult', 'div', 'fadd', 'dec'].includes(lesson.id) ? BAKERY_BG : ['frac', 'same', 'ftimes', 'ftray'].includes(lesson.id) ? 'hollow' : ['count', 'more', 'ten', 'place'].includes(lesson.id) ? 'canyon' : 'meadow',
    ),
    h(
      'div',
      { class: 'card lesson-card' },
      h('div', { class: 'lesson-head' }, h('h2', null, lesson.title), speaker(), dots),
      h('div', { class: 'lesson-body' }, h('div', { class: 'lesson-left' }, bubble, pet), sceneHost),
      controls,
    ),
  );

  show();
  return { el, onKey: (e) => onKey(e) };
};
