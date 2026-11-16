import { describe, expect, it } from 'vitest';

// Every source file and the page itself, as text.
const sources = import.meta.glob(['../src/**/*.ts', '../src/**/*.css', '../index.html'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** The only outside addresses the game may name: the two links in the credits. */
const ALLOWED = ['https://ai-created.com/', 'https://ko-fi.com/aianddesign'];

describe('the game collects nothing', () => {
  it('names no outside address except the two credit links', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(30);
    const found: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      for (const url of text.match(/https?:\/\/[^\s'"`)<>]+/g) ?? []) {
        // The address in an SVG picture's header is a label, not a place the game calls.
        if (url.startsWith('http://www.w3.org/')) continue;
        if (!ALLOWED.includes(url)) found.push(`${file}: ${url}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('has no way to send data away or to set cookies', () => {
    const banned = /sendBeacon|XMLHttpRequest|WebSocket|EventSource|document\.cookie|gtag\(|\.postMessage\(/;
    const found = Object.entries(sources).filter(([, text]) => banned.test(text)).map(([file]) => file);
    expect(found).toEqual([]);
  });

  it('only fetches its own files', () => {
    const calls = Object.values(sources).flatMap((text) => text.match(/fetch\([^)]*\)/g) ?? []);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toMatch(/BASE_URL|base\(\)/);
  });
});
