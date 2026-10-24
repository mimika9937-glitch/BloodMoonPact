const GALLERY_CGS = [
  { id: 'opening', path: 'assets/cg/cg_opening_ritual.png', name: '圣血仪式', desc: '血月升起，深渊领主以公主的圣血开启仪式。', story: '卡蜜拉破门而入时，仪式已经开始了。她看见莉莉安的身体被圣光托起，像一片随时会碎的雪。' },
  { id: 'snow', path: MEMORIES[0].cg, name: MEMORIES[0].name, desc: MEMORIES[0].desc, story: '莉莉安把灯举近时，卡蜜拉第一次没有因为人类靠近而后退。她记住了那盏灯，也记住了那只没有拿银器的手。' },
  { id: 'tea', path: MEMORIES[1].cg, name: MEMORIES[1].name, desc: MEMORIES[1].desc, story: '那天的茶凉得很慢。莉莉安把最后一颗方糖推给卡蜜拉，卡蜜拉说自己不喝甜的东西，却还是把它收进了口袋。' },
  { id: 'dance', path: MEMORIES[2].cg, name: MEMORIES[2].name, desc: MEMORIES[2].desc, story: '音乐盒只响了一小段。她们在空荡的舞厅里转了三圈，谁也没有提窗外越来越近的血月。' },
  { id: 'ribbon', path: KEEPSAKES[0].cg, name: KEEPSAKES[0].name, desc: KEEPSAKES[0].desc, story: '莉莉安系丝带时打了个很松的结，说这样卡蜜拉随时可以解开。卡蜜拉一直没有解。' },
  { id: 'musicbox', path: KEEPSAKES[1].cg, name: KEEPSAKES[1].name, desc: KEEPSAKES[1].desc, story: '音乐盒的曲子很短。卡蜜拉后来在很多个雪夜里把它上满发条，听完，再上满。' },
  { id: 'hairpin', path: HIDDEN_ITEM.cg, name: HIDDEN_ITEM.name, desc: HIDDEN_ITEM.desc, story: '发饰别进头发的时候，卡蜜拉听见自己心跳了一下。她装作没有听见。' },
  { id: 'fall', path: 'assets/cg/cg_princess_fall.png', name: '倒下的手', desc: '深渊领主陨落后，莉莉安倒在碎裂的祭坛边，向卡蜜拉伸出手。', story: '王座厅安静下来后，莉莉安的手还朝着门的方向。卡蜜拉握住它时，圣光已经冷了，但她没有松开。' },
  { id: 'true', path: 'assets/cg/cg_true_ending.png', name: '血月之约', desc: '血月碎裂，晨光里，她们终于牵住了彼此。', story: '血月碎裂的清晨，卡蜜拉第一次觉得阳光不刺眼。因为有人替她记住了雪夜，也答应记住以后。' },
];

const GALLERY_ENDINGS = [
  { id: 'bad', cond: '修复记忆 ≤ 1，或接受深渊' },
  { id: 'normal', cond: '修复 2 段记忆，或选择转身离开' },
  { id: 'happy', cond: '修复 3 段记忆并握住她的手' },
  { id: 'true', cond: '3 段记忆 + 2 件遗物 + 隐藏发饰 + 交换血约' },
].map((e) => ({ ...e, name: ENDINGS[e.id].name, sub: ENDINGS[e.id].subtitle }));

