// js/main.js

import { Game } from "./game.js";
import {
  PLAYER_CARDS,
  loadPlayerData,
  savePlayerData,
  getCardById,
  unlockCard,
  selectCard,
  getCardLevel,
  getEffectiveMultipliers,
  getEffectivePerks,
  getLevelTuning,
  upgradeCard,
  updateMissionsAfterRun,
  claimMissionReward,
  estimateRunsForCost,
  CARD_LEVEL_CAP,
  getUpgradeCost
} from "./playerData.js";
import { InputManager } from "./input.js";

const canvas = document.getElementById("gameCanvas");
const hudEl = document.getElementById("hud");
const hudDistance = document.getElementById("hudDistance");
const hudGoals = document.getElementById("hudGoals");
const hudBest = document.getElementById("hudBest");
const shotMeterFill = document.getElementById("shotMeterFill");
const pauseBanner = document.getElementById("pauseBanner");
const pauseMenu = document.getElementById("pauseMenu");
const pauseMenuResumeBtn = document.getElementById("btnPauseResume");
const pauseMenuSaveQuitBtn = document.getElementById("btnPauseSaveQuit");
const pauseMenuQuitBtn = document.getElementById("btnPauseQuit");
const headerCoinsValue = document.getElementById("headerCoinsValue");

// Screens
const screens = {
  mainMenu: document.getElementById("mainMenu"),
  teamScreen: document.getElementById("teamScreen"),
  settingsScreen: document.getElementById("settingsScreen"),
  gameOverScreen: document.getElementById("gameOverScreen")
};
let currentScreenId = "mainMenu";

// Game over UI
const goDistance = document.getElementById("goDistance");
const goGoals = document.getElementById("goGoals");
const goCoins = document.getElementById("goCoins");
const goCoinsInRun = document.getElementById("goCoinsInRun");
const goCoinsDistance = document.getElementById("goCoinsDistance");
const goCoinsGoals = document.getElementById("goCoinsGoals");
const goCoinsTotal = document.getElementById("goCoinsTotal");
const goBestNote = document.getElementById("goBestNote");
const goContinueNote = document.getElementById("goContinueNote");
const btnContinue = document.getElementById("btnContinue");
const continueCostLabel = document.getElementById("continueCostLabel");

// Buttons
const btnPlay = document.getElementById("btnPlay");
const btnPlayV2 = document.getElementById("btnPlayV2");
const btnTeam = document.getElementById("btnTeam");
const btnSettings = document.getElementById("btnSettings");
const btnMissions = document.getElementById("btnMissions");
const btnPause = document.getElementById("btnPause");
const btnReplay = document.getElementById("btnReplay");
const btnGoToTeam = document.getElementById("btnGoToTeam");
const btnGoToMenu = document.getElementById("btnGoToMenu");
const btnResetProgress = document.getElementById("btnResetProgress");
const touchControls = document.querySelectorAll(
  ".touch-controls [data-action]"
);
const touchControlsContainer = document.querySelector(".touch-controls");
const startButton = document.querySelector(
  '.touch-controls [data-action="startRun"]'
);
const pauseTouchButton = document.querySelector(
  '.touch-controls [data-action="pauseToggle"]'
);
const builderOverlay = document.getElementById("playerBuilder");
const builderSubtitle = document.getElementById("builderSubtitle");
const builderNameInput = document.getElementById("builderName");
const builderPrimaryInput = document.getElementById("builderPrimaryColor");
const builderSecondaryInput = document.getElementById("builderSecondaryColor");
const builderTrimInput = document.getElementById("builderTrimColor");
const builderBallInput = document.getElementById("builderBallColor");
const builderPreviewJersey = document.getElementById("builderPreviewJersey");
const builderPreviewBall = document.getElementById("builderPreviewBall");
const kitPresetList = document.getElementById("kitPresetList");
const btnSaveBuilder = document.getElementById("btnSaveBuilder");
const btnSkipBuilder = document.getElementById("btnSkipBuilder");
const btnOpenBuilder = document.getElementById("btnOpenBuilder");
const btnShufflePreset = document.getElementById("btnShufflePreset");

// Login / save
const loginEmailInput = document.getElementById("loginEmail");
const loginNameInput = document.getElementById("loginName");
const authStatus = document.getElementById("authStatus");
const saveStatus = document.getElementById("saveStatus");
const btnLogin = document.getElementById("btnLogin");
const btnSaveProgress = document.getElementById("btnSaveProgress");
const btnStayGuest = document.getElementById("btnStayGuest");
const profileButton = document.getElementById("profileButton");
const profileNameLabel = document.getElementById("profileNameLabel");
const profileStatusLabel = document.getElementById("profileStatusLabel");
const profileAvatar = document.getElementById("profileAvatar");
const authSheet = document.getElementById("authSheet");
const authSheetBackdrop = document.getElementById("authSheetBackdrop");
const btnCloseAuthSheet = document.getElementById("btnCloseAuthSheet");

// Team screen
const cardListEl = document.getElementById("cardList");

const CARD_PIXEL_PALETTES = {
  street_striker: {
    primary: "#1f3a74",
    secondary: "#80223c",
    trim: "#0bd3c7",
    ballAccent: "#f2f4ff"
  },
  pace_merchant: {
    primary: "#1d4ed8",
    secondary: "#0f172a",
    trim: "#22d3ee",
    ballAccent: "#f4f7ff"
  },
  clinical_finisher: {
    primary: "#6b21a8",
    secondary: "#111827",
    trim: "#c084fc",
    ballAccent: "#f1e8ff"
  },
  crowd_favorite: {
    primary: "#166534",
    secondary: "#052e16",
    trim: "#34d399",
    ballAccent: "#d1fae5"
  }
};

// Missions
const dailyMissionsEl = document.getElementById("dailyMissions");
const weeklyMissionsEl = document.getElementById("weeklyMissions");
const missionsPanel = document.getElementById("missionsPanel");
const missionsIcon = document.getElementById("missionsIcon");

const activePressables = new Set();

let missionHasClaimable = false;
let missionCelebrateTimeout = null;

let playerData = loadPlayerData();

let renderScale = 1;
let logicalWidth = canvas?.width || 540;
let logicalHeight = canvas?.height || 960;

function calibrateCanvasResolution() {
  if (!canvas) return;

  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
  const rect = canvas.getBoundingClientRect();
  logicalWidth = Math.round(rect.width || canvas.width || logicalWidth);
  logicalHeight = Math.round(rect.height || canvas.height || logicalHeight);
  renderScale = dpr;

  canvas.width = Math.round(logicalWidth * renderScale);
  canvas.height = Math.round(logicalHeight * renderScale);
}
ensureGuestProfile();
updateCoinsHeader();

let game = null;
let input = null;
let continueCost = 10;
let continueSpendTotal = 0;
let pendingGameOverPayload = null;
let visualVariant = "v1";

function resetContinueState() {
  continueCost = 10;
  continueSpendTotal = 0;
  pendingGameOverPayload = null;
}

function setActiveScreen(id) {
  Object.values(screens).forEach((el) =>
    el.classList.remove("screen--active")
  );
  currentScreenId = id;

  if (id && screens[id]) {
    screens[id].classList.add("screen--active");
  }

  const inRun = id === null;
  hudEl.classList.toggle("hidden", !inRun);
  updateTouchControlsVisibility();
}

function focusMissionsPanel() {
  if (!missionsPanel) return;
  missionsPanel.classList.add("panel--highlight");
  missionsPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => missionsPanel.classList.remove("panel--highlight"), 1500);
}

