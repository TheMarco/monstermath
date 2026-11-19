import { say, sayAgain, sayAlso, sfx } from '../audio';
import { art, bg, eggArt, SPECIES, type BgName, type SpeciesId, type Stage } from '../data/monsters';
import { growth, type MonsterState } from '../state';
import type { GainLine, Sticker } from '../rewards';
import { mountAnim } from './anim';
import { dress } from './charms';
import { playFx, type Fx } from './fx';
import { h, times, type Child } from './dom';

export interface App {
  save: import('../state').Save;
  go(screen: ScreenName, params?: Record<string, unknown>): void;
  commit(): void;
  reset(): void;
  /** Loads the current player's save again and shows the title. */
  reload(): void;
}

export type ScreenName = 'title' | 'intro' | 'home' | 'befriend' | 'canyon' | 'journal' | 'stickers' | 'lesson' | 'grownups' | 'hollow' | 'shop' | 'players' | 'early' | 'upper' | 'match';

export interface ScreenHandle {
  el: HTMLElement;
  onKey?: (e: KeyboardEvent) => void;
  dispose?: () => void;
}

export type Screen = (app: App, params: Record<string, unknown>) => ScreenHandle;

/** Monster picture. If the art file is missing, a labelled blob stands in. */
export function monsterImg(id: SpeciesId, stage: Stage, size: number, cls = '', intro?: string): HTMLElement {
  const wrap = h('div', { class: `monster ${cls}`, style: `width:${size}px;height:${size}px` });
  const img = h('img', { src: art(id, stage), alt: SPECIES[id].name, draggable: 'false' });
  img.addEventListener('error', () => {
    if (stage !== 1 && !img.dataset.fellBack) {
      // Evolved art missing: fall back to the first-stage picture before giving up.
      img.dataset.fellBack = '1';
      img.src = art(id, 1);
      return;
    }
    wrap.replaceChildren(h('div', { class: `blob blob-${id}` }, SPECIES[id].name.charAt(0)));
  });
  wrap.appendChild(img);
  // A monster she has not met stays a grey shape: no moving, coloured clip on top of it.
  if (!cls.includes('silhouette')) {
    mountAnim(wrap, id, stage, size, intro);
    dress(wrap, id, size);
  }
  return wrap;
}

export function backdrop(name: BgName): HTMLElement {
  return h('div', { class: `backdrop backdrop-${name}`, style: `background-image:url("${bg(name)}")` });
}

export function button(label: Child, onClick: () => void, cls = ''): HTMLButtonElement {
  return h(
    'button',
    {
      class: `btn ${cls}`,
      type: 'button',
      onclick: () => {
        sfx('tap');
        onClick();
      },
    },
    label,
  );
}

export function backButton(app: App, label = 'Meadow'): HTMLElement {
  return button([icon('back'), label], () => app.go('home'), 'btn-back');
}

/** Replays the last spoken line, or speaks the given one. */
export function speaker(clips?: () => Array<string | null>): HTMLElement {
  return h(
    'button',
    {
      class: 'btn btn-round btn-speaker',
      type: 'button',
      'aria-label': 'Say it again',
      onclick: () => (clips ? say(...clips()) : sayAgain()),
    },
    icon('speaker'),
  );
}

