import {
  OPERATORS,
  ZONES,
  CHAPTERS,
  DIFFICULTIES,
  WEAPONS,
  ABILITIES,
  RESEARCH,
} from './content.js';
import { masteryBranch, masteryTier, HERO_MASTERY } from './mastery.js';
import { FIELD_UNLOCKS, ownsReward, unlockReward } from './unlocks.js';

export const MENU_ROOTS = ['home', 'heroes', 'workshop', 'records'];
export function validateDeployment(profile, saved = {}) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  const nextChapter =
    CHAPTERS.find((c) => !profile.chapters.includes(c.id)) || CHAPTERS.at(-1);
  const chapter = CHAPTERS.find((c) => c.id === saved.chapter);
  const available =
    chapter &&
    CHAPTERS.slice(0, CHAPTERS.indexOf(chapter)).every((c) =>
      profile.chapters.includes(c.id),
    );
  return {
    operator: profile.operators.includes(saved.operator)
      ? saved.operator
      : 'nomad',
    zone: profile.zones.includes(saved.zone) ? saved.zone : 'forest',
    mode: ['campaign', 'extraction', 'endless', 'daily'].includes(saved.mode)
      ? saved.mode
      : 'campaign',
    difficulty:
      DIFFICULTIES.some((d) => d.id === saved.difficulty) &&
      (saved.difficulty !== 'veteran' || profile.wins > 0)
        ? saved.difficulty
        : 'survivor',
    chapter: available ? chapter.id : nextChapter.id,
  };
}
export function heroLoadout(profile, id) {
  const hero = OPERATORS.find((o) => o.id === id) || OPERATORS[0],
    saved = profile.loadouts[hero.id];
  const weapon = saved?.weapon || hero.weapon,
    ability = saved?.ability || hero.ability;
  const branch =
    ability === hero.ability
      ? masteryBranch(hero.id, profile.heroStyles[hero.id]?.branch)
      : null;
  return {
    hero,
    weapon: WEAPONS[weapon],
    weaponId: weapon,
    ability: ABILITIES.find((a) => a.id === ability),
    abilityId: ability,
    branch,
    abilityName: branch?.name || ABILITIES.find((a) => a.id === ability).name,
  };
}
export function deploymentSummary(profile, selection) {
  const daily = selection.mode === 'daily',
    chapter =
      selection.mode === 'campaign'
        ? CHAPTERS.find((c) => c.id === selection.chapter)
        : null;
  const heroId = daily ? 'nomad' : selection.operator;
  const loadout = daily
    ? {
        ...heroLoadout(profile, 'nomad'),
        weapon: WEAPONS.carbine,
        weaponId: 'carbine',
        ability: ABILITIES[0],
        abilityId: 'shockwave',
        branch: null,
        abilityName: 'Shockwave',
      }
    : heroLoadout(profile, heroId);
  const zone = ZONES.find(
    (z) => z.id === (daily ? 'forest' : chapter?.zone || selection.zone),
  );
  const difficulty = DIFFICULTIES.find(
    (d) =>
      d.id ===
      (daily ? 'survivor' : chapter?.difficulty || selection.difficulty),
  );
  return {
    ...loadout,
    zone,
    difficulty,
    chapter,
    daily,
    modeName: daily
      ? 'Daily challenge'
      : chapter
        ? 'Story'
        : selection.mode === 'endless'
          ? 'Endless'
          : 'Extraction',
    missionName:
      chapter?.title ||
      (daily
        ? 'Today’s shared operation'
        : selection.mode === 'endless'
          ? 'Last as long as you can'
          : 'Eight minutes. Get home.'),
    objective:
      chapter?.goals.map((g) => g.label).join(' · ') ||
      (selection.mode === 'endless'
        ? 'Survive the exclusion zone'
        : 'Survive 8 minutes and extract'),
    duration: selection.mode === 'endless' ? 'Endless' : '8 min',
  };
}
export function nextGoals(profile, heroId, limit = 3) {
  const hero = OPERATORS.find((o) => o.id === heroId),
    record = profile.mastery[heroId] || { best: 0, casts: 0, wins: 0 },
    tier = masteryTier(record);
  const goals = [];
  if (profile.operators.includes(heroId)) {
    if (tier === 0)
      goals.push({
        id: 'fieldcraft',
        label: `Survive 2 min as ${hero.name}`,
        progress: Math.min(120, record.best),
        target: 120,
        reward: HERO_MASTERY[heroId].branches[0].name,
        action: 'hero-goal',
        value: heroId,
      });
    else if (tier === 1)
      goals.push({
        id: 'discipline',
        label: `Use ${hero.name}’s signature ability 8 times`,
        progress: Math.min(8, record.casts),
        target: 8,
        reward: HERO_MASTERY[heroId].branches[1].name,
        action: 'hero-goal',
        value: heroId,
      });
    else if (!record.wins)
      goals.push({
        id: 'veteran',
        label: `Extract as ${hero.name}`,
        progress: 0,
        target: 1,
        reward: 'Veteran outfit',
        action: 'hero-goal',
        value: heroId,
      });
  }
  const field = FIELD_UNLOCKS.filter((c) => !ownsReward(profile, c))
    .map((c) => ({ ...c, progress: profile.unlockProgress[c.id] || 0 }))
    .sort((a, b) => b.progress / b.goal - a.progress / a.goal);
  for (const c of field) {
    const reward = unlockReward(c);
    goals.push({
      id: c.id,
      label: c.description,
      progress: c.progress,
      target: c.goal,
      reward: reward.name,
      action: 'goal-open',
      value: c.id,
    });
  }
  return goals.slice(0, limit);
}
export function researchComparison(profile, id) {
  const item = RESEARCH.find((r) => r.id === id),
    rank = profile.research[id] || 0,
    next = Math.min(item.cap, rank + 1);
  const format = (n) =>
    ({
      vitality: `+${n * 10} HP`,
      power: `+${n * 8}% damage`,
      salvage: `+${n * 15}m pickup`,
      recovery: `+${(n * 0.15).toFixed(2)} HP/s`,
      cooling: `−${n * 5}% cooldown`,
      mobility: `+${n * 6} speed`,
      training: `+${n * 10}% XP`,
      logistics: `+${n} rerolls`,
    })[id];
  return {
    rank,
    next,
    current: format(rank),
    result: format(next),
    cost: item.cost * (rank + 1),
    maxed: rank >= item.cap,
  };
}
export function equipmentOrder(profile, kind, heroId, ownedOnly = false) {
  const key = kind === 'weapon' ? 'weapons' : 'abilities',
    current = heroLoadout(profile, heroId)[
      kind === 'weapon' ? 'weaponId' : 'abilityId'
    ];
  const ids =
    kind === 'weapon' ? Object.keys(WEAPONS) : ABILITIES.map((a) => a.id);
  return ids
    .filter((id) => !ownedOnly || profile[key].includes(id))
    .sort(
      (a, b) =>
        Number(b === current) - Number(a === current) ||
        Number(profile[key].includes(b)) - Number(profile[key].includes(a)),
    );
}
