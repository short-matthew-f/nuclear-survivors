import { distance, hurtPlayer, spawnEnemy, announce } from './game.js';

export function prepareBoss(e) {
  if (e.parts && e.bossRole === e.phase % 3) return;
  e.bossRole = e.phase % 3;
  const count = e.bossRole === 2 ? 3 : 2;
  e.parts = Array.from({ length: count }, (_, i) => ({
    id: `${e.id}-part-${i}`,
    parent: e.id,
    type: 'boss-part',
    name:
      e.bossRole === 0
        ? 'Anchor'
        : e.bossRole === 1
          ? 'Spore nest'
          : 'Capacitor',
    angle: (i * Math.PI * 2) / count + Math.PI / 2,
    radius: 14,
    hp: e.maxHp * 0.12,
    maxHp: e.maxHp * 0.12,
    x: e.x,
    y: e.y,
    hit: 0,
    color: '#ffe1a1',
  }));
  e.stage = 1;
  e.cycle = 0;
  e.exposed = 0;
  e.telegraph = null;
  positionParts(e);
}
export function positionParts(e) {
  for (const part of e.parts || []) {
    part.x = e.x + Math.cos(part.angle) * 65;
    part.y = e.y + Math.sin(part.angle) * 65;
  }
}
export function bossTargets(g) {
  return g.enemies
    .filter((e) => e.type === 'boss' && e.hp > 0)
    .flatMap((e) => (e.parts || []).filter((p) => p.hp > 0));
}
export function breakBossPart(g, part) {
  const boss = g.enemies.find((e) => e.id === part.parent);
  if (!boss) return;
  boss.exposed = 5;
  boss.telegraph = null;
  boss.attack = 2;
  g.partsBroken++;
  g.scrap += 5;
  announce(
    g,
    `${part.name.toUpperCase()} BROKEN · ${boss.parts.every((p) => p.hp <= 0) ? 'CORE PERMANENTLY EXPOSED' : 'CORE EXPOSED FOR 5s'}`,
    3,
  );
}
function shots(g, e, count, fan = false) {
  for (let i = 0; i < count; i++) {
    const a = fan
      ? Math.atan2(g.player.y - e.y, g.player.x - e.x) +
        (i - (count - 1) / 2) * 0.18
      : (i * Math.PI * 2) / count + g.time * 0.3;
    g.hostile.push({
      x: e.x,
      y: e.y,
      vx: Math.cos(a) * 135,
      vy: Math.sin(a) * 135,
      life: 5,
      radius: 7,
    });
  }
}
function strike(g, e, t) {
  const living = e.parts.filter((p) => p.hp > 0).length;
  if (t.kind === 'charge') {
    const d = Math.hypot(t.tx - e.x, t.ty - e.y) || 1;
    e.vx = ((t.tx - e.x) / d) * (living ? 340 : 220);
    e.vy = ((t.ty - e.y) / d) * (living ? 340 : 220);
    e.charge = 0.75;
  } else if (t.kind === 'slam') {
    g.hazards.push({ x: t.tx, y: t.ty, radius: 95, warn: 0, life: 0.65 });
    shots(g, e, 10 + e.stage * 2);
  } else if (t.kind === 'spores') {
    shots(g, e, 5 + e.stage * 2, true);
    for (let i = 0; i < living && g.enemies.length < 165; i++)
      spawnEnemy(g, 'runner', e.x + (i ? 40 : -40), e.y, 0.7);
  } else if (t.kind === 'bloom') {
    for (let i = 0; i < 3 + e.stage && g.hazards.length < 18; i++) {
      const a = (i * Math.PI * 2) / (3 + e.stage);
      g.hazards.push({
        x: t.tx + Math.cos(a) * 95,
        y: t.ty + Math.sin(a) * 95,
        radius: 45,
        warn: 0.4,
        life: 3,
      });
    }
  } else if (t.kind === 'beams') {
    const count = Math.max(1, living);
    for (let i = 0; i < count && g.hazards.length < 18; i++)
      g.hazards.push({
        kind: 'beam',
        x: e.x,
        y: e.y,
        angle: t.angle + (i * Math.PI * 2) / count,
        length: 440,
        radius: 20,
        warn: 0,
        life: 0.8,
      });
    shots(g, e, 10 + e.stage * 2);
  } else if (t.kind === 'meltdown') {
    for (let i = 0; i < 3 && g.hazards.length < 18; i++) {
      const a = (i * Math.PI * 2) / 3;
      g.hazards.push({
        x: t.tx + Math.cos(a) * 100,
        y: t.ty + Math.sin(a) * 100,
        radius: 55,
        warn: 0.25,
        life: 2,
      });
    }
  }
}
export function updateBoss(g, e, dt) {
  prepareBoss(e);
  const stage = e.hp / e.maxHp > 0.66 ? 1 : e.hp / e.maxHp > 0.33 ? 2 : 3;
  if (stage > e.stage) {
    e.stage = stage;
    announce(g, `${e.name.toUpperCase()} · PHASE ${stage}`, 3);
  }
  e.exposed = Math.max(0, e.exposed - dt);
  if (e.charge > 0) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.charge = Math.max(0, e.charge - dt);
  } else if (e.telegraph) {
    e.telegraph.warn -= dt;
    if (e.telegraph.warn <= 0) {
      strike(g, e, e.telegraph);
      e.telegraph = null;
      e.attack = 4.2 - e.stage * 0.5;
    }
  } else if (e.attack <= 0) {
    const patterns = [
      ['charge', 'slam'],
      ['spores', 'bloom'],
      ['beams', 'meltdown'],
    ][e.bossRole];
    const kind = patterns[e.cycle++ % patterns.length];
    e.telegraph = {
      kind,
      warn: kind === 'charge' ? 1.1 : 1.4,
      tx: g.player.x,
      ty: g.player.y,
      angle: Math.atan2(g.player.y - e.y, g.player.x - e.x),
    };
  } else {
    const d = distance(e, g.player) || 1;
    const move =
      e.bossRole === 2 && d < 260 ? -0.15 : e.bossRole === 1 && d < 210 ? 0 : 1;
    e.x += ((g.player.x - e.x) / d) * e.speed * dt * move;
    e.y += ((g.player.y - e.y) / d) * e.speed * dt * move;
  }
  positionParts(e);
  if (distance(e, g.player) < e.radius + 12) hurtPlayer(g, e.damage);
}
export function beamContains(h, p) {
  const dx = p.x - h.x,
    dy = p.y - h.y;
  const along = dx * Math.cos(h.angle) + dy * Math.sin(h.angle);
  const across = Math.abs(-dx * Math.sin(h.angle) + dy * Math.cos(h.angle));
  return along >= 0 && along < h.length && across < h.radius;
}
