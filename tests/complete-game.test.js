import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  update,
  spawnEnemy,
  hitEnemy,
  hurtPlayer,
  seededRandom,
  checkEvolutions,
  applyUpgrade,
  chooseUpgrades,
} from '../src/game.js';
import {
  beginEvent,
  missionReady,
  missionGoals,
  updateExpedition,
  makeElite,
  commitOvertime,
} from '../src/expedition.js';
import {
  freshProfile,
  settleRun,
  parseProfile,
  selectPerk,
  exportProfile,
  importProfile,
} from '../src/profile.js';
import { serializeRun, restoreRun } from '../src/checkpoint.js';
import {
  CHAPTERS,
  FIELD_EVENTS,
  WEAPONS,
  EVOLUTIONS,
  UPGRADES,
} from '../src/content.js';
const run = (options = {}) => {
  const g = createGame(seededRandom('complete-game'), options);
  g.state = 'playing';
  for (const key of [
    'spawnClock',
    'nextSupply',
    'nextHazard',
    'nextHorde',
    'nextEvent',
  ])
    g[key] = 10000;
  return g;
};
test('rescues require proximity and give health and salvage exactly once', () => {
  const g = run();
  g.player.hp = 20;
  assert.equal(beginEvent(g, 'rescue'), true);
  assert.equal(beginEvent(g, 'relay'), false);
  updateExpedition(g, 15);
  assert.equal(g.rescues, 0);
  Object.assign(g.player, { x: g.fieldEvent.x, y: g.fieldEvent.y });
  updateExpedition(g, 12);
  assert.equal(g.rescues, 1);
  assert.equal(g.eventsCompleted, 1);
  assert.equal(g.player.hp, 70);
  assert.equal(g.scrap, FIELD_EVENTS.rescue.reward);
  updateExpedition(g, 1);
  assert.equal(g.eventsCompleted, 1);
});
test('relay grants a timed damage buff and pulls all experience home', () => {
  const g = run();
  beginEvent(g, 'relay');
  Object.assign(g.player, { x: g.fieldEvent.x, y: g.fieldEvent.y });
  g.cores.push({ x: 1000, y: 1000, value: 2 });
  updateExpedition(g, 10);
  assert.equal(g.buffs.overdrive, 25);
  assert.equal(g.cores[0].x, g.player.x);
  updateExpedition(g, 26);
  assert.equal(g.buffs.overdrive, 0);
});
test('convoy cannot be secured with live guards and drops a relic after clearing', () => {
  const g = run();
  beginEvent(g, 'convoy');
  assert.equal(g.enemies.filter((e) => e.elite).length, 3);
  Object.assign(g.player, { x: g.fieldEvent.x, y: g.fieldEvent.y });
  updateExpedition(g, 10);
  assert.equal(g.eventsCompleted, 0);
  for (const e of g.enemies) hitEnemy(g, e, 100000);
  updateExpedition(g, 6);
  assert.equal(g.eventsCompleted, 1);
  assert.ok(g.supplies.some((s) => s.kind === 'relic'));
  assert.equal(g.eliteKills, 3);
});
test('expired events lose their signal without granting rewards', () => {
  const g = run();
  beginEvent(g, 'rescue');
  g.time = 81;
  updateExpedition(g, 0.01);
  assert.equal(g.fieldEvent, null);
  assert.equal(g.eventsCompleted, 0);
  assert.equal(g.scrap, 0);
});
test('field event director rotates all three encounter types', () => {
  const g = run();
  g.nextEvent = 40;
  const kinds = [];
  for (let i = 0; i < 3; i++) {
    g.time = g.nextEvent;
    updateExpedition(g, 0.01);
    kinds.push(g.fieldEvent.kind);
    g.fieldEvent = null;
  }
  assert.deepEqual(kinds, ['rescue', 'relay', 'convoy']);
});
test('elite conversion is idempotent and elite loot pays once', () => {
  const g = run(),
    e = spawnEnemy(g, 'walker', 100, 0);
  makeElite(e);
  const hp = e.hp;
  makeElite(e);
  assert.equal(e.hp, hp);
  hitEnemy(g, e, 100000);
  hitEnemy(g, e, 100000);
  assert.equal(g.eliteKills, 1);
  assert.equal(g.scrap, 8);
  assert.equal(g.enemyKills.walker, 1);
});
test('difficulty changes enemy health and contact damage together', () => {
  const easy = run({ difficulty: 'scavenger' }),
    hard = run({ difficulty: 'veteran' });
  const a = spawnEnemy(easy, 'walker', 0, 0),
    b = spawnEnemy(hard, 'walker', 0, 0);
  assert.equal(b.hp / a.hp, 2);
  assert.equal(b.damage / a.damage, 2);
});
test('last light revives exactly once and survives checkpoint restore', () => {
  const g = run({ perk: 'phoenix' });
  hurtPlayer(g, 1000);
  assert.equal(g.state, 'playing');
  assert.equal(g.revives, 1);
  assert.equal(g.player.hp, 50);
  const restored = restoreRun(serializeRun(g));
  restored.state = 'playing';
  restored.player.invulnerable = 0;
  hurtPlayer(restored, 1000);
  assert.equal(restored.state, 'dead');
});
test('field kits have meaningful starting effects and respect achievement locks', () => {
  const p = freshProfile();
  assert.equal(selectPerk(p, 'phoenix'), false);
  p.achievements.push('extract');
  assert.equal(selectPerk(p, 'phoenix'), true);
  assert.equal(run({ perk: 'magnet' }).rerolls, 3);
  assert.equal(run({ perk: 'medic' }).player.maxHp, 130);
  const g = run({ perk: 'hunter' }),
    e = spawnEnemy(g, 'brute', 100, 0);
  makeElite(e);
  g.player.crit = 0;
  const hp = e.hp;
  hitEnemy(g, e, 100);
  assert.equal(hp - e.hp, 125);
});
test('shotgun and drones fire, damage targets, and evolve with the correct mutation', () => {
  for (const id of ['scatter', 'drone']) {
    const g = run();
    g.weapons = { [id]: { level: 5, clock: 0, evolved: false } };
    const e = spawnEnemy(g, 'brute', 75, 0);
    e.speed = 0;
    g.modifications[EVOLUTIONS[id].mutation] = 1;
    checkEvolutions(g);
    assert.equal(g.weapons[id].evolved, true);
    for (let i = 0; i < 20; i++) update(g, 0.05);
    assert.ok(e.hp < e.maxHp);
    assert.ok(g.shotsFired > 0);
  }
});
test('all seven weapons can be chosen, upgraded and evolved without invalid state', () => {
  for (const id of Object.keys(WEAPONS)) {
    const g = run();
    g.weapons = {};
    for (let level = 1; level <= 5; level++) {
      g.state = 'upgrade';
      g.pendingLevels = 1;
      g.choices = [UPGRADES.find((u) => u.id === id)];
      assert.equal(applyUpgrade(g, id), true);
    }
    assert.equal(g.weapons[id].level, 5);
    g.modifications[EVOLUTIONS[id].mutation] = 1;
    checkEvolutions(g);
    assert.equal(g.weapons[id].evolved, true);
    chooseUpgrades(g);
    assert.ok(g.choices.every((c) => c.id !== id));
  }
});
test('overtime is a one-time commitment with a later extraction and full heal', () => {
  const g = run();
  assert.equal(commitOvertime(g), false);
  g.time = 480;
  g.extraction = { x: 0, y: 0, radius: 75 };
  g.player.hp = 5;
  assert.equal(commitOvertime(g), true);
  assert.equal(g.extractionAt, 720);
  assert.equal(g.player.hp, g.player.maxHp);
  assert.equal(g.extraction, null);
  assert.equal(commitOvertime(g), false);
  g.time = 719.99;
  update(g, 0.02);
  assert.ok(g.extraction);
  const daily = run({ daily: '2026-10-12' });
  daily.extraction = {};
  assert.equal(commitOvertime(daily), false);
});
test('overtime and difficulty multiply salvage without multiplying fixed commendation rewards', () => {
  const p = freshProfile(),
    g = run({ difficulty: 'veteran' });
  g.scrap = 100;
  g.overtime = true;
  g.state = 'dead';
  const result = settleRun(p, g);
  assert.equal(result.earned, 262);
  assert.equal(p.scrap, 262);
});
test('campaign advances in order, unlocks the next sector, and never repeats first-clear rewards', () => {
  const p = freshProfile();
  for (const chapter of CHAPTERS) {
    const g = run({
      chapter: chapter.id,
      zone: chapter.zone,
      difficulty: chapter.difficulty,
    });
    g.state = 'won';
    g.bossKills = 3;
    g.eventCounts = { rescue: 2, relay: 1 };
    const r = settleRun(p, g);
    assert.equal(r.chapterCompleted.id, chapter.id);
    const next = CHAPTERS[CHAPTERS.indexOf(chapter) + 1];
    if (next) assert.ok(p.zones.includes(next.zone));
    const replay = run({ chapter: chapter.id });
    replay.state = 'won';
    replay.bossKills = 3;
    replay.eventCounts = { rescue: 2, relay: 1 };
    assert.equal(settleRun(p, replay).chapterCompleted, null);
  }
  assert.equal(p.chapters.length, 5);
  const skipped = freshProfile(),
    g = run({ chapter: CHAPTERS[3].id });
  g.state = 'won';
  assert.equal(settleRun(skipped, g).chapterCompleted, null);
});
test('daily archive keeps only the best local score for each date', () => {
  const p = freshProfile();
  for (const kills of [100, 10, 200]) {
    const g = run({ daily: '2026-10-12' });
    g.kills = kills;
    g.state = 'dead';
    settleRun(p, g);
  }
  assert.equal(p.dailyScores.length, 1);
  assert.equal(p.dailyScores[0].score, 2000);
});
test('new progression and preferences survive backup export and import', () => {
  const p = freshProfile();
  p.scrap = 321;
  p.chapters = ['signal'];
  p.achievements = ['extract'];
  p.perk = 'phoenix';
  p.enemyKills.walker = 55;
  p.settings.leftHanded = true;
  p.settings.music = true;
  const restored = importProfile(exportProfile(p));
  assert.equal(restored.scrap, 321);
  assert.equal(restored.perk, 'phoenix');
  assert.deepEqual(restored.chapters, ['signal']);
  assert.equal(restored.enemyKills.walker, 55);
  assert.equal(restored.settings.leftHanded, true);
  assert.equal(importProfile('{}'), null);
  assert.equal(importProfile('broken'), null);
});
test('existing v2 profiles migrate without losing salvage or research', () => {
  const p = parseProfile(
    JSON.stringify({
      version: 2,
      scrap: 99,
      research: { power: 2 },
      achievements: ['boss'],
    }),
  );
  assert.equal(p.scrap, 99);
  assert.equal(p.research.power, 2);
  assert.deepEqual(p.chapters, []);
  assert.equal(p.settings.radar, true);
  assert.equal(p.perk, 'none');
});
test('new event progress and overtime survive checkpoints; old checkpoints migrate', () => {
  const g = run({ difficulty: 'veteran', perk: 'medic' });
  beginEvent(g, 'convoy');
  g.fieldEvent.progress = 2;
  g.overtime = true;
  g.extractionAt = 720;
  const restored = restoreRun(serializeRun(g));
  assert.ok(restored);
  assert.equal(restored.fieldEvent.progress, 2);
  assert.equal(restored.extractionAt, 720);
  const snapshot = JSON.parse(serializeRun(run()));
  for (const key of [
    'difficulty',
    'perk',
    'chapter',
    'daily',
    'extractionAt',
    'overtime',
    'eventsCompleted',
    'rescues',
    'eliteKills',
    'enemyKills',
    'fieldEvent',
    'eventIndex',
    'nextEvent',
    'buffs',
    'revives',
    'shotsFired',
    'damageTaken',
  ])
    delete snapshot.game[key];
  assert.ok(restoreRun(JSON.stringify(snapshot)));
  snapshot.game.fieldEvent = { kind: 'convoy', guards: 'corrupt' };
  assert.equal(restoreRun(JSON.stringify(snapshot)), null);
});
test('a twenty-minute expedition remains bounded with seven evolved weapons and active encounters', () => {
  const g = createGame(seededRandom('soak'), {
    mode: 'endless',
    difficulty: 'veteran',
  });
  g.state = 'playing';
  g.player.maxHp = g.player.hp = 1000000;
  for (const id of Object.keys(WEAPONS))
    g.weapons[id] = { level: 5, clock: 0, evolved: true };
  for (let i = 0; i < 24000; i++) {
    if (g.state === 'upgrade') {
      g.pendingLevels = 0;
      g.state = 'playing';
    }
    const target = g.fieldEvent || {
      x: Math.cos(i / 300) * 300,
      y: Math.sin(i / 300) * 300,
    };
    const dx = target.x - g.player.x,
      dy = target.y - g.player.y,
      length = Math.hypot(dx, dy) || 1;
    update(
      g,
      0.05,
      { x: dx / length, y: dy / length },
      { width: 500, height: 1082 },
    );
  }
  assert.equal(g.state, 'playing');
  assert.ok(g.time > 1199);
  assert.ok(g.eventsCompleted > 0);
  assert.ok(g.enemies.length < 180);
  assert.ok(g.hostile.length < 400);
  assert.ok(g.cores.length <= 250);
  assert.ok(Number.isFinite(g.player.hp));
  assert.ok(g.kills > 500);
  assert.ok(restoreRun(serializeRun(g)));
});

