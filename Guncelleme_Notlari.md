# CoffeBean – Güncelleme Notları

## v0.36 – 2 Kasım 2026 (açılış sırası, geliştirmeler, Türkçe adlar)
- **Yeni tarif açıldığı gün istenmiyor.** Müşteriler yeni tarifi ertesi günden itibaren ister, ilk 3 gün daha sık. Gün sonunda alet ve malzemeyi almaya vakit kalır.
- **Tedarik'e yönlendirme:** Dükkan'da alet alınca menüye giren tarif için Tedarik'te eksik bir şey (şurup, sos, krem, bardak, süt) varsa pencere bunları listeler. "Tedarik'e git" ilgili satırları vurgulayarak Tedarik'i açar, "← Dükkana dön" geri getirir. Yeni tarif penceresinde de aynı uyarı ve düğme var.
- **Tarifler kolaydan zora açılıyor:** her dükkanda önce bildiğin adımları tekrar eden tarifler, sonra yeni alet getirenler, en sonda süt, şurup ve sos isteyen çok adımlı tarifler. 1★ 20, 2★ 23, 3★ 23, 4★ 14, 5★ 2 tarif. Hiçbir tarif aletinin dükkanından önce gelmez.
- **Bar yükseltmeleri 3 kademe:** öğütücü, terazi, temper, PID, termometreli sürahi ve döküm sürahisi 3 kez geliştirilir (×1,2 → ×1,35 → ×1,5), her kademe öncekinden pahalı. Otomatikleştirici 3/3'ten sonra açılır ve her zaman en pahalısı. Eskiden alınmış yükseltmeler 3/3 sayılır.
- **Türkçe adlar:** Türkçe karşılığı olan 23 tarif Türkçe adıyla görünüyor (ör. Kremalı espresso, Viyana kahvesi, Baharatlı çay latte, Soğuk demleme kahve). Uluslararası adıyla bilinenler ve özel adlar aynı kaldı.
- Mevcut kayıtta eşiği geçilmiş ama açılmamış tarifler bir sonraki satışta birlikte açılabilir.

## v0.35 – 2 Kasım 2026 (otomasyon, tarif seçimi, dükkan sıralı açılım)
- **Otomatik aletler artık 100 puan veriyor** (önceden 85): otomatik öğütücü, tartılı öğütücü, otomatik temper, süper otomatik espresso makinesi, otomatik süt köpürtücü, Türk kahvesi makinesi, filtre kahve makinesi. Yardımcı baristanın kendi hazırladığı siparişler 85 puanda kaldı.
- **Tarif seçimi gruplu ve alfabetik:** elle hazırlarken tarifler Espresso bazlı, Türk ve geleneksel, Demleme ve filtre, Soğuk ve buzlu, Kahvesiz gruplarında, her grup kendi içinde alfabetik görünüyor. Boş grup gösterilmiyor.
- **Tarifler dükkan sırasıyla açılıyor:** tarif ilerlemesi sayacı bir dükkanın bütün tarifleri açılınca duruyor ("Yeni tarif için N★ dükkan"). Dükkan büyüyünce kaldığı yerden devam ediyor, tarifler büyük dükkana geçince toplu değil tek tek geliyor. Defter'de her dükkan için kaç tarifin açık olduğu yazıyor.
- **Çekirdekler 5 dükkana eşit dağıtıldı (3·3·3·2·2):** 1★ Brezilya, Kolombiya, Honduras · 2★ Peru, Guatemala Antigua, Kafeinsiz Kolombiya · 3★ Kosta Rika Tarrazú, Etiyopya Yirgacheffe, Kenya AA · 4★ Sumatra Mandheling, Yemen Mocha · 5★ Jamaika Blue Mountain, Panama Geisha. Çekirdekler de aynı sayaçla, tek tek açılıyor.
- Mevcut kayıtlarda sayaç, durduğu noktadan başlıyor.

## v0.34 – 2 Kasım 2026 (telefonda yanıp sönen konuşma balonu)
- **Konuşma balonu telefonda artık yanıp sönmüyor.** Ekran kartıyla çizimde tuval "eşzamansız" moddaydı. Bu modda telefon kareyi çizim bitmeden ekrana basabiliyor.
- Kareye en son çizilen konuşma balonları ve rozetler bu yüzden bazı karelerde eksik görünüp yanıp sönüyordu. Bu mod kaldırıldı; her kare tamamlandıktan sonra gösteriliyor.
- Hazırlama ekranındaki yakın plan çizimi için de aynısı yapıldı.

