import { FEAR_CUE_URLS, MUSIC_URLS } from "./assets.js";

const BACKGROUND_TRACKS = {
  menu: {
    src: MUSIC_URLS.menu,
    volume: 0.42,
  },
  web_mundane: {
    src: MUSIC_URLS.webMundane,
    volume: 0.44,
  },
  web_distorted: {
    src: MUSIC_URLS.webDistorted,
    volume: 0.36,
  },
  web_domain: {
    src: MUSIC_URLS.webDistorted,
    volume: 0.4,
  },
  wheel: {
    src: MUSIC_URLS.wheel,
    volume: 0.5,
  },
};

export class MusicDirector {
  constructor() {
    this.enabled = true;
    this.unlocked = false;
    this.audioContext = null;
    this.master = null;
    this.musicTracks = {};
    this.activeMusicKey = null;
    this.wheelMusicActive = false;
    this.currentScene = { fear: "menu", phase: "mundane", eye: false };
    this.activeCue = null;
    this.wheelSpinInterval = null;
    this.wheelSpinTimeout = null;
    this.lastCriticalRumbleAt = 0;
    this.autoUnlockInstalled = false;
    this.boundInteractionUnlock = () => {
      if (!this.unlocked) {
        this.unlock();
      } else {
        this.resumeIfNeeded();
      }
    };
    this.boundVisibilityResume = () => {
      if (document.visibilityState === "visible") {
        this.resumeIfNeeded();
      }
    };
  }

  installAutoUnlock() {
    if (this.autoUnlockInstalled || typeof window === "undefined") {
      return;
    }

    this.autoUnlockInstalled = true;
    window.addEventListener("pointerdown", this.boundInteractionUnlock, { passive: true });
    window.addEventListener("touchstart", this.boundInteractionUnlock, { passive: true });
    window.addEventListener("keydown", this.boundInteractionUnlock);
    window.addEventListener("focus", this.boundInteractionUnlock);
    document.addEventListener("visibilitychange", this.boundVisibilityResume);
  }

  unlock() {
    if (!this.audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) {
        try {
          this.audioContext = new Context();
          this.master = this.audioContext.createGain();
          this.master.gain.value = 1;
          this.master.connect(this.audioContext.destination);
        } catch {
          this.audioContext = null;
          this.master = null;
        }
      }
    }

    if (this.audioContext?.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }

    const wasUnlocked = this.unlocked;
    this.unlocked = true;
    this.ensureMusicTracks();
    this.applyScene();

    if (!wasUnlocked && this.enabled) {
      window.setTimeout(() => {
        this.playUnlockCue();
      }, 40);
    }

