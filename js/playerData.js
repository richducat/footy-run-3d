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

const DAILY_MISSION_POOL = [
  {
    id: "daily_warmup_runs",
    name: "Warmup Jog",
    description: "Finish 2 quick runs to loosen up.",
    metric: "runs",
    goal: 2,
    reward: 50,
    difficulty: "easy"
  },
  {
    id: "daily_coin_lane",
    name: "Lane Collector",
    description: "Grab 120 coins from the lanes.",
    metric: "coins",
    goal: 120,
    reward: 60,
    difficulty: "easy"
  },
  {
    id: "daily_goal_burst",
    name: "Goal Burst",
    description: "Score 6 goals across any runs.",
    metric: "goals",
    goal: 6,
    reward: 90,
    difficulty: "medium"
  },
  {
    id: "daily_meter_push",
    name: "Sprint Session",
    description: "Reach 1,800m combined distance today.",
    metric: "distance",
    goal: 1800,
    reward: 110,
    difficulty: "medium"
  },
  {
    id: "daily_hat_trick",
    name: "Hat Trick Hero",
    description: "Score 9 goals before reset.",
    metric: "goals",
    goal: 9,
    reward: 140,
    difficulty: "hard"
  },
  {
    id: "daily_marathon",
    name: "Distance Grinder",
    description: "Cover 2,400m total in a day.",
    metric: "distance",
    goal: 2400,
    reward: 150,
    difficulty: "hard"
  }
];

const WEEKLY_MISSIONS = [
  {
    id: "weekly_distance",
    name: "Endless Engine",
    description: "Run 12,500m total this week.",
    metric: "distance",
    goal: 12500,
    reward: 275
  },
  {
    id: "weekly_goals",
    name: "Net Shredder",
    description: "Score 45 goals.",
    metric: "goals",
    goal: 45,
    reward: 280
  },
  {
    id: "weekly_coins",
    name: "Treasure Hunter",
    description: "Collect 350 coins in runs.",
    metric: "coins",
    goal: 350,
    reward: 320
  },
  {
    id: "weekly_runs",
    name: "Club Captain",
    description: "Finish 18 runs.",
    metric: "runs",
    goal: 18,
    reward: 240
  }
];

const JOURNEY_MISSIONS = [
  {
    id: "journey_matches",
    name: "Season Grind",
    description: "Play 10 matches across any days.",
    metric: "runs",
    goal: 10,
    reward: 250
  },
  {
    id: "journey_goals",
    name: "Golden Boot Pace",
    description: "Score 20 goals over multiple sessions.",
    metric: "goals",
    goal: 20,
    reward: 320
  },
  {
    id: "journey_coin_bank",
    name: "Transfer Kitty",
    description: "Bank 1,000 coins to fund upgrades.",
    metric: "coins",
    goal: 1000,
    reward: 360
  }
];

function pickMissionByDifficulty(pool, difficulty, seed = 0) {
  const candidates = pool.filter((mission) => mission.difficulty === difficulty);
  const list = candidates.length > 0 ? candidates : pool;
  const index = list.length > 0 ? seed % list.length : 0;
  return list[index];
}

function pickDailyMissions(now = new Date()) {
  const seed = now.getUTCFullYear() + now.getUTCMonth() + now.getUTCDate();
  return [
    pickMissionByDifficulty(DAILY_MISSION_POOL, "easy", seed),
    pickMissionByDifficulty(DAILY_MISSION_POOL, "medium", seed + 1),
    pickMissionByDifficulty(DAILY_MISSION_POOL, "hard", seed + 2)
  ];
}

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

export function defaultNotificationPrefs() {
  return {
    enabled: true,
    leagueReminders: true,
    trainingStreaks: true,
    eventAlerts: true,
    preferredWindow: "evening",
    maxPerDay: 2
  };
}

function defaultGoalProgress() {
  return {
    session: {
      leftFootGoals: 0,
      drillAccuracy: 0,
      sprintFinishes: 0
    },
    mid: {
      promotion: 0.2,
      trainingPlan: 0,
      weeklyForm: 0
    },
    long: {
      stadiums: 1,
      collections: 1,
      skillPoints: 0,
      specialMoves: 0
    }
  };
}

