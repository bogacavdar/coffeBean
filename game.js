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
const DF = () => D.difficulty[(S && S.diff) || "normal"] || D.difficulty.normal;     // §12 zorluk
const SP = x => Math.max(1, Math.round(x * DF().cost));                             // §12 tedarik fiyatı zorluğa göre
function newState(diff = "normal") {
  return {
    diff, day: 1, money: (D.difficulty[diff] || D.difficulty.normal).startMoney, rep: 0, xp: 0, shopLevel: 0,
    perfect: { espresso: 0 }, served: {}, unlocked: ["espresso"], taught: [],
    beans: { brazil: { kg: 1, boughtDay: 1 } }, bean: "brazil", milk: 0,
    equipment: {}, prices: {}, tipsLearned: [], regulars: {}, log: [],
    debt: 0, staff: {}, decor: {}, streak: 0, milkDay: 1, traffic: {}, tools: {}, market: {}, loans: [], cups: Object.assign({}, D.startCups), extras: Object.fromEntries(Object.keys(D.extras).map(k => [k, D.extrasStart]))
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
function unitCost(id) { const d = D.drinks[id]; return D.economy.beanPerCup * D.beans.brazil.price + (d.steps.includes("milk") ? D.economy.milkPerCup * D.economy.milkPrice : 0) + d.cost; }
const defaultPrice = id => Math.max(1, Math.round(unitCost(id) * D.pricing.markup + shop().rent / (7 * dayCap())));
// §8 oyuncu fiyatı lira olarak elle ayarlar (S.priceTL); eski kayıtlardaki oran (S.prices) yedek
const priceOf = id => Math.max(1, Math.round((S.priceTL && S.priceTL[id]) || defaultPrice(id) * (S.prices[id] || 1)));
const priceRatio = id => priceOf(id) / defaultPrice(id);
const marketIdx = id => (S.market && S.market[id]) || 1;
const fairPrice = id => defaultPrice(id) * marketIdx(id);
function rollReaction(id, size) {                                   // §7/§8 öndeki müşteri sipariş anında fiyata tepki verir
  const d = sizePrice(id, size) / (fairPrice(id) * SZ(size).price) - 1, P = D.pricing, p = x => Math.min(1, (x - P.neutral) / (P.all - P.neutral));
  if (d > P.neutral && Math.random() < p(d)) return "expensive";
  if (d < -P.neutral && Math.random() < p(-d)) return "cheap";
  return "ok";
}
function beanQualityMod() {                                   // §6 tazelik: 7 gün sonra günde %5
  const b = S.beans[S.bean]; if (!b) return -100;
  const age = S.day - b.boughtDay; const stale = Math.max(0, age - 7) * 5;
  return D.beans[S.bean].qualityMod - stale;
}
// §7/§8 boyutlar ve bardaklar
const SZ = k => D.sizes[k || "single"];
const sizedName = (id, size) => { const sz = SZ(size); return (sz.say ? sz.say + " " : "") + D.drinks[id].name.toLocaleLowerCase("tr"); };
const cap1 = t => t.charAt(0).toLocaleUpperCase("tr") + t.slice(1);
const sizePrice = (id, size) => Math.max(1, Math.round(priceOf(id) * SZ(size).price));   // §8 fiyat tek/küçük boydan; double ×1,8 (+%80), orta ×1,25, büyük ×1,6
const sizeCost = (id, size) => { const d = D.drinks[id], z = SZ(size); return D.economy.beanPerCup * z.bean * D.beans.brazil.price + (d.steps.includes("milk") ? D.economy.milkPerCup * z.milk * D.economy.milkPrice : 0) + d.cost; };
const cupsKnown = () => { const set = new Set(); S.unlocked.forEach(id => (D.drinks[id].sizes || ["single"]).forEach(z => set.add(SZ(z).cup))); return [...set]; };   // §7 açılan tariflerin tüm bardakları (listede görünür)
const cupsNeeded = () => { const set = new Set(); S.unlocked.filter(hasTools).forEach(id => (D.drinks[id].sizes || ["single"]).forEach(z => set.add(SZ(z).cup))); return [...set]; };
const needsMilk = () => S.unlocked.some(id => hasTools(id) && D.drinks[id].steps.includes("milk"));
const restockOk = () => beanKg("brazil") >= D.economy.minBeans && (!needsMilk() || (S.milk || 0) >= D.economy.minMilk) && cupsNeeded().every(k => (S.cups[k] || 0) >= D.cupMin);
// §8 otomasyon: sahip olunan ekipmanların otomatik yaptığı adımlar
function autoSteps() { const set = new Set(); Object.keys(S.equipment).forEach(k => { if (S.equipment[k] && D.equipment[k] && D.equipment[k].auto) D.equipment[k].auto.forEach(x => set.add(x)); }); return set; }
// §5 latte art adımı 3★ dükkanda latte/cappuccino'ya eklenir
function stepsFor(id) { const d = D.drinks[id]; const st = d.steps.slice(); if (d.art && shop().stars >= 3) st.splice(st.indexOf(st.includes("swirl") ? "swirl" : "milk") + 1, 0, "art"); return st; }
// §8 dekor dükkana özel: yalnızca bu dükkanın (stars) dekoru görünür ve etki eder
const activeDecor = () => { const o = {}; Object.keys(S.decor || {}).forEach(k => { if (S.decor[k] && D.decor[k] && (D.decor[k].stars || 1) === shop().stars) o[k] = true; }); return o; };
const decorMult = key => Object.keys(activeDecor()).reduce((m, k) => D.decor[k][key] ? m * D.decor[k][key] : m, 1);
const th = key => { const u = SCENE.thumb && SCENE.thumb(key); return u ? `<img class="thumb" src="${u}" alt="">` : ""; };   // §8 satın alma listelerinde ürün görseli
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
  $("#modalCard").innerHTML = '<div class="mtext">' + html + '</div><div class="row mrow"></div>';   // §11 metin kayar, düğmeler altta sabit
  const row = $("#modalCard").querySelector(".mrow");
  (buttons || [{ label: "Tamam" }]).forEach(b => {
    const el = document.createElement("button"); el.textContent = b.label; if (b.pri) el.className = "pri";
    el.onclick = () => { $("#ovModal").classList.remove("on"); b.fn && b.fn(); }; row.appendChild(el);
  });
  $("#ovModal").classList.add("on");
}
function renderHUD() {
  $("#hDay").textContent = weekday(S.day) + " · " + weekNo(S.day) + ". Hafta";
  const dr = daysToRent(S.day), rp = rentPaid(S.day); $("#hRent").textContent = rp ? "Kira ödendi ✓" : dr === 0 ? "Kira bugün: ₺" + shop().rent : "Kiraya " + dr + " gün";
  $("#hRent").classList.toggle("warn", !rp && dr <= 1);
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
  $("#hStars").textContent = "★".repeat(shop().stars) + "☆".repeat(D.shopLevels.length - shop().stars);
  const r = rank(); const next = D.ranks.find(x => x.xp > S.xp);
  $("#hRank").textContent = r.name + " · XP " + S.xp + (next ? "/" + next.xp : "");
  const milkTxt = needsMilk() ? ` · Süt ${(S.milk || 0).toFixed(1)}L` : "";
  $("#hStock").textContent = "Brezilya " + beanKg("brazil").toFixed(2) + "kg" + milkTxt;
  $("#shopBadge").style.display = !restockOk() ? "inline-block" : "none";
  $("#openDay").style.display = (!day && !dayFlow && !(S.day === 1 && !S.taught.includes("first"))) ? "" : "none";   // §11 ilk gün düğme yok
}

// ---------- Açılım (§3, §9) ----------
// §3 tarif açılımı: satılan toplam kahve sayısı (kümülatif artan eşikler) + gerekirse dükkan seviyesi
const totalSold = () => Object.values(S.served || {}).reduce((a, b) => a + b, 0);
// §6 çekirdek çeşitleri ve süt türleri
const beanOpen = id => { const b = D.beans[id]; return b && (b.unlock || 1) <= shop().stars && totalSold() >= (b.cups || 0); };
const openBeans = () => Object.keys(D.beans).filter(beanOpen);
const openMilks = () => Object.keys(D.milks).filter(k => (S.rep || 0) >= D.milks[k].rep || k === "cow");
const multiBeans = () => openBeans().length > 1, multiMilks = () => needsMilk() && openMilks().length > 1;
const beanKg = id => S.beans[id || "brazil"]?.kg || 0;
const milkL = k => (!k || k === "cow") ? (S.milk || 0) : ((S.milkAlt || {})[k] || 0);
function useBean(id, kg) { id = id || "brazil"; if (!S.beans[id]) S.beans[id] = { kg: 0, boughtDay: S.day }; S.beans[id].kg = Math.max(0, S.beans[id].kg - kg); }
function useMilk(k, l) { if (!k || k === "cow") S.milk = Math.max(0, (S.milk || 0) - l); else { S.milkAlt = S.milkAlt || {}; S.milkAlt[k] = Math.max(0, (S.milkAlt[k] || 0) - l); } }
const isMilky = id => { const d = D.drinks[id]; return d.steps.includes("milk") || d.steps.includes("coldmilk") || !!d.milkUse; };
// §3 özel malzemeler (şurup, sos, krema, dondurma, tonik…)
const PUMPS = { single: 1, double: 2, S: 2, M: 3, L: 4, iS: 2, iM: 3, iL: 4, tk: 1, affo1: 1, affo2: 1 };
const specAmt = (amt, size) => amt === "pump" ? (PUMPS[size] || 2) : amt === "scoop" ? (SZ(size).scoops || 1) : amt === "cb" ? (size === "iL" ? 2 : 1) : amt;
const specNeeds = (drink, size) => { const m = {}; (D.drinks[drink].uses || []).forEach(([k, a]) => { m[k] = (m[k] || 0) + specAmt(a, size); }); return m; };
const specStock = k => (S.syr || {})[k] || 0;
function useSpecials(drink, size) { S.syr = S.syr || {}; Object.entries(specNeeds(drink, size)).forEach(([k, n]) => { S.syr[k] = Math.max(0, (S.syr[k] || 0) - n); }); }
const specialOpen = k => { const sp = D.specials[k]; return (sp.tool && S.tools[sp.tool]) || S.unlocked.some(id => (D.drinks[id].uses || []).some(([x]) => x === k)); };
function orderName(x) {                                                           // "Etiyopya çekirdeğiyle double espresso, yulaf sütüyle"
  let t = sizedName(x.drink, x.size);
  if (x.sugar) t = D.sugarLevels[x.sugar].say + " " + t;
  if (x.bean && x.bean !== "brazil") t = D.beans[x.bean].name + " çekirdeğiyle " + t;
  if (x.milk && x.milk !== "cow") t += ", " + D.milks[x.milk].with;
  return t;
}
const orderPrice = x => Math.max(1, Math.round(sizePrice(x.drink, x.size) * (D.beans[x.bean || "brazil"].mult || 1)) + (x.milk ? D.milks[x.milk].extra : 0));
function checkBeanMilkUnlocks() {                                                 // yeni çekirdek / süt açılınca haber ver
  S.beansSeen = S.beansSeen || ["brazil"]; S.milksSeen = S.milksSeen || ["cow"];
  const nb = openBeans().filter(id => !S.beansSeen.includes(id)), nm = needsMilk() ? openMilks().filter(k => !S.milksSeen.includes(k)) : [];
  if (!nb.length && !nm.length) return; nb.forEach(id => S.beansSeen.push(id)); nm.forEach(k => S.milksSeen.push(k)); AUDIO.sfx("unlock");
  modal(`<h3>${nb.length ? "Yeni çekirdek" + (nm.length ? " ve süt" : "") : "Yeni süt"}</h3>` + nb.map(id => `<p><b>☕ ${D.beans[id].name}</b> · satış fiyatı ×${D.beans[id].mult.toFixed(2)}<br><span class="muted">${D.beans[id].notes}</span></p>`).join("") +
    nm.map(k => `<p><b>🥛 ${D.milks[k].name}</b> · siparişe +₺${D.milks[k].extra}</p>`).join("") + `<p class="muted">Müşteriler artık bunları siparişlerinde isteyecek. Tedarik'ten stok almayı unutma; yoksa "… bile yok!" deyip giderler.</p>`);
}
function nextRecipe() { return Object.keys(D.drinks).filter(id => !S.unlocked.includes(id)).sort((a, b) => D.drinks[a].unlockCups - D.drinks[b].unlockCups)[0]; }
function canUnlock(id) {
  const d = D.drinks[id];
  return totalSold() >= d.unlockCups && shop().stars >= (d.shop || 1) && !S.unlocked.includes(id);   // §9 dükkan büyüklüğü kilidi
}
function checkUnlocks() {
  const fresh = Object.keys(D.drinks).filter(canUnlock);
  if (!fresh.length) return checkBeanMilkUnlocks();
  const cupsBefore = new Set(cupsKnown());
  fresh.forEach(id => { S.unlocked.push(id); (S.unlockDay = S.unlockDay || {})[id] = S.day; S.perfect[id] = S.perfect[id] || 0; S.log.push("Gün " + S.day + ": " + D.drinks[id].name + " açıldı"); });
  const giftCups = cupsKnown().filter(k => !cupsBefore.has(k));                  // §7 yeni bardak türü Tedarik listesine eklenir (hediye yok)
  const milkNew = fresh.some(id => D.drinks[id].steps.includes("milk")) && !S.taught.includes("milk");
  if (milkNew) S.taught.push("milk");
  AUDIO.sfx("unlock");
  modal(`<h3>Yeni tarif${fresh.length > 1 ? "ler" : ""}: ${fresh.map(id => D.drinks[id].name).join(", ")}</h3><p class="muted">Yıldız Teyze'nin defterinden</p>` +
    fresh.map(id => { const miss = (D.drinks[id].needs || []).filter(t => !S.tools[t]);
      return `<div class="recipe">${drinkIcon(id, false)}<div><b>${D.drinks[id].name}</b><br>${D.drinks[id].card}${miss.length ? `<div class="req" style="margin-top:6px">Menüye girmesi için gerekli: ${miss.map(t => D.tools[t].name).join(", ")} (gün sonunda Dükkan › Aletler & Makineler)</div>` : ""}</div></div>`; }).join("") +
    (giftCups.length ? `<div class="req" style="margin-top:8px">🥤 Yeni bardaklar Tedarik listesine eklendi: ${giftCups.map(k => D.cups[k].name.toLocaleLowerCase("tr")).join(", ")}. Gün sonunda Tedarik'ten satın al.</div>` : "") +
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
  endCtx = null;
  setTimeout(flushNewFx, 200);
  const n = dayCap(); checkUnlocks();
  const firstTime = S.day === 1 && !S.taught.includes("first");
  day = { t: 0, toSpawn: n, spawnEvery: arrivalEvery(), nextSpawn: firstTime ? 99999 : 1, customers: [], orders: [], active: 0,
          stats: { served: 0, perfect: 0, income: 0, tips: 0, left: 0, bounced: 0, pricey: 0, repStart: S.rep }, id: 1, tutorialActive: false, asst: null };
  if (!firstTime) day.task = makeTask();
  if (firstTime) {
    day.tutorialActive = true;
    day.customers.push({ id: day.id++, type: "nejla", name: "Yıldız Teyze", drink: "espresso", size: "single", bean: "brazil", milk: null, patience: Infinity, patienceMax: 0,
      pos: Object.assign({}, SCENE.queueSlot(0)), target: null, moving: false, say: "Hazırsan başlayabiliriz evladım, bana dokun." });   // §10 Yıldız Teyze zaten tezgâhın önünde
    toast(D.tutorial.first);
  }
  AUDIO.sfx("shopOpen");                                                            // §11 açılış sesi
  layout(); renderHUD(); renderBench(); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
}
function orderLine(c) {                                            // §7 rastgele sipariş cümlesi (genel + tipe özel)
  const L = D.orderLines, pool = L.any.concat(L[c.type] || [], L[c.type] || []), t = pick(pool);
  return cap1(t.replace("{d}", orderName(c)));
}
function layout() {
  if (!day) return; let i = 0;
  day.customers.forEach(c => {
    if (c.leaving) { c.target = { x: SCENE.DOOR.x, y: SCENE.DOOR.y }; return; }
    if (c.ordered) { c.target = c.byAssistant ? { x: 3.5, y: 1.0 } : { x: 2.6, y: 1.0 }; return; }
    const free = day.orders.length < slots(), atDesk = c.pos && Math.hypot(c.pos.x - SCENE.queueSlot(0).x, c.pos.y - SCENE.queueSlot(0).y) < .15;
    if (i === 0 && !c.say && free && atDesk) c.say = c.type === "nejla" ? "Hazırsan başlayabiliriz evladım, bana dokun." : orderLine(c);   // §7 kasaya varıp makine boşalınca söyler
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
      day.orders.slice().forEach(o => { const c = o.cust; if (!c.patienceMax || c.leaving) return; c.patience -= dt; if (c.patience <= 0) leave(c, true); });   // §7 hazırlarken de sabır azalır; biterse sipariş iptal
      updOrderBars();
      queueOf().filter(c => c.patienceMax && c.patience <= 0).forEach(leave);
    }
    day.orders.forEach((o, i) => { if (o.selecting || o.hidden) return; if (o.autoRun) autoTick(o, dt, i === day.active); else if (i === day.active) stepTick(o, dt); });
    if (S.staff && S.staff.assistant && !day.tutorialActive) assistantTick(dt);
    layout();
  }
  // performans: dükkan kapalıyken ya da bir kart/panel açıkken arka sahne 3 karede bir çizilir
  if ((!day || document.querySelector(".overlay.on") || $("#sheet").classList.contains("on")) && (sceneSkip = (sceneSkip + 1) % 3)) sceneAcc += dt; else { renderScene(dt + sceneAcc); sceneAcc = 0; }
  if (day && day.toSpawn === 0 && queueOf().length === 0 && day.orders.length === 0 && !day.asst) return endDay();
  raf = requestAnimationFrame(tick);
}
let lastHint = "", lastClock = "", sceneSkip = 0, sceneAcc = 0;
// §8 satın alınır alınmaz dükkanda görünsün: panel kısa süre kapanır, yeni ürün "✨ Yeni!" efektiyle görünür
let pendingNew = [];
function showPurchase(key, name) {                                               // §8 panel kapanmaz: sahne arkada güncellenir, gün başlayınca "✨ Yeni!" efekti
  const visual = !!(SCENE.itemPos && SCENE.itemPos(key));                      // yalnız dükkanda görünen ürünlerde "Yeni"
  if (visual) { pendingNew.push(key); toast(name + " dükkana yerleşti ✨"); } else toast(name + " alındı"); renderScene(0);
}
function flushNewFx() { pendingNew.forEach((k, i) => SCENE.highlight(k, .3 + i * 1.6)); pendingNew = []; }   // ürünün yerinde parlayan halka + ok, sırayla
function renderScene(dt) {
  if (day) day.customers = day.customers.filter(c => !c.gone);
  SCENE.draw({ customers: day ? day.customers : [], orders: day ? day.orders : [], t: day ? day.t / DAY_SECONDS : 0.3, level: shop().stars, slots: slots(),
    decor: activeDecor(), equipment: S.equipment || {}, tools: S.tools || {}, traffic: tr(), cups: S.cups || {}, extras: S.extras || {}, assistant: !!(S.staff && S.staff.assistant), asstBusy: !!(day && day.asst), superAuto: !!S.equipment.superAuto,
    baristaBusy: !!(day && day.orders.length) }, dt || 0);
  const hint = !day ? "Dükkan kapalı. Hazır olunca aç." : `Sıra ${queueOf().length}/${shop().maxQueue} · ` + (queueOf().length ? "Sırada bekleyen müşteriye dokun" : day.orders.length ? "Sipariş hazırlanıyor" : day.toSpawn > 0 ? "Müşteri bekleniyor…" : "Bugünkü müşteriler bitti");
  if (hint !== lastHint) { lastHint = hint; $("#hint").textContent = hint; }                 // performans: DOM'a yalnız değişince yaz
  if (day) { const ck = clockStr(day.t / DAY_SECONDS); if (ck !== lastClock) { lastClock = ck; $("#hClock").textContent = ck; } }
}
function spawnCustomer() {
  // §7 prototip müşteri tipleri: isim yok, yalnızca tip etiketi; tahammül ve bahşiş tipe göre değişir
  const type = pick(Object.keys(D.customers));
  const ct = D.customers[type];
  // §7 herkes her açık kahveyi isteyebilir: aleti olan ve özel malzemesi stokta olan; yeni açılan 3 gün daha sık istenir
  const menu = S.unlocked.filter(id => hasTools(id) && (D.drinks[id].uses || []).every(([k]) => specStock(k) > 0));
  const fresh = menu.filter(id => S.day - ((S.unlockDay || {})[id] ?? -99) < 3);
  const drink = menu.length ? pick(fresh.length && Math.random() < 0.35 ? fresh : menu) : "espresso";
  if (ct.priceSens >= 1 && priceRatio(drink) > 1.2 && Math.random() < 0.6) { day.stats.left++; return; }   // §8 fiyata duyarlı tip gelmez
  const pat = Math.round(ct.patience * decorMult("patience") * DF().patience);    // §12 zorluk: sabır                // §8 pikap: sabır ×1,15
  const size = pick(D.drinks[drink].sizes || ["single"]);                          // §7 müşteri boyu da söyler
  const ob = openBeans(), bean = ob.length > 1 && Math.random() >= D.houseBeanShare ? pick(ob.filter(b => b !== "brazil")) : "brazil";   // §6 çekirdek de söyler
  const om = openMilks(), milk = isMilky(drink) ? (om.length > 1 && Math.random() >= D.cowShare ? pick(om.filter(k => k !== "cow")) : "cow") : null;
  const sugar = D.drinks[drink].sugar ? pick(Object.keys(D.sugarLevels)) : null;   // §3 Türk kahvesi şeker derecesi
  day.customers.push({ id: day.id++, type, name: ct.name, drink, size, bean, milk, sugar, patience: pat, patienceMax: pat,
    pos: { x: SCENE.DOOR.x, y: SCENE.DOOR.y }, target: null, moving: false });
}
function leave(c, cancelled) {
  c.leaving = true; c.angry = true; c.ordered = false;
  const act = day.orders[day.active], had = day.orders.some(o => o.cust === c);     // §11 yanıp sönme yok: sıradaki biri giderse hazırlanan ekran bozulmaz
  if (had) { day.orders = day.orders.filter(o => o.cust !== c); day.active = Math.max(0, day.orders.indexOf(act)); } renderOrders();
  S.rep = Math.max(0, S.rep - 5); day.stats.left++; S.streak = 0;            // §7 kaçan müşteri seriyi sıfırlar
  if (day.task && day.task.kind === "noLeave" && !day.task.done) { day.task.failed = true; }
  SCENE.addFx(c, "−5", "#b5533c"); if (had && act && act.cust === c) AUDIO.stopLoops(); AUDIO.sfx("sad");
  if (cancelled) { c.say = "Bu kadar beklenmez! İptal!"; c.sayUntil = performance.now() + 2600; }
  toast(c.name + (cancelled ? ": sipariş çok uzadı, iptal etti (−5 itibar)" : " beklemekten vazgeçti (−5 itibar)")); renderOrders(); if (had) renderBench(); renderHUD();
}
function takeOrder(id) {
  const c = day.customers.find(x => x.id === id && !x.ordered && !x.leaving); if (!c) return;
  if (c !== queueOf()[0]) { toast("Önce sıranın en önündeki müşteri"); return; }   // §7 yalnızca öndeki müşteri sipariş verir
  if (!c.say && c.type !== "nejla" && day.orders.length < slots()) { toast("Müşteri kasaya gelsin, siparişini söylesin"); return; }
  if (day.orders.length >= slots()) { toast(slots() === 1 ? "Makine dolu: önce eldeki siparişi bitir" : "İki grup kafası da dolu"); return; }
  const sz = SZ(c.size);
  if ((S.cups[sz.cup] || 0) <= 0 && c.type !== "nejla") {                      // §7 istenen boyun bardağı yoksa kızıp gider
    c.say = cap1(pick(D.noCupLines).replace("{s}", sz.say || "espresso").replace("{S}", cap1(sz.say || "espresso"))); c.sayUntil = performance.now() + 2800;
    c.leaving = true; c.angry = true; S.rep = Math.max(0, S.rep - 3); day.stats.nocup = (day.stats.nocup || 0) + 1; S.streak = 0;
    SCENE.addFx(c, "−3", "#b5533c"); AUDIO.sfx("sad"); layout(); renderHUD(); return; }
  const outOf = (beanKg(c.bean) < D.economy.beanPerCup * sz.bean - 1e-9) ? D.beans[c.bean || "brazil"].name + " çekirdeği" : (c.milk && milkL(c.milk) < D.economy.milkPerCup * sz.milk - 1e-9) ? D.milks[c.milk].name : (c.sugar && (S.extras.sugar || 0) < D.sugarLevels[c.sugar].n) ? "Şeker" : (Object.entries(specNeeds(c.drink, c.size)).find(([k, n]) => specStock(k) < n) || [])[0] ? D.specials[Object.entries(specNeeds(c.drink, c.size)).find(([k, n]) => specStock(k) < n)[0]].name : null;
  if (outOf && c.type !== "nejla") {                                               // §6 istenen çekirdek/süt yok: "X bile yok!" deyip gider
    const x = outOf.toLocaleLowerCase("tr"); c.say = cap1(pick(D.stockOutLines).replace("{X}", cap1(outOf)).replace("{x}", x)); c.sayUntil = performance.now() + 2800;
    c.leaving = true; c.angry = true; S.rep = Math.max(0, S.rep - 3); day.stats.nostock = (day.stats.nostock || 0) + 1; S.streak = 0;
    SCENE.addFx(c, "−3", "#b5533c"); AUDIO.sfx("sad"); layout(); renderHUD(); return; }
  if (c.type !== "nejla") {                                       // §7/§8 sipariş anında fiyat tepkisi
    const r = rollReaction(c.drink, c.size);
    if (r === "expensive") { c.say = "Çok pahalı! Almıyorum."; c.sayUntil = performance.now() + 2600; c.leaving = true; day.stats.pricey++; AUDIO.sfx("sad"); SCENE.addFx(c, "Pahalı!", "#e9c46a"); layout(); renderHUD(); return; }
    if (r === "cheap") { c.say = "Ne kadar ucuz!"; c.sayUntil = performance.now() + 1800; SCENE.addFx(c, "Ucuz!", "#9cc77a"); } else c.say = null;
  }
  c.ordered = true;
  if (c.patienceMax) { c.patience += c.patienceMax * 0.5; c.patienceTop = c.patience; }   // §7 sipariş başlayınca sabır +%50
  const o = { cust: c, drink: c.drink, size: c.size, i: 0, scores: {}, phase: "ready", v: 0, dir: 1, start: null, tutorial: c.type === "nejla", selecting: true, sel: { bean: multiBeans() ? null : "brazil", drink: null, size: null, milk: null, sugar: null }, all: [], steps: [], auto: new Set() };
  if (o.tutorial) prepareOrder(o, "espresso", "single", "brazil", null, null);                         // §7 öğreticide seçim kendiliğinden
  day.orders.push(o); day.active = day.orders.length - 1; renderOrders();
  layout(); renderBench();
}

// §7 seçim adımı: tarif + boy seçilir, seçilen bardak harcanır, adımlar boya göre kurulur
function prepareOrder(o, drink, size, bean, milk, sugar) {
  bean = bean || "brazil"; milk = isMilky(drink) ? (milk || "cow") : null; sugar = D.drinks[drink].sugar ? (sugar || "sade") : null;
  o.drink = drink; o.size = size; o.bean = bean; o.milk = milk; o.sugar = sugar; o.selecting = false;
  o.mismatch = drink !== o.cust.drink || size !== o.cust.size || bean !== (o.cust.bean || "brazil") || (milk || null) !== (o.cust.milk || null) || (sugar || null) !== (o.cust.sugar || null);   // §6 çekirdek ve süt de doğru olmalı
  S.cups[SZ(size).cup] = Math.max(0, (S.cups[SZ(size).cup] || 0) - 1);
  const all = stepsFor(drink), auto = o.tutorial ? new Set() : autoSteps();      // öğretici her adımı elle öğretir
  o.all = all; o.auto = auto; o.steps = all.filter(st => !auto.has(st)); o.i = 0; o.scores = {}; o.phase = "ready"; o.v = 0; o.served = false;
  all.forEach(st => { if (auto.has(st)) o.scores[st] = D.economy.autoScore; });   // §8 otomatik adım sabit 85
  o.autoRun = o.steps.length === 0;                                               // her adım otomatik: makine kendisi hazırlar
  save(); renderOrders();
}
function renderSelect(o, tabs) {                                                  // §6/§7 sıra: çekirdek → tarif → boy → süt
  const menu = S.unlocked.filter(hasTools), sel = o.sel, sizes = sel.drink ? (D.drinks[sel.drink].sizes || ["single"]) : [];
  const showBean = multiBeans(), showMilk = sel.drink && isMilky(sel.drink) && multiMilks(), showSugar = sel.drink && D.drinks[sel.drink].sugar;
  const ready = sel.bean && sel.drink && sel.size && sizes.includes(sel.size) && (!showMilk || sel.milk) && (!showSugar || sel.sugar);
  const box = (title, inner) => `<div class="box" style="text-align:left"><h4>${title}</h4><div class="row" style="justify-content:flex-start;margin-top:4px">${inner}</div></div>`;
  $("#sheetBody").innerHTML = `${tabs}<h3>Siparişi hazırla</h3>
    <p class="muted" style="margin:2px 0 6px">Siparişi sağ üstteki karttan oku. ${showBean ? "Önce çekirdeği, sonra tarifi, boyu" : "Önce tarifi, sonra boyu"}${showMilk ? " ve sütü" : ""} seç. Yanlış seçersen müşteri almaz.</p>
    ${showBean ? box("1. Çekirdek", openBeans().map(id => { const kg = beanKg(id); return `<button data-sb="${id}" class="${sel.bean === id ? "pri" : ""}" ${kg > 0 ? "" : "disabled"}>${D.beans[id].name}<br><span style="font-size:11px">${kg.toFixed(2)} kg</span></button>`; }).join("")) : ""}
    ${box((showBean ? "2. " : "") + "Tarif", menu.map(id => `<button data-sd="${id}" class="${sel.drink === id ? "pri" : ""}">${D.drinks[id].name}</button>`).join(""))}
    ${box((showBean ? "3. " : "") + "Boy / bardak", (sizes.length ? "" : '<span class="muted">Önce tarifi seç</span>') + sizes.map(z => { const sz = SZ(z), n = S.cups[sz.cup] || 0;
      return `<button data-sz="${z}" class="${sel.size === z ? "pri" : ""}" ${n > 0 ? "" : "disabled"}>${sz.label}<br><span style="font-size:11px">${D.cups[sz.cup].name} · ${n} adet</span></button>`; }).join(""))}
    ${showMilk ? box((showBean ? "4. " : "") + "Süt", openMilks().map(k => { const l = milkL(k); return `<button data-sm="${k}" class="${sel.milk === k ? "pri" : ""}" ${l > 0 ? "" : "disabled"}>${D.milks[k].name}<br><span style="font-size:11px">${l.toFixed(1)} L</span></button>`; }).join("")) : ""}
    ${showSugar ? box("Şeker", Object.entries(D.sugarLevels).map(([k, z]) => `<button data-sg="${k}" class="${sel.sugar === k ? "pri" : ""}" ${(S.extras.sugar || 0) >= z.n ? "" : "disabled"}>${z.label}<br><span style="font-size:11px">${z.n} şeker</span></button>`).join("")) : ""}
    <button class="hold big pri" id="selGo" ${ready ? "" : "disabled"}>Hazırlamaya başla</button>`;
  $("#sheet").classList.add("on");
  $("#sheetBody").querySelectorAll("[data-sg]").forEach(b => b.onclick = () => { sel.sugar = b.dataset.sg; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-sb]").forEach(b => b.onclick = () => { sel.bean = b.dataset.sb; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-sd]").forEach(b => b.onclick = () => { sel.drink = b.dataset.sd; if (!(D.drinks[sel.drink].sizes || ["single"]).includes(sel.size)) sel.size = null; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-sz]").forEach(b => b.onclick = () => { sel.size = b.dataset.sz; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-sm]").forEach(b => b.onclick = () => { sel.milk = b.dataset.sm; AUDIO.sfx("click"); renderBench(); });
  $("#selGo").onclick = () => { if (!ready || (S.cups[SZ(sel.size).cup] || 0) <= 0) return; prepareOrder(o, sel.drink, sel.size, sel.bean, showMilk ? sel.milk : "cow", showSugar ? sel.sugar : null); AUDIO.sfx("click"); renderBench(); };
}
// §7 sağ üstte sipariş kartı
function renderOrders() {
  const el = $("#orders"); if (!el) return;
  const list = day ? day.orders : [];
  if (!list.length) { el.style.display = "none"; return; }
  el.style.display = "block";
  el.innerHTML = `<div class="ohead">Siparişler</div>` + list.map((o, i) => `<div class="ord${o.mismatch ? " bad" : ""}"><div class="oname">${o.cust.name}</div>
    <div class="odrink"><b>${D.drinks[o.cust.drink].name}</b><span class="osize">${SZ(o.cust.size).label}</span></div>
    ${multiBeans() || (o.cust.milk && multiMilks()) ? `<div class="otags">${multiBeans() ? `<span class="otag bean">☕ ${D.beans[o.cust.bean || "brazil"].name}</span>` : ""}${o.cust.milk && multiMilks() ? `<span class="otag milk">🥛 ${D.milks[o.cust.milk].short}</span>` : ""}</div>` : ""}
    ${o.cust.sugar ? `<div class="otags"><span class="otag">🍬 ${D.sugarLevels[o.cust.sugar].label}</span></div>` : ""}
    ${o.selecting ? '<div class="ostate">seçimleri yap</div>' : o.mismatch ? '<div class="ostate">⚠ yanlış seçim</div>' : ""}
    ${o.cust.patienceMax ? `<div class="opat"><i id="opat${i}"></i></div>` : ""}</div>`).join("") + queueHTML();
  updOrderBars();
}
// §7 kartta sırada bekleyenler: yalnız ad + sabır (sipariş görünmez)
let queueSig = "";
function queueHTML() { const q = queueOf().filter(c => c.patienceMax); queueSig = q.map(c => c.id).join(",");
  return q.length ? `<div class="oqhead">Sırada bekleyenler</div>` + q.map(c => `<div class="oq"><span>${c.name}</span><div class="opat"><i id="qpat${c.id}"></i></div></div>`).join("") : ""; }
function updOrderBars() {                                                         // §7 kartta kalan sabır çubuğu
  if (!day) return;
  if (day.orders.length && queueOf().filter(c => c.patienceMax).map(c => c.id).join(",") !== queueSig) return renderOrders();   // sıra değişti: kartı yenile
  queueOf().forEach(c => { const b = document.getElementById("qpat" + c.id); if (!b || !c.patienceMax) return; const p = clamp(c.patience / c.patienceMax, 0, 1); b.style.width = (p * 100).toFixed(1) + "%"; b.style.background = p < .3 ? "#b5533c" : p < .6 ? "#e0a93a" : "#5f9a4b"; }); day.orders.forEach((o, i) => { const b = document.getElementById("opat" + i), c = o.cust; if (!b || !c.patienceMax) return;
    const p = clamp(c.patience / (c.patienceTop || c.patienceMax * 1.5), 0, 1); b.style.width = (p * 100).toFixed(1) + "%"; b.style.background = p < .3 ? "#b5533c" : p < .6 ? "#e0a93a" : "#5f9a4b"; });
}

// ---------- Mini oyunlar (§4) ----------
function scoreFrom(val, target, tolerance) { const d = Math.abs(val - target) / tolerance; return Math.round(clamp(100 - d * 40, 0, 100)); }
function stepTick(o, dt) {                                  // §4 renkli hedef çubuğu: ibre hareketi
  const s = o.steps[o.i]; if (!s || !MG[s]) return; const c = MG[s];
  if (c.mode === "act") { if (o.holdTick && c.act === "hold") o.holdTick(dt); if ($("#closeup")) c.draw(o, o.v); return; }
  if (o.phase === "run" && o.tutorial && o.frozen) { setNeedle(o.v); if ($("#closeup")) c.draw(o, o.v); return; }   // §4 ilk sipariş: mükemmel noktada bekler
  const v0 = o.v;
  if (o.phase === "run") {
    if ((o.mode || c.mode) === "osc") { o.v += o.dir * c.speed * dt; if (o.v > 100) { o.v = 100; o.dir = -1; o.bounces = (o.bounces || 0) + 1; } if (o.v < 0) { o.v = 0; o.dir = 1; o.bounces = (o.bounces || 0) + 1; } }
    else { o.v += (typeof c.speed === "function" ? c.speed() : c.speed) * (o.spd || 1) * dt; if (o.v >= 100) { o.v = 100; stopZone(o, s); return; } }
    if (o.blond && !o.blond.done && !o.blond.warned && o.v > o.blond.t - o.z.k * 2.5) { o.blond.warned = true; const r = $("#zRes"); if (r) { r.className = "zres ok"; r.textContent = "Renk açılıyor! Koyu yeşilde akışı yumuşat 💧"; } }
    if (o.blond && !o.blond.done && o.v > o.blond.t + o.z.k) { o.blond.done = true; o.blond.score = 0; const r = $("#zRes"); if (r) { r.className = "zres miss"; r.textContent = "Renk açılmasını kaçırdın · 0"; } const b2 = $("#zB2"); if (b2) b2.disabled = true; }
    if (c.onTick) c.onTick(o);
    const mode = o.mode || c.mode;
    if (o.tutorial && o.phase === "run" && (mode !== "osc" || (o.bounces || 0) >= 2) && (v0 - o.tgt) * (o.v - o.tgt) <= 0) { o.v = o.tgt; o.frozen = true; if (s === "extract" || s === "milk") AUDIO.stopLoops();
      setTut(mode === "hold" ? D.tutorial.release : mode === "sweep" ? D.tutorial.stopNow : D.tutorial.pressNow);
      if (mode === "osc") { const b = $("#zB"); if (b) { b.disabled = false; b.classList.add("pulse"); } const r = $("#zRes"); if (r) { r.className = "zres perfect"; r.style.fontSize = "30px"; r.textContent = "Tam şimdi!"; } AUDIO.sfx("click"); } }   // §10 1–2 tur sonra yeşilde sabitlenir
  }
  setNeedle(o.v); if ($("#closeup")) c.draw(o, o.v);
}
function finishStep(o, score, tipKey) {
  AUDIO.stopLoops();
  const s = o.steps[o.i]; o.scores[s] = score;
  if (score < 70 && tipKey && !S.tipsLearned.includes(tipKey)) { S.tipsLearned.push(tipKey); toast("Deftere yazıldı: " + D.tips[tipKey]); }
  const el = $("#mgScore"); if (el) { el.textContent = D.minigames[s].name + ": " + score; el.className = "score " + (score >= 80 ? "good" : score < 70 ? "bad" : ""); }
  o.i++; o.phase = "ready"; o.v = 0; o.dir = 1; o.start = null; o.air = false; o.tex = 0;
  if (o.i >= o.steps.length) setTimeout(() => { if (day && day.orders.includes(o)) { o.reviewing = true; renderBench(); } }, 450); else setTimeout(renderBench, 500);   // §4 değerlendirme ekranı
}
// Otomatik sipariş: makine kendi hazırlar (§8)
function autoTick(o, dt, visible) {
  if (o.served) return; o.v += dt;
  if (visible && $("#closeup")) { const t = o.v / 1.8 * 27.5; const g = SZ(o.size).dose * 2; CLOSEUP.extract(t, Math.min(g, t * g / 25), g, true, 27.5, 2.5); }
  if (o.v >= 1.8) { o.served = true; serve(o); }
}
// Yardımcı barista: kuyruktaki sütsüz siparişleri kendisi hazırlar (§8)
function assistantTick(dt) {
  const A = D.staff.assistant;
  if (!day.asst) {
    const c = queueOf().find(x => x.type !== "nejla" && !D.drinks[x.drink].steps.includes("milk"));
    if (!c || beanKg(c.bean) < D.economy.beanPerCup * SZ(c.size).bean || (S.cups[SZ(c.size).cup] || 0) <= 0) return;
    S.cups[SZ(c.size).cup]--;                                                     // §7 yardımcı da bardak harcar
    c.ordered = true; c.byAssistant = true; day.asst = { c, t: 0 }; SCENE.addFx(c, "Yardımcı hazırlıyor", "#f6efe3");
    return;
  }
  day.asst.t += dt;
  if (day.asst.t >= A.prepTime) { const c = day.asst.c; day.asst = null; if (!c.leaving) serve({ cust: c, drink: c.drink, size: c.size, bean: c.bean, milk: c.milk, scores: { asst: A.score }, assist: true }); }
}
// §4 sipariş sonu: ortalama puan, etiket, rastgele müşteri yorumu
const orderQuality = o => { const v = Object.values(o.scores); return clamp(Math.round(v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)), 0, 100); };   // §4 kalite yalnızca renklerin ortalaması
const reviewOf = q => D.reviews.find(r => q >= r.min);
function cupCost(id, size, bean, milk) { const z = SZ(size); return { bean: bean || "brazil", milkType: milk || "cow", kg: +(D.economy.beanPerCup * z.bean).toFixed(3), milk: D.drinks[id].steps.includes("milk") ? +(D.economy.milkPerCup * z.milk).toFixed(2) : 0, cup: z.cup }; }
function renderReview(o, tabs) {
  const q = orderQuality(o), rv = reviewOf(q), d = D.drinks[o.drink], cc = cupCost(o.drink, o.size, o.bean, o.milk);
  const canRedo = beanKg(cc.bean) >= cc.kg * 2 && (!cc.milk || milkL(cc.milkType) >= cc.milk * 2 - 1e-9) && Object.values(S.cups).some(n => n > 0);
  const steps = `<div class="steps">${o.all.map(st => `<span class="done">${o.auto.has(st) ? "⚙ " : ""}${D.minigames[st].name} ${o.scores[st]}</span>`).join("")}</div>`;
  $("#sheetBody").innerHTML = `${tabs}<h3>${o.cust.name} için ${cap1(sizedName(o.drink, o.size))}</h3>${steps}${o.mismatch ? `<div class="miss">⚠ Müşteri "${cap1(sizedName(o.cust.drink, o.cust.size))}" istemişti; teslim edersen almaz (itibar −3). Yeniden yap ile doğrusunu seç.</div>` : ""}${!o.mismatch && !o.tutorial && q < D.economy.refuseBelow ? `<div class="miss">⚠ Kalite çok düşük (%${q}); müşteri bu kahveyi almaz ve para ödemez (itibar −3). Yeniden yapmayı düşün.</div>` : ""}<canvas id="closeup"></canvas>
    <div class="zres ${rv.cls}" style="font-size:30px">%${q} · ${rv.label}</div><p class="muted" style="margin:2px 0 0">Tüm adımların ortalaması</p>
    <div class="row" style="justify-content:center"><button class="hold big pri" id="rvServe" style="max-width:300px">Teslim et</button>
    ${o.tutorial ? "" : `<button class="hold big" id="rvRedo" style="max-width:300px;box-shadow:none" ${canRedo ? "" : "disabled"}>Yeniden yap<br><span style="font-size:12px;font-weight:600">−${cc.kg} kg çekirdek${cc.milk ? `, −${cc.milk} L süt` : ""} · yeni bardak${canRedo ? "" : " · malzeme yetmiyor"}</span></button>`}</div>`;
  CLOSEUP.init($("#closeup")); CLOSEUP.cupTop(q, d.steps.includes("milk"), o.scores.art != null && o.scores.art >= 70);
  $("#sheet").classList.add("on");
  $("#rvServe").onclick = () => { o.reviewing = false; serve(o); };
  const rd = $("#rvRedo"); if (rd) rd.onclick = () => {                         // §4 yeniden yap: bu fincanın malzemesi tekrar harcanır
    useBean(cc.bean, cc.kg); if (cc.milk) useMilk(cc.milkType, cc.milk);
    o.reviewing = false; o.selecting = true; o.sel = { bean: multiBeans() ? null : "brazil", drink: null, size: null, milk: null, sugar: null }; o.mismatch = false; o.phase = "ready"; o.v = 0;   // §7 yeniden: tarif/boy tekrar seçilir
    AUDIO.sfx("click"); save(); renderHUD(); renderBench(); };
}
function serve(o) {
  if (!o.assist && !day.orders.includes(o)) return;
  const c = o.cust; const ct = D.customers[c.type] || { tip: 1, discount: null };   // Yıldız Teyze (§10): sabit tipte değil, normal müşteri değil
  let quality = orderQuality(o);                                                   // §4 tüm adımların ortalaması + §6 çekirdek
  const p = c.patienceMax ? c.patience / c.patienceMax : 1; const speedMult = 0.6 + 0.4 * clamp(p / 0.5, 0, 1);   // §7 hız çarpanı 1,0→0,6
  const service = Math.round(quality * speedMult);
  const szz = SZ(o.size);
  if (o.mismatch && !o.assist) {                                                  // §7 yanlış tarif/boy: müşteri almaz, malzeme yine harcanır
    useBean(o.bean, D.economy.beanPerCup * szz.bean);
    if (isMilky(o.drink)) useMilk(o.milk, D.economy.milkPerCup * szz.milk);
    c.say = cap1(pick(D.wrongLines).replace("{d}", orderName(c))); c.sayUntil = performance.now() + 3000;
    c.leaving = true; c.angry = true; c.ordered = false; S.rep = Math.max(0, S.rep - 3); S.streak = 0; day.stats.wrong = (day.stats.wrong || 0) + 1;
    SCENE.addFx(c, "−3", "#b5533c"); AUDIO.sfx("sad"); day.orders = day.orders.filter(x => x !== o); day.active = 0;
    renderHUD(); renderOrders(); save(); setTimeout(renderBench, 500); return; }
  if (!o.assist && !o.tutorial && quality < D.economy.refuseBelow) {               // §7 kötü sipariş: müşteri almaz, para ödemez
    useBean(o.bean, D.economy.beanPerCup * szz.bean);
    if (isMilky(o.drink)) useMilk(o.milk, D.economy.milkPerCup * szz.milk);
    c.say = pick(D.badLines); c.sayUntil = performance.now() + 3000;
    c.leaving = true; c.angry = true; c.ordered = false; S.rep = Math.max(0, S.rep - 3); S.streak = 0; day.stats.bad = (day.stats.bad || 0) + 1;
    SCENE.addFx(c, "−3", "#b5533c"); AUDIO.sfx("sad"); day.orders = day.orders.filter(x => x !== o); day.active = 0;
    toast(`${c.name}: kalite ${quality} — kahveyi almadan gitti (−3 itibar)`);
    renderHUD(); renderOrders(); save(); setTimeout(renderBench, 500); return; }
  let price = orderPrice(o); if (ct.discount) price = Math.round(price * ct.discount);
  const sm = streakMult();                                                          // §7 mükemmel seri çarpanı
  // §7 küçük malzemeler: müşteri gizli oranla kullanır; yoksa tepki verir, bahşiş azalır
  const missing = []; Object.entries(D.extras).forEach(([k, e]) => { if (e.takeaway && !/^cup/.test(SZ(o.size).cup)) return; if (k === "sugar" && D.drinks[o.drink].sugar) return;
    const iced = /^ice/.test(SZ(o.size).cup), mult = ((D.customers[o.cust.type] || {}).extras || {})[k] ?? 1;   // §7 tipe göre küçük malzeme alışkanlığı; buzluda pipet
    if (Math.random() >= (k === "straw" && iced ? 0.9 : Math.min(0.95, e.use * mult))) return;
    if ((S.extras[k] || 0) > 0) S.extras[k]--; else missing.push(k); });
  let tip = 0; if (quality >= 80) tip = Math.round(price * 0.25 * ((quality - 70) / 30) * speedMult * ct.tip * rank().tipMult * sm * decorMult("tip"));
  tip = Math.round(tip * D.extraTip[Math.min(2, missing.length)]);
  if (!o.assist) S.streak = service >= 95 ? (S.streak || 0) + 1 : 0;
  S.money += price + tip; day.stats.income += price; day.stats.tips += tip; day.stats.served++;
  useBean(o.bean, D.economy.beanPerCup * szz.bean);
  if (isMilky(o.drink)) useMilk(o.milk, D.economy.milkPerCup * szz.milk);   // §7 boya göre
  if (o.sugar) S.extras.sugar = Math.max(0, (S.extras.sugar || 0) - D.sugarLevels[o.sugar].n);   // §3 Türk kahvesi şekeri
  useSpecials(o.drink, o.size);                                                   // §3 şurup, sos, krema, dondurma…   // §8 süt sarfı
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
  { const rv = reviewOf(quality); c.say = missing.length ? D.extras[pick(missing)].miss : pick(rv.lines); c.sayUntil = performance.now() + 3200; }
  if (missing.length && !o.assist) { day.stats.extraMiss = (day.stats.extraMiss || 0) + 1; SCENE.addFx(c, "az bahşiş", "#e9c46a"); }   // §4 rastgele müşteri yorumu
  c.leaving = true; c.ordered = false;
  taskProgress("serveDrink", 1, o.drink); if (service >= 95) taskProgress("perfect", 1); taskProgress("earn", price + tip);
  if (o.assist) { SCENE.addFx(c, "Yardımcı", "#f6efe3"); renderHUD(); save(); return; }
  day.orders = day.orders.filter(x => x !== o); day.active = 0; renderOrders();
  toast(`${c.name}: ${cap1(orderName(o))} · kalite ${quality} × hız ${speedMult.toFixed(2)} = ${service} · ₺${price}${tip ? " +₺" + tip + " bahşiş" : ""} · ${msg}`);

  const wasTutorial = o.tutorial;
  renderHUD(); save();
  setTimeout(() => {
    if (wasTutorial) { S.taught.push("first"); save();                            // §10 Devam'a basılana kadar saat durur, müşteri gelmez
      modal(`<h3>Yıldız Teyze</h3><p>${D.tutorial.done}</p>`, [{ label: "Devam", pri: true, fn: () => { if (!day) return; day.tutorialActive = false; day.nextSpawn = day.t + day.spawnEvery * rnd(0.6, 1.4); } }]); }
    checkUnlocks(); layout(); renderBench();
  }, 900);
}
function endDay() {
  cancelAnimationFrame(raf);
  const st = day.stats, L = { rent: 0, wage: 0, cut: 0, task: null, plant: 0, spoiled: false };
  if (day.task && day.task.kind === "noLeave" && !day.task.failed && st.served > 0 && !day.task.done) completeTask();
  if (day.task) L.task = day.task;
  if (S.staff && S.staff.assistant) { L.wage = D.staff.assistant.wage; S.money -= L.wage; }   // §8 personel maaşı
  if (S.debt > 0) { let cut = Math.min(S.debt, Math.round((st.income + st.tips) * D.economy.loanDailyCut)); L.cut = cut; S.money -= cut;   // §2 %20 kesinti, vadesi en yakın krediden
    S.loans.slice().sort((a, b) => a.due - b.due).forEach(l => { const x = Math.min(l.rem, cut); l.rem -= x; cut -= x; }); syncDebt(); }
  const lateLoan = (S.loans || []).find(l => l.rem > 0 && S.day >= l.due);
  if (lateLoan) { day = null; AUDIO.stopLoops(); return bankrupt(lateLoan); }   // §2 bir kredinin vadesi doldu: iflas
  { const r = Object.keys(activeDecor()).reduce((a, k) => a + (D.decor[k].rep || 0), 0); if (r) { L.plant = r; S.rep += r; } }   // §8 dekor itibarı
  if (S.day % 7 === 0) L.news = updateMarket();                                                // §8 hafta sonu borsa
  const repDelta = S.rep - st.repStart; const dayNum = S.day;
  if (!S.equipment.fridge || S.day - (S.milkDay || S.day) + 1 >= D.economy.milkShelfDays) { L.spoiled = S.milk > 0 || Object.values(S.milkAlt || {}).some(v => v > 0); S.milk = 0; S.milkAlt = {}; }   // §8 süt bozulur (buzdolabıyla 3 gün)
  AUDIO.stopLoops(); AUDIO.sfx("shopClose");                                       // §11 kapanış sesi
  day = null; save(); renderHUD(); renderScene(0);
  endCtx = { dayNum, st, L, repDelta, advanced: false };                          // §2 gün sonu ekranları arasında geri dönebilmek için
  showRent(dayNum, L, () => showLedger(dayNum, st, L, repDelta));                 // §2 gün sonu ilk ekran: kira
}
let endCtx = null;
const backToRent = () => { const c = endCtx; showRent(c.dayNum, c.L, () => showLedger(c.dayNum, c.st, c.L, c.repDelta)); };
const backToLedger = () => { const c = endCtx; showLedger(c.dayNum, c.st, c.L, c.repDelta); };
const backFromSupply = () => { $("#ovShop").classList.remove("on"); dayFlow = null; const c = endCtx; if (c.L.news) showNews(weekNo(c.dayNum), c.L.news, openRestock, backToLedger); else backToLedger(); };
// §2 Kira ekranı: kiraya kalan gün, öde / kredi çek / sonra öde (kira günü geçilemez)
const rentPaid = d => S.rentPaidWeek === weekNo(d);
function showRent(dayNum, L, next) {
  const rent = shop().rent, dr = daysToRent(dayNum), paid = rentPaid(dayNum), canPay = S.money >= rent;
  const room = shop().loanLimit - (S.debt || 0), maxLoan = Math.max(0, ...D.economy.loans.filter(l => Math.round(l.amount * (1 + D.economy.loanInterest)) <= room).map(l => l.amount), 0);
  if (dr === 0 && !paid && !canPay && S.money + maxLoan < rent) return bankrupt(null, rent - S.money);   // kira günü: para da kredi de yetmiyor → iflas
  $("#ledgerCard").innerHTML = `<h2>🏠 Kira</h2>
    <div class="rentbig ${dr === 0 && !paid ? "due" : ""}">${paid ? "Bu haftanın kirası ödendi ✓" : dr === 0 ? "Kira bugün!" : `Kiraya ${dr} gün kaldı`}</div>
    ${cashBox()}
    <div class="box"><table><tr><td>Haftalık kira (${shop().name})</td><td class="num"><b>₺${rent}</b></td></tr>
      ${S.debt ? `<tr><td>Toplam borç</td><td class="num">₺${S.debt}</td></tr>` : ""}</table></div>
    ${!paid && dr === 0 && !canPay ? `<div class="req">Kasa kirayı karşılamıyor. Kredi çekip kirayı öde, yoksa devam edemezsin.</div>` : ""}
    <div class="row">${paid ? "" : `<button id="rentLoan" class="loanbtn">🏦 Kredi çek</button><button class="pri" id="rentPay" ${canPay ? "" : "disabled"}>Kirayı öde (₺${rent})</button>`}
      ${paid ? `<button class="pri" id="rentNext">Devam →</button>` : dr > 0 ? `<button id="rentNext">Sonra ödeyeceğim →</button>` : ""}</div>`;
  openOverlay("#ovLedger");
  const re = () => showRent(dayNum, L, next);
  const pb = $("#rentPay"); if (pb) pb.onclick = () => { if (S.money < rent) return; S.money -= rent; S.rentPaidWeek = weekNo(dayNum); L.rent = rent; S.log.push("Gün " + dayNum + ": kira ödendi (₺" + rent + ")"); AUDIO.sfx("register"); save(); renderHUD(); re(); };
  const lb = $("#rentLoan"); if (lb) lb.onclick = () => openLoans(re);
  const nb = $("#rentNext"); if (nb) nb.onclick = () => { if (dr === 0 && !rentPaid(dayNum)) return; next(); };
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
      ${st.nocup ? `<tr><td>Bardak olmadığı için giden</td><td class="num">${st.nocup}</td></tr>` : ""}
      ${st.wrong ? `<tr><td>Yanlış sipariş (para ödemeden giden)</td><td class="num">${st.wrong}</td></tr>` : ""}
      ${st.nostock ? `<tr><td>İstediği çekirdek/süt olmadığı için giden</td><td class="num">${st.nostock}</td></tr>` : ""}
      ${st.bad ? `<tr><td>Kötü sipariş (para ödemeden giden)</td><td class="num">${st.bad}</td></tr>` : ""}
      ${st.extraMiss ? `<tr><td>Küçük malzeme eksikliğinden az bahşiş bırakan</td><td class="num">${st.extraMiss}</td></tr>` : ""}
      <tr><td>Satış</td><td class="num">₺${st.income}</td></tr>
      <tr><td>Bahşiş</td><td class="num">₺${st.tips}</td></tr>
      ${L.task ? `<tr><td>Günlük görev: ${L.task.text}</td><td class="num">${L.task.done ? "✓ +₺" + L.task.money : "✗"}</td></tr>` : ""}
      ${L.rent ? `<tr><td>Haftalık kira (${shop().name})</td><td class="num">−₺${L.rent}</td></tr>` : ""}
      ${L.wage ? `<tr><td>Yardımcı barista maaşı</td><td class="num">−₺${L.wage}</td></tr>` : ""}
      ${L.cut ? `<tr><td>Kredi taksiti (gelirin %20'si)</td><td class="num">−₺${L.cut}</td></tr>` : ""}
      ${L.plant ? `<tr><td>Dekorasyon</td><td class="num">+${L.plant} itibar</td></tr>` : ""}
      ${L.spoiled ? `<tr><td>Kalan süt bozuldu</td><td class="num">0 L</td></tr>` : ""}
      <tr><td>İtibar değişimi</td><td class="num">${repDelta >= 0 ? "+" : ""}${repDelta}</td></tr>
      <tr class="total"><td>Kasa</td><td class="num">₺${S.money}</td></tr>
      ${(S.loans || []).map(l => `<tr><td>Kredi #${l.id} (₺${l.amount} → ₺${l.owe}) · vade</td><td class="num">₺${l.rem} kaldı · ${l.due - dayNum <= 0 ? "bugün" : (l.due - dayNum) + " gün"}</td></tr>`).join("")}
    </table>
    ${short ? `<div class="req">Kasa eksiye düştü. Devam etmek için bankadan en az ₺${need} kredi çekmelisin (kira kredisi: geri ödeme ₺${Math.round(need * (1 + D.economy.loanInterest))}, %10 fazla, ${D.economy.rentLoanDays} gün vade).</div>` :
      `<p class="muted">${rentPaid(dayNum + 1) ? "Bu haftanın kirası ödendi." : `Kiraya ${daysToRent(dayNum + 1)} gün.`} Yeni güne başlamadan önce tedarik yap: en az ${D.economy.minBeans} kg çekirdek${needsMilk() ? ` ve ${D.economy.minMilk} L süt` : ""} gerekir.</p>`}
    <div class="row">${endCtx ? '<button id="ledgerBack">← Geri</button>' : ""}<button class="pri" id="ledgerOk">${short ? "Bankadan ₺" + need + " kredi çek" : (L.news ? "Gazeteye bak →" : "Devam →")}</button></div>`;
  openOverlay("#ovLedger");
  const lbk = $("#ledgerBack"); if (lbk) lbk.onclick = () => backToRent();
  $("#ledgerOk").onclick = () => { if (short) { takeLoan(need, D.economy.rentLoanDays); showLedger(dayNum, st, L, repDelta); return; } $("#ovLedger").classList.remove("on"); if (L.news) showNews(weekNo(dayNum), L.news, openRestock, backToLedger); else openRestock(); };
}
// §7 ilk günden önce tedarik: bardak ve küçük malzemeleri oyuncu alır; Günü başlat ilk günü açar
let firstSupply = false;
function openFirstSupply() { firstSupply = true; mandatoryRestock = true; dayFlow = "supply"; renderHUD(); renderSupply(); openOverlay("#ovShop"); }
function openRestock() { mandatoryRestock = true; dayFlow = "supply"; if (!endCtx || !endCtx.advanced) { S.day++; if (endCtx) endCtx.advanced = true; } save(); renderHUD(); renderSupply(); openOverlay("#ovShop"); }

// ---------- Alt panel (tezgâh, §11) ----------
function renderBench() {
  renderHUD();
  if (!day || !day.orders[day.active]) { $("#sheet").classList.remove("on"); return; }
  const o = day.orders[day.active]; if (o.hidden) { $("#sheet").classList.remove("on"); return; } const s = o.steps[o.i]; const d = D.drinks[o.drink];
  if (o.selecting) { const tb = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}</button>`).join("")}</div>` : "";
    renderSelect(o, tb); $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); }); return; }
  if (o.reviewing) { const tb = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}</button>`).join("")}</div>` : "";
    renderReview(o, tb); $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); }); return; }
  const tabs = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}</button>`).join("")}</div>` : "";
  const steps = `<div class="steps">${o.all.map(st => `<span class="${o.scores[st] != null ? "done" : st === s ? "now" : ""}">${o.auto.has(st) ? "⚙ " : ""}${D.minigames[st].name}${o.scores[st] != null ? " " + o.scores[st] : ""}</span>`).join("")}</div>`;
  if (o.autoRun) {
    $("#sheetBody").innerHTML = `${tabs}<h3>${o.cust.name} için ${cap1(sizedName(o.drink, o.size))}</h3>${steps}<canvas id="closeup"></canvas><div class="hint">⚙ Makine hazırlıyor… (otomatik adımlar 85 puan)</div><div id="mgScore" class="score"></div>`;
    CLOSEUP.init($("#closeup")); $("#sheet").classList.add("on");
    $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); });
    return;
  }
  const tut = o.tutorial ? `<div id="tut" class="on">${s === "grind" && o.i === 0 ? D.tutorial.espressoIntro + "<br><br>" : ""}${D.tutorial.steps[s] || ""}</div>` : "";
  $("#sheetBody").innerHTML = `${tabs}<h3>${o.cust.name} için ${cap1(sizedName(o.drink, o.size))}</h3>${steps}${tut}<canvas id="closeup"></canvas><div id="mgBody"></div><div class="hint">${rank().guide && !o.tutorial ? D.minigames[s].hint : ""}</div><div id="mgScore" class="score"></div>`;
  CLOSEUP.init($("#closeup"));
  $("#sheet").classList.add("on");
  $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); });
  uiZone(o, $("#mgBody"));
  if (o.tutorial) pulseControl(s);
}
function pulseControl(s) { const el = $("#zB"); if (el && !el.disabled) el.classList.add("pulse"); }
function setTut(html) { const t = $("#tut"); if (t) t.innerHTML = html; }   // §10 Yıldız Teyze balonu
// ---------- §4 Renkli hedef çubuğu: tüm mini oyunlar ----------
// Ortada koyu yeşil Mükemmel (100), yanında açık yeşil Güzel (88), en dışta sarı İyi (72); dışı Kaçtı.
// Bölgeler rütbe toleransıyla daralır, ilgili hassasiyet yükseltmesiyle ×1,5 genişler (§8).
const hasWiden = step => Object.keys(S.equipment).some(k => S.equipment[k] && D.equipment[k] && D.equipment[k].widen === step);
const mgSpeed = c => typeof c.speed === "function" ? c.speed() : c.speed;
function zoneSet(step, spd) {                                                     // §4 eşit zorluk: bölge genişliği ibre hızıyla orantılı (aynı zaman penceresi)
  const Z = D.zones, T = Z.time, v = spd || mgSpeed(MG[step]) || 37.5, w = DF().zone * Math.min(1, tol()) * (hasWiden(step) ? Z.widen : 1) * v;
  return { p: Math.max(Z.minPerfect, T.perfect * w), g: Math.max(Z.minPerfect * 2, T.good * w), k: Math.max(Z.minPerfect * 4, T.ok * w) }; }
function zoneScore(v, t, z) {
  const d = Math.abs(v - t), sc = D.zones.score;
  if (d <= z.p) return [sc.perfect, "perfect"]; if (d <= z.g) return [sc.good, "good"]; if (d <= z.k) return [sc.ok, "ok"];
  return [0, "miss"];                                                             // §4 renkli bölgelerin dışı 0
}
function zoneBar(t, z, left, right, t2) {
  const seg = (h, cls, tt = t) => { const a = clamp(tt - h, 0, 100), b = clamp(tt + h, 0, 100); return `<div class="zb ${cls}" style="left:${a}%;width:${b - a}%"></div>`; };
  return `<div class="zbar">${t2 != null ? seg(z.k, "ok", t2) + seg(z.g, "good", t2) + seg(z.p, "perf", t2) : ""}${seg(z.k, "ok")}${seg(z.g, "good")}${seg(z.p, "perf")}<div class="zneedle" id="zN"></div></div>
    <div class="zends"><span>${left}</span><span class="zleg"><i class="perf"></i>Mükemmel <i class="good"></i>Güzel <i class="ok"></i>İyi</span><span>${right}</span></div>`;
}
function setNeedle(v) { const n = $("#zN"); if (n) n.style.left = v + "%"; }
function showZone(zone, sc) { const r = $("#zRes"); if (!r) return; r.className = "zres " + zone; r.textContent = ({ perfect: "MÜKEMMEL!", good: "Güzel", ok: "İyi", miss: "Kaçtı" })[zone] + " · " + sc; }
const EXT_T = o => { const r = D.drinks[o.drink].ratio || 2; return r === 1.5 ? 20 : r === 3 ? 37.5 : 27.5; };
const MG = {
  grind:   { mode: "osc", speed: 85, btn: "ÖĞÜT", left: "kaba", right: "ince", target: o => clamp((D.beans[o.bean || "brazil"].grindT || 50) + ((D.drinks[o.drink].profile || {}).grind || 0), 10, 90), sfx: "grind", tipLow: "grind_low", tipHigh: "grind_high",
             draw: (o, v) => CLOSEUP.grind(v) },
  dose:    { mode: "hold", speed: 9 * 100 / 24, btn: "BASILI TUT · dozla", left: "0 g", right: o => `${Math.round(SZ(o.size).dose * 4 / 3)} g`, target: () => 75, sfx: "dose", tipLow: "dose_low", tipHigh: "dose_high",
             onStart: () => AUDIO.sfx("dose"), draw: (o, v) => CLOSEUP.dose(v * SZ(o.size).dose * 4 / 300, SZ(o.size).dose) },   // §7 double/büyük: 36 g
  tamp:    { mode: "osc", ring: true, speed: 65, btn: "BASTIR", target: () => 58, sfx: "tamp", tipLow: "tamp_low", tipHigh: "tamp_high",
             draw: (o, v) => CLOSEUP.tamp(v / 100, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  extract: { mode: "sweep", speed: EXTRACT_SPEED * 100 / 45, btn0: "BAŞLAT", btn: "DURDUR", left: "0 sn", right: "45 sn", target: o => EXT_T(o) / 45 * 100, tipLow: "extract_low", tipHigh: "extract_high",
             onStart: () => AUDIO.loop("extract", true), onStop: () => { AUDIO.loop("extract", false); AUDIO.sfx("extractStop"); },
             draw: (o, v) => { const t = v * .45, tT = EXT_T(o), tg = Math.round(SZ(o.size).dose * (D.drinks[o.drink].ratio || 2)); CLOSEUP.extract(t, Math.max(0, (t - 6) * tg / (tT - 6)), tg, o.phase === "run", tT, 2.5); } },
  milk:    { mode: "hold", speed: () => (S.equipment.steamWand ? 24 : 16) * 100 / 65, btn: "BASILI TUT · ısıt", left: "20 °C", right: "85 °C", target: () => (62.5 - 20) / 65 * 100, tipLow: "milk_low", tipHigh: "milk_high",
             onStart: () => { AUDIO.loop("milk", true); AUDIO.milkAir(true); }, onTick: o => AUDIO.milkAir(20 + o.v * .65 < 45),
             draw: (o, v) => { const temp = 20 + v * .65, tt = { dollop: 1.2, foam: 1.8, micro: .8 }[D.drinks[o.drink].milk] || 1; CLOSEUP.milk(temp, tt * clamp(v / o.tgt, 0, 1.3), tt, o.phase === "run" && temp < 45, o.phase === "run"); } },
  // §3 aletlerin mini oyunları (espressodan sonra; her biri farklı biçim)
  water:   { mode: "hold", speed: 28, btn: "BASILI TUT · su dök", left: "boş", right: "taşar", target: () => 72, tipLow: "water_low", tipHigh: "water_high",
             onStart: () => AUDIO.loop("extract", true), onStop: () => AUDIO.loop("extract", false), draw: (o, v) => CLOSEUP.water(v, o.phase === "run") },
  pressure:{ mode: "osc", dial: true, speed: 55, btn: "VİDAYI KAPAT", target: () => 62, sfx: "tamp", tipLow: "pressure_low", tipHigh: "pressure_high",
             draw: (o, v) => CLOSEUP.pressure(v, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  // §3 espresso dışı kahveler: Türk kahvesi (cezve), French press, filtre (V60)
  tkdose:  { mode: "hold", dial: true, speed: 40, btn: "BASILI TUT · kahve koy", left: "0 g", right: "10 g", target: () => 70, sfx: "dose", draw: (o, v) => CLOSEUP.tkdose(v / 100, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  tkstir:  { mode: "act", act: "circle", need: 3, btn: "Cezvenin içinde parmağınla daire çiz", draw: (o, v) => CLOSEUP.cezveStir(v, o.ang || 0) },
  tkfoam:  { mode: "sweep", dial: true, speed: 30, btn0: "OCAĞA KOY", btn: "OCAKTAN AL", left: "soğuk", right: "taştı", target: () => 80, draw: (o, v) => CLOSEUP.cezveFoam(v, o.phase === "run", { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  fpdose:  { mode: "hold", dial: true, speed: 40, btn: "BASILI TUT · kahve koy", left: "0 g", right: "40 g", target: () => 75, sfx: "dose", draw: (o, v) => CLOSEUP.press(v, "dose", false, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  fpwater: { mode: "hold", dial: true, speed: 30, btn: "BASILI TUT · su dök", left: "boş", right: "taşar", target: () => 80, onStart: () => AUDIO.loop("extract", true), onStop: () => AUDIO.loop("extract", false), draw: (o, v) => CLOSEUP.press(v, "water", o.phase === "run", { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  fpsteep: { mode: "sweep", dial: true, speed: 100 / 12, btn0: "BAŞLAT", btn: "DURDUR", left: "0 dk", right: "6 dk", target: () => 66.7, draw: (o, v) => CLOSEUP.press(v, "steep", false, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  fpplunge:{ mode: "act", act: "hold", speed: 30, btn: "BASILI TUT · pistonu bastır", draw: (o, v) => CLOSEUP.press(v, "plunge") },
  fdose:   { mode: "hold", dial: true, speed: 40, btn: "BASILI TUT · kahve koy", left: "0 g", right: "30 g", target: () => 72, sfx: "dose", draw: (o, v) => CLOSEUP.v60(v, "dose", null, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  bloom:   { mode: "act", act: "hold", speed: 60, btn: "BASILI TUT · ön ıslatma", draw: (o, v) => CLOSEUP.v60(v, "bloom", o.phase === "run") },
  pourover:{ mode: "act", act: "circle", need: 3, btn: "Kettle'la merkezden dışa daire çiz", draw: (o, v) => CLOSEUP.v60(v, "pour", o.ang || 0) },
  // §3 dünya kahveleri adımları (gerçek hareketler + göstergeler)
  pump:    { mode: "act", act: "taps", need: o => PUMPS[o.size] || 2, btn: "POMPALA", draw: (o, v) => { const k = D.drinks[o.drink].pump || "vanilla"; CLOSEUP.kit("pump", v, { n: o.taps || 0, N: PUMPS[o.size] || 2, color: D.specials[k].color, name: D.specials[k].name.toLocaleLowerCase("tr"), flash: o.flash }); } },
  drizzle: { mode: "act", act: "circle", need: 2, btn: "Üstüne daire çizerek sos gezdir", draw: (o, v) => CLOSEUP.kit("drizzle", v, { ang: o.ang, color: D.specials[D.drinks[o.drink].drizzle || "caramel"].color }) },
  cream:   { mode: "act", act: "circle", need: 2, btn: "Sifonla daire çizerek krema sık", draw: (o, v) => CLOSEUP.kit("cream", v, { ang: o.ang }) },
  scoop:   { mode: "act", act: "hold", speed: 45, btn: "BASILI TUT · dondurma topu al", draw: (o, v) => CLOSEUP.kit("scoop", v, { N: SZ(o.size).scoops || 1 }) },
  pourshot:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · espressoyu dök", draw: (o, v) => CLOSEUP.kit("pourshot", v, { N: SZ(o.size).scoops || 1 }) },
  garnish: { mode: "act", act: "taps", need: () => 1, btn: "LİMON", draw: (o, v) => CLOSEUP.kit("garnish", v) },
  ice:     { mode: "act", act: "taps", need: () => 3, btn: "BUZ", draw: (o, v) => CLOSEUP.kit("ice", v, { N: 3 }) },
  coldwater:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · soğuk su dök", draw: (o, v) => CLOSEUP.kit("coldwater", v, { run: o.phase === "run" }) },
  coldmilk:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · soğuk süt dök", draw: (o, v) => CLOSEUP.kit("coldmilk", v, { run: o.phase === "run" }) },
  tonic:   { mode: "act", act: "hold", speed: 25, btn: "BASILI TUT · toniği yavaşça dök", draw: (o, v) => CLOSEUP.kit("tonic", v, { run: o.phase === "run" }) },
  coldpour:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · cold brew dök", draw: (o, v) => CLOSEUP.kit("coldpour", v, { run: o.phase === "run" }) },
  whisk:   { mode: "act", act: "circle", need: 5, btn: "Kasede daire çizerek çırp", draw: (o, v) => CLOSEUP.kit("whisk", v, { ang: o.ang, N: 5 }) },
  spoontop:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · köpüğü kaşıkla koy", draw: (o, v) => CLOSEUP.kit("spoontop", v) },
  blend:   { mode: "sweep", dial: true, speed: 22, btn0: "ÇALIŞTIR", btn: "DURDUR", target: () => 72, onStart: () => AUDIO.loop("extract", true), onStop: () => AUDIO.loop("extract", false), draw: (o, v) => CLOSEUP.kit("blend", v, { run: o.phase === "run", Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  shakeit: { mode: "act", act: "shake", need: 10, btn: "Shaker'ı sağa-sola kaydırarak çalkala", draw: (o, v) => CLOSEUP.kit("shakeit", v, { x: o.shx }) },
  mokafill:{ mode: "hold", dial: true, speed: 30, btn: "BASILI TUT · su doldur", target: () => 70, draw: (o, v) => CLOSEUP.kit("mokafill", v, { Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  mokaheat:{ mode: "sweep", dial: true, speed: 18, btn0: "OCAĞA KOY", btn: "OCAKTAN AL", target: () => 75, draw: (o, v) => CLOSEUP.kit("mokaheat", v, { run: o.phase === "run", Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  apsteep: { mode: "sweep", dial: true, speed: 100 / 9, btn0: "BAŞLAT", btn: "DURDUR", target: () => 50, draw: (o, v) => CLOSEUP.kit("apsteep", v, { Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  appress: { mode: "act", act: "hold", speed: 30, btn: "BASILI TUT · pistonu bastır", draw: (o, v) => CLOSEUP.kit("appress", v) },
  phin:    { mode: "sweep", dial: true, speed: 100 / 14, btn0: "BAŞLAT", btn: "DURDUR", target: () => 66.7, draw: (o, v) => CLOSEUP.kit("phin", v, { run: o.phase === "run", color: D.specials.condensed.color, Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  siphonheat:{ mode: "sweep", dial: true, speed: 20, btn0: "ATEŞİ AÇ", btn: "ATEŞİ KES", target: () => 80, draw: (o, v) => CLOSEUP.kit("siphonheat", v, { run: o.phase === "run", Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  siphondrop:{ mode: "act", act: "hold", speed: 35, btn: "BASILI TUT · süzülmeyi bekle", draw: (o, v) => CLOSEUP.kit("siphondrop", v) },
  nitrotap:{ mode: "hold", dial: true, speed: 28, btn: "BASILI TUT · musluğu aç", target: () => 80, draw: (o, v) => CLOSEUP.kit("nitrotap", v, { run: o.phase === "run", Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  // §4 hareket adımları (beceri istemez, tamamlanınca 100): karıştır, sürahiyi çevir, çalkala, dök
  cocoa:   { mode: "act", act: "shake", need: 8,  btn: "Serpiciyi sağa-sola kaydırarak çalkala", draw: (o, v) => CLOSEUP.shake(o.shx == null ? 50 : o.shx, v) },
  stir:    { mode: "act", act: "circle", need: 3, btn: "Fincanın içinde parmağınla daire çiz", draw: (o, v) => CLOSEUP.stir(v, o.ang || 0) },
  swirl:   { mode: "act", act: "circle", need: 3, btn: "Sürahiyi daire çizerek çevir", draw: (o, v) => CLOSEUP.swirl(v, o.ang || 0, D.drinks[o.drink].milk) },
  pour:    { mode: "act", act: "hold", speed: 34, btn: "BASILI TUT · sütü dök", draw: (o, v) => CLOSEUP.pour(v, o.phase === "run", D.drinks[o.drink].milk) },
  art:     { mode: "hold", speed: 32, btn: "BASILI TUT · dök", left: "%0", right: "%100", target: () => 72.5, tipLow: "art_low", tipHigh: "art_high",
             draw: (o, v) => o.artCut ? CLOSEUP.art(o.fill, v / 100) : CLOSEUP.art(v, null) }
};
function uiAct(o, el, s) {                                                        // §4 hareket adımı: ilerleme çubuğu + gerçek hareket
  const c = MG[s]; o.v = 0; o.ang = 0; o.shx = 50; o.phase = "run"; o.frozen = false; let last = null, acc = 0, dir = 0, run = 0;
  el.innerHTML = `<div class="actbar"><i id="actFill"></i></div><div class="acthint">${c.act === "taps" ? D.minigames[s].hint : c.btn}</div>` + (c.act === "hold" || c.act === "taps" ? `<button class="hold big pri" id="zB">${c.btn}</button>` : "") + `<div id="zRes" class="zres"></div>`;
  const cv = $("#closeup"), done = () => { if (o.phase === "done") return; o.phase = "done"; AUDIO.stopLoops(); showZone("perfect", 100); finishStep(o, 100); };
  const set = p => { o.v = clamp(p, 0, 100); const f = $("#actFill"); if (f) f.style.width = o.v + "%"; if (o.v >= 100) done(); };
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2, w: r.width }; };
  if (c.act === "taps") { const b = $("#zB"), N = c.need(o); o.taps = 0;          // §3 sayılı dokunuş: pompa, buz, limon
    b.onclick = () => { if (o.phase === "done") return; o.taps++; o.flash = true; setTimeout(() => { o.flash = false; }, 120); AUDIO.sfx("click"); set(o.taps / N * 100); };
    return; }
  if (c.act === "hold") { const b = $("#zB"); o.phase = "ready";
    b.onpointerdown = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} if (o.phase === "done") return; o.phase = "run"; AUDIO.loop("extract", true); };
    b.onpointerup = b.onpointercancel = () => { if (o.phase === "run") { o.phase = "ready"; AUDIO.loop("extract", false); } };
    o.holdTick = dt => { if (o.phase === "run") set(o.v + c.speed * dt); };
    return; }
  cv.style.touchAction = "none";
  cv.onpointerdown = e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} last = pt(e); };
  cv.onpointerup = cv.onpointercancel = () => { last = null; };
  cv.onpointermove = e => { if (!last || o.phase === "done") return; const p = pt(e);
    if (c.act === "circle") { const a0 = Math.atan2(last.y, last.x), a1 = Math.atan2(p.y, p.x); let d = a1 - a0; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      if (Math.hypot(p.x, p.y) > 12) { acc += Math.abs(d); o.ang += d; set(acc / (2 * Math.PI * c.need) * 100); if (Math.random() < .08) AUDIO.sfx("click"); } }
    else { const dx = p.x - last.x; o.shx = clamp(50 + p.x / p.w * 120, 0, 100); const sg = Math.sign(dx);
      if (sg) { if (sg === dir) run += Math.abs(dx); else { if (run > p.w * .06) { set(o.v + 100 / c.need); AUDIO.sfx("dose"); } dir = sg; run = Math.abs(dx); } } }
    last = p; };
}
function uiZone(o, el) {
  const s = o.steps[o.i], c = MG[s];
  if (c.mode === "act") { uiAct(o, el, s); c.draw(o, 0); return; }
  $("#closeup").onpointerdown = $("#closeup").onpointermove = null;
  o.z = zoneSet(s); o.tgt = c.target(o); o.mode = null; o.artCut = false; o.dir = 1; o.frozen = false; o.spd = 1; o.blond = null;
  const pf = (s === "extract" && D.drinks[o.drink].profile) || {};                 // §4 tarif profili: ristretto hızlı + dar, lungo iki aşamalı
  if (pf.extractSpeed) o.spd = pf.extractSpeed;
  const zm = (pf.extractSpeed || 1) * (pf.extractZone || 1);                       // hızlanan ibre → bölge orantılı genişler; ristretto penceresi ayrıca ×0,6
  if (zm !== 1) o.z = { p: o.z.p * zm, g: o.z.g * zm, k: o.z.k * zm };
  if (pf.blond) o.blond = { t: Math.round(o.tgt * .62), done: false, score: null };
  o.v = c.mode === "osc" ? Math.random() * 100 : 0; o.phase = c.mode === "osc" ? "run" : "ready";
  const legend = `<div class="zends" style="justify-content:center"><span class="zleg"><i class="perf"></i>Mükemmel <i class="good"></i>Güzel <i class="ok"></i>İyi</span></div>`;
  const fx = x => typeof x === "function" ? x(o) : x;
  el.innerHTML = (c.ring || c.dial ? legend : zoneBar(o.tgt, o.z, fx(c.left), fx(c.right), o.blond && o.blond.t)) + (o.blond ? `<button class="hold big" id="zB2" disabled style="box-shadow:none">💧 Akışı yumuşat</button>` : "") + `<button class="hold big pri" id="zB">${c.btn0 || c.btn}</button><div id="zRes" class="zres"></div>`;
  if (o.blond) $("#zB2").onclick = () => { if (o.phase !== "run" || o.blond.done) return; const [sc, zone] = zoneScore(o.v, o.blond.t, o.z); o.blond.done = true; o.blond.score = sc; showZone(zone, sc); $("#zB2").disabled = true; AUDIO.sfx("click"); };
  if ((c.ring || c.dial) && c.mode === "osc") $("#closeup").onpointerdown = e => { e.preventDefault(); if (o.phase !== "run" || o.steps[o.i] !== s) return; if (o.tutorial && !o.frozen) return setTut(D.tutorial.tooEarly); stopZone(o, s); };   // §4 tamping: daireye dokun
  bindZone(o, s); setNeedle(o.v); c.draw(o, o.v);
  if (o.tutorial && $("#tut")) {                                                 // §10 öğretici: önce anlatım + Anladım; sonra işlem başlar
    const osc = c.mode === "osc";                                               // öğütme/tamping: Anladım → ibre 1–2 tur → yeşilde "Tam şimdi!"
    o.phase = "intro"; o.v = 0; o.dir = 1; o.bounces = 0; setNeedle(0); c.draw(o, 0);
    const b = $("#zB"); b.disabled = true; b.classList.remove("pulse");
    $("#tut").insertAdjacentHTML("beforeend", `<div style="text-align:right;margin-top:6px"><button class="pri" id="tutOk">Anladım</button></div>`);
    $("#tutOk").onclick = () => { if (o.phase !== "intro") return; $("#tutOk").parentNode.remove(); AUDIO.sfx("click");
      if (osc) o.phase = "run"; else { o.phase = "ready"; b.disabled = false; b.classList.add("pulse"); } };   // dozlama/çekme: düğme şimdi açılır
  }
}
function bindZone(o, s) {
  const c = MG[s], b = $("#zB"), mode = o.mode || c.mode;
  b.onpointerdown = b.onpointerup = b.onpointercancel = b.onclick = null;
  if (mode === "osc") b.onpointerdown = e => { e.preventDefault(); if (o.phase !== "run") return; if (o.tutorial && !o.frozen) return setTut(D.tutorial.tooEarly); stopZone(o, s); };
  if (mode === "sweep") b.onclick = () => { if (o.phase === "ready") { o.phase = "run"; b.textContent = c.btn; c.onStart && c.onStart(); const b2 = $("#zB2"); if (b2 && o.blond && !o.blond.done) b2.disabled = false; if (o.tutorial && s === "extract") setTut(D.tutorial.extractRun); }
    else if (o.phase === "run") { if (o.tutorial && !o.frozen) {                    // §10 öğretici: erken durdurdu → çekme baştan
        if (s === "extract") { o.phase = "ready"; o.v = 0; c.onStop && c.onStop(); AUDIO.stopLoops(); b.textContent = c.btn0 || c.btn; setNeedle(0); c.draw(o, 0); return setTut(D.tutorial.extractEarly); }
        return setTut(D.tutorial.tooEarly); } stopZone(o, s); } };
  if (mode === "hold") { b.onpointerdown = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} if (o.phase !== "ready") return; o.phase = "run"; b.textContent = "…bırak"; c.onStart && c.onStart(); if (s === "art") AUDIO.sfx("dose"); };
    b.onpointerup = b.onpointercancel = () => { if (o.phase !== "run") return;
      if (o.tutorial && !o.frozen) { o.phase = "ready"; o.v = 0; AUDIO.stopLoops(); b.textContent = c.btn0 || c.btn; setNeedle(0); c.draw(o, 0); setTut(D.tutorial.holdRetry); return; }   // §10 erken bıraktı: baştan
      stopZone(o, s); }; }
}
function stopZone(o, s) {
  const c = MG[s]; o.phase = "done"; c.onStop && c.onStop();
  let [sc, zone] = zoneScore(o.v, o.tgt, o.z);
  if (o.blond) { const bs = o.blond.done ? o.blond.score : 0; sc = Math.round((sc + bs) / 2); o.blond.done = true; const b2 = $("#zB2"); if (b2) b2.disabled = true; }   // §4 lungo: iki aşamanın ortalaması
  showZone(zone, sc); setNeedle(o.v);
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
  const m = [], kg = beanKg("brazil");
  if (kg < D.economy.minBeans) m.push(`Brezilya çekirdeği (ev çekirdeği) — en az ${D.economy.minBeans} kg olmalı (şu an ${kg.toFixed(2)} kg). Aşağıdan çekirdek al.`);
  if (needsMilk() && (S.milk || 0) < D.economy.minMilk) m.push(`İnek sütü — en az ${D.economy.minMilk} L olmalı (şu an ${(S.milk || 0).toFixed(1)} L). Aşağıdan süt al.`);
  cupsNeeded().forEach(k => { const n = S.cups[k] || 0; if (n < D.cupMin) m.push(`${D.cups[k].name} — en az ${D.cupMin} adet olmalı (şu an ${n}). Aşağıdan bardak al.`); });   // §7 bardak
  return m;
}
function renderSupply() {
  const lv = shop(), miss = supplyMissing(), flow = dayFlow === "supply";
  let html = `<h2>Tedarik${flow ? "" : '<span class="x" id="supX">✕</span>'}</h2>`;
  html += cashBox();   // §7 para belirgin, yeşil kağıt para ikonu
  html += `<div class="box" style="text-align:left"><h4>Mevcut stok</h4><p style="margin:4px 0 0">☕ ${openBeans().map(id => `${D.beans[id].name} <b>${beanKg(id).toFixed(2)} kg</b>`).join(" · ")}${needsMilk() || S.tools.milkKit ? `<br>🥛 ${openMilks().map(k => `${D.milks[k].short} <b>${milkL(k).toFixed(1)} L</b>`).join(" · ")}` : ""}<br>
    🥤 Bardak: ${cupsKnown().map(k => `${D.cups[k].name} <b>${S.cups[k] || 0}</b>`).join(" · ")}</p></div>`;
  html += miss.length ? miss.map(t => `<div class="miss">EKSİK: ${t}</div>`).join("") : `<div class="req ok" style="font-size:15px">Malzemeler tamam ✓</div>`;
  const beanLow = beanKg("brazil") < D.economy.minBeans, milkLow = needsMilk() && (S.milk || 0) < D.economy.minMilk;
  const nextBean = Object.keys(D.beans).find(id => !beanOpen(id));                  // §6 sıradaki kilitli çekirdek ipucu
  html += `<div class="box ${beanLow ? "need" : ""}"><h4>Çekirdekler (₺/kg)</h4><p class="muted">Her çekirdek kahvenin satış fiyatını değiştirir. Müşteriler istediği çekirdeği söyler; stokta yoksa giderler. Brezilya ev çekirdeğidir, en az ${D.economy.minBeans} kg olmalı.</p><table>` + openBeans().map(id => { const b = D.beans[id], kg = beanKg(id);
    return `<tr><td>${th("sup:bean")}<b>${b.name}</b> <span class="muted">· satış ×${b.mult.toFixed(2)}</span><br><span class="muted">${b.notes} · stok ${kg.toFixed(2)} kg</span></td><td>₺${SP(b.price)}</td>
      <td><button data-buy="${id}" ${S.money < SP(b.price) ? "disabled" : ""}>1 kg al</button></td></tr>`; }).join("") + `</table>${nextBean ? `<p class="muted">🔒 Sıradaki: ${D.beans[nextBean].name} — ${D.beans[nextBean].unlock}★ dükkan${D.beans[nextBean].cups ? ` ve toplam ${D.beans[nextBean].cups} kahve satışı (şu an ${totalSold()})` : ""}</p>` : ""}</div>`;
  if (needsMilk() || S.tools.milkKit) { const nextMilk = Object.keys(D.milks).find(k => !openMilks().includes(k));
    html += `<div class="box ${milkLow ? "need" : ""}"><h4>Sütler (₺/L)</h4><p class="muted">Sütlü içecek başına ${D.economy.milkPerCup} L harcanır. ${S.equipment.fridge ? "Buzdolabı var: sütler 3 gün dayanır." : "Buzdolabı yok: gün sonunda kalan sütler bozulur."} İnek sütü en az ${D.economy.minMilk} L olmalı.</p><table>` +
      openMilks().map(k => { const m = D.milks[k], l = milkL(k); return `<tr><td>${th("sup:milk")}<b>${m.name}</b>${m.extra ? ` <span class="muted">· siparişe +₺${m.extra}</span>` : ""}<br><span class="muted">stok ${l.toFixed(1)} L</span></td><td>₺${SP(m.price)}</td>
        <td><button data-milk="${k}" ${S.money < SP(m.price) ? "disabled" : ""}>1 L al</button></td></tr>`; }).join("") + `</table>${nextMilk ? `<p class="muted">🔒 Sıradaki: ${D.milks[nextMilk].name} — ${D.milks[nextMilk].rep} itibar (şu an ${S.rep})</p>` : ""}</div>`; }
  html += `<div class="box">${"<h4>Bardaklar (10'lu paket)</h4>"}<p class="muted">Her içecek kendi bardağıyla servis edilir; bardak yoksa müşteri o boyu alamadan kızıp gider. Her bardak türünden en az ${D.cupMin} adet olmalı.</p><table>` +
    cupsKnown().map(k => { const cp = D.cups[k], n = S.cups[k] || 0;
      return `<tr class="${n < D.cupMin ? "need" : ""}"><td>${th("cup:" + k)}<b>${cp.name}</b><br><span class="muted">stok ${n} adet</span></td><td>₺${SP(cp.price)}</td><td><button data-cup="${k}" ${S.money < SP(cp.price) ? "disabled" : ""}>${cp.pack}'lu paket al</button></td></tr>`; }).join("") + `</table></div>`;
  const specs = Object.keys(D.specials).filter(specialOpen);                        // §3 şuruplar, soslar ve tatlılar
  if (specs.length) html += `<div class="box"><h4>Şuruplar, soslar ve özel malzemeler</h4><p class="muted">Tarifler bunları istenen miktarda kullanır; stokta yoksa müşteri "… bile yok!" deyip gider.</p><table>` +
    specs.map(k => { const sp = D.specials[k], n = specStock(k);
      const act = sp.brew ? `<button data-cb="1" ${beanKg("brazil") >= .2 && S.tools.coldBrewJar ? "" : "disabled"}>Demle (0,2 kg Brezilya → ${sp.pack} ${sp.unit})</button>` : `<button data-sp="${k}" ${S.money < SP(sp.price) ? "disabled" : ""}>${sp.pack} ${sp.unit} al</button>`;
      return `<tr><td>${th("sp:" + k)}<b>${sp.name}</b><br><span class="muted" style="${n === 0 ? "color:var(--kotu);font-weight:700" : ""}">stok ${n} ${sp.unit}${sp.brew ? " · gece boyunca demlenir, ertesi gün hazır" : ""}</span></td><td>${sp.brew ? "" : "₺" + SP(sp.price)}</td><td>${act}</td></tr>`; }).join("") + `</table></div>`;
  html += `<div class="box"><h4>Küçük malzemeler</h4><p class="muted">Müşteriler bunları her kahvede değil, ara sıra kullanır. Eksikse "… bile yok!" deyip az bahşiş bırakırlar.</p><table>` +
    Object.entries(D.extras).map(([k, e]) => { const n = S.extras[k] || 0, low = n < D.extrasLow;
      return `<tr><td>${th("ex:" + k)}<b>${e.name}</b><br><span class="muted" style="${n === 0 ? "color:var(--kotu);font-weight:700" : low ? "color:#b58a1e;font-weight:700" : ""}">stok ${n} adet${n === 0 ? " · bitti" : low ? " · az kaldı" : ""}</span></td><td>₺${SP(e.price)}</td><td><button data-ex="${k}" ${S.money < SP(e.price) ? "disabled" : ""}>${e.pack}'lü paket al</button></td></tr>`; }).join("") + `</table></div>`;
  html += `<div class="row">${flow && endCtx ? '<button id="supBack">← Geri</button>' : ""}<button id="supLoan" class="loanbtn">🏦 Kredi al</button><button class="pri" id="supNext" ${flow && miss.length ? "disabled" : ""}>${flow ? (firstSupply ? "Günü başlat ☕" : "Devam →") : "Kapat"}</button></div>`;
  $("#shopCard").innerHTML = html;
  const re = () => renderSupply();
  $("#shopCard").querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const id = b.dataset.buy; buy(SP(D.beans[id].price), () => { S.beans[id] = { kg: (S.beans[id]?.kg || 0) + 1, boughtDay: S.day }; }); re(); });
  $("#shopCard").querySelectorAll("[data-milk]").forEach(b => b.onclick = () => { const k = b.dataset.milk; buy(SP(D.milks[k].price), () => { if (k === "cow") S.milk = (S.milk || 0) + 1; else { S.milkAlt = S.milkAlt || {}; S.milkAlt[k] = (S.milkAlt[k] || 0) + 1; } S.milkDay = S.day; }); re(); });
  $("#shopCard").querySelectorAll("[data-cup]").forEach(b => b.onclick = () => { const k = b.dataset.cup; buy(SP(D.cups[k].price), () => { S.cups[k] = (S.cups[k] || 0) + D.cups[k].pack; }); re(); });
  $("#shopCard").querySelectorAll("[data-sp]").forEach(b => b.onclick = () => { const k = b.dataset.sp; buy(SP(D.specials[k].price), () => { S.syr = S.syr || {}; S.syr[k] = (S.syr[k] || 0) + D.specials[k].pack; }); re(); });
  const cbb = $("#shopCard [data-cb]"); if (cbb) cbb.onclick = () => { if (beanKg("brazil") < .2) return; useBean("brazil", .2); S.syr = S.syr || {}; S.syr.coldbrew = (S.syr.coldbrew || 0) + D.specials.coldbrew.pack; AUDIO.sfx("click"); save(); re(); };
  $("#shopCard").querySelectorAll("[data-ex]").forEach(b => b.onclick = () => { const k = b.dataset.ex; buy(SP(D.extras[k].price), () => { S.extras[k] = (S.extras[k] || 0) + D.extras[k].pack; }); re(); });
  $("#supLoan").onclick = () => openLoans(re);
  const sx = $("#supX"); if (sx) sx.onclick = () => closeOverlay("#ovShop");
  const sbk = $("#supBack"); if (sbk) sbk.onclick = backFromSupply;
  $("#supNext").onclick = () => { if (!flow) return closeOverlay("#ovShop"); if (supplyMissing().length) return;
    if (firstSupply) { firstSupply = false; dayFlow = null; mandatoryRestock = false; $("#ovShop").classList.remove("on"); return startDay(); } dayFlow = "hub"; $("#ovShop").classList.remove("on"); hubTab = "upg"; renderHub(); openOverlay("#ovHub"); };
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
  return `<tr class="${miss.length && !S.equipment[id] ? "lock" : ""}"><td>${th("eq:" + id)}<b>${e.auto ? "⚙ " : e.widen ? "🎯 " : ""}${e.name}</b><br><span class="muted">${e.effect}</span></td><td>₺${e.price}</td><td>${st}</td></tr>`;
}
function hubContent() {
  const lv = shop(), vis = e => (e.stars || 1) <= lv.stars;
  if (hubTab === "upg") {
    const T = tr(), cost = k => lv.tierCost[k], E = Object.entries(D.equipment).filter(([, e]) => vis(e));
    const sec = (title, desc, rows) => rows ? `<div class="box"><h4>${title}</h4>${desc ? `<p class="muted">${desc}</p>` : ""}<table>${rows}</table></div>` : "";
    const traffic = `<tr><td>${th("tr:cust" + Math.min(3, T.cust + 1))}<b>Günlük müşteri</b> (kademe ${T.cust}/3)<br><span class="muted">${T.cust < 3 ? D.traffic.cust[T.cust] + ": +" + lv.custStep + " müşteri/gün" : "en üst kademe"}</span></td><td>${T.cust < 3 ? "₺" + cost(T.cust) : ""}</td><td>${T.cust < 3 ? `<button data-tr="cust" ${S.money < cost(T.cust) ? "disabled" : ""}>Yükselt</button>` : "✓"}</td></tr>
      <tr><td>${th("tr:freq" + Math.min(3, T.freq + 1))}<b>Geliş sıklığı</b> (kademe ${T.freq}/3)<br><span class="muted">${T.freq < 3 ? D.traffic.freq[T.freq] + ": müşteriler daha sık gelir" : "en üst kademe"}</span></td><td>${T.freq < 3 ? "₺" + cost(T.freq) : ""}</td><td>${T.freq < 3 ? `<button data-tr="freq" ${S.money < cost(T.freq) ? "disabled" : ""}>Yükselt</button>` : "✓"}</td></tr>`;
    const A = D.staff.assistant;
    const staff = A.stars <= lv.stars ? `<tr><td>${th("staff")}<b>${A.name}</b><br><span class="muted">${A.effect} (${A.score} puan) · günlük maaş ₺${A.wage}</span></td><td></td><td>${S.staff.assistant ? `<button id="fire">Çıkar</button>` : `<button id="hire">İşe al</button>`}</td></tr>` : "";
    return sec("👥 Müşteri gelişi", `Sıra en fazla ${lv.maxQueue} kişi · günde en fazla ${dayCap()} müşteri · ~${arrivalEvery().toFixed(1)} sn'de bir müşteri. Kademeler bu dükkana özeldir.`, traffic)
      + sec("🎯 Kolaylaştırıcılar ve göstergeler", "Renkli hedef bölgelerini genişletir ya da adımı hızlandırır.", E.filter(([id, e]) => e.widen || id === "steamWand").map(([id, e]) => eqRow(id, e)).join(""))
      + sec("⚙ Otomasyon", "Adımı atlar, sabit 85 puan verir; önce o adımın kolaylaştırıcısı gerekir.", E.filter(([, e]) => e.auto).map(([id, e]) => eqRow(id, e)).join(""))
      + sec("🏪 Kapasite ve personel", "", E.filter(([id]) => id === "dualGroup" || id === "fridge").map(([id, e]) => eqRow(id, e)).join("") + staff);
  }
  if (hubTab === "tools") {
    const rows = Object.entries(D.tools).filter(([, t]) => vis(t)).map(([id, t]) => { const uses = Object.keys(D.drinks).filter(k => (D.drinks[k].needs || []).includes(id)).map(k => D.drinks[k].name);
      return `<tr><td>${th("tool:" + id)}<b>${t.name}</b><br><span class="muted">${t.effect} · gerektiren: ${uses.join(", ")} · mini oyun: ${D.minigames[t.step].name}</span></td><td>₺${t.price}</td><td>${S.tools[id] ? "✓ dükkanda" : `<button data-tool="${id}" ${S.money < t.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`; }).join("");
    return `<div class="box"><p class="muted">Bazı tarifler bu aletler ya da makineler olmadan yapılamaz. Aldıkların dükkan büyüyünce yeni dükkana taşınır.</p><table>${rows}</table></div>`;
  }
  if (hubTab === "loans") return `<div class="box">${loansHTML()}</div>`;
  return `<div class="box"><p class="muted">Dekorasyon bu dükkana özeldir: yalnızca burada görünür ve etki eder. Dükkan büyüyünce yeni dükkanın kendi dekorları gelir.</p><table>` + Object.entries(D.decor).filter(([, dc]) => (dc.stars || 1) === lv.stars).sort((a, b) => a[1].price - b[1].price).map(([id, dc]) => `<tr><td>${th("decor:" + id)}<b>${dc.name}</b><br><span class="muted">${dc.effect}</span></td><td>₺${dc.price}</td><td>${S.decor[id] ? "✓ dükkanda" : `<button data-dec="${id}" ${S.money < dc.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`).join("") + `</table></div>`;
}
function renderHub() {
  const lv = shop(), flow = dayFlow === "hub";
  let html = `<div class="hubhead"><h2 style="margin:0">Dükkan · ${"★".repeat(lv.stars)} ${lv.name}</h2><span class="muted">Kasa ₺${S.money}</span><button id="goalBtn" class="goal">🎯 Ana hedef</button>${flow ? "" : '<span class="x" id="hubX">✕</span>'}</div>`;
  html += `<div class="tabbar">${Object.entries(TAB).map(([k, [n, c]]) => `<button data-tab="${k}" class="${hubTab === k ? "on" : ""}" style="--tc:${c}">${ICONS[k]}<span>${n}</span></button>`).join("")}</div>`;
  html += `<div class="tabbody" style="--tc:${TAB[hubTab][1]}">${hubContent()}</div>`;
  html += `<div class="row">${flow ? '<button id="hubBack">← Geri</button>' : ""}<button class="pri" id="hubNext">${flow ? "Devam →" : "Kapat"}</button></div>`;
  $("#hubCard").innerHTML = html;
  const R = $("#hubCard"), re = () => renderHub();
  R.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { hubTab = b.dataset.tab; AUDIO.sfx("click"); re(); });
  R.querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const id = b.dataset.eq; if (S.money < D.equipment[id].price) return; buy(D.equipment[id].price, () => { S.equipment[id] = true; if (id === "fridge") S.milkDay = S.day; }); re(); showPurchase("eq:" + id, D.equipment[id].name); });
  R.querySelectorAll("[data-tool]").forEach(b => b.onclick = () => { const id = b.dataset.tool; if (S.money < D.tools[id].price) return; buy(D.tools[id].price, () => { S.tools[id] = true; S.log.push("Gün " + S.day + ": " + D.tools[id].name + " alındı"); }); re(); showPurchase("tool:" + id, D.tools[id].name); });
  R.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => { const id = b.dataset.dec; if (S.money < D.decor[id].price) return; buy(D.decor[id].price, () => { S.decor[id] = true; }); re(); showPurchase("decor:" + id, D.decor[id].name); });
  R.querySelectorAll("[data-tr]").forEach(b => b.onclick = () => { const k = b.dataset.tr, T = S.traffic[S.shopLevel] = Object.assign({ cust: 0, freq: 0 }, S.traffic[S.shopLevel]);
    if (T[k] >= 3 || S.money < shop().tierCost[T[k]]) return; const nm = D.traffic[k][T[k]]; buy(shop().tierCost[T[k]], () => { S.log.push("Gün " + S.day + ": " + nm); T[k]++; }); re(); showPurchase("tr:" + k + T[k], nm); });
  const hi = $("#hire"); if (hi) hi.onclick = () => { S.staff.assistant = true; S.log.push("Gün " + S.day + ": yardımcı barista işe alındı"); save(); re(); showPurchase("staff", "Yardımcı barista"); };
  const fi = $("#fire"); if (fi) fi.onclick = () => { S.staff.assistant = false; save(); re(); };
  if (hubTab === "loans") bindLoans(R, re);
  $("#goalBtn").onclick = () => renderGoal();
  const hx = $("#hubX"); if (hx) hx.onclick = () => closeOverlay("#ovHub");
  const hbk = $("#hubBack"); if (hbk) hbk.onclick = () => { dayFlow = "supply"; $("#ovHub").classList.remove("on"); renderSupply(); openOverlay("#ovShop"); };
  $("#hubNext").onclick = () => { if (!flow) return closeOverlay("#ovHub"); dayFlow = "price"; $("#ovHub").classList.remove("on"); renderPrices(); openOverlay("#ovPrice"); };
}
function renderGoal() {
  const next = D.shopLevels[S.shopLevel + 1];
  let html = `<h2>🎯 Ana hedef<span class="x" id="goalX">✕</span></h2>`;
  if (!next) html += `<p>Prototipteki en büyük dükkandasın: ${"★".repeat(shop().stars)} ${shop().name}.</p>`;
  else {
    const ok = (c, t) => `<div class="req ${c ? "ok" : ""}">${t} ${c ? "✓" : ""}</div>`;
    html += `<p>Sıradaki dükkan: <b>${"★".repeat(next.stars)} ${next.name}</b></p>` + ok(S.money >= next.money, `Kasa ₺${S.money} / ₺${next.money}`) + ok(S.rep >= next.rep, `İtibar ${S.rep} / ${next.rep}`) + ok(!(S.debt > 0), S.debt > 0 ? `Borç yok (şu an ₺${S.debt})` : "Borç yok");
    const opens = Object.values(D.drinks).filter(d => (d.shop || 1) === next.stars).map(d => d.name).concat(Object.values(D.tools).filter(t => t.stars === next.stars).map(t => t.name), Object.values(D.equipment).filter(e => e.stars === next.stars).map(e => e.name));
    html += `<p class="muted">Açar: sıra ${next.maxQueue} kişi, günde ${next.customersPerDay} müşteri · haftalık kira ₺${next.rent}${opens.length ? " · " + opens.join(", ") : ""}. Aldığın aletler ve makineler yeni dükkana taşınır.</p>`;
    const can = S.money >= next.money && S.rep >= next.rep && !(S.debt > 0);
    html += `<div class="row"><button class="pri" id="lvUp" ${can ? "" : "disabled"}>Seviye atla</button></div>`;
  }
  $("#goalCard").innerHTML = html; openOverlay("#ovGoal");
  $("#goalX").onclick = () => closeOverlay("#ovGoal");
  const up = $("#lvUp"); if (up) up.onclick = () => { S.shopLevel++; S.log.push("Gün " + S.day + ": " + shop().name); AUDIO.sfx("unlock"); checkUnlocks(); save(); renderHUD(); closeOverlay("#ovGoal"); renderHub();
    modal(`<h3>${"★".repeat(shop().stars)} ${shop().name}</h3><p>Sıra en fazla ${shop().maxQueue} kişi, günde ${shop().customersPerDay} müşteri, haftalık kira ₺${shop().rent}. Yeni geliştirmeler, aletler ve kredi limiti (₺${shop().loanLimit}) açıldı.</p>`); };
}

