# DEVAM.md – İlerleme ve Devam Notları

Son güncelleme: 2026-11-02

## Öncelik hatırlatması
"Acilen" / "kritik" denilen her istek, bu dosyadaki her şeyin önüne geçer (bkz. KURALLAR.md, Kural 3).
Paket yalnızca kullanıcı "paket çık" deyince (ya da kritik/acil) çıkılır; paket = zip + açılabilir bağlantı + doküman HTML'i + güncelleme notları + GitHub (Kural 5–6).
Testi kullanıcı yapar; geliştirme sırasında test yok, yalnız kullanıcı istediğinde/hata bildirdiğinde (Kural 7).

## Bekleyen paket (son yayın: v0.34) – sonraki sürüm v0.35
- **Otomatik aletler 100 puan** (kullanıcı isteği; önceden 85): `D.economy.autoScore` 100, ekipman açıklamaları ve hazırlama ekranı yazısı buna göre. Yardımcı barista 85'te kaldı (ayrı değer, `D.staff.assistant.score`).
- **Tarif seçimi gruplu + alfabetik:** `D.drinkGroups` (Espresso bazlı, Türk ve geleneksel, Demleme ve filtre, Soğuk ve buzlu, Kahvesiz), `drinkGroupsOf()`; grup içinde `localeCompare(…, "tr")`. Listede olmayan yeni tarif "Diğer"e düşer.
- **Dükkan sırasıyla açılım, sayaç durur:** `S.rp` (tarif ilerlemesi), `recipeProg()` / `recipeTick()`. Satışta yalnız sıradaki tarifin dükkanı yetiyorsa +1; `canUnlock`, HUD ve Defter `S.rp`'yi kullanır. Eski kayıtta durma noktasından başlar. Defter'de dükkan başına "n/N açık" satırları. Hile "Sıradaki tarifi aç" `S.rp`'yi eşiğe çeker.
- Doküman: Claude Docs (rev 144) §3 "Dükkan sırasıyla açılım", §7 "Elle hazırlamada tarif seçimi", §8 otomasyon 100 puan; `Tasarim_Dokumani.html` aynı değişikliklerle güncellendi.
- **Çekirdekler 5 dükkana eşit dağıtıldı** (kullanıcı isteği; 3·3·3·2·2): 1★ Brezilya, Kolombiya 20, Honduras 40 · 2★ Peru 70, Guatemala 85, Kafeinsiz 100 · 3★ Kosta Rika 140, Etiyopya 175, Kenya 210 · 4★ Sumatra 260, Yemen 320 · 5★ Jamaika 390, Geisha 415. `beanOpen` artık `recipeProg()` kullanıyor (dükkan dolunca durur), `openBeans`/sıradaki çekirdek dükkan+eşik sırasıyla. Doküman: Claude Docs rev 145 çekirdek tablosu (Kafeinsiz eksikti, ₺ değerleri ×9 ölçeğe çekildi) + HTML.
- Test yapılmadı (Kural 7); yalnız sözdizimi kontrolü.

## v0.34 – YAYINLANDI (2 Kasım 2026; kullanıcı telefonda "Merhaba…" balonunun yanıp söndüğünü bildirdi)
- Sebep: `SCENE.init` ve `CLOSEUP.init` GPU açıkken 2D bağlamı `desynchronized: true` ile alıyordu. Bu modda kare bitmeden ekrana basılabiliyor; v0.30'dan beri balon/rozet/etiket kare sonunda (`layoutOverlays`) çizildiği için en çok onlar yanıp sönüyordu. Masaüstü testlerinde (yazılım çizimi, GPU kapalı) görünmüyordu.
- Düzeltme: iki bağlamdan da `desynchronized` kaldırıldı. Başka değişiklik yok.

## v0.30–v0.33 – YAYINLANDI (2 Kasım 2026; kullanıcı telefonda dik ekran sorunlarını bildirdi)
Not: v0.30–v0.32 kullanıcıya yalnız zip olarak gitmişti, GitHub'a gönderilmemişti (Kural 4 ihlali). Kullanıcı adreste hâlâ v0.29'u görünce dördü birlikte v0.33 olarak main'e gönderildi.
- **v0.30 telefon dikey düzeni:** gizli "Anladım", kesik ana düğmeler, seçimde görünmeyen sipariş, kaydırma isteyen Devam, ekran dışındaki +₺5, yatay taşmalar, kenarda kesilen konuşma balonları, 8 hap HUD → 2 satır. Hazırlama paneli ekrana sığıyor, pencere düğme satırları sabit, tablolar telefonda kart düzeninde. Konuşma balonu yeniden tasarlandı (krem kart, en çok 2 satır, kuyruk konuşanın başına bakar). Balon/rozet/etiket çakışmasız yerleşiyor (`layoutOverlays`). Sahnede NaN donması da düzeltildi.
- **v0.31 yanıp sönme:** çakışınca gizlenen balon/rozet/etiket her karede açılıp kapanıyordu. Artık görünen yerini korur, gizlenen ancak 450 ms boş yer bulunca geri gelir; yürüyen müşterinin rozeti ve adı gösterilmez.
- **v0.32 gün başlamıyor:** Tedarik'te zorunlu eksik varken Devam sönüktü, EKSİK kutuları düğmeye benziyordu, alımda liste başa zıplıyordu. Eksik varken ana düğme "Eksikleri al · ₺…" (`fillMissingPlan()`), kaydırma korunuyor.
- **v0.33 dükkan ekrana sığıyor:** dik ekranda kamera bütün dükkanı (tabela, raflar, tezgâh, vitrin, kapı, masalar) ekran genişliğine sığdırıyor; küçük ölçekte rozet, ad ve dokunma alanı alt sınırlı. `sceneInsets()` artık `iconTop` da gönderiyor.
- Oyun dengesi değişmedi (Kural 9'a dokunulmadı). Kullanıcı hata bildirdiği için düzeltmeler telefon emülasyonunda doğrulandı (Kural 7 istisnası).
- Doküman eşleşme: değişiklikler yalnız arayüz ve kamera; mekanik/sayı değişmedi. `Tasarim_Dokumani.html` §11 telefon kuralları v0.30'da güncellendi. Claude Docs'taki canlı doküman henüz bu §11 değişikliğiyle eşitlenmedi (açık iş).

## v0.29 – YAYINLANDI (1 Kasım 2026, kullanıcı "paket çık" dedi)
- **Tuval içi hedef göstergesi (kullanıcı isteği):** ekstraksiyondaki küçük göstergeye benzer `CLOSEUP.zmeter(v, Z, {label,x,y,w})` eklendi; büyük çubuğun aynı renkli bölgelerini (sarı/açık yeşil/koyu yeşil, `o.z`) ve ibreyi gösterir. Öğütme ("hedef öğütüm"), dozlama ("hedef 18 g"), ekstraksiyon (sabit ±2 g bandı yerine gerçek bölgeler), süt ("hedef 60–65 °C", solda), sıcak su ("hedef seviye"), latte art ("doluluk %65–80" / "kesim: tam orta") adımlarında. Kural 9 gereği bölgeler ibre hızıyla orantılı `o.z`'den gelir. Göstergeli (dial/ring) adımlarda bölgeler zaten çizimin üstünde.

## v0.28 – YAYINLANDI (1 Kasım 2026, kullanıcı "acilen çöz" dedi)
- **Gün sonu donması:** `#ovModal` (gazete) dışına dokunma ya da Esc › Vazgeç ile kapanınca `endCtx` dolu ama hiçbir ekran yok → donmuş görünüm; "Günü başlat" da yanlış çalışıyordu. `resumeEndFlow()` akışı `dayFlow`/`endCtx`'e göre yeniden açar (hub, fiyat, tedarik, gazete ya da hesap); 700 ms'lik emniyet `setInterval`'i ekran kalmadıysa çağırır; `#openDay` `endCtx`/`mandatoryRestock` varken gizli, tıklanırsa akışı açar. Kullanıcı bildirdiği için yeniden üretilip doğrulandı (Kural 7 istisnası).
- **Para kutusu:** yeşil kağıt paralı kasa kutusu (`cashBox()`) Tedarik'in yanı sıra Dükkan, Fiyatlar, Krediler ve Ana hedef ekranlarında da. Tüm ₺ tutarları `tl()` ile binlik ayraçlı (tr-TR).
- **Gazete yalnız menüdeki kahveleri yazıyor:** `updateMarket()` haber listesini açık ve aleti alınmış tariflerle sınırlıyor (endeksler arka planda tüm tarifler için değişmeye devam ediyor). Kullanıcı isteği.

## v0.27 – YAYINLANDI (1 Kasım 2026; kullanıcı kararı: buzdolabı 1★'da satın alınabilsin, hemen yayınla)
- `newState` artık `equipment: {}`; `begin()`'deki zorla `fridge = true` kalktı. Tek seferlik göç (`S.fridgeFix`): 1★ ve `S.fridgePaid` yoksa `equipment.fridge` silinir (v0.24–0.26'nın bedava verdiği). Satın almada `S.fridgePaid = true`. `D.equipment.fridge` stars 1, ₺3.600.
- Kullanıcı kararı: süt buzdolabısız 2 gün (`D.economy.milkShelfNoFridge`), buzdolabıyla 6 gün (`milkShelfDays`). `endDay` bozulma koşulu buna göre; Tedarik metni de.

