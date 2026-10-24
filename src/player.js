const PLAYER = {
  RUN: 300,
  ACC_GROUND: 3200,
  ACC_AIR: 2200,
  FRICTION: 2800,
  GRAVITY: 2300,
  JUMP: 780,
  DOUBLE_JUMP: 700,
  MAX_FALL: 950,
  COYOTE: 0.1,
  JUMP_BUFFER: 0.13,
  MAX_HP: 100,
  MAX_SHIELD: 60,
  LIFESTEAL: 4,
};

const COMBO = [
  { dmg: 10, dur: 0.26, hitAt: 0.06, reach: 70, lunge: 160 },
  { dmg: 10, dur: 0.26, hitAt: 0.06, reach: 70, lunge: 160 },
  { dmg: 20, dur: 0.38, hitAt: 0.1, reach: 88, lunge: 280 },
];
const COMBO_WINDOW = 0.35;

const RUN_CYCLE = Array.from({ length: 16 }, (_, i) => ({ index: i, duration: 0.02 }));
const RUN_PERIOD = RUN_CYCLE.reduce((sum, f) => sum + f.duration, 0);

const SKILLS = {
  K: { name: '蝙蝠冲刺', cost: 6, cd: 0.5, dur: 0.18, speed: 950 },
  L: { name: '血之爆发', cost: 16, cd: 1.0, dmg: 40, radius: 150, windup: 0.22 },
  I: { name: '血月降临', cost: 28, cd: 45, dmg: 80, dur: 1.6, hitAt: 1.0 },
};

class Player {
  constructor(x, sprite) {
    this.sprite = sprite;
    this.w = 30;
    this.h = 76;
    this.x = x;
    this.y = GROUND_Y - this.h;
    this.vx = 0;
    this.vy = 0;
    this.face = 1;
    this.hp = PLAYER.MAX_HP;
    this.hpShown = this.hp;
    this.shield = 0;
    this.onGround = false;
    this.onOneway = false;
    this.dropT = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.airJumps = 1;
    this.airDash = true;
    this.state = 'idle';
    this.stateT = 0;
    this.combo = 0;
    this.comboT = 0;
    this.queued = false;
    this.hitDone = false;
    this.cd = { K: 0, L: 0, I: 0 };
    this.denyT = { J: 0, K: 0, L: 0, I: 0 };
    this.squash = 0;
    this.tilt = 0;
    this.runT = 0;
    this.redT = 0;
    this.lift = 0;
    this.landT = 0;
    this.runFrame = 0;
    this.runStep = -1;
    this.dead = false;
    this.invulnT = 0;
    this.guard = false;
    this.guardT = 0;
    this.parryT = 0;
  }

  anim(name) { return this.sprite[name] && this.sprite[name].length ? this.sprite[name] : null; }

  frame() {
    const idle = this.sprite.idle[0];
    const pick = (name, i) => { const a = this.anim(name); return a ? a[clamp(i, 0, a.length - 1)] : idle; };
    if (this.guard || this.parryT > 0) return pick('parry', this.parryT > 0 ? 1 : 0);
    switch (this.state) {
      case 'dead':
      case 'hurt': return pick('hurt', 0);
      case 'ult': return pick('ult', 0);
      case 'dash': return pick('run', 3);
      case 'burst': return pick('burst', this.burstDone ? 1 : 0);
      case 'attack': {
        const a = COMBO[this.combo - 1];
        const t = this.stateT;
        const i = t < a.hitAt * 0.6 ? 0 : t < a.hitAt + 0.04 ? 1 : t < a.dur * 0.7 ? 2 : 3;
        return pick('attack', i);
      }
      case 'run': {
        const a = this.anim('run');
        if (!a) return idle;
        let t = this.runT % RUN_PERIOD;
        for (const f of RUN_CYCLE) {
          if (t < f.duration) return a[Math.min(f.index, a.length - 1)];
          t -= f.duration;
        }
        return a[Math.min(RUN_CYCLE[0].index, a.length - 1)];
      }
      case 'air': {
        if (this.vy < -350) return pick('jump', 1);
        if (this.vy < -80) return pick('jump', 2);
        if (this.vy < 150) return pick('jump', 3);
        return pick('jump', 4);
      }
      default:
        if (this.landT > 0) return pick('jump', 5);
        return idle;
    }
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get feet() { return this.y + this.h; }
  get busy() { return this.state === 'dash' || this.state === 'burst' || this.state === 'ult'; }

  heal(n) { if (!this.dead) this.hp = Math.min(PLAYER.MAX_HP, this.hp + n); }

  bleed(n) {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - n);
    this.redT = Math.max(this.redT, 0.3);
    FX.blood(this.cx, this.cy + 8, 5, 0.55);
    FX.text(this.cx, this.y - 26, `流血 -${n}`, '#ff5577', 14);
    if (this.hp <= 0) this.die();
  }

