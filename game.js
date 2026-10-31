// game.js – Çekirdek prototipi. Her mekanik tasarım dokümanındaki bölüme işaret eder (Kural 2).
// v0.7: hafta/kira/banka (§2), otomasyon + personel + dekor (§8), dükkan kilitleri (§9), latte art (§5), görev + seri (§7).
(() => {
const D = window.DATA;
const $ = s => document.querySelector(s);
// §12 sürüm/önbellek: sayfa ile içerik dosyası farklı sürümse bir kez önbelleksiz yeniden yükle
try {
  if (window.CB_VERSION && D.version !== window.CB_VERSION) {
    if (!sessionStorage.getItem("cb_reload")) { sessionStorage.setItem("cb_reload", "1"); location.replace(location.pathname + "?r=" + Date.now()); return; }
  } else sessionStorage.removeItem("cb_reload");
} catch (e) {}
const SAVE_KEY = "cekirdek_save";                       // eski tek kayıt (yuva 1'e taşınır)
const SLOT_KEY = i => "cekirdek_slot_" + i, SLOTS = 3;   // §12: 3 kayıt yuvası
let curSlot = 1;
const DAY_SECONDS = 90;             // §2: prototip kalibrasyonu, kısa ve odaklı gün
const EXTRACT_SPEED = 6;            // §4: mini oyun 3–8 sn → ekstraksiyon 6× hızlı akar
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

let S = null;              // kayıt durumu
let day = null;            // gün içi geçici durum
let raf = null, lastT = 0;
let mandatoryRestock = false, dayFlow = null;   // §2 dayFlow: günler arası zorunlu ekranlar (supply → hub → price)   // §2: gün sonu zorunlu tedarik tamamlanana kadar true

// ---------- Durum ----------
function newState() {
  return {
    day: 1, money: D.economy.startMoney, rep: 0, xp: 0, shopLevel: 0,
    perfect: { espresso: 0 }, served: {}, unlocked: ["espresso"], taught: [],
    beans: { brazil: { kg: 1, boughtDay: 1 } }, bean: "brazil", milk: 0,
    equipment: {}, prices: {}, tipsLearned: [], regulars: {}, log: [],
    debt: 0, staff: {}, decor: {}, streak: 0, milkDay: 1, traffic: {}, tools: {}, market: {}, loans: []
  };
}
function save(slot) { if (!S) return; try { S.savedAt = Date.now(); localStorage.setItem(SLOT_KEY(slot || curSlot), JSON.stringify(S)); } catch (e) {} }
function loadSlot(i) { try { return JSON.parse(localStorage.getItem(SLOT_KEY(i))); } catch (e) { return null; } }
function deleteSlot(i) { try { localStorage.removeItem(SLOT_KEY(i)); } catch (e) {} }
const anySlot = () => { for (let i = 1; i <= SLOTS; i++) if (loadSlot(i)) return true; return false; };
try { const old = localStorage.getItem(SAVE_KEY); if (old && !localStorage.getItem(SLOT_KEY(1))) localStorage.setItem(SLOT_KEY(1), old); if (old) localStorage.removeItem(SAVE_KEY); } catch (e) {}

const rank = () => [...D.ranks].reverse().find(r => S.xp >= r.xp);
const shop = () => D.shopLevels[S.shopLevel];
const tol = () => rank().tol * (D.beans[S.bean]?.tolMod || 1);
const slots = () => S.equipment.dualGroup ? 2 : 1;          // §8 çift gruplu makine
// §3 aletler: tarif yalnızca gereken aletler alınmışsa menüde
const hasTools = id => (D.drinks[id].needs || []).every(t => S.tools && S.tools[t]);
// §8 varsayılan fiyat = (çekirdek + süt + diğer maliyet) × 2 + fincan başına kira payı; oyuncu oranla oynar (S.prices[id], 1 = varsayılan)
function unitCost(id) { const d = D.drinks[id]; return D.economy.beanPerCup * D.beans[S.bean].price + (d.steps.includes("milk") ? D.economy.milkPerCup * D.economy.milkPrice : 0) + d.cost; }
const defaultPrice = id => Math.max(1, Math.round(unitCost(id) * D.pricing.markup + shop().rent / (7 * dayCap())));
const priceRatio = id => S.prices[id] || 1;
const priceOf = id => Math.max(1, Math.round(defaultPrice(id) * priceRatio(id)));
const marketIdx = id => (S.market && S.market[id]) || 1;
const fairPrice = id => defaultPrice(id) * marketIdx(id);
function rollReaction(id) {                                   // §7/§8 öndeki müşteri sipariş anında fiyata tepki verir
  const d = priceOf(id) / fairPrice(id) - 1, P = D.pricing, p = x => Math.min(1, (x - P.neutral) / (P.all - P.neutral));
  if (d > P.neutral && Math.random() < p(d)) return "expensive";
  if (d < -P.neutral && Math.random() < p(-d)) return "cheap";
  return "ok";
}
function beanQualityMod() {                                   // §6 tazelik: 7 gün sonra günde %5
  const b = S.beans[S.bean]; if (!b) return -100;
  const age = S.day - b.boughtDay; const stale = Math.max(0, age - 7) * 5;
  return D.beans[S.bean].qualityMod - stale;
}
const needsMilk = () => S.unlocked.some(id => hasTools(id) && D.drinks[id].steps.includes("milk"));
const restockOk = () => (S.beans[S.bean]?.kg || 0) >= D.economy.minBeans && (!needsMilk() || (S.milk || 0) >= D.economy.minMilk);
// §8 otomasyon: sahip olunan ekipmanların otomatik yaptığı adımlar
function autoSteps() { const set = new Set(); Object.keys(S.equipment).forEach(k => { if (S.equipment[k] && D.equipment[k] && D.equipment[k].auto) D.equipment[k].auto.forEach(x => set.add(x)); }); return set; }
// §5 latte art adımı 3★ dükkanda latte/cappuccino'ya eklenir
function stepsFor(id) { const d = D.drinks[id]; const st = d.steps.slice(); if (d.art && shop().stars >= 3) st.splice(st.indexOf("milk") + 1, 0, "art"); return st; }
const decorMult = key => Object.keys(S.decor || {}).reduce((m, k) => (S.decor[k] && D.decor[k][key]) ? m * D.decor[k][key] : m, 1);
// §9 müşteri trafiği: sıra sınırı (X), günlük en fazla (Y), geliş sıklığı; Y ve sıklık dükkana özel 3 kademe
const tr = () => (S.traffic && S.traffic[S.shopLevel]) || { cust: 0, freq: 0 };
const dayCap = () => shop().customersPerDay + tr().cust * shop().custStep;
const arrivalEvery = () => shop().interval * Math.pow(D.traffic.freqMult, tr().freq);
const weekday = d => D.weekdays[(d - 1) % 7];
const weekNo = d => Math.floor((d - 1) / 7) + 1;
const daysToRent = d => 6 - ((d - 1) % 7);             // 0 = bugün Pazar, akşam kira
const streakMult = () => Math.min(D.streak.max, 1 + D.streak.step * (S.streak || 0));
// §2 krediler: her kredi ayrı borç (kendi tutarı, %10 faizli geri ödemesi ve vadesi)
function syncDebt() { S.loans = (S.loans || []).filter(l => l.rem > 0); S.debt = S.loans.reduce((a, l) => a + l.rem, 0); }
function takeLoan(x, days) {
  const owe = Math.round(x * (1 + D.economy.loanInterest));
  S.loans = S.loans || []; S.loanSeq = (S.loanSeq || 0) + 1;
  S.loans.push({ id: S.loanSeq, amount: x, owe, rem: owe, day: S.day, due: S.day + days });
  S.money += x; syncDebt(); S.log.push("Gün " + S.day + ": bankadan ₺" + x + " kredi (" + days + " gün vade)"); AUDIO.sfx("register"); save();
}
const loanDays = x => (D.economy.loans.find(l => l.amount === x) || {}).days || D.economy.rentLoanDays;
const daysLeft = l => Math.max(0, l.due - S.day);
const nearestLoan = () => (S.loans || []).slice().sort((a, b) => a.due - b.due)[0];
const queueOf = () => day ? day.customers.filter(c => !c.ordered && !c.leaving) : [];
function clockStr(frac) { const hour = 8 + clamp(frac, 0, 1) * 12; const h = Math.floor(hour), m = Math.floor((hour - h) * 60); return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); }

// ---------- UI yardımcıları ----------
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2200); }
function openOverlay(sel) { $(sel).classList.add("on"); }
function closeOverlay(sel) { if (dayFlow && ((sel === "#ovShop" && dayFlow === "supply") || (sel === "#ovHub" && dayFlow === "hub") || (sel === "#ovPrice" && dayFlow === "price"))) return; $(sel).classList.remove("on"); }
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
  const nl = nearestLoan(), dl = nl ? daysLeft(nl) : 9;
  $("#hDebt").style.display = S.debt > 0 ? "" : "none"; $("#hDebt").textContent = "Borç ₺" + S.debt + (nl ? " · en yakın vade " + (dl === 0 ? "bugün!" : dl + " gün") : "");
  $("#hDebt").classList.toggle("warn", dl <= 2);
  $("#hStreak").style.display = (S.streak || 0) >= 2 ? "" : "none"; $("#hStreak").textContent = "🔥 Seri " + S.streak + " · bahşiş ×" + streakMult().toFixed(1);
  const nx = nextRecipe(), el = $("#hNext");                       // §3 "Yeni tarife X kahve daha"
  if (!nx) el.textContent = "Tüm tarifler açık ✓";
  else { const d = D.drinks[nx], left = d.unlockCups - totalSold(); el.textContent = left > 0 ? `Yeni tarife ${left} kahve daha` : `Yeni tarif için ${d.shop}★ dükkan`; }
  renderTask();
  $("#hClock").textContent = clockStr(day ? day.t / DAY_SECONDS : 0);
  $("#hMoney").textContent = S.money; $("#hRep").textContent = S.rep;
  $("#hStars").textContent = "★".repeat(shop().stars) + "☆".repeat(3 - shop().stars);
  const r = rank(); const next = D.ranks.find(x => x.xp > S.xp);
  $("#hRank").textContent = r.name + " · XP " + S.xp + (next ? "/" + next.xp : "");
  const milkTxt = needsMilk() ? ` · Süt ${(S.milk || 0).toFixed(1)}L` : "";
  $("#hStock").textContent = D.beans[S.bean].name + " " + (S.beans[S.bean]?.kg || 0).toFixed(2) + "kg" + milkTxt;
  $("#shopBadge").style.display = !restockOk() ? "inline-block" : "none";
  $("#openDay").style.display = (!day && !dayFlow) ? "" : "none";
}

