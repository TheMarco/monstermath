/** Recorded voice clips and sound effects. Everything is optional: the game works silent. */

export const audioSettings = { voice: true, sound: true, music: true };

let ctx: AudioContext | null = null;
let hidden = false;

/** Loads the sound effects, and wires the two things a browser needs: a first touch to start sound, and silence in a hidden tab. */
export function initAudio(): void {
  if (typeof window === 'undefined') return;
  for (const name of Object.keys(SAMPLE_GAIN) as Sfx[]) {
    void loadFile(`sound/${name}.m4a`).then((clip) => {
      if (clip) samples.set(name, { ...clip, peak: peakOf(clip.buffer) });
    });
  }
  const wake = (): void => void audioCtx();
  window.addEventListener('pointerdown', wake, true);
  window.addEventListener('keydown', wake, true);
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (!ctx) return;
    if (hidden) void ctx.suspend();
    else void ctx.resume();
  });
}

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended' && !hidden) void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, slideTo?: number): void {
  const c = audioCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export type Sfx = 'tap' | 'pop' | 'yes' | 'soft' | 'win' | 'star' | 'munch' | 'pack' | 'charge' | 'hatch' | 'buy' | 'heart' | 'level' | 'night';

/**
 * How loud each recorded effect plays (its peak, where 1 is full scale). The
 * tap is the softest because it sounds on every button. An effect whose file
 * is missing falls back to the synthesized tones below.
 */
const SAMPLE_GAIN: Record<Sfx, number> = {
  tap: 0.14,
  pop: 0.24,
  yes: 0.3,
  soft: 0.22,
  win: 0.34,
  star: 0.28,
  munch: 0.3,
  pack: 0.28,
  charge: 0.3,
  hatch: 0.32,
  buy: 0.3,
  heart: 0.24,
  level: 0.32,
  night: 0.26,
};

const samples = new Map<Sfx, Clip & { peak: number }>();

function peakOf(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = Math.abs(data[i] as number);
    if (v > peak) peak = v;
  }
  return peak;
}

function playSample(name: Sfx): boolean {
  const clip = samples.get(name);
  const c = audioCtx();
  if (!clip || !c || clip.peak < 0.01) return false;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = clip.buffer;
  g.gain.value = SAMPLE_GAIN[name] / clip.peak;
  src.connect(g).connect(c.destination);
  src.start(c.currentTime, clip.start, clip.length);
  return true;
}

export function sfx(name: Sfx): void {
  if (!audioSettings.sound) return;
  if (playSample(name)) return;
  switch (name) {
    case 'tap':
      tone(520, 0, 0.06, 'triangle', 0.07);
      break;
    case 'pop':
      tone(420, 0, 0.09, 'sine', 0.12, 840);
      break;
    case 'pack':
      tone(300, 0, 0.08, 'triangle', 0.12, 200);
      tone(620, 0.09, 0.12, 'sine', 0.12);
      break;
    case 'munch':
      tone(260, 0, 0.07, 'square', 0.05);
      tone(220, 0.1, 0.07, 'square', 0.05);
      tone(260, 0.2, 0.07, 'square', 0.05);
      break;
    case 'yes':
      tone(660, 0, 0.12, 'sine', 0.13);
      tone(880, 0.1, 0.18, 'sine', 0.13);
      break;
    case 'soft':
      tone(330, 0, 0.16, 'sine', 0.08, 300);
      break;
    case 'star':
      tone(784, 0, 0.1, 'triangle', 0.12);
      tone(988, 0.09, 0.1, 'triangle', 0.12);
      tone(1319, 0.18, 0.25, 'triangle', 0.12);
      break;
    case 'charge':
      tone(180, 0, 1.6, 'sawtooth', 0.05, 1100);
      tone(360, 0.2, 1.4, 'triangle', 0.07, 1500);
      break;
    case 'hatch':
      tone(900, 0, 0.05, 'square', 0.05, 500);
      tone(1100, 0.16, 0.05, 'square', 0.05, 600);
      tone(1319, 0.4, 0.3, 'triangle', 0.11);
      break;
    case 'buy':
      tone(988, 0, 0.08, 'triangle', 0.11);
      tone(1319, 0.08, 0.22, 'triangle', 0.11);
      break;
    case 'heart':
      tone(523, 0, 0.14, 'sine', 0.1, 659);
      break;
    case 'level':
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.18, 'triangle', 0.11));
      break;
    case 'night':
      [1047, 784, 659, 523].forEach((f, i) => tone(f, i * 0.28, 0.5, 'sine', 0.07));
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, 'triangle', 0.13));
      tone(1319, 0.48, 0.4, 'sine', 0.12);
      break;
  }
}

