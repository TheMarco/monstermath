import { SPECIES, type SpeciesId } from './data/monsters';
import { fastTrack, startSteps, stillToAsk, type StrandId } from './intake';
import type { Save } from './state';

/**
 * The first sitting asks only about numbers and adding. Every other topic is
 * asked the first time she goes to a game that builds on it: taking away
 * before the first take-away monster, fractions before Honey Hollow. So no
 * game starts at the wrong size, and nothing is asked weeks before it is used.
 */

/** The topic a monster's game starts from. */
function topicsOf(id: SpeciesId): StrandId[] {
  const sp = SPECIES[id];
  if (sp.habitat === 'canyon') return sp.delivery === 'sub' || sp.delivery === 'subR' ? ['sub'] : ['add'];
  if (sp.habitat === 'hollow') return ['frac'];
  if (sp.habitat === 'upper') return sp.upper === 'mult' ? ['mul'] : sp.upper === 'div' ? ['div'] : sp.upper === 'fadd' ? ['frac'] : [];
  if (sp.habitat === 'early') return [];
  return sp.fav === 'sub' ? ['sub'] : sp.fav === 'mul' ? ['mul'] : sp.fav === 'div' ? ['div'] : [];
}

/** What to ask before she plays with this monster. Empty once it has been asked, or when a grown-up chose the start. */
export function checkBefore(save: Save, id: SpeciesId): StrandId[] {
  if (!save.introDone || !(id in SPECIES)) return [];
  // A save from before the check existed has no answers at all: it is left as it is.
  if (save.intakeLevels?.place === undefined || save.intakeLevels.add === undefined) return [];
  return stillToAsk(save.startAt, save.intakeLevels, topicsOf(id));
}

/** Works the answers of a check into where the games start. A game she has already played keeps its own level. */
export function applyCheck(save: Save): void {
  const levels = save.intakeLevels ?? {};
  save.startStep = startSteps(levels);
  save.fast = fastTrack(levels);
}
