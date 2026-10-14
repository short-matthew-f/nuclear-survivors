import { ENEMIES } from './content.js';
const kinds = [
  'contact',
  'projectile',
  'explosion',
  'radiation',
  'beam',
  'impact',
  'unknown',
];
export function normalizeHit(hit) {
  if (
    !hit ||
    !kinds.includes(hit.kind) ||
    !['amount', 'time', 'x', 'y'].every((k) => Number.isFinite(hit[k])) ||
    hit.amount <= 0 ||
    hit.time < 0
  )
    return null;
  return {
    kind: hit.kind,
    enemy: Object.hasOwn(ENEMIES, hit.enemy) ? hit.enemy : null,
    phase: Number.isInteger(hit.phase) ? Math.max(0, hit.phase % 3) : 0,
    amount: hit.amount,
    time: hit.time,
    x: hit.x,
    y: hit.y,
  };
}
export function recordHit(g, amount, source = {}) {
  source ||= {};
  return normalizeHit({
    kind: kinds.includes(source.kind) ? source.kind : 'unknown',
    enemy: source.enemy,
    phase: source.phase,
    amount,
    time: g.time,
    x: Number.isFinite(source.x) ? source.x : g.player.x,
    y: Number.isFinite(source.y) ? source.y : g.player.y,
  });
}
export function hitExplanation(hit) {
  hit = normalizeHit(hit);
  if (!hit || hit.kind === 'unknown') return null;
  const enemy =
    hit.enemy === 'boss'
      ? ['The Groundskeeper', 'Mother of Spores', 'Reactor Heart'][hit.phase]
      : ENEMIES[hit.enemy]?.name;
  const labels = {
    contact: enemy ? `${enemy} contact` : 'Enemy contact',
    projectile: enemy ? `${enemy} projectile` : 'Enemy projectile',
    explosion: 'Cinder blister explosion',
    radiation: enemy ? `${enemy} radiation` : 'Radiation field',
    beam: 'Reactor beam',
    impact: enemy ? `${enemy} ground strike` : 'Ground strike',
  };
  const tips = {
    contact: 'Keep a gap; dash through openings before the crowd closes.',
    projectile: 'Move across the projectile path rather than along it.',
    explosion: 'Leave the outlined blast circle before it fills.',
    radiation:
      'Move outside the striped field; its solid edge means damage is active.',
    beam: 'Step sideways out of the marked beam lane.',
    impact: 'Leave the marked impact circle before the strike lands.',
  };
  return {
    label: labels[hit.kind],
    tip: tips[hit.kind],
    amount: Math.ceil(hit.amount),
  };
}
