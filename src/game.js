// src/game.js

import {
  GAME_STATE,
  LANE_POSITIONS,
  FOX_BASE_HEIGHT,
  COLOR_SCHEMES,
} from "./constants.js";

import { ASSETS } from "./assets.js";

import {
  player,
  initPlayerFromStorage,
  resetPlayerForRun,
  addScore,
} from "./player.js";

import {
  initFirebase,
  saveHighScore,
  loadLeaderboard,
} from "./firebase.js";

import {
  initUI,
  showMenu,
  showGameOver,
  updateScoreLabel,
  updateOrbsLabel,
} from "./ui.js";

import {
  initTrails,
  setTrailFox,
  updateTrail,
} from "./trails.js";

import {
  initObstacles,
  updateObstacles,
  obstacles,
  powerups,
  removeObstacleMesh,
  removePowerupMesh,
} from "./obstacles.js";

import {
  handleObstacleCollisions,
  handlePowerupCollisions,
} from "./collisions.js";

import { updatePowerups } from "./powerups.js";

import { computeGameSpeed } from "./difficulty.js";

// --------------------------------------------------
// GLOBALS
// --------------------------------------------------

let scene, camera, renderer;
let foxPlayer = null;
let floorMesh = null;
let floorTexture = null;
let bgm = null;

let gameState = GAME_STATE.MENU;
let gameSpeed = 0.25;
let runningTime = 0;

const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
let lastTime = performance.now();

const textureLoader = new THREE.TextureLoader();

// --------------------------------------------------
// MUSIC
// --------------------------------------------------

function initializeMusic() {
  bgm = new Audio(ASSETS.MUSIC_URL);
  bgm.loop = true;
  bgm.volume = 0.7;
}

// --------------------------------------------------
// THREE SCENE SETUP
// --------------------------------------------------

function setupVideoBackground() {
  try {
    const vid = document.createElement("video");
    vid.src = ASSETS.BACKGROUND_VIDEO_URL;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.play().catch(() => {});

    const vtex = new THREE.VideoTexture(vid);
    vtex.minFilter = THREE.LinearFilter;
    vtex.magFilter = THREE.LinearFilter;
    scene.background = vtex;
  } catch (e) {
    console.warn("Video background failed:", e);
  }
}

function createFox() {
  const geo = new THREE.PlaneGeometry(1.8, 1.8);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    color: 0xffffff,
  });

  foxPlayer = new THREE.Mesh(geo, mat);

  textureLoader.load(
    ASSETS.FOX_HEAD_URL,
    (tex) => {
      tex.encoding = THREE.sRGBEncoding;
      foxPlayer.material.map = tex;
      foxPlayer.material.needsUpdate = true;
    },
    undefined,
    (err) => console.warn("Fox head texture load failed:", err)
  );

  foxPlayer.position.set(LANE_POSITIONS[player.laneIndex], FOX_BASE_HEIGHT, 5);
  foxPlayer.renderOrder = 2;
  scene.add(foxPlayer);

  // give trails a reference
  setTrailFox(foxPlayer);
}

function createTrack() {
  const trackWidth = 18;
  const trackLength = 600;
  const floorGeo = new THREE.PlaneGeometry(trackWidth, trackLength, 1, 1);

  floorTexture = textureLoader.load(
    ASSETS.FLOOR_IMAGE_URL,
    (t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 60);
      t.encoding = THREE.sRGBEncoding;
    },
    undefined,
    (err) => console.warn("Floor texture load failed:", err)
  );

  const floorMat = new THREE.MeshBasicMaterial({
    map: floorTexture,
    side: THREE.DoubleSide,
  });

  floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0, 0);
  scene.add(floorMesh);

  // basic fog
  const initialFogColor = new THREE.Color(COLOR_SCHEMES[0].fog);
  scene.fog = new THREE.Fog(initialFogColor, 40, 150);
}

// Color progression for floor+fog based on score
function updateFloorAndBackground() {
  if (!floorMesh || !scene.fog) return;

  const numColors = COLOR_SCHEMES.length;
  let levelIndex = Math.floor(player.score / 250) % numColors;
  const nextIndex = (levelIndex + 1) % numColors;
  const t = (player.score % 250) / 250;

  const cFloor = new THREE.Color(COLOR_SCHEMES[levelIndex].floor);
  const cFloorNext = new THREE.Color(COLOR_SCHEMES[nextIndex].floor);
  const floorColor = cFloor.clone().lerp(cFloorNext, t);

  floorMesh.material.color = floorColor;
  floorMesh.material.needsUpdate = true;

  const cFog = new THREE.Color(COLOR_SCHEMES[levelIndex].fog);
  const cFogNext = new THREE.Color(COLOR_SCHEMES[nextIndex].fog);
  const fogColor = cFog.clone().lerp(cFogNext, t);

  scene.fog.color = fogColor;
}

// --------------------------------------------------
// INPUT
// --------------------------------------------------

function moveFoxToLane(newLane) {
  if (gameState !== GAME_STATE.PLAYING) return;
  if (!foxPlayer) return;
  if (newLane < 0 || newLane > 2) return;

  player.laneIndex = newLane;
  const targetX = LANE_POSITIONS[newLane];

  TWEEN.removeAll();
  new TWEEN.Tween(foxPlayer.position)
    .to({ x: targetX }, 150)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();
}

