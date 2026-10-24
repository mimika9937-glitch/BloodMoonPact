const FX = {
  list: [],
  shakeT: 0,
  shakePow: 0,
  hitstop: 0,

  reset() { this.list = []; this.shakeT = 0; this.shakePow = 0; this.hitstop = 0; },

  shake(pow, time) {
    this.shakePow = Math.max(this.shakePow, pow);
    this.shakeT = Math.max(this.shakeT, time);
  },

  freeze(t) { this.hitstop = Math.max(this.hitstop, t); },

  add(e) { this.list.push(e); return e; },

  update(dt, player) {
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakePow = 0; }
    for (const e of this.list) {
      e.t += dt;
      if (e.update) e.update(e, dt, player);
    }
    this.list = this.list.filter((e) => e.t < e.life && !e.dead);
  },

  offset() {
    if (this.shakeT <= 0) return [0, 0];
    return [rand(-1, 1) * this.shakePow, rand(-1, 1) * this.shakePow];
  },

  draw(ctx, layer) {
    for (const e of this.list) if ((e.layer || 'world') === layer) e.draw(ctx, e);
  },

  dust(x, y, n, dir) {
    for (let i = 0; i < n; i++) {
      this.add({
        t: 0, life: rand(0.25, 0.5), x, y,
        vx: rand(-60, 60) + (dir || 0) * 40, vy: rand(-60, -10), s: rand(2, 4),
        update: (e, dt) => { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.9; },
        draw: (ctx, e) => {
          ctx.globalAlpha = 1 - e.t / e.life;
          ctx.fillStyle = '#6b5b6e';
          ctx.fillRect(e.x, e.y, e.s, e.s);
          ctx.globalAlpha = 1;
        },
      });
    }
  },

  blood(x, y, n, power) {
    const p = power || 1;
    for (let i = 0; i < n; i++) {
      this.add({
        t: 0, life: rand(0.35, 0.7), x, y,
        vx: rand(-180, 180) * p, vy: rand(-260, -40) * p, s: rand(2, 5),
        update: (e, dt) => { e.vy += 900 * dt; e.x += e.vx * dt; e.y += e.vy * dt; },
        draw: (ctx, e) => {
          ctx.globalAlpha = 1 - e.t / e.life;
          ctx.fillStyle = i % 3 ? '#c4123a' : '#ff4466';
          ctx.fillRect(e.x, e.y, e.s, e.s);
          ctx.globalAlpha = 1;
        },
      });
    }
  },

  drain(x, y, n, onArrive) {
    let arrived = false;
    for (let i = 0; i < n; i++) {
      this.add({
        t: 0, life: 2, x, y,
        vx: rand(-200, 200), vy: rand(-260, -80), delay: i * 0.03,
        update: (e, dt, pl) => {
          if (!pl) return;
          const tx = pl.x + pl.w / 2, ty = pl.y + pl.h * 0.45;
          const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
          const pull = e.t > 0.12 + e.delay ? 2600 : 0;
          e.vx += (dx / d) * pull * dt; e.vy += (dy / d) * pull * dt;
          e.vx *= 0.92; e.vy *= 0.92;
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.t > 0.15 && d < 14) {
            e.dead = true;
            if (!arrived) { arrived = true; if (onArrive) onArrive(); }
          }
        },
        draw: (ctx, e) => {
          ctx.fillStyle = '#ff2d55';
          ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 8;
          ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
          ctx.shadowBlur = 0;
        },
      });
    }
  },

  text(x, y, str, color, size) {
    this.add({
      t: 0, life: 0.8, x, y, layer: 'world',
      draw: (ctx, e) => {
        const k = e.t / e.life;
        ctx.globalAlpha = 1 - k * k;
        ctx.font = `bold ${size || 16}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = '#000';
        const yy = e.y - easeOut(k) * 30;
        ctx.strokeText(str, e.x, yy);
        ctx.fillStyle = color;
        ctx.fillText(str, e.x, yy);
        ctx.globalAlpha = 1;
      },
    });
  },

  claw(x, y, dir, big) {
    const len = big ? 74 : 56;
    this.add({
      t: 0, life: 0.18, x, y,
      draw: (ctx, e) => {
        const k = e.t / e.life;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(dir, 1);
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = big ? '#ff5577' : '#ff2d55';
        ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.lineWidth = (big ? 5 : 3.5) * (1 - k * 0.6);
          ctx.beginPath();
          const sweep = easeOut(k * 2);
          ctx.moveTo(-6, -len * 0.45 + i * 12);
          ctx.quadraticCurveTo(len * 0.6, -len * 0.1 + i * 12, len * sweep, len * 0.35 + i * 12);
          ctx.stroke();
        }
        ctx.restore();
      },
    });
  },

  ring(x, y, maxR, color, life) {
    return this.add({
      t: 0, life: life || 0.45, x, y,
      draw: (ctx, e) => {
        const k = easeOut(e.t / e.life);
        ctx.globalAlpha = 1 - e.t / e.life;
        ctx.strokeStyle = color;
        ctx.shadowColor = color; ctx.shadowBlur = 20;
        ctx.lineWidth = 10 * (1 - k) + 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, maxR * k, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = color;
        ctx.globalAlpha *= 0.15;
        ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      },
    });
  },

  bat(x, y, vx, life) {
    this.add({
      t: 0, life: life || 0.5, x, y, vx, vy: rand(-40, 40), ph: rand(0, 6),
      update: (e, dt) => { e.x += e.vx * dt; e.y += e.vy * dt + Math.sin(e.t * 20 + e.ph) * 1.5; },
      draw: (ctx, e) => drawBat(ctx, e.x, e.y, Math.sign(e.vx) || 1, e.t * 30 + e.ph, 1 - e.t / e.life),
    });
  },

  ghost(sp, x, y, flip) {
    this.add({
      t: 0, life: 0.25, x, y,
      draw: (ctx, e) => {
        ctx.globalAlpha = 0.45 * (1 - e.t / e.life);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(flip, 1);
        ctx.drawImage(sp.red, frameLeft(sp), -sp.h, sp.w, sp.h);
        ctx.restore();
        ctx.globalAlpha = 1;
      },
    });
  },

  flash(color, life) {
    this.add({
      t: 0, life: life || 0.15, layer: 'screen',
      draw: (ctx, e) => {
        ctx.globalAlpha = 0.6 * (1 - e.t / e.life);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      },
    });
  },

  summon(x, y) {
    this.add({
      t: 0, life: 0.7, x, y,
      draw: (ctx, e) => {
        const k = e.t / e.life;
        const r = 16 + easeOut(k) * 48;
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.strokeStyle = '#b4456b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,60,100,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 0.62, r * 0.21, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2 + k * 1.6;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(a) * r * 0.3, e.y + Math.sin(a) * r * 0.1);
          ctx.lineTo(e.x + Math.cos(a) * r * 0.82, e.y + Math.sin(a) * r * 0.28);
          ctx.stroke();
        }
        ctx.restore();
      },
    });
    for (let i = 0; i < 12; i++) {
      this.add({
        t: 0, life: rand(0.35, 0.75), x: x + rand(-26, 26), y: y + rand(-6, 8),
        vy: rand(-180, -70), vx: rand(-25, 25), s: rand(2, 4),
        update: (e, dt) => { e.x += e.vx * dt; e.y += e.vy * dt; e.vy *= 0.98; },
        draw: (ctx, e) => {
          ctx.globalAlpha = 1 - e.t / e.life;
          ctx.fillStyle = i % 3 ? '#c4123a' : '#ff6a9a';
          ctx.fillRect(e.x, e.y, e.s, e.s);
          ctx.globalAlpha = 1;
        },
      });
    }
  },
};

function drawBat(ctx, x, y, dir, phase, alpha) {
  const flap = Math.sin(phase);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1a0610';
  ctx.strokeStyle = '#c4123a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-10, -6 * flap - 2);
  ctx.lineTo(-6, 1);
  ctx.lineTo(-12, 3 - 4 * flap);
  ctx.lineTo(0, 3);
  ctx.lineTo(12, 3 - 4 * flap);
  ctx.lineTo(6, 1);
  ctx.lineTo(10, -6 * flap - 2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff2d55';
  ctx.fillRect(1, -1, 2, 2);
  ctx.restore();
  ctx.globalAlpha = 1;
}
