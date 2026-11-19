import { cry, music, say, sfx } from '../audio';
import { ALL_SPECIES, lovesLabel, SPECIES, type Habitat, type SpeciesId, type Stage } from '../data/monsters';
import {
  bondLevel,
  claimStickers,
  EGG_WARMTH,
  eggReady,
  ensureWishes,
  fedToday,
  feed,
  FEEDS_PER_DAY,
  hatch,
  levelProgress,
  pet,
  playBall,
  STICKERS,
  wishing,
} from '../rewards';
import {
  buddyOf,
  callOut,
  canRest,
  sendRest,
  canyonQueue,
  DAILY_GOAL,
  dailyDone,
  displayName,
  friends,
  giveStar,
  grassQueue,
  hollowQueue,
  earlyQueue,
  upperQueue,
  MEADOW_MAX,
  meadowFriends,
  starsLeftToday,
  today,
  type MonsterState,
  type Save,
} from '../state';
import {
  backdrop,
  button,
  celebrate,
  eggImg,
  floatUp,
  holdButton,
  icon,
  growthRow,
  monsterImg,
  toasts,
  type App,
  type Screen,
} from '../ui/common';
import { playAnim } from '../ui/anim';
import { charmIcon, dress } from '../ui/charms';
import { dayGift, DECOR, decorOut, moveDecor } from '../shop';
import { levelRow } from '../ui/level';
import { themeArt } from '../data/monsters';
import { canMatch } from '../match';
import { easeAfterBreak, nextWild, SECURE_DAYS, type NextWild } from '../skill';
import { decorImg } from './shop';
import { h, pick, replace, times } from '../ui/dom';
import { berry } from '../ui/models';
import { goWithLesson } from '../tutor';
import { aboutClip, nameClip } from '../voice/lines';

/** Where friends stand on the meadow: [x, y, size]. The first slot is the buddy's. */
const SLOTS: Array<[number, number, number]> = [
  [640, 580, 140],
  [380, 520, 116],
  [900, 520, 116],
  [510, 380, 98],
  [770, 380, 98],
  [1080, 410, 100],
];

/** Decorations stand in the meadow smaller than their shop size, so they do not crowd the friends. */
const DECOR_SCALE = 0.72;

function sized(el: HTMLElement, size: number): HTMLElement {
  el.dataset.size = String(size);
  return el;
}

function pips(done: number, goal: number): HTMLElement {
  return h(
    'span',
    { class: 'pips' },
    times(goal, (i) => h('i', { class: i < done ? 'pip on' : 'pip' })),
  );
}

/** The place a monster plays in: starters and egg monsters eat treats in the grass. */
type Place = 'grass' | 'canyon' | 'hollow' | 'early' | 'upper';

function placeOf(habitat: Habitat): Place {
  return habitat === 'canyon' || habitat === 'hollow' || habitat === 'early' || habitat === 'upper' ? habitat : 'grass';
}

const SCREEN_OF = { grass: 'befriend', canyon: 'canyon', hollow: 'hollow', early: 'early', upper: 'upper' } as const;

/** Which friend to play with when every monster of a place is already a friend. */
function friendToPlay(save: Save, habitat: Place): SpeciesId | null {
  const pool = friends(save).filter((m) => placeOf(SPECIES[m.id].habitat) === habitat);
  if (pool.length === 0) return null;
  const wishers = pool.filter((m) => wishing(save, m.id));
  if (wishers.length > 0) return pick(wishers).id;
  const hungry = pool.filter((m) => starsLeftToday(save, m.id) > 0);
  return pick(hungry.length > 0 ? hungry : pool).id;
}

/**
 * Go to a place: meet the next monster when she is ready for it; otherwise
 * practise with the friend whose skill comes first, or any friend there.
 */
function goPlace(app: App, place: Place, order: SpeciesId[]): void {
  const next = nextWild(app.save, order);
  if (next?.ready) goWithLesson(app, SCREEN_OF[place], next.id);
  else {
    // The friend to practise with can live in another place: the Bakery waits for skills from the grass and the canyon.
    const id = next?.needs && app.save.monsters[next.needs]?.friend ? next.needs : friendToPlay(app.save, place);
    if (id) playWith(app, id);
    else say('gate_tip');
  }
}

