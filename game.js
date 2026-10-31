// game.js – Çekirdek prototipi. Her mekanik tasarım dokümanındaki bölüme işaret eder (Kural 2).
(() => {
const D = window.DATA;
const $ = s => document.querySelector(s);
const SAVE_KEY = "cekirdek_save";
const DAY_SECONDS = 150;            // §2: bir oyun günü 3–5 dk (hız için 2,5 dk)
const EXTRACT_SPEED = 6;            // §4: mini oyun 3–8 sn → ekstraksiyon 6× hızlı akar
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

let S = null;        // kayıt durumu
let day = null;      // gün içi geçici durum
let raf = null, lastT = 0;

// ---------- Durum ----------
function newState() {
  return {
    day: 1, money: D.economy.startMoney, rep: 0, xp: 0, shopLevel: 0,
    perfect: { espresso: 0 }, served: {}, unlocked: ["espresso"], taught: [],
    beans: { brazil: { kg: 1, boughtDay: 1 } }, bean: "brazil",
    equipment: {}, prices: {}, tipsLearned: [], regulars: {}, log: []
  };
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }

const rank = () => [...D.ranks].reverse().find(r => S.xp >= r.xp);
const shop = () => D.shopLevels[S.shopLevel];
const tol = () => rank().tol * (D.beans[S.bean]?.tolMod || 1);
const slots = () => S.equipment.dualGroup ? 2 : 1;          // §8 çift gruplu makine
const priceOf = id => Math.round(D.drinks[id].price * (S.prices[id] || 1));
function beanQualityMod() {                                   // §6 tazelik: 7 gün sonra günde %5
  const b = S.beans[S.bean]; if (!b) return -100;
  const age = S.day - b.boughtDay; const stale = Math.max(0, age - 7) * 5;
  return D.beans[S.bean].qualityMod - stale;
}

// ---------- UI yardımcıları ----------
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2200); }
function modal(html, buttons) {
  const box = $("#modalBox"); box.innerHTML = html + '<div class="row"></div>';
  const row = box.querySelector(".row");
  (buttons || [{ label: "Tamam" }]).forEach(b => {
    const el = document.createElement("button"); el.textContent = b.label; if (b.pri) el.className = "pri";
    el.onclick = () => { $("#modal").classList.remove("on"); b.fn && b.fn(); }; row.appendChild(el);
  });
  $("#modal").classList.add("on");
}
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id));
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.s === id));
  if (id === "shop") renderShop(); if (id === "book") renderBook();
}
function renderHeader() {
  $("#hDay").textContent = S.day; $("#hMoney").textContent = S.money; $("#hRep").textContent = S.rep;
  $("#hStars").textContent = "★".repeat(shop().stars) + "☆".repeat(3 - shop().stars) + " " + shop().name;
  const r = rank(); const next = D.ranks.find(x => x.xp > S.xp);
  $("#hRank").textContent = r.name + " · XP " + S.xp + (next ? "/" + next.xp : "");
  $("#hBean").textContent = D.beans[S.bean].name + " " + (S.beans[S.bean]?.kg || 0).toFixed(2) + " kg";
}

// ---------- Açılım (§3) ----------
function canUnlock(id) {
  const d = D.drinks[id];
  return d.level <= shop().stars && (!d.req || (S.perfect[d.req] || 0) >= 10) && !S.unlocked.includes(id);
}
function checkUnlocks() {
  Object.keys(D.drinks).forEach(id => {
    if (canUnlock(id)) {
      S.unlocked.push(id); S.perfect[id] = S.perfect[id] || 0;
      modal(`<h3>Yeni tarif: ${D.drinks[id].name}</h3><p class="muted">Nejla Teyze'nin defterinden</p><p>${D.drinks[id].card}</p>` +
        (D.drinks[id].steps.includes("milk") && !S.taught.includes("milk") ? `<p><i>${D.tutorial.milk}</i></p>` : ""));
      if (D.drinks[id].steps.includes("milk")) S.taught.push("milk");
      S.log.push("Gün " + S.day + ": " + D.drinks[id].name + " açıldı");
    }
  });
}

