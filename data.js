// data.js – Tüm içerik tasarım dokümanından (Kural 2). Kod değişmeden içerik buradan eklenir (§12).
window.DATA = {
  version: "0.26",   // §12: sayfadaki CB_VERSION ile aynı olmalı; değilse oyun kendini yeniden yükler
  // §3 – Kahve öğrenme ağacı (MVP). Açılış: satılan toplam kahve sayısı (unlockCups, kümülatif artan fark) + gerekirse dükkan seviyesi (shop).
  // §8 prototip kalibrasyonu (erişilebilirlik): fiyatlar yükseltildi ki ilk seviye geliştirmeler daha ulaşılabilir olsun.
  drinks: {
    espresso:   { name: "Espresso", sizes: ["single","double"],     level: 1, req: null,        unlockCups: 0,   price: 10, cost: 2, steps: ["grind","dose","tamp","extract"],
      card: "18 g kahve → 36 g espresso (1:2), 25–30 sn. Ekşi tat = çok hızlı aktı, öğütümü incelt. Acı tat = çok yavaş aktı, öğütümü kabalaştır." },
    americano:  { name: "Americano", sizes: ["S","M","L"],    level: 2, req: "espresso",  unlockCups: 4,  price: 11, cost: 2, steps: ["grind","dose","tamp","extract","water"],   // v0.24: sıcak su makinenin musluğundan; kettle gerekmez, karıştırılmaz
      card: "Espresso üstüne sıcak su (yaklaşık 1:3–1:5). Kremayı korumak istersen önce su, sonra espresso: o da long black." },
    lungo:      { name: "Lungo", sizes: ["single","double"],        level: 2, req: "espresso",  unlockCups: 8,  price: 10, cost: 2, steps: ["grind","dose","tamp","extract"], ratio: 3, profile: { grind: -12 },   // v0.24: lungo = kaba öğütüm + uzun çekme (gerçekte "akışı yumuşat" diye bir kontrol yok)
      card: "Uzun espresso: 18 g → ~54 g (1:3), 35–40 sn. Daha hafif, daha acımsı." },
    ristretto:  { name: "Ristretto", sizes: ["single","double"],    level: 2, req: "espresso",  unlockCups: 14,  price: 10, cost: 2, steps: ["grind","dose","tamp","extract"], ratio: 1.5, profile: { grind: 12, extractZone: 0.75 },   // v0.24: ristretto = ince öğütüm, kısa çekme, biraz daha dar pencere
      card: "Kısa espresso: 18 g → ~27 g (1:1,5), 18–22 sn. Daha yoğun, daha tatlı." },
    macchiato:  { name: "Macchiato", sizes: ["single","double"],    level: 3, req: "espresso",  unlockCups: 22, price: 13, cost: 3, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "dollop", milkL: 0.03,
      card: "Espresso üzerine bir kaşık süt köpüğü. 'Lekelenmiş' demektir." },
    cortado:    { name: "Cortado", sizes: ["single","double"],      level: 3, req: "macchiato", unlockCups: 32, price: 15, cost: 3, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "micro", milkL: 0.06,
      card: "Espresso ile eşit miktarda süt (1:1), az köpük. Küçük bardakta servis." },
    latte:      { name: "Caffè latte", sizes: ["S","M","L"],  level: 3, req: "macchiato", unlockCups: 44, art: true, price: 16, cost: 4, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","swirl"], milk: "micro", milkL: 0.2,   // v0.24: aynı buhar çubuğu latte'yi de köpürtür; "basınç" adımı kalktı
      card: "Espresso + bol süt, ince mikro köpük (~1 cm). Latte art bu dokuyla yapılır." },
    // §3 espresso dışı kahveler: kendi aletleri ve adımları
    turkish:    { name: "Türk kahvesi", sizes: ["tk"], level: 2, req: "espresso", unlockCups: 6, price: 12, cost: 2, needs: ["cezve"], sugar: true, steps: ["tkdose","tkstir","tkfoam","tkserve"], cezve: {},
      card: "Cezvede, çok ince çekilmiş 7 g kahve + 70 ml soğuk su (+ şeker). Kısık ateşte karıştırmadan ısıt; köpük kabarınca taşmadan ocaktan al, köpüğü fincana paylaştır. Yanında bir bardak su ve lokumla servis edilir. Sade, az, orta ya da şekerli." },
    frenchpress:{ name: "Pres kahve", sizes: ["S","M","L"], level: 2, req: "espresso", unlockCups: 18, price: 13, cost: 2, needs: ["frenchPress","kettle"], steps: ["fpdose","fpwater","fpsteep","fpplunge"],
      card: "French press demlikte: kaba çekilmiş kahve (1:15) + 93 °C su. 4 dakika demle, pistonu yavaşça bastır. Yağlı, gövdeli bir fincan." },
    filter:     { name: "Filtre kahve", sizes: ["S","M","L"], level: 2, req: "espresso", unlockCups: 26, price: 13, cost: 2, needs: ["v60","kettle"], steps: ["fdose","bloom","pourover"],
      card: "V60 ile: orta-ince çekim, kâğıt filtre. Önce az suyla 30 sn ön ıslatma (bloom), sonra merkezden dışa dairesel dök. Temiz ve berrak." },
    // §3 dünya kahveleri (gerçek yapılış sırasına göre adımlar). uses: [özel malzeme, miktar] ("pump" = boya göre pompa)
    longblack:  { name: "Long black", sizes: ["S","M","L"], level: 2, req: "espresso", unlockCups: 36, price: 11, cost: 2, steps: ["water","grind","dose","tamp","extract"],
      card: "Önce bardakta sıcak su, üstüne espresso. Americano'nun tersi; krema bozulmadan kalır." },
    conpanna:   { name: "Espresso con panna", sizes: ["single","double"], level: 2, req: "espresso", unlockCups: 40, price: 13, cost: 2, needs: ["creamSiphon"], uses: [["cream", 1]], steps: ["grind","dose","tamp","extract","cream"],
      card: "Espresso üstüne bir tepe krem şanti. İtalyanca 'kremalı'." },
    romano:     { name: "Espresso Romano", sizes: ["single","double"], level: 2, req: "espresso", unlockCups: 42, price: 12, cost: 2, uses: [["lemon", 1]], steps: ["grind","dose","tamp","extract","garnish"],
      card: "Espresso, fincan kenarına sürülen bir parça limon kabuğuyla servis edilir." },
    flatwhite:  { name: "Flat white", sizes: ["S","M"], level: 3, req: "macchiato", unlockCups: 50, art: true, price: 16, cost: 4, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "micro", milkL: 0.12,
      card: "Avustralya/Yeni Zelanda. Çift ristretto + ince, parlak mikro köpük; latte'den küçük ve daha güçlü." },
    piccolo:    { name: "Piccolo latte", sizes: ["S"], level: 3, req: "macchiato", unlockCups: 54, price: 14, cost: 3, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "micro", ratio: 1.5, milkL: 0.08,
      card: "Küçük bardakta ristretto + ılık mikro köpük süt. Minik bir latte." },
    cafeaulait: { name: "Café au lait", sizes: ["S","M","L"], level: 3, req: "filter", unlockCups: 62, shop: 2, price: 14, cost: 3, needs: ["v60","kettle","milkKit"], steps: ["fdose","bloom","pourover","milk","pour"], milk: "hot", milkL: 0.15,
      card: "Fransız usulü: filtre kahve ve köpüksüz sıcak süt eşit miktarda, geniş bir kâsede." },
    vanillalatte:{ name: "Vanilyalı latte", sizes: ["S","M","L"], level: 3, req: "macchiato", unlockCups: 66, shop: 2, price: 18, cost: 5, needs: ["milkKit","syrupPump"], pump: "vanilla", uses: [["vanilla", "pump"]], steps: ["pump","grind","dose","tamp","extract","milk","swirl"], milk: "micro", milkL: 0.2,
      card: "Bardağa vanilya şurubu, üstüne espresso ve mikro köpük süt." },
    redeye:     { name: "Red eye", sizes: ["S","M","L"], level: 3, req: "filter", unlockCups: 70, shop: 2, price: 15, cost: 3, needs: ["v60","kettle"], steps: ["fdose","bloom","pourover","grind","dose","tamp","extract"],
      card: "Filtre kahvenin içine bir shot espresso. Uykusuz geceler için." },
    mocha:      { name: "Caffè mocha", sizes: ["S","M","L"], level: 3, req: "macchiato", unlockCups: 74, shop: 2, price: 19, cost: 5, needs: ["milkKit","syrupPump","creamSiphon"], pump: "choco", uses: [["choco", "pump"], ["cream", 1]], steps: ["pump","grind","dose","tamp","extract","milk","swirl","cream"], milk: "micro", milkL: 0.18,
      card: "Çikolata sosu + espresso + süt, üstüne krem şanti." },
    sutluturk:  { name: "Sütlü Türk kahvesi", sizes: ["tk"], level: 2, req: "turkish", unlockCups: 78, shop: 2, price: 14, cost: 3, needs: ["cezve"], sugar: true, milkUse: true, milkL: 0.07, steps: ["tkdose","tkstir","tkfoam","tkserve"], cezve: { liquid: "milk" },
      card: "Suyun yerine sütle pişirilen Türk kahvesi; daha yumuşak ve kremamsı." },
    caramelmac: { name: "Caramel macchiato", sizes: ["S","M","L"], level: 3, req: "macchiato", unlockCups: 84, shop: 2, price: 19, cost: 5, needs: ["milkKit","syrupPump"], pump: "vanilla", drizzle: "caramel", milkL: 0.2, uses: [["vanilla", "pump"], ["caramel", 1]], steps: ["pump","milk","pour","grind","dose","tamp","extract","drizzle"], milk: "foam",
      card: "Vanilya şurubu, köpüklü süt, espresso en üste 'leke' gibi, üstüne karamel ızgarası." },
    menengic:   { name: "Menengiç kahvesi", sizes: ["tk"], level: 2, req: "turkish", unlockCups: 90, shop: 2, price: 14, cost: 3, needs: ["cezve"], milkUse: true, milkL: 0.1, noBean: true, sugar: true, uses: [["menengic", 1]], steps: ["mndose","tkstir","tkfoam","tkserve"], cezve: { liquid: "milk", powder: "menengic" },
      card: "Kafeinsiz Güneydoğu klasiği: menengiç (yabani fıstık) ezmesi sütle cezvede pişirilir. İçinde kahve yoktur." },
    saltcaramel:{ name: "Tuzlu karamelli latte", sizes: ["S","M","L"], level: 3, req: "macchiato", unlockCups: 96, shop: 2, price: 20, cost: 5, needs: ["milkKit","syrupPump"], pump: "saltcar", milkL: 0.2, drizzle: "saltcar", uses: [["saltcar", "pump"], ["saltcar", 1]], steps: ["pump","grind","dose","tamp","extract","milk","swirl","drizzle"], milk: "micro",
      card: "Tuzlu karamel sosu + espresso + süt, üstüne tuzlu karamel ızgarası." },
    dibek:      { name: "Dibek kahvesi", sizes: ["tk"], level: 2, req: "turkish", unlockCups: 100, shop: 2, price: 13, cost: 2, needs: ["cezve"], sugar: true, steps: ["tkdose","tkstir","tkfoam","tkserve"], cezve: { powder: "spiced" },
      card: "Taş dibekte dövülmüş, Türk kahvesinden iri kahve; cezvede pişirilir, daha yumuşak ve aromalıdır. Bazı karışımlarda süt tozu ve kakao bulunur." },
    affogato:   { name: "Affogato", sizes: ["affo1","affo2"], level: 3, req: "espresso", unlockCups: 110, shop: 2, price: 18, cost: 5, needs: ["iceCreamFridge"], uses: [["icecream", "scoop"]], steps: ["scoop","grind","dose","tamp","extract","pourshot"],
      card: "Kaseye vanilyalı dondurma, üstüne sıcak espresso dökülür. İtalyanca 'boğulmuş'." },
    icedamericano:{ name: "Buzlu americano", sizes: ["iS","iM","iL"], level: 3, req: "americano", unlockCups: 120, shop: 3, price: 13, cost: 2, needs: ["iceMachine"], steps: ["ice","coldwater","grind","dose","tamp","extract"],
      card: "Buzlu bardağa önce soğuk su, espresso en üste; krema katman olarak kalır." },
    icedlatte:  { name: "Buzlu latte", sizes: ["iS","iM","iL"], level: 3, req: "macchiato", unlockCups: 130, shop: 3, price: 17, cost: 4, needs: ["iceMachine"], milkUse: true, milkL: 0.15, steps: ["ice","coldmilk","grind","dose","tamp","extract"],
      card: "Buz + soğuk süt, üstüne espresso; katmanlar yavaşça karışır." },
    moka:       { name: "Moka kahve", sizes: ["S","M","L"], level: 2, req: "espresso", unlockCups: 140, shop: 3, price: 13, cost: 2, needs: ["mokaPot"], brewer: "moka", steps: ["mokafill","fdose","mokaheat"],
      card: "İtalyan moka potunda: alt hazneye vanaya kadar su, sepete kahve (silme doldur, bastırma); ocakta 'fokurdama' başlayınca ocaktan al." },
    aeropress:  { name: "AeroPress kahve", sizes: ["S","M","L"], level: 2, req: "filter", unlockCups: 150, shop: 3, price: 14, cost: 2, needs: ["aeropress","kettle"], brewer: "aeropress", steps: ["fdose","fpwater","apsteep","appress"],
      card: "Kahve + 85 °C su, 1,5 dakika demle, pistonla yavaşça bastır. Temiz ve tatlı." },
    cubano:     { name: "Café cubano", sizes: ["single","double"], level: 3, req: "espresso", unlockCups: 160, shop: 3, price: 13, cost: 2, needs: ["whisk"], uses: [["sugar", 2]], whiskBowl: "cubano", steps: ["grind","dose","tamp","extract","whisk"],
      card: "Küba usulü: şeker potada beklerken espressonun ilk damlaları üstüne alınıp çırpılır, köpüklü 'espuma' olur; kalan espresso üstüne dökülür." },
    bombon:     { name: "Café bombón", sizes: ["single","double"], level: 3, req: "espresso", unlockCups: 170, shop: 3, price: 15, cost: 3, needs: ["syrupPump"], pump: "condensed", uses: [["condensed", "pump"]], steps: ["pump","grind","dose","tamp","extract"],
      card: "İspanya: cam bardağa yoğunlaştırılmış süt, üstüne espresso; iki katman." },
    marocchino: { name: "Marocchino", sizes: ["single","double"], level: 3, req: "macchiato", unlockCups: 180, shop: 3, price: 16, cost: 4, needs: ["milkKit","cocoa","syrupPump"], pump: "choco", uses: [["choco", 1]], steps: ["pump","grind","dose","tamp","extract","milk","pour","cocoa"], milk: "foam", milkL: 0.05,
      card: "Torino: çikolata sosu + espresso + süt köpüğü + kakao, küçük cam bardakta." },
    melange:    { name: "Wiener Melange", sizes: ["S","M"], level: 3, req: "macchiato", unlockCups: 190, shop: 3, price: 17, cost: 4, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "foam", milkL: 0.12,
      card: "Viyana klasiği: yumuşak espresso + sıcak süt + bol süt köpüğü, bir bardak suyla. Krem şantili olanı Einspänner'dir." },
    dalgona:    { name: "Dalgona kahve", sizes: ["iS","iM","iL"], level: 3, req: "espresso", unlockCups: 200, shop: 3, price: 16, cost: 3, needs: ["whisk","iceMachine"], milkUse: true, milkL: 0.15, noBean: true, uses: [["instant", 1], ["sugar", 2]], whiskBowl: "dalgona", steps: ["whisk","ice","coldmilk","spoontop"],
      card: "Hazır kahve + şeker + sıcak su çırpılıp köpük yapılır, buzlu sütün üstüne kaşıkla konur." },
    espressotonic:{ name: "Espresso tonik", sizes: ["iS","iM","iL"], level: 3, req: "espresso", unlockCups: 215, shop: 3, price: 17, cost: 4, needs: ["iceMachine"], uses: [["tonic", 1], ["lemon", 1]], steps: ["ice","tonic","grind","dose","tamp","extract","garnish"],
      card: "Buz + tonik, espresso yavaşça üstüne dökülür ki katman kalsın; limon dilimiyle." },
    frappuccino:{ name: "Karamel frappé", sizes: ["iS","iM","iL"], level: 3, req: "macchiato", unlockCups: 240, shop: 4, price: 21, cost: 5, needs: ["blender","iceMachine","syrupPump","creamSiphon"], milkUse: true, milkL: 0.15, pump: "caramel", drizzle: "caramel", uses: [["caramel", "pump"], ["caramel", 1], ["cream", 1]], steps: ["ice","coldmilk","pump","grind","dose","tamp","extract","blend","cream","drizzle"],
      card: "Buz, süt, karamel şurubu ve espresso blenderda pürüzsüz olana kadar çekilir; krem şanti ve karamel ızgarası." },
    mochafrappe:{ name: "Mocha frappé", sizes: ["iS","iM","iL"], level: 3, req: "macchiato", unlockCups: 255, shop: 4, price: 21, cost: 5, needs: ["blender","iceMachine","syrupPump","creamSiphon"], milkUse: true, milkL: 0.15, pump: "choco", drizzle: "choco", uses: [["choco", "pump"], ["choco", 1], ["cream", 1]], steps: ["ice","coldmilk","pump","grind","dose","tamp","extract","blend","cream","drizzle"],
      card: "Çikolata sosu, buz, süt ve espresso blenderda; üstüne krem şanti ve çikolata." },
    greekfrappe:{ name: "Yunan frappé", sizes: ["iS","iM","iL"], level: 2, req: "espresso", unlockCups: 270, shop: 4, price: 14, cost: 2, needs: ["shaker","iceMachine"], noBean: true, uses: [["instant", 1], ["sugar", 1]], steps: ["shakeit","ice","coldwater"],
      card: "Hazır kahve, şeker ve biraz su shaker'da sertçe çalkalanır; köpük buzlu bardağa, üstüne soğuk su." },
    coldbrew:   { name: "Cold brew", sizes: ["iS","iM","iL"], level: 2, req: "filter", unlockCups: 290, shop: 4, price: 16, cost: 3, needs: ["coldBrewJar","iceMachine"], noBean: true, uses: [["coldbrew", "cb"]], steps: ["ice","coldpour"],
      card: "Kaba çekilmiş kahve soğuk suda 12–18 saat demlenir. Önceden demlenen cold brew buzun üstüne dökülür." },
    vietnam:    { name: "Vietnam kahvesi", sizes: ["iS","iM"], level: 2, req: "filter", unlockCups: 310, shop: 4, price: 16, cost: 3, needs: ["phin","iceMachine","syrupPump"], pump: "condensed", uses: [["condensed", "pump"]], brewer: "phin", steps: ["pump","fdose","phin","ice"],
      card: "Cà phê sữa đá: bardağa yoğunlaştırılmış süt, üstüne phin filtreden damla damla kahve, sonra buz." },
    icedmocha:  { name: "Buzlu mocha", sizes: ["iS","iM","iL"], level: 3, req: "macchiato", unlockCups: 330, shop: 4, price: 19, cost: 5, needs: ["iceMachine","syrupPump","creamSiphon"], milkUse: true, milkL: 0.15, pump: "choco", uses: [["choco", "pump"], ["cream", 1]], steps: ["pump","ice","coldmilk","grind","dose","tamp","extract","cream"],
      card: "Çikolata sosu, buz, soğuk süt ve espresso; üstüne krem şanti." },
    chemex:     { name: "Chemex kahve", sizes: ["S","M","L"], level: 2, req: "filter", unlockCups: 350, shop: 4, price: 15, cost: 2, needs: ["chemex","kettle"], brewer: "chemex", steps: ["fdose","bloom","pourover"],
      card: "Kalın kâğıt filtreli cam demlik; çok temiz, çay gibi berrak bir fincan." },
    siphon:     { name: "Sifon kahve", sizes: ["S","M","L"], level: 2, req: "filter", unlockCups: 380, shop: 5, price: 20, cost: 3, needs: ["siphon"], brewer: "siphon", steps: ["fdose","siphonheat","stir","siphondrop"],
      card: "Japon usulü vakumlu demleme: su ısınınca üst hazneye çıkar, kahve karıştırılır, ateş kesilince kahve süzülerek iner." },
    nitro:      { name: "Nitro cold brew", sizes: ["iS","iM","iL"], level: 2, req: "coldbrew", unlockCups: 420, shop: 5, price: 20, cost: 3, needs: ["nitroTap","coldBrewJar"], noBean: true, uses: [["coldbrew", "cb"]], steps: ["nitrotap"],
      card: "Azotla doyurulmuş cold brew musluktan, buzsuz servis edilir; Guinness gibi kremsi köpük." },
    cappuccino: { name: "Cappuccino", sizes: ["S","M","L"],   level: 3, req: "macchiato", unlockCups: 58, art: true, price: 17, cost: 4, needs: ["milkKit","cocoa"], steps: ["grind","dose","tamp","extract","milk","swirl","cocoa"], milk: "foam", milkL: 0.15,
      card: "1/3 espresso, 1/3 süt, 1/3 köpük, ~150–180 ml. Süt 60–65 °C; kalın ama ipeksi köpük. Kakao isteğe bağlıdır (İtalya'da konmaz)." },
    // ===== v0.24 yeni tarifler (barista raporu "Eksik kahve tipleri") =====
    hotchoc:    { name: "Sıcak çikolata", sizes: ["S","M","L"], level: 2, req: "macchiato", unlockCups: 46, price: 15, cost: 4, needs: ["milkKit","syrupPump"], noBean: true, pump: "choco", uses: [["choco", "pump"]], milkLiquid: "chocolate", steps: ["pump","milk","swirl"], milk: "micro", milkL: 0.22,
      card: "Kahvesiz: çikolata sosu + buharla ısıtılmış süt. Kahve içmeyenler ve çocuklar için." },
    latmac:     { name: "Latte macchiato", sizes: ["M","L"], level: 3, req: "macchiato", unlockCups: 48, price: 16, cost: 4, needs: ["milkKit"], glass: true, steps: ["milk","pour","grind","dose","tamp","extract"], milk: "foam", milkL: 0.22,
      card: "Uzun cam bardakta önce sıcak süt ve köpük, espresso en üste yavaşça dökülür: süt · espresso · köpük üç katman. 'Lekelenmiş süt.'" },
    conleche:   { name: "Café con leche", sizes: ["S","M"], level: 3, req: "macchiato", unlockCups: 52, price: 14, cost: 3, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "hot", milkL: 0.12,
      card: "İspanya: koyu espresso + eşit miktarda köpüksüz sıcak süt." },
    gibraltar:  { name: "Gibraltar", sizes: ["single","double"], level: 3, req: "cortado", unlockCups: 56, price: 15, cost: 3, needs: ["milkKit"], glass: true, art: true, steps: ["grind","dose","tamp","extract","milk","pour"], milk: "micro", milkL: 0.06,
      card: "San Francisco: 4,5 oz'luk Gibraltar bardağında cortado; double shot + eşit mikroköpük süt." },
    magic:      { name: "Magic", sizes: ["S"], level: 3, req: "flatwhite", unlockCups: 60, shop: 2, ratio: 1.5, art: true, price: 16, cost: 4, needs: ["milkKit"], steps: ["grind","dose","tamp","extract","milk","pour"], milk: "micro", milkL: 0.11,
      card: "Melbourne: double ristretto + 3/4 dolduran ince mikroköpük, 160 ml fincanda. Flat white'tan daha yoğun." },
    galao:      { name: "Galão", sizes: ["M","L"], level: 3, req: "macchiato", unlockCups: 64, shop: 2, price: 15, cost: 3, needs: ["milkKit"], glass: true, steps: ["grind","dose","tamp","extract","milk","pour"], milk: "foam", milkL: 0.24,
      card: "Portekiz: uzun cam bardakta 1/4 espresso, 3/4 köpüklü süt." },
    breve:      { name: "Breve", sizes: ["S","M"], level: 3, req: "macchiato", unlockCups: 68, shop: 2, price: 18, cost: 5, needs: ["milkKit"], uses: [["cream", 1]], steps: ["grind","dose","tamp","extract","milk","swirl"], milk: "micro", milkL: 0.1,
      card: "ABD: süt yerine yarım krema-yarım süt (half & half) köpürtülen latte; çok kremsi." },
    chai:       { name: "Chai latte", sizes: ["S","M","L"], level: 3, req: "macchiato", unlockCups: 72, shop: 2, price: 16, cost: 4, needs: ["milkKit","syrupPump"], noBean: true, pump: "chai", uses: [["chai", "pump"]], milkLiquid: "chai", steps: ["pump","milk","swirl"], milk: "micro", milkL: 0.2,
      card: "Kahvesiz: baharatlı (tarçın, kakule, zencefil, karanfil) siyah çay şurubu + köpürtülmüş süt." },
    salep:      { name: "Salep", sizes: ["S","M"], level: 2, req: "macchiato", unlockCups: 76, shop: 2, price: 15, cost: 4, needs: ["milkKit"], noBean: true, uses: [["salep", 1], ["cinnamon", 1]], milkLiquid: "salep", dust: "cinnamon", steps: ["milk","swirl","dust"], milk: "foam", milkL: 0.2,
      card: "Kahvesiz kış klasiği: salep tozu sütle karıştırılarak koyulaşana kadar ısıtılır, üstüne tarçın serpilir." },
    pumpkin:    { name: "Balkabaklı baharatlı latte", sizes: ["S","M","L"], level: 3, req: "macchiato", unlockCups: 80, shop: 2, season: [0], price: 19, cost: 5, needs: ["milkKit","syrupPump"], pump: "pumpkin", uses: [["pumpkin", "pump"], ["cinnamon", 1]], dust: "cinnamon", steps: ["pump","grind","dose","tamp","extract","milk","swirl","dust"], milk: "micro", milkL: 0.2,
      card: "Mevsimlik (sonbahar): balkabağı-baharat şurubu + espresso + süt, üstüne tarçın." },
    gingerbread:{ name: "Zencefilli kurabiye latte", sizes: ["S","M","L"], level: 3, req: "macchiato", unlockCups: 82, shop: 2, season: [1], price: 19, cost: 5, needs: ["milkKit","syrupPump"], pump: "gingerbread", uses: [["gingerbread", "pump"]], steps: ["pump","grind","dose","tamp","extract","milk","swirl"], milk: "micro", milkL: 0.2,
      card: "Mevsimlik (kış): zencefil-tarçın-esmer şeker şurubu + espresso + süt." },
    damla:      { name: "Damla sakızlı Türk kahvesi", sizes: ["tk"], level: 2, req: "turkish", unlockCups: 86, shop: 2, price: 15, cost: 3, needs: ["cezve"], sugar: true, uses: [["mastic", 1]], steps: ["tkdose","tkstir","tkfoam","tkserve"], cezve: { powder: "mastic" },
      card: "Türk kahvesine dövülmüş damla sakızı eklenir; reçineli, ferah bir koku verir. Ege ve İstanbul klasiği." },
    peppermint: { name: "Naneli mocha", sizes: ["S","M","L"], level: 3, req: "mocha", unlockCups: 88, shop: 2, season: [1], price: 20, cost: 5, needs: ["milkKit","syrupPump","creamSiphon"], pump: "peppermint", uses: [["peppermint", "pump"], ["choco", 1], ["cream", 1]], steps: ["pump","grind","dose","tamp","extract","milk","swirl","cream"], milk: "micro", milkL: 0.18,
      card: "Mevsimlik (kış): nane şurubu + çikolata + espresso + süt, üstüne krem şanti." },
    dirtychai:  { name: "Dirty chai", sizes: ["S","M","L"], level: 3, req: "chai", unlockCups: 92, shop: 2, price: 18, cost: 4, needs: ["milkKit","syrupPump"], pump: "chai", uses: [["chai", "pump"]], milkLiquid: "chai", steps: ["pump","grind","dose","tamp","extract","milk","swirl"], milk: "micro", milkL: 0.2,
      card: "Chai latte + bir shot espresso." },
    kenger:     { name: "Kenger kahvesi", sizes: ["tk"], level: 2, req: "menengic", unlockCups: 94, shop: 2, price: 14, cost: 3, needs: ["cezve"], noBean: true, sugar: true, milkUse: true, milkL: 0.1, uses: [["kenger", 1]], steps: ["mndose","tkstir","tkfoam","tkserve"], cezve: { liquid: "milk", powder: "kenger" },
      card: "Kahvesiz Anadolu içeceği: kavrulmuş kenger (çakır dikeni) tohumu ezmesi sütle cezvede pişirilir." },
    osmanli:    { name: "Osmanlı kahvesi", sizes: ["tk"], level: 2, req: "turkish", unlockCups: 104, shop: 2, price: 15, cost: 3, needs: ["cezve"], sugar: true, uses: [["cardamom", 1]], steps: ["tkdose","tkstir","tkfoam","tkserve"], cezve: { powder: "spiced" },
      card: "Türk kahvesine kakule, damla sakızı ve biraz kakao katılan, daha yumuşak ve baharatlı karışım." },
    mirra:      { name: "Mırra", sizes: ["tk"], level: 2, req: "turkish", unlockCups: 125, shop: 3, price: 18, cost: 4, needs: ["cezve"], steps: ["tkdose","tkstir","mirraboil"], cezve: { vessel: "mirra" },
      card: "Mardin–Urfa: açık kavrulmuş kahve saatlerce kaynatılıp dinlendirilerek koyulaştırılır; şekersiz, kulpsuz fincanda bir iki yudum ikram edilir." },
    kumda:      { name: "Kumda Türk kahvesi", sizes: ["tk"], level: 2, req: "turkish", unlockCups: 135, shop: 3, price: 17, cost: 3, needs: ["sandStove"], sugar: true, steps: ["tkdose","tkstir","tkfoam","tkserve"], cezve: { vessel: "sand" },
      card: "Cezve sıcak kumun içinde gezdirilir; ısı her yandan yavaş geldiği için köpük çok yoğun ve kalıcı olur." },
    spanish:    { name: "Buzlu İspanyol latte", sizes: ["iS","iM","iL"], level: 3, req: "icedlatte", unlockCups: 145, shop: 3, price: 18, cost: 5, needs: ["iceMachine","syrupPump"], milkUse: true, milkL: 0.15, pump: "condensed", uses: [["condensed", "pump"]], steps: ["pump","ice","coldmilk","grind","dose","tamp","extract"],
      card: "Yoğunlaştırılmış süt + buz + soğuk süt, en üste double shot. Tatlı ve katmanlı." },
    einspanner: { name: "Einspänner", sizes: ["S"], level: 3, req: "conpanna", unlockCups: 155, shop: 3, glass: true, price: 17, cost: 4, needs: ["creamSiphon"], uses: [["cream", 1]], steps: ["grind","dose","tamp","extract","cream"],
      card: "Viyana: cam bardakta double espresso, üstü kalın bir kat krem şanti; karıştırmadan, kremanın içinden içilir." },
    cortadito:  { name: "Cortadito", sizes: ["single","double"], level: 3, req: "cubano", unlockCups: 165, shop: 3, price: 15, cost: 3, needs: ["whisk","milkKit"], uses: [["sugar", 2]], whiskBowl: "cubano", steps: ["grind","dose","tamp","extract","whisk","milk","pour"], milk: "hot", milkL: 0.06,
      card: "Küba: şekerle çırpılmış espresso (café cubano) + eşit miktarda sıcak süt." },
    bicerin:    { name: "Bicerin", sizes: ["S"], level: 3, req: "mocha", unlockCups: 172, shop: 3, glass: true, price: 19, cost: 5, needs: ["syrupPump","creamSiphon"], pump: "choco", uses: [["choco", "pump"], ["cream", 1]], steps: ["pump","grind","dose","tamp","extract","cream"],
      card: "Torino: küçük cam bardakta sıcak çikolata, espresso ve krema üç katman halinde; karıştırılmaz." },
    freddoesp:  { name: "Freddo espresso", sizes: ["iS","iM"], level: 3, req: "espresso", unlockCups: 178, shop: 3, price: 15, cost: 3, needs: ["shaker","iceMachine"], uses: [["sugar", 1]], steps: ["grind","dose","tamp","extract","shakeit","ice"],
      card: "Yunanistan / Ege: double espresso (isteğe şekerle) buzla shaker'da çalkalanır, köpüklü haliyle taze buzun üstüne süzülür." },
    freddocap:  { name: "Freddo cappuccino", sizes: ["iS","iM"], level: 3, req: "freddoesp", unlockCups: 186, shop: 3, price: 17, cost: 4, needs: ["shaker","iceMachine","frother"], milkUse: true, milkL: 0.1, uses: [["sugar", 1]], steps: ["grind","dose","tamp","extract","shakeit","ice","coldfoam"],
      card: "Freddo espresso + üstüne soğuk süt köpüğü (afrogala). Türkiye'de yazın en çok istenenlerden." },
    shakerato:  { name: "Caffè shakerato", sizes: ["single","double"], level: 3, req: "espresso", unlockCups: 196, shop: 3, glass: true, price: 15, cost: 3, needs: ["shaker","iceMachine"], uses: [["sugar", 1]], steps: ["grind","dose","tamp","extract","ice","shakeit"],
      card: "İtalya: espresso + şeker + buz shaker'da çalkalanır, buzsuz olarak kokteyl bardağına süzülür; köpüklü üst." },
    mazagran:   { name: "Mazagran", sizes: ["iS","iM"], level: 3, req: "icedamericano", unlockCups: 210, shop: 3, price: 15, cost: 3, needs: ["iceMachine"], uses: [["lemon", 1], ["sugar", 1]], steps: ["ice","coldwater","grind","dose","tamp","extract","garnish"],
      card: "Portekiz / Cezayir: buzlu, limonlu, hafif şekerli soğuk kahve; yazın serinletici." },
    kopi:       { name: "Kopi tubruk", sizes: ["S"], level: 2, req: "turkish", unlockCups: 222, shop: 3, sugar: true, price: 12, cost: 2, needs: ["kettle"], steps: ["steepcup","stir"],
      card: "Endonezya: iri çekilmiş kahve ve şeker doğrudan bardağa, üstüne kaynar su; telve dibe çökünce içilir." },
    flashbrew:  { name: "Japon usulü buzlu filtre", sizes: ["iS","iM"], level: 2, req: "filter", unlockCups: 232, shop: 3, price: 16, cost: 3, needs: ["v60","kettle","iceMachine"], steps: ["ice","fdose","bloom","pourover"],
      card: "Flash brew: V60'ta sıcak demleme doğrudan buzun üstüne; suyun bir kısmı buz olarak hesaplanır, aroma kilitlenir." },
    irish:      { name: "Irish kremalı kahve (alkolsüz)", sizes: ["S","M"], level: 3, req: "filter", unlockCups: 246, shop: 4, glass: true, price: 20, cost: 5, needs: ["v60","kettle","syrupPump","creamSiphon"], pump: "irish", uses: [["irish", "pump"], ["cream", 1]], steps: ["pump","fdose","bloom","pourover","cream"],
      card: "Irish coffee'nin alkolsüz hali: sıcak filtre kahve + Irish cream aromalı şurup + üstüne yüzen hafif krema." },
    cafezinho:  { name: "Cafezinho", sizes: ["tk"], level: 2, req: "filter", unlockCups: 262, shop: 4, price: 12, cost: 2, needs: ["clothFilter"], uses: [["sugar", 2]], brewer: "cloth", steps: ["fdose","cloth"],
      card: "Brezilya: şekerli su kaynatılır, kahve eklenir ve bez filtreden (coador) küçük fincana süzülür; misafire ikram." },
    olla:       { name: "Café de olla", sizes: ["S"], level: 2, req: "turkish", unlockCups: 268, shop: 4, price: 15, cost: 3, needs: ["clayPot"], uses: [["cinnamon", 1]], steps: ["tkdose","tkstir","tkfoam"], cezve: { vessel: "clay", powder: "spiced" },
      card: "Meksika: toprak kapta (olla) kahve, tarçın çubuğu ve piloncillo (esmer şeker) ile kaynatılıp süzülür." },
    qahwa:      { name: "Arap kahvesi (qahwa)", sizes: ["tk"], level: 2, req: "turkish", unlockCups: 276, shop: 4, price: 16, cost: 3, needs: ["dallah"], uses: [["cardamom", 1]], steps: ["tkdose","tkfoam"], cezve: { vessel: "dallah", powder: "spiced" },
      card: "Körfez: çok açık kavrulmuş kahve kakuleyle dallahta kaynatılır, kulpsuz finjana az az dökülür; hurmayla ikram edilir." },
    indianf:    { name: "Güney Hint filtre kahvesi", sizes: ["S"], level: 3, req: "filter", unlockCups: 286, shop: 4, price: 15, cost: 3, needs: ["indianFilter","milkKit"], brewer: "indian", milkUse: true, steps: ["fdose","pourover","milk","tumbler"], milk: "hot", milkL: 0.1,
      card: "Metal filtrede hindibalı kahve yavaşça damlar (decoction); sıcak sütle karıştırılıp dabara-tumbler arasında dökülerek köpürtülür." },
    coldfoamcb: { name: "Soğuk köpüklü cold brew", sizes: ["iS","iM","iL"], level: 3, req: "coldbrew", unlockCups: 300, shop: 4, price: 18, cost: 4, needs: ["coldBrewJar","iceMachine","frother"], noBean: true, milkUse: true, milkL: 0.08, uses: [["coldbrew", "cb"]], steps: ["ice","coldpour","coldfoam"],
      card: "Cold brew + üstte yavaşça süzülen soğuk süt köpüğü (cold foam)." },
    eggcoffee:  { name: "Yumurtalı Vietnam kahvesi", sizes: ["S"], level: 3, req: "vietnam", unlockCups: 320, shop: 4, price: 18, cost: 4, needs: ["phin","whisk","syrupPump"], pump: "condensed", uses: [["egg", 1], ["condensed", "pump"]], brewer: "phin", whiskBowl: "egg", steps: ["fdose","phin","whisk","spoontop"],
      card: "Hanoi (cà phê trứng): yumurta sarısı ve yoğunlaştırılmış süt kremsi olana kadar çırpılır, phin kahvesinin üstüne kaşıkla konur." },
    colddrip:   { name: "Kyoto soğuk damla", sizes: ["iS","iM"], level: 2, req: "coldbrew", unlockCups: 340, shop: 4, price: 20, cost: 4, needs: ["coldDripTower","iceMachine"], steps: ["colddrip","ice"],
      card: "Soğuk su, kulede kahve yatağının üstüne saniyede bir damla düşer (8–12 saat); berrak, şarap gibi bir soğuk kahve." },
    kalitaw:    { name: "Kalita Wave filtre", sizes: ["S","M","L"], level: 2, req: "filter", unlockCups: 365, shop: 4, price: 15, cost: 2, needs: ["kalita","kettle"], brewer: "kalita", steps: ["fdose","bloom","pourover"],
      card: "Düz tabanlı, üç delikli dripper: su daha dengeli geçer, V60'tan daha affedici ve tatlı bir fincan." }
  },

  // §4 – Mini oyunlar (MVP: 5 adet). Aralıklar: Çırak rütbesinde geniş, yükseldikçe daralır.
  minigames: {
    grind:   { name: "Öğütme",       hint: "Siyah ibre hızla gidip geliyor: koyu yeşilde ÖĞÜT'e bas." },
    dose:    { name: "Dozlama",      hint: "Basılı tut, kahve dolsun; ibre 18 g'da (koyu yeşil) iken bırak." },
    tamp:    { name: "Temperleme",      hint: "Daire büyüyüp küçülüyor: kenarı koyu yeşil halkadayken dokun." },
    extract: { name: "Ekstraksiyon", hint: "BAŞLAT'a bas; terazide hedef gram ve 25–30 sn gelince DURDUR." },
    milk:    { name: "Süt köpürtme", hint: "Basılı tut, süt ısınır; ibre koyu yeşildeyken bırak (60–65 °C)." },
    water:   { name: "Sıcak su",     hint: "Basılı tut, makinenin sıcak su musluğundan su ver; seviye koyu yeşildeyken bırak." },
    pressure:{ name: "Basınç",       hint: "Kadran ibresi dönüyor: renkli yayın ortasındayken VİDAYI KAPAT." },
    cocoa:   { name: "Kakao çalkala", hint: "Serpiciyi fincanın üstünde sağa-sola kaydırarak çalkala; her çalkalamada kakao yağar." },
    stir:    { name: "Karıştır",     hint: "Kaşıkla fincanın içinde daire çizerek 3 tur karıştır." },
    swirl:   { name: "Sürahiyi çevir", hint: "Sürahiyi daire çizerek 3 tur çevir; süt ile köpük birleşsin." },
    tkdose:  { name: "Kahve ölç",    hint: "Basılı tut, cezveye kahve koy; 7 g'da (koyu yeşil) bırak." },
    tkstir:  { name: "Cezvede karıştır", hint: "Kaşıkla cezvenin içinde daire çizerek 3 tur karıştır." },
    tkfoam:  { name: "Köpüğü al",    hint: "Köpük kabarıyor: taşmadan, koyu yeşildeyken OCAKTAN AL." },
    fpdose:  { name: "Kaba kahve",   hint: "Basılı tut, kaba çekilmiş kahveyi koy; koyu yeşilde bırak." },
    fpwater: { name: "Sıcak su",     hint: "Basılı tut, suyu dök; seviye koyu yeşildeyken bırak." },
    fpsteep: { name: "Demle",        hint: "BAŞLAT'a bas; süre ibresi 4 dakikada (koyu yeşil) DURDUR." },
    fpplunge:{ name: "Pistonu bastır", hint: "Basılı tut, pistonu yavaşça sonuna kadar indir." },
    fdose:   { name: "Filtreye kahve", hint: "Basılı tut, kahveyi filtreye koy; koyu yeşilde bırak." },
    bloom:   { name: "Ön ıslatma",   hint: "Basılı tut, kahveyi az suyla ıslat (bloom)." },
    pourover:{ name: "Dairesel dök", hint: "Kettle'la merkezden dışa daire çizerek dök." },
    pump:    { name: "Pompala",      hint: "POMPALA'ya istenen pompa sayısı kadar bas." },
    drizzle: { name: "Sos ızgarası", hint: "Üstüne daire çizerek sos gezdir." },
    cream:   { name: "Krem şanti",   hint: "Sifonla daire çizerek krema sık." },
    scoop:   { name: "Dondurma topu", hint: "Basılı tut, kepçeyle top al." },
    pourshot:{ name: "Espressoyu dök", hint: "Basılı tut, sıcak espressoyu dondurmanın üstüne dök." },
    garnish: { name: "Limon",        hint: "LİMON'a dokun, kabuğu bardağın kenarına sür." },
    ice:     { name: "Buz koy",      hint: "BUZ'a basarak bardağa buz koy." },
    coldwater:{ name: "Soğuk su",    hint: "Basılı tut, bardağa soğuk su dök." },
    coldmilk:{ name: "Soğuk süt",    hint: "Basılı tut, buzun üstüne soğuk süt dök." },
    whisk:   { name: "Çırp",         hint: "Kasede daire çizerek köpük olana kadar çırp." },
    spoontop:{ name: "Köpüğü koy",   hint: "Basılı tut, köpüğü kaşıkla sütün üstüne koy." },
    tonic:   { name: "Tonik dök",    hint: "Basılı tut, toniği buzun üstüne yavaşça dök." },
    blend:   { name: "Blender",      hint: "ÇALIŞTIR'a bas; doku göstergesi koyu yeşildeyken DURDUR." },
    shakeit: { name: "Çalkala",      hint: "Shaker'ı sağa-sola kaydırarak sertçe çalkala." },
    coldpour:{ name: "Cold brew dök", hint: "Basılı tut, cold brew'u buzun üstüne dök." },
    mokafill:{ name: "Su doldur",    hint: "Basılı tut, alt hazneye vanaya kadar su doldur." },
    mokaheat:{ name: "Ocakta demle", hint: "OCAĞA KOY; kahve fokurdamaya başlayınca, püskürmeden OCAKTAN AL." },
    apsteep: { name: "Demle",        hint: "BAŞLAT'a bas; 1,5 dakikada DURDUR." },
    appress: { name: "Bastır",       hint: "Basılı tut, pistonu yavaşça bastır." },
    phin:    { name: "Damlat",       hint: "BAŞLAT'a bas; phin damlaması bitince (4 dk) DURDUR." },
    siphonheat:{ name: "Isıt",       hint: "ATEŞİ AÇ; su üst hazneye çıkınca ATEŞİ KES." },
    siphondrop:{ name: "Süzülme",    hint: "Basılı tut, kahvenin alt hazneye süzülmesini bekle." },
    nitrotap:{ name: "Musluktan doldur", hint: "Basılı tut, musluğu aç; köpük çizgisinde bırak." },
    pour:    { name: "Sütü dök",     hint: "Basılı tut, sürahiden fincana süt dök; fincan dolunca biter." },
    mndose:  { name: "Ezme ölç",     hint: "Basılı tut, cezveye ezmeyi koy; koyu yeşilde bırak." },
    mirraboil:{ name: "Kaynat",       hint: "Mırrayı kaynat; koyulaşınca, taşmadan OCAKTAN AL." },
    tkserve: { name: "Servis",       hint: "SERVİS'e bas: fincan, bir bardak su ve lokum." },
    coldfoam:{ name: "Soğuk köpük",  hint: "Basılı tut, soğuk sütü köpürt ve üstüne koy." },
    colddrip:{ name: "Damla",        hint: "VANAYI AÇ; damlama koyu yeşildeyken VANAYI KAPAT." },
    tumbler: { name: "Dabara",       hint: "Sağa-sola kaydır, kahveyi tumbler ile dabara arasında dökerek köpürt." },
    cloth:   { name: "Bezden süz",   hint: "Basılı tut, kahveyi bez filtreden süz." },
    steepcup:{ name: "Sıcak su",     hint: "Basılı tut, bardaktaki kahvenin üstüne kaynar su dök." },
    dust:    { name: "Serp",         hint: "Sağa-sola kaydırarak üstüne serp." },
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
    business: { name: "İş adamı",        patience: 27, extras: { sweetener: 6, sugar: 0.4, napkin: 1.3, stirrer: 0.7, straw: 0.6 }, priceSens: 0.3, qualitySens: 0.7, tip: 2.0 },
    student:  { name: "Öğrenci",         patience: 82, extras: { sugar: 2.2, stirrer: 1.8, straw: 3, napkin: 1.2, sweetener: 0.4 }, priceSens: 1.0, qualitySens: 0.6, tip: 0.4, discount: 0.8 },
    elder:    { name: "Yaşlı teyze",     patience: 105, extras: { sweetener: 9, sugar: 0.5, napkin: 1.5, stirrer: 1.6, straw: 0.4 }, priceSens: 0.6, qualitySens: 0.7, tip: 1.0 },
    geek:     { name: "Kahve meraklısı", patience: 60, extras: { sugar: 0.1, sweetener: 0.1, stirrer: 0.2, napkin: 0.8 }, priceSens: 0.2, qualitySens: 1.0, tip: 1.6 },
    regular:  { name: "Düzenli müşteri", patience: 75, extras: {}, priceSens: 0.5, qualitySens: 0.8, tip: 1.2 }
  },

  // §6 – Çekirdekler (MVP: 2). qualityMod kaliteyi etkiler; tolMod espresso aralığını.
  // §6 çekirdekler fiyatı etkiler (mult = satış fiyatı çarpanı); unlock = dükkan yıldızı, cups = toplam satış eşiği, grindT = öğütme hedefi
  beans: {
    brazil:    { name: "Brezilya",              unlock: 1, cups: 0,   price: 100, mult: 1.00, grindT: 42, notes: "Fındık, çikolata, düşük asidite. Dükkanın ev çekirdeği.", qualityMod: 0, tolMod: 1,
      page: "Dünyanın en büyük üreticisi. Düşük rakım, doğal işleme. Bağışlayıcı bir espresso çekirdeği." },
    colombia:  { name: "Kolombiya",             unlock: 2, cups: 0,   price: 140, mult: 1.10, grindT: 55, notes: "Dengeli, karamel, hafif meyve.", qualityMod: 0, tolMod: 1,
      page: "Yıkanmış işleme, 1.200–2.000 m rakım. Temiz ve dengeli; meraklı müşteriler bunu arar." },
    ethiopia:  { name: "Etiyopya Yirgacheffe",  unlock: 2, cups: 60,  price: 170, mult: 1.20, grindT: 58, notes: "Çiçeksi, bergamot, limon. Kahvenin anavatanı.", page: "Kahvenin doğduğu topraklar; yüksek rakım, yıkanmış işleme, çay gibi hafif gövde." },
    kenya:     { name: "Kenya AA",              unlock: 2, cups: 80,  price: 180, mult: 1.25, grindT: 57, notes: "Frenk üzümü, greyfurt, canlı asidite.", page: "AA en iri çekirdek sınıfı; SL28/SL34 çeşitleri, parlak ve sulu." },
    guatemala: { name: "Guatemala Antigua",     unlock: 2, cups: 100, price: 160, mult: 1.15, grindT: 50, notes: "Kakao, baharat, tam gövde.", page: "Volkanik toprak, gölgede yetişen kahve; dumanlı, baharatlı." },
    costarica: { name: "Kosta Rika Tarrazú",    unlock: 2, cups: 120, price: 175, mult: 1.20, grindT: 54, notes: "Bal, şeftali, temiz bitiş.", page: "Bal işleme ile tanınır; tatlı ve parlak." },
    honduras:  { name: "Honduras",              unlock: 2, cups: 140, price: 150, mult: 1.10, grindT: 48, notes: "Karamel, elma, yumuşak.", page: "Orta Amerika'nın en büyük üreticisi; dengeli ve tatlı." },
    sumatra:   { name: "Sumatra Mandheling",    unlock: 3, cups: 170, price: 185, mult: 1.25, grindT: 44, notes: "Toprak, sedir, yoğun gövde.", page: "Islak kabuk soyma (giling basah) işleme; ağır ve otsu." },
    peru:      { name: "Peru",                  unlock: 3, cups: 200, price: 165, mult: 1.15, grindT: 50, notes: "Fındık, sütlü çikolata.", page: "And Dağları'nda organik küçük çiftlikler." },
    yemen:     { name: "Yemen Mocha",           unlock: 3, cups: 240, price: 260, mult: 1.45, grindT: 46, notes: "Kuru meyve, şarap, baharat.", page: "Mocha limanından adını alan tarihi kahve; doğal işleme, nadir." },
    jamaica:   { name: "Jamaika Blue Mountain", unlock: 3, cups: 280, price: 380, mult: 1.70, grindT: 52, notes: "Çok yumuşak, dengeli, acısız.", page: "Dünyanın en pahalı kahvelerinden; Blue Mountain sıradağları." },
    decaf:     { name: "Kafeinsiz Kolombiya",   unlock: 2, cups: 50,  price: 170, mult: 1.15, grindT: 53, notes: "Karamel, fındık; kafeinsiz.", page: "Swiss Water yöntemiyle, kimyasal kullanmadan kafeini alınmış; akşam ve hamile müşterilerin tercihi." },
    geisha:    { name: "Panama Geisha",         unlock: 3, cups: 330, price: 450, mult: 1.90, grindT: 60, notes: "Yasemin, şeftali, bal.", page: "Rekor fiyatlarla satılan efsanevi çeşit; çiçeksi ve zarif." }
  },
  // §6 süt türleri: rep = açılış itibarı, extra = siparişe ek ücret (₺), with = siparişte söyleniş
  milks: {
    cow:     { name: "İnek sütü",     short: "İnek",      with: "inek sütüyle",     price: 15, rep: 0,   extra: 0 },
    lactose: { name: "Laktozsuz süt", short: "Laktozsuz", with: "laktozsuz sütle",  price: 22, rep: 40,  extra: 2 },
    oat:     { name: "Yulaf sütü",    short: "Yulaf",     with: "yulaf sütüyle",    price: 28, rep: 80,  extra: 3 },
    soy:     { name: "Soya sütü",     short: "Soya",      with: "soya sütüyle",     price: 25, rep: 120, extra: 3 },
    almond:  { name: "Badem sütü",    short: "Badem",     with: "badem sütüyle",    price: 32, rep: 180, extra: 4 }
  },
  houseBeanShare: 0.4, cowShare: 0.6,
  // §3 özel malzemeler (şurup, sos, krema, dondurma…; şeker küçük malzemelerden harcanır): unit = birim, pack = paket adedi; tool = görünmesi için gereken alet (yoksa tarif açılınca)
  specials: {
    vanilla:   { name: "Vanilya şurubu",         unit: "pompa",   pack: 50, price: 40, color: "#e9d29a", tool: "syrupPump" },
    caramel:   { name: "Karamel sosu",           unit: "pompa",   pack: 50, price: 45, color: "#c9772b", tool: "syrupPump" },
    saltcar:   { name: "Tuzlu karamel sosu",     unit: "pompa",   pack: 50, price: 55, color: "#b8642e", tool: "syrupPump" },
    choco:     { name: "Çikolata sosu",          unit: "pompa",   pack: 50, price: 50, color: "#4a2a14", tool: "syrupPump" },
    condensed: { name: "Yoğunlaştırılmış süt",   unit: "pompa",   pack: 50, price: 45, color: "#f3e3c3", tool: "syrupPump" },
    cream:     { name: "Krem şanti",             unit: "porsiyon", pack: 20, price: 35, color: "#fffaf0", tool: "creamSiphon" },
    icecream:  { name: "Vanilyalı dondurma",     unit: "top",     pack: 20, price: 60, color: "#f6ecd2", tool: "iceCreamFridge" },
    lemon:     { name: "Limon",                  unit: "dilim",   pack: 20, price: 20, color: "#f2d64b" },
    tonic:     { name: "Tonik",                  unit: "şişe",    pack: 12, price: 60, color: "#dff1f5" },
    menengic:  { name: "Menengiç ezmesi",        unit: "porsiyon", pack: 20, price: 50, color: "#7a6a3a" },
    instant:   { name: "Hazır kahve",            unit: "kaşık",   pack: 50, price: 45, color: "#5a3418" },
    mastic:    { name: "Damla sakızı",           unit: "porsiyon", pack: 30, price: 80, color: "#f4f1e2" },
    kenger:    { name: "Kenger ezmesi",          unit: "porsiyon", pack: 20, price: 50, color: "#9a7a4a" },
    salep:     { name: "Salep tozu",             unit: "porsiyon", pack: 20, price: 90, color: "#f6efe0" },
    chai:      { name: "Chai şurubu",            unit: "pompa",   pack: 50, price: 50, color: "#b07a48", tool: "syrupPump" },
    pumpkin:   { name: "Balkabağı-baharat şurubu", unit: "pompa", pack: 50, price: 55, color: "#d0782c", tool: "syrupPump" },
    gingerbread:{ name: "Zencefilli kurabiye şurubu", unit: "pompa", pack: 50, price: 55, color: "#9a5a2a", tool: "syrupPump" },
    peppermint:{ name: "Nane şurubu",            unit: "pompa",   pack: 50, price: 50, color: "#bfe6cf", tool: "syrupPump" },
    irish:     { name: "Irish cream şurubu (alkolsüz)", unit: "pompa", pack: 50, price: 60, color: "#d9c3a0", tool: "syrupPump" },
    cinnamon:  { name: "Tarçın",                 unit: "serpme",  pack: 100, price: 25, color: "#8a5a2b" },
    cardamom:  { name: "Kakule",                 unit: "porsiyon", pack: 50, price: 60, color: "#9aa86a" },
    egg:       { name: "Yumurta",                unit: "adet",    pack: 30, price: 45, color: "#f3c64b" },
    coldbrew:  { name: "Cold brew",              unit: "bardak",  pack: 10, price: 0, color: "#3a2010", tool: "coldBrewJar", brew: true }
  },
  // §3 Türk kahvesi şeker derecesi (n = harcanan şeker adedi)
  sugarLevels: { sade: { label: "Sade", say: "sade", n: 0 }, az: { label: "Az şekerli", say: "az şekerli", n: 1 }, orta: { label: "Orta şekerli", say: "orta şekerli", n: 2 }, sekerli: { label: "Şekerli", say: "şekerli", n: 3 } },
  stockOutLines: ["{X} bile yok mu?!", "Nasıl {x} yok?!", "{X} yoksa ben de yokum!", "Bu dükkanda {x} bile yok!"],


  // §8 – Ekipman + otomasyon (prototip). stars = gereken dükkan seviyesi; auto = otomatik yaptığı adımlar (sabit 85 puan).
  equipment: {
    // hassasiyet: renkli hedef bölgeleri ×1,5 (widen); otomasyon için önce bunlar gerekir (requires)
    grindPrecise:  { name: "Mikro ayarlı öğütücü",       price: 150,  stars: 1, widen: "grind",   effect: "Öğütme hedef bölgeleri ×1,5 geniş" },
    precScale:     { name: "Hassas terazi",              price: 160,  stars: 1, widen: "dose",    effect: "Dozlama hedef bölgeleri ×1,5 geniş" },
    scaleTamp:     { name: "Tartılı temper",             price: 180,  stars: 1, widen: "tamp",    effect: "Temperleme hedef bölgeleri ×1,5 geniş" },
    pidGauge:      { name: "Sıcaklık kontrolcüsü (PID)",    price: 220,  stars: 1, widen: "extract", effect: "Ekstraksiyon hedef bölgeleri ×1,5 geniş" },
    thermoPitcher: { name: "Termometreli sürahi",        price: 140,  stars: 1, widen: "milk",    effect: "Süt hedef bölgeleri ×1,5 geniş" },
    steamWand:     { name: "Buhar çubuğu yükseltmesi",   price: 300,  stars: 1, effect: "Süt köpürtme hızlanır" },
    pourPitcher:   { name: "Profesyonel döküm sürahisi", price: 260,  stars: 3, widen: "art",     effect: "Latte art hedef bölgeleri ×1,5 geniş" },
    // otomasyon (sabit 85 puan)
    autoGrind:   { name: "Otomatik öğütücü",          price: 350,  stars: 1, auto: ["grind"], requires: ["grindPrecise"], effect: "Öğütme otomatik (85 puan)" },
    scaleGrind:  { name: "Tartılı öğütücü",           price: 400,  stars: 1, auto: ["dose"],  requires: ["precScale"], effect: "Dozlama otomatik (85 puan)" },
    autoTamp:    { name: "Otomatik temper",           price: 450,  stars: 2, auto: ["tamp"],  requires: ["scaleTamp"], effect: "Temperleme otomatik (85 puan)" },
    dualGroup:   { name: "Çift gruplu makine",        price: 700,  stars: 2, effect: "2 paralel sipariş" },
    fridge:      { name: "Süt buzdolabı",             price: 400,  stars: 1, effect: "Süt 3 gün dayanır (her dükkanda baştan var)" },
    superAuto:   { name: "Süper otomatik espresso makinesi", price: 2500, stars: 3, auto: ["grind","dose","tamp","extract"], requires: ["pidGauge","autoGrind","scaleGrind","autoTamp"], effect: "Espressonun tüm adımları tek tuş (85 puan)" },
    autoMilk:    { name: "Otomatik süt köpürtücü",    price: 900,  stars: 3, auto: ["milk"],  requires: ["thermoPitcher"], effect: "Süt adımı otomatik (85 puan)" },
    tkMachine:   { name: "Türk kahvesi makinesi",     price: 350,  stars: 1, auto: ["tkstir","tkfoam"], effect: "Türk kahvesinde karıştırma ve köpük otomatik (85 puan)" },
    filterMachine: { name: "Filtre kahve makinesi",   price: 400,  stars: 2, auto: ["bloom","pourover"], effect: "Filtre kahvede ön ıslatma ve dökme otomatik (85 puan)" }
  },
  // §4 renkli hedef çubuğu: bölge yarı genişlikleri (çubuğun %'si) ve puanları
  zones: { time: { perfect: 0.0267, good: 0.0667, ok: 0.133 } /* §4 eşit zorluk: sn; yarı genişlik % = ibre hızı × süre */, minPerfect: 0.3, widen: 1.5, score: { perfect: 100, good: 88, ok: 72 } },

  // §3 – Tarife özel aletler ve makineler (Dükkan › Aletler & Makineler). step: getirdiği mini oyun (espressodan sonra)
  tools: {
    kettle:  { name: "Su ısıtıcısı (kettle)",                    price: 80,  stars: 1, step: "pourover", effect: "Filtre, French press ve AeroPress için 93 °C su" },
    milkKit: { name: "Süt köpürtme seti (sürahi + buhar çubuğu)", price: 180, stars: 1, step: "milk",     effect: "Sütlü tüm tarifler için süt köpürtme" },
    cocoa:   { name: "Kakao serpici",                            price: 120, stars: 1, step: "cocoa",    effect: "Cappuccino'nun üstüne kakao" },
    cezve:   { name: "Bakır cezve",                              price: 90,  stars: 1, step: "tkfoam",   effect: "Türk kahvesi için cezve ve ocak" },
    frenchPress: { name: "French press",                         price: 120, stars: 1, step: "fpsteep",  effect: "French press kahve için demlik" },
    v60:     { name: "V60 demleme seti",                         price: 110, stars: 1, step: "pourover", effect: "Filtre kahve için dripper, kâğıt filtre ve sürahi" },
    syrupPump:   { name: "Şurup pompası seti",       price: 150, stars: 1, step: "pump",      effect: "Şurup ve sosları ölçülü pompalar" },
    creamSiphon: { name: "Krema sifonu",             price: 180, stars: 1, step: "cream",     effect: "Taze krem şanti sıkar" },
    iceCreamFridge: { name: "Dondurma dolabı",       price: 400, stars: 2, step: "scoop",     effect: "Affogato için vanilyalı dondurma" },
    iceMachine:  { name: "Buz makinesi",             price: 500, stars: 3, step: "ice",       effect: "Soğuk kahveler için sınırsız buz" },
    mokaPot:     { name: "Moka pot",                 price: 90,  stars: 3, step: "mokaheat",  effect: "Ocak üstü İtalyan kahve demliği" },
    aeropress:   { name: "AeroPress",                price: 110, stars: 3, step: "appress",   effect: "Pistonlu basınçlı demleme" },
    whisk:       { name: "El çırpıcı ve kase",       price: 60,  stars: 3, step: "whisk",     effect: "Espuma ve dalgona köpüğü" },
    blender:     { name: "Profesyonel blender",      price: 450, stars: 4, step: "blend",     effect: "Frappé için buz kırar, pürüzsüz çeker" },
    shaker:      { name: "Kokteyl shaker",           price: 80,  stars: 3, step: "shakeit",   effect: "Freddo, shakerato ve Yunan frappé için çalkalama" },
    coldBrewJar: { name: "Cold brew kavanozu",       price: 150, stars: 4, step: "coldpour",  effect: "Gece boyu soğuk demleme (Tedarik'ten demlenir)" },
    phin:        { name: "Vietnam phin filtresi",    price: 70,  stars: 4, step: "phin",      effect: "Damla damla Vietnam kahvesi" },
    chemex:      { name: "Chemex demlik",            price: 130, stars: 4, step: "pourover",  effect: "Kalın filtreli cam demlik" },
    siphon:      { name: "Sifon (vakum) demlik",     price: 600, stars: 5, step: "siphonheat", effect: "Japon usulü vakumlu demleme" },
    frother:     { name: "El köpürtücü (soğuk köpük)", price: 120, stars: 3, step: "coldfoam", effect: "Freddo cappuccino ve cold foam için soğuk süt köpüğü" },
    sandStove:   { name: "Kum ocağı",                price: 350, stars: 3, step: "tkfoam",    effect: "Cezveyi sıcak kumda pişirme" },
    dallah:      { name: "Dallah (Arap cezvesi)",    price: 220, stars: 4, step: "tkfoam",    effect: "Arap kahvesi için pirinç dallah" },
    clayPot:     { name: "Toprak olla",              price: 90,  stars: 4, step: "tkfoam",    effect: "Café de olla için toprak kap" },
    clothFilter: { name: "Bez filtre (coador)",      price: 40,  stars: 4, step: "cloth",     effect: "Cafezinho için bez süzgeç" },
    indianFilter:{ name: "Hint filtresi + dabara",   price: 110, stars: 4, step: "tumbler",   effect: "Güney Hint filtre kahvesi seti" },
    kalita:      { name: "Kalita Wave",              price: 140, stars: 4, step: "pourover",  effect: "Düz tabanlı dripper" },
    coldDripTower:{ name: "Kyoto damla kulesi",      price: 900, stars: 4, step: "colddrip",  effect: "Saatlerce damla damla soğuk demleme" },
    nitroTap:    { name: "Nitro musluğu",            price: 1500, stars: 5, step: "nitrotap", effect: "Azotlu cold brew musluğu" }
  },
  // §7/§8 – Boyutlar ve bardaklar
  sizes: {
    single: { label: "Tek",   say: "",          cup: "espS", bean: 0.5, milk: 1, price: 1,    dose: 9 },    // v0.24: tek shot 9 g → ~18 g
    double: { label: "Double", say: "double",   cup: "espD", bean: 1, milk: 1,   price: 1.8,  dose: 18 },   // double 18 g → ~36 g
    tk:     { label: "Fincan", say: "",          cup: "tkCup", bean: 0.4, milk: 0, price: 1,  dose: 7 },
    iS:     { label: "Küçük", say: "küçük boy", cup: "iceS", bean: 1, milk: 1,   price: 1,    dose: 18 },
    iM:     { label: "Orta",  say: "orta boy",  cup: "iceM", bean: 1, milk: 1.5, price: 1.25, dose: 18 },
    iL:     { label: "Büyük", say: "büyük boy", cup: "iceL", bean: 1, milk: 2,   price: 1.6,  dose: 18 },
    affo1:  { label: "Tek top", say: "tek toplu", cup: "affoBowl", bean: 0.5, milk: 0, price: 1, dose: 18, scoops: 1 },
    affo2:  { label: "Çift top", say: "çift toplu", cup: "affoBowl", bean: 1, milk: 0, price: 1.6, dose: 18, scoops: 2 },
    S:      { label: "Küçük", say: "küçük boy", cup: "cupS", bean: 1, milk: 1,   price: 1,    dose: 18 },
    M:      { label: "Orta",  say: "orta boy",  cup: "cupM", bean: 1, milk: 1.25, price: 1.25, dose: 18 },
    L:      { label: "Büyük", say: "büyük boy", cup: "cupL", bean: 1, milk: 1.5, price: 1.6,  dose: 18 }
  },
  cups: {
    espS: { name: "Tek shot bardağı", pack: 10, price: 10 },
    espD: { name: "Double shot bardağı",          pack: 10, price: 12 },
    cupS: { name: "Küçük bardak",           pack: 10, price: 12 },
    cupM: { name: "Orta bardak",            pack: 10, price: 15 },
    cupL: { name: "Büyük bardak",           pack: 10, price: 18 },
    tkCup: { name: "Türk kahvesi fincanı",  pack: 10, price: 14 },
    iceS: { name: "Küçük soğuk bardak",     pack: 10, price: 12 },
    iceM: { name: "Orta soğuk bardak",      pack: 10, price: 15 },
    iceL: { name: "Büyük soğuk bardak",     pack: 10, price: 18 },
    affoBowl: { name: "Affogato kasesi",    pack: 10, price: 20 }
  },
  cupMin: 3, startCups: { espS: 10, espD: 5 },   // §7 yalnız ilk güne özel espresso fincanları; sonrasını oyuncu alır
  // §7 küçük malzemeler (sarf): gizli kullanım oranı (use), takeaway: yalnız karton bardakta
  extras: {
    sleeve:    { name: "Bardak tutacağı",   pack: 50,  price: 15, use: 0.90, takeaway: true, miss: "Bardak tutacağı bile yok, elim yandı!" },
    napkin:    { name: "Peçete",            pack: 100, price: 8,  use: 0.60, miss: "Peçete bile yok!" },
    sugar:     { name: "Şeker",             pack: 100, price: 10, use: 0.35, miss: "Şeker bile yok mu?" },
    stirrer:   { name: "Karıştırma çubuğu", pack: 100, price: 6,  use: 0.30, miss: "Karıştıracak çubuk bile yok!" },
    sweetener: { name: "Tatlandırıcı",      pack: 50,  price: 12, use: 0.05, miss: "Tatlandırıcı bile yok!" },
    straw:     { name: "Pipet",             pack: 50,  price: 5,  use: 0.05, miss: "Pipet bile yok!" }
  },
  extrasStart: { sleeve: 20, napkin: 60, sugar: 60, stirrer: 30, sweetener: 20, straw: 10 }, extrasLow: 10, extraTip: [1, 0.3, 0],   // v0.24: Yıldız Teyze'den kalan stok
  // §12 zorluk: Normal = belgedeki değerler
  difficulty: {
    easy:   { label: "Kolay",  desc: "Müşteriler daha sabırlı, renkli bölgeler %10 geniş, tedarik %20 ucuz (daha çok kâr), ₺3.600 ile başla.", patience: 1.3,  zone: 1.10, cost: 0.80, startMoney: 400 },
    normal: { label: "Normal", desc: "Oyunun dengelendiği zorluk.", patience: 1,    zone: 1,    cost: 1,    startMoney: 300 },
    hard:   { label: "Zor",    desc: "Müşteriler sabırsız, renkli bölgeler %15 dar, tedarik %20 pahalı (az kâr), ₺2.250 ile başla.", patience: 0.75, zone: 0.85, cost: 1.20, startMoney: 250 }
  },
  badLines: ["Bunu içemem, almıyorum!", "Bu kahve mi şimdi? Para vermem!", "Berbat olmuş, kalsın.", "Yeniden yap ya da hiç yapma!", "Böyle kahve olmaz, gidiyorum."],
  noCupLines: ["Nasıl {s} bardağınız yok?!", "{S} bardak mı bitmiş? Olacak iş değil!", "Bardak yoksa ben de yokum!", "Bu dükkanda {s} bardak bile yok mu?"],
  wrongLines: ["Ben bunu istemedim!", "Bu benim siparişim değil!", "Yanlış kahve verdin, almıyorum.", "Ben {d} istemiştim!"],
  // §7 – Sipariş cümleleri ({d} = içecek adı); genel + tipe özel, rastgele seçilir
  orderLines: {
    any: ["Bir {d} lütfen.", "Bana bir {d} güzelim.", "Sende {d} var mı?", "Bir {d} alayım.", "{d} yapar mısın?", "Canım {d} istedi.",
          "Merhaba! Bir {d} rica edebilir miyim?", "Bugün {d} günü, bir tane lütfen.", "Bir {d}, bol sevgili olsun.", "{d} alabilir miyim?"],
    business: ["Bir {d}, çabuk lütfen.", "Toplantıya geç kalıyorum, bir {d}!", "Hızlıca bir {d} alayım."],
    student:  ["Abi bir {d}, öğrenci indirimi var mı?", "Abla bir {d} lütfen, sınavım var.", "Bir {d}, hesabı bölüşemiyoruz ama."],
    elder:    ["Evladım bana bir {d} yapıver.", "Kızım, bir {d} olsun.", "Yavrum bir {d} rica edeyim."],
    geek:     ["Çekirdek ne? Bir {d} alayım.", "Bugünkü öğütümle bir {d} lütfen.", "Bir {d}, ekstraksiyonu 28 saniye olsun."],
    regular:  ["Her zamankinden, bir {d}.", "Bildiğin gibi, bir {d}.", "Yine ben! Bir {d} lütfen."],
    tourist:  ["Sende var {d}?", "Ben istemek bir {d}."]   // ileride turist müşteri tipi için (şimdilik kullanılmıyor)
  },
  // §4 – Sipariş sonu değerlendirme: ortalama puana göre etiket ve rastgele müşteri yorumu
  reviews: [
    { min: 95, label: "Mükemmel", cls: "perfect", lines: ["İçtiğim en iyi kahve!", "Mükemmel! Her gün geleceğim.", "Bu kahve bir sanat eseri!", "Vay be, tam kıvamında!", "Hayatımın kahvesi!"] },
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
    brass:      { stars: 3, name: "Pirinç tabela",          price: 700,  effect: "Bahşiş ×1,1", tip: 1.1 },
    d4sofa:     { stars: 4, name: "Deri chester takımı",    price: 900,  effect: "Bahşiş ×1,1", tip: 1.1 },
    d4shelf:    { stars: 4, name: "Duvar boyu kitaplık",    price: 700,  effect: "Müşteri sabrı ×1,1", patience: 1.1 },
    d4ficus:    { stars: 4, name: "Dev ficus ağacı",        price: 600,  effect: "Günde +2 itibar", rep: 2 },
    d4clock:    { stars: 4, name: "Antika duvar saati",     price: 400,  effect: "Müşteri sabrı ×1,05", patience: 1.05 },
    d4neon:     { stars: 4, name: "Neon logo",              price: 800,  effect: "Bahşiş ×1,08", tip: 1.08 },
    d4gallery:  { stars: 4, name: "Fotoğraf galerisi",      price: 500,  effect: "Günde +1 itibar", rep: 1 },
    d5roaster:  { stars: 5, name: "Kahve kavurma makinesi", price: 3000, effect: "Günde +3 itibar", rep: 3 },
    d5chand:    { stars: 5, name: "Kristal avize",          price: 1800, effect: "Bahşiş ×1,15", tip: 1.15 },
    d5piano:    { stars: 5, name: "Kuyruklu piyano",        price: 2500, effect: "Müşteri sabrı ×1,2", patience: 1.2 },
    d5aqua:     { stars: 5, name: "Akvaryum duvarı",        price: 1600, effect: "Müşteri sabrı ×1,1", patience: 1.1 },
    d5brass:    { stars: 5, name: "Pirinç logo tabelası",   price: 1400, effect: "Bahşiş ×1,1", tip: 1.1 },
    d5art:      { stars: 5, name: "Sanat galerisi",         price: 1500, effect: "Günde +2 itibar", rep: 2 }
  },


  // §8 – Ekonomi
  economy: { startMoney: 300, beanPerCup: 0.018 /* kg */, milkPrice: 15 /* ₺/L */, milkPerCup: 0.2 /* L */, minBeans: 0.3, minMilk: 1, milkShelfDays: 3, autoScore: 85, loanInterest: 0.10, loanDailyCut: 0.20,
    loans: [{ amount: 100, days: 5 }, { amount: 250, days: 8 }], rentLoanDays: 6, refuseBelow: 50, rentLoanStep: 50 },   // §7 ortalama < 50: müşteri almaz   // §2 kredi türleri ve vadeleri

  // §9 – Dükkan seviyeleri (MVP: 3). Prototip kalibrasyonu: günlük müşteri sayısı azaltıldı (gün kısa ve odaklı kalsın).
  shopLevels: [
    { stars: 1, name: "Köşe büfesi",        money: 0,    rep: 0,   customersPerDay: 6, rent: 150, loanLimit: 600, maxQueue: 3, interval: 21.5, custStep: 2, tierCost: [120, 220, 350] },
    { stars: 2, name: "Mahalle kahvecisi",  money: 1500, rep: 100, customersPerDay: 9, rent: 350, loanLimit: 1500, maxQueue: 5, interval: 16, custStep: 3, tierCost: [300, 550, 850] },
    { stars: 3, name: "Semt favorisi",      money: 5000, rep: 250, customersPerDay: 13, rent: 700, loanLimit: 3000, maxQueue: 7, interval: 11, custStep: 4, tierCost: [700, 1200, 1800] },
    { stars: 4, name: "Şehir kahvecisi",    money: 12000, rep: 450, customersPerDay: 16, rent: 1200, loanLimit: 6000, maxQueue: 8, interval: 9, custStep: 5, tierCost: [1200, 2000, 3000] },
    { stars: 5, name: "Kahve evi & kavurmahane", money: 30000, rep: 800, customersPerDay: 20, rent: 2000, loanLimit: 10000, maxQueue: 9, interval: 7.5, custStep: 6, tierCost: [2000, 3500, 5000] }
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
  seasons: ["Sonbahar", "Kış", "İlkbahar", "Yaz"],   // v0.24 mevsimlik tarifler: 28 günlük mevsimler, oyun sonbaharda başlar
  tutorial: {
    intro: "Hoş geldin evladım. Ben Yıldız Teyze. Bu dükkanı yıllardır işletiyorum ama artık yoruldum; bundan sonra dükkan senin. Ben sana espressoyu öğreterek başlayayım; gerisini zamanla sen halledersin. Tarif defterim de köşede duruyor.",
    milk: "Sütü köpürtürken kâğıt yırtılır gibi hafif bir ses duyarsın. O ses doğru sestir.",
    // §10 ilk kahve öğreticisi: ilk müşteri Yıldız Teyze, adım adım
    first: "Yıldız Teyze tezgâhın önünde seni bekliyor. Hazır olunca ona dokun.",
    // §10 ilk espresso: Yıldız Teyze her adımı sözlü anlatır
    espressoIntro: "<b>Önce espresso.</b> Bütün kahvelerin anası odur ve dört adımda yapılır: <b>öğüt, dozla, sıkıştır, çek</b>. Her adımda bir ibre var; ibre tam <b>koyu yeşilde</b> durduğunda basarsın. Bu iş ustalık ister evladım, sabırla öğrenilir.",
    steps: {
      grind:   "<b>1. Öğütme.</b> Çekirdeği çok kaba öğütürsen su hızlı geçer, kahve ekşi olur; çok ince öğütürsen tıkanır, acı olur. İbre gidip geliyor; tam ortadaki <b>koyu yeşile</b> gelince <b>ÖĞÜT</b>'e bas. Bu sefer ibreyi senin için orada bekleteceğim, sonra kendi gözünle yakalayacaksın.",
      dose:    "<b>2. Dozlama.</b> Çift sepete 18 gram kahve koyacağız; bugün kahvecilerin çoğu espressoyu böyle, double (doppio) verir. Düğmeyi <b>basılı tut</b>; kahve dolar, terazi artar. Sakın erken bırakma, ibre <b>koyu yeşile gelene kadar</b> basılı tut.",
      tamp:    "<b>3. Temperleme.</b> Kahveyi temper aletiyle düz ve eşit sıkıştırırız ki su her yerden aynı hızda geçsin; gevşek kalırsa su kanal açar, kahve sulu olur. Temper dairesi büyüyüp küçülüyor; siyah kenarı <b>koyu yeşil halkaya</b> gelince daireye ya da <b>BASTIR</b>'a dokun.",
      extract: "<b>4. Çekme.</b> Portafiltreyi makineye taktık. <b>BAŞLAT</b>'a bas. İlk birkaç saniye kahve ıslanır (ön ıslatma), sonra akmaya başlar. Terazide 18 gramdan <b>36 gram</b> espresso, 25–30 saniyede: ibre <b>koyu yeşile</b> gelince <b>DURDUR</b>.",
      milk:    "<b>Süt köpürtüyoruz.</b> Düğmeyi basılı tut: süt ısınır, ibre sağa ilerler. İbre koyu yeşildeyken (<b>60–65 °C</b>) bırak.",
      art:     "<b>Latte art.</b> Basılı tut ve sütü dök; ibre doluluğu gösterir, koyu yeşilde bırak. Sonra kesim ibresi gidip gelir: koyu yeşildeyken <b>KES</b>."
    },
    pressNow:   "<b>İşte şimdi!</b> İbre tam koyu yeşilde. Bas bakalım.",
    extractEarly: "Erken durdurdun evladım! Kahvenin akmasını <b>beklemelisin</b>; ibre koyu yeşile gelince durdur. Hadi, bir daha <b>BAŞLAT</b>'a bas.",
    tooEarly:   "Acele etme evladım. İbre <b>koyu yeşile</b> gelsin, öyle bas.",
    release:    "<b>Şimdi bırak!</b> İbre koyu yeşilde; tam 18 gram oldu.",
    holdRetry:  "Erken bıraktın, sepet yarım kaldı. Baştan alalım: düğmeyi <b>koyu yeşile gelene kadar</b> bırakmadan basılı tut.",
    extractRun: "Bak, kahve akıyor. Önce koyu bal rengi gelir, sonra açık karamel rengi bir krema oluşur; güzel espresso böyle akar. İbreyi izle, <b>koyu yeşile</b> gelince durduracağız.",
    stopNow:    "<b>Şimdi durdur!</b> 36 gram, 27 saniye: tam kıvamında.",


    done: "Eline sağlık evladım, mis gibi olmuş! İlk espressonu yaptın, ilk paranı da kazandın. Artık ben gideyim; dükkan sana emanet. Müşteriler gerçek, sabırları var. Takıldığında tarif defterime bak."
  }
};

// v0.24 – Ekonomi gerçek TL ölçeğine çekildi (2026 İstanbul: espresso ~₺100). Tablolar okunaklı kalsın diye
// yukarıdaki değerler eski ölçekte yazılı; burada ×9 çarpılıp okunaklı yuvarlanır. Denge oranları aynen korunur.
(function () {
  const D = window.DATA, K = 9; D.econScale = K;
  const nice = x => { if (!x) return x; const v = x * K; const st = v < 20 ? 1 : v < 200 ? 5 : v < 2000 ? 10 : v < 20000 ? 50 : 100; return Math.max(st, Math.round(v / st) * st); };
  const each = (o, keys) => Object.values(o).forEach(e => keys.forEach(k => { if (typeof e[k] === "number") e[k] = nice(e[k]); }));
  each(D.drinks, ["price", "cost"]); each(D.beans, ["price"]); each(D.milks, ["price", "extra"]); each(D.specials, ["price"]);
  each(D.cups, ["price"]); each(D.extras, ["price"]); each(D.equipment, ["price"]); each(D.tools, ["price"]); each(D.decor, ["price"]);
  each(D.difficulty, ["startMoney"]); each(D.staff, ["wage"]);
  D.shopLevels.forEach(l => { ["money", "rent", "loanLimit"].forEach(k => l[k] = nice(l[k])); l.tierCost = l.tierCost.map(nice); });
  const E = D.economy; E.startMoney = nice(E.startMoney); E.milkPrice = nice(E.milkPrice); E.loans.forEach(l => l.amount = nice(l.amount)); E.rentLoanStep = nice(E.rentLoanStep);
  D.tasks.forEach(t => { t.money = nice(t.money); if (t.kind === "earn") t.n = t.n.map(nice); });
  D.pricing.stepTL = 5;                                                            // Fiyatlar ekranında ±₺5
})();
