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
	SaveSystem.otomatik()
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
	pencere("Ayarlar", g, [{"metin": "Tamam", "tur": "ana", "fn": Settings.kaydet}], Settings.kaydet)


func _etiket(metin: String) -> Label:
	var l := Tema.yazi(metin)
	l.autowrap_mode = TextServer.AUTOWRAP_OFF
	l.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return l


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
