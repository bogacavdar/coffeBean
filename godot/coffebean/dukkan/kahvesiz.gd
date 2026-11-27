extends "res://dukkan/cezve.gd"
## Kahvesiz ve önce sütlü tarifler: süsleme minderinde süt dökme (tasarım belgesi "Kahvesiz ve önce sütlü tarifler (Faz 3d)").

var mat_dokme := false                     ## süt şu an minderdeki fincana dökülüyor
var once_placed: Node3D


## Espressosuz tarif (sıcak çikolata, chai, salep).
func bagimsiz() -> bool:
	return siparis_tarif != "" and not "extract" in _tarif().get("steps", []) and not cezve_siparis()


## Süt espressodan önce (latte macchiato, karamel macchiato).
func sutlu_once() -> bool:
	if siparis_tarif == "":
		return false
	var st: Array = _tarif().get("steps", [])
	return "milk" in st and "extract" in st and st.find("milk") < st.find("extract")


func _serbest() -> bool:
	return bagimsiz() or sutlu_once()


func action_text(id: String) -> String:
	if _serbest() and mode == "":
		if id.begins_with("cup_") and held_kind == "" and stage != "locked" and mat_fincan == null:
			return "E: %s fincanı al" % size_name(id.substr(4)).capitalize()
		if id == "milk" and held_kind == "" and milk_state == "none":
			return "E: Süt sürahisini al"
		if id == "sus_mat" and held_kind == "pitcher" and milk_state == "steamed":
			if mat_fincan == null:
				return "Önce fincanı süsleme minderine koy"
			for x in _eksik(true):
				if int(pompa.get(x.k, 0)) == 0:
					return "Önce şurubu pompala"
			return "E basılı tut: Sütü fincana dök"
		if sutlu_once() and id == "machine" and stage == "locked" and held_kind == "cup_full" and milk_state == "poured":
			return "E: Sütlü fincanı tepsiye koy"
		if sutlu_once() and id == "machine" and stage == "locked" and held_kind == "cup":
			return "Önce süt: fincanı süsleme minderine koy, sütü dök"
		if bagimsiz() and id == "customer" and cstate == "wait":
			if held_kind != "cup_full":
				return "Sipariş: %s · %s fincan" % [siparis_adi, FINCAN_AD.get(order_size, order_size)]
			if not _eksik(false).is_empty():
				var adlar: Array = []
				for x in _eksik(false):
					adlar.append(String(x.ad).to_lower())
				return "Önce süslemeyi bitir: " + ", ".join(adlar)
			return "E: Kahveyi ver"
	return super.action_text(id)


func interact(id: String) -> void:
	if _serbest() and mode == "":
		var t := action_text(id)
		if id.begins_with("cup_") and t.begins_with("E"):
			cup_size = id.substr(4)
			if cup_size != order_size:
				wrong = true
			hold("cup", cup_size)
			return
		if id == "sus_mat" and t == "E basılı tut: Sütü fincana dök":
			_pompalari_bitir()
			if mat_fincan.get_node_or_null("Top") == null:
				var top := cyl(mat_fincan, Vector3(0, 0.014, 0), cup_dims(cup_size).x * 0.8, 0.006, Color("8a5a35"), 0.2)
				top.name = "Top"
			once_placed = placed_cup
			placed_cup = mat_fincan
			dokme_yer = MAT_POS
			mat_dokme = true
			start_pour()
			view_at(MAT_POS + Vector3(0.0, 0.42, 0.52), MAT_POS + Vector3(0, 0.05, 0))
			return
		if id == "machine" and t == "E: Sütlü fincanı tepsiye koy":
			drop_held()
			placed_cup = make_cup(self, cup_size, 0.8)
			placed_cup.position = CUP_POS + Vector3(0, 0.005, 0)
			stage = "cup_on"
			return
	super.interact(id)


func finish_pour() -> void:
	super.finish_pour()
	if mat_dokme:
		mat_dokme = false
		mat_tur = "cup_full"
		placed_cup = once_placed
		once_placed = null
		dokme_yer = CUP_POS


func serve() -> void:
	if not bagimsiz():
		super.serve()
		return
	var st := stage
	super.serve()
	stage = st
