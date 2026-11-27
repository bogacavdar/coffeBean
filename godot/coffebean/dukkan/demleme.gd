extends "res://dukkan/kahvesiz.gd"
## Demleme tezgâhı (tasarım belgesi "Demleme tezgâhı (Faz 3e)"): French press, V60, Chemex, Kalita, AeroPress, moka, kopi.

const DM_X := 1.4
const DM_YER := Vector3(DM_X, 0.92, -2.56)
const DM_CIHAZ := Vector3(DM_X, 0.92, -2.8)
const DM_TORBA := Vector3(DM_X - 0.22, 0.92, -2.84)
const DM_KETTLE := Vector3(DM_X + 0.21, 0.92, -2.84)
const DM_ADIMLAR := ["fdose", "fpdose", "bloom", "pourover", "fpwater", "steepcup", "mokafill", "fpsteep", "apsteep", "mokaheat", "fpplunge", "appress", "stir"]
const CIHAZLAR := ["frenchPress", "v60", "chemex", "kalita", "aeropress", "mokaPot"]
const DOZ := {"S": 15.0, "M": 20.0, "L": 25.0}

var dm_fincan: Node3D
var dm_tur := ""
var dm_i := 0
var dm_doz := 0.0
var dm_su := 0.0
var dm_v := 0.0
var dm_bas := 0.0
var dm_e_once := false
var dm_cihaz: Node3D
var dm_yazi: Label3D
var dm_olcek: Node3D
var dm_bolge: Array = []
var dm_igne: MeshInstance3D
var dm_kurulu := false


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	var T: Dictionary = GameState.S.tools
	if not (T.get("kettle", false) or T.get("mokaPot", false)):
		return
	dm_kurulu = true
	slab(Vector3(DM_X, 0.45, -2.75), Vector3(0.6, 0.9, 0.5), mat(Color("3a2416"), 0.6))
	slab(Vector3(DM_X, 0.91, -2.75), Vector3(0.64, 0.03, 0.54), mat(Color("e8e1d4"), 0.4))
	# kahve torbası
	var torba := _k(self, DM_TORBA + Vector3(0, 0.09, 0), Vector3(0.1, 0.18, 0.06), Color("6b4a2f"), 0.9)
	torba.rotation_degrees.y = 10
	_k(self, DM_TORBA + Vector3(0, 0.12, 0.031), Vector3(0.06, 0.05, 0.002), Color("efe3c8"), 0.9)
	collider(DM_TORBA + Vector3(0, 0.09, 0), Vector3(0.12, 0.2, 0.1), "dm_torba")
	# kuğu boyunlu kettle
	cyl(self, DM_KETTLE + Vector3(0, 0.07, 0), 0.06, 0.13, Color("2b2b2b"), 0.3, 0.7)
	var boyun := cyl(self, DM_KETTLE + Vector3(-0.06, 0.13, 0), 0.007, 0.16, Color("2b2b2b"), 0.3, 0.7)
	boyun.rotation_degrees.z = 50
	_k(self, DM_KETTLE + Vector3(0.07, 0.1, 0), Vector3(0.015, 0.09, 0.02), Color("1d1d1d"), 0.5)
	collider(DM_KETTLE + Vector3(0, 0.08, 0), Vector3(0.16, 0.18, 0.14), "dm_kettle")
	# fincan yeri ve alet yeri
	mrbox(self, DM_YER + Vector3(0, 0.004, 0), Vector3(0.14, 0.008, 0.14), mat(Color("2b2b2b"), 0.9), 0.01)
	collider(DM_YER + Vector3(0, 0.08, 0), Vector3(0.16, 0.16, 0.16), "dm_yer")
	collider(DM_CIHAZ + Vector3(0, 0.1, 0), Vector3(0.16, 0.22, 0.14), "dm_cihaz")
	dm_yazi = Label3D.new()
	dm_yazi.font_size = 48
	dm_yazi.pixel_size = 0.0006
	dm_yazi.modulate = Color(0.55, 1.0, 0.7)
	dm_yazi.outline_size = 8
	dm_yazi.rotation_degrees.y = 180
	dm_yazi.position = DM_CIHAZ + Vector3(0, 0.27, 0)
	add_child(dm_yazi)
	dm_olcek = Node3D.new()
	dm_olcek.position = DM_CIHAZ + Vector3(0, 0.24, 0)
	dm_olcek.rotation_degrees.y = 180
	add_child(dm_olcek)
	_k(dm_olcek, Vector3.ZERO, Vector3(0.18, 0.012, 0.004), Color("2b2b2b"), 0.6)
	for c in [Color("e2c044"), Color("8fcf6a"), Color("2f8a3a")]:
		var z := _k(dm_olcek, Vector3(0, 0, 0.003 + 0.001 * dm_bolge.size()), Vector3(0.01, 0.014, 0.002), c, 0.6)
		var zm := z.material_override as StandardMaterial3D
		zm.emission_enabled = true
		zm.emission = c
		zm.emission_energy_multiplier = 0.4
		dm_bolge.append(z)
	dm_igne = _k(dm_olcek, Vector3(0, 0, 0.007), Vector3(0.003, 0.02, 0.003), Color.WHITE, 0.3)
	dm_olcek.visible = false


