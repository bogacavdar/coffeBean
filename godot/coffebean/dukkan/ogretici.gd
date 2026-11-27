extends "res://dukkan/ilerleme.gd"
## Yıldız Teyze öğreticisi ve defter dersleri (tasarım belgesi §4 "Yıldız Teyze öğreticisi ve defter dersleri
## (taşıma adımı T11)"); web D.tutorial, lesson(), pumpLessons(), closingTut().

const TEYZE_MODEL := "Business_Female_02"
const TEYZE_SOZ := "Hazırsan başlayabiliriz evladım. Bana bir duble espresso yap, ben de adım adım anlatayım."

var ogretici_aktif := false                ## ilk gün: Yıldız Teyze'nin servisi ve öğle penceresi bitene kadar saat durur
var teyze_servis := false                  ## Yıldız Teyze kahvesini aldı (not kutusu kapanır)
var kapanis_giris := false                 ## ilk kapanışta kira öncesi pencere bu oturumda gösterildi
var ders_kuyruk: Array = []
var not_kutu: PanelContainer
var not_yazi: Label


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	_not_kur()
	if bitti:
		return
	var S := GameState.S
	if not "intro" in S.taught and not ilk_gun():
		_ogret("intro")                       # T11'den önceki kayıt: dükkân zaten devralınmış
	if not "intro" in S.taught:
		call_deferred("_devralma")
	elif ilk_gun():
		call_deferred("_ilk_gun_ac")


func ilk_gun() -> bool:
	return int(GameState.S.day) == 1 and not "first" in GameState.S.taught


func _duz(s: String) -> String:
	var r := RegEx.new()
	r.compile("<[^>]+>")
	return r.sub(s, "", true)


func _ogret(k: String) -> void:
	if not k in GameState.S.taught:
		GameState.S.taught.append(k)
	SaveSystem.yaz(GameState.yuva, GameState.S)


## Başka pencere açık kaldıysa fare serbest kalır.
func _pencereden_cik() -> void:
	if Flow.yigin.is_empty():
		_ekrandan_cik()


# ---------- 1. devralma ----------
func _devralma() -> void:
	_ekrana_gec()
	Flow.pencere("Yıldız Teyze", Tema.yazi(_duz(_D().tutorial.intro), 19), [
		{"metin": "Devral", "tur": "ana", "fn": _devral}], _devral, 620)


func _devral() -> void:
	_ogret("intro")
	_pencereden_cik()
	if ilk_gun():
		_ilk_gun_ac()


func _ilk_gun_ac() -> void:
	if acik or bitti:
		return
	if GameState.S.get("firstSupply", false) or not eksikler().is_empty():
		_ekrana_gec()
		_tedarik("baslat")
	else:
		_ac()


# ---------- 2. ilk espresso ----------
func _ac() -> void:
	super._ac()
	if ilk_gun():
		_teyze_gelsin()
	elif hava != "":
		ders("weather")


func _teyze_gelsin() -> void:
	ogretici_aktif = true
	teyze_servis = false
	sonraki = 1.0e9
	var m := _musteri_kur("regular", "Yıldız Teyze", TEYZE_MODEL, "espresso", "double", "double", TEYZE_SOZ, "duble espresso", 1.0e9)
	m.ogretici = true
	m.cubuk.visible = false
	m.node.position = _sira_yeri(0)
	flash = "Yıldız Teyze kasanın önünde seni bekliyor."


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu or not_kutu == null:
		return
	if ogretici_aktif and acik and not bitti:
		t = maxf(0.0, t - delta)                  # saat durur
	var metin := _adim_notu() if ogretici_aktif and not teyze_servis else ""
	not_kutu.visible = metin != ""
	if not_yazi.text != metin:
		not_yazi.text = metin


## Ekranın üst ortasındaki "Yıldız Teyze:" notu; o anki espresso adımını anlatır (belgedeki tablo).
func _adim_notu() -> String:
	if cstate != "wait":
		return ""
	var n := ""
	match mode:
		"dose": n = "18 gram koyacağız. E'yi basılı tut, kahve düşsün; terazi 18 grama gelince Boşluk'a bas."
		"wdt": n = "İğneyle fareyi daire çizerek gezdir; topak kalmasın, kahve düz yayılsın."
		"tamp": n = "Temperi düz bastır: kabarcığı ortada tut. Eğri basarsan kahve bir yandan kaçar."
		"lock": n = "Fareyi sağa çekip portafiltreyi sonuna kadar çevir."
		"pull": n = "36 gram yaklaşık 23 saniyede akar. Önce koyu bal rengi, sonra karamel krema; rengi açılınca hedefe yaklaşırsın. Hedefte E ile durdur."
		"":
			match stage:
				"pick_pf": n = "Espresso beş adımdır: dozla, dağıt, sıkıştır, tak, çek. Önce tezgâhtaki portafiltreyi al."
				"to_grinder": n = "1. Dozla. Portafiltreyi öğütücünün terazisine koy."
				"to_station": n = "2. Dağıt. Portafiltreyi temper istasyonuna götür."
				"wdt_done": n = "3. Sıkıştır. Şimdi temperle."
				"tamped": n = "4. Tak. Portafiltreyi makinenin grup başına götür."
				"locked": n = "Şimdi bir duble fincan al, makinenin terazili tepsisine koy."
				"cup_on": n = "5. Çek. Çekimi başlat."
				"pulled": n = "Eline sağlık. Fincanı al."
				"cup_taken": n = "Kahveyi bana ver."
	return ("Yıldız Teyze: " + n) if n != "" else ""


