import { SPIDER_FRAME_URLS } from "./assets.js";
import { webStabilityState } from "./web-runtime.js";

export const SPIDER_HOVER_PAUSE_MS = 220;
export const SPIDER_TWITCH_MS = 320;
export const SPIDER_HINT_CHANCE = 0.36;
export const SPIDER_HINT_ORBIT_MS = 480;
export const SPIDER_HINT_RECOIL_MS = 260;
export const SPIDER_HINT_LINGER_MS = 220;

export function createWebAmbientState() {
  return {
    rafId: null,
    canvas: null,
    spider: null,
    sprite: null,
    trail: null,
    x: 50,
    y: 38,
    targetX: 50,
    targetY: 38,
    idleX: 50,
    idleY: 38,
    history: [],
    lastMoveAt: 0,
    hoverLockUntil: 0,
    twitchUntil: 0,
    frameIndex: 0,
    frameElapsed: 0,
    lastTimestamp: 0,
    frameSet: "idle",
    currentSpriteSrc: "",
    trailElapsed: 0,
    hintMode: null,
    hintUntil: 0,
    orbitCenterX: 50,
    orbitCenterY: 38,
  };
}

export function syncWebAmbient({
  root,
  webAmbient,
  currentScreen,
  activeFear,
  caseRuntime,
  prefersReducedMotion,
  clamp,
  maybeTriggerSpiderHint,
}) {
  const ambient = webAmbient;
  const isWebScreen = currentScreen === "minigame" && activeFear === "web";

  if (!isWebScreen) {
    if (ambient.rafId) {
      window.cancelAnimationFrame(ambient.rafId);
      ambient.rafId = null;
    }
    ambient.canvas = null;
    ambient.spider = null;
    ambient.sprite = null;
    ambient.trail = null;
    return;
  }

  const canvas = root.querySelector("[data-web-canvas]");
  const spider = root.querySelector("[data-web-spider]");
  const sprite = root.querySelector("[data-web-spider-sprite]");
  const trail = root.querySelector("[data-web-trail]");
  if (!canvas || !spider || !sprite || !trail) {
    return;
  }

  const replacedNodes = ambient.canvas !== canvas || ambient.spider !== spider || ambient.sprite !== sprite || ambient.trail !== trail;
  ambient.canvas = canvas;
  ambient.spider = spider;
  ambient.sprite = sprite;
  ambient.trail = trail;
  if (replacedNodes) {
    ambient.history = [];
    ambient.frameIndex = 0;
    ambient.frameElapsed = 0;
    ambient.lastTimestamp = 0;
    ambient.frameSet = "idle";
    ambient.currentSpriteSrc = "";
    ambient.trailElapsed = 0;
  }
  ambient.lastMoveAt = performance.now();

  const updateTargetFromEvent = (event) => {
    const rect = canvas.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 82;
    ambient.targetX = clamp(rawX, 6, 94);
    ambient.targetY = clamp(rawY, 6, 76);
    ambient.hintMode = null;
    ambient.idleX = ambient.targetX;
    ambient.idleY = ambient.targetY;
    ambient.lastMoveAt = performance.now();
  };

  canvas.onpointermove = updateTargetFromEvent;
  canvas.onpointerenter = updateTargetFromEvent;

  root.querySelectorAll("[data-web-fragment]").forEach((node) => {
    node.onpointerenter = () => {
      const nextX = Number.parseFloat(node.style.getPropertyValue("--node-x"));
      const nextY = Number.parseFloat(node.style.getPropertyValue("--node-y"));
      if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
        ambient.targetX = nextX;
        ambient.targetY = nextY;
        ambient.idleX = nextX;
        ambient.idleY = nextY;
        ambient.hoverLockUntil = performance.now() + SPIDER_HOVER_PAUSE_MS;
        ambient.lastMoveAt = performance.now();
        if (caseRuntime) {
          const fragmentIndex = Number(node.dataset.webFragment);
          const fragmentId = caseRuntime.data.fragments[fragmentIndex]?.id;
          if (fragmentId) {
            maybeTriggerSpiderHint(fragmentId, nextX, nextY);
          }
        }
      }
    };
    node.onpointermove = updateTargetFromEvent;
  });

  const drawTrail = (timestamp) => {
    if (prefersReducedMotion) {
      trail.setAttribute("d", "");
      return;
    }

    if (ambient.history.length < 2) {
      trail.setAttribute("d", "");
      return;
    }

    const points = ambient.history.map((point, index, source) => ({
      x: point.x + Math.sin((timestamp / 145) + index * 0.8) * (index / source.length) * 0.38,
      y: point.y + Math.cos((timestamp / 190) + index * 0.7) * (index / source.length) * 0.28,
    }));
    const [first, ...rest] = points;
    let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
    for (let index = 0; index < rest.length; index += 1) {
      const current = rest[index];
      const previous = points[index];
      const midpointX = (previous.x + current.x) / 2;
      const midpointY = (previous.y + current.y) / 2;
      path += ` Q ${previous.x.toFixed(2)} ${previous.y.toFixed(2)} ${midpointX.toFixed(2)} ${midpointY.toFixed(2)}`;
    }
    const last = points[points.length - 1];
    path += ` T ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
    trail.setAttribute("d", path);
  };

  const animate = (timestamp) => {
    if (ambient.canvas !== canvas || ambient.spider !== spider || ambient.trail !== trail) {
      ambient.rafId = null;
      return;
    }

    const delta = ambient.lastTimestamp ? timestamp - ambient.lastTimestamp : 16;
    ambient.lastTimestamp = timestamp;
    ambient.trailElapsed += delta;

    const idleElapsed = timestamp - ambient.lastMoveAt;
    const stabilityState = webStabilityState(caseRuntime);
    if (ambient.hintMode === "orbit" && timestamp < ambient.hintUntil) {
      ambient.targetX = ambient.orbitCenterX + Math.cos(timestamp / 120) * 2.2;
      ambient.targetY = ambient.orbitCenterY + Math.sin(timestamp / 120) * 1.8;
    } else if (idleElapsed > 1200 && timestamp > ambient.hoverLockUntil) {
      ambient.hintMode = null;
      ambient.targetX = ambient.idleX + Math.sin(timestamp / 640) * 0.95;
      ambient.targetY = ambient.idleY + Math.cos(timestamp / 760) * 0.7;
    } else if (timestamp >= ambient.hintUntil && ambient.hintMode) {
      ambient.hintMode = null;
    }

    const pauseLocked = timestamp < ambient.hoverLockUntil;
    const distance = Math.hypot(ambient.targetX - ambient.x, ambient.targetY - ambient.y);
    const moving = distance > 0.65 && !pauseLocked;
    const stabilityDrag = stabilityState === "critical" ? 0.66 : stabilityState === "unstable" ? 0.82 : 1;
    const followSpeed = (pauseLocked ? 0.045 : idleElapsed > 1200 ? 0.03 : 0.09) * stabilityDrag;
    ambient.x += (ambient.targetX - ambient.x) * followSpeed;
    ambient.y += (ambient.targetY - ambient.y) * followSpeed;

    const jitterScale = prefersReducedMotion ? 0 : stabilityState === "critical" ? 1.2 : stabilityState === "unstable" ? 0.8 : 0.45;
    const jitterX = (Math.sin(timestamp / 140) * 0.05 + Math.cos(timestamp / 210) * 0.03) * jitterScale;
    const jitterY = (Math.cos(timestamp / 160) * 0.04 + Math.sin(timestamp / 240) * 0.03) * jitterScale;
    const renderedX = ambient.x + jitterX;
    const renderedY = ambient.y + jitterY;
    const heading = Math.atan2(ambient.targetY - ambient.y, ambient.targetX - ambient.x) * (180 / Math.PI);
    const lean = clamp((ambient.targetX - ambient.x) * 0.24, -10, 10);

    spider.style.left = `${renderedX}%`;
    spider.style.top = `${renderedY / 82 * 100}%`;
    spider.style.transform = `translate(-50%, -50%) rotate(${heading * 0.36 + lean + Math.sin(timestamp / 410) * 1.2}deg) scale(${pauseLocked ? 1.03 : 1 + Math.sin(timestamp / 360) * 0.015})`;
    spider.classList.toggle("moving", moving);
    spider.classList.toggle("twitch", timestamp < ambient.twitchUntil);

    const nextFrameSet = moving ? "walk" : "idle";
    const frameInterval = prefersReducedMotion ? 180 : moving ? 72 : 118;
    if (ambient.frameSet !== nextFrameSet) {
      ambient.frameSet = nextFrameSet;
      ambient.frameIndex = 0;
      ambient.frameElapsed = 0;
    } else {
      ambient.frameElapsed += delta;
      if (ambient.frameElapsed >= frameInterval) {
        ambient.frameIndex = (ambient.frameIndex + 1) % SPIDER_FRAME_URLS[nextFrameSet].length;
        ambient.frameElapsed = 0;
      }
    }
    const nextSpriteSrc = SPIDER_FRAME_URLS[nextFrameSet][ambient.frameIndex];
    if (ambient.currentSpriteSrc !== nextSpriteSrc) {
      ambient.currentSpriteSrc = nextSpriteSrc;
      sprite.src = nextSpriteSrc;
    }

    if (!prefersReducedMotion && ambient.trailElapsed >= 34) {
      ambient.trailElapsed = 0;
      ambient.history.push({
        x: renderedX,
        y: renderedY,
      });
      ambient.history = ambient.history.slice(-14);
      drawTrail(timestamp);
    }

    ambient.rafId = window.requestAnimationFrame(animate);
  };

  if (ambient.rafId) {
    window.cancelAnimationFrame(ambient.rafId);
  }
  ambient.rafId = window.requestAnimationFrame(animate);
}