## v0.26 – YAYINLANDI (1 Kasım 2026, kullanıcı "kritik çöz" dedi)
- **Teslim et çalışmıyordu:** v0.24'te `data.js`'teki `extrasStart` satırının sonuna eklenen `//` açıklaması aynı satırdaki `extrasLow` ve `extraTip`'i yorum içine almıştı → `serve()` içinde `D.extraTip[...]` TypeError. Satır düzeltildi. v0.22 data.js ile anahtar karşılaştırması yapıldı, başka kayıp anahtar yok. Hata kullanıcı bildirdiği için öğretici teslimi otomatik olarak doğrulandı (Kural 7 istisnası).
- Ders: bir satırın ORTASINA açıklama eklenmez; açıklama satırın en sonuna ya da ayrı satıra yazılır.

## v0.25 – YAYINLANDI (1 Kasım 2026, kullanıcı "kritik paket çık" dedi; KURALLAR Kural 9 eklendi)
- **§4 eşit zorluk kuralı geri getirildi (kullanıcı bildirdi):** v0.24'te ekstraksiyon bölgeleri saniyeye göre sabit büyütülmüştü (±1,5/±3/±5 sn); ibre yavaş olduğu için bölgeler kurala aykırı biçimde büyüktü. `uiZone`'daki özel ekstraksiyon bloğu kalktı; bölgeler yine `zoneSet` (ibre hızı × zaman penceresi). Ristretto `extractZone` ×0,75 korunuyor. Kumda Türk kahvesinde ibre yavaşlatılınca (`o.spd` 0,65) bölgeler de aynı oranda daralıyor (genel kural: `o.spd ≠ 1` → bölgeler ×`o.spd`). Ekstraksiyon ekranındaki pencere metni artık bölgelerin gerçek genişliğini gösteriyor. Doküman §0'a "Eşit zorluk" satırı eklendi.

## Sonraki sürüm için öneriler (barista raporlarından kalan)
- Sipariş değiştiricileri: ekstra shot, kakaosuz/kakaolu, şekersiz şurup, kuru/ıslak cappuccino, "burada mı paket mi" + porselen fincan ve bulaşık.
- Eleştirmen, turist ve sosyal medya fenomeni müşteri tipleri (turist cümleleri `orderLines.tourist`'te hazır, kullanılmıyor).
- Yeni aletler (kum ocağı, dallah, olla, bez filtre, Hint filtresi, Kalita, Kyoto kulesi, el köpürtücü) dükkan sahnesindeki raflarda henüz çizilmiyor (`scene.js` `wallShelf`/`coldStation` anahtarları + `TH_ITEMS` küçük resimleri).
- Sabah kalibrasyonu (dial-in) ve gün sonu temizlik (backflush) mekaniği.
- Tasarım dokümanının eski bölümleri (§2, §8, §9 tabloları) v0.24 değerlerine göre sadeleştirilmeli; şimdilik en üstteki "0. Güncel geçerli değerler" bölümü geçerli.

## v0.24 – YAYINLANDI (1 Kasım 2026, kullanıcı "sağlam bir paket çık" dedi; barista raporlarına göre gerçekçilik paketi)
Barista raporları: "CoffeBean v0.22 – Barista Gözüyle İnceleme" ve "Hile Modu Kahve Testi" (Claude Docs). Kullanıcı kararları: gerçek TL (×9), gün 150 sn + sabır ×1,5, verim terazili ekstraksiyon, alkollü klasikler yalnız alkolsüz şuruplu.
- **Ekonomi:** `data.js` sonundaki ölçek bloğu fiyat/kira/kredi/dekor/alet/görev ödüllerini ×9 çarpıp okunaklı yuvarlar (`D.econScale`); `begin()` eski kayıtları bir kez çevirir (`S.econ`). Fiyat düğmeleri ±₺5 (`D.pricing.stepTL`). Kira kredisi yuvarlaması `D.economy.rentLoanStep`. Gün kapanışında `L.spend` ("Alımlar") ve "Günün neti"; `buy()` `S.spend`'i sayar.
- **Tempo:** `DAY_SECONDS = 150`; müşteri sabrı ×1,5; `shopLevels[].interval` ×150/90.
- **Espresso:** boy dozları tek 9 g / double 18 g / S-M-L 18 g (`sizes[].bean/dose`); öğretici double. Ekstraksiyon bölgeleri `uiZone`'da saniye cinsinden (±1,5 / ±3 / ±5 sn, ristretto ×0,75); `CLOSEUP.extract(..., { tWin })` hedef gram + ön ıslatma. Lungo blond ve ristretto hız profili kalktı. PID adı "Sıcaklık kontrolcüsü".
- **Süt:** `drinks[].milkL` + `milkUse(id,size)`; `beanUse(id,size)` + `noBean`; `milk: "hot"`. `boiler` aleti ve latte/cappuccino `pressure` adımı kalktı; latte/cappuccino/flat white/piccolo `shop` şartı kalktı. `stepsFor`: art varsa `pour` yerine geçer. Buzdolabı baştan (`newState` + göç).
- **Tarif düzeltmeleri:** americano/long black kettle'sız; buzlu americano sırası; Türk ailesine `tkserve`; menengiç/kenger `mndose` + kahvesiz; dalgona/Yunan frappé `instant`; cold brew `S.cbBrewing` (gece demlenir, `startDay`'de hazır); melange kremasız; tek şeker stoku (`specStock("sugar")` → `S.extras.sugar`, `specName`); kakao serpici 1★, shaker 3★.
- **37 yeni tarif** (`data.js`, "v0.24 yeni tarifler" bloğu), mevsimler (`D.seasons`, `seasonNo()`, `inSeason()`, `drinks[].season`), kafeinsiz çekirdek, 12 yeni özel malzeme, 8 yeni alet; yeni MG adımları `mndose, mirraboil, tkserve, coldfoam, colddrip, tumbler, cloth, steepcup, dust`.
- **Görseller (`closeup.js`):** `v60(..., type)` 9 demlik; `press(..., "aeropress")`; cezve `opt {liquid, powder, vessel}`; `water/pour/milk` seçenekleri; kit düzeltmeleri + 7 yeni tür; tüm çizim dışa aktarımları save/try/restore ile sarılı (çizim hatası oyunu durduramaz). Klasik V60 dozunda tartı kadranı ekrana alındı.
- **Hile:** "🧾 Tarif seçip müşteri getir", "⏸ Saati durdur / başlat" (`window.CB_FREEZE`).
- Doküman: `Tasarim_Dokumani.html` başına "0. Güncel geçerli değerler (v0.24)". Kural eşleşme notu: yeni tariflerin tamamı §0 + Güncelleme notlarında; ayrıntı data.js.
- Not: Bu paket kullanıcı isteğiyle grafik ve bütünlük kontrolü için otomatik çizim çağrısı ve yükleme denemesiyle kontrol edildi (Kural 7 istisnası: kullanıcı test turu istemişti).

