import type { Save } from './state';

/**
 * Things to spend berries on. Charms float over a monster's head; decorations
 * stand in the meadow and can be dragged around. Berries only come from
 * playing, so the shop is one more reason to do a few more problems.
 */

export interface Charm {
  id: string;
  name: string;
  price: number;
  /** Drawn in a 48 by 48 box. */
  svg: string;
}

const INK = '#1c1b2e';
const line = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

export const CHARMS: Charm[] = [
  { id: 'star', name: 'Star', price: 8, svg: `<path d="M24 4l6 13 14 2-10 10 2 14-12-7-12 7 2-14L4 19l14-2z" fill="#ffd633" ${line}/>` },
  { id: 'heart', name: 'Heart', price: 8, svg: `<path d="M24 42S5 30 5 17a10 10 0 0119-4 10 10 0 0119 4c0 13-19 25-19 25z" fill="#ff5a7a" ${line}/>` },
  {
    id: 'bow',
    name: 'Bow',
    price: 10,
    svg: `<path d="M24 24L6 12v24z" fill="#ff7eb6" ${line}/><path d="M24 24l18-12v24z" fill="#ff7eb6" ${line}/><circle cx="24" cy="24" r="6" fill="#ff4f9a" ${line}/>`,
  },
  {
    id: 'flower',
    name: 'Flower',
    price: 10,
    svg: `<g fill="#fff" ${line}><circle cx="24" cy="11" r="8"/><circle cx="37" cy="20" r="8"/><circle cx="32" cy="35" r="8"/><circle cx="16" cy="35" r="8"/><circle cx="11" cy="20" r="8"/></g><circle cx="24" cy="24" r="7" fill="#ffd633" ${line}/>`,
  },
  {
    id: 'leaf',
    name: 'Leaf',
    price: 10,
    svg: `<path d="M7 41C7 19 21 7 42 7c0 21-12 35-35 34z" fill="#4fc46a" ${line}/><path d="M9 39L30 18" fill="none" ${line}/>`,
  },
  { id: 'moon', name: 'Moon', price: 12, svg: `<path d="M30 5a19 19 0 1013 27A15 15 0 0130 5z" fill="#ffe680" ${line}/>` },
  { id: 'bolt', name: 'Bolt', price: 12, svg: `<path d="M29 3L9 27h12l-4 18 22-26H26z" fill="#ffd633" ${line}/>` },
  {
    id: 'flame',
    name: 'Flame',
    price: 14,
    svg: `<path d="M24 3c5 10 15 14 15 26a15 15 0 01-30 0c0-8 6-10 8-18 4 4 5-2 7-8z" fill="#ff8a1e" ${line}/><path d="M24 24c3 4 6 6 6 11a6 6 0 01-12 0c0-4 4-6 6-11z" fill="#ffd633"/>`,
  },
  {
    id: 'gem',
    name: 'Gem',
    price: 16,
    svg: `<path d="M10 18l8-11h12l8 11-14 26z" fill="#4fd6e8" ${line}/><path d="M10 18h28M18 7l6 11 6-11M24 18v26" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  },
  {
    id: 'crown',
    name: 'Crown',
    price: 20,
    svg: `<path d="M7 38L4 14l11 9 9-15 9 15 11-9-3 24z" fill="#ffc21e" ${line}/><circle cx="24" cy="30" r="3.500" fill="#ff5a7a" stroke="${INK}" stroke-width="2"/>`,
  },
  {
    id: 'sun',
    name: 'Sun',
    price: 18,
    svg: `<g ${line}><path d="M24 3v7M24 38v7M3 24h7M38 24h7M9 9l5 5M34 34l5 5M39 9l-5 5M14 34l-5 5" fill="none"/><circle cx="24" cy="24" r="10" fill="#ffd633"/></g>`,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    price: 18,
    svg: `<path d="M13 37a9 9 0 01-1-18 12 12 0 0123-2 9.500 9.500 0 01-1 20z" fill="#fff" ${line}/>`,
  },
  {
    id: 'note',
    name: 'Music',
    price: 20,
    svg: `<path d="M19 34V9l20-4v25" fill="none" ${line}/><ellipse cx="13" cy="35" rx="7" ry="5.500" fill="#b05cff" ${line}/><ellipse cx="33" cy="31" rx="7" ry="5.500" fill="#b05cff" ${line}/>`,
  },
  {
    id: 'clover',
    name: 'Clover',
    price: 22,
    svg: `<g fill="#4fc46a" ${line}><circle cx="24" cy="13" r="8"/><circle cx="13" cy="24" r="8"/><circle cx="35" cy="24" r="8"/><circle cx="24" cy="31" r="7"/></g><path d="M24 34c0 5 2 8 5 10" fill="none" ${line}/>`,
  },
  {
    id: 'cherry',
    name: 'Cherries',
    price: 24,
    svg: `<path d="M15 31C17 18 24 10 36 5M33 33C33 20 34 12 36 5" fill="none" ${line}/><circle cx="14" cy="35" r="8" fill="#e8344e" ${line}/><circle cx="33" cy="37" r="8" fill="#e8344e" ${line}/>`,
  },
  {
    id: 'snow',
    name: 'Snowflake',
    price: 26,
    svg: `<path d="M24 4v40M7 14l34 20M41 14L7 34M24 12l-5-5M24 12l5-5M24 36l-5 5M24 36l5 5" fill="none" stroke="#4fb8e8" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    price: 35,
    svg: `<g fill="none" stroke-width="5" stroke-linecap="round"><path d="M5 38a19 19 0 0138 0" stroke="#ff5a7a"/><path d="M11 38a13 13 0 0126 0" stroke="#ffd633"/><path d="M17 38a7 7 0 0114 0" stroke="#4fb8e8"/></g>`,
  },
  {
    id: 'rocket',
    name: 'Rocket',
    price: 45,
    svg: `<path d="M24 3c8 7 10 17 8 28H16C14 20 16 10 24 3z" fill="#fff" ${line}/><circle cx="24" cy="17" r="4" fill="#4fd6e8" ${line}/><path d="M16 25l-8 9h9zM32 25l8 9h-9z" fill="#ff5a7a" ${line}/><path d="M20 34c0 5 2 8 4 11 2-3 4-6 4-11z" fill="#ff8a1e" ${line}/>`,
  },
];