function handlePressableDown(event) {
  const target = event.target?.closest?.(".btn, .start-button, .touch-btn");
  if (!target) return;
  target.classList.add("is-pressed");
  activePressables.add(target);
}

function clearPressedState() {
  activePressables.forEach((el) => el.classList.remove("is-pressed"));
  activePressables.clear();
}

function spawnTapParticles(target, count = 9) {
  if (!target) return;
  const { width, height } = target.getBoundingClientRect();

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = "tap-particle";
    particle.textContent = "⚽";

    const angle = Math.random() * Math.PI * 2;
    const distance = 26 + Math.random() * 24;
    const duration = 420 + Math.random() * 240;
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;

    particle.style.setProperty("--dx", `${offsetX}px`);
    particle.style.setProperty("--dy", `${offsetY}px`);
    particle.style.setProperty("--travel-time", `${duration}ms`);
    particle.style.left = `${width / 2 + (Math.random() - 0.5) * 10}px`;
    particle.style.top = `${height / 2 + (Math.random() - 0.5) * 10}px`;

    target.appendChild(particle);
    particle.addEventListener("animationend", () => particle.remove());
  }
}

function updateMissionCelebrationState(hasClaimable) {
  if (!missionsIcon) return;

  missionsIcon.classList.toggle("mission-icon--active", hasClaimable);

  if (hasClaimable && !missionHasClaimable) {
    missionsIcon.classList.remove("is-celebrating");
    // restart animation
    void missionsIcon.offsetWidth;
    missionsIcon.classList.add("is-celebrating");
    clearTimeout(missionCelebrateTimeout);
    missionCelebrateTimeout = window.setTimeout(() => {
      missionsIcon?.classList.remove("is-celebrating");
    }, 1400);
  }

  if (!hasClaimable) {
    missionsIcon.classList.remove("is-celebrating");
  }

  missionHasClaimable = hasClaimable;
}

function updateCoinsHeader() {
  headerCoinsValue.textContent = playerData.coins.toString();
}

function generateGuestId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function ensureGuestProfile() {
  const profile = playerData.profile || {};
  let changed = false;

  if (!profile.guestId) {
    profile.guestId = generateGuestId();
    changed = true;
  }
  if (profile.isGuest === undefined) {
    profile.isGuest = true;
    changed = true;
  }
  if (!profile.guestCreatedAt) {
    profile.guestCreatedAt = new Date().toISOString();
    changed = true;
  }
  if (!profile.displayName) {
    const suffix = profile.guestId?.slice(-4) || "Runner";
    profile.displayName = `Guest ${suffix}`;
    changed = true;
  }

  playerData.profile = profile;
  if (changed) {
    savePlayerData(playerData);
  }
}

function getProfileLabel(profile = {}) {
  if (profile.displayName) return profile.displayName;
  const suffix = profile.guestId?.slice(-4) || "Runner";
  return `Guest ${suffix}`;
}

function getProfileAvatarGlyph(profile = {}) {
  if (profile.avatarEmoji) return profile.avatarEmoji;
  if (profile.displayName) return profile.displayName.charAt(0).toUpperCase() || "🏃";
  return "🏃";
}

function getKitColorsFromProfile(profile = playerData.profile || {}) {
  return {
    primary: profile.kitPrimary || "#1f3a74",
    secondary: profile.kitSecondary || "#80223c",
    trim: profile.kitTrim || "#0bd3c7",
    ballAccent: profile.ballAccent || "#f2f4ff"
  };
}

const KIT_PRESETS = [
  {
    name: "Manchester City",
    tagline: "Sky blue dominance",
    primary: "#6cabdd",
    secondary: "#1c2c5b",
    trim: "#a6d8ff",
    ballAccent: "#f6fbff"
  },
  {
    name: "Real Madrid",
    tagline: "Classic blancos",
    primary: "#f7f7f7",
    secondary: "#2e2a5e",
    trim: "#f0b90b",
    ballAccent: "#ffffff"
  },
  {
    name: "FC Barcelona",
    tagline: "Blaugrana stripes",
    primary: "#a50044",
    secondary: "#004d98",
    trim: "#f9a01b",
    ballAccent: "#f7f4ef"
  },
  {
    name: "Bayern Munich",
    tagline: "Bavarian power",
    primary: "#d00027",
    secondary: "#0b142b",
    trim: "#f5f5f5",
    ballAccent: "#fef6f6"
  },
  {
    name: "Liverpool",
    tagline: "Anfield energy",
    primary: "#c8102e",
    secondary: "#0b1418",
    trim: "#f0c75e",
    ballAccent: "#ffffff"
  },
  {
    name: "Paris Saint-Germain",
    tagline: "Capital flair",
    primary: "#001e36",
    secondary: "#e30613",
    trim: "#ffffff",
    ballAccent: "#e6ecff"
  },
  {
    name: "Juventus",
    tagline: "Black & white strength",
    primary: "#f9f9f9",
    secondary: "#0a0a0a",
    trim: "#d2b04c",
    ballAccent: "#f2f2f2"
  },
  {
    name: "Arsenal",
    tagline: "North London pride",
    primary: "#da1e36",
    secondary: "#f4f4f4",
    trim: "#1a2d59",
    ballAccent: "#f0f6ff"
  },
  {
    name: "Inter Milan",
    tagline: "Nerazzurri stripes",
    primary: "#004d98",
    secondary: "#000000",
    trim: "#ffd800",
    ballAccent: "#e2f0ff"
  },
  {
    name: "Chelsea",
    tagline: "Stamford Bridge blue",
    primary: "#034694",
    secondary: "#d1d5da",
    trim: "#e8b500",
    ballAccent: "#f1f6ff"
  },
  {
    name: "Germany Retro",
    tagline: "Sharp black-and-white kit",
    primary: "#f6f7fb",
    secondary: "#0f172a",
    trim: "#36c17e",
    ballAccent: "#f8fafc"
  },
  {
    name: "Brazil Classic",
    tagline: "Yellow tops, blue shorts, green trim",
    primary: "#fbd34d",
    secondary: "#1f57a4",
    trim: "#2bb673",
    ballAccent: "#f2f4ff"
  },
  {
    name: "France Away",
    tagline: "Clean whites with cool blue",
    primary: "#f6f7fb",
    secondary: "#4b6cb7",
    trim: "#7aa7ff",
    ballAccent: "#eef3ff"
  },
  {
    name: "Spain Legacy",
    tagline: "Bold red and sunny trim",
    primary: "#c8102e",
    secondary: "#f7f7f7",
    trim: "#f7d23e",
    ballAccent: "#fff6e5"
  }
];

renderKitPresets();

function normalizeHex(value = "") {
  if (!value) return "";
  const hex = value.trim();
  const withPrefix = hex.startsWith("#") ? hex : `#${hex}`;
  return withPrefix.toLowerCase();
}

