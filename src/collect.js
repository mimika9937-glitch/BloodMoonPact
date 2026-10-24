const Collect = {
  reset() {
    Game.collection = {
      memories: MEMORIES.map((m) => ({ ...m, found: false, restored: false })),
      keepsakes: KEEPSAKES.map((k) => ({ ...k, found: false })),
      hidden: { ...HIDDEN_ITEM, found: false },
      coins: 0,
    };
    Game.inventoryIndex = 0;
    this.bossDropIndex = 0;
  },

  restoredCount() {
    return Game.collection ? Game.collection.memories.filter((m) => m.restored).length : 0;
  },
  keepsakeCount() {
    return Game.collection ? Game.collection.keepsakes.filter((k) => k.found).length : 0;
  },
  hiddenCount() {
    return Game.collection && Game.collection.hidden.found ? 1 : 0;
  },

  canPick(item) {
    if (item.taken) return false;
    if (item.type === 'coin') return true;
    if (item.type === 'boss_orb' || item.type === 'boss_ward') return !!(Game.boss && !Game.boss.dead);
    if (item.type === 'memory') return !Game.collection.memories.find((m) => m.id === item.id).found;
    if (item.type === 'keepsake') return !Game.collection.keepsakes.find((k) => k.id === item.id).found;
    if (item.type === 'hidden') return !Game.collection.hidden.found;
    return false;
  },

  pick(item) {
    item.taken = true;
    if (item.type === 'coin') {
      this.addCoins(item.amount, item.x, item.y - 12);
      return;
    }
    if (item.type === 'memory') {
      const m = Game.collection.memories.find((m) => m.id === item.id);
      if (m && !m.found) {
        m.found = true;
        if (typeof Gallery !== 'undefined') Gallery.markCg(m.cg);
        AudioSys.sfxPlay('pickup');
        FX.ring(item.x, item.y, 34, '#ff5577', 0.5);
        FX.text(item.x, item.y - 18, `获得记忆碎片：${m.name}`, '#ff8aa6', 15);
      }
      return;
    }
    if (item.type === 'keepsake') {
      const k = Game.collection.keepsakes.find((k) => k.id === item.id);
      if (k && !k.found) {
        k.found = true;
        if (typeof Gallery !== 'undefined') Gallery.markCg(k.cg);
        AudioSys.sfxPlay('pickup', { rate: 1.08 });
        FX.ring(item.x, item.y, 34, '#ffd166', 0.5);
        FX.text(item.x, item.y - 18, `获得遗物：${k.name}`, '#ffd166', 15);
      }
      return;
    }
    if (item.type === 'boss_orb') {
      if (Game.boss && !Game.boss.dead) {
        Game.boss.hit(30, { direct: true });
        AudioSys.sfxPlay('hit_heavy', { rate: 0.85 });
        FX.ring(Game.boss.cx, Game.boss.cy, 46, '#ff5577', 0.55);
        FX.text(Game.boss.cx, Game.boss.y - 24, '圣血反噬 -30', '#ff8aa6', 16);
        FX.shake(5, 0.2);
      }
      return;
    }
    if (item.type === 'boss_ward') {
      Game.player.addShield(20);
      return;
    }
    if (item.type === 'hidden' && !Game.collection.hidden.found) {
      Game.collection.hidden.found = true;
      if (typeof Gallery !== 'undefined') Gallery.markCg(Game.collection.hidden.cg);
      AudioSys.sfxPlay('secret');
      FX.ring(item.x, item.y, 40, '#c9d6e2', 0.6);
      FX.text(item.x, item.y - 18, `发现隐藏信物：${Game.collection.hidden.name}`, '#c9d6e2', 15);
    }
  },

  updatePickups() {
    const p = Game.player;
    if (!p || !Game.level || !Game.level.pickups) return;
    for (const item of Game.level.pickups) {
      if (!this.canPick(item)) continue;
      if (Math.abs(p.cx - item.x) < 28 && Math.abs(p.cy - item.y) < 38) this.pick(item);
    }
  },

  drawPickups(ctx) {
    if (!Game.level || !Game.level.pickups) return;
    const t = performance.now() / 1000;
    for (const item of Game.level.pickups) {
      if (!this.canPick(item)) continue;
      const y = item.y + Math.sin(t * 2.2 + item.x * 0.02) * 3;
      const color = item.type === 'memory' ? '#ff5577'
        : item.type === 'keepsake' ? '#ffd166'
        : item.type === 'hidden' ? '#c9d6e2'
        : item.type === 'boss_orb' ? '#ff5577'
        : item.type === 'boss_ward' ? '#7fd4ff' : '#ffcc66';
      ctx.save();
      ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.fillStyle = color;
      if (item.type === 'coin') {
        ctx.beginPath(); ctx.arc(item.x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8a5a18'; ctx.beginPath(); ctx.arc(item.x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      } else if (item.type === 'boss_ward') {
        ctx.beginPath();
        ctx.moveTo(item.x, y - 11); ctx.lineTo(item.x + 9, y - 6);
        ctx.lineTo(item.x + 7, y + 6); ctx.lineTo(item.x, y + 11);
        ctx.lineTo(item.x - 7, y + 6); ctx.lineTo(item.x - 9, y - 6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(5,20,30,0.55)';
        ctx.fillRect(item.x - 1.5, y - 7, 3, 14);
        ctx.fillRect(item.x - 5, y - 1.5, 10, 3);
      } else {
        ctx.beginPath();
        ctx.moveTo(item.x, y - 10); ctx.lineTo(item.x + 8, y); ctx.lineTo(item.x, y + 10); ctx.lineTo(item.x - 8, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(item.x - 2, y - 4, 4, 8);
      }
      ctx.restore();
      if (Math.abs(Game.player.cx - item.x) < 46) {
        ctx.textAlign = 'center';
        ctx.font = `12px ${FONT}`;
        ctx.fillStyle = '#f3dce4';
        const label = item.type === 'memory' ? '记忆碎片'
          : item.type === 'keepsake' ? '遗物'
          : item.type === 'hidden' ? '隐藏信物'
          : item.type === 'boss_orb' ? '血刃 · Boss -30'
          : item.type === 'boss_ward' ? '血盾 +20'
          : `血币 +${item.amount}`;
        ctx.fillText(label, item.x, y - 24);
      }
    }
  },

  onEnemyKilled(enemy) {
    if (enemy.summoned) return;
    this.addCoins(8 + Math.floor(Math.random() * 7), enemy.cx, enemy.y - 8);
    if (!enemy.drop) return;
    const k = Game.collection.keepsakes.find((k) => k.id === enemy.drop);
    if (!k || k.found) return;
    k.found = true;
    if (typeof Gallery !== 'undefined') Gallery.markCg(k.cg);
    AudioSys.sfxPlay('pickup', { rate: 1.08 });
    FX.ring(enemy.cx, enemy.cy, 40, '#ffd166', 0.5);
    FX.text(enemy.cx, enemy.y - 22, `获得遗物：${k.name}`, '#ffd166', 16);
  },

  dropBossItem(x, y) {
    if (!Game.level) return;
    Game.level.pickups = Game.level.pickups || [];
    const type = (this.bossDropIndex++ % 2 === 0) ? 'boss_orb' : 'boss_ward';
    Game.level.pickups.push({ type, x, y, bossDrop: true });
    FX.ring(x, y, 24, type === 'boss_orb' ? '#ff5577' : '#7fd4ff', 0.45);
  },

  addCoins(n, x, y) {
    Game.collection.coins += n;
    AudioSys.sfxPlay('coin');
    FX.text(x, y, `血币 +${n}`, '#ffd166', 13);
  },

  nearAltar(p) {
    const a = Game.level && Game.level.altar;
    return a && Math.abs(p.cx - a.x) < 58 && Math.abs(p.feet - GROUND_Y) < 14;
  },

  drawAltar(ctx) {
    const a = Game.level && Game.level.altar;
    if (!a) return;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.fillStyle = '#273232';
    ctx.fillRect(a.x - 26, GROUND_Y - 34, 52, 34);
    ctx.fillStyle = '#3f5050';
    ctx.fillRect(a.x - 32, GROUND_Y - 42, 64, 10);
    ctx.strokeStyle = '#7d8a73'; ctx.lineWidth = 2;
    ctx.strokeRect(a.x - 32, GROUND_Y - 42, 64, 10);
    ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    ctx.moveTo(a.x, GROUND_Y - 86 + Math.sin(t * 2) * 3);
    ctx.lineTo(a.x + 11, GROUND_Y - 64);
    ctx.lineTo(a.x, GROUND_Y - 46);
    ctx.lineTo(a.x - 11, GROUND_Y - 64);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    if (this.nearAltar(Game.player)) {
      ctx.textAlign = 'center';
      ctx.font = `13px ${FONT}`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText('记忆祭坛 · W 修复记忆（30 血币）', a.x, GROUND_Y - 104);
    }
  },

  tryRestore() {
    const m = Game.collection.memories.find((m) => m.found && !m.restored);
    if (!m) {
      FX.text(Game.player.cx, Game.player.y - 16, '没有可修复的记忆', '#b18aab', 15);
      return;
    }
    if (Game.collection.coins < 30) {
      FX.text(Game.player.cx, Game.player.y - 16, '血币不足 · 需要 30', '#ff5577', 15);
      return;
    }
    Game.collection.coins -= 30;
    m.restored = true;
    AudioSys.sfxPlay('altar');
    FX.ring(Game.player.cx, Game.player.cy, 70, '#ff5577', 0.7);
    FX.text(Game.player.cx, Game.player.y - 20, `记忆修复：${m.name}`, '#ff8aa6', 18);
    CGView.open(m, `记忆修复 · ${m.name}`, m.desc, () => { Game.scene = 'play'; });
  },

  inventoryItems() {
    return [
      ...Game.collection.memories.map((m) => ({ ...m, kind: 'memory' })),
      ...Game.collection.keepsakes.map((k) => ({ ...k, kind: 'keepsake' })),
      { ...Game.collection.hidden, kind: 'hidden' },
    ];
  },

  openInventory() {
    Game.scene = 'inventory';
    Game.inventoryIndex = 0;
    AudioSys.pushBgm('ending');
    AudioSys.sfxPlay('ui_ok');
  },

  updateInventory() {
    if (Input.wasPressed('Escape') || Input.wasPressed('Tab')) {
      Game.scene = 'play';
      AudioSys.popBgm();
      AudioSys.sfxPlay('ui_back');
      return;
    }
    const items = this.inventoryItems();
    if (Input.wasPressed('KeyW') || Input.wasPressed('ArrowUp')) { Game.inventoryIndex = (Game.inventoryIndex + items.length - 1) % items.length; AudioSys.sfxPlay('ui_move'); }
    if (Input.wasPressed('KeyS') || Input.wasPressed('ArrowDown')) { Game.inventoryIndex = (Game.inventoryIndex + 1) % items.length; AudioSys.sfxPlay('ui_move'); }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      const item = items[Game.inventoryIndex];
      if (!item.found) return;
      if (item.kind === 'memory' && !item.restored) return;
      AudioSys.sfxPlay('ui_ok');
      CGView.open(item, item.name, item.desc, () => { Game.scene = 'inventory'; });
    }
  },

  drawInventory(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.76)'; ctx.fillRect(0, 0, W, H);
    const pw = 780, ph = 440, px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = 'rgba(16, 6, 16, 0.97)'; ctx.fillRect(px, py, pw, ph);
    const frame = Assets.images.dialogFrameOpen || Assets.images.dialogFrame;
    if (frame) {
      drawNineSlice(ctx, frame, px, py, pw, ph, 220, 54);
    } else {
      ctx.strokeStyle = '#8a2040'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    }

    const plate = Assets.images.namePlate;
    if (plate) {
      const nw = 170, nh = plate.height / plate.width * nw;
      const nx = px + 56, ny = py - nh + 12;
      ctx.fillStyle = 'rgba(16, 6, 16, 0.96)'; ctx.fillRect(nx + 12, ny + 12, nw - 24, nh - 24);
      ctx.drawImage(plate, nx, ny, nw, nh);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5577'; ctx.font = `bold 20px ${FONT}`;
      ctx.fillText('背 包', nx + nw / 2, ny + nh / 2 + 7);
    } else {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff5577'; ctx.font = `bold 24px ${FONT}`;
      ctx.fillText('背 包', px + 34, py + 46);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd166'; ctx.font = `14px ${FONT}`;
    ctx.fillText(`血币 ${Game.collection.coins}`, px + pw - 80, py + 46);

    const items = this.inventoryItems();
    const listX = px + 34, listY = py + 82;
    let y = listY;
    const sections = [['记忆', 'memory'], ['遗物', 'keepsake'], ['隐藏', 'hidden']];
    items.forEach((item, i) => {
      if (i === 0 || items[i - 1].kind !== item.kind) {
        const label = sections.find((s) => s[1] === item.kind)[0];
        ctx.textAlign = 'left'; ctx.fillStyle = '#8d7188'; ctx.font = `12px ${FONT}`;
        ctx.fillText(label, listX, y);
        y += 14;
      }
      const selected = i === Game.inventoryIndex;
      const found = item.found;
      const restored = item.kind === 'memory' && item.restored;
      ctx.fillStyle = selected ? 'rgba(138, 32, 64, 0.45)' : 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(listX, y - 12, 360, 32);
      if (selected) { ctx.strokeStyle = '#ffd166'; ctx.strokeRect(listX + 0.5, y - 11.5, 359, 31); }
      this.drawItemIcon(ctx, item.kind, listX + 18, y + 4);
      ctx.textAlign = 'left';
      ctx.font = `14px ${FONT}`;
      ctx.fillStyle = found ? '#f3dce4' : '#6f5d6a';
      ctx.fillText(found ? item.name : '???', listX + 38, y + 4);
      ctx.textAlign = 'right';
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = !found ? '#6f5d6a' : restored ? '#7dffb0' : item.kind === 'memory' ? '#ff8aa6' : '#ffd166';
      ctx.fillText(!found ? '未发现' : restored ? '已修复' : item.kind === 'memory' ? '破碎' : '已获得', listX + 344, y + 4);
      y += 34;
    });

    const item = items[Game.inventoryIndex];
    const dx = px + 430, dy = py + 100, dw = pw - 466;
    ctx.textAlign = 'left';
    ctx.fillStyle = item.found ? '#ffd166' : '#8d7188';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(item.found ? item.name : '尚未收集', dx, dy);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = '#b18aab';
    const desc = item.found ? item.desc : '在城堡深处寻找它。';
    Dialogue.wrap(ctx, desc, dw).slice(0, 7).forEach((line, i) => ctx.fillText(line, dx, dy + 30 + i * 21));
    ctx.textAlign = 'center';
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#8d7188';
    ctx.fillText('W / S 选择 · Enter 查看 CG · Tab / Esc 返回', px + pw / 2, py + ph - 16);
  },

  drawItemIcon(ctx, kind, x, y) {
    ctx.save();
    ctx.shadowBlur = 8;
    if (kind === 'memory') {
      ctx.fillStyle = '#ff5577'; ctx.shadowColor = '#ff5577';
      ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.fill();
    } else if (kind === 'keepsake') {
      ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166';
      ctx.fillRect(x - 7, y - 6, 14, 12);
      ctx.fillStyle = '#8a5a18'; ctx.fillRect(x - 2, y - 2, 4, 4);
    } else {
      ctx.fillStyle = '#c9d6e2'; ctx.shadowColor = '#c9d6e2';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        const b = a + Math.PI / 5;
        ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        ctx.lineTo(x + Math.cos(b) * 3.5, y + Math.sin(b) * 3.5);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  hudText() {
    const c = Game.collection;
    return `记忆 ${this.restoredCount()}/3 · 遗物 ${this.keepsakeCount()}/2 · 血币 ${c.coins}`;
  },
};

const CGView = {
  cache: {},
  open(item, title, desc, onClose) {
    Game.scene = 'cg';
    Game.cgView = { item, title, desc, onClose };
    if (typeof Gallery !== 'undefined') Gallery.markCg(item.cg);
    AudioSys.pushBgm('ending');
    this.ensure(item.cg);
  },
  ensure(path) {
    if (!path || this.cache[path]) return;
    const img = new Image();
    img.src = path;
    this.cache[path] = img;
  },
  update() {
    if (Input.wasPressed('Enter') || Input.wasPressed('Escape') || Input.wasPressed('Space')) {
      const cb = Game.cgView && Game.cgView.onClose;
      Game.cgView = null;
      AudioSys.sfxPlay('ui_back');
      AudioSys.popBgm();
      if (cb) cb();
    }
  },
  draw(ctx) {
    const v = Game.cgView;
    if (!v) return;
    ctx.fillStyle = '#050208'; ctx.fillRect(0, 0, W, H);
    const img = this.cache[v.item.cg];
    if (img && img.complete && img.naturalWidth > 0) {
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#1b0d1d'); g.addColorStop(0.55, '#3a1424'); g.addColorStop(1, '#0d0710');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ff2d55'; ctx.beginPath(); ctx.arc(W / 2, 150, 76, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.fillStyle = '#f3dce4'; ctx.font = `bold 26px ${FONT}`;
      ctx.fillText(v.item.name, W / 2, 300);
      ctx.fillStyle = '#b18aab'; ctx.font = `14px ${FONT}`;
      ctx.fillText('CG 待补 · 生成后直接替换到 assets/cg/', W / 2, 330);
    }
    const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = grad; ctx.fillRect(0, H * 0.55, W, H * 0.45);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166'; ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(v.title, W / 2, H - 92);
    ctx.fillStyle = '#f3dce4'; ctx.font = `14px ${FONT}`;
    Dialogue.wrap(ctx, v.desc, W - 160).slice(0, 2).forEach((line, i) => ctx.fillText(line, W / 2, H - 64 + i * 20));
    ctx.fillStyle = '#8d7188'; ctx.font = `12px ${FONT}`;
    ctx.fillText('Enter / Esc 返回', W / 2, H - 20);
  },
};
