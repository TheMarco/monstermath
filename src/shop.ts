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
];

export interface Decor {
  id: string;
  name: string;
  price: number;
  /** Width in the meadow, in stage pixels. */
  size: number;
}

export const DECOR: Decor[] = [
  { id: 'flowers', name: 'Flowers', price: 10, size: 110 },
  { id: 'bush', name: 'Berry bush', price: 12, size: 120 },
  { id: 'lantern', name: 'Lantern', price: 15, size: 120 },
  { id: 'picnic', name: 'Picnic', price: 15, size: 130 },
  { id: 'campfire', name: 'Campfire', price: 18, size: 110 },
  { id: 'crystal', name: 'Crystals', price: 20, size: 120 },
  { id: 'tent', name: 'Tent', price: 25, size: 170 },
  { id: 'fountain', name: 'Fountain', price: 30, size: 160 },
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
  save.decor = [...(save.decor ?? []), { id, x, y }];
  return 'ok';
}

export function moveDecor(save: Save, id: string, x: number, y: number): void {
  const item = (save.decor ?? []).find((d) => d.id === id);
  if (!item) return;
  item.x = Math.round(Math.max(DECOR_BOUNDS.left, Math.min(DECOR_BOUNDS.right, x)));
  item.y = Math.round(Math.max(DECOR_BOUNDS.top, Math.min(DECOR_BOUNDS.bottom, y)));
}
