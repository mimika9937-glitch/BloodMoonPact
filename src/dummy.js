class Dummy {
  constructor(x) {
    this.homeX = x;
    this.w = 34;
    this.h = 66;
    this.maxHp = 40;
    this.spawn();
  }

  spawn() {
    this.x = this.homeX - this.w / 2;
    this.y = GROUND_Y - this.h;
    this.hp = this.maxHp;
    this.dead = false;
    this.hurtT = 0;
    this.wobble = 0;
    this.respawnT = 0;
    this.spawnT = 0.3;
  }

  get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  hit(dmg, dir) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.hurtT = 0.12;
    this.wobble = 0.35 * dir;
    FX.text(this.cx, this.y - 6, String(dmg), dmg >= 30 ? '#ffd166' : '#ffffff', dmg >= 30 ? 22 : 16);
    FX.blood(this.cx, this.cy, 6, 0.8);
    if (this.hp <= 0) {
      this.dead = true;
      this.respawnT = 3;
      FX.blood(this.cx, this.cy, 18, 1.3);
      FX.dust(this.cx, GROUND_Y - 4, 10, 0);
    }
    return true;
  }

  update(dt) {
    if (this.dead) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.spawn();
      return;
    }
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.wobble = approach(this.wobble * 0.9, 0, dt * 0.2);
  }

  draw(ctx) {
    if (this.dead) return;
    const s = 1 - this.spawnT / 0.3;
    ctx.save();
    ctx.translate(this.cx, GROUND_Y);
    ctx.rotate(this.wobble * Math.sin(performance.now() / 40));
    ctx.scale(s, s);
    const white = this.hurtT > 0;
    ctx.fillStyle = white ? '#fff' : '#4a3020';
    ctx.fillRect(-3, -66, 6, 66);
    ctx.fillRect(-18, -46, 36, 5);
    ctx.fillStyle = white ? '#fff' : '#8a6a3a';
    ctx.fillRect(-12, -52, 24, 30);
    ctx.fillStyle = white ? '#fff' : '#a88850';
    ctx.beginPath(); ctx.arc(0, -60, 10, 0, Math.PI * 2); ctx.fill();
    if (!white) {
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(-5, -62, 3, 3);
      ctx.fillRect(3, -62, 3, 3);
      ctx.strokeStyle = '#6a0f25';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -38, 6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    if (this.hp < this.maxHp) {
      const bw = 40;
      ctx.fillStyle = '#000';
      ctx.fillRect(this.cx - bw / 2 - 1, this.y - 16, bw + 2, 6);
      ctx.fillStyle = '#c4123a';
      ctx.fillRect(this.cx - bw / 2, this.y - 15, bw * (this.hp / this.maxHp), 4);
    }
  }
}
