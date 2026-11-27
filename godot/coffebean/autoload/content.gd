extends Node
## İçerik servisi (tasarım belgesi §6 "İçerik verisi", §7 Content): web v0.47 verisine sorgular ve açılışta denetim.
## Veri GameState.D'dedir (data/web_v047.json); bu servis onu değiştirmez, yalnız okur.

## Beklenen adetler (tasarım belgesi §6 tablosu, web v0.47).
const BEKLENEN := {
	"drinks": 82, "minigames": 54, "beans": 13, "milks": 5, "specials": 23, "tools": 28,
	"equipment": 16, "decor": 30, "shopLevels": 5, "customers": 9, "cups": 10,
}
const SUT_TURLERI := ["dollop", "micro", "hot", "foam"]

var sorunlar: PackedStringArray = []


func _ready() -> void:
	denetle()
	if sorunlar.is_empty():
		print("İçerik: %d tarif, %d adım · denetim temiz" % [D().drinks.size(), D().minigames.size()])
	else:
		for s in sorunlar:
			push_warning("İçerik denetimi: " + s)


func D() -> Dictionary:
	return GameState.D


func tarif(id: String) -> Dictionary:
	return D().drinks.get(id, {})


func tarif_sayisi() -> int:
	return D().drinks.size()


## Bir dükkan yıldızında (1–5) satılabilen tarifler, menüdeki gruplarına göre sıralı.
func dukkan_tarifleri(yildiz: int) -> Array:
	var out: Array = []
	for g in D().drinkGroups:
		for id in g.ids:
			if int(tarif(id).get("shop", 1)) <= yildiz:
				out.append(id)
	return out


func _say(ad: String) -> int:
	var v = D().get(ad)
	if v is Dictionary or v is Array:
		return v.size()
	return -1


func _var(kume: String, id) -> bool:
	return D().get(kume, {}).has(id)


## Her tarifin adımı, aleti, malzemesi, boyu, ön koşulu ve grubu var mı; adetler belgeyle aynı mı.
func denetle() -> void:
	sorunlar.clear()
	if D().is_empty():
		sorunlar.append("veri dosyası yüklenemedi")
		return
	for k in BEKLENEN:
		if _say(k) != BEKLENEN[k]:
			sorunlar.append("%s adedi %d, beklenen %d" % [k, _say(k), BEKLENEN[k]])
	var gruplu := {}
	for g in D().drinkGroups:
		for id in g.ids:
			if gruplu.has(id):
				sorunlar.append("%s iki grupta" % id)
			gruplu[id] = g.name
	for id in D().drinks:
		var t: Dictionary = D().drinks[id]
		var ad := "%s (%s)" % [t.get("name", "?"), id]
		if not gruplu.has(id):
			sorunlar.append(ad + ": hiçbir menü grubunda değil")
		if t.get("steps", []).is_empty():
			sorunlar.append(ad + ": adımı yok")
		for s in t.get("steps", []):
			if not _var("minigames", s):
				sorunlar.append("%s: bilinmeyen adım %s" % [ad, s])
		for n in t.get("needs", []):
			if not _var("tools", n) and not _var("equipment", n):
				sorunlar.append("%s: bilinmeyen alet %s" % [ad, n])
		for u in t.get("uses", []):
			if not _var("specials", u[0]) and not _var("extras", u[0]):   # şeker bir ekstradır (web specStock)
				sorunlar.append("%s: bilinmeyen malzeme %s" % [ad, u[0]])
		for k in ["pump", "drizzle", "dust"]:
			if t.has(k) and not _var("specials", t[k]):
				sorunlar.append("%s: bilinmeyen %s malzemesi %s" % [ad, k, t[k]])
		if t.has("milk") and not t.milk in SUT_TURLERI:
			sorunlar.append("%s: bilinmeyen süt işi %s" % [ad, t.milk])
		var on = t.get("req")
		if on is String and not _var("drinks", on):
			sorunlar.append("%s: bilinmeyen ön koşul %s" % [ad, on])
		var yildiz := int(t.get("shop", 0))
		if yildiz < 1 or yildiz > 5:
			sorunlar.append("%s: dükkan yıldızı %d" % [ad, yildiz])
		if t.get("sizes", []).is_empty():
			sorunlar.append(ad + ": boyu yok")
		for b in t.get("sizes", []):
			if not _var("sizes", b):
				sorunlar.append("%s: bilinmeyen boy %s" % [ad, b])
			elif not _var("cups", D().sizes[b].cup):
				sorunlar.append("%s: %s boyunun bardağı yok" % [ad, b])
		if float(t.get("price", 0)) <= 0:
			sorunlar.append(ad + ": fiyatı yok")
	for id in D().tools:
		var a: Dictionary = D().tools[id]
		if a.has("step") and not _var("minigames", a.step):
			sorunlar.append("alet %s: bilinmeyen adım %s" % [id, a.step])
	for id in D().equipment:
		var e: Dictionary = D().equipment[id]
		if e.has("widen") and not _var("minigames", e.widen):
			sorunlar.append("ekipman %s: bilinmeyen adım %s" % [id, e.widen])
	for b in D().sizes:
		if not _var("cups", D().sizes[b].cup):
			sorunlar.append("boy %s: bardak %s yok" % [b, D().sizes[b].cup])
