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
  OPERATORS,
  ZONES,
  WEAPONS,
  RESEARCH,
  ACHIEVEMENTS,
  UPGRADES,
  ABILITIES,
  WEAPON_COSTS,
  LEGACY_WEAPONS,
  CHAPTERS,
  DIFFICULTIES,
  PERKS,
  FIELD_EVENTS,
  ENEMIES,
  LORE,
  EVOLUTIONS,
} from './content.js';
import {
  SAVE_KEY,
  parseProfile,
  purchase,
  settleRun,
  selectPerk,
  exportProfile,
  importProfile,
  loadoutFor,
  equipLoadout,
} from './profile.js';
import { upgradePreview, evolutionProgress, WEAPON_LIMIT } from './build.js';
import { artUrl } from './art.js';
import { createRenderer } from './render.js';
import { commitOvertime, missionGoals, missionReady } from './expedition.js';
import { abilityFor } from './abilities.js';
import { createAudio } from './audio.js';
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
  mode = 'campaign',
  difficulty = 'survivor',
  chapterId =
    CHAPTERS.find((c) => !profile.chapters.includes(c.id))?.id ||
    CHAPTERS[0].id,
  shopTab = 'heroes',
  screen = 'home',
  game = createGame(),
  pointer = null,
  last = 0,
  ambient = 0,
  uiClock = 0,
  overlayStamp = '',
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
const sound = createAudio(() => profile.settings);
const tone = (...args) => sound.tone(...args);
document.addEventListener('pointerdown', () => sound.unlock(), { once: true });
document.documentElement.style.setProperty(
  '--key-art',
  `url("${artUrl('key-art.png', import.meta.env.BASE_URL, document.baseURI)}")`,
);
document.documentElement.style.setProperty(
  '--characters',
  `url("${artUrl('characters.png', import.meta.env.BASE_URL, document.baseURI)}")`,
);
document.documentElement.style.setProperty(
  '--roster',
  `url("${artUrl('roster.png', import.meta.env.BASE_URL, document.baseURI)}")`,
);
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
    chapter =
      mode === 'campaign' ? CHAPTERS.find((c) => c.id === chapterId) : null,
    seed = new Date().toISOString().slice(0, 10);
  clearCheckpoint();
  game = createGame(
    seededRandom(daily ? seed : `${Date.now()}-${Math.random()}`),
    {
      operator: daily ? 'nomad' : operator,
      zone: daily ? 'forest' : chapter ? chapter.zone : zone,
      mode: mode === 'endless' ? 'endless' : 'extraction',
      research: daily ? {} : profile.research,
      weapon: daily ? 'carbine' : loadoutFor(profile, operator).weapon,
      ability: daily ? 'shockwave' : loadoutFor(profile, operator).ability,
      allowedWeapons: daily ? LEGACY_WEAPONS : profile.weapons,
      difficulty: daily
        ? 'survivor'
        : chapter
          ? chapter.difficulty
          : difficulty,
      perk: daily ? 'none' : profile.perk,
      chapter: chapter?.id || null,
      daily: daily ? seed : null,
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
$('overtime').onclick = () => {
  if (commitOvertime(game)) {
    checkpoint();
    tone(90, 0.5);
    haptic([20, 30, 20]);
  }
};
let pendingImport = null;
$('import-save').onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';
  if (file.size > 1000000) {
    toast('This backup is too large.');
    return;
  }
  try {
    pendingImport = importProfile(await file.text());
    if (!pendingImport) {
      toast('This file is not a valid Nuclear Survivors backup.');
      return;
    }
    menu('import-confirm');
  } catch {
    toast('Could not read that backup.');
  }
};
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
  if (act === 'start') {
    if (mode === 'campaign') menu('campaign');
    else start();
  } else if (act === 'deploy') start();
  else if (act === 'restore' && savedRun) {
    game = savedRun;
    savedRun = null;
    screen = 'run';
    overlayStamp = '';
    renderUI();
  } else if (
    [
      'home',
      'workshop',
      'records',
      'guide',
      'settings',
      'campaign',
      'codex',
    ].includes(act)
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
  } else if (act === 'difficulty') {
    if (value === 'veteran' && !profile.wins) return;
    difficulty = value;
    menu();
  } else if (act === 'chapter') {
    const index = CHAPTERS.findIndex((c) => c.id === value);
    if (
      index < 0 ||
      !CHAPTERS.slice(0, index).every((c) => profile.chapters.includes(c.id))
    )
      return;
    chapterId = value;
    mode = 'campaign';
    menu('campaign');
  } else if (act === 'perk') {
    if (selectPerk(profile, value)) {
      save();
      menu('workshop');
    } else toast('Complete the listed commendation to unlock this kit.');
  } else if (act === 'export') {
    const blob = new Blob([exportProfile(profile)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'nuclear-survivors-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Bunker backup exported. Keep it somewhere safe.');
  } else if (act === 'import') {
    $('import-save').click();
  } else if (act === 'accept-import' && pendingImport) {
    profile = pendingImport;
    pendingImport = null;
    save();
    clearCheckpoint();
    operator = 'nomad';
    zone = 'forest';
    game = createGame();
    chapterId =
      CHAPTERS.find((c) => !profile.chapters.includes(c.id))?.id ||
      CHAPTERS[0].id;
    resize();
    menu('settings');
    toast('Bunker backup restored.');
  } else if (act === 'cancel-import') {
    pendingImport = null;
    menu('settings');
  } else if (act === 'shop-tab') {
    if (
      ['heroes', 'weapons', 'abilities', 'research', 'kits'].includes(value)
    ) {
      shopTab = value;
      menu('workshop');
    }
  } else if (act === 'recruit') {
    if (
      !profile.operators.includes(value) &&
      !purchase(profile, 'operator', value)
    ) {
      toast('Recover more salvage to recruit this hero.');
      return;
    }
    operator = value;
    save();
    menu('workshop');
  } else if (
    ['buy-weapon', 'buy-ability', 'equip-weapon', 'equip-ability'].includes(act)
  ) {
    const kind = act.endsWith('weapon') ? 'weapon' : 'ability';
    if (act.startsWith('buy') && !purchase(profile, kind, value)) {
      toast('Not enough salvage, or this item is already unlocked.');
      return;
    }
    if (equipLoadout(profile, operator, kind, value)) {
      save();
      tone(650, 0.15);
      menu('workshop');
    }
  } else if (act === 'research') {
    if (purchase(profile, 'research', value)) {
      save();
      tone(650, 0.15);
      menu('workshop');
    } else toast('Not enough salvage.');
  } else if (act === 'upgrade') {
    if (applyUpgrade(game, value)) {
      haptic(12);
      tone(
        Object.values(game.weapons).some((w) => w.evolved) ? 980 : 700,
        0.28,
      );
      checkpoint();
      pointer = null;
      overlayStamp = '';
      renderUI();
    }
  } else if (act === 'reroll') {
    if (reroll(game)) {
      checkpoint();
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
  return `<div class="home"><div class="home-main"><div class="brand-mark">☢ <small>FIELD BUILD 1.2</small></div>${heading('A SURVIVAL ROGUELITE', 'NUCLEAR<br><em>SURVIVORS.</em>', 'The world ended. Your shift didn’t.')}<div class="home-actions">${savedRun ? action(`RESUME ${formatTime(savedRun.time)} OPERATION <span>↗</span>`, 'restore') + action('NEW OPERATION', 'start', 'secondary') : action('ENTER THE ZONE <span>↗</span>', 'start')}${action('THE BUNKER <span>◈</span>', 'workshop', 'secondary')}</div><div class="home-links">${action('FIELD GUIDE', 'guide', 'text-button')}${action('CODEX', 'codex', 'text-button')}${action('RUN ARCHIVE', 'records', 'text-button')}${action('SETTINGS', 'settings', 'text-button')}</div><div class="install-row">${action('⊕ INSTALL GAME', 'install', 'text-button')}<span>TOUCH TO MOVE · AUTO COMBAT</span></div></div><div class="deployment-panel"><div class="panel-heading"><span>PREPARE TO DEPLOY</span><span class="currency">◈ ${profile.scrap}</span></div><label>01 / OPERATOR</label><div class="operator-options">${OPERATORS.map((item) => `<button class="operator-option ${operator === item.id ? 'selected' : ''}" data-action="operator" data-value="${item.id}" aria-pressed="${operator === item.id}"><span class="operator-art art-${item.id}" aria-hidden="true"></span><strong>${item.name}</strong><small>${profile.operators.includes(item.id) ? item.role : `◈ ${item.cost} TO RECRUIT`}</small></button>`).join('')}</div><p class="selection-description">${o.description}</p><div class="selected-kit"><strong>${WEAPONS[loadoutFor(profile, operator).weapon].name}</strong><span>+ ${ABILITIES.find((a) => a.id === loadoutFor(profile, operator).ability).name}</span>${action('CHANGE LOADOUT ↗', 'workshop', 'text-button')}</div><label>02 / DROP ZONE</label><div class="zone-options">${ZONES.map((item) => `<button class="zone-option ${zone === item.id ? 'selected' : ''}" data-action="zone" data-value="${item.id}" aria-pressed="${zone === item.id}"><span class="zone-swatch ${item.id}"></span><span><strong>${item.name}</strong><small>${profile.zones.includes(item.id) ? item.label : `LOCKED · ◈ ${item.cost}`}</small></span><b>${zone === item.id ? '↗' : '+'}</b></button>`).join('')}</div><label>03 / OPERATION</label><div class="mode-options">${[
    ['campaign', 'STORY'],
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
    )}</div><p class="selection-description">${mode === 'campaign' ? `Five chapters. A world worth saving. ${profile.chapters.length} / ${CHAPTERS.length} complete.` : mode === 'daily' ? 'A shared daily seed. Nomad. Red Forest. No bunker bonuses. Local scores only.' : mode === 'endless' ? 'No rescue is coming. Survive as long as you can.' : 'Eight minutes. Three titans. Hold the extraction beacon to get home.'}</p>${mode !== 'daily' && mode !== 'campaign' ? `<label>04 / THREAT LEVEL</label><div class="difficulty-options">${DIFFICULTIES.map((d) => action(d.name, 'difficulty', difficulty === d.id ? 'selected' : '', `data-value="${d.id}" ${d.id === 'veteran' && !profile.wins ? 'disabled' : ''}`)).join('')}</div><p class="selection-description">${DIFFICULTIES.find((d) => d.id === difficulty).description}</p>` : ''}<div class="sector-note"><i></i>${z.subtitle}<span>BUILD 1.2</span></div></div></div>`;
}
function campaignScreen() {
  const chapter = CHAPTERS.find((c) => c.id === chapterId) || CHAPTERS[0];
  return `<div class="menu-page campaign-page">${navigation()}${heading('THE BUNKER SIX CHRONICLES', 'ONE MORE<br><em>SUNRISE.</em>', 'Five expeditions. One reason to come home.')}<div class="chapter-list">${CHAPTERS.map(
    (c, i) => {
      const done = profile.chapters.includes(c.id);
      const available = CHAPTERS.slice(0, i).every((c) =>
        profile.chapters.includes(c.id),
      );
      return `<button data-action="chapter" data-value="${c.id}" class="${chapter.id === c.id ? 'selected' : ''}" ${available ? '' : 'disabled'}><span>${done ? '✦' : String(i + 1).padStart(2, '0')}</span><div><strong>${c.title}</strong><small>${ZONES.find((z) => z.id === c.zone).name} · ${DIFFICULTIES.find((d) => d.id === c.difficulty).name}</small></div><b>${done ? 'REPLAY' : available ? 'READY' : 'LOCKED'}</b></button>`;
    },
  ).join(
    '',
  )}</div><article class="briefing"><div class="eyebrow">MISSION BRIEFING / ${chapter.id.toUpperCase()}</div><h2>${chapter.title}</h2><p>${chapter.briefing}</p><ul class="mission-list">${chapter.goals.map((goal) => `<li>${goal.label}</li>`).join('')}<li>Survive eight minutes and extract alive</li></ul><div class="run-summary"><span>${ZONES.find((z) => z.id === chapter.zone).name.toUpperCase()}</span><span>${DIFFICULTIES.find((d) => d.id === chapter.difficulty).name.toUpperCase()}</span><span>${profile.chapters.includes(chapter.id) ? 'CHAPTER REWARD CLAIMED' : `FIRST CLEAR: ◈ ${chapter.reward}`}</span></div>${action('DEPLOY TO SECTOR ↗', 'deploy')}</article></div>`;
}
function codexScreen() {
  return `<div class="menu-page">${navigation()}${heading('KNOW WHAT HUNTS YOU', 'ZONE CODEX.', 'Recovered field intelligence. Updated after every operation.')}<div class="codex-grid">${Object.entries(
    ENEMIES,
  )
    .map(
      ([id, e]) =>
        `<article class="codex-card"><div class="codex-art enemy-art-${id}" aria-hidden="true"></div><div><div class="eyebrow">${profile.enemyKills[id] || 0} CONFIRMED KILLS</div><h2>${e.name}</h2><p>${LORE[id]}</p><small>BASE HP ${e.hp} · CONTACT ${e.damage}</small></div></article>`,
    )
    .join(
      '',
    )}</div><div class="section-label">SIGNALS WORTH FOLLOWING</div><div class="guide-grid">${Object.values(
    FIELD_EVENTS,
  )
    .map(
      (e) =>
        `<article><span>${e.icon}</span><h2>${e.name}</h2><p>${e.instruction}. Stay within the marked circle for ${e.duration} seconds. Earn ${e.reward} salvage plus supplies. Signals expire after 80 seconds.</p></article>`,
    )
    .join(
      '',
    )}</div><p class="subtle">Elite infected have an amber ring, tougher armor, and carry extra salvage. Dash through gaps and use Shockwave to clear hostile projectiles.</p></div>`;
}
function workshopScreen() {
  const loadout = loadoutFor(profile, operator),
    hero = OPERATORS.find((o) => o.id === operator);
  const tabs = [
    ['heroes', 'HEROES'],
    ['weapons', 'WEAPONS'],
    ['abilities', 'ABILITIES'],
    ['research', 'RESEARCH'],
    ['kits', 'KITS'],
  ];
  let content = '';
  if (shopTab === 'heroes')
    content = `<div class="store-grid">${OPERATORS.map((o) => {
      const owned = profile.operators.includes(o.id);
      return `<article class="store-card ${o.id === operator ? 'selected' : ''}"><div class="store-portrait operator-art art-${o.id}" aria-hidden="true"></div><div class="eyebrow">${o.role}</div><h2>${o.name}</h2><p>${o.description}</p><div class="store-includes">INCLUDES ${WEAPONS[o.weapon].name} + ${ABILITIES.find((a) => a.id === o.ability).name}</div>${action(o.id === operator ? 'SELECTED' : owned ? 'SELECT HERO ↗' : `RECRUIT ◈ ${o.cost}`, 'recruit', 'secondary', `data-value="${o.id}" ${o.id === operator || (!owned && profile.scrap < o.cost) ? 'disabled' : ''}`)}</article>`;
    }).join('')}</div>`;
  if (shopTab === 'weapons')
    content = `<p class="subtle">Unlock weapons for level-up offers. Equip one as ${hero.name}’s starting weapon. Four weapon slots per operation.</p><div class="store-grid">${Object.entries(
      WEAPONS,
    )
      .map(([id, w]) => {
        const owned = profile.weapons.includes(id),
          equipped = loadout.weapon === id;
        return `<article class="store-card ${equipped ? 'selected' : ''}"><span class="store-symbol" style="color:${w.color}">${w.icon}</span><div class="eyebrow">${owned ? 'UNLOCKED' : 'BUNKER BLUEPRINT'}</div><h2>${w.name}</h2><p>${w.description}</p><div class="store-includes">EVOLVES INTO ${EVOLUTIONS[id].name}</div>${action(equipped ? 'STARTING WEAPON' : owned ? 'EQUIP STARTING WEAPON ↗' : `UNLOCK & EQUIP ◈ ${WEAPON_COSTS[id]}`, owned ? 'equip-weapon' : 'buy-weapon', 'secondary', `data-value="${id}" ${equipped || (!owned && profile.scrap < WEAPON_COSTS[id]) ? 'disabled' : ''}`)}</article>`;
      })
      .join('')}</div>`;
  if (shopTab === 'abilities')
    content = `<p class="subtle">Equip one active ability alongside Dash. Ability unlocks work for every recruited hero.</p><div class="store-grid">${ABILITIES.map(
      (a) => {
        const owned = profile.abilities.includes(a.id),
          equipped = loadout.ability === a.id;
        return `<article class="store-card ${equipped ? 'selected' : ''}"><span class="store-symbol">${a.icon}</span><div class="eyebrow">${a.cooldown}s BASE COOLDOWN</div><h2>${a.name}</h2><p>${a.description}</p>${action(equipped ? 'ACTIVE ABILITY' : owned ? 'EQUIP ABILITY ↗' : `UNLOCK & EQUIP ◈ ${a.cost}`, owned ? 'equip-ability' : 'buy-ability', 'secondary', `data-value="${a.id}" ${equipped || (!owned && profile.scrap < a.cost) ? 'disabled' : ''}`)}</article>`;
      },
    ).join('')}</div>`;
  if (shopTab === 'research')
    content = `<div class="research-grid">${RESEARCH.map((r) => {
      const rank = profile.research[r.id] || 0,
        cost = r.cost * (rank + 1);
      return `<article class="research-card"><span class="research-icon">${r.icon}</span><div class="eyebrow">RESEARCH / ${rank} OF ${r.cap}</div><h2>${r.name}</h2><p>${r.description}</p><div class="rank-track">${Array.from({ length: r.cap }, (_, i) => `<i class="${i < rank ? 'filled' : ''}"></i>`).join('')}</div>${action(rank === r.cap ? 'FULLY RESEARCHED' : `RESEARCH <span>◈ ${cost}</span>`, 'research', 'secondary', `data-value="${r.id}" ${rank === r.cap || profile.scrap < cost ? 'disabled' : ''}`)}</article>`;
    }).join('')}</div>`;
  if (shopTab === 'kits')
    content = `<div class="kit-grid">${PERKS.map((p) => {
      const unlocked =
        !p.requirement || profile.achievements.includes(p.requirement);
      return `<button class="kit-card ${profile.perk === p.id ? 'selected' : ''}" data-action="perk" data-value="${p.id}" aria-pressed="${profile.perk === p.id}"><span>${p.icon}</span><strong>${p.name}</strong><p>${p.description}</p><small>${profile.perk === p.id ? 'EQUIPPED' : unlocked ? 'EQUIP KIT ↗' : `UNLOCK: ${ACHIEVEMENTS.find((a) => a.id === p.requirement).name.toUpperCase()}`}</small></button>`;
    }).join('')}</div>`;
  return `<div class="menu-page">${navigation()}${heading('RECOVER. RECRUIT. REARM.', 'THE BUNKER.', 'Every expedition opens more ways to survive.')}<div class="bunker-loadout"><strong>${hero.name}</strong><span>${WEAPONS[loadout.weapon].name} · ${ABILITIES.find((a) => a.id === loadout.ability).name}</span>${action('DEPLOYMENT ↗', 'home', 'text-button')}</div><nav class="store-tabs" aria-label="Bunker categories">${tabs.map(([id, label]) => action(label, 'shop-tab', shopTab === id ? 'selected' : '', `data-value="${id}" aria-pressed="${shopTab === id}"`)).join('')}</nav>${content}<p class="subtle">Hero recruitment includes its signature weapon and active ability. Unlocks are permanent. Daily challenges use a fixed loadout without bunker bonuses.</p>${!storageAvailable ? '<p class="storage-warning">Progress cannot be saved while browser storage is unavailable.</p>' : ''}</div>`;
}
function recordsScreen() {
  return `<div class="menu-page">${navigation()}${heading('EVERY RUN LEAVES A MARK', 'FIELD RECORDS.')}<div class="record-stats"><div><strong>${profile.runs}</strong><span>DEPLOYMENTS</span></div><div><strong>${profile.wins}</strong><span>EXTRACTIONS</span></div><div><strong>${profile.kills}</strong><span>INFECTED DOWN</span></div><div><strong>${formatTime(profile.best)}</strong><span>LONGEST RUN</span></div></div><div class="section-label">COMMENDATIONS <span>${profile.achievements.length} / ${ACHIEVEMENTS.length}</span></div><div class="achievement-grid">${ACHIEVEMENTS.map((a) => `<div class="achievement ${profile.achievements.includes(a.id) ? 'earned' : ''}"><span>${profile.achievements.includes(a.id) ? '✦' : '◇'}</span><div><strong>${a.name}</strong><p>${a.description}</p></div><small>◈ ${a.reward}</small></div>`).join('')}</div>${profile.dailyScores.length ? `<div class="section-label">DAILY CHALLENGE <span>PERSONAL BESTS · UTC</span></div><div class="history">${profile.dailyScores.map((d) => `<div><span>${d.date}</span><strong>${d.score.toLocaleString()} PTS</strong><span>${d.won ? 'EXTRACTED' : 'SIGNAL LOST'}</span></div>`).join('')}</div>` : ''}<div class="section-label">RECENT OPERATIONS</div>${profile.history.length ? `<div class="history">${profile.history.map((r) => `<div><span class="${r.won ? 'success' : ''}">${r.won ? 'EXTRACTED' : 'SIGNAL LOST'}</span><strong>${ZONES.find((z) => z.id === r.zone).name}</strong><span>${r.kills} KILLS</span><b>${formatTime(r.time)}</b></div>`).join('')}</div>` : '<p class="subtle">No field records yet. The zone is waiting.</p>'}</div>`;
}
function guideScreen() {
  return `<div class="menu-page">${navigation()}${heading('READ THIS. STAY ALIVE.', 'FIELD MANUAL.')}<div class="guide-grid"><article><span>01</span><h2>Keep your thumb moving.</h2><p>Touch and drag anywhere on the field. A floating stick follows your thumb. Drag a little to walk, further to run. Weapons aim and fire automatically. A mouse drag works too.</p></article><article><span>02</span><h2>Use both hands.</h2><p>Keep moving with one thumb. Tap Dash with the other to slip through danger. The second button uses your equipped ability: blast, heal, overclock, freeze, or deploy a sentry. Both abilities recharge automatically. Change your active ability in the bunker.</p></article><article><span>03</span><h2>Become the hazard.</h2><p>Green cores grant experience. Each level offers a weapon specialization, a mutation, and room for a new weapon. Carry up to four weapons. Your last chosen weapon stays in focus. The build path shows its evolution key. Two rerolls per run. Supply caches restore health, award salvage, and draw in nearby cores.</p></article><article><span>04</span><h2>Get home.</h2><p>Titans arrive at 1:30, 3:30, and 6:30. Dodge their projectile rings and radiation warnings. At 8:00, follow the cyan marker. Stay inside the beacon for eight seconds to extract. Endless mode has no extraction. Once the beacon opens, you can choose Overtime: four more minutes for 75% bonus salvage, a full heal, and more titans.</p></article></div><div class="section-label">WEAPON EVOLUTIONS <span>LEVEL 5 + REQUIRED MUTATION</span></div><div class="evolution-list">${Object.entries(
    EVOLUTIONS,
  )
    .map(([id, e]) => [
      id,
      e.name,
      UPGRADES.find((u) => u.id === e.mutation).name,
    ])
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
    [
      'sound',
      'Sound effects',
      'Weapon fire, impacts, abilities, and interface sounds.',
    ],
    ['music', 'Wasteland score', 'An original procedural ambient soundtrack.'],
    [
      'numbers',
      'Damage numbers',
      'Show damage and critical hit values in combat.',
    ],
    [
      'radar',
      'Field radar',
      'Nearby threats, objectives, supplies, and extraction.',
    ],
    [
      'leftHanded',
      'Left-handed abilities',
      'Move Dash and your active ability to the left side.',
    ],
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
    )}</div>${action('ENTER / EXIT FULLSCREEN ↗', 'fullscreen', 'secondary')}<div class="backup-actions">${action('EXPORT SAVE', 'export', 'secondary')}${action('RESTORE BACKUP', 'import', 'secondary')}</div><p class="subtle">Installed mode fills the screen without the browser toolbar. Progress saves automatically after each run.</p></div>`;
}
function pauseScreen() {
  return `<div class="pause-page">${heading('SIGNAL ON HOLD', 'TAKE A BREATH.', 'The zone can wait.')}<div class="run-summary"><span>${formatTime(game.time)} SURVIVED</span><span>${game.kills} KILLS</span><span>LEVEL ${game.level}</span></div><div class="pause-actions">${action('BACK TO THE FIELD ↗', 'resume')}${action('SETTINGS', 'settings', 'secondary')}${action('END OPERATION', 'abandon', 'text-button')}</div><div class="run-summary"><span>${game.difficulty.name.toUpperCase()}</span><span>${game.eventsCompleted} EVENTS</span><span>${game.eliteKills} ELITES</span><span>◈ ${game.scrap} SALVAGE</span></div><div class="section-label">CURRENT ARSENAL</div><div class="pause-weapons">${Object.entries(
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
  const focus = game.weapons[game.focusWeapon]
    ? game.focusWeapon
    : Object.keys(game.weapons)[0];
  const evolution = evolutionProgress(game, focus);
  return `<div class="upgrade-page">${heading(`LEVEL ${game.level} / CHOOSE YOUR BUILD`, 'MAKE IT<br><em>COUNT.</em>', 'Specialize your weapon. Add a new tool. Find your evolution.')}<div class="build-path"><div><strong>${WEAPONS[focus].name} → ${evolution.name}</strong><small>${evolution.evolved ? 'EVOLVED' : `WEAPON ${evolution.rank}/5 · ${evolution.keyReady ? '✓' : '◇'} ${evolution.mutation}`}</small></div><span>${Object.keys(game.weapons).length}/${Math.max(WEAPON_LIMIT, Object.keys(game.weapons).length)} WEAPONS</span></div><div class="choices">${game.choices
    .map((u) => {
      const preview = upgradePreview(game, u.id);
      const weapon = WEAPONS[u.id];
      return `<button class="choice ${weapon ? 'weapon-choice' : ''} ${preview.evolves ? 'evolution-choice' : ''}" data-action="upgrade" data-value="${u.id}"><div class="choice-top"><span>${preview.lane}</span><small>${weapon ? `WEAPON ${preview.next}/5` : `RANK ${preview.next}`}</small></div><div class="choice-icon" ${weapon ? `style="color:${weapon.color}"` : ''}>${u.icon}</div><div class="choice-identity">${weapon ? weapon.name : u.rarity}</div><h2>${preview.title}</h2><ul class="upgrade-effects">${preview.lines.map((line) => `<li>${line}</li>`).join('')}</ul><div class="choice-bottom">${preview.evolves ? 'TRANSFORM YOUR WEAPON' : weapon && !game.weapons[u.id] ? 'ADD TO YOUR ARSENAL' : weapon ? 'INSTALL & FIRE IMMEDIATELY' : 'APPLY THIS ADAPTATION'} <b>↗</b></div></button>`;
    })
    .join(
      '',
    )}</div><div class="upgrade-footer"><span>${game.pendingLevels > 1 ? `${game.pendingLevels - 1} MORE CHOICES QUEUED` : 'FIELD SIMULATION PAUSED'}</span>${action(`↻ REROLL (${game.rerolls})`, 'reroll', 'text-button', game.rerolls ? '' : 'disabled')}</div></div>`;
}
function endScreen() {
  if (!result) {
    clearCheckpoint();
    result = settleRun(profile, game);
    save();
    tone(game.state === 'won' ? 600 : 100, 0.4);
  }
  const won = game.state === 'won';
  const completed = result?.chapterCompleted;
  if (completed)
    chapterId =
      CHAPTERS.find((c) => !profile.chapters.includes(c.id))?.id ||
      completed.id;
  return `<div class="end-page"><div class="end-icon">${won ? '✦' : '☢'}</div>${heading(won ? 'EXTRACTION CONFIRMED' : 'OPERATOR SIGNAL LOST', won ? 'ANOTHER<br><em>SUNRISE.</em>' : 'THE ZONE<br><em>REMEMBERS.</em>', won ? 'You brought yourself home. That’s enough for today.' : 'Every run leaves something behind. Make it count.')}<div class="record-stats"><div><strong>${formatTime(game.time)}</strong><span>SURVIVED</span></div><div><strong>${game.kills}</strong><span>INFECTED</span></div><div><strong>${game.bossKills}</strong><span>TITANS</span></div><div><strong>${game.level}</strong><span>LEVEL</span></div></div><div class="salvage-earned"><span>SALVAGE RECOVERED</span><strong>+${result?.earned || 0} ◈</strong></div>${result?.unlocked.length ? `<div class="unlocked">${result.unlocked.map((a) => `<span>✦ ${a.name} <b>+${a.reward} ◈</b></span>`).join('')}</div>` : ''}${completed ? `<article class="chapter-debrief"><div class="eyebrow">CHAPTER COMPLETE · +${completed.reward} SALVAGE</div><h2>${completed.title}</h2><p>${completed.debrief}</p>${profile.chapters.length === CHAPTERS.length ? '<strong>CAMPAIGN COMPLETE · THANK YOU FOR PLAYING</strong>' : ''}</article>` : ''}<div class="run-summary"><span>${game.eventsCompleted} EVENTS</span><span>${game.eliteKills} ELITES</span><span>${Math.round(game.damageDealt).toLocaleString()} DAMAGE</span></div><div class="end-actions">${action(completed ? 'CONTINUE STORY ↗' : 'ONE MORE RUN ↗', 'start')}${action('RETURN TO BUNKER', 'home', 'secondary')}</div></div>`;
}
function renderUI() {
  const playing = game.state === 'playing',
    inRun = screen === 'run';
  document.body.classList.toggle('left-handed', profile.settings.leftHanded);
  sound.setActive(playing);
  $('hud').hidden = !playing;
  $('overlay').classList.toggle(
    'home-overlay',
    screen === 'home' && game.state === 'ready',
  );
  $('overlay').hidden = playing;
  $('update-banner').hidden = !waitingWorker || game.state !== 'ready';
  const stamp = `${screen}:${game.state}:${game.level}:${game.pendingLevels}:${game.rerolls}`;
  if (stamp !== overlayStamp && !playing) {
    overlayStamp = stamp;
    const html =
      screen === 'settings'
        ? settingsScreen()
        : screen === 'import-confirm'
          ? `<div class="pause-page">${heading('RESTORE BUNKER', 'REPLACE THIS SAVE?', 'Your current progression will be replaced by the selected backup. Export your current save first if you want to keep it.')}<div class="pause-actions">${action('CANCEL', 'cancel-import')}${action('RESTORE BACKUP', 'accept-import', 'secondary')}</div></div>`
          : screen === 'confirm'
            ? `<div class="pause-page">${heading('RETURN TO BUNKER', 'END THIS RUN?', 'Your collected salvage will be recovered. This operation cannot be resumed.')}<div class="pause-actions">${action('KEEP FIGHTING', 'cancel-abandon')}${action('END OPERATION', 'confirm-abandon', 'secondary')}</div></div>`
            : !inRun
              ? (
                  {
                    home: homeScreen,
                    workshop: workshopScreen,
                    records: recordsScreen,
                    guide: guideScreen,
                    campaign: campaignScreen,
                    codex: codexScreen,
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
      : game.chapter && game.time >= game.extractionAt && !missionReady(game)
        ? 'COMPLETE MISSION OBJECTIVES'
        : game.extraction
          ? 'REACH THE BEACON'
          : `EXTRACTION IN ${formatTime(Math.ceil(Math.max(0, game.extractionAt - game.time)))}`;
  const mission = missionGoals(game);
  $('mission-hud').hidden = !mission.length;
  $('mission-hud').textContent = mission
    .map(
      (goal) =>
        `${goal.progress >= goal.target ? '✓' : '◇'} ${goal.label} ${Math.min(goal.progress, goal.target)}/${goal.target}`,
    )
    .join(' · ');
  const event = game.fieldEvent;
  $('field-objective').hidden = !event;
  if (event) {
    const spec = FIELD_EVENTS[event.kind];
    $('objective-name').textContent = spec.name;
    $('objective-detail').textContent =
      `${Math.ceil(Math.max(0, event.expires - game.time))}s · ${Math.round(distance(p, event))}m`;
    $('objective-instruction').textContent = event.guards.some((id) =>
      game.enemies.some((e) => e.id === id && e.hp > 0),
    )
      ? 'CLEAR THE ELITE GUARDS'
      : distance(p, event) < 65
        ? 'HOLD HERE TO COMPLETE'
        : 'ENTER THE MARKED CIRCLE';
    $('objective-progress').style.width =
      `${Math.min(100, (event.progress / spec.duration) * 100)}%`;
  }
  $('buff-status').textContent =
    game.buffs.surge > 0
      ? `ϟ OVERCLOCK ${Math.ceil(game.buffs.surge)}s`
      : game.buffs.overdrive > 0
        ? `ϟ OVERDRIVE ${Math.ceil(game.buffs.overdrive)}s`
        : p.invulnerable > 1
          ? `⬡ SHIELD ${Math.ceil(p.invulnerable)}s`
          : '';
  $('overtime').hidden = !game.extraction || game.overtime || !!game.daily;
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
      `${id === 'nova' ? abilityFor(game).name : 'Dash'}${timer > 0 ? `, ready in ${Math.ceil(timer)} seconds` : ', ready'}`,
    );
  }
  $('nova').querySelector('span').textContent = abilityFor(game).icon;
  $('nova').querySelector('small').textContent =
    abilityFor(game).name.toUpperCase();
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
  previousKills = 0,
  previousShots = 0;
function frame(timestamp) {
  const dt = last ? Math.min(0.05, (timestamp - last) / 1000) : 0;
  last = timestamp;
  ambient += dt;
  update(game, dt, input(), renderer.getView());
  if (game.player.hp < previousHp - 1) {
    haptic(25);
    tone(65, 0.12);
  }
  if (game.shotsFired > previousShots)
    sound.shot(
      game.weapons.scatter
        ? 'scatter'
        : game.weapons.drone
          ? 'drone'
          : 'carbine',
    );
  previousShots = game.shotsFired;
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
    .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
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
