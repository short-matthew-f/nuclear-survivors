import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  seededRandom,
  update,
  spawnEnemy,
  hitEnemy,
  chooseUpgrades,
  activateNova,
} from '../src/game.js';
import {
  freshProfile,
  parseProfile,
  purchase,
  equipLoadout,
  loadoutFor,
  exportProfile,
  importProfile,
} from '../src/profile.js';
import {
  abilityFor,
  activateAbility,
  updateAbilities,
} from '../src/abilities.js';
import { enemyTypeFor, updateEnemyBehavior } from '../src/enemy-behavior.js';
import { weaponPattern, upgradePreview } from '../src/build.js';
import { serializeRun, restoreRun } from '../src/checkpoint.js';
import {
  WEAPONS,
  OPERATORS,
  ABILITIES,
  FREE_WEAPONS,
  LEGACY_WEAPONS,
} from '../src/content.js';
const run = (options) => {
  const g = createGame(seededRandom('roster'), options);
  g.state = 'playing';
  g.spawnClock =
    g.nextEvent =
    g.nextSupply =
    g.nextHazard =
    g.nextHorde =
      10000;
  g.player.crit = 0;
  return g;
};
test('fresh bunkers have three free weapon families and one ability', () => {
  const p = freshProfile();
  assert.deepEqual(p.weapons, FREE_WEAPONS);
  assert.deepEqual(p.abilities, ['shockwave']);
  assert.ok(!p.weapons.includes('flame'));
  assert.ok(!p.operators.includes('rook'));
});
test('legacy v2 saves keep every old weapon and receive recruited heroes signature abilities', () => {
  const p = parseProfile(
    JSON.stringify({
      version: 2,
      scrap: 543,
      operators: ['nomad', 'spark', 'bastion'],
      research: { power: 3 },
    }),
  );
  assert.equal(p.scrap, 543);
  assert.equal(p.research.power, 3);
  for (const id of LEGACY_WEAPONS) assert.ok(p.weapons.includes(id));
  assert.ok(p.abilities.includes('surge'));
  assert.ok(!p.weapons.includes('discus'));
});
test('new saved profiles do not gain locked blueprints by reloading', () => {
  const p = parseProfile(JSON.stringify(freshProfile()));
  assert.deepEqual(p.weapons, FREE_WEAPONS);
  assert.ok(!p.weapons.includes('drone'));
  assert.ok(!p.abilities.includes('turret'));
});
test('hero recruitment includes its signature weapon and ability exactly once', () => {
  const p = freshProfile();
  p.scrap = 1000;
  assert.equal(purchase(p, 'operator', 'rook'), true);
  assert.equal(p.scrap, 680);
  assert.ok(p.weapons.includes('drone'));
  assert.ok(p.abilities.includes('turret'));
  assert.equal(purchase(p, 'operator', 'rook'), false);
  assert.equal(p.scrap, 680);
  assert.equal(p.operators.filter((id) => id === 'rook').length, 1);
});
test('weapon and ability purchases are permanent, atomic, and cannot double-charge', () => {
  const p = freshProfile();
  p.scrap = 239;
  assert.equal(purchase(p, 'weapon', 'discus'), false);
  assert.equal(p.scrap, 239);
  p.scrap = 600;
  assert.equal(purchase(p, 'weapon', 'discus'), true);
  assert.equal(p.scrap, 360);
  assert.equal(purchase(p, 'weapon', 'discus'), false);
  assert.equal(p.scrap, 360);
  assert.equal(purchase(p, 'ability', 'freeze'), true);
  assert.equal(p.scrap, 160);
  assert.equal(purchase(p, 'ability', 'freeze'), false);
  assert.equal(p.scrap, 160);
  assert.equal(purchase(p, 'ability', 'unknown'), false);
});
test('loadouts are per hero, require ownership, and survive backups', () => {
  const p = freshProfile();
  p.scrap = 1000;
  purchase(p, 'operator', 'vesper');
  purchase(p, 'weapon', 'flame');
  assert.equal(equipLoadout(p, 'nomad', 'weapon', 'flame'), true);
  assert.equal(equipLoadout(p, 'nomad', 'ability', 'freeze'), true);
  assert.equal(equipLoadout(p, 'nomad', 'ability', 'turret'), false);
  assert.equal(equipLoadout(p, 'rook', 'weapon', 'carbine'), false);
  assert.equal(loadoutFor(p, 'vesper').weapon, 'scatter');
  const saved = importProfile(exportProfile(p));
  assert.equal(loadoutFor(saved, 'nomad').weapon, 'flame');
  assert.equal(loadoutFor(saved, 'nomad').ability, 'freeze');
});
test('invalid loadout imports fall back to owned signature gear', () => {
  const p = freshProfile();
  p.loadouts = { nomad: { weapon: 'flame', ability: 'turret' } };
  const saved = parseProfile(JSON.stringify(p));
  assert.deepEqual(loadoutFor(saved, 'nomad'), {
    weapon: 'carbine',
    ability: 'shockwave',
  });
});
test('only unlocked blueprints enter a run upgrade pool', () => {
  const g = run({ allowedWeapons: FREE_WEAPONS });
  for (let i = 0; i < 40; i++) {
    chooseUpgrades(g);
    assert.ok(
      g.choices.every((u) => !WEAPONS[u.id] || FREE_WEAPONS.includes(u.id)),
    );
  }
  const purchased = run({
    weapon: 'flame',
    allowedWeapons: [...FREE_WEAPONS, 'flame'],
  });
  chooseUpgrades(purchased);
  assert.ok(purchased.choices.some((u) => u.id === 'flame'));
});
test('hero passives and default abilities create distinct starts', () => {
  const medic = run({ operator: 'morrow' }),
    engineer = run({ operator: 'rook' }),
    scout = run({ operator: 'vesper' });
  assert.equal(medic.ability, 'mend');
  assert.equal(medic.player.regen, 0.5);
  assert.equal(engineer.ability, 'turret');
  assert.equal(weaponPattern(engineer, 'drone').count, 2);
  assert.equal(scout.ability, 'freeze');
  assert.equal(scout.player.dashCooldown, 4);
  assert.equal(
    createGame(Math.random, { operator: 'vesper' }).player.crit,
    0.15,
  );
  assert.equal(run({ operator: 'spark' }).ability, 'surge');
});
test('all six heroes can equip all five abilities without invalid state', () => {
  for (const hero of OPERATORS)
    for (const ability of ABILITIES) {
      const g = run({ operator: hero.id, ability: ability.id });
      assert.equal(abilityFor(g).id, ability.id);
      assert.equal(activateAbility(g), true);
      update(g, 0.05);
      assert.ok(Number.isFinite(g.player.hp));
      assert.equal(g.state, 'playing');
    }
});
test('field mend heals, caps health, grants protection, and obeys cooldown', () => {
  const g = run({ ability: 'mend' });
  g.player.hp = 30;
  assert.equal(activateNova(g), true);
  assert.equal(g.player.hp, 65);
  assert.equal(g.player.invulnerable, 2);
  assert.equal(activateAbility(g), false);
  g.player.novaTimer = 0;
  g.player.hp = 90;
  activateAbility(g);
  assert.equal(g.player.hp, 100);
});
test('overclock increases movement and firing speed only while active', () => {
  const g = run({ ability: 'surge' }),
    baseline = weaponPattern(g, 'carbine').interval;
  activateAbility(g);
  assert.ok(weaponPattern(g, 'carbine').interval < baseline);
  update(g, 0.05, { x: 1, y: 0 });
  assert.equal(g.player.x, 11.25);
  updateAbilities(g, 8);
  assert.equal(g.buffs.surge, 0);
  assert.equal(weaponPattern(g, 'carbine').interval, baseline);
});
test('cryo stops nearby infected, has reduced titan duration and clears nearby shots', () => {
  const g = run({ ability: 'freeze' }),
    enemy = spawnEnemy(g, 'walker', 80, 0),
    boss = spawnEnemy(g, 'boss', 180, 0);
  g.hostile = [
    { x: 10, y: 0 },
    { x: 500, y: 0 },
  ];
  activateAbility(g);
  assert.equal(enemy.frozen, 4);
  assert.equal(boss.frozen, 2);
  assert.equal(g.hostile.length, 1);
  const x = enemy.x;
  update(g, 0.05);
  assert.equal(enemy.x, x);
});
test('sentries acquire a target, fire and expire without growing the actor list', () => {
  const g = run({ ability: 'turret' }),
    enemy = spawnEnemy(g, 'brute', 180, 0);
  enemy.speed = 0;
  enemy.hp = enemy.maxHp = 10000;
  activateAbility(g);
  assert.equal(g.turrets.length, 1);
  for (let i = 0; i < 30; i++) update(g, 0.05);
  assert.ok(enemy.hp < enemy.maxHp);
  assert.ok(g.shotsFired > 0);
  updateAbilities(g, 13);
  assert.equal(g.turrets.length, 0);
});
test('new research improves cooldown, movement, experience and rerolls', () => {
  const g = run({
    research: { cooling: 4, mobility: 5, training: 3, logistics: 3 },
  });
  assert.equal(g.player.novaCooldown, 14.4);
  assert.equal(g.player.speed, 210);
  assert.equal(g.player.xpBonus, 1.3);
  assert.equal(g.rerolls, 5);
});
test('riot shields resist frontal basic rounds but allow flanks and penetration', () => {
  const g = run(),
    enemy = spawnEnemy(g, 'shield', 100, 0);
  enemy.hp = enemy.maxHp = 1000;
  hitEnemy(g, enemy, 100, { x: 0, y: 0 }, 'ballistic');
  assert.equal(enemy.hp, 970);
  hitEnemy(g, enemy, 100, { x: 200, y: 0 }, 'ballistic');
  assert.equal(enemy.hp, 870);
  hitEnemy(g, enemy, 100, { x: 0, y: 0 }, 'piercing');
  assert.equal(enemy.hp, 770);
  hitEnemy(g, enemy, 100);
  assert.equal(enemy.hp, 670);
});
test('bombers warn before detonation and can be killed to trigger friendly chain damage', () => {
  const g = run(),
    bomber = spawnEnemy(g, 'bomber', 50, 0);
  updateEnemyBehavior(g, bomber, 0.05);
  assert.equal(bomber.detonate, 0.9);
  assert.equal(g.player.hp, 100);
  updateEnemyBehavior(g, bomber, 0.9);
  assert.equal(g.player.hp, 72);
  assert.equal(bomber.hp, 0);
  assert.equal(g.kills, 0);
  const other = run(),
    bomb = spawnEnemy(other, 'bomber', 100, 0),
    ally = spawnEnemy(other, 'brute', 130, 0);
  const hp = ally.hp;
  hitEnemy(other, bomb, 1000);
  assert.equal(other.kills, 1);
  assert.equal(ally.hp, hp - 40);
});
test('burrowers expose a warning before emerging and cannot be shot underground', () => {
  const g = run(),
    e = spawnEnemy(g, 'burrower', 300, 0);
  e.attack = 0;
  assert.equal(updateEnemyBehavior(g, e, 0.05), true);
  assert.equal(e.burrowLeft, 1.6);
  const hp = e.hp;
  hitEnemy(g, e, 1000);
  assert.equal(e.hp, hp);
  updateEnemyBehavior(g, e, 1.6);
  assert.equal(e.burrowLeft, 0);
  hitEnemy(g, e, 20);
  assert.equal(e.hp, hp - 20);
});
test('healers restore nearby living infected without reviving corpses or healing titans', () => {
  const g = run(),
    healer = spawnEnemy(g, 'healer', 100, 0),
    ally = spawnEnemy(g, 'brute', 110, 0),
    dead = spawnEnemy(g, 'walker', 100, 0),
    boss = spawnEnemy(g, 'boss', 100, 0);
  healer.attack = 0;
  ally.hp = 10;
  dead.hp = 0;
  boss.hp = 10;
  updateEnemyBehavior(g, healer, 0.05);
  assert.ok(ally.hp > 10);
  assert.equal(dead.hp, 0);
  assert.equal(boss.hp, 10);
});
test('enemy director introduces every new behavior after its milestone', () => {
  const g = run();
  for (const r of [0.03, 0.2, 0.35, 0.48])
    assert.equal(enemyTypeFor(g, r), 'walker');
  g.time = 180;
  assert.equal(enemyTypeFor(g, 0.03), 'shield');
  assert.equal(enemyTypeFor(g, 0.2), 'bomber');
  assert.equal(enemyTypeFor(g, 0.35), 'burrower');
  assert.equal(enemyTypeFor(g, 0.48), 'healer');
});
test('returning blades strike once outbound and again on the way home', () => {
  const g = run({ weapon: 'discus' }),
    e = spawnEnemy(g, 'brute', 100, 0);
  e.speed = 0;
  e.hp = e.maxHp = 1000;
  for (let i = 0; i < 20; i++) update(g, 0.05);
  assert.equal(e.hp, 940);
  assert.ok(g.bullets.some((b) => b.kind === 'discus' && b.returning));
});
test('flame cones hit only their facing arc and leave burning damage', () => {
  const g = run({ weapon: 'flame' }),
    near = spawnEnemy(g, 'brute', 70, 0),
    behind = spawnEnemy(g, 'brute', -90, 0);
  near.speed = behind.speed = 0;
  near.hp = near.maxHp = behind.hp = behind.maxHp = 1000;
  update(g, 0.05);
  assert.ok(near.hp < 1000);
  assert.equal(behind.hp, 1000);
  assert.ok(near.burnLeft > 0);
  g.weapons.flame.clock = 100;
  const hp = near.hp;
  update(g, 0.05);
  assert.ok(near.hp < hp);
  assert.ok(
    upgradePreview(g, 'flame').lines.some((l) => l.startsWith('radius:')),
  );
});
test('new abilities, turrets, weapon unlock pools and enemy statuses survive checkpoints', () => {
  const g = run({
    operator: 'rook',
    ability: 'turret',
    allowedWeapons: ['drone', 'discus'],
  });
  activateAbility(g);
  const e = spawnEnemy(g, 'burrower', 300, 0);
  e.burrowLeft = 1;
  e.frozen = 2;
  const restored = restoreRun(serializeRun(g));
  assert.ok(restored);
  assert.equal(restored.ability, 'turret');
  assert.equal(restored.turrets.length, 1);
  assert.deepEqual(restored.allowedWeapons, ['drone', 'discus']);
  assert.equal(restored.enemies[0].frozen, 2);
});
test('older operations retain shockwave and their old weapon pool after migration', () => {
  const g = run({ operator: 'spark' }),
    data = JSON.parse(serializeRun(g));
  delete data.game.ability;
  delete data.game.allowedWeapons;
  delete data.game.turrets;
  delete data.game.buffs.surge;
  const restored = restoreRun(JSON.stringify(data));
  assert.ok(restored);
  assert.equal(restored.ability, 'shockwave');
  assert.ok(LEGACY_WEAPONS.every((id) => restored.allowedWeapons.includes(id)));
  assert.ok(!restored.allowedWeapons.includes('flame'));
});

test('Critical mass previews the equipped ability rather than always promising Shockwave damage', () => {
  for (const [id, label] of [
    ['mend', 'Field mend healing'],
    ['surge', 'Overclock duration'],
    ['freeze', 'Cryo duration'],
    ['turret', 'Sentry damage / shot'],
  ]) {
    const g = run({ ability: id }),
      preview = upgradePreview(g, 'nova');
    assert.ok(preview.lines[0].startsWith(label));
    assert.ok(preview.lines.some((l) => l.startsWith('ability cooldown:')));
  }
});
test('cryo does not freeze hidden burrowers or prolong their warning indefinitely', () => {
  const g = run({ ability: 'freeze' }),
    e = spawnEnemy(g, 'burrower', 95, 0);
  e.burrowLeft = 1.6;
  activateAbility(g);
  assert.equal(e.frozen, 0);
  updateEnemyBehavior(g, e, 1.6);
  assert.equal(e.burrowLeft, 0);
});
