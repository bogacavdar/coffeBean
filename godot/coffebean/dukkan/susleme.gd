extends "res://dukkan/su.gd"
## Süsleme tezgâhı: şurup pompası, krem şanti, sos, serpme, limon (tasarım belgesi "Süsleme tezgâhı (Faz 3b)").

const MAT_POS := Vector3(-2.3, 0.94, -2.6)
const POMPALI := ["vanilla", "caramel", "saltcar", "choco", "condensed", "chai", "pumpkin", "gingerbread", "peppermint"]
const SOSLAR := ["caramel", "saltcar"]
## Basılı tutulan adımların hızı (birim/sn) ve bantları [mükemmel alt, üst, güzel alt, üst].
const TUT := {
	"cream": {"hiz": 0.4, "bant": [0.8, 1.0, 0.65, 1.1]},
	"drizzle": {"hiz": 0.5, "bant": [0.8, 1.0, 0.65, 1.1]},
	"dust": {"hiz": 0.6, "bant": [0.4, 0.6, 0.3, 0.7]},
}

var sus_durum := {}                        ## anahtar → puan (biten süsleme adımları)
var pompa := {}                            ## minderdeki fincana bu ziyarette basılan pompalar
var mat_fincan: Node3D
var mat_tur := ""
var sus_tut := ""                          ## basılı tutulan adımın anahtarı
var sus_miktar := 0.0


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	var S := GameState.S
	var minder := mrbox(self, MAT_POS + Vector3(0, 0.004, 0), Vector3(0.2, 0.008, 0.16), mat(Color("2b2b2b"), 0.9), 0.01)
	minder.name = "SusMinder"
	collider(MAT_POS + Vector3(0, 0.08, 0), Vector3(0.2, 0.16, 0.16), "sus_mat")
	if S.tools.get("syrupPump", false):
		var i := 0
		for k in POMPALI:
			var x := -2.62 + i * 0.075
			_sise(Vector3(x, 0.94, -2.86), Color(String(_D().specials[k].color)), true)
			collider(Vector3(x, 1.06, -2.86), Vector3(0.07, 0.24, 0.08), "sus_" + k)
			i += 1
		for j in SOSLAR.size():
			var k2: String = SOSLAR[j]
			var p := Vector3(-1.78 + j * 0.11, 0.94, -2.84)
			_sise(p, Color(String(_D().specials[k2].color)), false)
			collider(p + Vector3(0, 0.1, 0), Vector3(0.08, 0.2, 0.08), "sus_sos_" + k2)
	if S.tools.get("creamSiphon", false):
		var sf := cyl(self, Vector3(-1.9, 1.06, -2.6), 0.04, 0.24, Color.WHITE)
		sf.material_override = chrome()
		cyl(self, Vector3(-1.9, 1.2, -2.6), 0.012, 0.05, Color("1d1d1d"), 0.4)
		collider(Vector3(-1.9, 1.06, -2.6), Vector3(0.1, 0.28, 0.1), "sus_cream")
	if S.tools.get("cocoa", false):
		_serpici(Vector3(-1.74, 0.94, -2.56), Color("4a2a14"))
		collider(Vector3(-1.74, 1.0, -2.56), Vector3(0.07, 0.14, 0.07), "sus_cocoa")
	_serpici(Vector3(-1.64, 0.94, -2.56), Color("8a5a2b"))
	collider(Vector3(-1.64, 1.0, -2.56), Vector3(0.07, 0.14, 0.07), "sus_cinnamon")
	var kase := cyl(self, Vector3(-2.75, 0.965, -2.6), 0.07, 0.05, Color("efe3c8"), 0.6)
	for d in 4:
		var l := sph(kase, Vector3(-0.03 + d * 0.02, 0.03, 0.01 * (d % 2)), 0.022, Color("f2d64b"))
		l.scale = Vector3(1.0, 0.35, 1.0)
	collider(Vector3(-2.75, 1.0, -2.6), Vector3(0.16, 0.1, 0.16), "sus_lemon")


func _sise(p: Vector3, renk: Color, pompali: bool) -> void:
	cyl(self, p + Vector3(0, 0.09, 0), 0.028, 0.18, renk, 0.35)
	cyl(self, p + Vector3(0, 0.19, 0), 0.012, 0.03, Color("1d1d1d"), 0.4)
	if pompali:
		cyl(self, p + Vector3(0, 0.215, 0), 0.006, 0.03, Color("1d1d1d"), 0.4)
		var bas := cyl(self, p + Vector3(0.015, 0.232, 0), 0.006, 0.04, Color("1d1d1d"), 0.4)
		bas.rotation_degrees.z = 90
	else:
		var uc := cyl(self, p + Vector3(0, 0.22, 0), 0.004, 0.03, Color("1d1d1d"), 0.4)
		(uc.mesh as CylinderMesh).top_radius = 0.001


