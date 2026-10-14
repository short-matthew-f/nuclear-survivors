import { OPERATORS, WEAPONS } from './content.js';

export const HERO_MASTERY = {
  nomad: {
    weapon: 'scatter',
    branches: [
      {
        id: 'repulsor',
        name: 'Repulsor',
        description:
          'Shockwave throws infected back 100m. Same damage and cooldown.',
        tier: 1,
      },
      {
        id: 'demolition',
        name: 'Demolition',
        description:
          'Shockwave deals 160 damage in a smaller 120m radius. 24s base cooldown.',
        tier: 2,
      },
    ],
  },
  spark: {
    weapon: 'flame',
    branches: [
      {
        id: 'chain-reactor',
        name: 'Chain reactor',
        description:
          'Overclock lasts 8s and zaps three nearby targets every second. 30s base cooldown.',
        tier: 1,
      },
      {
        id: 'redline',
        name: 'Redline',
        description:
          'Overclock fires 60% faster and moves 40% faster for only 5s.',
        tier: 2,
      },
    ],
  },
  bastion: {
    weapon: 'discus',
    branches: [
      {
        id: 'bulwark',
        name: 'Bulwark',
        description:
          'Shockwave deals half damage but grants 6s invulnerability.',
        tier: 1,
      },
      {
        id: 'siegebreaker',
        name: 'Siegebreaker',
        description:
          'Shockwave deals 200 base damage in a tight 100m radius. 26s base cooldown.',
        tier: 2,
      },
    ],
  },
  morrow: {
    weapon: 'mine',
    branches: [
      {
        id: 'fallout-medic',
        name: 'Fallout medic',
        description:
          'Field mend heals 20 base health and deals 70 radiation damage nearby.',
        tier: 1,
      },
      {
        id: 'sanctuary',
        name: 'Sanctuary',
        description:
          'Replace instant healing with an 8s field healing 5 health per second while you stay inside.',
        tier: 2,
      },
    ],
  },
  rook: {
    weapon: 'flame',
    branches: [
      {
        id: 'swarm',
        name: 'Mobile swarm',
        description:
          'Deploy two moving microdrones for 9s. Each fires 12-damage rounds every 0.22s.',
        tier: 1,
      },
      {
        id: 'battery',
        name: 'Siege battery',
        description:
          'A stationary 16s battery fires 70-damage rounds that pierce three targets every 0.7s.',
        tier: 2,
      },
    ],
  },
  vesper: {
    weapon: 'discus',
    branches: [
      {
        id: 'shatter',
        name: 'Shatter',
        description:
          'Freeze lasts only 2s. Frozen kills explode for 40 base damage in a 110m radius.',
        tier: 1,
      },
      {
        id: 'permafrost',
        name: 'Permafrost',
        description:
          'Replace the instant freeze with a stationary 6s frost field that repeatedly chills nearby infected.',
        tier: 2,
      },
    ],
  },
};
const count = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export function masteryTier(record = {}) {
  if (record.best < 120 || !record.best) return 0;
  return record.casts >= 8 ? 2 : 1;
}
export function masteryBranch(heroId, id) {
  return HERO_MASTERY[heroId]?.branches.find((b) => b.id === id) || null;
}
export function parseMastery(profile, data) {
  profile.mastery = {};
  profile.heroStyles = {};
  for (const hero of OPERATORS) {
    const raw = data.mastery?.[hero.id];
    const record = {
      best: count(raw?.best),
      casts: count(raw?.casts),
      wins: count(raw?.wins),
    };
    profile.mastery[hero.id] = record;
    const style = data.heroStyles?.[hero.id];
    const branch = masteryBranch(hero.id, style?.branch);
    profile.heroStyles[hero.id] = {
      branch:
        branch && branch.tier <= masteryTier(record) ? branch.id : 'standard',
      outfit:
        record.wins > 0 && style?.outfit === 'veteran' ? 'veteran' : 'field',
    };
    if (profile.operators.includes(hero.id) && masteryTier(record) > 0) {
      const weapon = HERO_MASTERY[hero.id].weapon;
      if (!profile.weapons.includes(weapon)) profile.weapons.push(weapon);
    }
  }
}
export function settleMastery(profile, game) {
  const id = game.operator.id;
  const before = profile.mastery[id] || { best: 0, casts: 0, wins: 0 };
  const next = {
    best: Math.max(before.best, count(game.time)),
    casts:
      before.casts +
      (game.ability === game.operator.ability ? count(game.abilityUses) : 0),
    wins: before.wins + Number(game.state === 'won'),
  };
  profile.mastery[id] = next;
  const rewards = [];
  const spec = HERO_MASTERY[id];
  if (masteryTier(next) > masteryTier(before)) {
    for (const branch of spec.branches)
      if (branch.tier > masteryTier(before) && branch.tier <= masteryTier(next))
        rewards.push(branch.name);
    if (masteryTier(before) === 0) {
      if (!profile.weapons.includes(spec.weapon))
        profile.weapons.push(spec.weapon);
      rewards.push(`${WEAPONS[spec.weapon].name} alternate weapon`);
    }
  }
  if (!before.wins && next.wins) rewards.push('Veteran outfit');
  return { hero: game.operator.name, rewards, ...next };
}
export function equipHeroStyle(profile, heroId, kind, value) {
  if (!profile.operators.includes(heroId)) return false;
  const record = profile.mastery[heroId] || {};
  if (kind === 'branch' && value !== 'standard') {
    const branch = masteryBranch(heroId, value);
    if (!branch || branch.tier > masteryTier(record)) return false;
  } else if (kind === 'outfit') {
    if (
      !['field', 'veteran'].includes(value) ||
      (value === 'veteran' && !record.wins)
    )
      return false;
  } else if (kind !== 'branch') return false;
  profile.heroStyles[heroId] = {
    ...(profile.heroStyles[heroId] || { branch: 'standard', outfit: 'field' }),
    [kind]: value,
  };
  return true;
}
export function branchForGame(g) {
  return g.ability === g.operator.ability
    ? masteryBranch(g.operator.id, g.branch)
    : null;
}
export function abilityCooldown(g) {
  const id = branchForGame(g)?.id;
  const factor =
    id === 'demolition'
      ? 24 / 18
      : id === 'siegebreaker'
        ? 26 / 18
        : id === 'chain-reactor'
          ? 30 / 24
          : 1;
  return g.player.novaCooldown * factor;
}
