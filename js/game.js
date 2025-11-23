// js/game.js

const RUN_STATE = {
  IDLE: "idle",
  RUNNING: "running",
  PAUSED: "paused",
  ENDED: "ended"
};

export class Game {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;

    this.lanes = 3;
    this.baseSpeed = 220; // px/s
    this.runState = RUN_STATE.IDLE;

    // Player card tuning
    const playerCard = options.playerCard || {};
    const multipliers = options.multipliers || {};
    this.speedMultiplier =
      multipliers.speed || playerCard.speedMultiplier || 1.0;
    this.coinMultiplier =
      multipliers.coins || playerCard.coinMultiplier || 1.0;
    this.shotGainMultiplier =
      multipliers.shotGain || playerCard.shotGainMultiplier || 1.0;
    this.playerCardMeta = playerCard;

    // Player
    this.player = {
      lane: 1,
      width: 44,
      height: 78,
      baseY: this.height - 140,
      yOffset: 0,
      isJumping: false,
      isSliding: false,
      jumpTime: 0,
      slideTime: 0,
      jumpDuration: 0.55,
      slideDuration: 0.45
    };

    // Run stats
    this.resetRunStats();
    this.bestDistance = options.bestDistance || 0;

    // Systems
    this.obstacles = [];
    this.pickups = [];

    this.timeSinceObstacle = 0;
    this.timeSincePickup = 0;
    this.goalFlashTime = 0;

    this.shotMeterMax = 100;