const ICONS: Record<string, string> = {
  back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
  speaker:
    '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  note: '<path d="M9 18V5.5l10-2V16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="6.5" cy="18" rx="3" ry="2.4" fill="currentColor"/><ellipse cx="16.5" cy="16" rx="3" ry="2.4" fill="currentColor"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  heart:
    '<path d="M12 20.5s-7.5-4.6-7.5-10A4.5 4.5 0 0112 7.6a4.5 4.5 0 017.5 2.9c0 5.4-7.5 10-7.5 10z" fill="currentColor"/>',
  star: '<path d="M12 2.8l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.6 3.1 1.2-6.3L3 9.4l6.3-.8L12 2.8z" fill="currentColor"/>',
  book: '<path d="M5 4h9a4 4 0 014 4v12H9a4 4 0 01-4-4V4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 9h5M9 13h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  grass:
    '<path d="M4 20c0-6 1-10 3-13 1 4 1 8 1 13M10 20c0-8 1-13 3-16 1 5 1 10 1 16M16 20c0-5 1-9 3-11 0 4 0 7-1 11" fill="currentColor"/>',
  berry:
    '<circle cx="12" cy="14" r="7" fill="currentColor"/><path d="M12 7c1-3 3-4 6-4-1 3-3 4-6 4z" fill="#7cc48a"/>',
  drop: '<path d="M12 3c4 5.500 6.500 8.800 6.500 12a6.500 6.500 0 01-13 0C5.500 11.800 8 8.500 12 3z" fill="currentColor"/>',
  bun: '<path d="M3.500 15a8.500 8 0 0117 0v1.500a2 2 0 01-2 2h-13a2 2 0 01-2-2V15z" fill="currentColor"/><path d="M8.500 9.500l1.500 2.500M12 8.500v3M15.500 9.500L14 12" fill="none" stroke="#fff" stroke-width="1.600" stroke-linecap="round"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.300 1 2.100h5c0-.8.4-1.600 1-2.100A6 6 0 0012 3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  erase: '<path d="M9 6h11v12H9l-6-6 6-6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 9.500l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};

export function icon(name: keyof typeof ICONS | string, cls = ''): HTMLElement {
  const span = h('span', { class: `icon icon-${name} ${cls}`, 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%">${ICONS[name] ?? ''}</svg>`;
  return span;
}

const CONFETTI = ['#ff8fb1', '#ffd86b', '#8edbc4', '#b79cf0', '#8ec5ff', '#ffb37a'];

export function confetti(count = 46): HTMLElement {
  return h(
    'div',
    { class: 'confetti', 'aria-hidden': 'true' },
    times(count, (i) =>
      h('i', {
        style: [
          `left:${(i * 37) % 100}%`,
          `background:${CONFETTI[i % CONFETTI.length]}`,
          `animation-delay:${((i * 53) % 900) / 1000}s`,
          `animation-duration:${1.8 + ((i * 29) % 14) / 10}s`,
          `transform:rotate(${(i * 47) % 360}deg)`,
        ].join(';'),
      }),
    ),
  );
}

/** Hearts or stars that float up from a spot and fade. */
export function floatUp(parent: HTMLElement, kind: 'heart' | 'star', count: number): void {
  const n = Math.min(count, 8);
  for (let i = 0; i < n; i++) {
    const el = icon(kind, `float float-${kind}`);
    el.style.left = `${30 + ((i * 41) % 45)}%`;
    el.style.animationDelay = `${i * 0.09}s`;
    parent.appendChild(el);
    window.setTimeout(() => el.remove(), 1700 + i * 90);
  }
}

export interface Celebration {
  id?: SpeciesId;
  stage?: Stage;
  title: string;
  lines: string[];
  /** An evolution or hatching sequence to play before the card fills in. */
  fx?: Fx;
  /** Voice clips to play with the party card. */
  voice?: Array<string | null>;
  buttons: Array<{ label: string; onClick: () => void; primary?: boolean }>;
  big?: boolean;
}

/** A full-stage party card. With `fx`, an evolution or hatching sequence plays before the card fills in. */
export function celebrate(host: HTMLElement, c: Celebration): HTMLElement {
  const size = c.big ? 260 : 200;
  const stage = c.stage ?? 1;
  const spot = h('div', { class: 'party-spot', style: `width:${size}px;height:${size}px` });
  const card = h(
    'div',
    { class: `party ${c.big ? 'party-big' : ''} ${c.fx ? 'pending' : ''}` },
    c.id ? spot : null,
    h('h2', null, c.title),
    c.lines.map((line) => h('p', null, line)),
    h(
      'div',
      { class: 'party-buttons' },
      c.buttons.map((b) =>
        button(
          b.label,
          () => {
            overlay.remove();
            b.onClick();
          },
          b.primary ? 'btn-primary btn-big' : 'btn-big',
        ),
      ),
    ),
  );
  const overlay: HTMLElement = h('div', { class: 'overlay' }, card);
  host.appendChild(overlay);

  const reveal = (): void => {
    if (c.id) spot.replaceChildren(monsterImg(c.id, stage, size, 'jump'));
    card.classList.remove('pending');
    overlay.insertBefore(confetti(c.big ? 70 : 40), card);
    if (c.voice) say(...c.voice);
  };

  if (c.fx && c.id) {
    spot.appendChild(playFx(c.id, stage, c.fx, size, reveal));
  } else {
    sfx(c.big ? 'win' : 'star');
    reveal();
  }
  return overlay;
}

/** Stars as filled and empty icons. */
export function starRow(filled: number, total: number): HTMLElement {
  return h(
    'span',
    { class: 'star-row' },
    times(total, (i) => icon('star', i < filled ? 'on' : 'off')),
  );
}

/** A button that only fires after being held: keeps small hands out of the grown-up page. */
export function holdButton(label: string, onDone: () => void, ms = 1500): HTMLElement {
  let timer: number | undefined;
  const el = h('button', { class: 'btn btn-quiet hold', type: 'button' }, h('span', { class: 'hold-fill' }), h('span', { class: 'hold-label' }, label));
  const start = (): void => {
    el.classList.add('holding');
    el.style.setProperty('--hold-ms', `${ms}ms`);
    timer = window.setTimeout(() => {
      el.classList.remove('holding');
      onDone();
    }, ms);
  };
  const stop = (): void => {
    el.classList.remove('holding');
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointerleave', stop);
  el.addEventListener('pointercancel', stop);
  return el;
}

/** A sticker medallion. Unearned ones are shown pale. */
export function stickerEl(st: Sticker, earned = true, size = 64): HTMLElement {
  return h(
    'span',
    { class: `sticker st-${st.tone} ${earned ? '' : 'locked'}`, style: `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.46)}px` },
    st.mark,
  );
}

export function eggImg(size: number, cls = ''): HTMLElement {
  const wrap = h('div', { class: `monster egg ${cls}`, style: `width:${size}px;height:${size}px` });
  const img = h('img', { src: eggArt(), alt: 'egg', draggable: 'false' });
  img.addEventListener('error', () => wrap.replaceChildren(h('div', { class: 'blob blob-egg' }, '?')));
  wrap.appendChild(img);
  return wrap;
}

/** Small banners for rewards. They never block play. */
export function toasts(host: HTMLElement, lines: GainLine[]): void {
  if (lines.length === 0) return;
  let stack = host.querySelector<HTMLElement>('.toast-stack');
  if (!stack) {
    stack = h('div', { class: 'toast-stack' });
    host.appendChild(stack);
  }
  const target = stack;
  lines.forEach((line, i) => {
    window.setTimeout(() => {
      const badge =
        line.kind === 'sticker' && line.sticker
          ? stickerEl(line.sticker, true, 44)
          : line.kind === 'egg'
            ? eggImg(44)
            : icon(line.kind === 'level' ? 'star' : 'heart', 'on toast-icon');
      const el = h('div', { class: `toast toast-${line.kind}` }, badge, h('span', null, line.text));
      target.appendChild(el);
      sfx('star');
      sayAlso(line.clip);
      window.setTimeout(() => el.remove(), 4200);
    }, 500 + i * 1300);
  });
}

/** Stars toward the next stage, or a note that the monster is fully evolved. */
export function growthRow(m: MonsterState): HTMLElement {
  const g = growth(m);
  return g.final
    ? h('p', { class: 'friend-stars' }, icon('star', 'on'), h('span', null, `Fully evolved! ${m.stars} stars`))
    : h('p', { class: 'friend-stars' }, starRow(g.have, g.need), h('span', null, 'to evolve'));
}
