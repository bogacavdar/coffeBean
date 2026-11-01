# CoffeBean – Güncelleme Notları

## v0.16 – 1 Kasım 2026

### Otomatik kayıt ve Devam
- Oyun tarayıcı kapanırken, sekme arka plana geçerken ve ana menüye dönülürken de kaydediliyor.
- Ana menüde en üstte **▶ Devam** düğmesi var. En son kaydedilen oyunu açıyor; altında yuva, gün ve para yazıyor.
- Gün ortasında çıkılırsa kazanılanlar kalıyor, gün baştan başlıyor.

### Mini oyunlarda eşit zorluk
- Renkli bölgelerin genişliği artık ibrenin hızına göre hesaplanıyor. Hızlı giden ibrede bölgeler geniş, yavaş gidende dar.
- Böylece dört espresso adımında tutturulacak süre aynı: koyu yeşil ±0,027 sn, açık yeşil ±0,067 sn, sarı ±0,133 sn.
- Çekme (4. adım) artık eskisi kadar kolay değil.
- Süt, su, basınç ve latte art da aynı kurala geçti.

### Türkçe
- "Tamping" artık **Temperleme**; aletlerin adı "Tartılı temper" ve "Otomatik temper".

## v0.15 – 1 Kasım 2026

### Zorluk seçimi
- **Zorluk seçimi:** Yeni oyunda yuva seçtikten sonra zorluk seçiliyor; seçim kayıt yuvasında görünüyor.

| | Kolay | Normal | Zor |
|---|---|---|---|
| Müşteri sabrı | ×1,3 | ×1 | ×0,75 |
| Mini oyun renkli bölgeleri | %10 geniş | aynı | %15 dar |
| Tedarik fiyatları | %20 ucuz (daha çok kâr) | aynı | %20 pahalı (az kâr) |
| Başlangıç parası | ₺400 | ₺300 | ₺250 |

### Kira ekranı
- Gün sonunda ilk ekran olarak geliyor: "Kiraya X gün kaldı" ya da "Kira bugün!".
- Kirayı erken ödeyebilir, kredi çekebilirsin. Kira günü değilse "Sonra ödeyeceğim" ile geçiliyor; kira günü ödemeden geçilemiyor.
- Kira artık kendiliğinden kesilmiyor.

### Gün sonu ekranlarında geri
- Hesap, Gazete, Tedarik, Dükkan ve Fiyatlar ekranlarında **← Geri** düğmesi var.
- Geri gidip gelmek günü iki kez ilerletmiyor; yaptığın alımlar ve ödemeler korunuyor.

### İlk gün
- Günü başlat düğmesi ilk gün yok. Yıldız Teyze'nin açılışında **Devral**'a basınca gün kendiliğinden başlıyor.

### Ristretto ve lungo farklılaştı
- **Öğütme:** ristrettoda hedef daha ince, lungoda daha kaba.
- **Ristretto:** çekmede ibre 1,5 kat hızlı, renkli bölgeler daha dar.
- **Lungo:** çekmenin ortasında ikinci hedef çıkıyor; ibre oradayken "💧 Akışı yumuşat"a basılıyor. Çekme puanı iki aşamanın ortalaması.

### Fiyatları elle ayarla
- Fiyat lira olarak −₺1 / +₺1 düğmeleriyle ya da kutuya yazarak ayarlanıyor.
- Yüzde, varsayılan fiyat ve beklenen müşteri tepkisi artık gösterilmiyor. Pahalı mı ucuz mu, müşteri tepkilerinden anlaşılıyor.

### Küçük malzemeler ve self servis standı
- Tedarik'te altı küçük malzeme satılıyor: bardak tutacağı, peçete, şeker, karıştırma çubuğu, tatlandırıcı, pipet.
- Müşteriler bunları gizli oranlarla kullanıyor. Eksikse "… bile yok!" deyip az bahşiş bırakıyorlar.
- Dükkanda self servis standı var; standdaki malzemelerin doluluğu stoğa göre değişiyor.

### Dekorasyon ve satın alma
- Dekorasyon listesi ucuzdan pahalıya sıralı.
- Bir şey satın alınca panel kısa süre kapanıyor ve yeni ürün dükkanda "✨ Yeni!" efektiyle görünüyor.

## v0.14 – 31 Ekim 2026

### Sabır ve sipariş kartı
- **Hazırlarken sabır:**
  - Siparişe başlayınca müşterinin sabrına başlangıç sabrının %50'si kadar süre eklenir.
  - Sabır hazırlarken de azalır. Teslim etmeden biterse müşteri "Bu kadar beklenmez! İptal!" deyip gider (itibar −5); kullanılan bardak ve malzeme geri gelmez.
