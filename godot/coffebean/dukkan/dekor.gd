extends "res://dukkan/seviye.gd"
## Dekorasyon (tasarım belgesi §4 "Dekorasyon (taşıma adımı T14)"); web decorOwned, activeDecor, decorMult, hubContent "decor".

var dekor_kok: Node3D
var plaklar: Array = []                    ## dönen plaklar (pikap)


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	dekor_kok = Node3D.new()
	add_child(dekor_kok)
	for id in etkin_dekor():
		_dekor_kur(id)


# ---------- sahiplik ve etki (web decorOwned / activeDecor / decorMult) ----------
func dekor_sahip(id: String) -> bool:
	var v = GameState.S.get("decor", {}).get(id)
	var st := int(_D().decor.get(id, {}).get("stars", 1))
	if v == null:
		return false
	if v is bool:
		return v and st == 1
	return int(v) == st


func etkin_dekor() -> Array:
	var out: Array = []
	var yildiz := _yildiz()
	for id in GameState.S.get("decor", {}):
		if _D().decor.has(id) and dekor_sahip(id) and int(_D().decor[id].get("stars", 1)) == yildiz:
			out.append(id)
	return out


func dekor_carpani(anahtar: String) -> float:
	var m := 1.0
	for id in etkin_dekor():
		if _D().decor[id].has(anahtar):
			m *= float(_D().decor[id][anahtar])
	return m


func _sabir_carpani(tip: String) -> float:
	return super._sabir_carpani(tip) * dekor_carpani("patience")


func _bahsis_carpani(m: Dictionary) -> float:
	return super._bahsis_carpani(m) * dekor_carpani("tip")


# ---------- gün sonu itibarı ----------
func _gun_bitti() -> void:
	super._gun_bitti()
	var r := 0
	for id in etkin_dekor():
		r += int(_D().decor[id].get("rep", 0))
	if r > 0:
		var S := GameState.S
		S.rep = int(S.rep) + r
		son.L.plant = r
		son.repDelta = int(son.repDelta) + r
		S.endPending = son
		SaveSystem.yaz(GameState.yuva, S)


func _hesap_kredi_satirlari() -> Array:
	var out: Array = super._hesap_kredi_satirlari()
	if int(son.get("L", {}).get("plant", 0)) > 0:
		out.push_front(["Dekorasyon", "+%d itibar" % int(son.L.plant)])
	return out


# ---------- Dükkan penceresi: Dekor sekmesi ----------
func _sekmeler() -> Array:
	return super._sekmeler() + [["decor", "Dekor"]]


func _sekme_icerik(v: VBoxContainer, sekme: String, yildiz: int, yenile: Callable, kip: String) -> void:
	if sekme != "decor":
		super._sekme_icerik(v, sekme, yildiz, yenile, kip)
		return
	var S := GameState.S
	var ic := _dukkan_bolum(v, "Dekor", "Dekor yalnızca bu dükkanda görünür ve etki eder.")
	var liste: Array = []
	for id in _D().decor:
		if int(_D().decor[id].get("stars", 1)) == yildiz:
			liste.append(id)
	liste.sort_custom(func(a, b): return int(_D().decor[a].price) < int(_D().decor[b].price))
	for id in liste:
		var dc: Dictionary = _D().decor[id]
		var sag: Control
		if dekor_sahip(id):
			sag = _durum("✓ dükkanda")
		else:
			var b := Tema.dugme("Satın al")
			b.disabled = float(S.money) < int(dc.price)
			var did: String = id
			var uygula := func():
				if not S.has("decor"):
					S.decor = {}
				S.decor[did] = yildiz
				S.log.append("Gün %d: %s alındı" % [int(S.day), dc.name])
			b.pressed.connect(func():
				if _al(int(dc.price), uygula):
					_dekor_kur(did)
					flash = "%s dükkanda" % dc.name
					yenile.call())
			sag = b
		_dukkan_satir(ic, dc.name, dc.effect, "₺" + GameState.tl(dc.price), sag)


# ---------- sahnede kurulum ----------
func _p(name: String, pos: Vector3, rot := 0.0, sc := 1.0) -> Node3D:
	var n := ph(name, pos, rot, sc)
	n.reparent(dekor_kok)
	return n


