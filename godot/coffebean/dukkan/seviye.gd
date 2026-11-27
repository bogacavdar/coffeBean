extends "res://dukkan/ekipman.gd"
## Beş dükkan, müşteri gelişi kademeleri ve Ana hedef (tasarım belgesi §4 "Beş dükkan, müşteri gelişi ve Ana hedef
## (taşıma adımı T13)"); web renderGoal, hubContent "upg" trafik satırları, scene.js THEMES.

## Dükkan seviyesine göre renkler (belgedeki tablo; web THEMES). 0 = ★ (dokunulmaz).
const TEMA := [
	{},
	{"duvar": Color("d3dcc4"), "tezgah": Color("4f6a4a"), "zemin": Color(0.95, 0.9, 0.85)},
	{"duvar": Color("ecd9c6"), "tezgah": Color("6e2f36"), "zemin": Color(0.62, 0.48, 0.38)},
	{"duvar": Color("33435c"), "tezgah": Color("2a3850"), "zemin": Color(0.78, 0.78, 0.8)},
	{"duvar": Color("9c4f37"), "tezgah": Color("5a3a26"), "zemin": Color(0.62, 0.6, 0.57)},
]


func seviye() -> int:
	return int(GameState.S.get("shopLevel", 0))


## Oda kurulurken duvar sıvası, tezgâh önü ve parke dükkanın rengini alır.
func pbr(base: String, meters := 2.0, tint := Color.WHITE, rough_mul := 1.0) -> StandardMaterial3D:
	var lv := clampi(seviye(), 0, TEMA.size() - 1)
	if lv > 0:
		var tm: Dictionary = TEMA[lv]
		if base == "white_plaster_rough_01":
			tint = tm.duvar
		elif base == "hinoki_planks" and tint.is_equal_approx(Color(0.9, 0.74, 0.58)):
			tint = tm.tezgah.lightened(0.25)
		elif base == "herringbone_parquet":
			tint = tm.zemin
	return super.pbr(base, meters, tint, rough_mul)


func build_room() -> void:
	super.build_room()
	var lv := seviye()
	if lv >= 1:
		ph("round_wooden_table_01_2k", Vector3(3.5, 0, 0.3), 0.0, 0.75)
		ph("dining_chair_02_1k", Vector3(3.5, 0, -0.45), 0.0)
		ph("dining_chair_02_1k", Vector3(3.5, 0, 1.05), 180.0)
	if lv >= 2:
		for x in [1.95, 2.6, 3.25]:
			ph("wooden_stool_01_2k", Vector3(x, 0, -2.55))
		ph("potted_plant_02_1k", Vector3(-3.7, 0, -0.2), 0.0, 1.0)
	if lv >= 3:
		ph("hanging_picture_frame_02_1k", Vector3(-4.08, 1.6, -0.6), 90.0)


# ---------- Dükkan penceresi: Ana hedef + müşteri gelişi ----------
func _dukkan_ust(v: VBoxContainer, yenile: Callable) -> void:
	var b := Tema.dugme("Ana hedef", "ana")
	b.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	b.pressed.connect(func(): _ana_hedef(yenile))
	v.add_child(b)


func _gelistirmeler(v: VBoxContainer, yildiz: int, yenile: Callable) -> void:
	var S := GameState.S
	var dk := GameState.dukkan(S.shopLevel)
	var T := trafik()
	var gunluk := int(dk.customersPerDay) + int(T.cust) * int(dk.custStep)
	var sik := float(dk.interval) * pow(float(_D().traffic.freqMult), int(T.freq))
	var ic := _dukkan_bolum(v, "Müşteri gelişi", "Sıra en fazla %d kişi · günde %d müşteri · ~%s sn'de bir. Kademeler bu dükkana özel." % [int(dk.maxQueue), gunluk, _v(sik, 1)])
	for k in ["cust", "freq"]:
		var kd: int = T[k]
		var ad := ("Günlük müşteri" if k == "cust" else "Geliş sıklığı") + " (kademe %d/3)" % kd
		var alt := "en üst kademe"
		if kd < 3:
			alt = String(_D().traffic[k][kd]) + (": +%d müşteri/gün" % int(dk.custStep) if k == "cust" else ": müşteriler daha sık gelir")
		var sag: Control
		if kd >= 3:
			sag = _durum("✓")
		else:
			var tutar := int(dk.tierCost[kd])
			var kk: String = k
			var bt := Tema.dugme("Yükselt")
			bt.disabled = float(S.money) < tutar
			var uygula := func():
				var ad2: String = _D().traffic[kk][kd]
				if not S.has("traffic"):
					S.traffic = {}
				var anahtar := str(int(S.shopLevel))
				var tt: Dictionary = S.traffic.get(anahtar, {"cust": 0, "freq": 0})
				tt[kk] = kd + 1
				S.traffic[anahtar] = tt
				S.log.append("Gün %d: %s" % [int(S.day), ad2])
			bt.pressed.connect(func():
				if _al(tutar, uygula):
					flash = "%s · yarından geçerli" % String(_D().traffic[kk][kd])
					yenile.call())
			sag = bt
		_dukkan_satir(ic, ad, alt, "" if kd >= 3 else "₺" + GameState.tl(dk.tierCost[kd]), sag)
	super._gelistirmeler(v, yildiz, yenile)


