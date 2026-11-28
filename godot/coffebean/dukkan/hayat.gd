extends "res://dukkan/dersler.gd"
## Dükkan hayatı: oturan müşteriler ve kirli fincanlar (tasarım belgesi "Dükkan hayatı (Faz 5)").

## [oturak yeri, yüz yönü (rad), masadaki fincan yeri, en düşük dükkan seviyesi]
const OTURAKLAR := [
	[Vector3(1.7, 0, -0.45), 0.0, Vector3(1.7, 0.58, 0.05), 0],
	[Vector3(2.45, 0, 0.35), -PI / 2, Vector3(2.05, 0.58, 0.35), 0],
	[Vector3(0.95, 0, 0.35), PI / 2, Vector3(1.35, 0.58, 0.35), 0],
	[Vector3(1.8, 0, 2.6), PI / 2, Vector3(2.55, 0.46, 2.6), 0],
	[Vector3(3.55, 0, 2.6), -PI / 2, Vector3(2.95, 0.46, 2.6), 0],
	[Vector3(3.5, 0, -0.45), 0.0, Vector3(3.5, 0.58, 0.05), 1],
	[Vector3(3.5, 0, 1.05), PI, Vector3(3.5, 0.58, 0.55), 1],
]

var oturanlar: Array = []                  ## {node, i, t, durum, fincan}
var kirli := {}                            ## oturak → {fincan, govde}


func _oturak_bos(i: int) -> bool:
	if kirli.has(i) or int(OTURAKLAR[i][3]) > int(GameState.S.get("shopLevel", 0)):
		return false
	for o in oturanlar:
		if o.i == i:
			return false
	return true


func _servis_sonrasi(m: Dictionary, tutar: int, bahsis: int, servis: int) -> void:
	super._servis_sonrasi(m, tutar, bahsis, servis)
	m.odedi = true


func _cikar(m: Dictionary) -> void:
	var ct: Dictionary = _D().customers.get(m.tip, {})
	if m.get("odedi", false) and not m.get("paket", false) and not ct.get("special", false) and not m.get("ogretici", false) \
			and acik and not bitti and rng.randf() < 0.5:
		var bos: Array = []
		for i in OTURAKLAR.size():
			if _oturak_bos(i):
				bos.append(i)
		if not bos.is_empty():
			m.cubuk.visible = false
			m.etiket.visible = false
			oturanlar.append({"node": m.node, "i": bos[rng.randi() % bos.size()], "t": rng.randf_range(20.0, 40.0), "durum": "yuru", "fincan": null, "boy": m.get("siparis", "double")})
			return
	super._cikar(m)


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu:
		return
	for o in oturanlar.duplicate():
		var O: Array = OTURAKLAR[o.i]
		match o.durum:
			"yuru":
				if walk_to(o.node, O[0], delta):
					o.node.rotation.y = O[1]
					var ap: AnimationPlayer = o.node.get_meta("ap")
					if ap.has_animation("cb/sit"):
						ap.play("cb/sit", 0.3)
					o.fincan = make_cup(self, o.boy, 0.8)
					o.fincan.position = O[2]
					o.durum = "otur"
			"otur":
				o.t -= delta
				if o.t <= 0.0:
					_kalk(o)


func _kalk(o: Dictionary) -> void:
	oturanlar.erase(o)
	var ap: AnimationPlayer = o.node.get_meta("ap")
	ap.play("cb/idle", 0.3)
	if o.fincan:
		var top := (o.fincan as Node3D).get_node_or_null("Top")
		if top:
			top.queue_free()
		kirli[o.i] = {"fincan": o.fincan, "govde": collider(OTURAKLAR[o.i][2] + Vector3(0, 0.05, 0), Vector3(0.14, 0.12, 0.14), "kirli_%d" % o.i)}
	cikanlar.append(o.node)


func action_text(id: String) -> String:
	if id.begins_with("kirli_") and mode == "":
		return "E: Fincanı topla" if held_kind == "" else "Önce elindekini bırak"
	return super.action_text(id)


func interact(id: String) -> void:
	if id.begins_with("kirli_"):
		if action_text(id).begins_with("E"):
			_topla(int(id.substr(6)))
		return
	super.interact(id)


func _topla(i: int) -> void:
	if not kirli.has(i):
		return
	kirli[i].fincan.queue_free()
	kirli[i].govde.queue_free()
	kirli.erase(i)
	Ses.sfx("click")
	prompt_flash("Fincan toplandı")


func _gun_bitti() -> void:
	super._gun_bitti()
	for o in oturanlar.duplicate():
		if o.fincan:
			o.fincan.queue_free()
			o.fincan = null
		oturanlar.erase(o)
		(o.node.get_meta("ap") as AnimationPlayer).play("cb/idle", 0.3)
		cikanlar.append(o.node)
	for i in kirli.keys():
		_topla(i)