// ---------- Gün (§2) ----------
function startDay() {
  const n = shop().customersPerDay; checkUnlocks();
  day = { t: 0, toSpawn: n, spawnEvery: DAY_SECONDS / n, nextSpawn: 1, queue: [], orders: [], active: 0,
          stats: { served: 0, perfect: 0, income: 0, tips: 0, left: 0, repStart: S.rep }, id: 1 };
  showScreen("counter"); renderCounter(); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
}
function tick(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (!$("#counter").classList.contains("on")) { raf = requestAnimationFrame(tick); return; }   // tezgâh dışındayken zaman durur
  day.t += dt;
  if (day.toSpawn > 0 && day.t >= day.nextSpawn) { spawnCustomer(); day.toSpawn--; day.nextSpawn += day.spawnEvery * rnd(0.6, 1.4); }
  // sabır (§7)
  day.queue.forEach(c => { c.patience -= dt; });
  day.queue.filter(c => c.patience <= 0).forEach(c => leave(c));
  day.orders.forEach((o, i) => { if (i === day.active) stepTick(o, dt); });
  renderQueue();
  if (day.toSpawn === 0 && day.queue.length === 0 && day.orders.length === 0) return endDay();
  raf = requestAnimationFrame(tick);
}
function spawnCustomer() {
  const types = Object.keys(D.customers);
  let type = pick(types);
  if (type === "regular" && Object.keys(S.regulars).length === 0 && Math.random() < 0.5) type = "hurry";
  const ct = D.customers[type];
  let wants = ct.wants ? ct.wants.filter(w => S.unlocked.includes(w)) : S.unlocked;
  if (wants.length === 0) wants = ["espresso"];
  let drink = pick(wants), name = ct.name;
  if (type === "regular") {                                       // §7 düzenli: hep aynı içecek, 5 ziyaret sonra isim
    const keys = Object.keys(S.regulars);
    if (keys.length && Math.random() < 0.7) { const k = pick(keys); drink = S.regulars[k].drink; name = S.regulars[k].visits >= 5 ? k : "Düzenli"; S.regulars[k].visits++; }
    else { const nm = pick(["Deniz", "Ayşe", "Mert", "Zeynep", "Can"]); S.regulars[nm] = S.regulars[nm] || { drink, visits: 1 }; }
  }
  // §8 fiyat: ortalamanın %20 üstü → öğrenci ve aceleci gelmez
  if ((type === "student" || type === "hurry") && (S.prices[drink] || 1) > 1.2 && Math.random() < 0.6) { day.stats.left++; return; }
  day.queue.push({ id: day.id++, type, name, drink, patience: ct.patience, patienceMax: ct.patience });
}
function leave(c) {
  day.queue = day.queue.filter(x => x !== c); day.orders = day.orders.filter(o => o.cust !== c);
  day.active = 0; S.rep = Math.max(0, S.rep - 5); day.stats.left++; toast(c.name + " beklemekten vazgeçti (−5 itibar)"); renderCounter(); renderHeader();
}
function renderQueue() {
  // §11: izometrik dükkan sahnesi; müşteriler sırada, baloncukta içecek + sabır halkası
  SCENE.draw({ queue: day ? day.queue : [], orders: day ? day.orders : [], t: day ? day.t / DAY_SECONDS : 0.3, level: shop().stars, slots: slots() });
  $("#queueHint").textContent = !day ? "Dükkan kapalı" : day.queue.length ? "Sırada bekleyen müşteriye dokun" : "Müşteri bekleniyor…";
}
function takeOrder(id) {
  const c = day.queue.find(x => x.id === id); if (!c) return;
  const existing = day.orders.findIndex(o => o.cust === c);
  if (existing >= 0) { day.active = existing; renderCounter(); return; }
  if (day.orders.length >= slots()) { toast(slots() === 1 ? "Makine dolu: önce eldeki siparişi bitir" : "İki grup kafası da dolu"); return; }
  if ((S.beans[S.bean]?.kg || 0) < D.economy.beanPerCup) { toast("Çekirdek bitti! Dükkan ekranından al."); return; }
  const steps = D.drinks[c.drink].steps.filter(s => !(s === "grind" && S.equipment.autoGrind));
  const o = { cust: c, drink: c.drink, steps, i: 0, scores: {}, phase: "ready", v: 0, dir: 1, start: null };
  if (S.equipment.autoGrind) o.scores.grind = 85;                 // §8 otomatik öğütücü
  day.orders.push(o); day.active = day.orders.length - 1;
  const m = document.querySelector("main"); m.classList.remove("zoom"); void m.offsetWidth; m.classList.add("zoom");   // §11 dükkan → tezgâh geçişi
  showScreen("counter"); renderCounter();
}

