extends "res://dukkan/hayat.gd"
## İçecek görünüşleri ve tarif galerisi (tasarım belgesi "İçecek görünüşleri ve tarif galerisi (Faz 6)").

const RESIM := preload("res://ui/icecek_resmi.gd")
const KREM_SUS := ["cream", "creamDome", "creamPeak", "marsh", "peaks", "dollop"]
const TOZ_SUS := ["cocoa", "cocoaH", "cinnamon", "cinnamonH", "nutmeg", "dust", "specks", "shavings"]
const SANAT_SUS := ["heart", "heartF", "rosetta", "tulip", "mark", "dot"]
const SOS_SUS := {"caramelX": "c9802c", "chocX": "5a2f17", "redDrizzle": "b5333c"}

var gor_sayac := 0.0


## Fincanın yüzeyini tarifin rengine boyar, üst süslemesini ekler.
func icecek_boya(fincan: Node3D, id: String) -> void:
	if fincan == null or id == "" or fincan.has_meta("gorunus"):
		return
	var top := fincan.find_child("Top", true, false) as MeshInstance3D
	if top == null:
		return
	fincan.set_meta("gorunus", id)
	top.material_override = mat(RESIM.yuzey_rengi(id), 0.3)
	var r := 0.03
	if top.mesh is CylinderMesh:
		r = (top.mesh as CylinderMesh).top_radius
	for t in RESIM.ust_susler(id):
		if t in KREM_SUS:
			var k := sph(top, Vector3(0, 0.004, 0), r * 0.62, Color("fffaf1"))
			k.scale = Vector3(1, 0.45, 1)
		elif t in TOZ_SUS:
			var h := MeshInstance3D.new()
			var tm := TorusMesh.new()
			tm.inner_radius = r * 0.45
			tm.outer_radius = r * 0.62
			h.mesh = tm
			h.scale = Vector3(1, 0.08, 1)
			h.position.y = 0.0045
			h.material_override = mat(Color("6a3a1c"), 0.9)
			top.add_child(h)
		elif t in SANAT_SUS:
			cyl(top, Vector3(0, 0.0035, 0), r * 0.36, 0.001, Color("f6ecdc"), 0.4)
		elif SOS_SUS.has(t):
			cyl(top, Vector3(0, 0.005, 0), r * 0.5, 0.001, Color(SOS_SUS[t]), 0.3)


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu:
		return
	gor_sayac -= delta
	if gor_sayac <= 0.0:
		gor_sayac = 0.25
		if held and held_kind in ["cup_full", "tk_tepsi"] and siparis_tarif != "" and not held.has_meta("gorunus") \
				and action_text("customer") == "E: Kahveyi ver":
			icecek_boya(held, siparis_tarif)
	for o in oturanlar:
		if o.fincan and o.has("tarif"):
			icecek_boya(o.fincan, o.tarif)


func _cikar(m: Dictionary) -> void:
	var n := oturanlar.size()
	super._cikar(m)
	if oturanlar.size() > n:
		oturanlar.back().tarif = m.get("tarif", "")


# ---------- tarif galerisi ----------
func _defter_dugmeleri() -> Array:
	var d := super._defter_dugmeleri()
	d.push_front({"metin": "Tarif görselleri", "fn": func(): tarif_galerisi(false)})
	return d


## hepsi=true: akış testi A26, bütün tarifler açık gibi.
func tarif_galerisi(hepsi: bool) -> void:
	_ekrana_gec()
	var S := GameState.S
	var kaydir := ScrollContainer.new()
	kaydir.custom_minimum_size = Vector2(0, 480)
	kaydir.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var g := GridContainer.new()
	g.columns = 6
	g.add_theme_constant_override("h_separation", 8)
	g.add_theme_constant_override("v_separation", 8)
	kaydir.add_child(g)
	for id in _D().drinks:
		var d: Dictionary = _D().drinks[id]
		var acik: bool = hepsi or id in S.unlocked
		var kart := PanelContainer.new()
		kart.add_theme_stylebox_override("panel", Tema.kutu(Tema.DUGME, 8))
		kart.custom_minimum_size = Vector2(128, 0)
		var v := VBoxContainer.new()
		kart.add_child(v)
		v.add_child(RESIM.new(id, not acik))
		var ad := Tema.yazi(String(d.name) if acik else "Kilitli · Seviye %d" % int(d.get("shop", 1)), 14, Tema.KAHVE if acik else Tema.SOLUK, acik)
		ad.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		ad.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		ad.custom_minimum_size.x = 120
		v.add_child(ad)
		g.add_child(kart)
	var bitir := func():
		if not Flow.akis.is_empty() and Flow.akis.id == "A26":
			Flow.tumunu_kapat()
			Flow.akis_bitti()
			return
		_defter()
	Flow.pencere("Tarif görselleri", kaydir, [{"metin": "Bitti" if hepsi else "Deftere dön", "tur": "ana", "fn": bitir}], _pencereden_cik if not hepsi else bitir, 860)
