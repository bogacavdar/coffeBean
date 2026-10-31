# Çekirdek – Güncelleme Notları

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
