import { primaryObjective } from './combat-ux.js';
import { eventTarget, missionGoals, missionReady } from './expedition.js';
import { abilityFor } from './abilities.js';
import { abilityCooldown, branchForGame } from './mastery.js';
import { hitExplanation } from './damage.js';
const time = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function compactObjective(g) {
  const base = primaryObjective(g);
  if (!base) return null;
  let title = base.title,
    detail = '',
    expanded = false;
  if (base.kind === 'mission') {
    const goal = missionGoals(g).find((goal) => goal.progress < goal.target);
    const names = {
      rescue: 'Rescue survivors',
      relay: 'Restore relays',
      boss: 'Defeat titans',
      convoy: 'Secure convoys',
    };
    title = `${names[goal.kind] || goal.label} · ${goal.progress}/${goal.target}`;
  } else if (base.kind === 'event') {
    const e = g.fieldEvent,
      target = eventTarget(e),
      near = Math.hypot(target.x - g.player.x, target.y - g.player.y) <= 90;
    const names = {
      rescue: 'Rescue survivor',
      relay: 'Restore relay',
      convoy: 'Secure convoy',
      escort: 'Escort convoy',
      defense: 'Defend survivors',
      reactor: 'Shut down reactor',
    };
    title = names[e.kind] || base.title;
    expanded = near || e.progress > 0;
    if (expanded) detail = base.detail;
    else title += ` · ${Math.ceil(Math.max(0, e.expires - g.time))}s`;
  } else if (base.kind === 'extract') {
    const inside =
      Math.hypot(g.player.x - g.extraction.x, g.player.y - g.extraction.y) <
      g.extraction.radius;
    expanded = inside;
    title = inside
      ? `Extracting · ${Math.floor(base.progress * 100)}%`
      : `Reach extraction · ${Math.round(Math.hypot(g.player.x - g.extraction.x, g.player.y - g.extraction.y))}m`;
    detail = inside ? 'Stay in the circle' : '';
  } else if (base.kind === 'boss') {
    expanded = true;
    detail = base.detail;
  }
  return { ...base, title, detail, expanded };
}
export function hudState(g, settings = {}) {
  const age = g.lastHit ? g.time - g.lastHit.time : Infinity,
    health = g.player.hp / g.player.maxHp;
  const timer =
    g.mode === 'endless'
      ? `Survived ${time(g.time)}`
      : g.extraction
        ? 'Extract open'
        : g.time >= g.extractionAt && !missionReady(g)
          ? 'Extract locked'
          : `Extract ${time(Math.ceil(Math.max(0, g.extractionAt - g.time)))}`;
  return {
    timer,
    healthNumbers: health < 0.3 || (age >= 0 && age < 3),
    objective: compactObjective(g),
    movementHint: !settings.movementLearned,
    hit:
      age >= 0 && age < 1
        ? `−${Math.ceil(g.lastHit.amount)} HP · ${hitExplanation(g.lastHit)?.label || 'Hit taken'}`
        : '',
    announcement:
      g.eventUntil > g.time &&
      !/(THE ZONE IS LISTENING|FOLLOW THE SIGNAL)/.test(g.eventText)
        ? g.eventText
        : '',
    buff:
      g.buffs.surge > 0
        ? `ϟ Overclock ${Math.ceil(g.buffs.surge)}s`
        : g.buffs.overdrive > 0
          ? `ϟ Overdrive ${Math.ceil(g.buffs.overdrive)}s`
          : g.player.invulnerable > 1
            ? `⬡ Shield ${Math.ceil(g.player.invulnerable)}s`
            : '',
  };
}
export function paintCombatHud(root, g, settings = {}) {
  const $ = (id) => root.getElementById(id),
    state = hudState(g, settings),
    p = g.player;
  $('timer').textContent = state.timer;
  $('health').style.width = `${(p.hp / p.maxHp) * 100}%`;
  $('health').classList.toggle('critical', p.hp / p.maxHp < 0.3);
  $('health-label').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('health-label').hidden = !state.healthNumbers;
  const vitals = $('health').closest('.vitals');
  vitals.setAttribute('aria-valuemax', p.maxHp);
  vitals.setAttribute('aria-valuenow', Math.ceil(p.hp));
  $('combat-objective').hidden = !state.objective;
  if (state.objective) {
    const o = state.objective;
    $('combat-objective').dataset.kind = o.kind;
    $('combat-objective').classList.toggle('expanded', o.expanded);
    $('combat-objective-title').textContent = o.title;
    $('combat-objective-detail').textContent = o.detail;
    $('combat-objective-detail').hidden = !o.detail;
    $('combat-objective-progress').parentElement.hidden = !o.expanded;
    $('combat-objective-progress').style.width = `${o.progress * 100}%`;
  }
  $('hit-notice').hidden = !state.hit;
  $('hit-notice').textContent = state.hit;
  $('buff-status').textContent = state.buff;
  $('announcement').textContent = state.announcement;
  $('announcement').classList.toggle('visible', !!state.announcement);
  $('touch-hint').hidden = !state.movementHint;
  $('move-hint').textContent = 'Drag to move';
  $('overtime').hidden = !g.extraction || g.overtime || !!g.daily;
  $('xp').style.width = `${(g.xp / g.xpNeeded) * 100}%`;
  for (const [id, timer, total] of [
    ['dash', p.dashTimer, p.dashCooldown],
    ['nova', p.novaTimer, abilityCooldown(g)],
  ]) {
    const button = $(id),
      remaining = Math.max(0, Math.min(1, timer / total));
    button.classList.toggle('recharging', timer > 0);
    button.style.setProperty(
      '--cooldown-remaining',
      `${100 * (1 - remaining)}`,
    );
    button.querySelector('b').textContent = timer > 0 ? Math.ceil(timer) : '';
    button.querySelector('b').hidden = timer <= 0;
    button.setAttribute(
      'aria-label',
      `${id === 'dash' ? 'Dash' : branchForGame(g)?.name || abilityFor(g).name}${timer > 0 ? `, ready in ${Math.ceil(timer)} seconds` : ', ready'}`,
    );
  }
  $('nova').querySelector('span').textContent = abilityFor(g).icon;
  return state;
}