function getKitColorsFromInputs() {
  return {
    primary: builderPrimaryInput?.value || playerData.profile?.kitPrimary || "#1f3a74",
    secondary: builderSecondaryInput?.value || playerData.profile?.kitSecondary || "#80223c",
    trim: builderTrimInput?.value || playerData.profile?.kitTrim || "#0bd3c7",
    ballAccent: builderBallInput?.value || playerData.profile?.ballAccent || "#f2f4ff"
  };
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function buildPerkSummary(perks = {}) {
  const parts = [];
  if (perks.laneChangeSpeed && perks.laneChangeSpeed !== 1) {
    parts.push(`+${formatPercent((perks.laneChangeSpeed - 1) * 100)} juke speed`);
  }
  if (perks.jukeDistance && perks.jukeDistance !== 1) {
    parts.push(`+${formatPercent((perks.jukeDistance - 1) * 100)} juke sway`);
  }
  if (perks.tackleDefenseBonus && perks.tackleDefenseBonus !== 1) {
    parts.push(
      `-${formatPercent((1 - 1 / perks.tackleDefenseBonus) * 100)} tackle hitbox`
    );
  }
  if (perks.goalieFreezeChance && perks.goalieFreezeChance > 0) {
    parts.push(`${formatPercent(perks.goalieFreezeChance * 100)} keeper freeze`);
  }
  if (perks.coinMagnetRange && perks.coinMagnetRange !== 1) {
    parts.push(`+${formatPercent((perks.coinMagnetRange - 1) * 100)} coin radius`);
  }
  return parts.join(" · ") || "No perk bonuses";
}

function buildPerkDelta(current = {}, next = {}) {
  const deltas = [];
  const laneChangeDelta = next.laneChangeSpeed - current.laneChangeSpeed;
  if (laneChangeDelta) {
    deltas.push(`+${formatPercent(laneChangeDelta * 100)} juke speed`);
  }
  const jukeDelta = next.jukeDistance - current.jukeDistance;
  if (jukeDelta) {
    deltas.push(`+${formatPercent(jukeDelta * 100)} juke sway`);
  }
  const tackleDelta = current.tackleDefenseBonus
    ? next.tackleDefenseBonus / current.tackleDefenseBonus - 1
    : 0;
  if (tackleDelta) {
    deltas.push(`-${formatPercent((1 - 1 / (1 + tackleDelta)) * 100)} tackle size`);
  }
  const freezeDelta = (next.goalieFreezeChance - current.goalieFreezeChance) * 100;
  if (freezeDelta) {
    deltas.push(`+${formatPercent(freezeDelta)} freeze chance`);
  }
  const coinRadiusDelta = next.coinMagnetRange - current.coinMagnetRange;
  if (coinRadiusDelta) {
    deltas.push(`+${formatPercent(coinRadiusDelta * 100)} coin radius`);
  }
  return deltas.join(" / ") || "no perk growth";
}

function createPixelPlayerElement(palette = {}) {
  const el = document.createElement("div");
  el.className = "player-card__pixel";
  const colors = {
    primary: palette.primary || "#1f3a74",
    secondary: palette.secondary || "#80223c",
    trim: palette.trim || "#0bd3c7",
    ballAccent: palette.ballAccent || "#f2f4ff"
  };

  el.style.setProperty("--kit-primary", colors.primary);
  el.style.setProperty("--kit-secondary", colors.secondary);
  el.style.setProperty("--kit-trim", colors.trim);
  el.style.setProperty("--ball-accent", colors.ballAccent);

  el.innerHTML = `
    <svg viewBox="0 0 16 20" role="img" aria-hidden="true">
      <g class="pixel-hair">
        <rect x="6" y="1" width="1" height="1" />
        <rect x="7" y="1" width="1" height="1" />
        <rect x="8" y="1" width="1" height="1" />
        <rect x="9" y="1" width="1" height="1" />
        <rect x="5" y="2" width="1" height="1" />
        <rect x="6" y="2" width="1" height="1" />
        <rect x="7" y="2" width="1" height="1" />
        <rect x="8" y="2" width="1" height="1" />
        <rect x="9" y="2" width="1" height="1" />
        <rect x="10" y="2" width="1" height="1" />
        <rect x="5" y="3" width="1" height="1" />
        <rect x="6" y="3" width="1" height="1" />
        <rect x="7" y="3" width="1" height="1" />
        <rect x="8" y="3" width="1" height="1" />
        <rect x="9" y="3" width="1" height="1" />
        <rect x="10" y="3" width="1" height="1" />
        <rect x="6" y="4" width="1" height="1" />
        <rect x="7" y="4" width="1" height="1" />
        <rect x="8" y="4" width="1" height="1" />
        <rect x="9" y="4" width="1" height="1" />
        <rect x="5" y="5" width="1" height="1" />
        <rect x="10" y="5" width="1" height="1" />
      </g>
      <g class="pixel-hair pixel-hair--highlight">
        <rect x="7" y="2" width="1" height="1" />
        <rect x="8" y="3" width="1" height="1" />
      </g>
      <g class="pixel-skin">
        <rect x="6" y="5" width="1" height="1" />
        <rect x="7" y="5" width="1" height="1" />
        <rect x="8" y="5" width="1" height="1" />
        <rect x="9" y="5" width="1" height="1" />
        <rect x="6" y="6" width="1" height="1" />
        <rect x="7" y="6" width="1" height="1" />
        <rect x="8" y="6" width="1" height="1" />
        <rect x="9" y="6" width="1" height="1" />
        <rect x="6" y="7" width="1" height="1" />
        <rect x="7" y="7" width="1" height="1" />
        <rect x="8" y="7" width="1" height="1" />
        <rect x="9" y="7" width="1" height="1" />
        <rect x="7" y="8" width="1" height="1" />
        <rect x="8" y="8" width="1" height="1" />
        <rect x="11" y="11" width="1" height="1" />
        <rect x="12" y="11" width="1" height="1" />
        <rect x="11" y="12" width="1" height="1" />
        <rect x="12" y="12" width="1" height="1" />
        <rect x="11" y="13" width="1" height="1" />
        <rect x="3" y="12" width="1" height="1" />
        <rect x="4" y="12" width="1" height="1" />
        <rect x="3" y="13" width="1" height="1" />
        <rect x="4" y="13" width="1" height="1" />
        <rect x="3" y="14" width="1" height="1" />
        <rect x="5" y="16" width="1" height="1" />
        <rect x="9" y="16" width="1" height="1" />
      </g>
      <g class="pixel-skin pixel-skin--shadow">
        <rect x="6" y="7" width="1" height="1" />
        <rect x="9" y="7" width="1" height="1" />
        <rect x="12" y="13" width="1" height="1" />
        <rect x="4" y="14" width="1" height="1" />
      </g>
      <g class="pixel-primary">
        <rect x="4" y="9" width="1" height="1" />
        <rect x="5" y="9" width="1" height="1" />
        <rect x="6" y="9" width="1" height="1" />
        <rect x="7" y="9" width="1" height="1" />
        <rect x="8" y="9" width="1" height="1" />
        <rect x="9" y="9" width="1" height="1" />
        <rect x="10" y="9" width="1" height="1" />
        <rect x="11" y="9" width="1" height="1" />
        <rect x="3" y="10" width="1" height="1" />
        <rect x="4" y="10" width="1" height="1" />
        <rect x="5" y="10" width="1" height="1" />
        <rect x="6" y="10" width="1" height="1" />
        <rect x="7" y="10" width="1" height="1" />
        <rect x="8" y="10" width="1" height="1" />
        <rect x="9" y="10" width="1" height="1" />
        <rect x="10" y="10" width="1" height="1" />
        <rect x="11" y="10" width="1" height="1" />
        <rect x="12" y="10" width="1" height="1" />
        <rect x="3" y="11" width="1" height="1" />
        <rect x="4" y="11" width="1" height="1" />
        <rect x="5" y="11" width="1" height="1" />
        <rect x="6" y="11" width="1" height="1" />
        <rect x="7" y="11" width="1" height="1" />
        <rect x="8" y="11" width="1" height="1" />
        <rect x="9" y="11" width="1" height="1" />
        <rect x="10" y="11" width="1" height="1" />
        <rect x="11" y="11" width="1" height="1" />
        <rect x="12" y="11" width="1" height="1" />
        <rect x="4" y="12" width="1" height="1" />
        <rect x="5" y="12" width="1" height="1" />
        <rect x="6" y="12" width="1" height="1" />
        <rect x="7" y="12" width="1" height="1" />
        <rect x="8" y="12" width="1" height="1" />
        <rect x="9" y="12" width="1" height="1" />
        <rect x="10" y="12" width="1" height="1" />
        <rect x="11" y="12" width="1" height="1" />
        <rect x="5" y="13" width="1" height="1" />
        <rect x="6" y="13" width="1" height="1" />
        <rect x="7" y="13" width="1" height="1" />
        <rect x="8" y="13" width="1" height="1" />
        <rect x="9" y="13" width="1" height="1" />
        <rect x="10" y="13" width="1" height="1" />
        <rect x="2" y="9" width="1" height="1" />
        <rect x="2" y="10" width="1" height="1" />
        <rect x="12" y="9" width="1" height="1" />
        <rect x="13" y="10" width="1" height="1" />
      </g>
      <g class="pixel-primary pixel-primary--shadow">
        <rect x="4" y="10" width="1" height="1" />
        <rect x="5" y="10" width="1" height="1" />
        <rect x="4" y="11" width="1" height="1" />
        <rect x="10" y="11" width="1" height="1" />
        <rect x="11" y="11" width="1" height="1" />
        <rect x="10" y="12" width="1" height="1" />
        <rect x="11" y="12" width="1" height="1" />
        <rect x="5" y="13" width="1" height="1" />
        <rect x="6" y="13" width="1" height="1" />
        <rect x="10" y="10" width="1" height="1" />
      </g>
      <g class="pixel-trim">
        <rect x="5" y="10" width="1" height="1" />
        <rect x="6" y="10" width="1" height="1" />
        <rect x="8" y="10" width="1" height="1" />
        <rect x="9" y="10" width="1" height="1" />
        <rect x="5" y="11" width="1" height="1" />
        <rect x="9" y="11" width="1" height="1" />
        <rect x="5" y="12" width="1" height="1" />
        <rect x="9" y="12" width="1" height="1" />
      </g>
      <g class="pixel-secondary">
        <rect x="5" y="14" width="1" height="1" />
        <rect x="6" y="14" width="1" height="1" />
        <rect x="7" y="14" width="1" height="1" />
        <rect x="8" y="14" width="1" height="1" />
        <rect x="9" y="14" width="1" height="1" />
        <rect x="10" y="14" width="1" height="1" />
        <rect x="11" y="14" width="1" height="1" />
        <rect x="6" y="15" width="1" height="1" />
        <rect x="7" y="15" width="1" height="1" />
        <rect x="8" y="15" width="1" height="1" />
        <rect x="9" y="15" width="1" height="1" />
        <rect x="10" y="15" width="1" height="1" />
        <rect x="5" y="16" width="1" height="1" />
        <rect x="6" y="16" width="1" height="1" />
        <rect x="7" y="16" width="1" height="1" />
        <rect x="8" y="16" width="1" height="1" />
        <rect x="9" y="16" width="1" height="1" />
        <rect x="10" y="16" width="1" height="1" />
      </g>
      <g class="pixel-secondary pixel-secondary--shadow">
        <rect x="6" y="15" width="1" height="1" />
        <rect x="7" y="15" width="1" height="1" />
        <rect x="9" y="15" width="1" height="1" />
      </g>
      <g class="pixel-primary pixel-primary--sock">
        <rect x="6" y="17" width="1" height="1" />
        <rect x="7" y="17" width="1" height="1" />
        <rect x="8" y="17" width="1" height="1" />
        <rect x="9" y="17" width="1" height="1" />
      </g>
      <g class="pixel-primary pixel-primary--shadow">
        <rect x="6" y="17" width="1" height="1" />
        <rect x="9" y="17" width="1" height="1" />
      </g>
      <g class="pixel-boot">
        <rect x="5" y="18" width="1" height="1" />
        <rect x="6" y="18" width="1" height="1" />
        <rect x="7" y="18" width="1" height="1" />
        <rect x="8" y="18" width="1" height="1" />
        <rect x="9" y="18" width="1" height="1" />
        <rect x="10" y="18" width="1" height="1" />
      </g>
      <g class="pixel-ball">
        <rect x="1" y="15" width="1" height="1" />
        <rect x="1" y="16" width="1" height="1" />
        <rect x="2" y="16" width="1" height="1" />
        <rect x="2" y="17" width="1" height="1" />
        <rect x="1" y="17" width="1" height="1" />
        <rect x="3" y="17" width="1" height="1" />
      </g>
      <g class="pixel-ball pixel-ball--accent">
        <rect x="2" y="15" width="1" height="1" />
      </g>
    </svg>
  `;
  return el;
}

function buildGameInstance() {
  calibrateCanvasResolution();

  const selectedCard =
    getCardById(playerData.selectedCardId) ||
    PLAYER_CARDS.find((c) => c.id === "street_striker") ||
    PLAYER_CARDS[0];

  const level = getCardLevel(playerData, selectedCard.id);
  const multipliers = getEffectiveMultipliers(selectedCard, level);
  const kitColors = getKitColorsFromProfile();
  const perks = getEffectivePerks(selectedCard, level);
  const tuning = getLevelTuning(selectedCard, level);

  game = new Game(canvas, {
    playerCard: selectedCard,
    multipliers,
    kitColors,
    ballAccent: kitColors.ballAccent,
    perks,
    tuning,
    bestDistance: playerData.bestDistance,
    pixelRatio: renderScale,
    logicalWidth,
    logicalHeight,
    visualVariant,
    onStats: handleGameStats,
    onState: handleGameState,
    onGoal: handleGameGoal,
    onGameOver: handleGameOver
  });
}

function updateTouchControlsVisibility() {
  const inRun = currentScreenId === null;

  // Show the mobile buttons while the run is active and swap the CTA based on
  // whether we're running or waiting to start.
  touchControlsContainer?.classList.toggle("touch-controls--hidden", inRun);
  startButton?.classList.toggle("hidden", inRun);
  pauseTouchButton?.classList.toggle("hidden", !inRun);
}

function setVisualVariant(nextVariant) {
  if (visualVariant === nextVariant) return;
  visualVariant = nextVariant;
  buildGameInstance();
  updateVariantToggleUI();
}

function updateVariantToggleUI() {
  const buttons = [
    { el: btnPlay, variant: "v1" },
    { el: btnPlayV2, variant: "v2" }
  ];

  buttons.forEach(({ el, variant }) => {
    el?.classList.toggle("variant-toggle__button--active", visualVariant === variant);
  });
}

function updateBuilderPreview() {
  const kit = getKitColorsFromInputs();
  if (builderPreviewJersey) {
    builderPreviewJersey.style.setProperty("--kit-primary", kit.primary);
    builderPreviewJersey.style.setProperty("--kit-secondary", kit.secondary);
    builderPreviewJersey.style.setProperty("--kit-trim", kit.trim);
  }
  if (builderPreviewBall) {
    builderPreviewBall.style.setProperty("--ball-accent", kit.ballAccent);
  }
}

function syncPresetSelection() {
  if (!kitPresetList) return;

  const current = getKitColorsFromInputs();
  const activePreset = KIT_PRESETS.find(
    (preset) =>
      normalizeHex(preset.primary) === normalizeHex(current.primary) &&
      normalizeHex(preset.secondary) === normalizeHex(current.secondary) &&
      normalizeHex(preset.trim) === normalizeHex(current.trim) &&
      normalizeHex(preset.ballAccent) === normalizeHex(current.ballAccent)
  );

  const presetButtons = kitPresetList.querySelectorAll(".kit-preset");
  presetButtons.forEach((btn) => {
    const isMatch =
      btn.dataset.primary === normalizeHex(current.primary) &&
      btn.dataset.secondary === normalizeHex(current.secondary) &&
      btn.dataset.trim === normalizeHex(current.trim) &&
      btn.dataset.ball === normalizeHex(current.ballAccent);
    btn.classList.toggle("is-active", Boolean(activePreset) && isMatch);
  });
}

function applyKitPreset(preset) {
  if (!preset) return;

  if (builderPrimaryInput) builderPrimaryInput.value = preset.primary;
  if (builderSecondaryInput) builderSecondaryInput.value = preset.secondary;
  if (builderTrimInput) builderTrimInput.value = preset.trim;
  if (builderBallInput) builderBallInput.value = preset.ballAccent;

  playerData.profile = {
    ...playerData.profile,
    kitPrimary: preset.primary,
    kitSecondary: preset.secondary,
    kitTrim: preset.trim,
    ballAccent: preset.ballAccent
  };

  updateBuilderPreview();
  syncPresetSelection();
}

function renderKitPresets() {
  if (!kitPresetList) return;

  kitPresetList.innerHTML = "";

  KIT_PRESETS.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kit-preset";
    btn.dataset.primary = normalizeHex(preset.primary);
    btn.dataset.secondary = normalizeHex(preset.secondary);
    btn.dataset.trim = normalizeHex(preset.trim);
    btn.dataset.ball = normalizeHex(preset.ballAccent);

    btn.innerHTML = `
      <div class="kit-preset__heading">
        <p class="kit-preset__name">${preset.name}</p>
        <span class="pill pill--soft">Preset</span>
      </div>
      <p class="kit-preset__tagline">${preset.tagline}</p>
      <div class="kit-preset__swatches">
        <span class="kit-preset__swatch" style="background:${preset.primary}"></span>
        <span class="kit-preset__swatch" style="background:${preset.secondary}"></span>
        <span class="kit-preset__swatch" style="background:${preset.trim}"></span>
        <span class="kit-preset__swatch" style="background:${preset.ballAccent}"></span>
      </div>
      <div class="kit-preset__labels">
        <span>Primary</span>
        <span>Secondary</span>
        <span>Trim</span>
        <span>Ball</span>
      </div>
    `;

    btn.addEventListener("click", () => applyKitPreset(preset));
    kitPresetList.appendChild(btn);
  });

  syncPresetSelection();
}

