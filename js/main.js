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
  getUpgradeCost,
  addExperience,
  getLevelProgress,
  updateStreak,
  getStreakBonuses,
  logSessionEvent,
  logRunEvent,
  ensureGoalProgress,
  updateProgressionTracks,
  markTutorialStep,
  getOnboardingProgress,
  recordRunOutcome,
  getAssistProfile,
  defaultNotificationPrefs
} from "./playerData.js";
import { InputManager } from "./input.js";

const DEV_CODE = "everett";
const DEV_TOKEN_STASH = 999999;

const SESSION_PRESETS = {
  quick: {
    key: "quick",
    label: "Quick match",
    targetDurationMs: 3 * 60 * 1000,
    speedScalar: 0.98,
    offlineFriendly: false
  },
  offline: {
    key: "offline",
    label: "Offline drill",
    targetDurationMs: 2 * 60 * 1000,
    speedScalar: 0.9,
    offlineFriendly: true
  },
  endless: {
    key: "endless",
    label: "Endless run",
    targetDurationMs: null,
    speedScalar: 1,
    offlineFriendly: false
  }
};
let activeSessionPreset = SESSION_PRESETS.quick;
let commentator = null;
let lastMarketValueResult = null;
let lastDodgedCount = 0;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(1, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function sessionDurationHint(preset) {
  if (!preset?.targetDurationMs) return "No cap";
  const minutes = Math.round(preset.targetDurationMs / 60000);
  return `${minutes}-min cap`;
}

/**
 * Calculates a player's "Transfer Market Value" based on run performance.
 * @param {number} distance - Distance run in meters.
 * @param {number} goals - Goals scored.
 * @param {number} coins - Coins collected.
 * @returns {object} - Contains formatted value string and a rank title.
 */
function calculateMarketValue(distance, goals, coins) {
  const valueRaw = distance * 100 + goals * 5000 + coins * 50;

  const formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  });

  let formattedValue = formatter.format(valueRaw);
  let rank = "Sunday League Amateur";

  if (valueRaw > 100000000) rank = "G.O.A.T Contender";
  else if (valueRaw > 50000000) rank = "World Class Superstar";
  else if (valueRaw > 10000000) rank = "Top 5 League Starter";
  else if (valueRaw > 1000000) rank = "Wonderkid Prospect";
  else if (valueRaw > 100000) rank = "Academy Graduate";

  return {
    value: formattedValue,
    rank,
    raw: valueRaw
  };
}

class CommentarySystem {
  constructor() {
    this.commentaryBox = document.getElementById("commentary-display");
    this.timers = [];
  }

  shout(eventType) {
    const lines = {
      tackle: [
        "Crunching tackle!",
        "Won the ball cleanly!",
        "Solid defense!",
        "No way past him!"
      ],
      goal: ["WHAT A SCREAMER!", "Top bins!", "The keeper had no chance!", "Magisterial finish!"],
      nearMiss: ["Ooh, that was close!", "Living dangerously!", "By the barest of margins!"],
      start: ["The whistle blows!", "And we are underway!", "Can he go all the way?"]
    };

    if (!lines[eventType]) return;
    const text = lines[eventType][Math.floor(Math.random() * lines[eventType].length)];
    this.display(text, eventType === "goal");
  }

  display(text, isHighExcitement) {
    if (!this.commentaryBox) return;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];

    this.commentaryBox.innerText = text;
    this.commentaryBox.style.opacity = "1";
    this.commentaryBox.style.transform = "scale(1.1)";
    this.commentaryBox.style.color = isHighExcitement ? "#ff00de" : "#ffffff";

    const t1 = setTimeout(() => {
      this.commentaryBox.style.opacity = "0";
      this.commentaryBox.style.transform = "scale(1)";
    }, 2000);

    this.timers.push(t1);
  }
}

commentator = new CommentarySystem();

/**
 * Generates a shareable image of the player's stats on a canvas.
 * @param {string} playerName - The user's name.
 * @param {string} marketValue - The value calculated from the run.
 * @param {string} rank - The rank title from the market value calculation.
 */
function generateShareCard(playerName, marketValue, rank) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 600;
  canvas.height = 400;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 60px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(marketValue, canvas.width / 2, 120);

  ctx.fillStyle = "#ffffff";
  ctx.font = "30px sans-serif";
  ctx.fillText(playerName, canvas.width / 2, 180);

  ctx.fillStyle = "#aaa";
  ctx.font = "italic 24px sans-serif";
  ctx.fillText(rank, canvas.width / 2, 220);

  ctx.fillStyle = "#ff0055";
  ctx.fillRect(0, 300, canvas.width, 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("NEW RECORD TRANSFER FEE AGREED!", canvas.width / 2, 360);

  const dataURL = canvas.toDataURL("image/png");

  const imgElement = document.createElement("img");
  imgElement.src = dataURL;
  imgElement.style.border = "2px solid white";

  const container = document.getElementById("share-card-container");
  if (container) {
    container.innerHTML = "";
    container.appendChild(imgElement);
  }

  return dataURL;
}

const canvas = document.getElementById("gameCanvas");
const hudEl = document.getElementById("hud");
const hudDistance = document.getElementById("hudDistance");
const hudGoals = document.getElementById("hudGoals");
const hudBest = document.getElementById("hudBest");
const hudTierName = document.getElementById("hudTierName");
const hudTierNote = document.getElementById("hudTierNote");
const hudSessionLabel = document.getElementById("hudSessionLabel");
const hudSessionTimer = document.getElementById("hudSessionTimer");
const hudV2 = document.getElementById("hudV2");
const hudV2Coins = document.getElementById("hudV2Coins");
const hudV2Score = document.getElementById("hudV2Score");
const hudV2Multiplier = document.getElementById("hudV2Multiplier");
const hudV2Lives = document.getElementById("hudV2Lives");
const hudV3 = document.getElementById("hudV3");
const hudV3Distance = document.getElementById("hudV3Distance");
const hudV3Dodged = document.getElementById("hudV3Dodged");
const hudV3Balls = document.getElementById("hudV3Balls");
const hudV3BallSteals = document.getElementById("hudV3BallSteals");
const hudV3TeamName = document.getElementById("hudV3TeamName");
const hudV3OpponentName = document.getElementById("hudV3OpponentName");
const hudV3TeamScore = document.getElementById("hudV3TeamScore");
const hudV3OpponentScore = document.getElementById("hudV3OpponentScore");
const hudV3HypeFill = document.getElementById("hudV3HypeFill");
const hudV3HypeLabel = document.getElementById("hudV3HypeLabel");
const hudV3SlideTackles = document.getElementById("hudV3SlideTackles");
const hudV3SuperTimer = document.getElementById("hudV3SuperTimer");
const hudV3SuperCard = document.getElementById("hudV3SuperCard");
const hudV3Regulation = document.getElementById("hudV3Regulation");
const btnPauseV2 = document.getElementById("btnPauseV2");
const shotMeterFill = document.getElementById("shotMeterFill");
const pauseBanner = document.getElementById("pauseBanner");
const pauseMenu = document.getElementById("pauseMenu");
const pauseMenuResumeBtn = document.getElementById("btnPauseResume");
const pauseMenuSaveQuitBtn = document.getElementById("btnPauseSaveQuit");
const pauseMenuQuitBtn = document.getElementById("btnPauseQuit");
const headerCoinsValue = document.getElementById("headerCoinsValue");
const loopXpFill = document.getElementById("loopXpFill");
const loopXpLabel = document.getElementById("loopXpLabel");
const levelMeterFill = document.getElementById("levelMeterFill");
const levelMeterLabel = document.getElementById("levelMeterLabel");
const levelNumber = document.getElementById("levelNumber");
const shortGoalsEl = document.getElementById("shortGoals");
const midGoalsEl = document.getElementById("midGoals");
const longGoalsEl = document.getElementById("longGoals");
const unlockProgressEl = document.getElementById("unlockProgress");
const skillPathLabel = document.getElementById("skillPathLabel");
const skillPointLabel = document.getElementById("skillPointLabel");
const skillPathButtons = document.querySelectorAll("[data-skill-path]");
const clubLeaderboardEl = document.getElementById("clubLeaderboard");
const clubStatusEl = document.getElementById("clubStatus");
const globalLeaderboardEl = document.getElementById("globalLeaderboard");
const friendLeaderboardEl = document.getElementById("friendLeaderboard");
const localLeaderboardEl = document.getElementById("localLeaderboard");
const tierLeaderboardEl = document.getElementById("tierLeaderboard");
const coopGoalListEl = document.getElementById("coopGoalList");
const pvpListEl = document.getElementById("pvpList");
const shareListEl = document.getElementById("shareList");
const insightListEl = document.getElementById("insightList");
const notificationListEl = document.getElementById("notificationList");
const streakLabel = document.getElementById("streakLabel");
const streakValue = document.getElementById("streakValue");
const streakNote = document.getElementById("streakNote");
const rewardMeter = document.getElementById("rewardMeter");
const rewardLine = document.getElementById("rewardLine");
const celebrationOverlay = document.getElementById("celebrationOverlay");
const celebrationTitle = document.getElementById("celebrationTitle");
const celebrationCopy = document.getElementById("celebrationCopy");
const celebrationTag = document.getElementById("celebrationTag");
const onboardingHint = document.getElementById("onboardingHint");
const tutorialChecklist = document.getElementById("tutorialChecklist");
const tutorialNextStep = document.getElementById("tutorialNextStep");
const adaptiveNote = document.getElementById("adaptiveNote");
const earlyWinNote = document.getElementById("earlyWinNote");

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
const goSessionSummary = document.getElementById("goSessionSummary");
const goSessionDuration = document.getElementById("goSessionDuration");
const goSessionMode = document.getElementById("goSessionMode");
const btnContinue = document.getElementById("btnContinue");
const continueCostLabel = document.getElementById("continueCostLabel");
const marketValueLabel = document.getElementById("marketValueLabel");
const marketRankLabel = document.getElementById("marketRankLabel");
const marketValueNote = document.getElementById("marketValueNote");
const shareCardContainer = document.getElementById("share-card-container");
const btnShareCard = document.getElementById("btnShareCard");
if (shareCardContainer) shareCardContainer.textContent = "Generate your viral transfer card after a run.";