export function goGrass(app: App): void {
  goPlace(app, 'grass', grassQueue(app.save));
}

export function goCanyon(app: App): void {
  goPlace(app, 'canyon', canyonQueue(app.save));
}

export function goHollow(app: App): void {
  goPlace(app, 'hollow', hollowQueue(app.save));
}

export function goEarly(app: App): void {
  goPlace(app, 'early', earlyQueue(app.save));
}

export function goUpper(app: App): void {
  goPlace(app, 'upper', upperQueue(app.save));
}

export function playWith(app: App, id: SpeciesId): void {
  app.go(SCREEN_OF[placeOf(SPECIES[id].habitat)], { id });
}

export const homeScreen: Screen = (app, params) => {
  const { save } = app;
  // Back after a long break: start a size easier, before today counts as played.
  if (easeAfterBreak(save)) app.commit();
  const day = today(save);
  ensureWishes(save);
  const all = friends(save).sort((x, y) => (x.friendOn ?? '').localeCompare(y.friendOn ?? ''));
  // Only a few friends are out at once; the rest are resting and can be called out.
  const ordered = meadowFriends(save)
    .map((id) => save.monsters[id])
    .filter((m): m is MonsterState => !!m);

  const cardHost = h('div', { class: 'friend-card-host' });
  /** Closes the open card with a short fade, so it does not just vanish. */
  const closeCard = (): void => {
    const card = cardHost.firstElementChild;
    if (!card || card.classList.contains('closing')) return;
    card.classList.add('closing');
    window.setTimeout(() => {
      if (card.parentNode === cardHost) card.remove();
    }, 170);
  };

  function bondRow(m: MonsterState): HTMLElement {
    const bond = bondLevel(m.bond ?? 0);
    return h(
      'p',
      { class: 'bond-row' },
      times(5, (i) => icon('heart', i < bond.level ? 'on' : 'off')),
      h('span', null, bond.title),
    );
  }

  function openCard(m: MonsterState): void {
    const sp = SPECIES[m.id];
    const name = displayName(save, m.id);
    const loves = `Loves ${lovesLabel(m.id)}`;
    const wants = wishing(save, m.id);
    const portrait = monsterImg(m.id, m.stage, 170, 'bob');
    const bondHost = h('div', null, bondRow(m));

    const doPet = (): void => {
      const result = pet(save, m.id);
      sfx('heart');
      cry(ALL_SPECIES.indexOf(m.id));
      portrait.classList.remove('jump', 'spin');
      void portrait.offsetWidth;
      // Closer friends show off with a spin.
      // An animated monster plays its own happy clip; a still one jumps or spins.
      if (!playAnim(portrait, 'happy')) portrait.classList.add(bondLevel(m.bond ?? 0).level >= 2 ? 'spin' : 'jump');
      floatUp(portrait, 'heart', result.counted ? 3 : 1);
      crowd(m.id, 'heart');
      if (result.counted) {
        bondHost.replaceChildren(bondRow(m));
        app.commit();
      }
      if (result.bondUp) {
        const title = bondLevel(m.bond ?? 0).title;
        toasts(el, [{ text: `${name}: ${title}!`, kind: 'bond', clip: 't_bond' }]);
      }
    };

    const bondToast = (level: number | null): void => {
      if (!level) return;
      bondHost.replaceChildren(bondRow(m));
      toasts(el, [{ text: `${name}: ${bondLevel(m.bond ?? 0).title}!`, kind: 'bond', clip: 't_bond' }]);
    };
    const react = (cls: string): void => {
      portrait.classList.remove('jump', 'spin', 'munch');
      void portrait.offsetWidth;
      portrait.classList.add(cls);
    };
    const tummy = h('span', { class: 'tummy' });
    const drawTummy = (): void => replace(tummy, times(FEEDS_PER_DAY, (k) => berry(k < fedToday(save, m.id) ? 'tiny' : 'tiny empty')));

    const doFeed = (): void => {
      const before = fedToday(save, m.id);
      const result = feed(save, m.id);
      if (!result.ok) {
        sfx('soft');
        say('no_berries');
        return;
      }
      sfx('munch');
      react('munch');
      crowd(m.id, 'berry');
      floatUp(portrait, 'heart', before >= FEEDS_PER_DAY ? 1 : 2);
      if (before >= FEEDS_PER_DAY) say('all_full');
      drawTummy();
      drawBerries();
      bondHost.replaceChildren(bondRow(m));
      bondToast(result.bondUp);
      app.commit();
    };

    const doBall = (): void => {
      const ball = h('i', { class: 'ball' });
      portrait.appendChild(ball);
      window.setTimeout(() => ball.remove(), 1000);
      sfx('pop');
      window.setTimeout(() => {
        cry(ALL_SPECIES.indexOf(m.id));
        react('jump');
        floatUp(portrait, 'star', 2);
        crowd(m.id, 'star');
      }, 450);
      const result = playBall(save, m.id);
      bondHost.replaceChildren(bondRow(m));
      bondToast(result.bondUp);
      app.commit();
    };

    const isBuddy = buddyOf(save) === m.id;
    const makeBuddy = (): void => {
      save.buddy = m.id;
      app.commit();
      sfx('star');
      say(nameClip(m.id), 'new_buddy');
      app.go('home');
    };

    // With more friends than places, she chooses who is out: this one can go and rest.
    const goRest = (): void => {
      sendRest(save, m.id);
      app.commit();
      sfx('soft');
      app.go('home');
    };
    const mayRest = all.length > MEADOW_MAX && canRest(save, m.id);

    const charmRow = h('div', { class: 'charm-row' });
    const drawCharms = (): void => {
      const owned = save.charms ?? [];
      if (owned.length === 0) {
        replace(charmRow);
        return;
      }
      const choose = (charmId: string | undefined): void => {
        m.charm = charmId;
        app.commit();
        dress(portrait, m.id, 170);
        const inMeadow = meadow.querySelector<HTMLElement>(`.friend[data-id="${m.id}"] .monster`);
        if (inMeadow) dress(inMeadow, m.id, Number(inMeadow.dataset.size ?? 120));
        if (charmId) {
          sfx('star');
          say('charm_on');
          react('jump');
        }
        drawCharms();
      };
      replace(
        charmRow,
        h('span', { class: 'charm-label' }, 'Charm'),
        owned.map((c) =>
          h('button', { class: `charm-pick ${m.charm === c ? 'on' : ''}`, type: 'button', 'aria-label': `Charm ${c}`, onclick: () => choose(c) }, charmIcon(c, 34)),
        ),
        m.charm ? h('button', { class: 'charm-pick none', type: 'button', 'aria-label': 'No charm', onclick: () => choose(undefined) }, '×') : null,
      );
    };
    drawCharms();

    sfx('pop');
    cry(ALL_SPECIES.indexOf(m.id));
    if (wants) say(nameClip(m.id), 'wants_play');
    else say(aboutClip(m.id));
    drawTummy();
    cardHost.replaceChildren(
      h(
        'div',
        { class: 'card friend-card' },
        h('button', { class: 'card-close', type: 'button', 'aria-label': 'Close', onclick: closeCard }, '×'),
        h('button', { class: 'pet-target', type: 'button', 'aria-label': `Pet ${name}`, onclick: doPet }, portrait),
        h('h3', null, name),
        h('p', { class: 'friend-what' }, wants ? `${name} wants to play today!` : `${sp.what}. ${loves}.`),
        bondHost,
        growthRow(m),
        levelRow(save, m.id),
        h(
          'div',
          { class: 'friend-buttons' },
          button([icon('heart'), 'Pet'], doPet),
          button([berry('tiny'), 'Feed'], doFeed, 'feed-btn'),
          button('Ball', doBall, 'ball-btn'),
        ),
        h('p', { class: 'friend-stars' }, h('span', null, 'Fed today'), tummy),
        charmRow,
        h(
          'div',
          { class: 'friend-buttons' },
          button('Play', () => playWith(app, m.id), wants ? 'btn-primary pulse' : 'btn-primary'),
          canMatch(save) ? button('Match', () => app.go('match', { id: m.id }), 'match-btn') : null,
          button('Page', () => app.go('journal', { id: m.id })),
          isBuddy ? h('span', { class: 'buddy-tag' }, 'Your buddy') : button('Make buddy', makeBuddy, 'buddy-btn'),
          mayRest ? button('Rest', goRest, 'rest-btn') : null,
        ),
      ),
    );
  }

  const asleep = day.asleep === true;

  /** Every friend, in the meadow or resting. Tapping a resting one brings it out. */
  function openFriends(): void {
    sfx('pop');
    const out = new Set(ordered.map((m) => m.id));
    cardHost.replaceChildren(
      h(
        'div',
        { class: 'card friends-card' },
        h('button', { class: 'card-close', type: 'button', 'aria-label': 'Close', onclick: closeCard }, '×'),
        h('h3', null, 'All friends'),
        h(
          'div',
          { class: 'friends-grid' },
          all.map((m) =>
            h(
              'button',
              {
                class: `friends-tile ${out.has(m.id) ? 'out' : 'resting'}`,
                type: 'button',
                'data-id': m.id,
                onclick: () => {
                  if (out.has(m.id)) {
                    openCard(m);
                    return;
                  }
                  callOut(save, m.id);
                  app.commit();
                  app.go('home', { open: m.id });
                },
              },
              monsterImg(m.id, m.stage, 76),
              h('span', { class: 'friends-name' }, displayName(save, m.id)),
              out.has(m.id) ? null : h('span', { class: 'friends-zzz' }, 'z z'),
            ),
          ),
        ),
      ),
    );
  }

  /** Decorations she bought. Dragging one moves it; where it is dropped is saved. */
  function decorEl(item: { id: string; x: number; y: number }): HTMLElement {
    const size = Math.round((DECOR.find((d) => d.id === item.id)?.size ?? 120) * DECOR_SCALE);
    const node = h('div', { class: 'decor', 'data-decor': item.id, title: 'Drag to move' }, decorImg(item.id, size));
    const put = (): void => {
      node.style.left = `${item.x - size / 2}px`;
      node.style.top = `${item.y - size}px`;
      node.style.zIndex = String(Math.round(item.y));
    };
    put();
    let grab: { dx: number; dy: number } | null = null;
    const toStage = (e: PointerEvent): [number, number] => {
      const box = el.getBoundingClientRect();
      const k = box.width > 0 ? 1280 / box.width : 1;
      return [(e.clientX - box.left) * k, (e.clientY - box.top) * k];
    };
    node.addEventListener('pointerdown', (e) => {
      const [x, y] = toStage(e);
      grab = { dx: item.x - x, dy: item.y - y };
      node.classList.add('dragging');
      node.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    node.addEventListener('pointermove', (e) => {
      if (!grab) return;
      const [x, y] = toStage(e);
      moveDecor(save, item.id, x + grab.dx, y + grab.dy);
      put();
    });
    const drop = (): void => {
      if (!grab) return;
      grab = null;
      node.classList.remove('dragging');
      sfx('pop');
      app.commit();
    };
    node.addEventListener('pointerup', drop);
    node.addEventListener('pointercancel', drop);
    return node;
  }

  const meadow = h(
    'div',
    { class: 'meadow' },
    decorOut(save).map(decorEl),
    ordered.map((m, i) => {
      const slot = SLOTS[i] as [number, number, number];
      const [x, y, size] = slot;
      const close = bondLevel(m.bond ?? 0).level >= 4;
      return h(
        'button',
        {
          class: `friend ${close ? 'aura' : ''} ${buddyOf(save) === m.id ? 'is-buddy' : ''} ${asleep || starsLeftToday(save, m.id) === 0 ? 'sleepy' : ''}`,
          'data-x': String(x - size / 2),
          'data-id': m.id,
          type: 'button',
          style: `left:${x - size / 2}px;top:${y - size}px;z-index:${Math.round(y)}`,
          onclick: () => openCard(m),
        },
        wishing(save, m.id) ? h('span', { class: 'wish-bubble' }, icon('heart', 'on'), 'Play?') : null,
        sized(monsterImg(m.id, m.stage, size, `bob bob-${i % 3}`), size),
        h('span', { class: 'friend-name' }, displayName(save, m.id)),
      );
    }),
  );

  const grassNext = nextWild(save, grassQueue(save));
  const canyonNext = nextWild(save, canyonQueue(save));
  const hollowNext = nextWild(save, hollowQueue(save));
  const earlyNext = nextWild(save, earlyQueue(save));
  const upperNext = nextWild(save, upperQueue(save));
  /** A monster that is waiting for her to practise a little more first. */
  const gated = [earlyNext, grassNext, canyonNext, hollowNext, upperNext].find((n) => n && !n.ready && n.needs && save.monsters[n.needs]?.friend);

  const place = (cls: string, label: string, iconName: string, next: NextWild | null, go: () => void): HTMLElement =>
    h(
      'div',
      { class: `place ${cls}` },
      next
        ? h(
            'div',
            { class: `peek ${next.ready ? '' : 'peek-soon'}` },
            monsterImg(next.id, 1, next.ready ? 62 : 54, 'silhouette'),
            h('span', { class: 'peek-mark' }, next.ready ? '?' : 'soon'),
            // How close it is: one paw print for each good day with the friend to practise with.
            !next.ready && next.needs ? h('span', { class: 'peek-steps' }, times(SECURE_DAYS, (i) => h('i', { class: i < (next.progress ?? 0) ? 'on' : '' }))) : null,
          )
        : null,
      button([icon(iconName), label], go, 'btn-place'),
    );

  const toggleSound = (): void => {
    const on = !(save.settings.voice && save.settings.sound);
    save.settings.voice = on;
    save.settings.sound = on;
    app.commit();
    app.go('home');
  };

  const toggleMusic = (): void => {
    save.settings.music = save.settings.music === false;
    app.commit();
    app.go('home');
  };

  const berryCount = h('span', { class: 'berry-count' });
  function drawBerries(): void {
    replace(berryCount, berry('tiny'), String(save.berries ?? 0));
  }
  drawBerries();

  const rank = levelProgress(save.xp);
  const wishes = day.wishes ?? [];

  function doHatch(): void {
    const born = hatch(save);
    if (!born) return;
    app.commit();
    const sp = SPECIES[born];
    cry(ALL_SPECIES.indexOf(born));
    celebrate(el, {
      id: born,
      title: `It is ${sp.name}!`,
      fx: { kind: 'hatch' },
      voice: ['egg_hatched', aboutClip(born)],
      lines: [`A ${sp.what} hatched from your egg.`, sp.blurb],
      buttons: [{ label: 'Hello!', onClick: () => app.go('home'), primary: true }],
      big: true,
    });
  }

  function wakeUp(): void {
    day.asleep = false;
    app.commit();
    sfx('win');
    app.go('home');
    say('wake_up');
  }

  /** The bedtime ritual: a clear, gentle end to the day's play. */
  function goodNight(): void {
    day.asleep = true;
    app.commit();
    cardHost.replaceChildren();
    el.querySelector('.night-sky')?.classList.add('on');
    sfx('night');
    music('night');
    say('good_night');
    el.querySelectorAll<HTMLElement>('.friend').forEach((friend, k) => {
      window.setTimeout(() => {
        friend.classList.add('sleepy');
        emote(friend, 'zzz');
      }, 500 + k * 350);
    });
    window.setTimeout(() => {
      if (!el.isConnected) return;
      el.appendChild(
        h(
          'div',
          { class: 'night-card card' },
          h('h3', null, 'Good night!'),
          h('p', null, 'Everyone is asleep. See you tomorrow.'),
          h('div', { class: 'friend-buttons' }, button('Bye for now', () => app.go('title'), 'btn-primary'), button('Wake up!', wakeUp)),
        ),
      );
    }, 3600);
  }

  const nest = save.egg
    ? h(
        'button',
        {
          class: `egg-nest ${eggReady(save) ? 'ready' : ''}`,
          type: 'button',
          'aria-label': 'Egg',
          onclick: () => {
            if (eggReady(save)) {
              doHatch();
            } else {
              sfx('pop');
              say('egg_cold');
            }
          },
        },
        eggImg(92, eggReady(save) ? 'wiggle' : ''),
        eggReady(save)
          ? h('span', { class: 'egg-tap' }, 'Tap!')
          : h('span', { class: 'warm-bar' }, h('i', { style: `width:${Math.round(((save.egg.warmth ?? 0) / EGG_WARMTH) * 100)}%` })),
      )
    : null;

  /** The meadow look she chose lies over the plain meadow, which shows if its picture is missing. */
  function themed(back: HTMLElement): HTMLElement {
    if (save.theme) back.style.backgroundImage = `url("${themeArt(save.theme)}"), ${back.style.backgroundImage}`;
    return back;
  }

  const el: HTMLElement = h(
    'div',
    { class: 'screen home-screen' },
    themed(backdrop('meadow')),
    meadow,
    nest,
    h(
      'div',
      { class: 'card today' },
      h('h3', null, 'Today'),
      h('div', { class: 'today-row' }, icon('heart'), h('span', null, 'Treats'), pips(day.treats, DAILY_GOAL.treats)),
      h('div', { class: 'today-row' }, icon('berry'), h('span', null, 'Trips'), pips(day.trips, DAILY_GOAL.trips)),
      h('div', { class: 'today-row' }, icon('star'), h('span', null, 'Star or friend'), pips(day.wins, DAILY_GOAL.wins)),
      wishes.length
        ? h(
            'div',
            { class: 'today-row wishes-row' },
            h('span', null, 'Wishes'),
            h(
              'span',
              { class: 'wish-faces' },
              wishes.map((w) => h('span', { class: `wish-face ${w.done ? 'done' : ''}` }, monsterImg(w.id, save.monsters[w.id]?.stage ?? 1, 34), w.done ? icon('check') : null)),
            ),
          )
        : null,
      asleep
        ? button('Wake up!', wakeUp, 'btn-small btn-primary night-btn')
        : dailyDone(day)
          ? button('Good night', goodNight, 'btn-small night-btn')
          : null,
    ),
    h(
      'div',
      { class: 'rank' },
      h('span', { class: 'rank-label' }, icon('star', 'on'), `Ranger level ${rank.level}`),
      h('span', { class: 'rank-bar' }, h('i', { style: `width:${Math.round((rank.into / rank.span) * 100)}%` })),
    ),
    h(
      'div',
      { class: 'corner-tr' },
      button([berryCount, 'Shop'], () => app.go('shop'), 'btn-small shop-btn'),
      button(`Stickers ${save.stickers.length}/${STICKERS.length}`, () => app.go('stickers'), 'btn-small'),
      button([icon('book'), 'Journal'], () => app.go('journal'), 'btn-small'),
      h(
        'button',
        { class: 'btn btn-round', type: 'button', 'aria-label': 'Sound on or off', onclick: toggleSound },
        icon(save.settings.voice && save.settings.sound ? 'speaker' : 'mute'),
      ),
      h(
        'button',
        { class: `btn btn-round music-btn ${save.settings.music === false ? 'off' : ''}`, type: 'button', 'aria-label': 'Music on or off', 'aria-pressed': String(save.settings.music !== false), onclick: toggleMusic },
        icon('note'),
      ),
    ),
    place('place-grass', 'Tall Grass', 'grass', grassNext, () => goGrass(app)),
    place('place-hollow', 'Honey Hollow', 'drop', hollowNext, () => goHollow(app)),
    place('place-early', 'Berry Patch', 'berry', earlyNext, () => goEarly(app)),
    place('place-canyon', 'Berry Canyon', 'berry', canyonNext, () => goCanyon(app)),
    place('place-upper', 'Bakery', 'bun', upperNext, () => goUpper(app)),
    h('div', { class: `night-sky ${asleep ? 'on' : ''}`, 'aria-hidden': 'true' }, h('i', { class: 'moon' }), times(14, (i) => h('i', { class: 'night-star', style: `left:${(i * 83 + 40) % 1240}px;top:${(i * 47) % 190 + 14}px;animation-delay:${(i % 5) * 0.4}s` }))),
    h('div', { class: 'home-grownups' }, holdButton('Grown-ups (hold)', () => app.go('grownups'))),
    all.length > MEADOW_MAX
      ? h('div', { class: 'home-friends' }, button([icon('heart', 'on'), `All friends ${all.length}`], openFriends, 'btn-small friends-btn'))
      : null,
    cardHost,
  );

  // The day's three small goals are done: one bonus star, and a clear place to stop.
  if (dailyDone(day) && !day.rewarded && save.starter) {
    day.rewarded = true;
    const starter = save.starter;
    const result = giveStar(save, starter, { bonus: true });
    const gift = dayGift(save);
    app.commit();
    const name = displayName(save, starter);
    celebrate(el, {
      id: starter,
      stage: save.monsters[starter]?.stage ?? 1,
      title: result === 'grown' ? `${name} evolved!` : 'You did it all today!',
      fx: result === 'grown' ? { kind: 'evolve', from: ((save.monsters[starter]?.stage ?? 2) - 1) as Stage } : undefined,
      voice: ['day_done2'],
      lines: [
        `${name} got a bonus star.`,
        gift.charm ? `And a gift: the ${gift.charm.name} charm!` : `And a gift: ${gift.berries} berries!`,
        'That is all of today done. Come back tomorrow for more stars!',
      ],
      buttons: [{ label: 'Okay', onClick: () => app.go('home'), primary: true }],
      big: true,
    });
  } else if (!save.seenTips.includes('home')) {
    save.seenTips.push('home');
    app.commit();
    el.querySelector('.place-grass')?.classList.add('pulse');
    say('home_tip');
  } else if (asleep) {
    app.commit();
  } else if (eggReady(save)) {
    say('egg_ready');
  } else if (gated && !save.seenTips.includes(`gate-${gated.id}`)) {
    save.seenTips.push(`gate-${gated.id}`);
    app.commit();
    say('gate_tip');
  } else if (dailyDone(day) && !save.seenTips.includes('night')) {
    save.seenTips.push('night');
    app.commit();
    say('night_tip');
  } else if (wishes.some((w) => !w.done) && !save.seenTips.includes(`wish-${Object.keys(save.days).length}`)) {
    save.seenTips.push(`wish-${Object.keys(save.days).length}`);
    const first = wishes.find((w) => !w.done);
    if (first) say(nameClip(first.id), 'wants_play');
    app.commit();
  } else {
    app.commit();
  }

  // Stickers earned by things that happen here or between screens: hatching, growing, new days.
  const fresh = claimStickers(save);
  if (fresh.length > 0) {
    app.commit();
    toasts(el, fresh.map((st) => ({ text: `New sticker: ${st.name}`, kind: 'sticker' as const, sticker: st, clip: 't_sticker' })));
  }

  // The meadow is alive: friends wander, notice each other, and react to what she does.
  const EMOTES = ['heart', 'star', 'note'];
  const timers: number[] = [];
  const waits: number[] = [];
  const busy = new Set<HTMLElement>();
  const later = (ms: number, fn: () => void): void => {
    waits.push(
      window.setTimeout(() => {
        if (el.isConnected) fn();
      }, ms),
    );
  };

  function emote(friend: HTMLElement, kind: string): void {
    const mark = h('span', { class: `emote emote-${kind}` }, kind === 'zzz' ? 'z z' : kind === 'note' ? '♪' : kind === 'wow' ? '!' : icon(kind, 'on'));
    friend.appendChild(mark);
    window.setTimeout(() => mark.remove(), 1800);
  }

  const leftOf = (friend: HTMLElement): number => parseFloat(friend.style.left) || Number(friend.dataset.x ?? 0);
  const widthOf = (friend: HTMLElement): number => Number(friend.querySelector<HTMLElement>('.monster')?.dataset.size ?? 120);

  function walk(friend: HTMLElement, to: number): void {
    friend.classList.toggle('face-left', to < leftOf(friend));
    friend.style.left = `${Math.round(Math.max(20, Math.min(1140, to)))}px`;
  }

  function face(friend: HTMLElement, other: HTMLElement): void {
    friend.classList.toggle('face-left', leftOf(other) < leftOf(friend));
  }

  function hop(friend: HTMLElement): void {
    const pic = friend.querySelector<HTMLElement>('.monster');
    if (!pic) return;
    pic.classList.remove('jump');
    void pic.offsetWidth;
    pic.classList.add('jump');
    window.setTimeout(() => pic.classList.remove('jump'), 1000);
  }

  const awake = (): HTMLElement[] => [...el.querySelectorAll<HTMLElement>('.friend:not(.sleepy)')];

  /** Friends in the meadow look over and react when she pets, feeds or plays with one of them. */
  function crowd(except: SpeciesId, kind: string): void {
    const others = awake().filter((f) => f.dataset.id !== except);
    for (const friend of others.sort(() => Math.random() - 0.5).slice(0, 3)) {
      later(200 + Math.random() * 500, () => {
        emote(friend, kind === 'berry' ? 'wow' : kind);
        hop(friend);
      });
    }
  }

  /** Two friends meet: one walks over, then they greet, chat, or play tag. */
  function meet(): void {
    if (cardHost.firstChild) return;
    const free = awake().filter((f) => !busy.has(f));
    if (free.length < 2) return;
    const a = pick(free);
    const b = free.filter((f) => f !== a).sort((x, y) => Math.abs(leftOf(x) - leftOf(a)) - Math.abs(leftOf(y) - leftOf(a)))[0] as HTMLElement;
    const kind = pick(['greet', 'chat', 'tag']);
    busy.add(a);
    busy.add(b);
    const side = leftOf(a) < leftOf(b) ? -1 : 1;
    walk(a, leftOf(b) + side * widthOf(b) * 0.8);
    later(2700, () => {
      face(a, b);
      face(b, a);
      if (kind === 'greet') {
        emote(a, 'heart');
        later(350, () => emote(b, 'heart'));
        hop(a);
        hop(b);
      } else if (kind === 'chat') {
        emote(a, 'note');
        later(600, () => emote(b, 'wow'));
        later(1200, () => emote(a, 'star'));
      } else {
        emote(a, 'wow');
        hop(a);
        // Tag: the one who was tagged runs, and the tagger gives chase.
        later(500, () => walk(b, leftOf(b) - side * 190));
        later(1100, () => walk(a, leftOf(a) - side * 150));
      }
    });
    later(kind === 'tag' ? 6200 : 5000, () => {
      walk(a, Number(a.dataset.x ?? 0));
      walk(b, Number(b.dataset.x ?? 0));
    });
    later(kind === 'tag' ? 9000 : 7800, () => {
      busy.delete(a);
      busy.delete(b);
    });
  }

  el.querySelectorAll<HTMLElement>('.friend').forEach((friend, k) => {
    const home = Number(friend.dataset.x ?? 0);
    const wander = (): void => {
      if (cardHost.firstChild || busy.has(friend)) return; // hold still while a card is open
      if (friend.classList.contains('sleepy')) {
        if (Math.random() < 0.6) emote(friend, 'zzz');
        return;
      }
      walk(friend, home + Math.round((Math.random() - 0.5) * 150));
      if (Math.random() < 0.3) emote(friend, pick(EMOTES));
    };
    timers.push(window.setInterval(wander, 4200 + ((k * 937) % 2600)));
  });
  timers.push(window.setInterval(meet, 6500));

  // A friend that was just called out says hello.
  const called = ordered.find((m) => m.id === params.open);
  if (called) openCard(called);

  return {
    el,
    dispose() {
      timers.forEach((t) => window.clearInterval(t));
      waits.forEach((t) => window.clearTimeout(t));
    },
  };
};
