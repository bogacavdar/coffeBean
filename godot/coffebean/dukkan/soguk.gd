extends "res://dukkan/demleme.gd"
## Soğuk bar (tasarım belgesi "Soğuk bar: buzlu, çalkalanmış ve çırpılmış tarifler (Faz 3f)").

const SB_ADIMLAR := ["ice", "coldwater", "coldmilk", "tonic", "shakeit", "coldfoam", "whisk", "spoontop",
	"blend", "colddrip", "coldpour", "nitrotap", "scoop", "tumbler"]
const SB_NESNE := {"ice": "sb_buz", "coldwater": "sb_su", "coldmilk": "sb_sut", "tonic": "sb_tonik", "shakeit": "sb_shaker",
	"coldfoam": "sb_kopuk", "whisk": "sb_cirpma", "spoontop": "sb_cirpma", "tumbler": "sb_cirpma", "blend": "sb_blender",
	"colddrip": "sb_damla", "coldpour": "sb_cb", "nitrotap": "sb_nitro", "scoop": "sb_dondurma"}
## Süreli adımlar: hız (%/sn) ve hedef (%).
const SB_SURE := {"blend": [22.0, 72.0], "colddrip": [10.0, 80.0]}
const SB_ARAC := ["iceMachine", "iceCreamFridge", "coldBrewJar"]
const SB_YER := Vector3(-3.8, 0.92, -1.8)
const BUZ_YIGIN := {"buz_k": Vector3(-3.98, 1.0, -1.55), "buz_o": Vector3(-3.82, 1.0, -1.55), "buz_b": Vector3(-3.66, 1.0, -1.55), "kase": Vector3(-3.66, 1.0, -1.72)}
const BUZ_N := {"iS": 2, "iM": 3, "iL": 4, "affo1": 1, "affo2": 2}

