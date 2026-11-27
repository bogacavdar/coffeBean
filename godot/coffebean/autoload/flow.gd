extends CanvasLayer
## Ekran akışı (tasarım belgesi §7 Flow): sahne geçişleri ve bütün açılır pencereler
## (yuva, zorluk, ayarlar, onay, oyun içi menü). Pencerenin dışına tıklamak ya da Esc "Vazgeç" sayılır.

const ANA_MENU := "res://ui/ana_menu.tscn"
const DUKKAN := "res://dukkan/dukkan.tscn"

var kok: Control
var yigin: Array = []          ## açık pencereler: {kutu, vazgec}


func _ready() -> void:
	layer = 50
	process_mode = Node.PROCESS_MODE_ALWAYS
	kok = Control.new()
	kok.set_anchors_preset(Control.PRESET_FULL_RECT)
	kok.mouse_filter = Control.MOUSE_FILTER_IGNORE
	kok.theme = Tema.olustur()
	add_child(kok)
	get_tree().set_auto_accept_quit(false)


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		cikis()


func _input(event: InputEvent) -> void:
	if yigin.is_empty():
		return
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		get_viewport().set_input_as_handled()
		var p: Dictionary = yigin.back()
		kapat(p)
		if p.vazgec is Callable:
			p.vazgec.call()


# ---------- sahne geçişleri ----------
func oyunu_baslat(durum: Dictionary, i: int) -> void:
	tumunu_kapat()
	GameState.S = durum
	GameState.yuva = i
	SaveSystem.yaz(i, durum)
	get_tree().paused = false
	get_tree().change_scene_to_file(DUKKAN)


func ana_menuye() -> void:
	Ses.donguleri_durdur()
	SaveSystem.otomatik()
	if GameState.yuva == 0:
		SaveSystem.sil(0)
		akis = {}
	tumunu_kapat()
	GameState.S = {}
	GameState.yuva = 0
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().change_scene_to_file(ANA_MENU)


func cikis() -> void:
	SaveSystem.otomatik()
	get_tree().quit()


# ---------- pencere altyapısı ----------
## dugmeler: [{"metin": "...", "tur": "ana"/"tehlike"/"", "fn": Callable}]; vazgec: dışarı tıklama / Esc.
func pencere(baslik: String, govde: Control, dugmeler: Array, vazgec = null, genislik := 560) -> Dictionary:
	var perde := ColorRect.new()
	perde.color = Color(0.08, 0.05, 0.03, 0.55)
	perde.set_anchors_preset(Control.PRESET_FULL_RECT)
	kok.add_child(perde)
	var orta := CenterContainer.new()
	orta.set_anchors_preset(Control.PRESET_FULL_RECT)
	orta.mouse_filter = Control.MOUSE_FILTER_IGNORE
	perde.add_child(orta)
	var kart := PanelContainer.new()
	kart.custom_minimum_size.x = genislik
	orta.add_child(kart)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 14)
	kart.add_child(v)
	v.add_child(Tema.yazi(baslik, 28, Tema.KAHVE, true))
	if govde:
		v.add_child(govde)
	var p := {"kutu": perde, "vazgec": vazgec}
	if not dugmeler.is_empty():
		var h := HBoxContainer.new()
		h.alignment = BoxContainer.ALIGNMENT_END
		h.add_theme_constant_override("separation", 10)
		v.add_child(h)
		for d in dugmeler:
			var b := Tema.dugme(d.metin, d.get("tur", ""))
			b.disabled = d.get("kapali", false)
			var fn = d.get("fn")
			b.pressed.connect(func():
				kapat(p)
				if fn is Callable: fn.call())
			h.add_child(b)
	perde.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			kapat(p)
			if vazgec is Callable: vazgec.call())
	yigin.append(p)
	Ses.sfx("open")
	return p


func kapat(p: Dictionary) -> void:
	yigin.erase(p)
	if is_instance_valid(p.kutu):
		p.kutu.queue_free()


func tumunu_kapat() -> void:
	for p in yigin.duplicate():
		kapat(p)


func onay(baslik: String, metin: String, evet: String, fn: Callable, tur := "ana", vazgec = null) -> void:
	pencere(baslik, Tema.yazi(metin), [{"metin": "Vazgeç", "fn": vazgec}, {"metin": evet, "tur": tur, "fn": fn}], vazgec)


