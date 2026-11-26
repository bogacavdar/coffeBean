extends Node
## Kayıt yuvaları (tasarım belgesi: "Otomatik kayıt"). user://kayit_N.json, JSON.

const YUVA_SAYISI := 3
const BICIM := 1              ## kayıt biçimi numarası; eski biçim açılırken göç() yenisine çevirir


func yol(i: int) -> String:
	return "user://kayit_%d.json" % i


func oku(i: int) -> Dictionary:
	if not FileAccess.file_exists(yol(i)):
		return {}
	var f := FileAccess.open(yol(i), FileAccess.READ)
	if f == null:
		return {}
	var v = JSON.parse_string(f.get_as_text())
	if typeof(v) != TYPE_DICTIONARY:
		return {}
	return goc(v)


func yaz(i: int, durum: Dictionary) -> void:
	durum["bicim"] = BICIM
	durum["savedAt"] = Time.get_unix_time_from_system()
	var f := FileAccess.open(yol(i), FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(durum))


func sil(i: int) -> void:
	if FileAccess.file_exists(yol(i)):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(yol(i)))


## Oynanan oyunu kendi yuvasına kaydeder (ana menüye dönüş, çıkış, pencere kapanışı).
func otomatik() -> void:
	if GameState.oyunda() and GameState.yuva > 0:
		yaz(GameState.yuva, GameState.S)


func herhangi() -> bool:
	for i in range(1, YUVA_SAYISI + 1):
		if not oku(i).is_empty():
			return true
	return false


## "Devam": iflas etmemiş, en son kaydedilen yuva; yoksa 0.
func en_son() -> int:
	var en := 0
	var t := -1.0
	for i in range(1, YUVA_SAYISI + 1):
		var x := oku(i)
		if x.is_empty() or x.get("bankrupt", false):
			continue
		if float(x.get("savedAt", 0)) > t:
			t = float(x.get("savedAt", 0))
			en = i
	return en


## JSON sayıları float döner; gün ve dükkan gibi alanlar tamsayıya çevrilir. Biçim değişince burada taşınır.
func goc(x: Dictionary) -> Dictionary:
	for k in ["day", "shopLevel", "rep", "xp", "streak", "milkDay"]:
		if x.has(k):
			x[k] = int(x[k])
	x["bicim"] = BICIM
	return x


## Yuva özeti: [birinci satır, ikinci satır] (tasarım belgesi: "Yuva penceresi").
func ozet(x: Dictionary) -> Array:
	if x.is_empty():
		return ["Boş yuva", "Henüz kayıt yok"]
	var gun: int = x.get("day", 1)
	if x.get("bankrupt", false):
		return ["İflas etti (Gün %d)" % gun, "Bu kayıt yüklenemez; silebilir ya da üstüne yeni oyun açabilirsin."]
	var dk := GameState.dukkan(x.get("shopLevel", 0))
	var ne_zaman := "—"
	if x.has("savedAt"):
		var yerel: float = float(x.savedAt) + Time.get_time_zone_from_system().bias * 60.0
		var d := Time.get_datetime_dict_from_unix_time(int(yerel))
		ne_zaman = "%02d.%02d %02d:%02d" % [d.day, d.month, d.hour, d.minute]
	return [
		"%s · %d. Hafta (Gün %d)" % [GameState.hafta_gunu(gun), GameState.hafta_no(gun), gun],
		"%s · ₺%s · %s %s · %s" % [GameState.zorluk_adi(x.get("diff", "normal")), GameState.tl(x.get("money", 0)), "★".repeat(int(dk.stars)), dk.name, ne_zaman],
	]