// ---------- Mini oyunlar (§4) ----------
// Her mini oyun 0–100 puan verir. Puan = hedefe uzaklığın tolerans aralığına oranı.
function scoreFrom(val, target, tolerance) {
  const d = Math.abs(val - target) / tolerance;
  return Math.round(clamp(100 - d * 40, 0, 100));
}
function stepTick(o, dt) {
  const s = o.steps[o.i]; if (!s) return;
  if (s === "tamp") { o.v += o.dir * dt * 1.6; if (o.v > 1 || o.v < 0) { o.dir *= -1; o.v = clamp(o.v, 0, 1); } drawTamp(o); }
  if (s === "dose" && o.phase === "hold") { o.v += dt * 9; drawDose(o); }
  if (s === "extract" && o.phase === "run") { o.v += dt * EXTRACT_SPEED; drawExtract(o); if (o.v > 45) finishStep(o, 0, "extract_high"); }
  if (s === "milk" && o.phase === "hold") {
    const rate = S.equipment.steamWand ? 24 : 16;                 // §8 buhar çubuğu: 2 sn kısalır
    o.v += dt * rate; if (o.air) o.tex += dt; drawMilk(o); if (o.v > 85) finishStep(o, 0, "milk_high");
  }
}
function finishStep(o, score, tipKey) {
  const s = o.steps[o.i]; o.scores[s] = score;
  if (score < 70 && tipKey && !S.tipsLearned.includes(tipKey)) { S.tipsLearned.push(tipKey); toast("Deftere yazıldı: " + D.tips[tipKey]); }
  const el = $("#mgScore"); if (el) { el.textContent = D.minigames[s].name + ": " + score; el.className = "score " + (score >= 80 ? "good" : score < 70 ? "bad" : ""); }
  o.i++; o.phase = "ready"; o.v = 0; o.dir = 1; o.start = null; o.air = false; o.tex = 0;
  if (o.i >= o.steps.length) setTimeout(() => serve(o), 500); else setTimeout(renderCounter, 500);
}
function serve(o) {
  if (!day.orders.includes(o)) return;
  const c = o.cust; const ct = D.customers[c.type];
  let quality = clamp(Math.min(...Object.values(o.scores)) + beanQualityMod(), 0, 100);   // §4 en düşük adım + §6 çekirdek
  const p = c.patience / c.patienceMax; const speedMult = 0.6 + 0.4 * clamp(p / 0.5, 0, 1);   // §7 hız çarpanı 1,0→0,6
  const service = Math.round(quality * speedMult);
  let price = priceOf(o.drink); if (ct.discount) price = Math.round(price * ct.discount);
  let tip = 0; if (service >= 80) tip = Math.round(price * 0.25 * ((service - 70) / 30) * ct.tip * rank().tipMult);
  S.money += price + tip; day.stats.income += price; day.stats.tips += tip; day.stats.served++;
  S.beans[S.bean].kg = Math.max(0, S.beans[S.bean].kg - D.economy.beanPerCup);
  S.served[o.drink] = (S.served[o.drink] || 0) + 1;
  let msg;
  if (service >= 95) { S.perfect[o.drink] = (S.perfect[o.drink] || 0) + 1; S.rep += 5; S.xp += 20; day.stats.perfect++; msg = "Mükemmel! ★ +5 itibar"; }
  else if (service >= 80) { S.rep += 2; msg = "Güzel. +2 itibar"; }
  else if (service >= 70) { msg = "İdare eder."; }
  else { S.rep = Math.max(0, S.rep - 3); msg = "Şikâyet baloncuğu: −3 itibar"; }
  S.xp += Math.round(service / 10);
  day.queue = day.queue.filter(x => x !== c); day.orders = day.orders.filter(x => x !== o); day.active = 0;
  toast(`${c.name}: ${D.drinks[o.drink].name} · kalite ${quality} × hız ${speedMult.toFixed(2)} = ${service} · ₺${price}${tip ? " +₺" + tip + " bahşiş" : ""} · ${msg}`);
  const cu = $("#closeup"); if (cu) CLOSEUP.cupTop(quality, D.drinks[o.drink].steps.includes("milk"));   // §11 fincan yakın planı (1 sn)
  renderHeader(); save(); setTimeout(() => { checkUnlocks(); renderCounter(); }, 1000);
}
function endDay() {
  cancelAnimationFrame(raf);
  const st = day.stats; let rent = 0;
  if (S.day % 7 === 0) { rent = D.economy.weeklyRent; S.money -= rent; }                     // §2 haftalık kira
  const repDelta = S.rep - st.repStart;
  modal(`<h3>Gün ${S.day} bitti</h3><table>
    <tr><td>Servis</td><td>${st.served} (${st.perfect} mükemmel)</td></tr>
    <tr><td>Giden müşteri</td><td>${st.left}</td></tr>
    <tr><td>Satış</td><td>₺${st.income}</td></tr><tr><td>Bahşiş</td><td>₺${st.tips}</td></tr>
    ${rent ? `<tr><td>Haftalık kira</td><td>−₺${rent}</td></tr>` : ""}
    <tr><td>İtibar</td><td>${repDelta >= 0 ? "+" : ""}${repDelta}</td></tr></table>
    <p class="muted">Dükkan ekranından çekirdek ve ekipman alabilir, menü fiyatlarını ayarlayabilirsin.</p>`,
    [{ label: "Dükkana git", fn: () => { S.day++; day = null; renderQueue(); save(); renderHeader(); showScreen("shop"); } },
     { label: "Yeni güne başla", pri: true, fn: () => { S.day++; day = null; save(); renderHeader(); startDay(); } }]);
}

