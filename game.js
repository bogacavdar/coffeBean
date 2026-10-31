// game.js – Çekirdek prototipi. Her mekanik tasarım dokümanındaki bölüme işaret eder (Kural 2).
// v0.7: hafta/kira/banka (§2), otomasyon + personel + dekor (§8), dükkan kilitleri (§9), latte art (§5), görev + seri (§7).
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
    equipment: {}, prices: {}, tipsLearned: [], regulars: {}, log: [],
    debt: 0, staff: {}, decor: {}, streak: 0, milkDay: 1
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
// §8 otomasyon: sahip olunan ekipmanların otomatik yaptığı adımlar
function autoSteps() { const set = new Set(); Object.keys(S.equipment).forEach(k => { if (S.equipment[k] && D.equipment[k] && D.equipment[k].auto) D.equipment[k].auto.forEach(x => set.add(x)); }); return set; }
// §5 latte art adımı 3★ dükkanda latte/cappuccino'ya eklenir
function stepsFor(id) { const d = D.drinks[id]; const st = d.steps.slice(); if (d.art && shop().stars >= 3) st.push("art"); return st; }
const decorMult = key => Object.keys(S.decor || {}).reduce((m, k) => (S.decor[k] && D.decor[k][key]) ? m * D.decor[k][key] : m, 1);
const weekday = d => D.weekdays[(d - 1) % 7];
const weekNo = d => Math.floor((d - 1) / 7) + 1;
const daysToRent = d => 6 - ((d - 1) % 7);             // 0 = bugün Pazar, akşam kira
const streakMult = () => Math.min(D.streak.max, 1 + D.streak.step * (S.streak || 0));
function takeLoan(x) { S.money += x; S.debt = (S.debt || 0) + Math.round(x * (1 + D.economy.loanInterest)); S.log.push("Gün " + S.day + ": bankadan ₺" + x + " kredi"); AUDIO.sfx("register"); save(); }
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
  $("#hDay").textContent = weekday(S.day) + " · " + weekNo(S.day) + ". Hafta";
  const dr = daysToRent(S.day); $("#hRent").textContent = dr === 0 ? "Kira bugün: ₺" + shop().rent : "Kiraya " + dr + " gün";
  $("#hRent").classList.toggle("warn", dr <= 1);
  $("#hDebt").style.display = S.debt > 0 ? "" : "none"; $("#hDebt").textContent = "Borç ₺" + S.debt;
  $("#hStreak").style.display = (S.streak || 0) >= 2 ? "" : "none"; $("#hStreak").textContent = "🔥 Seri " + S.streak + " · bahşiş ×" + streakMult().toFixed(1);
  renderTask();
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
  return S.xp >= d.unlockXp && shop().stars >= (d.shop || 1) && !S.unlocked.includes(id);   // §9 dükkan büyüklüğü kilidi
}
function checkUnlocks() {
  const fresh = Object.keys(D.drinks).filter(canUnlock);
  if (!fresh.length) return;
  fresh.forEach(id => { S.unlocked.push(id); S.perfect[id] = S.perfect[id] || 0; S.log.push("Gün " + S.day + ": " + D.drinks[id].name + " açıldı"); });
  const milkNew = fresh.some(id => D.drinks[id].steps.includes("milk")) && !S.taught.includes("milk");
  if (milkNew) S.taught.push("milk");
  AUDIO.sfx("unlock");
  modal(`<h3>Yeni tarif${fresh.length > 1 ? "ler" : ""}: ${fresh.map(id => D.drinks[id].name).join(", ")}</h3><p class="muted">Nejla Teyze'nin defterinden</p>` +
    fresh.map(id => `<div class="recipe">${drinkIcon(id, false)}<div><b>${D.drinks[id].name}</b><br>${D.drinks[id].card}</div></div>`).join("") +
    (milkNew ? `<p><i>${D.tutorial.milk}</i></p>` : ""));
}

// ---------- Günlük görev (§7) ----------
function makeTask() {
  const t = pick(D.tasks), k = { kind: t.kind, money: t.money, xp: t.xp, prog: 0, done: false, failed: false };
  if (t.n) k.n = t.n[0] + Math.floor(Math.random() * (t.n[1] - t.n[0] + 1)); else k.n = 1;
  if (t.kind === "serveDrink") k.drink = pick(S.unlocked);
  k.text = t.text.replace("{n}", k.n).replace("{d}", k.drink ? D.drinks[k.drink].name : "");
  return k;
}
function taskProgress(kind, amount, drink) {
  const k = day && day.task; if (!k || k.done || k.failed || k.kind !== kind) return;
  if (kind === "serveDrink" && drink !== k.drink) return;
  k.prog += amount; if (k.prog >= k.n) completeTask(); renderTask();
}
function completeTask() { const k = day.task; k.done = true; S.money += k.money; S.xp += k.xp; AUDIO.sfx("unlock"); toast(`🎯 Görev tamam: ${k.text} · +₺${k.money}, +${k.xp} XP`); renderHUD(); }
function renderTask() {
  const el = $("#task"); const k = day && day.task;
  if (!k) { el.style.display = "none"; return; }
  el.style.display = ""; el.className = k.done ? "done" : k.failed ? "failed" : "";
  el.textContent = `🎯 ${k.text}` + (k.kind === "noLeave" ? "" : ` · ${Math.min(k.prog, k.n)}/${k.n}`) + (k.done ? " ✓" : k.failed ? " ✗" : ` · ödül ₺${k.money} + ${k.xp} XP`);
}

