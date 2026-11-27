extends "res://dukkan/susleme.gd"
## Cezve ocağı: Türk kahvesi ailesi (tasarım belgesi "Cezve ocağı: Türk kahvesi ailesi (Faz 3c)").

const CZ := Vector3(0.5, 0.92, -2.62)     ## tezgâhın üst ortası
const OCAK := Vector3(0.18, 0.92, -2.62)
const CEZVE_YER := Vector3(0.4, 0.92, -2.56)
const KOPUK_AYAR := {"tkfoam": {"hiz": 30.0, "hedef": 80.0}, "mirraboil": {"hiz": 14.0, "hedef": 82.0}}

var cz_g := 0.0                            ## cezvedeki kahve (g) ya da ezme (kaşık)
var cz_seker := 0
var cz_tur := 0
var cz_durum := "bos"                      ## bos → dozlandi → karisti → ocakta → pisti → tepsi
var cz_kopuk := 0.0
var cz_servis := 0
var cz_bas := 0.0
var cz_e_once := false                     ## E tuşunun önceki karedeki hâli (ocaktan almada kenar algılama)
var cezve: Node3D
var cz_kopuk_disk: MeshInstance3D
var alev: MeshInstance3D
var olcek: Node3D
var olcek_bolge: Array = []
var olcek_igne: MeshInstance3D
var cz_yazi: Label3D
var cz_govde: MeshInstance3D


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	var T: Dictionary = GameState.S.tools
	if not (T.get("cezve", false) or T.get("sandStove", false) or T.get("clayPot", false) or T.get("dallah", false)):
		return
	slab(Vector3(CZ.x, 0.45, -2.75), Vector3(1.0, 0.9, 0.5), mat(Color("3a2416"), 0.6))
	slab(Vector3(CZ.x, 0.91, -2.75), Vector3(1.04, 0.03, 0.54), mat(Color("e8e1d4"), 0.4))
	# ocak
	cyl(self, OCAK + Vector3(0, 0.02, 0), 0.1, 0.04, Color("1d1d1d"), 0.4, 0.5)
	var izgara := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.05
	tm.outer_radius = 0.065
	izgara.mesh = tm
	izgara.material_override = mat(Color("2b2b2b"), 0.4, 0.6)
	izgara.position = OCAK + Vector3(0, 0.045, 0)
	izgara.scale = Vector3(1, 0.5, 1)
	add_child(izgara)
	alev = cyl(self, OCAK + Vector3(0, 0.05, 0), 0.04, 0.03, Color("4fa3ff"), 0.2)
	var am := alev.material_override as StandardMaterial3D
	am.emission_enabled = true
	am.emission = Color("3f8cff")
	am.emission_energy_multiplier = 2.0
	(alev.mesh as CylinderMesh).top_radius = 0.005
	alev.visible = false
	collider(OCAK + Vector3(0, 0.08, 0), Vector3(0.2, 0.16, 0.2), "cz_ocak")
	# cezve
	cezve = Node3D.new()
	cezve.position = CEZVE_YER
	add_child(cezve)
	var govde := cyl(cezve, Vector3(0, 0.045, 0), 0.04, 0.09, Color("b8733a"), 0.3, 0.8)
	(govde.mesh as CylinderMesh).bottom_radius = 0.05
	cz_govde = govde
	if T.get("sandStove", false):
		var kum := _k(self, OCAK + Vector3(0, 0.03, 0), Vector3(0.26, 0.04, 0.24), Color("d9b77a"), 1.0)
		kum.name = "Kum"
	_k(cezve, Vector3(0.12, 0.08, 0), Vector3(0.16, 0.012, 0.018), Color("3a2416"), 0.6)
	cz_kopuk_disk = cyl(cezve, Vector3(0, 0.03, 0), 0.036, 0.004, Color("5a3418"), 0.9)
	cz_kopuk_disk.visible = false
	collider(CEZVE_YER + Vector3(0, 0.06, 0), Vector3(0.14, 0.14, 0.14), "cz_cezve")
	# kavanozlar, şeker, finjanlar, tepsi
	_kavanoz(CZ + Vector3(0.08, 0, -0.1), Color("3b2414"), "cz_kahve")
	_kavanoz(CZ + Vector3(0.18, 0, -0.1), Color(String(_D().specials.menengic.color)), "cz_ezme_menengic")
	_kavanoz(CZ + Vector3(0.28, 0, -0.1), Color(String(_D().specials.kenger.color)), "cz_ezme_kenger")
	var kase := cyl(self, CZ + Vector3(0.16, 0.025, 0.08), 0.05, 0.05, Color("f6efe3"), 0.4)
	cyl(kase, Vector3(0, 0.022, 0), 0.044, 0.006, Color("ffffff"), 0.9)
	collider(CZ + Vector3(0.16, 0.05, 0.08), Vector3(0.12, 0.1, 0.12), "cz_seker")
	for i in 3:
		make_cup(self, "finjan").position = CZ + Vector3(0.43, 0.0 + i * 0.03, -0.1)
	_k(self, CZ + Vector3(0.38, 0.006, 0.08), Vector3(0.22, 0.012, 0.15), Color("b08a3e"), 0.3, 0.8)
	collider(CZ + Vector3(0.38, 0.06, 0.04), Vector3(0.24, 0.14, 0.24), "cz_servis")
	# köpük göstergesi (Kural 9)
	olcek = Node3D.new()
	olcek.position = OCAK + Vector3(0.0, 0.1, -0.13)
	olcek.rotation_degrees.y = 180
	add_child(olcek)
	_k(olcek, Vector3(0, 0.08, 0), Vector3(0.02, 0.16, 0.006), Color("2b2b2b"), 0.6)
	for c in [Color("e2c044"), Color("8fcf6a"), Color("2f8a3a")]:
		var z := _k(olcek, Vector3(0, 0, 0.004 + 0.001 * olcek_bolge.size()), Vector3(0.022, 0.01, 0.002), c, 0.6)
		var zm := z.material_override as StandardMaterial3D
		zm.emission_enabled = true
		zm.emission = c
		zm.emission_energy_multiplier = 0.4
		olcek_bolge.append(z)
	olcek_igne = _k(olcek, Vector3(0, 0, 0.009), Vector3(0.03, 0.003, 0.003), Color.WHITE, 0.3)
	olcek.visible = false
	cz_yazi = Label3D.new()
	cz_yazi.font_size = 48
	cz_yazi.pixel_size = 0.0006
	cz_yazi.modulate = Color(0.55, 1.0, 0.7)
	cz_yazi.outline_size = 8
	cz_yazi.rotation_degrees.y = 180
	cz_yazi.position = CEZVE_YER + Vector3(0, 0.14, 0)
	cz_yazi.text = ""
	add_child(cz_yazi)


