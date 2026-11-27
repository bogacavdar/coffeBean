extends "res://dukkan/ogretici.gd"
## Dükkan ekranı, ekipman ve aletler (tasarım belgesi §4 "Dükkan ekranı, ekipman ve aletler (taşıma adımı T12)");
## web renderHub, eqRow, eqLevel, eqNextPrice, widenMult, autoSteps.

## Web adımı → Godot adımı (belgedeki eşleme tablosu).
const ADIM_ESLEME := {"grind": "wdt", "dose": "dose", "tamp": "tamp", "extract": "pull", "milk": "steam", "art": "pour"}
## İstasyonu ya da akışı Godot'a henüz gelmemiş ekipman listelenmez.
const GIZLI_EKIPMAN := ["dualGroup", "tkMachine", "filterMachine"]
## Aletler sekmesinde satılan aletler (Godot'da istasyonu olanlar).
const GODOT_ALETLER := ["milkKit", "cocoa", "syrupPump", "creamSiphon", "cezve", "kettle", "frenchPress", "v60", "aeropress", "mokaPot", "chemex", "kalita", "iceMachine", "shaker", "frother", "whisk"]

var adim_simdi := ""
var dukkan_sekme := "upg"
var dukkan_kaydir := 0


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	_buhar_guncelle()


func _buhar_guncelle() -> void:
	BUHAR_K = 1.5 if GameState.S.equipment.get("steamWand", false) else 1.0


# ---------- kademe, fiyat, gereksinim (web eqLevel / eqMax / eqNextPrice / reqOk) ----------
func eq_max(id: String) -> int:
	return 3 if _D().equipment[id].has("widen") else 1


func eq_seviye(id: String) -> int:
	var S := GameState.S
	var lv = S.get("eqLv", {}).get(id)
	if lv != null:
		return int(lv)
	return eq_max(id) if S.equipment.get(id, false) else 0


func eq_fiyat(id: String) -> int:
	var e: Dictionary = _D().equipment[id]
	if not e.has("widen"):
		return int(e.price)
	var k: Array = _D().get("upgradeCost", [1, 1.3, 1.65])
	return roundi(float(e.price) * float(k[mini(eq_seviye(id), 2)]) / 10.0) * 10


func eq_tamam(id: String) -> bool:
	return eq_seviye(id) >= eq_max(id)


# ---------- etkiler ----------
## Godot adımının genişleme çarpanı (web widenMult): en yüksek kademe sayılır.
func genislik(adim: String) -> float:
	var taban := super.genislik(adim)
	var m := 1.0
	var kat: Array = _D().zones.get("widenLevels", [1.2, 1.35, 1.5])
	for id in _D().equipment:
		var e: Dictionary = _D().equipment[id]
		var lv := eq_seviye(id)
		if lv > 0 and e.has("widen") and ADIM_ESLEME.get(e.widen, "") == adim:
			m = maxf(m, float(kat[mini(lv, 3) - 1]))
	return m * taban


func ekipman_carpani() -> float:
	return genislik(adim_simdi)


## Otomatik Godot adımları (web autoSteps).
func oto_adimlar() -> Array:
	var out: Array = []
	for id in _D().equipment:
		if id in GIZLI_EKIPMAN or not GameState.S.equipment.get(id, false):
			continue
		for a in _D().equipment[id].get("auto", []):
			var g: String = ADIM_ESLEME.get(a, "")
			if g != "" and not g in out:
				out.append(g)
	return out


func open_panel(m: String, title: String) -> void:
	adim_simdi = m
	bolge_guncelle()
	super.open_panel(m, title)
	if m in oto_adimlar():
		panel_title.text = title + " (otomatik)"
		get_tree().create_timer(0.6).timeout.connect(_oto.bind(m))


func _oto(m: String) -> void:
	if mode != m:
		return
	match m:
		"dose":
			dose_g = DOSE[held_size]
			finish_dose()
		"wdt":
			for i in wdt_cells.size():
				wdt_cells[i] = 0.0
			finish_wdt()
		"tamp":
			bubble_pos = Vector2.ZERO
			bubble_vel = Vector2.ZERO
			tamp_time = 1.999
			tamp_acc = 199.9


