extends "res://dukkan/gorunus.gd"
## Dokunmatik kontroller (tasarım belgesi "Dokunmatik kontroller (Faz 7)").

const CUBUK_R := 90.0
const E_R := 78.0
const KUCUK_R := 46.0

var dk_katman: CanvasLayer
var dk_cizim: Control
var dk_cubuk := -1                         ## çubuğu tutan parmak
var dk_cubuk_m := Vector2.ZERO             ## çubuğun merkezi (dokunulan yer)
var dk_cubuk_p := Vector2.ZERO
var dk_bakis := -1                         ## bakan parmak
var dk_e := -1                             ## E'yi basılı tutan parmak
var dk_fare_e: Array = []                  ## interact eyleminin fare olayları (dokunmatikte kaldırılır)


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	dk_katman = CanvasLayer.new()
	dk_katman.layer = 30
	add_child(dk_katman)
	dk_cizim = Control.new()
	dk_cizim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dk_cizim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dk_cizim.draw.connect(_dk_ciz)
	dk_katman.add_child(dk_cizim)
	for ev in InputMap.action_get_events("interact"):
		if ev is InputEventMouseButton:
			dk_fare_e.append(ev)
	dokunmatik_uygula()


## Ayar değişince (Ayarlar penceresi) ve açılışta.
func dokunmatik_uygula() -> void:
	dokunmatik = Settings.dokunmatik_acik()
	for ev in dk_fare_e:
		if dokunmatik and InputMap.action_has_event("interact", ev):
			InputMap.action_erase_event("interact", ev)
		elif not dokunmatik and not InputMap.action_has_event("interact", ev):
			InputMap.action_add_event("interact", ev)
	_dk_birak()
	if dk_katman:
		dk_katman.visible = dokunmatik


func _exit_tree() -> void:
	# fare tıklaması bir sonraki sahnede yine eylem olsun
	for ev in dk_fare_e:
		if not InputMap.action_has_event("interact", ev):
			InputMap.action_add_event("interact", ev)


func _dk_oyunda() -> bool:
	return dokunmatik and Flow.yigin.is_empty() and not get_tree().paused


func _dk_birak() -> void:
	dk_cubuk = -1
	dk_bakis = -1
	dok_yon_sifirla()
	if dk_e >= 0:
		dk_e = -1
		Input.action_release("interact")


func dok_yon_sifirla() -> void:
	dokun_yon = Vector2.ZERO


# ---------- yerleşim ----------
func _dk_cubuk_yeri() -> Vector2:
	var s := get_viewport().get_visible_rect().size
	return Vector2(150, s.y - 150)


func _dk_e_yeri() -> Vector2:
	var s := get_viewport().get_visible_rect().size
	return Vector2(s.x - 130, s.y - 140)


func _dk_tamam_yeri() -> Vector2:
	return _dk_e_yeri() + Vector2(-20, -150)


func _dk_kasik_yeri() -> Vector2:
	return _dk_e_yeri() + Vector2(-130, -70)


func _dk_menu_yeri() -> Vector2:
	var s := get_viewport().get_visible_rect().size
	return Vector2(s.x - 56, 140)


func _dk_tamam_var() -> bool:
	return mode in ["dose", "wdt"]


func _dk_kasik_var() -> bool:
	return mode == "dose"


# ---------- dokunuşlar ----------
func _input(event: InputEvent) -> void:
	if dokunmatik and event is InputEventMouse and event.device == InputEvent.DEVICE_ID_EMULATION:
		return                                   # dokunuştan türeyen fare: bakış/eylem yapmaz (pencereler yine alır)
	if dokunmatik and (event is InputEventScreenTouch or event is InputEventScreenDrag):
		if not _dk_oyunda():
			_dk_birak()
			return
		if event is InputEventScreenTouch:
			_dk_dokun(event)
		else:
			_dk_surukle(event)
		dk_cizim.queue_redraw()
		return
	super._input(event)