# ---------- Ana hedef (web renderGoal) ----------
func _ana_hedef(yenile: Callable) -> void:
	var S := GameState.S
	var lv := seviye()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.add_child(Tema.yazi("Kasa: ₺" + GameState.tl(S.money), 20, Tema.ANA, true))
	var dugmeler: Array = [{"metin": "Kapat"}]
	if lv >= _D().shopLevels.size() - 1:
		var dk := GameState.dukkan(lv)
		v.add_child(Tema.yazi("En büyük dükkandasın: %s %s." % ["★".repeat(int(dk.stars)), dk.name], 18))
	else:
		var nx: Dictionary = _D().shopLevels[lv + 1]
		v.add_child(Tema.yazi("Sıradaki dükkan: %s %s" % ["★".repeat(int(nx.stars)), nx.name], 20, Tema.KAHVE, true))
		var borc := int(S.get("debt", 0))
		var sartlar := [
			[float(S.money) >= float(nx.money), "Kasa ₺%s / ₺%s" % [GameState.tl(S.money), GameState.tl(nx.money)]],
			[int(S.rep) >= int(nx.rep), "İtibar %d / %d" % [int(S.rep), int(nx.rep)]],
			[borc <= 0, "Borç yok" if borc <= 0 else "Borç yok (şu an ₺%s)" % GameState.tl(borc)],
		]
		var tamam := true
		for s in sartlar:
			tamam = tamam and s[0]
			v.add_child(Tema.yazi(("✓ " if s[0] else "✗ ") + s[1], 18, Color("3f7a35") if s[0] else Color("a63d36")))
		var acar: Array = []
		for id in _D().drinks:
			if int(_D().drinks[id].get("shop", 1)) == int(nx.stars):
				acar.append(_D().drinks[id].name)
		for id in _D().tools:
			if int(_D().tools[id].get("stars", 1)) == int(nx.stars):
				acar.append(_D().tools[id].name)
		for id in _D().equipment:
			if int(_D().equipment[id].get("stars", 1)) == int(nx.stars) and not id in GIZLI_EKIPMAN:
				acar.append(_D().equipment[id].name)
		v.add_child(Tema.yazi("Açar: sıra %d kişi, günde %d müşteri · haftalık kira ₺%s%s. Aldığın aletler ve makineler yeni dükkana taşınır." % [int(nx.maxQueue), int(nx.customersPerDay), GameState.tl(nx.rent), (" · " + ", ".join(acar)) if not acar.is_empty() else ""], 15, Tema.SOLUK))
		dugmeler.append({"metin": "Seviye atla", "tur": "ana", "kapali": not tamam, "fn": func(): _seviye_atla(yenile)})
	Flow.pencere("Ana hedef", v, dugmeler, null, 620)


func _seviye_atla(yenile: Callable) -> void:
	var S := GameState.S
	S.shopLevel = seviye() + 1
	var dk := GameState.dukkan(S.shopLevel)
	S.log.append("Gün %d: %s" % [int(S.day), dk.name])
	SaveSystem.yaz(GameState.yuva, S)
	yenile.call()
	Flow.pencere("%s %s" % ["★".repeat(int(dk.stars)), dk.name], Tema.yazi("Sıra en fazla %d kişi, günde %d müşteri, haftalık kira ₺%s. Yeni geliştirmeler, aletler ve kredi limiti (₺%s) açıldı. Yeni dükkan yarın sabah açılır." % [int(dk.maxQueue), int(dk.customersPerDay), GameState.tl(dk.rent), GameState.tl(dk.loanLimit)], 18), [
		{"metin": "Tamam", "tur": "ana", "fn": func():
			if sonraki_tarif() != "" and _acilabilir(sonraki_tarif()):
				tarifleri_ac()}], null, 600)
