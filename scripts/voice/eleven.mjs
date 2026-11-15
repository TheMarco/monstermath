// ElevenLabs helper. The key is read from .env.local (ELEVENLABS_API_KEY), never printed.
//
//   node scripts/voice/eleven.mjs info
//       account credits, speech models and the voices on the account
//   node scripts/voice/eleven.mjs sample <model_id> <name>=<voice_id> [<name>=<voice_id> ...]
//       reads a few game lines in each voice into voice-samples/
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const API = 'https://api.elevenlabs.io';

function key() {
  const line = readFileSync('.env.local', 'utf8').split('\n').find((l) => l.startsWith('ELEVENLABS_API_KEY='));
  if (!line) throw new Error('ELEVENLABS_API_KEY is missing from .env.local');
  return line.slice('ELEVENLABS_API_KEY='.length).trim();
}

async function get(path) {
  const res = await fetch(API + path, { headers: { 'xi-api-key': key() } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function speak(text, voiceId, modelId, settings = {}) {
  const res = await fetch(`${API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key(), 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: modelId, voice_settings: { stability: 0.6, similarity_boost: 0.8, ...settings } }),
  });
  if (!res.ok) throw new Error(`speech: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

const SAMPLE_LINES = [
  ['greet', 'Hi! I am so happy you are here. Pick a friend to play with.'],
  ['task', 'Plum has twenty-seven berries, and finds fifteen more. How many berries are there now?'],
  ['help', 'That was a tricky one. Let us do it together, one step at a time.'],
  ['praise', 'You packed a crate of ten. Nice work!'],
];

async function info() {
  // A restricted key may lack some of these permissions, so each part is reported on its own.
  const part = async (path) => {
    try {
      return await get(path);
    } catch (e) {
      console.log(`  (${String(e.message).slice(0, 170)})`);
      return null;
    }
  };
  const sub = await part('/v1/user/subscription');
  if (sub) console.log(`plan: ${sub.tier}, used ${sub.character_count} of ${sub.character_limit} credits`);
  const models = (await part('/v1/models')) ?? [];
  console.log('\nspeech models (credits per character):');
  for (const m of models) {
    if (m.can_do_text_to_speech) console.log(`  ${m.model_id}  x${m.model_rates?.character_cost_multiplier ?? '?'}  ${m.name}`);
  }
  const { voices } = (await part('/v1/voices')) ?? { voices: [] };
  console.log(`\nvoices on the account (${voices.length}):`);
  for (const v of voices) {
    const l = v.labels ?? {};
    console.log(`  ${v.voice_id}  ${v.name}  [${[l.gender, l.age, l.accent, l.descriptive ?? l.description, l.use_case].filter(Boolean).join(', ')}]`);
  }
}

async function sample(modelId, voiceIds) {
  mkdirSync('voice-samples', { recursive: true });
  let chars = 0;
  for (const arg of voiceIds) {
    // Each voice is given as name=voice_id (the name is only used for the file names).
    const [name, id] = arg.includes('=') ? arg.split('=') : [arg, arg];
    for (const [tag, text] of SAMPLE_LINES) {
      writeFileSync(`voice-samples/${name}-${tag}.mp3`, await speak(text, id, modelId));
      chars += text.length;
    }
    console.log(`voice-samples/${name}-*.mp3`);
  }
  console.log(`${chars} characters sent`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'info') await info();
else if (cmd === 'sample') await sample(rest[0], rest.slice(1));
else if (cmd) console.log('usage: eleven.mjs info | sample <model_id> <voice_id> ...');
