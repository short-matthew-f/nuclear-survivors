import './style.css';
import {
  createGame,
  update,
  applyUpgrade,
  reroll,
  activateDash,
  activateNova,
  formatTime,
  seededRandom,
  distance,
} from './game.js';
import {
  DURATION,
  OPERATORS,
  ZONES,
  WEAPONS,
  RESEARCH,
  ACHIEVEMENTS,
  UPGRADES,
} from './content.js';
import { SAVE_KEY, parseProfile, purchase, settleRun } from './profile.js';
import { createRenderer } from './render.js';
import { CHECKPOINT_KEY, serializeRun, restoreRun } from './checkpoint.js';

const $ = (id) => document.getElementById(id),
  canvas = $('game'),
  renderer = createRenderer(canvas);
let profile = parseProfile(null),
  storageAvailable = true;
try {
  profile = parseProfile(localStorage.getItem(SAVE_KEY));
  const legacyBest = Number(localStorage.getItem('nuclear-survivors-best'));
  if (Number.isFinite(legacyBest))
    profile.best = Math.max(profile.best, legacyBest);
} catch {
  storageAvailable = false;
}
let operator = 'nomad',
  zone = 'forest',
  mode = 'extraction',
  screen = 'home',
  game = createGame(),
  pointer = null,
  last = 0,
  ambient = 0,
  uiClock = 0,
  overlayStamp = '',
  audio,
  result = null,
  installPrompt = null,
  waitingWorker = null,
  savedRun = null,
  checkpointClock = 0;
