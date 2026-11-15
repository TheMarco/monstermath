import { say, sfx } from '../audio';
import { decorArt, themeArt } from '../data/monsters';
import { buyCharm, buyDecor, buyTheme, CHARMS, DECOR, DECOR_OUT_MAX, decorOut, ownsCharm, ownsTheme, setDecorOut, setTheme, THEMES, type Bought } from '../shop';
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

/** The berry shop: charms for monsters, decorations and whole new looks for the meadow. */
export const shopScreen: Screen = (app, params) => {
  const { save } = app;
  type Tab = 'charms' | 'decor' | 'looks';
  let tab: Tab = params.tab === 'decor' || params.tab === 'looks' ? params.tab : 'charms';
  const purse = h('span', { class: 'berry-count shop-purse' });
  const tabs = h('div', { class: 'shop-tabs' });
  const grid = h('div', { class: 'shop-grid' });
  const note = h('p', { class: 'shop-note' });

  function after(result: Bought, tip: string | null, firstOfKind: boolean): void {
    if (result === 'poor') {
      sfx('soft');
      say('shop_poor');
      return;
    }
    if (result !== 'ok') return;
    sfx('buy');
    say('shop_bought', firstOfKind ? tip : null);
    app.commit();
    draw();
  }

  function tile(picture: Child, name: string, price: number, owned: boolean, buy: () => void, ownedControl?: Child, cls = ''): HTMLElement {
    const can = (save.berries ?? 0) >= price;
    return h(
      'div',
      { class: `shop-tile ${owned ? 'owned' : ''} ${cls}` },
      picture,
      h('span', { class: 'shop-name' }, name),
      owned
        ? (ownedControl ?? h('span', { class: 'shop-yours' }, 'Yours'))
        : button([berry('tiny'), String(price)], buy, `btn-small shop-buy ${can ? 'btn-primary' : 'cannot'}`),
    );
  }

  function decorTile(d: (typeof DECOR)[number]): HTMLElement {
    const mine = (save.decor ?? []).find((x) => x.id === d.id);
    const toggle = mine
      ? button(
          mine.away ? 'Put out' : 'Put away',
          () => {
            if (!setDecorOut(save, d.id, !!mine.away)) {
              sfx('soft');
              note.classList.add('nudge');
              window.setTimeout(() => note.classList.remove('nudge'), 700);
              return;
            }
            sfx('pop');
            app.commit();
            draw();
          },
          `btn-small shop-toggle ${mine.away ? 'btn-primary' : ''}`,
        )
      : undefined;
    return tile(decorImg(d.id, 84), d.name, d.price, !!mine, () => after(buyDecor(save, d.id), 'decor_tip', (save.decor ?? []).length === 1), toggle, mine?.away ? 'away' : '');
  }

  function lookTile(t: (typeof THEMES)[number]): HTMLElement {
    const owned = ownsTheme(save, t.id);
    const on = save.theme === t.id;
    const pic = h('span', { class: 'look-pic' });
    const img = h('img', { src: themeArt(t.id), alt: '', draggable: 'false' });
    // Until the picture is downloaded there is nothing to sell.
    img.addEventListener('error', () => pic.closest('.shop-tile')?.remove());
    pic.appendChild(img);
    const toggle = button(
      on ? 'In use' : 'Use',
      () => {
        setTheme(save, on ? undefined : t.id);
        sfx('pop');
        app.commit();
        draw();
      },
      `btn-small shop-toggle ${on ? '' : 'btn-primary'}`,
    );
    return tile(pic, t.name, t.price, owned, () => after(buyTheme(save, t.id), null, false), toggle, 'look-tile');
  }

  function draw(): void {
    replace(purse, berry('tiny'), String(save.berries ?? 0));
    const names: Array<[Tab, string]> = [
      ['charms', 'Charms'],
      ['decor', 'Decorations'],
      ['looks', 'Meadow looks'],
    ];
    replace(
      tabs,
      names.map(([id, label]) =>
        button(
          label,
          () => {
            tab = id;
            draw();
          },
          `btn-small shop-tab ${tab === id ? 'on' : ''}`,
        ),
      ),
    );
    grid.className = `shop-grid shop-grid-${tab}`;
    if (tab === 'charms') {
      replace(
        grid,
        CHARMS.map((c) =>
          tile(charmIcon(c.id, 62), c.name, c.price, ownsCharm(save, c.id), () => after(buyCharm(save, c.id), 'charm_tip', (save.charms ?? []).length === 1)),
        ),
      );
      replace(note, 'Charms are for your monsters. Tap a friend in the meadow to put one on.');
    } else if (tab === 'decor') {
      replace(grid, DECOR.map(decorTile));
      replace(note, `${decorOut(save).length} of ${DECOR_OUT_MAX} places in your meadow are in use. Put one away to make room.`);
    } else {
      replace(grid, THEMES.map(lookTile));
      replace(note, 'A new look changes your whole meadow.');
    }
  }

  const el = h(
    'div',
    { class: 'screen shop-screen' },
    backdrop('meadow'),
    h('div', { class: 'topbar' }, backButton(app)),
    h('div', { class: 'card shop-card' }, h('h2', null, 'Berry Shop', purse), tabs, grid, note),
  );

  draw();
  if (!save.seenTips.includes('shop')) {
    save.seenTips.push('shop');
    app.commit();
    say('shop_tip');
  }
  return { el };
};
