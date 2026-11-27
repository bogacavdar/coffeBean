extends "res://dukkan/stok.gd"
## Fiyat, borsa, gazete, hava ve mevsim (tasarım belgesi §4 "Fiyat, borsa, gazete, hava ve mevsim (taşıma adımı T7)");
## web renderPrices, rollReaction, updateMarket, showNews, rollWeather, inSeason.

var hava := ""                             ## "", "rain", "hot", "crowd"
var fiyat_kaydir := 0


func _ready() -> void:
	super._ready()
	if menu_modu or bitti:
		return
	var S := GameState.S
	var ilk_gun: bool = int(S.day) == 1 and not "first" in S.get("taught", [])
	if not ilk_gun:
		hava = _hava_sec()
	if hava == "crowd":
		gelecek = roundi(gelecek * float(_D().weather.saturdayCrowd))
	var isik := 1.0 if hava == "" or hava == "crowd" else (0.4 if hava == "rain" else 1.35)
	for n in find_children("*", "DirectionalLight3D", true, false):
		(n as DirectionalLight3D).light_energy *= isik


## web rollWeather: cumartesi kalabalık; diğer günler %25 yağmur, %25 sıcak.
func _hava_sec() -> String:
	if int(GameState.S.day) % 7 == 6:
		return "crowd"
	var r := rng.randf()
	var W: Dictionary = _D().weather
	if r < float(W.rain.p):
		return "rain"
	if r < float(W.rain.p) + float(W.hot.p):
		return "hot"
	return ""


func _ac() -> void:
	super._ac()
	if hava == "rain":
		flash = "Yağmurlu gün: sıcak kahveler daha çok istenir"
	elif hava == "hot":
		flash = "Sıcak gün: buzlu kahveler daha çok istenir"
	elif hava == "crowd":
		flash = "Kalabalık gün: müşteri her zamankinden çok"


func _sag_ust() -> String:
	var s := super._sag_ust()
	if hava != "":
		var parca := s.split(" · ")
		parca.insert(2, String(_D().weather[hava].name))
		s = " · ".join(parca)
	return s


# ---------- mevsim ve menü ----------
func mevsim_no() -> int:
	return ((int(GameState.S.day) - 1) % 112) / 28


func _istenebilir(id: String) -> bool:
	if not super._istenebilir(id):
		return false
	var mev = Content.tarif(id).get("season")
	if mev != null and not float(mevsim_no()) in mev and not mevsim_no() in mev:
		return false
	for u in Content.tarif(id).get("uses", []):
		if ozel_stok(u[0]) <= 0:
			return false
	return true


func _buzlu(id: String) -> bool:
	for b in Content.tarif(id).get("sizes", []):
		if String(b).begins_with("i"):
			return true
	return false


func _tarif_sec(menu: Array) -> String:
	var W: Dictionary = _D().weather
	var agirlik := func(id: String) -> float:
		if hava == "" or hava == "crowd":
			return 1.0
		if hava == "rain":
			return float(W.rain.iced) if _buzlu(id) else float(W.rain.hot)
		return float(W.hot.iced) if _buzlu(id) else 1.0
	var toplam := 0.0
	for id in menu:
		toplam += agirlik.call(id)
	var r := rng.randf() * toplam
	for id in menu:
		r -= agirlik.call(id)
		if r <= 0.0:
			return id
	return menu[menu.size() - 1]


# ---------- fiyat tepkisi (web rollReaction, fiyata duyarlı tip) ----------
func endeks(id: String) -> float:
	return float(GameState.S.get("market", {}).get(id, 1.0))


func _gelmez(tip: String, tarif: String) -> bool:
	return float(_D().customers[tip].priceSens) >= 1.0 and float(fiyat(tarif)) / varsayilan_fiyat(tarif) > 1.2 and rng.randf() < 0.6


func _siparis_onay(m: Dictionary) -> bool:
	var P: Dictionary = _D().pricing
	var boy_fiyat := maxi(1, roundi(fiyat(m.tarif) * float(_boy(m.boy).price)))
	var d := boy_fiyat / (varsayilan_fiyat(m.tarif) * endeks(m.tarif) * float(_boy(m.boy).price)) - 1.0
	var olas := func(x: float) -> float: return minf(1.0, (x - float(P.neutral)) / (float(P.all) - float(P.neutral)))
	if d > float(P.neutral) and rng.randf() < olas.call(d):
		sira.erase(m)
		stokta["pricey"] = int(stokta.get("pricey", 0)) + 1
		var b := Label3D.new()
		b.text = "Çok pahalı! Almıyorum."
		b.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		b.pixel_size = 0.0022
		b.font_size = 44
		b.outline_size = 14
		b.modulate = Color("8a6412")
		b.outline_modulate = Color("fbf6ee")
		b.position = Vector3(0, 2.2, 0)
		m.node.add_child(b)
		_yuzen(m.node, "Pahalı!", Color("e9c46a"), 0.0)
		flash = "%s · Çok pahalı buldu, almadan gitti" % m.ad
		_cikar(m)
		return false
	if d < -float(P.neutral) and rng.randf() < olas.call(-d):
		_yuzen(m.node, "Ucuz!", Color("9cc77a"), 0.0)
		flash = "%s · \"Ne kadar ucuz!\"" % m.ad
	return true


