import { ArchiveRunGame } from "./run-game.js";

window.__archiveBoot?.step("Runtime module loaded.", 24, "Runtime loaded");

const root = document.getElementById("app");
const bootScreen = document.getElementById("boot-screen");
const bootStartedAt = performance.now();
const MIN_BOOT_SCREEN_MS = 520;
const MAX_BOOT_SCREEN_MS = 2400;
let bootCleared = false;

function clearBootScreen() {
  if (bootCleared) {
    return;
  }

  bootCleared = true;
  const elapsed = performance.now() - bootStartedAt;
  const delay = Math.max(0, MIN_BOOT_SCREEN_MS - elapsed);

  window.setTimeout(() => {
    window.__archiveBootReady = true;
    window.dispatchEvent(new CustomEvent("archive-app-ready"));
  }, delay);
}

function showBootError(message) {
  bootCleared = true;
  window.__archiveBootError = true;
  document.body.classList.remove("app-loading");
  if (!bootScreen) {
    return;
  }

  bootScreen.classList.remove("hidden");
  bootScreen.classList.add("error");
  bootScreen.innerHTML = `
    <div class="boot-shell">
      <p class="eyebrow">Intake Failed</p>
      <h1>Archive Survival</h1>
      <p class="boot-copy">${message}</p>
    </div>
  `;
}

function scheduleBootRelease() {
  const attemptClear = () => {
    if (root?.children.length) {
      clearBootScreen();
    }
  };

  attemptClear();

  window.setTimeout(attemptClear, 60);
  window.setTimeout(attemptClear, 180);
  window.setTimeout(attemptClear, 420);

  window.requestAnimationFrame(() => {
    attemptClear();
    window.requestAnimationFrame(attemptClear);
  });

  window.setTimeout(() => {
    if (!bootCleared) {
      clearBootScreen();
    }
  }, MAX_BOOT_SCREEN_MS);
}

try {
  if (!root) {
    throw new Error("Missing #app root");
  }

  window.__archiveBoot?.step("Creating game instance.", 36, "Creating game");
  const game = new ArchiveRunGame(root);
  window.__archiveBoot?.step("Mounting archive UI.", 56, "Mounting UI");
  game.mount();
  window.__archiveBoot?.step("Mount completed. Waiting for first render.", 76, "Waiting for render");
  scheduleBootRelease();
} catch (error) {
  console.error(error);
  window.__archiveBoot?.error(`Startup failed: ${error?.message || String(error)}`);
  showBootError("The archive failed to open. Reload the app and try again.");
}
