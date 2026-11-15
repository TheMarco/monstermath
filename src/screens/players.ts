import { STARTERS } from '../data/monsters';
import { addPlayer, friends, loadSave, NAME_MAX, players, switchPlayer, type Player } from '../state';
import { backdrop, button, monsterImg, type Screen } from '../ui/common';
import { h, replace } from '../ui/dom';

const MAX_PLAYERS = 8;

/** "Who is playing?": one card per child, each shown with their buddy monster. */
export const playersScreen: Screen = (app) => {
  const list = players();
  const size = list.length > 4 ? 110 : 150;

  const choose = (id: string): void => {
    switchPlayer(id);
    app.reload();
  };

  const card = (p: Player, i: number): HTMLElement => {
    const save = loadSave(p.id);
    const buddy = save.buddy ?? save.starter;
    const m = buddy ? save.monsters[buddy] : undefined;
    const count = friends(save).length;
    return h(
      'button',
      { class: 'player-card', type: 'button', 'data-player': p.id, onclick: () => choose(p.id) },
      m ? monsterImg(m.id, m.stage, size, `calm bob bob-${i % 3}`) : monsterImg(STARTERS[i % STARTERS.length]!, 1, size, 'calm player-new'),
      h('span', { class: 'player-name' }, p.name),
      h('span', { class: 'player-sub' }, count ? `${count} ${count === 1 ? 'friend' : 'friends'}` : 'New'),
    );
  };

  const adder = h('div', { class: 'player-add' });
  const showAdd = (): void => {
    const input = h('input', { class: 'player-input', type: 'text', maxlength: String(NAME_MAX), placeholder: 'Name', 'aria-label': 'Name of the new player', autocomplete: 'off', spellcheck: 'false' });
    const create = (): void => {
      addPlayer(input.value);
      app.reload();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') create();
    });
    replace(adder, input, button('OK', create, 'btn-primary'), button('Cancel', () => replace(adder, addBtn), 'btn-quiet'));
    input.focus();
  };
  const addBtn = button('New player', showAdd, 'btn-quiet player-add-btn');
  if (list.length < MAX_PLAYERS) adder.appendChild(addBtn);

  const el = h(
    'div',
    { class: 'screen players-screen' },
    backdrop('meadow'),
    h('h1', { class: 'players-title' }, 'Who is playing?'),
    h('div', { class: `player-row${list.length > 4 ? ' many' : ''}` }, list.map(card)),
    adder,
    h('p', { class: 'player-note' }, 'Grown-ups: to set the level for a new player, pick the player, then hold "Grown-ups" before the first question.'),
  );

  return { el };
};