function defaultSkillTree() {
  return {
    path: "finisher",
    pointsEarned: 0,
    pointsSpent: 0
  };
}

function defaultUnlocks() {
  return {
    stadiumsUnlocked: 1,
    teamsUnlocked: 1,
    drillsUnlocked: 1
  };
}

function defaultMissions(now = new Date()) {
  return {
    daily: {
      key: getDayKey(now),
      missions: missionStateFromDefs(pickDailyMissions(now))
    },
    weekly: {
      key: getWeekKey(now),
      missions: missionStateFromDefs(WEEKLY_MISSIONS)
    },
    journey: {
      key: "journey",
      missions: missionStateFromDefs(JOURNEY_MISSIONS)
    }
  };
}

function defaultData() {
  return {
    coins: 0,
    devTokensUnlocked: false,
    xp: 0,
    level: 1,
    streak: {
      days: 0,
      lastLogin: null,
      shield: 1
    },
    insights: {
      totalRuns: 0,
      totalSessions: 0,
      lastSessionAt: null,
      lastRunAt: null,
      recentSessionLengths: []
    },
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
    goalProgress: defaultGoalProgress(),
    skillTree: defaultSkillTree(),
    unlocks: defaultUnlocks(),
    onboarding: defaultOnboarding(),
    notificationPrefs: defaultNotificationPrefs(),
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
      onboarding: {
        ...defaultOnboarding(),
        ...(parsed.onboarding || {}),
        tutorialSteps: {
          ...defaultOnboarding().tutorialSteps,
          ...(parsed.onboarding?.tutorialSteps || {})
        }
      },
      profile: {
        ...defaults.profile,
        ...(parsed.profile || {})
      },
      cardLevels: {
        ...defaults.cardLevels,
        ...(parsed.cardLevels || {})
      },
      goalProgress: {
        ...defaults.goalProgress,
        ...(parsed.goalProgress || {})
      },
      skillTree: {
        ...defaults.skillTree,
        ...(parsed.skillTree || {})
      },
      notificationPrefs: {
        ...defaultNotificationPrefs(),
        ...(parsed.notificationPrefs || {})
      },
      unlocks: {
        ...defaults.unlocks,
        ...(parsed.unlocks || {})
      }
    };
    ensureGoalProgress(data);
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

export function defaultOnboarding() {
  return {
    tutorialSteps: {
      move: false,
      pass: false,
      shoot: false,
      upgrade: false
    },
    lossStreak: 0,
    adaptiveAssistActive: false,
    firstRunPlayed: false,
    firstWinAwarded: false,
    lastRunWasBoosted: false
  };
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

function clampProgress(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function ensureGoalProgress(data) {
  if (!data.goalProgress) data.goalProgress = defaultGoalProgress();
  if (!data.skillTree) data.skillTree = defaultSkillTree();
  if (!data.unlocks) data.unlocks = defaultUnlocks();
  return data.goalProgress;
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
      missions: missionStateFromDefs(pickDailyMissions(now))
    };
  }

  const currentWeek = getWeekKey(now);
  if (data.missions.weekly?.key !== currentWeek) {
    data.missions.weekly = {
      key: currentWeek,
      missions: missionStateFromDefs(WEEKLY_MISSIONS)
    };
  }

  if (!data.missions.journey?.missions) {
    data.missions.journey = {
      key: "journey",
      missions: missionStateFromDefs(JOURNEY_MISSIONS)
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

  ["daily", "weekly", "journey"].forEach((cadence) => {
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

export function updateProgressionTracks(data, runStats = {}, meta = {}) {
  ensureGoalProgress(data);

  const session = data.goalProgress.session;
  const mid = data.goalProgress.mid;
  const long = data.goalProgress.long;

  session.leftFootGoals = clampProgress(
    session.leftFootGoals + Math.min(runStats.goals || 0, 3),
    0,
    3
  );
  session.drillAccuracy = clampProgress(
    session.drillAccuracy + Math.floor((runStats.distance || 0) / 450),
    0,
    3
  );
  if ((runStats.distance || 0) >= 600) {
    session.sprintFinishes = clampProgress(session.sprintFinishes + 1, 0, 2);
  }

  const promotionGain = (runStats.distance || 0) / 4500 + (runStats.goals || 0) * 0.05;
  mid.promotion = clampProgress((mid.promotion || 0) + promotionGain, 0, 1);
  if ((runStats.distance || 0) >= 800) {
    mid.trainingPlan = clampProgress((mid.trainingPlan || 0) + 1, 0, 4);
  }
  if (runStats.goals) {
    mid.weeklyForm = clampProgress((mid.weeklyForm || 0) + Math.max(1, Math.round(runStats.goals / 2)), 0, 5);
  }

  const levelBefore = meta.levelBefore ?? data.level ?? 1;
  const levelAfter = meta.levelAfter ?? data.level ?? 1;
  const levelGain = Math.max(0, levelAfter - levelBefore);
  if (levelGain > 0) {
    data.skillTree.pointsEarned = (data.skillTree.pointsEarned || 0) + levelGain;
    long.skillPoints = clampProgress((long.skillPoints || 0) + levelGain, 0, 9);
  }

  long.collections = clampProgress(
    Math.max(long.collections || 0, Math.floor((data.unlockedCards?.length || 1) / 1.5)),
    0,
    5
  );
  long.stadiums = clampProgress(
    Math.max(long.stadiums || 0, Math.ceil((data.level || 1) / 5)),
    0,
    3
  );
  long.specialMoves = clampProgress(
    Math.max(long.specialMoves || 0, Math.floor((data.skillTree.pointsEarned || 0) / 2)),
    0,
    4
  );

  data.unlocks = {
    ...data.unlocks,
    stadiumsUnlocked: Math.max(data.unlocks?.stadiumsUnlocked || 1, long.stadiums || 1),
    drillsUnlocked: Math.max(
      data.unlocks?.drillsUnlocked || 1,
      Math.min(4, 1 + Math.floor(session.drillAccuracy))
    ),
    teamsUnlocked: Math.max(
      data.unlocks?.teamsUnlocked || 1,
      Math.min(4, Math.ceil(((data.totalGoals || 0) + (runStats.goals || 0)) / 15))
    )
  };

  data.goalProgress = { session, mid, long };
  return data.goalProgress;
}

export function estimateRunsForCost(data, cost) {
  const history = Array.isArray(data.recentRunCoins) ? data.recentRunCoins : [];
  const average =
    history.length > 0
      ? history.reduce((sum, val) => sum + val, 0) / history.length
      : 70;
  return Math.max(1, Math.ceil(cost / average));
}

// Lightweight progression + streak helpers to layer meta-game systems without
// touching core gameplay loops.
const XP_BASE = 120;
const XP_GROWTH = 1.25;

export function getLevelForXp(xp = 0) {
  let level = 1;
  let threshold = XP_BASE;
  let xpRemaining = xp;

  while (xpRemaining >= threshold) {
    xpRemaining -= threshold;
    level += 1;
    threshold = Math.round(threshold * XP_GROWTH);
  }

  return level;
}

export function getLevelProgress(data) {
  const xp = data.xp || 0;
  let level = 1;
  let threshold = XP_BASE;
  let spentXp = 0;

  while (spentXp + threshold <= xp) {
    spentXp += threshold;
    level += 1;
    threshold = Math.round(threshold * XP_GROWTH);
  }

  const xpIntoLevel = xp - spentXp;
  const progress = Math.max(0, Math.min(1, xpIntoLevel / threshold));

  return {
    level,
    xp,
    levelStartXp: spentXp,
    levelXpNeeded: threshold,
    xpIntoLevel,
    nextThreshold: threshold,
    progress
  };
}

export function addExperience(data, amount) {
  if (Number.isNaN(amount) || amount <= 0) {
    return { levelBefore: getLevelForXp(data.xp || 0), levelAfter: getLevelForXp(data.xp || 0), gained: 0 };
  }

  const levelBefore = getLevelForXp(data.xp || 0);
  data.xp = Math.max(0, Math.round((data.xp || 0) + amount));
  data.level = getLevelForXp(data.xp);
  const levelAfter = data.level;
  return { levelBefore, levelAfter, gained: amount };
}

export function updateStreak(data, now = new Date()) {
  const todayKey = getDayKey(now);
  const lastLogin = data.streak?.lastLogin;

  const streak = {
    days: data.streak?.days || 0,
    lastLogin,
    shield: data.streak?.shield ?? 1
  };

  if (!lastLogin) {
    streak.days = 1;
  } else {
    const last = new Date(lastLogin);
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      // same day
    } else if (diffDays === 1) {
      streak.days += 1;
    } else {
      if (streak.shield > 0) {
        streak.shield -= 1;
      } else {
        streak.days = 1;
      }
    }
  }

  if (streak.days >= 3 && streak.shield < 1) {
    streak.shield = 1; // replenish grace day after rebuilding momentum
  }

  streak.lastLogin = todayKey;
  data.streak = streak;
  return streak;
}

export function getStreakBonuses(streak = { days: 0, shield: 0 }) {
  const days = streak.days || 0;
  const xpBonus = 1 + Math.min(0.2, days * 0.02);
  const coinBonus = 1 + Math.min(0.15, Math.max(0, days - 1) * 0.01);
  return { xpBonus, coinBonus, shield: streak.shield || 0 };
}

export function logSessionEvent(data, { sessionLengthMs = 0 } = {}) {
  const now = new Date();
  const insights = data.insights || {};
  const updated = {
    ...insights,
    totalRuns: insights.totalRuns || 0,
    totalSessions: (insights.totalSessions || 0) + 1,
    lastSessionAt: now.toISOString(),
    recentSessionLengths: Array.isArray(insights.recentSessionLengths)
      ? [...insights.recentSessionLengths.slice(-4), sessionLengthMs]
      : [sessionLengthMs]
  };

  data.insights = updated;
  return updated;
}

export function logRunEvent(data) {
  const now = new Date();
  const insights = data.insights || {};
  const updated = {
    ...insights,
    totalRuns: (insights.totalRuns || 0) + 1,
    lastRunAt: now.toISOString()
  };

  data.insights = updated;
  return updated;
}

export function markTutorialStep(data, step) {
  if (!step) return false;
  const defaults = defaultOnboarding();
  const onboarding = {
    ...defaults,
    ...(data.onboarding || {}),
    tutorialSteps: {
      ...defaults.tutorialSteps,
      ...(data.onboarding?.tutorialSteps || {})
    }
  };

  if (onboarding.tutorialSteps[step]) return false;
  onboarding.tutorialSteps[step] = true;
  data.onboarding = onboarding;
  return true;
}

export function getOnboardingProgress(data) {
  const defaults = defaultOnboarding();
  const onboarding = {
    ...defaults,
    ...(data.onboarding || {}),
    tutorialSteps: {
      ...defaults.tutorialSteps,
      ...(data.onboarding?.tutorialSteps || {})
    }
  };

  const stepsComplete = Object.values(onboarding.tutorialSteps).filter(Boolean).length;
  const totalSteps = Object.keys(defaults.tutorialSteps).length;

  return {
    ...onboarding,
    stepsComplete,
    totalSteps,
    tutorialComplete: stepsComplete >= totalSteps
  };
}

export function recordRunOutcome(data, { win = false, usedBeginnerBoost = false } = {}) {
  const progress = getOnboardingProgress(data);

  const next = {
    ...progress,
    firstRunPlayed: true,
    lastRunWasBoosted: usedBeginnerBoost
  };

  if (win) {
    next.lossStreak = 0;
    next.adaptiveAssistActive = false;
    next.firstWinAwarded = true;
  } else {
    next.lossStreak = (progress.lossStreak || 0) + 1;
    next.adaptiveAssistActive = next.lossStreak >= 2;
  }

  data.onboarding = {
    ...data.onboarding,
    ...next,
    tutorialSteps: {
      ...progress.tutorialSteps
    }
  };

  return data.onboarding;
}

export function getAssistProfile(data) {
  const progress = getOnboardingProgress(data);
  const adaptiveEase = progress.adaptiveAssistActive;
  const beginnerBias = !progress.firstWinAwarded;

  return {
    speedScale: adaptiveEase ? 0.93 : 1,
    obstacleEase: adaptiveEase ? 1.2 : 1,
    pickupBoost: adaptiveEase ? 1.15 : 1,
    goalieScale: beginnerBias ? 0.85 : adaptiveEase ? 0.92 : 1,
    shotGainBoost: adaptiveEase ? 1.08 : 1
  };
}