// ---------- Açılım (§3, §9) ----------
// §3 tarif açılımı: satılan toplam kahve sayısı (kümülatif artan eşikler) + gerekirse dükkan seviyesi
const totalSold = () => Object.values(S.served || {}).reduce((a, b) => a + b, 0);
function nextRecipe() { return Object.keys(D.drinks).filter(id => !S.unlocked.includes(id)).sort((a, b) => D.drinks[a].unlockCups - D.drinks[b].unlockCups)[0]; }
function canUnlock(id) {
  const d = D.drinks[id];
  return totalSold() >= d.unlockCups && shop().stars >= (d.shop || 1) && !S.unlocked.includes(id);   // §9 dükkan büyüklüğü kilidi
}
function checkUnlocks() {
  const fresh = Object.keys(D.drinks).filter(canUnlock);
  if (!fresh.length) return;
  fresh.forEach(id => { S.unlocked.push(id); S.perfect[id] = S.perfect[id] || 0; S.log.push("Gün " + S.day + ": " + D.drinks[id].name + " açıldı"); });
  const milkNew = fresh.some(id => D.drinks[id].steps.includes("milk")) && !S.taught.includes("milk");
  if (milkNew) S.taught.push("milk");
  AUDIO.sfx("unlock");
  modal(`<h3>Yeni tarif${fresh.length > 1 ? "ler" : ""}: ${fresh.map(id => D.drinks[id].name).join(", ")}</h3><p class="muted">Yıldız Teyze'nin defterinden</p>` +
    fresh.map(id => { const miss = (D.drinks[id].needs || []).filter(t => !S.tools[t]);
      return `<div class="recipe">${drinkIcon(id, false)}<div><b>${D.drinks[id].name}</b><br>${D.drinks[id].card}${miss.length ? `<div class="req" style="margin-top:6px">Menüye girmesi için gerekli: ${miss.map(t => D.tools[t].name).join(", ")} (gün sonunda Dükkan › Aletler & Makineler)</div>` : ""}</div></div>`; }).join("") +
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
  const n = dayCap(); checkUnlocks();
  const firstTime = S.day === 1 && !S.taught.includes("first");
  day = { t: 0, toSpawn: n, spawnEvery: arrivalEvery(), nextSpawn: firstTime ? 99999 : 1, customers: [], orders: [], active: 0,
          stats: { served: 0, perfect: 0, income: 0, tips: 0, left: 0, bounced: 0, pricey: 0, repStart: S.rep }, id: 1, tutorialActive: false, asst: null };
  if (!firstTime) day.task = makeTask();
  if (firstTime) {
    day.tutorialActive = true;
    day.customers.push({ id: day.id++, type: "nejla", name: "Yıldız Teyze", drink: "espresso", patience: Infinity, patienceMax: 0,
      pos: { x: SCENE.DOOR.x, y: SCENE.DOOR.y }, target: null, moving: false });
    toast(D.tutorial.first);
  }
  AUDIO.sfx("shopOpen");                                                            // §11 açılış sesi
  layout(); renderHUD(); renderBench(); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
}
function layout() {
  if (!day) return; let i = 0;
  day.customers.forEach(c => {
    if (c.leaving) { c.target = { x: SCENE.DOOR.x, y: SCENE.DOOR.y }; return; }
    if (c.ordered) { c.target = c.byAssistant ? { x: 3.5, y: 1.0 } : { x: 2.6, y: 1.0 }; return; }
    if (i === 0 && !c.say) c.say = `${c.type === "nejla" ? "Bir espresso, evladım" : D.drinks[c.drink].name + " alabilir miyim?"}`;   // §7 yalnızca öndeki sorar
    c.target = SCENE.queueSlot(i++);
  });
}
function tick(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (day) {
    if (!day.tutorialActive) {
      day.t += dt;
      if (day.t >= DAY_SECONDS) day.toSpawn = 0;                                   // §9 20:00: gün biter, gelemeyen gelmez
      if (day.toSpawn > 0 && day.t >= day.nextSpawn) {
        if (queueOf().length >= shop().maxQueue) day.stats.bounced++;                  // §9 sıra dolu: kapıdan döner
        else spawnCustomer();
        day.toSpawn--; day.nextSpawn += day.spawnEvery * rnd(0.6, 1.4);
      }
      queueOf().forEach(c => { if (c.patienceMax) c.patience -= dt; });
      queueOf().filter(c => c.patienceMax && c.patience <= 0).forEach(leave);
    }
    day.orders.forEach((o, i) => { if (o.autoRun) autoTick(o, dt, i === day.active); else if (i === day.active) stepTick(o, dt); });
    if (S.staff && S.staff.assistant && !day.tutorialActive) assistantTick(dt);
    layout();
  }
  // performans: dükkan kapalıyken ya da bir kart/panel açıkken arka sahne 3 karede bir çizilir
  if ((!day || document.querySelector(".overlay.on") || $("#sheet").classList.contains("on")) && (sceneSkip = (sceneSkip + 1) % 3)) sceneAcc += dt; else { renderScene(dt + sceneAcc); sceneAcc = 0; }
  if (day && day.toSpawn === 0 && queueOf().length === 0 && day.orders.length === 0 && !day.asst) return endDay();
  raf = requestAnimationFrame(tick);
}
let lastHint = "", lastClock = "", sceneSkip = 0, sceneAcc = 0;
function renderScene(dt) {
  if (day) day.customers = day.customers.filter(c => !c.gone);
  SCENE.draw({ customers: day ? day.customers : [], orders: day ? day.orders : [], t: day ? day.t / DAY_SECONDS : 0.3, level: shop().stars, slots: slots(),
    decor: S.decor || {}, assistant: !!(S.staff && S.staff.assistant), asstBusy: !!(day && day.asst), superAuto: !!S.equipment.superAuto,
    baristaBusy: !!(day && day.orders.length) }, dt || 0);
  const hint = !day ? "Dükkan kapalı. Hazır olunca aç." : `Sıra ${queueOf().length}/${shop().maxQueue} · ` + (queueOf().length ? "Sırada bekleyen müşteriye dokun" : day.orders.length ? "Sipariş hazırlanıyor" : day.toSpawn > 0 ? "Müşteri bekleniyor…" : "Bugünkü müşteriler bitti");
  if (hint !== lastHint) { lastHint = hint; $("#hint").textContent = hint; }                 // performans: DOM'a yalnız değişince yaz
  if (day) { const ck = clockStr(day.t / DAY_SECONDS); if (ck !== lastClock) { lastClock = ck; $("#hClock").textContent = ck; } }
}
function spawnCustomer() {
  // §7 prototip müşteri tipleri: isim yok, yalnızca tip etiketi; tahammül ve bahşiş tipe göre değişir
  const type = pick(Object.keys(D.customers));
  const ct = D.customers[type];
  const menu = S.unlocked.filter(hasTools);                       // §3 aleti olmayan tarif menüde yok
  let wants = ct.wants ? ct.wants.filter(w => menu.includes(w)) : menu;
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
  if (c !== queueOf()[0]) { toast("Önce sıranın en önündeki müşteri"); return; }   // §7 yalnızca öndeki müşteri sipariş verir
  if (day.orders.length >= slots()) { toast(slots() === 1 ? "Makine dolu: önce eldeki siparişi bitir" : "İki grup kafası da dolu"); return; }
  if ((S.beans[S.bean]?.kg || 0) < D.economy.beanPerCup) { toast("Çekirdek bitti! Tedarik ikonuna dokun."); return; }
  if (D.drinks[c.drink].steps.includes("milk") && (S.milk || 0) < D.economy.milkPerCup - 1e-9) { toast("Süt bitti! Tedarik ikonuna dokun."); return; }
  if (c.type !== "nejla") {                                       // §7/§8 sipariş anında fiyat tepkisi
    const r = rollReaction(c.drink);
    if (r === "expensive") { c.say = "Çok pahalı! Almıyorum."; c.sayUntil = performance.now() + 2600; c.leaving = true; day.stats.pricey++; AUDIO.sfx("sad"); SCENE.addFx(c, "Pahalı!", "#e9c46a"); layout(); renderHUD(); return; }
    if (r === "cheap") { c.say = "Ne kadar ucuz!"; c.sayUntil = performance.now() + 1800; SCENE.addFx(c, "Ucuz!", "#9cc77a"); } else c.say = null;
  }
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
function stepTick(o, dt) {                                  // §4 renkli hedef çubuğu: ibre hareketi
  const s = o.steps[o.i]; if (!s || !MG[s]) return; const c = MG[s];
  if (o.phase === "run" && o.tutorial && o.frozen) { setNeedle(o.v); if ($("#closeup")) c.draw(o, o.v); return; }   // §4 ilk sipariş: mükemmel noktada bekler
  const v0 = o.v;
  if (o.phase === "run") {
    if ((o.mode || c.mode) === "osc") { o.v += o.dir * c.speed * dt; if (o.v > 100) { o.v = 100; o.dir = -1; } if (o.v < 0) { o.v = 0; o.dir = 1; } }
    else { o.v += (typeof c.speed === "function" ? c.speed() : c.speed) * dt; if (o.v >= 100) { o.v = 100; stopZone(o, s); return; } }
    if (c.onTick) c.onTick(o);
    if (o.tutorial && o.phase === "run" && (v0 - o.tgt) * (o.v - o.tgt) <= 0) { o.v = o.tgt; o.frozen = true; if (s === "extract" || s === "milk") AUDIO.stopLoops(); }
  }
  setNeedle(o.v); if ($("#closeup")) c.draw(o, o.v);
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
  const c = o.cust; const ct = D.customers[c.type] || { tip: 1, discount: null };   // Yıldız Teyze (§10): sabit tipte değil, normal müşteri değil
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
      modal(`<h3>Yıldız Teyze</h3><p>${D.tutorial.done}</p>`, [{ label: "Devam", pri: true }]); }
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
  if (S.debt > 0) { let cut = Math.min(S.debt, Math.round((st.income + st.tips) * D.economy.loanDailyCut)); L.cut = cut; S.money -= cut;   // §2 %20 kesinti, vadesi en yakın krediden
    S.loans.slice().sort((a, b) => a.due - b.due).forEach(l => { const x = Math.min(l.rem, cut); l.rem -= x; cut -= x; }); syncDebt(); }
  const lateLoan = (S.loans || []).find(l => l.rem > 0 && S.day >= l.due);
  if (lateLoan) { day = null; AUDIO.stopLoops(); return bankrupt(lateLoan); }   // §2 bir kredinin vadesi doldu: iflas
  if (S.decor && S.decor.plant) { L.plant = D.decor.plant.rep; S.rep += L.plant; }
  if (S.day % 7 === 0) L.news = updateMarket();                                                // §8 hafta sonu borsa
  const repDelta = S.rep - st.repStart; const dayNum = S.day;
  if (!S.equipment.fridge || S.day - (S.milkDay || S.day) + 1 >= D.economy.milkShelfDays) { L.spoiled = S.milk > 0; S.milk = 0; }   // §8 süt bozulur (buzdolabıyla 3 gün)
  AUDIO.stopLoops(); AUDIO.sfx("shopClose");                                       // §11 kapanış sesi
  day = null; save(); renderHUD(); renderScene(0);
  showLedger(dayNum, st, L, repDelta);
}
function showLedger(dayNum, st, L, repDelta) {
  const short = S.money < 0, need = short ? Math.ceil(-S.money / 50) * 50 : 0;
  if (short && (S.debt || 0) + Math.round(need * (1 + D.economy.loanInterest)) > shop().loanLimit) return bankrupt(null, need);   // §2 kira ödenemiyor + kredi limiti dolu: iflas
  $("#ledgerCard").innerHTML = `<h2>${weekday(dayNum)} · ${weekNo(dayNum)}. Hafta – gün kapanışı</h2>
    <table>
      <tr><td>Servis edilen</td><td class="num">${st.served} (${st.perfect} mükemmel)</td></tr>
      <tr><td>Giden müşteri (beklemekten vazgeçen)</td><td class="num">${st.left}</td></tr>
      ${st.bounced ? `<tr><td>Kapıdan dönen (sıra doluydu)</td><td class="num">${st.bounced}</td></tr>` : ""}
      ${st.pricey ? `<tr><td>Pahalı bulup giden</td><td class="num">${st.pricey}</td></tr>` : ""}
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
      ${(S.loans || []).map(l => `<tr><td>Kredi #${l.id} (₺${l.amount} → ₺${l.owe}) · vade</td><td class="num">₺${l.rem} kaldı · ${l.due - dayNum <= 0 ? "bugün" : (l.due - dayNum) + " gün"}</td></tr>`).join("")}
    </table>
    ${short ? `<div class="req">Kasa kirayı karşılamadı. Devam etmek için bankadan en az ₺${need} kredi çekmelisin (kira kredisi: geri ödeme ₺${Math.round(need * (1 + D.economy.loanInterest))}, %10 fazla, ${D.economy.rentLoanDays} gün vade).</div>` :
      `<p class="muted">Kiraya ${daysToRent(dayNum + 1)} gün. Yeni güne başlamadan önce tedarik yap: en az ${D.economy.minBeans} kg çekirdek${needsMilk() ? ` ve ${D.economy.minMilk} L süt` : ""} gerekir.</p>`}
    <div class="row"><button class="pri" id="ledgerOk">${short ? "Bankadan ₺" + need + " kredi çek" : (L.news ? "Gazeteye bak →" : "Devam →")}</button></div>`;
  openOverlay("#ovLedger");
  $("#ledgerOk").onclick = () => { if (short) { takeLoan(need, D.economy.rentLoanDays); showLedger(dayNum, st, L, repDelta); return; } $("#ovLedger").classList.remove("on"); if (L.news) showNews(weekNo(dayNum), L.news, openRestock); else openRestock(); };
}
function openRestock() { mandatoryRestock = true; dayFlow = "supply"; S.day++; save(); renderHUD(); renderSupply(); openOverlay("#ovShop"); }

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
  uiZone(o, $("#mgBody"));
  if (o.tutorial) pulseControl(s);
}
function pulseControl(s) { const el = $("#zB"); if (el) el.classList.add("pulse"); }
// ---------- §4 Renkli hedef çubuğu: tüm mini oyunlar ----------
// Ortada koyu yeşil Mükemmel (100), yanında açık yeşil Güzel (88), en dışta sarı İyi (72); dışı Kaçtı.
// Bölgeler rütbe toleransıyla daralır, ilgili hassasiyet yükseltmesiyle ×1,5 genişler (§8).
const hasWiden = step => Object.keys(S.equipment).some(k => S.equipment[k] && D.equipment[k] && D.equipment[k].widen === step);
function zoneSet(step) { const Z = D.zones, w = Math.min(1, tol()) * (hasWiden(step) ? Z.widen : 1) * ((Z.stepMult || {})[step] || 1);  /* başlangıçta toplam ≤ %10 */ return { p: Z.perfect * w, g: Z.good * w, k: Z.ok * w }; }
function zoneScore(v, t, z) {
  const d = Math.abs(v - t), sc = D.zones.score;
  if (d <= z.p) return [sc.perfect, "perfect"]; if (d <= z.g) return [sc.good, "good"]; if (d <= z.k) return [sc.ok, "ok"];
  return [Math.round(Math.max(20, 60 - (d - z.k) * 2)), "miss"];
}
function zoneBar(t, z, left, right) {
  const seg = (h, cls) => { const a = clamp(t - h, 0, 100), b = clamp(t + h, 0, 100); return `<div class="zb ${cls}" style="left:${a}%;width:${b - a}%"></div>`; };
  return `<div class="zbar">${seg(z.k, "ok")}${seg(z.g, "good")}${seg(z.p, "perf")}<div class="zneedle" id="zN"></div></div>
    <div class="zends"><span>${left}</span><span class="zleg"><i class="perf"></i>Mükemmel <i class="good"></i>Güzel <i class="ok"></i>İyi</span><span>${right}</span></div>`;
}
function setNeedle(v) { const n = $("#zN"); if (n) n.style.left = v + "%"; }
function showZone(zone, sc) { const r = $("#zRes"); if (!r) return; r.className = "zres " + zone; r.textContent = ({ perfect: "MÜKEMMEL!", good: "Güzel", ok: "İyi", miss: "Kaçtı" })[zone] + " · " + sc; }
const EXT_T = o => { const r = D.drinks[o.drink].ratio || 2; return r === 1.5 ? 20 : r === 3 ? 37.5 : 27.5; };
const MG = {
  grind:   { mode: "osc", speed: 85, btn: "ÖĞÜT", left: "kaba", right: "ince", target: () => S.bean === "brazil" ? 42 : 55, sfx: "grind", tipLow: "grind_low", tipHigh: "grind_high",
             draw: (o, v) => CLOSEUP.grind(v) },
  dose:    { mode: "hold", speed: 9 * 100 / 24, btn: "BASILI TUT · dozla", left: "0 g", right: "24 g", target: () => 18 / 24 * 100, sfx: "dose", tipLow: "dose_low", tipHigh: "dose_high",
             onStart: () => AUDIO.sfx("dose"), draw: (o, v) => CLOSEUP.dose(v * .24) },
  tamp:    { mode: "osc", ring: true, speed: 65, btn: "BASTIR", target: () => 58, sfx: "tamp", tipLow: "tamp_low", tipHigh: "tamp_high",
             draw: (o, v) => CLOSEUP.tamp(v / 100, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  extract: { mode: "sweep", speed: EXTRACT_SPEED * 100 / 45, btn0: "BAŞLAT", btn: "DURDUR", left: "0 sn", right: "45 sn", target: o => EXT_T(o) / 45 * 100, tipLow: "extract_low", tipHigh: "extract_high",
             onStart: () => AUDIO.loop("extract", true), onStop: () => { AUDIO.loop("extract", false); AUDIO.sfx("extractStop"); },
             draw: (o, v) => { const t = v * .45, tT = EXT_T(o), tg = Math.round(18 * (D.drinks[o.drink].ratio || 2)); CLOSEUP.extract(t, Math.max(0, (t - 6) * tg / (tT - 6)), tg, o.phase === "run", tT, 2.5); } },
  milk:    { mode: "hold", speed: () => (S.equipment.steamWand ? 24 : 16) * 100 / 65, btn: "BASILI TUT · ısıt", left: "20 °C", right: "85 °C", target: () => (62.5 - 20) / 65 * 100, tipLow: "milk_low", tipHigh: "milk_high",
             onStart: () => { AUDIO.loop("milk", true); AUDIO.milkAir(true); }, onTick: o => AUDIO.milkAir(20 + o.v * .65 < 45),
             draw: (o, v) => { const temp = 20 + v * .65, tt = { dollop: 1.2, foam: 1.8, micro: .8 }[D.drinks[o.drink].milk] || 1; CLOSEUP.milk(temp, tt * clamp(v / o.tgt, 0, 1.3), tt, o.phase === "run" && temp < 45, o.phase === "run"); } },
  // §3 aletlerin mini oyunları (espressodan sonra; her biri farklı biçim)
  water:   { mode: "hold", speed: 28, btn: "BASILI TUT · su dök", left: "boş", right: "taşar", target: () => 72, tipLow: "water_low", tipHigh: "water_high",
             onStart: () => AUDIO.loop("extract", true), onStop: () => AUDIO.loop("extract", false), draw: (o, v) => CLOSEUP.water(v, o.phase === "run") },
  pressure:{ mode: "osc", dial: true, speed: 55, btn: "VİDAYI KAPAT", target: () => 62, sfx: "tamp", tipLow: "pressure_low", tipHigh: "pressure_high",
             draw: (o, v) => CLOSEUP.pressure(v, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  cocoa:   { mode: "osc", speed: 75, btn: "SERP", left: "sol", right: "sağ", target: () => 50, sfx: "dose", tipLow: "cocoa_low", tipHigh: "cocoa_high",
             draw: (o, v) => CLOSEUP.cocoa(v, o.phase === "done") },
  art:     { mode: "hold", speed: 32, btn: "BASILI TUT · dök", left: "%0", right: "%100", target: () => 72.5, tipLow: "art_low", tipHigh: "art_high",
             draw: (o, v) => o.artCut ? CLOSEUP.art(o.fill, v / 100) : CLOSEUP.art(v, null) }
};
function uiZone(o, el) {
  const s = o.steps[o.i], c = MG[s];
  o.z = zoneSet(s); o.tgt = c.target(o); o.mode = null; o.artCut = false; o.dir = 1; o.frozen = false;
  o.v = c.mode === "osc" ? Math.random() * 100 : 0; o.phase = c.mode === "osc" ? "run" : "ready";
  const legend = `<div class="zends" style="justify-content:center"><span class="zleg"><i class="perf"></i>Mükemmel <i class="good"></i>Güzel <i class="ok"></i>İyi</span></div>`;
  el.innerHTML = (c.ring || c.dial ? legend : zoneBar(o.tgt, o.z, c.left, c.right)) + `<button class="hold big pri" id="zB">${c.btn0 || c.btn}</button><div id="zRes" class="zres"></div>`;
  if (c.ring || c.dial) $("#closeup").onpointerdown = e => { e.preventDefault(); if (o.phase === "run" && o.steps[o.i] === s) stopZone(o, s); };   // §4 tamping: daireye dokun
  bindZone(o, s); setNeedle(o.v); c.draw(o, o.v);
}
function bindZone(o, s) {
  const c = MG[s], b = $("#zB"), mode = o.mode || c.mode;
  b.onpointerdown = b.onpointerup = b.onpointercancel = b.onclick = null;
  if (mode === "osc") b.onpointerdown = e => { e.preventDefault(); if (o.phase === "run") stopZone(o, s); };
  if (mode === "sweep") b.onclick = () => { if (o.phase === "ready") { o.phase = "run"; b.textContent = c.btn; c.onStart && c.onStart(); } else if (o.phase === "run") stopZone(o, s); };
  if (mode === "hold") { b.onpointerdown = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} if (o.phase !== "ready") return; o.phase = "run"; b.textContent = "…bırak"; c.onStart && c.onStart(); if (s === "art") AUDIO.sfx("dose"); };
    b.onpointerup = b.onpointercancel = () => { if (o.phase === "run") stopZone(o, s); }; }
}
function stopZone(o, s) {
  const c = MG[s]; o.phase = "done"; c.onStop && c.onStop();
  let [sc, zone] = zoneScore(o.v, o.tgt, o.z); showZone(zone, sc); setNeedle(o.v);
  if (c.sfx) AUDIO.sfx(c.sfx);
  if (s === "art" && !o.artCut) {                         // §5 latte art 2. aşama: kesim ibresi gidip gelir
    o.fillScore = sc; o.fill = o.v; o.artCut = true; o.mode = "osc"; o.tgt = 50; o.z = zoneSet("art"); o.v = 0; o.dir = 1; o.frozen = false;
    setTimeout(() => { if (o.steps[o.i] !== "art") return; $("#mgBody").innerHTML = zoneBar(50, o.z, "sol", "sağ") + `<button class="hold big pri" id="zB">KES</button><div id="zRes" class="zres"></div>`;
      bindZone(o, s); o.phase = "run"; if (o.tutorial) pulseControl(s); }, 450);
    return;
  }
  if (s === "art") { AUDIO.sfx("open"); sc = Math.round((o.fillScore + sc) / 2); }
  finishStep(o, sc, o.v < o.tgt ? c.tipLow : c.tipHigh);
}
// ---------- §2 Gün sonu akışı: Tedarik → Dükkan → Fiyatlar ----------
// dayFlow: null | "supply" | "hub" | "price" (günler arası zorunlu ekranlar)
const ICONS = {
  upg:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
  tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3M3 13h18M11 13v2h2v-2"/></svg>',
  loans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>',
  decor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 14h10l-1.5 7h-7z"/><path d="M12 14V8M12 9c-3 0-5-2-5-5 3 0 5 2 5 5zM12 11c3 0 5-2 5-5-3 0-5 2-5 5z"/></svg>'
};
const TAB = { upg: ["Geliştirmeler", "#3b6ea8"], tools: ["Aletler & Makineler", "#c9772b"], loans: ["Krediler", "#b5533c"], decor: ["Dekorasyon", "#5f8a4b"] };
let hubTab = "upg";
const buy = (cost, fn) => { if (S.money < cost) return; S.money -= cost; fn(); AUDIO.sfx("register"); save(); renderHUD(); };

// --- Tedarik: yalnızca malzeme (§2) ---
function supplyMissing() {
  const m = [], kg = S.beans[S.bean]?.kg || 0;
  if (kg < D.economy.minBeans) m.push(`Çekirdek — en az ${D.economy.minBeans} kg olmalı (şu an ${kg.toFixed(2)} kg). Aşağıdan çekirdek al.`);
  if (needsMilk() && (S.milk || 0) < D.economy.minMilk) m.push(`Süt — en az ${D.economy.minMilk} L olmalı (şu an ${(S.milk || 0).toFixed(1)} L). Aşağıdan süt al.`);
  return m;
}
function renderSupply() {
  const lv = shop(), miss = supplyMissing(), flow = dayFlow === "supply";
  let html = `<h2>Tedarik${flow ? "" : '<span class="x" id="supX">✕</span>'}</h2>`;
  html += miss.length ? miss.map(t => `<div class="miss">EKSİK: ${t}</div>`).join("") : `<div class="req ok" style="font-size:15px">Malzemeler tamam ✓</div>`;
  const beanLow = (S.beans[S.bean]?.kg || 0) < D.economy.minBeans, milkLow = needsMilk() && (S.milk || 0) < D.economy.minMilk;
  html += `<div class="box ${beanLow ? "need" : ""}"><h4>Çekirdek (₺/kg) · kullanımda: ${D.beans[S.bean].name} ${(S.beans[S.bean]?.kg || 0).toFixed(2)} kg</h4><table>` + Object.entries(D.beans).filter(([, b]) => b.unlock <= lv.stars).map(([id, b]) => { const st = S.beans[id];
    return `<tr><td><b>${b.name}</b><br><span class="muted">${b.notes}</span></td><td>₺${b.price}<br><span class="muted">${st ? st.kg.toFixed(2) + " kg" : "stok yok"}</span></td>
      <td><button data-buy="${id}" ${S.money < b.price ? "disabled" : ""}>1 kg al</button><br><button data-use="${id}" ${!st || S.bean === id ? "disabled" : ""}>${S.bean === id ? "kullanımda" : "kullan"}</button></td></tr>`; }).join("") + `</table></div>`;
  if (needsMilk() || S.tools.milkKit) html += `<div class="box ${milkLow ? "need" : ""}"><h4>Süt (₺${D.economy.milkPrice}/L)</h4><p class="muted">Sütlü içecek başına ${D.economy.milkPerCup} L harcanır. ${S.equipment.fridge ? "Buzdolabı var: süt 3 gün dayanır." : "Buzdolabı yok: gün sonunda kalan süt bozulur."}</p>
    <p>Stok: <b>${(S.milk || 0).toFixed(1)} L</b> <button id="buyMilk" ${S.money < D.economy.milkPrice ? "disabled" : ""}>1 L al</button></p></div>`;
  html += `<div class="row"><button id="supLoan" class="loanbtn">🏦 Kredi al</button><button class="pri" id="supNext" ${flow && miss.length ? "disabled" : ""}>${flow ? "Devam →" : "Kapat"}</button></div>`;
  $("#shopCard").innerHTML = html;
  const re = () => renderSupply();
  $("#shopCard").querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const id = b.dataset.buy; buy(D.beans[id].price, () => { S.beans[id] = { kg: (S.beans[id]?.kg || 0) + 1, boughtDay: S.day }; }); re(); });
  $("#shopCard").querySelectorAll("[data-use]").forEach(b => b.onclick = () => { S.bean = b.dataset.use; save(); re(); renderHUD(); });
  const bm = $("#buyMilk"); if (bm) bm.onclick = () => { buy(D.economy.milkPrice, () => { S.milk = (S.milk || 0) + 1; S.milkDay = S.day; }); re(); };
  $("#supLoan").onclick = () => openLoans(re);
  const sx = $("#supX"); if (sx) sx.onclick = () => closeOverlay("#ovShop");
  $("#supNext").onclick = () => { if (!flow) return closeOverlay("#ovShop"); if (supplyMissing().length) return; dayFlow = "hub"; $("#ovShop").classList.remove("on"); hubTab = "upg"; renderHub(); openOverlay("#ovHub"); };
}

// --- Krediler (Dükkan sekmesi + Tedarik'ten açılır pencere) ---
function loansHTML() {
  const lv = shop(), room = lv.loanLimit - (S.debt || 0), cap = x => Math.round(x * (1 + D.economy.loanInterest)) <= room;
  return `<p class="muted">Her kredi ayrı borçtur ve ayrı ödenir; geri ödeme %10 fazladır. Gün sonunda gelirin %20'si vadesi en yakın krediden kesilir. Vadesi dolan krediyi ödemezsen <b>iflas</b> edersin.</p>
    <p>Toplam borç: <b>₺${S.debt || 0}</b> · limit ₺${lv.loanLimit}</p><div class="row" style="justify-content:flex-start">
    ${D.economy.loans.map(l => `<button data-loan="${l.amount}" ${cap(l.amount) ? "" : "disabled"}>₺${l.amount} al → ₺${Math.round(l.amount * (1 + D.economy.loanInterest))} öde · ${l.days} gün</button>`).join("")}</div>
    ${(S.loans || []).map(l => { const mx = Math.max(0, Math.min(l.rem, S.money)), dl = daysLeft(l);
      return `<div class="slot" style="margin:8px 0"><div class="num" style="font-size:14px">#${l.id}</div><div class="info"><b>₺${l.amount} kredi → ₺${l.owe} geri ödeme</b>
        <span class="muted">Kalan ₺${l.rem} · vade ${dl === 0 ? "<b style='color:var(--kotu)'>bugün</b>" : dl <= 2 ? `<b style='color:var(--kotu)'>${dl} gün</b>` : dl + " gün"} (gün ${l.due} sonunda)</span></div>
        <div class="acts"><button data-close="${l.id}" ${S.money >= l.rem ? "" : "disabled"}>Kapat (₺${l.rem})${S.money >= l.rem ? "" : ` · ₺${l.rem - Math.max(0, S.money)} daha gerekli`}</button>
        <input type="number" data-amt="${l.id}" min="1" max="${mx}" placeholder="₺" style="width:80px;padding:7px;border:1px solid var(--cizgi);border-radius:10px;font:inherit">
        <button data-part="${l.id}" ${mx > 0 ? "" : "disabled"}>Miktarını öde</button></div></div>`; }).join("") || '<p class="muted">Açık kredin yok.</p>'}`;
}
function bindLoans(root, re) {
  root.querySelectorAll("[data-loan]").forEach(b => b.onclick = () => { const x = +b.dataset.loan; takeLoan(x, loanDays(x)); renderHUD(); re(); });
  root.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { const l = S.loans.find(x => x.id === +b.dataset.close); if (!l || S.money < l.rem) return;
    S.money -= l.rem; l.rem = 0; syncDebt(); S.log.push("Gün " + S.day + ": kredi #" + l.id + " kapatıldı"); AUDIO.sfx("register"); save(); renderHUD(); re(); });
  root.querySelectorAll("[data-part]").forEach(b => b.onclick = () => { const id = +b.dataset.part, l = S.loans.find(x => x.id === id); if (!l) return;
    const x = Math.floor(+root.querySelector(`[data-amt="${id}"]`).value || 0), mx = Math.min(l.rem, Math.max(0, S.money));
    if (x <= 0 || x > mx) { toast(mx > 0 ? `Kredi #${id} için 1 ile ₺${mx} arasında bir tutar gir` : "Kasada para yok"); return; }
    S.money -= x; l.rem -= x; if (l.rem === 0) S.log.push("Gün " + S.day + ": kredi #" + id + " kapatıldı"); syncDebt(); AUDIO.sfx("register"); save(); renderHUD(); re(); });
}
function openLoans(after) {
  const draw = () => { $("#loanCard").innerHTML = `<h2>🏦 Krediler<span class="x" id="loanX">✕</span></h2>` + loansHTML(); bindLoans($("#loanCard"), draw); $("#loanX").onclick = () => { closeOverlay("#ovLoan"); after && after(); }; };
  draw(); openOverlay("#ovLoan");
}

