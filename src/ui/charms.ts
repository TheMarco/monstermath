import type { SpeciesId } from '../data/monsters';
import { charm } from '../shop';
import { h } from './dom';

/**
 * Charms float just above a monster's head. The spot is found from the
 * picture itself: the highest part of the monster, and where its top sits
 * left to right. Floating keeps it looking right while the monster moves.
 */

let lookup: (id: SpeciesId) => string | undefined = () => undefined;

/** The game tells the pictures which charm each monster wears. */
export function setCharmLookup(fn: (id: SpeciesId) => string | undefined): void {
  lookup = fn;
}

export function charmIcon(id: string, size = 40): HTMLElement {
  const el = h('span', { class: 'charm-icon', style: `width:${size}px;height:${size}px`, 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="0 0 48 48" width="100%" height="100%">${charm(id)?.svg ?? ''}</svg>`;
  return el;
}

interface Anchor {
  x: number;
  y: number;
}

const anchors = new Map<string, Anchor>();
const DEFAULT: Anchor = { x: 0.5, y: 0.06 };
const GRID = 48;

/** Top of the monster in its picture, as fractions of the picture's size. */
export function findAnchor(alpha: (x: number, y: number) => boolean, grid: number): Anchor {
  let topRow = -1;
  for (let y = 0; y < grid && topRow < 0; y++) {
    let solid = 0;
    for (let x = 0; x < grid; x++) if (alpha(x, y)) solid += 1;
    if (solid >= 2) topRow = y;
  }
  if (topRow < 0) return DEFAULT;
  // Average over the top fifth of the monster, so one ear or horn tip does not pull the charm sideways.
  const band = Math.max(3, Math.round(grid * 0.16));
  let sum = 0;
  let count = 0;
  for (let y = topRow; y < Math.min(grid, topRow + band); y++) {
    for (let x = 0; x < grid; x++) {
      if (alpha(x, y)) {
        sum += x + 0.5;
        count += 1;
      }
    }
  }
  return { x: count ? sum / count / grid : 0.5, y: topRow / grid };
}

function measure(img: HTMLImageElement): Anchor {
  const cached = anchors.get(img.src);
  if (cached) return cached;
  let found = DEFAULT;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = GRID;
    canvas.height = GRID;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, GRID, GRID);
      const data = ctx.getImageData(0, 0, GRID, GRID).data;
      found = findAnchor((x, y) => (data[(y * GRID + x) * 4 + 3] as number) > 60, GRID);
    }
  } catch {
    /* no canvas here: the default spot is fine */
  }
  anchors.set(img.src, found);
  return found;
}

/** Put the monster's charm on its picture, or take it off. */
export function dress(wrap: HTMLElement, id: SpeciesId, size: number, charmId: string | undefined = lookup(id)): void {
  wrap.querySelector('.charm')?.remove();
  if (!charmId || !charm(charmId)) return;
  const px = Math.max(18, Math.round(size * 0.26));
  const el = h('span', { class: 'charm', 'data-charm': charmId, style: `width:${px}px;height:${px}px` });
  el.innerHTML = `<svg viewBox="0 0 48 48" width="100%" height="100%">${charm(charmId)?.svg ?? ''}</svg>`;
  const place = (a: Anchor): void => {
    el.style.left = `${Math.round(a.x * size - px / 2)}px`;
    el.style.top = `${Math.round(Math.max(a.y * size - px * 0.95, -px * 0.8))}px`;
  };
  place(DEFAULT);
  const img = wrap.querySelector('img');
  if (img) {
    if (img.complete && img.naturalWidth > 0) place(measure(img));
    else img.addEventListener('load', () => place(measure(img)), { once: true });
  }
  wrap.appendChild(el);
}
