extends "res://dukkan/soguk.gd"
## Sipariş değiştiricileri: ekstra shot ve paket servis (tasarım belgesi "Ekstra shot, paket servis ve iki otomatik makine (Faz 3h)").

const KAPAK_POS := Vector3(-0.66, 0.96, -0.74)

var shot_sayi := 0
var son_stage := ""
var kapak_tamam := false
var ekstra_bekliyor := false               ## ilk shot çekildi, fincan tepside ikinci shotu bekliyor


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	var yigin := Node3D.new()
	yigin.position = KAPAK_POS
	add_child(yigin)
	for i in 6:
		cyl(yigin, Vector3(0, 0.04 + i * 0.008, 0), 0.05, 0.006, Color("efe3c8"), 0.8)
	cyl(yigin, Vector3(0, 0.02, 0), 0.052, 0.04, Color("8a5a35"), 0.9)
	collider(KAPAK_POS + Vector3(0, 0.05, 0), Vector3(0.12, 0.12, 0.12), "kapak")


func _musteri_getir() -> void:
	var once := sira.size()
	super._musteri_getir()
	if sira.size() <= once:
		return
	var m: Dictionary = sira.back()
	var M: Dictionary = _D().mods
	if int(GameState.S.day) < int(M.fromDay) or m.tip == "jury" or m.get("ogretici", false):
		return
	var d: Dictionary = Content.tarif(m.tarif)
	var ekler: Array = []
	if "extract" in d.steps and rng.randf() < float(M.extraChance):
		m.ekstra = true
		ekler.append("Ekstra shot olsun.")
	if String(_D().sizes[m.boy].cup).begins_with("cup") and rng.randf() < float(M.takeawayChance):
		m.paket = true
		ekler.append("Paket alayım.")
	if not ekler.is_empty():
		m.metin = String(m.metin) + " " + " ".join(ekler)


func _siparis_al(m: Dictionary) -> void:
	super._siparis_al(m)
	shot_sayi = 0
	son_stage = stage
	kapak_tamam = false
	ekstra_bekliyor = false
	var ek: Array = []
	if m.get("ekstra", false):
		ek.append("+ ekstra shot")
	if m.get("paket", false):
		ek.append("+ paket")
	if not ek.is_empty():
		siparis_adi = String(siparis_adi) + " " + " ".join(ek)
		ders("extras")


func _on() -> Dictionary:
	return sira[0] if not sira.is_empty() and sira[0].durum == "siparis" else {}


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu:
		return
	if stage == "pulled" and son_stage != "pulled":
		shot_sayi += 1
	son_stage = stage


func action_text(id: String) -> String:
	var m := _on()
	if not m.is_empty() and mode == "":
		if m.get("ekstra", false) and shot_sayi == 1 and id == "machine" and held_kind == "":
			if stage == "pulled":
				return "E: Portafiltreyi çıkar (ekstra shot; fincan tepside kalır)"
			if stage == "locked" and ekstra_bekliyor:
				return "E: Ekstra shotu aynı fincana hazırla"
		if m.get("ekstra", false) and shot_sayi == 1 and id.begins_with("cup_") and ekstra_bekliyor:
			return "Fincan tepside bekliyor"
		if id == "kapak":
			if not m.get("paket", false):
				return "Bu sipariş paket değil"
			if kapak_tamam:
				return "Kapak takıldı"
			if held_kind == "cup_full":
				return "E: Kapak ve zırf tak"
			return "Önce kahveyi hazırla"
	elif id == "kapak":
		return ""
	return super.action_text(id)


func interact(id: String) -> void:
	var t := action_text(id)
	if t.begins_with("E: Portafiltreyi çıkar (ekstra"):
		if locked_pf:
			locked_pf.queue_free()
			locked_pf = null
		steam.emitting = false
		hold("pf_used", held_size)
		stage = "used"
		ekstra_bekliyor = true
		return
	if t == "E: Ekstra shotu aynı fincana hazırla":
		stage = "cup_on"
		ekstra_bekliyor = false
		return
	if t == "E: Kapak ve zırf tak":
		kapak_tamam = true
		if held:
			var d := cup_dims(cup_size)
			cyl(held, Vector3(0, -0.06 + 0.012 + d.y + 0.004, 0), d.x + 0.004, 0.012, Color("efe3c8"), 0.8)
			cyl(held, Vector3(0, -0.06 + 0.012 + d.y * 0.5, 0), d.x + 0.006, d.y * 0.4, Color("8a5a35"), 0.9)
		Ses.sfx("click")
		prompt_flash("Paket: kapak ve zırf takıldı")
		return
	super.interact(id)


## Unutulan ekstra shot ya da kapak web'deki gibi yanlış sipariştir.
func serve() -> void:
	var m := _on()
	if not m.is_empty() and not m.get("yardimci", false):
		if m.get("ekstra", false) and shot_sayi < 2:
			wrong = true
		if m.get("paket", false) and not kapak_tamam:
			wrong = true
	super.serve()


func _ek_ucret(m: Dictionary, tutar: int) -> int:
	var t := super._ek_ucret(m, tutar)
	if m.get("ekstra", false):
		t = roundi(t * (1.0 + float(_D().mods.extraPrice)))
	if m.get("paket", false):
		t += int(_D().mods.takeawayFee)
	return t


func _harca(m: Dictionary) -> void:
	super._harca(m)
	if m.get("ekstra", false):
		var S := GameState.S
		var cek: String = S.get("bean", "brazil")
		if S.beans.has(cek):
			S.beans[cek].kg = maxf(0.0, float(S.beans[cek].kg) - float(_D().mods.extraBean))
