#!/usr/bin/env python3
"""CoffeBean sesleri: web v0.47 audio.js'teki Web Audio sentezinin aynısı, WAV olarak üretilir (dış ses dosyası yok).

Kullanım: python3 tools/ses_uret.py   (godot/coffebean klasöründen) → ses/*.wav
Tasarım belgesi: "Ses ve ses ayarları (taşıma adımı T18)".
"""
import os
import wave

import numpy as np
from scipy.signal import butter, lfilter, fftconvolve

SR = 32000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ses")
rng = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def buf(sec):
    return np.zeros(int(sec * SR) + 1)


def add(dst, src, t):
    i = int(t * SR)
    n = min(len(src), len(dst) - i)
    if n > 0:
        dst[i:i + n] += src[:n]


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def env_exp(dur, peak, a=0.005):
    """linear attack to peak, exponential decay to ~0 at dur (Web Audio exponentialRamp to 0.0001)."""
    t = tt(dur)
    e = np.where(t < a, peak * t / max(a, 1e-6), peak * (0.0001 / peak) ** ((t - a) / max(dur - a, 1e-6)))
    return e


def osc(kind, f0, dur, gain, a=0.005, to=None, glide=None, detune=0.0):
    t = tt(dur)
    f = np.full_like(t, f0 * 2 ** (detune / 1200))
    if to:
        g = glide or dur
        k = np.clip(t / g, 0, 1)
        f = f0 * (to / f0) ** k
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "sine":
        w = np.sin(ph)
    elif kind == "triangle":
        w = 2 / np.pi * np.arcsin(np.sin(ph))
    elif kind == "sawtooth":
        w = 2 * ((ph / (2 * np.pi)) % 1) - 1
    else:
        w = np.sign(np.sin(ph))
    return w * env_exp(dur, gain, a)


def filt(x, kind, freq, q=1.0):
    freq = min(freq, SR / 2 * 0.95)
    if kind == "lowpass":
        b, a = butter(2, freq / (SR / 2), "low")
    elif kind == "highpass":
        b, a = butter(2, freq / (SR / 2), "high")
    else:
        bw = freq / max(q, 0.3)
        lo, hi = max(20, freq - bw / 2), min(SR / 2 * 0.95, freq + bw / 2)
        b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    return lfilter(b, a, x)


def noise(dur, gain, kind, freq, q=1.0, a=0.004):
    n = rng.uniform(-1, 1, int(dur * SR))
    return filt(n, kind, freq, q) * env_exp(dur, gain, a) * 2.0


def bell(freq, gain, dur):
    out = np.zeros(int(dur * SR))
    for i, r in enumerate([1, 2.76, 5.4, 8.93]):
        if freq * r > SR / 2 * 0.9:
            continue
        x = osc("sine", freq * r, dur / (1 + i * 0.8), gain / (1 + i * 1.6), a=0.002)
        out[:len(x)] += x
    return out


def reverb_ir(sec=2.6):
    n = int(sec * SR)
    k = (1 - np.arange(n) / n) ** 2.6
    return [rng.uniform(-1, 1, n) * k for _ in range(2)]


IR = reverb_ir()


def yanki(x, send):
    """mono → stereo + yankı (web revSend 0.35)."""
    L = x + fftconvolve(x, IR[0])[:len(x)] * send * 0.02
    R = x + fftconvolve(x, IR[1])[:len(x)] * send * 0.02
    return np.stack([L, R], 1)


def yaz(ad, x, stereo=False, tepe=None):
    """tepe: hedef tepe genliği (efektler 0,5, döngüler 0,3); müzik olduğu gibi."""
    os.makedirs(OUT, exist_ok=True)
    if not stereo:
        x = x[:, None]
    peak = np.max(np.abs(x))
    if tepe and peak > 0:
        x = x * tepe / peak
    elif peak > 0.98:
        x = x * 0.98 / peak
    d = (x * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, ad + ".wav"), "wb") as w:
        w.setnchannels(d.shape[1])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(d.tobytes())