# ---------- borsa ve gazete ----------
func _gun_bitti() -> void:
	super._gun_bitti()
	var S := GameState.S
	if int(S.day) % 7 == 0:
		son.L.news = _borsa()
		S.endPending = son
		SaveSystem.yaz(GameState.yuva, S)


## web updateMarket: her tarifin endeksi ±%12, 0,7–1,4; gazetede menüdeki en çok değişen 3.
func _borsa() -> Array:
	var S := GameState.S
	var M: Dictionary = _D().market
	if not S.has("market"):
		S.market = {}
	var degisim: Array = []
	for id in _D().drinks:
		var eski := endeks(id)
		var yeni := clampf(eski * (1.0 + (rng.randf() * 2.0 - 1.0) * float(M.weeklyMax)), float(M.min), float(M.max))
		S.market[id] = roundf(yeni * 100.0) / 100.0
		if id in S.unlocked and aletleri_var(id):
			degisim.append([id, float(S.market[id]) / eski - 1.0])
	degisim.sort_custom(func(a, b): return absf(a[1]) > absf(b[1]))
	return degisim.slice(0, int(M.news))


func _ertesi_gun() -> void:
	var haber: Array = son.L.get("news", [])
	if haber.is_empty() or son.get("advanced", false):
		super._ertesi_gun()
		return
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	for h in haber:
		var ad: String = Content.tarif(h[0]).name
		var c: float = h[1]
		v.add_child(Tema.yazi("%s fiyatları %%%d %s" % [ad, absi(roundi(c * 100)), "arttı ▲" if c >= 0 else "düştü ▼"], 20, Tema.KAHVE, true))
		v.add_child(Tema.yazi("Müşteriler artık %s için %s fiyatı makul buluyor (endeks ×%s)." % [ad.to_lower(), "biraz daha yüksek" if c >= 0 else "biraz daha düşük", _v(endeks(h[0]), 2)], 16, Tema.SOLUK))
	Flow.pencere("KAHVE GAZETESİ · %d. Hafta · Borsa" % GameState.hafta_no(son.dayNum), v, [
		{"metin": "← Geri", "fn": _hesap}, {"metin": "Devam", "tur": "ana", "fn": _gazeteden_sonra}], _ekrandan_cik, 640)


func _gazeteden_sonra() -> void:
	super._ertesi_gun()


## Tedarik'ten sonra Fiyatlar, sonra ertesi gün.
func _yeni_gun() -> void:
	_fiyatlar("gunsonu")


## Fiyatlar'ın "← Geri"si (T12: Dükkan'a döner).
func _fiyat_geri() -> void:
	_tedarik("gunsonu")


func _fiyatlardan_sonra() -> void:
	super._yeni_gun()


# ---------- dizüstü: gün içinde Tedarik / Fiyatlar ----------
func interact(id: String) -> void:
	if id == "dizustu" and not bitti:
		_ekrana_gec()
		var v := VBoxContainer.new()
		v.add_child(Tema.yazi("Ne yapmak istiyorsun?", 18, Tema.SOLUK))
		Flow.pencere("Dizüstü", v, [
			{"metin": "Kapat", "fn": _ekrandan_cik},
			{"metin": "Fiyatlar", "fn": func(): _fiyatlar("ara")},
			{"metin": "Tedarik", "tur": "ana", "fn": func(): _tedarik("ara")}], _ekrandan_cik, 460)
		return
	super.interact(id)


func action_text(id: String) -> String:
	if id == "dizustu" and not bitti:
		return "E: Dizüstü (tedarik, fiyatlar)"
	return super.action_text(id)


# ---------- Fiyatlar ekranı (web renderPrices) ----------
func _boy_fiyat(id: String, b: String) -> int:
	return maxi(1, roundi(fiyat(id) * float(_boy(b).price)))


