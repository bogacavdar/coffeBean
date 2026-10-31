# DEVAM.md – İlerleme ve Devam Notları

Son güncelleme: 2026-10-31

## Öncelik hatırlatması
"Acilen" / "kritik" denilen her istek, bu dosyadaki her şeyin önüne geçer (bkz. KURALLAR.md, Kural 3).
Her oyun teslimatı = zip + açılabilir hali (yayın bağlantısı güncellenir; Kural 4).

## Durum
| Alan | Durum |
| --- | --- |
| Tasarım dokümanı (Claude Docs, 12 bölüm) | Tamam |
| Tasarım dokümanı HTML (`Tasarim_Dokumani.html`) | Tamam – her değişiklikte yeniden üretilecek |
| KURALLAR.md / DEVAM.md | Tamam |
| Oynanabilir prototip (MVP, doküman bölüm 12) | v0.3 – `index.html`, `data.js`, `game.js`, `scene.js`, `closeup.js` |

## v0.3 – 31 Ekim 2026 (kullanıcı geri bildirimi: büyük/gerçekçi sahne, öğretici, efektler, zorunlu tedarik, ikon)
Doküman önce güncellendi (§2, §7, §8, §10, §11 → rev 23, `Tasarim_Dokumani.html` iletildi), sonra kod:
- `index.html`: tamamen tek tam ekran sahne mimarisine çevrildi. Sekme/nav kaldırıldı; `#hud` (gün/saat/para/itibar/yıldız/rütbe/stok), köşede `#icons` (Defter, Tedarik — rozetli), alttan açılan `#sheet` (tezgâh/mini oyun), tam ekran kartlar (`#ovBook`, `#ovShop`, `#ovLedger`, `#ovModal`).
- `scene.js`: sahne büyütüldü (10×8 kare) ve gerçekçilik artırıldı — vitrin + ışık huzmesi, kapı, menü tahtası, çekirdek rafı, sarkıt lambalar + ışık halesi, masa/sandalyeler, bitkiler, meşe zemin damarları. Müşteriler artık kapıdan girip kuyruğa/tezgâha yürüyor (`pos`→`target`), uçuşan efekt yazıları (`SCENE.addFx`) burada çiziliyor.
- `data.js`: `tutorial.steps` (her mini oyun için adım adım metin) ve `tutorial.first`/`done` eklendi; `economy`ye `milkPrice/milkPerCup/minBeans/minMilk/milkShelfDays` eklendi (zaten vardı, bu turda kullanılmaya başlandı).
- `game.js`: tamamen yeniden yazıldı.
  - İlk kahve öğreticisi (§10): oyunun ilk müşterisi sabırsız olmayan Nejla Teyze; sipariş alınınca her adımda `#tut` balonu + ilgili kontrolde `.pulse` vurgusu; öğretici bitene kadar başka müşteri gelmiyor (`day.tutorialActive`).
  - Efektler (§7): servis bitince müşterinin üstünde yükselen +₺ (yeşil), bahşiş (altın), itibar değişimi (kırmızı/yeşil) ve mükemmel serviste ★ efekti; sabrı biten müşteri kırmızı ✖ baloncuğuyla kapıya yürüyüp kayboluyor.
  - Zorunlu gün sonu (§2): `endDay()` artık önce `#ovLedger` (hesap tablosu) gösteriyor, "Tedariğe geç" ile `#ovShop` zorunlu modda açılıyor; en az 0,3 kg çekirdek (ve sütlü tarif açıksa 1 L süt) alınmadan "Yeni günü başlat" pasif kalıyor, overlay dışarı tıklayarak kapatılamıyor.
  - Süt (§8): dükkan panelinde ayrı bir kaynak olarak eklendi (₺15/L, kupa başı 0,2 L); buzdolabı ekipmanı MVP'de yok, bu yüzden gün sonunda kalan süt dokümana uygun şekilde sıfırlanıyor.
