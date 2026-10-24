const GV = 'assets/tiles/gothicvania/';

const ENEMY_SHEETS = {
  demonIdle: { src: GV + 'demon-Files/PNG/demon-idle.png', fw: 160, n: 6, faceLeft: true },
  demonAttack: { src: GV + 'demon-Files/PNG/demon-attack.png', fw: 240, n: 11, faceLeft: true },
  demonBreath: { src: GV + 'demon-Files/PNG/breath-fire.png', fw: 160, n: 5, faceLeft: true },
  skull: { src: GV + 'Fire-Skull-Files/PNG/fire-skull.png', fw: 96, n: 8, faceLeft: false },
  beastIdle: { src: GV + 'Hell-Beast-Files/PNG/without-stroke/hell-beast-idle.png', fw: 55, n: 6, faceLeft: true },
  beastBreath: { src: GV + 'Hell-Beast-Files/PNG/without-stroke/hell-beast-breath.png', fw: 64, n: 4, faceLeft: true },
  fireball: { src: GV + 'Hell-Beast-Files/PNG/fire-ball.png', fw: 19, n: 3, faceLeft: true },
  houndIdle: { src: GV + 'Hell-Hound-Files/PNG/hell-hound-idle.png', fw: 64, n: 6, faceLeft: true },
  houndRun: { src: GV + 'Hell-Hound-Files/PNG/hell-hound-run.png', fw: 67, n: 5, faceLeft: true },
  houndJump: { src: GV + 'Hell-Hound-Files/PNG/hell-hound-jump.png', fw: 65, n: 6, faceLeft: true },
};

const Sheets = {
  map: {},

  async load() {
    const list = {};
    for (const [k, s] of Object.entries(ENEMY_SHEETS)) list['sheet_' + k] = s.src;
    await Assets.load(list);
    for (const [k, s] of Object.entries(ENEMY_SHEETS)) {
      const img = Assets.images['sheet_' + k];
      if (img) this.map[k] = { ...s, img, fh: img.height, white: tint(img, '#ffffff') };
    }
  },

  draw(ctx, key, i, x, feetY, face, scale, flash) {
    const s = this.map[key];
    if (!s) return false;
    const f = ((i % s.n) + s.n) % s.n;
    const w = s.fw * scale, h = s.fh * scale;
    const flip = s.faceLeft ? -face : face;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(feetY));
    ctx.scale(flip, 1);
    ctx.drawImage(flash ? s.white : s.img, f * s.fw, 0, s.fw, s.fh, -w / 2, -h, w, h);
    ctx.restore();
    return true;
  },
};

class Enemy {
  constructor() {
    this.dead = false;
    this.flashT = 0;
    this.face = -1;
    this.t = rand(0, 10);
  }

  get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  hit(dmg, dir) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.flashT = 0.1;
    this.onHit(dir);
    FX.text(this.cx, this.y - 6, String(dmg), dmg >= 30 ? '#ffd166' : '#ffffff', dmg >= 30 ? 22 : 16);
    FX.blood(this.cx, this.cy, 6, 0.8);
    if (this.hp <= 0) {
      this.dead = true;
      FX.blood(this.cx, this.cy, 18, 1.3);
      FX.shake(4, 0.12);
      AudioSys.sfxPlay('kill', { volume: this.summoned ? 0.5 : 0.8 });
      if (this.summoned && typeof Collect !== 'undefined' && Game.phase === 'boss') {
        Collect.dropBossItem(this.cx, GROUND_Y - 26);
      }
      if (!this.summoned) {
        Game.stats.kills++;
        Game.runStats.kills++;
      }
      if (typeof Collect !== 'undefined') Collect.onEnemyKilled(this);
    }
    return true;
  }

  onHit() {}
  onParried() {}

  drawHp(ctx) {
    if (this.hp >= this.maxHp || this.dead) return;
    const bw = Math.max(36, this.w);
    ctx.fillStyle = '#000';
    ctx.fillRect(this.cx - bw / 2 - 1, this.y - 14, bw + 2, 6);
    ctx.fillStyle = '#c4123a';
    ctx.fillRect(this.cx - bw / 2, this.y - 13, bw * Math.max(0, this.hp) / this.maxHp, 4);
  }
}

