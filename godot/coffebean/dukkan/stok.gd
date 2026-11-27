extends "res://dukkan/gun_sonu.gd"
## Stok ve tedarik (tasarım belgesi §4 "Stok ve tedarik (taşıma adımı T6)"); web renderSupply, supplyMissing,
## fillMissingPlan, takeOrder stok kontrolü, serve harcaması, süt bozulması.

const POMPA := {"single": 1, "double": 2, "S": 2, "M": 3, "L": 4, "iS": 2, "iM": 3, "iL": 4, "tk": 1, "affo1": 1, "affo2": 1}

var stokta := {"nocup": 0, "nostock": 0, "extraMiss": 0}
var tedarik_kaydir := 0


# ---------- web yardımcıları ----------
func _D() -> Dictionary:
	return GameState.D


func SP(x: float) -> int:
	var dz: Dictionary = _D().difficulty.get(GameState.S.get("diff", "normal"), _D().difficulty.normal)
	return maxi(1, roundi(x * float(dz.cost)))


func cekirdek(id := "brazil") -> float:
	return float(GameState.S.beans.get(id, {}).get("kg", 0.0))


func sut(k := "cow") -> float:
	if k == "cow":
		return float(GameState.S.get("milk", 0.0))
	return float(GameState.S.get("milkAlt", {}).get(k, 0.0))


func aletleri_var(id: String) -> bool:
	for a in Content.tarif(id).get("needs", []):
		if not GameState.S.get("tools", {}).get(a, false):
			return false
	return true


func _istenebilir(id: String) -> bool:
	return aletleri_var(id)


func sut_gerekli() -> bool:
	for id in GameState.S.unlocked:
		if aletleri_var(id) and _sutlu(id):
			return true
	return false


func bardaklar_bilinen() -> Array:
	var k: Array = []
	for id in GameState.S.unlocked:
		for b in Content.tarif(id).get("sizes", ["single"]):
			var c: String = _boy(b).cup
			if not c in k:
				k.append(c)
	return k


func bardaklar_gereken() -> Array:
	var k: Array = []
	for id in GameState.S.unlocked:
		if not aletleri_var(id):
			continue
		for b in Content.tarif(id).get("sizes", ["single"]):
			var c: String = _boy(b).cup
			if not c in k:
				k.append(c)
	return k


func tarif_ilerlemesi() -> int:
	if GameState.S.has("rp"):
		return int(GameState.S.rp)
	var n := 0
	for k in GameState.S.served:
		n += int(GameState.S.served[k])
	return n


func cekirdek_acik(id: String) -> bool:
	var b: Dictionary = _D().beans[id]
	return int(b.get("unlock", 1)) <= int(GameState.dukkan(GameState.S.shopLevel).stars) and tarif_ilerlemesi() >= int(b.get("cups", 0))


func acik_cekirdekler() -> Array:
	var a: Array = []
	for id in _D().beans:
		if cekirdek_acik(id):
			a.append(id)
	a.sort_custom(func(x, y):
		var bx: Dictionary = _D().beans[x]
		var by: Dictionary = _D().beans[y]
		return [int(bx.get("unlock", 1)), int(bx.get("cups", 0))] < [int(by.get("unlock", 1)), int(by.get("cups", 0))])
	return a


func acik_sutler() -> Array:
	var a: Array = []
	for k in _D().milks:
		if k == "cow" or int(GameState.S.get("rep", 0)) >= int(_D().milks[k].rep):
			a.append(k)
	return a


func ozel_acik(k: String) -> bool:
	var sp: Dictionary = _D().specials.get(k, {})
	if sp.is_empty():
		return false
	if sp.has("tool") and GameState.S.get("tools", {}).get(sp.tool, false):
		return true
	for id in GameState.S.unlocked:
		for u in Content.tarif(id).get("uses", []):
			if u[0] == k:
				return true
	return false


func ozel_stok(k: String) -> int:
	if k == "sugar":
		return int(GameState.S.extras.get("sugar", 0))
	return int(GameState.S.get("syr", {}).get(k, 0))


