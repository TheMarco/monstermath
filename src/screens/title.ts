import { STARTERS } from '../data/monsters';
import { currentPlayer, friends, players } from '../state';
import { backdrop, button, holdButton, monsterImg, type Screen } from '../ui/common';
import { h } from '../ui/dom';

export const titleScreen: Screen = (app) => {
  const { save } = app;
  const returning = save.introDone;
  const cast = returning
    ? friends(save)
        .slice(0, 5)
        .map((m) => ({ id: m.id, stage: m.stage }))
    : STARTERS.map((id) => ({ id, stage: 1 as const }));

  const start = (): void => {
    if (returning) {
      app.go('home');
    } else {
      app.go('intro');
    }
  };

  const el = h(
    'div',
    { class: 'screen title-screen' },
    backdrop('meadow'),
    h('h1', { class: 'logo-art' }, h('img', { src: 'art/logo.png', alt: 'MonsterMath', draggable: 'false' })),
    h(
      'div',
      { class: 'title-cast' },
      cast.map((c, i) => monsterImg(c.id, c.stage, 250, `calm bob bob-${i % 3}`)),
    ),
    button(returning ? 'Play' : 'Start', start, 'btn-primary btn-huge title-play'),
    h(
      'div',
      { class: 'corner-bl' },
      button(players().length > 1 ? `${currentPlayer().name}: change player` : 'Players', () => app.go('players'), 'btn-quiet btn-small title-players'),
    ),
    h(
      'div',
      { class: 'corner-br' },
      holdButton('Grown-ups (hold)', () => app.go('grownups')),
    ),
  );

  return {
    el,
    onKey(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      start();
    },
  };
};
