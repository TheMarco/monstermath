import { sfx } from '../audio';
import { art, eggArt, type SpeciesId, type Stage } from '../data/monsters';
import { h, times } from './dom';

/**
 * Evolution and hatching, drawn by the game itself from the still pictures.
 * Charge up, turn to a white silhouette, burst, reveal the new form.
 */
export type Fx = { kind: 'evolve'; from: Stage } | { kind: 'hatch' };

/** How long the sequence runs before the new monster takes over. */
export const FX_MS = 3000;

const SPARKS = 18;

export function playFx(id: SpeciesId, toStage: Stage, fx: Fx, size: number, onDone: () => void): HTMLElement {
  const hatch = fx.kind === 'hatch';
  const before = h('img', {
    class: `fx-before ${hatch ? 'fx-egg' : ''}`,
    src: hatch ? eggArt() : art(id, fx.from),
    alt: '',
    draggable: 'false',
  });
  const after = h('img', { class: 'fx-after', src: art(id, toStage), alt: '', draggable: 'false' });
  const cracks = hatch ? h('div', { class: 'fx-cracks' }) : null;
  if (cracks) {
    cracks.innerHTML =
      '<svg viewBox="0 0 100 100" width="100%" height="100%"><polyline points="30,46 38,40 44,49 52,39 60,48 68,41 74,47" /><polyline points="52,39 49,28 55,20" /><polyline points="44,49 41,60 47,68" /></svg>';
  }

  const box = h(
    'div',
    { class: `fx fx-${fx.kind}`, style: `width:${size}px;height:${size}px` },
    h('div', { class: 'fx-rays' }),
    h('div', { class: 'fx-ring' }),
    before,
    cracks,
    after,
    h('div', { class: 'fx-flash' }),
    times(SPARKS, (i) =>
      h('i', {
        class: `fx-spark ${i % 3 === 0 ? 'big' : ''} ${hatch && i % 2 === 0 ? 'shell' : ''}`,
        style: `--a:${Math.round((360 / SPARKS) * i + (i % 2) * 9)}deg;--d:${Math.round(size * (0.55 + ((i * 37) % 30) / 100))}px;animation-delay:${(i % 4) * 0.04}s`,
      }),
    ),
  );

  const at = (ms: number, fn: () => void): void => {
    window.setTimeout(fn, ms);
  };
  sfx(hatch ? 'hatch' : 'charge');
  at(1000, () => box.classList.add('phase-white'));
  at(1700, () => {
    box.classList.add('phase-burst');
    sfx('win');
  });
  at(2050, () => box.classList.add('phase-reveal'));
  at(FX_MS, onDone);
  return box;
}