// ---------- Gün (§2) ----------
function startDay() {
  const n = shop().customersPerDay; checkUnlocks();
  const firstTime = S.day === 1 && !S.taught.includes("first");
  day = { t: 0, toSpawn: n, spawnEvery: DAY_SECONDS / n, nextSpawn: firstTime ? 99999 : 1, customers: [], orders: [], active: 0,
          stats: { served: 0, perfect: 0, income: 0, tips: 0, left: 0, repStart: S.rep }, id: 1, tutorialActive: false, asst: null };
  if (!firstTime) day.task = makeTask();
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
    if (c.ordered) { c.target = c.byAssistant ? { x: 3.5, y: 1.0 } : { x: 2.6, y: 1.0 }; return; }
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
    day.orders.forEach((o, i) => { if (o.autoRun) autoTick(o, dt, i === day.active); else if (i === day.active) stepTick(o, dt); });
    if (S.staff && S.staff.assistant && !day.tutorialActive) assistantTick(dt);
    layout();
  }
  renderScene(dt);
  if (day && day.toSpawn === 0 && queueOf().length === 0 && day.orders.length === 0 && !day.asst) return endDay();
  raf = requestAnimationFrame(tick);
}
function renderScene(dt) {
  if (day) day.customers = day.customers.filter(c => !c.gone);
  SCENE.draw({ customers: day ? day.customers : [], orders: day ? day.orders : [], t: day ? day.t / DAY_SECONDS : 0.3, level: shop().stars, slots: slots(),
    decor: S.decor || {}, assistant: !!(S.staff && S.staff.assistant), asstBusy: !!(day && day.asst), superAuto: !!S.equipment.superAuto }, dt || 0);
  $("#hint").textContent = !day ? "Dükkan kapalı. Hazır olunca aç." : queueOf().length ? "Sırada bekleyen müşteriye dokun" : day.orders.length ? "" : "Müşteri bekleniyor…";
}
function spawnCustomer() {
  // §7 prototip müşteri tipleri: isim yok, yalnızca tip etiketi; tahammül ve bahşiş tipe göre değişir
  const type = pick(Object.keys(D.customers));
  const ct = D.customers[type];
  let wants = ct.wants ? ct.wants.filter(w => S.unlocked.includes(w)) : S.unlocked;
  if (wants.length === 0) wants = ["espresso"];
  const drink = pick(wants);
  if (ct.priceSens >= 1 && (S.prices[drink] || 1) > 1.2 && Math.random() < 0.6) { day.stats.left++; return; }   // §8 fiyata duyarlı tip gelmez
  const pat = Math.round(ct.patience * decorMult("patience"));                // §8 pikap: sabır ×1,15
  day.customers.push({ id: day.id++, type, name: ct.name, drink, patience: pat, patienceMax: pat,
    pos: { x: SCENE.DOOR.x, y: SCENE.DOOR.y }, target: null, moving: false });
}
function leave(c) {
  c.leaving = true; c.angry = true;
  day.orders = day.orders.filter(o => o.cust !== c); day.active = 0;
  S.rep = Math.max(0, S.rep - 5); day.stats.left++; S.streak = 0;            // §7 kaçan müşteri seriyi sıfırlar
  if (day.task && day.task.kind === "noLeave" && !day.task.done) { day.task.failed = true; }
  SCENE.addFx(c, "−5", "#b5533c"); AUDIO.stopLoops(); AUDIO.sfx("sad");
  toast(c.name + " beklemekten vazgeçti (−5 itibar)"); renderBench(); renderHUD();
}
function takeOrder(id) {
  const c = day.customers.find(x => x.id === id && !x.ordered && !x.leaving); if (!c) return;
  if (day.orders.length >= slots()) { toast(slots() === 1 ? "Makine dolu: önce eldeki siparişi bitir" : "İki grup kafası da dolu"); return; }
  if ((S.beans[S.bean]?.kg || 0) < D.economy.beanPerCup) { toast("Çekirdek bitti! Tedarik ikonuna dokun."); return; }
  if (D.drinks[c.drink].steps.includes("milk") && (S.milk || 0) < D.economy.milkPerCup - 1e-9) { toast("Süt bitti! Tedarik ikonuna dokun."); return; }
  c.ordered = true;
  const all = stepsFor(c.drink), auto = c.type === "nejla" ? new Set() : autoSteps();   // öğretici her adımı elle öğretir
  const o = { cust: c, drink: c.drink, all, steps: all.filter(s => !auto.has(s)), i: 0, scores: {}, auto, phase: "ready", v: 0, dir: 1, start: null, tutorial: c.type === "nejla" };
  all.forEach(s => { if (auto.has(s)) o.scores[s] = D.economy.autoScore; });   // §8 otomatik adım sabit 85
  if (o.steps.length === 0) o.autoRun = true;                                     // her adım otomatik: makine kendisi hazırlar
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
  if (s === "art") {
    if (o.phase === "pour") { o.v += dt * 32; if (o.v > 100) { o.phase = "done"; finishStep(o, 0, "art_high"); return; } }
    if (o.phase === "cut") { o.mark += o.mdir * dt * .9; if (o.mark > 1 || o.mark < 0) { o.mdir *= -1; o.mark = clamp(o.mark, 0, 1); } }
    if ($("#closeup")) CLOSEUP.art(o.v, o.phase === "cut" ? o.mark : null);
  }
  if (s === "milk" && o.phase === "hold") {
    const rate = S.equipment.steamWand ? 24 : 16;                 // §8 buhar çubuğu: 2 sn kısalır
    o.v += dt * rate; if (o.air) o.tex += dt; drawMilk(o); if (o.v > 85) finishStep(o, 0, "milk_high");
  }
}
function finishStep(o, score, tipKey) {
  AUDIO.stopLoops();
  const s = o.steps[o.i]; o.scores[s] = score;
  if (score < 70 && tipKey && !S.tipsLearned.includes(tipKey)) { S.tipsLearned.push(tipKey); toast("Deftere yazıldı: " + D.tips[tipKey]); }
  const el = $("#mgScore"); if (el) { el.textContent = D.minigames[s].name + ": " + score; el.className = "score " + (score >= 80 ? "good" : score < 70 ? "bad" : ""); }
  o.i++; o.phase = "ready"; o.v = 0; o.dir = 1; o.start = null; o.air = false; o.tex = 0;
  if (o.i >= o.steps.length) setTimeout(() => serve(o), 500); else setTimeout(renderBench, 500);
}
// Otomatik sipariş: makine kendi hazırlar (§8)
function autoTick(o, dt, visible) {
  if (o.served) return; o.v += dt;
  if (visible && $("#closeup")) { const t = o.v / 1.8 * 27.5; CLOSEUP.extract(t, Math.min(36, t * 1.4), 36, true, 27.5, 2.5); }
  if (o.v >= 1.8) { o.served = true; serve(o); }
}
// Yardımcı barista: kuyruktaki sütsüz siparişleri kendisi hazırlar (§8)
function assistantTick(dt) {
  const A = D.staff.assistant;
  if (!day.asst) {
    const c = queueOf().find(x => x.type !== "nejla" && !D.drinks[x.drink].steps.includes("milk"));
    if (!c || (S.beans[S.bean]?.kg || 0) < D.economy.beanPerCup) return;
    c.ordered = true; c.byAssistant = true; day.asst = { c, t: 0 }; SCENE.addFx(c, "Yardımcı hazırlıyor", "#f6efe3");
    return;
  }
  day.asst.t += dt;
  if (day.asst.t >= A.prepTime) { const c = day.asst.c; day.asst = null; if (!c.leaving) serve({ cust: c, drink: c.drink, scores: { asst: A.score }, assist: true }); }
}
function serve(o) {
  if (!o.assist && !day.orders.includes(o)) return;
  const c = o.cust; const ct = D.customers[c.type] || { tip: 1, discount: null };   // Nejla Teyze (§10): sabit tipte değil, normal müşteri değil
  let quality = clamp(Math.min(...Object.values(o.scores)) + beanQualityMod(), 0, 100);   // §4 en düşük adım + §6 çekirdek
  const p = c.patienceMax ? c.patience / c.patienceMax : 1; const speedMult = 0.6 + 0.4 * clamp(p / 0.5, 0, 1);   // §7 hız çarpanı 1,0→0,6
  const service = Math.round(quality * speedMult);
  let price = priceOf(o.drink); if (ct.discount) price = Math.round(price * ct.discount);
  const sm = streakMult();                                                          // §7 mükemmel seri çarpanı
  let tip = 0; if (service >= 80) tip = Math.round(price * 0.25 * ((service - 70) / 30) * ct.tip * rank().tipMult * sm * decorMult("tip"));
  if (!o.assist) S.streak = service >= 95 ? (S.streak || 0) + 1 : 0;
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
  AUDIO.sfx("register"); if (service >= 95) AUDIO.sfx("perfect");
  if (tip) { SCENE.addFx(c, "+₺" + tip + " bahşiş", "#c9962b"); AUDIO.sfx("tip"); }
  if (repGain) SCENE.addFx(c, (repGain > 0 ? "+" : "") + repGain, repGain > 0 ? "#5f8a4b" : "#b5533c");
  c.leaving = true; c.ordered = false;
  taskProgress("serveDrink", 1, o.drink); if (service >= 95) taskProgress("perfect", 1); taskProgress("earn", price + tip);
  if (o.assist) { SCENE.addFx(c, "Yardımcı", "#f6efe3"); renderHUD(); save(); return; }
  day.orders = day.orders.filter(x => x !== o); day.active = 0;
  toast(`${c.name}: ${D.drinks[o.drink].name} · kalite ${quality} × hız ${speedMult.toFixed(2)} = ${service} · ₺${price}${tip ? " +₺" + tip + " bahşiş" : ""} · ${msg}`);
  const cu = $("#closeup"); if (cu) CLOSEUP.cupTop(quality, D.drinks[o.drink].steps.includes("milk"), o.scores.art != null && o.scores.art >= 70);   // §11 fincan yakın planı (1 sn)
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
  const st = day.stats, L = { rent: 0, wage: 0, cut: 0, task: null, plant: 0, spoiled: false };
  if (day.task && day.task.kind === "noLeave" && !day.task.failed && st.served > 0 && !day.task.done) completeTask();
  if (day.task) L.task = day.task;
  if (S.day % 7 === 0) { L.rent = shop().rent; S.money -= L.rent; }                          // §2 Pazar: haftalık kira (dükkan seviyesine göre)
  if (S.staff && S.staff.assistant) { L.wage = D.staff.assistant.wage; S.money -= L.wage; }   // §8 personel maaşı
  if (S.debt > 0) { L.cut = Math.min(S.debt, Math.round((st.income + st.tips) * D.economy.loanDailyCut)); S.money -= L.cut; S.debt -= L.cut; }   // §2 %20 otomatik kesinti
  if (S.decor && S.decor.plant) { L.plant = D.decor.plant.rep; S.rep += L.plant; }
  const repDelta = S.rep - st.repStart; const dayNum = S.day;
  if (!S.equipment.fridge || S.day - (S.milkDay || S.day) + 1 >= D.economy.milkShelfDays) { L.spoiled = S.milk > 0; S.milk = 0; }   // §8 süt bozulur (buzdolabıyla 3 gün)
  day = null; save(); renderHUD(); renderScene(0);
  showLedger(dayNum, st, L, repDelta);
}
function showLedger(dayNum, st, L, repDelta) {
  const short = S.money < 0, need = short ? Math.ceil(-S.money / 50) * 50 : 0;
  $("#ledgerCard").innerHTML = `<h2>${weekday(dayNum)} · ${weekNo(dayNum)}. Hafta – gün kapanışı</h2>
    <table>
      <tr><td>Servis edilen</td><td class="num">${st.served} (${st.perfect} mükemmel)</td></tr>
      <tr><td>Giden müşteri</td><td class="num">${st.left}</td></tr>
      <tr><td>Satış</td><td class="num">₺${st.income}</td></tr>
      <tr><td>Bahşiş</td><td class="num">₺${st.tips}</td></tr>
      ${L.task ? `<tr><td>Günlük görev: ${L.task.text}</td><td class="num">${L.task.done ? "✓ +₺" + L.task.money : "✗"}</td></tr>` : ""}
      ${L.rent ? `<tr><td>Haftalık kira (${shop().name})</td><td class="num">−₺${L.rent}</td></tr>` : ""}
      ${L.wage ? `<tr><td>Yardımcı barista maaşı</td><td class="num">−₺${L.wage}</td></tr>` : ""}
      ${L.cut ? `<tr><td>Kredi taksiti (gelirin %20'si)</td><td class="num">−₺${L.cut}</td></tr>` : ""}
      ${L.plant ? `<tr><td>Büyük bitki</td><td class="num">+${L.plant} itibar</td></tr>` : ""}
      ${L.spoiled ? `<tr><td>Kalan süt bozuldu</td><td class="num">0 L</td></tr>` : ""}
      <tr><td>İtibar değişimi</td><td class="num">${repDelta >= 0 ? "+" : ""}${repDelta}</td></tr>
      <tr class="total"><td>Kasa</td><td class="num">₺${S.money}</td></tr>
      ${S.debt > 0 ? `<tr><td>Kalan borç</td><td class="num">₺${S.debt}</td></tr>` : ""}
    </table>
    ${short ? `<div class="req">Kasa kirayı karşılamadı. Devam etmek için bankadan en az ₺${need} kredi çekmelisin (geri ödeme ₺${Math.round(need * (1 + D.economy.loanInterest))}, %10 fazla).</div>` :
      `<p class="muted">Kiraya ${daysToRent(dayNum + 1)} gün. Yeni güne başlamadan önce tedarik yap: en az ${D.economy.minBeans} kg çekirdek${needsMilk() ? ` ve ${D.economy.minMilk} L süt` : ""} gerekir.</p>`}
    <div class="row"><button class="pri" id="ledgerOk">${short ? "Bankadan ₺" + need + " kredi çek" : "Tedariğe geç"}</button></div>`;
  openOverlay("#ovLedger");
  $("#ledgerOk").onclick = () => { if (short) { takeLoan(need); showLedger(dayNum, st, L, repDelta); return; } $("#ovLedger").classList.remove("on"); openRestock(); };
}
function openRestock() { mandatoryRestock = true; S.day++; save(); renderHUD(); renderShop(true); openOverlay("#ovShop"); }

// ---------- Alt panel (tezgâh, §11) ----------
function renderBench() {
  renderHUD();
  if (!day || !day.orders[day.active]) { $("#sheet").classList.remove("on"); return; }
  const o = day.orders[day.active]; const s = o.steps[o.i]; const d = D.drinks[o.drink];
  const tabs = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}: ${D.drinks[x.drink].name}</button>`).join("")}</div>` : "";
  const steps = `<div class="steps">${o.all.map(st => `<span class="${o.scores[st] != null ? "done" : st === s ? "now" : ""}">${o.auto.has(st) ? "⚙ " : ""}${D.minigames[st].name}${o.scores[st] != null ? " " + o.scores[st] : ""}</span>`).join("")}</div>`;
  if (o.autoRun) {
    $("#sheetBody").innerHTML = `${tabs}<h3>${o.cust.name} için ${d.name}</h3>${steps}<canvas id="closeup"></canvas><div class="hint">⚙ Makine hazırlıyor… (otomatik adımlar 85 puan)</div><div id="mgScore" class="score"></div>`;
    CLOSEUP.init($("#closeup")); $("#sheet").classList.add("on");
    $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); });
    return;
  }
  const tut = o.tutorial ? `<div id="tut" class="on">${D.tutorial.steps[s] || ""}</div>` : "";
  $("#sheetBody").innerHTML = `${tabs}<h3>${o.cust.name} için ${d.name}</h3>${steps}${tut}<canvas id="closeup"></canvas><div id="mgBody"></div><div class="hint">${rank().guide && !o.tutorial ? D.minigames[s].hint : ""}</div><div id="mgScore" class="score"></div>`;
  CLOSEUP.init($("#closeup"));
  $("#sheet").classList.add("on");
  $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); });
  ({ grind: uiGrind, dose: uiDose, tamp: uiTamp, extract: uiExtract, milk: uiMilk, art: uiArt })[s](o, $("#mgBody"));
  if (o.tutorial) pulseControl(s);
}
function pulseControl(s) { const sel = { grind: "#gOk", dose: "#dH", tamp: "#closeup", extract: "#xB", milk: "#mH", art: "#aH" }[s]; const el = sel && $(sel); if (el) el.classList.add("pulse"); }
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
  $("#xB").onclick = () => { if (o.phase === "ready") { o.phase = "run"; $("#xB").textContent = "Durdur"; AUDIO.loop("extract", true); } else if (o.phase === "run") { o.phase = "done"; AUDIO.loop("extract", false); AUDIO.sfx("extractStop"); finishStep(o, scoreFrom(o.v, o.tTarget, o.tTol), o.v < o.tTarget ? "extract_low" : "extract_high"); } };
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
  h.onpointerdown = e => { e.preventDefault(); h.setPointerCapture(e.pointerId); y0 = e.clientY; o.phase = "hold"; o.v = 20; o.air = true; AUDIO.loop("milk", true); AUDIO.milkAir(true); };
  h.onpointermove = e => { if (o.phase === "hold") { o.air = (e.clientY - y0) < 24; AUDIO.milkAir(o.air); } };
  h.onpointerup = h.onpointercancel = () => { if (o.phase !== "hold") return; o.phase = "done";
    const tempScore = scoreFrom(o.v, 62.5, 2.5 * tol()); const texScore = scoreFrom(o.tex, o.texTarget, 0.5 * tol());
    finishStep(o, Math.round(tempScore * 0.6 + texScore * 0.4), o.v < 62.5 ? "milk_low" : "milk_high"); };
}
// §5 Latte art (kalp): basılı tut-dök (%65–80), sonra kayan işaret ortadayken dokun-kes
function uiArt(o, el) {
  o.phase = "ready"; o.v = 0; o.mark = 0; o.mdir = 1; o.fillScore = 0;
  el.innerHTML = `<button class="hold" id="aH">Basılı tut: sütü dök (%65–80'de bırak)</button>`; CLOSEUP.art(0, null);
  const h = $("#aH");
  h.onpointerdown = e => { e.preventDefault(); if (o.phase === "ready") { o.phase = "pour"; AUDIO.sfx("dose"); }
    else if (o.phase === "cut") { o.phase = "done"; AUDIO.sfx("open"); const cut = scoreFrom(o.mark, .5, .12 * tol()); finishStep(o, Math.round((o.fillScore + cut) / 2), o.v < 72.5 ? "art_low" : "art_high"); } };
  h.onpointerup = h.onpointercancel = h.onpointerleave = () => { if (o.phase !== "pour") return; o.fillScore = scoreFrom(o.v, 72.5, 7.5 * tol()); o.phase = "cut"; h.textContent = "Çizgi ortaya gelince dokun: kalbi kes"; };
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
  html += `<p class="muted">Haftalık kira ₺${lv.rent} (her Pazar akşamı) · ${daysToRent(S.day) === 0 ? "kira bugün" : "kiraya " + daysToRent(S.day) + " gün"}</p>`;
  if (next) { const lok = S.money >= next.money && S.rep >= next.rep && !(S.debt > 0);
    html += `<p class="muted">Sonraki: ${next.name} – ₺${next.money} birikim + itibar ${next.rep} · kira ₺${next.rent}/hafta<br>Açar: ${next.stars === 2 ? "latte, cappuccino, çift gruplu makine, otomatik tamper, buzdolabı, yardımcı barista" : "süper otomatik makine, otomatik süt köpürtücü, latte art"}${S.debt > 0 ? "<br><b>Borç varken seviye atlanamaz.</b>" : ""}</p><button class="pri" id="lvUp" ${lok ? "" : "disabled"}>Seviye atla</button>`; }
  else html += `<p class="muted">Prototipte en yüksek seviye.</p>`;
  const room = lv.loanLimit - (S.debt || 0), cap = x => Math.round(x * (1 + D.economy.loanInterest)) <= room;
  html += `</div><div class="box"><h4>Banka</h4><p class="muted">Kredi geri ödemesi %10 fazladır; borç bitene kadar her gün gelirin %20'si otomatik kesilir. Limit ₺${lv.loanLimit}.</p>
    <p>Borç: <b>₺${S.debt || 0}</b></p><div class="row" style="justify-content:flex-start">
    <button data-loan="100" ${cap(100) ? "" : "disabled"}>₺100 kredi</button><button data-loan="250" ${cap(250) ? "" : "disabled"}>₺250 kredi</button>
    <button id="repay" ${S.debt > 0 && S.money > 0 ? "" : "disabled"}>Borcu öde (₺${Math.min(S.debt || 0, Math.max(0, S.money))})</button></div>`;
  html += `</div><div class="box"><h4>Çekirdek (₺/kg)</h4><table>` + Object.entries(D.beans).map(([id, b]) => {
    const locked = b.unlock > lv.stars; const st = S.beans[id];
    return `<tr class="${locked ? "lock" : ""}"><td><b>${b.name}</b><br><span class="muted">${b.notes}</span></td><td>₺${b.price}<br><span class="muted">${st ? st.kg.toFixed(2) + " kg" : "stok yok"}</span></td>
      <td><button data-buy="${id}" ${locked || S.money < b.price ? "disabled" : ""}>1 kg al</button><br><button data-use="${id}" ${!st || S.bean === id ? "disabled" : ""}>${S.bean === id ? "kullanımda" : "kullan"}</button></td></tr>`; }).join("") + `</table></div>`;
  html += `<div class="box"><h4>Süt (₺${D.economy.milkPrice}/L)</h4><p class="muted">Sütlü içecek başına ${D.economy.milkPerCup} L harcanır. ${S.equipment.fridge ? "Buzdolabı var: süt 3 gün dayanır." : "Buzdolabı yok: gün sonunda kalan süt bozulur."}</p>
    <p>Stok: <b>${(S.milk || 0).toFixed(1)} L</b> <button id="buyMilk" ${S.money < D.economy.milkPrice ? "disabled" : ""}>1 L al</button></p></div>`;
  html += `<div class="box"><h4>Ekipman ve otomasyon</h4><p class="muted">⚙ Otomatik adım mini oyunu atlar ve sabit 85 puan verir; mükemmel servis için elle yap.</p><table>` + Object.entries(D.equipment).map(([id, e]) => { const lk = e.stars > lv.stars;
    return `<tr class="${lk ? "lock" : ""}"><td><b>${e.auto ? "⚙ " : ""}${e.name}</b><br><span class="muted">${e.effect}</span></td><td>₺${e.price}<br><span class="muted">${e.stars}★</span></td><td>${S.equipment[id] ? "✓ alındı" : lk ? `🔒 ${e.stars}★ dükkan` : `<button data-eq="${id}" ${S.money < e.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`; }).join("") + `</table></div>`;
  const A = D.staff.assistant, alk = A.stars > lv.stars;
  html += `<div class="box"><h4>Personel</h4><table><tr class="${alk ? "lock" : ""}"><td><b>${A.name}</b><br><span class="muted">${A.effect} (${A.score} puan) · günlük maaş ₺${A.wage}</span></td><td>${A.stars}★</td><td>${alk ? `🔒 ${A.stars}★ dükkan` : S.staff.assistant ? `<button id="fire">Çıkar</button>` : `<button id="hire">İşe al</button>`}</td></tr></table></div>`;
  html += `<div class="box"><h4>Dekor</h4><table>` + Object.entries(D.decor).map(([id, dc]) => `<tr><td><b>${dc.name}</b><br><span class="muted">${dc.effect}</span></td><td>₺${dc.price}</td><td>${S.decor[id] ? "✓ dükkanda" : `<button data-dec="${id}" ${S.money < dc.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`).join("") + `</table></div>`;
  html += `<div class="box"><h4>Menü fiyatları</h4><p class="muted">%120 üstü: öğrenci ve aceleci müşteriler azalır (§8).</p><table>` + S.unlocked.map(id =>
    `<tr><td>${D.drinks[id].name}</td><td>₺<b id="pr_${id}">${priceOf(id)}</b></td><td><input type="range" min="60" max="160" step="10" value="${Math.round((S.prices[id] || 1) * 100)}" data-pr="${id}"></td></tr>`).join("") + `</table></div>`;
  html += `<div class="row"><button class="pri" id="shopStart" ${mandatory && !ok ? "disabled" : ""}>${mandatory ? "Yeni günü başlat" : "Kapat"}</button></div>`;
  $("#shopCard").innerHTML = html;
  $("#shopCard").querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const id = b.dataset.buy; S.money -= D.beans[id].price; S.beans[id] = { kg: (S.beans[id]?.kg || 0) + 1, boughtDay: S.day }; save(); renderShop(mandatory); renderHUD(); });
  $("#shopCard").querySelectorAll("[data-use]").forEach(b => b.onclick = () => { S.bean = b.dataset.use; save(); renderShop(mandatory); renderHUD(); });
  $("#shopCard").querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const id = b.dataset.eq; S.money -= D.equipment[id].price; S.equipment[id] = true; if (id === "fridge") S.milkDay = S.day; AUDIO.sfx("register"); save(); renderShop(mandatory); renderHUD(); });
  $("#shopCard").querySelectorAll("[data-pr]").forEach(r => r.oninput = () => { S.prices[r.dataset.pr] = +r.value / 100; $("#pr_" + r.dataset.pr).textContent = priceOf(r.dataset.pr); save(); });
  const buyMilk = $("#buyMilk"); if (buyMilk) buyMilk.onclick = () => { S.money -= D.economy.milkPrice; S.milk = (S.milk || 0) + 1; S.milkDay = S.day; save(); renderShop(mandatory); renderHUD(); };
  $("#shopCard").querySelectorAll("[data-loan]").forEach(b => b.onclick = () => { takeLoan(+b.dataset.loan); renderShop(mandatory); renderHUD(); });
  const rp = $("#repay"); if (rp) rp.onclick = () => { const x = Math.min(S.debt, Math.max(0, S.money)); S.money -= x; S.debt -= x; AUDIO.sfx("register"); save(); renderShop(mandatory); renderHUD(); };
  $("#shopCard").querySelectorAll("[data-dec]").forEach(b => b.onclick = () => { const id = b.dataset.dec; S.money -= D.decor[id].price; S.decor[id] = true; AUDIO.sfx("register"); save(); renderShop(mandatory); renderHUD(); });
  const hi = $("#hire"); if (hi) hi.onclick = () => { S.staff.assistant = true; S.log.push("Gün " + S.day + ": yardımcı barista işe alındı"); save(); renderShop(mandatory); };
  const fi = $("#fire"); if (fi) fi.onclick = () => { S.staff.assistant = false; save(); renderShop(mandatory); };
  const up = $("#lvUp"); if (up) up.onclick = () => { S.shopLevel++; S.log.push("Gün " + S.day + ": " + shop().name); AUDIO.sfx("unlock"); modal(`<h3>${"★".repeat(shop().stars)} ${shop().name}</h3><p>Günde ${shop().customersPerDay} müşteri, haftalık kira ₺${shop().rent}. Yeni ekipman, tarif ve kredi limiti (₺${shop().loanLimit}) açıldı.</p>`); checkUnlocks(); save(); renderShop(mandatory); renderHUD(); };
  const sx = $("#shopX"); if (sx) sx.onclick = () => closeOverlay("#ovShop");
  $("#shopStart").onclick = () => { if (mandatory) { if (!restockOk()) return; mandatoryRestock = false; closeOverlay("#ovShop"); startDay(); } else closeOverlay("#ovShop"); };
}

