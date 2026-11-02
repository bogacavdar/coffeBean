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
const DAY_SECONDS = 150;            // v0.24: 150 sn – sakin "cozy" tempo (müşteri sayısı aynı, geliş aralığı uzadı)
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
    debt: 0, staff: {}, decor: {}, streak: 0, milkDay: 1, traffic: {}, tools: {}, market: {}, loans: [], cups: Object.assign({}, D.startCups), extras: Object.fromEntries(Object.keys(D.extras).map(k => [k, typeof D.extrasStart === "object" ? (D.extrasStart[k] || 0) : D.extrasStart])), econ: D.econScale, lessonMig: 1, syr: {}, cbBrewing: 0
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
// v0.24: tarif başına gerçek süt miktarı (milkL, L) ve kahvesiz tarifler (noBean: menengiç, salep, cold brew…)
const beanUse = (id, size) => D.drinks[id].noBean ? 0 : D.economy.beanPerCup * SZ(size).bean;
const milkUse = (id, size) => isMilky(id) ? (D.drinks[id].milkL ?? D.economy.milkPerCup) * SZ(size).milk : 0;
function unitCost(id) { const base = (D.drinks[id].sizes || ["single"])[0]; return sizeCost(id, base); }
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
const sizeCost = (id, size) => beanUse(id, size) * D.beans.brazil.price + milkUse(id, size) * D.economy.milkPrice + D.drinks[id].cost;
const cupsKnown = () => { const set = new Set(); S.unlocked.forEach(id => (D.drinks[id].sizes || ["single"]).forEach(z => set.add(SZ(z).cup))); return [...set]; };   // §7 açılan tariflerin tüm bardakları (listede görünür)
const cupsNeeded = () => { const set = new Set(); S.unlocked.filter(hasTools).forEach(id => (D.drinks[id].sizes || ["single"]).forEach(z => set.add(SZ(z).cup))); return [...set]; };
const needsMilk = () => S.unlocked.some(id => hasTools(id) && isMilky(id));
const restockOk = () => beanKg("brazil") >= D.economy.minBeans && (!needsMilk() || (S.milk || 0) >= D.economy.minMilk) && cupsNeeded().every(k => (S.cups[k] || 0) >= D.cupMin);
// §8 otomasyon: sahip olunan ekipmanların otomatik yaptığı adımlar
function autoSteps() { const set = new Set(); Object.keys(S.equipment).forEach(k => { if (S.equipment[k] && D.equipment[k] && D.equipment[k].auto) D.equipment[k].auto.forEach(x => set.add(x)); }); return set; }
// §5 latte art adımı 3★ dükkanda latte/cappuccino'ya eklenir
function stepsFor(id) { const d = D.drinks[id]; const st = d.steps.slice(); if (d.art && shop().stars >= 3) { if (st.includes("pour")) st[st.indexOf("pour")] = "art"; else st.splice(st.indexOf(st.includes("swirl") ? "swirl" : "milk") + 1, 0, "art"); } return st; }   // v0.24: latte art dökümün kendisidir
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
  S.money += x; syncDebt(); S.log.push("Gün " + S.day + ": bankadan ₺" + tl(x) + " kredi (" + days + " gün vade)"); AUDIO.sfx("register"); save();
}
const loanDays = x => (D.economy.loans.find(l => l.amount === x) || {}).days || D.economy.rentLoanDays;
const daysLeft = l => Math.max(0, l.due - S.day);
const nearestLoan = () => (S.loans || []).slice().sort((a, b) => a.due - b.due)[0];
const seasonNo = () => Math.floor(((S.day - 1) % 112) / 28);                      // v0.24: 0 Sonbahar · 1 Kış · 2 İlkbahar · 3 Yaz
const inSeason = id => !D.drinks[id].season || D.drinks[id].season.includes(seasonNo());
const tl = x => { const n = +x; return Number.isFinite(n) ? n.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : x; };   // v0.28: ₺ tutarlarında binlik ayracı (₺13.500)
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
// v0.42 §15 ilk kez karşılaşılan mekanik: Yıldız Teyze'nin defterinden ders (bir kez gösterilir)
const taught = k => !!S && S.taught.includes(k), teach = (...ks) => ks.forEach(k => { if (S && !S.taught.includes(k)) S.taught.push(k); });
let lessonQ = [];
function lesson(key, then) {
  if (!S || taught("L:" + key) || !D.lessons[key]) { if (then) then(); return false; }
  teach("L:" + key); save(); lessonQ.push({ key, then }); pumpLessons(); return true;
}
function pumpLessons() {
  if (!lessonQ.length) return;
  if ($("#ovModal").classList.contains("on")) { setTimeout(pumpLessons, 600); return; }
  const { key, then } = lessonQ.shift(), L = D.lessons[key];
  modal(`<h3>📖 ${L.t}</h3><p class="muted" style="margin:-6px 0 6px">Yıldız Teyze'nin defterinden</p><p>${L.h}</p>`, [{ label: "Anladım", pri: true, fn: () => { if (then) then(); setTimeout(pumpLessons, 60); } }]);
}
function stepLessonKey(o, s) {                                                    // hazırlama adımının dersi (öğretici ve otomatik adımlar hariç)
  if (o.tutorial || o.assist || (o.auto && o.auto.has(s))) return null;
  let k = s;
  if (s === "milk" && DR(o).milk !== "hot") k = "milk2";
  else if (s === "tkfoam" && taught("mg:tkfoam") && (S.served[o.drink] || 0) >= 3) k = "tkfoamBlind";
  else if (s === "grind" && taught("mg:grind") && !o.pregrindAsk) k = "pregrind";
  else if (s === "extract" && taught("mg:extract") && S.equipment.dualGroup) k = "dual";
  return taught("mg:" + k) ? null : k;
}
const stepLessonHTML = (k, s) => { const L = D.lessons.steps[k]; return `<b>${L ? L.t : D.minigames[s].name}.</b> ${L ? L.h : D.minigames[s].hint}`; };
function lessonGate(o, s, k) {                                                    // ders okunana kadar adım başlamaz, saat ve sabır durur
  const el = $("#mgBody"), b = $("#zB"), prev = o.phase; o.phase = "intro"; window.CB_LESSON = true;
  if (b) b.style.display = "none";
  const html = `<button class="hold big pri pulse" id="lesOk">Anladım</button>`;
  if (b) b.insertAdjacentHTML("beforebegin", html); else el.insertAdjacentHTML("beforeend", html);
  $("#lesOk").onclick = () => { if (o.phase !== "intro") return; $("#lesOk").remove(); if (b) b.style.display = ""; o.phase = prev; window.CB_LESSON = false; teach("mg:" + k); save(); AUDIO.sfx("click"); };
}
function renderHUD() {
  const hd = endCtx ? endCtx.dayNum : S.day;                                      // v0.30: gün sonu akışında HUD kapanan günü gösterir (saat "Kapanış")
  $("#hDay").textContent = weekday(hd); $("#hWeek").textContent = " · " + weekNo(hd) + ". Hafta · " + D.seasons[seasonNo()];
  const dr = daysToRent(hd), rp = rentPaid(hd); $("#hRent").textContent = rp ? "Kira ödendi ✓" : dr === 0 ? "Kira bugün: ₺" + tl(shop().rent) : "Kiraya " + dr + " gün";
  $("#hRent").classList.toggle("warn", !rp && dr <= 1);
  const nl = nearestLoan(), dl = nl ? daysLeft(nl) : 9;
  $("#hDebt").style.display = S.debt > 0 ? "" : "none"; $("#hDebt").innerHTML = "Borç ₺" + tl(S.debt) + (nl ? `<span class="hx"> · en yakın vade ${dl === 0 ? "bugün!" : dl + " gün"}</span>` : "");
  $("#hDebt").classList.toggle("warn", dl <= 2);
  $("#hStreak").style.display = (S.streak || 0) >= 2 ? "" : "none"; $("#hStreak").innerHTML = "🔥 Seri " + S.streak + `<span class="hx"> · bahşiş ×${streakMult().toFixed(1).replace(".", ",")}</span>`;
  const nx = nextRecipe(), el = $("#hNext");                       // §3 "Yeni tarife X kahve daha"
  if (!nx) el.textContent = "Tüm tarifler açık ✓";
  else { const d = D.drinks[nx], left = d.unlockCups - recipeProg(); el.textContent = (d.shop || 1) > shop().stars ? `Yeni tarif için ${d.shop}★ dükkan` : left > 0 ? `Yeni tarife ${left} kahve daha` : "Yeni tarif açılıyor"; }
  renderTask();
  $("#hClock").textContent = day ? clockStr(day.t / DAY_SECONDS) : (endCtx || dayFlow) && !firstSupply ? "Kapanış" : clockStr(0); lastClock = "";
  $("#hMoney").textContent = tl(S.money); $("#hRep").textContent = S.rep;
  $("#hStars").textContent = "★".repeat(shop().stars) + "☆".repeat(D.shopLevels.length - shop().stars);
  const r = rank(); const next = D.ranks.find(x => x.xp > S.xp);
  $("#hRank").textContent = r.name + " · XP " + S.xp + (next ? "/" + next.xp : "");
  const milkTxt = needsMilk() ? ` · Süt ${(S.milk || 0).toFixed(1).replace(".", ",")}L` : "";
  $("#hStock").textContent = "Brezilya " + beanKg("brazil").toFixed(2).replace(".", ",") + "kg" + milkTxt;
  $("#shopBadge").style.display = !restockOk() ? "inline-block" : "none";
  $("#openDay").style.display = canOpenDay() ? "" : "none";   // §11 ilk gün düğme yok
  sceneInsets();
}
const canOpenDay = () => !!S && !day && !dayFlow && !mandatoryRestock && !endCtx && !(S.day === 1 && !S.taught.includes("first"));
// v0.30 §11 telefon dikey: sahne kamerası HUD'un altında ve alt ikonların üstünde kalan alana kadrajlanır
const portraitPhone = () => matchMedia("(orientation:portrait) and (max-width:620px)").matches;
const smallPhone = () => portraitPhone() || matchMedia("(orientation:landscape) and (max-height:520px)").matches;   // hazırlama paneli sığdırma: dikey + yatay telefon
function sceneInsets() { if (!SCENE.setInsets) return; const h = $("#hud"), r = h && h.style.display !== "none" ? h.getBoundingClientRect() : null; const ic = $("#icons"), ir = portraitPhone() && ic && ic.style.display !== "none" ? ic.getBoundingClientRect() : null;
  const row = ir && ir.width > ir.height; SCENE.setInsets({ top: r ? r.bottom : 0, right: ir && !row ? Math.max(0, innerWidth - ir.left) : 0, iconTop: ir ? ir.top : 0 });   // v0.38: ikonlar altta sıra olunca sağ boşluk yok   // v0.30: balon/etiketler sağdaki ikon sütununun solunda kalır
  if (r) document.documentElement.style.setProperty("--hudb", Math.round(r.bottom) + "px"); }