# ---------- sipariş ----------
func demleme_siparis() -> bool:
	return siparis_tarif != "" and not _dm_adimlar().is_empty()


func _dm_adimlar() -> Array:
	var out: Array = []
	for s in _tarif().get("steps", []):
		if s in DM_ADIMLAR:
			out.append(s)
	return out


func _dm_simdi() -> String:
	var A := _dm_adimlar()
	return A[dm_i] if dm_i < A.size() else ""


## Demleme espressodan önce (red eye).
func demleme_once() -> bool:
	return demleme_siparis() and "extract" in _tarif().steps


func _serbest() -> bool:
	return super._serbest() or demleme_once()


func _cihaz_adi() -> String:
	for n in _tarif().get("needs", []):
		if n in CIHAZLAR:
			return n
	return ""


func _siparis_al(m: Dictionary) -> void:
	super._siparis_al(m)
	_dm_sifirla()


func _dm_sifirla() -> void:
	dm_i = 0
	dm_doz = 0.0
	dm_su = 0.0
	dm_v = 0.0
	if not dm_kurulu:
		return
	if dm_fincan:
		dm_fincan.queue_free()
		dm_fincan = null
	if dm_cihaz:
		dm_cihaz.queue_free()
		dm_cihaz = null
	dm_yazi.text = ""
	dm_olcek.visible = false
	if demleme_siparis():
		_cihaz_kur(_cihaz_adi())


