// game.js – Çekirdek prototipi. Her mekanik tasarım dokümanındaki bölüme işaret eder (Kural 2).
// v0.3: tam ekran sahne + köşe ikonları + ilk kahve öğreticisi + efektler + zorunlu gün sonu tedarik (§2,§7,§10,§11).
(() => {
const D = window.DATA;
const $ = s => document.querySelector(s);
const SAVE_KEY = "cekirdek_save";
const DAY_SECONDS = 90;             // §2: prototip kalibrasyonu, kısa ve odaklı gün
const EXTRACT_SPEED = 6;            // §4: mini oyun 3–8 sn → ekstraksiyon 6× hızlı akar
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

let S = null;              // kayıt durumu
let day = null;            // gün içi geçici durum
let raf = null, lastT = 0;
let mandatoryRestock = false;   // §2: gün sonu zorunlu tedarik tamamlanana kadar true

// ---------- Durum ----------
function newState() {
  return {
    day: 1, money: D.economy.startMoney, rep: 0, xp: 0, shopLevel: 0,
    perfect: { espresso: 0 }, served: {}, unlocked: ["espresso"], taught: [],
    beans: { brazil: { kg: 1, boughtDay: 1 } }, bean: "brazil", milk: 0,
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
const needsMilk = () => S.unlocked.some(id => D.drinks[id].steps.includes("milk"));
const restockOk = () => (S.beans[S.bean]?.kg || 0) >= D.economy.minBeans && (!needsMilk() || (S.milk || 0) >= D.economy.minMilk);
const queueOf = () => day ? day.customers.filter(c => !c.ordered && !c.leaving) : [];
function clockStr(frac) { const hour = 8 + clamp(frac, 0, 1) * 12; const h = Math.floor(hour), m = Math.floor((hour - h) * 60); return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); }

// ---------- UI yardımcıları ----------
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2200); }
function openOverlay(sel) { $(sel).classList.add("on"); }
function closeOverlay(sel) { if (sel === "#ovShop" && mandatoryRestock) return; $(sel).classList.remove("on"); }
function modal(html, buttons) {
  $("#modalCard").innerHTML = html + '<div class="row"></div>';
  const row = $("#modalCard").querySelector(".row");
  (buttons || [{ label: "Tamam" }]).forEach(b => {
    const el = document.createElement("button"); el.textContent = b.label; if (b.pri) el.className = "pri";
    el.onclick = () => { $("#ovModal").classList.remove("on"); b.fn && b.fn(); }; row.appendChild(el);
  });
  $("#ovModal").classList.add("on");
}
function renderHUD() {
  $("#hDay").textContent = S.day;
  $("#hClock").textContent = clockStr(day ? day.t / DAY_SECONDS : 0);
  $("#hMoney").textContent = S.money; $("#hRep").textContent = S.rep;
  $("#hStars").textContent = "★".repeat(shop().stars) + "☆".repeat(3 - shop().stars);
  const r = rank(); const next = D.ranks.find(x => x.xp > S.xp);
  $("#hRank").textContent = r.name + " · XP " + S.xp + (next ? "/" + next.xp : "");
  const milkTxt = needsMilk() ? ` · Süt ${(S.milk || 0).toFixed(1)}L` : "";
  $("#hStock").textContent = D.beans[S.bean].name + " " + (S.beans[S.bean]?.kg || 0).toFixed(2) + "kg" + milkTxt;
  $("#shopBadge").style.display = !restockOk() ? "inline-block" : "none";
  $("#openDay").style.display = (!day && !mandatoryRestock) ? "" : "none";
}

// ---------- Açılım (§3, §9) ----------
// Prototip kalibrasyonu: tarif açılımı artık "10 mükemmel servis" değil, barista XP eşiğiyle (unlockXp) otomatik olur.
function canUnlock(id) {
  const d = D.drinks[id];
  return S.xp >= d.unlockXp && !S.unlocked.includes(id);
}
function checkUnlocks() {
  Object.keys(D.drinks).forEach(id => {
    if (canUnlock(id)) {
      S.unlocked.push(id); S.perfect[id] = S.perfect[id] || 0;
      AUDIO.sfx("unlock");
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
  const firstTime = S.day === 1 && !S.taught.includes("first");
  day = { t: 0, toSpawn: n, spawnEvery: DAY_SECONDS / n, nextSpawn: firstTime ? 99999 : 1, customers: [], orders: [], active: 0,
          stats: { served: 0, perfect: 0, income: 0, tips: 0, left: 0, repStart: S.rep }, id: 1, tutorialActive: false };
  if (firstTime) {
    day.tutorialActive = true;
    day.customers.push({ id: day.id++, type: "nejla", name: "Nejla Teyze", drink: "espresso", patience: Infinity, patienceMax: 0,
      pos: { x: SCENE.DOOR.x, y: SCENE.DOOR.y }, target: null, moving: false });
    toast(D.tutorial.first);
  }
  layout(); renderHUD(); renderBench(); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
}
function layout() {
  if (!day) return; let i = 0;
  day.customers.forEach(c => {
    if (c.leaving) { c.target = { x: SCENE.DOOR.x, y: SCENE.DOOR.y }; return; }
    if (c.ordered) { c.target = { x: 2.6, y: 1.0 }; return; }
    c.target = SCENE.queueSlot(i++);
  });
}
function tick(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (day) {
    if (!day.tutorialActive) {
      day.t += dt;
      if (day.toSpawn > 0 && day.t >= day.nextSpawn) { spawnCustomer(); day.toSpawn--; day.nextSpawn += day.spawnEvery * rnd(0.6, 1.4); }
      queueOf().forEach(c => { if (c.patienceMax) c.patience -= dt; });
      queueOf().filter(c => c.patienceMax && c.patience <= 0).forEach(leave);
    }
    day.orders.forEach((o, i) => { if (i === day.active) stepTick(o, dt); });
    layout();
  }
  renderScene(dt);
  if (day && day.toSpawn === 0 && queueOf().length === 0 && day.orders.length === 0) return endDay();
  raf = requestAnimationFrame(tick);
}
function renderScene(dt) {
  if (day) day.customers = day.customers.filter(c => !c.gone);
  SCENE.draw({ customers: day ? day.customers : [], orders: day ? day.orders : [], t: day ? day.t / DAY_SECONDS : 0.3, level: shop().stars, slots: slots() }, dt || 0);
  $("#hint").textContent = !day ? "Dükkan kapalı. Hazır olunca aç." : queueOf().length ? "Sırada bekleyen müşteriye dokun" : day.orders.length ? "" : "Müşteri bekleniyor…";
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
  if ((type === "student" || type === "hurry") && (S.prices[drink] || 1) > 1.2 && Math.random() < 0.6) { day.stats.left++; return; }
  day.customers.push({ id: day.id++, type, name, drink, patience: ct.patience, patienceMax: ct.patience,
    pos: { x: SCENE.DOOR.x, y: SCENE.DOOR.y }, target: null, moving: false });
}
function leave(c) {
  c.leaving = true; c.angry = true;
  day.orders = day.orders.filter(o => o.cust !== c); day.active = 0;
  S.rep = Math.max(0, S.rep - 5); day.stats.left++;
  SCENE.addFx(c, "−5", "#b5533c"); AUDIO.sfx("sad");
  toast(c.name + " beklemekten vazgeçti (−5 itibar)"); renderBench(); renderHUD();
}
function takeOrder(id) {
  const c = day.customers.find(x => x.id === id && !x.ordered && !x.leaving); if (!c) return;
  if (day.orders.length >= slots()) { toast(slots() === 1 ? "Makine dolu: önce eldeki siparişi bitir" : "İki grup kafası da dolu"); return; }
  if ((S.beans[S.bean]?.kg || 0) < D.economy.beanPerCup) { toast("Çekirdek bitti! Tedarik ikonuna dokun."); return; }
  if (D.drinks[c.drink].steps.includes("milk") && (S.milk || 0) < D.economy.milkPerCup) { toast("Süt bitti! Tedarik ikonuna dokun."); return; }
  c.ordered = true;
  const steps = D.drinks[c.drink].steps.filter(s => !(s === "grind" && S.equipment.autoGrind));
  const o = { cust: c, drink: c.drink, steps, i: 0, scores: {}, phase: "ready", v: 0, dir: 1, start: null, tutorial: c.type === "nejla" };
  if (S.equipment.autoGrind) o.scores.grind = 85;                 // §8 otomatik öğütücü
  day.orders.push(o); day.active = day.orders.length - 1;
  layout(); renderBench();
}

// ---------- Mini oyunlar (§4) ----------
function scoreFrom(val, target, tolerance) { const d = Math.abs(val - target) / tolerance; return Math.round(clamp(100 - d * 40, 0, 100)); }
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
  if (o.i >= o.steps.length) setTimeout(() => serve(o), 500); else setTimeout(renderBench, 500);
}
function serve(o) {
  if (!day.orders.includes(o)) return;
  const c = o.cust; const ct = D.customers[c.type] || { tip: 1, discount: null };   // Nejla Teyze (§10): sabit tipte değil, normal müşteri değil
  let quality = clamp(Math.min(...Object.values(o.scores)) + beanQualityMod(), 0, 100);   // §4 en düşük adım + §6 çekirdek
  const p = c.patienceMax ? c.patience / c.patienceMax : 1; const speedMult = 0.6 + 0.4 * clamp(p / 0.5, 0, 1);   // §7 hız çarpanı 1,0→0,6
  const service = Math.round(quality * speedMult);
  let price = priceOf(o.drink); if (ct.discount) price = Math.round(price * ct.discount);
  let tip = 0; if (service >= 80) tip = Math.round(price * 0.25 * ((service - 70) / 30) * ct.tip * rank().tipMult);
  S.money += price + tip; day.stats.income += price; day.stats.tips += tip; day.stats.served++;
  S.beans[S.bean].kg = Math.max(0, S.beans[S.bean].kg - D.economy.beanPerCup);
  if (D.drinks[o.drink].steps.includes("milk")) S.milk = Math.max(0, (S.milk || 0) - D.economy.milkPerCup);   // §8 süt sarfı
  S.served[o.drink] = (S.served[o.drink] || 0) + 1;
  let repGain = 0, msg;
  if (service >= 95) { S.perfect[o.drink] = (S.perfect[o.drink] || 0) + 1; repGain = 5; S.xp += 25; day.stats.perfect++; msg = "Mükemmel!"; SCENE.addFx(c, "★", "#c9962b", true); }
  else if (service >= 80) { repGain = 2; msg = "Güzel."; }
  else if (service >= 70) { msg = "İdare eder."; }
  else { repGain = -3; msg = "Şikâyet."; }
  S.rep = Math.max(0, S.rep + repGain);
  S.xp += 5 + Math.round(service / 4);              // §9 kalibrasyon: her serviste taban XP + kaliteye bağlı bonus (kolay rütbe/tarif açılımı)
  SCENE.addFx(c, "+₺" + price, "#5f8a4b", true);                      // §7 geri bildirim efektleri
  AUDIO.sfx("coin"); if (service >= 95) AUDIO.sfx("perfect");
  if (tip) { SCENE.addFx(c, "+₺" + tip + " bahşiş", "#c9962b"); AUDIO.sfx("tip"); }
  if (repGain) SCENE.addFx(c, (repGain > 0 ? "+" : "") + repGain, repGain > 0 ? "#5f8a4b" : "#b5533c");
  c.leaving = true; c.ordered = false;
  day.orders = day.orders.filter(x => x !== o); day.active = 0;
  toast(`${c.name}: ${D.drinks[o.drink].name} · kalite ${quality} × hız ${speedMult.toFixed(2)} = ${service} · ₺${price}${tip ? " +₺" + tip + " bahşiş" : ""} · ${msg}`);
  const cu = $("#closeup"); if (cu) CLOSEUP.cupTop(quality, D.drinks[o.drink].steps.includes("milk"));   // §11 fincan yakın planı (1 sn)
  const wasTutorial = o.tutorial;
  renderHUD(); save();
  setTimeout(() => {
    if (wasTutorial) { day.tutorialActive = false; day.nextSpawn = day.spawnEvery * rnd(0.6, 1.4); S.taught.push("first");
      modal(`<h3>Nejla Teyze</h3><p>${D.tutorial.done}</p>`, [{ label: "Devam", pri: true }]); }
    checkUnlocks(); layout(); renderBench();
  }, 900);
}
function endDay() {
  cancelAnimationFrame(raf);
  const st = day.stats; let rent = 0;
  if (S.day % 7 === 0) { rent = D.economy.weeklyRent; S.money -= rent; }                     // §2 haftalık kira
  const repDelta = S.rep - st.repStart; const dayNum = S.day;
  S.milk = 0;                                                                                 // §8 buzdolabı yok: gün sonunda süt bozulur
  day = null; save(); renderHUD(); renderScene(0);
  showLedger(dayNum, st, rent, repDelta);
}
function showLedger(dayNum, st, rent, repDelta) {
  $("#ledgerCard").innerHTML = `<h2>Gün ${dayNum} kapanışı</h2>
    <table>
      <tr><td>Servis edilen</td><td class="num">${st.served} (${st.perfect} mükemmel)</td></tr>
      <tr><td>Giden müşteri</td><td class="num">${st.left}</td></tr>
      <tr><td>Satış</td><td class="num">₺${st.income}</td></tr>
      <tr><td>Bahşiş</td><td class="num">₺${st.tips}</td></tr>
      ${rent ? `<tr><td>Haftalık kira</td><td class="num">−₺${rent}</td></tr>` : ""}
      <tr><td>İtibar değişimi</td><td class="num">${repDelta >= 0 ? "+" : ""}${repDelta}</td></tr>
      <tr class="total"><td>Kasa</td><td class="num">₺${S.money}</td></tr>
    </table>
    <p class="muted">Yeni güne başlamadan önce tedarik yap: en az ${D.economy.minBeans} kg çekirdek${needsMilk() ? ` ve ${D.economy.minMilk} L süt` : ""} gerekir.</p>
    <div class="row"><button class="pri" id="ledgerOk">Tedariğe geç</button></div>`;
  openOverlay("#ovLedger");
  $("#ledgerOk").onclick = () => { $("#ovLedger").classList.remove("on"); openRestock(); };
}
function openRestock() { mandatoryRestock = true; S.day++; save(); renderHUD(); renderShop(true); openOverlay("#ovShop"); }

// ---------- Alt panel (tezgâh, §11) ----------
function renderBench() {
  renderHUD();
  if (!day || !day.orders[day.active]) { $("#sheet").classList.remove("on"); return; }
  const o = day.orders[day.active]; const s = o.steps[o.i]; const d = D.drinks[o.drink];
  const tabs = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}: ${D.drinks[x.drink].name}</button>`).join("")}</div>` : "";
  const steps = `<div class="steps">${d.steps.map(st => `<span class="${o.scores[st] != null ? "done" : st === s ? "now" : ""}">${D.minigames[st].name}${o.scores[st] != null ? " " + o.scores[st] : ""}</span>`).join("")}</div>`;
  const tut = o.tutorial ? `<div id="tut" class="on">${D.tutorial.steps[s] || ""}</div>` : "";
  $("#sheetBody").innerHTML = `${tabs}<h3>${o.cust.name} için ${d.name}</h3>${steps}${tut}<canvas id="closeup"></canvas><div id="mgBody"></div><div class="hint">${rank().guide && !o.tutorial ? D.minigames[s].hint : ""}</div><div id="mgScore" class="score"></div>`;
  CLOSEUP.init($("#closeup"));
  $("#sheet").classList.add("on");
  $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); });
  ({ grind: uiGrind, dose: uiDose, tamp: uiTamp, extract: uiExtract, milk: uiMilk })[s](o, $("#mgBody"));
  if (o.tutorial) pulseControl(s);
}
function pulseControl(s) { const sel = { grind: "#gOk", dose: "#dH", tamp: "#closeup", extract: "#xB", milk: "#mH" }[s]; const el = sel && $(sel); if (el) el.classList.add("pulse"); }
// Öğütme: kaydırıcı, hedef bölge (çekirdeğe göre değişir)
function uiGrind(o, el) {
  const target = S.bean === "brazil" ? 42 : 55; const t = 8 * tol(); o.target = target; o.tol = t; o.v = 50;
  el.innerHTML = `<div class="ctrl"><span class="muted">kaba</span><input type="range" id="gR" min="0" max="100" value="50" style="width:220px"><span class="muted">ince</span><button class="pri" id="gOk">Öğüt</button></div>` +
    (rank().guide ? `<div class="gauge" style="max-width:300px;margin:6px auto"><div class="zone" style="left:${target - t}%;width:${2 * t}%"></div><div class="needle" id="gN" style="left:50%"></div></div>` : "");
  CLOSEUP.grind(50);
  const r = $("#gR"); r.oninput = () => { o.v = +r.value; const n = $("#gN"); if (n) n.style.left = r.value + "%"; CLOSEUP.grind(o.v); };
  $("#gOk").onclick = () => { AUDIO.sfx("grind"); const v = +r.value; finishStep(o, scoreFrom(v, target, t), v < target ? "grind_low" : "grind_high"); };
}
// Dozlama: basılı tut, 18 g'da bırak
function uiDose(o, el) {
  el.innerHTML = `<button class="hold" id="dH">Basılı tut, 18 g'da bırak</button>`; CLOSEUP.dose(0);
  const h = $("#dH"); h.onpointerdown = e => { e.preventDefault(); o.phase = "hold"; AUDIO.sfx("dose"); };
  h.onpointerup = h.onpointercancel = h.onpointerleave = () => { if (o.phase !== "hold") return; o.phase = "done"; const v = o.v; finishStep(o, scoreFrom(v, 18, 0.5 * tol()), v < 18 ? "dose_low" : "dose_high"); };
}
function drawDose(o) { CLOSEUP.dose(o.v); if (o.v > 24) { o.phase = "done"; finishStep(o, 0, "dose_high"); } }
// Tamping: büyüyüp küçülen halka, yeşil bantta tıkla
function uiTamp(o, el) {
  const band = S.equipment.scaleTamp ? 0.16 : 0.1;                 // §8 tartılı tamper: aralık genişler
  o.band = band * tol();
  el.innerHTML = ``; CLOSEUP.tamp(0, o.band);
  $("#closeup").onpointerdown = () => { if (o.steps[o.i] !== "tamp") return; AUDIO.sfx("tamp"); const s = scoreFrom(o.v, 0.55, o.band); finishStep(o, s, o.v < 0.55 ? "tamp_low" : "tamp_high"); };
}
function drawTamp(o) { if ($("#closeup")) CLOSEUP.tamp(o.v, o.band); }
// Ekstraksiyon: başlat, 25–30 sn ve ~36 g'da durdur (tek birleşik ibre – açık soru §4)
function uiExtract(o, el) {
  const d = D.drinks[o.drink]; const ratio = d.ratio || 2; o.tTarget = ratio === 1.5 ? 20 : ratio === 3 ? 37.5 : 27.5; o.tTol = 2.5 * tol();
  el.innerHTML = `<button class="hold pri" id="xB">Başlat</button>`; o.targetG = Math.round(18 * ratio); CLOSEUP.extract(0, 0, o.targetG, false, o.tTarget, o.tTol);
  $("#xB").onclick = () => { if (o.phase === "ready") { o.phase = "run"; $("#xB").textContent = "Durdur"; AUDIO.sfx("extractStart"); } else if (o.phase === "run") { o.phase = "done"; AUDIO.sfx("extractStop"); finishStep(o, scoreFrom(o.v, o.tTarget, o.tTol), o.v < o.tTarget ? "extract_low" : "extract_high"); } };
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
  h.onpointerdown = e => { e.preventDefault(); h.setPointerCapture(e.pointerId); y0 = e.clientY; o.phase = "hold"; o.v = 20; o.air = true; AUDIO.sfx("milk"); };
  h.onpointermove = e => { if (o.phase === "hold") o.air = (e.clientY - y0) < 24; };
  h.onpointerup = h.onpointercancel = () => { if (o.phase !== "hold") return; o.phase = "done";
    const tempScore = scoreFrom(o.v, 62.5, 2.5 * tol()); const texScore = scoreFrom(o.tex, o.texTarget, 0.5 * tol());
    finishStep(o, Math.round(tempScore * 0.6 + texScore * 0.4), o.v < 62.5 ? "milk_low" : "milk_high"); };
}
function drawMilk(o) { if ($("#closeup")) CLOSEUP.milk(o.v, o.tex, o.texTarget, o.air, o.phase === "hold"); }

