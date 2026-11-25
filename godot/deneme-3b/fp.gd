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
const WIN_DARK := 0.027
const WIN_LIGHT := 0.067
const WIN_YELLOW := 0.133

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


func kit(file: String, pos: Vector3, rot_y := 0.0, sc := 1.0) -> Node3D:
	var n: Node3D = load("res://kits/%s.gltf" % file).instantiate()
	n.position = pos
	n.rotation_degrees.y = rot_y
	n.scale = Vector3.ONE * sc
	add_child(n)
	return n

# ---------- sahne ----------
func _ready() -> void:
	InputMap.add_action("interact")
	var ek := InputEventKey.new(); ek.physical_keycode = KEY_E; InputMap.action_add_event("interact", ek)
	var mb := InputEventMouseButton.new(); mb.button_index = MOUSE_BUTTON_LEFT; InputMap.action_add_event("interact", mb)
	build_room()
	build_counter()
	build_machine()
	build_shell()
	build_props()
	build_lights()
	build_player()
	build_ui()
	spawn_customer()
	if OS.get_cmdline_user_args().size() > 0:
		auto_shots(OS.get_cmdline_user_args()[0])


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
	# dekor: hazır paket (KayKit Furniture Bits, CC0)
	kit("rug_oval_A", Vector3(1.8, 0.0, 0.6), 0.0, 1.4)
	kit("table_medium", Vector3(1.8, 0.0, 0.4))
	kit("chair_A_wood", Vector3(0.85, 0.0, 0.4), 90.0)
	kit("chair_A_wood", Vector3(2.75, 0.0, 0.4), -90.0)
	kit("armchair", Vector3(2.9, 0.0, 2.6), -135.0)
	kit("table_small", Vector3(1.8, 0.0, 2.8))
	kit("lamp_standing", Vector3(3.6, 0.0, -2.5))
	kit("shelf_B_large_decorated", Vector3(-2.0, 2.15, -3.0))
	kit("pictureframe_large_A", Vector3(-4.1, 2.2, 0.2), 90.0)
	kit("pictureframe_medium", Vector3(-4.1, 2.0, 1.4), 90.0)
	kit("cactus_medium_A", Vector3(3.55, 0.0, 1.0))

func build_counter() -> void:
	rbox(self, Vector3(-2.0, 0.47, -1.0), Vector3(2.9, 0.94, 0.8), COUNTER, 0.05)
	rbox(self, Vector3(-2.0, 0.97, -1.0), Vector3(3.05, 0.07, 0.92), WOOD, 0.03, 0.55)
	# lambri çizgileri
	for i in 9:
		rbox(self, Vector3(-3.3 + i * 0.32, 0.47, -0.59), Vector3(0.03, 0.8, 0.02), COUNTER.darkened(0.12), 0.01)
	kit("cactus_small_A", Vector3(-0.68, 1.0, -1.3), 0.0, 0.6)
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


func make_portafilter(parent: Node3D) -> Node3D:
	var pf := Node3D.new()
	parent.add_child(pf)
	cyl(pf, Vector3.ZERO, 0.058, 0.05, STEEL, 0.25, 0.8)
	rbox(pf, Vector3(0, 0, 0.17), Vector3(0.05, 0.04, 0.24), DARK, 0.02)
	return pf


func make_cup_mesh(parent: Node3D, full: bool) -> Node3D:
	var c := Node3D.new()
	parent.add_child(c)
	cyl(c, Vector3(0, 0.01, 0), 0.11, 0.02, WHITE, 0.3)
	cyl(c, Vector3(0, 0.07, 0), 0.07, 0.11, WHITE, 0.3)
	if full:
		cyl(c, Vector3(0, 0.115, 0), 0.062, 0.01, Color("8a5a35"), 0.2)
	return c


func build_props() -> void:
	# portafiltre makinede
	pf_on_machine = make_portafilter(self)
	pf_on_machine.position = MACHINE + Vector3(0, 0.27, -0.3)
	pf_on_machine.rotation_degrees.y = 180.0
	# fincan yığını
	for i in 3:
		make_cup_mesh(self, false).position = Vector3(-3.2, 1.0 + i * 0.12, -1.1)
	# temper istasyonu
	rbox(self, Vector3(-1.32, 1.02, -1.15), Vector3(0.22, 0.04, 0.22), Color("3a2a20"), 0.02)
	cyl(self, Vector3(-1.32, 1.07, -1.15), 0.058, 0.03, STEEL, 0.25, 0.8)
	cyl(self, Vector3(-1.32, 1.15, -1.15), 0.025, 0.14, WOOD, 0.5)
	# etkileşim kutuları (katman 2)
	collider(MACHINE + Vector3(0, 0.3, -0.1), Vector3(0.8, 0.6, 0.6), "machine")
	collider(Vector3(-1.65, 1.35, -1.1), Vector3(0.3, 0.7, 0.3), "grinder")
	collider(Vector3(-1.32, 1.1, -1.15), Vector3(0.24, 0.2, 0.24), "tamper")
	collider(Vector3(-3.2, 1.15, -1.1), Vector3(0.26, 0.36, 0.26), "cups")
	cup.visible = false


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
	info.text = "CoffeBean · birinci şahıs deneme\nWASD yürü · fare bak · E ya da sol tık: etkileşim · Esc: fareyi bırak"
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


