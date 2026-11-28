extends Control
## Bir tarifin küçük yandan resmi (tasarım belgesi "İçecek görünüşleri ve tarif galerisi (Faz 6)").
## Veri: data/icecek_gorunus.json (web v0.47 drinkart.js LOOKS/V/SURF/K tabloları).

static var GOR: Dictionary = {}

var tarif := ""
var soluk := false

const KREM_GRUBU := ["cream", "creamDome", "creamPeak", "marsh", "peaks", "dollop"]
const SOS := {"caramelX": "c9802c", "chocX": "5a2f17", "redDrizzle": "b5333c"}


static func veri() -> Dictionary:
	if GOR.is_empty():
		var f := FileAccess.open("res://data/icecek_gorunus.json", FileAccess.READ)
		if f:
			GOR = JSON.parse_string(f.get_as_text())
	return GOR


## Tarifin yüzey rengi (orta ton); yüzeyi olmayan tarifte en üst katman.
static func yuzey_rengi(id: String) -> Color:
	var G := veri()
	var lk: Dictionary = G.LOOKS.get(id, G.LOOKS.espresso)
	var s: String = lk.get("s", "")
	if s != "" and G.SURF.has(s):
		return Color(G.SURF[s][1])
	var L: Array = lk.get("L", [])
	if not L.is_empty():
		return Color(String(L.back()[0]))
	return Color("8a5a35")


static func ust_susler(id: String) -> Array:
	var G := veri()
	return (G.LOOKS.get(id, {}) as Dictionary).get("top", [])


func _init(id := "", soluk_ := false) -> void:
	tarif = id
	soluk = soluk_
	custom_minimum_size = Vector2(110, 110)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _draw() -> void:
	var G := veri()
	if G.is_empty():
		return
	var lk: Dictionary = G.LOOKS.get(tarif, G.LOOKS.espresso)
	var v: Dictionary = G.V.get(lk.get("v", "cup"), G.V.cup)
	var w: float = v.w
	var wb: float = v.wb
	var h: float = v.h
	var stem: float = v.get("stem", 0.0)
	var olc: float = minf(1.0, minf(84.0 / (h + stem + 10.0), 92.0 / maxf(w, 60.0)))
	w *= olc
	wb *= olc
	h *= olc
	stem *= olc
	var cx := size.x * 0.5
	var taban := size.y - 8.0
	var a := 0.35 if soluk else 1.0
	# tabak / ayak
	if v.get("saucer", 0) or v.get("tray", 0):
		_elips(Vector2(cx, taban - 2), w * 0.62, 4.0, Color(0.93, 0.9, 0.86, a))
	var b := taban - 4.0
	if stem > 0.0:
		_elips(Vector2(cx, taban - 2), wb * 0.7 + 6, 3.0, Color(0.85, 0.9, 0.92, 0.6 * a))
		draw_rect(Rect2(cx - 2, taban - 2 - stem, 4, stem), Color(0.85, 0.9, 0.92, 0.7 * a))
		b = taban - 2 - stem
	var tip: String = v.get("t", "cup")
	var ust := b - h
	var cam := tip == "glass"
	var gov := Color(String(v.get("col", "f6f3ee")))
	if tip == "steel":
		gov = Color("b8bcc0")
	gov.a = a
	# kulp
	var hn: String = v.get("handle", "")
	if hn != "":
		var hr: float = {"s": 7.0, "m": 9.0, "l": 12.0, "g": 10.0}.get(hn, 9.0) * olc + 3.0
		draw_arc(Vector2(cx + _gen(v, w, wb, h, b - h * 0.5, b) * 0.5 - 1, b - h * 0.52), hr, -PI * 0.5, PI * 0.5, 16, Color(0.85, 0.9, 0.92, 0.7 * a) if cam else gov, 3.0)
	# gövde
	var poli := PackedVector2Array([Vector2(cx - w * 0.5, ust), Vector2(cx + w * 0.5, ust), Vector2(cx + wb * 0.5, b), Vector2(cx - wb * 0.5, b)])
	if cam:
		draw_colored_polygon(poli, Color(0.86, 0.93, 0.96, 0.35 * a))
	else:
		draw_colored_polygon(poli, gov)
	# içerik
	var L: Array = lk.get("L", [])
	var yuz := yuzey_rengi(tarif)
	yuz.a = a
	if cam:
		var y := b
		for kat in L:
			var r: float = float(kat[1]) * h
			var c := Color(String(kat[0]))
			c.a *= a
			_bant(v, w, wb, h, b, y - r, y, c)
			y -= r
		if lk.has("s"):
			_bant(v, w, wb, h, b, y - maxf(3.0, h * 0.06), y, yuz)
			y -= maxf(3.0, h * 0.06)
		var buz := int(lk.get("ice", 0))
		for i in buz:
			var bx := cx + (float(i % 3) - 1.0) * w * 0.22
			var by := y + 4.0 + float(i / 3) * 9.0 + float(i % 2) * 3.0
			draw_rect(Rect2(bx - 5, by, 10, 9), Color(0.92, 0.97, 1.0, 0.6 * a))
		var sp = lk.get("straw", "")
		if sp is String and String(sp).begins_with("#"):
			draw_line(Vector2(cx + w * 0.12, b - 6), Vector2(cx + w * 0.3, ust - 16), Color(String(sp), a), 4.0)
	else:
		# opak kapta yüzey üstten görünür
		_elips(Vector2(cx, ust + 3), w * 0.5 - 2, 4.0, yuz)
	if v.has("band"):
		draw_rect(Rect2(cx - _gen(v, w, wb, h, ust + 6, b) * 0.5, ust + 5, _gen(v, w, wb, h, ust + 6, b), 3), Color(String(v.band), a))
	# üst süsleme
	var tops: Array = lk.get("top", [])
	for t in tops:
		if t in KREM_GRUBU:
			_elips(Vector2(cx, ust + 1), w * 0.36, 8.0 * olc + 3.0, Color(1.0, 0.98, 0.94, a))
		elif SOS.has(t):
			draw_line(Vector2(cx - w * 0.25, ust - 3), Vector2(cx + w * 0.25, ust + 1), Color(Color(SOS[t]), a), 2.5)
	# demleme aleti (yalnızca küçük işaret)
	if lk.has("brew"):
		draw_rect(Rect2(size.x - 18, taban - 22, 10, 18), Color(0.45, 0.32, 0.22, 0.6 * a))
	if soluk:
		draw_string(get_theme_default_font(), Vector2(cx - 5, size.y * 0.5), "?", HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color(0.3, 0.2, 0.15, 0.8))


func _gen(_v: Dictionary, w: float, wb: float, h: float, y: float, b: float) -> float:
	return wb + (w - wb) * clampf((b - y) / h, 0.0, 1.0)


func _bant(v: Dictionary, w: float, wb: float, h: float, b: float, y0: float, y1: float, c: Color) -> void:
	var cx := size.x * 0.5
	var g0 := _gen(v, w, wb, h, y0, b) * 0.5 - 1.5
	var g1 := _gen(v, w, wb, h, y1, b) * 0.5 - 1.5
	draw_colored_polygon(PackedVector2Array([Vector2(cx - g0, y0), Vector2(cx + g0, y0), Vector2(cx + g1, y1), Vector2(cx - g1, y1)]), c)


func _elips(m: Vector2, rx: float, ry: float, c: Color) -> void:
	var p := PackedVector2Array()
	for i in 24:
		var t := TAU * i / 24.0
		p.append(m + Vector2(cos(t) * rx, sin(t) * ry))
	draw_colored_polygon(p, c)
