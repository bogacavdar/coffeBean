# CoffeBean – Güncelleme Notları

## v0.11 – 31 Ekim 2026

### Gün sonu artık adım adım ekranlarla
1. **Hesap**
2. **Kahve Gazetesi** (yalnızca hafta sonunda; borsa haberleri)
3. **Tedarik:** yalnızca çekirdek ve süt alınır. Eksik malzeme büyük kırmızı bir "EKSİK: … almalısın" uyarısıyla gösterilir. **🏦 Kredi al** düğmesi kredileri ayrı bir pencerede açar. **Devam** düğmesi eksik malzeme varken basılmaz.
4. **Dükkan** (yeni yönetim ekranı):
   - Sağ üstte **🎯 Ana hedef**: sıradaki dükkanın şartları, ilerleme ve **Seviye atla**.
   - Renkli ve ikonlu sekmeler: **Geliştirmeler** (mavi), **Aletler & Makineler** (turuncu), **Krediler** (kırmızı), **Dekorasyon** (yeşil).
   - Geliştirmeler dört gruba ayrıldı: Müşteri gelişi, Kolaylaştırıcılar ve göstergeler, Otomasyon, Kapasite ve personel.
   - O dükkanda alınamayacak şeyler hiç görünmez.
5. **Fiyatlar** ekranı, ardından **Günü başlat**.

### Tarife özel aletler ve makineler
Bazı tarifler, Aletler & Makineler sekmesinden alınan bir alet ya da makine olmadan yapılamaz ve menüye girmez. Her aletin kendine özgü bir mini oyunu var; bu adım dört espresso adımından sonra gelir.

| Alet / makine | Fiyat | Gereken tarifler | Mini oyun |
|---|---|---|---|
| Su ısıtıcısı | 80₺ | Americano | **Su dök:** kettle'la kupaya basılı tutarak dök, hedefte bırak |
| Süt köpürtme seti | 180₺ | Sütlü tüm tarifler | Süt köpürtme |
| Büyük buhar kazanı (2★) | 600₺ | Latte, Cappuccino | **Basınç:** yuvarlak kadranda dönen ibreyi renkli yayda durdur |
| Kakao serpici (2★) | 120₺ | Cappuccino | **Kakao serp:** sağa-sola giden serpiciyi fincanın ortasında durdur |

- Aldıkların dükkan büyüyünce yeni dükkana taşınır.
- Eski kayıtlarda zaten açtığın tariflerin aletleri hediye olarak verilir.

### Fiyatlar ve borsa
- **Varsayılan fiyat** her tarif için malzeme maliyetinden ve kiradan hesaplanır: (çekirdek + süt + fincan maliyeti) × 2 + fincan başına kira payı. Böylece her ürün kâr eder ve kira rahat ödenir.
- Fiyatı %5'lik adımlarla %50 ile %200 arasında ayarlayabilir, tek tuşla varsayılana dönebilirsin. Oyun içindeki yeni **Fiyatlar** ikonuyla gün ortasında da değiştirebilirsin; değişiklik sıradaki ve sonradan gelen müşteriler için geçerli olur.
- **Müşteri tepkisi:**
  - Fiyat makul fiyatın %10 içindeyse kimse yorum yapmaz.
  - %10–%50 arası pahalıysa "çok pahalı" deyip gidenler giderek artar; %50 ve üstünde herkes gider.
  - Ucuz tarafta da "ucuz" diyenler giderek artar, ama onlar yine de satın alır.
- **Kahve borsası:** her tarifin bir borsa endeksi var. Her hafta sonu endeksler biraz değişir ve **Kahve Gazetesi** en çok değişen 3 tarifi haber yapar. Müşteriler fiyatı makul bulup bulmamaya bu endekse göre karar verir.

### Müşteriler
- Yalnızca sıranın en önündeki müşteri konuşur ("Bir latte alabilir miyim?") ve yalnızca onun siparişi alınabilir.
- Fiyata tepkisini sipariş alındığı anda verir: "Çok pahalı! Almıyorum." deyip çıkar ya da "Ne kadar ucuz!" deyip satın alır. Arkadakiler sıra kendilerine gelene kadar tepki vermez.
- Gün sonu hesabında "pahalı bulup giden" müşteri sayısı yazar.

### Süreç
- Bu paket test edilmeden yayınlandı (Kural 7: testi kullanıcı yapar).


## v0.10 – 31 Ekim 2026

