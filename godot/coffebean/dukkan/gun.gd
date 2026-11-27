extends "res://dukkan/fp_v3.gd"
## Gün döngüsü (tasarım belgesi §4 "Gün döngüsü (taşıma adımı T3)"): dükkanı açma, 150 sn'lik saat,
## müşteri gelişi ve sırası, sabır, kızıp gitme, günün bitmesi. Espresso adımları fp_v3/fp_real/fp.gd'de.

const GUN_SN := 150.0
const FP_SABIR := 2.5                     ## birinci şahıs sabır çarpanı (ilk ayar, belge: "Sabır")
const NORMAL_TIPLER := ["business", "student", "elder", "geek", "regular"]
const TABELA_POS := Vector3(-0.66, 1.0, -0.72)
const SAAT_POS := Vector3(-0.9, 2.5, -2.98)

## Godot'da yapılabilen tarifler (tasarım belgesi "Espresso ve süt ailesi: 17 tarif (Faz 3a)").
const YAPILABILIR := {"espresso": "", "lungo": "", "ristretto": "", "americano": "", "longblack": "", "macchiato": "",
	"cortado": "", "latte": "", "flatwhite": "", "piccolo": "", "melange": "", "cappuccino": "", "conleche": "",
	"gibraltar": "", "magic": "", "galao": "", "breve": ""}
## Web bardak türü → birinci şahıs fincanı; fincanların adı.
const FINCAN := {"espS": "tek", "espD": "double", "cupS": "cappuccino", "cupM": "latte", "cupL": "buyuk"}
const FINCAN_AD := {"tek": "tek espresso", "double": "double espresso", "cappuccino": "küçük", "latte": "orta", "buyuk": "büyük"}
const KOPUK := {"hot": 3.0, "micro": 20.0, "foam": 50.0, "dollop": 60.0}

var acik := false                          ## dükkan açıldı mı (tabela)
var t := 0.0                               ## gün saniyesi
var gelecek := 0                           ## bugün daha gelecek müşteri
var sonraki := 1.0                         ## bir sonraki gelişin saniyesi
var aralik := 21.5
var sira: Array = []                       ## dükkandaki müşteriler, öndeki 0: {node, tip, ad, siparis, metin, sabir, sabir_max, durum, cubuk}
var cikanlar: Array = []                   ## kapıya yürüyenler
var ist := {"hizmet": 0, "kizgin": 0, "donen": 0}
var bitti := false
var tabela: Label3D
var saat_yazi: Label3D
var saat_hud: Label
var flash := ""
var son_info := ""
var siparis_tarif := ""                    ## kasadaki siparişin tarifi ve boyu (Faz 3a)
var siparis_boy := ""
var siparis_adi := ""


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	var dk := GameState.dukkan(GameState.S.get("shopLevel", 0))
	gelecek = int(dk.customersPerDay) + int(trafik().cust) * int(dk.custStep)
	aralik = float(dk.interval) * pow(float(GameState.D.traffic.freqMult), int(trafik().freq))
	_tabela_kur()


## Bu dükkanın müşteri gelişi kademeleri (web tr(); T13).
func trafik() -> Dictionary:
	var S := GameState.S
	var t2: Dictionary = S.get("traffic", {}).get(str(int(S.get("shopLevel", 0))), {})
	return {"cust": int(t2.get("cust", 0)), "freq": int(t2.get("freq", 0))}


# ---------- sahne parçaları ----------
func _tabela_kur() -> void:
	var ayak := slab(TABELA_POS + Vector3(0, 0.09, 0), Vector3(0.22, 0.17, 0.02), mat(Color("2b1a0e"), 0.6))
	ayak.rotation_degrees.y = 25
	tabela = Label3D.new()
	tabela.text = "KAPALI"
	tabela.font_size = 40
	tabela.pixel_size = 0.0022
	tabela.modulate = Color("f6ecdc")
	tabela.outline_size = 0
	tabela.position = Vector3(0, 0, 0.012)
	ayak.add_child(tabela)
	var arka := tabela.duplicate()
	arka.position = Vector3(0, 0, -0.012)
	arka.rotation_degrees.y = 180
	ayak.add_child(arka)
	tabela.set_meta("arka", arka)
	collider(TABELA_POS + Vector3(0, 0.09, 0), Vector3(0.3, 0.25, 0.15), "tabela")
	# duvar saati: kadran + akrep/yelkovan yerine okunur dijital yazı
	var kadran := slab(SAAT_POS, Vector3(0.5, 0.22, 0.03), mat(Color("1d140d"), 0.5))
	saat_yazi = Label3D.new()
	saat_yazi.text = "08:00"
	saat_yazi.font_size = 96
	saat_yazi.pixel_size = 0.0016
	saat_yazi.modulate = Color("ffcf7a")
	saat_yazi.outline_size = 0
	saat_yazi.position = Vector3(0, 0, 0.02)
	kadran.add_child(saat_yazi)


