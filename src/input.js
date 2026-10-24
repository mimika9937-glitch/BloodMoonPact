const Input = {
  down: new Set(),
  pressed: new Set(),

  init() {
    const blocked = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);
    window.addEventListener('keydown', (e) => {
      if (blocked.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => { this.down.clear(); this.pressed.clear(); });
  },

  isDown(code) { return this.down.has(code); },
  wasPressed(code) { return this.pressed.has(code); },

  axisX() {
    const r = this.down.has('KeyD') || this.down.has('ArrowRight');
    const l = this.down.has('KeyA') || this.down.has('ArrowLeft');
    return (r ? 1 : 0) - (l ? 1 : 0);
  },

  downPressed() { return this.pressed.has('KeyS') || this.pressed.has('ArrowDown'); },

  consume(code) {
    const had = this.pressed.has(code);
    this.pressed.delete(code);
    return had;
  },

  endStep() { this.pressed.clear(); },
};
