// D4: one encounter, same health pool through both forms.
const BOSS_MARGIN = 70;

class AbyssLord extends Enemy {
  constructor(sprite) {
    super();
    this.sprite = sprite;
    this.w = 54; this.h = 100;
    this.x = 660; this.y = GROUND_Y - this.h;
    this.maxHp = this.hp = 500;
    this.phase = 1; this.transforms = 0;
    this.state = 'idle'; this.stateT = 0;
    this.cool = 1.2; this.summonT = 8;
    this.contactDmg = 10; this.parryable = true;
    this.moving = false; this.dustT = 0;
    this.recoverCast = false;
    this.pendingSummons = [];
    this.dying = false; this.deathT = 0; this.deathMax = 2.2; this.deathFxT = 0;
  }

  get vulnerable() { return !this.dead && !this.dying && this.state !== 'transform' && (this.phase === 1 || this.state === 'recover'); }
  get clawBox() { return { x: this.face > 0 ? this.cx : this.cx - 120, y: GROUND_Y - 105, w: 120, h: 105 }; }
  go(state) { this.state = state; this.stateT = 0; }

  hit(dmg, opts = {}) {
    if (this.dead || this.dying) return false;
    const direct = !!opts.direct;
    if (!direct && !this.vulnerable) return false;
    if (direct && this.state === 'transform') dmg = Math.min(dmg, Math.max(0, this.hp - 1));
    if (dmg <= 0) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.flashT = 0.08;
    FX.text(this.cx, this.y - 12, String(dmg), '#ffd166', 18);
    if (this.phase === 1 && this.hp <= 250) {
      this.phase = 2; this.transforms++;
      this.go('transform');
      this.summonT = 12;
      this.pendingSummons = [];
      this.contactDmg = 12;
      Game.projectiles = [];
      for (const e of Game.enemies) e.dead = true;
      FX.ring(this.cx, this.cy, 130, '#8b739e', 0.9);
      FX.shake(14, 0.9);
      FX.flash('#5a0a18', 0.32);
      FX.freeze(0.08);
      AudioSys.sfxPlay('roar');
    } else if (this.hp === 0) {
      Game.stats.kills++;
      Game.runStats.kills++;
      if (Game.testing) {
        this.dead = true;
        AudioSys.sfxPlay('boss_die');
        Game.finish();
      } else {
        this.startDying();
      }
    }
    return true;
  }

  startDying() {
    this.dying = true;
    this.deathT = 0;
    this.state = 'dying';
    this.stateT = 0;
    this.contactDmg = 0;
    this.pendingSummons = [];
    Game.projectiles = [];
    for (const e of Game.enemies) e.dead = true;
    AudioSys.sfxPlay('boss_die');
    AudioSys.playBgm('ending');
    FX.ring(this.cx, this.cy, 170, '#ff2d55', 0.85);
    FX.blood(this.cx, this.cy, 30, 1.5);
    FX.shake(16, 1.0);
    FX.flash('#5a0a18', 0.3);
    for (let i = 0; i < 16; i++) {
      FX.bat(this.cx + rand(-40, 40), this.cy + rand(-50, 30), rand(-220, 220), 0.9);
    }
  }

  hitDirect(dmg) {
    return this.hit(dmg, { direct: true });
  }

  onParried() {
    if (this.phase !== 1 || this.state !== 'claw') return;
    this.hit(15);
    if (this.state !== 'transform' && !this.dead) this.go('recover');
  }

  clampX() { this.x = clamp(this.x, BOSS_MARGIN, 960 - BOSS_MARGIN - this.w); }