func build_ui() -> void:
	super.build_ui()
	saat_hud = Label.new()
	saat_hud.anchor_left = 1.0
	saat_hud.anchor_right = 1.0
	saat_hud.offset_left = -420
	saat_hud.offset_right = -20
	saat_hud.offset_top = 14
	saat_hud.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	style(saat_hud, 22)
	info.get_parent().add_child(saat_hud)


func spawn_customer() -> void:
	pass                                   # müşterileri artık gün döngüsü getirir


# ---------- etkileşim: tabela ----------
func _action_text_gun(id: String) -> String:
	if id == "tabela":
		return "" if acik else "E: Dükkânı aç"
	if id == "customer" and cstate != "wait":
		return ""
	return super.action_text(id)


func interact(id: String) -> void:
	if id == "tabela":
		if not acik:
			_ac()
		return
	super.interact(id)


func _ac() -> void:
	acik = true
	tabela.text = "AÇIK"
	tabela.get_meta("arka").text = "AÇIK"
	tabela.modulate = Color("bfe3a8")
	flash = "Dükkân açıldı, ilk müşteri geliyor."


# ---------- saat ve müşteriler ----------
func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu:
		return
	if acik and not bitti:
		t += delta
		if t >= GUN_SN:
			gelecek = 0
		if gelecek > 0 and t >= sonraki:
			if _bekleyen() >= int(GameState.dukkan(GameState.S.shopLevel).maxQueue):
				ist.donen += 1
			else:
				_musteri_getir()
			gelecek -= 1
			sonraki += aralik * rng.randf_range(0.6, 1.4) * _aralik_carpani()
		_sabir(delta)
		if gelecek == 0 and sira.is_empty() and cikanlar.is_empty():
			_gun_bitti()
	_hud()


## Sırada sipariş vermeyi bekleyenler (web queueOf: sipariş vermemiş, gitmeyen).
func _bekleyen() -> int:
	var n := 0
	for m in sira:
		if m.durum == "giris" or m.durum == "sirada":
			n += 1
	return n


func _musteri_getir() -> void:
	var tip := _tip_sec()
	var ct: Dictionary = GameState.D.customers[tip]
	var dz: Dictionary = GameState.D.difficulty.get(GameState.S.get("diff", "normal"), GameState.D.difficulty.normal)
	var sabir := float(ct.patience) * float(dz.patience) * FP_SABIR * _sabir_carpani(tip)
	var menu: Array = []
	for id in GameState.S.get("unlocked", ["espresso"]):
		if YAPILABILIR.has(id) and _istenebilir(id):
			menu.append(id)
	if menu.is_empty():
		menu = ["espresso"]
	var ozel := _ozel_siparis(tip)
	var tarif: String = ozel[0] if not ozel.is_empty() else _tarif_sec(menu)
	if ozel.is_empty() and _gelmez(tip, tarif):
		ist.kizgin += 1
		return
	var boy: String = ozel[1] if not ozel.is_empty() else Content.tarif(tarif).sizes[rng.randi() % Content.tarif(tarif).sizes.size()]
	var siparis := fp_fincan(boy)
	var say: String = GameState.D.sizes[boy].say
	var d: String = ((say + " ") if say != "" else "") + String(Content.tarif(tarif).name).to_lower()
	_musteri_kur(tip, _musteri_adi(tip), _gorunus(tip), tarif, boy, siparis, _siparis_cumlesi(tip, d), d, sabir)


