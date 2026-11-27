extends "res://dukkan/musteri.gd"
## Yardımcı barista (tasarım belgesi §4 "Yardımcı barista (taşıma adımı T16)"); web assistantTick, staff.

const YARDIMCI_POS := Vector3(-3.0, 0, -1.95)

var yardimci_node: Node3D
var hazirlik: Dictionary = {}                   ## {m, t, yazi}


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	_yardimci_goster()


func calisiyor() -> bool:
	return GameState.S.get("staff", {}).get("assistant", false)


func _yardimci_goster() -> void:
	if calisiyor() and yardimci_node == null:
		yardimci_node = make_avatar("Male_Adult_09")
		yardimci_node.position = YARDIMCI_POS
		yardimci_node.rotation.y = 0.0
		add_child(yardimci_node)
	elif not calisiyor() and yardimci_node != null:
		yardimci_node.queue_free()
		yardimci_node = null


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu or not calisiyor() or not acik or bitti or ogretici_aktif:
		return
	if hazirlik.is_empty():
		_is_al()
		return
	var m: Dictionary = hazirlik.m
	if not m in sira:
		_is_birak()
		return
	hazirlik.t = float(hazirlik.t) + delta
	if float(hazirlik.t) >= float(_D().staff.assistant.prepTime):
		_is_bitir()


## Sırada bekleyen (kasadaki değil) ilk sütsüz siparişi alır; çekirdek ve bardak yetmiyorsa almaz.
func _is_al() -> void:
	var S := GameState.S
	for m in sira:
		if m.durum != "sirada" or m.get("ogretici", false) or "milk" in Content.tarif(m.tarif).steps:
			continue
		var bardak: String = _boy(m.boy).cup
		if cekirdek(S.get("bean", "brazil")) < _cekirdek_kg(m.tarif, m.boy) or int(S.cups.get(bardak, 0)) <= 0:
			return
		S.cups[bardak] = int(S.cups[bardak]) - 1
		m.durum = "yardimci"
		m.yardimci = true
		m.cubuk.visible = false
		var l := Label3D.new()
		l.text = "Yardımcı hazırlıyor"
		l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		l.font_size = 30
		l.pixel_size = 0.0018
		l.outline_size = 10
		l.modulate = Color("f6efe3")
		l.outline_modulate = Color("2e2016")
		l.position = Vector3(0, 2.12, 0)
		m.node.add_child(l)
		hazirlik = {"m": m, "t": 0.0, "yazi": l}
		return


func _is_birak() -> void:
	if hazirlik.has("yazi") and is_instance_valid(hazirlik.yazi):
		hazirlik.yazi.queue_free()
	hazirlik = {}


func _is_bitir() -> void:
	var m: Dictionary = hazirlik.m
	_is_birak()
	_harca(m)
	m.durum = "servis"
	_odeme(m, float(_D().staff.assistant.score), true)
	sira.erase(m)
	ist.hizmet += 1
	_cikar(m)


## Yardımcının aldığı müşterinin sabrı durur (web: sipariş verilmiş sayılır).
func _sabir(delta: float) -> void:
	var bekleyen: Array = []
	for m in sira:
		if m.durum == "yardimci":
			bekleyen.append([m, m.sabir])
	super._sabir(delta)
	for b in bekleyen:
		b[0].sabir = b[1]


# ---------- maaş ----------
func _gun_bitti() -> void:
	super._gun_bitti()
	if calisiyor():
		var S := GameState.S
		var w := int(_D().staff.assistant.wage)
		S.money = float(S.money) - w
		son.L.wage = w
		S.endPending = son
		SaveSystem.yaz(GameState.yuva, S)


# ---------- Dükkan › Geliştirmeler › Personel ----------
func _gelistirmeler(v: VBoxContainer, yildiz: int, yenile: Callable) -> void:
	super._gelistirmeler(v, yildiz, yenile)
	var A: Dictionary = _D().staff.assistant
	if int(A.stars) > yildiz:
		return
	var S := GameState.S
	var ic := _dukkan_bolum(v, "Personel", "")
	var b := Tema.dugme("Çıkar" if calisiyor() else "İşe al", "" if calisiyor() else "ana")
	b.pressed.connect(func():
		if not S.has("staff"):
			S.staff = {}
		S.staff.assistant = not calisiyor()
		if calisiyor():
			S.log.append("Gün %d: yardımcı barista işe alındı" % int(S.day))
		SaveSystem.yaz(GameState.yuva, S)
		_yardimci_goster()
		flash = "Yardımcı barista işe alındı" if calisiyor() else "Yardımcı barista çıkarıldı"
		yenile.call())
	_dukkan_satir(ic, A.name, "%s (%d puan) · günlük maaş ₺%s" % [A.effect, int(A.score), GameState.tl(A.wage)], "", b)
