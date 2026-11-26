# CoffeBean (Godot 4.7.2)

Web v0.47'den Godot'ya taşınan oyun. Taşıma sırası: geliştirme planı, "Taşıma adımları" sekmesi (T1–T18).

## Klasörler
- `autoload/` – her zaman yüklü servisler: `GameState` (durum + web verisi), `SaveSystem` (3 yuva, `user://kayit_N.json`), `Settings` (`user://ayarlar.cfg`), `Flow` (sahne geçişleri ve pencereler).
- `ui/` – ana menü (`ana_menu.tscn`, ana sahne) ve ortak tema (`tema.gd`).
- `dukkan/` – birinci şahıs dükkan (`dukkan.tscn`: `fp_v3.gd` → `fp_real.gd` → `fp.gd`). Menünün arkasında `menu_modu` ile boş dükkan olarak açılır.
- `data/web_v047.json` – web `data.js`'in tamamı; `node tools/data_aktar.js <data.js> data/web_v047.json` ile üretilir.
- `art/` – Poly Haven (CC0) modeller ve dokular (`ph/`, `tex/`), Microsoft Rocketbox (MIT) insanlar (`people/`).

## Derleme
`.github/workflows/godot-windows.yml` her gönderimde Windows derlemesini https://github.com/bogacavdar/coffeBean/releases/download/godot-deneme/CoffeBean_Godot_Deneme_Windows.zip adresine koyar.
