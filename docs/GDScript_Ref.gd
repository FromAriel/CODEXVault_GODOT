@icon("res://path/to/icon.svg")
extends Node
# File: res://path/to/GDScript_Ref.gd
class_name YourScript

## -------------------------------------------------------------------------------- 
## [b]NAME[/b]: YourScript — One‑line brief summary of the script's role and functionality.
## -------------------------------------------------------------------------------- 
## [b]DESCRIPTION[/b]:
## A longer description that explains responsibilities, lifecycle expectations,
## and any architectural constraints (threading, signals, ownership, performance notes).
## Keep this human‑readable; the member list below is auto‑linked so it shows up nicely
## in the Inspector Help. Use `[br]` for controlled line breaks when needed.
## --------------------------------------------------------------------------------
##
## [b]FILE[/b]: [code]res://path/to/YourScript.gd[/code][br]
## [b]Major dependencies[/b]: [Class Timer], [Class Node], [Class Callable][br]
## • Uses [method Node.add_child], [method SceneTree.create_timer], [signal Timer.timeout].[br]
## • Expects a [Class Timer] child at [code]tick_timer_path[/code], or creates one at runtime.[br]
## --------------------------------------------------------------------------------
##
## [b]KEY VARIABLES[/b]: [member enabled], [member speed], [member _state].[br]
## [b]PUBLIC API (methods)[/b]: [method initialize], [method start], [method stop], [method is_running].[br]
## --------------------------------------------------------------------------------
##
## [b]NOTES[/b]: If you are migrating, see “Migrating to a new version” in the online docs (4.5).[br]
## [b]DOCS[/b]: See [annotation @GDScript.@rpc], [enum Tween.TransitionType], [signal Node.renamed].[br]
## --------------------------------------------------------------------------------
##
## @tutorial(Design Doc): https://example.com/your_design_doc
## @experimental: Template status — adjust sections for your project.

## Emitted when [method start] transitions to running.
signal started

## Emitted when [method stop] transitions to idle.
signal stopped

## Operational states for this controller.
enum State {
    ## Idle / not running.
    IDLE = 0,
    ## Actively running.
    RUNNING = 1,
}

## Semantic version for this script/module.
const VERSION: String = "0.1.1"

## Whether this controller is enabled. If [code]false[/code], [method start] is a no‑op.
@export var enabled: bool = true

## Base speed scalar for time‑based operations (units per second).
@export var speed: float = 1.0

## Path to a child timer to drive ticks. If empty, one will be created at runtime.
@export var tick_timer_path: NodePath = NodePath("tick_timer")

## Internal state machine value. Documented so it appears in Help even though it starts with underscore.
var _state: State = State.IDLE

## Cached reference to the tick timer (created or fetched at [method initialize] time).
var _tick_timer: Timer = null


## Initializes the controller:
## • Resolves/creates the [Class Timer] child.[br]
## • Resets internal state to [enum State.IDLE].[br]
## Call this once after construction or on scene ready.
func initialize() -> void:
    if _tick_timer == null:
        var existing: Node = get_node_or_null(tick_timer_path)
        if existing is Timer:
            _tick_timer = existing as Timer
        else:
            _tick_timer = Timer.new()
            _tick_timer.one_shot = false
            _tick_timer.autostart = false
            _tick_timer.wait_time = 1.0 / max(speed, 0.0001)
            _tick_timer.name = String(tick_timer_path)
            add_child(_tick_timer)
    else:
        _tick_timer.wait_time = 1.0 / max(speed, 0.0001)

    # Always begin in IDLE.
    _state = State.IDLE


## Starts the controller:
## • No‑ops when [member enabled] is [code]false[/code].[br]
## • Sets state to [enum State.RUNNING] and emits [signal started].
func start() -> void:
    if enabled == false:
        # Explicitly document why we’re not starting.
        _state = State.IDLE
    else:
        if _tick_timer == null:
            initialize()
        _tick_timer.start()
        _state = State.RUNNING
        started.emit()


## Stops the controller:
## • Sets state to [enum State.IDLE] and emits [signal stopped].
func stop() -> void:
    if _tick_timer != null:
        _tick_timer.stop()
    else:
        # Nothing to stop; still set state deterministically.
        pass

    if _state == State.RUNNING:
        _state = State.IDLE
    else:
        _state = State.IDLE

    stopped.emit()