## Süper otomatik: çekim hedef gramda kendisi durur.
func _cekim_dur() -> bool:
	if "pull" in oto_adimlar() and pull_g >= verim():
		return true
	return super._cekim_dur()


func start_steam() -> void:
	adim_simdi = "steam"
	bolge_guncelle()
	super.start_steam()
	if "steam" in oto_adimlar():
		get_tree().create_timer(1.0).timeout.connect(func():
			if mode == "steam":
				foam = kopuk_hedefi()
				milk_temp = MILK_TARGET
				scream = 0.0
				finish_steam())


func start_pour() -> void:
	adim_simdi = "pour"
	super.start_pour()


# ---------- Dükkan ekranı (web renderHub: Geliştirmeler, Aletler) ----------
## kip: "gunsonu" (Tedarik ile Fiyatlar arasında) ya da "ara" (dizüstünden).
func _dukkan(kip: String) -> void:
	var S := GameState.S
	var dk := GameState.dukkan(S.shopLevel)
	var kaydir := ScrollContainer.new()
	kaydir.custom_minimum_size = Vector2(0, 440)
	kaydir.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 10)
	kaydir.add_child(v)
	var yenile := func():
		dukkan_kaydir = kaydir.scroll_vertical
		Flow.kapat(Flow.yigin.back())
		_dukkan(kip)
	v.add_child(Tema.yazi("Kasa: ₺" + GameState.tl(S.money), 22, Tema.ANA, true))
	_dukkan_ust(v, yenile)
	var sekmeler := HBoxContainer.new()
	sekmeler.add_theme_constant_override("separation", 8)
	for s in _sekmeler():
		var b := Tema.dugme(s[1], "ana" if dukkan_sekme == s[0] else "")
		var sk: String = s[0]
		b.pressed.connect(func():
			dukkan_sekme = sk
			dukkan_kaydir = 0
			yenile.call())
		sekmeler.add_child(b)
	v.add_child(sekmeler)
	_sekme_icerik(v, dukkan_sekme, int(dk.stars), yenile, kip)
	var dugmeler: Array = []
	if kip == "gunsonu":
		dugmeler.append({"metin": "← Geri", "fn": func(): _tedarik("gunsonu")})
		dugmeler.append({"metin": "Devam", "tur": "ana", "fn": _dukkandan_sonra})
	else:
		dugmeler.append({"metin": "Kapat", "tur": "ana", "fn": _ekrandan_cik})
	Flow.pencere("Dükkan · %s %s" % ["★".repeat(int(dk.stars)), dk.name], kaydir, dugmeler, _ekrandan_cik, 820)
	kaydir.set_deferred("scroll_vertical", dukkan_kaydir)
	dukkan_kaydir = 0


## Dükkan sekmeleri (T14: Dekor eklenir).
func _sekmeler() -> Array:
	return [["upg", "Geliştirmeler"], ["tools", "Aletler"]]


func _sekme_icerik(v: VBoxContainer, sekme: String, yildiz: int, yenile: Callable, kip: String) -> void:
	if sekme == "tools":
		_aletler(v, yildiz, yenile, kip)
	else:
		_gelistirmeler(v, yildiz, yenile)


## Dükkan penceresinin üstüne ek (T13: Ana hedef).
func _dukkan_ust(_v: VBoxContainer, _yenile: Callable) -> void:
	pass


func _dukkan_bolum(v: VBoxContainer, baslik: String, aciklama: String) -> VBoxContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", Tema.kutu(Tema.DUGME, 10))
	var ic := VBoxContainer.new()
	ic.add_theme_constant_override("separation", 8)
	p.add_child(ic)
	ic.add_child(Tema.yazi(baslik, 20, Tema.KAHVE, true))
	if aciklama != "":
		ic.add_child(Tema.yazi(aciklama, 15, Tema.SOLUK))
	v.add_child(p)
	return ic


