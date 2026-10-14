import { distance, hurtPlayer, hitEnemy } from './game.js';

export function enemyTypeFor(g, roll) {
  const t = g.time,
    zone = g.zone.id;
  if (t > 45 && roll < (zone === 'industrial' ? 0.16 : 0.09)) return 'shield';
  if (t > 70 && roll >= 0.16 && roll < (zone === 'industrial' ? 0.31 : 0.24))
    return 'bomber';
  if (t > 110 && roll >= 0.31 && roll < (zone === 'forest' ? 0.45 : 0.39))
    return 'burrower';
  if (t > 140 && roll >= 0.45 && roll < (zone === 'marsh' ? 0.59 : 0.53))
    return 'healer';
  if (t > 210 && roll > 0.9) return 'splitter';
  if (t > 150 && roll > 0.8) return 'charger';
  if (t > 100 && roll > 0.7) return 'spitter';
  if (t > 60 && roll > 0.6) return 'brute';
  if (t > 25 && roll > 0.53) return 'runner';
  return 'walker';
}
// Return true when a special state owns movement for this frame.
export function updateEnemyBehavior(g, e, dt) {
  const p = g.player;
  if (e.burnLeft > 0) {
    e.burnLeft = Math.max(0, e.burnLeft - dt);
    e.burnClock = (e.burnClock || 0) - dt;
    if (e.burnClock <= 0) {
      e.burnClock = 0.5;
      hitEnemy(g, e, e.burnDamage || 6);
    }
  }
  if (e.hp <= 0) return true;
  if (e.frozen > 0) {
    e.frozen = Math.max(0, e.frozen - dt);
    return true;
  }
  if (e.type === 'burrower') {
    if (e.burrowLeft > 0) {
      e.burrowLeft = Math.max(0, e.burrowLeft - dt);
      return true;
    }
    if (e.attack <= 0 && distance(e, p) < 700) {
      const a = g.random() * Math.PI * 2;
      e.x = p.x + Math.cos(a) * 95;
      e.y = p.y + Math.sin(a) * 95;
      e.burrowLeft = 1.6;
      e.attack = 6;
      return true;
    }
  }
  if (e.type === 'bomber') {
    if (e.detonate > 0) {
      e.detonate = Math.max(0, e.detonate - dt);
      if (e.detonate === 0) {
        if (distance(e, p) < 95)
          hurtPlayer(g, e.damage, {
            kind: 'explosion',
            enemy: e.type,
            x: e.x,
            y: e.y,
          });
        g.effects.push({
          kind: 'ring',
          x: e.x,
          y: e.y,
          radius: 95,
          life: 0.5,
          maxLife: 0.5,
          color: '#ffae83',
        });
        e.hp = 0;
      }
      return true;
    }
    if (distance(e, p) < 85) {
      e.detonate = 0.9;
      return true;
    }
  }
  if (e.type === 'healer' && e.attack <= 0) {
    e.attack = 3;
    for (const ally of g.enemies)
      if (
        ally !== e &&
        ally.hp > 0 &&
        ally.type !== 'boss' &&
        distance(ally, e) < 170
      )
        ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * 0.08);
    g.effects.push({
      kind: 'ring',
      x: e.x,
      y: e.y,
      radius: 170,
      life: 0.7,
      maxLife: 0.7,
      color: '#a2e8ca',
    });
  }
  return false;
}
