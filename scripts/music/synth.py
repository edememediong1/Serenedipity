"""
Tiny offline music synthesizer for Serenedipity's demo tracks.

Everything here is generated from scratch (sine/FM synthesis and shaped noise), so the
resulting audio has no third-party rights attached. Run: python3 scripts/music/render.py
"""
import numpy as np

SR = 44100
RNG = np.random.default_rng(7)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


NOTE = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
QUALITY = {
    "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10], "7": [0, 4, 7, 10], "maj9": [0, 4, 7, 11, 14],
    "m9": [0, 3, 7, 10, 14], "9": [0, 4, 7, 10, 14], "": [0, 4, 7], "m": [0, 3, 7], "sus2": [0, 2, 7],
    "add9": [0, 4, 7, 14], "m11": [0, 3, 7, 10, 17], "6": [0, 4, 7, 9],
}


def chord(name, octave=4):
    """'Fmaj7' -> list of midi notes rooted in the given octave."""
    root = name[:2] if len(name) > 1 and name[1] == "b" else name[:1]
    q = name[len(root):]
    base = 12 * (octave + 1) + NOTE[root]
    return [base + i for i in QUALITY[q]]


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, hold=None):
    """Sample-wise ADSR envelope of length n (seconds for a/d/r)."""
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    hold_n = max(0, n - a_n - d_n - r_n) if hold is None else int(hold * SR)
    e = np.concatenate([
        np.linspace(0, 1, max(a_n, 1), endpoint=False),
        np.linspace(1, s, max(d_n, 1), endpoint=False),
        np.full(hold_n, s),
        np.linspace(s, 0, max(r_n, 1)),
    ])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


# ---------------------------------------------------------------- instruments

def epiano(note, dur, vel=0.6):
    """Rhodes-ish FM electric piano."""
    f = midi(note)
    t = t_axis(dur + 1.2)
    idx = 1.8 * np.exp(-t * 6) + 0.25
    mod = np.sin(2 * np.pi * f * t) * idx
    tone = np.sin(2 * np.pi * f * t + mod) + 0.15 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
    amp = np.exp(-t * 1.4) * (1 - np.exp(-t * 400))
    rel = np.clip((dur + 1.2 - t) / 0.4, 0, 1)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 4.5 * t)
    return tone * amp * rel * trem * vel * 0.35


def piano(note, dur, vel=0.6):
    """Additive piano: slightly inharmonic partials, brighter when struck harder."""
    f = midi(note)
    t = t_axis(dur + 2.5)
    out = np.zeros_like(t)
    B = 0.0004
    for k in range(1, 10):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        a = (0.9 ** k) * (vel ** (k * 0.25)) / k ** 0.6
        decay = 1.2 + k * 0.55 + f / 600
        out += a * np.sin(2 * np.pi * fk * t + RNG.random() * 6.28) * np.exp(-t * decay)
    out *= 1 - np.exp(-t * 900)
    rel = np.clip((dur + 2.5 - t) / 0.6, 0, 1) * np.where(t < dur, 1, np.exp(-(t - dur) * 3))
    return out * rel * vel * 0.28


def bell(note, dur, vel=0.5):
    f = midi(note)
    t = t_axis(dur + 3)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 2)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 1.1) * (1 - np.exp(-t * 300)) * vel * 0.18


def pad(notes, dur, vel=0.5, attack=2.0, release=2.5, bright=0.35):
    """Warm pad: detuned additive voices with slow swell."""
    t = t_axis(dur + release)
    out = np.zeros_like(t)
    for n in notes:
        f = midi(n)
        for det in (-0.12, 0.0, 0.13):
            fd = f * 2 ** (det / 12)
            ph = RNG.random() * 6.28
            for k in range(1, 6):
                out += (bright ** (k - 1)) / k * np.sin(2 * np.pi * fd * k * t + ph * k)
    e = env_adsr(len(t), a=attack, d=0.5, s=0.85, r=release)
    lfo = 1 + 0.08 * np.sin(2 * np.pi * 0.15 * t + RNG.random() * 6)
    return out * e * lfo * vel * 0.05 / max(1, len(notes) ** 0.5)


def bass(note, dur, vel=0.7, pluck=True):
    f = midi(note)
    t = t_axis(dur + 0.15)
    tone = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    amp = np.exp(-t * (2.5 if pluck else 0.4)) * (1 - np.exp(-t * 300))
    rel = np.clip((dur + 0.15 - t) / 0.12, 0, 1)
    return np.tanh(tone * 1.2) * amp * rel * vel * 0.45


def kick(vel=0.8):
    t = t_axis(0.5)
    f = 45 + 80 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * vel * 0.9


def noise(n):
    return RNG.standard_normal(n)


