const TILE = 48;
const GROUND_Y = 444;

function createTutorialLevel() {
  return {
    width: 1100,
    solids: [
      { x: -48, y: -400, w: 48, h: 1400, boundary: true },
      { x: 0, y: GROUND_Y, w: 1100, h: 96 },
      { x: 1100, y: -400, w: 48, h: 1400, boundary: true },
    ],
    oneways: [
      { x: 370, y: 340, w: 192 },
      { x: 650, y: 300, w: 144 },
    ],
    signs: [
      { x: 215, text: 'A D 移动 · 空格跳跃 / 二段跳\nS 从平台跳下' },
      { x: 455, text: 'J 爪击：对木桩连按三次\n命中吸血，K 冲刺消耗生命' },
      { x: 730, text: 'L 血之爆发 · I 血月降临\nF 按住格挡，出手瞬间弹反' },
      { x: 950, text: '教学完成 · 靠近城门按 W\n进入正式关卡后才有魔物' },
    ],
    dummyXs: [520, 610, 810],
    checkpoints: [{ x: 120, name: '教学起点' }],
    exitX: 1010,
    spawns: [],
  };
}

function createBossArena() {
  return {
    width: 960,
    solids: [
      { x: -48, y: -400, w: 48, h: 1400, boundary: true },
      { x: 0, y: GROUND_Y, w: 960, h: 96 },
      { x: 960, y: -400, w: 48, h: 1400, boundary: true },
    ],
    oneways: [], signs: [], dummyXs: [], spawns: [], pickups: [],
    checkpoints: [{ x: 180, name: 'Boss 战起点' }], exitX: 900,
  };
}

function castleStairs(x, count, direction) {
  return Array.from({ length: count }, (_, i) => {
    const height = (direction > 0 ? i + 1 : count - i) * 16;
    return { x: x + i * 32, y: GROUND_Y - height, w: 32, h: height, stair: true };
  });
}

function createLevel() {
  return {
    width: 3000,
    solids: [
      { x: -48, y: -400, w: 48, h: 1400, boundary: true },
      { x: 0, y: GROUND_Y, w: 2380, h: 96 },
      { x: 2476, y: GROUND_Y, w: 524, h: 96 },
      { x: 3000, y: -400, w: 48, h: 1400, boundary: true },
      // 32px tread / 16px rise: walkable from either end, tiled in original green stone.
      ...castleStairs(920, 4, 1),
      { x: 1048, y: 380, w: 192, h: 64 },
      ...castleStairs(1240, 4, -1),
    ],
    oneways: [
      { x: 540, y: 340, w: 160 },
      { x: 770, y: 280, w: 128 },
      { x: 1450, y: 250, w: 112 },
      { x: 1770, y: 340, w: 160 },
      { x: 2070, y: 300, w: 144 },
      { x: 2332, y: 348, w: 192 },
    ],
    signs: [],
    dummyXs: [],
    checkpoints: [{ x: 120, name: '城门' }, { x: 2720, name: 'Boss 房门前' }],
    exitX: 2910,
    altar: { x: 2600, y: GROUND_Y },
    pickups: [
      { type: 'memory', id: 'snow', x: 1120, y: 350 },
      { type: 'memory', id: 'tea', x: 830, y: 250 },
      { type: 'memory', id: 'dance', x: 2130, y: 270 },
      { type: 'keepsake', id: 'musicbox', x: 2420, y: 318 },
      { type: 'hidden', id: 'hairpin', x: 1506, y: 220 },
      { type: 'coin', amount: 20, x: 1560, y: 414 },
      { type: 'coin', amount: 20, x: 2360, y: 318 },
    ],
    spawns: [
      { type: 'skull', x: 760, y: 386, range: 85 },
      { type: 'beast', x: 1110 },
      { type: 'skull', x: 1300, y: 390, range: 65 },
      { type: 'beast', x: 1990 },
      { type: 'hound', x: 2240, range: 150, drop: 'ribbon' },
      { type: 'skull', x: 2530, y: 390, range: 80 },
      { type: 'hound', x: 2130, range: 65 },
    ],
  };
}

function groundAt(level, x, minY = 0) {
  const tops = level.solids.filter((s) => !s.boundary && x >= s.x && x < s.x + s.w && s.y >= minY).map((s) => s.y);
  return tops.length ? Math.min(...tops) : null;
}

