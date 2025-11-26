// js/playerData.js

export const PLAYER_CARDS = [
  {
    id: "street_striker",
    name: "Street Striker",
    rarity: "common",
    rating: 72,
    position: "ST",
    tagline: "Clean slide tackles and steady control in traffic.",
    speedMultiplier: 1.03,
    coinMultiplier: 1.02,
    shotGainMultiplier: 1.02,
    perks: {
      tackleDefenseBonus: { base: 1.25, perLevel: 0.08, mode: "mult" },
      jukeDistance: { base: 1.08, perLevel: 0.04, mode: "mult" }
    },
    unlockCost: 0
  },
  {
    id: "pace_merchant",
    name: "Pace Merchant",
    rarity: "rare",
    rating: 80,
    position: "ST",
    tagline: "+Speed and tighter jukes, but lighter shot gain.",
    speedMultiplier: 1.18,
    coinMultiplier: 0.96,
    shotGainMultiplier: 0.94,
    perks: {
      laneChangeSpeed: { base: 1.25, perLevel: 0.12, mode: "mult" },
      jukeDistance: { base: 1.18, perLevel: 0.08, mode: "mult" }
    },
    unlockCost: 300
  },
  {
    id: "clinical_finisher",
    name: "Clinical Finisher",
    rarity: "epic",
    rating: 83,
    position: "ST",
    tagline: "Shot meter surges and keepers freeze more often.",
    speedMultiplier: 1.06,
    coinMultiplier: 0.98,
    shotGainMultiplier: 1.42,
    perks: {
      goalieFreezeChance: { base: 0.18, perLevel: 0.06, mode: "add" },
      tackleDefenseBonus: { base: 1.12, perLevel: 0.05, mode: "mult" }
    },
    unlockCost: 500
  },
  {
    id: "crowd_favorite",
    name: "Crowd Favorite",
    rarity: "legendary",
    rating: 85,
    position: "CF",
    tagline: "Magnetic coin runs that fund every upgrade.",
    speedMultiplier: 1.04,
    coinMultiplier: 1.55,
    shotGainMultiplier: 1.05,
    perks: {
      coinMagnetRange: { base: 1.35, perLevel: 0.12, mode: "mult" },
      laneChangeSpeed: { base: 1.08, perLevel: 0.06, mode: "mult" }
    },
    unlockCost: 900
  },
  {
    id: "midfield_maestro",
    name: "Midfield Maestro",
    rarity: "epic",
    rating: 88,
    position: "CAM",
    tagline: "Glides through traffic while keeping the shot meter humming.",
    speedMultiplier: 1.1,
    coinMultiplier: 1.12,
    shotGainMultiplier: 1.15,
    perks: {
      laneChangeSpeed: { base: 1.15, perLevel: 0.09, mode: "mult" },
      tackleDefenseBonus: { base: 1.18, perLevel: 0.07, mode: "mult" }
    },
    unlockCost: 1100
  },
  {
    id: "neon_icon",
    name: "Neon Icon",
    rarity: "legendary",
    rating: 90,
    position: "ST",
    tagline: "Signature glow pulls coins and freezes keepers in big matches.",
    speedMultiplier: 1.14,
    coinMultiplier: 1.65,
    shotGainMultiplier: 1.25,
    perks: {
      coinMagnetRange: { base: 1.5, perLevel: 0.14, mode: "mult" },
      goalieFreezeChance: { base: 0.24, perLevel: 0.07, mode: "add" }
    },
    unlockCost: 1500
  }
];

const STORAGE_KEY = "usr_player_data_v1";

export const CARD_LEVEL_CAP = 8;

export const RARITY_CONFIG = {
  common: {
    speedBonusPerLevel: 0.06,
    coinBonusPerLevel: 0.04,
    shotBonusPerLevel: 0.05,
    upgradeCosts: {
      2: 200,
      3: 325,
      4: 500,
      5: 750,
      6: 1100,
      7: 1500,
      8: 2000
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
      5: 1050,
      6: 1400,
      7: 1850,
      8: 2350
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
      5: 1400,
      6: 1850,
      7: 2400,
      8: 3000
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
      5: 1900,
      6: 2450,
      7: 3100,
      8: 3800
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
      crowd_favorite: 1,
      midfield_maestro: 1,
      neon_icon: 1
    },
    missions: defaultMissions(),
    recentRunCoins: [],
    profile: {
      displayName: "",
      email: "",
      lastManualSave: null,
      lastAutoSave: null,
      builderCompleted: false,
      guestId: null,
      guestCreatedAt: null,
      isGuest: true,
      kitPrimary: "#1f3a74",
      kitSecondary: "#80223c",
      kitTrim: "#0bd3c7",
      ballAccent: "#f2f4ff"
    }
  };
}

export function loadPlayerData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const defaults = defaultData();
    const data = {
      ...defaults,
      ...parsed,
      profile: {
        ...defaults.profile,
        ...(parsed.profile || {})
      },
      cardLevels: {
        ...defaults.cardLevels,
        ...(parsed.cardLevels || {})
      }
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

const DEFAULT_PERKS = {
  laneChangeSpeed: { base: 1, perLevel: 0, mode: "mult" },
  jukeDistance: { base: 1, perLevel: 0, mode: "mult" },
  tackleDefenseBonus: { base: 1, perLevel: 0, mode: "mult" },
  goalieFreezeChance: { base: 0, perLevel: 0, mode: "add" },
  coinMagnetRange: { base: 1, perLevel: 0, mode: "mult" }
};

function resolvePerkValue(perkDef, level) {
  const { base, perLevel, mode } = perkDef;
  const levelsAboveBase = Math.max(0, level - 1);
  if (mode === "add") {
    return base + perLevel * levelsAboveBase;
  }
  return base * (1 + perLevel * levelsAboveBase);
}

export function getEffectivePerks(card, level = 1) {
  const perks = card.perks || {};
  return Object.keys(DEFAULT_PERKS).reduce((acc, key) => {
    const def = perks[key] || DEFAULT_PERKS[key];
    acc[key] = resolvePerkValue({ ...DEFAULT_PERKS[key], ...def }, level);
    return acc;
  }, {});
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