function populateBuilderForm() {
  const profile = playerData.profile || {};
  if (builderNameInput) builderNameInput.value = profile.displayName || "";
  if (builderPrimaryInput) builderPrimaryInput.value = profile.kitPrimary || "#1f3a74";
  if (builderSecondaryInput)
    builderSecondaryInput.value = profile.kitSecondary || "#80223c";
  if (builderTrimInput) builderTrimInput.value = profile.kitTrim || "#0bd3c7";
  if (builderBallInput) builderBallInput.value = profile.ballAccent || "#f2f4ff";
  updateBuilderPreview();
  syncPresetSelection();
}

function openPlayerBuilder(message = "") {
  builderOverlay?.classList.add("builder-overlay--visible");
  if (builderSubtitle) builderSubtitle.textContent = message || "Set your jersey and ball";
  populateBuilderForm();
}

function closePlayerBuilder() {
  builderOverlay?.classList.remove("builder-overlay--visible");
}

function ensureProfileSetup(reason = "") {
  if (!playerData.profile?.builderCompleted) {
    openPlayerBuilder(reason);
    return false;
  }
  return true;
}

function saveBuilderChoices(markCompleted = true) {
  const updatedProfile = {
    ...playerData.profile,
    displayName: builderNameInput?.value.trim() || playerData.profile.displayName || "",
    kitPrimary: builderPrimaryInput?.value || "#1f3a74",
    kitSecondary: builderSecondaryInput?.value || "#80223c",
    kitTrim: builderTrimInput?.value || "#0bd3c7",
    ballAccent: builderBallInput?.value || "#f2f4ff",
    builderCompleted: markCompleted
  };

  playerData.profile = updatedProfile;
  savePlayerData(playerData);
  updateProfileUI("Look saved and applied.");
  buildGameInstance();
  updateBuilderPreview();
  closePlayerBuilder();
}


