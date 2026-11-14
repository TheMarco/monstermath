import { say, sfx } from '../audio';
import { STICKERS } from '../rewards';
import { backButton, backdrop, stickerEl, type Screen } from '../ui/common';
import { h } from '../ui/dom';
import { stickerClip } from '../voice/lines';

/** The sticker book. Each sticker names a math habit worth building. */
export const stickersScreen: Screen = (app) => {
  const { save } = app;
  const el = h(
    'div',
    { class: 'screen stickers-screen' },
    backdrop('meadow'),
    h('div', { class: 'topbar' }, backButton(app)),
    h(
      'div',
      { class: 'card stickers-card' },
      h('h2', null, 'Sticker Book', h('span', { class: 'journal-count' }, `${save.stickers.length} of ${STICKERS.length}`)),
      h(
        'div',
        { class: 'sticker-grid' },
        STICKERS.map((st) => {
          const earned = save.stickers.includes(st.id);
          return h(
            'button',
            {
              class: `sticker-tile ${earned ? 'earned' : ''}`,
              type: 'button',
              onclick: () => {
                sfx('pop');
                say(stickerClip(st.id));
              },
            },
            stickerEl(st, earned, 58),
            h('span', { class: 'sticker-name' }, st.name),
            h('span', { class: 'sticker-how' }, st.how),
          );
        }),
      ),
    ),
  );
  return { el };
};
