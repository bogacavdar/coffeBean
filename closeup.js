// closeup.js – §11: gerçekçi tezgâh yakın planı. Her mini oyun için kodla çizilmiş foto-benzeri sahne.
window.CLOSEUP = (() => {
  const W = 480, H = 250;        // mantıksal çizim ızgarası (tüm fonksiyonlar bu koordinatları kullanır)
  let cv, ctx;
  // §11: panel artık sahnenin ortasında büyük bir kart — tuval CSS'te büyütülür, burada mantıksal ızgara ona ölçeklenir (daha büyük, daha net).
  let maxDpr = 2, gpuOn = true;
  function setQuality(q, gpu) { maxDpr = q === "high" ? 2 : q === "medium" ? 1.25 : 1; if (gpu != null) gpuOn = gpu; }   // §12
  function init(canvas) { cv = canvas; ctx = cv.getContext("2d", gpuOn ? { desynchronized: true } : { willReadFrequently: true }); size(); }
  function size() {
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const cw = cv.clientWidth || W, ch = cv.clientHeight || H;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    ctx.setTransform(dpr * cw / W, 0, 0, dpr * ch / H, 0, 0);
  }
  const lg = (x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rg = (x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function bg() {
    ctx.fillStyle = lg(0, 0, 0, H, [[0, "#d9d2c5"], [1, "#b9ae9c"]]); ctx.fillRect(0, 0, W, H);          // arka duvar
    ctx.fillStyle = lg(0, H - 70, 0, H, [[0, "#8d6441"], [.1, "#7a5435"], [1, "#4e3420"]]); ctx.fillRect(0, H - 70, W, 70);   // meşe tezgâh
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(0, H - 70, W, 3);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.fillRect(0, H - 60 + i * 11, W, 1); }
  }
  function steel(x, y, w, h, r = 8) { ctx.fillStyle = lg(x, 0, x + w, 0, [[0, "#9ea2a7"], [.25, "#e3e6e9"], [.5, "#b4b8bd"], [.75, "#eef0f2"], [1, "#8a8e93"]]); rr(x, y, w, h, r); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.stroke(); }
  function shadow(x, y, rx, ry, a = .35) { ctx.fillStyle = rg(x, y, 0, rx, [[0, `rgba(0,0,0,${a})`], [1, "rgba(0,0,0,0)"]]); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function gauge(x, y, w, val, lo, hi, label) {   // §11: ibreler yarı saydam ve küçük
    return;   // §4 prototip: hedef artık tuvalin altındaki büyük renkli çubukta; tuval içi küçük ibreler gizli
    ctx.save(); ctx.globalAlpha = .75; ctx.fillStyle = "rgba(255,255,255,.55)"; rr(x, y, w, 10, 5); ctx.fill();
    ctx.fillStyle = "rgba(111,125,74,.55)"; rr(x + w * lo, y, w * (hi - lo), 10, 4); ctx.fill();
    ctx.fillStyle = "#2b2117"; ctx.fillRect(x + w * Math.max(0, Math.min(1, val)) - 1.5, y - 2, 3, 14);
    if (label) { ctx.font = "11px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#2b2117"; ctx.fillText(label, x, y - 5); }
    ctx.restore();
  }
  // ---- Öğütme: öğütücü, hazne, çıkan kahvenin tane iriliği
  function grind(v) { bg(); shadow(240, H - 66, 90, 10);
    ctx.fillStyle = lg(0, 0, 0, 1, [[0, "#1e1e21"], [1, "#0e0e10"]]); rr(190, 42, 100, 118, 10); ctx.fill();               // gövde
    ctx.fillStyle = "rgba(90,60,30,.75)"; ctx.beginPath(); ctx.ellipse(240, 40, 44, 16, 0, 0, Math.PI * 2); ctx.fill();   // hazne
    ctx.fillStyle = rg(240, 56, 2, 44, [[0, "rgba(140,95,50,.9)"], [1, "rgba(60,35,15,.9)"]]); ctx.beginPath(); ctx.ellipse(240, 38, 40, 13, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 6 + (i % 7) * 4.5; ctx.fillStyle = i % 3 ? "#4a2c17" : "#6b3e1f"; ctx.beginPath(); ctx.ellipse(240 + Math.cos(a) * r, 38 + Math.sin(a) * r * .33, 3, 2, a, 0, Math.PI * 2); ctx.fill(); }
    steel(300, 95, 30, 24, 4); ctx.fillStyle = "#2b2117"; ctx.font = "10px system-ui"; ctx.textAlign = "center"; ctx.fillText("kaba", 315, 130); ctx.fillText("ince", 315, 92);
    ctx.fillStyle = "#c9962b"; ctx.fillRect(304, 117 - v * .2, 22, 2);                                           // ayar ibresi
    steel(222, 160, 36, 14, 3); ctx.fillStyle = "#1b1b1d"; rr(228, 174, 24, 10, 3); ctx.fill();                // çıkış
    const grain = 1 + (100 - v) / 25;                                                                           // iri → ince
    for (let i = 0; i < 90; i++) { const x = 240 + (Math.sin(i * 12.9) * 26), y = 204 - Math.abs(Math.cos(i * 7.1)) * (12 - Math.abs(x - 240) * .35); ctx.fillStyle = i % 2 ? "#3a2213" : "#5a3519"; ctx.beginPath(); ctx.arc(x, y, grain * (.5 + (i % 3) * .3), 0, Math.PI * 2); ctx.fill(); }
  }
  // ---- Dozlama: portafiltre sepeti, dolan kahve, gram
  function dose(g, target = 18) { bg(); shadow(240, H - 64, 110, 12);
    ctx.fillStyle = lg(140, 0, 340, 0, [[0, "#2a2a2d"], [.5, "#55575b"], [1, "#2a2a2d"]]); ctx.beginPath(); ctx.moveTo(150, 120); ctx.lineTo(330, 120); ctx.lineTo(310, 180); ctx.lineTo(170, 180); ctx.closePath(); ctx.fill(); // portafiltre
    ctx.fillStyle = lg(300, 0, 440, 0, [[0, "#2b1a10"], [.4, "#5a3a24"], [1, "#2b1a10"]]); rr(320, 135, 130, 26, 8); ctx.fill();     // sap
    const fill = Math.min(1, g / (target * 1.11)); const top = 176 - fill * 54;
    ctx.fillStyle = lg(0, top, 0, 180, [[0, "#6a4124"], [1, "#2d1a0e"]]); ctx.beginPath(); ctx.moveTo(172 + (1 - fill) * 4, top); ctx.lineTo(308 - (1 - fill) * 4, top); ctx.lineTo(306, 178); ctx.lineTo(174, 178); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.ellipse(240, top, 66, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (g > 20) { for (let i = 0; i < 25; i++) { ctx.fillStyle = "#4a2c17"; ctx.beginPath(); ctx.arc(150 + Math.sin(i * 9.3) * 90 + 90, H - 70 + Math.abs(Math.cos(i * 5)) * 10, 2, 0, Math.PI * 2); ctx.fill(); } }
    steel(40, 150, 90, 40, 6); ctx.fillStyle = "#101214"; rr(48, 156, 74, 22, 3); ctx.fill(); ctx.fillStyle = "#7df0a0"; ctx.font = "600 16px monospace"; ctx.textAlign = "right"; ctx.fillText(g.toFixed(1) + " g", 118, 173);
    gauge(40, 215, 400, g / 24, 17.5 / 24, 18.5 / 24, "hedef 18 g ±0,5");
  }
  // ---- Tamping: üstten sepet, tamper, güç halkası
  function tamp(v, z) { bg();                         // §4: daire büyüyüp küçülür; hedef iç içe renkli halkalar
    const R = u => 24 + u / 100 * 60;
    ctx.fillStyle = rg(240, 125, 10, 95, [[0, "#1a1a1c"], [1, "#4b4d51"]]); ctx.beginPath(); ctx.arc(240, 125, 92, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(236, 120, 5, 78, [[0, "#6a4124"], [1, "#2a170b"]]); ctx.beginPath(); ctx.arc(240, 125, 78, 0, Math.PI * 2); ctx.fill();
    const r = 24 + v * 60;
    ctx.fillStyle = rg(232, 118, 4, r, [[0, "#f0f1f2"], [.6, "#b6babf"], [1, "#6f7378"]]); ctx.beginPath(); ctx.arc(240, 125, r, 0, Math.PI * 2); ctx.fill();   // tamper tabanı
    ctx.fillStyle = lg(0, 90, 0, 160, [[0, "#3b2a20"], [1, "#1c130e"]]); rr(226, 95, 28, 60, 10); ctx.fill();                                                   // sap
    if (z) [[z.k, "rgba(233,196,106,.95)"], [z.g, "rgba(156,199,122,.98)"], [z.p, "#3f7d34"]].forEach(([h, col]) => {                                      // hedef halkaları
      const a = R(Math.max(0, z.t - h)), b = R(Math.min(100, z.t + h)); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, b - a); ctx.beginPath(); ctx.arc(240, 125, (a + b) / 2, 0, Math.PI * 2); ctx.stroke(); });
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(240, 125, r, 0, Math.PI * 2); ctx.stroke();                                         // tamper kenarı = ibre
    ctx.fillStyle = "#2b2117"; ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.fillText("siyah kenar koyu yeşil halkadayken dokun", 240, 235);
  }
  // ---- Ekstraksiyon: grup kafası, iki akış, fincan, krema
  function extract(t, g, targetG, run, tT, tTol) { bg(); shadow(240, H - 64, 60, 9);
    steel(130, 20, 220, 50, 10); steel(205, 70, 70, 22, 6); ctx.fillStyle = "#1a1a1d"; rr(215, 92, 50, 8, 3); ctx.fill();        // grup kafası + portafiltre
    ctx.fillStyle = lg(260, 0, 400, 0, [[0, "#2b1a10"], [.4, "#5a3a24"], [1, "#2b1a10"]]); rr(262, 88, 120, 14, 6); ctx.fill();
    // fincan
    ctx.fillStyle = lg(200, 0, 280, 0, [[0, "#d8d3cc"], [.3, "#fbfaf8"], [1, "#c9c3bb"]]); ctx.beginPath(); ctx.moveTo(200, 140); ctx.lineTo(280, 140); ctx.lineTo(270, 180); ctx.lineTo(210, 180); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#d8d3cc"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(284, 158, 12, -1.2, 1.2); ctx.stroke();
    const fill = Math.min(1, g / targetG); const lvl = 176 - fill * 32;
    if (fill > 0) { ctx.fillStyle = lg(0, lvl, 0, 178, [[0, "#5a3416"], [1, "#2a160a"]]); ctx.beginPath(); ctx.moveTo(210 - (176 - lvl) * .25 + 2, lvl); ctx.lineTo(270 + (176 - lvl) * .25 - 2, lvl); ctx.lineTo(270, 178); ctx.lineTo(210, 178); ctx.closePath(); ctx.fill();
      const over = t > tT + tTol, under = t < tT - tTol; ctx.fillStyle = over ? "#8a7458" : under ? "#d4a062" : "#c48a4a"; ctx.beginPath(); ctx.ellipse(240, lvl, 30 + (176 - lvl) * .25, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    if (run) { ctx.strokeStyle = lg(0, 100, 0, 176, [[0, "#6a3d1a"], [1, "#3a200d"]]); ctx.lineWidth = 2.2; [232, 248].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 100); ctx.quadraticCurveTo(x + (x < 240 ? 3 : -3), 140, 240 + (x - 240) * .5, lvl); ctx.stroke(); }); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 15px system-ui"; ctx.textAlign = "left"; ctx.fillText(t.toFixed(1).replace(".", ",") + " sn", 330, 150); ctx.fillText(Math.round(g) + " g", 330, 172);
    gauge(40, 215, 400, t / 45, (tT - tTol) / 45, (tT + tTol) / 45, `hedef ${targetG} g · ${tT - 2.5}–${tT + 2.5} sn`);
  }
  // ---- Süt köpürtme: çelik sütlük, buhar çubuğu, süt ve köpük seviyesi, buhar
  function milk(temp, tex, texTarget, air, hold) { bg(); shadow(240, H - 62, 60, 9);
    steel(150, 10, 60, 40, 6); ctx.fillStyle = lg(0, 0, 0, 1, [[0, "#cfd3d7"], [1, "#6f7378"]]); ctx.save(); ctx.translate(205, 45); ctx.rotate(.5); rr(-4, 0, 8, 110, 4); ctx.fill(); ctx.restore();   // buhar çubuğu
    // sütlük
    ctx.fillStyle = lg(190, 0, 300, 0, [[0, "#8e9296"], [.2, "#e9ecef"], [.5, "#aeb3b8"], [.8, "#f1f3f5"], [1, "#7c8085"]]); ctx.beginPath(); ctx.moveTo(185, 95); ctx.lineTo(295, 95); ctx.lineTo(282, 185); ctx.lineTo(198, 185); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8e9296"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(302, 135, 20, -1.3, 1.3); ctx.stroke();
    const foam = Math.min(28, tex * 14); const lvl = 112 - foam * .4;
    ctx.fillStyle = "#f4efe6"; ctx.beginPath(); ctx.ellipse(240, lvl + foam, 50, 9, 0, 0, Math.PI * 2); ctx.fill();            // süt yüzeyi
    ctx.fillStyle = lg(0, lvl, 0, lvl + foam, [[0, "#fffdf8"], [1, "#efe6d6"]]); ctx.beginPath(); ctx.ellipse(240, lvl, 50, 9, 0, Math.PI, 0); ctx.lineTo(290, lvl + foam); ctx.lineTo(190, lvl + foam); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.ellipse(240, lvl, 50, 9, 0, 0, Math.PI * 2); ctx.fill();   // köpük
    if (hold) { for (let i = 0; i < 14; i++) { const r = 3 + (i % 4); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(215 + Math.sin(i * 3.1) * 25, lvl + (air ? 2 : 10) + Math.cos(i * 2.3) * 5, air ? r : r * .5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(215 + i * 6 - Math.sin(i) * 10, 70 - i * 14, 10 + i * 4, 6 + i * 2, 0, 0, Math.PI * 2); ctx.fill(); } }   // buhar
    // termometre
    steel(380, 60, 24, 130, 10); const h = Math.max(0, Math.min(1, (temp - 20) / 65)); ctx.fillStyle = temp > 65 ? "#b5533c" : temp >= 60 ? "#6f7d4a" : "#c9962b"; rr(388, 184 - h * 118, 8, h * 118 + 2, 3); ctx.fill();
    ctx.fillStyle = "rgba(111,125,74,.5)"; ctx.fillRect(378, 184 - (40 / 65) * 118 - 9, 28, 9);
    ctx.fillStyle = "#2b2117"; ctx.font = "600 14px system-ui"; ctx.textAlign = "center"; ctx.fillText(Math.round(temp) + " °C", 392, 50);
    ctx.font = "11px system-ui"; ctx.fillText(air ? "hava veriliyor" : "girdap", 240, 212); gauge(40, 228, 180, tex / (texTarget * 2), .35, .65, "doku");
  }
  // ---- Servis yakın planı: fincan üstten, krema/köpük
  function heartShape(cx, cy, r, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx, cy + r * .9);
    ctx.bezierCurveTo(cx - r * 1.3, cy + r * .1, cx - r * .9, cy - r * .95, cx, cy - r * .35);
    ctx.bezierCurveTo(cx + r * .9, cy - r * .95, cx + r * 1.3, cy + r * .1, cx, cy + r * .9); ctx.fill();
  }
  // ---- Latte art (§5): üstten fincan, dökülen süt beyaz daire olarak büyür; sonra kesim çizgisi
  function art(fill, mark) { bg();
    ctx.fillStyle = rg(236, 120, 10, 96, [[0, "#ffffff"], [1, "#cfc8bd"]]); ctx.beginPath(); ctx.arc(240, 125, 94, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e7e1d7"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(352, 125, 20, -1.1, 1.1); ctx.stroke();       // kulp
    ctx.fillStyle = rg(232, 118, 5, 78, [[0, "#c58a4c"], [.7, "#9a6230"], [1, "#5d3516"]]); ctx.beginPath(); ctx.arc(240, 125, 78, 0, Math.PI * 2); ctx.fill();   // krema
    const f = Math.max(0, Math.min(100, fill)) / 100, r = 8 + f * 62;
    ctx.fillStyle = "rgba(205,160,110,.55)"; ctx.beginPath(); ctx.arc(240, 125, Math.min(78, r + 10), 0, Math.PI * 2); ctx.fill();   // karışan süt
    ctx.save(); ctx.beginPath(); ctx.arc(240, 125, 78, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = rg(236, 120, 2, r, [[0, "#fffdf8"], [1, "#f1e6d4"]]); ctx.beginPath(); ctx.arc(240, 125 + (1 - f) * 10, r * .62, 0, Math.PI * 2); ctx.fill();   // beyaz daire
    if (mark != null) {
      const x = 170 + mark * 140; ctx.fillStyle = "rgba(111,125,74,.25)"; ctx.fillRect(228, 40, 24, 170);
      ctx.strokeStyle = "#b5533c"; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(x, 42); ctx.lineTo(x, 208); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    if (fill > 0 && mark == null) { ctx.strokeStyle = "rgba(255,253,248,.9)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(240, 10); ctx.quadraticCurveTo(246, 60, 240, 125); ctx.stroke(); }   // süt akışı
    ctx.fillStyle = "#2b2117"; ctx.font = "600 15px system-ui"; ctx.textAlign = "left"; ctx.fillText("%" + Math.round(Math.min(100, fill)), 360, 60);
    gauge(40, 228, 400, Math.min(100, fill) / 100, .65, .80, mark == null ? "doluluk: %65–80'de bırak" : "kesim: çizgi yeşil bantta iken dokun");
  }
  // ---- §3 Su ısıtıcısı: kettle kupaya sıcak su döker (yandan görünüm)
  function water(v, pouring) { bg(); shadow(250, H - 64, 70, 10);
    const lvl = Math.min(100, v) / 100, top = 196 - lvl * 70;
    ctx.fillStyle = lg(200, 0, 300, 0, [[0, "#d8d3cc"], [.35, "#fbfaf8"], [1, "#c9c3bb"]]); rr(205, 118, 90, 82, 10); ctx.fill();          // kupa
    ctx.strokeStyle = "#d8d3cc"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(298, 158, 18, -1.2, 1.2); ctx.stroke();
    ctx.save(); rr(210, 122, 80, 74, 8); ctx.clip(); ctx.fillStyle = lg(0, top, 0, 196, [[0, "#8a5a36"], [1, "#3a200e"]]); ctx.fillRect(205, top, 90, 200); ctx.restore();   // americano
    if (v > 100) { ctx.fillStyle = "rgba(120,80,50,.6)"; ctx.fillRect(205, 190, 90, 12); }
    ctx.save(); ctx.translate(150, 70); ctx.rotate(pouring ? .55 : .15);                                                               // kettle
    ctx.fillStyle = lg(-50, 0, 50, 0, [[0, "#8e9296"], [.3, "#eef0f2"], [.6, "#b4b8bd"], [1, "#7c8085"]]); rr(-45, -30, 90, 70, 18); ctx.fill();
    ctx.fillStyle = "#2b2117"; rr(-30, -46, 60, 12, 6); ctx.fill(); ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(-50, 5, 20, 1.6, 4.6); ctx.stroke();
    ctx.fillStyle = "#aeb2b7"; ctx.beginPath(); ctx.moveTo(42, -5); ctx.lineTo(80, -22); ctx.lineTo(82, -14); ctx.lineTo(44, 12); ctx.fill(); ctx.restore();   // ağız
    if (pouring) { ctx.strokeStyle = "rgba(200,225,240,.85)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(214, 70); ctx.quadraticCurveTo(236, 90, 244, top); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(250 + i * 8, top - 14 - i * 9, 9 + i * 3, 5 + i, 0, 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 14px system-ui"; ctx.textAlign = "left"; ctx.fillText("su seviyesi %" + Math.round(Math.min(100, v)), 320, 120);
  }
  // ---- §3 Buhar kazanı: yuvarlak basınç kadranı, renkli yaylar, dönen ibre
  function pressure(v, z) { bg(); shadow(240, H - 64, 120, 12);
    steel(110, 40, 260, 150, 20);                                                                                                       // kazan gövdesi
    const cx = 240, cy = 150, R0 = 88, A = u => Math.PI + Math.max(0, Math.min(100, u)) / 100 * Math.PI;
    ctx.fillStyle = rg(cx, cy, 10, R0 + 8, [[0, "#fdfcf9"], [1, "#e4ded3"]]); ctx.beginPath(); ctx.arc(cx, cy, R0 + 8, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8d8f93"; ctx.lineWidth = 3; ctx.stroke();
    if (z) [[z.k, "#e9c46a"], [z.g, "#9cc77a"], [z.p, "#3f7d34"]].forEach(([h, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(cx, cy, R0 - 12, A(z.t - h), A(z.t + h)); ctx.stroke(); });
    ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 1.5; for (let i = 0; i <= 10; i++) { const a = A(i * 10); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R0 - 2), cy + Math.sin(a) * (R0 - 2)); ctx.lineTo(cx + Math.cos(a) * (R0 - 26 + (i % 5 ? 10 : 0)), cy + Math.sin(a) * (R0 - 26 + (i % 5 ? 10 : 0))); ctx.stroke(); }
    const a = A(v); ctx.strokeStyle = "#111"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R0 - 8), cy + Math.sin(a) * (R0 - 8)); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = "#2b2117"; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("BAR", cx, cy - 26); ctx.fillText("0", cx - R0 + 14, cy + 16); ctx.fillText("2", cx + R0 - 14, cy + 16);
    ctx.fillStyle = "#b5533c"; ctx.beginPath(); ctx.arc(330, 70, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#2b2117"; ctx.font = "11px system-ui"; ctx.fillText("vida", 330, 98);
    ctx.fillText("ibre koyu yeşil yaydayken vidayı kapat", cx, 235);
  }
  // ---- §3 Kakao serpici: üstten köpüklü fincan, serpici sağa-sola gider
  function cocoa(v, done) { bg();
    ctx.fillStyle = rg(236, 128, 10, 90, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 130, 86, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(232, 126, 5, 72, [[0, "#fbf6ee"], [.75, "#efe3cf"], [1, "#c99b66"]]); ctx.beginPath(); ctx.arc(240, 130, 72, 0, Math.PI * 2); ctx.fill();   // köpük
    const x = 90 + Math.max(0, Math.min(100, v)) * 3;
    if (done) { ctx.fillStyle = "rgba(92,52,24,.75)"; for (let i = 0; i < 160; i++) { const a = i * 2.4, r = Math.sqrt(i) * 3.6; const px = x + Math.cos(a) * r, py = 130 + Math.sin(a) * r * .9; if ((px - 240) ** 2 + (py - 130) ** 2 < 72 * 72) { ctx.beginPath(); ctx.arc(px, py, 1.4, 0, Math.PI * 2); ctx.fill(); } } }
    ctx.fillStyle = lg(x - 26, 0, x + 26, 0, [[0, "#8e9296"], [.4, "#eef0f2"], [1, "#7c8085"]]); rr(x - 26, 6, 52, 40, 10); ctx.fill();      // serpici
    ctx.fillStyle = "#5a3418"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x - 15 + i * 5, 44, 1.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "rgba(43,33,23,.35)"; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x, 210); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#2b2117"; ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.fillText("serpici fincanın ortasındayken SERP", 240, 235);
  }
  function cupTop(quality, milky, heart) { bg(); ctx.fillStyle = rg(236, 120, 10, 90, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 125, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = milky ? rg(232, 118, 5, 74, [[0, "#f7f1e6"], [.7, "#e9dcc6"], [1, "#b8824a"]]) : rg(232, 118, 5, 74, [[0, "#d9a86a"], [.6, "#b77a3c"], [1, "#6a3d1a"]]);
    ctx.beginPath(); ctx.arc(240, 125, 74, 0, Math.PI * 2); ctx.fill();
    if (!milky) { ctx.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(240 + Math.sin(i * 9.1) * 60, 125 + Math.cos(i * 4.7) * 60, 1 + (i % 3) * .6 * (quality / 100), 0, Math.PI * 2); ctx.fill(); } }
    if (heart) { heartShape(240, 122, 34, "#fffaf2"); heartShape(240, 122, 22, "rgba(233,214,190,.6)"); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 18px system-ui"; ctx.textAlign = "center"; ctx.fillText("Kalite " + quality, 240, 235);
  }
  return { init, setQuality, grind, dose, tamp, extract, milk, art, water, pressure, cocoa, cupTop };
})();