// §3 Defterde tarif resimleri: içeceğin kesiti (öğrenilmemiş → gri silüet + ???)
const DRINK_ART = {
  espresso:   { kind: "cup",   layers: [["#3b1f0e", .45], ["#c48a4a", .1]] },
  ristretto:  { kind: "cup",   layers: [["#2a1408", .3], ["#b9783a", .1]] },
  lungo:      { kind: "cup",   layers: [["#4a2a14", .62], ["#c9925a", .08]] },
  americano:  { kind: "mug",   layers: [["#3a2213", .72], ["#a8754a", .06]] },
  macchiato:  { kind: "cup",   layers: [["#3b1f0e", .45], ["#f4ede2", .14]], dot: true },
  cortado:    { kind: "glass", layers: [["#3b1f0e", .35], ["#d9b892", .35], ["#f6efe3", .08]] },
  latte:      { kind: "tall",  layers: [["#3b1f0e", .2], ["#d8b48a", .5], ["#f6efe3", .14]], heart: true },
  cappuccino: { kind: "wide",  layers: [["#3b1f0e", .3], ["#d2ab7f", .25], ["#f8f2e8", .28]], heart: true }
};
function drinkIcon(id, locked) {
  const a = DRINK_ART[id] || DRINK_ART.espresso;
  const shapes = { cup: [22, 30, 58, 50], wide: [14, 30, 66, 48], mug: [22, 18, 58, 62], glass: [26, 24, 54, 56], tall: [28, 10, 52, 70] };
  const [x0, y0, x1, y1] = shapes[a.kind], h = y1 - y0, glass = a.kind === "glass" || a.kind === "tall";
  const clip = `<clipPath id="cl_${id}"><path d="M${x0} ${y0} L${x1} ${y0} L${x1 - 4} ${y1} Q${(x0 + x1) / 2} ${y1 + 5} ${x0 + 4} ${y1} Z"/></clipPath>`;
  let fill = "", y = y1 + 4;
  if (!locked) a.layers.forEach(([c, f]) => { const hh = h * f; y -= hh; fill += `<rect x="0" y="${y}" width="80" height="${hh + .5}" fill="${c}"/>`; });
  const top = y;
  const body = locked ? "#cfc6b8" : glass ? "rgba(255,255,255,.35)" : "#fbfaf7";
  const stroke = locked ? "#b3a999" : glass ? "#b9c3c7" : "#d8d1c7";
  const extra = locked ? `<text x="40" y="${y0 + h / 2 + 8}" text-anchor="middle" font-size="24" font-weight="700" fill="#8b7a6a">?</text>`
    : (a.dot ? `<ellipse cx="40" cy="${top + 2}" rx="7" ry="3" fill="#fff"/>` : "") + (a.heart ? `<path d="M40 ${top + 7} c-6 -4 -8 -9 -4 -10 c2 0 3 1 4 3 c1 -2 2 -3 4 -3 c4 1 2 6 -4 10z" fill="#c9925a" opacity=".8"/>` : "");
  const handle = (a.kind === "cup" || a.kind === "wide" || a.kind === "mug") ? `<path d="M${x1 - 2} ${y0 + 8} q14 2 10 ${h / 2} q-3 6 -11 6" fill="none" stroke="${locked ? "#b3a999" : "#e6e0d6"}" stroke-width="5"/>` : "";
  const saucer = (a.kind === "cup" || a.kind === "wide") ? `<ellipse cx="40" cy="${y1 + 4}" rx="34" ry="5" fill="${locked ? "#c4bbad" : "#ece6dc"}"/>` : "";
  return `<svg class="dIcon" viewBox="0 0 80 84" width="64" height="68">${clip}${saucer}${handle}
    <path d="M${x0} ${y0} L${x1} ${y0} L${x1 - 4} ${y1} Q${(x0 + x1) / 2} ${y1 + 5} ${x0 + 4} ${y1} Z" fill="${body}" stroke="${stroke}" stroke-width="1.5"/>
    <g clip-path="url(#cl_${id})">${fill}</g>${extra}</svg>`;
}

