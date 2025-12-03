# IFs / Rusty Knife — Builder-Centric Zork Engine

An opinionated re-imagining of the classic Zork runtime with a live builder built in. You can start from a blank room, carve a new world, add objects/NPCs/actions, and immediately playtest in either CLI or an egui desktop UI—no offline compiles required. A rebuild pipeline keeps the parser vocabulary in sync with the content you author so new nouns/verbs resolve like native Zork terms.

## What’s Different From Traditional IF
- **Live authoring loop**: Slash commands (`/carve`, `/nobj`, `/npc*`, `/action`, etc.) mutate the world at runtime; every change auto-saves to JSON and a change log.
- **Dynamic parser vocab**: A rebuild command exports authored nouns/verbs, runs an NLP enrichment pipeline, and reloads parser assets so custom rooms/objects/actions talk to the same matcher that powers Zork.
- **Guarded exits, doors, and flags/counters**: Built-in support for locked doors, flag/counter checks on exits/actions/dialog, and per-turn drains (health/O2/credits).
- **Dialog graphs with effects**: NPCs have nodes/links with flag/counter/item/credit effects; UI shows clickable options, CLI supports `/npcsay`/`/npcchoose`.
- **Canonical map generation**: A map builder regenerates `assets/maps/<world>/canonical.json` from your world so the UI renders connected graphs and reachability is linted.
- **Streaming long ops**: Rebuild streams Python pipeline progress into the transcript; UI stays responsive.
- **Rich media**: Room assets support hero stills, thumbnails, panoramas (animated WebP or MP4), ambient/looping audio, and per-room TTS.
- **Dual heritage**: Ships with Zork 1/2/3 data and actions, but the same engine runs your authored worlds with equal parser/asset fidelity.

## Running the Engine
- **egui UI**: From `rust/`: `cargo run -p zork-ui-egui --release -- --world ../out/worlds/sample_world.json`
- **CLI**: From `rust/`: `cargo run -p zork-cli -- --world ../out/worlds/sample_world.json`
- Omit `--world` to load the default Zork1. The active world drives the canonical map and rebuild targets.

## Builder Quickstart (in-game slash commands)
- `/newworld <name>`: Start a blank world (writes to `out/worlds/<name>.json` + log).
- `/carve <dir>`: Add an exit (auto stubs + reciprocal); `/exit` and `/door` give guarded/locked variants.
- `/ldesc`/`/sdesc`: Set long/short descriptions; `/name` renames the room (updates exits/refs).
- `/nobj <name>, <desc>[, container]`: Add object to the current room; `/objname` renames an object id.
- `/action <cmd> <requires> <effects>`: Room-scoped custom command; fires before parser, mutates flags.
- `/flag`, `/objflags`, `/moveobj`, `/cloneobj`, `/cloneroom`, `/exportroom`, `/importr`: World/asset utilities.
- `/ambient` and `/variant`: Add always-on or flag-gated description fragments.
- `/start <room>`: Set start metadata; `/note` adds builder notes.
- `/counter <name> <value|+N|-N> [drain N]`: Track health/O2/credits; guards and effects understand counters.
- **NPCs**: `/npc` to create/place, `/npcnode` and `/npclink` to build dialog graphs, `/npcplace` to move, `/npcsay` + `/npcchoose` to drive dialog.
- `/lint`: Reports missing descriptions, dangling/missing reciprocal exits, reachability gaps (rooms/NPCs/objects), and asset drift.
- `/saveworld [path]`: Snapshot world + append to change log.
- `/rebuild`: Save, export vocab seed, run `enrich_vocab.py`, merge parser assets, copy world to `out/<game>_world.json`, regenerate canonical map for `<game>`, and hot-reload parser/map.

## Media & Assets
- **Manifest + discovery**: `assets/<game>/manifest.json` can declare per-room/object `hero`, `thumb`, `pano`, `ambient`, `loop`, `tts`; discovery also scans `assets/<game>/rooms/<room-slug>/` for `hero.(webp|png|jpg)`, `pano.(webp|png|jpg|mp4)`, `thumb.*`, `tts.(mp3|wav)`. Missing entries gracefully fall back to discovered files.
- **Hero & thumb**: Static images shown in the scene pane when no pano is active.
- **Panoramas**: Animated WebP or MP4 pano assets are decoded, seam-blended, cached, and animated with zoom/drag, neighbor prefetch, and frame timing. MP4 support depends on the `mp4-video` feature build.
- **Audio**: Ambient/loop media can autoplay per room; TTS playback (first visit/always/never) reads room text via `tts.mp3`/`tts.wav` with adjustable volume and cancel when moving away.
- **Fallbacks**: If manifest targets are missing, discovery provides best-effort resolution; missing assets degrade cleanly.