func _not_kur() -> void:
	var katman := CanvasLayer.new()
	katman.layer = 5
	add_child(katman)
	not_kutu = PanelContainer.new()
	not_kutu.add_theme_stylebox_override("panel", Tema.kutu(Color(Tema.KREM, 0.95), 12, 2, Color("c9962b")))
	not_kutu.anchor_left = 0.5
	not_kutu.anchor_right = 0.5
	not_kutu.offset_left = -360
	not_kutu.offset_right = 360
	not_kutu.offset_top = 92
	not_kutu.mouse_filter = Control.MOUSE_FILTER_IGNORE
	not_kutu.visible = false
	katman.add_child(not_kutu)
	not_yazi = Tema.yazi("", 19, Tema.KAHVE)
	not_yazi.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	not_kutu.add_child(not_yazi)


## Yıldız Teyze her kahveyi alır (öğreticide yanlış sipariş ve kalite reddi yok).
func _kabul(m: Dictionary, kalite: float, yanlis: bool) -> bool:
	if m.get("ogretici", false):
		return true
	return super._kabul(m, kalite, yanlis)


func _servis_sonrasi(m: Dictionary, tutar: int, bahsis: int, servis: int) -> void:
	super._servis_sonrasi(m, tutar, bahsis, servis)
	if m.get("ogretici", false):
		teyze_servis = true
		_ogret("first")
		get_tree().create_timer(0.9).timeout.connect(_ogle)


func _ogle() -> void:
	_ekrana_gec()
	Flow.pencere("Yıldız Teyze", Tema.yazi(_duz(_D().tutorial.midday), 19), [
		{"metin": "Devam", "tur": "ana", "fn": _ogle_bitti}], _ogle_bitti, 620)


func _ogle_bitti() -> void:
	ogretici_aktif = false
	sonraki = t + aralik * rng.randf_range(0.6, 1.4)
	_pencereden_cik()


# ---------- 3. ilk kapanış ----------
func kapanis_ogretici() -> bool:
	var S := GameState.S
	return "first" in S.taught and not "closing" in S.taught and int(son.get("dayNum", S.day)) == 1


func _kira() -> void:
	if kapanis_ogretici() and not kapanis_giris:
		kapanis_giris = true
		Flow.pencere("Yıldız Teyze", Tema.yazi(_duz(_D().tutorial.closeIntro), 19), [
			{"metin": "Tamam", "tur": "ana", "fn": _kira_asil}], _kira_asil, 620)
		return
	super._kira()


func _kira_asil() -> void:
	super._kira()


func _hesap_notu() -> String:
	return ("Yıldız Teyze: " + _duz(_D().tutorial.closeLedger)) if kapanis_ogretici() else super._hesap_notu()


func _ertesi_gun() -> void:
	if kapanis_ogretici():
		_ogret("closing")
		Flow.pencere("Yıldız Teyze", Tema.yazi(_duz(_D().tutorial.done), 19), [
			{"metin": "Devam", "tur": "ana", "fn": _ertesi_gun_asil}], _ertesi_gun_asil, 620)
		return
	super._ertesi_gun()


func _ertesi_gun_asil() -> void:
	super._ertesi_gun()


# ---------- 4. defter dersleri (web lesson / pumpLessons) ----------
## Bir kez gösterilir; birden çok ders sırayla açılır. Gösterilecekse true.
func ders(anahtar: String) -> bool:
	var S := GameState.S
	if ("L:" + anahtar) in S.taught or not _D().lessons.has(anahtar):
		return false
	_ogret("L:" + anahtar)
	ders_kuyruk.append(anahtar)
	_ders_pompala()
	return true


func _ders_pompala() -> void:
	if ders_kuyruk.is_empty():
		return
	if not Flow.yigin.is_empty():
		get_tree().create_timer(0.6).timeout.connect(_ders_pompala)
		return
	var k: String = ders_kuyruk.pop_front()
	var L: Dictionary = _D().lessons[k]
	var h := _duz(String(L.h))
	if k == "weather":
		h = h.replace("saatin yanında simgeyle görünür", "sağ üstte günün yanında yazar")
	_ekrana_gec()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.add_child(Tema.yazi("Yıldız Teyze'nin defterinden", 16, Tema.SOLUK))
	v.add_child(Tema.yazi(h, 19))
	var bitir := func():
		_pencereden_cik()
		get_tree().create_timer(0.06).timeout.connect(_ders_pompala)
	Flow.pencere(String(L.t), v, [{"metin": "Anladım", "tur": "ana", "fn": bitir}], bitir, 600)
