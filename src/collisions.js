import { COLLISION_RADIUS, COLLISION_RADIUS_SQ } from "./constants.js";
import { player } from "./player.js";
import { breakShield, onPowerupCollected } from "./powerups.js";

/**
 * Handle collisions with obstacles (orbs).
 *
 * @param {THREE.Mesh} foxMesh - the player mesh
 * @param {THREE.Mesh[]} obstacles - array of orb meshes
 * @param {Function} onGameOver - called when collision kills player
 * @param {Function} onObstacleConsumed - called when orb is removed (e.g. by shield), receives (obs)
 */
export function handleObstacleCollisions(foxMesh, obstacles, onGameOver, onObstacleConsumed) {
  if (!foxMesh || !obstacles) return;
  const foxPos = foxMesh.position;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const pos = obs.position;

    const dx = pos.x - foxPos.x;
    const dz = pos.z - foxPos.z;
    const distSq = dx * dx + dz * dz;

    if (distSq <= COLLISION_RADIUS_SQ) {
      // If shield is active, consume the orb and break the shield instead of killing
      if (player.shieldActive) {
        breakShield();
        if (onObstacleConsumed) onObstacleConsumed(obs);
        // Shield eats this hit; continue checking others
        continue;
      }

      // No shield -> game over
      if (onGameOver) onGameOver();
      return; // stop checking once dead
    }
  }
}

/**
 * Handle collisions with powerups (shield / multiplier).
 *
 * Each powerup mesh MUST have userData.powerupType set to:
 *  - "shield"
 *  - "multiplier"
 *
 * @param {THREE.Mesh} foxMesh
 * @param {THREE.Mesh[]} powerups
 * @param {Function} onPowerupConsumed - called when powerup is picked up, receives (mesh)
 */
export function handlePowerupCollisions(foxMesh, powerups, onPowerupConsumed) {
  if (!foxMesh || !powerups) return;
  const foxPos = foxMesh.position;

  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    const pos = p.position;

    const dx = pos.x - foxPos.x;
    const dz = pos.z - foxPos.z;
    const distSq = dx * dx + dz * dz;

    // Use a slightly smaller radius for powerups so they feel precise
    const radiusSq = (COLLISION_RADIUS * 0.9) * (COLLISION_RADIUS * 0.9);

    if (distSq <= radiusSq) {
      const type = p.userData.powerupType;
      if (type === "shield" || type === "multiplier") {
        onPowerupCollected(type);
      }

      if (onPowerupConsumed) onPowerupConsumed(p);
    }
  }
}
