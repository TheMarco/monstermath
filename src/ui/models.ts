import { OP_SYMBOL, type Expr } from '../math/expr';
import { toBlocks } from '../math/regroup';
import { h, times, type Child } from './dom';

/** One loose berry. */
export function berry(cls = ''): HTMLElement {
  return h('span', { class: `berry ${cls}` });
}

/** A crate always shows its ten berries, so "one crate is ten" stays visible. */
export function crate(cls = ''): HTMLElement {
  return h('span', { class: `crate ${cls}` }, times(10, () => h('i', { class: 'mini' })));
}

/** A cart holds ten crates: one hundred. */
export function cart(cls = ''): HTMLElement {
  return h('span', { class: `cart ${cls}` }, times(10, () => h('i', { class: 'minicrate' })));
}

/** A number drawn as carts, crates and loose berries. */
export function blocksView(n: number, cls = ''): HTMLElement {
  const [hundreds, tens, ones] = toBlocks(n);
  return h(
    'div',
    { class: `blocks ${cls}` },
    hundreds > 0 && h('div', { class: 'blocks-group' }, times(hundreds, () => cart())),
    tens > 0 && h('div', { class: 'blocks-group' }, times(tens, () => crate())),
    ones > 0 && h('div', { class: 'blocks-group ones' }, times(ones, () => berry())),
  );
}

export interface BarPart {
  value: number;
  label: string;
  tone: 'a' | 'b' | 'gone' | 'ghost';
}

/** A bar split into labelled parts, widths in proportion. */
export function barModel(parts: BarPart[], width = 420): HTMLElement {
  const total = parts.reduce((sum, p) => sum + Math.max(p.value, 0), 0) || 1;
  return h(
    'div',
    { class: 'bar', style: `width:${width}px` },
    parts
      .filter((p) => p.value > 0)
      .map((p) =>
        h(
          'div',
          { class: `bar-part tone-${p.tone}`, style: `flex:${Math.max(p.value / total, 0.12)} 1 0` },
          p.label,
        ),
      ),
  );
}

/** Rows and columns of dots: multiplication as equal rows. */
export function arrayModel(rows: number, cols: number): HTMLElement {
  const size = dotSize(rows, cols);
  return h(
    'div',
    { class: 'array', style: `--dot:${size}px` },
    times(rows, () => h('div', { class: 'array-row' }, times(cols, () => h('i', { class: 'dot' })))),
  );
}

function dotSize(rows: number, cols: number): number {
  const byHeight = Math.floor(110 / rows) - 3;
  const byWidth = Math.floor(400 / cols) - 3;
  return Math.max(4, Math.min(18, byHeight, byWidth));
}

/** A total shared into equal groups: division. */
export function groupsModel(total: number, groups: number): HTMLElement {
  const each = Math.floor(total / groups);
  const size = each > 30 ? 5 : each > 12 ? 7 : 10;
  return h(
    'div',
    { class: 'groups', style: `--dot:${size}px` },
    times(groups, () => h('div', { class: 'group' }, times(each, () => h('i', { class: 'dot' })))),
  );
}

export function canDrawArray(rows: number, cols: number): boolean {
  return rows >= 1 && cols >= 1 && rows <= 12 && cols <= 25 && rows * cols <= 160;
}

export function canDrawGroups(total: number, groups: number): boolean {
  return groups >= 1 && groups <= 12 && total <= 160 && total % groups === 0;
}

/** The picture that goes with a correct expression. */
export function exprModel(e: Expr): HTMLElement {
  switch (e.op) {
    case '+':
      return barModel([
        { value: e.a, label: String(e.a), tone: 'a' },
        { value: e.b, label: String(e.b), tone: 'b' },
      ]);
    case '-':
      return barModel([
        { value: e.a - e.b, label: String(e.a - e.b), tone: 'a' },
        { value: e.b, label: `−${e.b}`, tone: 'gone' },
      ]);
    case '*':
      if (canDrawArray(e.a, e.b)) {
        return h('div', { class: 'model-with-caption' }, arrayModel(e.a, e.b), caption(`${e.a} rows of ${e.b}`));
      }
      return caption(`${e.a} groups of ${e.b}`);
    case '/':
      if (canDrawGroups(e.a, e.b)) {
        return h(
          'div',
          { class: 'model-with-caption' },
          groupsModel(e.a, e.b),
          caption(`${e.a} shared by ${e.b}: ${e.a / e.b} each`),
        );
      }
      return caption(`${e.a} shared by ${e.b}`);
  }
}

function caption(text: string): HTMLElement {
  return h('div', { class: 'model-caption' }, text);
}

