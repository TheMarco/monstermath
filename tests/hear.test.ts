// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audioSettings, spokenLog } from '../src/audio';
import { fracEl } from '../src/ui/models';
import { h } from '../src/ui/dom';
import { HOLD_MS, hearNumbers, numberAt } from '../src/ui/hear';
import { recordingScript } from '../src/voice/lines';
import { decimalClips, fractionClips, numberTokens, wholeClips } from '../src/voice/numbers';

const recorded = new Set(recordingScript().map(([key]) => key));
const clipsOf = (text: string): Array<string[] | null> => numberTokens(text).map((t) => t.clips);

describe('saying a number', () => {
  it('uses one clip up to 200 and pieces above', () => {
    expect(wholeClips(0)).toEqual(['n0']);
    expect(wholeClips(200)).toEqual(['n200']);
    expect(wholeClips(347)).toEqual(['n300', 'n47']);
    expect(wholeClips(500)).toEqual(['n500']);
    expect(wholeClips(1000)).toEqual(['n1000']);
    expect(wholeClips(1150)).toEqual(['n1000', 'n150']);
    expect(wholeClips(2301)).toEqual(['n2000', 'n300', 'n1']);
    expect(wholeClips(8100)).toEqual(['n8000', 'n100']);
    expect(wholeClips(10000)).toBeNull();
    expect(wholeClips(2.5)).toBeNull();
  });

  it('reads decimals the way they are written', () => {
    expect(decimalClips('0', '47')).toEqual(['d0_47']);
    expect(decimalClips('0', '3')).toEqual(['d0_3']);
    expect(decimalClips('1', '25')).toEqual(['n1', 'p_25']);
    expect(decimalClips('2', '50')).toEqual(['n2', 'p_50']);
    expect(decimalClips('1', '05')).toEqual(['n1', 'p_05']);
    expect(decimalClips('1', '125')).toBeNull();
  });

  it('reads fractions as one number', () => {
    expect(fractionClips(3, 4)).toEqual(['f_3_4']);
    expect(fractionClips(9, 4)).toEqual(['n9', 'fd_4']);
    expect(fractionClips(4, 4)).toEqual(['n4', 'fd_4']);
    expect(fractionClips(1, 10)).toEqual(['f_1_10']);
    expect(fractionClips(7, 10)).toEqual(['n7', 'fd_10']);
    expect(fractionClips(3, 11)).toBeNull();
  });

  it('finds every number in a line of text', () => {
    expect(clipsOf('23 + 14 = ?')).toEqual([['n23'], ['n14']]);
    expect(clipsOf('0.5 or 0.45')).toEqual([['d0_5'], ['d0_45']]);
    expect(clipsOf('1,250 buns')).toEqual([['n1000', 'n200', 'n50']]);
    expect(clipsOf('1/2 of 12')).toEqual([['f_1_2'], ['n12']]);
    expect(clipsOf('no numbers here')).toEqual([]);
    const [token] = numberTokens('has 47 berries');
    expect('has 47 berries'.slice(token?.start, token?.end)).toBe('47');
  });

  it('has a recording for every piece it can ask for', () => {
    const asked = new Set<string>();
    for (let n = 0; n <= 9999; n++) for (const id of wholeClips(n) ?? []) asked.add(id);
    for (let a = 0; a <= 99; a++) {
      for (const after of [String(a).padStart(2, '0'), ...(a < 10 ? [String(a)] : [])]) {
        for (const whole of ['0', '3']) for (const id of decimalClips(whole, after) ?? []) asked.add(id);
      }
    }
    for (let d = 1; d <= 100; d++) for (let n = 0; n <= 30; n++) for (const id of fractionClips(n, d) ?? []) asked.add(id);
    expect([...asked].filter((id) => !recorded.has(id))).toEqual([]);
  });
});