export interface Decor {
  id: string;
  name: string;
  price: number;
  /** Width in the meadow, in stage pixels. */
  size: number;
}

/** Decorations that can stand in the meadow at once. The others wait in the shop until she swaps them in. */
export const DECOR_OUT_MAX = 5;

/** A different look for the whole meadow: something big to save toward that takes no room. */
export interface Theme {
  id: string;
  name: string;
  price: number;
}

export const THEMES: Theme[] = [
  { id: 'sunset', name: 'Sunset', price: 60 },
  { id: 'autumn', name: 'Autumn', price: 80 },
  { id: 'snow', name: 'Snow day', price: 100 },
];

export const DECOR: Decor[] = [
  { id: 'flowers', name: 'Flowers', price: 10, size: 110 },
  { id: 'bush', name: 'Berry bush', price: 12, size: 120 },
  { id: 'lantern', name: 'Lantern', price: 15, size: 120 },
  { id: 'picnic', name: 'Picnic', price: 15, size: 130 },
  { id: 'campfire', name: 'Campfire', price: 18, size: 110 },
  { id: 'crystal', name: 'Crystals', price: 20, size: 120 },
  { id: 'tent', name: 'Tent', price: 25, size: 170 },
  { id: 'fountain', name: 'Fountain', price: 30, size: 160 },
  { id: 'mushrooms', name: 'Mushrooms', price: 22, size: 110 },
  { id: 'swing', name: 'Swing', price: 28, size: 150 },
  { id: 'slide', name: 'Slide', price: 32, size: 160 },
  { id: 'windmill', name: 'Windmill', price: 38, size: 170 },
  { id: 'treehouse', name: 'Tree house', price: 48, size: 190 },
  { id: 'balloon', name: 'Balloon', price: 60, size: 180 },
];