class FireSkull extends Enemy {
  constructor(x, y, range) {
    super();
    this.w = 34; this.h = 34;
    this.homeX = x; this.homeY = y;
    this.range = range || 120;
    this.x = x - this.w / 2; this.y = y - this.h / 2;
    this.maxHp = this.hp = 20;
    this.dir = 1;
    this.contactDmg = 12;
    this.parryable = true;
    this.knockT = 0; this.kvx = 0;
  }

  update(dt, game) {
    if (this.dead) return;
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    const p = game.player;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    if (this.knockT > 0) {
      this.knockT -= dt;
      this.x += this.kvx * dt;
      this.kvx *= 0.9;
    } else if (Math.abs(dx) < 240 && Math.abs(dy) < 140 && !p.dead) {
      this.face = Math.sign(dx) || 1;
      this.x += clamp(dx, -1, 1) * 85 * dt;
      this.y += clamp(dy, -1, 1) * 50 * dt;
    } else {
      this.x += this.dir * 55 * dt;
      if (this.cx > this.homeX + this.range) this.dir = -1;
      if (this.cx < this.homeX - this.range) this.dir = 1;
      this.face = this.dir;
      this.y += ((this.homeY - this.h / 2 + Math.sin(this.t * 2.5) * 10) - this.y) * Math.min(1, dt * 3);
    }
    this.x = clamp(this.x, this.homeX - this.range - 120, this.homeX + this.range + 120);
  }

  onHit(dir) { this.knockT = 0.15; this.kvx = dir * 320; }
  onParried(dir) { this.hit(10, dir); this.knockT = 0.4; this.kvx = dir * 500; }

  draw(ctx) {
    if (this.dead) return;
    const ok = Sheets.draw(ctx, 'skull', Math.floor(this.t * 10), this.cx, this.cy + 34, this.face, 0.62, this.flashT > 0);
    if (!ok) {
      ctx.fillStyle = '#ff6a00';
      ctx.beginPath(); ctx.arc(this.cx, this.cy, 16, 0, Math.PI * 2); ctx.fill();
    }
    this.drawHp(ctx);
  }
}

class HellBeast extends Enemy {
  constructor(x, groundY) {
    super();
    this.w = 46; this.h = 82;
    this.x = x - this.w / 2; this.y = groundY - this.h;
    this.maxHp = this.hp = 30;
    this.state = 'idle';
    this.stateT = 0;
    this.cool = rand(0.6, 1.4);
    this.contactDmg = 10;
    this.parryable = false;
    this.drainBled = false;
  }

  drainArrived(p) {
    if (this.drainBled || this.dead || !p || p.dead || typeof p.bleed !== 'function') return;
    this.drainBled = true;
    p.bleed(3);
  }

  update(dt, game) {
    if (this.dead) return;
    this.t += dt;
    this.stateT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    const p = game.player;
    const dx = p.cx - this.cx;
    const near = Math.abs(dx) < 560 && Math.abs(p.cy - this.cy) < 200 && !p.dead;
    if (this.state !== 'fire') this.face = Math.sign(dx) || this.face;
    this.cool -= dt;

    if (this.state === 'idle' && near && this.cool <= 0) {
      this.state = 'windup';
      this.stateT = 0;
      this.drainBled = false;
    }
    else if (this.state === 'windup') {
      if (Math.random() < 0.5) FX.drain(this.cx + this.face * rand(30, 60), this.y + rand(10, 40), 1, () => this.drainArrived(p));
      if (this.stateT > 0.65) {
        this.state = 'fire'; this.stateT = 0;
        game.projectiles.push(new Fireball(this.cx + this.face * 30, this.y + this.h * 0.32, this.face * 260));
        AudioSys.sfxPlay('fire');
      }
    } else if (this.state === 'fire' && this.stateT > 0.35) {
      this.state = 'idle'; this.stateT = 0; this.cool = rand(1.6, 2.4);
    }
  }

