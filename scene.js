// scene.js – §11: tam ekran izometrik dükkan. Gerçekçi gölge/ışık, kodla çizilir (Blender render'ları gelince sprite'a döner).
// Sahne durumu: müşteriler iso koordinatta yürür (pos → target), uçuşan yazılar (fx) burada çizilir.
window.SCENE = (() => {
  const PAL = { wall: "#e6dccb", wallDark: "#c8bca8", oak: ["#a3784f", "#8d6440", "#7a5536"], counterTop: "#2f2219", counterFront: "#5b4231", steel: "#c9ccd0", steelDark: "#7d8187", shadow: "rgba(25,15,8,.38)" };
  const TYPE_COLOR = { business: ["#2e3442", "#1a1e28"], elder: ["#9a7f9a", "#6b566b"], student: ["#6f8a4a", "#4a6130"], geek: ["#8a5a3a", "#5a3a22"], regular: ["#a0493c", "#6c2f27"], nejla: ["#7a4f7a", "#4e2f4e"] };
  let cv, ctx, W, H, hits = [], TW = 40, TH = 20, OX = 0, OY = 0, time = 0;
  const COLS = 10, ROWS = 8;
  const DOOR = { x: 8.2, y: 0 };                 // sağ duvardaki kapı (iso koordinat)
  const QUEUE0 = { x: 3.0, y: 1.7 };             // kuyruk başı
  function init(canvas) { cv = canvas; ctx = cv.getContext("2d"); }
  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1); const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    W = w; H = h; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    TW = Math.min(64, W / (COLS + ROWS) * 1.9, H / (COLS + ROWS) * 3.4); TH = TW / 2;
    OX = W / 2 + (ROWS - COLS) * TW / 2 * 0; OY = H * 0.5 - (COLS + ROWS) * TH / 2 + 30;
  }
  const iso = (x, y, z = 0) => [OX + (x - y) * TW, OY + (x + y) * TH - z * (TW / 40)];
  function poly(pts, fill, stroke) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .6; ctx.stroke(); } }
  function prism(x, y, w, d, h, top, left, right, z0 = 0) {
    const zt = z0 + h, a = iso(x, y, zt), b = iso(x + w, y, zt), c = iso(x + w, y + d, zt), e = iso(x, y + d, zt);
    poly([e, c, iso(x + w, y + d, z0), iso(x, y + d, z0)], left); poly([c, b, iso(x + w, y, z0), iso(x + w, y + d, z0)], right); poly([a, b, c, e], top, "rgba(0,0,0,.15)");
  }
  function shadowE(x, y, rx, ry, a = .38) { const [sx, sy] = iso(x, y); const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rx); g.addColorStop(0, `rgba(20,12,6,${a})`); g.addColorStop(1, "rgba(20,12,6,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function daylight(t) { const k = Math.sin(Math.PI * Math.min(1, Math.max(0, t))); return { k, warm: t > .72 ? (t - .72) / .28 : 0, sky: `rgb(${Math.round(140 + 90 * k - 40 * (t > .8 ? t - .8 : 0) * 5)},${Math.round(165 + 60 * k)},${Math.round(205 + 30 * k)})` }; }

  function room(L, st = {}) {
    // zemin: meşe tahtalar (x yönünde uzun), damar çizgileri
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = PAL.oak[(x * 3 + y * 5) % 3]; const dark = 1 - (x + y) / (COLS + ROWS) * .25;
      poly([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], shade(c, dark));
    }
    ctx.strokeStyle = "rgba(60,35,15,.25)"; ctx.lineWidth = 1;
    for (let y = 0; y <= ROWS; y += .5) { const a = iso(0, y), b = iso(COLS, y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // duvarlar
    const WH = 170;
    poly([iso(0, 0), iso(0, ROWS), iso(0, ROWS, WH), iso(0, 0, WH)], PAL.wallDark);
    poly([iso(0, 0), iso(COLS, 0), iso(COLS, 0, WH), iso(0, 0, WH)], PAL.wall);
    // süpürgelik
    poly([iso(0, 0, 0), iso(COLS, 0, 0), iso(COLS, 0, 6), iso(0, 0, 6)], "#8d6440"); poly([iso(0, 0, 0), iso(0, ROWS, 0), iso(0, ROWS, 6), iso(0, 0, 6)], "#6f4d31");
    // vitrin (sağ duvar) – çerçeve + cam + ışık huzmesi
    const wx0 = 2.4, wx1 = 6.6;
    poly([iso(wx0 - .15, 0, 42), iso(wx1 + .15, 0, 42), iso(wx1 + .15, 0, 140), iso(wx0 - .15, 0, 140)], "#3b2a20");
    poly([iso(wx0, 0, 46), iso(wx1, 0, 46), iso(wx1, 0, 136), iso(wx0, 0, 136)], L.sky);
    ctx.save(); ctx.globalAlpha = .35; poly([iso(wx0, 0, 46), iso(wx1, 0, 46), iso(wx1, 0, 70), iso(wx0, 0, 70)], "#fff"); ctx.restore();
    [(wx0 + wx1) / 2].forEach(mx => poly([iso(mx - .04, 0, 46), iso(mx + .04, 0, 46), iso(mx + .04, 0, 136), iso(mx - .04, 0, 136)], "#3b2a20"));
    poly([iso(wx0, 0, 90), iso(wx1, 0, 90), iso(wx1, 0, 93), iso(wx0, 0, 93)], "#3b2a20");
    ctx.save(); ctx.globalAlpha = .12 + .22 * L.k; const g = ctx.createLinearGradient(...iso(4.5, 0, 90), ...iso(4.5, 5, 0)); g.addColorStop(0, "#fff4d6"); g.addColorStop(1, "rgba(255,244,214,0)");
    poly([iso(wx0, 0, 46), iso(wx1, 0, 46), iso(wx1 + 1.6, 5.2, 0), iso(wx0 + 1.6, 5.2, 0)], g); ctx.restore();
    // kapı (sağ duvar, sağ uç)
    poly([iso(DOOR.x - .6, 0, 0), iso(DOOR.x + .6, 0, 0), iso(DOOR.x + .6, 0, 110), iso(DOOR.x - .6, 0, 110)], "#2a1c14");
    poly([iso(DOOR.x - .5, 0, 2), iso(DOOR.x + .5, 0, 2), iso(DOOR.x + .5, 0, 104), iso(DOOR.x - .5, 0, 104)], "#6b4a33");
    poly([iso(DOOR.x - .38, 0, 55), iso(DOOR.x + .38, 0, 55), iso(DOOR.x + .38, 0, 98), iso(DOOR.x - .38, 0, 98)], L.sky);
    const [kx, ky] = iso(DOOR.x + .32, 0, 50); ctx.fillStyle = "#d8b36a"; ctx.beginPath(); ctx.arc(kx, ky, 2.5, 0, Math.PI * 2); ctx.fill();
    // menü tahtası (sol duvar)
    poly([iso(0, 1.2, 95), iso(0, 4.6, 95), iso(0, 4.6, 150), iso(0, 1.2, 150)], "#1e1b19"); poly([iso(0, 1.3, 97), iso(0, 4.5, 97), iso(0, 4.5, 148), iso(0, 1.3, 148)], "#2b2724");
    ctx.strokeStyle = "rgba(255,245,220,.75)"; ctx.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const a = iso(0, 1.6, 140 - i * 9), b = iso(0, 2.6 + (i % 2) * .8, 140 - i * 9); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // raf + çekirdek torbaları (sol duvar)
    poly([iso(0, 5.2, 80), iso(0.45, 5.2, 80), iso(0.45, 7.6, 80), iso(0, 7.6, 80)], "#7a5536"); poly([iso(0, 5.2, 76), iso(0.45, 5.2, 76), iso(0.45, 7.6, 76), iso(0, 7.6, 76)], "#5c3f28");
    for (let i = 0; i < 4; i++) prism(.05, 5.35 + i * .55, .35, .4, 26, i % 2 ? "#c9a46a" : "#b89055", "#8f6e3f", i % 2 ? "#a98a52" : "#9a7746", 80);
    if (st.assistant) staff(.42, 2.2, st.asstBusy);                 // §8 yardımcı barista: tezgâhın arkasında
    // tezgâh (sol duvara paralel)
    shadowE(1.7, 3.6, TW * 2.4, TW * 1.1);
    prism(1, 1, 1.3, 5.0, 40, PAL.counterTop, PAL.counterFront, "#4a3327");
    ctx.save(); ctx.globalAlpha = .14; poly([iso(1, 1, 40), iso(2.3, 1, 40), iso(2.3, 6, 40), iso(1, 6, 40)], "#fff"); ctx.restore();
    poly([iso(2.3, 1, 0), iso(2.3, 6, 0), iso(2.3, 6, 40), iso(2.3, 1, 40)], "rgba(0,0,0,0)");
    // tezgâh ön paneli ahşap çıtalar
    ctx.strokeStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < 12; i++) { const a = iso(2.3, 1 + i * .42, 2), b = iso(2.3, 1 + i * .42, 38); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }
  function furniture(level, slots, st = {}) {
    // espresso makinesi + grup kafası + fincanlar
    machine(1.05, 1.25); if (slots > 1) machine(1.05, 2.75);
    prism(1.25, 4.5, .5, .5, 24, "#2a2a2e", "#111113", "#3a3a3f", 40);             // öğütücü
    const [hx, hy] = iso(1.5, 4.75, 64); ctx.fillStyle = "rgba(120,80,40,.8)"; ctx.beginPath(); ctx.ellipse(hx, hy, TW * .22, TH * .22, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) { const [cx, cy] = iso(1.3 + i * .18, 5.5, 40); ctx.fillStyle = "#f4efe6"; ctx.beginPath(); ctx.ellipse(cx, cy - 4, TW * .09, TH * .09, 0, 0, Math.PI * 2); ctx.fill(); }   // fincan dizisi
    // masalar + sandalyeler (seviyeye göre)
    const tables = [[6.2, 2.4], [6.4, 5.4], [4.0, 5.8], [8.2, 4.0]].slice(0, 1 + level);
    tables.forEach(([x, y]) => {
      shadowE(x + .4, y + .45, TW * .9, TW * .45);
      [[x - .45, y + .15], [x + .95, y + .15]].forEach(([cx, cy]) => prism(cx, cy, .35, .35, 18, "#5c3f28", "#3f2a1a", "#4e3522"));
      prism(x + .3, y + .3, .2, .2, 28, "#4a3327", "#2e1f17", "#3d2a1f");                        // ayak
      const [tx, ty] = iso(x + .4, y + .4, 30); ctx.fillStyle = PAL.oak[0]; ctx.beginPath(); ctx.ellipse(tx, ty, TW * .55, TH * .55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.ellipse(tx - 4, ty - 2, TW * .3, TH * .25, 0, 0, Math.PI * 2); ctx.fill();
    });
    // bitkiler
    plant(.5, 7.2); if (level >= 2) plant(9.2, 7.0); if (level >= 3) plant(9.2, 1.2);
    const dec = st.decor || {};
    if (st.superAuto) { prism(1.1, 3.5, .9, .85, 34, "#2b2b30", "#121214", "#3a3a40", 40);              // §8 süper otomatik makine
      const [sx, sy] = iso(1.55, 4.35, 62); ctx.fillStyle = "#7fd3ff"; ctx.globalAlpha = .8; rr(sx - 7, sy - 5, 14, 9, 2); ctx.fill(); ctx.globalAlpha = 1; }
    if (dec.plant) { prism(4.9, 7.2, .7, .7, 26, "#b07a48", "#7a5232", "#8f6440"); const [px, py] = iso(5.25, 7.55, 26);   // §8 dekor: büyük bitki
      for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 3 ? "#4f7a3a" : "#77a656"; ctx.beginPath(); ctx.ellipse(px + Math.cos(i * 1.1) * TW * .3, py - 18 - Math.abs(Math.sin(i * 1.9)) * TW * .55, TW * .18, TW * .42, i * .7, 0, Math.PI * 2); ctx.fill(); } }
    if (dec.lamp) { shadowE(.5, 6.3, TW * .5, TW * .25); prism(.45, 6.25, .1, .1, 110, "#3a2c22", "#21180f", "#2c2018");   // ayaklı lamba
      const [lx, ly] = iso(.5, 6.3, 118); const g = ctx.createRadialGradient(lx, ly + 10, 2, lx, ly + 10, TW * 2); g.addColorStop(0, "rgba(255,214,150,.55)"); g.addColorStop(1, "rgba(255,214,150,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly + 10, TW * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f3dfb8"; ctx.beginPath(); ctx.moveTo(lx - 14, ly + 8); ctx.lineTo(lx + 14, ly + 8); ctx.lineTo(lx + 8, ly - 12); ctx.lineTo(lx - 8, ly - 12); ctx.closePath(); ctx.fill(); }
    if (dec.record) { prism(6.9, .15, .9, .6, 34, "#7a5536", "#55391f", "#664629");                 // pikap dolabı
      prism(7.0, .22, .7, .45, 5, "#2a2420", "#171310", "#201a16", 34); const [rx, ry] = iso(7.32, .44, 40);
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(rx, ry, TW * .26, TH * .26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b5533c"; ctx.beginPath(); ctx.ellipse(rx, ry, TW * .07, TH * .07, 0, 0, Math.PI * 2); ctx.fill(); }

    // sarkıt lambalar
    [[3.0, 3.0], [6.0, 4.0]].forEach(([x, y]) => { const [lx, ly] = iso(x, y, 150), [bx, by] = iso(x, y, 120);
      ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, ly - 40); ctx.lineTo(bx, by); ctx.stroke();
      const g = ctx.createRadialGradient(bx, by + 8, 2, bx, by + 8, TW * 1.4); g.addColorStop(0, "rgba(255,225,170,.55)"); g.addColorStop(1, "rgba(255,225,170,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by + 8, TW * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1f1a16"; ctx.beginPath(); ctx.moveTo(bx - 12, by + 4); ctx.lineTo(bx + 12, by + 4); ctx.lineTo(bx + 6, by - 10); ctx.lineTo(bx - 6, by - 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffe6b0"; ctx.beginPath(); ctx.ellipse(bx, by + 4, 11, 3, 0, 0, Math.PI * 2); ctx.fill(); });
  }
  function staff(x, y, busy) {                                     // yardımcı barista: önlüklü, tezgâhın arkasında
    const [sx, sy] = iso(x, y), s = TW / 40, bob = busy ? Math.sin(time * 8) * 1.5 * s : 0;
    ctx.fillStyle = PAL.shadow; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 14 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b2117"; rr(sx - 8 * s, sy - 20 * s, 6 * s, 20 * s, 3); ctx.fill(); rr(sx + 2 * s, sy - 20 * s, 6 * s, 20 * s, 3); ctx.fill();
    ctx.fillStyle = "#f2ece2"; rr(sx - 12 * s, sy - 50 * s + bob, 24 * s, 34 * s, 9 * s); ctx.fill();
    ctx.fillStyle = "#5b4231"; rr(sx - 9 * s, sy - 42 * s + bob, 18 * s, 26 * s, 4 * s); ctx.fill();          // önlük
    ctx.fillStyle = "#e8bf98"; ctx.beginPath(); ctx.arc(sx, sy - 58 * s + bob, 9.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a1c14"; ctx.beginPath(); ctx.arc(sx, sy - 61 * s + bob, 9.5 * s, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = `600 ${11 * s}px system-ui`; ctx.textAlign = "center"; ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 3; ctx.fillText(busy ? "Yardımcı · hazırlıyor" : "Yardımcı", sx, sy - 74 * s); ctx.shadowBlur = 0;
  }
  function machine(x, y) {
    prism(x, y, 1.05, 1.25, 30, PAL.steel, PAL.steelDark, "#aeb2b7", 40);
    prism(x + .1, y + .1, .85, 1.05, 6, "#f0f1f2", "#9a9ea3", "#c3c6ca", 70);                    // üst tepsi
    prism(x + .2, y + .35, .6, .5, 10, "#1a1a1c", "#0d0d0e", "#2a2a2d", 54);                       // grup kafası gövdesi
    const [px, py] = iso(x + .75, y + .6, 48); ctx.fillStyle = "#1f1a16"; rr(px - 2, py, 4, TW * .28, 2); ctx.fill();   // portafiltre sapı
    const [lx, ly] = iso(x + .9, y + .2, 62); ctx.fillStyle = "#ff9f3a"; ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2); ctx.fill();   // güç ışığı
  }
  function plant(x, y) { prism(x, y, .5, .5, 20, "#9c6b3f", "#6e4a2a", "#80573a"); const [px, py] = iso(x + .25, y + .25, 20);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? "#4f7a3a" : "#6b9a4b"; ctx.beginPath(); ctx.ellipse(px + Math.cos(i * 1.3) * TW * .22, py - 12 - Math.abs(Math.sin(i * 1.7)) * TW * .3, TW * .16, TW * .3, i * .9, 0, Math.PI * 2); ctx.fill(); } }
  function shade(hex, k) { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; }

  // ---- müşteriler ----
  function person(c, active) {
    const [sx, sy] = iso(c.pos.x, c.pos.y); const [c1, c2] = TYPE_COLOR[c.type] || ["#777", "#444"]; const s = TW / 40;
    const walk = c.moving ? Math.sin(time * 14) * 2 * s : 0;
    ctx.save(); ctx.fillStyle = PAL.shadow; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 15 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#2b2117"; rr(sx - 8 * s, sy - 20 * s, 6 * s, 20 * s + walk, 3); ctx.fill(); rr(sx + 2 * s, sy - 20 * s, 6 * s, 20 * s - walk, 3); ctx.fill();   // bacaklar
    const g = ctx.createLinearGradient(sx - 12 * s, 0, sx + 12 * s, 0); g.addColorStop(0, c2); g.addColorStop(.45, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; rr(sx - 12 * s, sy - 50 * s, 24 * s, 34 * s, 9 * s); ctx.fill();                                                                       // gövde
    ctx.fillStyle = "rgba(255,255,255,.12)"; rr(sx - 9 * s, sy - 48 * s, 7 * s, 28 * s, 4 * s); ctx.fill();
    if (c.type === "business") { ctx.fillStyle = "#f2efe8"; ctx.beginPath(); ctx.moveTo(sx - 5 * s, sy - 50 * s); ctx.lineTo(sx + 5 * s, sy - 50 * s); ctx.lineTo(sx, sy - 42 * s); ctx.fill(); ctx.fillStyle = "#a33a2e"; ctx.beginPath(); ctx.moveTo(sx - 2 * s, sy - 46 * s); ctx.lineTo(sx + 2 * s, sy - 46 * s); ctx.lineTo(sx + 3 * s, sy - 30 * s); ctx.lineTo(sx, sy - 27 * s); ctx.lineTo(sx - 3 * s, sy - 30 * s); ctx.fill(); }
    if (c.type === "student") { ctx.fillStyle = "#c9962b"; rr(sx + 8 * s, sy - 48 * s, 7 * s, 22 * s, 3 * s); ctx.fill(); }
    const hg = ctx.createRadialGradient(sx - 3 * s, sy - 60 * s, 2, sx, sy - 58 * s, 10 * s); hg.addColorStop(0, "#f3cfae"); hg.addColorStop(1, "#c48a62");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(sx, sy - 58 * s, 9.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = (c.type === "nejla" || c.type === "elder") ? "#d9d4cc" : c.type === "student" ? "#6b4a2a" : "#3a2a22"; ctx.beginPath(); ctx.arc(sx, sy - 61 * s, 9.5 * s, Math.PI, Math.PI * 2); ctx.fill();
    if (active) { ctx.strokeStyle = "#ffd89a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 19 * s, 9 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
    // baloncuk
    if (!c.leaving || c.angry) {
      const by = sy - 96 * s, p = c.patienceMax ? c.patience / c.patienceMax : 1; const bw = 48 * s, bh = 34 * s;
      ctx.fillStyle = c.angry ? "#f3d9d4" : "rgba(255,255,255,.97)"; ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 6; rr(sx - bw / 2, by - bh / 2, bw, bh, 9 * s); ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(sx - 5 * s, by + bh / 2); ctx.lineTo(sx, by + bh / 2 + 8 * s); ctx.lineTo(sx + 5 * s, by + bh / 2); ctx.fill();
      if (c.angry) { ctx.fillStyle = "#b5533c"; ctx.font = `600 ${14 * s}px system-ui`; ctx.textAlign = "center"; ctx.fillText("✖", sx, by + 5 * s); }
      else { cupIcon(sx - 9 * s, by + 1 * s, 11 * s, c.drink);
        if (c.patienceMax) { ctx.lineWidth = 4 * s; ctx.strokeStyle = "rgba(0,0,0,.1)"; ctx.beginPath(); ctx.arc(sx + 12 * s, by, 8 * s, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = p < .3 ? "#b5533c" : p < .6 ? "#c9962b" : "#6f7d4a"; ctx.beginPath(); ctx.arc(sx + 12 * s, by, 8 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke(); }
        else { ctx.fillStyle = "#7a4f7a"; ctx.font = `600 ${11 * s}px system-ui`; ctx.textAlign = "center"; ctx.fillText("∞", sx + 12 * s, by + 4 * s); } }
    }
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = `600 ${11 * s}px system-ui`; ctx.textAlign = "center"; ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 3; ctx.fillText(c.name, sx, sy + 17 * s); ctx.shadowBlur = 0;
    if (!c.leaving) hits.push({ id: c.id, x: sx - 26 * s, y: sy - 115 * s, w: 52 * s, h: 135 * s });
  }
  function cupIcon(x, y, s, drink) { const milky = /latte|cappuccino|cortado|macchiato/.test(drink || "");
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#8b7a6a"; ctx.lineWidth = 1; rr(x - s * .6, y - s * .5, s * 1.2, s, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = milky ? "#e7d2b8" : "#4a2e1c"; ctx.fillRect(x - s * .5, y - s * .4, s, s * .35); }

  // ---- uçuşan yazılar (§7 efektler) ----
  const fx = [];
  function addFx(c, text, color, big) { const [sx, sy] = iso(c.pos.x, c.pos.y); fx.push({ x: sx + (Math.random() - .5) * 20, y: sy - 110 * TW / 40, text, color, t: 0, big }); }
  function drawFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.t > 1.4) { fx.splice(i, 1); continue; }
      const a = f.t < 1 ? 1 : 1 - (f.t - 1) / .4; ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${f.big ? 22 : 16}px system-ui`; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.fillStyle = f.color;
      ctx.strokeText(f.text, f.x, f.y - f.t * 40); ctx.fillText(f.text, f.x, f.y - f.t * 40); ctx.restore(); }
  }
  // ---- müşteri hareketi ----
  function queueSlot(i) { return { x: QUEUE0.x + Math.min(i, 4) * .18, y: QUEUE0.y + i * 1.15 }; }
  function step(c, dt) {
    const tg = c.target; if (!tg) { c.moving = false; return; }
    const dx = tg.x - c.pos.x, dy = tg.y - c.pos.y, d = Math.hypot(dx, dy), sp = 2.2 * dt;
    if (d < sp) { c.pos.x = tg.x; c.pos.y = tg.y; c.moving = false; if (c.leaving) c.gone = true; } else { c.pos.x += dx / d * sp; c.pos.y += dy / d * sp; c.moving = true; }
  }
  function draw(state, dt = 0) {
    if (!cv) return; size(); time += dt; hits = [];
    const { customers = [], orders = [], t = .3, level = 1, slots = 1 } = state; const L = daylight(t);
    ctx.fillStyle = "#1c1713"; ctx.fillRect(0, 0, W, H);
    room(L, state); furniture(level, slots, state);
    customers.forEach(c => step(c, dt));
    [...customers].sort((a, b) => (a.pos.x + a.pos.y) - (b.pos.x + b.pos.y)).forEach(c => person(c, orders.some(o => o.cust === c)));
    drawFx(dt);
    // akşam sıcaklığı + vinyet
    const vg = ctx.createRadialGradient(W / 2, H * .45, H * .25, W / 2, H * .45, H * .95); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(35,20,8,${.35 + .3 * L.warm})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (L.warm) { ctx.fillStyle = `rgba(255,150,60,${L.warm * .12})`; ctx.fillRect(0, 0, W, H); }
  }
  function hitTest(px, py) { const h = hits.find(h => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h); return h ? h.id : null; }
  return { init, draw, hitTest, addFx, queueSlot, DOOR };
})();