const Gallery = {
  inited: false,
  mode: 'endings',
  index: 0,
  resetNote: 0,
  seenCg: new Set(),
  seenEndings: new Set(),

  init() {
    if (this.inited) return;
    this.inited = true;
    this.seenCg = this.load('bmp_seen_cg');
    this.seenEndings = this.load('bmp_seen_endings');
  },

  load(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch (e) { return new Set(); }
  },

  save(key, set) {
    try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) { /* file:// may block */ }
  },

  markCg(path) {
    if (!path) return;
    this.seenCg.add(path);
    this.save('bmp_seen_cg', this.seenCg);
  },

  markEnding(id) {
    if (!id) return;
    this.seenEndings.add(id);
    this.save('bmp_seen_endings', this.seenEndings);
  },

  clearSeen() {
    this.seenCg = new Set();
    this.seenEndings = new Set();
    this.save('bmp_seen_cg', this.seenCg);
    this.save('bmp_seen_endings', this.seenEndings);
    this.index = 0;
    this.resetNote = 2;
  },

  cgSeenCount() {
    return GALLERY_CGS.filter((c) => this.seenCg.has(c.path)).length;
  },

  endingSeenCount() {
    return GALLERY_ENDINGS.filter((e) => this.seenEndings.has(e.id)).length;
  },

  progressText() {
    return `CG ${this.cgSeenCount()} / ${GALLERY_CGS.length} · 结局 ${this.endingSeenCount()} / ${GALLERY_ENDINGS.length}`;
  },

  collectedCgs() {
    return GALLERY_CGS.filter((c) => this.seenCg.has(c.path));
  },

  open(mode) {
    this.init();
    this.mode = mode === 'cg' ? 'cg' : 'endings';
    this.index = 0;
    this.detail = null;
    Game.scene = 'gallery';
    AudioSys.playBgm('ending');
    for (const c of this.collectedCgs()) CGView.ensure(c.path);
  },

  update(dt) {
    if (this.resetNote > 0) this.resetNote = Math.max(0, this.resetNote - (dt || 0));
    if (this.mode === 'detail') {
      const list = this.collectedCgs();
      if (!list.length) {
        this.mode = 'cg';
        this.detail = null;
        return;
      }
      if (Input.wasPressed('Escape') || Input.wasPressed('Enter') || Input.wasPressed('Space')) {
        this.index = Math.max(0, GALLERY_CGS.indexOf(this.detail));
        this.mode = 'cg';
        this.detail = null;
        return;
      }
      const pos = Math.max(0, list.indexOf(this.detail));
      if (Input.wasPressed('KeyA') || Input.wasPressed('ArrowLeft')) {
        this.detail = list[(pos + list.length - 1) % list.length];
        CGView.ensure(this.detail.path);
      }
      if (Input.wasPressed('KeyD') || Input.wasPressed('ArrowRight')) {
        this.detail = list[(pos + 1) % list.length];
        CGView.ensure(this.detail.path);
      }
      return;
    }
    if (Input.wasPressed('Escape')) {
      Game.scene = 'title';
      AudioSys.playBgm('ending');
      return;
    }
    if (Input.wasPressed('KeyR') && (Input.isDown('ShiftLeft') || Input.isDown('ShiftRight'))) {
      this.clearSeen();
      return;
    }
    if (this.mode === 'endings') {
      const n = GALLERY_ENDINGS.length;
      if (Input.wasPressed('KeyA') || Input.wasPressed('ArrowLeft')) this.index = (this.index + n - 1) % n;
      if (Input.wasPressed('KeyD') || Input.wasPressed('ArrowRight')) this.index = (this.index + 1) % n;
      if (Input.wasPressed('KeyW') || Input.wasPressed('ArrowUp')) this.index = (this.index + n - 2) % n;
      if (Input.wasPressed('KeyS') || Input.wasPressed('ArrowDown')) this.index = (this.index + 2) % n;
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) this.replayEnding(GALLERY_ENDINGS[this.index].id);
    } else {
      const n = GALLERY_CGS.length;
      if (Input.wasPressed('KeyA') || Input.wasPressed('ArrowLeft')) this.index = (this.index + n - 1) % n;
      if (Input.wasPressed('KeyD') || Input.wasPressed('ArrowRight')) this.index = (this.index + 1) % n;
      if (Input.wasPressed('KeyW') || Input.wasPressed('ArrowUp')) this.index = (this.index + n - 3) % n;
      if (Input.wasPressed('KeyS') || Input.wasPressed('ArrowDown')) this.index = (this.index + 3) % n;
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) this.openCg(this.index);
    }
  },

  replayEnding(id) {
    if (!this.seenEndings.has(id)) return;
    const cast = id === 'bad' ? ['camilla', 'abyss'] : ['lillian', 'camilla'];
    const opts = { cast, backdrop: 'title' };
    if (id === 'true') {
      opts.backdrop = 'cg';
      opts.cg = 'assets/cg/cg_true_ending.png';
    }
    Dialogue.start(STORY.endings[id], () => {
      Game.scene = 'gallery';
      Gallery.mode = 'endings';
    }, opts);
  },

  openCg(index) {
    const c = GALLERY_CGS[index];
    if (!c || !this.seenCg.has(c.path)) return;
    this.mode = 'detail';
    this.detail = c;
    CGView.ensure(c.path);
  },

  hitTest(x, y) {
    if (this.mode === 'cg') {
      for (const h of (this.cgHits || [])) {
        if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
          return { kind: 'cg', index: h.index, clickable: this.seenCg.has(GALLERY_CGS[h.index].path) };
        }
      }
    } else if (this.mode === 'endings') {
      for (const h of (this.endingHits || [])) {
        if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
          return { kind: 'ending', index: h.index, clickable: this.seenEndings.has(GALLERY_ENDINGS[h.index].id) };
        }
      }
    }
    return null;
  },

  drawCover(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  },

  draw(ctx) {
    if (this.mode === 'detail') { this.drawDetail(ctx); return; }
    const bg = Assets.images.titleCover;
    if (bg) this.drawCover(ctx, bg, 0, 0, W, H);
    else { ctx.fillStyle = '#0a0610'; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = 'rgba(5,2,8,0.84)';
    ctx.fillRect(0, 0, W, H);

    const pw = 880, ph = 520, px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = 'rgba(13,5,13,0.96)';
    ctx.fillRect(px, py, pw, ph);
    const frame = Assets.images.dialogFrameOpen || Assets.images.dialogFrame;
    if (frame) drawNineSlice(ctx, frame, px, py, pw, ph, 220, 40);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(this.mode === 'cg' ? 'CG 鉴赏' : '结局图鉴', px + 44, py + 46);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#b18aab';
    ctx.font = `12px ${FONT}`;
    ctx.fillText(this.progressText(), px + pw - 44, py + 44);

    if (this.mode === 'cg') this.drawCgs(ctx, px, py, pw, ph);
    else this.drawEndings(ctx, px, py, pw, ph);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8d7188';
    ctx.font = `12px ${FONT}`;
    ctx.fillText(this.mode === 'cg' ? '方向键选择 · Enter 查看 · Esc 返回' : '方向键选择 · Enter 回看结局 · Esc 返回', W / 2, py + ph - 8);
    if (this.resetNote > 0) {
      ctx.fillStyle = '#7dffb0';
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText('收集记录已清空', W / 2, py + ph - 32);
    }
    drawScreenCorners(ctx, 0.45, 56);
  },

  drawEndings(ctx, px, py, pw, ph) {
    const cw = 370, ch = 150, gap = 20;
    const x0 = px + 44, y0 = py + 78;
    this.endingHits = [];
    GALLERY_ENDINGS.forEach((e, i) => {
      const x = x0 + (i % 2) * (cw + gap);
      const y = y0 + Math.floor(i / 2) * (ch + gap);
      this.endingHits.push({ x, y, w: cw, h: ch, index: i });
      const selected = i === this.index;
      const seen = this.seenEndings.has(e.id);
      ctx.fillStyle = selected ? 'rgba(138,32,64,0.42)' : 'rgba(255,255,255,0.035)';
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = selected ? '#ffd166' : 'rgba(177,138,171,0.2)';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);

      ctx.textAlign = 'left';
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillStyle = !seen ? '#6f5d6a' : selected ? '#ffd166' : '#f3dce4';
      ctx.fillText(seen ? e.name : '???', x + 18, y + 38);
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = seen ? '#b18aab' : '#5b4b58';
      ctx.fillText(seen ? e.sub : '???', x + 18, y + 64);
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = '#8d7188';
      Dialogue.wrap(ctx, seen ? e.cond : '达成后可在此回看此结局。', cw - 36).slice(0, 2).forEach((line, li) => ctx.fillText(line, x + 18, y + 104 + li * 17));

      ctx.textAlign = 'right';
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = seen ? '#7dffb0' : '#6f5d6a';
      ctx.fillText(seen ? '已达成' : '未达成', x + cw - 16, y + 24);
    });
  },

  drawCgs(ctx, px, py, pw, ph) {
    this.cgHits = [];
    const cols = 3, cw = 220, ch = 124, gx = 12, gy = 10;
    const y0 = py + 66;
    GALLERY_CGS.forEach((c, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const x = px + (pw - (cols * cw + (cols - 1) * gx)) / 2 + col * (cw + gx);
      const y = y0 + row * (ch + gy);
      this.cgHits.push({ x, y, w: cw, h: ch, index: i });
      const selected = i === this.index;
      const seen = this.seenCg.has(c.path);
      const img = CGView.cache[c.path];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cw, ch);
      ctx.clip();
      const g = ctx.createLinearGradient(x, y, x, y + ch);
      g.addColorStop(0, seen ? '#241020' : '#1a0f16');
      g.addColorStop(1, '#0a0610');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, cw, ch);
      if (seen) {
        CGView.ensure(c.path);
        if (img && img.complete && img.naturalWidth > 0) {
          this.drawCover(ctx, img, x, y, cw, ch);
        } else {
          ctx.textAlign = 'center';
          ctx.font = `12px ${FONT}`;
          ctx.fillStyle = '#6f5d6a';
          ctx.fillText('加载中…', x + cw / 2, y + ch / 2 + 4);
        }
      } else {
        ctx.textAlign = 'center';
        ctx.font = `bold 30px ${FONT}`;
        ctx.fillStyle = '#6f5d6a';
        ctx.fillText('???', x + cw / 2, y + ch / 2 + 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(x, y + ch - 24, cw, 24);
      ctx.textAlign = 'left';
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = seen ? '#f3dce4' : '#6f5d6a';
      ctx.fillText(seen ? c.name : '???', x + 8, y + ch - 8);
      if (selected) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
      }
      ctx.restore();
    });

    const cur = GALLERY_CGS[Math.min(this.index, GALLERY_CGS.length - 1)];
    const curSeen = this.seenCg.has(cur.path);
    ctx.textAlign = 'left';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = curSeen ? '#ffd166' : '#6f5d6a';
    ctx.fillText(curSeen ? cur.name : '???', px + 44, py + ph - 46);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#8d7188';
    ctx.fillText(curSeen ? '点击 / Enter 查看 CG 介绍' : '未收集 · 在冒险中拾取、修复或触发剧情后解锁', px + 44, py + ph - 26);
  },

  drawDetail(ctx) {
    const c = this.detail;
    if (!c) { this.mode = 'cg'; return; }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07040a');
    g.addColorStop(0.55, '#1a0810');
    g.addColorStop(1, '#050208');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H * 0.34, 10, W / 2, H * 0.34, 360);
    glow.addColorStop(0, 'rgba(180,30,55,0.18)');
    glow.addColorStop(1, 'rgba(180,30,55,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const iw = 620, ih = 349, ix = (W - iw) / 2, iy = 22;
    CGView.ensure(c.path);
    const img = CGView.cache[c.path];
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip();
    if (img && img.complete && img.naturalWidth > 0) {
      this.drawCover(ctx, img, ix, iy, iw, ih);
    } else {
      drawCgPlaceholder(ctx, 'CG 待补');
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(206,172,104,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
    for (const [dx, dy] of [[ix + 7, iy + 7], [ix + iw - 7, iy + 7], [ix + 7, iy + ih - 7], [ix + iw - 7, iy + ih - 7]]) {
      ctx.fillStyle = 'rgba(206,172,104,0.75)';
      ctx.beginPath();
      ctx.moveTo(dx, dy - 3); ctx.lineTo(dx + 3, dy); ctx.lineTo(dx, dy + 3); ctx.lineTo(dx - 3, dy);
      ctx.closePath(); ctx.fill();
    }

    const px = 70, py = 386, pw = 820, ph = 136;
    ctx.fillStyle = 'rgba(13,5,13,0.94)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(206,172,104,0.35)';
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

    const list = this.collectedCgs();
    ctx.textAlign = 'left';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = '#ffd166';
    ctx.fillText(c.name, px + 24, py + 28);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#b18aab';
    Dialogue.wrap(ctx, c.desc, pw - 170).slice(0, 1).forEach((line) => ctx.fillText(line, px + 24, py + 54));
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8d7188';
    ctx.font = `11px ${FONT}`;
    ctx.fillText(`${String(list.indexOf(c) + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`, px + pw - 24, py + 26);

    ctx.strokeStyle = 'rgba(177,138,171,0.18)';
    ctx.beginPath(); ctx.moveTo(px + 24, py + 66); ctx.lineTo(px + pw - 24, py + 66); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = '#f3dce4';
    Dialogue.wrap(ctx, c.story, pw - 48).slice(0, 2).forEach((line, i) => ctx.fillText(line, px + 24, py + 90 + i * 18));

    ctx.textAlign = 'right';
    ctx.fillStyle = '#8d7188';
    ctx.font = `11px ${FONT}`;
    ctx.fillText('← → 切换 · Enter / Esc 返回', px + pw - 24, py + ph - 10);
    drawScreenCorners(ctx, 0.45, 56);
  },
};