## v0.33 – 2 Kasım 2026 (dükkan ekrana sığıyor)
- **Telefonu dik tutunca dükkanın tamamı görünüyor.** Duvar tabelası, raflar, tezgâh, vitrin, kapı ve masalar ekranın genişliğine göre ölçeklenir.
- Sağdaki düğme sütununun üstünde yer varsa dükkan oraya, tam genişlikte yerleşir. Yoksa sütunun soluna sığar.
- Dükkanın altında kalan alan zeminle dolu, boş bir arka plan görünmez.
- Dükkan küçülünce bile sipariş rozeti, müşteri adı ve konuşma balonu okunur boyda kalır. Müşteriye dokunma alanı parmak büyüklüğünde.
- HUD'un altındaki bildirim bandı boş bırakıldı; bildirimler konuşma balonlarının üstüne binmiyor.
- Uçuşan efektler (ör. kırık fincan) artık balon yazısının altında çiziliyor.
- Hazırlama ekranında bildirim alttaki "Sırada bekleyenler" şeridinde çıkınca şeridin yazısı geçici olarak gizleniyor; iki yazı birbirine karışmıyor.

## v0.32 – 2 Kasım 2026 (gün başlamıyor)
- **Tedarik'te takılıp kalma düzeltildi.** Çekirdek ya da bardak en az miktarın altına düşünce "Devam" sönük kalıyordu. Üstteki kırmızı "EKSİK" kutuları düğme gibi görünüyor ama basınca hiçbir şey olmuyordu. Satın alma düğmeleri listenin çok aşağısındaydı ve her alımdan sonra liste başa zıplıyordu. Telefonda bu, günün hiç başlamaması gibi görünüyordu.
- Eksik varken alttaki ana düğme artık **"Eksikleri al · ₺…"**. Tek dokunuşla yalnızca gereken kadarını alır, sonra düğme "Devam →" olur. Para yetmezse ne yapılacağı yazar (Kredi al).
- Eksik listesi artık düğmeye benzemeyen bir uyarı kutusu ve sayılar Türkçe virgüllü ("0,3 kg").
- Tedarik'te bir şey satın alınca liste başa zıplamıyor.

## v0.31 – 2 Kasım 2026 (sahnede yanıp sönme)
- **Sipariş rozetleri, müşteri adları ve konuşma balonları artık yanıp sönmüyor.** v0.30'da üst üste binmesinler diye gizleniyorlardı; ama müşteriler yürüyüp birbirinin önünden geçerken her karede gizlenip yeniden çıkıyorlardı.
- Ekranda zaten görünen bir şey yerini korur ve ondan önce yerleşir.
- Gizlenen bir şey ancak yeri yarım saniye boş kalınca geri gelir, o zaman da yumuşakça belirir.
- Yürüyen müşterinin rozeti ve adı gösterilmez; müşteri durduktan kısa süre sonra belirir. Sıra ilerlerken de ekran sakin kalır.
- Yeni gelen tepki balonu ("Berbat olmuş, kalsın." gibi) yine hemen gösterilir.
- Ölçüm: dik telefonda kalabalık sırada 48 saniyede çok kısa süreli (0,3 saniyeden kısa) gizlenip çıkma sayısı 320 px ekranda 66'dan 0'a, 375 px ekranda 11'den 0'a indi. Hiçbir şey üst üste binmiyor.

## v0.30 – 1 Kasım 2026 (telefon dikey düzeni)
Telefonu dik tutunca görülen tüm düzen hataları düzeltildi. Bilgisayar ve yatay ekran düzeni aynı kaldı; oyun dengesi (fiyat, süre, puan, sabır, renkli bölgeler) değişmedi.

### Artık hiçbir düğme kaybolmuyor
- **Yıldız Teyze'nin "Anladım" düğmesi** balonun içinde gizli kalıyordu; artık ana düğmenin yerinde, aynı büyüklükte duruyor. İlk dakikada takılıp kalma sorunu bitti.
- **Hazırlama ekranı ekrana sığıyor:** ÖĞÜT, BASILI TUT, BAŞLAT/DURDUR, BASTIR, Teslim et ve Yeniden yap düğmeleri kaydırmadan görünüyor. Yakın plan çizimi kalan alana göre küçülüyor.
- **Gün sonu pencerelerinde** (Kira, Gün kapanışı, Tedarik, Dükkan, Fiyatlar) düğme satırı kartın altında sabit: "Devam", "Kirayı öde", "Günü başlat" hep görünüyor. Birincil düğme en üstte ve tam genişlikte. (Yatay telefonda da düğme satırı artık sabit.)
- **Fiyatlar:** [−₺5] [₺84] [+₺5] tek satıra sığıyor; fiyat kutusunda ₺ işareti var. "+₺5" artık ekran dışında değil.
- Çıkış düğmesi hazırlama ekranını örtmüyor (ekran açıkken gizleniyor; kapatmak için sağ üstte ✕ var). Alttaki "Sırada bekleyenler" şeridi hazırlama ekranının hiçbir yerini örtmüyor.

### Siparişi okumak kolay
- Seçim ve hazırlama ekranının en üstünde müşterinin **istediği** sipariş (içecek, boy, varsa çekirdek/süt/şeker) ve sabır çubuğu büyük yazıyor. "Sağ üstteki karttan oku" yazısı telefonda kalktı.
- Yanlış seçimde birincil düğme **Yeniden yap**, "Teslim et" ikinci planda. Malzeme gram ile yazıyor: "−18 g çekirdek".

