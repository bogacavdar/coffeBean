// drinkart.js – v0.43 §16: her tarifin kendine özgü bitiş görseli (yandan, tezgâhta) ve seçim listesindeki küçük resmi.
// Görünüm tablosu (LOOKS) tarif başına: kap (v), katmanlar (L, alttan üste [renk, oran]), yüzey (s), üst süsleme (top), yan eşyalar (side), demleme aleti (brew).
window.DRINKART = (() => {
  let c = null;                                                     // aktif 2B bağlam (mantıksal ızgara 480×250)
  const PI = Math.PI, X0 = 240, B = 214;
  const num = (x, d = 0) => Number.isFinite(+x) ? +x : d;
  const lg = (x0, y0, x1, y1, st) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, k]) => g.addColorStop(o, k)); return g; };
  const rg = (x, y, r0, r1, st) => { const g = c.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(.1, r1)); st.forEach(([o, k]) => g.addColorStop(o, k)); return g; };
  const ell = (x, y, rx, ry, f, s, lw) => { c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, PI * 2); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw || 1.5; c.stroke(); } };
  const rr = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const rnd = s => { let x = Math.sin(s * 99.13) * 43758.5453; return x - Math.floor(x); };

  // ---- renkler
  const K = { esp: "#3a1d0c", crema: "#b9783a", cremaL: "#d8a466", coffee: "#4a2812", black: "#24140a", milk: "#f4ece0", micro: "#eadbc4", latte: "#c99a6a", foam: "#fbf6ee",
    choc: "#5a2f17", chai: "#c48a55", salep: "#efe3cc", cream: "#fffaf1", caramel: "#c9802c", condensed: "#f3e6c8", tonic: "rgba(232,240,236,.55)", amber: "#8a4a1c", ice: "rgba(235,248,255,.72)" };

  // ---- kaplar
  const V = {
    demi:   { w: 58, wb: 40, h: 40, t: "cup", saucer: 1, handle: "s" },
    lungo:  { w: 58, wb: 42, h: 54, t: "cup", saucer: 1, handle: "s" },
    cupS:   { w: 78, wb: 44, h: 44, t: "bowl", saucer: 1, handle: "m" },
    cup:    { w: 100, wb: 52, h: 54, t: "bowl", saucer: 1, handle: "m" },
    cupL:   { w: 120, wb: 60, h: 62, t: "bowl", saucer: 1, handle: "m" },
    mug:    { w: 78, wb: 74, h: 86, t: "cup", handle: "l" },
    mugR:   { w: 78, wb: 74, h: 86, t: "cup", handle: "l", col: "#b5533c" },
    mugG:   { w: 78, wb: 74, h: 86, t: "cup", handle: "l", col: "#5f8a4b" },
    mugB:   { w: 78, wb: 74, h: 86, t: "cup", handle: "l", col: "#3b6ea8" },
    bowl:   { w: 132, wb: 64, h: 52, t: "bowl" },
    clay:   { w: 66, wb: 56, h: 64, t: "cup", handle: "l", col: "#b0643a" },
    fincan: { w: 48, wb: 34, h: 42, t: "cup", saucer: 1, handle: "s", band: "#c9a24a" },
    fincanB:{ w: 48, wb: 34, h: 42, t: "cup", saucer: 1, handle: "s", band: "#3b6ea8", col: "#f6f3ee" },
    fincanR:{ w: 48, wb: 34, h: 42, t: "cup", saucer: 1, handle: "s", band: "#a0493c" },
    fincanZ:{ w: 48, wb: 34, h: 42, t: "cup", saucer: 1, handle: "s", zarf: 1 },
    finjan: { w: 42, wb: 28, h: 30, t: "cup", band: "#c9a24a" },
    mirra:  { w: 36, wb: 30, h: 26, t: "cup", band: "#2f6a5a" },
    glassS: { w: 56, wb: 46, h: 62, t: "glass" },
    glassM: { w: 66, wb: 54, h: 86, t: "glass" },
    glassT: { w: 64, wb: 54, h: 138, t: "glass" },
    glassTH:{ w: 64, wb: 54, h: 128, t: "glass", holder: 1 },
    glassH: { w: 60, wb: 52, h: 80, t: "glass", handle: "g" },
    iced:   { w: 80, wb: 60, h: 128, t: "glass" },
    rocks:  { w: 78, wb: 70, h: 64, t: "glass", thick: 1 },
    coupe:  { w: 108, wb: 20, h: 40, t: "glass", stem: 48, coupe: 1 },
    stemS:  { w: 58, wb: 42, h: 58, t: "glass", stem: 24 },
    irish:  { w: 68, wb: 56, h: 96, t: "glass", stem: 26, handle: "g" },
    pint:   { w: 78, wb: 58, h: 150, t: "glass" },
    frappe: { w: 82, wb: 58, h: 112, t: "glass", dome: 1 },
    copinho:{ w: 42, wb: 34, h: 46, t: "glass" },
    dessert:{ w: 108, wb: 34, h: 48, t: "glass", stem: 18, coupe: 1 },
    davara: { w: 54, wb: 46, h: 70, t: "steel", tray: 1 },
    egg:    { w: 54, wb: 40, h: 40, t: "cup", inBowl: 1 }
  };
  const hot = v => !["iced", "pint", "frappe", "rocks", "coupe"].includes(v);

  // ---- tarif görünümleri (82 tarifin her biri farklı)
  const LOOKS = {
    espresso:     { v: "demi", s: "crema", top: ["tiger"] },
    ristretto:    { v: "demi", s: "cremaD", top: ["tiger"], side: ["beans"] },
    lungo:        { v: "lungo", s: "cremaL" },
    americano:    { v: "mug", s: "black", top: ["ring"] },
    longblack:    { v: "cup", s: "crema", top: ["tiger"], side: ["spoon"] },
    conpanna:     { v: "demi", s: "crema", top: ["cream"] },
    romano:       { v: "demi", s: "crema", top: ["peel"], side: ["lemonhalf"] },
    macchiato:    { v: "demi", s: "crema", top: ["dollop"] },
    cortado:      { v: "glassS", L: [[K.coffee, .5], [K.latte, .38]], s: "micro", top: ["dot"] },
    gibraltar:    { v: "glassS", L: [[K.coffee, .45], [K.latte, .45]], s: "micro", top: ["heart"], side: ["spoon"] },
    piccolo:      { v: "glassS", L: [[K.coffee, .35], [K.latte, .55]], s: "micro", top: ["rosetta"] },
    magic:        { v: "cupS", s: "latteD", top: ["tulip"] },
    flatwhite:    { v: "cup", s: "latteD", top: ["rosetta"] },
    latte:        { v: "cupL", s: "latte", top: ["heart"] },
    cappuccino:   { v: "cup", s: "foam", dome: 10, top: ["heartF", "cocoa"] },
    latmac:       { v: "glassT", L: [[K.milk, .55], [K.latte, .2], [K.foam, .17]], s: "foam", top: ["mark"], straw: "spoonL" },
    galao:        { v: "glassTH", L: [[K.micro, .5], [K.latte, .25], [K.foam, .15]], s: "foam" },
    breve:        { v: "cup", s: "breve", top: ["rosetta"], side: ["creamjug"] },
    melange:      { v: "cup", s: "foam", dome: 16, side: ["water"] },
    conleche:     { v: "glassM", L: [[K.coffee, .42], ["#c89466", .45]], s: "latteH" },
    vanillalatte: { v: "cupL", s: "latte", top: ["heart"], side: ["vanilla"] },
    mocha:        { v: "mug", s: "choc", top: ["cream", "shavings"] },
    hotchoc:      { v: "mugR", s: "choc", top: ["marsh"] },
    chai:         { v: "mugG", s: "chai", top: ["anise"], side: ["cinstick"] },
    dirtychai:    { v: "mugG", s: "chai", top: ["shot", "cinnamon"] },
    salep:        { v: "mug", s: "salep", dome: 6, top: ["cinnamonH"] },
    pumpkin:      { v: "mug", s: "pumpkin", top: ["cream", "cinnamon"], side: ["pumpkin"] },
    gingerbread:  { v: "mugR", s: "latte", top: ["cream", "nutmeg"], side: ["cookie"] },
    peppermint:   { v: "mugR", s: "choc", top: ["cream", "redDrizzle"], side: ["cane"] },
    saltcaramel:  { v: "cupL", s: "latte", top: ["caramelX", "salt"] },
    caramelmac:   { v: "glassT", L: [[K.milk, .5], [K.latte, .18], [K.foam, .14]], s: "foam", top: ["caramelX"] },
    marocchino:   { v: "glassS", L: [[K.choc, .2], [K.coffee, .38], [K.foam, .3]], s: "foam", top: ["cocoaH"] },
    bicerin:      { v: "stemS", L: [[K.choc, .32], [K.coffee, .32], [K.cream, .28]], s: "cream" },
    einspanner:   { v: "glassH", L: [[K.coffee, .55], [K.cream, .38]], s: "cream", top: ["creamPeak"] },
    irish:        { v: "irish", L: [[K.black, .7], [K.cream, .2]], s: "cream", top: ["beans3"] },
    cubano:       { v: "demi", s: "espumita", side: ["sugar"] },
    cortadito:    { v: "glassS", L: [[K.coffee, .45], ["#d9b48a", .3], [K.micro, .12]], s: "espumita", side: ["sugar"] },
    bombon:       { v: "glassS", L: [[K.condensed, .42], [K.coffee, .46]], s: "crema", side: ["spoon"] },
    affogato:     { v: "dessert", L: [[K.coffee, .35]], scoop: "#f6efe2", top: ["espPour"], side: ["spoon"] },
    redeye:       { v: "mugB", s: "black", top: ["shot"] },
    cafeaulait:   { v: "bowl", s: "aulait", side: ["croissant"] },
    kopi:         { v: "glassH", L: [["#2b1a0e", .14], ["#5a3418", .72]], s: "kopi", top: ["grounds"] },
    espressotonic:{ v: "iced", L: [[K.tonic, .5], ["#7a4a2a", .12], [K.coffee, .22]], s: "coffee", ice: 4, bubbles: 1, rim: "lemon" },
    icedamericano:{ v: "iced", L: [[K.black, .85]], s: "black", ice: 5, straw: "#2b2117" },
    icedlatte:    { v: "iced", L: [[K.milk, .55], ["#b88a5c", .12], [K.coffee, .18]], s: "coffee", ice: 5, straw: "#f4ece0" },
    spanish:      { v: "iced", L: [[K.condensed, .14], [K.milk, .48], [K.coffee, .22]], s: "coffee", ice: 4, straw: "#b5533c" },
    mazagran:     { v: "rocks", L: [["#3a200e", .8]], s: "black", ice: 3, rim: "lemon", top: ["mint"] },
    dalgona:      { v: "iced", L: [[K.milk, .62], ["#c98a3c", .24]], s: "dalgona", ice: 2, top: ["peaks"] },
    greekfrappe:  { v: "iced", L: [["#6a3a18", .38], ["#c79b6a", .44]], s: "frothy", ice: 3, straw: "#3b6ea8", bend: 1 },
    freddoesp:    { v: "rocks", L: [["#5a3014", .6], ["#a8703c", .22]], s: "frothy", ice: 3 },
    freddocap:    { v: "rocks", L: [["#5a3014", .5], [K.foam, .38]], s: "foam", ice: 2, top: ["cinnamon"] },
    shakerato:    { v: "coupe", L: [["#4a2810", .55], ["#c08850", .35]], s: "frothy", top: ["beans3"] },
    frappuccino:  { v: "frappe", L: [["#d8b48a", .9]], s: "cream", top: ["creamDome", "caramelX"], straw: "#5f8a4b" },
    mochafrappe:  { v: "frappe", L: [["#8a5a3a", .9]], s: "cream", top: ["creamDome", "chocX"], straw: "#7a4f7a" },
    icedmocha:    { v: "iced", L: [[K.choc, .2], [K.milk, .4], [K.coffee, .22]], s: "cream", ice: 3, top: ["cream", "chocX"] },
    coldbrew:     { v: "rocks", L: [["#2a160a", .82]], s: "black", sphere: 1 },
    coldfoamcb:   { v: "iced", L: [["#2a160a", .6], [K.foam, .26]], s: "foam", ice: 3, top: ["dust"] },
    nitro:        { v: "pint", L: [["#1c0f07", .68], ["#6a4426", .1], ["#e3cfae", .14]], s: "head", cascade: 1 },
    colddrip:     { v: "stemS", L: [["#3a1e0c", .75]], s: "clear", brew: "carafe" },
    flashbrew:    { v: "iced", L: [["#7a3e14", .78]], s: "clear", ice: 6, brew: "v60" },
    vietnam:      { v: "glassM", L: [[K.condensed, .2], ["#2a160a", .62]], s: "black", ice: 3, brew: "phin" },
    eggcoffee:    { v: "egg", s: "egg", top: ["cocoa"] },
    frenchpress:  { v: "mug", s: "blackF", brew: "press" },
    filter:       { v: "cup", s: "filter", brew: "v60" },
    chemex:       { v: "cupS", s: "filterL", brew: "chemex" },
    kalitaw:      { v: "mugB", s: "filter", brew: "kalita" },
    aeropress:    { v: "mugG", s: "blackF", brew: "aero" },
    moka:         { v: "demi", s: "mokaS", brew: "moka" },
    siphon:       { v: "cupS", s: "filterL", brew: "siphon" },
    cafezinho:    { v: "copinho", L: [["#2a160a", .8]], s: "black", brew: "cloth" },
    indianf:      { v: "davara", s: "frothy" },
    olla:         { v: "clay", s: "black", top: ["cinstickIn"], brew: "olla" },
    qahwa:        { v: "finjan", s: "qahwa", brew: "dallah", side: ["dates"] },
    turkish:      { v: "fincan", s: "tkfoam", side: ["water", "lokum"] },
    sutluturk:    { v: "fincanR", s: "tkmilk", side: ["water", "lokum"] },
    dibek:        { v: "fincanZ", s: "tkdibek", side: ["water"] },
    osmanli:      { v: "fincanR", s: "tkfoam", top: ["specks"], side: ["cardamom"] },
    damla:        { v: "fincanB", s: "tkfoam", side: ["mastic", "water"] },
    menengic:     { v: "fincanB", s: "menengic", side: ["pistachio"] },
    kenger:       { v: "fincanZ", s: "kenger", side: ["lokum"] },
    mirra:        { v: "mirra", s: "mirra", brew: "ibrik" },
    kumda:        { v: "fincan", s: "tkfoam", brew: "sand" }
  };
  const SURF = { crema: ["#d6a160", "#a8652a", "#5a2c10"], cremaD: ["#b77836", "#7a4218", "#3a1a08"], cremaL: ["#e2b87e", "#c08a4c", "#7a4a20"], black: ["#3a2214", "#24140a", "#140a04"], blackF: ["#4a2c16", "#2e180a", "#1c0e05"],
    micro: ["#f3e7d4", "#dcc4a0", "#b98a5a"], latte: ["#f2e3cc", "#d8b48a", "#9a6838"], latteD: ["#e9d2b0", "#c89466", "#7a4a20"], latteH: ["#d9b088", "#b98a5a", "#8a5a30"], foam: ["#fffaf2", "#efe4d2", "#d0b48e"], breve: ["#f7ead0", "#e3c99a", "#b08a50"],
    choc: ["#7a4424", "#5a2f17", "#3a1c0c"], chai: ["#e0b080", "#c48a55", "#8e5a2e"], salep: ["#fbf3e2", "#efe1c6", "#d8c3a0"], pumpkin: ["#eab070", "#d0884a", "#9a5a2a"], espumita: ["#e9c79a", "#d2a06a", "#9a6a3a"],
    aulait: ["#d9b896", "#bf9670", "#8a6040"], kopi: ["#6a4426", "#4a2a14", "#2a160a"], coffee: ["#6a3c1a", "#4a2812", "#2a160a"], dalgona: ["#e2a65a", "#c9873c", "#9a5e22"], frothy: ["#d9b088", "#b98a5a", "#7a4a20"],
    cream: ["#fffdf8", "#f6eee0", "#dcc8a8"], clear: ["#9a5a26", "#7a3e14", "#4a2008"], head: ["#f2e3c4", "#e3cfae", "#c0a07a"], egg: ["#f6dc8a", "#e9c66a", "#c99a3a"], filter: ["#6a3a18", "#4a2610", "#2a1408"], filterL: ["#8a4a1c", "#6a3412", "#3a1a08"],
    mokaS: ["#8a5426", "#5a3014", "#2a160a"], qahwa: ["#d4b46a", "#b8944a", "#7a6028"], tkfoam: ["#9a7048", "#7a5232", "#4a2e18"], tkmilk: ["#c8a07a", "#a8805a", "#7a5634"], tkdibek: ["#a07a52", "#8a6440", "#5a3e22"],
    menengic: ["#b8a06a", "#9a8450", "#6a5a30"], kenger: ["#d0b890", "#b89c70", "#8a704a"], mirra: ["#2a160a", "#1a0c04", "#0e0602"] };

  // ---- kap gövdesi
  const wAt = (v, y, b) => v.wb + (v.w - v.wb) * Math.min(1, Math.max(0, (b - y) / v.h));
  function bodyPath(v, x, b) { const top = b - v.h, hw = v.w / 2, hb = v.wb / 2; c.beginPath();
    if (v.coupe) { c.moveTo(x - hw, top); c.quadraticCurveTo(x - hw + 6, b - 4, x - hb, b); c.lineTo(x + hb, b); c.quadraticCurveTo(x + hw - 6, b - 4, x + hw, top); c.closePath(); return; }
    if (v.t === "bowl") { c.moveTo(x - hw, top); c.bezierCurveTo(x - hw, top + v.h * .7, x - hb - 8, b, x - hb, b); c.lineTo(x + hb, b); c.bezierCurveTo(x + hb + 8, b, x + hw, top + v.h * .7, x + hw, top); c.closePath(); return; }
    c.moveTo(x - hw, top); c.lineTo(x - hb, b - 4); c.quadraticCurveTo(x - hb, b, x - hb + 4, b); c.lineTo(x + hb - 4, b); c.quadraticCurveTo(x + hb, b, x + hb, b - 4); c.lineTo(x + hw, top); c.closePath(); }
  function handle(v, x, b) { if (!v.handle) return; const top = b - v.h, hw = wAt(v, top + v.h * .45, b) / 2;
    const S = v.handle === "s" ? [10, 14, .3] : v.handle === "m" ? [14, 18, .28] : v.handle === "g" ? [14, 30, .22] : [18, 34, .2];
    c.strokeStyle = v.handle === "g" ? "rgba(200,225,235,.9)" : (v.col || "#f7f3ec"); c.lineWidth = v.handle === "g" ? 5 : 7; c.beginPath();
    c.ellipse(x + hw + S[0] * .45, top + v.h * (v.t === "bowl" ? .32 : .42), S[0], S[1] / 2 + 2, 0, -PI / 2, PI / 2); c.stroke();
    c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1.5; c.stroke(); }
  function saucer(v, x, b) { const rx = v.w * .78 + 10; ell(x, b + 3, rx + 6, 11, "rgba(0,0,0,.22)"); ell(x, b, rx, 10, lg(0, b - 10, 0, b + 10, [[0, "#ffffff"], [1, "#d8d0c4"]])); ell(x, b - 2, rx * .55, 5, "rgba(0,0,0,.08)");
    if (v.band) ell(x, b, rx - 3, 8.5, null, v.band, 1.6); }
  function surface(look, x, y, rx, ry, q) { const S = SURF[look.s] || SURF.crema, k = q == null ? 1 : .85 + q / 700;
    ell(x, y, rx, ry, rg(x - rx * .15, y - ry * .2, 1, rx * 1.05, [[0, S[0]], [.62 * k, S[1]], [1, S[2]]])); return { x, y, rx, ry }; }

  function drawVessel(look, x, q) {
    const v = V[look.v] || V.cup, b = B - (v.stem || 0), top = b - v.h;
    if (v.inBowl) { ell(x, B + 2, 78, 12, "rgba(0,0,0,.2)"); c.fillStyle = lg(x - 70, 0, x + 70, 0, [[0, "#d9d2c6"], [.5, "#ffffff"], [1, "#cfc7ba"]]); c.beginPath(); c.moveTo(x - 72, B - 34); c.quadraticCurveTo(x - 66, B, x - 30, B); c.lineTo(x + 30, B); c.quadraticCurveTo(x + 66, B, x + 72, B - 34); c.closePath(); c.fill(); ell(x, B - 34, 72, 12, "#bcd6de"); ell(x, B - 34, 72, 12, null, "#e8e2d8", 3); }
    if (v.saucer) saucer(v, x, B);
    else if (v.tray) { ell(x, B, 58, 12, lg(0, B - 12, 0, B + 12, [[0, "#eef1f3"], [1, "#9aa0a6"]])); ell(x, B - 4, 50, 9, "#c9ced3"); ell(x, B - 5, 44, 7, SURF.frothy[1]); }
    else if (!v.stem) ell(x, B + 2, v.wb * .7 + 8, 7, "rgba(0,0,0,.22)");
    if (v.stem) { ell(x, B + 2, 34, 7, "rgba(0,0,0,.2)"); ell(x, B - 1, 28, 6, "rgba(225,240,245,.6)", "rgba(150,180,190,.9)", 1.5); c.fillStyle = "rgba(225,240,245,.6)"; c.fillRect(x - 3, b, 6, v.stem); c.strokeStyle = "rgba(150,180,190,.9)"; c.lineWidth = 1.2; c.strokeRect(x - 3, b, 6, v.stem); }
    const glass = v.t === "glass", steel = v.t === "steel";
    if (glass) {
      c.save(); bodyPath(v, x, b); c.fillStyle = "rgba(225,240,245,.28)"; c.fill(); c.clip();
      const inH = v.h - (v.thick ? 10 : 5); let y = b - (v.thick ? 10 : 5); let sy = y;
      (look.L || []).forEach(([col, f], i) => { const h = inH * f; c.fillStyle = col; c.fillRect(x - v.w, y - h, v.w * 2, h + 1);
        if (i > 0 && Q(look) && !look.cascade) { c.fillStyle = lg(0, y - 6, 0, y + 6, [[0, "rgba(0,0,0,0)"], [.5, "rgba(0,0,0,.08)"], [1, "rgba(0,0,0,0)"]]); c.fillRect(x - v.w, y - 6, v.w * 2, 12); }
        y -= h; sy = y; });
      if (look.cascade) { for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(230,210,180,${.12 + rnd(i) * .2})`; c.beginPath(); c.arc(x - v.w / 2 + 8 + rnd(i + 3) * (v.w - 16), b - 20 - rnd(i + 7) * (v.h * .6), 1 + rnd(i) * 1.6, 0, PI * 2); c.fill(); } }
      if (look.bubbles) { for (let i = 0; i < 26; i++) { c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1; c.beginPath(); c.arc(x - v.w / 2 + 8 + rnd(i + 1) * (v.w - 16), b - 10 - rnd(i + 9) * (v.h * .45), 1.2 + rnd(i) * 1.5, 0, PI * 2); c.stroke(); } }
      if (look.ice) for (let i = 0; i < look.ice; i++) { const ix = x - v.w / 2 + 12 + rnd(i + 2) * (v.w - 34), iy = sy - 4 + (i % 3) * 16 + rnd(i + 5) * 6; c.save(); c.translate(ix + 9, iy + 8); c.rotate(rnd(i) - .5); rr(-10, -9, 20, 18, 4); c.fillStyle = K.ice; c.fill(); c.strokeStyle = "rgba(160,205,220,.9)"; c.lineWidth = 1.2; c.stroke(); c.fillStyle = "rgba(255,255,255,.8)"; c.fillRect(-6, -6, 5, 3); c.restore(); }
      if (look.sphere) { ell(x, sy + 16, 22, 22, rg(x - 7, sy + 8, 2, 24, [[0, "rgba(255,255,255,.95)"], [1, "rgba(190,225,240,.7)"]]), "rgba(150,200,215,.9)", 1.2); }
      if (look.scoop) { ell(x + 4, sy - 6, 30, 22, rg(x - 6, sy - 16, 3, 34, [[0, "#ffffff"], [1, look.scoop]])); c.fillStyle = "rgba(90,45,15,.75)"; c.beginPath(); c.moveTo(x - 20, sy - 14); c.quadraticCurveTo(x + 2, sy - 30, x + 26, sy - 12); c.quadraticCurveTo(x + 10, sy - 2, x + 18, sy + 8); c.quadraticCurveTo(x - 4, sy - 8, x - 20, sy - 14); c.fill(); }
      c.restore();
      const rx = wAt(v, sy, b) / 2 - 3, srf = look.L && look.L.length ? surface(look, x, sy, rx, Math.max(3, rx * .2), q) : null;
      // cam kenarı ve parlaklık
      c.save(); bodyPath(v, x, b); c.strokeStyle = "rgba(150,180,190,.95)"; c.lineWidth = 2; c.stroke(); c.restore();
      c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.moveTo(x - v.w / 2 + 6, top + 6); c.lineTo(x - v.w / 2 + 12, top + 6); c.lineTo(x - v.wb / 2 + 12, b - 8); c.lineTo(x - v.wb / 2 + 7, b - 8); c.closePath(); c.fill();
      ell(x, top, v.w / 2, Math.max(3, v.w * .09), null, "rgba(160,190,200,.95)", 1.6);
      if (v.holder) { c.strokeStyle = "#9aa0a6"; c.lineWidth = 3; c.strokeRect(x - v.wb / 2 - 3, b - 30, v.wb + 6, 26); c.strokeStyle = "#7d8187"; c.lineWidth = 4; c.beginPath(); c.ellipse(x + v.wb / 2 + 12, b - 17, 10, 14, 0, -PI / 2, PI / 2); c.stroke(); }
      handle(v, x, b);
      return { v, x, b, top, srf, glass: true };
    }
    // opak kap (porselen, toprak, çelik)
    const body = steel ? lg(x - v.w / 2, 0, x + v.w / 2, 0, [[0, "#8e9399"], [.35, "#eef1f3"], [.6, "#b9bec4"], [1, "#7c8187"]]) : v.zarf ? lg(x - v.w / 2, 0, x + v.w / 2, 0, [[0, "#8a4a22"], [.4, "#e0a060"], [1, "#7a3e1a"]])
      : lg(x - v.w / 2, 0, x + v.w / 2, 0, [[0, shadeC(v.col || "#f7f3ec", .82)], [.35, v.col || "#ffffff"], [1, shadeC(v.col || "#f7f3ec", .78)]]);
    handle(v, x, b); bodyPath(v, x, b); c.fillStyle = body; c.fill(); c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1.2; c.stroke();
    if (v.band) { c.save(); bodyPath(v, x, b); c.clip(); c.fillStyle = v.band; c.fillRect(x - v.w, top + 6, v.w * 2, 3); c.fillRect(x - v.w, b - 9, v.w * 2, 2); c.restore(); }
    if (v.zarf) { c.save(); bodyPath(v, x, b); c.clip(); c.strokeStyle = "rgba(255,230,180,.5)"; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x - 18 + i * 7, b - 18, 4, 0, PI * 2); c.stroke(); } c.restore(); }
    ell(x, top, v.w / 2, Math.max(4, v.w * .14), steel ? "#d9dde1" : (v.col ? shadeC(v.col, .9) : "#f2ece2"));
    const srf = surface(look, x, top + 2, v.w / 2 - 4, Math.max(3, v.w * .14) - 2.5, q);
    return { v, x, b, top, srf, glass: false };
  }
  function shadeC(hex, k) { const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, bl = n & 255; return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(bl * k)})`; }
  const Q = look => !look.cascade;

  // ---- yüzey ve üst süslemeler
  function clipS(s, fn) { c.save(); c.beginPath(); c.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, PI * 2); c.clip(); fn(); c.restore(); }
  function heart(s, col, sc = 1) { const w = s.rx * .55 * sc, h = s.ry * .9 * sc; c.fillStyle = col; c.beginPath(); c.moveTo(s.x, s.y + h);
    c.bezierCurveTo(s.x - w * 1.3, s.y, s.x - w * .9, s.y - h * 1.2, s.x, s.y - h * .35); c.bezierCurveTo(s.x + w * .9, s.y - h * 1.2, s.x + w * 1.3, s.y, s.x, s.y + h); c.fill(); }
  function dome(s, h, cols) { c.fillStyle = rg(s.x - s.rx * .2, s.y - h, 2, s.rx * 1.1, [[0, cols[0]], [.7, cols[1]], [1, cols[2]]]); c.beginPath(); c.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, PI); c.ellipse(s.x, s.y, s.rx, h + s.ry, 0, PI, 0); c.fill(); return { x: s.x, y: s.y - h, rx: s.rx * .8, ry: s.ry * .8 }; }
  function creamSwirl(s, big) { const n = big ? 4 : 3; let y = s.y, rx = s.rx * (big ? 1 : .82);
    for (let i = 0; i < n; i++) { ell(s.x, y - 3, rx, rx * .42, rg(s.x - rx * .3, y - 8, 1, rx, [[0, "#ffffff"], [1, "#efe4d2"]]), "rgba(200,180,150,.6)", 1); y -= rx * .38; rx *= .74; }
    c.fillStyle = "#fffdf8"; c.beginPath(); c.moveTo(s.x - rx, y); c.quadraticCurveTo(s.x, y - rx * 1.8, s.x + rx * .4, y - rx * 2.2); c.quadraticCurveTo(s.x + rx * .2, y - rx * .8, s.x + rx, y); c.fill(); return { x: s.x, y: y + 4, rx: s.rx * .7 }; }
  function drizzle(s, col, w) { c.strokeStyle = col; c.lineWidth = w || 2.2; c.lineCap = "round"; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(s.x - s.rx * .8, s.y + i * s.ry * .35 - 4); c.quadraticCurveTo(s.x, s.y + i * s.ry * .35 + 4, s.x + s.rx * .8, s.y + i * s.ry * .35 - 2); c.stroke(); }
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(s.x + i * s.rx * .32, s.y - s.ry - 2); c.lineTo(s.x + i * s.rx * .32 + 4, s.y + s.ry); c.stroke(); } }
  function dots(s, col, n, sz, seed) { c.fillStyle = col; for (let i = 0; i < n; i++) { const a = rnd(i + seed) * PI * 2, r = Math.sqrt(rnd(i * 3 + seed)); c.beginPath(); c.arc(s.x + Math.cos(a) * r * s.rx * .85, s.y + Math.sin(a) * r * (s.ry || s.rx * .3) * .85, sz * (.6 + rnd(i) * .8), 0, PI * 2); c.fill(); } }
  function tops(look, R) {
    let s = R.srf; if (!s) return;
    if (look.dome) s = dome(s, look.dome, SURF[look.s] || SURF.foam);
    (look.top || []).forEach(t => {
      if (t === "tiger") clipS(s, () => { c.strokeStyle = "rgba(70,30,8,.35)"; c.lineWidth = 1.6; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(s.x + 3, s.y, s.rx * (.25 + i * .13), s.ry * (.25 + i * .13), 0, i * .8, i * .8 + 1.6); c.stroke(); } dots(s, "rgba(255,235,200,.4)", 18, .9, 4); });
      else if (t === "ring") clipS(s, () => { ell(s.x, s.y, s.rx * .92, s.ry * .9, null, "rgba(200,140,80,.6)", 3); });
      else if (t === "dollop") { ell(s.x, s.y - 1, s.rx * .45, s.ry * .6, "#fffaf2"); ell(s.x - 3, s.y - 3, s.rx * .2, s.ry * .25, "#ffffff"); }
      else if (t === "dot") ell(s.x, s.y, s.rx * .28, s.ry * .4, "#fbf3e4");
      else if (t === "heart") clipS(s, () => heart(s, "#fdf6ea"));
      else if (t === "heartF") clipS(s, () => heart(s, "#9a6234", .6));
      else if (t === "mark") ell(s.x + 4, s.y, s.rx * .18, s.ry * .4, "#a8703c");
      else if (t === "tulip") clipS(s, () => { [1, .72, .45].forEach((k, i) => { c.fillStyle = "#fdf6ea"; c.beginPath(); c.ellipse(s.x, s.y + s.ry * (.45 - i * .42), s.rx * .4 * k + 4, s.ry * .3, 0, 0, PI * 2); c.fill(); }); c.fillStyle = "#c89466"; c.fillRect(s.x - 1, s.y - s.ry, 2, s.ry * 1.7); });
      else if (t === "rosetta") clipS(s, () => { c.fillStyle = "#fdf6ea"; for (let i = 0; i < 7; i++) { const yy = s.y + s.ry * .7 - i * s.ry * .22, w = s.rx * (.55 - i * .06); c.beginPath(); c.ellipse(s.x, yy, w, s.ry * .1 + 1, 0, 0, PI * 2); c.fill(); } c.fillRect(s.x - 1, s.y - s.ry, 2, s.ry * 1.9); });
      else if (t === "cocoa") clipS(s, () => dots(s, "rgba(80,40,15,.7)", 70, 1, 11));
      else if (t === "cocoaH") clipS(s, () => { ell(s.x, s.y, s.rx, s.ry, "rgba(110,60,25,.55)"); dots(s, "rgba(70,35,12,.8)", 60, 1, 17); });
      else if (t === "cinnamon") clipS(s, () => dots(s, "rgba(150,80,30,.75)", 45, 1, 23));
      else if (t === "cinnamonH") clipS(s, () => { ell(s.x, s.y, s.rx * .7, s.ry * .7, "rgba(170,95,40,.45)"); dots(s, "rgba(140,70,25,.85)", 90, 1, 29); });
      else if (t === "nutmeg") clipS(s, () => dots(s, "rgba(120,70,30,.8)", 30, 1.2, 31));
      else if (t === "dust") dots(s, "rgba(150,80,30,.7)", 24, 1, 37);
      else if (t === "specks") clipS(s, () => dots(s, "rgba(60,90,40,.7)", 20, 1.3, 41));
      else if (t === "shot") ell(s.x, s.y, s.rx * .35, s.ry * .45, rg(s.x, s.y, 1, s.rx * .35, [[0, "#c88a48"], [1, "#5a2c10"]]));
      else if (t === "salt") { c.fillStyle = "#ffffff"; for (let i = 0; i < 14; i++) c.fillRect(s.x - s.rx * .6 + rnd(i + 5) * s.rx * 1.2, s.y - s.ry * .6 + rnd(i + 9) * s.ry * 1.2, 2.2, 2.2); }
      else if (t === "caramelX") drizzle(s, "#c9802c");
      else if (t === "chocX") drizzle(s, "#4a2410");
      else if (t === "redDrizzle") drizzle(s, "#c0303a", 1.8);
      else if (t === "cream" || t === "creamDome") { s = creamSwirl(s, t === "creamDome"); }
      else if (t === "creamPeak") { ell(s.x, s.y - 4, s.rx * .7, s.ry * 1.6, "#fffdf8"); }
      else if (t === "shavings") { for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? "#4a2410" : "#6a3a1c"; c.save(); c.translate(s.x - s.rx * .6 + rnd(i + 2) * s.rx * 1.2, s.y - 6 + rnd(i + 4) * 8); c.rotate(rnd(i) * 3); c.fillRect(-3, -1, 6, 2); c.restore(); } }
      else if (t === "marsh") { for (let i = 0; i < 5; i++) { c.save(); c.translate(s.x - s.rx * .55 + i * s.rx * .28, s.y - 2 + (i % 2) * 4); c.rotate(rnd(i) - .5); rr(-6, -5, 12, 10, 3); c.fillStyle = i % 2 ? "#fff6f0" : "#fde4ea"; c.fill(); c.strokeStyle = "rgba(0,0,0,.08)"; c.stroke(); c.restore(); } }
      else if (t === "anise") star(s.x + s.rx * .3, s.y, 8, "#6a3a1c");
      else if (t === "peel") { c.save(); c.translate(s.x + s.rx * .5, s.y - 2); c.rotate(-.4); c.fillStyle = "#f2d64b"; c.beginPath(); c.ellipse(0, 0, 14, 4, 0, 0, PI * 2); c.fill(); c.strokeStyle = "#d9a826"; c.lineWidth = 1; c.stroke(); c.restore(); }
      else if (t === "mint") leaf(s.x - 6, s.y - 6, "#4f9a4a");
      else if (t === "peaks") { for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? "#d9984a" : "#e7b06a"; c.beginPath(); const px = s.x - s.rx * .7 + i * s.rx * .35; c.moveTo(px - 10, s.y + 2); c.quadraticCurveTo(px, s.y - 18 - rnd(i) * 8, px + 10, s.y + 2); c.fill(); } }
      else if (t === "grounds") clipS(s, () => dots(s, "rgba(30,15,5,.8)", 26, 1.4, 47));
      else if (t === "beans3") { for (let i = 0; i < 3; i++) bean(s.x - 8 + i * 8, s.y - 2 + (i % 2) * 2, i); }
      else if (t === "espPour") { c.fillStyle = "rgba(70,32,10,.85)"; c.beginPath(); c.ellipse(s.x + 4, s.y - 22, 16, 6, 0, 0, PI * 2); c.fill(); }
      else if (t === "cinstickIn") { c.fillStyle = "#8a4a22"; c.save(); c.translate(s.x + 10, s.y - 18); c.rotate(.5); rr(-4, -24, 8, 50, 3); c.fill(); c.restore(); }
    });
    if (look.rim === "lemon") lemonWheel(R.x + R.v.w / 2 - 6, R.top + 4);
    if (look.straw) straw(R, look.straw, look.bend);
  }
  function star(x, y, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * PI / 8, rr2 = i % 2 ? r * .35 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2 * .6); } c.fill(); }
  function leaf(x, y, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, 9, 4.5, -.6, 0, PI * 2); c.fill(); c.beginPath(); c.ellipse(x + 9, y + 2, 8, 4, .5, 0, PI * 2); c.fill(); c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 6, y + 3); c.lineTo(x + 5, y - 3); c.stroke(); }
  function bean(x, y, i) { c.save(); c.translate(x, y); c.rotate(i * .9); ell(0, 0, 5, 3.4, "#4a2610"); c.strokeStyle = "#22100a"; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(0, 1.5, 4, 0); c.stroke(); c.restore(); }
  function lemonWheel(x, y) { ell(x, y, 13, 13, "#f2d64b", "#e2b828", 2); ell(x, y, 10, 10, "#f8e88a"); c.strokeStyle = "rgba(230,190,60,.9)"; c.lineWidth = 1; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(i * PI / 4) * 10, y + Math.sin(i * PI / 4) * 10); c.stroke(); } }
  function straw(R, col, bend) { if (col === "spoonL") { c.strokeStyle = "#b9bec4"; c.lineWidth = 3; c.beginPath(); c.moveTo(R.x + 8, R.b - 20); c.lineTo(R.x + 24, R.top - 34); c.stroke(); ell(R.x + 25, R.top - 36, 4, 3, "#d9dde1"); return; }
    c.strokeStyle = col; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(R.x + 4, R.b - 24); c.lineTo(R.x + 14, R.top - 14); if (bend) c.quadraticCurveTo(R.x + 18, R.top - 30, R.x + 32, R.top - 34); else c.lineTo(R.x + 20, R.top - 36); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(R.x + 3, R.b - 24); c.lineTo(R.x + 12, R.top - 14); c.stroke(); }

  // ---- yan eşyalar (tabağın / bardağın yanında)
  function sideItem(k, x, y) {
    if (k === "water") { const w = 26, h = 44; c.fillStyle = "rgba(225,240,245,.45)"; c.fillRect(x - w / 2, y - h, w, h); c.fillStyle = "rgba(190,225,240,.5)"; c.fillRect(x - w / 2 + 2, y - h * .8, w - 4, h * .8 - 2); c.strokeStyle = "rgba(150,180,190,.95)"; c.lineWidth = 1.5; c.strokeRect(x - w / 2, y - h, w, h); ell(x, y - h, w / 2, 3, null, "rgba(160,190,200,.95)", 1.2); return; }
    if (k === "lokum") { ell(x, y, 22, 6, "#fbfaf6", "rgba(0,0,0,.1)", 1); [[-7, "#e86a8a"], [6, "#f0e0b0"]].forEach(([dx, col]) => { c.fillStyle = col; rr(x + dx - 7, y - 14, 13, 12, 2); c.fill(); c.fillStyle = "rgba(255,255,255,.75)"; for (let i = 0; i < 6; i++) c.fillRect(x + dx - 6 + rnd(i + dx) * 11, y - 14 + rnd(i * 2 + dx) * 11, 1.5, 1.5); }); return; }
    if (k === "sugar") { for (let i = 0; i < 2; i++) { c.fillStyle = "#ffffff"; rr(x - 10 + i * 11, y - 10, 10, 10, 1.5); c.fill(); c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1; c.stroke(); } return; }
    if (k === "spoon") { c.strokeStyle = "#b9bec4"; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 18, y - 2); c.lineTo(x + 10, y - 6); c.stroke(); ell(x + 15, y - 7, 6, 3.5, "#d9dde1"); return; }
    if (k === "beans") { for (let i = 0; i < 4; i++) bean(x - 12 + i * 8, y - 3 + (i % 2) * 3, i); return; }
    if (k === "lemonhalf") { ell(x, y - 6, 12, 8, "#f2d64b", "#e2b828", 1.5); ell(x - 2, y - 7, 8, 5, "#f8e88a"); return; }
    if (k === "vanilla") { c.strokeStyle = "#3a2010"; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 20, y - 2); c.quadraticCurveTo(x, y - 8, x + 20, y - 3); c.stroke(); for (let i = 0; i < 5; i++) { ell(x - 4 + Math.cos(i * 1.256) * 6, y - 14 + Math.sin(i * 1.256) * 4, 5, 3, "#fbf3d0"); } ell(x - 4, y - 14, 2.5, 2.5, "#e9c46a"); return; }
    if (k === "cinstick") { c.fillStyle = "#8a4a22"; rr(x - 20, y - 8, 40, 7, 3); c.fill(); c.fillStyle = "#a85c2c"; rr(x - 16, y - 14, 38, 6, 3); c.fill(); star(x - 2, y - 22, 7, "#6a3a1c"); return; }
    if (k === "pumpkin") { ell(x, y - 9, 13, 10, "#e07a2a", "#b85a18", 1); c.strokeStyle = "rgba(150,60,10,.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 19); c.lineTo(x, y + 1); c.stroke(); c.fillStyle = "#4a6a2a"; c.fillRect(x - 1.5, y - 23, 3, 5); return; }
    if (k === "cookie") { c.fillStyle = "#b8743a"; c.beginPath(); c.arc(x, y - 18, 7, 0, PI * 2); c.fill(); c.fillRect(x - 6, y - 12, 12, 12); c.fillRect(x - 13, y - 10, 26, 5); c.fillRect(x - 8, y - 1, 6, 6); c.fillRect(x + 2, y - 1, 6, 6); c.fillStyle = "#fff"; c.fillRect(x - 3, y - 20, 2, 2); c.fillRect(x + 1, y - 20, 2, 2); c.fillRect(x - 4, y - 6, 8, 1.5); return; }
    if (k === "cane") { c.strokeStyle = "#ffffff"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 34); c.arc(x - 7, y - 34, 7, 0, PI, true); c.stroke(); c.strokeStyle = "#c0303a"; c.lineWidth = 6; c.setLineDash([4, 5]); c.stroke(); c.setLineDash([]); return; }
    if (k === "creamjug") { c.fillStyle = "#f7f3ec"; c.beginPath(); c.moveTo(x - 10, y - 26); c.lineTo(x + 10, y - 26); c.lineTo(x + 12, y); c.lineTo(x - 12, y); c.closePath(); c.fill(); c.strokeStyle = "rgba(0,0,0,.15)"; c.stroke(); c.beginPath(); c.moveTo(x - 10, y - 26); c.lineTo(x - 16, y - 30); c.stroke(); return; }
    if (k === "croissant") { for (let i = 0; i < 5; i++) ell(x - 16 + i * 8, y - 8 - Math.sin(i / 4 * PI) * 5, 7, 6, i % 2 ? "#d9984a" : "#c8843a"); return; }
    if (k === "dates") { for (let i = 0; i < 3; i++) ell(x - 10 + i * 10, y - 5, 6, 4, "#5a2a14", "#3a1a0a", 1); ell(x, y, 22, 5, null, "rgba(0,0,0,.15)", 1); return; }
    if (k === "cardamom") { for (let i = 0; i < 4; i++) { c.save(); c.translate(x - 12 + i * 8, y - 4); c.rotate(i); ell(0, 0, 5, 3, "#8aa860", "#5a7a38", 1); c.restore(); } return; }
    if (k === "mastic") { for (let i = 0; i < 6; i++) ell(x - 12 + (i % 3) * 9, y - 4 - Math.floor(i / 3) * 6, 3.5, 3, "#f6f0c8", "#d9cf8a", 1); return; }
    if (k === "pistachio") { for (let i = 0; i < 5; i++) { ell(x - 14 + i * 7, y - 4 - (i % 2) * 3, 4.5, 3.2, "#d9c9a0", "#b8a070", 1); ell(x - 14 + i * 7, y - 4 - (i % 2) * 3, 2, 1.6, "#7aa040"); } return; }
  }
  // ---- demleme aletleri (bardağın solunda)
  function brewer(k, x, y) {
    const glassF = "rgba(225,240,245,.4)", glassS = "rgba(150,180,190,.95)";
    if (k === "press") { c.fillStyle = glassF; c.fillRect(x - 22, y - 80, 44, 78); c.fillStyle = "#3a1d0c"; c.fillRect(x - 20, y - 60, 40, 56); c.strokeStyle = "#7d8187"; c.lineWidth = 3; c.strokeRect(x - 23, y - 82, 46, 82); c.fillStyle = "#2b2117"; rr(x - 26, y - 92, 52, 10, 3); c.fill(); c.fillRect(x - 2, y - 108, 4, 18); ell(x, y - 110, 7, 4, "#2b2117"); c.strokeStyle = "#2b2117"; c.lineWidth = 5; c.beginPath(); c.ellipse(x + 26, y - 42, 9, 22, 0, -PI / 2, PI / 2); c.stroke(); return; }
    if (k === "v60") { c.fillStyle = glassF; c.fillRect(x - 24, y - 50, 48, 48); c.fillStyle = "#6a3412"; c.fillRect(x - 22, y - 30, 44, 28); c.strokeStyle = glassS; c.lineWidth = 2; c.strokeRect(x - 24, y - 50, 48, 48);
      c.fillStyle = "#f2ede4"; c.beginPath(); c.moveTo(x - 32, y - 92); c.lineTo(x + 32, y - 92); c.lineTo(x + 8, y - 54); c.lineTo(x - 8, y - 54); c.closePath(); c.fill(); c.strokeStyle = "rgba(0,0,0,.15)"; c.stroke(); c.strokeStyle = "rgba(0,0,0,.08)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 20 + i * 13, y - 90); c.lineTo(x - 4 + i * 3, y - 56); c.stroke(); } return; }
    if (k === "chemex") { c.fillStyle = glassF; c.beginPath(); c.moveTo(x - 30, y - 104); c.lineTo(x + 30, y - 104); c.lineTo(x + 6, y - 60); c.lineTo(x + 32, y - 4); c.lineTo(x - 32, y - 4); c.lineTo(x - 6, y - 60); c.closePath(); c.fill(); c.strokeStyle = glassS; c.lineWidth = 2; c.stroke();
      c.fillStyle = "#6a3412"; c.beginPath(); c.moveTo(x - 18, y - 32); c.lineTo(x + 18, y - 32); c.lineTo(x + 30, y - 6); c.lineTo(x - 30, y - 6); c.closePath(); c.fill(); c.fillStyle = "#b07a48"; c.fillRect(x - 9, y - 70, 18, 16); c.strokeStyle = "#5a3a22"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 70); c.lineTo(x + 6, y - 54); c.stroke(); ell(x, y - 54, 4, 4, "#5a3a22"); return; }
    if (k === "kalita") { c.fillStyle = glassF; c.fillRect(x - 24, y - 46, 48, 44); c.fillStyle = "#5a2c10"; c.fillRect(x - 22, y - 28, 44, 26); c.strokeStyle = glassS; c.lineWidth = 2; c.strokeRect(x - 24, y - 46, 48, 44);
      c.fillStyle = "#cfd3d8"; c.beginPath(); c.moveTo(x - 30, y - 84); c.lineTo(x + 30, y - 84); c.lineTo(x + 14, y - 50); c.lineTo(x - 14, y - 50); c.closePath(); c.fill(); c.strokeStyle = "#9aa0a6"; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(x - 26 + i * 7.4, y - 82); c.lineTo(x - 12 + i * 3.4, y - 52); c.stroke(); } return; }
    if (k === "aero") { c.fillStyle = "rgba(170,175,180,.55)"; rr(x - 18, y - 94, 36, 70, 4); c.fill(); c.fillStyle = "#3a1d0c"; c.fillRect(x - 16, y - 50, 32, 24); c.fillStyle = "#2b2b2e"; rr(x - 22, y - 26, 44, 10, 3); c.fill(); rr(x - 14, y - 112, 28, 22, 3); c.fill(); ell(x, y - 114, 18, 5, "#3a3a3e"); c.fillStyle = "#f7f3ec"; rr(x - 22, y - 16, 44, 16, 3); c.fill(); return; }
    if (k === "moka") { const st = lg(x - 28, 0, x + 28, 0, [[0, "#8e9399"], [.4, "#eef1f3"], [1, "#7c8187"]]); c.fillStyle = st; c.beginPath(); c.moveTo(x - 24, y - 4); c.lineTo(x - 18, y - 44); c.lineTo(x + 18, y - 44); c.lineTo(x + 24, y - 4); c.closePath(); c.fill(); c.fillRect(x - 16, y - 50, 32, 6);
      c.beginPath(); c.moveTo(x - 16, y - 50); c.lineTo(x - 22, y - 92); c.lineTo(x + 22, y - 92); c.lineTo(x + 16, y - 50); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x - 22, y - 92); c.lineTo(x - 32, y - 88); c.lineTo(x - 22, y - 84); c.fill(); ell(x, y - 96, 10, 4, "#2b2117"); c.fillStyle = "#2b2117"; c.fillRect(x + 22, y - 86, 14, 6); c.fillRect(x + 30, y - 86, 6, 34); return; }
    if (k === "siphon") { ell(x, y - 30, 22, 26, "rgba(225,240,245,.5)", glassS, 2); ell(x, y - 26, 20, 18, "#4a2610"); c.fillStyle = "rgba(225,240,245,.5)"; c.fillRect(x - 16, y - 120, 32, 54); c.strokeStyle = glassS; c.strokeRect(x - 16, y - 120, 32, 54); c.fillStyle = "#6a3412"; c.fillRect(x - 14, y - 90, 28, 22);
      c.strokeStyle = "#2b2117"; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x - 30, y - 70); c.lineTo(x - 16, y - 70); c.stroke(); ell(x, y - 2, 10, 4, "#e9b04a"); return; }
    if (k === "phin") { c.fillStyle = lg(x - 24, 0, x + 24, 0, [[0, "#8e9399"], [.4, "#eef1f3"], [1, "#7c8187"]]); rr(x - 20, y - 50, 40, 34, 3); c.fill(); ell(x, y - 16, 28, 5, "#b9bec4"); ell(x, y - 52, 22, 5, "#d9dde1"); c.fillStyle = "#3a1d0c"; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x - 4 + i * 4, y - 8 + i * 3, 1.5, 0, PI * 2); c.fill(); } return; }
    if (k === "carafe") { c.fillStyle = glassF; c.beginPath(); c.moveTo(x - 12, y - 96); c.lineTo(x + 12, y - 96); c.lineTo(x + 10, y - 70); c.quadraticCurveTo(x + 34, y - 50, x + 30, y - 4); c.lineTo(x - 30, y - 4); c.quadraticCurveTo(x - 34, y - 50, x - 10, y - 70); c.closePath(); c.fill(); c.strokeStyle = glassS; c.lineWidth = 2; c.stroke();
      c.fillStyle = "#3a1e0c"; c.beginPath(); c.moveTo(x - 30, y - 34); c.lineTo(x + 30, y - 34); c.lineTo(x + 30, y - 5); c.lineTo(x - 30, y - 5); c.closePath(); c.fill(); for (let i = 0; i < 4; i++) ell(x, y - 100 - i * 9, 2, 3, "#3a1e0c"); return; }
    if (k === "cloth") { c.strokeStyle = "#6b4a33"; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x - 30, y - 96); c.lineTo(x + 4, y - 96); c.stroke(); ell(x + 4, y - 92, 18, 5, null, "#6b4a33", 3); c.fillStyle = "#efe6d4"; c.beginPath(); c.moveTo(x - 14, y - 92); c.quadraticCurveTo(x + 4, y - 40, x + 22, y - 92); c.fill(); c.strokeStyle = "rgba(0,0,0,.15)"; c.stroke(); for (let i = 0; i < 3; i++) ell(x + 4, y - 44 + i * 10, 1.5, 2.5, "#3a1d0c"); return; }
    if (k === "olla") { c.fillStyle = lg(x - 34, 0, x + 34, 0, [[0, "#7a3a18"], [.4, "#c47a48"], [1, "#6a2e12"]]); c.beginPath(); c.ellipse(x, y - 30, 34, 30, 0, 0, PI * 2); c.fill(); c.fillRect(x - 20, y - 66, 40, 12); ell(x, y - 66, 20, 5, "#5a2a10"); c.strokeStyle = "#f0d8b0"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 30, y - 34); c.quadraticCurveTo(x, y - 24, x + 30, y - 34); c.stroke(); return; }
    if (k === "dallah") { const br = lg(x - 26, 0, x + 26, 0, [[0, "#8a6a2a"], [.4, "#f0d48a"], [1, "#7a5a1a"]]); c.fillStyle = br; c.beginPath(); c.moveTo(x - 24, y - 2); c.quadraticCurveTo(x - 30, y - 30, x - 12, y - 46); c.lineTo(x - 8, y - 70); c.lineTo(x + 8, y - 70); c.lineTo(x + 12, y - 46); c.quadraticCurveTo(x + 30, y - 30, x + 24, y - 2); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x - 10, y - 66); c.quadraticCurveTo(x - 0, y - 96, x + 6, y - 84); c.lineTo(x + 8, y - 70); c.fill(); c.beginPath(); c.moveTo(x - 20, y - 30); c.quadraticCurveTo(x - 46, y - 50, x - 44, y - 80); c.lineTo(x - 38, y - 80); c.quadraticCurveTo(x - 38, y - 52, x - 18, y - 40); c.fill(); c.strokeStyle = "#7a5a1a"; c.lineWidth = 4; c.beginPath(); c.ellipse(x + 26, y - 38, 8, 18, 0, -PI / 2, PI / 2); c.stroke(); return; }
    if (k === "ibrik") { c.fillStyle = lg(x - 22, 0, x + 22, 0, [[0, "#2f5a4a"], [.4, "#6aa08a"], [1, "#24483a"]]); c.beginPath(); c.moveTo(x - 20, y - 2); c.quadraticCurveTo(x - 26, y - 34, x - 8, y - 54); c.lineTo(x + 8, y - 54); c.quadraticCurveTo(x + 26, y - 34, x + 20, y - 2); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x - 8, y - 54); c.lineTo(x - 26, y - 66); c.lineTo(x - 20, y - 52); c.fill(); ell(x, y - 56, 9, 3, "#c9a24a"); c.strokeStyle = "#c9a24a"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 18, y - 20); c.lineTo(x + 18, y - 20); c.stroke(); return; }
    if (k === "sand") { c.fillStyle = lg(0, y - 22, 0, y, [[0, "#e9c27a"], [1, "#c89a4a"]]); rr(x - 40, y - 22, 80, 22, 6); c.fill(); c.fillStyle = "#6a4426"; rr(x - 44, y - 8, 88, 10, 3); c.fill(); for (let i = 0; i < 30; i++) { c.fillStyle = "rgba(255,240,200,.6)"; c.fillRect(x - 36 + rnd(i) * 72, y - 20 + rnd(i + 3) * 12, 1.5, 1.5); }
      c.fillStyle = lg(x - 14, 0, x + 14, 0, [[0, "#8a4a22"], [.4, "#e0a060"], [1, "#7a3e1a"]]); c.beginPath(); c.moveTo(x - 12, y - 18); c.lineTo(x - 14, y - 46); c.lineTo(x + 14, y - 46); c.lineTo(x + 12, y - 18); c.closePath(); c.fill(); c.fillStyle = "#6a4426"; c.fillRect(x + 14, y - 44, 26, 4); return; }
  }

  function steam(R, q, look) { if (!hot(look.v) || look.ice || look.sphere || look.v === "stemS" || look.v === "dessert") return; const n = q == null ? 3 : q >= 80 ? 3 : q >= 50 ? 2 : 1;
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 2.5; c.lineCap = "round";
    for (let i = 0; i < n; i++) { const x = R.x - 12 + i * 12, y0 = R.top - 10; c.beginPath(); c.moveTo(x, y0); c.bezierCurveTo(x - 8, y0 - 12, x + 8, y0 - 22, x, y0 - 34); c.stroke(); } }

  // ---- dış arayüz
  function ext(look, bare) { const v = V[look.v] || V.cup, side = bare ? 0 : (look.side || []).length, brw = !bare && look.brew, x = brw ? 290 : side ? 250 : X0;   // içeriğin kapladığı alan (ölçek ve kırpma için)
    const up = (look.top || []).some(t => /cream/.test(t)) ? 36 : look.straw ? 40 : look.dome ? 18 : look.scoop ? 26 : 10;
    const h = Math.max(v.h + (v.stem || 0) + up + 14, brw ? 124 : 0), rx = v.inBowl ? 80 : v.saucer ? v.w * .78 + 10 : v.tray ? 60 : v.w / 2 + 12;
    return { h, x, xl: brw ? 112 : x - rx - (side > 1 ? 52 : 4), xr: x + rx + (side ? 52 : 4) }; }
  function render(ctx2, id, opt) { c = ctx2; opt = opt || {}; const look = LOOKS[id] || LOOKS.espresso, E = ext(look, opt.bare);
    const side = opt.bare ? [] : (look.side || []).slice(), br = opt.bare ? null : look.brew, x = E.x;
    c.save();
    if (opt.fit !== false) { const k = Math.max(1, Math.min(1.9, 168 / E.h, 430 / (E.xr - E.xl))), cx = (E.xl + E.xr) / 2; c.translate(X0, B); c.scale(k, k); c.translate(-cx, -B); }
    if (br) brewer(br, 150, B + 2);
    const R = drawVessel(look, x, opt.q);
    tops(look, R);
    if (opt.steam !== false) steam(R, opt.q, look);
    const vv = V[look.v] || V.cup, rx = vv.saucer ? vv.w * .78 + 10 : vv.w / 2 + 10;
    side.forEach((k, i) => sideItem(k, i === 0 ? x + rx + 30 : x - rx - 30, B + (vv.saucer ? -2 : 4)));
    c.restore(); return look; }
  function thumb(id, px) { px = px || 56; const dpr = Math.min(2, window.devicePixelRatio || 1), cv = document.createElement("canvas"); cv.width = cv.height = Math.round(px * dpr);
    const g = cv.getContext("2d"); if (!g) return ""; const look = LOOKS[id] || LOOKS.espresso, E = ext(look, true);   // küçük resim: yalnız kap (yan eşyasız), sıkı kırpma
    const S = Math.max(E.h + 12, E.xr - E.xl) * 1.02, cx0 = (E.xl + E.xr) / 2 - S / 2, cy0 = B + 16 - S, sc = cv.width / S;
    g.fillStyle = "#f6efe3"; g.fillRect(0, 0, cv.width, cv.height); g.setTransform(sc, 0, 0, sc, -cx0 * sc, -cy0 * sc);
    g.fillStyle = "#e6d6bf"; g.fillRect(cx0, B - 4, S, 40);
    try { render(g, id, { steam: false, fit: false, bare: true }); } catch (e) {} return cv.toDataURL(); }
  return { render, thumb, has: id => !!LOOKS[id], LOOKS };
})();