func _cihaz_kur(ad: String) -> void:
	dm_cihaz = Node3D.new()
	dm_cihaz.position = DM_CIHAZ
	add_child(dm_cihaz)
	var cam := StandardMaterial3D.new()
	cam.albedo_color = Color(0.85, 0.93, 1.0, 0.35)
	cam.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	match ad:
		"frenchPress":
			var g := cyl(dm_cihaz, Vector3(0, 0.09, 0), 0.045, 0.17, Color.WHITE)
			g.material_override = cam
			cyl(dm_cihaz, Vector3(0, 0.18, 0), 0.048, 0.015, Color("2b2b2b"), 0.3, 0.7)
			var pis := cyl(dm_cihaz, Vector3(0, 0.22, 0), 0.005, 0.08, Color("c0c0c0"), 0.3, 0.8)
			pis.name = "Piston"
			cyl(dm_cihaz, Vector3(0, 0.04, 0), 0.042, 0.06, Color("3b2414"), 0.9).name = "Kahve"
		"v60", "kalita", "chemex":
			var sv := cyl(dm_cihaz, Vector3(0, 0.07, 0), 0.05, 0.14, Color.WHITE)
			sv.material_override = cam
			var kon := cyl(dm_cihaz, Vector3(0, 0.18, 0), 0.06, 0.08, Color("f4f1ea") if ad != "kalita" else Color("c0c0c0"), 0.3, 0.0 if ad != "kalita" else 0.8)
			(kon.mesh as CylinderMesh).bottom_radius = 0.02 if ad != "kalita" else 0.035
			if ad == "chemex":
				sv.material_override = cam
				_k(dm_cihaz, Vector3(0, 0.13, 0), Vector3(0.05, 0.02, 0.05), Color("b07a48"), 0.9)
			cyl(dm_cihaz, Vector3(0, 0.03, 0), 0.046, 0.04, Color("3b2414"), 0.9).name = "Kahve"
		"aeropress":
			var t := cyl(dm_cihaz, Vector3(0, 0.08, 0), 0.032, 0.14, Color.WHITE)
			t.material_override = cam
			cyl(dm_cihaz, Vector3(0, 0.17, 0), 0.03, 0.05, Color("1d1d1d"), 0.5).name = "Piston"
			cyl(dm_cihaz, Vector3(0, 0.03, 0), 0.03, 0.04, Color("3b2414"), 0.9).name = "Kahve"
		"mokaPot":
			cyl(dm_cihaz, Vector3(0, 0.01, 0), 0.07, 0.02, Color("2b2b2b"), 0.4, 0.5).name = "Plaka"
			var alt := cyl(dm_cihaz, Vector3(0, 0.07, 0), 0.045, 0.1, Color("c0c0c0"), 0.3, 0.85)
			(alt.mesh as CylinderMesh).radial_segments = 8
			var ust := cyl(dm_cihaz, Vector3(0, 0.16, 0), 0.04, 0.08, Color("c0c0c0"), 0.3, 0.85)
			(ust.mesh as CylinderMesh).radial_segments = 8
			(ust.mesh as CylinderMesh).top_radius = 0.032
			_k(dm_cihaz, Vector3(0.06, 0.16, 0), Vector3(0.05, 0.015, 0.015), Color("1d1d1d"), 0.5)
	var k := dm_cihaz.get_node_or_null("Kahve")
	if k:
		k.visible = false


# ---------- hedefler ----------
func _dm_hedef(s: String) -> float:
	var doz: float = 10.0 if siparis_tarif == "kopi" else float(DOZ.get(siparis_boy, 20.0))
	match s:
		"fdose", "fpdose": return doz
		"bloom": return maxf(dm_doz, doz) * 2.0
		"pourover", "fpwater": return maxf(dm_doz, doz) * 15.0
		"steepcup": return 200.0
		"mokafill": return 150.0
		"fpsteep": return 240.0
		"apsteep": return 90.0
		"mokaheat": return 75.0
	return 1.0


func _dm_hiz(s: String) -> float:
	match s:
		"fdose", "fpdose": return 5.0
		"bloom": return 15.0
		"mokafill": return 20.0
		"pourover", "fpwater", "steepcup": return 40.0
		"fpsteep", "apsteep": return 30.0
		"mokaheat": return 20.0
		"fpplunge", "appress": return 0.4
	return 1.0


func _bant(f: float, h: float) -> float:
	var d := absf(f - h) / maxf(h, 0.001)
	return 100.0 if d <= 0.03 else (88.0 if d <= 0.06 else (72.0 if d <= 0.12 else 0.0))