# ---------- efektler (web SFX) ----------
def sfx_hepsi():
    S = {}
    b = buf(0.12); add(b, osc("sine", 700, 0.07, 0.12, to=420, glide=0.06), 0); add(b, noise(0.02, 0.05, "highpass", 4000), 0); S["click"] = b
    b = buf(0.3); add(b, noise(0.22, 0.07, "bandpass", 1800, 0.6, a=0.05), 0); S["open"] = b
    b = buf(0.5)
    for i in range(7):
        add(b, noise(0.03, 0.05, "bandpass", 1500 + rng.random() * 1500, 2), i * 0.05 + rng.random() * 0.02)
    add(b, osc("sine", 140, 0.12, 0.08), 0.35); S["dose"] = b
    b = buf(0.35); add(b, osc("sine", 95, 0.2, 0.4, to=55, glide=0.15), 0); add(b, noise(0.05, 0.12, "lowpass", 600), 0); add(b, bell(1900, 0.03, 0.25), 0.02); S["tamp"] = b
    b = buf(0.2); add(b, osc("sine", 220, 0.08, 0.06), 0); add(b, noise(0.12, 0.05, "lowpass", 400), 0); S["extractStop"] = b
    b = buf(1.8); add(b, noise(0.09, 0.16, "bandpass", 700, 1.5), 0); add(b, osc("sine", 110, 0.1, 0.2, to=70), 0)
    add(b, bell(1568, 0.16, 1.3), 0.07); add(b, bell(2093, 0.12, 1.4), 0.11)
    for _ in range(6):
        add(b, bell(2800 + rng.random() * 2200, 0.03, 0.18), 0.18 + rng.random() * 0.3)
    S["register"] = b
    b = buf(0.7)
    for i in range(5):
        add(b, bell(3000 + rng.random() * 1500, 0.035, 0.22), i * 0.07)
    S["tip"] = b
    b = buf(1.6)
    for i, m in enumerate([72, 76, 79, 84]):
        add(b, bell(mtof(m), 0.06, 1.1), i * 0.09)
    S["perfect"] = b
    b = buf(1.0); add(b, osc("triangle", mtof(62), 0.35, 0.12), 0); add(b, osc("triangle", mtof(58), 0.55, 0.12, to=mtof(57), glide=0.5), 0.22); S["sad"] = filt(b, "lowpass", 900)
    b = buf(2.2); add(b, bell(2349, 0.09, 1.1), 0); add(b, bell(2793, 0.08, 1.2), 0.16)
    for i, m in enumerate([65, 69, 72]):
        add(b, osc("sine", mtof(m), 1.1, 0.08, a=0.02), 0.45 + i * 0.16)
    S["shopOpen"] = b
    b = buf(2.8); add(b, bell(2349, 0.07, 1.0), 0); add(b, noise(0.03, 0.2, "bandpass", 2500, 2), 0.55); add(b, osc("sine", 900, 0.04, 0.1), 0.55)
    add(b, noise(0.06, 0.22, "lowpass", 500), 0.7); add(b, osc("sine", 140, 0.12, 0.2, to=80), 0.7)
    for i, m in enumerate([72, 69, 65]):
        add(b, osc("sine", mtof(m), 1.3, 0.07, a=0.03), 1.0 + i * 0.22)
    S["shopClose"] = b
    b = buf(1.4)
    for i, m in enumerate([67, 71, 74, 79]):
        add(b, osc("sine", mtof(m), 0.9, 0.07), i * 0.08)
    S["unlock"] = b
    # Godot'ya özgü: telve kutusuna vurma (iki tok vuruş) ve portafiltreyi kilitleme (metal tık)
    b = buf(0.6)
    for k in (0, 0.22):
        add(b, osc("sine", 120, 0.18, 0.35, to=60, glide=0.12), k); add(b, noise(0.06, 0.15, "lowpass", 900), k)
    S["knock"] = b
    b = buf(0.3); add(b, noise(0.04, 0.12, "bandpass", 3000, 2), 0); add(b, bell(2600, 0.04, 0.2), 0.01); S["lock"] = b
    for ad, x in S.items():
        yaz(ad, yanki(x, 0.15) if ad in ("register", "perfect", "shopOpen", "shopClose", "unlock") else x, stereo=ad in ("register", "perfect", "shopOpen", "shopClose", "unlock"), tepe=0.5)