  addShield(n) {
    if (this.dead) return;
    const before = this.shield;
    this.shield = Math.min(PLAYER.MAX_SHIELD, this.shield + n);
    const gained = Math.round(this.shield - before);
    if (gained <= 0) {
      FX.text(this.cx, this.y - 22, '护盾已满', '#7fd4ff', 14);
      return;
    }
    FX.text(this.cx, this.y - 22, `护盾 +${gained}`, '#7fd4ff', 16);
    FX.ring(this.cx, this.cy, 34, '#7fd4ff', 0.4);
    AudioSys.sfxPlay('altar', { rate: 1.25, volume: 0.55 });
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.shield = 0;
    this.guard = false;
    this.parryT = 0;
    this.guardT = 0;
    this.lift = 0;
    this.vx = this.vy = 0;
    this.queued = false;
    this.setState('dead');
    Game.stats.deaths++;
    Game.runStats.deaths++;
    AudioSys.sfxPlay('death');
    FX.blood(this.cx, this.cy, 20, 1.4);
    for (let i = 0; i < 8; i++) FX.bat(this.cx, this.cy, rand(-240, 240), 0.8);
  }

  takeDamage(n, source, unblockable = false) {
    if (this.dead || ((!unblockable || source.unblockable) && (this.invulnT > 0 || this.state === 'dash' || this.state === 'ult'))) return 'immune';
    const sx = source.cx === undefined ? source.x : source.cx;
    const frontal = (sx - this.cx) * this.face >= 0;
    let guarded = false;
    if (!unblockable && this.guard && frontal) {
      if (this.guardT <= 0.15 && source.parryable && this.parryT <= 0) {
        source.onParried(this.face);
        this.parryT = 0.22;
        this.invulnT = 0.2;
        this.heal(5);
        FX.text(this.cx, this.y - 12, '弹反 +5', '#ffd166', 20);
        FX.ring(this.cx + this.face * 24, this.cy, 45, '#ffd166', 0.3);
        FX.freeze(0.06);
        AudioSys.sfxPlay('parry');
        return 'parry';
      }
      n = Math.max(1, Math.ceil(n * 0.25));
      guarded = true;
    }

    if (this.shield > 0 && n > 0) {
      const absorbed = Math.min(this.shield, n);
      this.shield -= absorbed;
      n -= absorbed;
      FX.text(this.cx, this.y - 28, `护盾 -${absorbed}`, '#7fd4ff', 14);
      FX.ring(this.cx, this.cy, 30, '#7fd4ff', 0.3);
    }
    if (n <= 0) {
      this.invulnT = 0.25;
      FX.shake(2, 0.08);
      AudioSys.sfxPlay('block', { rate: 1.25, volume: 0.7 });
      return 'shield';
    }

    if (guarded) {
      this.invulnT = 0.35;
      FX.text(this.cx, this.y - 12, `格挡 -${n}`, '#ffd166', 15);
      AudioSys.sfxPlay('block');
    } else {
      this.invulnT = 0.65;
      this.guard = false;
      this.queued = false;
      this.lift = 0;
      this.setState('hurt');
      this.vx = (Math.sign(this.cx - sx) || -this.face) * 220;
      this.vy = -120;
      AudioSys.sfxPlay('hurt');
      FX.text(this.cx, this.y - 12, `-${n}`, '#ff5577', 18);
    }
    this.hp = Math.max(0, this.hp - n);
    this.redT = 0.15;
    FX.shake(4, 0.12);
    if (this.hp <= 0) this.die();
    return 'damage';
  }