// --- Fiyatlar (§8) ---
function renderPrices() {                                                         // §8 lira ile elle ayar; müşteri tepkisi söylenmez
  const flow = dayFlow === "price", list = S.unlocked.filter(hasTools), maxP = id => Math.max(2, Math.round(defaultPrice(id) * D.pricing.max));
  let html = `<h2>Fiyatlar${flow ? "" : '<span class="x" id="prX">✕</span>'}</h2><p class="muted">Fiyatı lira olarak artır ya da azalt. Müşterilerin tepkilerini dükkanda izle: "çok pahalı" deyip gidiyorlarsa düşür, "ucuz" diyorlarsa artırabilirsin. Değişiklik sıradaki müşteriden itibaren geçerlidir.</p><table class="ptable">
    <tr><th>Tarif</th><th>Maliyet</th><th>Senin fiyatın</th></tr>`;
  html += list.map(id => { const p = priceOf(id), zs = D.drinks[id].sizes || ["single"], base = zs[0];
    const others = zs.slice(1).map(z => `${SZ(z).label} ₺${sizePrice(id, z)}`).join(" · ");   // §8 diğer boylar tek/küçükten hesaplanır
    return `<tr><td><b>${D.drinks[id].name}</b> <span class="muted">(${SZ(base).label})</span>${others ? `<br><span class="muted">${others} · otomatik</span>` : ""}</td><td class="num">₺${sizeCost(id, base).toFixed(1)}</td>
      <td><div class="pbtns"><button data-pd="${id}" ${p <= 1 ? "disabled" : ""}>−₺1</button><input type="number" class="pin" data-pi="${id}" min="1" max="${maxP(id)}" value="${p}"><button data-pu="${id}" ${p >= maxP(id) ? "disabled" : ""}>+₺1</button></div></td></tr>`; }).join("");
  html += `</table>${S.unlocked.filter(id => !hasTools(id)).length ? `<p class="muted">Aleti eksik olduğu için menüde olmayan: ${S.unlocked.filter(id => !hasTools(id)).map(id => D.drinks[id].name).join(", ")} (Dükkan › Aletler & Makineler).</p>` : ""}
    <div class="row">${flow ? '<button id="prBack">← Geri</button>' : ""}<button class="pri" id="prNext">${flow ? "Günü başlat ☕" : "Kapat"}</button></div>`;
  $("#priceCard").innerHTML = html;
  const R = $("#priceCard"), set = (id, v) => { S.priceTL = S.priceTL || {}; S.priceTL[id] = Math.round(clamp(v, 1, maxP(id))); save(); renderPrices(); };
  R.querySelectorAll("[data-pd]").forEach(b => b.onclick = () => set(b.dataset.pd, priceOf(b.dataset.pd) - 1));
  R.querySelectorAll("[data-pu]").forEach(b => b.onclick = () => set(b.dataset.pu, priceOf(b.dataset.pu) + 1));
  R.querySelectorAll("[data-pi]").forEach(i => i.onchange = () => { const v = Math.floor(+i.value); if (v > 0) set(i.dataset.pi, v); else renderPrices(); });
  const px = $("#prX"); if (px) px.onclick = () => closeOverlay("#ovPrice");
  const pbk = $("#prBack"); if (pbk) pbk.onclick = () => { dayFlow = "hub"; $("#ovPrice").classList.remove("on"); renderHub(); openOverlay("#ovHub"); };
  $("#prNext").onclick = () => { if (!flow) return closeOverlay("#ovPrice"); dayFlow = null; mandatoryRestock = false; $("#ovPrice").classList.remove("on"); startDay(); };
}

