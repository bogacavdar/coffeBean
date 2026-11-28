extends "res://dukkan/kredi.gd"
## Tarif açılışı, rütbeler, günlük görev, menü tahtası (tasarım belgesi §4 "Tarif açılışı, rütbeler, günlük görev
## (taşıma adımı T10)"); web recipeProg, recipeTick, nextRecipe, checkUnlocks, rank, makeTask, taskProgress.

const TAHTA_POS := Vector3(-2.3, 2.68, -2.97)

var gorev: Dictionary = {}
var gorev_hud: Label
var ilerleme_hud: Label
var tahta: Label3D
var tahta_sol: Label3D
var tahta_sag: Label3D
var rutbe_bas := ""


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	bolge_guncelle()
	rutbe_bas = rutbe().name
	_tahta_kur()


# ---------- rütbe ve bölge genişliği ----------
func rutbe() -> Dictionary:
	return _rutbe()


func bolge_carpani() -> float:
	var S := GameState.S
	var dz: Dictionary = _D().difficulty.get(S.get("diff", "normal"), _D().difficulty.normal)
	var cek: Dictionary = _D().beans.get(S.get("bean", "brazil"), {})
	return float(rutbe().tol) * float(dz.zone) * float(cek.get("tolMod", 1.0)) * ekipman_carpani()


## T12'de doldurulur (ekipman kademeleri).
func ekipman_carpani() -> float:
	return 1.0


func bolge_guncelle() -> void:
	var k := bolge_carpani()
	WIN_DARK = 0.027 * k
	WIN_LIGHT = 0.067 * k
	WIN_YELLOW = 0.133 * k


# ---------- tarif ilerlemesi ve açılış ----------
func sonraki_tarif() -> String:
	var aday := ""
	for id in _D().drinks:
		if id in GameState.S.unlocked:
			continue
		if aday == "" or int(_D().drinks[id].unlockCups) < int(_D().drinks[aday].unlockCups):
			aday = id
	return aday


func tarif_ilerlemesi() -> int:
	var S := GameState.S
	if not S.has("rp"):
		S.rp = super.tarif_ilerlemesi()
	return int(S.rp)


func _yildiz() -> int:
	return int(GameState.dukkan(GameState.S.shopLevel).stars)


func _tarif_tik() -> void:
	var nx := sonraki_tarif()
	tarif_ilerlemesi()
	if nx != "" and int(_D().drinks[nx].get("shop", 1)) <= _yildiz():
		GameState.S.rp = int(GameState.S.rp) + 1


func _acilabilir(id: String) -> bool:
	var d: Dictionary = _D().drinks[id]
	return tarif_ilerlemesi() >= int(d.unlockCups) and _yildiz() >= int(d.get("shop", 1)) and not id in GameState.S.unlocked


func tarifleri_ac() -> void:
	var S := GameState.S
	var yeni: Array = []
	for id in _D().drinks:
		if _acilabilir(id):
			yeni.append(id)
	if yeni.is_empty():
		return
	var once := bardaklar_bilinen()
	if not S.has("unlockDay"):
		S.unlockDay = {}
	for id in yeni:
		S.unlocked.append(id)
		S.unlockDay[id] = S.day
		S.perfect[id] = int(S.perfect.get(id, 0))
		S.log.append("Gün %d: %s açıldı" % [int(S.day), _D().drinks[id].name])
	var yeni_bardak: Array = []
	for k in bardaklar_bilinen():
		if not k in once:
			yeni_bardak.append(_D().cups[k].name.to_lower())
	var sut_yeni := false
	for id in yeni:
		if "milk" in _D().drinks[id].steps and not "milk" in S.taught:
			sut_yeni = true
	if sut_yeni:
		S.taught.append("milk")
	SaveSystem.yaz(GameState.yuva, S)
	_tahta_yenile()
	# pencere
	_ekrana_gec()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	v.add_child(Tema.yazi("Yıldız Teyze'nin defterinden", 16, Tema.SOLUK))
	var adlar: Array = []
	for id in yeni:
		var d: Dictionary = _D().drinks[id]
		adlar.append(d.name)
		var kutu := VBoxContainer.new()
		kutu.add_child(Tema.yazi(d.name, 21, Tema.KAHVE, true))
		kutu.add_child(Tema.yazi(d.card, 16))
		var eksik: Array = []
		for a in d.get("needs", []):
			if not S.tools.get(a, false):
				eksik.append(_D().tools[a].name)
		if not eksik.is_empty():
			kutu.add_child(Tema.yazi("Menüye girmesi için gerekli: %s (gün sonunda Dükkan › Aletler & Makineler)." % ", ".join(eksik), 15, Color("8a6412")))
		elif not YAPILABILIR.has(id):
			kutu.add_child(Tema.yazi("Bu tarifin istasyonu Godot sürümüne sonra gelecek; o zamana kadar müşteriler istemez.", 15, Tema.SOLUK))
		v.add_child(kutu)
	if not yeni_bardak.is_empty():
		v.add_child(Tema.yazi("Yeni bardaklar Tedarik listesine eklendi: %s. Gün sonunda Tedarik'ten satın al." % ", ".join(yeni_bardak), 15, Color("8a6412")))
	if sut_yeni:
		v.add_child(Tema.yazi(String(_D().tutorial.milk), 16, Tema.SOLUK))
	Flow.pencere("Yeni tarif%s: %s" % ["ler" if yeni.size() > 1 else "", ", ".join(adlar)], v, [
		{"metin": "Tedarik'e git", "fn": func(): _tedarik("ara")},
		{"metin": "Tamam", "tur": "ana", "fn": _acilis_kapandi}], _acilis_kapandi, 640)