/** Where a new decoration first stands. She can drag it anywhere after that. */
const FIRST_SPOT: Record<string, [number, number]> = {
  flowers: [330, 690],
  bush: [1130, 690],
  lantern: [150, 520],
  picnic: [960, 700],
  campfire: [1010, 250],
  crystal: [1215, 600],
  tent: [215, 290],
  fountain: [640, 250],
  mushrooms: [470, 700],
  swing: [1150, 520],
  slide: [240, 640],
  windmill: [1180, 330],
  treehouse: [330, 300],
  balloon: [820, 260],
};

/** The meadow floor: decorations stay inside it. */
export const DECOR_BOUNDS = { left: 50, right: 1230, top: 215, bottom: 712 };

export function charm(id: string | undefined): Charm | undefined {
  return CHARMS.find((c) => c.id === id);
}

export function ownsCharm(save: Save, id: string): boolean {
  return (save.charms ?? []).includes(id);
}

export function ownsDecor(save: Save, id: string): boolean {
  return (save.decor ?? []).some((d) => d.id === id);
}

export type Bought = 'ok' | 'poor' | 'owned';

function pay(save: Save, price: number): boolean {
  if ((save.berries ?? 0) < price) return false;
  save.berries = (save.berries ?? 0) - price;
  return true;
}

export function buyCharm(save: Save, id: string): Bought {
  const item = charm(id);
  if (!item || ownsCharm(save, id)) return 'owned';
  if (!pay(save, item.price)) return 'poor';
  save.charms = [...(save.charms ?? []), id];
  return 'ok';
}

export function buyDecor(save: Save, id: string): Bought {
  const item = DECOR.find((d) => d.id === id);
  if (!item || ownsDecor(save, id)) return 'owned';
  if (!pay(save, item.price)) return 'poor';
  const [x, y] = FIRST_SPOT[id] ?? [640, 400];
  // A full meadow: the new one waits in the shop until she swaps it in.
  const away = decorOut(save).length >= DECOR_OUT_MAX;
  save.decor = [...(save.decor ?? []), away ? { id, x, y, away } : { id, x, y }];
  return 'ok';
}

/** The decorations standing in the meadow now. */
export function decorOut(save: Save): Array<{ id: string; x: number; y: number }> {
  return (save.decor ?? []).filter((d) => !d.away);
}

/** Put a decoration out or away. Putting one out fails when the meadow is full. */
export function setDecorOut(save: Save, id: string, out: boolean): boolean {
  const item = (save.decor ?? []).find((d) => d.id === id);
  if (!item) return false;
  if (out && item.away && decorOut(save).length >= DECOR_OUT_MAX) return false;
  if (out) delete item.away;
  else item.away = true;
  return true;
}

export function ownsTheme(save: Save, id: string): boolean {
  return (save.themes ?? []).includes(id);
}

export function buyTheme(save: Save, id: string): Bought {
  const item = THEMES.find((t) => t.id === id);
  if (!item || ownsTheme(save, id)) return 'owned';
  if (!pay(save, item.price)) return 'poor';
  save.themes = [...(save.themes ?? []), id];
  save.theme = id;
  return 'ok';
}

/** Use a meadow look she owns, or go back to the plain meadow. */
export function setTheme(save: Save, id: string | undefined): void {
  if (id && !ownsTheme(save, id)) return;
  if (id) save.theme = id;
  else delete save.theme;
}

/**
 * A small gift for finishing the day's goals: a charm she does not have yet
 * (one of the cheaper ones), or a few berries when she has them all.
 */
export function dayGift(save: Save, rng: () => number = Math.random): { charm?: Charm; berries?: number } {
  const open = CHARMS.filter((c) => c.price <= 20 && !ownsCharm(save, c.id));
  const gift = open[Math.floor(rng() * open.length)];
  if (gift) {
    save.charms = [...(save.charms ?? []), gift.id];
    return { charm: gift };
  }
  save.berries = (save.berries ?? 0) + 8;
  return { berries: 8 };
}

export function moveDecor(save: Save, id: string, x: number, y: number): void {
  const item = (save.decor ?? []).find((d) => d.id === id);
  if (!item) return;
  item.x = Math.round(Math.max(DECOR_BOUNDS.left, Math.min(DECOR_BOUNDS.right, x)));
  item.y = Math.round(Math.max(DECOR_BOUNDS.top, Math.min(DECOR_BOUNDS.bottom, y)));
}
