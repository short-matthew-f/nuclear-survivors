import { hitExplanation } from './damage.js';
import {
  OPERATORS,
  WEAPONS,
  ABILITIES,
  WEAPON_COSTS,
  ZONES,
  CHAPTERS,
  DIFFICULTIES,
  RESEARCH,
  PERKS,
  ACHIEVEMENTS,
  ENEMIES,
  LORE,
  EVOLUTIONS,
  FIELD_EVENTS,
} from './content.js';
import { HERO_MASTERY, masteryTier } from './mastery.js';
import {
  FIELD_UNLOCKS,
  ownsReward,
  unlockReward,
  unlockHint,
} from './unlocks.js';
import { RELICS } from './relics.js';
import {
  heroLoadout,
  deploymentSummary,
  nextGoals,
  researchComparison,
  equipmentOrder,
} from './menu-model.js';

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const time = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const button = (
  label,
  action,
  value = '',
  cls = 'ux-secondary',
  disabled = false,
  extra = '',
) =>
  `<button class="${cls}" data-action="${action}" data-value="${esc(value)}" ${disabled ? 'disabled' : ''} ${extra}>${label}</button>`;
const glyph = (id) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${{ home: '<circle cx="12" cy="12" r="8"/><path d="m15 9-2 4-4 2 2-4z"/>', heroes: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>', workshop: '<path d="m3 10 9-7 9 7v11H3zM8 21v-7h8v7"/>', records: '<path d="M6 3h14v18H6a3 3 0 0 1 0-6h14M6 3a3 3 0 0 0-3 3v12M10 7h6M10 11h6"/>', settings: '<circle cx="12" cy="12" r="3"/><path d="m10 2-.6 2.6-2.2 1.3-2.5-.8-2 3.5 1.9 1.8V13l-1.9 1.8 2 3.5 2.5-.8 2.2 1.3.6 2.6h4l.6-2.6 2.2-1.3 2.5.8 2-3.5-1.9-1.8v-2.6l1.9-1.8-2-3.5-2.5.8-2.2-1.3L14 2z"/>', back: '<path d="m14 5-7 7 7 7"/>', arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>' }[id]}</svg>`;
export function rootNavigation(root) {
  return `<nav class="ux-dock" aria-label="Main navigation">${[
    ['home', 'Deploy'],
    ['heroes', 'Heroes'],
    ['workshop', 'Bunker'],
    ['records', 'Records'],
  ]
    .map(([id, name]) =>
      button(
        `${glyph(id)}<span>${name}</span>`,
        'nav',
        id,
        root === id ? 'current' : '',
        false,
        root === id ? 'aria-current="page"' : '',
      ),
    )
    .join('')}</nav>`;
}
function frame(
  c,
  title,
  root,
  content,
  { back = false, footer = '', subtitle = '', dock = true } = {},
) {
  return `<div class="ux-screen ${footer ? 'has-action' : ''}"><header class="ux-header">${back ? button(glyph('back'), 'back', '', 'ux-icon', false, 'aria-label="Back"') : '<span class="ux-insignia" aria-hidden="true">☢</span>'}<div><span class="ux-kicker">BUNKER SIX</span><h1 data-screen-title tabindex="-1">${title}</h1></div><div class="ux-wallet"><strong>◈ ${c.profile.scrap}</strong><span>Scrap</span></div>${button(glyph('settings'), 'settings', '', 'ux-icon', false, 'aria-label="Settings"')}</header><div class="ux-content">${subtitle ? `<p class="ux-intro">${subtitle}</p>` : ''}${content}</div>${footer ? `<div class="ux-action ${dock ? '' : 'without-dock'}">${footer}</div>` : ''}${dock ? rootNavigation(root) : ''}</div>`;
}
const tabs = (items, active, action, label) =>
  `<nav class="ux-tabs" aria-label="${label}">${items.map(([id, name]) => button(name, action, id, active === id ? 'selected' : '', false, `aria-pressed="${active === id}"`)).join('')}</nav>`;
const section = (title, extra = '') =>
  `<div class="ux-section"><h2>${title}</h2>${extra}</div>`;
const portrait = (hero, profile, cls = '') =>
  `<span class="operator-art art-${hero.id} ${profile.heroStyles[hero.id]?.outfit === 'veteran' ? 'veteran-outfit' : ''} ${cls}" aria-hidden="true"></span>`;
const meter = (value, max, label) =>
  `<progress max="${max}" value="${Math.min(max, value)}" aria-label="${esc(label)}"></progress>`;
const status = (text, owned = false) =>
  `<span class="ux-status ${owned ? 'positive' : ''}">${text}</span>`;
function goalRows(goals) {
  return `<div class="ux-goals">${goals.map((g) => button(`<div><span class="ux-small">${esc(g.reward)}</span><strong>${esc(g.label)}</strong>${meter(g.progress, g.target, g.label)}</div><span class="ux-goal-count">${g.progress}/${g.target} ${glyph('arrow')}</span>`, g.action, g.value, 'ux-goal')).join('')}</div>`;
}

export function renderHome(c) {
  const s = deploymentSummary(c.profile, c.selection),
    hero = s.hero;
  const checkpoint = c.savedRun;
  const content = `<div class="ux-field-banner"><div><span class="ux-kicker">${checkpoint ? 'OPERATION ON HOLD' : 'READY WHEN YOU ARE'}</span><h2>${checkpoint ? 'The zone can wait.' : 'One more sunrise.'}</h2><p>${checkpoint ? `${checkpoint.operator.name} · ${time(checkpoint.time)} survived` : 'Choose your build. Bring it home.'}</p></div></div>${button(`${portrait(hero, c.profile)}<div><span class="ux-small">${s.daily ? 'FIXED DAILY HERO' : checkpoint ? 'NEXT OPERATION HERO' : 'YOUR HERO'}</span><strong>${hero.name}</strong><span>${s.weapon.name} · ${s.abilityName}</span></div>${s.daily ? status('Daily') : glyph('arrow')}`, 'hero-open', hero.id, 'ux-hero-summary')}<div class="ux-setup-card"><div class="ux-row-heading"><span class="ux-small">${checkpoint ? 'NEXT MISSION' : 'MISSION'}</span>${button('Change', 'deployment', '', 'ux-link')}</div><h2>${s.missionName}</h2><p>${s.objective}</p><div class="ux-chips"><span>${s.modeName}</span><span>${s.zone.name}</span><span>${s.duration}</span><span>${s.difficulty.name}</span></div>${s.daily ? '<p class="ux-note">A shared seed with standard gear and no Bunker bonuses.</p>' : button(`<span>Field kit</span><strong>${PERKS.find((p) => p.id === c.profile.perk).name}</strong>${glyph('arrow')}`, 'kits', '', 'ux-setup-row')}</div>${section('Next goals', button('View all', 'goals', '', 'ux-link'))}${goalRows(nextGoals(c.profile, hero.id, 2))}${!nextGoals(c.profile, hero.id).length ? '<p class="ux-note">Field unlocks complete. Try another hero or a tougher operation.</p>' : ''}<p class="ux-build">FIELD BUILD 1.7 · TOUCH TO MOVE · AUTO COMBAT</p>`;
  const footer = checkpoint
    ? `${button(`Resume · ${time(checkpoint.time)} ${glyph('arrow')}`, 'restore', '', 'ux-primary')}${button('Start a new operation', 'start', '', 'ux-footer-link')}`
    : button(`Deploy ${glyph('arrow')}`, 'start', '', 'ux-primary');
  return frame(c, 'Deploy', 'home', content, { footer });
}
export function renderHeroes(c) {
  return frame(
    c,
    'Heroes',
    'heroes',
    `<p class="ux-intro">A different survivor. A different way through.</p><div class="ux-roster">${OPERATORS.map(
      (hero) => {
        const owned = c.profile.operators.includes(hero.id),
          active = c.selection.operator === hero.id;
        return button(
          `${portrait(hero, c.profile)}<div><span class="ux-small">${hero.role}</span><h2>${hero.name}</h2><p>${hero.description.split('. ')[0]}.</p><span class="ux-roster-status">${active ? '✓ Ready to deploy' : owned ? 'Loadout & mastery' : `◇ Earn in the field · or ${hero.cost} scrap`}</span></div>${glyph('arrow')}`,
          'hero-open',
          hero.id,
          `ux-roster-card ${active ? 'selected' : ''}`,
        );
      },
    ).join('')}</div>`,
  );
}
function equipmentSummary(c, id) {
  const kit = heroLoadout(c.profile, id),
    hero = kit.hero,
    owned = c.profile.operators.includes(id);
  return `<p class="ux-intro">${hero.description}</p>${!owned ? `<div class="ux-callout"><strong>Earn ${hero.name} free.</strong><p>${unlockHint(c.profile, 'operator', id)}</p><p>Recruitment also includes all signature gear below.</p></div>` : ''}<div class="ux-loadout-slots">${[
    [
      'weapon',
      'Starting weapon',
      kit.weapon.icon,
      kit.weapon.name,
      kit.weapon.description,
    ],
    [
      'ability',
      'Active ability',
      kit.ability.icon,
      kit.abilityName,
      kit.branch?.description || kit.ability.description,
    ],
  ]
    .map(
      ([kind, label, icon, name, desc]) =>
        `<article class="ux-slot ${owned ? 'editable' : ''}"><span class="ux-slot-icon">${icon}</span><div><span class="ux-small">${label}</span><h2>${name}</h2><p>${desc}</p></div>${owned ? button('Change', 'gear-open', kind, 'ux-link') : ''}</article>`,
    )
    .join(
      '',
    )}</div>${!owned ? '' : section('Build identity') + `<div class="ux-callout"><strong>${kit.branch?.name || 'Standard signature'}</strong><p>${kit.branch?.description || 'Master this hero to unlock signature ability branches and an alternate starting weapon.'}</p>${button('Explore mastery', 'hero-tab', 'mastery', 'ux-link')}</div>`}`;
}
function masteryContent(c, id) {
  const hero = OPERATORS.find((o) => o.id === id),
    spec = HERO_MASTERY[id],
    record = c.profile.mastery[id] || { best: 0, casts: 0, wins: 0 },
    tier = masteryTier(record),
    style = c.profile.heroStyles[id] || { branch: 'standard' },
    owned = c.profile.operators.includes(id);
  return `<p class="ux-intro">Practice earns new playstyles. Progress is saved after every operation, including defeats.</p><div class="ux-mastery-path"><article class="ux-path-node ${tier > 0 ? 'earned' : ''}"><span class="ux-node-number">${tier > 0 ? '✓' : '1'}</span><div><span class="ux-small">FIELDCRAFT</span><h2>Survive 2 minutes</h2><p>As ${hero.name} · unlock ${spec.branches[0].name} + ${WEAPONS[spec.weapon].name}</p>${meter(record.best, 120, 'Fieldcraft')}<small>${Math.min(120, record.best)}/120 seconds</small></div></article><article class="ux-path-node ${tier > 1 ? 'earned' : ''}"><span class="ux-node-number">${tier > 1 ? '✓' : '2'}</span><div><span class="ux-small">SIGNATURE DISCIPLINE</span><h2>Use your signature 8 times</h2><p>Requires Fieldcraft · unlock ${spec.branches[1].name}</p>${meter(record.casts, 8, 'Signature discipline')}<small>${Math.min(8, record.casts)}/8 uses</small></div></article></div>${section('Choose a signature branch')}<p class="ux-note">Equipping a branch also equips ${ABILITIES.find((a) => a.id === hero.ability).name}. Switch freely between earned branches.</p><div class="ux-branch-list">${[{ id: 'standard', name: 'Standard', tier: 0, description: ABILITIES.find((a) => a.id === hero.ability).description }, ...spec.branches].map((b) => `<article class="ux-branch ${style.branch === b.id ? 'selected' : ''}"><div class="ux-row-heading"><h2>${b.name}</h2>${status(style.branch === b.id ? '✓ Equipped' : tier >= b.tier ? 'Available' : b.tier === 1 ? 'Fieldcraft required' : 'Discipline required', tier >= b.tier)}</div><p>${b.description}</p>${owned && style.branch !== b.id && tier >= b.tier ? button('Equip branch', 'branch', b.id, 'ux-secondary') : ''}</article>`).join('')}</div>`;
}
export function renderHero(c) {
  const hero = OPERATORS.find((o) => o.id === c.inspectedHero),
    owned = c.profile.operators.includes(hero.id);
  const body =
    c.heroTab === 'mastery'
      ? masteryContent(c, hero.id)
      : c.heroTab === 'appearance'
        ? `<p class="ux-intro">Your field identity. Outfits are cosmetic.</p><div class="ux-outfits">${[
            'field',
            'veteran',
          ]
            .map((id) => {
              const available =
                  id === 'field' || c.profile.mastery[hero.id]?.wins > 0,
                selected =
                  (c.profile.heroStyles[hero.id]?.outfit || 'field') === id;
              return `<article class="ux-outfit">${portrait(hero, { ...c.profile, heroStyles: { [hero.id]: { outfit: id } } })}<h2>${id === 'field' ? 'Field gear' : 'Veteran ember cape'}</h2><p>${id === 'field' ? 'Original field equipment.' : `Extract once as ${hero.name} to earn.`}</p>${owned && available ? button(selected ? '✓ Equipped' : 'Equip outfit', 'outfit', id, selected ? 'ux-secondary selected' : 'ux-secondary', selected) : status('◇ Extraction required')}</article>`;
            })
            .join('')}</div>`
        : equipmentSummary(c, hero.id);
  return frame(
    c,
    hero.name,
    'heroes',
    `<div class="ux-hero-heading">${portrait(hero, c.profile)}<div><span class="ux-kicker">${hero.role}</span><h2>${hero.name}</h2><span class="ux-note">${owned ? `Mastery ${masteryTier(c.profile.mastery[hero.id])}/2` : 'Not yet recruited'}</span></div></div>${tabs(
      [
        ['loadout', 'Loadout'],
        ['mastery', 'Mastery'],
        ['appearance', 'Appearance'],
      ],
      c.heroTab,
      'hero-tab',
      'Hero sections',
    )}${body}`,
    {
      back: true,
      footer: owned
        ? button(
            c.selection.operator === hero.id
              ? `Back to Deploy ${glyph('arrow')}`
              : `Use ${hero.name} ${glyph('arrow')}`,
            'hero-use',
            hero.id,
            'ux-primary',
          )
        : button(
            `Recruit · ${hero.cost} scrap`,
            'recruit',
            hero.id,
            'ux-primary',
            c.profile.scrap < hero.cost,
          ),
    },
  );
}
function equipmentCards(c, kind, { configure = false } = {}) {
  const heroId = configure ? c.inspectedHero : c.selection.operator,
    loadout = heroLoadout(c.profile, heroId),
    key = kind === 'weapon' ? 'weapons' : 'abilities',
    current = kind === 'weapon' ? loadout.weaponId : loadout.abilityId;
  return `<div class="ux-equipment-list">${equipmentOrder(
    c.profile,
    kind,
    heroId,
    c.inventoryFilter === 'owned',
  )
    .map((id) => {
      const item =
          kind === 'weapon' ? WEAPONS[id] : ABILITIES.find((a) => a.id === id),
        owned = c.profile[key].includes(id),
        equipped = configure && current === id,
        cost = kind === 'weapon' ? WEAPON_COSTS[id] : item.cost;
      return `<article class="ux-equipment ${equipped ? 'selected' : ''}"><div class="ux-equipment-heading"><span class="ux-slot-icon">${item.icon}</span><div><h2>${item.name}</h2><span class="ux-small">${equipped ? '✓ Equipped' : owned ? 'Owned' : `${cost} scrap`}${kind === 'ability' ? ` · ${item.cooldown}s base recharge` : ''}</span></div></div><p>${item.description}</p>${!owned ? `<p class="ux-unlock-route"><strong>Earn free:</strong> ${unlockHint(c.profile, kind, id)}</p>` : ''}${kind === 'weapon' ? `<details data-panel="${kind}-${id}"><summary>Evolution · ${EVOLUTIONS[id].name}</summary><p>Reach weapon rank 5 and choose ${EVOLUTIONS[id].mutation}. Evolved weapons stay in the same slot.</p></details>` : ''}${configure ? (equipped ? status('✓ Starting loadout', true) : button(owned ? `Equip for ${loadout.hero.name}` : `Unlock & equip · ${cost} scrap`, owned ? `equip-${kind}` : `buy-${kind}`, id, owned ? 'ux-secondary' : 'ux-purchase', !owned && c.profile.scrap < cost)) : owned ? '' : button(`Unlock · ${cost} scrap`, `unlock-${kind}`, id, 'ux-purchase', c.profile.scrap < cost)}</article>`;
    })
    .join('')}</div>`;
}
export function renderEquipment(c) {
  const kit = heroLoadout(c.profile, c.inspectedHero),
    kind = c.equipmentKind;
  return frame(
    c,
    kind === 'weapon' ? 'Starting weapon' : 'Active ability',
    'heroes',
    `<div class="ux-context"><span>Editing ${kit.hero.name}</span><strong>Current: ${kind === 'weapon' ? kit.weapon.name : kit.abilityName}</strong></div>${tabs(
      [
        ['all', 'All gear'],
        ['owned', 'Owned'],
      ],
      c.inventoryFilter,
      'inventory-filter',
      'Equipment filter',
    )}${equipmentCards(c, kind, { configure: true })}`,
    { back: true },
  );
}
export function renderBunker(c) {
  const content =
    c.bunkerTab === 'armory'
      ? `${tabs(
          [
            ['weapon', 'Weapons'],
            ['ability', 'Abilities'],
          ],
          c.armoryType,
          'armory-tab',
          'Armory categories',
        )}<p class="ux-intro">Shared unlocks for every hero. Earn gear in the field or use scrap to unlock it sooner.</p>${button(`Configure ${OPERATORS.find((o) => o.id === c.selection.operator).name}’s loadout ${glyph('arrow')}`, 'hero-open', c.selection.operator, 'ux-context-button')}${equipmentCards(c, c.armoryType)}`
      : `<p class="ux-intro">Permanent improvements for your whole crew.</p><div class="ux-research-list">${RESEARCH.map(
          (r) => {
            const v = researchComparison(c.profile, r.id);
            return `<article class="ux-research"><div class="ux-row-heading"><h2><span>${r.icon}</span> ${r.name}</h2><span class="ux-small">${v.rank}/${r.cap}</span></div><div class="ux-comparison"><span><small>Current bonus</small>${v.current}</span><span aria-hidden="true">→</span><span><small>${v.maxed ? 'Maximum' : 'Next rank'}</small>${v.result}</span></div>${meter(v.rank, r.cap, r.name)}${button(v.maxed ? '✓ Fully researched' : `Upgrade · ${v.cost} scrap`, 'research', r.id, 'ux-secondary', v.maxed || c.profile.scrap < v.cost)}</article>`;
          },
        ).join('')}</div>`;
  return frame(
    c,
    'Bunker',
    'workshop',
    `${tabs(
      [
        ['research', 'Research'],
        ['armory', 'Armory'],
      ],
      c.bunkerTab,
      'bunker-tab',
      'Bunker sections',
    )}${content}${!c.storageAvailable ? '<p class="ux-callout">Storage unavailable. Changes last for this session.</p>' : ''}`,
  );
}
export function renderDeployment(c) {
  const s = deploymentSummary(c.profile, c.selection);
  return frame(
    c,
    'Mission setup',
    'home',
    `${section('Operation type')}${tabs(
      [
        ['campaign', 'Story'],
        ['extraction', 'Extract'],
        ['endless', 'Endless'],
        ['daily', 'Daily'],
      ],
      c.selection.mode,
      'mode',
      'Operation types',
    )}${s.chapter ? `<div class="ux-setup-card"><span class="ux-small">CHAPTER ${CHAPTERS.indexOf(s.chapter) + 1}/${CHAPTERS.length}</span><h2>${s.chapter.title}</h2><p>${s.chapter.briefing}</p>${button('Choose chapter', 'campaign', '', 'ux-secondary')}</div>` : s.daily ? '<div class="ux-callout"><strong>A level playing field.</strong><p>Nomad, Rustline, Shockwave, Red Forest. No research bonuses. Shared daily seed; scores stay on this device.</p></div>' : `${section('Drop zone')}<div class="ux-zone-list">${ZONES.map((z) => button(`<span class="zone-swatch ${z.id}"></span><div><strong>${z.name}</strong><span>${z.subtitle}</span></div>${status(c.selection.zone === z.id ? '✓ Selected' : c.profile.zones.includes(z.id) ? 'Available' : `◇ ${z.cost} scrap`)}`, c.profile.zones.includes(z.id) ? 'zone' : 'zone-detail', z.id, `ux-zone ${c.selection.zone === z.id ? 'selected' : ''}`)).join('')}</div>${section('Threat level')}<div class="ux-difficulties">${DIFFICULTIES.map((d) => button(`<strong>${d.name}</strong><span>${d.description}</span>${d.id === 'veteran' && !c.profile.wins ? status('◇ Extract once to unlock') : status(c.selection.difficulty === d.id ? '✓ Selected' : 'Select')}`, 'difficulty', d.id, `ux-difficulty ${c.selection.difficulty === d.id ? 'selected' : ''}`, d.id === 'veteran' && !c.profile.wins)).join('')}</div>`}`,
    {
      back: true,
      footer: button(
        'Use mission settings',
        'deployment-done',
        '',
        'ux-primary',
      ),
    },
  );
}
export function renderChapters(c) {
  const selected = CHAPTERS.find((ch) => ch.id === c.selection.chapter);
  return frame(
    c,
    'Story chapters',
    'home',
    `<div class="ux-chapters">${CHAPTERS.map((ch, i) => {
      const available = CHAPTERS.slice(0, i).every((x) =>
          c.profile.chapters.includes(x.id),
        ),
        done = c.profile.chapters.includes(ch.id);
      return button(
        `<span class="ux-node-number">${done ? '✓' : i + 1}</span><div><h2>${ch.title}</h2><span>${ZONES.find((z) => z.id === ch.zone).name} · ${DIFFICULTIES.find((d) => d.id === ch.difficulty).name}</span></div>${status(c.selection.chapter === ch.id ? 'Selected' : available ? 'Available' : '◇ Complete previous chapter')}`,
        'chapter',
        ch.id,
        `ux-chapter ${c.selection.chapter === ch.id ? 'selected' : ''}`,
        !available,
      );
    }).join(
      '',
    )}</div><div class="ux-callout"><strong>${selected.title}</strong><p>${selected.briefing}</p><ul>${selected.goals.map((g) => `<li>${g.label}</li>`).join('')}<li>Extract alive</li></ul><p>${c.profile.chapters.includes(selected.id) ? 'First-clear reward claimed' : `First clear: ${selected.reward} scrap`}</p></div>`,
    {
      back: true,
      footer: button('Use this chapter', 'chapter-done', '', 'ux-primary'),
    },
  );
}
export function renderZone(c) {
  const zone = ZONES.find((z) => z.id === c.zoneDetail);
  return frame(
    c,
    zone.name,
    'home',
    `<div class="ux-field-banner zone-banner ${zone.id}"><h2>${zone.subtitle}</h2></div><div class="ux-callout"><h2>Open a new sector</h2><p>Unlock ${zone.name} permanently for Extraction and Endless operations.</p><p>Story chapters also unlock their required sectors as you progress.</p><strong>${zone.cost} scrap · your balance ${c.profile.scrap}</strong></div>`,
    {
      back: true,
      footer: button(
        `Unlock sector · ${zone.cost} scrap`,
        'buy-zone',
        zone.id,
        'ux-primary',
        c.profile.scrap < zone.cost,
      ),
    },
  );
}
export function renderKits(c) {
  return frame(
    c,
    'Field kit',
    'home',
    `<p class="ux-intro">One shared kit for the next operation. Daily challenges use no kit.</p><div class="ux-branch-list">${PERKS.map(
      (p) => {
        const available =
            !p.requirement || c.profile.achievements.includes(p.requirement),
          equipped = c.profile.perk === p.id;
        return `<article class="ux-branch ${equipped ? 'selected' : ''}"><div class="ux-row-heading"><h2>${p.icon} ${p.name}</h2>${equipped ? status('✓ Equipped', true) : ''}</div><p>${p.description}</p>${available ? button(equipped ? 'Equipped' : 'Equip kit', 'perk', p.id, 'ux-secondary', equipped) : status(`◇ ${ACHIEVEMENTS.find((a) => a.id === p.requirement).description}`)}</article>`;
      },
    ).join('')}</div>`,
    { back: true },
  );
}
function goalsContent(c) {
  return `<p class="ux-intro">Field feats award gear automatically. Scrap purchases are an optional shortcut.</p>${goalRows(nextGoals(c.profile, c.selection.operator, 1))}<div class="ux-goals">${FIELD_UNLOCKS.map(
    (ch) => {
      const reward = unlockReward(ch),
        owned = ownsReward(c.profile, ch),
        progress = c.profile.unlockProgress[ch.id] || 0;
      return button(
        `<div><span class="ux-small">${owned ? '✓ Owned' : reward.kind === 'operator' ? 'Hero + signature gear' : 'Shared gear'}</span><strong>${reward.name}</strong><p>${ch.description}</p>${meter(progress, ch.goal, reward.name)}</div><span class="ux-goal-count">${progress}/${ch.goal}${glyph('arrow')}</span>`,
        'goal-open',
        ch.id,
        'ux-goal',
      );
    },
  ).join(
    '',
  )}</div>${section('Commendations')}<div class="ux-commendations">${ACHIEVEMENTS.map((a) => `<article><span>${c.profile.achievements.includes(a.id) ? '✓' : '◇'}</span><div><h2>${a.name}</h2><p>${a.description}</p></div><small>${a.reward} scrap</small></article>`).join('')}</div>`;
}
function codexContent(c) {
  return `<p class="ux-intro">Tap an entry to inspect its behavior.</p><div class="ux-codex">${Object.entries(
    ENEMIES,
  )
    .map(
      ([id, e]) =>
        `<details data-panel="enemy-${id}"><summary><span class="codex-art enemy-art-${id}" aria-hidden="true"></span><div><strong>${e.name}</strong><small>${c.profile.enemyKills[id] || 0} confirmed kills</small></div><span>+</span></summary><p>${LORE[id]}</p><small>Base health ${e.hp} · Contact damage ${e.damage}</small></details>`,
    )
    .join(
      '',
    )}</div>${section('Rare relics')}<div class="ux-codex">${RELICS.map((r) => `<details data-panel="relic-${r.id}"><summary><span class="ux-slot-icon">${r.icon}</span><strong>${r.name}</strong><span>+</span></summary><p>${r.description}</p></details>`).join('')}</div>${section('Field signals')}<div class="ux-codex">${Object.entries(
    FIELD_EVENTS,
  )
    .map(
      ([id, e]) =>
        `<details data-panel="event-${id}"><summary><span class="ux-slot-icon">${e.icon}</span><strong>${e.name}</strong><span>+</span></summary><p>${e.instruction}. ${e.reward} scrap on completion.</p></details>`,
    )
    .join('')}</div>`;
}
export function renderRecords(c) {
  const p = c.profile;
  const archive = `<div class="ux-stats">${[
    [p.runs, 'Operations'],
    [p.wins, 'Extractions'],
    [time(p.best), 'Best survival'],
  ]
    .map(
      ([n, label]) => `<div><strong>${n}</strong><span>${label}</span></div>`,
    )
    .join(
      '',
    )}</div>${section('Recent operations')}<div class="ux-history">${p.history.length ? p.history.map((r) => `<article><span>${r.won ? '✓ Extracted' : 'Signal lost'}</span><strong>${ZONES.find((z) => z.id === r.zone).name}</strong><span>${r.kills} kills · ${time(r.time)}</span></article>`).join('') : '<div class="ux-empty"><strong>Your story starts in the field.</strong><p>Completed operations appear here. Every attempt earns progress.</p></div>'}</div>${p.dailyScores.length ? section('Daily bests') + `<div class="ux-history">${p.dailyScores.map((d) => `<article><span>${d.date}</span><strong>${d.score.toLocaleString()} points</strong><span>${d.won ? 'Extracted' : 'Signal lost'}</span></article>`).join('')}</div>` : ''}`;
  return frame(
    c,
    'Field records',
    'records',
    `${tabs(
      [
        ['archive', 'Archive'],
        ['goals', 'Goals'],
        ['codex', 'Codex'],
      ],
      c.recordTab,
      'record-tab',
      'Records sections',
    )}${c.recordTab === 'goals' ? goalsContent(c) : c.recordTab === 'codex' ? codexContent(c) : archive}${button('How to play ' + glyph('arrow'), 'guide', '', 'ux-context-button')}`,
  );
}
export function renderSettings(c) {
  const groups = [
    [
      'Audio',
      [
        ['sound', 'Sound effects'],
        ['music', 'Wasteland score'],
      ],
    ],
    [
      'Controls',
      [
        ['leftHanded', 'Left-handed controls'],
        ['haptics', 'Haptic feedback'],
      ],
    ],
    [
      'Visuals & motion',
      [
        ['numbers', 'Damage numbers'],
        ['radar', 'Field radar'],
        ['shake', 'Screen shake'],
        ['quality', 'Visual quality'],
      ],
    ],
  ];
  return frame(
    c,
    'Settings',
    c.activeRoot || 'home',
    `${groups.map(([name, items]) => section(name) + `<div class="ux-settings">${items.map(([id, label]) => button(`<span>${label}</span><strong>${id === 'quality' ? (c.profile.settings.quality === 'high' ? 'High' : 'Low') : c.profile.settings[id] ? 'On' : 'Off'}</strong>`, 'setting', id, 'ux-toggle', false, `aria-pressed="${id === 'quality' ? c.profile.settings.quality === 'high' : c.profile.settings[id]}"`)).join('')}</div>`).join('')}${section('Install & save')}<div class="ux-utilities">${button('Add to home screen', 'install')}${button('Enter / exit fullscreen', 'fullscreen')}</div><details class="ux-backups" data-panel="backup"><summary>Save backup & restoration</summary><p>Progress is stored on this device. Export a backup before clearing browser data.</p><div class="ux-utilities">${button('Export save', 'export')}${button('Restore backup', 'import')}</div></details><p class="ux-note">Haptics require device support. Reduced-motion preferences are respected. Installed mode fills your screen.</p>`,
    { back: true, dock: !c.paused },
  );
}
export function renderResults(c, g, result, chapter) {
  const bonus = (result?.unlocked || []).reduce((sum, a) => sum + a.reward, 0),
    total = (result?.earned || 0) + bonus + (chapter?.reward || 0),
    won = g.state === 'won',
    fatal = !won ? hitExplanation(g.deathReport) : null;
  const rewards = [
    ...(result?.fieldUnlocks || []).map((r) => r.name),
    ...(result?.mastery?.rewards || []),
  ];
  return frame(
    c,
    won ? 'Made it home.' : 'One more try.',
    'home',
    `<div class="ux-result-heading"><span>${won ? '✦' : '☢'}</span><h2>${won ? 'Another sunrise.' : 'The zone remembers.'}</h2><p>${won ? 'Your crew lives to fight another day.' : 'Your field progress and scrap are safe.'}</p></div><div class="ux-stats">${[
      [time(g.time), 'Survived'],
      [g.kills, 'Infected'],
      [g.level, 'Level'],
    ]
      .map(
        ([n, label]) => `<div><strong>${n}</strong><span>${label}</span></div>`,
      )
      .join(
        '',
      )}</div>${fatal ? `<div class="ux-callout ux-defeat-cause"><span class="ux-small">FINAL HIT · ${fatal.amount} HP</span><h2>${esc(fatal.label)}</h2><p>${esc(fatal.tip)}</p></div>` : ''}<div class="ux-result-scrap"><span>Scrap recovered</span><strong>+${total}</strong><small>Wallet: ${c.profile.scrap} scrap</small></div>${rewards.length ? `<div class="ux-callout"><strong>New possibilities</strong><ul>${rewards.map((r) => `<li>✓ ${esc(r)}</li>`).join('')}</ul>${button('Review hero', 'hero-goal', g.operator.id, 'ux-link')}</div>` : ''}${chapter ? `<div class="ux-callout"><span class="ux-small">CHAPTER COMPLETE</span><h2>${chapter.title}</h2><p>${chapter.debrief}</p></div>` : ''}<details class="ux-result-details" data-panel="result-details"><summary>Operation details & rewards</summary><p>${g.bossKills} titans · ${g.eventsCompleted} field events · ${g.eliteKills} elites</p><p>Field salvage ${result?.earned || 0} · Commendations ${bonus}${chapter ? ` · Chapter ${chapter.reward}` : ''}</p>${(result?.unlocked || []).map((a) => `<p>✓ ${a.name} · ${a.reward} scrap</p>`).join('')}</details>`,
    {
      footer:
        button(
          chapter
            ? 'Continue story ' + glyph('arrow')
            : 'Retry operation ' + glyph('arrow'),
          'result-retry',
          '',
          'ux-primary',
        ) +
        button(
          'Review your hero',
          'hero-goal',
          g.operator.id,
          'ux-footer-link',
        ),
    },
  );
}
export function decorateLegacy(html, root, dock = true) {
  return `<div class="ux-legacy">${html}</div>${dock ? rootNavigation(root) : ''}`;
}
export function renderReplaceRun(c) {
  return frame(
    c,
    'Operation on hold',
    'home',
    `<div class="ux-callout"><h2>Keep going or start fresh?</h2><p>${c.savedRun.operator.name} has survived ${time(c.savedRun.time)}. Starting a new operation replaces that checkpoint. Your banked scrap and unlocks stay safe.</p></div>`,
    {
      back: true,
      footer:
        button('Resume saved operation', 'restore', '', 'ux-primary') +
        button(
          'Replace checkpoint & start new',
          'confirm-start',
          '',
          'ux-footer-link',
        ),
    },
  );
}