func _dk_dokun(t: InputEventScreenTouch) -> void:
	var p := t.position
	if t.pressed:
		if p.distance_to(_dk_e_yeri()) <= E_R:
			dk_e = t.index
			Input.action_press("interact")
		elif _dk_tamam_var() and p.distance_to(_dk_tamam_yeri()) <= KUCUK_R:
			_dk_tus(KEY_SPACE)
		elif _dk_kasik_var() and p.distance_to(_dk_kasik_yeri()) <= KUCUK_R:
			_dk_tus(KEY_R)
		elif p.distance_to(_dk_menu_yeri()) <= 36.0:
			_dk_birak()
			Flow.oyun_ici_menu()
		elif p.distance_to(_dk_cubuk_yeri()) <= CUBUK_R * 1.8 and dk_cubuk < 0:
			dk_cubuk = t.index
			dk_cubuk_m = p
			dk_cubuk_p = p
		elif dk_bakis < 0:
			dk_bakis = t.index
	else:
		if t.index == dk_e:
			dk_e = -1
			Input.action_release("interact")
		elif t.index == dk_cubuk:
			dk_cubuk = -1
			dok_yon_sifirla()
		elif t.index == dk_bakis:
			dk_bakis = -1


func _dk_surukle(d: InputEventScreenDrag) -> void:
	if d.index == dk_cubuk:
		dk_cubuk_p = d.position
		var v := (dk_cubuk_p - dk_cubuk_m).limit_length(CUBUK_R)
		dokun_yon = v / CUBUK_R
	elif d.index == dk_bakis:
		dokun_bak(d.relative)


## Parmakla kaydırma, fare hareketiyle aynı işi yapar (fp.gd _input, fp_v3 buhar).
func dokun_bak(rel: Vector2) -> void:
	match mode:
		"steam":
			tip_depth = clamp(tip_depth + rel.y * 0.12, -12.0, 60.0)
		"wdt":
			wdt_cursor = (wdt_cursor + rel * 0.9).limit_length(150.0)
		"tamp":
			bubble_pos -= rel * 0.8
		"lock":
			lock_px += max(rel.x, 0.0)
		"":
			yaw -= rel.x * 0.0025 * Settings.fare
			pitch = clamp(pitch - rel.y * 0.0025 * Settings.fare, -1.3, 1.2)
			apply_look()


func _dk_tus(k: Key) -> void:
	var ev := InputEventKey.new()
	ev.keycode = k
	ev.physical_keycode = k
	ev.pressed = true
	Input.parse_input_event(ev)
	var ev2 := ev.duplicate() as InputEventKey
	ev2.pressed = false
	Input.parse_input_event(ev2)


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu or dk_katman == null:
		return
	var gor := _dk_oyunda()
	if dk_cizim.visible != gor:
		dk_cizim.visible = gor
		if not gor:
			_dk_birak()
	if gor:
		dk_cizim.queue_redraw()


# ---------- çizim ----------
func _dk_ciz() -> void:
	var c := dk_cizim
	var f := c.get_theme_default_font()
	var cm := _dk_cubuk_yeri() if dk_cubuk < 0 else dk_cubuk_m
	c.draw_circle(cm, CUBUK_R, Color(1, 1, 1, 0.16))
	c.draw_arc(cm, CUBUK_R, 0, TAU, 48, Color(1, 1, 1, 0.45), 3.0)
	var top := cm if dk_cubuk < 0 else cm + (dk_cubuk_p - dk_cubuk_m).limit_length(CUBUK_R)
	c.draw_circle(top, 34.0, Color(1, 1, 1, 0.5))
	_dk_dugme(_dk_e_yeri(), E_R, "E", dk_e >= 0, f, 44)
	if _dk_tamam_var():
		_dk_dugme(_dk_tamam_yeri(), KUCUK_R, "Tamam", false, f, 18)
	if _dk_kasik_var():
		_dk_dugme(_dk_kasik_yeri(), KUCUK_R, "Kaşık", false, f, 18)
	_dk_dugme(_dk_menu_yeri(), 30.0, "☰", false, f, 26)


func _dk_dugme(m: Vector2, r: float, yazi: String, basili: bool, f: Font, boy: int) -> void:
	var c := dk_cizim
	c.draw_circle(m, r, Color(0.36, 0.22, 0.12, 0.75 if basili else 0.5))
	c.draw_arc(m, r, 0, TAU, 48, Color(1, 0.96, 0.88, 0.8), 3.0)
	var g := f.get_string_size(yazi, HORIZONTAL_ALIGNMENT_LEFT, -1, boy)
	c.draw_string(f, m + Vector2(-g.x * 0.5, g.y * 0.3), yazi, HORIZONTAL_ALIGNMENT_LEFT, -1, boy, Color(1, 0.96, 0.88))
