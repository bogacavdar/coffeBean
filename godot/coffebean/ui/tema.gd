class_name Tema
## Arayüzün tek renk ve yazı düzeni (tasarım belgesi §3 "Arayüz": tek yerden renk, yazı ve kart stili).

const KREM := Color("f6ecdc")
const KAHVE := Color("2b1a0e")
const ANA := Color("7a4a2a")
const ANA_UST := Color("8f5a35")
const DUGME := Color("e9dcc6")
const DUGME_UST := Color("dfcdb0")
const TEHLIKE := Color("a63d36")
const SOLUK := Color("7d6a58")

static var _tema: Theme


static func kutu(renk: Color, yaricap := 10, kenar := 0, kenar_renk := Color.TRANSPARENT) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = renk
	s.set_corner_radius_all(yaricap)
	s.content_margin_left = 18
	s.content_margin_right = 18
	s.content_margin_top = 10
	s.content_margin_bottom = 10
	if kenar > 0:
		s.set_border_width_all(kenar)
		s.border_color = kenar_renk
	return s


static func olustur() -> Theme:
	if _tema:
		return _tema
	var t := Theme.new()
	t.default_font_size = 20
	t.set_color("font_color", "Label", KAHVE)
	t.set_stylebox("normal", "Button", kutu(DUGME))
	t.set_stylebox("hover", "Button", kutu(DUGME_UST))
	t.set_stylebox("pressed", "Button", kutu(DUGME_UST.darkened(0.08)))
	t.set_stylebox("focus", "Button", kutu(Color.TRANSPARENT, 10, 2, ANA))
	t.set_stylebox("disabled", "Button", kutu(Color(DUGME, 0.5)))
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		t.set_color(k, "Button", KAHVE)
	t.set_color("font_disabled_color", "Button", Color(KAHVE, 0.35))
	t.set_stylebox("panel", "PanelContainer", kutu(KREM, 16))
	for k in ["normal", "hover", "pressed", "focus", "hover_pressed"]:
		t.set_stylebox(k, "CheckButton", StyleBoxEmpty.new())
	t.set_color("font_color", "CheckButton", KAHVE)
	t.set_color("font_hover_color", "CheckButton", KAHVE)
	t.set_color("font_pressed_color", "CheckButton", KAHVE)
	_tema = t
	return t


## Ana düğme (koyu kahve), tehlike düğmesi (kırmızı) ya da sade düğme.
static func dugme(metin: String, tur := "", genislik := 0) -> Button:
	var b := Button.new()
	b.text = metin
	b.focus_mode = Control.FOCUS_NONE
	if genislik > 0:
		b.custom_minimum_size.x = genislik
	if tur == "ana" or tur == "tehlike":
		var r := ANA if tur == "ana" else TEHLIKE
		b.add_theme_stylebox_override("normal", kutu(r))
		b.add_theme_stylebox_override("hover", kutu(r.lightened(0.1)))
		b.add_theme_stylebox_override("pressed", kutu(r.darkened(0.1)))
		for k in ["font_color", "font_hover_color", "font_pressed_color"]:
			b.add_theme_color_override(k, KREM)
	return b


static func yazi(metin: String, boyut := 20, renk := KAHVE, kalin := false) -> Label:
	var l := Label.new()
	l.text = metin
	l.add_theme_font_size_override("font_size", boyut)
	l.add_theme_color_override("font_color", renk)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if kalin:
		l.add_theme_constant_override("outline_size", 1)
		l.add_theme_color_override("font_outline_color", renk)
	return l