- Playwright ile uçtan uca test edildi: yeni oyun → gün aç → Nejla siparişi al → 4 mini oyun adımı → servis (para/itibar arttı, efekt metni ekranda) → öğretici bitiş modalı; ayrıca gün sonu → hesap → zorunlu tedarik → "Yeni günü başlat" akışı (buton kilitli/açık durumları) test edildi. Konsol hatası yok.

### Doküman eşleşme kontrolü (Kural 2) – v0.3
- Sipariş alınan müşteri tezgâh önünde sabit bir bekleme noktasına yürüyor (kod: `(2.6, 1.0)` iso koordinatı) – doküman bunu bir sayı olarak belirtmiyor, sahne yerleşiminin doğal bir parçası; dokümana eklemeye gerek yok (uygulama detayı, §11'in "tezgâh yakın planı panel olarak üstüne biner" cümlesiyle tutarlı).
- `closeup.js` (mini oyun yakın planları) bu turda değiştirilmedi; "daha gerçekçi" isteği öncelikle dükkan sahnesine uygulandı. Bir sonraki turda yakın planlar da aynı gerçekçilik seviyesine çekilebilir.

## Prototip MVP kapsamı (doküman §12) – kontrol listesi
- [x] Espresso, ristretto, macchiato, americano, lungo, cappuccino, latte, cortado tarifleri
- [x] 5 mini oyun: öğütme, dozlama, tamping, ekstraksiyon, süt köpürtme
- [x] 4 müşteri tipi: acelesi olan, öğrenci, meraklı, düzenli
- [x] Gün döngüsü, para, itibar, 3 dükkan seviyesi, haftalık kira
- [x] Brezilya ve Kolombiya çekirdekleri (tazelik dahil), ilk 4 ekipman
- [x] Kahve Defteri (tarif kartları, ipuçları, menşe sayfaları, günlük)
- [x] Kayıt/yükleme (localStorage), dışa/içe aktarma, ana menü

## Doküman eşleşme kontrolü (Kural 2) – v0.1
Kodda olup dokümanda açıkça yazmayan uygulama kararları (dokümana eklenmeli ya da koddan çıkarılmalı):
1. Tezgâh dışındaki ekranlarda (Dükkan, Defter) gün süresi durur. → Öneri: §2'ye bir cümle ekle.
2. Gün uzunluğu 150 sn (doküman "3–5 dk" diyor). → Prototip hızı; dokümana "prototipte 2,5 dk" notu ekle ya da 180 sn yap.
3. Ekstraksiyon ekranda 6× hızlı akar (mini oyun 3–8 sn kuralını sağlamak için). → §4'e not ekle.
4. Düzenli müşteri isimleri (Deniz, Ayşe, Mert, Zeynep, Can): Deniz dokümanda var, diğerleri yok. → Dokümana ekle ya da sadece Deniz kalsın.
Diğer her şey (sayılar, aralıklar, fiyatlar, puanlama formülü, açılış koşulları) dokümandaki tablolardan alındı.

## Test
- Headless Chromium ile tam sipariş akışı (5 mini oyun), gün sonu, seviye atlama, çekirdek alma, tarif açılımı denendi; konsol hatası yok.
- 390 px telefon genişliğinde yerleşim kontrol edildi.

## Görsel tarz kararı (31 Ekim 2026)
Kullanıcı seçti: **gerçekçi / foto-benzeri** + **izometrik dükkan**; referans yok, öneri bizden.
Doküman §11 güncellendi: izometrik dükkan sahnesi + gerçekçi tezgâh yakın planı (mini oyunlar) + fincan yakın planı.
Prototip **v0.2**: görsel katman eklendi (aynı bağlantıda yayınlandı).
- `scene.js`: izometrik dükkan sahnesi (meşe zemin, tezgâh, çelik makine, öğütücü, masalar seviyeye göre, vitrin ve gün ışığı, kuyruktaki müşteriler + baloncukta içecek ve sabır halkası). Müşteriye dokununca sipariş alınır.
- `closeup.js`: gerçekçi tezgâh yakın planı; 5 mini oyunun her biri için ayrı sahne (öğütücü/tane iriliği, portafiltre dolumu, tamper üstten, grup kafası + krema akışı, sütlük + buhar + termometre) ve servis sonrası 1 sn fincan yakın planı. İbreler yarı saydam ve küçük (§11).
- Tüm görseller şimdilik kodla çizilmiş gradyan/gölge; Blender render'ları geldiğinde aynı yerlere sprite olarak takılacak.

## Açık sorular
- Ekstraksiyon mini oyununda ağırlık + süre ayrı mı, tek ibre mi? (doküman §4) – prototipte tek birleşik ibre denendi.
- Motor varsayımı: vanilla JS + Canvas/DOM, GitHub Pages. Onay bekliyor.

## v0.4 – 31 Ekim 2026 (kullanıcı geri bildirimi: hata düzeltme + hız/denge + büyük HUD)
Önce doküman güncellendi (§2, §3, §9, §11 → rev 24, `Tasarim_Dokumani.html` iletildi), sonra kod:
- **Hata düzeltildi:** "Yeni oyun" butonu, var olan bir kayıt üzerine tıklandığında görünmez/tıklanamaz kalıyordu — sebebi `.overlay` (onay penceresi) z-index'inin `#menu`'den düşük olmasıydı (6 < 8), onay penceresi menünün arkasında açılıyordu. `.overlay` z-index 9'a çıkarıldı (`#menu`=8, `.overlay`=9, `.toast`=10). Playwright ile doğrulandı: var olan kayıtla "Yeni oyun" → onay düğmesi artık tıklanabilir ve oyun gerçekten sıfırlanıyor.
- **Gün kısaltıldı:** `DAY_SECONDS` 150→90 sn.
- **Daha az müşteri:** `shopLevels[].customersPerDay` 12/18/26 → 6/9/13 (§9 tablosunun altına kalibrasyon notu eklendi).
- **XP kolaylaştırıldı:** her serviste taban 5 XP + kaliteye göre bonus (önceden sadece kaliteye bağlıydı); mükemmel servis bonusu 20→25. Barista rütbesi XP eşikleri 500/2000 → 120/350'ye düşürüldü.
- **Seviye sistemi / tarif açılımı yeniden tasarlandı:** tarifler artık "ön koşulda 10 mükemmel servis" ile değil, doğrudan **barista XP eşiğiyle** (`unlockXp`, data.js) açılıyor — dükkan yıldızına da bağlı değil. Sıra: Espresso(0) → Americano(30) → Lungo(55) → Ristretto(80) → Macchiato(110, ilk sütlü) → Cortado(150) → Latte(195) → Cappuccino(245). Birkaç müşteri servis edince yeni bir tarif açılıyor; aynı kahveyi onlarca kez tekrarlama zorunluluğu kalktı.
- **HUD büyütüldü:** üst çubuk daha büyük punto/kalın yazı, para rakamı yeşil vurgulu, tam ekran sahnenin üzerinde tek bakışta okunur (§11).

### Doküman eşleşme kontrolü (Kural 2) – v0.4
Her sayısal değişiklik (gün uzunluğu, müşteri sayısı, XP eşikleri, unlockXp sırası) önce dokümana (§2, §3, §9) kalibrasyon notu olarak eklendi, sonra `data.js`/`game.js`'ye işlendi. Ek bir doküman dışı mekanik eklenmedi.

## Sonraki adımlar
1. Prototipi test et, hataları gider.
2. Kullanıcı geri bildirimine göre dokümanı güncelle → HTML'i yeniden ilet → kodu eşle.
3. Faz 2 kapısı: "5 oyuncu 3 günü bitirdi mi?"
