import { TRAIL_SHOP } from "./constants.js";
import { player, equipTrail, buyTrail } from "./player.js";

// Your existing UI structure
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
    leaderboardOpen2: null,
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

  initials: {
    container: null,
    input: null,
    submit: null,
    pendingScore: 0,
  },

  trailListContainer: null, // where trail list will appear
};

// Ensure DOM is fully loaded before initializing UI
document.addEventListener("DOMContentLoaded", () => {
  initUI();
});

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
  UI.buttons.leaderboardOpen2 = document.getElementById("btn-leaderboard-2");
  UI.buttons.leaderboardClose = document.getElementById("btn-close-leaderboard");
  UI.buttons.trailsOpen = document.getElementById("btn-trails");
  UI.buttons.trailsClose = document.getElementById("btn-close-trails");

  // Labels
  UI.labels.score = document.getElementById("label-score");
  UI.labels.highScore = document.getElementById("label-highscore");
  UI.labels.finalScore = document.getElementById("label-finalscore");
  UI.labels.orbs = document.getElementById("label-orbs");

  // Initials form
  UI.initials.container = document.getElementById("initials-container");
  UI.initials.input = document.getElementById("initials-input");
  UI.initials.submit = document.getElementById("btn-submit-score");

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

  if (UI.buttons.leaderboardOpen2) {
    UI.buttons.leaderboardOpen2.onclick = () => showLeaderboard();
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

  // Initial initials submit functionality
  if (UI.initials.submit) {
    UI.initials.submit.onclick = () => {
      const raw = (UI.initials.input.value || "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 5);

      const initials = raw || "AAAAA";
      const score = UI.initials.pendingScore || 0;

      if (window.qfoxSubmitScore) {
        window.qfoxSubmitScore(score, initials);
      }

      // Hide form after submitting
      if (UI.initials.container) {
        UI.initials.container.classList.add("hidden");
      }
    };
  }

  // Initial HUD text update
  updateScoreLabel(player.score);
  updateOrbsLabel();
  updateHighScoreLabel();
  updateTrailList();
}

// State transitions for different screens
export function showMenu() {
  UI.state = GAME_STATE.MENU;
  if (UI.screens.menu) UI.screens.menu.classList.remove("hidden");
  if (UI.screens.gameOver) UI.screens.gameOver.classList.add("hidden");
  if (UI.screens.leaderboard) UI.screens.leaderboard.classList.add("hidden");
  if (UI.screens.trails) UI.screens.trails.classList.add("hidden");
}

export function showGame() {
  UI.state = GAME_STATE.PLAYING;
  if (UI.screens.menu) UI.screens.menu.classList.add("hidden");
  if (UI.screens.gameOver) UI.screens.gameOver.classList.add("hidden");
  if (UI.screens.leaderboard) UI.screens.leaderboard.classList.add("hidden");
  if (UI.screens.trails) UI.screens.trails.classList.add("hidden");

  if (UI.initials.container) UI.initials.container.classList.add("hidden");

  if (window.startGame) window.startGame();
}

export function showGameOver(finalScore) {
  UI.state = GAME_STATE.GAME_OVER;
  if (UI.labels.finalScore) UI.labels.finalScore.textContent = finalScore;
  updateHighScoreLabel();

  if (UI.screens.menu) UI.screens.menu.classList.add("hidden");
  if (UI.screens.gameOver) UI.screens.gameOver.classList.remove("hidden");
  if (UI.screens.leaderboard) UI.screens.leaderboard.classList.add("hidden");
  if (UI.screens.trails) UI.screens.trails.classList.add("hidden");

  UI.initials.pendingScore = finalScore;
  if (UI.initials.container) {
    UI.initials.container.classList.remove("hidden");
    if (UI.initials.input) {
      UI.initials.input.value = "";
      UI.initials.input.focus();
    }
  }
}

export function showLeaderboard() {
  UI.state = GAME_STATE.LEADERBOARD;
  if (UI.screens.leaderboard) UI.screens.leaderboard.classList.remove("hidden");
  if (window.loadLeaderboard) window.loadLeaderboard();
}

export function hideLeaderboard() {
  if (UI.screens.leaderboard) UI.screens.leaderboard.classList.add("hidden");
  UI.state = GAME_STATE.MENU;
}

export function showTrails() {
  UI.state = GAME_STATE.TRAILS;
  if (UI.screens.trails) UI.screens.trails.classList.remove("hidden");
  updateTrailList();
}

export function hideTrails() {
  if (UI.screens.trails) UI.screens.trails.classList.add("hidden");
  UI.state = GAME_STATE.MENU;
}

// Score and high score updates
export function updateScoreLabel(score) {
  if (UI.labels.score) UI.labels.score.textContent = `Score: ${score}`;
}

export function updateHighScoreLabel() {
  if (UI.labels.highScore) UI.labels.highScore.textContent = `High Score: ${player.highScore}`;
}

export function updateOrbsLabel() {
  if (UI.labels.orbs) UI.labels.orbs.textContent = `Orbs: ${player.orbs}`;
}

// Trail shop update
export function updateTrailList() {
  if (!UI.trailListContainer) return;
  UI.trailListContainer.innerHTML = "";

  TRAIL_SHOP.forEach((trail) => {
    const div = document.createElement("div");
    div.className = "trail-item";

    const unlocked = !!player.trailUnlocks[trail.id];
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