  spend(n) {
    this.hp -= n;
    FX.text(this.cx, this.y - 8, `-${n}`, '#ff5577', 15);
  }

  deny(key, msg) {
    if (this.denyT[key] > 0) return;
    this.denyT[key] = 0.4;
    FX.text(this.cx, this.y - 10, msg, '#aaaaaa', 14);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  update(dt, game) {
    if (this.dead) return;
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.parryT = Math.max(0, this.parryT - dt);
    this.stateT += dt;
    for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
    for (const k in this.denyT) this.denyT[k] = Math.max(0, this.denyT[k] - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    this.dropT = Math.max(0, this.dropT - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.coyote = this.onGround ? PLAYER.COYOTE : Math.max(0, this.coyote - dt);
    this.redT = Math.max(0, this.redT - dt);
    this.landT = Math.max(0, this.landT - dt);

    if (Input.wasPressed('Space')) this.jumpBuf = PLAYER.JUMP_BUFFER;
    const dir = Input.axisX();

    const guarding = Input.isDown('KeyF') && !this.busy && this.state !== 'hurt' && this.state !== 'attack';
    if (guarding) this.guardT = this.guard ? this.guardT + dt : 0;
    else this.guardT = 0;
    this.guard = guarding;

    if (!this.busy && !this.guard && this.state !== 'hurt') {
      if (Input.wasPressed('KeyI')) this.tryUlt(game);
      else if (Input.wasPressed('KeyL')) this.tryBurst();
      else if (Input.wasPressed('KeyK')) this.tryDash(dir);
      else if (Input.wasPressed('KeyJ')) this.tryAttack();
    }

    if (this.state === 'dash') this.updateDash(dt);
    else if (this.state === 'burst') this.updateBurst(dt, game);
    else if (this.state === 'ult') this.updateUlt(dt, game);
    else if (this.state === 'attack') this.updateAttack(dt, dir, game);
    else if (this.state === 'hurt') {
      this.vx = approach(this.vx, 0, 800 * dt);
      if (this.stateT >= 0.24) this.setState('idle');
    } else if (this.guard) {
      this.vx = approach(this.vx, 0, 2800 * dt);
      this.setStateKeep('idle');
    } else this.updateMove(dt, dir);

    this.physics(dt, game.level);
    if (this.y > H + 160) this.die();
    this.updateVisual(dt);
    this.hpShown = approach(this.hpShown, this.hp, dt * 60);
  }

  updateMove(dt, dir, control = 1) {
    const acc = (this.onGround ? PLAYER.ACC_GROUND : PLAYER.ACC_AIR) * control;
    if (dir) {
      this.vx = approach(this.vx, dir * PLAYER.RUN, acc * dt);
      this.face = dir;
    } else {
      this.vx = approach(this.vx, 0, (this.onGround ? PLAYER.FRICTION : PLAYER.ACC_AIR * 0.5) * dt);
    }

    if (Input.downPressed() && this.onOneway) {
      this.dropT = 0.25;
      this.onGround = false;
      this.y += 2;
    }

    if (this.jumpBuf > 0) {
      if (this.onGround || this.coyote > 0) {
        this.vy = -PLAYER.JUMP;
        this.jumpBuf = 0;
        this.coyote = 0;
        this.onGround = false;
        this.squash = -0.25;
        AudioSys.sfxPlay('jump');
        FX.dust(this.cx, this.feet, 5, 0);
      } else if (this.airJumps > 0) {
        this.airJumps--;
        this.vy = -PLAYER.DOUBLE_JUMP;
        this.jumpBuf = 0;
        this.squash = -0.2;
        AudioSys.sfxPlay('jump', { rate: 1.16, volume: 0.6 });
        for (let i = 0; i < 4; i++) FX.bat(this.cx + rand(-10, 10), this.feet - 6, rand(-120, 120), 0.4);
      }
    }

    if (!Input.isDown('Space') && this.vy < -300) this.vy = -300;

    if (this.state !== 'attack') this.setStateKeep(this.onGround ? (Math.abs(this.vx) > 20 ? 'run' : 'idle') : 'air');
  }

  setStateKeep(s) { if (this.state !== s) this.setState(s); }

  tryAttack() {
    if (this.state === 'attack') {
      if (this.combo < 3) this.queued = true;
      return;
    }
    const next = this.comboT > 0 && this.combo < 3 ? this.combo + 1 : 1;
    this.startAttack(next);
  }

  startAttack(n) {
    const a = COMBO[n - 1];
    this.combo = n;
    this.queued = false;
    this.hitDone = false;
    this.setState('attack');
    const dir = Input.axisX();
    if (dir) this.face = dir;
    this.vx = this.face * a.lunge;
    if (!this.onGround) this.vy = Math.min(this.vy, 0) * 0.3;
    AudioSys.sfxPlay('swing', { rate: 1 + (n - 1) * 0.05, volume: n === 3 ? 0.95 : 0.8 });
  }

  updateAttack(dt, dir, game) {
    const a = COMBO[this.combo - 1];
    this.vx = approach(this.vx, 0, 1400 * dt);
    if (!this.onGround) this.vy = Math.min(this.vy, 260);

    if (!this.hitDone && this.stateT >= a.hitAt) {
      this.hitDone = true;
      FX.claw(this.cx + this.face * 18, this.cy - 4, this.face, this.combo === 3);
      const box = {
        x: this.face > 0 ? this.cx : this.cx - a.reach,
        y: this.y - 10,
        w: a.reach,
        h: this.h + 14,
      };
      let hits = 0;
      for (const d of game.targets) {
        if (!d.dead && overlap(box, d.box) && d.hit(a.dmg, this.face)) hits++;
      }
      if (hits) {
        const heal = PLAYER.LIFESTEAL * hits;
        FX.freeze(this.combo === 3 ? 0.09 : 0.05);
        FX.shake(this.combo === 3 ? 6 : 3, 0.12);
        AudioSys.sfxPlay(this.combo === 3 ? 'hit_heavy' : 'hit');
        const target = game.targets.find((d) => overlap(box, d.box));
        this.heal(heal);
        FX.text(this.cx, this.y - 8, `+${heal}`, '#7dffb0', 15);
        FX.drain(target ? target.cx : this.cx, target ? target.cy : this.cy, 5);
      }
    }

    if (this.stateT >= a.dur) {
      if (this.queued && this.combo < 3) {
        this.startAttack(this.combo + 1);
      } else {
        this.comboT = COMBO_WINDOW;
        if (this.combo >= 3) this.combo = 0;
        this.setState(this.onGround ? 'idle' : 'air');
      }
    }
  }

  tryDash(dir) {
    if (this.cd.K > 0) return;
    if (!this.onGround && !this.airDash) return this.deny('K', '空中只能冲刺一次');
    if (this.hp <= SKILLS.K.cost) return this.deny('K', '生命不足');
    this.spend(SKILLS.K.cost);
    this.cd.K = SKILLS.K.cd;
    if (dir) this.face = dir;
    if (!this.onGround) this.airDash = false;
    this.setState('dash');
    this.vy = 0;
    AudioSys.sfxPlay('dash');
    for (let i = 0; i < 6; i++) FX.bat(this.cx + rand(-10, 10), this.cy + rand(-25, 25), this.face * rand(100, 300), 0.35);
  }

  updateDash(dt) {
    this.vx = this.face * SKILLS.K.speed;
    this.vy = 0;
    if (Math.random() < 0.8) FX.bat(this.cx + rand(-14, 14), this.cy + rand(-28, 28), -this.face * rand(30, 120), 0.35);
    const frame = this.frame();
    FX.ghost(frame, this.cx, this.feet, this.face, this.frameMetrics(frame));
    if (this.stateT >= SKILLS.K.dur) {
      this.vx = this.face * PLAYER.RUN;
      for (let i = 0; i < 6; i++) FX.bat(this.cx + rand(-10, 10), this.cy + rand(-25, 25), this.face * rand(150, 350), 0.4);
      this.setState(this.onGround ? 'idle' : 'air');
    }
  }

  tryBurst() {
    if (this.cd.L > 0) return;
    if (this.hp <= SKILLS.L.cost) return this.deny('L', '生命不足');
    this.spend(SKILLS.L.cost);
    this.cd.L = SKILLS.L.cd;
    this.setState('burst');
    this.burstDone = false;
    this.vx = 0;
    this.vy = 0;
  }

  updateBurst(dt, game) {
    const s = SKILLS.L;
    this.vx = 0;
    this.vy = 0;
    if (!this.burstDone) {
      this.squash = 0.25 * (this.stateT / s.windup);
      this.redT = 0.1;
      if (Math.random() < 0.6) {
        const a = rand(0, Math.PI * 2);
        FX.drain(this.cx + Math.cos(a) * 90, this.cy + Math.sin(a) * 90, 1);
      }
    }
    if (!this.burstDone && this.stateT >= s.windup) {
      this.burstDone = true;
      this.squash = -0.3;
      FX.ring(this.cx, this.cy, s.radius, '#ff2d55', 0.4);
      FX.ring(this.cx, this.cy, s.radius * 0.6, '#ffccd5', 0.3);
      FX.blood(this.cx, this.cy, 20, 1.6);
      FX.shake(9, 0.25);
      FX.freeze(0.08);
      AudioSys.sfxPlay('burst');
      let hits = 0;
      for (const d of game.targets) {
        if (!d.dead && circleRect(this.cx, this.cy, s.radius, d.box) && d.hit(s.dmg, Math.sign(d.cx - this.cx) || 1)) hits++;
      }
      if (hits) {
        const heal = 2 * hits;
        this.heal(heal);
        FX.text(this.cx, this.y - 14, `+${heal}`, '#7dffb0', 15);
      }
    }
    if (this.stateT >= s.windup + 0.2) this.setState(this.onGround ? 'idle' : 'air');
  }

  tryUlt(game) {
    if (this.cd.I > 0) return this.deny('I', `冷却中 ${Math.ceil(this.cd.I)} 秒`);
    if (this.hp <= SKILLS.I.cost) return this.deny('I', '生命不足');
    this.spend(SKILLS.I.cost);
    this.cd.I = SKILLS.I.cd;
    this.setState('ult');
    this.ultDone = false;
    this.vx = 0;
    this.vy = 0;
    AudioSys.sfxPlay('ult');
    addBloodMoon();
  }

  updateUlt(dt, game) {
    const s = SKILLS.I;
    this.vx = 0;
    this.vy = 0;
    this.lift = Math.sin(Math.min(1, this.stateT / s.dur) * Math.PI) * 40;
    this.redT = 0.1;
    if (!this.ultDone && this.stateT >= s.hitAt) {
      this.ultDone = true;
      FX.shake(12, 0.4);
      FX.flash('#ff2d55', 0.25);
      let hits = 0;
      for (const d of game.targets) {
        if (!d.dead && d.cx > game.camX && d.cx < game.camX + W) {
          const ok = d.hitDirect ? d.hitDirect(s.dmg) : d.hit(s.dmg, Math.sign(d.cx - this.cx) || 1);
          if (ok) hits++;
        }
      }
      if (hits) {
        const heal = 3 * hits;
        this.heal(heal);
        FX.text(this.cx, this.y - 14, `+${heal}`, '#7dffb0', 16);
      }
    }
    if (this.stateT >= s.dur) {
      this.lift = 0;
      this.setState(this.onGround ? 'idle' : 'air');
    }
  }

  physics(dt, level) {
    if (this.state !== 'dash' && this.state !== 'burst' && this.state !== 'ult') {
      const g = this.vy > 0 ? PLAYER.GRAVITY * 1.15 : PLAYER.GRAVITY;
      this.vy = Math.min(PLAYER.MAX_FALL, this.vy + g * dt);
    }

    const grounded = this.onGround && this.vy >= 0;
    const oldFeet = this.feet;
    this.x += this.vx * dt;
    for (const s of level.solids) {
      if (overlap(this, s)) {
        const rise = this.feet - s.y;
        const stepped = { x: this.x, y: s.y - this.h, w: this.w, h: this.h };
        if (grounded && s.stair && rise > 0 && rise <= 16.5 &&
            !level.solids.some((other) => other !== s && overlap(stepped, other))) {
          this.y = stepped.y;
        } else {
          if (this.vx > 0) this.x = s.x - this.w;
          else if (this.vx < 0) this.x = s.x + s.w;
          this.vx = 0;
        }
      }
    }
    // Follow small downward treads, never snap a jump or a tall ledge.
    if (grounded && this.feet === oldFeet) {
      const support = level.solids.filter((s) => !s.boundary &&
        this.x + this.w > s.x && this.x < s.x + s.w &&
        s.y >= oldFeet && s.y <= oldFeet + 16.5);
      if (support.length) this.y = Math.min(...support.map((s) => s.y)) - this.h;
    }

    this.x = clamp(this.x, 0, level.width - this.w);
    const wasGround = this.onGround;
    const fallSpeed = this.vy;
    const prevFeet = this.feet;
    this.y += this.vy * dt;
    this.onGround = false;
    this.onOneway = false;

    for (const s of level.solids) {
      if (overlap(this, s)) {
        if (this.vy >= 0) { this.y = s.y - this.h; this.onGround = true; }
        else this.y = s.y + s.h;
        this.vy = 0;
      }
    }

    if (this.vy >= 0 && this.dropT <= 0) {
      for (const o of level.oneways) {
        if (this.x + this.w > o.x && this.x < o.x + o.w && prevFeet <= o.y + 1 && this.feet >= o.y) {
          this.y = o.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.onOneway = true;
        }
      }
    }

    if (!this.onGround && this.vy >= 0) {
      for (const s of level.solids) {
        if (Math.abs(this.feet - s.y) < 0.5 && this.x + this.w > s.x && this.x < s.x + s.w) this.onGround = true;
      }
      if (this.dropT <= 0) {
        for (const o of level.oneways) {
          if (Math.abs(this.feet - o.y) < 0.5 && this.x + this.w > o.x && this.x < o.x + o.w) {
            this.onGround = true;
            this.onOneway = true;
          }
        }
      }
    }

    if (this.onGround && !wasGround) {
      this.airJumps = 1;
      this.airDash = true;
      if (fallSpeed > 400) {
        this.squash = Math.min(0.15, fallSpeed / 6000);
        this.landT = 0.1;
        AudioSys.sfxPlay('land');
        FX.dust(this.cx, this.feet, 6, 0);
      }
    }
  }

  updateVisual(dt) {
    this.squash = approach(this.squash, 0, dt * 2.2);
    let targetTilt = 0;
    if (this.state === 'run') {
      const speedK = Math.min(1, Math.abs(this.vx) / PLAYER.RUN);
      // 步频跟随实际位移：每个 8 帧循环约走 92px，短腿也不会滑步
      const cadence = clamp(Math.abs(this.vx) / 92, 2.2, 4.2);
      this.runT = (this.runT + dt * cadence * RUN_PERIOD) % RUN_PERIOD;
      this.runFrame += dt * 14 * speedK;
      targetTilt = this.face * (0.035 + 0.045 * speedK);
      const step = Math.floor((this.runT / RUN_PERIOD) * 2);
      if (step !== this.runStep) {
        this.runStep = step;
        FX.dust(this.cx - this.face * 10, this.feet - 2, 2, -this.face);
      }
    } else if (this.state === 'attack') {
      targetTilt = this.anim('attack') ? 0 : 0.1 * this.face * (1 - this.stateT / COMBO[this.combo - 1].dur);
    } else this.runStep = -1;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 16);
  }

  frameMetrics(frame) {
    if (this.state === 'run' || this.state === 'dash') {
      // 跑步帧与站立帧同高，避免一跑起来显得变大
      const ref = (this.sprite.idle && this.sprite.idle[0]) || frame;
      const drawH = ref.h;
      const k = drawH / frame.h;
      return { w: frame.w * k, h: drawH, left: FACE_FROM_CENTER - frame.face * k };
    }
    return { w: frame.w, h: frame.h, left: FACE_FROM_CENTER - frame.face };
  }

  draw(ctx) {
    if (this.state === 'dash') {
      for (let i = 0; i < 5; i++) {
        drawBat(ctx, this.cx + Math.sin(this.stateT * 40 + i) * 10, this.cy - 20 + i * 10, this.face, this.stateT * 40 + i * 2, 1);
      }
      return;
    }
    const frame = this.frame();
    const px = ART_SCALE;
    const metrics = this.frameMetrics(frame);
    let drawW = metrics.w, drawH = metrics.h;
    let left = metrics.left;
    let sx = 1 + this.squash * 0.8;
    let sy = 1 - this.squash;
    let bob = 0;
    if (this.state === 'idle' && this.landT <= 0) bob = Math.sin(performance.now() / 480) * 1.6;
    if (this.state === 'run') {
      const phase = (this.runT / RUN_PERIOD) * Math.PI * 2;
      bob = -Math.abs(Math.sin(phase)) * 3;
    }
    sx = Math.round(sx * drawW / px / 2) * 2 * px / drawW;
    sy = Math.round(sy * drawH / px) * px / drawH;

    if (this.onGround) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(this.cx, this.feet, 18 * sx, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const ox = Math.round(this.cx);
    const oy = Math.round(this.feet + bob - this.lift);
    ctx.save();
    ctx.translate(ox, oy);
    if (this.tilt) ctx.rotate(this.tilt);
    ctx.scale(this.face * sx, sy);
    ctx.drawImage(frame.img, left, -drawH, drawW, drawH);
    if (this.redT > 0) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(frame.red, left, -drawH, drawW, drawH);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

function addBloodMoon() {
  const s = SKILLS.I;
  const drops = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(-H, 0), v: rand(700, 1100) }));
  FX.add({
    t: 0, life: s.dur + 0.3, layer: 'screen',
    update: (e, dt) => { for (const d of drops) { d.y += d.v * dt; if (d.y > H) d.y -= H + 40; } },
    draw: (ctx, e) => {
      const fadeIn = clamp(e.t / 0.3, 0, 1);
      const fadeOut = clamp((e.life - e.t) / 0.3, 0, 1);
      const a = fadeIn * fadeOut;
      ctx.fillStyle = `rgba(10, 0, 8, ${0.6 * a})`;
      ctx.fillRect(0, 0, W, H);

      const rise = easeOut(clamp(e.t / 0.8, 0, 1));
      const my = 260 - rise * 160;
      const g = ctx.createRadialGradient(W / 2, my, 20, W / 2, my, 180);
      g.addColorStop(0, `rgba(255, 60, 80, ${0.5 * a})`);
      g.addColorStop(1, 'rgba(255, 0, 40, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a;
      const moon = Assets.images.moon;
      if (moon) ctx.drawImage(moon, W / 2 - 72, my - 72, 144, 144);

      if (e.t > 0.4) {
        ctx.strokeStyle = '#c4123a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const d of drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 14); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  });
}
