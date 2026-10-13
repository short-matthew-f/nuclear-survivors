import { distance } from './game.js';
import { artUrl } from './art.js';
import { FIELD_EVENTS } from './content.js';
const TAU = Math.PI * 2;
function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
  ctx.fill();
}
function ring(ctx, x, y, r, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
  ctx.stroke();
}
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const atlas = new Image(),
    terrain = new Image(),
    props = new Image();
  atlas.src = artUrl(
    'characters.png',
    import.meta.env.BASE_URL,
    document.baseURI,
  );
  props.src = artUrl('props.png', import.meta.env.BASE_URL, document.baseURI);
  terrain.src = artUrl(
    'terrain.png',
    import.meta.env.BASE_URL,
    document.baseURI,
  );
  const patterns = {};
  terrain.onload = () => {
    ['forest', 'marsh', 'industrial'].forEach((id, i) => {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 256;
      tile
        .getContext('2d')
        .drawImage(
          terrain,
          (terrain.width * i) / 3,
          0,
          terrain.width / 3,
          terrain.height,
          0,
          0,
          256,
          256,
        );
      patterns[id] = ctx.createPattern(tile, 'repeat');
    });
  };
  function prop(index, x, y, size) {
    if (!props.complete || !props.naturalWidth) return false;
    const sw = props.naturalWidth / 4,
      sh = props.naturalHeight / 2;
    ctx.drawImage(
      props,
      (index % 4) * sw,
      Math.floor(index / 4) * sh,
      sw,
      sh,
      x - size / 2,
      y - (size * sh) / sw / 2,
      size,
      (size * sh) / sw,
    );
    return true;
  }
  function sprite(index, size, step = 0) {
    if (!atlas.complete || !atlas.naturalWidth) return false;
    const sw = atlas.naturalWidth / 4,
      sh = atlas.naturalHeight / 3;
    ctx.save();
    ctx.translate(0, Math.sin(step) * 1.4);
    ctx.drawImage(
      atlas,
      (index % 4) * sw,
      Math.floor(index / 4) * sh,
      sw,
      sh,
      -size / 2,
      (-size * sh) / sw / 2,
      size,
      (size * sh) / sw,
    );
    ctx.restore();
    return true;
  }
  let width = 900,
    height = 600,
    zoom = 1,
    dpr = 1;
  function resize(quality = 'high') {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    zoom = width < 600 ? 0.78 : 1;
    dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  function render(g, settings, pointer, ambient = 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = g.zone.ground;
    ctx.fillRect(0, 0, width, height);
    const p = g.player,
      worldWidth = width / zoom,
      worldHeight = height / zoom;
    const camera =
      g.state === 'ready'
        ? {
            x: Math.cos(ambient * 0.035) * 35,
            y: Math.sin(ambient * 0.035) * 35,
          }
        : p;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    if (settings.shake && g.shake > 0)
      ctx.translate(
        Math.sin(ambient * 73) * g.shake,
        Math.cos(ambient * 91) * g.shake,
      );
    ctx.translate(-camera.x, -camera.y);
    if (patterns[g.zone.id]) {
      ctx.fillStyle = patterns[g.zone.id];
      ctx.fillRect(
        camera.x - worldWidth / 2 - 50,
        camera.y - worldHeight / 2 - 50,
        worldWidth + 100,
        worldHeight + 100,
      );
    }
    const tile = 120;
    for (
      let gx = Math.floor((camera.x - worldWidth / 2) / tile) - 1;
      gx <= Math.ceil((camera.x + worldWidth / 2) / tile);
      gx++
    ) {
      for (
        let gy = Math.floor((camera.y - worldHeight / 2) / tile) - 1;
        gy <= Math.ceil((camera.y + worldHeight / 2) / tile);
        gy++
      ) {
        const s = hash(gx, gy),
          x = gx * tile,
          y = gy * tile;
        ctx.globalAlpha = patterns[g.zone.id] ? 0.035 : 0.15 + s * 0.2;
        ctx.fillStyle = g.zone.detail;
        ctx.fillRect(x, y, tile, tile);
        ctx.globalAlpha = 1;
        for (let i = 0; i < 5; i++) {
          const sx = x + hash(gx + i, gy + 19) * 120,
            sy = y + hash(gx + 42, gy + i) * 120;
          ctx.strokeStyle = g.zone.detail;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 3, sy - 7);
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - 4, sy - 4);
          ctx.stroke();
        }
        if (props.complete && props.naturalWidth) {
          if (s > 0.78) {
            prop(
              g.zone.id === 'industrial' ? 3 : g.zone.id === 'marsh' ? 1 : 0,
              x + 55,
              y + 55,
              105,
            );
            continue;
          }
          if (s < 0.07) {
            prop(2, x + 55, y + 55, 84);
            continue;
          }
          if (s > 0.48 && s < 0.56) {
            prop(5, x + 55, y + 55, 50);
            continue;
          }
        }
        if (g.zone.id === 'marsh' && s > 0.55) {
          ctx.fillStyle = '#102723';
          ctx.beginPath();
          ctx.ellipse(x + 60, y + 60, 45 + s * 20, 25, 0.3, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#58837d44';
          ctx.stroke();
        } else if (s > 0.78) {
          if (g.zone.id === 'industrial') {
            ctx.fillStyle = '#151b16';
            ctx.fillRect(x + 27, y + 38, 58, 40);
            ctx.fillStyle = '#514838';
            ctx.fillRect(x + 23, y + 28, 58, 40);
            ctx.strokeStyle = '#716044';
            ctx.strokeRect(x + 23, y + 28, 58, 40);
            ctx.fillStyle = '#2e342a';
            ctx.fillRect(x + 30, y + 35, 13, 25);
            ctx.fillRect(x + 49, y + 35, 23, 6);
          } else {
            circle(ctx, x + 58, y + 60, 33, '#101a1366');
            for (let i = 0; i < 5; i++) {
              const a = (i * TAU) / 5;
              circle(
                ctx,
                x + 51 + Math.cos(a) * 14,
                y + 45 + Math.sin(a) * 14,
                20,
                g.zone.id === 'marsh' ? '#28423a' : '#34422c',
              );
            }
            circle(
              ctx,
              x + 50,
              y + 44,
              19,
              g.zone.id === 'marsh' ? '#345144' : '#3e4d31',
            );
            ctx.strokeStyle = '#64734a55';
            ctx.beginPath();
            ctx.moveTo(x + 40, y + 40);
            ctx.lineTo(x + 49, y + 30);
            ctx.lineTo(x + 59, y + 36);
            ctx.stroke();
          }
        } else if (s < 0.07) {
          ctx.save();
          ctx.translate(x + 50, y + 55);
          ctx.rotate(s * 30);
          ctx.fillStyle = '#10191188';
          ctx.fillRect(-22, -5, 45, 22);
          ctx.fillStyle = '#5c6045';
          ctx.fillRect(-20, -14, 38, 22);
          ctx.fillStyle = '#303c2c';
          ctx.fillRect(-16, -10, 12, 14);
          ctx.fillRect(3, -10, 11, 14);
          ctx.strokeStyle = '#8d8b5c';
          ctx.strokeRect(-20, -14, 38, 22);
          ctx.restore();
        } else if (s > 0.48 && s < 0.56) {
          ctx.fillStyle = '#171e16';
          ctx.fillRect(x + 52, y + 43, 8, 30);
          ctx.fillStyle = '#5d6549';
          ctx.fillRect(x + 43, y + 37, 25, 16);
          ctx.strokeStyle = '#a1a16b';
          ctx.strokeRect(x + 43, y + 37, 25, 16);
          ctx.fillStyle = '#d5bd74';
          ctx.font = '13px monospace';
          ctx.fillText('☢', x + 49, y + 50);
        }
      }
    }
    ctx.fillStyle = g.zone.id === 'industrial' ? '#423d31' : '#333b2c';
    ctx.fillRect(-155, camera.y - worldHeight, 110, worldHeight * 2);
    ctx.fillStyle = '#98915a66';
    for (
      let y = Math.floor((camera.y - worldHeight) / 90) * 90;
      y < camera.y + worldHeight;
      y += 90
    )
      ctx.fillRect(-103, y, 5, 35);
    ctx.fillStyle = '#88917022';
    ctx.fillRect(-154, camera.y - worldHeight, 3, worldHeight * 2);
    ctx.fillRect(-48, camera.y - worldHeight, 3, worldHeight * 2);
    // Survey lights and ruins are fixed landmarks in each procedural sector.
    for (let i = 0; i < 4; i++) {
      const x = i % 2 ? 270 : -310,
        y = i < 2 ? 260 : -280;
      if (prop(3, x + 30, y + 22, 88)) continue;
      ctx.fillStyle = '#101910aa';
      ctx.fillRect(x + 7, y + 8, 60, 45);
      ctx.fillStyle = g.zone.detail;
      ctx.fillRect(x, y, 60, 45);
      ctx.strokeStyle = '#7b805244';
      ctx.strokeRect(x, y, 60, 45);
      ctx.fillStyle = '#d1eb8399';
      ctx.fillRect(x + 23, y + 13, 12, 5);
    }
    for (const h of g.hazards) {
      const warning = h.warn > 0,
        alpha = warning ? 0.08 + Math.sin(ambient * 8) * 0.04 : 0.2;
      ctx.globalAlpha = alpha;
      circle(ctx, h.x, h.y, h.radius, h.friendly ? '#f8a658' : '#c2da55');
      ctx.globalAlpha = 1;
      ring(
        ctx,
        h.x,
        h.y,
        h.radius,
        warning ? '#d5ce6c99' : '#acc85755',
        warning ? 2 : 1,
      );
      if (warning) {
        ctx.fillStyle = '#e1d78f';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('☢', h.x, h.y + 7);
      } else
        for (let i = 0; i < 4; i++) {
          const a = ambient * 0.5 + i * 1.6;
          circle(
            ctx,
            h.x + Math.cos(a) * h.radius * 0.6,
            h.y + Math.sin(a) * h.radius * 0.6,
            3,
            '#d7ed7d66',
          );
        }
    }
    if (g.fieldEvent) {
      const e = g.fieldEvent,
        spec = FIELD_EVENTS[e.kind];
      circle(ctx, e.x, e.y, 65, `${spec.color}12`);
      ring(ctx, e.x, e.y, 65, `${spec.color}88`, 2);
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.kind === 'rescue') {
        ring(ctx, 0, 0, 22, spec.color, 2);
        sprite(0, 44);
      } else if (
        !prop(e.kind === 'relay' ? 6 : 4, 0, 0, e.kind === 'relay' ? 90 : 55)
      ) {
        ctx.fillStyle = '#17251e';
        ctx.fillRect(-20, -20, 40, 40);
        ctx.strokeStyle = spec.color;
        ctx.strokeRect(-20, -20, 40, 40);
      }
      ctx.fillStyle = spec.color;
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(spec.icon, 0, -35);
      ctx.font = '9px monospace';
      ctx.fillText(spec.name, 0, -80);
      if (e.progress > 0) {
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          70,
          -Math.PI / 2,
          -Math.PI / 2 + (TAU * e.progress) / spec.duration,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
    if (g.extraction) {
      const e = g.extraction;
      circle(ctx, e.x, e.y, e.radius, '#9be9dc19');
      ring(ctx, e.x, e.y, e.radius, '#a3f5dc88', 2);
      ring(ctx, e.x, e.y, 50 + Math.sin(ambient * 2) * 10, '#a3f5dc44');
      ctx.strokeStyle = '#a3f5dc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x - 15, e.y);
      ctx.lineTo(e.x + 15, e.y);
      ctx.moveTo(e.x, e.y - 15);
      ctx.lineTo(e.x, e.y + 15);
      ctx.stroke();
      ctx.fillStyle = '#bcf9e6';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXTRACTION', e.x, e.y - 90);
    }
    for (const s of g.supplies) {
      const color =
        s.kind === 'medkit'
          ? '#ebaa9b'
          : s.kind === 'relic'
            ? '#b9a1ed'
            : '#e8c77e';
      const r = s.kind === 'scrap' ? 5 : 14;
      if (s.kind !== 'scrap') {
        ring(ctx, s.x, s.y, 23 + Math.sin(ambient * 3) * 3, `${color}44`);
        if (!(
          ['crate', 'medkit'].includes(s.kind) &&
          prop(s.kind === 'crate' ? 4 : 7, s.x, s.y, 36)
        )) {
          ctx.fillStyle = '#172017';
          ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(s.x - r, s.y - r, r * 2, r * 2);
          ctx.fillStyle = color;
          ctx.font = '17px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            {
              medkit: '+',
              relic: '◈',
              overdrive: 'ϟ',
              vacuum: '◎',
              shield: '⬡',
            }[s.kind] || '▤',
            s.x,
            s.y + 6,
          );
        }
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
      }
    }
    for (const c of g.cores) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = c.value >= 5 ? '#b5e9ec' : '#c2ef89';
      const r = c.value >= 5 ? 5 : 3.5;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.globalAlpha = 0.1;
      ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
      ctx.restore();
    }
    for (const m of g.mines) {
      circle(ctx, m.x, m.y, 7, '#242d22');
      ring(ctx, m.x, m.y, 8, '#e2b575');
      circle(
        ctx,
        m.x,
        m.y,
        2,
        Math.sin(ambient * 6) > 0 ? '#ffc586' : '#7d6043',
      );
    }
    for (const e of g.enemies) {
      if (
        Math.abs(e.x - camera.x) > worldWidth / 2 + 60 ||
        Math.abs(e.y - camera.y) > worldHeight / 2 + 60
      )
        continue;
      if (e.hit) ring(ctx, e.x, e.y, e.radius + 3, '#f5edbd', 2);
      if (e.elite) ring(ctx, e.x, e.y, e.radius + 11, '#f5c276', 2);
      circle(ctx, e.x + 3, e.y + 7, e.radius + 2, '#0a150d66');
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.atan2(p.y - e.y, p.x - e.x));
      const color = e.hit ? '#f3f1cf' : e.color;
      const index =
        e.type === 'boss'
          ? 9 + (e.phase % 3)
          : {
              walker: 3,
              runner: 4,
              brute: 5,
              spitter: 6,
              charger: 7,
              splitter: 8,
            }[e.type];
      if (e.hit) ctx.globalAlpha = 0.72;
      if (
        !sprite(
          index,
          e.radius * (e.type === 'boss' ? 3.3 : 3.1),
          ambient * (e.type === 'runner' ? 15 : 8) + e.id,
        )
      ) {
        if (e.type === 'boss') {
          for (let i = 0; i < 8; i++) {
            const a = (i * TAU) / 8;
            ctx.save();
            ctx.rotate(a);
            ctx.fillStyle = '#615840';
            ctx.fillRect(22, -7, 32, 14);
            ctx.fillStyle = '#d4c38b';
            ctx.fillRect(43, -3, 14, 6);
            ctx.restore();
          }
          ring(ctx, 0, 0, e.radius + 7, '#b3a76a66', 3);
        }
        if (e.type === 'runner' || e.type === 'charger') {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(e.radius + 5, 0);
          ctx.lineTo(-e.radius, -e.radius);
          ctx.lineTo(-e.radius, e.radius);
          ctx.closePath();
          ctx.fill();
        } else {
          circle(ctx, 0, 0, e.radius, color);
          circle(ctx, -3, -3, e.radius * 0.7, e.hit ? '#ffffff' : '#1a251b44');
        }
        if (e.type === 'spitter' || e.type === 'splitter') {
          for (let i = 0; i < 3; i++)
            circle(
              ctx,
              -e.radius + 3,
              i * 7 - 7,
              5,
              e.type === 'spitter' ? '#c4df9a' : '#d2b1e0',
            );
        }
        circle(
          ctx,
          e.radius * 0.4,
          -4,
          e.type === 'boss' ? 5 : 2.3,
          e.type === 'boss' ? '#fff0b1' : '#edeca4',
        );
        circle(
          ctx,
          e.radius * 0.4,
          4,
          e.type === 'boss' ? 5 : 2.3,
          e.type === 'boss' ? '#fff0b1' : '#edeca4',
        );
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (e.hp < e.maxHp && e.type !== 'boss') {
        ctx.fillStyle = '#111910';
        ctx.fillRect(e.x - 14, e.y - e.radius - 9, 28, 3);
        ctx.fillStyle = '#c3d28d';
        ctx.fillRect(e.x - 14, e.y - e.radius - 9, (28 * e.hp) / e.maxHp, 3);
      }
    }
    for (const b of g.bullets) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
      ctx.stroke();
    }
    for (const b of g.hostile) {
      circle(ctx, b.x, b.y, b.radius + 3, '#d6c26b22');
      circle(ctx, b.x, b.y, b.radius, '#e2bc78');
    }
    const orbit = g.weapons.orbit;
    if (orbit) {
      const radius = (55 + orbit.level * 5) * p.area,
        blades = orbit.level + (orbit.evolved ? 3 : 0);
      ring(ctx, p.x, p.y, radius, '#c7ebca18');
      for (let i = 0; i < blades; i++) {
        const a = g.time * (orbit.evolved ? 3.4 : 2.3) + (i * TAU) / blades,
          x = p.x + Math.cos(a) * radius,
          y = p.y + Math.sin(a) * radius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ambient * 8);
        ctx.fillStyle = orbit.evolved ? '#b5eff2' : '#d8e9ce';
        ctx.fillRect(-13, -3, 26, 6);
        ctx.fillRect(-3, -13, 6, 26);
        circle(ctx, 0, 0, 4, '#688578');
        ctx.restore();
      }
    }
    for (const e of g.effects) {
      ctx.globalAlpha = Math.max(0, e.life / e.maxLife);
      if (e.kind === 'ring') {
        const t = 1 - e.life / e.maxLife;
        circle(ctx, e.x, e.y, e.radius * t, `${e.color}10`);
        ring(ctx, e.x, e.y, e.radius * t, e.color, 3 * (1 - t) + 1);
      } else {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo((e.x + e.tx) / 2 + 12, (e.y + e.ty) / 2 - 15);
        ctx.lineTo((e.x + e.tx) / 2 - 7, (e.y + e.ty) / 2 + 8);
        ctx.lineTo(e.tx, e.ty);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    for (const s of g.particles) {
      ctx.globalAlpha = Math.min(1, s.life * 2);
      circle(ctx, s.x, s.y, 2, s.color);
    }
    ctx.globalAlpha = 1;
    if (p.invulnerable <= 0 || Math.floor(p.invulnerable * 18) % 2) {
      circle(ctx, p.x + 2, p.y + 8, 17, '#09130c88');
      ring(ctx, p.x, p.y, 24, `${g.operator.color}88`, 1.5);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (
        !sprite(
          { nomad: 0, spark: 1, bastion: 2 }[g.operator.id],
          66,
          g.distance / 9,
        )
      ) {
        ctx.fillStyle = '#4b5a43';
        ctx.fillRect(-12, -11, 16, 22);
        ctx.fillStyle = '#26352b';
        ctx.fillRect(-14, -7, 6, 14);
        circle(ctx, 0, 0, 11, '#c5c3a0');
        circle(ctx, 2, 0, 8, '#3f5142');
        ctx.fillStyle = g.operator.color;
        ctx.fillRect(6, -5, 4, 10);
        ctx.fillStyle = '#bec4a3';
        ctx.fillRect(6, 7, 21, 4);
        ctx.fillStyle = '#26352b';
        ctx.fillRect(23, 5, 7, 6);
      }
      ctx.restore();
    }
    if (g.weapons.drone) {
      const w = g.weapons.drone,
        count = Math.ceil(w.level / 2) + (w.evolved ? 3 : 0);
      for (let i = 0; i < count; i++) {
        const a = g.time * 1.5 + i * 2.1,
          x = p.x + Math.cos(a) * 45,
          y = p.y + Math.sin(a) * 45;
        circle(ctx, x, y, 8, '#233247');
        ring(ctx, x, y, 9, '#a6c9ff', 2);
        ctx.fillStyle = '#c6e0ff';
        ctx.fillRect(x - 13, y - 2, 26, 4);
      }
    }
    if (g.buffs.overdrive > 0)
      ring(ctx, p.x, p.y, 30 + Math.sin(ambient * 5) * 3, '#96cdff88', 2);
    if (p.invulnerable > 1) ring(ctx, p.x, p.y, 32, '#b3f0e6aa', 2);
    if (p.dashLeft > 0) {
      ring(ctx, p.x - p.dashX * 20, p.y - p.dashY * 20, 17, '#e0ffee66', 2);
      ring(ctx, p.x - p.dashX * 50, p.y - p.dashY * 50, 12, '#e0ffee33', 2);
    }
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    for (const n of settings.numbers === false ? [] : g.numbers) {
      ctx.globalAlpha = Math.min(1, n.life * 2);
      ctx.fillStyle = n.critical ? '#ffe1a0' : '#e3eacb';
      ctx.fillText(n.value, n.x, n.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.18,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.65,
    );
    vignette.addColorStop(0, '#07120800');
    vignette.addColorStop(1, '#040d08aa');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    if (settings.quality !== 'low') {
      for (let i = 0; i < 28; i++) {
        const x = (hash(i, 8) * width + ambient * (3 + (i % 4))) % width,
          y =
            (((hash(i, 19) * height - ambient * (5 + (i % 3))) % height) +
              height) %
            height;
        circle(ctx, x, y, i % 4 === 0 ? 1.5 : 0.7, '#d9e7a62b');
      }
      if (g.zone.id === 'marsh') {
        ctx.strokeStyle = '#a1ddd51a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 50; i++) {
          const x = hash(i, 11) * width,
            y = (hash(i, 7) * height + ambient * 180) % height;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 4, y + 12);
          ctx.stroke();
        }
      }
    }
    if (p.hp / p.maxHp < 0.3 && g.state === 'playing') {
      ctx.fillStyle = `rgba(160,45,32,${0.06 + Math.sin(ambient * 4) * 0.03})`;
      ctx.fillRect(0, 0, width, height);
    }
    if (g.state === 'playing') {
      const goal =
        g.extraction ||
        g.fieldEvent ||
        g.supplies.find((s) => s.kind === 'relic') ||
        g.supplies.find((s) => s.kind === 'crate');
      if (goal && distance(goal, p) > 150) {
        const a = Math.atan2(goal.y - p.y, goal.x - p.x),
          r = Math.min(width, height) * 0.33;
        ctx.save();
        ctx.translate(
          width / 2 + Math.cos(a) * r,
          height / 2 + Math.sin(a) * r,
        );
        ctx.rotate(a);
        ctx.fillStyle = g.extraction
          ? '#9ee7d3'
          : g.fieldEvent
            ? FIELD_EVENTS[g.fieldEvent.kind].color
            : '#e0c784';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#d8dfb8';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${Math.round(distance(goal, p))}m`,
          width / 2 + Math.cos(a) * (r + 22),
          height / 2 + Math.sin(a) * (r + 22) + 3,
        );
      }
    }
    if (settings.radar && g.state === 'playing') {
      const x = settings.leftHanded ? width - 59 : 59,
        y = height - 150,
        radius = 34,
        scale = 0.07;
      ctx.save();
      circle(ctx, x, y, radius, '#0b171ce6');
      ring(ctx, x, y, radius, '#a1bc7a44');
      ctx.beginPath();
      ctx.arc(x, y, radius - 2, 0, TAU);
      ctx.clip();
      const dot = (target, color, size) => {
        const dx = (target.x - p.x) * scale,
          dy = (target.y - p.y) * scale;
        circle(ctx, x + dx, y + dy, size, color);
      };
      for (const e of g.enemies)
        dot(
          e,
          e.type === 'boss' ? '#efad7b' : e.elite ? '#f1cc72' : '#d67e70',
          e.type === 'boss' ? 3 : 1.5,
        );
      for (const s of g.supplies) if (s.kind !== 'scrap') dot(s, '#e6cc93', 2);
      if (g.fieldEvent)
        dot(g.fieldEvent, FIELD_EVENTS[g.fieldEvent.kind].color, 3);
      if (g.extraction) dot(g.extraction, '#a1f9d6', 4);
      circle(ctx, x, y, 2.5, '#ecf3d9');
      ctx.restore();
    }
    if (pointer) {
      circle(ctx, pointer.ox, pointer.oy, 44, '#dcefc710');
      ring(ctx, pointer.ox, pointer.oy, 44, '#dcefc733');
      const dx = pointer.x - pointer.ox,
        dy = pointer.y - pointer.oy,
        length = Math.hypot(dx, dy) || 1,
        r = Math.min(length, 44);
      circle(
        ctx,
        pointer.ox + (dx / length) * r,
        pointer.oy + (dy / length) * r,
        19,
        '#dcefc740',
      );
      ring(
        ctx,
        pointer.ox + (dx / length) * r,
        pointer.oy + (dy / length) * r,
        19,
        '#dcefc788',
      );
    }
  }
  return {
    resize,
    render,
    getView: () => ({ width: width / zoom, height: height / zoom }),
  };
}