## Açılış penceresi başka bir pencerenin (gün sonu, Dükkan) üstünde açıldıysa oyun duraklı kalır.
func _acilis_kapandi() -> void:
	if Flow.yigin.is_empty():
		_ekrandan_cik()


# ---------- servis sonrası: ilerleme, görev, rütbe ----------
func _servis_sonrasi(m: Dictionary, tutar: int, bahsis: int, servis: int) -> void:
	super._servis_sonrasi(m, tutar, bahsis, servis)
	_tarif_tik()
	_gorev_ilerle("serveDrink", 1, m.tarif)
	if servis >= 95:
		_gorev_ilerle("perfect", 1, "")
	_gorev_ilerle("earn", tutar + bahsis, "")
	var r: String = rutbe().name
	if r != rutbe_bas:
		rutbe_bas = r
		flash = "Rütbe atladın: %s! Renkli bölgeler daraldı, bahşiş arttı." % r
		bolge_guncelle()
	_tahta_yenile()
	tarifleri_ac()


# ---------- günlük görev (web makeTask / taskProgress) ----------
func _ac() -> void:
	super._ac()
	var S := GameState.S
	var ilk_gun: bool = int(S.day) == 1 and not "first" in S.get("taught", [])
	if not ilk_gun and gorev.is_empty():
		gorev = _gorev_yap()
	bolge_guncelle()


func _gorev_yap() -> Dictionary:
	var g: Dictionary = _D().tasks[rng.randi() % _D().tasks.size()]
	var k := {"kind": g.kind, "money": int(g.money), "xp": int(g.xp), "prog": 0, "done": false, "failed": false, "n": 1}
	if g.has("n"):
		k.n = rng.randi_range(int(g.n[0]), int(g.n[1]))
	var menu: Array = []
	for id in GameState.S.unlocked:
		if YAPILABILIR.has(id) and aletleri_var(id):
			menu.append(id)
	if g.kind == "serveDrink":
		k.drink = menu[rng.randi() % menu.size()] if not menu.is_empty() else "espresso"
	k.text = String(g.text).replace("{n}", str(k.n)).replace("{d}", _D().drinks[k.get("drink", "espresso")].name if k.has("drink") else "")
	return k


func _gorev_ilerle(tur: String, miktar: int, tarif: String) -> void:
	var k := gorev
	if k.is_empty() or k.done or k.failed or k.kind != tur:
		return
	if tur == "serveDrink" and tarif != k.drink:
		return
	k.prog = int(k.prog) + miktar
	if int(k.prog) >= int(k.n):
		_gorev_bitti()


func _gorev_bitti() -> void:
	gorev.done = true
	GameState.S.money = float(GameState.S.money) + int(gorev.money)
	GameState.S.xp = int(GameState.S.xp) + int(gorev.xp)
	flash = "Görev tamam · +₺%s, +%d XP" % [GameState.tl(gorev.money), int(gorev.xp)]


func _musteri_kacti(m: Dictionary) -> void:
	super._musteri_kacti(m)
	if not gorev.is_empty() and gorev.kind == "noLeave" and not gorev.done:
		gorev.failed = true


func _gun_bitti() -> void:
	if not gorev.is_empty() and gorev.kind == "noLeave" and not gorev.failed and not gorev.done and ist.hizmet > 0:
		_gorev_bitti()
	super._gun_bitti()
	if not gorev.is_empty():
		son.L.task = gorev.duplicate()
		GameState.S.endPending = son
		SaveSystem.yaz(GameState.yuva, GameState.S)


