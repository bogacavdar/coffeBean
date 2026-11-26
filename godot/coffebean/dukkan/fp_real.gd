extends "res://dukkan/fp.gd"
## Gerçekçi görünüm: Poly Haven (CC0) modeller ve dokular, Rocketbox (MIT) insanlar.
## Oynanış fp.gd ile aynı; burada yalnız dükkan, makine, ışık ve müşteriler değişir.

const PH := "res://art/ph/%s/%s.gltf"
const QUEUE_R := Vector3(-1.05, 0, 0.25)
const AVATARS := ["Female_Adult_03", "Male_Adult_02", "Female_Adult_08"]
var tex_cache := {}
var anim_lib := {}


# ---------- malzemeler ----------
func tex(name: String) -> Texture2D:
	if not tex_cache.has(name):
		var yol := "res://art/tex/%s" % name
		tex_cache[name] = load(yol) if ResourceLoader.exists(yol) else null   # bazı dokuların pürüz/normal haritası yok
	return tex_cache[name]


## Dünya koordinatına göre döşenen PBR malzeme (kutulara UV gerekmez).
func pbr(base: String, meters := 2.0, tint := Color.WHITE, rough_mul := 1.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_texture = tex(base + "_diff_1k.jpg")
	m.albedo_color = tint
	m.normal_enabled = true
	m.normal_texture = tex(base + "_nor_1k.jpg")
	m.roughness_texture = tex(base + "_rough_1k.jpg")
	m.roughness_texture_channel = BaseMaterial3D.TEXTURE_CHANNEL_RED
	m.roughness = rough_mul
	m.uv1_triplanar = true
	m.uv1_world_triplanar = true
	m.uv1_scale = Vector3.ONE / meters
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	return m


func slab(pos: Vector3, size: Vector3, m: Material, shadow := true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	mi.mesh = b
	mi.material_override = m
	mi.position = pos
	if not shadow:
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	return mi


func ph(name: String, pos: Vector3, rot_y := 0.0, sc := 1.0) -> Node3D:
	var n: Node3D = load(PH % [name, name]).instantiate()
	n.position = pos
	n.rotation_degrees.y = rot_y
	n.scale = Vector3.ONE * sc
	add_child(n)
	return n


func mrbox(parent: Node3D, pos: Vector3, size: Vector3, m: Material, r := 0.02) -> MeshInstance3D:
	var mi := rbox(parent, pos, size, Color.WHITE, r)
	mi.material_override = m
	return mi


func chrome() -> StandardMaterial3D:
	var m := mat(Color(0.86, 0.87, 0.88), 0.12, 1.0)
	return m


# ---------- dükkan ----------
func build_room() -> void:
	var floor_m := pbr("herringbone_parquet", 1.6, Color(0.95, 0.9, 0.85))
	slab(Vector3(0, -0.05, 0.5), Vector3(8.4, 0.1, 7.6), floor_m, false)
	var brick := pbr("rough_plaster_brick", 1.6, Color(1, 0.97, 0.93))
	var plaster := pbr("white_plaster_rough_01", 2.0, Color(0.97, 0.93, 0.86))
	# arka duvar (tezgâh arkası, tuğla) – pencere boşluklu
	slab(Vector3(-1.5, 1.6, -3.05), Vector3(5.4, 3.2, 0.1), brick)
	slab(Vector3(3.6, 0.45, -3.05), Vector3(1.2, 0.9, 0.1), brick)
	slab(Vector3(3.6, 2.9, -3.05), Vector3(1.2, 0.6, 0.1), brick)
	slab(Vector3(1.55, 0.45, -3.05), Vector3(0.7, 0.9, 0.1), brick)
	slab(Vector3(1.55, 2.9, -3.05), Vector3(0.7, 0.6, 0.1), brick)
	slab(Vector3(2.6, 0.45, -3.05), Vector3(1.4, 0.9, 0.1), brick)
	slab(Vector3(2.6, 2.9, -3.05), Vector3(1.4, 0.6, 0.1), brick)
	# pencere: siyah metal çerçeve + cam + dışarıdaki aydınlık
	var frame := mat(Color(0.08, 0.08, 0.08), 0.4, 0.6)
	for x in [1.9, 2.6, 3.3]:
		var fr := MeshInstance3D.new(); var fb := BoxMesh.new(); fb.size = Vector3(0.05, 1.5, 0.08); fr.mesh = fb; fr.material_override = frame
		fr.position = Vector3(x, 1.65, -3.05); add_child(fr)
	for y in [0.92, 2.58, 1.65]:
		var fr2 := MeshInstance3D.new(); var fb2 := BoxMesh.new(); fb2.size = Vector3(1.45, 0.05, 0.08); fr2.mesh = fb2; fr2.material_override = frame
		fr2.position = Vector3(2.6, y, -3.05); add_child(fr2)
	var glass := StandardMaterial3D.new()
	glass.albedo_color = Color(0.8, 0.9, 1.0, 0.12)
	glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	glass.roughness = 0.05
	glass.metallic = 0.2
	slab(Vector3(2.6, 1.65, -3.05), Vector3(1.4, 1.6, 0.01), glass, false)
	var outside := StandardMaterial3D.new()
	outside.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	outside.albedo_color = Color(0.93, 0.96, 1.0)
	slab(Vector3(2.6, 1.65, -3.6), Vector3(3.0, 3.0, 0.05), outside, false)
	# diğer duvarlar (sıva) ve süpürgelik
	slab(Vector3(-4.15, 1.6, 0.5), Vector3(0.1, 3.2, 7.6), plaster)
	slab(Vector3(0, 1.6, 4.35), Vector3(8.4, 3.2, 0.1), plaster)
	slab(Vector3(4.25, 1.6, 0.5), Vector3(0.1, 3.2, 7.6), plaster)
	var skirt := mat(Color(0.16, 0.13, 0.11), 0.6)
	slab(Vector3(-4.09, 0.06, 0.5), Vector3(0.02, 0.12, 7.6), skirt)
	slab(Vector3(4.19, 0.06, 0.5), Vector3(0.02, 0.12, 7.6), skirt)
	slab(Vector3(0, 0.06, 4.29), Vector3(8.4, 0.12, 0.02), skirt)
	# kapı (sol duvar)
	slab(Vector3(-4.08, 1.1, 3.2), Vector3(0.06, 2.2, 1.0), mat(Color(0.12, 0.11, 0.1), 0.45, 0.5))
	slab(Vector3(-4.04, 1.25, 3.2), Vector3(0.02, 1.5, 0.7), glass, false)
	# tavan
	var ceil := slab(Vector3(0, 3.25, 0.5), Vector3(8.4, 0.1, 7.6), pbr("painted_plaster_wall", 2.0, Color(0.55, 0.52, 0.48)), false)
	ceil.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# oturma alanı (Poly Haven, CC0)
	ph("round_wooden_table_01_2k", Vector3(1.7, 0, 0.3), 0.0, 0.75)
	ph("dining_chair_02_1k", Vector3(1.7, 0, -0.45), 0.0)
	ph("dining_chair_02_1k", Vector3(2.45, 0, 0.35), -90.0)
	ph("dining_chair_02_1k", Vector3(0.95, 0, 0.35), 90.0)
	ph("Sofa_01_1k", Vector3(3.6, 0, 2.6), -90.0)
	ph("coffee_table_round_01_2k", Vector3(2.75, 0, 2.6))
	ph("modern_arm_chair_01_1k", Vector3(1.8, 0, 2.6), 90.0)
	ph("potted_plant_02_1k", Vector3(3.8, 0, -2.6), 0.0, 1.0)
	ph("potted_plant_01_1k", Vector3(-3.7, 0, 1.9), 0.0, 1.0)
	ph("standing_chalkboard_01_2k", Vector3(-3.4, 0, 0.9), 70.0)
	ph("hanging_picture_frame_02_1k", Vector3(4.18, 1.6, 0.8), -90.0)
	ph("hanging_picture_frame_03_1k", Vector3(4.18, 1.6, 1.9), -90.0)
	ph("wooden_display_shelves_01_2k", Vector3(-0.75, 0, -2.78), 90.0)
	ph("jug_01_1k", Vector3(-0.75, 1.17, -2.72), 0.0)
	ph("ceramic_vase_01_1k", Vector3(-0.85, 0.79, -2.75))
	ph("wooden_bowl_02_1k", Vector3(-0.6, 0.41, -2.75))
	ph("potted_plant_04_2k", Vector3(2.75, 0.45, 2.6))


func build_counter() -> void:
	var front := pbr("hinoki_planks", 1.2, Color(0.9, 0.74, 0.58))
	var marble := pbr("marble_01", 1.5, Color(1, 1, 1), 0.6)
	slab(Vector3(-2.0, 0.47, -1.0), Vector3(2.9, 0.94, 0.8), front)
	slab(Vector3(-2.0, 0.965, -1.0), Vector3(3.0, 0.05, 0.92), marble)
	slab(Vector3(-2.0, 0.05, -0.6), Vector3(2.9, 0.1, 0.02), mat(Color(0.1, 0.09, 0.08), 0.5))
	# arka tezgâh (duvar önü) ve raf
	slab(Vector3(-2.3, 0.45, -2.75), Vector3(2.6, 0.9, 0.5), mat(Color(0.14, 0.13, 0.12), 0.55))
	slab(Vector3(-2.3, 0.92, -2.75), Vector3(2.65, 0.04, 0.55), marble)
	var shelf_m := pbr("hinoki_planks", 1.2, Color(0.55, 0.4, 0.28))
	slab(Vector3(-2.3, 1.75, -2.9), Vector3(2.4, 0.04, 0.26), shelf_m)
	slab(Vector3(-2.3, 2.15, -2.9), Vector3(2.4, 0.04, 0.26), shelf_m)
	for i in 8:
		make_cup(self, "double").position = Vector3(-3.3 + i * 0.28, 1.77, -2.88)
	for i in 5:
		var bag_cols: Array[Color] = [Color("6b4a2f"), Color("2f4a3c"), Color("8a3b2a"), Color("c2a46b"), Color("3a3a3a")]
		var bag := slab(Vector3(-3.2 + i * 0.42, 2.29, -2.9), Vector3(0.16, 0.24, 0.1), mat(bag_cols[i], 0.8))
		bag.rotation_degrees.y = 8 * (i % 2)
	# kasa (tablet)
	slab(Vector3(-0.85, 1.05, -0.95), Vector3(0.08, 0.12, 0.08), mat(Color(0.1, 0.1, 0.1), 0.4, 0.5))
	var tab := slab(Vector3(-0.85, 1.16, -0.95), Vector3(0.26, 0.18, 0.015), mat(Color(0.05, 0.05, 0.06), 0.2))
	tab.rotation_degrees.x = -20
	ph("potted_plant_04_2k", Vector3(-0.68, 0.99, -1.3))


func build_machine() -> void:
	# iki gruplu espresso makinesi; oyunda soldaki grup kullanılır (MACHINE)
	var g := Node3D.new()
	g.position = MACHINE + Vector3(0.17, 0, 0)
	g.rotation_degrees.y = 180.0
	add_child(g)
	var ch := chrome()
	var black := mat(Color(0.05, 0.05, 0.05), 0.35, 0.2)
	var grill := pbr("metal_plate_02", 0.25, Color(0.55, 0.55, 0.55), 0.5)
	for side in [-1, 1]:
		mrbox(g, Vector3(0.36 * side, 0.03, 0.08), Vector3(0.05, 0.06, 0.05), black, 0.01)
	rbox(g, Vector3(0, 0.27, -0.06), Vector3(0.8, 0.44, 0.42), Color.WHITE, 0.03).material_override = ch
	rbox(g, Vector3(0, 0.28, 0.152), Vector3(0.76, 0.3, 0.02), Color.WHITE, 0.01).material_override = black
	var tray := MeshInstance3D.new(); var tb := BoxMesh.new(); tb.size = Vector3(0.74, 0.03, 0.2); tray.mesh = tb; tray.material_override = grill; tray.position = Vector3(0, 0.03, 0.2); g.add_child(tray)
	for x in [0.17, -0.17]:
		cyl(g, Vector3(x, 0.31, 0.21), 0.05, 0.07, Color.WHITE, 0.15, 1.0).material_override = ch
		cyl(g, Vector3(x, 0.27, 0.21), 0.04, 0.01, Color(0.12, 0.12, 0.12), 0.6)
		rbox(g, Vector3(x, 0.36, 0.19), Vector3(0.1, 0.06, 0.08), Color.WHITE, 0.01).material_override = ch
		rbox(g, Vector3(x, 0.4, 0.166), Vector3(0.07, 0.025, 0.01), Color(0.2, 0.2, 0.2), 0.005)
	for x in [-0.03, 0.05]:
		var gauge_face := cyl(g, Vector3(x, 0.38, 0.165), 0.032, 0.012, Color(0.97, 0.96, 0.93), 0.3)
		gauge_face.rotation_degrees.x = 90
	for side in [-1, 1]:
		var wand := cyl(g, Vector3(0.43 * side, 0.2, 0.18), 0.007, 0.26, Color.WHITE, 0.15, 1.0)
		wand.material_override = ch
		wand.rotation_degrees.z = 12 * side
		var knob := cyl(g, Vector3(0.36 * side, 0.43, 0.16), 0.02, 0.03, Color(0.1, 0.1, 0.1), 0.4)
		knob.rotation_degrees.x = 90
	rbox(g, Vector3(0, 0.5, -0.06), Vector3(0.76, 0.02, 0.38), Color.WHITE, 0.005).material_override = grill
	for i in 5:
		make_cup(g, "tek").position = Vector3(-0.28 + i * 0.14, 0.51, -0.06)
	# öğütücü: mat siyah gövde, cam hazne
	var gr := Node3D.new()
	gr.position = Vector3(-1.65, 1.0, -1.1)
	gr.rotation_degrees.y = 180.0
	add_child(gr)
	mrbox(gr, Vector3(0, 0.03, 0), Vector3(0.2, 0.06, 0.24), black, 0.02)
	mrbox(gr, Vector3(0, 0.26, -0.03), Vector3(0.16, 0.4, 0.18), black, 0.03)
	cyl(gr, Vector3(0, 0.5, -0.03), 0.06, 0.08, Color.WHITE).material_override = ch
	var hop := StandardMaterial3D.new()
	hop.albedo_color = Color(0.8, 0.75, 0.7, 0.18)
	hop.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	hop.roughness = 0.05
	cyl(gr, Vector3(0, 0.65, -0.03), 0.08, 0.22, Color.WHITE).material_override = hop
	cyl(gr, Vector3(0, 0.6, -0.03), 0.07, 0.12, Color("3b2416"), 0.95)
	cyl(gr, Vector3(0, 0.77, -0.03), 0.085, 0.02, Color(0.06, 0.06, 0.06), 0.4)
	rbox(gr, Vector3(0, 0.15, 0.09), Vector3(0.1, 0.03, 0.08), Color.WHITE, 0.01).material_override = ch
	# gameplay düğümleri (fp.gd bunları kullanır)
	cup = Node3D.new()
	add_child(cup)
	cup_fill = cyl(cup, Vector3.ZERO, 0.04, 0.01, COFFEE)
	stream = cyl(self, CUP_POS + Vector3(0, 0.2, 0), 0.006, 0.2, COFFEE, 0.2)
	stream.visible = false
	steam = CPUParticles3D.new()
	steam.emitting = false
	steam.amount = 24
	steam.lifetime = 1.8
	steam.direction = Vector3.UP
	steam.spread = 10.0
	steam.initial_velocity_min = 0.08
	steam.initial_velocity_max = 0.15
	steam.gravity = Vector3.ZERO
	steam.scale_amount_min = 0.6
	steam.scale_amount_max = 1.2
	var sm := SphereMesh.new()
	sm.radius = 0.02
	sm.height = 0.04
	var smat := mat(Color(1, 1, 1, 0.18), 1.0)
	smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	smat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.material = smat
	steam.mesh = sm
	add_child(steam)


func build_shell() -> void:
	# sarkıt lambalar + sıcak ışık
	for p in [Vector3(-3.0, 0, -1.0), Vector3(-2.0, 0, -1.0), Vector3(-1.0, 0, -1.0), Vector3(1.7, 0, 0.3), Vector3(2.7, 0, 2.6)]:
		var lamp := ph("modern_ceiling_lamp_01_2k", Vector3(p.x, 3.2 - 1.17, p.z))
		lamp.scale = Vector3.ONE
		var l := SpotLight3D.new()
		l.light_color = Color(1.0, 0.8, 0.58)
		l.light_energy = 1.3
		l.spot_range = 4.0
		l.spot_angle = 55.0
		l.spot_attenuation = 0.8
		l.shadow_enabled = p.z < 0
		l.position = Vector3(p.x, 2.2, p.z)
		l.rotation_degrees.x = -90
		add_child(l)
		var glow := OmniLight3D.new()
		glow.light_color = Color(1.0, 0.78, 0.55)
		glow.light_energy = 0.35
		glow.omni_range = 2.5
		glow.position = Vector3(p.x, 2.15, p.z)
		add_child(glow)
	collider(Vector3(0, -0.05, 0.5), Vector3(8.4, 0.1, 7.6))
	collider(Vector3(0, 1.5, -3.05), Vector3(8.4, 3, 0.1))
	collider(Vector3(0, 1.5, 4.35), Vector3(8.4, 3, 0.1))
	collider(Vector3(-4.15, 1.5, 0.5), Vector3(0.1, 3, 7.6))
	collider(Vector3(4.25, 1.5, 0.5), Vector3(0.1, 3, 7.6))
	collider(Vector3(-2.0, 0.5, -1.0), Vector3(3.0, 1.0, 0.92))
	collider(Vector3(-2.3, 0.5, -2.75), Vector3(2.65, 1.0, 0.55))
	collider(Vector3(-0.75, 0.8, -2.78), Vector3(1.1, 1.6, 0.4))
	collider(Vector3(1.7, 0.5, 0.3), Vector3(2.0, 1.0, 2.0))
	collider(Vector3(3.0, 0.5, 2.6), Vector3(2.6, 1.0, 1.6))
	collider(Vector3(-3.4, 0.7, 0.9), Vector3(0.9, 1.4, 0.8))


func build_lights() -> void:
	var sun := DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.95, 0.88)
	sun.light_energy = 1.1
	sun.shadow_enabled = true
	sun.shadow_blur = 2.0
	sun.shadow_bias = 0.05
	sun.directional_shadow_max_distance = 14.0
	add_child(sun)
	sun.look_at_from_position(Vector3(4.5, 5.5, -7.0), Vector3(1.5, 0, 0.5))
	var env := Environment.new()
	var sky := Sky.new()
	var pano := PanoramaSkyMaterial.new()
	pano.panorama = load("res://art/tex/decor_shop_1k.hdr")
	sky.sky_material = pano
	env.sky = sky
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.05, 0.04, 0.035)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.42
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 1.0
	env.glow_enabled = true
	env.glow_intensity = 0.4
	env.glow_bloom = 0.05
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)