func _dukkan_satir(ic: VBoxContainer, ad: String, alt: String, fiyat_metni: String, sag: Control, kilitli := false) -> void:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 12)
	var sol := VBoxContainer.new()
	sol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sol.add_child(Tema.yazi(ad, 18, Tema.SOLUK if kilitli else Tema.KAHVE, true))
	sol.add_child(Tema.yazi(alt, 15, Tema.SOLUK))
	h.add_child(sol)
	var f := Tema.yazi(fiyat_metni, 18)
	f.autowrap_mode = TextServer.AUTOWRAP_OFF
	f.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(f)
	sag.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(sag)
	ic.add_child(h)


func _durum(metin: String) -> Label:
	var l := Tema.yazi(metin, 16, Tema.SOLUK)
	l.autowrap_mode = TextServer.AUTOWRAP_OFF
	return l


func _gelistirmeler(v: VBoxContainer, yildiz: int, yenile: Callable) -> void:
	var E: Array = []
	for id in _D().equipment:
		if not id in GIZLI_EKIPMAN and int(_D().equipment[id].get("stars", 1)) <= yildiz:
			E.append(id)
	var kol := _dukkan_bolum(v, "Kolaylaştırıcılar ve göstergeler", "Renkli hedef bölgelerini genişletir ya da adımı hızlandırır.")
	var oto := _dukkan_bolum(v, "Otomasyon", "Adımı atlar, sabit %d puan verir; önce o adımın kolaylaştırıcısı gerekir." % int(_E().autoScore))
	var kap := _dukkan_bolum(v, "Kapasite", "")
	for id in E:
		var e: Dictionary = _D().equipment[id]
		var hedef: VBoxContainer = oto if e.has("auto") else (kap if id == "fridge" else kol)
		_ekipman_satiri(hedef, id, yenile)


func _ekipman_satiri(ic: VBoxContainer, id: String, yenile: Callable) -> void:
	var S := GameState.S
	var e: Dictionary = _D().equipment[id]
	var lv := eq_seviye(id)
	var mx := eq_max(id)
	var bitti_mi := lv >= mx
	var fiyat_tl := eq_fiyat(id)
	var eksik: Array = []
	for r in e.get("requires", []):
		if not eq_tamam(r):
			eksik.append(String(_D().equipment[r].name) + (" (%d/%d geliştirme)" % [eq_seviye(r), eq_max(r)] if eq_max(r) > 1 else ""))
	var ad: String = e.name
	if mx > 1:
		ad += "  " + "●".repeat(lv) + "○".repeat(mx - lv)
	var alt: String = e.effect
	if mx > 1 and lv > 0:
		alt += " · şu an ×" + str(_D().zones.widenLevels[lv - 1]).replace(".", ",")
	var sag: Control
	if bitti_mi:
		sag = _durum("✓ 3/3 tamam" if mx > 1 else "✓ alındı")
	elif not eksik.is_empty():
		sag = _durum("Önce: " + ", ".join(eksik))
		sag.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		sag.custom_minimum_size.x = 230
	else:
		var b := Tema.dugme(("Geliştir (%d/3)" % (lv + 1) if lv > 0 else "Satın al (1/3)") if mx > 1 else "Satın al")
		b.disabled = float(S.money) < fiyat_tl
		var uygula := func():
			S.equipment[id] = true
			if not S.has("eqLv"):
				S.eqLv = {}
			S.eqLv[id] = lv + 1
			if id == "fridge":
				S.milkDay = S.day
				S.fridgePaid = true
			S.log.append("Gün %d: %s %s" % [int(S.day), e.name, "alındı" if lv == 0 else "geliştirildi (%d/3)" % (lv + 1)])
		b.pressed.connect(func():
			if _al(fiyat_tl, uygula):
				_buhar_guncelle()
				flash = "%s %s" % [e.name, "alındı" if lv == 0 else "geliştirildi (%d/3)" % (lv + 1)]
				yenile.call())
		sag = b
	_dukkan_satir(ic, ad, alt, "" if bitti_mi else "₺" + GameState.tl(fiyat_tl), sag, not eksik.is_empty() and not bitti_mi)


