@tool
extends EditorScript

# ==================================================
#  File: ZZZTool_TSCN_Gather.gd
#  Description:
#   - EditorScript for Godot 4.4 that:
#       1) Recursively finds all .tscn/.scn under res://
#       2) Loads & instantiates each scene
#       3) Gathers inspector property info for each node
#       4) Writes the results to "res://ZZZscenes_inspector_dump.txt"
# ==================================================

var OUTPUT_FILE: String = "res://ZZZscenes_inspector_dump.txt"


func _run() -> void:
    print("=== SceneInspectorExport: START ===")
    var out_file = FileAccess.open(OUTPUT_FILE, FileAccess.WRITE)
    if not out_file:
        push_error("Cannot open '%s' for writing." % OUTPUT_FILE)
        return

    out_file.store_line("=== Scenes Inspector Dump ===\n")

    var tscn_paths = _find_scene_files("res://")
    if tscn_paths.size() == 0:
        out_file.store_line("No .tscn/.scn files found under res://.")
        out_file.close()
        return

    var scene_count = 0
    for scene_path in tscn_paths:
        var scene_res = ResourceLoader.load(scene_path)
        if scene_res is PackedScene:
            var scene_root = (scene_res as PackedScene).instantiate()
            if scene_root:
                scene_count += 1
                out_file.store_line("\n--- Scene: %s ---" % scene_path)
                _dump_scene_nodes(scene_root, out_file, 0, "Root")
                scene_root.queue_free()

    out_file.store_line("\n=== Total Scenes Processed: %d ===" % scene_count)
    out_file.close()
    print("Wrote inspector data to: %s" % OUTPUT_FILE)
    print("=== SceneInspectorExport: DONE ===")


# Recursively find .tscn/.scn files
func _find_scene_files(base_dir: String) -> Array:
    var results = []
    var dir = DirAccess.open(base_dir)
    if not dir:
        return results

    dir.list_dir_begin()
    while true:
        var fname = dir.get_next()
        if fname == "":
            break
        if fname.begins_with("."):
            continue

        var full_path = base_dir.path_join(fname)
        if dir.current_is_dir():
            results += _find_scene_files(full_path)
        else:
            var low = fname.to_lower()
            if low.ends_with(".tscn") or low.ends_with(".scn"):
                results.append(full_path)
    dir.list_dir_end()
    return results


func _dump_scene_nodes(
    node: Node, file: FileAccess, indent_level: int, synthetic_path: String
) -> void:
    var indent = "  ".repeat(indent_level)
    var node_info = (
        "%sNode: %s (Type: %s) [Path: %s]" % [indent, node.name, node.get_class(), synthetic_path]
    )
    file.store_line(node_info)

    # gather script path if any
    var script_path = ""
    if node.get_script() is Script:
        script_path = (node.get_script() as Script).resource_path
        file.store_line("%s  Script: %s" % [indent, script_path])

    # gather properties (skipping 0 or null)
    file.store_line("%s  Properties:" % indent)
    var prop_list = node.get_property_list()
    for pdict in prop_list:
        var pname = pdict.name
        var val = node.get(pname)
        if val == null:
            continue
        if typeof(val) in [TYPE_INT, TYPE_FLOAT] and float(val) == 0.0:
            continue
        # skip default or trivial values if you want to keep it brief
        file.store_line("%s    %s: %s" % [indent, pname, str(val)])

    # Recurse for children
    var i = 0
    for child in node.get_children():
        var child_path = "%s/%s" % [synthetic_path, child.name]
        _dump_scene_nodes(child, file, indent_level + 1, child_path)
        i += 1
