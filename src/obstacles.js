// src/obstacles.js

import {
  LANE_POSITIONS,
  BASE_SPAWN_RATE,
  MIN_SPAWN_RATE,
  SHIELD_SPAWN_CHANCE,
  MULTIPLIER_SPAWN_CHANCE,
} from "./constants.js";

import { ASSETS } from "./assets.js";

// external state (arrays exported so game.js & collisions.js can use them)
export const obstacles = [];  // orb meshes
export const powerups = [];   // shield / multiplier meshes

let sceneRef = null;
let spawnTimer = 0;
let currentSpawnInterval = BASE_SPAWN_RATE;

// simple sizes
const OBSTACLE_SIZE = 2.6;
const HALO_SIZE = 3.0;
const ORB_WIDTH_RATIO = 1.5;

const loader = new THREE.TextureLoader();

function loadTexture(url, onTex) {
  loader.load(
    url,
    (tex) => {
      tex.encoding = THREE.sRGBEncoding;
      onTex(tex);
    },
    undefined,
    () => console.warn("Failed to load texture:", url)
  );
}

export function initObstacles(scene) {
  sceneRef = scene;
  spawnTimer = 0;
  currentSpawnInterval = BASE_SPAWN_RATE;

  // clear any existing
  for (const o of obstacles) sceneRef.remove(o);
  for (const p of powerups) sceneRef.remove(p);
  obstacles.length = 0;
  powerups.length = 0;
}

// ------------------ SPAWN HELPERS ------------------

function spawnOrb(laneIndex) {
  if (!sceneRef) return;

  const laneX = LANE_POSITIONS[laneIndex];
  const startZ = -120;

  // Halo
  const haloGeo = new THREE.PlaneGeometry(HALO_SIZE, HALO_SIZE);
  const haloMat = new THREE.MeshBasicMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.75,
  });

  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.set(laneX, 1.35, startZ - 0.3);
  halo.userData.billboard = true;

  loadTexture(ASSETS.HALO_URL, (tex) => {
    haloMat.map = tex;
    haloMat.needsUpdate = true;
  });

  halo.renderOrder = 1;
  sceneRef.add(halo);

  // Orb
  const orbGeo = new THREE.PlaneGeometry(
    OBSTACLE_SIZE * ORB_WIDTH_RATIO,
    OBSTACLE_SIZE
  );
  const orbMat = new THREE.MeshBasicMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    color: 0xffffff,
  });

  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.set(laneX, 1.35, startZ);
  orb.userData.halo = halo;
  orb.userData.lane = laneIndex;
  orb.userData.scored = false;
  orb.userData.billboard = true;

  loadTexture(ASSETS.OBSTACLE_URL, (tex) => {
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    orbMat.map = tex;
    orbMat.needsUpdate = true;
  });

  orb.renderOrder = 2;
  obstacles.push(orb);
  sceneRef.add(orb);

  return orb;
}

function spawnPowerup(laneIndex, type) {
  if (!sceneRef) return;

  const laneX = LANE_POSITIONS[laneIndex];
  const startZ = -120;
  const size = 2.2;

  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(laneX, 1.7, startZ);
  mesh.userData.powerupType = type;
  mesh.userData.billboard = true;

  const url =
    type === "shield" ? ASSETS.SHIELD_URL : ASSETS.BONUS_URL;

  loadTexture(url, (tex) => {
    mat.map = tex;
    mat.needsUpdate = true;
  });

  mesh.renderOrder = 2;
  sceneRef.add(mesh);
  powerups.push(mesh);
  return mesh;
}

// ------------------ UPDATE / MOVEMENT / SPAWN ------------------

export function updateObstacles(deltaFrames, gameSpeed, score, foxZ, onScoreGain) {
  if (!sceneRef) return;

  // difficulty-based spawn interval
  const difficultyFactor = Math.min(score / 1500, 1);
  currentSpawnInterval = BASE_SPAWN_RATE -
    difficultyFactor * (BASE_SPAWN_RATE - MIN_SPAWN_RATE);

  spawnTimer += deltaFrames;
  if (spawnTimer >= currentSpawnInterval) {
    spawnTimer = 0;

    const lane = Math.floor(Math.random() * LANE_POSITIONS.length);

    // Rare powerup spawn; decide type with weighted chance
    const roll = Math.random();
    if (roll < SHIELD_SPAWN_CHANCE) {
      spawnPowerup(lane, "shield");
    } else if (roll < SHIELD_SPAWN_CHANCE + MULTIPLIER_SPAWN_CHANCE) {
      spawnPowerup(lane, "multiplier");
    } else {
      spawnOrb(lane);
    }
  }

  const moveZ = gameSpeed * deltaFrames;

  // Move orbs
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const orb = obstacles[i];
    orb.position.z += moveZ;

    const halo = orb.userData.halo;
    if (halo) {
      halo.position.x = orb.position.x;
      halo.position.z = orb.position.z - 0.3;
    }

    // score when passed
    if (!orb.userData.scored && orb.position.z > foxZ + 2) {
      orb.userData.scored = true;
      if (onScoreGain) onScoreGain(10);
    }

    // cleanup
    if (orb.position.z > 100) {
      sceneRef.remove(orb);
      obstacles.splice(i, 1);

      if (halo) sceneRef.remove(halo);
    }
  }

  // Move powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.position.z += moveZ;

    if (p.position.z > 100) {
      sceneRef.remove(p);
      powerups.splice(i, 1);
    }
  }
}

export function removeObstacleMesh(mesh) {
  if (!sceneRef) return;
  const i = obstacles.indexOf(mesh);
  if (i !== -1) {
    sceneRef.remove(mesh);
    obstacles.splice(i, 1);
  }
  const halo = mesh.userData.halo;
  if (halo) sceneRef.remove(halo);
}

export function removePowerupMesh(mesh) {
  if (!sceneRef) return;
  const i = powerups.indexOf(mesh);
  if (i !== -1) {
    sceneRef.remove(mesh);
    powerups.splice(i, 1);
  }
}
