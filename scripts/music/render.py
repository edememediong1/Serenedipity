"""
Renders Serenedipity's demo tracks into public/audio/*.mp3 (needs numpy and ffmpeg).
All audio is synthesized here; no samples or third-party recordings are used.

    python3 scripts/music/render.py            # all tracks
    python3 scripts/music/render.py second-cup # one track
"""
import os
import subprocess
import sys
import tempfile
import wave
import zlib

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from synth import (  # noqa: E402
    RNG, SR, Mix, bass, bell, chord, crackle, epiano, hat, kick, log_drum, noise, pad, piano, rain, rim,
    shaker, snare, t_axis, waves, fft_filter, midi,
)

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "audio")
DUR = 150  # seconds; rooms loop tracks, so every piece is written to loop cleanly


def bars(bpm, beats=4):
    return 60 / bpm * beats


def humanize(t, amount=0.008):
    return t + RNG.uniform(-amount, amount)


# ---------------------------------------------------------------- tracks

def second_cup():
    """Lofi: dusty Rhodes 7ths over a lazy swung beat."""
    bpm, m = 78, Mix(DUR)
    beat = 60 / bpm
    prog = ["Fmaj7", "Em7", "Dm9", "Cmaj7"]
    roots = [41, 40, 38, 36]
    bar = beat * 4
    n_bars = int(DUR / bar)
    melody_scale = [72, 74, 76, 77, 79, 81, 84]
    for b in range(n_bars):
        t0 = b * bar
        c = prog[b % 4]
        notes = chord(c, 4)
        for i, n in enumerate(notes):  # slightly rolled chord
            m.add(epiano(n, bar * 0.9, 0.5), humanize(t0 + i * 0.012), pan=-0.2 + i * 0.12, send=0.3)
        m.add(bass(roots[b % 4], beat * 1.5, 0.7), t0, gain=1.0, send=0.05)
        m.add(bass(roots[b % 4] + 7, beat * 0.9, 0.5), t0 + beat * 2.5, send=0.05)
        drums = 2 <= b < n_bars - 1 and not (b % 16 in (14, 15))
        if drums:
            for k in (0, 2.5):
                m.add(kick(0.75), t0 + k * beat, send=0.02)
            for s in (1, 3):
                m.add(snare(0.55), humanize(t0 + s * beat + 0.02), pan=0.05, send=0.15)
            for h in range(8):
                swing = 0.11 * beat if h % 2 else 0
                m.add(hat(0.35 if h % 2 else 0.5), humanize(t0 + h * beat / 2 + swing), pan=0.3, send=0.05)
        if b % 8 >= 4 and b > 3:  # sparse melody in the B section
            for step in range(0, 8, 2):
                if RNG.random() < 0.55:
                    m.add(epiano(RNG.choice(melody_scale), beat * 0.8, 0.4), t0 + step * beat / 2, pan=0.25, send=0.45)
    l = crackle(DUR, 0.8)
    m.add_stereo(l, np.roll(l, 900), gain=0.6)
    return m.render(room=2.2, wet=0.28, warmth=-3)


