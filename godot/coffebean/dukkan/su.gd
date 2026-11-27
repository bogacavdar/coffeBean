extends "res://dukkan/sesler.gd"
## Sıcak su musluğu: americano ve long black (tasarım belgesi "Espresso ve süt ailesi: 17 tarif (Faz 3a)").

const SU_POS := Vector3(-2.14, 1.0, -1.05)
const SU_HIZ := 0.25                       ## fincanın %25'i / sn

var su_tamam := false
var su_dolu := 0.0
var su_basla := 0.0
var su_fincan: Node3D


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	# musluk: makinenin sağ yanından çıkan krom boru ve altında ızgara
	var boru := cyl(self, SU_POS + Vector3(0, 0.27, 0.02), 0.009, 0.08, Color.WHITE)
	boru.material_override = chrome()
	var dirsek := cyl(self, SU_POS + Vector3(0, 0.31, -0.03), 0.009, 0.1, Color.WHITE)
	dirsek.material_override = chrome()
	dirsek.rotation_degrees.x = 90
	var izgara := mrbox(self, SU_POS + Vector3(0, 0.006, 0), Vector3(0.13, 0.012, 0.13), chrome(), 0.004)
	izgara.name = "SuIzgara"
	collider(SU_POS + Vector3(0, 0.15, 0), Vector3(0.14, 0.3, 0.14), "su")


func su_gerek() -> bool:
	return siparis_tarif != "" and "water" in _tarif().get("steps", [])


func _once_su() -> bool:
	return su_gerek() and (_tarif().steps as Array).find("water") < (_tarif().steps as Array).find("extract")


func _siparis_al(m: Dictionary) -> void:
	super._siparis_al(m)
	su_tamam = false


func action_text(id: String) -> String:
	if id == "su" and mode == "":
		if not su_gerek() or su_tamam:
			return ""
		if _once_su():
			if held_kind == "cup":
				return "E: Sıcak su koy"
			if held_kind == "cup_full":
				return "Long black'te su önce konur"
			return "Önce boş bir fincan al"
		if held_kind == "cup_full":
			return "E: Sıcak su ekle"
		return "Americano'da önce espresso, sonra su"
	if su_gerek() and not su_tamam:
		if id == "machine" and stage == "locked" and held_kind == "cup" and _once_su():
			return "Önce fincana sıcak su koy (makinenin sağındaki musluk)"
		if id == "customer" and stage == "cup_taken" and cstate == "wait" and not _once_su():
			return "Önce sıcak su ekle (makinenin sağındaki musluk)"
	return super.action_text(id)


func interact(id: String) -> void:
	if id == "su":
		if action_text(id).begins_with("E"):
			_su_basla()
		return
	super.interact(id)


func _su_basla() -> void:
	var tur := held_kind
	drop_held()
	su_basla = 0.0 if _once_su() else 0.3
	su_dolu = su_basla
	su_fincan = make_cup(self, cup_size, su_dolu)
	su_fincan.position = SU_POS + Vector3(0, 0.012, 0)
	su_fincan.set_meta("tur", tur)
	open_panel("water", "Sıcak su")
	view_at(SU_POS + Vector3(-0.05, 0.38, -0.42), SU_POS + Vector3(0, 0.08, 0))


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu or mode != "water":
		return
	var basili := Input.is_action_pressed("interact")
	Ses.dongu("pour", basili)
	if basili:
		su_dolu += SU_HIZ * delta
		var top: Node3D = su_fincan.get_node_or_null("Top")
		var h := cup_dims(cup_size).y
		if top == null:
			top = cyl(su_fincan, Vector3.ZERO, cup_dims(cup_size).x * 0.8, 0.006, Color("8a5a35"), 0.2)
			top.name = "Top"
		top.position.y = 0.012 + h * minf(su_dolu, 1.0) * 0.9
		if su_dolu >= 1.15:
			_su_bitir()
			return
	elif su_dolu > su_basla + 0.02:
		_su_bitir()
		return
	panel_text.text = "E basılı: su ver · fincan %%%d dolu · bırakınca biter" % int(minf(su_dolu, 1.2) * 100)


func _su_bitir() -> void:
	Ses.dongu("pour", false)
	var f := su_dolu
	var sc: float
	if _once_su():
		sc = 100.0 if f >= 0.6 and f <= 0.75 else (88.0 if f >= 0.5 and f <= 0.85 else 72.0)
	else:
		sc = 100.0 if f >= 0.9 and f <= 1.0 else (88.0 if f >= 0.8 and f <= 1.05 else 72.0)
	var tur: String = su_fincan.get_meta("tur", "cup")
	su_fincan.queue_free()
	su_fincan = null
	su_tamam = true
	hold(tur, cup_size)
	close_panel(sc, "Sıcak su: " + ("taştı!" if f > 1.05 else "%%%d dolu" % int(f * 100)))
	view_home()
