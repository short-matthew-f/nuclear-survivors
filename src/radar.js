import { FIELD_EVENTS } from './content.js';
import { eventTarget } from './expedition.js';
export function radarPoint(target, player, radius = 33, scale = 0.06) {
  const dx = (target.x - player.x) * scale,
    dy = (target.y - player.y) * scale,
    d = Math.hypot(dx, dy),
    factor = d > radius ? radius / d : 1;
  return { x: dx * factor, y: dy * factor, edge: d > radius };
}
export function createRadarRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return (g) => {
    const size = 80,
      ratio = Math.min(window.devicePixelRatio || 1, 2),
      pixels = Math.round(size * ratio);
    if (canvas.width !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    ctx.setTransform(pixels / size, 0, 0, pixels / size, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(40, 40);
    ctx.fillStyle = '#142b25';
    ctx.beginPath();
    ctx.arc(0, 0, 37, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#88a68a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#59765c77';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.moveTo(-33, 0);
    ctx.lineTo(33, 0);
    ctx.moveTo(0, -33);
    ctx.lineTo(0, 33);
    ctx.stroke();
    const mark = (target, color, shape, r = 2, clamp = false) => {
      const point = radarPoint(target, g.player);
      if (point.edge && !clamp) return;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.fillStyle = color;
      ctx.strokeStyle = '#142b25';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (shape === 'flag') {
        ctx.moveTo(-2, r + 1);
        ctx.lineTo(-2, -r - 1);
        ctx.lineTo(r + 1, -1);
        ctx.lineTo(-2, 1);
      } else if (shape === 'square') ctx.rect(-r, -r, r * 2, r * 2);
      else if (shape === 'diamond') {
        ctx.moveTo(0, -r - 1);
        ctx.lineTo(r + 1, 0);
        ctx.lineTo(0, r + 1);
        ctx.lineTo(-r - 1, 0);
        ctx.closePath();
      } else ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    for (const e of g.enemies)
      if (e.hp > 0)
        mark(
          e,
          e.type === 'boss' ? '#ffcc9d' : '#ff9985',
          e.type === 'boss' ? 'diamond' : 'dot',
          e.type === 'boss' ? 3 : 2,
        );
    for (const s of g.supplies)
      if (s.kind !== 'scrap') mark(s, '#ecdda8', 'square');
    if (g.fieldEvent)
      mark(
        eventTarget(g.fieldEvent),
        FIELD_EVENTS[g.fieldEvent.kind].color,
        'flag',
        3,
        true,
      );
    if (g.extraction) mark(g.extraction, '#a6f6e3', 'flag', 4, true);
    ctx.rotate(g.player.angle || 0);
    ctx.fillStyle = '#f3f6df';
    ctx.strokeStyle = '#142b25';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  };
}
