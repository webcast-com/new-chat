/**
 * Web Audio API sound engine for Snakes & Ladders.
 * All sounds are procedurally generated — no external audio files needed.
 */

let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

/** Shortcut: play an oscillator+gain pair for `duration` seconds. */
function tone(
  freq: number | number[],
  type: OscillatorType,
  vol: number,
  dur: number,
  ramp?: "up" | "down",
) {
  try {
    const c = ctx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(c.destination);
    const t = c.currentTime;

    if (Array.isArray(freq)) {
      freq.forEach((f, i) =>
        osc.frequency.setValueAtTime(f, t + i * (dur / freq.length)),
      );
    } else {
      osc.frequency.setValueAtTime(freq, t);
      if (ramp === "up")
        osc.frequency.linearRampToValueAtTime(freq * 1.6, t + dur);
      else if (ramp === "down")
        osc.frequency.linearRampToValueAtTime(freq * 0.4, t + dur);
    }

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  } catch (_) {
    /* audio unavailable */
  }
}

/** Noise burst for percussive sounds (dice clatter, tap, etc.) */
function noise(
  vol: number,
  dur: number,
  highpass = 600,
  lowpass = 10000,
  extra?: (gain: GainNode, t: number) => void,
) {
  try {
    const c = ctx();
    const t = c.currentTime;
    const bufferSize = Math.ceil(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const source = c.createBufferSource();
    source.buffer = buffer;

    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(highpass, t);

    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(lowpass, t);

    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    if (extra) extra(gain, t);

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(c.destination);
    source.start(t);
    source.stop(t + dur);
  } catch (_) {
    /* audio unavailable */
  }
}

// ─── Public API ──────────────────────────────────────────────

/** 3D dice tumbling: repeated short clatter bursts simulating a die rolling on wood. */
export function playDiceRoll() {
  try {
    const c = ctx();
    const t = c.currentTime;

    // 5-6 discrete clatters
    for (let i = 0; i < 6; i++) {
      const start = t + i * 0.21;
      const dur = 0.08 + Math.random() * 0.06;
      const bufferSize = Math.ceil(c.sampleRate * dur);
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) data[j] = (Math.random() * 2 - 1);

      const source = c.createBufferSource();
      source.buffer = buffer;
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(400, start);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(4000 + Math.random() * 4000, start);
      const gain = c.createGain();
      const vol = 0.12 + Math.random() * 0.04;
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      source.connect(hp);
      hp.connect(lp);
      lp.connect(gain);
      gain.connect(c.destination);
      source.start(start);
      source.stop(start + dur);
    }

    // Ending "thud" — a low tone hit
    {
      const osc = c.createOscillator();
      osc.type = "sine";
      const gain = c.createGain();
      osc.frequency.setValueAtTime(120, t + 1.2);
      osc.frequency.linearRampToValueAtTime(55, t + 1.45);
      gain.gain.setValueAtTime(0.22, t + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t + 1.2);
      osc.stop(t + 1.5);
    }
  } catch (_) {}
}

/** Token landing with a soft tap */
export function playTokenStep() {
  noise(0.07, 0.06, 200, 3000);
}

/** Ladder climb: ascending wooden tapping */
export function playLadderClimb() {
  try {
    const c = ctx();
    const t = c.currentTime;
    for (let i = 0; i < 6; i++) {
      const start = t + i * 0.12;
      const freq = 300 + i * 120;
      const osc = c.createOscillator();
      osc.type = "triangle";
      const gain = c.createGain();
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.09, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    }
  } catch (_) {}
}

/** Snake slide: descending slide with slight hiss-like noise */
export function playSnakeSlide() {
  try {
    const c = ctx();
    const t = c.currentTime;
    const dur = 0.55;
    // Descending tone
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    const gain = c.createGain();
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(80, t + dur);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.09, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur);

    // Hiss
    const bufferSize = Math.ceil(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const source = c.createBufferSource();
    source.buffer = buffer;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(2000, t);
    bp.Q.setValueAtTime(0.5, t);
    const hissGain = c.createGain();
    hissGain.gain.setValueAtTime(0.04, t);
    hissGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    source.connect(bp);
    bp.connect(hissGain);
    hissGain.connect(c.destination);
    source.start(t);
    source.stop(t + dur);
  } catch (_) {}
}

/** Victory fanfare: triumphant arpeggio */
export function playVictory() {
  try {
    const c = ctx();
    const t = c.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const start = t + i * 0.16;
      const osc = c.createOscillator();
      osc.type = "triangle";
      const gain = c.createGain();
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.setValueAtTime(0.18, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
    // Final chord
    {
      const osc = c.createOscillator();
      osc.type = "triangle";
      const gain = c.createGain();
      osc.frequency.setValueAtTime(1047, t + 0.64);
      gain.gain.setValueAtTime(0.2, t + 0.64);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t + 0.64);
      osc.stop(t + 1.15);
    }
  } catch (_) {}
}

/** Notification sounds for online lobby events */
export function playNotificationSound(
  type: "request" | "joined" | "left" | "info",
) {
  if (type === "request") {
    tone([660, 880], "sine", 0.2, 0.45);
  } else if (type === "joined") {
    const c = ctx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "sine";
    const gain = c.createGain();
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.linearRampToValueAtTime(1040, t + 0.3);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  } else if (type === "left") {
    tone(600, "sine", 0.15, 0.25, "down");
  } else {
    tone(440, "sine", 0.08, 0.15);
  }
}

/** Unique sound per emote reaction */
export function playEmoteSound(emote: string) {
  switch (emote) {
    case "🎉":
      // Quick ascending whistle + pop
      tone([500, 700, 900], "triangle", 0.12, 0.4);
      break;
    case "🐍":
      // Short hiss
      noise(0.05, 0.35, 800, 6000);
      break;
    case "🪜":
      // Ascending twang (like stepping up)
      tone(300, "square", 0.04, 0.25, "up");
      break;
    case "😱":
      // Dramatic descending slide
      tone(800, "sawtooth", 0.06, 0.4, "down");
      break;
    case "🔥":
      // Crunchy noise burst
      noise(0.1, 0.22, 100, 4000);
      break;
    case "😂":
      // Two-note laugh
      tone([400, 500, 400, 500], "square", 0.06, 0.35);
      break;
    case "🚀":
      // Rising whoosh
      noise(0.07, 0.45, 100, 800, (g, t) => {
        g.gain.setValueAtTime(0.07, t);
        g.gain.setValueAtTime(0.12, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      });
      break;
    case "🤔":
      // Ponderous low hum
      tone(180, "sine", 0.06, 0.4);
      break;
    default:
      tone(440, "sine", 0.05, 0.12);
  }
}

/** Generic UI click */
export function playClick() {
  tone(660, "sine", 0.05, 0.08);
}
