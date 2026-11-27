extends "res://dukkan/piyasa.gd"
## Krediler ve iflas (tasarım belgesi §4 "Krediler ve iflas (taşıma adımı T8)"); web takeLoan, loansHTML, bindLoans,
## endDay %20 kesinti ve vade iflası, showRent "Kredi çek", showLedger zorunlu kira kredisi.


# ---------- web yardımcıları ----------
func _E() -> Dictionary:
	return _D().economy


func borc_esitle() -> void:
	var S := GameState.S
	var kalan: Array = []
	var toplam := 0
	for l in S.get("loans", []):
		if int(l.rem) > 0:
			kalan.append(l)
			toplam += int(l.rem)
	S.loans = kalan
	S.debt = toplam


func geri_odeme(x: int) -> int:
	return roundi(x * (1.0 + float(_E().loanInterest)))


func limit_yeri() -> int:
	return int(GameState.dukkan(GameState.S.shopLevel).loanLimit) - int(GameState.S.get("debt", 0))


func kredi_al(x: int, gun: int) -> void:
	var S := GameState.S
	S.loanSeq = int(S.get("loanSeq", 0)) + 1
	var odenecek := geri_odeme(x)
	S.loans.append({"id": S.loanSeq, "amount": x, "owe": odenecek, "rem": odenecek, "day": int(S.day), "due": int(S.day) + gun})
	S.money = float(S.money) + x
	borc_esitle()
	S.log.append("Gün %d: bankadan ₺%s kredi (%d gün vade)" % [int(S.day), GameState.tl(x), gun])
	SaveSystem.yaz(GameState.yuva, S)


func kalan_gun(l: Dictionary) -> int:
	return maxi(0, int(l.due) - int(GameState.S.day))


func en_yakin() -> Dictionary:
	var en: Dictionary = {}
	for l in GameState.S.get("loans", []):
		if en.is_empty() or int(l.due) < int(en.due):
			en = l
	return en


# ---------- gün sonu: %20 kesinti, vadesi geçen kredi ----------
func _gun_bitti() -> void:
	super._gun_bitti()
	var S := GameState.S
	borc_esitle()
	if int(S.debt) > 0:
		var kes := mini(int(S.debt), roundi((int(son.st.income) + int(son.st.tips)) * float(_E().loanDailyCut)))
		son.L.cut = kes
		S.money = float(S.money) - kes
		var sirali: Array = S.loans.duplicate()
		sirali.sort_custom(func(a, b): return int(a.due) < int(b.due))
		for l in sirali:
			var x := mini(int(l.rem), kes)
			l.rem = int(l.rem) - x
			kes -= x
		borc_esitle()
		S.endPending = son
		SaveSystem.yaz(GameState.yuva, S)
	for l in S.loans:
		if int(l.rem) > 0 and int(S.day) >= int(l.due):
			_iflas(0, "Kredi #%d (₺%s → ₺%s) vadesi doldu ve ₺%s borç ödenmedi." % [int(l.id), GameState.tl(l.amount), GameState.tl(l.owe), GameState.tl(l.rem)])
			return


# ---------- Kira ve Hesap kancaları ----------
func _en_buyuk_kredi() -> int:
	var en := 0
	for k in _E().loans:
		if geri_odeme(int(k.amount)) <= limit_yeri():
			en = maxi(en, int(k.amount))
	return en


func _kira_kredi_dugmesi() -> Array:
	return [{"metin": "Kredi çek", "fn": func(): _krediler(_kira)}]


func _hesap_kredi_satirlari() -> Array:
	var out: Array = []
	for l in GameState.S.get("loans", []):
		var g := int(l.due) - int(son.dayNum)
		out.append(["Kredi #%d (₺%s → ₺%s) · vade" % [int(l.id), GameState.tl(l.amount), GameState.tl(l.owe)], "₺%s kaldı · %s" % [GameState.tl(l.rem), "bugün" if g <= 0 else "%d gün" % g]])
	return out


## Kasa eksideyse zorunlu kira kredisi (web showLedger "short").
func _hesap() -> void:
	var S := GameState.S
	if float(S.money) >= 0:
		super._hesap()
		return
	var adim := int(_E().rentLoanStep)
	var gerek := ceili(-float(S.money) / adim) * adim
	if int(S.get("debt", 0)) + geri_odeme(gerek) > int(GameState.dukkan(S.shopLevel).loanLimit):
		_iflas(gerek)
		return
	var metin := "Kasa eksiye düştü. Devam etmek için bankadan en az ₺%s kredi çekmelisin (kira kredisi: geri ödeme ₺%s, %%10 fazla, %d gün vade)." % [GameState.tl(gerek), GameState.tl(geri_odeme(gerek)), int(_E().rentLoanDays)]
	Flow.pencere("Kasa eksi", Tema.yazi(metin), [
		{"metin": "← Geri", "fn": _kira},
		{"metin": "Kredi çek (₺%s)" % GameState.tl(gerek), "tur": "ana", "fn": func():
			kredi_al(gerek, int(_E().rentLoanDays))
			_hesap()}], _ekrandan_cik, 600)


func _tedarik_kredi_dugmesi(kip: String) -> Array:
	return [{"metin": "Kredi al", "fn": func(): _krediler(func(): _tedarik(kip))}]


