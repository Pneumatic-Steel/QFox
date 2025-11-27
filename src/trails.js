import { TRAIL_IDS, COLOR_SCHEMES } from "./constants.js";
import { player } from "./player.js";

// --- CONFIG ---

const TRAIL_SEGMENTS = 40;
const TRAIL_BASE_WIDTH = 0.9;
const TRAIL_MIN_WIDTH = 0.05;
const TRAIL_SMOOTH = 0.28;
const TRAIL_Z_OFFSET = 1.2;   // how far behind the fox the head of the trail starts
const TRAIL_Y_OFFSET = 0.4;   // lifted a bit off the floor
const TRAIL_LENGTH = 18.0;    // how far the tail stretches behind

let sceneRef = null;
let foxRef = null;

let trailInitialized = false;
let trailPoints = [];
let trailGeometry = null;
let trailMesh = null;

// Build a reversed palette from the floor color schemes
const baseFloorColors = COLOR_SCHEMES.map(c => new THREE.Color(c.floor));
const reversePalette = [...baseFloorColors].reverse();

// ---------- PUBLIC API ----------

export function initTrails(scene) {
  sceneRef = scene;
  trailInitialized = false;
  trailPoints = [];
  trailGeometry = null;
  trailMesh = null;
}

export function setTrailFox(foxMesh) {
  foxRef = foxMesh;
  if (!trailInitialized && sceneRef && foxRef) {
    initializeRibbonTrail();
  }
}

export function updateTrail(deltaTime, score) {
  if (!trailInitialized || !trailGeometry || !trailMesh || !foxRef) return;
  updateRibbonTrailInternal(score);
}

// ---------- INTERNAL IMPLEMENTATION ----------

function initializeRibbonTrail() {
  if (trailInitialized || !sceneRef || !foxRef) return;
  trailInitialized = true;

  trailPoints = [];
  const startPos = foxRef.position.clone();
  startPos.y += TRAIL_Y_OFFSET;

  for (let i = 0; i < TRAIL_SEGMENTS; i++) {
    trailPoints.push(startPos.clone());
  }

  const positionArray = new Float32Array(TRAIL_SEGMENTS * 2 * 3);
  const colorArray = new Float32Array(TRAIL_SEGMENTS * 2 * 3);

  trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

  const indices = [];
  for (let i = 0; i < TRAIL_SEGMENTS - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  trailGeometry.setIndex(indices);
  trailGeometry.computeBoundingSphere();

  const trailMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
  trailMesh.renderOrder = 0; // behind fox & orbs
  sceneRef.add(trailMesh);
}

function updateRibbonTrailInternal(score) {
  // Head of trail = fox position
  const headPos = foxRef.position.clone();
  headPos.y += TRAIL_Y_OFFSET;

  // Insert new head at front
  trailPoints.unshift(headPos);
  if (trailPoints.length > TRAIL_SEGMENTS) {
    trailPoints.pop();
  }

  // Smooth internal points (lag -> bend effect)
  for (let i = 1; i < trailPoints.length; i++) {
    trailPoints[i].lerp(trailPoints[i - 1], TRAIL_SMOOTH);
  }

  const positions = trailGeometry.attributes.position.array;
  const colors = trailGeometry.attributes.color.array;

  // Get base color for this trail style
  const trailId = player.equippedTrailId || TRAIL_IDS.DEFAULT;
  const paletteColor = computeTrailHeadColor(trailId, score);

  const laneDir = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i < TRAIL_SEGMENTS - 1; i++) {
    const tSeg = i / (TRAIL_SEGMENTS - 1);

    const pCurr = trailPoints[i];
    const pNext = trailPoints[i + 1] || pCurr;

    // Direction along trail
    const dir = new THREE.Vector3().subVectors(pNext, pCurr);
    let side = new THREE.Vector3().crossVectors(laneDir, dir);
    if (side.lengthSq() < 1e-6) {
      side.set(1, 0, 0);
    } else {
      side.normalize();
    }

    const width = THREE.MathUtils.lerp(TRAIL_BASE_WIDTH, TRAIL_MIN_WIDTH, tSeg);
    const halfWidth = width * 0.5;
    const offset = side.clone().multiplyScalar(halfWidth);

    const leftPos = pCurr.clone().add(offset);
    const rightPos = pCurr.clone().sub(offset);

    // Keep trail horizontal behind fox, stretching along +Z
    const stretch = TRAIL_LENGTH * tSeg;
    leftPos.z += (TRAIL_Z_OFFSET + stretch);
    rightPos.z += (TRAIL_Z_OFFSET + stretch);

    const vi = i * 2;

    positions[vi * 3 + 0] = leftPos.x;
    positions[vi * 3 + 1] = leftPos.y;
    positions[vi * 3 + 2] = leftPos.z;

    positions[(vi + 1) * 3 + 0] = rightPos.x;
    positions[(vi + 1) * 3 + 1] = rightPos.y;
    positions[(vi + 1) * 3 + 2] = rightPos.z;

    // Fade color toward tail
    const fade = THREE.MathUtils.lerp(1.0, 0.1, tSeg);
    const r = paletteColor.r * fade;
    const g = paletteColor.g * fade;
    const b = paletteColor.b * fade;

    colors[vi * 3 + 0] = r;
    colors[vi * 3 + 1] = g;
    colors[vi * 3 + 2] = b;

    colors[(vi + 1) * 3 + 0] = r;
    colors[(vi + 1) * 3 + 1] = g;
    colors[(vi + 1) * 3 + 2] = b;
  }

  // Close last segment by copying previous
  const lastIndex = (TRAIL_SEGMENTS - 1) * 2;
  const prevIndex = (TRAIL_SEGMENTS - 2) * 2;

  positions[lastIndex * 3 + 0] = positions[prevIndex * 3 + 0];
  positions[lastIndex * 3 + 1] = positions[prevIndex * 3 + 1];
  positions[lastIndex * 3 + 2] = positions[prevIndex * 3 + 2];

  positions[(lastIndex + 1) * 3 + 0] = positions[(prevIndex + 1) * 3 + 0];
  positions[(lastIndex + 1) * 3 + 1] = positions[(prevIndex + 1) * 3 + 1];
  positions[(lastIndex + 1) * 3 + 2] = positions[(prevIndex + 1) * 3 + 2];

  colors[lastIndex * 3 + 0] = colors[prevIndex * 3 + 0];
  colors[lastIndex * 3 + 1] = colors[prevIndex * 3 + 1];
  colors[lastIndex * 3 + 2] = colors[prevIndex * 3 + 2];

  colors[(lastIndex + 1) * 3 + 0] = colors[(prevIndex + 1) * 3 + 0];
  colors[(lastIndex + 1) * 3 + 1] = colors[(prevIndex + 1) * 3 + 1];
  colors[(lastIndex + 1) * 3 + 2] = colors[(prevIndex + 1) * 3 + 2];

  trailGeometry.attributes.position.needsUpdate = true;
  trailGeometry.attributes.color.needsUpdate = true;
  if (trailGeometry.boundingSphere) trailGeometry.boundingSphere = null;
  trailGeometry.computeBoundingSphere();
}

