import {
  CASE_DEFINITIONS,
  DIFFICULTY_SETTINGS,
  FEAR_ORDER,
  ITEM_DEFINITIONS,
  MAX_STRIKES,
  STORAGE_KEYS,
} from "./run-data.js";
import {
  archiveMarkup,
  itemWheelMarkup,
  caseIntroMarkup,
  resultMarkup,
  eyepocalypseMarkup,
  gameOverMarkup,
  webMarkup,
  menuMarkup,
} from "./templates.js";
import { FEAR_DATA, FEAR_DATA_BY_ID } from "./fear-data.js";
import { SPIDER_FRAME_URLS } from "./assets.js";
import { MusicDirector } from "./sound.js";
import { pickRandom, pickWeighted, shuffleList } from "./random.js";
import { PHASES, createInitialRunState, formatDuration, hydrateStoredRunState } from "./run-state.js";
import {
  WEB_FEEDBACK_MS,
  fragmentLabelMap,
  displayFragmentLabel,
  webStabilityState,
  initialWebFeedbackState,
  evaluateWebRead,
  anchoredPrefixForRead,
  buildFeedbackLookup,
} from "./web-runtime.js";
import {
  SPIDER_HOVER_PAUSE_MS,
  SPIDER_TWITCH_MS,
  SPIDER_HINT_CHANCE,
  SPIDER_HINT_ORBIT_MS,
  SPIDER_HINT_RECOIL_MS,
  SPIDER_HINT_LINGER_MS,
  createWebAmbientState,
  syncWebAmbient,
} from "./web-ambient.js";

const CASE_RESOLVE_DELAY_MS = 540;
const FEAR_CYCLE_MIN_MS = 800;
const FEAR_CYCLE_MAX_MS = 1200;

function reportBootStep(message, percent, label = message) {
  window.__archiveBoot?.step(message, percent, label);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeKey(event) {
  if (event.key === " ") {
    return "space";
  }
  return event.key.toLowerCase();
}

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return undefined;
  }
}

export class ArchiveRunGame {
  constructor(root) {
    this.root = root;
    this.state = createInitialRunState();
    this.music = new MusicDirector();
    this.boundKeyHandler = this.handleGlobalKeydown.bind(this);
    this.boundVisibilityResume = () => {
      this.music.resumeIfNeeded();
    };
    this.prefersReducedMotion = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.lastJumpscareAt = 0;
    this.runClockId = null;
    this.resolveCaseTimer = null;
    this.webFeedbackTimer = null;
    this.pendingDomFx = [];
    this.hasReportedInitialRender = false;
    this.loadingFearTimer = null;
    this.webAmbient = createWebAmbientState();
  }

  mount() {
    reportBootStep("Loading persistent state.", 40, "Loading save");
    this.loadPersistentState();
    reportBootStep("Persistent state ready.", 46, "Save loaded");
    this.music.installAutoUnlock();
    reportBootStep("Audio unlock hooks installed.", 52, "Audio hooks ready");
    this.preloadSpiderFrames();
    reportBootStep("Spider frames queued for preload.", 58, "Preloading sprites");
    this.render();
    reportBootStep("Initial render requested.", 72, "Rendering shell");
    window.addEventListener("keydown", this.boundKeyHandler);
    window.addEventListener("focus", this.boundVisibilityResume);
    document.addEventListener("visibilitychange", this.boundVisibilityResume);
    reportBootStep("Input and visibility listeners attached.", 80, "Binding listeners");
    if (this.state.active) {
      this.startRunClock();
      reportBootStep("Active run clock resumed.", 84, "Resuming run");
    }
    window.addEventListener("beforeunload", () => this.savePersistentState());
    reportBootStep("Shutdown persistence hook armed.", 88, "Finalizing boot");
  }

  loadPersistentState() {
    const highScore = Number(safeStorageGet(STORAGE_KEYS.highScore) || "0");
    const savedRun = safeStorageGet(STORAGE_KEYS.runState);
    this.highScore = Number.isFinite(highScore) ? highScore : 0;

    if (savedRun) {
      try {
        const parsed = JSON.parse(savedRun);
        this.state = hydrateStoredRunState(parsed);
        if (this.state.activeCase?.fear && this.state.activeCase.fear !== "web") {
          this.state = {
            ...createInitialRunState(),
            difficulty: this.state.difficulty || "normal",
            clearedCount: this.state.clearedCount || 0,
            strikes: this.state.strikes || 0,
            runSeconds: this.state.runSeconds || 0,
          };
        }
      } catch {
        this.state = createInitialRunState();
      }
    }
  }

  savePersistentState() {
    safeStorageSet(STORAGE_KEYS.highScore, String(this.highScore));
    safeStorageSet(STORAGE_KEYS.runState, JSON.stringify(this.state));
  }