# ---------- sürekli sesler (döngü; uçları birleşik) ----------
def dongu(x, fade=0.05):
    n = int(fade * SR)
    y = x[:-n].copy()
    y[:n] = y[:n] * np.linspace(0, 1, n) + x[-n:] * np.linspace(1, 0, n)
    return y


def loops():
    d = 3.0
    t = tt(d + 0.05)
    # ekstraksiyon: pompa (testere 50 Hz, 6 Hz vibrato, 260 Hz alçak geçiren) + akış (bant gürültüsü, 9 Hz genlik)
    f = 50 + 2 * np.sin(2 * np.pi * 6 * t)
    pump = filt(2 * ((np.cumsum(f) / SR) % 1) - 1, "lowpass", 260) * 0.07
    flow = filt(rng.uniform(-1, 1, len(t)), "bandpass", 1100, 0.8) * 2 * (0.045 + 0.02 * np.sin(2 * np.pi * 9 * t))
    yaz("extract", dongu(pump + flow), tepe=0.3)
    # süt buharı (derin tıslama) ve hava alma (kâğıt yırtılma: 23 Hz kare genlikli tiz gürültü)
    yaz("milk", dongu(filt(rng.uniform(-1, 1, len(t)), "highpass", 1400) * 0.09 * 2), tepe=0.3)
    am = (np.sign(np.sin(2 * np.pi * 23 * t)) + 1) / 2
    yaz("air", dongu(filt(rng.uniform(-1, 1, len(t)), "bandpass", 5200, 2) * 2 * 0.07 * am + filt(rng.uniform(-1, 1, len(t)), "highpass", 2600) * 0.05), tepe=0.3)
    # öğütücü motoru: testere 155 Hz + 700 Hz alçak geçiren + çekirdek kırılma tıkırtıları
    g = filt(2 * ((155 * t) % 1) - 1, "lowpass", 700) * 0.09
    for _ in range(70):
        k = int(rng.random() * (len(t) - 2000))
        g[k:k + int(0.025 * SR)] += noise(0.025, 0.05 + rng.random() * 0.05, "bandpass", 1800 + rng.random() * 2500, 3)
    yaz("grind", dongu(g), tepe=0.3)
    # süt dökme: yumuşak akış
    yaz("pour", dongu(filt(rng.uniform(-1, 1, len(t)), "bandpass", 700, 0.7) * 2 * (0.04 + 0.01 * np.sin(2 * np.pi * 5 * t))), tepe=0.3)


# ---------- müzik (web TRACKS game / menu; iki tur = melodili + yoğun arpej, döngü) ----------
TRACKS = {
    "game": dict(bpm=60, prog=[dict(bass=41, pad=[53, 57, 60, 64], arp=[65, 69, 72, 76]), dict(bass=38, pad=[50, 53, 57, 60], arp=[62, 65, 69, 72]),
                              dict(bass=46, pad=[53, 57, 58, 62], arp=[65, 70, 74, 77]), dict(bass=36, pad=[55, 60, 65, 67], arp=[67, 72, 77, 79], res=[55, 60, 64, 67])],
                 melody=[[(0, 69), (4, 72)], [(0, 74), (4, 72)], [(0, 70), (4, 69)], [(0, 67), (6, 64)]], arp=[0, 1, 2, 3, 2, 1, 2, 1], dense=1),
    "menu": dict(bpm=52, prog=[dict(bass=36, pad=[52, 55, 59, 64], arp=[64, 67, 71, 76]), dict(bass=45, pad=[52, 55, 60, 64], arp=[64, 67, 72, 76]),
                              dict(bass=41, pad=[53, 57, 60, 64], arp=[65, 69, 72, 77]), dict(bass=43, pad=[50, 55, 59, 64], arp=[62, 67, 71, 74])],
                 melody=[[(0, 76)], [(2, 72)], [(0, 69), (4, 72)], [(2, 74)]], arp=[0, 2, 1, 3, 2, 1, 3, 2], dense=0),
}