## Yeni gelen müşterinin sabır çarpanı (T14: dekor, T15: sadakat).
func _sabir_carpani(_tip: String) -> float:
	return 1.0


## Gelen müşterinin tipi (T15: özel müşteri, jüri).
func _tip_sec() -> String:
	return NORMAL_TIPLER[rng.randi() % NORMAL_TIPLER.size()]


## Tipe bağlı sabit sipariş [tarif, boy] (T15: jüri); boşsa menüden seçilir.
func _ozel_siparis(_tip: String) -> Array:
	return []


## Müşterinin başındaki ad (T15: sadık tipte ♥).
func _musteri_adi(tip: String) -> String:
	return GameState.D.customers[tip].name


## Geliş aralığı çarpanı (T15: yoğun saatte ÷ 3).
func _aralik_carpani() -> float:
	return 1.0


## Müşteriyi kapıda kurar ve sıraya ekler (T11: Yıldız Teyze de bununla gelir).
func _musteri_kur(tip: String, ad: String, model: String, tarif: String, boy: String, siparis: String, metin: String, metin_ad: String, sabir: float) -> Dictionary:
	var node := make_avatar(model)
	n_customer += 1
	node.position = DOOR
	add_child(node)
	var etiket := Label3D.new()
	etiket.text = ad
	etiket.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	etiket.font_size = 32
	etiket.pixel_size = 0.0018
	etiket.outline_size = 10
	etiket.modulate = Color("fbf6ee")
	etiket.outline_modulate = Color("2e2016")
	etiket.position = Vector3(0, 1.98, 0)
	node.add_child(etiket)
	var cubuk := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.4, 0.035)
	cubuk.mesh = q
	var cm := StandardMaterial3D.new()
	cm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	cm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	cm.albedo_color = Color("6fbf5a")
	cubuk.material_override = cm
	cubuk.position = Vector3(0, 1.9, 0)
	node.add_child(cubuk)
	var m := {"node": node, "tip": tip, "ad": ad, "siparis": siparis, "tarif": tarif, "boy": boy,
		"metin": metin, "metin_ad": metin_ad, "sabir": sabir, "sabir_max": sabir, "durum": "giris", "cubuk": cubuk, "etiket": etiket}
	sira.append(m)
	return m


## Boyun birinci şahıs fincanı (FINCAN).
func fp_fincan(boy: String) -> String:
	return FINCAN.get(String(GameState.D.sizes.get(boy, {}).get("cup", "espD")), "double")


func _tarif() -> Dictionary:
	return Content.tarif(siparis_tarif) if siparis_tarif != "" else {}


func needs_milk() -> bool:
	if siparis_tarif == "":
		return super.needs_milk()
	return "milk" in _tarif().steps


func shot_size() -> String:
	if siparis_tarif == "":
		return super.shot_size()
	return "tek" if siparis_boy == "single" else "double"


func size_name(s: String) -> String:
	return FINCAN_AD.get(s, super.size_name(s))


## Çekim hedefi = doz × oran (yoksa 2).
func verim() -> float:
	return float(DOSE[held_size]) * float(_tarif().get("ratio", 2.0))


func kopuk_hedefi() -> float:
	if siparis_tarif == "":
		return super.kopuk_hedefi()
	return float(KOPUK.get(String(_tarif().get("milk", "micro")), 20.0))


## Ristretto: çekim pencereleri tarifin profiliyle daralır.
func genislik(adim: String) -> float:
	var k := super.genislik(adim)
	if adim == "pull":
		k *= float(_tarif().get("profile", {}).get("extractZone", 1.0))
	return k


func action_text(id: String) -> String:
	if id == "customer" and cstate == "wait" and stage != "cup_taken" and siparis_adi != "":
		return "Sipariş: %s · %s fincan" % [siparis_adi, FINCAN_AD.get(order_size, order_size)]
	return _action_text_gun(id)


## Menüden tarif seçimi (T7: havaya göre ağırlıklı).
func _tarif_sec(menu: Array) -> String:
	return menu[rng.randi() % menu.size()]


## Müşteri hiç gelmez mi (T7: fiyata duyarlı tip pahalıysa).
func _gelmez(_tip: String, _tarif: String) -> bool:
	return false