func _serpici(p: Vector3, renk: Color) -> void:
	cyl(self, p + Vector3(0, 0.05, 0), 0.025, 0.1, renk, 0.5)
	var kapak := cyl(self, p + Vector3(0, 0.105, 0), 0.026, 0.015, Color.WHITE)
	kapak.material_override = chrome()


# ---------- siparişin süsleme ihtiyacı ----------
## [{k, tur, once, n, ad}] (k: pompa için şurup anahtarı, öbürleri için "cream", "sos_caramel", "cocoa", "cinnamon", "lemon")
func sus_gerek() -> Array:
	var out: Array = []
	if siparis_tarif == "":
		return out
	var d := _tarif()
	var st: Array = d.get("steps", [])
	var ei := st.find("extract")
	if ei < 0:
		ei = st.find("milk")                  # espressosuz tarifte "önce" süte göre
	var pompa_var := false
	for u in d.get("uses", []):
		if u[1] is String and u[1] == "pump":
			pompa_var = true
			out.append({"k": u[0], "tur": "pump", "once": st.find("pump") < ei, "n": int(POMPA.get(siparis_boy, 2)), "ad": String(_D().specials[u[0]].name)})
	if "pump" in st and not pompa_var:
		for u in d.get("uses", []):
			if u[0] in POMPALI and not pompa_var:
				pompa_var = true
				out.append({"k": u[0], "tur": "pump", "once": st.find("pump") < ei, "n": int(u[1]), "ad": String(_D().specials[u[0]].name)})
	if "cream" in st:
		out.append({"k": "cream", "tur": "cream", "once": false, "n": 1, "ad": "Krem şanti"})
	if "drizzle" in st:
		var sos := "caramel"
		for u in d.get("uses", []):
			if not (u[1] is String) and u[0] in SOSLAR:
				sos = u[0]
		out.append({"k": "sos_" + sos, "tur": "drizzle", "once": false, "n": 1, "ad": String(_D().specials[sos].name)})
	if "cocoa" in st:
		out.append({"k": "cocoa", "tur": "dust", "once": false, "n": 1, "ad": "Kakao"})
	if "dust" in st:
		out.append({"k": "cinnamon", "tur": "dust", "once": false, "n": 1, "ad": "Tarçın"})
	if "garnish" in st:
		out.append({"k": "lemon", "tur": "garnish", "once": false, "n": 1, "ad": "Limon"})
	return out


func _eksik(once: bool) -> Array:
	var out: Array = []
	for x in sus_gerek():
		if x.once == once and not sus_durum.has(x.k):
			out.append(x)
	return out


func _bul(k: String) -> Dictionary:
	for x in sus_gerek():
		if x.k == k:
			return x
	return {}


func _siparis_al(m: Dictionary) -> void:
	super._siparis_al(m)
	sus_durum = {}
	pompa = {}


# ---------- etkileşim ----------
func action_text(id: String) -> String:
	if mode == "" and id == "sus_mat":
		if mat_fincan:
			return "E: Fincanı al"
		if held_kind in ["cup", "cup_full"] and siparis_tarif != "":
			return "E: Fincanı süsleme tezgâhına koy"
		return ""
	if mode == "" and id.begins_with("sus_"):
		var k := id.substr(4)
		var x := _bul(k)
		if x.is_empty():
			return "Bu siparişte yok"
		if mat_fincan == null:
			return "Önce fincanı süsleme minderine koy"
		var bos := mat_tur == "cup"
		if x.once != bos:
			return ("Şurup boş fincana konur" if x.tur == "pump" else "Önce kahveyi hazırla")
		if sus_durum.has(k):
			return "%s tamam" % x.ad
		match x.tur:
			"pump": return "E: %s pompala (%d/%d)" % [x.ad, int(pompa.get(k, 0)), int(x.n)]
			"cream": return "E basılı: krem şanti sık"
			"drizzle": return "E basılı: %s gezdir" % String(x.ad).to_lower()
			"dust": return "E basılı: %s serp" % String(x.ad).to_lower()
			"garnish": return "E: Limon kabuğunu kenara sür"
	if stage == "locked" and held_kind == "cup" and id == "machine" and not _eksik(true).is_empty():
		return "Önce şurubu pompala (arka tezgâh)"
	if id == "customer" and stage == "cup_taken" and cstate == "wait" and not _eksik(false).is_empty():
		var adlar: Array = []
		for x in _eksik(false):
			adlar.append(String(x.ad).to_lower())
		return "Önce süslemeyi bitir: " + ", ".join(adlar)
	return super.action_text(id)


