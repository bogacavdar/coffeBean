extends "res://dukkan/servis.gd"
## Gün sonu: dizüstü, Kira ve Hesap (tasarım belgesi §4 "Gün sonu: Kira ve Hesap (taşıma adımı T5)"); web showRent / showLedger.

const DIZUSTU_POS := Vector3(-1.45, 0.94, -2.72)

var rep_bas := 0
var ekran: MeshInstance3D
var son: Dictionary = {}                   ## S.endPending: {dayNum, st, L, repDelta}


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	_dizustu_kur()
	var S := GameState.S
	rep_bas = int(S.get("rep", 0))
	if S.has("endPending"):
		son = S.endPending
		bitti = true
		gelecek = 0
		t = GUN_SN
		_kapandi()


func _dizustu_kur() -> void:
	var koyu := mat(Color("26282b"), 0.4, 0.3)
	slab(DIZUSTU_POS + Vector3(0, 0.01, 0.05), Vector3(0.34, 0.018, 0.24), koyu)
	var kapak := slab(DIZUSTU_POS + Vector3(0, 0.13, -0.08), Vector3(0.34, 0.23, 0.012), koyu)
	kapak.rotation_degrees.x = -12
	ekran = MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.3, 0.19)
	ekran.mesh = q
	var em := StandardMaterial3D.new()
	em.albedo_color = Color("0d1013")
	em.emission_enabled = true
	em.emission = Color("0d1013")
	ekran.material_override = em
	ekran.position = Vector3(0, 0, 0.008)
	kapak.add_child(ekran)
	collider(DIZUSTU_POS + Vector3(0, 0.12, 0), Vector3(0.4, 0.3, 0.35), "dizustu")


func _ekran_yak(on: bool) -> void:
	var em := ekran.material_override as StandardMaterial3D
	em.emission = Color("9fc3e6") if on else Color("0d1013")
	em.emission_energy_multiplier = 1.4 if on else 1.0


# ---------- günün bitişi ----------
func _gun_bitti() -> void:
	bitti = true
	var S := GameState.S
	son = {
		"dayNum": int(S.day), "repDelta": int(S.rep) - rep_bas, "L": {"rent": 0},
		"st": {"served": ist.hizmet - gunluk.yanlis - gunluk.kotu, "perfect": gunluk.mukemmel, "left": ist.kizgin,
			"bounced": ist.donen, "wrong": gunluk.yanlis, "bad": gunluk.kotu, "income": gunluk.gelir, "tips": gunluk.bahsis},
	}
	S.endPending = son
	SaveSystem.yaz(GameState.yuva, S)
	_kapandi()


func _kapandi() -> void:
	acik = false
	tabela.text = "KAPALI"
	tabela.get_meta("arka").text = "KAPALI"
	tabela.modulate = Color("f6ecdc")
	_ekran_yak(true)
	flash = ""


func action_text(id: String) -> String:
	if id == "dizustu":
		return "E: Gün sonu" if bitti else "Gün sonu ekranları kapanışta açılır"
	if id == "tabela" and bitti:
		return ""
	return super.action_text(id)


func interact(id: String) -> void:
	if id == "dizustu":
		if bitti:
			_ekrana_gec()
			_kira()
		return
	if id == "tabela" and bitti:
		return
	super.interact(id)


func _ekrana_gec() -> void:
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func _ekrandan_cik() -> void:
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _hud() -> void:
	super._hud()
	if bitti:
		var satirlar := info.text.split("\n")
		var ilk := "Dükkân kapandı · gün sonu için dizüstüne bakıp E"
		if satirlar[0] != ilk:
			satirlar[0] = ilk
			info.text = "\n".join(satirlar)
			son_info = info.text


# ---------- web daysToRent / rentPaid ----------
func _kiraya(gun: int) -> int:
	return 6 - ((gun - 1) % 7)


func _kira_odendi(gun: int) -> bool:
	return int(GameState.S.get("rentPaidWeek", 0)) == GameState.hafta_no(gun)


# ---------- 1. Kira ----------
func _kira() -> void:
	var S := GameState.S
	var gun: int = son.dayNum
	var dk := GameState.dukkan(S.shopLevel)
	var kira := int(dk.rent)
	var kalan := _kiraya(gun)
	var odendi := _kira_odendi(gun)
	var yeter := float(S.money) >= kira
	if kalan == 0 and not odendi and not yeter:
		_iflas(kira - roundi(float(S.money)))
		return
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	var buyuk := "Bu haftanın kirası ödendi ✓" if odendi else ("Kira bugün!" if kalan == 0 else "Kiraya %d gün kaldı" % kalan)
	v.add_child(Tema.yazi(buyuk, 30, Tema.TEHLIKE if kalan == 0 and not odendi else Tema.ANA, true))
	v.add_child(_tablo([["Kasa", "₺" + GameState.tl(S.money)], ["Haftalık kira (%s)" % dk.name, "₺" + GameState.tl(kira)]]))
	var dugmeler: Array = []
	if odendi:
		dugmeler.append({"metin": "Devam", "tur": "ana", "fn": _hesap})
	else:
		if kalan > 0:
			dugmeler.append({"metin": "Sonra ödeyeceğim", "fn": _hesap})
		dugmeler.append({"metin": "Kirayı öde (₺%s)" % GameState.tl(kira), "tur": "ana", "kapali": not yeter, "fn": func():
			S.money = float(S.money) - kira
			S.rentPaidWeek = GameState.hafta_no(gun)
			son.L.rent = kira
			S.log.append("Gün %d: kira ödendi (₺%s)" % [gun, GameState.tl(kira)])
			SaveSystem.yaz(GameState.yuva, S)
			_kira()})
	Flow.pencere("Kira", v, dugmeler, _ekrandan_cik)


