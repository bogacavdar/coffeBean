extends "res://dukkan/fp_real.gd"
## v3: barista elleri, sahnedeki göstergeler (diegetic), süt köpürtme, latte ve cappuccino.
## Belge §5: "Eller, sahnedeki göstergeler ve süt".

const ORDERS := ["tek", "double", "latte", "cappuccino"]
const ORDER_NAME := {"tek": "tek espresso", "double": "double espresso", "latte": "latte", "cappuccino": "cappuccino"}
const FOAM_TARGET := {"latte": 20.0, "cappuccino": 50.0}
const MILK_SPOT := Vector3(-3.05, 0.94, -2.62)
const WAND := Vector3(-2.73, 1.0, -1.04)
const MORE_CUPS := {"latte": Vector3(-3.28, 1.0, -0.76), "cappuccino": Vector3(-3.05, 1.0, -0.76)}
const HEAT_RATE := 5.0          # °C/sn
const MILK_TARGET := 62.5

var hand_r: Node3D
var hand_l: Node3D
var hand_base_r := Vector3(0.2, -0.23, -0.4)
var hand_base_l := Vector3(-0.23, -0.26, -0.43)
var bob_t := 0.0
var cam_home := Transform3D()
var cam_tween: Tween
var scale_label: Label3D
var tray_label: Label3D
var tray_bar: Node3D
var tray_needle: MeshInstance3D
var tray_zones: Array[MeshInstance3D] = []
var press_needle: Node3D
var basket: Node3D
var clumps: Array[MeshInstance3D] = []
var wdt_tool: Node3D
var level: Node3D
var level_bubble: MeshInstance3D
var level_rings: Array[MeshInstance3D] = []
var lock_pf: Node3D
var hint: Label
# süt
var milk_state := "none"        # none, held_cold, steamed, poured
var foam := 0.0
var milk_temp := 4.0
var tip_depth := 4.0
var scream := 0.0
var pour_fill := 0.0
var pitcher: Node3D
var milk_surface: MeshInstance3D
var temp_label: Label3D
var milk_pitcher_home: Node3D


func needs_milk() -> bool:
	return order_size == "latte" or order_size == "cappuccino"


func shot_size() -> String:
	return "tek" if order_size == "tek" else "double"


func size_name(s: String) -> String:
	return ORDER_NAME.get(s, s)


# ---------- fincanlar ----------
func cup_dims(size: String) -> Vector2:
	match size:
		"tek": return Vector2(0.045, 0.06)
		"latte": return Vector2(0.075, 0.1)
		"cappuccino": return Vector2(0.066, 0.075)
	return Vector2(0.06, 0.085)


func make_cup(parent: Node3D, size: String, fill := 0.0) -> Node3D:
	var c := Node3D.new()
	parent.add_child(c)
	var d := cup_dims(size)
	var r := d.x
	var h := d.y
	cyl(c, Vector3(0, 0.006, 0), r + 0.035, 0.012, WHITE, 0.3)
	var body := MeshInstance3D.new()
	var m := CylinderMesh.new()
	m.top_radius = r
	m.bottom_radius = r * 0.78
	m.height = h
	m.radial_segments = 40
	body.mesh = m
	body.material_override = mat(WHITE, 0.25)
	body.position.y = 0.012 + h * 0.5
	c.add_child(body)
	var handle := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.015
	tm.outer_radius = 0.03
	handle.mesh = tm
	handle.material_override = mat(WHITE, 0.3)
	handle.rotation_degrees = Vector3(90, 0, 0)
	handle.position = Vector3(r + 0.01, 0.012 + h * 0.55, 0)
	c.add_child(handle)
	if fill > 0.0:
		var top := cyl(c, Vector3(0, 0.012 + h * min(fill, 1.0) * 0.9, 0), r * (0.8 + 0.18 * min(fill, 1.0)), 0.006, Color("8a5a35"), 0.2)
		top.name = "Top"
	return c


func cup_only(parent: Node3D, size: String) -> Node3D:
	var c := Node3D.new()
	parent.add_child(c)
	var d := cup_dims(size)
	var mi := MeshInstance3D.new()
	var m := CylinderMesh.new()
	m.top_radius = d.x
	m.bottom_radius = d.x * 0.72
	m.height = d.y
	m.radial_segments = 40
	mi.mesh = m
	mi.material_override = mat(WHITE, 0.22)
	mi.position.y = d.y * 0.5
	c.add_child(mi)
	var rim := MeshInstance3D.new()
	var t := TorusMesh.new()
	t.inner_radius = d.x - 0.004
	t.outer_radius = d.x + 0.002
	rim.mesh = t
	rim.material_override = mat(WHITE, 0.2)
	rim.position.y = d.y
	c.add_child(rim)
	return c