function renderTeamScreen() {
  cardListEl.innerHTML = "";

  PLAYER_CARDS.forEach((card) => {
    const isUnlocked = playerData.unlockedCards.includes(card.id);
    const isSelected = playerData.selectedCardId === card.id;
    const cardLevel = getCardLevel(playerData, card.id);
    const effective = getEffectiveMultipliers(card, cardLevel);
    const perks = getEffectivePerks(card, cardLevel);
    const nextLevel = Math.min(CARD_LEVEL_CAP, cardLevel + 1);
    const nextEffective = getEffectiveMultipliers(card, nextLevel);
    const nextPerks = getEffectivePerks(card, nextLevel);
    const palette = CARD_PIXEL_PALETTES[card.id] || CARD_PIXEL_PALETTES.street_striker;

    const el = document.createElement("article");
    el.className = "player-card";
    el.classList.add(`player-card--${card.rarity}`);
    if (!isUnlocked) el.classList.add("player-card--locked");
    if (isSelected) el.classList.add("player-card--selected");
    el.dataset.cardId = card.id;

    const art = document.createElement("div");
    art.className = "player-card__art";
    const rarityPill = document.createElement("span");
    rarityPill.className = "player-card__rarity";
    rarityPill.textContent = `${card.rarity} card`;
    art.appendChild(rarityPill);
    art.appendChild(createPixelPlayerElement(palette));
    const artLevel = document.createElement("span");
    artLevel.className = "player-card__level-tag";
    artLevel.textContent = `Lvl ${cardLevel}`;
    art.appendChild(artLevel);

    const body = document.createElement("div");
    body.className = "player-card__body";

    const header = document.createElement("div");
    header.className = "player-card__header";
    header.innerHTML = `
      <div class="player-card__title-block">
        <p class="player-card__eyebrow">${card.position} • ${card.rarity.toUpperCase()}</p>
        <div class="player-card__name-row">
          <span class="player-card__name">${card.name}</span>
          <span class="player-card__level">Level ${cardLevel}/${CARD_LEVEL_CAP}</span>
        </div>
        <p class="player-card__tagline">${card.tagline}</p>
      </div>
      <div class="player-card__badge">
        <div class="player-card__rating">${card.rating}</div>
        <div class="player-card__pos">OVR</div>
        <div class="player-card__pos">${card.position}</div>
      </div>
    `;

    const stats = document.createElement("div");
    stats.className = "player-card__stats";
    const buildStat = (label, current, nextText) => {
      const stat = document.createElement("div");
      stat.className = "player-card__stat";
      stat.innerHTML = `
        <p class="player-card__stat-label">${label}</p>
        <div class="player-card__stat-values">
          <strong>${current}</strong>
          <span class="player-card__stat-next">${nextText}</span>
        </div>
      `;
      return stat;
    };

    const speedDelta = ((nextEffective.speed / effective.speed - 1) * 100).toFixed(0);
    const coinDelta = ((nextEffective.coins / effective.coins - 1) * 100).toFixed(0);
    const shotDelta = ((nextEffective.shotGain / effective.shotGain - 1) * 100).toFixed(0);

    stats.appendChild(
      buildStat(
        "Acceleration",
        `x${effective.speed.toFixed(2)}`,
        cardLevel >= CARD_LEVEL_CAP ? "Maxed" : `Next: +${speedDelta}%`
      )
    );
    stats.appendChild(
      buildStat(
        "Coin haul",
        `x${effective.coins.toFixed(2)}`,
        cardLevel >= CARD_LEVEL_CAP ? "Maxed" : `Next: +${coinDelta}%`
      )
    );
    stats.appendChild(
      buildStat(
        "Shot meter",
        `x${effective.shotGain.toFixed(2)}`,
        cardLevel >= CARD_LEVEL_CAP ? "Maxed" : `Next: +${shotDelta}%`
      )
    );

    const perkSection = document.createElement("div");
    perkSection.className = "player-card__perks";
    const perksTitle = document.createElement("p");
    perksTitle.className = "player-card__perks-title";
    perksTitle.textContent = "Signature boosts";
    const perkList = document.createElement("div");
    perkList.className = "player-card__perk-list";
    const perkLines = buildPerkSummary(perks).split(" · ");
    perkLines.forEach((line) => {
      const chip = document.createElement("span");
      chip.className = "player-card__perk-chip";
      chip.textContent = line;
      perkList.appendChild(chip);
    });
    const perkDelta = document.createElement("p");
    perkDelta.className = "player-card__perk-delta";
    perkDelta.textContent =
      cardLevel >= CARD_LEVEL_CAP
        ? "Perks at peak"
        : `Next upgrade adds ${buildPerkDelta(perks, nextPerks)}`;
    perkSection.appendChild(perksTitle);
    perkSection.appendChild(perkList);
    perkSection.appendChild(perkDelta);

    const actions = document.createElement("div");
    actions.className = "player-card__actions";
    const upgradeNote = document.createElement("p");
    upgradeNote.className = "player-card__upgrade-note";
    upgradeNote.textContent =
      cardLevel >= CARD_LEVEL_CAP
        ? "Max level reached"
        : `Upgrade unlocks +${speedDelta}% speed, +${coinDelta}% coins, +${shotDelta}% shot gains.`;

    if (!isUnlocked) {
      const unlockBtn = document.createElement("button");
      unlockBtn.className = "btn btn--small btn--primary";
      const runsEstimate = estimateRunsForCost(playerData, card.unlockCost);
      unlockBtn.textContent = `Unlock – ${card.unlockCost} coins (≈${runsEstimate} runs)`;
      unlockBtn.addEventListener("click", () => {
        if (playerData.coins < card.unlockCost) {
          alert("Not enough coins to unlock this card.");
          return;
        }
        if (unlockCard(playerData, card)) {
          savePlayerData(playerData);
          updateCoinsHeader();
          renderTeamScreen();
        }
      });
      actions.appendChild(unlockBtn);
    } else {
      const selectBtn = document.createElement("button");
      selectBtn.className = "btn btn--small";
      selectBtn.textContent = isSelected ? "Selected" : "Select";
      if (isSelected) {
        selectBtn.disabled = true;
      } else {
        selectBtn.addEventListener("click", () => {
          if (selectCard(playerData, card)) {
            savePlayerData(playerData);
            renderTeamScreen();
            buildGameInstance();
          }
        });
      }
      actions.appendChild(selectBtn);

      if (cardLevel < CARD_LEVEL_CAP) {
        const nextCost = getUpgradeCost(card, cardLevel);
        const upgradeBtn = document.createElement("button");
        upgradeBtn.className = "btn btn--small btn--primary";
        upgradeBtn.textContent = `Upgrade to L${nextLevel} – ${nextCost} coins`;
        upgradeBtn.addEventListener("click", () => {
          if (playerData.coins < nextCost) {
            alert("Not enough coins to upgrade this card.");
            return;
          }
          const result = upgradeCard(playerData, card);
          if (result.success) {
            savePlayerData(playerData);
            updateCoinsHeader();
            renderTeamScreen();
            buildGameInstance();
          }
        });
        actions.appendChild(upgradeBtn);
      }
    }

    body.appendChild(header);
    body.appendChild(stats);
    body.appendChild(perkSection);
    body.appendChild(upgradeNote);
    body.appendChild(actions);

    el.appendChild(art);
    el.appendChild(body);

    cardListEl.appendChild(el);
  });
}

