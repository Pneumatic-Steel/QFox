import {
  TRAIL_IDS,
  TRAIL_SHOP,
  STORAGE_KEYS,
  ORB_REWARD_SCORE_STEP,
  ORB_REWARD_AMOUNT,
} from "./constants.js";
import { setTrailFox } from "./trails.js";  // Import the setTrailFox function

export const player = {
  score: 0,
  highScore: 0,
  laneIndex: 1,
  orbs: 0,

  // power-ups
  shieldActive: false,
  shieldUntil: 0,
  multiplierActive: false,
  multiplierUntil: 0,
  scoreMultiplier: 1,

  // trails
  equippedTrailId: TRAIL_IDS.DEFAULT,
  trailUnlocks: {},

  // last score at which we granted orb rewards
  lastOrbRewardScoreStep: 0,
};

export function initPlayerFromStorage() {
  try {
    // Load high score locally
    const hsStr = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
    if (hsStr != null) {
      player.highScore = parseInt(hsStr, 10) || 0;
    }

    const orbsStr = localStorage.getItem(STORAGE_KEYS.ORBS);
    if (orbsStr != null) {
      player.orbs = parseInt(orbsStr, 10) || 0;
    }

    const unlocksStr = localStorage.getItem(STORAGE_KEYS.TRAIL_UNLOCKS);
    if (unlocksStr) {
      player.trailUnlocks = JSON.parse(unlocksStr);
    } else {
      player.trailUnlocks = {};
    }

    // Always unlock default
    player.trailUnlocks[TRAIL_IDS.DEFAULT] = true;

    const equipped = localStorage.getItem(STORAGE_KEYS.EQUIPPED_TRAIL);
    if (equipped && player.trailUnlocks[equipped]) {
      player.equippedTrailId = equipped;
    } else {
      player.equippedTrailId = TRAIL_IDS.DEFAULT;
    }
  } catch (e) {
    console.warn("Player storage load failed:", e);
    player.trailUnlocks = { [TRAIL_IDS.DEFAULT]: true };
    player.equippedTrailId = TRAIL_IDS.DEFAULT;
    player.orbs = 0;
  }
}

export function savePlayerToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.ORBS, String(player.orbs));
    localStorage.setItem(
      STORAGE_KEYS.TRAIL_UNLOCKS,
      JSON.stringify(player.trailUnlocks)
    );
    localStorage.setItem(
      STORAGE_KEYS.EQUIPPED_TRAIL,
      player.equippedTrailId
    );
  } catch (e) {
    console.warn("Player storage save failed:", e);
  }
}

export function resetPlayerForRun() {
  player.score = 0;
  player.laneIndex = 1;

  // Reset run-specific power-ups
  player.shieldActive = false;
  player.shieldUntil = 0;
  player.multiplierActive = false;
  player.multiplierUntil = 0;
  player.scoreMultiplier = 1;

  player.lastOrbRewardScoreStep = 0;
}

// Called when a scoring event happens (passing an orb)
export function addScore(baseAmount) {
  const gained = baseAmount * player.scoreMultiplier;
  const prev = player.score;
  player.score += gained;

  // Check if we should award orbs
  const prevStep = Math.floor(prev / ORB_REWARD_SCORE_STEP);
  const newStep = Math.floor(player.score / ORB_REWARD_SCORE_STEP);

  if (newStep > prevStep) {
    const stepsDiff = newStep - prevStep;
    const reward = stepsDiff * ORB_REWARD_AMOUNT;
    player.orbs += reward;
    savePlayerToStorage();
    return { scoreGained: gained, orbsGained: reward };
  }

  return { scoreGained: gained, orbsGained: 0 };
}

export function canBuyTrail(trailId) {
  const def = TRAIL_SHOP.find((t) => t.id === trailId);
  if (!def) return false;
  if (player.trailUnlocks[trailId]) return false;
  return player.orbs >= def.price;
}

export function buyTrail(trailId) {
  const def = TRAIL_SHOP.find((t) => t.id === trailId);
  if (!def) return false;
  if (player.trailUnlocks[trailId]) return false;
  if (player.orbs < def.price) return false;

  player.orbs -= def.price;
  player.trailUnlocks[trailId] = true;
  savePlayerToStorage();
  return true;
}

// Equip a new trail and ensure that it is rendered immediately
export function equipTrail(trailId) {
  if (!player.trailUnlocks[trailId]) return false;  // Ensure the trail is unlocked
  player.equippedTrailId = trailId;  // Set the equipped trail
  savePlayerToStorage();  // Save the equipped trail

  // Update the trail rendering in the game
  if (foxPlayer) {
    setTrailFox(foxPlayer);  // Refresh the trail rendering with the newly equipped trail
  }

  return true;
}