// --- Dükkan yönetim ekranı (§2): sekmeler + Ana hedef ---
function eqRow(id, e) {
  const miss = (e.requires || []).filter(r => !S.equipment[r]);
  const st = S.equipment[id] ? "✓ alındı" : miss.length ? `🔒 Önce: ${miss.map(r => D.equipment[r].name).join(", ")}` : `<button data-eq="${id}" ${S.money < e.price ? "disabled" : ""}>Satın al</button>`;
  return `<tr class="${miss.length && !S.equipment[id] ? "lock" : ""}"><td><b>${e.auto ? "⚙ " : e.widen ? "🎯 " : ""}${e.name}</b><br><span class="muted">${e.effect}</span></td><td>₺${e.price}</td><td>${st}</td></tr>`;
}
function hubContent() {
  const lv = shop(), vis = e => (e.stars || 1) <= lv.stars;
  if (hubTab === "upg") {
    const T = tr(), cost = k => lv.tierCost[k], E = Object.entries(D.equipment).filter(([, e]) => vis(e));
    const sec = (title, desc, rows) => rows ? `<div class="box"><h4>${title}</h4>${desc ? `<p class="muted">${desc}</p>` : ""}<table>${rows}</table></div>` : "";
    const traffic = `<tr><td><b>Günlük müşteri</b> (kademe ${T.cust}/3)<br><span class="muted">${T.cust < 3 ? D.traffic.cust[T.cust] + ": +" + lv.custStep + " müşteri/gün" : "en üst kademe"}</span></td><td>${T.cust < 3 ? "₺" + cost(T.cust) : ""}</td><td>${T.cust < 3 ? `<button data-tr="cust" ${S.money < cost(T.cust) ? "disabled" : ""}>Yükselt</button>` : "✓"}</td></tr>
      <tr><td><b>Geliş sıklığı</b> (kademe ${T.freq}/3)<br><span class="muted">${T.freq < 3 ? D.traffic.freq[T.freq] + ": müşteriler daha sık gelir" : "en üst kademe"}</span></td><td>${T.freq < 3 ? "₺" + cost(T.freq) : ""}</td><td>${T.freq < 3 ? `<button data-tr="freq" ${S.money < cost(T.freq) ? "disabled" : ""}>Yükselt</button>` : "✓"}</td></tr>`;
    const A = D.staff.assistant;
    const staff = A.stars <= lv.stars ? `<tr><td><b>${A.name}</b><br><span class="muted">${A.effect} (${A.score} puan) · günlük maaş ₺${A.wage}</span></td><td></td><td>${S.staff.assistant ? `<button id="fire">Çıkar</button>` : `<button id="hire">İşe al</button>`}</td></tr>` : "";
    return sec("👥 Müşteri gelişi", `Sıra en fazla ${lv.maxQueue} kişi · günde en fazla ${dayCap()} müşteri · ~${arrivalEvery().toFixed(1)} sn'de bir müşteri. Kademeler bu dükkana özeldir.`, traffic)
      + sec("🎯 Kolaylaştırıcılar ve göstergeler", "Renkli hedef bölgelerini genişletir ya da adımı hızlandırır.", E.filter(([id, e]) => e.widen || id === "steamWand").map(([id, e]) => eqRow(id, e)).join(""))
      + sec("⚙ Otomasyon", "Adımı atlar, sabit 85 puan verir; önce o adımın kolaylaştırıcısı gerekir.", E.filter(([, e]) => e.auto).map(([id, e]) => eqRow(id, e)).join(""))
      + sec("🏪 Kapasite ve personel", "", E.filter(([id]) => id === "dualGroup" || id === "fridge").map(([id, e]) => eqRow(id, e)).join("") + staff);
  }
  if (hubTab === "tools") {
    const rows = Object.entries(D.tools).filter(([, t]) => vis(t)).map(([id, t]) => { const uses = Object.keys(D.drinks).filter(k => (D.drinks[k].needs || []).includes(id)).map(k => D.drinks[k].name);
      return `<tr><td><b>${t.name}</b><br><span class="muted">${t.effect} · gerektiren: ${uses.join(", ")} · mini oyun: ${D.minigames[t.step].name}</span></td><td>₺${t.price}</td><td>${S.tools[id] ? "✓ dükkanda" : `<button data-tool="${id}" ${S.money < t.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`; }).join("");
    return `<div class="box"><p class="muted">Bazı tarifler bu aletler ya da makineler olmadan yapılamaz. Aldıkların dükkan büyüyünce yeni dükkana taşınır.</p><table>${rows}</table></div>`;
  }
  if (hubTab === "loans") return `<div class="box">${loansHTML()}</div>`;
  return `<div class="box"><table>` + Object.entries(D.decor).map(([id, dc]) => `<tr><td><b>${dc.name}</b><br><span class="muted">${dc.effect}</span></td><td>₺${dc.price}</td><td>${S.decor[id] ? "✓ dükkanda" : `<button data-dec="${id}" ${S.money < dc.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`).join("") + `</table></div>`;
}
function renderHub() {
  const lv = shop(), flow = dayFlow === "hub";
  let html = `<div class="hubhead"><h2 style="margin:0">Dükkan · ${"★".repeat(lv.stars)} ${lv.name}</h2><span class="muted">Kasa ₺${S.money}</span><button id="goalBtn" class="goal">🎯 Ana hedef</button>${flow ? "" : '<span class="x" id="hubX">✕</span>'}</div>`;
  html += `<div class="tabbar">${Object.entries(TAB).map(([k, [n, c]]) => `<button data-tab="${k}" class="${hubTab === k ? "on" : ""}" style="--tc:${c}">${ICONS[k]}<span>${n}</span></button>`).join("")}</div>`;
  html += `<div class="tabbody" style="--tc:${TAB[hubTab][1]}">${hubContent()}</div>`;
  html += `<div class="row"><button class="pri" id="hubNext">${flow ? "Devam →" : "Kapat"}</button></div>`;
  $("#hubCard").innerHTML = html;
  const R = $("#hubCard"), re = () => renderHub();
  R.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { hubTab = b.dataset.tab; AUDIO.sfx("click"); re(); });
  R.querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const id = b.dataset.eq; buy(D.equipment[id].price, () => { S.equipment[id] = true; if (id === "fridge") S.milkDay = S.day; }); re(); });
  R.querySelectorAll("[data-tool]").forEach(b => b.onclick = () => { const id = b.dataset.tool; buy(D.tools[id].price, () => { S.tools[id] = true; S.log.push("Gün " + S.day + ": " + D.tools[id].name + " alındı"); }); re(); });
  R.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => { const id = b.dataset.dec; buy(D.decor[id].price, () => { S.decor[id] = true; }); re(); });
  R.querySelectorAll("[data-tr]").forEach(b => b.onclick = () => { const k = b.dataset.tr, T = S.traffic[S.shopLevel] = Object.assign({ cust: 0, freq: 0 }, S.traffic[S.shopLevel]);
    if (T[k] >= 3) return; buy(shop().tierCost[T[k]], () => { S.log.push("Gün " + S.day + ": " + D.traffic[k][T[k]]); T[k]++; }); re(); });
  const hi = $("#hire"); if (hi) hi.onclick = () => { S.staff.assistant = true; S.log.push("Gün " + S.day + ": yardımcı barista işe alındı"); save(); re(); };
  const fi = $("#fire"); if (fi) fi.onclick = () => { S.staff.assistant = false; save(); re(); };
  if (hubTab === "loans") bindLoans(R, re);
  $("#goalBtn").onclick = () => renderGoal();
  const hx = $("#hubX"); if (hx) hx.onclick = () => closeOverlay("#ovHub");
  $("#hubNext").onclick = () => { if (!flow) return closeOverlay("#ovHub"); dayFlow = "price"; $("#ovHub").classList.remove("on"); renderPrices(); openOverlay("#ovPrice"); };
}
function renderGoal() {
  const next = D.shopLevels[S.shopLevel + 1];
  let html = `<h2>🎯 Ana hedef<span class="x" id="goalX">✕</span></h2>`;
  if (!next) html += `<p>Prototipteki en büyük dükkandasın: ${"★".repeat(shop().stars)} ${shop().name}.</p>`;
  else {
    const ok = (c, t) => `<div class="req ${c ? "ok" : ""}">${t} ${c ? "✓" : ""}</div>`;
    html += `<p>Sıradaki dükkan: <b>${"★".repeat(next.stars)} ${next.name}</b></p>` + ok(S.money >= next.money, `Kasa ₺${S.money} / ₺${next.money}`) + ok(S.rep >= next.rep, `İtibar ${S.rep} / ${next.rep}`) + ok(!(S.debt > 0), S.debt > 0 ? `Borç yok (şu an ₺${S.debt})` : "Borç yok");
    html += `<p class="muted">Açar: sıra ${next.maxQueue} kişi, günde ${next.customersPerDay} müşteri · haftalık kira ₺${next.rent} · ${next.stars === 2 ? "latte, cappuccino, buhar kazanı, kakao serpici, çift gruplu makine, otomatik tamper, buzdolabı, yardımcı barista" : "süper otomatik makine, otomatik süt köpürtücü, latte art, döküm sürahisi"}. Aldığın aletler ve makineler yeni dükkana taşınır.</p>`;
    const can = S.money >= next.money && S.rep >= next.rep && !(S.debt > 0);
    html += `<div class="row"><button class="pri" id="lvUp" ${can ? "" : "disabled"}>Seviye atla</button></div>`;
  }
  $("#goalCard").innerHTML = html; openOverlay("#ovGoal");
  $("#goalX").onclick = () => closeOverlay("#ovGoal");
  const up = $("#lvUp"); if (up) up.onclick = () => { S.shopLevel++; S.log.push("Gün " + S.day + ": " + shop().name); AUDIO.sfx("unlock"); checkUnlocks(); save(); renderHUD(); closeOverlay("#ovGoal"); renderHub();
    modal(`<h3>${"★".repeat(shop().stars)} ${shop().name}</h3><p>Sıra en fazla ${shop().maxQueue} kişi, günde ${shop().customersPerDay} müşteri, haftalık kira ₺${shop().rent}. Yeni geliştirmeler, aletler ve kredi limiti (₺${shop().loanLimit}) açıldı.</p>`); };
}