  resetRunState() {
    this.clearResolveCaseTimer();
    this.clearWebFeedbackTimer();
    this.stopLoadingFearCycle();
    this.stopRunClock();
    this.music.stopWheelSpin(false);
    this.state = createInitialRunState();
    this.savePersistentState();
  }

  startNewRun(difficulty = this.state.difficulty || "normal") {
    this.clearResolveCaseTimer();
    this.clearWebFeedbackTimer();
    this.stopLoadingFearCycle();
    this.music.enable();
    this.music.unlock();
    this.stopRunClock();
    this.music.stopWheelSpin(false);
    this.state = createInitialRunState();
    this.state.difficulty = difficulty;
    this.state.active = true;
    this.startRunClock();
    this.queueNextCase();
  }

  restartRun() {
    this.startNewRun(this.state.difficulty || "normal");
  }

  resumeRun() {
    this.clearResolveCaseTimer();
    this.clearWebFeedbackTimer();
    this.music.enable();
    this.music.unlock();
    if (!this.state.active) {
      this.startNewRun();
      return;
    }

    this.startRunClock();
    this.render();
  }

  queueNextCase() {
    this.clearResolveCaseTimer();
    this.clearWebFeedbackTimer();
    this.stopLoadingFearCycle();
    const fear = this.pickNextFear();
    const phase = PHASES[this.state.phaseIndex];
    this.state.activeCase = {
      fear,
      phase,
      data: this.pickNextCaseData(fear),
    };
    this.state.currentScreen = "case-intro";
    this.state.helpOpen = false;
    this.state.pendingItem = null;
    this.state.wheelSpinning = false;
    this.state.wheelSpinTurns = 0;
    this.state.result = null;
    this.clearJumpscare();
    this.state.active = true;
    this.updateAudio();
    this.savePersistentState();
    this.render();
  }

  startRunClock() {
    if (this.runClockId || !this.state.active) {
      return;
    }

    this.runClockId = window.setInterval(() => {
      if (!this.state.active) {
        this.stopRunClock();
        return;
      }
      this.state.runSeconds = (this.state.runSeconds || 0) + 1;
      this.refreshRunClockDisplay();
      if (this.state.runSeconds % 15 === 0) {
        this.savePersistentState();
      }
    }, 1000);
  }

  refreshRunClockDisplay() {
    const runClock = this.root.querySelector("[data-run-seconds]");
    if (!runClock) {
      return;
    }

    runClock.textContent = this.state.active || this.state.runSeconds ? formatDuration(this.state.runSeconds) : "--:--";
  }

  stopRunClock() {
    if (this.runClockId) {
      window.clearInterval(this.runClockId);
      this.runClockId = null;
    }
  }

  preloadSpiderFrames() {
    if (typeof Image === "undefined") {
      return;
    }

    [...SPIDER_FRAME_URLS.walk, ...SPIDER_FRAME_URLS.idle].forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }

  clearResolveCaseTimer() {
    if (this.resolveCaseTimer) {
      window.clearTimeout(this.resolveCaseTimer);
      this.resolveCaseTimer = null;
    }
  }

  clearWebFeedbackTimer() {
    if (this.webFeedbackTimer) {
      window.clearTimeout(this.webFeedbackTimer);
      this.webFeedbackTimer = null;
    }
  }

  pickRandomFearId(excludeId = null) {
    return pickRandom(FEAR_DATA.map((fear) => fear.id), excludeId);
  }

  setLoadingFear(id = this.pickRandomFearId(this.state.loadingFearId), shouldRender = true) {
    this.state.loadingFearId = FEAR_DATA_BY_ID[id] ? id : FEAR_DATA[0].id;
    if (this.state.caseRuntime?.lockReason === "resolved") {
      this.state.caseRuntime.loadingFearId = this.state.loadingFearId;
    }
    if (shouldRender) {
      this.render();
    }
  }

  stopLoadingFearCycle() {
    if (this.loadingFearTimer) {
      window.clearTimeout(this.loadingFearTimer);
      this.loadingFearTimer = null;
    }
  }

  beginLoadingFearCycle(initialId = this.pickRandomFearId(this.state.loadingFearId)) {
    this.stopLoadingFearCycle();
    this.setLoadingFear(initialId, false);
    const tick = () => {
      const delay = FEAR_CYCLE_MIN_MS + Math.random() * (FEAR_CYCLE_MAX_MS - FEAR_CYCLE_MIN_MS);
      this.loadingFearTimer = window.setTimeout(() => {
        this.setLoadingFear(this.pickRandomFearId(this.state.loadingFearId));
        tick();
      }, delay);
    };
    tick();
  }

