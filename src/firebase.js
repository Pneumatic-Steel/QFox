// src/firebase.js

import { STORAGE_KEYS } from "./constants.js";
import { player, savePlayerToStorage } from "./player.js";
import { updateHighScoreLabel } from "./ui.js";

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

// =====================================================
// INIT FIREBASE
// =====================================================

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

// =====================================================
// HIGH SCORE
// =====================================================

async function loadHighScore() {
  // local first
  const local = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
  if (local != null) {
    player.highScore = parseInt(local, 10) || 0;
  }

  if (!db || !user) {
    updateHighScoreLabel();
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const cloudScore = Number(snap.data().highScore) || 0;
      if (cloudScore > player.highScore) {
        player.highScore = cloudScore;
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(cloudScore));
      }
    }
  } catch (err) {
    console.warn("Failed to fetch high score:", err);
  }

  updateHighScoreLabel();
}

export async function saveHighScore(score) {
  const numeric = Number(score) || 0;
  player.highScore = numeric;
  localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(numeric));
  updateHighScoreLabel();
  savePlayerToStorage();

  if (!user || !db) return;

  try {
    const ref = doc(db, "users", user.uid);
    await setDoc(
      ref,
      {
        highScore: numeric,
        timestamp: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Failed to save high score:", err);
  }
}

// =====================================================
// LEADERBOARD (FIXED RANK + NaN PROOF)
// =====================================================

export async function loadLeaderboard() {
  const listEl = document.getElementById("leaderboard-list");
  if (!listEl) return;

  listEl.innerHTML = "Loading...";

  if (!db) {
    listEl.innerHTML = "Leaderboard unavailable (no database).";
    return;
  }

  try {
    const ref = collection(db, "leaderboard");
    const q = query(ref, orderBy("score", "desc"), limit(100));
    const snap = await getDocs(q);

    let html = "";
    let rank = 1; // manual rank counter (DON'T rely on Firestore for index)

    snap.forEach((docSnap) => {
      const d = docSnap.data() || {};

      const initials = (d.initials || "???").toString().substring(0, 5);
      const score = Number(d.score) || 0;

      // RANK ICONS
      let rankDisplay;
      if (rank === 1) rankDisplay = "🔥";
      else if (rank === 2) rankDisplay = "🥈";
      else if (rank === 3) rankDisplay = "🥉";
      else rankDisplay = rank; // 4, 5, 6, ...

      // COLORS & GLOW
      let rowGlow = "";
      let nameColor = "";
      let scoreColor = "";

      switch (rank) {
        case 1:
          rowGlow = "0 0 14px rgba(255,165,0,0.75)";
          nameColor = "#fbbf24";
          scoreColor = "#fde68a";
          break;
        case 2:
          rowGlow = "0 0 14px rgba(192,192,192,0.65)";
          nameColor = "#d1d5db";
          scoreColor = "#e5e7eb";
          break;
        case 3:
          rowGlow = "0 0 14px rgba(205,127,50,0.65)";
          nameColor = "#cd7f32";
          scoreColor = "#f2c899";
          break;
        default:
          rowGlow = "0 0 8px rgba(59,130,246,0.45)";
          nameColor = "#93c5fd";
          scoreColor = "#bfdbfe";
          break;
      }

      html += `
        <div class="lb-entry"
             style="
               display:flex;
               justify-content:space-between;
               width:100%;
               padding:10px 0;
               border-bottom:1px dashed #334155;
               transition:.25s;
               text-shadow:0 0 4px rgba(0,0,0,0.6);
             "
             onmouseover="this.style.boxShadow='${rowGlow}'"
             onmouseout="this.style.boxShadow='none'"
        >
          <span class="lb-rank"
                style="width:20%; text-align:center; font-weight:900; font-size:1.2rem;">
            ${rankDisplay}
          </span>

          <span class="lb-initials"
                style="width:40%; color:${nameColor}; font-weight:800; font-size:1.1rem;">
            ${initials}
          </span>

          <span class="lb-score"
                style="width:40%; text-align:right; color:${scoreColor}; font-weight:900; font-size:1.2rem;">
            ${score.toLocaleString()}
          </span>
        </div>
      `;

      rank++;
    });

    listEl.innerHTML = html || "Be the first to set a score!";
  } catch (err) {
    console.warn(err);
    listEl.innerHTML = "Failed to load leaderboard.";
  }
}

// =====================================================
// SUBMIT SCORE TO LEADERBOARD
// =====================================================

export async function submitLeaderboardScore(score, initials) {
  if (!user || !db) return;

  try {
    const ref = collection(db, "leaderboard");
    await addDoc(ref, {
      initials: (initials || "???").toString().substring(0, 5),
      score: Number(score) || 0,
      uid: user.uid,
      timestamp: serverTimestamp(),
    });

    console.log("Leaderboard score submitted:", initials, score);
  } catch (err) {
    console.warn("Failed to submit leaderboard score:", err);
  }
}

// make available to ui.js
window.qfoxSubmitScore = submitLeaderboardScore;