/** Each monster has its own little chirp, built from its place in the list. */
export function cry(index: number): void {
  if (!audioSettings.sound) return;
  const base = 420 + ((index * 97) % 9) * 55;
  const shape: OscillatorType = index % 3 === 0 ? 'triangle' : index % 3 === 1 ? 'sine' : 'square';
  const gain = shape === 'square' ? 0.05 : 0.11;
  const up = index % 2 === 0;
  tone(base, 0, 0.11, shape, gain, up ? base * 1.35 : base * 0.8);
  tone(up ? base * 1.5 : base * 1.2, 0.12, 0.16, shape, gain, up ? base * 1.2 : base * 1.6);
  if (index % 4 === 0) tone(base * 1.8, 0.3, 0.1, shape, gain);
}

// ---- recorded voice ---------------------------------------------------------

interface Clip {
  buffer: AudioBuffer;
  start: number;
  length: number;
}

const clips = new Map<string, Promise<Clip | null>>();
let playing: AudioBufferSourceNode[] = [];
let token = 0;
let endsAt = 0;
let lastSaid: string[] = [];

/** Pause between stitched pieces, such as a phrase and its number. */
const PIECE_GAP = 0.11;

/** Find where the speech starts and ends, so stitched clips sit close together. */
function trim(buffer: AudioBuffer): { start: number; length: number } {
  const data = buffer.getChannelData(0);
  const threshold = 0.012;
  let first = 0;
  let last = data.length - 1;
  while (first < last && Math.abs(data[first] as number) < threshold) first += 1;
  while (last > first && Math.abs(data[last] as number) < threshold) last -= 1;
  const pad = Math.floor(buffer.sampleRate * 0.03);
  first = Math.max(0, first - pad);
  last = Math.min(data.length - 1, last + pad * 2);
  return { start: first / buffer.sampleRate, length: (last - first) / buffer.sampleRate };
}

/** Fetches and decodes one audio file from the site. A missing file gives null, never an error. */
async function loadFile(path: string): Promise<Clip | null> {
  const c = audioCtx();
  if (!c || typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
    if (!res.ok) return null;
    const buffer = await c.decodeAudioData(await res.arrayBuffer());
    return { buffer, ...trim(buffer) };
  } catch {
    return null;
  }
}

function loadClip(id: string): Promise<Clip | null> {
  let pending = clips.get(id);
  if (!pending) {
    pending = loadFile(`voice/${id}.m4a`);
    clips.set(id, pending);
  }
  return pending;
}

function stopVoice(): void {
  token += 1;
  for (const src of playing) {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
  }
  playing = [];
  endsAt = 0;
  setBus(0.8);
}

async function playClips(ids: string[], append: boolean): Promise<void> {
  const c = audioCtx();
  if (!c || !audioSettings.voice || ids.length === 0) return;
  if (!append) stopVoice();
  const mine = token;
  const loaded = await Promise.all(ids.map(loadClip));
  if (mine !== token) return;
  let at = Math.max(c.currentTime + 0.04, append && endsAt > c.currentTime ? endsAt + 0.3 : 0);
  for (const clip of loaded) {
    if (!clip) continue;
    const src = c.createBufferSource();
    src.buffer = clip.buffer;
    src.connect(c.destination);
    src.start(at, clip.start, clip.length);
    playing.push(src);
    at += clip.length + PIECE_GAP;
  }
  endsAt = at;
  setBus(0.15);
  window.clearTimeout(duckTimer);
  duckTimer = window.setTimeout(() => setBus(0.8), Math.max(0, (at - c.currentTime) * 1000) + 60);
}

type Piece = string | null | undefined | false;