  draw(ctx) {
    if (this.dead) return;
    const flash = this.flashT > 0;
    let ok;
    if (this.state === 'windup') ok = Sheets.draw(ctx, 'beastBreath', this.stateT < 0.3 ? 0 : 1, this.cx, this.y + this.h, this.face, ART_SCALE, flash);
    else if (this.state === 'fire') ok = Sheets.draw(ctx, 'beastBreath', this.stateT < 0.15 ? 2 : 3, this.cx, this.y + this.h, this.face, ART_SCALE, flash);
    else ok = Sheets.draw(ctx, 'beastIdle', Math.floor(this.t * 8), this.cx, this.y + this.h, this.face, ART_SCALE, flash);
    if (!ok) { ctx.fillStyle = '#7a1a2a'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.state === 'windup') {
      const a = 0.25 + 0.25 * Math.sin(this.stateT * 30);
      ctx.fillStyle = `rgba(255, 120, 40, ${a})`;
      ctx.beginPath(); ctx.arc(this.cx + this.face * 26, this.y + this.h * 0.32, 10 + this.stateT * 14, 0, Math.PI * 2); ctx.fill();
    }
    this.drawHp(ctx);
  }
}

class HellHound extends Enemy {
  constructor(x, groundY, range) {
    super();
    this.w = 72; this.h = 42;
    this.homeX = x;
    this.range = range || 200;
    this.x = x - this.w / 2; this.y = groundY - this.h;
    this.maxHp = this.hp = 80;
    this.state = 'patrol';
    this.stateT = 0;
    this.dir = -1;
    this.vx = 0;
    this.contactDmg = 8;
    this.parryable = false;
  }