# ---------- yuva penceresi ----------
## kip: "yeni", "yukle", "kaydet"; yenile: kapanınca menünün güncellenmesi için
func yuvalar(kip: String, yenile = null) -> void:
	var basliklar := {"yeni": "Yeni oyun – yuva seç", "yukle": "Kayıt yükle", "kaydet": "Oyunu kaydet"}
	var liste := VBoxContainer.new()
	liste.add_theme_constant_override("separation", 10)
	var p := pencere(basliklar[kip], liste, [{"metin": "Kapat", "fn": yenile}], yenile, 720)
	for i in range(1, SaveSystem.YUVA_SAYISI + 1):
		var x := SaveSystem.oku(i)
		var simdiki := GameState.oyunda() and i == GameState.yuva
		var satir := PanelContainer.new()
		satir.add_theme_stylebox_override("panel", Tema.kutu(Tema.DUGME if not x.is_empty() else Color(Tema.DUGME, 0.45), 10))
		liste.add_child(satir)
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 14)
		satir.add_child(h)
		var no := Tema.yazi(str(i), 34, Tema.ANA, true)
		no.custom_minimum_size.x = 30
		h.add_child(no)
		var bilgi := VBoxContainer.new()
		bilgi.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(bilgi)
		var oz := SaveSystem.ozet(x)
		bilgi.add_child(Tema.yazi(oz[0], 20, Tema.KAHVE, true))
		bilgi.add_child(Tema.yazi(oz[1] + (" · şu an oynanan" if simdiki else ""), 16, Tema.SOLUK))
		var eylem: Button
		if kip == "yeni":
			eylem = Tema.dugme("Burada başla", "ana")
			eylem.pressed.connect(func(): _dolu_mu(i, "yeni", func():
				kapat(p)
				zorluk_sec(func(z): oyunu_baslat(GameState.yeni_durum(z), i))))
		elif kip == "yukle":
			eylem = Tema.dugme("Yükle", "ana")
			eylem.disabled = x.is_empty() or x.get("bankrupt", false)
			eylem.pressed.connect(func():
				kapat(p)
				oyunu_baslat(SaveSystem.oku(i), i))
		else:
			eylem = Tema.dugme("Buraya kaydet", "ana")
			eylem.pressed.connect(func(): _dolu_mu(i, "kaydet", func():
				GameState.yuva = i
				SaveSystem.yaz(i, GameState.S)
				kapat(p)
				yuvalar("kaydet", yenile)))
		eylem.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(eylem)
		if not x.is_empty() and not simdiki:
			var sil := Tema.dugme("Sil", "tehlike")
			sil.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			sil.pressed.connect(func():
				var o := SaveSystem.ozet(SaveSystem.oku(i))
				onay("Yuva %d silinsin mi?" % i, "%s · %s\nSilinen kayıt geri gelmez." % o, "Sil", func():
					SaveSystem.sil(i)
					kapat(p)
					yuvalar(kip, yenile)
					if yenile is Callable: yenile.call(), "tehlike"))
			h.add_child(sil)


func _dolu_mu(i: int, ne: String, fn: Callable) -> void:
	var x := SaveSystem.oku(i)
	if x.is_empty() or (ne == "kaydet" and i == GameState.yuva):
		fn.call()
		return
	var o := SaveSystem.ozet(x)
	onay("Yuva %d dolu" % i, "%s · %s\nBu kaydın üstüne yazılsın mı?" % o, "Üstüne yaz", fn)


# ---------- zorluk ----------
func zorluk_sec(fn: Callable) -> void:
	var liste := VBoxContainer.new()
	liste.add_theme_constant_override("separation", 10)
	var p := pencere("Zorluk seç", liste, [{"metin": "Vazgeç"}])
	for z in ["easy", "normal", "hard"]:
		var d: Dictionary = GameState.D.difficulty[z]
		var b := Button.new()
		b.focus_mode = Control.FOCUS_NONE
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.text = "%s\n%s ₺%s ile başla." % [d.label, d.desc, GameState.tl(d.startMoney)]
		b.custom_minimum_size.y = 76
		if z == "normal":
			b.add_theme_stylebox_override("normal", Tema.kutu(Tema.DUGME, 10, 2, Tema.ANA))
		b.pressed.connect(func():
			kapat(p)
			fn.call(z))
		liste.add_child(b)


