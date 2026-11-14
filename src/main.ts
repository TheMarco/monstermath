import '@fontsource/lexend/400.css';
import '@fontsource/lexend/600.css';
import '@fontsource/lexend/700.css';
import './style.css';

import { audioSettings, hush, initAudio, music, musicLevel, type Track } from './audio';
import { befriendScreen } from './screens/befriend';
import { canyonScreen } from './screens/canyon';
import { grownupsScreen } from './screens/grownups';
import { hollowScreen } from './screens/hollow';
import { homeScreen } from './screens/home';
import { introScreen } from './screens/intro';
import { journalScreen } from './screens/journal';
import { lessonScreen } from './screens/lesson';
import { playersScreen } from './screens/players';
import { shopScreen } from './screens/shop';
import { stickersScreen } from './screens/stickers';
import { titleScreen } from './screens/title';
import { freshSave, loadSave, persist, players, today, wipeSave } from './state';
import { loadAnimManifest } from './ui/anim';
import { setCharmLookup } from './ui/charms';
import { SPECIES, type SpeciesId, type Stage } from './data/monsters';
import { celebrate } from './ui/common';
import type { App, Screen, ScreenHandle, ScreenName } from './ui/common';

const SCREENS: Record<ScreenName, Screen> = {
  title: titleScreen,
  intro: introScreen,
  home: homeScreen,
  befriend: befriendScreen,
  canyon: canyonScreen,
  journal: journalScreen,
  lesson: lessonScreen,
  stickers: stickersScreen,
  grownups: grownupsScreen,
  hollow: hollowScreen,
  shop: shopScreen,
  players: playersScreen,
};

/**
 * The track and its loudness for each screen. Screens where the child listens
 * to a problem play calmer music, lower. A lesson keeps the track it came from.
 */
const MUSIC: Record<ScreenName, [Track | null | 'keep', number]> = {
  title: ['meadow', 1],
  players: ['meadow', 1],
  home: ['meadow', 1],
  shop: ['meadow', 0.85],
  journal: ['meadow', 0.85],
  stickers: ['meadow', 0.85],
  intro: ['meadow', 0.6],
  befriend: ['play', 0.7],
  canyon: ['think', 0.7],
  hollow: ['think', 0.7],
  lesson: ['keep', 0.5],
  grownups: [null, 0],
};

export function startApp(stage: HTMLElement): App {
  let current: ScreenHandle | null = null;

  const app: App = {
    save: loadSave(),
    go(name, params = {}) {
      current?.dispose?.();
      hush();
      audioSettings.voice = app.save.settings.voice;
      audioSettings.sound = app.save.settings.sound;
      audioSettings.music = app.save.settings.music !== false;
      const [track, loud] = MUSIC[name];
      if (track === 'keep') musicLevel(loud);
      else music(name === 'home' && today(app.save).asleep ? 'night' : track, loud);
      const handle = SCREENS[name](app, params);
      stage.replaceChildren(handle.el);
      current = handle;
    },
    commit() {
      persist(app.save);
      keepStorage();
    },
    reset() {
      wipeSave();
      app.save = freshSave();
      app.go('title');
    },
    reload() {
      app.save = loadSave();
      app.go('title');
    },
  };

  setCharmLookup((id) => app.save.monsters[id]?.charm);
  window.addEventListener('keydown', (e) => current?.onKey?.(e));

  const fit = (): void => {
    const k = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = `scale(${k > 0 ? k : 1})`;
  };
  window.addEventListener('resize', fit);
  fit();

  initAudio();
  app.go(players().length > 1 ? 'players' : 'title');
  // Clips are optional. When they are found, redraw the title so its monsters start moving.
  void loadAnimManifest().then((count) => {
    if (count > 0 && stage.querySelector('.title-screen')) app.go('title');
    previewFx(stage);
  });
  return app;
}

let asked = false;
/** Asks the browser, once, not to clear this site's data when the disk runs low. */
function keepStorage(): void {
  if (asked) return;
  asked = true;
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    /* not supported */
  }
}

/**
 * For grown-ups checking the look: `#fx=hatch:tup` or `#fx=evolve:puff:2`
 * (the stage it grows into) plays that sequence over the title screen.
 * Nothing is saved.
 */
function previewFx(stage: HTMLElement): void {
  const match = /^#fx=(hatch|evolve):([a-z]+)(?::([23]))?$/.exec(window.location.hash);
  if (!match || !(match[2] in SPECIES)) return;
  const id = match[2] as SpeciesId;
  const to = (match[1] === 'hatch' ? 1 : Number(match[3] ?? 2)) as Stage;
  const show = (): void => {
    celebrate(stage, {
      id,
      stage: to,
      big: true,
      title: match[1] === 'hatch' ? `It is ${SPECIES[id].name}!` : `${SPECIES[id].name} grew!`,
      lines: ['Preview only. Nothing is saved.'],
      fx: match[1] === 'hatch' ? { kind: 'hatch' } : { kind: 'evolve', from: (to - 1) as Stage },
      buttons: [{ label: 'Again', onClick: show, primary: true }, { label: 'Close', onClick: () => undefined }],
    });
  };
  show();
}

const stageEl = document.getElementById('stage');
if (stageEl) startApp(stageEl);
