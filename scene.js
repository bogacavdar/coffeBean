// scene.js – §11: izometrik dükkan sahnesi (gerçekçi gölgeli, kodla çizilmiş; Blender render'ları gelince sprite olarak değişir)
window.SCENE = (() => {
  const PAL = { oakA: "#9a7048", oakB: "#7c5634", wall: "#e9e1d3", wallDark: "#cfc4b1", steel: "#c9ccd0", steelDark: "#7d8187",
    counterTop: "#3a2a1f", counterFront: "#5a4030", espresso: "#3b2314", crema: "#c9975a", milk: "#f4efe6", shadow: "rgba(30,20,10,.35)" };
  const TYPE_COLOR = { hurry: ["#2f4f6f", "#1c3246"], student: ["#6f8a4a", "#4d6330"], geek: ["#8a5a3a", "#5d3a22"], regular: ["#a0493c", "#6f2f26"] };
  let cv, ctx, W, H, hits = [];
  let TW = 34, TH = 17;
  function init(canvas) { cv = canvas; ctx = cv.getContext("2d"); }
  function size() {
    const r = cv.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    W = r.width; H = r.height; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); TW = Math.min(34, W / 17, H / 9); TH = TW / 2;
  }
  const iso = (x, y, z = 0) => [W / 2 + (x - y) * TW, H * 0.22 + (x + y) * TH - z];
  function poly(pts, fill, stroke) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .6; ctx.stroke(); } }
  // iso prizma: x,y zemin, w,d boyut, h yükseklik
  function prism(x, y, w, d, h, top, left, right, z0 = 0) {
    h += z0;
    const a = iso(x, y, h), b = iso(x + w, y, h), c = iso(x + w, y + d, h), e = iso(x, y + d, h);
    const a0 = iso(x, y + d, z0), b0 = iso(x + w, y + d, z0), c0 = iso(x + w, y, z0);
    poly([e, c, b0, a0], left); poly([c, b, c0, b0], right); poly([a, b, c, e], top, "rgba(0,0,0,.12)");
  }
  function shadowEllipse(x, y, rx, ry) { const [sx, sy] = iso(x, y); ctx.save(); ctx.fillStyle = PAL.shadow; ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  function daylight(t) { // 0..1 gün ilerlemesi → gökyüzü ve ışık
    const k = Math.sin(Math.PI * t); const sky = `rgb(${Math.round(150 + 80 * k)},${Math.round(170 + 60 * k)},${Math.round(200 + 30 * k)})`;
    const warm = t > .7 ? (t - .7) / .3 : 0; return { sky, warm, k };
  }
  function draw(state) {
    if (!cv) return; size(); const { queue = [], orders = [], t = 0.3, level = 1, slots = 1 } = state;
    const L = daylight(t); hits = [];
    const cols = 9, rows = 7;
    // arka duvarlar
    ctx.fillStyle = `rgba(233,225,211,1)`; ctx.fillRect(0, 0, W, H);
    const wallL = [iso(0, 0, 0), iso(0, rows, 0), iso(0, rows, 150), iso(0, 0, 150)]; poly(wallL, PAL.wallDark);
    const wallR = [iso(0, 0, 0), iso(cols, 0, 0), iso(cols, 0, 150), iso(0, 0, 150)]; poly(wallR, PAL.wall);
    // vitrin penceresi (sağ duvar) – gün ışığı
    const win = [iso(2.2, 0, 40), iso(6.2, 0, 40), iso(6.2, 0, 125), iso(2.2, 0, 125)];
    poly(win, L.sky, PAL.steelDark);
    ctx.save(); ctx.globalAlpha = .18 + .25 * L.k; const g = ctx.createLinearGradient(...iso(4, 0, 100), ...iso(4, 4, 0)); g.addColorStop(0, "#fff7dc"); g.addColorStop(1, "rgba(255,247,220,0)");
    poly([iso(2.2, 0, 40), iso(6.2, 0, 40), iso(7.5, 4.5, 0), iso(3.5, 4.5, 0)], g); ctx.restore();
    // zemin – meşe tahta
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      const shade = ((x * 7 + y * 13) % 5) / 5; const c = mix(PAL.oakA, PAL.oakB, shade * .5 + (y / rows) * .3);
      poly([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], c, "rgba(0,0,0,.08)");
    }
    // tezgâh (sol duvara paralel, x=1..2, y=1..5.5)
    shadowEllipse(1.6, 3.4, 60, 30);
    prism(1, 1, 1.2, 4.6, 38, PAL.counterTop, PAL.counterFront, "#4a3327");
    // tezgâh üst parlaklık
    ctx.save(); ctx.globalAlpha = .18; poly([iso(1, 1, 38), iso(2.2, 1, 38), iso(2.2, 5.6, 38), iso(1, 5.6, 38)], "#fff"); ctx.restore();
    // espresso makinesi (çelik)
    prism(1.05, 1.3, 1.0, 1.2, 28, PAL.steel, PAL.steelDark, "#a4a8ad", 38);   // tezgâh üstünde
    if (slots > 1) prism(1.05, 2.7, 1.0, 1.2, 28, PAL.steel, PAL.steelDark, "#a4a8ad", 38);
    // öğütücü
    prism(1.2, 4.6, .5, .5, 22, "#2d2d30", "#141416", "#3c3c40", 38);
    // masalar – seviyeye göre 2 / 3 / 4
    const tables = [[6.3, 2.2], [6.3, 5.0], [4.0, 5.3], [7.5, 3.6]].slice(0, 1 + level);
    tables.forEach(([x, y]) => { shadowEllipse(x + .4, y + .4, 26, 13); prism(x, y, .8, .8, 30, PAL.oakA, PAL.oakB, "#6a4a2e"); });
    // bitkiler (dekor)
    plant(0.4, 6.3); if (level >= 2) plant(8.3, 0.5);
    // müşteri kuyruğu – tezgâh önünde y boyunca
    const start = { x: 2.9, y: 1.6 };
    queue.forEach((c, i) => {
      const x = start.x + Math.min(i, 2) * .15 + (i > 2 ? (i - 2) * .55 : 0), y = start.y + i * .78;
      const active = orders.some(o => o.cust === c);
      person(x, y, c, active, i);
    });
    // kapı tarafı yumuşak vinyet
    const vg = ctx.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .45, H); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(40,25,10,${.25 + .25 * L.warm})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  function plant(x, y) { prism(x, y, .5, .5, 18, "#9c6b3f", "#6e4a2a", "#80573a"); const [px, py] = iso(x + .25, y + .25, 18);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? "#4f7a3a" : "#6b9a4b"; ctx.beginPath(); ctx.ellipse(px + Math.cos(i) * 9, py - 10 - Math.abs(Math.sin(i * 1.7)) * 10, 7, 12, i * .9, 0, Math.PI * 2); ctx.fill(); }
  }
  function person(x, y, c, active, idx) {
    const [sx, sy] = iso(x, y); const [c1, c2] = TYPE_COLOR[c.type] || ["#777", "#444"];
    ctx.save(); ctx.fillStyle = PAL.shadow; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 14, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // gövde
    const g = ctx.createLinearGradient(sx - 10, 0, sx + 10, 0); g.addColorStop(0, c2); g.addColorStop(.5, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; rr(sx - 10, sy - 40, 20, 38, 8); ctx.fill();
    // baş
    const hg = ctx.createRadialGradient(sx - 3, sy - 50, 2, sx, sy - 48, 9); hg.addColorStop(0, "#f1c9a5"); hg.addColorStop(1, "#c98f66");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(sx, sy - 48, 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a2a22"; ctx.beginPath(); ctx.arc(sx, sy - 51, 8.5, Math.PI, Math.PI * 2); ctx.fill();
    // baloncuk: içecek + sabır halkası
    const by = sy - 84, p = c.patience / c.patienceMax;
    ctx.fillStyle = "rgba(255,255,255,.96)"; rr(sx - 22, by - 16, 44, 32, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - 5, by + 16); ctx.lineTo(sx, by + 24); ctx.lineTo(sx + 5, by + 16); ctx.fill();
    cup(sx - 8, by + 1, 10, c.drink); // içecek simgesi
    ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(sx + 11, by, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = p < .3 ? "#b5533c" : "#6f7d4a"; ctx.beginPath(); ctx.arc(sx + 11, by, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
    if (active) { ctx.strokeStyle = "#b5533c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 18, 9, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = "rgba(43,33,23,.85)"; ctx.font = "600 10px system-ui"; ctx.textAlign = "center"; ctx.fillText(c.name, sx, sy + 16);
    hits.push({ id: c.id, x: sx - 24, y: by - 18, w: 48, h: sy + 20 - (by - 18) });
  }
  function cup(x, y, s, drink) { const milky = /latte|cappuccino|cortado|macchiato/.test(drink);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#8b7a6a"; ctx.lineWidth = 1; rr(x - s * .6, y - s * .5, s * 1.2, s, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = milky ? "#e7d2b8" : "#4a2e1c"; ctx.fillRect(x - s * .5, y - s * .4, s, s * .35); }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function mix(a, b, t) { const pa = hex(a), pb = hex(b); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`; }
  function hex(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function hitTest(px, py) { const h = hits.find(h => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h); return h ? h.id : null; }
  return { init, draw, hitTest };
})();
