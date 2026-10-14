import { branchForGame, abilityCooldown } from './mastery.js';
import { ABILITIES } from './content.js';
import { announce, burst, distance, hitEnemy } from './game.js';

export function abilityFor(g) {
  return ABILITIES.find((a) => a.id === g.ability) || ABILITIES[0];
}
export function activateAbility(g) {
  if (g.state !== 'playing' || g.player.novaTimer > 0) return false;
  const p = g.player,
    ability = abilityFor(g),
    radius = 180 * p.area,
    branch = branchForGame(g)?.id;
  const ring = (size, color) =>
    g.effects.push({
      kind: 'ring',
      x: p.x,
      y: p.y,
      radius: size,
      life: 0.6,
      maxLife: 0.6,
      color,
    });
  if (ability.id === 'shockwave') {
    const size =
      (branch === 'demolition' ? 120 : branch === 'siegebreaker' ? 100 : 180) *
      p.area;
    const damage =
      (branch === 'demolition'
        ? 160
        : branch === 'siegebreaker'
          ? 200
          : branch === 'bulwark'
            ? 40
            : 80) * p.novaPower;
    for (const e of [...g.enemies])
      if (distance(e, p) < size + e.radius) {
        hitEnemy(g, e, damage);
        if (branch === 'repulsor' && e.type !== 'boss') {
          const d = distance(e, p) || 1;
          e.x += ((e.x - p.x) / d) * 100;
          e.y += ((e.y - p.y) / d) * 100;
        }
      }
    if (branch === 'bulwark') p.invulnerable = Math.max(p.invulnerable, 6);
    g.hostile = g.hostile.filter((b) => distance(b, p) > radius);
    ring(size, '#d0f29a');
    g.shake = 10;
  }
  if (ability.id === 'mend') {
    const heal =
      branch === 'fallout-medic' ? 20 : branch === 'sanctuary' ? 0 : 35;
    p.hp = Math.min(p.maxHp, p.hp + heal * p.novaPower);
    if (branch === 'fallout-medic')
      for (const e of [...g.enemies])
        if (distance(e, p) < radius) hitEnemy(g, e, 70 * p.novaPower);
    if (branch === 'sanctuary')
      g.abilityFields.push({
        kind: 'healing',
        x: p.x,
        y: p.y,
        radius: 100 * p.area,
        life: 8,
        power: p.novaPower,
      });
    p.invulnerable = Math.max(p.invulnerable, 2);
    ring(100, '#ffdfd1');
    burst(g, p.x, p.y, '#ffd0bf', 20);
    announce(
      g,
      branch === 'sanctuary'
        ? 'SANCTUARY · STAY IN THE HEALING FIELD'
        : `FIELD MEND · +${Math.round(heal * p.novaPower)} HEALTH`,
      2,
    );
  }
  if (ability.id === 'surge') {
    g.buffs.surge = Math.min(16, (branch === 'redline' ? 5 : 8) * p.novaPower);
    g.hostile = g.hostile.filter((b) => distance(b, p) > radius);
    ring(radius, '#a8deff');
    announce(g, 'OVERCLOCK · FASTER FIRE & MOVEMENT', 3);
  }
  if (ability.id === 'freeze') {
    if (branch === 'permafrost')
      g.abilityFields.push({
        kind: 'frost',
        x: p.x,
        y: p.y,
        radius: 140 * p.area,
        life: 6,
        power: p.novaPower,
      });
    for (const e of g.enemies)
      if (
        branch !== 'permafrost' &&
        distance(e, p) < radius + 40 &&
        !(e.burrowLeft > 0)
      )
        e.frozen = Math.max(
          e.frozen || 0,
          (branch === 'shatter' ? 2 : 4) *
            p.novaPower *
            (e.type === 'boss' ? 0.5 : 1),
        );
    g.hostile = g.hostile.filter((b) => distance(b, p) > radius + 40);
    ring(radius + 40, '#a1edff');
    announce(g, 'CRYO FIELD · INFECTED FROZEN', 2);
  }
  if (ability.id === 'turret') {
    const mobile = branch === 'swarm',
      battery = branch === 'battery';
    for (let i = 0; i < (mobile ? 2 : 1); i++)
      g.turrets.push({
        x: p.x,
        y: p.y,
        life: mobile ? 9 : battery ? 16 : 12,
        clock: 0,
        damage: (mobile ? 12 : battery ? 70 : 28) * p.novaPower,
        angle: p.angle,
        mobile,
        offset: i ? Math.PI : 0,
        interval: mobile ? 0.22 : battery ? 0.7 : 0.3,
        pierce: battery ? 3 : 0,
        range: battery ? 500 : 420,
      });
    if (g.turrets.length > 2) g.turrets.splice(0, g.turrets.length - 2);
    ring(70, '#a8d7ff');
    announce(
      g,
      `${branch === 'swarm' ? 'MOBILE SWARM · 9' : branch === 'battery' ? 'SIEGE BATTERY · 16' : 'SENTRY ONLINE · 12'} SECONDS`,
      2,
    );
  }
  g.abilityUses++;
  p.novaTimer = abilityCooldown(g);
  return true;
}
export function updateAbilities(g, dt) {
  g.buffs.surge = Math.max(0, (g.buffs.surge || 0) - dt);
  g.abilityPulse -= dt;
  if (
    g.buffs.surge > 0 &&
    branchForGame(g)?.id === 'chain-reactor' &&
    g.abilityPulse <= 0
  ) {
    g.abilityPulse = 1;
    for (const e of g.enemies
      .filter((e) => e.hp > 0 && !e.burrowLeft && distance(e, g.player) < 240)
      .slice(0, 3)) {
      hitEnemy(g, e, 18 * g.player.novaPower);
      g.effects.push({
        kind: 'arc',
        x: g.player.x,
        y: g.player.y,
        tx: e.x,
        ty: e.y,
        color: '#b9e8ff',
        life: 0.25,
        maxLife: 0.25,
      });
    }
  }
  for (const field of g.abilityFields) {
    const activeTime = Math.min(dt, Math.max(0, field.life));
    field.life -= dt;
    if (
      activeTime > 0 &&
      field.kind === 'healing' &&
      distance(g.player, field) < field.radius
    )
      g.player.hp = Math.min(
        g.player.maxHp,
        g.player.hp + 5 * field.power * activeTime,
      );
    if (activeTime > 0 && field.kind === 'frost')
      for (const e of g.enemies)
        if (e.hp > 0 && !e.burrowLeft && distance(e, field) < field.radius)
          e.frozen = Math.max(
            e.frozen || 0,
            (e.type === 'boss' ? 0.1 : 0.25) * field.power,
          );
  }
  g.abilityFields = g.abilityFields.filter((f) => f.life > 0);
  for (const turret of g.turrets) {
    if (turret.mobile) {
      const angle = g.time * 2 + (turret.offset || 0);
      turret.x = g.player.x + Math.cos(angle) * 45;
      turret.y = g.player.y + Math.sin(angle) * 45;
    }
    turret.life -= dt;
    turret.clock -= dt;
    const target = g.enemies
      .filter(
        (e) =>
          e.hp > 0 &&
          !(e.burrowLeft > 0) &&
          distance(e, turret) < (turret.range || 420),
      )
      .sort((a, b) => distance(a, turret) - distance(b, turret))[0];
    if (turret.clock <= 0 && target) {
      turret.angle = Math.atan2(target.y - turret.y, target.x - turret.x);
      g.bullets.push({
        x: turret.x,
        y: turret.y,
        vx: Math.cos(turret.angle) * 600,
        vy: Math.sin(turret.angle) * 600,
        damage: turret.damage,
        life: 0.8,
        pierce: turret.pierce || 0,
        hits: new Set(),
        color: '#b6d9ff',
      });
      turret.clock = turret.interval || 0.3;
      g.shotsFired++;
    }
  }
  g.turrets = g.turrets.filter((t) => t.life > 0);
}