// --- §8 Kahve borsası: haftalık değişim + gazete ---
function updateMarket() {
  S.market = S.market || {}; const M = D.market, ch = [];
  Object.keys(D.drinks).forEach(id => { const old = marketIdx(id), nw = clamp(old * (1 + (Math.random() * 2 - 1) * M.weeklyMax), M.min, M.max); S.market[id] = Math.round(nw * 100) / 100; ch.push([id, S.market[id] / old - 1]); });
  return ch.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, M.news);
}
function showNews(week, ch, next, back) {
  modal(`<div class="news"><div class="nhead">KAHVE GAZETESİ<span>${week}. Hafta · Borsa</span></div>` + ch.map(([id, c]) => `<p><b>${D.drinks[id].name} fiyatları %${Math.abs(Math.round(c * 100))} ${c >= 0 ? "arttı ▲" : "düştü ▼"}</b><br><span class="muted">Müşteriler artık ${D.drinks[id].name.toLowerCase()} için ${c >= 0 ? "biraz daha yüksek" : "biraz daha düşük"} fiyatı makul buluyor (endeks ×${marketIdx(id).toFixed(2)}).</span></p>`).join("") + `</div>`,
    (back ? [{ label: "← Geri", fn: back }] : []).concat([{ label: "Devam", pri: true, fn: next }]));
}