// --- Fiyatlar (§8) ---
function reactionText(id) {
  const d = priceOf(id) / fairPrice(id) - 1, P = D.pricing;
  if (d >= P.all) return ["Herkes çok pahalı bulur, almaz", "bad"];
  if (d > P.neutral) return [`Bazıları pahalı bulup gider (~%${Math.round(Math.min(1, (d - P.neutral) / (P.all - P.neutral)) * 100)})`, "warn"];
  if (d <= -P.all) return ["Herkes çok ucuz bulur (yine de alır)", "cheap"];
  if (d < -P.neutral) return ["Bazıları ucuz bulur (yine de alır)", "cheap"];
  return ["Normal, yorum yok", "ok"];
}
function renderPrices() {
  const flow = dayFlow === "price", P = D.pricing, list = S.unlocked.filter(hasTools);
  let html = `<h2>Fiyatlar${flow ? "" : '<span class="x" id="prX">✕</span>'}</h2><p class="muted">Varsayılan fiyat malzeme maliyeti ve kiradan hesaplanır; müşteriler ayrıca <b>borsa endeksine</b> bakar. ±%10 içinde kimse yorum yapmaz. Değişiklik sıradaki ve sonradan gelen müşteriler için geçerlidir.</p><table class="ptable">
    <tr><th>Tarif</th><th>Maliyet</th><th>Varsayılan</th><th>Borsa</th><th>Senin fiyatın</th><th></th></tr>`;
  html += list.map(id => { const m = marketIdx(id), r = priceRatio(id), [rt, cls] = reactionText(id);
    return `<tr><td><b>${D.drinks[id].name}</b><br><span class="rx ${cls}">${rt}</span></td><td class="num">₺${unitCost(id).toFixed(1)}</td><td class="num">₺${defaultPrice(id)}</td>
      <td class="num">${m >= 1 ? "▲" : "▼"} ×${m.toFixed(2)}</td><td class="num"><b>₺${priceOf(id)}</b><br><span class="muted">%${Math.round(r * 100)}</span></td>
      <td><div class="pbtns"><button data-pd="${id}" ${r <= P.min + 1e-9 ? "disabled" : ""}>−%5</button><button data-pu="${id}" ${r >= P.max - 1e-9 ? "disabled" : ""}>+%5</button><button data-p0="${id}" title="Varsayılana dön">↺</button></div></td></tr>`; }).join("");
  html += `</table>${S.unlocked.filter(id => !hasTools(id)).length ? `<p class="muted">Aleti eksik olduğu için menüde olmayan: ${S.unlocked.filter(id => !hasTools(id)).map(id => D.drinks[id].name).join(", ")} (Dükkan › Aletler & Makineler).</p>` : ""}
    <div class="row"><button class="pri" id="prNext">${flow ? "Günü başlat ☕" : "Kapat"}</button></div>`;
  $("#priceCard").innerHTML = html;
  const R = $("#priceCard"), set = (id, v) => { S.prices[id] = Math.round(clamp(v, P.min, P.max) * 100) / 100; save(); renderPrices(); };
  R.querySelectorAll("[data-pd]").forEach(b => b.onclick = () => set(b.dataset.pd, priceRatio(b.dataset.pd) - P.step));
  R.querySelectorAll("[data-pu]").forEach(b => b.onclick = () => set(b.dataset.pu, priceRatio(b.dataset.pu) + P.step));
  R.querySelectorAll("[data-p0]").forEach(b => b.onclick = () => set(b.dataset.p0, 1));
  const px = $("#prX"); if (px) px.onclick = () => closeOverlay("#ovPrice");
  $("#prNext").onclick = () => { if (!flow) return closeOverlay("#ovPrice"); dayFlow = null; mandatoryRestock = false; $("#ovPrice").classList.remove("on"); startDay(); };
}