### Yeni
- **CoffeBean adı ve yeni giriş ekranı:** sıcak kahverengi arka plan, süzülen kahve çekirdekleri, buharı tüten fincan ve çekirdek logosu. Sürüm numarası logonun altında yazar.
- **Ana menü müziği:** oyundan ayrı, daha yavaş ve dinlendirici bir piyano parçası. Ekrana ilk dokunuşta başlar; oyuna girince oyun müziğine, ana menüye dönünce yeniden menü müziğine geçer.
- **Ana menüde Ayarlar:** müzik ve efekt sesi, tüm sesleri kapatma, kayıtları dışa/içe aktarma ve grafik ayarları burada.
- **3 kayıt yuvası:**
  - Yeni oyun ve Yükle önce yuva seçtirir; dolu yuvaya yazacaksan uyarı çıkar.
  - Her yuvanın yanında onaylı bir Sil düğmesi var.
  - Oyun, oynadığın yuvaya kendiliğinden kaydedilir.
  - Önceki sürümlerdeki kaydın 1. yuvaya taşınır.
- **Oyun içi Menü ikonu:** istediğin yuvaya kaydedebilir ya da ana menüye dönebilirsin. Gün sürerken dönersen o günün kalan müşterileri iptal olur, kazandıkların kalır ve aynı günü yeniden açarsın.
- **Barista sensin:** tezgâhın arkasında sarı saçlı, atkuyruklu, önlüklü bir kız var; sipariş hazırlarken hareketlenir.
- **Tek sıra:** müşteriler tezgâhın önünde tek, düz bir sıra halinde bekler.
- **Müşteri trafiği:** her dükkan tipinin üç değeri var:

  | Dükkan | Sıradaki en fazla kişi | Günde en fazla müşteri | Gelme sıklığı |
  |---|---|---|---|
  | 1★ Köşe büfesi | 3 | 6 | ~13 sn'de bir |
  | 2★ Mahalle kahvecisi | 5 | 9 | ~9,5 sn'de bir |
  | 3★ Semt favorisi | 7 | 13 | ~6,5 sn'de bir |

  - Sıra doluyken gelen müşteri kapıdan döner; itibar düşmez, gün sonu hesabında yazılır.
  - Ekranın sol altında "Sıra 2/3" gibi doluluk görünür.
  - Tedarik'teki "Müşteri trafiği" bölümünden günlük müşteri sayısı ve gelme sıklığı ayrı ayrı 3 kademe yükseltilir. Kademeler her dükkana özeldir, büyük dükkana geçince baştan başlar.
- **Grafik ayarları:**
  - "Ekran kartıyla çiz" seçeneği, tarayıcı ve sistem destekliyorsa varsayılan olarak açık. Algılanan ekran kartının adı da görünür.
  - Grafik kalitesi Yüksek / Orta / Düşük seçilebilir. Eski bilgisayarlar için Orta ya da Düşük önerilir; Düşük'te efektler kapanır ve oyun saniyede 30 kare çizer.

### Değişen
- **Tarifler daha yavaş açılır:** artık XP ile değil, satılan toplam kahve sayısıyla açılırlar ve aradaki fark giderek büyür.

  | Tarif | Açıldığı toplam satış |
  |---|---|
  | Americano | 4 |
  | Lungo | 8 |
  | Ristretto | 14 |
  | Macchiato | 22 |
  | Cortado | 32 |
  | Latte | 44 (ayrıca 2★ dükkan) |
  | Cappuccino | 58 (ayrıca 2★ dükkan) |

  Üst çubukta "Yeni tarife X kahve daha" yazar; Defter'de kilitli her tarifin yanında kaç kahve kaldığı görünür.

### Düzeltilen / optimizasyon
- **Önbellek sorunu:** oyun dosyaları artık sürüm numarasıyla yükleniyor ve sayfa tarayıcıda saklanmıyor. Sayfa ile oyun dosyaları farklı sürümdeyse oyun kendini bir kez otomatik yeniliyor. Eski sürümden parça kalmamalı, önbellek temizlemeye gerek olmamalı.
- **Donmalara karşı:**
  - Ana menüdeyken arkadaki dükkan artık her karede yeniden çizilmiyor.
  - Dükkan kapalıyken ya da bir kart veya mini oyun paneli açıkken arka sahne daha seyrek çiziliyor.
  - Ekran metinleri yalnızca değiştiklerinde güncelleniyor.
  - Kalite ayarına göre çözünürlük ve efektler azaltılabiliyor.

### Süreç
- Bu paket test edilmeden yayınlandı (Kural 7: testi kullanıcı yapar).


## v0.9 – 31 Ekim 2026