// §3 Defterde tarif resimleri: içeceğin kesiti (öğrenilmemiş → gri silüet + ???)
const DRINK_ART = {
  espresso:   { kind: "cup",   layers: [["#3b1f0e", .45], ["#c48a4a", .1]] },
  turkish:    { kind: "cup",   layers: [["#2a1408", .55], ["#a8784a", .14]] },
  frenchpress:{ kind: "mug",   layers: [["#3a2010", .7], ["#6a4424", .04]] },
  filter:     { kind: "mug",   layers: [["#5a3418", .75]] },
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
    <div class="box"><h4>Ekran ve uygulama</h4>
      <div class="row" style="justify-content:flex-start;margin-top:0"><button id="setFull">${isFull() ? "⛶ Tam ekrandan çık" : "⛶ Tam ekran"}</button>${installEvt ? '<button id="setInstall">📲 Uygulamayı yükle</button>' : ""}</div>
      <p class="muted">${isStandalone() ? "Oyun uygulama olarak açık ✓" : inFrame() ? `Oyun şu an başka bir sayfanın içinde açık; uygulama olarak yüklemek için oyunu kendi adresinden aç: <b>${PAGES_URL}</b> (Android Chrome: menü › Uygulamayı yükle).` : installEvt ? "Bu cihaza CoffeBean uygulaması olarak yükleyebilirsin; yüklü uygulama tam ekran açılır." : "Tarayıcı menüsünden \"Ana ekrana ekle / Uygulamayı yükle\" ile yükleyebilirsin."}</p></div>
    <div class="box"><h4>Kayıtlar</h4><p class="muted">Kaydı dosya olarak saklayabilir ya da bir dosyadan yuvaya aktarabilirsin.</p>
      <div class="row" style="justify-content:flex-start"><button id="setExport">Kaydı dışa aktar</button><button id="setImport">Kaydı içe aktar</button></div></div>
    ${cheatUnlocked() ? `<div class="box"><label class="setrow" style="cursor:pointer"><input type="checkbox" id="setCheat" ${cheatOn() ? "checked" : ""}> 🧪 Hile modu (test için)</label></div>` : ""}`;
  $("#setX").onclick = () => closeOverlay("#ovSettings");
  $("#volMusic").oninput = e => AUDIO.setMusic(+e.target.value / 100);
  $("#volSfx").oninput = e => { AUDIO.setSfx(+e.target.value / 100); AUDIO.sfx("click"); };
  $("#muteAll").onchange = e => AUDIO.setMuted(e.target.checked);
  $("#setExport").onclick = () => $("#btnExport").click();
  $("#setFull").onclick = () => { toggleFull(); setTimeout(renderSettings, 400); };
  const si = $("#setInstall"); if (si) si.onclick = doInstall;
  $("#gfxGpu").onchange = e => { GFX.gpu = e.target.checked; saveGfx(); $("#gfxRestart").style.display = ""; };
  $("#gfxReload").onclick = () => { save(); location.reload(); };
  $("#settingsCard").querySelectorAll("[data-q]").forEach(b => b.onclick = () => { GFX.quality = b.dataset.q; saveGfx(); SCENE.setQuality(GFX.quality); CLOSEUP.setQuality(GFX.quality);
    if (S) renderScene(0); else idleLoop(); renderSettings(); });
  $("#setImport").onclick = () => { closeOverlay("#ovSettings"); $("#fileImport").click(); };
  const sc = $("#setCheat"); if (sc) sc.onchange = e => { setCheat(e.target.checked); };
}

// ---------- Hile modu (geliştirici testi): menüde "cheat" yaz / sürüm yazısına 5 kez dokun ----------
const BILL = `<svg viewBox="0 0 48 28" width="54" height="32" aria-hidden="true"><rect x="1.5" y="1.5" width="45" height="25" rx="4" fill="#4f9a44" stroke="#2f6b2a" stroke-width="2"/><rect x="6" y="6" width="36" height="16" rx="2.5" fill="none" stroke="#bfe6b2" stroke-width="1.4"/><circle cx="24" cy="14" r="5.5" fill="#bfe6b2"/><text x="24" y="17.6" text-anchor="middle" font-size="9" font-weight="800" fill="#2f6b2a">₺</text><circle cx="10.5" cy="14" r="1.6" fill="#bfe6b2"/><circle cx="37.5" cy="14" r="1.6" fill="#bfe6b2"/></svg>`;   // §7 yeşil kağıt para ikonu
const cashBox = () => `<div class="cash">${BILL}<span>₺${S.money}</span><small>Kasa</small></div>`;
const LSG = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, LSS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const cheatUnlocked = () => LSG("cb_cheatUnlocked") === "1", cheatOn = () => cheatUnlocked() && LSG("cb_cheat") === "1";
function setCheat(on) { LSS("cb_cheat", on ? "1" : "0"); renderCheats(); toast(on ? "🧪 Hile modu açık" : "Hile modu kapalı"); }
function unlockCheat() { LSS("cb_cheatUnlocked", "1"); setCheat(true); AUDIO.sfx("unlock"); }
let cheatBuf = "", verTaps = [];
document.addEventListener("keydown", e => { if ($("#menu").style.display === "none" || !e.key || e.key.length !== 1) return; cheatBuf = (cheatBuf + e.key.toLowerCase()).slice(-5); if (cheatBuf === "cheat") { cheatBuf = ""; unlockCheat(); } });
// telefonda: ana menüde ekrana parmakla 3 kez hızlıca dokun (fareyle tıklama sayılmaz)
$("#menu").addEventListener("pointerdown", e => { if (e.pointerType !== "touch") return; const t = performance.now(); verTaps = verTaps.filter(x => t - x < 700).concat(t); if (verTaps.length >= 3) { verTaps = []; unlockCheat(); } });
function cheatAutoOrder() {
  if (!day) return toast("Önce günü başlat");
  let o = day.orders[day.active];
  if (!o) { const c = queueOf()[0]; if (!c) return toast("Sırada müşteri yok"); if (!c.say) c.say = orderLine(c); takeOrder(c.id); o = day.orders[day.active]; if (!o) return; }
  if (o.selecting) prepareOrder(o, o.cust.drink, o.cust.size);
  o.mismatch = false; o.all.forEach(st => { o.scores[st] = 100; }); o.i = o.steps.length; AUDIO.stopLoops(); o.reviewing = false; serve(o);
}
function cheatEndDay() { if (!day) return toast("Gün başlamadı"); AUDIO.stopLoops(); day.toSpawn = 0; day.orders = []; day.asst = null; day.customers = []; day.tutorialActive = false; renderBench(); endDay(); }
const CHEATS = [
  ["💰 +₺1000", () => { S.money += 1000; }], ["⭐ +50 itibar", () => { S.rep += 50; }], ["🎓 +100 XP", () => { S.xp += 100; checkUnlocks(); }],
  ["☕ Siparişi kendisi yap", cheatAutoOrder], ["🚶 Müşteri getir", () => { if (!day) return toast("Önce günü başlat"); day.tutorialActive = false; spawnCustomer(); layout(); }],
  ["🌙 Günü bitir", cheatEndDay], ["🏠 Kira gününe atla", () => { if (day) return toast("Gün içinde değil, gün aralarında kullan"); S.day = Math.ceil(S.day / 7) * 7; }],
  ["📦 Stokları doldur", () => { openBeans().forEach(id => { S.beans[id] = { kg: beanKg(id) + 5, boughtDay: S.day }; }); S.milk = (S.milk || 0) + 10; S.milkAlt = S.milkAlt || {}; openMilks().forEach(k => { if (k !== "cow") S.milkAlt[k] = (S.milkAlt[k] || 0) + 10; }); S.milkDay = S.day; Object.keys(D.cups).forEach(k => S.cups[k] = (S.cups[k] || 0) + 50); Object.keys(D.extras).forEach(k => S.extras[k] = (S.extras[k] || 0) + 100); }],
  ["☕ Sıradaki tarifi aç", () => { const id = nextRecipe(); if (!id) return toast("Tüm tarifler zaten açık"); S.unlocked.push(id); (S.unlockDay = S.unlockDay || {})[id] = S.day; S.perfect[id] = S.perfect[id] || 0; AUDIO.sfx("unlock"); toast("Yeni tarif açıldı: " + D.drinks[id].name); }],
  ["📖 Tüm tarifler + aletler", () => { S.unlocked = Object.keys(D.drinks); Object.keys(D.tools).forEach(k => S.tools[k] = true); }],
  ["🏪 Dükkan seviyesi atla", () => { if (S.shopLevel < D.shopLevels.length - 1) S.shopLevel++; else toast("En üst seviye"); }]
];
function refreshOpenScreen() {                                                    // hile sonrası açık gün sonu ekranını yenile
  const on = x => $(x).classList.contains("on");
  if (on("#ovShop")) renderSupply(); if (on("#ovHub")) renderHub(); if (on("#ovPrice")) renderPrices();
  if (on("#ovLedger") && endCtx) { if ($("#ledgerCard .rentbig")) backToRent(); else backToLedger(); }
}
function renderCheats() {
  let el = $("#cheats"); if (!el) { el = document.createElement("div"); el.id = "cheats"; document.body.appendChild(el); }
  if (!S || !cheatOn()) { el.style.display = "none"; return; }
  el.style.display = ""; el.innerHTML = `<div class="chead" id="cheatToggle">🧪 Hileler ${el.dataset.min ? "▸" : "▾"}</div>` + (el.dataset.min ? "" : CHEATS.map(([n], i) => `<button data-ch="${i}">${n}</button>`).join(""));
  // tut-sürükle: başlıktan tutup taşı (kısa dokunuş = küçült/büyüt); yer hatırlanır
  try { const p = JSON.parse(LSG("cb_cheatPos") || "null"); if (p) Object.assign(el.style, { left: p.x + "px", top: p.y + "px", right: "auto", bottom: "auto", transform: "none" }); } catch (e) {}
  const h = $("#cheatToggle"); let drag = null;
  h.onpointerdown = e => { const r = el.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false }; try { h.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); };
  h.onpointermove = e => { if (!drag) return; if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true; if (!drag.moved) return;
    const x = clamp(e.clientX - drag.dx, 0, innerWidth - el.offsetWidth), y = clamp(e.clientY - drag.dy, 0, innerHeight - 40);
    Object.assign(el.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto", transform: "none" }); };
  h.onpointerup = h.onpointercancel = () => { if (!drag) return; const moved = drag.moved; drag = null;
    if (moved) { const r = el.getBoundingClientRect(); LSS("cb_cheatPos", JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) })); return; }
    if (el.dataset.min) delete el.dataset.min; else el.dataset.min = "1"; renderCheats(); };
  el.querySelectorAll("[data-ch]").forEach(b => b.onclick = () => { try { CHEATS[+b.dataset.ch][1](); } catch (e) { console.error(e); toast("Hile hatası: " + e.message); } save(); renderHUD(); refreshOpenScreen(); });
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

// ---------- §12 Tam ekran + uygulama olarak yükleme (PWA) ----------
const PAGES_URL = "https://bogacavdar.github.io/coffebean/";
let installEvt = null;
const inFrame = () => { try { return window.self !== window.top; } catch (e) { return true; } };
const isStandalone = () => matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFull() {
  try {
    if (isFull()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!rq) throw 0;
    const pr = rq.call(el, { navigationUI: "hide" }); if (pr && pr.catch) pr.catch(() => toast(inFrame() ? "Bu görünüm tam ekrana izin vermiyor; oyunu kendi adresinden aç." : "Tarayıcı tam ekrana izin vermedi."));
  } catch (e) { toast(inFrame() ? "Bu görünüm tam ekrana izin vermiyor; oyunu kendi adresinden aç." : "Bu tarayıcı tam ekranı desteklemiyor (iPhone'da: Paylaş › Ana Ekrana Ekle)."); }
}
function doInstall() { if (!installEvt) return; installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; $("#btnInstall").style.display = "none"; }); }
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#btnInstall").style.display = ""; });
window.addEventListener("appinstalled", () => { installEvt = null; $("#btnInstall").style.display = "none"; toast("CoffeBean yüklendi ☕"); });
document.addEventListener("fullscreenchange", () => { $("#btnFull").textContent = isFull() ? "⛶ Tam ekrandan çık" : "⛶ Tam ekran"; });
try { if ("serviceWorker" in navigator && location.protocol === "https:" && !inFrame()) navigator.serviceWorker.register("sw.js"); } catch (e) {}

// ---------- §12 Kayıt yuvaları ----------
// §12 yeni oyunda zorluk seçimi
function chooseDifficulty(fn) {
  modal(`<h3>Zorluk seç</h3><div class="diffs">${Object.entries(D.difficulty).map(([k, d]) => `<button class="diff ${k}" data-diff="${k}"><b>${d.label}</b><span>${d.desc}</span></button>`).join("")}</div>`, [{ label: "Vazgeç" }]);
  $("#modalCard").querySelectorAll("[data-diff]").forEach(b => b.onclick = () => { $("#ovModal").classList.remove("on"); AUDIO.sfx("click"); fn(b.dataset.diff); });
}
function slotSummary(x) {
  if (!x) return `<b>Boş yuva</b><span class="muted">Henüz kayıt yok</span>`;
  if (x.bankrupt) return `<b>💀 İflas etti (Gün ${x.day})</b><span class="muted">Bu kayıt yüklenemez; silebilir ya da üstüne yeni oyun açabilirsin.</span>`;
  const lv = D.shopLevels[x.shopLevel || 0], when = x.savedAt ? new Date(x.savedAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  return `<b>${weekday(x.day)} · ${weekNo(x.day)}. Hafta (Gün ${x.day})</b><span class="muted">${(D.difficulty[x.diff || "normal"] || D.difficulty.normal).label} · ₺${x.money} · ${"★".repeat(lv.stars)} ${lv.name} · kaydedildi ${when}</span>`;
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
    if (act === "new") confirmOver(i, "yeni", () => { closeOverlay("#ovSlots"); chooseDifficulty(d => begin(newState(d), i)); });
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
  mandatoryRestock = false; dayFlow = null; firstSupply = false; ["#ovShop", "#ovHub", "#ovPrice", "#ovLoan", "#ovGoal"].forEach(x => $(x).classList.remove("on")); $("#sheet").classList.remove("on");
  ["#hud", "#hint", "#icons", "#task", "#openDay", "#orders"].forEach(x => $(x).style.display = "none");
  S = null; renderCheats(); $("#exitBtn").style.display = "none"; $("#menu").style.display = "flex"; refreshMenu(); idleLoop(); AUDIO.startMusic("menu");
}

// ---------- Başlat ----------
function begin(state, slot) {
  if (slot) curSlot = slot; S = state; if (S.milk == null) S.milk = 0; mandatoryRestock = false; S.bean = "brazil"; if (!S.milkAlt) S.milkAlt = {};
  ["debt", "streak"].forEach(k => { if (S[k] == null) S[k] = 0; }); ["staff", "decor", "traffic", "market"].forEach(k => { if (!S[k]) S[k] = {}; });
  if (!S.tools) { S.tools = {}; S.unlocked.forEach(id => (D.drinks[id].needs || []).forEach(t => { if (D.tools[t].stars <= shop().stars) S.tools[t] = true; })); }   // eski kayıt: açık tariflerin aletleri hediye
  if (!S.extras) S.extras = Object.fromEntries(Object.keys(D.extras).map(k => [k, 20]));   // §7 eski kayıt: küçük malzemeler
  if (!S.cups) S.cups = { espS: 20, espD: 10, cupS: 20, cupM: 10, cupL: 10 };   // §7 eski kayıt: başlangıç bardakları
  if (!S.loans) { S.loans = []; if (S.debt > 0) { S.loanSeq = 1; S.loans.push({ id: 1, amount: Math.round(S.debt / (1 + D.economy.loanInterest)), owe: S.debt, rem: S.debt, day: S.day, due: (S.debtDue || S.day + D.economy.rentLoanDays) }); } } syncDebt(); if (!S.milkDay) S.milkDay = S.day;
  AUDIO.startMusic("game");
  $("#menu").style.display = "none"; $("#hud").style.display = "flex"; $("#hint").style.display = "block"; $("#icons").style.display = "flex";
  day = null; renderHUD(); renderBench(); renderCheats(); $("#exitBtn").style.display = "";
  lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  const firstDay = S.day === 1 && !S.taught.includes("first");                   // §11 ilk gün Günü başlat yok: Devral'la kendiliğinden başlar
  if (!S.taught.includes("intro")) { S.taught.push("intro"); modal(`<h3>Yıldız Teyze</h3><p>${D.tutorial.intro}</p>`, [{ label: "Devral", pri: true, fn: () => { if (firstDay && !day) { if (restockOk()) startDay(); else openFirstSupply(); } } }]); }
  else if (firstDay) setTimeout(() => { if (S && !day) { if (restockOk()) startDay(); else openFirstSupply(); } }, 400);
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
$("#scene").addEventListener("pointerdown", e => { if (!day) return; const r = e.currentTarget.getBoundingClientRect(); const id = SCENE.hitTest(e.clientX - r.left, e.clientY - r.top); if (!id) return;
  const oi = day.orders.findIndex(o => o.cust.id === id); if (oi >= 0) { const o = day.orders[oi]; o.hidden = false; day.active = oi; AUDIO.sfx("click"); renderBench(); return; }   // §7 kapatılan siparişe müşteriye dokunarak dön
  takeOrder(id); });
// §7 hazırlama ekranının dışına dokununca ekran kapanır; sipariş kaldığı yerde bekler (oynanan adım duraklar)
$("#sheet").addEventListener("pointerdown", e => { if (e.target !== $("#sheet") || !day) return; const o = day.orders[day.active]; if (!o || o.tutorial) return;
  AUDIO.stopLoops(); o.hidden = true; if (o.phase === "run") { o.phase = "ready"; o.v = 0; }
  $("#sheet").classList.remove("on"); toast("Sipariş bekliyor; devam etmek için müşteriye dokun"); });
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
$("#btnFull").onclick = () => toggleFull();
$("#btnInstall").onclick = doInstall;
if (isStandalone()) $("#btnFull").style.display = "none";
// §12 Çıkış: oyun içinde sağ üst ⏻ (Kaydet / Ana menüye dön / Çıkış), menüde Çıkış
function quitGame() {
  if (S) save(); AUDIO.stopLoops(); try { AUDIO.stopMusic && AUDIO.stopMusic(); } catch (e) {}
  try { window.close(); } catch (e) {}
  setTimeout(() => { if (!window.closed) { $("#quitScreen").style.display = "flex"; } }, 250);
}
$("#quitBack").onclick = () => { $("#quitScreen").style.display = "none"; if (S) goMenu(); else { refreshMenu(); AUDIO.startMusic("menu"); } };
$("#btnQuit").onclick = () => { AUDIO.sfx("click"); quitGame(); };
$("#exitBtn").onclick = () => { AUDIO.sfx("open"); modal(`<h3>Çıkış</h3><p class="muted">Oyun her durumda oynanan yuvaya kaydedilir.</p>`, [
  { label: "💾 Kaydet", fn: () => { save(); toast("Yuva " + curSlot + "'e kaydedildi"); AUDIO.sfx("register"); } },
  { label: "🏠 Ana menüye dön", fn: () => goMenu() }, { label: "⏻ Çıkış", pri: true, fn: quitGame }, { label: "Vazgeç" }]);
  $("#modalCard .mrow").classList.add("col"); };   // düğmeler alt alta
// §12 Esc oyun sırasında Çıkış düğmesi gibi: pencereyi açar, açıkken kapatır
let exitOpen = false;
document.addEventListener("keydown", e => { if (e.key !== "Escape" || !S || $("#exitBtn").style.display === "none" || $("#quitScreen").style.display === "flex") return;
  e.preventDefault(); const ov = $("#ovModal");
  if (ov.classList.contains("on") && exitOpen) { ov.classList.remove("on"); exitOpen = false; return; }
  if (ov.classList.contains("on")) return;                                         // başka bir pencere açıksa (ör. Yıldız Teyze vedası) Esc onu ezmez
  $("#exitBtn").click(); exitOpen = true; });
$("#btnSettings").onclick = () => { AUDIO.startMusic("menu"); AUDIO.sfx("open"); renderSettings(); openOverlay("#ovSettings"); };
// §11 ana menü müziği: tarayıcının izin verdiği ilk dokunuşta başlar
document.addEventListener("pointerdown", () => { if (!S) AUDIO.startMusic("menu"); }, { once: true });
$("#icMenu").onclick = () => { AUDIO.sfx("open"); renderGameMenu(); openOverlay("#ovGameMenu"); };
["ovSlots", "ovGameMenu", "ovHub", "ovPrice", "ovLoan", "ovGoal"].forEach(id => $("#" + id).addEventListener("click", e => { if (e.target.id === id) closeOverlay("#" + id); }));
window.addEventListener("resize", () => { if (S) renderScene(0); else idleLoop(); });
// §12 Devam: en son kaydedilen (iflas etmemiş) yuva
function latestSlot() { let best = 0, t = -1; for (let i = 1; i <= 3; i++) { const x = loadSlot(i); if (x && !x.bankrupt && (x.savedAt || 0) > t) { t = x.savedAt || 0; best = i; } } return best; }
function refreshMenu() { try { $("#btnContinue").disabled = !anySlot(); const i = latestSlot(), r = $("#btnResume"), n = $("#btnNew");
    if (i) { const x = loadSlot(i); r.style.display = ""; $("#resumeInfo").textContent = `Yuva ${i} · ${weekday(x.day)} · Gün ${x.day} · ₺${x.money}`; n.classList.remove("pri"); }
    else { r.style.display = "none"; n.classList.add("pri"); } } catch (e) {} $("#menuVer").textContent = "Sürüm " + D.version; }
$("#btnResume").onclick = () => { const i = latestSlot(); if (!i) return refreshMenu(); const x = loadSlot(i); AUDIO.sfx("open"); begin(x, i); };
// §12 otomatik kayıt: tarayıcı kapanırken / sekme gizlenirken
window.addEventListener("pagehide", () => save());
window.addEventListener("beforeunload", () => save());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });
refreshMenu();
// Menü açıkken de sahne boş dükkan olarak arkada dönsün
function idleLoop() { if (!S) SCENE.draw({ customers: [], orders: [], t: 0.35, level: 1, slots: 1 }, 0); }   // §12 performans: menüde sahne bir kez çizilir
idleLoop();
window.CEKIRDEK = { state: () => S, day: () => day };   // hata ayıklama
})();