### Daha sade ekran
- Üst bilgi iki kısa satır: gün · saat, para, itibar, yıldızlar. Kira yalnızca yaklaşınca, borç ve seri yalnızca varsa görünüyor. Saat hiçbir telefonda kesilmiyor.
- Kamera tezgâhı, baristayı ve sırayı üst bilginin altındaki boş alana kadrajlıyor.
- **Konuşma balonu yeniden tasarlandı:** kart ve pencerelerle aynı aileden krem zemin, ince kahve kenar, yuvarlak köşe ve hafif gölge. Genişliği sahnenin en fazla %62'si, yazı en az 12–13 px ve en fazla 2 satır (çok uzun cümleler bölünerek 3 satıra iner, kesilmez). Kuyruk konuşan kişinin başına bakıyor; balon kenara kaydırılsa da kuyruk kişide kalıyor. Balon başın biraz üstünde duruyor, HUD'un altında ve sağdaki ikonların solunda kalıyor. Kısa bir belirme animasyonu var; titremiyor. Sabır halkası balonun içinde sağda.
- Konuşma balonları ekrandan taşmıyor. İki müşteri aynı anda konuşursa balonlar üst üste binmiyor: yer varsa yan yana duruyor, yoksa önce en yeni tepki ("Berbat olmuş, kalsın.") gösteriliyor, birkaç saniye sonra sipariş cümlesi geri geliyor.
- Sipariş rozetleri (fincan + sabır halkası) ve müşteri adları balonların, birbirlerinin ve sağdaki ikon sütununun üstüne binmiyor; yer yoksa öndeki müşterininki gösteriliyor.
- "Yuva seç" ekranında düğme metnin altına indi; "Boş yuva / Henüz kayıt yok" tek satırda.
- Bildirimler kısa ("Yaşlı teyze · Espresso · ₺84 · Güzel") ve üst bilginin ya da açık pencerenin üstüne binmiyor. İlk açılışta aynı anda tek talimat var.
- Yıldız Teyze'nin anlatımları kısaldı (1–2 cümle) ve balon sabit boyda; ekran zıplamıyor. Çekme süresi her yerde aynı: "yaklaşık 27 saniye".
- Yakın plan çiziminde telefonda okunmayan küçük yazılar ve küçük hedef göstergesi gizlendi; süre ve gram büyük yazıyor.
- Tedarik, Dükkan ve Fiyatlar telefonda tablo yerine kart: üstte resim + ad + stok, altta fiyat ve tam genişlik düğme. Açıklamalar kısaldı. Dükkan sekmeleri 2×2.
- Gün kapanışı sırası düzeldi: Satış, Bahşiş, Alımlar, Kira, Maaş, sonra **Günün neti**.
- Kahve Defteri'nde kilitli tarifler tek özet satırı ("??? 81 kilitli tarif · sıradaki: 3 kahve daha sat").
- Kira ekranında para yetiyorsa "Kredi çek" gösterilmiyor (Tedarik ve Dükkan › Krediler'de duruyor).
- Zorluk penceresinde her zorluğun başlangıç parası yazıyor; açıklamalar sade.
- Ana menüde fincan resmi telefonda Çıkış düğmesine binmiyor.
- Ayarlar'da teknik ekran kartı adı yerine kısa açıklama.
- Sayılar Türkçe yazılıyor: 0,95 kg, ×1,00, 26,7 sn.

### Hata düzeltmeleri
- Gün bitince arkada açık kalan inceleme ekranı kapanıyor; gün sonu boyunca üst bilgi kapanan günü ve "Kapanış" yazıyor.
- Dükkan kapalıyken yanlış "Hazır olunca aç" yazısı (ilk günde düğme yokken) kaldırıldı.
- Kalite çok düşükken sonuç yazısı ("%0 · Berbat") kırmızı kutuya bürünüp okunmuyordu, düzeldi.
- Nadiren dükkan sahnesinin çizilememesine yol açan bir hata (müşteri tam yerinde dururken) düzeltildi.

## v0.29 – 1 Kasım 2026
- Barlı tüm adımlarda (öğütme, dozlama, ekstraksiyon, süt köpürtme, sıcak su, latte art) yakın plan çiziminde de küçük bir hedef göstergesi var: alttaki büyük çubuğun aynı sarı / açık yeşil / koyu yeşil bölgeleri ve ibre. Ekstraksiyondaki gösterge artık sabit ±2 g yerine gerçek renkli bölgeleri gösteriyor.

## v0.28 – 1 Kasım 2026 (acil)
- **Gün sonunda donma düzeltildi:** Kahve Gazetesi ya da başka bir gün sonu penceresi dışına dokununca (veya Esc › Vazgeç ile) kapanırsa ekranda hiçbir şey kalmıyor, "Günü başlat" çalışmıyordu. Artık gün sonu akışı kaldığı ekrandan kendiliğinden yeniden açılıyor; gün sonundayken "Günü başlat" görünmüyor.
- **Para gösterimi:** Dükkan (geliştirmeler, aletler, krediler, dekor), Fiyatlar, Krediler ve Ana hedef ekranlarında da Tedarik'teki gibi yeşil kağıt paralı büyük kasa kutusu var. Tüm ₺ tutarlarında binlik ayracı (₺13.500).
- Kahve Gazetesi artık yalnızca menüde olan (açılmış ve aleti alınmış) kahvelerin fiyat haberlerini yazıyor.

## v0.27 – 1 Kasım 2026
- **Süt buzdolabı yine satın alınıyor:** v0.24'ten beri buzdolabı alınmadan "alındı" görünüyordu. Artık baştan yok; 1★ dükkandan itibaren Dükkan › Kapasite ve personel bölümünden ₺3.600'e alınır.
- **Süt dayanıklılığı:** buzdolabı yoksa süt 2 gün, buzdolabıyla 6 gün dayanır (önce: buzdolabısız 1 gün, buzdolabıyla 3 gün). Yeni süt alınca stokun günü yenilenir.
- Eski kayıtlar: 1★ dükkanda bedava verilmiş buzdolabı geri alınır; 2★ ve üstü dükkanlarda dokunulmaz.

## v0.26 – 1 Kasım 2026 (kritik)
- **"Teslim et" düğmesi çalışmıyordu (düzeltildi):** v0.24'te bahşiş çarpanlarının bulunduğu ayar satırı yanlışlıkla devre dışı kalmıştı; teslimde hata oluşuyor, Yıldız Teyze'nin öğreticisi dahil hiçbir sipariş teslim edilemiyordu.

## v0.25 – 1 Kasım 2026 (kritik)

### Eşit zorluk kuralı geri geldi
- Espresso çekme adımında renkli bölgeler yine ibrenin hızına göre: ibre yavaş ilerlediği için bölgeler dar (v0.24'te kurala aykırı olarak büyütülmüştü).
- Kumda Türk kahvesinde köpük yavaş kabardığı için bölgeler de aynı oranda daralıyor.
- Ekstraksiyon ekranındaki süre penceresi bölgelerin gerçek genişliğini gösteriyor.

## v0.24 – 1 Kasım 2026

Barista incelemesi ve hile modu tarif testindeki bulgularla gerçekçilik paketi.

### Ekonomi gerçek TL'ye çekildi
- Tüm fiyatlar 2026 İstanbul ölçeğinde (×9): espresso ~₺90–100, 1★ kira ₺1.350/hafta, başlangıç parası ₺2.700 (Kolay ₺3.600, Zor ₺2.250). Denge oranları aynı.
- Eski kayıtlar açılınca para, borç, krediler ve fiyatların otomatik çevrilir.
- Fiyatlar ekranında düğmeler ±₺5.
- Gün kapanışında yeni satırlar: "Alımlar (önceki kapanıştan beri)" ve "Günün neti".

### Tempo
- Bir gün 150 saniye (önce 90); günlük müşteri sayısı aynı, geliş aralığı uzadı.
- Müşteri sabırları ×1,5 (iş adamı 27 sn, öğrenci 82 sn, yaşlı teyze 105 sn).

### Espresso artık gerçeğe uygun
- Tek shot 9 g → ~18 g; double 18 g → ~36 g. Sütlü içeceklerin tüm boyları double shot (18 g); büyük boy daha çok süt alıyor.
- Yıldız Teyze ilk espressoyu double (doppio) olarak öğretiyor.
- Ekstraksiyon terazili: ilk ~6 sn ön ıslatma, sonra verim gram gram artar; hedef gram ve 25–30 sn penceresi ekranda. Mükemmel ±1,5 sn, güzel ±3, iyi ±5 (eski ±0,027 sn kalktı). Ristretto penceresi biraz daha dar.
- Lungodaki gerçekte olmayan "Akışı yumuşat" düğmesi kalktı.
- "Basınç göstergesi (PID)" adı "Sıcaklık kontrolcüsü (PID)" oldu.

### Süt
- Latte ve cappuccino için "Büyük buhar kazanı" ve "VİDAYI KAPAT" adımı kalktı: buhar çubuğu her sütlüyü köpürtür. Latte, cappuccino, flat white, piccolo artık 2★ dükkan beklemiyor.
- Her tarif kendi süt miktarını harcıyor: macchiato 30 ml, cortado 60 ml, flat white 120 ml, latte 200 ml…
- Café au lait ve café con leche'de köpüksüz sıcak süt.
- Latte art, mikroköpüklü tariflerde (flat white, magic, Gibraltar dahil) 3★ dükkanda dökümün kendisi oluyor.
- Süt buzdolabı her dükkanda baştan var; süt 3 gün dayanıyor.

### Tarif düzeltmeleri
- Americano ve long black makinenin sıcak su musluğundan; kettle gerekmez. Americano karıştırılmaz.
- Buzlu americano: buz → soğuk su → espresso en üste.
- Türk kahvesi ailesi: yeni "Servis" adımı (fincan, bir bardak su, lokum).
- Menengiç kahvesiz: ezme ölçülür, çekirdek harcanmaz. Sütlü Türk kahvesi ve menengiç sütle pişer.
- Dalgona ve Yunan frappé hazır kahveyle; cold brew ve nitro servis başına çekirdek harcamıyor.
- Cold brew gece boyunca demleniyor: Tedarik'te demlemeye konan cold brew ertesi sabah hazır.
- Wiener Melange krem şantisiz (krem şantili olanı yeni Einspänner).
- Tek şeker stoku: "Toz şeker" kalktı; tariflerin şekeri küçük malzemelerdeki şekerden harcanır.
- Kakao serpici 1★.
- Shaker 3★ (freddo için).

### 37 yeni tarif
| Dükkan | Tarifler |
|---|---|
| 1★ | Sıcak çikolata, Latte macchiato, Café con leche, Gibraltar |
| 2★ | Magic, Galão, Breve, Chai latte, Salep, Balkabaklı baharatlı latte (sonbahar), Zencefilli kurabiye latte (kış), Damla sakızlı Türk kahvesi, Naneli mocha (kış), Dirty chai, Kenger kahvesi, Osmanlı kahvesi |
| 3★ | Mırra, Kumda Türk kahvesi, Buzlu İspanyol latte, Einspänner, Cortadito, Bicerin, Freddo espresso, Freddo cappuccino, Caffè shakerato, Mazagran, Kopi tubruk, Japon usulü buzlu filtre |
| 4★ | Irish kremalı kahve (alkolsüz), Cafezinho, Café de olla, Arap kahvesi (qahwa), Güney Hint filtre kahvesi, Soğuk köpüklü cold brew, Yumurtalı Vietnam kahvesi, Kyoto soğuk damla, Kalita Wave |

- **Mevsimler:** Oyun sonbaharda başlar, her mevsim 28 gün; HUD'da mevsim adı yazar. Mevsimlik tarifler yalnız kendi mevsiminde istenir.
- **Kafeinsiz Kolombiya** çekirdeği (2★, 50 satış).
- **Yeni malzemeler:** hazır kahve, damla sakızı, kenger ezmesi, salep tozu, chai/balkabağı/zencefil/nane/Irish cream şurupları, tarçın, kakule, yumurta.
- **Yeni aletler:** el köpürtücü, kum ocağı, dallah, toprak olla, bez filtre, Hint filtresi + dabara, Kalita Wave, Kyoto damla kulesi.
- **Yeni hareketler:** ezme ölç, mırra kaynatma, servis, soğuk köpük, damla kulesi vanası, dabara-tumbler, bezden süzme, bardağa kaynar su, tarçın serpme.

### Görseller
- Chemex, Kalita, AeroPress, moka pot, sifon, phin, Hint filtresi ve bez filtre kendi demlikleriyle çiziliyor (önce hepsi V60 hunisiydi).
- Nitro musluğu bira musluğu gibi, şelale köpüklü uzun bardak.
- Long black ve caramel macchiato'da bardak başta boş.
- Limon, krema ve sos buzlu içeceklerde buzlu bardakta.
- Dalgona, cubano ve yumurtalı kahvede kendi kaseleri.
- Menengiç, kenger, sütlü ve baharatlı cezve kahvelerinin renkleri farklı.

### Diğer
- Yeni oyunda küçük malzemeden bir miktar stok var (60 peçete, 60 şeker…).
- Müşteri yorumu "Hayatımın espressosu!" → "Hayatımın kahvesi!".
- Hile modu: "🧾 Tarif seçip müşteri getir" ve "⏸ Saati durdur / başlat".

## v0.23 – 1 Kasım 2026

### Hata düzeltmeleri
- **Oyun donması düzeltildi:** Pompa gibi bir hareket adımından hemen sonra süt ısıtma (ör. Caramel macchiato) ya da dozlama (ör. Vietnam kahvesi) gelince oyun donuyordu. Yeni adım kurulmadan çizilmiyor; tek bir çizim hatası artık oyun döngüsünü durduramıyor.
- **Gün tekrarı kapatıldı:** Gün sonu ekranlarında (Kira / Hesap / Tedarik) ana menüye çıkıp Devam'a basınca aynı gün yeniden oynanabiliyordu. Gün sonu artık kayda yazılıyor; Devam edince kaldığın gün sonu ekranından sürüyorsun.
- Kira ekranı ile gün kapanışı aynı "Kiraya X gün kaldı" sayısını gösteriyor.
- **Pencere açıkken zaman duruyor:** "Yeni tarif", "Yeni çekirdek/süt" gibi bilgi pencereleri ile gün içinde açılan Tedarik, Defter, Fiyatlar ve Ayarlar açıkken saat işlemiyor, müşterilerin sabrı azalmıyor. Hazırlama ekranında zaman akmaya devam ediyor.
- Yıldız Teyze (ilk sipariş) küçük malzeme kullanmıyor; "Peçete bile yok!" demiyor.
- Çıkış düğmesi artık Tedarik'in ✕ düğmesini ve Dükkan'daki 🎯 Ana hedef düğmesini örtmüyor: bir panel açıkken küçülüp en üste geçiyor.
- Tedarik'te "Malzemeler tamam ✓" yanında, biten küçük malzemeler (peçete, şeker…) sarı bir notla listeleniyor. Zorunlu değiller, günü engellemiyorlar.

### Metinler
- Herkesin kullandığı sipariş cümlelerinden bozuk Türkçe turist cümleleri ("Sende var …?", "Ben istemek bir …") çıkarıldı.
- Yaşlı teyzenin "şekersiz" cümlesi şekerli Türk kahvesi siparişiyle çelişmesin diye "Kızım, bir … olsun." oldu.
- Kahve meraklısının "ekstraksiyonu 28 saniye olsun" cümlesi yalnızca espresso bazlı kahvelerde söyleniyor.
- Americano tarif kartı düzeltildi: "Espresso üstüne sıcak su (yaklaşık 1:3–1:5). Kremayı korumak istersen önce su, sonra espresso: o da long black."

### Hile modu
- "📦 Stokları doldur" artık şurup, sos, krema, dondurma, tonik, cold brew gibi özel malzemeleri de dolduruyor (her birinden 2 paket).

## v0.22 – 1 Kasım 2026

### Müşteriler her açık kahveyi istiyor
- Müşteri tipleri artık belli kahvelerle sınırlı değil: açılmış, aleti alınmış ve özel malzemesi stokta olan her kahveyi herkes isteyebiliyor. Açılmamış ya da malzemesi bitmiş kahve istenmiyor.
- Yeni açılan bir kahve ilk 3 gün daha sık isteniyor (müşterilerin yaklaşık üçte biri).

### Tipe göre küçük malzeme alışkanlığı
| Müşteri | Alışkanlık |
|---|---|
| Yaşlı teyze | Tatlandırıcıyı en çok o kullanıyor, şekeri az; peçete ve çubuk bol |
| Öğrenci | Şekeri en çok o kullanıyor; çubuk ve pipeti seviyor |
| İş adamı | Şeker yerine tatlandırıcı, peçete alıyor |
| Kahve meraklısı | Sade içiyor; şeker, tatlandırıcı, çubuk neredeyse hiç |
| Düzenli müşteri | Ortalama |

- Buzlu kahvelerde neredeyse herkes pipet istiyor.
- Sabır ve bahşiş zaten tipe göre değişiyordu.

## v0.21 – 1 Kasım 2026

### Dünya kahveleri (34 yeni tarif)
Sattığın kahve sayısına göre sırayla açılıyor; bazıları dükkanın belli bir yıldıza gelmesini de istiyor. Her biri gerçek yapılışıyla hazırlanıyor.

| Dükkan | Kahveler (açıldığı satış sayısı) |
|---|---|
| 1★ | Long black 36, Espresso con panna 40, Caffè Romano 42 |
| 2★ | Flat white 50, Piccolo 54, Café au lait 62, Vanilyalı latte 66, Red eye 70, Mocha 74, Sütlü Türk kahvesi 78, Caramel macchiato 84, Menengiç 90, Tuzlu karamel latte 96, Dibek 100, Affogato 110 |
| 3★ | Buzlu americano 120, Buzlu latte 130, Moka pot 140, AeroPress 150, Café Cubano 160, Bombón 170, Marocchino 180, Wiener Melange 190, Dalgona 200, Espresso tonic 215 |
| 4★ | Frappuccino 240, Mocha frappé 255, Yunan frappé 270, Cold brew 290, Vietnam kahvesi 310, Buzlu mocha 330, Chemex 350 |
| 5★ | Sifon kahvesi 380, Nitro cold brew 420 |

- **Yeni hareketler:** şurup pompalama, sos gezdirme, krem şanti sıkma, dondurma topu, buz koyma, çırpma, blender, shaker, moka potu doldurup ısıtma, AeroPress pistonu, phin damlatma, sifonu ısıtıp çekme, nitro musluğu.
- **Özel malzemeler (Tedarik):** vanilya, karamel, tuzlu karamel, çikolata sosu, yoğunlaştırılmış süt, krema, dondurma, limon, tonik, menengiç ezmesi, ekstra şeker. Cold brew Tedarik'te demleniyor: 0,2 kg Brezilya çekirdekten 10 bardak. Gereken malzeme yoksa müşteri "… bile yok!" deyip gidiyor.
- **Yeni aletler:** şurup pompası, krema sifonu, dondurma dolabı, buz makinesi, moka pot, AeroPress, çırpıcı, blender, shaker, cold brew kavanozu, phin, Chemex, sifon, nitro musluğu. Sol duvardaki rafta ve tezgâhın ucundaki soğuk barda görünüyorlar; çöp kutusu soğuk barın yanına taşındı.
- **Yeni bardaklar:** Türk kahvesi fincanı, buzlu bardaklar (K/O/B), affogato kâsesi.

### Dükkan 4★ ve 5★
- **4★ Şehir kahvecisi** (₺12.000, itibar 450) ve **5★ Kahve evi & kavurmahane** (₺30.000, itibar 800).
- 12 yeni dekor: chester takımı, kitaplık, dev ficus, antika saat, neon logo, fotoğraf galerisi; kahve kavurma makinesi, kristal avize, kuyruklu piyano, akvaryum duvarı, pirinç tabela, sanat galerisi.

### Telefon düzeltmeleri
- Yatay telefonda bilgi şeridi küçük ve iki satırı geçmiyor; gün, saat, kira ekran dışına taşmıyor.
- Çıkış düğmesi telefonda küçük bir hap.
- Hazırlama ekranı açıkken sipariş kartı üstünü kapatmıyor: yatayda sağda duruyor, dikeyde alta ince şerit olup yalnız sırada bekleyenleri gösteriyor.
- Yıldız Teyze'nin uzun metinlerinde düğmeler hep görünür; öğretici balonu kendi içinde kayıyor.
- Sıradaki bir müşteri vazgeçip gidince hazırladığın siparişin ekranı artık yanıp sönmüyor, oynadığın adım sıfırlanmıyor.
- Yatay telefonda ana menü ekrana sığıyor.

### Yıldız Teyze ve öğretici
- Yıldız Teyze ilk gün tezgâhın önünde bekliyor; ona dokununca öğretmeye başlıyor. Diğer kahvelerden bahsetmiyor.
- Öğreticinin 4. adımında erken durdurursan çekme baştan başlıyor, Yıldız Teyze beklemen gerektiğini söylüyor.
- Yıldız Teyze'den sonra Devam'a basana kadar saat ve müşteriler duruyor.
- Hazırlama ekranının dışına dokununca ekran kapanıyor; müşteriye dokununca kaldığın adımdan devam ediyor.
- Kahve adları düzeltildi: "Pres kahve" ve "Filtre kahve" (French press ve V60 alet adları).

## v0.20 – 1 Kasım 2026

### Çekirdek çeşitleri
- **12 çekirdek:** Brezilya, Kolombiya, Etiyopya Yirgacheffe, Kenya AA, Guatemala Antigua, Kosta Rika Tarrazú, Honduras, Sumatra Mandheling, Peru, Yemen Mocha, Jamaika Blue Mountain, Panama Geisha.
- **Fiyatı etkiler, kaliteyi değil:** Brezilya ×1,0'dan Panama Geisha ×1,9'a kadar.
- **Açılış:** 2★ ve 3★ dükkanda, toplam satılan kahve sayısına göre sırayla açılıyor.

### Süt türleri
- İnek, laktozsuz, yulaf, soya ve badem sütü.
- İtibarla açılıyor (40 / 80 / 120 / 180). Bitki ve özel sütler siparişe +₺2–4 ekliyor.

### Siparişte belirtme
- Ek çekirdek ve süt açılınca müşteriler bunları siparişte söylüyor; sipariş kartında etiket olarak yazıyor.
- Hazırlarken seçim sırası: çekirdek → tarif → boy → süt (Türk kahvesinde şeker).
- Yanlış seçimde müşteri para ödemeden gidiyor.
- İstenen çekirdek, süt ya da şeker stokta yoksa müşteri "… bile yok!" deyip gidiyor.

### Espresso dışı kahveler
| Kahve | Gerekli alet | Hazırlanışı |
|---|---|---|
| **Türk kahvesi** | Bakır cezve | Teraziyle kahve ölç, cezvede karıştır, ocakta köpük kabarırken taşmadan ocaktan al. Sade / az / orta / şekerli; şekerler küçük malzemelerden harcanıyor. |
| **French press** | French press + su ısıtıcısı | Kaba kahve ölç, su dök (seviye çizgisi), 4 dakika demle (saat), pistonu bastır. |
| **Filtre kahve (V60)** | V60 seti + su ısıtıcısı | Filtreye kahve ölç, ön ıslatma (bloom), dairesel dök. |

- Bu kahvelerin adımlarında renkli çubuk yerine gerçek göstergeler kullanılıyor: terazi kadranı, köpük ölçeği, demleme saati, su seviyesi. Karıştırma, piston ve dökme gerçek hareketler.
- Otomasyon: Türk kahvesi makinesi (₺350) ve Filtre kahve makinesi (₺400, 2★).
- Aletler dükkanda, vitrinin solundaki demleme tezgâhında görünüyor.
- Yıldız Teyze artık "espressoyu ben öğreteyim, Türk kahvesi, French press ve filtre kahveyi tarif defterimden öğrenirsin" diyor.

### Hile modu (telefon)
- Telefonda ana menüde ekrana 3 kez hızlıca dokununca açılıyor; fareyle tıklama saymıyor.
- Telefonda panel küçük ve kaydırılabilir.

## v0.19 – 1 Kasım 2026

### Dükkan görünümü
- **Kamera:** bilgisayarda ve yatay ekranda dükkanın tamamı görünüyor (vitrin, kapı, tabelalar, tezgâh, masalar). Dik telefonda kamera tezgâha yakın.
- **"✨ Yeni!" vurgusu:**
  - Gün başlayınca o gün alınan her yeni ürün kendi yerinde gösteriliyor; ürünün kenarları altın renkli parlak bir ışıkla çevreleniyor.
  - Üstünde bir ok ve "✨ Yeni!" yazısı çıkıyor; birden fazla ürün sırayla gösteriliyor.
  - Yalnızca dükkanda görünen bir değişiklik varsa çıkıyor.
- **Satın alırken:** yönetim ekranı artık kapanıp açılmıyor; arkadaki dükkan hemen güncelleniyor.
- **Buzdolabı:** cam kapaklı, içi görünen bir dolap olarak arka tezgâhın üstünde duruyor.

### Çıkış ve kısayollar
- **Çıkış düğmesi:** "⏻ Çıkış" yazılı, sipariş kartıyla aynı genişlikte ve kartın hemen üstünde.
- **Çıkış penceresi:** düğmeler alt alta ve eşit boyda (Kaydet, Ana menüye dön, Çıkış, Vazgeç).
- **Esc:** oyun sırasında Çıkış penceresini açıyor ya da kapatıyor.

### Hile modu
- Panel başlığından tutup sürükleyerek istediğin yere taşınabiliyor; yeri hatırlanıyor.
- Gün sonu ekranlarının üstünde de görünüyor ve kullanılabiliyor.
- Yeni düğme: "☕ Sıradaki tarifi aç".

## v0.18 – 1 Kasım 2026

### Çıkış
- Oyunda sağ üst köşede her zaman bir **⏻** düğmesi var; gün sonu ekranlarında da görünüyor. Seçenekler:
  - Kaydet
  - Ana menüye dön
  - Çıkış
- Ana menüde **⏻ Çıkış** düğmesi var.
- Tarayıcı sekmeyi kapatmaya izin vermezse "Oyun kaydedildi, bu sekmeyi kapatabilirsin" ekranı çıkıyor.

### Siparişler ve kalite
- **Kötü sipariş:** ortalama kalite 50'nin altındaysa müşteri kahveyi almıyor, para ödemiyor ve itibar 3 düşüyor. Değerlendirme ekranı teslimden önce uyarıyor.
- **Yanlış sipariş:** yanlış tarif ya da boyda da müşteri para ödemeden gidiyor.
- **Bahşiş:** kaliteye bağlı; ortalama 80 ve üstünde bahşiş veriliyor.
- **Gün sonu hesabı:** "Yanlış sipariş" ve "Kötü sipariş (para ödemeden giden)" ayrı satırlarda.
- **Sağ üstteki kart:** sipariş hazırlarken **Sırada bekleyenler** bölümü var; müşterilerin yalnızca adı ve sabrı görünüyor.

### Fiyat ve bardaklar
- **Fiyat:** yalnızca tek ya da küçük boy için ayarlanıyor. Double fiyatı tekin %80 fazlası; orta ×1,25, büyük ×1,6. Diğer boyların fiyatı ekranda bilgi olarak yazıyor.
- **Shot bardakları:** espresso bardaklarının adı "Tek shot bardağı" ve "Double shot bardağı" oldu.
- **Hediye stok kalktı:** yeni oyunda yalnızca ilk güne yetecek shot bardakları var (10 tek, 5 double). Küçük malzemeler ve diğer bardaklar baştan satın alınıyor.
- **Yeni tarifin bardakları:** yeni tarif açılınca bardak türleri Tedarik listesine ekleniyor, hediye verilmiyor.

### Kira ekranı
- Kasadaki para yeşil kağıt para ikonuyla gösteriliyor.

## v0.17 – 1 Kasım 2026

### Hile modu (test için)
- **Açmak:** ana menüde klavyeden **cheat** yaz. Telefonda menü altındaki sürüm yazısına 5 kez hızlıca dokun.
- **Ayarlar:** bir kez açıldıktan sonra Ayarlar'da "🧪 Hile modu" kutusu çıkar; oradan açıp kapatabilirsin.
- **Hile paneli:** oyunda sağ köşedeki ikonların solunda duruyor; başlığına dokununca küçülüyor. Hileler:
  - +₺1000, +50 itibar, +100 XP
  - Siparişi kendisi yap
  - Müşteri getir
  - Günü bitir
  - Kira gününe atla
  - Stokları doldur
  - Tüm tarifler ve aletler
  - Dükkan seviyesi atla

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