### Düzeltilen (v0.8'deki yanlış anlaşılma)
- **Hedefler küçüldü:** üç rengin toplamı başlangıçta çubuğun %10'unu geçmiyor. Koyu yeşil Mükemmel %2, açık yeşil Güzel (içiyle birlikte) %5, sarı İyi (içiyle birlikte) %10. Rütbe yükseldikçe daralıyor. Bu sınırı yalnızca hassasiyet yükseltmeleri aşabiliyor (×1,5).
- **Adımlar istenen şekle döndü:**
  1. **Öğütme:** siyah ibre çubukta hızla gidip geliyor, ÖĞÜT'e basınca duruyor.
  2. **Dozlama:** eskisi gibi basılı tutuyorsun, kahve doluyor, istediğin yerde bırakıyorsun. Çubuk 0–24 g, hedef 18 g; 24 g'ı geçersen taşıyor.
  3. **Tamping:** eskisi gibi daire büyüyüp küçülüyor. Hedef artık dairenin üzerinde iç içe renkli halkalar; dairenin siyah kenarı koyu yeşil halkadayken daireye ya da BASTIR'a dokunuyorsun.
  4. **Ekstraksiyon:** bir kez basınca kahve dolmaya başlıyor, bir kez daha basınca bitiyor. Renkli bölgeler aynı şekilde geçerli.
- Süt ve latte art değişmedi. Öğretici metinleri yeni adımlara göre güncellendi.

### Süreç
- Bu paket test edilmeden yayınlandı (Kural 7: testi kullanıcı yapar).


## v0.8 – 31 Ekim 2026

### Yeni
- **Renkli hedef çubuğu (tüm adımlar):** iç içe üç hedef var: ortada koyu yeşil Mükemmel (100), yanında açık yeşil Güzel (88), en dışta sarı İyi (72). Çubuğun dışı Kaçtı sayılır. Siyah ibre hangi renkte durursa adımın puanı o olur.
  - Öğütme, dozlama, tamping: ibre gidip gelir; büyük düğmeye (ÖĞÜT / DOZLA / BASTIR) basınca durur.
  - Ekstraksiyon: BAŞLAT'a basınca ibre süreyi sayarak ilerler, DURDUR'la kesersin.
  - Süt: basılı tutunca süt ısınır, bırakınca durur.
  - Latte art: önce dök, sonra kesim ibresini durdur.
- **Hassasiyet yükseltmeleri:** her biri o adımın renkli bölgelerini %50 genişletir.
  - Mikro ayarlı öğütücü 150₺
  - Hassas terazi 160₺
  - Tartılı tamper 180₺
  - Basınç göstergesi 220₺
  - Termometreli sürahi 140₺
  - Profesyonel döküm sürahisi 260₺ (3★)
- **Otomasyon sırası:** bir adımın otomasyonu ancak o adımın hassasiyet yükseltmesinden sonra alınabilir ("önce ustalaş, sonra otomatikleştir"). Tedarik ekranında "🔒 Önce: …" yazar.
- **Dükkan sesleri:** açılışta kapı zili ve yükselen üç nota; kapanışta zil, kilit "tık-tak" ve inen üç nota.

### Değişen
- Başka sekmeye geçince ses motoru tamamen kapanır, böylece tarayıcı sekmesindeki "ses çalıyor" simgesi de kaybolmalı. Sekmeye dönünce müzik yeniden başlar.
- Öğretici metinleri ve ipuçları yeni çubuğa göre yeniden yazıldı. Mini oyun paneli kaydırma gerekmeden ekrana sığar.

### Bilinmesi gereken
- Otomatik adım hep 85 puan verir. Bu yüzden bir adımı otomatikleştirdiğinde o siparişte mükemmel servis (95+) yapılamaz; mükemmel için o adımı elle yapman gerekir.

### Çalışma kuralları
- Paketler yalnızca "paket çık" / "yayınla" denince çıkılır. Her pakette zip, oyunun bağlantısı, tasarım belgesinin HTML hali ve bu güncelleme notları birlikte gelir.
- Testleri kullanıcı yapar. Geliştirme sırasında test yapılmaz; yalnızca kullanıcı bir hata bildirince ya da test istediğinde yapılır.

---

## Önceki sürümler (özet)
- **v0.7:** otomasyon, yardımcı barista, hafta/kira/banka, dükkan kilitleri, latte art, günlük görev, mükemmel seri, dekor, buzdolabı; sıcak, davulsuz müzik.
- **v0.6:** yazar kasa sesi, makine sesleri, sekmede susma, defterde tarif resimleri, isimsiz müşteri tipleri.
- **v0.5:** ortada büyük mini oyun paneli, ilk ses ve müzik, ayarlar, büyük ikonlar, fiyat dengesi.
- **v0.4:** "Yeni oyun" hatası düzeltildi, kısa gün, kolay XP, XP'ye bağlı tarif açılımı, büyük HUD.
- **v0.3:** tam ekran dükkan, ilk kahve öğreticisi, para ve müşteri efektleri, zorunlu gün sonu tedarik.