# ---------- sahneye eklenenler ----------
func build_props() -> void:
	super.build_props()
	for s in ["latte", "cappuccino"]:
		var stack := Node3D.new()
		stack.position = MORE_CUPS[s]
		add_child(stack)
		for i in 3:
			cup_only(stack, s).position.y = i * 0.032
		collider(MORE_CUPS[s] + Vector3(0, 0.12, 0), Vector3(0.18, 0.24, 0.18), "cup_" + s)
	# süt: arka tezgâhta süt kutusu ve sürahi
	var carton := slab(MILK_SPOT + Vector3(-0.16, 0.12, 0), Vector3(0.09, 0.24, 0.07), mat(Color(0.95, 0.95, 0.97), 0.6))
	carton.name = "Carton"
	slab(MILK_SPOT + Vector3(-0.16, 0.18, 0.036), Vector3(0.09, 0.08, 0.002), mat(Color("3f6fb0"), 0.6), false)
	milk_pitcher_home = make_pitcher(self)
	milk_pitcher_home.position = MILK_SPOT
	collider(MILK_SPOT + Vector3(-0.05, 0.1, 0), Vector3(0.3, 0.22, 0.2), "milk")
	collider(WAND + Vector3(0, 0.2, -0.05), Vector3(0.14, 0.3, 0.16), "wand")
	# öğütücü terazisinin ekranı
	scale_label = screen_label(GRINDER_SCALE + Vector3(0.13, 0.03, -0.02), "0.0 g")
	mrbox(self, GRINDER_SCALE + Vector3(0.13, 0.012, -0.02), Vector3(0.09, 0.024, 0.06), mat(Color(0.04, 0.04, 0.05), 0.3), 0.006)
	# damlama tepsisi terazisi: ekran + hedef çubuğu (Kural 9)
	var disp := Node3D.new()
	disp.position = Vector3(-2.7, 1.0, -1.3)
	disp.rotation_degrees.y = 180
	add_child(disp)
	mrbox(disp, Vector3(0, 0.05, 0), Vector3(0.2, 0.1, 0.03), mat(Color(0.04, 0.04, 0.05), 0.3), 0.01)
	tray_label = Label3D.new()
	tray_label.text = "0.0 g   0 sn"
	tray_label.font_size = 64
	tray_label.pixel_size = 0.00045
	tray_label.modulate = Color(0.55, 1.0, 0.7)
	tray_label.outline_size = 0
	tray_label.position = Vector3(0, 0.072, 0.017)
	disp.add_child(tray_label)
	tray_bar = Node3D.new()
	tray_bar.position = Vector3(0, 0.03, 0.017)
	disp.add_child(tray_bar)
	var base := MeshInstance3D.new(); var bm := BoxMesh.new(); bm.size = Vector3(0.17, 0.014, 0.002); base.mesh = bm; base.material_override = mat(Color(0.2, 0.18, 0.16), 0.6); tray_bar.add_child(base)
	for c in [Color("e2c044"), Color("8fcf6a"), Color("2f8a3a")]:
		var z := MeshInstance3D.new(); var zb := BoxMesh.new(); zb.size = Vector3(0.01, 0.014, 0.002); z.mesh = zb
		var zm := mat(c, 0.6); zm.emission_enabled = true; zm.emission = c; zm.emission_energy_multiplier = 0.4
		z.material_override = zm; z.position.z = 0.001 * (tray_zones.size() + 1); tray_bar.add_child(z); tray_zones.append(z)
	tray_needle = MeshInstance3D.new(); var nb := BoxMesh.new(); nb.size = Vector3(0.003, 0.022, 0.003); tray_needle.mesh = nb
	tray_needle.material_override = mat(Color.WHITE, 0.3); tray_needle.position.z = 0.005; tray_bar.add_child(tray_needle)
	tray_bar.visible = false
	# basınç göstergesi ibresi (makinedeki soldaki gösterge)
	press_needle = Node3D.new()
	press_needle.position = Vector3(MACHINE.x + 0.17 + 0.03, 1.38, MACHINE.z - 0.173)
	add_child(press_needle)
	var pn := MeshInstance3D.new(); var pb := BoxMesh.new(); pb.size = Vector3(0.003, 0.026, 0.002); pn.mesh = pb
	pn.material_override = mat(Color(0.75, 0.1, 0.08), 0.4); pn.position.y = 0.01; press_needle.add_child(pn)
	press_needle.rotation.z = deg_to_rad(120)


func screen_label(pos: Vector3, text: String) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font_size = 64
	l.pixel_size = 0.0004
	l.modulate = Color(0.55, 1.0, 0.7)
	l.outline_size = 0
	l.position = pos
	l.rotation_degrees = Vector3(-55, 180, 0)
	add_child(l)
	return l


