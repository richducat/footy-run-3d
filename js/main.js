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
const btnTeam = document.getElementById("btnTeam");
const btnSettings = document.getElementById("btnSettings");
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
const btnSaveBuilder = document.getElementById("btnSaveBuilder");
const btnSkipBuilder = document.getElementById("btnSkipBuilder");
const btnOpenBuilder = document.getElementById("btnOpenBuilder");

// Login / save
const loginEmailInput = document.getElementById("loginEmail");
const loginNameInput = document.getElementById("loginName");
const authStatus = document.getElementById("authStatus");
const saveStatus = document.getElementById("saveStatus");
const btnLogin = document.getElementById("btnLogin");
const btnSaveProgress = document.getElementById("btnSaveProgress");

// Team screen
const cardListEl = document.getElementById("cardList");

// Missions
const missionTitleEl = document.getElementById("missionTitle");
const missionDescriptionEl = document.getElementById("missionDescription");
const missionCadenceEl = document.getElementById("missionCadence");
const missionProgressFill = document.getElementById("missionProgressFill");
const missionProgressTextEl = document.getElementById("missionProgressText");
const missionRewardEl = document.getElementById("missionReward");
const missionStepperEl = document.getElementById("missionStepper");
const btnMissionAction = document.getElementById("btnMissionAction");
const btnPrevMission = document.getElementById("btnPrevMission");
const btnNextMission = document.getElementById("btnNextMission");
let missionCycle = [];
let missionIndex = 0;

let playerData = loadPlayerData();
updateCoinsHeader();

let game = null;
let input = null;
let continueCost = 10;
let continueSpendTotal = 0;
let pendingGameOverPayload = null;

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

function updateCoinsHeader() {
  headerCoinsValue.textContent = playerData.coins.toString();
}