func _kavanoz(p: Vector3, icerik: Color, id: String) -> void:
	var cam := StandardMaterial3D.new()
	cam.albedo_color = Color(0.9, 0.95, 1.0, 0.35)
	cam.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var g := cyl(self, p + Vector3(0, 0.06, 0), 0.035, 0.12, Color.WHITE)
	g.material_override = cam
	cyl(self, p + Vector3(0, 0.04, 0), 0.032, 0.075, icerik, 0.9)
	cyl(self, p + Vector3(0, 0.125, 0), 0.037, 0.012, Color("b08a3e"), 0.3, 0.8)
	collider(p + Vector3(0, 0.06, 0), Vector3(0.09, 0.14, 0.09), id)


# ---------- sipariş ----------
func cezve_siparis() -> bool:
	if siparis_tarif == "":
		return false
	var st: Array = _tarif().get("steps", [])
	return "tkfoam" in st or "mirraboil" in st


func _kopuk_adim() -> String:
	return "mirraboil" if "mirraboil" in _tarif().get("steps", []) else "tkfoam"


func _seker_n() -> int:
	if sira.is_empty():
		return 0
	var sv: String = sira[0].get("seker", "")
	return int(_D().sugarLevels[sv].n) if sv != "" else 0


func _ezme_anahtar() -> String:
	for u in _tarif().get("uses", []):
		if u[0] in ["menengic", "kenger"]:
			return u[0]
	return ""


