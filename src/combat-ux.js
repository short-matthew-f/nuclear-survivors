import { WEAPONS, FIELD_EVENTS } from './content.js';
import { upgradePreview, evolutionProgress, WEAPON_LIMIT } from './build.js';
import { RELICS } from './relics.js';
import { eventInstruction, missionGoals } from './expedition.js';
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export function renderUpgradeChoices(g) {
  const focus = g.weapons[g.focusWeapon]
      ? g.focusWeapon
      : Object.keys(g.weapons)[0],
    path = evolutionProgress(g, focus);
  return `<div class="combat-choices"><header><span class="combat-kicker">LEVEL ${g.level} · OPERATION PAUSED</span><h1 data-screen-title tabindex="-1">Choose your upgrade</h1><p>${Object.keys(g.weapons).length}/${Math.max(WEAPON_LIMIT, Object.keys(g.weapons).length)} weapons · Choose one</p></header><div class="combat-options">${g.choices
    .map((u) => {
      const preview = upgradePreview(g, u.id),
        weapon = WEAPONS[u.id];
      return `<button class="combat-option ${preview.evolves ? 'transformation' : ''}" data-action="upgrade" data-value="${u.id}"><span class="combat-option-icon" aria-hidden="true">${u.icon}</span><div><span class="combat-kicker">${preview.lane} · ${weapon ? `${g.weapons[u.id]?.level || 0} → ${preview.next}/5` : `RANK ${preview.next}`}</span><h2>${weapon ? weapon.name + ' · ' : ''}${escape(preview.title)}</h2><ul>${preview.lines.map((line) => `<li>${escape(line)}</li>`).join('')}</ul></div><span class="combat-pick" aria-hidden="true">→</span></button>`;
    })
    .join(
      '',
    )}</div><footer><span>${g.pendingLevels > 1 ? `${g.pendingLevels - 1} more choices queued` : 'Choose to return to the field'}</span><button data-action="reroll" ${g.rerolls ? '' : 'disabled'}>Reroll · ${g.rerolls}</button></footer><details data-panel="build-key"><summary>Evolution path · ${WEAPONS[focus].name}</summary><p>${path.evolved ? 'Evolved' : `${path.rank}/5 weapon ranks · ${path.keyReady ? '✓' : '◇'} ${escape(path.mutation)}`} → ${path.name}</p><p>Reach rank 5 and obtain ${escape(path.mutation)} to evolve. Weapon patterns above match the actual simulation.</p></details></div>`;
}
export function primaryObjective(g) {
  const p = g.player,
    event = g.fieldEvent,
    remaining = missionGoals(g).filter((goal) => goal.progress < goal.target);
  if (g.extraction) {
    const d = Math.hypot(p.x - g.extraction.x, p.y - g.extraction.y),
      inside = d < g.extraction.radius;
    return {
      kind: 'extract',
      title: inside ? 'Hold for extraction' : 'Reach the rescue beacon',
      detail: inside
        ? `${Math.floor((g.extractProgress / 8) * 100)}% · Stay in the circle`
        : `${Math.round(d)}m · Follow the cyan marker`,
      progress: inside ? g.extractProgress / 8 : 0,
    };
  }
  // An active event required by the story takes precedence over an optional boss fight.
  const required =
    event &&
    remaining.some(
      (goal) =>
        (goal.kind === 'rescue' &&
          ['rescue', 'defense'].includes(event.kind)) ||
        (goal.kind === 'relay' && event.kind === 'relay'),
    );
  const boss = g.enemies.find((e) => e.type === 'boss' && e.hp > 0);
  if (boss && !required)
    return {
      kind: 'boss',
      title: boss.name,
      detail: `Phase ${boss.stage || 1} · ${boss.exposed > 0 || boss.parts?.every((part) => part.hp <= 0) ? 'Core exposed' : 'Break parts to expose the core'}`,
      progress: Math.max(0, boss.hp / boss.maxHp),
    };
  if (event) {
    const spec = FIELD_EVENTS[event.kind],
      d = Math.hypot(p.x - event.x, p.y - event.y),
      guarded = event.guards.some((id) =>
        g.enemies.some((e) => e.id === id && e.hp > 0),
      );
    const instruction = ['escort', 'reactor', 'defense'].includes(event.kind)
      ? eventInstruction(g, event)
      : guarded
        ? 'Clear the elite guards'
        : d < 65
          ? 'Hold inside the circle'
          : 'Enter the marked circle';
    return {
      kind: 'event',
      title: spec.name,
      detail: `${instruction} · ${Math.ceil(Math.max(0, event.expires - g.time))}s`,
      progress: Math.min(1, event.progress / spec.duration),
    };
  }
  if (remaining.length) {
    const goal = remaining[0];
    return {
      kind: 'mission',
      title: goal.label,
      detail: `Story objective · ${goal.progress}/${goal.target}`,
      progress: goal.progress / goal.target,
    };
  }
  return null;
}
// UI-only clock: the simulation stays paused throughout orientation.
export function createResumeGate() {
  let remaining = 0;
  return {
    get active() {
      return remaining > 0;
    },
    get seconds() {
      return Math.ceil(remaining);
    },
    start() {
      remaining = 3;
    },
    cancel() {
      remaining = 0;
    },
    advance(dt) {
      if (remaining <= 0) return false;
      remaining = Math.max(0, remaining - Math.max(0, Math.min(dt, 0.1)));
      return remaining === 0;
    },
  };
}

export function renderRelicChoices(g) {
  return `<div class="combat-choices"><header><span class="combat-kicker">RARE RELIC · OPERATION PAUSED</span><h1 data-screen-title tabindex="-1">Choose a relic</h1><p>Lasts this operation · Uses no weapon slot</p></header><div class="combat-options">${g.relicChoices
    .map((id) => {
      const r = RELICS.find((r) => r.id === id);
      return `<button class="combat-option transformation" data-action="relic" data-value="${r.id}"><span class="combat-option-icon" aria-hidden="true">${r.icon}</span><div><h2>${r.name}</h2><p>${r.description}</p></div><span class="combat-pick" aria-hidden="true">→</span></button>`;
    })
    .join(
      '',
    )}</div><footer>${g.relics.length} relics installed · Choose one</footer></div>`;
}
