const Dialogue = {
  start(lines, onEnd, opts) {
    Game.scene = 'dialogue';
    Game.dialogue = {
      lines: lines || [],
      i: 0,
      charT: 0,
      onEnd: onEnd || null,
      backdrop: (opts && opts.backdrop) || 'world',
      cg: (opts && opts.cg) || null,
      fallback: (opts && opts.fallback) || null,
      cast: (opts && opts.cast) || null,
      lastSpeaker: null,
    };
    if (opts && opts.cg && typeof Gallery !== 'undefined') Gallery.markCg(opts.cg);
  },

  update(dt) {
    const d = Game.dialogue;
    if (!d) return;
    const line = d.lines[d.i];
    if (!line) { this.finish(); return; }
    d.charT += dt * 42;
    if (Input.wasPressed('Escape')) { this.finish(); return; }
    const advance = Input.wasPressed('KeyW') || Input.wasPressed('Space') || Input.wasPressed('Enter');
    if (!advance) return;
    if (d.charT < line.text.length) {
      d.charT = line.text.length;
    } else {
      d.i++;
      d.charT = 0;
      AudioSys.sfxPlay('ui_move', { volume: 0.22 });
      if (d.i >= d.lines.length) this.finish();
    }
  },

  finish() {
    const d = Game.dialogue;
    Game.dialogue = null;
    if (d && d.onEnd) d.onEnd();
  },

  draw(ctx) {
    const d = Game.dialogue;
    if (!d) return;
    const line = d.lines[d.i];
    if (!line) return;

    if (d.backdrop === 'cg' && d.cg) {
      CGView.ensure(d.cg);
      const img = CGView.cache[d.cg];
      if (img && img.complete && img.naturalWidth > 0) {
        const s = Math.max(W / img.width, H / img.height);
        const dw = img.width * s, dh = img.height * s;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else if (d.fallback === 'title') {
        const bg = Assets.images.titleBg;
        if (bg) ctx.drawImage(bg, 0, 0, W, H);
      } else if (d.fallback === 'fall') {
        drawCgPlaceholder(ctx, 'CG 待补 · 公主倒下的手');
      }
      ctx.fillStyle = 'rgba(8, 2, 8, 0.55)'; ctx.fillRect(0, 0, W, H);
    } else if (d.backdrop === 'title') {
      const bg = Assets.images.titleBg;
      if (bg) ctx.drawImage(bg, 0, 0, W, H);
      else { ctx.fillStyle = '#120812'; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = 'rgba(8, 2, 8, 0.55)'; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = 'rgba(8, 2, 8, 0.45)'; ctx.fillRect(0, 0, W, H);
    }

    const bx = 26, bw = W - 52, bh = 120, by = H - bh - 22;
    const cgScene = d.backdrop === 'cg' && !!d.cg;
    if (!cgScene) {
      if (d.cast && d.cast.length) {
        this.drawCast(ctx, d, line, by);
      } else {
        const key = { camilla: 'portraitCamilla', lillian: 'portraitLillian', abyss: 'portraitAbyss' }[line.portrait];
        const img = key && Assets.images[key];
        if (img) {
          const pside = line.portrait === 'camilla' ? 1 : -1;
          const ph = 370;
          const pw = img.width / img.height * ph;
          const px = pside > 0 ? 42 : W - pw - 42;
          const py = by - ph + 12;
          ctx.save();
          ctx.globalAlpha = 0.98;
          ctx.drawImage(img, px, py, pw, ph);
          ctx.restore();
        }
      }
    }

    const grad = ctx.createLinearGradient(0, by, 0, by + bh);
    grad.addColorStop(0, 'rgba(13, 5, 13, 0.95)');
    grad.addColorStop(1, 'rgba(24, 9, 22, 0.88)');
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw, bh);
    const frame = Assets.images.dialogFrameOpen || Assets.images.dialogFrame;
    if (frame) {
      drawNineSlice(ctx, frame, bx, by, bw, bh, 220, 38);
    } else {
      ctx.strokeStyle = '#8a2040'; ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    }

    const colors = { 旁白: '#b18aab', 卡蜜拉: '#ff8aa6', 莉莉安: '#ffd166', 深渊领主: '#b58cff' };
    const name = line.speaker || '旁白';
    const plate = Assets.images.namePlate;
    let plateX = bx + 52, plateW = 0;
    if (plate) {
      ctx.font = `bold 15px ${FONT}`;
      plateW = clamp(ctx.measureText(name).width + 86, 138, 190);
      const nh = plate.height / plate.width * plateW;
      plateX = bx + 52;
      const ny = by - nh + 12;
      ctx.fillStyle = 'rgba(13, 5, 13, 0.97)';
      ctx.fillRect(plateX + 14, ny + 10, plateW - 28, nh - 20);
      ctx.drawImage(plate, plateX, ny, plateW, nh);
      ctx.textAlign = 'center';
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillStyle = colors[name] || '#f3dce4';
      ctx.fillText(name, plateX + plateW / 2, ny + nh / 2 + 6);
    } else {
      ctx.font = `bold 17px ${FONT}`;
      plateW = 20 + ctx.measureText(name).width;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(14, 5, 14, 0.96)';
      ctx.fillRect(bx + 18, by - 30, 20 + ctx.measureText(name).width, 30);
      ctx.strokeStyle = '#8a2040'; ctx.strokeRect(bx + 18.5, by - 29.5, 20 + ctx.measureText(name).width, 29);
      ctx.fillStyle = colors[name] || '#f3dce4';
      ctx.fillText(name, bx + 28, by - 8);
    }

    // Slim top rail and diamond studs, matching the reference VN dialogue bar.
    const railY = by + 3;
    const railX0 = plateW ? plateX + plateW + 2 : bx + 60;
    const railX1 = bx + bw - 62;
    if (railX1 > railX0) {
      ctx.strokeStyle = 'rgba(206, 172, 104, 0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(railX0, railY + 1.5);
      ctx.lineTo(railX1, railY + 1.5);
      ctx.stroke();
      for (let x = railX1 - 10; x > railX1 - 132; x -= 30) {
        ctx.fillStyle = 'rgba(13, 5, 13, 0.9)';
        ctx.strokeStyle = 'rgba(206, 172, 104, 0.48)';
        ctx.beginPath();
        ctx.moveTo(x, railY - 1);
        ctx.lineTo(x + 4, railY + 2.5);
        ctx.lineTo(x, railY + 6);
        ctx.lineTo(x - 4, railY + 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    const visible = line.text.slice(0, Math.floor(d.charT));
    const lines = this.wrap(ctx, visible, bw - 96);
    ctx.textAlign = 'left';
    ctx.font = `17px ${FONT}`;
    ctx.fillStyle = '#f6e9ee';
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, bx + 46, by + 40 + i * 24));

    const done = d.charT >= line.text.length;
    if (done && Math.floor(performance.now() / 420) % 2 === 0) {
      const ix = bx + bw - 32, iy = by + bh - 20;
      ctx.fillStyle = 'rgba(230, 196, 128, 0.8)';
      ctx.beginPath();
      ctx.moveTo(ix - 5, iy - 3);
      ctx.lineTo(ix + 5, iy - 3);
      ctx.lineTo(ix, iy + 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.textAlign = 'right';
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = '#8d7188';
    const last = d.i >= d.lines.length - 1;
    ctx.fillText(last ? 'W / 空格 结束 · Esc 跳过' : 'W / 空格 继续 · Esc 跳过', bx + bw - 48, by + bh - 14);
  },

  drawCast(ctx, d, line, boxTop) {
    const sprites = { camilla: 'halfCamilla', lillian: 'halfLillian', abyss: 'halfAbyss' };
    if (line.portrait) d.lastSpeaker = line.portrait;
    const speaker = line.portrait || d.lastSpeaker;
    const narrator = !line.portrait;
    d.cast.slice(0, 2).forEach((id, i) => {
      const img = Assets.images[sprites[id]];
      if (!img) return;
      const h = id === 'abyss' ? 450 : 400;
      const w = img.width / img.height * h;
      const cx = W * (i === 0 ? 0.26 : 0.74);
      const bottom = boxTop + (id === 'abyss' ? 52 : 4);
      const alpha = narrator
        ? (speaker ? (id === speaker ? 0.95 : 0.8) : 0.85)
        : (id === speaker ? 1 : 0.64);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, Math.round(cx - w / 2), Math.round(bottom - h), Math.round(w), Math.round(h));
      ctx.restore();
    });
  },

  wrap(ctx, text, maxW) {
    const out = [];
    let line = '';
    for (const ch of text) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = ch; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  },
};

const Choice = {
  start(prompt, options, onSelect, opts) {
    Game.scene = 'choice';
    Game.choice = {
      prompt, options, index: 0, onSelect,
      backdrop: (opts && opts.backdrop) || null,
      cg: (opts && opts.cg) || null,
    };
  },

  update() {
    const c = Game.choice;
    if (!c) return;
    if (Input.wasPressed('KeyW') || Input.wasPressed('ArrowUp')) { c.index = (c.index + c.options.length - 1) % c.options.length; AudioSys.sfxPlay('ui_move'); }
    if (Input.wasPressed('KeyS') || Input.wasPressed('ArrowDown')) { c.index = (c.index + 1) % c.options.length; AudioSys.sfxPlay('ui_move'); }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      const opt = c.options[c.index];
      Game.choice = null;
      AudioSys.sfxPlay('ui_ok');
      if (c.onSelect) c.onSelect(opt);
    }
  },

  draw(ctx) {
    const c = Game.choice;
    if (!c) return;
    if (c.backdrop === 'cg' && c.cg) {
      CGView.ensure(c.cg);
      const img = CGView.cache[c.cg];
      if (img && img.complete && img.naturalWidth > 0) {
        const s = Math.max(W / img.width, H / img.height);
        const dw = img.width * s, dh = img.height * s;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        drawCgPlaceholder(ctx, 'CG 待补 · 公主倒下的手');
      }
      ctx.fillStyle = 'rgba(5, 2, 8, 0.46)'; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'; ctx.fillRect(0, 0, W, H);
    }
    const pw = 620, ph = 116 + c.options.length * 60, px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = 'rgba(16, 6, 16, 0.97)'; ctx.fillRect(px, py, pw, ph);
    if (Assets.images.dialogFrame) {
      drawNineSlice(ctx, Assets.images.dialogFrame, px, py, pw, ph, 220, 42);
    } else {
      ctx.strokeStyle = '#8a2040'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5577'; ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('最终抉择', W / 2, py + 44);
    ctx.fillStyle = '#b18aab'; ctx.font = `14px ${FONT}`;
    ctx.fillText(c.prompt, W / 2, py + 70);

    c.options.forEach((opt, i) => {
      const y = py + 104 + i * 60;
      const selected = i === c.index;
      ctx.fillStyle = selected ? 'rgba(138, 32, 64, 0.5)' : 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(px + 52, y - 24, pw - 104, 46);
      ctx.strokeStyle = selected ? '#ffd166' : 'rgba(177, 138, 171, 0.2)';
      ctx.strokeRect(px + 52.5, y - 23.5, pw - 105, 45);
      ctx.textAlign = 'left';
      ctx.fillStyle = selected ? '#ffd166' : '#f3dce4';
      ctx.font = `bold 17px ${FONT}`;
      ctx.fillText(opt.label, px + 72, y - 2);
      ctx.fillStyle = selected ? '#e8b7c8' : '#8d7188';
      ctx.font = `12px ${FONT}`;
      ctx.fillText(opt.sub || '', px + 72, y + 16);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8d7188'; ctx.font = `12px ${FONT}`;
    ctx.fillText('W / S 选择 · Enter 确认', W / 2, py + ph - 26);
  },
};
