@tool
extends EditorScript

# ==================================================
#  File: Godot_Toolscripts/ZZZTool_GD_Gather.gd
#  Description:
#   - Recursively gathers all .gd files under res://
#   - Excludes scripts beginning with "X_TOOL_"
#   - Skips the Godot internal ".godot" directory
#   - Writes contents to "res://ZZZScriptCompilation.txt"
# ==================================================

var OUTPUT_FILE: String = "res://ZZZScriptCompilation.txt"


func _run() -> void:
    print("=== GatherGDScripts: START ===")

    var out_file = FileAccess.open(OUTPUT_FILE, FileAccess.WRITE)
    if not out_file:
        push_error("Cannot open '%s' for writing." % OUTPUT_FILE)
        return

    out_file.store_line("=== Script Compilation ===\n")

    var gd_paths = _find_gd_files("res://")
    if gd_paths.size() == 0:
        out_file.store_line("No .gd files found under res://.")
        out_file.close()
        return

    for gd_file_path in gd_paths:
        out_file.store_line("\n--- Script: %s ---" % gd_file_path)
        var script_file = FileAccess.open(gd_file_path, FileAccess.READ)
        if script_file:
            var content = script_file.get_as_text()
            out_file.store_line(content)
            script_file.close()
        else:
            out_file.store_line("Could not open %s for reading." % gd_file_path)

    out_file.close()

    print("Wrote script compilation to: %s" % OUTPUT_FILE)
    print("=== GatherGDScripts: DONE ===")


func _find_gd_files(base_dir: String) -> Array:
    var results = []
    var dir = DirAccess.open(base_dir)
    if not dir:
        return results

    dir.list_dir_begin()
    while true:
        var fname = dir.get_next()
        if fname == "":
            break

        # Skip hidden/system files and Godot's internal directory
        if fname.begins_with(".") or fname == ".godot":
            continue

        var full_path = base_dir.path_join(fname)
        if dir.current_is_dir():
            results += _find_gd_files(full_path)
        else:
            var low = fname.to_lower()
            if low.ends_with(".gd") and not fname.begins_with("X_TOOL_"):
                results.append(full_path)

    dir.list_dir_end()
    return results