// --- §8 Kahve borsası: haftalık değişim + gazete ---
function updateMarket() {
  S.market = S.market || {}; const M = D.market, ch = [];
  Object.keys(D.drinks).forEach(id => { const old = marketIdx(id), nw = clamp(old * (1 + (Math.random() * 2 - 1) * M.weeklyMax), M.min, M.max); S.market[id] = Math.round(nw * 100) / 100; ch.push([id, S.market[id] / old - 1]); });
  return ch.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, M.news);
}
function showNews(week, ch, next) {
  modal(`<div class="news"><div class="nhead">KAHVE GAZETESİ<span>${week}. Hafta · Borsa</span></div>` + ch.map(([id, c]) => `<p><b>${D.drinks[id].name} fiyatları %${Math.abs(Math.round(c * 100))} ${c >= 0 ? "arttı ▲" : "düştü ▼"}</b><br><span class="muted">Müşteriler artık ${D.drinks[id].name.toLowerCase()} için ${c >= 0 ? "biraz daha yüksek" : "biraz daha düşük"} fiyatı makul buluyor (endeks ×${marketIdx(id).toFixed(2)}).</span></p>`).join("") + `</div>`,
    [{ label: "Devam", pri: true, fn: next }]);
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
    const left = Math.max(0, d.unlockCups - totalSold()), shOk = shop().stars >= (d.shop || 1);
    return `<div class="recipe ${open ? "" : "lock"}">${drinkIcon(id, !open)}<div><b>${open ? d.name : "???"}</b> <span class="muted">${open ? `· ${S.served[id] || 0} servis, ${S.perfect[id] || 0} mükemmel${d.art && shop().stars >= 3 ? " · latte art ✓" : ""}${hasTools(id) ? "" : " · <b style='color:var(--kotu)'>Gerekli: " + (d.needs || []).filter(t => !S.tools[t]).map(t => D.tools[t].name).join(", ") + "</b>"}` : `· ${d.unlockCups} kahve satınca ${left ? `(${left} kahve daha)` : "✓"} · ${d.shop || 1}★ dükkan ${shOk ? "✓" : "🔒"}`}</span><br>${open ? d.card : '<span class="muted">Bu tarifi henüz öğrenmedin.</span>'}</div></div>`; }).join("") + `</div>`;
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
    <div class="box"><label class="setrow" style="cursor:pointer"><input type="checkbox" id="muteAll" ${a.muted ? "checked" : ""}> Tüm sesleri kapat</label></div>
    <div class="box"><h4>Grafik</h4>
      <label class="setrow" style="cursor:pointer"><input type="checkbox" id="gfxGpu" ${GFX.gpu ? "checked" : ""} ${GPU.ok ? "" : "disabled"}> Ekran kartıyla çiz (donanım hızlandırma)</label>
      <p class="muted">${GPU.ok ? "Algılanan ekran kartı: " + (GPU.name || "bilinmiyor") : "Bu tarayıcı/sistemde ekran kartı hızlandırması desteklenmiyor" + (GPU.name ? " (" + GPU.name + ")" : "") + "."}</p>
      <div id="gfxRestart" style="display:none" class="req">Bu değişiklik oyun kaydedilip yeniden yüklenince geçerli olur. <button id="gfxReload">Kaydet ve yeniden yükle</button></div>
      <p style="margin:10px 0 4px"><b>Grafik kalitesi</b> <span class="muted">(eski bilgisayarlarda Orta ya da Düşük seç)</span></p>
      <div class="row" style="justify-content:flex-start;margin-top:4px">${["high", "medium", "low"].map(q => `<button data-q="${q}" class="${GFX.quality === q ? "pri" : ""}">${{ high: "Yüksek", medium: "Orta", low: "Düşük" }[q]}</button>`).join("")}</div>
      <p class="muted">Yüksek: tam çözünürlük, tüm ışık/gölge, 60 kare/sn · Orta: daha düşük çözünürlük, sade ışık · Düşük: %80 çözünürlük, efektsiz, 30 kare/sn.</p></div>
    <div class="box"><h4>Kayıtlar</h4><p class="muted">Kaydı dosya olarak saklayabilir ya da bir dosyadan yuvaya aktarabilirsin.</p>
      <div class="row" style="justify-content:flex-start"><button id="setExport">Kaydı dışa aktar</button><button id="setImport">Kaydı içe aktar</button></div></div>`;
  $("#setX").onclick = () => closeOverlay("#ovSettings");
  $("#volMusic").oninput = e => AUDIO.setMusic(+e.target.value / 100);
  $("#volSfx").oninput = e => { AUDIO.setSfx(+e.target.value / 100); AUDIO.sfx("click"); };
  $("#muteAll").onchange = e => AUDIO.setMuted(e.target.checked);
  $("#setExport").onclick = () => $("#btnExport").click();
  $("#gfxGpu").onchange = e => { GFX.gpu = e.target.checked; saveGfx(); $("#gfxRestart").style.display = ""; };
  $("#gfxReload").onclick = () => { save(); location.reload(); };
  $("#settingsCard").querySelectorAll("[data-q]").forEach(b => b.onclick = () => { GFX.quality = b.dataset.q; saveGfx(); SCENE.setQuality(GFX.quality); CLOSEUP.setQuality(GFX.quality);
    if (S) renderScene(0); else idleLoop(); renderSettings(); });
  $("#setImport").onclick = () => { closeOverlay("#ovSettings"); $("#fileImport").click(); };
}

// ---------- §2 İflas: vade dolduğunda borç varsa oyun biter ----------
function bankrupt(late, need) {
  cancelAnimationFrame(raf); S.bankrupt = true; S.log.push("Gün " + S.day + ": iflas"); save();
  ["#sheet"].forEach(x => $(x).classList.remove("on")); AUDIO.sfx("sad");
  modal(`<h3>İflas!</h3><p>${late ? `Kredi #${late.id} (₺${late.amount} → ₺${late.owe}) vadesi doldu ve ₺${late.rem} borç ödenmedi.` : `Kasa kirayı karşılamadı (₺${need} açık) ve banka kredi limiti (₺${shop().loanLimit}) dolu olduğu için yeni kredi vermedi.`} Banka dükkana el koydu; oyun bitti.</p>
    <table><tr><td>Dayandığın gün</td><td class="num">${S.day}</td></tr><tr><td>Satılan kahve</td><td class="num">${totalSold()}</td></tr>
    <tr><td>Açılan tarif</td><td class="num">${S.unlocked.length} / ${Object.keys(D.drinks).length}</td></tr><tr><td>Dükkan</td><td class="num">${"★".repeat(shop().stars)} ${shop().name}</td></tr></table>
    <p class="muted">Yuva ${curSlot} "İflas etti" olarak işaretlendi; silebilir ya da üstüne yeni oyun açabilirsin.</p>`, [{ label: "Ana menüye dön", pri: true, fn: goMenu }]);
}

// ---------- §12 Kayıt yuvaları ----------
function slotSummary(x) {
  if (!x) return `<b>Boş yuva</b><span class="muted">Henüz kayıt yok</span>`;
  if (x.bankrupt) return `<b>💀 İflas etti (Gün ${x.day})</b><span class="muted">Bu kayıt yüklenemez; silebilir ya da üstüne yeni oyun açabilirsin.</span>`;
  const lv = D.shopLevels[x.shopLevel || 0], when = x.savedAt ? new Date(x.savedAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  return `<b>${weekday(x.day)} · ${weekNo(x.day)}. Hafta (Gün ${x.day})</b><span class="muted">₺${x.money} · ${"★".repeat(lv.stars)} ${lv.name} · kaydedildi ${when}</span>`;
}
function renderSlots(mode, payload) {
  const titles = { new: "Yeni oyun – yuva seç", load: "Kayıt yükle", save: "Oyunu kaydet", import: "Kaydı hangi yuvaya aktaralım?" };
  let html = `<h2>${titles[mode]}<span class="x" id="slotsX">✕</span></h2>`;
  for (let i = 1; i <= SLOTS; i++) {
    const x = loadSlot(i), cur = S && i === curSlot;
    let acts = "";
    if (mode === "new") acts = `<button class="pri" data-act="new" data-i="${i}">Burada başla</button>`;
    if (mode === "load") acts = `<button class="pri" data-act="load" data-i="${i}" ${x && !x.bankrupt ? "" : "disabled"}>Yükle</button>`;
    if (mode === "save") acts = `<button class="pri" data-act="save" data-i="${i}">Buraya kaydet</button>`;
    if (mode === "import") acts = `<button class="pri" data-act="import" data-i="${i}">Buraya aktar</button>`;
    if (x && mode !== "import" && !cur) acts += `<button class="danger" data-act="del" data-i="${i}">Sil</button>`;
    html += `<div class="slot ${x ? "" : "empty"}"><div class="num">${i}</div><div class="info">${slotSummary(x)}${cur ? '<span class="muted"> · şu an oynanan</span>' : ""}</div><div class="acts">${acts}</div></div>`;
  }
  $("#slotsCard").innerHTML = html; openOverlay("#ovSlots");
  $("#slotsX").onclick = () => closeOverlay("#ovSlots");
  const confirmOver = (i, verb, fn) => { const x = loadSlot(i); if (x && !(S && i === curSlot && verb === "kaydet")) modal(`<h3>Yuva ${i} dolu</h3><p>${slotSummary(x).replace(/<[^>]+>/g, " ")}</p><p>Bu kaydın üstüne ${verb === "kaydet" ? "yazılacak" : "yeni oyun yazılacak"}. Eski kayıt geri gelmez.</p>`,
      [{ label: "Vazgeç" }, { label: "Üstüne yaz", pri: true, fn }]); else fn(); };
  $("#slotsCard").querySelectorAll("[data-act]").forEach(b => b.onclick = () => {
    const i = +b.dataset.i, act = b.dataset.act;
    if (act === "new") confirmOver(i, "yeni", () => { closeOverlay("#ovSlots"); begin(newState(), i); });
    if (act === "load") { const x = loadSlot(i); if (x && !x.bankrupt) { closeOverlay("#ovSlots"); begin(x, i); } }
    if (act === "save") confirmOver(i, "kaydet", () => { curSlot = i; save(i); AUDIO.sfx("register"); toast("Yuva " + i + "'e kaydedildi"); renderSlots("save"); });
    if (act === "import") confirmOver(i, "aktar", () => { try { localStorage.setItem(SLOT_KEY(i), JSON.stringify(payload)); } catch (e) {} toast("Kayıt yuva " + i + "'e aktarıldı"); closeOverlay("#ovSlots"); refreshMenu(); });
    if (act === "del") modal(`<h3>Yuva ${i} silinsin mi?</h3><p>${slotSummary(loadSlot(i)).replace(/<[^>]+>/g, " ")}</p><p>Silinen kayıt geri gelmez.</p>`,
      [{ label: "Vazgeç" }, { label: "Sil", pri: true, fn: () => { deleteSlot(i); refreshMenu(); renderSlots(mode, payload); } }]);
  });
}
// ---------- §12 Oyun içi menü ----------
function renderGameMenu() {
  $("#gameMenuCard").innerHTML = `<h2>Menü<span class="x" id="gmX">✕</span></h2>
    <p class="muted">Oyun yuva ${curSlot}'e kendiliğinden kaydediliyor.</p>
    <div class="mbtns" style="display:flex;flex-direction:column;gap:10px">
      <button class="pri" id="gmSave">Kaydet (yuva seç)</button>
      <button id="gmMenu">Ana menüye dön</button>
      <button id="gmClose">Oyuna dön</button></div>`;
  $("#gmX").onclick = $("#gmClose").onclick = () => closeOverlay("#ovGameMenu");
  $("#gmSave").onclick = () => { closeOverlay("#ovGameMenu"); renderSlots("save"); };
  $("#gmMenu").onclick = () => modal(`<h3>Ana menüye dönülsün mü?</h3><p>${day ? "Gün sürüyor: bugünün kalan müşterileri iptal olur, şimdiye kadar kazandıkların kalır ve aynı günü yeniden açarsın. " : ""}Oyun yuva ${curSlot}'e kaydedilecek.</p>`,
    [{ label: "Vazgeç" }, { label: "Ana menüye dön", pri: true, fn: goMenu }]);
}
function goMenu() {
  AUDIO.stopLoops(); cancelAnimationFrame(raf); day = null; save();
  ["#ovGameMenu", "#ovBook", "#ovSettings", "#ovLedger"].forEach(x => $(x).classList.remove("on"));
  mandatoryRestock = false; dayFlow = null; ["#ovShop", "#ovHub", "#ovPrice", "#ovLoan", "#ovGoal"].forEach(x => $(x).classList.remove("on")); $("#sheet").classList.remove("on");
  ["#hud", "#hint", "#icons", "#task", "#openDay"].forEach(x => $(x).style.display = "none");
  S = null; $("#menu").style.display = "flex"; refreshMenu(); idleLoop(); AUDIO.startMusic("menu");
}

