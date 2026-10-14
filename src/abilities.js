import { ABILITIES } from './content.js';
import { announce, burst, distance, hitEnemy } from './game.js';

export function abilityFor(g) {
  return ABILITIES.find((a) => a.id === g.ability) || ABILITIES[0];
}
export function activateAbility(g) {
  if (g.state !== 'playing' || g.player.novaTimer > 0) return false;
  const p = g.player,
    ability = abilityFor(g),
    radius = 180 * p.area;
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
    for (const e of [...g.enemies])
      if (distance(e, p) < radius + e.radius) hitEnemy(g, e, 80 * p.novaPower);
    g.hostile = g.hostile.filter((b) => distance(b, p) > radius);
    ring(radius, '#d0f29a');
    g.shake = 10;
  }
  if (ability.id === 'mend') {
    p.hp = Math.min(p.maxHp, p.hp + 35 * p.novaPower);
    p.invulnerable = Math.max(p.invulnerable, 2);
    ring(100, '#ffdfd1');
    burst(g, p.x, p.y, '#ffd0bf', 20);
    announce(g, `FIELD MEND · +${Math.round(35 * p.novaPower)} HEALTH`, 2);
  }
  if (ability.id === 'surge') {
    g.buffs.surge = Math.min(16, 8 * p.novaPower);
    g.hostile = g.hostile.filter((b) => distance(b, p) > radius);
    ring(radius, '#a8deff');
    announce(g, 'OVERCLOCK · FASTER FIRE & MOVEMENT', 3);
  }
  if (ability.id === 'freeze') {
    for (const e of g.enemies)
      if (distance(e, p) < radius + 40 && !(e.burrowLeft > 0))
        e.frozen = Math.max(
          e.frozen || 0,
          4 * p.novaPower * (e.type === 'boss' ? 0.5 : 1),
        );
    g.hostile = g.hostile.filter((b) => distance(b, p) > radius + 40);
    ring(radius + 40, '#a1edff');
    announce(g, 'CRYO FIELD · INFECTED FROZEN', 2);
  }
  if (ability.id === 'turret') {
    g.turrets.push({
      x: p.x,
      y: p.y,
      life: 12,
      clock: 0,
      damage: 28 * p.novaPower,
      angle: p.angle,
    });
    if (g.turrets.length > 2) g.turrets.shift();
    ring(70, '#a8d7ff');
    announce(g, 'SENTRY ONLINE · 12 SECONDS', 2);
  }
  p.novaTimer = p.novaCooldown;
  return true;
}
export function updateAbilities(g, dt) {
  g.buffs.surge = Math.max(0, (g.buffs.surge || 0) - dt);
  for (const turret of g.turrets) {
    turret.life -= dt;
    turret.clock -= dt;
    const target = g.enemies
      .filter(
        (e) => e.hp > 0 && !(e.burrowLeft > 0) && distance(e, turret) < 420,
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
        pierce: 0,
        hits: new Set(),
        color: '#b6d9ff',
      });
      turret.clock = 0.3;
      g.shotsFired++;
    }
  }
  g.turrets = g.turrets.filter((t) => t.life > 0);
}
