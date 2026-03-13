import { FEAR_DATA } from "./fear-data.js";
import { normalizeWebRuntime } from "./web-runtime.js";

export const PHASES = ["mundane", "distorted", "domain"];

export function createInitialRunState() {
  return {
    active: false,
    strikes: 0,
    caseIndex: 0,
    clearedCount: 0,
    phaseIndex: 0,
    eyeInterference: false,
    inventory: [],
    pendingItem: null,
    currentFearIndex: 0,
    difficulty: "normal",
    log: ["Intake opened. Nothing flagged yet."],
    currentScreen: "menu",
    helpOpen: false,
    result: null,
    jumpscare: null,
    tutorialSeen: false,
    tutorialDismissed: false,
    activeCase: null,
    runSeconds: 0,
    wheelSpinning: false,
    wheelSpinTurns: 0,
    lastAwardedItemId: null,
    webCaseBag: [],
    webCaseCursor: 0,
    lastWebCaseId: null,
    loadingFearId: FEAR_DATA[0].id,
  };
}

export function hydrateStoredRunState(parsed) {
  const nextState = { ...createInitialRunState(), ...parsed };
  if (nextState.caseRuntime && nextState.activeCase?.fear === "web") {
    nextState.caseRuntime = normalizeWebRuntime(nextState.caseRuntime);
  }
  return nextState;
}

export function formatDuration(totalSeconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
