import './style.css';
import {
  createGame,
  update,
  applyUpgrade,
  UPGRADES,
  formatTime,
  DURATION,
} from './game.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
let game = createGame();
let width = 900,
  height = 600,
  last = 0,
  overlayState = '',
  sound = false,
  audio;
const keys = new Set();
let pointer = null;
let best = 0;
try {
  best = Number(localStorage.getItem('nuclear-survivors-best')) || 0;
} catch {
  /* Storage may be unavailable in private browsers. */
}
$('best').textContent = best
  ? `${formatTime(best)} SURVIVED`
  : 'NO RUNS LOGGED';
const resize = () => {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
new ResizeObserver(resize).observe(canvas);
function tone(frequency, duration, volume = 0.025) {
  if (!sound) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  const osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}
$('sound').onclick = () => {
  sound = !sound;
  $('sound').textContent = sound ? 'SOUND ON' : 'SOUND OFF';
  $('sound').setAttribute(
    'aria-label',
    sound ? 'Disable sound' : 'Enable sound',
  );
  tone(440, 0.08);
};
function start() {
  game = createGame();
  game.state = 'playing';
  overlayState = '';
  keys.clear();
  pointer = null;
  tone(300, 0.2);
}
function togglePause() {
  if (game.state === 'playing') game.state = 'paused';
  else if (game.state === 'paused') game.state = 'playing';
  keys.clear();
  pointer = null;
}
$('pause').onclick = togglePause;
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))
    e.preventDefault();
  if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && !e.repeat)
    togglePause();
  keys.add(e.key.toLowerCase());
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => {
  if (game.state === 'playing') togglePause();
  keys.clear();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') togglePause();
});
canvas.addEventListener('pointerdown', (e) => {
  if (game.state !== 'playing') return;
  canvas.setPointerCapture(e.pointerId);
  pointer = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointermove', (e) => {
  if (pointer) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
  canvas.addEventListener(event, () => {
    pointer = null;
  });
function input() {
  let x =
    Number(keys.has('d') || keys.has('arrowright')) -
    Number(keys.has('a') || keys.has('arrowleft'));
  let y =
    Number(keys.has('s') || keys.has('arrowdown')) -
    Number(keys.has('w') || keys.has('arrowup'));
  if (pointer) {
    x = (pointer.x - pointer.ox) / 35;
    y = (pointer.y - pointer.oy) / 35;
    if (Math.hypot(x, y) < 0.15) x = y = 0;
  }
  return { x, y };
}
function circle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function render() {
  ctx.fillStyle = '#20271c';
  ctx.fillRect(0, 0, width, height);
  const p = game.player;
  ctx.save();
  ctx.translate(width / 2 - p.x, height / 2 - p.y);
  // Deterministic world tiles let the camera travel across an endless wasteland.
  const tile = 96;
  for (
    let gx = Math.floor((p.x - width / 2) / tile) - 1;
    gx <= Math.ceil((p.x + width / 2) / tile) + 1;
    gx++
  ) {
    for (
      let gy = Math.floor((p.y - height / 2) / tile) - 1;
      gy <= Math.ceil((p.y + height / 2) / tile) + 1;
      gy++
    ) {
      const seed = Math.abs(Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453) % 1;
      const x = gx * tile,
        y = gy * tile;
      ctx.fillStyle = seed > 0.5 ? '#252c20' : '#22291d';
      ctx.fillRect(x, y, tile - 1, tile - 1);
      ctx.strokeStyle = '#303727';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 56);
      ctx.lineTo(x + 26, y + 50);
      ctx.lineTo(x + 28, y + 35);
      ctx.stroke();
      if (seed > 0.86) {
        circle(x + 50, y + 48, 27, '#1b2218');
        circle(x + 47, y + 43, 21, '#303728');
        ctx.strokeStyle = '#444b34';
        ctx.beginPath();
        ctx.moveTo(x + 34, y + 44);
        ctx.lineTo(x + 47, y + 31);
        ctx.lineTo(x + 61, y + 40);
        ctx.stroke();
      } else if (seed < 0.1) {
        ctx.save();
        ctx.translate(x + 50, y + 50);
        ctx.rotate(seed * 20);
        ctx.fillStyle = '#161e16';
        ctx.fillRect(-18, -10, 36, 20);
        ctx.fillStyle = '#424334';
        ctx.fillRect(-16, -14, 29, 20);
        ctx.strokeStyle = '#58533a';
        ctx.strokeRect(-16, -14, 29, 20);
        ctx.fillStyle = '#282f23';
        ctx.fillRect(-12, -10, 8, 12);
        ctx.restore();
      }
      for (let i = 0; i < 4; i++)
        circle(
          x + ((seed * 173 + i * 29) % 94),
          y + ((seed * 231 + i * 17) % 92),
          1.5,
          '#3c442d',
        );
    }
  }
  // Abandoned road and hazard stripes establish a recognizable starting sector.
  ctx.fillStyle = '#34362b';
  ctx.fillRect(-155, -2000, 108, 4000);
  ctx.fillStyle = '#605b39';
  for (let y = Math.floor((p.y - height) / 80) * 80; y < p.y + height; y += 80)
    ctx.fillRect(-104, y, 5, 30);
  ctx.strokeStyle = '#55533a';
  ctx.strokeRect(-151, -2000, 100, 4000);
  for (const c of game.cores) {
    ctx.shadowColor = '#b6ed64';
    ctx.shadowBlur = 12;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#bbef72';
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.restore();
    ctx.shadowBlur = 0;
  }
  for (const e of game.enemies) {
    circle(e.x + 2, e.y + 6, e.radius + 2, '#10180e88');
    circle(
      e.x,
      e.y,
      e.radius,
      e.hit ? '#e3e5b2' : e.brute ? '#7b6747' : '#69784b',
    );
    circle(
      e.x - 3,
      e.y - 3,
      e.radius * 0.65,
      e.hit ? '#ffffff' : e.brute ? '#a08a5a' : '#8a9b5b',
    );
    circle(e.x - 4, e.y - 4, 2, '#d6f77e');
    circle(e.x + 4, e.y - 4, 2, '#d6f77e');
    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#111710';
      ctx.fillRect(e.x - 13, e.y - e.radius - 8, 26, 3);
      ctx.fillStyle = '#b5cc72';
      ctx.fillRect(e.x - 13, e.y - e.radius - 8, (26 * e.hp) / e.maxHp, 3);
    }
  }
  for (const b of game.bullets) {
    ctx.strokeStyle = '#f5dc85';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018);
    ctx.stroke();
  }
  for (const s of game.particles) {
    ctx.globalAlpha = s.life * 2;
    circle(s.x, s.y, 2, '#d4d788');
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#c5e98220';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
  ctx.stroke();
  if (p.invulnerable <= 0 || Math.floor(p.invulnerable * 15) % 2) {
    circle(p.x + 2, p.y + 8, 15, '#10161099');
    ctx.save();
    ctx.translate(p.x, p.y);
    const enemy = game.enemies[0];
    const movement = input();
    ctx.rotate(
      enemy
        ? Math.atan2(enemy.y - p.y, enemy.x - p.x)
        : movement.x || movement.y
          ? Math.atan2(movement.y, movement.x)
          : -Math.PI / 4,
    );
    ctx.fillStyle = '#555e49';
    ctx.fillRect(-10, -10, 16, 20);
    circle(0, 0, 10, '#c5c3a0');
    circle(2, 0, 7, '#444f41');
    ctx.fillStyle = '#c4eb8b';
    ctx.fillRect(5, -4, 4, 8);
    ctx.fillStyle = '#a7a889';
    ctx.fillRect(5, 6, 20, 4);
    ctx.fillStyle = '#292f27';
    ctx.fillRect(22, 5, 7, 5);
    ctx.restore();
  }
  ctx.restore();
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.15,
    width / 2,
    height / 2,
    width * 0.7,
  );
  vignette.addColorStop(0, '#101a0900');
  vignette.addColorStop(1, '#060b08c0');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  if (pointer) {
    const rect = canvas.getBoundingClientRect();
    circle(pointer.ox - rect.left, pointer.oy - rect.top, 35, '#ffffff18');
    circle(pointer.x - rect.left, pointer.y - rect.top, 12, '#c4ed7780');
  }
}
function syncUI() {
  const p = game.player;
  $('timer').innerHTML = `${formatTime(game.time)} <small>/ 05:00</small>`;
  $('extraction').textContent = formatTime(DURATION - game.time);
  $('kills').textContent = `${game.kills} KILLS`;
  $('level').textContent = `LVL ${String(game.level).padStart(2, '0')}`;
  $('health-label').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('health').style.width = `${(p.hp / p.maxHp) * 100}%`;
  $('xp').style.width = `${(game.xp / game.xpNeeded) * 100}%`;
  $('damage').innerHTML = `${p.damage} <small>DMG</small>`;
  $('speed').innerHTML = `${p.speed} <small>U/S</small>`;
  $('weapon-level').textContent =
    `+${Object.values(game.modifications).reduce((a, b) => a + b, 0)}`;
  $('upgrades').innerHTML =
    Object.entries(game.modifications)
      .map(
        ([id, count]) =>
          `<span>${UPGRADES.find((u) => u.id === id).name} <b>×${count}</b></span>`,
      )
      .join('') || 'No modifications installed.';
  $('pause').hidden = game.state !== 'playing';
  if (overlayState === game.state) return;
  overlayState = game.state;
  const overlay = $('overlay');
  overlay.hidden = game.state === 'playing';
  if (game.state === 'ready') {
    overlay.innerHTML = `<div class="intro"><div class="warning-icon">☢</div><div class="eyebrow">WELCOME TO THE AFTERMATH</div><h2>One more<br>day alive.</h2><p>The forest is waking up.<br>Let’s make sure you get home.</p><button class="primary" id="start">ENTER THE ZONE <span>↗</span></button><div class="intro-note">WASD / ARROW KEYS TO MOVE<br>ON TOUCHSCREENS, DRAG TO MOVE · WEAPONS FIRE AUTOMATICALLY</div></div>`;
    $('start').onclick = start;
  } else if (game.state === 'paused') {
    overlay.innerHTML = `<div class="intro"><div class="eyebrow">FIELD FEED SUSPENDED</div><h2>Catch your<br>breath.</h2><p>The zone can wait a moment.</p><button class="primary" id="resume">RESUME OPERATION <span>→</span></button></div>`;
    $('resume').onclick = togglePause;
  } else if (game.state === 'upgrade') {
    tone(660, 0.15);
    overlay.innerHTML = `<div class="upgrade-screen"><div class="eyebrow">LEVEL ${game.level} / MUTATION AVAILABLE</div><h2>Adapt to survive.</h2><p>Choose one modification for this run.</p><div class="choices">${game.choices.map((u) => `<button class="choice" data-upgrade="${u.id}"><span class="choice-icon">${u.icon}</span><strong>${u.name}</strong><span>${u.description}</span><small>INSTALL MODIFICATION ↗</small></button>`).join('')}</div></div>`;
    overlay.querySelectorAll('[data-upgrade]').forEach((button) => {
      button.onclick = () => {
        applyUpgrade(game, button.dataset.upgrade);
        overlayState = '';
      };
    });
  } else if (game.state === 'dead' || game.state === 'won') {
    best = Math.max(best, Math.floor(game.time));
    try {
      localStorage.setItem('nuclear-survivors-best', String(best));
    } catch {
      /* Runs still work without persistence. */
    }
    $('best').textContent = `${formatTime(best)} SURVIVED`;
    overlay.innerHTML = `<div class="intro"><div class="eyebrow">${game.state === 'won' ? 'EXTRACTION SUCCESSFUL' : 'OPERATOR SIGNAL LOST'}</div><h2>${game.state === 'won' ? 'You made<br>it home.' : 'The zone<br>takes its toll.'}</h2><p>${formatTime(game.time)} survived · ${game.kills} kills · Level ${game.level}<br>${game.state === 'won' ? 'Another sunrise. Another chance.' : 'Every run is a lesson. Go again.'}</p><button class="primary" id="restart">${game.state === 'won' ? 'REDEPLOY' : 'TRY AGAIN'} <span>↻</span></button></div>`;
    $('restart').onclick = start;
  }
  if (!overlay.hidden)
    overlay.querySelector('button')?.focus({ preventScroll: true });
}
function frame(timestamp) {
  const dt = last ? (timestamp - last) / 1000 : 0;
  last = timestamp;
  const previousKills = game.kills;
  update(game, dt, input(), { width, height });
  if (game.kills > previousKills) tone(110, 0.045, 0.015);
  render();
  syncUI();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