// ---------- Tezgâh ekranı ----------
function renderCounter() {
  const c = $("#counter"); renderHeader();
  if (!day) { c.innerHTML = `<div class="mg"><h3>Dükkan kapalı</h3><p class="muted">Gün ${S.day}. Hazır olunca aç.</p><button class="pri" id="btnOpen">Günü başlat</button></div>`; $("#btnOpen").onclick = startDay; return; }
  const o = day.orders[day.active];
  if (!o) { c.innerHTML = `<div class="mg"><h3>Tezgâh boş</h3><p class="muted">Kuyruktan bir müşteriye dokun ve siparişini al.</p>${slots() > 1 ? '<p class="muted">Çift gruplu makine: aynı anda 2 sipariş.</p>' : ""}</div>`; return; }
  const s = o.steps[o.i]; const d = D.drinks[o.drink];
  const tabs = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}: ${D.drinks[x.drink].name}</button>`).join("")}</div>` : "";
  const steps = `<div class="steps">${d.steps.map(st => `<span class="${o.scores[st] != null ? "done" : st === s ? "now" : ""}">${D.minigames[st].name}${o.scores[st] != null ? " " + o.scores[st] : ""}</span>`).join("")}</div>`;
  c.innerHTML = `<div class="mg">${tabs}<h3>${o.cust.name} için ${d.name}</h3>${steps}<canvas id="closeup"></canvas><div id="mgBody"></div><div class="hint">${rank().guide ? D.minigames[s].hint : ""}</div><div id="mgScore" class="score"></div></div>`;
  CLOSEUP.init($("#closeup"));
  c.querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderCounter(); });
  ({ grind: uiGrind, dose: uiDose, tamp: uiTamp, extract: uiExtract, milk: uiMilk })[s](o, $("#mgBody"));
}
// Öğütme: kaydırıcı, hedef bölge (çekirdeğe göre değişir)
function uiGrind(o, el) {
  const target = S.bean === "brazil" ? 42 : 55; const t = 8 * tol(); o.target = target; o.tol = t; o.v = 50;
  el.innerHTML = `<div class="ctrl"><span class="muted">kaba</span><input type="range" id="gR" min="0" max="100" value="50" style="width:220px"><span class="muted">ince</span><button class="pri" id="gOk">Öğüt</button></div>` +
    (rank().guide ? `<div class="gauge" style="max-width:300px;margin:6px auto"><div class="zone" style="left:${target - t}%;width:${2 * t}%"></div><div class="needle" id="gN" style="left:50%"></div></div>` : "");
  CLOSEUP.grind(50);
  const r = $("#gR"); r.oninput = () => { o.v = +r.value; const n = $("#gN"); if (n) n.style.left = r.value + "%"; CLOSEUP.grind(o.v); };
  $("#gOk").onclick = () => { const v = +r.value; finishStep(o, scoreFrom(v, target, t), v < target ? "grind_low" : "grind_high"); };
}
// Dozlama: basılı tut, 18 g'da bırak
function uiDose(o, el) {
  el.innerHTML = `<button class="hold" id="dH">Basılı tut, 18 g'da bırak</button>`; CLOSEUP.dose(0);
  const h = $("#dH"); h.onpointerdown = e => { e.preventDefault(); o.phase = "hold"; };
  h.onpointerup = h.onpointercancel = h.onpointerleave = () => { if (o.phase !== "hold") return; o.phase = "done"; const v = o.v; finishStep(o, scoreFrom(v, 18, 0.5 * tol()), v < 18 ? "dose_low" : "dose_high"); };
}
function drawDose(o) { CLOSEUP.dose(o.v); if (o.v > 24) { o.phase = "done"; finishStep(o, 0, "dose_high"); } }
// Tamping: büyüyüp küçülen halka, yeşil bantta tıkla
function uiTamp(o, el) {
  const band = S.equipment.scaleTamp ? 0.16 : 0.1;                 // §8 tartılı tamper: aralık genişler
  o.band = band * tol();
  el.innerHTML = ``; CLOSEUP.tamp(0, o.band);
  $("#closeup").onpointerdown = () => { if (o.steps[o.i] !== "tamp") return; const s = scoreFrom(o.v, 0.55, o.band); finishStep(o, s, o.v < 0.55 ? "tamp_low" : "tamp_high"); };
}
function drawTamp(o) { if ($("#closeup")) CLOSEUP.tamp(o.v, o.band); }
// Ekstraksiyon: başlat, 25–30 sn ve ~36 g'da durdur (tek birleşik ibre – açık soru §4)
function uiExtract(o, el) {
  const d = D.drinks[o.drink]; const ratio = d.ratio || 2; o.tTarget = ratio === 1.5 ? 20 : ratio === 3 ? 37.5 : 27.5; o.tTol = 2.5 * tol();
  el.innerHTML = `<button class="hold pri" id="xB">Başlat</button>`; o.targetG = Math.round(18 * ratio); CLOSEUP.extract(0, 0, o.targetG, false, o.tTarget, o.tTol);
  $("#xB").onclick = () => { if (o.phase === "ready") { o.phase = "run"; $("#xB").textContent = "Durdur"; } else if (o.phase === "run") { o.phase = "done"; finishStep(o, scoreFrom(o.v, o.tTarget, o.tTol), o.v < o.tTarget ? "extract_low" : "extract_high"); } };
}
function drawExtract(o) {
  const ratio = D.drinks[o.drink].ratio || 2; const g = Math.max(0, (o.v - 6) * (18 * ratio) / (o.tTarget - 6));
  if ($("#closeup")) CLOSEUP.extract(o.v, g, o.targetG, true, o.tTarget, o.tTol);
}
// Süt köpürtme: basılı tut; parmak yüzeyde (yukarıda) = hava, aşağı sürükle = girdap; 60–65 °C'de bırak
function uiMilk(o, el) {
  const kind = D.drinks[o.drink].milk; o.texTarget = { dollop: 1.2, foam: 1.8, micro: 0.8 }[kind] || 1; o.tex = 0; o.air = false;
  el.innerHTML = `<div class="muted">hedef: ${kind === "foam" ? "kalın köpük" : kind === "dollop" ? "bir kaşık köpük" : "mikro köpük"} · 60–65 °C</div><button class="hold" id="mH">Basılı tut (hava), sonra aşağı sürükle (girdap)</button>`;
  CLOSEUP.milk(20, 0, o.texTarget, false, false);
  const h = $("#mH"); let y0 = 0;
  h.onpointerdown = e => { e.preventDefault(); h.setPointerCapture(e.pointerId); y0 = e.clientY; o.phase = "hold"; o.v = 20; o.air = true; };
  h.onpointermove = e => { if (o.phase === "hold") o.air = (e.clientY - y0) < 24; };
  h.onpointerup = h.onpointercancel = () => { if (o.phase !== "hold") return; o.phase = "done";
    const tempScore = scoreFrom(o.v, 62.5, 2.5 * tol()); const texScore = scoreFrom(o.tex, o.texTarget, 0.5 * tol());
    finishStep(o, Math.round(tempScore * 0.6 + texScore * 0.4), o.v < 62.5 ? "milk_low" : "milk_high"); };
}
function drawMilk(o) { if ($("#closeup")) CLOSEUP.milk(o.v, o.tex, o.texTarget, o.air, o.phase === "hold"); }

