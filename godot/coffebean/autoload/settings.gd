extends Node
## Ayarlar (tasarım belgesi: "Ayarlar (T1)"). user://ayarlar.cfg

const YOL := "user://ayarlar.cfg"
const KALITE := ["Düşük", "Orta", "Yüksek"]

var fare := 1.0               ## fare hassasiyeti 0,5–2,0
var tam_ekran := false
var kalite := 2               ## 0 düşük, 1 orta, 2 yüksek


func _ready() -> void:
	var c := ConfigFile.new()
	if c.load(YOL) == OK:
		fare = clampf(c.get_value("oyun", "fare", 1.0), 0.5, 2.0)
		tam_ekran = c.get_value("ekran", "tam_ekran", false)
		kalite = clampi(c.get_value("ekran", "kalite", 2), 0, 2)
	pencere_uygula()


func kaydet() -> void:
	var c := ConfigFile.new()
	c.set_value("oyun", "fare", fare)
	c.set_value("ekran", "tam_ekran", tam_ekran)
	c.set_value("ekran", "kalite", kalite)
	c.save(YOL)


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