# ---------- Krediler penceresi (web loansHTML) ----------
func _krediler(sonra: Callable) -> void:
	var S := GameState.S
	borc_esitle()
	var dk := GameState.dukkan(S.shopLevel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	v.add_child(Tema.yazi("Kasa: ₺" + GameState.tl(S.money), 22, Tema.ANA, true))
	v.add_child(Tema.yazi("Her kredi ayrı ödenir; geri ödeme %10 fazladır. Gün sonunda gelirin %20'si vadesi en yakın krediden kesilir. Vadesi dolan krediyi ödemezsen iflas edersin.", 16, Tema.SOLUK))
	v.add_child(Tema.yazi("Toplam borç: ₺%s · limit ₺%s" % [GameState.tl(S.debt), GameState.tl(dk.loanLimit)], 18, Tema.KAHVE, true))
	var yenile := func():
		Flow.kapat(Flow.yigin.back())
		_krediler(sonra)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	for k in _E().loans:
		var x := int(k.amount)
		var gun := int(k.days)
		var b := Tema.dugme("₺%s al → ₺%s öde · %d gün" % [GameState.tl(x), GameState.tl(geri_odeme(x)), gun])
		b.disabled = geri_odeme(x) > limit_yeri()
		b.pressed.connect(func():
			kredi_al(x, gun)
			yenile.call())
		h.add_child(b)
	v.add_child(h)
	if S.loans.is_empty():
		v.add_child(Tema.yazi("Açık kredin yok.", 16, Tema.SOLUK))
	for l in S.loans:
		var satir := PanelContainer.new()
		satir.add_theme_stylebox_override("panel", Tema.kutu(Tema.DUGME, 10))
		var hv := VBoxContainer.new()
		satir.add_child(hv)
		var g := kalan_gun(l)
		hv.add_child(Tema.yazi("#%d · ₺%s kredi → ₺%s geri ödeme" % [int(l.id), GameState.tl(l.amount), GameState.tl(l.owe)], 18, Tema.KAHVE, true))
		hv.add_child(Tema.yazi("Kalan ₺%s · vade %s (gün %d sonunda)" % [GameState.tl(l.rem), "bugün" if g == 0 else "%d gün" % g, int(l.due)], 15, Tema.TEHLIKE if g <= 2 else Tema.SOLUK))
		var hh := HBoxContainer.new()
		hh.add_theme_constant_override("separation", 8)
		var yeter := float(S.money) >= int(l.rem)
		var kapat := Tema.dugme("Kapat (₺%s)%s" % [GameState.tl(l.rem), "" if yeter else " · ₺%s daha gerekli" % GameState.tl(int(l.rem) - maxf(0.0, float(S.money)))])
		kapat.disabled = not yeter
		kapat.pressed.connect(func():
			S.money = float(S.money) - int(l.rem)
			l.rem = 0
			borc_esitle()
			S.log.append("Gün %d: kredi #%d kapatıldı" % [int(S.day), int(l.id)])
			SaveSystem.yaz(GameState.yuva, S)
			yenile.call())
		hh.add_child(kapat)
		var en_cok := mini(int(l.rem), maxi(0, int(S.money)))
		var tutar := LineEdit.new()
		tutar.placeholder_text = "₺"
		tutar.custom_minimum_size.x = 90
		hh.add_child(tutar)
		var kismi := Tema.dugme("Miktarını öde")
		kismi.disabled = en_cok <= 0
		var ode := func():
			var s := tutar.text.strip_edges()
			var x := int(s) if s.is_valid_int() else 0
			if x <= 0 or x > en_cok:
				tutar.text = ""
				tutar.placeholder_text = "1–%s" % GameState.tl(en_cok)
				return
			S.money = float(S.money) - x
			l.rem = int(l.rem) - x
			if int(l.rem) == 0:
				S.log.append("Gün %d: kredi #%d kapatıldı" % [int(S.day), int(l.id)])
			borc_esitle()
			SaveSystem.yaz(GameState.yuva, S)
			yenile.call()
		kismi.pressed.connect(ode)
		tutar.text_submitted.connect(func(_s): ode.call())
		hh.add_child(kismi)
		hv.add_child(hh)
		v.add_child(satir)
	Flow.pencere("Krediler", v, [{"metin": "Kapat", "tur": "ana", "fn": sonra}], sonra, 720)


# ---------- dizüstü menüsü ve ekran ----------
func interact(id: String) -> void:
	if id == "dizustu" and not bitti:
		_ekrana_gec()
		var v := VBoxContainer.new()
		v.add_child(Tema.yazi("Ne yapmak istiyorsun?", 18, Tema.SOLUK))
		Flow.pencere("Dizüstü", v, [
			{"metin": "Kapat", "fn": _ekrandan_cik},
			{"metin": "Krediler", "fn": func(): _krediler(_ekrandan_cik)},
			{"metin": "Fiyatlar", "fn": func(): _fiyatlar("ara")},
			{"metin": "Tedarik", "tur": "ana", "fn": func(): _tedarik("ara")}], _ekrandan_cik, 520)
		return
	super.interact(id)


func action_text(id: String) -> String:
	if id == "dizustu" and not bitti:
		return "E: Dizüstü (tedarik, fiyatlar, krediler)"
	return super.action_text(id)


func _sag_ust() -> String:
	var s := super._sag_ust()
	var S := GameState.S
	if int(S.get("debt", 0)) > 0:
		var l := en_yakin()
		s += " · Borç ₺%s" % GameState.tl(S.debt)
		if not l.is_empty():
			var g := kalan_gun(l)
			s += " (vade %s)" % ("bugün!" if g == 0 else "%d gün" % g)
	return s
