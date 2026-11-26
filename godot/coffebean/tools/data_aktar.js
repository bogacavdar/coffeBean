// Web v0.47'nin data.js dosyasını Godot'nun okuyacağı JSON'a çevirir (taşıma adımı T1–T2).
// Kullanım: node tools/data_aktar.js <data.js yolu> data/web_v047.json
const fs = require("fs");
const [src, out] = process.argv.slice(2);
global.window = global;
eval(fs.readFileSync(src, "utf8"));          // data.js ölçekleme dahil son değerleri window.DATA'ya yazar
fs.writeFileSync(out, JSON.stringify(global.DATA, null, 1));
console.log("yazıldı:", out, Object.keys(global.DATA.drinks).length, "tarif");
