extends "res://dukkan/dekor.gd"
## Özel müşteriler, sadakat, yoğun saat, fenomen etkisi ve barista yarışması (tasarım belgesi §4 "Özel müşteriler,
## sadakat, yoğun saat ve yarışma (taşıma adımı T15)"); web spawnCustomer, juryScore, rushOn, S.loyal, S.buzz.

const OZEL_TIPLER := ["critic", "tourist", "influencer"]

var yogun: Dictionary = {}                 ## {at, on}
var juri_kalan := 0
var juri_puan: Array = []
var buzz_bugun := 0
var zorla_tip := ""                        ## akış testi: sıradaki müşterinin tipi


func _ready() -> void:
	super._ready()
	if menu_modu or bitti:
		return
	var S := GameState.S
	if not ilk_gun():
		var b := int(S.get("buzz", 0))
		if b != 0:
			buzz_bugun = b
			gelecek = maxi(1, gelecek + b)
		S.buzz = 0
		if int(S.get("compDay", -1)) == int(S.day):
			juri_kalan = (_D().competition.drinks as Array).size()


func _gorunus(tip: String) -> String:
	var ozel := {
		"critic": ["Business_Male_03"],
		"tourist": ["Female_Adult_08", "Male_Adult_04"],
		"influencer": ["Female_Adult_12"],
		"jury": ["Business_Male_01", "Business_Female_02"],
	}
	if not ozel.has(tip):
		return super._gorunus(tip)
	var aday: Array = ozel[tip].duplicate()
	aday.shuffle()
	for a in aday:
		var var_mi := false
		for m in sira:
			if m.node.get_meta("model", "") == a:
				var_mi = true
		if not var_mi:
			return a
	return aday[0]


# ---------- açılış: yoğun saat, fenomen, yarışma ----------
func _ac() -> void:
	super._ac()
	if ilk_gun():
		return
	var mesaj: Array = []
	if flash != "" and hava != "":
		mesaj.append(flash)
	if buzz_bugun > 0:
		mesaj.append("Fenomen paylaştı: bugün +%d müşteri" % buzz_bugun)
	elif buzz_bugun < 0:
		mesaj.append("Fenomen kötü yazdı: bugün %d müşteri" % buzz_bugun)
	if juri_kalan > 0:
		mesaj.append("Yarışma günü: ilk 3 müşteri jüri")
		juri_puan = []
		ders("jury")
	if not mesaj.is_empty():
		flash = " · ".join(mesaj)
	if yogun.is_empty() and rng.randf() < 0.25:
		yogun = {"at": rng.randf_range(20.0, GUN_SN * 0.6), "on": false}


func yogun_saat() -> bool:
	return not yogun.is_empty() and yogun.on and t < float(yogun.at) + 30.0


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu or not acik or bitti or yogun.is_empty() or yogun.on:
		return
	if t >= float(yogun.at):
		yogun.on = true
		gelecek += 3
		sonraki = minf(sonraki, t + 1.0)
		flash = "Yoğun saat! 30 saniye boyunca müşteri akını · bahşiş ×1,5"
		ders("rush")


func _aralik_carpani() -> float:
	return super._aralik_carpani() * (1.0 / 3.0 if yogun_saat() else 1.0)


func _sag_ust() -> String:
	var s := super._sag_ust()
	if yogun_saat():
		var parca := s.split(" · ")
		parca.insert(2, "Yoğun saat")
		s = " · ".join(parca)
	return s


# ---------- tip seçimi ----------
func _tip_sec() -> String:
	if zorla_tip != "":
		var z := zorla_tip
		zorla_tip = ""
		return z
	if juri_kalan > 0:
		return "jury"
	if _yildiz() >= 2 and rng.randf() < float(_D().specialChance):
		return OZEL_TIPLER[rng.randi() % OZEL_TIPLER.size()]
	return super._tip_sec()


func _ozel_siparis(tip: String) -> Array:
	if tip == "jury" and juri_kalan > 0:
		var L: Array = _D().competition.drinks
		var s: Array = L[L.size() - juri_kalan]
		juri_kalan -= 1
		return [s[0], s[1]]
	return super._ozel_siparis(tip)


func sadik(tip: String) -> bool:
	return int(GameState.S.get("loyal", {}).get(tip, 0)) >= int(_D().loyalty.need)


func _musteri_adi(tip: String) -> String:
	return super._musteri_adi(tip) + (" ♥" if sadik(tip) else "")


func _sabir_carpani(tip: String) -> float:
	return super._sabir_carpani(tip) * (float(_D().loyalty.patience) if sadik(tip) else 1.0)


func _bahsis_carpani(m: Dictionary) -> float:
	var k := super._bahsis_carpani(m)
	if sadik(m.tip) and not m.get("ogretici", false):
		k *= float(_D().loyalty.tip)
	if yogun_saat():
		k *= 1.5
	return k


func _siparis_al(m: Dictionary) -> void:
	super._siparis_al(m)
	if _D().customers.get(m.tip, {}).get("special", false) and m.tip != "jury":
		ders(m.tip)


