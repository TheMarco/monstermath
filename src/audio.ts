/** Recorded voice clips and sound effects. Everything is optional: the game works silent. */

export const audioSettings = { voice: true, sound: true };

export function initAudio(): void {
  /* clips load on demand; nothing to prepare */
}

let ctx: AudioContext | null = null;

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
  if (ctx.state === 'suspended') void ctx.resume();
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

export type Sfx = 'tap' | 'pop' | 'yes' | 'soft' | 'win' | 'star' | 'munch' | 'pack' | 'charge';

export function sfx(name: Sfx): void {
  if (!audioSettings.sound) return;
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

function loadClip(id: string): Promise<Clip | null> {
  let pending = clips.get(id);
  if (!pending) {
    pending = (async () => {
      const c = audioCtx();
      if (!c || typeof fetch === 'undefined') return null;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}voice/${id}.m4a`);
        if (!res.ok) return null;
        const buffer = await c.decodeAudioData(await res.arrayBuffer());
        return { buffer, ...trim(buffer) };
      } catch {
        return null; // a missing clip is skipped, never an error
      }
    })();
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