function getKitColorsFromProfile(profile = playerData.profile || {}) {
  return {
    primary: profile.kitPrimary || "#1f3a74",
    secondary: profile.kitSecondary || "#80223c",
    trim: profile.kitTrim || "#0bd3c7",
    ballAccent: profile.ballAccent || "#f2f4ff"
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

function buildGameInstance() {
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

function updateBuilderPreview() {
  const kit = getKitColorsFromProfile();
  if (builderPreviewJersey) {
    builderPreviewJersey.style.setProperty("--kit-primary", kit.primary);
    builderPreviewJersey.style.setProperty("--kit-secondary", kit.secondary);
    builderPreviewJersey.style.setProperty("--kit-trim", kit.trim);
  }
  if (builderPreviewBall) {
    builderPreviewBall.style.background = `radial-gradient(circle at 30% 30%, #ffffff, ${
      kit.ballAccent
    })`;
  }
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

    const el = document.createElement("article");
    el.className = "player-card";
    el.classList.add(`player-card--${card.rarity}`);
    if (!isUnlocked) el.classList.add("player-card--locked");
    if (isSelected) el.classList.add("player-card--selected");
    el.dataset.cardId = card.id;

    const badge = document.createElement("div");
    badge.className = "player-card__badge";
    badge.innerHTML = `
      <div>
        <div class="player-card__rating">${card.rating}</div>
        <div class="player-card__pos">${card.position}</div>
      </div>
      <div style="font-size:9px; text-transform:uppercase; letter-spacing:0.07em;">Core</div>
    `;

    const portrait = document.createElement("div");
    portrait.className = "player-card__portrait";
    portrait.setAttribute("aria-hidden", "true");
    portrait.innerHTML = `
      <div class="player-card__portrait-highlight"></div>
      <div class="player-card__portrait-lines"></div>
      <div class="player-card__portrait-glow"></div>
    `;

    const info = document.createElement("div");
    info.className = "player-card__info";
    const name = document.createElement("div");
    name.className = "player-card__name";
    name.textContent = card.name;
    const meta = document.createElement("div");
    meta.className = "player-card__meta";
    meta.textContent = `Level ${cardLevel}/${CARD_LEVEL_CAP} · Speed x${effective.speed.toFixed(
      2
    )} · Coins x${effective.coins.toFixed(
      2
    )} · Shot x${effective.shotGain.toFixed(2)}`;
    const perkMeta = document.createElement("div");
    perkMeta.className = "player-card__meta player-card__meta--perk";
    perkMeta.textContent = buildPerkSummary(perks);
    const levelNote = document.createElement("div");
    levelNote.className = "player-card__meta";
    levelNote.textContent =
      cardLevel >= CARD_LEVEL_CAP
        ? "Max level reached"
        : `Next: +${((nextEffective.speed / effective.speed - 1) * 100).toFixed(
            0
          )}% Speed · +${(
            (nextEffective.coins / effective.coins - 1) * 100
          ).toFixed(0)}% Coins · +${(
            (nextEffective.shotGain / effective.shotGain - 1) * 100
          ).toFixed(0)}% Shot · ${buildPerkDelta(perks, nextPerks)}`;
    const tagline = document.createElement("div");
    tagline.className = "player-card__tagline";
    tagline.textContent = card.tagline;
    info.appendChild(name);
    info.appendChild(meta);
    info.appendChild(perkMeta);
    info.appendChild(levelNote);
    info.appendChild(tagline);

    const actions = document.createElement("div");
    actions.className = "player-card__actions";

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
        upgradeBtn.textContent = `Upgrade – ${nextCost} coins`;
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

    el.appendChild(badge);
    el.appendChild(portrait);
    el.appendChild(info);
    el.appendChild(actions);

    cardListEl.appendChild(el);
  });
}

function getActiveMission() {
  if (!missionCycle.length) return null;
  if (missionIndex >= missionCycle.length) missionIndex = 0;
  if (missionIndex < 0) missionIndex = missionCycle.length - 1;
  return missionCycle[missionIndex];
}

function renderMissionSpotlight() {
  const active = getActiveMission();

  if (!active) {
    missionTitleEl.textContent = "No missions yet";
    missionDescriptionEl.textContent = "Complete a run to unlock your first challenge.";
    missionCadenceEl.textContent = "Locked";
    missionProgressFill.style.width = "0%";
    missionProgressTextEl.textContent = "0/0";
    missionRewardEl.textContent = "Rewards paused";
    missionStepperEl.textContent = "0/0";
    if (btnMissionAction) {
      btnMissionAction.textContent = "Stay tuned";
      btnMissionAction.disabled = true;
    }
    return;
  }

  const { mission, cadence } = active;
  const progressPct = Math.min(100, (mission.progress / mission.goal) * 100);
  const isComplete = mission.progress >= mission.goal;

  missionTitleEl.textContent = mission.name;
  missionDescriptionEl.textContent = mission.description;
  missionCadenceEl.textContent = `${cadence === "daily" ? "Daily" : "Weekly"} mission`;
  missionRewardEl.textContent = `+${mission.reward} coins`;
  missionProgressFill.style.width = `${progressPct}%`;
  missionProgressTextEl.textContent = `${mission.progress}/${mission.goal} · ${Math.round(progressPct)}%`;
  missionStepperEl.textContent = `${missionIndex + 1}/${missionCycle.length}`;

  if (btnMissionAction) {
    btnMissionAction.disabled = false;
    btnMissionAction.classList.toggle("btn--ghost", !isComplete && !mission.claimed);
    btnMissionAction.classList.toggle("btn--primary", isComplete && !mission.claimed);
    btnMissionAction.onclick = null;
    if (mission.claimed) {
      btnMissionAction.textContent = "Reward collected";
      btnMissionAction.disabled = true;
    } else if (isComplete) {
      btnMissionAction.textContent = "Collect reward";
      btnMissionAction.onclick = () => {
        const rewardCoins = claimMissionReward(playerData, cadence, mission.id);
        if (rewardCoins > 0) {
          savePlayerData(playerData);
          updateCoinsHeader();
          renderMissions();
        }
      };
    } else {
      btnMissionAction.textContent = "Track mission";
      btnMissionAction.onclick = null;
      btnMissionAction.disabled = true;
    }
  }
}

function renderMissions() {
  if (!playerData.missions) return;
  missionCycle = [
    ...(playerData.missions.daily?.missions || []).map((mission) => ({
      cadence: "daily",
      mission
    })),
    ...(playerData.missions.weekly?.missions || []).map((mission) => ({
      cadence: "weekly",
      mission
    }))
  ];

  missionIndex = Math.min(missionIndex, Math.max(0, missionCycle.length - 1));
  renderMissionSpotlight();
}

function startRun() {
  if (!ensureProfileSetup("Customize your striker before the first run.")) return;
  setActiveScreen(null); // close menus
  pauseBanner.classList.add("hidden");
  resetContinueState();
  game.startRun();
  updateTouchControlsVisibility();
}

function togglePause() {
  if (!game) return;
  const state = game.getRunState();
  if (state === "running") {
    game.pause();
    pauseBanner.classList.remove("hidden");
  } else if (state === "paused") {
    game.resume();
    pauseBanner.classList.add("hidden");
  }
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
    pauseBanner.classList.remove("hidden");
  } else {
    pauseBanner.classList.add("hidden");
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
      startRun();
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

btnPlay.addEventListener("click", () => {
  startRun();
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
    });
  });