func _k(parent: Node3D, pos: Vector3, size: Vector3, c: Color, rough := 0.7, metal := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat(c, rough, metal)
	mi.position = pos
	parent.add_child(mi)
	return mi


func _isik(parent: Node3D, pos: Vector3, renk: Color, enerji: float, menzil: float) -> void:
	var l := OmniLight3D.new()
	l.position = pos
	l.light_color = renk
	l.light_energy = enerji
	l.omni_range = menzil
	parent.add_child(l)


func _yazi(parent: Node3D, pos: Vector3, metin: String, renk: Color, boy: int, isil := false) -> Label3D:
	var l := Label3D.new()
	l.text = metin
	l.font_size = boy
	l.pixel_size = 0.004
	l.modulate = renk
	l.outline_size = 0
	l.position = pos
	l.rotation_degrees.y = 180.0
	if isil:
		l.shaded = false
		l.outline_size = 18
		l.outline_modulate = Color(renk, 0.35)
	parent.add_child(l)
	return l


func _cerceveler(n: int, duvar: String) -> void:
	var kok := Node3D.new()
	dekor_kok.add_child(kok)
	var renkler := [Color("c9773b"), Color("3b6ea8"), Color("5f8a4b"), Color("b5533c"), Color("e2c044")]
	for i in n:
		var c := Node3D.new()
		kok.add_child(c)
		var en := 0.45 if i % 2 == 0 else 0.34
		var boy := 0.6 if i % 2 == 0 else 0.44
		_k(c, Vector3.ZERO, Vector3(en, boy, 0.03), Color("2b1a0e"), 0.5)
		_k(c, Vector3(0, 0, -0.018), Vector3(en - 0.07, boy - 0.07, 0.005), renkler[i % renkler.size()], 0.9)
		_k(c, Vector3(0.05, 0.04, -0.021), Vector3((en - 0.07) * 0.4, (boy - 0.07) * 0.35, 0.003), Color(renkler[(i + 2) % renkler.size()]).lightened(0.3), 0.9)
		if duvar == "on":
			c.position = Vector3(3.4 - i * 0.6, 1.75 + (0.25 if i % 2 == 1 else 0.0), 4.27)
		else:
			c.position = Vector3(4.17, 1.75 + (0.25 if i % 2 == 1 else 0.0), -1.7 + i * 0.55)
			c.rotation_degrees.y = 90.0


func _dekor_kur(id: String) -> void:
	if dekor_kok == null:
		return
	match id:
		"plant": _p("potted_plant_01_1k", Vector3(3.85, 0, 3.95))
		"olive": _p("potted_plant_02_1k", Vector3(3.85, 0, 3.95), 0.0, 1.3)
		"d4ficus": _p("potted_plant_02_1k", Vector3(3.85, 0, -2.6), 0.0, 1.7)
		"ivy":
			_k(dekor_kok, Vector3(4.12, 2.25, 0.2), Vector3(0.18, 0.03, 2.6), Color("5a3a22"))
			for z in [-0.8, 0.2, 1.2]:
				_p("potted_plant_04_2k", Vector3(4.1, 2.27, z), 0.0, 0.9)
		"lamp":
			var l := Node3D.new()
			l.position = Vector3(0.35, 0, 3.95)
			dekor_kok.add_child(l)
			cyl(l, Vector3(0, 0.02, 0), 0.16, 0.04, Color("1d1d1d"), 0.4, 0.6)
			cyl(l, Vector3(0, 0.8, 0), 0.015, 1.6, Color("1d1d1d"), 0.4, 0.6)
			var abajur := cyl(l, Vector3(0, 1.62, 0), 0.2, 0.3, Color("efe3c8"), 0.9)
			(abajur.mesh as CylinderMesh).top_radius = 0.13
			_isik(l, Vector3(0, 1.5, 0), Color("ffd9a0"), 1.2, 3.0)
		"record":
			var r := Node3D.new()
			r.position = Vector3(1.6, 0, 4.0)
			dekor_kok.add_child(r)
			_k(r, Vector3(0, 0.3, 0), Vector3(0.7, 0.6, 0.42), Color("6b4a2f"), 0.6)
			_k(r, Vector3(0, 0.65, 0), Vector3(0.46, 0.1, 0.36), Color("2a2a2a"), 0.4)
			var plak := cyl(r, Vector3(-0.05, 0.71, 0), 0.15, 0.01, Color("111111"), 0.3)
			cyl(plak, Vector3(0, 0.006, 0), 0.05, 0.003, Color("b5533c"), 0.8)
			cyl(r, Vector3(0.17, 0.75, 0.1), 0.008, 0.08, Color("c0c0c0"), 0.3, 0.8)
			plaklar.append(plak)
		"poster": _cerceveler(1, "on")
		"photos": _cerceveler(2, "sag")
		"artwall": _cerceveler(3, "on")
		"d4gallery": _cerceveler(4, "sag")
		"d5art": _cerceveler(5, "on")
		"mat":
			_k(dekor_kok, Vector3(-3.6, 0.006, 3.2), Vector3(0.6, 0.012, 0.9), Color("8a3b2a"), 1.0)
			_k(dekor_kok, Vector3(-3.6, 0.008, 3.2), Vector3(0.45, 0.012, 0.75), Color("5a3a22"), 1.0)
		"stools":
			for x in [1.95, 2.6, 3.25]:
				_p("wooden_stool_01_2k", Vector3(x, 0, -2.55))
		"sofa": _p("Sofa_01_1k", Vector3(2.2, 0, 3.85), 180.0)
		"d4sofa":
			_p("Sofa_01_1k", Vector3(2.2, 0, 3.85), 180.0)
			_p("modern_arm_chair_01_1k", Vector3(3.75, 0, 3.6), 180.0)
		"bookshelf", "d4shelf":
			var sc := 1.3 if id == "d4shelf" else 1.0
			var raf := _p("wooden_display_shelves_01_2k", Vector3(0.45, 0, 4.05), -90.0, sc)
			var renk := [Color("8a3b2a"), Color("2f4a3c"), Color("c2a46b"), Color("3b6ea8"), Color("5a3a22")]
			for kat in [0.42, 0.8, 1.18]:
				for i in 7:
					_k(dekor_kok, Vector3(0.1 + i * 0.1, kat * sc + 0.1, 4.08), Vector3(0.06, 0.2 + (i % 3) * 0.03, 0.18), renk[(i + int(kat * 10)) % renk.size()], 0.8)
			raf.name = "kitaplik"
		"clock", "d4clock":
			var s := Node3D.new()
			s.position = Vector3(3.55, 2.35, 4.27)
			dekor_kok.add_child(s)
			var antika := id == "d4clock"
			var kasa := cyl(s, Vector3.ZERO, 0.24 if antika else 0.2, 0.04, Color("b08a3e") if antika else Color("2b2b2b"), 0.4, 0.7 if antika else 0.2)
			kasa.rotation_degrees.x = 90
			var yuz := cyl(s, Vector3(0, 0, -0.022), 0.2 if antika else 0.17, 0.005, Color("f6efe3"), 0.9)
			yuz.rotation_degrees.x = 90
			_k(s, Vector3(0, 0.05, -0.028), Vector3(0.012, 0.11, 0.004), Color("1d1d1d"))
			var akrep := _k(s, Vector3(0.035, 0, -0.03), Vector3(0.08, 0.012, 0.004), Color("1d1d1d"))
			akrep.rotation_degrees.z = 20
			if antika:
				_k(s, Vector3(0, -0.45, 0), Vector3(0.006, 0.5, 0.006), Color("b08a3e"), 0.4, 0.8)
				var sarkac := cyl(s, Vector3(0, -0.72, 0), 0.05, 0.01, Color("b08a3e"), 0.3, 0.8)
				sarkac.rotation_degrees.x = 90
		"neon", "d4neon":
			var n := Node3D.new()
			dekor_kok.add_child(n)
			var renk2 := Color("ff9a2e") if id == "neon" else Color("ff5fa2")
			_yazi(n, Vector3(1.0, 2.45, 4.26), "COFFEE" if id == "neon" else "CoffeBean", renk2, 96, true)
			_isik(n, Vector3(1.0, 2.45, 3.9), renk2, 0.8, 2.2)
		"brass", "d5brass":
			var b := Node3D.new()
			dekor_kok.add_child(b)
			var gen := 1.1 if id == "brass" else 1.5
			_k(b, Vector3(1.0, 2.5, 4.28), Vector3(gen, 0.32, 0.02), Color("c9a24a"), 0.3, 0.9)
			_yazi(b, Vector3(1.0, 2.5, 4.265), "CoffeBean", Color("2b1a0e"), 64)
		"piano":
			var pi := Node3D.new()
			pi.position = Vector3(0.45, 0, 3.95)
			dekor_kok.add_child(pi)
			_k(pi, Vector3(0, 0.65, 0.1), Vector3(1.4, 1.3, 0.4), Color("0e0e0e"), 0.25)
			_k(pi, Vector3(0, 0.72, -0.18), Vector3(1.3, 0.04, 0.22), Color("f4f1ea"), 0.4)
			for i in 26:
				_k(pi, Vector3(-0.62 + i * 0.05, 0.75, -0.22), Vector3(0.025, 0.02, 0.12), Color("111111"), 0.4)
			_p("wooden_stool_01_2k", Vector3(0.45, 0, 3.35))
		"d5piano":
			var g := Node3D.new()
			g.position = Vector3(2.4, 0, 3.55)
			dekor_kok.add_child(g)
			var govde := cyl(g, Vector3(0, 0.75, 0), 0.75, 0.3, Color("0e0e0e"), 0.2)
			govde.scale = Vector3(1.0, 1.0, 0.65)
			for x in [-0.5, 0.5]:
				_k(g, Vector3(x, 0.3, 0.1), Vector3(0.08, 0.6, 0.08), Color("0e0e0e"), 0.3)
			_k(g, Vector3(0, 0.3, -0.35), Vector3(0.08, 0.6, 0.08), Color("0e0e0e"), 0.3)
			_k(g, Vector3(0, 0.82, -0.5), Vector3(1.1, 0.05, 0.18), Color("f4f1ea"), 0.4)
			var kapak := _k(g, Vector3(0.1, 1.15, 0.05), Vector3(1.2, 0.02, 0.9), Color("0e0e0e"), 0.2)
			kapak.rotation_degrees.z = 28
		"aquarium", "d5aqua":
			var a := Node3D.new()
			var buyuk := id == "d5aqua"
			a.position = Vector3(3.9, 0, -1.3)
			dekor_kok.add_child(a)
			var gen2 := 1.6 if buyuk else 1.0
			_k(a, Vector3(0, 0.4, 0), Vector3(0.45, 0.8, gen2), Color("2b1a0e"), 0.6)
			var cam := StandardMaterial3D.new()
			cam.albedo_color = Color(0.35, 0.65, 0.9, 0.45)
			cam.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			cam.roughness = 0.05
			var tank := MeshInstance3D.new()
			var tb := BoxMesh.new()
			tb.size = Vector3(0.42, 0.9 if buyuk else 0.6, gen2 - 0.04)
			tank.mesh = tb
			tank.material_override = cam
			tank.position = Vector3(0, 0.8 + tb.size.y * 0.5, 0)
			a.add_child(tank)
			var balik := [Color("ff8c2e"), Color("ffd23f"), Color("3fb3ff"), Color("ff5f5f")]
			for i in (9 if buyuk else 5):
				var f := sph(a, Vector3(rng.randf_range(-0.12, 0.12), 0.95 + rng.randf() * (tb.size.y - 0.25), rng.randf_range(-gen2 * 0.4, gen2 * 0.4)), 0.025, balik[i % balik.size()])
				f.scale = Vector3(0.6, 0.6, 1.4)
			_isik(a, Vector3(0, 1.4, 0), Color("9fd4ff"), 0.5, 1.6)
		"chandelier", "d5chand":
			var c := Node3D.new()
			c.position = Vector3(2.6, 0, 1.4)
			dekor_kok.add_child(c)
			_k(c, Vector3(0, 3.0, 0), Vector3(0.01, 0.4, 0.01), Color("c9a24a"), 0.3, 0.9)
			var kr := StandardMaterial3D.new()
			kr.albedo_color = Color(0.95, 0.97, 1.0, 0.7)
			kr.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			kr.emission_enabled = true
			kr.emission = Color("fff1d0")
			kr.emission_energy_multiplier = 0.6
			var n2 := 14 if id == "d5chand" else 9
			for i in n2:
				var ang := TAU * i / n2
				var rr := 0.28 if i % 2 == 0 else 0.18
				var dm := MeshInstance3D.new()
				var sm := SphereMesh.new()
				sm.radius = 0.035
				sm.height = 0.1
				dm.mesh = sm
				dm.material_override = kr
				dm.position = Vector3(cos(ang) * rr, 2.72 - (i % 3) * 0.07, sin(ang) * rr)
				c.add_child(dm)
			_isik(c, Vector3(0, 2.6, 0), Color("ffe6b8"), 1.4, 4.5)
		"d5roaster":
			var k := Node3D.new()
			k.position = Vector3(0.5, 0, 3.8)
			dekor_kok.add_child(k)
			_k(k, Vector3(0, 0.45, 0), Vector3(0.8, 0.9, 0.6), Color("1f1d1c"), 0.5, 0.4)
			var tambur := cyl(k, Vector3(0, 1.1, -0.05), 0.28, 0.65, Color("b08a3e"), 0.3, 0.85)
			tambur.rotation_degrees.x = 90
			var huni := cyl(k, Vector3(0.12, 1.55, 0.05), 0.16, 0.3, Color("c0c0c0"), 0.3, 0.8)
			(huni.mesh as CylinderMesh).bottom_radius = 0.05
			cyl(k, Vector3(0, 0.55, -0.55), 0.35, 0.08, Color("c0c0c0"), 0.3, 0.8)
			_k(k, Vector3(0, 0.25, -0.55), Vector3(0.08, 0.5, 0.08), Color("1f1d1c"))


func _process(delta: float) -> void:
	super._process(delta)
	for p in plaklar:
		p.rotation.y += delta * 3.5
