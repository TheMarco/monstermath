import type { SpeciesId, Stage } from '../data/monsters';

/**
 * Animated monsters. Each clip is a short video of the monster's own picture
 * on a flat magenta background. The game removes the magenta while it plays, so
 * no extra software is needed to prepare the clips. A monster without a clip
 * simply stays a still picture.
 */

export type AnimKind = 'idle' | 'happy';

const names = new Set<string>();
const base = (): string => `${import.meta.env.BASE_URL}art/anim/`;

/** At most this many clips play at once; the rest stay still, to keep the laptop cool. */
const MAX_LIVE = 8;
let live = 0;

export async function loadAnimManifest(): Promise<number> {
  try {
    const res = await fetch(`${base()}manifest.json`, { cache: 'no-store' });
    if (!res.ok) return 0;
    const list = (await res.json()) as string[];
    names.clear();
    for (const name of list) names.add(name);
  } catch {
    /* no clips yet: still pictures everywhere */
  }
  return names.size;
}

export function animName(id: SpeciesId, stage: Stage, kind: AnimKind): string {
  return `${id}${stage === 1 ? '' : `-${stage}`}-${kind}`;
}

/** The clip that shows a monster evolving into this stage, or hatching. */
export function introName(id: SpeciesId, stage: Stage, hatched = false): string {
  return hatched ? `${id}-hatch` : `${id}-to${stage}`;
}

export function hasClip(name: string): boolean {
  return names.has(name);
}

export function hasAnim(id: SpeciesId, stage: Stage, kind: AnimKind): boolean {
  return names.has(animName(id, stage, kind));
}

/**
 * The clips sit on pure magenta, a colour none of the monsters use. A pixel
 * is background by how far its red and blue both stand above its green. The
 * strongest pinks and purples on the monsters score about 60; pure magenta
 * scores 255.
 */
const KEY_SOFT = 110;
const KEY_HARD = 170;

/** Make the magenta background transparent, in place. */
export function removeKey(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] as number;
    const g = data[i + 1] as number;
    const b = data[i + 2] as number;
    const excess = (r < b ? r : b) - g;
    if (excess <= KEY_SOFT) continue;
    data[i + 3] = excess >= KEY_HARD ? 0 : Math.round((255 * (KEY_HARD - excess)) / (KEY_HARD - KEY_SOFT));
    // Take the magenta tint off the edge pixels: they sit on the dark outline.
    data[i] = g;
    data[i + 2] = g;
  }
}

interface Mounted {
  play(kind: AnimKind): void;
}

const mounted = new WeakMap<HTMLElement, Mounted>();

/** The clips leave room around the monster for jumping, so the picture is drawn a little larger. */
const CLIP_SCALE = 1.25;

/** Replace the still picture inside `wrap` with its idle clip, when there is one. */
export function mountAnim(wrap: HTMLElement, id: SpeciesId, stage: Stage, size: number, intro?: string): void {
  if (!hasAnim(id, stage, 'idle') || live >= MAX_LIVE) return;
  // "calm" monsters hold still and only stir now and then (the title screen).
  const calm = wrap.classList.contains('calm');
  const canvas = document.createElement('canvas');
  const px = Math.min(420, Math.round(size * CLIP_SCALE * 1.5));
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  canvas.className = 'anim-canvas';
  canvas.style.display = 'none';

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.preload = 'auto';

  let current: AnimKind | 'intro' = 'idle';
  let stirTimer = 0;
  let lastTime = -1;
  let shown = false;
  let raf = 0;
  let seenInPage = false;
  live += 1;

  const stop = (): void => {
    window.clearTimeout(stirTimer);
    cancelAnimationFrame(raf);
    video.pause();
    video.removeAttribute('src');
    live -= 1;
  };

  /** In calm mode the idle clip plays once, then waits a while before the next stir. */
  const stirLater = (): void => {
    window.clearTimeout(stirTimer);
    stirTimer = window.setTimeout(() => {
      if (current === 'idle') void video.play().catch(() => undefined);
    }, 7000 + Math.random() * 11000);
  };

  const setClip = (kind: AnimKind): void => {
    current = kind;
    video.loop = kind === 'idle' && !calm;
    video.src = `${base()}${animName(id, stage, kind)}.mp4`;
    if (kind === 'idle' && calm) stirLater();
    else void video.play().catch(() => undefined);
  };

  const playIntro = (name: string): void => {
    current = 'intro';
    video.loop = false;
    video.src = `${base()}${name}.mp4`;
    void video.play().catch(() => undefined);
  };

  video.addEventListener('ended', () => {
    if (current !== 'idle') setClip('idle');
    else if (calm) {
      video.currentTime = 0;
      stirLater();
    }
  });

  const frame = (): void => {
    if (wrap.isConnected) seenInPage = true;
    else if (seenInPage) {
      stop(); // the screen was left
      return;
    }
    raf = requestAnimationFrame(frame);
    if (video.readyState < 2 || video.currentTime === lastTime) return;
    lastTime = video.currentTime;
    ctx.clearRect(0, 0, px, px);
    ctx.drawImage(video, 0, 0, px, px);
    const image = ctx.getImageData(0, 0, px, px);
    removeKey(image.data);
    ctx.putImageData(image, 0, 0);
    if (!shown) {
      shown = true;
      canvas.style.display = '';
      wrap.classList.add('animated');
    }
  };

  // Screens show joy by adding the "jump" class. An animated monster answers with its happy clip.
  if (typeof MutationObserver !== 'undefined') {
    let jumping = false;
    new MutationObserver(() => {
      const now = wrap.classList.contains('jump');
      if (now && !jumping && hasAnim(id, stage, 'happy')) setClip('happy');
      jumping = now;
    }).observe(wrap, { attributes: true, attributeFilter: ['class'] });
  }

  wrap.appendChild(canvas);
  if (intro && hasClip(intro)) playIntro(intro);
  else setClip('idle');
  raf = requestAnimationFrame(frame);
  mounted.set(wrap, {
    play(kind) {
      if (hasAnim(id, stage, kind)) setClip(kind);
    },
  });
}

/** Play a one-off reaction clip, then return to idling. Returns false when the monster is a still picture. */
export function playAnim(wrap: HTMLElement, kind: AnimKind): boolean {
  const m = mounted.get(wrap);
  if (!m) return false;
  m.play(kind);
  return true;
}
