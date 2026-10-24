const Assets = {
  images: {},

  load(list) {
    return Promise.all(Object.entries(list).map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; resolve(); };
      img.onerror = () => { console.warn('素材加载失败：' + src); resolve(); };
      img.src = src;
    })));
  },
};

function tint(source, color) {
  const c = makeCanvas(source.width, source.height);
  const g = c.getContext('2d');
  g.drawImage(source, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function withOutline(source, color) {
  const c = makeCanvas(source.width + 2, source.height + 2);
  const g = c.getContext('2d');
  const sil = tint(source, color);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(sil, dx, dy);
  g.drawImage(source, 1, 1);
  return c;
}

function buildPixelSprite(img, artScale, outlineColor, face) {
  let base;
  if (img) {
    base = makeCanvas(img.width, img.height);
    base.getContext('2d').drawImage(img, 0, 0);
  } else {
    base = makeCanvas(24, 40);
    const g = base.getContext('2d');
    g.fillStyle = '#8a1a3a';
    g.fillRect(6, 4, 12, 36);
  }
  const srcW = base.width;
  base = withOutline(base, outlineColor);
  return {
    img: base,
    red: tint(base, '#ff2d55'),
    white: tint(base, '#ffffff'),
    w: base.width * artScale,
    h: base.height * artScale,
    face: ((face === undefined ? srcW : face) + 1) * artScale,
  };
}

async function loadFrameSet(manifest, artScale, outlineColor) {
  const set = {};
  const entries = [];
  for (const [anim, frames] of Object.entries(manifest)) {
    frames.forEach((f, i) => entries.push({ anim, i, f, key: `${anim}_${i}` }));
  }
  const list = {};
  for (const e of entries) list[e.key] = e.f.file;
  await Assets.load(list);
  for (const e of entries) {
    const img = Assets.images[e.key];
    if (!img) continue;
    (set[e.anim] = set[e.anim] || [])[e.i] = buildPixelSprite(img, artScale, outlineColor, e.f.face);
  }
  for (const k of Object.keys(set)) set[k] = set[k].filter(Boolean);
  return set;
}