// ---------- Dükkan ekranı (§6, §8, §9) ----------
function renderShop() {
  const el = $("#shop"); const lv = shop(); const next = D.shopLevels[S.shopLevel + 1];
  let html = `<div class="card"><h4>${"★".repeat(lv.stars)} ${lv.name} · günde ${lv.customersPerDay} müşteri</h4>`;
  if (next) { const ok = S.money >= next.money && S.rep >= next.rep;
    html += `<p class="muted">Sonraki: ${next.name} – ₺${next.money} birikim + itibar ${next.rep}</p><button class="pri" id="lvUp" ${ok ? "" : "disabled"}>Seviye atla</button>`; }
  else html += `<p class="muted">Prototipte en yüksek seviye.</p>`;
  html += `</div><div class="card"><h4>Çekirdek (₺/kg)</h4><table>` + Object.entries(D.beans).map(([id, b]) => {
    const locked = b.unlock > lv.stars; const st = S.beans[id];
    return `<tr class="${locked ? "lock" : ""}"><td><b>${b.name}</b><br><span class="muted">${b.notes}</span></td><td>₺${b.price}<br><span class="muted">${st ? st.kg.toFixed(2) + " kg" : "stok yok"}</span></td>
      <td><button data-buy="${id}" ${locked || S.money < b.price ? "disabled" : ""}>1 kg al</button><br><button data-use="${id}" ${!st || S.bean === id ? "disabled" : ""}>${S.bean === id ? "kullanımda" : "kullan"}</button></td></tr>`; }).join("") + `</table></div>`;
  html += `<div class="card"><h4>Ekipman</h4><table>` + Object.entries(D.equipment).map(([id, e]) =>
    `<tr><td><b>${e.name}</b><br><span class="muted">${e.effect}</span></td><td>₺${e.price}</td><td>${S.equipment[id] ? "✓ alındı" : `<button data-eq="${id}" ${S.money < e.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`).join("") + `</table></div>`;
  html += `<div class="card"><h4>Menü fiyatları</h4><p class="muted">%120 üstü: öğrenci ve aceleci müşteriler azalır (§8).</p><table>` + S.unlocked.map(id =>
    `<tr><td>${D.drinks[id].name}</td><td>₺<b id="pr_${id}">${priceOf(id)}</b></td><td><input type="range" min="60" max="160" step="10" value="${Math.round((S.prices[id] || 1) * 100)}" data-pr="${id}"></td></tr>`).join("") + `</table></div>`;
  html += `<div class="row" style="justify-content:center"><button class="pri" id="shopStart">Günü başlat</button></div>`;
  el.innerHTML = html;
  el.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const id = b.dataset.buy; S.money -= D.beans[id].price; S.beans[id] = { kg: (S.beans[id]?.kg || 0) + 1, boughtDay: S.day }; save(); renderShop(); renderHeader(); });
  el.querySelectorAll("[data-use]").forEach(b => b.onclick = () => { S.bean = b.dataset.use; save(); renderShop(); renderHeader(); });
  el.querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const id = b.dataset.eq; S.money -= D.equipment[id].price; S.equipment[id] = true; save(); renderShop(); renderHeader(); });
  el.querySelectorAll("[data-pr]").forEach(r => r.oninput = () => { S.prices[r.dataset.pr] = +r.value / 100; $("#pr_" + r.dataset.pr).textContent = priceOf(r.dataset.pr); save(); });
  const up = $("#lvUp"); if (up) up.onclick = () => { S.shopLevel++; S.log.push("Gün " + S.day + ": " + shop().name); modal(`<h3>${"★".repeat(shop().stars)} ${shop().name}</h3><p>Günde ${shop().customersPerDay} müşteri. Yeni çekirdek ve tarifler açılabilir.</p>`); checkUnlocks(); save(); renderShop(); renderHeader(); };
  $("#shopStart").onclick = () => { if (day) showScreen("counter"); else startDay(); };
}

// ---------- Kahve Defteri (§3, §4, §6) ----------
function renderBook() {
  const el = $("#book"); const r = rank();
  let html = `<div class="card"><h4>Barista: ${r.name}</h4><p class="muted">XP ${S.xp}. Rütbe yükseldikçe kabul aralıkları daralır, bahşiş artar.</p></div>`;
  html += `<div class="card"><h4>Tarif kartları</h4>` + Object.entries(D.drinks).map(([id, d]) => {
    const open = S.unlocked.includes(id); const req = d.req ? `${D.drinks[d.req].name}'da 10 mükemmel servis (${S.perfect[d.req] || 0}/10)` : "";
    return `<div class="${open ? "" : "lock"}"><b>${d.name}</b> <span class="muted">· seviye ${d.level}${open ? ` · ${S.served[id] || 0} servis, ${S.perfect[id] || 0} mükemmel` : " · kilitli" + (req ? ": " + req : "")}</span><br>${open ? d.card : ""}</div><hr style="border:0;border-top:1px solid var(--cizgi)">`; }).join("") + `</div>`;
  html += `<div class="card"><h4>Öğrenilen ipuçları</h4>${S.tipsLearned.length ? "<ul>" + S.tipsLearned.map(k => `<li>${D.tips[k]}</li>`).join("") + "</ul>" : '<p class="muted">Henüz yok. Her hata bir ders verir.</p>'}</div>`;
  html += `<div class="card"><h4>Menşe sayfaları</h4>` + Object.entries(D.beans).filter(([id]) => S.beans[id]).map(([id, b]) => `<p><b>${b.name}</b><br>${b.page}<br><span class="muted">${b.notes}</span></p>`).join("") + `</div>`;
  html += `<div class="card"><h4>Günlük</h4><p class="muted">${S.log.slice(-8).reverse().join("<br>") || "—"}</p></div>`;
  el.innerHTML = html;
}