  scheduleCaseResolution(callback, delay = CASE_RESOLVE_DELAY_MS) {
    this.clearResolveCaseTimer();
    this.resolveCaseTimer = window.setTimeout(() => {
      this.resolveCaseTimer = null;
      callback();
    }, delay);
  }

  toggleHelp(force) {
    const nextValue = typeof force === "boolean" ? force : !this.state.helpOpen;
    this.state.helpOpen = nextValue;
    this.render();
  }

  dismissTutorial() {
    this.state.tutorialDismissed = true;
    this.savePersistentState();
    this.render();
  }

  completeTutorial() {
    if (this.state.tutorialSeen) {
      return;
    }

    this.state.tutorialSeen = true;
    this.state.tutorialDismissed = true;
    this.savePersistentState();
  }

  clearJumpscare() {
    this.state.jumpscare = null;
  }

  triggerJumpscare(kind = "eye", caption = "The archive twitches.") {
    if (this.prefersReducedMotion) {
      return;
    }

    const now = performance.now();
    if (now - this.lastJumpscareAt < 4200) {
      return;
    }

    this.lastJumpscareAt = now;
    const token = now;
    this.state.jumpscare = { kind, caption, token };
    this.music.playJumpscare(kind);
    this.render();
    window.setTimeout(() => {
      if (this.state.jumpscare?.token === token) {
        this.state.jumpscare = null;
        this.render();
      }
    }, kind === "collapse" ? 780 : 480);
  }

  pulseSpiderTwitch(duration = SPIDER_TWITCH_MS) {
    const ambient = this.webAmbient;
    ambient.twitchUntil = performance.now() + duration;
    if (!ambient.spider) {
      return;
    }

    ambient.spider.classList.remove("twitch");
    void ambient.spider.offsetWidth;
    ambient.spider.classList.add("twitch");
    window.setTimeout(() => {
      if (ambient.spider) {
        ambient.spider.classList.remove("twitch");
      }
    }, duration + 40);
  }

  maybeTriggerSpiderHint(fragmentId, x, y) {
    const runtime = this.state.caseRuntime;
    const ambient = this.webAmbient;
    if (
      !runtime
      || runtime.locked
      || Math.random() > SPIDER_HINT_CHANCE
    ) {
      return;
    }

    const now = performance.now();
    const targetIndex = runtime.selected.length;
    const solutionIndex = runtime.data.solution.indexOf(fragmentId);
    if (solutionIndex === -1) {
      ambient.targetX = clamp(x + (x >= 50 ? -4.2 : 4.2), 6, 94);
      ambient.targetY = clamp(y - 1.8, 6, 76);
      ambient.idleX = x;
      ambient.idleY = y;
      ambient.hintMode = "recoil";
      ambient.hintUntil = now + SPIDER_HINT_RECOIL_MS;
      ambient.hoverLockUntil = ambient.hintUntil;
      this.pulseSpiderTwitch(220);
      return;
    }

    if (solutionIndex === targetIndex) {
      ambient.hintMode = "linger";
      ambient.hintUntil = now + SPIDER_HINT_LINGER_MS;
      ambient.hoverLockUntil = now + SPIDER_HOVER_PAUSE_MS + SPIDER_HINT_LINGER_MS;
      return;
    }

    ambient.hintMode = "orbit";
    ambient.hintUntil = now + SPIDER_HINT_ORBIT_MS;
    ambient.orbitCenterX = x;
    ambient.orbitCenterY = y;
    ambient.hoverLockUntil = ambient.hintUntil;
  }

  syncWebPressureState(runtime) {
    if (!runtime) {
      return;
    }

    const nextState = webStabilityState(runtime);
    if (runtime.lastStabilityState !== nextState && nextState === "critical") {
      this.music.playCriticalRumble();
      this.triggerJumpscare("eye", "It has noticed the weakness in the read.");
    }
    runtime.lastStabilityState = nextState;
  }

  queueSelectorFx(selector, className) {
    this.pendingDomFx.push({ selector, className });
  }

  queueNodeFx(index, className) {
    this.queueSelectorFx(`[data-web-fragment="${index}"]`, className);
  }

  flushDomFxQueue() {
    if (!this.pendingDomFx.length) {
      return;
    }

    const queue = this.pendingDomFx.splice(0);
    queue.forEach(({ selector, className }) => {
      const element = this.root.querySelector(selector);
      if (!element) {
        return;
      }

      element.classList.remove(className);
      void element.offsetWidth;
      element.classList.add(className);

      const cleanup = () => {
        element.classList.remove(className);
      };

      element.addEventListener("animationend", cleanup, { once: true });
      window.setTimeout(cleanup, 1100);
    });
  }

