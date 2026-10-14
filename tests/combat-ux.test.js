import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  hurtPlayer,
  update,
  seededRandom,
  spawnEnemy,
} from '../src/game.js';
import { serializeRun, restoreRun } from '../src/checkpoint.js';
import { hitExplanation } from '../src/damage.js';
import {
  createResumeGate,
  primaryObjective,
  renderUpgradeChoices,
} from '../src/combat-ux.js';
import { beginEvent } from '../src/expedition.js';
import { UPGRADES } from '../src/content.js';
import { freshProfile } from '../src/profile.js';
import { renderResults } from '../src/presentation.js';
test('accepted hits record the actual health lost and fatal source; immunity does not overwrite it', () => {
  const g = createGame();
  g.state = 'playing';
  g.player.hp = 10;
  hurtPlayer(g, 25, { kind: 'projectile', enemy: 'spitter', x: 20, y: 0 });
  assert.equal(g.state, 'dead');
  assert.equal(g.deathReport.amount, 10);
  assert.match(hitExplanation(g.deathReport).label, /Spore carrier projectile/);
  hurtPlayer(g, 50, { kind: 'contact', enemy: 'walker' });
  assert.equal(g.deathReport.kind, 'projectile');
  const html = renderResults(
    { profile: freshProfile() },
    g,
    { earned: 0 },
    null,
  );
  assert.match(html, /FINAL HIT · 10 HP/);
  assert.match(html, /Move across the projectile path/);
});
test('revival records a hit without reporting a defeat and unknown legacy sources are never guessed', () => {
  const g = createGame(Math.random, { perk: 'phoenix' });
  g.state = 'playing';
  g.player.hp = 1;
  hurtPlayer(g, 20);
  assert.equal(g.state, 'playing');
  assert.equal(g.deathReport, null);
  assert.equal(hitExplanation(g.lastHit), null);
  const before = g.lastHit;
  hurtPlayer(g, 30, { kind: 'radiation' });
  assert.equal(g.lastHit, before);
});
test('contact and hazard collisions carry distinct sources into defeat reports', () => {
  for (const kind of ['contact', 'radiation', 'beam']) {
    const g = createGame(seededRandom('source'));
    g.state = 'playing';
    g.player.hp = 1;
    if (kind === 'contact') spawnEnemy(g, 'walker', 0, 0);
    else
      g.hazards.push({
        kind: kind === 'beam' ? 'beam' : undefined,
        x: kind === 'beam' ? -10 : 0,
        y: 0,
        angle: 0,
        length: 100,
        radius: 60,
        warn: 0,
        life: 5,
      });
    update(g, 0.01, { x: 0, y: 0 }, { width: 390, height: 844 });
    assert.equal(g.deathReport.kind, kind);
  }
});
test('hit feedback survives checkpoints and older snapshots remain valid without it', () => {
  const g = createGame();
  g.state = 'playing';
  hurtPlayer(g, 15, { kind: 'explosion', enemy: 'bomber' });
  const restored = restoreRun(serializeRun(g));
  assert.equal(restored.lastHit.kind, 'explosion');
  assert.equal(restored.state, 'paused');
  const old = JSON.parse(serializeRun(g));
  delete old.game.lastHit;
  delete old.game.deathReport;
  assert.equal(restoreRun(JSON.stringify(old)).lastHit, null);
  old.game.lastHit = { kind: 'invented', amount: 15, time: 0, x: 0, y: 0 };
  assert.equal(restoreRun(JSON.stringify(old)).lastHit, null);
});
test('resume orientation freezes the simulation, supports cancellation, and completes once', () => {
  const g = createGame();
  g.state = 'paused';
  const gate = createResumeGate();
  gate.start();
  for (let i = 0; i < 10; i++) {
    gate.advance(0.1);
    update(g, 0.1, { x: 1, y: 0 }, { width: 390, height: 844 });
  }
  assert.equal(g.time, 0);
  assert.equal(g.player.x, 0);
  assert.equal(gate.seconds, 2);
  gate.cancel();
  assert.equal(gate.active, false);
  assert.equal(gate.advance(1), false);
  gate.start();
  let completions = 0;
  for (let i = 0; i < 40; i++) if (gate.advance(0.1)) completions++;
  assert.equal(completions, 1);
  assert.equal(gate.active, false);
});
test('one objective prioritizes required story events, then extraction, over optional threats', () => {
  const g = createGame(Math.random, { chapter: 'signal' });
  g.state = 'playing';
  beginEvent(g, 'rescue');
  const boss = spawnEnemy(g, 'boss', 100, 100);
  assert.equal(primaryObjective(g).kind, 'event');
  g.chapter = null;
  assert.equal(primaryObjective(g).kind, 'boss');
  g.extraction = { x: 0, y: 0, radius: 100 };
  g.extractProgress = 4;
  assert.equal(primaryObjective(g).kind, 'extract');
  assert.equal(primaryObjective(g).progress, 0.5);
  g.extraction = null;
  boss.hp = 0;
  assert.equal(primaryObjective(g).kind, 'event');
  g.fieldEvent = null;
  assert.equal(primaryObjective(g), null);
});
test('compact upgrades preserve every offered choice and exact effects without applying a choice during inspection', () => {
  const g = createGame();
  g.choices = ['carbine', 'damage', 'orbit'].map((id) =>
    UPGRADES.find((u) => u.id === id),
  );
  const before = JSON.stringify(g.weapons),
    html = renderUpgradeChoices(g);
  assert.equal((html.match(/data-action="upgrade"/g) || []).length, 3);
  assert.ok(html.includes('damage / hit'));
  assert.ok(html.includes('Evolution path'));
  assert.ok(!html.includes('MAKE IT'));
  assert.equal(JSON.stringify(g.weapons), before);
});

test('enemy projectiles and bomber detonations preserve their source through collision', () => {
  const shot = createGame();
  shot.state = 'playing';
  shot.player.hp = 1;
  shot.hostile.push({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 1,
    radius: 5,
    source: { enemy: 'spitter' },
  });
  update(shot, 0.01, { x: 0, y: 0 }, { width: 390, height: 844 });
  assert.equal(shot.deathReport.kind, 'projectile');
  assert.equal(shot.deathReport.enemy, 'spitter');
  const blast = createGame();
  blast.state = 'playing';
  blast.player.hp = 1;
  const e = spawnEnemy(blast, 'bomber', 0, 0);
  e.detonate = 0.001;
  update(blast, 0.01, { x: 0, y: 0 }, { width: 390, height: 844 });
  assert.equal(blast.deathReport.kind, 'explosion');
  assert.equal(blast.deathReport.enemy, 'bomber');
});

test('boss blast and beam previews use the same geometry as the actual strike', async () => {
  const { prepareBoss, updateBoss, bossWarningAreas } =
    await import('../src/bosses.js');
  for (const kind of ['slam', 'bloom', 'beams', 'meltdown']) {
    const g = createGame();
    g.state = 'playing';
    const e = spawnEnemy(g, 'boss', 100, 100);
    prepareBoss(e);
    const t = { kind, tx: 220, ty: 180, angle: 0.7, warn: 0.001 };
    e.telegraph = t;
    const preview = bossWarningAreas(e, t);
    updateBoss(g, e, 0.01);
    assert.equal(g.hazards.length, preview.length);
    for (let i = 0; i < preview.length; i++)
      for (const [key, value] of Object.entries(preview[i]))
        assert.equal(g.hazards[i][key], value);
  }
});