### Dialog Effects & Guards
- **Requires**: Flags (`FLAG`, `!FLAG`) and counters (`O2>=3`, `HEALTH<1`).
- **Effects**: Set/clear flags (`FLAG`, `!FLAG`), mutate counters (`O2+=1`, `HEALTH=0`), give/take items (`GIVE:ITEM`, `TAKE:ITEM`), and credit changes (`CREDITS+=5`).
- Hidden links (`HIDDEN`) allow secret or auto-advance branches. Dialog ends when a node has no outgoing links.

## Rebuild & Vocab Pipeline
- Trigger in-game with `/rebuild` (CLI/UI). It:
  1) Saves the active world and vocab seed to `out/worlds/<game>_vocab_seed.json`.
  2) Runs `python enrich_vocab.py --vocab zork1_vocab.json zork2_vocab.json zork3_vocab.json <seed> --out-dir out --use-local-conceptnet --no-embeddings`.
  3) Merges into parser assets (`out/parser_only.json`, synonyms/weights, embeddings if enabled) and reloads them.
  4) Copies the world to `out/<game>_world.json`.
  5) Regenerates `assets/maps/<game>/canonical.json` via `generate_canonical_map.py` and reloads the map.
- Progress streams into the transcript. Override files must use dict-style neighbor entries; `enrich_vocab.py` now normalizes string neighbors to avoid crashes.

## Compatibility & Parser Heritage
- **Original Zork data**: Includes Zork 1/2/3 worlds, canonical maps, and legacy action handlers; loading with no `--world` flag starts in Zork1.
- **New worlds, same stack**: Builder worlds use the identical parser/runtime; `/rebuild` merges your authored tokens into the vocab seed so LOOK/TAKE/TALK resolve custom nouns/verbs with full confidence.
- **Mixed assets**: Asset manifests and room discovery work for both legacy worlds and new builds—hero/pano/audio/TTS can be layered onto classic locations as well.
- **Map parity**: `generate_canonical_map.py` emits canonical graphs for any world id; manual edges remain for action-driven Zork links, while your exits are auto-derived.

## Maps & Reachability
- Maps live at `assets/maps/<game>/canonical.json` (one per world id = `world.game`).
- `generate_canonical_map.py` reads `out/<game>_world.json`, normalizes directions, marks one-way edges, and warns on exits to unknown rooms. It also injects manual edges for legacy Zork action-driven links.
- The UI loads the canonical map matching the current world id; rebuild ensures the map is regenerated with your latest exits.

## Saving, Logs, and Files
- Worlds save to `out/worlds/<name>.json`; change log lines go to `<name>.log.jsonl` when a path is known.
- Rebuild emits vocab seeds in the same directory and copies the world to `out/<game>_world.json` for map/scripts to consume.
- Parser assets live under `out/`; canonical maps under `assets/maps/<game>/`.

## How to Author Branching Dialog (quick recipe)
1) `/npc Tech, Greasy mechanic` (and `/npcplace Tech Cargo-Bay` if needed).
2) `/npcnode Tech greet "The tech eyes you warily."`
3) `/npcnode Tech help "Yeah? Need something?"`
4) `/npclink Tech greet help "Ask for help"`
5) `/npcnode Tech doors "Bay doors are jammed." REQUIRES: BAY-POWER ON EFFECTS: !BAY-LOCK`
6) `/npclink Tech help doors "Ask to open the bay doors" REQUIRES: TOOLKIT`
7) Test with `talk Tech` or `/npcsay Tech greet`, then `/npcchoose 1` in CLI or click in UI.

## Sample Loop (blank world to playable)
1) `/newworld IFZ`
2) `/name Airlock` + `/ldesc You stand in the station airlock...`
3) `/carve n`, `/carve e`, etc.
4) `/nobj Helmet, A sturdy EVA helmet.` (and more objects)
5) `/door e locked AIRLOCK-KEY` to block traversal.
6) `/counter O2 10 drain 1` to add time pressure.
7) Add NPC with dialog branches as above.
8) `/lint` to catch missing desc/exits/reachability.
9) `/rebuild` to regenerate vocab + map; reload UI to see the updated map.

## Known Limits / Tips
- TALK verb still benefits from including NPC names in vocab (rebuild does this when you add NPCs).
- Keep `world.game` aligned with your intended map folder; rebuild now targets `assets/maps/<world.game>/`.
- Long rebuilds: progress is streamed, but running with embeddings will take longer; use `--no-embeddings` (default here) for faster offline runs.

## Directory Pointers
- Core/engine: `rust/zork-core/src`
- CLI: `rust/zork-cli/src/main.rs`
- UI: `rust/zork-ui-egui/src/main.rs`
- Rebuild scripts: `enrich_vocab.py`, `generate_canonical_map.py`
- Docs: `builder_guide.md`, `ifs_plan.md`
