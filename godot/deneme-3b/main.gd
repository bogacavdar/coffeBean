extends Node3D
## CoffeBean 3B görsel denemesi: dükkan, barista, müşteri, kamera geçişi ve kahve akışı.
## Oyun kodu değil; görsel tarzı ve kamera hissini göstermek için.

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

const VIEW_FAR := {"pos": Vector3(-0.2, 0.9, 0.2), "size": 9.5}
const VIEW_NEAR := {"pos": Vector3(-2.3, 1.2, -0.95), "size": 2.0}
const DOOR := Vector3(-3.4, 0, 3.2)
const QUEUE := Vector3(-2.45, 0, 0.15)
const CUP_POS := Vector3(-2.45, 1.0, -0.86)

var cam: Camera3D
var cam_focus := Vector3.ZERO
var barista: Node3D
var customer: Node3D
var state := "idle"
var walk_t := 0.0
var cup: Node3D
var cup_fill: MeshInstance3D
var stream: MeshInstance3D
var steam: CPUParticles3D
var bubble: Label3D
var hint: Label
var serve_btn: Button
var order_names := ["espresso", "double espresso", "cortado", "flat white", "americano"]
var shirt_colors := [Color("4f6fa8"), Color("a8574f"), Color("6f8f4f"), Color("8a6fa8"), Color("c99a3f")]
var hair_colors := [Color("3b2618"), Color("1f1a17"), Color("8a5a2b"), Color("d9b46a"), Color("6b3a22")]
var n_customer := 0


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
	build_room()
	build_counter()
	build_machine()
	barista = make_person(Color("f6f2ea"), Color("d9b46a"), true, true)
	barista.position = Vector3(-2.3, 0, -2.05)
	add_child(barista)
	build_lights()
	build_camera()
	build_ui()
	spawn_customer()
	if OS.get_cmdline_user_args().size() > 0:
		auto_shots(OS.get_cmdline_user_args()[0])


func auto_shots(dir: String) -> void:
	await get_tree().create_timer(3.5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(dir + "/shot1_dukkan.png")
	take_order()
	await get_tree().create_timer(3.2).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(dir + "/shot2_akis.png")
	await get_tree().create_timer(2.5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(dir + "/shot3_hazir.png")
	serve()
	await get_tree().create_timer(2.6).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(dir + "/shot4_gidis.png")
	get_tree().quit()


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
	kit("chair_stool_wood", Vector3(-1.2, 0.0, 0.0))


func build_counter() -> void:
	rbox(self, Vector3(-2.0, 0.47, -1.0), Vector3(2.9, 0.94, 0.8), COUNTER, 0.05)
	rbox(self, Vector3(-2.0, 0.97, -1.0), Vector3(3.05, 0.07, 0.92), WOOD, 0.03, 0.55)
	# lambri çizgileri
	for i in 9:
		rbox(self, Vector3(-3.3 + i * 0.32, 0.47, -0.59), Vector3(0.03, 0.8, 0.02), COUNTER.darkened(0.12), 0.01)
	kit("cactus_small_A", Vector3(-0.75, 1.0, -1.2), 0.0, 0.7)
	# kasa
	rbox(self, Vector3(-1.05, 1.13, -0.95), Vector3(0.34, 0.26, 0.3), DARK, 0.05)
	rbox(self, Vector3(-1.05, 1.32, -0.98), Vector3(0.28, 0.14, 0.04), Color("3f6b5a"), 0.02)


func build_machine() -> void:
	var g := Node3D.new()
	g.position = Vector3(-2.45, 1.0, -1.15)
	add_child(g)
	rbox(g, Vector3(0, 0.33, 0), Vector3(0.78, 0.62, 0.5), STEEL, 0.07, 0.3, 0.6)
	rbox(g, Vector3(0, 0.66, 0), Vector3(0.7, 0.04, 0.42), DARK, 0.02)
	rbox(g, Vector3(0, 0.47, 0.255), Vector3(0.7, 0.2, 0.02), COPPER, 0.02, 0.35, 0.3)
	rbox(g, Vector3(0, 0.03, 0.22), Vector3(0.6, 0.04, 0.3), DARK, 0.015)
	cyl(g, Vector3(0, 0.33, 0.3), 0.07, 0.1, STEEL, 0.25, 0.8)
	cyl(g, Vector3(0, 0.27, 0.3), 0.055, 0.04, DARK, 0.4)
	rbox(g, Vector3(0, 0.27, 0.48), Vector3(0.05, 0.04, 0.26), DARK, 0.02)
	cyl(g, Vector3(0.29, 0.3, 0.3), 0.012, 0.26, STEEL, 0.2, 0.9)
	sph(g, Vector3(-0.2, 0.56, 0.26), 0.05, Color("f3ead8"))
	sph(g, Vector3(0.2, 0.56, 0.26), 0.05, Color("f3ead8"))
	# öğütücü
	var gr := Node3D.new()
	gr.position = Vector3(-1.65, 1.0, -1.2)
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


## Tombul oyuncak karakter: bacak ve kollar kalça/omuzdan döner.
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


func build_lights() -> void:
	var sun := DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.9, 0.76)
	sun.light_energy = 0.62
	sun.shadow_enabled = true
	sun.shadow_blur = 1.5
	sun.shadow_bias = 0.1
	sun.shadow_normal_bias = 2.0
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 24.0
	add_child(sun)
	sun.look_at_from_position(Vector3(4, 9, 6), Vector3.ZERO)
	var lamp := OmniLight3D.new()
	lamp.light_color = Color(1.0, 0.78, 0.5)
	lamp.light_energy = 0.9
	lamp.omni_range = 3.5
	lamp.position = Vector3(3.5, 1.9, -2.3)
	add_child(lamp)
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("2e2016")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.66, 0.68, 0.76)
	env.ambient_light_energy = 0.32
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 0.9
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)