// ---------- Başlat ----------
function begin(state, slot) {
  if (slot) curSlot = slot; S = state; if (S.milk == null) S.milk = 0; mandatoryRestock = false;
  ["debt", "streak"].forEach(k => { if (S[k] == null) S[k] = 0; }); ["staff", "decor", "traffic", "market"].forEach(k => { if (!S[k]) S[k] = {}; });
  if (!S.tools) { S.tools = {}; S.unlocked.forEach(id => (D.drinks[id].needs || []).forEach(t => { if (D.tools[t].stars <= shop().stars) S.tools[t] = true; })); }   // eski kayıt: açık tariflerin aletleri hediye if (!S.loans) { S.loans = []; if (S.debt > 0) { S.loanSeq = 1; S.loans.push({ id: 1, amount: Math.round(S.debt / (1 + D.economy.loanInterest)), owe: S.debt, rem: S.debt, day: S.day, due: (S.debtDue || S.day + D.economy.rentLoanDays) }); } } syncDebt(); if (!S.milkDay) S.milkDay = S.day;
  AUDIO.startMusic("game");
  $("#menu").style.display = "none"; $("#hud").style.display = "flex"; $("#hint").style.display = "block"; $("#icons").style.display = "flex";
  day = null; renderHUD(); renderBench();
  lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  if (!S.taught.includes("intro")) { S.taught.push("intro"); modal(`<h3>Yıldız Teyze</h3><p>${D.tutorial.intro}</p>`, [{ label: "Devral", pri: true }]); }
  save();
}
// ---------- §12 Grafik: ekran kartı algılama + kalite ----------
const GFX_KEY = "cekirdek_gfx";
function detectGPU() {
  try { const c = document.createElement("canvas"), gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) return { ok: false, name: "" };
    const ext = gl.getExtension("WEBGL_debug_renderer_info"), name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || "");
    const sw = /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(name);
    const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
    return { ok: !sw, name };
  } catch (e) { return { ok: false, name: "" }; }
}
const GPU = detectGPU();
let GFX = { gpu: GPU.ok, quality: GPU.ok ? "high" : "medium" };
try { const g = JSON.parse(localStorage.getItem(GFX_KEY)); if (g) Object.assign(GFX, g); } catch (e) {}
if (!GPU.ok) GFX.gpu = false;
const saveGfx = () => { try { localStorage.setItem(GFX_KEY, JSON.stringify(GFX)); } catch (e) {} };
SCENE.setQuality(GFX.quality); CLOSEUP.setQuality(GFX.quality, GFX.gpu);
SCENE.init($("#scene"), GFX.gpu);
$("#scene").addEventListener("pointerdown", e => { if (!day) return; const r = e.currentTarget.getBoundingClientRect(); const id = SCENE.hitTest(e.clientX - r.left, e.clientY - r.top); if (id) takeOrder(id); });
$("#openDay").onclick = () => { if (!day && !mandatoryRestock) startDay(); };
$("#icBook").onclick = () => { AUDIO.sfx("open"); renderBook(); openOverlay("#ovBook"); };
$("#icShop").onclick = () => { AUDIO.sfx("open"); renderSupply(); openOverlay("#ovShop"); };
$("#icPrice").onclick = () => { AUDIO.sfx("open"); renderPrices(); openOverlay("#ovPrice"); };
$("#icSettings").onclick = () => { AUDIO.sfx("open"); renderSettings(); openOverlay("#ovSettings"); };
["ovBook", "ovShop", "ovModal", "ovSettings"].forEach(id => $("#" + id).addEventListener("click", e => { if (e.target.id === id) closeOverlay("#" + id); }));
$("#btnNew").onclick = () => { AUDIO.sfx("open"); renderSlots("new"); };
$("#btnContinue").onclick = () => { AUDIO.sfx("open"); renderSlots("load"); };
$("#btnExport").onclick = () => { let best = null; for (let i = 1; i <= SLOTS; i++) { const x = loadSlot(i); if (x && (!best || (x.savedAt || 0) > (best.savedAt || 0))) best = x; }
  if (!best) return toast("Kayıt yok"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(best)], { type: "application/json" })); a.download = "coffebean-kayit.json"; a.click(); };