test('campaign extraction waits for its real mission objective', () => {
  const g = run({ chapter: 'water' });
  g.time = 480;
  g.bossIndex = 3;
  update(g, 0.01);
  assert.equal(g.extraction, null);
  assert.equal(missionReady(g), false);
  assert.equal(missionGoals(g)[0].progress, 0);
  g.eventCounts.relay = 1;
  update(g, 0.01);
  assert.ok(g.extraction);
});
test('missed campaign signals are offered again until their goal is complete', () => {
  const g = run({ chapter: 'water' });
  g.nextEvent = 0;
  updateExpedition(g, 0.01);
  assert.equal(g.fieldEvent.kind, 'relay');
  g.time = 81;
  updateExpedition(g, 0.01);
  assert.equal(g.fieldEvent, null);
  g.time = g.nextEvent;
  updateExpedition(g, 0.01);
  assert.equal(g.fieldEvent.kind, 'relay');
});
test('campaign titans continue arriving if an unfinished boss objective needs them', () => {
  const g = run({ chapter: 'heart' });
  g.bossIndex = 3;
  g.time = 480;
  update(g, 0.01);
  assert.ok(g.enemies.some((e) => e.type === 'boss'));
  assert.equal(g.bossIndex, 4);
});

test('malformed optional history does not erase valid progression', () => {
  const p = parseProfile(
    JSON.stringify({
      version: 2,
      scrap: 250,
      history: [null, 5, { time: 40, zone: 'forest' }],
      dailyScores: [null, { date: '2026-10-12', score: 25 }],
    }),
  );
  assert.equal(p.scrap, 250);
  assert.equal(p.history.length, 1);
  assert.equal(p.dailyScores.length, 1);
});
test('corrupt event counters cannot produce a resumable operation that crashes later', () => {
  const snapshot = JSON.parse(serializeRun(run()));
  snapshot.game.eventCounts = null;
  assert.equal(restoreRun(JSON.stringify(snapshot)), null);
});