func make_pitcher(parent: Node3D) -> Node3D:
	var p := Node3D.new()
	parent.add_child(p)
	var body := MeshInstance3D.new()
	var m := CylinderMesh.new()
	m.top_radius = 0.042
	m.bottom_radius = 0.052
	m.height = 0.12
	m.radial_segments = 40
	body.mesh = m
	var steel := chrome()
	steel.roughness = 0.25
	body.material_override = steel
	body.position.y = 0.06
	p.add_child(body)
	var handle := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.022
	tm.outer_radius = 0.032
	handle.mesh = tm
	handle.material_override = steel
	handle.rotation_degrees = Vector3(90, 0, 0)
	handle.position = Vector3(0.05, 0.065, 0)
	p.add_child(handle)
	return p


# ---------- eller ----------
func build_ui() -> void:
	super.build_ui()
	hint = Label.new()
	hint.anchor_left = 0.0
	hint.anchor_right = 1.0
	hint.anchor_top = 1.0
	hint.anchor_bottom = 1.0
	hint.offset_top = -70
	hint.offset_bottom = -30
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	style(hint, 24)
	prompt.get_parent().add_child(hint)


func build_player() -> void:
	super.build_player()
	hand_r = make_hand(1)
	hand_l = make_hand(-1)
	cam.add_child(hand_r)
	cam.add_child(hand_l)
	hand_r.position = hand_base_r
	hand_l.position = hand_base_l
	cam_home = cam.transform
	kollari_kur()


# ---------- baristanın kolları (Rocketbox Male_Adult_11, MIT; tasarım belgesi "Eller") ----------
## Gerçek bir insan modelinin kolları kameraya bağlanır; eller hand_r / hand_l hedeflerine TwoBoneIK3D ile uzanır.
## Baş ve bacaklar kemik ölçeği 0 ile gizlenir; gövde görüş alanının altında kalır.
const KOL_MODEL := "Male_Adult_11"
var kol_iskelet: Skeleton3D
var kol_klavikula := {}