# ---------- müşteriler (Rocketbox, MIT) ----------
func avatar_anim(file: String) -> Animation:
	if anim_lib.has(file):
		return anim_lib[file]
	var src: Node = load("res://art/people/anims/%s.max.fbx" % file).instantiate()
	var ap: AnimationPlayer = src.find_child("AnimationPlayer", true, false)
	var an: Animation = ap.get_animation(ap.get_animation_list()[0]).duplicate(true)
	# kök kemiğin yatay ilerlemesini sil (yürüme yerinde olsun; hareketi kod yapar)
	for i in range(an.get_track_count() - 1, -1, -1):
		var path := str(an.track_get_path(i))
		if not path.begins_with("Skeleton3D:"):
			an.remove_track(i)
			continue
		if path == "Skeleton3D:Bip01" and an.track_get_type(i) == Animation.TYPE_POSITION_3D and an.track_get_key_count(i) > 1:
			var first: Vector3 = an.track_get_key_value(i, 0)
			var last: Vector3 = an.track_get_key_value(i, an.track_get_key_count(i) - 1)
			var d := last - first
			for k in an.track_get_key_count(i):
				var v: Vector3 = an.track_get_key_value(i, k)
				if abs(d.x) > 0.05: v.x = first.x
				if abs(d.y) > 0.05: v.y = first.y
				if abs(d.z) > 0.05: v.z = first.z
				an.track_set_key_value(i, k, v)
	an.loop_mode = Animation.LOOP_LINEAR
	src.free()
	anim_lib[file] = an
	return an


