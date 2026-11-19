import { audioSettings, sayNumber } from '../audio';
import { fractionClips, numberTokens } from '../voice/numbers';
import { h } from './dom';

/**
 * Click a number, hear it. Reading "47" and "74" apart is hard work with
 * dyslexia, so every number on the screen can be asked for out loud. Nothing
 * is marked up by hand: the number under the pointer is found in the text
 * itself, which also covers numbers added to the game later.
 *
 * A number on a button would press the button, so there it is press and hold:
 * she can hear each answer before she picks one. The boxes that hold a number
 * she typed are the exception: one click says it.
 */

export interface Heard {
  clips: string[];
  /** Where the number is on the screen, for the glow. */
  rect: DOMRect;
  /** The working button the number sits on, if a click there does more than choose where to type. */
  button: Element | null;
}

/** How long a press on a button has to last to mean "say it" and not "press it". */
export const HOLD_MS = 600;
/** Typing fields, and the grown-ups page, which has no voice. */
const SKIP = 'input, textarea, .grownups-screen';
const REACH = 3;
/**
 * A box that shows the number she typed is a button only so she can pick which
 * box to type in. Marked `data-hear`, a click there also says the number.
 */
const pressed = (el: Element): Element | null => el.closest('button:not(:disabled):not([data-hear])');

const within = (r: DOMRect, x: number, y: number): boolean =>
  r.width > 0 && r.height > 0 && x >= r.left - REACH && x <= r.right + REACH && y >= r.top - REACH && y <= r.bottom + REACH;

/** A stacked fraction is one number: "three fourths", not "three" and "four". */
function fractionAt(frac: Element, x: number, y: number): Heard | null {
  const top = frac.querySelector('.frac-n')?.textContent ?? '';
  const bottom = frac.querySelector('.frac-d')?.textContent ?? '';
  if (!/^\d+$/.test(top) || !/^\d+$/.test(bottom)) return null;
  const clips = fractionClips(Number(top), Number(bottom));
  const rect = frac.getBoundingClientRect();
  if (!clips || !within(rect, x, y)) return null;
  return { clips, rect, button: pressed(frac) };
}

/** Numbers drawn one digit to a box: an answer in place colours, a line of a written sum. */
const DIGIT_GROUP = '.e-digits, .n-row:not(.n-marks)';

/** Such a number is said whole, "forty-seven", once every digit is there. */
function digitsAt(group: Element, x: number, y: number): Heard | null {
  const parts = [...group.children].filter((el) => !el.classList.contains('n-sign')).map((el) => (el.textContent ?? '').trim());
  while (parts.length && parts[0] === '') parts.shift();
  // A gap in the middle means she is still writing it: each digit then speaks for itself.
  if (parts.length < 2 || parts.includes('')) return null;
  const text = parts.join('');
  const [token] = numberTokens(text);
  const rect = group.getBoundingClientRect();
  if (!token?.clips || token.start !== 0 || token.end !== text.length || !within(rect, x, y)) return null;
  return { clips: token.clips, rect, button: pressed(group) };
}

const SIGNS: Record<string, string> = { '+': 'op_plus', '−': 'op_minus', '-': 'op_minus' };

/**
 * A written sum is read as a sum: "seventy, minus, forty-seven". Heard one
 * number at a time, she would have to put the sum together herself. The box
 * for her answer is not part of it.
 */
function sumAt(sum: Element, x: number, y: number): Heard | null {
  const said = [...sum.children].filter((el) => !el.matches('button') && (el.textContent ?? '').trim() !== '=');
  const first = said[0]?.getBoundingClientRect();
  const last = said[said.length - 1]?.getBoundingClientRect();
  if (!first || !last) return null;
  const rect = new DOMRect(first.left, first.top, last.right - first.left, Math.max(first.height, last.height));
  if (!within(rect, x, y)) return null;
  const clips: string[] = [];
  for (const el of said) {
    const text = (el.textContent ?? '').trim();
    const [token] = numberTokens(text);
    const piece = SIGNS[text] ? [SIGNS[text] as string] : token && token.start === 0 && token.end === text.length ? token.clips : null;
    if (!piece) return null;
    clips.push(...piece);
  }
  return clips.length > 1 ? { clips, rect, button: null } : null;
}

/** The number drawn at this point of the screen, if there is one that can be said. */
export function numberAt(target: Element, x: number, y: number): Heard | null {
  if (target.closest(SKIP)) return null;
  const sum = target.closest('button') ? null : target.closest('[data-sum]');
  const whole = sum ? sumAt(sum, x, y) : null;
  if (whole) return whole;
  const range = document.createRange();
  if (typeof range.getClientRects !== 'function') return null;
  const root = target.closest(`button, .frac, ${DIGIT_GROUP}`) ?? target;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const parent = text.parentElement;
    if (!parent || !/\d/.test(text.data) || parent.closest(SKIP)) continue;
    if (typeof parent.checkVisibility === 'function' && !parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const frac = parent.closest('.frac');
    const group = parent.closest(DIGIT_GROUP);
    const whole = frac ? fractionAt(frac, x, y) : group ? digitsAt(group, x, y) : null;
    if (whole) return whole;
    for (const token of numberTokens(text.data)) {
      if (!token.clips) continue;
      range.setStart(text, token.start);
      range.setEnd(text, token.end);
      if ([...range.getClientRects()].some((r) => within(r, x, y))) {
        return { clips: token.clips, rect: range.getBoundingClientRect(), button: pressed(parent) };
      }
    }
  }
  return null;
}

/** A short glow on the number that is being said. */
function glow(rect: DOMRect): void {
  const el = h('div', {
    class: 'hear-glow',
    style: `left:${rect.left - 8}px;top:${rect.top - 4}px;width:${rect.width + 16}px;height:${rect.height + 8}px`,
  });
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 700);
}

/** Wires the whole stage once. Does nothing while the voice is switched off. */
export function hearNumbers(stage: HTMLElement): void {
  let timer: number | undefined;
  let swallow = false;
  let frame = 0;
  let downX = 0;
  let downY = 0;

  const speak = (hit: Heard): void => {
    sayNumber(hit.clips);
    glow(hit.rect);
  };
  const find = (e: MouseEvent): Heard | null =>
    audioSettings.voice && e.target instanceof Element ? numberAt(e.target, e.clientX, e.clientY) : null;
  const cancel = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };

  stage.addEventListener(
    'pointerdown',
    (e) => {
      cancel();
      swallow = false;
      if (e.button !== 0) return;
      const hit = find(e);
      if (!hit?.button) return;
      downX = e.clientX;
      downY = e.clientY;
      timer = window.setTimeout(() => {
        timer = undefined;
        // The click that ends this press belongs to the number, not the button.
        swallow = true;
        speak(hit);
      }, HOLD_MS);
    },
    true,
  );
  stage.addEventListener('pointerup', cancel, true);
  stage.addEventListener('pointercancel', cancel, true);

  stage.addEventListener(
    'click',
    (e) => {
      if (swallow) {
        swallow = false;
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      // A click made by the keyboard has no place on the screen.
      if (e.detail === 0) return;
      const hit = find(e);
      if (hit && !hit.button) speak(hit);
    },
    true,
  );

  stage.addEventListener('pointermove', (e) => {
    if (timer !== undefined && Math.hypot(e.clientX - downX, e.clientY - downY) > 12) cancel();
    if (frame || e.pointerType !== 'mouse') return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const hit = find(e);
      stage.classList.toggle('hear-hover', !!hit && !hit.button);
    });
  });
}