var sb_kurulu := false
var sb_bardak: Node3D
var sb_faz := ""                           ## "pre" (espressodan önce) / "post"
var sb_bitti := []                         ## biten soğuk bar adımlarının sırası (indeks)
var sb_v := 0.0
var sb_buz := 0
var sb_bas := 0.0
var sb_e_once := false
var sb_olcek: Node3D
var sb_bolge: Array = []
var sb_igne: MeshInstance3D


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	var S := GameState.S
	if int(S.get("cbBrewing", 0)) > 0 and int(S.day) > int(S.get("cbDay", 0)):
		if not S.has("syr"):
			S.syr = {}
		S.syr.coldbrew = int(S.syr.get("coldbrew", 0)) + int(S.cbBrewing)
		S.cbBrewing = 0
		SaveSystem.yaz(GameState.yuva, S)
	var T: Dictionary = S.tools
	var var_mi := false
	for a in SB_ARAC:
		var_mi = var_mi or T.get(a, false)
	if not var_mi:
		return
	sb_kurulu = true
	slab(Vector3(-3.85, 0.45, -1.95), Vector3(0.5, 0.9, 1.0), mat(Color("2a3850"), 0.6))
	slab(Vector3(-3.85, 0.91, -1.95), Vector3(0.54, 0.03, 1.04), mat(Color("e8e1d4"), 0.4))
	for k in BUZ_YIGIN:
		for i in 3:
			make_cup(self, k).position = BUZ_YIGIN[k] + Vector3(0, i * 0.03, 0)
		collider(BUZ_YIGIN[k] + Vector3(0, 0.1, 0), Vector3(0.12, 0.22, 0.12), "cup_" + k)
	mrbox(self, SB_YER + Vector3(0, 0.004, 0), Vector3(0.14, 0.008, 0.14), mat(Color("2b2b2b"), 0.9), 0.01)
	collider(SB_YER + Vector3(0, 0.1, 0), Vector3(0.16, 0.2, 0.16), "sb_yer")
	# buz makinesi
	var bm := _k(self, Vector3(-3.93, 1.1, -2.05), Vector3(0.28, 0.36, 0.3), Color("d8dde3"), 0.3, 0.6)
	_k(bm, Vector3(0.141, 0.05, 0), Vector3(0.004, 0.12, 0.22), Color("1d1d1d"), 0.3)
	collider(Vector3(-3.93, 1.1, -2.05), Vector3(0.3, 0.38, 0.32), "sb_buz")
	# musluk kulesi: soğuk su ve soğuk süt
	_k(self, Vector3(-3.95, 1.15, -2.3), Vector3(0.08, 0.46, 0.18), Color("c0c0c0"), 0.3, 0.8)
	for m in [["sb_su", -2.25, Color("9fd4ff")], ["sb_sut", -2.36, Color("f6f1e6")]]:
		var mus := cyl(self, Vector3(-3.88, 1.28, m[1]), 0.012, 0.08, Color.WHITE)
		mus.material_override = chrome()
		mus.rotation_degrees.z = 90
		_k(self, Vector3(-3.92, 1.36, m[1]), Vector3(0.02, 0.05, 0.03), m[2], 0.4)
		collider(Vector3(-3.86, 1.2, m[1]), Vector3(0.12, 0.2, 0.1), m[0])
	# tonik, shaker, köpürtücü, çırpma kasesi
	var ton := cyl(self, Vector3(-3.66, 1.02, -1.96), 0.03, 0.2, Color("dff1f5"), 0.2)
	ton.name = "Tonik"
	collider(Vector3(-3.66, 1.02, -1.96), Vector3(0.08, 0.22, 0.08), "sb_tonik")
	if T.get("shaker", false):
		var sh := cyl(self, Vector3(-3.66, 1.02, -2.13), 0.035, 0.18, Color.WHITE)
		sh.material_override = chrome()
		collider(Vector3(-3.66, 1.02, -2.13), Vector3(0.09, 0.2, 0.09), "sb_shaker")
	if T.get("frother", false):
		cyl(self, Vector3(-3.66, 1.0, -2.28), 0.012, 0.14, Color("1d1d1d"), 0.4)
		collider(Vector3(-3.66, 1.0, -2.28), Vector3(0.07, 0.18, 0.07), "sb_kopuk")
	if T.get("whisk", false) or T.get("indianFilter", false):
		var ks := cyl(self, Vector3(-3.72, 0.96, -2.4), 0.06, 0.07, Color("f6efe3"), 0.4)
		(ks.mesh as CylinderMesh).bottom_radius = 0.035
		collider(Vector3(-3.72, 0.98, -2.4), Vector3(0.14, 0.12, 0.12), "sb_cirpma")
	# arka tezgâhın soluna uzayan ek: blender, soğuk demleme, nitro, damla kulesi, dondurma dolabı (yerde)
	if T.get("blender", false):
		_k(self, Vector3(-3.55, 0.96, -2.62), Vector3(0.12, 0.08, 0.12), Color("1d1d1d"), 0.4)
		var kap := cyl(self, Vector3(-3.55, 1.1, -2.62), 0.05, 0.2, Color.WHITE)
		kap.material_override = chrome()
		collider(Vector3(-3.55, 1.05, -2.62), Vector3(0.14, 0.3, 0.14), "sb_blender")
	if T.get("coldBrewJar", false):
		var cam := StandardMaterial3D.new()
		cam.albedo_color = Color(0.85, 0.93, 1.0, 0.35)
		cam.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		var kv := cyl(self, Vector3(-3.98, 1.07, -2.62), 0.07, 0.26, Color.WHITE)
		kv.material_override = cam
		cyl(self, Vector3(-3.98, 1.03, -2.62), 0.065, 0.18, Color("3a2010"), 0.8)
		collider(Vector3(-3.98, 1.05, -2.62), Vector3(0.16, 0.3, 0.16), "sb_cb")
	if T.get("nitroTap", false):
		_k(self, Vector3(-4.08, 1.3, -1.75), Vector3(0.04, 0.3, 0.06), Color("1d1d1d"), 0.3, 0.6)
		var mus := cyl(self, Vector3(-4.02, 1.4, -1.75), 0.01, 0.09, Color.WHITE)
		mus.material_override = chrome()
		mus.rotation_degrees.z = 90
		collider(Vector3(-4.0, 1.3, -1.75), Vector3(0.12, 0.3, 0.1), "sb_nitro")
	if T.get("coldDripTower", false):
		var kule := Node3D.new()
		kule.position = Vector3(-4.05, 0.92, -2.15)
		add_child(kule)
		for y in [0.12, 0.3, 0.48]:
			var g := cyl(kule, Vector3(0, y, 0), 0.04, 0.1, Color.WHITE)
			g.material_override = cam_mat()
		_k(kule, Vector3(0.05, 0.3, 0), Vector3(0.01, 0.6, 0.01), Color("5a3a22"), 0.6)
		collider(Vector3(-4.05, 1.2, -2.15), Vector3(0.1, 0.6, 0.1), "sb_damla")
	if T.get("iceCreamFridge", false):
		_k(self, Vector3(-3.85, 0.25, -1.3), Vector3(0.45, 0.5, 0.25), Color("e8eef2"), 0.3, 0.4)
		_k(self, Vector3(-3.85, 0.51, -1.3), Vector3(0.42, 0.02, 0.22), Color(0.85, 0.93, 1.0), 0.05)
		collider(Vector3(-3.85, 0.3, -1.3), Vector3(0.45, 0.6, 0.27), "sb_dondurma")
	# süreli adımlar için dikey Kural 9 göstergesi
	sb_olcek = Node3D.new()
	sb_olcek.position = SB_YER + Vector3(0.08, 0.12, -0.12)
	sb_olcek.rotation_degrees.y = 90
	add_child(sb_olcek)
	_k(sb_olcek, Vector3(0, 0.08, 0), Vector3(0.02, 0.16, 0.006), Color("2b2b2b"), 0.6)
	for c in [Color("e2c044"), Color("8fcf6a"), Color("2f8a3a")]:
		var z := _k(sb_olcek, Vector3(0, 0, 0.004 + 0.001 * sb_bolge.size()), Vector3(0.022, 0.01, 0.002), c, 0.6)
		var zm := z.material_override as StandardMaterial3D
		zm.emission_enabled = true
		zm.emission = c
		zm.emission_energy_multiplier = 0.4
		sb_bolge.append(z)
	sb_igne = _k(sb_olcek, Vector3(0, 0, 0.009), Vector3(0.03, 0.003, 0.003), Color.WHITE, 0.3)
	sb_olcek.visible = false


