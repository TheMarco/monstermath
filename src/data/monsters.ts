import type { Treat } from '../math/expr';
import type { FracKind } from '../math/fractions';
import type { Delivery } from '../math/regroup';

export type SpeciesId =
  | 'puff' | 'pim' | 'bop'
  | 'dab' | 'moss' | 'glim' | 'fenn'
  | 'nub' | 'plum' | 'dusk' | 'chip'
  | 'bix' | 'tam' | 'zim' | 'lux'
  | 'tup' | 'jam' | 'mint' | 'pom' | 'nox' | 'fizz';
export type Habitat = 'starter' | 'grass' | 'canyon' | 'hollow' | 'egg';

export interface Species {
  id: SpeciesId;
  /** Short and phonetically regular, so the names are readable practice. */
  name: string;
  habitat: Habitat;
  what: string;
  blurb: string;
  /** Grass and starter monsters: the treat (operation) they love. */
  fav: Treat;
  /** Canyon monsters: the kind of berry trip they need. */
  delivery?: Delivery;
  /** Hollow monsters: the kind of fraction work they stand for. */
  frac?: FracKind;
  /** Target numbers, easiest pool first. */
  pools: number[][];
  /** For grown-ups: the skill this monster stands for. */
  skill: string;
}

const STARTER_POOLS = [
  [8, 9, 10, 12],
  [14, 15, 16, 18, 20],
  [24, 25, 30, 36],
  [40, 48, 50, 60],
  [72, 100, 120, 125],
];

export const SPECIES = {
  puff: {
    id: 'puff',
    name: 'Puff',
    habitat: 'starter',
    what: 'storm ram',
    blurb: 'Carries a storm in its fleece. Charges like thunder.',
    fav: 'any',
    pools: STARTER_POOLS,
    skill: 'Making a number in many ways (all operations)',
  },
  pim: {
    id: 'pim',
    name: 'Pim',
    habitat: 'starter',
    what: 'spore hare',
    blurb: 'Grows mushrooms on its back. Fast on its feet.',
    fav: 'any',
    pools: STARTER_POOLS,
    skill: 'Making a number in many ways (all operations)',
  },
  bop: {
    id: 'bop',
    name: 'Bop',
    habitat: 'starter',
    what: 'tide otter',
    blurb: 'Rides its own wave. Never sits still.',
    fav: 'any',
    pools: STARTER_POOLS,
    skill: 'Making a number in many ways (all operations)',
  },
  dab: {
    id: 'dab',
    name: 'Dab',
    habitat: 'grass',
    what: 'lotus duck',
    blurb: 'Wears a lily pad. Loves plus treats.',
    fav: 'add',
    pools: [
      [7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16, 17, 18, 19, 20],
      [23, 25, 28, 32, 36, 40],
      [45, 50, 64, 75],
      [100, 125, 150],
    ],
    skill: 'Splitting a number into two parts (addition)',
  },
  moss: {
    id: 'moss',
    name: 'Moss',
    habitat: 'grass',
    what: 'moss armadillo',
    blurb: 'Carries a garden on its shell. Loves minus treats.',
    fav: 'sub',
    pools: [
      [5, 6, 7, 8, 9, 10],
      [11, 12, 14, 15, 17, 20],
      [21, 25, 28, 30, 35],
      [42, 50, 60, 75],
    ],
    skill: 'Seeing a number as a difference (subtraction)',
  },
  glim: {
    id: 'glim',
    name: 'Glim',
    habitat: 'grass',
    what: 'lantern beetle',
    blurb: 'Lights up the night. Loves times treats.',
    fav: 'mul',
    pools: [
      [6, 8, 10, 12],
      [12, 15, 16, 18, 20],
      [21, 24, 28, 30, 32],
      [36, 40, 42, 45, 48],
      [54, 56, 63, 64, 72, 100, 125],
    ],
    skill: 'Multiplication as equal rows (arrays)',
  },
  fenn: {
    id: 'fenn',
    name: 'Fenn',
    habitat: 'grass',
    what: 'fern fox',
    blurb: 'Has a fern for a tail. Loves sharing treats.',
    fav: 'div',
    pools: [
      [2, 3, 4, 5],
      [5, 6, 7, 8],
      [9, 10, 12],
      [15, 20, 25],
    ],
    skill: 'Division as equal sharing, linked to multiplication',
  },
  nub: {
    id: 'nub',
    name: 'Nub',
    habitat: 'canyon',
    what: 'stone pup',
    blurb: 'Tough as a boulder. Loves a big pile.',
    fav: 'any',
    delivery: 'add',
    pools: [],
    skill: '2-digit addition without regrouping',
  },
  plum: {
    id: 'plum',
    name: 'Plum',
    habitat: 'canyon',
    what: 'orchard bird',
    blurb: 'Quick wings and sharp eyes. Loves a full crate.',
    fav: 'any',
    delivery: 'addR',
    pools: [],
    skill: '2-digit addition with regrouping',
  },
  dusk: {
    id: 'dusk',
    name: 'Dusk',
    habitat: 'canyon',
    what: 'dusk bat',
    blurb: 'Flies at sunset. Always hungry.',
    fav: 'any',
    delivery: 'sub',
    pools: [],
    skill: '2-digit subtraction without regrouping',
  },
  chip: {
    id: 'chip',
    name: 'Chip',
    habitat: 'canyon',
    what: 'crystal chipmunk',
    blurb: 'Has a crystal tail. Loves to open crates.',
    fav: 'any',
    delivery: 'subR',
    pools: [],
    skill: '2-digit subtraction with regrouping',
  },
  bix: {
    id: 'bix',
    name: 'Bix',
    habitat: 'hollow',
    what: 'honeycomb badger',
    blurb: 'Tough as nails, with a sweet tooth. Loves equal pieces.',
    fav: 'any',
    frac: 'name',
    pools: [],
    skill: 'What a fraction is: equal pieces of a whole, top and bottom number',
  },
  tam: {
    id: 'tam',
    name: 'Tam',
    habitat: 'hollow',
    what: 'amber panda',
    blurb: 'Balances on anything. Loves to match honey bars.',
    fav: 'any',
    frac: 'same',
    pools: [],
    skill: 'Comparing fractions and finding equal fractions',
  },
  zim: {
    id: 'zim',
    name: 'Zim',
    habitat: 'hollow',
    what: 'comb lizard',
    blurb: 'Flares its frill and runs. Loves honey every day.',
    fav: 'any',
    frac: 'times',
    pools: [],
    skill: 'A fraction times a whole number',
  },
  lux: {
    id: 'lux',
    name: 'Lux',
    habitat: 'hollow',
    what: 'pollen fawn',
    blurb: 'Flowers bloom where it walks. Loves a piece of a piece.',
    fav: 'any',
    frac: 'tray',
    pools: [],
    skill: 'A fraction times a fraction (a piece of a piece)',
  },
  ...eggSpecies('tup', 'Tup', 'ember cat', 'Ears and a tail of flame. Always ready to pounce.'),
  ...eggSpecies('jam', 'Jam', 'berry bear', 'Strong and sweet. Hides snacks everywhere.'),
  ...eggSpecies('mint', 'Mint', 'leaf dragon', 'Wings like leaves. Afraid of nothing.'),
  ...eggSpecies('pom', 'Pom', 'frost penguin', 'Slides on ice. Loves the cold.'),
  ...eggSpecies('nox', 'Nox', 'star owl', 'Stars on its wings. Sees everything.'),
  ...eggSpecies('fizz', 'Fizz', 'reef axolotl', 'A crown of coral gills. Always grinning.'),
} as Record<SpeciesId, Species>;