/** Speak clips in order. A new line interrupts the one before. */
/** The most recent clips requested, newest last. Lets tests check every line has a recording. */
export const spokenLog: string[] = [];

function note(ids: string[]): void {
  spokenLog.push(...ids);
  if (spokenLog.length > 2000) spokenLog.splice(0, spokenLog.length - 2000);
}

export function say(...pieces: Piece[]): void {
  const ids = pieces.filter((p): p is string => !!p);
  lastSaid = ids;
  note(ids);
  void playClips(ids, false);
}

/** Speak after whatever is being said, without cutting it off. */
export function sayAlso(...pieces: Piece[]): void {
  const ids = pieces.filter((p): p is string => !!p);
  note(ids);
  void playClips(ids, true);
}

export function sayAgain(): void {
  if (lastSaid.length) void playClips(lastSaid, false);
}

export function hush(): void {
  stopVoice();
}

/** Fetch and decode clips ahead of time so the first play has no delay. */
export function preload(...pieces: Piece[]): void {
  for (const p of pieces) if (p) void loadClip(p);
}

// ---- music ------------------------------------------------------------------

export type Track = 'meadow' | 'play' | 'think' | 'night';

/** Music sits well under the voice, and drops further while a line is spoken. */
const MUSIC_GAIN = 0.2;
const DUCK = 0.3;
/** Seconds the end of a track overlaps its own start, so the loop has no seam. */
const CROSS = 2.5;

let bus: GainNode | null = null;
let level = 1;
let nowPlaying: Track | null = null;
let loop: { stop: () => void } | null = null;
let musicToken = 0;
let duckTimer = 0;

function setBus(seconds: number): void {
  if (!ctx || !bus) return;
  const speaking = ctx.currentTime < endsAt;
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setTargetAtTime(MUSIC_GAIN * level * (speaking ? DUCK : 1), ctx.currentTime, seconds / 3);
}

function startLoop(c: AudioContext, buffer: AudioBuffer): { stop: () => void } {
  if (!bus) {
    bus = c.createGain();
    bus.gain.value = 0;
    bus.connect(c.destination);
  }
  setBus(0.4);
  const out = c.createGain();
  out.connect(bus);
  const body = Math.max(1, buffer.duration - CROSS);
  let stopped = false;
  let timer = 0;
  const playOnce = (at: number, fadeIn: number): void => {
    const src = c.createBufferSource();
    const g = c.createGain();
    src.buffer = buffer;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(1, at + fadeIn);
    g.gain.setValueAtTime(1, at + body);
    g.gain.linearRampToValueAtTime(0.0001, at + body + CROSS);
    src.connect(g).connect(out);
    src.start(at);
    src.stop(at + body + CROSS + 0.1);
    const next = (): void => {
      if (stopped) return;
      // Queue the next pass about a second before it is due; while sound is paused, keep waiting.
      const wait = at + body - c.currentTime - 1;
      if (c.state !== 'running' || wait > 0.05) timer = window.setTimeout(next, c.state !== 'running' ? 1000 : wait * 1000);
      else playOnce(at + body, CROSS);
    };
    next();
  };
  playOnce(c.currentTime + 0.05, 1.2);
  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      out.gain.setTargetAtTime(0, c.currentTime, 0.25);
      window.setTimeout(() => out.disconnect(), 2000);
    },
  };
}

/**
 * Sets the background track, or none. `lvl` scales it for the screen: full on
 * the meadow, lower where the child has to listen and think.
 */
export function music(track: Track | null, lvl = 1): void {
  level = lvl;
  const next = audioSettings.music ? track : null;
  if (next === nowPlaying) {
    setBus(0.6);
    return;
  }
  nowPlaying = next;
  musicToken += 1;
  loop?.stop();
  loop = null;
  if (!next) return;
  const mine = musicToken;
  void loadFile(`music/${next}.m4a`).then((clip) => {
    const c = audioCtx();
    if (!clip || !c || mine !== musicToken) return;
    loop = startLoop(c, clip.buffer);
  });
}

/** Changes how loud the current track is without changing the track. */
export function musicLevel(lvl: number): void {
  music(nowPlaying, lvl);
}
