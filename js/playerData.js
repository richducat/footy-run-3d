// js/playerData.js

export const PLAYER_CARDS = [
  {
    id: "street_striker",
    name: "Street Striker",
    rating: 72,
    position: "ST",
    tagline: "Balanced finisher built for tight lanes.",
    speedMultiplier: 1.0,
    coinMultiplier: 1.0,
    shotGainMultiplier: 1.0,
    unlockCost: 0
  },
  {
    id: "pace_merchant",
    name: "Pace Merchant",
    rating: 80,
    position: "ST",
    tagline: "+Speed, less control. For aggressive players.",
    speedMultiplier: 1.12,
    coinMultiplier: 1.0,
    shotGainMultiplier: 0.95,
    unlockCost: 300
  },
  {
    id: "clinical_finisher",
    name: "Clinical Finisher",
    rating: 83,
    position: "ST",
    tagline: "Shot meter builds faster. More goals per run.",
    speedMultiplier: 1.02,
    coinMultiplier: 1.0,
    shotGainMultiplier: 1.3,
    unlockCost: 500
  },
  {
    id: "crowd_favorite",
    name: "Crowd Favorite",
    rating: 85,
    position: "CF",
    tagline: "Earn more coins from every pickup.",
    speedMultiplier: 1.05,
    coinMultiplier: 1.4,
    shotGainMultiplier: 1.0,
    unlockCost: 900
  }
];

const STORAGE_KEY = "usr_player_data_v1";

function defaultData() {
  return {
    coins: 0,
    bestDistance: 0,
    totalGoals: 0,
    unlockedCards: ["street_striker"],
    selectedCardId: "street_striker"
  };
}

export function loadPlayerData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    return {
      ...defaultData(),
      ...parsed
    };
  } catch (e) {
    console.warn("Failed to load player data, using defaults.", e);
    return defaultData();
  }
}

export function savePlayerData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save player data.", e);
  }
}

export function getCardById(id) {
  return PLAYER_CARDS.find((card) => card.id === id) || null;
}

export function unlockCard(data, card) {
  if (data.unlockedCards.includes(card.id)) return false;
  if (data.coins < card.unlockCost) return false;
  data.coins -= card.unlockCost;
  data.unlockedCards.push(card.id);
  return true;
}

export function selectCard(data, card) {
  if (!data.unlockedCards.includes(card.id)) return false;
  data.selectedCardId = card.id;
  return true;
}
