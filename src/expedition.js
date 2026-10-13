import { FIELD_EVENTS, CHAPTERS } from './content.js';
import { announce, burst, distance, spawnEnemy } from './game.js';

export function beginEvent(g, kind) {
  if (g.fieldEvent || !FIELD_EVENTS[kind]) return false;
  const angle = g.random() * Math.PI * 2;
  const event = {
    kind,
    x: g.player.x + Math.cos(angle) * 280,
    y: g.player.y + Math.sin(angle) * 280,
    progress: 0,
    expires: g.time + 80,
    guards: [],
  };
  if (kind === 'convoy') {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const e = spawnEnemy(
        g,
        i ? 'charger' : 'brute',
        event.x + Math.cos(a) * 65,
        event.y + Math.sin(a) * 65,
      );
      makeElite(e);
      event.guards.push(e.id);
    }
  }
  g.fieldEvent = event;
  announce(g, `${FIELD_EVENTS[kind].name} · FOLLOW THE SIGNAL`, 5);
  return true;
}
export function makeElite(enemy) {
  if (enemy.elite || enemy.type === 'boss') return enemy;
  enemy.elite = true;
  enemy.hp *= 2.2;
  enemy.maxHp = enemy.hp;
  enemy.radius *= 1.15;
  enemy.speed *= 1.12;
  enemy.xp *= 3;
  enemy.name = `Elite ${enemy.name}`;
  return enemy;
}
export function updateExpedition(g, dt) {
  g.buffs.overdrive = Math.max(0, g.buffs.overdrive - dt);
  if (!g.fieldEvent && g.time >= g.nextEvent) {
    const kinds = ['rescue', 'relay', 'convoy'];
    const required = missionGoals(g).find(
      (goal) => goal.progress < goal.target && FIELD_EVENTS[goal.kind],
    );
    beginEvent(g, required?.kind || kinds[g.eventIndex % kinds.length]);
    g.eventIndex++;
    g.nextEvent = g.time + 115;
  }
  const event = g.fieldEvent;
  if (!event) return;
  if (g.time >= event.expires) {
    announce(g, 'FIELD SIGNAL LOST · KEEP MOVING', 3);
    g.fieldEvent = null;
    return;
  }
  const guarded = event.guards.some((id) =>
    g.enemies.some((e) => e.id === id && e.hp > 0),
  );
  if (!guarded && distance(g.player, event) < 65) event.progress += dt;
  else event.progress = Math.max(0, event.progress - dt * 0.2);
  const spec = FIELD_EVENTS[event.kind];
  if (event.progress < spec.duration) return;
  g.eventsCompleted++;
  g.eventCounts[event.kind] = (g.eventCounts[event.kind] || 0) + 1;
  g.scrap += spec.reward;
  if (event.kind === 'rescue') {
    g.rescues++;
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 50);
  }
  if (event.kind === 'relay') {
    g.buffs.overdrive = 25;
    for (const c of g.cores) {
      c.x = g.player.x;
      c.y = g.player.y;
    }
  }
  if (event.kind === 'convoy')
    g.supplies.push({ x: event.x, y: event.y, kind: 'relic', id: g.nextId++ });
  burst(g, event.x, event.y, spec.color, 24);
  announce(g, `${spec.name} SECURED · +${spec.reward} SALVAGE`, 5);
  g.fieldEvent = null;
}
export function commitOvertime(g) {
  if (
    g.state !== 'playing' ||
    !g.extraction ||
    g.overtime ||
    g.daily ||
    g.mode === 'endless'
  )
    return false;
  g.overtime = true;
  g.extraction = null;
  g.extractProgress = 0;
  g.extractionAt = g.time + 240;
  g.buffs.overdrive = 30;
  g.player.hp = g.player.maxHp;
  announce(g, 'OVERTIME · FOUR MORE MINUTES · 75% BONUS SALVAGE', 7);
  return true;
}

export function missionGoals(g) {
  const chapter = CHAPTERS.find((c) => c.id === g.chapter);
  return (chapter?.goals || []).map((goal) => ({
    ...goal,
    progress:
      goal.kind === 'boss' ? g.bossKills : g.eventCounts?.[goal.kind] || 0,
  }));
}
export function missionReady(g) {
  return missionGoals(g).every((goal) => goal.progress >= goal.target);
}