func build_camera() -> void:
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.rotation_degrees = Vector3(-26.565, 45, 0)
	cam.near = 0.1
	cam.far = 60.0
	add_child(cam)
	cam.make_current()
	set_view(VIEW_FAR["pos"], VIEW_FAR["size"])


func set_view(focus: Vector3, size: float) -> void:
	cam_focus = focus
	cam.size = size
	cam.position = focus + cam.basis.z * 20.0


func move_view(target: Dictionary, secs := 0.9) -> void:
	var tw := create_tween().set_parallel(true).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tw.tween_method(func(f: Vector3): set_view(f, cam.size), cam_focus, target["pos"], secs)
	tw.tween_property(cam, "size", float(target["size"]), secs)


func build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var title := Label.new()
	title.text = "CoffeBean · 3B deneme"
	title.position = Vector2(24, 16)
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color("fbf6ee"))
	title.add_theme_color_override("font_outline_color", Color("2e2016"))
	title.add_theme_constant_override("outline_size", 8)
	layer.add_child(title)
	hint = Label.new()
	hint.position = Vector2(24, 60)
	hint.add_theme_font_size_override("font_size", 22)
	hint.add_theme_color_override("font_color", Color("fbf6ee"))
	hint.add_theme_color_override("font_outline_color", Color("2e2016"))
	hint.add_theme_constant_override("outline_size", 8)
	layer.add_child(hint)
	serve_btn = Button.new()
	serve_btn.text = "  Teslim et  "
	serve_btn.add_theme_font_size_override("font_size", 30)
	serve_btn.anchor_left = 0.5
	serve_btn.anchor_right = 0.5
	serve_btn.anchor_top = 1.0
	serve_btn.anchor_bottom = 1.0
	serve_btn.offset_left = -130
	serve_btn.offset_right = 130
	serve_btn.offset_top = -110
	serve_btn.offset_bottom = -40
	serve_btn.visible = false
	serve_btn.pressed.connect(serve)
	layer.add_child(serve_btn)


# ---------- akış ----------
func spawn_customer() -> void:
	var i := n_customer % shirt_colors.size()
	customer = make_person(shirt_colors[i], hair_colors[i], false, i % 2 == 1)
	customer.position = DOOR
	add_child(customer)
	n_customer += 1
	state = "walk_in"
	hint.text = "Müşteri geliyor…"


