import { say, sfx } from '../audio';
import { decorArt } from '../data/monsters';
import { buyCharm, buyDecor, CHARMS, DECOR, ownsCharm, ownsDecor, type Bought } from '../shop';
import { backButton, backdrop, button, type Screen } from '../ui/common';
import { charmIcon } from '../ui/charms';
import { h, replace, type Child } from '../ui/dom';
import { berry } from '../ui/models';

/** A decoration's picture, with a plain stand-in until the art is downloaded. */
export function decorImg(id: string, size: number): HTMLElement {
  const wrap = h('span', { class: 'decor-pic', style: `width:${size}px;height:${size}px` });
  const img = h('img', { src: decorArt(id), alt: '', draggable: 'false' });
  img.addEventListener('error', () => wrap.replaceChildren(h('span', { class: 'decor-blob' }, DECOR.find((d) => d.id === id)?.name ?? id)));
  wrap.appendChild(img);
  return wrap;
}

/** The berry shop: charms for monsters, decorations for the meadow. */
export const shopScreen: Screen = (app) => {
  const { save } = app;
  const purse = h('span', { class: 'berry-count shop-purse' });
  const charmGrid = h('div', { class: 'shop-grid' });
  const decorGrid = h('div', { class: 'shop-grid' });

  function after(result: Bought, tip: string, firstOfKind: boolean): void {
    if (result === 'poor') {
      sfx('soft');
      say('shop_poor');
      return;
    }
    if (result !== 'ok') return;
    sfx('win');
    say('shop_bought', firstOfKind ? tip : null);
    app.commit();
    draw();
  }

  function tile(picture: Child, name: string, price: number, owned: boolean, buy: () => void): HTMLElement {
    const can = (save.berries ?? 0) >= price;
    return h(
      'div',
      { class: `shop-tile ${owned ? 'owned' : ''}` },
      picture,
      h('span', { class: 'shop-name' }, name),
      owned
        ? h('span', { class: 'shop-yours' }, 'Yours')
        : button([berry('tiny'), String(price)], buy, `btn-small shop-buy ${can ? 'btn-primary' : 'cannot'}`),
    );
  }

  function draw(): void {
    replace(purse, berry('tiny'), String(save.berries ?? 0));
    replace(
      charmGrid,
      CHARMS.map((c) =>
        tile(charmIcon(c.id, 62), c.name, c.price, ownsCharm(save, c.id), () => after(buyCharm(save, c.id), 'charm_tip', (save.charms ?? []).length === 1)),
      ),
    );
    replace(
      decorGrid,
      DECOR.map((d) =>
        tile(decorImg(d.id, 84), d.name, d.price, ownsDecor(save, d.id), () => after(buyDecor(save, d.id), 'decor_tip', (save.decor ?? []).length === 1)),
      ),
    );
  }

  const el = h(
    'div',
    { class: 'screen shop-screen' },
    backdrop('meadow'),
    h('div', { class: 'topbar' }, backButton(app)),
    h(
      'div',
      { class: 'card shop-card' },
      h('h2', null, 'Berry Shop', purse),
      h('h3', null, 'Charms for your monsters'),
      charmGrid,
      h('h3', null, 'Decorations for your meadow'),
      decorGrid,
    ),
  );

  draw();
  if (!save.seenTips.includes('shop')) {
    save.seenTips.push('shop');
    app.commit();
    say('shop_tip');
  }
  return { el };
};
