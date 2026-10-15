import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, hurtPlayer } from '../src/game.js';
import { beginEvent } from '../src/expedition.js';
import { hudState, compactObjective } from '../src/hud.js';
import {
  freshProfile,
  parseProfile,
  exportProfile,
  importProfile,
} from '../src/profile.js';
test('quiet story HUD has one extraction clock and a single objective with no empty bar', () => {
  const g = createGame(Math.random, { chapter: 'signal' });
  g.time = 5;
  const state = hudState(g, { movementLearned: true });
  assert.equal(state.timer, 'Extract 7:55');
  assert.equal(state.healthNumbers, false);
  assert.equal(state.movementHint, false);
  assert.equal(state.objective.title, 'Rescue survivors · 0/1');
  assert.equal(state.objective.expanded, false);
  assert.equal(state.objective.detail, '');
});
test('health numbers appear after a hit then fade unless health is critical', () => {
  const g = createGame();
  g.state = 'playing';
  hurtPlayer(g, 10, { kind: 'contact', enemy: 'walker' });
  assert.equal(hudState(g).healthNumbers, true);
  g.time = 4;
  assert.equal(hudState(g).healthNumbers, false);
  g.player.hp = 20;
  assert.equal(hudState(g).healthNumbers, true);
});
test('distant events stay compact and nearby objectives expose instructions and progress', () => {
  const g = createGame();
  beginEvent(g, 'rescue');
  assert.equal(hudState(g).announcement, '');
  assert.equal(compactObjective(g).expanded, false);
  assert.equal(compactObjective(g).detail, '');
  g.player.x = g.fieldEvent.x;
  g.player.y = g.fieldEvent.y;
  assert.equal(compactObjective(g).expanded, true);
  assert.match(compactObjective(g).detail, /Hold inside/);
  g.extraction = { x: g.player.x, y: g.player.y, radius: 100 };
  g.extractProgress = 4;
  assert.equal(compactObjective(g).title, 'Extracting · 50%');
  assert.equal(compactObjective(g).progress, 0.5);
});
test('endless and blocked extraction timers are truthful without a duplicate clock', () => {
  const g = createGame(Math.random, { mode: 'endless' });
  g.time = 65;
  assert.equal(hudState(g).timer, 'Survived 1:05');
  const story = createGame(Math.random, { chapter: 'signal' });
  story.time = 500;
  assert.equal(hudState(story).timer, 'Extract locked');
  story.extraction = { x: 0, y: 0, radius: 100 };
  assert.equal(hudState(story).timer, 'Extract open');
});
test('movement onboarding survives saves and older experienced profiles skip the hint', () => {
  const p = freshProfile();
  assert.equal(p.onboarding.movement, false);
  p.onboarding.movement = true;
  assert.equal(importProfile(exportProfile(p)).onboarding.movement, true);
  const old = parseProfile(JSON.stringify({ version: 2, runs: 3, scrap: 222 }));
  assert.equal(old.onboarding.movement, true);
  assert.equal(old.scrap, 222);
  for (const onboarding of [null, [], { movement: 'bad' }]) {
    const restored = parseProfile(
      JSON.stringify({ version: 2, runs: 0, scrap: 333, onboarding }),
    );
    assert.equal(restored.onboarding.movement, false);
    assert.equal(restored.scrap, 333);
  }
  const g = createGame();
  assert.equal(hudState(g, { movementLearned: false }).movementHint, true);
  g.distance = 24;
  assert.equal(hudState(g, { movementLearned: false }).movementHint, true);
  assert.equal(hudState(g, { movementLearned: true }).movementHint, false);
});
