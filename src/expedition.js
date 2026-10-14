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
  if (['escort', 'reactor', 'defense'].includes(kind)) {
    Object.assign(event, {
      health: kind === 'escort' ? 180 : 120,
      maxHealth: kind === 'escort' ? 180 : 120,
      wave: 0,
      stage: 0,
      clock: 0,
      targetX: event.x + 330,
      targetY: event.y + 180,
    });
    event.expires = g.time + 100;
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
    const kinds = ['rescue', 'escort', 'relay', 'reactor', 'convoy', 'defense'];
    const required = missionGoals(g).find(
      (goal) => goal.progress < goal.target && FIELD_EVENTS[goal.kind],
    );
    beginEvent(g, required?.kind || kinds[g.eventIndex % kinds.length]);
    g.eventIndex++;
    g.nextEvent = g.time + 75;
  }
  const event = g.fieldEvent;
  if (!event) return;
  if (g.time >= event.expires) {
    announce(g, 'FIELD SIGNAL LOST · KEEP MOVING', 3);
    g.fieldEvent = null;
    return;
  }
  if (['escort', 'reactor', 'defense'].includes(event.kind)) {
    updateEncounter(g, event, dt);
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

function encounterWave(g, event, count) {
  event.guards = [];
  for (let i = 0; i < count && g.enemies.length < 165; i++) {
    const a = (i * Math.PI * 2) / count + event.wave;
    const e = spawnEnemy(
      g,
      i === 0 ? 'brute' : i % 3 === 0 ? 'bomber' : 'runner',
      event.x + Math.cos(a) * 175,
      event.y + Math.sin(a) * 175,
      0.85,
    );
    event.guards.push(e.id);
  }
  event.wave++;
}
export function eventTarget(event) {
  if (event.kind === 'reactor' && event.stage < 3) {
    const a = (event.stage * Math.PI * 2) / 3;
    return { x: event.x + Math.cos(a) * 90, y: event.y + Math.sin(a) * 90 };
  }
  return event;
}
export function eventInstruction(g, event) {
  if (event.kind === 'escort')
    return `ESCORT TRUCK · ${Math.ceil(event.health)}/${event.maxHealth} HULL · STAY WITHIN 100m`;
  if (event.kind === 'reactor')
    return event.stage < 3
      ? `DISABLE TERMINAL ${event.stage + 1}/3 · HOLD IN ITS CIRCLE`
      : 'CONTAINMENT · HOLD AT THE CORE';
  if (event.kind === 'defense')
    return `DEFEND SURVIVORS · WAVE ${Math.min(3, event.wave)}/3 · ${Math.ceil(event.health)} HEALTH`;
  return FIELD_EVENTS[event.kind].instruction;
}
function updateEncounter(g, event, dt) {
  const spec = FIELD_EVENTS[event.kind];
  event.clock += dt;
  if (event.kind === 'escort') {
    if (event.wave < 2 && event.progress >= event.wave * 9)
      encounterWave(g, event, 4 + event.wave);
    if (distance(g.player, event) < 100) {
      event.progress += dt;
      const d =
        Math.hypot(event.targetX - event.x, event.targetY - event.y) || 1;
      event.x += ((event.targetX - event.x) / d) * Math.min(d, 22 * dt);
      event.y += ((event.targetY - event.y) / d) * Math.min(d, 22 * dt);
    }
  }
  if (event.kind === 'defense') {
    if (event.wave < 3 && event.progress >= event.wave * 6)
      encounterWave(g, event, 3 + event.wave);
    const guarded = event.guards.some((id) =>
      g.enemies.some((e) => e.id === id && e.hp > 0),
    );
    if (!guarded && distance(g.player, event) < 80) event.progress += dt;
  }
  if (event.kind === 'reactor') {
    if (event.wave === 0) encounterWave(g, event, 4);
    const target = eventTarget(event);
    if (distance(g.player, target) < 45) {
      event.progress += dt;
      const nextStage = Math.min(3, Math.floor(event.progress / 3));
      if (nextStage > event.stage) {
        event.stage = nextStage;
        announce(
          g,
          event.stage < 3
            ? `TERMINAL ${event.stage}/3 OFFLINE · NEXT TERMINAL MARKED`
            : 'ALL TERMINALS OFFLINE · HOLD CONTAINMENT',
          3,
        );
      }
    }
    if (event.clock >= 4 && g.hazards.length < 16) {
      event.clock = 0;
      // The active console stays clear; the other two zones vent with a warning.
      const a = ((event.stage + 1) * Math.PI * 2) / 3;
      g.hazards.push({
        x: event.x + Math.cos(a) * 130,
        y: event.y + Math.sin(a) * 130,
        radius: 40,
        warn: 1.5,
        life: 3,
      });
    }
  }
  if (event.kind !== 'reactor') {
    const attackers = g.enemies.filter(
      (e) => e.hp > 0 && !e.burrowLeft && distance(e, event) < 55,
    ).length;
    event.health = Math.max(0, event.health - attackers * 7 * dt);
    if (event.health <= 0) {
      announce(g, 'FIELD OBJECTIVE LOST · NO REWARD', 4);
      g.fieldEvent = null;
      return;
    }
  }
  if (event.progress < spec.duration) return;
  g.eventsCompleted++;
  g.eventCounts[event.kind] = (g.eventCounts[event.kind] || 0) + 1;
  g.scrap += spec.reward;
  if (event.kind === 'defense') {
    g.rescues += 2;
    g.eventCounts.rescue = (g.eventCounts.rescue || 0) + 1;
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 50);
  }
  if (event.kind === 'reactor') g.buffs.overdrive = 25;
  g.supplies.push({ x: event.x, y: event.y, kind: 'relic', id: g.nextId++ });
  if (event.kind === 'escort')
    g.supplies.push({
      x: event.x + 20,
      y: event.y,
      kind: 'medkit',
      id: g.nextId++,
    });
  burst(g, event.x, event.y, spec.color, 30);
  announce(
    g,
    `${spec.name} COMPLETE · +${spec.reward} SCRAP · RELIC RECOVERED`,
    5,
  );
  g.fieldEvent = null;
}