# ---------- servis sonrası ----------
func _itibar(m: Dictionary, servis: int, rep: int) -> int:
	if m.tip == "critic":
		return 20 if servis >= 95 else (-15 if servis < 70 else 3)
	return super._itibar(m, servis, rep)


func _servis_sonrasi(m: Dictionary, tutar: int, bahsis: int, servis: int) -> void:
	super._servis_sonrasi(m, tutar, bahsis, servis)
	var S := GameState.S
	if m.tip == "influencer":
		S.buzz = maxi(-2, int(S.get("buzz", 0)) + (3 if servis >= 95 else (-2 if servis < 70 else 0)))
	if not _D().customers.get(m.tip, {}).get("special", false) and not m.get("ogretici", false) and not m.get("yardimci", false):
		if not S.has("loyal"):
			S.loyal = {}
		var n := int(S.loyal.get(m.tip, 0))
		n = n + 1 if servis >= 95 else (0 if servis < 80 else n)
		S.loyal[m.tip] = n
		if n == int(_D().loyalty.need):
			ders("loyal")
	if m.tip == "jury":
		_juri(servis)
	SaveSystem.yaz(GameState.yuva, S)


func _reddedildi(m: Dictionary) -> void:
	super._reddedildi(m)
	if m.tip == "jury":
		_juri(0)


func _musteri_kacti(m: Dictionary) -> void:
	super._musteri_kacti(m)
	if m.tip == "jury":
		_juri(0)


## web juryScore: üç jüri puanının ortalaması → madalya.
func _juri(puan: int) -> void:
	juri_puan.append(puan)
	if juri_puan.size() < (_D().competition.drinks as Array).size():
		return
	var top := 0
	for p in juri_puan:
		top += int(p)
	var ort := roundi(float(top) / juri_puan.size())
	juri_puan = []
	var S := GameState.S
	var madalya: Dictionary = {}
	for md in _D().competition.medals:
		if ort >= int(md.min):
			madalya = md
			break
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.add_child(Tema.yazi("Jüri ortalaması: %d" % ort, 20, Tema.KAHVE, true))
	if madalya.is_empty():
		v.add_child(Tema.yazi("Bu sefer madalya yok. Haftaya yeniden dene!", 18))
	else:
		S.money = float(S.money) + int(madalya.money)
		S.rep = int(S.rep) + int(madalya.rep)
		if not S.has("medals"):
			S.medals = []
		S.medals.append({"day": int(S.day), "name": madalya.name, "icon": madalya.icon, "avg": ort})
		S.log.append("Gün %d: yarışma %s madalya (%d)" % [int(S.day), madalya.name, ort])
		v.add_child(Tema.yazi("%s madalya" % madalya.name, 26, Color("c9962b"), true))
		v.add_child(Tema.yazi("Ödül: ₺%s · +%d itibar" % [GameState.tl(madalya.money), int(madalya.rep)], 18))
	SaveSystem.yaz(GameState.yuva, S)
	get_tree().create_timer(1.4).timeout.connect(func():
		_ekrana_gec()
		Flow.pencere("Barista yarışması", v, [{"metin": "Tamam", "tur": "ana", "fn": _juri_bitti}], _juri_bitti, 520))


func _juri_bitti() -> void:
	_pencereden_cik()


# ---------- Dükkan penceresi: yarışma kutusu ----------
func _dukkan_ust(v: VBoxContainer, yenile: Callable) -> void:
	super._dukkan_ust(v, yenile)
	if _yildiz() < 5:
		return
	var S := GameState.S
	var C: Dictionary = _D().competition
	var ic := _dukkan_bolum(v, "Barista yarışması", "Ertesi günün ilk 3 müşterisi jüri: espresso, cappuccino, latte. Ortalama %d+ altın (₺%s), %d+ gümüş, %d+ bronz. Haftada bir kez." % [int(C.medals[0].min), GameState.tl(C.medals[0].money), int(C.medals[1].min), int(C.medals[2].min)])
	var hedef_gun := int(S.day) + (0 if bitti else 1)
	if int(S.get("compDay", -1)) >= int(S.day):
		ic.add_child(Tema.yazi("Yarın yarışma günü ✓" if int(S.compDay) > int(S.day) or bitti else "Bugün yarışma günü ✓", 17, Tema.KAHVE, true))
	elif int(S.get("compWeek", -1)) == GameState.hafta_no(hedef_gun):
		ic.add_child(Tema.yazi("Bu hafta katıldın.", 16, Tema.SOLUK))
	else:
		var b := Tema.dugme("Yarışmaya katıl", "ana")
		b.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		b.pressed.connect(func():
			S.compDay = hedef_gun
			S.compWeek = GameState.hafta_no(hedef_gun)
			SaveSystem.yaz(GameState.yuva, S)
			flash = "Yarışmaya kaydoldun: yarının ilk 3 müşterisi jüri"
			yenile.call())
		ic.add_child(b)
