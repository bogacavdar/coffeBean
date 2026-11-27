extends Node3D
## CoffeBean birinci şahıs denemesi: dükkanda yürü, espressoyu elle yap, müşteriye ver.
## Oyun kodu değil; birinci şahıs hissini göstermek için. Göstergeler Kural 9'a uyar.

const WALL := Color("ede0c6")
const LAMB := Color("7f9a80")
const COUNTER := Color("5d7a62")
const WOOD := Color("b9814f")
const FLOOR := Color("c9965f")
const STEEL := Color("c9cbcd")
const DARK := Color("2e2622")
const WHITE := Color("f6f2ea")
const COPPER := Color("c27a49")
const COFFEE := Color("4a2616")
const SKIN := Color("f1c7a5")

const DOOR := Vector3(-3.4, 0, 3.2)
const QUEUE := Vector3(-2.0, 0, 0.3)
const CUP_POS := Vector3(-2.45, 1.0, -1.16)
const MACHINE := Vector3(-2.45, 1.0, -0.86)
## Kural 9: renkli bölgelerin zaman pencereleri (sn). Bölge yarı genişliği = ibre hızı × pencere.
var WIN_DARK := 0.027        # Kural 9 pencereleri; T10 rütbe/zorluk/çekirdek çarpanıyla günceller
var WIN_LIGHT := 0.067
var WIN_YELLOW := 0.133

var player: CharacterBody3D
var cam: Camera3D
var held: Node3D
var held_kind := ""
var pf_state := "locked_empty"   # locked_empty, held_empty, held_ground, held_tamped, locked_ready, locked_used
var cup_state := "none"          # none, held_empty, under, brewing, full, held_full
var scores: Array[float] = []
var customer: Node3D
var cstate := "none"
var walk_t := 0.0
var bubble: Label3D
var cup: Node3D
var cup_fill: MeshInstance3D
var stream: MeshInstance3D
var steam: CPUParticles3D
var pf_on_machine: Node3D
var prompt: Label
var info: Label
var gauge: Control
var gauge_bar: ColorRect
var gauge_needle: ColorRect
var gauge_label: Label
var gauge_zones: Array[ColorRect] = []
var g_active := ""
var g_value := 0.0
var g_min := 0.0
var g_max := 1.0
var g_target := 0.5
var g_speed := 1.0
var g_unit := ""
var g_hold := true
var look_id := ""
var shirt_colors := [Color("4f6fa8"), Color("a8574f"), Color("6f8f4f"), Color("8a6fa8"), Color("c99a3f")]
var hair_colors := [Color("3b2618"), Color("1f1a17"), Color("8a5a2b"), Color("d9b46a"), Color("6b3a22")]
var n_customer := 0
var yaw := 0.0
var pitch := 0.0

