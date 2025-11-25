// js/game.js

const RUN_STATE = {
  IDLE: "idle",
  RUNNING: "running",
  PAUSED: "paused",
  ENDED: "ended"
};

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function shadeColor(hex, amount) {
  if (!hex || typeof hex !== "string") return hex;
  const sanitized = hex.replace("#", "");
  const num = parseInt(sanitized, 16);
  const r = clampColor((num >> 16) + amount);
  const g = clampColor(((num >> 8) & 0x00ff) + amount);
  const b = clampColor((num & 0x0000ff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`;
}

function hexToRgba(hex, alpha = 1) {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildKitPalette(custom = {}) {
  const primary = custom.primary || "#1f3a74";
  const secondary = custom.secondary || "#80223c";
  const trim = custom.trim || "#0bd3c7";

  return {
    primary,
    primaryShadow: custom.primaryShadow || shadeColor(primary, -18),
    secondary,
    secondaryShadow: custom.secondaryShadow || shadeColor(secondary, -18),
    trim,
    sockStripe: custom.sockStripe || "#f2f4ff",
    boot: custom.boot || "#0f1e46"
  };
}

export class Game {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.pixelRatio = options.pixelRatio || 1;
    this.ctx.imageSmoothingEnabled = false;
    if (this.pixelRatio !== 1 && this.ctx.setTransform) {
      this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }
    this.width = options.logicalWidth || canvas.width / this.pixelRatio;
    this.height = options.logicalHeight || canvas.height / this.pixelRatio;

    this.pixelSize = 4;
    this.palette = {
      turfDark: "#0c2a24",
      turfMid: "#0f3d30",
      turfLight: "#155f44",
      turfHighlight: "#1f7a4f",
      touchline: "#0a1524",
      chalk: "#d4f5d4",
      shadow: "#0a0f16",
      playerSkin: "#f5d8b5",
      playerSkinShade: "#d3b08a",
      kitPrimary: "#1f3a74",
      kitPrimaryDark: "#162747",
      kitSecondary: "#80223c",
      kitSecondaryDark: "#4e0f26",
      kitTrim: "#0bd3c7",
      net: "#e8f7ff",
      glow: "#2dfc8a",
      crowdJersey: ["#0f9b7f", "#1f3a74", "#ed4b88", "#ffc857", "#f1f5f9"],
      crowdShadow: "#050912"
    };

    // Layered rendering buffers to keep static detail cheap
    this.visualVariant = options.visualVariant || "v1";
    this.pitchLayer = null;
    this.atmosphereLayer = null;
    this.buildStaticLayers();

    // Moment-to-moment FX
    this.particles = [];
    this.particleAccumulator = 0;
    this.playerTrail = [];
    this.trailAccumulator = 0;

    this.lanes = 3;
    const tuning = options.tuning || {};
    this.baseSpeed = 220 * (tuning.sprintSpeed || 1); // px/s
    this.shotGainRate = tuning.shotGainRate || 1;
    this.reviveInvulnDuration =
      tuning.reviveInvulnDuration == null ? 0.9 : tuning.reviveInvulnDuration;
    this.jukeCooldownDuration = tuning.jukeCooldown || 1;
    this.tackleDurationBase = tuning.tackleDuration || 0.55;
    this.jukeDurationBase = tuning.jukeDuration || 0.42;
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
    this.perks = {
      laneChangeSpeed: 1,
      jukeDistance: 1,
      tackleDefenseBonus: 1,
      goalieFreezeChance: 0,
      coinMagnetRange: 1,
      ...(options.perks || {})
    };
    this.playerCardMeta = playerCard;
    const kitColors = options.kitColors || {};
    this.kit = buildKitPalette(kitColors);
    this.ballAccent = options.ballAccent || kitColors.ballAccent || "#f2f4ff";

    // Player
    this.player = {
      lane: 1,
      width: 44,
      height: 78,
      baseY: this.height - 140,
      yOffset: 0,
      laneOffset: 0,
      isTackling: false,
      isJuking: false,
      tackleTime: 0,
      jukeTime: 0,
      tackleDuration: 0.55,
      jukeDuration: 0.42 / Math.max(0.65, this.perks.laneChangeSpeed),
      jukeDistance: 22 * (this.perks.jukeDistance || 1),
      jukeDirection: 1,
      tackleDirection: 1,
      jukeCooldownTimer: 0
    };

    // Run stats
    this.resetRunStats();
    this.bestDistance = options.bestDistance || 0;

    // Systems
    this.elapsedTime = 0;
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
      speed: 110,
      baseSpeed: 110,
      freezeTime: 0
    };

    this.defaultGoal = { ...this.goal };
    this.defaultGoalie = { ...this.goalie };
    this.syncGoalPose(this.getFieldGeometry());

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

    this.reviveInvulnTime = 0;
  }

  getRunState() {
    return this.runState;
  }

  laneX(idx, y = this.height) {
    const geometry = this.getFieldGeometry();
    const { horizon, topSpan, bottomSpan } = geometry;
    const t = this.getPerspectiveProgress(y, geometry);
    const laneSpan = topSpan + (bottomSpan - topSpan) * t;
    const start = this.width / 2 - laneSpan / 2;
    const step = laneSpan / (this.lanes - 1);
    return start + step * idx;
  }

  depthScale(y) {
    const geometry = this.getFieldGeometry();
    const t = this.getPerspectiveProgress(y, geometry);

    if (this.visualVariant === "v2") {
      return 0.42 + t * 1.08;
    }

    return 0.55 + t * 0.55;
  }

  getFieldGeometry() {
    const isV2 = this.visualVariant === "v2";
    const horizon = this.height * (isV2 ? 0.36 : 0.12);
    const bottomSpan = this.width * (isV2 ? 1.08 : 0.46);
    const topSpan = this.width * (isV2 ? 0.12 : 0.32);

    return {
      horizon,
      topSpan,
      bottomSpan,
      topStart: this.width / 2 - topSpan / 2,
      bottomStart: this.width / 2 - bottomSpan / 2
    };
  }

  getPerspectiveProgress(y, geometry) {
    const { horizon } = geometry;
    const clamped = Math.max(0, Math.min(1, (y - horizon) / (this.height - horizon)));
    if (this.visualVariant !== "v2") return clamped;

    return Math.pow(clamped, 1.25);
  }

  createLayer(drawFn) {
    const layer = document.createElement("canvas");
    layer.width = this.width;
    layer.height = this.height;
    const ctx = layer.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx);
    return layer;
  }

  buildStaticLayers() {
    this.pitchLayer = this.createLayer((ctx) => {
      this.drawPitchSurface(ctx);
    });

    this.atmosphereLayer = this.createLayer((ctx) => {
      this.drawAtmosphericBackdrop(ctx);
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, "rgba(10,14,26,0.9)");
      grad.addColorStop(0.4, "rgba(9,14,22,0.35)");
      grad.addColorStop(1, "rgba(7,12,18,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    });
  }

  snap(value) {
    return Math.round(value / this.pixelSize) * this.pixelSize;
  }

  drawPixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(this.snap(x), this.snap(y), Math.max(this.pixelSize, w), Math.max(this.pixelSize, h));
  }

  drawSpriteMatrix(ctx, matrix, colors, x, y, width, height) {
    if (!Array.isArray(matrix) || !matrix.length) return;
    const rows = matrix.length;
    const cols = matrix[0].length || 1;
    const px = width / cols;
    const py = height / rows;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = matrix[row][col];
        if (!cell || cell === ".") continue;
        const fill = colors[cell];
        if (!fill) continue;
        this.drawPixelRect(ctx, x + col * px, y + row * py, px, py, fill);
      }
    }
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
    this.player.isTackling = false;
    this.player.isJuking = false;
    this.player.tackleTime = 0;
    this.player.jukeTime = 0;
    this.player.tackleDuration = this.tackleDurationBase;
    this.player.jukeDuration = this.jukeDurationBase;
    this.player.tackleDirection = 1;
    this.player.jukeDirection = 1;
    this.player.laneOffset = 0;
    this.player.yOffset = 0;
    this.player.jukeCooldownTimer = 0;
    this.reviveInvulnTime = 0;
    this.onState(this.runState);
  }

  reviveAfterContinue() {
    if (this.runState !== RUN_STATE.ENDED) return false;

    this.runState = RUN_STATE.RUNNING;
    this.player.isTackling = false;
    this.player.isJuking = false;
    this.player.tackleTime = 0;
    this.player.jukeTime = 0;
    this.player.laneOffset = 0;
    this.player.yOffset = 0;

    // Clear out any nearby obstacles so the player is not immediately hit again.
    this.obstacles = this.obstacles.filter((o) => o.y < this.height * 0.45);
    this.reviveInvulnTime = this.reviveInvulnDuration;
    this.onState(this.runState);
    return true;
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

  abortRun() {
    if (this.runState === RUN_STATE.IDLE) return;

    this.runState = RUN_STATE.IDLE;
    this.resetRunStats();
    this.obstacles = [];
    this.pickups = [];
    this.activeShot = null;
    this.shotResultLabel = "";
    this.onState(this.runState);
  }

  handleMove(action) {
    if (this.runState !== RUN_STATE.RUNNING) return;

    if (action === "left") {
      if (this.player.lane > 0) this.player.lane -= 1;
    } else if (action === "right") {
      if (this.player.lane < this.lanes - 1) this.player.lane += 1;
    } else if (action === "tackle") {
      if (!this.player.isTackling && !this.player.isJuking) {
        this.player.isTackling = true;
        this.player.tackleTime = 0;
        this.player.tackleDirection = Math.random() < 0.5 ? -1 : 1;
        this.player.yOffset = 0;
      }
    } else if (action === "juke") {
      if (
        !this.player.isJuking &&
        !this.player.isTackling &&
        this.player.jukeCooldownTimer <= 0
      ) {
        this.player.isJuking = true;
        this.player.jukeTime = 0;
        this.player.jukeDirection = Math.random() < 0.5 ? -1 : 1;
      }
    }
  }

  spawnObstacle() {
    const lane = Math.floor(Math.random() * this.lanes);
    const high = Math.random() < 0.35;
    const type = high ? "high" : "ground"; // high = upright defender; ground = low slide tackle
    const hasBall = Math.random() < 0.4;
    // Match defenders to the player's slimmer silhouette
    const width = 48;
    const height = high ? 92 : 72;
    const geometry = this.getFieldGeometry();
    const progress = -0.08;
    this.obstacles.push({
      lane,
      progress,
      y: this.fieldProgressToY(progress, geometry),
      width,
      height,
      type,
      hasBall
    });
  }

  spawnPickup() {
    const lane = Math.floor(Math.random() * this.lanes);
    const type = Math.random() < 0.7 ? "coin" : "ball";
    const geometry = this.getFieldGeometry();
    const progress = -0.06;
    this.pickups.push({
      lane,
      progress,
      y: this.fieldProgressToY(progress, geometry),
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

    const freezeChance = Math.max(0, Math.min(1, this.perks.goalieFreezeChance || 0));
    if (freezeChance > 0 && Math.random() < freezeChance) {
      this.goalie.freezeTime = 0.7 + Math.random() * 0.4;
    }

    this.shotReady = false;
    this.shotMeter = 0;
    return true;
  }

  resolveShot() {
    if (!this.activeShot) return;

    const freezePenalty = this.goalie.freezeTime > 0 ? 0.65 : 1;
    const keeperLeft =
      this.goalie.x - this.goalie.width * 0.45 * freezePenalty;
    const keeperRight =
      this.goalie.x + this.goalie.width * 0.45 * freezePenalty;
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
    this.elapsedTime += dt;
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
    if (this.goalie.freezeTime > 0) this.goalie.freezeTime = Math.max(0, this.goalie.freezeTime - dt);

    // Player animation: tackle & juke
    this.player.laneOffset = 0;
    if (this.player.isTackling) {
      this.player.tackleTime += dt;
      const t = Math.min(this.player.tackleTime / this.player.tackleDuration, 1);
      const slideEase = Math.sin(t * Math.PI);
      this.player.laneOffset = slideEase * 18 * this.player.tackleDirection;
      this.player.yOffset = 10;
      if (t >= 1) {
        this.player.isTackling = false;
        this.player.yOffset = 0;
      }
    } else if (this.player.isJuking) {
      this.player.jukeTime += dt;
      const t = Math.min(this.player.jukeTime / this.player.jukeDuration, 1);
      const sway = Math.sin(Math.PI * t);
      this.player.laneOffset = this.player.jukeDirection * this.player.jukeDistance * sway;
      this.player.yOffset = -34 * sway;
      if (t >= 1) {
        this.player.isJuking = false;
        this.player.laneOffset = 0;
        this.player.yOffset = 0;
        this.player.jukeCooldownTimer = this.jukeCooldownDuration;
      }
    } else {
      this.player.yOffset = 0;
    }

    // Dots/trail FX disabled
    // this.updatePlayerTrail(dt);
    // this.updateParticles(dt);

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
    const fieldProgressDelta = dy / (this.height - geometry.horizon);

    if (this.reviveInvulnTime > 0) {
      this.reviveInvulnTime = Math.max(0, this.reviveInvulnTime - dt);
    }

    // Move obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      obstacle.progress =
        obstacle.progress == null
          ? this.yToFieldProgress(obstacle.y, geometry)
          : obstacle.progress;
      obstacle.progress += fieldProgressDelta;
      obstacle.y = this.fieldProgressToY(obstacle.progress, geometry);

      if (obstacle.y > this.height + 120) {
        this.obstacles.splice(i, 1);
      }
    }

    // Move pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      pickup.progress =
        pickup.progress == null ? this.yToFieldProgress(pickup.y, geometry) : pickup.progress;
      pickup.progress += fieldProgressDelta;
      pickup.y = this.fieldProgressToY(pickup.progress, geometry);

      if (pickup.y > this.height + 80) {
        this.pickups.splice(i, 1);
      }
    }

    // Collision detection
    const playerY = this.player.baseY + this.player.yOffset;
    let playerHeight = this.player.height;
    let playerWidth = this.player.width;
    if (this.player.isTackling) {
      playerHeight = this.player.height * 0.5;
      const leniency = Math.max(1, this.perks.tackleDefenseBonus || 1);
      playerWidth = this.player.width / leniency;
      playerHeight = playerHeight / leniency;
    }
    const playerX =
      this.laneX(this.player.lane, playerY + playerHeight) -
      playerWidth / 2 +
      this.player.laneOffset;

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
          playerWidth,
          playerHeight,
          ox,
          oy,
          scaledWidth,
          scaledHeight
        )
      ) {
        const isBallCarrier = o.hasBall;
        const dodging = this.player.isJuking;
        const tackling = this.player.isTackling;
        const recovering = this.reviveInvulnTime > 0;

        if (isBallCarrier && tackling) {
          this.shotMeter += 20 * this.shotGainMultiplier * this.shotGainRate;
          this.coinsThisRun += Math.max(1, Math.round(this.coinMultiplier));
          this.obstacles.splice(i, 1);
          i -= 1;
          continue;
        }

        const safeTackle = o.type === "high" && tackling;
        const safeDodge = dodging || recovering;

        if (safeTackle || safeDodge) {
          this.obstacles.splice(i, 1);
          i -= 1;
          continue;
        }

        this.endRun();
        return;
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
          p.radius * depthScale * (p.type === "coin" ? this.perks.coinMagnetRange || 1 : 1),
          playerX,
          playerY,
          playerWidth,
          playerHeight
        )
      ) {
        if (p.type === "coin") {
          const gain = Math.max(1, Math.round(this.coinMultiplier));
          this.coinsThisRun += gain;
          this.shotMeter += 10 * this.shotGainMultiplier * this.shotGainRate;
        } else if (p.type === "ball") {
          this.shotMeter += 25 * this.shotGainMultiplier * this.shotGainRate;
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
    const goalieSpeed =
      this.goalie.freezeTime > 0
        ? this.goalie.baseSpeed * 0.3
        : this.goalie.baseSpeed;
    this.goalie.speed = goalieSpeed;
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

  drawPitchSurface(ctx) {
    if (this.visualVariant === "v2") {
      this.drawPitchSurfaceV2(ctx);
      return;
    }

    this.drawPitchSurfaceV1(ctx);
  }

  drawPitchSurfaceV1(ctx) {
    const { palette } = this;
    const { horizon } = this.getFieldGeometry();

    // Base turf with subtle gradient
    const grass = ctx.createLinearGradient(0, horizon, 0, this.height);
    grass.addColorStop(0, palette.turfMid);
    grass.addColorStop(1, palette.turfDark);
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, this.width, this.height);

    // Mowed stripe pattern
    const stripeHeight = this.height / 18;
    for (let i = 0; i < 24; i++) {
      const y = horizon + i * stripeHeight;
      const color = i % 2 === 0 ? palette.turfLight : palette.turfHighlight;
      this.drawPixelRect(ctx, this.width * 0.06, y, this.width * 0.88, stripeHeight + 2, color);
    }

    // Angled sheen to mimic stadium lighting on grass
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.translate(this.width * -0.15, horizon * 0.1);
    ctx.rotate((-6 * Math.PI) / 180);
    for (let i = 0; i < 16; i++) {
      const y = i * stripeHeight * 0.75;
      const shade = i % 2 === 0 ? palette.turfHighlight : palette.turfLight;
      this.drawPixelRect(ctx, 0, y, this.width * 1.4, stripeHeight * 0.6, shade);
    }
    ctx.restore();

    // Surrounding touchline and ad boards
    const touchlineHeight = horizon + this.pixelSize * 3;
    ctx.fillStyle = palette.touchline;
    ctx.fillRect(0, horizon - this.pixelSize * 2, this.width, touchlineHeight);
    this.drawCrowdBand(ctx, horizon);
    this.drawAdBoards(ctx, horizon);

    // Retro vignette edge
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, horizon, this.width, this.pixelSize * 2);
    ctx.fillRect(0, this.height - this.pixelSize * 3, this.width, this.pixelSize * 3);

    // Lane markers + pitch chalk
    ctx.fillStyle = palette.chalk;
    for (let i = 1; i < this.lanes; i++) {
      const x1 = this.snap(this.laneX(i, this.height));
      const x2 = this.snap(this.laneX(i, horizon));
      const step = this.pixelSize * 2;
      for (let y = horizon; y < this.height; y += step * 2) {
        const t = (y - horizon) / (this.height - horizon);
        const x = x2 + (x1 - x2) * t;
        this.drawPixelRect(ctx, x - this.pixelSize / 2, y, this.pixelSize, step, palette.chalk);
      }
    }

    // Halfway line
    for (let y = horizon + this.pixelSize * 2; y < this.height; y += this.pixelSize * 4) {
      this.drawPixelRect(ctx, this.width / 2 - this.pixelSize / 2, y, this.pixelSize, this.pixelSize * 2, palette.chalk);
    }

    // Penalty areas and goal boxes
    this.drawChalkBox(ctx, this.width * 0.17, this.height * 0.12, this.width * 0.66, this.height * 0.2);
    this.drawChalkBox(ctx, this.width * 0.26, this.height * 0.2, this.width * 0.48, this.height * 0.12);

    // Center circle + spot in chunky pixels
    const circleRadius = 70;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const cx = this.width / 2 + Math.cos(angle) * circleRadius;
      const cy = this.height * 0.45 + Math.sin(angle) * circleRadius;
      this.drawPixelRect(ctx, cx, cy, this.pixelSize * 2, this.pixelSize * 2, palette.chalk);
    }
    this.drawPixelRect(
      ctx,
      this.width / 2 - this.pixelSize / 2,
      this.height * 0.45 - this.pixelSize / 2,
      this.pixelSize,
      this.pixelSize,
      palette.chalk
    );

    // Corner arcs
    const arcSize = this.pixelSize * 3;
    const corners = [
      [this.width * 0.06, horizon + this.pixelSize * 4],
      [this.width * 0.94 - arcSize, horizon + this.pixelSize * 4]
    ];
    corners.forEach(([x, y]) => {
      this.drawPixelRect(ctx, x, y, arcSize, this.pixelSize, palette.chalk);
      this.drawPixelRect(ctx, x, y, this.pixelSize, arcSize, palette.chalk);
    });
  }

  drawPitchSurfaceV2(ctx) {
    const { palette } = this;
    const geometry = this.getFieldGeometry();
    const { horizon, topSpan, bottomSpan } = geometry;

    ctx.fillStyle = palette.touchline;
    ctx.fillRect(0, 0, this.width, this.height);

    const grass = ctx.createLinearGradient(0, horizon, 0, this.height);
    grass.addColorStop(0, palette.turfMid);
    grass.addColorStop(1, palette.turfDark);

    ctx.save();
    this.tracePerspectiveField(ctx, geometry);
    ctx.fillStyle = grass;
    ctx.fill();

    ctx.clip();
    const stripeHeight = this.height / 20;
    for (let i = -2; i < 28; i++) {
      const y = horizon + i * stripeHeight;
      const color = i % 2 === 0 ? palette.turfLight : palette.turfHighlight;
      this.drawPixelRect(ctx, geometry.bottomStart, y, bottomSpan, stripeHeight + 2, color);
    }

    const shoulder = ctx.createLinearGradient(
      geometry.bottomStart,
      0,
      geometry.bottomStart + bottomSpan,
      0
    );
    shoulder.addColorStop(0, hexToRgba(palette.turfLight, 0.42));
    shoulder.addColorStop(0.12, hexToRgba(palette.turfHighlight, 0.26));
    shoulder.addColorStop(0.5, "rgba(0,0,0,0)");
    shoulder.addColorStop(0.88, hexToRgba(palette.turfHighlight, 0.26));
    shoulder.addColorStop(1, hexToRgba(palette.turfLight, 0.42));
    ctx.fillStyle = shoulder;
    ctx.fillRect(geometry.bottomStart, horizon, bottomSpan, this.height - horizon);

    // Outline the touchline in chalk so the pitch stays recognizably football
    ctx.save();
    this.tracePerspectiveField(ctx, geometry);
    ctx.strokeStyle = hexToRgba(palette.chalk, 0.9);
    ctx.lineWidth = this.pixelSize * 1.6;
    ctx.stroke();
    ctx.restore();

    this.drawConvergingLaneMarkers(ctx, geometry);

    // Penalty areas and goal boxes hugging the converged touchlines
    const penaltyWidth = bottomSpan * 0.72;
    const penaltyX = this.width / 2 - penaltyWidth / 2;
    this.drawChalkBox(ctx, penaltyX, horizon + this.pixelSize * 3, penaltyWidth, this.height * 0.2);

    const goalBoxWidth = bottomSpan * 0.52;
    const goalBoxX = this.width / 2 - goalBoxWidth / 2;
    this.drawChalkBox(ctx, goalBoxX, horizon + this.pixelSize * 18, goalBoxWidth, this.height * 0.12);

    // Penalty arc near the box to reinforce the soccer layout
    const arcRadius = bottomSpan * 0.16;
    const arcY = horizon + this.pixelSize * 22;
    ctx.beginPath();
    ctx.arc(this.width / 2, arcY, arcRadius, Math.PI * 0.06, Math.PI - Math.PI * 0.06);
    ctx.strokeStyle = hexToRgba(palette.chalk, 0.9);
    ctx.lineWidth = this.pixelSize;
    ctx.stroke();

    // Corner arcs at the near touchlines
    const cornerRadius = this.pixelSize * 6;
    const bottomY = this.height - this.pixelSize * 2;
    const leftCornerX = geometry.bottomStart + this.pixelSize * 2;
    const rightCornerX = geometry.bottomStart + bottomSpan - this.pixelSize * 2;
    ctx.beginPath();
    ctx.arc(leftCornerX, bottomY, cornerRadius, Math.PI * 1.5, Math.PI * 2);
    ctx.arc(rightCornerX, bottomY, cornerRadius, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // Simple goal frame perched at the horizon
    const goalWidth = topSpan * 0.32;
    const goalHeight = this.pixelSize * 10;
    const goalX = geometry.topStart + topSpan / 2 - goalWidth / 2;
    const goalY = horizon - goalHeight - this.pixelSize * 2;
    this.drawChalkBox(ctx, goalX, goalY, goalWidth, goalHeight);

    // Center circle and spot anchored midway down the perspective
    const circleRadius = 62;
    const centerY = horizon + (this.height - horizon) * 0.52;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const cx = this.width / 2 + Math.cos(angle) * circleRadius;
      const cy = centerY + Math.sin(angle) * circleRadius;
      this.drawPixelRect(ctx, cx, cy, this.pixelSize * 2, this.pixelSize * 2, palette.chalk);
    }
    this.drawPixelRect(
      ctx,
      this.width / 2 - this.pixelSize / 2,
      centerY - this.pixelSize / 2,
      this.pixelSize,
      this.pixelSize,
      palette.chalk
    );

    ctx.restore();

    // Draw crisp trapezoid outline after restoring the clip
    ctx.save();
    this.tracePerspectiveField(ctx, geometry);
    ctx.strokeStyle = hexToRgba(palette.chalk, 0.6);
    ctx.lineWidth = this.pixelSize;
    ctx.stroke();
    ctx.restore();

    this.drawCrowdBand(ctx, horizon);
    this.drawAdBoards(ctx, horizon);
  }

  drawConvergingLaneMarkers(ctx, geometry) {
    const { horizon } = geometry;
    const dashLength = this.pixelSize * 4;
    const dashSpacing = this.pixelSize * 8;
    const scroll = (this.elapsedTime * 0.6 * dashSpacing) % (dashSpacing * 2);

    ctx.fillStyle = this.palette.chalk;

    for (let i = 1; i < this.lanes; i++) {
      const xBottom = this.snap(this.laneX(i, this.height));
      const xTop = this.snap(this.laneX(i, horizon));

      for (let y = horizon - dashSpacing; y < this.height + dashSpacing; y += dashSpacing * 2) {
        const yPos = y + scroll;
        const t = this.getPerspectiveProgress(yPos, geometry);
        const x = xTop + (xBottom - xTop) * t;
        const taper = 0.62 + t * 0.85;
        const length = dashLength * taper;
        const width = Math.max(this.pixelSize, this.pixelSize * taper);
        this.drawPixelRect(ctx, x - width / 2, yPos, width, length, this.palette.chalk);
      }
    }

    const centerLane = Math.floor(this.lanes / 2);
    const centerBottom = this.laneX(centerLane, this.height);
    const centerTop = this.laneX(centerLane, horizon);
    for (let y = horizon - dashSpacing; y < this.height + dashSpacing; y += dashSpacing) {
      const yPos = y + scroll * 0.8;
      const t = this.getPerspectiveProgress(yPos, geometry);
      const x = centerTop + (centerBottom - centerTop) * t;
      const taper = 0.78 + t * 0.9;
      const length = dashLength * taper;
      const width = this.pixelSize * (1.4 + t * 0.6);
      this.drawPixelRect(ctx, x - width / 2, yPos, width, length, this.palette.chalk);
    }
  }

  tracePerspectiveField(ctx, geometry) {
    const { horizon, topStart, topSpan, bottomStart, bottomSpan } = geometry;
    ctx.beginPath();
    ctx.moveTo(bottomStart, this.height);
    ctx.lineTo(bottomStart + bottomSpan, this.height);
    ctx.lineTo(topStart + topSpan, horizon);
    ctx.lineTo(topStart, horizon);
    ctx.closePath();
  }

  drawChalkBox(ctx, x, y, w, h) {
    const { chalk } = this.palette;
    const thickness = this.pixelSize;
    this.drawPixelRect(ctx, x, y, w, thickness, chalk);
    this.drawPixelRect(ctx, x, y + h - thickness, w, thickness, chalk);
    this.drawPixelRect(ctx, x, y, thickness, h, chalk);
    this.drawPixelRect(ctx, x + w - thickness, y, thickness, h, chalk);
  }

  drawAdBoards(ctx, horizon) {
    const boardHeight = this.pixelSize * 5;
    const inset = this.width * 0.04;
    let x = inset;
    const palette = ["#0bd3c7", "#2dfc8a", "#f7b801", "#e7437d", "#2b87ff"];

    while (x < this.width - inset) {
      const width = Math.min(this.pixelSize * (12 + Math.random() * 14), this.width - inset - x);
      const color = palette[Math.floor(Math.random() * palette.length)];
      ctx.fillStyle = color;
      ctx.fillRect(x, horizon - boardHeight - this.pixelSize, width, boardHeight);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, horizon - boardHeight - this.pixelSize, width, this.pixelSize);
      x += width + this.pixelSize * 2;
    }
  }

  drawCrowdBand(ctx, horizon) {
    const { crowdJersey, crowdShadow } = this.palette;
    const rowHeight = this.pixelSize * 3;
    const rows = 4;
    const baseY = horizon - rowHeight * rows - this.pixelSize * 2;

    ctx.fillStyle = crowdShadow;
    ctx.fillRect(0, baseY - this.pixelSize * 2, this.width, rowHeight * rows + this.pixelSize * 3);

    for (let r = 0; r < rows; r++) {
      const y = baseY + r * rowHeight;
      for (let x = 0; x < this.width; x += this.pixelSize * 2) {
        const jersey = crowdJersey[(x + r) % crowdJersey.length];
        const shade = r % 2 === 0 ? jersey : hexToRgba(jersey, 0.82);
        this.drawPixelRect(ctx, x, y, this.pixelSize, rowHeight - this.pixelSize / 2, shade);
      }
    }

    // Wave tiny flags for energy
    for (let i = 0; i < 6; i++) {
      const x = this.width * 0.12 + i * this.width * 0.14;
      const y = baseY - this.pixelSize * 2;
      ctx.fillStyle = crowdJersey[i % crowdJersey.length];
      this.drawPixelRect(ctx, x, y, this.pixelSize * 2, this.pixelSize * 2, ctx.fillStyle);
      this.drawPixelRect(ctx, x + this.pixelSize, y + this.pixelSize * 2, this.pixelSize / 2, this.pixelSize, "#fff");
    }
  }

  drawAtmosphericBackdrop(ctx) {
    const { horizon } = this.getFieldGeometry();
    const bandHeight = horizon * 0.8;

    const rimLight = ctx.createLinearGradient(0, 0, 0, bandHeight);
    rimLight.addColorStop(0, "rgba(45,252,138,0.24)");
    rimLight.addColorStop(1, "rgba(45,252,138,0)");
    ctx.fillStyle = rimLight;
    ctx.fillRect(0, 0, this.width, bandHeight);

    const nightSky = ctx.createLinearGradient(0, 0, 0, horizon * 2);
    nightSky.addColorStop(0, "#050912");
    nightSky.addColorStop(1, "#0b1224");
    ctx.fillStyle = nightSky;
    ctx.fillRect(0, 0, this.width, horizon * 2);

    // Stadium light beams
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const beam = ctx.createLinearGradient(0, 0, 0, this.height * 0.55);
    beam.addColorStop(0, "rgba(255,255,255,0.28)");
    beam.addColorStop(1, "rgba(255,255,255,0)");
    [this.width * 0.18, this.width * 0.82].forEach((x) => {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate((-12 * Math.PI) / 180);
      ctx.fillStyle = beam;
      ctx.fillRect(-this.width * 0.05, 0, this.width * 0.12, this.height * 0.65);
      ctx.restore();
    });
    ctx.restore();

    // Audience haze
    const audience = ctx.createLinearGradient(0, horizon * 0.5, 0, horizon + 48);
    audience.addColorStop(0, "rgba(5,10,20,0.92)");
    audience.addColorStop(1, "rgba(5,10,20,0.25)");
    ctx.fillStyle = audience;
    ctx.fillRect(0, 0, this.width, horizon + 48);

    // Twinkle lights across the stadium rim
    for (let x = 0; x < this.width; x += this.pixelSize * 3) {
      const twinkle = x % (this.pixelSize * 6) === 0 ? 0.55 : 0.32;
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
      ctx.fillRect(x, horizon - this.pixelSize * 3, this.pixelSize, this.pixelSize);
    }
  }

  drawPitch(ctx) {
    if (this.pitchLayer) {
      ctx.drawImage(this.pitchLayer, 0, 0, this.width, this.height);
    } else {
      this.drawPitchSurface(ctx);
    }

    // Ambient sheen for premium broadcast look
    const sheen = ctx.createLinearGradient(0, this.height * 0.25, 0, this.height);
    sheen.addColorStop(0, "rgba(255,255,255,0.05)");
    sheen.addColorStop(0.6, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSoccerBall(ctx, x, y, radius) {
    const accent = this.ballAccent || "#f2f4ff";
    const size = Math.max(this.pixelSize * 4, radius * 2.4);
    const topLeftX = this.snap(x - size / 2);
    const topLeftY = this.snap(y - size / 2);

    // Subtle shadow
    const shadow = ctx.createRadialGradient(x + this.pixelSize, y + this.pixelSize * 1.2, 4, x, y, size);
    shadow.addColorStop(0, "rgba(0,0,0,0.35)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(x, y + this.pixelSize * 0.2, size * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Base panel shading
    const shell = ctx.createLinearGradient(topLeftX, topLeftY, topLeftX + size, topLeftY + size);
    shell.addColorStop(0, accent);
    shell.addColorStop(1, shadeColor(accent, -22));
    ctx.fillStyle = shell;
    ctx.fillRect(topLeftX, topLeftY, size, size);

    // Panel pattern
    ctx.fillStyle = "#0f172a";
    const pattern = [
      [0, 0],
      [2, 1],
      [-2, 1],
      [1, -2],
      [-1, -2],
      [3, -1],
      [-3, -1],
      [0, 3],
      [0, -3]
    ];
    pattern.forEach(([dx, dy]) => {
      this.drawPixelRect(
        ctx,
        x + dx * this.pixelSize,
        y + dy * this.pixelSize,
        this.pixelSize,
        this.pixelSize,
        "#0a0f16"
      );
    });

    // Highlight
    const gleam = ctx.createRadialGradient(x - this.pixelSize, y - this.pixelSize, 2, x, y, size * 0.6);
    gleam.addColorStop(0, "rgba(255,255,255,0.8)");
    gleam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gleam;
    ctx.fillRect(topLeftX, topLeftY, size, size);
  }

  updatePlayerTrail(dt) {
    this.trailAccumulator += dt;
    if (this.trailAccumulator >= 0.04) {
      this.trailAccumulator = 0;
      const x = this.laneX(this.player.lane) + this.player.laneOffset;
      const y = this.player.baseY + this.player.yOffset + this.player.height * 0.6;
      this.playerTrail.unshift({ x, y, alpha: 0.9, wobble: Math.random() * 6 - 3 });
      this.playerTrail = this.playerTrail.slice(0, 18);
    }

    this.playerTrail = this.playerTrail
      .map((trail) => ({
        ...trail,
        alpha: trail.alpha - dt * 1.5,
        y: trail.y - dt * 22
      }))
      .filter((trail) => trail.alpha > 0.05);
  }

  drawPlayerTrail(ctx) {
    const accent = this.kit.trim || this.palette.glow || "#2dfc8a";
    this.playerTrail.forEach((trail, idx) => {
      const falloff = trail.alpha * (1 - idx / Math.max(1, this.playerTrail.length));
      const radius = 18 - idx;
      const tinted = accent.startsWith("#")
        ? hexToRgba(accent, Math.max(0.12, falloff * 0.8))
        : accent.replace("rgba", "rgba").replace(")", `,${Math.max(0.12, falloff * 0.8)})`);
      const grad = ctx.createRadialGradient(trail.x, trail.y, 2, trail.x, trail.y, radius);
      grad.addColorStop(0, tinted);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(trail.x + trail.wobble, trail.y, radius, radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  updateParticles(dt) {
    const baseSpawnRate = this.runState === RUN_STATE.RUNNING ? 0.04 : 0.12;
    this.particleAccumulator += dt;
    if (this.particleAccumulator >= baseSpawnRate) {
      this.particleAccumulator = 0;
      const x = this.laneX(this.player.lane) + this.player.laneOffset + (Math.random() * 22 - 11);
      const y = this.player.baseY + this.player.height * 0.92;
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 18,
        vy: -26 - Math.random() * 16,
        alpha: 0.9,
        life: 0.8 + Math.random() * 0.4
      });
      if (this.particles.length > 70) {
        this.particles.shift();
      }
    }

    this.particles = this.particles
      .map((p) => ({
        ...p,
        life: p.life - dt,
        alpha: Math.max(0, p.alpha - dt * 1.4),
        x: p.x + p.vx * dt * 20,
        y: p.y + p.vy * dt * 20
      }))
      .filter((p) => p.life > 0 && p.alpha > 0.05);
  }

  drawParticles(ctx) {
    this.particles.forEach((p) => {
      const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 14);
      grad.addColorStop(0, `rgba(255,255,255,${p.alpha * 0.8})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawPlayer(ctx) {
    const x =
      this.laneX(this.player.lane) -
      this.player.width / 2 +
      this.player.laneOffset;
    const y = this.player.baseY + this.player.yOffset;
    const h = this.player.isTackling ? this.player.height * 0.5 : this.player.height;
    const w = this.player.width;
    const p = this.palette;
    const kit = this.kit;

    // Chunky shadow
    this.drawPixelRect(ctx, x + w * 0.2, y + h, w * 0.6, this.pixelSize * 2, p.shadow);

    if (this.player.isTackling) {
      const tackleColors = {
        p: kit.primary,
        P: kit.primaryShadow || shadeColor(kit.primary, -18),
        s: p.playerSkin,
        S: p.playerSkinShade,
        h: "#2a252d",
        H: "#1c1820",
        b: kit.boot || p.shadow,
        q: kit.secondary,
        Q: kit.secondaryShadow || shadeColor(kit.secondary, -18)
      };

      const tackleSprite = [
        "..hhHHhh...",
        "..ssssss...",
        "..sSSSSs...",
        "..pppppppQ",
        "..pPPpppQQ",
        "..ppppppQQ",
        "..pqqqqqQQ",
        "bppqQQQbbQ",
        "bppqqQQbbQ",
        "bbbqQQQbbb"
      ];

      this.drawSpriteMatrix(ctx, tackleSprite, tackleColors, x, y, w, h);
      return;
    }

    const sprite = [
      "....hhhH....",
      "...hhhHHH...",
      "..HHHHHHHH..",
      "..HHHHHHHH..",
      "..ssssssss..",
      "..sse..ess..",
      "..ssssssss..",
      "...sttts....",
      ".pppppppppp.",
      ".ppppnnpppp.",
      ".pPpttPpPpP.",
      ".pppppppppp.",
      ".pppppppppp.",
      ".qqqqqqqqqq.",
      ".qqqQQQQqqq.",
      ".ttpppppptt.",
      ".pppppppppp.",
      ".pppppppppp.",
      "bbb......bbb",
      "bbb......bbb"
    ];

    const jerseyNumber = `${this.playerCardMeta?.rating || 10}`.padStart(2, "0").slice(-2);
    const numberColor = kit.sockStripe || kit.trim || "#f9fafb";
    const colors = {
      h: "#2d2b32",
      H: "#1a1622",
      s: p.playerSkin,
      e: "#0f172a",
      t: kit.trim || p.kitTrim,
      p: kit.primary || p.kitPrimary,
      P: kit.primaryShadow || shadeColor(kit.primary, -18),
      q: kit.secondary || p.kitSecondary,
      Q: kit.secondaryShadow || shadeColor(kit.secondary, -18),
      n: numberColor,
      b: kit.boot || p.shadow
    };

    this.drawSpriteMatrix(ctx, sprite, colors, x, y, w, h);

    ctx.save();
    ctx.fillStyle = numberColor;
    ctx.font = `bold ${Math.round((w / 12) * 2.6)}px 'Press Start 2P', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(jerseyNumber, x + w * 0.5, y + h * 0.5);
    ctx.restore();
  }

  drawStandingDefender(ctx, x, y, width, height) {
    const p = this.palette;
    const kit = this.kit;
    this.drawPixelRect(ctx, x + width * 0.2, y + height, width * 0.6, this.pixelSize * 2, p.shadow);

    // Legs + socks
    const legW = width * 0.18;
    this.drawPixelRect(ctx, x + width * 0.18, y + height * 0.6, legW, height * 0.28, p.playerSkin);
    this.drawPixelRect(ctx, x + width * 0.56, y + height * 0.58, legW, height * 0.3, p.playerSkin);
    this.drawPixelRect(ctx, x + width * 0.18, y + height * 0.78, legW, height * 0.1, kit.secondary);
    this.drawPixelRect(ctx, x + width * 0.56, y + height * 0.76, legW, height * 0.1, kit.secondary);
    this.drawPixelRect(ctx, x + width * 0.16, y + height * 0.88, legW + this.pixelSize, height * 0.08, kit.boot || p.shadow);
    this.drawPixelRect(ctx, x + width * 0.54, y + height * 0.86, legW + this.pixelSize, height * 0.08, kit.boot || p.shadow);

    // Torso + stripe
    const torsoX = x + width * 0.2;
    const torsoW = width * 0.6;
    const torsoH = height * 0.35;
    this.drawPixelRect(ctx, torsoX, y + height * 0.26, torsoW, torsoH, kit.primary || p.kitPrimary);
    this.drawPixelRect(ctx, torsoX, y + height * 0.36, torsoW, this.pixelSize, kit.trim || p.kitTrim);

    // Arms crossed
    this.drawPixelRect(ctx, torsoX - width * 0.08, y + height * 0.32, width * 0.2, height * 0.16, p.playerSkin);
    this.drawPixelRect(ctx, torsoX + torsoW - width * 0.12, y + height * 0.3, width * 0.2, height * 0.16, p.playerSkin);

    // Head
    const headSize = width * 0.28;
    const headX = x + width * 0.36;
    const headY = y + height * 0.08;
    this.drawPixelRect(ctx, headX, headY, headSize, headSize, p.playerSkin);
    this.drawPixelRect(ctx, headX + headSize * 0.22, headY + headSize * 0.35, this.pixelSize, this.pixelSize, '#0f172a');
    this.drawPixelRect(ctx, headX + headSize * 0.6, headY + headSize * 0.35, this.pixelSize, this.pixelSize, '#0f172a');
  }

  drawDefender(ctx, x, y, width, height) {
    const p = this.palette;
    const kit = this.kit;
    this.drawPixelRect(ctx, x + width * 0.1, y + height * 0.9, width * 0.8, this.pixelSize * 2, p.shadow);

    // Sliding body
    this.drawPixelRect(ctx, x + width * 0.1, y + height * 0.5, width * 0.7, height * 0.2, kit.primary || p.kitPrimary);
    this.drawPixelRect(ctx, x + width * 0.12, y + height * 0.58, width * 0.66, this.pixelSize, kit.trim || p.kitTrim);

    // Leading leg and trailing leg
    this.drawPixelRect(ctx, x + width * 0.68, y + height * 0.52, width * 0.18, height * 0.12, p.playerSkin);
    this.drawPixelRect(ctx, x + width * 0.16, y + height * 0.6, width * 0.18, height * 0.12, p.playerSkin);
    this.drawPixelRect(ctx, x + width * 0.68, y + height * 0.6, width * 0.18, height * 0.08, kit.secondary || p.kitSecondary);
    this.drawPixelRect(ctx, x + width * 0.14, y + height * 0.68, width * 0.2, height * 0.08, kit.secondary || p.kitSecondary);

    // Boots
    this.drawPixelRect(ctx, x + width * 0.66, y + height * 0.68, width * 0.2, height * 0.08, kit.boot || p.shadow);
    this.drawPixelRect(ctx, x + width * 0.12, y + height * 0.76, width * 0.22, height * 0.08, kit.boot || p.shadow);

    // Arms reaching forward/back
    this.drawPixelRect(ctx, x + width * 0.08, y + height * 0.46, width * 0.22, height * 0.12, p.playerSkin);
    this.drawPixelRect(ctx, x + width * 0.6, y + height * 0.44, width * 0.2, height * 0.12, p.playerSkin);

    // Head
    const headSize = width * 0.26;
    this.drawPixelRect(ctx, x + width * 0.32, y + height * 0.32, headSize, headSize, p.playerSkin);
    this.drawPixelRect(ctx, x + width * 0.36, y + height * 0.38, this.pixelSize, this.pixelSize, '#0f172a');
    this.drawPixelRect(ctx, x + width * 0.5, y + height * 0.38, this.pixelSize, this.pixelSize, '#0f172a');
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

      if (o.hasBall) {
        const ballX = x + width * 0.5 + width * 0.18;
        const ballY = y + height * 0.6;
        this.drawSoccerBall(ctx, ballX, ballY, Math.max(8, width * 0.12));
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
    const p = this.palette;
    const postW = this.pixelSize * 2;
    const goalX = this.goal.x - this.goal.width / 2;
    const goalY = this.goal.y;
    const goalH = this.goal.height;

    // Goal mouth
    this.drawPixelRect(ctx, goalX, goalY, this.goal.width, goalH, '#0a1a14');
    this.drawPixelRect(ctx, goalX - postW, goalY - postW, this.goal.width + postW * 2, postW, p.net);
    this.drawPixelRect(ctx, goalX - postW, goalY, postW, goalH, p.net);
    this.drawPixelRect(ctx, goalX + this.goal.width, goalY, postW, goalH, p.net);

    // Pixel net
    for (let yy = goalY + this.pixelSize * 2; yy < goalY + goalH; yy += this.pixelSize * 3) {
      this.drawPixelRect(ctx, goalX, yy, this.goal.width, this.pixelSize, '#b9d7e8');
    }
    for (let xx = goalX + this.pixelSize * 3; xx < goalX + this.goal.width; xx += this.pixelSize * 3) {
      this.drawPixelRect(ctx, xx, goalY, this.pixelSize, goalH, '#b9d7e8');
    }

    // Chalk box marks
    this.drawPixelRect(ctx, goalX - this.pixelSize * 3, goalY + goalH + this.pixelSize, this.goal.width + this.pixelSize * 6, this.pixelSize, p.chalk);
    this.drawPixelRect(ctx, this.width * 0.2, this.height * 0.82, this.width * 0.6, this.pixelSize, p.chalk);

    this.drawGoalie(ctx);

    if (this.shotResultFlash > 0 && this.shotResultLabel) {
      const alpha = Math.min(1, this.shotResultFlash / 0.8);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = 'bold 26px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(this.shotResultLabel, this.width / 2, this.goal.y - 12);
    }
  }

  drawGoalie(ctx) {
    const g = this.goalie;
    const x = g.x - g.width / 2;
    const y = g.y;
    const p = this.palette;
    const kit = this.kit;

    // Shadow
    this.drawPixelRect(ctx, x + g.width * 0.1, y + g.height, g.width * 0.8, this.pixelSize * 2, p.shadow);

    // Legs
    this.drawPixelRect(ctx, x + g.width * 0.12, y + g.height * 0.55, g.width * 0.2, g.height * 0.4, p.playerSkin);
    this.drawPixelRect(ctx, x + g.width * 0.66, y + g.height * 0.52, g.width * 0.18, g.height * 0.42, p.playerSkin);
    this.drawPixelRect(ctx, x + g.width * 0.12, y + g.height * 0.8, g.width * 0.2, g.height * 0.12, kit.secondary || p.kitSecondary);
    this.drawPixelRect(ctx, x + g.width * 0.66, y + g.height * 0.78, g.width * 0.18, g.height * 0.12, kit.secondary || p.kitSecondary);
    this.drawPixelRect(ctx, x + g.width * 0.1, y + g.height * 0.9, g.width * 0.22, g.height * 0.08, kit.boot || p.shadow);
    this.drawPixelRect(ctx, x + g.width * 0.64, y + g.height * 0.88, g.width * 0.22, g.height * 0.08, kit.boot || p.shadow);

    // Torso + gloves
    this.drawPixelRect(ctx, x + g.width * 0.2, y + g.height * 0.28, g.width * 0.6, g.height * 0.32, '#ff9f43');
    this.drawPixelRect(ctx, x + g.width * 0.2, y + g.height * 0.38, g.width * 0.6, this.pixelSize, '#ffe7b8');
    this.drawPixelRect(ctx, x + g.width * 0.08, y + g.height * 0.4, g.width * 0.2, g.height * 0.12, p.playerSkin);
    this.drawPixelRect(ctx, x + g.width * 0.72, y + g.height * 0.36, g.width * 0.2, g.height * 0.12, p.playerSkin);
    this.drawPixelRect(ctx, x + g.width * 0.06, y + g.height * 0.46, g.width * 0.24, this.pixelSize * 2, '#2f9e44');
    this.drawPixelRect(ctx, x + g.width * 0.7, y + g.height * 0.42, g.width * 0.24, this.pixelSize * 2, '#2f9e44');

    // Head
    const headSize = g.width * 0.26;
    this.drawPixelRect(ctx, x + g.width * 0.36, y + g.height * 0.12, headSize, headSize, p.playerSkin);
    this.drawPixelRect(ctx, x + g.width * 0.4, y + g.height * 0.18, this.pixelSize, this.pixelSize, '#0f172a');
    this.drawPixelRect(ctx, x + g.width * 0.52, y + g.height * 0.18, this.pixelSize, this.pixelSize, '#0f172a');
    this.drawPixelRect(ctx, x + g.width * 0.44, y + g.height * 0.24, this.pixelSize * 1.5, this.pixelSize, '#0f172a');
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

  drawLightingOverlay(ctx) {
    ctx.save();

    // Floodlight beams
    const beamY = this.height * 0.02;
    const beamGradient = (anchorX) => {
      const grad = ctx.createLinearGradient(anchorX, beamY, anchorX, this.height * 0.65);
      grad.addColorStop(0, "rgba(255,255,255,0.28)");
      grad.addColorStop(0.2, "rgba(255,255,255,0.12)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      return grad;
    };

    [this.width * 0.2, this.width * 0.8].forEach((x) => {
      ctx.fillStyle = beamGradient(x);
      ctx.beginPath();
      ctx.moveTo(x - 40, beamY);
      ctx.lineTo(x + 40, beamY);
      ctx.lineTo(x + this.width * 0.14, this.height * 0.65);
      ctx.lineTo(x - this.width * 0.14, this.height * 0.65);
      ctx.closePath();
      ctx.fill();
    });

    // Foreground vignette for broadcast-style depth
    const vignette = ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.9,
      this.height * 0.2,
      this.width / 2,
      this.height * 0.9,
      this.height * 0.65
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.atmosphereLayer) {
      ctx.drawImage(this.atmosphereLayer, 0, 0, this.width, this.height);
    }

    this.drawPitch(ctx);
    // this.drawParticles(ctx);
    this.drawObstacles(ctx);
    this.drawPickups(ctx);
    this.drawGoalArea(ctx);
    // this.drawPlayerTrail(ctx);
    this.drawPlayer(ctx);
    this.drawActiveShot(ctx);
    this.drawLightingOverlay(ctx);
  }
}
