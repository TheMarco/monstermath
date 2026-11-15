import { h, times } from './dom';

/**
 * The Bakery's pictures: buns, trays of ten buns and racks of a hundred; a
 * baking tray split into parts for multiplying; baskets for sharing; a loaf
 * cut into slices for fractions; and a tray of one hundred small squares for
 * decimals. The play screen and the lessons draw with the same pieces.
 */

export function bun(cls = ''): HTMLElement {
  return h('i', { class: `bun ${cls}` });
}

/** A small tray that holds ten buns. */
export function tenTray(cls = ''): HTMLElement {
  return h('span', { class: `bun-ten ${cls}` }, times(10, () => h('i')));
}

/** A rack that holds a hundred buns. */
export function rack(cls = ''): HTMLElement {
  return h('span', { class: `bun-rack ${cls}` }, '100');
}

/** A number of buns as racks, trays of ten and loose buns. `tone` gives each piece its part colour. */
export function bunUnits(n: number, loose = false, tone: (before: number) => string = () => ''): HTMLElement[] {
  const out: HTMLElement[] = [];
  let done = 0;
  const add = (count: number, size: number, make: (cls: string) => HTMLElement): void => {
    for (let i = 0; i < count; i++) {
      out.push(make(tone(done)));
      done += size;
    }
  };
  if (loose) {
    add(n, 1, bun);
    return out;
  }
  add(Math.floor(n / 100), 100, rack);
  add(Math.floor(n / 10) % 10, 10, tenTray);
  add(n % 10, 1, bun);
  return out;
}

// ---- multiplying: a baking tray split into parts ------------------------------------

export interface TrayOptions {
  /** Show the product in every part, or only in the parts with these indexes. */
  lit?: boolean | number[];
  /** What she typed for each part. Shown in the part when it has no buns to count. */
  typed?: Array<string | null>;
  /** Room for the picture, in pixels. */
  width?: number;
}

/** How wide a part is, counted in buns. */
function unitsWide(c: number): number {
  return c >= 100 ? (c / 100) * 3.5 : c >= 10 ? (c / 10) * 3.1 : c * 1.3;
}

/**
 * A tray of buns: `rows` down, `cols` across, each a list of parts (23 is 20
 * and 3). With one row part of 9 or less every bun is drawn, in trays of ten.
 * Bigger trays only name their parts.
 */
export function bunTray(cols: number[], rows: number[], opts: TrayOptions = {}): HTMLElement {
  const concrete = rows.length === 1 && (rows[0] ?? 0) <= 9;
  const isLit = (k: number): boolean => (Array.isArray(opts.lit) ? opts.lit.includes(k) : opts.lit === true);
  // The biggest bun that lets every part, and the product written under it, fit in the room.
  const room = (opts.width ?? 570) - 40;
  let size = 20;
  while (size > 9 && cols.reduce((sum, c) => sum + Math.max(unitsWide(c) * size + 22, 84), 0) > room) size -= 1;
  const cells = rows.flatMap((r, ri) =>
    [h('b', { class: 'bk-side' }, String(r))].concat(
      cols.map((c, ci) => {
        const k = ri * cols.length + ci;
        const lit = isLit(k);
        if (concrete) {
          return h(
            'div',
            { class: `bk-cell tone-${k} ${lit ? 'lit' : ''}`, 'data-part': String(k) },
            h('div', { class: 'bk-rows' }, times(r, () => h('div', { class: 'bk-row' }, bunUnits(c)))),
            lit ? h('b', { class: 'bk-product', 'aria-label': `${c} × ${r} = ${c * r}` }, String(c * r)) : null,
          );
        }
        const typed = opts.typed?.[k];
        return h(
          'div',
          { class: `bk-cell plain tone-${k} ${lit ? 'lit' : ''} ${c >= 10 ? 'wide' : ''} ${r >= 10 ? 'tall' : ''}`, 'data-part': String(k) },
          h('span', { class: 'bk-eq' }, `${c} × ${r}`),
          h('b', { class: 'bk-val' }, lit ? String(c * r) : typed || '?'),
        );
      }),
    ),
  );
  return h(
    'div',
    { class: `bk-tray ${concrete ? 'concrete' : 'named'}`, style: `--bu:${size}px;grid-template-columns:auto repeat(${cols.length},auto)` },
    h('span', { class: 'bk-corner' }, '×'),
    cols.map((c) => h('b', { class: 'bk-head' }, String(c))),
    cells,
  );
}

// ---- dividing: buns shared into baskets ---------------------------------------------

export interface ShareOptions {
  total: number;
  by: number;
  /** Buns in each basket so far: 0 before sharing, the answer when all are shared. */
  dealt: number;
  /** The parts she shares one at a time. Each gets its own colour. */
  parts?: number[];
  /** Draw every bun by itself, without trays of ten (small numbers). */
  loose?: boolean;
  /** Write the count under each basket and by the buns left over. */
  counts?: boolean;
}

