// audio.js – §11: ses. Tüm sesler Web Audio API ile kodla üretilir (dış dosya yok, tıpkı görseller gibi).
// Ayarlar ekranından müzik/efekt seviyesi ve sessize alma kontrol edilir; tercih localStorage'da kalır.
window.AUDIO = (() => {
  const KEY = "cekirdek_audio";
  let settings = { music: 0.5, sfx: 0.8, muted: false };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) Object.assign(settings, s); } catch (e) {}
  let ctx, master, musicGain, sfxGain, started = false, musicTimer = null;

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = settings.muted ? 0 : 1; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = settings.music; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = settings.sfx; sfxGain.connect(master);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {} }
  function setMusic(v) { settings.music = v; if (musicGain) musicGain.gain.value = v; save(); }
  function setSfx(v) { settings.sfx = v; if (sfxGain) sfxGain.gain.value = v; save(); }
  function setMuted(b) { settings.muted = b; if (master) master.gain.value = b ? 0 : 1; save(); }
  function get() { return Object.assign({}, settings); }

  // ---- kısa efekt sesleri (her mini oyun adımı için, §11) ----
  function tone(freq, dur, type, gainMul, delay) {
    ensureCtx(); const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(); o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gainMul || 0.3, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(sfxGain); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noiseBurst(dur, filterFreq, gainMul, delay, type) {
    ensureCtx(); const t0 = ctx.currentTime + (delay || 0);
    const n = Math.max(1, Math.round(ctx.sampleRate * dur)); const buf = ctx.createBuffer(1, n, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = type || "bandpass"; filt.frequency.value = filterFreq || 1000;
    const g = ctx.createGain(); g.gain.value = gainMul || 0.3;
    src.connect(filt); filt.connect(g); g.connect(sfxGain); src.start(t0);
  }
  const SFX = {
    click: () => tone(880, .06, "sine", .15),
    grind: () => noiseBurst(.45, 1700, .22, 0, "bandpass"),
    dose: () => tone(1300, .05, "square", .1),
    tamp: () => { tone(110, .14, "sine", .35); noiseBurst(.08, 350, .3, .02, "lowpass"); },
    extractStart: () => noiseBurst(1.0, 2200, .1, 0, "bandpass"),
    extractStop: () => tone(660, .1, "sine", .2),
    milk: () => noiseBurst(.55, 3800, .13, 0, "highpass"),
    coin: () => { tone(988, .08, "triangle", .22); tone(1318, .09, "triangle", .2, .07); },
    tip: () => { tone(1318, .08, "triangle", .18); tone(1568, .1, "triangle", .2, .06); },
    perfect: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .16, "triangle", .2, i * .06)); },
    sad: () => { tone(220, .3, "sawtooth", .16); tone(180, .3, "sawtooth", .12, .08); },
    unlock: () => { [523, 659, 784].forEach((f, i) => tone(f, .18, "sine", .18, i * .09)); },
    open: () => tone(520, .07, "sine", .13)
  };
  function sfx(name) { if (!SFX[name]) return; try { SFX[name](); } catch (e) {} }

  // ---- cozy arka plan müziği: yumuşak akor pedi döngüsü (§11 "lo-fi akustik müzik") ----
  const CHORDS = [[261.6, 329.6, 392.0], [220.0, 277.2, 329.6], [233.1, 293.7, 349.2], [196.0, 246.9, 293.7]];
  function playPad(freqs, t0, dur) {
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f / 2;
      const filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 1100;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.085, t0 + 1.4); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      o.connect(filt); filt.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + dur + 0.1);
    });
    // yumuşak "vinil" dokusu: kısa filtrelenmiş gürültü, ritmi hissettirir ama rahatsız etmez
    const n = Math.round(ctx.sampleRate * .3); const buf = ctx.createBuffer(1, n, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) * .5;
    const src = ctx.createBufferSource(); src.buffer = buf; const filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 1800;
    const g = ctx.createGain(); g.gain.value = .04; src.connect(filt); filt.connect(g); g.connect(musicGain); src.start(t0);
  }
  function scheduleLoop() {
    let i = 0; const barDur = 4.4;
    (function step() { if (!started) return; playPad(CHORDS[i % CHORDS.length], ctx.currentTime + 0.05, barDur * .95); i++; musicTimer = setTimeout(step, barDur * 1000); })();
  }
  function startMusic() { if (started) return; ensureCtx(); if (ctx.state === "suspended") ctx.resume(); started = true; scheduleLoop(); }
  function stopMusic() { started = false; if (musicTimer) clearTimeout(musicTimer); musicTimer = null; }

  return { sfx, startMusic, stopMusic, setMusic, setSfx, setMuted, get, ensureCtx };
})();