// ---------- COLOR LOGIC PER TRAIL TYPE ----------

function computeTrailHeadColor(trailId, score) {
  // Some time-based flicker to make trails feel alive
  const t = performance.now() * 0.001;

  switch (trailId) {
    case TRAIL_IDS.DEMON:
      // Blood red demon: flicker between deep red and almost black
      return new THREE.Color().setHSL(
        0.0, // red
        1.0,
        0.25 + 0.15 * Math.sin(t * 12.0)
      );

    case TRAIL_IDS.PIXEL:
      // Retro pixel: hard stepped colors cycling
      {
        const steps = [
          new THREE.Color("#ff0000"),
          new THREE.Color("#00ff00"),
          new THREE.Color("#0000ff"),
          new THREE.Color("#ffff00"),
          new THREE.Color("#ff00ff"),
          new THREE.Color("#00ffff"),
        ];
        const idx = Math.floor((t * 4 + score / 100) % steps.length);
        return steps[idx];
      }

    case TRAIL_IDS.GOLD:
      // Gold trail: warm yellow/orange shimmer
      {
        const base = new THREE.Color("#ffd700");
        const glow = new THREE.Color("#ff8c00");
        const lerpFactor = 0.5 + 0.5 * Math.sin(t * 5.0);
        return base.clone().lerp(glow, lerpFactor);
      }

    case TRAIL_IDS.GALAXY:
      // Galaxy: purple/blue starfield vibe, slow shifting
      {
        const c1 = new THREE.Color("#4b0082"); // indigo
        const c2 = new THREE.Color("#00bfff"); // deep sky blue
        const c3 = new THREE.Color("#ee82ee"); // violet
        const mix = (Math.sin(t * 0.7) + 1) / 2;
        const temp = c1.clone().lerp(c2, mix);
        const mix2 = (Math.sin(t * 1.3 + 1) + 1) / 2;
        return temp.lerp(c3, mix2 * 0.5);
      }

    case TRAIL_IDS.FIRE:
      // Fire: red/orange/yellow flicker
      {
        const c1 = new THREE.Color("#ff4500");
        const c2 = new THREE.Color("#ffff00");
        const flicker = 0.5 + 0.5 * Math.sin(t * 15.0);
        return c1.clone().lerp(c2, flicker);
      }

    case TRAIL_IDS.ICE:
      // Ice: cyan/white, cool and steady
      return new THREE.Color("#a0ffff");

    case TRAIL_IDS.LIGHTNING:
      // Lightning: white/blue, sharp flicker
      {
        const c1 = new THREE.Color("#ffffff");
        const c2 = new THREE.Color("#87cefa");
        const flick = (Math.sin(t * 30.0) + 1) / 2;
        return c1.clone().lerp(c2, flick * 0.8);
      }

    case TRAIL_IDS.DUST:
      // Earth dust: brownish
      return new THREE.Color("#a0522d");

    case TRAIL_IDS.POISON:
      // Poison mist: neon green
      return new THREE.Color("#39ff14");

    case TRAIL_IDS.AURORA:
      // Aurora: green/blue smooth movement
      {
        const c1 = new THREE.Color("#00ff99");
        const c2 = new THREE.Color("#00ccff");
        const mix = (Math.sin(t * 0.8) + 1) / 2;
        return c1.clone().lerp(c2, mix);
      }

    case TRAIL_IDS.SHADOW:
      // Shadow smoke: dark purple/black
      return new THREE.Color("#260033");

    case TRAIL_IDS.SOUL:
      // Soul flames: bright blue
      return new THREE.Color("#00bfff");

    case TRAIL_IDS.DIAMOND:
      // Diamond sparkle: white with blue tint
      return new THREE.Color("#e0f7ff");

    case TRAIL_IDS.SOLAR:
      // Solar flare: intense orange/red
      return new THREE.Color("#ff4500");

    case TRAIL_IDS.DEFAULT:
    default:
      // Default: use reversed floor palette blended by score
      {
        const num = reversePalette.length;
        const phase = (score / 250) % num;
        const baseIndex = Math.floor(phase) % num;
        const nextIndex = (baseIndex + 1) % num;
        const frac = phase - Math.floor(phase);

        const colA = reversePalette[baseIndex];
        const colB = reversePalette[nextIndex];
        return colA.clone().lerp(colB, frac);
      }
  }
}