function renderMissionList(container, missions, cadence) {
  container.innerHTML = "";
  missions.forEach((mission) => {
    const progressPct = Math.min(100, (mission.progress / mission.goal) * 100);
    const isComplete = mission.progress >= mission.goal;

    const card = document.createElement("div");
    card.className = "mission-card";
    if (isComplete) card.classList.add("mission-card--complete");
    if (mission.claimed) card.classList.add("mission-card--claimed");

    const header = document.createElement("div");
    header.className = "mission-card__header";
    const title = document.createElement("p");
    title.className = "mission-card__title";
    title.textContent = mission.name;
    const reward = document.createElement("span");
    reward.className = "mission-card__reward pill pill--soft";
    reward.textContent = `+${mission.reward} coins`;
    header.appendChild(title);
    header.appendChild(reward);

    const desc = document.createElement("p");
    desc.className = "mission-card__desc";
    desc.textContent = mission.description;

    const meta = document.createElement("div");
    meta.className = "mission-card__meta";
    meta.textContent = `${mission.progress}/${mission.goal}`;

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    const fill = document.createElement("div");
    fill.className = "progress-bar__fill";
    fill.style.width = `${progressPct}%`;
    progressBar.appendChild(fill);

    const actions = document.createElement("div");
    actions.className = "mission-card__actions";
    const claimBtn = document.createElement("button");
    claimBtn.className = "btn btn--small";
    if (mission.claimed) {
      claimBtn.textContent = "Claimed";
      claimBtn.disabled = true;
    } else if (isComplete) {
      claimBtn.classList.add("btn--primary");
      claimBtn.textContent = "Claim";
      claimBtn.addEventListener("click", () => {
        const rewardCoins = claimMissionReward(playerData, cadence, mission.id);
        if (rewardCoins > 0) {
          savePlayerData(playerData);
          updateCoinsHeader();
          renderMissions();
        }
      });
    } else {
      claimBtn.textContent = "In progress";
      claimBtn.disabled = true;
    }
    actions.appendChild(claimBtn);

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(progressBar);
    card.appendChild(meta);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

function renderMissions() {
  if (!playerData.missions) {
    updateMissionCelebrationState(false);
    return;
  }
  renderMissionList(
    dailyMissionsEl,
    playerData.missions.daily?.missions || [],
    "daily"
  );
  renderMissionList(
    weeklyMissionsEl,
    playerData.missions.weekly?.missions || [],
    "weekly"
  );

  const allMissions = [
    ...(playerData.missions.daily?.missions || []),
    ...(playerData.missions.weekly?.missions || [])
  ];
  const hasClaimableMission = allMissions.some(
    (mission) => mission.progress >= mission.goal && !mission.claimed
  );
  updateMissionCelebrationState(hasClaimableMission);
}

function startVariantRun(variant) {
  if (variant && variant !== visualVariant) {
    setVisualVariant(variant);
  }
  startRun();
}

function startRun() {
  if (!ensureProfileSetup("Customize your striker before the first run.")) return;
  setActiveScreen(null); // close menus
  pauseBanner.classList.add("hidden");
  pauseMenu?.classList.add("hidden");
  resetContinueState();
  game.startRun();
  updateTouchControlsVisibility();
}

function togglePause() {
  if (!game) return;
  const state = game.getRunState();
  if (state === "running") {
    game.pause();
  } else if (state === "paused") {
    game.resume();
  }
}

function showPauseMenu() {
  pauseBanner.classList.add("hidden");
  pauseMenu?.classList.remove("hidden");
}

function hidePauseMenu() {
  pauseMenu?.classList.add("hidden");
  pauseBanner.classList.add("hidden");
}

function exitRun({ saveProgress = false } = {}) {
  if (saveProgress) {
    playerData.profile = {
      ...playerData.profile,
      lastManualSave: new Date().toISOString()
    };
    savePlayerData(playerData);
    updateProfileUI("Progress saved before quitting.");
  }

  hidePauseMenu();
  setActiveScreen("mainMenu");
  game?.abortRun();
  updateTouchControlsVisibility();
}

function calculateRunCoins(payload) {
  const distanceBonus = Math.floor(payload.distance / 20);
  const goalBonus = payload.goals * 20;
  const runCoins = payload.coins + distanceBonus + goalBonus;
  return { runCoins, distanceBonus, goalBonus };
}

function getAvailableTokensForContinue(runCoins) {
  const remainingRunCoins = Math.max(0, runCoins - continueSpendTotal);
  return playerData.coins + remainingRunCoins;
}

function applyRunResults(payload) {
  const { runCoins, distanceBonus, goalBonus } = calculateRunCoins(payload);
  const netCoins = Math.max(0, runCoins - continueSpendTotal);
  const previousBest = playerData.bestDistance;

  playerData.coins += netCoins;
  playerData.totalGoals += payload.goals;
  if (payload.distance > playerData.bestDistance) {
    playerData.bestDistance = payload.distance;
  }
  updateMissionsAfterRun(playerData, {
    distance: payload.distance,
    goals: payload.goals,
    coins: runCoins
  });

  const history = Array.isArray(playerData.recentRunCoins)
    ? playerData.recentRunCoins
    : [];
  history.push(runCoins);
  playerData.recentRunCoins = history.slice(-5);

  playerData.profile = {
    ...playerData.profile,
    lastAutoSave: new Date().toISOString()
  };
  savePlayerData(playerData);
  updateCoinsHeader();
  renderMissions();
  updateProfileUI("Progress auto-saved after the match.");

  const earnedCoinsNote =
    continueSpendTotal > 0
      ? `Earned ${netCoins} tokens after spending ${continueSpendTotal} to continue.`
      : "";

  goCoins.textContent = `${netCoins}`;
  goCoinsInRun.textContent = `${payload.coins}`;
  goCoinsDistance.textContent = `${distanceBonus}`;
  goCoinsGoals.textContent = `${goalBonus}`;
  goCoinsTotal.textContent = `${netCoins}`;

  if (payload.distance > previousBest) {
    goBestNote.textContent = "New personal best for this device!";
  } else {
    goBestNote.textContent = `Best distance so far: ${playerData.bestDistance} m`;
  }

  if (earnedCoinsNote) {
    goBestNote.textContent += ` ${earnedCoinsNote}`;
  }
}

function updateGameOverUI(payload) {
  const { runCoins, distanceBonus, goalBonus } = calculateRunCoins(payload);
  const netCoins = Math.max(0, runCoins - continueSpendTotal);
  const projectedBest = Math.max(playerData.bestDistance, payload.distance);
  const availableTokens = getAvailableTokensForContinue(runCoins);

  goDistance.textContent = `${payload.distance} m`;
  goGoals.textContent = `${payload.goals}`;
  goCoins.textContent = `${netCoins}`;
  goCoinsInRun.textContent = `${payload.coins}`;
  goCoinsDistance.textContent = `${distanceBonus}`;
  goCoinsGoals.textContent = `${goalBonus}`;
  goCoinsTotal.textContent = `${netCoins}`;

  if (projectedBest > playerData.bestDistance) {
    goBestNote.textContent = "New personal best for this device!";
  } else {
    goBestNote.textContent = `Best distance so far: ${playerData.bestDistance} m`;
  }

  const tokenLabel = `${continueCost} tokens`;
  continueCostLabel.textContent = tokenLabel;
  btnContinue.textContent = `Continue for ${tokenLabel}`;
  const canAfford = availableTokens >= continueCost;
  btnContinue.disabled = !canAfford;
  goContinueNote.textContent = canAfford
    ? `You can spend tokens to keep this run going. Cost increases by 10 each time you continue.`
    : `You need ${continueCost - availableTokens} more tokens to continue this run.`;
}

function handleGameStats(stats) {
  hudDistance.textContent = `${stats.distance} m`;
  hudGoals.textContent = stats.goals.toString();
  hudBest.textContent = `${stats.bestDistance} m`;
  const pct = (stats.shotMeter / 100) * 100;
  shotMeterFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  shotMeterFill.classList.toggle("shot-meter__fill--ready", !!stats.shotReady);
}

function handleGameState(state) {
  if (state === "paused") {
    showPauseMenu();
  } else {
    hidePauseMenu();
  }
  updateTouchControlsVisibility();
}

function handleGameGoal() {
  // Could hook SFX / analytics here
}

function handleGameOver(payload) {
  pendingGameOverPayload = payload;
  updateGameOverUI(payload);
  setActiveScreen("gameOverScreen");
}

function finalizePendingGameOver() {
  if (!pendingGameOverPayload) return;
  applyRunResults(pendingGameOverPayload);
  resetContinueState();
}

function handleInputAction(action) {
  const actionType = typeof action === "string" ? action : action?.type;
  const detail = typeof action === "object" ? action.detail || {} : {};

  // While a menu screen is open
  if (currentScreenId === "mainMenu") {
    if (actionType === "startRun") {
      startVariantRun(visualVariant);
    } else if (actionType === "pauseToggle") {
      // ignore
    }
    return;
  }

  if (
    currentScreenId === "teamScreen" ||
    currentScreenId === "settingsScreen" ||
    currentScreenId === "gameOverScreen"
  ) {
    if (actionType === "pauseToggle") {
      setActiveScreen("mainMenu");
    } else if (
      currentScreenId === "gameOverScreen" &&
      actionType === "startRun"
    ) {
      finalizePendingGameOver();
      setActiveScreen(null);
      game.startRun();
    }
    return;
  }

  // In run (no active overlay screen)
  if (!game) return;
  const state = game.getRunState();

  if (actionType === "pauseToggle") {
    togglePause();
    return;
  }

  if (state !== "running") {
    if (actionType === "startRun") {
      startRun();
    }
    return;
  }

  if (actionType === "primary" && game.isShotReady()) {
    const aimBias = Math.max(-1, Math.min(1, (detail.dx || 0) / 140));
    game.attemptShot(aimBias);
    return;
  }

  if (actionType === "moveLeft") game.handleMove("left");
  else if (actionType === "moveRight") game.handleMove("right");
  else if (actionType === "tackle") game.handleMove("tackle");
  else if (actionType === "juke") game.handleMove("juke");
}

// Button wiring

document.addEventListener("pointerdown", handlePressableDown, { passive: true });
window.addEventListener("pointerup", clearPressedState, { passive: true });
window.addEventListener("pointercancel", clearPressedState, { passive: true });
window.addEventListener("blur", clearPressedState, { passive: true });

btnPlay.addEventListener("click", () => {
  spawnTapParticles(btnPlay);
  startVariantRun("v1");
});

btnPlayV2?.addEventListener("click", () => {
  spawnTapParticles(btnPlayV2);
  startVariantRun("v2");
});

btnOpenBuilder?.addEventListener("click", () => {
  openPlayerBuilder("Claim your kit and ball look.");
});

btnSaveBuilder?.addEventListener("click", () => {
  saveBuilderChoices(true);
  startRun();
});

btnSkipBuilder?.addEventListener("click", () => {
  saveBuilderChoices(true);
  closePlayerBuilder();
});

btnShufflePreset?.addEventListener("click", () => {
  const randomPreset = KIT_PRESETS[Math.floor(Math.random() * KIT_PRESETS.length)];
  applyKitPreset(randomPreset);
});

[builderPrimaryInput, builderSecondaryInput, builderTrimInput, builderBallInput]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener("input", () => {
      playerData.profile = {
        ...playerData.profile,
        kitPrimary: builderPrimaryInput?.value || playerData.profile.kitPrimary,
        kitSecondary: builderSecondaryInput?.value || playerData.profile.kitSecondary,
        kitTrim: builderTrimInput?.value || playerData.profile.kitTrim,
        ballAccent: builderBallInput?.value || playerData.profile.ballAccent
      };
      updateBuilderPreview();
      syncPresetSelection();
    });
  });

btnTeam.addEventListener("click", () => {
  renderTeamScreen();
  setActiveScreen("teamScreen");
});

btnMissions?.addEventListener("click", () => {
  setActiveScreen("mainMenu");
  focusMissionsPanel();
});

btnSettings.addEventListener("click", () => {
  setActiveScreen("settingsScreen");
});

btnPause.addEventListener("click", () => {
  togglePause();
});

pauseMenuResumeBtn?.addEventListener("click", () => {
  togglePause();
});

pauseMenuSaveQuitBtn?.addEventListener("click", () => {
  exitRun({ saveProgress: true });
});

pauseMenuQuitBtn?.addEventListener("click", () => {
  exitRun({ saveProgress: false });
});

btnReplay.addEventListener("click", () => {
  finalizePendingGameOver();
  setActiveScreen(null);
  game.startRun();
});

btnGoToTeam.addEventListener("click", () => {
  finalizePendingGameOver();
  renderTeamScreen();
  setActiveScreen("teamScreen");
});

btnGoToMenu.addEventListener("click", () => {
  finalizePendingGameOver();
  setActiveScreen("mainMenu");
});

btnContinue?.addEventListener("click", () => {
  if (!pendingGameOverPayload) return;
  const { runCoins } = calculateRunCoins(pendingGameOverPayload);
  const availableFromRun = Math.max(0, runCoins - continueSpendTotal);
  let costRemaining = continueCost;

  if (availableFromRun > 0) {
    const runTokensUsed = Math.min(costRemaining, availableFromRun);
    continueSpendTotal += runTokensUsed;
    costRemaining -= runTokensUsed;
  }

  if (costRemaining > 0) {
    if (playerData.coins < costRemaining) {
      alert("Not enough tokens to continue this run.");
      return;
    }
    playerData.coins -= costRemaining;
  }

  continueCost += 10;
  updateCoinsHeader();
  setActiveScreen(null);
  pendingGameOverPayload = null;
  game.reviveAfterContinue();
});

btnResetProgress.addEventListener("click", () => {
  if (
    confirm(
      "Reset local progress (coins, unlocked cards, best distance) on this device?"
    )
  ) {
    localStorage.clear();
    playerData = loadPlayerData();
    updateCoinsHeader();
    buildGameInstance();
    renderTeamScreen();
    renderMissions();
    updateProfileUI();
  }
});

// Touch controls for mobile devices
touchControls.forEach((btn) => {
  btn.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();
      const action = btn.dataset.action;
      if (action === "startRun") {
        spawnTapParticles(btn, 7);
      }
      if (action) handleInputAction({ type: action });
    },
    { passive: false }
  );
});

