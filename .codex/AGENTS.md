
<!--
###############################################################################
# 🧠  Codex Agent Workspace – Tooling Contract & Guide (HIDDEN HEADER)
# Godot 4.7.2 · Headless · CI-safe · .NET 8 SDK + Godot-mono included
###############################################################################
# CODING AGENT BEHAVIOR MODE: VERBOSE · STEPWISE · SAFE · LINT-COMPLIANT
# MAXIMUM REASONING TIME
# PULL REQUEST POLICY: NO BINARIES · NO AUTOCOMPLETE · ONLY CONFIRMED CODE
# VARIABLE PREFIX STYLE: <scriptPrefix>_<name>_<ownerFn> · lowercase_snake_case
# TASK SEQUENCE RULE: FOUNDATION FIRST → UTILITIES → SCENES → FEATURES
# COMMIT MESSAGE STYLE: Conventional Commits (e.g., fix(boids): stabilize swim)
# BUG POLICY: Validate scripts → detect errors → fix → revalidate → repeat
# Only commit when zero errors. Warnings may pass unless CI blocks them.
# ERROR POLICY: No bypassing errors. No .gdignore, fake returns, or suppression.
# Placeholders and minimal stubs are allowed only for tracked, planned features.
# Placeholders must not hide script-validation failures.
###############################################################################
-->

```text
###############################################################################
# 🧠  Codex Agent Workspace – Tooling Contract & Guide
# Godot 4.7.2 · Headless · CI-safe · .NET 8 SDK + Godot-mono included
###############################################################################
````

> \[!IMPORTANT]
>
> * **Indentation:** Always 4 spaces in `.gd`, `.gdshader`, `.cs`. Never use tabs.
> * `gdlint` expects `class_name` **before** `extends`.

> \[!IMPORTANT]
> Your tools might let you create a PR that includes a binary file, but the user
> will be unable to merge it. **All PRs must *exclude* binary files.**

> \[!IMPORTANT]
> You **are not** allowed to use `.gdignore` to silence errors. **Fix them
> correctly** instead.

---

## ──── SECTION: GODOT FIRST-TIME SETUP ────

1. **Use the built-in Godot CLI**: `/usr/local/bin/godot` (default in this image).
   To override, export `GODOT=/full/path/to/godot`.

   **Selecting Godot version (CODEX Cloud):** re-run `.codex/setup.sh` with env vars:
   - `GODOT_TAG=4.7.2-stable` (recommended)
   - `GODOT_TAG=latest-stable` (tracks latest stable via GitHub API)
   - `GODOT_ARCH=arm64` (or `x86_64`, `x86_32`, `arm32`)

2. **Import pass** – warm caches & create `global_script_class_cache.cfg`:

   ```bash
   godot --headless --editor --import --quit --path . --verbose .
   ```

3. **Parse all GDScript**:

   ```bash
   godot --headless --check-only --quit --path . --verbose .
   ```

4. **Build C#/Mono** (auto-skips if no `*.sln` exists):

   ```bash
   dotnet build --nologo > /tmp/dotnet_build.log
   tail -n 20 /tmp/dotnet_build.log
   ```

   * **Exit 0** ⇒ project is clean.
   * **Non-zero** ⇒ inspect error lines and fix.

**Repeat steps 2–4 after every edit until all return 0.**

For stubborn errors, crank up verbosity:

```bash
dotnet build --verbosity diagnostic
godot --headless --check-only --quit --path . --verbose .
```

---

## ──── SECTION: PATCH HYGIENE & FORMAT ────

!Respect the folders listed in .codexignore These folders are closed for editing. You may read but not not alter files in those folders.

```bash
# Auto-format changed .gd files
.codex/fix_indent.sh $(git diff --name-only --cached -- '*.gd') >/dev/null

# Report lint warnings (non-blocking)
gdlint $(git diff --name-only --cached -- '*.gd') || true

# C# style check (fail on real violations only)
dotnet format --verify-no-changes --nologo --severity hidden || {
  echo '🛑  C# style violations'; exit 1; }
```

**CODING AGENT RULES**

* No tabs, no syntax errors, no style violations before commit.
* **Binary files may not be added, staged, or committed** under any circumstances.
* Review local `TODO.md`, `CHANGE_LOG.md`, `STYLE_GUIDE.md`, `README.md`,
  `VARIABLE_NAMING.md`. Create/ update them as needed.

---

## ──── SECTION: GODOT VALIDATION LOOP (CI) ────

```bash
# CI validates quietly and only emits errors
godot --headless --editor --import --quit --path . --quiet
godot --headless --check-only --quit --path . --quiet
dotnet build --no-restore --nologo
```

**Optional tests**

```bash
godot --headless -s res://tests/ --quiet || true
dotnet test --logger "console;verbosity=quiet" || true
```

---

## ──── SECTION: QUICK CHECKLIST ────

```text
apply_patch
├─ gdformat --use-spaces=4 <changed.gd>
├─ gdlint   <changed.gd>     (non-blocking)
├─ godot  --headless --editor --import --quit --path . --quiet
├─ godot  --headless --check-only      --quit --path . --quiet
└─ dotnet build --no-restore --nologo
```

---

## ──── SECTION: WHY THIS MATTERS ────

* `--import` is the **only** way to build Godot’s script-class cache.
* CI skips the import when no `main_scene` is set, so fresh repos won’t fail.
* `--check-only` finds GDScript errors; `dotnet build` compiles C#.
  Together, these guarantee the project builds headlessly on any clean machine.

**TL;DR:** Run the three headless commands with `--quiet`. Exit 0 ⇒ good. Else,
fix & rerun.

---

## ──── ADDENDUM: BUILD-PLAN RULE SET ────

1. **Foundation first** – build scaffolding (data models, interfaces, utils)
   before high-level features.

2. **Design principles** – data-driven, modular, extensible, compartmentalized.
   Follow each language’s canonical formatter (PEP 8, rustfmt, go fmt, gdformat…).

3. **Indentation** – spaces-only except in languages that *require* tabs
   (e.g., `Makefile`).

4. **Header comment block** – for files that support comments, prepend:

   ```text
   ###############################################################
   # <file path>
   # Key Classes      • Foo – does something important
   # Key Functions    • bar() – handles a critical step
   # Critical Consts  • BAZ – tuning value
   # Editor Exports   • bum: float – Range(0.0 .. 1.0)
   # Dependencies     • foo_bar.gd, utils/foo.gd
   # Last Major Rev   • YY-MM-DD – overhauled bar() for clarity
   ###############################################################
   ```

5. **Language-specific tests** – run `cargo test`, `go test`, `bun test`, etc.,
   when present.

6. **Efficient time use** – you *don’t* need to run .NET and Godot verify
   commands if you haven’t changed any `.gd`/`.cs` files or their dependencies;
   the pre-commit hooks will catch issues automatically.

---

## ──── ADDENDUM: gdlint CLASS-ORDER WARNINGS ────

`gdlint` 4.x enforces **class-definitions-order**
(tool → `class_name` → `extends` → signals → enums → consts → exports → vars).

If it becomes noisy:

* Re-order clauses to match the list, **or**
* Customize via `.gdlintrc`, **or**
* Pin `gdtoolkit==4.0.1`.

CI runs gdlint **non-blocking**; treat warnings as advice until you decide to
enforce them strictly.

---

```text
###############################################################################
# End of Codex Agent Workspace Guide
###############################################################################
```