function drawLevel(ctx, level, pattern, camX) {
  const tiles = Assets.images.castleTiles;
  for (const s of level.solids) {
    if (s.boundary || s.x + s.w < camX || s.x > camX + W) continue;
    ctx.fillStyle = '#102225';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    if (tiles) {
      ctx.save();
      ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
      const tileW = s.stair ? 32 : 48;
      const capH = s.stair ? 12 : 33;
      for (let x = s.x; x < s.x + s.w; x += tileW) {
        for (let y = s.y + capH; y < s.y + s.h; y += 57) ctx.drawImage(tiles, 416, 154, 32, 38, x, y, tileW, 57);
        // Mossy stone cap follows the exact collision tread, not a decorative ramp.
        ctx.drawImage(tiles, 464, 154, 32, 22, x, s.y, tileW, capH);
      }
      ctx.restore();
    }
    ctx.fillStyle = '#a0a46a';
    ctx.fillRect(s.x, s.y, s.w, 3);
    ctx.fillStyle = '#62794d';
    ctx.fillRect(s.x, s.y + 3, s.w, 2);
  }
  for (const o of level.oneways) {
    if (o.x + o.w < camX || o.x > camX + W) continue;
    for (let x = o.x; x < o.x + o.w; x += 72) {
      const w = Math.min(72, o.x + o.w - x);
      if (tiles) ctx.drawImage(tiles, 64, 91, w / 1.5, 8, x, o.y, w, 12);
    }
    ctx.fillStyle = '#a0a46a';
    ctx.fillRect(o.x, o.y, o.w, 3);
  }
  // Empty alcove: decoration only, no interaction or recovery.
  if (Game.phase === 'castle' && tiles) {
    for (const x of [1480, 1650]) ctx.drawImage(tiles, 416, 154, 32, 38, x, GROUND_Y - 30, 24, 30);
  }
  if (Game.phase === 'boss') return;
  for (let i = 0; i < level.checkpoints.length; i++) {
    if (Game.phase === 'tutorial') break;
    const cp = level.checkpoints[i];
    const active = Game.checkpoint && Game.checkpoint.index === i;
    if (tiles) ctx.drawImage(tiles, 80, 144, 96, 48, cp.x - 48, GROUND_Y - 48, 96, 48);
    ctx.fillStyle = active ? '#ff5577' : '#b18aab';
    ctx.fillRect(cp.x - 3, GROUND_Y - 53, 6, 16);
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(`${cp.name} · W ${active ? '回满生命' : '检查点'}`, cp.x, GROUND_Y - 64);
  }
  if (tiles) ctx.drawImage(tiles, 656, 48, 48, 64, level.exitX - 36, GROUND_Y - 96, 72, 96);
  ctx.fillStyle = Game.phase === 'tutorial' || Game.enemies.every((e) => e.dead) ? '#7dffb0' : '#ff5577';
  ctx.font = `14px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(Game.phase === 'tutorial' ? 'W · 进入正式关卡' : 'W · 进入 Boss 战', level.exitX, GROUND_Y - 108);
}

function drawSign(ctx, sign) {
  ctx.fillStyle = '#3a2416';
  ctx.fillRect(sign.x - 3, GROUND_Y - 40, 6, 40);
  ctx.fillStyle = '#5a3a28';
  ctx.fillRect(sign.x - 20, GROUND_Y - 54, 40, 24);
  ctx.strokeStyle = '#24140c';
  ctx.lineWidth = 2;
  ctx.strokeRect(sign.x - 20, GROUND_Y - 54, 40, 24);
  ctx.fillStyle = '#ffcc66';
  ctx.font = `bold 16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('!', sign.x, GROUND_Y - 36);

  const a = sign.a || 0;
  if (a <= 0.01) return;
  const lines = sign.text.split('\n');
  ctx.font = `17px ${FONT}`;
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 32;
  const bh = lines.length * 26 + 18;
  const bx = sign.x - bw / 2;
  const by = GROUND_Y - 170 - bh + (1 - a) * 10;
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20, 6, 16, 0.88)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#8a2040';
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = '#f3dce4';
  lines.forEach((l, i) => ctx.fillText(l, sign.x, by + 30 + i * 26));
  ctx.globalAlpha = 1;
}
