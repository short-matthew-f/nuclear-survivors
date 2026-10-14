import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, seededRandom } from '../src/game.js';
import {
  freshProfile,
  parseProfile,
  purchase,
  settleRun,
  exportProfile,
  importProfile,
} from '../src/profile.js';
import { FIELD_UNLOCKS, ownsReward, unlockHint } from '../src/unlocks.js';
const finished = (changes = {}) =>
  Object.assign(
    createGame(seededRandom('unlocks')),
    { state: 'dead' },
    changes,
  );

test('field feats award heroes and signature gear free, even on a defeated run', () => {
  const p = freshProfile();
  const g = finished({ rescues: 1, bossKills: 1 });
  const result = settleRun(p, g);
  assert.deepEqual(
    result.fieldUnlocks.map((c) => c.target),
    ['bastion', 'morrow'],
  );
  assert.ok(p.operators.includes('morrow'));
  assert.ok(p.abilities.includes('mend'));
  assert.equal(
    p.scrap,
    result.earned + result.unlocked.reduce((s, a) => s + a.reward, 0),
  );
  const snapshot = exportProfile(p);
  assert.equal(settleRun(p, g), null);
  assert.equal(exportProfile(p), snapshot);
});
test('single-run survival and kills use the best run, not the sum of failed attempts', () => {
  const p = freshProfile();
  settleRun(p, finished({ time: 70, kills: 60 }));
  settleRun(p, finished({ time: 80, kills: 65 }));
  assert.equal(p.unlockProgress.mine, 80);
  assert.equal(p.unlockProgress.arc, 65);
  assert.ok(!p.weapons.includes('mine'));
  assert.ok(!p.weapons.includes('arc'));
  settleRun(p, finished({ time: 120, kills: 100 }));
  assert.ok(p.weapons.includes('mine'));
  assert.ok(p.weapons.includes('arc'));
});
test('enemy hunt unlocks accumulate over operations and survive backup restoration', () => {
  let p = freshProfile();
  settleRun(
    p,
    finished({ enemyKills: { runner: 25, bomber: 12, burrower: 8 } }),
  );
  p = importProfile(exportProfile(p));
  assert.equal(p.unlockProgress.flame, 12);
  const result = settleRun(
    p,
    finished({ enemyKills: { runner: 25, bomber: 8, burrower: 12 } }),
  );
  for (const id of ['vesper', 'flame', 'freeze'])
    assert.equal(
      p.unlockProgress[id],
      FIELD_UNLOCKS.find((c) => c.id === id).goal,
    );
  assert.ok(p.weapons.includes('scatter'));
  assert.ok(p.weapons.includes('flame'));
  assert.ok(p.abilities.includes('freeze'));
  assert.ok(result.fieldUnlocks.some((c) => c.target === 'vesper'));
});
test('weapon specialization, full arsenals and evolution unlock distinct new options', () => {
  const p = freshProfile();
  const g = finished({
    weapons: {
      carbine: { level: 1 },
      pulse: { level: 3 },
      orbit: { level: 5, evolved: true },
      mine: { level: 1 },
    },
  });
  settleRun(p, g);
  for (const id of ['spark', 'rook']) assert.ok(p.operators.includes(id));
  assert.ok(p.weapons.includes('drone'));
  assert.ok(p.weapons.includes('discus'));
  assert.ok(p.abilities.includes('surge'));
  assert.ok(p.abilities.includes('turret'));
});
test('scrap can bypass any challenge and later feats never charge or duplicate purchases', () => {
  const p = freshProfile();
  p.scrap = 1000;
  assert.equal(purchase(p, 'operator', 'morrow'), true);
  const result = settleRun(p, finished({ rescues: 1 }));
  assert.ok(!result.fieldUnlocks.some((c) => c.target === 'morrow'));
  assert.equal(p.operators.filter((id) => id === 'morrow').length, 1);
  assert.equal(
    p.scrap,
    780 + result.earned + result.unlocked.reduce((s, a) => s + a.reward, 0),
  );
});
test('historical records credit old saves without wiping progress or charging scrap', () => {
  const p = parseProfile(
    JSON.stringify({
      version: 2,
      scrap: 123,
      operators: ['nomad'],
      weapons: ['carbine'],
      best: 180,
      achievements: ['boss', 'rescue', 'arsenal', 'evolution'],
      enemyKills: { runner: 50, bomber: 20, burrower: 20 },
    }),
  );
  assert.equal(p.scrap, 123);
  for (const id of ['bastion', 'morrow', 'rook', 'vesper'])
    assert.ok(p.operators.includes(id));
  for (const id of ['mine', 'discus', 'flame', 'drone', 'scatter'])
    assert.ok(p.weapons.includes(id));
  assert.equal(
    p.unlockProgress.spark,
    0,
    'unrecorded weapon ranks are not invented',
  );
  assert.ok(p.abilities.includes('freeze'));
});
test('invalid saved counters cannot break or complete progression', () => {
  const p = parseProfile(
    JSON.stringify({
      ...freshProfile(),
      unlockProgress: {
        spark: -5,
        flame: '20',
        freeze: null,
        arc: 50.9,
        mine: 999999,
        unknown: 100,
      },
    }),
  );
  assert.equal(p.unlockProgress.spark, 0);
  assert.equal(p.unlockProgress.flame, 0);
  assert.equal(p.unlockProgress.arc, 50);
  assert.equal(p.unlockProgress.mine, 120);
  assert.ok(!Object.hasOwn(p.unlockProgress, 'unknown'));
  assert.equal(p.scrap, 0);
});
test('every locked weapon and ability has a visible feat or hero route', () => {
  const p = freshProfile();
  for (const id of ['arc', 'mine', 'scatter', 'drone', 'discus', 'flame'])
    assert.ok(unlockHint(p, 'weapon', id));
  for (const id of ['mend', 'surge', 'freeze', 'turret'])
    assert.ok(unlockHint(p, 'ability', id));
  for (const c of FIELD_UNLOCKS) assert.equal(ownsReward(p, c), false);
});