func _process(delta: float) -> void:
	walk_t += delta
	if barista:
		barista.get_node("Head").rotation.y = sin(walk_t * 0.7) * 0.15
	match state:
		"walk_in":
			if walk_to(customer, QUEUE, delta):
				state = "wait"
				customer.rotation.y = PI
				pose(customer, 0.0)
				show_bubble("Bir %s lütfen!" % order_names[(n_customer - 1) % order_names.size()])
				hint.text = "Müşteriye tıkla: siparişi al"
		"walk_out":
			if walk_to(customer, DOOR, delta):
				customer.queue_free()
				customer = null
				state = "gap"
				get_tree().create_timer(1.2).timeout.connect(spawn_customer)
		"wait":
			pose(customer, 0.0)
			customer.position.y = abs(sin(walk_t * 2.0)) * 0.015


func walk_to(who: Node3D, target: Vector3, delta: float) -> bool:
	var d := target - who.position
	d.y = 0
	if d.length() < 0.05:
		who.position = target
		return true
	who.rotation.y = atan2(d.x, d.z)
	who.position += d.normalized() * min(d.length(), 1.6 * delta)
	pose(who, sin(walk_t * 9.0) * 0.55)
	who.position.y = abs(sin(walk_t * 9.0)) * 0.04
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
	bubble.no_depth_test = true
	bubble.fixed_size = true
	bubble.pixel_size = 0.0016
	bubble.font_size = 30
	bubble.outline_size = 10
	bubble.modulate = Color("2e2016")
	bubble.outline_modulate = Color("fbf6ee")
	bubble.position = Vector3(0, 2.25, 0)
	customer.add_child(bubble)


func _unhandled_input(event: InputEvent) -> void:
	var pressed: bool = (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT) or (event is InputEventScreenTouch and event.pressed)
	if not pressed or state != "wait" or customer == null:
		return
	var head_px: Vector2 = cam.unproject_position(customer.global_position + Vector3(0, 1.2, 0))
	if head_px.distance_to(event.position) < 160.0:
		take_order()


func take_order() -> void:
	state = "brew"
	bubble.text = "Hemen geliyor!"
	hint.text = "Kahve akıyor…"
	move_view(VIEW_NEAR)
	var tw := create_tween()
	tw.tween_interval(1.0)
	tw.tween_callback(start_pour)
	tw.tween_method(fill_cup, 0.0, 1.0, 3.5)
	tw.tween_callback(end_pour)


func start_pour() -> void:
	stream.visible = true
	cup_fill.visible = true


func end_pour() -> void:
	stream.visible = false
	steam.emitting = true
	hint.text = "Hazır: Teslim et"
	serve_btn.visible = true


func fill_cup(f: float) -> void:
	var h := 0.01 + 0.085 * f
	(cup_fill.mesh as CylinderMesh).height = h
	cup_fill.position.y = 0.025 + h * 0.5
	var c := COFFEE.lerp(Color("8a5a35"), clamp((f - 0.6) * 2.5, 0.0, 1.0))
	(cup_fill.material_override as StandardMaterial3D).albedo_color = c
	var top := 1.0 + 0.25
	var bottom := CUP_POS.y + 0.025 + h
	(stream.mesh as CylinderMesh).height = top - bottom
	stream.position = Vector3(CUP_POS.x, (top + bottom) * 0.5, CUP_POS.z)


func serve() -> void:
	serve_btn.visible = false
	steam.emitting = false
	cup_fill.visible = false
	fill_cup(0.0)
	cup_fill.visible = false
	bubble.text = "Teşekkürler, ellerine sağlık!"
	hint.text = ""
	move_view(VIEW_FAR)
	state = "leave_wait"
	get_tree().create_timer(1.4).timeout.connect(leave)


func leave() -> void:
	if bubble:
		bubble.queue_free()
		bubble = null
	state = "walk_out"
