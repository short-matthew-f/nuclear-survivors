import { RELICS } from './relics.js';
import { masteryBranch } from './mastery.js';
import { createGame, seededRandom } from './game.js';
import {
  OPERATORS,
  ZONES,
  WEAPONS,
  UPGRADES,
  ENEMIES,
  DIFFICULTIES,
  CHAPTERS,
  PERKS,
  ABILITIES,
  LEGACY_WEAPONS,
  FIELD_EVENTS,
} from './content.js';
export const CHECKPOINT_KEY = 'nuclear-survivors-operation-v1';
export function serializeRun(game) {
  if (!['playing', 'paused', 'upgrade', 'relic'].includes(game.state))
    return null;
  return JSON.stringify(
    { version: 1, rng: game.random.getState?.() ?? null, game },
    (key, value) => {
      if (['particles', 'effects', 'numbers'].includes(key)) return [];
      if (value instanceof Set) return [...value];
      return value;
    },
  );
}
function finiteTree(value, depth = 0) {
  if (depth > 8) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length < 300;
  if (Array.isArray(value))
    return value.length < 1500 && value.every((v) => finiteTree(v, depth + 1));
  if (value && typeof value === 'object')
    return (
      Object.keys(value).length < 100 &&
      Object.values(value).every((v) => finiteTree(v, depth + 1))
    );
  return true;
}
export function restoreRun(raw) {
  try {
    const snapshot = JSON.parse(raw),
      data = snapshot?.game;
    if (
      snapshot?.version !== 1 ||
      !data ||
      !finiteTree(snapshot) ||
      !['playing', 'paused', 'upgrade', 'relic'].includes(data.state)
    )
      return null;
    if (
      !OPERATORS.some((o) => o.id === data.operator?.id) ||
      !ZONES.some((z) => z.id === data.zone?.id)
    )
      return null;
    const random = seededRandom('resumed');
    if (Number.isInteger(snapshot.rng)) random.setState(snapshot.rng);
    const baseline = createGame(random, {
      operator: data.operator.id,
      zone: data.zone.id,
      mode: data.mode,
      difficulty: data.difficulty?.id,
      perk: data.perk,
      chapter: data.chapter,
      daily: data.daily,
      ability: data.ability || 'shockwave',
      allowedWeapons: data.allowedWeapons || LEGACY_WEAPONS,
    });
    // Version-one checkpoints predate expedition fields. Migrate only those optional additions.
    for (const key of [
      'branch',
      'outfit',
      'abilityUses',
      'abilityFields',
      'abilityPulse',
      'relics',
      'relicChoices',
      'relicDrafts',
      'relicHealAt',
      'partsBroken',
      'difficulty',
      'ability',
      'allowedWeapons',
      'turrets',
      'focusWeapon',
      'perk',
      'chapter',
      'daily',
      'extractionAt',
      'overtime',
      'eventsCompleted',
      'eventCounts',
      'rescues',
      'eliteKills',
      'enemyKills',
      'fieldEvent',
      'eventIndex',
      'nextEvent',
      'buffs',
      'revives',
      'shotsFired',
      'damageTaken',
    ])
      if (!(key in data)) data[key] = baseline[key];
    if (
      !DIFFICULTIES.some((d) => d.id === data.difficulty?.id) ||
      !PERKS.some((p) => p.id === data.perk) ||
      (data.chapter !== null && !CHAPTERS.some((c) => c.id === data.chapter)) ||
      typeof data.buffs?.overdrive !== 'number'
    )
      return null;
    if (!Object.hasOwn(WEAPONS, data.focusWeapon)) return null;
    if (
      !ABILITIES.some((a) => a.id === data.ability) ||
      !Array.isArray(data.allowedWeapons) ||
      data.allowedWeapons.some((id) => !Object.hasOwn(WEAPONS, id)) ||
      !Array.isArray(data.turrets) ||
      data.turrets.length > 2 ||
      data.turrets.some(
        (t) =>
          !t ||
          !['x', 'y', 'life', 'clock', 'damage', 'angle'].every((k) =>
            Number.isFinite(t[k]),
          ),
      )
    )
      return null;
    if (!('surge' in data.buffs)) data.buffs.surge = 0;
    if (!Number.isFinite(data.buffs.surge)) return null;
    for (const record of [data.eventCounts, data.enemyKills]) {
      if (
        !record ||
        Array.isArray(record) ||
        typeof record !== 'object' ||
        Object.values(record).some(
          (value) => !Number.isInteger(value) || value < 0,
        )
      )
        return null;
    }
    if (
      data.fieldEvent &&
      (!Object.hasOwn(FIELD_EVENTS, data.fieldEvent.kind) ||
        !Array.isArray(data.fieldEvent.guards) ||
        !['x', 'y', 'progress', 'expires'].every((k) =>
          Number.isFinite(data.fieldEvent[k]),
        ))
    )
      return null;
    for (const [key, value] of Object.entries(baseline)) {
      if (key === 'random') continue;
      if (!(key in data)) return null;
      if (typeof value === 'number' && typeof data[key] !== 'number')
        return null;
      if (Array.isArray(value) && !Array.isArray(data[key])) return null;
    }
    for (const key of Object.keys(baseline.player))
      if (typeof data.player?.[key] !== 'number') return null;
    if (
      data.player.hp <= 0 ||
      data.player.maxHp <= 0 ||
      data.time < 0 ||
      data.level < 1
    )
      return null;
    if (
      !data.weapons ||
      !Object.keys(data.weapons).length ||
      Object.entries(data.weapons).some(
        ([id, w]) =>
          !Object.hasOwn(WEAPONS, id) ||
          !Number.isInteger(w.level) ||
          w.level < 1 ||
          w.level > 5 ||
          !Number.isFinite(w.clock),
      )
    )
      return null;
    if (
      data.enemies.some(
        (e) =>
          !ENEMIES[e.type] ||
          ![
            'x',
            'y',
            'hp',
            'maxHp',
            'radius',
            'speed',
            'attack',
            'id',
            'phase',
          ].every((k) => Number.isFinite(e[k])),
      )
    )
      return null;
    if (
      data.bullets.some(
        (b) =>
          !Array.isArray(b.hits) ||
          !['x', 'y', 'vx', 'vy', 'life', 'damage', 'pierce'].every((k) =>
            Number.isFinite(b[k]),
          ),
      )
    )
      return null;
    if (
      ['abilityUses', 'partsBroken', 'relicDrafts'].some(
        (k) => !Number.isInteger(data[k]) || data[k] < 0,
      ) ||
      data.relicDrafts > 20 ||
      data.abilityFields.length > 8
    )
      return null;
    if (
      (data.branch !== 'standard' &&
        !masteryBranch(data.operator.id, data.branch)) ||
      !['field', 'veteran'].includes(data.outfit)
    )
      return null;
    if (
      [...data.relics, ...data.relicChoices].some(
        (id) => !RELICS.some((r) => r.id === id),
      ) ||
      new Set(data.relics).size !== data.relics.length ||
      data.relics.length > RELICS.length ||
      data.relicChoices.length > 3
    )
      return null;
    if (
      data.state === 'relic' &&
      (!data.relicChoices.length ||
        data.relicDrafts < 1 ||
        data.relicChoices.some((id) => data.relics.includes(id)))
    )
      return null;
    if (
      data.abilityFields.some(
        (f) =>
          !['healing', 'frost'].includes(f.kind) ||
          !['x', 'y', 'life', 'radius', 'power'].every((k) =>
            Number.isFinite(f[k]),
          ),
      )
    )
      return null;
    if (
      data.fieldEvent &&
      ['escort', 'reactor', 'defense'].includes(data.fieldEvent.kind) &&
      ![
        'health',
        'maxHealth',
        'wave',
        'stage',
        'clock',
        'targetX',
        'targetY',
      ].every((k) => Number.isFinite(data.fieldEvent[k]))
    )
      return null;
    for (const e of data.enemies) {
      if (
        e.telegraph &&
        (!['charge', 'slam', 'spores', 'bloom', 'beams', 'meltdown'].includes(
          e.telegraph.kind,
        ) ||
          !['warn', 'tx', 'ty', 'angle'].every((k) =>
            Number.isFinite(e.telegraph[k]),
          ))
      )
        return null;
      if (
        e.parts &&
        (!Array.isArray(e.parts) ||
          e.parts.length > 3 ||
          !Number.isInteger(e.stage) ||
          e.stage < 1 ||
          e.stage > 3 ||
          !Number.isInteger(e.cycle) ||
          e.cycle < 0 ||
          !Number.isFinite(e.exposed) ||
          e.parts.some(
            (p) =>
              typeof p.name !== 'string' ||
              !p.name.length ||
              p.parent !== e.id ||
              p.type !== 'boss-part' ||
              typeof p.id !== 'string' ||
              !['x', 'y', 'hp', 'maxHp', 'angle', 'radius'].every((k) =>
                Number.isFinite(p[k]),
              ),
          ))
      )
        return null;
    }
    if (
      data.hazards.some(
        (h) =>
          h.kind === 'beam' &&
          !['x', 'y', 'angle', 'length', 'radius', 'warn', 'life'].every((k) =>
            Number.isFinite(h[k]),
          ),
      )
    )
      return null;
    if (
      data.turrets.some(
        (t) =>
          ['offset', 'interval', 'pierce', 'range'].some(
            (k) => k in t && !Number.isFinite(t[k]),
          ) ||
          ('mobile' in t && typeof t.mobile !== 'boolean'),
      )
    )
      return null;
    const game = {
      ...data,
      random,
      operator: baseline.operator,
      zone: baseline.zone,
      difficulty: baseline.difficulty,
      settled: false,
    };
    game.choices = data.choices
      .map((c) => UPGRADES.find((u) => u.id === c.id))
      .filter(Boolean);
    if (data.state === 'upgrade' && !game.choices.length) return null;
    game.bullets = game.bullets.map((b) => ({ ...b, hits: new Set(b.hits) }));
    game.state = ['upgrade', 'relic'].includes(data.state)
      ? data.state
      : 'paused';
    return game;
  } catch {
    return null;
  }
}