function onKeyDown(e) {
  if (e.target && e.target.tagName === "INPUT") return;

  if (gameState !== GAME_STATE.PLAYING) return;

  if (e.code === "KeyA" || e.code === "ArrowLeft") {
    moveFoxToLane(player.laneIndex - 1);
  } else if (e.code === "KeyD" || e.code === "ArrowRight") {
    moveFoxToLane(player.laneIndex + 1);
  }
}

function onTouchEnd(e) {
  if (gameState !== GAME_STATE.PLAYING) return;
  if (!e.changedTouches || e.changedTouches.length === 0) return;

  const touchX = e.changedTouches[0].clientX;
  const screenWidth = window.innerWidth;

  if (touchX < screenWidth / 2) {
    moveFoxToLane(player.laneIndex - 1);
  } else {
    moveFoxToLane(player.laneIndex + 1);
  }
}

// --------------------------------------------------
// GAME FLOW
// --------------------------------------------------

function startRun() {
  resetPlayerForRun();
  updateScoreLabel(player.score);
  updateOrbsLabel();

  gameSpeed = computeGameSpeed(player.score);
  runningTime = 0;

  // reset fox pos
  if (foxPlayer) {
    foxPlayer.position.x = LANE_POSITIONS[player.laneIndex];
    foxPlayer.position.y = FOX_BASE_HEIGHT;
    foxPlayer.position.z = 5;
  }

  // clear obstacles & powerups
  initObstacles(scene);

  // restart music
  if (bgm) {
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
  }

  gameState = GAME_STATE.PLAYING;
}

function doGameOver() {
  if (gameState !== GAME_STATE.PLAYING) return;
  gameState = GAME_STATE.GAME_OVER;

  if (bgm) bgm.pause();

  // high score
  if (player.score > player.highScore) {
    player.highScore = player.score;
    saveHighScore(player.highScore);
  }

  showGameOver(player.score);
}

// called from UI (we expose startRun via window)
window.startGame = () => {
  startRun();
};

// leaderboard loader for UI
window.loadLeaderboard = () => {
  loadLeaderboard();
};

// --------------------------------------------------
// MAIN UPDATE LOOP
// --------------------------------------------------

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const deltaMs = now - lastTime;
  lastTime = now;
  const deltaFrames = deltaMs / FRAME_TIME;

  TWEEN.update();

  if (gameState === GAME_STATE.PLAYING) {
    // update speed by score
    gameSpeed = computeGameSpeed(player.score);

    // fox bobbing
    if (foxPlayer) {
      runningTime += 0.11 * deltaFrames;
      foxPlayer.position.y =
        FOX_BASE_HEIGHT + Math.sin(runningTime * 5) * 0.1;
    }

    // scroll floor texture
    if (floorTexture) {
      floorTexture.offset.y += gameSpeed * 0.02 * deltaFrames;
    }

    // update floor color + fog
    updateFloorAndBackground();

    // update powerups timers (shield/multiplier)
    updatePowerups();

    // obstacles + powerups movement + spawn + score
    updateObstacles(
      deltaFrames,
      gameSpeed,
      player.score,
      foxPlayer ? foxPlayer.position.z : 5,
      (basePoints) => {
        const { scoreGained, orbsGained } = addScore(basePoints);
        if (scoreGained !== 0) {
          updateScoreLabel(player.score);
        }
        if (orbsGained !== 0) {
          updateOrbsLabel();
        }
      }
    );

    // collisions
    handleObstacleCollisions(
      foxPlayer,
      obstacles,
      () => doGameOver(),
      (obs) => removeObstacleMesh(obs)
    );

    handlePowerupCollisions(
      foxPlayer,
      powerups,
      (p) => removePowerupMesh(p)
    );

    // trails
    updateTrail(deltaFrames, player.score);

    // billboard all billboards towards camera
    if (camera) {
      for (const orb of obstacles) {
        if (orb.userData && orb.userData.billboard && orb.lookAt) {
          orb.lookAt(camera.position);
        }
        const halo = orb.userData.halo;
        if (halo && halo.lookAt) {
          halo.lookAt(camera.position);
        }
      }

      for (const p of powerups) {
        if (p.userData && p.userData.billboard && p.lookAt) {
          p.lookAt(camera.position);
        }
      }
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// --------------------------------------------------
// INIT
// --------------------------------------------------

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initThree() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 3.5, 10);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  const container = document.getElementById("game-container");
  container.appendChild(renderer.domElement);

  const amb = new THREE.AmbientLight(0xffffff, 3);
  scene.add(amb);

  const spot = new THREE.SpotLight(0xffffff, 6, 50, Math.PI / 6, 0.3);
  spot.position.set(0, 10, 10);
  scene.add(spot);

  setupVideoBackground();
  createTrack();
  createFox();

  initTrails(scene);

  window.addEventListener("resize", onResize);
}

// --------------------------------------------------
// BOOTSTRAP
// --------------------------------------------------

window.addEventListener("load", () => {
  initializeMusic();
  initPlayerFromStorage();
  initFirebase();
  initUI();
  initThree();

  // start in menu
  showMenu();

  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("touchend", onTouchEnd, { passive: true });

  animate();
});