func style(l: Label, size: int) -> void:
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color("fbf6ee"))
	l.add_theme_color_override("font_outline_color", Color("2e2016"))
	l.add_theme_constant_override("outline_size", 8)


# ---------- oyuncu ----------
func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		yaw -= event.relative.x * 0.0025
		pitch = clamp(pitch - event.relative.y * 0.0025, -1.3, 1.2)
		apply_look()
	elif event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		get_viewport().set_input_as_handled()


func _physics_process(delta: float) -> void:
	var dir := Vector3.ZERO
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
	if g_active == "":
		prompt.text = action_text(look_id)


func action_text(id: String) -> String:
	match id:
		"machine":
			if pf_state == "locked_empty" and held_kind == "": return "E: Portafiltreyi al"
			if pf_state == "held_tamped": return "E: Portafiltreyi tak"
			if held_kind == "cup" and cup_state == "held_empty" and pf_state in ["locked_ready", "locked_empty"]: return "E: Fincanı makineye koy"
			if pf_state == "locked_ready" and cup_state == "under": return "E: Çekimi başlat"
			if cup_state == "full" and held_kind == "": return "E: Fincanı al"
			if pf_state == "locked_ready" and cup_state == "none": return "Önce bir fincan koy"
		"grinder":
			if pf_state == "held_empty": return "E basılı tut: Öğüt (hedef 18 g)"
		"tamper":
			if pf_state == "held_ground": return "E basılı tut: Temperle (hedef 15 kg)"
		"cups":
			if held_kind == "" and cup_state == "none": return "E: Fincan al"
		"customer":
			if cup_state == "held_full" and cstate == "wait": return "E: Kahveyi ver"
			if cstate == "wait": return "Sipariş: espresso"
	return ""


func _process(delta: float) -> void:
	walk_t += delta
	customer_tick(delta)
	if g_active != "":
		gauge_tick(delta)
		return
	if Input.is_action_just_pressed("interact") and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		interact(look_id)


func interact(id: String) -> void:
	var t := action_text(id)
	if t == "" or not t.begins_with("E"):
		return
	match t:
		"E: Portafiltreyi al":
			pf_on_machine.visible = false
			hold("pf")
			pf_state = "held_empty"
		"E basılı tut: Öğüt (hedef 18 g)":
			start_gauge("grind", "Öğütme", 0.0, 24.0, 18.0, 5.0, " g", true)
		"E basılı tut: Temperle (hedef 15 kg)":
			start_gauge("tamp", "Temperleme", 0.0, 30.0, 15.0, 11.0, " kg", true)
		"E: Portafiltreyi tak":
			drop_held()
			pf_on_machine.visible = true
			pf_state = "locked_ready"
		"E: Fincan al":
			hold("cup")
			cup_state = "held_empty"
		"E: Fincanı makineye koy":
			drop_held()
			cup.visible = true
			cup_fill.visible = false
			cup_state = "under"
		"E: Çekimi başlat":
			cup_state = "brewing"
			stream.visible = true
			cup_fill.visible = true
			start_gauge("pull", "Ekstraksiyon (4× hızlı)", 0.0, 45.0, 27.5, 4.0, " sn", false)
		"E: Fincanı al":
			cup.visible = false
			steam.emitting = false
			hold("cup_full")
			cup_state = "held_full"
		"E: Kahveyi ver":
			serve()


func hold(kind: String) -> void:
	drop_held()
	held_kind = kind
	held = Node3D.new()
	cam.add_child(held)
	held.position = Vector3(0.32, -0.3, -0.6)
	if kind == "pf":
		var pf := make_portafilter(held)
		pf.rotation_degrees.y = 25
		if pf_state != "held_empty":
			cyl(pf, Vector3(0, 0.02, 0), 0.05, 0.02, COFFEE, 0.9)
	else:
		make_cup_mesh(held, kind == "cup_full").position.y = -0.05


func drop_held() -> void:
	if held:
		held.queue_free()
	held = null
	held_kind = ""


# ---------- gösterge (Kural 9) ----------
func start_gauge(id: String, title: String, vmin: float, vmax: float, target: float, speed: float, unit: String, hold_mode: bool) -> void:
	g_active = id
	g_min = vmin
	g_max = vmax
	g_target = target
	g_speed = speed
	g_unit = unit
	g_hold = hold_mode
	g_value = vmin
	gauge.visible = true
	gauge_label.text = title
	var w := gauge_bar.size.x
	var pct_speed := speed / (vmax - vmin)   # çubuk / sn
	var wins := [WIN_YELLOW, WIN_LIGHT, WIN_DARK]
	for i in 3:
		var half: float = pct_speed * wins[i] * w
		var cx := (target - vmin) / (vmax - vmin) * w
		gauge_zones[i].position.x = cx - half
		gauge_zones[i].size.x = half * 2.0
	prompt.text = "Hedefte bırak" if hold_mode else "E: Durdur"


