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
  UPGRADES,
  ABILITIES,
  LEGACY_WEAPONS,
  CHAPTERS,
  DIFFICULTIES,
  FIELD_EVENTS,
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
import { FIELD_UNLOCKS } from './unlocks.js';
import { artUrl } from './art.js';
import { createRenderer } from './render.js';
import { commitOvertime, missionGoals, missionReady } from './expedition.js';
import { abilityFor } from './abilities.js';
import { createAudio } from './audio.js';
import { equipHeroStyle, branchForGame, abilityCooldown } from './mastery.js';
import { RELICS, applyRelic } from './relics.js';
import { eventInstruction } from './expedition.js';
import { createMenuRenderer } from './menu.js';
import { MENU_ROOTS, validateDeployment } from './menu-model.js';
import {
  renderHome,
  renderHeroes,
  renderHero,
  renderEquipment,
  renderBunker,
  renderDeployment,
  renderChapters,
  renderZone,
  renderKits,
  renderRecords,
  renderSettings,
  renderResults,
  renderReplaceRun,
  decorateLegacy,
} from './presentation.js';
import { CHECKPOINT_KEY, serializeRun, restoreRun } from './checkpoint.js';

const $ = (id) => document.getElementById(id),
  canvas = $('game'),
  renderer = createRenderer(canvas),
  renderMenu = createMenuRenderer($('overlay')),
  menuHeaderObserver = new ResizeObserver((entries) => {
    for (const entry of entries)
      $('overlay').style.setProperty(
        '--ux-header-height',
        `${entry.target.getBoundingClientRect().height}px`,
      );
  });
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
const initialDeployment = validateDeployment(profile, profile.deployment);
let operator = initialDeployment.operator,
  zone = initialDeployment.zone,
  mode = initialDeployment.mode,
  difficulty = initialDeployment.difficulty,
  chapterId = initialDeployment.chapter,
  inspectedHero = operator,
  heroTab = 'loadout',
  heroTabs = {},
  bunkerTab = 'research',
  armoryType = 'weapon',
  recordTab = 'archive',
  equipmentKind = 'weapon',
  inventoryFilter = 'all',
  zoneDetail = 'marsh',
  activeRoot = 'home',
  navHistory = [],
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
  return `<div class="menu-nav">${action('← Back', 'back', 'text-button')}<span class="currency">◈ ${profile.scrap} <small>SALVAGE</small></span></div>`;
}
function start() {
  navHistory = [];
  const daily = mode === 'daily',
    chapter =
      mode === 'campaign' ? CHAPTERS.find((c) => c.id === chapterId) : null,
    seed = new Date().toISOString().slice(0, 10);
  rememberDeployment();
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
      branch: daily ? 'standard' : profile.heroStyles[operator]?.branch,
      outfit: daily ? 'field' : profile.heroStyles[operator]?.outfit,
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
function rememberDeployment() {
  profile.deployment = validateDeployment(profile, {
    operator,
    zone,
    mode,
    difficulty,
    chapter: chapterId,
  });
  save();
}
function openScreen(next) {
  if (next !== screen) navHistory.push(screen);
  menu(next);
}
function backScreen() {
  if (screen === 'settings' && game.state === 'paused') {
    navHistory.pop();
    screen = 'run';
    overlayStamp = '';
    renderUI();
    return;
  }
  menu(navHistory.pop() || activeRoot);
}
function menu(next = 'home') {
  if (MENU_ROOTS.includes(next)) activeRoot = next;
  else if (['hero', 'equipment'].includes(next)) activeRoot = 'heroes';
  else if (
    ['deployment', 'campaign', 'zone-detail', 'kits', 'replace-run'].includes(
      next,
    )
  )
    activeRoot = 'home';
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
    openScreen('guide');
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
  if (act === 'nav' && MENU_ROOTS.includes(value)) {
    navHistory = [];
    if (['dead', 'won'].includes(game.state))
      game = createGame(Math.random, { operator, zone });
    menu(value);
  } else if (act === 'back' || act === 'settings-back') backScreen();
  else if (act === 'start' || act === 'deploy') {
    if (savedRun) openScreen('replace-run');
    else start();
  } else if (act === 'confirm-start') start();
  else if (act === 'restore' && savedRun) {
    game = savedRun;
    savedRun = null;
    navHistory = [];
    screen = 'run';
    overlayStamp = '';
    renderUI();
  } else if (act === 'result-retry') {
    operator = game.operator.id;
    zone = game.zone.id;
    mode = game.daily
      ? 'daily'
      : game.chapter
        ? 'campaign'
        : game.mode === 'endless'
          ? 'endless'
          : 'extraction';
    if (game.chapter && !result?.chapterCompleted) chapterId = game.chapter;
    difficulty = game.difficulty.id;
    rememberDeployment();
    start();
  } else if (act === 'hero-open' || act === 'hero-goal') {
    if (!OPERATORS.some((o) => o.id === value)) return;
    inspectedHero = value;
    heroTab = act === 'hero-goal' ? 'mastery' : heroTabs[value] || 'loadout';
    openScreen('hero');
  } else if (
    act === 'hero-tab' &&
    ['loadout', 'mastery', 'appearance'].includes(value)
  ) {
    heroTab = value;
    heroTabs[inspectedHero] = value;
    menu('hero');
  } else if (act === 'hero-use' && profile.operators.includes(value)) {
    operator = value;
    rememberDeployment();
    navHistory = [];
    menu('home');
    toast(
      `${OPERATORS.find((o) => o.id === value).name} is ready for deployment.`,
    );
  } else if (act === 'gear-open' && ['weapon', 'ability'].includes(value)) {
    equipmentKind = value;
    inventoryFilter = 'all';
    openScreen('equipment');
  } else if (act === 'inventory-filter' && ['all', 'owned'].includes(value)) {
    inventoryFilter = value;
    menu('equipment');
  } else if (act === 'bunker-tab' && ['research', 'armory'].includes(value)) {
    bunkerTab = value;
    menu('workshop');
  } else if (act === 'armory-tab' && ['weapon', 'ability'].includes(value)) {
    armoryType = value;
    inventoryFilter = 'all';
    menu('workshop');
  } else if (
    act === 'record-tab' &&
    ['archive', 'goals', 'codex'].includes(value)
  ) {
    recordTab = value;
    menu('records');
  } else if (act === 'goals') {
    recordTab = 'goals';
    openScreen('records');
  } else if (act === 'goal-open') {
    const goal = FIELD_UNLOCKS.find((g) => g.id === value);
    if (!goal) return;
    if (goal.kind === 'operator') {
      inspectedHero = goal.target;
      heroTab = 'loadout';
      openScreen('hero');
    } else {
      bunkerTab = 'armory';
      armoryType = goal.kind;
      inventoryFilter = 'all';
      openScreen('workshop');
    }
  } else if (
    [
      'home',
      'heroes',
      'workshop',
      'records',
      'guide',
      'settings',
      'campaign',
      'deployment',
      'kits',
    ].includes(act)
  ) {
    if (act === 'home' && ['dead', 'won'].includes(game.state))
      game = createGame(Math.random, { operator, zone });
    openScreen(act);
  } else if (act === 'zone-detail' && ZONES.some((z) => z.id === value)) {
    zoneDetail = value;
    openScreen('zone-detail');
  } else if (act === 'buy-zone') {
    if (purchase(profile, 'zone', value)) {
      zone = value;
      rememberDeployment();
      navHistory.pop();
      menu('deployment');
      toast('Sector unlocked. Ready to deploy.');
    }
  } else if (act === 'zone' && profile.zones.includes(value)) {
    zone = value;
    rememberDeployment();
    menu('deployment');
  } else if (
    act === 'mode' &&
    ['campaign', 'extraction', 'endless', 'daily'].includes(value)
  ) {
    mode = value;
    rememberDeployment();
    menu('deployment');
  } else if (act === 'difficulty' && DIFFICULTIES.some((d) => d.id === value)) {
    if (value === 'veteran' && !profile.wins) return;
    difficulty = value;
    rememberDeployment();
    menu('deployment');
  } else if (act === 'chapter') {
    const index = CHAPTERS.findIndex((c) => c.id === value);
    if (
      index < 0 ||
      !CHAPTERS.slice(0, index).every((c) => profile.chapters.includes(c.id))
    )
      return;
    chapterId = value;
    mode = 'campaign';
    rememberDeployment();
    menu('campaign');
  } else if (act === 'deployment-done' || act === 'chapter-done') {
    rememberDeployment();
    navHistory = [];
    menu('home');
  } else if (act === 'perk') {
    if (selectPerk(profile, value)) {
      save();
      menu('kits');
      toast('Field kit equipped.');
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
    const selection = validateDeployment(profile, profile.deployment);
    operator = selection.operator;
    zone = selection.zone;
    mode = selection.mode;
    difficulty = selection.difficulty;
    chapterId = selection.chapter;
    inspectedHero = operator;
    game = createGame();
    resize();
    menu('settings');
    toast('Bunker backup restored.');
  } else if (act === 'cancel-import') {
    pendingImport = null;
    menu('settings');
  } else if (act === 'branch' || act === 'outfit') {
    if (equipHeroStyle(profile, inspectedHero, act, value)) {
      if (act === 'branch')
        equipLoadout(
          profile,
          inspectedHero,
          'ability',
          OPERATORS.find((o) => o.id === inspectedHero).ability,
        );
      save();
      menu('hero');
      toast(
        act === 'branch' ? 'Signature branch equipped.' : 'Outfit equipped.',
      );
    }
  } else if (act === 'relic') {
    if (applyRelic(game, value)) {
      checkpoint();
      overlayStamp = '';
      renderUI();
      tone(820, 0.2);
    }
  } else if (act === 'recruit') {
    if (purchase(profile, 'operator', value)) {
      save();
      inspectedHero = value;
      menu('hero');
      toast(
        `${OPERATORS.find((o) => o.id === value).name} recruited. Signature gear unlocked.`,
      );
    }
  } else if (['unlock-weapon', 'unlock-ability'].includes(act)) {
    const kind = act.endsWith('weapon') ? 'weapon' : 'ability';
    if (purchase(profile, kind, value)) {
      save();
      menu('workshop');
      toast('Shared gear unlocked. Equip it on a hero’s loadout page.');
    }
  } else if (
    ['buy-weapon', 'buy-ability', 'equip-weapon', 'equip-ability'].includes(act)
  ) {
    const kind = act.endsWith('weapon') ? 'weapon' : 'ability';
    if (act.startsWith('buy') && !purchase(profile, kind, value)) {
      toast('Not enough scrap, or this gear is already owned.');
      return;
    }
    if (equipLoadout(profile, inspectedHero, kind, value)) {
      save();
      tone(650, 0.15);
      menu('equipment');
      toast(
        `${kind === 'weapon' ? WEAPONS[value].name : ABILITIES.find((a) => a.id === value).name} equipped for ${OPERATORS.find((o) => o.id === inspectedHero).name}.`,
      );
    }
  } else if (act === 'research') {
    if (purchase(profile, 'research', value)) {
      save();
      tone(650, 0.15);
      menu('workshop');
      toast(
        `${RESEARCH.find((r) => r.id === value).name} · rank ${profile.research[value]}.`,
      );
    } else toast('Not enough scrap.');
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
  } else if (act === 'install') await install();
  else if (act === 'fullscreen') await fullscreen();
});
function relicScreen() {
  return `<div class="upgrade-page">${heading('RARE FIELD RELIC', 'CHANGE THE RULES.', 'Choose one permanent effect for this operation. Relics do not occupy weapon slots.')}<div class="choices">${game.relicChoices
    .map((id) => {
      const r = RELICS.find((r) => r.id === id);
      return `<button class="choice relic-card" data-action="relic" data-value="${id}"><span class="choice-icon" style="color:${r.color}">${r.icon}</span><div class="eyebrow">RARE RELIC</div><h2>${r.name}</h2><p>${r.description}</p><div class="choice-bottom">INSTALL RELIC <b>↗</b></div></button>`;
    })
    .join(
      '',
    )}</div><p class="subtle">${game.relics.length} / ${RELICS.length} relics installed · operation paused</p></div>`;
}
function menuContext() {
  return {
    profile,
    selection: { operator, zone, mode, difficulty, chapter: chapterId },
    savedRun,
    inspectedHero,
    heroTab,
    bunkerTab,
    armoryType,
    recordTab,
    equipmentKind,
    inventoryFilter,
    zoneDetail,
    activeRoot,
    storageAvailable,
    paused: game.state === 'paused',
  };
}
function homeScreen() {
  return renderHome(menuContext());
}
function workshopScreen() {
  return renderBunker(menuContext());
}
function recordsScreen() {
  return renderRecords(menuContext());
}
function campaignScreen() {
  return renderChapters(menuContext());
}
function settingsScreen() {
  return renderSettings(menuContext());
}
function guideScreen() {
  return `<div class="menu-page">${navigation()}${heading('READ THIS. STAY ALIVE.', 'FIELD MANUAL.')}<div class="guide-grid"><article><span>01</span><h2>Keep your thumb moving.</h2><p>Touch and drag anywhere on the field. A floating stick follows your thumb. Drag a little to walk, further to run. Weapons aim and fire automatically. A mouse drag works too.</p></article><article><span>02</span><h2>Use both hands.</h2><p>Keep moving with one thumb. Tap Dash with the other to slip through danger. The second button uses your equipped ability: blast, heal, overclock, freeze, or deploy a sentry. Both abilities recharge automatically. Change your active ability on your hero’s Loadout page.</p></article><article><span>03</span><h2>Become the hazard.</h2><p>Green cores grant experience. Each level offers a weapon specialization, a mutation, and room for a new weapon. Carry up to four weapons. Your last chosen weapon stays in focus. The build path shows its evolution key. Two rerolls per run. Supply caches restore health, award salvage, and draw in nearby cores.</p></article><article><span>04</span><h2>Get home.</h2><p>Titans arrive at 1:30, 3:30, and 6:30. Dodge their projectile rings and radiation warnings. At 8:00, follow the cyan marker. Stay inside the beacon for eight seconds to extract. Endless mode has no extraction. Once the beacon opens, you can choose Overtime: four more minutes for 75% bonus salvage, a full heal, and more titans.</p></article></div><div class="section-label">WEAPON EVOLUTIONS <span>LEVEL 5 + REQUIRED MUTATION</span></div><div class="evolution-list">${Object.entries(
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
    )}</div><div class="section-label">SIGNATURE ABILITY · ${branchForGame(game)?.name || abilityFor(game).name}</div>${
    game.relics.length
      ? `<div class="section-label">INSTALLED RELICS</div><div class="run-relics">${game.relics
          .map((id) => {
            const r = RELICS.find((r) => r.id === id);
            return `<article><strong>${r.icon} ${r.name}</strong><p>${r.description}</p></article>`;
          })
          .join('')}</div>`
      : ''
  }<div class="section-label">ACTIVE BOUNTIES</div><div class="pause-contracts"><span>${Math.min(100, game.kills)} / 100 INFECTED</span><span>${Math.min(3, game.crates)} / 3 CACHES</span><span>${Math.min(1, game.bossKills)} / 1 TITAN</span></div></div>`;
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
  if (completed && profile.deployment.chapter !== chapterId)
    rememberDeployment();
  return renderResults(menuContext(), game, result, completed);
}
function renderUI() {
  const playing = game.state === 'playing',
    inRun = screen === 'run';
  document.body.classList.toggle('left-handed', profile.settings.leftHanded);
  sound.setActive(playing);
  $('hud').hidden = !playing;
  $('overlay').classList.toggle('home-overlay', false);
  const polishedMenu =
    (screen !== 'run' && !['confirm', 'import-confirm'].includes(screen)) ||
    ['dead', 'won'].includes(game.state);
  $('overlay').classList.toggle('ux-overlay', polishedMenu);
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
                    heroes: () => renderHeroes(menuContext()),
                    hero: () => renderHero(menuContext()),
                    equipment: () => renderEquipment(menuContext()),
                    deployment: () => renderDeployment(menuContext()),
                    'zone-detail': () => renderZone(menuContext()),
                    kits: () => renderKits(menuContext()),
                    'replace-run': () => renderReplaceRun(menuContext()),
                    workshop: workshopScreen,
                    records: recordsScreen,
                    guide: () =>
                      decorateLegacy(
                        guideScreen(),
                        'records',
                        game.state !== 'paused',
                      ),
                    campaign: campaignScreen,
                  }[screen] || homeScreen
                )()
              : game.state === 'relic'
                ? relicScreen()
                : game.state === 'upgrade'
                  ? upgradeScreen()
                  : game.state === 'paused'
                    ? pauseScreen()
                    : ['dead', 'won'].includes(game.state)
                      ? endScreen()
                      : homeScreen();
    const page =
      screen === 'workshop'
        ? `${bunkerTab}:${armoryType}`
        : screen === 'hero'
          ? `${inspectedHero}:${heroTab}`
          : screen === 'equipment'
            ? `${inspectedHero}:${equipmentKind}:${inventoryFilter}`
            : screen === 'records'
              ? recordTab
              : '';
    const view = `${screen}:${page}:${inRun ? `${game.state}:${game.state === 'upgrade' ? game.level : ''}` : ''}`;
    renderMenu(html, view);
    menuHeaderObserver.disconnect();
    const header = $('overlay').querySelector('.ux-header');
    if (header) {
      $('overlay').style.setProperty(
        '--ux-header-height',
        `${header.getBoundingClientRect().height}px`,
      );
      menuHeaderObserver.observe(header);
    }
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
    $('objective-instruction').textContent = [
      'escort',
      'reactor',
      'defense',
    ].includes(event.kind)
      ? eventInstruction(game, event)
      : event.guards.some((id) =>
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
    $('boss-name').textContent =
      `${boss.name} · PHASE ${boss.stage || 1} · ${boss.parts?.filter((p) => p.hp > 0).length || 0} PARTS${boss.exposed > 0 || boss.parts?.every((p) => p.hp <= 0) ? ' · CORE EXPOSED' : ''}`;
    $('boss-health').style.width =
      `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  }
  const message = game.eventUntil > game.time ? game.eventText : '';
  if ($('announcement').textContent !== message)
    $('announcement').textContent = message;
  $('announcement').classList.toggle('visible', !!message);
  const loadout =
    Object.entries(game.weapons)
      .map(
        ([id, w]) =>
          `<div class="loadout-weapon ${w.evolved ? 'evolved' : ''}" title="${WEAPONS[id].name} level ${w.level}${w.evolved ? ', evolved' : ''}"><span style="color:${WEAPONS[id].color}">${WEAPONS[id].icon}</span><small>${w.evolved ? '✦' : w.level}</small></div>`,
      )
      .join('') +
    game.relics
      .map((id) => {
        const r = RELICS.find((r) => r.id === id);
        return `<div class="loadout-weapon relic-slot" title="${r.name}: ${r.description}"><span style="color:${r.color}">${r.icon}</span><small>✦</small></div>`;
      })
      .join('');
  if ($('loadout').innerHTML !== loadout) $('loadout').innerHTML = loadout;
  $('touch-hint').hidden = game.time > 8 || game.distance > 120;
  for (const [id, timer, total] of [
    ['dash', p.dashTimer, p.dashCooldown],
    ['nova', p.novaTimer, abilityCooldown(game)],
  ]) {
    const el = $(id);
    el.style.setProperty('--cooldown', `${(timer / total) * 100}%`);
    el.classList.toggle('recharging', timer > 0);
    el.querySelector('b').textContent = timer > 0 ? Math.ceil(timer) : '';
    el.setAttribute(
      'aria-label',
      `${id === 'nova' ? branchForGame(game)?.name || abilityFor(game).name : 'Dash'}${timer > 0 ? `, ready in ${Math.ceil(timer)} seconds` : ', ready'}`,
    );
  }
  $('nova').querySelector('span').textContent = abilityFor(game).icon;
  $('nova').querySelector('small').textContent = (
    branchForGame(game)?.name || abilityFor(game).name
  ).toUpperCase();
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
    (previousState !== game.state && ['upgrade', 'relic'].includes(game.state))
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
