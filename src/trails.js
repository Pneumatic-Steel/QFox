// REAL RIBBON TRAIL — ported from game (1).js and adapted for modular engine

import { TRAIL_IDS } from "./constants.js";
import { player } from "./player.js";

/* ============================================
   TRAIL CONFIG
============================================ */

const TRAIL_SEGMENTS = 40;       // more = smoother ribbon
const TRAIL_BASE_WIDTH = 0.9;    // widest near the fox
const TRAIL_MIN_WIDTH = 0.05;    // thinnest at the tail
const TRAIL_SMOOTH = 0.28;       // how much the ribbon bends
const TRAIL_Z_OFFSET = 1.2;      // how far behind fox
const TRAIL_Y_OFFSET = 0.35;     // slight lift above floor
const TRAIL_LENGTH = 18.0;       // full length behind fox

/* ============================================
   INTERNAL STATE
============================================ */

let sceneRef = null;
let foxRef = null;

let trailInitialized = false;
let trailPoints = [];
let trailGeometry = null;
let trailMesh = null;

/* ============================================
   INITIALIZATION
============================================ */

export function initTrails(scene) {
  sceneRef = scene;
  maybeInitTrail();
}

export function setTrailFox(foxMesh) {
  foxRef = foxMesh;
  maybeInitTrail();
}

function maybeInitTrail() {
  if (!sceneRef || !foxRef || trailInitialized) return;
  initRibbonTrail();
}

/* ============================================
   CREATE RIBBON TRAIL
============================================ */

function initRibbonTrail() {
  trailInitialized = true;

  trailPoints = [];
  const startPos = foxRef.position.clone();
  startPos.y += TRAIL_Y_OFFSET;

  // Initialize trail to fox position so it doesn't explode on first frame
  for (let i = 0; i < TRAIL_SEGMENTS; i++) {
    trailPoints.push(startPos.clone());
  }

  const posArr = new Float32Array(TRAIL_SEGMENTS * 2 * 3);
  const colArr = new Float32Array(TRAIL_SEGMENTS * 2 * 3);

  trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(colArr, 3));

  const indices = [];
  for (let i = 0; i < TRAIL_SEGMENTS - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  trailGeometry.setIndex(indices);

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  trailMesh = new THREE.Mesh(trailGeometry, material);
  trailMesh.renderOrder = 0;
  sceneRef.add(trailMesh);
}

/* ============================================
   TRAIL COLOR LOOKUP (mapped to your shop IDs)
============================================ */

function getColorsForTrail(trailId) {
  switch (trailId) {
    case TRAIL_IDS.DEMON: return [0xff0000, 0xff6600];
    case TRAIL_IDS.PIXEL: return [0x00ffff, 0x00ff88];
    case TRAIL_IDS.GOLD: return [0xffd700, 0xff8c00];
    case TRAIL_IDS.GALAXY: return [0x8b5cf6, 0x22d3ee];
    case TRAIL_IDS.FIRE: return [0xff4500, 0xffff00];
    case TRAIL_IDS.ICE: return [0xa0ffff, 0xffffff];
    case TRAIL_IDS.LIGHTNING: return [0x7df9ff, 0xffffff];
    case TRAIL_IDS.DUST: return [0xcbd5f5, 0x9ca3af];
    case TRAIL_IDS.POISON: return [0x22c55e, 0xa3e635];
    case TRAIL_IDS.AURORA: return [0x22c1c3, 0xfdbb2d];
    case TRAIL_IDS.SHADOW: return [0x111827, 0x4b5563];
    case TRAIL_IDS.SOUL: return [0x6366f1, 0x22d3ee];
    case TRAIL_IDS.DIAMOND: return [0xe0f2fe, 0xffffff];
    case TRAIL_IDS.SOLAR: return [0xfff000, 0xff4b1f];

    default:
      return [0x00ffff, 0x0088ff];
  }
}

/* ============================================
   UPDATE TRAIL — CALLED EVERY FRAME
============================================ */

export function updateTrail(deltaFrames, score) {
  if (!trailInitialized || !foxRef) return;

  const head = foxRef.position.clone();
  head.y += TRAIL_Y_OFFSET;

  trailPoints.unshift(head);
  if (trailPoints.length > TRAIL_SEGMENTS) {
    trailPoints.pop();
  }

  // Smooth out the trail positions as it moves
  for (let i = 1; i < trailPoints.length; i++) {
    trailPoints[i].lerp(trailPoints[i - 1], TRAIL_SMOOTH);
  }

  const pos = trailGeometry.attributes.position.array;
  const col = trailGeometry.attributes.color.array;

  // Get colors based on trail ID
  const [c1Hex, c2Hex] = getColorsForTrail(player.equippedTrailId);
  const colorA = new THREE.Color(c1Hex);
  const colorB = new THREE.Color(c2Hex);

  // Pulse effect on the trail color
  const tPulse = (Math.sin(performance.now() * 0.0025) + 1) / 2;
  const headColor = colorA.clone().lerp(colorB, tPulse);

  // Loop through trail points to update position, color, and width
  for (let i = 0; i < TRAIL_SEGMENTS - 1; i++) {
    const tSeg = i / (TRAIL_SEGMENTS - 1);

    const p = trailPoints[i];
    const pNext = trailPoints[i + 1];

    // Direction of the trail
    const dir = new THREE.Vector3().subVectors(pNext, p);
    let side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));

    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();

    // Taper the trail width from front (fox) to tail
    const width = THREE.MathUtils.lerp(TRAIL_BASE_WIDTH, TRAIL_MIN_WIDTH, tSeg);
    const half = width * 0.5;
    const offset = side.multiplyScalar(half);

    const L = p.clone().add(offset);
    const R = p.clone().sub(offset);

    L.y -= half;
    R.y -= half;

    // Stretch the trail as it moves
    const stretch = TRAIL_LENGTH * tSeg;
    L.z += (TRAIL_Z_OFFSET + stretch);
    R.z += (TRAIL_Z_OFFSET + stretch);

    const idx = i * 2;

    // Set the positions for each segment of the trail
    pos[idx * 3 + 0] = L.x;
    pos[idx * 3 + 1] = L.y;
    pos[idx * 3 + 2] = L.z;

    pos[(idx + 1) * 3 + 0] = R.x;
    pos[(idx + 1) * 3 + 1] = R.y;
    pos[(idx + 1) * 3 + 2] = R.z;

    // Apply the color with fading from front to tail
    const fade = THREE.MathUtils.lerp(1.0, 0.1, tSeg);
    const r = headColor.r * fade;
    const g = headColor.g * fade;
    const b = headColor.b * fade;

    col[idx * 3 + 0] = r;
    col[idx * 3 + 1] = g;
    col[idx * 3 + 2] = b;

    col[(idx + 1) * 3 + 0] = r;
    col[(idx + 1) * 3 + 1] = g;
    col[(idx + 1) * 3 + 2] = b;
  }

  // Mark the geometry as needing an update
  trailGeometry.attributes.position.needsUpdate = true;
  trailGeometry.attributes.color.needsUpdate = true;
  trailGeometry.computeBoundingSphere();
}
