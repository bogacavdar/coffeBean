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

## Kural 4 – Zip'in yanında her zaman açılabilir bir hali verilir (paket çıkıldığında)
- Oyunun her teslimatında zip dosyasının yanında, kurulum gerektirmeden **tıklayınca açılan ve oynanan** bir hali de verilir: yayınlanmış oyun bağlantısı (artifact) güncellenir ve kartı gösterilir.
- Bağlantı mümkün değilse tek dosyalık (tüm JS gömülü) `index.html` gönderilir.
- Sadece zip göndermek eksik teslimattır.

## Kural 5 – Paket yalnızca kullanıcı "paket çık" deyince çıkılır
- Kullanıcı **"paket çık"** demeden ya da bir konunun **kritik/acil** olduğunu söylemeden paket ÇIKILMAZ.
- Aradaki tüm istekler kodda ve dokümanda yapılır, test edilir, ama yayınlanmaz: açılabilir bağlantı güncellenmez, zip gönderilmez, doküman HTML'i gönderilmez, GitHub'a gönderilmez. Biriken değişiklikler DEVAM.md'deki "Bekleyen paket" listesine yazılır.
- Her ara turda kullanıcıya sadece kısa bir "yapıldı, pakete eklendi" bilgisi verilir.
- "Paket çık" denince bekleyen her şey birlikte gönderilir (Kural 6).

## Kural 6 – Her paketin içeriği
Her paket çıkışında kullanıcıya şunların hepsi birlikte iletilir:
1. Oyunun **zip** dosyası,
2. Oyunun **erişilebilir (açılabilir) bağlantısı** (yayın güncellenir),
3. Tasarım belgesinin **HTML** hali (`Tasarim_Dokumani.html`),
4. Kısa **güncelleme notları** (`Guncelleme_Notlari.md`: sürüm, tarih, bu pakette ne değişti).
Ayrıca GitHub reposuna gönderilir.

## Kural 7 – Testi kullanıcı yapar
- Normal geliştirme sürecinde test için kaynak ayrılmaz: Claude geliştirir, testleri kullanıcı yapar.
- Playwright/otomatik test, ekran görüntüsüyle kontrol vb. YAPILMAZ; yalnızca sözdizimi kontrolü (dosya açılıyor mu) gibi sıfıra yakın maliyetli kontroller yapılabilir.
- İstisna: kullanıcı "şu süreci test et" derse ya da "şurada bir hata var" diye bir hata bildirirse, hatayı bulmak/doğrulamak için gerektiği kadar test yapılır.
- Teslim mesajlarında "test ettim" denmez; neyin değiştiği ve kullanıcının neyi denemesi gerektiği yazılır.

## Genel çalışma düzeni
- Her oturum: `KURALLAR.md` → `DEVAM.md` → iş.
- Her oturum sonunda `DEVAM.md` güncellenir (ne bitti, ne kaldı, açık sorular).
- Prototip tek sayfa HTML5 + vanilla JS; içerik verisi `data.js` içinde (dokümanın 12. bölümü).