describe('clicking a number', () => {
  const realRects = Range.prototype.getClientRects;
  const realBox = Range.prototype.getBoundingClientRect;
  let stage: HTMLElement;

  /** jsdom has no layout: every number gets a box 100 wide, placed by where it starts in its text. */
  const box = (range: Range): DOMRect => {
    const left = range.startOffset * 100;
    return { left, right: left + 100, top: 0, bottom: 40, width: 100, height: 40, x: left, y: 0, toJSON: () => ({}) } as DOMRect;
  };
  const press = (el: Element, type: string, x: number): void => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 20, button: 0, detail: 1 }));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    Range.prototype.getClientRects = function (this: Range) {
      return [box(this)] as unknown as DOMRectList;
    };
    Range.prototype.getBoundingClientRect = function (this: Range) {
      return box(this);
    };
    stage = h('div');
    document.body.replaceChildren(stage);
    hearNumbers(stage);
    audioSettings.voice = true;
    spokenLog.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    Range.prototype.getClientRects = realRects;
    Range.prototype.getBoundingClientRect = realBox;
  });

  it('says the number under the pointer, and only that one', () => {
    const sum = h('div', null, '23 + 14');
    stage.appendChild(sum);
    press(sum, 'click', 50);
    expect(spokenLog).toEqual(['n23']);
    press(sum, 'click', 550);
    expect(spokenLog).toEqual(['n23', 'n14']);
    press(sum, 'click', 300);
    expect(spokenLog).toEqual(['n23', 'n14']);
  });

  it('stays silent when the voice is off, and on the grown-ups page', () => {
    const plain = h('div', null, '12');
    const grown = h('div', { class: 'grownups-screen' }, h('span', null, '12'));
    stage.append(plain, grown);
    press(grown.firstElementChild as Element, 'click', 50);
    audioSettings.voice = false;
    press(plain, 'click', 50);
    expect(spokenLog).toEqual([]);
  });

  it('lets a quick click on a button do its job without talking', () => {
    const picked = vi.fn();
    const b = h('button', { type: 'button', onclick: picked }, '47');
    stage.appendChild(b);
    press(b, 'pointerdown', 50);
    vi.advanceTimersByTime(120);
    press(b, 'pointerup', 50);
    press(b, 'click', 50);
    vi.advanceTimersByTime(HOLD_MS);
    expect(picked).toHaveBeenCalledTimes(1);
    expect(spokenLog).toEqual([]);
  });

  it('says the number on a button that is held, and does not press it', () => {
    const picked = vi.fn();
    const b = h('button', { type: 'button', onclick: picked }, '47');
    stage.appendChild(b);
    press(b, 'pointerdown', 50);
    vi.advanceTimersByTime(HOLD_MS + 10);
    press(b, 'pointerup', 50);
    press(b, 'click', 50);
    expect(spokenLog).toEqual(['n47']);
    expect(picked).not.toHaveBeenCalled();
    // The next click is an ordinary one again.
    press(b, 'pointerdown', 50);
    press(b, 'pointerup', 50);
    press(b, 'click', 50);
    expect(picked).toHaveBeenCalledTimes(1);
  });

  it('says a typed number in its box on one click, and still picks the box', () => {
    const picked = vi.fn();
    const b = h('button', { type: 'button', 'data-hear': true, onclick: picked }, '24');
    stage.appendChild(b);
    press(b, 'pointerdown', 50);
    press(b, 'pointerup', 50);
    press(b, 'click', 50);
    expect(spokenLog).toEqual(['n24']);
    expect(picked).toHaveBeenCalledTimes(1);
  });

  it('reads a number written one digit to a box as one number', () => {
    const at = { left: 0, right: 200, top: 0, bottom: 40, width: 200, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    const row = (cls: string, ...cells: string[]): HTMLElement => {
      const el = h('div', { class: cls }, h('span', { class: 'n-sign' }, '+'), cells.map((c) => h('span', null, c)));
      el.getBoundingClientRect = () => at;
      stage.appendChild(el);
      return el;
    };
    expect(numberAt(row('n-row', '', '4', '7').lastElementChild as Element, 150, 20)?.clips).toEqual(['n47']);
    expect(numberAt(row('e-digits u-dec', '0', '.', '4', '7').lastElementChild as Element, 150, 20)?.clips).toEqual(['d0_47']);
    // Half written, or the small regrouping marks: each digit on its own.
    expect(numberAt(row('n-row', '1', '', '7'), 50, 20)?.clips).toEqual(['n1']);
    expect(numberAt(row('e-digits', '?', '7').lastElementChild as Element, 50, 20)?.clips).toEqual(['n7']);
    expect(numberAt(row('n-row n-marks', '1', '3'), 50, 20)?.clips).toEqual(['n1']);
  });

  it('reads a stacked fraction whole', () => {
    const frac = fracEl(3, 4);
    frac.getBoundingClientRect = () => ({ left: 0, right: 60, top: 0, bottom: 80, width: 60, height: 80, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    stage.appendChild(frac);
    expect(numberAt(frac.querySelector('.frac-d') as Element, 30, 60)?.clips).toEqual(['f_3_4']);
    // A fraction she is still building has no name yet: its one number is said alone.
    const half = fracEl(3, '?');
    stage.appendChild(half);
    expect(numberAt(half.querySelector('.frac-n') as Element, 50, 20)?.clips).toEqual(['n3']);
  });
});