func cam_mat() -> StandardMaterial3D:
	var cam := StandardMaterial3D.new()
	cam.albedo_color = Color(0.85, 0.93, 1.0, 0.35)
	cam.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return cam


# ---------- bardaklar ----------
func fp_fincan(boy: String) -> String:
	var c := String(_D().sizes.get(boy, {}).get("cup", ""))
	match c:
		"affoBowl": return "kase"
		"iceS": return "buz_k"
		"iceM": return "buz_o"
		"iceL": return "buz_b"
	return super.fp_fincan(boy)


func size_name(s: String) -> String:
	match s:
		"buz_k": return "küçük soğuk"
		"buz_o": return "orta soğuk"
		"buz_b": return "büyük soğuk"
		"kase": return "affogato kasesi"
	return super.size_name(s)


func cup_dims(size: String) -> Vector2:
	match size:
		"buz_k": return Vector2(0.038, 0.1)
		"buz_o": return Vector2(0.043, 0.13)
		"buz_b": return Vector2(0.048, 0.16)
		"kase": return Vector2(0.06, 0.05)
	return super.cup_dims(size)


func make_cup(parent: Node3D, size: String, fill := 0.0) -> Node3D:
	if size == "kase":
		var k := Node3D.new()
		parent.add_child(k)
		var kb := cyl(k, Vector3(0, 0.025, 0), 0.06, 0.05, Color("f6efe3"), 0.3)
		(kb.mesh as CylinderMesh).bottom_radius = 0.03
		if fill > 0.0:
			sph(k, Vector3(0, 0.05, 0), 0.03, Color("f6ecd2")).name = "Top"
		return k
	if not size.begins_with("buz_"):
		return super.make_cup(parent, size, fill)
	var c := Node3D.new()
	parent.add_child(c)
	var d := cup_dims(size)
	var cam := StandardMaterial3D.new()
	cam.albedo_color = Color(0.88, 0.94, 1.0, 0.3)
	cam.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	cam.roughness = 0.05
	var g := cyl(c, Vector3(0, d.y * 0.5, 0), d.x, d.y, Color.WHITE)
	g.material_override = cam
	(g.mesh as CylinderMesh).bottom_radius = d.x * 0.85
	if fill > 0.0:
		var ic := cyl(c, Vector3(0, d.y * minf(fill, 1.0) * 0.45, 0), d.x * 0.9, d.y * minf(fill, 1.0) * 0.9, Color("6b4428"), 0.4)
		ic.name = "Top"
	return c