// Buttons
const btnPlay = document.getElementById("btnPlay");
const btnPlayV2 = document.getElementById("btnPlayV2");
const btnPlayV3 = document.getElementById("btnPlayV3");
const btnTeam = document.getElementById("btnTeam");
const btnSettings = document.getElementById("btnSettings");
const btnMissions = document.getElementById("btnMissions");
const btnDevCode = document.getElementById("btnDevCode");
const btnPause = document.getElementById("btnPause");
const btnReplay = document.getElementById("btnReplay");
const btnQuickSession = document.getElementById("btnQuickSession");
const btnOfflineDrill = document.getElementById("btnOfflineDrill");
const btnEndless = document.getElementById("btnEndless");
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
const btnCloseBuilder = document.getElementById("btnCloseBuilder");
const btnOpenBuilder = document.getElementById("btnOpenBuilder");
const btnShufflePreset = document.getElementById("btnShufflePreset");
const featureJumpButtons = document.querySelectorAll("[data-feature-target], [data-feature-action]");
const notificationSettingsNote = document.getElementById("notificationSettingsNote");
const notificationMasterToggle = document.getElementById("settingNotifyEnable");
const notificationLeagueToggle = document.getElementById("settingNotifyLeague");
const notificationStreakToggle = document.getElementById("settingNotifyStreak");
const notificationEventToggle = document.getElementById("settingNotifyEvent");
const notificationWindowSelect = document.getElementById("settingNotifyWindow");
const notificationDailyCapSelect = document.getElementById("settingNotifyDailyCap");

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
  },
  midfield_maestro: {
    primary: "#5b21b6",
    secondary: "#1b1034",
    trim: "#f59e0b",
    ballAccent: "#fef3c7"
  },
  neon_icon: {
    primary: "#0ea5e9",
    secondary: "#0f172a",
    trim: "#22d3ee",
    ballAccent: "#f472b6"
  }
};

// Missions
const dailyMissionsEl = document.getElementById("dailyMissions");
const weeklyMissionsEl = document.getElementById("weeklyMissions");
const journeyMissionsEl = document.getElementById("journeyMissions");
const missionsPanel = document.getElementById("missionsPanel");
const missionsIcon = document.getElementById("missionsIcon");
const dailyChallengeNote = document.getElementById("dailyChallengeNote");
const journeyNote = document.getElementById("journeyNote");
const dailySet = document.getElementById("dailySet");
const weeklySet = document.getElementById("weeklySet");
const eventTicker = document.getElementById("eventTicker");
const eventNote = document.getElementById("eventNote");
const eventStatus = document.getElementById("eventStatus");
const weekendEventTitle = document.getElementById("weekendEventTitle");
const weekendEventCopy = document.getElementById("weekendEventCopy");
const seasonalEventTitle = document.getElementById("seasonalEventTitle");
const seasonalEventCopy = document.getElementById("seasonalEventCopy");
const eventCosmeticTitle = document.getElementById("eventCosmeticTitle");
const eventCosmeticCopy = document.getElementById("eventCosmeticCopy");

const activePressables = new Set();

const SKILL_PATH_LABELS = {
  finisher: "Finisher",
  playmaker: "Playmaker",
  wall: "Defensive Wall"
};

function buildGoalBuckets() {
  ensureGoalProgress(playerData);
  const goals = playerData.goalProgress;
  const skillPathName = SKILL_PATH_LABELS[playerData.skillTree?.path] || "Finisher";

  const shortGoals = [
    {
      id: "left_foot",
      label: "Score 3 goals with your left foot",
      detail: "Lean on finesse or curved shots this session.",
      progress: goals.session.leftFootGoals,
      target: 3,
      tag: "Session"
    },
    {
      id: "drill_accuracy",
      label: "Complete 3 passing drills at 90%+ accuracy",
      detail: "Each 450m sprint counts as a drill.",
      progress: goals.session.drillAccuracy,
      target: 3,
      tag: "Session"
    },
    {
      id: "quick_win",
      label: "Finish 2 sprint runs without a tackle",
      detail: "Complete quick 600m runs cleanly to bank XP.",
      progress: goals.session.sprintFinishes,
      target: 2,
      tag: "Session"
    }
  ];

  const midGoals = [
    {
      id: "division_promo",
      label: "Win promotion to Division 3",
      detail: "Keep distance and goals climbing each week.",
      progress: goals.mid.promotion,
      target: 1,
      tag: "Weekly / Season"
    },
    {
      id: "weekly_training",
      label: "Complete your weekly training plan",
      detail: "4 focused runs above 800m to finish the plan.",
      progress: goals.mid.trainingPlan,
      target: 4,
      tag: "Weekly"
    },
    {
      id: "weekly_form",
      label: "Stack 5 form points",
      detail: "Multi-goal runs raise your form meter for the club.",
      progress: goals.mid.weeklyForm,
      target: 5,
      tag: "Weekly"
    }
  ];

  const longGoals = [
    {
      id: "stadiums",
      label: "Unlock new stadiums, teams, and drills",
      detail: "Levels open up fresh arenas and practice modes.",
      progress: goals.long.stadiums,
      target: 3,
      tag: "Long-term"
    },
    {
      id: "collections",
      label: "Complete kit, boot, and badge collections",
      detail: "Unlock cards and cosmetics to fill each set.",
      progress: goals.long.collections,
      target: 5,
      tag: "Collections"
    },
    {
      id: "skill_tree",
      label: `Invest 9 points in the ${skillPathName} tree`,
      detail: "Level ups award points you can spend across the tree.",
      progress: goals.long.skillPoints,
      target: 9,
      tag: skillPathName
    },
    {
      id: "special_moves",
      label: "Unlock 4 special moves",
      detail: "Skill path milestones award unique finishers.",
      progress: goals.long.specialMoves,
      target: 4,
      tag: "Special"
    }
  ];

  const unlockRows = [
    {
      id: "mode_unlocks",
      label: "Player level unlocks modes and drills",
      detail: `Level ${Math.min(5, playerData.level + 1)} unlock preview`,
      progress: Math.min(1, (playerData.level - 1) / 4),
      target: 1,
      tag: "Level"
    },
    {
      id: "stadium_unlocks",
      label: "Stadium progression",
      detail: `${playerData.unlocks?.stadiumsUnlocked || 1} / 3 arenas opened`,
      progress: (playerData.unlocks?.stadiumsUnlocked || 1) / 3,
      target: 1,
      tag: "Arena"
    },
    {
      id: "drill_unlocks",
      label: "Training facility upgrades",
      detail: `${playerData.unlocks?.drillsUnlocked || 1} / 4 drills available`,
      progress: (playerData.unlocks?.drillsUnlocked || 1) / 4,
      target: 1,
      tag: "Upgrade"
    },
    {
      id: "team_unlocks",
      label: "Team & coach boosts",
      detail: `${playerData.unlocks?.teamsUnlocked || 1} / 4 squads activated`,
      progress: (playerData.unlocks?.teamsUnlocked || 1) / 4,
      target: 1,
      tag: "Club"
    }
  ];

  return { shortGoals, midGoals, longGoals, unlockRows };
}

