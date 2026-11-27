extends "res://dukkan/defter.gd"
## Oyun içi sesler (tasarım belgesi "Ses ve ses ayarları (taşıma adımı T18)"): hangi olayda hangi ses.


func _ready() -> void:
	super._ready()
	if menu_modu:
		return
	Ses.muzik("game")


func _exit_tree() -> void:
	Ses.donguleri_durdur()


func _process(delta: float) -> void:
	super._process(delta)
	if menu_modu:
		return
	var basili := Input.is_action_pressed("interact")
	Ses.dongu("grind", mode == "dose" and basili)
	Ses.dongu("extract", mode == "pull")
	Ses.dongu("milk", mode == "steam")
	Ses.dongu("air", mode == "steam" and tip_depth >= 0.0 and tip_depth <= 8.0 and milk_temp < 40.0)
	Ses.dongu("pour", mode == "pour" and basili)


func close_panel(score: float, label: String) -> void:
	var m := mode
	super.close_panel(score, label)
	match m:
		"dose": Ses.sfx("dose")
		"tamp": Ses.sfx("tamp")
		"pull": Ses.sfx("extractStop")


func lock_tick(delta: float) -> void:
	var once := stage
	super.lock_tick(delta)
	if once != "locked" and stage == "locked":
		Ses.sfx("lock")


func interact(id: String) -> void:
	var tel := id == "knock" and action_text(id).begins_with("E")
	super.interact(id)
	if tel:
		Ses.sfx("knock")


func _ac() -> void:
	super._ac()
	Ses.sfx("shopOpen")


func _gun_bitti() -> void:
	super._gun_bitti()
	Ses.donguleri_durdur()
	Ses.sfx("shopClose")


func _servis_sonrasi(m: Dictionary, tutar: int, bahsis: int, servis: int) -> void:
	super._servis_sonrasi(m, tutar, bahsis, servis)
	Ses.sfx("register")
	if bahsis > 0:
		Ses.sfx("tip")
	if servis >= 95:
		Ses.sfx("perfect")


func _reddedildi(m: Dictionary) -> void:
	super._reddedildi(m)
	Ses.sfx("sad")


func _musteri_kacti(m: Dictionary) -> void:
	super._musteri_kacti(m)
	Ses.sfx("sad")


func tarifleri_ac() -> void:
	var once: int = (GameState.S.unlocked as Array).size()
	super.tarifleri_ac()
	if (GameState.S.unlocked as Array).size() > once:
		Ses.sfx("unlock")


func _seviye_atla(yenile: Callable) -> void:
	super._seviye_atla(yenile)
	Ses.sfx("unlock")


func basarim(id: String) -> void:
	var vardi: bool = id in GameState.S.get("ach", [])
	super.basarim(id)
	if not vardi and id in GameState.S.get("ach", []):
		Ses.sfx("unlock")


func _juri(puan: int) -> void:
	var once: int = (GameState.S.get("medals", []) as Array).size()
	super._juri(puan)
	if (GameState.S.get("medals", []) as Array).size() > once:
		get_tree().create_timer(1.4).timeout.connect(func(): Ses.sfx("perfect"))
