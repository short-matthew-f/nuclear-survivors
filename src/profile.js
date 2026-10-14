import {
  RESEARCH,
  OPERATORS,
  ZONES,
  ACHIEVEMENTS,
  CHAPTERS,
  PERKS,
  ENEMIES,
  WEAPONS,
  WEAPON_COSTS,
  FREE_WEAPONS,
  LEGACY_WEAPONS,
  ABILITIES,
} from './content.js';
import {
  restoreUnlockProgress,
  awardFieldUnlocks,
  grantReward,
} from './unlocks.js';
import { parseMastery, settleMastery } from './mastery.js';
import { missionReady } from './expedition.js';
export const SAVE_KEY = 'nuclear-survivors-v2';
export function freshProfile() {
  return {
    version: 2,
    scrap: 0,
    research: {},
    operators: ['nomad'],
    weapons: [...FREE_WEAPONS],
    abilities: ['shockwave'],
    loadouts: {},
    unlockProgress: {},
    mastery: {},
    heroStyles: {},
    zones: ['forest'],
    achievements: [],
    runs: 0,
    wins: 0,
    kills: 0,
    best: 0,
    history: [],
    chapters: [],
    enemyKills: {},
    dailyScores: [],
    events: 0,
    perk: 'none',
    settings: {
      sound: false,
      music: false,
      shake: true,
      haptics: true,
      numbers: true,
      radar: true,
      leftHanded: false,
      quality: 'high',
    },
  };
}
const nonnegative = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export function parseProfile(raw) {
  try {
    const data = JSON.parse(raw),
      p = freshProfile();
    if (!data || data.version !== 2) return p;
    for (const key of ['scrap', 'runs', 'wins', 'kills', 'best', 'events'])
      p[key] = nonnegative(data[key]);
    for (const r of RESEARCH)
      p.research[r.id] = Math.min(r.cap, nonnegative(data.research?.[r.id]));
    p.operators = [
      ...new Set([
        'nomad',
        ...(Array.isArray(data.operators)
          ? data.operators.filter((id) => OPERATORS.some((o) => o.id === id))
          : []),
      ]),
    ];
    p.weapons = [
      ...new Set([
        ...FREE_WEAPONS,
        ...(Object.hasOwn(data, 'weapons')
          ? Array.isArray(data.weapons)
            ? data.weapons.filter((id) => Object.hasOwn(WEAPONS, id))
            : []
          : LEGACY_WEAPONS),
      ]),
    ];
    p.abilities = [
      ...new Set([
        'shockwave',
        ...(Array.isArray(data.abilities)
          ? data.abilities.filter((id) => ABILITIES.some((a) => a.id === id))
          : []),
      ]),
    ];
    for (const id of p.operators) {
      const hero = OPERATORS.find((o) => o.id === id);
      if (!p.weapons.includes(hero.weapon)) p.weapons.push(hero.weapon);
      if (!p.abilities.includes(hero.ability)) p.abilities.push(hero.ability);
    }
    for (const id of p.operators) {
      const record = data.loadouts?.[id];
      if (record && typeof record === 'object')
        p.loadouts[id] = {
          weapon: p.weapons.includes(record.weapon)
            ? record.weapon
            : OPERATORS.find((o) => o.id === id).weapon,
          ability: p.abilities.includes(record.ability)
            ? record.ability
            : OPERATORS.find((o) => o.id === id).ability,
        };
    }
    p.zones = [
      ...new Set([
        'forest',
        ...(Array.isArray(data.zones)
          ? data.zones.filter((id) => ZONES.some((z) => z.id === id))
          : []),
      ]),
    ];
    p.achievements = Array.isArray(data.achievements)
      ? data.achievements.filter((id) => ACHIEVEMENTS.some((a) => a.id === id))
      : [];
    p.history = Array.isArray(data.history)
      ? data.history
          .filter((r) => r && typeof r === 'object')
          .slice(0, 8)
          .map((r) => ({
            time: nonnegative(r.time),
            kills: nonnegative(r.kills),
            won: r.won === true,
            zone: ZONES.some((z) => z.id === r.zone) ? r.zone : 'forest',
          }))
      : [];
    p.chapters = Array.isArray(data.chapters)
      ? [
          ...new Set(
            data.chapters.filter((id) => CHAPTERS.some((c) => c.id === id)),
          ),
        ]
      : [];
    for (const id of Object.keys(ENEMIES))
      p.enemyKills[id] = nonnegative(data.enemyKills?.[id]);
    p.perk = PERKS.some(
      (k) =>
        k.id === data.perk &&
        (!k.requirement || p.achievements.includes(k.requirement)),
    )
      ? data.perk
      : 'none';
    p.dailyScores = Array.isArray(data.dailyScores)
      ? data.dailyScores
          .filter(
            (d) =>
              d &&
              typeof d.date === 'string' &&
              /^\d{4}-\d{2}-\d{2}$/.test(d.date),
          )
          .slice(0, 14)
          .map((d) => ({
            date: d.date,
            score: nonnegative(d.score),
            won: d.won === true,
          }))
      : [];
    for (const k of [
      'sound',
      'music',
      'shake',
      'haptics',
      'numbers',
      'radar',
      'leftHanded',
    ])
      if (typeof data.settings?.[k] === 'boolean')
        p.settings[k] = data.settings[k];
    p.settings.quality = data.settings?.quality === 'low' ? 'low' : 'high';
    restoreUnlockProgress(p, data.unlockProgress);
    parseMastery(p, data);
    return p;
  } catch {
    return freshProfile();
  }
}
export function purchase(profile, kind, id) {
  const list =
    kind === 'research'
      ? RESEARCH
      : kind === 'operator'
        ? OPERATORS
        : kind === 'zone'
          ? ZONES
          : kind === 'ability'
            ? ABILITIES
            : kind === 'weapon'
              ? Object.entries(WEAPONS).map(([id, w]) => ({
                  ...w,
                  id,
                  cost: WEAPON_COSTS[id],
                }))
              : [];
  const item = list.find((x) => x.id === id);
  if (!item) return false;
  const rank = profile.research[id] || 0;
  const cost = kind === 'research' ? item.cost * (rank + 1) : item.cost;
  if (kind === 'research' && rank >= item.cap) return false;
  if (kind === 'operator' && profile.operators.includes(id)) return false;
  if (kind === 'zone' && profile.zones.includes(id)) return false;
  if (kind === 'weapon' && profile.weapons.includes(id)) return false;
  if (kind === 'ability' && profile.abilities.includes(id)) return false;
  if (profile.scrap < cost) return false;
  profile.scrap -= cost;
  if (kind === 'research') profile.research[id] = rank + 1;
  else if (kind === 'operator') {
    grantReward(profile, { kind: 'operator', target: id });
  } else
    profile[
      { zone: 'zones', weapon: 'weapons', ability: 'abilities' }[kind]
    ].push(id);
  return true;
}
export function settleRun(profile, game) {
  if (game.settled || !['dead', 'won'].includes(game.state)) return null;
  game.settled = true;
  const earned = Math.floor(
    (game.scrap +
      Math.floor(game.kills / 4) +
      Math.floor(game.time / 12) +
      (game.state === 'won' ? 100 : 0)) *
      (game.difficulty?.reward || 1) *
      (game.overtime ? 1.75 : 1),
  );
  const unlocked = ACHIEVEMENTS.filter(
    (a) => !profile.achievements.includes(a.id) && a.test(game),
  );
  profile.scrap += earned + unlocked.reduce((sum, a) => sum + a.reward, 0);
  profile.achievements.push(...unlocked.map((a) => a.id));
  const chapter = CHAPTERS.find((c) => c.id === game.chapter);
  let chapterCompleted = null;
  if (
    chapter &&
    game.state === 'won' &&
    missionReady(game) &&
    !profile.chapters.includes(chapter.id) &&
    CHAPTERS.slice(0, CHAPTERS.indexOf(chapter)).every((c) =>
      profile.chapters.includes(c.id),
    )
  ) {
    profile.chapters.push(chapter.id);
    profile.scrap += chapter.reward;
    const next = CHAPTERS[CHAPTERS.indexOf(chapter) + 1];
    if (next && !profile.zones.includes(next.zone))
      profile.zones.push(next.zone);
    chapterCompleted = chapter;
  }
  profile.events += game.eventsCompleted || 0;
  for (const [id, count] of Object.entries(game.enemyKills || {}))
    profile.enemyKills[id] = (profile.enemyKills[id] || 0) + count;
  if (game.daily) {
    const score = Math.floor(
      game.kills * 10 +
        game.time +
        game.bossKills * 500 +
        (game.state === 'won' ? 2000 : 0),
    );
    const prior = profile.dailyScores.find((d) => d.date === game.daily);
    if (!prior)
      profile.dailyScores.unshift({
        date: game.daily,
        score,
        won: game.state === 'won',
      });
    else if (score > prior.score) {
      prior.score = score;
      prior.won = game.state === 'won';
    }
    profile.dailyScores = profile.dailyScores.slice(0, 14);
  }
  profile.runs++;
  profile.wins += Number(game.state === 'won');
  profile.kills += game.kills;
  profile.best = Math.max(profile.best, Math.floor(game.time));
  profile.history.unshift({
    time: Math.floor(game.time),
    kills: game.kills,
    won: game.state === 'won',
    zone: game.zone.id,
  });
  profile.history = profile.history.slice(0, 8);
  const fieldUnlocks = awardFieldUnlocks(profile, game);
  const mastery = settleMastery(profile, game);
  return { earned, unlocked, chapterCompleted, fieldUnlocks, mastery };
}