  pickNextFear() {
    const pool = FEAR_ORDER.map((fear, index) => {
      let weight = 1;
      if (index === this.state.currentFearIndex) {
        weight = 0.25;
      }
      if (this.state.caseIndex < 3 && index === this.state.caseIndex) {
        weight = 3;
      }
      return { weight, value: fear };
    });

    const fear = pickWeighted(pool);
    this.state.currentFearIndex = FEAR_ORDER.indexOf(fear);
    return fear;
  }

  refillWebCaseBag(casePool) {
    const shuffledIndexes = shuffleList(casePool.map((_, index) => index));
    if (casePool.length > 1 && this.state.lastWebCaseId) {
      const repeatedIndex = casePool.findIndex((entry) => entry.id === this.state.lastWebCaseId);
      if (repeatedIndex !== -1 && shuffledIndexes[0] === repeatedIndex) {
        [shuffledIndexes[0], shuffledIndexes[1]] = [shuffledIndexes[1], shuffledIndexes[0]];
      }
    }
    this.state.webCaseBag = shuffledIndexes;
    this.state.webCaseCursor = 0;
  }

  pickNextCaseData(fear) {
    const definitions = CASE_DEFINITIONS[fear];
    if (!Array.isArray(definitions)) {
      return deepClone(definitions);
    }

    if (!definitions.length) {
      throw new Error(`No case definitions found for fear: ${fear}`);
    }

    if (!Array.isArray(this.state.webCaseBag) || this.state.webCaseCursor >= this.state.webCaseBag.length) {
      this.refillWebCaseBag(definitions);
    }

    const caseIndex = this.state.webCaseBag[this.state.webCaseCursor];
    this.state.webCaseCursor += 1;
    const pickedCase = definitions[caseIndex] || definitions[0];
    this.state.lastWebCaseId = pickedCase.id;
    return deepClone(pickedCase);
  }

  activeModifiersForCase(fear) {
    const modifiers = {
      clueBoost: false,
      webStabilityBoost: false,
    };

    for (const item of this.state.inventory) {
      if (!item.scope || item.scope === "run") {
        modifiers[item.effect] = true;
      }
      if (item.scope === "fear" && item.fear === fear) {
        modifiers[item.effect] = true;
      }
      if (item.scope === "next-case") {
        modifiers[item.effect] = true;
      }
    }

    return modifiers;
  }

  applyNextCaseItemConsumption(fear) {
    this.state.inventory = this.state.inventory.filter((item) => {
      if (item.scope === "run") {
        return true;
      }
      if (item.scope === "fear" && item.fear !== fear) {
        return true;
      }
      return false;
    });
  }

  completeCase(success, note) {
    this.clearWebFeedbackTimer();
    this.stopLoadingFearCycle();
    const fear = this.state.activeCase.fear;
    this.applyNextCaseItemConsumption(fear);
    this.clearJumpscare();

    if (success) {
      this.state.clearedCount += 1;
      this.state.caseIndex += 1;
      this.state.phaseIndex = clamp(Math.floor(this.state.clearedCount / 2), 0, PHASES.length - 1);
      this.state.log.unshift(note);
      this.state.currentScreen = "item-wheel";
      this.state.result = {
        fear,
        success: true,
        note,
      };
    } else {
      this.state.caseIndex += 1;
      const blocked = this.state.inventory.find((item) => item.effect === "preventNextStrike");
      if (blocked) {
        this.state.inventory = this.state.inventory.filter((item) => item.id !== blocked.id);
        this.state.log.unshift(`${note} The umbrella took the strike.`);
      } else {
        this.state.strikes += 1;
        this.state.log.unshift(note);
      }

      this.state.phaseIndex = clamp(Math.floor((this.state.clearedCount + this.state.strikes) / 2), 0, PHASES.length - 1);
      this.state.eyeInterference = this.state.strikes >= 2;
      this.state.currentScreen = this.state.strikes >= MAX_STRIKES ? "eyepocalypse" : "result";
      this.state.result = {
        fear,
        success: false,
        note,
      };
    }

    this.updateHighScore();
    this.updateAudio();
    this.savePersistentState();
    this.render();
  }

  updateHighScore() {
    if (this.state.clearedCount > this.highScore) {
      this.highScore = this.state.clearedCount;
    }
  }

