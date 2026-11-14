import { STARTERS } from '../data/monsters';
import { currentPlayer, friends, NAME_MAX, players, renamePlayer } from '../state';
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

  // A new player with no name yet can type one beside Start. It is optional.
  const unnamed = !returning && /^Player \d+$/.test(currentPlayer().name);
  const nameInput = unnamed
    ? h('input', { class: 'title-name', type: 'text', maxlength: String(NAME_MAX), placeholder: 'Your name', 'aria-label': 'Your name', autocomplete: 'off', spellcheck: 'false' })
    : null;
  nameInput?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') e.stopPropagation();
  });

  const start = (): void => {
    if (nameInput && nameInput.value.trim()) {
      renamePlayer(currentPlayer().id, nameInput.value);
      app.commit();
    }
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
    nameInput
      ? h('div', { class: 'title-start' }, nameInput, button('Start', start, 'btn-primary btn-huge'))
      : button(returning ? 'Play' : 'Start', start, 'btn-primary btn-huge title-play'),
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
