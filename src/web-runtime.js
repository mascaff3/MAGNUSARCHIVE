export const WEB_FEEDBACK_MS = 1200;

export function fragmentLabelMap(fragments) {
  return Object.fromEntries(fragments.map((fragment) => [fragment.id, fragment.label]));
}

export function displayFragmentLabel(label) {
  return label.replace(/^\d+\s+/, "");
}

export function webStabilityState(runtime) {
  if (!runtime?.data?.stability) {
    return "stable";
  }

  const ratio = runtime.stability / runtime.data.stability;
  if (ratio <= 0.34) {
    return "critical";
  }
  if (ratio <= 0.64) {
    return "unstable";
  }
  return "stable";
}

export function initialWebFeedbackState() {
  return {
    byId: {},
    active: false,
  };
}

export function evaluateWebRead(selected, solution) {
  const solutionIndexes = new Map(solution.map((fragmentId, index) => [fragmentId, index]));
  return selected.map((fragmentId, index) => ({
    id: fragmentId,
    index,
    state:
      solution[index] === fragmentId
        ? "correct"
        : solutionIndexes.has(fragmentId)
          ? "present"
          : "wrong",
  }));
}

export function anchoredPrefixForRead(selected, solution, existingAnchored = []) {
  let prefixLength = 0;
  while (
    prefixLength < selected.length
    && prefixLength < solution.length
    && selected[prefixLength] === solution[prefixLength]
  ) {
    prefixLength += 1;
  }

  return solution.slice(0, Math.max(existingAnchored.length, prefixLength));
}

export function buildFeedbackLookup(evaluation, anchored = []) {
  const byId = Object.fromEntries(evaluation.map((entry) => [entry.id, entry.state]));
  anchored.forEach((fragmentId) => {
    byId[fragmentId] = "correct";
  });
  return byId;
}

export function normalizeAnchoredPrefix(anchored, solution) {
  if (!Array.isArray(anchored)) {
    return [];
  }

  const nextAnchored = [];
  for (let index = 0; index < anchored.length; index += 1) {
    if (anchored[index] !== solution[index]) {
      break;
    }
    nextAnchored.push(anchored[index]);
  }
  return nextAnchored;
}

export function normalizeWebRuntime(runtime) {
  if (!runtime?.data?.solution || !runtime?.data?.fragments) {
    return runtime;
  }

  const anchored = normalizeAnchoredPrefix(runtime.anchored, runtime.data.solution);
  const selected = Array.isArray(runtime.selected) ? runtime.selected : [];
  const selectedStartsWithAnchors = anchored.every((fragmentId, index) => selected[index] === fragmentId);
  const normalizedSelected = selectedStartsWithAnchors ? selected : [...anchored];
  return {
    ...runtime,
    anchored,
    selected: normalizedSelected.length ? normalizedSelected : [...anchored],
    feedback: initialWebFeedbackState(),
    clueOpen: Boolean(runtime.clueOpen),
    committedGroups: Array.isArray(runtime.committedGroups) ? runtime.committedGroups : [],
    locked: runtime.lockReason === "resolved" ? Boolean(runtime.locked) : false,
    lockReason: runtime.lockReason === "resolved" ? runtime.lockReason : null,
    lastFeedback: runtime.lastFeedback || "Build the clean read.",
  };
}
