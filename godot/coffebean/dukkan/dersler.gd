extends "res://dukkan/ekstra.gd"
## Adım dersleri (tasarım belgesi "Adım dersleri (T11 tamamlama)"): yeni bir adımla ilk karşılaşmada defter notu.

const TEMEL := ["grind", "dose", "tamp", "extract"]
const ADIM_DERS := {
	"milk": "Sürahiyi al, buhar çubuğunda köpürt: ucu yüzeyin hemen altında tut, 62,5 °C'de E ile kapat.",
	"pour": "Köpürmüş sütü E basılı tutarak fincana dök; fincan %90–100 dolunca bırak.",
	"swirl": "Köpürmüş sütü E basılı tutarak fincana dök; fincan %90–100 dolunca bırak.",
	"water": "Makinenin sağındaki musluktan sıcak su: americano'da espressodan sonra, long black'te önce.",
	"cocoa": "Arka tezgâhtaki kakao serpicisini E basılı tutarak salla; üstü kaplanınca bırak.",
	"dust": "Arka tezgâhtaki tarçın serpicisini E basılı tutarak salla; üstü kaplanınca bırak.",
	"pump": "Fincan süsleme minderindeyken şurup şişesinin pompasına istenen sayı kadar bas.",
	"cream": "Krema sifonunu E basılı tutarak sık; tepe oluşunca bırak.",
	"drizzle": "Sos şişesini E basılı tutarak fincanın üstünde gezdir.",
	"garnish": "Limon kasesine bak, E: kabuğu fincanın kenarına sür.",
	"tkdose": "Cezve ocağında kahve kavanozundan E basılı: 7 g kahve.",
	"mndose": "Ezme kavanozundan E basılı: 2 kaşık.",
	"tkstir": "Şekeri koy, sonra cezveye 3 kez E: 3 tur karıştır.",
	"tkfoam": "Cezveyi ocağa koy; köpük %80'e gelince E ile al. Taşırma.",
	"mirraboil": "Mırrayı ocakta kaynat; koyulaşınca (%82) E ile al.",
	"tkserve": "Servis tepsisine 3 kez E: finjan, su, lokum.",
	"fdose": "Demleme tezgâhında torbadan E basılı: küçük 15, orta 20, büyük 25 g.",
	"fpdose": "Demleme tezgâhında torbadan E basılı: küçük 15, orta 20, büyük 25 g.",
	"bloom": "Kettle'la az su (dozun 2 katı) dök, kahve kabarsın.",
	"pourover": "Kettle'la suyu dök: toplam dozun 15 katı.",
	"fpwater": "Kettle'la suyu dök: dozun 15 katı.",
	"steepcup": "Fincandaki kahvenin üstüne 200 ml kaynar su dök.",
	"fpsteep": "French press'e E ile demlemeyi başlat; 4:00'te E ile durdur.",
	"apsteep": "AeroPress'e E ile demlemeyi başlat; 1:30'da E ile durdur.",
	"phin": "Phin'e E ile damlatmayı başlat; 4:00'te E ile durdur.",
	"siphonheat": "Sifonu E ile ısıt; 1:00'de E ile durdur.",
	"fpplunge": "E basılı tutarak pistonu sonuna kadar indir.",
	"appress": "E basılı tutarak pistonu sonuna kadar indir.",
	"siphondrop": "E basılı tutarak sifonu indir.",
	"mokafill": "Kettle'la mokanın alt haznesine vanaya kadar (150 ml) su doldur.",
	"mokaheat": "Mokayı ısıt; fokurdama %75'e gelince E ile al.",
	"stir": "Fincana 3 kez E: karıştır.",
	"cloth": "Kettle'la bez filtreden süz: dozun 12 katı su.",
	"ice": "Soğuk barda buz makinesine bak: her E bir kepçe (küçük 2, orta 3, büyük 4).",
	"coldwater": "Soğuk su musluğundan E basılı dök; espresso gelecekse bardağı %60–75 doldur.",
	"coldmilk": "Soğuk süt musluğundan E basılı dök; espresso gelecekse bardağı %60–75 doldur.",
	"tonic": "Toniği E basılı tutarak buzun üstüne dök.",
	"coldpour": "Soğuk demleme kavanozundan E basılı dök; bardağı %90–100 doldur.",
	"shakeit": "Shaker'ı E basılı tutarak çalkala.",
	"coldfoam": "El köpürtücüsünü E basılı tut; köpük %80–100 olunca bırak.",
	"whisk": "Çırpma kasesine 6 kez E: çırp.",
	"spoontop": "Çırpılmış köpüğü E basılı tutarak kaşıkla üstüne koy.",
	"tumbler": "Çırpma kasesinde E basılı: dabara ile köpürt.",
	"blend": "Blenderı E ile çalıştır; doku %72'ye gelince E ile durdur.",
	"colddrip": "Damla kulesinin vanasını E ile aç; %80'de E ile kapat.",
	"nitrotap": "Nitro musluğunu E basılı aç; köpük çizgisinde (%85–95) bırak.",
	"scoop": "Dondurma dolabından her E bir top.",
	"pourshot": "Kaseyi terazili tepsiye koy; espresso dondurmanın üstüne çekilir.",
}


func _siparis_al(m: Dictionary) -> void:
	super._siparis_al(m)
	if m.get("ogretici", false):
		return
	var yeni: Array = []
	for s in Content.tarif(m.tarif).get("steps", []):
		if s in TEMEL or not ADIM_DERS.has(s) or ("mg:" + s) in GameState.S.taught or s in yeni:
			continue
		yeni.append(s)
	if yeni.is_empty():
		return
	for s in yeni:
		_ogret("mg:" + s)
	call_deferred("_adim_dersi", yeni)


func _adim_dersi(yeni: Array) -> void:
	_ekrana_gec()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.add_child(Tema.yazi("Yıldız Teyze'nin defterinden", 16, Tema.SOLUK))
	for s in yeni:
		v.add_child(Tema.yazi(String(_D().minigames.get(s, {"name": s}).name), 19, Tema.KAHVE, true))
		v.add_child(Tema.yazi(ADIM_DERS[s], 17))
	Flow.pencere("Yeni adım" + ("lar" if yeni.size() > 1 else ""), v, [{"metin": "Anladım", "tur": "ana", "fn": _pencereden_cik}], _pencereden_cik, 620)
