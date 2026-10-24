const AUDIO_BGM = {
  castle: { src: 'assets/audio/bgm_castle.ogg', volume: 0.65 },
  boss: { src: 'assets/audio/bgm_boss.mp3', volume: 0.22 },
  ending: { src: 'assets/audio/bgm_ending.mp3', volume: 0.30 },
};

const AUDIO_SFX = {
  jump: { srcs: ['assets/audio/sfx/jump.ogg'], volume: 0.7, pool: 2 },
  dash: { srcs: ['assets/audio/sfx/dash.ogg'], volume: 0.8, pool: 2 },
  swing: { srcs: ['assets/audio/sfx/swing.ogg', 'assets/audio/sfx/swing2.ogg'], volume: 0.85, pool: 2, jitter: 0.08, gap: 0.03 },
  hit: { srcs: ['assets/audio/sfx/hit.ogg'], volume: 0.85, pool: 3, jitter: 0.08, gap: 0.025 },
  hit_heavy: { srcs: ['assets/audio/sfx/hit_heavy.ogg'], volume: 0.9, pool: 2 },
  hurt: { srcs: ['assets/audio/sfx/hurt.ogg'], volume: 0.85, pool: 2, gap: 0.08 },
  parry: { srcs: ['assets/audio/sfx/parry.ogg'], volume: 1.0, pool: 2 },
  block: { srcs: ['assets/audio/sfx/block.ogg'], volume: 0.8, pool: 2 },
  roar: { srcs: ['assets/audio/sfx/roar.ogg'], volume: 0.55, pool: 1 },
  summon: { srcs: ['assets/audio/sfx/summon.ogg'], volume: 0.8, pool: 1 },
  fire: { srcs: ['assets/audio/sfx/fire.ogg'], volume: 0.7, pool: 2, gap: 0.15 },
  burst: { srcs: ['assets/audio/sfx/burst.ogg'], volume: 0.8, pool: 1 },
  ult: { srcs: ['assets/audio/sfx/ult.ogg'], volume: 1.0, pool: 1 },
  death: { srcs: ['assets/audio/sfx/death.ogg'], volume: 0.8, pool: 1 },
  boss_die: { srcs: ['assets/audio/sfx/boss_die.ogg'], volume: 0.9, pool: 1 },
  kill: { srcs: ['assets/audio/sfx/kill.ogg'], volume: 0.8, pool: 2, jitter: 0.1, gap: 0.05 },
  coin: { srcs: ['assets/audio/sfx/coin.ogg'], volume: 0.8, pool: 2, gap: 0.05 },
  pickup: { srcs: ['assets/audio/sfx/pickup.ogg'], volume: 0.8, pool: 1 },
  secret: { srcs: ['assets/audio/sfx/secret.ogg'], volume: 0.85, pool: 1 },
  altar: { srcs: ['assets/audio/sfx/altar.ogg'], volume: 0.85, pool: 1 },
  land: { srcs: ['assets/audio/sfx/land.ogg'], volume: 0.6, pool: 2, gap: 0.05 },
  ui_move: { srcs: ['assets/audio/sfx/ui_move.ogg'], volume: 0.6, pool: 2 },
  ui_ok: { srcs: ['assets/audio/sfx/ui_ok.ogg'], volume: 0.8, pool: 2 },
  ui_back: { srcs: ['assets/audio/sfx/ui_back.ogg'], volume: 0.7, pool: 2 },
};

