extends "res://dukkan/yardimci.gd"
## Kahve Defteri, başarımlar ve ipuçları (tasarım belgesi §4 "Kahve Defteri, başarımlar ve ipuçları (taşıma adımı T17)");
## web renderBook, ach, checkAch, finishStep tipsLearned.

const DEFTER_POS := Vector3(-1.25, 0.955, -2.7)

var son_dokme_puani := 0.0


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	var kitap := Node3D.new()
	kitap.position = DEFTER_POS
	kitap.rotation_degrees.y = 12
	add_child(kitap)
	_k(kitap, Vector3(0, 0.025, 0), Vector3(0.24, 0.05, 0.3), Color("5a3220"), 0.6)
	_k(kitap, Vector3(0.006, 0.025, 0), Vector3(0.23, 0.04, 0.29), Color("efe3c8"), 0.9)
	_k(kitap, Vector3(0, 0.051, 0), Vector3(0.245, 0.006, 0.305), Color("5a3220"), 0.6)
	_k(kitap, Vector3(-0.1, 0.055, 0), Vector3(0.02, 0.004, 0.3), Color("c9a24a"), 0.3, 0.8)
	collider(DEFTER_POS + Vector3(0, 0.04, 0), Vector3(0.32, 0.14, 0.36), "defter")
	_basarim_denetle(null)


func action_text(id: String) -> String:
	if id == "defter":
		return "E: Kahve Defteri"
	return super.action_text(id)


func interact(id: String) -> void:
	if id == "defter":
		_ekrana_gec()
		_defter()
		return
	super.interact(id)


# ---------- başarımlar (web ach / checkAch) ----------
func basarim(id: String) -> void:
	var S := GameState.S
	if not S.has("ach"):
		S.ach = []
	if id in S.ach:
		return
	var a: Dictionary = {}
	for x in _D().achievements:
		if x.id == id:
			a = x
	if a.is_empty():
		return
	S.ach.append(id)
	S.log.append("Gün %d: başarım · %s" % [int(S.day), a.name])
	SaveSystem.yaz(GameState.yuva, S)
	get_tree().create_timer(1.2).timeout.connect(func(): flash = "Başarım: " + String(a.name))


func _basarim_denetle(m) -> void:
	var S := GameState.S
	var mukemmel := 0
	for k in S.get("perfect", {}):
		mukemmel += int(S.perfect[k])
	var satilan := 0
	for k in S.get("served", {}):
		satilan += int(S.served[k])
	if mukemmel >= 1: basarim("perfect1")
	if int(S.get("perfect", {}).get("espresso", 0)) >= 50: basarim("esp50")
	if satilan >= 100: basarim("serve100")
	if satilan >= 500: basarim("serve500")
	for g in _D().drinkGroups:
		if g.name == "Türk ve geleneksel":
			var hepsi := true
			for id in g.ids:
				hepsi = hepsi and int(S.get("served", {}).get(id, 0)) > 0
			if hepsi and not (g.ids as Array).is_empty():
				basarim("tradAll")
	if m != null:
		var ct: Dictionary = _D().customers.get(m.tip, {})
		if ct.get("special", false) and not ct.get("jury", false):
			basarim("special1")
	if _yildiz() >= 3: basarim("shop3")
	if _yildiz() >= 5: basarim("shop5")


func _servis_sonrasi(m: Dictionary, tutar: int, bahsis: int, servis: int) -> void:
	super._servis_sonrasi(m, tutar, bahsis, servis)
	_basarim_denetle(m)


func _seviye_atla(yenile: Callable) -> void:
	super._seviye_atla(yenile)
	_basarim_denetle(null)


func _juri(puan: int) -> void:
	var once: int = (GameState.S.get("medals", []) as Array).size()
	super._juri(puan)
	var md: Array = GameState.S.get("medals", [])
	if md.size() > once and md.back().name == "Altın":
		basarim("gold")


# ---------- ipuçları (web finishStep tipsLearned) ----------
func ipucu(anahtar: String) -> void:
	var S := GameState.S
	if not S.has("tipsLearned"):
		S.tipsLearned = []
	if anahtar in S.tipsLearned or not _D().tips.has(anahtar):
		return
	S.tipsLearned.append(anahtar)
	SaveSystem.yaz(GameState.yuva, S)
	get_tree().create_timer(1.0).timeout.connect(func(): flash = "Deftere yazıldı: " + String(_D().tips[anahtar]))


func close_panel(score: float, label: String) -> void:
	var m := mode
	super.close_panel(score, label)
	if score >= 70.0:
		return
	match m:
		"dose": ipucu("dose_low" if dose_g < float(DOSE[held_size]) else "dose_high")
		"tamp": ipucu("tamp_low")
		"pull": ipucu("extract_low" if pull_g < float(YIELD[held_size]) else "extract_high")


func finish_steam() -> void:
	var sicaklik := milk_temp
	super.finish_steam()
	if not step_scores.is_empty() and float(step_scores.back()) < 70.0:
		ipucu("milk_low" if sicaklik < MILK_TARGET else "milk_high")


func finish_pour() -> void:
	var dolu := pour_fill
	super.finish_pour()
	if step_scores.is_empty():
		return
	son_dokme_puani = float(step_scores.back())
	if son_dokme_puani >= 95.0:
		basarim("art95")
	elif son_dokme_puani < 70.0:
		ipucu("art_low" if dolu < 0.9 else "art_high")