# ---------- sipariş ----------
func _sb_adimlar() -> Array:
	var out: Array = []
	for s in _tarif().get("steps", []):
		if s in SB_ADIMLAR:
			out.append(s)
	return out


func soguk_siparis() -> bool:
	return siparis_tarif != "" and not _sb_adimlar().is_empty()


## [indeks] listesi: tarifin adım sırasında soğuk bar adımlarının konumu ve fazı.
func _sb_faz_adimlari(faz: String) -> Array:
	var st: Array = _tarif().get("steps", [])
	var ei := st.find("extract")
	var out: Array = []
	var i := 0
	for s in st:
		if s in SB_ADIMLAR:
			var f := "pre" if ei < 0 or i < ei else "post"
			if f == faz:
				out.append(i)
		i += 1
	return out


func _sb_simdi() -> int:
	for i in _sb_faz_adimlari(sb_faz):
		if not i in sb_bitti:
			return i
	return -1


func _sb_eksik(faz: String) -> bool:
	for i in _sb_faz_adimlari(faz):
		if not i in sb_bitti:
			return true
	return false


func _serbest() -> bool:
	return super._serbest() or soguk_siparis()


func _siparis_al(m: Dictionary) -> void:
	super._siparis_al(m)
	sb_bitti = []
	sb_faz = ""
	if sb_bardak:
		sb_bardak.queue_free()
		sb_bardak = null


# ---------- etkileşim ----------
func action_text(id: String) -> String:
	if soguk_siparis() and mode == "":
		var once_var: bool = not _sb_faz_adimlari("pre").is_empty() and "extract" in _tarif().steps
		if (id.begins_with("cup_buz_") or id == "cup_kase") and held_kind == "" and sb_bardak == null:
			return "E: Affogato kasesini al" if id == "cup_kase" else "E: %s bardağı al" % _bas_harf(size_name(id.substr(4)))
		if id == "machine" and stage == "locked" and once_var:
			if held_kind == "cup" and _sb_eksik("pre"):
				return "Önce soğuk barda hazırla (buz, süt…)"
			if held_kind == "cup_full" and not _sb_eksik("pre"):
				if not _eksik(true).is_empty():
					return "Önce şurubu pompala (arka tezgâh)"
				return "E: Bardağı terazili tepsiye koy"
		var st: Array = _tarif().steps
		var sut_sonra: bool = "milk" in st and "extract" in st and st.find("milk") > st.find("extract") and not _sb_faz_adimlari("post").is_empty() and _sb_faz_adimlari("post")[0] < st.find("milk")
		if sut_sonra and id == "machine" and stage == "pulled" and held_kind == "" and milk_state != "poured":
			return "E: Fincanı al"
		if sut_sonra and id == "customer" and cstate == "wait" and held_kind == "cup_full" and milk_state != "poured":
			return "Önce sütü dök (süsleme minderinde)"
		if id == "customer" and cstate == "wait" and held_kind == "cup_full" and _sb_eksik("post" if "extract" in _tarif().steps else "pre"):
			return "Önce soğuk barda bitir"
	if id.begins_with("sb_") and mode == "":
		if not soguk_siparis():
			return "Bu siparişte soğuk bar yok"
		if id == "sb_yer":
			if sb_bardak == null:
				if held_kind in ["cup", "cup_full"]:
					return "E: Bardağı soğuk bara koy"
				return "Önce bir bardak al"
			if _sb_simdi() < 0:
				return "E: Bardağı al" if held_kind == "" else ""
			return "Sıradaki: %s" % _sb_ad(_sb_simdi())
		if sb_bardak == null:
			return "Önce bardağı soğuk bara koy"
		var i := _sb_simdi()
		if i < 0:
			return "Bu aşama bitti"
		var s: String = _tarif().steps[i]
		if SB_NESNE.get(s, "") != id:
			return "Sıradaki: %s" % _sb_ad(i)
		match s:
			"ice": return "E: Buz koy (%d/%d)" % [sb_buz, _buz_n()]
			"coldwater": return "E basılı: soğuk su dök"
			"coldmilk": return "E basılı: soğuk süt dök"
			"tonic": return "E basılı: tonik dök"
			"shakeit": return "E basılı: çalkala"
			"coldfoam": return "E basılı: soğuk köpük yap"
			"whisk": return "E: Çırp (%d/6)" % int(sb_v)
			"spoontop": return "E basılı: köpüğü kaşıkla koy"
			"tumbler": return "E basılı: dabarada köpürt"
			"blend": return "E: Blenderı çalıştır"
			"colddrip": return "E: Vanayı aç"
			"coldpour": return "E basılı: soğuk demleme dök"
			"nitrotap": return "E basılı: nitro musluğu aç"
			"scoop": return "E: Dondurma topu (%d/%d)" % [sb_buz, _buz_n()]
	return super.action_text(id)


