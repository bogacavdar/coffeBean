extends "res://dukkan/gun.gd"
## Servis, fiyat ve bahşiş (tasarım belgesi §4 "Servis, fiyat ve bahşiş (taşıma adımı T4)"); formüller web v0.47 serve().

var gunluk := {"gelir": 0, "bahsis": 0, "yanlis": 0, "kotu": 0, "mukemmel": 0}


# ---------- fiyat (web defaultPrice / priceOf / orderPrice) ----------
func _boy(b: String) -> Dictionary:
	return GameState.D.sizes.get(b, GameState.D.sizes.single)


func _sutlu(id: String) -> bool:
	var d := Content.tarif(id)
	return "milk" in d.steps or "coldmilk" in d.steps or d.has("milkUse")


func _cekirdek_kg(id: String, b: String) -> float:
	return 0.0 if Content.tarif(id).get("noBean", false) else float(GameState.D.economy.beanPerCup) * float(_boy(b).bean)


func _sut_l(id: String, b: String) -> float:
	if not _sutlu(id):
		return 0.0
	return float(Content.tarif(id).get("milkL", GameState.D.economy.milkPerCup)) * float(_boy(b).milk)


func varsayilan_fiyat(id: String) -> int:
	var d := Content.tarif(id)
	var ilk: String = d.get("sizes", ["single"])[0]
	var maliyet := _cekirdek_kg(id, ilk) * float(GameState.D.beans.brazil.price) + _sut_l(id, ilk) * float(GameState.D.economy.milkPrice) + float(d.cost)
	var dk := GameState.dukkan(GameState.S.shopLevel)
	var gunluk_m := int(dk.customersPerDay) + int(trafik().cust) * int(dk.custStep)
	return maxi(1, roundi(maliyet * float(GameState.D.pricing.markup) + float(dk.rent) / (7.0 * gunluk_m)))


func fiyat(id: String) -> int:
	var S := GameState.S
	var tl_ayar = S.get("priceTL", {}).get(id)
	if tl_ayar != null:
		return maxi(1, roundi(float(tl_ayar)))
	return maxi(1, roundi(varsayilan_fiyat(id) * float(S.get("prices", {}).get(id, 1.0))))


func siparis_fiyati(id: String, b: String) -> int:
	var boy_fiyat := maxi(1, roundi(fiyat(id) * float(_boy(b).price)))
	var cek: String = GameState.S.get("bean", "brazil")
	var p := maxi(1, roundi(boy_fiyat * float(GameState.D.beans.get(cek, GameState.D.beans.brazil).get("mult", 1.0))))
	if _sutlu(id):
		p += int(GameState.D.milks.get(GameState.S.get("milkType", "cow"), GameState.D.milks.cow).extra)
	return p


func _rutbe() -> Dictionary:
	var r: Dictionary = GameState.D.ranks[0]
	for x in GameState.D.ranks:
		if int(GameState.S.get("xp", 0)) >= int(x.xp):
			r = x
	return r


func _seri_carpani() -> float:
	return minf(float(GameState.D.streak.max), 1.0 + float(GameState.D.streak.step) * int(GameState.S.get("streak", 0)))


# ---------- servis ----------
## fp.serve()'ün yerine: kalite, yanlış/kötü kahve, fiyat, bahşiş, itibar, XP, yorum ve yüzen yazılar.
func serve() -> void:
	if sira.is_empty() or sira[0].durum != "siparis":
		return
	var m: Dictionary = sira[0]
	drop_held()
	var kalite := 0.0
	for s in step_scores:
		kalite += s
	kalite = clampf(roundf(kalite / maxi(step_scores.size(), 1)), 0.0, 100.0)
	step_scores.clear()
	var yanlis := wrong
	wrong = false
	stage = "used"
	milk_state = "none"
	m.durum = "servis"
	m.cubuk.visible = false
	cstate = "leaving"
	get_tree().create_timer(1.8).timeout.connect(func(): cstate = "walk_out")

	var S := GameState.S
	var ct: Dictionary = GameState.D.customers[m.tip]
	var D := GameState.D
	_harca(m)
	if not _kabul(m, kalite, yanlis):
		var satir: String
		if yanlis:
			var d: String = m.metin_ad
			satir = _bas_harf(String(D.wrongLines[rng.randi() % D.wrongLines.size()]).replace("{d}", d))
			gunluk.yanlis += 1
		else:
			satir = D.badLines[rng.randi() % D.badLines.size()]
			gunluk.kotu += 1
		S.rep = maxi(0, int(S.rep) - 3)
		S.streak = 0
		show_bubble(satir)
		_yuzen(m.node, "−3", Color("b5533c"), 0.0)
		flash = "%s · %s · almadan gitti · −3 itibar" % [m.ad, "yanlış sipariş" if yanlis else "kalite %d" % int(kalite)]
		prompt_tail()
		_reddedildi(m)
		return

	_odeme(m, kalite)


