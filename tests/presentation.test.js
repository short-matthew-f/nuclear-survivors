import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshProfile,
  parseProfile,
  purchase,
  exportProfile,
  importProfile,
} from '../src/profile.js';
import {
  validateDeployment,
  heroLoadout,
  deploymentSummary,
  nextGoals,
  researchComparison,
  equipmentOrder,
} from '../src/menu-model.js';
import {
  renderHome,
  renderHeroes,
  renderHero,
  renderBunker,
  renderEquipment,
  renderResults,
  renderReplaceRun,
  rootNavigation,
} from '../src/presentation.js';
import { createGame } from '../src/game.js';
const context = (profile) => ({
  profile,
  selection: validateDeployment(profile),
  inspectedHero: 'nomad',
  heroTab: 'loadout',
  bunkerTab: 'research',
  armoryType: 'weapon',
  recordTab: 'archive',
  equipmentKind: 'weapon',
  inventoryFilter: 'all',
  storageAvailable: true,
});

test('inspecting locked heroes offers a deliberate recruitment action without spending scrap', () => {
  const p = freshProfile();
  p.scrap = 500;
  const c = context(p);
  c.inspectedHero = 'morrow';
  const roster = renderHeroes(c),
    hero = renderHero(c);
  assert.ok(roster.includes('data-action="hero-open" data-value="morrow"'));
  assert.ok(!roster.includes('data-action="recruit"'));
  assert.ok(hero.includes('Recruit · 220 scrap'));
  assert.ok(hero.includes('Complete a survivor rescue'));
  assert.equal(p.scrap, 500);
  assert.ok(!p.operators.includes('morrow'));
});
test('deploy screen reflects the actual selected signature branch and daily overrides', () => {
  const p = freshProfile();
  p.mastery.nomad = { best: 120, casts: 8, wins: 0 };
  p.heroStyles.nomad = { branch: 'demolition', outfit: 'field' };
  assert.equal(heroLoadout(p, 'nomad').abilityName, 'Demolition');
  p.loadouts.nomad = { weapon: 'pulse', ability: 'mend' };
  assert.equal(heroLoadout(p, 'nomad').abilityName, 'Field mend');
  const c = context(p);
  c.selection.mode = 'daily';
  const daily = deploymentSummary(p, c.selection);
  assert.equal(daily.weaponId, 'carbine');
  assert.equal(daily.abilityName, 'Shockwave');
  assert.equal(daily.hero.id, 'nomad');
  assert.ok(renderHome(c).includes('FIXED DAILY HERO'));
});
test('deployment preferences survive backup restoration and reject locked selections', () => {
  const p = freshProfile();
  p.scrap = 1000;
  purchase(p, 'operator', 'rook');
  purchase(p, 'zone', 'marsh');
  p.deployment = {
    operator: 'rook',
    zone: 'marsh',
    mode: 'endless',
    difficulty: 'scavenger',
    chapter: 'signal',
  };
  assert.deepEqual(importProfile(exportProfile(p)).deployment, p.deployment);
  const invalid = validateDeployment(freshProfile(), {
    operator: 'vesper',
    zone: 'industrial',
    mode: 'broken',
    difficulty: 'veteran',
    chapter: 'sunrise',
  });
  assert.deepEqual(invalid, {
    operator: 'nomad',
    zone: 'forest',
    mode: 'campaign',
    difficulty: 'survivor',
    chapter: 'signal',
  });
  const old = parseProfile(
    JSON.stringify({
      version: 2,
      scrap: 123,
      chapters: ['signal'],
      operators: ['nomad'],
    }),
  );
  assert.equal(old.deployment.chapter, 'water');
  assert.equal(old.scrap, 123);
});
test('research comparisons match permanent bonuses and cap at the final rank', () => {
  const p = freshProfile();
  p.research.power = 2;
  assert.deepEqual(researchComparison(p, 'power'), {
    rank: 2,
    next: 3,
    current: '+16% damage',
    result: '+24% damage',
    cost: 150,
    maxed: false,
  });
  p.research.recovery = 4;
  const v = researchComparison(p, 'recovery');
  assert.equal(v.result, '+0.60 HP/s');
  assert.equal(v.maxed, true);
  assert.ok(renderBunker(context(p)).includes('Current bonus'));
});
test('next goals prioritize selected hero mastery and retain free field reward routes', () => {
  const p = freshProfile();
  const goals = nextGoals(p, 'nomad', 2);
  assert.equal(goals[0].id, 'fieldcraft');
  assert.equal(goals[0].target, 120);
  assert.ok(goals[1].action === 'goal-open');
  p.mastery.nomad = { best: 120, casts: 4, wins: 0 };
  assert.equal(nextGoals(p, 'nomad')[0].id, 'discipline');
  p.mastery.nomad.casts = 8;
  assert.equal(nextGoals(p, 'nomad')[0].id, 'veteran');
});
test('owned equipment filters keep the equipped item first and shared buying is separate from equipping', () => {
  const p = freshProfile();
  p.loadouts.nomad = { weapon: 'pulse', ability: 'shockwave' };
  assert.deepEqual(equipmentOrder(p, 'weapon', 'nomad', true), [
    'pulse',
    'carbine',
    'orbit',
  ]);
  const c = context(p);
  c.inventoryFilter = 'owned';
  const equipment = renderEquipment(c);
  assert.ok(equipment.includes('Current: Rad bloom'));
  assert.ok(!equipment.includes('Arc coil'));
  c.inventoryFilter = 'all';
  c.bunkerTab = 'armory';
  const armory = renderBunker(c);
  assert.ok(armory.includes('data-action="unlock-weapon"'));
  assert.ok(!armory.includes('data-action="buy-weapon"'));
});
test('the main navigation has four stable labeled destinations and one current marker', () => {
  const html = rootNavigation('heroes');
  assert.equal((html.match(/data-action="nav"/g) || []).length, 4);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  for (const name of ['Deploy', 'Heroes', 'Bunker', 'Records'])
    assert.ok(html.includes(name));
});
test('debrief totals include commendations and chapter rewards without charging free unlocks', () => {
  const p = freshProfile(),
    c = context(p),
    g = createGame();
  g.state = 'dead';
  const html = renderResults(
    c,
    g,
    {
      earned: 100,
      unlocked: [{ name: 'First blood', reward: 20 }],
      mastery: { rewards: ['Repulsor'] },
      fieldUnlocks: [{ name: 'Arc coil' }],
    },
    { title: 'Chapter', debrief: 'Safe', reward: 150 },
  );
  assert.ok(html.includes('+270'));
  assert.ok(html.includes('data-action="result-retry"'));
  assert.ok(html.includes('Repulsor'));
});
test('starting over presents the existing checkpoint with a clear resume alternative', () => {
  const c = context(freshProfile());
  c.savedRun = createGame();
  c.savedRun.time = 123;
  const html = renderReplaceRun(c);
  assert.ok(html.includes('Resume saved operation'));
  assert.ok(html.includes('replaces that checkpoint'));
  assert.ok(html.includes('data-action="confirm-start"'));
});

test('malformed optional deployment data cannot wipe an otherwise valid save', () => {
  for (const deployment of [null, [], 42, 'old']) {
    const p = parseProfile(
      JSON.stringify({
        ...freshProfile(),
        scrap: 543,
        operators: ['nomad', 'rook'],
        deployment,
      }),
    );
    assert.equal(p.scrap, 543);
    assert.ok(p.operators.includes('rook'));
    assert.equal(p.deployment.operator, 'nomad');
  }
});