const CLUB_PROFILE = {
  name: "Neon Strikers",
  league: "Gold League",
  contribution: 320,
  weeklyNote: "Bonus chest unlocks in 3d",
  squadNote: "Training sprints raise your club meter."
};

const CLUB_LEADERBOARD = [
  { name: "Neon Strikers", points: 1240, members: 18, momentum: "+120 today", tier: "Gold", isPlayerClub: true },
  { name: "Volley Crew", points: 1180, members: 16, momentum: "+90 today", tier: "Silver" },
  { name: "Pixel Ultras", points: 1025, members: 19, momentum: "+70 today", tier: "Silver" },
  { name: "Touchline Tribe", points: 940, members: 15, momentum: "+60 today", tier: "Bronze" }
];

const GLOBAL_LEADERBOARD = [
  { name: "Kai", score: "2,440m", note: "Kickoff Circuit" },
  { name: "Nova", score: "2,120m", note: "Elite ghost runner" },
  { name: "You", score: "1,980m", note: "Gold tier" },
  { name: "Rami", score: "1,940m", note: "Weekend Cup" }
];

const FRIEND_LEADERBOARD = [
  { name: "You", score: "1,980m", note: "+2 wins vs. crew" },
  { name: "Sasha", score: "1,550m", note: "Ghost replay available" },
  { name: "Leo", score: "1,320m", note: "Training streak" },
  { name: "Mina", score: "1,080m", note: "Co-op assist boost" }
];

const LOCAL_LEADERBOARD = [
  { name: "Borough Ballers", score: "1,760m", note: "Local region" },
  { name: "Harbor Runners", score: "1,640m", note: "+85 today" },
  { name: "Skyline FC", score: "1,430m", note: "Night session" },
  { name: "Streetlights 5", score: "1,280m", note: "Drill specialists" }
];

const TIER_LEADERBOARD = [
  { name: "Gold League", score: "1,200 - 2,200 pts", note: "Top flight · live promotion", tag: "You: Rank 14" },
  { name: "Silver League", score: "650 - 1,199 pts", note: "Balanced pace · friend races" },
  { name: "Bronze League", score: "0 - 649 pts", note: "Onboarding bracket · no whales" }
];

const COOP_GOALS = [
  {
    name: "Score 1,000 goals this week",
    description: "As a club, fill the net to trigger the mega chest.",
    progress: 620,
    target: 1000,
    reward: "Epic club chest",
    contributors: 18
  },
  {
    name: "Complete 45 training drills",
    description: "Short sessions still move the club meter forward.",
    progress: 28,
    target: 45,
    reward: "Skill point bundle",
    contributors: 12
  },
  {
    name: "Log 200 assists with friends",
    description: "Pass to your crew to keep the friend feed buzzing.",
    progress: 154,
    target: 200,
    reward: "Friend feed spotlight",
    contributors: 21
  }
];

const PVP_QUEUES = [
  { name: "Live Arena", score: "Avg queue 0:22", note: "Real-time head-to-head with mirrored kits" },
  { name: "Ghost Clash", score: "Beat Sasha's 1,550m", note: "Async replays with fair matchmaking" },
  { name: "Penalty Duels", score: "Best streak: 7", note: "Quick-fire PK battles for coins" }
];

const SHAREABLE_MOMENTS = [
  { name: "Auto clips", score: "Goal lasers & nutmegs", note: "One tap to drop in chat or socials" },
  { name: "Squad stories", score: "Weekly recap reel", note: "Top goals, fails, and MVP drills" },
  { name: "Hype stickers", score: "Rally emotes", note: "Ping your club when you're on streak" }
];

const RESPECTFUL_NOTIFICATIONS = [
  {
    title: "League ending soon",
    copy: "Your weekly league ends in 3 hours—one more match could promote you.",
    time: "Today · 7:00 PM",
    type: "reminder"
  },
  {
    title: "Training streak",
    copy: "You’re 1 training away from completing your streak.",
    time: "Today · 5:00 PM",
    type: "streak"
  },
  {
    title: "New event",
    copy: "New event: World Cup Penalty Shootout is live.",
    time: "3d ago",
    type: "event"
  }
];

const SEASONAL_EVENTS = [
  {
    name: "Champions League Nights",
    months: [2, 3, 4],
    window: "Spring",
    copy: "Evening fixtures with extra keeper freezes.",
    cosmetic: "Champions Glow Kit",
    cosmeticCopy: "Unlock neon-trim boots for scoring 5 goals in a run."
  },
  {
    name: "World Cup Fan Fest",
    months: [5, 6],
    window: "Summer",
    copy: "Flag-themed drills and national anthems.",
    cosmetic: "Flag Wave Boots",
    cosmeticCopy: "Score 3 matches during the fest to earn animated laces."
  },
  {
    name: "Holiday Frostbite",
    months: [11, 0],
    window: "Winter",
    copy: "Snowball obstacles and frosted pitches.",
    cosmetic: "Frosted Ball Trail",
    cosmeticCopy: "Finish 4 runs to claim the icy ball effect."
  }
];

function isWeekend(now = new Date()) {
  const day = now.getDay();
  return day === 6 || day === 0;
}

function getSeasonalEvent(now = new Date()) {
  const month = now.getMonth();
  const active =
    SEASONAL_EVENTS.find((event) => event.months.includes(month)) ||
    SEASONAL_EVENTS[0];
  return { ...active, isLive: active.months.includes(month) };
}

let missionHasClaimable = false;
let missionCelebrateTimeout = null;

let playerData = loadPlayerData();
ensureGoalProgress(playerData);
enforceDevTokenFloor();

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
updateStreak(playerData);
savePlayerData(playerData);
updateCoinsHeader();
renderProgression();
renderClubLeaderboard();
renderLeaderboards();
renderTierLeaderboard();
renderCoopGoals();
renderPvPQueues();
renderShareableMoments();
renderNotifications();
syncNotificationSettingsUI();
renderInsights();
renderStreakUI();

let game = null;
let input = null;
let continueCost = 10;
let continueSpendTotal = 0;
let pendingGameOverPayload = null;
let visualVariant = "v1";
let sessionStartTime = null;

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

  syncHudVisibility();
  updateTouchControlsVisibility();
}