export function selectPerk(profile, id) {
  const perk = PERKS.find((p) => p.id === id);
  if (
    !perk ||
    (perk.requirement && !profile.achievements.includes(perk.requirement))
  )
    return false;
  profile.perk = id;
  return true;
}
export function exportProfile(profile) {
  return JSON.stringify({ format: 'nuclear-survivors-backup', profile });
}
export function importProfile(raw) {
  try {
    const data = JSON.parse(raw);
    if (
      data?.format !== 'nuclear-survivors-backup' ||
      data.profile?.version !== 2
    )
      return null;
    return parseProfile(JSON.stringify(data.profile));
  } catch {
    return null;
  }
}

export function loadoutFor(profile, operatorId) {
  const hero = OPERATORS.find((o) => o.id === operatorId) || OPERATORS[0];
  const saved = profile.loadouts[hero.id];
  return {
    weapon: saved?.weapon || hero.weapon,
    ability: saved?.ability || hero.ability,
  };
}
export function equipLoadout(profile, operatorId, kind, id) {
  if (
    !profile.operators.includes(operatorId) ||
    !['weapon', 'ability'].includes(kind)
  )
    return false;
  if (!profile[kind === 'weapon' ? 'weapons' : 'abilities'].includes(id))
    return false;
  profile.loadouts[operatorId] = {
    ...loadoutFor(profile, operatorId),
    [kind]: id,
  };
  return true;
}