/** Egg monsters hatch as a reward. They take any treat, like the starters. */
function eggSpecies(id: SpeciesId, name: string, what: string, blurb: string): Partial<Record<SpeciesId, Species>> {
  return {
    [id]: {
      id,
      name,
      habitat: 'egg',
      what,
      blurb,
      fav: 'any',
      pools: STARTER_POOLS,
      skill: 'Hatched from an egg. Making a number in many ways (all operations)',
    },
  };
}

export const STARTERS: SpeciesId[] = ['puff', 'pim', 'bop'];
export const GRASS_ORDER: SpeciesId[] = ['dab', 'moss', 'glim', 'fenn'];
export const CANYON_ORDER: SpeciesId[] = ['nub', 'plum', 'dusk', 'chip'];
export const HOLLOW_ORDER: SpeciesId[] = ['bix', 'tam', 'zim', 'lux'];
export const EGG_ORDER: SpeciesId[] = ['tup', 'jam', 'mint', 'pom', 'nox', 'fizz'];
export const ALL_SPECIES: SpeciesId[] = [...STARTERS, ...GRASS_ORDER, ...CANYON_ORDER, ...HOLLOW_ORDER, ...EGG_ORDER];

export const TREAT_LABEL: Record<Treat, { symbol: string; text: string; speech: string }> = {
  any: { symbol: '★', text: 'all treats', speech: 'all kinds of treats' },
  add: { symbol: '+', text: 'plus treats', speech: 'plus treats' },
  sub: { symbol: '−', text: 'minus treats', speech: 'minus treats' },
  mul: { symbol: '×', text: 'times treats', speech: 'times treats' },
  div: { symbol: '÷', text: 'sharing treats', speech: 'sharing treats' },
};

export const DELIVERY_LABEL: Record<Delivery, string> = {
  add: 'big piles',
  addR: 'packing crates',
  sub: 'berry snacks',
  subR: 'opening crates',
};

export const FRAC_LABEL: Record<FracKind, string> = {
  name: 'equal pieces',
  same: 'matching bars',
  times: 'honey every day',
  tray: 'a piece of a piece',
};

/** What a monster loves, as a short phrase: "plus treats", "packing crates", "equal pieces". */
export function lovesLabel(id: SpeciesId): string {
  const sp = SPECIES[id];
  if (sp.habitat === 'canyon' && sp.delivery) return DELIVERY_LABEL[sp.delivery];
  if (sp.habitat === 'hollow' && sp.frac) return FRAC_LABEL[sp.frac];
  return TREAT_LABEL[sp.fav].text;
}

/** Hearts needed to finish a round of treats. */
export const METER = 10;
/** Berry trips needed to befriend a canyon monster. */
export const TRIPS_TO_BEFRIEND = 5;
/** Trips in one play round with a canyon friend. */
export const TRIPS_PER_ROUND = 3;
/** Stars needed to grow. At most STARS_PER_DAY a day, so growing takes at least two days. */
export const STARS_TO_GROW = 4;
/** Total stars for the third and final stage. */
export const STARS_TO_EVOLVE = 10;

export type Stage = 1 | 2 | 3;
export const STARS_PER_DAY = 2;

export function art(id: SpeciesId, stage: Stage = 1): string {
  return `${import.meta.env.BASE_URL}art/monsters/${id}${stage === 1 ? '' : `-${stage}`}.png`;
}

export function eggArt(): string {
  return `${import.meta.env.BASE_URL}art/items/egg.png`;
}

export type BgName = 'meadow' | 'canyon' | 'grass' | 'hollow';

export function bg(name: BgName): string {
  return `${import.meta.env.BASE_URL}art/bg/${name}.jpg`;
}

export function decorArt(id: string): string {
  return `${import.meta.env.BASE_URL}art/items/decor-${id}.png`;
}
