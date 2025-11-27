import { TRAIL_IDS } from "./constants.js";
import { player } from "./player.js";

// Simple vertical Tron-style trail panel behind the fox.

let sceneRef = null;
let foxRef = null;
let trailMesh = null;
let trailMaterial = null;

export function initTrails(scene) {
  sceneRef = scene;
  if (sceneRef && foxRef && !trailMesh) {
    createTrailMesh();
  }
}

export function setTrailFox(foxMesh) {
  foxRef = foxMesh;
  if (sceneRef && foxRef && !trailMesh) {
    createTrailMesh();
  }
}

function createTrailMesh() {
  // Vertical panel behind the fox: width x height
  const geo = new THREE.PlaneGeometry(1.6, 5.0, 1, 1);

  trailMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  trailMesh = new THREE.Mesh(geo, trailMaterial);
  trailMesh.renderOrder = 0; // behind fox & orbs

  if (sceneRef) {
    sceneRef.add(trailMesh);
  }
}

// Pick base colors for each trail ID
function getTrailColors(trailId) {
  switch (trailId) {
    case TRAIL_IDS.DEMON:
      return [0xff0000, 0xff6600]; // red → orange
    case TRAIL_IDS.PIXEL:
      return [0x00ffff, 0x00ff88]; // cyan → green
    case TRAIL_IDS.GOLD:
      return [0xffd700, 0xff8c00]; // gold → orange
    case TRAIL_IDS.GALAXY:
      return [0x8b5cf6, 0x22d3ee]; // purple → teal
    case TRAIL_IDS.FIRE:
      return [0xff4500, 0xffff00]; // red-orange → yellow
    case TRAIL_IDS.ICE:
      return [0xa0ffff, 0xffffff]; // cyan → white
    case TRAIL_IDS.LIGHTNING:
      return [0x7df9ff, 0xffffff]; // electric blue → white
    case TRAIL_IDS.DUST:
      return [0xcbd5f5, 0x9ca3af]; // dusty blue/gray
    case TRAIL_IDS.POISON:
      return [0x22c55e, 0xa3e635]; // toxic green
    case TRAIL_IDS.AURORA:
      return [0x22c1c3, 0xfdbb2d]; // aurora blend
    case TRAIL_IDS.SHADOW:
      return [0x111827, 0x4b5563]; // dark smoke
    case TRAIL_IDS.SOUL:
      return [0x6366f1, 0x22d3ee]; // soul flame
    case TRAIL_IDS.DIAMOND:
      return [0xe0f2fe, 0xffffff]; // icy white
    case TRAIL_IDS.SOLAR:
      return [0xfff000, 0xff4b1f]; // yellow → solar flare
    default:
      // Default "QFox" teal/blue
      return [0x00ffff, 0x0088ff];
  }
}

// Called every frame from game.js
export function updateTrail(deltaTime, score) {
  if (!trailMesh || !foxRef) return;

  // Position the panel slightly behind and around the fox
  trailMesh.position.set(
    foxRef.position.x,
    foxRef.position.y + 1.2,      // center vertically around fox
    foxRef.position.z + 1.2       // just behind fox
  );

  // Make the panel stand vertical like a Tron wall,
  // facing roughly toward the camera
  trailMesh.lookAt(
    foxRef.position.x,
    foxRef.position.y + 1.2,
    foxRef.position.z - 10
  );

  // Color pulse based on equipped trail
  const trailId = player.equippedTrailId || TRAIL_IDS.DEFAULT;
  const [c1Hex, c2Hex] = getTrailColors(trailId);
  const c1 = new THREE.Color(c1Hex);
  const c2 = new THREE.Color(c2Hex);

  const t = performance.now() * 0.001;
  const pulse = (Math.sin(t * 2.4) + 1) / 2; // 0..1
  const color = c1.clone().lerp(c2, pulse);

  trailMaterial.color.copy(color);
  trailMaterial.opacity = 0.4 + 0.4 * pulse;

  // Stretch trail length a bit with score for extra drama
  const lengthScale = 1.0 + Math.min(score / 800, 1.5); // max 2.5x
  trailMesh.scale.set(1.0, lengthScale, 1.0);
}
