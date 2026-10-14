import { distance, hitEnemy, announce, chooseUpgrades } from './game.js';

export const RELICS = [
  {
    id: 'wildfire',
    name: 'Wildfire seed',
    icon: '♨',
    color: '#ffd096',
    weapon: 'flame',
    description:
      'Burning kills spread their fire to four nearby infected. Burn damage can carry the chain.',
  },
  {
    id: 'icebreaker',
    name: 'Icebreaker',
    icon: '❄',
    color: '#a1edff',
    ability: 'freeze',
    description:
      'Frozen kills burst for 40 base damage within 110m and briefly chill survivors. Shatter bursts do not chain.',
  },
  {
    id: 'fractal',
    name: 'Fractal bearings',
    icon: '◈',
    color: '#e2baff',
    weapon: 'discus',
    description:
      'Each returning Scrap discus releases three piercing shards once on its way home.',
  },
  {
    id: 'blood-circuit',
    name: 'Blood circuit',
    icon: '♡',
    color: '#ffc9c3',
    description:
      'Kills restore 1 health, at most once every 0.5s. Stay aggressive to recover.',
  },
  {
    id: 'afterimage',
    name: 'Afterimage',
    icon: '»',
    color: '#b5f7df',
    description:
      'Dashing leaves a 2s radiation pool that damages pursuing infected.',
  },
  {
    id: 'salvage-heart',
    name: 'Salvage heart',
    icon: 'ϟ',
    color: '#ffe6a1',
    description:
      'Scrap pickups and supply caches reduce your active ability cooldown by 1.5s.',
  },
];
export function chooseRelics(g) {
  const pool = RELICS.filter(
    (r) =>
      !g.relics.includes(r.id) &&
      ((!r.weapon && !r.ability) ||
        (r.weapon && g.weapons[r.weapon]) ||
        r.ability === g.ability),
  );
  if (!pool.length) {
    g.relicDrafts = 0;
    g.buffs.overdrive = 25;
    announce(g, 'NO COMPATIBLE RELICS REMAIN · 25s OVERDRIVE', 4);
    return false;
  }
  const relevant = (r) =>
    (!r.weapon && !r.ability) ||
    (r.weapon && g.weapons[r.weapon]) ||
    r.ability === g.ability;
  const shuffled = pool
    .map((r) => ({ r, roll: g.random() }))
    .sort(
      (a, b) =>
        Number(relevant(b.r)) - Number(relevant(a.r)) || a.roll - b.roll,
    )
    .map((x) => x.r);
  g.relicChoices = shuffled.slice(0, 3).map((r) => r.id);
  g.state = 'relic';
  return true;
}
export function applyRelic(g, id) {
  if (
    g.state !== 'relic' ||
    !g.relicChoices.includes(id) ||
    g.relics.includes(id)
  )
    return false;
  g.relics.push(id);
  g.relicDrafts = Math.max(0, g.relicDrafts - 1);
  g.relicChoices = [];
  g.state = 'playing';
  announce(
    g,
    `${RELICS.find((r) => r.id === id).name.toUpperCase()} INSTALLED`,
    4,
  );
  if (g.relicDrafts > 0) chooseRelics(g);
  else if (g.pendingLevels > 0) chooseUpgrades(g);
  return true;
}
export function frozenBurst(g, e) {
  g.effects.push({
    kind: 'ring',
    x: e.x,
    y: e.y,
    radius: 110,
    color: '#a1edff',
    life: 0.5,
    maxLife: 0.5,
  });
  for (const other of [...g.enemies])
    if (other !== e && other.hp > 0 && distance(other, e) < 110) {
      other.frozen = Math.max(
        other.frozen || 0,
        other.type === 'boss' ? 0.25 : 0.5,
      );
      hitEnemy(g, other, 40, e, 'shatter');
    }
}
export function relicKill(g, e, kind) {
  if (g.relics.includes('blood-circuit') && g.time >= g.relicHealAt) {
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 1);
    g.relicHealAt = g.time + 0.5;
  }
  if (e.burnLeft > 0 && g.relics.includes('wildfire')) {
    for (const other of g.enemies
      .filter(
        (other) =>
          other !== e &&
          other.hp > 0 &&
          !other.burrowLeft &&
          distance(other, e) < 130,
      )
      .slice(0, 4)) {
      other.burnLeft = Math.max(other.burnLeft || 0, 3);
      other.burnDamage = Math.max(other.burnDamage || 0, e.burnDamage || 8);
    }
  }
  if (
    e.frozen > 0 &&
    kind !== 'shatter' &&
    (g.relics.includes('icebreaker') ||
      (g.branch === 'shatter' && g.ability === 'freeze'))
  )
    frozenBurst(g, e);
}
export function returningShards(g, b) {
  if (!g.relics.includes('fractal')) return;
  const angle = Math.atan2(b.vy, b.vx);
  for (const offset of [-0.45, 0, 0.45])
    g.bullets.push({
      x: b.x,
      y: b.y,
      vx: Math.cos(angle + offset) * 520,
      vy: Math.sin(angle + offset) * 520,
      life: 0.65,
      damage: b.damage * 0.45,
      pierce: 2,
      hits: new Set(),
      color: '#e2baff',
    });
}
