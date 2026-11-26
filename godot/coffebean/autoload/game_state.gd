extends Node
## Oyunun tek durum kaynağı (tasarım belgesi §7 GameState).
## T1: web v0.47 verisini yükler, yeni oyun durumunu kurar, o an oynanan yuvayı tutar.

const VERI_YOLU := "res://data/web_v047.json"

var D: Dictionary = {}        ## web v0.47 data.js'in tamamı (T2'de veri dosyalarına bölünür)
var S: Dictionary = {}        ## oynanan oyunun durumu; boşsa ana menüdeyiz
var yuva := 0                 ## o an oynanan kayıt yuvası (1–3), 0 = yok


func _ready() -> void:
	var f := FileAccess.open(VERI_YOLU, FileAccess.READ)
	if f == null:
		push_error("Veri dosyası açılamadı: " + VERI_YOLU)
		return
	D = JSON.parse_string(f.get_as_text())


func oyunda() -> bool:
	return not S.is_empty()


## Web newState() ile aynı başlangıç (tasarım belgesi: "Yeni oyunun başlangıç durumu").
func yeni_durum(zorluk: String) -> Dictionary:
	var dz: Dictionary = D.difficulty.get(zorluk, D.difficulty.normal)
	var ekstra := {}
	for k in D.extras.keys():
		ekstra[k] = D.extrasStart.get(k, 0)
	return {
		"diff": zorluk, "day": 1, "money": dz.startMoney, "rep": 0, "xp": 0, "shopLevel": 0,
		"perfect": {"espresso": 0}, "served": {}, "unlocked": ["espresso"], "taught": [],
		"beans": {"brazil": {"kg": 1, "boughtDay": 1}}, "bean": "brazil", "milk": 0,
		"equipment": {}, "prices": {}, "tipsLearned": [], "regulars": {}, "log": [],
		"debt": 0, "staff": {}, "decor": {}, "streak": 0, "milkDay": 1, "traffic": {}, "tools": {},
		"market": {}, "loans": [], "cups": D.startCups.duplicate(), "extras": ekstra, "syr": {},
	}


# ---------- gösterim yardımcıları (yuva özeti, menü) ----------
func hafta_gunu(gun: int) -> String:
	return D.weekdays[(gun - 1) % 7]


func hafta_no(gun: int) -> int:
	return (gun - 1) / 7 + 1


func dukkan(seviye: int) -> Dictionary:
	return D.shopLevels[clampi(seviye, 0, D.shopLevels.size() - 1)]


func zorluk_adi(z: String) -> String:
	return D.difficulty.get(z, D.difficulty.normal).label


## ₺4.320 biçimi (binlik ayırıcı nokta).
func tl(x: float) -> String:
	var n := int(round(x))
	var s := str(absi(n))
	var out := ""
	while s.length() > 3:
		out = "." + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return ("-" if n < 0 else "") + s + out