function openAuthSheet() {
  authSheet?.classList.add("auth-sheet--visible");
  authSheet?.setAttribute("aria-hidden", "false");
}

function closeAuthSheet() {
  authSheet?.classList.remove("auth-sheet--visible");
  authSheet?.setAttribute("aria-hidden", "true");
}

// Login / save UI
function updateProfileUI(message) {
  const profile = playerData.profile || {};
  if (loginEmailInput) loginEmailInput.value = profile.email || "";
  if (loginNameInput) loginNameInput.value = profile.displayName || "";

  const isGuest = profile.isGuest !== false;
  const profileLabel = getProfileLabel(profile);
  if (authStatus) authStatus.textContent = isGuest ? "Guest profile" : "Linked profile";
  if (profileNameLabel) profileNameLabel.textContent = profileLabel;
  if (profileStatusLabel)
    profileStatusLabel.textContent = isGuest ? "💾 Save progress" : "Profile linked";
  if (profileAvatar) profileAvatar.textContent = getProfileAvatarGlyph(profile);
  profileButton?.classList.toggle("profile-button--guest", isGuest);

  const saveLabel = profile.lastAutoSave
    ? `Auto-saved after last match on ${new Date(profile.lastAutoSave).toLocaleString()}`
    : profile.lastManualSave
      ? `Last saved ${new Date(profile.lastManualSave).toLocaleString()}`
      : "Progress auto-saves locally on this device.";
  if (saveStatus) saveStatus.textContent = message || saveLabel;
}