## Returns whether the controller is currently running.
func is_running() -> bool:
    if _state == State.RUNNING:
        return true
    else:
        return false


## Adjusts the controller speed at runtime and updates the timer period.
## [param new_speed] New units‑per‑second scalar (must be > 0).
func set_speed(new_speed: float) -> void:
    if new_speed > 0.0:
        speed = new_speed
    else:
        speed = 0.0001

    if _tick_timer != null:
        _tick_timer.wait_time = 1.0 / max(speed, 0.0001)
    else:
        # Defer reconfiguration until initialize/start.
        pass


## Example ready hook: wire initialize automatically if this is a scene node.
func _ready() -> void:
    # Node has no parent script _ready(), so don’t call super() here.
    initialize()



# ---- Godot 3.x → 4.x quick gotchas (with strict typing + explicit if/else) ----
## This section is purely demonstrative and safe to keep in the file as notes.
## Each block shows 3.x vs 4.x with brief rationale and a tiny runnable example.

## 1) Annotations & attributes: `tool`, `export`, `onready`, `warning_ignore`
## 3.x:
## tool
## export(float) var speed := 1.0
## onready var label := $Label
## 4.x:
## @tool
## @export var speed: float = 1.0
## @onready var label: Label = $Label
## @warning_ignore("unused_variable")

## 2) yield() → await, signal await syntax
## 3.x:
## var t := Timer.new()
## add_child(t)
## t.start(0.2)
## yield(t, "timeout")
## print("done")
## 4.x:
func _example_await_timer() -> void:
    var t: Timer = Timer.new()
    add_child(t)
    t.start(0.2)
    await t.timeout
    print("done")

## 3) setget → property accessors (`get:`/`set:`)
## 3.x:
## var hp := 100 setget set_hp, get_hp
## func set_hp(v): hp = clamp(v, 0, 100)
## func get_hp(): return hp
## 4.x:
var _hp: int = 100
var hp: int:
    set(value):
        if value < 0:
            _hp = 0
        else:
            if value > 100:
                _hp = 100
            else:
                _hp = value
    get:
        return _hp

## 4) funcref → Callable, call_deferred remains but Callable is canonical
## 3.x:
## var c = funcref(self, "_foo")
## c.call_func()
## 4.x:
func _foo() -> void:
    print("foo")
func _example_callable() -> void:
    var c: Callable = Callable(self, "_foo")
    if c.is_valid() == true:
        c.call()
    else:
        print("Callable invalid")

## 5) StringName literals (&"name") and typed names
var action_jump: StringName = &"jump"  # cheaper comparisons than String
var plain_text: String = "Hello"

## 6) Typed arrays/dicts (generics); default values must match the declared type
var points: Array[Vector2] = []
var phone_book: Dictionary[String, int] = {}
func _example_collections() -> void:
    points.append(Vector2(1, 2))
    if phone_book.has("Alice") == true:
        print(phone_book["Alice"])
    else:
        phone_book["Alice"] = 5551234

## 7) Signals: connect style changed (method reference vs string)
## 3.x:
## button.connect("pressed", self, "_on_pressed")
## 4.x:
func _example_signal_connect(button: Button) -> void:
    if button != null:
        button.pressed.connect(_on_pressed)
    else:
        print("No button to connect")
func _on_pressed() -> void:
    print("Pressed!")

## 8) NodePath helpers: prefer get_node_or_null for safety
func _example_get_node() -> void:
    var n: Node = get_node_or_null("Some/Path")
    if n != null:
        print("Found node:", n.name)
    else:
        print("Node not found")

## 9) RNG API: use RandomNumberGenerator and randf_range
func _example_rng() -> void:
    var rng: RandomNumberGenerator = RandomNumberGenerator.new()
    rng.randomize()
    var x: float = rng.randf_range(0.0, 1.0)
    if x > 0.5:
        print("High")
    else:
        print("Low")

## 10) Input enums moved to `Key`, `MouseButton`, etc.
func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventKey:
        var key_event: InputEventKey = event
        if key_event.keycode == KEY_SPACE:
            print("Space pressed")
        else:
            pass