$("#btnImport").onclick = () => $("#fileImport").click();
$("#fileImport").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const x = JSON.parse(t); if (!x.unlocked) throw 0; renderSlots("import", x); } catch (er) { toast("Geçersiz kayıt dosyası"); } }); e.target.value = ""; };
$("#btnSettings").onclick = () => { AUDIO.startMusic("menu"); AUDIO.sfx("open"); renderSettings(); openOverlay("#ovSettings"); };
// §11 ana menü müziği: tarayıcının izin verdiği ilk dokunuşta başlar
document.addEventListener("pointerdown", () => { if (!S) AUDIO.startMusic("menu"); }, { once: true });
$("#icMenu").onclick = () => { AUDIO.sfx("open"); renderGameMenu(); openOverlay("#ovGameMenu"); };
["ovSlots", "ovGameMenu", "ovHub", "ovPrice", "ovLoan", "ovGoal"].forEach(id => $("#" + id).addEventListener("click", e => { if (e.target.id === id) closeOverlay("#" + id); }));
window.addEventListener("resize", () => { if (S) renderScene(0); else idleLoop(); });
function refreshMenu() { try { $("#btnContinue").disabled = !anySlot(); } catch (e) {} $("#menuVer").textContent = "Sürüm " + D.version; }
refreshMenu();
// Menü açıkken de sahne boş dükkan olarak arkada dönsün
function idleLoop() { if (!S) SCENE.draw({ customers: [], orders: [], t: 0.35, level: 1, slots: 1 }, 0); }   // §12 performans: menüde sahne bir kez çizilir
idleLoop();
window.CEKIRDEK = { state: () => S, day: () => day };   // hata ayıklama
})();
