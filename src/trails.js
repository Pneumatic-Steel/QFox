import { TRAIL_IDS } from "./constants.js";
import { player } from "./player.js"; // Import the player object

let sceneRef = null;
let foxRef = null;

let trailInitialized = false;
let trailPoints = [];
let trailGeometry = null;
let trailMesh = null;

export function setTrailFox(foxMesh) {
  if (!foxMesh) return; // Ensure the fox mesh exists before proceeding

  // Set the fox reference if not already set
  foxRef = foxMesh;

  // Get the correct trail ID based on the equipped trail
  const trailId = player.equippedTrailId;
  
  // Initialize the trail with the proper colors based on the trail ID
  const trailColors = getColorsForTrail(trailId); // Function to return trail colors based on equipped trail

  // Create or update the trail geometry and material for the new trail
  if (!trailInitialized) {
    initRibbonTrail(); // Initialize if not already initialized
  } else {
    // If the trail is already initialized, just update its color
    trailMesh.material.color.set(trailColors[0]);
    trailMesh.geometry.attributes.color.needsUpdate = true;
  }
}

function initRibbonTrail() {
  trailInitialized = true;  // Set the flag to indicate the trail is initialized

  trailPoints = [];
  const startPos = foxRef.position.clone();
  startPos.y += 0.35; // Slight lift above the floor for the trail

  // Initialize trail to the current position of the fox
  for (let i = 0; i < 40; i++) {
    trailPoints.push(startPos.clone());
  }

  const posArr = new Float32Array(40 * 2 * 3);  // 40 trail segments, each has 2 points (left, right)
  const colArr = new Float32Array(40 * 2 * 3);

  trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(colArr, 3));

  const indices = [];
  for (let i = 0; i < 39; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  trailGeometry.setIndex(indices);

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  trailMesh = new THREE.Mesh(trailGeometry, material);
  trailMesh.renderOrder = 0; // Ensure the trail is rendered on top of other objects
  sceneRef.add(trailMesh);
}

// Get the colors based on the trail ID
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
      return [0x00ffff, 0x0088ff];  // Default color if not matched
  }
}

// Update the trail position and color every frame
export function updateTrail(deltaFrames, score) {
  if (!trailInitialized || !foxRef) return;

  const head = foxRef.position.clone();
  head.y += 0.35;  // Slight lift above the floor

  trailPoints.unshift(head);
  if (trailPoints.length > 40) {
    trailPoints.pop();
  }

  // Smooth out the trail positions as it moves
  for (let i = 1; i < trailPoints.length; i++) {
    trailPoints[i].lerp(trailPoints[i - 1], 0.28);  // Smoothing factor
  }

  const pos = trailGeometry.attributes.position.array;
  const col = trailGeometry.attributes.color.array;

  const [c1Hex, c2Hex] = getColorsForTrail(player.equippedTrailId);  // Get the colors based on equipped trail
  const colorA = new THREE.Color(c1Hex);
  const colorB = new THREE.Color(c2Hex);

  // Pulse effect on the trail color
  const tPulse = (Math.sin(performance.now() * 0.0025) + 1) / 2;
  const headColor = colorA.clone().lerp(colorB, tPulse);

  // Loop through trail points to update position, color, and width
  for (let i = 0; i < 39; i++) {
    const tSeg = i / 39;

    const p = trailPoints[i];
    const pNext = trailPoints[i + 1];

    // Direction of the trail
    const dir = new THREE.Vector3().subVectors(pNext, p);
    let side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));

    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();

    // Taper the trail width from front (fox) to tail
    const width = THREE.MathUtils.lerp(0.9, 0.05, tSeg);
    const half = width * 0.5;
    const offset = side.multiplyScalar(half);

    const L = p.clone().add(offset);
    const R = p.clone().sub(offset);

    L.y -= half;
    R.y -= half;

    const stretch = 18.0 * tSeg;
    L.z += (1.2 + stretch);
    R.z += (1.2 + stretch);

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