## Müşteri bu tarifi isteyebilir mi (T6: aletleri var mı).
func _istenebilir(_id: String) -> bool:
	return true


## Tipine uyan bir insan modeli (tasarım belgesi "Müşteri"); dükkanda aynı kişi iki kez olmasın.
const GORUNUS := {
	"business": ["Business_Male_01", "Business_Male_02", "Business_Male_03"],
	"student": ["Female_Adult_12", "Male_Adult_17", "Male_Adult_09"],
	"elder": ["Business_Female_02", "Female_Adult_14"],
	"geek": ["Male_Adult_04", "Female_Adult_08", "Male_Adult_12"],
	"regular": ["Male_Adult_03", "Female_Adult_09", "Male_Adult_02", "Female_Adult_03"],
}


func _gorunus(tip: String) -> String:
	var aday: Array = GORUNUS.get(tip, GORUNUS.regular).duplicate()
	aday.shuffle()
	for a in aday:
		var var_mi := false
		for m in sira:
			if m.node.get_meta("model", "") == a:
				var_mi = true
		if not var_mi:
			return a
	return aday[0]


## Web orderLine: genel + tipe özel cümleler, ilk harf büyük. "saniye" içeren cümle yalnız espresso ailesinde.
func _siparis_cumlesi(tip: String, d: String) -> String:
	var L: Dictionary = GameState.D.orderLines
	var own: Array = L.get(tip, [])
	var havuz: Array = own if GameState.D.customers.get(tip, {}).get("special", false) and not own.is_empty() else L.any + own + own
	var t2: String = havuz[rng.randi() % havuz.size()]
	t2 = t2.replace("{d}", d)
	return t2.substr(0, 1).to_upper() + t2.substr(1)


func _sira_yeri(i: int) -> Vector3:
	return QUEUE_R + Vector3(-0.3 * i + (0.3 if i % 2 == 1 else 0.0), 0, 0.8 * i)


## fp_real.customer_tick yerine: bütün müşterileri yürütür; öndeki kasaya varınca siparişini söyler.
func customer_tick(delta: float) -> void:
	if menu_modu:
		return
	for m: Dictionary in sira.duplicate():
		var i := sira.find(m)
		if i < 0:
			continue
		var hedef := _sira_yeri(i)
		var vardi := walk_to(m.node, hedef, delta)
		if vardi:
			m.node.rotation.y = PI
			if i == 0 and (m.durum == "giris" or m.durum == "sirada") and cstate == "none":
				_siparis_al(m)
			elif m.durum == "giris":
				m.durum = "sirada"
	# servis edilen öndeki müşteri: fp.serve() cstate'i leaving → walk_out yapar
	if cstate == "walk_out" and not sira.is_empty() and sira[0].durum == "servis":
		var m: Dictionary = sira.pop_front()
		ist.hizmet += 1
		_cikar(m)
		customer = null
		cstate = "none"
	for c in cikanlar.duplicate():
		if walk_to(c, DOOR, delta):
			cikanlar.erase(c)
			c.queue_free()


func _siparis_al(m: Dictionary) -> void:
	m.durum = "siparis"
	customer = m.node
	var govde := collider(Vector3(0, 1.0, 0), Vector3(0.6, 1.9, 0.5), "customer")
	govde.reparent(m.node, false)
	order_size = m.siparis
	siparis_tarif = m.tarif
	siparis_boy = m.boy
	siparis_adi = m.metin_ad
	milk_state = "none"
	cstate = "wait"
	show_bubble(m.metin)


func _cikar(m: Dictionary) -> void:
	m.cubuk.visible = false
	m.etiket.visible = false
	cikanlar.append(m.node)


func _sabir(delta: float) -> void:
	for m in sira.duplicate():
		if m.durum == "servis":
			continue
		m.sabir -= delta
		var k: float = clampf(m.sabir / m.sabir_max, 0.0, 1.0)
		m.cubuk.scale.x = maxf(k, 0.02)
		(m.cubuk.material_override as StandardMaterial3D).albedo_color = Color("c9483b").lerp(Color("6fbf5a"), k)
		if m.sabir <= 0.0:
			_kizip_git(m)