// ---------- Başlat ----------
function begin(state) {
  S = state; $("#nav").style.display = "flex"; renderHeader(); showScreen("counter"); renderCounter(); requestAnimationFrame(renderQueue);
  if (!S.taught.includes("intro")) { S.taught.push("intro"); modal(`<h3>Nejla Teyze</h3><p>${D.tutorial.intro}</p><p><i>${D.tutorial.espresso}</i></p><p class="muted">${D.drinks.espresso.card}</p>`, [{ label: "Başlayalım", pri: true }]); }
}
$("#btnNew").onclick = () => { const ex = load(); if (ex) modal("<h3>Mevcut kayıt silinsin mi?</h3>", [{ label: "Vazgeç" }, { label: "Sil ve başla", pri: true, fn: () => begin(newState()) }]); else begin(newState()); };
$("#btnContinue").onclick = () => { const ex = load(); if (ex) begin(ex); else toast("Kayıt bulunamadı"); };
$("#btnExport").onclick = () => { const ex = load(); if (!ex) return toast("Kayıt yok"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(ex)], { type: "application/json" })); a.download = "cekirdek-kayit.json"; a.click(); };
$("#btnImport").onclick = () => $("#fileImport").click();
$("#fileImport").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const s = JSON.parse(t); if (!s.unlocked) throw 0; localStorage.setItem(SAVE_KEY, t); toast("Kayıt yüklendi"); } catch { toast("Geçersiz kayıt dosyası"); } }); };
document.querySelectorAll("nav button").forEach(b => b.onclick = () => showScreen(b.dataset.s));
SCENE.init($("#shopCanvas"));
$("#shopCanvas").addEventListener("pointerdown", e => { if (!day) return; const r = e.currentTarget.getBoundingClientRect(); const id = SCENE.hitTest(e.clientX - r.left, e.clientY - r.top); if (id) takeOrder(id); });
window.addEventListener("resize", () => renderQueue());
try { $("#btnContinue").disabled = !load(); } catch { }
window.CEKIRDEK = { state: () => S, day: () => day };   // hata ayıklama
})();