# ---------- etkileşim ----------
func action_text(id: String) -> String:
	if id.begins_with("dm_") and mode == "":
		if not demleme_siparis():
			return "Bu siparişte demleme yok"
		var s := _dm_simdi()
		if id == "dm_yer":
			if dm_fincan == null:
				if held_kind == "cup":
					for x in _eksik(true):
						if x.tur == "pump":
							return "Önce şurubu pompala (arka tezgâh)"
					return "E: Fincanı demleme yerine koy"
				return "Önce boş bir fincan al"
			if s == "":
				return "E: Fincanı al" if held_kind == "" else ""
			if s == "stir":
				return "E: Karıştır (%d/3)" % int(dm_v)
			return "Demleme sürüyor"
		if dm_fincan == null:
			return "Önce fincanı demleme yerine koy"
		match id:
			"dm_torba":
				if s in ["fdose", "fpdose"]: return "E basılı: kahve koy"
			"dm_kettle":
				if s == "bloom": return "E basılı: ön ıslatma"
				if s in ["pourover", "fpwater"]: return "E basılı: sıcak su dök"
				if s == "steepcup": return "E basılı: fincana kaynar su"
				if s == "mokafill": return "E basılı: mokaya su doldur"
			"dm_cihaz":
				if s in ["fpsteep", "apsteep"]: return "E: Demlemeyi başlat"
				if s == "mokaheat": return "E: Mokayı ısıt"
				if s in ["fpplunge", "appress"]: return "E basılı: pistonu bastır"
		return "Sıradaki: %s" % String(_D().minigames.get(s, {"name": s}).name) if s != "" else "Demleme bitti"
	if demleme_once() and id == "machine" and stage == "locked":
		if held_kind == "cup_full":
			return "E: Dolu fincanı tepsiye koy"
		if held_kind == "cup":
			return "Önce filtre kahveyi demle (demleme tezgâhı)"
	return super.action_text(id)


func interact(id: String) -> void:
	if demleme_once() and id == "machine" and mode == "" and action_text(id) == "E: Dolu fincanı tepsiye koy":
		drop_held()
		placed_cup = make_cup(self, cup_size, 0.7)
		placed_cup.position = CUP_POS + Vector3(0, 0.005, 0)
		stage = "cup_on"
		return
	if not id.begins_with("dm_"):
		super.interact(id)
		return
	var t := action_text(id)
	if not t.begins_with("E"):
		return
	var s := _dm_simdi()
	if id == "dm_yer":
		if dm_fincan == null:
			dm_tur = held_kind
			drop_held()
			dm_fincan = make_cup(self, cup_size, 0.0)
			dm_fincan.position = DM_YER + Vector3(0, 0.008, 0)
		elif s == "":
			dm_fincan.queue_free()
			dm_fincan = null
			hold("cup_full", cup_size)
		elif s == "stir":
			dm_v += 1.0
			Ses.sfx("click")
			if dm_v >= 3.0:
				_dm_bitir(100.0, "Karıştırıldı")
		return
	match s:
		"fpsteep", "apsteep", "mokaheat":
			dm_v = 0.0
			mode = "dm_sure"
			adim_simdi = s
			bolge_guncelle()
			_dm_olcek_kur(s)
			dm_olcek.visible = true
			var pl := dm_cihaz.get_node_or_null("Plaka") if dm_cihaz else null
			if pl:
				(pl as MeshInstance3D).material_override = mat(Color("c9483b"), 0.4)
		_:
			dm_v = 0.0
			mode = "dm_tut"
	dm_bas = Time.get_ticks_msec() / 1000.0
	dm_e_once = true
	prompt.text = ""