func _siparis_al(m: Dictionary) -> void:
	super._siparis_al(m)
	_cz_sifirla()


func _cz_sifirla() -> void:
	cz_g = 0.0
	cz_seker = 0
	cz_tur = 0
	cz_durum = "bos"
	cz_kopuk = 0.0
	cz_servis = 0
	if cezve:
		var ihtiyac: Array = _tarif().get("needs", []) if siparis_tarif != "" else []
		var renk := Color("b8733a")
		var olc := Vector3.ONE
		if "clayPot" in ihtiyac:
			renk = Color("8a4a2a")
			olc = Vector3(1.4, 1.1, 1.4)
		elif "dallah" in ihtiyac:
			renk = Color("c9a24a")
			olc = Vector3(1.1, 1.6, 1.1)
		cz_govde.material_override = mat(renk, 0.3, 0.8 if not "clayPot" in ihtiyac else 0.0)
		cz_govde.scale = olc
		cezve.position = CEZVE_YER
		cz_kopuk_disk.visible = false
		alev.visible = false
		olcek.visible = false
		cz_yazi.text = ""


## Şekerli tariflerde müşteri şeker derecesini de söyler.
func _musteri_getir() -> void:
	var once := sira.size()
	super._musteri_getir()
	if sira.size() <= once:
		return
	var m: Dictionary = sira.back()
	if not Content.tarif(m.tarif).get("sugar", false) or m.get("ogretici", false):
		return
	var dereceler: Array = _D().sugarLevels.keys()
	m.seker = dereceler[rng.randi() % dereceler.size()]
	m.metin_ad = String(_D().sugarLevels[m.seker].say) + " " + String(Content.tarif(m.tarif).name).to_lower()
	m.metin = _siparis_cumlesi(m.tip, m.metin_ad)


func fp_fincan(boy: String) -> String:
	if String(_D().sizes.get(boy, {}).get("cup", "")) == "tkCup":
		return "finjan"
	return super.fp_fincan(boy)


func size_name(s: String) -> String:
	return "finjan" if s == "finjan" else super.size_name(s)


func cup_dims(size: String) -> Vector2:
	return Vector2(0.032, 0.05) if size == "finjan" else super.cup_dims(size)


func hold(kind: String, size: String) -> void:
	if kind != "tk_tepsi":
		super.hold(kind, size)
		return
	drop_held()
	held_kind = kind
	held = Node3D.new()
	cam.add_child(held)
	held.position = Vector3(0.3, -0.32, -0.6)
	_k(held, Vector3(0, -0.07, 0), Vector3(0.24, 0.01, 0.16), Color("b08a3e"), 0.3, 0.8)
	make_cup(held, "finjan", 1.0).position = Vector3(-0.04, -0.065, 0)
	var bardak := StandardMaterial3D.new()
	bardak.albedo_color = Color(0.85, 0.93, 1.0, 0.4)
	bardak.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var b := cyl(held, Vector3(0.06, -0.03, 0.02), 0.022, 0.07, Color.WHITE)
	b.material_override = bardak
	var lokum := _k(held, Vector3(0.06, -0.058, -0.045), Vector3(0.025, 0.02, 0.025), Color("f2b8c6"), 0.9)
	lokum.rotation_degrees.y = 20


func _harca(m: Dictionary) -> void:
	super._harca(m)
	var n := int(_D().sugarLevels.get(m.get("seker", ""), {"n": 0}).n)
	if n > 0:
		GameState.S.extras.sugar = maxi(0, int(GameState.S.extras.get("sugar", 0)) - n)


