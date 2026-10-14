import { branchForGame, abilityCooldown } from './mastery.js';
import { WEAPONS, EVOLUTIONS, UPGRADES, ABILITIES } from './content.js';

export const WEAPON_LIMIT = 4;
export const WEAPON_STEPS = {
  carbine: [
    'Rustline online',
    'Twin barrel',
    'Rapid cycling',
    'Triple barrel',
    'Armor shredder',
  ],
  arc: [
    'Live wire',
    'Third contact',
    'Long reach',
    'Five-way chain',
    'Storm circuit',
  ],
  orbit: [
    'First blade',
    'Twin saws',
    'Triple saws',
    'Four-blade perimeter',
    'Full perimeter',
  ],
  pulse: [
    'Radiation bloom',
    'Wider blast',
    'Expanding shockfront',
    'Contamination wave',
    'Critical reactor',
  ],
  mine: [
    'First charge',
    'Twin charges',
    'Demolition payload',
    'Triple charges',
    'Scorched corridor',
  ],
  scatter: [
    'Cinder online',
    'Seven-pellet spread',
    'Punch-through',
    'Ten-pellet spread',
    'Room sweeper',
  ],
  discus: [
    'First return',
    'Twin returns',
    'High-speed bearings',
    'Triple return',
    'Four-blade storm',
  ],
  flame: [
    'Pilot flame',
    'Longer flame',
    'Hotter core',
    'Wide furnace',
    'White-hot jet',
  ],
  drone: [
    'First escort',
    'Twin escorts',
    'Rapid targeting',
    'Third escort',
    'Four-drone squad',
  ],
};

// Shared by simulation, rendering, and upgrade previews so the promises match the weapon.
export function weaponPattern(
  g,
  id,
  level = g.weapons[id]?.level || 1,
  evolved = g.weapons[id]?.evolved || false,
) {
  const p = g.player,
    n = Math.max(1, Math.min(5, level)),
    i = n - 1;
  const pattern = {
    count: 1,
    damage: 0,
    interval: 1,
    radius: 0,
    reach: 210 * p.area,
    pierce: 0,
    spin: 0,
  };
  if (id === 'carbine')
    Object.assign(pattern, {
      count: [1, 2, 2, 3, 3][i] + p.shots - 1 + (evolved ? 2 : 0),
      damage: p.damage * [1, 1, 1.15, 1.15, 1.3][i],
      interval:
        p.interval *
        [1, 1, 0.86, 0.86, 0.7][i] *
        p.haste *
        (evolved ? 0.65 : 1),
      pierce:
        p.pierce + (n >= 3 ? 1 : 0) + (n === 5 ? 1 : 0) + (evolved ? 4 : 0),
    });
  if (id === 'arc')
    Object.assign(pattern, {
      count: n + 1 + (evolved ? 4 : 0),
      damage: 28 + n * 8,
      interval: [1.8, 1.65, 1.5, 1.35, 1.2][i] * p.haste * (evolved ? 0.55 : 1),
      reach: (n >= 3 ? 270 : 210) * p.area,
    });
  if (id === 'orbit')
    Object.assign(pattern, {
      count: n + (evolved ? 3 : 0),
      damage: 18 + n * 7,
      radius: (55 + n * 5) * p.area,
      spin: evolved ? 3.4 : 2.1 + n * 0.2,
    });
  if (id === 'pulse')
    Object.assign(pattern, {
      damage: 32 + n * 14,
      radius: [101, 130, 160, 190, 220][i] * p.area * (evolved ? 1.35 : 1),
      interval: [3, 2.65, 2.3, 2, 1.7][i] * p.haste * (evolved ? 0.6 : 1),
    });
  if (id === 'mine')
    Object.assign(pattern, {
      count: [1, 2, 2, 3, 3][i],
      damage: [85, 85, 110, 110, 140][i],
      radius: [77, 77, 100, 100, 125][i] * p.area,
      interval: [2.4, 2.4, 2, 2, 1.6][i] * p.haste,
    });
  if (id === 'scatter')
    Object.assign(pattern, {
      count: [5, 7, 7, 10, 12][i] + (p.shots - 1) * 2 + (evolved ? 6 : 0),
      damage: [18, 18, 23, 23, 28][i],
      pierce: [1, 1, 2, 2, 3][i] + Number(evolved),
      reach: [227, 227, 280, 280, 330][i] * p.area,
      interval:
        [1.25, 1.25, 1.05, 1.05, 0.9][i] * p.haste * (evolved ? 0.65 : 1),
    });
  if (id === 'drone')
    Object.assign(pattern, {
      count: [1, 2, 2, 3, 4][i] + (evolved ? 3 : 0),
      damage: 20 + n * 9,
      interval: [0.9, 0.9, 0.7, 0.7, 0.6][i] * p.haste * (evolved ? 0.65 : 1),
    });
  if (id === 'discus')
    Object.assign(pattern, {
      count: [1, 2, 2, 3, 4][i] + (evolved ? 2 : 0),
      damage: 22 + n * 8,
      interval: [1.8, 1.8, 1.5, 1.5, 1.2][i] * p.haste * (evolved ? 0.65 : 1),
    });
  if (id === 'flame')
    Object.assign(pattern, {
      damage: 8 + n * 3,
      radius: [110, 130, 150, 170, 190][i] * p.area * (evolved ? 1.3 : 1),
      interval: 0.2 * p.haste * (evolved ? 0.7 : 1),
    });
  if (id === 'drone' && g.operator.id === 'rook') pattern.count++;
  if (g.buffs.surge > 0)
    pattern.interval *= branchForGame(g)?.id === 'redline' ? 0.4 : 0.65;
  return pattern;
}