def felt(m, vel):
    d = 2.7
    t = tt(d)
    out = np.zeros(len(t))
    for h, a in [(1, 1), (2, 0.22), (3, 0.06)]:
        f = mtof(m) * h * 2 ** ((rng.random() - 0.5) * 6 / 1200)
        e = np.where(t < 0.018, vel * a * t / 0.018, np.where(t < 0.4, vel * a * (0.35) ** ((t - 0.018) / 0.382), vel * a * 0.35 * (0.0001 / (vel * a * 0.35)) ** ((t - 0.4) / 2.2)))
        out += np.sin(2 * np.pi * f * t) * e
    return out


def pad(notes, dur):
    t = tt(dur + 0.7)
    e = np.clip(t / 1.4, 0, 1) * 0.018
    e = np.where(t > dur - 1.2, 0.018 * np.clip(1 - (t - (dur - 1.2)) / 1.8, 0, 1), e)
    out = np.zeros(len(t))
    for m in notes:
        for dt in (-5, 5):
            out += 2 / np.pi * np.arcsin(np.sin(2 * np.pi * mtof(m) * 2 ** (dt / 1200) * t)) * e
    return out


def bass(m, dur):
    t = tt(dur + 0.35)
    e = np.where(t < 0.08, 0.11 * t / 0.08, 0.11 * (0.03 / 0.11) ** ((t - 0.08) / (dur - 0.08)))
    e = np.where(t > dur, 0.03 * np.clip(1 - (t - dur) / 0.3, 0, 1), e)
    return np.sin(2 * np.pi * mtof(m) * t) * e


def lullaby(m):
    t = tt(3.5)
    f = mtof(m) * 2 ** (3 * np.sin(2 * np.pi * 4.5 * t) / 1200)
    e = np.where(t < 0.25, 0.045 * t / 0.25, np.where(t < 1.4, 0.045, 0.045 * np.exp(-(t - 1.4) / 0.5)))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e


def muzik(ad):
    T = TRACKS[ad]
    beat = 60 / T["bpm"]
    e8 = beat / 2
    steps = 8 * len(T["prog"]) * 2
    dur = steps * e8
    x = buf(dur + 4)
    for i in range(steps):
        t0 = i * e8
        bar_n = i // 8
        bar = bar_n % len(T["prog"])
        s = i % 8
        ch = T["prog"][bar]
        cyc = bar_n // len(T["prog"])
        human = (rng.random() - 0.5) * 0.02
        if s == 0:
            add(x, pad(ch["pad"], beat * 4), t0)
            add(x, bass(ch["bass"], beat * 3.6), t0)
        if bar == 3 and s == 4 and "res" in ch:
            add(x, pad(ch["res"], beat * 2), t0)
        notes = [n + 12 for n in ch["res"]] if (bar == 3 and s >= 4 and "res" in ch) else ch["arp"]
        if s % 2 == 0 or (T["dense"] and cyc % 2 == 1):
            add(x, felt(notes[T["arp"][s]], 0.07 if s == 0 else (0.045 if T["dense"] else 0.035)), max(0, t0 + human))
        if cyc % 2 == 0:
            for at, m in T["melody"][bar]:
                if at == s:
                    add(x, lullaby(m), t0)
    x = filt(x, "lowpass", 1300) * 0.9
    n = int(dur * SR)
    loop = x[:n].copy()
    loop[:len(x) - n] += x[n:]          # kuyruk döngünün başına sarılır (dikişsiz)
    st = yanki(loop, 0.55 * 0.6)
    st = filt(st.T, "lowpass", 2400).T * 2.2
    yaz("muzik_" + ad, st, stereo=True)


if __name__ == "__main__":
    sfx_hepsi()
    loops()
    muzik("game")
    muzik("menu")
    print("tamam:", sorted(os.listdir(OUT)))