# ---------- 2. Hesap ----------
func _hesap() -> void:
	var S := GameState.S
	var gun: int = son.dayNum
	var st: Dictionary = son.st
	var L: Dictionary = son.L
	var satirlar: Array = [["Servis edilen", str(st.served)]]
	if st.perfect: satirlar.append(["Mükemmel servis", str(st.perfect)])
	satirlar.append(["Vazgeçip giden", str(st.left)])
	if st.bounced: satirlar.append(["Kapıdan dönen (sıra doluydu)", str(st.bounced)])
	if st.get("pricey", 0): satirlar.append(["Pahalı bulup giden", str(st.pricey)])
	if st.wrong: satirlar.append(["Yanlış sipariş (ödemeden giden)", str(st.wrong)])
	if st.get("nocup", 0): satirlar.append(["Bardak olmadığı için giden", str(st.nocup)])
	if st.get("nostock", 0): satirlar.append(["İstediği çekirdek/süt olmadığı için giden", str(st.nostock)])
	if st.bad: satirlar.append(["Kötü sipariş (ödemeden giden)", str(st.bad)])
	if st.get("extraMiss", 0): satirlar.append(["Küçük malzeme eksikliğinden az bahşiş bırakan", str(st.extraMiss)])
	satirlar.append(["Satış", "₺" + GameState.tl(st.income)])
	satirlar.append(["Bahşiş", "₺" + GameState.tl(st.tips)])
	if L.get("spend", 0): satirlar.append(["Alımlar (tedarik, alet, dekor)", "−₺" + GameState.tl(L.spend)])
	if L.rent: satirlar.append(["Haftalık kira", "−₺" + GameState.tl(L.rent)])
	satirlar.append(["*Günün neti", _para(int(st.income) + int(st.tips) - int(L.get("spend", 0)) - int(L.rent))])
	if L.get("spoiled", false): satirlar.append(["Kalan süt bozuldu", "0 L"])
	satirlar.append(["İtibar değişimi", ("+" if int(son.repDelta) >= 0 else "") + str(son.repDelta)])
	satirlar.append(["*Kasa", _para(S.money)])
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	v.add_child(_tablo(satirlar))
	v.add_child(Tema.yazi("Bu haftanın kirası ödendi." if _kira_odendi(gun) else "Kiraya %d gün kaldı." % _kiraya(gun), 17, Tema.SOLUK))
	Flow.pencere("%s · %d. Hafta – gün kapanışı" % [GameState.hafta_gunu(gun), GameState.hafta_no(gun)], v, [
		{"metin": "← Geri", "fn": _kira}, {"metin": "Devam", "tur": "ana", "fn": _ertesi_gun}], _ekrandan_cik, 620)


func _para(x: float) -> String:
	return ("−₺" if x < 0 else "₺") + GameState.tl(absf(x))


func _tablo(satirlar: Array) -> GridContainer:
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 30)
	g.add_theme_constant_override("v_separation", 6)
	for s in satirlar:
		var kalin: bool = String(s[0]).begins_with("*")
		var a := Tema.yazi(String(s[0]).trim_prefix("*"), 19, Tema.KAHVE, kalin)
		a.autowrap_mode = TextServer.AUTOWRAP_OFF
		a.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var b := Tema.yazi(s[1], 19, Tema.KAHVE, kalin)
		b.autowrap_mode = TextServer.AUTOWRAP_OFF
		b.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		g.add_child(a)
		g.add_child(b)
	return g


func _ertesi_gun() -> void:
	var S := GameState.S
	S.erase("endPending")
	super._ertesi_gun()


# ---------- iflas (web bankrupt; krediler T8'de) ----------
func _iflas(acik_tl: int) -> void:
	var S := GameState.S
	S.bankrupt = true
	S.log.append("Gün %d: iflas" % int(S.day))
	SaveSystem.yaz(GameState.yuva, S)
	var metin := "Kasa kirayı karşılamadı (₺%s açık). Banka dükkâna el koydu; oyun bitti." % GameState.tl(acik_tl)
	Flow.pencere("İflas!", Tema.yazi(metin), [{"metin": "Ana menü", "tur": "ana", "fn": Flow.ana_menuye}], Flow.ana_menuye)
