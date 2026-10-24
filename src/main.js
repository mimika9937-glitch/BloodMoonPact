const RESULTS_IDLE_TO_TITLE = 10;

const Game = {
  canvas: null,
  ctx: null,
  level: null,
  player: null,
  dummies: [],
  enemies: [],
  projectiles: [],
  camX: 0,
  paused: false,
  completed: false,
  checkpoint: null,
  stats: { kills: 0, deaths: 0 },
  runStats: { time: 0, kills: 0, deaths: 0 },
  results: null,
  scene: 'title',
  dialogue: null,
  choice: null,
  cgView: null,
  ending: null,
  endingStats: null,
  inventoryIndex: 0,
  titleHover: null,
  bossTransformShown: false,
  resultsIdle: 0,
  titleCinematic: null,
  sprites: {},
  get targets() { return [...this.dummies, ...this.enemies, ...(this.boss ? [this.boss] : [])]; },

  async start() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.fit();
    window.addEventListener('resize', () => this.fit());
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerleave', () => this.onPointerLeave());
    window.addEventListener('blur', () => {
      if (this.player && !this.testing && this.scene === 'play') {
        this.paused = true;
        AudioSys.setPaused(true);
      }
    });
    Input.init();
    AudioSys.init();
    Gallery.init();
    const bootAssets = {
      castleBg: 'assets/tiles/castle/green_background.png',
      castleTiles: 'assets/tiles/gothicvania/Old-dark-Castle-tileset-Files/PNG/old-dark-castle-interior-tileset.png',
      moon: 'assets/backgrounds/moon_pixel.png',
      halfCamilla: 'assets/portraits/half/camilla.png',
      halfLillian: 'assets/portraits/half/lillian.png',
      halfAbyss: 'assets/portraits/half/abyss.png',
      titleCover: 'assets/ui/processed/title_cover.jpg',
      titleLogo: 'assets/ui/processed/title_logo.png',
      dialogFrame: 'assets/ui/processed/dialog_frame.png',
      dialogFrameOpen: 'assets/ui/processed/dialog_frame_open.png',
      namePlate: 'assets/ui/processed/name_plate.png',
      cornerTL: 'assets/ui/processed/corner_tl.png',
      cornerTR: 'assets/ui/processed/corner_tr.png',
      cornerBL: 'assets/ui/processed/corner_bl.png',
      cornerBR: 'assets/ui/processed/corner_br.png',
    };
    this.drawLoading(0, Object.keys(bootAssets).length);
    await Assets.load(bootAssets, (done, total) => this.drawLoading(done, total));
    this.drawLoading(1, 1, '正在准备角色动画…');
    await Sheets.load();
    const frames = typeof VAMPIRE_FRAMES !== 'undefined' ? await loadFrameSet(VAMPIRE_FRAMES, ART_SCALE, '#7a1a36') : {};
    if (!frames.idle) frames.idle = [buildPixelSprite(null, ART_SCALE, '#7a1a36')];
    this.sprites.vampire = frames;
    this.sprites.boss = await loadFrameSet(BOSS_FRAMES, ART_SCALE, '#162027');
    this.reset();
    this.scene = 'title';
    AudioSys.playBgm('ending');
    let last = performance.now();
    const loop = (now) => {
      const dt = clamp((now - last) / 1000, 0, 0.033);
      last = now;
      if (!this.testing) this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    this.loadDeferred();
  },

  loadDeferred() {
    Assets.load({
      titleBg: 'assets/backgrounds/背景图1.png',
      portraitCamilla: 'assets/portraits/吸血鬼立绘.png',
      portraitLillian: 'assets/portraits/公主立绘.png',
      portraitAbyss: 'assets/portraits/深渊领主立绘.png',
      rankS: 'assets/ui/processed/rank_s.png',
      rankA: 'assets/ui/processed/rank_a.png',
      rankB: 'assets/ui/processed/rank_b.png',
    });
  },

  fit() {
    const s = Math.max(0.1, Math.min(window.innerWidth / W, window.innerHeight / H));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${Math.round(W * s)}px`;
    this.canvas.style.height = `${Math.round(H * s)}px`;
    this.canvas.width = Math.round(W * s * dpr);
    this.canvas.height = Math.round(H * s * dpr);
    this.scale = this.canvas.width / W;
    this.bgLayer = null;
  },

  buildBgLayer() {
    const c = makeCanvas(1440, 456);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#0e1b20';
    g.fillRect(0, 0, c.width, c.height);
    const moon = Assets.images.moon;
    if (moon) for (const x of [303, 783]) g.drawImage(moon, (x + 2) * 1.5, 104 * 1.5, 72, 72);
    if (Assets.images.castleBg) g.drawImage(Assets.images.castleBg, 0, 0, c.width, c.height);
    this.bgLayer = c;
  },

  reset() {
    this.phase = 'tutorial';
    this.stats = { kills: 0, deaths: 0 };
    this.runStats = { time: 0, kills: 0, deaths: 0 };
    this.results = null;
    this.ending = null;
    this.endingStats = null;
    this.dialogue = null;
    this.choice = null;
    this.cgView = null;
    this.paused = false;
    this.completed = false;
    this.titleHover = null;
    this.bossTransformShown = false;
    this.resultsIdle = 0;
    this.titleCinematic = null;
    Collect.reset();
    this.enterLevel(createTutorialLevel());
  },

  enterLevel(level) {
    this.level = level;
    this.checkpoint = { ...level.checkpoints[0], index: 0, deadEnemies: [], kills: 0 };
    this.retry();
  },

  retry() {
    FX.reset();
    Input.down.clear(); Input.endStep();
    this.paused = false;
    this.bossTransformShown = false;
    this.resultsIdle = 0;
    this.titleCinematic = null;
    AudioSys.setPaused(false);
    AudioSys.playBgm(this.phase === 'boss' ? 'boss' : 'castle');
    this.completed = false;
    this.projectiles = [];
    this.enemies = spawnEnemies(this.level);
    this.boss = this.phase === 'boss' ? new AbyssLord(this.sprites.boss) : null;
    for (const i of this.checkpoint.deadEnemies) this.enemies[i].dead = true;
    this.stats.kills = this.checkpoint.kills;
    this.dummies = this.level.dummyXs.map((x) => new Dummy(x));
    this.player = new Player(this.checkpoint.x, this.sprites.vampire);
    this.player.invulnT = 1;
    this.camX = clamp(this.player.cx - W / 2, 0, this.level.width - W);
  },

  startGame() {
    this.reset();
    AudioSys.playBgm('ending');
    if (this.testing) { this.scene = 'play'; AudioSys.playBgm('castle'); return; }
    CGView.ensure('assets/cg/cg_opening_ritual.png');
    Dialogue.start(STORY.opening, () => {
      this.scene = 'play';
      this.runStats.time = 0;
      AudioSys.playBgm('castle');
    }, { backdrop: 'cg', cg: 'assets/cg/cg_opening_ritual.png', fallback: 'title', cast: ['camilla', 'abyss'] });
  },

  toTitle() {
    this.reset();
    this.scene = 'title';
    AudioSys.playBgm('ending');
  },

  showBossTransformDialogue(onEnd) {
    if (this.bossTransformShown || this.scene !== 'play') {
      if (onEnd) onEnd();
      return;
    }
    this.bossTransformShown = true;
    Dialogue.start(STORY.bossTransform, () => {
      this.scene = 'play';
      if (onEnd) onEnd();
    }, { cast: ['camilla', 'abyss'] });
  },

  finish() {
    if (this.completed) return;
    this.completed = true;
    AudioSys.playBgm('ending');
    this.projectiles = [];
    for (const e of this.enemies) e.dead = true;
    FX.reset();
    const R = Collect.restoredCount();
    const K = Collect.keepsakeCount();
    const H = Collect.hiddenCount();
    this.endingStats = { restored: R, keepsakes: K, hidden: H };
    if (this.testing) { this.completeEnding(endingFor(R, K, H, 'stay')); return; }
    Dialogue.start(STORY.bossDeath, () => this.showBossFall(R, K, H), { cast: ['camilla', 'lillian'] });
  },

  showBossFall(R, K, H) {
    Dialogue.start(STORY.bossFall, () => this.showFinalChoice(R, K, H), {
      backdrop: 'cg',
      cg: 'assets/cg/cg_princess_fall.png',
      fallback: 'fall',
      cast: ['camilla', 'lillian'],
    });
  },

  showFinalChoice(R, K, H) {
    if (R <= 1) {
      Dialogue.start(STORY.endings.bad, () => this.completeEnding('bad'), { cast: ['camilla', 'abyss'] });
      return;
    }
    if (R >= 3 && K >= 2 && H >= 1) CGView.ensure('assets/cg/cg_true_ending.png');
    Choice.start('深渊之门正在崩塌。莉莉安的手就在你面前。', endingChoices(R, K, H), (opt) => {
      const cast = opt.ending === 'bad' ? ['camilla', 'abyss'] : ['lillian', 'camilla'];
      const opts = { cast };
      if (opt.ending === 'true') {
        opts.backdrop = 'cg';
        opts.cg = 'assets/cg/cg_true_ending.png';
      }
      Dialogue.start(STORY.endings[opt.ending], () => this.completeEnding(opt.ending), opts);
    }, { backdrop: 'cg', cg: 'assets/cg/cg_princess_fall.png' });
  },

  completeEnding(id) {
    const R = Collect.restoredCount();
    const K = Collect.keepsakeCount();
    const H = Collect.hiddenCount();
    AudioSys.playBgm('ending');
    if (typeof Gallery !== 'undefined') Gallery.markEnding(id);
    this.ending = id;
    this.scene = 'results';
    this.resultsIdle = 0;
    this.titleCinematic = null;
    this.results = {
      time: this.runStats.time,
      kills: this.runStats.kills,
      deaths: this.runStats.deaths,
      rank: rankFor(this.runStats.time, this.runStats.deaths),
      memories: R, memoriesTotal: MEMORIES.length,
      keepsakes: K, keepsakesTotal: KEEPSAKES.length,
      hidden: H,
      ending: ENDINGS[id].name,
      endingSubtitle: ENDINGS[id].subtitle,
    };
  },

  interact() {
    const p = this.player;
    if (this.phase === 'boss') return;
    if (this.phase === 'tutorial') {
      if (Math.abs(p.cx - this.level.exitX) < 75 && Math.abs(p.feet - GROUND_Y) < 12) {
        this.phase = 'castle';
        this.enterLevel(createLevel());
      }
      return;
    }
    if (Collect.nearAltar(p)) {
      Collect.tryRestore();
      return;
    }
    const index = this.level.checkpoints.findIndex((cp) => Math.abs(p.cx - cp.x) < 48 && Math.abs(p.feet - GROUND_Y) < 12);
    if (index >= 0) {
      this.checkpoint = { ...this.level.checkpoints[index], index,
        deadEnemies: this.enemies.flatMap((e, i) => e.dead ? [i] : []), kills: this.stats.kills };
      p.heal(PLAYER.MAX_HP);
      FX.text(p.cx, p.y - 15, '检查点已激活 · 生命回满', '#7dffb0', 17);
    } else if (Math.abs(p.cx - this.level.exitX) < 75 && Math.abs(p.feet - GROUND_Y) < 12) {
      if (this.enemies.every((e) => e.dead)) {
        this.phase = 'boss';
        this.enterLevel(createBossArena());
        if (!this.testing) {
          Dialogue.start(STORY.bossPre, () => { this.scene = 'play'; AudioSys.playBgm('boss'); }, { cast: ['camilla', 'abyss'] });
        }
      }
      else FX.text(p.cx, p.y - 15, '先清除城堡全部魔物', '#ff5577', 17);
    }
  },

  update(dt) {
    AudioSys.update(dt);
    AudioSys.setDucked(this.scene === 'dialogue' || this.scene === 'choice' || (this.player && this.player.dead));
    if (this.scene === 'title') {
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) this.startGame();
      else if (Input.wasPressed('KeyE')) Gallery.open('endings');
      else if (Input.wasPressed('KeyC')) Gallery.open('cg');
      Input.endStep();
      return;
    }
    if (this.scene === 'gallery') {
      Gallery.update(dt);
      Input.endStep();
      return;
    }
    if (this.scene === 'titleCinematic') {
      const c = this.titleCinematic;
      if (!c) { this.toTitle(); return; }
      c.t += dt;
      if (Input.wasPressed('Enter') || Input.wasPressed('Escape') || Input.wasPressed('Space') || c.t >= 5.4) {
        this.toTitle();
      }
      Input.endStep();
      return;
    }
    if (this.scene === 'dialogue') { Dialogue.update(dt); Input.endStep(); return; }
    if (this.scene === 'choice') { Choice.update(); Input.endStep(); return; }
    if (this.scene === 'inventory') { Collect.updateInventory(); Input.endStep(); return; }
    if (this.scene === 'cg') { CGView.update(); Input.endStep(); return; }
    if (this.scene === 'results') {
      if (Input.wasPressed('KeyR')) { this.resultsIdle = 0; this.reset(); this.scene = 'play'; AudioSys.playBgm('castle'); }
      else if (Input.wasPressed('Enter') || Input.wasPressed('Escape')) this.startTitleCinematic();
      else {
        this.resultsIdle += dt;
        if (this.resultsIdle >= RESULTS_IDLE_TO_TITLE) this.startTitleCinematic();
      }
      Input.endStep();
      return;
    }

    if (Input.consume('Escape')) {
      this.paused = !this.paused;
      AudioSys.setPaused(this.paused);
    }
    if (this.paused || this.player.dead || this.completed) {
      if (this.player.dead && !this.paused && Input.consume('Enter')) this.retry();
      else if (Input.consume('KeyR')) { this.reset(); AudioSys.playBgm('castle'); }
      Input.endStep();
      return;
    }
    this.runStats.time += dt;
    if (Input.wasPressed('Tab') && !(this.boss && this.boss.dying)) { Collect.openInventory(); Input.endStep(); return; }
    if (FX.hitstop > 0) {
      FX.hitstop = Math.max(0, FX.hitstop - dt);
      FX.update(dt * 0.15, this.player);
      return;
    }
    this.player.update(dt, this);
    if (!this.player.dead) {
      if (this.boss) this.boss.update(dt, this);
      for (const e of this.enemies) e.update(dt, this);
      for (const b of this.projectiles) {
        b.update(dt, this);
        if (!b.dead && !b.reflected && overlap(this.player, b.box)) {
          const result = this.player.takeDamage(b.contactDmg, b, !!b.unblockable);
          if (result !== 'parry') b.pop();
        }
      }
      for (const e of this.enemies) {
        if (!e.dead && e.state !== 'stun' && overlap(this.player, e.box)) this.player.takeDamage(e.contactDmg, e);
      }
      if (this.boss && !this.boss.dead && this.boss.state !== 'transform' && this.boss.contactDmg > 0 && overlap(this.player, this.boss.box)) {
        this.player.takeDamage(this.boss.contactDmg, this.boss);
      }
      if (!this.player.dead && Input.wasPressed('KeyW')) this.interact();
    }
    Collect.updatePickups();
    this.projectiles = this.projectiles.filter((b) => !b.dead);
    for (const d of this.dummies) d.update(dt);
    FX.update(dt, this.player);
    for (const s of this.level.signs) {
      s.a = approach(s.a || 0, Math.abs(this.player.cx - s.x) < 110 ? 1 : 0, dt * 5);
    }
    const target = clamp(this.player.cx - W / 2 + this.player.face * 80, 0, this.level.width - W);
    this.camX += (target - this.camX) * Math.min(1, dt * 5);
    Input.endStep();
  },

  startTitleCinematic() {
    this.resultsIdle = 0;
    this.titleCinematic = { t: 0 };
    this.scene = 'titleCinematic';
  },

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#07030a'; ctx.fillRect(0, 0, W, H);
    if (this.scene === 'title') { this.drawTitle(ctx); return; }
    if (this.scene === 'titleCinematic') { this.drawTitleCinematic(ctx); return; }
    if (this.scene === 'gallery') { Gallery.draw(ctx); return; }
    if (this.scene === 'cg') { CGView.draw(ctx); return; }

    this.drawBackground(ctx);
    const [ox, oy] = FX.offset();
    ctx.save();
    ctx.translate(Math.round(-this.camX + ox), Math.round(oy));
    drawLevel(ctx, this.level, null, this.camX);
    Collect.drawAltar(ctx);
    Collect.drawPickups(ctx);
    for (const s of this.level.signs) drawSign(ctx, s);
    for (const d of this.dummies) d.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    if (this.boss) this.boss.draw(ctx);
    for (const b of this.projectiles) b.draw(ctx);
    this.player.draw(ctx);
    FX.draw(ctx, 'world');
    ctx.restore();
    FX.draw(ctx, 'screen');

    if (this.scene === 'dialogue') { Dialogue.draw(ctx); return; }
    if (this.scene === 'choice') { Choice.draw(ctx); return; }
    if (this.scene === 'inventory') { Collect.drawInventory(ctx); return; }
    if (this.scene === 'results') { this.drawResults(ctx); return; }

    if (!this.completed) { drawScreenCorners(ctx, 0.50, 60); drawHUD(ctx, this.player); }
    if (this.paused) this.drawOverlay(ctx, '暂 停', 'Esc 继续　　Tab 背包　　R 从教学区重新开始');
    else if (this.player.dead) this.drawOverlay(ctx, '血 尽', this.phase === 'boss'
      ? `Enter 在 Boss 房满血重开 · 死亡 ${this.stats.deaths} 次`
      : `Enter 在「${this.checkpoint.name}」重试 · 死亡 ${this.stats.deaths} 次`);
  },

  drawTitleCinematic(ctx) {
    const c = this.titleCinematic;
    if (!c) return;
    const t = c.t;
    if (t < 1.6) {
      this.drawResults(ctx);
      const a = clamp(t / 1.6, 0, 1);
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = '#050208';
      ctx.fillRect(0, 0, W, H);
    }

    const reveal = clamp((t - 0.8) / 1.8, 0, 1);
    if (reveal <= 0) return;
    const fadeOut = 1 - clamp((t - 3.9) / 1.2, 0, 1);
    ctx.save();
    ctx.globalAlpha = reveal * fadeOut;
    const glow = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 340);
    glow.addColorStop(0, 'rgba(255,45,85,0.16)');
    glow.addColorStop(1, 'rgba(255,45,85,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const img = Assets.images.titleLogo;
    if (img) {
      const baseH = H * 0.32;
      const baseW = img.width / img.height * baseH;
      const grow = 1 + Math.min(1, Math.max(0, t - 2.8)) * 0.14;
      const w = baseW * grow, h = baseH * grow;
      ctx.shadowColor = 'rgba(255,45,85,0.5)';
      ctx.shadowBlur = 26;
      ctx.drawImage(img, W / 2 - w / 2, H / 2 - h / 2, w, h);
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.font = `bold 64px ${FONT}`;
      ctx.fillText('血 月 之 约', W / 2, H / 2 + 20);
    }
    ctx.restore();

    if (t > 4.6) {
      const a = clamp((t - 4.6) / 0.8, 0, 1);
      ctx.fillStyle = `rgba(0,0,0,${a * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  },

  pointerPos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  },

  titleHit(x, y) {
    if (x >= W / 2 - 130 && x <= W / 2 + 130 && y >= 348 && y <= 432) return 'start';
    if (y >= 438 && y <= 472) {
      if (x >= W / 2 - 96 && x <= W / 2 - 16) return 'endings';
      if (x >= W / 2 + 16 && x <= W / 2 + 96) return 'cg';
    }
    return null;
  },

  titleClick(x, y) {
    const hit = this.titleHit(x, y);
    if (!hit) return null;
    if (hit === 'start') this.startGame();
    else Gallery.open(hit === 'endings' ? 'endings' : 'cg');
    return hit;
  },

  onPointerDown(e) {
    const p = this.pointerPos(e);
    if (this.scene === 'title') {
      this.titleClick(p.x, p.y);
      return;
    }
    if (this.scene === 'gallery' && typeof Gallery !== 'undefined') {
      const hit = Gallery.hitTest(p.x, p.y);
      if (hit && hit.kind === 'cg') {
        Gallery.index = hit.index;
        Gallery.openCg(hit.index);
      } else if (hit && hit.kind === 'ending') {
        Gallery.index = hit.index;
        Gallery.replayEnding(GALLERY_ENDINGS[hit.index].id);
      }
    }
  },

  onPointerMove(e) {
    const p = this.pointerPos(e);
    let clickable = false;
    if (this.scene === 'title') {
      this.titleHover = this.titleHit(p.x, p.y);
      clickable = !!this.titleHover;
    } else if (this.scene === 'gallery' && typeof Gallery !== 'undefined') {
      const hit = Gallery.hitTest(p.x, p.y);
      clickable = !!(hit && hit.clickable);
    }
    this.canvas.style.cursor = clickable ? 'pointer' : 'default';
  },

  onPointerLeave() {
    this.titleHover = null;
    if (this.canvas) this.canvas.style.cursor = 'default';
  },

  drawTitleMenu(ctx) {
    const cx = W / 2, y = 452;
    const labels = [{ id: 'endings', label: '结局', x: cx - 56 }, { id: 'cg', label: '收藏', x: cx + 56 }];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    for (const it of labels) {
      const hover = this.titleHover === it.id;
      ctx.font = `16px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = hover ? 1 : 0.9;
      ctx.fillText(it.label, it.x, y);
      if (hover) {
        ctx.globalAlpha = 0.8;
        ctx.fillRect(it.x - 18, y + 6, 36, 1);
      }
    }
    ctx.globalAlpha = 0.42;
    ctx.font = `13px ${FONT}`;
    ctx.fillText('·', cx, y);
    ctx.globalAlpha = 0.52;
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#f3dce4';
    ctx.fillText('AD 移动 · 空格二段跳 · J 连击 · K 冲刺 · L 爆发 · I 血月 · F 弹反', cx, 502);
    ctx.fillText('W 交互 · S 下跳 · Tab 背包 · Esc 暂停 · M 静音', cx, 524);
    if (this.titleHover === 'start') {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 92, 430, 184, 1);
    }
    ctx.restore();
  },

  drawTitle(ctx) {
    const cover = Assets.images.titleCover;
    if (cover) {
      const s = Math.max(W / cover.width, H / cover.height);
      const dw = cover.width * s, dh = cover.height * s;
      ctx.drawImage(cover, (W - dw) / 2, (H - dh) / 2, dw, dh);

      const shade = ctx.createLinearGradient(0, H * 0.50, 0, H);
      shade.addColorStop(0, 'rgba(5,2,8,0)');
      shade.addColorStop(1, 'rgba(5,2,8,0.72)');
      ctx.fillStyle = shade; ctx.fillRect(0, H * 0.50, W, H * 0.50);

      this.drawTitleMenu(ctx);
      drawScreenCorners(ctx, 0.78, 90);
      return;
    }

    const bg = Assets.images.titleBg;
    if (bg) {
      const s = Math.max(W / bg.width, H / bg.height);
      const dw = bg.width * s, dh = bg.height * s;
      ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#170914'); g.addColorStop(1, '#050208');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(5,2,8,0.55)');
    shade.addColorStop(0.55, 'rgba(5,2,8,0.25)');
    shade.addColorStop(1, 'rgba(5,2,8,0.9)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);

    const lillian = Assets.images.portraitLillian;
    if (lillian) {
      const h = 430, w = lillian.width / lillian.height * h;
      ctx.save(); ctx.globalAlpha = 0.92; ctx.drawImage(lillian, 34, H - h + 6, w, h); ctx.restore();
    }
    const camilla = Assets.images.portraitCamilla;
    if (camilla) {
      const h = 430, w = camilla.width / camilla.height * h;
      ctx.save(); ctx.globalAlpha = 0.94; ctx.drawImage(camilla, W - w - 34, H - h + 6, w, h); ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5577'; ctx.font = `bold 64px ${FONT}`;
    ctx.fillText('血 月 之 约', W / 2, 188);
    ctx.fillStyle = '#f3dce4'; ctx.font = `13px ${FONT}`;
    ctx.fillText('B L O O D   M O O N   P A C T', W / 2, 218);
    this.drawTitleMenu(ctx);
    drawScreenCorners(ctx, 0.78, 90);
  },

  drawResults(ctx) {
    const r = this.results || {
      time: this.runStats.time,
      kills: this.runStats.kills,
      deaths: this.runStats.deaths,
      rank: rankFor(this.runStats.time, this.runStats.deaths),
      memories: Collect.restoredCount(), memoriesTotal: MEMORIES.length,
      keepsakes: Collect.keepsakeCount(), keepsakesTotal: KEEPSAKES.length,
      hidden: Collect.hiddenCount(),
      ending: '—', endingSubtitle: '',
    };
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(0, 0, W, H);
    const pw = 680, ph = 440, px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = 'rgba(18, 7, 16, 0.97)'; ctx.fillRect(px, py, pw, ph);
    if (Assets.images.dialogFrame) {
      drawNineSlice(ctx, Assets.images.dialogFrame, px, py, pw, ph, 220, 54);
    } else {
      ctx.strokeStyle = '#8a2040'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5577'; ctx.font = `bold 28px ${FONT}`;
    ctx.fillText('深渊领主已击败', W / 2, py + 48);
    ctx.fillStyle = '#b18aab'; ctx.font = `13px ${FONT}`;
    ctx.fillText('讨 伐 完 成', W / 2, py + 72);

    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'left'; ctx.fillStyle = '#8d7188';
    ctx.fillText('战斗', px + 50, py + 108);
    ctx.fillText('收集', px + 350, py + 108);

    const leftRows = [
      ['通关用时', formatTime(r.time)],
      ['击杀数', String(r.kills)],
      ['死亡次数', String(r.deaths)],
    ];
    const rightRows = [
      ['记忆', `${r.memories} / ${r.memoriesTotal}`],
      ['遗物', `${r.keepsakes} / ${r.keepsakesTotal}`],
      ['隐藏', `${r.hidden} / 1`],
    ];
    ctx.font = `16px ${FONT}`;
    leftRows.forEach(([label, value], i) => {
      const y = py + 142 + i * 34;
      ctx.textAlign = 'left'; ctx.fillStyle = '#b18aab'; ctx.fillText(label, px + 50, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#f3dce4'; ctx.fillText(value, px + 300, y);
      ctx.strokeStyle = 'rgba(177, 138, 171, 0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px + 50, y + 11); ctx.lineTo(px + 300, y + 11); ctx.stroke();
    });
    rightRows.forEach(([label, value], i) => {
      const y = py + 142 + i * 34;
      ctx.textAlign = 'left'; ctx.fillStyle = '#b18aab'; ctx.fillText(label, px + 350, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#f3dce4'; ctx.fillText(value, px + 620, y);
      ctx.strokeStyle = 'rgba(177, 138, 171, 0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px + 350, y + 11); ctx.lineTo(px + 620, y + 11); ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(255, 209, 102, 0.22)';
    ctx.beginPath(); ctx.moveTo(px + 50, py + 248); ctx.lineTo(px + 630, py + 248); ctx.stroke();

    ctx.textAlign = 'left'; ctx.fillStyle = '#b18aab'; ctx.font = `16px ${FONT}`;
    ctx.fillText('结局', px + 50, py + 280);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd166'; ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(r.ending, px + 630, py + 280);
    ctx.textAlign = 'center'; ctx.fillStyle = '#b18aab'; ctx.font = `13px ${FONT}`;
    if (r.endingSubtitle) ctx.fillText(r.endingSubtitle, W / 2, py + 302);

    const cx = W / 2, cy = py + 370;
    ctx.textAlign = 'center'; ctx.fillStyle = '#8d7188'; ctx.font = `12px ${FONT}`;
    ctx.fillText('评 价', cx, py + 320);
    const rankImg = Assets.images['rank' + r.rank];
    if (rankImg) {
      const ih = 84, iw = rankImg.width / rankImg.height * ih;
      ctx.save();
      ctx.shadowColor = 'rgba(255,45,85,0.45)'; ctx.shadowBlur = 16;
      ctx.drawImage(rankImg, cx - iw / 2, cy - ih / 2, iw, ih);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffd166'; ctx.font = `bold 42px ${FONT}`;
      ctx.textAlign = 'center'; ctx.fillText(r.rank, cx, cy + 16);
    }

    ctx.fillStyle = '#8d7188'; ctx.font = `12px ${FONT}`;
    ctx.fillText('R 重新开始 · Enter 返回封面（含过场）· 闲置 10 秒自动', W / 2, py + ph - 14);
  },

  drawBackground(ctx) {
    if (!this.bgLayer) this.buildBgLayer();
    const off = -Math.round((this.camX * 0.25) % this.bgLayer.width);
    for (let x = off; x < W; x += this.bgLayer.width) ctx.drawImage(this.bgLayer, x, 0);
  },

  drawOverlay(ctx, title, subtitle) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ff5577'; ctx.font = `bold 38px ${FONT}`;
    ctx.fillText(title, W / 2, H / 2 - 40);
    ctx.fillStyle = '#f3dce4'; ctx.font = `18px ${FONT}`;
    ctx.fillText(subtitle, W / 2, H / 2 + 10);
    ctx.font = `13px ${FONT}`;
    ctx.fillText('AD 移动 · W 交互 · S 下跳 · 空格二段跳 · J 连击 · K 冲刺 · L 爆发 · I 血月 · F 格挡/弹反 · Tab 背包', W / 2, H / 2 + 52);
  },

  drawLoading(done = 0, total = 0, label = '') {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = '#07030a'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5577'; ctx.font = `bold 34px ${FONT}`;
    ctx.fillText('血 月 之 约', W / 2, H / 2 - 48);
    ctx.fillStyle = '#f3dce4'; ctx.font = `16px ${FONT}`;
    ctx.fillText(total ? `加载中… ${done} / ${total}` : '加载中…', W / 2, H / 2 + 2);
    const bw = 320, bh = 6, bx = W / 2 - bw / 2, by = H / 2 + 22;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ff5577';
    ctx.fillRect(bx, by, bw * (total ? Math.min(1, done / total) : 0), bh);
    if (label) {
      ctx.fillStyle = '#b18aab'; ctx.font = `12px ${FONT}`;
      ctx.fillText(label, W / 2, H / 2 + 54);
    }
    ctx.fillStyle = '#8d7188'; ctx.font = `12px ${FONT}`;
    ctx.fillText('首次进入需下载素材，网络较慢时请稍候', W / 2, H / 2 + 80);
  },
};

Game.start().catch((e) => {
  console.error(e);
  Game.drawOverlay(Game.ctx, '加载失败', '请确认素材目录完整，并使用 Edge / Chrome 打开 index.html');
});