# ---------- etkileşim ----------
func action_text(id: String) -> String:
	if id.begins_with("cz_") and mode == "":
		if not cezve_siparis():
			return "Bu siparişte cezve yok"
		var st: Array = _tarif().steps
		match id:
			"cz_kahve":
				if not "tkdose" in st: return "Bu tarifte kahve yok"
				return "E basılı: cezveye kahve koy" if cz_durum == "bos" else "Kahve konuldu"
			"cz_ezme_menengic", "cz_ezme_kenger":
				if id.substr(8) != _ezme_anahtar(): return "Bu siparişte yok"
				return "E basılı: cezveye ezme koy" if cz_durum == "bos" else "Ezme konuldu"
			"cz_seker":
				if not _tarif().get("sugar", false): return "Bu tarifte şeker yok"
				if cz_durum in ["bos", "dozlandi"]: return "E: Bir kaşık şeker (%d)" % cz_seker
				return "Şeker karıştırmadan önce konur"
			"cz_cezve":
				if cz_durum == "dozlandi": return "E: Karıştır (%d/3)" % cz_tur
				if cz_durum == "bos": return "Önce cezveye kahve koy"
				return ""
			"cz_ocak":
				if cz_durum == "karisti": return "E: Cezveyi ocağa koy"
				if cz_durum in ["bos", "dozlandi"]: return "Önce kahveyi koy ve karıştır"
				return ""
			"cz_servis":
				if cz_durum == "pisti" and held_kind == "":
					return ("E: Servis: finjan, su, lokum (%d/3)" % cz_servis) if "tkserve" in st else "E: Fincana dök"
				return "Önce kahveyi pişir" if cz_durum in ["bos", "dozlandi", "karisti"] else ""
	if id == "customer" and cezve_siparis() and cstate == "wait":
		return "E: Kahveyi ver" if held_kind in ["tk_tepsi", "cup_full"] else "Sipariş: %s · %s" % [siparis_adi, size_name(order_size)]
	return super.action_text(id)


func interact(id: String) -> void:
	if not id.begins_with("cz_"):
		super.interact(id)
		return
	if not action_text(id).begins_with("E"):
		return
	match id:
		"cz_kahve", "cz_ezme_menengic", "cz_ezme_kenger":
			cz_g = 0.0
			mode = "cz_doz" if id == "cz_kahve" else "cz_ezme"
			cz_bas = Time.get_ticks_msec() / 1000.0
			prompt.text = ""
		"cz_seker":
			cz_seker += 1
			Ses.sfx("click")
			prompt_flash("Şeker: %d kaşık" % cz_seker)
		"cz_cezve":
			cz_tur += 1
			Ses.sfx("click")
			prompt_flash("Karıştır: %d/3" % cz_tur)
			if cz_tur >= 3:
				if _tarif().get("sugar", false):
					var fark := absi(cz_seker - _seker_n())
					step_scores.append(100.0 if fark == 0 else (72.0 if fark == 1 else 0.0))
				step_scores.append(100.0)
				cz_durum = "karisti"
				prompt_flash("Karıştırıldı · şeker %d kaşık" % cz_seker)
		"cz_ocak":
			cezve.position = OCAK + Vector3(0, 0.05, 0)
			alev.visible = true
			cz_kopuk = 0.0
			cz_kopuk_disk.visible = true
			cz_durum = "ocakta"
			adim_simdi = "tkfoam"
			bolge_guncelle()
			olcek.visible = int(GameState.S.served.get(siparis_tarif, 0)) < 3
			_olcek_kur()
			mode = "cz_ocak"
			cz_bas = Time.get_ticks_msec() / 1000.0
			cz_e_once = true
			prompt.text = ""
		"cz_servis":
			cz_servis += 1
			Ses.sfx("click")
			if not "tkserve" in _tarif().steps or cz_servis >= 3:
				if "tkserve" in _tarif().steps:
					step_scores.append(100.0)
				cz_durum = "tepsi"
				cezve.position = CEZVE_YER
				cz_kopuk_disk.visible = false
				if fp_fincan(siparis_boy) == "finjan":
					hold("tk_tepsi", "finjan")
				else:
					hold("cup_full", order_size)
				prompt_flash("Servis tepsisi hazır: müşteriye ver")


