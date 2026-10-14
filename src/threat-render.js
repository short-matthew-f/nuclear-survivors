import { bossWarningAreas, bossChargeSpeed, bossFanAngles } from './bosses.js';
// Draw danger after weapon effects so its silhouette survives busy builds.
function outline(ctx, x, y, r, warning, progress = 0) {
  ctx.save();
  ctx.strokeStyle = '#152322';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = warning ? '#ffe2a4' : '#ff987e';
  ctx.lineWidth = 3;
  ctx.setLineDash(warning ? [8, 6] : []);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = warning ? '#ffe2a426' : '#ff987e50';
  ctx.lineWidth = 2;
  for (let offset = -r * 2; offset < r * 2; offset += 20) {
    ctx.beginPath();
    ctx.moveTo(x - r, y + offset);
    ctx.lineTo(x + r, y + offset + r * 2);
    ctx.stroke();
  }
  ctx.restore();
  if (progress > 0) {
    ctx.save();
    ctx.strokeStyle = '#fff1cb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
  }
}
function lane(ctx, x, y, angle, length, width, warning) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#172623';
  ctx.lineWidth = 7;
  ctx.strokeRect(0, -width, length, width * 2);
  ctx.strokeStyle = warning ? '#ffe2a4' : '#ff987e';
  ctx.lineWidth = 3;
  ctx.setLineDash(warning ? [10, 6] : []);
  ctx.strokeRect(0, -width, length, width * 2);
  ctx.setLineDash([]);
  ctx.restore();
}
export function drawThreats(ctx, g) {
  for (const b of g.hostile) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.beginPath();
    ctx.moveTo(b.radius + 4, 0);
    ctx.lineTo(-b.radius - 1, b.radius + 1);
    ctx.lineTo(-b.radius - 1, -b.radius - 1);
    ctx.closePath();
    ctx.fillStyle = '#ffb29b';
    ctx.strokeStyle = '#241e20';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  for (const h of g.hazards) {
    if (h.friendly) continue;
    if (h.kind === 'beam')
      lane(ctx, h.x, h.y, h.angle, h.length, h.radius, h.warn > 0);
    else outline(ctx, h.x, h.y, h.radius, h.warn > 0);
  }
  for (const e of g.enemies) {
    if (e.hp <= 0) continue;
    if (e.type === 'bomber' && e.detonate > 0)
      outline(ctx, e.x, e.y, 95, true, 1 - e.detonate / 0.9);
    if (e.type === 'burrower' && e.burrowLeft > 0)
      outline(ctx, e.x, e.y, e.radius + 12, true, 1 - e.burrowLeft / 1.6);
    const t = e.telegraph;
    if (!t) continue;
    if (t.kind === 'charge') {
      const angle = Math.atan2(t.ty - e.y, t.tx - e.x),
        length = bossChargeSpeed(e) * 0.75;
      lane(ctx, e.x, e.y, angle, length, e.radius + 12, true);
    } else if (t.kind === 'spores') {
      for (const angle of bossFanAngles(e, g.player))
        lane(ctx, e.x, e.y, angle, 675, 7, true);
    } else
      for (const area of bossWarningAreas(e, t)) {
        if (area.kind === 'beam')
          lane(ctx, area.x, area.y, area.angle, area.length, area.radius, true);
        else
          outline(
            ctx,
            area.x,
            area.y,
            area.radius,
            true,
            Math.max(0, 1 - t.warn / 1.4),
          );
      }
  }
}
export function drawHitFeedback(ctx, g) {
  const hit = g.lastHit,
    age = hit ? g.time - hit.time : 99;
  if (age < 0 || age > 0.6) return;
  const p = g.player,
    a = Math.atan2(hit.y - p.y, hit.x - p.x);
  ctx.save();
  ctx.globalAlpha = 1 - age / 0.6;
  ctx.strokeStyle = '#ffb09b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 34, -Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();
  if (Math.hypot(hit.x - p.x, hit.y - p.y) > 1) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 42, a - 0.35, a + 0.35);
    ctx.stroke();
  }
  ctx.restore();
}
