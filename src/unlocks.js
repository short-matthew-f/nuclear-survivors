import { OPERATORS, WEAPONS, ABILITIES, WEAPON_COSTS } from './content.js';

// Feats are an alternative to spending scrap, never an extra purchase gate.
export const FIELD_UNLOCKS = [
  {
    id: 'spark',
    kind: 'operator',
    target: 'spark',
    title: 'Live wire',
    description: 'Reach rank 3 with Rad bloom in one operation.',
    metric: 'pulseRank',
    goal: 3,
  },
  {
    id: 'bastion',
    kind: 'operator',
    target: 'bastion',
    title: 'Titan breaker',
    description: 'Defeat your first titan.',
    metric: 'bosses',
    goal: 1,
  },
  {
    id: 'morrow',
    kind: 'operator',
    target: 'morrow',
    title: 'Answer the signal',
    description: 'Complete a survivor rescue.',
    metric: 'rescues',
    goal: 1,
  },
  {
    id: 'rook',
    kind: 'operator',
    target: 'rook',
    title: 'Field engineer',
    description: 'Carry four weapon families in one operation.',
    metric: 'arsenal',
    goal: 4,
  },
  {
    id: 'vesper',
    kind: 'operator',
    target: 'vesper',
    title: 'Hunt the hunters',
    description: 'Defeat 50 Strays across operations.',
    metric: 'runners',
    goal: 50,
  },
  {
    id: 'arc',
    kind: 'weapon',
    target: 'arc',
    title: 'Crowd control',
    description: 'Defeat 100 infected in one operation.',
    metric: 'kills',
    goal: 100,
  },
  {
    id: 'mine',
    kind: 'weapon',
    target: 'mine',
    title: 'Hold your ground',
    description: 'Survive two minutes in one operation.',
    metric: 'survival',
    goal: 120,
    unit: 'seconds',
  },
  {
    id: 'discus',
    kind: 'weapon',
    target: 'discus',
    title: 'Break the limit',
    description: 'Evolve any weapon.',
    metric: 'evolution',
    goal: 1,
  },
  {
    id: 'flame',
    kind: 'weapon',
    target: 'flame',
    title: 'Fight fire with fire',
    description: 'Defeat 20 Cinder blisters across operations.',
    metric: 'bombers',
    goal: 20,
  },
  {
    id: 'freeze',
    kind: 'ability',
    target: 'freeze',
    title: 'Cold pursuit',
    description: 'Defeat 20 Graveclaws across operations.',
    metric: 'burrowers',
    goal: 20,
  },
];
const count = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export function unlockReward(challenge) {
  const { kind, target } = challenge;
  const item =
    kind === 'operator'
      ? OPERATORS.find((o) => o.id === target)
      : kind === 'weapon'
        ? WEAPONS[target]
        : ABILITIES.find((a) => a.id === target);
  return {
    name: item.name,
    cost: kind === 'weapon' ? WEAPON_COSTS[target] : item.cost,
    kind,
    target,
  };
}
export function ownsReward(profile, challenge) {
  return profile[
    { operator: 'operators', weapon: 'weapons', ability: 'abilities' }[
      challenge.kind
    ]
  ].includes(challenge.target);
}
export function grantReward(profile, challenge) {
  const newlyOwned = !ownsReward(profile, challenge);
  const key = {
    operator: 'operators',
    weapon: 'weapons',
    ability: 'abilities',
  }[challenge.kind];
  if (newlyOwned) profile[key].push(challenge.target);
  if (challenge.kind === 'operator') {
    const hero = OPERATORS.find((o) => o.id === challenge.target);
    if (!profile.weapons.includes(hero.weapon))
      profile.weapons.push(hero.weapon);
    if (!profile.abilities.includes(hero.ability))
      profile.abilities.push(hero.ability);
  }
  return newlyOwned;
}
// Historical achievements and records credit old saves without inventing missing run data.
export function restoreUnlockProgress(profile, saved = {}) {
  const known = {
    bosses: Math.max(
      count(profile.enemyKills.boss),
      Number(profile.achievements.includes('boss')),
    ),
    rescues: Number(profile.achievements.includes('rescue')),
    arsenal: profile.achievements.includes('arsenal') ? 4 : 0,
    kills: Math.max(
      ...profile.history.map((r) => r.kills),
      profile.achievements.includes('hundred') ? 100 : 0,
      0,
    ),
    survival: profile.best,
    evolution: Number(profile.achievements.includes('evolution')),
    runners: count(profile.enemyKills.runner),
    bombers: count(profile.enemyKills.bomber),
    burrowers: count(profile.enemyKills.burrower),
  };
  profile.unlockProgress = Object.fromEntries(
    FIELD_UNLOCKS.map((c) => [
      c.id,
      Math.min(c.goal, Math.max(count(saved?.[c.id]), known[c.metric] || 0)),
    ]),
  );
  for (const c of FIELD_UNLOCKS)
    if (profile.unlockProgress[c.id] >= c.goal) grantReward(profile, c);
}
export function awardFieldUnlocks(profile, game) {
  const values = {
    pulseRank: game.weapons.pulse?.level || 0,
    bosses: (profile.unlockProgress.bastion || 0) + count(game.bossKills),
    rescues: (profile.unlockProgress.morrow || 0) + count(game.rescues),
    arsenal: Object.keys(game.weapons).length,
    kills: game.kills,
    survival: game.time,
    evolution: Number(Object.values(game.weapons).some((w) => w.evolved)),
    runners: count(profile.enemyKills.runner),
    bombers: count(profile.enemyKills.bomber),
    burrowers: count(profile.enemyKills.burrower),
  };
  const rewards = [];
  for (const c of FIELD_UNLOCKS) {
    profile.unlockProgress[c.id] = Math.min(
      c.goal,
      Math.max(profile.unlockProgress[c.id] || 0, count(values[c.metric])),
    );
    if (profile.unlockProgress[c.id] >= c.goal && grantReward(profile, c))
      rewards.push({ ...c, ...unlockReward(c) });
  }
  return rewards;
}
export function unlockHint(profile, kind, target) {
  const c = FIELD_UNLOCKS.find((c) => c.kind === kind && c.target === target);
  if (c)
    return `${c.description} (${profile.unlockProgress[c.id] || 0}/${c.goal}${c.unit ? 's' : ''})`;
  if (kind === 'weapon' || kind === 'ability') {
    const hero = OPERATORS.find((o) => o[kind] === target);
    if (hero)
      return `Also included with ${hero.name}. Earn or recruit this hero in Unlocks.`;
  }
  return '';
}
