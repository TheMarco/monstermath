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
 * she can hear each answer before she picks one.
 */

export interface Heard {
  clips: string[];
  /** Where the number is on the screen, for the glow. */
  rect: DOMRect;
  /** The working button the number sits on, if any. */
  button: Element | null;
}

/** How long a press on a button has to last to mean "say it" and not "press it". */
export const HOLD_MS = 600;
/** Typing fields, and the grown-ups page, which has no voice. */
const SKIP = 'input, textarea, .grownups-screen';
const REACH = 3;

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
  return { clips, rect, button: frac.closest('button:not(:disabled)') };
}

/** The number drawn at this point of the screen, if there is one that can be said. */
export function numberAt(target: Element, x: number, y: number): Heard | null {
  if (target.closest(SKIP)) return null;
  const range = document.createRange();
  if (typeof range.getClientRects !== 'function') return null;
  const root = target.closest('button, .frac') ?? target;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const parent = text.parentElement;
    if (!parent || !/\d/.test(text.data) || parent.closest(SKIP)) continue;
    if (typeof parent.checkVisibility === 'function' && !parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const frac = parent.closest('.frac');
    const whole = frac ? fractionAt(frac, x, y) : null;
    if (whole) return whole;
    for (const token of numberTokens(text.data)) {
      if (!token.clips) continue;
      range.setStart(text, token.start);
      range.setEnd(text, token.end);
      if ([...range.getClientRects()].some((r) => within(r, x, y))) {
        return { clips: token.clips, rect: range.getBoundingClientRect(), button: parent.closest('button:not(:disabled)') };
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