/** Two bars, one above the other: what she made, and what the monster wants. */
export function compareBars(made: number, target: number, madeLabel: string): HTMLElement {
  const max = Math.max(made, target, 1);
  const width = (n: number): number => Math.max(48, Math.round((n / max) * 400));
  return h(
    'div',
    { class: 'compare' },
    h('div', { class: 'compare-row' }, h('span', { class: 'compare-tag' }, 'you made'), h('div', { class: 'bar-part tone-b solo', style: `width:${width(made)}px` }, madeLabel)),
    h('div', { class: 'compare-row' }, h('span', { class: 'compare-tag' }, 'wanted'), h('div', { class: 'bar-part tone-a solo', style: `width:${width(target)}px` }, String(target))),
  );
}

export function exprChip(e: Expr): HTMLElement {
  return h('span', { class: `chip op-${opClass(e)}` }, `${e.a} ${OP_SYMBOL[e.op]} ${e.b}`);
}

function opClass(e: Expr): string {
  return { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div' }[e.op];
}

/** Loose berries in rows of five, for counting. */
export function dotsModel(n: number): HTMLElement {
  return h('div', { class: 'blocks-group ones dots-big' }, times(n, () => berry()));
}

/** A bar cut into equal parts with some shaded: a fraction of one whole. */
export function fractionBar(parts: number, shaded: number): HTMLElement {
  return h(
    'div',
    { class: 'frac-bar' },
    times(parts, (i) => h('i', { class: i < shaded ? 'on' : '' })),
  );
}

/** A fraction written the way school writes it: top number over bottom number. */
export function fracEl(n: number | string, d: number | string, cls = ''): HTMLElement {
  return h('span', { class: `frac ${cls}`, 'aria-label': `${n} over ${d}` }, h('span', { class: 'frac-n' }, String(n)), h('span', { class: 'frac-d' }, String(d)));
}

/** Text with every "3/4" in it drawn as a stacked fraction. */
export function rich(text: string): Child[] {
  const out: Child[] = [];
  const pattern = /(\d+|\?)\/(\d+|\?)/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(fracEl(match[1] as string, match[2] as string));
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export interface BarOptions {
  width?: number;
  height?: number;
  /** Makes the pieces buttons. */
  onTap?: (index: number) => void;
  /** Write 1, 2, 3 on the gold pieces, for counting together. */
  numbers?: boolean;
  /** Counting starts after this many (for a second bar). */
  countFrom?: number;
  /** Pieces to outline as a hint. */
  ghost?: (index: number) => boolean;
}

/** A honey bar cut into equal pieces. Gold pieces are full of honey. */
export function honeyBar(parts: number, filled: number | ((index: number) => boolean), opts: BarOptions = {}): HTMLElement {
  const isOn = typeof filled === 'number' ? (i: number): boolean => i < filled : filled;
  let count = opts.countFrom ?? 0;
  return h(
    'div',
    { class: `hbar ${parts === 1 ? 'uncut' : ''}`, style: `width:${opts.width ?? 480}px;height:${opts.height ?? 84}px` },
    times(parts, (i) => {
      const on = isOn(i);
      if (on) count += 1;
      const cls = `hpiece ${on ? 'on' : ''} ${opts.ghost?.(i) && !on ? 'ghost' : ''}`;
      const label = opts.numbers && on ? String(count) : null;
      const tap = opts.onTap;
      return tap
        ? h('button', { class: cls, type: 'button', 'aria-label': `Piece ${i + 1}`, onclick: () => tap(i) }, label)
        : h('i', { class: cls }, label);
    }),
  );
}

export interface TrayOptions {
  size?: number;
  numbers?: boolean;
}

/**
 * A square tray of honey for "a piece of a piece". `cols` strips with
 * `shaded` of them gold; then cut across into `rows`, and the first `taken`
 * rows of the gold strips are the answer (dark gold).
 */
export function honeyTray(cols: number, shaded: number, rows = 1, taken = 0, opts: TrayOptions = {}): HTMLElement {
  const size = opts.size ?? 280;
  let count = 0;
  return h(
    'div',
    { class: `htray ${cols === 1 && rows === 1 ? 'uncut' : ''}`, style: `width:${size}px;height:${size}px;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)` },
    times(rows * cols, (k) => {
      const r = Math.floor(k / cols);
      const c = k % cols;
      const gold = c < shaded;
      const dark = gold && r < taken;
      if (dark) count += 1;
      return h('i', { class: `hcell ${dark ? 'taken' : gold ? 'on' : ''}` }, opts.numbers && dark ? String(count) : null);
    }),
  );
}
