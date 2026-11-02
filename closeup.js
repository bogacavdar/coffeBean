// closeup.js – §11: gerçekçi tezgâh yakın planı. Her mini oyun için kodla çizilmiş foto-benzeri sahne.
window.CLOSEUP = (() => {
  const W = 480, H = 250;        // mantıksal çizim ızgarası (tüm fonksiyonlar bu koordinatları kullanır)
  let cv, ctx;
  // §11: panel artık sahnenin ortasında büyük bir kart — tuval CSS'te büyütülür, burada mantıksal ızgara ona ölçeklenir (daha büyük, daha net).
  let maxDpr = 2, gpuOn = true;
  function setQuality(q, gpu) { maxDpr = q === "high" ? 2 : q === "medium" ? 1.25 : 1; if (gpu != null) gpuOn = gpu; }   // §12
  function init(canvas) { if (!canvas || !canvas.getContext) return; cv = canvas; ctx = harden(cv.getContext("2d", gpuOn ? {} : { willReadFrequently: true })); if (ctx) size(); }
  // v0.24 sağlamlık: NaN / negatif yarıçap çizimi patlatmasın (arc/ellipse/arcTo negatif yarıçapta hata fırlatır)
  let small = false;                                                               // v0.30: telefonda dar tuval – okunmayan küçük yazılar gizlenir, okunması gerekenler büyür
  function harden(c) { if (!c || c.__cuSafe) return c; c.__cuSafe = 1; const A = c.arc, E = c.ellipse, AT = c.arcTo, R = v => Math.max(0, v) || 0, FT = c.fillText;
    c.fillText = function (t, x, y, mw) { if (!small) return FT.call(this, t, x, y, mw); const m = /(\d+(?:\.\d+)?)px/.exec(this.font), px = m ? +m[1] : 12;
      if (px < 12.5 || (px <= 13 && y >= 228)) return;                              // küçük etiketler ve alttaki talimat satırı (düğmenin üstünde zaten yazıyor)
      if (px <= 18 && !/monospace/.test(this.font)) { const f = this.font; this.font = f.replace(m[0], Math.round(px * 1.35) + "px"); FT.call(this, t, x, y, mw); this.font = f; return; }
      return FT.call(this, t, x, y, mw); };
    c.arc = function (x, y, r, a, b, cc) { return A.call(this, x, y, R(r), a, b, !!cc); };
    if (E) c.ellipse = function (x, y, rx, ry, rot, a, b, cc) { return E.call(this, x, y, R(rx), R(ry), rot, a, b, !!cc); };
    if (AT) c.arcTo = function (x1, y1, x2, y2, r) { return AT.call(this, x1, y1, x2, y2, R(r)); };
    return c; }
  const num = (x, d = 0) => { const n = typeof x === "number" ? x : (x == null || x === "" || typeof x === "object" ? NaN : +x); return Number.isFinite(n) ? n : d; };
  const clamp = (x, lo, hi, d) => Math.max(lo, Math.min(hi, num(x, d == null ? lo : d)));
  const obj = o => (o && typeof o === "object") ? o : {};
  function size() {
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    const cw = cv.clientWidth || W, ch = cv.clientHeight || H; small = cw < 420;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    ctx.setTransform(dpr * cw / W, 0, 0, dpr * ch / H, 0, 0);
  }
  const lg = (x0, y0, x1, y1, stops) => { if (![x0, y0, x1, y1].every(Number.isFinite)) { x0 = y0 = x1 = 0; y1 = 1; }   // NaN/sonsuz değer createLinearGradient'i patlatmasın
    const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rg = (x, y, r0, r1, stops) => { if (![x, y, r0, r1].every(Number.isFinite)) { x = y = r0 = 0; r1 = 1; } r0 = Math.max(0, r0); r1 = Math.max(0, r1); const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  function rr(x, y, w, h, r) { r = Math.max(0, num(r)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
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
  // v0.29 küçük hedef göstergesi: alttaki büyük çubuğun renkli bölgelerinin (sarı/açık yeşil/koyu yeşil) aynısı + ibre.
  // Z = { t: hedef, p, g, k: bölge yarı genişlikleri } (0–100 çubuk birimi; §4 eşit zorluk: ibre hızıyla orantılı). opt: { x, y, w, label }
  function zmeter(v, Z, opt) { if (small) return; const o = obj(opt), z = obj(Z), x0 = num(o.x, 330), y0 = num(o.y, 182), bw = num(o.w, 120), val = clamp(v, 0, 100, 0), X = u => x0 + Math.max(0, Math.min(100, num(u))) / 100 * bw;
    ctx.fillStyle = lg(x0, 0, x0 + bw, 0, [[0, "#2b2b30"], [.5, "#4a4a50"], [1, "#2b2b30"]]); rr(x0, y0, bw, 22, 6); ctx.fill();
    ctx.fillStyle = "#9cf0a8"; ctx.font = "700 12px monospace"; ctx.textAlign = "center"; ctx.fillText(String(o.label || "hedef"), x0 + bw / 2, y0 + 15);
    const by = y0 + 28; ctx.fillStyle = "rgba(255,255,255,.7)"; rr(x0, by, bw, 8, 3); ctx.fill();
    const t = num(z.t, NaN); if (Number.isFinite(t)) [[num(z.k), "#e9c46a"], [num(z.g), "#9cc77a"], [num(z.p), "#3f7d34"]].forEach(([h, c]) => { if (h > 0) { const a = X(t - h), b = X(t + h); ctx.fillStyle = c; ctx.fillRect(a, by, Math.max(1.5, b - a), 8); } });
    const d = Number.isFinite(t) ? Math.abs(val - t) : 999, col = d <= num(z.p) ? "#1f4d18" : d <= num(z.k) ? "#2b2117" : "#b5533c";
    ctx.fillStyle = col; ctx.fillRect(X(val) - 1.5, by - 4, 3, 16); }
  // ---- Öğütme: öğütücü, hazne, çıkan kahvenin tane iriliği
  function grind(v) { v = num(v); bg(); shadow(240, H - 66, 90, 10);
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
  function dose(g, target = 18) { g = num(g); target = num(target, 18) || 18; bg(); shadow(240, H - 64, 110, 12);
    ctx.fillStyle = lg(140, 0, 340, 0, [[0, "#2a2a2d"], [.5, "#55575b"], [1, "#2a2a2d"]]); ctx.beginPath(); ctx.moveTo(150, 120); ctx.lineTo(330, 120); ctx.lineTo(310, 180); ctx.lineTo(170, 180); ctx.closePath(); ctx.fill(); // portafiltre
    ctx.fillStyle = lg(300, 0, 440, 0, [[0, "#2b1a10"], [.4, "#5a3a24"], [1, "#2b1a10"]]); rr(320, 135, 130, 26, 8); ctx.fill();     // sap
    const fill = Math.min(1, g / (target * 1.11)); const top = 176 - fill * 54;
    ctx.fillStyle = lg(0, top, 0, 180, [[0, "#6a4124"], [1, "#2d1a0e"]]); ctx.beginPath(); ctx.moveTo(172 + (1 - fill) * 4, top); ctx.lineTo(308 - (1 - fill) * 4, top); ctx.lineTo(306, 178); ctx.lineTo(174, 178); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.ellipse(240, top, 66, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (g > 20) { for (let i = 0; i < 25; i++) { ctx.fillStyle = "#4a2c17"; ctx.beginPath(); ctx.arc(150 + Math.sin(i * 9.3) * 90 + 90, H - 70 + Math.abs(Math.cos(i * 5)) * 10, 2, 0, Math.PI * 2); ctx.fill(); } }
    steel(40, 150, 90, 40, 6); ctx.fillStyle = "#101214"; rr(48, 156, 74, 22, 3); ctx.fill(); ctx.fillStyle = "#7df0a0"; ctx.font = "600 16px monospace"; ctx.textAlign = "right"; ctx.fillText(g.toFixed(1).replace(".", ",") + " g", 118, 173);
    gauge(40, 215, 400, g / 24, 17.5 / 24, 18.5 / 24, "hedef 18 g ±0,5");
  }
  // ---- Tamping: üstten sepet, tamper, güç halkası
  function tamp(v, z) { v = num(v); z = z && typeof z === "object" ? z : null; bg();                         // §4: daire büyüyüp küçülür; hedef iç içe renkli halkalar
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
  function extract(t, g, targetG, run, tT, tTol, opt) { t = num(t); g = num(g); targetG = num(targetG, 36) || 36; tT = num(tT, 28); tTol = num(tTol, 2.5);
    const o = opt && typeof opt === "object" ? opt : null, pre = !!(o && run && t < 6);      // v0.24: ön ıslatma — ilk 6 sn akış yok
    bg(); shadow(240, H - 64, 60, 9);
    steel(130, 20, 220, 50, 10); steel(205, 70, 70, 22, 6); ctx.fillStyle = "#1a1a1d"; rr(215, 92, 50, 8, 3); ctx.fill();        // grup kafası + portafiltre
    ctx.fillStyle = lg(260, 0, 400, 0, [[0, "#2b1a10"], [.4, "#5a3a24"], [1, "#2b1a10"]]); rr(262, 88, 120, 14, 6); ctx.fill();
    // fincan
    ctx.fillStyle = lg(200, 0, 280, 0, [[0, "#d8d3cc"], [.3, "#fbfaf8"], [1, "#c9c3bb"]]); ctx.beginPath(); ctx.moveTo(200, 140); ctx.lineTo(280, 140); ctx.lineTo(270, 180); ctx.lineTo(210, 180); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#d8d3cc"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(284, 158, 12, -1.2, 1.2); ctx.stroke();
    const fill = Math.min(1, g / targetG); const lvl = 176 - fill * 32;
    if (fill > 0) { ctx.fillStyle = lg(0, lvl, 0, 178, [[0, "#5a3416"], [1, "#2a160a"]]); ctx.beginPath(); ctx.moveTo(210 - (176 - lvl) * .25 + 2, lvl); ctx.lineTo(270 + (176 - lvl) * .25 - 2, lvl); ctx.lineTo(270, 178); ctx.lineTo(210, 178); ctx.closePath(); ctx.fill();
      const over = t > tT + tTol, under = t < tT - tTol; ctx.fillStyle = over ? "#8a7458" : under ? "#d4a062" : "#c48a4a"; ctx.beginPath(); ctx.ellipse(240, lvl, 30 + (176 - lvl) * .25, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    if (pre) { ctx.fillStyle = "#5a3416"; [232, 248].forEach((x, i) => { const d = (Date.now() / 400 + i * .5) % 1; ctx.beginPath(); ctx.ellipse(x, 101 + d * 3, 1.6 + d, 2 + d * 1.5, 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = "#2b2117"; ctx.font = "italic 600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("ön ıslatma…", 240, 124); }
    const bl = Math.max(0, Math.min(1, (t - (tT - 4)) / 9)), mix = (a, b) => "rgb(" + a.map((x, i) => Math.round(x + (b[i] - x) * bl)).join(",") + ")";   // v0.40 §14: hedefe yaklaştıkça akış sarışınlaşır
    if (run && !pre) { ctx.strokeStyle = lg(0, 100, 0, 176, [[0, mix([106, 61, 26], [214, 166, 98])], [1, mix([58, 32, 13], [176, 128, 70])]]); ctx.lineWidth = 2.2; [232, 248].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 100); ctx.quadraticCurveTo(x + (x < 240 ? 3 : -3), 140, 240 + (x - 240) * .5, lvl); ctx.stroke(); }); }
    const hideT = !!(o && o.hideTime);                                              // v0.40 §14 usta görünümü: saniye yazmaz, renge bakılır
    ctx.fillStyle = "#2b2117"; ctx.font = "600 15px system-ui"; ctx.textAlign = "left"; if (small) { ctx.font = "700 24px system-ui"; if (!hideT) ctx.fillText(t.toFixed(1).replace(".", ",") + " sn", 318, 150); ctx.fillText(Math.round(g) + " / " + targetG + " g", 318, 184); return; }   // v0.30 telefonda büyük okuma, mini gösterge yok
    if (!hideT) ctx.fillText(t.toFixed(1).replace(".", ",") + " sn", 330, 150); ctx.fillText(Math.round(g) + " g", 330, 172);
    if (!hideT) gauge(40, 215, 400, t / 45, (tT - tTol) / 45, (tT + tTol) / 45, `hedef ${targetG} g · ${tT - 2.5}–${tT + 2.5} sn`);
    if (o) { const fm = u => String(Math.round(u * 10) / 10).replace(".", ","), x0 = 330, y0 = 182, bw = 120, mx = targetG * 1.5, X = u => x0 + Math.max(0, Math.min(1, u / mx)) * bw;   // terazi: hedef verim
      ctx.fillStyle = lg(x0, 0, x0 + bw, 0, [[0, "#2b2b30"], [.5, "#4a4a50"], [1, "#2b2b30"]]); rr(x0, y0, bw, 22, 6); ctx.fill();
      ctx.fillStyle = "#9cf0a8"; ctx.font = "700 12px monospace"; ctx.textAlign = "center"; ctx.fillText("hedef " + fm(targetG) + " g", x0 + bw / 2, y0 + 15);
      if (o.Z) zmeter(t / 45 * 100, o.Z, { x: x0, y: y0, w: bw, label: "hedef " + fm(targetG) + " g" });   // v0.29: büyük çubuktaki renkli bölgelerin aynısı (§4 eşit zorluk)
      else { const by = y0 + 28; ctx.fillStyle = "rgba(255,255,255,.65)"; rr(x0, by, bw, 6, 3); ctx.fill();
      ctx.fillStyle = "rgba(63,125,52,.9)"; ctx.fillRect(X(targetG - 2), by, Math.max(2, X(targetG + 2) - X(targetG - 2)), 6);
      ctx.fillStyle = Math.abs(g - targetG) <= 2 ? "#3f7d34" : g > targetG + 2 ? "#b5533c" : "#2b2117"; ctx.fillRect(X(g) - 1.5, by - 3, 3, 12); }
      if (!hideT && Array.isArray(o.tWin) && o.tWin.length > 1) { const lo = num(o.tWin[0]), hi = num(o.tWin[1]); ctx.fillStyle = "#2b2117"; ctx.font = "11px system-ui"; ctx.textAlign = "left"; ctx.fillText("süre " + fm(lo) + "–" + fm(hi) + " sn", x0, 128); } }
  }
  // ---- Süt köpürtme: çelik sütlük, buhar çubuğu, süt ve köpük seviyesi, buhar
  const MILKC = { milk: ["#f4efe6", "#fffdf8", "#efe6d6"], chocolate: ["#6b3f22", "#a0704a", "#7a4a2a"], salep: ["#f3ead2", "#fffbef", "#ebdfc0"], chai: ["#d6b48a", "#efdcbc", "#d3b088"] };
  function milk(temp, tex, texTarget, air, hold, opt) { temp = num(temp, 20); tex = num(tex); texTarget = num(texTarget, 1) || 1; const MC = MILKC[obj(opt).liquid] || MILKC.milk; bg(); shadow(240, H - 62, 60, 9);
    steel(150, 10, 60, 40, 6); ctx.fillStyle = lg(0, 0, 0, 1, [[0, "#cfd3d7"], [1, "#6f7378"]]); ctx.save(); ctx.translate(205, 45); ctx.rotate(.5); rr(-4, 0, 8, 110, 4); ctx.fill(); ctx.restore();   // buhar çubuğu
    // sütlük
    ctx.fillStyle = lg(190, 0, 300, 0, [[0, "#8e9296"], [.2, "#e9ecef"], [.5, "#aeb3b8"], [.8, "#f1f3f5"], [1, "#7c8085"]]); ctx.beginPath(); ctx.moveTo(185, 95); ctx.lineTo(295, 95); ctx.lineTo(282, 185); ctx.lineTo(198, 185); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8e9296"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(302, 135, 20, -1.3, 1.3); ctx.stroke();
    const foam = Math.min(28, tex * 14); const lvl = 112 - foam * .4;
    ctx.fillStyle = MC[0]; ctx.beginPath(); ctx.ellipse(240, lvl + foam, 50, 9, 0, 0, Math.PI * 2); ctx.fill();            // süt yüzeyi
    ctx.fillStyle = lg(0, lvl, 0, lvl + foam, [[0, MC[1]], [1, MC[2]]]); ctx.beginPath(); ctx.ellipse(240, lvl, 50, 9, 0, Math.PI, 0); ctx.lineTo(290, lvl + foam); ctx.lineTo(190, lvl + foam); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.ellipse(240, lvl, 50, 9, 0, 0, Math.PI * 2); ctx.fill();   // köpük
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
  function art(fill, mark) { fill = num(fill); if (mark != null) mark = num(mark); bg();
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
  function water(v, pouring, opt) { v = num(v); const empty = !!obj(opt).empty; bg(); shadow(250, H - 64, 70, 10);
    const lvl = Math.min(100, v) / 100, top = 196 - lvl * 70;
    ctx.fillStyle = lg(200, 0, 300, 0, [[0, "#d8d3cc"], [.35, "#fbfaf8"], [1, "#c9c3bb"]]); rr(205, 118, 90, 82, 10); ctx.fill();          // kupa
    ctx.strokeStyle = "#d8d3cc"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(298, 158, 18, -1.2, 1.2); ctx.stroke();
    ctx.save(); rr(210, 122, 80, 74, 8); ctx.clip(); ctx.fillStyle = empty ? lg(0, top, 0, 196, [[0, "rgba(205,226,236,.95)"], [1, "rgba(160,192,208,.95)"]]) : lg(0, top, 0, 196, [[0, "#8a5a36"], [1, "#3a200e"]]); ctx.fillRect(205, top, 90, 200);   // americano (empty: yalnız sıcak su)
    if (empty && lvl > 0) { ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(210, top, 80, 2); } ctx.restore();
    if (v > 100) { ctx.fillStyle = empty ? "rgba(170,200,215,.7)" : "rgba(120,80,50,.6)"; ctx.fillRect(205, 190, 90, 12); }
    ctx.save(); ctx.translate(150, 70); ctx.rotate(pouring ? .55 : .15);                                                               // kettle
    ctx.fillStyle = lg(-50, 0, 50, 0, [[0, "#8e9296"], [.3, "#eef0f2"], [.6, "#b4b8bd"], [1, "#7c8085"]]); rr(-45, -30, 90, 70, 18); ctx.fill();
    ctx.fillStyle = "#2b2117"; rr(-30, -46, 60, 12, 6); ctx.fill(); ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(-50, 5, 20, 1.6, 4.6); ctx.stroke();
    ctx.fillStyle = "#aeb2b7"; ctx.beginPath(); ctx.moveTo(42, -5); ctx.lineTo(80, -22); ctx.lineTo(82, -14); ctx.lineTo(44, 12); ctx.fill(); ctx.restore();   // ağız
    if (pouring) { ctx.strokeStyle = "rgba(200,225,240,.85)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(214, 70); ctx.quadraticCurveTo(236, 90, 244, top); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(250 + i * 8, top - 14 - i * 9, 9 + i * 3, 5 + i, 0, 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 14px system-ui"; ctx.textAlign = "left"; ctx.fillText("su seviyesi %" + Math.round(Math.min(100, v)), 320, 120);
  }
  // ---- §3 Buhar kazanı: yuvarlak basınç kadranı, renkli yaylar, dönen ibre
  function pressure(v, z) { v = num(v); z = z && typeof z === "object" ? z : null; bg(); shadow(240, H - 64, 120, 12);
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
  function cocoa(v, done) { v = num(v); bg();
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
  function shake(x, v) { x = num(x, 50); v = num(v); bg();                                       // üstten köpüklü fincan, serpiciyi parmakla sağa-sola çalkala
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
  function stir(v, ang) { v = num(v); ang = num(ang); bg();                                      // üstten americano, kaşık daire çizer
    ctx.fillStyle = rg(236, 128, 10, 92, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 128, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(236, 124, 5, 76, [[0, "#8a5a36"], [.7, "#5a3418"], [1, "#2e180a"]]); ctx.beginPath(); ctx.arc(240, 128, 76, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(230,190,140,.35)"; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(240, 128, i * 15, ang + i, ang + i + 1.6 + v / 60); ctx.stroke(); }
    const ex = 240 + Math.cos(ang) * 44, ey = 128 + Math.sin(ang) * 44;
    ctx.strokeStyle = lg(ex - 10, 0, ex + 10, 0, [[0, "#8e9296"], [.5, "#f4f5f6"], [1, "#8e9296"]]); ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 120, ey - 90); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = "#c9ccd0"; ctx.beginPath(); ctx.ellipse(ex, ey, 11, 7, ang, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("parmağınla daire çiz · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3", 240, 240);
  }
  function swirl(v, ang, mk) { v = num(v); ang = num(ang); bg();                                  // üstten süt sürahisi, süt girdabı
    const ox = 240 + Math.cos(ang) * 10, oy = 126 + Math.sin(ang) * 6;
    shadow(ox, oy + 8, 100, 30, .25);
    ctx.fillStyle = lg(ox - 90, 0, ox + 90, 0, [[0, "#8e9296"], [.3, "#f2f4f6"], [.65, "#b4b8bd"], [1, "#7c8085"]]); ctx.beginPath(); ctx.arc(ox, oy, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#aeb2b7"; ctx.beginPath(); ctx.moveTo(ox + 80, oy - 20); ctx.lineTo(ox + 112, oy); ctx.lineTo(ox + 80, oy + 20); ctx.fill();
    const k = v / 100; ctx.fillStyle = rg(ox, oy, 5, 74, [[0, `rgb(${250 - k * 4},${244 - k * 6},${232 - k * 8})`], [1, k > .6 ? "#efe5d4" : "#f6f1e8"]]); ctx.beginPath(); ctx.arc(ox, oy, 74, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(200,180,150,${.5 - k * .35})`; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(ox, oy, 12 + i * 10, ang * 1.5 + i, ang * 1.5 + i + 2.2); ctx.stroke(); }
    if (k < .7) { ctx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 30 * (1 - k); i++) { ctx.beginPath(); ctx.arc(ox + Math.cos(i * 2.1 + ang) * (20 + i * 1.6), oy + Math.sin(i * 2.1 + ang) * (20 + i * 1.6), 2 + (i % 3), 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("daire çizerek çevir · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3 · köpük birleşiyor", 240, 240);
  }
  function pour(v, pouring, mk, opt) { v = num(v); const o = obj(opt); bg(); shadow(250, H - 64, 64, 10);  // yandan: sürahi fincana süt döker
    if (o.glass) return pourGlass(v, pouring, !!o.empty);
    const lvl = Math.min(100, v) / 100, top = 196 - lvl * 52;
    ctx.fillStyle = lg(210, 0, 300, 0, [[0, "#d8d3cc"], [.35, "#fbfaf8"], [1, "#c9c3bb"]]); rr(212, 140, 80, 60, 12); ctx.fill();
    ctx.strokeStyle = "#d8d3cc"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(295, 168, 14, -1.2, 1.2); ctx.stroke();
    ctx.save(); rr(216, 144, 72, 52, 10); ctx.clip(); if (!o.empty) { ctx.fillStyle = lg(0, 144, 0, 196, [[0, "#6a3d1a"], [1, "#2e180a"]]); ctx.fillRect(212, 160, 80, 40); }
    if (o.empty) { ctx.fillStyle = lg(0, top, 0, 196, [[0, "#fffdf8"], [1, "#efe6d6"]]); ctx.fillRect(212, Math.max(144, top), 80, 200 - Math.max(144, top)); }   // önce süt: fincan boştu
    else { ctx.fillStyle = lg(0, top, 0, 196, [[0, "#f7f0e4"], [1, "#d9b88e"]]); ctx.fillRect(212, Math.max(144, top), 80, 60 * lvl); } ctx.restore();
    ctx.save(); ctx.translate(165, 82); ctx.rotate(pouring ? .7 : .2);
    ctx.fillStyle = lg(-40, 0, 40, 0, [[0, "#8e9296"], [.35, "#eef0f2"], [1, "#7c8085"]]); ctx.beginPath(); ctx.moveTo(-34, -40); ctx.lineTo(34, -40); ctx.lineTo(40, 40); ctx.lineTo(-40, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#aeb2b7"; ctx.beginPath(); ctx.moveTo(34, -40); ctx.lineTo(56, -48); ctx.lineTo(38, -28); ctx.fill(); ctx.strokeStyle = "#7c8085"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-44, 0, 18, 1.7, 4.6); ctx.stroke(); ctx.restore();
    if (pouring && v < 100) { ctx.strokeStyle = "rgba(255,252,245,.95)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(214, 64); ctx.quadraticCurveTo(240, 90, 250, top); ctx.stroke(); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("basılı tut · sütü dök · %" + Math.round(Math.min(100, v)), 240, 240);
  }
  function pourGlass(v, pouring, empty) {                                     // v0.24: uzun şeffaf bardak (latte/caramel macchiato)
    const lvl = Math.max(0, Math.min(100, v)) / 100, gx = 252, gb = 206, gh = 126;
    const L = empty ? [["#efe5d4", lvl * .58], ["#fffdf8", lvl * .16]] : [["#4a2a12", .24], ["#c9a57a", lvl * .12], ["#efe5d4", lvl * .36], ["#fffdf8", lvl * .1]];
    glassCup(gx, gb, 88, gh, null, L, 0); const top = gb - L.reduce((a, l) => a + l[1], 0) * gh;
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(gx - 36, gb - gh + 8, 4, gh - 20);
    ctx.save(); ctx.translate(150, 44); ctx.rotate(pouring ? .7 : .2);
    ctx.fillStyle = lg(-40, 0, 40, 0, [[0, "#8e9296"], [.35, "#eef0f2"], [1, "#7c8085"]]); ctx.beginPath(); ctx.moveTo(-34, -40); ctx.lineTo(34, -40); ctx.lineTo(40, 40); ctx.lineTo(-40, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#aeb2b7"; ctx.beginPath(); ctx.moveTo(34, -40); ctx.lineTo(56, -48); ctx.lineTo(38, -28); ctx.fill(); ctx.strokeStyle = "#7c8085"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-44, 0, 18, 1.7, 4.6); ctx.stroke(); ctx.restore();
    if (pouring && v < 100) { ctx.strokeStyle = "rgba(255,252,245,.95)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(223, 44); ctx.quadraticCurveTo(250, 64, gx, top); ctx.stroke(); }
    label("basılı tut · sütü dök · %" + Math.round(Math.min(100, Math.max(0, v))));
  }
  // ---- §3 espresso dışı kahveler: renkli hedef çubuk yerine gerçek göstergeler (terazi, köpük çizgisi, saat, seviye)
  const ZC = [["k", "rgba(233,196,106,.95)"], ["g", "rgba(156,199,122,.98)"], ["p", "#3f7d34"]];
  function arcZones(cx, cy, R, w, a0, a1, Z) { if (!Z || typeof Z !== "object") return; const A = u => a0 + Math.max(0, Math.min(100, u)) / 100 * (a1 - a0);
    ZC.forEach(([k, col]) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, R, A(Z.t - Z[k]), A(Z.t + Z[k])); ctx.stroke(); }); }
  function vZones(x, yTop, yBot, w, Z) { if (!Z || typeof Z !== "object") return; const Y = u => yBot - Math.max(0, Math.min(100, u)) / 100 * (yBot - yTop);
    ZC.forEach(([k, col]) => { ctx.fillStyle = col; const a = Y(Z.t + Z[k]), b = Y(Z.t - Z[k]); ctx.fillRect(x, a, w, Math.max(1.5, b - a)); }); }
  function scale(cx, cy, val, Z, unit, max) { val = num(val); max = num(max, 10);                                     // dijital terazi + kadran
    ctx.fillStyle = lg(cx - 70, 0, cx + 70, 0, [[0, "#2b2b30"], [.5, "#4a4a50"], [1, "#2b2b30"]]); rr(cx - 70, cy, 140, 26, 8); ctx.fill();
    ctx.fillStyle = "#9cf0a8"; ctx.font = "700 15px monospace"; ctx.textAlign = "center"; ctx.fillText((val * max / 100).toFixed(1) + " " + unit, cx, cy + 18);
    const R = 34, gx = cx + 110, gy = cy + 10; ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.arc(gx, gy, R + 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8d8f93"; ctx.lineWidth = 2; ctx.stroke();
    arcZones(gx, gy, R - 4, 9, Math.PI * .75, Math.PI * 2.25, Z);
    const a = Math.PI * .75 + Math.min(100, val) / 100 * Math.PI * 1.5; ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * (R - 6), gy + Math.sin(a) * (R - 6)); ctx.stroke(); ctx.lineCap = "butt"; }
  // ---- v0.24 cezve ailesi: sıvı (su/süt), toz (kahve/menengiç/kenger/baharatlı/damla sakızlı), kap (cezve/çömlek/dallah/kum/mırra ibriği)
  const BRASS = [[0, "#7a5a14"], [.35, "#f3d98a"], [.6, "#c09838"], [1, "#5e4410"]];
  function tkOpt(opt) { const o = obj(opt), milk = o.liquid === "milk";
    const pw = ["coffee", "menengic", "kenger", "spiced", "mastic"].includes(o.powder) ? o.powder : "coffee", ves = ["cezve", "clay", "dallah", "sand", "mirra"].includes(o.vessel) ? o.vessel : "cezve", paste = pw === "menengic" || pw === "kenger";
    return { milk, pw, ves, paste,
      powder: pw === "menengic" ? "#5a5024" : pw === "kenger" ? "#a57d4c" : "#3a200e",
      liq: milk ? (pw === "menengic" ? ["#bba476", "#86703f"] : pw === "kenger" ? ["#d6b68e", "#a3835a"] : ["#c99d6e", "#8a5c38"]) : pw === "menengic" ? ["#6e5e2c", "#3a3214"] : pw === "kenger" ? ["#a07a4c", "#5e4022"] : ves === "mirra" ? ["#2e1a0c", "#0e0603"] : ["#5a3418", "#2a170b"],
      foam: milk ? (pw === "menengic" ? "#d8c79c" : pw === "kenger" ? "#ecd8b6" : "#e8cfa6") : pw === "menengic" ? "#9a8650" : pw === "kenger" ? "#c9a274" : ves === "mirra" ? "#5e3c22" : "#c08a55",
      sp: pw === "spiced" ? ["#7d8f4e", "#a0522d", "#5e7a3a"] : pw === "mastic" ? ["#f7f4ea", "#ffffff"] : null };
  }
  function specks(cx, cy, R, cols, n, rot, ry) { if (!cols) return; ry = ry == null ? 1 : ry; rot = num(rot); for (let i = 0; i < n; i++) { const a = i * 2.39996 + rot, r = Math.sqrt((i + .5) / n) * R; ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r * ry, 1.7, 1.1, a, 0, Math.PI * 2); ctx.fill(); } }
  function cezve(x, y, fill, foam, fcol, sp) {                                    // yandan bakır cezve
    ctx.fillStyle = lg(x - 50, 0, x + 50, 0, [[0, "#7a3a1c"], [.35, "#e19a5a"], [.6, "#b8642e"], [1, "#6a3014"]]);
    ctx.beginPath(); ctx.moveTo(x - 46, y - 70); ctx.lineTo(x + 46, y - 70); ctx.lineTo(x + 54, y); ctx.lineTo(x - 54, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a3418"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + 48, y - 50); ctx.lineTo(x + 130, y - 78); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = "#c9a14f"; ctx.fillRect(x - 47, y - 74, 94, 5);
    if (foam > 0) { ctx.fillStyle = fcol || "#c08a55"; const h = foam; ctx.beginPath(); ctx.ellipse(x, y - 70, 46 + h * .1, 6 + h * .5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "rgba(255,235,200,.35)"; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(x - 34 + i * 10, y - 72 - (i % 3) * h * .15, 2.5, 0, Math.PI * 2); ctx.fill(); }
      if (sp) for (let i = 0; i < 14; i++) { ctx.fillStyle = sp[i % sp.length]; ctx.beginPath(); ctx.arc(x - 38 + (i * 37) % 76, y - 71 - (i % 4) * h * .1, 1.4, 0, Math.PI * 2); ctx.fill(); } }
  }
  function foamAt(x, my, mw, h, col, sp) { if (!(h > 0)) return; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, my, mw + h * .1, 4 + h * .5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "rgba(255,235,200,.35)"; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(x - mw * .74 + i * mw * .21, my - 2 - (i % 3) * h * .15, 2.3, 0, Math.PI * 2); ctx.fill(); }
    if (sp) for (let i = 0; i < 12; i++) { ctx.fillStyle = sp[i % sp.length]; ctx.beginPath(); ctx.arc(x - mw * .8 + (i * 37) % (mw * 1.6), my - 1 - (i % 4) * h * .1, 1.4, 0, Math.PI * 2); ctx.fill(); }
  }
  function vesselSide(kind, x, y) {                                               // çömlek / dallah / mırra ibriği (yandan); ağız ve kesit kutusu döner
    if (kind === "clay") {                                                        // Meksika "olla de barro"
      ctx.fillStyle = lg(x - 62, 0, x + 62, 0, [[0, "#6e2e12"], [.35, "#d9895a"], [.6, "#b25a2e"], [1, "#5a240e"]]);
      ctx.beginPath(); ctx.moveTo(x - 32, y - 74); ctx.bezierCurveTo(x - 36, y - 58, x - 68, y - 52, x - 60, y - 24); ctx.quadraticCurveTo(x - 52, y + 1, x, y + 1); ctx.quadraticCurveTo(x + 52, y + 1, x + 60, y - 24); ctx.bezierCurveTo(x + 68, y - 52, x + 36, y - 58, x + 32, y - 74); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#8a3e1c"; ctx.lineWidth = 4; [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(x + s * 52, y - 56, 6, 9, 0, 0, Math.PI * 2); ctx.stroke(); });
      ctx.strokeStyle = "rgba(250,232,200,.85)"; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const xx = x - 54 + i * 9; i ? ctx.lineTo(xx, y - 38 + (i % 2) * 6) : ctx.moveTo(xx, y - 38); } ctx.stroke();
      ctx.fillStyle = "rgba(250,232,200,.85)"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x - 42 + i * 14, y - 20, 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#c4703e"; ctx.beginPath(); ctx.ellipse(x, y - 75, 38, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#4a1e0c"; ctx.beginPath(); ctx.ellipse(x, y - 75, 31, 4, 0, 0, Math.PI * 2); ctx.fill();
      return { my: y - 75, mw: 31, il: x - 46, ir: x + 46, ib: y - 4 }; }
    if (kind === "dallah") {                                                      // Arap pirinç dallahı, uzun kıvrık gaga
      ctx.strokeStyle = lg(x - 110, 0, x - 30, 0, BRASS); ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - 36, y - 34); ctx.bezierCurveTo(x - 74, y - 40, x - 74, y - 84, x - 94, y - 108); ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = "#c09838"; ctx.beginPath(); ctx.moveTo(x - 89, y - 113); ctx.lineTo(x - 114, y - 126); ctx.lineTo(x - 99, y - 103); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#7a5a14"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 18, y - 92); ctx.bezierCurveTo(x + 66, y - 96, x + 68, y - 50, x + 44, y - 30); ctx.stroke();
      ctx.fillStyle = lg(x - 60, 0, x + 60, 0, BRASS); ctx.beginPath(); ctx.moveTo(x - 44, y - 4); ctx.bezierCurveTo(x - 64, y - 30, x - 52, y - 64, x - 18, y - 72); ctx.lineTo(x - 15, y - 92); ctx.lineTo(x - 26, y - 104); ctx.lineTo(x + 26, y - 104); ctx.lineTo(x + 15, y - 92); ctx.lineTo(x + 18, y - 72); ctx.bezierCurveTo(x + 52, y - 64, x + 64, y - 30, x + 44, y - 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#8a6a1f"; rr(x - 48, y - 6, 96, 7, 3); ctx.fill(); ctx.fillStyle = "rgba(90,66,16,.6)"; ctx.fillRect(x - 18, y - 74, 36, 3); ctx.fillRect(x - 16, y - 94, 32, 3);
      ctx.strokeStyle = "rgba(90,66,16,.45)"; ctx.lineWidth = 1.5; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(x - 36 + i * 12, y - 44); ctx.lineTo(x - 30 + i * 12, y - 36); ctx.lineTo(x - 36 + i * 12, y - 28); ctx.stroke(); }
      ctx.fillStyle = "#3a2a0c"; ctx.beginPath(); ctx.ellipse(x, y - 104, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x + 26, y - 104); ctx.rotate(-1.05); ctx.fillStyle = lg(-52, 0, 0, 0, BRASS); ctx.beginPath(); ctx.ellipse(-26, 0, 26, 12, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(-30, -11); ctx.lineTo(-26, -30); ctx.lineTo(-22, -11); ctx.fill(); ctx.restore();   // açık kapak
      return { my: y - 104, mw: 24, il: x - 40, ir: x + 40, ib: y - 8 }; }
    if (kind === "mirra") {                                                       // büyük pirinç mırra ibriği
      ctx.fillStyle = lg(x - 66, 0, x + 66, 0, BRASS);
      ctx.beginPath(); ctx.moveTo(x - 44, y - 100); ctx.lineTo(x + 44, y - 100); ctx.quadraticCurveTo(x + 40, y - 70, x + 64, y - 30); ctx.quadraticCurveTo(x + 70, y, x + 50, y); ctx.lineTo(x - 50, y); ctx.quadraticCurveTo(x - 70, y, x - 64, y - 30); ctx.quadraticCurveTo(x - 40, y - 70, x - 44, y - 100); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 44, y - 100); ctx.lineTo(x - 68, y - 110); ctx.lineTo(x - 42, y - 88); ctx.closePath(); ctx.fill();   // ağız ucu
      ctx.strokeStyle = "rgba(90,66,16,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 43, y - 86); ctx.lineTo(x + 43, y - 86); ctx.moveTo(x - 63, y - 22); ctx.lineTo(x + 63, y - 22); ctx.stroke();
      ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const xx = x - 42 + i * 12; ctx.beginPath(); ctx.moveTo(xx, y - 54); ctx.lineTo(xx + 6, y - 60); ctx.lineTo(xx + 12, y - 54); ctx.lineTo(xx + 6, y - 48); ctx.closePath(); ctx.stroke(); }
      ctx.strokeStyle = "#4a3410"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + 46, y - 80); ctx.lineTo(x + 138, y - 106); ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = "#c9a14f"; ctx.fillRect(x - 46, y - 104, 92, 5); ctx.fillStyle = "#140a04"; ctx.beginPath(); ctx.ellipse(x, y - 100, 42, 5, 0, 0, Math.PI * 2); ctx.fill();
      return { my: y - 100, mw: 42, il: x - 54, ir: x + 54, ib: y - 4 }; }
    cezve(x, y, 1, 0); return { my: y - 70, mw: 46, il: x - 42, ir: x + 42, ib: y - 2 };
  }
  function sandTray(y, run) {                                                     // sıcak altın kum tepsisi + ısı titreşimi
    ctx.fillStyle = lg(0, y - 32, 0, y + 14, [[0, "#f4d27e"], [.6, "#d9a648"], [1, "#b8862e"]]); ctx.beginPath(); ctx.moveTo(112, y + 14); ctx.lineTo(112, y - 26);
    for (let i = 0; i <= 16; i++) ctx.lineTo(112 + i * 16, y - 28 - Math.sin(i * 1.7) * 3 - (i > 4 && i < 12 ? 4 : 0)); ctx.lineTo(368, y + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(140,90,30,.35)"; for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(116 + (i * 53) % 250, y - 22 + (i * 17) % 34, 1, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = lg(104, 0, 376, 0, [[0, "#7a3a1c"], [.35, "#e19a5a"], [.6, "#b8642e"], [1, "#6a3014"]]); rr(104, y + 2, 272, 16, 6); ctx.fill();   // bakır tepsi
    if (run) { const t = Date.now() / 260; ctx.strokeStyle = "rgba(255,250,235,.45)"; ctx.lineWidth = 2; [140, 165, 315, 340].forEach((x0, k) => { ctx.beginPath(); for (let j = 0; j <= 10; j++) { const yy = y - 34 - j * 7, xx = x0 + Math.sin(t + j * .8 + k) * 4; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }); }
  }
  function pasteJar(x, y, col) {                                                  // menengiç / kenger ezmesi kavanozu
    ctx.fillStyle = "rgba(220,235,240,.55)"; rr(x - 30, y - 64, 60, 64, 8); ctx.fill(); ctx.fillStyle = col; rr(x - 26, y - 46, 52, 42, 6); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x - 22, y - 44, 6, 36); ctx.fillStyle = "#b5533c"; rr(x - 33, y - 74, 66, 12, 4); ctx.fill();
    ctx.fillStyle = "#f6efe0"; rr(x - 20, y - 34, 40, 14, 3); ctx.fill(); ctx.fillStyle = "#2b2117"; ctx.font = "700 9px system-ui"; ctx.textAlign = "center"; ctx.fillText("EZME", x, y - 24);
  }
  function tkdose(f, Z, opt) { f = num(f); const P = tkOpt(opt); bg(); shadow(200, H - 64, 80, 10);
    const h = Math.min(1, f) * 22; let M = { il: 160, ir: 240, ib: 168 };
    if (P.ves === "cezve" || P.ves === "sand") { ctx.fillStyle = lg(150, 0, 250, 0, [[0, "#7a3a1c"], [.4, "#e19a5a"], [1, "#6a3014"]]); ctx.beginPath(); ctx.moveTo(158, 100); ctx.lineTo(242, 100); ctx.lineTo(250, 170); ctx.lineTo(150, 170); ctx.closePath(); ctx.fill(); }
    else M = vesselSide(P.ves, 200, 170);
    if (P.paste) { const k = Math.max(0, Math.min(1, f)); if (k > 0) { ctx.fillStyle = P.powder; ctx.beginPath(); ctx.ellipse(200, M.ib, 6 + 30 * k, 3 + 14 * k, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.ellipse(192, M.ib - 6 * k - 2, 8 * k + 2, 3 * k + 1, -.3, 0, Math.PI * 2); ctx.fill(); } }
    else { ctx.fillStyle = P.powder; ctx.fillRect(M.il, M.ib - h, M.ir - M.il, h); if (P.sp && h > 2) for (let i = 0; i < 18; i++) { ctx.fillStyle = P.sp[i % P.sp.length]; ctx.beginPath(); ctx.arc(M.il + 4 + (i * 29) % (M.ir - M.il - 8), M.ib - 2 - (i * 7) % Math.max(1, h - 3), 1.4, 0, Math.PI * 2); ctx.fill(); } }
    ctx.save(); ctx.translate(250, 70); ctx.rotate(.5); ctx.fillStyle = "#c9ccd0"; rr(-6, -40, 12, 50, 5); ctx.fill(); ctx.fillStyle = P.powder; ctx.beginPath(); ctx.ellipse(0, 12, 14, P.paste ? 11 : 9, 0, 0, Math.PI * 2); ctx.fill();
    if (P.paste) { ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.ellipse(-4, 8, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); } if (P.sp) specks(0, 12, 11, P.sp, 7, 0, .6); ctx.restore();
    if (P.paste) pasteJar(84, 196, P.powder);
    scale(200, 176, f * 100, Z, "g", 10);
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(P.paste ? "ezmeyi kaşıkla koy · kadrandaki ibre koyu yeşildeyken bırak" : "kadrandaki ibre koyu yeşildeyken bırak · 7 g", 240, 240);
  }
  function cezveStir(v, ang, opt) { v = num(v); ang = num(ang); const P = tkOpt(opt); bg();
    if (P.ves === "sand") { ctx.fillStyle = lg(0, 0, 480, 0, [[0, "#7a3a1c"], [.4, "#e19a5a"], [1, "#6a3014"]]); rr(52, 6, 376, 228, 34); ctx.fill(); ctx.fillStyle = rg(240, 125, 30, 200, [[0, "#f4d27e"], [1, "#c8963c"]]); rr(62, 14, 356, 212, 28); ctx.fill();
      ctx.fillStyle = "rgba(140,90,30,.35)"; for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(70 + (i * 53) % 340, 20 + (i * 31) % 200, 1, 0, Math.PI * 2); ctx.fill(); } }
    const R = P.ves === "clay" ? [98, 90, 74] : P.ves === "dallah" ? [74, 66, 54] : P.ves === "mirra" ? [104, 96, 84] : [96, 88, 76], k = R[2] / 76;
    const RC = P.ves === "clay" ? ["#5a240e", "#d9895a", "#8a3e1c"] : P.ves === "dallah" || P.ves === "mirra" ? ["#4a3810", "#f3d98a", "#8a6a1f"] : ["#3a2a20", "#e19a5a", "#7a3a1c"];
    ctx.fillStyle = RC[0]; ctx.beginPath(); ctx.arc(240, 125, R[0], 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(240, 125, 10, R[1], [[0, RC[1]], [1, RC[2]]]); ctx.beginPath(); ctx.arc(240, 125, R[1], 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rg(240, 125, 5, R[2], [[0, P.liq[0]], [1, P.liq[1]]]); ctx.beginPath(); ctx.arc(240, 125, R[2], 0, Math.PI * 2); ctx.fill();
    if (P.paste && v < 100) { ctx.save(); ctx.globalAlpha = .8 * (1 - Math.max(0, v) / 100); ctx.fillStyle = P.powder; ctx.beginPath(); ctx.ellipse(240 + Math.cos(ang + 2) * 14, 125 + Math.sin(ang + 2) * 10, 26, 16, ang, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }   // çözülen ezme
    if (P.sp) specks(240, 125, R[2] - 8, P.sp, 46, ang * .6);
    ctx.strokeStyle = P.milk ? `rgba(255,240,215,${.3 + v / 300})` : `rgba(210,170,120,${.25 + v / 300})`; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(240, 125, i * 15 * k, ang + i, ang + i + 1.4); ctx.stroke(); }
    const ex = 240 + Math.cos(ang) * 44 * k, ey = 125 + Math.sin(ang) * 44 * k; ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 110, ey - 95); ctx.stroke(); ctx.lineCap = "butt";
    const txt = P.milk ? (P.paste ? "süt ve ezme karışsın" : "süt, kahve ve şeker karışsın") : P.paste ? "ezme ve su karışsın" : "kahve, su ve şeker karışsın";
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(txt + " · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3", 240, 240);
  }
  function cezveFoam(v, run, Z, opt) { v = num(v); const P = tkOpt(opt), fv = Math.min(100, v) * .55; bg();
    if (P.ves !== "sand") { ctx.fillStyle = "#2b2b30"; rr(130, 196, 220, 14, 4); ctx.fill();                                     // ocak
      if (run) { if (P.ves === "mirra") for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(80,140,255,${.35 + .2 * Math.sin(Date.now() / 90 + i)})`; ctx.beginPath(); ctx.ellipse(212 + i * 11, 195, 2, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }   // kısık ateş
        else for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(80,140,255,${.5 + .3 * Math.sin(Date.now() / 90 + i)})`; ctx.beginPath(); ctx.ellipse(196 + i * 11, 194, 3, 6, 0, 0, Math.PI * 2); ctx.fill(); } } }
    if (P.ves === "cezve" || P.ves === "sand") { cezve(240, 192, 1, fv, P.foam, P.sp); if (P.ves === "sand") sandTray(192, run); }
    else { const M = vesselSide(P.ves, 240, 192); foamAt(240, M.my, M.mw, fv, P.foam, P.sp); }
    const blind = !!(opt && opt.blind);                                            // v0.40 §14: izle ve yakala (ölçek gizli)
    if (!blind) { vZones(312, 70, 192, 12, Z); ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 8; ctx.strokeRect(312, 70, 12, 122);                              // köpük ölçeği
    const yy = 192 - Math.min(100, v) / 100 * 122; ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(306, yy); ctx.lineTo(312, yy - 5); ctx.lineTo(312, yy + 5); ctx.fill(); }
    if (v > 95) { ctx.fillStyle = P.milk ? "rgba(214,180,140,.85)" : "rgba(160,110,60,.8)"; ctx.beginPath(); ctx.ellipse(200, P.ves === "sand" ? 168 : 196, 30, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    const nm = { cezve: "cezveyi", sand: "cezveyi", clay: "toprak çömleği", dallah: "dallahı", mirra: "ibriği" }[P.ves];
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center";
    if (blind) { ctx.fillText(run ? "köpük kabarıyor… taşmadan hemen önce al" : "ocağa koy; köpüğe bak, taşmadan al", 240, 240); } else
    ctx.fillText(run ? (P.ves === "sand" ? "kum ısıtıyor… köpük kabarınca, koyu yeşilde kumdan çek" : P.ves === "mirra" ? "kısık ateşte… kabarınca, taşmadan koyu yeşilde ocaktan al" : "köpük kabarıyor… taşmadan, koyu yeşilde ocaktan al") : (P.ves === "sand" ? "cezveyi sıcak kuma göm" : nm + " ocağa koy"), 240, 240);
  }
  // ---- v0.24 demleme aletleri (yandan). g: kahve 0..1, out: alttaki kap 0..1, st: aşama, f: v/100, wat: demleyicideki su 0..1, col: kahve rengi
  const GLASS = "rgba(220,235,240,.5)", GLINE = "rgba(150,180,190,.9)";
  function coffeeFill(path, yBot, h, x0, w) { if (!(h > 0)) return; ctx.save(); path(); ctx.clip(); ctx.fillStyle = lg(0, yBot - h, 0, yBot, [[0, "#6a3d1a"], [1, "#3a200d"]]); ctx.fillRect(x0, yBot - h, w, h + 4); ctx.restore(); }
  function fallGrounds(x, y0, y1, col) { const t = Date.now() / 6, d = Math.max(1, y1 - y0); ctx.fillStyle = col || "#5a3418"; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(x + Math.sin(i * 7.3) * 4, y0 + (t + i * 23) % d, 1.6 + (i % 3) * .5, 0, Math.PI * 2); ctx.fill(); } }
  function drops(x, y0, y1, col, n) { const t = Date.now() / 8, d = Math.max(1, y1 - y0); ctx.fillStyle = col || "#3a2010"; for (let i = 0; i < (n || 3); i++) { ctx.beginPath(); ctx.ellipse(x, y0 + (t + i * 25) % d, 2, 2.8, 0, 0, Math.PI * 2); ctx.fill(); } }
  function kettleAt(kx, ky) { ctx.strokeStyle = "rgba(200,225,240,.95)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(kx - 40, 22); ctx.quadraticCurveTo(kx - 10, 40, kx, ky); ctx.stroke();
    ctx.fillStyle = "#b4b8bd"; ctx.save(); ctx.translate(kx - 70, 18); ctx.rotate(.5); rr(-26, -16, 52, 34, 8); ctx.fill(); ctx.restore(); }
  function brChemex(g, out, st, f, wat, col) {
    const P = () => { ctx.beginPath(); ctx.moveTo(166, 58); ctx.lineTo(224, 124); ctx.bezierCurveTo(176, 146, 166, 202, 198, 203); ctx.lineTo(282, 203); ctx.bezierCurveTo(314, 202, 304, 146, 256, 124); ctx.lineTo(314, 58); ctx.closePath(); };
    P(); ctx.fillStyle = GLASS; ctx.fill(); coffeeFill(P, 202, out * 56, 160, 160); P(); ctx.strokeStyle = GLINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(172, 60); ctx.lineTo(184, 76); ctx.stroke();                                                            // döküm oluğu
    ctx.fillStyle = "#faf6ee"; ctx.beginPath(); ctx.moveTo(156, 44); ctx.lineTo(324, 44); ctx.lineTo(244, 120); ctx.lineTo(236, 120); ctx.closePath(); ctx.fill();   // kalın katlı kâğıt filtre
    ctx.fillStyle = "#ebe2d0"; ctx.beginPath(); ctx.moveTo(156, 44); ctx.lineTo(206, 44); ctx.lineTo(238, 118); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(150,130,100,.5)"; ctx.lineWidth = 1; [170, 186, 290].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 44); ctx.lineTo(x < 240 ? 237 : 243, 118); ctx.stroke(); });
    if (g > 0) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(240 - 44 * g, 118 - 48 * g); ctx.lineTo(240 + 44 * g, 118 - 48 * g); ctx.lineTo(245, 118); ctx.lineTo(235, 118); ctx.closePath(); ctx.fill(); }
    if (wat > 0 && st !== "dose") { ctx.fillStyle = "rgba(150,105,60,.55)"; const y = 118 - 48 - wat * 16; ctx.beginPath(); ctx.moveTo(240 - 44 - wat * 14, y); ctx.lineTo(240 + 44 + wat * 14, y); ctx.lineTo(240 + 44, 70); ctx.lineTo(196, 70); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = lg(200, 0, 280, 0, [[0, "#5a3418"], [.35, "#b07a48"], [.65, "#9a6638"], [1, "#4e2c14"]]);                       // ahşap yaka
    ctx.beginPath(); ctx.moveTo(206, 106); ctx.lineTo(274, 106); ctx.lineTo(259, 126); ctx.lineTo(279, 152); ctx.lineTo(201, 152); ctx.lineTo(221, 126); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = "#3a2414"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(219, 127); ctx.lineTo(261, 127); ctx.moveTo(259, 127); ctx.quadraticCurveTo(274, 136, 270, 154); ctx.stroke();
    ctx.fillStyle = "#6b4423"; ctx.beginPath(); ctx.arc(270, 157, 5, 0, Math.PI * 2); ctx.fill();
    return { kx: 240, ky: 74, bx: 240, by: 72 };
  }
  function brKalita(g, out, st, f, wat, col) {
    const S = () => { ctx.beginPath(); ctx.moveTo(194, 142); ctx.lineTo(286, 142); ctx.quadraticCurveTo(304, 172, 294, 202); ctx.lineTo(186, 202); ctx.quadraticCurveTo(176, 172, 194, 142); ctx.closePath(); };
    S(); ctx.fillStyle = GLASS; ctx.fill(); coffeeFill(S, 201, out * 50, 176, 130); S(); ctx.strokeStyle = GLINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(302, 172, 15, -1.3, 1.3); ctx.stroke();                                              // cam servis sürahisi
    ctx.fillStyle = lg(174, 0, 306, 0, [[0, "#9ea2a7"], [.25, "#e3e6e9"], [.5, "#b4b8bd"], [.75, "#eef0f2"], [1, "#8a8e93"]]);       // çelik düz tabanlı dripper
    ctx.beginPath(); ctx.moveTo(174, 60); ctx.lineTo(306, 60); ctx.lineTo(278, 126); ctx.lineTo(202, 126); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#fbf7ee"; ctx.beginPath(); ctx.moveTo(186, 56); for (let i = 1; i <= 18; i++) ctx.lineTo(186 + i * 6, i % 2 ? 49 : 56); ctx.lineTo(268, 120); ctx.lineTo(212, 120); ctx.closePath(); ctx.fill();   // wave filtre
    ctx.strokeStyle = "rgba(170,155,130,.6)"; for (let i = 1; i < 18; i++) { const x = 186 + i * 6; ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(212 + (x - 186) / 108 * 56, 119); ctx.stroke(); }
    const hw = y => 28 + (120 - y) / 64 * 26;
    if (wat > 0 && st !== "dose") { const t = 120 - 34 - wat * 22; ctx.fillStyle = "rgba(150,105,60,.6)"; ctx.beginPath(); ctx.moveTo(240 - hw(t) + 3, t); ctx.lineTo(240 + hw(t) - 3, t); ctx.lineTo(240 + hw(86), 86); ctx.lineTo(240 - hw(86), 86); ctx.closePath(); ctx.fill(); }
    if (g > 0) { const t = 120 - g * 34; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(240 - hw(t) + 2, t); ctx.lineTo(240 + hw(t) - 2, t); ctx.lineTo(267, 120); ctx.lineTo(213, 120); ctx.closePath(); ctx.fill(); }
    steel(172, 58, 136, 6, 3); steel(198, 124, 84, 8, 3); steel(188, 132, 104, 6, 3);
    if (out > 0 && out < 1) [228, 240, 252].forEach(x => drops(x, 140, 200 - out * 50, "#3a2010", 1));
    return { kx: 240, ky: 120 - g * 34 - 4, bx: 240, by: 120 - g * 34 + 2 };
  }
  function aeroBody(lvl, gr, waterCol, funnel) {                                // AeroPress haznesi fincanın üstünde
    ctx.fillStyle = lg(196, 0, 284, 0, [[0, "#d8d3cc"], [.35, "#fbfaf8"], [1, "#c9c3bb"]]); rr(194, 152, 92, 48, 10); ctx.fill();
    ctx.strokeStyle = "#d8d3cc"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(290, 174, 14, -1.2, 1.2); ctx.stroke();
    ctx.fillStyle = "#2b2b30"; rr(184, 147, 112, 6, 3); ctx.fill(); rr(204, 141, 72, 10, 3); ctx.fill();                          // kanatlı filtre kapağı
    const top = 52, bot = 141, X0 = 208, Wd = 64, Hh = bot - top;
    ctx.fillStyle = "rgba(190,200,210,.5)"; ctx.fillRect(X0, top, Wd, Hh);
    if (lvl > 0) { ctx.fillStyle = waterCol; ctx.fillRect(X0 + 2, bot - Math.min(1, lvl) * Hh, Wd - 4, Math.min(1, lvl) * Hh); }
    if (gr > 0) { ctx.fillStyle = "#5a3418"; ctx.fillRect(X0 + 2, bot - gr * Hh, Wd - 4, gr * Hh); }
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(X0 + 6, top + 4, 4, Hh - 8);
    ctx.strokeStyle = "rgba(70,80,90,.75)"; ctx.lineWidth = 2; ctx.strokeRect(X0, top, Wd, Hh); ctx.fillStyle = "rgba(60,65,72,.9)"; rr(X0 - 9, top - 6, Wd + 18, 8, 3); ctx.fill();
    ctx.fillStyle = "rgba(40,45,52,.8)"; ctx.font = "700 9px system-ui"; ctx.textAlign = "left"; for (let i = 1; i <= 4; i++) { const y = bot - i * 20; ctx.fillText(String(i), X0 + Wd - 11, y + 3); ctx.beginPath(); ctx.arc(X0 + Wd - 15, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
    if (funnel) { ctx.fillStyle = "rgba(190,200,210,.6)"; ctx.beginPath(); ctx.moveTo(184, 24); ctx.lineTo(296, 24); ctx.lineTo(272, 46); ctx.lineTo(208, 46); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(70,80,90,.6)"; ctx.lineWidth = 1.5; ctx.stroke(); }
    return { top, bot };
  }
  function brAero(g, out, st, f, wat) { const gr = g * .22, lv = st === "dose" ? 0 : gr + wat * .6; const A = aeroBody(lv, gr, "rgba(150,105,65,.85)", st === "dose");
    const sy = A.bot - Math.max(lv, gr) * (A.bot - A.top); return { kx: 240, ky: sy - 2, bx: 240, by: sy - 18 }; }
  function brSiphon(g, out, st, f, wat, col) {
    ctx.fillStyle = "#2b2b30"; rr(176, 202, 128, 7, 3); ctx.fill(); ctx.fillRect(316, 40, 6, 166); rr(270, 108, 52, 7, 3); ctx.fill();   // ayak + kol
    ctx.fillStyle = GLASS; ctx.beginPath(); ctx.arc(240, 172, 30, 0, Math.PI * 2); ctx.fill();                                  // alt küre
    ctx.save(); ctx.beginPath(); ctx.arc(240, 172, 28, 0, Math.PI * 2); ctx.clip(); const lv = out > 0 ? out : .55; ctx.fillStyle = out > 0 ? "#4a2a14" : "rgba(160,200,230,.85)"; ctx.fillRect(208, 200 - lv * 56, 64, lv * 56 + 4); ctx.restore();
    ctx.strokeStyle = GLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(240, 172, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = GLASS; ctx.fillRect(236, 112, 8, 40); ctx.strokeRect(236, 112, 8, 40);                                       // boru
    const U = () => { ctx.beginPath(); ctx.moveTo(206, 34); ctx.lineTo(274, 34); ctx.lineTo(274, 92); ctx.quadraticCurveTo(274, 114, 248, 116); ctx.lineTo(232, 116); ctx.quadraticCurveTo(206, 114, 206, 92); ctx.closePath(); };
    U(); ctx.fillStyle = GLASS; ctx.fill(); ctx.save(); U(); ctx.clip();
    if (wat > 0 && st !== "dose") { ctx.fillStyle = "rgba(150,105,60,.75)"; ctx.fillRect(200, 112 - g * 26 - wat * 50, 80, wat * 50 + 4); }
    if (g > 0) { ctx.fillStyle = col; ctx.fillRect(200, 112 - g * 26, 80, g * 26 + 6); } ctx.restore();
    ctx.strokeStyle = "#f4efe6"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(222, 113); ctx.lineTo(258, 113); ctx.stroke();       // bez filtre
    U(); ctx.strokeStyle = GLINE; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(203, 34); ctx.lineTo(277, 34); ctx.stroke();
    ctx.fillStyle = "#2b2b30"; rr(272, 104, 6, 14, 2); ctx.fill();
    const sy = 112 - g * 26 - (st !== "dose" ? wat * 50 : 0); return { kx: 240, ky: sy - 2, bx: 240, by: Math.min(96, sy) };
  }
  function brMoka(g, out, st, f, wat, col, v) { const x = 220;
    ctx.fillStyle = lg(54, 0, 130, 0, [[0, "#8e9296"], [.35, "#eef0f2"], [1, "#7c8085"]]);                                     // sökülmüş üst gövde (tezgâhta)
    ctx.beginPath(); ctx.moveTo(66, 198); ctx.lineTo(116, 198); ctx.lineTo(126, 138); ctx.lineTo(56, 138); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(56, 138); ctx.lineTo(44, 132); ctx.lineTo(60, 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#6f7378"; rr(58, 130, 66, 9, 4); ctx.fill(); ctx.fillStyle = "#2b2b30"; rr(86, 122, 10, 9, 3); ctx.fill(); ctx.strokeStyle = "#2b2b30"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(122, 146); ctx.quadraticCurveTo(150, 156, 120, 186); ctx.stroke();
    ctx.fillStyle = lg(x - 54, 0, x + 54, 0, [[0, "#8e9296"], [.3, "#eef0f2"], [.55, "#aeb3b8"], [.8, "#f1f3f5"], [1, "#7c8085"]]);   // alt hazne (sekizgen)
    ctx.beginPath(); ctx.moveTo(x - 54, 200); ctx.lineTo(x + 54, 200); ctx.lineTo(x + 44, 124); ctx.lineTo(x - 44, 124); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 1; [-18, 18].forEach(d => { ctx.beginPath(); ctx.moveTo(x + d, 124); ctx.lineTo(x + d * 1.2, 200); ctx.stroke(); });
    ctx.fillStyle = "#b5533c"; ctx.beginPath(); ctx.arc(x - 34, 182, 4, 0, Math.PI * 2); ctx.fill();                                // emniyet valfi
    const bT = 124, bB = 170, B = () => { ctx.beginPath(); ctx.moveTo(x - 54, bT); ctx.lineTo(x + 54, bT); ctx.lineTo(x + 42, bB); ctx.lineTo(x - 42, bB); ctx.closePath(); };
    B(); ctx.fillStyle = "#55595e"; ctx.fill(); ctx.fillStyle = "#8e9296"; ctx.fillRect(x - 6, bB, 12, 24);                           // huni sepet kesiti + boru
    const fm = st === "dose" ? Math.max(0, Math.min(120, num(v))) / 100 : 1, hh = fm * (bB - bT) / .9, top = bB - Math.min(hh, bB - bT);
    if (hh > 0) { ctx.save(); B(); ctx.clip(); ctx.fillStyle = lg(0, top, 0, bB, [[0, "#7a4a28"], [1, "#3a200e"]]); ctx.fillRect(x - 56, top, 112, bB - top + 2); ctx.restore(); }
    if (hh > bB - bT) { ctx.fillStyle = "#7a4a28"; ctx.beginPath(); ctx.ellipse(x, bT, 54, Math.min(16, hh - (bB - bT)), 0, Math.PI, 0); ctx.fill(); }   // taşan tepecik
    steel(x - 62, 118, 124, 7, 3); ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x - 54, bT + 1); ctx.lineTo(x + 54, bT + 1); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#2b2117"; ctx.font = "10px system-ui"; ctx.textAlign = "left"; ctx.fillText("kenar", x + 66, bT + 4);
    if (st === "dose" && fm < 1) { ctx.save(); ctx.translate(x + 30, 56); ctx.rotate(.9); ctx.fillStyle = "#c9ccd0"; rr(-5, -44, 10, 46, 4); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 10, 14, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#4a2c17"; ctx.beginPath(); ctx.ellipse(0, 8, 11, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); fallGrounds(x + 16, 70, top, "#5a3418"); }
    return { kx: x, ky: bT - 4, bx: x, by: bT - 10 };
  }
  function brPhin(g, out, st, f, wat, col) {
    glassCup(240, 205, 92, 96, null, [["#f3e3c3", .2], ["#3a2010", out * .45]]);                                               // altta yoğunlaştırılmış süt
    steel(182, 103, 116, 6, 3); ctx.fillStyle = lg(204, 0, 276, 0, [[0, "#9ea2a7"], [.35, "#eef0f2"], [1, "#8a8e93"]]); ctx.beginPath(); ctx.moveTo(204, 58); ctx.lineTo(276, 58); ctx.lineTo(272, 104); ctx.lineTo(208, 104); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#5c6066"; ctx.beginPath(); ctx.moveTo(210, 62); ctx.lineTo(270, 62); ctx.lineTo(267, 102); ctx.lineTo(213, 102); ctx.closePath(); ctx.fill();   // kesit
    if (wat > 0 && st !== "dose") { ctx.fillStyle = "rgba(150,105,60,.8)"; ctx.fillRect(212, 102 - g * 24 - wat * 14, 56, wat * 14); }
    if (g > 0) { ctx.fillStyle = col; ctx.fillRect(212, 102 - g * 24, 56, g * 24); }
    ctx.fillStyle = "#b4b8bd"; ctx.beginPath(); ctx.ellipse(240, 58, 37, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#5c6066"; ctx.beginPath(); ctx.ellipse(240, 58, 30, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (st === "dose") { ctx.fillStyle = lg(300, 0, 360, 0, [[0, "#9ea2a7"], [.4, "#eef0f2"], [1, "#8a8e93"]]); ctx.beginPath(); ctx.ellipse(330, 196, 30, 7, 0, 0, Math.PI * 2); ctx.fill(); rr(324, 184, 12, 10, 3); ctx.fill(); }   // kapak yanda
    else { ctx.fillStyle = "#9ea2a7"; ctx.fillRect(213, 102 - g * 24 - 3, 54, 3); }                                              // bastırma diski
    if (out > 0 && out < 1) drops(240, 112, 205 - 96 * (.2 + out * .45), "#3a2010");
    return { kx: 240, ky: 100 - g * 24 - wat * 14, bx: 240, by: 100 - g * 24 - 8 };
  }
  function brIndian(g, out, st, f, wat, col) {                                 // Güney Hint paslanmaz filtre: üst üste iki silindir
    steel(186, 128, 108, 74, 10); ctx.fillStyle = "#4e5257"; rr(196, 146, 88, 48, 6); ctx.fill();
    if (out > 0) { ctx.fillStyle = "#2a1508"; ctx.fillRect(198, 192 - out * 40, 84, out * 40); }
    steel(182, 122, 116, 9, 4); steel(196, 60, 88, 66, 8); ctx.fillStyle = "#5c6066"; ctx.fillRect(204, 66, 72, 52);
    if (wat > 0 && st !== "dose") { ctx.fillStyle = "rgba(150,105,60,.8)"; ctx.fillRect(204, 116 - g * 22 - wat * 28, 72, wat * 28); }
    if (g > 0) { ctx.fillStyle = col; ctx.fillRect(204, 116 - g * 22, 72, g * 22); }
    ctx.fillStyle = "#3a3d42"; ctx.fillRect(204, 116, 72, 3); ctx.fillStyle = "#9ea2a7"; for (let i = 0; i < 10; i++) ctx.fillRect(207 + i * 7, 117, 2, 1);   // delikli taban
    if (out > 0 && out < 1) drops(240, 148, 192 - out * 40, "#2a1508");
    if (st === "dose") { ctx.fillStyle = lg(310, 0, 380, 0, [[0, "#9ea2a7"], [.4, "#eef0f2"], [1, "#8a8e93"]]); ctx.beginPath(); ctx.ellipse(345, 196, 36, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(345, 192, 26, 9, 0, Math.PI, 0); ctx.fill(); rr(339, 178, 12, 8, 3); ctx.fill(); }   // kapak tezgâhta
    const sy = 116 - g * 22 - (st !== "dose" ? wat * 28 : 0); return { kx: 240, ky: sy - 2, bx: 240, by: 116 - g * 22 - 4 };
  }
  function brCloth(g, out, st, f, wat, col, v, drip) {                         // Brezilya cafezinho "coador": ahşap sehpa, bez torba, bule
    const wood = (x, y, w, h) => { ctx.fillStyle = lg(x, 0, x + w, 0, [[0, "#5a3418"], [.5, "#9a6638"], [1, "#4e2c14"]]); rr(x, y, w, h, 3); ctx.fill(); };
    wood(160, 36, 12, 166); wood(308, 36, 12, 166); wood(156, 44, 168, 9);
    ctx.fillStyle = lg(188, 0, 292, 0, [[0, "#d8d0c4"], [.35, "#fbf8f2"], [1, "#cfc6b8"]]); ctx.beginPath(); ctx.moveTo(196, 150); ctx.lineTo(284, 150); ctx.lineTo(292, 200); ctx.lineTo(188, 200); ctx.closePath(); ctx.fill();   // emaye bule
    ctx.fillStyle = "#b5533c"; ctx.fillRect(194, 148, 92, 5); ctx.strokeStyle = "#2b2b30"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(288, 168); ctx.lineTo(352, 150); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = "#4e3a2c"; rr(206, 160, 68, 34, 6); ctx.fill(); if (out > 0) { ctx.fillStyle = "#3a200e"; ctx.fillRect(207, 193 - out * 32, 66, out * 32); }
    const bag = () => { ctx.beginPath(); ctx.moveTo(198, 58); ctx.bezierCurveTo(198, 112, 222, 146, 240, 148); ctx.bezierCurveTo(258, 146, 282, 112, 282, 58); ctx.closePath(); };
    bag(); ctx.fillStyle = "#efe6d0"; ctx.fill(); ctx.save(); bag(); ctx.clip();
    ctx.strokeStyle = "rgba(150,130,100,.22)"; ctx.lineWidth = 1; for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.moveTo(190 + i * 5, 50); ctx.lineTo(190 + i * 5 - 30, 150); ctx.moveTo(190 + i * 5 - 30, 50); ctx.lineTo(190 + i * 5, 150); ctx.stroke(); }
    if (g > 0) { ctx.fillStyle = "rgba(74,42,20,.55)"; ctx.fillRect(190, 148 - g * 52, 100, g * 52); }
    if (st !== "dose") { ctx.fillStyle = lg(0, 60, 0, 148, [[0, "rgba(120,72,36,.15)"], [1, "rgba(90,52,24,.7)"]]); ctx.fillRect(190, 56, 100, 94); }
    ctx.restore(); ctx.fillStyle = st === "dose" ? (g > .1 ? col : "#3a2a1c") : "rgba(120,80,45,.95)"; ctx.beginPath(); ctx.ellipse(240, 58, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8e9296"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(240, 58, 42, 8, 0, 0, Math.PI * 2); ctx.stroke(); wood(170, 54, 30, 6);   // tel halka + sap
    if (drip) drops(240, 150, 193 - out * 32, "#3a200e");
    return { kx: 240, ky: 60, bx: 240, by: 56 };
  }
  const BREWERS = { chemex: brChemex, kalita: brKalita, aeropress: brAero, moka: brMoka, siphon: brSiphon, phin: brPhin, indian: brIndian, cloth: brCloth };
  const DOSE_T = { chemex: "orta-kaba çekim · Chemex filtresine · kadran koyu yeşilde bırak", kalita: "orta çekim · Kalita wave filtresine · kadran koyu yeşilde bırak", aeropress: "orta-ince çekim · AeroPress haznesine · kadran koyu yeşilde bırak", moka: "huniyi kenarına kadar doldur, bastırma · koyu yeşilde bırak", siphon: "orta çekim · sifonun üst cam haznesine · koyu yeşilde bırak", phin: "phin'e kahve koy · altta yoğunlaştırılmış süt · koyu yeşilde bırak", indian: "filtre kahvesini üst hazneye koy · kadran koyu yeşilde bırak", cloth: "kahveyi bez filtreye koy · kadran koyu yeşilde bırak" };
  function v60x(v, stage, extra, Z, type) { bg();
    const f = Math.max(0, Math.min(1, v / 100)), dose = stage === "dose", off = dose && type !== "moka" ? -60 : 0;
    const out = stage === "pour" ? f : stage === "bloom" ? .05 : 0, g = dose ? f : 1, wat = stage === "pour" ? .35 + f * .45 : stage === "bloom" ? f * .3 : 0, col = dose ? "#7a4a28" : "#4a2a14";
    ctx.save(); ctx.translate(off, 0); shadow(240, H - 64, 70, 10);
    const B = BREWERS[type](g, out, stage, f, wat, col, v, stage !== "dose" && f > 0 && f < 1);
    if (dose && f > 0 && f < 1 && type !== "moka") fallGrounds(B.kx, 10, B.ky, "#5a3418");
    if (stage === "bloom") { ctx.fillStyle = "rgba(200,150,90,.6)"; for (let i = 0; i < Math.min(100, v) / 8; i++) { ctx.beginPath(); ctx.arc(B.bx - 25 + (i * 13) % 50, B.by + (i * 7) % 14, 3 + (i % 3), 0, Math.PI * 2); ctx.fill(); } }
    if ((stage === "bloom" && extra) || stage === "pour") { const a = stage === "pour" ? num(extra) : 0; kettleAt(B.kx + Math.cos(a) * 24, B.ky + Math.sin(a) * 6); }
    ctx.restore();
    if (dose && type !== "moka") scale(330, 176, v, Z, "g", 30);
    if (dose && type === "moka") { vZones(330, 40, 200, 12, Z); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1; ctx.strokeRect(330, 40, 12, 160); const yy = 200 - Math.max(0, Math.min(100, v)) / 100 * 160; ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(324, yy); ctx.lineTo(330, yy - 5); ctx.lineTo(330, yy + 5); ctx.fill(); }
    const tur = " · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3", pc = " · %" + Math.round(Math.min(100, v));
    label(dose ? DOSE_T[type] : type === "indian" ? (stage === "bloom" ? "üst hazneye az sıcak su · kahve kabarsın" + pc : "sıcak suyu üst hazneye dök" + tur)
      : type === "cloth" ? (stage === "bloom" ? "bezdeki kahveyi az suyla ıslat" + pc : "şekerli sıcak suyu bezden süz" + tur)
      : stage === "bloom" ? "az suyla ıslat, kahve kabarsın (bloom)" + pc : "merkezden dışa daire çizerek dök" + tur);
  }
  function press(v, stage, run, Z, type) { v = num(v); if (!["dose", "water", "steep", "plunge"].includes(stage)) stage = "dose";
    if (type === "aeropress" && stage === "water") { bg(); shadow(240, H - 64, 70, 10);                               // v0.24: AeroPress'e su
      const lvl = .18 + Math.max(0, Math.min(100, v)) / 100 * .7, A = aeroBody(lvl, .14, "rgb(150,110,70)", false), y0 = A.bot - lvl * (A.bot - A.top);
      vZones(296, A.top, A.bot, 10, Z); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1; ctx.strokeRect(296, A.top, 10, A.bot - A.top);
      if (run) { ctx.strokeStyle = "rgba(200,225,240,.9)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(214, 8); ctx.quadraticCurveTo(232, 26, 238, y0); ctx.stroke(); }
      return label("AeroPress'e 93 °C su · seviye koyu yeşil çizgide bırak"); }
    bg(); shadow(240, H - 64, 70, 10);
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
  function v60(v, stage, extra, Z, type) { v = num(v); if (stage !== "bloom" && stage !== "pour") stage = "dose";
    if (BREWERS[type]) return v60x(v, stage, extra, Z, type); const ex = extra; extra = num(extra);
    bg(); const sh = stage === "dose"; if (sh) { ctx.save(); ctx.translate(-60, 0); }   // v0.24: dozda dripper sola, tartı kadranı ekranda kalsın
    shadow(240, H - 64, 70, 10);
    ctx.fillStyle = "rgba(220,235,240,.5)"; ctx.beginPath(); ctx.moveTo(185, 140); ctx.lineTo(295, 140); ctx.lineTo(300, 200); ctx.lineTo(180, 200); ctx.closePath(); ctx.fill();   // cam sürahi
    const out = stage === "pour" ? Math.min(1, v / 100) : stage === "bloom" ? .05 : 0; ctx.fillStyle = "#5a3418"; ctx.fillRect(182, 198 - out * 50, 116, out * 50);
    ctx.fillStyle = lg(170, 0, 310, 0, [[0, "#e6e1d8"], [.5, "#ffffff"], [1, "#d6d0c4"]]); ctx.beginPath(); ctx.moveTo(165, 60); ctx.lineTo(315, 60); ctx.lineTo(255, 138); ctx.lineTo(225, 138); ctx.closePath(); ctx.fill();   // dripper
    ctx.fillStyle = "#f6efe0"; ctx.beginPath(); ctx.moveTo(175, 64); ctx.lineTo(305, 64); ctx.lineTo(252, 132); ctx.lineTo(228, 132); ctx.closePath(); ctx.fill();   // kâğıt filtre
    const g = stage === "dose" ? Math.min(1, v / 100) : 1; if (g > 0) { ctx.fillStyle = stage === "dose" ? "#7a4a28" : "#4a2a14"; ctx.beginPath(); ctx.moveTo(240 - 40 * g, 132 - 40 * g); ctx.lineTo(240 + 40 * g, 132 - 40 * g); ctx.lineTo(250, 132); ctx.lineTo(230, 132); ctx.closePath(); ctx.fill(); }
    if (stage === "bloom") { ctx.fillStyle = "rgba(200,150,90,.6)"; for (let i = 0; i < Math.min(100, v) / 8; i++) { ctx.beginPath(); ctx.arc(215 + (i * 13) % 50, 100 + (i * 7) % 18, 3 + (i % 3), 0, Math.PI * 2); ctx.fill(); } }
    if ((stage === "bloom" && ex) || stage === "pour") { const a = stage === "pour" ? extra : 0, kx = 240 + Math.cos(a) * 28, ky = 98 + Math.sin(a) * 8;
      ctx.strokeStyle = "rgba(200,225,240,.95)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(kx - 40, 22); ctx.quadraticCurveTo(kx - 10, 40, kx, ky); ctx.stroke();
      ctx.fillStyle = "#b4b8bd"; ctx.save(); ctx.translate(kx - 70, 18); ctx.rotate(.5); rr(-26, -16, 52, 34, 8); ctx.fill(); ctx.restore(); }
    if (sh) { ctx.restore(); scale(330, 176, v, Z, "g", 30); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center";
    ctx.fillText({ dose: "orta-ince çekim · kadran koyu yeşilde bırak", bloom: "az suyla ıslat, kahve kabarsın (bloom) · %" + Math.round(Math.min(100, v)), pour: "merkezden dışa daire çizerek dök · tur " + Math.min(3, Math.floor(v / 33.4)) + "/3" }[stage], 240, 240);
  }
  // ---- §3 dünya kahveleri: tek fonksiyonda gerçekçi yakın planlar (kind'a göre)
  function glassCup(x, y, w, h, fill, layers, ice) {                            // şeffaf bardak + katmanlar + buz
    ice = Math.max(0, Math.min(12, Math.round(num(ice)))); layers = Array.isArray(layers) ? layers.filter(l => Array.isArray(l) && Number.isFinite(l[1])) : [];
    ctx.fillStyle = "rgba(220,235,240,.35)"; ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w / 2 - 8, y); ctx.lineTo(x - w / 2 + 8, y); ctx.closePath(); ctx.fill();
    let yy = y; (layers || []).forEach(([col, f]) => { const hh = h * f; ctx.fillStyle = col; ctx.fillRect(x - w / 2 + 9, yy - hh, w - 18, hh); yy -= hh; });
    for (let i = 0; i < (ice || 0); i++) { ctx.fillStyle = "rgba(240,250,255,.75)"; rr(x - w / 2 + 12 + (i * 23) % (w - 40), y - 20 - Math.floor(i * 23 / (w - 40)) * 18 - (i % 2) * 6, 18, 16, 3); ctx.fill(); ctx.strokeStyle = "rgba(160,200,215,.8)"; ctx.stroke(); }
    ctx.strokeStyle = "rgba(150,180,190,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x - w / 2 + 8, y); ctx.lineTo(x + w / 2 - 8, y); ctx.lineTo(x + w / 2, y - h); ctx.stroke();
  }
  function label(t) { ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(t, 240, 240); }
  function timerDial(cx, cy, R, v, Z, total) { v = num(v); total = num(total, 60); ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8d8f93"; ctx.lineWidth = 3; ctx.stroke();
    arcZones(cx, cy, R - 6, 12, -Math.PI / 2, Math.PI * 1.5, Z); const a = -Math.PI / 2 + Math.min(100, v) / 100 * Math.PI * 2;
    ctx.strokeStyle = "#111"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10)); ctx.stroke(); ctx.lineCap = "butt";
    const sec = Math.round(v / 100 * total); ctx.fillStyle = "#2b2117"; ctx.font = "700 14px monospace"; ctx.textAlign = "center"; ctx.fillText(Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"), cx, cy + R + 24); }
  const hx = c => { c = String(c || "#000").replace("#", ""); if (c.length === 3) c = c.split("").map(q => q + q).join(""); const n = parseInt(c.slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); t = Math.max(0, Math.min(1, num(t))); return "rgb(" + A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",") + ")"; };
  function lemonWheel(x, y, r, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = "#e9c72c"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fbf3c0"; ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f4dc5a"; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r - 5, i * Math.PI / 4 + .08, (i + 1) * Math.PI / 4 - .08); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "#c9ccd0"; ctx.fillRect(-1, r - 10, 2, 10); ctx.restore(); }
  function lemonPeel(x, y, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = "#f2d64b"; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.bezierCurveTo(-14, -14, 14, 8, 30, -6); ctx.lineTo(30, 4); ctx.bezierCurveTo(14, 18, -14, -4, -30, 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#c9a51c"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(-18, -2, 20, 2); ctx.restore(); }
  function kit(kind, v, p) { v = num(v); p = obj(p); bg(); shadow(240, H - 64, 80, 10); const Z = p.Z, col = p.color || "#c9772b";
    if (kind === "pump") { glassCup(170, 200, 90, 110, null, [[col, Math.min(1, (p.n || 0) / Math.max(1, p.N)) * .25]]);
      ctx.fillStyle = lg(270, 0, 330, 0, [[0, "#6a4a2a"], [.5, "#b07a48"], [1, "#6a4a2a"]]); rr(270, 90, 60, 110, 10); ctx.fill(); ctx.fillStyle = col; rr(278, 120, 44, 60, 6); ctx.fill();
      const press = p.flash ? 10 : 0; ctx.fillStyle = "#2b2b30"; ctx.fillRect(296, 50 + press, 8, 42); rr(276, 44 + press, 48, 12, 5); ctx.fill(); ctx.fillRect(240, 68 + press, 60, 6);
      ctx.fillStyle = "#2b2117"; ctx.font = "800 26px system-ui"; ctx.textAlign = "center"; ctx.fillText((p.n || 0) + " / " + p.N, 410, 130); return label("POMPALA'ya " + p.N + " kez bas · " + (p.name || "şurup")); }
    if (kind === "drizzle" || kind === "cream") {
      if (p.glass) { ctx.fillStyle = "rgba(225,238,244,.6)"; ctx.beginPath(); ctx.arc(240, 128, 90, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(150,180,190,.95)"; ctx.lineWidth = 3; ctx.stroke();   // v0.24: buzlu şeffaf bardak (üstten)
        ctx.fillStyle = rg(240, 128, 6, 80, [[0, "#b98a5e"], [1, "#7a4a2a"]]); ctx.beginPath(); ctx.arc(240, 128, 80, 0, Math.PI * 2); ctx.fill();
        [[200, 98, .3], [272, 104, -.4], [214, 160, .9], [262, 158, .2], [238, 128, -.2], [180, 132, .6], [298, 134, 1.1]].forEach(([x, y, a]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = "rgba(240,250,255,.55)"; rr(-14, -13, 28, 26, 5); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); });
        ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(240, 128, 86, 3.6, 4.6); ctx.stroke(); }
      else { ctx.fillStyle = rg(236, 128, 10, 90, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 128, 88, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = kind === "cream" ? "#e8d6bd" : "#f2e6d4"; ctx.beginPath(); ctx.arc(240, 128, 74, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = kind === "cream" ? "#fffaf0" : col; ctx.lineWidth = kind === "cream" ? 14 : 4; ctx.lineCap = "round"; ctx.beginPath(); const turns = v / 100 * 4 * Math.PI;
      for (let a = 0; a <= turns; a += .1) { const r = kind === "cream" ? 60 - a * 4 : 64 - (a % (Math.PI * 2)) * 2 - Math.floor(a / Math.PI / 2) * 14; const x = 240 + Math.cos(a) * Math.max(4, r), y = 128 + Math.sin(a) * Math.max(4, r); a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.lineCap = "butt";
      const ex = 240 + Math.cos(num(p.ang)) * 50, ey = 128 + Math.sin(num(p.ang)) * 50; ctx.fillStyle = kind === "cream" ? "#c9ccd0" : col; rr(ex - 12, ey - 70, 24, 60, 8); ctx.fill();
      return label(kind === "cream" ? "sifonla daire çizerek krema sık" : "üstüne daire çizerek sos gezdir"); }
    if (kind === "scoop" || kind === "pourshot") { const NB = Math.max(1, Math.min(3, Math.round(num(p.N, 1)) || 1));      // v0.24: cam kup (yandan)
      ctx.fillStyle = "rgba(220,235,240,.35)"; ctx.beginPath(); ctx.ellipse(240, 118, 98, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(220,235,240,.6)"; ctx.fillRect(236, 168, 8, 32); ctx.beginPath(); ctx.ellipse(240, 202, 42, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(150,180,190,.9)"; ctx.lineWidth = 2; ctx.stroke();
      const balls = kind === "scoop" ? Math.min(NB, Math.floor(v / 100 * NB + .02)) : NB; for (let i = 0; i < balls; i++) { const bx = 220 + i * 40 - (balls - 1) * 20 + 20; ctx.fillStyle = rg(bx - 6, 112, 5, 34, [[0, "#fffbf0"], [1, "#e9dcbc"]]); ctx.beginPath(); ctx.arc(bx, 122, 30, 0, Math.PI * 2); ctx.fill(); }
      if (kind === "pourshot") { const k = Math.max(0, Math.min(1, v / 100)); ctx.fillStyle = "rgba(74,40,18,.85)"; ctx.beginPath(); ctx.ellipse(240, 108, 56 * k, 14 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(240, 152, 80 * k, 10 * k, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "rgba(220,235,240,.42)"; ctx.beginPath(); ctx.moveTo(142, 118); ctx.quadraticCurveTo(148, 170, 240, 170); ctx.quadraticCurveTo(332, 170, 338, 118); ctx.ellipse(240, 118, 98, 14, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(150,180,190,.95)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(240, 118, 98, 14, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(142, 118); ctx.quadraticCurveTo(148, 170, 240, 170); ctx.quadraticCurveTo(332, 170, 338, 118); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(160, 128); ctx.quadraticCurveTo(168, 156, 196, 164); ctx.stroke();
      if (kind === "scoop") { ctx.save(); ctx.translate(330, 80); ctx.rotate(.6 - v / 200); ctx.fillStyle = "#c9ccd0"; rr(-5, -60, 10, 70, 4); ctx.fill(); ctx.beginPath(); ctx.arc(0, 18, 18, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return label("kepçeyi basılı tut · dondurma topu"); }
      ctx.save(); ctx.translate(320, 60); ctx.rotate(.7); ctx.fillStyle = "#fbfaf8"; rr(-22, -18, 44, 36, 8); ctx.fill(); ctx.restore(); if (v < 100) { ctx.strokeStyle = "rgba(74,40,18,.95)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(300, 74); ctx.quadraticCurveTo(270, 100, 250, 120); ctx.stroke(); }
      return label("sıcak espressoyu dondurmanın üstüne dök · %" + Math.round(v)); }
    if (kind === "garnish") { const f = Math.max(0, Math.min(100, v)) / 100;                // v0.24: yandan bardak/fincan, limon kenara
      if (p.glass) { glassCup(240, 206, 112, 148, null, [["#3a2010", .66]], 5); ctx.fillStyle = "rgba(160,110,70,.5)"; ctx.fillRect(193, 206 - 148 * .66, 94, 4);
        lemonWheel(390 - f * 100, 52 + f * 4, 22, -.6 + f * .6); ctx.strokeStyle = "rgba(150,180,190,.95)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(272, 58); ctx.lineTo(304, 58); ctx.stroke(); }
      else { ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(240, 200, 84, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = lg(160, 0, 320, 0, [[0, "#d8d3cc"], [.35, "#fbfaf8"], [1, "#c9c3bb"]]); ctx.beginPath(); ctx.ellipse(240, 196, 82, 10, 0, 0, Math.PI * 2); ctx.fill();   // tabak
        ctx.beginPath(); ctx.moveTo(184, 118); ctx.lineTo(296, 118); ctx.quadraticCurveTo(294, 184, 262, 192); ctx.lineTo(218, 192); ctx.quadraticCurveTo(186, 184, 184, 118); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#d8d3cc"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(298, 148, 17, -1.2, 1.2); ctx.stroke();
        ctx.fillStyle = "#3b1f0e"; ctx.beginPath(); ctx.ellipse(240, 120, 54, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(196,138,74,.55)"; ctx.beginPath(); ctx.ellipse(240, 120, 44, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#efeae2"; ctx.fillRect(184, 115, 112, 3);
        if (f >= 1) { ctx.fillStyle = "rgba(242,214,75,.55)"; ctx.fillRect(196, 114, 72, 4); ctx.fillStyle = "rgba(255,240,150,.8)"; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(208 + i * 8, 106 - (i % 3) * 3, 1.2, 0, Math.PI * 2); ctx.fill(); } }   // kenara sürülen kabuk yağı
        lemonPeel(392 - f * 160, 74 + f * 32, -.6 + f * .6); }
      return label("LİMON'a dokun · kabuğu kenara sür"); }
    if (["ice", "coldwater", "coldmilk", "tonic", "coldpour", "spoontop"].includes(kind)) { const f = Math.min(1, v / 100), ice = p.ice || (kind === "ice" ? Math.round(f * 6) : 6);
      const L = kind === "coldmilk" ? [["#f4efe6", f * .55]] : kind === "coldwater" ? [["rgba(190,220,235,.6)", f * .5]] : kind === "tonic" ? [["rgba(225,245,250,.8)", f * .55]] : kind === "coldpour" ? [["#3a2010", f * .7]] : kind === "spoontop" ? [["#f4efe6", .55], ["#c08a4a", f * .2]] : [];
      glassCup(240, 205, 120, 150, null, L, ice);
      if (kind === "tonic" || kind === "coldpour" || kind === "coldmilk" || kind === "coldwater") { if (v < 100 && p.run) { ctx.strokeStyle = kind === "coldpour" ? "rgba(58,32,16,.9)" : "rgba(230,240,245,.9)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(300, 30); ctx.quadraticCurveTo(270, 60, 255, 120); ctx.stroke(); } }
      return label({ ice: "BUZ'a bas · bardağa buz koy (" + Math.round(f * (p.N || 3)) + "/" + (p.N || 3) + ")", coldwater: "basılı tut · soğuk su dök", coldmilk: "basılı tut · soğuk süt dök", tonic: "basılı tut · toniği yavaşça dök", coldpour: "basılı tut · cold brew dök", spoontop: "basılı tut · köpüğü kaşıkla koy" }[kind]); }
    if (kind === "whisk" && ["dalgona", "cubano", "egg"].includes(p.bowl)) { const k = Math.max(0, Math.min(100, v)) / 100, a = num(p.ang), NN = Math.max(1, Math.round(num(p.N, 5)) || 5), b = p.bowl;
      if (b === "cubano") { ctx.fillStyle = lg(150, 0, 330, 0, [[0, "#8e9296"], [.3, "#f2f4f6"], [.65, "#b4b8bd"], [1, "#7c8085"]]); ctx.beginPath(); ctx.arc(240, 125, 80, 0, Math.PI * 2); ctx.fill();   // küçük çelik sürahi
        ctx.fillStyle = "#aeb2b7"; ctx.beginPath(); ctx.moveTo(312, 105); ctx.lineTo(344, 125); ctx.lineTo(312, 145); ctx.fill(); ctx.fillStyle = "#6f7378"; ctx.beginPath(); ctx.arc(240, 125, 68, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = mix("#efe6d6", "#c99a62", k); ctx.beginPath(); ctx.arc(240, 125, 60, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.9)"; for (let i = 0; i < 60 * (1 - k); i++) { ctx.fillRect(240 + Math.cos(i * 2.4) * Math.sqrt(i / 60) * 54, 125 + Math.sin(i * 2.4) * Math.sqrt(i / 60) * 54, 2, 2); }   // şeker
        ctx.fillStyle = "rgba(70,36,14,.8)"; for (let i = 0; i < 6 * (1 - k); i++) { ctx.beginPath(); ctx.arc(226 + (i * 17) % 34, 112 + (i * 11) % 28, 5, 0, Math.PI * 2); ctx.fill(); }   // ilk espresso damlaları
        ctx.fillStyle = "rgba(240,215,175,.6)"; for (let i = 0; i < 30 * k; i++) { ctx.beginPath(); ctx.arc(240 + Math.cos(i * 2.1 + a) * (8 + i * 1.6), 125 + Math.sin(i * 2.1 + a) * (8 + i * 1.6), 2 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
        const ex = 240 + Math.cos(a) * 34, ey = 125 + Math.sin(a) * 34; ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 110, ey - 95); ctx.stroke(); ctx.lineCap = "butt";
        ctx.fillStyle = "#c9ccd0"; ctx.beginPath(); ctx.ellipse(ex, ey, 10, 6, a, 0, Math.PI * 2); ctx.fill();
        return label("kaşıkla daire çizerek çırp · espuma açılıyor · tur " + Math.min(NN, Math.floor(k * NN)) + "/" + NN); }
      ctx.fillStyle = rg(240, 125, 10, 96, [[0, "#f6f1e8"], [1, "#c9c3bb"]]); ctx.beginPath(); ctx.arc(240, 125, 96, 0, Math.PI * 2); ctx.fill();
      const c0 = b === "dalgona" ? "#3a1d0c" : "#f0a420", c1 = b === "dalgona" ? "#d9a066" : "#f6e6a4";
      ctx.fillStyle = mix(c0, c1, k); ctx.beginPath(); ctx.arc(240, 125, 70, 0, Math.PI * 2); ctx.fill();
      if (b === "egg" && k < .8) { ctx.fillStyle = `rgba(243,227,195,${.85 * (1 - k / .8)})`; ctx.beginPath(); ctx.ellipse(262, 140, 26, 16, a, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgba(236,140,20,${.9 * (1 - k)})`; ctx.beginPath(); ctx.arc(222, 112, 16, 0, Math.PI * 2); ctx.fill(); }   // yoğunlaştırılmış süt + sarı
      ctx.strokeStyle = b === "dalgona" ? `rgba(255,236,200,${.15 + k * .5})` : `rgba(255,252,230,${.15 + k * .5})`; ctx.lineWidth = 3; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(240, 125, 10 + i * 8, a * 1.3 + i, a * 1.3 + i + 1.8); ctx.stroke(); }   // köpük tepecikleri
      ctx.fillStyle = "rgba(255,248,230,.55)"; for (let i = 0; i < 28 * k; i++) { ctx.beginPath(); ctx.arc(240 + Math.cos(i * 2.4) * Math.sqrt(i / 28) * 60, 125 + Math.sin(i * 2.4) * Math.sqrt(i / 28) * 60, 2 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
      const ex = 240 + Math.cos(a) * 40, ey = 125 + Math.sin(a) * 40; ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(ex, ey, 10 + i * 2, 16, i * .3, 0, Math.PI * 2); ctx.stroke(); }
      return label((b === "dalgona" ? "kasede daire çizerek çırp · dalgona köpürüyor" : "sarıyı sütle çırp · krema açılıyor") + " · tur " + Math.min(NN, Math.floor(k * NN)) + "/" + NN); }
    if (kind === "whisk") { ctx.fillStyle = rg(240, 125, 10, 96, [[0, "#f6f1e8"], [1, "#c9c3bb"]]); ctx.beginPath(); ctx.arc(240, 125, 96, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgb(${Math.round(90 + v * 1.3)},${Math.round(50 + v * .9)},${Math.round(20 + v * .5)})`; ctx.beginPath(); ctx.arc(240, 125, 70, 0, Math.PI * 2); ctx.fill();
      const ex = 240 + Math.cos(p.ang || 0) * 40, ey = 125 + Math.sin(p.ang || 0) * 40; ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(ex, ey, 10 + i * 2, 16, i * .3, 0, Math.PI * 2); ctx.stroke(); }
      return label("kasede daire çizerek çırp · köpük açılıyor · tur " + Math.min(p.N || 5, Math.floor(v / 100 * (p.N || 5))) + "/" + (p.N || 5)); }
    if (kind === "blend") { ctx.fillStyle = "rgba(220,235,240,.45)"; ctx.beginPath(); ctx.moveTo(180, 40); ctx.lineTo(300, 40); ctx.lineTo(285, 180); ctx.lineTo(195, 180); ctx.closePath(); ctx.fill();
      const t = Math.min(1, v / 100), shake = p.run ? Math.sin(Date.now() / 30) * 2 : 0; ctx.fillStyle = `rgb(${Math.round(150 + t * 60)},${Math.round(110 + t * 50)},${Math.round(80 + t * 40)})`; ctx.fillRect(196 + shake, 90, 88, 88);
      if (t < .7) for (let i = 0; i < 10 * (1 - t); i++) { ctx.fillStyle = "rgba(240,250,255,.85)"; rr(200 + (i * 17) % 70 + shake, 100 + (i * 13) % 60, 14, 12, 2); ctx.fill(); }
      ctx.fillStyle = "#2b2b30"; rr(175, 180, 130, 34, 8); ctx.fill(); vZones(330, 40, 200, 12, Z); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.strokeRect(330, 40, 12, 160);
      const yy = 200 - Math.min(100, v) / 100 * 160; ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(324, yy); ctx.lineTo(330, yy - 5); ctx.lineTo(330, yy + 5); ctx.fill();
      return label(p.run ? "blender çalışıyor · doku koyu yeşildeyken DURDUR" : "blenderi ÇALIŞTIR"); }
    if (kind === "shakeit") { const px = p.x == null ? 50 : clamp(p.x, 0, 100, 50), x = 120 + px / 100 * 240; ctx.save(); ctx.translate(x, 120); ctx.rotate((x - 240) / 400);
      ctx.fillStyle = lg(-30, 0, 30, 0, [[0, "#8e9296"], [.4, "#f2f4f6"], [1, "#7c8085"]]); rr(-30, -70, 60, 140, 14); ctx.fill(); ctx.fillStyle = "#6f7378"; rr(-24, -88, 48, 22, 8); ctx.fill();
      if (p.ice) { const n = p.ice === true ? 4 : Math.max(1, Math.min(8, Math.round(num(p.ice, 4)))), t = Date.now() / 70;      // v0.24: içinde şıngırdayan buz (cam alt hazne)
        ctx.fillStyle = "rgba(205,225,235,.85)"; rr(-27, -6, 54, 72, 12); ctx.fill(); ctx.fillStyle = "rgba(150,95,50,.75)"; rr(-25, 40, 50, 24, 10); ctx.fill();
        for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(-14 + (i % 3) * 14 + Math.sin(t + i * 2 + px * .2) * 3, 50 - Math.floor(i / 3) * 16 - Math.abs(Math.cos(t * 1.3 + i)) * 6); ctx.rotate(Math.sin(t + i) * .5); ctx.fillStyle = "rgba(245,252,255,.9)"; rr(-7, -6, 14, 12, 3); ctx.fill(); ctx.strokeStyle = "rgba(140,185,205,.9)"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-20, 56); ctx.stroke(); ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; rr(-27, -6, 54, 72, 12); ctx.stroke(); }
      ctx.restore();
      if (p.ice) { ctx.strokeStyle = "rgba(43,33,23,.35)"; ctx.lineWidth = 2; [-1, 1].forEach(s => { for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x + s * (42 + j * 7), 100 + j * 14); ctx.lineTo(x + s * (50 + j * 7), 94 + j * 14); ctx.stroke(); } }); }
      ctx.fillStyle = "#c08a4a"; ctx.fillRect(70, 210, 340 * Math.min(1, v / 100), 8); return label("shaker'ı sağa-sola kaydırarak sertçe çalkala"); }
    if (kind === "mokafill" || kind === "mokaheat") { const x = 220; ctx.fillStyle = lg(x - 50, 0, x + 50, 0, [[0, "#8e9296"], [.35, "#eef0f2"], [1, "#7c8085"]]);
      ctx.beginPath(); ctx.moveTo(x - 40, 200); ctx.lineTo(x + 40, 200); ctx.lineTo(x + 30, 140); ctx.lineTo(x - 30, 140); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 30, 130); ctx.lineTo(x + 30, 130); ctx.lineTo(x + 42, 60); ctx.lineTo(x - 42, 60); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2b2b30"; ctx.beginPath(); ctx.moveTo(x + 40, 70); ctx.quadraticCurveTo(x + 80, 80, x + 44, 120); ctx.lineWidth = 8; ctx.strokeStyle = "#2b2b30"; ctx.stroke();
      if (kind === "mokafill") { ctx.fillStyle = "rgba(160,200,230,.85)"; const h = Math.min(100, v) / 100 * 56; ctx.fillRect(x - 36, 198 - h, 72, h); vZones(x + 60, 142, 198, 10, Z); ctx.fillStyle = "#b5533c"; ctx.beginPath(); ctx.arc(x + 34, 160, 4, 0, Math.PI * 2); ctx.fill(); return label("alt hazneye vanaya kadar su · koyu yeşilde bırak"); }
      ctx.fillStyle = "#2b2b30"; rr(140, 202, 160, 12, 4); ctx.fill(); if (p.run) for (let i = 0; i < 7; i++) { ctx.fillStyle = `rgba(80,140,255,${.5 + .3 * Math.sin(Date.now() / 90 + i)})`; ctx.beginPath(); ctx.ellipse(186 + i * 11, 200, 3, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      const k = Math.min(100, v); if (k > 40) { ctx.fillStyle = "#4a2a14"; ctx.beginPath(); ctx.ellipse(x, 66, 30, 6 + (k - 40) * .08, 0, 0, Math.PI * 2); ctx.fill(); } if (k > 90) { ctx.fillStyle = "rgba(74,40,18,.8)"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x - 20 + i * 8, 54 - (i % 3) * 6, 3, 0, Math.PI * 2); ctx.fill(); } }
      vZones(330, 40, 200, 12, Z); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.strokeRect(330, 40, 12, 160); const yy = 200 - k / 100 * 160; ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(324, yy); ctx.lineTo(330, yy - 5); ctx.lineTo(330, yy + 5); ctx.fill();
      return label(p.run ? "kahve yükseliyor… fokurdama başlayınca, püskürmeden OCAKTAN AL" : "moka potu OCAĞA KOY"); }
    if (kind === "apsteep" || kind === "phin") { if (kind === "phin") { glassCup(200, 205, 90, 100, null, [[p.color || "#f3e3c3", .2], ["#3a2010", Math.min(1, v / 100) * .5]]); ctx.fillStyle = "#b4b8bd"; rr(160, 70, 80, 36, 6); ctx.fill(); ctx.fillRect(150, 104, 100, 6);
        if (p.run) for (let i = 0; i < 3; i++) { ctx.fillStyle = "#3a2010"; ctx.beginPath(); ctx.arc(200, 118 + ((Date.now() / 8 + i * 25) % 70), 2.5, 0, Math.PI * 2); ctx.fill(); } }
      else { ctx.fillStyle = "rgba(220,235,240,.5)"; rr(170, 50, 60, 140, 6); ctx.fill(); ctx.fillStyle = "#5a3418"; ctx.fillRect(172, 110, 56, 78); ctx.fillStyle = "#2b2b30"; rr(160, 186, 80, 14, 4); ctx.fill(); }
      timerDial(360, 110, 52, v, Z, kind === "phin" ? 360 : 180); return label(kind === "phin" ? "damla damla · damlama bitince (4:00) DURDUR" : "1,5 dakika demle · saat koyu yeşildeyken DURDUR"); }
    if (kind === "appress" || kind === "siphondrop") { if (kind === "appress") { ctx.fillStyle = "rgba(220,235,240,.5)"; rr(200, 60, 80, 120, 6); ctx.fill(); ctx.fillStyle = "#5a3418"; const t = Math.min(1, v / 100); ctx.fillRect(202, 60 + t * 100, 76, 120 - t * 100);
        ctx.fillStyle = "#2b2b30"; rr(196, 30 + t * 100, 88, 30, 6); ctx.fill(); glassCup(240, 230, 100, 50, null, [["#5a3418", t * .7]]); return label("pistonu yavaşça bastır · %" + Math.round(v)); }
      ctx.fillStyle = "rgba(220,235,240,.5)"; ctx.beginPath(); ctx.arc(240, 170, 40, 0, Math.PI * 2); ctx.fill(); rr(220, 40, 40, 90, 10); ctx.fill(); const t = Math.min(1, v / 100);
      ctx.fillStyle = "#4a2a14"; ctx.fillRect(222, 50 + t * 78, 36, 78 - t * 78); ctx.beginPath(); ctx.arc(240, 170, 38 * t, 0, Math.PI * 2); ctx.fill(); return label("ateş kesildi · kahve süzülerek iniyor · %" + Math.round(v)); }
    if (kind === "siphonheat") { ctx.fillStyle = "rgba(220,235,240,.5)"; ctx.beginPath(); ctx.arc(220, 170, 40, 0, Math.PI * 2); ctx.fill(); rr(200, 40, 40, 90, 10); ctx.fill(); const t = Math.min(100, v) / 100;
      ctx.fillStyle = "rgba(160,200,230,.9)"; ctx.beginPath(); ctx.arc(220, 170, 38 * (1 - t), 0, Math.PI * 2); ctx.fill(); ctx.fillRect(202, 128 - t * 78, 36, t * 78);
      if (p.run) { ctx.fillStyle = "rgba(80,140,255,.7)"; ctx.beginPath(); ctx.moveTo(210, 228); ctx.lineTo(220, 205); ctx.lineTo(230, 228); ctx.fill(); }
      vZones(300, 40, 200, 12, Z); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.strokeRect(300, 40, 12, 160); const yy = 200 - t * 160; ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(294, yy); ctx.lineTo(300, yy - 5); ctx.lineTo(300, yy + 5); ctx.fill();
      return label(p.run ? "su üst hazneye çıkıyor · koyu yeşilde ATEŞİ KES" : "ATEŞİ AÇ"); }
    if (kind === "nitrotap") { const t = Math.max(0, Math.min(100, v)) / 100, run = !!p.run, gT = 88, gB = 212, lt = gB - t * (gB - gT);   // v0.24: duvara monte stout musluğu + pint bardak
      ctx.fillStyle = lg(0, 0, 0, 50, [[0, "#4a4038"], [1, "#2e2822"]]); rr(110, 30, 260, 22, 6); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(110, 30, 260, 3);   // duvar rafı
      ctx.fillStyle = rg(140, 58, 2, 16, [[0, "#f4f5f6"], [1, "#8e9296"]]); ctx.beginPath(); ctx.arc(140, 60, 15, 0, Math.PI * 2); ctx.fill(); steel(140, 54, 100, 12, 6);   // duvar flanşı + şaft
      ctx.save(); ctx.translate(240, 54); ctx.rotate(run ? -.45 : 0); ctx.fillStyle = lg(-10, 0, 10, 0, [[0, "#0e0e10"], [.5, "#3a3a40"], [1, "#0e0e10"]]); ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-10, -42); ctx.quadraticCurveTo(0, -54, 10, -42); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();   // uzun kol
      ctx.fillStyle = "#c9a14f"; rr(-8, -34, 16, 11, 2); ctx.fill(); ctx.fillStyle = "#1a1a1d"; ctx.font = "700 7px system-ui"; ctx.textAlign = "center"; ctx.fillText("N₂", 0, -26); ctx.restore();
      steel(226, 50, 28, 22, 8); steel(234, 70, 12, 14, 3);                                                                     // musluk gövdesi + ağız
      const GP = () => { ctx.beginPath(); ctx.moveTo(196, gT); ctx.lineTo(284, gT); ctx.quadraticCurveTo(292, gT + 18, 282, gT + 32); ctx.lineTo(270, gB); ctx.lineTo(210, gB); ctx.lineTo(198, gT + 32); ctx.quadraticCurveTo(188, gT + 18, 196, gT); ctx.closePath(); };
      GP(); ctx.fillStyle = "rgba(220,235,240,.35)"; ctx.fill();
      if (t > 0) { ctx.save(); GP(); ctx.clip(); ctx.fillStyle = "#1a0d05"; ctx.fillRect(186, lt, 110, gB - lt + 2);
        if (run) { ctx.fillStyle = lg(0, lt, 0, Math.min(gB, lt + 90), [[0, "rgba(196,160,122,.92)"], [.55, "rgba(120,82,52,.6)"], [1, "rgba(26,13,5,0)"]]); ctx.fillRect(186, lt, 110, Math.min(gB, lt + 90) - lt);   // Guinness dalgası
          ctx.fillStyle = "rgba(235,215,185,.7)"; const d = Math.max(1, gB - lt); for (let i = 0; i < 30; i++) { const yy = lt + (Date.now() / 22 + i * 19) % d, side = i % 2 ? 1 : -1, wx = 240 + side * (28 + (yy - gT) / (gB - gT) * -6 + (i % 3) * 3); ctx.beginPath(); ctx.arc(wx, yy, 1.3, 0, Math.PI * 2); ctx.fill(); } }
        const hh = Math.min(16, 3 + t * 14); ctx.fillStyle = lg(0, lt, 0, lt + hh, [[0, "#f8eed8"], [1, "#d9c09a"]]); ctx.fillRect(186, lt, 110, hh); ctx.restore(); }   // kremsi köpük başlığı
      GP(); ctx.strokeStyle = "rgba(150,180,190,.95)"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(204, gT + 36, 4, gB - gT - 48);
      if (run && t < 1) { ctx.strokeStyle = "rgba(70,45,28,.9)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(240, 84); ctx.lineTo(240, lt); ctx.stroke(); }
      vZones(320, gT, gB, 12, Z); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1; ctx.strokeRect(320, gT, 12, gB - gT); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(314, lt); ctx.lineTo(320, lt - 5); ctx.lineTo(320, lt + 5); ctx.fill();
      return label("musluğu basılı tut · köpük çizgisi koyu yeşildeyken bırak"); }
    // >>> v0.24 yeni kit türleri (tkserve, coldfoam, colddrip, tumbler, cloth, steepcup, dust) lead dev tarafından buraya eklenecek <<<
    // ===== v0.24 yeni hareketler (baş geliştirici): tkserve, coldfoam, colddrip, tumbler, cloth, steepcup, dust =====
    if (kind === "tkserve") {                                                     // Türk kahvesi servisi: tepsi + fincan, su, lokum
      const N = Math.max(1, num(p.N, 3)), n = clamp(p.n, 0, N, 0);
      ctx.fillStyle = lg(0, 170, 0, 200, [[0, "#c9a067"], [1, "#8a6236"]]); ctx.beginPath(); ctx.ellipse(240, 182, 170, 26, 0, 0, Math.PI * 2); ctx.fill();   // pirinç tepsi
      ctx.strokeStyle = "rgba(90,60,25,.6)"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "rgba(255,240,200,.25)"; ctx.beginPath(); ctx.ellipse(240, 178, 150, 18, 0, 0, Math.PI * 2); ctx.fill();
      if (n >= 1) { ctx.fillStyle = "#f7f3ec"; ctx.beginPath(); ctx.ellipse(170, 178, 44, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#c8a24a"; ctx.lineWidth = 2; ctx.stroke();   // fincan + tabak
        ctx.fillStyle = lg(140, 0, 200, 0, [[0, "#e9e3d8"], [.5, "#ffffff"], [1, "#d8d1c4"]]); ctx.beginPath(); ctx.moveTo(144, 128); ctx.lineTo(196, 128); ctx.lineTo(190, 172); ctx.lineTo(150, 172); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#c8a24a"; ctx.beginPath(); ctx.moveTo(144, 132); ctx.lineTo(196, 132); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = "#e9e3d8"; ctx.beginPath(); ctx.arc(200, 148, 9, -1.2, 1.2); ctx.stroke();
        ctx.fillStyle = "#c9a173"; ctx.beginPath(); ctx.ellipse(170, 129, 25, 4, 0, 0, Math.PI * 2); ctx.fill(); }   // köpük
      if (n >= 2) { glassCup(262, 178, 40, 62, null, [["rgba(190,220,235,.7)", .8]]); }   // bir bardak su
      if (n >= 3) { ctx.fillStyle = "#f7f3ec"; ctx.beginPath(); ctx.ellipse(330, 176, 30, 7, 0, 0, Math.PI * 2); ctx.fill();   // lokum tabağı
        [[318, 162], [340, 160], [329, 150]].forEach(([x, y]) => { ctx.fillStyle = "#e7889a"; rr(x - 9, y - 7, 18, 14, 3); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.75)"; for (let i = 0; i < 5; i++) ctx.fillRect(x - 7 + (i * 5) % 14, y - 6 + (i * 7) % 12, 1.5, 1.5); }); }
      ctx.fillStyle = "#2b2117"; ctx.font = "800 22px system-ui"; ctx.textAlign = "center"; ctx.fillText(Math.round(n) + " / " + N, 420, 80);
      return label("SERVİS'e bas · fincan, su, lokum (" + Math.round(n) + "/" + N + ")"); }
    if (kind === "coldfoam") {                                                    // kavanozda soğuk süt + el köpürtücü
      const t = clamp(v, 0, 100, 0) / 100, run = !!p.run, jx = 220, top = 70, bot = 196;
      ctx.fillStyle = "rgba(220,235,240,.4)"; rr(jx - 46, top, 92, bot - top, 10); ctx.fill(); ctx.strokeStyle = "rgba(150,180,190,.9)"; ctx.lineWidth = 2; ctx.stroke();
      const milkH = 70 * (1 - .25 * t), foamH = 12 + 60 * t;
      ctx.fillStyle = "#f4efe6"; ctx.fillRect(jx - 42, bot - 4 - milkH, 84, milkH);
      ctx.fillStyle = lg(0, bot - 4 - milkH - foamH, 0, bot - 4 - milkH, [[0, "#ffffff"], [1, "#efe8dc"]]); ctx.fillRect(jx - 42, bot - 4 - milkH - foamH, 84, foamH);
      for (let i = 0; i < 9 * t; i++) { ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(jx - 34 + (i * 19) % 70, bot - 8 - milkH - foamH * ((i * .37) % 1), 3, 0, Math.PI * 2); ctx.fill(); }
      const sh = run ? Math.sin(Date.now() / 25) * 2 : 0;                        // köpürtücü
      ctx.fillStyle = "#2b2b30"; rr(jx - 9 + sh, 6, 18, 56, 6); ctx.fill(); ctx.fillStyle = "#c9ccd0"; ctx.fillRect(jx - 1.5 + sh, 60, 3, bot - 70 - milkH * .4);
      ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(jx + sh, bot - 12 - milkH * .4, 7, 0, Math.PI * 2); ctx.stroke();
      if (run) { ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(jx + sh, bot - 12 - milkH * .4, 10 + i * 5 + (Date.now() / 40 % 5), 0, Math.PI * 2); ctx.stroke(); } }
      ctx.fillStyle = "#2b2117"; ctx.font = "700 16px system-ui"; ctx.textAlign = "center"; ctx.fillText("köpük %" + Math.round(t * 100), 380, 110);
      return label("basılı tut · soğuk süt köpüğü"); }
    if (kind === "colddrip") {                                                    // Kyoto damla kulesi
      const t = clamp(v, 0, 100, 0) / 100, run = !!p.run, cx = 200;
      ctx.fillStyle = "#5a3a22"; ctx.fillRect(cx - 70, 4, 8, 206); ctx.fillRect(cx + 62, 4, 8, 206); ctx.fillRect(cx - 70, 4, 140, 8); ctx.fillRect(cx - 70, 202, 140, 10);   // ahşap çerçeve
      ctx.fillStyle = "rgba(220,235,240,.45)"; ctx.beginPath(); ctx.arc(cx, 40, 26, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(150,180,190,.9)"; ctx.lineWidth = 2; ctx.stroke();   // su küresi
      ctx.fillStyle = "rgba(160,200,230,.85)"; ctx.beginPath(); ctx.arc(cx, 40, 24 * (1 - t * .7), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b5533c"; ctx.fillRect(cx - 9, 66, 18, 6); ctx.fillStyle = "#2b2b30"; ctx.fillRect(cx - 2, 72, 4, 10);   // vana
      ctx.fillStyle = "rgba(220,235,240,.4)"; rr(cx - 16, 84, 32, 46, 4); ctx.fill(); ctx.fillStyle = "#4a2a14"; ctx.fillRect(cx - 14, 96, 28, 32);   // kahve yatağı
      ctx.strokeStyle = "rgba(150,180,190,.9)"; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 4; i++) ctx.ellipse(cx, 140 + i * 7, 12, 3, 0, 0, Math.PI * 2); ctx.stroke();   // spiral
      glassCup(cx, 200, 56, 48, null, [["#2a1408", t * .75]]);                     // sürahi
      if (run) for (let i = 0; i < 2; i++) { ctx.fillStyle = i ? "#3a2010" : "rgba(160,200,230,.95)"; const yy = i ? 170 + ((Date.now() / 12) % 20) : 82 + ((Date.now() / 12) % 12); ctx.beginPath(); ctx.arc(cx, yy, 2.5, 0, Math.PI * 2); ctx.fill(); }
      vZones(330, 40, 200, 12, p.Z); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1; ctx.strokeRect(330, 40, 12, 160); const yy = 200 - t * 160; ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(324, yy); ctx.lineTo(330, yy - 5); ctx.lineTo(330, yy + 5); ctx.fill();
      ctx.fillStyle = "#2b2117"; ctx.font = "600 13px system-ui"; ctx.textAlign = "left"; ctx.fillText(Math.round(t * 12) + " saat", 350, 120);
      return label(run ? "damla damla… koyu yeşilde VANAYI KAPAT" : "VANAYI AÇ"); }
    if (kind === "tumbler") {                                                     // dabara-tumbler: sütlü kahve iki kap arasında dökülür
      const t = clamp(v, 0, 100, 0) / 100, x = clamp(p.x, 0, 100, 50) / 100, hi = 60 + x * 50, lo = 168;
      ctx.fillStyle = lg(150, 0, 330, 0, [[0, "#8e9296"], [.4, "#eef0f2"], [1, "#7c8085"]]); ctx.beginPath(); ctx.moveTo(150, lo); ctx.lineTo(330, lo); ctx.lineTo(310, 200); ctx.lineTo(170, 200); ctx.closePath(); ctx.fill();   // dabara (geniş kâse)
      ctx.fillStyle = "#c9a173"; ctx.beginPath(); ctx.ellipse(240, lo, 88, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#efe2c9"; ctx.beginPath(); ctx.ellipse(240, lo - 1, 80 * (.3 + .7 * t), 7 * (.3 + .7 * t), 0, 0, Math.PI * 2); ctx.fill();   // köpük
      ctx.save(); ctx.translate(200 + x * 80, hi); ctx.rotate(-.9 + x * .4); ctx.fillStyle = lg(-22, 0, 22, 0, [[0, "#8e9296"], [.4, "#f2f4f6"], [1, "#7c8085"]]); ctx.beginPath(); ctx.moveTo(-22, -44); ctx.lineTo(22, -44); ctx.lineTo(18, 30); ctx.lineTo(-18, 30); ctx.closePath(); ctx.fill(); ctx.restore();   // tumbler
      ctx.strokeStyle = "rgba(201,161,115,.95)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(196 + x * 80, hi - 30); ctx.quadraticCurveTo(220 + x * 40, (hi + lo) / 2, 240, lo - 4); ctx.stroke();   // uzun döküm akışı
      ctx.fillStyle = "#c08a4a"; ctx.fillRect(70, 222, 340 * t, 6);
      return label("sağa-sola kaydır · dabara-tumbler ile köpürt"); }
    if (kind === "cloth") {                                                       // cafezinho: bez torba (coador) potaya süzer
      const t = clamp(v, 0, 100, 0) / 100, run = !!p.run;
      ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(240, 54, 44, 10, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "#6a4a2a"; rr(284, 48, 70, 10, 4); ctx.fill();   // tel çember + sap
      ctx.fillStyle = "#f1e8d6"; ctx.beginPath(); ctx.moveTo(196, 54); ctx.quadraticCurveTo(206, 140, 240, 146); ctx.quadraticCurveTo(274, 140, 284, 54); ctx.closePath(); ctx.fill();   // bez torba
      ctx.fillStyle = "rgba(90,52,24,.85)"; ctx.beginPath(); ctx.moveTo(208, 80 + t * 30); ctx.quadraticCurveTo(214, 134, 240, 140); ctx.quadraticCurveTo(266, 134, 272, 80 + t * 30); ctx.closePath(); ctx.fill();   // ıslak telve
      if (run) for (let i = 0; i < 3; i++) { ctx.fillStyle = "#3a2010"; ctx.beginPath(); ctx.arc(240, 150 + ((Date.now() / 9 + i * 12) % 30), 2.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = lg(196, 0, 284, 0, [[0, "#8e9296"], [.4, "#f2f4f6"], [1, "#7c8085"]]); rr(196, 176, 88, 34, 6); ctx.fill(); ctx.fillStyle = "#2b2b30"; rr(282, 184, 34, 6, 3); ctx.fill();   // pota
      ctx.fillStyle = "#2a1408"; ctx.fillRect(200, 206 - 26 * t, 80, 26 * t);
      return label("basılı tut · bezden süz · %" + Math.round(t * 100)); }
    if (kind === "steepcup") {                                                    // kopi tubruk: telveli bardağa kaynar su
      const t = clamp(v, 0, 100, 0) / 100, run = !!p.run;
      glassCup(240, 205, 100, 130, null, [["#4a2a14", .12 + .5 * t]]);
      for (let i = 0; i < 14; i++) { const a = i * 2.1 + (run ? Date.now() / 300 : 0), rr2 = 30 * (1 - t * .6); ctx.fillStyle = "rgba(40,22,10,.9)"; ctx.beginPath(); ctx.arc(240 + Math.cos(a) * rr2, 196 - 12 * t - Math.abs(Math.sin(a)) * 50 * t * (run ? 1 : .2), 2.2, 0, Math.PI * 2); ctx.fill(); }   // telve dönüp çöker
      ctx.save(); ctx.translate(330, 50); ctx.rotate(-.6); ctx.fillStyle = lg(-30, 0, 30, 0, [[0, "#8e9296"], [.4, "#eef0f2"], [1, "#7c8085"]]); rr(-30, -20, 60, 40, 8); ctx.fill(); ctx.fillRect(-48, -6, 20, 6); ctx.restore();   // kettle
      if (run && t < 1) { ctx.strokeStyle = "rgba(230,240,245,.9)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(296, 62); ctx.quadraticCurveTo(262, 70, 246, 205 - 130 * (.12 + .5 * t)); ctx.stroke(); }
      if (t > .3) { ctx.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(230 + i * 8, 60 - i * 10, 8 + i * 3, 4 + i, 0, 0, Math.PI * 2); ctx.fill(); } }
      return label("basılı tut · sıcak su dök · %" + Math.round(t * 100)); }
    if (kind === "dust") {                                                        // tarçın / kakao serpme (üstten fincan)
      const t = clamp(v, 0, 100, 0) / 100, x = 120 + clamp(p.x, 0, 100, 50) / 100 * 240, col = p.color || "#6b3e1e";
      ctx.fillStyle = rg(240, 128, 10, 90, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 128, 88, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f2e9da"; ctx.beginPath(); ctx.arc(240, 128, 72, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 160 * t; i++) { const a = i * 2.39996, r = 66 * Math.sqrt((i % 160) / 160); ctx.fillStyle = col; ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(240 + Math.cos(a) * r, 128 + Math.sin(a) * r, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(x, 40); ctx.rotate((x - 240) / 500); ctx.fillStyle = lg(-18, 0, 18, 0, [[0, "#8e9296"], [.4, "#f2f4f6"], [1, "#7c8085"]]); rr(-18, -30, 36, 46, 8); ctx.fill(); ctx.fillStyle = "#6f7378"; rr(-20, 14, 40, 8, 3); ctx.fill(); ctx.restore();
      ctx.fillStyle = col; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x - 10 + i * 4, 70 + ((Date.now() / 15 + i * 9) % 30), 1.4, 0, Math.PI * 2); ctx.fill(); }
      return label("sağa-sola kaydır · " + (p.name || "tarçın") + " serp"); }
    label(kind);
  }
  function cupTop(quality, milky, heart) { quality = num(quality); bg(); ctx.fillStyle = rg(236, 120, 10, 90, [[0, "#ffffff"], [1, "#d3cdc4"]]); ctx.beginPath(); ctx.arc(240, 125, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = milky ? rg(232, 118, 5, 74, [[0, "#f7f1e6"], [.7, "#e9dcc6"], [1, "#b8824a"]]) : quality < 60 ? rg(232, 118, 5, 74, [[0, "#c8a77e"], [.6, "#a8865e"], [1, "#6e5238"]]) : quality >= 90 ? rg(232, 118, 5, 74, [[0, "#d29a58"], [.55, "#a8652a"], [1, "#4a2610"]]) : rg(232, 118, 5, 74, [[0, "#d9a86a"], [.6, "#b77a3c"], [1, "#6a3d1a"]]);   // v0.40 §14: krema kaliteyi gösterir
    ctx.beginPath(); ctx.arc(240, 125, 74, 0, Math.PI * 2); ctx.fill();
    if (!milky && quality >= 90) { ctx.strokeStyle = "rgba(90,45,15,.35)"; ctx.lineWidth = 3; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(240, 125, 18 + i * 8, i * .7, i * .7 + 1.4); ctx.stroke(); } }   // kaplan deseni
    if (!milky && quality < 60) { ctx.fillStyle = "rgba(40,20,8,.35)"; ctx.beginPath(); ctx.arc(250, 132, 30, 0, Math.PI * 2); ctx.fill(); }   // incelmiş, yer yer delik krema
    if (!milky) { ctx.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(240 + Math.sin(i * 9.1) * 60, 125 + Math.cos(i * 4.7) * 60, 1 + (i % 3) * .6 * (quality / 100), 0, Math.PI * 2); ctx.fill(); } }
    if (heart) { heartShape(240, 122, 34, "#fffaf2"); heartShape(240, 122, 22, "rgba(233,214,190,.6)"); }
    ctx.fillStyle = "#2b2117"; ctx.font = "600 18px system-ui"; ctx.textAlign = "center"; if (!small) ctx.fillText("Kalite " + quality, 240, 235);
  }
  function served(id, quality) { quality = num(quality); bg(); if (window.DRINKART) DRINKART.render(ctx, id, { q: quality });   // v0.43 §16 tarifin kendi bitiş görseli
    ctx.fillStyle = "#2b2117"; ctx.font = "700 18px system-ui"; ctx.textAlign = "center"; if (!small) ctx.fillText("Kalite " + quality, 400, 40); }
  // v0.24: hiçbir çizim çağrısı hata fırlatmasın; çizim durumu her çağrıdan sonra geri yüklenir
  const safe = fn => function () { if (!ctx) return; ctx.save(); try { return fn.apply(null, arguments); } catch (e) { try { console.warn("CLOSEUP." + fn.name, e); } catch (_) {} } finally { try { ctx.restore(); } catch (_) {} } };
  const D = { zmeter, grind, dose, tamp, extract, milk, art, water, pressure, cocoa, shake, stir, swirl, pour, tkdose, cezveStir, cezveFoam, press, v60, kit, cupTop, served };
  const out = { init, setQuality }; Object.keys(D).forEach(k => { out[k] = safe(D[k]); });
  return out;
})();
