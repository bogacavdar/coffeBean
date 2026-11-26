# KURALLAR.md – Kahve Dükkanı Oyunu Çalışma Kuralları

Bu dosya projenin değişmez çalışma kurallarını tutar. Her oturumun başında okunur.

## Kural 1 – Tasarım dokümanı her zaman HTML olarak iletilir
- Tasarım dokümanında yapılan her değişiklikten sonra dokümanın güncel **HTML** hali üretilir; kullanıcıya **paketle birlikte** gönderilir (bkz. Kural 5–6).
- Dosya adı: `Tasarim_Dokumani.html` (proje kökünde, her seferinde üzerine yazılır).
- Canlı doküman (Claude Docs) kaynak; HTML onun dışa aktarımıdır. İkisi birbirinden farklı olamaz.

## Kural 2 – Dokümanda olmayan hiçbir şeyin kodda karşılığı olmaz
- Kodda yer alan her mekanik, içecek, müşteri tipi, ekipman, sayı ve aralık tasarım dokümanında yazılı olmak zorundadır.
- Yeni bir fikir önce dokümana eklenir, HTML'i iletilir, **sonra** kodlanır.
- Kodda dokümanla çelişen bir değer bulunursa doküman kazanır; kod düzeltilir.
- Her kod teslimatında kısa bir "doküman eşleşme kontrolü" yapılır ve DEVAM.md'ye not düşülür.

## Kural 3 – "Acilen" ve "kritik" öncelik kelimeleridir
- Kullanıcı bir istekte **"acilen"**, **"acil"** ya da **"kritik"** derse o istek o anda yapılan her şeyin önüne geçer.
- Önce o istek yerine getirilir ve teslim edilir; açıklama, plan, soru ve diğer işler sonraya bırakılır.
- Bu durumda yanıt en kısa yoldan verilir: tek satır bilgi + teslimat. Uzun gerekçe yazılmaz.
- Acil istek bittikten sonra yarım kalan işe kaldığı yerden dönülür ve DEVAM.md güncellenir.

## Kural 4 – Web sürümü donduruldu (26 Kasım 2026, kullanıcı: "web ile işimiz kalmadı")
- Web sürümü https://bogacavdar.github.io/coffeBean/ adresinde v0.47 olarak kalır; yeni özellik de hata düzeltmesi de almaz, GitHub Pages'e yeni yayın yapılmaz.
- Bütün geliştirme Godot sürümünde (`godot/` klasörü, aynı depo) yapılır. Godot sürümü web'de yayınlanmaz; oynanabilir hali Windows (sonra Android, Mac, iPhone) derlemesidir ve sabit indirme bağlantısıyla verilir: https://github.com/bogacavdar/coffeBean/releases/download/godot-deneme/CoffeBean_Godot_Deneme_Windows.zip
- Claude artifact / claude.ai bağlantısı oyunun oynanabilir hali olarak verilmez. Sadece zip göndermek eksik teslimattır: derleme GitHub Actions'ta üretilip bağlantı yenilenmeden paket "hazır" denmez.

## Kural 5 – Paket yalnızca kullanıcı "paket çık" deyince çıkılır
- Kullanıcı **"paket çık"** demeden ya da bir konunun **kritik/acil** olduğunu söylemeden paket ÇIKILMAZ.
- Aradaki tüm istekler kodda ve dokümanda yapılır, test edilir, ama yayınlanmaz: açılabilir bağlantı güncellenmez, zip gönderilmez, doküman HTML'i gönderilmez, GitHub'a gönderilmez. Biriken değişiklikler DEVAM.md'deki "Bekleyen paket" listesine yazılır.
- Her ara turda kullanıcıya sadece kısa bir "yapıldı, pakete eklendi" bilgisi verilir.
- "Paket çık" denince bekleyen her şey birlikte gönderilir (Kural 6).

## Kural 6 – Her paketin içeriği (Godot)
Her paket çıkışında kullanıcıya şunların hepsi birlikte iletilir:
1. Derlemenin **indirme bağlantısı** (Windows; Faz 1'den sonra Android APK da). Değişiklikler GitHub'a gönderilir, Actions derlemesinin başarıyla bittiği ve bağlantının yeni sürümü verdiği doğrulanır,
2. Tasarım belgesinin **HTML** hali (`godot/Tasarim_Dokumani_Godot.html`),
3. Kısa **güncelleme notları** (`Guncelleme_Notlari.md`: sürüm, tarih, bu pakette ne değişti).

Sürüm numarası `project.godot`'taki `config/version` ve oyun içindeki sürüm etiketinde güncellenir.
GitHub reposuna gönderim paketin zorunlu parçasıdır; gönderilmeyen paket çıkmış sayılmaz.

## Kural 7 – Testi kullanıcı yapar
- Normal geliştirme sürecinde test için kaynak ayrılmaz: Claude geliştirir, testleri kullanıcı yapar.
- Playwright/otomatik test, ekran görüntüsüyle kontrol vb. YAPILMAZ; yalnızca sözdizimi kontrolü (dosya açılıyor mu) gibi sıfıra yakın maliyetli kontroller yapılabilir.
- İstisna: kullanıcı "şu süreci test et" derse ya da "şurada bir hata var" diye bir hata bildirirse, hatayı bulmak/doğrulamak için gerektiği kadar test yapılır.
- Teslim mesajlarında "test ettim" denmez; neyin değiştiği ve kullanıcının neyi denemesi gerektiği yazılır.

## Kural 9 – Eşit zorluk: gösterge bölgeleri ibre hızıyla orantılıdır (değişmez)
- Her mini oyun adımında renkli bölgelerin (koyu yeşil, açık yeşil, sarı) genişliği, o adımdaki ibrenin/barın hızıyla orantılıdır: **bölge genişliği = ibre hızı × zaman penceresi** (tasarım dokümanı §4).
- Bir barın hızı artırılırsa bölgeler aynı oranda büyür, yavaşlatılırsa aynı oranda küçülür (tarif profili, alet, yükseltme ya da başka bir sebeple fark etmez).
- Hiçbir adımda bölgeler hızdan bağımsız, sabit bir genişliğe (ör. saniye cinsinden) ayarlanamaz. Yalnız bilinçli zorluk çarpanları (rütbe, hassasiyet yükseltmesi ×1,5, zorluk seviyesi, tarif profili ör. ristretto ×0,75) bunun üstüne uygulanır.

## Kural 8 – Uzun işlerde ilerleme bildirimi
- Uzun, çok adımlı işlerde (geliştirme paketi, test turu, rapor) ilerleme yaklaşık %20, %40, %60 ve %80'e ulaştığında kullanıcıya kısa bir durum mesajı gönderilir: yüzde, ne bitti, sırada ne var (1–2 cümle). Alt ajanlar (ör. grafik ajanı) da aynı şekilde ilerleme bildirir ve bu kullanıcıya aktarılır.

## Genel çalışma düzeni
- Her oturum: `KURALLAR.md` → `DEVAM.md` → iş.
- Her oturum sonunda `DEVAM.md` güncellenir (ne bitti, ne kaldı, açık sorular).
- Oyun Godot 4.7 ile yazılır (`godot/`); içerik verisi web v0.47'nin `data.js`'inden dönüştürülür. Web dosyaları (index.html, game.js, data.js…) donmuş kaynak olarak durur.