func ozel_ihtiyac(id: String, b: String) -> Dictionary:
	var m := {}
	for u in Content.tarif(id).get("uses", []):
		var a = u[1]
		var n: int
		if a is String:
			n = POMPA.get(b, 2) if a == "pump" else (int(_boy(b).get("scoops", 1)) if a == "scoop" else (2 if b == "iL" else 1))
		else:
			n = int(a)
		m[u[0]] = int(m.get(u[0], 0)) + n
	return m


func _ad(k: String) -> String:
	return String(_D().specials.get(k, _D().extras.get(k, {"name": k})).name)


# ---------- sipariş anında stok kontrolü (web takeOrder) ----------
func _siparis_al(m: Dictionary) -> void:
	var S := GameState.S
	var bardak: String = _boy(m.boy).cup
	var hata := ""
	if int(S.cups.get(bardak, 0)) <= 0:
		var s: String = _boy(m.boy).say if _boy(m.boy).say != "" else "espresso"
		hata = String(_D().noCupLines[rng.randi() % _D().noCupLines.size()]).replace("{s}", s).replace("{S}", _bas_harf(s))
		stokta.nocup += 1
	else:
		var yok := ""
		if cekirdek(S.get("bean", "brazil")) < _cekirdek_kg(m.tarif, m.boy) - 1e-9:
			yok = String(_D().beans[S.get("bean", "brazil")].name) + " çekirdeği"
		elif _sutlu(m.tarif) and sut() < _sut_l(m.tarif, m.boy) - 1e-9:
			yok = String(_D().milks.cow.name)
		else:
			var ih := ozel_ihtiyac(m.tarif, m.boy)
			for k in ih:
				if ozel_stok(k) < int(ih[k]):
					yok = _ad(k)
					break
		if yok != "":
			hata = String(_D().stockOutLines[rng.randi() % _D().stockOutLines.size()]).replace("{X}", _bas_harf(yok)).replace("{x}", yok.to_lower())
			stokta.nostock += 1
	if hata != "":
		sira.erase(m)
		S.rep = maxi(0, int(S.rep) - 3)
		S.streak = 0
		var b := Label3D.new()
		b.text = _bas_harf(hata)
		b.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		b.pixel_size = 0.0022
		b.font_size = 44
		b.outline_size = 14
		b.modulate = Color("8a2a20")
		b.outline_modulate = Color("fbf6ee")
		b.position = Vector3(0, 2.2, 0)
		m.node.add_child(b)
		_yuzen(m.node, "−3", Color("b5533c"), 0.0)
		flash = "%s · %s · −3 itibar" % [m.ad, _bas_harf(hata)]
		_cikar(m)
		return
	S.cups[bardak] = maxi(0, int(S.cups.get(bardak, 0)) - 1)
	super._siparis_al(m)


# ---------- servis harcaması ----------
func _harca(m: Dictionary) -> void:
	var S := GameState.S
	var cek: String = S.get("bean", "brazil")
	if not S.beans.has(cek):
		S.beans[cek] = {"kg": 0.0, "boughtDay": S.day}
	S.beans[cek].kg = maxf(0.0, float(S.beans[cek].kg) - _cekirdek_kg(m.tarif, m.boy))
	if _sutlu(m.tarif):
		S.milk = maxf(0.0, float(S.get("milk", 0.0)) - _sut_l(m.tarif, m.boy))
	var ih := ozel_ihtiyac(m.tarif, m.boy)
	for k in ih:
		if k == "sugar":
			S.extras.sugar = maxi(0, int(S.extras.get("sugar", 0)) - int(ih[k]))
		else:
			S.syr[k] = maxi(0, int(S.syr.get(k, 0)) - int(ih[k]))


