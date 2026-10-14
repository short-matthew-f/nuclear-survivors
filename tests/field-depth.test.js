import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  seededRandom,
  spawnEnemy,
  update,
  hitEnemy,
  activateDash,
  applyUpgrade,
  collectXp,
} from '../src/game.js';
import { activateAbility, updateAbilities } from '../src/abilities.js';
import { HERO_MASTERY, masteryTier, equipHeroStyle } from '../src/mastery.js';
import {
  freshProfile,
  purchase,
  settleRun,
  importProfile,
  exportProfile,
} from '../src/profile.js';
import { chooseRelics, applyRelic, RELICS } from '../src/relics.js';
import {
  prepareBoss,
  updateBoss,
  bossTargets,
  beamContains,
} from '../src/bosses.js';
import {
  beginEvent,
  updateExpedition,
  eventTarget,
} from '../src/expedition.js';
import { serializeRun, restoreRun } from '../src/checkpoint.js';
import { weaponPattern, upgradePreview } from '../src/build.js';
const run = (options = {}) => {
  const g = createGame(seededRandom('depth'), options);
  g.state = 'playing';
  g.spawnClock =
    g.nextEvent =
    g.nextHorde =
    g.nextSupply =
    g.nextHazard =
      100000;
  g.player.crit = 0;
  return g;
};
function settle(p, g) {
  g.state = 'dead';
  return settleRun(p, g);
}

