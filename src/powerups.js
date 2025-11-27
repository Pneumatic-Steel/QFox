import {
  SHIELD_DURATION,
  MULTIPLIER_DURATION,
} from "./constants.js";

import {
  player,
  savePlayerToStorage
} from "./player.js";

// Each update tick will call updatePowerups(deltaTime)
// from inside game.js

export function applyShield() {
  // Already has shield? Refresh? 
  // NO — only one shield max
  if (player.shieldActive) return;

  player.shieldActive = true;
  player.shieldUntil = performance.now() + SHIELD_DURATION;

  // TODO: trigger shield bubble visual (in game.js)
  // game.showShieldBubble();
}

export function breakShield() {
  if (!player.shieldActive) return;

  // Remove shield
  player.shieldActive = false;
  player.shieldUntil = 0;

  // TODO: bubble pop animation
  // game.popShieldBubble();
}

export function applyMultiplier() {
  const now = performance.now();

  // If multiplier already active, refresh time instead of stacking
  if (player.multiplierActive) {
    player.multiplierUntil = now + MULTIPLIER_DURATION;
    return;
  }

  player.multiplierActive = true;
  player.multiplierUntil = now + MULTIPLIER_DURATION;
  player.scoreMultiplier = 2;

  // TODO: Enable floor rainbow effect
  // game.startFloorRainbow();
}

export function endMultiplier() {
  if (!player.multiplierActive) return;

  player.multiplierActive = false;
  player.multiplierUntil = 0;
  player.scoreMultiplier = 1;

  // TODO: Disable floor rainbow effect
  // game.stopFloorRainbow();
}

// Called every frame in game.js
export function updatePowerups() {
  const now = performance.now();

  // Shield timeout (rare — shield usually breaks, not expires)
  if (player.shieldActive && now > player.shieldUntil) {
    breakShield();
  }

  // Multiplier timeout
  if (player.multiplierActive && now > player.multiplierUntil) {
    endMultiplier();
  }
}

/**
 * Power-up collision handler
 * Called from collisions.js when fox touches shield or multiplier power-ups
 */

export function onPowerupCollected(type) {
  if (type === "shield") {
    applyShield();
  } else if (type === "multiplier") {
    applyMultiplier();
  }

  savePlayerToStorage();
}

