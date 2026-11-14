import { sfx } from '../audio';
import { icon } from './common';
import { h } from './dom';

/** On-screen digits 1-9, 0 and erase. Big targets for a trackpad. */
export function keypad(onDigit: (d: string) => void, onErase: () => void): HTMLElement {
  const key = (label: string, fn: () => void, cls = ''): HTMLElement =>
    h(
      'button',
      {
        class: `key ${cls}`,
        type: 'button',
        onclick: () => {
          sfx('tap');
          fn();
        },
      },
      label === 'erase' ? icon('erase') : label,
    );
  return h(
    'div',
    { class: 'keypad' },
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => key(d, () => onDigit(d))),
    key('erase', onErase, 'key-erase'),
  );
}

/** Add a typed digit to a short number string, without leading zeros. */
export function pushDigit(current: string, digit: string, maxLen = 3): string {
  if (current === '0') return digit;
  if (current.length >= maxLen) return current;
  return current + digit;
}
