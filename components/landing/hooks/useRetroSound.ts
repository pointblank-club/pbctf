"use client";

/**
 * useRetroSound — UI interaction sound design for the PBCTF landing page.
 *
 * Audio is synthesised on the fly with Tone.js (no audio files to ship). Every
 * sound is generated from short square/triangle blips so it matches the retro /
 * synthwave / Game Boy aesthetic of the site.
 *
 * A single shared engine backs every component (synth nodes are expensive, so
 * we never want one set per mounted component). The browser blocks audio until
 * the first user gesture, so the AudioContext + synths are created lazily on the
 * first sound call — which is always triggered by a click/hover gesture.
 *
 * Mute state is persisted to localStorage so the user's choice sticks across
 * navigations and reloads.
 */

import { useCallback, useEffect, useState } from "react";
import * as Tone from "tone";

type Note = string | number;

const MUTE_KEY = "pbctf_sound_muted";

class RetroSoundEngine {
  private started = false;
  private booting = false;
  private muted = false;

  // Monotonic scheduling cursor — Tone throws if two events on a mono synth
  // share a start time, so we always schedule strictly into the (near) future.
  private cursor = 0;
  private lastHover = 0;

  // Synth nodes (created lazily once audio is unlocked).
  private master?: Tone.Volume;
  private blip?: Tone.Synth; // clicks / selects
  private tick?: Tone.Synth; // hover ticks
  private chord?: Tone.PolySynth; // success chords / boot
  private noise?: Tone.NoiseSynth; // power / whoosh texture

  // Subscribers for mute-state changes (so toggle buttons re-render).
  private listeners = new Set<(muted: boolean) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      this.muted = window.localStorage.getItem(MUTE_KEY) === "true";
    }
  }

  /* ---------------- mute handling ---------------- */

  isMuted() {
    return this.muted;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MUTE_KEY, String(muted));
    }
    if (this.master) {
      this.master.mute = muted;
    }
    this.listeners.forEach((fn) => fn(muted));
  }

  toggleMute() {
    this.setMuted(!this.muted);
    // Play a tiny confirmation blip when un-muting so the user hears it worked.
    if (!this.muted) {
      this.ensureStarted().then(() => this.tone(this.blip, "C5", "32n", 0.12));
    }
    return this.muted;
  }

  subscribe(fn: (muted: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /* ---------------- engine lifecycle ---------------- */

  private async ensureStarted() {
    if (this.started) return;
    if (this.booting) return;
    this.booting = true;
    try {
      await Tone.start();
      this.build();
      this.started = true;
    } catch {
      // Audio unlock can fail outside a gesture; stay silent rather than throw.
    } finally {
      this.booting = false;
    }
  }

  private build() {
    if (this.master) return;

    this.master = new Tone.Volume(-6).toDestination();
    this.master.mute = this.muted;

    this.blip = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      volume: -10,
    }).connect(this.master);

    this.tick = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 },
      volume: -20,
    }).connect(this.master);

    this.chord = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.005, decay: 0.18, sustain: 0.15, release: 0.25 },
      volume: -16,
    }).connect(this.master);

    this.noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.05 },
      volume: -26,
    }).connect(this.master);
  }

  /** Strictly-increasing schedule time so mono synths never collide. */
  private when(offset = 0) {
    const now = Tone.now() + offset;
    this.cursor = Math.max(now, this.cursor + 0.005);
    return this.cursor;
  }

  /** Fire a single note on a synth, guarding against the not-yet-built case. */
  private tone(
    synth: Tone.Synth | undefined,
    note: Note,
    dur: Tone.Unit.Time,
    velocity = 0.7
  ) {
    if (!synth) return;
    try {
      synth.triggerAttackRelease(note, dur, this.when(), velocity);
    } catch {
      /* ignore scheduling races */
    }
  }

  /** Play a short ascending/descending sequence on the mono blip synth. */
  private sequence(notes: Note[], step = 0.07, dur: Tone.Unit.Time = "16n", velocity = 0.6) {
    if (!this.blip) return;
    const base = this.when();
    notes.forEach((n, i) => {
      try {
        this.blip!.triggerAttackRelease(n, dur, base + i * step, velocity);
      } catch {
        /* ignore */
      }
    });
    this.cursor = base + notes.length * step;
  }

  /* ---------------- public sound vocabulary ---------------- */

  hover() {
    // Throttle so a fast pointer sweep doesn't machine-gun the speakers.
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    if (now - this.lastHover < 45) return;
    this.lastHover = now;
    this.ensureStarted().then(() => this.tone(this.tick, "C6", "64n", 0.5));
  }

  click() {
    this.ensureStarted().then(() => this.tone(this.blip, "A4", "32n", 0.7));
  }

  /** Selecting an item / tab / nav directory — a crisp two-step blip up. */
  select() {
    this.ensureStarted().then(() => this.sequence(["E5", "B5"], 0.05, "32n", 0.6));
  }

  /** Navigation jump (anchor links). */
  nav() {
    this.ensureStarted().then(() => this.sequence(["G5", "D6"], 0.045, "32n", 0.55));
  }

  windowOpen() {
    this.ensureStarted().then(() => {
      this.sequence(["C5", "E5", "G5"], 0.05, "32n", 0.55);
      if (this.noise) {
        try {
          this.noise.triggerAttackRelease("16n", this.when());
        } catch {
          /* ignore */
        }
      }
    });
  }

  windowClose() {
    this.ensureStarted().then(() => this.sequence(["G5", "E5", "C5"], 0.045, "32n", 0.5));
  }

  /** Power switch / device on. */
  powerOn() {
    this.ensureStarted().then(() => this.sequence(["C4", "G4", "C5", "E5"], 0.06, "16n", 0.6));
  }

  powerOff() {
    this.ensureStarted().then(() => this.sequence(["E5", "C5", "G4", "C4"], 0.055, "16n", 0.5));
  }

  /** Boot blip while the loader fills. */
  boot() {
    this.ensureStarted().then(() => this.tone(this.blip, "C5", "32n", 0.45));
  }

  /** Loader "ACCESS GRANTED" — a triumphant little chord stab + arpeggio. */
  accessGranted() {
    this.ensureStarted().then(() => {
      this.sequence(["C5", "E5", "G5", "C6"], 0.06, "16n", 0.6);
      if (this.chord) {
        try {
          this.chord.triggerAttackRelease(["C4", "G4", "C5"], "4n", this.when() + 0.05, 0.5);
        } catch {
          /* ignore */
        }
      }
    });
  }

  /* ---- Flappy Bird game sounds ---- */

  gameJump() {
    this.ensureStarted().then(() => this.tone(this.blip, "E5", "32n", 0.5));
  }

  gameScore() {
    // Coin-style two-note pickup.
    this.ensureStarted().then(() => this.sequence(["B5", "E6"], 0.06, "16n", 0.6));
  }

  gameOver() {
    this.ensureStarted().then(() => this.sequence(["G4", "E4", "C4", "G3"], 0.1, "8n", 0.6));
  }
}