  update(dt, game) {
    if (this.dead) return;
    this.t += dt;
    this.stateT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    const p = game.player;
    const dx = p.cx - this.cx;
    const sees = Math.abs(dx) < 380 && Math.abs(p.cy - this.cy) < 120 && !p.dead;
    const go = (s) => { this.state = s; this.stateT = 0; };

    if (this.state === 'patrol') {
      this.vx = this.dir * 70;
      this.face = this.dir;
      if (this.cx > this.homeX + this.range) this.dir = -1;
      if (this.cx < this.homeX - this.range) this.dir = 1;
      if (sees) { go('alert'); this.face = Math.sign(dx) || 1; AudioSys.sfxPlay('roar', { volume: 0.16, rate: 1.35 }); }
    } else if (this.state === 'alert') {
      this.vx = 0;
      if (this.stateT > 0.6) { go('charge'); this.chargeDir = this.face; }
    } else if (this.state === 'charge') {
      this.vx = this.chargeDir * 520;
      this.face = this.chargeDir;
      if (Math.random() < 0.6) FX.dust(this.cx - this.face * 30, this.y + this.h - 2, 1, -this.face);
      if (this.stateT > 1.0) go('recover');
    } else if (this.state === 'recover') {
      this.vx = approach(this.vx, 0, 1600 * dt);
      if (this.stateT > 0.8) go(sees ? 'alert' : 'patrol');
    } else if (this.state === 'stun') {
      this.vx = approach(this.vx, 0, 1200 * dt);
      if (Math.random() < dt * 6) FX.text(this.cx + rand(-14, 14), this.y - 4, '★', '#ffd166', 14);
      if (this.stateT > 1.6) go('patrol');
    }

    const lo = this.homeX - this.range - 180, hi = this.homeX + this.range + 180;
    // Small swept steps prevent fast charges skipping treads or crossing a gap.
    const distance = this.vx * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(distance) / 8));
    for (let i = 0; i < steps; i++) {
      const nx = this.x + distance / steps;
      const lead = nx + (this.vx > 0 ? this.w - 0.01 : 0);
      const front = groundAt(game.level, lead);
      const supports = game.level.solids.filter((s) => !s.boundary && nx + this.w > s.x && nx < s.x + s.w);
      const ground = front === null ? null : Math.min(...supports.map((s) => s.y));
      const footY = this.y + this.h;
      if (ground === null || Math.abs(ground - footY) > 16.5 || lead < lo || lead > hi) {
        this.vx = 0;
        this.dir = -this.dir;
        if (this.state === 'charge') go('recover');
        break;
      }
      this.x = nx;
      this.y = ground - this.h;
    }
    this.contactDmg = this.state === 'charge' ? 20 : 8;
    this.parryable = this.state === 'charge';
  }

  onParried(dir) {
    this.state = 'stun'; this.stateT = 0;
    this.vx = dir * 260;
    this.hit(15, dir);
  }

  draw(ctx) {
    if (this.dead) return;
    const flash = this.flashT > 0;
    const feet = this.y + this.h;
    let ok;
    if (this.state === 'charge') ok = Sheets.draw(ctx, 'houndRun', Math.floor(this.t * 16), this.cx, feet, this.face, ART_SCALE, flash);
    else if (this.state === 'patrol') ok = Sheets.draw(ctx, 'houndRun', Math.floor(this.t * 8), this.cx, feet, this.face, ART_SCALE, flash);
    else if (this.state === 'alert') ok = Sheets.draw(ctx, 'houndJump', 0, this.cx, feet, this.face, ART_SCALE, flash);
    else ok = Sheets.draw(ctx, 'houndIdle', Math.floor(this.t * 8), this.cx, feet, this.face, ART_SCALE, flash);
    if (!ok) { ctx.fillStyle = '#3a1020'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.state === 'alert') {
      ctx.fillStyle = '#ff2d55';
      ctx.font = `bold 22px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', this.cx, this.y - 18);
    }
    this.drawHp(ctx);
  }
}

class Fireball {
  constructor(x, y, vx) {
    this.x = x; this.y = y; this.vx = vx;
    this.r = 9;
    this.t = 0;
    this.life = 4;
    this.reflected = false;
    this.dead = false;
    this.contactDmg = 15;
    this.parryable = true;
  }

  get box() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }

  update(dt, game) {
    if (this.dead) return;
    this.t += dt;
    this.x += this.vx * dt;
    if (this.t > this.life) { this.dead = true; return; }
    for (const s of game.level.solids) if (overlap(this.box, s)) { this.pop(); return; }
    if (this.reflected) {
      for (const e of [...game.enemies, ...(game.boss ? [game.boss] : [])]) {
        if (!e.dead && overlap(this.box, e.box) && e.hit(30, Math.sign(this.vx))) { this.pop(); break; }
      }
    }
  }

  onParried(dir) {
    this.reflected = true;
    this.vx = dir * Math.abs(this.vx) * 1.8;
    this.t = 0;
  }

  pop() {
    if (this.dead) return;
    this.dead = true;
    FX.ring(this.x, this.y, 22, '#ff8a3a', 0.25);
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.reflected ? 'rgba(255, 60, 90, 0.35)' : 'rgba(255, 130, 40, 0.3)';
    ctx.beginPath(); ctx.arc(this.x, this.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const ok = Sheets.draw(ctx, 'fireball', Math.floor(this.t * 12), this.x, this.y + 12, Math.sign(this.vx) || 1, ART_SCALE, this.reflected);
    if (!ok) { ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill(); }
  }
}

function spawnEnemies(level) {
  return level.spawns.map((s) => {
    let e;
    if (s.type === 'skull') e = new FireSkull(s.x, s.y, s.range);
    else if (s.type === 'beast') e = new HellBeast(s.x, groundAt(level, s.x, 0));
    else e = new HellHound(s.x, groundAt(level, s.x, 0), s.range);
    e.drop = s.drop || null;
    return e;
  });
}