func _hesap_kredi_satirlari() -> Array:
	var out := super._hesap_kredi_satirlari()
	var k: Dictionary = son.L.get("task", {})
	if not k.is_empty():
		out.insert(0, ["Günlük görev: " + String(k.text), ("✓ +₺" + GameState.tl(k.money)) if k.done else "✗"])
	return out


# ---------- ekran ----------
func build_ui() -> void:
	super.build_ui()
	ilerleme_hud = Label.new()
	ilerleme_hud.anchor_left = 1.0
	ilerleme_hud.anchor_right = 1.0
	ilerleme_hud.offset_left = -620
	ilerleme_hud.offset_right = -20
	ilerleme_hud.offset_top = 44
	ilerleme_hud.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	style(ilerleme_hud, 17)
	info.get_parent().add_child(ilerleme_hud)
	gorev_hud = Label.new()
	gorev_hud.anchor_left = 0.5
	gorev_hud.anchor_right = 0.5
	gorev_hud.offset_left = -360
	gorev_hud.offset_right = 360
	gorev_hud.offset_top = 82
	gorev_hud.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	style(gorev_hud, 18)
	info.get_parent().add_child(gorev_hud)


func _hud() -> void:
	super._hud()
	if ilerleme_hud == null:
		return
	var S := GameState.S
	var r := rutbe()
	var s := "%s · %d XP · " % [r.name, int(S.xp)]
	var nx := sonraki_tarif()
	if nx == "":
		s += "Tüm tarifler açık"
	elif int(_D().drinks[nx].get("shop", 1)) > _yildiz():
		s += "Yeni tarif için %d★ dükkan" % int(_D().drinks[nx].shop)
	else:
		var kalan := int(_D().drinks[nx].unlockCups) - tarif_ilerlemesi()
		s += "Yeni tarife %d kahve daha" % kalan if kalan > 0 else "Yeni tarif açılıyor"
	if int(S.get("streak", 0)) >= 2:
		s += " · Seri %d (bahşiş ×%s)" % [int(S.streak), _v(_seri_carpani(), 1)]
	if ilerleme_hud.text != s:
		ilerleme_hud.text = s
	var g := ""
	if not gorev.is_empty():
		var k := gorev
		g = "Görev: " + String(k.text)
		if k.kind != "noLeave":
			g += " · %d/%d" % [mini(int(k.prog), int(k.n)), int(k.n)]
		g += " ✓" if k.done else (" ✗" if k.failed else " · ödül ₺%s + %d XP" % [GameState.tl(k.money), int(k.xp)])
	if gorev_hud.text != g:
		gorev_hud.text = g


# ---------- menü tahtası ----------
func _tahta_kur() -> void:
	slab(TAHTA_POS, Vector3(1.1, 0.56, 0.03), mat(Color("1f2a24"), 0.9))
	slab(TAHTA_POS + Vector3(0, 0, -0.005), Vector3(1.16, 0.62, 0.025), mat(Color("6b4a2e"), 0.7))
	tahta = _tahta_yazi(Vector3(0, 0.25, 0.02), 30)
	tahta.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tahta_sol = _tahta_yazi(Vector3(-0.27, 0.19, 0.02), 19)
	tahta_sag = _tahta_yazi(Vector3(0.27, 0.19, 0.02), 19)
	_tahta_yenile()


func _tahta_yazi(ofs: Vector3, boy: int) -> Label3D:
	var l := Label3D.new()
	l.font_size = boy
	l.pixel_size = 0.0016
	l.modulate = Color("efe8d8")
	l.outline_size = 0
	l.line_spacing = -6
	l.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	l.position = TAHTA_POS + ofs
	add_child(l)
	return l


func _tahta_yenile() -> void:
	if tahta == null:
		return
	var satirlar: Array = []
	for id in GameState.S.unlocked:
		if YAPILABILIR.has(id) and aletleri_var(id):
			satirlar.append("%s  ₺%s" % [_D().drinks[id].name, GameState.tl(fiyat(id))])
	if satirlar.size() > 24:
		var fazla := satirlar.size() - 23
		satirlar = satirlar.slice(0, 23)
		satirlar.append("+%d tarif daha" % fazla)
	tahta.text = "MENÜ"
	tahta_sol.text = "\n".join(satirlar.slice(0, 12))
	tahta_sag.text = "\n".join(satirlar.slice(12, 24))


func _fiyatlar(kip: String) -> void:
	super._fiyatlar(kip)
	_tahta_yenile()