func kollari_kur() -> void:
	for c in hand_r.get_children() + hand_l.get_children():
		if c is MeshInstance3D or c is Node3D:
			c.visible = false
	var govde: Node3D = load("res://art/people/%s/Export/%s.fbx" % [KOL_MODEL, KOL_MODEL]).instantiate()
	govde.rotation.y = PI
	govde.position = Vector3(0, -1.6, 0.1)
	cam.add_child(govde)
	kol_iskelet = govde.find_child("Skeleton3D", true, false)
	var ap: AnimationPlayer = govde.find_child("AnimationPlayer", true, false)
	if ap:
		ap.stop()
	for kemik in ["Bip01 Head", "Bip01 L Thigh", "Bip01 R Thigh"]:
		var i := kol_iskelet.find_bone(kemik)
		if i >= 0:
			kol_iskelet.set_bone_pose_scale(i, Vector3(0.001, 0.001, 0.001))
	for mi in govde.find_children("*", "MeshInstance3D", true, false):
		(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# parmaklar hafif kıvrık (doğal duruş)
	for yan in ["L", "R"]:
		for f in ["1", "2", "3", "4"]:
			for ek in ["", "1", "2"]:
				var i := kol_iskelet.find_bone("Bip01 %s Finger%s%s" % [yan, f, ek])
				if i >= 0:
					var r := kol_iskelet.get_bone_rest(i).basis.get_rotation_quaternion()
					kol_iskelet.set_bone_pose_rotation(i, r * Quaternion(Vector3(0, 0, 1), deg_to_rad(-28.0 if yan == "R" else 28.0)))
	var ik := TwoBoneIK3D.new()
	ik.set_setting_count(2)
	kol_iskelet.add_child(ik)
	var dirsek_r := Node3D.new()
	dirsek_r.position = Vector3(0.55, -0.7, 0.1)
	cam.add_child(dirsek_r)
	var dirsek_l := Node3D.new()
	dirsek_l.position = Vector3(-0.55, -0.7, 0.1)
	cam.add_child(dirsek_l)
	var hedefler := [[0, "R", hand_r, dirsek_r], [1, "L", hand_l, dirsek_l]]
	for h in hedefler:
		ik.set_root_bone_name(h[0], "Bip01 %s UpperArm" % h[1])
		ik.set_middle_bone_name(h[0], "Bip01 %s Forearm" % h[1])
		ik.set_end_bone_name(h[0], "Bip01 %s Hand" % h[1])
		ik.set_target_node(h[0], ik.get_path_to(h[2]))
		ik.set_pole_node(h[0], ik.get_path_to(h[3]))
		kol_klavikula[h[1]] = kol_iskelet.find_bone("Bip01 %s Clavicle" % h[1])


## Bir kolu göster/gizle (klavikula ölçeği): kamera alete yaklaştığında eller ekranı kapatmasın.
func kol_goster(yan: String, acik: bool) -> void:
	if kol_iskelet == null:
		return
	var s := Vector3.ONE if acik else Vector3(0.001, 0.001, 0.001)
	kol_iskelet.set_bone_pose_scale(kol_klavikula[yan], s)


func make_hand(side: int) -> Node3D:
	var h := Node3D.new()
	var skin := mat(SKIN, 0.65)
	var sleeve := mat(Color(0.12, 0.12, 0.13), 0.85)
	var arm := MeshInstance3D.new(); var am := CapsuleMesh.new(); am.radius = 0.032; am.height = 0.3; arm.mesh = am; arm.material_override = skin
	arm.rotation_degrees.x = 90; arm.position = Vector3(0, -0.01, 0.17); h.add_child(arm)
	var sl := MeshInstance3D.new(); var sm := CylinderMesh.new(); sm.top_radius = 0.045; sm.bottom_radius = 0.05; sm.height = 0.16; sl.mesh = sm; sl.material_override = sleeve
	sl.rotation_degrees.x = 90; sl.position = Vector3(0, -0.01, 0.3); h.add_child(sl)
	var palm := rbox(h, Vector3(0, 0, -0.01), Vector3(0.075, 0.028, 0.085), SKIN, 0.013)
	palm.material_override = skin
	for i in 4:
		var f := Node3D.new()
		f.position = Vector3(-0.027 + i * 0.018, 0.0, -0.05)
		f.rotation_degrees.x = 55
		h.add_child(f)
		var fm := MeshInstance3D.new(); var fc := CapsuleMesh.new(); fc.radius = 0.0085; fc.height = 0.055 - abs(i - 1.5) * 0.006; fm.mesh = fc; fm.material_override = skin
		fm.rotation_degrees.x = 90; fm.position.z = -0.022; f.add_child(fm)
	var th := MeshInstance3D.new(); var tc := CapsuleMesh.new(); tc.radius = 0.01; tc.height = 0.05; th.mesh = tc; th.material_override = skin
	th.position = Vector3(-0.045 * side, 0.008, -0.02); th.rotation_degrees = Vector3(70, 0, 35 * side); h.add_child(th)
	h.rotation_degrees = Vector3(22, 12 * side, -22 * side)
	return h


func hold(kind: String, size: String) -> void:
	super.hold(kind, size)
	if held:
		held.position = hand_base_r + Vector3(-0.05, 0.05, -0.1)


func hands_tick(delta: float) -> void:
	var moving := player.velocity.length() > 0.1 and mode == ""
	bob_t += delta * (9.0 if moving else 1.6)
	var amp := 0.012 if moving else 0.003
	var bob := Vector3(sin(bob_t) * amp, abs(cos(bob_t)) * amp, 0)
	var r_off := Vector3.ZERO
	var r_rot := 0.0
	match mode:
		"tamp": r_off = Vector3(0, -0.06 - 0.02 * sin(walk_t * 20.0), 0)
		"lock": r_rot = -clamp(lock_px / 260.0, 0.0, 1.0) * 70.0
		"pull": r_off = Vector3(0.0, 0.08, -0.12)
		"steam": r_off = Vector3(-0.08, 0.04, -0.05)
		"pour": r_off = Vector3(-0.06, 0.06, -0.1)
	hand_r.position = hand_r.position.lerp(hand_base_r + bob + r_off, min(1.0, delta * 10.0))
	hand_r.rotation_degrees.z = lerp(hand_r.rotation_degrees.z, -22.0 + r_rot, min(1.0, delta * 10.0))
	hand_l.position = hand_l.position.lerp(hand_base_l + Vector3(-bob.x, bob.y, 0), min(1.0, delta * 10.0))
	if held:
		held.position = hand_r.position + Vector3(-0.05, 0.05, -0.1)
	kol_goster("R", mode in ["", "pull", "pour"])
	kol_goster("L", mode == "")


# ---------- kamera: aletin başına yaklaş ----------
func view_at(eye: Vector3, target: Vector3, secs := 0.45) -> void:
	var t := Transform3D(Basis(), eye).looking_at(target, Vector3.UP)
	var local := player.global_transform.affine_inverse() * t
	if cam_tween: cam_tween.kill()
	cam_tween = create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	cam_tween.tween_property(cam, "transform", local, secs)


func view_home(secs := 0.4) -> void:
	if cam_tween: cam_tween.kill()
	var home := Transform3D(Basis(Vector3.RIGHT, pitch), Vector3(0, 1.65, 0))
	cam_tween = create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	cam_tween.tween_property(cam, "transform", home, secs)


func open_panel(m: String, title: String) -> void:
	super.open_panel(m, title)
	panel.visible = false
	match m:
		"dose": view_at(GRINDER_SCALE + Vector3(0.0, 0.42, -0.42), GRINDER_SCALE + Vector3(0, 0.08, 0.0))
		"wdt":
			show_basket()
			view_at(STATION + Vector3(0, 0.36, -0.08), STATION + Vector3(0, 0.03, 0))
		"tamp":
			show_level()
			view_at(STATION + Vector3(0, 0.26, -0.06), STATION + Vector3(0, 0.07, 0))
		"lock":
			drop_held()
			lock_pf = make_portafilter(self, held_size, true)
			lock_pf.position = MACHINE + Vector3(0, 0.27, -0.3)
			lock_pf.rotation_degrees.y = 180.0 + 45.0
			view_at(MACHINE + Vector3(0.1, 0.45, -0.85), MACHINE + Vector3(0, 0.27, -0.25))
		"pull":
			tray_bar.visible = true
			set_tray_zones()
			view_at(Vector3(-2.55, 1.42, -1.75), Vector3(-2.55, 1.1, -1.2))


func close_panel(score: float, label: String) -> void:
	super.close_panel(score, label)
	view_home()
	if basket and mode != "tamp":
		pass


func _process(delta: float) -> void:
	super._process(delta)
	hands_tick(delta)
	if mode in ["steam", "pour"]:
		milk_tick(delta)
	if mode != "":
		prompt.text = ""
		hint.text = panel_text.text.replace("\n", "  ·  ")
	else:
		hint.text = ""


# ---------- doz: terazi ekranı ----------
func dose_tick(delta: float) -> void:
	super.dose_tick(delta)
	if scale_label:
		scale_label.text = "%.1f g" % dose_g
	if scale_pf:
		var pile: Node = scale_pf.get_node_or_null("Pile")
		if pile == null:
			pile = cyl(scale_pf, Vector3(0, 0.02, 0), 0.04, 0.01, COFFEE, 0.95)
			pile.name = "Pile"
		var f: float = clamp(dose_g / DOSE[held_size], 0.0, 1.5)
		(pile as MeshInstance3D).scale = Vector3(0.5 + 0.5 * min(f, 1.0), 0.3 + f * 1.6, 0.5 + 0.5 * min(f, 1.0))


func finish_dose() -> void:
	super.finish_dose()
	scale_label.text = "0.0 g"


# ---------- dağıtma: 3B sepet ----------
func show_basket() -> void:
	if basket: basket.queue_free()
	drop_held()
	basket = Node3D.new()
	basket.position = STATION + Vector3(0, 0.03, 0)
	add_child(basket)
	var ring := cyl(basket, Vector3(0, 0.0, 0), 0.062, 0.03, Color.WHITE)
	ring.material_override = chrome()
	cyl(basket, Vector3(0, 0.012, 0), 0.056, 0.01, Color("2a160c"), 0.95)
	rbox(basket, Vector3(0, -0.005, -0.12), Vector3(0.05, 0.04, 0.16), DARK, 0.02)
	clumps.clear()
	for i in 144:
		var p := Vector2((i % 12) - 5.5, (i / 12) - 5.5) * 25.0 / 3000.0
		var cm := sph(basket, Vector3(p.x, 0.018, p.y), 0.0045, Color("4a2a18"))
		if p.length() > 0.05: cm.visible = false
		clumps.append(cm)
	wdt_tool = Node3D.new()
	basket.add_child(wdt_tool)
	var hnd := cyl(wdt_tool, Vector3(0, 0.07, 0), 0.008, 0.07, Color("5a3a22"), 0.5)
	hnd.name = "H"
	for k in 5:
		var n := cyl(wdt_tool, Vector3((k - 2) * 0.002, 0.03, 0), 0.0006, 0.03, Color.WHITE)
		n.material_override = chrome()


func wdt_tick(delta: float) -> void:
	super.wdt_tick(delta)
	if mode != "wdt" and mode != "":
		return
	for i in clumps.size():
		var v: float = wdt_cells[i] if i < wdt_cells.size() else 0.0
		clumps[i].scale = Vector3.ONE * (0.35 + v * 1.1)
		clumps[i].position.y = 0.017 + v * 0.004
	if wdt_tool:
		wdt_tool.position = Vector3(wdt_cursor.x, 0, wdt_cursor.y) / 3000.0


# ---------- temperleme: temperin üstünde su terazisi ----------
func show_level() -> void:
	if basket == null: show_basket()
	for c in clumps: c.visible = false
	if wdt_tool: wdt_tool.visible = false
	cyl(basket, Vector3(0, 0.02, 0), 0.056, 0.008, Color("3a2012"), 0.8)
	level = Node3D.new()
	level.position = Vector3(0, 0.07, 0)
	basket.add_child(level)
	var tamper := cyl(level, Vector3(0, -0.035, 0), 0.0565, 0.02, Color.WHITE)
	tamper.material_override = chrome()
	cyl(level, Vector3(0, -0.005, 0), 0.03, 0.04, Color("5a3a22"), 0.45)
	cyl(level, Vector3(0, 0.017, 0), 0.034, 0.004, Color(0.85, 0.92, 0.75), 0.2)
	level_rings.clear()
	var cols := [Color("e2c044"), Color("8fcf6a"), Color("2f8a3a")]
	for i in 3:
		var r := cyl(level, Vector3(0, 0.0202 + i * 0.0007, 0), 0.01, 0.0005, cols[i], 0.5)
		(r.material_override as StandardMaterial3D).emission_enabled = true
		(r.material_override as StandardMaterial3D).emission = cols[i]
		(r.material_override as StandardMaterial3D).emission_energy_multiplier = 0.5
		level_rings.append(r)
	level_bubble = sph(level, Vector3(0, 0.0235, 0), 0.0035, Color(1, 1, 1))


func tamp_tick(delta: float) -> void:
	super.tamp_tick(delta)
	if level == null or not is_instance_valid(level):
		return
	var k := 0.03 / 150.0
	var rr := tamp_rings()
	for i in 3:
		var rad: float = max(rr[i] * k, 0.0006)
		(level_rings[i].mesh as CylinderMesh).top_radius = rad
		(level_rings[i].mesh as CylinderMesh).bottom_radius = rad
	var bp := bubble_pos.limit_length(150.0) * k
	level_bubble.position = Vector3(bp.x, 0.0235, bp.y)
	level.position.y = 0.07 - min(tamp_time, 0.5) * 0.06
	if mode == "":
		basket.queue_free()
		basket = null
		level = null


# ---------- kilitleme: portafiltre gerçekten döner ----------
func lock_tick(delta: float) -> void:
	if lock_pf:
		lock_pf.rotation_degrees.y = 180.0 + 45.0 * (1.0 - clamp(lock_px / 260.0, 0.0, 1.0))
	super.lock_tick(delta)
	if mode == "" and lock_pf:
		lock_pf.queue_free()
		lock_pf = null
		view_home()


# ---------- çekim: tepsideki terazi + basınç ----------
func set_tray_zones() -> void:
	var target: float = YIELD[held_size]
	var rate: float = FLOW[held_size]
	var vmax := target * 1.6
	var w := 0.17
	var wins := [WIN_YELLOW, WIN_LIGHT, WIN_DARK]
	for i in 3:
		var half: float = max(rate * wins[i] / vmax * w, 0.0006)
		(tray_zones[i].mesh as BoxMesh).size.x = half * 2.0
		tray_zones[i].position.x = -w * 0.5 + target / vmax * w


func pull_tick(delta: float) -> void:
	super.pull_tick(delta)
	var target: float = YIELD[held_size]
	tray_label.text = "%.1f g   %.0f sn" % [pull_g, pull_t]
	tray_needle.position.x = -0.085 + clamp(pull_g / (target * 1.6), 0.0, 1.0) * 0.17
	var bar: float = clamp(pull_t / 3.0, 0.0, 1.0) * 9.0 if mode == "pull" else 0.0
	press_needle.rotation.z = deg_to_rad(120.0 - bar / 12.0 * 240.0)
	if mode == "":
		tray_bar.visible = false
		press_needle.rotation.z = deg_to_rad(120)


# ---------- akış: sipariş, portafiltre, süt ----------
func spawn_customer() -> void:
	super.spawn_customer()
	order_size = ORDERS[rng.randi() % ORDERS.size()]
	milk_state = "none"


func customer_tick(delta: float) -> void:
	if customer != null and cstate == "walk_in" and walk_to(customer, QUEUE_R, delta):
		cstate = "wait"
		customer.rotation.y = PI
		show_bubble("Bir %s lütfen!" % size_name(order_size))
		return
	if cstate != "walk_in":
		super.customer_tick(delta)


func action_text(id: String) -> String:
	if id.begins_with("pf_") and stage == "pick_pf" and held_kind == "":
		var s := id.substr(3)
		return "E: %s portafiltreyi al" % ("Tek ağızlı (tek sepet)" if s == "tek" else "Çift ağızlı (double sepet)")
	if id.begins_with("cup_") and stage == "locked" and held_kind == "":
		return "E: %s fincanı al" % size_name(id.substr(4)).capitalize()
	if id == "customer" and cstate == "wait" and stage != "cup_taken":
		return "Sipariş: %s" % size_name(order_size)
	if needs_milk():
		if id == "milk" and held_kind == "" and milk_state == "none" and stage in ["pulled", "cup_on", "locked", "pulling"]:
			return "E: Süt sürahisini al"
		if id == "wand" and held_kind == "pitcher" and milk_state == "held_cold":
			return "E: Sütü köpürt"
		if id == "machine" and stage == "pulled" and held_kind == "pitcher" and milk_state == "steamed":
			return "E basılı tut: Sütü fincana dök"
		if id == "machine" and stage == "pulled" and held_kind == "" and milk_state != "poured":
			return "Önce sütü köpürt (arka tezgâhtaki sürahi)"
	return super.action_text(id)


func interact(id: String) -> void:
	var t := action_text(id)
	if not t.begins_with("E"):
		return
	if id.begins_with("pf_") and stage == "pick_pf":
		held_size = id.substr(3)
		if held_size != shot_size(): wrong = true
		pf_nodes[held_size].visible = false
		hold("pf", held_size)
		stage = "to_grinder"
		return
	if t == "E: Süt sürahisini al":
		milk_pitcher_home.visible = false
		hold_pitcher()
		milk_state = "held_cold"
		return
	if t == "E: Sütü köpürt":
		start_steam()
		return
	if t == "E basılı tut: Sütü fincana dök":
		start_pour()
		return
	super.interact(id)


func hold_pitcher() -> void:
	drop_held()
	held_kind = "pitcher"
	held = Node3D.new()
	cam.add_child(held)
	make_pitcher(held).position.y = -0.06
	held.position = hand_base_r + Vector3(-0.05, 0.05, -0.1)


# ---------- süt köpürtme ----------
func start_steam() -> void:
	drop_held()
	foam = 0.0
	milk_temp = 4.0
	tip_depth = 4.0
	scream = 0.0
	pitcher = make_pitcher(self)
	pitcher.position = WAND + Vector3(0, -0.02, -0.02)
	milk_surface = cyl(pitcher, Vector3(0, 0.06, 0), 0.044, 0.004, Color(0.97, 0.95, 0.9), 0.4)
	temp_label = Label3D.new()
	temp_label.font_size = 64
	temp_label.pixel_size = 0.00045
	temp_label.modulate = Color(1, 1, 1)
	temp_label.outline_size = 10
	temp_label.outline_modulate = Color(0.1, 0.1, 0.1)
	temp_label.position = Vector3(0, 0.15, -0.05)
	temp_label.rotation_degrees.y = 180
	pitcher.add_child(temp_label)
	steam.position = WAND + Vector3(0, 0.18, 0)
	steam.emitting = true
	mode = "steam"
	prompt.text = ""
	view_at(WAND + Vector3(0.12, 0.24, -0.4), WAND + Vector3(0, 0.08, 0))


func _input(event: InputEvent) -> void:
	if mode == "steam" and event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		tip_depth = clamp(tip_depth + event.relative.y * 0.12, -12.0, 60.0)
		return
	super._input(event)


func milk_tick(delta: float) -> void:
	if mode == "steam":
		milk_temp += HEAT_RATE * delta
		if tip_depth >= 0.0 and tip_depth <= 8.0 and milk_temp < 40.0:
			foam += 6.0 * delta
			tip_depth += 6.0 * delta * 0.45   # köpük yükseldikçe yüzey yükselir, uç derinleşir
		elif tip_depth < 0.0:
			scream += delta
		var phase := "Hava al: ucu yüzeyin hemen altında tut" if milk_temp < 40.0 else "Girdap: 62,5 °C'de E ile kapat"
		var where := "yüzeyin üstünde! (iri kabarcık)" if tip_depth < 0.0 else ("ideal" if tip_depth <= 8.0 else "çok derinde")
		panel_text.text = "%s · uç %s (%.0f mm) · köpük +%%%d · E: buharı kapat" % [phase, where, tip_depth, int(foam)]
		temp_label.text = "%.1f °C" % milk_temp
		temp_label.modulate = Color(1, 1, 1) if milk_temp < 60.0 else (Color(0.6, 1, 0.6) if milk_temp <= 65.0 else Color(1, 0.45, 0.35))
		milk_surface.position.y = 0.06 * (1.0 + foam / 100.0)
		pitcher.position.y = WAND.y + 0.07 + tip_depth / 1000.0 - 0.06 * (1.0 + foam / 100.0)
		if Input.is_action_just_pressed("interact") or milk_temp >= 80.0:
			finish_steam()
	elif mode == "pour":
		var pouring := Input.is_action_pressed("interact")
		if pouring:
			pour_fill += 0.35 * delta
		stream.visible = pouring
		if pouring:
			(stream.material_override as StandardMaterial3D).albedo_color = Color(0.97, 0.95, 0.9)
			var ctop := CUP_POS.y + cup_dims(cup_size).y + 0.012
			(stream.mesh as CylinderMesh).height = 0.12
			(stream.mesh as CylinderMesh).top_radius = 0.009
			(stream.mesh as CylinderMesh).bottom_radius = 0.009
			stream.position = Vector3(CUP_POS.x, ctop + 0.06, CUP_POS.z)
		var c: Node3D = placed_cup.get_node_or_null("Top") as Node3D
		if c:
			var h := cup_dims(cup_size).y
			c.position.y = 0.012 + h * clamp(0.45 + pour_fill * 0.55, 0.0, 1.0) * 0.95
			(c as MeshInstance3D).material_override = mat(Color("8a5a35").lerp(Color(0.95, 0.9, 0.82), clamp(pour_fill * 1.2, 0.0, 0.85)), 0.3)
		panel_text.text = "E basılı: süt dök · fincan %%%d dolu · bırakınca biter" % int(min(pour_fill, 1.2) * 100)
		if pour_fill > 0.02 and not Input.is_action_pressed("interact") or pour_fill >= 1.2:
			finish_pour()


func finish_steam() -> void:
	steam.emitting = false
	var target: float = FOAM_TARGET[order_size]
	var fdev: float = abs(foam - target)
	var foam_sc := 100.0 if fdev <= 4.0 else (88.0 if fdev <= 8.0 else (72.0 if fdev <= 12.0 else 0.0))
	if scream > 0.6: foam_sc = min(foam_sc, 72.0)
	var secs: float = abs(milk_temp - MILK_TARGET) / HEAT_RATE
	var temp_sc := 100.0 if secs <= WIN_DARK else (88.0 if secs <= WIN_LIGHT else (72.0 if secs <= WIN_YELLOW else 0.0))
	if milk_temp > 70.0: temp_sc = 0.0
	step_scores.append(foam_sc)
	step_scores.append(temp_sc)
	pitcher.queue_free()
	pitcher = null
	hold_pitcher()
	milk_state = "steamed"
	mode = ""
	prompt_flash("Köpük +%%%d (%d puan) · %.1f °C (%d puan)" % [int(foam), int(foam_sc), milk_temp, int(temp_sc)])
	view_home()


func start_pour() -> void:
	pour_fill = 0.0
	mode = "pour"
	view_at(Vector3(-2.5, 1.4, -1.7), CUP_POS + Vector3(0, 0.05, 0))


func finish_pour() -> void:
	stream.visible = false
	(stream.mesh as CylinderMesh).top_radius = 0.006
	(stream.mesh as CylinderMesh).bottom_radius = 0.006
	var sc := 100.0 if pour_fill >= 0.9 and pour_fill <= 1.0 else (88.0 if pour_fill >= 0.8 and pour_fill <= 1.05 else 72.0)
	step_scores.append(sc)
	drop_held()
	milk_pitcher_home.visible = true
	milk_state = "poured"
	mode = ""
	prompt_flash("Döküm: %s" % ("taştı!" if pour_fill > 1.05 else "%%%d dolu" % int(pour_fill * 100)))
	view_home()


func serve() -> void:
	super.serve()
	milk_state = "none"


# ---------- ekran görüntüleri (yalnız kontrol için) ----------
func auto_shots(dir: String) -> void:
	await get_tree().create_timer(5.0).timeout
	order_size = "latte"
	if bubble: bubble.text = "Bir latte lütfen!"
	await shot(dir, "v3_1_tezgah.png")
	interact("pf_double")
	player.position = Vector3(-1.65, 0.05, -2.0)
	yaw = PI
	pitch = -0.6
	apply_look()
	await shot(dir, "v3_2_eller.png")
	interact("grinder")
	await get_tree().create_timer(0.5).timeout
	dose_g = 17.8
	dose_tick(0.0)
	await shot(dir, "v3_3_doz.png")
	finish_dose()
	await get_tree().create_timer(0.5).timeout
	interact("station")
	await get_tree().create_timer(0.5).timeout
	for k in 30:
		wdt_cursor = Vector2.from_angle(k * 0.6) * (30.0 + k * 3.0)
		wdt_tick(0.04)
	await shot(dir, "v3_4_dagitma.png")
	finish_wdt()
	await get_tree().create_timer(0.5).timeout
	interact("station")
	await get_tree().create_timer(0.5).timeout
	bubble_pos = Vector2(10, -6)
	await shot(dir, "v3_5_temper.png")
	await get_tree().create_timer(2.0).timeout
	player.position = Vector3(-2.45, 0.05, -2.05)
	pitch = -0.55
	apply_look()
	await get_tree().create_timer(0.5).timeout
	interact("machine")
	await get_tree().create_timer(0.5).timeout
	lock_px = 130.0
	await shot(dir, "v3_6_kilit.png")
	lock_px = 300.0
	await get_tree().create_timer(0.6).timeout
	interact("cup_latte")
	interact("machine")
	interact("machine")
	await get_tree().create_timer(0.6).timeout
	pull_t = 22.0
	pull_g = 30.0
	await shot(dir, "v3_7_cekim.png")
	pull_g = 36.0
	mode = ""
	stream.visible = false
	tray_bar.visible = false
	placed_cup.queue_free()
	placed_cup = make_cup(self, cup_size, 0.5)
	placed_cup.position = CUP_POS + Vector3(0, 0.005, 0)
	stage = "pulled"
	step_scores.append(100.0)
	view_home()
	await get_tree().create_timer(0.5).timeout
	interact("milk")
	interact("wand")
	await get_tree().create_timer(0.7).timeout
	foam = 14.0
	milk_temp = 31.0
	tip_depth = 3.0
	await shot(dir, "v3_8_sut.png")
	milk_temp = 62.4
	finish_steam()
	await get_tree().create_timer(0.5).timeout
	Input.action_press("interact")
	interact("machine")
	pour_fill = 0.5
	await get_tree().create_timer(0.6).timeout
	await shot(dir, "v3_9_dokum.png")
	Input.action_release("interact")
	get_tree().quit()