    // Callbacks for UI / meta
    this.onStats = options.onStats || (() => {});
    this.onState = options.onState || (() => {});
    this.onGoal = options.onGoal || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
  }

  resetRunStats() {
    this.speed = this.baseSpeed;
    this.distance = 0;
    this.coinsThisRun = 0;
    this.goalsThisRun = 0;
    this.shotMeter = 0;
  }

  getRunState() {
    return this.runState;
  }

  laneX(idx) {
    // 3 lanes roughly at 20%, 50%, 80%
    return this.width * (0.2 + 0.3 * idx);
  }

  startRun() {
    this.runState = RUN_STATE.RUNNING;
    this.obstacles = [];
    this.pickups = [];
    this.timeSinceObstacle = 0;
    this.timeSincePickup = 0;
    this.goalFlashTime = 0;
    this.resetRunStats();
    this.player.lane = 1;
    this.player.isJumping = false;
    this.player.isSliding = false;
    this.player.jumpTime = 0;
    this.player.slideTime = 0;
    this.onState(this.runState);
  }

  endRun() {
    if (this.runState === RUN_STATE.ENDED) return;
    this.runState = RUN_STATE.ENDED;
    if (this.distance > this.bestDistance) {
      this.bestDistance = this.distance;
    }
    this.onState(this.runState);
    this.onGameOver({
      distance: Math.floor(this.distance),
      coins: this.coinsThisRun,
      goals: this.goalsThisRun,
      bestDistance: Math.floor(this.bestDistance)
    });
  }

  pause() {
    if (this.runState !== RUN_STATE.RUNNING) return;
    this.runState = RUN_STATE.PAUSED;
    this.onState(this.runState);
  }

  resume() {
    if (this.runState !== RUN_STATE.PAUSED) return;
    this.runState = RUN_STATE.RUNNING;
    this.onState(this.runState);
  }

  handleMove(action) {
    if (this.runState !== RUN_STATE.RUNNING) return;

    if (action === "left") {
      if (this.player.lane > 0) this.player.lane -= 1;
    } else if (action === "right") {
      if (this.player.lane < this.lanes - 1) this.player.lane += 1;
    } else if (action === "jump") {
      if (!this.player.isJumping && !this.player.isSliding) {
        this.player.isJumping = true;
        this.player.jumpTime = 0;
      }
    } else if (action === "slide") {
      if (!this.player.isSliding && !this.player.isJumping) {
        this.player.isSliding = true;
        this.player.slideTime = 0;
      }
    }
  }

  spawnObstacle() {
    const lane = Math.floor(Math.random() * this.lanes);
    const high = Math.random() < 0.35;
    const type = high ? "high" : "ground"; // high = overhead rig/banner; ground = sliding tackle
    const width = 54;
    const height = high ? 65 : 38;
    this.obstacles.push({
      lane,
      y: -80,
      width,
      height,
      type
    });
  }

  spawnPickup() {
    const lane = Math.floor(Math.random() * this.lanes);
    const type = Math.random() < 0.7 ? "coin" : "ball";
    this.pickups.push({
      lane,
      y: -40,
      radius: 14,
      type
    });
  }

  rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return (
      ax < bx + bw &&
      ax + aw > bx &&
      ay < by + bh &&
      ay + ah > by
    );
  }

  circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= cr * cr;
  }

  scoreGoal() {
    this.goalsThisRun += 1;
    this.goalFlashTime = 0.7;
    this.onGoal(this.goalsThisRun);
  }

  update(dt) {
    // Always push last known stats so HUD can show IDLE state too
    this.onStats({
      distance: Math.floor(this.distance),
      coins: this.coinsThisRun,
      goals: this.goalsThisRun,
      shotMeter: this.shotMeter,
      bestDistance: Math.floor(this.bestDistance),
      runState: this.runState
    });

    if (this.runState !== RUN_STATE.RUNNING) {
      if (this.goalFlashTime > 0) this.goalFlashTime -= dt;
      return;
    }

    // Difficulty ramp
    const base = this.baseSpeed + this.distance * 0.45;
    this.speed = base * this.speedMultiplier;

    // Distance scaled to "meters"
    this.distance += this.speed * dt * 0.05;
    if (this.distance > this.bestDistance) {
      this.bestDistance = this.distance;
    }

    // Timers
    this.timeSinceObstacle += dt;
    this.timeSincePickup += dt;
    if (this.goalFlashTime > 0) this.goalFlashTime -= dt;

    // Player animation: jump
    if (this.player.isJumping) {
      this.player.jumpTime += dt;
      const t = this.player.jumpTime / this.player.jumpDuration;
      const clamped = Math.min(t, 1);
      // parabolic jump
      this.player.yOffset =
        -90 * (1 - Math.pow(2 * (clamped - 0.5), 2));
      if (t >= 1) {
        this.player.isJumping = false;
        this.player.yOffset = 0;
      }
    } else if (this.player.isSliding) {
      this.player.slideTime += dt;
      if (this.player.slideTime >= this.player.slideDuration) {
        this.player.isSliding = false;
      }
    } else {
      this.player.yOffset = 0;
    }

    // Spawn obstacles (gets a bit denser over time)
    const obstacleInterval = Math.max(0.55, 1.8 - this.distance * 0.01);
    if (this.timeSinceObstacle > obstacleInterval) {
      this.spawnObstacle();
      this.timeSinceObstacle = 0;
    }

    // Spawn pickups
    const pickupInterval = 0.85;
    if (this.timeSincePickup > pickupInterval) {
      this.spawnPickup();
      this.timeSincePickup = 0;
    }

    const dy = this.speed * dt;

    // Move obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].y += dy;
      if (this.obstacles[i].y > this.height + 120) {
        this.obstacles.splice(i, 1);
      }
    }

    // Move pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      this.pickups[i].y += dy;
      if (this.pickups[i].y > this.height + 80) {
        this.pickups.splice(i, 1);
      }
    }

    // Collision detection
    const playerX = this.laneX(this.player.lane) - this.player.width / 2;
    const playerY = this.player.baseY + this.player.yOffset;
    let playerHeight = this.player.height;
    if (this.player.isSliding) {
      playerHeight = this.player.height * 0.5;
    }

    // Obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      const ox = this.laneX(o.lane) - o.width / 2;
      const oy = o.y;

      if (
        this.rectsOverlap(
          playerX,
          playerY,
          this.player.width,
          playerHeight,
          ox,
          oy,
          o.width,
          o.height
        )
      ) {
        const isGround = o.type === "ground";

        const safe =
          (isGround && this.player.isJumping && this.player.yOffset < -25) ||
          (!isGround && this.player.isSliding);

        if (!safe) {
          this.endRun();
          return;
        }
      }
    }

    // Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const px = this.laneX(p.lane);
      const py = p.y;

      if (
        this.circleRectOverlap(
          px,
          py,
          p.radius,
          playerX,
          playerY,
          this.player.width,
          playerHeight
        )
      ) {
        if (p.type === "coin") {
          const gain = Math.max(1, Math.round(this.coinMultiplier));
          this.coinsThisRun += gain;
          this.shotMeter += 10 * this.shotGainMultiplier;
        } else if (p.type === "ball") {
          this.shotMeter += 25 * this.shotGainMultiplier;
        }

        if (this.shotMeter >= this.shotMeterMax) {
          this.shotMeter = 0;
          this.scoreGoal();
        }

        this.pickups.splice(i, 1);
      }
    }

    // Clamp shot meter
    if (this.shotMeter < 0) this.shotMeter = 0;
    if (this.shotMeter > this.shotMeterMax) this.shotMeter = this.shotMeterMax;

    // Update stats (again after changes)
    this.onStats({
      distance: Math.floor(this.distance),
      coins: this.coinsThisRun,
      goals: this.goalsThisRun,
      shotMeter: this.shotMeter,
      bestDistance: Math.floor(this.bestDistance),
      runState: this.runState
    });
  }

  drawPitch(ctx) {
    const horizon = this.height * 0.12;
    const pitchGradient = ctx.createLinearGradient(0, horizon, 0, this.height);
    pitchGradient.addColorStop(0, "#0c6138");
    pitchGradient.addColorStop(0.5, "#0a7a41");
    pitchGradient.addColorStop(1, "#05562c");
    ctx.fillStyle = pitchGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Stadium glow above the pitch
    const crowdGradient = ctx.createLinearGradient(0, 0, 0, horizon + 60);
    crowdGradient.addColorStop(0, "rgba(0,0,0,0.8)");
    crowdGradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = crowdGradient;
    ctx.fillRect(0, 0, this.width, horizon + 60);

    // Perspective stripes
    const stripeCount = 10;
    for (let i = 0; i < stripeCount; i++) {
      const tTop = i / stripeCount;
      const tBot = (i + 1) / stripeCount;
      const yTop = horizon + tTop * (this.height - horizon);
      const yBot = horizon + tBot * (this.height - horizon);
      ctx.beginPath();
      ctx.moveTo(this.width * (0.12 + tTop * 0.04), yTop);
      ctx.lineTo(this.width * (0.88 - tTop * 0.04), yTop);
      ctx.lineTo(this.width * (0.9 - tBot * 0.05), yBot);
      ctx.lineTo(this.width * (0.1 + tBot * 0.05), yBot);
      ctx.closePath();
      ctx.fillStyle =
        i % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
      ctx.fill();
    }

    // Vignette for focus
    const vignette = ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.55,
      this.height * 0.15,
      this.width / 2,
      this.height * 0.55,
      this.height * 0.65
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    // Field markings with slight convergence toward the top
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.setLineDash([12, 12]);
    for (let i = 1; i < this.lanes; i++) {
      const baseRatio = 0.2 + 0.3 * i;
      const topRatio = 0.5 + (baseRatio - 0.5) * 0.72;
      ctx.beginPath();
      ctx.moveTo(baseRatio * this.width, this.height);
      ctx.lineTo(topRatio * this.width, horizon);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Center markings
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.arc(this.width / 2, this.height * 0.45, 70, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawPlayer(ctx) {
    const x = this.laneX(this.player.lane) - this.player.width / 2;
    const y = this.player.baseY + this.player.yOffset;
    let h = this.player.height;
    if (this.player.isSliding) h = this.player.height * 0.5;

    // Depth shadow
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.filter = "blur(3px)";
    ctx.beginPath();
    ctx.ellipse(
      x + this.player.width / 2,
      y + h + 10,
      this.player.width * 0.55,
      this.player.isSliding ? h * 0.45 : h * 0.3,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Player body
    const gradient = ctx.createLinearGradient(
      x,
      y,
      x + this.player.width,
      y + h * 0.8
    );
    gradient.addColorStop(0, "#f9fbff");
    gradient.addColorStop(1, "#c7d4f8");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, this.player.width, h);

    // Outline for definition
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.player.width, h);

    // Jersey band
    ctx.fillStyle = "#1088ff";
    ctx.fillRect(
      x + this.player.width * 0.2,
      y,
      this.player.width * 0.2,
      h
    );

    // Shorts
    ctx.fillStyle = "#22263a";
    ctx.fillRect(x, y + h * 0.6, this.player.width, h * 0.4);

    // Light sheen on shorts
    const shortsSheen = ctx.createLinearGradient(
      x + this.player.width * 0.1,
      y + h * 0.6,
      x + this.player.width * 0.9,
      y + h
    );
    shortsSheen.addColorStop(0, "rgba(255,255,255,0.15)");
    shortsSheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shortsSheen;
    ctx.fillRect(x + this.player.width * 0.05, y + h * 0.62, this.player.width * 0.9, h * 0.3);

    // Ball at feet
    const ballY = y + h + 12;
    ctx.beginPath();
    ctx.arc(x + this.player.width / 2, ballY, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Simple panel detail
    ctx.beginPath();
    ctx.arc(x + this.player.width / 2, ballY, 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glow around the player for depth
    const glow = ctx.createRadialGradient(
      x + this.player.width / 2,
      y + h * 0.4,
      5,
      x + this.player.width / 2,
      y + h * 0.4,
      38
    );
    glow.addColorStop(0, "rgba(255,255,255,0.08)");
    glow.addColorStop(1, "rgba(16,136,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 12, y - 16, this.player.width + 24, h + 48);
  }

  drawObstacles(ctx) {
    for (const o of this.obstacles) {
      const x = this.laneX(o.lane) - o.width / 2;
      const y = o.y;

      if (o.type === "ground") {
        // Sliding tackle defender
        const body = ctx.createLinearGradient(x, y, x + o.width, y + o.height);
        body.addColorStop(0, "#f07669");
        body.addColorStop(1, "#c0362f");
        ctx.fillStyle = body;
        ctx.fillRect(x, y, o.width, o.height);

        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, o.width, o.height);
      } else {
        // Overhead camera rig / banner
        const rig = ctx.createLinearGradient(x, y, x + o.width, y + o.height);
        rig.addColorStop(0, "#ffe27a");
        rig.addColorStop(1, "#d4a600");
        ctx.fillStyle = rig;
        ctx.fillRect(x, y, o.width, o.height);

        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x, y + o.height - 6, o.width, 6);
      }
    }
  }

  drawPickups(ctx) {
    for (const p of this.pickups) {
      const x = this.laneX(p.lane);
      const y = p.y;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, p.radius * 2.4);
      if (p.type === "coin") {
        glow.addColorStop(0, "rgba(255, 216, 110, 0.8)");
        glow.addColorStop(1, "rgba(255, 216, 110, 0)");
      } else {
        glow.addColorStop(0, "rgba(255,255,255,0.7)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, p.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, p.radius, 0, Math.PI * 2);

      if (p.type === "coin") {
        ctx.fillStyle = "#f1c40f";
      } else {
        ctx.fillStyle = "#ffffff";
      }
      ctx.fill();

      if (p.type === "ball") {
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // GOAL overlay
    if (this.goalFlashTime > 0) {
      const alpha = Math.max(0, this.goalFlashTime / 0.7);
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
      ctx.font = "bold 42px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("GOAL!", this.width / 2, this.height * 0.3);
      ctx.restore();
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawPitch(ctx);
    this.drawObstacles(ctx);
    this.drawPickups(ctx);
    this.drawPlayer(ctx);
  }
}
