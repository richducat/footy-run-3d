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
    this.shotReady = false;
    this.activeShot = null;
    this.shotResultFlash = 0;
    this.shotResultLabel = "";

    this.goal = {
      x: this.width / 2,
      y: this.height * 0.085,
      width: this.width * 0.7,
      height: 110
    };
    this.goalie = {
      x: this.goal.x,
      y: this.goal.y + 50,
      width: 70,
      height: 70,
      direction: 1,
      speed: 110
    };

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
    this.shotReady = false;
    this.activeShot = null;
    this.shotResultFlash = 0;
    this.shotResultLabel = "";
  }

  getRunState() {
    return this.runState;
  }

  laneX(idx, y = this.height) {
    const horizon = this.height * 0.12;
    const t = Math.max(0, Math.min(1, (y - horizon) / (this.height - horizon)));
    const nearSpan = this.width * 0.46;
    const farSpan = this.width * 0.32;
    const laneSpan = farSpan + (nearSpan - farSpan) * t;
    const start = this.width / 2 - laneSpan / 2;
    const step = laneSpan / (this.lanes - 1);
    return start + step * idx;
  }

  depthScale(y) {
    const horizon = this.height * 0.12;
    const t = Math.max(0, Math.min(1, (y - horizon) / (this.height - horizon)));
    return 0.55 + t * 0.55;
  }

  startRun() {
    this.runState = RUN_STATE.RUNNING;
    this.obstacles = [];
    this.pickups = [];
    this.timeSinceObstacle = 0;
    this.timeSincePickup = 0;
    this.goalFlashTime = 0;
    this.shotReady = false;
    this.activeShot = null;
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
    this.shotReady = false;
    this.activeShot = null;
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
    const type = high ? "high" : "ground"; // high = upright defender to slide under; ground = sliding tackle
    // Match defenders to the player's slimmer silhouette
    const width = 48;
    const height = high ? 92 : 72;
    this.obstacles.push({
      lane,
      y: -120,
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

  isShotReady() {
    return this.shotReady && this.runState === RUN_STATE.RUNNING;
  }

  attemptShot(aimBias = 0) {
    if (!this.isShotReady() || this.activeShot) return false;

    const playerX = this.laneX(this.player.lane);
    const playerY = this.player.baseY + this.player.height * 0.8;
    const clampedBias = Math.max(-1, Math.min(1, aimBias || 0));
    const targetSpread = (this.goal.width * 0.35) / 2;
    const targetX = this.goal.x + clampedBias * targetSpread;
    const targetY = this.goal.y + this.goal.height * 0.3;

    this.activeShot = {
      startX: playerX,
      startY: playerY,
      targetX,
      targetY,
      t: 0,
      duration: 0.72,
      arcHeight: 140
    };

    this.shotReady = false;
    this.shotMeter = 0;
    return true;
  }

  resolveShot() {
    if (!this.activeShot) return;

    const keeperLeft = this.goalie.x - this.goalie.width * 0.45;
    const keeperRight = this.goalie.x + this.goalie.width * 0.45;
    const shotX = this.activeShot.targetX;
    const blocked = shotX >= keeperLeft && shotX <= keeperRight;

    if (blocked) {
      this.shotResultLabel = "Saved";
      this.shotResultFlash = 0.8;
    } else {
      this.shotResultLabel = "GOAL";
      this.shotResultFlash = 0.8;
      this.scoreGoal();
    }

    this.activeShot = null;
  }

  update(dt) {
    // Always push last known stats so HUD can show IDLE state too
    this.onStats({
      distance: Math.floor(this.distance),
      coins: this.coinsThisRun,
      goals: this.goalsThisRun,
      shotMeter: this.shotMeter,
      shotReady: this.shotReady,
      bestDistance: Math.floor(this.bestDistance),
      runState: this.runState
    });

    if (this.runState !== RUN_STATE.RUNNING) {
      if (this.goalFlashTime > 0) this.goalFlashTime -= dt;
      if (this.shotResultFlash > 0) this.shotResultFlash -= dt;
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
    if (this.shotResultFlash > 0) this.shotResultFlash -= dt;

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
    const playerY = this.player.baseY + this.player.yOffset;
    let playerHeight = this.player.height;
    if (this.player.isSliding) {
      playerHeight = this.player.height * 0.5;
    }
    const playerX =
      this.laneX(this.player.lane, playerY + playerHeight) -
      this.player.width / 2;

    // Obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      const depthScale = this.depthScale(o.y + o.height);
      const scaledWidth = o.width * depthScale;
      const scaledHeight = o.height * depthScale;
      const ox = this.laneX(o.lane, o.y + scaledHeight) - scaledWidth / 2;
      const oy = o.y;

      if (
        this.rectsOverlap(
          playerX,
          playerY,
          this.player.width,
          playerHeight,
          ox,
          oy,
          scaledWidth,
          scaledHeight
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
      const depthScale = this.depthScale(p.y);
      const px = this.laneX(p.lane, p.y);
      const py = p.y;

      if (
        this.circleRectOverlap(
          px,
          py,
          p.radius * depthScale,
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

        this.pickups.splice(i, 1);
      }
    }

    // Clamp shot meter
    if (this.shotMeter < 0) this.shotMeter = 0;
    if (this.shotMeter >= this.shotMeterMax) {
      this.shotMeter = this.shotMeterMax;
      this.shotReady = true;
    }

    // Goalie pacing between posts
    const goalLeft = this.goal.x - this.goal.width * 0.35;
    const goalRight = this.goal.x + this.goal.width * 0.35;
    this.goalie.x += this.goalie.direction * this.goalie.speed * dt;
    if (this.goalie.x < goalLeft) {
      this.goalie.x = goalLeft;
      this.goalie.direction = 1;
    } else if (this.goalie.x > goalRight) {
      this.goalie.x = goalRight;
      this.goalie.direction = -1;
    }

    // Active shot flight
    if (this.activeShot) {
      this.activeShot.t += dt;
      const t = Math.min(1, this.activeShot.t / this.activeShot.duration);
      const ease = t * (2 - t);
      const x =
        this.activeShot.startX +
        (this.activeShot.targetX - this.activeShot.startX) * ease;
      const straightY =
        this.activeShot.startY +
        (this.activeShot.targetY - this.activeShot.startY) * ease;
      const arcOffset = Math.sin(Math.PI * ease) * this.activeShot.arcHeight;
      this.activeShot.currentX = x;
      this.activeShot.currentY = straightY - arcOffset;

      if (t >= 1) {
        this.resolveShot();
      }
    }

    // Update stats (again after changes)
    this.onStats({
      distance: Math.floor(this.distance),
      coins: this.coinsThisRun,
      goals: this.goalsThisRun,
      shotMeter: this.shotMeter,
      shotReady: this.shotReady,
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

    // Field markings with perspective taper
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.setLineDash([12, 12]);
    for (let i = 1; i < this.lanes; i++) {
      ctx.beginPath();
      ctx.moveTo(this.laneX(i, this.height), this.height);
      ctx.lineTo(this.laneX(i, horizon), horizon + 8);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Extra depth cues running down the pitch
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    for (let i = 0; i < this.lanes; i++) {
      ctx.beginPath();
      ctx.moveTo(this.laneX(i, this.height), this.height);
      ctx.lineTo(this.laneX(i, horizon), horizon + 12);
      ctx.stroke();
    }

    const centerGlow = ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.65,
      40,
      this.width / 2,
      this.height * 0.4,
      260
    );
    centerGlow.addColorStop(0, "rgba(255,255,255,0.08)");
    centerGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, this.width, this.height);

    // Center markings
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.arc(this.width / 2, this.height * 0.45, 70, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawSoccerBall(ctx, x, y, radius) {
    const highlight = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      2,
      x,
      y,
      radius
    );
    highlight.addColorStop(0, "#ffffff");
    highlight.addColorStop(1, "#d8d8d8");
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#111";
    ctx.lineWidth = Math.max(1.2, radius * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    const panels = 5;
    const centerRadius = radius * 0.38;
    ctx.fillStyle = "#0f0f0f";
    ctx.beginPath();
    for (let i = 0; i < panels; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / panels;
      const px = x + Math.cos(angle) * centerRadius;
      const py = y + Math.sin(angle) * centerRadius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#1d1d1d";
    ctx.lineWidth = Math.max(1, radius * 0.12);
    for (let i = 0; i < panels; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / panels;
      const px = x + Math.cos(angle) * centerRadius;
      const py = y + Math.sin(angle) * centerRadius;
      const outerX = x + Math.cos(angle) * radius * 0.88;
      const outerY = y + Math.sin(angle) * radius * 0.88;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }
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

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;

    // Legs with separated thigh and calf for more realistic proportions
    const skinTone = ctx.createLinearGradient(x, y, x, y + h);
    skinTone.addColorStop(0, "#f4d7b8");
    skinTone.addColorStop(1, "#cfa579");
    const leftLegX = x + this.player.width * 0.26;
    const rightLegX = x + this.player.width * 0.6;
    const thighH = h * 0.22;
    const calfH = h * 0.16;
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.roundRect(leftLegX, y + h * 0.6, this.player.width * 0.15, thighH, 6);
    ctx.roundRect(rightLegX, y + h * 0.6, this.player.width * 0.15, thighH, 6);
    ctx.roundRect(leftLegX + this.player.width * 0.01, y + h * 0.6 + thighH, this.player.width * 0.13, calfH, 5);
    ctx.roundRect(rightLegX + this.player.width * 0.01, y + h * 0.6 + thighH, this.player.width * 0.13, calfH, 5);
    ctx.fill();

    // Socks with ribbing highlight
    const sockGradient = ctx.createLinearGradient(x, y + h * 0.78, x, y + h);
    sockGradient.addColorStop(0, "#0e55d8");
    sockGradient.addColorStop(1, "#083a9b");
    ctx.fillStyle = sockGradient;
    ctx.fillRect(leftLegX, y + h * 0.78, this.player.width * 0.15, h * 0.18);
    ctx.fillRect(rightLegX, y + h * 0.78, this.player.width * 0.15, h * 0.18);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(leftLegX, y + h * 0.8, this.player.width * 0.15, h * 0.02);
    ctx.fillRect(rightLegX, y + h * 0.8, this.player.width * 0.15, h * 0.02);

    // Boots with more grounded shading and subtle lacing
    const bootShine = ctx.createLinearGradient(x, y + h * 0.94, x, y + h * 1.02);
    bootShine.addColorStop(0, "#1a1a1a");
    bootShine.addColorStop(1, "#070707");
    ctx.fillStyle = bootShine;
    ctx.beginPath();
    ctx.roundRect(leftLegX - this.player.width * 0.02, y + h * 0.94, this.player.width * 0.2, h * 0.08, 3);
    ctx.roundRect(rightLegX - this.player.width * 0.02, y + h * 0.94, this.player.width * 0.2, h * 0.08, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftLegX + this.player.width * 0.02, y + h * 0.98);
    ctx.lineTo(leftLegX + this.player.width * 0.11, y + h * 0.98);
    ctx.moveTo(rightLegX + this.player.width * 0.02, y + h * 0.98);
    ctx.lineTo(rightLegX + this.player.width * 0.11, y + h * 0.98);
    ctx.stroke();

    // Shorts with more depth and paneling
    const shorts = ctx.createLinearGradient(x, y + h * 0.52, x, y + h * 0.85);
    shorts.addColorStop(0, "#151a2e");
    shorts.addColorStop(1, "#090c17");
    ctx.fillStyle = shorts;
    const shortsX = x + this.player.width * 0.14;
    const shortsW = this.player.width * 0.72;
    ctx.beginPath();
    ctx.roundRect(shortsX, y + h * 0.52, shortsW, h * 0.32, 6);
    ctx.fill();
    ctx.fillStyle = "#0ad0ff";
    ctx.fillRect(shortsX, y + h * 0.62, shortsW, h * 0.025);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(shortsX + shortsW * 0.08, y + h * 0.54, shortsW * 0.12, h * 0.04);
    ctx.fillRect(shortsX + shortsW * 0.76, y + h * 0.56, shortsW * 0.12, h * 0.04);
    const shortsLight = ctx.createLinearGradient(shortsX, y + h * 0.52, shortsX, y + h * 0.84);
    shortsLight.addColorStop(0, "rgba(255,255,255,0.14)");
    shortsLight.addColorStop(0.5, "rgba(255,255,255,0.04)");
    shortsLight.addColorStop(1, "rgba(0,0,0,0.15)");
    ctx.fillStyle = shortsLight;
    ctx.fillRect(shortsX, y + h * 0.52, shortsW, h * 0.32);

    // Torso + jersey with shoulder taper and subtle folds
    const jersey = ctx.createLinearGradient(x, y, x, y + h * 0.6);
    jersey.addColorStop(0, "#0e5dd6");
    jersey.addColorStop(1, "#0a44b1");
    ctx.fillStyle = jersey;
    const torsoX = x + this.player.width * 0.16;
    const torsoW = this.player.width * 0.68;
    ctx.beginPath();
    ctx.roundRect(torsoX, y + h * 0.07, torsoW, h * 0.48, 8);
    ctx.fill();
    ctx.fillStyle = "#0ad0ff";
    ctx.fillRect(torsoX, y + h * 0.24, torsoW, h * 0.035);

    const jerseyLight = ctx.createLinearGradient(
      torsoX - this.player.width * 0.02,
      y + h * 0.06,
      torsoX + torsoW + this.player.width * 0.02,
      y + h * 0.46
    );
    jerseyLight.addColorStop(0, "rgba(255,255,255,0.16)");
    jerseyLight.addColorStop(0.5, "rgba(255,255,255,0)");
    jerseyLight.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = jerseyLight;
    ctx.fillRect(torsoX, y + h * 0.07, torsoW, h * 0.48);
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.moveTo(torsoX + torsoW * 0.5, y + h * 0.08);
    ctx.lineTo(torsoX + torsoW * 0.44, y + h * 0.16);
    ctx.lineTo(torsoX + torsoW * 0.5, y + h * 0.18);
    ctx.stroke();

    // Neck
    const skin = ctx.createLinearGradient(x, y, x, y + h * 0.22);
    skin.addColorStop(0, "#f1d2ae");
    skin.addColorStop(1, "#cfa579");
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.roundRect(x + this.player.width * 0.42, y, this.player.width * 0.16, h * 0.09, 3);
    ctx.fill();

    // Arms with muscle definition and shadowing
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    const armWidth = this.player.width * 0.12;
    const armHeight = h * 0.23;
    const armY = y + h * 0.2;
    const leftArmX = x + this.player.width * 0.05;
    const rightArmX = x + this.player.width * 0.83 - armWidth;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.roundRect(leftArmX, armY, armWidth, armHeight, 6);
    ctx.roundRect(rightArmX, armY, armWidth, armHeight, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(leftArmX + armWidth * 0.08, armY + armHeight * 0.62, armWidth * 0.84, armHeight * 0.2);
    ctx.fillRect(rightArmX + armWidth * 0.08, armY + armHeight * 0.62, armWidth * 0.84, armHeight * 0.2);

    // Sleeves hugging the arms
    const sleeve = ctx.createLinearGradient(x, y, x, y + h * 0.35);
    sleeve.addColorStop(0, "#0e5dd6");
    sleeve.addColorStop(1, "#0a44b1");
    ctx.fillStyle = sleeve;
    ctx.roundRect(leftArmX - this.player.width * 0.01, y + h * 0.16, armWidth + this.player.width * 0.02, h * 0.12, 5);
    ctx.roundRect(rightArmX - this.player.width * 0.01, y + h * 0.16, armWidth + this.player.width * 0.02, h * 0.12, 5);
    ctx.fillStyle = "#0ad0ff";
    ctx.fillRect(leftArmX - this.player.width * 0.01, y + h * 0.25, armWidth + this.player.width * 0.02, h * 0.028);
    ctx.fillRect(rightArmX - this.player.width * 0.01, y + h * 0.25, armWidth + this.player.width * 0.02, h * 0.028);

    // Chest panel edges
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(x + this.player.width * 0.18, y + h * 0.12);
    ctx.lineTo(x + this.player.width * 0.82, y + h * 0.12);
    ctx.stroke();

    // Head with more realistic proportions and facial definition
    const headCenterX = x + this.player.width * 0.5;
    const headCenterY = y - h * 0.02;
    const headRadius = this.player.width * 0.3;
    const face = ctx.createRadialGradient(
      headCenterX - 3,
      headCenterY - 6,
      4,
      headCenterX,
      headCenterY,
      headRadius
    );
    face.addColorStop(0, "#ffd8b0");
    face.addColorStop(1, "#cfa579");
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = face;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();

    // Ears for better silhouette
    ctx.fillStyle = "rgba(225,190,150,0.92)";
    ctx.beginPath();
    ctx.ellipse(
      headCenterX - headRadius * 0.78,
      headCenterY - headRadius * 0.05,
      headRadius * 0.16,
      headRadius * 0.22,
      0,
      0,
      Math.PI * 2
    );
    ctx.ellipse(
      headCenterX + headRadius * 0.78,
      headCenterY - headRadius * 0.05,
      headRadius * 0.16,
      headRadius * 0.22,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Eyes, brows, and nose shading
    ctx.fillStyle = "#0f0f0f";
    ctx.beginPath();
    ctx.arc(headCenterX - 6, headCenterY - 5, 2, 0, Math.PI * 2);
    ctx.arc(headCenterX + 6, headCenterY - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(headCenterX - 8, headCenterY - 9);
    ctx.lineTo(headCenterX - 2, headCenterY - 7);
    ctx.moveTo(headCenterX + 8, headCenterY - 9);
    ctx.lineTo(headCenterX + 2, headCenterY - 7);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.moveTo(headCenterX, headCenterY - 2);
    ctx.quadraticCurveTo(headCenterX + 1, headCenterY + 6, headCenterX - 1, headCenterY + 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,120,110,0.22)";
    ctx.beginPath();
    ctx.arc(headCenterX - headRadius * 0.28, headCenterY + headRadius * 0.04, 4, 0, Math.PI * 2);
    ctx.arc(headCenterX + headRadius * 0.28, headCenterY + headRadius * 0.04, 4, 0, Math.PI * 2);
    ctx.fill();

    // Mouth and jaw line
    ctx.strokeStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY + 7, 5, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY + 10, headRadius * 0.7, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    // Hair with subtle highlights and a thin headband
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY - 1, headRadius, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY - headRadius * 0.4, headRadius * 0.8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0ad0ff";
    ctx.fillRect(
      headCenterX - headRadius,
      headCenterY - headRadius * 0.34,
      headRadius * 2,
      headRadius * 0.14
    );

    // Ball at feet with soccer pattern
    const ballY = y + h + 12;
    const ballX = x + this.player.width / 2;
    this.drawSoccerBall(ctx, ballX, ballY, 10);

    // Glow around the player for depth
    const glow = ctx.createRadialGradient(
      x + this.player.width / 2,
      y + h * 0.42,
      5,
      x + this.player.width / 2,
      y + h * 0.42,
      42
    );
    glow.addColorStop(0, "rgba(255,255,255,0.12)");
    glow.addColorStop(1, "rgba(16,136,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 14, y - 22, this.player.width + 28, h + 58);
  }

  drawDefender(ctx, x, y, width, height) {
    ctx.save();

    // Shadow for depth
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.filter = "blur(2.5px)";
    ctx.beginPath();
    ctx.ellipse(
      x + width / 2,
      y + height * 0.92,
      width * 0.6,
      height * 0.4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Sliding tackle pose with leaner proportions and jersey shading
    const torsoX = x + width * 0.22;
    const torsoY = y + height * 0.24;
    const torsoW = width * 0.56;
    const torsoH = height * 0.44;
    const jersey = ctx.createLinearGradient(torsoX, torsoY, torsoX, torsoY + torsoH);
    jersey.addColorStop(0, "#1c6af0");
    jersey.addColorStop(1, "#0c3f9f");
    ctx.fillStyle = jersey;
    ctx.beginPath();
    ctx.roundRect(torsoX, torsoY, torsoW, torsoH, 7);
    ctx.fill();

    // Number stripe
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(torsoX + torsoW * 0.45, torsoY + torsoH * 0.12, torsoW * 0.1, torsoH * 0.68);

    // Arms reaching out
    const armGradient = ctx.createLinearGradient(x, torsoY, x, torsoY + torsoH * 0.8);
    armGradient.addColorStop(0, "#f1d2ae");
    armGradient.addColorStop(1, "#cfa579");
    ctx.fillStyle = armGradient;
    ctx.beginPath();
    ctx.roundRect(x + width * 0.06, torsoY + torsoH * 0.22, width * 0.18, torsoH * 0.52, 6);
    ctx.roundRect(x + width * 0.72, torsoY + torsoH * 0.08, width * 0.18, torsoH * 0.38, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x + width * 0.08, torsoY + torsoH * 0.62, width * 0.14, torsoH * 0.12);

    // Legs sweeping across
    const legGradient = ctx.createLinearGradient(x, y + height * 0.45, x, y + height);
    legGradient.addColorStop(0, "#f1d2ae");
    legGradient.addColorStop(1, "#cfa579");
    ctx.fillStyle = legGradient;
    ctx.beginPath();
    ctx.roundRect(x + width * 0.12, y + height * 0.56, width * 0.3, height * 0.3, 7);
    ctx.roundRect(x + width * 0.46, y + height * 0.62, width * 0.38, height * 0.24, 7);
    ctx.fill();

    // Cleats
    ctx.fillStyle = "#0f9b4c";
    ctx.roundRect(x + width * 0.1, y + height * 0.82, width * 0.22, height * 0.12, 3);
    ctx.roundRect(x + width * 0.7, y + height * 0.82, width * 0.2, height * 0.12, 3);

    // Head with player-like proportions
    const headRadius = width * 0.26;
    const headCenterX = x + width * 0.5;
    const headCenterY = y + height * 0.18;
    const headGradient = ctx.createLinearGradient(
      headCenterX,
      headCenterY - headRadius,
      headCenterX,
      headCenterY + headRadius
    );
    headGradient.addColorStop(0, "#f1d2ae");
    headGradient.addColorStop(1, "#cfa579");
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Facial features
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY + headRadius * 0.32, headRadius * 0.42, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headCenterX - headRadius * 0.4, headCenterY - headRadius * 0.08, headRadius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headCenterX + headRadius * 0.4, headCenterY - headRadius * 0.08, headRadius * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Hairband detail
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY - headRadius * 0.18, headRadius, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(
      headCenterX - headRadius,
      headCenterY - headRadius * 0.28,
      headRadius * 2,
      headRadius * 0.14
    );

    // Gloves
    ctx.fillStyle = "#0f9b4c";
    ctx.beginPath();
    ctx.roundRect(x + width * 0.08, torsoY + torsoH * 0.68, width * 0.14, width * 0.12, 4);
    ctx.roundRect(x + width * 0.84, torsoY + torsoH * 0.12, width * 0.12, width * 0.12, 4);
    ctx.fill();
  }

  drawStandingDefender(ctx, x, y, width, height) {
    ctx.save();

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.filter = "blur(2px)";
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height, width * 0.45, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs
    const legGradient = ctx.createLinearGradient(x, y + height * 0.55, x, y + height);
    legGradient.addColorStop(0, "#f1d2ae");
    legGradient.addColorStop(1, "#cfa579");
    ctx.fillStyle = legGradient;
    ctx.beginPath();
    ctx.roundRect(x + width * 0.2, y + height * 0.56, width * 0.18, height * 0.36, 7);
    ctx.roundRect(x + width * 0.54, y + height * 0.54, width * 0.18, height * 0.4, 7);
    ctx.fill();

    // Socks and cleats
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(x + width * 0.2, y + height * 0.82, width * 0.18, height * 0.08, 3);
    ctx.roundRect(x + width * 0.54, y + height * 0.8, width * 0.18, height * 0.08, 3);
    ctx.fillStyle = "#0f9b4c";
    ctx.roundRect(x + width * 0.16, y + height * 0.9, width * 0.22, height * 0.08, 3);
    ctx.roundRect(x + width * 0.5, y + height * 0.88, width * 0.22, height * 0.08, 3);

    // Torso
    const torsoX = x + width * 0.2;
    const torsoY = y + height * 0.18;
    const torsoW = width * 0.6;
    const torsoH = height * 0.4;
    const jersey = ctx.createLinearGradient(torsoX, torsoY, torsoX, torsoY + torsoH);
    jersey.addColorStop(0, "#1b8a3e");
    jersey.addColorStop(1, "#0c4e24");
    ctx.fillStyle = jersey;
    ctx.beginPath();
    ctx.roundRect(torsoX, torsoY, torsoW, torsoH, 9);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillRect(torsoX + torsoW * 0.38, torsoY + torsoH * 0.08, torsoW * 0.2, torsoH * 0.12);
    ctx.fillRect(torsoX + torsoW * 0.22, torsoY + torsoH * 0.32, torsoW * 0.56, torsoH * 0.12);

    // Arms crossed for blocking
    const armGradient = ctx.createLinearGradient(x, torsoY, x, torsoY + torsoH);
    armGradient.addColorStop(0, "#f1d2ae");
    armGradient.addColorStop(1, "#cfa579");
    ctx.fillStyle = armGradient;
    ctx.beginPath();
    ctx.roundRect(torsoX - width * 0.04, torsoY + torsoH * 0.12, width * 0.2, torsoH * 0.4, 6);
    ctx.roundRect(torsoX + torsoW - width * 0.16, torsoY + torsoH * 0.14, width * 0.2, torsoH * 0.4, 6);
    ctx.fill();

    // Gloves
    ctx.fillStyle = "#ffd447";
    ctx.roundRect(torsoX - width * 0.04, torsoY + torsoH * 0.4, width * 0.18, width * 0.12, 4);
    ctx.roundRect(torsoX + torsoW - width * 0.14, torsoY + torsoH * 0.42, width * 0.18, width * 0.12, 4);

    // Head
    const headRadius = width * 0.22;
    const headCenterX = x + width * 0.5;
    const headCenterY = y + height * 0.12 + headRadius;
    const headGradient = ctx.createLinearGradient(
      headCenterX,
      headCenterY - headRadius,
      headCenterX,
      headCenterY + headRadius
    );
    headGradient.addColorStop(0, "#f1d2ae");
    headGradient.addColorStop(1, "#cfa579");
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Facial features
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY + headRadius * 0.32, headRadius * 0.42, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headCenterX - headRadius * 0.38, headCenterY - headRadius * 0.08, headRadius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headCenterX + headRadius * 0.38, headCenterY - headRadius * 0.08, headRadius * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#2a1d11";
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY - headRadius * 0.08, headRadius, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe27a";
    ctx.fillRect(
      headCenterX - headRadius,
      headCenterY - headRadius * 0.2,
      headRadius * 2,
      headRadius * 0.12
    );
  }

  drawObstacles(ctx) {
    for (const o of this.obstacles) {
      const depthScale = this.depthScale(o.y + o.height);
      const width = o.width * depthScale;
      const height = o.height * depthScale;
      const x = this.laneX(o.lane, o.y + height) - width / 2;
      const y = o.y;

      if (o.type === "ground") {
        this.drawDefender(ctx, x, y, width, height);
      } else {
        this.drawStandingDefender(ctx, x, y, width, height);
      }
    }
  }

  drawPickups(ctx) {
    for (const p of this.pickups) {
      const depthScale = this.depthScale(p.y);
      const x = this.laneX(p.lane, p.y);
      const y = p.y;
      const radius = p.radius * depthScale;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, radius * 2.4);
      if (p.type === "coin") {
        glow.addColorStop(0, "rgba(255, 216, 110, 0.8)");
        glow.addColorStop(1, "rgba(255, 216, 110, 0)");
      } else {
        glow.addColorStop(0, "rgba(255,255,255,0.7)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      if (p.type === "coin") {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#f1c40f";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        this.drawSoccerBall(ctx, x, y, radius);
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

  drawGoalArea(ctx) {
    // Goal box
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      this.goal.x - this.goal.width / 2,
      this.goal.y,
      this.goal.width,
      this.goal.height
    );

    // Netting
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    const rows = 5;
    const cols = 10;
    for (let i = 1; i < rows; i++) {
      const y = this.goal.y + (this.goal.height / rows) * i;
      ctx.beginPath();
      ctx.moveTo(this.goal.x - this.goal.width / 2, y);
      ctx.lineTo(this.goal.x + this.goal.width / 2, y);
      ctx.stroke();
    }
    for (let i = 1; i < cols; i++) {
      const x = this.goal.x - this.goal.width / 2 + (this.goal.width / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, this.goal.y);
      ctx.lineTo(x, this.goal.y + this.goal.height);
      ctx.stroke();
    }

    // Goalie shadow and body
    this.drawGoalie(ctx);

    if (this.shotResultFlash > 0 && this.shotResultLabel) {
      const alpha = Math.min(1, this.shotResultFlash / 0.8);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = "bold 26px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(this.shotResultLabel, this.width / 2, this.goal.y - 12);
    }
    ctx.restore();
  }

  drawGoalie(ctx) {
    const g = this.goalie;
    const x = g.x - g.width / 2;
    const y = g.y;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.filter = "blur(2px)";
    ctx.beginPath();
    ctx.ellipse(g.x, y + g.height, g.width * 0.5, g.height * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs in stance
    const legGradient = ctx.createLinearGradient(x, y + g.height * 0.5, x, y + g.height);
    legGradient.addColorStop(0, "#f0d3b3");
    legGradient.addColorStop(1, "#d5b08a");
    ctx.fillStyle = legGradient;
    ctx.beginPath();
    ctx.roundRect(x + g.width * 0.12, y + g.height * 0.52, g.width * 0.28, g.height * 0.46, 8);
    ctx.roundRect(x + g.width * 0.6, y + g.height * 0.48, g.width * 0.26, g.height * 0.5, 8);
    ctx.fill();

    ctx.fillStyle = "#1f6f3f";
    ctx.roundRect(x + g.width * 0.1, y + g.height * 0.86, g.width * 0.32, g.height * 0.14, 4);
    ctx.roundRect(x + g.width * 0.58, y + g.height * 0.84, g.width * 0.3, g.height * 0.14, 4);

    // Torso and arms
    const torsoX = x + g.width * 0.12;
    const torsoY = y + g.height * 0.12;
    const torsoW = g.width * 0.76;
    const torsoH = g.height * 0.46;
    const jersey = ctx.createLinearGradient(torsoX, torsoY, torsoX, torsoY + torsoH);
    jersey.addColorStop(0, "#ff9f43");
    jersey.addColorStop(1, "#e1701a");
    ctx.fillStyle = jersey;
    ctx.beginPath();
    ctx.roundRect(torsoX, torsoY, torsoW, torsoH, 12);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(torsoX + torsoW * 0.38, torsoY + torsoH * 0.1, torsoW * 0.18, torsoH * 0.16);
    ctx.fillRect(torsoX + torsoW * 0.18, torsoY + torsoH * 0.34, torsoW * 0.64, torsoH * 0.12);

    // Arms reaching wide
    const armGradient = ctx.createLinearGradient(x, torsoY, x, torsoY + torsoH);
    armGradient.addColorStop(0, "#f5d7b2");
    armGradient.addColorStop(1, "#d6b08a");
    ctx.fillStyle = armGradient;
    ctx.beginPath();
    ctx.roundRect(torsoX - g.width * 0.18, torsoY + torsoH * 0.08, g.width * 0.26, torsoH * 0.55, 8);
    ctx.roundRect(torsoX + torsoW - g.width * 0.08, torsoY + torsoH * 0.04, g.width * 0.26, torsoH * 0.6, 8);
    ctx.fill();

    ctx.fillStyle = "#2f9e44";
    ctx.roundRect(torsoX - g.width * 0.2, torsoY + torsoH * 0.5, g.width * 0.28, g.width * 0.14, 6);
    ctx.roundRect(torsoX + torsoW - g.width * 0.06, torsoY + torsoH * 0.48, g.width * 0.28, g.width * 0.14, 6);

    // Head
    const headRadius = g.width * 0.2;
    const headCenterX = g.x;
    const headCenterY = y + g.height * 0.14 + headRadius;
    const headGradient = ctx.createLinearGradient(
      headCenterX,
      headCenterY - headRadius,
      headCenterX,
      headCenterY + headRadius
    );
    headGradient.addColorStop(0, "#f5d7b2");
    headGradient.addColorStop(1, "#d6b08a");
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Facial features
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY + headRadius * 0.36, headRadius * 0.46, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headCenterX - headRadius * 0.42, headCenterY - headRadius * 0.06, headRadius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headCenterX + headRadius * 0.42, headCenterY - headRadius * 0.06, headRadius * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Hair and headband
    ctx.fillStyle = "#1c1c1c";
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY - headRadius * 0.08, headRadius, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f9e44";
    ctx.fillRect(
      headCenterX - headRadius,
      headCenterY - headRadius * 0.24,
      headRadius * 2,
      headRadius * 0.14
    );
  }

  drawActiveShot(ctx) {
    if (!this.activeShot) return;
    this.drawSoccerBall(
      ctx,
      this.activeShot.currentX,
      this.activeShot.currentY,
      12
    );

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.activeShot.startX, this.activeShot.startY);
    ctx.quadraticCurveTo(
      (this.activeShot.startX + this.activeShot.targetX) / 2,
      this.activeShot.startY - this.activeShot.arcHeight,
      this.activeShot.targetX,
      this.activeShot.targetY
    );
    ctx.stroke();
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawPitch(ctx);
    this.drawObstacles(ctx);
    this.drawPickups(ctx);
    this.drawGoalArea(ctx);
    this.drawPlayer(ctx);
    this.drawActiveShot(ctx);
  }
}
