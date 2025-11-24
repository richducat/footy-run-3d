// js/input.js

export class InputManager {
  constructor(canvas, onAction) {
    this.canvas = canvas;
    this.onAction = onAction;

    this._keyDown = this._handleKeyDown.bind(this);
    this._touchStart = this._handleTouchStart.bind(this);
    this._touchEnd = this._handleTouchEnd.bind(this);

    this.touchStart = null;
  }

  attach() {
    window.addEventListener("keydown", this._keyDown);
    this.canvas.addEventListener("touchstart", this._touchStart, {
      passive: false
    });
    this.canvas.addEventListener("touchend", this._touchEnd, {
      passive: false
    });
  }

  detach() {
    window.removeEventListener("keydown", this._keyDown);
    this.canvas.removeEventListener("touchstart", this._touchStart);
    this.canvas.removeEventListener("touchend", this._touchEnd);
  }

  _handleKeyDown(e) {
    const target = e.target;
    const tagName = target?.tagName;
    const isEditingFormField =
      target?.isContentEditable ||
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT";

    if (isEditingFormField) return;

    const code = e.code;

    let action = null;
    if (code === "ArrowLeft" || code === "KeyA") action = "moveLeft";
    else if (code === "ArrowRight" || code === "KeyD") action = "moveRight";
    else if (code === "ArrowUp" || code === "KeyW") action = "jump";
    else if (code === "ArrowDown" || code === "KeyS") action = "slide";
    else if (code === "Space" || code === "Enter") action = "primary";
    else if (code === "Escape" || code === "KeyP") action = "pauseToggle";

    if (action) {
      e.preventDefault();
      this.onAction({ type: action, detail: { source: "keyboard" } });
    }
  }

  _handleTouchStart(e) {
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    this.touchStart = {
      x: t.clientX,
      y: t.clientY,
      time: performance.now()
    };
  }

  _handleTouchEnd(e) {
    if (!this.touchStart || e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStart.x;
    const dy = t.clientY - this.touchStart.y;
    const dt = performance.now() - this.touchStart.time;

    const threshold = 30; // px
    const maxTime = 600; // ms

    const detail = { source: "touch", dx, dy, dt };

    if (dt <= maxTime && Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      // tap
      this.onAction({ type: "primary", detail });
      this.touchStart = null;
      e.preventDefault();
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > threshold) {
        this.onAction({
          type: dx > 0 ? "moveRight" : "moveLeft",
          detail
        });
      }
    } else {
      if (Math.abs(dy) > threshold) {
        this.onAction({ type: dy > 0 ? "slide" : "jump", detail });
      }
    }

    this.touchStart = null;
    e.preventDefault();
  }
}