function syncHudVisibility() {
  const inRun = currentScreenId === null;
  const isV2 = visualVariant === "v2";
  const isV3 = visualVariant === "v3";

  hudEl.classList.toggle("hidden", !inRun || isV2 || isV3);
  hudV2?.classList.toggle("hidden", !inRun || !isV2);
  hudV3?.classList.toggle("hidden", !inRun || !isV3);
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
  enforceDevTokenFloor();
  headerCoinsValue.textContent = playerData.coins.toString();
}

function enforceDevTokenFloor() {
  if (playerData?.devTokensUnlocked && playerData.coins < DEV_TOKEN_STASH) {
    playerData.coins = DEV_TOKEN_STASH;
    savePlayerData(playerData);
  }
}

function handleDevCodeEntry() {
  const entry = prompt("Enter dev code to load sandbox tokens:");
  if (entry == null) return;

  const normalized = entry.trim().toLowerCase();
  if (normalized === DEV_CODE) {
    playerData.devTokensUnlocked = true;
    playerData.coins = Math.max(playerData.coins, DEV_TOKEN_STASH);
    savePlayerData(playerData);
    updateCoinsHeader();
    updateProfileUI("Developer token stash applied locally.");
    alert("Dev code accepted. Tokens topped up.");
  } else if (normalized) {
    alert("Code not recognized.");
  }
}

function renderGoalList(goals = [], container) {
  if (!container) return;
  container.innerHTML = "";
  goals.forEach((goal) => {
    const item = document.createElement("li");
    const ratio = Math.max(0, Math.min(1, goal.target ? goal.progress / goal.target : goal.progress));
    const progressLabel = goal.target
      ? `${Math.min(goal.progress, goal.target)} / ${goal.target}`
      : `${Math.round(ratio * 100)}%`;
    const text = document.createElement("div");
    text.className = "goal-list__label";
    text.innerHTML = `
      <span>${goal.label}</span>
      ${goal.detail ? `<p class="progress-label">${goal.detail}</p>` : ""}
    `;
    const meta = document.createElement("div");
    meta.className = "goal-list__meta";
    if (goal.tag) {
      const tag = document.createElement("span");
      tag.className = "pill pill--tiny";
      tag.textContent = goal.tag;
      meta.appendChild(tag);
    }
    const pctLabel = document.createElement("span");
    pctLabel.className = "progress-label";
    pctLabel.textContent = progressLabel;
    meta.appendChild(pctLabel);
    item.appendChild(text);
    item.appendChild(meta);
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    const fill = document.createElement("div");
    fill.className = "progress-bar__fill";
    fill.style.width = `${ratio * 100}%`;
    bar.appendChild(fill);
    item.appendChild(bar);
    container.appendChild(item);
  });
}

function renderProgression() {
  const progress = getLevelProgress(playerData);
  const level = progress.level;
  const percent = Math.round(progress.progress * 100);

  if (loopXpFill) loopXpFill.style.width = `${percent}%`;
  if (loopXpLabel)
    loopXpLabel.textContent = `Level ${level} · ${progress.xpIntoLevel} / ${progress.levelXpNeeded} XP`;
  if (levelMeterFill) levelMeterFill.style.width = `${percent}%`;
  if (levelMeterLabel)
    levelMeterLabel.textContent = `${progress.xpIntoLevel} / ${progress.levelXpNeeded} XP to next`;
  if (levelNumber) levelNumber.textContent = level.toString();

  const { shortGoals, midGoals, longGoals, unlockRows } = buildGoalBuckets();
  renderGoalList(shortGoals, shortGoalsEl);
  renderGoalList(midGoals, midGoalsEl);
  renderGoalList(longGoals, longGoalsEl);
  renderGoalList(unlockRows, unlockProgressEl);

  if (skillPathLabel) {
    const pathLabel = SKILL_PATH_LABELS[playerData.skillTree?.path] || "Finisher";
    skillPathLabel.textContent = `${pathLabel} path selected`;
  }
  if (skillPointLabel) {
    const earned = playerData.skillTree?.pointsEarned || 0;
    const spent = playerData.skillTree?.pointsSpent || 0;
    skillPointLabel.textContent = `${spent} spent · ${Math.max(0, earned - spent)} unspent points`;
  }
  skillPathButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.skillPath === playerData.skillTree?.path);
  });
}

function setSkillPath(path) {
  if (!SKILL_PATH_LABELS[path]) return;
  playerData.skillTree = {
    ...playerData.skillTree,
    path
  };
  savePlayerData(playerData);
  renderProgression();
  triggerCelebration({
    title: `${SKILL_PATH_LABELS[path]} path equipped`,
    copy: "Skill points now flow into this tree for stronger bonuses.",
    tag: "Skill tree"
  });
}

function renderClubLeaderboard() {
  if (clubStatusEl && CLUB_PROFILE) {
    const contribution = CLUB_PROFILE.contribution ? ` · +${CLUB_PROFILE.contribution} pts from you` : "";
    clubStatusEl.textContent = `${CLUB_PROFILE.name} · ${CLUB_PROFILE.league}${contribution}`;
    clubStatusEl.title = `${CLUB_PROFILE.weeklyNote} ${CLUB_PROFILE.squadNote}`;
  }

  if (!clubLeaderboardEl) return;
  clubLeaderboardEl.innerHTML = "";
  CLUB_LEADERBOARD.forEach((club, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <span class="leaderboard__rank">${index + 1}</span>
        <span class="leaderboard__name">${club.name}</span>
        ${club.isPlayerClub ? '<span class="pill pill--tiny">Your club</span>' : ""}
        <p class="progress-label">${club.tier} · ${club.members} members · ${club.momentum}</p>
      </div>
      <span class="leaderboard__score">${club.points} pts</span>
    `;
    clubLeaderboardEl.appendChild(li);
  });
}

function renderLeaderboardList(targetEl, rows) {
  if (!targetEl) return;
  targetEl.innerHTML = "";
  rows.forEach((row, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <span class="leaderboard__rank">${index + 1}</span>
        <span class="leaderboard__name">${row.name}</span>
        ${row.tag ? `<span class="pill pill--tiny">${row.tag}</span>` : ""}
        <p class="progress-label">${row.note || ""}</p>
      </div>
      <span class="leaderboard__score">${row.score || ""}</span>
    `;
    targetEl.appendChild(li);
  });
}

function renderLeaderboards() {
  renderLeaderboardList(globalLeaderboardEl, GLOBAL_LEADERBOARD);
  renderLeaderboardList(friendLeaderboardEl, FRIEND_LEADERBOARD);
  renderLeaderboardList(localLeaderboardEl, LOCAL_LEADERBOARD);
}

function renderTierLeaderboard() {
  renderLeaderboardList(tierLeaderboardEl, TIER_LEADERBOARD);
}

