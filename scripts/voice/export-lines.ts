import { mkdirSync, writeFileSync } from 'node:fs';
import { recordingScript } from '../../src/voice/lines';

// Writes the recording script as TSV, split into chunks for parallel recording.
const lines = recordingScript();
const CHUNKS = 6;
mkdirSync('scripts/voice/chunks', { recursive: true });
writeFileSync('scripts/voice/lines.tsv', lines.map(([k, t]) => `${k}\t${t}`).join('\n') + '\n');
const size = Math.ceil(lines.length / CHUNKS);
for (let i = 0; i < CHUNKS; i++) {
  const part = lines.slice(i * size, (i + 1) * size);
  writeFileSync(`scripts/voice/chunks/chunk-${i + 1}.tsv`, part.map(([k, t]) => `${k}\t${t}`).join('\n') + '\n');
}
console.log(`${lines.length} lines, ${CHUNKS} chunks of up to ${size}`);