def rainy_bookstore_jazz():
    """Brushed jazz trio feel: ii-V-I in Bb, walking bass, Rhodes comping, light rain."""
    bpm, m = 92, Mix(DUR)
    beat = 60 / bpm
    bar = beat * 4
    prog = ["Cm9", "F9", "Bbmaj9", "Gm7", "Ebmaj7", "Ab9", "Dm7", "G7"]
    roots = [36, 41, 46, 43, 39, 44, 38, 43]
    n_bars = int(DUR / bar)
    for b in range(n_bars):
        t0 = b * bar
        c = prog[b % len(prog)]
        r = roots[b % len(prog)]
        nxt = roots[(b + 1) % len(prog)]
        # Walking bass: root, chord tones, chromatic approach to the next root.
        walk = [r, r + 4 if "maj" in c or c.endswith("9") and "m" not in c else r + 3, r + 7, nxt - 1 if nxt > r else nxt + 1]
        for i, n in enumerate(walk):
            m.add(bass(n, beat * 0.95, 0.6, pluck=False), humanize(t0 + i * beat, 0.01), pan=-0.1, send=0.08)
        # Comping on the "and" of 2 and on 4, swung.
        for hit in (1.66, 3.0) if b % 2 else (0.0, 2.66):
            for i, n in enumerate(chord(c, 4)[1:]):
                m.add(epiano(n, beat * 0.7, 0.42), humanize(t0 + hit * beat + i * 0.008), pan=0.2, send=0.3)
        if 1 <= b < n_bars - 1:
            for s in range(4):  # brushes: swish on every beat, accent 2 and 4
                m.add(snare(0.35 if s % 2 else 0.22, brush=True), humanize(t0 + s * beat), pan=0.15, send=0.2)
            for s in range(4):  # ride-ish hat on swung eighths
                m.add(hat(0.25, open_=False), humanize(t0 + s * beat), pan=0.35, send=0.1)
                m.add(hat(0.18), humanize(t0 + s * beat + beat * 0.66), pan=0.35, send=0.1)
            m.add(kick(0.35), t0, send=0.0)
        if b % 8 in (4, 5, 6) and b > 2:  # a little piano melody
            scale = [70, 72, 74, 75, 77, 79, 81, 82]
            for step in range(4):
                if RNG.random() < 0.7:
                    m.add(piano(RNG.choice(scale), beat * 0.9, 0.45), humanize(t0 + step * beat + (0.66 * beat if step % 2 else 0)), pan=0.1, send=0.4)
    rl = rain(DUR, 0.25)
    m.add_stereo(rl, np.roll(rl, 2000), gain=0.35)
    return m.render(room=2.0, wet=0.25, warmth=-2)


def reading_room_rain():
    """Steady rain against the window, a warm pad and the odd piano note."""
    m = Mix(DUR)
    prog = [["Dmaj7", 3], ["Bm9", 3], ["Gmaj9", 3], ["Asus2", 3]]
    seg = 9.0
    t0 = 0
    i = 0
    while t0 < DUR:
        name = prog[i % 4][0]
        m.add(pad(chord(name, 3), seg + 1.5, 0.6, attack=3, release=3.5, bright=0.3), t0, send=0.5)
        if RNG.random() < 0.8:
            for k in range(2):
                note = RNG.choice(chord(name, 5))
                m.add(piano(note, 2.5, 0.35), t0 + 2 + k * RNG.uniform(2, 3.5), pan=RNG.uniform(-0.4, 0.4), send=0.6)
        t0 += seg
        i += 1
    rl, rr = rain(DUR, 0.65), rain(DUR, 0.65)
    m.add_stereo(rl, rr, gain=0.9)
    return m.render(room=3.5, wet=0.4, warmth=-2.5)


