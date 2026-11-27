extends "res://dukkan/susleme.gd"
## Hile paneli ve akış testi kurulumu (tasarım belgesi §4 "Hile modu ve akış testi (taşıma adımı T9)"); web CHEATS, FLOWS.

var hile_katman: CanvasLayer
var hile_kutu: PanelContainer
var saat_dur := false


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	if Settings.hile_acik:
		_hile_paneli_kur()
	if not Flow.akis.is_empty() and Flow.akis.kurulum is Callable:
		Flow.akis.kurulum.call(self)


# ---------- akış testi kurulumları ----------
func hile_hava(h: String) -> void:
	hava = h
	for n in find_children("*", "DirectionalLight3D", true, false):
		(n as DirectionalLight3D).light_energy *= 0.4 if h == "rain" else 1.35


## Günü açıp hemen bitirir (A3, A14): kapanış akışı dizüstünde beklenir.
func hile_gunu_bitir_hazir() -> void:
	acik = true
	_gunu_bitir()


## Akış testi: kapanış akışı bitince test tamam sayılır, listeye dönülür.
func _fiyatlardan_sonra() -> void:
	if not Flow.akis.is_empty():
		Flow.tumunu_kapat()
		Flow.akis_bitti()
		return
	super._fiyatlardan_sonra()


## Akış testleri A6–A8, A10, A13 servisle, A9 madalya penceresiyle biter.
func _servis_sonrasi(m: Dictionary, tutar: int, bahsis: int, servis: int) -> void:
	super._servis_sonrasi(m, tutar, bahsis, servis)
	if Flow.akis.is_empty():
		return
	var hedef := {"A6": "critic", "A7": "tourist", "A8": "influencer", "A13": "regular"}
	if hedef.get(Flow.akis.id, "") == m.tip or (Flow.akis.id == "A10" and yogun_saat()):
		_akis_sonra_bitir()


func _juri_bitti() -> void:
	super._juri_bitti()
	if not Flow.akis.is_empty() and Flow.akis.id == "A9":
		_akis_sonra_bitir()


func _akis_sonra_bitir() -> void:
	get_tree().create_timer(2.0).timeout.connect(func():
		if Flow.akis.is_empty():
			return
		Flow.tumunu_kapat()
		Flow.akis_bitti())


func _iflas(acik_tl: int, sebep := "") -> void:
	super._iflas(acik_tl, sebep)
	if not Flow.akis.is_empty() and not Flow.akis.id in Settings.akis_tamam:
		Settings.akis_tamam.append(Flow.akis.id)
		Settings.kaydet()


# ---------- panel ----------
func _hile_paneli_kur() -> void:
	hile_katman = CanvasLayer.new()
	hile_katman.layer = 40
	add_child(hile_katman)
	hile_kutu = PanelContainer.new()
	hile_kutu.theme = Tema.olustur()
	hile_kutu.add_theme_stylebox_override("panel", Tema.kutu(Color(Tema.KREM, 0.96), 12, 2, Color("6a4c93")))
	hile_kutu.position = Vector2(20, 110)
	hile_kutu.visible = false
	hile_katman.add_child(hile_kutu)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	hile_kutu.add_child(v)
	v.add_child(Tema.yazi("Hileler (F1 kapatır)", 17, Color("6a4c93"), true))
	var liste := [
		["+₺1000", func(): GameState.S.money = float(GameState.S.money) + 1000],
		["+50 itibar", func(): GameState.S.rep = int(GameState.S.rep) + 50],
		["+100 XP", func(): GameState.S.xp = int(GameState.S.xp) + 100],
		["Siparişi kendisi yap", _hile_siparis],
		["Müşteri getir", func():
			if not acik or bitti:
				flash = "Önce dükkânı aç"
				return
			_musteri_getir()],
		["Tarif seçip müşteri getir", _hile_tarif_sec],
		["Günü bitir", func():
			if not acik or bitti:
				flash = "Gün başlamadı"
				return
			_gunu_bitir()],
		["Kira gününe atla", func():
			if acik or bitti:
				flash = "Dükkân açılmadan kullan"
				return
			GameState.S.day = ceili(float(GameState.S.day) / 7.0) * 7
			SaveSystem.yaz(GameState.yuva, GameState.S)
			get_tree().reload_current_scene()],
		["Stokları doldur", _hile_stok],
		["Sıradaki tarifi aç", func():
			var id := sonraki_tarif()
			if id == "":
				flash = "Tüm tarifler zaten açık"
				return
			GameState.S.rp = maxi(tarif_ilerlemesi(), int(GameState.D.drinks[id].unlockCups))
			if int(GameState.D.drinks[id].get("shop", 1)) > _yildiz():
				flash = "%s için %d★ dükkan gerekli" % [GameState.D.drinks[id].name, int(GameState.D.drinks[id].shop)]
				return
			tarifleri_ac()],
		["Tüm tarifler + aletler", func():
			GameState.S.unlocked = GameState.D.drinks.keys()
			for k in GameState.D.tools:
				GameState.S.tools[k] = true],
		["Saati durdur / başlat", func():
			saat_dur = not saat_dur
			flash = "Saat durdu (hile)" if saat_dur else "Saat işliyor"],
		["Dükkan seviyesi atla", func():
			if int(GameState.S.shopLevel) < GameState.D.shopLevels.size() - 1:
				GameState.S.shopLevel = int(GameState.S.shopLevel) + 1
				flash = "Dükkan: " + String(GameState.dukkan(GameState.S.shopLevel).name)
			else:
				flash = "En üst seviye"],
		["Akış testi tamam", func():
			if Flow.akis.is_empty():
				flash = "Şu an bir akış testinde değilsin"
				return
			Flow.akis_bitti()],
		["Akış test listesi", func():
			Flow.akis = {}
			Flow.ana_menuye()
			Flow.akis_testleri()],
	]
	for h in liste:
		var b := Tema.dugme(h[0])
		b.add_theme_font_size_override("font_size", 16)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		var fn: Callable = h[1]
		b.pressed.connect(func():
			fn.call()
			if GameState.oyunda():
				SaveSystem.yaz(GameState.yuva, GameState.S))
		v.add_child(b)