// Module-level singleton shared by every component on the page.
let engine: RetroSoundEngine | null = null;
function getEngine() {
  if (!engine) engine = new RetroSoundEngine();
  return engine;
}

export interface RetroSound {
  playHover: () => void;
  playClick: () => void;
  playSelect: () => void;
  playNav: () => void;
  playWindowOpen: () => void;
  playWindowClose: () => void;
  playPowerOn: () => void;
  playPowerOff: () => void;
  playBoot: () => void;
  playAccessGranted: () => void;
  playGameJump: () => void;
  playGameScore: () => void;
  playGameOver: () => void;
  toggleMute: () => void;
  muted: boolean;
}

export function useRetroSound(): RetroSound {
  const eng = getEngine();
  const [muted, setMuted] = useState<boolean>(() => eng.isMuted());

  useEffect(() => eng.subscribe(setMuted), [eng]);

  return {
    playHover: useCallback(() => eng.hover(), [eng]),
    playClick: useCallback(() => eng.click(), [eng]),
    playSelect: useCallback(() => eng.select(), [eng]),
    playNav: useCallback(() => eng.nav(), [eng]),
    playWindowOpen: useCallback(() => eng.windowOpen(), [eng]),
    playWindowClose: useCallback(() => eng.windowClose(), [eng]),
    playPowerOn: useCallback(() => eng.powerOn(), [eng]),
    playPowerOff: useCallback(() => eng.powerOff(), [eng]),
    playBoot: useCallback(() => eng.boot(), [eng]),
    playAccessGranted: useCallback(() => eng.accessGranted(), [eng]),
    playGameJump: useCallback(() => eng.gameJump(), [eng]),
    playGameScore: useCallback(() => eng.gameScore(), [eng]),
    playGameOver: useCallback(() => eng.gameOver(), [eng]),
    toggleMute: useCallback(() => eng.toggleMute(), [eng]),
    muted,
  };
}