try {
  savedRun = restoreRun(localStorage.getItem(CHECKPOINT_KEY));
} catch {
  /* Storage is optional. */
}
function checkpoint() {
  const data = serializeRun(game);
  if (data)
    try {
      localStorage.setItem(CHECKPOINT_KEY, data);
    } catch {
      /* Keep playing if storage fills. */
    }
}
function clearCheckpoint() {
  savedRun = null;
  try {
    localStorage.removeItem(CHECKPOINT_KEY);
  } catch {
    /* Storage is optional. */
  }
}
const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches;
if (reducedMotion) profile.settings.shake = false;
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
  } catch {
    storageAvailable = false;
    toast('Storage unavailable. Progress lasts for this session.');
  }
}
let toastTimer;
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500);
}
function tone(frequency, duration = 0.1, volume = 0.035) {
  if (!profile.settings.sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, frequency * 0.5),
      audio.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {
    /* Audio is optional on restricted browsers. */
  }
}
function haptic(pattern = 12) {
  if (profile.settings.haptics) navigator.vibrate?.(pattern);
}
function resize() {
  renderer.resize(profile.settings.quality);
}
new ResizeObserver(resize).observe(canvas);
resize();
function action(label, id, cls = 'primary', extra = '') {
  return `<button class="${cls}" data-action="${id}" ${extra}>${label}</button>`;
}
function heading(kicker, title, description = '') {
  return `<div class="eyebrow">${kicker}</div><h1>${title}</h1>${description ? `<p class="lede">${description}</p>` : ''}`;
}
function navigation() {
  return `<div class="menu-nav">${action('← BACK', 'home', 'text-button')}<span class="currency">◈ ${profile.scrap} <small>SALVAGE</small></span></div>`;
}
function start() {
  const daily = mode === 'daily',
    seed = new Date().toISOString().slice(0, 10);
  clearCheckpoint();
  game = createGame(
    seededRandom(daily ? seed : `${Date.now()}-${Math.random()}`),
    {
      operator: daily ? 'nomad' : operator,
      zone: daily ? 'forest' : zone,
      mode: mode === 'endless' ? 'endless' : 'extraction',
      research: daily ? {} : profile.research,
    },
  );
  game.state = 'playing';
  screen = 'run';
  result = null;
  pointer = null;
  overlayStamp = '';
  tone(330, 0.25);
  renderUI();
}
function menu(next = 'home') {
  screen = next;
  overlayStamp = '';
  pointer = null;
  if (game.state === 'ready') {
    game = createGame(Math.random, { operator, zone });
  }
  renderUI();
}
function pause() {
  if (game.state === 'playing') {
    game.state = 'paused';
    checkpoint();
    pointer = null;
    overlayStamp = '';
    renderUI();
  }
}
function resume() {
  if (game.state === 'paused') {
    game.state = 'playing';
    screen = 'run';
    pointer = null;
    overlayStamp = '';
    renderUI();
  }
}
function input() {
  if (!pointer) return { x: 0, y: 0 };
  const dx = (pointer.x - pointer.ox) / 44,
    dy = (pointer.y - pointer.oy) / 44;
  return Math.hypot(dx, dy) < 0.12 ? { x: 0, y: 0 } : { x: dx, y: dy };
}
canvas.addEventListener('pointerdown', (e) => {
  if (game.state !== 'playing' || pointer) return;
  const rect = canvas.getBoundingClientRect();
  pointer = {
    id: e.pointerId,
    ox: e.clientX - rect.left,
    oy: e.clientY - rect.top,
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (pointer?.id !== e.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = e.clientX - rect.left;
  pointer.y = e.clientY - rect.top;
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
  canvas.addEventListener(event, (e) => {
    if (pointer?.id === e.pointerId) pointer = null;
  });
window.addEventListener('blur', pause);
window.addEventListener('pagehide', checkpoint);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (game.state === 'playing') pause();
    else if (game.state === 'paused') resume();
  }
});
$('pause').onclick = pause;
$('dash').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (activateDash(game, input())) {
    tone(180, 0.13);
    haptic(16);
  }
});
$('nova').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (activateNova(game)) {
    tone(70, 0.35, 0.06);
    haptic([20, 30, 20]);
  }
});
// Click also supports assistive technology and keyboard activation without double-firing touch actions.
$('dash').addEventListener('click', (e) => {
  if (e.detail === 0) activateDash(game, input());
});
$('nova').addEventListener('click', (e) => {
  if (e.detail === 0) activateNova(game);
});
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  overlayStamp = '';
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  toast('Bunker installed. See you in the zone.');
});
async function install() {
  if (installPrompt) {
    await installPrompt.prompt();
    installPrompt = null;
  } else {
    menu('guide');
    toast(
      'iPhone: Share → Add to Home Screen. Android: browser menu → Install app.',
    );
  }
}
async function fullscreen() {
  try {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    toast('For fullscreen on this device, add the game to your home screen.');
  }
}
$('overlay').addEventListener('click', async (e) => {
  const button = e.target.closest('button');
  if (!button || button.disabled) return;
  const act = button.dataset.action;
  const value = button.dataset.value;
  tone(420, 0.035, 0.012);
  if (act === 'start') start();
  else if (act === 'restore' && savedRun) {
    game = savedRun;
    savedRun = null;
    screen = 'run';
    overlayStamp = '';
    renderUI();
  } else if (
    ['home', 'workshop', 'records', 'guide', 'settings'].includes(act)
  ) {
    if (act === 'home' && ['dead', 'won'].includes(game.state))
      game = createGame(Math.random, { operator, zone });
    menu(act);
  } else if (act === 'operator') {
    if (!profile.operators.includes(value)) {
      if (!purchase(profile, 'operator', value)) {
        toast('Recover more salvage to recruit this operator.');
        return;
      }
      save();
    }
    operator = value;
    menu();
  } else if (act === 'zone') {
    if (!profile.zones.includes(value)) {
      if (!purchase(profile, 'zone', value)) {
        toast('Recover more salvage to access this sector.');
        return;
      }
      save();
    }
    zone = value;
    menu();
  } else if (act === 'mode') {
    mode = value;
    menu();
  } else if (act === 'research') {
    if (purchase(profile, 'research', value)) {
      save();
      tone(650, 0.15);
      menu('workshop');
    } else toast('Not enough salvage.');
  } else if (act === 'upgrade') {
    if (applyUpgrade(game, value)) {
      haptic(12);
      tone(700, 0.18);
      pointer = null;
      overlayStamp = '';
      renderUI();
    }
  } else if (act === 'reroll') {
    if (reroll(game)) {
      overlayStamp = '';
      renderUI();
    }
  } else if (act === 'resume') resume();
  else if (act === 'abandon') {
    screen = 'confirm';
    overlayStamp = '';
    renderUI();
  } else if (act === 'confirm-abandon') {
    game.state = 'dead';
    screen = 'run';
    overlayStamp = '';
    renderUI();
  } else if (act === 'cancel-abandon') {
    screen = 'run';
    overlayStamp = '';
    renderUI();
  } else if (act === 'setting') {
    if (value === 'quality')
      profile.settings.quality =
        profile.settings.quality === 'high' ? 'low' : 'high';
    else profile.settings[value] = !profile.settings[value];
    save();
    resize();
    menu('settings');
  } else if (act === 'settings-back') {
    screen = game.state === 'paused' ? 'run' : 'home';
    overlayStamp = '';
    renderUI();
  } else if (act === 'install') await install();
  else if (act === 'fullscreen') await fullscreen();
});
function homeScreen() {
  const o = OPERATORS.find((o) => o.id === operator),
    z = ZONES.find((z) => z.id === zone);
  return `<div class="home"><div class="home-main"><div class="brand-mark">☢</div>${heading('A SURVIVAL ROGUELITE', 'NUCLEAR<br><em>SURVIVORS.</em>', 'The world ended. Your shift didn’t.')}<div class="home-actions">${savedRun ? action(`RESUME ${formatTime(savedRun.time)} OPERATION <span>↗</span>`, 'restore') + action('NEW OPERATION', 'start', 'secondary') : action('ENTER THE ZONE <span>↗</span>', 'start')}${action('THE BUNKER <span>◈</span>', 'workshop', 'secondary')}</div><div class="home-links">${action('FIELD GUIDE', 'guide', 'text-button')}${action('RUN ARCHIVE', 'records', 'text-button')}${action('SETTINGS', 'settings', 'text-button')}</div><div class="install-row">${action('⊕ INSTALL GAME', 'install', 'text-button')}<span>TOUCH TO MOVE · AUTO COMBAT</span></div></div><div class="deployment-panel"><div class="panel-heading"><span>PREPARE TO DEPLOY</span><span class="currency">◈ ${profile.scrap}</span></div><label>01 / OPERATOR</label><div class="operator-options">${OPERATORS.map((item) => `<button class="operator-option ${operator === item.id ? 'selected' : ''}" data-action="operator" data-value="${item.id}" aria-pressed="${operator === item.id}"><span style="color:${item.color}">${item.icon}</span><strong>${item.name}</strong><small>${profile.operators.includes(item.id) ? item.role : `◈ ${item.cost} TO RECRUIT`}</small></button>`).join('')}</div><p class="selection-description">${o.description}</p><label>02 / DROP ZONE</label><div class="zone-options">${ZONES.map((item) => `<button class="zone-option ${zone === item.id ? 'selected' : ''}" data-action="zone" data-value="${item.id}" aria-pressed="${zone === item.id}"><span class="zone-swatch ${item.id}"></span><span><strong>${item.name}</strong><small>${profile.zones.includes(item.id) ? item.label : `LOCKED · ◈ ${item.cost}`}</small></span><b>${zone === item.id ? '↗' : '+'}</b></button>`).join('')}</div><label>03 / OPERATION</label><div class="mode-options">${[
    ['extraction', 'EXTRACT'],
    ['endless', 'ENDLESS'],
    ['daily', 'DAILY'],
  ]
    .map(([id, name]) =>
      action(
        name,
        'mode',
        mode === id ? 'selected' : '',
        `data-value="${id}" aria-pressed="${mode === id}"`,
      ),
    )
    .join(
      '',
    )}</div><p class="selection-description">${mode === 'daily' ? 'A shared daily seed. Nomad. Red Forest. No bunker bonuses. Local scores only.' : mode === 'endless' ? 'No rescue is coming. Survive as long as you can.' : 'Eight minutes. Three titans. Hold the extraction beacon to get home.'}</p><div class="sector-note"><i></i>${z.subtitle}<span>FIELD BUILD 0.2</span></div></div></div>`;
}
function workshopScreen() {
  return `<div class="menu-page">${navigation()}${heading('PERMANENT PROGRESSION', 'THE BUNKER.', 'Bring something back. Make the next run count.')}<div class="research-grid">${RESEARCH.map(
    (r) => {
      const rank = profile.research[r.id] || 0,
        cost = r.cost * (rank + 1);
      return `<article class="research-card"><span class="research-icon">${r.icon}</span><div class="eyebrow">RESEARCH / ${rank} OF ${r.cap}</div><h2>${r.name}</h2><p>${r.description}</p><div class="rank-track">${Array.from({ length: r.cap }, (_, i) => `<i class="${i < rank ? 'filled' : ''}"></i>`).join('')}</div>${action(rank === r.cap ? 'FULLY RESEARCHED' : `RESEARCH <span>◈ ${cost}</span>`, 'research', 'secondary', `data-value="${r.id}" ${rank === r.cap || profile.scrap < cost ? 'disabled' : ''}`)}</article>`;
    },
  ).join(
    '',
  )}</div><div class="section-label">FIELD BOUNTIES <span>RESET EVERY RUN</span></div><div class="bounties"><div><strong>100 infected</strong><span>Clear the field</span><b>◈ 25</b></div><div><strong>3 supply caches</strong><span>Leave nothing behind</span><b>◈ 30</b></div><div><strong>1 titan</strong><span>Bring down a giant</span><b>◈ 40</b></div></div><p class="subtle">Salvage also recruits operators and opens sectors on the deployment screen.</p>${!storageAvailable ? '<p class="storage-warning">Browser storage is unavailable. Progress will not persist after closing.</p>' : ''}</div>`;
}
function recordsScreen() {
  return `<div class="menu-page">${navigation()}${heading('EVERY RUN LEAVES A MARK', 'FIELD RECORDS.')}<div class="record-stats"><div><strong>${profile.runs}</strong><span>DEPLOYMENTS</span></div><div><strong>${profile.wins}</strong><span>EXTRACTIONS</span></div><div><strong>${profile.kills}</strong><span>INFECTED DOWN</span></div><div><strong>${formatTime(profile.best)}</strong><span>LONGEST RUN</span></div></div><div class="section-label">COMMENDATIONS <span>${profile.achievements.length} / ${ACHIEVEMENTS.length}</span></div><div class="achievement-grid">${ACHIEVEMENTS.map((a) => `<div class="achievement ${profile.achievements.includes(a.id) ? 'earned' : ''}"><span>${profile.achievements.includes(a.id) ? '✦' : '◇'}</span><div><strong>${a.name}</strong><p>${a.description}</p></div><small>◈ ${a.reward}</small></div>`).join('')}</div><div class="section-label">RECENT OPERATIONS</div>${profile.history.length ? `<div class="history">${profile.history.map((r) => `<div><span class="${r.won ? 'success' : ''}">${r.won ? 'EXTRACTED' : 'SIGNAL LOST'}</span><strong>${ZONES.find((z) => z.id === r.zone).name}</strong><span>${r.kills} KILLS</span><b>${formatTime(r.time)}</b></div>`).join('')}</div>` : '<p class="subtle">No field records yet. The zone is waiting.</p>'}</div>`;
}
function guideScreen() {
  return `<div class="menu-page">${navigation()}${heading('READ THIS. STAY ALIVE.', 'FIELD MANUAL.')}<div class="guide-grid"><article><span>01</span><h2>Keep your thumb moving.</h2><p>Touch and drag anywhere on the field. A floating stick follows your thumb. Drag a little to walk, further to run. Weapons aim and fire automatically. A mouse drag works too.</p></article><article><span>02</span><h2>Use both hands.</h2><p>Keep moving with one thumb. Tap Dash with the other to slip through danger. Shockwave clears nearby enemies and incoming projectiles. Both recharge automatically.</p></article><article><span>03</span><h2>Become the hazard.</h2><p>Green cores grant experience. Each level offers three mutations. Build an arsenal or specialize. Two rerolls per run. Supply caches restore health, award salvage, and draw in nearby cores.</p></article><article><span>04</span><h2>Get home.</h2><p>Titans arrive at 1:30, 3:30, and 6:30. Dodge their projectile rings and radiation warnings. At 8:00, follow the cyan marker. Stay inside the beacon for eight seconds to extract. Endless mode has no extraction.</p></article></div><div class="section-label">WEAPON EVOLUTIONS <span>LEVEL 5 + REQUIRED MUTATION</span></div><div class="evolution-list">${[
    ['carbine', 'Railstorm', 'Depleted uranium'],
    ['arc', 'Thunder God', 'Deadeye'],
    ['orbit', 'Death Halo', 'Lead skin'],
    ['pulse', 'Supernova', 'Unstable isotope'],
    ['mine', 'Hellfire', 'Hot rounds'],
  ]
    .map(
      ([id, name, req]) =>
        `<div><span style="color:${WEAPONS[id].color}">${WEAPONS[id].icon}</span><strong>${WEAPONS[id].name} <i>→ ${name}</i></strong><small>${req}</small></div>`,
    )
    .join(
      '',
    )}</div><div class="install-help"><h2>Take the zone with you.</h2><p>On iPhone or iPad: open in Safari, tap Share, then Add to Home Screen. On Android: choose Install app from the browser menu. After one complete online load, the installed game can launch offline. Progress is stored on this device; clearing site data removes it.</p>${action(installPrompt ? 'INSTALL GAME ↗' : 'INSTALL / HOME SCREEN', 'install', 'secondary')}</div></div>`;
}
function settingsScreen() {
  return `<div class="menu-page settings-page"><div class="menu-nav">${action('← BACK', 'settings-back', 'text-button')}</div>${heading('MAKE YOURSELF AT HOME', 'FIELD SETTINGS.')}<div class="settings-list">${[
    ['sound', 'Sound effects', 'Procedural audio. No external downloads.'],
    [
      'haptics',
      'Haptic feedback',
      'A little kick when it matters. Supported devices only.',
    ],
    ['shake', 'Screen shake', 'Camera impact during explosions and damage.'],
    [
      'quality',
      'Visual quality',
      'Low reduces particle atmosphere and display resolution.',
    ],
  ]
    .map(
      ([id, title, desc]) =>
        `<button data-action="setting" data-value="${id}" aria-pressed="${id === 'quality' ? profile.settings.quality === 'high' : profile.settings[id]}"><span><strong>${title}</strong><small>${desc}</small></span><b>${id === 'quality' ? profile.settings.quality.toUpperCase() : profile.settings[id] ? 'ON' : 'OFF'}</b></button>`,
    )
    .join(
      '',
    )}</div>${action('ENTER / EXIT FULLSCREEN ↗', 'fullscreen', 'secondary')}<p class="subtle">Installed mode fills the screen without the browser toolbar. Progress saves automatically after each run.</p></div>`;
}
function pauseScreen() {
  return `<div class="pause-page">${heading('SIGNAL ON HOLD', 'TAKE A BREATH.', 'The zone can wait.')}<div class="run-summary"><span>${formatTime(game.time)} SURVIVED</span><span>${game.kills} KILLS</span><span>LEVEL ${game.level}</span></div><div class="pause-actions">${action('BACK TO THE FIELD ↗', 'resume')}${action('SETTINGS', 'settings', 'secondary')}${action('END OPERATION', 'abandon', 'text-button')}</div><div class="section-label">CURRENT ARSENAL</div><div class="pause-weapons">${Object.entries(
    game.weapons,
  )
    .map(
      ([id, w]) =>
        `<span>${WEAPONS[id].icon} ${WEAPONS[id].name} <b>LV ${w.level}${w.evolved ? ' · EVOLVED' : ''}</b></span>`,
    )
    .join(
      '',
    )}</div><div class="section-label">ACTIVE BOUNTIES</div><div class="pause-contracts"><span>${Math.min(100, game.kills)} / 100 INFECTED</span><span>${Math.min(3, game.crates)} / 3 CACHES</span><span>${Math.min(1, game.bossKills)} / 1 TITAN</span></div></div>`;
}
function upgradeScreen() {
  return `<div class="upgrade-page">${heading(`LEVEL ${game.level} / ADAPTATION AVAILABLE`, 'EVOLVE OR DIE.', 'Take what the fallout gives you.')}<div class="choices">${game.choices
    .map((u) => {
      const w = game.weapons[u.id],
        rank = w ? w.level : game.modifications[u.id] || 0;
      return `<button class="choice ${u.rarity === 'WEAPON' ? 'weapon-choice' : ''}" data-action="upgrade" data-value="${u.id}"><div class="choice-top"><span>${u.rarity}</span><small>${rank ? `RANK ${rank} → ${rank + 1}` : 'NEW'}</small></div><div class="choice-icon">${u.icon}</div><h2>${u.name}</h2><p>${u.description}</p><div class="choice-bottom">${w?.level === 4 ? 'EVOLUTION WITH MATCHING MUTATION' : 'INSTALL MODIFICATION'} <b>↗</b></div></button>`;
    })
    .join(
      '',
    )}</div><div class="upgrade-footer"><span>${game.pendingLevels > 1 ? `${game.pendingLevels - 1} MORE ADAPTATIONS QUEUED` : 'FIELD SIMULATION PAUSED'}</span>${action(`↻ REROLL (${game.rerolls})`, 'reroll', 'text-button', game.rerolls ? '' : 'disabled')}</div></div>`;
}
function endScreen() {
  if (!result) {
    clearCheckpoint();
    result = settleRun(profile, game);
    save();
    tone(game.state === 'won' ? 600 : 100, 0.4);
  }
  const won = game.state === 'won';
  return `<div class="end-page"><div class="end-icon">${won ? '✦' : '☢'}</div>${heading(won ? 'EXTRACTION CONFIRMED' : 'OPERATOR SIGNAL LOST', won ? 'ANOTHER<br><em>SUNRISE.</em>' : 'THE ZONE<br><em>REMEMBERS.</em>', won ? 'You brought yourself home. That’s enough for today.' : 'Every run leaves something behind. Make it count.')}<div class="record-stats"><div><strong>${formatTime(game.time)}</strong><span>SURVIVED</span></div><div><strong>${game.kills}</strong><span>INFECTED</span></div><div><strong>${game.bossKills}</strong><span>TITANS</span></div><div><strong>${game.level}</strong><span>LEVEL</span></div></div><div class="salvage-earned"><span>SALVAGE RECOVERED</span><strong>+${result?.earned || 0} ◈</strong></div>${result?.unlocked.length ? `<div class="unlocked">${result.unlocked.map((a) => `<span>✦ ${a.name} <b>+${a.reward} ◈</b></span>`).join('')}</div>` : ''}<div class="end-actions">${action('ONE MORE RUN ↗', 'start')}${action('RETURN TO BUNKER', 'home', 'secondary')}</div></div>`;
}
function renderUI() {
  const playing = game.state === 'playing',
    inRun = screen === 'run';
  $('hud').hidden = !playing;
  $('overlay').hidden = playing;
  $('update-banner').hidden = !waitingWorker || game.state !== 'ready';
  const stamp = `${screen}:${game.state}:${game.level}:${game.pendingLevels}:${game.rerolls}`;
  if (stamp !== overlayStamp && !playing) {
    overlayStamp = stamp;
    const html =
      screen === 'settings'
        ? settingsScreen()
        : screen === 'confirm'
          ? `<div class="pause-page">${heading('RETURN TO BUNKER', 'END THIS RUN?', 'Your collected salvage will be recovered. This operation cannot be resumed.')}<div class="pause-actions">${action('KEEP FIGHTING', 'cancel-abandon')}${action('END OPERATION', 'confirm-abandon', 'secondary')}</div></div>`
          : !inRun
            ? (
                {
                  home: homeScreen,
                  workshop: workshopScreen,
                  records: recordsScreen,
                  guide: guideScreen,
                }[screen] || homeScreen
              )()
            : game.state === 'upgrade'
              ? upgradeScreen()
              : game.state === 'paused'
                ? pauseScreen()
                : ['dead', 'won'].includes(game.state)
                  ? endScreen()
                  : homeScreen();
    $('overlay').innerHTML = html;
    $('overlay').scrollTop = 0;
  }
  if (!playing) return;
  const p = game.player;
  $('operator-label').textContent = game.operator.name.toUpperCase();
  $('health-label').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('health').style.width = `${(p.hp / p.maxHp) * 100}%`;
  $('health').classList.toggle('critical', p.hp / p.maxHp < 0.3);
  $('level').textContent = `LV ${game.level}`;
  $('kills').textContent = `${game.kills} KILLS`;
  $('timer').textContent = formatTime(game.time);
  $('phase').textContent =
    game.mode === 'endless'
      ? 'NO EXTRACTION'
      : game.extraction
        ? 'REACH THE BEACON'
        : `EXTRACTION IN ${formatTime(Math.ceil(Math.max(0, DURATION - game.time)))}`;
  $('xp').style.width = `${(game.xp / game.xpNeeded) * 100}%`;
  const boss = game.enemies.find((e) => e.type === 'boss');
  $('boss-hud').hidden = !boss;
  if (boss) {
    $('boss-name').textContent = boss.name;
    $('boss-health').style.width =
      `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  }
  const message = game.eventUntil > game.time ? game.eventText : '';
  if ($('announcement').textContent !== message)
    $('announcement').textContent = message;
  $('announcement').classList.toggle('visible', !!message);
  const loadout = Object.entries(game.weapons)
    .map(
      ([id, w]) =>
        `<div class="loadout-weapon ${w.evolved ? 'evolved' : ''}" title="${WEAPONS[id].name} level ${w.level}${w.evolved ? ', evolved' : ''}"><span style="color:${WEAPONS[id].color}">${WEAPONS[id].icon}</span><small>${w.evolved ? '✦' : w.level}</small></div>`,
    )
    .join('');
  if ($('loadout').innerHTML !== loadout) $('loadout').innerHTML = loadout;
  $('touch-hint').hidden = game.time > 8 || game.distance > 120;
  for (const [id, timer, total] of [
    ['dash', p.dashTimer, p.dashCooldown],
    ['nova', p.novaTimer, p.novaCooldown],
  ]) {
    const el = $(id);
    el.style.setProperty('--cooldown', `${(timer / total) * 100}%`);
    el.classList.toggle('recharging', timer > 0);
    el.querySelector('b').textContent = timer > 0 ? Math.ceil(timer) : '';
    el.setAttribute(
      'aria-label',
      `${id === 'nova' ? 'Shockwave' : 'Dash'}${timer > 0 ? `, ready in ${Math.ceil(timer)} seconds` : ', ready'}`,
    );
  }
  $('extract-hud').hidden =
    !game.extraction || distance(p, game.extraction) > game.extraction.radius;
  if (game.extraction) {
    $('extract-percent').textContent =
      `${Math.floor((game.extractProgress / 8) * 100)}%`;
    $('extract-fill').style.width = `${(game.extractProgress / 8) * 100}%`;
  }
}
let previousHp = game.player.hp,
  previousState = game.state,
  previousKills = 0;
function frame(timestamp) {
  const dt = last ? Math.min(0.05, (timestamp - last) / 1000) : 0;
  last = timestamp;
  ambient += dt;
  update(game, dt, input(), renderer.getView());
  if (game.player.hp < previousHp - 1) {
    haptic(25);
    tone(65, 0.12);
  }
  if (game.kills > previousKills) tone(110, 0.045, 0.012);
  checkpointClock += dt;
  if (
    (checkpointClock >= 5 && game.state === 'playing') ||
    (previousState !== game.state && game.state === 'upgrade')
  ) {
    checkpoint();
    checkpointClock = 0;
  }
  if (previousState !== game.state) {
    pointer = null;
    overlayStamp = '';
  }
  previousHp = game.player.hp;
  previousState = game.state;
  previousKills = game.kills;
  renderer.render(game, profile.settings, pointer, ambient);
  uiClock += dt;
  if (uiClock >= 0.1 || overlayStamp === '') {
    renderUI();
    uiClock = 0;
  }
  requestAnimationFrame(frame);
}
renderUI();
requestAnimationFrame(frame);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((reg) => {
      const waiting = () => {
        waitingWorker =
          reg.waiting && navigator.serviceWorker.controller
            ? reg.waiting
            : null;
        renderUI();
      };
      waiting();
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', waiting);
      });
    })
    .catch(() =>
      toast('Offline install unavailable. The game still works online.'),
    );
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) location.reload();
  });
  $('apply-update').onclick = () => {
    if (waitingWorker) {
      refreshing = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };
}
