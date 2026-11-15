import { say, sfx } from '../audio';
import { levelRow } from '../ui/level';
import { ALL_SPECIES, lovesLabel, SPECIES, type SpeciesId } from '../data/monsters';
import { displayName, type MonsterState } from '../state';
import { backButton, backdrop, button, growthRow, icon, monsterImg, type Screen } from '../ui/common';
import { h } from '../ui/dom';
import { exprChip } from '../ui/models';
import { playWith } from './home';

/** The collection: every monster, and every way she has made each number. */
export const journalScreen: Screen = (app, params) => {
  const { save } = app;
  const openId = params.id as SpeciesId | undefined;

  function loves(id: SpeciesId): string {
    return lovesLabel(id);
  }

  function grid(): HTMLElement {
    const found = ALL_SPECIES.filter((id) => save.monsters[id]?.friend).length;
    return h(
      'div',
      { class: 'card journal-card' },
      h('h2', null, 'Monster Journal', h('span', { class: 'journal-count' }, `${found} of ${ALL_SPECIES.length}`)),
      h(
        'div',
        { class: 'journal-grid' },
        ALL_SPECIES.map((id) => {
          const m = save.monsters[id];
          const known = !!m?.friend;
          return h(
            'button',
            {
              class: `journal-tile ${known ? 'known' : 'unknown'}`,
              type: 'button',
              onclick: () => {
                if (known) {
                  sfx('pop');
                  app.go('journal', { id });
                } else {
                  say(m ? 'met_this' : 'who_is_it');
                }
              },
            },
            monsterImg(id, m?.stage ?? 1, 72, known ? '' : 'silhouette'),
            h('span', { class: 'tile-name' }, known ? displayName(save, id) : '???'),
            known && m ? h('span', { class: 'tile-stars' }, icon('star', 'on'), String(m.stars)) : null,
          );
        }),
      ),
    );
  }

  function page(id: SpeciesId, m: MonsterState): HTMLElement {
    const sp = SPECIES[id];
    const name = displayName(save, id);
    const targets = Object.keys(m.ways)
      .map(Number)
      .sort((x, y) => x - y);
    const trips = save.tripLog.filter((t) => t.monster === id).length;
    const counted = (save.countLog ?? []).filter((t) => t.monster === id).length;
    const honey = (save.fracLog ?? []).filter((t) => t.monster === id).length;
    const baked = (save.upperLog ?? []).filter((t) => t.monster === id).length;

    const nameInput = h('input', {
      class: 'name-input',
      type: 'text',
      maxlength: '12',
      value: name,
      'aria-label': 'Name',
    });
    nameInput.addEventListener('change', () => {
      const typed = nameInput.value.trim();
      m.nickname = typed && typed !== sp.name ? typed : undefined;
      app.commit();
    });
    // Typing a name must not trigger game shortcuts.
    nameInput.addEventListener('keydown', (e) => e.stopPropagation());

    return h(
      'div',
      { class: 'card journal-page' },
      h(
        'div',
        { class: 'page-left' },
        monsterImg(id, m.stage, 250, 'bob'),
        nameInput,
        h('p', { class: 'page-what' }, `${sp.what}. ${sp.blurb}`),
        h('p', { class: 'page-loves' }, `Loves ${loves(id)}`),
        growthRow(m),
        levelRow(save, id),
        h('div', { class: 'friend-buttons' }, button('Play', () => playWith(app, id), 'btn-primary'), button('All monsters', () => app.go('journal'))),
      ),
      h(
        'div',
        { class: 'page-right' },
        sp.habitat === 'canyon'
          ? [h('h3', null, 'Berry trips'), h('p', { class: 'big-number' }, String(trips))]
          : sp.habitat === 'hollow'
            ? [h('h3', null, 'Honey problems solved'), h('p', { class: 'big-number' }, String(honey))]
          : sp.habitat === 'early'
            ? [h('h3', null, 'Berry problems solved'), h('p', { class: 'big-number' }, String(counted))]
          : sp.habitat === 'upper'
            ? [h('h3', null, 'Bakery problems solved'), h('p', { class: 'big-number' }, String(baked))]
          : [
              h('h3', null, 'Numbers we made'),
              targets.length === 0
                ? h('p', null, 'Nothing yet. Go play!')
                : h(
                    'div',
                    { class: 'ways-list' },
                    targets.map((t) =>
                      h(
                        'div',
                        { class: 'ways-row' },
                        h('span', { class: 'ways-target' }, String(t)),
                        h('div', { class: 'ways-chips' }, (m.ways[String(t)] ?? []).map((e) => exprChip(e))),
                      ),
                    ),
                  ),
            ],
      ),
    );
  }

  const m = openId ? save.monsters[openId] : undefined;
  const el = h(
    'div',
    { class: 'screen journal-screen' },
    backdrop('meadow'),
    h('div', { class: 'topbar' }, backButton(app)),
    openId && m?.friend ? page(openId, m) : grid(),
  );

  return { el };
};
