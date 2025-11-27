import { STORAGE_KEYS } from "./constants.js";
import { player, savePlayerToStorage } from "./player.js";
import { UI, updateScoreLabel, updateHighScoreLabel } from "./ui.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let db = null;
let auth = null;
let user = null;

export function initFirebase() {
  const config = {
    apiKey: "AIzaSyBgfoQLeOOqbKBuM69SO88jhCpfwrz_koo",
    authDomain: "qfox-29287.firebaseapp.com",
    projectId: "qfox-29287",
    storageBucket: "qfox-29287.appspot.com",
    messagingSenderId: "778217166086",
    appId: "1:778217166086:web:1480312c499fdec6aafa87",
    measurementId: "G-VGEY7GV2QD"
  };

  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);

  signInAnonymously(auth).catch(console.error);

  onAuthStateChanged(auth, (firebaseUser) => {
    if (!firebaseUser) return;

    user = firebaseUser;
    console.log("Logged in as:", user.uid);

    loadHighScore();
  });
}

// -------------------------------------------------------------
// HIGH SCORE SYNC
// -------------------------------------------------------------

async function loadHighScore() {
  // Load local fallback
  const local = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
  if (local) {
    player.highScore = parseInt(local, 10) || 0;
  }

  // Load from firebase
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const cloudScore = snap.data().highScore || 0;
      if (cloudScore > player.highScore) {
        player.highScore = cloudScore;
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, cloudScore);
      }
    }
  } catch (err) {
    console.warn("Failed to fetch high score:", err);
  }

  // Update HUD labels correctly
  updateHighScoreLabel();
}

export async function saveHighScore(score) {
  player.highScore = score;
  localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score);
  updateHighScoreLabel();
  savePlayerToStorage();

  if (!user) return;

  try {
    const ref = doc(db, "users", user.uid);
    await setDoc(
      ref,
      {
        highScore: score,
        timestamp: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Failed to save high score:", err);
  }
}

// -------------------------------------------------------------
// LEADERBOARD
// -------------------------------------------------------------

export async function loadLeaderboard() {
  const listEl = document.getElementById("leaderboard-list");
  if (!listEl) return;

  listEl.innerHTML = "Loading...";

  try {
    const ref = collection(db, "leaderboard");
    const q = query(ref, orderBy("score", "desc"), limit(100));
    const snap = await getDocs(q);

    let html = "";

    snap.forEach((docSnap, idx) => {
      const d = docSnap.data();
      const initials = d.initials || "???";
      const score = d.score || 0;

      html += `
        <div class="lb-entry">
          <span class="lb-rank">${idx + 1}</span>
          <span class="lb-initials">${initials}</span>
          <span class="lb-score">${score.toLocaleString()}</span>
        </div>`;
    });

    listEl.innerHTML = html || "Be the first to set a score!";
  } catch (err) {
    console.warn(err);
    listEl.innerHTML = "Failed to load leaderboard.";
  }
}

export async function submitLeaderboardScore(score, initials) {
  if (!user || !db) return;

  try {
    const ref = collection(db, "leaderboard");
    await addDoc(ref, {
      initials,
      score,
      uid: user.uid,
      timestamp: serverTimestamp(),
    });

    console.log("Leaderboard score submitted:", initials, score);
  } catch (err) {
    console.warn("Failed to submit leaderboard score:", err);
  }
}

// Expose for UI without creating circular imports
window.qfoxSubmitScore = submitLeaderboardScore;