- **Sipariş kartı (sağ üst) büyüdü:**
  - Tarif adı büyük yazıyor, yanında ayrı bir boy etiketi var (Tek / Double / Küçük / Orta / Büyük). Tek espresso da "Tek" diye açıkça görünüyor.
  - Altında kalan sabrı gösteren renkli bir çubuk var (yeşil → sarı → kırmızı).

## v0.13 – 31 Ekim 2026

### Dükkan artık dolu ve canlı
- **Her alet, makine ve geliştirme dükkanda görünüyor.**
  - Ön tezgâhta: makinenin üstünde PID göstergesi ve yükseltilmiş buhar çubuğu, ikinci makine, süper otomatik makine, mikro ayar halkalı, ekranlı ya da teraziye oturtulmuş öğütücü, hassas terazi, tartılı tamper ve otomatik tamper istasyonu.
  - Yeni arka tezgâhta: buzdolabı, kettle, süt sürahileri, kakao serpici, buhar kazanı ve otomatik süt köpürtücü.
- **Müşteri gelişi geliştirmeleri görünüyor:**
  - Kapı yanında kaldırım tabelası.
  - Duvarda QR kodlu sosyal medya afişi ve çerçeveli gazete ilanı.
  - Vitrinde yanıp sönen ampuller ve ışıklı "AÇIK" tabelası.
  - Kapı yanında menü panosu.
  - Kapının üstünde dönen kahve kokusu fanı.
- **Dekorasyon 18 ürün oldu ve dükkana özel.**
  - Her dükkanın kendi 6 dekoru var; seviye atlayınca yeni dükkanın dekorları gelir, eskiler taşınmaz.
  - Örnekler: neon kahve tabelası, Chester koltuk, kitaplık, akvaryum, duvar piyanosu, kristal avize, pirinç tabela.
- **Dükkan büyüdükçe dolulaşıyor:**
  - Tezgâh 5 → 6 → 7 birim uzuyor.
  - Masalar 3 → 5 → 6 oluyor, üstüne uzun ortak masa ekleniyor. Masa ve sandalye tipi dükkana göre değişiyor.
  - Pasta vitrini, kasa, bahşiş kavanozu, çöp kutusu, askılık, duvar rafları, halı ve daha fazla sarkıt lamba var.
- **Daha gerçekçi çizim:**
  - Yüzeylerde ışık geçişi ve kenar parlaması, duvar dibi gölgeleri, ahşap lambri, cam yansıması.
  - Müşterilerin kolları, ayakkabıları ve kıyafet gölgeleri var.
- **Barista:** üstündeki "Sen" yazısı kaldırıldı. Uzun sarı saçlı, gerçekçi bir genç kadın olarak yeniden çizildi: mavi gözler, kaşlar, dudaklar, kollar, bluz ve kiremit önlük (cep, logo, bağcık).

### Resimli ve canlı paneller
- Geliştirmeler, Aletler, Dekorasyon ve Tedarik listelerinde her ürünün dükkanda görüneceği hâlinin resmi var.
- Çekirdek torbası, süt kutusu ve bardaklar da resimli.
- Paneller büyük ve okunaklı yazılı renkli kartlar oldu; dokununca hafifçe büyüyorlar.
- Ana menünün yazıları ve düğmeleri bilgisayarda büyüdü.

### Mini oyunlar
- **Hareket adımları:** her adım beceri istemiyor; gerçek hazırlığa benzeyen hareketler eklendi. Tamamlanınca tam puan verirler.
  - Americano: kaşıkla 3 tur karıştır.
  - Latte ve Cappuccino: sürahiyi 3 tur çevir.
  - Cappuccino: kakaoyu serpiciyi sağa-sola kaydırarak çalkala.
  - Macchiato ve Cortado: sütü basılı tutarak dök.
- **Puan yalnızca renge bağlı:** koyu yeşilin her yeri 100, açık yeşil 88, sarı 72, renkli bölgelerin dışı 0. Kahve kalitesi bu renklerin ortalaması; çekirdek tazeliği kaliteye eklenmiyor.
- **Öğretici:**
  - Öğütme ve tampingde önce Yıldız Teyze anlatıyor ve **Anladım**'a basılmasını bekliyor.
  - Sonra ibre bir kez gidip geliyor, koyu yeşilde durunca "Tam şimdi!" yazıyor.
  - Dozlama ve çekmede de önce anlatım geliyor; düğme Anladım'dan sonra açılıyor.

