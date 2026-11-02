# Çekirdek – Kahve Dükkanı Oyunu (prototip)

Espresso çekmeyi öğren, dükkanı büyüt, dünyayı fincanda tat.

- **Oyna (açılabilir hali):** https://bogacavdar.github.io/coffebean/
- **Tasarım dokümanı:** [Tasarim_Dokumani.html](Tasarim_Dokumani.html)
- **Çalışma kuralları:** [KURALLAR.md](KURALLAR.md) · **İlerleme:** [DEVAM.md](DEVAM.md)

Tek sayfa HTML5 + vanilla JS; `index.html`'i tarayıcıda açmak yeterlidir. İçerik verisi `data.js`, oyun mantığı `game.js`, izometrik dükkan `scene.js`, gerçekçi tezgâh yakın planı `closeup.js`.

## Telefon denetimi (isteğe bağlı)
`araclar/telefon-denetimi.js` ilk günü beş telefon boyutunda (320×568 … 412×915) oynar; görünmeyen ya da kaydırma isteyen düğmeleri, yatay taşmayı, kesik yazıları, üst üste binen balon ve etiketleri raporlar ve ekran görüntülerini `araclar/denetim-sonuc/` klasörüne yazar. Node ve Playwright gerekir:

```
python3 -m http.server 8765
node araclar/telefon-denetimi.js http://localhost:8765/index.html
```