def lagos_glass():
    """Afro-lounge groove: shaker, log drum, soft four-on-the-floor, clave, Rhodes chords."""
    bpm, m = 112, Mix(DUR)
    beat = 60 / bpm
    bar = beat * 4
    prog = ["Am9", "Dm9", "Fmaj9", "E7"]
    roots = [45, 38, 41, 40]
    n_bars = int(DUR / bar)
    clave = [0, 0.75, 1.5, 2.5, 3.0]  # son clave 3-2 (in beats)
    for b in range(n_bars):
        t0 = b * bar
        c = prog[(b // 2) % 4]
        r = roots[(b // 2) % 4]
        full = 4 <= b < n_bars - 2
        for k in range(4):
            if b >= 2:
                m.add(kick(0.55), t0 + k * beat, send=0.02)
        for s in range(16):
            if b >= 1:
                m.add(shaker(0.35 if s % 2 else 0.22), humanize(t0 + s * beat / 4, 0.004), pan=0.4, send=0.05)
        for cl in clave:
            m.add(rim(0.4), t0 + cl * beat, pan=-0.35, send=0.15)
        if full:
            for pos, note in ((1.5, r - 12 + 24), (2.75, r + 7 - 12 + 24), (3.5, r + 12)):
                m.add(log_drum(note, 0.55), t0 + pos * beat, send=0.15)
            m.add(hat(0.3, open_=True), t0 + 1.5 * beat, pan=0.3, send=0.1)
            m.add(hat(0.3, open_=True), t0 + 3.5 * beat, pan=0.3, send=0.1)
        # Rhodes stabs, syncopated
        for hit in (0.5, 1.75, 3.25):
            for i, n in enumerate(chord(c, 4)):
                m.add(epiano(n, beat * 0.6, 0.38), humanize(t0 + hit * beat + i * 0.006), pan=0.15, send=0.3)
        m.add(bass(r - 12 + 12, beat * 0.8, 0.65), t0, send=0.03)
        m.add(bass(r + 7 - 12 + 12, beat * 0.5, 0.5), t0 + 1.5 * beat, send=0.03)
        m.add(bass(r - 12 + 12, beat * 0.5, 0.55), t0 + 2.5 * beat, send=0.03)
        if full and b % 8 >= 4:
            scale = [69, 72, 74, 76, 79, 81]
            for step in range(8):
                if RNG.random() < 0.4:
                    m.add(bell(RNG.choice(scale), beat * 0.5, 0.5), t0 + step * beat / 2, pan=-0.2, send=0.5)
    return m.render(room=1.8, wet=0.25, warmth=-1.5)


def morning_pages():
    """Solo piano: flowing arpeggios with a simple melody on top."""
    bpm, m = 70, Mix(DUR)
    beat = 60 / bpm
    bar = beat * 4
    prog = [("C", 48), ("G", 47), ("Am", 45), ("F", 41), ("C", 48), ("G", 43), ("F", 41), ("G", 43)]
    n_bars = int(DUR / bar)
    melody = [76, 74, 72, 74, 76, 79, 77, 76, 74, 72, 71, 72]
    mi = 0
    for b in range(n_bars):
        t0 = b * bar
        name, low = prog[b % len(prog)]
        tones = chord(name, 4)
        m.add(piano(low, bar, 0.5), t0, pan=-0.25, send=0.35)
        pattern = [tones[0], tones[1], tones[2], tones[1] + 12 if len(tones) > 1 else tones[0], tones[2], tones[1], tones[2], tones[0] + 12]
        for i, n in enumerate(pattern):
            m.add(piano(n, beat * 0.9, 0.38 + 0.05 * (i == 0)), humanize(t0 + i * beat / 2, 0.012), pan=-0.05, send=0.35)
        if 2 <= b < n_bars - 1 and b % 4 != 3:
            for k in range(2):
                m.add(piano(melody[mi % len(melody)], beat * 1.8, 0.55), humanize(t0 + k * beat * 2, 0.01), pan=0.2, send=0.4)
                mi += 1
    return m.render(room=2.6, wet=0.32, warmth=-1)


def slow_tide():
    """Wind-down: waves, long pads and a few low piano notes."""
    m = Mix(DUR)
    prog = ["Ebmaj9", "Cm9", "Abmaj7", "Bbsus2"]
    seg = 12.0
    for i in range(int(DUR / seg) + 1):
        name = prog[i % 4]
        m.add(pad(chord(name, 3), seg + 2, 0.55, attack=4, release=4, bright=0.25), i * seg, send=0.55)
        for k in range(3):
            if RNG.random() < 0.6:
                m.add(piano(RNG.choice(chord(name, 4)), 3.0, 0.3), i * seg + 1.5 + k * 3.6, pan=RNG.uniform(-0.3, 0.3), send=0.7)
    wl, wr = waves(DUR), np.roll(waves(DUR), int(1.3 * SR))
    m.add_stereo(wl, wr, gain=1.0)
    return m.render(room=4.0, wet=0.45, warmth=-3)


def glass_hours():
    """Ambient: shimmering bell arpeggios over a slow pad."""
    m = Mix(DUR)
    prog = ["Amaj9", "F#m9" if False else "Gbm9", "Dmaj9", "Esus2"]
    seg = 10.0
    for i in range(int(DUR / seg) + 1):
        name = prog[i % 4]
        notes = chord(name, 3)
        m.add(pad(notes, seg + 2, 0.55, attack=2.5, release=3, bright=0.4), i * seg, send=0.5)
        arp = chord(name, 5)
        step = seg / 16
        for k in range(16):
            if RNG.random() < 0.6:
                m.add(bell(arp[k % len(arp)], 1.5, 0.45), i * seg + k * step, pan=np.sin(k / 2) * 0.6, send=0.6)
        m.add(bass(notes[0] - 12, seg * 0.9, 0.35, pluck=False), i * seg, send=0.1)
    return m.render(room=3.8, wet=0.45, warmth=-2)


def night_rain():
    """Heavier rain with distant thunder and a low drone."""
    m = Mix(DUR)
    rl, rr = rain(DUR, 0.9), rain(DUR, 0.9)
    m.add_stereo(rl, rr, gain=1.1)
    for i in range(int(DUR / 15) + 1):
        name = ["Dm", "Bbmaj7", "F", "C"][i % 4]
        m.add(pad(chord(name, 2), 17, 0.45, attack=5, release=5, bright=0.2), i * 15, send=0.4)
    for at in (22, 71, 118):  # distant thunder: low rumbling noise swell
        n = int(6 * SR)
        t = t_axis(6)
        rumble = fft_filter(noise(n), hi=120) * np.exp(-t * 0.9) * (1 - np.exp(-t * 3)) * 1.5
        m.add(rumble, at, pan=RNG.uniform(-0.5, 0.5), send=0.3)
    return m.render(room=3.0, wet=0.3, warmth=-3)


def blue_hour():
    """Sleepy lofi at 66 bpm: soft kick, brushed snare, mellow Rhodes and tape hiss."""
    bpm, m = 66, Mix(DUR)
    beat = 60 / bpm
    bar = beat * 4
    prog = ["Dbmaj9", "Cm7", "Bbm9", "Abmaj7"]
    roots = [37, 36, 34, 32]
    n_bars = int(DUR / bar)
    for b in range(n_bars):
        t0 = b * bar
        for i, n in enumerate(chord(prog[b % 4], 4)):
            m.add(epiano(n, bar * 0.95, 0.42), humanize(t0 + i * 0.02), pan=-0.1 + i * 0.08, send=0.35)
        m.add(bass(roots[b % 4] + 12, bar * 0.7, 0.55, pluck=False), t0, send=0.05)
        if 1 <= b < n_bars - 1:
            m.add(kick(0.5), t0, send=0.02)
            m.add(kick(0.4), t0 + 2.6 * beat, send=0.02)
            m.add(snare(0.35, brush=True), t0 + beat, send=0.2)
            m.add(snare(0.35, brush=True), t0 + 3 * beat, send=0.2)
            for h in range(8):
                m.add(hat(0.22), humanize(t0 + h * beat / 2 + (0.1 * beat if h % 2 else 0)), pan=0.3, send=0.05)
    l = crackle(DUR, 0.6)
    m.add_stereo(l, np.roll(l, 700), gain=0.55)
    return m.render(room=2.5, wet=0.3, warmth=-4)


def deep_current():
    """Binaural ambient: a 200 Hz tone in the left ear, 210 Hz in the right, under a soft pad."""
    m = Mix(DUR)
    t = t_axis(DUR)
    env = np.minimum(1, t / 6) * np.minimum(1, (DUR - t) / 6)
    left = np.sin(2 * np.pi * 200 * t) * 0.05 * env
    right = np.sin(2 * np.pi * 210 * t) * 0.05 * env
    m.add_stereo(left, right, gain=1.0)
    for i in range(int(DUR / 12) + 1):
        name = ["Gmaj7", "Em9", "Cmaj9", "Dsus2"][i % 4]
        m.add(pad(chord(name, 3), 14, 0.45, attack=4, release=4, bright=0.3), i * 12, send=0.5)
    return m.render(room=3.5, wet=0.4, warmth=-2)


TRACKS = {
    "second-cup": second_cup,
    "rainy-bookstore-jazz": rainy_bookstore_jazz,
    "reading-room-rain": reading_room_rain,
    "lagos-glass": lagos_glass,
    "morning-pages": morning_pages,
    "slow-tide": slow_tide,
    "glass-hours": glass_hours,
    "night-rain": night_rain,
    "blue-hour": blue_hour,
    "deep-current": deep_current,
}


def write_mp3(slug, audio):
    os.makedirs(OUT, exist_ok=True)
    pcm = (np.clip(audio.T, -1, 1) * 32767).astype("<i2")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        path = os.path.join(OUT, f"{slug}.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-codec:a", "libmp3lame", "-b:a", "128k",
             "-metadata", f"title={slug}", "-metadata", "artist=Serenedipity (synthesized demo)", path],
            check=True,
        )
        os.unlink(tmp.name)
    return path


if __name__ == "__main__":
    wanted = sys.argv[1:] or list(TRACKS)
    for slug in wanted:
        RNG.bit_generator.state = np.random.default_rng(zlib.crc32(slug.encode())).bit_generator.state
        print("rendering", slug, flush=True)
        print("  ->", write_mp3(slug, TRACKS[slug]()))