test('hero mastery tracks separately, rewards failed-run practice and never charges scrap', () => {
  const p = freshProfile();
  const g = run({ operator: 'nomad' });
  g.time = 120;
  g.abilityUses = 4;
  const result = settle(p, g);
  assert.equal(masteryTier(p.mastery.nomad), 1);
  assert.ok(result.mastery.rewards.includes('Repulsor'));
  assert.ok(p.weapons.includes('scatter'));
  assert.equal(
    p.scrap,
    result.earned + result.unlocked.reduce((sum, a) => sum + a.reward, 0),
  );
  assert.equal(p.mastery.spark, undefined);
  const second = run();
  second.abilityUses = 4;
  settle(p, second);
  assert.equal(masteryTier(p.mastery.nomad), 2);
  assert.equal(equipHeroStyle(p, 'nomad', 'branch', 'demolition'), true);
  assert.equal(equipHeroStyle(p, 'nomad', 'outfit', 'veteran'), false);
});
test('signature discipline excludes borrowed abilities and settlement remains idempotent', () => {
  const p = freshProfile();
  const g = run({ operator: 'nomad', ability: 'mend' });
  g.time = 130;
  g.abilityUses = 10;
  settle(p, g);
  assert.equal(p.mastery.nomad.casts, 0);
  assert.equal(settleRun(p, g), null);
  assert.equal(p.mastery.nomad.casts, 0);
});
test('mastery branches and earned outfits survive backups with ownership and validation', () => {
  const p = freshProfile();
  p.scrap = 1000;
  purchase(p, 'operator', 'rook');
  const g = run({ operator: 'rook' });
  g.time = 480;
  g.abilityUses = 8;
  g.state = 'won';
  settleRun(p, g);
  assert.ok(equipHeroStyle(p, 'rook', 'branch', 'swarm'));
  assert.ok(equipHeroStyle(p, 'rook', 'outfit', 'veteran'));
  const copy = importProfile(exportProfile(p));
  assert.equal(copy.heroStyles.rook.branch, 'swarm');
  assert.equal(copy.heroStyles.rook.outfit, 'veteran');
  assert.ok(copy.weapons.includes('flame'));
  assert.equal(equipHeroStyle(p, 'nomad', 'branch', 'swarm'), false);
  const bad = freshProfile();
  bad.heroStyles.nomad = { branch: 'demolition', outfit: 'veteran' };
  assert.deepEqual(importProfile(exportProfile(bad)).heroStyles.nomad, {
    branch: 'standard',
    outfit: 'field',
  });
});
test('every hero branch activates, remains finite, and records a signature use', () => {
  for (const [operator, spec] of Object.entries(HERO_MASTERY))
    for (const branch of spec.branches) {
      const g = run({ operator, branch: branch.id });
      spawnEnemy(g, 'brute', 70, 0);
      assert.ok(activateAbility(g), branch.id);
      assert.equal(g.abilityUses, 1);
      updateAbilities(g, 0.05);
      assert.ok(Number.isFinite(g.player.hp));
      assert.ok(Number.isFinite(g.player.novaTimer));
    }
});
test('repulsor pushes enemies back while demolition trades radius and cooldown for damage', () => {
  const g = run({ branch: 'repulsor' });
  const e = spawnEnemy(g, 'brute', 60, 0);
  activateAbility(g);
  assert.equal(e.x, 160);
  const heavy = run({ branch: 'demolition' }),
    near = spawnEnemy(heavy, 'brute', 60, 0),
    far = spawnEnemy(heavy, 'brute', 170, 0);
  activateAbility(heavy);
  assert.ok(near.hp <= 0);
  assert.equal(far.hp, far.maxHp);
  assert.equal(heavy.player.novaTimer, 24);
  assert.ok(
    upgradePreview(heavy, 'nova').lines.some((line) => line.includes('160')),
  );
});
test('sanctuary heals only inside its field and mobile swarm follows the hero', () => {
  const medic = run({ operator: 'morrow', branch: 'sanctuary' });
  medic.player.hp = 40;
  activateAbility(medic);
  assert.equal(medic.player.hp, 40);
  updateAbilities(medic, 1);
  assert.equal(medic.player.hp, 45);
  medic.player.x = 300;
  updateAbilities(medic, 1);
  assert.equal(medic.player.hp, 45);
  const rook = run({ operator: 'rook', branch: 'swarm' });
  activateAbility(rook);
  assert.equal(rook.turrets.length, 2);
  rook.player.x = 200;
  updateAbilities(rook, 0.1);
  assert.ok(rook.turrets.every((t) => Math.abs(t.x - 200) <= 45));
});
test('redline and siege battery have distinct firing patterns and permafrost chills repeatedly', () => {
  const g = run({ operator: 'spark', branch: 'redline' }),
    base = weaponPattern(g, 'arc').interval;
  activateAbility(g);
  assert.equal(g.buffs.surge, 5);
  assert.equal(weaponPattern(g, 'arc').interval, base * 0.4);
  const battery = run({ operator: 'rook', branch: 'battery' });
  activateAbility(battery);
  spawnEnemy(battery, 'brute', 100, 0);
  updateAbilities(battery, 0.01);
  assert.equal(battery.bullets[0].pierce, 3);
  assert.equal(battery.bullets[0].damage, 70);
  const cryo = run({ operator: 'vesper', branch: 'permafrost' });
  const e = spawnEnemy(cryo, 'brute', 80, 0);
  activateAbility(cryo);
  updateAbilities(cryo, 0.1);
  assert.equal(e.frozen, 0.25);
});
test('relic choice pauses, offers compatible unowned effects, and cannot double-apply', () => {
  const g = run();
  g.relicDrafts = 1;
  chooseRelics(g);
  assert.equal(g.state, 'relic');
  assert.equal(g.relicChoices.length, 3);
  assert.ok(
    g.relicChoices.every(
      (id) => !['wildfire', 'fractal', 'icebreaker'].includes(id),
    ),
  );
  const time = g.time;
  update(g, 1);
  assert.equal(g.time, time);
  const id = g.relicChoices[0];
  assert.ok(applyRelic(g, id));
  assert.equal(applyRelic(g, id), false);
  assert.equal(g.relics.length, 1);
});
test('relic pickups queue behind level-up offers and resume without dropping either reward', () => {
  const g = run();
  collectXp(g, 8);
  assert.equal(g.state, 'upgrade');
  g.supplies = [{ x: 0, y: 0, kind: 'relic', id: 9 }];
  // Simulate a pending pickup already queued by the last playing frame.
  g.relicDrafts = 1;
  assert.ok(applyUpgrade(g, g.choices[0].id));
  assert.equal(g.state, 'relic');
  assert.ok(applyRelic(g, g.relicChoices[0]));
  assert.equal(g.state, 'playing');
});
test('wildfire spreads burn and frozen kills shatter once without recursive explosion chains', () => {
  const g = run({ ability: 'freeze' });
  g.relics = ['wildfire', 'icebreaker'];
  const a = spawnEnemy(g, 'walker', 50, 0),
    b = spawnEnemy(g, 'brute', 85, 0),
    c = spawnEnemy(g, 'brute', 100, 0);
  a.burnLeft = 3;
  a.burnDamage = 9;
  a.frozen = 2;
  hitEnemy(g, a, 100);
  assert.equal(b.burnLeft, 3);
  assert.equal(c.burnDamage, 9);
  assert.equal(b.hp, b.maxHp - 40);
  assert.equal(g.effects.filter((e) => e.kind === 'ring').length, 1);
});
test('fractal discs split only once and afterimage leaves a friendly damage field', () => {
  const g = run({ weapon: 'discus' });
  g.relics = ['fractal', 'afterimage'];
  g.weapons.discus.clock = 100;
  g.bullets = [
    {
      kind: 'discus',
      x: 100,
      y: 0,
      vx: 300,
      vy: 0,
      age: 0.54,
      returning: false,
      damage: 30,
      life: 2,
      pierce: 5,
      hits: new Set(),
      color: '#fff',
    },
  ];
  update(g, 0.02);
  assert.equal(g.bullets.length, 4);
  update(g, 0.02);
  assert.equal(g.bullets.length, 4);
  activateDash(g, { x: 1, y: 0 });
  assert.ok(g.hazards.some((h) => h.friendly && h.life === 2));
});
test('blood circuit is rate limited and salvage heart reduces active cooldown', () => {
  const g = run();
  g.relics = ['blood-circuit', 'salvage-heart'];
  g.player.hp = 50;
  hitEnemy(g, spawnEnemy(g, 'walker', 50, 0), 100);
  hitEnemy(g, spawnEnemy(g, 'walker', 60, 0), 100);
  assert.equal(g.player.hp, 51);
  g.player.novaTimer = 10;
  g.supplies = [{ x: 0, y: 0, kind: 'scrap', value: 2, id: 5 }];
  update(g, 0.01);
  assert.ok(g.player.novaTimer < 8.51);
});
test('boss attacks telegraph before damage and different titans use different opening patterns', () => {
  for (const [phase, kind] of ['charge', 'spores', 'beams'].entries()) {
    const g = run(),
      e = spawnEnemy(g, 'boss', 300, 0);
    e.phase = phase;
    e.attack = 0;
    updateBoss(g, e, 0.01);
    assert.equal(e.telegraph.kind, kind);
    assert.equal(g.hostile.length, 0);
    assert.equal(g.hazards.length, 0);
    updateBoss(g, e, 1.5);
    if (phase === 0) assert.ok(e.charge > 0);
    if (phase === 1)
      assert.equal(g.enemies.filter((e) => e.type === 'runner').length, 2);
    if (phase === 2)
      assert.equal(g.hazards.filter((h) => h.kind === 'beam').length, 3);
  }
});
test('breaking boss parts gives a temporary vulnerability and removes mother spore summons', () => {
  const g = run(),
    e = spawnEnemy(g, 'boss', 300, 0);
  e.phase = 1;
  prepareBoss(e);
  for (const part of bossTargets(g)) hitEnemy(g, part, 100000);
  assert.equal(g.partsBroken, 2);
  assert.equal(g.kills, 0);
  assert.equal(e.exposed, 5);
  e.attack = 0;
  updateBoss(g, e, 0.01);
  updateBoss(g, e, 1.5);
  assert.equal(g.enemies.filter((e) => e.type === 'runner').length, 0);
  e.hp = e.maxHp * 0.3;
  updateBoss(g, e, 0.01);
  assert.equal(e.stage, 3);
});
test('beam damage only covers the marked lane', () => {
  const h = { x: 0, y: 0, angle: 0, length: 400, radius: 20 };
  assert.ok(beamContains(h, { x: 150, y: 10 }));
  assert.equal(beamContains(h, { x: 150, y: 40 }), false);
  assert.equal(beamContains(h, { x: -10, y: 0 }), false);
});
test('convoy only advances with its escort and pays its relic exactly once', () => {
  const g = run();
  beginEvent(g, 'escort');
  const e = g.fieldEvent;
  updateExpedition(g, 1);
  assert.equal(e.progress, 0);
  for (let i = 0; i < 240 && g.fieldEvent; i++) {
    g.enemies = [];
    g.player.x = e.x;
    g.player.y = e.y;
    g.time += 0.1;
    updateExpedition(g, 0.1);
  }
  assert.equal(g.fieldEvent, null);
  assert.equal(g.scrap, 80);
  assert.equal(g.eventsCompleted, 1);
  assert.equal(g.supplies.filter((s) => s.kind === 'relic').length, 1);
  updateExpedition(g, 1);
  assert.equal(g.scrap, 80);
});
test('overrun survivors fail without reward while a defended group grants two rescues', () => {
  const fail = run();
  beginEvent(fail, 'defense');
  const e = fail.fieldEvent;
  spawnEnemy(fail, 'brute', e.x, e.y);
  e.health = 1;
  updateExpedition(fail, 1);
  assert.equal(fail.fieldEvent, null);
  assert.equal(fail.scrap, 0);
  const g = run();
  beginEvent(g, 'defense');
  const ev = g.fieldEvent;
  for (let i = 0; i < 240 && g.fieldEvent; i++) {
    g.enemies = [];
    Object.assign(g.player, { x: ev.x, y: ev.y });
    g.time += 0.1;
    updateExpedition(g, 0.1);
  }
  assert.equal(g.rescues, 2);
  assert.equal(g.eventCounts.rescue, 1);
  assert.equal(g.scrap, 70);
});
test('reactor requires all three terminals and final containment before paying', () => {
  const g = run();
  beginEvent(g, 'reactor');
  const e = g.fieldEvent;
  Object.assign(g.player, { x: e.x, y: e.y });
  updateExpedition(g, 2);
  assert.equal(e.progress, 0);
  for (let i = 0; i < 160 && g.fieldEvent; i++) {
    Object.assign(g.player, eventTarget(e));
    g.time += 0.1;
    updateExpedition(g, 0.1);
  }
  assert.equal(e.stage, 3);
  assert.equal(g.scrap, 90);
  assert.equal(g.eventsCompleted, 1);
  assert.ok(g.buffs.overdrive > 0);
});
test('relic drafts, branches, fields, boss parts and staged events survive operation restoration', () => {
  const g = run({ operator: 'morrow', branch: 'sanctuary', outfit: 'veteran' });
  activateAbility(g);
  beginEvent(g, 'reactor');
  g.fieldEvent.stage = 1;
  g.fieldEvent.progress = 3;
  const boss = spawnEnemy(g, 'boss', 300, 0);
  boss.phase = 2;
  prepareBoss(boss);
  boss.parts[0].hp = 20;
  g.relicDrafts = 1;
  chooseRelics(g);
  const restored = restoreRun(serializeRun(g));
  assert.ok(restored);
  assert.equal(restored.state, 'relic');
  assert.equal(restored.branch, 'sanctuary');
  assert.equal(restored.abilityFields.length, 1);
  assert.equal(restored.fieldEvent.stage, 1);
  assert.equal(restored.enemies[0].parts[0].hp, 20);
  assert.ok(applyRelic(restored, restored.relicChoices[0]));
});
test('legacy operations migrate to standard hero abilities and no installed relics', () => {
  const g = run();
  const raw = JSON.parse(serializeRun(g));
  for (const key of [
    'branch',
    'outfit',
    'abilityUses',
    'abilityFields',
    'abilityPulse',
    'relics',
    'relicChoices',
    'relicDrafts',
    'relicHealAt',
    'partsBroken',
  ])
    delete raw.game[key];
  const restored = restoreRun(JSON.stringify(raw));
  assert.ok(restored);
  assert.equal(restored.branch, 'standard');
  assert.deepEqual(restored.relics, []);
});
test('malformed new event counters and relic drafts are rejected without replacing a save', () => {
  const g = run();
  beginEvent(g, 'escort');
  const raw = JSON.parse(serializeRun(g));
  raw.game.fieldEvent.health = 'bad';
  assert.equal(restoreRun(JSON.stringify(raw)), null);
  raw.game.fieldEvent.health = 180;
  raw.game.state = 'relic';
  raw.game.relicDrafts = 1;
  raw.game.relicChoices = ['unknown'];
  assert.equal(restoreRun(JSON.stringify(raw)), null);
});

test('corrupt boss parts and beam warnings cannot restore an operation that crashes rendering', () => {
  const g = run(),
    boss = spawnEnemy(g, 'boss', 200, 0);
  prepareBoss(boss);
  const snapshot = JSON.parse(serializeRun(g));
  delete snapshot.game.enemies[0].parts[0].name;
  assert.equal(restoreRun(JSON.stringify(snapshot)), null);
  const beam = JSON.parse(serializeRun(g));
  beam.game.hazards = [
    {
      kind: 'beam',
      x: 0,
      y: 0,
      radius: 20,
      length: 440,
      warn: 0,
      life: 1,
      angle: 'bad',
    },
  ];
  assert.equal(restoreRun(JSON.stringify(beam)), null);
});
test('healing fields expire without awarding healing after their lifetime', () => {
  const g = run({ operator: 'morrow', branch: 'sanctuary' });
  g.player.hp = 1;
  activateAbility(g);
  updateAbilities(g, 20);
  assert.equal(g.player.hp, 41);
  assert.equal(g.abilityFields.length, 0);
});