### Siparişler
- Sıradaki müşteri siparişini kapıdan girer girmez değil, kasaya varıp eldeki sipariş teslim edilince söylüyor.
- Tarif ve boy seçim ekranında müşterinin siparişi yazmıyor ve önceden seçili gelmiyor; siparişi sağ üstteki karttan okuyorsun.
- Tedarik ekranında para en üstte, yeşil kağıt para ikonuyla büyük yazıyor.

## v0.12 – 31 Ekim 2026

### Tam ekran ve Android'e yükleme
- Ana menünün sağ üstünde ve Ayarlar'da **⛶ Tam ekran** düğmesi var.
- Android'deki "zaten yüklü" hatasının nedeni şuydu: oyun claude.ai sayfasının içinde açılıyordu, bu yüzden Chrome oyunu değil Claude uygulamasını yüklemeye çalışıyordu.
- Oyun artık kendi adresinden (GitHub Pages) **uygulama olarak yüklenebiliyor**. Tarayıcı izin verirse **📲 Uygulamayı yükle** düğmesi çıkıyor. Yüklenen uygulama tam ekran açılıyor ve kendi ikonu oluyor.

### Dükkan tam ekran
- Sahnenin kenarlarında siyah boşluk kalmıyor.
- **☕ Günü başlat** düğmesi sol üstte, sahnenin içinde; ilk gün parlıyor.

### Yıldız Teyze ile ilk espresso
- Açılışta "Bütün kahveler espressodan yapılır, gerisini tarif defterimden öğrenirsin" diyor.
- İlk siparişte her adımı sözlü anlatıyor: ibre koyu yeşile gelince "Şimdi!" diyor, erken basarsan "acele etme" diyor.
- Dozlamada erken bırakırsan adım baştan başlıyor.
- Çekme sırasında konuşuyor, ilk espressodan sonra vedalaşıp gidiyor.

### Sipariş sonu değerlendirme
- Son adımdan sonra fincan ve **tüm adımların ortalaması** gösteriliyor (Mükemmel / Lezzetli / Ortalama / Kötü / Berbat).
- **Teslim et** ya da **Yeniden yap** seçebilirsin. Yeniden yaparken malzeme ve bardak yeniden harcanır.
- Müşteri puana göre rastgele bir yorum yapıp gidiyor.

### Siparişler, boylar ve bardaklar
- Müşteriler 10'dan fazla farklı cümleyle ve **boyu söyleyerek** sipariş veriyor ("double espresso", "büyük boy latte" gibi).
- Boylar:
  - Espresso, ristretto, lungo, macchiato ve cortado: **Tek** ya da **Double**.
  - Americano, latte ve cappuccino: **Küçük / Orta / Büyük**.
- Büyük boylar daha çok çekirdek ve süt harcar, fiyatı da daha yüksek (Double ×1,7; Orta ×1,25; Büyük ×1,6). Double ve Büyük boyda dozlama hedefi 36 g.
- **Sağ üstteki kart** aktif siparişleri gösteriyor.
- Siparişi alınca önce **tarifi ve boyu seçiyorsun**, adımlar ona göre geliyor.
  - Yanlış tarif ya da boy seçersen değerlendirme ekranı uyarıyor.
  - Yine de teslim edersen müşteri almıyor ve itibar 3 düşüyor.
- **Her boyun kendi bardağı var:** tek ve double espresso fincanı, küçük, orta ve büyük bardak. Bardaklar Tedarik'ten 10'lu paketle alınıyor (₺10–18).
  - İstenen boyun bardağı yoksa müşteri "Nasıl büyük boy bardağınız yok?!" diye kızıp gidiyor (itibar −3).
  - Gerekli her bardak türünden en az 3 adet olmadan gün başlamıyor.
  - Başlangıçta 20 tek fincan ve 10 double fincan veriliyor.
- **Tedarik ekranının** üstünde kasadaki para ve mevcut stok yazıyor: çekirdek (kaç shot eder), süt ve bardaklar.
- Gün sonu hesabında bardak yokluğu ya da yanlış sipariş yüzünden giden müşteri sayısı gösteriliyor.

### Telefonda dikey ekran düzeni
- Telefon dik tutulduğunda üstteki bilgiler (gün, saat, para, itibar, XP, stok vb.) sol üstte **küçük yazıyla alt alta** dizilir.
- Sipariş kartı ve köşe ikonları küçülür, günlük görev aşağı iner, **Günü başlat** alt ortaya geçer.
- Bilgisayarda ve yatay ekranda düzen aynı kalır.

### Düzeltme
- Eski kayıtlarda kredi ve süt bilgisinin yüklenmemesine yol açan bir satır hatası düzeltildi.

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
