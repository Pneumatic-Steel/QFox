import { GAME_STATE, TRAIL_SHOP } from "./constants.js";
import { player, equipTrail, buyTrail } from "./player.js";

export const UI = {
  state: GAME_STATE.MENU,

  screens: {
    menu: null,
    gameOver: null,
    leaderboard: null,
    trails: null,
  },

  buttons: {
    start: null,
    restart: null,
    leaderboardOpen: null,
    leaderboardClose: null,
    trailsOpen: null,
    trailsClose: null,
  },

  labels: {
    score: null,
    highScore: null,
    finalScore: null,
    orbs: null,
  },

  trailListContainer: null,
};

export function initUI() {
  // Screens
  UI.screens.menu = document.getElementById("screen-menu");
  UI.screens.gameOver = document.getElementById("screen-gameover");
  UI.screens.leaderboard = document.getElementById("screen-leaderboard");
  UI.screens.trails = document.getElementById("screen-trails");

  // Buttons
  UI.buttons.start = document.getElementById("btn-start");
  UI.buttons.restart = document.getElementById("btn-restart");
  UI.buttons.leaderboardOpen = document.getElementById("btn-leaderboard");
  UI.buttons.leaderboardClose = document.getElementById("btn-close-leaderboard");
  UI.buttons.trailsOpen = document.getElementById("btn-trails");
  UI.buttons.trailsClose = document.getElementById("btn-close-trails");

  // Labels
  UI.labels.score = document.getElementById("label-score");
  UI.labels.highScore = document.getElementById("label-highscore");
  UI.labels.finalScore = document.getElementById("label-finalscore");
  UI.labels.orbs = document.getElementById("label-orbs");

  UI.trailListContainer = document.getElementById("trail-list");

  // Hook up buttons
  if (UI.buttons.start) {
    UI.buttons.start.onclick = () => showGame();
  }

  if (UI.buttons.restart) {
    UI.buttons.restart.onclick = () => showGame();
  }

  if (UI.buttons.leaderboardOpen) {
    UI.buttons.leaderboardOpen.onclick = () => showLeaderboard();
  }

  if (UI.buttons.leaderboardClose) {
    UI.buttons.leaderboardClose.onclick = () => hideLeaderboard();
  }

  if (UI.buttons.trailsOpen) {
    UI.buttons.trailsOpen.onclick = () => showTrails();
  }

  if (UI.buttons.trailsClose) {
    UI.buttons.trailsClose.onclick = () => hideTrails();
  }

  updateTrailList();
  updateOrbsLabel();
}

// -------------------------------------------------------------
// STATE TRANSITIONS
// -------------------------------------------------------------

export function showMenu() {
  UI.state = GAME_STATE.MENU;

  UI.screens.menu.style.display = "flex";
  UI.screens.gameOver.style.display = "none";
  UI.screens.leaderboard.style.display = "none";
  UI.screens.trails.style.display = "none";
}

export function showGame() {
  UI.state = GAME_STATE.PLAYING;

  UI.screens.menu.style.display = "none";
  UI.screens.gameOver.style.display = "none";
  UI.screens.leaderboard.style.display = "none";
  UI.screens.trails.style.display = "none";

  // Game.js will handle resetting game logic
  if (window.startGame) window.startGame();
}

export function showGameOver(finalScore) {
  UI.state = GAME_STATE.GAME_OVER;

  UI.labels.finalScore.textContent = finalScore;
  UI.labels.highScore.textContent = player.highScore;

  UI.screens.menu.style.display = "none";
  UI.screens.gameOver.style.display = "flex";
  UI.screens.leaderboard.style.display = "none";
  UI.screens.trails.style.display = "none";
}

export function showLeaderboard() {
  UI.state = GAME_STATE.LEADERBOARD;

  UI.screens.leaderboard.style.display = "flex";
  if (window.loadLeaderboard) window.loadLeaderboard();
}

export function hideLeaderboard() {
  UI.screens.leaderboard.style.display = "none";
  UI.state = GAME_STATE.MENU;
}

export function showTrails() {
  UI.state = GAME_STATE.TRAILS;
  UI.screens.trails.style.display = "flex";
  updateTrailList();
}

export function hideTrails() {
  UI.screens.trails.style.display = "none";
  UI.state = GAME_STATE.MENU;
}

// -------------------------------------------------------------
// SCORE & ORBS
// -------------------------------------------------------------

export function updateScoreLabel(score) {
  if (UI.labels.score) UI.labels.score.textContent = score;
}

export function updateOrbsLabel() {
  if (UI.labels.orbs) UI.labels.orbs.textContent = player.orbs;
}

// -------------------------------------------------------------
// TRAIL SHOP UI
// -------------------------------------------------------------

export function updateTrailList() {
  if (!UI.trailListContainer) return;

  UI.trailListContainer.innerHTML = "";

  TRAIL_SHOP.forEach((trail) => {
    const div = document.createElement("div");
    div.className = "trail-item";

    const unlocked = player.trailUnlocks[trail.id];
    const equipped = player.equippedTrailId === trail.id;

    div.innerHTML = `
      <div class="trail-name">${trail.name}</div>
      <div class="trail-status">
        ${
          unlocked
            ? equipped
              ? `<span class="equipped-label">Equipped</span>`
              : `<button class="equip-btn" data-id="${trail.id}">Equip</button>`
            : `<button class="buy-btn" data-id="${trail.id}">Buy (${trail.price}😺)</button>`
        }
      </div>
    `;

    UI.trailListContainer.appendChild(div);
  });

  // Buying / equipping
  UI.trailListContainer.querySelectorAll(".buy-btn").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (buyTrail(id)) {
        updateTrailList();
        updateOrbsLabel();
      }
    };
  });

  UI.trailListContainer.querySelectorAll(".equip-btn").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (equipTrail(id)) {
        updateTrailList();
      }
    };
  });
}