func _kucuk_malzemeler(m: Dictionary) -> Array:
	var S := GameState.S
	var eksik: Array = []
	var bardak: String = _boy(m.boy).cup
	var aliskanlik: Dictionary = _D().customers[m.tip].get("extras", {})
	for k in _D().extras:
		var e: Dictionary = _D().extras[k]
		if e.get("takeaway", false) and not bardak.begins_with("cup"):
			continue
		if k == "sugar" and Content.tarif(m.tarif).get("sugar", false):
			continue
		var buzlu := bardak.begins_with("ice")
		var olasilik := 0.9 if (k == "straw" and buzlu) else minf(0.95, float(e.use) * float(aliskanlik.get(k, 1.0)))
		if rng.randf() >= olasilik:
			continue
		if int(S.extras.get(k, 0)) > 0:
			S.extras[k] = int(S.extras[k]) - 1
		else:
			eksik.append(k)
	if not eksik.is_empty():
		stokta.extraMiss += 1
	return eksik


# ---------- gün sonu: süt bozulması, alımlar, istatistik ----------
func _gun_bitti() -> void:
	super._gun_bitti()
	var S := GameState.S
	for k in stokta:
		son.st[k] = stokta[k]
	son.L.spend = int(S.get("spend", 0))
	S.spend = 0
	var raf: int = _D().economy.milkShelfDays if S.equipment.get("fridge", false) else _D().economy.milkShelfNoFridge
	if int(S.day) - int(S.get("milkDay", S.day)) + 1 >= raf:
		var vardi := float(S.get("milk", 0)) > 0
		for k in S.get("milkAlt", {}):
			vardi = vardi or float(S.milkAlt[k]) > 0
		son.L.spoiled = vardi
		S.milk = 0
		S.milkAlt = {}
	S.endPending = son
	SaveSystem.yaz(GameState.yuva, S)


## Hesap'tan sonra: gün bir artar (bir kez), zorunlu tedarik açılır.
func _ertesi_gun() -> void:
	var S := GameState.S
	if not son.get("advanced", false):
		S.day = int(S.day) + 1
		son.advanced = true
		S.endPending = son
		SaveSystem.yaz(GameState.yuva, S)
	_tedarik("gunsonu")


func _yeni_gun() -> void:
	var S := GameState.S
	S.erase("endPending")
	SaveSystem.yaz(GameState.yuva, S)
	get_tree().paused = false
	get_tree().reload_current_scene()


# ---------- tabela ve dizüstü ----------
func interact(id: String) -> void:
	if id == "tabela" and not acik and not bitti:
		if GameState.S.get("firstSupply", false) or not eksikler().is_empty():
			_ekrana_gec()
			_tedarik("baslat")
			return
	if id == "dizustu" and not bitti:
		_ekrana_gec()
		_tedarik("ara")
		return
	super.interact(id)


func action_text(id: String) -> String:
	if id == "dizustu" and not bitti:
		return "E: Tedarik"
	return super.action_text(id)


# ---------- web supplyMissing / fillMissingPlan ----------
func eksikler() -> Array:
	var S := GameState.S
	var m: Array = []
	var kg := cekirdek()
	var asgari_kg: float = _D().economy.minBeans
	if kg < asgari_kg:
		m.append("Brezilya çekirdeği (ev çekirdeği) — en az %s kg olmalı (şu an %s kg)." % [_v(asgari_kg, 1), _v(kg, 2)])
	if sut_gerekli() and sut() < float(_D().economy.minMilk):
		m.append("İnek sütü — en az %s L olmalı (şu an %s L)." % [_v(float(_D().economy.minMilk), 0), _v(sut(), 1)])
	for k in bardaklar_gereken():
		var n := int(S.cups.get(k, 0))
		if n < int(_D().cupMin):
			m.append("%s — en az %d adet olmalı (şu an %d)." % [_D().cups[k].name, int(_D().cupMin), n])
	return m


