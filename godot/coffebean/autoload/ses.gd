extends Node
## Ses (tasarım belgesi "Ses ve ses ayarları (taşıma adımı T18)"): müzik, tek seferlik efektler, sürekli sesler.
## Dosyalar tools/ses_uret.py ile üretilir (ses/*.wav).

const DONGULER := ["extract", "milk", "air", "grind", "pour"]

var muzik_oyuncu: AudioStreamPlayer
var muzik_eski: AudioStreamPlayer
var parca := ""
var havuz: Array = []
var donguler := {}
var onbellek := {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for ad in ["Muzik", "Efekt"]:
		if AudioServer.get_bus_index(ad) < 0:
			AudioServer.add_bus()
			var i := AudioServer.bus_count - 1
			AudioServer.set_bus_name(i, ad)
			AudioServer.set_bus_send(i, "Master")
	for i in 10:
		var p := AudioStreamPlayer.new()
		p.bus = "Efekt"
		add_child(p)
		havuz.append(p)
	for ad in DONGULER:
		var p := AudioStreamPlayer.new()
		p.bus = "Efekt"
		p.stream = _yukle(ad)
		p.process_mode = Node.PROCESS_MODE_PAUSABLE      # oyun duraklayınca sürekli sesler de durur
		add_child(p)
		donguler[ad] = p
	seviyeleri_uygula()


func _yukle(ad: String) -> AudioStream:
	if not onbellek.has(ad):
		var yol := "res://ses/%s.wav" % ad
		onbellek[ad] = load(yol) if ResourceLoader.exists(yol) else null
	return onbellek[ad]


func _db(v: float) -> float:
	return linear_to_db(maxf(v, 0.0001))


func seviyeleri_uygula() -> void:
	var m := AudioServer.get_bus_index("Muzik")
	var e := AudioServer.get_bus_index("Efekt")
	AudioServer.set_bus_volume_db(m, _db(Settings.muzik))
	AudioServer.set_bus_mute(m, Settings.muzik <= 0.0)
	AudioServer.set_bus_volume_db(e, _db(Settings.efekt))
	AudioServer.set_bus_mute(e, Settings.efekt <= 0.0)
	AudioServer.set_bus_mute(0, Settings.sessiz)


## Tek seferlik efekt (boştaki ilk oynatıcıdan).
func sfx(ad: String) -> void:
	var s := _yukle(ad)
	if s == null:
		return
	for p in havuz:
		if not p.playing:
			p.stream = s
			p.play()
			return
	havuz[0].stream = s
	havuz[0].play()


## Sürekli ses aç/kapat (çağrılması her karede güvenli).
func dongu(ad: String, acik: bool) -> void:
	var p: AudioStreamPlayer = donguler.get(ad)
	if p == null or p.stream == null:
		return
	if acik and not p.playing:
		p.play()
	elif not acik and p.playing:
		p.stop()


func donguleri_durdur() -> void:
	for ad in donguler:
		donguler[ad].stop()


## "menu" ya da "game"; aynı parça çalıyorsa dokunmaz, değişiyorsa 1 sn yumuşak geçiş.
func muzik(ad: String) -> void:
	if ad == parca:
		return
	parca = ad
	var s := _yukle("muzik_" + ad)
	if s == null:
		return
	if muzik_oyuncu:
		var eski := muzik_oyuncu
		var tw := create_tween()
		tw.tween_property(eski, "volume_db", -40.0, 1.0)
		tw.tween_callback(eski.queue_free)
	muzik_oyuncu = AudioStreamPlayer.new()
	muzik_oyuncu.bus = "Muzik"
	muzik_oyuncu.stream = s
	muzik_oyuncu.volume_db = -40.0
	add_child(muzik_oyuncu)
	muzik_oyuncu.play()
	create_tween().tween_property(muzik_oyuncu, "volume_db", 0.0, 1.0)
