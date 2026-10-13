import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import config from '../vite.config.js';
const scope = 'https://short-matthew-f.github.io/nuclear-survivors/';
function worker() {
  let emitted;
  config.plugins[0].generateBundle.call(
    {
      emitFile: (asset) => {
        emitted = asset;
      },
    },
    {},
    {
      'index.html': { type: 'asset', source: 'game HTML' },
      'assets/game.js': { type: 'chunk', code: 'game code' },
    },
  );
  const listeners = {},
    stores = new Map([
      ['unrelated-app', new Map()],
      ['nuclear-survivors-stale', new Map()],
      [
        'nuclear-survivors-old',
        new Map([[scope + 'assets/previous.js', { body: 'previous asset' }]]),
      ],
    ]);
  let skipCount = 0;
  const caches = {
    keys: async () => [...stores.keys()],
    match: async (request, options) => {
      assert.equal(
        options?.ignoreVary,
        true,
        'public assets must ignore incidental Vary headers',
      );
      const url = typeof request === 'string' ? request : request.url;
      for (const store of stores.values())
        if (store.has(url)) return store.get(url);
    },
    delete: async (key) => stores.delete(key),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: async (urls) => {
          for (const url of urls)
            store.set(url, {
              url,
              body: url.endsWith('index.html') ? 'game HTML' : 'asset',
            });
        },
        match: async (request, options) => {
          assert.equal(
            options?.ignoreVary,
            true,
            'precache and browser requests can have different Origin headers',
          );
          return store.get(typeof request === 'string' ? request : request.url);
        },
      };
    },
  };
  const self = {
    registration: { scope },
    location: { origin: new URL(scope).origin },
    addEventListener: (name, fn) => {
      listeners[name] = fn;
    },
    clients: { claim: async () => {} },
    skipWaiting: () => {
      skipCount++;
    },
  };
  vm.runInNewContext(emitted.source, {
    self,
    caches,
    URL,
    fetch: async () => {
      throw new Error('offline');
    },
  });
  return {
    listeners,
    stores,
    skipCount: () => skipCount,
    source: emitted.source,
  };
}
test('manifest is installable with app-relative URLs and actual PNG icons', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../assets/manifest.webmanifest', import.meta.url)),
  );
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'fullscreen');
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const path = new URL(`../assets/${icon.src}`, import.meta.url);
    assert.ok(existsSync(path));
    assert.equal(readFileSync(path).subarray(1, 4).toString(), 'PNG');
  }
});
test('offline worker precaches under the GitHub Pages project scope', async () => {
  const w = worker();
  let installed;
  w.listeners.install({
    waitUntil: (p) => {
      installed = p;
    },
  });
  await installed;
  const active = [...w.stores.entries()].find(
    ([name]) =>
      name.startsWith('nuclear-survivors-') &&
      !name.endsWith('old') &&
      !name.endsWith('stale'),
  )[1];
  assert.ok(active.has(scope + 'index.html'));
  assert.ok(active.has(scope + 'assets/game.js'));
  assert.ok(active.has(scope + 'manifest.webmanifest'));
  assert.ok([...active.keys()].every((url) => url.startsWith(scope)));
  assert.equal(w.skipCount(), 0);
});
test('cached navigation and hashed assets work when the network is unavailable', async () => {
  const w = worker();
  let installed;
  w.listeners.install({
    waitUntil: (p) => {
      installed = p;
    },
  });
  await installed;
  let response;
  w.listeners.fetch({
    request: { url: scope, method: 'GET', mode: 'navigate' },
    respondWith: (p) => {
      response = p;
    },
  });
  assert.equal((await response).body, 'game HTML');
  w.listeners.fetch({
    request: { url: scope + 'assets/game.js', method: 'GET' },
    respondWith: (p) => {
      response = p;
    },
  });
  assert.equal((await response).body, 'asset');
});
test('activation cleans only game caches and updates wait for a user message', async () => {
  const w = worker();
  let installed;
  w.listeners.install({
    waitUntil: (p) => {
      installed = p;
    },
  });
  await installed;
  let activated;
  w.listeners.activate({
    waitUntil: (p) => {
      activated = p;
    },
  });
  await activated;
  assert.ok(w.stores.has('unrelated-app'));
  assert.ok(!w.stores.has('nuclear-survivors-stale'));
  assert.ok(w.stores.has('nuclear-survivors-old'));
  assert.equal(w.skipCount(), 0);
  w.listeners.message({ data: { type: 'SKIP_WAITING' } });
  assert.equal(w.skipCount(), 1);
});
test('offline worker ignores unrelated origins, scope paths, and writes', () => {
  const w = worker();
  let handled = false;
  for (const url of [
    'https://example.com/',
    'https://short-matthew-f.github.io/other/',
  ])
    w.listeners.fetch({
      request: { url, method: 'GET' },
      respondWith: () => {
        handled = true;
      },
    });
  w.listeners.fetch({
    request: { url: scope, method: 'POST' },
    respondWith: () => {
      handled = true;
    },
  });
  assert.equal(handled, false);
});
test('an older page can fetch its previous build assets during an update', async () => {
  const w = worker();
  let installed;
  w.listeners.install({
    waitUntil: (p) => {
      installed = p;
    },
  });
  await installed;
  let activated;
  w.listeners.activate({
    waitUntil: (p) => {
      activated = p;
    },
  });
  await activated;
  let response;
  w.listeners.fetch({
    request: { url: scope + 'assets/previous.js', method: 'GET' },
    respondWith: (p) => {
      response = p;
    },
  });
  assert.equal((await response).body, 'previous asset');
});