btnTeam.addEventListener("click", () => {
  renderTeamScreen();
  setActiveScreen("teamScreen");
});

btnSettings.addEventListener("click", () => {
  setActiveScreen("settingsScreen");
});

btnPrevMission?.addEventListener("click", () => {
  if (!missionCycle.length) return;
  missionIndex = (missionIndex - 1 + missionCycle.length) % missionCycle.length;
  renderMissionSpotlight();
});

btnNextMission?.addEventListener("click", () => {
  if (!missionCycle.length) return;
  missionIndex = (missionIndex + 1) % missionCycle.length;
  renderMissionSpotlight();
});

btnPause.addEventListener("click", () => {
  togglePause();
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
      if (action) handleInputAction({ type: action });
    },
    { passive: false }
  );
});

// Login / save UI
function updateProfileUI(message) {
  const profile = playerData.profile || {};
  if (loginEmailInput) loginEmailInput.value = profile.email || "";
  if (loginNameInput) loginNameInput.value = profile.displayName || "";

  const statusLabel = profile.displayName
    ? `Signed in as ${profile.displayName}`
    : "Not logged in";
  if (authStatus) authStatus.textContent = statusLabel;

  const saveLabel = profile.lastAutoSave
    ? `Auto-saved after last match on ${new Date(profile.lastAutoSave).toLocaleString()}`
    : profile.lastManualSave
      ? `Last saved ${new Date(profile.lastManualSave).toLocaleString()}`
      : "Progress auto-saves locally on this device.";
  if (saveStatus) saveStatus.textContent = message || saveLabel;
}

btnLogin?.addEventListener("click", () => {
  const email = loginEmailInput?.value.trim();
  const displayName = loginNameInput?.value.trim();

  if (!email || !displayName) {
    alert("Enter a display name and email to log in.");
    return;
  }

  playerData.profile = {
    ...playerData.profile,
    email,
    displayName
  };
  savePlayerData(playerData);
  updateProfileUI("Profile updated and saved.");
});

btnSaveProgress?.addEventListener("click", () => {
  playerData.profile = {
    ...playerData.profile,
    lastManualSave: new Date().toISOString()
  };
  savePlayerData(playerData);
  updateProfileUI("Progress saved to this device.");
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
renderTeamScreen();
renderMissions();
setActiveScreen("mainMenu");
updateProfileUI();
updateTouchControlsVisibility();
updateBuilderPreview();

if (!playerData.profile?.builderCompleted) {
  openPlayerBuilder("Pick your kit colors to start your career.");
}

input = new InputManager(canvas, handleInputAction);
input.attach();

requestAnimationFrame(loop);