function renderCoopGoals() {
  if (!coopGoalListEl) return;
  coopGoalListEl.innerHTML = "";
  COOP_GOALS.forEach((goal) => {
    const progress = Math.min(1, (goal.progress || 0) / (goal.target || 1));
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <div class="goal-list__label">${goal.name}</div>
        <p class="progress-label">${goal.description}</p>
        <p class="progress-label">${goal.contributors} contributors · Reward: ${goal.reward}</p>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width: ${Math.round(progress * 100)}%"></div>
        </div>
      </div>
      <span class="pill pill--soft">${goal.progress}/${goal.target}</span>
    `;
    coopGoalListEl.appendChild(li);
  });
}

function renderPvPQueues() {
  renderLeaderboardList(pvpListEl, PVP_QUEUES);
}

function renderShareableMoments() {
  renderLeaderboardList(shareListEl, SHAREABLE_MOMENTS);
}

function getNotificationPrefs() {
  return {
    ...defaultNotificationPrefs(),
    ...(playerData.notificationPrefs || {})
  };
}

function getNotificationWindowLabel(windowKey) {
  switch (windowKey) {
    case "morning":
      return "mornings (8–11am)";
    case "afternoon":
      return "afternoons (12–3pm)";
    case "evening":
    default:
      return "evenings (6–9pm)";
  }
}

function filterNotificationsForPrefs(prefs) {
  return RESPECTFUL_NOTIFICATIONS.filter((note) => {
    if (note.type === "reminder" && !prefs.leagueReminders) return false;
    if (note.type === "streak" && !prefs.trainingStreaks) return false;
    if (note.type === "event" && !prefs.eventAlerts) return false;
    return true;
  });
}

function renderNotifications() {
  if (!notificationListEl) return;
  const prefs = getNotificationPrefs();
  notificationListEl.innerHTML = "";

  const schedule = document.createElement("li");
  schedule.classList.add("notification-list__meta");
  schedule.innerHTML = `
    <div>
      <strong>${prefs.enabled ? "Respectful schedule" : "Notifications muted"}</strong>
      <p class="progress-label">${
        prefs.enabled
          ? `Max ${prefs.maxPerDay} per day in ${getNotificationWindowLabel(prefs.preferredWindow)}.`
          : "No pings until you re-enable them in Settings."
      }</p>
    </div>
    <span class="pill pill--soft">${prefs.enabled ? "Opt-in" : "Muted"}</span>
  `;
  notificationListEl.appendChild(schedule);

  if (!prefs.enabled) return;

  const allowedNotifications = filterNotificationsForPrefs(prefs).slice(0, Math.max(1, prefs.maxPerDay));

  if (!allowedNotifications.length) {
    const li = document.createElement("li");
    li.classList.add("notification-list__meta");
    li.innerHTML = `
      <div>
        <strong>All categories muted</strong>
        <p class="progress-label">Turn on at least one topic so we can send a timely, non-spammy ping.</p>
      </div>
    `;
    notificationListEl.appendChild(li);
    return;
  }

  allowedNotifications.forEach((note) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${note.title}</strong>
        <p class="progress-label">${note.copy}</p>
      </div>
      <span class="progress-label">${note.time}</span>
    `;
    notificationListEl.appendChild(li);
  });
}

function syncNotificationSettingsUI() {
  const prefs = getNotificationPrefs();
  const topicInputs = [notificationLeagueToggle, notificationStreakToggle, notificationEventToggle, notificationWindowSelect, notificationDailyCapSelect];

  if (notificationMasterToggle) notificationMasterToggle.checked = !!prefs.enabled;
  if (notificationLeagueToggle) {
    notificationLeagueToggle.checked = !!prefs.leagueReminders;
    notificationLeagueToggle.disabled = !prefs.enabled;
  }
  if (notificationStreakToggle) {
    notificationStreakToggle.checked = !!prefs.trainingStreaks;
    notificationStreakToggle.disabled = !prefs.enabled;
  }
  if (notificationEventToggle) {
    notificationEventToggle.checked = !!prefs.eventAlerts;
    notificationEventToggle.disabled = !prefs.enabled;
  }
  if (notificationDailyCapSelect) {
    notificationDailyCapSelect.value = String(prefs.maxPerDay);
    notificationDailyCapSelect.disabled = !prefs.enabled;
  }
  if (notificationWindowSelect) {
    notificationWindowSelect.value = prefs.preferredWindow;
    notificationWindowSelect.disabled = !prefs.enabled;
  }

  if (notificationSettingsNote) {
    notificationSettingsNote.textContent = prefs.enabled
      ? `Up to ${prefs.maxPerDay} pings per day in ${getNotificationWindowLabel(prefs.preferredWindow)}. Toggle topics off anytime.`
      : "Notifications are muted. You can re-enable them whenever you're ready.";
  }
  topicInputs
    .filter(Boolean)
    .forEach((input) => {
      input.closest?.(".setting-row")?.classList.toggle("setting-row--disabled", !prefs.enabled && input !== notificationMasterToggle);
    });
}

function updateNotificationPrefs(partialPrefs = {}) {
  playerData.notificationPrefs = {
    ...defaultNotificationPrefs(),
    ...(playerData.notificationPrefs || {}),
    ...partialPrefs
  };
  savePlayerData(playerData);
  syncNotificationSettingsUI();
  renderNotifications();
}