# ---------- ayarlar ----------
func ayarlar() -> void:
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 18)
	g.add_theme_constant_override("v_separation", 14)
	g.add_child(_etiket("Fare hassasiyeti"))
	var fh := HBoxContainer.new()
	var kay := HSlider.new()
	kay.min_value = 0.5
	kay.max_value = 2.0
	kay.step = 0.1
	kay.value = Settings.fare
	kay.custom_minimum_size.x = 220
	kay.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var deger := _etiket("%.1f" % Settings.fare)
	kay.value_changed.connect(func(v):
		Settings.fare = v
		deger.text = "%.1f" % v)
	fh.add_child(kay)
	fh.add_child(deger)
	g.add_child(fh)
	for s in [["Müzik", "muzik"], ["Efektler", "efekt"]]:
		g.add_child(_etiket(s[0]))
		var sh := HBoxContainer.new()
		var sk := HSlider.new()
		sk.min_value = 0
		sk.max_value = 100
		sk.step = 5
		var alan: String = s[1]
		sk.value = roundi(float(Settings.get(alan)) * 100)
		sk.custom_minimum_size.x = 220
		sk.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var sd := _etiket(str(int(sk.value)))
		sk.value_changed.connect(func(v):
			Settings.set(alan, v / 100.0)
			sd.text = str(int(v))
			Ses.seviyeleri_uygula())
		sh.add_child(sk)
		sh.add_child(sd)
		g.add_child(sh)
	g.add_child(_etiket("Sesi kapat"))
	var sesk := CheckButton.new()
	sesk.button_pressed = Settings.sessiz
	sesk.focus_mode = Control.FOCUS_NONE
	sesk.toggled.connect(func(on):
		Settings.sessiz = on
		Ses.seviyeleri_uygula())
	g.add_child(sesk)
	g.add_child(_etiket("Tam ekran"))
	var te := CheckButton.new()
	te.button_pressed = Settings.tam_ekran
	te.focus_mode = Control.FOCUS_NONE
	te.toggled.connect(func(on):
		Settings.tam_ekran = on
		Settings.pencere_uygula())
	g.add_child(te)
	g.add_child(_etiket("Grafik kalitesi"))
	var kh := HBoxContainer.new()
	var kd: Array = []
	for i in 3:
		var b := Tema.dugme(Settings.KALITE[i], "ana" if i == Settings.kalite else "")
		b.pressed.connect(func():
			Settings.kalite = i
			Settings.uygula(get_tree().current_scene)
			for j in 3:
				var bj: Button = kd[j]
				var r := Tema.ANA if j == i else Tema.DUGME
				bj.add_theme_stylebox_override("normal", Tema.kutu(r))
				bj.add_theme_stylebox_override("hover", Tema.kutu(r.lightened(0.1)))
				bj.add_theme_color_override("font_color", Tema.KREM if j == i else Tema.KAHVE)
				bj.add_theme_color_override("font_hover_color", Tema.KREM if j == i else Tema.KAHVE))
		kd.append(b)
		kh.add_child(b)
	g.add_child(kh)
	if Settings.hile_acilmis:
		g.add_child(_etiket("Hile modu (test için)"))
		var hm := CheckButton.new()
		hm.button_pressed = Settings.hile_acik
		hm.focus_mode = Control.FOCUS_NONE
		hm.toggled.connect(func(on):
			Settings.hile_acik = on
			Settings.kaydet()
			var sc := get_tree().current_scene
			if sc and sc.has_method("yenile"):
				sc.yenile())
		g.add_child(hm)
	pencere("Ayarlar", g, [{"metin": "Tamam", "tur": "ana", "fn": Settings.kaydet}], Settings.kaydet)


func _etiket(metin: String) -> Label:
	var l := Tema.yazi(metin)
	l.autowrap_mode = TextServer.AUTOWRAP_OFF
	l.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return l


# ---------- akış testi (T9; hile modunda ana menüde) ----------
var akis: Dictionary = {}                  ## o an çalışan test: {id, kurulum: Callable}


## [id, ad, başlangıç durumu ayarı (Dictionary), sahnede kurulum (Callable(sahne) ya da null)]
func akis_listesi() -> Array:
	var L: Array = [
		["A1", "İlk gün baştan: Yıldız Teyze (espresso → kapanış)", {"_yeni": true}, null],
		["A2", "İlk günün kapanışı (kira, defter, veda)", {"day": 1, "taught": ["intro", "first"]}, func(sc): sc.hile_gunu_bitir_hazir()],
		["A3", "Gün sonu: kira günü → defter → gazete → tedarik → fiyatlar", {"day": 7, "rentPaidWeek": 0}, func(sc): sc.hile_gunu_bitir_hazir()],
		["A6", "Özel müşteri: Eleştirmen", {"day": 3, "shopLevel": 1}, func(sc): sc.zorla_tip = "critic"],
		["A7", "Özel müşteri: Turist", {"day": 3, "shopLevel": 1}, func(sc): sc.zorla_tip = "tourist"],
		["A8", "Özel müşteri: Fenomen", {"day": 3, "shopLevel": 1}, func(sc): sc.zorla_tip = "influencer"],
		["A9", "Yarışma günü (3 jüri)", {"day": 4, "shopLevel": 4, "compDay": 4, "tools": {"milkKit": true, "cocoa": true}, "unlocked": ["espresso", "latte", "cappuccino"]}, func(sc): sc._hile_stok()],
		["A10", "Yoğun saat", {"day": 3}, func(sc): sc.yogun = {"at": 3.0, "on": false}],
		["A11", "Hava: yağmurlu gün", {"day": 3}, func(sc): sc.hile_hava("rain")],
		["A12", "Hava: sıcak gün", {"day": 3}, func(sc): sc.hile_hava("hot")],
		["A13", "Sadık müşteri (bir mükemmel servis daha)", {"day": 3, "loyal": {"regular": 2}}, func(sc): sc.zorla_tip = "regular"],
		["A27", "Hava: kalabalık cumartesi", {"day": 6}, null],
		["A14", "Kredi vadesi doldu (iflas)", {"day": 9, "loans": [{"id": 1, "amount": 900, "owe": 990, "rem": 990, "day": 4, "due": 9}], "debt": 990, "loanSeq": 1}, func(sc): sc.hile_gunu_bitir_hazir()],
		["A15", "Pahalı fiyat tepkisi (espresso ₺160)", {"day": 3, "priceTL": {"espresso": 160}}, null],
		["A16", "Bardak bitince müşteri gider", {"day": 3, "cups": {"espS": 0, "espD": 0}}, null],
	]
	for n in 5:
		L.append(["A%d" % (21 + n), "Dükkan seviyesi %s %s" % ["★".repeat(n + 1), GameState.dukkan(n).name], {"day": 3, "shopLevel": n}, null])
	return L


