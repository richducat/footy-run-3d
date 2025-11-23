// js/main.js

import { Game } from "./game.js";
import {
  PLAYER_CARDS,
  loadPlayerData,
  savePlayerData,
  getCardById,
  unlockCard,
  selectCard
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

  game = new Game(canvas, {
    playerCard: selectedCard,
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
    meta.textContent = `Speed x${card.speedMultiplier.toFixed(
      2
    )} · Coins x${card.coinMultiplier.toFixed(
      2
    )} · Shot x${card.shotGainMultiplier.toFixed(2)}`;
    const tagline = document.createElement("div");
    tagline.className = "player-card__tagline";
    tagline.textContent = card.tagline;
    info.appendChild(name);
    info.appendChild(meta);
    info.appendChild(tagline);

    const actions = document.createElement("div");
    actions.className = "player-card__actions";

    if (!isUnlocked) {
      const unlockBtn = document.createElement("button");
      unlockBtn.className = "btn btn--small btn--primary";
      unlockBtn.textContent = `Unlock – ${card.unlockCost} coins`;
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
    }

    el.appendChild(badge);
    el.appendChild(info);
    el.appendChild(actions);

    cardListEl.appendChild(el);
  });
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
  // Merge into persistent data
  playerData.coins += payload.coins;
  playerData.totalGoals += payload.goals;
  if (payload.distance > playerData.bestDistance) {
    playerData.bestDistance = payload.distance;
  }
  savePlayerData(playerData);
  updateCoinsHeader();

  // Update game over screen
  goDistance.textContent = `${payload.distance} m`;
  goGoals.textContent = `${payload.goals}`;
  goCoins.textContent = `${payload.coins}`;
  if (payload.distance >= playerData.bestDistance) {
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
setActiveScreen("mainMenu");

input = new InputManager(canvas, handleInputAction);
input.attach();

requestAnimationFrame(loop);
