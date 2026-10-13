import {
  DURATION,
  UPGRADES,
  ENEMIES,
  OPERATORS,
  ZONES,
  BOSS_NAMES,
  WEAPONS,
  EVOLUTIONS,
  DIFFICULTIES,
  PERKS,
} from './content.js';
import {
  updateExpedition,
  makeElite,
  missionReady,
  missionGoals,
} from './expedition.js';
import { weaponPattern, WEAPON_LIMIT, WEAPON_STEPS } from './build.js';
export { DURATION, UPGRADES } from './content.js';
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function seededRandom(seed) {
  let value = 2166136261;
  for (const c of String(seed))
    value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  const random = () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  random.getState = () => value;
  random.setState = (state) => {
    value = state | 0;
  };
  return random;
}
export function createGame(random = Math.random, options = {}) {
  const operator =
    OPERATORS.find((o) => o.id === options.operator) || OPERATORS[0];
  const zone = ZONES.find((z) => z.id === options.zone) || ZONES[0];
  const research = options.research || {};
  const difficulty =
    DIFFICULTIES.find((d) => d.id === options.difficulty) || DIFFICULTIES[1];
  const perk = PERKS.find((p) => p.id === options.perk)?.id || 'none';
  const hp =
    operator.hp + (research.vitality || 0) * 10 + (perk === 'medic' ? 30 : 0);
  const g = {
    random,
    operator,
    zone,
    mode: options.mode || 'extraction',
    difficulty,
    perk,
    chapter: options.chapter || null,
    daily: options.daily || null,
    extractionAt: DURATION,
    overtime: false,
    eventsCompleted: 0,
    eventCounts: {},
    rescues: 0,
    eliteKills: 0,
    enemyKills: {},
    fieldEvent: null,
    eventIndex: 0,
    nextEvent: 40,
    buffs: { overdrive: 0 },
    revives: 0,
    shotsFired: 0,
    damageTaken: 0,
    state: 'ready',
    time: 0,
    kills: 0,
    bossKills: 0,
    level: 1,
    xp: 0,
    xpNeeded: 8,
    scrap: 0,
    crates: 0,
    distance: 0,
    damageDealt: 0,
    player: {
      x: 0,
      y: 0,
      hp,
      maxHp: hp,
      speed: operator.speed,
      damage: 24,
      interval: 0.52,
      magnet: 80 + (research.salvage || 0) * 15 + (perk === 'magnet' ? 60 : 0),
      shots: 1,
      invulnerable: 0,
      armor: operator.id === 'bastion' ? 3 : 0,
      regen:
        (operator.id === 'nomad' ? 0.2 : 0) + (research.recovery || 0) * 0.15,
      crit: 0.05,
      area: 1,
      pierce: 0,
      xpBonus: 1,
      power: 1 + (research.power || 0) * 0.08,
      haste: operator.id === 'spark' ? 0.88 : 1,
      dashCooldown: 5,
      dashTimer: 0,
      dashLeft: 0,
      dashX: 1,
      dashY: 0,
      novaCooldown: 18,
      novaTimer: 0,
      novaPower: operator.id === 'bastion' ? 1.5 : 1,
      angle: -Math.PI / 4,
    },
    focusWeapon: operator.weapon,
    weapons: { [operator.weapon]: { level: 1, clock: 0, evolved: false } },
    enemies: [],
    bullets: [],
    hostile: [],
    cores: [],
    particles: [],
    effects: [],
    numbers: [],
    mines: [],
    hazards: [],
    supplies: [{ x: 160, y: 70, kind: 'crate', id: 0 }],
    modifications: {},
    spawnClock: 0,
    shotClock: 0,
    pendingLevels: 0,
    choices: [],
    nextId: 1,
    bossIndex: 0,
    nextSupply: 24,
    nextHazard: 35,
    nextHorde: 45,
    hordeUntil: 0,
    eventText: 'THE ZONE IS LISTENING',
    eventUntil: 5,
    shake: 0,
    extraction: null,
    extractProgress: 0,
    contract: { kills: 0, crates: 0, boss: 0 },
    rerolls: perk === 'magnet' ? 3 : 2,
    settled: false,
  };
  return g;
}
export function announce(g, text, seconds = 4) {
  g.eventText = text;
  g.eventUntil = g.time + seconds;
}
export function chooseUpgrades(g) {
  const pool = UPGRADES.filter(
    (u) =>
      (g.modifications[u.id] || 0) < u.cap &&
      (!u.weapon || g.weapons[u.weapon]) &&
      (!g.weapons[u.id] || g.weapons[u.id].level < 5) &&
      (!WEAPONS[u.id] ||
        g.weapons[u.id] ||
        Object.keys(g.weapons).length < WEAPON_LIMIT) &&
      (u.id !== 'multishot' || g.weapons.carbine || g.weapons.scatter),
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(g.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const growing = pool.filter((u) => g.weapons[u.id]);
  const focus = growing.find((u) => u.id === g.focusWeapon) || growing[0];
  const mature = Object.entries(g.weapons)
    .sort(
      ([a], [b]) => Number(b === g.focusWeapon) - Number(a === g.focusWeapon),
    )
    .find(
      ([id, w]) =>
        w.level >= 3 &&
        !w.evolved &&
        pool.some((u) => u.id === EVOLUTIONS[id].mutation) &&
        !(g.modifications[EVOLUTIONS[id].mutation] > 0),
    );
  const synergy = mature
    ? pool.find((u) => u.id === EVOLUTIONS[mature[0]].mutation)
    : pool.find((u) => !WEAPONS[u.id]);
  const newWeapon = pool.find((u) => WEAPONS[u.id] && !g.weapons[u.id]);
  g.choices = [...new Set([focus, synergy, newWeapon].filter(Boolean))];
  for (const u of pool)
    if (g.choices.length < 3 && !g.choices.includes(u)) g.choices.push(u);
  if (!g.choices.length) {
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 30);
    g.pendingLevels = 0;
    g.state = 'playing';
    return;
  }
  g.state = 'upgrade';
}
export function reroll(g) {
  if (g.state !== 'upgrade' || g.rerolls <= 0) return false;
  g.rerolls--;
  chooseUpgrades(g);
  return true;
}
export function applyUpgrade(g, id) {
  if (g.state !== 'upgrade' || !g.choices.some((u) => u.id === id))
    return false;
  const p = g.player;
  if (id === 'damage') p.power += 0.25;
  if (id === 'rate') p.haste *= 0.88;
  if (id === 'speed') p.speed += 18;
  if (id === 'heal') {
    p.maxHp += 20;
    p.hp = Math.min(p.maxHp, p.hp + 40);
  }
  if (id === 'magnet') p.magnet += 45;
  if (id === 'multishot') p.shots++;
  if (id === 'armor') p.armor += 2;
  if (id === 'regen') p.regen += 0.6;
  if (id === 'crit') p.crit += 0.1;
  if (id === 'area') p.area += 0.2;
  if (id === 'pierce') p.pierce++;
  if (id === 'dash') p.dashCooldown *= 0.85;
  if (id === 'nova') {
    p.novaPower += 0.4;
    p.novaCooldown *= 0.85;
  }
  if (id === 'xp') p.xpBonus += 0.2;
  if (Object.hasOwn(WEAPONS, id)) {
    if (!g.weapons[id]) g.weapons[id] = { level: 1, clock: 0, evolved: false };
    else g.weapons[id].level++;
    g.focusWeapon = id;
    g.weapons[id].clock = 0;
  }
  g.modifications[id] = (g.modifications[id] || 0) + 1;
  const chosen = UPGRADES.find((u) => u.id === id);
  announce(
    g,
    WEAPONS[id]
      ? `${WEAPONS[id].name.toUpperCase()} · ${WEAPON_STEPS[id][g.weapons[id].level - 1].toUpperCase()}`
      : `${chosen.name.toUpperCase()} INSTALLED`,
    4,
  );
  burst(g, p.x, p.y, WEAPONS[id]?.color || '#d7f5a8', 18);
  g.effects.push({
    kind: 'ring',
    x: p.x,
    y: p.y,
    radius: 70,
    life: 0.55,
    maxLife: 0.55,
    color: WEAPONS[id]?.color || '#d7f5a8',
  });
  checkEvolutions(g);
  g.pendingLevels = Math.max(0, g.pendingLevels - 1);
  g.state = 'playing';
  if (g.pendingLevels > 0) chooseUpgrades(g);
  return true;
}
export function checkEvolutions(g) {
  for (const [id, evolution] of Object.entries(EVOLUTIONS)) {
    const requirement = evolution.mutation;
    const w = g.weapons[id];
    if (
      w &&
      w.level === 5 &&
      !w.evolved &&
      (g.modifications[requirement] || 0) >= 1
    ) {
      w.evolved = true;
      w.clock = 0;
      g.shake = 8;
      burst(g, g.player.x, g.player.y, WEAPONS[id].color, 35);
      g.effects.push({
        kind: 'ring',
        x: g.player.x,
        y: g.player.y,
        radius: 180,
        life: 0.9,
        maxLife: 0.9,
        color: WEAPONS[id].color,
      });
      announce(g, `${evolution.name.toUpperCase()} EVOLVED`, 6);
    }
  }
}
export function collectXp(g, amount) {
  g.xp += amount * g.player.xpBonus;
  while (g.xp >= g.xpNeeded) {
    g.xp -= g.xpNeeded;
    g.level++;
    g.pendingLevels++;
    g.xpNeeded = Math.ceil(g.xpNeeded * 1.18);
  }
  if (g.pendingLevels > 0 && g.state === 'playing') chooseUpgrades(g);
}
export function hurtPlayer(g, damage) {
  const p = g.player;
  if (p.invulnerable > 0 || g.state !== 'playing') return;
  const received = Math.max(1, damage - p.armor);
  g.damageTaken += Math.min(p.hp, received);
  p.hp = Math.max(0, p.hp - received);
  p.invulnerable = 0.65;
  g.shake = 8;
  if (p.hp === 0 && g.perk === 'phoenix' && g.revives === 0) {
    g.revives++;
    p.hp = p.maxHp * 0.5;
    p.invulnerable = 5;
    g.hostile = [];
    burst(g, p.x, p.y, '#fff0ad', 30);
    announce(g, 'LAST LIGHT · ONE MORE CHANCE', 5);
  } else if (p.hp === 0) g.state = 'dead';
}
export function burst(g, x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = g.random() * Math.PI * 2,
      s = 25 + g.random() * 100;
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.4 + g.random() * 0.35,
      color,
    });
  }
  if (g.particles.length > 350) g.particles.splice(0, g.particles.length - 350);
}
export function hitEnemy(g, e, amount) {
  if (e.hp <= 0) return;
  const critical = g.random() < g.player.crit;
  const damage =
    amount *
    g.player.power *
    (critical ? 2 : 1) *
    (g.buffs.overdrive > 0 ? 1.6 : 1) *
    (g.perk === 'hunter' && (e.elite || e.type === 'boss') ? 1.25 : 1);
  e.hp -= damage;
  e.hit = 0.12;
  g.damageDealt += damage;
  if (g.numbers.length < 45)
    g.numbers.push({
      x: e.x,
      y: e.y - e.radius,
      value: Math.round(damage),
      critical,
      life: 0.65,
    });
  if (e.hp > 0) return;
  g.kills++;
  g.enemyKills[e.type] = (g.enemyKills[e.type] || 0) + 1;
  if (e.elite) {
    g.eliteKills++;
    g.scrap += 8;
  }
  g.cores.push({ x: e.x, y: e.y, value: e.xp || 1 });
  burst(g, e.x, e.y, e.color || '#b8ce83', e.type === 'boss' ? 30 : 5);
  if (g.random() < 0.09)
    g.supplies.push({
      x: e.x,
      y: e.y,
      kind: 'scrap',
      value: 2,
      id: g.nextId++,
    });
  if (e.type === 'boss') {
    g.bossKills++;
    g.scrap += 25;
    g.supplies.push({ x: e.x, y: e.y, kind: 'relic', id: g.nextId++ });
    announce(g, 'TITAN DOWN · RECOVER THE RELIC', 5);
    g.shake = 14;
  }
  if (e.type === 'splitter')
    for (let i = 0; i < 3; i++)
      spawnEnemy(g, 'runner', e.x + (i - 1) * 18, e.y + 10, 0.5);
}
export function spawnEnemy(g, type = 'walker', x, y, scale = 1) {
  const spec = ENEMIES[type],
    angle = g.random() * Math.PI * 2;
  const radius = 520;
  const growth = 1 + g.time / 360;
  const hp = spec.hp * growth * g.zone.difficulty * scale * g.difficulty.scale;
  const e = {
    ...spec,
    type,
    damage: spec.damage * g.difficulty.scale,
    id: g.nextId++,
    x: x ?? g.player.x + Math.cos(angle) * radius,
    y: y ?? g.player.y + Math.sin(angle) * radius,
    hp,
    maxHp: hp,
    speed: spec.speed * (1 + g.time / 1800),
    hit: 0,
    attack: 1.5 + g.random(),
    charge: 0,
    windup: 0,
    vx: 0,
    vy: 0,
    orbitHit: 0,
    phase: 0,
  };
  g.enemies.push(e);
  return e;
}
export function activateDash(g, input = { x: 0, y: 0 }) {
  const p = g.player;
  if (g.state !== 'playing' || p.dashTimer > 0) return false;
  const length = Math.hypot(input.x, input.y);
  p.dashX = length ? input.x / length : Math.cos(p.angle);
  p.dashY = length ? input.y / length : Math.sin(p.angle);
  p.dashLeft = 0.2;
  p.dashTimer = p.dashCooldown;
  p.invulnerable = 0.4;
  burst(g, p.x, p.y, '#c8f6e0', 12);
  return true;
}
export function activateNova(g) {
  if (g.state !== 'playing' || g.player.novaTimer > 0) return false;
  const p = g.player,
    radius = 180 * p.area;
  for (const e of [...g.enemies])
    if (distance(e, p) < radius + e.radius) hitEnemy(g, e, 80 * p.novaPower);
  g.hostile = g.hostile.filter((b) => distance(b, p) > radius);
  g.effects.push({
    kind: 'ring',
    x: p.x,
    y: p.y,
    radius,
    life: 0.6,
    maxLife: 0.6,
    color: '#d0f29a',
  });
  g.player.novaTimer = g.player.novaCooldown;
  g.shake = 10;
  return true;
}
function randomNearby(g, radius) {
  const a = g.random() * Math.PI * 2;
  return {
    x: g.player.x + Math.cos(a) * radius,
    y: g.player.y + Math.sin(a) * radius,
  };
}
function contracts(g) {
  if (!g.contract.kills && g.kills >= 100) {
    g.contract.kills = 1;
    g.scrap += 25;
    announce(g, 'BOUNTY COMPLETE · 100 INFECTED · +25 SCRAP');
  }
  if (!g.contract.crates && g.crates >= 3) {
    g.contract.crates = 1;
    g.scrap += 30;
    announce(g, 'BOUNTY COMPLETE · 3 CACHES · +30 SCRAP');
  }
  if (!g.contract.boss && g.bossKills >= 1) {
    g.contract.boss = 1;
    g.scrap += 40;
    announce(g, 'BOUNTY COMPLETE · TITAN HUNTER · +40 SCRAP');
  }
}
function weapons(g, dt) {
  const p = g.player,
    targets = g.enemies.filter((e) => e.hp > 0);
  const target = targets.reduce(
    (best, e) => (!best || distance(e, p) < distance(best, p) ? e : best),
    null,
  );
  if (target) p.angle = Math.atan2(target.y - p.y, target.x - p.x);
  for (const [id, w] of Object.entries(g.weapons)) {
    const pattern = weaponPattern(g, id);
    w.clock -= dt;
    if (id === 'orbit') {
      const radius = pattern.radius,
        blades = pattern.count;
      for (const e of targets) {
        if (e.orbitHit > g.time) continue;
        for (let i = 0; i < blades; i++) {
          const a = g.time * pattern.spin + (i * Math.PI * 2) / blades;
          if (
            distance(e, {
              x: p.x + Math.cos(a) * radius,
              y: p.y + Math.sin(a) * radius,
            }) <
            e.radius + 14
          ) {
            hitEnemy(g, e, pattern.damage);
            e.orbitHit = g.time + 0.3;
            break;
          }
        }
      }
      continue;
    }
    if (w.clock > 0 || (!target && id !== 'mine')) continue;
    if (id === 'scatter' || id === 'drone') {
      const scatter = id === 'scatter';
      const shots = pattern.count;
      for (let i = 0; i < shots; i++) {
        const a = p.angle + (i - (shots - 1) / 2) * (scatter ? 0.12 : 0.06);
        const launch = scatter
          ? p
          : {
              x: p.x + Math.cos(g.time * 1.5 + i * 2.1) * 45,
              y: p.y + Math.sin(g.time * 1.5 + i * 2.1) * 45,
            };
        const aim = scatter
          ? a
          : Math.atan2(target.y - launch.y, target.x - launch.x);
        g.bullets.push({
          x: launch.x,
          y: launch.y,
          vx: Math.cos(aim) * (scatter ? 540 : 580),
          vy: Math.sin(aim) * (scatter ? 540 : 580),
          damage: pattern.damage,
          life: scatter ? pattern.reach / 540 : 1.2,
          pierce: scatter ? pattern.pierce : Number(w.evolved),
          hits: new Set(),
          color: scatter ? '#ffb384' : '#a6c9ff',
        });
      }
      w.clock = pattern.interval;
      g.shotsFired += shots;
      g.effects.push({
        kind: 'ring',
        x: p.x + Math.cos(p.angle) * 22,
        y: p.y + Math.sin(p.angle) * 22,
        radius: scatter ? 30 : 12,
        life: 0.15,
        maxLife: 0.15,
        color: scatter ? '#ffb384' : '#a6c9ff',
      });
    }
    if (id === 'carbine') {
      const shots = pattern.count,
        damage = pattern.damage;
      for (let i = 0; i < shots; i++) {
        const a = p.angle,
          offset = (i - (shots - 1) / 2) * 7;
        g.bullets.push({
          x: p.x + Math.cos(a + Math.PI / 2) * offset,
          y: p.y + Math.sin(a + Math.PI / 2) * offset,
          vx: Math.cos(a) * 660,
          vy: Math.sin(a) * 660,
          damage,
          life: 1.4,
          pierce: pattern.pierce,
          width: w.evolved ? 4 : w.level >= 3 ? 3 : 2.5,
          hits: new Set(),
          color: w.evolved ? '#b7f6f4' : '#f8dc91',
        });
      }
      g.shotsFired += shots;
      g.effects.push({
        kind: 'ring',
        x: p.x + Math.cos(p.angle) * 30,
        y: p.y + Math.sin(p.angle) * 30,
        radius: 13,
        life: 0.1,
        maxLife: 0.1,
        color: '#ffe1a0',
      });
      w.clock = pattern.interval;
    }
    if (id === 'arc') {
      const visited = new Set();
      let from = p,
        to = target;
      for (let i = 0; i < pattern.count && to; i++) {
        visited.add(to.id);
        g.effects.push({
          kind: 'arc',
          x: from.x,
          y: from.y,
          tx: to.x,
          ty: to.y,
          life: 0.22,
          maxLife: 0.22,
          color: '#9dedfa',
        });
        hitEnemy(g, to, pattern.damage);
        from = to;
        to = targets
          .filter(
            (e) =>
              !visited.has(e.id) &&
              e.hp > 0 &&
              distance(e, from) < pattern.reach,
          )
          .sort((a, b) => distance(a, from) - distance(b, from))[0];
      }
      w.clock = pattern.interval;
    }
    if (id === 'pulse') {
      const radius = pattern.radius;
      for (const e of targets)
        if (distance(e, p) < radius + e.radius) hitEnemy(g, e, pattern.damage);
      g.effects.push({
        kind: 'ring',
        x: p.x,
        y: p.y,
        radius,
        life: 0.5,
        maxLife: 0.5,
        color: '#b8e97d',
      });
      w.clock = pattern.interval;
    }
    if (id === 'mine') {
      for (let i = 0; i < pattern.count; i++) {
        const offset = (i - (pattern.count - 1) / 2) * 32;
        g.mines.push({
          x: p.x + Math.cos(p.angle + Math.PI / 2) * offset,
          y: p.y + Math.sin(p.angle + Math.PI / 2) * offset,
          life: 12,
          arm: 0.5,
          radius: pattern.radius,
          damage: pattern.damage,
          evolved: w.evolved,
        });
      }
      w.clock = pattern.interval;
    }
  }
}
export function update(
  g,
  dt,
  input = { x: 0, y: 0 },
  view = { width: 900, height: 600 },
) {
  if (g.state !== 'playing') return;
  dt = Math.min(Math.max(dt, 0), 0.05);
  const p = g.player;
  g.time += dt;
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.dashTimer = Math.max(0, p.dashTimer - dt);
  p.novaTimer = Math.max(0, p.novaTimer - dt);
  g.shake = Math.max(0, g.shake - dt * 25);
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  const length = Math.hypot(input.x, input.y),
    normal = Math.max(1, length);
  const dx = p.dashLeft > 0 ? p.dashX * 750 : (input.x / normal) * p.speed,
    dy = p.dashLeft > 0 ? p.dashY * 750 : (input.y / normal) * p.speed;
  p.x += dx * dt;
  p.y += dy * dt;
  g.distance += Math.hypot(dx, dy) * dt;
  p.dashLeft = Math.max(0, p.dashLeft - dt);
  if (!g.enemies.length && length) p.angle = Math.atan2(input.y, input.x);
  if (g.time >= g.nextHorde) {
    g.hordeUntil = g.time + 12;
    g.nextHorde += 60;
    announce(g, 'INCOMING HORDE · KEEP MOVING', 5);
  }
  g.spawnClock -= dt;
  if (g.spawnClock <= 0 && g.enemies.length < 170) {
    const roll = g.random();
    let type = 'walker';
    if (g.time > 25 && roll < 0.2) type = 'runner';
    if (g.time > 60 && roll > 0.82) type = 'brute';
    if (g.time > 100 && roll > 0.65 && roll < 0.78) type = 'spitter';
    if (g.time > 150 && roll > 0.45 && roll < 0.58) type = 'charger';
    if (g.time > 210 && roll > 0.3 && roll < 0.42) type = 'splitter';
    const a = g.random() * Math.PI * 2,
      r = Math.hypot(view.width, view.height) / 2 + 45;
    const spawned = spawnEnemy(
      g,
      type,
      p.x + Math.cos(a) * r,
      p.y + Math.sin(a) * r,
    );
    if (g.time > 60 && g.random() < 0.07) makeElite(spawned);
    g.spawnClock =
      (Math.max(0.15, 0.7 - g.time * 0.001) *
        (g.time < g.hordeUntil ? 0.32 : 1)) /
      g.zone.difficulty;
  }
  const bossTimes = [90, 210, 390];
  if (g.bossIndex < 3 && g.time >= bossTimes[g.bossIndex]) {
    const pos = randomNearby(g, 380),
      boss = spawnEnemy(g, 'boss', pos.x, pos.y, 1 + g.bossIndex * 0.4);
    boss.name = BOSS_NAMES[g.bossIndex];
    boss.phase = g.bossIndex;
    boss.color = ['#d0b277', '#afc999', '#e3a27b'][g.bossIndex];
    g.bossIndex++;
    announce(g, `TITAN SIGNAL · ${boss.name.toUpperCase()}`, 6);
  }
  if (
    (g.mode === 'endless' ||
      g.overtime ||
      (g.chapter &&
        missionGoals(g).some(
          (goal) => goal.kind === 'boss' && goal.progress < goal.target,
        ) &&
        !g.enemies.some((e) => e.type === 'boss' && e.hp > 0))) &&
    g.bossIndex >= 3 &&
    g.time >= 390 + (g.bossIndex - 2) * 90
  ) {
    const pos = randomNearby(g, 400);
    const boss = spawnEnemy(g, 'boss', pos.x, pos.y, 1 + g.bossIndex * 0.3);
    boss.phase = g.bossIndex % 3;
    boss.name = BOSS_NAMES[boss.phase];
    g.bossIndex++;
    announce(g, 'ANOTHER TITAN HAS AWAKENED');
  }
  if (g.time >= g.nextSupply) {
    g.supplies.push({
      ...randomNearby(g, 220),
      kind: ['medkit', 'crate', 'crate', 'overdrive', 'vacuum', 'shield'][
        Math.floor(g.random() * 6)
      ],
      id: g.nextId++,
    });
    g.nextSupply += 28;
  }
  if (g.time >= g.nextHazard) {
    const pos = randomNearby(g, 130 + g.random() * 200);
    g.hazards.push({ ...pos, radius: 65 + g.random() * 35, warn: 2, life: 10 });
    g.nextHazard += Math.max(6, 17 - g.time / 60);
  }
  for (const e of [...g.enemies]) {
    if (e.hp <= 0) continue;
    const d = distance(e, p) || 1;
    e.hit = Math.max(0, e.hit - dt);
    e.attack -= dt;
    if (e.windup > 0) {
      e.windup = Math.max(0, e.windup - dt);
      if (e.windup === 0) e.charge = 0.65;
    } else if (e.charge > 0) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.charge -= dt;
    } else if (e.type === 'charger' && e.attack <= 0) {
      e.windup = 0.65;
      e.vx = ((p.x - e.x) / d) * 350;
      e.vy = ((p.y - e.y) / d) * 350;
      e.attack = 4;
      g.effects.push({
        kind: 'arc',
        x: e.x,
        y: e.y,
        tx: p.x,
        ty: p.y,
        life: 0.65,
        maxLife: 0.65,
        color: '#ee8c79',
      });
    } else {
      const move = e.type === 'spitter' && d < 240 ? -0.25 : 1;
      e.x += ((p.x - e.x) / d) * e.speed * dt * move;
      e.y += ((p.y - e.y) / d) * e.speed * dt * move;
    }
    if ((e.type === 'spitter' || e.type === 'boss') && e.attack <= 0) {
      const count =
        e.type === 'boss' ? (e.phase === 1 ? 5 : 10 + e.phase * 3) : 1;
      for (let i = 0; i < count; i++) {
        const a =
          e.type === 'boss'
            ? e.phase === 1
              ? Math.atan2(p.y - e.y, p.x - e.x) + (i - 2) * 0.2
              : (i * Math.PI * 2) / count + g.time
            : Math.atan2(p.y - e.y, p.x - e.x);
        g.hostile.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * 125,
          vy: Math.sin(a) * 125,
          life: 5,
          radius: e.type === 'boss' ? 7 : 5,
        });
      }
      e.attack = e.type === 'boss' ? (e.hp < e.maxHp * 0.4 ? 1.9 : 3) : 2.6;
      if (e.type === 'boss' && e.phase === 1 && g.enemies.length < 165) {
        for (let i = 0; i < 2; i++)
          spawnEnemy(g, 'runner', e.x + (i ? 30 : -30), e.y, 0.7);
      }
      if (e.type === 'boss' && e.phase === 2 && g.hazards.length < 16) {
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 + g.time;
          g.hazards.push({
            x: p.x + Math.cos(a) * 100,
            y: p.y + Math.sin(a) * 100,
            radius: 40,
            warn: 1.8,
            life: 5,
          });
        }
      }
      if (e.type === 'boss' && g.hazards.length < 18)
        g.hazards.push({ x: p.x, y: p.y, radius: 60, warn: 1.4, life: 5 });
    }
    if (distance(e, p) < e.radius + 12) hurtPlayer(g, e.damage || 12);
  }
  if (g.state === 'dead') return;
  updateExpedition(g, dt);
  weapons(g, dt);
  for (const b of g.bullets) {
    const old = { x: b.x, y: b.y };
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of g.enemies) {
      if (e.hp <= 0 || b.life <= 0 || b.hits.has(e.id)) continue;
      // Swept segment collision keeps fast rounds from tunneling through small enemies.
      const vx = b.x - old.x,
        vy = b.y - old.y,
        t = Math.max(
          0,
          Math.min(
            1,
            ((e.x - old.x) * vx + (e.y - old.y) * vy) /
              (vx * vx + vy * vy || 1),
          ),
        );
      if (
        distance(e, { x: old.x + t * vx, y: old.y + t * vy }) <
        e.radius + 4
      ) {
        hitEnemy(g, e, b.damage);
        b.hits.add(e.id);
        if (b.pierce-- <= 0) b.life = 0;
      }
    }
  }
  for (const b of g.hostile) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (distance(b, p) < b.radius + 11) {
      hurtPlayer(g, 12 * g.difficulty.scale);
      b.life = 0;
    }
  }
  for (const m of g.mines) {
    m.life -= dt;
    m.arm -= dt;
    if (m.arm <= 0 && g.enemies.some((e) => e.hp > 0 && distance(e, m) < 35)) {
      for (const e of [...g.enemies])
        if (distance(e, m) < m.radius + e.radius) hitEnemy(g, e, m.damage);
      g.effects.push({
        kind: 'ring',
        x: m.x,
        y: m.y,
        radius: m.radius,
        life: 0.55,
        maxLife: 0.55,
        color: '#f9b87b',
      });
      if (m.evolved)
        g.hazards.push({
          x: m.x,
          y: m.y,
          radius: m.radius,
          warn: 0,
          life: 4,
          friendly: true,
        });
      m.life = 0;
    }
  }
  for (const h of g.hazards) {
    h.life -= dt;
    h.warn -= dt;
    if (h.warn <= 0) {
      if (h.friendly) {
        for (const e of g.enemies)
          if (distance(e, h) < h.radius) hitEnemy(g, e, 30 * dt);
      } else if (distance(p, h) < h.radius)
        hurtPlayer(g, 8 * g.difficulty.scale);
    }
  }
  g.enemies = g.enemies.filter((e) => e.hp > 0 && distance(e, p) < 1800);
  g.bullets = g.bullets.filter((b) => b.life > 0);
  g.hostile = g.hostile.filter((b) => b.life > 0);
  g.mines = g.mines.filter((m) => m.life > 0);
  g.hazards = g.hazards.filter((h) => h.life > 0);
  g.cores = g.cores.filter((c) => {
    const d = distance(c, p);
    if (d < 18) {
      collectXp(g, c.value);
      return false;
    }
    if (d < p.magnet) {
      const step = Math.min(d, 380 * dt);
      c.x += ((p.x - c.x) / (d || 1)) * step;
      c.y += ((p.y - c.y) / (d || 1)) * step;
    }
    return true;
  });
  // Keep long runs bounded. Distant unclaimed cores become nearby consolidated drops.
  if (g.cores.length > 250) {
    const merged = g.cores.splice(0, 100);
    g.cores.push({
      ...randomNearby(g, 180),
      value: merged.reduce((s, c) => s + c.value, 0),
    });
  }
  g.supplies = g.supplies.filter((s) => {
    if (distance(s, p) > 30) return distance(s, p) < 1800;
    if (s.kind === 'medkit') {
      const heal = g.perk === 'medic' ? 60 : 35;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      announce(g, `MEDKIT · +${heal} HEALTH`, 2);
    }
    if (s.kind === 'overdrive') {
      g.buffs.overdrive = 20;
      announce(g, 'OVERDRIVE · +60% DAMAGE · 20 SECONDS', 3);
    }
    if (s.kind === 'shield') {
      p.invulnerable = 8;
      announce(g, 'ISOTOPE SHIELD · 8 SECONDS', 3);
    }
    if (s.kind === 'vacuum') {
      for (const c of g.cores) {
        c.x = p.x;
        c.y = p.y;
      }
      announce(g, 'CORE VACUUM · ALL EXPERIENCE RECOVERED', 3);
    }
    if (s.kind === 'scrap') g.scrap += s.value;
    if (s.kind === 'crate') {
      g.scrap += 12;
      g.crates++;
      p.hp = Math.min(p.maxHp, p.hp + 15);
      for (const c of g.cores) {
        c.x = p.x + (c.x - p.x) * 0.1;
        c.y = p.y + (c.y - p.y) * 0.1;
      }
      announce(g, 'SUPPLY CACHE · +12 SCRAP · CORE MAGNET', 3);
    }
    if (s.kind === 'relic') {
      g.scrap += 20;
      g.pendingLevels++;
      if (g.state === 'playing') chooseUpgrades(g);
    }
    burst(g, s.x, s.y, '#f7d38d', 12);
    return false;
  });
  if (g.supplies.length > 80) g.supplies.splice(0, g.supplies.length - 80);
  for (const s of g.particles) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
  g.particles = g.particles.filter((s) => s.life > 0);
  for (const n of g.numbers) {
    n.y -= 25 * dt;
    n.life -= dt;
  }
  g.numbers = g.numbers.filter((n) => n.life > 0);
  for (const e of g.effects) e.life -= dt;
  g.effects = g.effects.filter((e) => e.life > 0);
  contracts(g);
  if (g.mode !== 'endless' && g.time >= g.extractionAt && missionReady(g)) {
    if (!g.extraction) {
      g.extraction = { x: p.x + 150, y: p.y, radius: 75 };
      announce(g, 'EXTRACTION OPEN · HOLD INSIDE THE BEACON', 8);
    }
    if (
      g.state === 'playing' &&
      distance(p, g.extraction) < g.extraction.radius
    ) {
      g.extractProgress += dt;
      if (g.extractProgress >= 8) g.state = 'won';
    } else g.extractProgress = Math.max(0, g.extractProgress - dt * 0.5);
  }
}
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
