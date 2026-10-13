import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export default defineConfig({
  base: './',
  publicDir: 'assets',
  plugins: [
    {
      name: 'offline-game',
      apply: 'build',
      generateBundle(_, bundle) {
        const files = [
          'index.html',
          'manifest.webmanifest',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable.png',
          'icons/icon.svg',
          'art/key-art.png',
          'art/characters.png',
          'art/terrain.png',
          'art/props.png',
          ...Object.keys(bundle).filter((name) => name !== 'index.html'),
        ];
        const hash = createHash('sha256');
        for (const item of Object.values(bundle))
          hash.update(item.type === 'chunk' ? item.code : item.source);
        for (const file of [
          'manifest.webmanifest',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable.png',
          'icons/icon.svg',
          'art/key-art.png',
          'art/characters.png',
          'art/terrain.png',
          'art/props.png',
        ])
          hash.update(
            readFileSync(new URL(`./assets/${file}`, import.meta.url)),
          );
        const version = hash.digest('hex').slice(0, 12);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `
const CACHE = 'nuclear-survivors-${version}';
const PREFIX = 'nuclear-survivors-';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, self.registration.scope).href))));
});
self.addEventListener('activate', event => {
  // Keep the previous build so a tab already loading its HTML can still fetch its hashed assets.
  event.waitUntil(caches.keys().then(keys => {
    const gameCaches = keys.filter(key => key.startsWith(PREFIX));
    const keep = new Set([CACHE, ...gameCaches.filter(key => key !== CACHE).slice(-1)]);
    return Promise.all(gameCaches.filter(key => !keep.has(key)).map(key => caches.delete(key)));
  }).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') return (await cache.match(new URL('index.html', self.registration.scope).href, { ignoreVary: true })) || fetch(event.request);
    // These are public versioned assets; ignore incidental Origin/encoding header differences in precache requests.
    return (await cache.match(event.request, { ignoreVary: true })) || (await caches.match(event.request, { ignoreVary: true })) || fetch(event.request);
  })());
});
`,
        });
      },
    },
  ],
});