func make_avatar(name: String) -> Node3D:
	var root := Node3D.new()
	var body: Node3D = load("res://art/people/%s/Export/%s.fbx" % [name, name]).instantiate()
	root.add_child(body)
	var ap: AnimationPlayer = body.find_child("AnimationPlayer", true, false)
	var lib := AnimationLibrary.new()
	var pre := "f" if name.begins_with("Female") else "m"
	lib.add_animation("idle", avatar_anim(pre + "_idle_breathe_01"))
	lib.add_animation("walk", avatar_anim(pre + "_walk_neutral_01"))
	ap.add_animation_library("cb", lib)
	ap.play("cb/idle")
	root.set_meta("ap", ap)
	return root


func spawn_customer() -> void:
	customer = make_avatar(AVATARS[n_customer % AVATARS.size()])
	customer.position = DOOR
	add_child(customer)
	var body := collider(Vector3(0, 1.0, 0), Vector3(0.6, 1.9, 0.5), "customer")
	body.reparent(customer, false)
	n_customer += 1
	order_size = "double" if rng.randf() < 0.55 else "tek"
	cstate = "walk_in"


func pose(who: Node3D, swing: float) -> void:
	if not who.has_meta("ap"):
		return
	var ap: AnimationPlayer = who.get_meta("ap")
	var want := "cb/walk" if swing != 0.0 else "cb/idle"
	if ap.current_animation != want:
		ap.play(want, 0.25)