  chase(dt, game, speed, stop) {
    const dx = game.player.cx - this.cx;
    if (Math.abs(dx) < 1) return;
    this.face = Math.sign(dx);
    const gap = Math.abs(dx);
    if (gap > stop) {
      this.x += Math.sign(dx) * speed * dt;
      this.moving = true;
    } else if (gap < stop - 38) {
      this.x -= Math.sign(dx) * speed * 0.5 * dt;
      this.moving = true;
    }
    this.clampX();
    if (this.moving && this.phase === 1) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        FX.dust(this.cx - this.face * 18, GROUND_Y - 2, 1, -this.face);
        this.dustT = 0.18;
      }
    }
  }

  summonWave(n, game) {
    const offsets = n > 2 ? [-190, 0, 190] : [-160, 160];
    const xs = [];
    for (let i = 0; i < n; i++) {
      xs.push(clamp(game.player.cx + offsets[i % offsets.length], 190, 770));
    }
    AudioSys.sfxPlay('summon');
    this.queueSummons(xs);
  }

  queueSummons(xs) {
    for (const x of xs) {
      this.pendingSummons.push({ x, t: 0.7 });
      FX.summon(x, GROUND_Y - 30);
    }
  }

  update(dt, game) {
    if (this.dead) return;
    if (this.dying) {
      this.deathT += dt;
      this.deathFxT -= dt;
      if (this.deathFxT <= 0) {
        this.deathFxT = 0.075;
        FX.bat(this.cx + rand(-45, 45), this.cy + rand(-55, 30), rand(-200, 200), 0.8);
        if (Math.random() < 0.45) FX.blood(this.cx + rand(-20, 20), this.cy + rand(-25, 25), 2, 0.7);
      }
      if (this.deathT >= this.deathMax) {
        this.dying = false;
        this.dead = true;
        Game.finish();
      }
      return;
    }
    this.t += dt; this.stateT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.moving = false;
    this.summonT -= dt;

    for (const s of this.pendingSummons) s.t -= dt;
    const ready = this.pendingSummons.filter((s) => s.t <= 0);
    this.pendingSummons = this.pendingSummons.filter((s) => s.t > 0);
    for (const s of ready) {
      const skull = new FireSkull(s.x, GROUND_Y - 55, 55);
      skull.summoned = true;
      game.enemies.push(skull);
      FX.ring(s.x, GROUND_Y - 30, 36, '#ff5577', 0.4);
      FX.shake(3, 0.12);
    }

    if (this.state === 'transform') {
      if (this.stateT >= 1.4) {
        this.h = 116; this.y = GROUND_Y - this.h;
        FX.shake(10, 0.6);
        FX.ring(this.cx, this.cy, 150, '#a33b6a', 0.7);
        this.go('recover');
        if (Game.testing) this.summonWave(2, game);
        else Game.showBossTransformDialogue(() => this.summonWave(2, Game));
      }
      return;
    }

    if (this.phase === 1) {
      if (this.summonT <= 0 && game.enemies.filter((e) => !e.dead).length < 2) {
        const x = clamp(this.cx + (game.player.cx < this.cx ? -130 : 130), 190, 770);
        AudioSys.sfxPlay('summon');
        this.queueSummons([x]);
        this.summonT = 10;
      }
      if (this.state === 'idle') {
        this.chase(dt, game, 120, 118);
        this.cool -= dt;
        if (this.cool <= 0) {
          const gap = Math.abs(game.player.cx - this.cx);
          if (gap < 145) this.go('clawWindup');
          else if (gap > 320) this.go('castWindup');
        }
      } else if (this.state === 'clawWindup' && this.stateT >= 0.65) {
        this.go('claw');
        AudioSys.sfxPlay('swing', { rate: 0.82, volume: 0.95 });
        FX.claw(this.cx + this.face * 25, this.cy, this.face, true);
        if (overlap(game.player, this.clawBox)) game.player.takeDamage(22, this);
      } else if (this.state === 'castWindup' && this.stateT >= 0.85) {
        game.projectiles.push(new Fireball(this.cx + this.face * 40, GROUND_Y - 42, this.face * 280));
        AudioSys.sfxPlay('fire', { rate: 0.85 });
        FX.ring(this.cx + this.face * 40, GROUND_Y - 42, 24, '#ff5577', 0.25);
        this.go('cast');
      } else if ((this.state === 'claw' || this.state === 'cast') && this.stateT >= 0.3) {
        this.recoverCast = this.state === 'cast';
        this.go('recover');
      } else if (this.state === 'recover' && this.stateT >= 1.8) { this.go('idle'); this.cool = 0.5; }
    } else {
      if (this.summonT <= 0 && game.enemies.filter((e) => !e.dead).length < 3) {
        this.summonWave(2, game);
        this.summonT = 12;
      }
      if (this.state === 'recover') {
        if (this.stateT >= 1) this.chase(dt, game, 72, 92);
        if (this.stateT >= 4) this.go('rise');
      } else if (this.state === 'rise') {
        this.y = approach(this.y, GROUND_Y - this.h - 115, dt * 230);
        this.chase(dt, game, 160, 0);
        if (this.stateT >= 0.5) {
          this.face = Math.sign(game.player.cx - this.cx) || this.face;
          this.fireX = clamp(game.player.cx, 95, 865);
          this.go('fireWindup');
        }
      } else if (this.state === 'fireWindup' && this.stateT >= 1.1) {
        game.projectiles.push(new BossFlame(this.fireX));
        AudioSys.sfxPlay('fire', { rate: 0.7, volume: 0.85 });
        FX.ring(this.fireX, GROUND_Y - 16, 78, '#ff8a3a', 0.4);
        FX.shake(6, 0.22);
        this.go('fire');
      } else if (this.state === 'fire' && this.stateT >= 0.75) this.go('land');
      else if (this.state === 'land') {
        this.y = approach(this.y, GROUND_Y - this.h, dt * 230);
        if (this.stateT >= 0.5) {
          this.y = GROUND_Y - this.h;
          FX.dust(this.cx, GROUND_Y - 2, 8, 0);
          FX.shake(7, 0.28);
          this.go('recover');
        }
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;
    const dying = this.dying;
    if (dying) {
      const k = clamp(this.deathT / this.deathMax, 0, 1);
      const amp = (1 - k) * 7;
      const feet = this.y + this.h;
      const scale = 1 + k * 0.1;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(rand(-amp, amp), rand(-amp, amp));
      ctx.translate(this.cx, feet);
      ctx.scale(scale, scale);
      ctx.translate(-this.cx, -feet);
    }
    if (this.state === 'clawWindup') {
      const a = 0.34 + 0.24 * (0.5 + 0.5 * Math.sin(this.stateT * 20));
      ctx.save();
      ctx.translate(this.cx, this.cy);
      ctx.scale(this.face, 1);
      ctx.strokeStyle = `rgba(255,96,136,${a})`;
      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-12, -34 + i * 26);
        ctx.quadraticCurveTo(40, -18 + i * 26, 82, 10 + i * 26);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (this.state === 'fireWindup' || this.state === 'fire') {
      const pulse = 0.5 + 0.5 * Math.sin(this.stateT * 18);
      const r = 96 + pulse * 12;
      ctx.save();
      ctx.translate(this.fireX, GROUND_Y - 2);
      ctx.scale(1, 0.28);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      glow.addColorStop(0, 'rgba(255,130,60,0.5)');
      glow.addColorStop(0.62, 'rgba(255,92,36,0.18)');
      glow.addColorStop(1, 'rgba(255,92,36,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45 + 0.25 * pulse;
      ctx.strokeStyle = '#ffc078'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 84 + pulse * 10, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    let castLift = 0;
    if (this.phase === 1) {
      if (this.state === 'castWindup') castLift = -Math.min(10, this.stateT * 16);
      else if (this.state === 'cast') castLift = -Math.max(0, 10 - this.stateT * 30);
    }
    if (this.phase === 2 && this.state !== 'transform') {
      let i = Math.floor(this.t * 10);
      let charge = 0;
      if (this.state === 'fireWindup') {
        charge = clamp(this.stateT / 1.1, 0, 1);
        // 前 0.62 秒快速吸气（0→5 帧），之后低身蓄力，避免长时间定格
        i = this.stateT < 0.62 ? Math.floor(this.stateT / 0.62 * 6) : 5;
      } else if (this.state === 'fire') {
        charge = 1;
        i = this.stateT < 0.45 ? 6 + Math.floor(this.stateT / 0.45 * 5) : 10;
      }
      const attack = this.state === 'fireWindup' || this.state === 'fire';
      const hover = Math.sin(this.t * 3) * 3;
      const lunge = this.state === 'fire' ? 6 : charge * 3;
      Sheets.draw(ctx, attack ? 'demonAttack' : 'demonIdle', i, this.cx + this.face * lunge, this.y + this.h + 14 + hover, this.face, 1.15, false);
      if (charge > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 6; j++) {
          const a = this.stateT * 3 + j * 1.047;
          const rr = 46 - charge * 20;
          const ex = this.cx + Math.cos(a) * rr;
          const ey = this.y + this.h * 0.55 + Math.sin(a) * rr * 0.5;
          ctx.fillStyle = `rgba(96,214,255,${0.22 + 0.5 * charge})`;
          ctx.beginPath();
          ctx.arc(ex, ey, 1.8 + charge * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    } else {
      let name = 'idle', i = 0;
      if (this.state === 'transform') name = 'transform';
      else if (this.state.startsWith('claw')) { name = 'attack'; i = this.state === 'clawWindup' ? 0 : 1; }
      else if (this.state.startsWith('cast')) {
        name = this.sprite.cast ? 'cast' : 'attack';
        i = this.state === 'castWindup' ? 0 : 1;
      }
      else if (this.state === 'recover') {
        name = this.recoverCast && this.sprite.cast ? 'cast' : 'attack';
        i = 2;
      }
      if (this.flashT > 0 && this.state !== 'transform') name = 'hurt';
      const frames = this.sprite[name] || this.sprite.idle;
      const sp = frames[Math.min(i, frames.length - 1)];
      // Normalize submitted images to same foot/head envelope, without runtime reads.
      const h = 112, w = sp.w / sp.h * h;
      const bob = this.moving && this.phase === 1 ? Math.sin(this.t * 16) * 2 : 0;
      ctx.save(); ctx.translate(Math.round(this.cx), GROUND_Y + bob + castLift); ctx.scale(this.face, 1);
      ctx.drawImage(sp.img, -w * 0.55, -h, w, h); ctx.restore();
    }
    if (this.phase === 1 && this.state === 'castWindup') {
      const a = 0.55 + 0.3 * Math.sin(this.stateT * 18);
      const r = 5 + this.stateT * 8;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ff5577';
      ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(this.cx + this.face * 34, this.cy - 6 + castLift, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 5; j++) {
        const ang = this.stateT * 6 + j * 1.257;
        const rr = 26 - Math.min(14, this.stateT * 10);
        ctx.fillStyle = 'rgba(255,128,158,0.75)';
        ctx.beginPath();
        ctx.arc(this.cx + this.face * 34 + Math.cos(ang) * rr, this.cy - 6 + castLift + Math.sin(ang) * rr * 0.7, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (dying) ctx.restore();
  }
}

class BossFlame {
  constructor(x) {
    this.x = x; this.y = GROUND_Y - 55; this.t = 0; this.dead = false;
    this.life = 0.7;
    this.contactDmg = 26; this.parryable = false; this.unblockable = true;
  }
  get box() { return { x: this.x - 85, y: GROUND_Y - 90, w: 170, h: 90 }; }
  update(dt) { this.t += dt; if (this.t >= this.life) this.dead = true; }
  pop() { this.dead = true; }
  draw(ctx) {
    if (this.dead) return;
    const k = clamp(this.t / this.life, 0, 1);
    const alpha = k < 0.82 ? 1 : 1 - (k - 0.82) / 0.18;
    const scale = 1.02 + Math.sin(k * Math.PI) * 0.12;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(this.x, GROUND_Y - 2);
    ctx.scale(1, 0.22);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
    glow.addColorStop(0, 'rgba(255,140,60,0.55)');
    glow.addColorStop(0.6, 'rgba(255,100,40,0.2)');
    glow.addColorStop(1, 'rgba(255,100,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    Sheets.draw(ctx, 'demonBreath', Math.floor(k * 10) % 5, this.x, GROUND_Y, 1, scale, false);
    ctx.restore();
  }
}
