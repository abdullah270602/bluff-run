// Table sounds, synthesized in Web Audio. No assets. Off by default, toggled from the help drawer (M).
const KEY = "bluff-run:sound";
let ctx: AudioContext | null = null;

export type SoundName = "deal" | "chip" | "vote" | "win";

export function isEnabled(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* storage unavailable */ }
}

function tone(ac: AudioContext, type: OscillatorType, freq: number, at: number, dur: number, peak: number) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ac.destination);
  o.start(at); o.stop(at + dur + 0.02);
}

function noise(ac: AudioContext, at: number, dur: number, peak: number, f0: number, f1: number) {
  const n = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = buf;
  bp.type = "bandpass"; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(f0, at); bp.frequency.exponentialRampToValueAtTime(f1, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(at); src.stop(at + dur + 0.02);
}

export function play(name: SoundName) {
  if (!isEnabled()) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    const ac = ctx, t = ac.currentTime;
    switch (name) {
      case "deal": noise(ac, t, 0.12, 0.12, 2400, 600); break;
      case "chip": tone(ac, "triangle", 2093, t, 0.1, 0.1); tone(ac, "sine", 2140, t, 0.08, 0.06); break;
      case "vote": tone(ac, "square", 1800, t, 0.018, 0.04); break;
      case "win": tone(ac, "sine", 523.25, t, 0.09, 0.12); tone(ac, "sine", 783.99, t + 0.09, 0.1, 0.12); break;
    }
  } catch { /* no audio on this browser */ }
}
