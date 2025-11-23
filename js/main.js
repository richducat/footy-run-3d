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

// Buttons
const btnPlay = document.getElementById("btnPlay");
const btnTeam = document.getElementById("btnTeam");
const btnSettings = document.getElementById("btnSettings");
const btnPause = document.getElementById("btnPause");
const btnReplay = document.getElementById("btnReplay");
const btnGoToTeam = document.getElementById("btnGoToTeam");
const btnGoToMenu = document.getElementById("btnGoToMenu");
const btnResetProgress = document.getElementById("btnResetProgress");

// Team screen
const cardListEl = document.getElementById("cardList");

// Missions
const dailyMissionsEl = document.getElementById("dailyMissions");
const weeklyMissionsEl = document.getElementById("weeklyMissions");

let playerData = loadPlayerData();
updateCoinsHeader();

let game = null;
let input = null;

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
}

function updateCoinsHeader() {
  headerCoinsValue.textContent = playerData.coins.toString();
}

function buildGameInstance() {
  const selectedCard =
    getCardById(playerData.selectedCardId) ||
    PLAYER_CARDS.find((c) => c.id === "street_striker") ||
    PLAYER_CARDS[0];

  const level = getCardLevel(playerData, selectedCard.id);
  const multipliers = getEffectiveMultipliers(selectedCard, level);

  game = new Game(canvas, {
    playerCard: selectedCard,
    multipliers,
    bestDistance: playerData.bestDistance,
    onStats: handleGameStats,
    onState: handleGameState,
    onGoal: handleGameGoal,
    onGameOver: handleGameOver
  });
}

function renderTeamScreen() {
  cardListEl.innerHTML = "";

  PLAYER_CARDS.forEach((card) => {
    const isUnlocked = playerData.unlockedCards.includes(card.id);
    const isSelected = playerData.selectedCardId === card.id;
    const cardLevel = getCardLevel(playerData, card.id);
    const effective = getEffectiveMultipliers(card, cardLevel);
    const nextLevel = Math.min(CARD_LEVEL_CAP, cardLevel + 1);
    const nextEffective = getEffectiveMultipliers(card, nextLevel);

    const el = document.createElement("article");
    el.className = "player-card";
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
          ).toFixed(0)}% Shot`;
    const tagline = document.createElement("div");
    tagline.className = "player-card__tagline";
    tagline.textContent = card.tagline;
    info.appendChild(name);
    info.appendChild(meta);
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
    el.appendChild(info);
    el.appendChild(actions);

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
  if (!playerData.missions) return;
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
}

function startRun() {
  setActiveScreen(null); // close menus
  pauseBanner.classList.add("hidden");
  game.startRun();
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

function handleGameStats(stats) {
  hudDistance.textContent = `${stats.distance} m`;
  hudGoals.textContent = stats.goals.toString();
  hudBest.textContent = `${stats.bestDistance} m`;
  const pct = (stats.shotMeter / 100) * 100;
  shotMeterFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

function handleGameState(state) {
  if (state === "paused") {
    pauseBanner.classList.remove("hidden");
  } else {
    pauseBanner.classList.add("hidden");
  }
}

function handleGameGoal() {
  // Could hook SFX / analytics here
}

function handleGameOver(payload) {
  const previousBest = playerData.bestDistance;
  const distanceBonus = Math.floor(payload.distance / 20);
  const goalBonus = payload.goals * 20;
  const runCoins = payload.coins + distanceBonus + goalBonus;

  // Merge into persistent data
  playerData.coins += runCoins;
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

  savePlayerData(playerData);
  updateCoinsHeader();
  renderMissions();

  // Update game over screen
  goDistance.textContent = `${payload.distance} m`;
  goGoals.textContent = `${payload.goals}`;
  goCoins.textContent = `${runCoins}`;
  goCoinsInRun.textContent = `${payload.coins}`;
  goCoinsDistance.textContent = `${distanceBonus}`;
  goCoinsGoals.textContent = `${goalBonus}`;
  goCoinsTotal.textContent = `${runCoins}`;

  if (payload.distance > previousBest) {
    goBestNote.textContent = "New personal best for this device!";
  } else {
    goBestNote.textContent = `Best distance so far: ${playerData.bestDistance} m`;
  }

  setActiveScreen("gameOverScreen");
}

function handleInputAction(action) {
  // While a menu screen is open
  if (currentScreenId === "mainMenu") {
    if (action === "primary" || action === "jump") {
      startRun();
    } else if (action === "pauseToggle") {
      // ignore
    }
    return;
  }

  if (
    currentScreenId === "teamScreen" ||
    currentScreenId === "settingsScreen" ||
    currentScreenId === "gameOverScreen"
  ) {
    if (action === "pauseToggle") {
      setActiveScreen("mainMenu");
    } else if (
      currentScreenId === "gameOverScreen" &&
      (action === "primary" || action === "jump")
    ) {
      // quick replay
      setActiveScreen(null);
      game.startRun();
    }
    return;
  }

  // In run (no active overlay screen)
  if (!game) return;
  const state = game.getRunState();

  if (action === "pauseToggle") {
    togglePause();
    return;
  }

  if (state !== "running") {
    if (action === "primary" || action === "jump") {
      startRun();
    }
    return;
  }

  if (action === "moveLeft") game.handleMove("left");
  else if (action === "moveRight") game.handleMove("right");
  else if (action === "jump") game.handleMove("jump");
  else if (action === "slide") game.handleMove("slide");
}

// Button wiring

btnPlay.addEventListener("click", () => {
  startRun();
});

btnTeam.addEventListener("click", () => {
  renderTeamScreen();
  setActiveScreen("teamScreen");
});

btnSettings.addEventListener("click", () => {
  setActiveScreen("settingsScreen");
});

btnPause.addEventListener("click", () => {
  togglePause();
});

btnReplay.addEventListener("click", () => {
  setActiveScreen(null);
  game.startRun();
});

btnGoToTeam.addEventListener("click", () => {
  renderTeamScreen();
  setActiveScreen("teamScreen");
});

btnGoToMenu.addEventListener("click", () => {
  setActiveScreen("mainMenu");
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
  const dt = (timestamp - lastTimestamp) / 1000;
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

input = new InputManager(canvas, handleInputAction);
input.attach();

requestAnimationFrame(loop);