// ---------- Açılım (§3, §9) ----------
// §3 tarif açılımı: satılan toplam kahve sayısı (kümülatif artan eşikler) + gerekirse dükkan seviyesi
const totalSold = () => Object.values(S.served || {}).reduce((a, b) => a + b, 0);
// §6 çekirdek çeşitleri ve süt türleri
const beanOpen = id => { const b = D.beans[id]; return b && (b.unlock || 1) <= shop().stars && recipeProg() >= (b.cups || 0); };   // v0.35: 5 dükkana eşit dağılım; eşik tarif ilerlemesiyle (dükkan dolunca durur)
const openBeans = () => Object.keys(D.beans).filter(beanOpen).sort((a, b) => (D.beans[a].unlock || 1) - (D.beans[b].unlock || 1) || (D.beans[a].cups || 0) - (D.beans[b].cups || 0));
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
const specStock = k => k === "sugar" ? (S.extras.sugar || 0) : ((S.syr || {})[k] || 0);   // v0.24: tek şeker stoku
const specName = k => (D.specials[k] || D.extras[k] || { name: k }).name;
function useSpecials(drink, size) { S.syr = S.syr || {}; Object.entries(specNeeds(drink, size)).forEach(([k, n]) => { if (k === "sugar") { S.extras.sugar = Math.max(0, (S.extras.sugar || 0) - n); return; } S.syr[k] = Math.max(0, (S.syr[k] || 0) - n); }); }
const specialOpen = k => { const sp = D.specials[k]; if (!sp) return false; return (sp.tool && S.tools[sp.tool]) || S.unlocked.some(id => (D.drinks[id].uses || []).some(([x]) => x === k)); };
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
  modal(`<h3>${nb.length ? "Yeni çekirdek" + (nm.length ? " ve süt" : "") : "Yeni süt"}</h3>` + nb.map(id => `<p><b>☕ ${D.beans[id].name}</b> · satış fiyatı ×${D.beans[id].mult.toFixed(2).replace(".", ",")}<br><span class="muted">${D.beans[id].notes}</span></p>`).join("") +
    nm.map(k => `<p><b>🥛 ${D.milks[k].name}</b> · siparişe +₺${tl(D.milks[k].extra)}</p>`).join("") + `<p class="muted">Müşteriler artık bunları siparişlerinde isteyecek. Tedarik'ten stok almayı unutma; yoksa "… bile yok!" deyip giderler.</p>`);
}
// §3 v0.35 tarif ilerlemesi: satış başına +1, ama yalnız sıradaki tarif mevcut dükkanda açılabiliyorsa (dükkanın tüm tarifleri açılınca durur, büyüyünce devam eder)
function recipeProg() {
  if (S.rp == null) { const nx = nextRecipe(), ts = totalSold();                 // eski kayıt: durma noktasından başlat
    if (nx && (D.drinks[nx].shop || 1) > shop().stars) S.rp = Math.min(ts, Math.max(0, ...S.unlocked.map(id => D.drinks[id].unlockCups || 0)));
    else S.rp = ts; }
  return S.rp;
}
function recipeTick() { const nx = nextRecipe(); recipeProg(); if (nx && (D.drinks[nx].shop || 1) <= shop().stars) S.rp++; }
function nextRecipe() { return Object.keys(D.drinks).filter(id => !S.unlocked.includes(id)).sort((a, b) => D.drinks[a].unlockCups - D.drinks[b].unlockCups)[0]; }
function canUnlock(id) {
  const d = D.drinks[id];
  return recipeProg() >= d.unlockCups && shop().stars >= (d.shop || 1) && !S.unlocked.includes(id);   // §9 dükkan büyüklüğü kilidi
}
function checkUnlocks() {
  const fresh = Object.keys(D.drinks).filter(canUnlock);
  if (!fresh.length) return checkBeanMilkUnlocks();
  const cupsBefore = new Set(cupsKnown());
  fresh.forEach(id => { S.unlocked.push(id); (S.unlockDay = S.unlockDay || {})[id] = S.day; S.perfect[id] = S.perfect[id] || 0; S.log.push("Gün " + S.day + ": " + D.drinks[id].name + " açıldı"); });
  const giftCups = cupsKnown().filter(k => !cupsBefore.has(k));                  // §7 yeni bardak türü Tedarik listesine eklenir (hediye yok)
  const milkNew = fresh.some(id => D.drinks[id].steps.includes("milk")) && !S.taught.includes("milk");
  if (milkNew) S.taught.push("milk");
  AUDIO.sfx("unlock"); const fneed = supplyNeedsFor(fresh.filter(hasTools)).filter(n => !n.key.startsWith("cup:"));   // v0.36: bardaklar zaten ayrı yazılıyor
  modal(`<h3>Yeni tarif${fresh.length > 1 ? "ler" : ""}: ${fresh.map(id => D.drinks[id].name).join(", ")}</h3><p class="muted">Yıldız Teyze'nin defterinden</p>` +
    fresh.map(id => { const miss = (D.drinks[id].needs || []).filter(t => !S.tools[t]);
      return `<div class="recipe">${drinkIcon(id, false)}<div><b>${D.drinks[id].name}</b><br>${D.drinks[id].card}${miss.length ? `<div class="req" style="margin-top:6px">Menüye girmesi için gerekli: ${miss.map(t => D.tools[t].name).join(", ")} (gün sonunda Dükkan › Aletler & Makineler)</div>` : ""}</div></div>`; }).join("") +
    (giftCups.length ? `<div class="req" style="margin-top:8px">🥤 Yeni bardaklar Tedarik listesine eklendi: ${giftCups.map(k => D.cups[k].name.toLocaleLowerCase("tr")).join(", ")}. Gün sonunda Tedarik'ten satın al.</div>` : "") +
    (milkNew ? `<p><i>${D.tutorial.milk}</i></p>` : "") + (fneed.length ? `<div class="req" style="margin-top:8px">🛒 Müşteriler istemeden önce Tedarik'ten al: ${fneed.map(n => n.txt).join(", ")}.</div>` : ""),
    fneed.length ? [{ label: "Tamam" }, { label: "Tedarik'e git", pri: true, fn: () => goSupply(fneed.map(n => n.key), false) }] : undefined);
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
function completeTask() { const k = day.task; k.done = true; S.money += k.money; S.xp += k.xp; AUDIO.sfx("unlock"); toast(`🎯 Görev tamam · +₺${tl(k.money)}, +${k.xp} XP`); renderHUD(); }
function renderTask() {
  const el = $("#task"); const k = day && day.task;
  if (!k) { el.style.display = "none"; return; }
  el.style.display = ""; el.className = k.done ? "done" : k.failed ? "failed" : "";
  el.textContent = `🎯 ${k.text}` + (k.kind === "noLeave" ? "" : ` · ${Math.min(k.prog, k.n)}/${k.n}`) + (k.done ? " ✓" : k.failed ? " ✗" : ` · ödül ₺${tl(k.money)} + ${k.xp} XP`);
}

// ---------- Gün (§2) ----------
// ---------- v0.39 §13: başarımlar, yarışma, kalibrasyon, hava ----------
function ach(id) { S.ach = S.ach || []; if (S.ach.includes(id)) return; S.ach.push(id); const a = D.achievements.find(x => x.id === id); if (!a) return; S.log.push("Gün " + S.day + ": başarım · " + a.name); AUDIO.sfx("unlock"); setTimeout(() => toast("🏅 Başarım: " + a.name), 1200); }
function checkAch(o, c, service) {
  const per = Object.values(S.perfect || {}).reduce((a, b) => a + b, 0), sold = totalSold();
  if (per >= 1) ach("perfect1"); if ((S.perfect.espresso || 0) >= 50) ach("esp50"); if (sold >= 100) ach("serve100"); if (sold >= 500) ach("serve500");
  if (o && o.scores && o.scores.art >= 95) ach("art95");
  const trad = ((D.drinkGroups || []).find(g => g.name === "Türk ve geleneksel") || { ids: [] }).ids; if (trad.length && trad.every(id => (S.served[id] || 0) > 0)) ach("tradAll");
  if (c && D.customers[c.type] && D.customers[c.type].special && !D.customers[c.type].jury) ach("special1");
  if (shop().stars >= 3) ach("shop3"); if (shop().stars >= 5) ach("shop5");
}
function juryScore(sv) {                                                          // §13 yarışma: 3 jüri servisinin ortalaması → madalya
  if (!day || !day.juryScores) return; day.juryScores.push(sv); if (day.juryScores.length < D.competition.drinks.length) return;
  const avg = Math.round(day.juryScores.reduce((a, b) => a + b, 0) / day.juryScores.length), m = D.competition.medals.find(x => avg >= x.min);
  day.juryScores = null;
  if (m) { S.money += m.money; S.rep += m.rep; (S.medals = S.medals || []).push({ day: S.day, name: m.name, icon: m.icon, avg }); if (m.name === "Altın") ach("gold"); S.log.push("Gün " + S.day + ": yarışma " + m.name + " madalya (" + avg + ")"); AUDIO.sfx("perfect"); }
  setTimeout(() => modal(`<h3>🏆 Barista yarışması</h3><p>Jüri ortalaması: <b>${avg}</b></p>${m ? `<p style="font-size:22px">${m.icon} <b>${m.name} madalya</b></p><p>Ödül: ₺${tl(m.money)} · +${m.rep} itibar</p>` : "<p>Bu sefer madalya yok. Haftaya yeniden dene!</p>"}`), 1400);
  renderHUD(); save();
}
function rollWeather() {                                                          // §13 hava: Cumartesi kalabalık; diğer günler %25 yağmur, %25 sıcak
  if (window.CB_TEST_WEATHER) { const w = window.CB_TEST_WEATHER; window.CB_TEST_WEATHER = null; return w === "none" ? null : w; }   // v0.42 akış testi
  if (S.day % 7 === 6) return "crowd"; const r = Math.random(), W = D.weather; return r < W.rain.p ? "rain" : r < W.rain.p + W.hot.p ? "hot" : null;
}
function showMachineOn(next, tut) {                                               // v0.40 §14 sabah açılışı: Su → Isıt → Basınç (v0.42: ilk gün Yıldız Teyze anlatır)
  const ORDER = ["Su", "Isıt", "Basınç"], btns = ORDER.slice().sort(() => Math.random() - .5); let idx = 0, first = true;
  const show = msg => modal(`<h3>⚙ Makineyi aç</h3>${tut ? `<div class="tutnote"><b>Yıldız Teyze:</b> ${D.tutorial.openIntro}</div>` : ""}<p>Sırayla dokun: <b>Su → Isıt → Basınç</b></p><p>${ORDER.map((x, i) => (i < idx ? "✅ " : "⬜ ") + x).join(" &nbsp; ")}</p>${msg ? `<p class="muted">${msg}</p>` : ""}`,
    btns.map(b => ({ label: b, pri: false, fn: () => { if (!day) return; if (b === ORDER[idx]) { idx++; AUDIO.sfx("click"); if (idx >= ORDER.length) { if (first) { S.xp += 2; toast("Makine hazır ✓ · +2 XP"); } else toast("Makine hazır"); return next(); } show(""); } else { first = false; idx = 0; AUDIO.sfx("sad"); show(tut ? D.tutorial.openWrong : "Yanlış sıra; baştan."); } } })));
  show("");
}
function showCalibration(next, tut) {                                             // §13 sabah kalibrasyonu (dial-in); v0.42: ilk gün Yıldız Teyze anlatır (kayma hep "hızlı", yanlışta tekrar)
  const C = D.calibration, r = Math.random(); let acc = 0, drift = "ok"; for (const [k, p] of C.drift) { acc += p; if (r < acc) { drift = k; break; } }
  if (tut) drift = "coarse";
  day.calPenalty = false;
  if (tut) { const ask = msg => modal(`<h3>☕ Sabah kalibrasyonu</h3><div class="tutnote"><b>Yıldız Teyze:</b> ${msg || D.tutorial.calIntro}</div><p>${C.shot[drift]}</p><p class="muted">Öğütücü ayarını ne yapalım?</p>`,
      [{ label: "Daha kaba", fn: () => { AUDIO.sfx("sad"); ask(D.tutorial.calWrong); } }, { label: "Böyle kalsın", fn: () => { AUDIO.sfx("sad"); ask(D.tutorial.calWrong); } },
       { label: "Daha ince", pri: true, fn: () => { if (!day) return; day.calShift = 0; S.xp += C.xp; toast("Ayar tuttu ✓ · +" + C.xp + " XP"); AUDIO.sfx("perfect"); renderHUD(); if (next) next(); } }]);
    return ask(); }
  const pickA = ans => { if (!day) return; const ok = ans === C.answer[drift]; day.calPenalty = false;
    day.calShift = ok ? 0 : drift === "coarse" ? 8 : drift === "fine" ? -8 : ans === "finer" ? -8 : ans === "coarser" ? 8 : 0;   // v0.40 §14: tutmazsa öğütme hedefi kayar (daralma yok)
    if (ok) { S.xp += C.xp; toast("Ayar tuttu ✓ · +" + C.xp + " XP"); AUDIO.sfx("perfect"); } else toast(day.calShift ? "Ayar tutmadı · bugün öğütme hedefi " + (day.calShift > 0 ? "ince" : "kaba") + " tarafa kaydı" : "Kalibrasyon atlandı"); renderHUD(); if (next) next(); };
  modal(`<h3>☕ Sabah kalibrasyonu</h3><p>${C.shot[drift]}</p><p class="muted">Öğütücü ayarını ne yapalım? Doğru ayar bugünü kolaylaştırır; yanlışsa öğütme ve ekstraksiyon hedefleri daralır.</p>`,
    [{ label: "Atla", fn: () => pickA("skip") }, { label: "Daha kaba", fn: () => pickA("coarser") }, { label: "Böyle kalsın", fn: () => pickA("keep") }, { label: "Daha ince", pri: true, fn: () => pickA("finer") }]);
}
const rushOn = () => !!(day && day.rush && day.rush.on && day.t < day.rush.at + day.rush.dur);
const wIcon = () => (rushOn() ? "⏰ " : "") + (day && day.weather ? D.weather[day.weather].icon + " " : "");
function startDay() {
  window.CB_LESSON = false; endCtx = null; if (S) delete S.endPending;
  if (S.cbBrewing) { S.syr = S.syr || {}; S.syr.coldbrew = (S.syr.coldbrew || 0) + S.cbBrewing; S.cbBrewing = 0; }   // v0.24: gece demlenen cold brew sabah hazır
  setTimeout(flushNewFx, 200);
  let n = dayCap(); checkUnlocks();
  const firstTime = S.day === 1 && !S.taught.includes("first");
  if (!S.lessonMig) { S.lessonMig = 1; if (S.taught.includes("first")) teach("mg:grind", "mg:tamp", "mg:extract"); }   // v0.42 §15 eski kayıt: espresso adımlarını biliyor (dozlama v0.40'ta değişti, dersi çıkar)
  const weather = firstTime ? null : rollWeather(); if (weather === "crowd") n = Math.round(n * D.weather.saturdayCrowd);   // §13
  if (!firstTime && S.buzz) { n = Math.max(1, n + S.buzz); } const buzz = S.buzz || 0; S.buzz = 0;
  day = { t: 0, toSpawn: n, spawnEvery: arrivalEvery(), nextSpawn: firstTime ? 99999 : 1, customers: [], orders: [], active: 0,
          stats: { served: 0, perfect: 0, income: 0, tips: 0, left: 0, bounced: 0, pricey: 0, repStart: S.rep }, id: 1, tutorialActive: false, asst: null };
  if (!firstTime) day.task = makeTask();
  if (!firstTime && Math.random() < .25) day.rush = { at: rnd(20, DAY_SECONDS * .6), dur: 30, on: false };   // v0.40 §14 yoğun saat
  day.weather = weather; day.dirty = !firstTime && S.day >= 3 && S.cleanDay !== S.day - 1;   // §13 dün makine temizlenmediyse
  if (!firstTime && S.compDay === S.day) { day.jury = D.competition.drinks.length; day.juryScores = []; }
  if (!firstTime) setTimeout(() => { if (!day) return; const msgs = [];
    if (day.weather) msgs.push(D.weather[day.weather].icon + " " + D.weather[day.weather].name + " gün" + (day.weather === "rain" ? ": sıcak kahveler daha çok istenir" : day.weather === "hot" ? ": buzlu kahveler daha çok istenir" : ": müşteri her zamankinden çok"));
    if (buzz > 0) msgs.push("📱 Fenomen paylaştı: bugün +" + buzz + " müşteri"); if (buzz < 0) msgs.push("📱 Fenomen kötü yazdı: bugün " + buzz + " müşteri");
    if (day.dirty) msgs.push("🧽 Makine dün temizlenmedi: ekstraksiyon bugün daha zor");
    if (day.jury) msgs.push("🏆 Yarışma günü: ilk 3 müşteri jüri");
    if (msgs.length) toast(msgs.join(" · "));
    const after = () => { if (!day) return; if (day.weather) lesson("weather"); if (day.dirty) lesson("dirty"); if (day.jury) lesson("jury"); };   // v0.42 §15
    const skipOpen = window.CB_TEST_NOOPEN; window.CB_TEST_NOOPEN = false;   // akış testi: sabah açılışını atla
    if (S.day >= 2 && !skipOpen) lesson("machineOn", () => showMachineOn(() => lesson("calibration", () => showCalibration(after)))); else after(); }, 350);
  if (firstTime) {
    day.tutorialActive = true;
    day.customers.push({ id: day.id++, type: "nejla", name: "Yıldız Teyze", drink: "espresso", size: "double", bean: "brazil", milk: null, patience: Infinity, patienceMax: 0,
      pos: Object.assign({}, SCENE.queueSlot(0)), target: null, moving: false, say: D.tutorial.openSay });
    day.opening = true;                                                          // v0.42 §15 açılış dersi: makineyi aç → kalibrasyon → espresso
    setTimeout(() => { if (!day) return; showMachineOn(() => showCalibration(() => { if (!day) return; teach("L:machineOn", "L:calibration");
      modal(`<h3>Yıldız Teyze</h3><p>${D.tutorial.openDone}</p>`, [{ label: "Tamam", pri: true, fn: () => { if (!day) return; day.opening = false; const y = day.customers.find(c => c.type === "nejla"); if (y) y.say = "Hazırsan başlayabiliriz evladım, bana dokun."; layout(); } }]); }, true), true); }, 400);   // §10 Yıldız Teyze zaten tezgâhın önünde (v0.30: aynı anda tek talimat – balon söyler, toast yok)
  }
  AUDIO.sfx("shopOpen");                                                            // §11 açılış sesi
  layout(); renderHUD(); renderBench(); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
}
function orderLine(c) {                                            // §7 rastgele sipariş cümlesi (genel + tipe özel)
  const L = D.orderLines, espresso = D.drinks[c.drink].steps.includes("extract");   // ekstraksiyon süresi cümlesi yalnızca espresso ailesine
  const own = L[c.type] || [], pool = ((D.customers[c.type] || {}).special && own.length ? own : L.any.concat(own, own)).filter(x => espresso || !/saniye/.test(x)), t = pick(pool);   // v0.39: özel müşteri kendi cümleleriyle
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
const dayPaused = () => !!window.CB_FREEZE || !!window.CB_LESSON || !!document.querySelector(".overlay.on");   // bilgi penceresi / Tedarik / Defter / Fiyatlar / Ayarlar açıkken saat ve sabır durur (hazırlama ekranı #sheet hariç)
function tick(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  try {
  const paused = day && dayPaused();
  if (day) {
    if (!day.tutorialActive && !paused) {
      day.t += dt;
      if (day.t >= DAY_SECONDS) day.toSpawn = 0;                                   // §9 20:00: gün biter, gelemeyen gelmez
      if (day.rush && !day.rush.on && day.t >= day.rush.at) { day.rush.on = true; day.toSpawn += 3; day.nextSpawn = Math.min(day.nextSpawn, day.t + 1); toast("⏰ Yoğun saat! 30 saniye boyunca müşteri akını · bahşiş ×1,5"); AUDIO.sfx("shopOpen"); lesson("rush"); }
      if (day.toSpawn > 0 && day.t >= day.nextSpawn) {
        if (queueOf().length >= shop().maxQueue) day.stats.bounced++;                  // §9 sıra dolu: kapıdan döner
        else spawnCustomer();
        day.toSpawn--; day.nextSpawn += day.spawnEvery * rnd(0.6, 1.4) * (rushOn() ? 1 / 3 : 1);
      }
      queueOf().forEach(c => { if (c.patienceMax) c.patience -= dt; });
      day.orders.slice().forEach(o => { const c = o.cust; if (!c.patienceMax || c.leaving) return; c.patience -= dt; if (c.patience <= 0) leave(c, true); });   // §7 hazırlarken de sabır azalır; biterse sipariş iptal
      updOrderBars();
      queueOf().filter(c => c.patienceMax && c.patience <= 0).forEach(leave);
    }
    day.orders.forEach((o, i) => { if (o.selecting || o.hidden) return; if (o.autoRun) autoTick(o, dt, i === day.active); else if (i === day.active) stepTick(o, dt); else if (o.phase === "run" && o.steps[o.i] === "extract" && o.z) bgExtract(o, dt); });   // v0.40 §14 çift grup: shot arka planda akar
    if (S.staff && S.staff.assistant && !day.tutorialActive && !paused) assistantTick(dt);
    layout();
  }
  // performans: dükkan kapalıyken ya da bir kart/panel açıkken arka sahne 3 karede bir çizilir
  if ((!day || document.querySelector(".overlay.on") || $("#sheet").classList.contains("on")) && (sceneSkip = (sceneSkip + 1) % 3)) sceneAcc += dt; else { renderScene(dt + sceneAcc); sceneAcc = 0; }
  if (day && day.toSpawn === 0 && queueOf().length === 0 && day.orders.length === 0 && !day.asst) return endDay();
  } catch (e) { console.error("tick:", e); }                    // tek bir çizim hatası döngüyü durdurmasın
  raf = requestAnimationFrame(tick);
}
let lastHint = null, lastClock = "", sceneSkip = 0, sceneAcc = 0;
// §8 satın alınır alınmaz dükkanda görünsün: panel kısa süre kapanır, yeni ürün "✨ Yeni!" efektiyle görünür
let pendingNew = [];
function showPurchase(key, name) {                                               // §8 panel kapanmaz: sahne arkada güncellenir, gün başlayınca "✨ Yeni!" efekti
  const visual = !!(SCENE.itemPos && SCENE.itemPos(key));                      // yalnız dükkanda görünen ürünlerde "Yeni"
  if (visual) { pendingNew.push(key); toast(name + " dükkana yerleşti ✨"); } else toast(name + " alındı"); renderScene(0);
}
function flushNewFx() { pendingNew.forEach((k, i) => SCENE.highlight(k, .3 + i * 1.6)); pendingNew = []; }   // ürünün yerinde parlayan halka + ok, sırayla
function renderScene(dt) {
  if (day) day.customers = day.customers.filter(c => !c.gone);
  SCENE.draw({ customers: day ? day.customers : [], orders: day ? day.orders : [], t: day ? day.t / DAY_SECONDS : 0.3, level: shop().stars, shopName: shop().name, slots: slots(),
    decor: activeDecor(), equipment: S.equipment || {}, tools: S.tools || {}, traffic: tr(), cups: S.cups || {}, extras: S.extras || {}, assistant: !!(S.staff && S.staff.assistant), asstBusy: !!(day && day.asst), superAuto: !!S.equipment.superAuto,
    baristaBusy: !!(day && day.orders.length) }, dt || 0);
  const hint = !day ? (canOpenDay() ? "Dükkan kapalı · Günü başlat'a dokun" : "") : day.tutorialActive ? "" : `Sıra ${queueOf().length}/${shop().maxQueue} · ` + (queueOf().length ? "Öndeki müşteriye dokun" : day.orders.length ? "Sipariş hazırlanıyor" : day.toSpawn > 0 ? "Müşteri bekleniyor…" : "Bugünkü müşteriler bitti");
  if (hint !== lastHint) { lastHint = hint; $("#hint").textContent = hint; $("#hint").classList.toggle("empty", !hint); }                 // performans: DOM'a yalnız değişince yaz
  if (day) { const ck = clockStr(day.t / DAY_SECONDS); const ckw = wIcon() + ck; if (ckw !== lastClock) { lastClock = ckw; $("#hClock").textContent = ckw; } }
}
function spawnCustomer() {
  // §7 prototip müşteri tipleri: isim yok, yalnızca tip etiketi; tahammül ve bahşiş tipe göre değişir
  const normal = Object.keys(D.customers).filter(k => !D.customers[k].special);
  let jury = null; if (day.jury > 0) { jury = D.competition.drinks[D.competition.drinks.length - day.jury]; day.jury--; }   // §13 yarışma günü: ilk 3 müşteri jüri
  const type = jury ? "jury" : shop().stars >= 2 && Math.random() < D.specialChance ? pick(["critic", "tourist", "influencer"]) : pick(normal);
  const ct = D.customers[type];
  // §7 herkes her açık kahveyi isteyebilir: aleti olan ve özel malzemesi stokta olan; yeni açılan 3 gün daha sık istenir
  const menuAll = S.unlocked.filter(id => hasTools(id) && inSeason(id) && (D.drinks[id].uses || []).every(([k]) => specStock(k) > 0));   // v0.24 mevsimlik tarifler
  const uDay = id => (S.unlockDay || {})[id] ?? -99;
  const menu0 = menuAll.filter(id => uDay(id) !== S.day), menu = menu0.length ? menu0 : menuAll;   // v0.35+: tarif açıldığı gün istenmez (hazırlık için Tedarik'e zaman kalsın)
  const fresh = menu.filter(id => S.day - uDay(id) >= 1 && S.day - uDay(id) <= 3);                  // ertesi günden itibaren 3 gün daha sık
  const isIced = id => (D.drinks[id].sizes || []).some(z => /^i/.test(z)), wt = id => !day.weather || day.weather === "crowd" ? 1 : day.weather === "rain" ? (isIced(id) ? D.weather.rain.iced : D.weather.rain.hot) : (isIced(id) ? D.weather.hot.iced : 1);   // §13 hava
  const wpick = arr => { const tot = arr.reduce((a, id) => a + wt(id), 0); let r = Math.random() * tot; for (const id of arr) { r -= wt(id); if (r <= 0) return id; } return arr[arr.length - 1]; };
  const drink = jury ? jury[0] : menu.length ? wpick(fresh.length && Math.random() < 0.35 ? fresh : menu) : "espresso";
  if (!jury && ct.priceSens >= 1 && priceRatio(drink) > 1.2 && Math.random() < 0.6) { day.stats.left++; return; }   // §8 fiyata duyarlı tip gelmez
  const loyal = (S.loyal || {})[type] >= D.loyalty.need, pat = Math.round(ct.patience * decorMult("patience") * DF().patience * (loyal ? D.loyalty.patience : 1));   // §13 sadık tip daha sabırlı    // §12 zorluk: sabır                // §8 pikap: sabır ×1,15
  const size = jury ? jury[1] : pick(D.drinks[drink].sizes || ["single"]);                          // §7 müşteri boyu da söyler
  const ob = openBeans(), bean = !D.drinks[drink].noBean && ob.length > 1 && Math.random() >= D.houseBeanShare ? pick(ob.filter(b => b !== "brazil")) : "brazil";   // §6 çekirdek de söyler
  const om = openMilks(), milk = isMilky(drink) ? (om.length > 1 && Math.random() >= D.cowShare ? pick(om.filter(k => k !== "cow")) : "cow") : null;
  const sugar = D.drinks[drink].sugar ? pick(Object.keys(D.sugarLevels)) : null;   // §3 Türk kahvesi şeker derecesi
  const M = D.mods, hasShot = D.drinks[drink].steps.includes("extract"), hotCup = /^cup/.test(SZ(size).cup);   // §13 sipariş değiştiricileri
  const mods = !jury && S.day >= M.fromDay ? { extra: hasShot && Math.random() < M.extraChance, takeaway: hotCup && Math.random() < M.takeawayChance } : { extra: false, takeaway: false };
  day.customers.push({ id: day.id++, type, name: ct.name + (loyal ? " ♥" : ""), drink, size, bean: jury ? "brazil" : bean, milk: jury && milk ? "cow" : milk, sugar, mods, patience: pat, patienceMax: pat,
    pos: { x: SCENE.DOOR.x, y: SCENE.DOOR.y }, target: null, moving: false });
}
function leave(c, cancelled) {
  c.leaving = true; c.angry = true; c.ordered = false;
  const act = day.orders[day.active], had = day.orders.some(o => o.cust === c);     // §11 yanıp sönme yok: sıradaki biri giderse hazırlanan ekran bozulmaz
  if (had) { day.orders = day.orders.filter(o => o.cust !== c); day.active = Math.max(0, day.orders.indexOf(act)); } renderOrders();
  S.rep = Math.max(0, S.rep - 5); day.stats.left++; S.streak = 0;            // §7 kaçan müşteri seriyi sıfırlar
  if (c.type === "jury") juryScore(0);
  if (day.task && day.task.kind === "noLeave" && !day.task.done) { day.task.failed = true; }
  SCENE.addFx(c, "−5", "#b5533c"); if (had && act && act.cust === c) AUDIO.stopLoops(); AUDIO.sfx("sad");
  if (cancelled) { c.say = "Bu kadar beklenmez! İptal!"; c.sayUntil = performance.now() + 2600; }
  toast(c.name + (cancelled ? " siparişi iptal etti · −5 itibar" : " vazgeçip gitti · −5 itibar")); renderOrders(); if (had) renderBench(); renderHUD();
}
function takeOrder(id) {
  if (day && day.opening) return;                                                // v0.42 §15 açılış dersi bitmeden sipariş yok
  const c = day.customers.find(x => x.id === id && !x.ordered && !x.leaving); if (!c) return;
  if (c !== queueOf()[0]) { toast("Önce sıranın en önündeki müşteri"); return; }   // §7 yalnızca öndeki müşteri sipariş verir
  if (!c.say && c.type !== "nejla" && day.orders.length < slots()) { toast("Müşteri kasaya gelsin, siparişini söylesin"); return; }
  if (day.orders.length >= slots()) { toast(slots() === 1 ? "Makine dolu: önce eldeki siparişi bitir" : "İki grup kafası da dolu"); return; }
  const sz = SZ(c.size);
  if ((S.cups[sz.cup] || 0) <= 0 && c.type !== "nejla") {                      // §7 istenen boyun bardağı yoksa kızıp gider
    c.say = cap1(pick(D.noCupLines).replace("{s}", sz.say || "espresso").replace("{S}", cap1(sz.say || "espresso"))); c.sayUntil = performance.now() + 2800;
    c.leaving = true; c.angry = true; S.rep = Math.max(0, S.rep - 3); day.stats.nocup = (day.stats.nocup || 0) + 1; S.streak = 0; if (c.type === "jury") juryScore(0);
    SCENE.addFx(c, "−3", "#b5533c"); AUDIO.sfx("sad"); layout(); renderHUD(); return; }
  const outOf = (beanKg(c.bean) < beanUse(c.drink, c.size) - 1e-9) ? D.beans[c.bean || "brazil"].name + " çekirdeği" : (c.milk && milkL(c.milk) < milkUse(c.drink, c.size) - 1e-9) ? D.milks[c.milk].name : (c.sugar && (S.extras.sugar || 0) < D.sugarLevels[c.sugar].n) ? "Şeker" : (Object.entries(specNeeds(c.drink, c.size)).find(([k, n]) => specStock(k) < n) || [])[0] ? specName(Object.entries(specNeeds(c.drink, c.size)).find(([k, n]) => specStock(k) < n)[0]) : null;
  if (outOf && c.type !== "nejla") {                                               // §6 istenen çekirdek/süt yok: "X bile yok!" deyip gider
    const x = outOf.toLocaleLowerCase("tr"); c.say = cap1(pick(D.stockOutLines).replace("{X}", cap1(outOf)).replace("{x}", x)); c.sayUntil = performance.now() + 2800;
    c.leaving = true; c.angry = true; S.rep = Math.max(0, S.rep - 3); day.stats.nostock = (day.stats.nostock || 0) + 1; S.streak = 0; if (c.type === "jury") juryScore(0);
    SCENE.addFx(c, "−3", "#b5533c"); AUDIO.sfx("sad"); layout(); renderHUD(); return; }
  if (c.type !== "nejla" && c.type !== "jury") {                  // §7/§8 sipariş anında fiyat tepkisi (jüri fiyata bakmaz)
    const r = rollReaction(c.drink, c.size);
    if (r === "expensive") { c.say = "Çok pahalı! Almıyorum."; c.sayUntil = performance.now() + 2600; c.leaving = true; day.stats.pricey++; AUDIO.sfx("sad"); SCENE.addFx(c, "Pahalı!", "#e9c46a"); layout(); renderHUD(); return; }
    if (r === "cheap") { c.say = "Ne kadar ucuz!"; c.sayUntil = performance.now() + 1800; SCENE.addFx(c, "Ucuz!", "#9cc77a"); } else c.say = null;
  }
  c.ordered = true;
  if (c.patienceMax) { c.patience += c.patienceMax * 0.5; c.patienceTop = c.patience; }   // §7 sipariş başlayınca sabır +%50
  const o = { cust: c, drink: c.drink, size: c.size, i: 0, scores: {}, phase: "ready", v: 0, dir: 1, start: null, tutorial: c.type === "nejla", selecting: true, sel: { bean: multiBeans() ? null : "brazil", drink: null, size: null, milk: null, sugar: null }, all: [], steps: [], auto: new Set() };
  if (o.tutorial) prepareOrder(o, "espresso", "double", "brazil", null, null);   // v0.24: öğretici 18 g → 36 g double (doppio)                         // §7 öğreticide seçim kendiliğinden
  day.orders.push(o); day.active = day.orders.length - 1; renderOrders();
  if ((D.customers[c.type] || {}).special) lesson(c.type);                         // v0.42 §15 özel müşteri ilk kez
  layout(); renderBench();
}

// §7 seçim adımı: tarif + boy seçilir, seçilen bardak harcanır, adımlar boya göre kurulur
function prepareOrder(o, drink, size, bean, milk, sugar) {
  bean = bean || "brazil"; milk = isMilky(drink) ? (milk || "cow") : null; sugar = D.drinks[drink].sugar ? (sugar || "sade") : null;
  o.drink = drink; o.size = size; o.bean = bean; o.milk = milk; o.sugar = sugar; o.selecting = false;
  if (D.drinks[drink].noBean) bean = o.cust.bean || "brazil";                  // v0.24 kahvesiz tarif: çekirdek yok
  const sm0 = o.sel || {}, wm = o.cust.mods || {}; o.extra = !!sm0.extra && D.drinks[drink].steps.includes("extract"); o.takeaway = !!sm0.takeaway && /^cup/.test(SZ(size).cup);   // §13
  o.mismatch = drink !== o.cust.drink || size !== o.cust.size || bean !== (o.cust.bean || "brazil") || (milk || null) !== (o.cust.milk || null) || (sugar || null) !== (o.cust.sugar || null) || (!o.tutorial && (o.extra !== !!wm.extra || o.takeaway !== !!wm.takeaway));   // §6 çekirdek ve süt de doğru olmalı
  S.cups[SZ(size).cup] = Math.max(0, (S.cups[SZ(size).cup] || 0) - 1);
  const all = stepsFor(drink), auto = o.tutorial ? new Set() : autoSteps();      // öğretici her adımı elle öğretir
  o.all = all; o.auto = auto; o.steps = all.filter(st => !auto.has(st)); o.i = 0; o.scores = {}; o.phase = "ready"; o.v = 0; o.served = false;
  all.forEach(st => { if (auto.has(st)) o.scores[st] = D.economy.autoScore; });   // §8 otomatik adım sabit 100 (v0.35)
  if (!o.tutorial && day && day.pregrind && o.steps.includes("grind")) {            // v0.40 §14 önden öğütülmüş doz: öğütme atlanır, tazelik düşer
    const pg = day.pregrind; day.pregrind = null; o.scores.grind = Math.max(0, pg.score - Math.floor((day.t - pg.t) / 10) * 3); o.grindDev = 0; o.steps = o.steps.filter(x => x !== "grind"); toast("Önden öğütülmüş doz kullanıldı · " + o.scores.grind); }
  o.autoRun = o.steps.length === 0;                                               // her adım otomatik: makine kendisi hazırlar
  save(); renderOrders();
}
// v0.30 §11 telefon dikey: müşterinin İSTEDİĞİ sipariş + sabır, hazırlama ekranının en üstünde büyük (bilgisayarda sağ üstteki kart)
function wantHTML(o) {
  const c = o.cust, tags = [];
  if (!D.drinks[c.drink].noBean && multiBeans()) tags.push(["bean", "☕ " + D.beans[c.bean || "brazil"].name]);
  if (c.milk && multiMilks()) tags.push(["milk", "🥛 " + D.milks[c.milk].short]);
  if (c.sugar) tags.push(["", "🍬 " + D.sugarLevels[c.sugar].label]);
  if (c.mods && c.mods.extra) tags.push(["", "➕ Ekstra shot"]); if (c.mods && c.mods.takeaway) tags.push(["", "🥡 Paket"]);   // §13
  const bad = !o.selecting && o.mismatch ? `<div class="wbad">⚠ Sen ${sizedName(o.drink, o.size)} seçtin; ${o.reviewing ? "teslim edersen almaz (−3 itibar)" : "müşteri almaz"}</div>` : "";
  return `<div class="want"><div class="wname">${c.name} istiyor</div><div class="wdrink"><b>${D.drinks[c.drink].name}</b><span class="osize">${SZ(c.size).label}</span>${tags.map(([k, t]) => `<span class="otag ${k}">${t}</span>`).join("")}</div>${bad}${c.patienceMax ? '<div class="opat"><i id="wpat"></i></div>' : ""}</div>`;
}
const sheetX = o => o.tutorial ? "" : '<button class="shx" id="sheetX" aria-label="Kapat">✕</button>';   // telefonda hazırlama ekranını kapat (sipariş bekler)
// §7 v0.35: menüdeki tarifler gruplara ayrılır (D.drinkGroups sırası), grup içinde Türkçe alfabetik; boş grup gösterilmez
function drinkGroupsOf(ids) {
  const byName = (a, b) => D.drinks[a].name.localeCompare(D.drinks[b].name, "tr"), seen = new Set();
  const out = (D.drinkGroups || []).map(g => { const m = ids.filter(id => g.ids.includes(id)); m.forEach(id => seen.add(id)); return { name: g.name, ids: m.sort(byName) }; });
  const rest = ids.filter(id => !seen.has(id)).sort(byName); if (rest.length) out.push({ name: "Diğer", ids: rest });
  return out.filter(g => g.ids.length);
}
const THUMBS = {};                                                               // v0.43 §16 seçim listesi küçük resimleri (bir kez çizilir)
const drinkThumb = id => THUMBS[id] || (THUMBS[id] = (window.DRINKART ? DRINKART.thumb(id, 34) : ""));
function renderSelect(o, tabs) {                                                  // §6/§7 sıra: çekirdek → tarif → boy → süt
  if (!o.tutorial) { setTimeout(() => { lesson("select"); const wm = o.cust.mods || {}; if (wm.extra || wm.takeaway) lesson("extras"); }, 150); }   // v0.42 §15
  const menu = S.unlocked.filter(hasTools), sel = o.sel, sizes = sel.drink ? (D.drinks[sel.drink].sizes || ["single"]) : [];
  const showBean = multiBeans(), showMilk = sel.drink && isMilky(sel.drink) && multiMilks(), showSugar = sel.drink && D.drinks[sel.drink].sugar;
  const ready = sel.bean && sel.drink && sel.size && sizes.includes(sel.size) && (!showMilk || sel.milk) && (!showSugar || sel.sugar);
  const box = (title, inner) => `<div class="box" style="text-align:left"><h4>${title}</h4><div class="row" style="justify-content:flex-start;margin-top:4px">${inner}</div></div>`;
  $("#sheetBody").innerHTML = `${sheetX(o)}${tabs}${wantHTML(o)}<h3 class="ptitle">Siparişi hazırla</h3>
    <p class="muted" style="margin:2px 0 6px"><span class="dOnly">Siparişi sağ üstteki karttan oku. </span><span class="pOnly">İstenen sipariş yukarıda. </span>${showBean ? "Önce çekirdeği, sonra tarifi, boyu" : "Önce tarifi, sonra boyu"}${showMilk ? " ve sütü" : ""} seç. Yanlış seçersen müşteri almaz.</p>
    ${showBean ? box("1. Çekirdek", openBeans().map(id => { const kg = beanKg(id); return `<button data-sb="${id}" class="${sel.bean === id ? "pri" : ""}" ${kg > 0 ? "" : "disabled"}>${D.beans[id].name}<br><span style="font-size:11px">${kg.toFixed(2).replace(".", ",")} kg</span></button>`; }).join("")) : ""}
    ${box((showBean ? "2. " : "") + "Tarif", drinkGroupsOf(menu).map(g => `<div class="dgrp"><div class="dgname">${g.name}</div><div class="row" style="justify-content:flex-start">${g.ids.map(id => `<button data-sd="${id}" class="dbtn ${sel.drink === id ? "pri" : ""}"><img class="dthumb" alt="" src="${drinkThumb(id)}">${D.drinks[id].name}</button>`).join("")}</div></div>`).join(""))}
    ${box((showBean ? "3. " : "") + "Boy / bardak", (sizes.length ? "" : '<span class="muted">Önce tarifi seç</span>') + sizes.map(z => { const sz = SZ(z), n = S.cups[sz.cup] || 0;
      return `<button data-sz="${z}" class="${sel.size === z ? "pri" : ""}" ${n > 0 ? "" : "disabled"}>${sz.label}<br><span style="font-size:11px">${D.cups[sz.cup].name} · ${n} adet</span></button>`; }).join(""))}
    ${showMilk ? box((showBean ? "4. " : "") + "Süt", openMilks().map(k => { const l = milkL(k); return `<button data-sm="${k}" class="${sel.milk === k ? "pri" : ""}" ${l > 0 ? "" : "disabled"}>${D.milks[k].name}<br><span style="font-size:11px">${l.toFixed(1).replace(".", ",")} L</span></button>`; }).join("")) : ""}
    ${showSugar ? box("Şeker", Object.entries(D.sugarLevels).map(([k, z]) => `<button data-sg="${k}" class="${sel.sugar === k ? "pri" : ""}" ${(S.extras.sugar || 0) >= z.n ? "" : "disabled"}>${z.label}<br><span style="font-size:11px">${z.n} şeker</span></button>`).join("")) : ""}
    ${S.day >= D.mods.fromDay && !o.tutorial ? box("Ekstralar", (sel.drink && D.drinks[sel.drink].steps.includes("extract") ? `<button data-mx="extra" class="${sel.extra ? "pri" : ""}">➕ Ekstra shot</button>` : "") + (sel.size && /^cup/.test(SZ(sel.size).cup) ? `<button data-mx="takeaway" class="${sel.takeaway ? "pri" : ""}">🥡 Paket servis</button>` : "") + (!sel.drink ? '<span class="muted">Önce tarifi seç</span>' : "")) : ""}
    <button class="hold big pri" id="selGo" ${ready ? "" : "disabled"}>Hazırlamaya başla</button>`;
  $("#sheet").classList.add("on"); bindSheetX(); updOrderBars();
  $("#sheetBody").querySelectorAll("[data-sg]").forEach(b => b.onclick = () => { sel.sugar = b.dataset.sg; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-sb]").forEach(b => b.onclick = () => { sel.bean = b.dataset.sb; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-sd]").forEach(b => b.onclick = () => { sel.drink = b.dataset.sd; if (!(D.drinks[sel.drink].sizes || ["single"]).includes(sel.size)) sel.size = null; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-sz]").forEach(b => b.onclick = () => { sel.size = b.dataset.sz; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-sm]").forEach(b => b.onclick = () => { sel.milk = b.dataset.sm; AUDIO.sfx("click"); renderBench(); });
  $("#sheetBody").querySelectorAll("[data-mx]").forEach(b => b.onclick = () => { sel[b.dataset.mx] = !sel[b.dataset.mx]; AUDIO.sfx("click"); renderBench(); });   // §13 ekstralar
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
    ${(multiBeans() && !D.drinks[o.cust.drink].noBean) || (o.cust.milk && multiMilks()) ? `<div class="otags">${multiBeans() && !D.drinks[o.cust.drink].noBean ? `<span class="otag bean">☕ ${D.beans[o.cust.bean || "brazil"].name}</span>` : ""}${o.cust.milk && multiMilks() ? `<span class="otag milk">🥛 ${D.milks[o.cust.milk].short}</span>` : ""}</div>` : ""}
    ${o.cust.sugar ? `<div class="otags"><span class="otag">🍬 ${D.sugarLevels[o.cust.sugar].label}</span></div>` : ""}
    ${o.cust.mods && (o.cust.mods.extra || o.cust.mods.takeaway) ? `<div class="otags">${o.cust.mods.extra ? '<span class="otag">➕ Ekstra shot</span>' : ""}${o.cust.mods.takeaway ? '<span class="otag">🥡 Paket</span>' : ""}</div>` : ""}
    ${o.selecting ? '<div class="ostate">seçimleri yap</div>' : o.mismatch ? '<div class="ostate">⚠ yanlış seçim</div>' : ""}
    ${o.cust.patienceMax ? `<div class="opat"><i id="opat${i}"></i></div>` : ""}</div>`).join("") + queueHTML();
  updOrderBars();
}
// §7 kartta sırada bekleyenler: yalnız ad + sabır (sipariş görünmez)
let queueSig = "";
function queueHTML() { const q = queueOf().filter(c => c.patienceMax); queueSig = q.map(c => c.id).join(",");
  return q.length ? `<div class="oqhead">Sırada bekleyenler</div>` + q.map(c => `<div class="oq"><span>${c.name}</span><div class="opat"><i id="qpat${c.id}"></i></div></div>`).join("") + (q.length > 3 ? `<div class="oqmore">+${q.length - 3}</div>` : "") : ""; }
function updOrderBars() {                                                         // §7 kartta kalan sabır çubuğu
  if (!day) return;
  if (day.orders.length && queueOf().filter(c => c.patienceMax).map(c => c.id).join(",") !== queueSig) return renderOrders();   // sıra değişti: kartı yenile
  queueOf().forEach(c => { const b = document.getElementById("qpat" + c.id); if (!b || !c.patienceMax) return; const p = clamp(c.patience / c.patienceMax, 0, 1); b.style.width = (p * 100).toFixed(1) + "%"; b.style.background = p < .3 ? "#b5533c" : p < .6 ? "#e0a93a" : "#5f9a4b"; }); day.orders.forEach((o, i) => { const b = document.getElementById("opat" + i), c = o.cust; if (!b || !c.patienceMax) return;
    const p = clamp(c.patience / (c.patienceTop || c.patienceMax * 1.5), 0, 1); b.style.width = (p * 100).toFixed(1) + "%"; b.style.background = p < .3 ? "#b5533c" : p < .6 ? "#e0a93a" : "#5f9a4b"; });
  const wb = document.getElementById("wpat"), ao = day.orders[day.active];            // v0.30 hazırlama ekranındaki sabır çubuğu
  if (wb && ao && ao.cust.patienceMax) { const c = ao.cust, p = clamp(c.patience / (c.patienceTop || c.patienceMax * 1.5), 0, 1); wb.style.width = (p * 100).toFixed(1) + "%"; wb.style.background = p < .3 ? "#b5533c" : p < .6 ? "#e0a93a" : "#5f9a4b"; }
}

// ---------- Mini oyunlar (§4) ----------
function scoreFrom(val, target, tolerance) { const d = Math.abs(val - target) / tolerance; return Math.round(clamp(100 - d * 40, 0, 100)); }
function stepTick(o, dt) {                                  // §4 renkli hedef çubuğu: ibre hareketi
  const s = o.steps[o.i]; if (!s || !MG[s]) return; const c = MG[s];
  if (c.mode === "act") { if (o.holdTick && c.act === "hold") o.holdTick(dt); if ($("#closeup")) c.draw(o, o.v); return; }
  if (o.z == null || o.tgt == null) return;                    // adım uiZone'da kurulmadan (finishStep sonrası 500 ms) çizme: o.tgt/o.z yok → NaN
  if (o.phase === "run" && o.tutorial && o.frozen) { setNeedle(o.v); if ($("#closeup")) c.draw(o, o.v); return; }   // §4 ilk sipariş: mükemmel noktada bekler
  const v0 = o.v;
  if (o.phase === "run") {
    const rhy = !o.tutorial && (s === "grind" || s === "extract") && o.z && Math.abs(o.v - o.tgt) > o.z.k * 1.6 ? 1 + .35 * Math.sin(performance.now() / 260) : 1;   // v0.40 §14: hedeften uzakta ritim değişir; hedefte normal hız (Kural 9)
    if (s === "grind" && navigator.vibrate && LSG("cb_haptic") !== "0") { o.vibT = (o.vibT || 0) + dt; if (o.vibT > .3) { o.vibT = 0; try { navigator.vibrate(6); } catch (e) {} } }
    if ((o.mode || c.mode) === "osc") { o.v += o.dir * c.speed * rhy * dt; if (o.v > 100) { o.v = 100; o.dir = -1; o.bounces = (o.bounces || 0) + 1; } if (o.v < 0) { o.v = 0; o.dir = 1; o.bounces = (o.bounces || 0) + 1; } }
    else if (o.phase === "run") { o.v += (typeof c.speed === "function" ? c.speed() : c.speed) * (o.spd || 1) * rhy * dt; if (o.v >= 100) { o.v = 100; stopZone(o, s); return; } }
    if (o.blond && !o.blond.done && !o.blond.warned && o.v > o.blond.t - o.z.k * 2.5) { o.blond.warned = true; const r = $("#zRes"); if (r) { r.className = "zres ok"; r.textContent = "Renk açılıyor! Akışı yumuşat 💧"; } }
    if (o.blond && !o.blond.done && o.v > o.blond.t + o.z.k) { o.blond.done = true; o.blond.score = 0; const r = $("#zRes"); if (r) { r.className = "zres miss"; r.textContent = "Rengi kaçırdın · 0"; } const b2 = $("#zB2"); if (b2) b2.disabled = true; }
    if (c.onTick) c.onTick(o);
    const mode = o.mode || c.mode;
    if (o.tutorial && o.phase === "run" && (mode !== "osc" || (o.bounces || 0) >= 2) && (v0 - o.tgt) * (o.v - o.tgt) <= 0) { o.v = o.tgt; o.frozen = true; if (s === "extract" || s === "milk") AUDIO.stopLoops();
      setTut(mode === "hold" ? (s === "tamp" ? D.tutorial.releaseTamp : D.tutorial.release) : mode === "sweep" ? D.tutorial.stopNow : D.tutorial.pressNow);
      if (mode === "osc") { const b = $("#zB"); if (b) { b.disabled = false; b.classList.add("pulse"); } const r = $("#zRes"); if (r) { r.className = "zres perfect"; r.style.fontSize = "30px"; r.textContent = "Tam şimdi!"; } AUDIO.sfx("click"); } }   // §10 1–2 tur sonra yeşilde sabitlenir
  }
  setNeedle(o.v); if ($("#closeup")) c.draw(o, o.v);
}
function bgExtract(o, dt) {
  const c = MG.extract; o.v += mgSpeed(c) * (o.spd || 1) * dt;
  if (o.v >= 100) { o.v = 100; o.phase = "done"; AUDIO.loop("extract", false); toast(o.cust.name + ": shot taştı (45 sn) · Kaçtı"); finishStep(o, 0, c.tipHigh); }
}
function finishStep(o, score, tipKey) {
  AUDIO.stopLoops();
  const s = o.steps[o.i]; o.scores[s] = score;
  if (score < 70 && tipKey && !S.tipsLearned.includes(tipKey)) { S.tipsLearned.push(tipKey); toast("📖 " + D.tips[tipKey]); }
  const el = $("#mgScore"); if (el) { el.textContent = D.minigames[s].name + ": " + score; el.className = "score " + (score >= 80 ? "good" : score < 70 ? "bad" : ""); }
  o.i++; o.phase = "ready"; o.v = 0; o.dir = 1; o.start = null; o.air = false; o.tex = 0; o.tgt = null; o.z = null; o.holdTick = null;   // yeni adım uiZone'da kurulur
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
    if (!c || beanKg(c.bean) < beanUse(c.drink, c.size) || (S.cups[SZ(c.size).cup] || 0) <= 0) return;
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
function cupCost(id, size, bean, milk) { return { bean: bean || "brazil", milkType: milk || "cow", kg: +beanUse(id, size).toFixed(4), milk: +milkUse(id, size).toFixed(3), cup: SZ(size).cup }; }
function renderReview(o, tabs) {
  const q = orderQuality(o), rv = reviewOf(q), d = D.drinks[o.drink], cc = cupCost(o.drink, o.size, o.bean, o.milk);
  const canRedo = beanKg(cc.bean) >= cc.kg * 2 && (!cc.milk || milkL(cc.milkType) >= cc.milk * 2 - 1e-9) && Object.values(S.cups).some(n => n > 0);
  const steps = `<div class="steps">${o.all.map(st => `<span class="done">${o.auto.has(st) ? "⚙ " : ""}${D.minigames[st].name} ${o.scores[st]}</span>`).join("")}</div>`;
  const mis = o.mismatch || (!o.tutorial && q < D.economy.refuseBelow), g = Math.round(cc.kg * 1000), ml = Math.round(cc.milk * 1000);   // v0.30: yanlışsa birincil düğme Yeniden yap
  const redo = o.tutorial ? "" : `<button class="hold big ${mis ? "pri" : "sec"}" id="rvRedo" ${canRedo ? "" : "disabled"}>Yeniden yap<span class="bsub">−${g} g çekirdek${ml ? `, −${ml} ml süt` : ""} · yeni bardak${canRedo ? "" : " · malzeme yetmiyor"}</span></button>`;
  const give = `<button class="hold big ${mis ? "sec" : "pri"}" id="rvServe">Teslim et</button>`;
  $("#sheetBody").innerHTML = `${sheetX(o)}${tabs}${wantHTML(o)}<h3 class="ptitle">${o.cust.name} için ${cap1(sizedName(o.drink, o.size))}</h3>${steps}${o.mismatch ? `<div class="miss mm">⚠ Müşteri "${cap1(sizedName(o.cust.drink, o.cust.size))}" istemişti; teslim edersen almaz (−3 itibar).</div>` : ""}${!o.mismatch && !o.tutorial && q < D.economy.refuseBelow ? `<div class="miss">⚠ Kalite çok düşük (%${q}); müşteri almaz, para ödemez (−3 itibar).</div>` : ""}<canvas id="closeup"></canvas>
    <div class="zres ${rv.cls} rvq">%${q} · ${rv.label}</div><p class="muted rvavg" style="margin:2px 0 0">Tüm adımların ortalaması</p>
    <div class="row rvrow" style="justify-content:center">${mis ? redo + give : give + redo}</div>`;
  $("#sheet").classList.add("on"); bindSheetX(); updOrderBars();
  drawCup = () => { CLOSEUP.init($("#closeup")); CLOSEUP.served(o.drink, q); };   // v0.43 §16 her tarifin kendi bitiş görseli
  fitSheet(); drawCup();
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
    useBean(o.bean, beanUse(o.drink, o.size));
    if (isMilky(o.drink)) useMilk(o.milk, milkUse(o.drink, o.size));
    c.say = cap1(pick(D.wrongLines).replace("{d}", orderName(c))); c.sayUntil = performance.now() + 3000;
    c.leaving = true; c.angry = true; c.ordered = false; S.rep = Math.max(0, S.rep - 3); S.streak = 0; day.stats.wrong = (day.stats.wrong || 0) + 1; if (c.type === "jury") juryScore(0);
    SCENE.addFx(c, "−3", "#b5533c"); AUDIO.sfx("sad"); day.orders = day.orders.filter(x => x !== o); day.active = 0;
    renderHUD(); renderOrders(); save(); setTimeout(renderBench, 500); return; }
  if (!o.assist && !o.tutorial && quality < D.economy.refuseBelow) {               // §7 kötü sipariş: müşteri almaz, para ödemez
    useBean(o.bean, beanUse(o.drink, o.size));
    if (isMilky(o.drink)) useMilk(o.milk, milkUse(o.drink, o.size));
    c.say = pick(D.badLines); c.sayUntil = performance.now() + 3000;
    c.leaving = true; c.angry = true; c.ordered = false; S.rep = Math.max(0, S.rep - 3); S.streak = 0; day.stats.bad = (day.stats.bad || 0) + 1; if (c.type === "jury") juryScore(0);
    SCENE.addFx(c, "−3", "#b5533c"); AUDIO.sfx("sad"); day.orders = day.orders.filter(x => x !== o); day.active = 0;
    toast(`${c.name} · kalite ${quality} · almadan gitti · −3 itibar`);
    renderHUD(); renderOrders(); save(); setTimeout(renderBench, 500); return; }
  let price = orderPrice(o); if (ct.discount) price = Math.round(price * ct.discount);
  if (o.extra) price = Math.round(price * (1 + D.mods.extraPrice)); if (o.takeaway) price += D.mods.takeawayFee;   // §13 ekstra shot / paket
  const sm = streakMult();                                                          // §7 mükemmel seri çarpanı
  // §7 küçük malzemeler: müşteri gizli oranla kullanır; yoksa tepki verir, bahşiş azalır (§10 Yıldız Teyze kullanmaz)
  const missing = []; if (c.type !== "nejla") Object.entries(D.extras).forEach(([k, e]) => { if (e.takeaway && !/^cup/.test(SZ(o.size).cup)) return; if (k === "sugar" && D.drinks[o.drink].sugar) return;
    const iced = /^ice/.test(SZ(o.size).cup), mult = ((D.customers[o.cust.type] || {}).extras || {})[k] ?? 1;   // §7 tipe göre küçük malzeme alışkanlığı; buzluda pipet
    if (Math.random() >= (k === "straw" && iced ? 0.9 : Math.min(0.95, e.use * mult))) return;
    if ((S.extras[k] || 0) > 0) S.extras[k]--; else missing.push(k); });
  let tip = 0; if (quality >= 80) tip = Math.round(price * 0.25 * ((quality - 70) / 30) * speedMult * ct.tip * rank().tipMult * sm * decorMult("tip"));
  tip = Math.round(tip * D.extraTip[Math.min(2, missing.length)]);
  if ((S.loyal || {})[c.type] >= D.loyalty.need) tip = Math.round(tip * D.loyalty.tip);   // §13 sadık tip
  if (rushOn()) tip = Math.round(tip * 1.5);                                      // v0.40 §14 yoğun saat
  if (!o.assist) S.streak = service >= 95 ? (S.streak || 0) + 1 : 0;
  S.money += price + tip; day.stats.income += price; day.stats.tips += tip; day.stats.served++;
  useBean(o.bean, beanUse(o.drink, o.size) + (o.extra ? D.mods.extraBean : 0));
  if (isMilky(o.drink)) useMilk(o.milk, milkUse(o.drink, o.size));   // §7 boya göre
  if (!o.assist && !o.takeaway && /^cup|^esp|^tk/.test(SZ(o.size).cup)) day.stats.dishes = (day.stats.dishes || 0) + 1;   // §13 burada içilen sıcak kahve → bulaşık
  if (o.sugar) S.extras.sugar = Math.max(0, (S.extras.sugar || 0) - D.sugarLevels[o.sugar].n);   // §3 Türk kahvesi şekeri
  useSpecials(o.drink, o.size);                                                   // §3 şurup, sos, krema, dondurma…   // §8 süt sarfı
  S.served[o.drink] = (S.served[o.drink] || 0) + 1; recipeTick();
  let repGain = 0, msg;
  if (service >= 95) { S.perfect[o.drink] = (S.perfect[o.drink] || 0) + 1; repGain = 5; S.xp += 25; day.stats.perfect++; msg = "Mükemmel!"; SCENE.addFx(c, "★", "#c9962b", true); }
  else if (service >= 80) { repGain = 2; msg = "Güzel."; }
  else if (service >= 70) { msg = "İdare eder."; }
  else { repGain = -3; msg = "Şikâyet."; }
  if (c.type === "critic") repGain = service >= 95 ? 20 : service < 70 ? -15 : 3;   // §13 eleştirmen
  if (c.type === "influencer") S.buzz = Math.max(-2, (S.buzz || 0) + (service >= 95 ? 3 : service < 70 ? -2 : 0));   // §13 fenomen: ertesi gün
  if (!o.assist && !(D.customers[c.type] || {}).special && c.type !== "nejla") { S.loyal = S.loyal || {}; S.loyal[c.type] = service >= 95 ? (S.loyal[c.type] || 0) + 1 : service < 80 ? 0 : (S.loyal[c.type] || 0); if (S.loyal[c.type] === D.loyalty.need) lesson("loyal"); }   // §13 sadakat
  S.rep = Math.max(0, S.rep + repGain);
  if (c.type === "jury") juryScore(service);
  checkAch(o, c, service);
  S.xp += 5 + Math.round(service / 4);              // §9 kalibrasyon: her serviste taban XP + kaliteye bağlı bonus (kolay rütbe/tarif açılımı)
  SCENE.addFx(c, "+₺" + tl(price), "#5f8a4b", true);                      // §7 geri bildirim efektleri
  AUDIO.sfx("register"); if (service >= 95) AUDIO.sfx("perfect");
  if (tip) { SCENE.addFx(c, "+₺" + tl(tip) + " bahşiş", "#c9962b"); AUDIO.sfx("tip"); }
  if (repGain) SCENE.addFx(c, (repGain > 0 ? "+" : "") + repGain, repGain > 0 ? "#5f8a4b" : "#b5533c");
  { const rv = reviewOf(quality); c.say = missing.length ? D.extras[pick(missing)].miss : pick(rv.lines); c.sayUntil = performance.now() + 3200; }
  if (missing.length && !o.assist) { day.stats.extraMiss = (day.stats.extraMiss || 0) + 1; SCENE.addFx(c, "az bahşiş", "#e9c46a"); }   // §4 rastgele müşteri yorumu
  c.leaving = true; c.ordered = false;
  taskProgress("serveDrink", 1, o.drink); if (service >= 95) taskProgress("perfect", 1); taskProgress("earn", price + tip);
  if (o.assist) { SCENE.addFx(c, "Yardımcı", "#f6efe3"); renderHUD(); save(); return; }
  day.orders = day.orders.filter(x => x !== o); day.active = 0; renderOrders();
  toast(`${c.name} · ${cap1(sizedName(o.drink, o.size))} · ₺${tl(price)}${tip ? " + ₺" + tl(tip) + " bahşiş" : ""} · ${msg.replace(/\.$/, "")}`);   // v0.30: kısa özet (formül yok)

  const wasTutorial = o.tutorial;
  renderHUD(); save();
  setTimeout(() => {
    if (wasTutorial) { S.taught.push("first"); teach("mg:grind", "mg:dose", "mg:tamp", "mg:extract"); save();   // §10 Devam'a basılana kadar saat durur, müşteri gelmez
      modal(`<h3>Yıldız Teyze</h3><p>${D.tutorial.midday}</p>`, [{ label: "Devam", pri: true, fn: () => { if (!day) return; day.tutorialActive = false; day.nextSpawn = day.t + day.spawnEvery * rnd(0.6, 1.4); } }]); }
    checkUnlocks(); layout(); renderBench();
  }, 900);
}
function endDay() {
  cancelAnimationFrame(raf);
  const st = day.stats, L = { rent: 0, wage: 0, cut: 0, task: null, plant: 0, spoiled: false, spend: S.spend || 0 }; S.spend = 0;   // v0.24 alımlar satırı
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
  if (S.day - (S.milkDay || S.day) + 1 >= (S.equipment.fridge ? D.economy.milkShelfDays : D.economy.milkShelfNoFridge)) {   // v0.27: buzdolabı yoksa 2 gün, varsa 6 gün
    L.spoiled = S.milk > 0 || Object.values(S.milkAlt || {}).some(v => v > 0); S.milk = 0; S.milkAlt = {}; }   // §8 süt bozulur (buzdolabısız 2, buzdolabıyla 6 gün)
  AUDIO.stopLoops(); AUDIO.sfx("shopClose");                                       // §11 kapanış sesi
  $("#sheet").classList.remove("on");                                              // v0.30: gün bitince açık kalan hazırlama/inceleme ekranı kapanır
  endCtx = S.endPending = { dayNum, st, L, repDelta, advanced: false };
  day = null; save(); renderHUD(); renderScene(0);           // §2 gün sonu ekranları arasında geri dönebilmek için; kayda da yazılır (çıkıp Devam edince aynı gün tekrar oynanamaz)
  save();
  const goRent = () => showRent(dayNum, L, () => showLedger(dayNum, st, L, repDelta));   // §2 gün sonu ilk ekran: kira
  if (closingTut()) modal(`<h3>Yıldız Teyze</h3><p>${D.tutorial.closeIntro}</p>`, [{ label: "Tamam", pri: true, fn: goRent }]); else goRent();   // v0.42 §15 kapanış dersi
}
let endCtx = null;
const closingTut = () => !!S && S.taught.includes("first") && !taught("closing") && (endCtx ? endCtx.dayNum : S.day) === 1;   // v0.42 §15 ilk günün kapanışı Yıldız Teyze ile
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
    <div class="box"><table><tr><td>Haftalık kira (${shop().name})</td><td class="num"><b>₺${tl(rent)}</b></td></tr>
      ${S.debt ? `<tr><td>Toplam borç</td><td class="num">₺${tl(S.debt)}</td></tr>` : ""}</table></div>
    ${!paid && dr === 0 && !canPay ? `<div class="req">Kasa kirayı karşılamıyor. Kredi çekip kirayı öde, yoksa devam edemezsin.</div>` : ""}
    <div class="row">${paid ? "" : `${canPay ? "" : '<button id="rentLoan" class="loanbtn">🏦 Kredi çek</button>'}<button class="pri" id="rentPay" ${canPay ? "" : "disabled"}>Kirayı öde (₺${tl(rent)})</button>`}
      ${paid ? `<button class="pri" id="rentNext">Devam →</button>` : dr > 0 ? `<button id="rentNext">Sonra ödeyeceğim →</button>` : ""}</div>`;
  openOverlay("#ovLedger");
  const re = () => showRent(dayNum, L, next);
  const pb = $("#rentPay"); if (pb) pb.onclick = () => { if (S.money < rent) return; S.money -= rent; S.rentPaidWeek = weekNo(dayNum); L.rent = rent; S.log.push("Gün " + dayNum + ": kira ödendi (₺" + tl(rent) + ")"); AUDIO.sfx("register"); save(); renderHUD(); re(); };
  const lb = $("#rentLoan"); if (lb) lb.onclick = () => openLoans(re);
  const nb = $("#rentNext"); if (nb) nb.onclick = () => { if (dr === 0 && !rentPaid(dayNum)) return; next(); };
}
function showLedger(dayNum, st, L, repDelta) {
  const short = S.money < 0, need = short ? Math.ceil(-S.money / D.economy.rentLoanStep) * D.economy.rentLoanStep : 0;
  if (short && (S.debt || 0) + Math.round(need * (1 + D.economy.loanInterest)) > shop().loanLimit) return bankrupt(null, need);   // §2 kira ödenemiyor + kredi limiti dolu: iflas
  const ctut = closingTut();
  $("#ledgerCard").innerHTML = `<h2>${weekday(dayNum)} · ${weekNo(dayNum)}. Hafta – gün kapanışı</h2>
    <table>
      <tr><td>Servis edilen</td><td class="num">${st.served}</td></tr>${st.perfect ? `<tr><td>Mükemmel servis</td><td class="num">${st.perfect}</td></tr>` : ""}
      <tr><td>Vazgeçip giden</td><td class="num">${st.left}</td></tr>
      ${st.bounced ? `<tr><td>Kapıdan dönen (sıra doluydu)</td><td class="num">${st.bounced}</td></tr>` : ""}
      ${st.pricey ? `<tr><td>Pahalı bulup giden</td><td class="num">${st.pricey}</td></tr>` : ""}
      ${st.nocup ? `<tr><td>Bardak olmadığı için giden</td><td class="num">${st.nocup}</td></tr>` : ""}
      ${st.wrong ? `<tr><td>Yanlış sipariş (ödemeden giden)</td><td class="num">${st.wrong}</td></tr>` : ""}
      ${st.nostock ? `<tr><td>İstediği çekirdek/süt olmadığı için giden</td><td class="num">${st.nostock}</td></tr>` : ""}
      ${st.bad ? `<tr><td>Kötü sipariş (ödemeden giden)</td><td class="num">${st.bad}</td></tr>` : ""}
      ${st.extraMiss ? `<tr><td>Küçük malzeme eksikliğinden az bahşiş bırakan</td><td class="num">${st.extraMiss}</td></tr>` : ""}
      <tr><td>Satış</td><td class="num">₺${tl(st.income)}</td></tr>
      <tr><td>Bahşiş</td><td class="num">₺${tl(st.tips)}</td></tr>
      ${L.spend ? `<tr><td>Alımlar <span class="muted">(tedarik, alet, dekor)</span></td><td class="num">−₺${tl(L.spend)}</td></tr>` : ""}
      ${L.rent ? `<tr><td>Haftalık kira</td><td class="num">−₺${tl(L.rent)}</td></tr>` : ""}
      ${L.wage ? `<tr><td>Yardımcı barista maaşı</td><td class="num">−₺${tl(L.wage)}</td></tr>` : ""}
      <tr class="net"><td><b>Günün neti</b></td><td class="num"><b>₺${tl(st.income + st.tips - (L.spend || 0) - (L.rent || 0) - (L.wage || 0))}</b></td></tr>
      ${L.cut ? `<tr><td>Kredi taksiti (gelirin %20'si)</td><td class="num">−₺${tl(L.cut)}</td></tr>` : ""}
      ${L.task ? `<tr><td>Günlük görev: ${L.task.text}</td><td class="num">${L.task.done ? "✓ +₺" + tl(L.task.money) : "✗"}</td></tr>` : ""}
      ${L.plant ? `<tr><td>Dekorasyon</td><td class="num">+${L.plant} itibar</td></tr>` : ""}
      ${L.spoiled ? `<tr><td>Kalan süt bozuldu</td><td class="num">0 L</td></tr>` : ""}
      ${st.dishes ? `<tr><td>Yıkanan fincan (bulaşık)</td><td class="num">${st.dishes}</td></tr>` : ""}
      <tr><td>🧽 Makine temizliği</td><td class="num">${S.cleanDay === dayNum ? "✓ yapıldı" : '<button id="cleanBtn" class="sec" style="padding:4px 10px;font-size:13px;min-height:0">Temizle</button>'}</td></tr>
      <tr><td>İtibar değişimi</td><td class="num">${repDelta >= 0 ? "+" : ""}${repDelta}</td></tr>
      <tr class="total"><td>Kasa</td><td class="num">₺${tl(S.money)}</td></tr>
      ${(S.loans || []).map(l => `<tr><td>Kredi #${l.id} (₺${tl(l.amount)} → ₺${tl(l.owe)}) · vade</td><td class="num">₺${tl(l.rem)} kaldı · ${l.due - dayNum <= 0 ? "bugün" : (l.due - dayNum) + " gün"}</td></tr>`).join("")}
    </table>
    ${short ? `<div class="req">Kasa eksiye düştü. Devam etmek için bankadan en az ₺${tl(need)} kredi çekmelisin (kira kredisi: geri ödeme ₺${tl(Math.round(need * (1 + D.economy.loanInterest)))}, %10 fazla, ${D.economy.rentLoanDays} gün vade).</div>` :
      `<p class="muted">${rentPaid(dayNum) ? "Bu haftanın kirası ödendi." : `Kiraya ${daysToRent(dayNum)} gün kaldı.`} Yeni güne başlamadan önce tedarik yap: en az ${D.economy.minBeans} kg çekirdek${needsMilk() ? ` ve ${D.economy.minMilk} L süt` : ""} gerekir.</p>`}
    ${ctut ? `<div class="tutnote"><b>Yıldız Teyze:</b> ${S.cleanDay === dayNum ? "Makine pırıl pırıl. Şimdi <b>Devam</b>'a bas." : D.tutorial.closeLedger}</div>` : ""}
    <div class="row">${endCtx ? '<button id="ledgerBack">← Geri</button>' : ""}<button class="pri" id="ledgerOk" ${ctut && S.cleanDay !== dayNum ? "disabled" : ""}>${short ? "Bankadan ₺" + tl(need) + " kredi çek" : (L.news ? "Gazeteye bak →" : "Devam →")}</button></div>`;
  openOverlay("#ovLedger");
  const lbk = $("#ledgerBack"); if (lbk) lbk.onclick = () => backToRent();
  const cb = $("#cleanBtn"); if (cb) cb.onclick = () => {                         // v0.40 §14 gece temizliği ritmi: ÇALIŞTIR × 3, aralarda 1 sn bekle
    let n = 0; modal(`<h3>🧽 Gece temizliği (backflush)</h3>${ctut ? `<div class="tutnote"><b>Yıldız Teyze:</b> ${D.tutorial.cleanHow}</div>` : "<p>Kör filtreyle makineyi 3 kez çalıştır; her seferinde 1 saniye bekle.</p>"}<p id="bfN" style="font-size:20px">⬜ ⬜ ⬜</p><button class="hold big pri" id="bfGo">ÇALIŞTIR</button>`, ctut ? [] : [{ label: "Vazgeç" }]);
    const g = $("#bfGo"); g.onclick = () => { if (g.disabled) return; n++; AUDIO.sfx("extractStop"); $("#bfN").textContent = "✅ ".repeat(n) + "⬜ ".repeat(3 - n);
      if (n >= 3) { $("#ovModal").classList.remove("on"); S.cleanDay = dayNum; toast("Makine temizlendi ✓ · yarın ekstraksiyon normal"); save(); showLedger(dayNum, st, L, repDelta); return; }
      g.disabled = true; g.textContent = "Bekle…"; setTimeout(() => { g.disabled = false; g.textContent = "ÇALIŞTIR"; }, 1000); }; };
  const go = () => { if (L.news) showNews(weekNo(dayNum), L.news, openRestock, backToLedger); else openRestock(); };
  $("#ledgerOk").onclick = () => { if (short) { takeLoan(need, D.economy.rentLoanDays); showLedger(dayNum, st, L, repDelta); return; }
    if (ctut) { if (S.cleanDay !== dayNum) return; $("#ovLedger").classList.remove("on"); teach("closing", "L:clean"); save();   // v0.42 §15 veda: Yıldız Teyze kapanıştan sonra gider
      return modal(`<h3>Yıldız Teyze</h3><p>${D.tutorial.done}</p>`, [{ label: "Devam", pri: true, fn: go }]); }
    $("#ovLedger").classList.remove("on"); go(); };
  if (!ctut && cb) lesson("clean");                                              // v0.42 §15 eski kayıt: temizlik dersi
}
// §7 ilk günden önce tedarik: bardak ve küçük malzemeleri oyuncu alır; Günü başlat ilk günü açar
let firstSupply = false;
function openFirstSupply() { firstSupply = true; mandatoryRestock = true; dayFlow = "supply"; renderHUD(); renderSupply(); openOverlay("#ovShop"); }
function openRestock() { mandatoryRestock = true; dayFlow = "supply"; if (!endCtx || !endCtx.advanced) { S.day++; if (endCtx) endCtx.advanced = true; } save(); renderHUD(); renderSupply(); openOverlay("#ovShop"); }

// ---------- Alt panel (tezgâh, §11) ----------
function renderBench() {
  window.CB_LESSON = false; renderHUD();
  if (!day || !day.orders[day.active]) { $("#sheet").classList.remove("on"); return; }
  const o = day.orders[day.active]; if (o.hidden) { $("#sheet").classList.remove("on"); return; } const s = o.steps[o.i]; const d = D.drinks[o.drink];
  if (o.selecting) { const tb = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}</button>`).join("")}</div>` : "";
    renderSelect(o, tb); $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); }); return; }
  if (o.reviewing) { const tb = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}</button>`).join("")}</div>` : "";
    renderReview(o, tb); $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); }); return; }
  const tabs = day.orders.length > 1 ? `<div class="tabs">${day.orders.map((x, i) => `<button class="${i === day.active ? "on" : ""}" data-i="${i}">${x.cust.name}</button>`).join("")}</div>` : "";
  const steps = `<div class="steps">${o.all.map(st => `<span class="${o.scores[st] != null ? "done" : st === s ? "now" : ""}">${o.auto.has(st) ? "⚙ " : ""}${D.minigames[st].name}${o.scores[st] != null ? " " + o.scores[st] : ""}</span>`).join("")}</div>`;
  if (o.autoRun) {
    $("#sheetBody").innerHTML = `${sheetX(o)}${tabs}${wantHTML(o)}<h3 class="ptitle">${o.cust.name} için ${cap1(sizedName(o.drink, o.size))}</h3>${steps}<canvas id="closeup"></canvas><div class="hint">⚙ Makine hazırlıyor… (otomatik adımlar ${D.economy.autoScore} puan)</div><div id="mgScore" class="score"></div>`;
    $("#sheet").classList.add("on"); bindSheetX(); updOrderBars(); drawCup = null; fitSheet(); CLOSEUP.init($("#closeup"));
    $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); });
    return;
  }
  window.CB_LESSON = false; const lk = stepLessonKey(o, s);                       // v0.42 §15 adımın ilk kez oynanışı: ders
  const tut = o.tutorial ? `<div id="tut" class="on">${s === "grind" && o.i === 0 ? D.tutorial.espressoIntro + " " : ""}${D.tutorial.steps[s] || ""}</div>` : lk ? `<div id="tut" class="on lesson">${stepLessonHTML(lk, s)}</div>` : "";
  $("#sheetBody").innerHTML = `${sheetX(o)}${tabs}${wantHTML(o)}<h3 class="ptitle">${o.cust.name} için ${cap1(sizedName(o.drink, o.size))}</h3>${steps}${tut}<canvas id="closeup"></canvas><div id="mgBody"></div><div class="hint">${rank().guide && !o.tutorial && !lk ? D.minigames[s].hint : ""}</div><div id="mgScore" class="score"></div>`;
  CLOSEUP.init($("#closeup"));
  $("#sheet").classList.add("on"); bindSheetX(); updOrderBars(); drawCup = null;
  $("#sheetBody").querySelectorAll(".tabs button").forEach(b => b.onclick = () => { day.active = +b.dataset.i; renderBench(); });
  uiZone(o, $("#mgBody"));
  if (lk && !(s === "extract" && o.phase === "run")) lessonGate(o, s, lk);
  if (o.tutorial) pulseControl(s);
  if (fitSheet()) { CLOSEUP.init($("#closeup")); if (MG[s]) try { MG[s].draw(o, o.v || 0); } catch (e) {} }   // v0.30: tuval kalan alana göre küçüldü → yeniden çiz
}
// v0.30 §11 telefon dikey: hazırlama paneli kullanılabilir alana sığar; üstte başlık+adımlar, ortada küçülen tuval, altta ana düğme hep görünür
let drawCup = null;
function fitSheet() {
  const cv = $("#closeup"), wrap = $("#sheetBody"), sh = $("#sheet");
  if (!cv || !sh.classList.contains("on")) return false;
  if (!smallPhone()) { if (cv.style.width) { cv.style.width = ""; return true; } return false; }
  const old = cv.style.width; cv.style.width = "";
  const cs = getComputedStyle(sh), ws = getComputedStyle(wrap);
  const avail = sh.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const maxW = wrap.clientWidth - parseFloat(ws.paddingLeft) - parseFloat(ws.paddingRight);
  const natural = cv.offsetHeight, other = wrap.scrollHeight - natural;           // yalnız küçültür: CSS'teki doğal boydan büyümez
  const h = Math.max(64, Math.min(natural, maxW * 340 / 640, avail - other - 4));
  cv.style.width = Math.floor(h * 640 / 340) + "px";
  return cv.style.width !== old;
}
function bindSheetX() { const x = $("#sheetX"); if (x) x.onclick = () => hideSheet(); }
function hideSheet() { const o = day && day.orders[day.active]; if (!o || o.tutorial) return; window.CB_LESSON = false;
  AUDIO.stopLoops(); o.hidden = true; if (o.phase === "run") { o.phase = "ready"; o.v = 0; }
  $("#sheet").classList.remove("on"); toast("Sipariş bekliyor; devam için müşteriye dokun"); }
function pulseControl(s) { const el = $("#zB"); if (el && !el.disabled) el.classList.add("pulse"); }
function setTut(html) { const t = $("#tut"); if (t) t.innerHTML = html; }   // §10 Yıldız Teyze balonu
// ---------- §4 Renkli hedef çubuğu: tüm mini oyunlar ----------
// Ortada koyu yeşil Mükemmel (100), yanında açık yeşil Güzel (88), en dışta sarı İyi (72); dışı Kaçtı.
// Bölgeler rütbe toleransıyla daralır, ilgili hassasiyet yükseltmesiyle ×1,5 genişler (§8).
// v0.36: kolaylaştırıcılar 3 kademe. Eski kayıtta alınmış olan (eski ×1,5) 3. kademe sayılır.
const eqLevel = id => { const lv = (S.eqLv || {})[id]; return lv != null ? lv : (S.equipment[id] ? (D.equipment[id] && D.equipment[id].widen ? 3 : 1) : 0); };
const eqMax = id => (D.equipment[id] && D.equipment[id].widen ? 3 : 1);
const eqNextPrice = id => { const e = D.equipment[id], lv = eqLevel(id); if (!e.widen) return e.price; const v = e.price * (D.upgradeCost || [1, 1.3, 1.65])[Math.min(lv, 2)]; return Math.round(v / 10) * 10; };
const reqOk = r => eqLevel(r) >= eqMax(r);
const widenMult = step => { let m = 1; Object.keys(D.equipment).forEach(k => { const e = D.equipment[k], lv = eqLevel(k); if (e.widen === step && lv > 0) m = Math.max(m, (D.zones.widenLevels || [D.zones.widen])[Math.min(lv, 3) - 1] || D.zones.widen); }); return m; };
const mgSpeed = c => typeof c.speed === "function" ? c.speed() : c.speed;
// v0.39 §13: günlük bölge çarpanları (sabah kalibrasyonu tutmadıysa öğütme+ekstraksiyon, makine kirliyse ekstraksiyon)
const dayZoneMult = step => { let m = 1; if (day && day.dirty && step === "extract") m *= D.backflushPenalty; return m; };
function zoneSet(step, spd) {                                                     // §4 eşit zorluk: bölge genişliği ibre hızıyla orantılı (aynı zaman penceresi)
  const Z = D.zones, T = Z.time, v = spd || mgSpeed(MG[step]) || 37.5, w = DF().zone * Math.min(1, tol()) * widenMult(step) * dayZoneMult(step) * v;
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
function showZone(zone, sc) { if (zone === "perfect") AUDIO.sfx("perfect");   // v0.40 §14
  if (navigator.vibrate && LSG("cb_haptic") !== "0") { try { navigator.vibrate(zone === "perfect" ? 25 : zone === "miss" ? [50, 40, 50] : 10); } catch (e) {} }   // §13 titreşim
  const r = $("#zRes"); if (!r) return; r.className = "zres " + zone; r.textContent = ({ perfect: "MÜKEMMEL!", good: "Güzel", ok: "İyi", miss: "Kaçtı" })[zone] + " · " + sc; }
const DR = o => D.drinks[o.drink];                                               // v0.24 çizim seçenekleri tariften
const CZ = o => DR(o).cezve || {};
const BR = o => DR(o).brewer || "v60";
const before = (o, a, b) => { const A = o.all || o.steps, i = A.indexOf(a), j = A.indexOf(b); return i >= 0 && (j < 0 || i < j); };   // a adımı b'den önce mi
const iced = o => /^ice/.test(SZ(o.size).cup);
const ZM = (o, v, label, pos) => { if (o && o.z && o.tgt != null && (o.tutorial || zFade() > .25)) CLOSEUP.zmeter(v, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }, Object.assign({ label }, pos || {})); };   // v0.29: tuval içinde de renkli hedef göstergesi
// v0.40 §14: ustalaştıkça renkli bölgeler soluklaşır (Barista %55, Kıdemli %20); Ayarlar'dan hep tam gösterilebilir
const zFade = () => { if (LSG("cb_fullzones") === "1") return 1; const i = D.ranks.indexOf(rank()); return i >= 2 ? .2 : i === 1 ? .55 : 1; };
const applyFade = el => { const f = zFade(); if (f < 1) el.querySelectorAll(".zb").forEach(z => z.style.opacity = f); };
const EXT_T = o => { const r = D.drinks[o.drink].ratio || 2; return r === 1.5 ? 20 : r === 3 ? 37.5 : 27.5; };
const MG = {
  grind:   { mode: "osc", speed: 85, btn: "ÖĞÜT", left: "kaba", right: "ince", target: o => clamp((D.beans[o.bean || "brazil"].grindT || 50) + ((D.drinks[o.drink].profile || {}).grind || 0) + (day && !o.tutorial ? day.calShift || 0 : 0), 10, 90),   /* v0.40 §14: kalibrasyon kayması */ sfx: "grind", tipLow: "grind_low", tipHigh: "grind_high",
             draw: (o, v) => { CLOSEUP.grind(v); ZM(o, v, "hedef öğütüm"); } },
  dose:    { mode: "hold", fill: "shake", speed: 9 * 100 / 24, btn: "BASILI TUT · dozla", left: "0 g", right: o => `${Math.round(SZ(o.size).dose * 4 / 3)} g`, target: () => 75, sfx: "dose", tipLow: "dose_low", tipHigh: "dose_high",
             onStart: () => AUDIO.sfx("dose"), draw: (o, v) => { CLOSEUP.dose(v * SZ(o.size).dose * 4 / 300, SZ(o.size).dose); ZM(o, v, "hedef " + SZ(o.size).dose + " g"); } },   // §7 double/büyük: 36 g
  tamp:    { mode: "hold", ring: true, speed: 40, btn: "BASILI TUT · bastır", target: () => 58, /* v0.40 §14: bastır ve tut */ sfx: "tamp", tipLow: "tamp_low", tipHigh: "tamp_high",
             draw: (o, v) => CLOSEUP.tamp(v / 100, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  extract: { mode: "sweep", speed: EXTRACT_SPEED * 100 / 45, btn0: "BAŞLAT", btn: "DURDUR", left: "0 sn", right: "45 sn", target: o => EXT_T(o) / 45 * 100, tipLow: "extract_low", tipHigh: "extract_high",
             onStart: () => AUDIO.loop("extract", true), onStop: () => { AUDIO.loop("extract", false); AUDIO.sfx("extractStop"); },
             draw: (o, v) => { const t = v * .45, tT = EXT_T(o), tg = Math.round(SZ(o.size).dose * (D.drinks[o.drink].ratio || 2)); CLOSEUP.extract(t, Math.max(0, (t - 6) * tg / (tT - 6)), tg, o.phase === "run", tT, 2.5, { tWin: o.z ? [+(tT - o.z.k * .45).toFixed(1), +(tT + o.z.k * .45).toFixed(1)] : [tT - 2.5, tT + 2.5], Z: o.z && zFade() > .25 ? { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } : null, hideTime: zFade() <= .25 }); } },   // v0.40 §14: usta görünümünde saniye gizli, renk sarışınlaşır · ön ıslatma 6 sn, sonra verim (g); gösterilen pencere renkli bölgelerin gerçek genişliği
  milk:    { mode: "hold", speed: () => (S.equipment.steamWand ? 24 : 16) * 100 / 65, btn: "BASILI TUT · ısıt", left: o => o.milkStage === 1 ? "az köpük" : "20 °C", right: o => o.milkStage === 1 ? "çok köpük" : "85 °C", target: o => o.milkStage === 1 ? 45 : (62.5 - 20) / 65 * 100, /* v0.40 §14: 1. hava al, 2. ısıt */ tipLow: "milk_low", tipHigh: "milk_high",
             onStart: () => { AUDIO.loop("milk", true); AUDIO.milkAir(true); }, onTick: o => AUDIO.milkAir(20 + o.v * .65 < 45),
             draw: (o, v) => { const tt = { dollop: 1.2, foam: 1.8, micro: .8, hot: .2 }[D.drinks[o.drink].milk] || 1;
               if (o.milkStage === 1) { CLOSEUP.milk(20 + v * .15, tt * clamp(v / (o.tgt || 45), 0, 1.4), tt, o.phase === "run", o.phase === "run", { liquid: DR(o).milkLiquid || "milk" }); ZM(o, v, "hedef köpük hacmi", { x: 30 }); return; }
               const temp = 20 + v * .65, tex = o.airScore != null ? tt * Math.max(.3, o.airScore / 100) : tt * clamp(v / (o.tgt || 65), 0, 1.3);
               CLOSEUP.milk(temp, tex, tt, o.phase === "run" && o.airScore == null && temp < 45 && DR(o).milk !== "hot", o.phase === "run", { liquid: DR(o).milkLiquid || "milk" }); ZM(o, v, "hedef 60–65 °C", { x: 30 }); } },
  // §3 aletlerin mini oyunları (espressodan sonra; her biri farklı biçim)
  water:   { mode: "hold", speed: 28, btn: "BASILI TUT · sıcak su", left: "boş", right: "taşar", target: () => 72, tipLow: "water_low", tipHigh: "water_high",
             onStart: () => AUDIO.loop("extract", true), onStop: () => AUDIO.loop("extract", false), draw: (o, v) => { CLOSEUP.water(v, o.phase === "run", { empty: before(o, "water", "extract") }); ZM(o, v, "hedef seviye"); } },   // v0.24 long black: su önce, bardak boş
  pressure:{ mode: "osc", dial: true, speed: 55, btn: "VİDAYI KAPAT", target: () => 62, sfx: "tamp", tipLow: "pressure_low", tipHigh: "pressure_high",
             draw: (o, v) => CLOSEUP.pressure(v, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  // §3 espresso dışı kahveler: Türk kahvesi (cezve), French press, filtre (V60)
  tkdose:  { mode: "hold", dial: true, speed: 40, btn: "BASILI TUT · kahve koy", left: "0 g", right: "10 g", target: () => 70, sfx: "dose", draw: (o, v) => CLOSEUP.tkdose(v / 100, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }, CZ(o)) },
  tkstir:  { mode: "act", act: "circle", need: 3, btn: "Cezvenin içinde parmağınla daire çiz", draw: (o, v) => CLOSEUP.cezveStir(v, o.ang || 0, CZ(o)) },
  tkfoam:  { mode: "sweep", dial: true, speed: 30, btn0: "OCAĞA KOY", btn: "OCAKTAN AL", left: "soğuk", right: "taştı", target: () => 80, draw: (o, v) => CLOSEUP.cezveFoam(v, o.phase === "run", { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }, Object.assign({}, CZ(o), { blind: !o.tutorial && (S.served[o.drink] || 0) >= 3 })) },   // v0.40 §14: 3 servisten sonra ölçek gizli, köpüğe bak
  mndose:  { mode: "hold", dial: true, speed: 40, btn: "BASILI TUT · ezme koy", left: "0", right: "2 kaşık", target: () => 70, sfx: "dose", draw: (o, v) => CLOSEUP.tkdose(v / 100, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }, CZ(o)) },
  mirraboil:{ mode: "sweep", dial: true, speed: 14, btn0: "KAYNAT", btn: "OCAKTAN AL", left: "soğuk", right: "taştı", target: () => 82, draw: (o, v) => CLOSEUP.cezveFoam(v, o.phase === "run", { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }, { vessel: "mirra" }) },
  tkserve: { mode: "act", act: "taps", need: () => 3, btn: "SERVİS", draw: (o, v) => CLOSEUP.kit("tkserve", v, { n: o.taps || 0, N: 3 }) },
  fpdose:  { mode: "hold", dial: true, speed: 40, btn: "BASILI TUT · kahve koy", left: "0 g", right: "40 g", target: () => 75, sfx: "dose", draw: (o, v) => CLOSEUP.press(v, "dose", false, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  fpwater: { mode: "hold", dial: true, speed: 30, btn: "BASILI TUT · su dök", left: "boş", right: "taşar", target: () => 80, onStart: () => AUDIO.loop("extract", true), onStop: () => AUDIO.loop("extract", false), draw: (o, v) => CLOSEUP.press(v, "water", o.phase === "run", { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }, DR(o).brewer === "aeropress" ? "aeropress" : "frenchpress") },
  fpsteep: { mode: "sweep", dial: true, speed: 100 / 12, btn0: "BAŞLAT", btn: "DURDUR", left: "0 dk", right: "6 dk", target: () => 66.7, draw: (o, v) => CLOSEUP.press(v, "steep", false, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }) },
  fpplunge:{ mode: "act", act: "hold", speed: 30, btn: "BASILI TUT · pistonu bastır", draw: (o, v) => CLOSEUP.press(v, "plunge") },
  fdose:   { mode: "hold", dial: true, speed: 40, btn: "BASILI TUT · kahve koy", left: "0 g", right: "30 g", target: () => 72, sfx: "dose", draw: (o, v) => CLOSEUP.v60(v, "dose", null, { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k }, BR(o)) },
  bloom:   { mode: "act", act: "hold", speed: 60, btn: "BASILI TUT · ön ıslatma", draw: (o, v) => CLOSEUP.v60(v, "bloom", o.phase === "run", null, BR(o)) },
  pourover:{ mode: "act", act: "circle", need: 3, btn: "Kettle'la merkezden dışa daire çiz", draw: (o, v) => CLOSEUP.v60(v, "pour", o.ang || 0, null, BR(o)) },
  // §3 dünya kahveleri adımları (gerçek hareketler + göstergeler)
  pump:    { mode: "act", act: "taps", need: o => PUMPS[o.size] || 2, btn: "POMPALA", draw: (o, v) => { const k = D.drinks[o.drink].pump || "vanilla"; CLOSEUP.kit("pump", v, { n: o.taps || 0, N: PUMPS[o.size] || 2, color: D.specials[k].color, name: D.specials[k].name.toLocaleLowerCase("tr"), flash: o.flash }); } },
  drizzle: { mode: "act", act: "circle", need: 2, btn: "Üstüne daire çizerek sos gezdir", draw: (o, v) => CLOSEUP.kit("drizzle", v, { ang: o.ang, color: D.specials[D.drinks[o.drink].drizzle || "caramel"].color, glass: iced(o) }) },
  cream:   { mode: "act", act: "circle", need: 2, btn: "Sifonla daire çizerek krema sık", draw: (o, v) => CLOSEUP.kit("cream", v, { ang: o.ang, glass: iced(o) }) },
  scoop:   { mode: "act", act: "hold", speed: 45, btn: "BASILI TUT · dondurma topu al", draw: (o, v) => CLOSEUP.kit("scoop", v, { N: SZ(o.size).scoops || 1 }) },
  pourshot:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · espressoyu dök", draw: (o, v) => CLOSEUP.kit("pourshot", v, { N: SZ(o.size).scoops || 1 }) },
  garnish: { mode: "act", act: "taps", need: () => 1, btn: "LİMON", draw: (o, v) => CLOSEUP.kit("garnish", v, { glass: iced(o) }) },
  ice:     { mode: "act", act: "taps", need: () => 3, btn: "BUZ", draw: (o, v) => CLOSEUP.kit("ice", v, { N: 3 }) },
  coldwater:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · soğuk su dök", draw: (o, v) => CLOSEUP.kit("coldwater", v, { run: o.phase === "run" }) },
  coldmilk:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · soğuk süt dök", draw: (o, v) => CLOSEUP.kit("coldmilk", v, { run: o.phase === "run" }) },
  tonic:   { mode: "act", act: "hold", speed: 25, btn: "BASILI TUT · toniği yavaşça dök", draw: (o, v) => CLOSEUP.kit("tonic", v, { run: o.phase === "run" }) },
  coldpour:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · soğuk demlemeyi dök", draw: (o, v) => CLOSEUP.kit("coldpour", v, { run: o.phase === "run" }) },
  whisk:   { mode: "act", act: "circle", need: 5, btn: "Kasede daire çizerek çırp", draw: (o, v) => CLOSEUP.kit("whisk", v, { ang: o.ang, N: 5, bowl: DR(o).whiskBowl }) },
  spoontop:{ mode: "act", act: "hold", speed: 40, btn: "BASILI TUT · köpüğü kaşıkla koy", draw: (o, v) => CLOSEUP.kit("spoontop", v) },
  blend:   { mode: "sweep", dial: true, speed: 22, btn0: "ÇALIŞTIR", btn: "DURDUR", target: () => 72, onStart: () => AUDIO.loop("extract", true), onStop: () => AUDIO.loop("extract", false), draw: (o, v) => CLOSEUP.kit("blend", v, { run: o.phase === "run", Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  shakeit: { mode: "act", act: "shake", need: 10, btn: "Shaker'ı sağa-sola kaydırarak çalkala", draw: (o, v) => CLOSEUP.kit("shakeit", v, { x: o.shx, ice: before(o, "ice", "shakeit") }) },
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
  pour:    { mode: "act", act: "hold", speed: 34, btn: "BASILI TUT · sütü dök", draw: (o, v) => CLOSEUP.pour(v, o.phase === "run", D.drinks[o.drink].milk, { empty: !before(o, "extract", "pour") && !before(o, "pourover", "pour"), glass: !!DR(o).glass }) },
  coldfoam:{ mode: "act", act: "hold", speed: 35, btn: "BASILI TUT · soğuk süt köpüğü", draw: (o, v) => CLOSEUP.kit("coldfoam", v, { run: o.phase === "run" }) },
  colddrip:{ mode: "sweep", dial: true, speed: 12, btn0: "VANAYI AÇ", btn: "VANAYI KAPAT", target: () => 70, draw: (o, v) => CLOSEUP.kit("colddrip", v, { run: o.phase === "run", Z: { t: o.tgt, p: o.z.p, g: o.z.g, k: o.z.k } }) },
  tumbler: { mode: "act", act: "shake", need: 8, btn: "Sağa-sola kaydır, dabara-tumbler ile köpürt", draw: (o, v) => CLOSEUP.kit("tumbler", v, { x: o.shx }) },
  cloth:   { mode: "act", act: "hold", speed: 35, btn: "BASILI TUT · bezden süz", draw: (o, v) => CLOSEUP.kit("cloth", v, { run: o.phase === "run" }) },
  steepcup:{ mode: "act", act: "hold", speed: 35, btn: "BASILI TUT · sıcak su dök", draw: (o, v) => CLOSEUP.kit("steepcup", v, { run: o.phase === "run" }) },
  dust:    { mode: "act", act: "shake", need: 6, btn: "Sağa-sola kaydırarak serp", draw: (o, v) => { const k = DR(o).dust || "cinnamon", sp = D.specials[k] || {}; CLOSEUP.kit("dust", v, { x: o.shx, color: sp.color, name: (sp.name || "tarçın").toLocaleLowerCase("tr") }); } },
  art:     { mode: "hold", speed: 32, btn: "BASILI TUT · dök", left: "%0", right: "%100", target: () => 72.5, tipLow: "art_low", tipHigh: "art_high",
             draw: (o, v) => { if (o.artCut) CLOSEUP.art(o.fill, v / 100); else CLOSEUP.art(v, null); ZM(o, v, o.artCut ? "kesim: tam orta" : "doluluk %65–80", { x: 345 }); } }
};
function uiAct(o, el, s) {                                                        // §4 hareket adımı: ilerleme çubuğu + gerçek hareket
  const c = MG[s]; o.v = 0; o.ang = 0; o.shx = 50; o.phase = "run"; o.frozen = false; let last = null, acc = 0, dir = 0, run = 0;
  el.innerHTML = `<div class="actbar"><i id="actFill"></i></div><div class="acthint">${c.act === "taps" ? D.minigames[s].hint : c.btn}</div>` + (c.act === "hold" || c.act === "taps" ? `<button class="hold big pri" id="zB">${c.btn}</button>` : "") + `<div id="zRes" class="zres"></div>`;
  const cv = $("#closeup"), done = () => { if (o.phase === "done") return; o.phase = "done"; AUDIO.stopLoops(); showZone("perfect", 100); finishStep(o, 100); };
  const set = p => { if (o.phase === "intro") return; o.v = clamp(p, 0, 100); const f = $("#actFill"); if (f) f.style.width = o.v + "%"; if (o.v >= 100) done(); };
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2, w: r.width }; };
  if (c.act === "taps") { const b = $("#zB"), N = c.need(o); o.taps = 0;          // §3 sayılı dokunuş: pompa, buz, limon
    b.onclick = () => { if (o.phase === "done" || o.phase === "intro") return; o.taps++; o.flash = true; setTimeout(() => { o.flash = false; }, 120); AUDIO.sfx("click"); set(o.taps / N * 100); };
    return; }
  if (c.act === "hold") { const b = $("#zB"); o.phase = "ready";
    b.onpointerdown = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} if (o.phase === "done" || o.phase === "intro") return; o.phase = "run"; AUDIO.loop("extract", true); };
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
  if (c.act === "shake") { const m = MOTION.bind(el, o, sg => { o.shx = clamp(50 + sg * 35, 0, 100); set(o.v + 100 / c.need); AUDIO.sfx("dose"); });   // v0.41 §14 telefonu salla
    const h = el.querySelector(".acthint"); if (m && h) { if (m[0] === "<") h.insertAdjacentHTML("afterend", m); else h.textContent += m; } }
}
function uiZone(o, el) {
  const s = o.steps[o.i], c = MG[s]; MOTION.fn = null;
  if (c.mode === "act") { uiAct(o, el, s); c.draw(o, 0); return; }
  if (s === "extract" && o.phase === "run" && o.z && o.tgt != null) {             // v0.40 §14 çift grup: arka planda akan shot'a dönüş (kaldığı yerden)
    el.innerHTML = zoneBar(o.tgt, o.z, c.left, c.right) + `<button class="hold big pri" id="zB">${c.btn}</button><div id="zRes" class="zres"></div>`; bindZone(o, s); setNeedle(o.v); c.draw(o, o.v); applyFade(el); return; }
  if (s === "milk") o.milkStage = (DR(o).milk === "hot" || o.tutorial) ? 2 : 1, o.airScore = null;
  $("#closeup").onpointerdown = $("#closeup").onpointermove = null;
  o.z = zoneSet(s); o.tgt = c.target(o); o.mode = null; o.artCut = false; o.dir = 1; o.frozen = false; o.spd = 1; o.blond = null;
  const pf = (s === "extract" && D.drinks[o.drink].profile) || {};                 // §4 tarif profili (ristretto biraz daha dar pencere)
  if (pf.extractZone) o.z = { p: o.z.p * pf.extractZone, g: o.z.g * pf.extractZone, k: o.z.k * pf.extractZone };   // ristretto: aynı hızda biraz daha dar pencere
  if (s === "tkfoam" && (D.drinks[o.drink].cezve || {}).vessel === "sand") o.spd = 0.65;   // kumda pişirme: köpük yavaş kabarır
  let chain = "";
  if (s === "extract" && !o.tutorial && o.grindDev != null && Math.abs(o.grindDev) > 3) { o.spd = clamp(1 - o.grindDev / 100 * 1.5, .75, 1.3); chain = o.spd > 1 ? "Öğütüm kaba: kahve hızlı akıyor" : "Öğütüm ince: kahve yavaş akıyor"; }   // v0.40 §14 hata zinciri
  if (o.spd !== 1) o.z = { p: o.z.p * o.spd, g: o.z.g * o.spd, k: o.z.k * o.spd };       // §4 eşit zorluk: ibre hızı değişirse bölgeler de aynı oranda değişir
  if (pf.blond) o.blond = { t: Math.round(o.tgt * .62), done: false, score: null };
  o.v = c.mode === "osc" ? Math.random() * 100 : 0; o.phase = c.mode === "osc" ? "run" : "ready";
  const legend = `<div class="zends" style="justify-content:center"><span class="zleg"><i class="perf"></i>Mükemmel <i class="good"></i>Güzel <i class="ok"></i>İyi</span></div>`;
  const fx = x => typeof x === "function" ? x(o) : x;
  el.innerHTML = (c.ring || c.dial ? legend : zoneBar(o.tgt, o.z, fx(c.left), fx(c.right), o.blond && o.blond.t)) + (o.blond ? `<button class="hold big" id="zB2" disabled style="box-shadow:none">💧 Akışı yumuşat</button>` : "") + `<button class="hold big pri" id="zB">${c.btn0 || c.btn}</button><div id="zRes" class="zres"></div>`;
  if (chain) el.insertAdjacentHTML("afterbegin", `<div class="chainmsg">⚠ ${chain}</div>`);
  if (s === "dose" && c.fill === "shake") {                                       // v0.40 §14 dozlama: sallayarak doldur, TAMAM'la bitir (v0.42: öğreticide de)
    const b = $("#zB"); b.textContent = "TAMAM"; o.phase = "shake"; const cv = $("#closeup"); let last = null, dir = 0, run = 0;
    const inc = () => { if (o.phase !== "shake" || o.frozen) return; o.v = Math.min(100, o.v + (o.v < o.tgt - 15 ? 6 : 2)); AUDIO.sfx("dose");
      if (o.tutorial && o.v >= o.tgt - 1) { o.v = o.tgt; o.frozen = true; setTut(D.tutorial.doseNow); b.classList.add("pulse"); } setNeedle(o.v); c.draw(o, o.v); };
    if (!o.tutorial) el.insertAdjacentHTML("afterbegin", '<div class="acthint">Yakın planı sağa-sola kaydırarak kahve düşür; hedefe gelince TAMAM</div>');   // v0.42: öğreticide Yıldız Teyze anlatır
    cv.style.touchAction = "none"; cv.onpointerdown = e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} last = e.clientX; };
    cv.onpointerup = cv.onpointercancel = () => { last = null; };
    cv.onpointermove = e => { if (last == null || o.phase !== "shake") return; const dx = e.clientX - last, sg = Math.sign(dx), w = cv.getBoundingClientRect().width;
      if (sg) { if (sg === dir) run += Math.abs(dx); else { if (run > w * .05) inc(); dir = sg; run = Math.abs(dx); } } last = e.clientX; };
    const m = MOTION.bind(el, o, inc);   // v0.41 §14 telefonu salla
    const h = el.querySelector(".acthint"); if (m && h) { if (m[0] === "<") h.insertAdjacentHTML("afterend", m); else h.textContent = h.textContent.replace("; hedefe", m + "; hedefe"); }
  }
  if (s === "grind" && !o.tutorial && !o.pregrindAsk) {                             // v0.40 §14 önden öğütme
    el.insertAdjacentHTML("beforeend", `<button class="sec" id="pgB" style="margin-top:6px">＋ Sonraki için de öğüt</button>`); const pg = $("#pgB"); o.pregrind = false;
    pg.onclick = () => { o.pregrind = !o.pregrind; pg.classList.toggle("pri", o.pregrind); pg.textContent = o.pregrind ? "✓ Bir doz da sonraki için" : "＋ Sonraki için de öğüt"; AUDIO.sfx("click"); };
  }
  if (s === "milk" && o.milkStage === 1) $("#zB").textContent = "BASILI TUT · hava al";
  applyFade(el);
  if (o.blond) $("#zB2").onclick = () => { if (o.phase !== "run" || o.blond.done) return; const [sc, zone] = zoneScore(o.v, o.blond.t, o.z); o.blond.done = true; o.blond.score = sc; showZone(zone, sc); $("#zB2").disabled = true; AUDIO.sfx("click"); };
  if ((c.ring || c.dial) && c.mode === "osc") $("#closeup").onpointerdown = e => { e.preventDefault(); if (o.phase !== "run" || o.steps[o.i] !== s) return; if (o.tutorial && !o.frozen) return setTut(D.tutorial.tooEarly); stopZone(o, s); };   // §4 tamping: daireye dokun
  bindZone(o, s); setNeedle(o.v); c.draw(o, o.v);
  if (o.tutorial && $("#tut")) {                                                 // §10 öğretici: önce anlatım + Anladım; sonra işlem başlar
    const osc = c.mode === "osc";                                               // öğütme/tamping: Anladım → ibre 1–2 tur → yeşilde "Tam şimdi!"
    o.phase = "intro"; o.v = 0; o.dir = 1; o.bounces = 0; setNeedle(0); c.draw(o, 0);
    const b = $("#zB"); b.disabled = true; b.classList.remove("pulse"); b.style.display = "none";   // v0.30: "Anladım" ana düğmenin yerinde (hep görünür, düzen zıplamaz)
    b.insertAdjacentHTML("beforebegin", `<button class="hold big pri pulse" id="tutOk">Anladım</button>`);
    $("#tutOk").onclick = () => { if (o.phase !== "intro") return; $("#tutOk").remove(); b.style.display = ""; AUDIO.sfx("click");
      if (osc) o.phase = "run"; else { o.phase = s === "dose" && c.fill === "shake" ? "shake" : "ready"; b.disabled = false; if (o.phase !== "shake") b.classList.add("pulse"); } };   // dozlama/çekme: düğme şimdi açılır
  }
}
function bindZone(o, s) {
  const c = MG[s], b = $("#zB"), mode = o.mode || c.mode;
  b.onpointerdown = b.onpointerup = b.onpointercancel = b.onclick = null;
  if (o.phase === "shake") { b.onclick = () => { if (o.phase !== "shake" || o.v <= 0) return; if (o.tutorial && !o.frozen) return setTut(D.tutorial.doseEarly); $("#closeup").onpointermove = null; stopZone(o, s); }; return; }   // v0.40 §14 dozlama: TAMAM
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
function artDraw(o, s) {                                                          // v0.40 §14 latte art: parmakla kesim çizgisi
  const c = MG[s], cv = $("#closeup"); $("#mgBody").innerHTML = `<div class="acthint">Fincanın ortasına dokun ve parmağını <b>yukarı</b> çek (kalbin kesimi)</div><div id="zRes" class="zres"></div>`;
  CLOSEUP.art(o.fill, null); o.phase = "draw"; let pts = null; cv.style.touchAction = "none";
  const P = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 480, y: (e.clientY - r.top) / r.width * 480 }; };
  cv.onpointerdown = e => { e.preventDefault(); if (o.phase !== "draw") return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} pts = [P(e)]; };
  cv.onpointermove = e => { if (!pts || o.phase !== "draw") return; const p = P(e); pts.push(p); CLOSEUP.art(o.fill, clamp((p.x - 170) / 140, 0, 1)); };
  cv.onpointerup = cv.onpointercancel = () => { if (!pts || o.phase !== "draw") return; const a = pts[0], z = pts[pts.length - 1]; const L = a.y - z.y;
    if (pts.length < 3 || L < 15) { pts = null; CLOSEUP.art(o.fill, null); const r = $("#zRes"); if (r) { r.className = "zres ok"; r.textContent = "Yukarı doğru çek"; } return; }
    const d0 = Math.hypot(a.x - 240, a.y - 125), dev = pts.reduce((m, p) => m + Math.abs(p.x - a.x), 0) / pts.length;
    const raw = clamp(Math.round(100 - d0 * .8 - dev * 1.6 - Math.max(0, 70 - L) * .9), 0, 100), Zs = D.zones.score;
    const [cs, zone] = raw >= 88 ? [Zs.perfect, "perfect"] : raw >= 72 ? [Zs.good, "good"] : raw >= 55 ? [Zs.ok, "ok"] : [0, "miss"];
    o.phase = "done"; cv.onpointerdown = cv.onpointermove = cv.onpointerup = null; showZone(zone, cs); AUDIO.sfx("open");
    finishStep(o, Math.round((o.fillScore + cs) / 2), d0 > 30 ? c.tipLow : c.tipHigh); };
}
function stopZone(o, s) {
  const c = MG[s]; o.phase = "done"; c.onStop && c.onStop();
  let [sc, zone] = zoneScore(o.v, o.tgt, o.z);
  if (o.blond) { const bs = o.blond.done ? o.blond.score : 0; sc = Math.round((sc + bs) / 2); o.blond.done = true; const b2 = $("#zB2"); if (b2) b2.disabled = true; }   // §4 lungo: iki aşamanın ortalaması
  showZone(zone, sc); setNeedle(o.v);
  if (c.sfx) AUDIO.sfx(c.sfx);
  if (s === "milk" && o.milkStage === 1) {                                        // v0.40 §14 süt: 1. aşama bitti → ısıtma
    o.airScore = sc; o.milkStage = 2; o.v = 0; o.tgt = c.target(o); o.z = zoneSet("milk");
    setTimeout(() => { if (o.steps[o.i] !== "milk") return; o.phase = "ready"; $("#mgBody").innerHTML = zoneBar(o.tgt, o.z, "20 °C", "85 °C") + `<button class="hold big pri" id="zB">BASILI TUT · ısıt</button><div id="zRes" class="zres"></div>`; applyFade($("#mgBody")); bindZone(o, s); setNeedle(0); c.draw(o, 0); }, 450);
    return; }
  if (s === "milk" && o.airScore != null) { sc = Math.round((o.airScore + sc) / 2); }
  if (s === "grind") { o.grindDev = o.v - o.tgt; if (o.pregrind && day) { day.pregrind = { score: sc, t: day.t }; useBean(o.bean, SZ(o.size).dose / 1000); toast("Bir doz önden öğütüldü · sonraki espresso hazır"); } }   // v0.40 §14 hata zinciri + önden öğütme
  if (s === "art" && !o.artCut) {                         // v0.40 §14 latte art 2. aşama: çizim (ortadan yukarı çek)
    o.fillScore = sc; o.fill = o.v; o.artCut = true;
    setTimeout(() => { if (o.steps[o.i] !== "art") return; artDraw(o, s); }, 450);
    return; }
  if (s === "art" && false) {                             // eski kesim ibresi (kullanılmıyor)
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
const TAB = { upg: ["Geliştirmeler", "#3b6ea8", "Geliştirme"], tools: ["Aletler & Makineler", "#c9772b", "Aletler"], loans: ["Krediler", "#b5533c", "Krediler"], decor: ["Dekorasyon", "#5f8a4b", "Dekor"] };
let hubTab = "upg";
const buy = (cost, fn) => { if (S.money < cost) return; S.money -= cost; S.spend = (S.spend || 0) + cost; fn(); AUDIO.sfx("register"); save(); renderHUD(); };   // v0.24: alımlar gün kapanışında görünür

// v0.36: bir tarifin menüde istenebilmesi için Tedarik'te eksik olanlar (özel malzeme/şurup, bardak, süt)
function supplyNeedsFor(ids) {
  const out = [], seenK = new Set(), add = (key, txt) => { if (!seenK.has(key)) { seenK.add(key); out.push({ key, txt }); } };
  ids.forEach(id => { const d = D.drinks[id];
    (d.uses || []).forEach(([k]) => { if (specStock(k) <= 0) add((k === "sugar" ? "ex:" : "sp:") + k, specName(k)); });
    (d.sizes || ["single"]).forEach(z => { const c = SZ(z).cup; if ((S.cups[c] || 0) < D.cupMin) add("cup:" + c, D.cups[c].name); });
    if (isMilky(id) && (S.milk || 0) < D.economy.minMilk) add("milk:cow", D.milks.cow.name); });
  return out;
}
let supplyFocus = null, supplyBackToHub = false;
function goSupply(keys, fromHub) { supplyFocus = keys; supplyBackToHub = !!fromHub; if (fromHub) $("#ovHub").classList.remove("on"); renderSupply(); openOverlay("#ovShop"); }
function closeSupplyAside() { closeOverlay("#ovShop"); supplyFocus = null; if (supplyBackToHub) { supplyBackToHub = false; renderHub(); openOverlay("#ovHub"); } }
// --- Tedarik: yalnızca malzeme (§2) ---
function supplyMissing() {
  const m = [], kg = beanKg("brazil");
  if (kg < D.economy.minBeans) m.push(`Brezilya çekirdeği (ev çekirdeği) — en az ${String(D.economy.minBeans).replace(".", ",")} kg olmalı (şu an ${kg.toFixed(2).replace(".", ",")} kg).`);
  if (needsMilk() && (S.milk || 0) < D.economy.minMilk) m.push(`İnek sütü — en az ${String(D.economy.minMilk).replace(".", ",")} L olmalı (şu an ${(S.milk || 0).toFixed(1).replace(".", ",")} L).`);
  cupsNeeded().forEach(k => { const n = S.cups[k] || 0; if (n < D.cupMin) m.push(`${D.cups[k].name} — en az ${D.cupMin} adet olmalı (şu an ${n}).`); });   // §7 bardak
  return m;
}
// v0.31: zorunlu eksikleri tek dokunuşla tamamla (çekirdek 1 kg, süt 1 L, bardak paket olarak; yalnızca gereken kadar)
function fillMissingPlan() {
  const items = [], kg = beanKg("brazil");
  if (kg < D.economy.minBeans) { const n = Math.ceil(D.economy.minBeans - kg - 1e-9); items.push({ cost: n * SP(D.beans.brazil.price), fn: () => { S.beans.brazil = { kg: kg + n, boughtDay: S.day }; } }); }
  if (needsMilk() && (S.milk || 0) < D.economy.minMilk) { const n = Math.ceil(D.economy.minMilk - (S.milk || 0) - 1e-9); items.push({ cost: n * SP(D.milks.cow.price), fn: () => { S.milk = (S.milk || 0) + n; S.milkDay = S.day; } }); }
  cupsNeeded().forEach(k => { const have = S.cups[k] || 0; if (have < D.cupMin) { const n = Math.ceil((D.cupMin - have) / D.cups[k].pack); items.push({ cost: n * SP(D.cups[k].price), fn: () => { S.cups[k] = (S.cups[k] || 0) + n * D.cups[k].pack; } }); } });
  return { items, cost: items.reduce((a, x) => a + x.cost, 0) };
}
function renderSupply() {
  const lv = shop(), miss = supplyMissing(), flow = dayFlow === "supply";
  let html = `<h2>Tedarik${flow ? "" : '<span class="x" id="supX">✕</span>'}</h2>`;
  html += cashBox();   // §7 para belirgin, yeşil kağıt para ikonu
  html += `<div class="box" style="text-align:left"><h4>Mevcut stok</h4><p style="margin:4px 0 0">☕ ${openBeans().map(id => `${D.beans[id].name} <b>${beanKg(id).toFixed(2).replace(".", ",")} kg</b>`).join(" · ")}${needsMilk() || S.tools.milkKit ? `<br>🥛 ${openMilks().map(k => `${D.milks[k].short} <b>${milkL(k).toFixed(1).replace(".", ",")} L</b>`).join(" · ")}` : ""}<br>
    🥤 Bardak: ${cupsKnown().map(k => `${D.cups[k].name} <b>${S.cups[k] || 0}</b>`).join(" · ")}</p></div>`;
  const plan = flow && miss.length ? fillMissingPlan() : null;
  html += miss.length ? `<div class="needbox"><b>Güne başlamadan önce eksik:</b><ul>${miss.map(t => `<li>${t}</li>`).join("")}</ul>${plan ? `<span>${S.money >= plan.cost ? "Alttaki <b>Eksikleri al</b> düğmesi hepsini birden alır." : "Kasada yeterli para yok: <b>Kredi al</b> ile tamamlayabilirsin."}</span>` : ""}</div>` : `<div class="req ok" style="font-size:15px">Malzemeler tamam ✓</div>`;
  const exZero = Object.keys(D.extras).filter(k => !(S.extras[k] > 0));            // §7 küçük malzemeler zorunlu değil: yalnızca uyarı
  if (exZero.length) html += `<div class="req" style="font-size:15px;margin-top:6px;background:#fff4d6;color:#8a6412">⚠ Biten küçük malzeme: ${exZero.map(k => D.extras[k].name).join(", ")}. Zorunlu değil; yoksa bahşiş azalır.</div>`;
  const beanLow = beanKg("brazil") < D.economy.minBeans, milkLow = needsMilk() && (S.milk || 0) < D.economy.minMilk;
  const nextBean = Object.keys(D.beans).sort((a, b) => (D.beans[a].unlock || 1) - (D.beans[b].unlock || 1) || (D.beans[a].cups || 0) - (D.beans[b].cups || 0)).find(id => !beanOpen(id));   // v0.35: dükkan + eşik sırasıyla                  // §6 sıradaki kilitli çekirdek ipucu
  html += `<div class="box ${beanLow ? "need" : ""}"><h4>Çekirdekler (₺/kg)</h4><p class="muted">Müşteri istediği çekirdek yoksa gider. Brezilya ev çekirdeği: en az ${String(D.economy.minBeans).replace(".", ",")} kg.</p><table>` + openBeans().map(id => { const b = D.beans[id], kg = beanKg(id);
    return `<tr><td>${th("sup:bean")}<b>${b.name}</b><br><span class="muted">stok ${kg.toFixed(2).replace(".", ",")} kg · satış ×${b.mult.toFixed(2).replace(".", ",")}</span><span class="muted pdesc"><br>${b.notes}</span></td><td>₺${tl(SP(b.price))}</td>
      <td><button data-buy="${id}" ${S.money < SP(b.price) ? "disabled" : ""}>1 kg al</button></td></tr>`; }).join("") + `</table>${nextBean ? `<p class="muted">🔒 Sıradaki: ${D.beans[nextBean].name} — ${D.beans[nextBean].unlock}★ dükkan${D.beans[nextBean].cups ? ` ve tarif ilerlemesi ${D.beans[nextBean].cups} (şu an ${recipeProg()})` : ""}</p>` : ""}</div>`;
  if (needsMilk() || S.tools.milkKit) { const nextMilk = Object.keys(D.milks).find(k => !openMilks().includes(k));
    html += `<div class="box ${milkLow ? "need" : ""}"><h4>Sütler (₺/L)</h4><p class="muted">${S.equipment.fridge ? `Buzdolabıyla süt ${D.economy.milkShelfDays} gün dayanır.` : `Süt ${D.economy.milkShelfNoFridge} gün dayanır (buzdolabıyla ${D.economy.milkShelfDays}).`} Yeni süt alınca gün yenilenir. İnek sütü en az ${String(D.economy.minMilk).replace(".", ",")} L.</p><table>` +
      openMilks().map(k => { const m = D.milks[k], l = milkL(k); return `<tr><td>${th("sup:milk")}<b>${m.name}</b>${m.extra ? ` <span class="muted">· siparişe +₺${tl(m.extra)}</span>` : ""}<br><span class="muted">stok ${l.toFixed(1).replace(".", ",")} L</span></td><td>₺${tl(SP(m.price))}</td>
        <td><button data-milk="${k}" ${S.money < SP(m.price) ? "disabled" : ""}>1 L al</button></td></tr>`; }).join("") + `</table>${nextMilk ? `<p class="muted">🔒 Sıradaki: ${D.milks[nextMilk].name} — ${D.milks[nextMilk].rep} itibar (şu an ${S.rep})</p>` : ""}</div>`; }
  html += `<div class="box">${"<h4>Bardaklar (10'lu paket)</h4>"}<p class="muted">Bardak yoksa müşteri o boyu alamaz, gider. Her türden en az ${D.cupMin} adet.</p><table>` +
    cupsKnown().map(k => { const cp = D.cups[k], n = S.cups[k] || 0;
      return `<tr class="${n < D.cupMin ? "need" : ""}"><td>${th("cup:" + k)}<b>${cp.name}</b><br><span class="muted">stok ${n} adet</span></td><td>₺${tl(SP(cp.price))}</td><td><button data-cup="${k}" ${S.money < SP(cp.price) ? "disabled" : ""}>${cp.pack}'lu paket al</button></td></tr>`; }).join("") + `</table></div>`;
  const specs = Object.keys(D.specials).filter(specialOpen);                        // §3 şuruplar, soslar ve tatlılar
  if (specs.length) html += `<div class="box"><h4>Şuruplar, soslar ve özel malzemeler</h4><p class="muted">Stokta yoksa müşteri gider.</p><table>` +
    specs.map(k => { const sp = D.specials[k], n = specStock(k);
      const act = sp.brew ? `<button data-cb="1" ${beanKg("brazil") >= .2 && S.tools.coldBrewJar ? "" : "disabled"}>Demle (0,2 kg Brezilya → ${sp.pack} ${sp.unit})</button>` : `<button data-sp="${k}" ${S.money < SP(sp.price) ? "disabled" : ""}>${sp.pack} ${sp.unit} al</button>`;
      return `<tr><td>${th("sp:" + k)}<b>${sp.name}</b><br><span class="muted" style="${n === 0 ? "color:var(--kotu);font-weight:700" : ""}">stok ${n} ${sp.unit}${sp.brew ? " · gece boyunca demlenir, ertesi sabah hazır" + (S.cbBrewing ? ` · demleniyor: ${S.cbBrewing} bardak` : "") : ""}</span></td><td>${sp.brew ? "" : "₺" + tl(SP(sp.price))}</td><td>${act}</td></tr>`; }).join("") + `</table></div>`;
  html += `<div class="box"><h4>Küçük malzemeler</h4><p class="muted">Ara sıra kullanılır; yoksa bahşiş azalır.</p><table>` +
    Object.entries(D.extras).map(([k, e]) => { const n = S.extras[k] || 0, low = n < D.extrasLow;
      return `<tr><td>${th("ex:" + k)}<b>${e.name}</b><br><span class="muted" style="${n === 0 ? "color:var(--kotu);font-weight:700" : low ? "color:#b58a1e;font-weight:700" : ""}">stok ${n} adet${n === 0 ? " · bitti" : low ? " · az kaldı" : ""}</span></td><td>₺${tl(SP(e.price))}</td><td><button data-ex="${k}" ${S.money < SP(e.price) ? "disabled" : ""}>${e.pack}'lü paket al</button></td></tr>`; }).join("") + `</table></div>`;
  html += `<div class="row">${flow && endCtx ? '<button id="supBack">← Geri</button>' : ""}<button id="supLoan" class="loanbtn">🏦 Kredi al</button>${plan ? `<button class="pri" id="supFill">Eksikleri al · ₺${tl(plan.cost)}</button>` : `<button class="pri" id="supNext">${flow ? (firstSupply ? "Günü başlat ☕" : "Devam →") : supplyBackToHub ? "← Dükkana dön" : "Kapat"}</button>`}</div>`;
  const card = $("#shopCard"), keep = card.scrollTop; card.innerHTML = html; card.scrollTop = keep;   // v0.31: alım sonrası liste başa zıplamasın
  if (supplyFocus && supplyFocus.length) { let first = null;                       // v0.36: yönlendirmeyle gelindiyse gereken satırlar vurgulanır
    supplyFocus.forEach(k => { const [t, v] = k.split(":"), sel = t === "sp" ? `[data-sp="${v}"]` : t === "cup" ? `[data-cup="${v}"]` : t === "ex" ? `[data-ex="${v}"]` : t === "milk" ? `[data-milk="${v}"]` : null;
      const b = sel && card.querySelector(sel), tr = b && b.closest("tr"); if (tr) { tr.classList.add("need", "focus"); first = first || tr; } });
    if (first && !card.dataset.focused) { card.dataset.focused = "1"; first.scrollIntoView({ block: "center" }); } } else delete card.dataset.focused;
  const re = () => renderSupply();
  $("#shopCard").querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const id = b.dataset.buy; buy(SP(D.beans[id].price), () => { S.beans[id] = { kg: (S.beans[id]?.kg || 0) + 1, boughtDay: S.day }; }); re(); });
  $("#shopCard").querySelectorAll("[data-milk]").forEach(b => b.onclick = () => { const k = b.dataset.milk; buy(SP(D.milks[k].price), () => { if (k === "cow") S.milk = (S.milk || 0) + 1; else { S.milkAlt = S.milkAlt || {}; S.milkAlt[k] = (S.milkAlt[k] || 0) + 1; } S.milkDay = S.day; }); re(); });
  $("#shopCard").querySelectorAll("[data-cup]").forEach(b => b.onclick = () => { const k = b.dataset.cup; buy(SP(D.cups[k].price), () => { S.cups[k] = (S.cups[k] || 0) + D.cups[k].pack; }); re(); });
  $("#shopCard").querySelectorAll("[data-sp]").forEach(b => b.onclick = () => { const k = b.dataset.sp; buy(SP(D.specials[k].price), () => { S.syr = S.syr || {}; S.syr[k] = (S.syr[k] || 0) + D.specials[k].pack; }); re(); });
  const cbb = $("#shopCard [data-cb]"); if (cbb) cbb.onclick = () => { if (beanKg("brazil") < .2) return; useBean("brazil", .2); S.cbBrewing = (S.cbBrewing || 0) + D.specials.coldbrew.pack; toast("Soğuk demleme kahve demlenmeye kondu; yarın sabah hazır"); AUDIO.sfx("click"); save(); re(); };
  $("#shopCard").querySelectorAll("[data-ex]").forEach(b => b.onclick = () => { const k = b.dataset.ex; buy(SP(D.extras[k].price), () => { S.extras[k] = (S.extras[k] || 0) + D.extras[k].pack; }); re(); });
  $("#supLoan").onclick = () => openLoans(re);
  const sx = $("#supX"); if (sx) sx.onclick = closeSupplyAside;
  const sbk = $("#supBack"); if (sbk) sbk.onclick = backFromSupply;
  const sf = $("#supFill"); if (sf) sf.onclick = () => { const pl = fillMissingPlan(); if (S.money < pl.cost) return toast("Para yetmiyor · Kredi al ile tamamlayabilirsin"); buy(pl.cost, () => pl.items.forEach(x => x.fn())); toast("Eksikler alındı ✓"); re(); };
  const sn = $("#supNext"); if (sn) sn.onclick = () => { if (!flow) return closeSupplyAside(); if (supplyMissing().length) return;
    if (firstSupply) { firstSupply = false; dayFlow = null; mandatoryRestock = false; $("#ovShop").classList.remove("on"); return startDay(); } dayFlow = "hub"; $("#ovShop").classList.remove("on"); hubTab = "upg"; renderHub(); openOverlay("#ovHub"); };
}

