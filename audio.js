// audio.js – §11 Ses: tüm sesler Web Audio API ile kodla üretilir (dış dosya yok).
// Müzik: sıcak, ev gibi (keçe piyano, yumuşak ped, bas, ninni motifi, yankı, ~60 BPM, davulsuz).
// Efektler: öğütücü, dozlama, tamping, ekstraksiyon (sürekli pompa + akış), süt buharı (sürekli), yazar kasa.
// Sekme arka plana geçince tüm ses durur (§11).
window.AUDIO = (() => {
  const KEY = "cekirdek_audio";
  let settings = { music: 0.6, sfx: 0.8, muted: false };
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
    // §11 dükkan açılış: kapı zili (iki çın) + yükselen sıcak üç nota
    shopOpen: t => { bell(t, 2349, .09, 1.1, sfxBus); bell(t + .16, 2793, .08, 1.2, sfxBus); bell(t + .16, 2793, .04, 1.2, revSend);
      [65, 69, 72].forEach((m, i) => { osc("sine", mtof(m), t + .45 + i * .16, 1.1, .08, sfxBus, { a: .02 }); osc("sine", mtof(m), t + .45 + i * .16, 1.1, .05, revSend, { a: .02 }); }); },
    // §11 kapanış: tek zil + kilit tık-tak + inen yumuşak üç nota
    shopClose: t => { bell(t, 2349, .07, 1, sfxBus); noise(t + .55, .03, .2, sfxBus, "bandpass", 2500, 2); osc("sine", 900, t + .55, .04, .1, sfxBus);
      noise(t + .7, .06, .22, sfxBus, "lowpass", 500); osc("sine", 140, t + .7, .12, .2, sfxBus, { to: 80 });
      [72, 69, 65].forEach((m, i) => { osc("sine", mtof(m), t + 1 + i * .22, 1.3, .07, sfxBus, { a: .03 }); osc("sine", mtof(m), t + 1 + i * .22, 1.3, .05, revSend, { a: .03 }); }); },
    unlock: t => { [67, 71, 74, 79].forEach((m, i) => { osc("sine", mtof(m), t + i * .08, .9, .07, sfxBus); osc("sine", mtof(m), t + i * .08, .9, .05, revSend); }); }
  };
  function sfx(name) { if (!SFX[name] || document.hidden) return; try { ensureCtx(); if (ctx.state === "suspended" && !document.hidden) ctx.resume(); SFX[name](ctx.currentTime + .01); } catch (e) {} }

  // ---- sürekli sesler: ekstraksiyon (pompa + akış) ve süt buharı ----
  function loop(name, on) {
    if (on && document.hidden) return;
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
  function milkAir(air) { const L = loops.milkAir; if (!L || !loops.milk || !ctx) return; const t = ctx.currentTime;   // hava = kâğıt yırtılma sesi, girdap = derin tıslama
    L.g2.gain.setTargetAtTime(air ? .07 : 0, t, .04); L.f.frequency.setTargetAtTime(air ? 2600 : 1400, t, .08); }
  function stopLoops() { Object.keys(loops).forEach(k => { if (k !== "milkAir") loop(k, false); }); delete loops.milkAir; }

  // ---- müzik: sıcak, ev gibi (§11) — keçe piyano + yumuşak ped + bas + ninni motifi, ~60 BPM, davulsuz ----
  const TRACKS = {
    game: { bpm: 60,                                 // Fmaj7 → Dm7 → B♭maj7 → Csus4/C (majör, sıcak)
      prog: [{ bass: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76] }, { bass: 38, pad: [50, 53, 57, 60], arp: [62, 65, 69, 72] },
             { bass: 46, pad: [53, 57, 58, 62], arp: [65, 70, 74, 77] }, { bass: 36, pad: [55, 60, 65, 67], arp: [67, 72, 77, 79], res: [55, 60, 64, 67] }],
      melody: [[[0, 69], [4, 72]], [[0, 74], [4, 72]], [[0, 70], [4, 69]], [[0, 67], [6, 64]]], arp: [0, 1, 2, 3, 2, 1, 2, 1], dense: 1 },
    menu: { bpm: 52,                                 // §11 ana menü: Cmaj7 → Am7 → Fmaj7 → G6, daha yavaş ve seyrek
      prog: [{ bass: 36, pad: [52, 55, 59, 64], arp: [64, 67, 71, 76] }, { bass: 45, pad: [52, 55, 60, 64], arp: [64, 67, 72, 76] },
             { bass: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 77] }, { bass: 43, pad: [50, 55, 59, 64], arp: [62, 67, 71, 74] }],
      melody: [[[0, 76]], [[2, 72]], [[0, 69], [4, 72]], [[2, 74]]], arp: [0, 2, 1, 3, 2, 1, 3, 2], dense: 0 }
  };
  let TR = TRACKS.game, BEAT = 60 / TR.bpm, E8 = BEAT / 2, PROG = TR.prog, MELODY = TR.melody, ARP = TR.arp, curTrack = "game", wantTrack = "game";
  function applyTrack(name) { curTrack = name; TR = TRACKS[name]; BEAT = 60 / TR.bpm; E8 = BEAT / 2; PROG = TR.prog; MELODY = TR.melody; ARP = TR.arp; }
  let step = 0, nextT = 0, musicOut = null;
  function musicChain() {
    if (musicOut) return musicOut;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300; lp.Q.value = .3;
    const g = ctx.createGain(); g.gain.value = .9; lp.connect(g); g.connect(musicBus);
    const rs = ctx.createGain(); rs.gain.value = .55; lp.connect(rs); rs.connect(revSend);
    return (musicOut = lp);
  }
  function feltPiano(m, t, vel) {                    // yumuşak, boğuk keçe piyano: sinüs + zayıf harmonikler, yavaş sönüm
    const f = mtof(m), out = musicChain();
    [[1, 1], [2, .22], [3, .06]].forEach(([h, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * h; o.detune.value = (Math.random() - .5) * 6;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel * a, t + .018); g.gain.exponentialRampToValueAtTime(vel * a * .35, t + .4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 2.7);
    });
  }
  function pad(notes, t, dur) {                      // sıcak ped: iki hafif ayrık sinüs/üçgen, yavaş giriş-çıkış
    const out = musicChain();
    notes.forEach(m => [-5, 5].forEach(dt => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "triangle"; o.frequency.value = mtof(m); o.detune.value = dt;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.018, t + 1.4); g.gain.setValueAtTime(.018, t + dur - 1.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + .6);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .7);
    }));
  }
  function softBass(m, t, dur) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.11, t + .08); g.gain.exponentialRampToValueAtTime(.03, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + .3);
    o.connect(g); g.connect(musicChain()); o.start(t); o.stop(t + dur + .35); }
  function lullaby(m, t) {                           // ninni motifi: hafif vibratolu yumuşak ses
    const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
    o.type = "sine"; o.frequency.value = mtof(m); v.frequency.value = 4.5; vg.gain.value = 3; v.connect(vg); vg.connect(o.detune);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.045, t + .25); g.gain.setTargetAtTime(.0001, t + 1.4, .5);
    o.connect(g); g.connect(musicChain()); o.start(t); v.start(t); o.stop(t + 3.5); v.stop(t + 3.5);
  }
  function scheduleStep(i, t) {
    const barN = Math.floor(i / 8), bar = barN % PROG.length, s = i % 8, ch = PROG[bar], cycle = Math.floor(barN / PROG.length);
    const human = (Math.random() - .5) * .02;
    if (s === 0) { pad(ch.pad, t, BEAT * 4); softBass(ch.bass, t, BEAT * 3.6); }
    if (bar === 3 && s === 4 && ch.res) pad(ch.res, t, BEAT * 2);
    const notes = (bar === 3 && s >= 4 && ch.res) ? ch.res.map(n => n + 12) : ch.arp;
    if (s % 2 === 0 || (TR.dense && cycle % 2 === 1)) feltPiano(notes[ARP[s]], t + human, s === 0 ? .07 : (TR.dense ? .045 : .035));
    if (cycle % 2 === 0) MELODY[bar].forEach(([at, m]) => { if (at === s) lullaby(m, t); });
  }
  function scheduler() {
    if (!started || ctx.state !== "running") return;
    while (nextT < ctx.currentTime + .3) {
      if (step % (8 * PROG.length) === 0 && wantTrack !== curTrack) { applyTrack(wantTrack); step = 0; }   // parça değişimi döngü başında
      scheduleStep(step, nextT); step++; nextT += E8; }
  }
  function startMusic(track) {
    if (track && TRACKS[track]) { wantTrack = track; if (started && curTrack !== track) { applyTrack(track); step = 0; } }   // §11 menü ↔ oyun müziği
    if (document.hidden) { resumeMusic = true; return; }
    ensureCtx(); if (ctx.state === "suspended" && !document.hidden) ctx.resume();
    if (started) return; started = true; step = 0; applyTrack(wantTrack); nextT = ctx.currentTime + .2;
    sched = setInterval(scheduler, 80);
  }
  function stopMusic() { started = false; clearInterval(sched); sched = null; }

  // §11: sekme arka plana geçince ses motoru TAMAMEN kapatılır (tarayıcının "ses çalıyor" simgesi de gider); dönünce müzik yeniden başlar
  let resumeMusic = false;
  function shutdown() {
    if (!ctx) return; resumeMusic = started || resumeMusic; stopLoops(); stopMusic();
    const c = ctx; ctx = null; master = musicBus = sfxBus = reverb = revSend = noiseBuf = musicOut = null;
    try { c.close(); } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) shutdown(); else if (resumeMusic) { resumeMusic = false; startMusic(wantTrack); } });
  window.addEventListener("pagehide", shutdown);
  window.addEventListener("blur", () => { if (document.hidden) shutdown(); });

  return { sfx, loop, milkAir, stopLoops, startMusic, stopMusic, setMusic, setSfx, setMuted, get, ensureCtx };
})();