func _olcek_kur() -> void:
	var A: Dictionary = KOPUK_AYAR[_kopuk_adim()]
	var hiz: float = A.hiz
	var h := 0.16
	var hedef_y: float = float(A.hedef) / 100.0 * h
	var w := [WIN_YELLOW, WIN_LIGHT, WIN_DARK]
	for i in 3:
		var yarim: float = maxf(hiz * w[i] / 100.0 * h, 0.0008)
		(olcek_bolge[i].mesh as BoxMesh).size.y = yarim * 2.0
		olcek_bolge[i].position.y = hedef_y


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu or cezve == null:
		return
	var simdi := Time.get_ticks_msec() / 1000.0
	match mode:
		"cz_doz", "cz_ezme":
			var kahve := mode == "cz_doz"
			if Input.is_action_pressed("interact"):
				cz_g += (2.5 if kahve else 1.0) * delta
				cz_yazi.text = ("%.1f g" % cz_g) if kahve else ("%.1f kaşık" % cz_g)
				hint.text = ("E basılı: kahve · %.1f g (hedef 7 g) · bırakınca biter" % cz_g) if kahve else ("E basılı: ezme · %.1f kaşık (hedef 2) · bırakınca biter" % cz_g)
			elif cz_g > 0.05:
				var hedef := 7.0 if kahve else 2.0
				var esik := [0.2, 0.5, 1.0] if kahve else [0.2, 0.4, 0.7]
				var k := genislik("dose") if kahve else 1.0
				var dev := absf(cz_g - hedef)
				var sc := 100.0 if dev <= esik[0] * k else (88.0 if dev <= esik[1] * k else (72.0 if dev <= esik[2] * k else 0.0))
				step_scores.append(sc)
				mode = ""
				hint.text = ""
				cz_durum = "dozlandi" if "tkstir" in _tarif().steps else "karisti"
				Ses.sfx("dose")
				prompt_flash("%s: %s" % ["Kahve %.1f g" % cz_g if kahve else "Ezme %.1f kaşık" % cz_g, {100.0: "Mükemmel!", 88.0: "Güzel", 72.0: "İyi", 0.0: "Kaçtı"}[sc]])
		"cz_ocak":
			var A: Dictionary = KOPUK_AYAR[_kopuk_adim()]
			cz_kopuk += float(A.hiz) * delta
			var h := 0.16
			olcek_igne.position.y = clampf(cz_kopuk / 100.0, 0.0, 1.0) * h
			cz_kopuk_disk.position.y = 0.03 + clampf(cz_kopuk / 100.0, 0.0, 1.0) * 0.06
			(cz_kopuk_disk.material_override as StandardMaterial3D).albedo_color = Color("5a3418").lerp(Color("c99a62"), clampf(cz_kopuk / 100.0, 0.0, 1.0))
			hint.text = ("Köpük kabarıyor · %%%d · E: Ocaktan al" % int(cz_kopuk)) if olcek.visible else "Köpüğe bak: taşmadan hemen önce E ile ocaktan al"
			var e_simdi := Input.is_action_pressed("interact")
			var al := e_simdi and not cz_e_once and simdi - cz_bas > 0.25
			cz_e_once = e_simdi
			if al or cz_kopuk >= 100.0:
				var secs := absf(cz_kopuk - float(A.hedef)) / float(A.hiz)
				var sc := 0.0
				if cz_kopuk < 100.0:
					sc = 100.0 if secs <= WIN_DARK else (88.0 if secs <= WIN_LIGHT else (72.0 if secs <= WIN_YELLOW else 0.0))
				step_scores.append(sc)
				if sc < 70.0 and _kopuk_adim() == "tkfoam":
					ipucu("tkfoam_low" if cz_kopuk < float(A.hedef) else "tkfoam_high")
				mode = ""
				hint.text = ""
				alev.visible = false
				olcek.visible = false
				cz_durum = "pisti"
				prompt_flash("Köpük: %s" % ("taştı!" if cz_kopuk >= 100.0 else {100.0: "Mükemmel!", 88.0: "Güzel", 72.0: "İyi", 0.0: "Kaçtı"}[sc]))


## Cezve siparişi espresso istasyonunun durumunu değiştirmez.
func serve() -> void:
	if not cezve_siparis():
		super.serve()
		return
	var st := stage
	var tut := held_kind
	super.serve()
	stage = st
	if tut in ["tk_tepsi", "cup_full"]:
		drop_held()
	_cz_sifirla()