func gauge_tick(delta: float) -> void:
	var running := Input.is_action_pressed("interact") if g_hold else true
	if running:
		g_value = min(g_value + g_speed * delta, g_max)
	gauge_needle.position.x = (g_value - g_min) / (g_max - g_min) * gauge_bar.size.x - 2
	gauge_label.text = "%s: %.1f%s" % [gauge_label.text.split(":")[0], g_value, g_unit]
	if g_active == "pull":
		fill_cup(clamp(g_value / g_target, 0.0, 1.0))
	var finished := false
	if g_hold and not Input.is_action_pressed("interact"):
		finished = true
	if not g_hold and Input.is_action_just_pressed("interact"):
		finished = true
	if g_value >= g_max:
		finished = true
	if finished:
		finish_gauge()


func score_of(v: float) -> float:
	var secs: float = abs(v - g_target) / g_speed
	if secs <= WIN_DARK: return 100.0
	if secs <= WIN_LIGHT: return 88.0
	if secs <= WIN_YELLOW: return 72.0
	return 0.0


func finish_gauge() -> void:
	var sc := score_of(g_value)
	scores.append(sc)
	var names := {100.0: "Mükemmel!", 88.0: "Güzel", 72.0: "İyi", 0.0: "Kaçtı"}
	gauge_label.text = "%s  (%.1f%s)" % [names[sc], g_value, g_unit]
	match g_active:
		"grind":
			pf_state = "held_ground"
			hold("pf")
		"tamp":
			pf_state = "held_tamped"
			hold("pf")
		"pull":
			stream.visible = false
			steam.emitting = true
			cup_state = "full"
			pf_state = "locked_used"
	g_active = ""
	get_tree().create_timer(1.6).timeout.connect(func(): if g_active == "": gauge.visible = false)


func fill_cup(f: float) -> void:
	var h := 0.01 + 0.085 * f
	(cup_fill.mesh as CylinderMesh).height = h
	cup_fill.position.y = 0.025 + h * 0.5
	var top := 1.0 + 0.25
	var bottom := CUP_POS.y + 0.025 + h
	(stream.mesh as CylinderMesh).height = max(top - bottom, 0.01)
	stream.position = Vector3(CUP_POS.x, (top + bottom) * 0.5, CUP_POS.z)


# ---------- müşteri ----------
func spawn_customer() -> void:
	var i := n_customer % shirt_colors.size()
	customer = make_person(shirt_colors[i], hair_colors[i], false, i % 2 == 1)
	customer.position = DOOR
	add_child(customer)
	var body := collider(Vector3(0, 1.0, 0), Vector3(0.7, 2.0, 0.5), "customer")
	body.reparent(customer, false)
	n_customer += 1
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
				show_bubble("Bir espresso lütfen!")
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
	cup_state = "none"
	pf_state = "locked_empty"
	var avg := 0.0
	for s in scores:
		avg += s
	avg = avg / max(scores.size(), 1)
	scores.clear()
	var say := "Bunu içemem!"
	if avg >= 95: say = "İçtiğim en iyi espresso!"
	elif avg >= 80: say = "Çok lezzetli, eline sağlık!"
	elif avg >= 60: say = "İdare eder."
	elif avg >= 40: say = "Biraz acı olmuş."
	show_bubble("%s  (%%%d)" % [say, int(round(avg))])
	cstate = "leaving"
	get_tree().create_timer(1.8).timeout.connect(func(): cstate = "walk_out")


# ---------- ekran görüntüsü (yalnız kontrol için) ----------
func auto_shots(dir: String) -> void:
	await get_tree().create_timer(4.5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(dir + "/fp1_tezgah.png")
	yaw = PI - 0.2
	pitch = -0.6
	player.position = Vector3(-1.9, 0.05, -2.05)
	apply_look()
	pf_state = "held_empty"
	pf_on_machine.visible = false
	hold("pf")
	start_gauge("grind", "Öğütme", 0.0, 24.0, 18.0, 5.0, " g", true)
	g_value = 15.2
	gauge_needle.position.x = (g_value) / 24.0 * gauge_bar.size.x - 2
	g_active = ""
	prompt.text = "Hedefte bırak"
	await get_tree().create_timer(0.3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(dir + "/fp2_ogutme.png")
	gauge.visible = false
	drop_held()
	pf_on_machine.visible = true
	pf_state = "locked_ready"
	cup.visible = true
	cup_state = "under"
	yaw = PI
	pitch = -0.62
	player.position = Vector3(-2.45, 0.05, -2.05)
	apply_look()
	stream.visible = true
	cup_fill.visible = true
	fill_cup(0.6)
	await get_tree().create_timer(0.3).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(dir + "/fp3_cekim.png")
	get_tree().quit()
