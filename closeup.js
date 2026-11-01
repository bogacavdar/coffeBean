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
  // ---- §4 hareket adımları: çalkala, karıştır, sürahiyi çevir, dök
  function shake(x, v) { bg();                                       // üstten köpüklü fincan, serpiciyi parmakla sağa-sola çalkala
    ctx.fillStyle = rg(236, 140, 10, 86, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 140, 84, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(232, 136, 5, 70, [[0, "#fbf6ee"], [.75, "#efe3cf"], [1, "#c99b66"]]); ctx.beginPath(); ctx.arc(240, 140, 70, 0, Math.PI * 2); ctx.fill();
    const n = Math.round(v * 2.6); ctx.fillStyle = "rgba(92,52,24,.72)";
    for (let i = 0; i < n; i++) { const a = i * 2.39996, r = Math.sqrt(i / 260) * 64; ctx.beginPath(); ctx.arc(240 + Math.cos(a) * r, 140 + Math.sin(a) * r * .92, 1.3 + (i % 3) * .4, 0, Math.PI * 2); ctx.fill(); }
    const sx = 120 + x / 100 * 240, tilt = (x - 50) / 220;
    ctx.save(); ctx.translate(sx, 30); ctx.rotate(tilt); ctx.fillStyle = lg(-26, 0, 26, 0, [[0, "#7c8085"], [.4, "#f2f4f6"], [1, "#6f7378"]]); rr(-26, -22, 52, 44, 11); ctx.fill();
    ctx.fillStyle = "#5a3418"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-15 + i * 5, 20, 1.6, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    ctx.fillStyle = "rgba(92,52,24,.55)"; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(sx - 12 + (i * 7) % 26, 58 + (i * 13 + v * 3) % 50, 1.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("sağa-sola kaydır · çalkala", 240, 240);
  }
  function stir(v, ang) { bg();                                      // üstten americano, kaşık daire çizer
    ctx.fillStyle = rg(236, 128, 10, 92, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 128, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(236, 124, 5, 76, [[0, "#8a5a36"], [.7, "#5a3418"], [1, "#2e180a"]]); ctx.beginPath(); ctx.arc(240, 128, 76, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(230,190,140,.35)"; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(240, 128, i * 15, ang + i, ang + i + 1.6 + v / 60); ctx.stroke(); }
    const ex = 240 + Math.cos(ang) * 44, ey = 128 + Math.sin(ang) * 44;
    ctx.strokeStyle = lg(ex - 10, 0, ex + 10, 0, [[0, "#8e9296"], [.5, "#f4f5f6"], [1, "#8e9296"]]); ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 120, ey - 90); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = "#c9ccd0"; ctx.beginPath(); ctx.ellipse(ex, ey, 11, 7, ang, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("parmağınla daire çiz · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3", 240, 240);
  }
  function swirl(v, ang, mk) { bg();                                  // üstten süt sürahisi, süt girdabı
    const ox = 240 + Math.cos(ang) * 10, oy = 126 + Math.sin(ang) * 6;
    shadow(ox, oy + 8, 100, 30, .25);
    ctx.fillStyle = lg(ox - 90, 0, ox + 90, 0, [[0, "#8e9296"], [.3, "#f2f4f6"], [.65, "#b4b8bd"], [1, "#7c8085"]]); ctx.beginPath(); ctx.arc(ox, oy, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#aeb2b7"; ctx.beginPath(); ctx.moveTo(ox + 80, oy - 20); ctx.lineTo(ox + 112, oy); ctx.lineTo(ox + 80, oy + 20); ctx.fill();
    const k = v / 100; ctx.fillStyle = rg(ox, oy, 5, 74, [[0, `rgb(${250 - k * 4},${244 - k * 6},${232 - k * 8})`], [1, k > .6 ? "#efe5d4" : "#f6f1e8"]]); ctx.beginPath(); ctx.arc(ox, oy, 74, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(200,180,150,${.5 - k * .35})`; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(ox, oy, 12 + i * 10, ang * 1.5 + i, ang * 1.5 + i + 2.2); ctx.stroke(); }
    if (k < .7) { ctx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 30 * (1 - k); i++) { ctx.beginPath(); ctx.arc(ox + Math.cos(i * 2.1 + ang) * (20 + i * 1.6), oy + Math.sin(i * 2.1 + ang) * (20 + i * 1.6), 2 + (i % 3), 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("daire çizerek çevir · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3 · köpük birleşiyor", 240, 240);
  }
  function pour(v, pouring, mk) { bg(); shadow(250, H - 64, 64, 10);  // yandan: sürahi fincana süt döker
    const lvl = Math.min(100, v) / 100, top = 196 - lvl * 52;
    ctx.fillStyle = lg(210, 0, 300, 0, [[0, "#d8d3cc"], [.35, "#fbfaf8"], [1, "#c9c3bb"]]); rr(212, 140, 80, 60, 12); ctx.fill();
    ctx.strokeStyle = "#d8d3cc"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(295, 168, 14, -1.2, 1.2); ctx.stroke();
    ctx.save(); rr(216, 144, 72, 52, 10); ctx.clip(); ctx.fillStyle = lg(0, 144, 0, 196, [[0, "#6a3d1a"], [1, "#2e180a"]]); ctx.fillRect(212, 160, 80, 40);
    ctx.fillStyle = lg(0, top, 0, 196, [[0, "#f7f0e4"], [1, "#d9b88e"]]); ctx.fillRect(212, Math.max(144, top), 80, 60 * lvl); ctx.restore();
    ctx.save(); ctx.translate(165, 82); ctx.rotate(pouring ? .7 : .2);
    ctx.fillStyle = lg(-40, 0, 40, 0, [[0, "#8e9296"], [.35, "#eef0f2"], [1, "#7c8085"]]); ctx.beginPath(); ctx.moveTo(-34, -40); ctx.lineTo(34, -40); ctx.lineTo(40, 40); ctx.lineTo(-40, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#aeb2b7"; ctx.beginPath(); ctx.moveTo(34, -40); ctx.lineTo(56, -48); ctx.lineTo(38, -28); ctx.fill(); ctx.strokeStyle = "#7c8085"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-44, 0, 18, 1.7, 4.6); ctx.stroke(); ctx.restore();
    if (pouring && v < 100) { ctx.strokeStyle = "rgba(255,252,245,.95)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(214, 64); ctx.quadraticCurveTo(240, 90, 250, top); ctx.stroke(); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("basılı tut · sütü dök · %" + Math.round(Math.min(100, v)), 240, 240);
  }
  // ---- §3 espresso dışı kahveler: renkli hedef çubuk yerine gerçek göstergeler (terazi, köpük çizgisi, saat, seviye)
  const ZC = [["k", "rgba(233,196,106,.95)"], ["g", "rgba(156,199,122,.98)"], ["p", "#3f7d34"]];
  function arcZones(cx, cy, R, w, a0, a1, Z) { if (!Z) return; const A = u => a0 + Math.max(0, Math.min(100, u)) / 100 * (a1 - a0);
    ZC.forEach(([k, col]) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, R, A(Z.t - Z[k]), A(Z.t + Z[k])); ctx.stroke(); }); }
  function vZones(x, yTop, yBot, w, Z) { if (!Z) return; const Y = u => yBot - Math.max(0, Math.min(100, u)) / 100 * (yBot - yTop);
    ZC.forEach(([k, col]) => { ctx.fillStyle = col; const a = Y(Z.t + Z[k]), b = Y(Z.t - Z[k]); ctx.fillRect(x, a, w, Math.max(1.5, b - a)); }); }
  function scale(cx, cy, val, Z, unit, max) {                                     // dijital terazi + kadran
    ctx.fillStyle = lg(cx - 70, 0, cx + 70, 0, [[0, "#2b2b30"], [.5, "#4a4a50"], [1, "#2b2b30"]]); rr(cx - 70, cy, 140, 26, 8); ctx.fill();
    ctx.fillStyle = "#9cf0a8"; ctx.font = "700 15px monospace"; ctx.textAlign = "center"; ctx.fillText((val * max / 100).toFixed(1) + " " + unit, cx, cy + 18);
    const R = 34, gx = cx + 110, gy = cy + 10; ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.arc(gx, gy, R + 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8d8f93"; ctx.lineWidth = 2; ctx.stroke();
    arcZones(gx, gy, R - 4, 9, Math.PI * .75, Math.PI * 2.25, Z);
    const a = Math.PI * .75 + Math.min(100, val) / 100 * Math.PI * 1.5; ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * (R - 6), gy + Math.sin(a) * (R - 6)); ctx.stroke(); ctx.lineCap = "butt"; }
  function cezve(x, y, fill, foam) {                                              // yandan bakır cezve
    ctx.fillStyle = lg(x - 50, 0, x + 50, 0, [[0, "#7a3a1c"], [.35, "#e19a5a"], [.6, "#b8642e"], [1, "#6a3014"]]);
    ctx.beginPath(); ctx.moveTo(x - 46, y - 70); ctx.lineTo(x + 46, y - 70); ctx.lineTo(x + 54, y); ctx.lineTo(x - 54, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a3418"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + 48, y - 50); ctx.lineTo(x + 130, y - 78); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = "#c9a14f"; ctx.fillRect(x - 47, y - 74, 94, 5);
    if (foam > 0) { ctx.fillStyle = "#c08a55"; const h = foam; ctx.beginPath(); ctx.ellipse(x, y - 70, 46 + h * .1, 6 + h * .5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "rgba(255,235,200,.35)"; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(x - 34 + i * 10, y - 72 - (i % 3) * h * .15, 2.5, 0, Math.PI * 2); ctx.fill(); } }
  }
  function tkdose(f, Z) { bg(); shadow(200, H - 64, 80, 10);
    ctx.fillStyle = lg(150, 0, 250, 0, [[0, "#7a3a1c"], [.4, "#e19a5a"], [1, "#6a3014"]]); ctx.beginPath(); ctx.moveTo(158, 100); ctx.lineTo(242, 100); ctx.lineTo(250, 170); ctx.lineTo(150, 170); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3a200e"; const h = Math.min(1, f) * 22; ctx.fillRect(160, 168 - h, 80, h);
    ctx.save(); ctx.translate(250, 70); ctx.rotate(.5); ctx.fillStyle = "#c9ccd0"; rr(-6, -40, 12, 50, 5); ctx.fill(); ctx.fillStyle = "#3a200e"; ctx.beginPath(); ctx.ellipse(0, 12, 14, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    scale(200, 176, f * 100, Z, "g", 10);
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("kadrandaki ibre koyu yeşildeyken bırak · 7 g", 240, 240);
  }
  function cezveStir(v, ang) { bg();
    ctx.fillStyle = "#3a2a20"; ctx.beginPath(); ctx.arc(240, 125, 96, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(240, 125, 10, 88, [[0, "#e19a5a"], [1, "#7a3a1c"]]); ctx.beginPath(); ctx.arc(240, 125, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(240, 125, 5, 76, [[0, "#5a3418"], [1, "#2a170b"]]); ctx.beginPath(); ctx.arc(240, 125, 76, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(210,170,120,${.25 + v / 300})`; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(240, 125, i * 15, ang + i, ang + i + 1.4); ctx.stroke(); }
    const ex = 240 + Math.cos(ang) * 44, ey = 125 + Math.sin(ang) * 44; ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 110, ey - 95); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("kahve, su ve şeker karışsın · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3", 240, 240);
  }
  function cezveFoam(v, run, Z) { bg();
    ctx.fillStyle = "#2b2b30"; rr(130, 196, 220, 14, 4); ctx.fill();                                                                   // ocak
    if (run) for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(80,140,255,${.5 + .3 * Math.sin(Date.now() / 90 + i)})`; ctx.beginPath(); ctx.ellipse(196 + i * 11, 194, 3, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    cezve(240, 192, 1, Math.min(100, v) * .55);
    vZones(312, 70, 192, 12, Z); ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.strokeRect(312, 70, 12, 122);                              // köpük ölçeği
    const yy = 192 - Math.min(100, v) / 100 * 122; ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(306, yy); ctx.lineTo(312, yy - 5); ctx.lineTo(312, yy + 5); ctx.fill();
    if (v > 95) { ctx.fillStyle = "rgba(160,110,60,.8)"; ctx.beginPath(); ctx.ellipse(200, 196, 30, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(run ? "köpük kabarıyor… taşmadan, koyu yeşilde ocaktan al" : "cezveyi ocağa koy", 240, 240);
  }
  function press(v, stage, run, Z) { bg(); shadow(240, H - 64, 70, 10);
    const x = 200, top = 60, bot = 196;
    if (stage === "steep") { const cx = 360, cy = 110, R = 52; ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8d8f93"; ctx.lineWidth = 3; ctx.stroke();   // kum saati / zamanlayıcı
      arcZones(cx, cy, R - 6, 12, -Math.PI / 2, Math.PI * 1.5, Z); const a = -Math.PI / 2 + Math.min(100, v) / 100 * Math.PI * 2;
      ctx.strokeStyle = "#111"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10)); ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = "#2b2117"; ctx.font = "700 14px monospace"; ctx.textAlign = "center"; const sec = Math.round(v / 100 * 360); ctx.fillText(Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"), cx, cy + R + 26); }
    const lvl = stage === "dose" ? Math.min(1, v / 100) * .18 : stage === "water" ? .18 + Math.min(100, v) / 100 * .7 : .88;
    ctx.fillStyle = "rgba(220,235,240,.45)"; rr(x - 50, top, 100, bot - top, 6); ctx.fill(); ctx.strokeStyle = "#8e9296"; ctx.lineWidth = 3; ctx.strokeRect(x - 50, top, 100, bot - top);
    const brew = stage === "steep" ? Math.min(1, v / 66) : stage === "plunge" ? 1 : 0, y0 = bot - lvl * (bot - top);
    ctx.fillStyle = stage === "dose" ? "#5a3418" : `rgb(${Math.round(150 - brew * 90)},${Math.round(110 - brew * 70)},${Math.round(70 - brew * 45)})`; ctx.fillRect(x - 48, y0, 96, bot - y0 - 2);
    if (stage !== "dose") { ctx.fillStyle = "#5a3418"; ctx.fillRect(x - 48, stage === "plunge" ? bot - 18 : y0, 96, stage === "plunge" ? 16 : 12); }
    if (stage === "water") { vZones(x + 56, top, bot, 10, Z); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.strokeRect(x + 56, top, 10, bot - top); if (run) { ctx.strokeStyle = "rgba(200,225,240,.9)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 20, 20); ctx.quadraticCurveTo(x - 5, 40, x, y0); ctx.stroke(); } }
    if (stage === "dose") scale(x + 150, 176, v, Z, "g", 40);
    const py = stage === "plunge" ? top + 6 + Math.min(100, v) / 100 * (bot - top - 30) : top - 10;               // piston
    ctx.fillStyle = "#c9ccd0"; ctx.fillRect(x - 3, py - 60, 6, 60); ctx.fillStyle = "#2b2b30"; rr(x - 14, py - 72, 28, 14, 5); ctx.fill(); ctx.fillStyle = "#9ea2a7"; ctx.fillRect(x - 48, py, 96, 6);
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center";
    ctx.fillText({ dose: "kaba çekilmiş kahve · kadran koyu yeşilde bırak", water: "93 °C su · seviye koyu yeşil çizgide bırak", steep: "4 dakika demle · saat koyu yeşildeyken DURDUR", plunge: "pistonu yavaşça sonuna kadar indir · %" + Math.round(Math.min(100, v)) }[stage], 240, 240);
  }
  function v60(v, stage, extra, Z) { bg(); shadow(240, H - 64, 70, 10);
    ctx.fillStyle = "rgba(220,235,240,.5)"; ctx.beginPath(); ctx.moveTo(185, 140); ctx.lineTo(295, 140); ctx.lineTo(300, 200); ctx.lineTo(180, 200); ctx.closePath(); ctx.fill();   // cam sürahi
    const out = stage === "pour" ? Math.min(1, v / 100) : stage === "bloom" ? .05 : 0; ctx.fillStyle = "#5a3418"; ctx.fillRect(182, 198 - out * 50, 116, out * 50);
    ctx.fillStyle = lg(170, 0, 310, 0, [[0, "#e6e1d8"], [.5, "#ffffff"], [1, "#d6d0c4"]]); ctx.beginPath(); ctx.moveTo(165, 60); ctx.lineTo(315, 60); ctx.lineTo(255, 138); ctx.lineTo(225, 138); ctx.closePath(); ctx.fill();   // dripper
    ctx.fillStyle = "#f6efe0"; ctx.beginPath(); ctx.moveTo(175, 64); ctx.lineTo(305, 64); ctx.lineTo(252, 132); ctx.lineTo(228, 132); ctx.closePath(); ctx.fill();   // kâğıt filtre
    const g = stage === "dose" ? Math.min(1, v / 100) : 1; if (g > 0) { ctx.fillStyle = stage === "dose" ? "#7a4a28" : "#4a2a14"; ctx.beginPath(); ctx.moveTo(240 - 40 * g, 132 - 40 * g); ctx.lineTo(240 + 40 * g, 132 - 40 * g); ctx.lineTo(250, 132); ctx.lineTo(230, 132); ctx.closePath(); ctx.fill(); }
    if (stage === "bloom") { ctx.fillStyle = "rgba(200,150,90,.6)"; for (let i = 0; i < Math.min(100, v) / 8; i++) { ctx.beginPath(); ctx.arc(215 + (i * 13) % 50, 100 + (i * 7) % 18, 3 + (i % 3), 0, Math.PI * 2); ctx.fill(); } }
    if ((stage === "bloom" && extra) || stage === "pour") { const a = stage === "pour" ? extra : 0, kx = 240 + Math.cos(a) * 28, ky = 98 + Math.sin(a) * 8;
      ctx.strokeStyle = "rgba(200,225,240,.95)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(kx - 40, 22); ctx.quadraticCurveTo(kx - 10, 40, kx, ky); ctx.stroke();
      ctx.fillStyle = "#b4b8bd"; ctx.save(); ctx.translate(kx - 70, 18); ctx.rotate(.5); rr(-26, -16, 52, 34, 8); ctx.fill(); ctx.restore(); }
    if (stage === "dose") scale(390, 176, v, Z, "g", 30);
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center";
    ctx.fillText({ dose: "orta-ince çekim · kadran koyu yeşilde bırak", bloom: "az suyla ıslat, kahve kabarsın (bloom) · %" + Math.round(Math.min(100, v)), pour: "merkezden dışa daire çizerek dök · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3" }[stage], 240, 240);
  }
  function cupTop(quality, milky, heart) { bg(); ctx.fillStyle = rg(236, 120, 10, 90, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 125, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = milky ? rg(232, 118, 5, 74, [[0, "#f7f1e6"], [.7, "#e9dcc6"], [1, "#b8824a"]]) : rg(232, 118, 5, 74, [[0, "#d9a86a"], [.6, "#b77a3c"], [1, "#6a3d1a"]]);
    ctx.beginPath(); ctx.arc(240, 125, 74, 0, Math.PI * 2); ctx.fill();
    if (!milky) { ctx.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(240 + Math.sin(i * 9.1) * 60, 125 + Math.cos(i * 4.7) * 60, 1 + (i % 3) * .6 * (quality / 100), 0, Math.PI * 2); ctx.fill(); } }
    if (heart) { heartShape(240, 122, 34, "#fffaf2"); heartShape(240, 122, 22, "rgba(233,214,190,.6)"); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 18px system-ui"; ctx.textAlign = "center"; ctx.fillText("Kalite " + quality, 240, 235);
  }
  return { init, setQuality, grind, dose, tamp, extract, milk, art, water, pressure, cocoa, shake, stir, swirl, pour, tkdose, cezveStir, cezveFoam, press, v60, cupTop };
})();