## Sabrı biten müşteri (T10: "Hiç müşteri kaçırma" görevini bozar).
func _musteri_kacti(_m: Dictionary) -> void:
	pass


func _kizip_git(m: Dictionary) -> void:
	var siparisli: bool = m.durum == "siparis"
	sira.erase(m)
	ist.kizgin += 1
	_musteri_kacti(m)
	var S := GameState.S
	S.rep = maxi(0, int(S.get("rep", 0)) - 5)
	S.streak = 0
	var b := Label3D.new()
	b.text = "Bu kadar beklenmez! İptal!" if siparisli else "Bu kadar beklenmez!"
	b.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	b.pixel_size = 0.0022
	b.font_size = 44
	b.outline_size = 14
	b.modulate = Color("8a2a20")
	b.outline_modulate = Color("fbf6ee")
	b.position = Vector3(0, 2.2, 0)
	m.node.add_child(b)
	if siparisli:
		if bubble:
			bubble.queue_free()
			bubble = null
		customer = null
		cstate = "none"
	flash = "%s kızıp gitti · −5 itibar" % m.ad
	_cikar(m)


## Fincan uzatıldı: öndeki müşteri artık sabır kaybetmez; fp.serve() onu 1,8 sn sonra kapıya yollar.
func serve() -> void:
	super.serve()
	if not sira.is_empty() and sira[0].durum == "siparis":
		sira[0].durum = "servis"
		sira[0].cubuk.visible = false


# ---------- ekran yazıları ----------
func prompt_flash(text: String) -> void:
	flash = text


func _saat() -> String:
	var dakika := int(clampf(t / GUN_SN, 0.0, 1.0) * 12.0 * 60.0)
	return "%02d:%02d" % [8 + dakika / 60, dakika % 60]


func _sag_ust() -> String:
	var gun: int = GameState.S.get("day", 1)
	return "%s · Gün %d · %s" % [GameState.hafta_gunu(gun), gun, _saat()]


func _gun_ozeti() -> String:
	return "Hizmet edilen: %d · Kızıp giden: %d · Kapıdan dönen: %d" % [ist.hizmet, ist.kizgin, ist.donen]


var flash_son := ""
var flash_ms := 0


func _hud() -> void:
	var S := GameState.S
	if flash != flash_son:
		flash_son = flash
		flash_ms = Time.get_ticks_msec()
	elif flash != "" and Time.get_ticks_msec() - flash_ms > 6000:
		flash = ""
		flash_son = ""
	var saat := _saat()
	var sag := _sag_ust()
	if saat_hud.text != sag:
		saat_hud.text = sag
		saat_yazi.text = saat
	var durum: String
	if not acik:
		durum = "Dükkân kapalı · kasanın yanındaki tabelaya bakıp E"
	elif bitti or (gelecek == 0 and sira.is_empty()):
		durum = "Bugünkü müşteriler bitti"
	else:
		var dk := GameState.dukkan(S.shopLevel)
		durum = "Sıra %d/%d · " % [_bekleyen(), int(dk.maxQueue)]
		if cstate == "wait":
			durum += "Sipariş: %s · %s fincan" % [siparis_adi, FINCAN_AD.get(order_size, order_size)]
		elif not sira.is_empty():
			durum += "Müşteri kasaya geliyor"
		else:
			durum += "Müşteri bekleniyor…"
	var yeni := durum + "\n" + (flash if flash != "" else "WASD yürü · fare bak · E / sol tık: etkileşim · Boşluk: tamam · R: kaşık · Esc: menü")
	if yeni != son_info:
		son_info = yeni
		info.text = yeni


# ---------- günün sonu (T5'e kadar kısa özet) ----------
func _gun_bitti() -> void:
	bitti = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().paused = true
	var S := GameState.S
	var metin := _gun_ozeti()
	Flow.pencere("%s, Gün %d bitti" % [GameState.hafta_gunu(S.day), S.day], Tema.yazi(metin), [
		{"metin": "Ertesi gün", "tur": "ana", "fn": _ertesi_gun}], _ertesi_gun)


func _ertesi_gun() -> void:
	var S := GameState.S
	S.day = int(S.day) + 1
	SaveSystem.yaz(GameState.yuva, S)
	get_tree().paused = false
	get_tree().reload_current_scene()