func walk_to(who: Node3D, target: Vector3, delta: float) -> bool:
	var d := target - who.position
	d.y = 0
	if d.length() < 0.05:
		who.position = target
		pose(who, 0.0)
		return true
	who.rotation.y = atan2(d.x, d.z)
	who.position += d.normalized() * min(d.length(), 1.1 * delta)
	pose(who, 1.0)
	return false


func customer_tick(delta: float) -> void:
	if customer == null:
		return
	match cstate:
		"walk_in":
			if walk_to(customer, QUEUE_R, delta):
				cstate = "wait"
				customer.rotation.y = PI
				show_bubble("Bir %s espresso lütfen!" % size_name(order_size))
		"walk_out":
			if walk_to(customer, DOOR, delta):
				customer.queue_free()
				customer = null
				cstate = "none"
				get_tree().create_timer(1.5).timeout.connect(spawn_customer)


# ---------- istasyon eşyaları (gerçekçi malzemeyle) ----------
func cup_only(parent: Node3D, size: String) -> Node3D:
	var c := Node3D.new()
	parent.add_child(c)
	var r := 0.045 if size == "tek" else 0.06
	var h := 0.06 if size == "tek" else 0.085
	var mi := MeshInstance3D.new()
	var m := CylinderMesh.new()
	m.top_radius = r
	m.bottom_radius = r * 0.72
	m.height = h
	m.radial_segments = 40
	mi.mesh = m
	mi.material_override = mat(WHITE, 0.22)
	mi.position.y = h * 0.5
	c.add_child(mi)
	var rim := MeshInstance3D.new()
	var t := TorusMesh.new()
	t.inner_radius = r - 0.004
	t.outer_radius = r + 0.002
	rim.mesh = t
	rim.material_override = mat(WHITE, 0.2)
	rim.position.y = h
	c.add_child(rim)
	return c