func eksik_plani() -> Dictionary:
	var S := GameState.S
	var kalemler: Array = []
	var kg := cekirdek()
	if kg < float(_D().economy.minBeans):
		var n := ceili(float(_D().economy.minBeans) - kg - 1e-9)
		kalemler.append({"tutar": n * SP(_D().beans.brazil.price), "fn": func(): S.beans.brazil = {"kg": kg + n, "boughtDay": S.day}})
	if sut_gerekli() and sut() < float(_D().economy.minMilk):
		var n2 := ceili(float(_D().economy.minMilk) - sut() - 1e-9)
		kalemler.append({"tutar": n2 * SP(_D().milks.cow.price), "fn": func():
			S.milk = sut() + n2
			S.milkDay = S.day})
	for k in bardaklar_gereken():
		var var_olan := int(S.cups.get(k, 0))
		if var_olan < int(_D().cupMin):
			var p := ceili(float(int(_D().cupMin) - var_olan) / float(_D().cups[k].pack))
			kalemler.append({"tutar": p * SP(_D().cups[k].price), "fn": func(): S.cups[k] = int(S.cups.get(k, 0)) + p * int(_D().cups[k].pack)})
	var toplam := 0
	for x in kalemler:
		toplam += int(x.tutar)
	return {"kalemler": kalemler, "tutar": toplam}


func _v(x: float, basamak: int) -> String:
	return (("%." + str(basamak) + "f") % x).replace(".", ",")


func _al(tutar: int, fn: Callable) -> bool:
	var S := GameState.S
	if float(S.money) < tutar:
		return false
	S.money = float(S.money) - tutar
	S.spend = int(S.get("spend", 0)) + tutar
	fn.call()
	SaveSystem.yaz(GameState.yuva, S)
	return true


