const HUD_SLOTS = [
  { key: 'J', name: '爪击', cost: 0 },
  { key: 'K', name: '蝙蝠冲刺', cost: SKILLS.K.cost },
  { key: 'L', name: '血之爆发', cost: SKILLS.L.cost },
  { key: 'I', name: '血月降临', cost: SKILLS.I.cost },
];

function drawHUD(ctx, p) {
  const bx = 24, by = 24, bw = 300, bh = 18;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f3dce4';
  ctx.fillText('卡蜜拉', bx, by - 6);

  ctx.fillStyle = '#000';
  ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = '#3a0a18';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#f0c0c8';
  ctx.fillRect(bx, by, bw * clamp(p.hpShown, 0, PLAYER.MAX_HP) / PLAYER.MAX_HP, bh);
  const grad = ctx.createLinearGradient(0, by, 0, by + bh);
  grad.addColorStop(0, '#ff3355');
  grad.addColorStop(1, '#8a0a22');
  ctx.fillStyle = grad;
  ctx.fillRect(bx, by, bw * clamp(p.hp, 0, PLAYER.MAX_HP) / PLAYER.MAX_HP, bh);

  if (p.shield > 0) {
    ctx.fillStyle = '#1a3140';
    ctx.fillRect(bx, by + bh + 3, bw, 3);
    ctx.fillStyle = '#7fd4ff';
    ctx.fillRect(bx, by + bh + 3, bw * clamp(p.shield, 0, PLAYER.MAX_SHIELD) / PLAYER.MAX_SHIELD, 3);
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7fd4ff';
    ctx.fillText(`护盾 ${Math.ceil(p.shield)}`, bx + bw + 10, by + 32);
  }

  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'center';
  for (const s of HUD_SLOTS) {
    if (!s.cost) continue;
    const x = bx + bw * s.cost / PLAYER.MAX_HP;
    const ok = p.hp > s.cost;
    ctx.fillStyle = ok ? '#ffffff' : '#666';
    ctx.fillRect(x - 1, by - 2, 2, bh + 4);
    ctx.fillText(s.key, x, by + bh + 14);
  }

  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.ceil(p.hp)} / ${PLAYER.MAX_HP}`, bx + bw + 10, by + 14);

  const size = 54, gap = 12;
  const total = HUD_SLOTS.length * size + (HUD_SLOTS.length - 1) * gap;
  let x0 = W / 2 - total / 2;
  const y0 = H - size - 20;
  for (const s of HUD_SLOTS) {
    const cd = s.key === 'J' ? 0 : p.cd[s.key];
    const maxCd = s.key === 'J' ? 1 : SKILLS[s.key].cd;
    const usable = s.cost === 0 || p.hp > s.cost;
    const shake = p.denyT[s.key] > 0 ? Math.sin(performance.now() / 20) * 3 : 0;
    const x = x0 + shake;

    ctx.fillStyle = 'rgba(20, 6, 16, 0.85)';
    ctx.fillRect(x, y0, size, size);
    ctx.strokeStyle = usable ? '#c4123a' : '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y0 + 1, size - 2, size - 2);

    drawSkillIcon(ctx, s.key, x + size / 2, y0 + size / 2 - 4, usable);

    if (cd > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      const hgt = size * cd / maxCd;
      ctx.fillRect(x, y0 + size - hgt, size, hgt);
      if (cd >= 1) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold 16px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.ceil(cd)), x + size / 2, y0 + size / 2 + 6);
      }
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(x - 4, y0 - 4, 18, 18);
    ctx.fillStyle = '#ffcc66';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(s.key, x + 5, y0 + 10);

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = usable ? '#f3dce4' : '#777';
    ctx.fillText(s.cost ? `${s.name} -${s.cost}` : `${s.name} 吸血`, x + size / 2, y0 + size + 14);
    x0 += size + gap;
  }

  if (Game.phase !== 'boss') {
    const tutorial = Game.phase === 'tutorial';
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(243, 220, 228, 0.6)';
    ctx.fillText(tutorial ? '独立教学区 · 安全练习　|　Esc 暂停' : `正式关卡 · 魔物 ${Game.enemies.filter((e) => !e.dead).length} / ${Game.enemies.length}　|　Esc 暂停`, W - 16, 22);
    ctx.fillStyle = p.parryT > 0 ? '#ffd166' : p.guard ? '#7dffb0' : '#f3dce4';
    ctx.fillText(p.parryT > 0 ? '弹反成功 +5' : p.guard ? (p.guardT <= 0.15 ? 'F 弹反窗口' : 'F 正面格挡 · 减伤 75%') : 'F 按住格挡 · 初始 0.15 秒弹反', W - 16, 44);
    ctx.fillStyle = '#b18aab';
    ctx.fillText(tutorial ? '沿路练习 → 走到城门按 W 开始闯关' : `检查点：${Game.checkpoint.name} · W 激活/回满`, W - 16, 64);
    if (Game.collection) {
      ctx.fillStyle = AudioSys.muted ? '#ffcc66' : '#8d7188';
      ctx.fillText(Collect.hudText() + (AudioSys.muted ? '　静音中 · M' : '　· M 静音'), W - 16, 84);
    }
  }
  if (Game.boss) {
    const b = Game.boss;
    ctx.fillStyle = '#110c17'; ctx.fillRect(230, 90, 500, 34);
    ctx.fillStyle = '#743449'; ctx.fillRect(240, 108, 480, 8);
    ctx.fillStyle = '#dc667f'; ctx.fillRect(240, 108, 480 * b.hp / b.maxHp, 8);
    ctx.fillStyle = '#f3dce4'; ctx.textAlign = 'center'; ctx.font = `13px ${FONT}`;
    ctx.fillText(`深渊领主 · ${b.phase === 1 ? '人形' : '真身'}　${Math.ceil(b.hp)} / ${b.maxHp}`, W / 2, 104);
  }
}

function drawSkillIcon(ctx, key, x, y, usable) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = usable ? 1 : 0.35;
  ctx.strokeStyle = '#ff2d55';
  ctx.fillStyle = '#ff2d55';
  ctx.lineCap = 'round';
  if (key === 'J') {
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-10 + i * 7, -12);
      ctx.quadraticCurveTo(2 + i * 7, -4, 4 + i * 7, 12);
      ctx.stroke();
    }
  } else if (key === 'K') {
    ctx.scale(1.4, 1.4);
    drawBat(ctx, 0, 0, 1, 1, usable ? 1 : 0.35);
  } else if (key === 'L') {
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a0a22';
    ctx.beginPath(); ctx.arc(-4, -3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, 4, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