func _fiyatlar(kip: String) -> void:
	var S := GameState.S
	var adim := int(_D().pricing.get("stepTL", 5))
	var kaydir := ScrollContainer.new()
	kaydir.custom_minimum_size = Vector2(0, 380)
	kaydir.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 10)
	kaydir.add_child(v)
	v.add_child(Tema.yazi("Kasa: ₺" + GameState.tl(S.money), 22, Tema.ANA, true))
	v.add_child(Tema.yazi("\"Çok pahalı\" deyip gidiyorlarsa düşür, \"ucuz\" diyorlarsa artır. Sıradaki müşteriden itibaren geçerli.", 16, Tema.SOLUK))
	var g := GridContainer.new()
	g.columns = 3
	g.add_theme_constant_override("h_separation", 16)
	g.add_theme_constant_override("v_separation", 10)
	v.add_child(g)
	for baslik in ["Tarif", "Maliyet", "Senin fiyatın"]:
		var bl := Tema.yazi(baslik, 15, Tema.SOLUK, true)
		bl.autowrap_mode = TextServer.AUTOWRAP_OFF
		g.add_child(bl)
	var yenile := func():
		fiyat_kaydir = kaydir.scroll_vertical
		Flow.kapat(Flow.yigin.back())
		_fiyatlar(kip)
	var eksik_alet: Array = []
	for id in S.unlocked:
		if not aletleri_var(id):
			eksik_alet.append(Content.tarif(id).name)
			continue
		var d := Content.tarif(id)
		var boylar: Array = d.get("sizes", ["single"])
		var ilk: String = boylar[0]
		var ad := VBoxContainer.new()
		ad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ad.add_child(Tema.yazi(d.name, 18, Tema.KAHVE, true))
		if boylar.size() > 1:
			var diger: Array = []
			for b in boylar.slice(1):
				diger.append("%s ₺%s" % [_boy(b).label, GameState.tl(_boy_fiyat(id, b))])
			ad.add_child(Tema.yazi("Fiyat %s için · %s (otomatik)" % [_boy(ilk).label, " · ".join(diger)], 14, Tema.SOLUK))
		else:
			ad.add_child(Tema.yazi("%s boy" % _boy(ilk).label, 14, Tema.SOLUK))
		g.add_child(ad)
		var maliyet := _cekirdek_kg(id, ilk) * float(_D().beans.brazil.price) + _sut_l(id, ilk) * float(_D().economy.milkPrice) + float(d.cost)
		var ml := Tema.yazi("₺" + _v(maliyet, 1), 17)
		ml.autowrap_mode = TextServer.AUTOWRAP_OFF
		ml.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		g.add_child(ml)
		var p := fiyat(id)
		var ust := maxi(2, roundi(varsayilan_fiyat(id) * float(_D().pricing.max)))
		var ayarla := func(x: int):
			if not S.has("priceTL"):
				S.priceTL = {}
			S.priceTL[id] = clampi(x, 1, ust)
			SaveSystem.yaz(GameState.yuva, S)
			yenile.call()
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 6)
		var eksi := Tema.dugme("−₺%d" % adim)
		eksi.disabled = p <= 1
		eksi.pressed.connect(func(): ayarla.call(p - adim))
		var kutu := LineEdit.new()
		kutu.text = str(p)
		kutu.custom_minimum_size.x = 80
		kutu.alignment = HORIZONTAL_ALIGNMENT_CENTER
		kutu.text_submitted.connect(func(s: String):
			if s.is_valid_int() and int(s) > 0:
				ayarla.call(int(s))
			else:
				yenile.call())
		var arti := Tema.dugme("+₺%d" % adim)
		arti.disabled = p >= ust
		arti.pressed.connect(func(): ayarla.call(p + adim))
		h.add_child(eksi)
		h.add_child(kutu)
		h.add_child(arti)
		g.add_child(h)
	if not eksik_alet.is_empty():
		v.add_child(Tema.yazi("Aleti eksik olduğu için menüde olmayan: %s." % ", ".join(eksik_alet), 15, Tema.SOLUK))
	var dugmeler: Array = []
	if kip == "gunsonu":
		dugmeler.append({"metin": "← Geri", "fn": _fiyat_geri})
		dugmeler.append({"metin": "Devam", "tur": "ana", "fn": _fiyatlardan_sonra})
	else:
		dugmeler.append({"metin": "Kapat", "tur": "ana", "fn": _ekrandan_cik})
	Flow.pencere("Fiyatlar", kaydir, dugmeler, _ekrandan_cik, 760)
	kaydir.set_deferred("scroll_vertical", fiyat_kaydir)
	fiyat_kaydir = 0
