// data.js – Tüm içerik tasarım dokümanından (Kural 2). Kod değişmeden içerik buradan eklenir (§12).
window.DATA = {
  // §3 – Kahve öğrenme ağacı (MVP). Açılış: 10 mükemmel servis DEĞİL — barista XP eşiği (unlockXp), §9.
  drinks: {
    espresso:   { name: "Espresso",     level: 1, req: null,        unlockXp: 0,   price: 8,  cost: 2, steps: ["grind","dose","tamp","extract"],
      card: "18 g kahve → 36 g espresso (1:2), 25–30 sn. Ekşi tat = çok hızlı aktı, öğütümü incelt. Acı tat = çok yavaş aktı, öğütümü kabalaştır." },
    americano:  { name: "Americano",    level: 2, req: "espresso",  unlockXp: 30,  price: 9,  cost: 2, steps: ["grind","dose","tamp","extract"],
      card: "Espresso + sıcak su (1:3). Su üstüne espresso eklenirse krema korunur." },
    lungo:      { name: "Lungo",        level: 2, req: "espresso",  unlockXp: 55,  price: 8,  cost: 2, steps: ["grind","dose","tamp","extract"], ratio: 3,
      card: "Uzun espresso: 18 g → ~54 g (1:3), 35–40 sn. Daha hafif, daha acımsı." },
    ristretto:  { name: "Ristretto",    level: 2, req: "espresso",  unlockXp: 80,  price: 8,  cost: 2, steps: ["grind","dose","tamp","extract"], ratio: 1.5,
      card: "Kısa espresso: 18 g → ~27 g (1:1,5), 18–22 sn. Daha yoğun, daha tatlı." },
    macchiato:  { name: "Macchiato",    level: 3, req: "espresso",  unlockXp: 110, price: 10, cost: 3, steps: ["grind","dose","tamp","extract","milk"], milk: "dollop",
      card: "Espresso üzerine bir kaşık süt köpüğü. 'Lekelenmiş' demektir." },
    cortado:    { name: "Cortado",      level: 3, req: "macchiato", unlockXp: 150, price: 12, cost: 3, steps: ["grind","dose","tamp","extract","milk"], milk: "micro",
      card: "Espresso ile eşit miktarda süt (1:1), az köpük. Küçük bardakta servis." },
    latte:      { name: "Caffè latte",  level: 3, req: "macchiato", unlockXp: 195, price: 13, cost: 4, steps: ["grind","dose","tamp","extract","milk"], milk: "micro",
      card: "Espresso + bol süt, ince mikro köpük (~1 cm). Latte art bu dokuyla yapılır." },
    cappuccino: { name: "Cappuccino",   level: 3, req: "macchiato", unlockXp: 245, price: 14, cost: 4, steps: ["grind","dose","tamp","extract","milk"], milk: "foam",
      card: "1/3 espresso, 1/3 süt, 1/3 köpük. Süt 60–65 °C; kalın ama ipeksi köpük." }
  },

  // §4 – Mini oyunlar (MVP: 5 adet). Aralıklar: Çırak rütbesinde geniş, yükseldikçe daralır.
  minigames: {
    grind:   { name: "Öğütme",       hint: "Kaydırıcıyı hedef bölgede bırak. Çok kaba = ekşi, çok ince = acı." },
    dose:    { name: "Dozlama",      hint: "Basılı tut, 18 g'da bırak (±0,5 g)." },
    tamp:    { name: "Tamping",      hint: "Halka yeşil banda gelince tek tıkla bas." },
    extract: { name: "Ekstraksiyon", hint: "Akışı izle; 25–30 sn ve ~36 g'da durdur." },
    milk:    { name: "Süt köpürtme", hint: "Basılı tut: önce hava, sonra girdap. 60–65 °C'de bırak." }
  },

  // §9 – Barista rütbesi: kabul aralıkları. tol = hedefin etrafındaki tolerans çarpanı.
  // Prototip kalibrasyonu: XP eşikleri küçültüldü (hız hissi için); her rütbe menüye doğrudan yeni tarif ekler (unlockXp, §3).
  ranks: [
    { name: "Çırak",           xp: 0,   tol: 1.0,  tipMult: 1.0, guide: true },
    { name: "Barista",         xp: 120, tol: 0.8,  tipMult: 1.2, guide: false },
    { name: "Kıdemli barista", xp: 350, tol: 0.65, tipMult: 1.2, guide: false }
  ],

  // §7 – Müşteri tipleri (MVP: 4). patience saniye.
  customers: {
    hurry:   { name: "Acelesi olan",   patience: 20, wants: ["espresso","americano"],            priceSens: 0.8, qualitySens: 0.6, tip: 1.0 },
    student: { name: "Öğrenci",        patience: 40, wants: ["latte","cappuccino","macchiato"],  priceSens: 1.0, qualitySens: 0.6, tip: 0.5, discount: 0.8 },
    geek:    { name: "Kahve meraklısı",patience: 50, wants: ["espresso","ristretto","cortado","lungo"], priceSens: 0.2, qualitySens: 1.0, tip: 2.0 },
    regular: { name: "Düzenli",        patience: 60, wants: null,                                priceSens: 0.5, qualitySens: 0.8, tip: 1.2 }
  },

  // §6 – Çekirdekler (MVP: 2). qualityMod kaliteyi etkiler; tolMod espresso aralığını.
  beans: {
    brazil:   { name: "Brezilya",  price: 100, unlock: 1, notes: "Fındık, çikolata, düşük asidite. Espresso ve sütlü içecekler için ideal.", qualityMod: 0,  tolMod: 1.1,
      page: "Dünyanın en büyük üreticisi. Düşük rakım, doğal işleme. Bağışlayıcı bir espresso çekirdeği." },
    colombia: { name: "Kolombiya", price: 140, unlock: 2, notes: "Dengeli, karamel, hafif meyve. Americano ve filtre için.", qualityMod: 5, tolMod: 1.0,
      page: "Yıkanmış işleme, 1.200–2.000 m rakım. Temiz ve dengeli; meraklı müşteriler bunu arar." }
  },

  // §8 – Ekipman (MVP: ilk 4 satın alınabilir ekipman)
  equipment: {
    dualGroup:  { name: "Çift gruplu makine",   price: 1200, effect: "2 paralel sipariş" },
    autoGrind:  { name: "Otomatik öğütücü",     price: 600,  effect: "Öğütme adımı atlanır, sabit 85 puan" },
    scaleTamp:  { name: "Tartılı tamper",       price: 300,  effect: "Tamping aralığı genişler" },
    steamWand:  { name: "Buhar çubuğu yükseltmesi", price: 500, effect: "Süt köpürtme 2 sn kısalır" }
  },

  // §8 – Ekonomi
  economy: { startMoney: 300, weeklyRent: 200, beanPerCup: 0.018 /* kg */, milkPrice: 15 /* ₺/L */, milkPerCup: 0.2 /* L */, minBeans: 0.3, minMilk: 1, milkShelfDays: 3 },

  // §9 – Dükkan seviyeleri (MVP: 3). Prototip kalibrasyonu: günlük müşteri sayısı azaltıldı (gün kısa ve odaklı kalsın).
  shopLevels: [
    { stars: 1, name: "Köşe büfesi",        money: 0,    rep: 0,   customersPerDay: 6 },
    { stars: 2, name: "Mahalle kahvecisi",  money: 1500, rep: 100, customersPerDay: 9 },
    { stars: 3, name: "Semt favorisi",      money: 5000, rep: 250, customersPerDay: 13 }
  ],

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
    milk_high:    "Süt kaynadı: tatlılık gider, kabarcıklar irileşir. 65 °C'yi geçme."
  },

  // §10 – Nejla Teyze eğitim metinleri (kısa, atlanabilir)
  tutorial: {
    intro: "Hoş geldin. Burası benim eski dükkanım; artık senin. Defterimi tezgâhın altında bulacaksın. Önce espresso. Gerisi ondan türer.",
    espresso: "18 gram kahve, 36 gram espresso, 25–30 saniye. Bu üç sayıyı ezberle; her şey buradan başlar.",
    milk: "Sütü köpürtürken kâğıt yırtılır gibi hafif bir ses duyarsın. O ses doğru sestir.",
    // §10 ilk kahve öğreticisi: ilk müşteri Nejla Teyze, adım adım
    first: "İlk kahveyi bana yapacaksın. Acelem yok; zaman duruyor. Sırada dururken bana dokun ve siparişimi al.",
    steps: {
      grind:   "<b>Öğütüyoruz.</b> Kaydırıcıyı yeşil bölgeye getir. Çok kaba olursa su hızlı geçer, ekşi olur; çok ince olursa tıkanır, acı olur. Sonra <b>Öğüt</b>'e bas.",
      dose:    "<b>Dozluyoruz.</b> Düğmeyi basılı tut; sepet dolarken tartıyı izle. <b>18 gramda</b> bırak.",
      tamp:    "<b>Sıkıştırıyoruz (tamping).</b> Halka büyüyüp küçülüyor; yeşil banda geldiği an fincanın üstüne bir kez dokun. Düz ve eşit basınç.",
      extract: "<b>Çekiyoruz.</b> Başlat'a bas, akışı izle. Krema koyu baldan açık karamele dönerken, <b>25–30 saniyede ve ~36 gramda</b> Durdur.",
      milk:    "<b>Süt köpürtüyoruz.</b> Basılı tut: önce yüzeyde hava ver (kâğıt yırtılma sesi), sonra parmağını aşağı kaydırıp girdap yap. <b>60–65 °C</b>'de bırak."
    },
    done: "İşte ilk espresson. Gördün mü, para kazandın bile. Bundan sonra müşteriler gerçek: sabırları var, kaçarlarsa itibar düşer. Defterin köşede; hatalarını oraya yazarım."
  }
};