## Ücretli servis: fiyat, bahşiş, itibar, XP, yorum ve yüzen yazılar (T16: yardımcı barista da kullanır).
func _odeme(m: Dictionary, kalite: float, yardimci := false) -> void:
	var S := GameState.S
	var ct: Dictionary = GameState.D.customers[m.tip]
	var D := GameState.D
	var p: float = clampf(m.sabir / m.sabir_max, 0.0, 1.0)
	var hiz := 0.6 + 0.4 * clampf(p / 0.5, 0.0, 1.0)
	var servis := roundi(kalite * hiz)
	var tutar := siparis_fiyati(m.tarif, m.boy)
	if ct.get("discount") != null:
		tutar = roundi(tutar * float(ct.discount))
	var bahsis := 0
	if kalite >= 80:
		bahsis = roundi(tutar * 0.25 * ((kalite - 70.0) / 30.0) * hiz * float(ct.tip) * float(_rutbe().tipMult) * _seri_carpani() * _bahsis_carpani(m))
	var eksik := _kucuk_malzemeler(m)
	bahsis = roundi(bahsis * float(D.extraTip[mini(2, eksik.size())]))
	if not yardimci:
		S.streak = int(S.get("streak", 0)) + 1 if servis >= 95 else 0
	S.money = float(S.money) + tutar + bahsis
	gunluk.gelir += tutar
	gunluk.bahsis += bahsis
	S.served[m.tarif] = int(S.served.get(m.tarif, 0)) + 1
	var rep := 0
	var mesaj: String
	if servis >= 95:
		S.perfect[m.tarif] = int(S.perfect.get(m.tarif, 0)) + 1
		rep = 5
		S.xp = int(S.xp) + 25
		gunluk.mukemmel += 1
		mesaj = "Mükemmel"
	elif servis >= 80:
		rep = 2
		mesaj = "Güzel"
	elif servis >= 70:
		mesaj = "İdare eder"
	else:
		rep = -3
		mesaj = "Şikâyet"
	rep = _itibar(m, servis, rep)
	S.rep = maxi(0, int(S.rep) + rep)
	S.xp = int(S.xp) + 5 + roundi(servis / 4.0)
	var yorum: Dictionary = D.reviews[D.reviews.size() - 1]
	for r in D.reviews:
		if kalite >= float(r.min):
			yorum = r
			break
	var soz: String = yorum.lines[rng.randi() % yorum.lines.size()] if eksik.is_empty() else D.extras[eksik[rng.randi() % eksik.size()]].miss
	if yardimci:
		_yuzen(m.node, "Yardımcı", Color("f6efe3"), 1.75)
	else:
		show_bubble(soz)
	if not eksik.is_empty():
		_yuzen(m.node, "az bahşiş", Color("e9c46a"), 1.4)
	_yuzen(m.node, "+₺" + GameState.tl(tutar), Color("5f8a4b"), 0.0)
	if bahsis > 0:
		_yuzen(m.node, "+₺%s bahşiş" % GameState.tl(bahsis), Color("c9962b"), 0.35)
	if rep != 0:
		_yuzen(m.node, ("+" if rep > 0 else "") + str(rep), Color("5f8a4b") if rep > 0 else Color("b5533c"), 0.7)
	if servis >= 95:
		_yuzen(m.node, "★", Color("c9962b"), 1.05)
	var ad: String = _bas_harf(m.metin_ad)
	flash = "%s · %s · ₺%s%s · %s" % [m.ad, ad, GameState.tl(tutar), (" + ₺%s bahşiş" % GameState.tl(bahsis)) if bahsis > 0 else "", mesaj]
	if not yardimci:
		prompt_tail()
	_servis_sonrasi(m, tutar, bahsis, servis)