func _aletler(v: VBoxContainer, yildiz: int, yenile: Callable, kip: String) -> void:
	var S := GameState.S
	var ic := _dukkan_bolum(v, "Aletler", "Bazı tarifler bu aletler olmadan yapılamaz. Dükkan büyüyünce yenisine taşınır.")
	for id in _D().tools:
		var a: Dictionary = _D().tools[id]
		if int(a.get("stars", 1)) > yildiz or not id in GODOT_ALETLER:
			continue
		var kullanan: Array = []
		for d in _D().drinks:
			if id in _D().drinks[d].get("needs", []):
				kullanan.append(_D().drinks[d].name)
		var sag: Control
		if S.tools.get(id, false):
			sag = _durum("✓ dükkanda")
		else:
			var b := Tema.dugme("Satın al")
			b.disabled = float(S.money) < int(a.price)
			var tid: String = id
			var uygula := func():
				S.tools[tid] = true
				S.log.append("Gün %d: %s alındı" % [int(S.day), a.name])
			b.pressed.connect(func():
				var once: Array = []
				for x in S.unlocked:
					if aletleri_var(x):
						once.append(x)
				if _al(int(a.price), uygula):
					flash = "%s alındı" % a.name
					_tahta_yenile()
					var simdi: Array = []
					for x in S.unlocked:
						if aletleri_var(x) and not x in once:
							simdi.append(_D().drinks[x].name)
					yenile.call()
					var eks := eksikler()
					if not simdi.is_empty() and not eks.is_empty():
						var g := VBoxContainer.new()
						g.add_theme_constant_override("separation", 6)
						g.add_child(Tema.yazi("Müşterilerin bu kahveyi isteyebilmesi için Tedarik'ten şunları almalısın:", 17))
						for x in eks:
							g.add_child(Tema.yazi("• " + x, 16))
						g.add_child(Tema.yazi("Almazsan müşteriler bu kahveyi istemez ya da bardak yoksa gider.", 15, Tema.SOLUK))
						Flow.pencere("%s artık menüde" % ", ".join(simdi), g, [
							{"metin": "Sonra"},
							{"metin": "Tedarik'e git", "tur": "ana", "fn": func():
								Flow.tumunu_kapat()
								_tedarik("gunsonu" if kip == "gunsonu" else "ara")}], null, 600))
			sag = b
		_dukkan_satir(ic, a.name, "%s · gerektiren: %s" % [a.effect, ", ".join(kullanan)], "₺" + GameState.tl(a.price), sag)


# ---------- akış: Tedarik → Dükkan → Fiyatlar ----------
func _yeni_gun() -> void:
	_dukkan("gunsonu")


func _dukkandan_sonra() -> void:
	super._yeni_gun()


func _fiyat_geri() -> void:
	_dukkan("gunsonu")


# ---------- dizüstü menüsü: Dükkan eklenir ----------
func interact(id: String) -> void:
	if id == "dizustu" and not bitti:
		_ekrana_gec()
		var v := VBoxContainer.new()
		v.add_child(Tema.yazi("Ne yapmak istiyorsun?", 18, Tema.SOLUK))
		Flow.pencere("Dizüstü", v, [
			{"metin": "Kapat", "fn": _ekrandan_cik},
			{"metin": "Krediler", "fn": func(): _krediler(_ekrandan_cik)},
			{"metin": "Dükkan", "fn": func(): _dukkan("ara")},
			{"metin": "Fiyatlar", "fn": func(): _fiyatlar("ara")},
			{"metin": "Tedarik", "tur": "ana", "fn": func(): _tedarik("ara")}], _ekrandan_cik, 620)
		return
	super.interact(id)


func action_text(id: String) -> String:
	if id == "dizustu" and not bitti:
		return "E: Dizüstü (tedarik, dükkan, fiyatlar, krediler)"
	return super.action_text(id)
