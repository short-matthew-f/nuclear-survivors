import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  seededRandom,
  chooseUpgrades,
  applyUpgrade,
  spawnEnemy,
  update,
  checkEvolutions,
} from '../src/game.js';
import {
  weaponPattern,
  upgradePreview,
  evolutionProgress,
  WEAPON_LIMIT,
} from '../src/build.js';
import { WEAPONS, EVOLUTIONS } from '../src/content.js';
import { serializeRun, restoreRun } from '../src/checkpoint.js';
const run = () => {
  const g = createGame(seededRandom('build-test'));
  g.state = 'playing';
  g.spawnClock =
    g.nextEvent =
    g.nextSupply =
    g.nextHazard =
    g.nextHorde =
      10000;
  return g;
};
const choose = (g, id) => {
  g.pendingLevels = 1;
  chooseUpgrades(g);
  assert.ok(g.choices.some((u) => u.id === id));
  assert.equal(applyUpgrade(g, id), true);
};
test('early levels always let the player specialize their starting weapon', () => {
  for (let seed = 0; seed < 50; seed++) {
    const g = createGame(seededRandom(seed));
    g.state = 'playing';
    chooseUpgrades(g);
    assert.ok(g.choices.some((u) => u.id === 'carbine'));
    assert.ok(g.choices.some((u) => WEAPONS[u.id] && !g.weapons[u.id]));
    assert.ok(g.choices.some((u) => !WEAPONS[u.id]));
    assert.equal(new Set(g.choices.map((u) => u.id)).size, 3);
  }
});
test('a newly selected weapon stays available for specialization', () => {
  const g = run();
  chooseUpgrades(g);
  const newWeapon = g.choices.find((u) => WEAPONS[u.id] && !g.weapons[u.id]);
  applyUpgrade(g, newWeapon.id);
  chooseUpgrades(g);
  assert.equal(g.focusWeapon, newWeapon.id);
  assert.ok(g.choices.some((u) => u.id === newWeapon.id));
});
test('evolution keys are offered as a deliberate build path and trigger evolution', () => {
  const g = run();
  choose(g, 'carbine');
  choose(g, 'carbine');
  chooseUpgrades(g);
  assert.ok(g.choices.some((u) => u.id === 'pierce'));
  applyUpgrade(g, 'pierce');
  choose(g, 'carbine');
  choose(g, 'carbine');
  assert.equal(g.weapons.carbine.evolved, true);
  assert.equal(evolutionProgress(g, 'carbine').keyReady, true);
  assert.ok(g.eventText.includes('RAILSTORM'));
});
test('four-weapon builds keep owned upgrades but stop offering a fifth new weapon', () => {
  const g = run();
  for (const id of ['arc', 'orbit', 'pulse'])
    g.weapons[id] = { level: 1, clock: 0, evolved: false };
  assert.equal(Object.keys(g.weapons).length, WEAPON_LIMIT);
  for (let i = 0; i < 20; i++) {
    chooseUpgrades(g);
    assert.ok(g.choices.every((u) => !WEAPONS[u.id] || g.weapons[u.id]));
    assert.equal(g.choices.length, 3);
  }
});
test('rank two changes carbine volleys, escort count and mine clusters immediately', () => {
  for (const id of ['carbine', 'drone', 'mine']) {
    const g = run();
    g.weapons = { [id]: { level: 1, clock: 0, evolved: false } };
    assert.equal(weaponPattern(g, id).count, 1);
    g.weapons[id].level = 2;
    assert.equal(weaponPattern(g, id).count, 2);
    const e = spawnEnemy(g, 'brute', 200, 0);
    e.speed = 0;
    update(g, 0.01);
    if (id === 'mine') assert.equal(g.mines.length, 2);
    else assert.equal(g.bullets.length, 2);
  }
});
test('every weapon rank has increasing potential damage output', () => {
  const g = run();
  for (const id of Object.keys(WEAPONS)) {
    let previous = 0;
    for (let rank = 1; rank <= 5; rank++) {
      const pattern = weaponPattern(g, id, rank, false);
      const output =
        (pattern.damage * pattern.count) /
        (id === 'orbit' ? 1 : pattern.interval);
      assert.ok(
        output > previous,
        `${id} rank ${rank} should deliver more output`,
      );
      previous = output;
    }
  }
});
test('weapon previews describe the actual next projectile pattern and clear evolution keys', () => {
  const g = run();
  const preview = upgradePreview(g, 'carbine');
  assert.equal(preview.title, 'Twin barrel');
  assert.ok(preview.lines.includes('rounds: 1 → 2'));
  assert.equal(preview.next, 2);
  g.weapons.carbine.level = 4;
  g.modifications.pierce = 1;
  const evolution = upgradePreview(g, 'carbine');
  assert.equal(evolution.title, 'Railstorm');
  assert.equal(evolution.evolves, true);
  g.weapons.carbine.level = 5;
  g.modifications.pierce = 0;
  assert.equal(upgradePreview(g, 'pierce').evolves, true);
});
test('weapon upgrades reset their fire clock and show their installed behavior', () => {
  const g = run();
  g.weapons.carbine.clock = 10;
  choose(g, 'carbine');
  assert.equal(g.weapons.carbine.clock, 0);
  assert.ok(g.eventText.includes('TWIN BARREL'));
  assert.ok(g.effects.some((e) => e.kind === 'ring'));
});
test('all evolved patterns stay finite and more powerful than their final standard rank', () => {
  const g = run();
  for (const id of Object.keys(WEAPONS)) {
    g.weapons[id] = { level: 5, clock: 0, evolved: false };
    g.modifications[EVOLUTIONS[id].mutation] = 1;
  }
  checkEvolutions(g);
  for (const id of Object.keys(WEAPONS)) {
    const before = weaponPattern(g, id, 5, false),
      after = weaponPattern(g, id);
    assert.ok(Object.values(after).every(Number.isFinite));
    assert.ok(
      after.count > before.count ||
        after.interval < before.interval ||
        id === 'mine',
    );
  }
});
test('build focus and older pending offers survive migration without deleting a large arsenal', () => {
  const g = run();
  g.focusWeapon = 'drone';
  for (const id of Object.keys(WEAPONS))
    g.weapons[id] = { level: 2, clock: 0, evolved: false };
  const snapshot = JSON.parse(serializeRun(g));
  assert.equal(restoreRun(JSON.stringify(snapshot)).focusWeapon, 'drone');
  delete snapshot.game.focusWeapon;
  const migrated = restoreRun(JSON.stringify(snapshot));
  assert.ok(migrated);
  assert.equal(
    Object.keys(migrated.weapons).length,
    Object.keys(WEAPONS).length,
  );
  chooseUpgrades(migrated);
  assert.equal(migrated.choices.length, 3);
});

test('twin carbine rounds stay on target and hit a distant enemy together', () => {
  const g = run();
  g.player.crit = 0;
  g.weapons.carbine.level = 2;
  const enemy = spawnEnemy(g, 'brute', 250, 0);
  enemy.speed = 0;
  enemy.hp = enemy.maxHp = 1000;
  for (let i = 0; i < 8; i++) update(g, 0.05);
  assert.equal(enemy.hp, 952);
});
test('weapon ranks never trade away firing speed for their extra projectiles', () => {
  const g = run();
  for (const id of Object.keys(WEAPONS)) {
    for (let rank = 2; rank <= 5; rank++)
      assert.ok(
        weaponPattern(g, id, rank).interval <=
          weaponPattern(g, id, rank - 1).interval,
      );
  }
});
