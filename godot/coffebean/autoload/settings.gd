extends Node
## Ayarlar (tasarım belgesi: "Ayarlar (T1)"). user://ayarlar.cfg

const YOL := "user://ayarlar.cfg"
const KALITE := ["Düşük", "Orta", "Yüksek"]
const DOKUN := ["Otomatik", "Açık", "Kapalı"]

var fare := 1.0               ## fare hassasiyeti 0,5–2,0
var tam_ekran := false
var kalite := 2               ## 0 düşük, 1 orta, 2 yüksek
var hile_acilmis := false     ## "cheat" bir kez yazıldı mı (Ayarlar'da anahtar görünür)
var hile_acik := false        ## hile modu (T9)
var akis_tamam: Array = []    ## tamamlanan akış testleri
var muzik := 0.6              ## T18 müzik seviyesi 0–1
var efekt := 0.8              ## T18 efekt seviyesi 0–1
var sessiz := false
var dokunmatik := 0            ## Faz 7: 0 otomatik (yalnız telefon/tablet), 1 açık, 2 kapalı


func _ready() -> void:
	var c := ConfigFile.new()
	if OS.has_feature("mobile"):
		kalite = 0                       # telefonda ilk açılış Düşük (Faz 7)
	if c.load(YOL) == OK:
		fare = clampf(c.get_value("oyun", "fare", 1.0), 0.5, 2.0)
		tam_ekran = c.get_value("ekran", "tam_ekran", false)
		kalite = clampi(c.get_value("ekran", "kalite", kalite), 0, 2)
		hile_acilmis = c.get_value("hile", "acilmis", false)
		hile_acik = hile_acilmis and c.get_value("hile", "acik", false)
		akis_tamam = c.get_value("hile", "akis_tamam", [])
		muzik = clampf(c.get_value("ses", "muzik", 0.6), 0.0, 1.0)
		efekt = clampf(c.get_value("ses", "efekt", 0.8), 0.0, 1.0)
		sessiz = c.get_value("ses", "sessiz", false)
		dokunmatik = clampi(c.get_value("oyun", "dokunmatik", 0), 0, 2)
	pencere_uygula()


func kaydet() -> void:
	var c := ConfigFile.new()
	c.set_value("oyun", "fare", fare)
	c.set_value("ekran", "tam_ekran", tam_ekran)
	c.set_value("ekran", "kalite", kalite)
	c.set_value("hile", "acilmis", hile_acilmis)
	c.set_value("hile", "acik", hile_acik)
	c.set_value("hile", "akis_tamam", akis_tamam)
	c.set_value("ses", "muzik", muzik)
	c.set_value("ses", "efekt", efekt)
	c.set_value("ses", "sessiz", sessiz)
	c.set_value("oyun", "dokunmatik", dokunmatik)
	c.save(YOL)


## "cheat" yazınca / sürüm yazısına 3 kez tıklayınca: açıksa kapatır, kapalıysa açar.
func hile_degistir() -> void:
	hile_acilmis = true
	hile_acik = not hile_acik
	kaydet()


func pencere_uygula() -> void:
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if tam_ekran else DisplayServer.WINDOW_MODE_WINDOWED)


## Grafik kalitesini sahneye uygular: Düşük gölge/kenar yumuşatma yok; Orta gölge + 2×; Yüksek ayrıntılı gölge + 4× + parlama.
func uygula(sahne: Node) -> void:
	var vp := sahne.get_viewport()
	vp.msaa_3d = [Viewport.MSAA_DISABLED, Viewport.MSAA_2X, Viewport.MSAA_4X][kalite]
	RenderingServer.directional_soft_shadow_filter_set_quality(
		[RenderingServer.SHADOW_QUALITY_HARD, RenderingServer.SHADOW_QUALITY_SOFT_LOW, RenderingServer.SHADOW_QUALITY_SOFT_HIGH][kalite])
	for n in sahne.find_children("*", "DirectionalLight3D", true, false):
		(n as DirectionalLight3D).shadow_enabled = kalite > 0
	for n in sahne.find_children("*", "WorldEnvironment", true, false):
		var env := (n as WorldEnvironment).environment
		if env:
			if not env.has_meta("ilk_glow"):
				env.set_meta("ilk_glow", env.glow_enabled)
			env.glow_enabled = kalite == 2 and env.get_meta("ilk_glow")


## Dokunmatik düğmeler gösterilsin mi (Otomatik: yalnız telefon ve tablet).
func dokunmatik_acik() -> bool:
	if dokunmatik == 1:
		return true
	if dokunmatik == 2:
		return false
	return OS.has_feature("mobile")
