// data.js – Tüm içerik tasarım dokümanından (Kural 2). Kod değişmeden içerik buradan eklenir (§12).
window.DATA = {
  version: "0.11",   // §12: sayfadaki CB_VERSION ile aynı olmalı; değilse oyun kendini yeniden yükler
  // §3 – Kahve öğrenme ağacı (MVP). Açılış: satılan toplam kahve sayısı (unlockCups, kümülatif artan fark) + gerekirse dükkan seviyesi (shop).
  // §8 prototip kalibrasyonu (erişilebilirlik): fiyatlar yükseltildi ki ilk seviye geliştirmeler daha ulaşılabilir olsun.
  drinks: {
    espresso:   { name: "Espresso",     level: 1, req: null,        unlockCups: 0,   price: 10, cost: 2, steps: ["grind","dose","tamp","extract"],
      card: "18 g kahve → 36 g espresso (1:2), 25–30 sn. Ekşi tat = çok hızlı aktı, öğütümü incelt. Acı tat = çok yavaş aktı, öğütümü kabalaştır." },
    americano:  { name: "Americano",    level: 2, req: "espresso",  unlockCups: 4,  price: 11, cost: 2, needs: ["kettle"], steps: ["grind","dose","tamp","extract","water"],
      card: "Espresso + sıcak su (1:3). Su üstüne espresso eklenirse krema korunur." },
    lungo:      { name: "Lungo",        level: 2, req: "espresso",  unlockCups: 8,  price: 10, cost: 2, steps: ["grind","dose","tamp","extract"], ratio: 3,
      card: "Uzun espresso: 18 g → ~54 g (1:3), 35–40 sn. Daha hafif, daha acımsı." },
    ristretto:  { name: "Ristretto",    level: 2, req: "espresso",  unlockCups: 14,  price: 10, cost: 2, steps: ["grind","dose","tamp","extract"], ratio: 1.5,
      card: "Kısa espresso: 18 g → ~27 g (1:1,5), 18–22 sn. Daha yoğun, daha tatlı." },
    macchiato:  { name: "Macchiato",    level: 3, req: "espresso",  unlockCups: 22, price: 13, cost: 3, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk"], milk: "dollop",
      card: "Espresso üzerine bir kaşık süt köpüğü. 'Lekelenmiş' demektir." },
    cortado:    { name: "Cortado",      level: 3, req: "macchiato", unlockCups: 32, price: 15, cost: 3, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk"], milk: "micro",
      card: "Espresso ile eşit miktarda süt (1:1), az köpük. Küçük bardakta servis." },
    latte:      { name: "Caffè latte",  level: 3, req: "macchiato", unlockCups: 44, shop: 2, art: true, price: 16, cost: 4, needs: ["milkKit","boiler"], steps: ["grind","dose","tamp","extract","pressure","milk"], milk: "micro",
      card: "Espresso + bol süt, ince mikro köpük (~1 cm). Latte art bu dokuyla yapılır." },
    cappuccino: { name: "Cappuccino",   level: 3, req: "macchiato", unlockCups: 58, shop: 2, art: true, price: 17, cost: 4, needs: ["milkKit","boiler","cocoa"], steps: ["grind","dose","tamp","extract","pressure","milk","cocoa"], milk: "foam",
      card: "1/3 espresso, 1/3 süt, 1/3 köpük. Süt 60–65 °C; kalın ama ipeksi köpük." }
  },

  // §4 – Mini oyunlar (MVP: 5 adet). Aralıklar: Çırak rütbesinde geniş, yükseldikçe daralır.
  minigames: {
    grind:   { name: "Öğütme",       hint: "Siyah ibre hızla gidip geliyor: koyu yeşilde ÖĞÜT'e bas." },
    dose:    { name: "Dozlama",      hint: "Basılı tut, kahve dolsun; ibre 18 g'da (koyu yeşil) iken bırak." },
    tamp:    { name: "Tamping",      hint: "Daire büyüyüp küçülüyor: kenarı koyu yeşil halkadayken dokun." },
    extract: { name: "Ekstraksiyon", hint: "BAŞLAT'a bas; ibre süreyi gösterir, koyu yeşilde DURDUR." },
    milk:    { name: "Süt köpürtme", hint: "Basılı tut, süt ısınır; ibre koyu yeşildeyken bırak (60–65 °C)." },
    water:   { name: "Su dök",       hint: "Kettle'ı basılı tut, su seviyesi koyu yeşildeyken bırak." },
    pressure:{ name: "Basınç",       hint: "Kadran ibresi dönüyor: renkli yayın ortasındayken VİDAYI KAPAT." },
    cocoa:   { name: "Kakao serp",   hint: "Serpici sağa-sola gidiyor: fincanın tam ortasındayken SERP." },
    art:     { name: "Latte art",    hint: "Basılı tut ve dök, koyu yeşilde bırak; sonra kesim ibresi koyu yeşildeyken KES." }
  },


  // §9 – Barista rütbesi: kabul aralıkları. tol = hedefin etrafındaki tolerans çarpanı.
  // Prototip kalibrasyonu: XP eşikleri küçültüldü (hız hissi için). Tarif açılımı XP'ye değil satılan kahveye bağlı (unlockCups, §3).
  ranks: [
    { name: "Çırak",           xp: 0,   tol: 1.0,  tipMult: 1.0, guide: true },
    { name: "Barista",         xp: 120, tol: 0.8,  tipMult: 1.2, guide: false },
    { name: "Kıdemli barista", xp: 350, tol: 0.65, tipMult: 1.2, guide: false }
  ],

  // §7 – Prototip müşteri tipleri (5). İsim yazılmaz, yalnızca tip (statü) görünür. patience saniye.
  customers: {
    business: { name: "İş adamı",        patience: 18, wants: ["espresso","americano","lungo"],             priceSens: 0.3, qualitySens: 0.7, tip: 2.0 },
    student:  { name: "Öğrenci",         patience: 55, wants: ["latte","cappuccino","macchiato","americano"], priceSens: 1.0, qualitySens: 0.6, tip: 0.4, discount: 0.8 },
    elder:    { name: "Yaşlı teyze",     patience: 70, wants: ["macchiato","cortado","latte","espresso"],    priceSens: 0.6, qualitySens: 0.7, tip: 1.0 },
    geek:     { name: "Kahve meraklısı", patience: 40, wants: ["espresso","ristretto","cortado","lungo"],    priceSens: 0.2, qualitySens: 1.0, tip: 1.6 },
    regular:  { name: "Düzenli müşteri", patience: 50, wants: null,                                         priceSens: 0.5, qualitySens: 0.8, tip: 1.2 }
  },

  // §6 – Çekirdekler (MVP: 2). qualityMod kaliteyi etkiler; tolMod espresso aralığını.
  beans: {
    brazil:   { name: "Brezilya",  price: 100, unlock: 1, notes: "Fındık, çikolata, düşük asidite. Espresso ve sütlü içecekler için ideal.", qualityMod: 0,  tolMod: 1.1,
      page: "Dünyanın en büyük üreticisi. Düşük rakım, doğal işleme. Bağışlayıcı bir espresso çekirdeği." },
    colombia: { name: "Kolombiya", price: 140, unlock: 2, notes: "Dengeli, karamel, hafif meyve. Americano ve filtre için.", qualityMod: 5, tolMod: 1.0,
      page: "Yıkanmış işleme, 1.200–2.000 m rakım. Temiz ve dengeli; meraklı müşteriler bunu arar." }
  },

  // §8 – Ekipman + otomasyon (prototip). stars = gereken dükkan seviyesi; auto = otomatik yaptığı adımlar (sabit 85 puan).
  equipment: {
    // hassasiyet: renkli hedef bölgeleri ×1,5 (widen); otomasyon için önce bunlar gerekir (requires)
    grindPrecise:  { name: "Mikro ayarlı öğütücü",       price: 150,  stars: 1, widen: "grind",   effect: "Öğütme hedef bölgeleri ×1,5 geniş" },
    precScale:     { name: "Hassas terazi",              price: 160,  stars: 1, widen: "dose",    effect: "Dozlama hedef bölgeleri ×1,5 geniş" },
    scaleTamp:     { name: "Tartılı tamper",             price: 180,  stars: 1, widen: "tamp",    effect: "Tamping hedef bölgeleri ×1,5 geniş" },
    pidGauge:      { name: "Basınç göstergesi (PID)",    price: 220,  stars: 1, widen: "extract", effect: "Ekstraksiyon hedef bölgeleri ×1,5 geniş" },
    thermoPitcher: { name: "Termometreli sürahi",        price: 140,  stars: 1, widen: "milk",    effect: "Süt hedef bölgeleri ×1,5 geniş" },
    steamWand:     { name: "Buhar çubuğu yükseltmesi",   price: 300,  stars: 1, effect: "Süt köpürtme hızlanır" },
    pourPitcher:   { name: "Profesyonel döküm sürahisi", price: 260,  stars: 3, widen: "art",     effect: "Latte art hedef bölgeleri ×1,5 geniş" },
    // otomasyon (sabit 85 puan)
    autoGrind:   { name: "Otomatik öğütücü",          price: 350,  stars: 1, auto: ["grind"], requires: ["grindPrecise"], effect: "Öğütme otomatik (85 puan)" },
    scaleGrind:  { name: "Tartılı öğütücü",           price: 400,  stars: 1, auto: ["dose"],  requires: ["precScale"], effect: "Dozlama otomatik (85 puan)" },
    autoTamp:    { name: "Otomatik tamper",           price: 450,  stars: 2, auto: ["tamp"],  requires: ["scaleTamp"], effect: "Tamping otomatik (85 puan)" },
    dualGroup:   { name: "Çift gruplu makine",        price: 700,  stars: 2, effect: "2 paralel sipariş" },
    fridge:      { name: "Süt buzdolabı",             price: 400,  stars: 2, effect: "Süt 3 gün dayanır" },
    superAuto:   { name: "Süper otomatik espresso makinesi", price: 2500, stars: 3, auto: ["grind","dose","tamp","extract"], requires: ["pidGauge","autoGrind","scaleGrind","autoTamp"], effect: "Espressonun tüm adımları tek tuş (85 puan)" },
    autoMilk:    { name: "Otomatik süt köpürtücü",    price: 900,  stars: 3, auto: ["milk"],  requires: ["thermoPitcher"], effect: "Süt adımı otomatik (85 puan)" }
  },
  // §4 renkli hedef çubuğu: bölge yarı genişlikleri (çubuğun %'si) ve puanları
  zones: { perfect: 1, good: 2.5, ok: 5, stepMult: { tamp: 3 }, widen: 1.5, score: { perfect: 100, good: 88, ok: 72 } },

  // §3 – Tarife özel aletler ve makineler (Dükkan › Aletler & Makineler). step: getirdiği mini oyun (espressodan sonra)
  tools: {
    kettle:  { name: "Su ısıtıcısı (kettle)",                    price: 80,  stars: 1, step: "water",    effect: "Americano için sıcak su dökme" },
    milkKit: { name: "Süt köpürtme seti (sürahi + buhar çubuğu)", price: 180, stars: 1, step: "milk",     effect: "Sütlü tüm tarifler için süt köpürtme" },
    boiler:  { name: "Büyük buhar kazanı (makine)",              price: 600, stars: 2, step: "pressure", effect: "Latte ve cappuccino için yüksek basınçlı buhar" },
    cocoa:   { name: "Kakao serpici",                            price: 120, stars: 2, step: "cocoa",    effect: "Cappuccino'nun üstüne kakao" }
  },
  // §8 – Varsayılan fiyat ve müşteri tepkisi
  pricing: { markup: 2, neutral: 0.10, all: 0.50, step: 0.05, min: 0.5, max: 2.0 },
  // §8 – Kahve borsası (haftalık)
  market: { weeklyMax: 0.12, min: 0.7, max: 1.4, news: 3 },
  // §8 – Personel (prototip)
  staff: { assistant: { name: "Yardımcı barista", stars: 2, wage: 40, prepTime: 7, score: 85, effect: "Kuyruktaki sütsüz siparişleri kendisi hazırlar" } },
  // §8 – Dekor (prototip): alınan dekor dükkanda görünür
  decor: {
    plant:  { name: "Büyük bitki",   price: 120, effect: "Günde +1 itibar", rep: 1 },
    lamp:   { name: "Ayaklı lamba",  price: 200, effect: "Bahşiş ×1,1", tip: 1.1 },
    record: { name: "Pikap",         price: 350, effect: "Müşteri sabrı ×1,15", patience: 1.15 }
  },


  // §8 – Ekonomi
  economy: { startMoney: 300, beanPerCup: 0.018 /* kg */, milkPrice: 15 /* ₺/L */, milkPerCup: 0.2 /* L */, minBeans: 0.3, minMilk: 1, milkShelfDays: 3, autoScore: 85, loanInterest: 0.10, loanDailyCut: 0.20,
    loans: [{ amount: 100, days: 5 }, { amount: 250, days: 8 }], rentLoanDays: 6 },   // §2 kredi türleri ve vadeleri

  // §9 – Dükkan seviyeleri (MVP: 3). Prototip kalibrasyonu: günlük müşteri sayısı azaltıldı (gün kısa ve odaklı kalsın).
  shopLevels: [
    { stars: 1, name: "Köşe büfesi",        money: 0,    rep: 0,   customersPerDay: 6, rent: 150, loanLimit: 600, maxQueue: 3, interval: 13, custStep: 2, tierCost: [120, 220, 350] },
    { stars: 2, name: "Mahalle kahvecisi",  money: 1500, rep: 100, customersPerDay: 9, rent: 350, loanLimit: 1500, maxQueue: 5, interval: 9.5, custStep: 3, tierCost: [300, 550, 850] },
    { stars: 3, name: "Semt favorisi",      money: 5000, rep: 250, customersPerDay: 13, rent: 700, loanLimit: 3000, maxQueue: 7, interval: 6.5, custStep: 4, tierCost: [700, 1200, 1800] }
  ],

  // §9 – Müşteri trafiği yükseltmeleri (her dükkan tipine özel, 3 kademe)
  traffic: {
    cust: ["Kaldırım tabelası", "Sosyal medya sayfası", "Mahalle gazetesine ilan"],
    freq: ["Vitrin ışıkları", "Kapı önü menü panosu", "Sokağa kahve kokusu (fan)"],
    freqMult: 0.85
  },
  // §2 – Hafta
  weekdays: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
  // §7 – Günlük görevler (prototip). {n} sayı, {d} içecek adı
  tasks: [
    { kind: "serveDrink", text: "Bugün {n} {d} sat", n: [2, 3], money: 40, xp: 20 },
    { kind: "perfect",    text: "{n} mükemmel servis yap", n: [1, 2], money: 50, xp: 25 },
    { kind: "noLeave",    text: "Hiç müşteri kaçırma", money: 60, xp: 30 },
    { kind: "earn",       text: "Bugün {n}₺ kazan", n: [60, 90], money: 40, xp: 20 }
  ],
  // §7 – Mükemmel seri: her ardışık mükemmel servis +0,1 bahşiş çarpanı, en fazla ×1,5
  streak: { step: 0.1, max: 1.5 },

  // §4 – "Her hata bir ders verir": Kahve Defteri ipuçları
  tips: {
    grind_low:    "Öğütüm çok kaba: su hızlı geçer, ekşi tat. Bir kademe incelt.",
    grind_high:   "Öğütüm çok ince: su yavaş geçer, acı tat. Bir kademe kabalaştır.",
    dose_low:     "Doz eksik: sepet boş kalır, kanal oluşur. 18 g hedefle.",
    dose_high:    "Doz fazla: grup kafasına değer, akış tıkanır.",
    tamp_low:     "Tamping zayıf: kahve yatağı eşit sıkışmaz, kanal oluşur.",
    tamp_high:    "Tamping çok sert: fayda yok, bileği yorar. Düz ve eşit basınç yeter.",
    extract_low:  "Çok erken durdurdun: az ekstraksiyon, ekşi ve ince.",
    extract_high: "Çok geç durdurdun: fazla ekstraksiyon, acı ve kuru.",
    milk_low:     "Süt soğuk kaldı: köpük tutmaz. 60 °C'yi bekle.",
    milk_high:    "Süt kaynadı: tatlılık gider, kabarcıklar irileşir. 65 °C'yi geçme.",
    water_low:    "Su az: americano fazla sert ve kısa kaldı.",
    water_high:   "Su fazla: americano sulandı, tadı kaçtı.",
    pressure_low: "Basınç düşük: süt köpürmeden ılık kalır.",
    pressure_high:"Basınç fazla: buhar sütü sıçratır, köpük iri olur.",
    cocoa_low:    "Kakao kenara döküldü: fincanın soluna kaydı.",
    cocoa_high:   "Kakao kenara döküldü: fincanın sağına kaydı.",
    art_low:      "Döküm erken bitti: kalbin tabanı küçük kaldı. %65'e kadar doldur.",
    art_high:     "Fincan taştı ya da kesim kaydı: desen dağıldı. %80'de bırak, ortadan kes."
  },

  // §10 – Yıldız Teyze metinleri (kısa): açılış yalnızca dükkanın devrini anlatır, gerisi oynadıkça öğrenilir
  tutorial: {
    intro: "Hoş geldin evladım. Ben Yıldız Teyze. Bu dükkanı yıllardır işletiyorum ama artık yoruldum. Bundan sonra dükkan senin. Gerisini oynadıkça öğrenirsin.",
    milk: "Sütü köpürtürken kâğıt yırtılır gibi hafif bir ses duyarsın. O ses doğru sestir.",
    // §10 ilk kahve öğreticisi: ilk müşteri Yıldız Teyze, adım adım
    first: "İlk kahveyi bana yap bakalım; acelem yok. Sırada dururken bana dokun.",
    steps: {
      grind:   "<b>Öğütüyoruz.</b> Çubukta siyah ibre hızla gidip geliyor. Ortadaki küçük koyu yeşil = mükemmel öğütüm; açık yeşil güzel, sarı idare eder. Çok kaba olursa su hızlı geçer, ekşi olur; çok ince olursa tıkanır, acı olur. İbre koyu yeşildeyken büyük <b>ÖĞÜT</b> düğmesine bas.",
      dose:    "<b>Dozluyoruz.</b> Düğmeyi <b>basılı tut</b>: sepete kahve dolar, terazi artar. İbre <b>18 gramda</b> (koyu yeşil) iken bırak; 24 gramı geçersen taşar.",
      tamp:    "<b>Sıkıştırıyoruz (tamping).</b> Tamper dairesi büyüyüp küçülüyor. Dairenin siyah kenarı koyu yeşil halkaya geldiği an daireye ya da <b>BASTIR</b>'a dokun. Düz ve eşit basınç.",
      extract: "<b>Çekiyoruz.</b> <b>BAŞLAT</b>'a bas; ibre saniyeleri sayarak sağa ilerler. Krema koyu baldan açık karamele dönerken, koyu yeşilde (<b>25–30 sn</b>) <b>DURDUR</b>.",
      milk:    "<b>Süt köpürtüyoruz.</b> Düğmeyi basılı tut: süt ısınır, ibre sağa ilerler. Kâğıt yırtılır gibi hafif sesi duy; ibre koyu yeşildeyken (<b>60–65 °C</b>) bırak.",
      art:     "<b>Latte art.</b> Basılı tut ve sütü dök; ibre doluluğu gösterir, koyu yeşilde bırak. Sonra kesim ibresi gidip gelir: koyu yeşildeyken <b>KES</b>."
    },

    done: "İşte ilk espresson. Gördün mü, para kazandın bile. Bundan sonra müşteriler gerçek: sabırları var, kaçarlarsa itibar düşer. Defterin köşede; hatalarını oraya yazarım."
  }
};