// --- Krediler (Dükkan sekmesi + Tedarik'ten açılır pencere) ---
function loansHTML() {
  const lv = shop(), room = lv.loanLimit - (S.debt || 0), cap = x => Math.round(x * (1 + D.economy.loanInterest)) <= room;
  return `<p class="muted">Her kredi ayrı ödenir; geri ödeme %10 fazladır. Gün sonunda gelirin %20'si vadesi en yakın krediden kesilir. Vadesi dolan krediyi ödemezsen <b>iflas</b> edersin.</p>
    <p>Toplam borç: <b>₺${tl(S.debt || 0)}</b> · limit ₺${tl(lv.loanLimit)}</p><div class="row" style="justify-content:flex-start">
    ${D.economy.loans.map(l => `<button data-loan="${l.amount}" ${cap(l.amount) ? "" : "disabled"}>₺${tl(l.amount)} al → ₺${tl(Math.round(l.amount * (1 + D.economy.loanInterest)))} öde · ${l.days} gün</button>`).join("")}</div>
    ${(S.loans || []).map(l => { const mx = Math.max(0, Math.min(l.rem, S.money)), dl = daysLeft(l);
      return `<div class="slot" style="margin:8px 0"><div class="num" style="font-size:14px">#${l.id}</div><div class="info"><b>₺${tl(l.amount)} kredi → ₺${tl(l.owe)} geri ödeme</b>
        <span class="muted">Kalan ₺${tl(l.rem)} · vade ${dl === 0 ? "<b style='color:var(--kotu)'>bugün</b>" : dl <= 2 ? `<b style='color:var(--kotu)'>${dl} gün</b>` : dl + " gün"} (gün ${l.due} sonunda)</span></div>
        <div class="acts"><button data-close="${l.id}" ${S.money >= l.rem ? "" : "disabled"}>Kapat (₺${tl(l.rem)})${S.money >= l.rem ? "" : ` · ₺${tl(l.rem - Math.max(0, S.money))} daha gerekli`}</button>
        <input type="number" data-amt="${l.id}" min="1" max="${mx}" placeholder="₺" style="width:80px;padding:7px;border:1px solid var(--cizgi);border-radius:10px;font:inherit">
        <button data-part="${l.id}" ${mx > 0 ? "" : "disabled"}>Miktarını öde</button></div></div>`; }).join("") || '<p class="muted">Açık kredin yok.</p>'}`;
}
function bindLoans(root, re) {
  root.querySelectorAll("[data-loan]").forEach(b => b.onclick = () => { const x = +b.dataset.loan; takeLoan(x, loanDays(x)); renderHUD(); re(); });
  root.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { const l = S.loans.find(x => x.id === +b.dataset.close); if (!l || S.money < l.rem) return;
    S.money -= l.rem; l.rem = 0; syncDebt(); S.log.push("Gün " + S.day + ": kredi #" + l.id + " kapatıldı"); AUDIO.sfx("register"); save(); renderHUD(); re(); });
  root.querySelectorAll("[data-part]").forEach(b => b.onclick = () => { const id = +b.dataset.part, l = S.loans.find(x => x.id === id); if (!l) return;
    const x = Math.floor(+root.querySelector(`[data-amt="${id}"]`).value || 0), mx = Math.min(l.rem, Math.max(0, S.money));
    if (x <= 0 || x > mx) { toast(mx > 0 ? `Kredi #${id} için 1 ile ₺${tl(mx)} arasında bir tutar gir` : "Kasada para yok"); return; }
    S.money -= x; l.rem -= x; if (l.rem === 0) S.log.push("Gün " + S.day + ": kredi #" + id + " kapatıldı"); syncDebt(); AUDIO.sfx("register"); save(); renderHUD(); re(); });
}
function openLoans(after) {
  const draw = () => { $("#loanCard").innerHTML = `<h2>🏦 Krediler<span class="x" id="loanX">✕</span></h2>` + cashBox() + loansHTML(); bindLoans($("#loanCard"), draw); $("#loanX").onclick = () => { closeOverlay("#ovLoan"); after && after(); }; };
  draw(); openOverlay("#ovLoan");
}