# ---------- tedarik ekranı (web renderSupply) ----------
## kip: "gunsonu" (Hesap'tan sonra, zorunlu), "baslat" (ilk tedarik / eksikle açılış), "ara" (dizüstüden, Kapat)
func _tedarik(kip: String) -> void:
	var S := GameState.S
	var eks := eksikler()
	var kaydir := ScrollContainer.new()
	kaydir.custom_minimum_size = Vector2(0, 440)
	kaydir.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 10)
	kaydir.add_child(v)
	var yenile := func():
		tedarik_kaydir = kaydir.scroll_vertical
		Flow.kapat(Flow.yigin.back())
		_tedarik(kip)

	v.add_child(Tema.yazi("Kasa: ₺" + GameState.tl(S.money), 22, Tema.ANA, true))
	var stok := "Çekirdek: "
	var parcalar: Array = []
	for id in acik_cekirdekler():
		parcalar.append("%s %s kg" % [_D().beans[id].name, _v(cekirdek(id), 2)])
	stok += " · ".join(parcalar)
	if sut_gerekli() or S.tools.get("milkKit", false):
		var sp2: Array = []
		for k in acik_sutler():
			sp2.append("%s %s L" % [_D().milks[k].short, _v(sut(k), 1)])
		stok += "\nSüt: " + " · ".join(sp2)
	var bp: Array = []
	for k in bardaklar_bilinen():
		bp.append("%s %d" % [_D().cups[k].name, int(S.cups.get(k, 0))])
	stok += "\nBardak: " + " · ".join(bp)
	v.add_child(_kutu("Mevcut stok", [Tema.yazi(stok, 17)]))

	if not eks.is_empty():
		var txt := ""
		for e in eks:
			txt += "• " + e + "\n"
		var plan := eksik_plani()
		txt += "Alttaki \"Eksikleri al\" düğmesi hepsini birden alır." if float(S.money) >= plan.tutar else "Kasada yeterli para yok."
		v.add_child(_kutu("Güne başlamadan önce eksik", [Tema.yazi(txt.strip_edges(), 17, Tema.TEHLIKE)]))
	else:
		v.add_child(Tema.yazi("Malzemeler tamam ✓", 18, Color("4f7a3a"), true))
	var biten: Array = []
	for k in _D().extras:
		if int(S.extras.get(k, 0)) <= 0:
			biten.append(_D().extras[k].name)
	if not biten.is_empty():
		v.add_child(Tema.yazi("⚠ Biten küçük malzeme: %s. Zorunlu değil; yoksa bahşiş azalır." % ", ".join(biten), 16, Color("8a6412")))

	# çekirdekler
	var sat: Array = []
	for id in acik_cekirdekler():
		var b: Dictionary = _D().beans[id]
		var fiyat_b := SP(b.price)
		sat.append([b.name, "stok %s kg · satış ×%s" % [_v(cekirdek(id), 2), _v(float(b.mult), 2)], fiyat_b, "1 kg al", func():
			if _al(fiyat_b, func(): S.beans[id] = {"kg": cekirdek(id) + 1.0, "boughtDay": S.day}): yenile.call()])
	var sonraki_c := ""
	var kilitli: Array = []
	for id in _D().beans:
		if not cekirdek_acik(id):
			kilitli.append(id)
	kilitli.sort_custom(func(x, y): return [int(_D().beans[x].get("unlock", 1)), int(_D().beans[x].get("cups", 0))] < [int(_D().beans[y].get("unlock", 1)), int(_D().beans[y].get("cups", 0))])
	if not kilitli.is_empty():
		var nb: Dictionary = _D().beans[kilitli[0]]
		sonraki_c = "🔒 Sıradaki: %s — %d★ dükkan" % [nb.name, int(nb.get("unlock", 1))]
		if int(nb.get("cups", 0)) > 0:
			sonraki_c += " ve tarif ilerlemesi %d (şu an %d)" % [int(nb.cups), tarif_ilerlemesi()]
	v.add_child(_bolum("Çekirdekler (₺/kg)", "Müşteri istediği çekirdek yoksa gider. Brezilya ev çekirdeği: en az %s kg." % _v(float(_D().economy.minBeans), 1), sat, sonraki_c))

	# sütler
	if sut_gerekli() or S.tools.get("milkKit", false):
		var raf: int = _D().economy.milkShelfDays if S.equipment.get("fridge", false) else _D().economy.milkShelfNoFridge
		var ss: Array = []
		for k in acik_sutler():
			var mk: Dictionary = _D().milks[k]
			var fiyat_m := SP(mk.price)
			ss.append([mk.name + (" · siparişe +₺%s" % GameState.tl(mk.extra) if int(mk.extra) > 0 else ""), "stok %s L" % _v(sut(k), 1), fiyat_m, "1 L al", func():
				if _al(fiyat_m, func():
					if k == "cow":
						S.milk = sut() + 1.0
					else:
						S.milkAlt[k] = sut(k) + 1.0
					S.milkDay = S.day): yenile.call()])
		v.add_child(_bolum("Sütler (₺/L)", "Süt %d gün dayanır%s. Yeni süt alınca gün yenilenir. İnek sütü en az %s L." % [raf, "" if S.equipment.get("fridge", false) else " (buzdolabıyla %d)" % int(_D().economy.milkShelfDays), _v(float(_D().economy.minMilk), 0)], ss, ""))

	# bardaklar
	var bs: Array = []
	for k in bardaklar_bilinen():
		var cp: Dictionary = _D().cups[k]
		var fiyat_c := SP(cp.price)
		bs.append([cp.name, "stok %d adet" % int(S.cups.get(k, 0)), fiyat_c, "%d'lu paket al" % int(cp.pack), func():
			if _al(fiyat_c, func(): S.cups[k] = int(S.cups.get(k, 0)) + int(cp.pack)): yenile.call()])
	v.add_child(_bolum("Bardaklar (10'lu paket)", "Bardak yoksa müşteri o boyu alamaz, gider. Her türden en az %d adet." % int(_D().cupMin), bs, ""))

	# özel malzemeler
	var os: Array = []
	for k in _D().specials:
		if not ozel_acik(k) or _D().specials[k].get("brew", false):
			continue
		var sp: Dictionary = _D().specials[k]
		var fiyat_s := SP(sp.price)
		os.append([sp.name, "stok %d %s" % [ozel_stok(k), sp.unit], fiyat_s, "%d %s al" % [int(sp.pack), sp.unit], func():
			if _al(fiyat_s, func(): S.syr[k] = int(S.syr.get(k, 0)) + int(sp.pack)): yenile.call()])
	if not os.is_empty():
		v.add_child(_bolum("Şuruplar, soslar ve özel malzemeler", "Stokta yoksa müşteri gider.", os, ""))

	# küçük malzemeler
	var ks: Array = []
	for k in _D().extras:
		var e: Dictionary = _D().extras[k]
		var n := int(S.extras.get(k, 0))
		var fiyat_e := SP(e.price)
		ks.append([e.name, "stok %d adet%s" % [n, " · bitti" if n == 0 else (" · az kaldı" if n < int(_D().extrasLow) else "")], fiyat_e, "%d'lü paket al" % int(e.pack), func():
			if _al(fiyat_e, func(): S.extras[k] = int(S.extras.get(k, 0)) + int(e.pack)): yenile.call()])
	v.add_child(_bolum("Küçük malzemeler", "Ara sıra kullanılır; yoksa bahşiş azalır.", ks, ""))

	var dugmeler: Array = []
	if kip == "gunsonu":
		dugmeler.append({"metin": "← Geri", "fn": _hesap})
	if not eks.is_empty():
		var plan2 := eksik_plani()
		dugmeler.append({"metin": "Eksikleri al · ₺%s" % GameState.tl(plan2.tutar), "tur": "ana", "kapali": float(S.money) < plan2.tutar, "fn": func():
			_al(plan2.tutar, func():
				for x in plan2.kalemler:
					x.fn.call())
			_tedarik(kip)})
	if kip == "ara":
		dugmeler.append({"metin": "Kapat", "tur": "" if not eks.is_empty() else "ana", "fn": _ekrandan_cik})
	elif eks.is_empty():
		if kip == "baslat":
			dugmeler.append({"metin": "Günü başlat ☕", "tur": "ana", "fn": func():
				S.firstSupply = false
				SaveSystem.yaz(GameState.yuva, S)
				_ekrandan_cik()
				_ac()})
		else:
			dugmeler.append({"metin": "Devam", "tur": "ana", "fn": _yeni_gun})
	Flow.pencere("Tedarik", kaydir, dugmeler, _ekrandan_cik, 780)
	kaydir.set_deferred("scroll_vertical", tedarik_kaydir)
	tedarik_kaydir = 0


