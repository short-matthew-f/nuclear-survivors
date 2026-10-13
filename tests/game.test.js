import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  update,
  hurtPlayer,
  collectXp,
  applyUpgrade,
  formatTime,
  DURATION,
} from '../src/game.js';
const running = () => {
  const g = createGame(() => 0.5);
  g.state = 'playing';
  g.spawnClock = 100;
  return g;
};
test('diagonal movement has the same speed as cardinal movement', () => {
  const a = running(),
    b = running();
  update(a, 0.05, { x: 1, y: 0 });
  update(b, 0.05, { x: 1, y: 1 });
  assert.equal(a.player.x, 9);
  assert.ok(Math.abs(Math.hypot(b.player.x, b.player.y) - 9) < 0.0001);
});
test('damage gives temporary invulnerability and zero health ends the run', () => {
  const g = running();
  hurtPlayer(g, 25);
  hurtPlayer(g, 25);
  assert.equal(g.player.hp, 75);
  g.player.invulnerable = 0;
  hurtPlayer(g, 100);
  assert.equal(g.player.hp, 0);
  assert.equal(g.state, 'dead');
});
test('collecting cores pauses for an upgrade and handles multiple earned levels', () => {
  const g = running();
  collectXp(g, 19);
  assert.equal(g.level, 3);
  assert.equal(g.pendingLevels, 2);
  assert.equal(g.xp, 1);
  assert.equal(g.state, 'upgrade');
  assert.equal(new Set(g.choices.map((u) => u.id)).size, 3);
  applyUpgrade(g, g.choices[0].id);
  assert.equal(g.state, 'upgrade');
  assert.equal(g.pendingLevels, 1);
  applyUpgrade(g, g.choices[0].id);
  assert.equal(g.state, 'playing');
  assert.equal(g.pendingLevels, 0);
});
test('invalid upgrades cannot modify the player', () => {
  const g = running();
  assert.equal(applyUpgrade(g, 'damage'), false);
  assert.equal(g.player.damage, 24);
});
test('regeneration increases maximum health and caps healing', () => {
  const g = running();
  g.state = 'upgrade';
  g.choices = [{ id: 'heal' }];
  g.pendingLevels = 1;
  applyUpgrade(g, 'heal');
  assert.equal(g.player.maxHp, 120);
  assert.equal(g.player.hp, 120);
});
test('automatic fire damages enemies and creates collectible cores on kills', () => {
  const g = running();
  g.enemies.push({
    id: 1,
    x: 25,
    y: 0,
    hp: 10,
    maxHp: 10,
    radius: 12,
    speed: 0,
    hit: 0,
    brute: false,
  });
  update(g, 0.03);
  assert.equal(g.kills, 1);
  assert.equal(g.enemies.length, 0);
  assert.ok(g.cores.length || g.xp);
});
test('paused and upgrade states freeze the simulation', () => {
  for (const state of ['paused', 'upgrade', 'ready', 'dead', 'won']) {
    const g = running();
    g.state = state;
    update(g, 1, { x: 1, y: 0 });
    assert.equal(g.time, 0);
    assert.equal(g.player.x, 0);
  }
});
test('extraction opens after eight minutes and requires holding the beacon', () => {
  const g = running();
  g.bossIndex = 3;
  g.time = DURATION - 0.01;
  update(g, 0.02);
  assert.equal(g.state, 'playing');
  assert.ok(g.extraction);
  g.player.x = g.extraction.x;
  g.player.y = g.extraction.y;
  for (let i = 0; i < 161; i++) update(g, 0.05);
  assert.equal(g.state, 'won');
});
test('long frames are clamped to avoid simulation jumps', () => {
  const g = running();
  update(g, 10, { x: 1, y: 0 });
  assert.equal(g.time, 0.05);
  assert.equal(g.player.x, 9);
});
test('formats timers consistently', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(299.9), '04:59');
  assert.equal(formatTime(300), '05:00');
});