func _input(event: InputEvent) -> void:
	if hile_kutu and event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F1:
		hile_kutu.visible = not hile_kutu.visible
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if hile_kutu.visible else Input.MOUSE_MODE_CAPTURED
		get_viewport().set_input_as_handled()
		return
	if hile_kutu and hile_kutu.visible and event is InputEventMouseButton:
		return                                 # panel açıkken tıklama panele gider, fare yakalanmaz
	super._input(event)


func _process(delta: float) -> void:
	super._process(delta)
	if saat_dur and acik and not bitti and not menu_modu:
		t = maxf(0.0, t - delta)


# ---------- hileler ----------
func _gunu_bitir() -> void:
	ogretici_aktif = false
	teyze_servis = true
	gelecek = 0
	for m in sira:
		m.node.queue_free()
	sira.clear()
	for c in cikanlar:
		c.queue_free()
	cikanlar.clear()
	if bubble:
		bubble.queue_free()
		bubble = null
	customer = null
	cstate = "none"
	t = GUN_SN
	_gun_bitti()


func _hile_siparis() -> void:
	if cstate != "wait":
		flash = "Sırada sipariş veren müşteri yok"
		return
	step_scores.assign([100.0])
	wrong = false
	serve()


func _hile_stok() -> void:
	var S := GameState.S
	for id in acik_cekirdekler():
		S.beans[id] = {"kg": cekirdek(id) + 5.0, "boughtDay": S.day}
	S.milk = sut() + 10.0
	for k in acik_sutler():
		if k != "cow":
			S.milkAlt[k] = sut(k) + 10.0
	S.milkDay = S.day
	for k in GameState.D.cups:
		S.cups[k] = int(S.cups.get(k, 0)) + 50
	for k in GameState.D.extras:
		S.extras[k] = int(S.extras.get(k, 0)) + 50
	for k in GameState.D.specials:
		S.syr[k] = int(S.syr.get(k, 0)) + 20
	flash = "Stoklar dolduruldu"


func _hile_tarif_sec() -> void:
	if not acik or bitti:
		flash = "Önce dükkânı aç"
		return
	var v := VBoxContainer.new()
	var p := Flow.pencere("Hangi tarifi istesin?", v, [{"metin": "Kapat"}], null, 520)
	for id in GameState.S.unlocked:
		if not YAPILABILIR.has(id) or not aletleri_var(id):
			continue
		var tid: String = id
		var b := Tema.dugme(Content.tarif(id).name)
		b.pressed.connect(func():
			Flow.kapat(p)
			var once := sira.size()
			_musteri_getir()
			if sira.size() > once:
				var m: Dictionary = sira.back()
				var boylar: Array = Content.tarif(tid).sizes
				m.tarif = tid
				m.boy = boylar[rng.randi() % boylar.size()]
				m.siparis = fp_fincan(m.boy)
				var say: String = GameState.D.sizes[m.boy].say
				m.metin_ad = ((say + " ") if say != "" else "") + String(Content.tarif(tid).name).to_lower()
				m.metin = _siparis_cumlesi(m.tip, m.metin_ad))
		v.add_child(b)
