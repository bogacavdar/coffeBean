extends "res://dukkan/dokunmatik.gd"
## Usta görünümü ve titreşim (tasarım belgesi "Usta görünümü ve titreşim").

var us_alfa := -1.0                        ## son uygulanan görünürlük
var us_puan_sayi := 0
var us_ogut_t := 0.0


## Çırak tam, Barista %55, Kıdemli barista %20; ayar açıksa hep tam.
func bolge_alfa() -> float:
	if Settings.tam_bolge or menu_modu:
		return 1.0
	var adlar: Array = []
	for r in _D().ranks:
		adlar.append(r.name)
	var i := adlar.find(rutbe().name)
	return 0.2 if i >= 2 else (0.55 if i == 1 else 1.0)


func _us_uygula(a: float) -> void:
	us_alfa = a
	var kumeler: Array = [tray_zones, olcek_bolge, dm_bolge, sb_bolge, level_rings]
	for kume in kumeler:
		for z in kume:
			if z == null or not is_instance_valid(z):
				continue
			var m := (z as MeshInstance3D).material_override as StandardMaterial3D
			if m == null:
				continue
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA if a < 1.0 else BaseMaterial3D.TRANSPARENCY_DISABLED
			m.albedo_color.a = a
			m.emission_energy_multiplier = (0.5 if kume == level_rings else 0.4) * a
	for z in gauge_zones:
		z.modulate.a = a


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu:
		return
	var a := bolge_alfa()
	# temper halkaları her tutuşta yeniden kurulur; o yüzden her karede küçük bir kontrol
	if absf(a - us_alfa) > 0.001 or (mode == "tamp" and not level_rings.is_empty() and is_instance_valid(level_rings[0]) \
			and absf(((level_rings[0] as MeshInstance3D).material_override as StandardMaterial3D).albedo_color.a - a) > 0.001):
		_us_uygula(a)
	# usta görünümünde saniye gizli
	if mode == "pull" and a <= 0.25:
		panel_text.text = "Terazi %.1f g   (hedef %.0f g)\nKahvenin rengi açılınca hedefe yaklaşıyorsun · E: Durdur" % [pull_g, verim()]
		if tray_label:
			tray_label.text = "%.1f g" % pull_g
	_us_titresim(delta)


func _us_titresim(delta: float) -> void:
	if step_scores.size() < us_puan_sayi:
		us_puan_sayi = step_scores.size()
	if not (Settings.titresim and OS.has_feature("mobile")):
		us_puan_sayi = step_scores.size()
		return
	if step_scores.size() > us_puan_sayi:
		us_puan_sayi = step_scores.size()
		var sc: float = step_scores.back()
		if sc >= 100.0:
			Input.vibrate_handheld(25)
		elif sc <= 0.0:
			Input.vibrate_handheld(50)
			get_tree().create_timer(0.09).timeout.connect(func(): Input.vibrate_handheld(50))
		else:
			Input.vibrate_handheld(10)
	if mode == "dose" and Input.is_action_pressed("interact"):
		us_ogut_t += delta
		if us_ogut_t > 0.3:
			us_ogut_t = 0.0
			Input.vibrate_handheld(6)
	else:
		us_ogut_t = 0.0
