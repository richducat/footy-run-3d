// js/playerData.js

export const PLAYER_CARDS = [
  {
    id: "street_striker",
    name: "Street Striker",
    rarity: "common",
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
    rarity: "rare",
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
    rarity: "epic",
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
    rarity: "legendary",
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

export const CARD_LEVEL_CAP = 5;

export const RARITY_CONFIG = {
  common: {
    speedBonusPerLevel: 0.06,
    coinBonusPerLevel: 0.04,
    shotBonusPerLevel: 0.05,
    upgradeCosts: {
      2: 200,
      3: 325,
      4: 500,
      5: 750
    }
  },
  rare: {
    speedBonusPerLevel: 0.08,
    coinBonusPerLevel: 0.03,
    shotBonusPerLevel: 0.05,
    upgradeCosts: {
      2: 325,
      3: 525,
      4: 775,
      5: 1050
    }
  },
  epic: {
    speedBonusPerLevel: 0.05,
    coinBonusPerLevel: 0.03,
    shotBonusPerLevel: 0.08,
    upgradeCosts: {
      2: 475,
      3: 725,
      4: 1000,
      5: 1400
    }
  },
  legendary: {
    speedBonusPerLevel: 0.06,
    coinBonusPerLevel: 0.08,
    shotBonusPerLevel: 0.05,
    upgradeCosts: {
      2: 650,
      3: 975,
      4: 1350,
      5: 1900
    }
  }
};

const DAILY_MISSIONS = [
  {
    id: "daily_runs",
    name: "Kickoff Runs",
    description: "Complete 3 runs.",
    metric: "runs",
    goal: 3,
    reward: 75
  },
  {
    id: "daily_goals",
    name: "Sharpshooter",
    description: "Score 5 goals (total across runs).",
    metric: "goals",
    goal: 5,
    reward: 75
  },
  {
    id: "daily_distance",
    name: "Marathon Legs",
    description: "Reach 1,500m total distance in a day.",
    metric: "distance",
    goal: 1500,
    reward: 100
  }
];

const WEEKLY_MISSIONS = [
  {
    id: "weekly_distance",
    name: "Endless Engine",
    description: "Run 10,000m total.",
    metric: "distance",
    goal: 10000,
    reward: 250
  },
  {
    id: "weekly_goals",
    name: "Net Shredder",
    description: "Score 40 goals.",
    metric: "goals",
    goal: 40,
    reward: 250
  },
  {
    id: "weekly_coins",
    name: "Treasure Hunter",
    description: "Collect 300 coins in runs.",
    metric: "coins",
    goal: 300,
    reward: 300
  }
];

function getDayKey(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function getWeekKey(date = new Date()) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function missionStateFromDefs(defs) {
  return defs.map((mission) => ({
    ...mission,
    progress: 0,
    claimed: false
  }));
}

function defaultMissions(now = new Date()) {
  return {
    daily: {
      key: getDayKey(now),
      missions: missionStateFromDefs(DAILY_MISSIONS)
    },
    weekly: {
      key: getWeekKey(now),
      missions: missionStateFromDefs(WEEKLY_MISSIONS)
    }
  };
}

function defaultData() {
  return {
    coins: 0,
    bestDistance: 0,
    totalGoals: 0,
    unlockedCards: ["street_striker"],
    selectedCardId: "street_striker",
    cardLevels: {
      street_striker: 1,
      pace_merchant: 1,
      clinical_finisher: 1,
      crowd_favorite: 1
    },
    missions: defaultMissions(),
    recentRunCoins: [],
    profile: {
      displayName: "",
      email: "",
      lastManualSave: null,
      lastAutoSave: null
    }
  };
}

export function loadPlayerData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const data = {
      ...defaultData(),
      ...parsed
    };
    refreshMissions(data);
    return data;
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

export function getCardLevel(data, cardId) {
  if (!data.cardLevels) return 1;
  return data.cardLevels[cardId] || 1;
}

export function getUpgradeCost(card, currentLevel) {
  const rarityCfg = RARITY_CONFIG[card.rarity];
  if (!rarityCfg) return null;
  const targetLevel = currentLevel + 1;
  return rarityCfg.upgradeCosts[targetLevel] || null;
}

export function getEffectiveMultipliers(card, level = 1) {
  const rarityCfg = RARITY_CONFIG[card.rarity] || RARITY_CONFIG.common;
  const levelsAboveBase = Math.max(0, level - 1);

  const speed =
    card.speedMultiplier *
    Math.pow(1 + rarityCfg.speedBonusPerLevel, levelsAboveBase);
  const coins =
    card.coinMultiplier *
    Math.pow(1 + rarityCfg.coinBonusPerLevel, levelsAboveBase);
  const shotGain =
    card.shotGainMultiplier *
    Math.pow(1 + rarityCfg.shotBonusPerLevel, levelsAboveBase);

  return {
    speed,
    coins,
    shotGain
  };
}

export function getLevelTuning(card, level = 1) {
  const rarityCfg = RARITY_CONFIG[card.rarity] || RARITY_CONFIG.common;
  const levelsAboveBase = Math.max(0, level - 1);

  return {
    sprintSpeed: 1 + rarityCfg.speedBonusPerLevel * 0.8 * levelsAboveBase,
    shotGainRate: 1 + rarityCfg.shotBonusPerLevel * 1.2 * levelsAboveBase,
    tackleDuration: Math.max(0.38, 0.55 - 0.035 * levelsAboveBase),
    jukeDuration: Math.max(0.32, 0.42 - 0.02 * levelsAboveBase),
    jukeCooldown: Math.max(0.5, 1 - 0.12 * levelsAboveBase),
    reviveInvulnDuration: 0.9 + 0.12 * levelsAboveBase
  };
}

export function unlockCard(data, card) {
  if (data.unlockedCards.includes(card.id)) return false;
  if (data.coins < card.unlockCost) return false;
  data.coins -= card.unlockCost;
  data.unlockedCards.push(card.id);
  return true;
}

export function upgradeCard(data, card) {
  const currentLevel = getCardLevel(data, card.id);
  if (currentLevel >= CARD_LEVEL_CAP) return { success: false, reason: "max" };

  const cost = getUpgradeCost(card, currentLevel);
  if (cost == null || data.coins < cost) {
    return { success: false, reason: "coins", cost };
  }

  data.coins -= cost;
  data.cardLevels[card.id] = currentLevel + 1;
  return { success: true, newLevel: currentLevel + 1, cost };
}

export function selectCard(data, card) {
  if (!data.unlockedCards.includes(card.id)) return false;
  data.selectedCardId = card.id;
  return true;
}

function addProgress(mission, amount) {
  mission.progress = Math.min(mission.goal, mission.progress + amount);
}

export function refreshMissions(data, now = new Date()) {
  if (!data.missions) {
    data.missions = defaultMissions(now);
    return;
  }

  const currentDay = getDayKey(now);
  if (data.missions.daily?.key !== currentDay) {
    data.missions.daily = {
      key: currentDay,
      missions: missionStateFromDefs(DAILY_MISSIONS)
    };
  }

  const currentWeek = getWeekKey(now);
  if (data.missions.weekly?.key !== currentWeek) {
    data.missions.weekly = {
      key: currentWeek,
      missions: missionStateFromDefs(WEEKLY_MISSIONS)
    };
  }
}

export function updateMissionsAfterRun(data, runStats) {
  refreshMissions(data);

  const increments = {
    runs: 1,
    goals: runStats.goals || 0,
    distance: runStats.distance || 0,
    coins: runStats.coins || 0
  };

  ["daily", "weekly"].forEach((cadence) => {
    const bucket = data.missions[cadence];
    if (!bucket?.missions) return;

    bucket.missions.forEach((mission) => {
      addProgress(mission, increments[mission.metric] || 0);
    });
  });
}

export function claimMissionReward(data, cadence, missionId) {
  refreshMissions(data);

  const bucket = data.missions[cadence];
  if (!bucket?.missions) return 0;
  const mission = bucket.missions.find((m) => m.id === missionId);
  if (!mission || mission.claimed || mission.progress < mission.goal) return 0;

  mission.claimed = true;
  data.coins += mission.reward;
  return mission.reward;
}

export function estimateRunsForCost(data, cost) {
  const history = Array.isArray(data.recentRunCoins) ? data.recentRunCoins : [];
  const average =
    history.length > 0
      ? history.reduce((sum, val) => sum + val, 0) / history.length
      : 70;
  return Math.max(1, Math.ceil(cost / average));
}