# ---------- Kahve Defteri penceresi (web renderBook) ----------
func _defter() -> void:
	var S := GameState.S
	var kaydir := ScrollContainer.new()
	kaydir.custom_minimum_size = Vector2(0, 470)
	kaydir.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 10)
	kaydir.add_child(v)
	var r := rutbe()
	_dukkan_bolum(v, "Barista: " + String(r.name), "XP %d. Rütbe yükseldikçe kabul aralıkları daralır, bahşiş artar." % int(S.xp))
	# tarif kartları
	var b2 := _dukkan_bolum(v, "Tarif kartları", "")
	for id in _D().drinks:
		if not id in S.unlocked:
			continue
		var d: Dictionary = _D().drinks[id]
		var not_ := "%d servis, %d mükemmel" % [int(S.served.get(id, 0)), int(S.perfect.get(id, 0))]
		if not aletleri_var(id):
			var eksik: Array = []
			for a in d.get("needs", []):
				if not S.tools.get(a, false):
					eksik.append(_D().tools[a].name)
			not_ += " · Gerekli alet: " + ", ".join(eksik)
		elif not YAPILABILIR.has(id):
			not_ += " · istasyonu sonra gelecek"
		var satir := Tema.yazi("%s  ·  %s" % [d.name, not_], 16)
		b2.add_child(satir)
	var dk_satir: Array = []
	for l in _D().shopLevels:
		var ids: Array = []
		var acik_n := 0
		for id in _D().drinks:
			if int(_D().drinks[id].get("shop", 1)) == int(l.stars):
				ids.append(id)
				if id in S.unlocked:
					acik_n += 1
		dk_satir.append("%s %s: %d/%d açık%s" % ["★".repeat(int(l.stars)), l.name, acik_n, ids.size(), " ✓" if acik_n == ids.size() else ""])
	b2.add_child(Tema.yazi("\n".join(dk_satir), 15, Tema.SOLUK))
	var kilitli: int = _D().drinks.size() - (S.unlocked as Array).size()
	if kilitli > 0:
		var nx := sonraki_tarif()
		var s := "%d kilitli tarif" % kilitli
		if nx != "":
			var nd: Dictionary = _D().drinks[nx]
			if int(nd.get("shop", 1)) > _yildiz():
				s += " · Sıradaki tarif %d★ dükkanda açılır; o zamana kadar sayaç durur" % int(nd.shop)
			else:
				var kalan := int(nd.unlockCups) - tarif_ilerlemesi()
				s += " · " + ("Sıradaki: %d kahve daha sat" % kalan if kalan > 0 else "Sıradaki tarif hazır")
		b2.add_child(Tema.yazi(s, 15, Tema.SOLUK))
	# başarımlar
	var ach: Array = S.get("ach", [])
	var b3 := _dukkan_bolum(v, "Başarımlar (%d/%d)" % [ach.size(), (_D().achievements as Array).size()], "")
	for a in _D().achievements:
		var var_: bool = a.id in ach
		b3.add_child(Tema.yazi(("✓ " if var_ else "kilitli · ") + String(a.name) + "  ·  " + String(a.desc), 16, Tema.KAHVE if var_ else Tema.SOLUK, var_))
	var md: Array = S.get("medals", [])
	if not md.is_empty():
		var parca: Array = []
		for x in md:
			parca.append("%s Gün %d (%d)" % [x.name, int(x.day), int(x.avg)])
		b3.add_child(Tema.yazi("Madalyalar: " + " · ".join(parca), 16, Color("8a6412"), true))
	# sadık müşteriler
	var L: Dictionary = _D().loyalty
	var b4 := _dukkan_bolum(v, "Sadık müşteriler", "Bir tipe art arda %d mükemmel servis → sabır ×%s, bahşiş ×%s." % [int(L.need), str(L.patience).replace(".", ","), str(L.tip).replace(".", ",")])
	for k in NORMAL_TIPLER:
		var n := int(S.get("loyal", {}).get(k, 0))
		b4.add_child(Tema.yazi("%s %s  ·  %d/%d" % ["♥" if n >= int(L.need) else "♡", _D().customers[k].name, mini(n, int(L.need)), int(L.need)], 16))
	# ipuçları
	var b5 := _dukkan_bolum(v, "Öğrenilen ipuçları", "")
	var ip: Array = S.get("tipsLearned", [])
	if ip.is_empty():
		b5.add_child(Tema.yazi("Henüz yok. Her hata bir ders verir.", 16, Tema.SOLUK))
	for k in ip:
		b5.add_child(Tema.yazi("• " + String(_D().tips.get(k, k)), 16))
	# menşe sayfaları
	var b6 := _dukkan_bolum(v, "Menşe sayfaları", "")
	for id in _D().beans:
		if S.beans.has(id):
			var bn: Dictionary = _D().beans[id]
			b6.add_child(Tema.yazi(bn.name, 17, Tema.KAHVE, true))
			b6.add_child(Tema.yazi(String(bn.get("page", "")), 16))
			b6.add_child(Tema.yazi(String(bn.get("notes", "")), 15, Tema.SOLUK))
	# günlük
	var b7 := _dukkan_bolum(v, "Günlük", "")
	var log_: Array = S.get("log", [])
	var son8: Array = log_.slice(maxi(0, log_.size() - 8))
	son8.reverse()
	b7.add_child(Tema.yazi("\n".join(son8) if not son8.is_empty() else "—", 15, Tema.SOLUK))
	Flow.pencere("Kahve Defteri", kaydir, [{"metin": "Kapat", "tur": "ana", "fn": _pencereden_cik}], _pencereden_cik, 760)