// ---------- Dükkan / Tedarik overlay (§6, §8, §9) ----------
function renderShop(mandatory) {
  const lv = shop(); const next = D.shopLevels[S.shopLevel + 1];
  const beanOk = (S.beans[S.bean]?.kg || 0) >= D.economy.minBeans;
  const milkNeed = needsMilk(); const milkOk = !milkNeed || (S.milk || 0) >= D.economy.minMilk; const ok = beanOk && milkOk;
  let html = `<h2>${mandatory ? "Tedarik (zorunlu)" : "Dükkan / Tedarik"}${mandatory ? "" : '<span class="x" id="shopX">✕</span>'}</h2>`;
  if (mandatory) html += `<div class="box"><h4>Yeni güne başlamadan önce</h4>
    <div class="req ${beanOk ? "ok" : ""}">Çekirdek: ${(S.beans[S.bean]?.kg || 0).toFixed(2)} / ${D.economy.minBeans} kg ${beanOk ? "✓" : ""}</div>
    ${milkNeed ? `<div class="req ${milkOk ? "ok" : ""}">Süt: ${(S.milk || 0).toFixed(1)} / ${D.economy.minMilk} L ${milkOk ? "✓" : ""}</div>` : ""}</div>`;
  html += `<div class="box"><h4>${"★".repeat(lv.stars)} ${lv.name} · günde ${lv.customersPerDay} müşteri</h4>`;
  if (next) { const lok = S.money >= next.money && S.rep >= next.rep;
    html += `<p class="muted">Sonraki: ${next.name} – ₺${next.money} birikim + itibar ${next.rep}</p><button class="pri" id="lvUp" ${lok ? "" : "disabled"}>Seviye atla</button>`; }
  else html += `<p class="muted">Prototipte en yüksek seviye.</p>`;
  html += `</div><div class="box"><h4>Çekirdek (₺/kg)</h4><table>` + Object.entries(D.beans).map(([id, b]) => {
    const locked = b.unlock > lv.stars; const st = S.beans[id];
    return `<tr class="${locked ? "lock" : ""}"><td><b>${b.name}</b><br><span class="muted">${b.notes}</span></td><td>₺${b.price}<br><span class="muted">${st ? st.kg.toFixed(2) + " kg" : "stok yok"}</span></td>
      <td><button data-buy="${id}" ${locked || S.money < b.price ? "disabled" : ""}>1 kg al</button><br><button data-use="${id}" ${!st || S.bean === id ? "disabled" : ""}>${S.bean === id ? "kullanımda" : "kullan"}</button></td></tr>`; }).join("") + `</table></div>`;
  html += `<div class="box"><h4>Süt (₺${D.economy.milkPrice}/L)</h4><p class="muted">Sütlü içecek başına ${D.economy.milkPerCup} L harcanır. Buzdolabı yok: gün sonunda kalan süt bozulur (§8).</p>
    <p>Stok: <b>${(S.milk || 0).toFixed(1)} L</b> <button id="buyMilk" ${S.money < D.economy.milkPrice ? "disabled" : ""}>1 L al</button></p></div>`;
  html += `<div class="box"><h4>Ekipman</h4><table>` + Object.entries(D.equipment).map(([id, e]) =>
    `<tr><td><b>${e.name}</b><br><span class="muted">${e.effect}</span></td><td>₺${e.price}</td><td>${S.equipment[id] ? "✓ alındı" : `<button data-eq="${id}" ${S.money < e.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`).join("") + `</table></div>`;
  html += `<div class="box"><h4>Menü fiyatları</h4><p class="muted">%120 üstü: öğrenci ve aceleci müşteriler azalır (§8).</p><table>` + S.unlocked.map(id =>
    `<tr><td>${D.drinks[id].name}</td><td>₺<b id="pr_${id}">${priceOf(id)}</b></td><td><input type="range" min="60" max="160" step="10" value="${Math.round((S.prices[id] || 1) * 100)}" data-pr="${id}"></td></tr>`).join("") + `</table></div>`;
  html += `<div class="row"><button class="pri" id="shopStart" ${mandatory && !ok ? "disabled" : ""}>${mandatory ? "Yeni günü başlat" : "Kapat"}</button></div>`;
  $("#shopCard").innerHTML = html;
  $("#shopCard").querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const id = b.dataset.buy; S.money -= D.beans[id].price; S.beans[id] = { kg: (S.beans[id]?.kg || 0) + 1, boughtDay: S.day }; save(); renderShop(mandatory); renderHUD(); });
  $("#shopCard").querySelectorAll("[data-use]").forEach(b => b.onclick = () => { S.bean = b.dataset.use; save(); renderShop(mandatory); renderHUD(); });
  $("#shopCard").querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const id = b.dataset.eq; S.money -= D.equipment[id].price; S.equipment[id] = true; save(); renderShop(mandatory); renderHUD(); });
  $("#shopCard").querySelectorAll("[data-pr]").forEach(r => r.oninput = () => { S.prices[r.dataset.pr] = +r.value / 100; $("#pr_" + r.dataset.pr).textContent = priceOf(r.dataset.pr); save(); });
  const buyMilk = $("#buyMilk"); if (buyMilk) buyMilk.onclick = () => { S.money -= D.economy.milkPrice; S.milk = (S.milk || 0) + 1; save(); renderShop(mandatory); renderHUD(); };
  const up = $("#lvUp"); if (up) up.onclick = () => { S.shopLevel++; S.log.push("Gün " + S.day + ": " + shop().name); modal(`<h3>${"★".repeat(shop().stars)} ${shop().name}</h3><p>Günde ${shop().customersPerDay} müşteri. Yeni çekirdek ve tarifler açılabilir.</p>`); checkUnlocks(); save(); renderShop(mandatory); renderHUD(); };
  const sx = $("#shopX"); if (sx) sx.onclick = () => closeOverlay("#ovShop");
  $("#shopStart").onclick = () => { if (mandatory) { if (!restockOk()) return; mandatoryRestock = false; closeOverlay("#ovShop"); startDay(); } else closeOverlay("#ovShop"); };
}

// ---------- Kahve Defteri (§3, §4, §6) ----------
function renderBook() {
  const r = rank();
  let html = `<h2>Kahve Defteri<span class="x" id="bookX">✕</span></h2>`;
  html += `<div class="box"><h4>Barista: ${r.name}</h4><p class="muted">XP ${S.xp}. Rütbe yükseldikçe kabul aralıkları daralır, bahşiş artar.</p></div>`;
  html += `<div class="box"><h4>Tarif kartları</h4>` + Object.entries(D.drinks).map(([id, d]) => {
    const open = S.unlocked.includes(id); const req = `Barista XP ${d.unlockXp} (şu an ${S.xp})`;
    return `<div class="${open ? "" : "lock"}"><b>${d.name}</b> <span class="muted">· seviye ${d.level}${open ? ` · ${S.served[id] || 0} servis, ${S.perfect[id] || 0} mükemmel` : " · kilitli: " + req}</span><br>${open ? d.card : ""}</div><hr style="border:0;border-top:1px solid var(--cizgi)">`; }).join("") + `</div>`;
  html += `<div class="box"><h4>Öğrenilen ipuçları</h4>${S.tipsLearned.length ? "<ul>" + S.tipsLearned.map(k => `<li>${D.tips[k]}</li>`).join("") + "</ul>" : '<p class="muted">Henüz yok. Her hata bir ders verir.</p>'}</div>`;
  html += `<div class="box"><h4>Menşe sayfaları</h4>` + Object.entries(D.beans).filter(([id]) => S.beans[id]).map(([id, b]) => `<p><b>${b.name}</b><br>${b.page}<br><span class="muted">${b.notes}</span></p>`).join("") + `</div>`;
  html += `<div class="box"><h4>Günlük</h4><p class="muted">${S.log.slice(-8).reverse().join("<br>") || "—"}</p></div>`;
  $("#bookCard").innerHTML = html;
  $("#bookX").onclick = () => closeOverlay("#ovBook");
}

// ---------- Ayarlar (§11: Ayarlar panelinden ses kısılır/kapatılır) ----------
function renderSettings() {
  const a = AUDIO.get();
  $("#settingsCard").innerHTML = `<h2>Ayarlar<span class="x" id="setX">✕</span></h2>
    <div class="box"><h4>Müzik</h4><div class="setrow"><span class="muted">🔈</span><input type="range" id="volMusic" min="0" max="100" value="${Math.round(a.music * 100)}"><span class="muted">🔊</span></div></div>
    <div class="box"><h4>Efekt sesleri</h4><div class="setrow"><span class="muted">🔈</span><input type="range" id="volSfx" min="0" max="100" value="${Math.round(a.sfx * 100)}"><span class="muted">🔊</span></div></div>
    <div class="box"><label class="setrow" style="cursor:pointer"><input type="checkbox" id="muteAll" ${a.muted ? "checked" : ""}> Tüm sesleri kapat</label></div>`;
  $("#setX").onclick = () => closeOverlay("#ovSettings");
  $("#volMusic").oninput = e => AUDIO.setMusic(+e.target.value / 100);
  $("#volSfx").oninput = e => { AUDIO.setSfx(+e.target.value / 100); AUDIO.sfx("click"); };
  $("#muteAll").onchange = e => AUDIO.setMuted(e.target.checked);
}

// ---------- Başlat ----------
function begin(state) {
  S = state; if (S.milk == null) S.milk = 0; mandatoryRestock = false;
  AUDIO.startMusic();
  $("#menu").style.display = "none"; $("#hud").style.display = "flex"; $("#hint").style.display = "block"; $("#icons").style.display = "flex";
  day = null; renderHUD(); renderBench();
  lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  if (!S.taught.includes("intro")) { S.taught.push("intro"); modal(`<h3>Nejla Teyze</h3><p>${D.tutorial.intro}</p><p><i>${D.tutorial.espresso}</i></p><p class="muted">${D.drinks.espresso.card}</p>`, [{ label: "Başlayalım", pri: true }]); }
  save();
}
SCENE.init($("#scene"));
$("#scene").addEventListener("pointerdown", e => { if (!day) return; const r = e.currentTarget.getBoundingClientRect(); const id = SCENE.hitTest(e.clientX - r.left, e.clientY - r.top); if (id) takeOrder(id); });
$("#openDay").onclick = () => { if (!day && !mandatoryRestock) startDay(); };
$("#icBook").onclick = () => { AUDIO.sfx("open"); renderBook(); openOverlay("#ovBook"); };
$("#icShop").onclick = () => { AUDIO.sfx("open"); renderShop(false); openOverlay("#ovShop"); };
$("#icSettings").onclick = () => { AUDIO.sfx("open"); renderSettings(); openOverlay("#ovSettings"); };
["ovBook", "ovShop", "ovModal", "ovSettings"].forEach(id => $("#" + id).addEventListener("click", e => { if (e.target.id === id) closeOverlay("#" + id); }));
$("#btnNew").onclick = () => { const ex = load(); if (ex) modal("<h3>Mevcut kayıt silinsin mi?</h3>", [{ label: "Vazgeç" }, { label: "Sil ve başla", pri: true, fn: () => begin(newState()) }]); else begin(newState()); };
$("#btnContinue").onclick = () => { const ex = load(); if (ex) begin(ex); else toast("Kayıt bulunamadı"); };
$("#btnExport").onclick = () => { const ex = load(); if (!ex) return toast("Kayıt yok"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(ex)], { type: "application/json" })); a.download = "cekirdek-kayit.json"; a.click(); };
$("#btnImport").onclick = () => $("#fileImport").click();
$("#fileImport").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const s = JSON.parse(t); if (!s.unlocked) throw 0; localStorage.setItem(SAVE_KEY, t); toast("Kayıt yüklendi"); } catch { toast("Geçersiz kayıt dosyası"); } }); };
window.addEventListener("resize", () => renderScene(0));
try { $("#btnContinue").disabled = !load(); } catch { }
// Menü açıkken de sahne boş dükkan olarak arkada dönsün
(function idleLoop(now) { if (!S) { SCENE.draw({ customers: [], orders: [], t: 0.35, level: 1, slots: 1 }, 0.016); requestAnimationFrame(idleLoop); } })();
window.CEKIRDEK = { state: () => S, day: () => day };   // hata ayıklama
})();