btnLogin?.addEventListener("click", () => {
  const email = loginEmailInput?.value.trim();
  const displayName = loginNameInput?.value.trim() || getProfileLabel(playerData.profile);

  if (!email || !displayName) {
    alert("Enter a display name and email to log in.");
    return;
  }

  playerData.profile = {
    ...playerData.profile,
    email,
    displayName,
    isGuest: false,
    linkedAt: new Date().toISOString(),
    lastManualSave: new Date().toISOString()
  };
  savePlayerData(playerData);
  updateProfileUI("Account linked – progress will sync on this device.");
  closeAuthSheet();
});

btnSaveProgress?.addEventListener("click", () => {
  playerData.profile = {
    ...playerData.profile,
    lastManualSave: new Date().toISOString()
  };
  savePlayerData(playerData);
  updateProfileUI("Progress saved to this device.");
  closeAuthSheet();
});

btnStayGuest?.addEventListener("click", () => {
  playerData.profile = {
    ...playerData.profile,
    isGuest: true
  };
  savePlayerData(playerData);
  updateProfileUI("Staying in guest mode. We'll keep saving locally.");
  closeAuthSheet();
});

profileButton?.addEventListener("click", openAuthSheet);
btnCloseAuthSheet?.addEventListener("click", closeAuthSheet);
authSheetBackdrop?.addEventListener("click", closeAuthSheet);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAuthSheet();
  }
});

// Back buttons with data-nav
document.querySelectorAll("[data-nav='backMain']").forEach((btn) => {
  btn.addEventListener("click", () => {
    setActiveScreen("mainMenu");
  });
});

// Main loop
let lastTimestamp = 0;

function loop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const rawDt = (timestamp - lastTimestamp) / 1000;
  const dt = Math.min(0.05, Math.max(0, rawDt));
  lastTimestamp = timestamp;

  if (game) {
    game.update(dt);
    game.render();
  }

  requestAnimationFrame(loop);
}

// Bootstrap
buildGameInstance();
updateVariantToggleUI();
renderTeamScreen();
renderMissions();
setActiveScreen("mainMenu");
closeAuthSheet();
updateProfileUI();
updateTouchControlsVisibility();
updateBuilderPreview();
renderKitPresets();

if (!playerData.profile?.builderCompleted) {
  openPlayerBuilder("Pick your kit colors to start your career.");
}

input = new InputManager(canvas, handleInputAction);
input.attach();

requestAnimationFrame(loop);
