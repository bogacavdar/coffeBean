extends Node
## Ana menü (tasarım belgesi: "Ana menü, kayıt yuvaları ve zorluk"): arkada boş dükkan, solda düğmeler.

var devam: Button
var devam_bilgi: Label
var yeni: Button
var yukle: Button
var akis_d: Button
var surum: Label
var tampon := ""
var dokunuslar: Array = []


func _ready() -> void:
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var dk: Node3D = load(Flow.DUKKAN).instantiate()
	dk.menu_modu = true
	add_child(dk)

	var katman := CanvasLayer.new()
	add_child(katman)
	var kok := Control.new()
	kok.set_anchors_preset(Control.PRESET_FULL_RECT)
	kok.theme = Tema.olustur()
	kok.mouse_filter = Control.MOUSE_FILTER_IGNORE
	katman.add_child(kok)

	var golge := ColorRect.new()
	golge.color = Color(0.1, 0.06, 0.03, 0.62)
	golge.anchor_bottom = 1.0
	golge.offset_right = 430
	golge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	kok.add_child(golge)

	var v := VBoxContainer.new()
	v.position = Vector2(56, 0)
	v.anchor_top = 0.5
	v.anchor_bottom = 0.5
	v.offset_top = -230
	v.custom_minimum_size.x = 320
	v.add_theme_constant_override("separation", 12)
	kok.add_child(v)
	v.add_child(Tema.yazi("CoffeBean", 54, Tema.KREM, true))
	v.add_child(Tema.yazi("Kendi kahve dükkanın", 20, Color(Tema.KREM, 0.75)))
	var bosluk := Control.new()
	bosluk.custom_minimum_size.y = 18
	v.add_child(bosluk)

	devam = Tema.dugme("Devam", "ana", 320)
	devam.pressed.connect(func():
		var i := SaveSystem.en_son()
		if i > 0:
			Flow.oyunu_baslat(SaveSystem.oku(i), i))
	v.add_child(devam)
	devam_bilgi = Tema.yazi("", 15, Color(Tema.KREM, 0.8))
	v.add_child(devam_bilgi)
	yeni = Tema.dugme("Yeni oyun", "", 320)
	yeni.pressed.connect(func(): Flow.yuvalar("yeni", yenile))
	v.add_child(yeni)
	yukle = Tema.dugme("Yükle", "", 320)
	yukle.pressed.connect(func(): Flow.yuvalar("yukle", yenile))
	v.add_child(yukle)
	akis_d = Tema.dugme("Akış testi", "", 320)
	akis_d.pressed.connect(Flow.akis_testleri)
	v.add_child(akis_d)
	var ayar := Tema.dugme("Ayarlar", "", 320)
	ayar.pressed.connect(Flow.ayarlar)
	v.add_child(ayar)
	var cik := Tema.dugme("Çıkış", "", 320)
	cik.pressed.connect(Flow.cikis)
	v.add_child(cik)

	surum = Tema.yazi("Sürüm %s · %d tarif" % [ProjectSettings.get_setting("application/config/version"), Content.tarif_sayisi()], 15, Color(Tema.KREM, 0.6))
	if not Content.sorunlar.is_empty():
		surum.text += " · içerikte %d sorun" % Content.sorunlar.size()
		surum.add_theme_color_override("font_color", Color("e0705f"))
	surum.autowrap_mode = TextServer.AUTOWRAP_OFF
	surum.anchor_top = 1.0
	surum.anchor_bottom = 1.0
	surum.offset_left = 56
	surum.offset_top = -44
	surum.mouse_filter = Control.MOUSE_FILTER_STOP
	surum.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			var simdi := Time.get_ticks_msec()
			dokunuslar = dokunuslar.filter(func(x): return simdi - x < 700)
			dokunuslar.append(simdi)
			if dokunuslar.size() >= 3:
				dokunuslar = []
				_hile())
	kok.add_child(surum)
	yenile()


## Hile modu (T9): menüde "cheat" yazınca ya da sürüm yazısına 3 kez tıklayınca açılır / kapanır.
func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and not e.echo and e.unicode > 0 and Flow.yigin.is_empty():
		tampon = (tampon + char(e.unicode).to_lower()).right(5)
		if tampon == "cheat":
			tampon = ""
			_hile()


func _hile() -> void:
	Settings.hile_degistir()
	yenile()


## Devam yalnız yüklenebilir kayıt varsa görünür ve ana düğmedir; yoksa Yeni oyun ana düğmedir.
func yenile() -> void:
	var i := SaveSystem.en_son()
	devam.visible = i > 0
	devam_bilgi.visible = i > 0
	if i > 0:
		var x := SaveSystem.oku(i)
		devam_bilgi.text = "Yuva %d · %s · Gün %d · ₺%s" % [i, GameState.hafta_gunu(x.day), x.day, GameState.tl(x.money)]
	var r := Tema.DUGME if i > 0 else Tema.ANA
	yeni.add_theme_stylebox_override("normal", Tema.kutu(r))
	yeni.add_theme_stylebox_override("hover", Tema.kutu(r.lightened(0.1) if i == 0 else Tema.DUGME_UST))
	yeni.add_theme_stylebox_override("pressed", Tema.kutu(r.darkened(0.1)))
	for k in ["font_color", "font_hover_color", "font_pressed_color"]:
		yeni.add_theme_color_override(k, Tema.KAHVE if i > 0 else Tema.KREM)
	yukle.disabled = not SaveSystem.herhangi()
	akis_d.visible = Settings.hile_acik
	surum.text = "Sürüm %s · %d tarif" % [ProjectSettings.get_setting("application/config/version"), Content.tarif_sayisi()]
	if not Content.sorunlar.is_empty():
		surum.text += " · içerikte %d sorun" % Content.sorunlar.size()
	if Settings.hile_acik:
		surum.text += " · hile açık"