    return true;
  }

  resumeIfNeeded() {
    if (this.audioContext?.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    this.applyScene();
  }

  setScene(fear = "menu", phase = "mundane", eye = false) {
    this.currentScene = { fear, phase, eye };
    this.applyScene();
  }

  ensureMusicTracks() {
    Object.entries(BACKGROUND_TRACKS).forEach(([key, { src, volume }]) => {
      if (this.musicTracks[key]) {
        return;
      }

      const track = new Audio(src);
      track.preload = "auto";
      track.loop = true;
      track.volume = volume;
      this.musicTracks[key] = track;
    });
  }

  sceneMusicKey() {
    if (this.wheelMusicActive) {
      return "wheel";
    }

    const { fear, phase } = this.currentScene;
    if (fear !== "web") {
      return "menu";
    }

    if (phase === "domain") {
      return "web_domain";
    }
    if (phase === "distorted") {
      return "web_distorted";
    }
    return "web_mundane";
  }

  stopBackgroundMusic(reset = false) {
    Object.values(this.musicTracks).forEach((track) => {
      track.pause();
      if (reset) {
        track.currentTime = 0;
      }
    });
    this.activeMusicKey = null;
  }

  syncBackgroundMusic(restart = false) {
    this.ensureMusicTracks();

    if (!this.enabled || !this.unlocked) {
      this.stopBackgroundMusic(false);
      return;
    }

    const nextKey = this.sceneMusicKey();
    const nextTrack = this.musicTracks[nextKey];
    if (!nextTrack) {
      return;
    }

    Object.entries(this.musicTracks).forEach(([key, track]) => {
      track.volume = BACKGROUND_TRACKS[key]?.volume ?? 0.4;
      if (key === nextKey) {
        return;
      }
      track.pause();
      track.currentTime = 0;
    });

    if (restart && this.activeMusicKey === nextKey) {
      nextTrack.currentTime = 0;
    }

    if (this.activeMusicKey !== nextKey || nextTrack.paused) {
      nextTrack.play().catch(() => {});
    }

    this.activeMusicKey = nextKey;
  }

  applyScene() {
    this.syncBackgroundMusic(false);
  }

  playUnlockCue() {
    this.playSanctumBell();
    this.playWebStringPluck();
  }

  playFearCue(fear) {
    if (!this.enabled || !this.unlocked) {
      return;
    }

    const cueUrl = FEAR_CUE_URLS[fear];
    if (!cueUrl) {
      return;
    }

    if (this.activeCue) {
      this.activeCue.pause();
      this.activeCue = null;
    }

    const cue = new Audio(cueUrl);
    cue.preload = "auto";
    cue.volume = fear === "web" ? 0.52 : 0.4;
    cue.play().catch(() => {});
    cue.addEventListener("ended", () => {
      if (this.activeCue === cue) {
        this.activeCue = null;
      }
    });
    this.activeCue = cue;
  }

  startWheelSpin() {
    if (!this.enabled || !this.unlocked) {
      return;
    }

    this.stopWheelSpin(false);
    this.wheelMusicActive = true;
    this.syncBackgroundMusic(true);
    this.playWheelTick(0.016);
    const spinStart = performance.now();
    const totalDuration = 1400;
    const scheduleTick = () => {
      const elapsed = performance.now() - spinStart;
      if (elapsed >= totalDuration) {
        this.wheelSpinTimeout = null;
        return;
      }

      const progress = elapsed / totalDuration;
      const interval = 132 - progress * 74;
      const level = 0.012 + progress * 0.014 + Math.random() * 0.004;
      this.playWheelTick(level);
      this.wheelSpinTimeout = window.setTimeout(scheduleTick, interval);
    };

    this.wheelSpinTimeout = window.setTimeout(scheduleTick, 110);
  }

  stopWheelSpin(reveal = true) {
    if (this.wheelSpinInterval) {
      window.clearInterval(this.wheelSpinInterval);
      this.wheelSpinInterval = null;
    }
    if (this.wheelSpinTimeout) {
      window.clearTimeout(this.wheelSpinTimeout);
      this.wheelSpinTimeout = null;
    }

    this.wheelMusicActive = false;
    this.syncBackgroundMusic(false);

    if (reveal) {
      this.playWheelReveal();
    }
  }

  playWheelTick(level = 0.016) {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = "square";
    osc.frequency.setValueAtTime(940 + Math.random() * 210, now);
    osc.frequency.exponentialRampToValueAtTime(280 + Math.random() * 40, now + 0.05);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(2.6, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playWheelReveal() {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    [220, 329.63, 493.88, 659.25].forEach((frequency, index) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = index % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(frequency, now + index * 0.02);

      gain.gain.setValueAtTime(0.0001, now + index * 0.02);
      gain.gain.linearRampToValueAtTime(0.018 + index * 0.004, now + index * 0.02 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8 + index * 0.08);

      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now + index * 0.02);
      osc.stop(now + 0.95 + index * 0.08);
    });
  }

  playSanctumBell() {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(392, now);
    osc.frequency.exponentialRampToValueAtTime(196, now + 2.4);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(840, now);
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(now);
    osc.stop(now + 2.9);
  }

  playSanctumBloom() {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    [261.63, 329.63, 392].forEach((frequency, index) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = index === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(frequency, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.014 + index * 0.004, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + index * 0.25);

      osc.connect(gain);
      gain.connect(this.master);

      osc.start(now);
      osc.stop(now + 2.1 + index * 0.25);
    });
  }

  playWebScuttle() {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    for (let step = 0; step < 4; step += 1) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(240 + Math.random() * 320, now + step * 0.03);

      gain.gain.setValueAtTime(0.0001, now + step * 0.03);
      gain.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.006, now + step * 0.03 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + step * 0.03 + 0.05);

      osc.connect(gain);
      gain.connect(this.master);

      osc.start(now + step * 0.03);
      osc.stop(now + step * 0.03 + 0.06);
    }
  }

  playThreadSnap() {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    const noise = this.audioContext.createOscillator();
    const snap = this.audioContext.createOscillator();
    const noiseGain = this.audioContext.createGain();
    const snapGain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    noise.type = "square";
    noise.frequency.setValueAtTime(180, now);
    noise.frequency.exponentialRampToValueAtTime(48, now + 0.08);
    snap.type = "triangle";
    snap.frequency.setValueAtTime(920, now);
    snap.frequency.exponentialRampToValueAtTime(210, now + 0.05);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(960, now);
    filter.Q.setValueAtTime(1.8, now);

    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.02, now + 0.008);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    snapGain.gain.setValueAtTime(0.0001, now);
    snapGain.gain.linearRampToValueAtTime(0.018, now + 0.004);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    noise.connect(noiseGain);
    snap.connect(filter);
    filter.connect(snapGain);
    noiseGain.connect(this.master);
    snapGain.connect(this.master);

    noise.start(now);
    snap.start(now);
    noise.stop(now + 0.16);
    snap.stop(now + 0.12);
  }

  playCriticalRumble() {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const nowMs = performance.now();
    if (nowMs - this.lastCriticalRumbleAt < 1200) {
      return;
    }
    this.lastCriticalRumbleAt = nowMs;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const sub = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const subGain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.65);
    sub.type = "sine";
    sub.frequency.setValueAtTime(31, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, now);
    filter.Q.setValueAtTime(0.7, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.024, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.035, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    sub.connect(subGain);
    subGain.connect(this.master);

    osc.start(now);
    sub.start(now);
    osc.stop(now + 1);
    sub.stop(now + 1.05);
  }

  playJumpscare(kind = "eye") {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    const shriek = this.audioContext.createOscillator();
    const rasp = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const raspGain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    shriek.type = kind === "spider" ? "square" : "sawtooth";
    shriek.frequency.setValueAtTime(kind === "collapse" ? 190 : 240, now);
    shriek.frequency.exponentialRampToValueAtTime(kind === "collapse" ? 42 : 86, now + 0.24);

    rasp.type = "triangle";
    rasp.frequency.setValueAtTime(kind === "eye" ? 520 : 380, now);
    rasp.frequency.exponentialRampToValueAtTime(112, now + 0.18);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(kind === "eye" ? 880 : 640, now);
    filter.Q.setValueAtTime(2.1, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(kind === "collapse" ? 0.048 : 0.036, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    raspGain.gain.setValueAtTime(0.0001, now);
    raspGain.gain.linearRampToValueAtTime(0.018, now + 0.006);
    raspGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    shriek.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    rasp.connect(raspGain);
    raspGain.connect(this.master);

    shriek.start(now);
    rasp.start(now);
    shriek.stop(now + 0.38);
    rasp.stop(now + 0.24);
  }

  playWebWetClick() {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.08);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(380, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.018, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playWebStringPluck() {
    if (!this.audioContext || !this.master || !this.unlocked || !this.enabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(420 + Math.random() * 220, now);
    osc.frequency.exponentialRampToValueAtTime(92 + Math.random() * 40, now + 0.18);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(950 + Math.random() * 500, now);
    filter.Q.value = 6;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.014, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopBackgroundMusic(false);
      this.stopWheelSpin(false);
    } else {
      this.applyScene();
    }
    return this.enabled;
  }

  enable() {
    if (!this.enabled) {
      this.enabled = true;
    }
    this.applyScene();
    return this.enabled;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      unlocked: this.unlocked,
    };
  }
}