function renderInsights() {
  if (!insightListEl) return;
  const insights = playerData.insights || {};
  const sessionLengths = insights.recentSessionLengths || [];
  const avgSession =
    sessionLengths.length > 0
      ? Math.round(sessionLengths.reduce((sum, val) => sum + val, 0) / sessionLengths.length / 60000)
      : 0;
  const rows = [
    { label: "Runs played", value: insights.totalRuns || 0 },
    { label: "Sessions", value: insights.totalSessions || 0 },
    { label: "Avg session", value: `${avgSession || 0}m` }
  ];

  insightListEl.innerHTML = "";
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${row.label}</span><span class="progress-label">${row.value}</span>`;
    insightListEl.appendChild(li);
  });
}

function renderOnboardingPanel() {
  const progress = getOnboardingProgress(playerData);
  if (onboardingHint) {
    onboardingHint.textContent = progress.adaptiveAssistActive
      ? "Adaptive assist: easing defenders"
      : progress.firstWinAwarded
        ? "Adaptive assists ready"
        : "Beginner win locked in";
  }

  if (tutorialChecklist) {
    tutorialChecklist.querySelectorAll("[data-step]").forEach((item) => {
      const step = item.dataset.step;
      const done = progress.tutorialSteps?.[step];
      item.classList.toggle("tutorial-list__item--complete", !!done);
      const status = item.querySelector(".tutorial-list__status");
      if (status) status.textContent = done ? "✓" : "•";
      const label = item.querySelector(".tutorial-list__label");
      if (label) label.textContent = done ? `${label.dataset.short} (done)` : label.dataset.short;
    });
  }

  if (tutorialNextStep) {
    tutorialNextStep.textContent = "Next: Play your first match.";
  }

  if (adaptiveNote) {
    adaptiveNote.textContent = progress.adaptiveAssistActive
      ? "We’re dropping pressure after the recent losses—lighter keeper speed and extra pickups are on."
      : "Difficulty scales gently until you’re ready for tougher presses.";
  }

  if (earlyWinNote) {
    earlyWinNote.textContent = progress.firstWinAwarded
      ? "First win secured—future matches ramp normally."
      : "Beginner boost active so your opening match or drills end in a win.";
  }
}

function completeTutorialStep(step) {
  const updated = markTutorialStep(playerData, step);
  if (updated) {
    savePlayerData(playerData);
    renderOnboardingPanel();
  }
}

function renderStreakUI() {
  const streak = playerData.streak || { days: 0, shield: 1 };
  const bonuses = getStreakBonuses(streak);
  const xpPercent = Math.round((bonuses.xpBonus - 1) * 100);
  const coinPercent = Math.round((bonuses.coinBonus - 1) * 100);

  if (streakLabel)
    streakLabel.textContent = `Streak: ${streak.days} day${streak.days === 1 ? "" : "s"}`;
  if (streakValue)
    streakValue.textContent = `${streak.days} days · +${xpPercent}% XP · +${coinPercent}% coins`;
  if (streakNote) {
    const shieldCopy = bonuses.shield > 0 ? `Streak shield ready: ${bonuses.shield}` : "Grace used";
    streakNote.textContent = `${shieldCopy}. Missing a day uses the shield, then restarts at 1 day.`;
  }
}

function updateMissionSummaries(dailyMissions, weeklyMissions, journeyMissions) {
  if (dailySet && dailyMissions.length) {
    dailySet.textContent = dailyMissions.map((m) => m.name).slice(0, 3).join(" · ");
  }
  if (weeklySet && weeklyMissions.length) {
    weeklySet.textContent = weeklyMissions.map((m) => m.name).slice(0, 3).join(" · ");
  }
  if (dailyChallengeNote) {
    const hardMission = dailyMissions.find((m) => m.difficulty === "hard") || dailyMissions[dailyMissions.length - 1];
    dailyChallengeNote.textContent = hardMission
      ? `Daily challenge (${hardMission.difficulty || "hard"}): ${hardMission.name}`
      : "Hard challenge rotates daily.";
  }
  if (journeyNote && journeyMissions.length) {
    const remaining = journeyMissions.filter((m) => !m.claimed).length;
    journeyNote.textContent = `${remaining} big goals that stack across sessions`;
  }
}

function renderEvents() {
  const now = new Date();
  const seasonal = getSeasonalEvent(now);
  const weekendLive = isWeekend(now);

  if (weekendEventTitle) {
    weekendEventTitle.textContent = weekendLive ? "Weekend Cup (Live)" : "Weekend Cup (Sat-Sun)";
  }
  if (weekendEventCopy) {
    weekendEventCopy.textContent = weekendLive
      ? "Daily attempts, double coins, and a leaderboard badge until Monday."
      : "Qualify Friday to get a grace-day shield and bonus training XP.";
  }
  if (seasonalEventTitle) {
    seasonalEventTitle.textContent = seasonal.isLive
      ? `${seasonal.name} (Live)`
      : `${seasonal.name} (${seasonal.window})`;
  }
  if (seasonalEventCopy) seasonalEventCopy.textContent = seasonal.copy;
  if (eventCosmeticTitle) eventCosmeticTitle.textContent = seasonal.cosmetic;
  if (eventCosmeticCopy) eventCosmeticCopy.textContent = seasonal.cosmeticCopy;

  const tickerText = weekendLive ? "Weekend Cup live" : `${seasonal.name} ${seasonal.isLive ? "live" : "next"}`;
  if (eventTicker) eventTicker.textContent = tickerText;
  if (eventNote)
    eventNote.textContent = weekendLive
      ? "Weekend leaderboard + coin boost active."
      : `Seasonal drops ${seasonal.isLive ? "active" : "arrive"} ${seasonal.window}.`;
  if (eventStatus) eventStatus.textContent = weekendLive || seasonal.isLive ? "Live now" : "Upcoming";
}

function triggerCelebration({ title, copy, tag = "Goal!", duration = 1400 }) {
  // Keep the full-screen overlay hidden so gameplay isn't obstructed.
  if (celebrationOverlay) {
    celebrationOverlay.classList.add("hidden");
    window.clearTimeout(celebrationOverlay._hideTimeout);
  }

  if (!notificationListEl) return;

  const toast = document.createElement("li");
  toast.classList.add("inline-toast");
  toast.innerHTML = `
    <div>
      <strong>${tag}</strong>
      <p class="progress-label">${title}</p>
      <p class="progress-label inline-toast__copy">${copy}</p>
    </div>
  `;

  notificationListEl.prepend(toast);
  window.setTimeout(() => toast.remove(), Math.max(duration, 1500));
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
  const assistProfile = getAssistProfile(playerData);

  game = new Game(canvas, {
    playerCard: selectedCard,
    multipliers,
    kitColors,
    ballAccent: kitColors.ballAccent,
    perks,
    tuning,
    assistProfile,
    teamName: CLUB_PROFILE?.name,
    opponentName: "MLS Select XI",
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

  applyAssistProfile();
}

function applyAssistProfile() {
  if (!game) return;
  const assistProfile = getAssistProfile(playerData);
  if (typeof game.setAssistProfile === "function") {
    game.setAssistProfile(assistProfile);
  }
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
  document.documentElement.dataset.visualVariant = visualVariant;
  buildGameInstance();
  applyVisualVariantTheme();
}

function updateVariantToggleUI() {
  const buttons = [
    { el: btnPlay, variant: "v1" },
    { el: btnPlayV2, variant: "v2" },
    { el: btnPlayV3, variant: "v3" }
  ];

  buttons.forEach(({ el, variant }) => {
    el?.classList.toggle("variant-toggle__button--active", visualVariant === variant);
  });
}

function applyVisualVariantTheme() {
  document.documentElement.dataset.visualVariant = visualVariant;
  updateVariantToggleUI();
  syncHudVisibility();
}

function syncSessionLabels(preset) {
  const hint = sessionDurationHint(preset);
  if (hudSessionLabel) hudSessionLabel.textContent = preset?.label || "Session";
  if (hudSessionTimer) hudSessionTimer.textContent = `${formatDuration(0)} · ${hint}`;
  if (goSessionSummary) goSessionSummary.textContent = preset?.label || "Session";
  if (goSessionDuration) goSessionDuration.textContent = `${formatDuration(0)}`;
  if (goSessionMode)
    goSessionMode.textContent = preset?.offlineFriendly ? "Offline ready" : "Connected play";
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
    playerData.profile = {
      ...playerData.profile,
      builderCompleted: true
    };
    savePlayerData(playerData);
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
            completeTutorialStep("upgrade");
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
    const tags = document.createElement("div");
    tags.className = "mission-card__tags";
    const cadenceTag = document.createElement("span");
    cadenceTag.className = "pill pill--soft mission-card__tag";
    cadenceTag.textContent = cadence === "daily" ? "Daily" : cadence === "weekly" ? "Weekly" : "Journey";
    tags.appendChild(cadenceTag);
    if (mission.difficulty) {
      const diffTag = document.createElement("span");
      diffTag.className = `pill pill--soft mission-card__tag mission-card__tag--${mission.difficulty}`;
      diffTag.textContent = mission.difficulty;
      tags.appendChild(diffTag);
    }
    header.appendChild(title);
    header.appendChild(tags);
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
  renderMissionList(
    journeyMissionsEl,
    playerData.missions.journey?.missions || [],
    "journey"
  );

  const allMissions = [
    ...(playerData.missions.daily?.missions || []),
    ...(playerData.missions.weekly?.missions || []),
    ...(playerData.missions.journey?.missions || [])
  ];
  const hasClaimableMission = allMissions.some(
    (mission) => mission.progress >= mission.goal && !mission.claimed
  );
  updateMissionCelebrationState(hasClaimableMission);

  updateMissionSummaries(
    playerData.missions.daily?.missions || [],
    playerData.missions.weekly?.missions || [],
    playerData.missions.journey?.missions || []
  );
}

function startVariantRun(variant) {
  if (variant && variant !== visualVariant) {
    setVisualVariant(variant);
  }
  startRun(activeSessionPreset);
}

function startRun(preset = activeSessionPreset) {
  activeSessionPreset = preset || activeSessionPreset;
  if (!ensureProfileSetup("Customize your striker before the first run.")) return;
  if (typeof game?.setSessionConfig === "function") {
    game.setSessionConfig(activeSessionPreset);
  }
  setActiveScreen(null); // close menus
  pauseBanner.classList.add("hidden");
  pauseMenu?.classList.add("hidden");
  sessionStartTime = Date.now();
  resetContinueState();
  lastDodgedCount = 0;
  commentator.shout("start");
  updateStreak(playerData);
  renderStreakUI();
  renderInsights();
  savePlayerData(playerData);
  applyAssistProfile();
  game.startRun();
  updateTouchControlsVisibility();
  syncSessionLabels(activeSessionPreset);
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

function evaluateRunOutcome(payload) {
  const baselineWin = payload.goals > 0 || payload.distance >= 350 || payload.coins >= 120;
  const progress = getOnboardingProgress(playerData);
  const usedBeginnerBoost = !baselineWin && !progress.firstWinAwarded;

  return {
    win: baselineWin || usedBeginnerBoost,
    usedBeginnerBoost
  };
}

function calculateRunCoins(payload) {
  const distanceBonus = Math.floor(payload.distance / 20);
  const goalBonus = payload.goals * 20;
  const runCoins = payload.coins + distanceBonus + goalBonus;
  const bonuses = getStreakBonuses(playerData.streak || {});
  const boostedCoins = Math.round(runCoins * bonuses.coinBonus);
  return { runCoins: boostedCoins, distanceBonus, goalBonus, coinBonus: bonuses.coinBonus };
}

function getAvailableTokensForContinue(runCoins) {
  const remainingRunCoins = Math.max(0, runCoins - continueSpendTotal);
  return playerData.coins + remainingRunCoins;
}

function applyRunResults(payload) {
  const outcome = evaluateRunOutcome(payload);
  const { runCoins, distanceBonus, goalBonus, coinBonus } = calculateRunCoins(payload);
  const netCoins = Math.max(0, runCoins - continueSpendTotal);
  const previousBest = playerData.bestDistance;

  playerData.coins += netCoins;
  playerData.totalGoals += payload.goals;
  if (payload.distance > playerData.bestDistance) {
    playerData.bestDistance = payload.distance;
  }
  const streakBonuses = getStreakBonuses(playerData.streak || {});
  const xpEarned = Math.round(payload.distance * 0.2 + payload.goals * 35 + netCoins * 0.15);
  const totalXp = Math.round(xpEarned * streakBonuses.xpBonus);
  const { levelBefore, levelAfter } = addExperience(playerData, totalXp);
  logRunEvent(playerData);
  recordRunOutcome(playerData, outcome);
  updateMissionsAfterRun(playerData, {
    distance: payload.distance,
    goals: payload.goals,
    coins: runCoins
  });
  updateProgressionTracks(
    playerData,
    {
      distance: payload.distance,
      goals: payload.goals,
      coins: runCoins
    },
    { levelBefore, levelAfter }
  );

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
  renderProgression();
  renderInsights();
  renderOnboardingPanel();
  applyAssistProfile();
  updateProfileUI("Progress auto-saved after the match.");

  const earnedCoinsNote =
    continueSpendTotal > 0
      ? `Earned ${netCoins} tokens after spending ${continueSpendTotal} to continue.`
      : "";
  const streakCoinBonus = Math.round((coinBonus - 1) * 100);

  goCoins.textContent = `${netCoins}`;
  goCoinsInRun.textContent = `${payload.coins}`;
  goCoinsDistance.textContent = `${distanceBonus}`;
  goCoinsGoals.textContent = `${goalBonus}`;
  goCoinsTotal.textContent = `${netCoins}`;
  if (rewardMeter) rewardMeter.style.width = `${Math.min(100, netCoins % 150)}%`;
  if (rewardLine) rewardLine.textContent = `+${totalXp} XP · ${netCoins} coins · ${payload.goals} goals`;

  const baseBestNote =
    payload.distance > previousBest
      ? "New personal best for this device!"
      : `Best distance so far: ${playerData.bestDistance} m`;
  goBestNote.textContent = outcome.usedBeginnerBoost
    ? `${baseBestNote} Beginner boost secured an early win to build momentum.`
    : baseBestNote;

  const streakCoinCopy = streakCoinBonus > 0 ? ` +${streakCoinBonus}% streak coin boost.` : "";
  if (earnedCoinsNote) {
    goBestNote.textContent += ` ${earnedCoinsNote}${streakCoinCopy}`;
  } else if (streakCoinBonus > 0) {
    goBestNote.textContent += streakCoinCopy;
  }

  if (levelAfter > levelBefore) {
    triggerCelebration({
      title: `Level ${levelAfter} unlocked!`,
      copy: `New perks and rewards are ready. +${totalXp} XP added.`,
      tag: "Level up",
      duration: 2000
    });
  }
}

function updateGameOverUI(payload) {
  const { runCoins, distanceBonus, goalBonus, coinBonus } = calculateRunCoins(payload);
  const netCoins = Math.max(0, runCoins - continueSpendTotal);
  const projectedBest = Math.max(playerData.bestDistance, payload.distance);
  const availableTokens = getAvailableTokensForContinue(runCoins);
  const preset = payload.sessionConfig || activeSessionPreset;
  const marketValueResult = calculateMarketValue(payload.distance, payload.goals, payload.coins);

  goDistance.textContent = `${payload.distance} m`;
  goGoals.textContent = `${payload.goals}`;
  goCoins.textContent = `${netCoins}`;
  goCoinsInRun.textContent = `${payload.coins}`;
  goCoinsDistance.textContent = `${distanceBonus}`;
  goCoinsGoals.textContent = `${goalBonus}`;
  goCoinsTotal.textContent = `${netCoins}`;
  if (marketValueLabel) marketValueLabel.textContent = marketValueResult.value;
  if (marketRankLabel) marketRankLabel.textContent = marketValueResult.rank;
  if (marketValueNote)
    marketValueNote.textContent = `Scout report: ${marketValueResult.rank} · Value factors distance, goals, and coins.`;
  lastMarketValueResult = {
    ...marketValueResult,
    distance: payload.distance,
    goals: payload.goals,
    coins: payload.coins
  };
  if (goSessionSummary) {
    const endCopy = payload.endReason === "sessionComplete" ? " · Session complete" : "";
    goSessionSummary.textContent = `${preset.label}${endCopy}`;
  }
  if (goSessionDuration) {
    const capLabel = preset.targetDurationMs ? sessionDurationHint(preset) : "No cap";
    goSessionDuration.textContent = `${formatDuration(payload.runDurationMs || 0)} · ${capLabel}`;
  }
  if (goSessionMode)
    goSessionMode.textContent = preset.offlineFriendly ? "Offline ready" : "Connected play";

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
  const streakCoinBonus = Math.round((coinBonus - 1) * 100);
  const streakCopy = streakCoinBonus > 0 ? ` (+${streakCoinBonus}% streak coins active)` : "";
  goContinueNote.textContent = canAfford
    ? `You can spend tokens to keep this run going. Cost increases by 10 each time you continue${streakCopy}.`
    : `You need ${continueCost - availableTokens} more tokens to continue this run${streakCopy}.`;
}

function handleGameStats(stats) {
  if (typeof stats.opponentsDodged === "number") {
    if (stats.opponentsDodged > lastDodgedCount) commentator.shout("nearMiss");
    lastDodgedCount = stats.opponentsDodged;
  }
  hudDistance.textContent = `${stats.distance} m`;
  hudGoals.textContent = stats.goals.toString();
  hudBest.textContent = `${stats.bestDistance} m`;
  if (hudTierName) hudTierName.textContent = stats.tierName || "Kickoff Circuit";
  if (hudTierNote) hudTierNote.textContent = stats.tierNote || "Opening pace";
  if (hudSessionLabel) hudSessionLabel.textContent = stats.sessionLabel || activeSessionPreset.label;
  if (hudSessionTimer) {
    const capLabel = stats.targetDurationMs ? sessionDurationHint({ targetDurationMs: stats.targetDurationMs }) : "No cap";
    hudSessionTimer.textContent = `${formatDuration(stats.runDurationMs || 0)} · ${capLabel}`;
  }
  const pct = (stats.shotMeter / 100) * 100;
  shotMeterFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  shotMeterFill.classList.toggle("shot-meter__fill--ready", !!stats.shotReady);

  if (hudV2Coins) hudV2Coins.textContent = `${stats.coins ?? 0}`;
  if (hudV2Score) hudV2Score.textContent = `${stats.distance}`;
  if (hudV2Multiplier) {
    const multiplier = Math.max(1, (stats.goals || 0) + 1);
    hudV2Multiplier.textContent = `x${multiplier}`;
  }
  if (hudV2Lives) {
    const lives = stats.lives ?? 3;
    hudV2Lives.textContent = `${lives}`;
  }

  if (hudV3Distance) hudV3Distance.textContent = `${stats.distance} m`;
  if (hudV3Dodged) hudV3Dodged.textContent = `${stats.opponentsDodged ?? 0}`;
  if (hudV3Balls) hudV3Balls.textContent = `${stats.ballsCollected ?? 0}`;
  if (hudV3BallSteals) hudV3BallSteals.textContent = `${stats.ballSteals ?? 0}`;
  if (hudV3TeamName) hudV3TeamName.textContent = stats.teamName || "Club";
  if (hudV3OpponentName) hudV3OpponentName.textContent = stats.opponentName || "MLS XI";
  if (hudV3TeamScore) hudV3TeamScore.textContent = `${stats.teamScore ?? 0}`;
  if (hudV3OpponentScore) hudV3OpponentScore.textContent = `${stats.opponentScore ?? 0}`;
  if (hudV3Regulation && stats.regulation)
    hudV3Regulation.textContent = `${stats.regulation} · Cards ours:${stats.penaltiesForOpponent ?? 0} theirs:${
      stats.penaltiesForPlayer ?? 0
    }`;

  const hypeValue = Math.max(0, Math.min(100, stats.hype ?? 0));
  if (hudV3HypeFill) hudV3HypeFill.style.width = `${hypeValue}%`;
  if (hudV3HypeLabel)
    hudV3HypeLabel.textContent = `Hype ${hypeValue}% · supporters in full voice`;

  const tackles = stats.slideTackles ?? 0;
  const streak = stats.slideTackleStreak ?? 0;
  const streakRemainder = streak % 5;
  const remainingForSuper = streakRemainder === 0 ? 5 : Math.max(0, 5 - streakRemainder);
  if (hudV3SlideTackles) hudV3SlideTackles.textContent = `${tackles}`;
  if (hudV3SuperTimer) {
    hudV3SuperTimer.textContent = stats.superActive
      ? `Super active · ${stats.superTime?.toFixed?.(1) || stats.superTime}s`
      : `Super after ${remainingForSuper} more clean tackles`;
  }
  if (hudV3SuperCard)
    hudV3SuperCard.classList.toggle("hud-v3__stat--super-active", !!stats.superActive);
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
  commentator.shout("goal");
  triggerCelebration({
    title: "Net ripper!",
    copy: "+20 XP, replay saved, and crowd roar triggered.",
    tag: "Goal",
    duration: 1200
  });
}

function handleGameOver(payload) {
  if (payload.sessionConfig) {
    activeSessionPreset = payload.sessionConfig;
  }
  pendingGameOverPayload = payload;
  updateGameOverUI(payload);
  setActiveScreen("gameOverScreen");
}

function finalizePendingGameOver() {
  if (!pendingGameOverPayload) return;
  const sessionLengthMs =
    pendingGameOverPayload.runDurationMs ||
    (sessionStartTime ? Date.now() - sessionStartTime : 0);
  logSessionEvent(playerData, { sessionLengthMs });
  applyRunResults(pendingGameOverPayload);
  resetContinueState();
  sessionStartTime = null;
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
        startRun(activeSessionPreset);
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

  if (actionType === "primary") {
    completeTutorialStep("pass");
    if (game.isShotReady()) {
      const aimBias = Math.max(-1, Math.min(1, (detail.dx || 0) / 140));
      const shotTaken = game.attemptShot(aimBias);
      if (shotTaken) {
        completeTutorialStep("shoot");
      }
    }
    return;
  }

  if (actionType === "moveLeft") {
    game.handleMove("left");
    completeTutorialStep("move");
  } else if (actionType === "moveRight") {
    game.handleMove("right");
    completeTutorialStep("move");
  } else if (actionType === "tackle") {
    commentator.shout("tackle");
    game.handleMove("tackle");
    completeTutorialStep("pass");
  } else if (actionType === "juke") {
    game.handleMove("juke");
    completeTutorialStep("move");
  }
}

// Button wiring

document.addEventListener("pointerdown", handlePressableDown, { passive: true });
window.addEventListener("pointerup", clearPressedState, { passive: true });
window.addEventListener("pointercancel", clearPressedState, { passive: true });
window.addEventListener("blur", clearPressedState, { passive: true });

btnPlay.addEventListener("click", () => {
  spawnTapParticles(btnPlay);
  activeSessionPreset = SESSION_PRESETS.quick;
  syncSessionLabels(activeSessionPreset);
  startVariantRun("v1");
});

btnPlayV2?.addEventListener("click", () => {
  spawnTapParticles(btnPlayV2);
  activeSessionPreset = SESSION_PRESETS.quick;
  syncSessionLabels(activeSessionPreset);
  startVariantRun("v2");
});

btnPlayV3?.addEventListener("click", () => {
  spawnTapParticles(btnPlayV3);
  activeSessionPreset = SESSION_PRESETS.quick;
  syncSessionLabels(activeSessionPreset);
  startVariantRun("v3");
});

btnQuickSession?.addEventListener("click", () => {
  activeSessionPreset = SESSION_PRESETS.quick;
  syncSessionLabels(activeSessionPreset);
  startRun(SESSION_PRESETS.quick);
});

btnOfflineDrill?.addEventListener("click", () => {
  activeSessionPreset = SESSION_PRESETS.offline;
  syncSessionLabels(activeSessionPreset);
  startRun(SESSION_PRESETS.offline);
});

btnEndless?.addEventListener("click", () => {
  activeSessionPreset = SESSION_PRESETS.endless;
  syncSessionLabels(activeSessionPreset);
  startRun(SESSION_PRESETS.endless);
});

skillPathButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const path = btn.dataset.skillPath;
    setSkillPath(path);
    skillPathButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.skillPath === path);
    });
  });
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

btnCloseBuilder?.addEventListener("click", () => {
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

notificationMasterToggle?.addEventListener("change", (event) => {
  updateNotificationPrefs({ enabled: event.target.checked });
});

notificationLeagueToggle?.addEventListener("change", (event) => {
  updateNotificationPrefs({ leagueReminders: event.target.checked });
});

notificationStreakToggle?.addEventListener("change", (event) => {
  updateNotificationPrefs({ trainingStreaks: event.target.checked });
});

notificationEventToggle?.addEventListener("change", (event) => {
  updateNotificationPrefs({ eventAlerts: event.target.checked });
});

notificationDailyCapSelect?.addEventListener("change", (event) => {
  const value = Math.max(1, Number(event.target.value) || defaultNotificationPrefs().maxPerDay);
  updateNotificationPrefs({ maxPerDay: value });
});

notificationWindowSelect?.addEventListener("change", (event) => {
  updateNotificationPrefs({ preferredWindow: event.target.value });
});

btnTeam.addEventListener("click", () => {
  renderTeamScreen();
  setActiveScreen("teamScreen");
});

btnMissions?.addEventListener("click", () => {
  setActiveScreen("mainMenu");
  focusMissionsPanel();
});

btnDevCode?.addEventListener("click", () => {
  handleDevCodeEntry();
});

btnSettings.addEventListener("click", () => {
  setActiveScreen("settingsScreen");
});

btnPause.addEventListener("click", () => {
  togglePause();
});

btnPauseV2?.addEventListener("click", () => {
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
  startRun(activeSessionPreset);
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

btnShareCard?.addEventListener("click", () => {
  const profile = playerData.profile || {};
  const playerName = getProfileLabel(profile);
  const marketValue =
    lastMarketValueResult || calculateMarketValue(pendingGameOverPayload?.distance || 0, 0, 0);
  const dataUrl = generateShareCard(playerName, marketValue.value, marketValue.rank);
  if (dataUrl) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${playerName.replace(/\s+/g, "_") || "runner"}_transfer_card.png`;
    link.click();
  }
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
    renderProgression();
    renderNotifications();
    syncNotificationSettingsUI();
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
applyVisualVariantTheme();
renderTeamScreen();
renderMissions();
renderEvents();
renderOnboardingPanel();
setActiveScreen("mainMenu");
closeAuthSheet();
updateProfileUI();
updateTouchControlsVisibility();
updateBuilderPreview();
renderKitPresets();
syncSessionLabels(activeSessionPreset);

if (!playerData.profile?.builderCompleted) {
  // Default to a ready-to-play profile; the builder can still be opened manually.
  playerData.profile = {
    ...playerData.profile,
    builderCompleted: true
  };
  savePlayerData(playerData);
}

input = new InputManager(canvas, handleInputAction);
input.attach();

requestAnimationFrame(loop);
