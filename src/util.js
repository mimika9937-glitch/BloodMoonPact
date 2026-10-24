const W = 960;
const H = 540;
const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';
const ART_SCALE = 1.5;
const FACE_FROM_CENTER = 16 * ART_SCALE;

function frameLeft(sp) { return FACE_FROM_CENTER - sp.face; }

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function approach(v, target, step) { return v < target ? Math.min(v + step, target) : Math.max(v - step, target); }
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function easeOut(t) { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) * (1 - t); }

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRect(cx, cy, r, b) {
  const nx = clamp(cx, b.x, b.x + b.w);
  const ny = clamp(cy, b.y, b.y + b.h);
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= r * r;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function rankFor(time, deaths) {
  if (time <= 420 && deaths <= 1) return 'S';
  if (time <= 600 && deaths <= 3) return 'A';
  return 'B';
}

function drawNineSlice(ctx, img, dx, dy, dw, dh, cs, cd) {
  if (!img) return;
  const sw = img.width, sh = img.height;
  if (dw < cd * 2 || dh < cd * 2) { ctx.drawImage(img, dx, dy, dw, dh); return; }
  const sx = [0, cs, sw - cs], sy = [0, cs, sh - cs];
  const sws = [cs, sw - 2 * cs, cs], shs = [cs, sh - 2 * cs, cs];
  const dxs = [0, cd, dw - cd], dys = [0, cd, dh - cd];
  const dws = [cd, dw - 2 * cd, cd], dhs = [cd, dh - 2 * cd, cd];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (sws[j] <= 0 || shs[i] <= 0) continue;
      ctx.drawImage(img, sx[j], sy[i], sws[j], shs[i], dx + dxs[j], dy + dys[i], dws[j], dhs[j]);
    }
  }
}

function drawCgPlaceholder(ctx, label) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#07040a');
  g.addColorStop(0.55, '#35101c');
  g.addColorStop(1, '#050208');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.72, H * 0.28, 8, W * 0.72, H * 0.28, 250);
  glow.addColorStop(0, 'rgba(190, 30, 55, 0.35)');
  glow.addColorStop(1, 'rgba(190, 30, 55, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W * 0.5, H * 0.86);
  ctx.rotate(-0.22);
  ctx.fillStyle = 'rgba(240, 220, 215, 0.12)';
  ctx.beginPath(); ctx.ellipse(0, 0, 96, 27, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(78 + i * 9, -16 + i * 10, 30, 7, i * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = 'rgba(243, 220, 228, 0.55)';
  ctx.fillText(label || 'CG 待补', W / 2, H * 0.44);
}

function drawScreenCorners(ctx, alpha, size) {
  const imgs = [Assets.images.cornerTL, Assets.images.cornerTR, Assets.images.cornerBL, Assets.images.cornerBR];
  if (!imgs[0] || !imgs[1] || !imgs[2] || !imgs[3]) return;
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  const w = size || 150;
  const h = w * imgs[0].height / imgs[0].width;
  ctx.drawImage(imgs[0], 0, 0, w, h);
  ctx.drawImage(imgs[1], W - w, 0, w, h);
  ctx.drawImage(imgs[2], 0, H - h, w, h);
  ctx.drawImage(imgs[3], W - w, H - h, w, h);
  ctx.restore();
}
