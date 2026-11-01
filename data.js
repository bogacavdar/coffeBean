// data.js – Tüm içerik tasarım dokümanından (Kural 2). Kod değişmeden içerik buradan eklenir (§12).
window.DATA = {
  version: "0.17",   // §12: sayfadaki CB_VERSION ile aynı olmalı; değilse oyun kendini yeniden yükler
  // §3 – Kahve öğrenme ağacı (MVP). Açılış: satılan toplam kahve sayısı (unlockCups, kümülatif artan fark) + gerekirse dükkan seviyesi (shop).
  // §8 prototip kalibrasyonu (erişilebilirlik): fiyatlar yükseltildi ki ilk seviye geliştirmeler daha ulaşılabilir olsun.
  drinks: {
    espresso:   { name: "Espresso", sizes: ["single","double"],     level: 1, req: null,        unlockCups: 0,   price: 10, cost: 2, steps: ["grind","dose","tamp","extract"],
      card: "18 g kahve → 36 g espresso (1:2), 25–30 sn. Ekşi tat = çok hızlı aktı, öğütümü incelt. Acı tat = çok yavaş aktı, öğütümü kabalaştır." },
    americano:  { name: "Americano", sizes: ["S","M","L"],    level: 2, req: "espresso",  unlockCups: 4,  price: 11, cost: 2, needs: ["kettle"], steps: ["grind","dose","tamp","extract","water","stir"],
      card: "Espresso + sıcak su (1:3). Su üstüne espresso eklenirse krema korunur." },
    lungo:      { name: "Lungo", sizes: ["single","double"],        level: 2, req: "espresso",  unlockCups: 8,  price: 10, cost: 2, steps: ["grind","dose","tamp","extract"], ratio: 3, profile: { grind: -12, blond: true },   // §4 lungo: kaba öğütüm + iki aşamalı çekme
      card: "Uzun espresso: 18 g → ~54 g (1:3), 35–40 sn. Daha hafif, daha acımsı." },
    ristretto:  { name: "Ristretto", sizes: ["single","double"],    level: 2, req: "espresso",  unlockCups: 14,  price: 10, cost: 2, steps: ["grind","dose","tamp","extract"], ratio: 1.5, profile: { grind: 12, extractSpeed: 1.5, extractZone: 0.6 },   // §4 ristretto: ince öğütüm, hızlı ve dar çekme
      card: "Kısa espresso: 18 g → ~27 g (1:1,5), 18–22 sn. Daha yoğun, daha tatlı." },
    macchiato:  { name: "Macchiato", sizes: ["single","double"],    level: 3, req: "espresso",  unlockCups: 22, price: 13, cost: 3, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "dollop",
      card: "Espresso üzerine bir kaşık süt köpüğü. 'Lekelenmiş' demektir." },
    cortado:    { name: "Cortado", sizes: ["single","double"],      level: 3, req: "macchiato", unlockCups: 32, price: 15, cost: 3, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "micro",
      card: "Espresso ile eşit miktarda süt (1:1), az köpük. Küçük bardakta servis." },
    latte:      { name: "Caffè latte", sizes: ["S","M","L"],  level: 3, req: "macchiato", unlockCups: 44, shop: 2, art: true, price: 16, cost: 4, needs: ["milkKit","boiler"], steps: ["grind","dose","tamp","extract","pressure","milk","swirl"], milk: "micro",
      card: "Espresso + bol süt, ince mikro köpük (~1 cm). Latte art bu dokuyla yapılır." },
    cappuccino: { name: "Cappuccino", sizes: ["S","M","L"],   level: 3, req: "macchiato", unlockCups: 58, shop: 2, art: true, price: 17, cost: 4, needs: ["milkKit","boiler","cocoa"], steps: ["grind","dose","tamp","extract","pressure","milk","swirl","cocoa"], milk: "foam",
      card: "1/3 espresso, 1/3 süt, 1/3 köpük. Süt 60–65 °C; kalın ama ipeksi köpük." }
  },

  // §4 – Mini oyunlar (MVP: 5 adet). Aralıklar: Çırak rütbesinde geniş, yükseldikçe daralır.
  minigames: {
    grind:   { name: "Öğütme",       hint: "Siyah ibre hızla gidip geliyor: koyu yeşilde ÖĞÜT'e bas." },
    dose:    { name: "Dozlama",      hint: "Basılı tut, kahve dolsun; ibre 18 g'da (koyu yeşil) iken bırak." },
    tamp:    { name: "Temperleme",      hint: "Daire büyüyüp küçülüyor: kenarı koyu yeşil halkadayken dokun." },
    extract: { name: "Ekstraksiyon", hint: "BAŞLAT'a bas; ibre süreyi gösterir, koyu yeşilde DURDUR." },
    milk:    { name: "Süt köpürtme", hint: "Basılı tut, süt ısınır; ibre koyu yeşildeyken bırak (60–65 °C)." },
    water:   { name: "Su dök",       hint: "Kettle'ı basılı tut, su seviyesi koyu yeşildeyken bırak." },
    pressure:{ name: "Basınç",       hint: "Kadran ibresi dönüyor: renkli yayın ortasındayken VİDAYI KAPAT." },
    cocoa:   { name: "Kakao çalkala", hint: "Serpiciyi fincanın üstünde sağa-sola kaydırarak çalkala; her çalkalamada kakao yağar." },
    stir:    { name: "Karıştır",     hint: "Kaşıkla fincanın içinde daire çizerek 3 tur karıştır." },
    swirl:   { name: "Sürahiyi çevir", hint: "Sürahiyi daire çizerek 3 tur çevir; süt ile köpük birleşsin." },
    pour:    { name: "Sütü dök",     hint: "Basılı tut, sürahiden fincana süt dök; fincan dolunca biter." },
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
    scaleTamp:     { name: "Tartılı temper",             price: 180,  stars: 1, widen: "tamp",    effect: "Temperleme hedef bölgeleri ×1,5 geniş" },
    pidGauge:      { name: "Basınç göstergesi (PID)",    price: 220,  stars: 1, widen: "extract", effect: "Ekstraksiyon hedef bölgeleri ×1,5 geniş" },
    thermoPitcher: { name: "Termometreli sürahi",        price: 140,  stars: 1, widen: "milk",    effect: "Süt hedef bölgeleri ×1,5 geniş" },
    steamWand:     { name: "Buhar çubuğu yükseltmesi",   price: 300,  stars: 1, effect: "Süt köpürtme hızlanır" },
    pourPitcher:   { name: "Profesyonel döküm sürahisi", price: 260,  stars: 3, widen: "art",     effect: "Latte art hedef bölgeleri ×1,5 geniş" },
    // otomasyon (sabit 85 puan)
    autoGrind:   { name: "Otomatik öğütücü",          price: 350,  stars: 1, auto: ["grind"], requires: ["grindPrecise"], effect: "Öğütme otomatik (85 puan)" },
    scaleGrind:  { name: "Tartılı öğütücü",           price: 400,  stars: 1, auto: ["dose"],  requires: ["precScale"], effect: "Dozlama otomatik (85 puan)" },
    autoTamp:    { name: "Otomatik temper",           price: 450,  stars: 2, auto: ["tamp"],  requires: ["scaleTamp"], effect: "Temperleme otomatik (85 puan)" },
    dualGroup:   { name: "Çift gruplu makine",        price: 700,  stars: 2, effect: "2 paralel sipariş" },
    fridge:      { name: "Süt buzdolabı",             price: 400,  stars: 2, effect: "Süt 3 gün dayanır" },
    superAuto:   { name: "Süper otomatik espresso makinesi", price: 2500, stars: 3, auto: ["grind","dose","tamp","extract"], requires: ["pidGauge","autoGrind","scaleGrind","autoTamp"], effect: "Espressonun tüm adımları tek tuş (85 puan)" },
    autoMilk:    { name: "Otomatik süt köpürtücü",    price: 900,  stars: 3, auto: ["milk"],  requires: ["thermoPitcher"], effect: "Süt adımı otomatik (85 puan)" }
  },
  // §4 renkli hedef çubuğu: bölge yarı genişlikleri (çubuğun %'si) ve puanları
  zones: { time: { perfect: 0.0267, good: 0.0667, ok: 0.133 } /* §4 eşit zorluk: sn; yarı genişlik % = ibre hızı × süre */, minPerfect: 0.3, widen: 1.5, score: { perfect: 100, good: 88, ok: 72 } },

  // §3 – Tarife özel aletler ve makineler (Dükkan › Aletler & Makineler). step: getirdiği mini oyun (espressodan sonra)
  tools: {
    kettle:  { name: "Su ısıtıcısı (kettle)",                    price: 80,  stars: 1, step: "water",    effect: "Americano için sıcak su dökme" },
    milkKit: { name: "Süt köpürtme seti (sürahi + buhar çubuğu)", price: 180, stars: 1, step: "milk",     effect: "Sütlü tüm tarifler için süt köpürtme" },
    boiler:  { name: "Büyük buhar kazanı (makine)",              price: 600, stars: 2, step: "pressure", effect: "Latte ve cappuccino için yüksek basınçlı buhar" },
    cocoa:   { name: "Kakao serpici",                            price: 120, stars: 2, step: "cocoa",    effect: "Cappuccino'nun üstüne kakao" }
  },
  // §7/§8 – Boyutlar ve bardaklar
  sizes: {
    single: { label: "Tek",   say: "",          cup: "espS", bean: 1, milk: 1,   price: 1,    dose: 18 },
    double: { label: "Double", say: "double",   cup: "espD", bean: 2, milk: 1,   price: 1.7,  dose: 36 },
    S:      { label: "Küçük", say: "küçük boy", cup: "cupS", bean: 1, milk: 1,   price: 1,    dose: 18 },
    M:      { label: "Orta",  say: "orta boy",  cup: "cupM", bean: 1, milk: 1.5, price: 1.25, dose: 18 },
    L:      { label: "Büyük", say: "büyük boy", cup: "cupL", bean: 2, milk: 2,   price: 1.6,  dose: 36 }
  },
  cups: {
    espS: { name: "Espresso fincanı (tek)", pack: 10, price: 10 },
    espD: { name: "Double fincan",          pack: 10, price: 12 },
    cupS: { name: "Küçük bardak",           pack: 10, price: 12 },
    cupM: { name: "Orta bardak",            pack: 10, price: 15 },
    cupL: { name: "Büyük bardak",           pack: 10, price: 18 }
  },
  cupMin: 3, startCups: { espS: 20, espD: 10 },
  // §7 küçük malzemeler (sarf): gizli kullanım oranı (use), takeaway: yalnız karton bardakta
  extras: {
    sleeve:    { name: "Bardak tutacağı",   pack: 50,  price: 15, use: 0.90, takeaway: true, miss: "Bardak tutacağı bile yok, elim yandı!" },
    napkin:    { name: "Peçete",            pack: 100, price: 8,  use: 0.60, miss: "Peçete bile yok!" },
    sugar:     { name: "Şeker",             pack: 100, price: 10, use: 0.35, miss: "Şeker bile yok mu?" },
    stirrer:   { name: "Karıştırma çubuğu", pack: 100, price: 6,  use: 0.30, miss: "Karıştıracak çubuk bile yok!" },
    sweetener: { name: "Tatlandırıcı",      pack: 50,  price: 12, use: 0.05, miss: "Tatlandırıcı bile yok!" },
    straw:     { name: "Pipet",             pack: 50,  price: 5,  use: 0.05, miss: "Pipet bile yok!" }
  },
  extrasStart: 20, extrasLow: 10, extraTip: [1, 0.3, 0],
  // §12 zorluk: Normal = belgedeki değerler
  difficulty: {
    easy:   { label: "Kolay",  desc: "Müşteriler daha sabırlı, renkli bölgeler %10 geniş, tedarik %20 ucuz (daha çok kâr), ₺400 ile başla.", patience: 1.3,  zone: 1.10, cost: 0.80, startMoney: 400 },
    normal: { label: "Normal", desc: "Oyunun dengelendiği zorluk.", patience: 1,    zone: 1,    cost: 1,    startMoney: 300 },
    hard:   { label: "Zor",    desc: "Müşteriler sabırsız, renkli bölgeler %15 dar, tedarik %20 pahalı (az kâr), ₺250 ile başla.", patience: 0.75, zone: 0.85, cost: 1.20, startMoney: 250 }
  },
  noCupLines: ["Nasıl {s} bardağınız yok?!", "{S} bardak mı bitmiş? Olacak iş değil!", "Bardak yoksa ben de yokum!", "Bu dükkanda {s} bardak bile yok mu?"],
  wrongLines: ["Ben bunu istemedim!", "Bu benim siparişim değil!", "Yanlış kahve verdin, almıyorum.", "Ben {d} istemiştim!"],
  // §7 – Sipariş cümleleri ({d} = içecek adı); genel + tipe özel, rastgele seçilir
  orderLines: {
    any: ["Bir {d} lütfen.", "Bana bir {d} güzelim.", "Sende {d} var mı?", "Bir {d} alayım.", "{d} yapar mısın?", "Canım {d} istedi.",
          "Sende var {d}?", "Ben istemek bir {d}.", "Merhaba! Bir {d} rica edebilir miyim?", "Bugün {d} günü, bir tane lütfen.", "Bir {d}, bol sevgili olsun.", "{d} alabilir miyim?"],
    business: ["Bir {d}, çabuk lütfen.", "Toplantıya geç kalıyorum, bir {d}!", "Hızlıca bir {d} alayım."],
    student:  ["Abi bir {d}, öğrenci indirimi var mı?", "Abla bir {d} lütfen, sınavım var.", "Bir {d}, hesabı bölüşemiyoruz ama."],
    elder:    ["Evladım bana bir {d} yapıver.", "Kızım, bir {d} olsun, şekersiz.", "Yavrum bir {d} rica edeyim."],
    geek:     ["Çekirdek ne? Bir {d} alayım.", "Bugünkü öğütümle bir {d} lütfen.", "Bir {d}, ekstraksiyonu 28 saniye olsun."],
    regular:  ["Her zamankinden, bir {d}.", "Bildiğin gibi, bir {d}.", "Yine ben! Bir {d} lütfen."]
  },
  // §4 – Sipariş sonu değerlendirme: ortalama puana göre etiket ve rastgele müşteri yorumu
  reviews: [
    { min: 95, label: "Mükemmel", cls: "perfect", lines: ["İçtiğim en iyi kahve!", "Mükemmel! Her gün geleceğim.", "Bu kahve bir sanat eseri!", "Vay be, tam kıvamında!", "Hayatımın espressosu!"] },
    { min: 80, label: "Lezzetli", cls: "good", lines: ["Çok lezzetli, eline sağlık!", "Harika olmuş, teşekkürler.", "Güzel kahve, yine gelirim.", "Mis gibi!"] },
    { min: 60, label: "Ortalama", cls: "ok", lines: ["İdare eder.", "Fena değil.", "Sıradan bir kahve.", "Eh işte, içilir."] },
    { min: 40, label: "Kötü", cls: "miss", lines: ["Biraz acı olmuş.", "Pek beğenmedim.", "Tadı biraz garip.", "Daha iyisini içmiştim."] },
    { min: 0,  label: "Berbat", cls: "miss", lines: ["Bunu içemem!", "Berbat olmuş.", "Bir daha gelmem.", "Bu kahve mi şimdi?"] }
  ],
  // §8 – Varsayılan fiyat ve müşteri tepkisi
  pricing: { markup: 2, neutral: 0.10, all: 0.50, step: 0.05, min: 0.5, max: 2.0 },
  // §8 – Kahve borsası (haftalık)
  market: { weeklyMax: 0.12, min: 0.7, max: 1.4, news: 3 },
  // §8 – Personel (prototip)
  staff: { assistant: { name: "Yardımcı barista", stars: 2, wage: 40, prepTime: 7, score: 85, effect: "Kuyruktaki sütsüz siparişleri kendisi hazırlar" } },
  // §8 – Dekor (prototip): alınan dekor dükkanda görünür
  // §8 dekorasyon dükkana özeldir: stars = hangi dükkanda satılır/görünür/etki eder
  decor: {
    plant:      { stars: 1, name: "Büyük bitki",            price: 120,  effect: "Günde +1 itibar", rep: 1 },
    lamp:       { stars: 1, name: "Ayaklı lamba",           price: 200,  effect: "Bahşiş ×1,1", tip: 1.1 },
    record:     { stars: 1, name: "Pikap",                  price: 350,  effect: "Müşteri sabrı ×1,15", patience: 1.15 },
    poster:     { stars: 1, name: "Vintage kahve posteri",  price: 70,   effect: "Bahşiş ×1,03", tip: 1.03 },
    mat:        { stars: 1, name: "Hoş geldin paspası",     price: 50,   effect: "Müşteri sabrı ×1,05", patience: 1.05 },
    stools:     { stars: 1, name: "Pencere önü tabureleri", price: 150,  effect: "Bahşiş ×1,05", tip: 1.05 },
    sofa:       { stars: 2, name: "Chester koltuk",         price: 450,  effect: "Bahşiş ×1,1", tip: 1.1 },
    bookshelf:  { stars: 2, name: "Kitaplık",               price: 300,  effect: "Müşteri sabrı ×1,1", patience: 1.1 },
    ivy:        { stars: 2, name: "Sarmaşık saksılar",      price: 200,  effect: "Günde +1 itibar", rep: 1 },
    photos:     { stars: 2, name: "Mahalle fotoğrafları",   price: 150,  effect: "Bahşiş ×1,04", tip: 1.04 },
    clock:      { stars: 2, name: "Duvar saati",            price: 120,  effect: "Müşteri sabrı ×1,05", patience: 1.05 },
    neon:       { stars: 2, name: "Neon kahve tabelası",    price: 380,  effect: "Bahşiş ×1,08", tip: 1.08 },
    piano:      { stars: 3, name: "Duvar piyanosu",         price: 1200, effect: "Müşteri sabrı ×1,15", patience: 1.15 },
    aquarium:   { stars: 3, name: "Akvaryum",               price: 800,  effect: "Müşteri sabrı ×1,1", patience: 1.1 },
    olive:      { stars: 3, name: "Zeytin ağacı",           price: 500,  effect: "Günde +1 itibar", rep: 1 },
    artwall:    { stars: 3, name: "Sanat duvarı",           price: 600,  effect: "Günde +2 itibar", rep: 2 },
    chandelier: { stars: 3, name: "Kristal avize",          price: 900,  effect: "Bahşiş ×1,12", tip: 1.12 },
    brass:      { stars: 3, name: "Pirinç tabela",          price: 700,  effect: "Bahşiş ×1,1", tip: 1.1 }
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
    tamp_low:     "Temperleme zayıf: kahve yatağı eşit sıkışmaz, kanal oluşur.",
    tamp_high:    "Temperleme çok sert: fayda yok, bileği yorar. Düz ve eşit basınç yeter.",
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

  // §10 – Yıldız Teyze metinleri (kısa): açılış dükkanın devrini, kahvelerin espressodan yapıldığını ve tarif defterini anlatır
  tutorial: {
    intro: "Hoş geldin evladım. Ben Yıldız Teyze. Bu dükkanı yıllardır işletiyorum ama artık yoruldum; bundan sonra dükkan senin. Bil ki bütün kahveler espressodan yapılır. Gerisini tarif defterimden öğrenirsin, köşede duruyor.",
    milk: "Sütü köpürtürken kâğıt yırtılır gibi hafif bir ses duyarsın. O ses doğru sestir.",
    // §10 ilk kahve öğreticisi: ilk müşteri Yıldız Teyze, adım adım
    first: "İlk kahveyi bana yap bakalım; acelem yok. Sırada dururken bana dokun.",
    // §10 ilk espresso: Yıldız Teyze her adımı sözlü anlatır
    espressoIntro: "<b>Önce espresso.</b> Bütün kahvelerin anası odur ve dört adımda yapılır: <b>öğüt, dozla, sıkıştır, çek</b>. Her adımda bir ibre var; ibre tam <b>koyu yeşilde</b> durduğunda basarsın. Bu iş ustalık ister evladım, sabırla öğrenilir.",
    steps: {
      grind:   "<b>1. Öğütme.</b> Çekirdeği çok kaba öğütürsen su hızlı geçer, kahve ekşi olur; çok ince öğütürsen tıkanır, acı olur. İbre gidip geliyor; tam ortadaki <b>koyu yeşile</b> gelince <b>ÖĞÜT</b>'e bas. Bu sefer ibreyi senin için orada bekleteceğim, sonra kendi gözünle yakalayacaksın.",
      dose:    "<b>2. Dozlama.</b> Sepete 18 gram kahve koyacağız. Düğmeyi <b>basılı tut</b>; kahve dolar, terazi artar. Sakın erken bırakma, ibre <b>koyu yeşile gelene kadar</b> basılı tut.",
      tamp:    "<b>3. Temperleme.</b> Kahveyi temper aletiyle düz ve eşit sıkıştırırız ki su her yerden aynı hızda geçsin; gevşek kalırsa su kanal açar, kahve sulu olur. Temper dairesi büyüyüp küçülüyor; siyah kenarı <b>koyu yeşil halkaya</b> gelince daireye ya da <b>BASTIR</b>'a dokun.",
      extract: "<b>4. Çekme.</b> Portafiltreyi makineye taktık. <b>BAŞLAT</b>'a bas, kahve fincana akmaya başlasın. İbre saniyeleri sayar; <b>koyu yeşile</b> gelince <b>DURDUR</b>.",
      milk:    "<b>Süt köpürtüyoruz.</b> Düğmeyi basılı tut: süt ısınır, ibre sağa ilerler. İbre koyu yeşildeyken (<b>60–65 °C</b>) bırak.",
      art:     "<b>Latte art.</b> Basılı tut ve sütü dök; ibre doluluğu gösterir, koyu yeşilde bırak. Sonra kesim ibresi gidip gelir: koyu yeşildeyken <b>KES</b>."
    },
    pressNow:   "<b>İşte şimdi!</b> İbre tam koyu yeşilde. Bas bakalım.",
    tooEarly:   "Acele etme evladım. İbre <b>koyu yeşile</b> gelsin, öyle bas.",
    release:    "<b>Şimdi bırak!</b> İbre koyu yeşilde; tam 18 gram oldu.",
    holdRetry:  "Erken bıraktın, sepet yarım kaldı. Baştan alalım: düğmeyi <b>koyu yeşile gelene kadar</b> bırakmadan basılı tut.",
    extractRun: "Bak, kahve akıyor. Önce koyu bal rengi gelir, sonra açık karamel rengi bir krema oluşur; güzel espresso böyle akar. İbreyi izle, <b>koyu yeşile</b> gelince durduracağız.",
    stopNow:    "<b>Şimdi durdur!</b> 25–30 saniye oldu, tam kıvamında.",


    done: "Eline sağlık evladım, mis gibi olmuş! İlk espressonu yaptın, ilk paranı da kazandın. Artık ben gideyim; dükkan sana emanet. Müşteriler gerçek, sabırları var. Takıldığında tarif defterime bak."
  }
};