export function shareModel(o: ShareOptions): HTMLElement {
  const parts = o.parts ?? [];
  const left = o.total - o.dealt * o.by;
  /** The part a bun in the pile belongs to, from how many buns come before it. */
  const partOf = (before: number): string => {
    if (parts.length < 2) return '';
    let end = 0;
    for (let i = 0; i < parts.length; i++) {
      end += parts[i] ?? 0;
      if (before < end) return `tone-${i}`;
    }
    return `tone-${parts.length - 1}`;
  };
  /** In a basket the hundreds, tens and ones of the answer are the parts. */
  const digits = [Math.floor(o.dealt / 100) * 100, (Math.floor(o.dealt / 10) % 10) * 10, o.dealt % 10].filter((x) => x > 0);
  const inBasket = (before: number): string => {
    if (parts.length < 2 || o.loose) return '';
    let end = 0;
    for (let i = 0; i < digits.length; i++) {
      end += digits[i] ?? 0;
      if (before < end) return `tone-${i}`;
    }
    return '';
  };
  const basketWidth = Math.min(150, Math.floor((570 - (o.by - 1) * 8) / o.by));
  /** Racks, trays and loose buns each get a row of their own in a basket. */
  const rows = (units: HTMLElement[]): HTMLElement[] =>
    ['bun-rack', 'bun-ten', 'bun'].map((kind) => units.filter((u) => u.classList.contains(kind))).filter((row) => row.length > 0).map((row) => h('div', { class: 'sh-row' }, row));
  return h(
    'div',
    { class: 'share' },
    h(
      'div',
      { class: `sh-pile ${left === 0 ? 'empty' : ''} ${o.loose ? 'loose' : ''}`, style: '--bu:20px' },
      bunUnits(left, o.loose || o.dealt > 0, o.dealt > 0 && left < o.by ? () => 'over' : partOf),
      // Buns that can still be shared are not leftovers yet.
      o.counts && o.dealt > 0 && left < o.by ? h('b', { class: 'sh-left' }, left === 0 ? 'none left' : `${left} left`) : null,
    ),
    h(
      'div',
      { class: 'sh-baskets', style: `--bu:${basketWidth < 84 ? 11 : basketWidth < 110 ? 14 : 16}px` },
      times(o.by, () =>
        h(
          'div',
          { class: 'sh-basket', style: `width:${basketWidth}px` },
          h('div', { class: 'sh-in' }, rows(bunUnits(o.dealt, o.loose, inBasket))),
          o.counts && o.dealt > 0 ? h('b', { class: 'sh-count' }, String(o.dealt)) : null,
        ),
      ),
    ),
  );
}

// ---- fractions: a loaf cut into slices -----------------------------------------------

/** One slice: empty, one of the two amounts, or eaten. */
export type Slice = '' | 'a' | 'b' | 'gone';

export interface LoafOptions {
  width?: number;
  height?: number;
  /** The loaf was first cut into this many slices: those cuts stay bold, the new ones are thin. */
  first?: number;
  /** Write 1, 2, 3 on the slices that count. */
  numbers?: boolean;
}

export function loaf(slices: Slice[], opts: LoafOptions = {}): HTMLElement {
  const per = opts.first && slices.length % opts.first === 0 ? slices.length / opts.first : 1;
  let count = 0;
  return h(
    'div',
    { class: 'loaf', style: `width:${opts.width ?? 420}px;height:${opts.height ?? 64}px` },
    slices.map((s, i) => {
      if (s === 'a' || s === 'b') count += 1;
      return h('i', { class: `slice ${s ? `on-${s}` : ''} ${i % per === 0 ? '' : 'fine'}` }, opts.numbers && (s === 'a' || s === 'b') ? String(count) : null);
    }),
  );
}

/** A loaf with its first `shaded` slices filled. `recut` cuts every slice into equal smaller ones. */
export function loafOf(parts: number, shaded: number, tone: 'a' | 'b' = 'a', recut?: number, opts: LoafOptions = {}): HTMLElement {
  const k = recut && recut % parts === 0 ? recut / parts : 1;
  return loaf(
    times(parts * k, (i) => (i < shaded * k ? tone : '')),
    { ...opts, first: parts },
  );
}

// ---- decimals: a tray of one hundred small squares ------------------------------------

export interface CrumbOptions {
  /** The last squares that are taken away: drawn crossed out. */
  gone?: number;
  size?: number;
}

/**
 * `n` hundredths on trays of one hundred squares, filled strip by strip. A
 * full tray, a full strip and a single square each have their own colour, the
 * same colours as the answer rows.
 */
export function crumbTrays(n: number, opts: CrumbOptions = {}): HTMLElement {
  const size = opts.size ?? 150;
  const kept = n - (opts.gone ?? 0);
  const trays = Math.max(1, Math.ceil(n / 100));
  const fullTrays = Math.floor(kept / 100);
  const fullStrips = Math.floor((kept % 100) / 10);
  const tone = (i: number): string => {
    if (i >= n) return '';
    if (i >= kept) return 'gone';
    if (i < fullTrays * 100) return 'one';
    return i - fullTrays * 100 < fullStrips * 10 ? 'tenth' : 'hund';
  };
  return h(
    'div',
    { class: 'crumbs' },
    times(trays, (t) => h('div', { class: 'crumb-tray', style: `width:${size}px;height:${size}px` }, times(100, (i) => h('i', { class: `crumb ${tone(t * 100 + i)}` })))),
  );
}
