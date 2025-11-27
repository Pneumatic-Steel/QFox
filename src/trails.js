// trails.js
import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js";
import { player } from "./player.js";

let trailMesh = null;
let trailColor = new THREE.Color(0x00ffff); // default
let trailGroup = null;

// Which trails exist
export const TRAILS = {
  default: { name: "Default Energy", color1: "#00ffff", color2: "#0088ff" },
  flame:   { name: "Fox Flame",     color1: "#ff8800", color2: "#ff0044" },
  neon:    { name: "Neon Pulse",    color1: "#00ff88", color2: "#0066ff" },
  royal:   { name: "Royal Burst",   color1: "#8866ff", color2: "#ff44ff" },
  gold:    { name: "Golden Fox",    color1: "#ffcc00", color2: "#ff8800" },
};

// Called from game.js AFTER scene & fox exist
export function initTrail(scene) {
  trailGroup = new THREE.Group();
  scene.add(trailGroup);

  // long vertical glowing card
  const geo = new THREE.PlaneGeometry(0.8, 4, 1, 1);

  const mat = new THREE.MeshBasicMaterial({
    color: trailColor,
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.7,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  trailMesh = new THREE.Mesh(geo, mat);

  // stand vertical
  trailMesh.rotation.y = Math.PI; 
  trailGroup.add(trailMesh);
}

// Update trail color when new trail selected
export function applyEquippedTrail(name) {
  const t = TRAILS[name] || TRAILS.default;

  // gradient color pulse between 2 colors
  player.trailInfo = {
    t,
    pulseTime: 0,
    c1: new THREE.Color(t.color1),
    c2: new THREE.Color(t.color2),
  };
}

// Called every frame from game.js
export function updateTrail(delta, fox) {
  if (!trailMesh || !fox || !player.trailInfo) return;

  const info = player.trailInfo;
  info.pulseTime += delta * 2;

  // interpolate color (shimmer shift)
  const f = (Math.sin(info.pulseTime) + 1) / 2;
  const col = info.c1.clone().lerp(info.c2, f);

  trailMesh.material.color.copy(col);
  trailMesh.material.opacity = 0.55 + f * 0.45;

  // position trail directly behind fox
  trailGroup.position.set(
    fox.position.x,
    fox.position.y + 0.2,       // center vertically
    fox.position.z + 0.9        // slight behind
  );

  // face camera nicely
  trailGroup.lookAt(
    fox.position.x,
    fox.position.y + 2,
    fox.position.z - 10
  );
}
