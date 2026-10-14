import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  update,
  activateDash,
  activateNova,
  spawnEnemy,
  hitEnemy,
  collectXp,
  applyUpgrade,
  checkEvolutions,
  chooseUpgrades,
  reroll,
  seededRandom,
} from '../src/game.js';
import { UPGRADES, ENEMIES, OPERATORS, ZONES } from '../src/content.js';
import {
  freshProfile,
  parseProfile,
  purchase,
  settleRun,
} from '../src/profile.js';
const running = (options = {}) => {
  const g = createGame(seededRandom('tests'), options);
  g.state = 'playing';
  g.spawnClock = 10000;
  g.nextSupply = 10000;
  g.nextHorde = 10000;
  g.nextHazard = 10000;
  return g;
};
test('touch input supports analog speed with a dead-zone handled by the UI', () => {
  const g = running();
  update(g, 0.05, { x: 0.5, y: 0 });
  assert.equal(g.player.x, 4.5);
});
test('dash grants invulnerability, moves quickly, and cannot be spammed', () => {
  const g = running();
  assert.equal(activateDash(g, { x: 1, y: 0 }), true);
  assert.equal(activateDash(g), false);
  update(g, 0.05);
  assert.equal(g.player.x, 37.5);
  assert.ok(g.player.invulnerable > 0);
  for (let i = 0; i < 101; i++) update(g, 0.05);
  assert.equal(activateDash(g), true);
});
test('shockwave hits nearby enemies, clears nearby hostile shots, and has a cooldown', () => {
  const g = running();
  const near = spawnEnemy(g, 'walker', 50, 0),
    far = spawnEnemy(g, 'brute', 400, 0);
  g.hostile = [
    { x: 20, y: 0 },
    { x: 500, y: 0 },
  ];
  activateNova(g);
  assert.ok(near.hp <= 0);
  assert.equal(far.hp, far.maxHp);
  assert.equal(g.hostile.length, 1);
  assert.equal(activateNova(g), false);
});
test('bosses arrive at distinct milestone times and death drops a relic', () => {
  const g = running();
  g.time = 89.99;
  update(g, 0.02);
  const boss = g.enemies.find((e) => e.type === 'boss');
  assert.ok(boss);
  assert.equal(boss.name, 'The Groundskeeper');
  hitEnemy(g, boss, 100000);
  assert.equal(g.bossKills, 1);
  assert.ok(g.supplies.some((s) => s.kind === 'relic'));
  g.time = 210;
  update(g, 0.01);
  assert.equal(g.bossIndex, 2);
  assert.ok(g.enemies.some((e) => e.name === 'Mother of Spores'));
});
test('endless titans telegraph valid charges beyond the third boss', () => {
  const g = running({ mode: 'endless' });
  g.time = 480;
  g.bossIndex = 3;
  update(g, 0.01);
  const boss = g.enemies.find((e) => e.type === 'boss');
  assert.ok(boss);
  boss.attack = 0;
  update(g, 0.01);
  assert.equal(boss.telegraph.kind, 'charge');
  for (let i = 0; i < 23; i++) update(g, 0.05);
  assert.ok(boss.charge > 0);
  assert.ok(Number.isFinite(boss.vx));
  assert.equal(g.extraction, null);
});
test('splitters produce three smaller runners exactly once', () => {
  const g = running();
  const e = spawnEnemy(g, 'splitter', 200, 0);
  hitEnemy(g, e, 9999);
  hitEnemy(g, e, 9999);
  assert.equal(g.enemies.filter((e) => e.type === 'runner').length, 3);
  assert.equal(g.kills, 1);
});
test('spitters fire hostile projectiles and radiation telegraphs are harmless before activation', () => {
  const g = running();
  const e = spawnEnemy(g, 'spitter', 180, 0);
  e.attack = 0;
  g.hazards = [{ x: 0, y: 0, radius: 100, warn: 1, life: 5 }];
  update(g, 0.05);
  assert.equal(g.hostile.length, 1);
  assert.equal(g.player.hp, g.player.maxHp);
  g.hazards[0].warn = 0;
  update(g, 0.05);
  assert.ok(g.player.hp < g.player.maxHp);
});
test('all five weapons operate and full-level weapons evolve only with their paired mutation', () => {
  for (const id of ['carbine', 'arc', 'orbit', 'pulse', 'mine']) {
    const g = running();
    g.weapons = { [id]: { level: 5, clock: 0, evolved: false } };
    const e = spawnEnemy(g, 'brute', id === 'orbit' ? 65 : 40, 0);
    e.speed = 0;
    for (let i = 0; i < 30; i++) update(g, 0.05);
    assert.ok(
      g.damageDealt > 0 || g.mines.length > 0,
      `${id} must have an effect`,
    );
    checkEvolutions(g);
    assert.equal(g.weapons[id].evolved, false);
    const pair = {
      carbine: 'pierce',
      arc: 'crit',
      orbit: 'armor',
      pulse: 'area',
      mine: 'damage',
    }[id];
    g.modifications[pair] = 1;
    checkEvolutions(g);
    assert.equal(g.weapons[id].evolved, true);
  }
});
test('maxed upgrades leave the offer pool and rerolls are limited', () => {
  const g = running();
  g.modifications.damage = 5;
  collectXp(g, 8);
  assert.ok(!g.choices.some((u) => u.id === 'damage'));
  assert.ok(reroll(g));
  assert.ok(reroll(g));
  assert.equal(reroll(g), false);
});
test('supply caches award salvage and healing, and bounty rewards pay once', () => {
  const g = running();
  g.player.hp = 30;
  g.supplies = [{ x: 0, y: 0, kind: 'crate' }];
  update(g, 0.01);
  assert.equal(g.crates, 1);
  assert.equal(g.scrap, 12);
  assert.ok(g.player.hp >= 45);
  g.kills = 100;
  g.crates = 3;
  g.bossKills = 1;
  update(g, 0.01);
  const scrap = g.scrap;
  update(g, 0.01);
  assert.equal(g.scrap, scrap);
  assert.equal(scrap, 107);
});
test('settling a run awards salvage and achievements exactly once', () => {
  const p = freshProfile(),
    g = running();
  g.state = 'dead';
  g.kills = 100;
  g.scrap = 12;
  g.time = 120;
  const result = settleRun(p, g);
  assert.equal(result.earned, 47);
  assert.equal(p.scrap, 117);
  assert.equal(p.runs, 1);
  assert.equal(settleRun(p, g), null);
  assert.equal(p.runs, 1);
  assert.equal(p.history.length, 1);
});
test('research purchases scale costs, cap ranks, and affect new runs', () => {
  const p = freshProfile();
  p.scrap = 1000;
  assert.equal(purchase(p, 'research', 'vitality'), true);
  assert.equal(p.scrap, 960);
  assert.equal(purchase(p, 'research', 'vitality'), true);
  assert.equal(p.scrap, 880);
  const g = createGame(Math.random, { research: p.research });
  assert.equal(g.player.maxHp, 120);
  p.research.vitality = 5;
  assert.equal(purchase(p, 'research', 'vitality'), false);
  assert.equal(purchase(p, 'research', 'missing'), false);
});
test('operator and zone unlocks require currency and cannot be purchased twice', () => {
  const p = freshProfile();
  assert.equal(purchase(p, 'operator', 'spark'), false);
  p.scrap = 500;
  assert.ok(purchase(p, 'operator', 'spark'));
  assert.equal(purchase(p, 'operator', 'spark'), false);
  assert.ok(purchase(p, 'zone', 'marsh'));
  assert.ok(p.operators.includes('spark'));
  assert.ok(p.zones.includes('marsh'));
});
test('save parsing recovers from corruption and sanitizes invalid ranks and identifiers', () => {
  assert.deepEqual(parseProfile('bad json'), freshProfile());
  const p = parseProfile(
    JSON.stringify({
      version: 2,
      scrap: -50,
      research: { vitality: 999 },
      operators: ['<script>'],
      zones: ['invalid'],
      settings: { sound: 'yes' },
      history: [{ zone: 'bad', time: -3 }],
    }),
  );
  assert.equal(p.scrap, 0);
  assert.equal(p.research.vitality, 5);
  assert.deepEqual(p.operators, ['nomad']);
  assert.deepEqual(p.zones, ['forest']);
  assert.equal(p.settings.sound, false);
  assert.equal(p.history[0].zone, 'forest');
});
test('daily seeds reproduce simulation randomness', () => {
  const a = seededRandom('2026-10-12'),
    b = seededRandom('2026-10-12'),
    c = seededRandom('2026-10-13');
  const first = Array.from({ length: 20 }, a);
  assert.deepEqual(first, Array.from({ length: 20 }, b));
  assert.notDeepEqual(first, Array.from({ length: 20 }, c));
});
test('extraction progress decays outside the beacon and endless mode has no rescue', () => {
  const g = running();
  g.time = 481;
  g.bossIndex = 3;
  g.extraction = { x: 0, y: 0, radius: 75 };
  g.extractProgress = 4;
  g.player.x = 200;
  update(g, 0.05);
  assert.ok(g.extractProgress < 4);
  const endless = running({ mode: 'endless' });
  endless.time = 500;
  endless.bossIndex = 5;
  update(endless, 0.05);
  assert.equal(endless.extraction, null);
});
test('each upgrade can be applied without producing nonfinite player stats', () => {
  for (const u of UPGRADES) {
    const g = running();
    g.state = 'upgrade';
    g.pendingLevels = 1;
    g.choices = [u];
    assert.ok(applyUpgrade(g, u.id));
    for (const value of Object.values(g.player))
      if (typeof value === 'number') assert.ok(Number.isFinite(value), u.id);
  }
});
test('every operator and zone combination creates a playable run', () => {
  for (const o of OPERATORS)
    for (const z of ZONES) {
      const g = running({ operator: o.id, zone: z.id });
      assert.ok(g.weapons[o.weapon]);
      for (let i = 0; i < 20; i++) update(g, 0.05, { x: 1, y: 1 });
      assert.equal(g.state, 'playing');
      assert.ok(g.player.x > 0);
    }
});
test('a deterministic ten-minute stress run keeps entities bounded and state finite', () => {
  const g = running({ mode: 'endless' });
  g.spawnClock = 0;
  g.nextSupply = 24;
  g.nextHorde = 45;
  g.nextHazard = 35;
  g.player.maxHp = g.player.hp = 100000;
  for (let i = 0; i < 12000; i++) {
    if (g.state === 'upgrade') applyUpgrade(g, g.choices[0].id);
    update(
      g,
      0.05,
      { x: Math.cos(g.time * 0.04), y: Math.sin(g.time * 0.04) },
      { width: 500, height: 850 },
    );
    if (i % 100 === 0) activateNova(g);
    assert.ok(g.enemies.length < 200);
    assert.ok(g.cores.length <= 250);
    assert.ok(g.supplies.length <= 80);
    assert.ok(Number.isFinite(g.player.hp));
  }
  assert.ok(g.time > 590);
  assert.ok(g.kills > 100);
});
test('chargers visibly wind up before moving at charge speed', () => {
  const g = running();
  const e = spawnEnemy(g, 'charger', 200, 0);
  e.attack = 0;
  const x = e.x;
  update(g, 0.05);
  assert.equal(e.x, x);
  assert.ok(e.windup > 0);
  for (let i = 0; i < 10; i++) update(g, 0.05);
  assert.equal(e.x, x);
  for (let i = 0; i < 6; i++) update(g, 0.05);
  assert.ok(e.x < x - 10);
});
test('spore titan summons runners and reactor titan creates a hazard formation', () => {
  for (const phase of [1, 2]) {
    const g = running();
    const e = spawnEnemy(g, 'boss', 300, 0);
    e.phase = phase;
    e.attack = 0;
    update(g, 0.05);
    assert.ok(e.telegraph);
    for (let i = 0; i < 29; i++) update(g, 0.05);
    if (phase === 1)
      assert.equal(g.enemies.filter((e) => e.type === 'runner').length, 2);
    else assert.ok(g.hazards.length >= 3);
  }
});
