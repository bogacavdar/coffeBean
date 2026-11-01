// scene.js – §11: tam ekran izometrik dükkan. Gerçekçi gölge/ışık, kodla çizilir (Blender render'ları gelince sprite'a döner).
// Sahne durumu: müşteriler iso koordinatta yürür (pos → target), uçuşan yazılar (fx) burada çizilir.
window.SCENE = (() => {
  const PAL = { wall: "#e6dccb", wallDark: "#c8bca8", oak: ["#a3784f", "#8d6440", "#7a5536"], counterTop: "#2f2219", counterFront: "#5b4231", steel: "#c9ccd0", steelDark: "#7d8187", shadow: "rgba(25,15,8,.38)" };
  const TYPE_COLOR = { business: ["#2e3442", "#1a1e28"], elder: ["#9a7f9a", "#6b566b"], student: ["#6f8a4a", "#4a6130"], geek: ["#8a5a3a", "#5a3a22"], regular: ["#a0493c", "#6c2f27"], nejla: ["#7a4f7a", "#4e2f4e"] };
  let cv, ctx, W, H, hits = [], TW = 40, TH = 20, OX = 0, OY = 0, time = 0;
  const COLS = 10, ROWS = 8;
  const DOOR = { x: 8.2, y: 0 };                 // sağ duvardaki kapı (iso koordinat)
  const QUEUE0 = { x: 3.0, y: 1.7 };             // kuyruk başı
  // §12 grafik ayarları: ekran kartı (donanım hızlandırma) isteği + kalite (çözünürlük, efektler, kare hızı)
  const QUALITY = { high: { maxDpr: 2, scale: 1, fx: 2, fps: 0 }, medium: { maxDpr: 1.25, scale: 1, fx: 1, fps: 0 }, low: { maxDpr: 1, scale: .8, fx: 0, fps: 30 } };
  let Q = QUALITY.high, acc = 0;
  function init(canvas, gpu = true) { cv = canvas; ctx = cv.getContext("2d", gpu ? { alpha: false, desynchronized: true } : { alpha: false, willReadFrequently: true }); }
  function setQuality(q) { Q = QUALITY[q] || QUALITY.high; }
  function size() {
    const dpr = Math.min(Q.maxDpr, window.devicePixelRatio || 1) * Q.scale; const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    W = w; H = h; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (W >= H) {                                                                  // §11 yatay ekran: tüm dükkan kadrajda (vitrin, kapı, tabelalar, masalar)
      TW = Math.min(84, W / 18.5, (H - 30) / 13.6); TH = TW / 2;
      OX = W / 2 - TW * .6; OY = (H - 13.6 * TW) / 2 + 5.4 * TW + 20;          // üstte duvar (~z 200), altta zeminin ön köşesi
    } else {                                                                       // dik telefon: tezgâh ve sıra bölgesine yakın
      TW = Math.min(84, W / (COLS + ROWS) * 2.1, H / (COLS + ROWS) * 4.2); TH = TW / 2;
      OX = W / 2; OY = H * 0.5 - (COLS + ROWS) * TH / 2 + 30;
    }
  }
  const iso = (x, y, z = 0) => [OX + (x - y) * TW, OY + (x + y) * TH - z * (TW / 40)];
  function poly(pts, fill, stroke) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .6; ctx.stroke(); } }
  const HEX = /^#[0-9a-f]{6}$/i;
  function shade(hex, k) { if (!HEX.test(hex)) return hex; const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return `rgb(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g * k))},${Math.min(255, Math.round(b * k))})`; }
  function vgrad(pts, col, k0 = 1.1, k1 = .78) {            // §11 gerçekçilik: yüzeyde yukarıdan aşağı ışık geçişi
    if (Q.fx === 0 || !HEX.test(col)) return col; let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    const g = ctx.createLinearGradient(0, y0, 0, y1 + .01); g.addColorStop(0, shade(col, k0)); g.addColorStop(1, shade(col, k1)); return g; }
  function prism(x, y, w, d, h, top, left, right, z0 = 0) {
    const zt = z0 + h, a = iso(x, y, zt), b = iso(x + w, y, zt), c = iso(x + w, y + d, zt), e = iso(x, y + d, zt);
    const lf = [e, c, iso(x + w, y + d, z0), iso(x, y + d, z0)], rf = [c, b, iso(x + w, y, z0), iso(x + w, y + d, z0)];
    poly(lf, h > 3 ? vgrad(lf, left) : left); poly(rf, h > 3 ? vgrad(rf, right) : right); poly([a, b, c, e], top, "rgba(0,0,0,.15)");
    if (Q.fx > 0) { ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }
  function cyl(x, y, r, h, col, z0 = 0, topCol) {           // dik silindir (iso elips), metal/seramik parlaması
    const [bx, by] = iso(x, y, z0), [tx, ty] = iso(x, y, z0 + h), rx = r * TW * 1.41, ry = rx / 2;
    const g = ctx.createLinearGradient(bx - rx, 0, bx + rx, 0); g.addColorStop(0, shade(col, .62)); g.addColorStop(.35, shade(col, 1.18)); g.addColorStop(.6, shade(col, .95)); g.addColorStop(1, shade(col, .55));
    ctx.fillStyle = HEX.test(col) && Q.fx ? g : col; ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI); ctx.lineTo(tx - rx, ty); ctx.ellipse(tx, ty, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = topCol || shade(col, 1.1); ctx.beginPath(); ctx.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); return [tx, ty, rx, ry];
  }
  function shadowE(x, y, rx, ry, a = .38) { if (Q.fx === 0) return; const [sx, sy] = iso(x, y); const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rx); g.addColorStop(0, `rgba(20,12,6,${a})`); g.addColorStop(1, "rgba(20,12,6,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function daylight(t) { const k = Math.sin(Math.PI * Math.min(1, Math.max(0, t))); return { k, warm: t > .72 ? (t - .72) / .28 : 0, sky: `rgb(${Math.round(140 + 90 * k - 40 * (t > .8 ? t - .8 : 0) * 5)},${Math.round(165 + 60 * k)},${Math.round(205 + 30 * k)})` }; }
  // duvar düzlemine yazı: sağ duvar (y=0) eğimi +0,5, sol duvar (x=0) eğimi −0,5
  function wallText(wall, u, z, text, px, color, glow, font = "800") {
    const [ox, oy] = wall === "R" ? iso(u, 0, z) : iso(0, u, z); ctx.save(); ctx.translate(ox, oy); ctx.transform(1, wall === "R" ? .5 : -.5, 0, 1, 0, 0);
    ctx.font = `${font} ${px * TW / 40}px Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (glow && Q.fx > 0) { ctx.shadowColor = glow; ctx.shadowBlur = 12 * TW / 40; } ctx.fillStyle = color; ctx.fillText(text, 0, 0); ctx.restore(); }
  function wallRect(wall, u0, u1, z0, z1, fill, stroke) { const P = wall === "R" ? (u, z) => iso(u, 0, z) : (u, z) => iso(0, u, z);
    poly([P(u0, z0), P(u1, z0), P(u1, z1), P(u0, z1)], fill, stroke); }
  function glowAt(x, y, z, r, col) { if (Q.fx === 0) return; const [gx, gy] = iso(x, y, z); const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(255,220,160,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); }

  const CLEN = lv => lv >= 3 ? 7 : lv === 2 ? 6 : 5;            // §11 tezgâh dükkanla büyür
  function room(L, st = {}) {
    const lv = st.level || 1, EX = 10;
    for (let y = 0; y < ROWS + EX; y++) for (let x = 0; x < COLS + EX; x++) {   // meşe tahtalar
      const c = PAL.oak[(x * 3 + y * 5) % 3]; const dark = 1 - Math.min(1, (x + y) / (COLS + ROWS)) * .22 - (x >= COLS || y >= ROWS ? .06 : 0);
      poly([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], shade(c, dark));
    }
    ctx.strokeStyle = "rgba(60,35,15,.22)"; ctx.lineWidth = 1;
    if (Q.fx > 0) { for (let y = 0; y <= ROWS + EX; y += .5) { const a = iso(0, y), b = iso(COLS + EX, y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      ctx.strokeStyle = "rgba(255,240,210,.05)"; for (let y = .25; y <= ROWS + EX; y += .5) { const a = iso(0, y), b = iso(COLS + EX, y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
    const WH = 170, WTOP = 1400;
    const wl = [iso(0, 0), iso(0, ROWS + EX), iso(0, ROWS + EX, WTOP), iso(0, 0, WTOP)], wr = [iso(0, 0), iso(COLS + EX, 0), iso(COLS + EX, 0, WTOP), iso(0, 0, WTOP)];
    poly(wl, PAL.wallDark); poly(wr, PAL.wall);
    // lambri (alt duvar paneli) + üst ray
    wallRect("L", 0, ROWS + EX, 0, 62, "#7e5a3c"); wallRect("R", 0, COLS + EX, 0, 62, "#93694a");
    ctx.strokeStyle = "rgba(0,0,0,.16)"; for (let u = .5; u < COLS + EX; u += .7) { const a = iso(u, 0, 4), b = iso(u, 0, 58); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (let u = .5; u < ROWS + EX; u += .7) { const a = iso(0, u, 4), b = iso(0, u, 58); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    wallRect("L", 0, ROWS + EX, 60, 66, "#5c3f28"); wallRect("R", 0, COLS + EX, 60, 66, "#6f4d31");
    poly([iso(0, 0, WH + 26), iso(COLS + EX, 0, WH + 26), iso(COLS + EX, 0, WH + 34), iso(0, 0, WH + 34)], "#8d6440");
    poly([iso(0, 0, WH + 26), iso(0, ROWS + EX, WH + 26), iso(0, ROWS + EX, WH + 34), iso(0, 0, WH + 34)], "#6f4d31");
    // köşe ve duvar dibi gölgesi (ambient occlusion)
    if (Q.fx > 0) { [["R", iso(5, 0), iso(5, .7)], ["L", iso(0, 5), iso(.7, 5)]].forEach(([w, p0, p1]) => { const g = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); g.addColorStop(0, "rgba(25,12,4,.32)"); g.addColorStop(1, "rgba(25,12,4,0)"); ctx.fillStyle = g;
      if (w === "R") poly([iso(0, 0), iso(COLS + EX, 0), iso(COLS + EX, .7), iso(0, .7)], g); else poly([iso(0, 0), iso(0, ROWS + EX), iso(.7, ROWS + EX), iso(.7, 0)], g); });
      const cg = ctx.createLinearGradient(...iso(0, 0, 0), ...iso(0, 0, 200)); cg.addColorStop(0, "rgba(0,0,0,.18)"); cg.addColorStop(1, "rgba(0,0,0,0)"); }
    // vitrin
    const wx0 = 2.4, wx1 = 6.6;
    wallRect("R", wx0 - .15, wx1 + .15, 42, 140, "#3b2a20"); wallRect("R", wx0, wx1, 46, 136, L.sky);
    ctx.save(); ctx.globalAlpha = .35; wallRect("R", wx0, wx1, 46, 70, "#fff"); ctx.restore();
    if (Q.fx > 0) { ctx.save(); ctx.globalAlpha = .18; for (let i = 0; i < 3; i++) poly([iso(wx0 + .4 + i * 1.3, 0, 136), iso(wx0 + .9 + i * 1.3, 0, 136), iso(wx0 + .3 + i * 1.3, 0, 46), iso(wx0 - .2 + i * 1.3, 0, 46)], "#fff"); ctx.restore(); }   // cam yansıması
    wallRect("R", 4.46, 4.54, 46, 136, "#3b2a20"); wallRect("R", wx0, wx1, 90, 93, "#3b2a20");
    wallRect("R", wx0 - .2, wx1 + .2, 38, 44, "#5c3f28");                              // pencere pervazı
    if (Q.fx >= 2) { ctx.save(); ctx.globalAlpha = .12 + .22 * L.k; const g = ctx.createLinearGradient(...iso(4.5, 0, 90), ...iso(4.5, 5, 0)); g.addColorStop(0, "#fff4d6"); g.addColorStop(1, "rgba(255,244,214,0)");
      poly([iso(wx0, 0, 46), iso(wx1, 0, 46), iso(wx1 + 1.6, 5.2, 0), iso(wx0 + 1.6, 5.2, 0)], g); ctx.restore(); }
    // kapı
    wallRect("R", DOOR.x - .6, DOOR.x + .6, 0, 110, "#2a1c14"); wallRect("R", DOOR.x - .5, DOOR.x + .5, 2, 104, "#6b4a33");
    wallRect("R", DOOR.x - .38, DOOR.x + .38, 55, 98, L.sky); wallRect("R", DOOR.x - .4, DOOR.x + .4, 8, 46, "#5c3f28");
    const [kx, ky] = iso(DOOR.x + .32, 0, 50); ctx.fillStyle = "#d8b36a"; ctx.beginPath(); ctx.arc(kx, ky, 2.5 * TW / 40, 0, Math.PI * 2); ctx.fill();
    // menü tahtası (sol duvar)
    wallRect("L", 1.2, 4.6, 95, 150, "#1e1b19"); wallRect("L", 1.3, 4.5, 97, 148, "#2b2724");
    wallText("L", 2.9, 141, "MENÜ", 11, "rgba(255,245,220,.9)");
    ctx.strokeStyle = "rgba(255,245,220,.7)"; ctx.lineWidth = 1.1; for (let i = 0; i < 5; i++) { const a = iso(0, 1.6, 130 - i * 7), b = iso(0, 2.6 + (i % 2) * .8, 130 - i * 7), c2 = iso(0, 3.9, 130 - i * 7), d2 = iso(0, 4.2, 130 - i * 7); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c2[0], c2[1]); ctx.lineTo(d2[0], d2[1]); ctx.stroke(); }
    // raf + çekirdek torbaları
    prism(0, 5.2, .45, 2.4, 4, "#7a5536", "#5c3f28", "#6b4a30", 76);
    for (let i = 0; i < 4; i++) { prism(.05, 5.35 + i * .55, .35, .4, 26, i % 2 ? "#c9a46a" : "#b89055", "#8f6e3f", i % 2 ? "#a98a52" : "#9a7746", 80);
      wallText("L", 5.55 + i * .55, 92, "☕", 7, "rgba(60,35,15,.7)", null, "400"); }
    backCounter(st); brewBar(st);
    barista(.42, 1.75, st.baristaBusy);
    if (st.assistant) staff(.42, 3.0, st.asstBusy);
    // ön tezgâh (dükkanla uzar)
    const CL = CLEN(lv);
    shadowE(1.7, 1 + CL * .55, TW * (1.8 + CL * .12), TW * 1.1);
    prism(1, 1, 1.3, CL, 40, PAL.counterTop, PAL.counterFront, "#4a3327");
    if (Q.fx > 0) { ctx.save(); ctx.globalAlpha = .16; poly([iso(1, 1, 40), iso(2.3, 1, 40), iso(2.3, 1 + CL, 40), iso(1, 1 + CL, 40)], "#fff"); ctx.restore(); }
    prism(2.25, 1, .1, CL, 4, "#3a2a1f", "#2a1d14", "#33251b", 36);                     // tezgâh kenar pervazı
    ctx.strokeStyle = "rgba(0,0,0,.2)"; for (let i = 0; i < CL * 2.4; i++) { const a = iso(2.3, 1 + i * .42, 3), b = iso(2.3, 1 + i * .42, 34); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    prism(2.3, 1, .06, CL, 3, "#c9a46a", "#8f6e3f", "#a98a52", 0);                       // ayak çıtası (pirinç)
  }
  // ---- §8 arka tezgâh: buzdolabı + aletler (sol duvar dibi)
  function backCounter(st, only) {
    const f = Object.assign({}, st.equipment || {}, st.tools || {}), show = k => only ? only === k : !!f[k];
    if (!only) { prism(.02, 3.6, .4, 2.8, 34, "#3a2a1f", "#5b4231", "#4a3327"); }
    if (show("fridge")) { const x = .04, y = 5.95;                               // §8 cam kapaklı süt buzdolabı (arka tezgâhın üstünde, görünür)
      prism(x, y, .38, .45, 32, "#e9ecee", "#c9cdd1", "#dfe2e5", 34);
      poly([iso(x + .38, y + .05, 37), iso(x + .38, y + .4, 37), iso(x + .38, y + .4, 63), iso(x + .38, y + .05, 63)], "rgba(170,215,235,.75)");
      for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) cyl(x + .3, y + .11 + k * .11, .035, 8, "#fdfcf9", 38 + r * 13, "#3b6ea8");
      const [hx, hy] = iso(x + .38, y + .08, 50); ctx.fillStyle = "#7d8187"; ctx.fillRect(hx - 1, hy - 6 * TW / 40, 2.2, 12 * TW / 40);
      ctx.fillStyle = "#6fc3ff"; const [lx, ly] = iso(x + .38, y + .36, 64); ctx.beginPath(); ctx.arc(lx, ly, 1.6, 0, Math.PI * 2); ctx.fill(); }
    if (show("kettle")) { const [tx, ty, rx] = cyl(.2, 3.95, .1, 14, "#c9ccd0", 34, "#2b2117");
      ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 2.4 * TW / 40; ctx.beginPath(); ctx.arc(tx, ty - 3, rx * .8, Math.PI, 0); ctx.stroke(); prism(.1, 3.8, .2, .1, 3, "#2b2117", "#111", "#222", 34); }
    if (show("milkKit")) { cyl(.2, 4.32, .08, 13, "#d4d7db", 34, "#f6f1e8"); ctx.strokeStyle = "#8a8e93"; ctx.lineWidth = 2; const [px, py] = iso(.2, 4.4, 42); ctx.beginPath(); ctx.arc(px + 4, py, 4 * TW / 40, -1.2, 1.2); ctx.stroke(); }
    if (show("thermoPitcher")) { const [tx, ty] = cyl(.2, 4.65, .08, 13, "#c9ccd0", 34, "#f6f1e8"); ctx.fillStyle = "#b5533c"; ctx.fillRect(tx + 2, ty - 10 * TW / 40, 1.8, 14 * TW / 40); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(tx + 2.9, ty - 11 * TW / 40, 2.2 * TW / 40, 0, Math.PI * 2); ctx.fill(); }
    if (show("pourPitcher")) { cyl(.2, 4.98, .08, 12, "#d9b36a", 34, "#f6f1e8"); const [px, py] = iso(.12, 4.98, 46); ctx.fillStyle = "#c9a14f"; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 6 * TW / 40, py - 3); ctx.lineTo(px, py + 3); ctx.fill(); }
    if (show("cocoa")) { const [tx, ty, rx] = cyl(.2, 5.3, .06, 11, "#9a9ea3", 34, "#cfd2d6"); ctx.fillStyle = "#5a3418"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(tx - rx * .5 + i * rx * .35, ty, 1, 0, Math.PI * 2); ctx.fill(); } }
    if (show("boiler")) { const [tx, ty] = cyl(.2, 5.75, .17, 34, "#b8bcc1", 34, "#9ea2a7"); const [gx, gy] = iso(.37, 5.75, 58);
      ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.arc(gx, gy, 5 * TW / 40, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#b5533c"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 3 * TW / 40, gy - 3 * TW / 40); ctx.stroke(); }
    if (show("autoMilk")) { prism(.06, 3.62, .3, .22, 22, "#2b2b30", "#121214", "#3a3a40", 34); const [sx, sy] = iso(.36, 3.73, 50); ctx.fillStyle = "#7fd3ff"; rr(sx - 3, sy - 3, 6 * TW / 40, 4 * TW / 40, 1); ctx.fill(); }
  }
  // ---- §3 demleme tezgâhı (sağ duvar dibi, vitrinin solunda): cezve, French press, V60, Türk kahvesi ve filtre kahve makineleri
  function brewBar(st, only) {
    const f = Object.assign({}, st.equipment || {}, st.tools || {}), show = k => only ? only === k : !!f[k];
    if (!only && !["cezve", "frenchPress", "v60", "tkMachine", "filterMachine"].some(k => f[k])) return;
    if (!only) { shadowE(3.0, .7, TW * .7, TW * .3); prism(2.54, .22, .85, .7, 34, "#3a2a1f", "#5b4231", "#4a3327"); }
    if (show("cezve")) { const [tx, ty, rx] = cyl(2.72, .42, .09, 10, "#d58a4a", 34, "#3a200e"); ctx.strokeStyle = "#5a3418"; ctx.lineWidth = 2.5 * TW / 40; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(tx + rx, ty + 4); ctx.lineTo(tx + rx + 14 * TW / 40, ty - 4); ctx.stroke(); ctx.lineCap = "butt";
      prism(2.6, .62, .25, .25, 3, "#2b2b30", "#121214", "#1d1d21", 34); }                                          // küçük ocak
    if (show("frenchPress")) { const [tx, ty, rx] = cyl(2.98, .42, .08, 22, "#c9dde6", 34, "#5a3418"); ctx.fillStyle = "#2b2b30"; ctx.fillRect(tx - rx, ty - 3, rx * 2, 4); ctx.fillStyle = "#c9ccd0"; ctx.fillRect(tx - 1, ty - 12 * TW / 40, 2.4, 10 * TW / 40); ctx.fillStyle = "#2b2b30"; ctx.beginPath(); ctx.arc(tx, ty - 13 * TW / 40, 2.6 * TW / 40, 0, Math.PI * 2); ctx.fill(); }
    if (show("v60")) { cyl(3.22, .45, .08, 10, "#d4e3ea", 34, "#5a3418"); const [vx, vy] = iso(3.22, .45, 46), w = 10 * TW / 40; ctx.fillStyle = "#f4f1ea"; ctx.beginPath(); ctx.moveTo(vx - w, vy - 9 * TW / 40); ctx.lineTo(vx + w, vy - 9 * TW / 40); ctx.lineTo(vx + 3, vy + 2); ctx.lineTo(vx - 3, vy + 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.stroke(); }
    if (show("tkMachine")) { prism(2.9, .65, .22, .22, 18, "#b5533c", "#7d3424", "#94402d", 34); const [lx, ly] = iso(3.12, .76, 46); ctx.fillStyle = "#ffd23a"; ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, Math.PI * 2); ctx.fill(); }
    if (show("filterMachine")) { prism(3.16, .66, .2, .22, 24, "#2b2b30", "#121214", "#3a3a40", 34); cyl(3.27, .77, .06, 8, "#c9dde6", 34, "#5a3418"); }
  }
  // ---- ön tezgâh: makineler, öğütücü, teraziler, bardak yığınları, pasta vitrini, kasa
  function machine(x, y, f = {}) {
    shadowE(x + .5, y + .62, TW * .9, TW * .45, .3);
    prism(x, y, 1.05, 1.25, 30, "#d6d9dd", "#7d8187", "#aeb2b7", 40);
    prism(x + .05, y + .05, .95, 1.15, 3, "#2a2a2d", "#151517", "#202023", 70);          // üst ızgara
    for (let i = 0; i < 3; i++) cyl(x + .3 + i * .2, y + .5, .07, 7, "#f4efe6", 73, "#e7ddd0");   // ısınan fincanlar
    prism(x + .2, y + .35, .6, .55, 10, "#1a1a1c", "#0d0d0e", "#2a2a2d", 52);
    prism(x + .95, y + .15, .12, .95, 3, "#9ea2a7", "#6f7378", "#83878c", 41);           // damlama tepsisi
    const [px, py] = iso(x + .75, y + .6, 48); ctx.fillStyle = "#1f1a16"; rr(px - 2, py, 4, TW * .28, 2); ctx.fill();
    const [lx, ly] = iso(x + 1.05, y + .2, 64); ctx.fillStyle = "#ff9f3a"; ctx.beginPath(); ctx.arc(lx, ly, 2.2 * TW / 40, 0, Math.PI * 2); ctx.fill();
    if (f.pidGauge) { const [gx, gy] = iso(x + 1.05, y + .7, 63), r = 6 * TW / 40; ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#555"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = "#3f7d34"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy, r * .7, -2.4, -1.4); ctx.stroke(); ctx.strokeStyle = "#b5533c"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + r * .6, gy - r * .5); ctx.stroke(); }
    const [wx, wy] = iso(x + .95, y + 1.1, 60), wl = (f.steamWand ? 22 : 16) * TW / 40;            // buhar çubuğu
    ctx.strokeStyle = f.steamWand ? "#e9ecee" : "#9ea2a7"; ctx.lineWidth = (f.steamWand ? 3 : 2) * TW / 40; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 4 * TW / 40, wy + wl); ctx.stroke();
    if (f.steamWand) { ctx.strokeStyle = "#c9772b"; ctx.lineWidth = 4 * TW / 40; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 1, wy + 6 * TW / 40); ctx.stroke(); }
  }
  function superAuto(x, y) { shadowE(x + .5, y + .6, TW * .9, TW * .45, .3);
    prism(x, y, 1.0, 1.2, 32, "#2b2b30", "#121214", "#3a3a40", 40); prism(x + .05, y + .05, .9, 1.1, 4, "#3a3a40", "#1d1d21", "#2c2c31", 72);
    const [sx, sy] = iso(x + 1.0, y + .6, 62); ctx.fillStyle = "#7fd3ff"; ctx.globalAlpha = .85; rr(sx - 6 * TW / 40, sy - 5 * TW / 40, 12 * TW / 40, 8 * TW / 40, 2); ctx.fill(); ctx.globalAlpha = 1;
    prism(x + .7, y + .4, .3, .4, 3, "#9ea2a7", "#6f7378", "#83878c", 41); cyl(x + .85, y + .6, .07, 7, "#f4efe6", 44, "#5a3418"); }
  function grinder(f = {}) { const x = 1.25, y = 4.5;
    if (f.scaleGrind) { prism(x - .05, y - .05, .6, .6, 4, "#3a3a3f", "#1d1d21", "#2a2a2e", 40); const [lx, ly] = iso(x + .55, y + .25, 42); ctx.fillStyle = "#7fe08a"; ctx.fillRect(lx - 3, ly - 2, 6 * TW / 40, 3 * TW / 40); }
    const z0 = f.scaleGrind ? 44 : 40;
    prism(x, y, .5, .5, 24, "#2a2a2e", "#111113", "#3a3a3f", z0);
    const [hx, hy] = iso(x + .25, y + .25, z0 + 24); const big = f.autoGrind ? 1.25 : 1;   // cam hazne + çekirdek
    ctx.fillStyle = "rgba(220,235,240,.5)"; ctx.beginPath(); ctx.moveTo(hx - TW * .22 * big, hy - 18 * big * TW / 40); ctx.lineTo(hx + TW * .22 * big, hy - 18 * big * TW / 40); ctx.lineTo(hx + TW * .08, hy); ctx.lineTo(hx - TW * .08, hy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(110,66,30,.9)"; ctx.beginPath(); ctx.moveTo(hx - TW * .17 * big, hy - 9 * big * TW / 40); ctx.lineTo(hx + TW * .17 * big, hy - 9 * big * TW / 40); ctx.lineTo(hx + TW * .08, hy); ctx.lineTo(hx - TW * .08, hy); ctx.closePath(); ctx.fill();
    if (f.grindPrecise) { const [rx, ry] = iso(x + .25, y + .25, z0 + 22); ctx.strokeStyle = "#d9b36a"; ctx.lineWidth = 2.5 * TW / 40; ctx.beginPath(); ctx.ellipse(rx, ry, TW * .27, TH * .27, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fff"; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.fillRect(rx + Math.cos(a) * TW * .27 - .5, ry + Math.sin(a) * TH * .27 - .5, 1.4, 1.4); } }
    if (f.autoGrind) { const [sx, sy] = iso(x + .5, y + .25, z0 + 14); ctx.fillStyle = "#7fd3ff"; rr(sx - 1, sy - 4 * TW / 40, 6 * TW / 40, 6 * TW / 40, 1); ctx.fill(); }
  }
  function counterTools(f = {}, only) { const show = k => only ? only === k : !!f[k];
    if (show("precScale")) { prism(1.82, 4.05, .34, .34, 3, "#c9ccd0", "#7d8187", "#9ea2a7", 40); const [lx, ly] = iso(2.16, 4.22, 41.5); ctx.fillStyle = "#7fe08a"; ctx.fillRect(lx - 1, ly - 2, 5 * TW / 40, 2.4 * TW / 40); }
    if (show("scaleTamp")) { cyl(1.75, 4.85, .09, 4, "#c9ccd0", 40); cyl(1.75, 4.85, .03, 9, "#3b2a20", 44, "#5c3f28"); const [gx, gy] = iso(1.84, 4.85, 46); ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.arc(gx, gy, 2.4 * TW / 40, 0, Math.PI * 2); ctx.fill(); }
    if (show("autoTamp")) { prism(1.25, 5.05, .5, .38, 18, "#3a3a3f", "#1d1d21", "#2a2a2e", 40); cyl(1.5, 5.24, .1, 4, "#c9ccd0", 58); const [lx, ly] = iso(1.75, 5.24, 52); ctx.fillStyle = "#ff9f3a"; ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, Math.PI * 2); ctx.fill(); }
  }
  const CUPCOL = { espS: ["#f4efe6", .05, 4], espD: ["#efe7da", .065, 5], cupS: ["#ffffff", .07, 7], cupM: ["#f6f1e8", .08, 8], cupL: ["#ece4d6", .09, 9] };
  function cupStacks(cups, y0) { Object.keys(CUPCOL).forEach((k, i) => { const n = Math.min(6, Math.ceil((cups[k] || 0) / 4)); if (!n) return; const [col, r, h] = CUPCOL[k];
    for (let j = 0; j < n; j++) cyl(1.25 + (i % 3) * .3, y0 + Math.floor(i / 3) * .3, r, h * .7, col, 40 + j * h * .55, j === n - 1 ? "#e8dfd2" : col); }); }
  function pastryCase(y) { prism(1.2, y, .95, .8, 4, "#3a2a1f", "#2a1d14", "#33251b", 40);
    const lf = [iso(1.2, y + .8, 44), iso(2.15, y + .8, 44), iso(2.15, y + .8, 66), iso(1.2, y + .8, 66)];
    [[1.4, "#e9b872"], [1.75, "#c9772b"], [2.0, "#f3d9a0"]].forEach(([x, c], i) => { cyl(x, y + .4, .1, 5, c, 44, shade(c, 1.15)); cyl(x - .05, y + .62, .08, 4, i % 2 ? "#8a4f2a" : "#f1e4c8", 44); });
    ctx.save(); ctx.globalAlpha = .28; prism(1.2, y, .95, .8, 22, "#e8f4f8", "#cfe6ee", "#dceef4", 44); ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...lf[3]); ctx.lineTo(...lf[2]); ctx.stroke(); }
  function register(x, y) { prism(x, y, .45, .4, 10, "#2b2b30", "#121214", "#3a3a40", 40); prism(x + .05, y + .05, .3, .3, 9, "#3a3a40", "#1d1d21", "#2c2c31", 50);
    const [sx, sy] = iso(x + .35, y + .2, 56); ctx.fillStyle = "#9cf0a8"; rr(sx - 3, sy - 3, 6 * TW / 40, 4 * TW / 40, 1); ctx.fill(); }

  // ---- §7 self servis standı: küçük malzemeler (doluluk stoka göre)
  const EXF = k => (EXN[k] == null ? 1 : Math.min(1, EXN[k] / 30)); let EXN = {};
  function exItem(k, only) { const f = only ? 1 : EXF(k), x0 = 1.0, y0 = .2;
    if (k === "sleeve") { const n = Math.ceil(f * 6); for (let j = 0; j < n; j++) cyl(x0 + .18, y0 + .2, .08, 2, j % 2 ? "#a8642a" : "#c9772b", 38 + j * 2, "#8f5420"); }
    if (k === "napkin") { prism(x0 + .4, y0 + .08, .26, .26, 14, "#c9ccd0", "#7d8187", "#9ea2a7", 38); if (f > 0) prism(x0 + .43, y0 + .11, .2, .2, 2 + f * 3, "#ffffff", "#e6e1d8", "#f1ece4", 52); }
    if (k === "sugar") { const [tx, ty, rx, ry] = cyl(x0 + .82, y0 + .2, .1, 14, "#dfeef3", 38, "#c9a14f"); if (f > 0) { ctx.fillStyle = "rgba(255,255,255,.95)"; const [bx, by] = iso(x0 + .82, y0 + .2, 38); ctx.fillRect(bx - rx * .8, by - (14 * f) * TW / 40, rx * 1.6, (14 * f) * TW / 40 - 1); } }
    if (k === "stirrer") { const [tx, ty, rx] = cyl(x0 + 1.05, y0 + .2, .06, 9, "#5c3f28", 38, "#3f2a1a"); ctx.strokeStyle = "#e9d7b4"; ctx.lineWidth = 1.2; const n = Math.ceil(f * 7); for (let j = 0; j < n; j++) { ctx.beginPath(); ctx.moveTo(tx - rx * .6 + j * rx * .2, ty); ctx.lineTo(tx - rx * .9 + j * rx * .3, ty - 12 * TW / 40); ctx.stroke(); } }
    if (k === "sweetener") { prism(x0 + 1.2, y0 + .1, .22, .2, 7, "#5f8a4b", "#3e6630", "#4f7a3a", 38); const n = Math.ceil(f * 5); for (let j = 0; j < n; j++) prism(x0 + 1.22 + j * .035, y0 + .13, .03, .14, 4, "#b9e0a8", "#8fc27a", "#a5d190", 45); }
    if (k === "straw") { const [tx, ty, rx] = cyl(x0 + .6, y0 + .45, .05, 10, "#dfeef3", 38, "#bcd6de"); const n = Math.ceil(f * 6), cols = ["#b5533c", "#fff", "#3b6ea8"]; for (let j = 0; j < n; j++) { ctx.strokeStyle = cols[j % 3]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tx - rx * .5 + j * rx * .2, ty + 2); ctx.lineTo(tx - rx * .7 + j * rx * .3, ty - 16 * TW / 40); ctx.stroke(); } }
  }
  function extrasStand(ex) { EXN = ex || {}; shadowE(1.65, .45, TW * 1.1, TW * .4); prism(.98, .15, 1.45, .6, 38, "#7a5536", "#55391f", "#664629");
    poly([iso(.98, .75, 6), iso(2.43, .75, 6), iso(2.43, .75, 32), iso(.98, .75, 32)], "#6b4a30"); wallText("R", 1.7, 132, "SELF SERVİS", 5, "#5b3a22");
    ["sleeve", "napkin", "straw", "sugar", "stirrer", "sweetener"].forEach(k => { if (EXN[k] == null || EXN[k] > 0) exItem(k); }); }

  // ---- §8 müşteri gelişi geliştirmeleri (görünür)
  function trafficDeco(T, only) {
    const c = only ? (only[0] === "c" ? +only.slice(-1) : 0) : (T.cust || 0), q = only ? (only[0] === "f" ? +only.slice(-1) : 0) : (T.freq || 0), has = (k, n) => only ? only === k + n : (k === "c" ? c : q) >= n;
    if (has("c", 1)) { const x = 9.35, y = .45; shadowE(x + .2, y + .2, TW * .5, TW * .22);                     // kaldırım tabelası (A pano)
      poly([iso(x, y, 0), iso(x + .5, y, 0), iso(x + .5, y + .05, 52), iso(x, y + .05, 52)], "#5c3f28"); poly([iso(x + .03, y + .01, 6), iso(x + .47, y + .01, 6), iso(x + .47, y + .05, 48), iso(x + .03, y + .05, 48)], "#1e1b19");
      const [tx, ty] = iso(x + .25, y + .03, 34); ctx.fillStyle = "#fff8e8"; ctx.font = `700 ${6 * TW / 40}px Georgia`; ctx.textAlign = "center"; ctx.fillText("KAHVE", tx, ty); ctx.fillText("☕", tx, ty + 8 * TW / 40); }
    if (has("c", 2)) { wallRect("R", .95, 1.85, 72, 122, "#fdfcf9", "rgba(0,0,0,.25)"); wallRect("R", 1.1, 1.7, 84, 112, "#2b2117");    // sosyal medya / QR afişi
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i * 7 + j * 3) % 3) wallRect("R", 1.13 + i * .09, 1.21 + i * .09, 86 + j * 4.3, 89 + j * 4.3, "#fdfcf9");
      wallText("R", 1.4, 118, "@coffebean", 4.6, "#b5533c"); wallText("R", 1.4, 78, "♥ takip et", 4.4, "#2b2117"); }
    if (has("c", 3)) { wallRect("R", 9.5, 10.5, 58, 112, "#5c3f28"); wallRect("R", 9.56, 10.44, 62, 108, "#f1ead9");                       // çerçeveli gazete ilanı
      wallText("R", 10, 102, "MAHALLE", 5, "#2b2117"); for (let i = 0; i < 7; i++) wallRect("R", 9.62, 9.62 + (i % 2 ? .7 : .78), 70 + i * 4, 71.5 + i * 4, "rgba(43,33,23,.55)"); wallRect("R", 10.05, 10.38, 70, 90, "#c9b79a"); }
    if (has("f", 1)) { const bulbs = 14; ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i <= bulbs; i++) { const u = 2.3 + i * 4.4 / bulbs, z = 140 - Math.sin(i / bulbs * Math.PI * 4) ** 2 * 6; const [bx, by] = iso(u, 0, z); i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by); } ctx.stroke();   // vitrin ışıkları
      for (let i = 0; i <= bulbs; i++) { const u = 2.3 + i * 4.4 / bulbs, z = 138 - Math.sin(i / bulbs * Math.PI * 4) ** 2 * 6, on = .7 + .3 * Math.sin(time * 3 + i); glowAt(u, 0, z, 8 * TW / 40, `rgba(255,214,140,${.6 * on})`); const [bx, by] = iso(u, 0, z); ctx.fillStyle = `rgba(255,232,170,${on})`; ctx.beginPath(); ctx.arc(bx, by, 1.8 * TW / 40, 0, Math.PI * 2); ctx.fill(); }
      wallRect("R", 2.75, 3.75, 52, 70, "rgba(20,10,10,.55)"); wallText("R", 3.25, 61, "AÇIK", 8, "#ff6a5a", "#ff3a2a"); }
    if (has("f", 2)) { wallRect("R", 6.85, 7.45, 112, 162, "#3b2a20"); wallRect("R", 6.9, 7.4, 115, 159, "#2b2724"); wallText("R", 7.15, 152, "BUGÜN", 4.6, "#ffd89a");   // kapı önü menü panosu
      for (let i = 0; i < 5; i++) wallRect("R", 6.95, 7.3, 140 - i * 6, 141 - i * 6, "rgba(255,245,220,.7)"); }
    if (has("f", 3)) { const [fx2, fy2] = iso(DOOR.x, 0, 126), r = 10 * TW / 40; ctx.fillStyle = "#3a3a3f"; ctx.beginPath(); ctx.ellipse(fx2, fy2, r * .75, r, -.45, 0, Math.PI * 2); ctx.fill();   // kahve kokusu fanı
      ctx.fillStyle = "#b8bcc1"; for (let i = 0; i < 3; i++) { const a = time * 9 + i * 2.1; ctx.beginPath(); ctx.ellipse(fx2 + Math.cos(a) * r * .38, fy2 + Math.sin(a) * r * .5, r * .32, r * .15, a, 0, Math.PI * 2); ctx.fill(); }
      if (Q.fx > 0) { ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const o = (time * 12 + i * 8) % 24; ctx.beginPath(); ctx.moveTo(fx2 + 8, fy2 + o); ctx.quadraticCurveTo(fx2 + 18, fy2 + o + 6, fx2 + 26, fy2 + o); ctx.stroke(); } } }
  }

  // ---- §8 dekorasyon (dükkana özel)
  function bigPlant(x, y, h = 1) { shadowE(x + .35, y + .35, TW * .55, TW * .28); prism(x, y, .7, .7, 26, "#b07a48", "#7a5232", "#8f6440"); const [px, py] = iso(x + .35, y + .35, 26);
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 3 ? "#4f7a3a" : i % 2 ? "#77a656" : "#3e6630"; ctx.beginPath(); ctx.ellipse(px + Math.cos(i * 1.1) * TW * .32, py - 18 * h - Math.abs(Math.sin(i * 1.9)) * TW * .6 * h, TW * .17, TW * .42 * h, i * .7, 0, Math.PI * 2); ctx.fill(); } }
  function plant(x, y) { prism(x, y, .5, .5, 20, "#9c6b3f", "#6e4a2a", "#80573a"); const [px, py] = iso(x + .25, y + .25, 20);
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? "#4f7a3a" : "#6b9a4b"; ctx.beginPath(); ctx.ellipse(px + Math.cos(i * 1.3) * TW * .22, py - 12 - Math.abs(Math.sin(i * 1.7)) * TW * .3, TW * .16, TW * .3, i * .9, 0, Math.PI * 2); ctx.fill(); } }
  function frame(wall, u0, u1, z0, z1, inner, mat = "#3b2a20") { wallRect(wall, u0, u1, z0, z1, mat, "rgba(0,0,0,.3)"); wallRect(wall, u0 + .06, u1 - .06, z0 + 3, z1 - 3, inner); }
  const DECOR = {
    plant: () => bigPlant(4.9, 7.2),
    lamp: () => { shadowE(.55, 6.85, TW * .5, TW * .25); prism(.4, 6.7, .3, .3, 3, "#2c2018", "#21180f", "#2c2018"); prism(.53, 6.83, .05, .05, 110, "#3a2c22", "#21180f", "#2c2018");
      const [lx, ly] = iso(.55, 6.85, 118); if (Q.fx >= 1) { const g = ctx.createRadialGradient(lx, ly + 10, 2, lx, ly + 10, TW * 2); g.addColorStop(0, "rgba(255,214,150,.55)"); g.addColorStop(1, "rgba(255,214,150,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly + 10, TW * 2, 0, Math.PI * 2); ctx.fill(); }
      const s = TW / 40; ctx.fillStyle = "#f3dfb8"; ctx.beginPath(); ctx.moveTo(lx - 14 * s, ly + 8 * s); ctx.lineTo(lx + 14 * s, ly + 8 * s); ctx.lineTo(lx + 8 * s, ly - 12 * s); ctx.lineTo(lx - 8 * s, ly - 12 * s); ctx.closePath(); ctx.fill(); },
    record: () => { prism(6.9, .15, .9, .6, 34, "#7a5536", "#55391f", "#664629"); prism(7.0, .22, .7, .45, 5, "#2a2420", "#171310", "#201a16", 34); const [rx, ry] = iso(7.32, .44, 40);
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(rx, ry, TW * .26, TH * .26, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.12)"; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(rx, ry, TW * .07 * i, TH * .07 * i, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = "#b5533c"; ctx.beginPath(); ctx.ellipse(rx, ry, TW * .07, TH * .07, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rx + TW * .3, ry - 3); ctx.lineTo(rx + TW * .1, ry); ctx.stroke(); },
    poster: () => { frame("L", 5.5, 6.6, 112, 162, "#e9c46a"); wallText("L", 6.05, 150, "COFFEE", 7, "#5b3a22"); wallText("L", 6.05, 128, "☕", 16, "#5b3a22", null, "400"); wallText("L", 6.05, 117, "1952", 5, "#5b3a22"); },
    mat: () => { poly([iso(7.7, .12), iso(8.7, .12), iso(8.7, .72), iso(7.7, .72)], "#8a4a2f"); poly([iso(7.78, .18), iso(8.62, .18), iso(8.62, .66), iso(7.78, .66)], "#a85b3a");
      const [mx, my] = iso(8.2, .42); ctx.save(); ctx.translate(mx, my); ctx.transform(1, .5, -1, .5, 0, 0); ctx.fillStyle = "#f3dfb8"; ctx.font = `700 ${5 * TW / 40}px system-ui`; ctx.textAlign = "center"; ctx.fillText("HOŞ GELDİN", 0, 2); ctx.restore(); },
    stools: () => { prism(3.7, .05, 2.6, .3, 4, "#7a5536", "#55391f", "#664629", 44); for (let i = 0; i < 3; i++) { const x = 3.95 + i * .85; shadowE(x + .15, .75, TW * .3, TW * .14); cyl(x + .15, .75, .03, 28, "#3a3a3f"); cyl(x + .15, .75, .14, 4, "#5c3f28", 28, "#7a5536"); } },
    sofa: () => { const x = 4.2, y = 7.0; shadowE(x + .85, y + .4, TW * 1.3, TW * .5); prism(x, y, 1.7, .7, 16, "#6b2f22", "#4a1f16", "#5a271c"); prism(x, y + .5, 1.7, .25, 34, "#7a3628", "#4a1f16", "#5a271c");
      prism(x - .12, y, .2, .75, 26, "#7a3628", "#4a1f16", "#5a271c"); prism(x + 1.62, y, .2, .75, 26, "#7a3628", "#4a1f16", "#5a271c");
      ctx.fillStyle = "rgba(255,230,200,.35)"; for (let i = 0; i < 6; i++) { const [bx, by] = iso(x + .2 + i * .27, y + .52, 26); ctx.beginPath(); ctx.arc(bx, by, 1.2, 0, Math.PI * 2); ctx.fill(); } },
    bookshelf: () => { const x = .05, y = 6.45; prism(x, y, .42, 1.1, 112, "#5c3f28", "#3f2a1a", "#4e3522");
      for (let r = 0; r < 4; r++) { prism(x + .02, y + .05, .4, 1.0, 2, "#7a5536", "#55391f", "#664629", 14 + r * 26);
        for (let b = 0; b < 7; b++) { const c = ["#b5533c", "#3b6ea8", "#e9c46a", "#5f8a4b", "#7a4f7a", "#c9772b", "#2b2117"][(b + r * 3) % 7]; poly([iso(x + .42, y + .1 + b * .13, 16 + r * 26), iso(x + .42, y + .2 + b * .13, 16 + r * 26), iso(x + .42, y + .2 + b * .13, 34 + r * 26 - (b % 3) * 3), iso(x + .42, y + .1 + b * .13, 34 + r * 26 - (b % 3) * 3)], c); } } },
    ivy: () => { for (let i = 0; i < 3; i++) { const x = 6.95 + i * .35; prism(x, .12, .28, .28, 16, "#c9772b", "#8f5420", "#a8642a"); const [px, py] = iso(x + .14, .1, 18);
      ctx.strokeStyle = "#3e6630"; ctx.lineWidth = 1.6 * TW / 40; ctx.beginPath(); ctx.moveTo(px, py); for (let k = 1; k < 8; k++) { const [vx, vy] = iso(x + .14 + Math.sin(k + i) * .12, 0, 18 + k * 12); ctx.lineTo(vx, vy); } ctx.stroke();
      ctx.fillStyle = "#5f8a4b"; for (let k = 0; k < 10; k++) { const [vx, vy] = iso(x + .14 + Math.sin(k * 1.3 + i) * .16, 0, 20 + k * 9); ctx.beginPath(); ctx.ellipse(vx, vy, 3 * TW / 40, 2 * TW / 40, k, 0, Math.PI * 2); ctx.fill(); } } },
    photos: () => { [[5.4, 5.9, 120, 150], [6.05, 6.75, 128, 162], [6.9, 7.4, 112, 140], [5.6, 6.2, 154, 172]].forEach(([a, b, z0, z1], i) => { frame("L", a, b, z0, z1, ["#9ab0bf", "#c9b79a", "#a7b89a", "#d9c7a8"][i], "#2b2117");
      wallRect("L", a + .1, b - .1, z0 + 4, z0 + (z1 - z0) * .45, "rgba(60,50,40,.35)"); }); },
    clock: () => { const [cx, cy] = iso(.55, 0, 150), r = 11 * TW / 40; ctx.save(); ctx.translate(cx, cy); ctx.transform(1, .5, 0, 1, 0, 0); ctx.fillStyle = "#3b2a20"; ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 1.5; const t = Date.now() / 1000; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t / 600) * r * .5, Math.sin(t / 600) * r * .5); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t / 10) * r * .8, Math.sin(t / 10) * r * .8); ctx.stroke(); ctx.restore(); },
    neon: () => { wallRect("R", 3.0, 6.0, 144, 168, "rgba(20,10,10,.25)"); wallText("R", 4.5, 156, "☕ COFFEE", 15, "#ffb3d9", "#ff3aa0"); },
    piano: () => { const x = 4.3, y = 7.25; shadowE(x + .75, y + .3, TW * 1.2, TW * .45); prism(x, y, 1.5, .55, 62, "#1c1614", "#0e0b0a", "#161211"); prism(x - .02, y - .12, 1.54, .2, 4, "#fdfcf9", "#ddd", "#eee", 36);
      for (let i = 0; i < 14; i++) { const [kx, ky] = iso(x + .05 + i * .105, y - .12, 40); ctx.fillStyle = "#111"; if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(kx, ky - 1, 1.6 * TW / 40, 3 * TW / 40); }
      prism(x + .5, y + .5, .5, .4, 16, "#2b2117", "#1a130e", "#221a14"); },
    aquarium: () => { const x = .08, y = 6.55; prism(x, y, .4, .95, 30, "#2b2117", "#1a130e", "#221a14"); ctx.save(); ctx.globalAlpha = .75; prism(x, y, .4, .95, 34, "#7fc7e0", "#3f8fb0", "#5aa8c8", 30); ctx.restore();
      for (let i = 0; i < 4; i++) { const u = ((time * .15 + i * .27) % 1), [fx2, fy2] = iso(x + .4, y + .1 + u * .75, 40 + i * 6); ctx.fillStyle = ["#ff9f3a", "#ffd23a", "#ff6a5a", "#9cf0ff"][i]; ctx.beginPath(); ctx.ellipse(fx2, fy2, 3 * TW / 40, 1.6 * TW / 40, -.45, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#4f7a3a"; for (let i = 0; i < 5; i++) { const [gx, gy] = iso(x + .4, y + .15 + i * .17, 31); ctx.beginPath(); ctx.ellipse(gx, gy - 6, 1.6, 7 * TW / 40, .2 * i, 0, Math.PI * 2); ctx.fill(); } },
    olive: () => { shadowE(7.35, .5, TW * .7, TW * .3); prism(7.0, .15, .7, .7, 28, "#d9cbb4", "#a8977c", "#bfae92"); const [tx, ty] = iso(7.35, .5, 28);
      ctx.strokeStyle = "#6b5a44"; ctx.lineWidth = 4 * TW / 40; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 6, ty - 30 * TW / 40, tx + 2, ty - 62 * TW / 40); ctx.stroke();
      for (let i = 0; i < 26; i++) { ctx.fillStyle = i % 2 ? "#8a9a6a" : "#a7b48a"; ctx.beginPath(); ctx.ellipse(tx + Math.cos(i * 2.3) * TW * .55 * Math.random() ** 0, ty - 70 * TW / 40 + Math.sin(i * 1.7) * TW * .35, TW * .12, TW * .05, i, 0, Math.PI * 2); ctx.fill(); } },
    artwall: () => { frame("L", 5.3, 6.3, 108, 168, "#c96f4a", "#c9a14f"); wallRect("L", 5.45, 6.15, 120, 150, "#e9c46a"); frame("L", 6.45, 7.0, 130, 168, "#3b6ea8", "#c9a14f"); frame("L", 6.45, 7.0, 108, 126, "#5f8a4b", "#c9a14f"); frame("L", 7.15, 7.6, 112, 160, "#7a4f7a", "#c9a14f"); },
    chandelier: () => { const [cx, cy] = iso(6.6, 4.4, 168), s = TW / 40; ctx.strokeStyle = "#c9a14f"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy - 60 * s); ctx.lineTo(cx, cy); ctx.stroke();
      glowAt(6.6, 4.4, 160, TW * 2.4, "rgba(255,236,190,.5)"); ctx.strokeStyle = "#d9b36a"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.ellipse(cx, cy + 6 * s, 22 * s, 8 * s, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, px = cx + Math.cos(a) * 22 * s, py = cy + 6 * s + Math.sin(a) * 8 * s; ctx.fillStyle = "rgba(220,240,255,.9)"; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 2 * s, py + 8 * s); ctx.lineTo(px - 2 * s, py + 8 * s); ctx.fill(); ctx.fillStyle = "#fff6d8"; ctx.beginPath(); ctx.arc(px, py - 2 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill(); } },
    brass: () => { wallRect("R", 3.2, 5.8, 146, 168, "#8a6a2c"); wallRect("R", 3.26, 5.74, 148, 166, "#d9b36a"); wallText("R", 4.5, 157, "CoffeBean", 12, "#4a3410", null, "700 italic"); }
  };
  const DECOR_DEFAULT_F2 = ["lamp", "bookshelf", "aquarium"];

  function table(x, y, kind) {
    shadowE(x + .4, y + .45, TW * .9, TW * .45);
    const chair = kind === 1 ? (cx, cy) => { cyl(cx + .17, cy + .17, .02, 18, "#3a3a3f"); cyl(cx + .17, cy + .17, .16, 3, "#5c3f28", 18, "#7a5536"); }
      : kind === 2 ? (cx, cy) => { prism(cx, cy, .36, .36, 18, "#5c3f28", "#3f2a1a", "#4e3522"); prism(cx + (cx < x ? 0 : .28), cy, .08, .36, 40, "#5c3f28", "#3f2a1a", "#4e3522"); }
      : (cx, cy) => { prism(cx, cy, .4, .4, 20, "#6b2f22", "#4a1f16", "#5a271c"); prism(cx + (cx < x ? 0 : .3), cy, .1, .4, 38, "#7a3628", "#4a1f16", "#5a271c"); };
    chair(x - .5, y + .15);
    if (kind === 1) { cyl(x + .4, y + .4, .04, 28, "#2b2117"); const [tx, ty, rx, ry] = cyl(x + .4, y + .4, .38, 2, "#a3784f", 28, PAL.oak[0]); ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.beginPath(); ctx.ellipse(tx - 4, ty - 2, rx * .5, ry * .4, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 2) { prism(x + .33, y + .33, .14, .14, 28, "#3d2a1f", "#2e1f17", "#3d2a1f"); prism(x, y, .8, .8, 3, "#a3784f", "#7a5536", "#8d6440", 28); }
    else { prism(x + .33, y + .33, .14, .14, 28, "#2b2b30", "#121214", "#3a3a40"); const [tx, ty, rx, ry] = cyl(x + .4, y + .4, .42, 2, "#e9e4dc", 28, "#f3efe8");
      ctx.strokeStyle = "rgba(150,140,130,.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx - rx * .6, ty); ctx.quadraticCurveTo(tx, ty - ry * .6, tx + rx * .5, ty + ry * .3); ctx.stroke(); }
    const [vx, vy] = iso(x + .4, y + .4, 31); ctx.fillStyle = "#fdfcf9"; ctx.beginPath(); ctx.ellipse(vx - 5, vy - 1, 3 * TW / 40, 1.6 * TW / 40, 0, 0, Math.PI * 2); ctx.fill();   // masada fincan/şekerlik
    chair(x + .95, y + .15);
  }
  const TABLES = {
    1: [[6.0, 2.6], [7.6, 4.6], [5.4, 5.6]],
    2: [[5.6, 2.2], [7.6, 2.6], [6.0, 4.6], [8.2, 5.2], [6.6, 6.9]],
    3: [[5.4, 2.0], [7.2, 2.0], [8.8, 3.4], [5.8, 4.2], [7.6, 5.4], [9.4, 5.6]]
  };
  function furniture(level, slots, st = {}) {
    const f = Object.assign({}, st.equipment || {}, st.tools || {}), dec = st.decor || {}, CL = CLEN(level);
    // ön tezgâh üstü
    if (f.superAuto) superAuto(1.1, 1.25); else machine(1.05, 1.25, f);
    if (slots > 1) machine(1.05, 2.75, f);
    grinder(f); counterTools(f);
    cupStacks(st.cups || {}, 5.55);
    if (CL >= 6) { pastryCase(6.15); register(1.5, 7.05 - (CL === 6 ? .1 : 0)); } else register(1.85, 5.95);
    if (CL >= 7) { prism(1.3, 7.6, .5, .3, 12, "#d9cbb4", "#a8977c", "#bfae92", 40); cyl(1.55, 7.75, .08, 10, "#5f8a4b", 52); }   // bahşiş kavanozu + küçük saksı
    // zemin halısı + masalar
    if (Q.fx > 0) { ctx.save(); ctx.globalAlpha = .55; poly([iso(5.2, 3.6), iso(8.8, 3.6), iso(8.8, 6.4), iso(5.2, 6.4)], level >= 3 ? "#5a2e3a" : "#7a4a32"); ctx.globalAlpha = .4; poly([iso(5.4, 3.8), iso(8.6, 3.8), iso(8.6, 6.2), iso(5.4, 6.2)], level >= 3 ? "#8a5a3a" : "#a86a42"); ctx.restore(); }
    TABLES[Math.min(3, level)].forEach(([x, y]) => table(x, y, Math.min(3, level)));
    if (level >= 3) { const x = 6.6, y = 7.0; shadowE(x + 1, y + .35, TW * 1.6, TW * .5); prism(x + .1, y + .2, .1, .3, 28, "#2b2117", "#1a130e", "#221a14"); prism(x + 1.8, y + .2, .1, .3, 28, "#2b2117", "#1a130e", "#221a14");   // uzun ortak masa
      prism(x, y, 2.0, .7, 3, "#8d6440", "#5c3f28", "#6f4d31", 28); for (let i = 0; i < 4; i++) cyl(x + .3 + i * .5, y + 1.0, .14, 4, "#5c3f28", 18, "#7a5536"); }
    // temel eşyalar: çöp kutusu, askılık, raflar
    cyl(1.6, 1 + CL + .45, .16, 22, "#3a3a3f", 0, "#2b2b30");
    { const [ax, ay] = iso(10.2, .5, 0), [bx, by] = iso(10.2, .5, 120); ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 3 * TW / 40; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); shadowE(10.2, .5, TW * .3, TW * .12);
      ctx.fillStyle = "#3b6ea8"; rr(bx - 7 * TW / 40, by + 6, 10 * TW / 40, 30 * TW / 40, 4); ctx.fill(); ctx.fillStyle = "#c9772b"; rr(bx + 1, by + 4, 8 * TW / 40, 22 * TW / 40, 4); ctx.fill(); }
    if (level >= 2) { prism(9.0, 0, 2.0, .35, 3, "#7a5536", "#55391f", "#664629", 92); for (let i = 0; i < 6; i++) cyl(9.2 + i * .3, .17, .08, 12, ["#c9a46a", "#b5533c", "#e9e4dc"][i % 3], 95, "#5c3f28"); }
    plant(.5, 7.6); if (level >= 2) plant(9.2, 7.0); if (level >= 3) { plant(9.6, 1.4); plant(3.7, 7.9); }
    extrasStand(st.extras);
    trafficDeco(st.traffic || {});
    Object.keys(DECOR).forEach(k => { if (dec[k]) DECOR[k](); });
    // sarkıt lambalar (dükkanla çoğalır)
    const lamps = [[3.0, 3.0], [6.0, 4.0], [6.4, 2.2], [8.0, 5.4], [5.6, 6.4], [8.4, 3.0]].slice(0, level * 2);
    lamps.forEach(([x, y]) => { const [lx, ly] = iso(x, y, 150), [bx, by] = iso(x, y, 120), s = TW / 40;
      ctx.strokeStyle = "#2b2117"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, ly - 40); ctx.lineTo(bx, by); ctx.stroke();
      if (Q.fx >= 2) { const g = ctx.createRadialGradient(bx, by + 8, 2, bx, by + 8, TW * 1.4); g.addColorStop(0, "rgba(255,225,170,.55)"); g.addColorStop(1, "rgba(255,225,170,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by + 8, TW * 1.4, 0, Math.PI * 2); ctx.fill(); }
      const g2 = ctx.createLinearGradient(bx - 12 * s, 0, bx + 12 * s, 0); g2.addColorStop(0, "#111"); g2.addColorStop(.4, "#3a3330"); g2.addColorStop(1, "#111");
      ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(bx - 12 * s, by + 4 * s); ctx.lineTo(bx + 12 * s, by + 4 * s); ctx.lineTo(bx + 6 * s, by - 10 * s); ctx.lineTo(bx - 6 * s, by - 10 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffe6b0"; ctx.beginPath(); ctx.ellipse(bx, by + 4 * s, 11 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill(); });
  }

  // ---- §11 oyuncu karakteri: uzun sarı saçlı, gerçekçi oranlı genç kadın; bluz + kiremit önlük (yazı yok)
  function barista(x, y, busy) {
    const [sx, sy] = iso(x, y), s = TW / 40, t = time, bob = busy ? Math.sin(t * 9) * 1.2 * s : Math.sin(t * 1.6) * .5 * s, hy = sy - 62 * s + bob;
    ctx.fillStyle = PAL.shadow; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 13 * s, 5.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // saçın arka kısmı (omuzların arkasına dökülür)
    const hair = ctx.createLinearGradient(sx, hy - 14 * s, sx, hy + 34 * s); hair.addColorStop(0, "#f6d77e"); hair.addColorStop(.5, "#e8bd55"); hair.addColorStop(1, "#c9963a");
    ctx.fillStyle = hair; ctx.beginPath(); ctx.moveTo(sx - 10.5 * s, hy - 2 * s); ctx.quadraticCurveTo(sx - 13 * s, hy + 18 * s, sx - 9 * s, hy + 32 * s); ctx.lineTo(sx + 9 * s, hy + 32 * s); ctx.quadraticCurveTo(sx + 13 * s, hy + 18 * s, sx + 10.5 * s, hy - 2 * s); ctx.closePath(); ctx.fill();
    // bacaklar + ayakkabı
    ctx.fillStyle = "#2f2a33"; rr(sx - 6 * s, sy - 22 * s, 5 * s, 22 * s, 2.5 * s); ctx.fill(); rr(sx + 1 * s, sy - 22 * s, 5 * s, 22 * s, 2.5 * s); ctx.fill();
    ctx.fillStyle = "#1c1614"; rr(sx - 7 * s, sy - 3 * s, 7 * s, 4 * s, 2 * s); ctx.fill(); rr(sx + .5 * s, sy - 3 * s, 7 * s, 4 * s, 2 * s); ctx.fill();
    // gövde: bluz (bel inceliği), kollar
    const bl = ctx.createLinearGradient(sx - 11 * s, 0, sx + 11 * s, 0); bl.addColorStop(0, "#d9d2c6"); bl.addColorStop(.45, "#fbf8f2"); bl.addColorStop(1, "#cfc7ba");
    ctx.fillStyle = bl; ctx.beginPath(); ctx.moveTo(sx - 10 * s, sy - 46 * s + bob); ctx.quadraticCurveTo(sx - 7 * s, sy - 32 * s + bob, sx - 8.5 * s, sy - 20 * s); ctx.lineTo(sx + 8.5 * s, sy - 20 * s); ctx.quadraticCurveTo(sx + 7 * s, sy - 32 * s + bob, sx + 10 * s, sy - 46 * s + bob); ctx.quadraticCurveTo(sx, sy - 50 * s + bob, sx - 10 * s, sy - 46 * s + bob); ctx.fill();
    const arm = busy ? Math.sin(t * 9) * 3 * s : 0, skin = "#f1c9a8";
    [[-1, arm], [1, -arm]].forEach(([d, a]) => { ctx.fillStyle = bl; rr(sx + d * 9.5 * s - 3 * s, sy - 46 * s + bob, 6 * s, 13 * s, 3 * s); ctx.fill();
      ctx.strokeStyle = skin; ctx.lineWidth = 4 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sx + d * 9.5 * s, sy - 34 * s + bob); ctx.quadraticCurveTo(sx + d * 11 * s, sy - 28 * s + a, sx + d * 6 * s, sy - 25 * s + a); ctx.stroke(); ctx.lineCap = "butt"; });
    // kiremit önlük: göğüslük + etek, cep, logo, bel bağcığı
    const ap = ctx.createLinearGradient(sx - 9 * s, 0, sx + 9 * s, 0); ap.addColorStop(0, "#94402d"); ap.addColorStop(.5, "#c25c42"); ap.addColorStop(1, "#8c3c2a");
    ctx.fillStyle = ap; ctx.beginPath(); ctx.moveTo(sx - 5.5 * s, sy - 44 * s + bob); ctx.lineTo(sx + 5.5 * s, sy - 44 * s + bob); ctx.lineTo(sx + 7 * s, sy - 33 * s + bob); ctx.lineTo(sx + 9 * s, sy - 13 * s); ctx.quadraticCurveTo(sx, sy - 11 * s, sx - 9 * s, sy - 13 * s); ctx.lineTo(sx - 7 * s, sy - 33 * s + bob); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8c3c2a"; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(sx - 5 * s, sy - 44 * s + bob); ctx.lineTo(sx - 3.5 * s, sy - 50 * s + bob); ctx.moveTo(sx + 5 * s, sy - 44 * s + bob); ctx.lineTo(sx + 3.5 * s, sy - 50 * s + bob); ctx.stroke();   // boyun askısı
    ctx.strokeStyle = "rgba(255,240,225,.55)"; ctx.setLineDash([1.5 * s, 1.5 * s]); ctx.beginPath(); ctx.moveTo(sx - 6.5 * s, sy - 33 * s + bob); ctx.lineTo(sx + 6.5 * s, sy - 33 * s + bob); ctx.stroke(); ctx.setLineDash([]);   // dikiş
    ctx.fillStyle = "#a84a35"; rr(sx - 5 * s, sy - 25 * s, 10 * s, 6 * s, 1.5 * s); ctx.fill();                    // cep
    ctx.fillStyle = "#f3dfb8"; ctx.beginPath(); ctx.ellipse(sx, sy - 39 * s + bob, 2.2 * s, 3 * s, .5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#a84a35"; ctx.lineWidth = .7 * s; ctx.beginPath(); ctx.moveTo(sx - 1 * s, sy - 41 * s + bob); ctx.quadraticCurveTo(sx + .8 * s, sy - 39 * s + bob, sx - .4 * s, sy - 37 * s + bob); ctx.stroke();   // çekirdek logo
    ctx.strokeStyle = "#7d3424"; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(sx + 7 * s, sy - 31 * s + bob); ctx.quadraticCurveTo(sx + 11 * s, sy - 28 * s, sx + 9 * s, sy - 24 * s); ctx.stroke();   // bağcık
    // boyun + yüz
    ctx.fillStyle = "#e8b994"; rr(sx - 2.5 * s, hy + 7 * s, 5 * s, 6 * s, 2 * s); ctx.fill();
    const fg = ctx.createRadialGradient(sx - 2.5 * s, hy - 2 * s, 1, sx, hy, 10 * s); fg.addColorStop(0, "#fde6d3"); fg.addColorStop(.7, "#f3caa9"); fg.addColorStop(1, "#e0a986");
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(sx, hy, 7.6 * s, 9.4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(160,90,60,.18)"; ctx.beginPath(); ctx.ellipse(sx, hy + 8 * s, 6 * s, 2 * s, 0, 0, Math.PI); ctx.fill();          // çene gölgesi
    // gözler (iris, parıltı, kirpik), kaşlar, burun, dudaklar, allık
    [-1, 1].forEach(d => { const ex = sx + d * 3.1 * s, ey = hy + .2 * s;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(ex, ey, 1.9 * s, 1.15 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4f86a8"; ctx.beginPath(); ctx.arc(ex, ey + .1 * s, 1.05 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1c2a33"; ctx.beginPath(); ctx.arc(ex, ey + .1 * s, .5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex + .4 * s, ey - .35 * s, .3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3a2a22"; ctx.lineWidth = .8 * s; ctx.beginPath(); ctx.ellipse(ex, ey, 1.95 * s, 1.2 * s, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + d * 1.9 * s, ey - .5 * s); ctx.lineTo(ex + d * 2.6 * s, ey - 1.2 * s); ctx.stroke();
      ctx.strokeStyle = "#b88a45"; ctx.lineWidth = .7 * s; ctx.beginPath(); ctx.moveTo(ex - d * 1.5 * s, ey - 2.6 * s); ctx.quadraticCurveTo(ex, ey - 3.4 * s, ex + d * 2 * s, ey - 2.5 * s); ctx.stroke(); });
    ctx.strokeStyle = "rgba(170,105,75,.55)"; ctx.lineWidth = .6 * s; ctx.beginPath(); ctx.moveTo(sx + .2 * s, hy + 1 * s); ctx.quadraticCurveTo(sx + 1 * s, hy + 3.4 * s, sx - .3 * s, hy + 3.8 * s); ctx.stroke();
    ctx.fillStyle = "#d9737a"; ctx.beginPath(); ctx.moveTo(sx - 2.2 * s, hy + 5.4 * s); ctx.quadraticCurveTo(sx, hy + 4.6 * s, sx + 2.2 * s, hy + 5.4 * s); ctx.quadraticCurveTo(sx, hy + 7.2 * s, sx - 2.2 * s, hy + 5.4 * s); ctx.fill();
    ctx.fillStyle = "rgba(240,130,130,.28)"; ctx.beginPath(); ctx.arc(sx - 4.6 * s, hy + 3 * s, 1.8 * s, 0, Math.PI * 2); ctx.arc(sx + 4.6 * s, hy + 3 * s, 1.8 * s, 0, Math.PI * 2); ctx.fill();
    // ön saç: yandan ayrılmış perçem, yüzü çerçeveleyen tutamlar, parlama
    ctx.fillStyle = hair; ctx.beginPath(); ctx.moveTo(sx - 8.5 * s, hy + 6 * s); ctx.quadraticCurveTo(sx - 10 * s, hy - 9 * s, sx - 1 * s, hy - 10.5 * s); ctx.quadraticCurveTo(sx + 9 * s, hy - 10 * s, sx + 8.8 * s, hy + 6 * s);
    ctx.quadraticCurveTo(sx + 7 * s, hy - 4 * s, sx + 1.5 * s, hy - 6.5 * s); ctx.quadraticCurveTo(sx - 3 * s, hy - 3 * s, sx - 6.5 * s, hy - 3.5 * s); ctx.quadraticCurveTo(sx - 7.5 * s, hy + 1 * s, sx - 8.5 * s, hy + 6 * s); ctx.fill();
    ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(sx - 8.6 * s, hy + 10 * s, 2.2 * s, 9 * s, .1, 0, Math.PI * 2); ctx.ellipse(sx + 8.8 * s, hy + 10 * s, 2.2 * s, 9 * s, -.1, 0, Math.PI * 2); ctx.fill();
    if (Q.fx > 0) { ctx.strokeStyle = "rgba(255,250,220,.6)"; ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(sx - 5 * s, hy - 8.5 * s); ctx.quadraticCurveTo(sx, hy - 10 * s, sx + 5 * s, hy - 8 * s); ctx.stroke(); }
  }
  function staff(x, y, busy) {                                     // yardımcı barista: önlüklü, tezgâhın arkasında
    const [sx, sy] = iso(x, y), s = TW / 40, bob = busy ? Math.sin(time * 8) * 1.5 * s : 0;
    ctx.fillStyle = PAL.shadow; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 14 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b2117"; rr(sx - 8 * s, sy - 20 * s, 6 * s, 20 * s, 3); ctx.fill(); rr(sx + 2 * s, sy - 20 * s, 6 * s, 20 * s, 3); ctx.fill();
    const g = ctx.createLinearGradient(sx - 12 * s, 0, sx + 12 * s, 0); g.addColorStop(0, "#d6d0c4"); g.addColorStop(.45, "#f6f1e8"); g.addColorStop(1, "#cbc4b6");
    ctx.fillStyle = g; rr(sx - 12 * s, sy - 50 * s + bob, 24 * s, 34 * s, 9 * s); ctx.fill();
    ctx.fillStyle = "#5b4231"; rr(sx - 9 * s, sy - 42 * s + bob, 18 * s, 26 * s, 4 * s); ctx.fill();
    const fg = ctx.createRadialGradient(sx - 3 * s, sy - 60 * s + bob, 1, sx, sy - 58 * s + bob, 10 * s); fg.addColorStop(0, "#f3d1b2"); fg.addColorStop(1, "#d39d78");
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(sx, sy - 58 * s + bob, 9.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a1c14"; ctx.beginPath(); ctx.arc(sx, sy - 61 * s + bob, 9.5 * s, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a1c14"; ctx.beginPath(); ctx.arc(sx - 3.2 * s, sy - 57.5 * s + bob, 1 * s, 0, Math.PI * 2); ctx.arc(sx + 3.2 * s, sy - 57.5 * s + bob, 1 * s, 0, Math.PI * 2); ctx.fill();
    if (busy) { ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = `600 ${11 * s}px system-ui`; ctx.textAlign = "center"; ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 3; ctx.fillText("hazırlıyor…", sx, sy - 74 * s); ctx.shadowBlur = 0; }
  }

  // ---- §8 satın alma listeleri için ürün görselleri (dükkandaki çizimin küçük resmi)
  const TH_ITEMS = {
    staff: [.42, 3.0, 35, () => staff(.42, 3.0, false)],
    "eq:grindPrecise": [1.5, 4.75, 62, () => grinder({ grindPrecise: true })], "eq:autoGrind": [1.5, 4.75, 62, () => grinder({ grindPrecise: true, autoGrind: true })],
    "eq:scaleGrind": [1.5, 4.75, 62, () => grinder({ scaleGrind: true })], "eq:precScale": [1.99, 4.22, 42, () => counterTools({}, "precScale")],
    "eq:scaleTamp": [1.75, 4.85, 46, () => counterTools({}, "scaleTamp")], "eq:autoTamp": [1.5, 5.24, 52, () => counterTools({}, "autoTamp")],
    "eq:pidGauge": [1.6, 1.9, 58, () => machine(1.05, 1.25, { pidGauge: true })], "eq:steamWand": [1.6, 1.9, 58, () => machine(1.05, 1.25, { steamWand: true })],
    "eq:dualGroup": [1.6, 2.65, 56, () => { machine(1.05, 1.25, {}); machine(1.05, 2.75, {}); }], "eq:superAuto": [1.6, 1.85, 64, () => superAuto(1.1, 1.25)],
    "eq:fridge": [.23, 6.17, 50, () => backCounter({ equipment: {} }, "fridge")], "eq:thermoPitcher": [.2, 4.65, 42, () => backCounter({}, "thermoPitcher")],
    "eq:pourPitcher": [.2, 4.98, 42, () => backCounter({}, "pourPitcher")], "eq:autoMilk": [.21, 3.73, 46, () => backCounter({}, "autoMilk")],
    "tool:cezve": [2.75, .45, 40, () => brewBar({}, "cezve")], "tool:frenchPress": [2.98, .42, 48, () => brewBar({}, "frenchPress")], "tool:v60": [3.22, .45, 44, () => brewBar({}, "v60")],
    "eq:tkMachine": [3.01, .76, 44, () => brewBar({}, "tkMachine")], "eq:filterMachine": [3.26, .77, 48, () => brewBar({}, "filterMachine")],
    "tool:kettle": [.2, 3.95, 42, () => backCounter({}, "kettle")], "tool:milkKit": [.2, 4.32, 42, () => backCounter({}, "milkKit")],
    "tool:boiler": [.2, 5.75, 52, () => backCounter({}, "boiler")], "tool:cocoa": [.2, 5.3, 40, () => backCounter({}, "cocoa")],
    "tr:cust1": [9.6, .5, 26, () => trafficDeco({}, "c1")], "tr:cust2": [1.4, 0, 97, () => trafficDeco({}, "c2")], "tr:cust3": [10, 0, 85, () => trafficDeco({}, "c3")],
    "tr:freq1": [4.5, 0, 120, () => trafficDeco({}, "f1")], "tr:freq2": [7.15, 0, 137, () => trafficDeco({}, "f2")], "tr:freq3": [8.2, 0, 126, () => trafficDeco({}, "f3")],
    "decor:plant": [5.25, 7.55, 40], "decor:lamp": [.55, 6.85, 62], "decor:record": [7.35, .45, 22], "decor:poster": [0, 6.05, 137], "decor:mat": [8.2, .42, 0], "decor:stools": [5.0, .4, 26],
    "decor:sofa": [5.05, 7.35, 18], "decor:bookshelf": [.26, 7.0, 56], "decor:ivy": [7.3, .1, 50], "decor:photos": [0, 6.4, 140], "decor:clock": [.55, 0, 150], "decor:neon": [4.5, 0, 156],
    "decor:piano": [5.05, 7.5, 32], "decor:aquarium": [.28, 7.0, 34], "decor:olive": [7.35, .5, 52], "decor:artwall": [0, 6.45, 138], "decor:chandelier": [6.6, 4.4, 165], "decor:brass": [4.5, 0, 157]
  };
  ["espS", "espD", "cupS", "cupM", "cupL"].forEach(k => { const [col, r, h] = CUPCOL[k]; TH_ITEMS["cup:" + k] = [4, 4, h * 1.4, () => { shadowE(4, 4, TW * r * 2.4, TW * r * 1.2); for (let j = 0; j < 4; j++) cyl(4, 4, r, h * .7, col, j * h * .55, j === 3 ? "#e8dfd2" : col); }]; });
  TH_ITEMS["sup:bean"] = [.25, 5.55, 93, () => { prism(.05, 5.35, .35, .4, 26, "#c9a46a", "#8f6e3f", "#a98a52", 80); wallText("L", 5.55, 92, "☕", 7, "rgba(60,35,15,.7)", null, "400"); }];
  TH_ITEMS["sup:milk"] = [4.15, 4.15, 16, () => { shadowE(4.15, 4.15, TW * .4, TW * .2); prism(4, 4, .3, .3, 30, "#fdfcf9", "#e0dcd4", "#ecebe6"); prism(4, 4, .3, .3, 7, "#3b6ea8", "#2c5585", "#34619a", 12);
    const a1 = iso(4, 4, 30), a2 = iso(4.3, 4, 30), a3 = iso(4.3, 4.3, 30), a4 = iso(4, 4.3, 30), tp = iso(4.15, 4.15, 38); poly([a4, a3, tp], "#ecebe6"); poly([a3, a2, tp], "#d8d4cc"); }];
  ["sleeve", "napkin", "sugar", "stirrer", "sweetener", "straw"].forEach(k => { const pos = { sleeve: [1.18, .4, 44], napkin: [1.53, .41, 46], sugar: [1.82, .4, 45], stirrer: [2.05, .4, 46], sweetener: [2.31, .3, 42], straw: [1.6, .65, 48] }[k];
    TH_ITEMS["ex:" + k] = [pos[0], pos[1], pos[2], () => { EXN = {}; exItem(k, true); }]; });
  const thCache = {};
  function thumb(key) {
    if (thCache[key]) return thCache[key]; const it = TH_ITEMS[key]; if (!it) return null;
    const c = document.createElement("canvas"); c.width = 168; c.height = 128;
    const save = { ctx, TW, TH, OX, OY, Q }; ctx = c.getContext("2d"); Q = QUALITY.high;
    const SC = [[/cup:/, 130], [/ex:/, 120], [/sup:milk/, 95], [/tool:|thermo|pourP|precScale|scaleTamp|autoMilk|autoTamp/, 88], [/grind|scaleGrind|fridge/, 62], [/staff/, 64], [/freq1/, 26], [/neon|brass|stools|sofa|piano|artwall|photos|cust2|cust3|freq2/, 36], [/dualGroup/, 34], [/superAuto|pid|steam/, 46], [/plant|olive|bookshelf|aquarium|lamp|chandelier|record|ivy|mat|clock|poster|cust1|freq3|sup:bean/, 48]];
    TW = (SC.find(([r]) => r.test(key)) || [0, 46])[1]; TH = TW / 2; OX = 0; OY = 0;
    const [cx, cy] = iso(it[0], it[1], it[2]); OX = 84 - cx; OY = 66 - cy;
    const g = ctx.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#f3ece1"); g.addColorStop(1, "#d8cbb8"); ctx.fillStyle = g; ctx.fillRect(0, 0, 168, 128);
    try { (it[3] || DECOR[key.slice(6)])(); } catch (e) {}
    const url = c.toDataURL(); ({ ctx, TW, TH, OX, OY, Q } = save); return (thCache[key] = url);
  }

  // ---- müşteriler ----
  function person(c, active) {
    const [sx, sy] = iso(c.pos.x, c.pos.y); const [c1, c2] = TYPE_COLOR[c.type] || ["#777", "#444"]; const s = TW / 40;
    const walk = c.moving ? Math.sin(time * 14) * 2 * s : 0;
    ctx.save(); ctx.fillStyle = PAL.shadow; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 15 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#2b2117"; rr(sx - 8 * s, sy - 20 * s, 6 * s, 20 * s + walk, 3); ctx.fill(); rr(sx + 2 * s, sy - 20 * s, 6 * s, 20 * s - walk, 3); ctx.fill();   // bacaklar
    ctx.fillStyle = "#15100c"; rr(sx - 9 * s, sy - 2 * s + walk, 8 * s, 4 * s, 2 * s); ctx.fill(); rr(sx + 1 * s, sy - 2 * s - walk, 8 * s, 4 * s, 2 * s); ctx.fill();   // ayakkabılar
    const g = ctx.createLinearGradient(sx - 12 * s, 0, sx + 12 * s, 0); g.addColorStop(0, c2); g.addColorStop(.45, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; rr(sx - 12 * s, sy - 50 * s, 24 * s, 34 * s, 9 * s); ctx.fill();                                                                       // gövde
    ctx.fillStyle = "rgba(255,255,255,.12)"; rr(sx - 9 * s, sy - 48 * s, 7 * s, 28 * s, 4 * s); ctx.fill();
    const sw = c.moving ? Math.sin(time * 14) * 3 * s : 0; ctx.fillStyle = c2;                                                                           // kollar (yürürken sallanır)
    rr(sx - 15 * s, sy - 47 * s + sw * .3, 5 * s, 24 * s, 2.5 * s); ctx.fill(); rr(sx + 10 * s, sy - 47 * s - sw * .3, 5 * s, 24 * s, 2.5 * s); ctx.fill();
    ctx.fillStyle = "#e0b08c"; ctx.beginPath(); ctx.arc(sx - 12.5 * s, sy - 22 * s + sw, 2.6 * s, 0, Math.PI * 2); ctx.arc(sx + 12.5 * s, sy - 22 * s - sw, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.12)"; rr(sx - 12 * s, sy - 26 * s, 24 * s, 6 * s, 3 * s); ctx.fill();   // kumaş gölgesi
    if (c.type === "business") { ctx.fillStyle = "#f2efe8"; ctx.beginPath(); ctx.moveTo(sx - 5 * s, sy - 50 * s); ctx.lineTo(sx + 5 * s, sy - 50 * s); ctx.lineTo(sx, sy - 42 * s); ctx.fill(); ctx.fillStyle = "#a33a2e"; ctx.beginPath(); ctx.moveTo(sx - 2 * s, sy - 46 * s); ctx.lineTo(sx + 2 * s, sy - 46 * s); ctx.lineTo(sx + 3 * s, sy - 30 * s); ctx.lineTo(sx, sy - 27 * s); ctx.lineTo(sx - 3 * s, sy - 30 * s); ctx.fill(); }
    if (c.type === "student") { ctx.fillStyle = "#c9962b"; rr(sx + 8 * s, sy - 48 * s, 7 * s, 22 * s, 3 * s); ctx.fill(); }
    const hg = ctx.createRadialGradient(sx - 3 * s, sy - 60 * s, 2, sx, sy - 58 * s, 10 * s); hg.addColorStop(0, "#f3cfae"); hg.addColorStop(1, "#c48a62");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(sx, sy - 58 * s, 9.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = (c.type === "nejla" || c.type === "elder") ? "#d9d4cc" : c.type === "student" ? "#6b4a2a" : "#3a2a22"; ctx.beginPath(); ctx.arc(sx, sy - 61 * s, 9.5 * s, Math.PI, Math.PI * 2); ctx.fill();
    if (active) { ctx.strokeStyle = "#ffd89a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 19 * s, 9 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
    // §7 konuşma baloncuğu: yalnızca öndeki müşteri sorar; fiyat tepkisi ("Çok pahalı!", "Ne kadar ucuz!")
    const sayTxt = c.say && (!c.sayUntil || performance.now() < c.sayUntil) ? c.say : null;
    if (sayTxt) {
      ctx.font = `600 ${12 * s}px system-ui`; const tw = ctx.measureText(sayTxt).width, bw = tw + 22 * s + (c.patienceMax && !c.leaving ? 22 * s : 0), bh = 28 * s, by = sy - 96 * s;
      const bad = /pahalı/i.test(sayTxt), good = /ucuz/i.test(sayTxt);
      ctx.fillStyle = bad ? "#fbe3dc" : good ? "#e6f3dc" : "rgba(255,255,255,.97)"; ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 6; rr(sx - bw / 2, by - bh / 2, bw, bh, 10 * s); ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(sx - 5 * s, by + bh / 2); ctx.lineTo(sx, by + bh / 2 + 8 * s); ctx.lineTo(sx + 5 * s, by + bh / 2); ctx.fill();
      ctx.fillStyle = bad ? "#9c3a26" : good ? "#3f6b2c" : "#2b2117"; ctx.textAlign = "left"; ctx.fillText(sayTxt, sx - bw / 2 + 11 * s, by + 4 * s);
      if (c.patienceMax && !c.leaving) { const p = c.patience / c.patienceMax, rx = sx + bw / 2 - 14 * s; ctx.lineWidth = 3.5 * s; ctx.strokeStyle = "rgba(0,0,0,.1)"; ctx.beginPath(); ctx.arc(rx, by, 7 * s, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = p < .3 ? "#b5533c" : p < .6 ? "#c9962b" : "#6f7d4a"; ctx.beginPath(); ctx.arc(rx, by, 7 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke(); }
    } else if (!c.leaving || c.angry) {
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
  function queueSlot(i) { return { x: QUEUE0.x, y: QUEUE0.y + .25 + i * .95 }; }   // §11 tezgâhın önünde tek, düz sıra
  function step(c, dt) {
    const tg = c.target; if (!tg) { c.moving = false; return; }
    const dx = tg.x - c.pos.x, dy = tg.y - c.pos.y, d = Math.hypot(dx, dy), sp = 2.2 * dt;
    if (d < sp) { c.pos.x = tg.x; c.pos.y = tg.y; c.moving = false; if (c.leaving) c.gone = true; } else { c.pos.x += dx / d * sp; c.pos.y += dy / d * sp; c.moving = true; }
  }
  function draw(state, dt = 0) {
    if (!cv) return;
    acc += dt; if (Q.fps && acc < 1 / Q.fps && dt > 0) return; dt = acc; acc = 0;   // düşük kalite: 30 kare/sn
    size(); time += dt; hits = [];
    const { customers = [], orders = [], t = .3, level = 1, slots = 1 } = state; const L = daylight(t);
    ctx.fillStyle = PAL.wall; ctx.fillRect(0, 0, W, H);
    room(L, state); furniture(level, slots, state);
    customers.forEach(c => step(c, dt));
    [...customers].sort((a, b) => (a.pos.x + a.pos.y) - (b.pos.x + b.pos.y)).forEach(c => person(c, orders.some(o => o.cust === c)));
    drawFx(dt); drawHL(dt);
    // akşam sıcaklığı + vinyet
    if (Q.fx > 0) { const vg = ctx.createRadialGradient(W / 2, H * .45, H * .4, W / 2, H * .45, Math.max(W, H) * .85); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(35,20,8,${.12 + .22 * L.warm})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
    if (L.warm) { ctx.fillStyle = `rgba(255,150,60,${L.warm * .12})`; ctx.fillRect(0, 0, W, H); }
  }
  function hitTest(px, py) { const h = hits.find(h => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h); return h ? h.id : null; }
  const itemPos = k => { const it = TH_ITEMS[k]; return it ? [it[0], it[1], it[2] || 0] : null; };   // yalnız dükkanda çizimi olan ürünler
  // §8 "✨ Yeni!" vurgusu: ürünün tam çizildiği yerde nabız gibi parlayan halka + ok + yazı (~4 sn)
  const HL = [];
  function highlight(k, delay = 0) { const p = itemPos(k); if (p) HL.push({ k, x: p[0], y: p[1], z: p[2], t: -delay }); return !!p; }
  // ürünün kendisini ayrı tuvale çizip kenarlarını parlak altın ışıkla çevreler
  let hlCv = null, hlTint = null;
  function itemLayer(k) {
    const it = TH_ITEMS[k], fn = it && (it[3] || DECOR[k.slice(6)]); if (!fn) return null;
    const dpr = cv.width / W; if (!hlCv) { hlCv = document.createElement("canvas"); hlTint = document.createElement("canvas"); }
    [hlCv, hlTint].forEach(c => { if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; } });
    const save = ctx, c2 = hlCv.getContext("2d"); c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, hlCv.width, hlCv.height); c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx = c2; try { fn(); } catch (e) {} ctx = save;
    const t2 = hlTint.getContext("2d"); t2.setTransform(1, 0, 0, 1, 0, 0); t2.globalCompositeOperation = "source-over"; t2.clearRect(0, 0, hlTint.width, hlTint.height);
    t2.drawImage(hlCv, 0, 0); t2.globalCompositeOperation = "source-in"; t2.fillStyle = "#ffd23a"; t2.fillRect(0, 0, hlTint.width, hlTint.height); t2.globalCompositeOperation = "source-over";
    return true;
  }
  function drawHL(dt) {
    for (let i = HL.length - 1; i >= 0; i--) { const h = HL[i]; h.t += dt; if (h.t < 0) continue; if (h.t > 4.2) { HL.splice(i, 1); continue; }
      const [sx, sy] = iso(h.x, h.y, h.z), s = TW / 40, a = h.t < 3.6 ? 1 : 1 - (h.t - 3.6) / .6, pulse = 1 + .25 * Math.sin(h.t * 7);
      ctx.save(); ctx.globalAlpha = a;
      if (itemLayer(h.k)) {                                                        // parlak kenar: altın siluet etrafa yayılır, ürün üstte net
        ctx.setTransform(1, 0, 0, 1, 0, 0); const o = Math.max(2, 3 * s * cv.width / W) * pulse;
        ctx.shadowColor = "rgba(255,210,58,.95)"; ctx.shadowBlur = 18 * pulse * cv.width / W;
        [[o, 0], [-o, 0], [0, o], [0, -o], [o * .7, o * .7], [-o * .7, o * .7], [o * .7, -o * .7], [-o * .7, -o * .7]].forEach(([dx, dy]) => ctx.drawImage(hlTint, dx, dy));
        ctx.shadowBlur = 0; ctx.drawImage(hlCv, 0, 0); const d = cv.width / W; ctx.setTransform(d, 0, 0, d, 0, 0);
      } else { ctx.strokeStyle = "#ffd23a"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.ellipse(sx, sy, 24 * s * pulse, 12 * s * pulse, 0, 0, Math.PI * 2); ctx.stroke(); }
      const by = sy - 46 * s - Math.abs(Math.sin(h.t * 4)) * 6 * s;
      ctx.fillStyle = "#ffd23a"; ctx.beginPath(); ctx.moveTo(sx, sy - 18 * s); ctx.lineTo(sx - 8 * s, by + 14 * s); ctx.lineTo(sx + 8 * s, by + 14 * s); ctx.closePath(); ctx.fill();
      ctx.font = `800 ${16 * s}px system-ui`; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.strokeText("✨ Yeni!", sx, by); ctx.fillStyle = "#fff4c2"; ctx.fillText("✨ Yeni!", sx, by);
      ctx.restore(); }
  }
  return { init, setQuality, draw, hitTest, addFx, queueSlot, thumb, itemPos, highlight, DOOR };
})();
