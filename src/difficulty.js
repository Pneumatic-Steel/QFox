import {
  MIN_GAME_SPEED,
  MAX_GAME_SPEED,
  DIFFICULTY_SCORE_TARGET,
  DIFFICULTY_EXPONENT,
  BASE_SPAWN_RATE,
  MIN_SPAWN_RATE,
} from "./constants.js";

export function computeDifficultyFactor(score) {
  const raw = score / DIFFICULTY_SCORE_TARGET;
  const f = Math.min(Math.pow(raw, DIFFICULTY_EXPONENT), 1);
  return f;
}

export function computeGameSpeed(score) {
  const f = computeDifficultyFactor(score);
  return MIN_GAME_SPEED + (MAX_GAME_SPEED - MIN_GAME_SPEED) * f;
}

export function computeSpawnRate(score) {
  const f = computeDifficultyFactor(score);
  return BASE_SPAWN_RATE - f * (BASE_SPAWN_RATE - MIN_SPAWN_RATE);
}
