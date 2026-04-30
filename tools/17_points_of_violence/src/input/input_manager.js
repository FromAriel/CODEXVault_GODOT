const GAMEPAD_BUTTONS = {
  8: "Select",
  9: "Start"
};

export class InputManager {
  constructor(bindings) {
    this.bindings = bindings;
    this.keysDown = new Set();
    this.mode = "keyboard";
    this.actions = new Map();
    this.previousActions = new Map();
    this.move = { x: 0, y: 0 };
  }

  attach(target = window) {
    target.addEventListener("keydown", event => {
      this.keysDown.add(event.code);
      this.mode = "keyboard";
    });
    target.addEventListener("keyup", event => {
      this.keysDown.delete(event.code);
      this.mode = "keyboard";
    });
    target.addEventListener("gamepadconnected", () => {
      this.mode = "gamepad";
    });
  }

  update() {
    this.previousActions = new Map(this.actions);
    this.actions.clear();
    this.move = this.keyboardMove();
    for (const action of Object.keys(this.bindings.keyboard || {})) {
      this.actions.set(action, this.keyboardAction(action));
    }
    this.readGamepad();
  }

  isDown(action) {
    return this.actions.get(action) === true;
  }

  wasPressed(action) {
    return this.isDown(action) && this.previousActions.get(action) !== true;
  }

  keyboardAction(action) {
    return (this.bindings.keyboard[action] || []).some(code => this.keysDown.has(code));
  }

  keyboardMove() {
    const left = this.keyboardAction("left") ? -1 : 0;
    const right = this.keyboardAction("right") ? 1 : 0;
    const up = this.keyboardAction("up") ? -1 : 0;
    const down = this.keyboardAction("down") ? 1 : 0;
    return { x: left + right, y: up + down };
  }

  readGamepad() {
    const pads = navigator.getGamepads?.() || [];
    const pad = [...pads].find(Boolean);
    if (!pad) return;
    const axisX = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0;
    const axisY = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
    if (axisX || axisY) {
      this.move = { x: axisX, y: axisY };
      this.mode = "gamepad";
    }
    for (const [index, name] of Object.entries(GAMEPAD_BUTTONS)) {
      if (pad.buttons[Number(index)]?.pressed) {
        this.mode = "gamepad";
        for (const [action, buttons] of Object.entries(this.bindings.gamepad || {})) {
          if (buttons.includes(name)) this.actions.set(action, true);
        }
      }
    }
  }
}
