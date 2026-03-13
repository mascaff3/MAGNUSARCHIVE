import { IMAGE_URLS, SPIDER_FRAME_URLS } from "./assets.js";
import { FEAR_DATA, FEAR_DATA_BY_ID } from "./fear-data.js";
import { displayFragmentLabel } from "./web-runtime.js";

function inventoryMarkup(inventory) {
  if (!inventory.length) {
    return `<div class="inventory-empty">No objects claimed yet.</div>`;
  }

  return inventory
    .map(
      (item) => `
        <article class="inventory-item rarity-${item.rarity}">
          <h4>${item.name}</h4>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");
}

function logMarkup(log) {
  return log
    .slice(0, 4)
    .map((entry) => `<li>${entry}</li>`)
    .join("");
}

function fearIconMarkup(fear, className = "fear-icon") {
  if (!fear) {
    return "";
  }

  return `<span class="${className}" style="--fear-color:${fear.color}; --fear-icon:url('${fear.iconUrl}')"></span>`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function corruptionIntensity(runtime) {
  if (!runtime?.data?.stability) {
    return 0;
  }

  const ratio = runtime.stability / runtime.data.stability;
  if (ratio >= 0.3) {
    return 0;
  }

  return Math.min(1, (0.3 - ratio) / 0.3);
}

function corruptCharacter(character) {
  const map = {
    a: "4",
    A: "4",
    e: "3",
    E: "3",
    i: "1",
    I: "1",
    o: "0",
    O: "0",
    s: "5",
    S: "5",
    t: "+",
    T: "+",
  };
  return map[character] || character;
}

function fragmentTextMarkup(fragment, runtime, extraClass = "node-label") {
  const label = displayFragmentLabel(fragment.label);
  const intensity = corruptionIntensity(runtime);
  if (!intensity) {
    return `<span class="${extraClass}">${label}</span>`;
  }

  const bucket = Math.round(intensity * 10);
  const glyphMarkup = [...label].map((character, index) => {
    if (character === " ") {
      return `<span class="corrupt-space"> </span>`;
    }

    const seed = hashString(`${fragment.id}:${index}:${bucket}`);
    let glyph = character;
    const classes = ["corrupt-glyph"];
    if (seed < 0.18 + intensity * 0.18) {
      glyph = corruptCharacter(character);
      classes.push("substitute");
    }
    if (seed > 0.32 && seed < 0.44 + intensity * 0.12) {
      classes.push("wide");
    }
    if (seed > 0.52 && seed < 0.66 + intensity * 0.16) {
      classes.push("jitter");
    }
    if (seed > 0.76 - intensity * 0.1) {
      classes.push("fade");
    }
    return `<span class="${classes.join(" ")}">${glyph}</span>`;
  }).join("");

  return `<span class="${extraClass} fragment-corruption" aria-hidden="true">${glyphMarkup}</span><span class="sr-only">${label}</span>`;
}

function formatDuration(totalSeconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function eyeBandMarkup() {
  const blinkProfiles = [
    { blinkClass: "blink-linger", duration: 17.4, delay: -1.1, drift: 6.8 },
    { blinkClass: "blink-double", duration: 12.6, delay: -4.7, drift: 5.2 },
    { blinkClass: "blink-twitch", duration: 10.8, delay: -2.4, drift: 4.9 },
    { blinkClass: "blink-doze", duration: 18.9, delay: -7.9, drift: 7.6 },
    { blinkClass: "blink-double", duration: 14.8, delay: -9.5, drift: 5.8 },
    { blinkClass: "blink-linger", duration: 15.7, delay: -6.1, drift: 6.3 },
    { blinkClass: "blink-twitch", duration: 11.9, delay: -8.4, drift: 5.1 },
  ];

  return `
    <div class="eye-band" aria-hidden="true">
      ${Array.from({ length: 7 }, (_, index) => {
        const size = index % 3 === 0 ? "large" : index % 2 === 0 ? "small" : "medium";
        const sentinel = index === 1 || index === 4 ? "sentinel" : "";
        const blinkProfile = blinkProfiles[index % blinkProfiles.length];
        return `
          <span
            class="eye-glyph ${size} ${sentinel} ${blinkProfile.blinkClass}"
            style="--eye-delay:${blinkProfile.delay}s; --eye-duration:${blinkProfile.duration}s; --eye-drift-duration:${blinkProfile.drift}s; --eye-pos:${18 + index * 11}% 52%;"
          >
            <span class="eye-sclera"></span>
            <span class="eye-iris">
              <span class="eye-pupil"></span>
            </span>
            <span class="eye-lid eye-lid-top"></span>
            <span class="eye-lid eye-lid-bottom"></span>
          </span>
        `;
      }).join("")}
    </div>
  `;
}

function controlsMarkup(state) {
  if (state.currentScreen === "minigame") {
    return `
      <p><kbd>Left Click</kbd>: add or remove a fragment</p>
      <p><kbd>Enter</kbd>: submit the read</p>
      <p><kbd>Shift</kbd>: open or close a clue</p>
      <p><kbd>M</kbd>: music on or off</p>
    `;
  }

  if (state.currentScreen === "item-wheel") {
    return `
      <p><kbd>Left Click</kbd>: spin or continue</p>
      <p><kbd>M</kbd>: music on or off</p>
    `;
  }

  if (state.currentScreen === "case-intro") {
    return `
      <p><kbd>Left Click</kbd>: continue into the case</p>
      <p><kbd>M</kbd>: music on or off</p>
    `;
  }

  return `
    <p><kbd>Left Click</kbd>: start, resume, or choose difficulty</p>
    <p><kbd>M</kbd>: music on or off</p>
  `;
}

function candleRackMarkup(side, count = 5) {
  return `
    <div class="candle-rack ${side}" aria-hidden="true">
      ${Array.from({ length: count }, (_, index) => {
        const height = 3.2 + (index % 3) * 0.9;
        const delay = index * 0.6;
        return `
          <span class="candle" style="--candle-height:${height}rem; --flame-delay:${delay}s;">
            <span class="wick"></span>
            <span class="flame"></span>
          </span>
        `;
      }).join("")}
    </div>
  `;
}

function roseWindowMarkup() {
  return `
    <svg class="rose-window" viewBox="0 0 240 240" aria-hidden="true">
      <circle cx="120" cy="120" r="104" class="rose-ring outer" />
      <circle cx="120" cy="120" r="78" class="rose-ring middle" />
      <circle cx="120" cy="120" r="38" class="rose-ring core" />
      ${Array.from({ length: 12 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 12;
        const x = 120 + Math.cos(angle) * 78;
        const y = 120 + Math.sin(angle) * 78;
        const innerX = 120 + Math.cos(angle) * 38;
        const innerY = 120 + Math.sin(angle) * 38;
        return `
          <line x1="120" y1="120" x2="${x}" y2="${y}" class="rose-spoke" />
          <circle cx="${x}" cy="${y}" r="14" class="rose-petal" />
          <line x1="${innerX}" y1="${innerY}" x2="${x}" y2="${y}" class="rose-spoke inner" />
        `;
      }).join("")}
    </svg>
  `;
}

function helpModalMarkup() {
  return `
    <div class="help-overlay" data-help-overlay>
      <section class="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div class="help-modal-header">
          <div>
            <p class="eyebrow">Field Guide</p>
            <h2 id="help-title">How This Run Works</h2>
          </div>
          <button type="button" class="help-close" data-action="toggle-help" aria-label="Close help">Close</button>
        </div>
        <div class="help-grid">
          <article class="help-card">
            <h3>Read</h3>
            <ul class="rule-list">
              <li>Each case hides one exact four-part chain.</li>
              <li>You are solving for order, not just for matching words.</li>
            </ul>
          </article>
          <article class="help-card">
            <h3>Pressure</h3>
            <ul class="rule-list">
              <li>A short read costs 1 stability.</li>
              <li>A wrong full read costs 2.</li>
              <li>If stability hits 0, the case shuts on you.</li>
            </ul>
          </article>
          <article class="help-card">
            <h3>Controls</h3>
            <ul class="rule-list">
              <li>Left click a fragment to add it.</li>
              <li>Click the newest one again to undo it.</li>
              <li>Press Enter to submit and M to mute music.</li>
            </ul>
          </article>
          <article class="help-card">
            <h3>Chain</h3>
            <ul class="rule-list">
              <li>The chain under the board shows your current read.</li>
              <li>Correct leading fragments anchor into the chain after you submit.</li>
            </ul>
          </article>
          <article class="help-card">
            <h3>Rewards</h3>
            <ul class="rule-list">
              <li>A stable read opens the wheel.</li>
              <li>Take one object, then move on.</li>
            </ul>
          </article>
          <article class="help-card">
            <h3>Run</h3>
            <ul class="rule-list">
              <li>Three strikes end the run.</li>
              <li>Objects stay with you until their scope runs out.</li>
            </ul>
          </article>
          <article class="help-card">
            <h3>Spider Cursor</h3>
            <ul class="rule-list">
              <li>The spider follows your pointer and pauses over fragments.</li>
              <li>Bad reads make it lunge or twitch.</li>
            </ul>
          </article>
          <article class="help-card">
            <h3>Eye Band</h3>
            <ul class="rule-list">
              <li>The eyes grow harsher as the case destabilizes.</li>
              <li>The meter shows how close the current case is to breaking.</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  `;
}

function tutorialPanelMarkup(runtime, tutorialState) {
  if (tutorialState.tutorialSeen || tutorialState.tutorialDismissed) {
    return "";
  }

  const selectionCount = runtime.selected.length;
  const anchoredCount = runtime.anchored?.length || 0;
  let title = "First Read";
  let body = "Click four fragments in the order that turns courtesy into control.";
  let tip = "The chain under the board fills as you build the read.";

  if (anchoredCount > 0) {
    title = "Use The Anchors";
    body = "Locked fragments stay in place after a good prefix. Build the rest of the chain around them.";
    tip = "Anchored fragments cannot be removed, so focus on the remaining open slots.";
  } else if (selectionCount >= 1 && selectionCount < runtime.data.solution.length) {
    title = "Keep Tying";
    body = "Good. Keep building the chain. Clicking the newest fragment again will undo it.";
    tip = "Submit the read to learn which fragments are exact, misplaced, or wrong.";
  } else if (selectionCount >= runtime.data.solution.length) {
    title = "Seal The Read";
    body = "You have a full chain. Press Seal or hit Enter to test it.";
    tip = "Exact matches will anchor after submission, so progress can survive a bad finish.";
  } else if (runtime.clueOpen) {
    title = "Use The Clue";
    body = "Clues do not give the full answer. They tell you where the sequence bends.";
    tip = "Read the hint, close it, and keep threading the chain.";
  }

  return `
    <aside class="tutorial-panel" data-tutorial-panel>
      <p class="eyebrow">Field Guide</p>
      <h3>${title}</h3>
      <p>${body}</p>
      <p class="helper-text">${tip}</p>
      <div class="tutorial-actions">
        <button type="button" data-action="dismiss-tutorial" class="secondary">Hide Guide</button>
      </div>
    </aside>
  `;
}

function jumpscareMarkup(jumpscare) {
  if (!jumpscare) {
    return "";
  }

  return `
    <div class="jumpscare-overlay kind-${jumpscare.kind}" aria-hidden="true">
      <div class="jumpscare-flash"></div>
      <div class="jumpscare-eye">
        <span class="jumpscare-eye-pupil"></span>
      </div>
      <img src="${SPIDER_FRAME_URLS.walk[8]}" alt="" class="jumpscare-spider-image" />
      <p class="jumpscare-caption">${jumpscare.caption}</p>
    </div>
  `;
}

function activeStabilityClass(state) {
  if (state.currentScreen !== "minigame" || !state.caseRuntime?.data?.stability) {
    return "";
  }

  const ratio = state.caseRuntime.stability / state.caseRuntime.data.stability;
  if (ratio <= 0.34) {
    return "stability-critical";
  }
  if (ratio <= 0.64) {
    return "stability-unstable";
  }
  return "stability-stable";
}

export function archiveMarkup({ highScore, state, content, audioStatus }) {
  const showTopbar = state.currentScreen !== "menu";
  const showSidebars = false;
  const stabilityClass = activeStabilityClass(state);

  return `
    <main class="archive-shell screen-${state.currentScreen} fear-${state.activeCase?.fear || "menu"} phase-${state.activeCase?.phase || "mundane"} ${showSidebars ? "with-sidebars" : "without-sidebars"} ${stabilityClass}">
      ${eyeBandMarkup()}
      ${
        showTopbar
          ? `<header class="topbar">
              <div class="hud-glyph" title="Cases cleared">
                <span class="label" aria-hidden="true">🕸</span>
                <strong>${state.clearedCount}</strong>
              </div>
              <div class="hud-glyph" title="Run log entries">
                <span class="label" aria-hidden="true">📜</span>
                <strong>${state.log.length}</strong>
              </div>
              <div class="hud-glyph" title="Strikes">
                <span class="label" aria-hidden="true">✕</span>
                <strong>${state.strikes}/${3}</strong>
              </div>
              <div class="hud-glyph" title="Objects held">
                <span class="label" aria-hidden="true">🗝</span>
                <strong>${state.inventory.length}</strong>
              </div>
              <div class="hud-glyph" title="Best run">
                <span class="label" aria-hidden="true">★</span>
                <strong>${highScore}</strong>
              </div>
              <div class="hud-glyph" title="Run time">
                <span class="label" aria-hidden="true">⏱</span>
                <strong data-run-seconds>${state.active || state.runSeconds ? formatDuration(state.runSeconds) : "--:--"}</strong>
              </div>
              <div class="hud-controls">
                <button
                  data-action="audio-toggle"
                  class="audio-toggle ${audioStatus.enabled && audioStatus.unlocked ? "active" : ""}"
                  aria-label="${audioStatus.enabled ? "Mute music" : "Enable music"}"
                  title="${audioStatus.unlocked ? (audioStatus.enabled ? "Music on" : "Music off") : "Arm audio"}"
                >♫</button>
                <button data-action="toggle-help" class="help-pill" aria-label="Open help" title="Help">?</button>
              </div>
            </header>`
          : ""
      }
      ${
        showSidebars
          ? `<aside class="sidebar left">
              <section class="panel">
                <h3>Run Log</h3>
                <ul class="log-list">${logMarkup(state.log)}</ul>
              </section>
              <section class="panel">
                <h3>Inventory</h3>
                ${inventoryMarkup(state.inventory)}
              </section>
            </aside>`
          : ""
      }
      <section class="content">${content}</section>
      ${
        showSidebars
          ? `<aside class="sidebar right">
              <section class="panel">
                <h3>Run State</h3>
                <p>Phase: <strong>${state.activeCase?.phase || "intake"}</strong></p>
                <p>Eye Pressure: <strong>${state.eyeInterference ? "active" : "quiet"}</strong></p>
                ${
                  state.active
                    ? `<div class="button-row run-actions">
                        <button data-action="restart-run" class="secondary">Restart Run</button>
                      </div>`
                    : ""
                }
              </section>
              <section class="panel controls">
                <h3>Controls</h3>
                ${controlsMarkup(state)}
              </section>
            </aside>`
          : ""
      }
      ${state.helpOpen ? helpModalMarkup() : ""}
      ${jumpscareMarkup(state.jumpscare)}
    </main>
  `;
}

export function menuMarkup() {
  return `
    <section class="menu-screen intake-screen">
      <div class="menu-stage-card">
        <section class="menu-copy-panel">
          <p class="eyebrow">Intake</p>
          <h1>Archive Survival</h1>
          <p class="cathedral-deck">A survival run through archive statements, shifting fear domains, and ritualized minigames that change with the case file in front of you.</p>
          <div class="menu-primary-row">
            <button data-action="new-run">Start Run</button>
            <button data-action="toggle-help" class="help-icon" aria-label="Open help">?</button>
          </div>
          <div class="menu-difficulty-row">
            <button data-action="new-run-easy" class="secondary">Easy</button>
            <button data-action="new-run-normal" class="secondary">Normal</button>
            <button data-action="new-run-hard" class="secondary">Hard</button>
          </div>
          <div class="menu-secondary-row">
            <button data-action="resume-run" class="secondary">Resume Run</button>
            <button data-action="reset-run" class="secondary">Clear Save</button>
          </div>
        </section>
        <section class="menu-visual-panel">
          <div class="cathedral-hero-image">
            <img src="${IMAGE_URLS.heroCathedral}" alt="Gothic church at night" class="hero-image treated-photo cathedral-night-image" />
            <div class="cathedral-ray ray-a" aria-hidden="true"></div>
            <div class="cathedral-ray ray-b" aria-hidden="true"></div>
            <div class="cathedral-ray ray-c" aria-hidden="true"></div>
            <div class="cathedral-oculus" aria-hidden="true"></div>
          </div>
        </section>
        <section class="menu-meta-panel">
          <article class="menu-note-card">
            <p class="eyebrow">Goal</p>
            <p>Survive statement after statement, master each fear's rules, and keep the archive from collapsing the run.</p>
          </article>
          <article class="menu-note-card">
            <p class="eyebrow">Run Basics</p>
            <ul class="rule-list">
              <li>Clear a case.</li>
              <li>Take one object.</li>
              <li>Keep going until the run breaks.</li>
            </ul>
          </article>
          <article class="menu-note-card">
            <p class="eyebrow">Working Rule</p>
            <p>The current build opens with the Web. Future files will not play by the same rules.</p>
          </article>
        </section>
      </div>
    </section>
  `;
}

export function caseIntroMarkup(activeCase) {
  return `
    <section class="case-intro">
      <img src="${activeCase.data.image}" alt="${activeCase.data.title}" class="case-image" />
      <div class="case-copy">
        <p class="eyebrow">${activeCase.phase.toUpperCase()} CASE</p>
        <h1>${activeCase.data.title}</h1>
        <blockquote>${activeCase.data.excerpt}</blockquote>
        <div class="case-cue-strip" role="presentation">
          <span title="Stability">👁 ${activeCase.data.stability}</span>
          <span title="Clues">✦ ${activeCase.data.inspects}</span>
          <span title="Chain length">⛓ ${activeCase.data.solution.length}</span>
        </div>
        <div class="case-intro-prompt">
          <span aria-hidden="true">🕸</span>
          <p>${activeCase.data.objective}</p>
        </div>
        <div class="button-row">
          <button data-action="start-case">Open The Case</button>
        </div>
      </div>
    </section>
  `;
}

export function itemWheelMarkup({ pendingItem, wheelSpinning, wheelSpinTurns, loadingFearId }) {
  const displayedSpin = wheelSpinning ? wheelSpinTurns || 0 : 0;
  const loadingFear = FEAR_DATA_BY_ID[loadingFearId] || FEAR_DATA[0];
  return `
    <section class="reward-screen">
      <div class="wheel-card">
        <div
          class="wheel-stage ${wheelSpinning ? "spinning" : ""} ${pendingItem ? "resolved" : ""}"
          data-wheel-stage
          style="--active-fear-color:${loadingFear.color}"
        >
          <span class="wheel-halo halo-a" aria-hidden="true"></span>
          <span class="wheel-halo halo-b" aria-hidden="true"></span>
          <div class="wheel-fear-ring" aria-hidden="true">
            ${FEAR_DATA.map((fear, index) => `
              <span
                class="wheel-fear-segment ${fear.id === loadingFear.id ? "active" : ""}"
                style="--segment-angle:${index * (360 / FEAR_DATA.length)}deg; --fear-color:${fear.color}; --fear-icon:url('${fear.iconUrl}')"
              ></span>
            `).join("")}
          </div>
          <div class="wheel-runes" aria-hidden="true">
            ${Array.from({ length: 12 }, (_, index) => `<span style="--rune-angle:${index * 30}deg; --rune-delay:${index * 0.06}s;"></span>`).join("")}
          </div>
          <div class="wheel-sparks" aria-hidden="true">
            ${Array.from({ length: 14 }, (_, index) => `<span style="--spark-angle:${index * 25.7}deg; --spark-delay:${index * 0.05}s;"></span>`).join("")}
          </div>
          <div class="wheel-fear-focus" aria-hidden="true">
            ${fearIconMarkup(loadingFear, "fear-icon wheel-fear-icon")}
            <span class="wheel-fear-name">${loadingFear.name}</span>
          </div>
          <img
            src="${IMAGE_URLS.wheel}"
            alt="Archive retrieval wheel"
            class="wheel-image ${wheelSpinning ? "spinning" : ""}"
            style="--wheel-spin:${displayedSpin}deg"
          />
        </div>
        <div>
          <p class="eyebrow">Reward</p>
          <h1>Recovered Object</h1>
          ${
            pendingItem
              ? `<article class="reward-item rarity-${pendingItem.rarity}">
                  <h2>${pendingItem.name}</h2>
                  <p>${pendingItem.description}</p>
                </article>
                <button data-action="queue-next-case">Take Object</button>`
              : `<button data-action="spin-wheel">Spin</button>`
          }
        </div>
      </div>
    </section>
  `;
}

export function resultMarkup(result) {
  return `
    <section class="result-screen ${result.success ? "success" : "failure"}">
      <img src="${IMAGE_URLS.result}" alt="Archive result card" class="result-image" />
      <div>
        <h1>${result.success ? "Case Held" : "Case Slipped"}</h1>
        <p>${result.note}</p>
        <button data-action="continue">${result.success ? "Next Case" : "Keep Going"}</button>
      </div>
    </section>
  `;
}

export function eyepocalypseMarkup(state) {
  return `
    <section class="eyepocalypse-screen">
      <img src="${IMAGE_URLS.eyepocalypse}" alt="Eyepocalypse collage" class="case-image" />
      <div>
        <p class="eyebrow">THIRD STRIKE</p>
        <h1>The archive is looking back now.</h1>
        <p>Every solved case stays open. Every failed one stays close.</p>
        <p>Step forward and let the run finish breaking.</p>
        <button data-action="ack-eyepocalypse">See It Through</button>
      </div>
    </section>
  `;
}

export function gameOverMarkup(state, highScore) {
  return `
    <section class="game-over-screen">
      <img src="${IMAGE_URLS.gameOver}" alt="Archive shutdown" class="case-image" />
      <div>
        <h1>Run Ended</h1>
        <p>Cases cleared: <strong>${state.clearedCount}</strong></p>
        <p>Best run: <strong>${highScore}</strong></p>
        <div class="button-row">
          <button data-action="new-run">Start Fresh</button>
          <button data-action="back-menu" class="secondary">Return To Menu</button>
        </div>
      </div>
    </section>
  `;
}

export function webMarkup(runtime, phase, eyeInterference, tutorialState) {
  const nodePositions = [
    { x: 50, y: 10 },
    { x: 76, y: 24 },
    { x: 76, y: 56 },
    { x: 50, y: 72 },
    { x: 24, y: 56 },
    { x: 24, y: 24 },
    { x: 40, y: 32 },
    { x: 60, y: 48 },
  ];
  const baseWebLines = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
    [0, 6], [5, 6], [1, 6], [1, 7], [2, 7], [3, 7], [4, 7], [6, 7], [5, 7],
  ];
  const selectedIndexes = runtime.selected
    .map((fragmentId) => runtime.data.fragments.findIndex((fragment) => fragment.id === fragmentId))
    .filter((index) => index >= 0);
  const clueIndex = Math.max(
    0,
    Math.min((runtime.data.clueSteps?.length || 1) - 1, (runtime.data.inspects || 0) - runtime.inspectRemaining)
  );
  const activeClue = runtime.data.clueSteps?.[clueIndex] || runtime.data.clue;
  const stabilityPercent = Math.max(0, Math.round((runtime.stability / runtime.data.stability) * 100));
  const stabilityState = stabilityPercent <= 34 ? "critical" : stabilityPercent <= 64 ? "unstable" : "stable";
  const selectedIsPrefix = runtime.selected.every((fragmentId, index) => fragmentId === runtime.data.solution[index]);
  const hintedFragmentId = selectedIsPrefix ? runtime.data.solution[runtime.selected.length] : null;
  const feedbackById = runtime.feedback?.byId || {};
  const chainMarkup = Array.from({ length: runtime.data.solution.length }, (_, index) => {
    const fragmentId = runtime.selected[index];
    if (!fragmentId) {
      return `<span class="chain-slot" aria-hidden="true"></span>`;
    }

    const fragment = runtime.data.fragments.find((entry) => entry.id === fragmentId);
    const isAnchored = runtime.anchored.includes(fragmentId);
    const feedbackState = feedbackById[fragmentId];
    const classes = [
      "chain-chip",
      isAnchored ? "anchored" : "",
      feedbackState ? `fragment-${feedbackState}` : "",
    ].filter(Boolean).join(" ");
    const connector = index < runtime.data.solution.length - 1 ? `<span class="chain-link" aria-hidden="true"></span>` : "";
    return `<span class="${classes}">${isAnchored ? `<span class="chain-lock" aria-hidden="true">\u26bf</span>` : ""}${fragmentTextMarkup(fragment || { id: fragmentId, label: fragmentId }, runtime, "chain-chip-label")}</span>${connector}`;
  }).join("");

  return `
    <section class="minigame web-game cathedral-web-game stability-${stabilityState}">
      <div class="living-web-shell living-web-shell-${stabilityState}">
        ${tutorialPanelMarkup(runtime, tutorialState)}
        <div class="living-web-header">
          <div class="living-web-copy">
            <p class="eyebrow">${phase.toUpperCase()} RITE</p>
            <h1>${runtime.data.title.replace(/^The Web:\s*/, "")}</h1>
            <p class="web-lead">${runtime.data.excerpt}</p>
          </div>
          <div class="living-web-vitals" role="presentation">
            <article title="Stability">
              <span class="label" aria-hidden="true">👁</span>
              <strong>${runtime.stability}</strong>
            </article>
            <article title="Clues">
              <span class="label" aria-hidden="true">✦</span>
              <strong>${runtime.inspectRemaining}</strong>
            </article>
            <article title="Read length">
              <span class="label" aria-hidden="true">⛓</span>
              <strong>${runtime.selected.length}/${runtime.data.solution.length}</strong>
            </article>
          </div>
          ${eyeInterference ? `<p class="warning" aria-label="Eye pressure rising">👁</p>` : ""}
        </div>

        <div class="living-web-stage">
          <div class="cathedral-ribs" aria-hidden="true">
            <span class="rib rib-a"></span>
            <span class="rib rib-b"></span>
            <span class="rib rib-c"></span>
          </div>
          ${roseWindowMarkup()}
          <div class="incense-haze haze-a" aria-hidden="true"></div>
          <div class="incense-haze haze-b" aria-hidden="true"></div>
          ${candleRackMarkup("left")}
          ${candleRackMarkup("right")}
          <div class="sanctum-ledger">
            <span class="eyebrow" title="Selected read">⛓</span>
            <div class="web-chain-preview">${chainMarkup}</div>
          </div>
          <div class="web-field" data-web-canvas>
            ${
              runtime.lockReason === "resolved" && runtime.loadingFearId
                ? `<div class="fear-loading-panel" aria-hidden="true">
                    ${fearIconMarkup(FEAR_DATA_BY_ID[runtime.loadingFearId], "fear-icon fear-loading-icon")}
                    <span class="fear-loading-name">${FEAR_DATA_BY_ID[runtime.loadingFearId]?.name || "Fear"}</span>
                  </div>`
                : ""
            }
            <div class="web-cocoon cocoon-a" aria-hidden="true"></div>
            <div class="web-cocoon cocoon-b" aria-hidden="true"></div>
            <div class="web-cocoon cocoon-c" aria-hidden="true"></div>
            <svg class="silk-trail" viewBox="0 0 100 82" preserveAspectRatio="none" aria-hidden="true">
              <path data-web-trail="" d="" />
            </svg>
            <svg class="web-lines web-lines-base" viewBox="0 0 100 82" preserveAspectRatio="none" aria-hidden="true">
              ${baseWebLines
                .map(([fromIndex, toIndex]) => {
                  const from = nodePositions[fromIndex];
                  const to = nodePositions[toIndex];
                  return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
                })
                .join("")}
            </svg>
            <svg class="web-lines web-lines-active" viewBox="0 0 100 82" preserveAspectRatio="none" aria-hidden="true">
              ${selectedIndexes
                .slice(0, -1)
                .map((fromIndex, index) => {
                  const toIndex = selectedIndexes[index + 1];
                  const from = nodePositions[fromIndex];
                  const to = nodePositions[toIndex];
                  return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
                })
                .join("")}
            </svg>
            ${runtime.data.fragments
              .map((fragment, index) => {
                const isSelected = runtime.selected.includes(fragment.id);
                const isFocused = runtime.cursor === index;
                const selectedOrder = runtime.selected.indexOf(fragment.id);
                const isHinted = hintedFragmentId === fragment.id;
                const isAnchored = runtime.anchored.includes(fragment.id);
                const feedbackState = feedbackById[fragment.id];
                const position = nodePositions[index];
                return `<button
                  class="fragment web-node ${isSelected ? "selected" : ""} ${isFocused ? "focused" : ""} ${isHinted ? "hinted" : ""} ${isAnchored ? "fragment-anchored" : ""} ${feedbackState ? `fragment-${feedbackState}` : ""}"
                  type="button"
                  data-web-fragment="${index}"
                  aria-pressed="${isSelected ? "true" : "false"}"
                  aria-disabled="${isAnchored ? "true" : "false"}"
                  aria-label="${displayFragmentLabel(fragment.label)}${isAnchored ? " anchored" : ""}${isSelected ? ` selected ${selectedOrder + 1} of ${runtime.data.solution.length}` : ""}"
                  style="--node-x:${position.x}%; --node-y:${position.y}%"
                  ${isAnchored ? "disabled" : ""}
                >
                  ${isSelected ? `<span class="node-order">${selectedOrder + 1}</span>` : ""}
                  ${isAnchored ? `<span class="node-lock" aria-hidden="true">\u26bf</span>` : ""}
                  ${fragmentTextMarkup(fragment, runtime)}
                </button>`;
              })
              .join("")}
            <div class="web-spider" data-web-spider aria-hidden="true">
              <img
                class="web-spider-sprite"
                data-web-spider-sprite
                src="${SPIDER_FRAME_URLS.idle[0]}"
                alt=""
                draggable="false"
              />
            </div>
          </div>
        </div>

        <div class="living-web-footer">
          <article class="web-status-card" title="${runtime.lastFeedback}">
            <div class="stability-hud" aria-label="Stability state ${stabilityState}">
              <span class="stability-icon" aria-hidden="true">👁</span>
              <div class="stability-meter" aria-hidden="true">
                <span style="width:${stabilityPercent}%"></span>
              </div>
            </div>
            <p class="feedback-line">${runtime.lastFeedback}</p>
            <div class="web-actions">
              <button data-action="web-submit" title="Submit read">Seal</button>
              <button data-action="web-clue" class="secondary" title="Use clue">Clue</button>
            </div>
          </article>
          <article class="web-attempts ${runtime.clueOpen ? "clue-open" : ""}">
            ${runtime.clueOpen ? `<div class="clue-panel cathedral-clue">${activeClue}</div>` : ""}
            ${
              runtime.committedGroups.length
                ? `<ul class="attempt-chain-list">
                    ${runtime.committedGroups
                      .map(
                        (attempt) =>
                          `<li><strong>${attempt.labels.join(" — ")}</strong><span>${attempt.verdict}</span></li>`
                      )
                      .join("")}
                  </ul>`
                : `<div class="attempt-empty" aria-hidden="true">
                    ${Array.from({ length: runtime.data.solution.length }, () => `<span></span>`).join("")}
                  </div>`
            }
          </article>
        </div>
      </div>
    </section>
  `;
}