func akis_testleri() -> void:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	var L := akis_listesi()
	var tamam := 0
	for a in L:
		if a[0] in Settings.akis_tamam:
			tamam += 1
	v.add_child(Tema.yazi("%d/%d tamam · her test ayrı bir deneme kaydında açılır; gerçek yuvaların değişmez." % [tamam, L.size()], 16, Tema.SOLUK))
	var p := pencere("Akış testi", v, [
		{"metin": "Listeyi sıfırla", "fn": func():
			Settings.akis_tamam = []
			Settings.kaydet()
			akis_testleri()},
		{"metin": "Kapat", "tur": "ana"}], null, 720)
	for a in L:
		var b := Tema.dugme(("✓ " if a[0] in Settings.akis_tamam else "") + "%s · %s" % [a[0], a[1]])
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.add_theme_font_size_override("font_size", 17)
		var test: Array = a
		b.pressed.connect(func():
			kapat(p)
			akis_baslat(test))
		v.add_child(b)


func akis_baslat(a: Array) -> void:
	var st := GameState.yeni_durum("normal")
	if a[2].has("_yeni"):
		akis = {"id": a[0], "kurulum": a[3]}
		oyunu_baslat(st, 0)
		return
	st.firstSupply = false
	st.taught = ["intro", "first", "closing"]
	for k in GameState.D.lessons:
		st.taught.append("L:" + k)
	for k in a[2]:
		var deger = a[2][k]
		if k == "cups":
			for c in deger:
				st.cups[c] = deger[c]
		else:
			st[k] = deger.duplicate(true) if deger is Dictionary or deger is Array else deger
	akis = {"id": a[0], "kurulum": a[3]}
	oyunu_baslat(st, 0)


func akis_bitti() -> void:
	if akis.is_empty():
		return
	if not akis.id in Settings.akis_tamam:
		Settings.akis_tamam.append(akis.id)
		Settings.kaydet()
	akis = {}
	ana_menuye()
	akis_testleri()


# ---------- oyun içi menü (Esc) ----------
func oyun_ici_menu() -> void:
	if not yigin.is_empty() or not GameState.oyunda():
		return
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	v.add_child(Tema.yazi("Oyun yuva %d'e kendiliğinden kaydediliyor." % GameState.yuva, 17, Tema.SOLUK))
	var p := pencere("Menü", v, [], _oyuna_don, 420)
	var dugmeler := [
		["Oyuna dön", "ana", _oyuna_don],
		["Kaydet (yuva seç)", "", func(): yuvalar("kaydet", oyun_ici_menu_yeniden)],
		["Ayarlar", "", func():
			ayarlar()
			yigin.back().vazgec = func():
				Settings.kaydet()
				oyun_ici_menu_yeniden()],
		["Ana menüye dön", "", func(): onay("Ana menüye dönülsün mü?", "Oyun kaydedilir; kaldığın yerden Devam ile sürersin.", "Ana menüye dön", ana_menuye, "ana", oyun_ici_menu_yeniden)],
	]
	for d in dugmeler:
		var b := Tema.dugme(d[0], d[1])
		var fn: Callable = d[2]
		b.pressed.connect(func():
			kapat(p)
			fn.call())
		v.add_child(b)


func oyun_ici_menu_yeniden() -> void:
	if yigin.is_empty():
		get_tree().paused = false
		oyun_ici_menu()


func _oyuna_don() -> void:
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