  spinItemWheel() {
    if (this.state.wheelSpinning) {
      return;
    }

    const lastAwardedId = this.state.lastAwardedItemId;
    const weightedItems = ITEM_DEFINITIONS.map((item) => ({
      value: item,
      weight: item.weight,
    }));

    let picked = pickWeighted(weightedItems);
    if (picked?.id === lastAwardedId) {
      const alternatives = ITEM_DEFINITIONS.filter((item) => item.id !== lastAwardedId);
      if (alternatives.length) {
        picked = pickWeighted(alternatives.map((item) => ({ value: item, weight: item.weight })));
      }
    }

    this.state.wheelSpinning = true;
    this.state.wheelSpinTurns = 1440 + Math.floor(Math.random() * 1080);
    this.state.pendingItem = null;
    this.beginLoadingFearCycle();
    this.music.startWheelSpin();
    this.queueSelectorFx("[data-wheel-stage]", "fx-wheel-charge");
    this.render();

    window.setTimeout(() => {
      this.state.wheelSpinning = false;
      this.stopLoadingFearCycle();
      this.setLoadingFear(this.pickRandomFearId(this.state.loadingFearId), false);
      this.state.pendingItem = picked;
      this.state.lastAwardedItemId = picked.id;
      if (picked.effect === "extraStrikeBuffer") {
        this.state.strikes = Math.max(0, this.state.strikes - 1);
      }
      if (this.state.inventory.length >= 3) {
        this.state.inventory.shift();
      }
      this.state.inventory.push(picked);
      this.music.stopWheelSpin(true);
      this.queueSelectorFx("[data-wheel-stage]", "fx-wheel-reveal");
      this.savePersistentState();
      this.render();
    }, 1400);
  }

  proceedFromResult() {
    this.clearResolveCaseTimer();
    this.clearWebFeedbackTimer();
    this.stopLoadingFearCycle();
    this.clearJumpscare();
    if (this.state.strikes >= MAX_STRIKES) {
      this.state.currentScreen = "game-over";
      this.state.active = false;
      this.stopRunClock();
      this.savePersistentState();
      this.render();
      return;
    }

    this.queueNextCase();
  }

  resetSavedRun() {
    this.resetRunState();
    this.clearJumpscare();
    this.music.setScene("menu", "mundane");
    this.render();
  }

  updateAudio() {
    const fear = this.state.activeCase?.fear || "menu";
    const phase = this.state.activeCase?.phase || PHASES[this.state.phaseIndex];
    this.music.setScene(fear, phase, this.state.eyeInterference);
  }

