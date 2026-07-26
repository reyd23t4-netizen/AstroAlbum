// Sonidos sintetizados con Web Audio API — no requiere archivos de audio.

let ctx = null;
let ambient = null; // { nodes, gain }
let enabled = true;

function getCtx() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setSoundEnabled(value) {
  enabled = value;
  if (!value) stopAmbient();
}

export function isSoundEnabled() {
  return enabled;
}

export function playClick() {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(720, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(360, c.currentTime + 0.1);
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.14);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.15);
  } catch {
    /* ignore */
  }
}

export function playChime() {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  try {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t = c.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.55);
    });
  } catch {
    /* ignore */
  }
}

export function playDelete() {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(300, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.22);
    g.gain.setValueAtTime(0.06, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.23);
  } catch {
    /* ignore */
  }
}

export function toggleAmbient(on) {
  if (!on || !enabled) {
    stopAmbient();
    return;
  }
  const c = getCtx();
  if (!c || ambient) return;
  try {
    const master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    master.gain.linearRampToValueAtTime(0.035, c.currentTime + 1.5);

    const freqs = [55, 82.5, 110];
    const oscs = freqs.map((f, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      lfo.frequency.value = 0.05 + i * 0.03;
      lfoGain.gain.value = 1.2;
      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);
      lfo.start();
      o.connect(master);
      o.start();
      return { o, lfo };
    });

    ambient = { master, oscs };
  } catch {
    /* ignore */
  }
}

function stopAmbient() {
  if (!ambient || !ctx) return;
  const { master, oscs } = ambient;
  try {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    setTimeout(() => {
      oscs.forEach(({ o, lfo }) => {
        try {
          o.stop();
          lfo.stop();
        } catch {
          /* ignore */
        }
      });
    }, 450);
  } catch {
    /* ignore */
  }
  ambient = null;
}