def fft_filter(x, lo=None, hi=None, tilt=0.0):
    """Zero-phase band filter in the frequency domain; tilt < 0 darkens (dB/octave above 1 kHz)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if tilt:
        g *= (np.maximum(f, 1000) / 1000) ** (tilt / 6)
    return np.fft.irfft(X * g, len(x))


def snare(vel=0.6, brush=False):
    t = t_axis(0.35)
    n = fft_filter(noise(len(t)), lo=1200 if brush else 1800, hi=7000 if brush else 9000)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30)
    dec = 9 if brush else 18
    env = (1 - np.exp(-t * (60 if brush else 2000))) * np.exp(-t * dec)
    return (n * 0.6 + body * (0 if brush else 0.6)) * env * vel * 0.45


def hat(vel=0.4, open_=False):
    t = t_axis(0.25 if open_ else 0.08)
    n = fft_filter(noise(len(t)), lo=7000)
    return n * np.exp(-t * (14 if open_ else 60)) * vel * 0.25


def shaker(vel=0.3):
    t = t_axis(0.09)
    n = fft_filter(noise(len(t)), lo=5000, hi=12000)
    return n * np.sin(np.pi * np.clip(t / 0.09, 0, 1)) ** 2 * vel * 0.3


def rim(vel=0.4):
    t = t_axis(0.08)
    return (np.sin(2 * np.pi * 1700 * t) * 0.6 + fft_filter(noise(len(t)), lo=2000) * 0.3) * np.exp(-t * 70) * vel * 0.35


def log_drum(note, vel=0.6):
    """Pitched, slightly saturated tom (Afro-house / amapiano style)."""
    t = t_axis(0.6)
    f = midi(note) * (1 + 0.5 * np.exp(-t * 25))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(2.2 * np.sin(ph)) * np.exp(-t * 6) * vel * 0.35


def rain(dur, heavy=0.5):
    """Rain bed: shaped noise plus random droplets."""
    n = int(dur * SR)
    bed = fft_filter(noise(n), lo=300, hi=6000 + heavy * 4000, tilt=-3) * (0.1 + heavy * 0.12)
    swell = 1 + 0.25 * np.sin(2 * np.pi * t_axis(dur) / 17) + 0.15 * np.sin(2 * np.pi * t_axis(dur) / 7.3)
    bed *= swell
    drops = np.zeros(n)
    count = int(dur * (6 + heavy * 30))
    dt = t_axis(0.03)
    drop = np.sin(2 * np.pi * 2500 * dt) * np.exp(-dt * 200)
    for pos in RNG.integers(0, n - len(dt), count):
        drops[pos:pos + len(dt)] += drop * RNG.uniform(0.02, 0.09) * RNG.choice([1, -1])
    return bed + fft_filter(drops, lo=800, hi=8000)


def crackle(dur, amount=0.5):
    n = int(dur * SR)
    out = np.zeros(n)
    idx = RNG.integers(0, n, int(dur * 25 * amount))
    out[idx] = RNG.uniform(-1, 1, len(idx)) * 0.35
    hiss = fft_filter(noise(n), lo=2000, hi=9000) * 0.006 * amount
    return fft_filter(out, lo=1500, hi=9000) + hiss


def waves(dur):
    n = int(dur * SR)
    t = t_axis(dur)
    base = fft_filter(noise(n), lo=100, hi=1800, tilt=-6)
    env = (0.5 + 0.5 * np.sin(2 * np.pi * t / 9.5 - 1.5)) ** 2.5
    return base * env * 0.25


# ---------------------------------------------------------------- mixing

class Mix:
    def __init__(self, dur):
        self.dur = dur
        self.n = int(dur * SR)
        self.dry = np.zeros((2, self.n))
        self.wet = np.zeros((2, self.n))

    def add(self, sig, at, pan=0.0, gain=1.0, send=0.25):
        start = max(0, int(at * SR))
        if start >= self.n:
            return
        sig = sig[: self.n - start] * gain
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        seg = slice(start, start + len(sig))
        self.dry[0, seg] += sig * l
        self.dry[1, seg] += sig * r
        if send:
            self.wet[0, seg] += sig * l * send
            self.wet[1, seg] += sig * r * send

    def add_stereo(self, left, right, gain=1.0, send=0.0):
        n = min(self.n, len(left))
        self.dry[0, :n] += left[:n] * gain
        self.dry[1, :n] += right[:n] * gain
        if send:
            self.wet[0, :n] += left[:n] * gain * send
            self.wet[1, :n] += right[:n] * gain * send

    def render(self, room=2.8, wet=0.35, warmth=-1.5):
        # Reverb: convolve with decaying, slightly darkened stereo noise (FFT convolution).
        ir_n = int(room * SR)
        t = t_axis(room)
        out = self.dry.copy()
        for ch in range(2):
            ir = fft_filter(noise(ir_n), hi=6000, tilt=-2) * np.exp(-t * 6.9 / room)
            ir[: int(0.012 * SR)] = 0  # pre-delay
            ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
            L = self.n + ir_n
            size = 1 << (L - 1).bit_length()
            y = np.fft.irfft(np.fft.rfft(self.wet[ch], size) * np.fft.rfft(ir, size), size)[: self.n]
            out[ch] += y * wet
        out = np.stack([fft_filter(out[0], lo=30, tilt=warmth), fft_filter(out[1], lo=30, tilt=warmth)])
        # Gentle bus compression via soft clipping, then loudness to a calm level.
        rms = np.sqrt(np.mean(out ** 2)) + 1e-9
        out *= 0.12 / rms
        out = np.tanh(out * 1.4) / 1.4
        out /= max(1.0, np.max(np.abs(out)) / 0.92)
        fade = int(1.5 * SR)
        ramp = np.linspace(0, 1, fade)
        out[:, :fade] *= ramp
        out[:, -fade:] *= ramp[::-1]
        return out