func _dm_olcek_kur(s: String) -> void:
	var w := 0.18
	var mx := _dm_hedef(s) * 1.4
	var hiz := _dm_hiz(s)
	var wins := [WIN_YELLOW, WIN_LIGHT, WIN_DARK]
	for i in 3:
		var yarim: float = maxf(hiz * wins[i] / mx * w, 0.0008)
		(dm_bolge[i].mesh as BoxMesh).size.x = yarim * 2.0
		dm_bolge[i].position.x = -w * 0.5 + _dm_hedef(s) / mx * w


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu or not dm_kurulu or not mode.begins_with("dm_"):
		return
	var s := _dm_simdi()
	var simdi := Time.get_ticks_msec() / 1000.0
	var e := Input.is_action_pressed("interact")
	match mode:
		"dm_tut":
			if e:
				dm_v += _dm_hiz(s) * delta
				var birim := "g" if s in ["fdose", "fpdose"] else ("" if s in ["fpplunge", "appress"] else "ml")
				if birim == "":
					var p := dm_cihaz.get_node_or_null("Piston") if dm_cihaz else null
					if p:
						p.position.y = 0.22 - clampf(dm_v, 0.0, 1.0) * 0.12
					dm_yazi.text = "%%%d" % int(minf(dm_v, 1.0) * 100)
					hint.text = "E basılı: piston iniyor · %%%d" % int(minf(dm_v, 1.0) * 100)
					if dm_v >= 1.0:
						_dm_bitir(100.0, "Piston indi")
				else:
					var toplam := dm_v + (dm_su if s in ["pourover", "fpwater"] else 0.0)
					dm_yazi.text = "%.0f %s / %.0f" % [toplam, birim, _dm_hedef(s)]
					hint.text = "E basılı · %.0f %s (hedef %.0f) · bırakınca biter" % [toplam, birim, _dm_hedef(s)]
			elif dm_v > 0.02 and not s in ["fpplunge", "appress"]:
				var f := dm_v
				if s in ["fdose", "fpdose"]:
					dm_doz = f
				elif s == "bloom":
					dm_su += f
				elif s in ["pourover", "fpwater"]:
					dm_su += f
					f = dm_su
				var k := dm_cihaz.get_node_or_null("Kahve") if dm_cihaz else null
				if k:
					k.visible = true
				_dm_bitir(_bant(f, _dm_hedef(s)), "%s %.0f" % [String(_D().minigames[s].name), f])
		"dm_sure":
			dm_v += _dm_hiz(s) * delta
			var mx := _dm_hedef(s) * 1.4
			dm_igne.position.x = -0.09 + clampf(dm_v / mx, 0.0, 1.0) * 0.18
			if s == "mokaheat":
				dm_yazi.text = "%%%d" % int(dm_v)
				hint.text = "Moka ısınıyor · fokurdama %%%d · hedef %%75 · E: ocaktan al" % int(dm_v)
			else:
				dm_yazi.text = "%d:%02d" % [int(dm_v) / 60, int(dm_v) % 60]
				hint.text = "Demleniyor · %d:%02d (hedef %d:%02d) · E: durdur" % [int(dm_v) / 60, int(dm_v) % 60, int(_dm_hedef(s)) / 60, int(_dm_hedef(s)) % 60]
			var al := e and not dm_e_once and simdi - dm_bas > 0.25
			dm_e_once = e
			if al or dm_v >= mx or (s == "mokaheat" and dm_v >= 100.0):
				var secs := absf(dm_v - _dm_hedef(s)) / _dm_hiz(s)
				var sc := 100.0 if secs <= WIN_DARK else (88.0 if secs <= WIN_LIGHT else (72.0 if secs <= WIN_YELLOW else 0.0))
				if s == "mokaheat" and dm_v >= 100.0:
					sc = 0.0
				dm_olcek.visible = false
				var pl := dm_cihaz.get_node_or_null("Plaka") if dm_cihaz else null
				if pl:
					(pl as MeshInstance3D).material_override = mat(Color("2b2b2b"), 0.4, 0.5)
				_dm_bitir(sc, "%s %s" % [String(_D().minigames[s].name), dm_yazi.text])


func _dm_bitir(sc: float, etiket: String) -> void:
	step_scores.append(sc)
	mode = ""
	hint.text = ""
	dm_i += 1
	dm_v = 0.0
	var ad := {100.0: "Mükemmel!", 88.0: "Güzel", 72.0: "İyi", 0.0: "Kaçtı"}
	prompt_flash("%s: %s" % [etiket, ad.get(sc, "%d" % int(sc))])
	if _dm_simdi() == "" and dm_fincan:
		dm_fincan.queue_free()
		dm_fincan = make_cup(self, cup_size, 0.9)
		dm_fincan.position = DM_YER + Vector3(0, 0.008, 0)
		dm_yazi.text = ""
		Ses.sfx("extractStop")


## Demleme siparişi espresso istasyonunun durumunu değiştirmez (red eye hariç).
func serve() -> void:
	super.serve()
	_dm_sifirla()
