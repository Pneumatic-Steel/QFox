export const GAME_STATE = {
  MENU: "menu",
  PLAYING: "playing",
  GAME_OVER: "game_over",
  LEADERBOARD: "leaderboard",
  TRAILS: "trails",
};

export const LANE_POSITIONS = [-3.5, 0, 3.5];

export const FOX_BASE_HEIGHT = 1.2;

// Difficulty / speed
export const MIN_GAME_SPEED = 0.22;
export const MAX_GAME_SPEED = 1.35;
export const DIFFICULTY_SCORE_TARGET = 1500;
export const DIFFICULTY_EXPONENT = 1.4;

// Scoring / currency
export const SCORE_PER_ORB = 10;
export const ORB_REWARD_SCORE_STEP = 500; // every 500 score
export const ORB_REWARD_AMOUNT = 10;      // give 10 orbs

// Collision radius
export const COLLISION_RADIUS = 1.05;
export const COLLISION_RADIUS_SQ = COLLISION_RADIUS * COLLISION_RADIUS;

// Power-up config
export const SHIELD_DURATION = 20000;       // ms (fallback timeout, mainly removed on hit)
export const MULTIPLIER_DURATION = 15000;   // ms
export const POWERUP_HEIGHT = 1.7;          // y height for powerups
export const SHIELD_SPAWN_CHANCE = 0.025;   // 2.5% per spawn event
export const MULTIPLIER_SPAWN_CHANCE = 0.020; // 2.0%

// Spawn spacing
export const BASE_SPAWN_RATE = 60; // frames at easiest
export const MIN_SPAWN_RATE = 18;  // frames at hardest

// Trail IDs
export const TRAIL_IDS = {
  DEFAULT: "default",
  DEMON: "demon",
  PIXEL: "pixel",
  GOLD: "gold",
  GALAXY: "galaxy",
  FIRE: "fire",
  ICE: "ice",
  LIGHTNING: "lightning",
  DUST: "dust",
  POISON: "poison",
  AURORA: "aurora",
  SHADOW: "shadow",
  SOUL: "soul",
  DIAMOND: "diamond",
  SOLAR: "solar",
};

// Trail shop setup: price in orbs, display name, sort order
export const TRAIL_SHOP = [
  { id: TRAIL_IDS.DEFAULT, name: "Default Ribbon", price: 0 },
  { id: TRAIL_IDS.PIXEL, name: "Retro Pixel Trail", price: 100 },
  { id: TRAIL_IDS.DEMON, name: "Blood Demon Trail", price: 500 },
  { id: TRAIL_IDS.FIRE, name: "Fire Jet", price: 500 },
  { id: TRAIL_IDS.ICE, name: "Ice Shards", price: 500 },
  { id: TRAIL_IDS.DUST, name: "Earth Dust", price: 500 },
  { id: TRAIL_IDS.LIGHTNING, name: "Lightning Crackle", price: 750 },
  { id: TRAIL_IDS.POISON, name: "Poison Mist", price: 750 },
  { id: TRAIL_IDS.GOLD, name: "Gold Royal Trail", price: 1000 },
  { id: TRAIL_IDS.SHADOW, name: "Shadow Smoke", price: 1500 },
  { id: TRAIL_IDS.SOUL, name: "Soul Flames", price: 2000 },
  { id: TRAIL_IDS.AURORA, name: "Aurora Ribbon", price: 2500 },
  { id: TRAIL_IDS.GALAXY, name: "Galaxy Nebula", price: 5000 },
  { id: TRAIL_IDS.DIAMOND, name: "Diamond Sparkle", price: 6000 },
  { id: TRAIL_IDS.SOLAR, name: "Solar Flare", price: 8000 },
];

// Local storage keys
export const STORAGE_KEYS = {
  HIGH_SCORE: "quantumFoxHighScore",
  ORBS: "quantumFoxOrbs",
  TRAIL_UNLOCKS: "quantumFoxTrailUnlocks",
  EQUIPPED_TRAIL: "quantumFoxEquippedTrail",
};

// Color schemes for floor & fog (same as before)
export const COLOR_SCHEMES = [
  { floor: "#1f2937", fog: "#111827" }, // 0
  { floor: "#A01010", fog: "#FF0000" }, // 1
  { floor: "#008000", fog: "#00FF00" }, // 2
  { floor: "#1010A0", fog: "#00FFFF" }, // 3
  { floor: "#A010A0", fog: "#FF00FF" }, // 4
  { floor: "#B8860B", fog: "#FF8C00" }, // 5
];

