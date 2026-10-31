// audio.js – §11 Ses: tüm sesler Web Audio API ile kodla üretilir (dış dosya yok).
// Müzik: sakin lo-fi caz döngüsü (elektrik piyano, bas, fırça davul, plak cızırtısı, yankı, ~70 BPM).
// Efektler: öğütücü, dozlama, tamping, ekstraksiyon (sürekli pompa + akış), süt buharı (sürekli), yazar kasa.
// Sekme arka plana geçince tüm ses durur (§11).
window.AUDIO = (() => {
  const KEY = "cekirdek_audio";
  let settings = { music: 0.55, sfx: 0.8, muted: false };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) Object.assign(settings, s); } catch (e) {}
  let ctx, master, musicBus, sfxBus, reverb, revSend, noiseBuf, started = false, sched = null;
  const loops = {};

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = settings.muted ? 0 : 1; master.connect(comp);
    // yankı (üretilmiş dürtü yanıtı)
    reverb = ctx.createConvolver(); const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    reverb.buffer = ir; revSend = ctx.createGain(); revSend.gain.value = 0.35; revSend.connect(reverb); reverb.connect(master);
    // müzik: sıcak, yumuşak (yüksekler kısık)
    const warm = ctx.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 2400; warm.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = settings.music; musicBus.connect(warm); musicBus.connect(revSend);
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx; sfxBus.connect(master);
    const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) nd[i] = Math.random() * 2 - 1;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {} }
  function setMusic(v) { settings.music = v; if (musicBus) musicBus.gain.setTargetAtTime(v, ctx.currentTime, .05); save(); }
  function setSfx(v) { settings.sfx = v; if (sfxBus) sfxBus.gain.setTargetAtTime(v, ctx.currentTime, .05); save(); }
  function setMuted(b) { settings.muted = b; if (master) master.gain.setTargetAtTime(b ? 0 : 1, ctx.currentTime, .05); save(); }
  function get() { return Object.assign({}, settings); }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---- yapı taşları ----
  function env(g, t, a, peak, d, sus, r, end) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(peak * sus, t + a, d);
    if (end != null) { g.gain.setTargetAtTime(0.0001, end, r); }
  }
  function osc(type, freq, t, dur, gain, dest, opts = {}) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + (opts.glide || dur));
    if (opts.detune) o.detune.value = opts.detune;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + (opts.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function noise(t, dur, gain, dest, ftype, freq, q = 1, opts = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + (opts.a || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function bell(t, freq, gain, dur, dest) {   // metal/çan: inharmonik kısmi sesler
    [1, 2.76, 5.4, 8.93].forEach((r, i) => osc("sine", freq * r, t, dur / (1 + i * .8), gain / (1 + i * 1.6), dest, { a: .002 }));
  }

  // ---- efektler ----
  const SFX = {
    click: t => { osc("sine", 700, t, .07, .12, sfxBus, { to: 420, glide: .06 }); noise(t, .02, .05, sfxBus, "highpass", 4000); },
    open: t => noise(t, .22, .07, sfxBus, "bandpass", 900, 1.2, { to: 3200, a: .05 }),          // sayfa hışırtısı
    grind: t => {                                                                              // öğütücü motoru + çekirdek kırılması
      const dur = 1.1, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(155, t + .18); o.frequency.setValueAtTime(155, t + dur - .2); o.frequency.linearRampToValueAtTime(60, t + dur);
      f.type = "lowpass"; f.frequency.value = 700; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.09, t + .1); g.gain.setValueAtTime(.09, t + dur - .2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + .05);
      for (let i = 0; i < 26; i++) noise(t + .08 + Math.random() * (dur - .3), .025, .05 + Math.random() * .05, sfxBus, "bandpass", 1800 + Math.random() * 2500, 3);
    },
    dose: t => { for (let i = 0; i < 7; i++) noise(t + i * .05 + Math.random() * .02, .03, .05, sfxBus, "bandpass", 1500 + Math.random() * 1500, 2); osc("sine", 140, t + .35, .12, .08, sfxBus); },
    tamp: t => { osc("sine", 95, t, .2, .4, sfxBus, { to: 55, glide: .15 }); noise(t, .05, .12, sfxBus, "lowpass", 600); bell(t + .02, 1900, .03, .25, sfxBus); },
    extractStop: t => { osc("sine", 220, t, .08, .06, sfxBus); noise(t, .12, .05, sfxBus, "lowpass", 400); },
    // yazar kasa: çekmece "tak" + çan "çın" + bozuk para şıngırtısı
    register: t => {
      noise(t, .09, .16, sfxBus, "bandpass", 700, 1.5); osc("sine", 110, t, .1, .2, sfxBus, { to: 70 });
      bell(t + .07, 1568, .16, 1.3, sfxBus); bell(t + .11, 2093, .12, 1.4, sfxBus);
      const send = ctx.createGain(); send.gain.value = .5; send.connect(revSend); bell(t + .09, 2093, .06, 1.2, send);
      for (let i = 0; i < 6; i++) bell(t + .18 + Math.random() * .3, 2800 + Math.random() * 2200, .03, .18, sfxBus);
    },
    tip: t => { for (let i = 0; i < 5; i++) bell(t + i * .07, 3000 + Math.random() * 1500, .035, .22, sfxBus); },
    perfect: t => { [72, 76, 79, 84].forEach((m, i) => { bell(t + i * .09, mtof(m), .06, 1.1, sfxBus); bell(t + i * .09, mtof(m), .03, 1.1, revSend); }); },
    sad: t => { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; f.connect(sfxBus);
      osc("triangle", mtof(62), t, .35, .12, f); osc("triangle", mtof(58), t + .22, .55, .12, f, { to: mtof(57), glide: .5 }); },
    unlock: t => { [67, 71, 74, 79].forEach((m, i) => { osc("sine", mtof(m), t + i * .08, .9, .07, sfxBus); osc("sine", mtof(m), t + i * .08, .9, .05, revSend); }); }
  };
  function sfx(name) { if (!SFX[name]) return; try { ensureCtx(); if (ctx.state === "suspended" && !document.hidden) ctx.resume(); SFX[name](ctx.currentTime + .01); } catch (e) {} }

  // ---- sürekli sesler: ekstraksiyon (pompa + akış) ve süt buharı ----
  function loop(name, on) {
    try {
      ensureCtx(); const t = ctx.currentTime;
      if (!on) { const L = loops[name]; if (!L) return; L.g.gain.setTargetAtTime(0.0001, t, .06); L.nodes.forEach(n => { try { n.stop(t + .4); } catch (e) {} }); delete loops[name]; return; }
      if (loops[name]) return;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(1, t, .05); g.connect(sfxBus);
      const nodes = [];
      if (name === "extract") {
        const pump = ctx.createOscillator(), pf = ctx.createBiquadFilter(), pg = ctx.createGain();
        pump.type = "sawtooth"; pump.frequency.value = 50; pf.type = "lowpass"; pf.frequency.value = 260; pg.gain.value = .07;
        const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 6; vg.gain.value = 2; vib.connect(vg); vg.connect(pump.frequency);
        pump.connect(pf); pf.connect(pg); pg.connect(g); pump.start(t); vib.start(t); nodes.push(pump, vib);
        const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1100; f.Q.value = .8;
        const ng = ctx.createGain(); ng.gain.value = .045; const am = ctx.createOscillator(), ag = ctx.createGain(); am.frequency.value = 9; ag.gain.value = .02; am.connect(ag); ag.connect(ng.gain);
        s.connect(f); f.connect(ng); ng.connect(g); s.start(t); am.start(t); nodes.push(s, am);
      }
      if (name === "milk") {
        const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2600;
        const ng = ctx.createGain(); ng.gain.value = .09; s.connect(f); f.connect(ng); ng.connect(g); s.start(t); nodes.push(s);
        const s2 = ctx.createBufferSource(); s2.buffer = noiseBuf; s2.loop = true; const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 5200; f2.Q.value = 2;
        const g2 = ctx.createGain(); g2.gain.value = 0; const am = ctx.createOscillator(), ag = ctx.createGain(); am.type = "square"; am.frequency.value = 23; ag.gain.value = .05; am.connect(ag); ag.connect(g2.gain);
        s2.connect(f2); f2.connect(g2); g2.connect(g); s2.start(t); am.start(t); nodes.push(s2, am);
        loops.milkAir = { g2, ag, f };
      }
      loops[name] = { g, nodes };
    } catch (e) {}
  }
  function milkAir(air) { const L = loops.milkAir; if (!L || !loops.milk) return; const t = ctx.currentTime;   // hava = kâğıt yırtılma sesi, girdap = derin tıslama
    L.g2.gain.setTargetAtTime(air ? .07 : 0, t, .04); L.f.frequency.setTargetAtTime(air ? 2600 : 1400, t, .08); }
  function stopLoops() { Object.keys(loops).forEach(k => { if (k !== "milkAir") loop(k, false); }); delete loops.milkAir; }

  // ---- müzik: lo-fi caz döngüsü ----
  const BPM = 70, BEAT = 60 / BPM, S16 = BEAT / 4;
  const PROG = [                                    // Fmaj9 → Em9 → Dm9 → Cmaj9 (iniş, dinlendirici)
    { bass: 41, v: [57, 60, 64, 67] }, { bass: 40, v: [55, 59, 62, 66] },
    { bass: 38, v: [53, 57, 60, 64] }, { bass: 36, v: [52, 55, 59, 62] }
  ];
  const PENTA = [72, 74, 76, 79, 81, 84];
  let step = 0, nextT = 0, crackle = null;
  function epiano(m, t, dur, vel) {            // yumuşak Rhodes benzeri: sinüs + hafif FM çan + tremolo
    const f = mtof(m), out = ctx.createGain(); out.gain.value = vel; out.connect(musicBus);
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.type = "sine"; car.frequency.value = f; car.detune.value = (Math.random() - .5) * 8;
    mod.frequency.value = f * 2; mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(f * .05, t + .6);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.12, t + .012); g.gain.setTargetAtTime(.05, t + .02, .5); g.gain.setTargetAtTime(0.0001, t + dur, .35);
    car.start(t); mod.start(t); car.stop(t + dur + 1.6); mod.stop(t + dur + 1.6);
  }
  function kick(t, v) { osc("sine", 110, t, .32, .22 * v, musicBus, { to: 42, glide: .12 }); }
  function brush(t, v, open) { noise(t, open ? .14 : .05, .035 * v, musicBus, "highpass", 6500); }
  function snare(t, v) { noise(t, .16, .05 * v, musicBus, "bandpass", 1900, .8); osc("triangle", 190, t, .08, .03 * v, musicBus); }
  function startCrackle() {
    const n = ctx.sampleRate * 3, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * .015 + (Math.random() < .0004 ? (Math.random() - .5) * .6 : 0);
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2500; f.Q.value = .5;
    const g = ctx.createGain(); g.gain.value = .5; s.connect(f); f.connect(g); g.connect(musicBus); s.start(); crackle = s;
  }
  function scheduleStep(i, t) {
    const bar = Math.floor(i / 16) % PROG.length, s = i % 16, ch = PROG[bar];
    const swing = (s % 2) ? S16 * .28 : 0, tt = t + swing;
    if (s === 0) { ch.v.forEach((m, k) => epiano(m, t + k * .025, BEAT * 3.6, .55)); osc("sine", mtof(ch.bass), t, BEAT * 3.2, .16, musicBus, { a: .03 }); }
    if (s === 10) { ch.v.slice(1).forEach((m, k) => epiano(m, tt + k * .02, BEAT * 1.4, .3)); osc("sine", mtof(ch.bass + 7), tt, BEAT * 1.2, .11, musicBus, { a: .03 }); }
    if (s === 0 || s === 7 && Math.random() < .5 || s === 10) kick(tt, s === 0 ? 1 : .7);
    if (s === 4 || s === 12) snare(tt, .9);
    if (s % 2 === 0 || Math.random() < .25) brush(tt, s % 4 === 0 ? 1 : .6, s === 14);
    if ((s === 2 || s === 6 || s === 9 || s === 13) && Math.random() < .32) epiano(PENTA[Math.floor(Math.random() * PENTA.length)], tt, BEAT * .9, .32);
  }
  function scheduler() {
    if (!started || ctx.state !== "running") return;
    while (nextT < ctx.currentTime + .25) { scheduleStep(step, nextT); step++; nextT += S16; }
  }
  function startMusic() {
    ensureCtx(); if (ctx.state === "suspended" && !document.hidden) ctx.resume();
    if (started) return; started = true; step = 0; nextT = ctx.currentTime + .1;
    if (!crackle) startCrackle(); sched = setInterval(scheduler, 60);
  }
  function stopMusic() { started = false; clearInterval(sched); sched = null; }

  // §11: sekme arka plana geçince tüm ses durur, dönünce devam eder
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else { ctx.resume().then(() => { nextT = Math.max(nextT, ctx.currentTime + .05); }); }
  });
  window.addEventListener("pagehide", () => { if (ctx) ctx.suspend(); });

  return { sfx, loop, milkAir, stopLoops, startMusic, stopMusic, setMusic, setSfx, setMuted, get, ensureCtx };
})();
