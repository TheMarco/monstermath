import { skillLevel } from '../report';
import type { Save } from '../state';
import type { SpeciesId } from '../data/monsters';
import { h, times } from './dom';

/** Medals for how far a friend's own skill has climbed: one per level reached. */
export function levelRow(save: Save, id: SpeciesId): HTMLElement | null {
  const level = skillLevel(save, id);
  if (!level) return null;
  return h(
    'p',
    { class: 'skill-level', 'aria-label': `Level ${level.have} of ${level.of}` },
    times(level.of, (i) => h('i', { class: i < level.have ? 'medal on' : 'medal' })),
    h('span', null, `Level ${level.have}`),
  );
}