## Bahşiş çarpanı (T14: dekor, T15: sadakat, yoğun saat).
func _bahsis_carpani(_m: Dictionary) -> float:
	return 1.0


## Servisin itibar etkisi (T15: eleştirmen).
func _itibar(_m: Dictionary, _servis: int, rep: int) -> int:
	return rep


## Müşteri kahveyi almadan gitti (T15: jüri puanı 0).
func _reddedildi(_m: Dictionary) -> void:
	pass


## Müşteri kahveyi alır mı (T11: Yıldız Teyze her kahveyi alır).
func _kabul(_m: Dictionary, kalite: float, yanlis: bool) -> bool:
	return not yanlis and kalite >= float(GameState.D.economy.refuseBelow)


## Ücretli servisten sonra (T10: tarif ilerlemesi, görev, rütbe).
func _servis_sonrasi(_m: Dictionary, _tutar: int, _bahsis: int, _servis: int) -> void:
	pass


## Stok harcaması (T6'da doldurulur): servis anında çekirdek, süt, özel malzeme.
func _harca(_m: Dictionary) -> void:
	pass


## Müşterinin kullanıp bulamadığı küçük malzemeler (T6'da doldurulur).
func _kucuk_malzemeler(_m: Dictionary) -> Array:
	return []


## Servisten sonra portafiltreyi boşaltma hatırlatması alt ipucunda kalır (fp.serve ile aynı).
func prompt_tail() -> void:
	if hint:
		hint.text = "Portafiltreyi çıkar ve telve kutusunda boşalt"


func _bas_harf(s: String) -> String:
	return s.substr(0, 1).to_upper() + s.substr(1)


## Müşterinin üstünde yükselip kaybolan yazı (web SCENE.addFx).
func _yuzen(node: Node3D, metin: String, renk: Color, gecikme: float) -> void:
	var l := Label3D.new()
	l.text = metin
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.font_size = 52
	l.pixel_size = 0.0022
	l.outline_size = 14
	l.modulate = Color(renk, 0.0)
	l.outline_modulate = Color(0.98, 0.96, 0.92, 0.0)
	l.position = node.position + Vector3(0.6, 1.55, 0)
	add_child(l)
	var tw := create_tween()
	tw.tween_interval(gecikme)
	tw.tween_property(l, "modulate:a", 1.0, 0.15)
	tw.parallel().tween_property(l, "outline_modulate:a", 1.0, 0.15)
	tw.tween_property(l, "position:y", l.position.y + 0.55, 1.6)
	tw.parallel().tween_property(l, "modulate:a", 0.0, 1.6).set_ease(Tween.EASE_IN)
	tw.parallel().tween_property(l, "outline_modulate:a", 0.0, 1.6).set_ease(Tween.EASE_IN)
	tw.tween_callback(l.queue_free)


# ---------- ekran: para sağ üstte, gün sonu özetinde kazanç ----------
func _sag_ust() -> String:
	return super._sag_ust() + " · ₺" + GameState.tl(GameState.S.money)


func _gun_ozeti() -> String:
	var d := "Hizmet edilen: %d · Kızıp giden: %d · Kapıdan dönen: %d" % [ist.hizmet - gunluk.yanlis - gunluk.kotu, ist.kizgin, ist.donen]
	d += "\nKazanç: ₺%s · Bahşiş: ₺%s · Mükemmel: %d" % [GameState.tl(gunluk.gelir), GameState.tl(gunluk.bahsis), gunluk.mukemmel]
	if gunluk.yanlis + gunluk.kotu > 0:
		d += "\nAlmadan giden: %d (yanlış sipariş %d, kötü kahve %d)" % [gunluk.yanlis + gunluk.kotu, gunluk.yanlis, gunluk.kotu]
	return d
