import { RESEARCH, OPERATORS, ZONES, ACHIEVEMENTS } from './content.js';
export const SAVE_KEY = 'nuclear-survivors-v2';
export function freshProfile() {
  return {
    version: 2,
    scrap: 0,
    research: {},
    operators: ['nomad'],
    zones: ['forest'],
    achievements: [],
    runs: 0,
    wins: 0,
    kills: 0,
    best: 0,
    history: [],
    settings: { sound: false, shake: true, haptics: true, quality: 'high' },
  };
}
const nonnegative = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export function parseProfile(raw) {
  try {
    const data = JSON.parse(raw),
      p = freshProfile();
    if (!data || data.version !== 2) return p;
    for (const key of ['scrap', 'runs', 'wins', 'kills', 'best'])
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
      ? data.history.slice(0, 8).map((r) => ({
          time: nonnegative(r.time),
          kills: nonnegative(r.kills),
          won: r.won === true,
          zone: ZONES.some((z) => z.id === r.zone) ? r.zone : 'forest',
        }))
      : [];
    for (const k of ['sound', 'shake', 'haptics'])
      if (typeof data.settings?.[k] === 'boolean')
        p.settings[k] = data.settings[k];
    p.settings.quality = data.settings?.quality === 'low' ? 'low' : 'high';
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
          : [];
  const item = list.find((x) => x.id === id);
  if (!item) return false;
  const rank = profile.research[id] || 0;
  const cost = kind === 'research' ? item.cost * (rank + 1) : item.cost;
  if (kind === 'research' && rank >= item.cap) return false;
  if (kind === 'operator' && profile.operators.includes(id)) return false;
  if (kind === 'zone' && profile.zones.includes(id)) return false;
  if (profile.scrap < cost) return false;
  profile.scrap -= cost;
  if (kind === 'research') profile.research[id] = rank + 1;
  else profile[kind === 'operator' ? 'operators' : 'zones'].push(id);
  return true;
}
export function settleRun(profile, game) {
  if (game.settled || !['dead', 'won'].includes(game.state)) return null;
  game.settled = true;
  const earned =
    game.scrap +
    Math.floor(game.kills / 4) +
    Math.floor(game.time / 12) +
    (game.state === 'won' ? 100 : 0);
  const unlocked = ACHIEVEMENTS.filter(
    (a) => !profile.achievements.includes(a.id) && a.test(game),
  );
  profile.scrap += earned + unlocked.reduce((sum, a) => sum + a.reward, 0);
  profile.achievements.push(...unlocked.map((a) => a.id));
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
  return { earned, unlocked };
}
