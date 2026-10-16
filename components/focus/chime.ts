/** A gentle two-note chime made with Web Audio (no audio files). Safe to call anywhere; fails silently. */
let ctx: AudioContext | null = null;

export function playChime(volume = 0.18) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.22;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 1.5);
    });
  } catch {
    // Audio unavailable (e.g. autoplay policy before any user gesture). The visual change still shows.
  }
}

/** Call from a click handler so later chimes are allowed by autoplay policies. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // ignore
  }
}
