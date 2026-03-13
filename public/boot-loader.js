(() => {
  const root = document.getElementById("app");
  const boot = document.getElementById("boot-screen");
  const copy = boot?.querySelector(".boot-copy");
  const logEl = document.getElementById("boot-log");
  const statusEl = document.getElementById("boot-status-label");
  const progressEl = document.getElementById("boot-progress-value");
  const progressBar = document.getElementById("boot-progress-bar");
  const ringEl = document.getElementById("boot-fear-ring");
  if (!root || !boot) {
    return;
  }

  const fearSigils = [
    { name: "Eye", id: "eye", color: "#39FF14" },
    { name: "Web", id: "web", color: "#C6A300" },
    { name: "Spiral", id: "spiral", color: "#7A00FF" },
    { name: "Buried", id: "buried", color: "#4B2E1F" },
    { name: "Vast", id: "vast", color: "#3A7BFF" },
    { name: "Hunt", id: "hunt", color: "#FF8C00" },
    { name: "Slaughter", id: "slaughter", color: "#A80000" },
    { name: "Corruption", id: "corruption", color: "#6C8F00" },
    { name: "Flesh", id: "flesh", color: "#B03A48" },
    { name: "Dark", id: "dark", color: "#0D001A" },
    { name: "Stranger", id: "stranger", color: "#CFCFCF" },
    { name: "End", id: "end", color: "#E8E3D9" },
    { name: "Lonely", id: "lonely", color: "#6F87A8" },
    { name: "Desolation", id: "desolation", color: "#FF4500" },
    { name: "Extinction", id: "extinction", color: "#7FFF00" },
  ];
  const startedAt = performance.now();
  let currentStageLabel = "Preparing shell";
  let currentStageStartedAt = startedAt;
  let lastHeartbeatAt = startedAt;
  let readySequenceStarted = false;
  let heartbeatId = 0;

  const buildFearRing = () => {
    if (!ringEl) {
      return;
    }

    const radius = 44;
    ringEl.innerHTML = "";
    fearSigils.forEach((sigil, index) => {
      const angle = ((Math.PI * 2) / fearSigils.length) * index - Math.PI / 2;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      const node = document.createElement("div");
      node.className = "boot-fear-sigil";
      node.setAttribute("role", "presentation");
      node.setAttribute("aria-hidden", "true");
      node.dataset.name = sigil.name;
      node.style.setProperty("--sigil-x", `${x}%`);
      node.style.setProperty("--sigil-y", `${y}%`);
      node.style.setProperty("--sigil-color", sigil.color);
      node.style.setProperty("--sigil-delay", `${index * 80}ms`);
      node.style.setProperty("--sigil-icon", `url('./assets/icons/fears/${sigil.id}.svg')`);
      node.innerHTML = `<span class="boot-fear-icon" aria-hidden="true"></span>`;
      ringEl.appendChild(node);
    });
  };

  const appendLog = (message, kind = "info") => {
    if (!logEl) {
      return;
    }

    const line = document.createElement("div");
    line.className = `boot-log-line${kind === "error" ? " error" : ""}`;
    const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2).padStart(5, "0");
    line.innerHTML = `<span class="boot-log-time">${elapsed}s</span><span>${message}</span>`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  };

  const setProgress = (percent, label) => {
    const clamped = Math.max(0, Math.min(100, percent));
    if (progressBar) {
      progressBar.style.setProperty("--boot-progress", `${clamped}%`);
    }
    if (progressEl) {
      progressEl.textContent = `${Math.round(clamped)}%`;
    }
    if (label && statusEl) {
      statusEl.textContent = label;
      currentStageLabel = label;
    }
  };

  window.__archiveBoot = {
    step(message, percent, label = message) {
      currentStageStartedAt = performance.now();
      lastHeartbeatAt = currentStageStartedAt;
      appendLog(message);
      setProgress(percent, label);
    },
    error(message) {
      appendLog(message, "error");
    },
  };

  const finishBoot = () => {
    if (boot.dataset.cleared === "true") {
      return;
    }
    boot.dataset.cleared = "true";
    document.body.classList.remove("app-loading");
    boot.classList.add("hidden");
    window.setTimeout(() => boot.remove(), 520);
  };

  const startReadySequence = () => {
    if (readySequenceStarted || boot.dataset.cleared === "true" || window.__archiveBootError) {
      return;
    }

    readySequenceStarted = true;
    boot.classList.add("ready-sequence");
    if (heartbeatId) {
      window.clearInterval(heartbeatId);
    }
    if (copy) {
      copy.textContent = "The archive has opened. Hold still while the statement takes you.";
    }
    window.__archiveBoot?.step("Runtime ready. Igniting fear ring.", 92, "Igniting sigils");
    const sigils = Array.from(boot.querySelectorAll(".boot-fear-sigil"));
    sigils.forEach((sigil, index) => {
      window.setTimeout(() => {
        sigil.classList.add("active");
        const progress = 92 + ((index + 1) / sigils.length) * 4;
        setProgress(progress, `Sigil ${index + 1} of ${sigils.length}`);
        if (index === 0 || index === 4 || index === 9 || index === sigils.length - 1) {
          appendLog(`${sigil.dataset.name} sigil answered.`);
        }
      }, index * 90);
    });

    const eyeDelay = sigils.length * 90 + 180;
    const swallowDelay = eyeDelay + 760;
    const finishDelay = swallowDelay + 820;

    window.setTimeout(() => {
      boot.classList.add("eye-rising");
      window.__archiveBoot?.step("The eye opens at the center of the ring.", 98, "Eye opening");
    }, eyeDelay);

    window.setTimeout(() => {
      boot.classList.add("swallowing");
      window.__archiveBoot?.step("The pupil widens. Entering archive.", 100, "Entering archive");
    }, swallowDelay);

    window.setTimeout(finishBoot, finishDelay);
  };

  const showStall = () => {
    if (window.__archiveBootReady || window.__archiveBootError || root.children.length) {
      startReadySequence();
      return;
    }

    if (copy) {
      copy.textContent = "Startup is taking longer than expected. Reload if this does not clear in a moment.";
    }
    window.__archiveBoot?.step("Still waiting on first render.", 50, "Waiting on runtime");
  };

  const observer = new MutationObserver(() => {
    if (root.children.length) {
      window.__archiveBoot?.step("Mount root received UI.", 92, "UI mounted");
      startReadySequence();
      observer.disconnect();
    }
  });

  window.addEventListener("error", (event) => {
    const message = event?.error?.message || event.message || "Unknown startup error";
    window.__archiveBoot?.error(`Error: ${message}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason?.message || String(event.reason || "Unknown rejection");
    window.__archiveBoot?.error(`Unhandled rejection: ${reason}`);
  });

  observer.observe(root, { childList: true });
  window.addEventListener("archive-app-ready", startReadySequence, { once: true });
  buildFearRing();
  window.__archiveBoot.step("Boot shell ready.", 8, "Preparing shell");
  window.__archiveBoot.step("Watching mount root.", 14, "Watching mount root");
  heartbeatId = window.setInterval(() => {
    if (boot.dataset.cleared === "true" || window.__archiveBootError) {
      return;
    }
    const now = performance.now();
    if (now - lastHeartbeatAt < 2200) {
      return;
    }
    lastHeartbeatAt = now;
    const seconds = ((now - currentStageStartedAt) / 1000).toFixed(1);
    appendLog(`Still in "${currentStageLabel}" after ${seconds}s.`);
  }, 1100);
  window.setTimeout(showStall, 3200);
  window.setTimeout(() => {
    if (root.children.length) {
      startReadySequence();
    }
  }, 4200);
})();