  handleGlobalKeydown(event) {
    const key = normalizeKey(event);

    if (key === "escape" && this.state.helpOpen) {
      this.toggleHelp(false);
      return;
    }

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "space", "enter", "tab"].includes(key)) {
      event.preventDefault();
    }

    if (this.state.helpOpen) {
      return;
    }

    if (key === "m") {
      this.music.toggle();
      this.render();
      return;
    }

    if (!this.state.activeCase) {
      return;
    }

    if (this.state.currentScreen !== "minigame") {
      return;
    }

    if (this.state.activeCase.fear === "web") {
      this.handleWebInput(event);
    }
  }

  startCase() {
    this.music.enable();
    this.music.unlock();
    const fear = this.state.activeCase.fear;
    const modifiers = this.activeModifiersForCase(fear);
    const difficulty = DIFFICULTY_SETTINGS[this.state.difficulty] || DIFFICULTY_SETTINGS.normal;

    if (fear === "web") {
      const data = deepClone(this.state.activeCase.data);
      data.stability += modifiers.webStabilityBoost ? 2 : 0;
      data.stability += difficulty.webStabilityBonus || 0;
      data.inspects += modifiers.clueBoost ? 1 : 0;
      this.state.caseRuntime = {
        cursor: 0,
        selected: [],
        anchored: [],
        committedGroups: [],
        stability: data.stability,
        inspectRemaining: data.inspects,
        clueOpen: false,
        locked: false,
        lockReason: null,
        feedback: initialWebFeedbackState(),
        loadingFearId: this.state.loadingFearId,
        lastStabilityState: "stable",
        lastFeedback: "Build the clean read.",
        data,
      };
      this.state.caseRuntime.selected = [...this.state.caseRuntime.anchored];
      this.syncWebPressureState(this.state.caseRuntime);
    }

    this.state.currentScreen = "minigame";
    this.clearJumpscare();
    this.startRunClock();
    this.music.playFearCue(fear);
    this.updateAudio();
    this.render();
  }

  handleWebInput(event) {
    const runtime = this.state.caseRuntime;
    if (!runtime || runtime.locked) {
      return;
    }
    const fragments = runtime.data.fragments;
    const key = normalizeKey(event);
    const columns = 4;

    if (key === "arrowright" || key === "d") {
      runtime.cursor = (runtime.cursor + 1) % fragments.length;
    } else if (key === "arrowleft" || key === "a") {
      runtime.cursor = (runtime.cursor - 1 + fragments.length) % fragments.length;
    } else if (key === "arrowdown" || key === "s") {
      runtime.cursor = (runtime.cursor + columns) % fragments.length;
    } else if (key === "arrowup" || key === "w") {
      runtime.cursor = (runtime.cursor - columns + fragments.length) % fragments.length;
    } else if (key === "space") {
      const current = fragments[runtime.cursor].id;
      this.applyWebSelection(current);
    } else if (key === "enter") {
      if (this.submitWebSelection()) {
        return;
      }
    } else if (key === "shift" || key === "tab") {
      if (runtime.clueOpen || runtime.inspectRemaining > 0) {
        if (!runtime.clueOpen) {
          runtime.inspectRemaining -= 1;
        }
        runtime.clueOpen = !runtime.clueOpen;
      }
    }

    if (!runtime.locked && runtime.stability <= 0) {
      this.completeCase(false, "Bad read. The case closed before you could steady it.");
      return;
    }

    this.render();
  }

  applyWebSelection(fragmentId) {
    const runtime = this.state.caseRuntime;
    if (!runtime || this.state.activeCase?.fear !== "web") {
      return false;
    }
    if (runtime.locked) {
      return false;
    }
    const fragmentIndex = runtime.data.fragments.findIndex((entry) => entry.id === fragmentId);
    const anchoredCount = runtime.anchored.length;

    if (runtime.anchored.includes(fragmentId)) {
      runtime.lastFeedback = "Anchored fragments stay fixed in the chain.";
      this.music.playWebWetClick();
      return false;
    }

    if (runtime.selected.at(-1) === fragmentId && runtime.selected.length > anchoredCount) {
      runtime.selected = runtime.selected.slice(0, -1);
      runtime.lastFeedback = runtime.selected.length
        ? "Last loose fragment removed."
        : anchoredCount
          ? "Anchored fragments remain in place."
          : "Build the clean read.";
      this.music.playWebWetClick();
      if (fragmentIndex >= 0) {
        this.queueNodeFx(fragmentIndex, "fx-release");
      }
      return true;
    }

    if (runtime.selected.includes(fragmentId)) {
      runtime.lastFeedback = "That fragment is already in the read.";
      this.music.playThreadSnap();
      this.pulseSpiderTwitch();
      if (fragmentIndex >= 0) {
        this.queueNodeFx(fragmentIndex, "fx-reject");
      }
      return false;
    }

    if (runtime.selected.length >= runtime.data.solution.length) {
      runtime.lastFeedback = `Only ${runtime.data.solution.length} fragments fit in one clean read. Remove one or submit.`;
      this.music.playThreadSnap();
      this.pulseSpiderTwitch();
      this.queueSelectorFx(".web-field", "fx-fail");
      return false;
    }

    runtime.selected.push(fragmentId);
    runtime.lastFeedback = "Fragment tied in.";
    this.music.playWebStringPluck();
    if (fragmentIndex >= 0) {
      this.queueNodeFx(fragmentIndex, "fx-cast");
    }
    this.queueSelectorFx(".web-field", "fx-thread");
    return true;
  }

  submitWebSelection() {
    const runtime = this.state.caseRuntime;
    if (!runtime || runtime.locked) {
      return false;
    }
    const picked = [...runtime.selected];
    const fragmentsById = fragmentLabelMap(runtime.data.fragments);
    const evaluation = evaluateWebRead(picked, runtime.data.solution);
    const anchored = anchoredPrefixForRead(picked, runtime.data.solution, runtime.anchored);
    const exactMatches = evaluation.filter((entry) => entry.state === "correct").length;
    const overlapMatches = evaluation.filter((entry) => entry.state !== "wrong").length;
    const wrongMatches = evaluation.filter((entry) => entry.state === "wrong").length;
    const isSolved = picked.length === runtime.data.solution.length && exactMatches === runtime.data.solution.length;

    runtime.anchored = anchored;
    runtime.feedback = {
      active: true,
      byId: buildFeedbackLookup(evaluation, anchored),
    };

    const releaseFeedback = (callback) => {
      this.clearWebFeedbackTimer();
      this.webFeedbackTimer = window.setTimeout(() => {
        this.webFeedbackTimer = null;
        callback();
      }, WEB_FEEDBACK_MS);
    };

    if (picked.length !== runtime.data.solution.length) {
      this.completeTutorial();
      runtime.stability -= 1;
      runtime.locked = true;
      runtime.lockReason = "feedback";
      runtime.lastFeedback = runtime.anchored.length
        ? `Too short. ${runtime.anchored.length} anchored fragment${runtime.anchored.length === 1 ? "" : "s"} hold.`
        : `Too short. This read needs ${runtime.data.solution.length} fragments.`;
      this.music.playThreadSnap();
      this.pulseSpiderTwitch(260);
      this.queueSelectorFx(".web-field", "fx-fail");
      releaseFeedback(() => {
        runtime.feedback = initialWebFeedbackState();
        runtime.selected = [...runtime.anchored];
        this.syncWebPressureState(runtime);
        if (runtime.stability <= 0) {
          runtime.locked = true;
          runtime.lockReason = "resolved";
          runtime.lastFeedback = "The case is slipping shut.";
          this.triggerJumpscare("collapse", "It closes before you finish reading.");
          this.render();
          this.scheduleCaseResolution(() => {
            this.completeCase(false, "Bad read. The case closed before you could steady it.");
          }, 720);
          return;
        }
        runtime.locked = false;
        runtime.lockReason = null;
        runtime.lastFeedback = runtime.anchored.length
          ? `${runtime.anchored.length} fragment${runtime.anchored.length === 1 ? "" : "s"} anchored. Keep threading.`
          : "Build the clean read.";
        this.savePersistentState();
        this.render();
      });
    } else if (isSolved) {
      this.completeTutorial();
      runtime.locked = true;
      runtime.lockReason = "resolved";
      runtime.loadingFearId = this.state.loadingFearId;
      this.beginLoadingFearCycle();
      runtime.lastFeedback = "Read locked. Hold steady.";
      this.music.playSanctumBloom();
      this.queueSelectorFx(".web-field", "fx-success");
      this.render();
      this.scheduleCaseResolution(() => {
        this.completeCase(true, "Read held. The statement is still tense, but it is no longer closing around you.");
      }, WEB_FEEDBACK_MS);
      return true;
    } else {
      const isNearMiss = overlapMatches >= 3;
      runtime.locked = true;
      runtime.lockReason = "feedback";
      runtime.committedGroups.unshift({
        ids: picked,
        labels: picked.map((id) => displayFragmentLabel(fragmentsById[id])),
        exactMatches,
        overlapMatches,
        verdict: isNearMiss
          ? "Close, but the order still slips."
          : "Wrong read. The chain pulls the wrong way.",
      });
      runtime.committedGroups = runtime.committedGroups.slice(0, 4);
      runtime.stability -= 2;
      this.music.playThreadSnap();
      this.pulseSpiderTwitch(wrongMatches ? 420 : SPIDER_TWITCH_MS);
      this.queueSelectorFx(".web-field", "fx-fail");
      if (runtime.stability <= 2 || (!isNearMiss && exactMatches === 0)) {
        this.triggerJumpscare("spider", "Something just moved across the board.");
      }
      runtime.lastFeedback =
        exactMatches >= 2
          ? `Close: ${exactMatches} fragment${exactMatches === 1 ? "" : "s"} in the right place.`
          : isNearMiss
            ? "Right language, wrong order."
            : "Those fragments belong here, but not in that order.";
      releaseFeedback(() => {
        runtime.feedback = initialWebFeedbackState();
        runtime.selected = [...runtime.anchored];
        runtime.locked = false;
        runtime.lockReason = null;
        runtime.lastFeedback = runtime.anchored.length
          ? `${runtime.anchored.length} fragment${runtime.anchored.length === 1 ? "" : "s"} anchored. Build from there.`
          : "Build the clean read.";
        this.syncWebPressureState(runtime);
        if (runtime.stability <= 0) {
          runtime.locked = true;
          runtime.lockReason = "resolved";
          runtime.loadingFearId = this.state.loadingFearId;
          this.beginLoadingFearCycle();
          runtime.lastFeedback = "The case is slipping shut.";
          this.triggerJumpscare("collapse", "It closes before you finish reading.");
          this.render();
          this.scheduleCaseResolution(() => {
            this.completeCase(false, "Bad read. The case closed before you could steady it.");
          }, 720);
          return;
        }
        this.savePersistentState();
        this.render();
      });
    }
    this.syncWebPressureState(runtime);

    if (runtime.stability <= 0) {
      runtime.locked = true;
      runtime.lockReason = "feedback";
    }

    return false;
  }

  render() {
    const screen = this.state.currentScreen;
    const fear = this.state.activeCase?.fear || "menu";
    const phase = this.state.activeCase?.phase || PHASES[this.state.phaseIndex];

    this.root.innerHTML = archiveMarkup({
      highScore: this.highScore,
      state: this.state,
      audioStatus: this.music.getStatus(),
      content: this.renderScreen(screen, fear, phase),
    });

    this.attachEvents();
    this.attachWebAmbient();
    this.updateAudio();
    this.flushDomFxQueue();
    if (!this.hasReportedInitialRender) {
      this.hasReportedInitialRender = true;
      reportBootStep("Archive shell rendered successfully.", 94, "UI rendered");
    }
  }

  attachWebAmbient() {
    syncWebAmbient({
      root: this.root,
      webAmbient: this.webAmbient,
      currentScreen: this.state.currentScreen,
      activeFear: this.state.activeCase?.fear,
      caseRuntime: this.state.caseRuntime,
      prefersReducedMotion: this.prefersReducedMotion,
      clamp,
      maybeTriggerSpiderHint: (fragmentId, x, y) => this.maybeTriggerSpiderHint(fragmentId, x, y),
    });
  }

  renderScreen(screen, fear, phase) {
    if (screen === "menu") {
      return menuMarkup();
    }

    if (screen === "case-intro") {
      return caseIntroMarkup(this.state.activeCase);
    }

    if (screen === "item-wheel") {
      return itemWheelMarkup({
        pendingItem: this.state.pendingItem,
        wheelSpinning: Boolean(this.state.wheelSpinning),
        wheelSpinTurns: this.state.wheelSpinTurns || 0,
        loadingFearId: this.state.loadingFearId,
      });
    }

    if (screen === "result") {
      return resultMarkup(this.state.result);
    }

    if (screen === "eyepocalypse") {
      return eyepocalypseMarkup(this.state);
    }

    if (screen === "game-over") {
      return gameOverMarkup(this.state, this.highScore);
    }

    if (screen === "minigame") {
      return webMarkup(this.state.caseRuntime, phase, this.state.eyeInterference, this.state);
    }

    return "<section><p>Unknown state.</p></section>";
  }

  attachEvents() {
    this.root.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (!["audio-toggle", "back-menu", "toggle-help"].includes(action)) {
          this.music.enable();
          this.music.unlock();
        }

        if (action === "new-run") this.startNewRun();
        if (action === "new-run-easy") this.startNewRun("easy");
        if (action === "new-run-normal") this.startNewRun("normal");
        if (action === "new-run-hard") this.startNewRun("hard");
        if (action === "resume-run") this.resumeRun();
        if (action === "restart-run") this.restartRun();
        if (action === "reset-run") this.resetSavedRun();
        if (action === "toggle-help") this.toggleHelp();
        if (action === "dismiss-tutorial") this.dismissTutorial();
        if (action === "start-case") this.startCase();
        if (action === "continue") this.proceedFromResult();
        if (action === "spin-wheel") this.spinItemWheel();
        if (action === "queue-next-case") this.queueNextCase();
        if (action === "web-submit") {
          if (this.submitWebSelection()) {
            return;
          }
          this.render();
        }
        if (action === "web-clue") {
          const runtime = this.state.caseRuntime;
          if (runtime && (runtime.clueOpen || runtime.inspectRemaining > 0)) {
            if (!runtime.clueOpen) {
              runtime.inspectRemaining -= 1;
            }
            runtime.clueOpen = !runtime.clueOpen;
            this.render();
          }
        }
        if (action === "ack-eyepocalypse") this.proceedFromResult();
        if (action === "back-menu") {
          this.clearResolveCaseTimer();
          this.clearWebFeedbackTimer();
          this.stopLoadingFearCycle();
          this.stopRunClock();
          this.music.stopWheelSpin(false);
          this.state.currentScreen = "menu";
          this.state.active = false;
          this.state.activeCase = null;
          this.state.helpOpen = false;
          this.clearJumpscare();
          this.savePersistentState();
          this.render();
        }
        if (action === "audio-toggle") {
          if (!this.music.getStatus().unlocked) {
            this.music.enable();
            this.music.unlock();
          } else {
            this.music.toggle();
          }
          this.render();
        }
      });
    });

    this.root.querySelectorAll("[data-web-fragment]").forEach((button) => {
      const applySelection = () => {
        const runtime = this.state.caseRuntime;
        if (!runtime || this.state.activeCase?.fear !== "web") {
          return;
        }
        const index = Number(button.dataset.webFragment);
        runtime.cursor = index;
        const nextX = Number.parseFloat(button.style.getPropertyValue("--node-x"));
        const nextY = Number.parseFloat(button.style.getPropertyValue("--node-y"));
        if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
          this.webAmbient.targetX = nextX;
          this.webAmbient.targetY = nextY;
          this.webAmbient.idleX = nextX;
          this.webAmbient.idleY = nextY;
          this.webAmbient.lastMoveAt = performance.now();
        }
        const current = runtime.data.fragments[index].id;
        if (this.applyWebSelection(current)) {
          button.blur();
          this.render();
        }
      };

      button.addEventListener("pointerdown", (event) => {
        if (event.button === 0) {
          event.preventDefault();
        }
      });

      button.addEventListener("click", (event) => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        applySelection();
      });
    });

    this.root.querySelector("[data-help-overlay]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        this.toggleHelp(false);
      }
    });
  }
}