const units = {
  carbine: 'rounds',
  arc: 'chain targets',
  orbit: 'blades',
  mine: 'charges',
  scatter: 'pellets',
  drone: 'escorts',
  discus: 'returning blades',
};
const number = (value) => Number(value.toFixed(2));
export function upgradePreview(g, id) {
  const upgrade = UPGRADES.find((u) => u.id === id);
  const weapon = g.weapons[id];
  if (WEAPONS[id]) {
    const next = Math.min(5, (weapon?.level || 0) + 1);
    const evolves =
      next === 5 && (g.modifications[EVOLUTIONS[id].mutation] || 0) > 0;
    const before = weapon ? weaponPattern(g, id) : null;
    const after = weaponPattern(g, id, next, evolves);
    const lines = [];
    const compare = (key, label, format = number) => {
      if (!before || before[key] !== after[key])
        lines.push(
          `${label}: ${before ? `${format(before[key])} → ` : ''}${format(after[key])}`,
        );
    };
    if (units[id]) compare('count', units[id]);
    if (id === 'pulse' || id === 'mine' || id === 'orbit' || id === 'flame')
      compare('radius', 'radius', Math.round);
    compare('damage', 'damage / hit', (value) =>
      Math.round(value * g.player.power),
    );
    if (id !== 'orbit')
      compare('interval', 'fire interval', (value) => `${number(value)}s`);
    if (id === 'scatter' || id === 'carbine')
      compare('pierce', 'extra penetrations');
    if (id === 'arc') compare('reach', 'chain reach', Math.round);
    return {
      lane: weapon ? 'SPECIALIZE' : 'ADD A WEAPON',
      title: evolves ? EVOLUTIONS[id].name : WEAPON_STEPS[id][next - 1],
      lines,
      evolves,
      next,
    };
  }
  const p = g.player;
  const ability = ABILITIES.find((a) => a.id === g.ability) || ABILITIES[0];
  const branch = branchForGame(g)?.id;
  const strength = (power) =>
    ({
      shockwave: Math.round(
        (branch === 'demolition'
          ? 160
          : branch === 'siegebreaker'
            ? 200
            : branch === 'bulwark'
              ? 40
              : 80) *
          power *
          p.power,
      ),
      mend: number(
        (branch === 'sanctuary' ? 5 : branch === 'fallout-medic' ? 20 : 35) *
          power,
      ),
      surge: `${number(Math.min(16, (branch === 'redline' ? 5 : 8) * power))}s`,
      freeze: `${number((branch === 'shatter' ? 2 : branch === 'permafrost' ? 0.25 : 4) * power)}s`,
      turret: Math.round(
        (branch === 'swarm' ? 12 : branch === 'battery' ? 70 : 28) *
          power *
          p.power,
      ),
    })[ability.id];
  const abilityLabel = {
    shockwave: 'Shockwave damage',
    mend:
      branch === 'sanctuary'
        ? 'Sanctuary healing / second'
        : 'Field mend healing',
    surge: 'Overclock duration',
    freeze:
      branch === 'permafrost' ? 'Frost field chill duration' : 'Cryo duration',
    turret: 'Sentry damage / shot',
  }[ability.id];
  const stats = {
    damage: [
      'all-weapon damage',
      `${Math.round(p.power * 100)}% → ${Math.round((p.power + 0.25) * 100)}%`,
    ],
    rate: [
      'all-weapon fire interval',
      `${Math.round(p.haste * 100)}% → ${Math.round(p.haste * 0.88 * 100)}%`,
    ],
    speed: ['movement speed', `${p.speed} → ${p.speed + 18}`],
    heal: [
      'maximum health',
      `${p.maxHp} → ${p.maxHp + 20}`,
      'Restore 40 health immediately',
    ],
    magnet: ['pickup radius', `${p.magnet} → ${p.magnet + 45}`],
    multishot: ['extra projectiles', '+1 carbine round · +2 shotgun pellets'],
    armor: ['damage blocked / hit', `${p.armor} → ${p.armor + 2}`],
    regen: ['health / second', `${number(p.regen)} → ${number(p.regen + 0.6)}`],
    crit: [
      'critical hit chance',
      `${Math.round(p.crit * 100)}% → ${Math.round((p.crit + 0.1) * 100)}%`,
    ],
    area: [
      'blast & orbit size',
      `${Math.round(p.area * 100)}% → ${Math.round((p.area + 0.2) * 100)}%`,
    ],
    pierce: ['carbine penetrations', `${p.pierce} → ${p.pierce + 1} extra`],
    dash: [
      'dash cooldown',
      `${number(p.dashCooldown)}s → ${number(p.dashCooldown * 0.85)}s`,
    ],
    nova: [
      abilityLabel,
      `${strength(p.novaPower)} → ${strength(p.novaPower + 0.4)}`,
      `ability cooldown: ${number(abilityCooldown(g))}s → ${number(abilityCooldown(g) * 0.85)}s`,
    ],
    xp: [
      'experience gain',
      `${Math.round(p.xpBonus * 100)}% → ${Math.round((p.xpBonus + 0.2) * 100)}%`,
    ],
  };
  const [label, change, extra] = stats[id] || [
    'effect',
    upgrade?.description || '',
  ];
  const transformations = Object.entries(g.weapons).filter(
    ([key, w]) =>
      w.level === 5 && !w.evolved && EVOLUTIONS[key].mutation === id,
  );
  const evolves = transformations.length > 0;
  const synergy = Object.keys(g.weapons).some(
    (key) => EVOLUTIONS[key].mutation === id,
  );
  return {
    lane: evolves
      ? 'EVOLVE NOW'
      : synergy
        ? 'BUILD SYNERGY'
        : 'FIELD ADAPTATION',
    title: upgrade?.name || id,
    lines: [
      `${label}: ${change}`,
      ...(extra ? [extra] : []),
      ...transformations.map(
        ([key]) => `${WEAPONS[key].name} → ${EVOLUTIONS[key].name}`,
      ),
    ],
    evolves,
    next: (g.modifications[id] || 0) + 1,
  };
}
export function evolutionProgress(g, id) {
  const w = g.weapons[id],
    evolution = EVOLUTIONS[id];
  if (!w || !evolution) return null;
  const mutation = UPGRADES.find((u) => u.id === evolution.mutation);
  const keyReady = (g.modifications[evolution.mutation] || 0) > 0;
  return {
    name: evolution.name,
    rank: w.level,
    evolved: w.evolved,
    keyReady,
    mutation: mutation.name,
    mutationId: mutation.id,
  };
}