## 11) Assignment‑in‑definition strictness: defaults must be type‑compatible in 4.x
var cooldown_s: float = 0.5
var label_path_ok: NodePath = NodePath("Label")
var optional_label: Label = null  # explicit, allowed
## Bad (4.x will complain):
## var cooldown_bad: float = null            # ❌ type mismatch
## @export var some_int: int = 1.5           # ❌ precision/type error

## 12) `has` helpers: Array.has, Dictionary.has remain; `in` works
func _example_has_ops() -> void:
    var arr: Array[int] = [1, 2, 3]
    var ok: bool = arr.has(2)
    if ok == true:
        print("array contains 2")
    else:
        print("no 2 in array")
    var dict: Dictionary[String, Variant] = {"k": 7}
    if "k" in dict:
        print("dict has k")
    else:
        print("dict missing k")

## 13) Resources & loading: cast with `as`; `preload` unchanged
const MY_TEX: Texture2D = preload("res://icon.svg")
func _example_load() -> void:
    var res: Resource = ResourceLoader.load("res://icon.svg")
    var tex: Texture2D = res as Texture2D
    if tex != null:
        print("Texture size:", tex.get_size())
    else:
        print("Not a Texture2D")

## 14) PackedScene instantiation: `instantiate()` returns Node; cast explicitly
func _example_scene_instancing(packed: PackedScene) -> void:
    if packed != null:
        var node: Node = packed.instantiate()
        add_child(node)
    else:
        print("No scene provided")

## 15) Math helpers: prefer `deg_to_rad` / `rad_to_deg`
func _example_math() -> void:
    var a: float = 45.0
    var r: float = deg_to_rad(a)
    if r > 0.0:
        print(r)
    else:
        print(0.0)

## 16) Typed `Variant` patterns: safe checks before use
func _example_variant(v: Variant) -> void:
    if v is String:
        var s: String = v
        print("len:", s.length())
    else:
        if typeof(v) == TYPE_INT:
            var i: int = int(v)
            print("i:", i)
        else:
            print("unsupported variant:", v)

## 17) match pattern matching examples
func _example_match(v: Variant) -> void:
    # Keep the match patterns simple and push complex checks inside the branch.
    match v:
        0:
            print("zero")
        1, 2, 3:
            print("small")
        _:
            # Emulate typed/range behavior with explicit checks.
            if v is String:
                print("it's a String")
            elif typeof(v) == TYPE_INT and int(v) >= 4 and int(v) <= 100:
                print("range")
            elif typeof(v) == TYPE_INT:
                print("bound int:", int(v))
            else:
                print("fallback")


## 18) (Style) Avoid inline conditional expressions if your code standard requires explicit if/else
func _example_explicit_label() -> void:
    var label_text: String = ""
    if is_running() == true:
        label_text = "RUNNING"
    else:
        label_text = "IDLE"
    print(label_text)

## 19) super() call to base class implementation — shown above in [_ready].

## 20) assert usage
func _example_assert(new_speed: float) -> void:
    assert(new_speed > 0.0, "speed must be > 0")
    speed = new_speed
    if _tick_timer != null:
        _tick_timer.wait_time = 1.0 / max(speed, 0.0001)
    else:
        pass

## 21) Const rules demonstration
const VERSION_NAME: String = "0.1.1"
const ICON: Texture2D = preload("res://icon.svg")

## 22) Typed Dictionary examples
var cfg: Dictionary[String, int] = {}
var meta: Dictionary[String, Variant] = {"name": "Hero", "hp": 100}

## 23) Annotation quick reference (docs)
## @rpc, @icon, @tool, @export, @onready, @warning_ignore

## 24) Await idioms beyond Timer
func _example_quick_await() -> void:
    await get_tree().create_timer(0.2).timeout
    print("done waiting")

## 25) Export niceties — use enums directly when possible
@export var start_state: State = State.IDLE
@export_range(0.1, 10.0, 0.1, "suffix:s") var cooldown_seconds: float = 0.5
@export_group("Timing")
@export var tick_rate: float = 4.0

## 26) Packed array examples
var samples: PackedFloat32Array = PackedFloat32Array([0.0, 1.0, 0.5])

## 27) (4.5) Variadic parameters example — new in Godot 4.5
func sum_all(a: int, b: int, ...rest: Array) -> int:
    var total: int = a + b
    for x in rest:
        total += int(x)
    return total