func interact(id: String) -> void:
	if not id.begins_with("sus_"):
		super.interact(id)
		return
	var t := action_text(id)
	if not t.begins_with("E"):
		return
	if id == "sus_mat":
		if mat_fincan:
			_mattan_al()
		else:
			_matta_koy()
		return
	var k := id.substr(4)
	var x := _bul(k)
	match x.tur:
		"pump":
			pompa[k] = int(pompa.get(k, 0)) + 1
			Ses.sfx("click")
			prompt_flash("%s: %d pompa" % [x.ad, int(pompa[k])])
		"garnish":
			_puan(k, 100.0, "Limon kabuğu")
			_ust_sus(k, "garnish")
		_:
			sus_tut = k
			sus_miktar = 0.0
			mode = "sus_tut"
			prompt.text = ""


func _matta_koy() -> void:
	mat_tur = held_kind
	var dolu := 0.9 if mat_tur == "cup_full" else 0.0
	drop_held()
	mat_fincan = make_cup(self, cup_size, dolu)
	mat_fincan.position = MAT_POS + Vector3(0, 0.008, 0)
	pompa = {}


func _mattan_al() -> void:
	_pompalari_bitir()
	mat_fincan.queue_free()
	mat_fincan = null
	hold(mat_tur, cup_size)


## Minderdeki fincana basılan pompaları puanlar (fincan alınınca ya da süt dökülmeye başlanınca).
func _pompalari_bitir() -> void:
	for x in sus_gerek():
		if x.tur == "pump" and int(pompa.get(x.k, 0)) > 0 and not sus_durum.has(x.k):
			var fark := absi(int(pompa[x.k]) - int(x.n))
			_puan(x.k, 100.0 if fark == 0 else (72.0 if fark == 1 else 0.0), "%s %d pompa" % [x.ad, int(pompa[x.k])])
	pompa = {}


func _puan(k: String, sc: float, etiket: String) -> void:
	sus_durum[k] = sc
	step_scores.append(sc)
	var ad := {100.0: "Mükemmel!", 88.0: "Güzel", 72.0: "İyi", 0.0: "Kaçtı"}
	prompt_flash("%s: %s" % [etiket, ad.get(sc, "%d puan" % int(sc))])


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu or mode != "sus_tut":
		return
	var x := _bul(sus_tut)
	var ayar: Dictionary = TUT[x.tur]
	if Input.is_action_pressed("interact"):
		sus_miktar += float(ayar.hiz) * delta
		hint.text = "E basılı: %s · %%%d · bırakınca biter" % [x.ad, int(sus_miktar * 100)]
		if sus_miktar >= 1.4:
			_tut_bitir(x, ayar)
	elif sus_miktar > 0.02:
		_tut_bitir(x, ayar)


func _tut_bitir(x: Dictionary, ayar: Dictionary) -> void:
	var b: Array = ayar.bant
	var f := sus_miktar
	var sc := 100.0 if f >= b[0] and f <= b[1] else (88.0 if f >= b[2] and f <= b[3] else 72.0)
	mode = ""
	hint.text = ""
	_puan(x.k, sc, "%s %%%d" % [x.ad, int(f * 100)])
	_ust_sus(x.k, x.tur)
	sus_tut = ""


## Minderdeki fincanın üstünde süslemenin görünüşü.
func _ust_sus(k: String, tur: String) -> void:
	if mat_fincan == null:
		return
	var d := cup_dims(cup_size)
	var ust := 0.012 + d.y * 0.86
	match tur:
		"cream":
			var tepe := sph(mat_fincan, Vector3(0, ust + 0.01, 0), d.x * 0.85, Color("fffaf0"))
			tepe.scale = Vector3(1.0, 0.55, 1.0)
		"drizzle":
			var halka := MeshInstance3D.new()
			var tm := TorusMesh.new()
			tm.inner_radius = d.x * 0.45
			tm.outer_radius = d.x * 0.55
			halka.mesh = tm
			halka.material_override = mat(Color(String(_D().specials[k.substr(4)].color)), 0.3)
			halka.position = Vector3(0, ust + 0.004, 0)
			halka.scale = Vector3(1, 0.2, 1)
			mat_fincan.add_child(halka)
		"dust":
			cyl(mat_fincan, Vector3(0, ust + 0.002, 0), d.x * 0.75, 0.002, Color("4a2a14") if k == "cocoa" else Color("8a5a2b"), 0.9)
		"garnish":
			var dilim := cyl(mat_fincan, Vector3(d.x * 0.95, ust, 0), 0.02, 0.004, Color("f2d64b"), 0.6)
			dilim.rotation_degrees.z = 70