func _sb_ad(i: int) -> String:
	return String(_D().minigames.get(_tarif().steps[i], {"name": "?"}).name)


func _buz_n() -> int:
	return int(BUZ_N.get(siparis_boy, 2))


func interact(id: String) -> void:
	if soguk_siparis() and mode == "":
		var t := action_text(id)
		if (id.begins_with("cup_buz_") or id == "cup_kase") and t.begins_with("E"):
			cup_size = id.substr(4)
			if cup_size != order_size:
				wrong = true
			hold("cup", cup_size)
			return
		if id == "machine" and t == "E: Bardağı terazili tepsiye koy":
			drop_held()
			placed_cup = make_cup(self, cup_size, 0.65)
			placed_cup.position = CUP_POS + Vector3(0, 0.005, 0)
			stage = "cup_on"
			return
	if not id.begins_with("sb_"):
		super.interact(id)
		return
	var t2 := action_text(id)
	if not t2.begins_with("E"):
		return
	if id == "sb_yer":
		if sb_bardak == null:
			sb_faz = "pre" if held_kind == "cup" or not "extract" in _tarif().steps else "post"
			var dolu := 0.65 if held_kind == "cup_full" else 0.0
			drop_held()
			sb_bardak = make_cup(self, cup_size, dolu)
			sb_bardak.position = SB_YER + Vector3(0, 0.008, 0)
			sb_buz = 0
			sb_v = 0.0
		else:
			sb_bardak.queue_free()
			sb_bardak = null
			hold("cup_full", cup_size)
		return
	var i := _sb_simdi()
	var s: String = _tarif().steps[i]
	match s:
		"ice":
			sb_buz += 1
			Ses.sfx("click")
			var d := cup_dims(cup_size)
			var kup := _k(sb_bardak, Vector3(randf_range(-0.01, 0.01), 0.015 + sb_buz * 0.018, randf_range(-0.01, 0.01)), Vector3(0.018, 0.018, 0.018), Color(0.92, 0.97, 1.0), 0.05)
			kup.rotation_degrees.y = randf() * 90.0
			if sb_buz >= _buz_n() or sb_buz * 0.018 > d.y * 0.8:
				var fark := absi(sb_buz - _buz_n())
				_sb_bitir(i, 100.0 if fark == 0 else (72.0 if fark == 1 else 0.0), "Buz %d kepçe" % sb_buz)
		"whisk":
			sb_v += 1.0
			Ses.sfx("click")
			if sb_v >= 6.0:
				_sb_bitir(i, 100.0, "Çırpıldı")
		"scoop":
			sb_buz += 1
			Ses.sfx("click")
			var d3 := cup_dims(cup_size)
			sph(sb_bardak, Vector3(0, 0.04 + sb_buz * 0.02, 0), d3.x * 0.5, Color("f6ecd2"))
			if sb_buz >= _buz_n():
				_sb_bitir(i, 100.0, "Dondurma %d top" % sb_buz)
		"blend", "colddrip":
			sb_v = 0.0
			mode = "sb_sure"
			adim_simdi = s
			bolge_guncelle()
			_sb_olcek_kur(s)
			sb_olcek.visible = true
			sb_bas = Time.get_ticks_msec() / 1000.0
			sb_e_once = true
			prompt.text = ""
		_:
			sb_v = 0.0
			mode = "sb_tut"
			prompt.text = ""


func _sb_olcek_kur(s: String) -> void:
	var A: Array = SB_SURE[s]
	var h := 0.16
	var w := [WIN_YELLOW, WIN_LIGHT, WIN_DARK]
	for k in 3:
		var yarim: float = maxf(float(A[0]) * w[k] / 100.0 * h, 0.0008)
		(sb_bolge[k].mesh as BoxMesh).size.y = yarim * 2.0
		sb_bolge[k].position.y = float(A[1]) / 100.0 * h