# ---------- yardımcılar ----------
func mat(c: Color, rough := 0.75, metal := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	return m


## Köşeleri yuvarlatılmış kutu (tombul tarz için).
func rounded_box_mesh(size: Vector3, r: float) -> ArrayMesh:
	var b := BoxMesh.new()
	b.size = size
	b.subdivide_width = 6
	b.subdivide_height = 6
	b.subdivide_depth = 6
	var arr := b.get_mesh_arrays()
	var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var norms: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
	var inner := size * 0.5 - Vector3.ONE * r
	for i in verts.size():
		var p := verts[i]
		var q := p.clamp(-inner, inner)
		var d := p - q
		var n := d.normalized() if d.length() > 0.0001 else norms[i]
		verts[i] = q + n * r
		norms[i] = n
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = norms
	arr[Mesh.ARRAY_TANGENT] = null
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return m


func rbox(parent: Node3D, pos: Vector3, size: Vector3, c: Color, r := 0.04, rough := 0.75, metal := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = rounded_box_mesh(size, min(r, min(size.x, min(size.y, size.z)) * 0.49))
	mi.material_override = mat(c, rough, metal)
	mi.position = pos
	parent.add_child(mi)
	return mi


func cyl(parent: Node3D, pos: Vector3, rad: float, h: float, c: Color, rough := 0.6, metal := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := CylinderMesh.new()
	m.top_radius = rad
	m.bottom_radius = rad
	m.height = h
	m.radial_segments = 40
	mi.mesh = m
	mi.material_override = mat(c, rough, metal)
	mi.position = pos
	parent.add_child(mi)
	return mi


func sph(parent: Node3D, pos: Vector3, rad: float, c: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := SphereMesh.new()
	m.radius = rad
	m.height = rad * 2.0
	mi.mesh = m
	mi.material_override = mat(c, 0.8)
	mi.position = pos
	parent.add_child(mi)
	return mi


func capsule(parent: Node3D, pos: Vector3, rad: float, h: float, c: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var m := CapsuleMesh.new()
	m.radius = rad
	m.height = h
	mi.mesh = m
	mi.material_override = mat(c, 0.8)
	mi.position = pos
	parent.add_child(mi)
	return mi



# ---------- sahne ----------
## Ana menünün arkasında boş dükkan olarak açılır (T1): oyuncu, arayüz ve müşteri kurulmaz.
var menu_modu := false
var menu_t := 0.0


func _ready() -> void:
	if not InputMap.has_action("interact"):
		InputMap.add_action("interact")
		var ek := InputEventKey.new(); ek.physical_keycode = KEY_E; InputMap.action_add_event("interact", ek)
		var mb := InputEventMouseButton.new(); mb.button_index = MOUSE_BUTTON_LEFT; InputMap.action_add_event("interact", mb)
	build_room()
	build_counter()
	build_machine()
	build_shell()
	build_props()
	build_lights()
	if menu_modu:
		set_process(false)
		set_physics_process(false)
		set_process_input(false)
		cam = Camera3D.new()
		cam.fov = 62.0
		add_child(cam)
		cam.make_current()
		menu_kamera(0.0)
		var tw := create_tween().set_loops()
		tw.tween_method(menu_kamera, 0.0, 1.0, 14.0).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		tw.tween_method(menu_kamera, 1.0, 0.0, 14.0).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		Settings.uygula(self)
		return
	build_player()
	build_ui()
	spawn_customer()
	Settings.uygula(self)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if OS.get_cmdline_user_args().size() > 0 and OS.get_cmdline_user_args()[0] != "menu":
		auto_shots(OS.get_cmdline_user_args()[0])


## Menü kamerası: kapının yanından tezgâha bakar, k = 0…1 arasında sağa sola kayar.
func menu_kamera(k: float) -> void:
	cam.position = Vector3(0.6 + k * 1.2, 1.7, 1.6)
	cam.look_at(Vector3(-2.0 + k * 0.8, 1.1, -1.6))


func build_room() -> void:
	rbox(self, Vector3(0, -0.05, 0.5), Vector3(8.4, 0.1, 7.6), FLOOR, 0.02)
	rbox(self, Vector3(0, 2.0, -3.05), Vector3(8.4, 4.0, 0.1), WALL, 0.02)
	rbox(self, Vector3(-4.15, 2.0, 0.5), Vector3(0.1, 4.0, 7.6), WALL.darkened(0.04), 0.02)
	rbox(self, Vector3(0, 0.55, -2.98), Vector3(8.4, 1.1, 0.06), LAMB, 0.02)
	rbox(self, Vector3(-4.08, 0.55, 0.5), Vector3(0.06, 1.1, 7.6), LAMB, 0.02)
	# kapı (sol duvarda)
	rbox(self, Vector3(-4.06, 1.15, 3.2), Vector3(0.08, 2.3, 1.3), Color("6b4a2f"), 0.03)
	rbox(self, Vector3(-4.0, 1.4, 3.2), Vector3(0.04, 1.2, 0.8), Color("bcd4dc"), 0.02, 0.2)
	# pencere (arka duvarda)
	rbox(self, Vector3(1.6, 2.1, -3.0), Vector3(2.2, 1.4, 0.06), Color("6b4a2f"), 0.03)
	rbox(self, Vector3(1.6, 2.1, -2.96), Vector3(2.0, 1.2, 0.04), Color("cfe3ea"), 0.02, 0.2)

func build_counter() -> void:
	rbox(self, Vector3(-2.0, 0.47, -1.0), Vector3(2.9, 0.94, 0.8), COUNTER, 0.05)
	rbox(self, Vector3(-2.0, 0.97, -1.0), Vector3(3.05, 0.07, 0.92), WOOD, 0.03, 0.55)
	# lambri çizgileri
	for i in 9:
		rbox(self, Vector3(-3.3 + i * 0.32, 0.47, -0.59), Vector3(0.03, 0.8, 0.02), COUNTER.darkened(0.12), 0.01)
	# kasa
	rbox(self, Vector3(-0.85, 1.13, -0.95), Vector3(0.34, 0.26, 0.3), DARK, 0.05)
	rbox(self, Vector3(-0.85, 1.32, -0.98), Vector3(0.28, 0.14, 0.04), Color("3f6b5a"), 0.02)

func build_machine() -> void:
	var g := Node3D.new()
	g.position = MACHINE
	g.rotation_degrees.y = 180.0
	add_child(g)
	rbox(g, Vector3(0, 0.33, 0), Vector3(0.78, 0.62, 0.5), STEEL, 0.07, 0.3, 0.6)
	rbox(g, Vector3(0, 0.66, 0), Vector3(0.7, 0.04, 0.42), DARK, 0.02)
	rbox(g, Vector3(0, 0.47, 0.255), Vector3(0.7, 0.2, 0.02), COPPER, 0.02, 0.35, 0.3)
	rbox(g, Vector3(0, 0.03, 0.22), Vector3(0.6, 0.04, 0.3), DARK, 0.015)
	cyl(g, Vector3(0, 0.33, 0.3), 0.07, 0.1, STEEL, 0.25, 0.8)
	cyl(g, Vector3(0.29, 0.3, 0.3), 0.012, 0.26, STEEL, 0.2, 0.9)
	sph(g, Vector3(-0.2, 0.56, 0.26), 0.05, Color("f3ead8"))
	sph(g, Vector3(0.2, 0.56, 0.26), 0.05, Color("f3ead8"))
	# öğütücü
	var gr := Node3D.new()
	gr.position = Vector3(-1.65, 1.0, -1.1)
	gr.rotation_degrees.y = 180.0
	add_child(gr)
	rbox(gr, Vector3(0, 0.08, 0), Vector3(0.24, 0.16, 0.28), DARK, 0.04)
	cyl(gr, Vector3(0, 0.33, -0.02), 0.1, 0.34, STEEL, 0.3, 0.6)
	cyl(gr, Vector3(0, 0.58, -0.02), 0.115, 0.2, Color("4a2c1a"), 0.9)
	cyl(gr, Vector3(0, 0.69, -0.02), 0.12, 0.03, DARK)
	# fincan, akış ve buhar
	cup = Node3D.new()
	cup.position = CUP_POS
	add_child(cup)
	cyl(cup, Vector3(0, 0.01, 0), 0.11, 0.02, WHITE, 0.3)
	var body := cyl(cup, Vector3(0, 0.07, 0), 0.07, 0.11, WHITE, 0.3)
	body.name = "Body"
	var handle := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.022
	tm.outer_radius = 0.04
	handle.mesh = tm
	handle.material_override = mat(WHITE, 0.3)
	handle.rotation_degrees = Vector3(90, 0, 0)
	handle.position = Vector3(0.08, 0.07, 0)
	cup.add_child(handle)
	cup_fill = cyl(cup, Vector3(0, 0.03, 0), 0.062, 0.01, COFFEE, 0.15)
	cup_fill.visible = false
	stream = cyl(self, CUP_POS + Vector3(0, 0.2, 0), 0.011, 0.2, COFFEE, 0.2)
	stream.visible = false
	steam = CPUParticles3D.new()
	steam.position = CUP_POS + Vector3(0, 0.14, 0)
	steam.emitting = false
	steam.amount = 24
	steam.lifetime = 1.6
	steam.direction = Vector3.UP
	steam.spread = 12.0
	steam.initial_velocity_min = 0.12
	steam.initial_velocity_max = 0.2
	steam.gravity = Vector3.ZERO
	steam.scale_amount_min = 0.5
	steam.scale_amount_max = 1.0
	var sm := SphereMesh.new()
	sm.radius = 0.025
	sm.height = 0.05
	var smat := mat(Color(1, 1, 1, 0.35), 1.0)
	smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	smat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.material = smat
	steam.mesh = sm
	add_child(steam)

func make_person(shirt: Color, hair: Color, apron: bool, ponytail: bool) -> Node3D:
	var p := Node3D.new()
	var pants := Color("3a3f4f")
	for side in [-1, 1]:
		var hip := Node3D.new()
		hip.name = "LegL" if side < 0 else "LegR"
		hip.position = Vector3(0.11 * side, 0.86, 0)
		p.add_child(hip)
		capsule(hip, Vector3(0, -0.4, 0), 0.1, 0.86, pants)
		rbox(hip, Vector3(0, -0.83, 0.05), Vector3(0.16, 0.08, 0.26), DARK, 0.03)
		var sh := Node3D.new()
		sh.name = "ArmL" if side < 0 else "ArmR"
		sh.position = Vector3(0.31 * side, 1.43, 0)
		p.add_child(sh)
		capsule(sh, Vector3(0, -0.24, 0), 0.075, 0.56, shirt)
		sph(sh, Vector3(0, -0.53, 0), 0.07, SKIN)
	rbox(p, Vector3(0, 1.17, 0), Vector3(0.54, 0.62, 0.3), shirt, 0.12)
	if apron:
		rbox(p, Vector3(0, 1.02, 0.155), Vector3(0.46, 0.62, 0.03), COPPER, 0.02)
	capsule(p, Vector3(0, 1.52, 0), 0.07, 0.2, SKIN)
	var head := Node3D.new()
	head.name = "Head"
	head.position = Vector3(0, 1.74, 0)
	p.add_child(head)
	sph(head, Vector3.ZERO, 0.21, SKIN)
	var hr := sph(head, Vector3(0, 0.05, -0.03), 0.225, hair)
	hr.scale = Vector3(1.0, 0.92, 1.0)
	var cut := sph(head, Vector3(0, -0.06, 0.07), 0.2, SKIN)
	cut.scale = Vector3(0.98, 0.9, 0.85)
	if ponytail:
		capsule(head, Vector3(0, -0.06, -0.24), 0.08, 0.36, hair)
	for side in [-1, 1]:
		sph(head, Vector3(0.075 * side, 0.0, 0.19), 0.028, DARK)
		sph(head, Vector3(0.12 * side, -0.07, 0.16), 0.035, Color("f09a8a"))
	return p

## İç mekân kabuğu: ön ve sağ duvar, tavan, çarpışma kutuları.
func build_shell() -> void:
	rbox(self, Vector3(0, 2.0, 4.35), Vector3(8.4, 4.0, 0.1), WALL, 0.02)
	rbox(self, Vector3(4.25, 2.0, 0.5), Vector3(0.1, 4.0, 7.6), WALL, 0.02)
	rbox(self, Vector3(0, 0.55, 4.28), Vector3(8.4, 1.1, 0.06), LAMB, 0.02)
	rbox(self, Vector3(4.18, 0.55, 0.5), Vector3(0.06, 1.1, 7.6), LAMB, 0.02)
	var ceil := rbox(self, Vector3(0, 3.05, 0.5), Vector3(8.4, 0.1, 7.6), Color("f4ead8"), 0.02)
	ceil.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for x in [-2.0, 1.8]:
		for z in [-1.0, 1.8]:
			cyl(self, Vector3(x, 2.75, z), 0.01, 0.5, DARK)
			var shade := cyl(self, Vector3(x, 2.45, z), 0.18, 0.16, Color("2f4a3c"), 0.5)
			shade.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			var l := OmniLight3D.new()
			l.light_color = Color(1.0, 0.82, 0.6)
			l.light_energy = 1.1
			l.omni_range = 4.5
			l.position = Vector3(x, 2.3, z)
			add_child(l)
	collider(Vector3(0, -0.05, 0.5), Vector3(8.4, 0.1, 7.6))
	collider(Vector3(0, 1.5, -3.05), Vector3(8.4, 3, 0.1))
	collider(Vector3(0, 1.5, 4.35), Vector3(8.4, 3, 0.1))
	collider(Vector3(-4.15, 1.5, 0.5), Vector3(0.1, 3, 7.6))
	collider(Vector3(4.25, 1.5, 0.5), Vector3(0.1, 3, 7.6))
	collider(Vector3(-2.0, 0.5, -1.0), Vector3(3.05, 1.0, 0.92))
	collider(Vector3(1.8, 0.5, 0.4), Vector3(2.6, 1.0, 1.4))
	collider(Vector3(1.8, 0.4, 2.8), Vector3(1.0, 0.8, 1.0))
	collider(Vector3(2.9, 0.5, 2.6), Vector3(1.2, 1.0, 1.2))
	collider(Vector3(3.6, 1.0, -2.5), Vector3(0.6, 2.0, 0.6))


func collider(pos: Vector3, size: Vector3, id := "") -> StaticBody3D:
	var b := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = size
	cs.shape = sh
	b.add_child(cs)
	b.position = pos
	if id != "":
		b.set_meta("id", id)
		b.collision_layer = 2
	add_child(b)
	return b



func build_lights() -> void:
	var sun := DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.92, 0.8)
	sun.light_energy = 0.25
	sun.shadow_enabled = false
	add_child(sun)
	sun.look_at_from_position(Vector3(4, 9, 6), Vector3.ZERO)
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("2e2016")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.9, 0.84, 0.76)
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)


func build_player() -> void:
	player = CharacterBody3D.new()
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.28
	cap.height = 1.7
	cs.shape = cap
	cs.position.y = 0.85
	player.add_child(cs)
	player.position = Vector3(-2.0, 0.05, -2.2)
	add_child(player)
	cam = Camera3D.new()
	cam.position.y = 1.65
	cam.fov = 70.0
	cam.near = 0.05
	player.add_child(cam)
	cam.make_current()
	yaw = PI
	pitch = -0.28
	apply_look()


func apply_look() -> void:
	player.rotation.y = yaw
	cam.rotation.x = pitch


func build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	info = Label.new()
	info.text = "CoffeBean · birinci şahıs deneme\nWASD yürü · fare bak · E / sol tık: etkileşim · Boşluk: tamam · R: kaşık · Esc: menü"
	info.position = Vector2(20, 14)
	style(info, 20)
	layer.add_child(info)
	var dot := ColorRect.new()
	dot.color = Color(1, 1, 1, 0.85)
	dot.size = Vector2(6, 6)
	dot.set_anchors_preset(Control.PRESET_CENTER)
	dot.position = Vector2(-3, -3)
	layer.add_child(dot)
	prompt = Label.new()
	prompt.set_anchors_preset(Control.PRESET_CENTER)
	prompt.position = Vector2(-300, 26)
	prompt.size = Vector2(600, 40)
	prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	style(prompt, 26)
	layer.add_child(prompt)
	gauge = Control.new()
	gauge.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	gauge.position = Vector2(-320, -130)
	gauge.size = Vector2(640, 90)
	gauge.visible = false
	layer.add_child(gauge)
	gauge_label = Label.new()
	gauge_label.size = Vector2(640, 34)
	gauge_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	style(gauge_label, 24)
	gauge.add_child(gauge_label)
	gauge_bar = ColorRect.new()
	gauge_bar.color = Color(0.12, 0.09, 0.07, 0.85)
	gauge_bar.position = Vector2(0, 40)
	gauge_bar.size = Vector2(640, 36)
	gauge.add_child(gauge_bar)
	for c in [Color("e2c044"), Color("8fcf6a"), Color("2f8a3a")]:
		var z := ColorRect.new()
		z.color = c
		z.position.y = 40
		z.size.y = 36
		gauge.add_child(z)
		gauge_zones.append(z)
	gauge_needle = ColorRect.new()
	gauge_needle.color = Color.WHITE
	gauge_needle.size = Vector2(4, 48)
	gauge_needle.position.y = 34
	gauge.add_child(gauge_needle)
	build_game_ui(layer)


func style(l: Label, size: int) -> void:
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color("fbf6ee"))
	l.add_theme_color_override("font_outline_color", Color("2e2016"))
	l.add_theme_constant_override("outline_size", 8)


# ---------- espresso istasyonu (belge §5, "Birinci şahıs espresso") ----------
const KNOCK := Vector3(-1.98, 1.0, -1.25)
const GRINDER_SCALE := Vector3(-1.65, 1.0, -1.32)
const STATION := Vector3(-1.3, 1.0, -1.2)
const PF_SPOT := {"tek": Vector3(-2.98, 1.0, -1.32), "double": Vector3(-2.98, 1.0, -1.04)}
const CUP_SPOT := {"tek": Vector3(-3.28, 1.0, -1.32), "double": Vector3(-3.28, 1.0, -1.02)}
const DOSE := {"tek": 9.0, "double": 18.0}
const YIELD := {"tek": 18.0, "double": 36.0}
const FLOW := {"tek": 1.025, "double": 2.05}    # g/sn, ön ıslatmadan sonra (~23 sn'de hedef; tasarım: ×1,25)
const PREINFUSE := 5.5

var order_size := "double"
var stage := "pick_pf"      # pick_pf, to_grinder, dosing, to_station, wdt_done, tamped, locked, cup_on, pulling, pulled, cup_taken, used
var mode := ""              # dose, wdt, tamp, lock, pull
var held_size := ""         # elde tutulan portafiltre/fincanın boyu
var cup_size := ""
var wrong := false
var step_scores: Array[float] = []
var dose_g := 0.0
var wdt_cells: Array[float] = []
var wdt_cursor := Vector2.ZERO
var wdt_time := 0.0
var bubble_pos := Vector2.ZERO
var bubble_vel := Vector2.ZERO
var tamp_time := 0.0
var tamp_acc := 0.0
var lock_px := 0.0
var pull_t := 0.0
var pull_g := 0.0
var pf_nodes := {}
var cup_nodes := {}
var placed_cup: Node3D
var placed_fill: MeshInstance3D
var locked_pf: Node3D
var scale_pf: Node3D
var panel: Control
var panel_title: Label
var panel_text: Label
var rng := RandomNumberGenerator.new()


func make_portafilter(parent: Node3D, size: String, dosed := false) -> Node3D:
	var pf := Node3D.new()
	parent.add_child(pf)
	cyl(pf, Vector3.ZERO, 0.058, 0.05, STEEL, 0.25, 0.8)
	rbox(pf, Vector3(0, 0, 0.17), Vector3(0.05, 0.04, 0.24), DARK, 0.02)
	if size == "tek":
		cyl(pf, Vector3(0, -0.04, 0), 0.008, 0.04, STEEL, 0.25, 0.8)
	else:
		cyl(pf, Vector3(-0.018, -0.04, 0), 0.008, 0.04, STEEL, 0.25, 0.8)
		cyl(pf, Vector3(0.018, -0.04, 0), 0.008, 0.04, STEEL, 0.25, 0.8)
	if dosed:
		cyl(pf, Vector3(0, 0.022, 0), 0.05, 0.012, COFFEE, 0.95)
	return pf


func make_cup(parent: Node3D, size: String, fill := 0.0) -> Node3D:
	var c := Node3D.new()
	parent.add_child(c)
	var r := 0.045 if size == "tek" else 0.06
	var h := 0.06 if size == "tek" else 0.085
	cyl(c, Vector3(0, 0.006, 0), r + 0.035, 0.012, WHITE, 0.3)
	cyl(c, Vector3(0, 0.012 + h * 0.5, 0), r, h, WHITE, 0.3)
	var handle := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.015
	tm.outer_radius = 0.03
	handle.mesh = tm
	handle.material_override = mat(WHITE, 0.3)
	handle.rotation_degrees = Vector3(90, 0, 0)
	handle.position = Vector3(r + 0.012, 0.012 + h * 0.55, 0)
	c.add_child(handle)
	if fill > 0.0:
		cyl(c, Vector3(0, 0.012 + h * fill * 0.85, 0), r - 0.006, 0.006, Color("8a5a35"), 0.2)
	return c


func build_props() -> void:
	cup.visible = false
	for s in ["tek", "double"]:
		var pf := make_portafilter(self, s)
		pf.position = PF_SPOT[s] + Vector3(0, 0.03, 0)
		pf.rotation_degrees.y = 180.0
		pf_nodes[s] = pf
		collider(PF_SPOT[s] + Vector3(0, 0.05, -0.08), Vector3(0.14, 0.12, 0.3), "pf_" + s)
		var stack := Node3D.new()
		stack.position = CUP_SPOT[s]
		add_child(stack)
		for i in 3:
			make_cup(stack, s).position.y = i * (0.075 if s == "tek" else 0.1)
		cup_nodes[s] = stack
		collider(CUP_SPOT[s] + Vector3(0, 0.15, 0), Vector3(0.18, 0.3, 0.18), "cup_" + s)
	# öğütücü terazisi, telve kutusu, dağıtma + temper istasyonu
	rbox(self, GRINDER_SCALE + Vector3(0, 0.012, 0.1), Vector3(0.2, 0.024, 0.16), Color("1f1f22"), 0.01)
	rbox(self, GRINDER_SCALE + Vector3(0, 0.03, 0.19), Vector3(0.1, 0.03, 0.01), Color("7fd0a0"), 0.004)
	rbox(self, KNOCK + Vector3(0, 0.08, 0), Vector3(0.2, 0.16, 0.2), Color("1f1a17"), 0.03)
	cyl(self, KNOCK + Vector3(0, 0.15, 0), 0.012, 0.18, Color("cfc7b8"), 0.5)
	rbox(self, STATION + Vector3(0, 0.02, 0), Vector3(0.26, 0.04, 0.24), Color("3a2a20"), 0.02)
	cyl(self, STATION + Vector3(-0.06, 0.07, 0.05), 0.045, 0.03, STEEL, 0.25, 0.8)
	cyl(self, STATION + Vector3(-0.06, 0.14, 0.05), 0.02, 0.12, WOOD, 0.5)
	cyl(self, STATION + Vector3(0.07, 0.1, -0.05), 0.012, 0.12, WOOD, 0.5)
	collider(Vector3(-1.65, 1.35, -1.15), Vector3(0.3, 0.7, 0.4), "grinder")
	collider(STATION + Vector3(0, 0.1, 0), Vector3(0.28, 0.2, 0.26), "station")
	collider(KNOCK + Vector3(0, 0.1, 0), Vector3(0.22, 0.2, 0.22), "knock")
	collider(MACHINE + Vector3(0, 0.3, -0.1), Vector3(0.8, 0.6, 0.6), "machine")


func build_game_ui(layer: CanvasLayer) -> void:
	panel = Control.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.position = Vector2(-190, -230)
	panel.size = Vector2(380, 380)
	panel.visible = false
	panel.draw.connect(draw_panel)
	layer.add_child(panel)
	panel_title = Label.new()
	panel_title.position = Vector2(-120, -30)
	panel_title.size = Vector2(620, 34)
	panel_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	style(panel_title, 26)
	panel.add_child(panel_title)
	panel_text = Label.new()
	panel_text.position = Vector2(-160, 390)
	panel_text.size = Vector2(700, 80)
	panel_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	style(panel_text, 22)
	panel.add_child(panel_text)


# ---------- oyuncu ----------
func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var rel: Vector2 = event.relative
		if mode == "wdt":
			wdt_cursor = (wdt_cursor + rel * 0.9).limit_length(150.0)
		elif mode == "tamp":
			bubble_pos -= rel * 0.8
		elif mode == "lock":
			lock_px += max(rel.x, 0.0)
		elif mode == "":
			yaw -= rel.x * 0.0025 * Settings.fare
			pitch = clamp(pitch - rel.y * 0.0025 * Settings.fare, -1.3, 1.2)
			apply_look()
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			Flow.oyun_ici_menu()
			get_viewport().set_input_as_handled()
		elif mode == "dose" and event.keycode == KEY_R:
			dose_g = max(dose_g - 0.2, 0.0)
		elif mode == "dose" and event.keycode == KEY_SPACE:
			finish_dose()
		elif mode == "wdt" and event.keycode == KEY_SPACE:
			finish_wdt()
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		get_viewport().set_input_as_handled()


func _physics_process(delta: float) -> void:
	var dir := Vector3.ZERO
	if mode == "":
		if Input.is_physical_key_pressed(KEY_W): dir.z -= 1
		if Input.is_physical_key_pressed(KEY_S): dir.z += 1
		if Input.is_physical_key_pressed(KEY_A): dir.x -= 1
		if Input.is_physical_key_pressed(KEY_D): dir.x += 1
	dir = (player.transform.basis * dir).normalized() * 2.6
	player.velocity.x = dir.x
	player.velocity.z = dir.z
	player.velocity.y = 0.0 if player.is_on_floor() else player.velocity.y - 9.8 * delta
	player.move_and_slide()
	update_look_target()


func update_look_target() -> void:
	var from := cam.global_position
	var to := from - cam.global_transform.basis.z * 2.3
	var q := PhysicsRayQueryParameters3D.create(from, to, 2)
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	look_id = ""
	if hit and hit.collider.has_meta("id"):
		look_id = hit.collider.get_meta("id")
	if mode == "":
		prompt.text = action_text(look_id)


func size_name(s: String) -> String:
	return "tek" if s == "tek" else "double"


func action_text(id: String) -> String:
	match id:
		"pf_tek", "pf_double":
			var s := id.substr(3)
			if stage == "pick_pf" and held_kind == "":
				return "E: %s portafiltreyi al" % ("Tek ağızlı (tek sepet)" if s == "tek" else "Çift ağızlı (double sepet)")
		"grinder":
			if stage == "to_grinder": return "E: Portafiltreyi teraziye koy ve öğüt"
		"station":
			if stage == "to_station": return "E: İğneyle dağıt (WDT)"
			if stage == "wdt_done": return "E: Temperle"
		"machine":
			if stage == "tamped": return "E: Portafiltreyi grup başına tak"
			if stage == "locked" and held_kind == "cup": return "E: Fincanı terazili tepsiye koy"
			if stage == "locked" and held_kind == "": return "Önce bir fincan al"
			if stage == "cup_on": return "E: Çekimi başlat"
			if stage == "pulled" and held_kind == "": return "E: Fincanı al"
			if stage == "used" and held_kind == "": return "E: Portafiltreyi çıkar"
		"cup_tek", "cup_double":
			var s2 := id.substr(4)
			if stage == "locked" and held_kind == "":
				return "E: %s fincanı al" % ("Tek espresso" if s2 == "tek" else "Double espresso")
		"knock":
			if held_kind == "pf_used": return "E: Telveyi boşalt"
		"customer":
			if stage == "cup_taken" and cstate == "wait": return "E: Kahveyi ver"
			if cstate == "wait": return "Sipariş: %s espresso" % size_name(order_size)
	return ""


func _process(delta: float) -> void:
	walk_t += delta
	customer_tick(delta)
	match mode:
		"dose": dose_tick(delta)
		"wdt": wdt_tick(delta)
		"tamp": tamp_tick(delta)
		"lock": lock_tick(delta)
		"pull": pull_tick(delta)
		"":
			if Input.is_action_just_pressed("interact") and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
				interact(look_id)
	if panel.visible:
		panel.queue_redraw()


func interact(id: String) -> void:
	var t := action_text(id)
	if not t.begins_with("E"):
		return
	if id.begins_with("pf_") and stage == "pick_pf":
		held_size = id.substr(3)
		if held_size != order_size: wrong = true
		pf_nodes[held_size].visible = false
		hold("pf", held_size)
		stage = "to_grinder"
	elif id == "grinder":
		drop_held()
		scale_pf = make_portafilter(self, held_size)
		scale_pf.position = GRINDER_SCALE + Vector3(0, 0.07, 0.02)
		scale_pf.rotation_degrees.y = 180.0
		dose_g = 0.0
		open_panel("dose", "Terazide doz")
	elif id == "station" and stage == "to_station":
		wdt_cells.clear()
		for i in 144:
			wdt_cells.append(rng.randf_range(0.35, 1.0))
		wdt_cursor = Vector2.ZERO
		wdt_time = 0.0
		open_panel("wdt", "Dağıtma (WDT)")
	elif id == "station" and stage == "wdt_done":
		bubble_pos = Vector2.ZERO
		bubble_vel = Vector2.RIGHT.rotated(rng.randf() * TAU) * 220.0
		tamp_time = 0.0
		tamp_acc = 0.0
		open_panel("tamp", "Temperleme")
	elif id == "machine" and stage == "tamped":
		lock_px = 0.0
		open_panel("lock", "Portafiltreyi kilitle")
	elif id.begins_with("cup_") and stage == "locked":
		cup_size = id.substr(4)
		if cup_size != order_size: wrong = true
		hold("cup", cup_size)
	elif id == "machine" and stage == "locked" and held_kind == "cup":
		drop_held()
		placed_cup = make_cup(self, cup_size)
		placed_cup.position = CUP_POS + Vector3(0, 0.005, 0)
		stage = "cup_on"
	elif id == "machine" and stage == "cup_on":
		pull_t = 0.0
		pull_g = 0.0
		stream.visible = false
		open_panel("pull", "Çekim")
	elif id == "machine" and stage == "pulled":
		placed_cup.queue_free()
		steam.emitting = false
		hold("cup_full", cup_size)
		stage = "cup_taken"
	elif id == "machine" and stage == "used":
		locked_pf.queue_free()
		hold("pf_used", held_size)
	elif id == "knock":
		drop_held()
		pf_nodes[held_size].visible = true
		prompt_flash("Tak tak! Telve boşaldı.")
		stage = "pick_pf" if cstate == "none" or cstate == "wait" else "pick_pf"
	elif id == "customer":
		serve()


func prompt_flash(text: String) -> void:
	info.text = "CoffeBean · birinci şahıs deneme\n" + text


func hold(kind: String, size: String) -> void:
	drop_held()
	held_kind = kind
	held = Node3D.new()
	cam.add_child(held)
	held.position = Vector3(0.32, -0.3, -0.6)
	if kind.begins_with("pf"):
		var pf := make_portafilter(held, size, kind != "pf" or stage != "pick_pf")
		pf.rotation_degrees.y = 25
	else:
		make_cup(held, size, 1.0 if kind == "cup_full" else 0.0).position.y = -0.06


func drop_held() -> void:
	if held:
		held.queue_free()
	held = null
	held_kind = ""


## Ekipmanın bir adımın eşiklerini genişletme çarpanı (T12 ekipman.gd doldurur).
func genislik(_adim: String) -> float:
	return 1.0


## Çekim durdurulsun mu (T12: süper otomatik hedefte kendisi durdurur).
func _cekim_dur() -> bool:
	return Input.is_action_just_pressed("interact")


func open_panel(m: String, title: String) -> void:
	mode = m
	panel.visible = true
	panel_title.text = title
	prompt.text = ""
	gauge.visible = false


func close_panel(score: float, label: String) -> void:
	step_scores.append(score)
	mode = ""
	panel.visible = false
	var names := {100.0: "Mükemmel!", 88.0: "Güzel", 72.0: "İyi", 0.0: "Kaçtı"}
	var nm: String = names.get(score, "%d puan" % int(score))
	prompt_flash("%s: %s" % [label, nm])


# --- 2. terazide doz: öğüt + ince ayar (ibre yok; sapmaya göre puan) ---
func dose_tick(delta: float) -> void:
	var target: float = DOSE[held_size]
	if Input.is_action_pressed("interact"):
		dose_g += 2.2 * delta
	dose_g = min(dose_g, target + 6.0)
	panel_text.text = "Terazi: %.1f g   (hedef %.0f g)\nE basılı: öğüt · E kısa: +0,2 g · R: kaşıkla −0,2 g · Boşluk: Tamam" % [dose_g, target]


func finish_dose() -> void:
	var dev: float = abs(dose_g - DOSE[held_size])
	var k := genislik("dose")
	var sc: float = 100.0 if dev <= 0.2 * k else (88.0 if dev <= 0.5 * k else (72.0 if dev <= 1.0 * k else 0.0))
	scale_pf.queue_free()
	hold("pf_dosed", held_size)
	stage = "to_station"
	close_panel(sc, "Doz %.1f g" % dose_g)


# --- 3. dağıtma (WDT): daire çizerek yüzeyi düzle ---
func wdt_tick(delta: float) -> void:
	wdt_time += delta
	var even := 0
	for i in wdt_cells.size():
		var c := Vector2((i % 12) - 5.5, (i / 12) - 5.5) * 25.0
		if c.distance_to(wdt_cursor) < 38.0:
			wdt_cells[i] = move_toward(wdt_cells[i], 0.0, delta * 2.2)
		if wdt_cells[i] < 0.12:
			even += 1
	var pct: float = float(even) / wdt_cells.size()
	panel_text.text = "Fareyi daire çizerek gezdir · düzlenen %%%d · %.0f sn kaldı · Boşluk: bitir" % [int(pct * 100), max(8.0 - wdt_time, 0.0)]
	if wdt_time >= 8.0 or pct >= 0.97:
		finish_wdt()


func finish_wdt() -> void:
	var even := 0
	for v in wdt_cells:
		if v < 0.12: even += 1
	var pct: float = float(even) / wdt_cells.size()
	var k := genislik("wdt")
	var sc: float = 100.0 if pct >= 1.0 - 0.05 * k else (88.0 if pct >= 1.0 - 0.15 * k else (72.0 if pct >= 1.0 - 0.3 * k else 0.0))
	stage = "wdt_done"
	close_panel(sc, "Dağıtma %%%d" % int(pct * 100))


# --- 4. temperleme: su terazisinin kabarcığını ortada tut ---
## Kural 9: halka yarıçapları kabarcığın kayma hızıyla orantılı (hız × zaman penceresi).
func tamp_rings() -> Array:
	var v := bubble_vel.length()
	return [v * WIN_YELLOW, v * WIN_LIGHT, v * WIN_DARK]


func tamp_tick(delta: float) -> void:
	tamp_time += delta
	bubble_vel = bubble_vel.rotated(rng.randf_range(-2.5, 2.5) * delta)
	bubble_pos += bubble_vel * delta
	bubble_pos = bubble_pos.limit_length(150.0)
	var r: Array = tamp_rings()
	var d: float = bubble_pos.length()
	var sc: float = 100.0 if d <= r[2] else (88.0 if d <= r[1] else (72.0 if d <= r[0] else 0.0))
	tamp_acc += sc * delta
	panel_text.text = "Temper bastırılıyor… kabarcığı fareyle ortada tut  (%.1f sn)" % max(2.0 - tamp_time, 0.0)
	if tamp_time >= 2.0:
		var avg: float = tamp_acc / tamp_time
		stage = "tamped"
		hold("pf_dosed", held_size)
		close_panel(round(avg), "Temperleme")


# --- 5. takma: fareyi sağa çekerek kilitle (hareket adımı) ---
func lock_tick(_delta: float) -> void:
	var f: float = clamp(lock_px / 260.0, 0.0, 1.0)
	panel_text.text = "Fareyi sağa çekerek portafiltreyi çevir  %%%d" % int(f * 100)
	if f >= 1.0:
		drop_held()
		locked_pf = make_portafilter(self, held_size, true)
		locked_pf.position = MACHINE + Vector3(0, 0.27, -0.3)
		locked_pf.rotation_degrees.y = 180.0
		stage = "locked"
		mode = ""
		panel.visible = false
		prompt_flash("Portafiltre kilitlendi")


# --- 6. çekim: terazi + renk izlenir, hedef gramda durdurulur ---
func pull_tick(delta: float) -> void:
	pull_t += delta
	var rate: float = FLOW[held_size]
	if pull_t > PREINFUSE:
		pull_g += rate * delta
		stream.visible = true
	var target: float = YIELD[held_size]
	var top := MACHINE.y + 0.25
	var cup_top := CUP_POS.y + (0.07 if cup_size == "tek" else 0.095)
	(stream.mesh as CylinderMesh).height = max(top - cup_top, 0.01)
	stream.position = Vector3(CUP_POS.x, (top + cup_top) * 0.5, CUP_POS.z)
	var f: float = pull_g / target
	var col: Color = COFFEE.lerp(Color("a8743f"), clamp((f - 0.55) * 2.0, 0.0, 1.0)).lerp(Color("d9b36a"), clamp((f - 1.0) * 4.0, 0.0, 1.0))
	(stream.material_override as StandardMaterial3D).albedo_color = col
	panel_text.text = "Terazi %.1f g  ·  %.0f sn   (hedef %.0f g, ~23 sn)\nKahvenin rengi açılınca hedefe yaklaşıyorsun · E: Durdur" % [pull_g, pull_t, target]
	if _cekim_dur() or pull_g >= target * 1.6:
		stream.visible = false
		var secs: float = abs(pull_g - target) / rate
		var sc: float = 100.0 if secs <= WIN_DARK else (88.0 if secs <= WIN_LIGHT else (72.0 if secs <= WIN_YELLOW else 0.0))
		placed_cup.queue_free()
		placed_cup = make_cup(self, cup_size, clamp(pull_g / target, 0.2, 1.0))
		placed_cup.position = CUP_POS + Vector3(0, 0.005, 0)
		steam.position = CUP_POS + Vector3(0, 0.12, 0)
		steam.emitting = true
		stage = "pulled"
		close_panel(sc, "Çekim %.1f g · %.0f sn" % [pull_g, pull_t])


# ---------- paneller ----------
func draw_panel() -> void:
	var c := Vector2(190, 190)
	match mode:
		"dose":
			panel.draw_rect(Rect2(40, 120, 300, 160), Color(0.1, 0.1, 0.11, 0.9))
			var target: float = DOSE[held_size]
			panel.draw_string(ThemeDB.fallback_font, Vector2(70, 225), "%.1f g" % dose_g, HORIZONTAL_ALIGNMENT_LEFT, -1, 72, Color("7fd0a0") if abs(dose_g - target) <= 0.5 else Color("f3e6cf"))
		"wdt":
			panel.draw_circle(c, 165.0, Color(0.15, 0.1, 0.07, 0.92))
			for i in wdt_cells.size():
				var p := c + Vector2((i % 12) - 5.5, (i / 12) - 5.5) * 25.0
				if p.distance_to(c) > 150.0: continue
				var v := wdt_cells[i]
				panel.draw_circle(p, 6.0 + v * 9.0, Color(0.33, 0.2, 0.12).lerp(Color(0.18, 0.11, 0.07), 1.0 - v))
			panel.draw_circle(c + wdt_cursor, 6.0, Color("e9e1d3"))
			panel.draw_arc(c + wdt_cursor, 38.0, 0, TAU, 32, Color(1, 1, 1, 0.35), 2.0)
		"tamp":
			panel.draw_circle(c, 165.0, Color(0.85, 0.92, 0.75, 0.9))
			var r: Array = tamp_rings()
			panel.draw_circle(c, r[0], Color("e2c044"))
			panel.draw_circle(c, r[1], Color("8fcf6a"))
			panel.draw_circle(c, r[2], Color("2f8a3a"))
			panel.draw_circle(c + bubble_pos, 16.0, Color(1, 1, 1, 0.85))
			panel.draw_arc(c + bubble_pos, 16.0, 0, TAU, 24, Color(0.3, 0.4, 0.3), 2.0)
		"lock":
			var a: float = -PI * 0.75 + clamp(lock_px / 260.0, 0.0, 1.0) * PI * 0.5
			panel.draw_circle(c, 110.0, Color(0.55, 0.56, 0.58, 0.9))
			panel.draw_line(c, c + Vector2.from_angle(a) * 160.0, Color("2e2622"), 26.0)
		"pull":
			var target: float = YIELD[held_size]
			var x0 := -100.0
			var w := 580.0
			var vmax := target * 1.6
			panel.draw_rect(Rect2(x0, 300, w, 34), Color(0.12, 0.09, 0.07, 0.9))
			var rate: float = FLOW[held_size]
			var cx := x0 + target / vmax * w
			for z in [[WIN_YELLOW, Color("e2c044")], [WIN_LIGHT, Color("8fcf6a")], [WIN_DARK, Color("2f8a3a")]]:
				var half: float = rate * z[0] / vmax * w
				panel.draw_rect(Rect2(cx - half, 300, half * 2.0, 34), z[1])
			panel.draw_rect(Rect2(x0 + min(pull_g, vmax) / vmax * w - 2, 294, 4, 46), Color.WHITE)


# ---------- müşteri ----------
func spawn_customer() -> void:
	var i := n_customer % shirt_colors.size()
	customer = make_person(shirt_colors[i], hair_colors[i], false, i % 2 == 1)
	customer.position = DOOR
	add_child(customer)
	var body := collider(Vector3(0, 1.0, 0), Vector3(0.7, 2.0, 0.5), "customer")
	body.reparent(customer, false)
	n_customer += 1
	order_size = "double" if rng.randf() < 0.55 else "tek"
	cstate = "walk_in"


func customer_tick(delta: float) -> void:
	if customer == null:
		return
	match cstate:
		"walk_in":
			if walk_to(customer, QUEUE, delta):
				cstate = "wait"
				customer.rotation.y = PI
				pose(customer, 0.0)
				show_bubble("Bir %s espresso lütfen!" % size_name(order_size))
		"walk_out":
			if walk_to(customer, DOOR, delta):
				customer.queue_free()
				customer = null
				cstate = "none"
				get_tree().create_timer(1.5).timeout.connect(spawn_customer)
		"wait":
			customer.position.y = abs(sin(walk_t * 2.0)) * 0.012


func walk_to(who: Node3D, target: Vector3, delta: float) -> bool:
	var d := target - who.position
	d.y = 0
	if d.length() < 0.05:
		who.position = target
		return true
	who.rotation.y = atan2(d.x, d.z)
	who.position += d.normalized() * min(d.length(), 1.4 * delta)
	pose(who, sin(walk_t * 8.0) * 0.5)
	who.position.y = abs(sin(walk_t * 8.0)) * 0.035
	return false


func pose(who: Node3D, swing: float) -> void:
	who.get_node("LegL").rotation.x = swing
	who.get_node("LegR").rotation.x = -swing
	who.get_node("ArmL").rotation.x = -swing * 0.8
	who.get_node("ArmR").rotation.x = swing * 0.8


func show_bubble(text: String) -> void:
	if bubble:
		bubble.queue_free()
	bubble = Label3D.new()
	bubble.text = text
	bubble.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	bubble.pixel_size = 0.0022
	bubble.font_size = 48
	bubble.outline_size = 14
	bubble.modulate = Color("2e2016")
	bubble.outline_modulate = Color("fbf6ee")
	bubble.position = Vector3(0, 2.2, 0)
	customer.add_child(bubble)


func serve() -> void:
	drop_held()
	var avg := 0.0
	for s in step_scores:
		avg += s
	avg = avg / max(step_scores.size(), 1)
	step_scores.clear()
	var say := "Bunu içemem!"
	if wrong: say = "Ben bunu istemedim!"
	elif avg >= 95: say = "İçtiğim en iyi espresso!"
	elif avg >= 80: say = "Çok lezzetli, eline sağlık!"
	elif avg >= 60: say = "İdare eder."
	elif avg >= 40: say = "Biraz acı olmuş."
	show_bubble("%s  (%%%d)" % [say, int(round(avg))] if not wrong else say)
	wrong = false
	stage = "used"
	prompt_flash("Portafiltreyi çıkar ve telve kutusunda boşalt")
	cstate = "leaving"
	get_tree().create_timer(1.8).timeout.connect(func(): cstate = "walk_out")


# ---------- ekran görüntüsü (yalnız kontrol için) ----------
func shot(dir: String, name: String) -> void:
	await get_tree().create_timer(0.35).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(dir + "/" + name)


func auto_shots(dir: String) -> void:
	await get_tree().create_timer(4.5).timeout
	await shot(dir, "fp1_siparis.png")
	look_id = "pf_double"
	interact("pf_double")
	player.position = Vector3(-1.65, 0.05, -2.0)
	yaw = PI
	pitch = -0.7
	apply_look()
	interact("grinder")
	dose_g = 17.6
	await shot(dir, "fp2_doz.png")
	finish_dose()
	interact("station")
	for k in 40:
		wdt_cursor = Vector2.from_angle(k * 0.5) * (40.0 + k * 2.5)
		wdt_tick(0.05)
	await shot(dir, "fp3_dagitma.png")
	finish_wdt()
	interact("station")
	bubble_pos = Vector2(18, -10)
	await shot(dir, "fp4_temper.png")
	mode = ""
	panel.visible = false
	stage = "tamped"
	player.position = Vector3(-2.45, 0.05, -2.05)
	pitch = -0.6
	apply_look()
	interact("machine")
	lock_px = 300.0
	lock_tick(0.0)
	interact("cup_double")
	interact("machine")
	interact("machine")
	pull_t = 20.0
	pull_g = 24.0
	pull_tick(0.016)
	await shot(dir, "fp5_cekim.png")
	get_tree().quit()