func _kutu(baslik: String, icerik: Array) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", Tema.kutu(Tema.DUGME, 10))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	p.add_child(v)
	v.add_child(Tema.yazi(baslik, 19, Tema.KAHVE, true))
	for c in icerik:
		v.add_child(c)
	return p


## satirlar: [ad, alt satır, fiyat, düğme yazısı, fn]
func _bolum(baslik: String, aciklama: String, satirlar: Array, not_: String) -> PanelContainer:
	var icerik: Array = [Tema.yazi(aciklama, 15, Tema.SOLUK)]
	var g := GridContainer.new()
	g.columns = 3
	g.add_theme_constant_override("h_separation", 14)
	g.add_theme_constant_override("v_separation", 6)
	for s in satirlar:
		var ad := VBoxContainer.new()
		ad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ad.add_theme_constant_override("separation", 0)
		ad.add_child(Tema.yazi(s[0], 17, Tema.KAHVE, true))
		ad.add_child(Tema.yazi(s[1], 14, Tema.SOLUK))
		g.add_child(ad)
		var f := Tema.yazi("₺" + GameState.tl(s[2]), 17)
		f.autowrap_mode = TextServer.AUTOWRAP_OFF
		f.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		g.add_child(f)
		var b := Tema.dugme(s[3])
		b.add_theme_font_size_override("font_size", 16)
		b.add_theme_stylebox_override("normal", Tema.kutu(Tema.KREM, 8, 1, Tema.ANA))
		b.add_theme_stylebox_override("hover", Tema.kutu(Color.WHITE, 8, 1, Tema.ANA))
		b.add_theme_stylebox_override("pressed", Tema.kutu(Tema.DUGME_UST, 8, 1, Tema.ANA))
		b.add_theme_stylebox_override("disabled", Tema.kutu(Color(Tema.KREM, 0.5), 8, 1, Color(Tema.ANA, 0.3)))
		b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		b.disabled = float(GameState.S.money) < int(s[2])
		var fn: Callable = s[4]
		b.pressed.connect(fn)
		g.add_child(b)
	icerik.append(g)
	if not_ != "":
		icerik.append(Tema.yazi(not_, 15, Tema.SOLUK))
	return _kutu(baslik, icerik)