// ---------- Kahve Defteri (§3, §4, §6) ----------
function renderBook() {
  const r = rank();
  let html = `<h2>Kahve Defteri<span class="x" id="bookX">✕</span></h2>`;
  html += `<div class="box"><h4>Barista: ${r.name}</h4><p class="muted">XP ${S.xp}. Rütbe yükseldikçe kabul aralıkları daralır, bahşiş artar.</p></div>`;
  html += `<div class="box"><h4>Tarif kartları</h4>` + Object.entries(D.drinks).map(([id, d]) => {
    const open = S.unlocked.includes(id);
    const xpOk = S.xp >= d.unlockXp, shOk = shop().stars >= (d.shop || 1);
    return `<div class="recipe ${open ? "" : "lock"}">${drinkIcon(id, !open)}<div><b>${open ? d.name : "???"}</b> <span class="muted">${open ? `· ${S.served[id] || 0} servis, ${S.perfect[id] || 0} mükemmel${d.art && shop().stars >= 3 ? " · latte art ✓" : ""}` : `· XP ${d.unlockXp} ${xpOk ? "✓" : `(şu an ${S.xp})`} · ${d.shop || 1}★ dükkan ${shOk ? "✓" : "🔒"}`}</span><br>${open ? d.card : '<span class="muted">Bu tarifi henüz öğrenmedin.</span>'}</div></div>`; }).join("") + `</div>`;
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
  ["debt", "streak"].forEach(k => { if (S[k] == null) S[k] = 0; }); ["staff", "decor"].forEach(k => { if (!S[k]) S[k] = {}; }); if (!S.milkDay) S.milkDay = S.day;
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