func _sb_sure(delta: float) -> void:
	var i := _sb_simdi()
	var s: String = _tarif().steps[i]
	var A: Array = SB_SURE[s]
	sb_v += float(A[0]) * delta
	sb_igne.position.y = clampf(sb_v / 100.0, 0.0, 1.0) * 0.16
	hint.text = "%s · %%%d (hedef %%%d) · E: %s" % [String(_D().minigames[s].name), int(sb_v), int(A[1]), "durdur" if s == "blend" else "vanayı kapat"]
	var e := Input.is_action_pressed("interact")
	var al := e and not sb_e_once and Time.get_ticks_msec() / 1000.0 - sb_bas > 0.25
	sb_e_once = e
	if al or sb_v >= 100.0:
		var secs := absf(sb_v - float(A[1])) / float(A[0])
		var sc := 100.0 if secs <= WIN_DARK else (88.0 if secs <= WIN_LIGHT else (72.0 if secs <= WIN_YELLOW else 0.0))
		if sb_v >= 100.0:
			sc = 0.0
		sb_olcek.visible = false
		_sb_bitir(i, sc, "%s %%%d" % [String(_D().minigames[s].name), int(sb_v)])


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu:
		return
	if mode == "sb_sure":
		_sb_sure(delta)
		return
	if mode != "sb_tut":
		return
	var i := _sb_simdi()
	if i < 0:
		mode = ""
		return
	var s: String = _tarif().steps[i]
	var e := Input.is_action_pressed("interact")
	var hiz := 0.25 if s in ["coldwater", "coldmilk", "tonic", "coldpour", "nitrotap"] else (0.67 if s == "shakeit" else 0.4)
	if e:
		sb_v += hiz * delta
		hint.text = "E basılı · %%%d · bırakınca biter" % int(sb_v * 100)
		if s == "shakeit" and sb_v >= 1.0:
			_sb_bitir(i, 100.0, "Çalkalandı")
			return
		if s in ["coldwater", "coldmilk", "tonic", "coldpour", "nitrotap"] and sb_bardak:
			var top: Node3D = sb_bardak.get_node_or_null("Sivi")
			var d := cup_dims(cup_size)
			if top == null:
				var renk := Color("f6f1e6") if s == "coldmilk" else (Color("3a2010") if s in ["coldpour", "nitrotap"] else Color(0.85, 0.93, 1.0, 1.0))
				top = cyl(sb_bardak, Vector3(0, 0.0, 0), d.x * 0.88, 0.004, renk, 0.3)
				top.name = "Sivi"
			top.scale.y = maxf(1.0, sb_v * d.y / 0.004 * 0.9)
			top.position.y = minf(sb_v, 1.0) * d.y * 0.45
	elif sb_v > 0.02 and s != "shakeit":
		var f := sb_v
		var sc: float
		if s == "nitrotap":
			sc = 100.0 if f >= 0.85 and f <= 0.95 else (88.0 if f >= 0.75 and f <= 1.0 else 72.0)
		elif s in ["coldwater", "coldmilk", "tonic", "coldpour"]:
			var pre: bool = sb_faz == "pre" and "extract" in _tarif().steps
			if pre:
				sc = 100.0 if f >= 0.6 and f <= 0.75 else (88.0 if f >= 0.5 and f <= 0.85 else 72.0)
			else:
				sc = 100.0 if f >= 0.9 and f <= 1.0 else (88.0 if f >= 0.8 and f <= 1.05 else 72.0)
		else:
			sc = 100.0 if f >= 0.8 and f <= 1.0 else (88.0 if f >= 0.65 and f <= 1.1 else 72.0)
			if sb_bardak:
				var d2 := cup_dims(cup_size)
				var kp := sph(sb_bardak, Vector3(0, d2.y * 0.92, 0), d2.x * 0.85, Color("f3e7cf"))
				kp.scale = Vector3(1, 0.35, 1)
		_sb_bitir(i, sc, "%s %%%d" % [String(_D().minigames[s].name), int(f * 100)])


func _sb_bitir(i: int, sc: float, etiket: String) -> void:
	step_scores.append(sc)
	sb_bitti.append(i)
	mode = ""
	hint.text = ""
	sb_v = 0.0
	var ad := {100.0: "Mükemmel!", 88.0: "Güzel", 72.0: "İyi", 0.0: "Kaçtı"}
	prompt_flash("%s: %s" % [etiket, ad.get(sc, "%d" % int(sc))])
