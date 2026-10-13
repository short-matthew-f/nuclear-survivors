import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, seededRandom, update, collectXp } from '../src/game.js';
import { serializeRun, restoreRun } from '../src/checkpoint.js';
test('active runs restore paused with projectile hit sets and random state intact', () => {
  const g = createGame(seededRandom('checkpoint'));
  g.state = 'playing';
  for (let i = 0; i < 200; i++) update(g, 0.05, { x: 1, y: 0 });
  g.bullets.push({
    x: 0,
    y: 0,
    vx: 10,
    vy: 0,
    life: 1,
    damage: 20,
    pierce: 1,
    hits: new Set([12]),
    color: '#fff',
  });
  const raw = serializeRun(g),
    restored = restoreRun(raw);
  assert.ok(restored);
  assert.equal(restored.state, 'paused');
  assert.equal(restored.time, g.time);
  assert.equal(restored.player.x, g.player.x);
  assert.ok(restored.bullets.at(-1).hits.has(12));
  assert.equal(restored.random(), g.random());
});
test('pending upgrade offers survive closing and reopening', () => {
  const g = createGame(seededRandom('level'));
  g.state = 'playing';
  collectXp(g, 8);
  const restored = restoreRun(serializeRun(g));
  assert.equal(restored.state, 'upgrade');
  assert.deepEqual(restored.choices, g.choices);
  assert.equal(restored.pendingLevels, 1);
});
test('corrupt and incompatible checkpoints are ignored', () => {
  assert.equal(restoreRun('bad'), null);
  assert.equal(restoreRun('{"version":999}'), null);
  const g = createGame();
  g.state = 'playing';
  g.player.hp = -1;
  assert.equal(restoreRun(serializeRun(g)), null);
  assert.equal(serializeRun(createGame()), null);
});