## v0.23 – YAYINLANDI (1 Kasım 2026; hile modu testinde bulunan buglar)
- Oyun donması (hareket adımından sonra ibreli adım kurulmadan çiziliyordu; `finishStep` `o.tgt/o.z` sıfırlar, `stepTick` erken döner, `tick` try/catch), "Stokları doldur" özel malzemeleri dolduruyor, gün tekrarı kapandı (`S.endPending`), pencereler açıkken zaman duruyor (`dayPaused()`), öğretici müşteri küçük malzeme harcamıyor, Çıkış düğmesi çakışması, çelişen sipariş cümleleri, americano kartı, Tedarik'te biten küçük malzeme uyarısı.

## v0.22 – YAYINLANDI (1 Kasım 2026, kullanıcı "yap ve paket çık" dedi)
Doküman rev 142. Test yapılmadı (Kural 7).
- **Herkes her açık kahveyi ister:** `D.customers[*].wants` kalktı; menü = açık + aleti var + özel malzemesi stokta (`specStock>0`). Yeni açılan kahve 3 gün %35 olasılıkla seçilir (`S.unlockDay[id]`, `checkUnlocks` ve hile "sıradaki tarif" yazar).
- **Tipe göre küçük malzeme:** `D.customers[*].extras` çarpanları (yaşlı tatlandırıcı ×9 / şeker ×0,5; öğrenci şeker ×2,2, çubuk, pipet; iş adamı tatlandırıcı ×6; meraklı neredeyse hiç); buzlu bardakta pipet %90. Sabır/bahşiş zaten tipe göre.

## v0.21 – YAYINLANDI (1 Kasım 2026, kullanıcı "paket çık" dedi; 34 kahve tek pakette)
Doküman rev 141. Test yapılmadı (Kural 7); tüm yeni küçük resimler ve tam donanımlı 5★ sahne hata vermeden çiziliyor (otomatik çizim).
- **Telefon düzeni:** yatay telefon için `@media (orientation:landscape) and (max-height:520px)` (HUD sarar, xp hapları gizli; Çıkış küçük hap; sipariş kartı 250 px, hazırlarken `#sheet` sağdan ona yer bırakır; küçük menü). Dikeyde Çıkış küçük hap, hazırlarken kart alta şerit (yalnız sıra; `body:has(#sheet.on)`), `#tut` en fazla 20vh kayar. Medya blokları `</style>` öncesine taşındı (önceden sonraki temel kurallar eziyordu). `modal()` metni `.mtext` (kayar), düğmeler `.mrow` (altta sabit).
- **Yanıp sönme:** `leave()` sıradaki müşteri gidince artık `renderBench`/`stopLoops` çağırmıyor, `day.active` aynı siparişte kalıyor; yalnız iptal olan sipariş ekranı yeniler.
- **Dünya kahveleri (34 yeni tarif):** long black 36 … nitro cold brew 420 (`unlockCups`, `shop` 1–5★); tam liste dokümanda §6. Yeni adımlar `closeup.kit(kind)` (pump, drizzle, cream, scoop, pourshot, garnish, ice/coldwater/coldmilk/tonic/coldpour/spoontop, whisk, blend, shakeit, mokafill/mokaheat, apsteep/phin, appress/siphondrop, siphonheat, nitrotap) ve `taps` act. Özel malzemeler `D.specials` → `S.syr[k]`, `specNeeds/useSpecials/specialOpen`, `PUMPS`; eksikse "… bile yok!". Tedarik'te "Şuruplar, soslar ve özel malzemeler" + cold brew demleme (0,2 kg Brezilya → 10 bardak). Yeni aletler (14), bardaklar (`tkCup`, `iceS/M/L`, `affoBowl`), boylar (`iS/iM/iL`, `affo1/2`).
- **Dükkan 4★ / 5★:** "Şehir kahvecisi", "Kahve evi & kavurmahane"; 4★/5★ dekor (12). Sahnede `wallShelf` (sol duvar rafı, z 156) ve `coldStation` (tezgâh ucu, y 1+CL+,05, x 1,0–2,3); çöp kutusu x ,6'ya; `DECOR.d5roaster` (6,9 / ,15) + d4/d5 takma adları; `TH_ITEMS` yeni aletler, dekor ve `sp:` malzemeler.
- **Ad düzeltmesi:** kahve adları "Pres kahve" (French press demlikle) ve "Filtre kahve" (V60 ile); alet adları aynı.
- **Hazırlama ekranından çıkış:** `#sheet` arka planına dokununca ekran kapanır, sipariş kaldığı yerde bekler (`o.hidden`; oynanan adım duraklar, o adım yeniden başlar); müşteriye dokununca (`#scene` hitTest) devam. Öğreticide kapanmaz.
- **Yıldız Teyze sonrası:** veda penceresinde Devam'a kadar `tutorialActive` açık (saat/müşteri durur).
- **Öğretici 4. adım:** erken DURDUR → çekme baştan (`phase ready`, v 0), `D.tutorial.extractEarly`.
- **Yıldız Teyze baştan tezgâhta:** ilk gün `queueSlot(0)`'da doğar, balonu "Hazırsan başlayabiliriz evladım, bana dokun."; sipariş cümlesi yok.
- **Yıldız Teyze açılışı açık uçlu:** "Ben sana espressoyu öğreterek başlayayım; gerisini zamanla sen halledersin. Tarif defterim de köşede duruyor." (diğer kahvelerden bahsetmiyor).