// --- Dükkan yönetim ekranı (§2): sekmeler + Ana hedef ---
function eqRow(id, e) {
  const miss = (e.requires || []).filter(r => !reqOk(r)), lv = eqLevel(id), mx = eqMax(id), done = lv >= mx, price = eqNextPrice(id);
  const reqTxt = r => D.equipment[r].name + (eqMax(r) > 1 ? ` (${eqLevel(r)}/${eqMax(r)} geliştirme)` : "");
  const st = done ? (mx > 1 ? "✓ 3/3 tamam" : "✓ alındı") : miss.length ? `🔒 Önce: ${miss.map(reqTxt).join(", ")}` : `<button data-eq="${id}" ${S.money < price ? "disabled" : ""}>${mx > 1 ? (lv ? `Geliştir (${lv + 1}/3)` : "Satın al (1/3)") : "Satın al"}</button>`;   // v0.36
  const lvTxt = mx > 1 ? ` <span class="eqlv">${"●".repeat(lv)}${"○".repeat(mx - lv)}</span>` : "";
  return `<tr class="${miss.length && !done ? "lock" : ""}"><td>${th("eq:" + id)}<b>${e.auto ? "⚙ " : e.widen ? "🎯 " : ""}${e.name}</b>${lvTxt}<br><span class="muted">${e.effect}${mx > 1 && lv ? ` · şu an ×${String(D.zones.widenLevels[lv - 1]).replace(".", ",")}` : ""}</span></td><td>${done ? "" : "₺" + tl(price)}</td><td>${st}</td></tr>`;
}
function hubContent() {
  const lv = shop(), vis = e => (e.stars || 1) <= lv.stars;
  if (hubTab === "upg") {
    const T = tr(), cost = k => lv.tierCost[k], E = Object.entries(D.equipment).filter(([, e]) => vis(e));
    const sec = (title, desc, rows) => rows ? `<div class="box"><h4>${title}</h4>${desc ? `<p class="muted">${desc}</p>` : ""}<table>${rows}</table></div>` : "";
    const traffic = `<tr><td>${th("tr:cust" + Math.min(3, T.cust + 1))}<b>Günlük müşteri</b> (kademe ${T.cust}/3)<br><span class="muted">${T.cust < 3 ? D.traffic.cust[T.cust] + ": +" + lv.custStep + " müşteri/gün" : "en üst kademe"}</span></td><td>${T.cust < 3 ? "₺" + tl(cost(T.cust)) : ""}</td><td>${T.cust < 3 ? `<button data-tr="cust" ${S.money < cost(T.cust) ? "disabled" : ""}>Yükselt</button>` : "✓"}</td></tr>
      <tr><td>${th("tr:freq" + Math.min(3, T.freq + 1))}<b>Geliş sıklığı</b> (kademe ${T.freq}/3)<br><span class="muted">${T.freq < 3 ? D.traffic.freq[T.freq] + ": müşteriler daha sık gelir" : "en üst kademe"}</span></td><td>${T.freq < 3 ? "₺" + tl(cost(T.freq)) : ""}</td><td>${T.freq < 3 ? `<button data-tr="freq" ${S.money < cost(T.freq) ? "disabled" : ""}>Yükselt</button>` : "✓"}</td></tr>`;
    const A = D.staff.assistant;
    const staff = A.stars <= lv.stars ? `<tr><td>${th("staff")}<b>${A.name}</b><br><span class="muted">${A.effect} (${A.score} puan) · günlük maaş ₺${tl(A.wage)}</span></td><td></td><td>${S.staff.assistant ? `<button id="fire">Çıkar</button>` : `<button id="hire">İşe al</button>`}</td></tr>` : "";
    return sec("👥 Müşteri gelişi", `Sıra en fazla ${lv.maxQueue} kişi · günde ${dayCap()} müşteri · ~${arrivalEvery().toFixed(1).replace(".", ",")} sn'de bir. Kademeler bu dükkana özel.`, traffic)
      + sec("🎯 Kolaylaştırıcılar ve göstergeler", "Renkli hedef bölgelerini genişletir ya da adımı hızlandırır.", E.filter(([id, e]) => e.widen || id === "steamWand").map(([id, e]) => eqRow(id, e)).join(""))
      + sec("⚙ Otomasyon", `Adımı atlar, sabit ${D.economy.autoScore} puan verir; önce o adımın kolaylaştırıcısı gerekir.`, E.filter(([, e]) => e.auto).map(([id, e]) => eqRow(id, e)).join(""))
      + sec("🏪 Kapasite ve personel", "", E.filter(([id]) => id === "dualGroup" || id === "fridge").map(([id, e]) => eqRow(id, e)).join("") + staff);
  }
  if (hubTab === "tools") {
    const rows = Object.entries(D.tools).filter(([, t]) => vis(t)).map(([id, t]) => { const uses = Object.keys(D.drinks).filter(k => (D.drinks[k].needs || []).includes(id)).map(k => D.drinks[k].name);
      return `<tr><td>${th("tool:" + id)}<b>${t.name}</b><br><span class="muted">${t.effect} · gerektiren: ${uses.join(", ")} · mini oyun: ${D.minigames[t.step].name}</span></td><td>₺${tl(t.price)}</td><td>${S.tools[id] ? "✓ dükkanda" : `<button data-tool="${id}" ${S.money < t.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`; }).join("");
    return `<div class="box"><p class="muted">Bazı tarifler bu aletler olmadan yapılamaz. Dükkan büyüyünce yenisine taşınır.</p><table>${rows}</table></div>`;
  }
  if (hubTab === "loans") return `<div class="box">${loansHTML()}</div>`;
  return `<div class="box"><p class="muted">Dekor yalnızca bu dükkanda görünür ve etki eder.</p><table>` + Object.entries(D.decor).filter(([, dc]) => (dc.stars || 1) === lv.stars).sort((a, b) => a[1].price - b[1].price).map(([id, dc]) => `<tr><td>${th("decor:" + id)}<b>${dc.name}</b><br><span class="muted">${dc.effect}</span></td><td>₺${tl(dc.price)}</td><td>${S.decor[id] ? "✓ dükkanda" : `<button data-dec="${id}" ${S.money < dc.price ? "disabled" : ""}>Satın al</button>`}</td></tr>`).join("") + `</table></div>`;
}
function renderHub() {
  const lv = shop(), flow = dayFlow === "hub";
  let html = `<div class="hubhead"><h2 style="margin:0">Dükkan · ${"★".repeat(lv.stars)} ${lv.name}</h2><button id="goalBtn" class="goal">🎯 Ana hedef</button>${flow ? "" : '<span class="x" id="hubX">✕</span>'}</div>`;
  html += cashBox();   // v0.28: para Tedarik'teki gibi yeşil kağıt paralı kutuda
  if (lv.stars >= 5) html += `<div class="box"><h4>🏆 Barista yarışması</h4><p class="muted">Ertesi günün ilk 3 müşterisi jüri: espresso, cappuccino, latte. Ortalama 95+ altın (₺${tl(D.competition.medals[0].money)}), 85+ gümüş, 70+ bronz. Haftada bir kez.</p>${S.compDay === S.day ? "<p><b>Yarın yarışma günü ✓</b></p>" : S.compWeek === weekNo(S.day) ? '<p class="muted">Bu hafta katıldın.</p>' : '<button id="compBtn" class="pri">Yarışmaya katıl</button>'}</div>`;   // §13
  html += `<div class="tabbar">${Object.entries(TAB).map(([k, [n, c, sn]]) => `<button data-tab="${k}" class="${hubTab === k ? "on" : ""}" style="--tc:${c}">${ICONS[k]}<span class="dOnly">${n}</span><span class="pOnly">${sn}</span></button>`).join("")}</div>`;
  html += `<div class="tabbody" style="--tc:${TAB[hubTab][1]}">${hubContent()}</div>`;
  html += `<div class="row">${flow ? '<button id="hubBack">← Geri</button>' : ""}<button class="pri" id="hubNext">${flow ? "Devam →" : "Kapat"}</button></div>`;
  $("#hubCard").innerHTML = html;
  const R = $("#hubCard"), re = () => renderHub();
  const cpb = $("#compBtn"); if (cpb) cpb.onclick = () => { S.compDay = S.day; S.compWeek = weekNo(S.day); AUDIO.sfx("click"); toast("🏆 Yarışmaya kaydoldun: bugünün ilk 3 müşterisi jüri"); save(); re(); };
  R.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { hubTab = b.dataset.tab; AUDIO.sfx("click"); re(); });
  R.querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const id = b.dataset.eq, price = eqNextPrice(id), lv = eqLevel(id); if (S.money < price || lv >= eqMax(id) || (D.equipment[id].requires || []).some(r => !reqOk(r))) return;
    buy(price, () => { S.equipment[id] = true; (S.eqLv = S.eqLv || {})[id] = lv + 1; if (id === "fridge") { S.milkDay = S.day; S.fridgePaid = true; } }); re();   // v0.36: kademeli geliştirme
    if (lv === 0) showPurchase("eq:" + id, D.equipment[id].name); else toast(`${D.equipment[id].name} geliştirildi (${lv + 1}/3)`); });
  R.querySelectorAll("[data-tool]").forEach(b => b.onclick = () => { const id = b.dataset.tool; if (S.money < D.tools[id].price) return; const before = new Set(S.unlocked.filter(hasTools));
    buy(D.tools[id].price, () => { S.tools[id] = true; S.log.push("Gün " + S.day + ": " + D.tools[id].name + " alındı"); }); re(); showPurchase("tool:" + id, D.tools[id].name);
    const now = S.unlocked.filter(x => hasTools(x) && !before.has(x)), need = supplyNeedsFor(now);   // v0.36: alet tarifi menüye aldıysa ve Tedarik'ten bir şey gerekiyorsa oraya yönlendir
    if (now.length && need.length) modal(`<h3>${now.map(x => D.drinks[x].name).join(", ")} artık menüde</h3><p>Müşterilerin bu kahveyi isteyebilmesi için Tedarik'ten şunları almalısın:</p><ul>${need.map(n => `<li><b>${n.txt}</b></li>`).join("")}</ul><p class="muted">Almazsan müşteriler bu kahveyi istemez ya da bardak yoksa gider.</p>`,
      [{ label: "Sonra" }, { label: "Tedarik'e git", pri: true, fn: () => goSupply(need.map(n => n.key), true) }]); });
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
  let html = `<h2>🎯 Ana hedef<span class="x" id="goalX">✕</span></h2>` + cashBox();
  if (!next) html += `<p>Prototipteki en büyük dükkandasın: ${"★".repeat(shop().stars)} ${shop().name}.</p>`;
  else {
    const ok = (c, t) => `<div class="req ${c ? "ok" : ""}">${t} ${c ? "✓" : ""}</div>`;
    html += `<p>Sıradaki dükkan: <b>${"★".repeat(next.stars)} ${next.name}</b></p>` + ok(S.money >= next.money, `Kasa ₺${tl(S.money)} / ₺${tl(next.money)}`) + ok(S.rep >= next.rep, `İtibar ${S.rep} / ${next.rep}`) + ok(!(S.debt > 0), S.debt > 0 ? `Borç yok (şu an ₺${tl(S.debt)})` : "Borç yok");
    const opens = Object.values(D.drinks).filter(d => (d.shop || 1) === next.stars).map(d => d.name).concat(Object.values(D.tools).filter(t => t.stars === next.stars).map(t => t.name), Object.values(D.equipment).filter(e => e.stars === next.stars).map(e => e.name));
    html += `<p class="muted">Açar: sıra ${next.maxQueue} kişi, günde ${next.customersPerDay} müşteri · haftalık kira ₺${tl(next.rent)}${opens.length ? " · " + opens.join(", ") : ""}. Aldığın aletler ve makineler yeni dükkana taşınır.</p>`;
    const can = S.money >= next.money && S.rep >= next.rep && !(S.debt > 0);
    html += `<div class="row"><button class="pri" id="lvUp" ${can ? "" : "disabled"}>Seviye atla</button></div>`;
  }
  $("#goalCard").innerHTML = html; openOverlay("#ovGoal");
  $("#goalX").onclick = () => closeOverlay("#ovGoal");
  const up = $("#lvUp"); if (up) up.onclick = () => { S.shopLevel++; S.log.push("Gün " + S.day + ": " + shop().name); AUDIO.sfx("unlock"); checkUnlocks(); save(); renderHUD(); closeOverlay("#ovGoal"); renderHub();
    modal(`<h3>${"★".repeat(shop().stars)} ${shop().name}</h3><p>Sıra en fazla ${shop().maxQueue} kişi, günde ${shop().customersPerDay} müşteri, haftalık kira ₺${tl(shop().rent)}. Yeni geliştirmeler, aletler ve kredi limiti (₺${tl(shop().loanLimit)}) açıldı.</p>`); };
}

// --- Fiyatlar (§8) ---
function renderPrices() {                                                         // §8 lira ile elle ayar; müşteri tepkisi söylenmez
  const flow = dayFlow === "price", list = S.unlocked.filter(hasTools), maxP = id => Math.max(2, Math.round(defaultPrice(id) * D.pricing.max));
  let html = `<h2>Fiyatlar${flow ? "" : '<span class="x" id="prX">✕</span>'}</h2>${cashBox()}<p class="muted">"Çok pahalı" deyip gidiyorlarsa düşür, "ucuz" diyorlarsa artır. Sıradaki müşteriden itibaren geçerli.</p><table class="ptable">
    <tr><th>Tarif</th><th>Maliyet</th><th>Senin fiyatın</th></tr>`;
  html += list.map(id => { const p = priceOf(id), zs = D.drinks[id].sizes || ["single"], base = zs[0];
    const others = zs.slice(1).map(z => `${SZ(z).label} ₺${tl(sizePrice(id, z))}`).join(" · ");   // §8 diğer boylar tek/küçükten hesaplanır
    return `<tr><td><b>${D.drinks[id].name}</b><br><span class="muted">${zs.length > 1 ? `Fiyat ${SZ(base).label} için · ${others} (otomatik)` : `${SZ(base).label} boy`}</span></td><td class="num"><span class="plbl">Maliyet </span>₺${tl(sizeCost(id, base).toFixed(1))}</td>
      <td><div class="pbtns"><button data-pd="${id}" ${p <= 1 ? "disabled" : ""}>−₺${tl(D.pricing.stepTL || 1)}</button><label class="pinw"><span>₺</span><input type="number" class="pin" data-pi="${id}" min="1" max="${maxP(id)}" value="${p}"></label><button data-pu="${id}" ${p >= maxP(id) ? "disabled" : ""}>+₺${tl(D.pricing.stepTL || 1)}</button></div></td></tr>`; }).join("");
  html += `</table>${S.unlocked.filter(id => !hasTools(id)).length ? `<p class="muted">Aleti eksik olduğu için menüde olmayan: ${S.unlocked.filter(id => !hasTools(id)).map(id => D.drinks[id].name).join(", ")} (Dükkan › Aletler & Makineler).</p>` : ""}
    <div class="row">${flow ? '<button id="prBack">← Geri</button>' : ""}<button class="pri" id="prNext">${flow ? "Günü başlat ☕" : "Kapat"}</button></div>`;
  $("#priceCard").innerHTML = html;
  const R = $("#priceCard"), set = (id, v) => { S.priceTL = S.priceTL || {}; S.priceTL[id] = Math.round(clamp(v, 1, maxP(id))); save(); renderPrices(); };
  R.querySelectorAll("[data-pd]").forEach(b => b.onclick = () => set(b.dataset.pd, priceOf(b.dataset.pd) - (D.pricing.stepTL || 1)));
  R.querySelectorAll("[data-pu]").forEach(b => b.onclick = () => set(b.dataset.pu, priceOf(b.dataset.pu) + (D.pricing.stepTL || 1)));
  R.querySelectorAll("[data-pi]").forEach(i => i.onchange = () => { const v = Math.floor(+i.value); if (v > 0) set(i.dataset.pi, v); else renderPrices(); });
  const px = $("#prX"); if (px) px.onclick = () => closeOverlay("#ovPrice");
  const pbk = $("#prBack"); if (pbk) pbk.onclick = () => { dayFlow = "hub"; $("#ovPrice").classList.remove("on"); renderHub(); openOverlay("#ovHub"); };
  $("#prNext").onclick = () => { if (!flow) return closeOverlay("#ovPrice"); dayFlow = null; mandatoryRestock = false; $("#ovPrice").classList.remove("on"); startDay(); };
}

// --- §8 Kahve borsası: haftalık değişim + gazete ---
function updateMarket() {
  S.market = S.market || {}; const M = D.market, ch = [];
  Object.keys(D.drinks).forEach(id => { const old = marketIdx(id), nw = clamp(old * (1 + (Math.random() * 2 - 1) * M.weeklyMax), M.min, M.max); S.market[id] = Math.round(nw * 100) / 100; ch.push([id, S.market[id] / old - 1]); });
  return ch.filter(([id]) => S.unlocked.includes(id) && hasTools(id)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, M.news);   // gazetede yalnız menüdeki (açık + aleti olan) kahveler
}
function showNews(week, ch, next, back) {
  modal(`<div class="news"><div class="nhead">KAHVE GAZETESİ<span>${week}. Hafta · Borsa</span></div>` + ch.map(([id, c]) => `<p><b>${D.drinks[id].name} fiyatları %${Math.abs(Math.round(c * 100))} ${c >= 0 ? "arttı ▲" : "düştü ▼"}</b><br><span class="muted">Müşteriler artık ${D.drinks[id].name.toLowerCase()} için ${c >= 0 ? "biraz daha yüksek" : "biraz daha düşük"} fiyatı makul buluyor (endeks ×${marketIdx(id).toFixed(2).replace(".", ",")}).</span></p>`).join("") + `</div>`,
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
  const lockedN = Object.keys(D.drinks).filter(id => !S.unlocked.includes(id)).length, nx = nextRecipe();   // v0.30: kilitli tarifler tek özet satırı
  html += `<div class="box"><h4>Tarif kartları</h4>` + Object.entries(D.drinks).filter(([id]) => S.unlocked.includes(id)).map(([id, d]) => {
    const open = S.unlocked.includes(id);
    const left = Math.max(0, d.unlockCups - recipeProg()), shOk = shop().stars >= (d.shop || 1);
    return `<div class="recipe ${open ? "" : "lock"}">${drinkIcon(id, !open)}<div><b>${open ? d.name : "???"}</b> <span class="muted">${open ? `· ${S.served[id] || 0} servis, ${S.perfect[id] || 0} mükemmel${d.art && shop().stars >= 3 ? " · latte art ✓" : ""}${d.season ? " · mevsimlik: " + d.season.map(i => D.seasons[i]).join(", ") + (inSeason(id) ? " (şu an istenir)" : " (mevsimi değil)") : ""}${d.noBean ? " · kahvesiz" : ""}${hasTools(id) ? "" : " · <b style='color:var(--kotu)'>Gerekli: " + (d.needs || []).filter(t => !S.tools[t]).map(t => D.tools[t].name).join(", ") + "</b>"}` : `· ${d.unlockCups} kahve satınca ${left ? `(${left} kahve daha)` : "✓"} · ${d.shop || 1}★ dükkan ${shOk ? "✓" : "🔒"}`}</span><br>${open ? d.card : '<span class="muted">Bu tarifi henüz öğrenmedin.</span>'}</div></div>`; }).join("") +
    `<div class="recipe"><div><b>Dükkana göre tarifler</b><br>${D.shopLevels.map(l => { const ids = Object.keys(D.drinks).filter(id => (D.drinks[id].shop || 1) === l.stars), n = ids.filter(id => S.unlocked.includes(id)).length;
      return `<span class="muted">${l.stars}★ ${l.name}: <b>${n}/${ids.length}</b> açık${n === ids.length ? " ✓" : l.stars > shop().stars ? " 🔒" : ""}</span>`; }).join("<br>")}</div></div>` +   // §3 v0.35
    (lockedN ? `<div class="recipe lock">${drinkIcon("lock", true)}<div><b>???</b> <span style="font-weight:700;color:var(--soluk)">${lockedN} kilitli tarif</span><br><span class="muted">${nx ? ((D.drinks[nx].shop || 1) > shop().stars ? `Sıradaki tarif ${D.drinks[nx].shop}★ dükkanda açılır; o zamana kadar sayaç durur` : Math.max(0, D.drinks[nx].unlockCups - recipeProg()) ? `Sıradaki: ${D.drinks[nx].unlockCups - recipeProg()} kahve daha sat` : "Sıradaki tarif hazır") : ""}</span></div></div>` : "") + `</div>`;
  html += `<div class="box"><h4>🏅 Başarımlar (${(S.ach || []).length}/${D.achievements.length})</h4>${D.achievements.map(a => `<p style="margin:3px 0">${(S.ach || []).includes(a.id) ? "🏅 <b>" + a.name + "</b>" : "🔒 " + a.name} <span class="muted">· ${a.desc}</span></p>`).join("")}${(S.medals || []).length ? `<p><b>Madalyalar:</b> ${S.medals.map(m => m.icon + " Gün " + m.day + " (" + m.avg + ")").join(" · ")}</p>` : ""}</div>`;
  html += `<div class="box"><h4>♥ Sadık müşteriler</h4><p class="muted">Bir tipe art arda ${D.loyalty.need} mükemmel servis → sabır ×${String(D.loyalty.patience).replace(".", ",")}, bahşiş ×${String(D.loyalty.tip).replace(".", ",")}.</p>${Object.keys(D.customers).filter(k => !D.customers[k].special).map(k => { const n = (S.loyal || {})[k] || 0; return `<p style="margin:3px 0">${n >= D.loyalty.need ? "♥" : "♡"} ${D.customers[k].name} <span class="muted">· ${Math.min(n, D.loyalty.need)}/${D.loyalty.need}</span></p>`; }).join("")}</div>`;
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
    <div class="box"><label class="setrow" style="cursor:pointer"><input type="checkbox" id="fullZones" ${LSG("cb_fullzones") === "1" ? "checked" : ""}> 🎯 Renkli bölgeleri hep tam göster</label><p class="muted">Kapalıyken rütbe yükseldikçe renkli bölgeler soluklaşır (usta görünümü).</p></div>
    ${MOTION.has() ? `<div class="box"><label class="setrow" style="cursor:pointer"><input type="checkbox" id="motionOn" ${MOTION.on() ? "checked" : ""}> 📱 Telefonu sallayarak çalkala / dozla</label><p class="muted">Sağa-sola kaydırma adımlarında telefonu sallamak da sayılır. Kaydırma her zaman çalışır.</p></div>` : ""}
    <div class="box"><label class="setrow" style="cursor:pointer"><input type="checkbox" id="hapticOn" ${LSG("cb_haptic") !== "0" ? "checked" : ""}> 📳 Titreşim (hedef çubuğunda)</label>${navigator.vibrate ? "" : '<p class="muted">Bu cihaz ya da tarayıcı titreşimi desteklemiyor.</p>'}</div>
    <div class="box"><h4>Grafik</h4>
      <label class="setrow" style="cursor:pointer"><input type="checkbox" id="gfxGpu" ${GFX.gpu ? "checked" : ""} ${GPU.ok ? "" : "disabled"}> Ekran kartıyla çiz (donanım hızlandırma)</label>
      <p class="muted">${GPU.ok ? "Ekran kartı bulundu ✓" : "Bu cihazda ekran kartı hızlandırması yok; oyun işlemciyle çizilir."}</p>
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
  const mo = $("#motionOn"); if (mo) mo.onchange = e => { LSS("cb_motion", e.target.checked ? "1" : "0"); if (e.target.checked) MOTION.ask(); };   // v0.41 §14
  $("#fullZones").onchange = e => LSS("cb_fullzones", e.target.checked ? "1" : "0");   // v0.40 §14
  $("#hapticOn").onchange = e => { LSS("cb_haptic", e.target.checked ? "1" : "0"); if (e.target.checked && navigator.vibrate) try { navigator.vibrate(25); } catch (x) {} };   // §13
  $("#gfxGpu").onchange = e => { GFX.gpu = e.target.checked; saveGfx(); $("#gfxRestart").style.display = ""; };
  $("#gfxReload").onclick = () => { save(); location.reload(); };
  $("#settingsCard").querySelectorAll("[data-q]").forEach(b => b.onclick = () => { GFX.quality = b.dataset.q; saveGfx(); SCENE.setQuality(GFX.quality); CLOSEUP.setQuality(GFX.quality);
    if (S) renderScene(0); else idleLoop(); renderSettings(); });
  $("#setImport").onclick = () => { closeOverlay("#ovSettings"); $("#fileImport").click(); };
  const sc = $("#setCheat"); if (sc) sc.onchange = e => { setCheat(e.target.checked); };
}

// ---------- Hile modu (geliştirici testi): menüde "cheat" yaz / sürüm yazısına 5 kez dokun ----------
const BILL = `<svg viewBox="0 0 48 28" width="54" height="32" aria-hidden="true"><rect x="1.5" y="1.5" width="45" height="25" rx="4" fill="#4f9a44" stroke="#2f6b2a" stroke-width="2"/><rect x="6" y="6" width="36" height="16" rx="2.5" fill="none" stroke="#bfe6b2" stroke-width="1.4"/><circle cx="24" cy="14" r="5.5" fill="#bfe6b2"/><text x="24" y="17.6" text-anchor="middle" font-size="9" font-weight="800" fill="#2f6b2a">₺</text><circle cx="10.5" cy="14" r="1.6" fill="#bfe6b2"/><circle cx="37.5" cy="14" r="1.6" fill="#bfe6b2"/></svg>`;   // §7 yeşil kağıt para ikonu
const cashBox = () => `<div class="cash">${BILL}<span>₺${tl(S.money)}</span><small>Kasa</small></div>`;
const LSG = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, LSS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
/* v0.41 §14 telefonu sallayarak çalkala: devicemotion yön değişimi = bir kaydırma vuruşu */
const MOTION = { fn: null, live: false, ok: false, dir: 0, last: 0, gx: 0, gy: 0,
  has: () => typeof DeviceMotionEvent !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
  needAsk: () => typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function",
  on: () => LSG("cb_motion") !== "0",
  start() { if (this.live || !this.has()) return; this.live = true; window.addEventListener("devicemotion", e => this.ev(e)); },
  ask() { if (!this.has()) return Promise.resolve(false); if (!this.needAsk()) { this.ok = true; this.start(); return Promise.resolve(true); }
    return DeviceMotionEvent.requestPermission().then(r => { const g = r === "granted"; if (g) { this.ok = true; LSS("cb_motionok", "1"); this.start(); } return g; }).catch(() => false); },
  ready() { return this.has() && (this.ok || !this.needAsk()); },
  ev(e) { if (!this.fn || !this.on()) return; let x, y; const a = e.acceleration;
    if (a && a.x != null) { x = a.x; y = a.y || 0; } else { const g = e.accelerationIncludingGravity; if (!g || g.x == null) return; this.gx = this.gx * .9 + g.x * .1; this.gy = this.gy * .9 + (g.y || 0) * .1; x = g.x - this.gx; y = (g.y || 0) - this.gy; }
    const v = Math.abs(x) >= Math.abs(y) ? x : y, sg = Math.abs(v) > 6 ? Math.sign(v) : 0, now = performance.now();
    if (sg && sg !== this.dir && now - this.last > 110) { this.dir = sg; this.last = now; this.fn(sg); } },
  bind(el, o, f) { this.dir = 0; this.fn = sg => { if (!el.isConnected || o.hidden || o.phase === "done") { this.fn = null; return; } f(sg); };
    if (!this.has() || !this.on()) return "";
    if (this.ready()) return " · ya da telefonu salla 📱";
    setTimeout(() => { const b = el.querySelector("#motB"); if (b) b.onclick = () => this.ask().then(g => { b.textContent = g ? "📱 Hazır: telefonu salla" : "📱 Sensör izni verilmedi"; b.disabled = true; }); });
    return '<button class="sec" id="motB" style="margin:4px auto 0;display:block">📱 Telefonu sallayarak yap</button>'; } };
if (MOTION.has() && !MOTION.needAsk()) MOTION.start();
document.addEventListener("pointerdown", () => { if (MOTION.needAsk() && LSG("cb_motionok") === "1" && MOTION.on() && !MOTION.ok) MOTION.ask(); }, { once: true, capture: true });
const cheatUnlocked = () => LSG("cb_cheatUnlocked") === "1", cheatOn = () => cheatUnlocked() && LSG("cb_cheat") === "1";
function setCheat(on) { LSS("cb_cheat", on ? "1" : "0"); renderCheats(); refreshMenu(); toast(on ? "🧪 Hile modu açık" : "Hile modu kapalı"); }
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
  ["📦 Stokları doldur", () => { openBeans().forEach(id => { S.beans[id] = { kg: beanKg(id) + 5, boughtDay: S.day }; }); S.milk = (S.milk || 0) + 10; S.milkAlt = S.milkAlt || {}; openMilks().forEach(k => { if (k !== "cow") S.milkAlt[k] = (S.milkAlt[k] || 0) + 10; }); S.milkDay = S.day; Object.keys(D.cups).forEach(k => S.cups[k] = (S.cups[k] || 0) + 50); Object.keys(D.extras).forEach(k => S.extras[k] = (S.extras[k] || 0) + 100); S.syr = S.syr || {}; Object.keys(D.specials).forEach(k => S.syr[k] = (S.syr[k] || 0) + D.specials[k].pack * 2); }],
  ["☕ Sıradaki tarifi aç", () => { const id = nextRecipe(); if (!id) return toast("Tüm tarifler zaten açık"); S.rp = Math.max(recipeProg(), D.drinks[id].unlockCups); S.unlocked.push(id); (S.unlockDay = S.unlockDay || {})[id] = S.day; S.perfect[id] = S.perfect[id] || 0; AUDIO.sfx("unlock"); toast("Yeni tarif açıldı: " + D.drinks[id].name); }],
  ["📖 Tüm tarifler + aletler", () => { S.unlocked = Object.keys(D.drinks); Object.keys(D.tools).forEach(k => S.tools[k] = true); }],
  ["🧾 Tarif seçip müşteri getir", () => { if (!day) return toast("Önce günü başlat");
    modal(`<h3>Hangi tarifi istesin?</h3><div class="row" style="flex-wrap:wrap;gap:6px;max-height:50vh;overflow:auto">${S.unlocked.filter(hasTools).map(id => `<button data-tq="${id}" style="font-size:13px">${D.drinks[id].name}</button>`).join("")}</div>`, [{ label: "Kapat" }]);
    document.querySelectorAll("[data-tq]").forEach(b => b.onclick = () => { day.tutorialActive = false; spawnCustomer(); const c = day.customers[day.customers.length - 1]; if (c) { const id = b.dataset.tq, d = D.drinks[id]; c.drink = id; c.size = pick(d.sizes || ["single"]); c.milk = isMilky(id) ? "cow" : null; c.sugar = d.sugar ? "orta" : null; c.bean = "brazil"; const sl = SCENE.queueSlot(Math.max(0, queueOf().length - 1)); if (sl) c.pos = Object.assign({}, sl); } layout(); $("#ovModal").classList.remove("on"); toast("Müşteri: " + D.drinks[b.dataset.tq].name); }); }],
  ["⏸ Saati durdur / başlat", () => { window.CB_FREEZE = !window.CB_FREEZE; toast(window.CB_FREEZE ? "Saat durdu (hile)" : "Saat işliyor"); }],
  ["🏪 Dükkan seviyesi atla", () => { if (S.shopLevel < D.shopLevels.length - 1) S.shopLevel++; else toast("En üst seviye"); }]
];
// ---------- v0.42 Akış testi (hile modunda ana menüde): her akış ve mini oyun ayrı bir deneme kaydında (yuva 0) açılır ----------
function tsState(o = {}) {                                                       // deneyimli oyuncu: ilk gün bitmiş, stok dolu, tüm tarif ve aletler
  const x = newState("normal"); x.day = o.day || 4; x.money = 900000; x.rep = 60; x.xp = 400; x.shopLevel = o.lv ?? 2;
  x.taught = ["intro", "first", "closing", "mg:grind", "mg:dose", "mg:tamp", "mg:extract", "mg:pregrind", "L:machineOn", "L:calibration", "L:clean", "L:select"].filter(k => !(o.untaught || []).includes(k));
  if (o.noMg) x.taught = x.taught.filter(k => !/^mg:/.test(k));
  x.unlocked = Object.keys(D.drinks); x.tools = Object.fromEntries(Object.keys(D.tools).map(k => [k, true])); x.cleanDay = x.day - 1; x.rentPaidWeek = Math.ceil(x.day / 7);
  x.beans = Object.fromEntries(Object.keys(D.beans).map(k => [k, { kg: 20, boughtDay: x.day }])); x.milk = 50; x.milkAlt = Object.fromEntries(Object.keys(D.milks).filter(k => k !== "cow").map(k => [k, 50])); x.milkDay = x.day;
  Object.keys(D.cups).forEach(k => x.cups[k] = 200); Object.keys(D.extras).forEach(k => x.extras[k] = 200); x.syr = Object.fromEntries(Object.keys(D.specials).map(k => [k, 200]));
  x.beansSeen = Object.keys(D.beans); x.milksSeen = Object.keys(D.milks); x.taught.push("milk"); x.rp = 999; x.unlockDay = {};
  return Object.assign(x, o.set || {});
}
function tsBegin(x, after) { if (!window.CB_TEST_WEATHER) window.CB_TEST_WEATHER = "none"; curSlot = 0; window.CB_LESSON = false; lessonQ = []; begin(x); if (after) setTimeout(() => { if (S) after(); }, 500); }
function tsDay(after, noOpen) { window.CB_TEST_NOOPEN = !!noOpen; startDay(); setTimeout(() => { if (day && after) after(); }, 700); }
function tsCust(type, drink, size, extra) {                                      // sıraya belirli bir müşteri koy
  day.tutorialActive = false; spawnCustomer(); const c = day.customers[day.customers.length - 1]; if (!c) return null;
  const d = D.drinks[drink] || D.drinks.espresso; drink = D.drinks[drink] ? drink : "espresso";
  Object.assign(c, { type, name: D.customers[type].name, drink, size: size || (d.sizes || ["single"])[0], milk: isMilky(drink) ? "cow" : null, sugar: d.sugar ? "orta" : null, bean: "brazil", mods: { extra: false, takeaway: false } }, extra || {});
  if (!c.patienceMax || D.customers[type].special) { c.patience = c.patienceMax = 120; } layout(); return c;
}
function tsStep(stepKey, variant) {                                               // mini oyun: o adımı içeren ilk tarifte doğrudan o adımdan başla
  const lv = stepKey === "pour" ? 0 : 2, x = tsState({ lv, noMg: true });
  if (variant === "blind") { x.taught.push("mg:tkfoam"); x.served = { turkish: 5 }; }
  if (variant === "dual") { x.equipment.dualGroup = true; x.taught.push("mg:extract"); }
  if (variant === "pregrind") { x.taught.push("mg:grind"); x.taught = x.taught.filter(k => k !== "mg:pregrind"); }
  tsBegin(x, () => tsDay(() => {
    const drink = Object.keys(D.drinks).find(id => stepsForLv(id, lv).includes(stepKey) && (variant !== "hot" || D.drinks[id].milk === "hot") && (variant !== "milk2" || D.drinks[id].milk !== "hot") && (variant !== "blind" || id === "turkish"));
    if (!drink) return toast("Bu adımı içeren tarif bulunamadı");
    const c = tsCust("regular", drink); if (!c) return; if (variant === "dual") tsCust("student", "espresso", "double");
    day.customers = [c].concat(day.customers.filter(z => z !== c)); c.pos = Object.assign({}, SCENE.queueSlot(0)); c.target = null; c.moving = false; c.say = orderLine(c);   // kasaya ışınla
    takeOrder(c.id); const o = day.orders.find(z => z.cust === c); if (!o) return toast("Test siparişi açılamadı");
    prepareOrder(o, c.drink, c.size, "brazil", c.milk, c.sugar); o.auto = new Set(); o.steps = o.all.slice();
    const i = Math.max(0, o.steps.indexOf(variant === "pregrind" ? "grind" : stepKey)); o.steps.slice(0, i).forEach(st => o.scores[st] = 100); o.i = i; o.autoRun = false;
    toast("Akış testi: " + D.minigames[stepKey].name + " (" + D.drinks[drink].name + ")"); renderBench(); }, true));
}
const stepsForLv = (id, lv) => { const d = D.drinks[id]; const st = d.steps.slice(); if (d.art && D.shopLevels[lv].stars >= 3) { if (st.includes("pour")) st[st.indexOf("pour")] = "art"; else st.splice(st.indexOf(st.includes("swirl") ? "swirl" : "milk") + 1, 0, "art"); } return st; };
const FLOWS = [
  ["A1", "İlk gün baştan: Yıldız Teyze (açılış → espresso → kapanış)", () => { curSlot = 0; window.CB_LESSON = false; begin(newState("normal")); }],
  ["A2", "İlk günün kapanışı (kira, defter, temizlik, veda)", () => tsBegin(tsState({ day: 1, untaught: ["closing", "L:clean"] }), () => tsDay(() => cheatEndDay()))],
  ["A3", "Sabah açılışı, ilk kez (makine + kalibrasyon dersi)", () => tsBegin(tsState({ day: 2, untaught: ["L:machineOn", "L:calibration"] }), () => tsDay())],
  ["A4", "Sabah açılışı, bilinen (ders yok)", () => tsBegin(tsState({ day: 3 }), () => tsDay())],
  ["A5", "Gün sonu: kira günü → defter → temizlik dersi → gazete → tedarik → dükkan → fiyatlar", () => tsBegin(tsState({ day: 7, untaught: ["L:clean"], set: { rentPaidWeek: 0 } }), () => tsDay(() => cheatEndDay(), true))],
  ["A6", "Sipariş seçimi dersi (ilk normal müşteri)", () => tsBegin(tsState({ untaught: ["L:select"] }), () => tsDay(() => tsCust("regular", "latte", "M"), true))],
  ["A7", "Ekstralar: ekstra shot + paket servis", () => tsBegin(tsState({ day: 5 }), () => tsDay(() => tsCust("business", "latte", "M", { mods: { extra: true, takeaway: true } }), true))],
  ["A8", "Özel müşteri: Eleştirmen", () => tsBegin(tsState(), () => tsDay(() => tsCust("critic", "cappuccino", "M"), true))],
  ["A9", "Özel müşteri: Turist", () => tsBegin(tsState(), () => tsDay(() => tsCust("tourist", "latte", "M"), true))],
  ["A10", "Özel müşteri: Fenomen", () => tsBegin(tsState(), () => tsDay(() => tsCust("influencer", "espresso", "double"), true))],
  ["A11", "Yarışma günü (3 jüri)", () => tsBegin(tsState({ lv: 4, set: { compDay: 4 } }), () => tsDay())],
  ["A12", "Yoğun saat", () => tsBegin(tsState(), () => tsDay(() => { day.rush = { at: day.t + 3, dur: 30, on: false }; }, true))],
  ["A13", "Kirli makine (dün temizlenmedi)", () => tsBegin(tsState({ set: { cleanDay: 0 } }), () => tsDay())],
  ["A14", "Hava: yağmurlu gün", () => { window.CB_TEST_WEATHER = "rain"; tsBegin(tsState(), () => tsDay()); }],
  ["A15", "Hava: sıcak gün", () => { window.CB_TEST_WEATHER = "hot"; tsBegin(tsState(), () => tsDay()); }],
  ["A16", "Sadık müşteri (bir mükemmel servis daha)", () => tsBegin(tsState({ set: { loyal: { regular: 2 } } }), () => tsDay(() => tsCust("regular", "espresso", "double"), true))],
  ["A17", "Çift grup: shot akarken öbür siparişe geç", () => tsStep("extract", "dual")],
  ["A18", "Önden öğütme (Sonraki için de öğüt)", () => tsStep("grind", "pregrind")],
  ["A19", "Dozlama: kaydırarak / telefonu sallayarak", () => tsStep("dose")],
  ["A20", "Süt: iki aşama (hava al + ısıt)", () => tsStep("milk", "milk2")],
  ["A21", "Süt: tek aşama (sıcak süt, ör. café au lait)", () => tsStep("milk", "hot")],
  ["A22", "Latte art: dök + yukarı çizim", () => tsStep("art")],
  ["A23", "Türk kahvesi köpüğü ölçeksiz (3 servisten sonra)", () => tsStep("tkfoam", "blind")]
,
  ...[1, 2, 3, 4, 5].map(n => ["A" + (23 + n), `Dükkan görünümü ${"★".repeat(n)} ${D.shopLevels[n - 1].name}`, () => tsBegin(tsState({ lv: n - 1 }), () => tsDay(null, true))]),
  ["A29", "Tarif görselleri galerisi (82 tarif)", () => showDrinkGallery()]
];
function showDrinkGallery() {                                                     // v0.43 §16 akış testi: tüm tariflerin bitiş görselleri
  modal(`<h3>☕ Tarif görselleri</h3><p class="muted">Dokun: büyük görseli aç.</p><div class="ftgal">${Object.keys(D.drinks).map(id => `<button data-dg="${id}"><img src="${drinkThumb(id)}" alt=""><span>${D.drinks[id].name}</span></button>`).join("")}</div>`, [{ label: "Kapat" }]);
  document.querySelectorAll("[data-dg]").forEach(b => b.onclick = () => { const id = b.dataset.dg;
    modal(`<h3>${D.drinks[id].name}</h3><canvas id="dgCv" style="width:100%;aspect-ratio:480/250;border-radius:12px"></canvas>`, [{ label: "← Galeri", pri: true, fn: () => setTimeout(showDrinkGallery, 0) }]);
    setTimeout(() => { const cv = $("#dgCv"); if (!cv) return; CLOSEUP.init(cv); CLOSEUP.served(id, 92); }, 30); });
}
Object.keys(D.minigames).filter(k => Object.keys(D.drinks).some(id => stepsForLv(id, k === "pour" ? 0 : 2).includes(k))).forEach((k, i) => FLOWS.push(["M" + (i + 1), D.minigames[k].name + " (" + k + ")", () => tsStep(k)]));
function showFlowTests() {
  modal(`<h3>🧪 Akış testi</h3><p class="muted">Her test ayrı bir deneme kaydında açılır; gerçek yuvaların değişmez. Bitince Çıkış → Ana menüye dön. Kodu (A3, M12…) yazarak geri bildirim ver.</p>
    <div class="ftlist">${FLOWS.map(([c, n], i) => (i === 0 ? "<h4>Akışlar</h4>" : c === "M1" ? "<h4>Mini oyunlar (her biri ilk kez dersiyle)</h4>" : "") + `<button data-ft="${i}"><b>${c}</b> ${n}</button>`).join("")}</div>`, [{ label: "Kapat" }]);
  document.querySelectorAll("[data-ft]").forEach(b => b.onclick = () => { $("#ovModal").classList.remove("on"); AUDIO.sfx("open"); try { FLOWS[+b.dataset.ft][2](); } catch (e) { console.error(e); toast("Test açılamadı: " + e.message); } });
}
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
  modal(`<h3>İflas!</h3><p>${late ? `Kredi #${late.id} (₺${tl(late.amount)} → ₺${tl(late.owe)}) vadesi doldu ve ₺${tl(late.rem)} borç ödenmedi.` : `Kasa kirayı karşılamadı (₺${tl(need)} açık) ve banka kredi limiti (₺${tl(shop().loanLimit)}) dolu olduğu için yeni kredi vermedi.`} Banka dükkana el koydu; oyun bitti.</p>
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
  modal(`<h3>Zorluk seç</h3><div class="diffs">${Object.entries(D.difficulty).map(([k, d]) => `<button class="diff ${k}" data-diff="${k}"><b>${d.label}</b><span>${d.desc} ₺${tl(d.startMoney)} ile başla.</span></button>`).join("")}</div>`, [{ label: "Vazgeç" }]);
  $("#modalCard").querySelectorAll("[data-diff]").forEach(b => b.onclick = () => { $("#ovModal").classList.remove("on"); AUDIO.sfx("click"); fn(b.dataset.diff); });
}
function slotSummary(x) {
  if (!x) return `<b>Boş yuva</b><span class="muted">Henüz kayıt yok</span>`;
  if (x.bankrupt) return `<b>💀 İflas etti (Gün ${x.day})</b><span class="muted">Bu kayıt yüklenemez; silebilir ya da üstüne yeni oyun açabilirsin.</span>`;
  const lv = D.shopLevels[x.shopLevel || 0], when = x.savedAt ? new Date(x.savedAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  return `<b>${weekday(x.day)} · ${weekNo(x.day)}. Hafta (Gün ${x.day})</b><span class="muted">${(D.difficulty[x.diff || "normal"] || D.difficulty.normal).label} · ₺${tl(x.money)} · ${"★".repeat(lv.stars)} ${lv.name} · kaydedildi ${when}</span>`;
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
  if (slot) curSlot = slot; S = state;
  if (!S.econ) {                                                                    // v0.24: eski kayıt → gerçek TL ölçeği (×9)
    const K = D.econScale || 9, m = x => Math.round((x || 0) * K);
    S.money = m(S.money); S.debt = m(S.debt); (S.loans || []).forEach(l => { l.amount = m(l.amount); l.owe = m(l.owe); l.rem = m(l.rem); });
    if (S.priceTL) Object.keys(S.priceTL).forEach(k => S.priceTL[k] = m(S.priceTL[k])); S.econ = K; }
  S.equipment = S.equipment || {};
  if (!S.fridgeFix) { S.fridgeFix = true; if (S.shopLevel === 0 && !S.fridgePaid) delete S.equipment.fridge; }   // v0.27: buzdolabı yine satın alınır; v0.24–0.26'da 1★'da bedava verilen geri alınır
  S.extras = S.extras || {}; if (S.syr && S.syr.sugarx) { S.extras.sugar = (S.extras.sugar || 0) + S.syr.sugarx; delete S.syr.sugarx; }   // v0.24 tek şeker stoku
  if (S.milk == null) S.milk = 0; mandatoryRestock = false; S.bean = "brazil"; if (!S.milkAlt) S.milkAlt = {};
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
  endCtx = S.endPending || null;                                                   // §2 gün sonu ekranlarında çıkılmışsa oradan devam
  if (endCtx) { mandatoryRestock = true; if (endCtx.advanced) openRestock(); else backToRent(); }
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
$("#sheet").addEventListener("pointerdown", e => { if (e.target !== $("#sheet") || !day) return; hideSheet(); });
$("#openDay").onclick = () => { if (day) return; if (mandatoryRestock || endCtx) return resumeEndFlow(); startDay(); };
// v0.28 donma düzeltmesi: gün sonu ekranlarından biri (ör. Kahve Gazetesi) dışına dokunarak ya da Esc › Vazgeç ile kapanırsa
// oyun "gün sonu akışında" kalıp hiçbir ekran göstermiyordu ve Günü başlat çalışmıyordu. Akış kaldığı ekrandan geri açılır.
function resumeEndFlow() {
  if (!S || day || !(mandatoryRestock || endCtx)) return;
  if (dayFlow === "hub") { renderHub(); return openOverlay("#ovHub"); }
  if (dayFlow === "price") { renderPrices(); return openOverlay("#ovPrice"); }
  if (dayFlow === "supply" || (endCtx && endCtx.advanced) || (!endCtx && firstSupply)) { dayFlow = "supply"; renderHUD(); renderSupply(); return openOverlay("#ovShop"); }
  if (endCtx) { if (endCtx.L && endCtx.L.news) return showNews(weekNo(endCtx.dayNum), endCtx.L.news, openRestock, backToLedger); return backToLedger(); }
  dayFlow = "supply"; renderHUD(); renderSupply(); openOverlay("#ovShop");
}
setInterval(() => { try { if (S && !day && (mandatoryRestock || endCtx) && $("#menu").style.display === "none" && !document.querySelector(".overlay.on")) resumeEndFlow(); } catch (e) { console.error(e); } }, 700);   // emniyet: gün sonunda ekran kalmadıysa geri aç
$("#icBook").onclick = () => { AUDIO.sfx("open"); renderBook(); openOverlay("#ovBook"); };
$("#icShop").onclick = () => { AUDIO.sfx("open"); renderSupply(); openOverlay("#ovShop"); };
$("#icPrice").onclick = () => { AUDIO.sfx("open"); renderPrices(); openOverlay("#ovPrice"); };
$("#icSettings").onclick = () => { AUDIO.sfx("open"); renderSettings(); openOverlay("#ovSettings"); };
["ovBook", "ovShop", "ovModal", "ovSettings"].forEach(id => $("#" + id).addEventListener("click", e => { if (e.target.id === id) closeOverlay("#" + id); }));
$("#btnNew").onclick = () => { AUDIO.sfx("open"); renderSlots("new"); };
$("#btnFlow").onclick = () => { AUDIO.sfx("open"); showFlowTests(); };   // v0.42 akış testi
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
window.addEventListener("resize", () => { if (S) { sceneInsets(); renderScene(0); if (fitSheet()) { if (drawCup) drawCup(); else CLOSEUP.init($("#closeup")); } } else idleLoop(); });
// §12 Devam: en son kaydedilen (iflas etmemiş) yuva
function latestSlot() { let best = 0, t = -1; for (let i = 1; i <= 3; i++) { const x = loadSlot(i); if (x && !x.bankrupt && (x.savedAt || 0) > t) { t = x.savedAt || 0; best = i; } } return best; }
function refreshMenu() { try { $("#btnContinue").disabled = !anySlot(); const i = latestSlot(), r = $("#btnResume"), n = $("#btnNew");
    if (i) { const x = loadSlot(i); r.style.display = ""; $("#resumeInfo").textContent = `Yuva ${i} · ${weekday(x.day)} · Gün ${x.day} · ₺${tl(x.money)}`; n.classList.remove("pri"); }
    else { r.style.display = "none"; n.classList.add("pri"); } } catch (e) {} $("#menuVer").textContent = "Sürüm " + D.version; const ft = $("#btnFlow"); if (ft) ft.style.display = cheatOn() ? "" : "none"; }
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
