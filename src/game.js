export const DURATION = 300;
export const UPGRADES = [
  {
    id: 'damage',
    name: 'Hot rounds',
    description: '+10 damage. Give the infected a warmer welcome.',
    icon: '↗',
  },
  {
    id: 'rate',
    name: 'Hair trigger',
    description: 'Fire 18% faster. Every second counts.',
    icon: 'ϟ',
  },
  {
    id: 'speed',
    name: 'Adrenal glands',
    description: '+25 movement speed. Stay one step ahead.',
    icon: '»',
  },
  {
    id: 'heal',
    name: 'Cell regeneration',
    description: '+20 maximum health and restore 40 health.',
    icon: '+',
  },
  {
    id: 'magnet',
    name: 'Magnetic blood',
    description: '+45 core collection radius. Let the fallout come to you.',
    icon: '◎',
  },
  {
    id: 'multishot',
    name: 'Split chamber',
    description: 'Add a projectile to every shot (up to five).',
    icon: '⋔',
  },
];
export function createGame(random = Math.random) {
  return {
    random,
    state: 'ready',
    time: 0,
    kills: 0,
    level: 1,
    xp: 0,
    xpNeeded: 8,
    player: {
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      speed: 180,
      damage: 24,
      interval: 0.52,
      magnet: 65,
      shots: 1,
      invulnerable: 0,
    },
    enemies: [],
    bullets: [],
    cores: [],
    particles: [],
    modifications: {},
    spawnClock: 0,
    shotClock: 0,
    pendingLevels: 0,
    choices: [],
    nextId: 0,
  };
}
export function chooseUpgrades(game) {
  const pool = UPGRADES.filter(
    (u) => u.id !== 'multishot' || game.player.shots < 5,
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(game.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  game.choices = pool.slice(0, 3);
  game.state = 'upgrade';
}
export function applyUpgrade(game, id) {
  if (game.state !== 'upgrade' || !game.choices.some((u) => u.id === id))
    return false;
  const p = game.player;
  if (id === 'damage') p.damage += 10;
  if (id === 'rate') p.interval = Math.max(0.08, p.interval * 0.82);
  if (id === 'speed') p.speed += 25;
  if (id === 'heal') {
    p.maxHp += 20;
    p.hp = Math.min(p.maxHp, p.hp + 40);
  }
  if (id === 'magnet') p.magnet += 45;
  if (id === 'multishot') p.shots = Math.min(5, p.shots + 1);
  game.modifications[id] = (game.modifications[id] || 0) + 1;
  game.pendingLevels--;
  game.state = 'playing';
  if (game.pendingLevels > 0) chooseUpgrades(game);
  return true;
}
export function collectXp(game, amount) {
  game.xp += amount;
  while (game.xp >= game.xpNeeded) {
    game.xp -= game.xpNeeded;
    game.level++;
    game.pendingLevels++;
    game.xpNeeded = Math.ceil(game.xpNeeded * 1.28);
  }
  if (game.pendingLevels > 0 && game.state === 'playing') chooseUpgrades(game);
}
export function hurtPlayer(game, damage) {
  if (game.player.invulnerable > 0 || game.state !== 'playing') return;
  game.player.hp = Math.max(0, game.player.hp - damage);
  game.player.invulnerable = 0.7;
  if (game.player.hp === 0) game.state = 'dead';
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function update(
  game,
  dt,
  input = { x: 0, y: 0 },
  view = { width: 900, height: 600 },
) {
  if (game.state !== 'playing') return;
  dt = Math.min(Math.max(dt, 0), 0.05);
  const p = game.player;
  game.time = Math.min(DURATION, game.time + dt);
  if (game.time >= DURATION) {
    game.state = 'won';
    return;
  }
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  const length = Math.hypot(input.x, input.y) || 1;
  p.x += (input.x / length) * p.speed * dt;
  p.y += (input.y / length) * p.speed * dt;
  game.spawnClock -= dt;
  if (game.spawnClock <= 0 && game.enemies.length < 180) {
    const angle = game.random() * Math.PI * 2;
    const radius = Math.hypot(view.width, view.height) / 2 + 50;
    const brute = game.random() < Math.min(0.35, game.time / 600);
    const hp = (brute ? 90 : 28) + game.time * 0.2;
    game.enemies.push({
      id: game.nextId++,
      x: p.x + Math.cos(angle) * radius,
      y: p.y + Math.sin(angle) * radius,
      hp,
      maxHp: hp,
      radius: brute ? 19 : 12,
      speed: (brute ? 40 : 62) + game.time * 0.12,
      brute,
      hit: 0,
    });
    game.spawnClock = Math.max(0.12, 0.85 - game.time * 0.003);
  }
  game.shotClock -= dt;
  if (game.shotClock <= 0 && game.enemies.length) {
    const target = game.enemies.reduce((a, b) =>
      distance(a, p) < distance(b, p) ? a : b,
    );
    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    for (let i = 0; i < p.shots; i++) {
      const a = angle + (i - (p.shots - 1) / 2) * 0.13;
      game.bullets.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * 620,
        vy: Math.sin(a) * 620,
        life: 1.5,
      });
    }
    game.shotClock = p.interval;
  }
  for (const e of game.enemies) {
    const d = distance(e, p) || 1;
    e.x += ((p.x - e.x) / d) * e.speed * dt;
    e.y += ((p.y - e.y) / d) * e.speed * dt;
    e.hit = Math.max(0, e.hit - dt);
    if (d < e.radius + 12) hurtPlayer(game, e.brute ? 22 : 12);
  }
  for (const b of game.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of game.enemies) {
      if (e.hp <= 0 || b.life <= 0) continue;
      if (distance(b, e) < e.radius + 6) {
        e.hp -= p.damage;
        e.hit = 0.12;
        b.life = 0;
        if (e.hp <= 0) {
          game.kills++;
          game.cores.push({ x: e.x, y: e.y, value: e.brute ? 4 : 1 });
          for (let i = 0; i < 5; i++)
            game.particles.push({
              x: e.x,
              y: e.y,
              vx: (game.random() - 0.5) * 120,
              vy: (game.random() - 0.5) * 120,
              life: 0.5,
            });
        }
      }
    }
  }
  game.enemies = game.enemies.filter((e) => e.hp > 0);
  game.bullets = game.bullets.filter((b) => b.life > 0);
  game.cores = game.cores.filter((c) => {
    const d = distance(c, p);
    if (d < 18) {
      collectXp(game, c.value);
      return false;
    }
    if (d < p.magnet) {
      c.x += ((p.x - c.x) / d) * 340 * dt;
      c.y += ((p.y - c.y) / d) * 340 * dt;
    }
    return true;
  });
  for (const s of game.particles) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
  game.particles = game.particles.filter((s) => s.life > 0);
}
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
