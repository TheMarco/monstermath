import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * The picture and text a chat app or social site shows when the game's link is shared.
 * Those sites need the full address of the picture. Set SITE_URL when building
 * (for example SITE_URL=https://example.com npm run build); on Vercel the
 * address is found without it.
 */
function shareCard(): Plugin {
  const host = process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  const site = host.replace(/\/+$/, '');
  const image = site ? `${site}/og.jpg` : 'og.jpg';
  const title = 'MonsterMath';
  const text = 'Befriend monsters and get better at math. A free game for children who are behind in math. No account, nothing collected.';
  const meta = (key: 'property' | 'name', name: string, content: string) => ({ tag: 'meta', attrs: { [key]: name, content }, injectTo: 'head' as const });
  return {
    name: 'share-card',
    transformIndexHtml: () => [
      meta('property', 'og:type', 'website'),
      meta('property', 'og:title', title),
      meta('property', 'og:description', text),
      meta('property', 'og:image', image),
      meta('property', 'og:image:width', '1200'),
      meta('property', 'og:image:height', '630'),
      meta('property', 'og:image:alt', 'The MonsterMath logo over a meadow, with six cartoon monsters.'),
      ...(site ? [meta('property', 'og:url', `${site}/`)] : []),
      meta('name', 'twitter:card', 'summary_large_image'),
      meta('name', 'twitter:title', title),
      meta('name', 'twitter:description', text),
      meta('name', 'twitter:image', image),
    ],
  };
}

export default defineConfig({
  base: './',
  plugins: [shareCard()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