## v0.20 – YAYINLANDI (1 Kasım 2026, kullanıcı "hepsini ekle paket çık" dedi)
Doküman rev 127. Test yapılmadı (Kural 7); yeni oyun açılışı ve Tedarik ekranı hata vermeden açılıyor (otomatik tıklama).
- **Çekirdek ve süt çeşitleri:** `D.beans` 12 çekirdek (`unlock` yıldız, `cups` satış eşiği, `mult` satış çarpanı, `grindT`), `D.milks` 5 süt (`rep`, `extra`). `beanOpen/openBeans/openMilks/multiBeans/multiMilks`, stok `S.beans[id].kg`, `S.milk` + `S.milkAlt`; `useBean/useMilk`. Müşteri `c.bean` (%40 Brezilya), `c.milk` (%60 inek); `orderName` / `orderPrice` (taban × çekirdek + süt ek ücreti). Seçim sırası çekirdek → tarif → boy → süt; yanlışsa ödemesiz. Stok yoksa "… bile yok!" (−3, `st.nostock`). Tedarik'te tüm açık çekirdek/süt + sıradaki kilitli ipucu; zorunlu yalnız Brezilya ve inek sütü. `checkBeanMilkUnlocks()` haber penceresi. "kullan" düğmesi kalktı (`S.bean` hep brazil).
- **Espresso dışı kahveler:** `turkish` (cezve; `tkdose` terazi, `tkstir` act, `tkfoam` sweep köpük ölçeği; şeker `c.sugar` + `D.sugarLevels`, `S.extras.sugar` harcanır), `frenchpress` (`fpdose`, `fpwater`, `fpsteep` saat, `fpplunge` act), `filter` (`fdose`, `bloom` act, `pourover` act). Boy `tk` (Türk kahvesi fincanı `tkCup`). Gösterge adımları `dial: true` (bar yok, zonlar closeup'ta; tuval dokunuşu yalnız osc). Aletler `cezve`, `frenchPress`, `v60`; otomasyon `tkMachine`, `filterMachine`. Sahnede `brewBar` (x 2,54–3,39, y ,22–,92); pencere tabureleri x 3,7'den başlıyor. Yıldız Teyze intro güncel.
- **Telefonda hile:** menüde 3 parmak dokunuşu (`pointerType touch`), küçük kaydırılabilir panel.

## v0.19 – YAYINLANDI (1 Kasım 2026, kullanıcı "paket çık" dedi)
Doküman rev 123. Test yapılmadı (Kural 7); vurgu ve kamera bir ekran görüntüsüyle kontrol edildi.
- **Parlak kenar vurgusu:** `itemLayer(k)` ürünü ayrı tuvale çizer, altın siluet 8 yöne gölgeli basılır, ürün üstte net.
- **"Yeni" vurgusu doğru yerde:** `SCENE.highlight(key, gecikme)` ürünün `TH_ITEMS` konumunda (z dahil) parlayan halka + ok + yazı, ~4 sn; `flushNewFx` sırayla.
- **Kamera:** yatay ekranda tüm dükkan kadrajda (`TW = min(84, W/18,5, (H−30)/13,6)`), dik telefonda eski yakın kadraj.
- **Buzdolabı görünür:** cam kapaklı, arka tezgâhın üstünde (y 5,95); otomatik süt köpürtücü y 3,62'ye taşındı.
- **Hile:** "☕ Sıradaki tarifi aç" (`nextRecipe`).
- **Yeni yalnız görselse:** `showPurchase` `SCENE.itemPos(key)` yoksa yalnız "… alındı".
- **Satın almada panel kapanmıyor:** `showPurchase` yalnız bildirim + `pendingNew`; `startDay` → `flushNewFx()` yeni ürünlerin üstünde "✨ Yeni!".
- **Hile gün sonunda:** `#cheats` z 12 (ekranların üstünde); `refreshOpenScreen()` açık Kira/Hesap/Tedarik/Dükkan/Fiyatlar ekranını yeniler.
- **Hile paneli sürüklenir:** başlıktan tut-sürükle (6 px eşik; kısa dokunuş küçült/büyüt), yer `cb_cheatPos`.
- **Çıkış düğmesi:** "⏻ Çıkış" yazılı, sipariş kartı genişliğinde (340 px / telefonda %46), kartın hemen üstünde (masaüstü top 66, kart top 124; telefonda 8 / 56).
- **Esc:** oyun sırasında Çıkış penceresini açar, açıkken kapatır (`exitOpen`).
- **Çıkış penceresi:** düğmeler alt alta, eşit genişlik ve yükseklik (58 px) (`.row.col`); sıra Kaydet, Ana menüye dön, Çıkış, Vazgeç.

## v0.18 – YAYINLANDI (1 Kasım 2026, kullanıcı "paket çık" dedi)
Doküman rev 112. Test yapılmadı (Kural 7).
- **Çıkış:** sağ üst `#exitBtn` (z 10, gün sonu ekranlarının üstünde) → modal Kaydet / Ana menüye dön / Çıkış; menüde `#btnQuit`; `quitGame()` kaydeder, `window.close()` dener, olmazsa `#quitScreen`. `#ovModal` z 11; HUD sağ boşluk; telefonda sipariş kartı top 60.
- **Kartta sıradakiler:** `queueHTML()` (ad + sabır çubuğu `qpat<id>`), `updOrderBars` sıra değişince kartı yeniler (`queueSig`).
- **Boy fiyatları:** fiyat yalnız tek/küçük boydan ayarlanır; `sizePrice` = taban × boy çarpanı (double 1,8 = +%80, orta 1,25, büyük 1,6). Fiyatlar ekranında diğer boyların hesaplanan fiyatı bilgi olarak; maliyet `sizeCost`; `rollReaction(id, size)`.
- **Ad:** espresso bardakları "Tek shot bardağı" / "Double shot bardağı".
- **İlk gün fincanları:** `startCups {espS:10, espD:5}` (yalnız ilk gün için); Devral → stok yeterliyse doğrudan `startDay`, değilse `openFirstSupply`.
- **Hediye yok:** `startCups {}`, `extrasStart 0`, tarif açılınca bardak hediyesi kalktı (yalnız listeye eklenir). İlk gün: Devral → `openFirstSupply()` (Tedarik, düğme "Günü başlat ☕" → `startDay`). Eski kayıt göçleri eskisi gibi hediye verir.
- **Yeni tarifin bardakları:** `cupsKnown()` (tüm açık tarifler) Tedarik listesinde ve stok özetinde; `checkUnlocks` yeni bardak türüne 1 paket hediye + modalda not. Zorunlu min 3 hâlâ `cupsNeeded()` (menüdekiler).
- **Kötü sipariş:** `D.economy.refuseBelow` 50; altında müşteri almaz, para yok, −3, `D.badLines`, `st.bad`; değerlendirme ekranında uyarı. Bahşiş artık kaliteye (≥80) bağlı, hız çarpanıyla. Hesapta "Yanlış sipariş / Kötü sipariş (para ödemeden giden)".
- **Kira ekranında para ikonu:** `BILL` / `cashBox()` ortak (Tedarik + Kira).

## v0.17 – YAYINLANDI (1 Kasım 2026, kullanıcı "yaptıktan sonra hemen paket çık" dedi)
Doküman rev 95. Test yapılmadı (Kural 7).
- **Hile modu:** menüde `cheat` yazmak ya da `#menuVer`'e 5 dokunuş → `cb_cheatUnlocked`; Ayarlar'da aç/kapa (`cb_cheat`). Sağda `#cheats` paneli (`CHEATS`: para, itibar, XP, siparişi kendisi yap `cheatAutoOrder`, müşteri getir, günü bitir `cheatEndDay`, kira gününe atla, stokları doldur, tüm tarifler/aletler, dükkan seviyesi).

## v0.16 – YAYINLANDI (1 Kasım 2026, kullanıcı "paket çık" dedi)
Doküman rev 94. Test yapılmadı (Kural 7).
- **Türkçe ad:** Tamping → Temperleme, tamper → temper (Tartılı temper, Otomatik temper); data.js, game.js, doküman.
- **Eşit zorluk:** `zoneSet(step, spd)` yarı genişlik = hız × `D.zones.time` (0,0267 / 0,0667 / 0,133 sn) × rütbe × widen × zorluk; `stepMult` kaldırıldı; en küçük koyu yeşil %0,3. Ristretto: bölge × hız (1,5) × 0,6.
- **Otomatik kayıt + Devam:** `pagehide` / `beforeunload` / `visibilitychange(hidden)` → `save()`; menüde en üstte `#btnResume` (en son `savedAt` olan, iflas etmemiş yuva; `latestSlot()`), altında yuva/gün/para; Yeni oyun artık ikincil.

## v0.15 – YAYINLANDI (1 Kasım 2026, kullanıcı "paket çık" dedi)
Doküman rev 76. Test yapılmadı (Kural 7).
- **Zorluk:** `D.difficulty` (easy/normal/hard: patience, zone, cost, startMoney), `S.diff`, `DF()`, `SP(x)` tedarik fiyatı; `chooseDifficulty` yuva seçiminden sonra; `zoneSet` ve `spawnCustomer` çarpanları; varsayılan satış fiyatı (`unitCost`) taban maliyetle.
- **İlk gün otomatik:** `begin()` Yıldız Teyze açılışında Devral → `startDay()` (açılış görülmüşse 0,4 sn sonra); `#openDay` ilk gün gizli.
- **Gün sonu geri:** `endCtx` (dayNum, st, L, repDelta, advanced); Hesap/Gazete/Tedarik/Dükkan/Fiyatlar'da ← Geri (`backToRent`, `backToLedger`, `backFromSupply`); `openRestock` günü yalnız bir kez ilerletir.
- **Self servis standı:** `scene.js` `extrasStand(st.extras)` (x .98–2.43, y .15–.75; doluluk stok/30), `exItem`; küçük resimler `ex:<k>`; Tedarik'te resimli.
- **Küçük malzemeler:** `D.extras` (sleeve %90 yalnız karton bardak, napkin %60, sugar %35, stirrer %30, sweetener %5, straw %5; oranlar gizli), `S.extras` (başlangıç 20). `serve` her malzemeyi oranla kullanır; yoksa `miss` cümlesi + bahşiş ×`extraTip` (1 / 0,3 / 0). Tedarik'te "Küçük malzemeler" kutusu (az kaldı < 10), gün sonu hesabında sayısı.
- **Fiyat elle (lira):** `S.priceTL[id]` (yoksa varsayılan × eski `S.prices` oranı); Fiyatlar ekranında yalnız maliyet + −₺1 / kutu / +₺1 (en az 1, en fazla varsayılan×2). Yüzde, varsayılan, borsa ve beklenen tepki gösterilmiyor (`reactionText` silindi); tepkiler yalnız dükkanda.
- **Satın alınca dükkanda gör:** `showPurchase(key, name)` paneli ~1,9 sn kapatır, sahneyi canlı çizer, `SCENE.itemPos(key)` üstünde "✨ Yeni!"; dekor listesi fiyata göre artan.
- **Kira ekranı (gün sonu ilk ekran):** `showRent(dayNum, L, next)` → sonra `showLedger`. Kira artık otomatik kesilmiyor; `S.rentPaidWeek` (= `weekNo`) ile haftalık ödeme. Kirayı öde / 🏦 Kredi çek (`openLoans`) / Sonra ödeyeceğim (kira günü yok). Kira günü para + alınabilecek en büyük kredi yetmezse `bankrupt`. HUD "Kira ödendi ✓".
- **Espresso/ristretto/lungo zorluk profilleri:** `D.drinks[*].profile` (`grind` hedef kayması ±12, `extractSpeed`, `extractZone`, `blond`). Ristretto çekmede ibre ×1,5 ve bölgeler ×0,6. Lungo çekmede ikinci hedef (`o.blond`, hedefin %62'si) + "💧 Akışı yumuşat" düğmesi (`#zB2`); kaçırırsa 0, çekme puanı iki aşamanın ortalaması.

## v0.14 – YAYINLANDI (31 Ekim 2026, kullanıcı "yayınla" dedi)
Doküman rev 67. Test yapılmadı (Kural 7).
- **Hazırlarken sabır:** `takeOrder` sabra +%50 (`c.patienceTop`); `tick` sipariş verenlerin sabrını da düşürür, biterse `leave(c, true)` (iptal, −5, "Bu kadar beklenmez! İptal!").
- **Sipariş kartı büyüdü:** tarif adı + ayrı boy etiketi (`.osize`, Tek/Double/Küçük/Orta/Büyük) + sabır çubuğu (`updOrderBars`).

## v0.13 – YAYINLANDI (31 Ekim 2026, kullanıcı "hepsini yap paket çık" dedi)
Doküman rev 66 (HTML dışa aktarımdan yenilendi). Oyun testi yapılmadı (Kural 7); yalnız sözdizimi ve sahne/küçük resim çiziminin hata vermediği kontrol edildi.
- **Öğretici, öğütme ve tamping:** adım açılınca ibre durur, Yıldız Teyze balonunda **Anladım** düğmesi çıkar (`o.phase = "intro"`, eylem düğmesi kapalı). Anladım'dan sonra ibre 0'dan başlayıp bir kez gidip gelir (`o.bounces >= 2`), sonra koyu yeşilde sabitlenir, `#zRes`'te büyük "Tam şimdi!" yazısı çıkar ve düğme açılır.
- **Öğretici, dozlama ve çekme:** aynı şekilde önce anlatım ve Anladım; Anladım'a kadar BASILI TUT / BAŞLAT kapalı, sonra açılıp yanıp sönüyor.
- **Seçim ekranı:** müşterinin siparişi artık seçim ekranında yazmıyor ve önceden seçili gelmiyor (`sel.drink = null`); başlık "Siparişi hazırla", sipariş yalnızca sağ üst kartta. Boylar tarif seçilince çıkıyor.
- **Tedarik'te kasa:** üstte yeşil çerçeveli `.cash` kutusu, SVG yeşil kağıt para ikonu ve 32px yeşil tutar.
- **Sahne (scene.js baştan):** `vgrad` ile yüz ışık geçişi, `cyl` silindir, `wallText`/`wallRect` duvar düzlemine çizim; lambri, AO, cam yansıması. `CLEN(lv)` tezgâh 5/6/7. `backCounter` (fridge, kettle, milkKit, thermoPitcher, pourPitcher, cocoa, boiler, autoMilk), `machine(x,y,f)` (pidGauge, steamWand), `superAuto`, `grinder(f)` (grindPrecise, autoGrind, scaleGrind), `counterTools` (precScale, scaleTamp, autoTamp), `cupStacks`, `pastryCase`, `register`; `trafficDeco(T)` (c1–c3, f1–f3); `DECOR` 18 öğe; `TABLES` dükkana göre + 3★ ortak masa; lamba sayısı level×2. Barista yeniden (yazı yok). Müşteriye kol/ayakkabı.
- **Küçük resimler:** `SCENE.thumb(key)` aynı çizim fonksiyonlarını küçük tuvale çizer (`TH_ITEMS`, ölçek tablosu `SC`); anahtarlar `eq:`, `tool:`, `decor:`, `tr:cust1..3/freq1..3`, `staff`, `sup:bean`, `sup:milk`, `cup:<tür>`. `game.js` `th(key)`.
- **Dekor dükkana özel:** `D.decor[*].stars`; `activeDecor()` yalnız bu dükkanın dekoru; itibar toplamı gün sonunda (`L.plant` = dekor itibarı).
- **Hareket adımları:** `MG` `mode:"act"` (`act: circle|shake|hold`), `uiAct`; yeni adımlar `stir`, `swirl`, `pour`; `cocoa` artık çalkalama. CLOSEUP `shake/stir/swirl/pour`. `stepsFor` art'ı swirl'den sonra ekler.
- **Puan:** `zoneScore` dışı 0; `orderQuality` çekirdek tazeliği eklemez.
- **Sipariş söyleme:** `layout()` öndeki müşteri kasaya varıp (`atDesk`) makine boşken (`free`) söyler; söylemeden dokunulursa uyarı.
- **Canlı paneller:** `.card` büyük yazı, kart satırlar, `.thumb`; ana menü `@media (min-width:900px)` büyük.

## v0.12 – YAYINLANDI (31 Ekim 2026, kullanıcı "her şeyi bitirdikten sonra paket çık" dedi)
Doküman rev 51. Test yapılmadı (Kural 7).
- **Tam ekran:** ana menünün sağ üstünde ve Ayarlar'da "⛶ Tam ekran" düğmesi (Fullscreen API, webkit yedeği). İzin verilmezse açıklayan bir uyarı çıkıyor (sayfa içinde açılmışsa ya da iPhone'daysa).
- **Android "zaten yüklü" hatası:** oyun claude.ai sayfasının içinde açıldığı için Chrome'un "yükle" seçeneği oyunu değil, telefonda yüklü Claude uygulamasını görüyordu. Oyun artık kendi adresinden (GitHub Pages) **PWA** olarak yüklenebiliyor: `manifest.webmanifest` (CoffeBean, tam ekran açılıyor), `sw.js` (her zaman önce ağdan en yeni sürüm, çevrimdışıyken önbellekten yedek), `icons/` (192, 512, maskable, apple-touch). Tarayıcı izin verirse "📲 Uygulamayı yükle" düğmesi çıkıyor (`beforeinstallprompt`). Sayfa içinde açıksa Ayarlar'da oyunun kendi adresi gösteriliyor.
- Yıldız Teyze açılış metni değişti (doküman rev 46): "…artık yoruldum; dükkan senin. Bütün kahveler espressodan yapılır. Gerisini tarif defterimden öğrenirsin, köşede duruyor." ("oynadıkça öğrenirsin" kaldırıldı).
- **Sahne tam ekran** (doküman rev 47): zemin ve duvarlar ekran dışına uzatıldı (`EX = 10`, duvarlar `WTOP = 1400`), arka plan duvar rengi, sahne ölçeği büyüdü (`TW` en fazla 84), vinyet hafifletildi; kenarlarda siyah boşluk kalmıyor.
- **"☕ Günü başlat"** düğmesi sol üstte, sahnenin içinde (HUD'ın altında); ilk gün parlıyor (`.glow`).
- **İlk espresso öğreticisi zenginleşti:**
  - Yıldız Teyze önce 4 adımı ve "ibre tam koyu yeşilde basılır, ustalık ister" kuralını anlatıyor, sonra her adımı nedeniyle birlikte açıklıyor.
  - İbre mükemmelde durunca "İşte şimdi! / Şimdi bırak! / Şimdi durdur!" diyor.
  - Erken basınca basmayı kabul etmiyor ve "acele etme" diyor.
  - Dozlamada yeşile gelmeden bırakılırsa adım baştan başlıyor ve "koyu yeşile gelene kadar basılı tut" diye hatırlatıyor.
  - Çekme sırasında kremayı anlatıyor.
  - İlk espressodan sonra vedalaşıp gidiyor.
  - Metinler: `tutorial.espressoIntro`, `steps`, `pressNow`, `tooEarly`, `release`, `holdRetry`, `extractRun`, `stopNow`, `done`.
- **Sipariş sonu değerlendirme** (doküman rev 48): son adımdan sonra panelde fincanın üstten görüntüsü ve **tüm adımların ortalaması** (artık en düşük adım değil) yüzde olarak gösteriliyor. Etiketler: %95+ Mükemmel / 80–94 Lezzetli / 60–79 Ortalama / 40–59 Kötü / <40 Berbat (`D.reviews`).
  - **Teslim et** ya da **Yeniden yap** seçilebiliyor. Yeniden yap'ta bir fincanlık çekirdek/süt hemen düşüyor ve elle yapılan adımlar baştan başlıyor; malzeme yetmezse düğme pasif. Öğreticide sadece Teslim et var.
  - Müşteri teslimde kategorisinden rastgele bir yorumu baloncukta söyleyip çıkıyor.
  - Otomatik makine ve yardımcının hazırladıkları doğrudan teslim ediliyor.
- **Sipariş cümleleri** (doküman rev 49): öndeki müşteri rastgele bir cümleyle sipariş veriyor (`D.orderLines`): 12 genel kalıp (bozuk Türkçeli turist ağzı dahil) ve her tipe 3 özel kalıp. Tipe özel kalıpların seçilme şansı iki kat.
- **Boylar ve bardaklar** (doküman rev 50): `D.sizes` / `D.cups` / `cupMin` / `startCups` / `noCupLines` / `wrongLines`; müşteri `c.size`; sipariş önce seçim adımı (`o.selecting`, `renderSelect`, `prepareOrder` bardağı düşer, `o.mismatch`); sağ üst `#orders` kartı (`renderOrders`); fiyat `sizePrice`, sarf `bean`/`milk` çarpanı, doz hedefi `size.dose`; Tedarik'te kasa + stok özeti ve bardak paketleri, eksik bardak Devam'ı kilitler; yardımcı da bardak harcar; yeniden yap seçim adımına döner.
- **Telefon dikey düzeni** (doküman rev 51): `index.html`'de `@media (orientation:portrait) and (max-width:620px)` ile HUD sol üstte küçük ve alt alta, `#orders` küçük, `#task` altta, `#openDay` alt ortada, ikonlar 54px. Masaüstü ve yatay ekran değişmedi.
- Düzeltme: `begin()` içinde yorum satırına kaymış `S.loans` göçü / `syncDebt()` / `milkDay` ayrı satıra alındı.
- **Paket dosya listesi artık:** index.html, *.js, `manifest.webmanifest`, `sw.js`, `icons/*.png` (yayına, zip'e ve GitHub'a).

## v0.10 – YAYINLANDI (31 Ekim 2026, kullanıcı "optimizasyondan sonra paketi çık" dedi)
Doküman rev 33 (HTML yerelde güncel, pakette gönderilecek). Test yapılmadı (Kural 7), yalnız sözdizimi.
- Oyuncu karakteri: tezgâhın arkasında sarı saçlı, atkuyruklu, önlüklü kız ("Sen"), sipariş varken hareket ediyor (`scene.js` `barista()`); yardımcı barista yanına (y=3.0) taşındı.
- Müşteriler tezgâhın önünde tek, düz sıra (`queueSlot`: x sabit 3.0, y aralığı 0,95).
- Müşteri trafiği: dükkan başına sıra sınırı X (3/5/7), günlük en fazla Y (6/9/13) ve geliş sıklığı (13 / 9,5 / 6,5 sn). Sıra doluyken gelen müşteri kapıdan dönüyor (ledger'da satır var). Gün 90 sn'de biter. Y (+2/+3/+4) ve sıklık (×0,85) dükkana özel 3 kademe yükseltiliyor (`S.traffic[shopLevel]`); fiyatlar 120/220/350 · 300/550/850 · 700/1.200/1.800. Tedarik'te "Müşteri trafiği" kutusu, ipucu satırında "Sıra n/X".
- Önbellek: `index.html`'e no-cache meta etiketleri; tüm betikler `?v=0.10` ile; `window.CB_VERSION` ≠ `DATA.version` ise oyun bir kez `?r=` ile yeniden yükleniyor (sessionStorage koruması). **Her pakette 3 yeri güncelle:** index.html'deki `CB_VERSION`, betiklerin `?v=` değerleri ve data.js'teki `version`.
- Kayıt: 3 yuva (`cekirdek_slot_1..3`); eski tek kayıt yuva 1'e taşınıyor. Yeni oyun ve Yükle yuva seçtiriyor; dolu yuvaya yazarken uyarı veriyor, her yuvada Sil (onaylı). Oyun bulunduğu yuvaya kendiliğinden kaydediliyor.
- Oyun içi Menü ikonu: Kaydet (yuva seç) ve Ana menüye dön. Ana menüye dönünce gün iptal oluyor, kazanılanlar kalıyor.
- Giriş ekranı: adı CoffeBean. Süzülen çekirdekler, buharlı fincan, SVG çekirdek logosu, Fraunces yazı tipi, sürüm etiketi.
- Ana menüde Ayarlar düğmesi: ses ayarları + Kayıtlar (dışa/içe aktar). Aynı kart oyun içinden de açılıyor.
- Ana menü müziği: ayrı parça (~52 BPM; Cmaj7→Am7→Fmaj7→G6, seyrek melodi). İlk dokunuşta başlıyor; oyuna girince oyun müziğine, menüye dönünce menü müziğine geçiyor (`AUDIO.startMusic("menu"|"game")`).
- Tarif açılımı yeniden: XP yerine **satılan toplam kahve** (`unlockCups`): Americano 4, Lungo 8, Ristretto 14, Macchiato 22, Cortado 32, Latte 44 (2★), Cappuccino 58 (2★); aradaki fark gittikçe büyüyor. HUD'da "Yeni tarife X kahve daha" (eşik dolmuş ama dükkan küçükse "Yeni tarif için 2★ dükkan"); Defter'de kilitli tariflerde "N kahve satınca (X kahve daha)". Doküman §3, §9 bu kurala göre yeniden yazıldı (rev 36).
- Grafik (rev 37): WebGL ile ekran kartı algılama (yazılımsal render tanınır), 'Ekran kartıyla çiz' (canvas `desynchronized`, kapalıysa `willReadFrequently` → CPU), Yüksek/Orta/Düşük kalite (`SCENE.setQuality`: dpr sınırı, çözünürlük ölçeği, efekt seviyesi, Düşük'te 30 kare/sn). Ayar `cekirdek_gfx`'te saklanıyor.
- Optimizasyon: menüde sahne bir kez çiziliyor (eskiden her karede); dükkan kapalıyken ya da kart/panel açıkken sahne 3 karede bir çiziliyor; ipucu metni ve saat yalnızca değişince DOM'a yazılıyor.

## v0.11 – YAYINLANDI (31 Ekim 2026, kullanıcı "hepsini yap, paket çık" dedi)
Doküman rev 39. Test yapılmadı (Kural 7).
- Nejla Teyze → **Yıldız Teyze** (oyun, HTML, doküman §10). Açılış metni sadeleşti: "yıllardır işletiyorum, artık yoruldum, dükkan senin, gerisini oynadıkça öğrenirsin". Ezber/espresso kartı açılış penceresinden çıkarıldı, düğme "Devral". `tutorial.espresso` kaldırıldı.
- İlk sipariş (öğretici): ibre her adımda tam mükemmel noktada kendiliğinden durup bekliyor (`o.frozen`), basınca ya da bırakınca adım mükemmel bitiyor.
- Tamping: hız 160 → 65; halka hedefleri ×3 (`zones.stepMult.tamp`; mükemmel %6, güzel %15, iyi %30).
- **Hata (kullanıcı bildirdi): banka.** "Borcu öde" düğmesi elindeki para kadar kısmi ödeme yapıyordu ve üstünde elindeki parayı yazıyordu (0₺'de "₺0", 250₺'de "₺250"). Bu yüzden borç artarken düğmedeki tutar değişmiyor gibi görünüyordu ve 250 ödeyince borç kapanmış sanılıyordu (275'in 25'i kalıyordu). Düzeltme (doküman rev 40): düğme artık "Borcu kapat (₺275)" yazıyor ve yalnız borcun tamamı ödenebiliyor; para yetmezse pasif kalıp "₺X daha gerekli" diyor. Kredi düğmeleri "₺250 al → ₺275 öde" yazıyor, faiz dahil kalan borç açıkça gösteriliyor. Kısa testle doğrulandı: 0₺'de 250 kredi → borç 275, düğme pasif "₺25 daha gerekli"; 400₺ ile kapatınca kasada 125₺ kaldı, borç 0.
- Banka (doküman rev 41): **Miktarını öde** (elle tutar girilir; en fazla kasadaki para ve borç kadar) + **Borcu kapat** (tamamı). **Vade 7 gün** (`economy.loanDays`; borç sıfırdan açıldığında `S.debtDue` ayarlanıyor, ek kredi vadeyi uzatmıyor). HUD borç göstergesinde kalan gün yazıyor, son 2 günde kırmızı; ledger ve Banka'da da kalan gün var. Vadenin son günü bitince borç varsa **iflas**: oyun bitiyor, iflas penceresi (gün, satılan kahve, açılan tarif, dükkan) çıkıyor, yuva `bankrupt` olarak işaretleniyor (yüklenemez, silinebilir ya da üstüne yeni oyun açılabilir). Eski kayıtlarda borç varsa vade yüklenince başlıyor.
- **Krediler ayrı ayrı** (doküman rev 42–43): `S.loans = [{id, amount, owe, rem, day, due}]`; `S.debt` toplamdan türetiliyor (`syncDebt`). Türler: ₺100 → ₺110, **5 gün**; ₺250 → ₺275, **8 gün**; kira kredisi (50'ye yuvarlanır) **6 gün**. Banka'da her kredi ayrı satırda: alınan, geri ödenecek, kalan, kalan gün; satır başına **Kapat** ve **Miktarını öde** (elle tutar). Günlük %20 kesinti vadesi en yakın krediden düşüyor. HUD toplam borç ve en yakın vadeyi gösteriyor, ledger her krediyi listeliyor. Herhangi bir kredi vadesinde ödenmemişse iflas. Eski tek borç tek krediye çevriliyor. (Önceki tek borçlu `debtDue` modeli bununla değişti.)
- **Kira ödenemiyor ve kredi alınamıyorsa iflas:** gün sonunda kasa eksideyse ve gereken kira kredisi toplam borcu kredi limitinin üstüne çıkarıyorsa oyun iflasla bitiyor.
- v0.11 büyük paket (doküman rev 44): gün sonu akışı `dayFlow` (supply → hub → price) + gazete; Tedarik (`renderSupply`) yalnız malzeme, kırmızı EKSİK kutuları, Kredi popup'ı (`openLoans`/`#ovLoan`); Dükkan hub'ı (`renderHub`, `#ovHub`): renkli/ikonlu sekmeler, sınıflı geliştirmeler, seviyeye göre gizleme, Ana hedef (`renderGoal`, `#ovGoal`). Aletler (`D.tools`): kettle/milkKit/boiler/cocoa, tarif `needs`; yeni adımlar water (basılı tut), pressure (kadran, `dial`), cocoa (gidip gelen serpici). Fiyat: `defaultPrice` = (maliyet × 2 + kira payı), `S.prices` oran (%5 adım, %50–200), Fiyatlar ekranı (`renderPrices`, `#ovPrice`) + oyun içi ikon. Borsa `S.market`, haftalık `updateMarket` + `showNews`. Müşteri: yalnız öndeki sorar (`c.say`), sipariş anında `rollReaction`; pahalı → çıkar (`stats.pricey`), ucuz → alır. Eski kayıtlara açık tariflerin aletleri hediye.

## v0.9 – YAYINLANDI (31 Ekim 2026, kullanıcı "yap ve yayınla" dedi)
Doküman rev 32 (§4 renkli hedefler + adım tablosu yeniden yazıldı).
- Bölgeler: perfect 1 / good 2,5 / ok 5 (yarı genişlik) → toplam ≤ %10; `zoneSet` rütbe çarpanını en fazla 1'le sınırlıyor, hassasiyet ×1,5.
- Öğütme: osc, hız 85. Dozlama: basılı tut (0–24 g, 9 g/sn, hedef 18 g). Tamping: daire (osc, hız 160), hedef halkaları `CLOSEUP.tamp(v, z)` içinde çiziliyor, yatay çubuk gizli, tuvale dokunmak da durduruyor. Ekstraksiyon: başlat/durdur (aynı).
- Test yapılmadı (Kural 7); yalnızca sözdizimi kontrol edildi.

## v0.8 – YAYINLANDI (31 Ekim 2026, kullanıcı "hepsini yayınla" dedi)
Doküman rev 31 (HTML yerelde güncel, henüz gönderilmedi).
- KURALLAR.md: Kural 5 (paket yalnız "paket çık" / kritik-acil), Kural 6 (paket = zip + bağlantı + doküman HTML + güncelleme notları + GitHub); Kural 1 ve 4 pakete bağlandı.
- Sesler: dükkan açılışı (iki zil + yükselen üç nota), gün kapanışı (zil + kilit tık-tak + inen üç nota).
- Sekme: arka planda AudioContext tamamen kapatılıyor (tarayıcının "ses çalıyor" simgesi gitsin diye), dönünce müzik yeniden başlıyor; arka plandayken hiçbir ses motoru açılmıyor.
- Tüm mini oyunlar renkli hedef çubuğuna geçti (§4): iç içe Mükemmel 100 / Güzel 88 / İyi 72, dışı Kaçtı; siyah ibre. Öğütme/dozlama/tamping gidip gelir (hız 55/50/70), ekstraksiyon BAŞLAT→DURDUR tek yön, süt basılı tut-bırak, latte art dök + kes. Büyük düğme (ÖĞÜT/DOZLA/BASTIR...), sonuç etiketi. Tuval içi küçük ibreler gizlendi.
- Hassasiyet yükseltmeleri (bölgeler ×1,5): Mikro ayarlı öğütücü 150, Hassas terazi 160, Tartılı tamper 180, PID 220, Termometreli sürahi 140, Profesyonel döküm sürahisi 260 (3★). Otomasyon artık bunlardan sonra alınabiliyor (`requires`); Tedarik'te "🔒 Önce: …" görünüyor.
- Öğretici metinleri ve ipuçları yeni çubuğa göre yeniden yazıldı. Panel 800px yükseklikte kaydırmasız sığıyor.
- Test: mükemmel espresso (4 adım 100); cappuccino'da süt bölgesi ×1,5 genişledi, latte art iki aşama çalıştı, kalp çizildi; otomatik öğütme 85 ile mükemmel servis olmuyor (beklenen); konsol hatası yok.

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

## v0.5 – 31 Ekim 2026 (kullanıcı geri bildirimi: erişilebilirlik, büyük merkezi panel, ses, ayarlar, büyük ikonlar)
Önce doküman güncellendi (§8, §11 → rev 25, `Tasarim_Dokumani.html` iletildi), sonra kod:
- **İlk seviye daha ulaşılabilir:** kahve fiyatları yükseltildi (Espresso 8→10, diğerleri orantılı), ekipman fiyatları düşürüldü (Otomatik öğütücü 600→350, Tartılı tamper 300→180, Buhar çubuğu 500→300, Çift gruplu makine 1.200→700).
- **Mini oyun paneli artık ortada ve büyük:** `#sheet` alttan açılan ince bir şerit olmaktan çıktı, tam ekran karartmalı arka plan üzerinde **sahnenin ortasında** büyük bir kart (`max-width:760px`) oldu; `closeup.js` tuvali 480×250 mantıksal ızgarayı CSS boyutuna ölçekleyecek şekilde yeniden yazıldı (`#closeup` artık 640×340, daha net ve büyük).
- **Ses eklendi (`audio.js`, yeni dosya):** Web Audio API ile kodla üretilmiş efektler — öğütme uğultusu, dozlama tıkırtısı, tamping gümbürtüsü, ekstraksiyon başlat/durdur, süt tıslaması, bozuk para/bahşiş/mükemmel/üzgün/açılış melodileri; arka planda yumuşak akor pedleriyle cozy bir lo-fi döngü (`AUDIO.startMusic()`, ilk kullanıcı etkileşiminde başlar).
- **Ayarlar paneli eklendi:** köşeye üçüncü ikon (dişli), müzik/efekt ses seviyesi kaydırıcıları + "Tüm sesleri kapat"; tercih `localStorage`'da kalıcı.
- **Köşe ikonları büyütüldü:** 58px → 84px, yazı ve rozet de büyütüldü.
- Playwright ile uçtan uca test edildi: panel gerçekten ekran ortasında (760px genişlik, merkez ~640,400); fiyat artışı doğrulandı (espresso ₺10); ayarlar paneli açılıp ses seviyesi değiştirilebiliyor; konsol hatası yok.

### Doküman eşleşme kontrolü (Kural 2) – v0.5
Tüm sayısal/arayüz değişiklikleri (fiyatlar, panel konumu/boyutu, ikon boyutu, ses + ayarlar) önce §8/§11'e kalibrasyon notu olarak eklendi, sonra kodlandı. Ek doküman dışı mekanik yok.

## v0.6 – 31 Ekim 2026 (ses yeniden + defter resimleri + isimsiz müşteri tipleri)
Doküman önce güncellendi (§3, §7, §11 → rev 27, HTML iletildi), sonra kod:
- `audio.js` baştan yazıldı: lo-fi caz müzik (Fmaj9→Em9→Dm9→Cmaj9, FM elektrik piyano, sıcak bas, fırça davul, swing, plak cızırtısı, yankı, ~70 BPM, ileri-zamanlı zamanlayıcı). Efektler: öğütücü motoru + çekirdek kırılması, dozlama, tamping gümbürtüsü, ekstraksiyon boyunca sürekli pompa + akış, süt buharı sürekli (hava = kâğıt yırtılma), satışta yazar kasa "çın" + bozuk para.
- Sekme arka plana geçince (`visibilitychange`/`pagehide`) AudioContext askıya alınıyor; dönünce devam.
- Defter: her tarifin SVG kesit resmi; öğrenilmemiş tarifler gri silüet + "???" + XP eşiği.
- Müşteriler isimsiz, yalnızca tip etiketi: İş adamı (18 sn, bahşiş ×2), Öğrenci (55 sn, ×0,4, %20 indirim), Yaşlı teyze (70 sn, ×1), Kahve meraklısı (40 sn, ×1,6), Düzenli müşteri (50 sn, ×1,2). İş adamına kravat, öğrenciye çanta, teyzeye gri saç eklendi; kuyruk aralığı açıldı (etiketler binmesin).

## v0.7 – 31 Ekim 2026 (gelişim paketi: otomasyon, hafta/kira/banka, dükkan kilitleri, latte art, görev, seri, dekor; müzik yenilendi)
Kullanıcıya öneriler sunuldu, hepsi seçildi. Doküman önce güncellendi (§2, §5, §7, §8, §9, §11 → rev 29, HTML iletildi), sonra kod:
- **Müzik** (kullanıcı rahatsız edici buldu): davul, cızırtı, FM çan atakları kaldırıldı. Yerine ~60 BPM keçe piyano arpejleri, sıcak üçgen ped, yumuşak bas ve tek döngüde bir ninni motifi geldi (Fmaj7→Dm7→B♭maj7→Csus4/C). Tizler 1300 Hz'de kısık, uzun yankı var.
- **Otomasyon** (`equipment[].auto`): otomatik adım sabit 85 puan verir ve panelde ⚙ ile gösterilir. Her adım otomatikse sipariş 1,8 sn'de makinede kendiliğinden hazırlanır. Eklenen ekipmanlar: tartılı öğütücü, otomatik tamper, süper otomatik makine, otomatik süt köpürtücü, süt buzdolabı. Öğretici (Nejla) her adımı yine elle öğretir.
- **Yardımcı barista** (`staff.assistant`, 2★, günlük maaş 40): kuyruktaki sütsüz siparişi alır, 7 sn'de 85 puanla hazırlar. Tezgâhın arkasında önlüklü bir figür olarak çizilir.
- **Hafta / kira / banka:** HUD'da "Pzt · 1. Hafta" ve "Kiraya N gün" görünür (son gün kırmızı). Kira her Pazar alınır: 150/350/700. Kasa eksiye düşerse gün kapanışında kredi çekmeden devam edilemez (50'ye yuvarlanır, geri ödeme %10 fazla). Borç varken her gün gelirin %20'si otomatik kesilir. Tedarik'teki Banka kutusundan ₺100/₺250 kredi çekilebilir ve borç kapatılabilir; limitler 600/1.500/3.000. Borç varken seviye atlanamaz.
- **Dükkan kilitleri:** latte ve cappuccino için `shop: 2` gerekir; ekipmanlarda `stars` kilidi var. Defter'de iki şart ayrı gösterilir (XP ✓ · 2★ 🔒). Seviye kartında kira ve açılacaklar yazar.
- **Latte art** (3★, latte/cappuccino): (1) basılı tut, %65–80'de bırak; (2) kayan kesim çizgisi ortadayken dokun. Servis yakın planında kalp çizilir.
- **Günlük görev** (`D.tasks`): HUD altında ilerlemesiyle görünür, tamamlanınca para + XP verir ve gün kapanışında satırı yazılır. **Mükemmel seri:** her ardışık mükemmel servis bahşişe ×0,1 ekler (en fazla ×1,5); kaçan müşteri ya da mükemmel olmayan servis seriyi sıfırlar. HUD'da 🔥 olarak görünür.
- **Dekor:** bitki (+1 itibar/gün), ayaklı lamba (bahşiş ×1,1), pikap (sabır ×1,15). Alınanlar sahnede çizilir.
- Birden çok tarif aynı anda açılırsa tek pencerede, resimleriyle birlikte gösterilir.
- Test (Playwright): 1★'da latte/cappuccino kilitli; 3★ + tam otomasyonda latte'de yalnız süt + latte art elle kalıyor (diğer adımlar 85); yardımcı espresso siparişini kendisi verdi; 7. günde kasa −640 → ₺650 kredi zorunlu → borç ₺715; HUD hafta/kira/borç doğru; konsol hatası yok.

### Doküman eşleşme kontrolü (Kural 2) – v0.7
Tüm sayılar (kira, limit, faiz, kesinti, ekipman fiyat/kilit, maaş, dekor etkileri, seri çarpanı, görev ödülleri, latte art aralıkları) önce dokümana yazıldı. Uygulamaya özgü küçük detaylar: kredi tutarı 50'ye yuvarlanıyor, yardımcı siparişi 7 sn'de hazırlıyor, otomatik sipariş 1,8 sn sürüyor, görev ödülleri ₺40–60 / 20–30 XP. Bunlar da §8'e "Uygulama ayrıntıları" notu olarak eklendi (rev 30).

## Sonraki adımlar
1. Prototipi test et, hataları gider.
2. Kullanıcı geri bildirimine göre dokümanı güncelle → HTML'i yeniden ilet → kodu eşle.
3. Faz 2 kapısı: "5 oyuncu 3 günü bitirdi mi?"