const AudioSys = {
  inited: false,
  unlocked: false,
  muted: false,
  paused: false,
  ducked: false,
  duck: 1,
  current: null,
  currentKey: null,
  pending: null,
  bgmOverrideDepth: 0,
  bgmOverrideReturn: null,
  bgmEls: {},
  sfx: {},

  init() {
    if (this.inited) return;
    this.inited = true;
    try { this.muted = localStorage.getItem('bmp_mute') === '1'; } catch (e) { /* file:// may block storage */ }

    for (const [key, def] of Object.entries(AUDIO_BGM)) {
      const el = new Audio(def.src);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      this.bgmEls[key] = el;
    }
    for (const [name, def] of Object.entries(AUDIO_SFX)) {
      const list = [];
      for (const src of def.srcs) {
        for (let i = 0; i < (def.pool || 2); i++) {
          const el = new Audio(src);
          el.preload = 'auto';
          el.volume = def.volume;
          list.push(el);
        }
      }
      this.sfx[name] = { ...def, list, i: 0, last: 0 };
    }

    const unlock = () => this.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) this.toggleMute();
    });

    this.playBgm('ending');
  },

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.pending) {
      const key = this.pending;
      this.pending = null;
      this.playBgm(key);
    }
  },

  playBgm(key) {
    const def = AUDIO_BGM[key];
    if (!def) return;
    if (!this.unlocked) { this.pending = key; return; }
    if (this.currentKey === key) {
      if (this.current && this.current.paused && !this.paused) this.current.play().catch(() => {});
      return;
    }
    if (this.current) {
      this.current.pause();
      try { this.current.currentTime = 0; } catch (e) { /* ignore */ }
    }
    const el = this.bgmEls[key];
    if (!el) return;
    this.currentKey = key;
    this.current = el;
    el.volume = 0;
    if (!this.paused) el.play().catch(() => {});
  },

  stopBgm() {
    if (this.current) {
      this.current.pause();
      try { this.current.currentTime = 0; } catch (e) { /* ignore */ }
    }
    this.current = null;
    this.currentKey = null;
  },

  sfxPlay(name, opts = {}) {
    if (!this.unlocked || this.muted) return;
    const def = this.sfx[name];
    if (!def || !def.list.length) return;
    const now = performance.now();
    if (def.gap && now - def.last < def.gap * 1000) return;
    def.last = now;
    const el = def.list[def.i++ % def.list.length];
    const jitter = def.jitter ? 1 + (Math.random() * 2 - 1) * def.jitter : 1;
    try {
      el.currentTime = 0;
      el.volume = clamp(opts.volume === undefined ? def.volume : opts.volume, 0, 1);
      el.playbackRate = clamp((opts.rate || 1) * jitter, 0.5, 2);
      const p = el.play();
      if (p) p.catch(() => {});
    } catch (e) { /* audio is optional */ }
  },

  setDucked(on) { this.ducked = on; },

  pushBgm(key = 'ending') {
    if (this.bgmOverrideDepth === 0) {
      this.bgmOverrideReturn = this.currentKey || this.pending || null;
      this.playBgm(key);
    }
    this.bgmOverrideDepth++;
  },

  popBgm() {
    if (this.bgmOverrideDepth === 0) return;
    this.bgmOverrideDepth--;
    if (this.bgmOverrideDepth > 0) return;
    const back = this.bgmOverrideReturn;
    this.bgmOverrideReturn = null;
    if (back) this.playBgm(back);
  },

  setPaused(on) {
    if (this.paused === on) return;
    this.paused = on;
    if (!this.current) return;
    if (on) this.current.pause();
    else if (this.unlocked) this.current.play().catch(() => {});
  },

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('bmp_mute', this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.muted) {
      for (const def of Object.values(this.sfx)) {
        for (const el of def.list) {
          try { el.pause(); } catch (e) { /* ignore */ }
        }
      }
    }
    if (typeof FX !== 'undefined' && typeof Game !== 'undefined' && Game.player) {
      FX.text(Game.player.cx, Game.player.y - 30, this.muted ? '静音' : '声音开启', '#b18aab', 14);
    }
  },

  update(dt) {
    this.duck += ((this.ducked ? 0.55 : 1) - this.duck) * Math.min(1, dt * 8);
    if (!this.current) return;
    const def = AUDIO_BGM[this.currentKey];
    if (!def) return;
    const target = this.muted || this.paused ? 0 : def.volume * this.duck;
    this.current.volume += (target - this.current.volume) * Math.min(1, dt * 8);
  },
};
