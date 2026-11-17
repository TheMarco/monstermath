import type { SpeciesId, Stage } from '../data/monsters';

/**
 * Animated monsters. Each clip is a short video of the monster's own picture
 * on a flat magenta background. The game removes the magenta while it plays, so
 * no extra software is needed to prepare the clips. A monster without a clip
 * simply stays a still picture.
 */

export type AnimKind = 'idle' | 'happy';

/**
 * How much of the clip's width the still picture takes: 0.8 in the first clips,
 * 0.6 in the ones remade with more room to move.
 */
const fills = new Map<string, number>();
const OLD_FILL = 0.8;
/** The canvas always leaves this much room: the still picture is 0.6 of its width. */
const ROOM = 0.6;
const base = (): string => `${import.meta.env.BASE_URL}art/anim/`;

/** At most this many clips play at once; the rest stay still, to keep the laptop cool. */
const MAX_LIVE = 8;
let live = 0;

export async function loadAnimManifest(): Promise<number> {
  try {
    const res = await fetch(`${base()}manifest.json`, { cache: 'no-store' });
    if (!res.ok) return 0;
    readManifest((await res.json()) as string[] | Record<string, number>);
  } catch {
    /* no clips yet: still pictures everywhere */
  }
  return fills.size;
}

/** The list is either plain names (all first clips) or each name with its share of the picture. */
export function readManifest(data: string[] | Record<string, number>): void {
  fills.clear();
  if (Array.isArray(data)) for (const name of data) fills.set(name, OLD_FILL);
  else for (const [name, fill] of Object.entries(data)) fills.set(name, fill >= ROOM && fill <= 1 ? fill : OLD_FILL);
}

/** The side of the square a clip is drawn into, on a canvas `px` wide, so the monster matches its still picture. */
export function clipSide(name: string, px: number): number {
  return Math.round((px * ROOM) / (fills.get(name) ?? OLD_FILL));
}

export function animName(id: SpeciesId, stage: Stage, kind: AnimKind): string {
  return `${id}${stage === 1 ? '' : `-${stage}`}-${kind}`;
}

/** The clip that shows a monster evolving into this stage, or hatching. */
export function introName(id: SpeciesId, stage: Stage, hatched = false): string {
  return hatched ? `${id}-hatch` : `${id}-to${stage}`;
}

export function hasClip(name: string): boolean {
  return fills.has(name);
}

export function hasAnim(id: SpeciesId, stage: Stage, kind: AnimKind): boolean {
  return fills.has(animName(id, stage, kind));
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


/** Replace the still picture inside `wrap` with its idle clip, when there is one. */
export function mountAnim(wrap: HTMLElement, id: SpeciesId, stage: Stage, size: number, intro?: string): void {
  if (!hasAnim(id, stage, 'idle') || live >= MAX_LIVE) return;
  // "calm" monsters hold still and only stir now and then (the title screen).
  const calm = wrap.classList.contains('calm');
  const canvas = document.createElement('canvas');
  // The canvas is larger than the still picture, to leave room for jumps and wings.
  const px = Math.min(560, Math.round((size / ROOM) * 1.5));
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
  let side = px;
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
    side = clipSide(animName(id, stage, kind), px);
    video.src = `${base()}${animName(id, stage, kind)}.mp4`;
    if (kind === 'idle' && calm) stirLater();
    else void video.play().catch(() => undefined);
  };

  const playIntro = (name: string): void => {
    current = 'intro';
    video.loop = false;
    side = clipSide(name, px);
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
    const off = (px - side) >> 1;
    ctx.drawImage(video, off, off, side, side);
    const image = ctx.getImageData(off, off, side, side);
    removeKey(image.data);
    ctx.putImageData(image, off, off);
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

  if (!hasAnim(id, stage, 'happy')) wrap.classList.add('no-happy');
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