func build_props() -> void:
	cup.visible = false
	var black := mat(Color(0.04, 0.04, 0.04), 0.6)
	var ch := chrome()
	for s in ["tek", "double"]:
		var pf := make_portafilter(self, s)
		pf.position = PF_SPOT[s] + Vector3(0, 0.03, 0)
		pf.rotation_degrees.y = 180.0
		pf_nodes[s] = pf
		collider(PF_SPOT[s] + Vector3(0, 0.05, -0.08), Vector3(0.14, 0.12, 0.3), "pf_" + s)
		var stack := Node3D.new()
		stack.position = CUP_SPOT[s]
		add_child(stack)
		for i in 4:
			cup_only(stack, s).position.y = i * (0.022 if s == "tek" else 0.03)
		cup_nodes[s] = stack
		collider(CUP_SPOT[s] + Vector3(0, 0.15, 0), Vector3(0.18, 0.3, 0.18), "cup_" + s)
	# öğütücü terazisi (dijital)
	mrbox(self, GRINDER_SCALE + Vector3(0, 0.012, 0.1), Vector3(0.2, 0.024, 0.16), black, 0.01)
	var lcd := mat(Color(0.5, 0.95, 0.7), 0.3)
	lcd.emission_enabled = true
	lcd.emission = Color(0.3, 0.9, 0.55)
	lcd.emission_energy_multiplier = 0.6
	mrbox(self, GRINDER_SCALE + Vector3(0, 0.026, 0.175), Vector3(0.08, 0.012, 0.01), lcd, 0.003)
	# telve kutusu: siyah kauçuk + vurma çubuğu
	mrbox(self, KNOCK + Vector3(0, 0.08, 0), Vector3(0.18, 0.16, 0.18), black, 0.02)
	cyl(self, KNOCK + Vector3(0, 0.15, 0), 0.075, 0.012, Color("3a2a1e"), 0.9)
	var bar := cyl(self, KNOCK + Vector3(0, 0.17, 0), 0.012, 0.19, Color.WHITE)
	bar.material_override = mat(Color(0.12, 0.12, 0.12), 0.5)
	bar.rotation_degrees.z = 90
	# temper matı, temper, WDT aleti
	mrbox(self, STATION + Vector3(0, 0.01, 0), Vector3(0.28, 0.02, 0.24), black, 0.01)
	cyl(self, STATION + Vector3(-0.06, 0.04, 0.05), 0.0295, 0.02, Color.WHITE).material_override = ch
	var handle_m := mat(Color("5a3a22"), 0.45)
	cyl(self, STATION + Vector3(-0.06, 0.1, 0.05), 0.022, 0.1, Color.WHITE).material_override = handle_m
	sph(self, STATION + Vector3(-0.06, 0.15, 0.05), 0.024, Color("5a3a22"))
	cyl(self, STATION + Vector3(0.07, 0.07, -0.05), 0.012, 0.1, Color.WHITE).material_override = handle_m
	for k in 6:
		cyl(self, STATION + Vector3(0.07 + (k % 3 - 1) * 0.004, 0.005 + 0.012, -0.05 + (k / 3) * 0.004), 0.0008, 0.03, Color.WHITE).material_override = ch
	collider(Vector3(-1.65, 1.35, -1.15), Vector3(0.3, 0.7, 0.4), "grinder")
	collider(STATION + Vector3(0, 0.1, 0), Vector3(0.28, 0.2, 0.26), "station")
	collider(KNOCK + Vector3(0, 0.1, 0), Vector3(0.22, 0.2, 0.22), "knock")
	collider(MACHINE + Vector3(0, 0.3, -0.1), Vector3(0.8, 0.6, 0.6), "machine")
