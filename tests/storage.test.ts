import { describe, expect, it } from 'vitest';
import { forgetfulBrowser } from '../src/ui/storage';

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/';

describe('browsers that erase saved progress', () => {
  it('warns in Safari on a Mac', () => {
    expect(forgetfulBrowser({ userAgent: `${MAC}605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15`, platform: 'MacIntel', maxTouchPoints: 0 }, false)).toBe(true);
  });

  it('does not warn in Chrome, Edge or Firefox on a computer', () => {
    expect(forgetfulBrowser({ userAgent: `${MAC}537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36`, platform: 'MacIntel', maxTouchPoints: 0 }, false)).toBe(false);
    expect(forgetfulBrowser({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', platform: 'Win32' }, false)).toBe(false);
    expect(forgetfulBrowser({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0', platform: 'MacIntel', maxTouchPoints: 0 }, false)).toBe(false);
    expect(forgetfulBrowser({ userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' }, false)).toBe(false);
  });

  it('warns in every browser on an iPhone or iPad, which all use the engine of Safari', () => {
    expect(forgetfulBrowser({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1' }, false)).toBe(true);
    expect(forgetfulBrowser({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15' }, false)).toBe(true);
    // An iPad that says it is a Mac.
    expect(forgetfulBrowser({ userAgent: `${MAC}605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15`, platform: 'MacIntel', maxTouchPoints: 5 }, false)).toBe(true);
  });

  it('does not warn when the game was added to the Home Screen', () => {
    const ipad = 'Mozilla/5.0 (iPad; CPU OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1';
    expect(forgetfulBrowser({ userAgent: ipad, standalone: true }, false)).toBe(false);
    expect(forgetfulBrowser({ userAgent: ipad }, true)).toBe(false);
  });
});
