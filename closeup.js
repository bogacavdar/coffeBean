// closeup.js – §11: gerçekçi tezgâh yakın planı. Her mini oyun için kodla çizilmiş foto-benzeri sahne.
window.CLOSEUP = (() => {
  const W = 480, H = 250;        // mantıksal çizim ızgarası (tüm fonksiyonlar bu koordinatları kullanır)
  let cv, ctx;
  // §11: panel artık sahnenin ortasında büyük bir kart — tuval CSS'te büyütülür, burada mantıksal ızgara ona ölçeklenir (daha büyük, daha net).
  function init(canvas) { cv = canvas; ctx = cv.getContext("2d"); size(); }
  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
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
    const fill = Math.min(1, g / 20); const top = 176 - fill * 54;
    ctx.fillStyle = lg(0, top, 0, 180, [[0, "#6a4124"], [1, "#2d1a0e"]]); ctx.beginPath(); ctx.moveTo(172 + (1 - fill) * 4, top); ctx.lineTo(308 - (1 - fill) * 4, top); ctx.lineTo(306, 178); ctx.lineTo(174, 178); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.ellipse(240, top, 66, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (g > 20) { for (let i = 0; i < 25; i++) { ctx.fillStyle = "#4a2c17"; ctx.beginPath(); ctx.arc(150 + Math.sin(i * 9.3) * 90 + 90, H - 70 + Math.abs(Math.cos(i * 5)) * 10, 2, 0, Math.PI * 2); ctx.fill(); } }
    steel(40, 150, 90, 40, 6); ctx.fillStyle = "#101214"; rr(48, 156, 74, 22, 3); ctx.fill(); ctx.fillStyle = "#7df0a0"; ctx.font = "600 16px monospace"; ctx.textAlign = "right"; ctx.fillText(g.toFixed(1) + " g", 118, 173);
    gauge(40, 215, 400, g / 24, 17.5 / 24, 18.5 / 24, "hedef 18 g ±0,5");
  }
  // ---- Tamping: üstten sepet, tamper, güç halkası
  function tamp(v, band) { bg();
    ctx.fillStyle = rg(240, 125, 10, 95, [[0, "#1a1a1c"], [1, "#4b4d51"]]); ctx.beginPath(); ctx.arc(240, 125, 92, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(236, 120, 5, 78, [[0, "#6a4124"], [1, "#2a170b"]]); ctx.beginPath(); ctx.arc(240, 125, 78, 0, Math.PI * 2); ctx.fill();
    const r = 24 + v * 60; ctx.strokeStyle = "rgba(111,125,74,.55)"; ctx.lineWidth = band * 160 + 4; ctx.beginPath(); ctx.arc(240, 125, 24 + .55 * 60, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = rg(232, 118, 4, r, [[0, "#f0f1f2"], [.6, "#b6babf"], [1, "#6f7378"]]); ctx.beginPath(); ctx.arc(240, 125, r, 0, Math.PI * 2); ctx.fill();   // tamper tabanı
    ctx.fillStyle = lg(0, 90, 0, 160, [[0, "#3b2a20"], [1, "#1c130e"]]); rr(226, 95, 28, 60, 10); ctx.fill();                                                   // sap
    shadow(240, 125, r + 10, r + 10, .15);
    ctx.fillStyle = "#2b2117"; ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.fillText("halka yeşil banda gelince bas", 240, 235);
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
  function cupTop(quality, milky) { bg(); ctx.fillStyle = rg(236, 120, 10, 90, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 125, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = milky ? rg(232, 118, 5, 74, [[0, "#f7f1e6"], [.7, "#e9dcc6"], [1, "#b8824a"]]) : rg(232, 118, 5, 74, [[0, "#d9a86a"], [.6, "#b77a3c"], [1, "#6a3d1a"]]);
    ctx.beginPath(); ctx.arc(240, 125, 74, 0, Math.PI * 2); ctx.fill();
    if (!milky) { ctx.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(240 + Math.sin(i * 9.1) * 60, 125 + Math.cos(i * 4.7) * 60, 1 + (i % 3) * .6 * (quality / 100), 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 18px system-ui"; ctx.textAlign = "center"; ctx.fillText("Kalite " + quality, 240, 235);
  }
  return { init, grind, dose, tamp, extract, milk, cupTop };
})();
