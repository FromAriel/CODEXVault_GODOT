# Typography Lab

Standalone typography and glyph-choreography test page for `17 Points of Violence`.

Open:

```text
game/17_points_of_violence/tools/typography_lab/index.html
```

No dependencies are required. The page uses a classic browser script, so it can be opened directly from disk or served by any static file server.

## What It Tests

- whole-word readability before glyph breakup;
- per-letter birth, squash, drift, rebound, debris timing, and carry-through momentum;
- declarative choreography presets that drive build/read/move/separate/fade timing;
- Scott Pilgrim-style exit-side hit words;
- protected player/enemy combat lane visualization, with hit words kept outside the placeholder fighters;
- block and whiff text that behave differently from hits;
- floor-biased body/low-hit typography;
- finisher frame wipe plus a readable heavy word;
- mob-pressure background typography;
- a WebGPU readiness panel for the later Slug/WGSL renderer spike, including adapter/format/feature notes when available.
- a lab-only WGSL static glyph fidelity panel that compares generated font curve data through Canvas fallback and WebGPU output, with word/size/transform stress presets, even-odd fill parity, and debug overlays.
- a lab-only WGSL animated glyph instance panel that compares generated-font animation through Canvas fallback and WebGPU output, now driven by one continuous word-body controller instead of preset-specific phase formulas.
- sample-card typography routed through the same continuous glyph-controller path, so the eight review scenes and the animated panel share one motion grammar while the font selector swaps the source glyph asset.

## Controls

- `Play all`: restart every sample at once.
- `Stagger play`: restart samples in a ripple for side-by-side timing comparison.
- `Pause` / `Play`: pause or resume the active review timeline.
- `Restart focus`: restart the focused sample, or all samples when focus is set to all.
- `-1 frame` / `+1 frame`: pause and step by one 60fps frame.
- `Reset`: restore default controls and restart the lab.
- `focus`: review all samples or isolate one named sample.
- `speed`: play at `0.25x`, `0.5x`, `1x`, or `1.5x`; the review default is `1.5x`.
- `autoplay loop`: loops each sample independently.
- `slow motion`: runs sample timelines at 35% speed.
- `reduced flash`: lowers quench/flash/wipe intensity without disabling typography.
- `show guides`: toggles contact points, force arrows, and reference marks.
- `protected lane`: toggles the player/enemy gap visualization.
- `word bounds`: shows the readable word envelope during `build`, `read`, and `move` phases.
- `intensity`: scales shake, bloom, rings, and strong motion accents.
- `time`: scrub the focused sample, or all samples together when focus is set to all.
- `glyph font`: swaps every generated-glyph surface between Tac One and the curated review fonts.

Each sample has a phase strip under the canvas plus a small diagnostic line. The shared phase names are `impact`, `build`, `read`, `move`, `separate`, and `fade`. The diagnostic line shows readable-hold progress, visible glyph count, and protected-lane status, so timing and lane failures are visible while scrubbing.

## Samples

- `POW exits skull`: far-side head impact; letters reveal outside the body, carry momentum, and splash away.
- `BAM torso compression`: torso hit squashes, expands, and keeps drifting outward.
- `WHIFF arc`: letters build left-to-right outside the fight lane, hold readable as a word, ride a far-side miss arc, then separate and fade.
- `BLOCK plate`: compact yellow/black guard word flattens at contact and rebounds.
- `THUD floor`: word lands outside the bodies, rides the floor, tips, leaves dust, and fades.
- `Afterbeat double hit`: primary punch word keeps flowing while the terminal accent overtakes it.
- `Finisher frame wipe + word`: circular frame wipe with one heavy readable word beat that exits the fight lane.
- `Mob pressure wall`: background `tap/thud/gogogo` typography field with simple silhouettes emerging.

## Notes For Game Integration

The lab is intentionally separate from `combat_lab`. Promote only the samples that clearly improve readability.

The current sample rule is strict: normal hit text should not be born inside the placeholder bodies or the protected player/enemy gap. Text should enter from the exit side, preserve visible momentum, leave a short smear/trail, and fade or splash out instead of stopping in place.

Glyph samples keep their phase strips as review metadata, but their visible typography now flows through the continuous word-body glyph controller. Each sample still defines the intended reveal/read/scatter/fade timing and protected-lane check, while the controller owns velocity, drag, cohesion, impulse, scatter, and fade. Avoid reintroducing preset-specific hard position jumps.

`WHIFF arc` is the reference timing sample for this pass: it builds left-to-right outside the fight lane, stays readable as `WHIFF`, rides one continuous miss rail as a word, then separates before fade begins.

Likely first promotions after tuning:

- `POW exits skull` for high hits.
- `BLOCK plate` for player/enemy guard beats.
- `WHIFF arc` for clear misses.
- `Afterbeat double hit` for moving punch terminal afterbeats.
- `Finisher frame wipe + word` for death-blow variants after screen FX settles.

The WebGPU readiness card checks browser capability. The static renderer panel is isolated from the choreography samples: it renders one selected-font word in Canvas and, when available, a sandboxed WebGPU canvas. It is still lab-only and not promoted into `combat_lab`.

## Font Preprocessing

The first font preprocessing spike used `Tac One` as the baseline impact-font candidate. The lab now also generates a curated first review batch from the imported font gallery:

- `Tac One`: stable baseline impact face.
- `Bungee Inline`: outlined comic impact.
- `Barrio`: chunky irregular shout.
- `Rubik Glitch`: broken/glitch accent.
- `Metal Mania`: sharp heavy aggression.
- `Faster One`: speed-line motion.

Run from the repo root:

```text
python game/17_points_of_violence/tools/typography_lab/preprocess_font.py
```

The script uses local `fontTools`, caches each source font/license, and writes:

- `game/17_points_of_violence/data/typography/font_manifest.json`
- one `game/17_points_of_violence/data/typography/fonts/*.glyphs.json` asset per generated font;
- one `game/17_points_of_violence/data/typography/reports/*_inspection.html` report per generated font;
- cached source fonts and OFL license files under `game/17_points_of_violence/data/typography/source_fonts/`;
- `game/17_points_of_violence/tools/typography_lab/tac_one_glyph_asset.generated.js`.

The JSON is intentionally verbose and inspectable. It is not the final compact runtime format.
The generated JS bridge keeps its legacy filename for compatibility, but now wraps all generated font JSON assets in one classic script so the lab can consume them from `file://` without `fetch()` or module CORS issues.

## Slug/WGSL Readiness

The lab now treats WebGPU/WGSL as the only experimental GPU target. Canvas2D remains the active renderer and required fallback.

The intended future path is:

```text
font outlines
quadratic curve packing
band data
glyph instance transforms
WGSL renderer
```

The current panel reports whether `navigator.gpu` exists, whether an adapter is granted, the preferred canvas format, selected feature flags such as `shader-f16` and `float32-filterable` when reported, and a few texture/vertex limits. These are readiness signals only; no Slug shader code is loaded by the lab.

## WGSL Static Glyph Renderer

The `WGSL Static Glyph Renderer` section uses the selected generated glyph asset and does not touch the eight choreography samples.

- `Canvas fallback from selected font curves` draws the selected word directly from the preprocessed contour/curve data.
- `WebGPU/WGSL static fill` uploads the same transformed curve segments to a small WGSL shader and fills the word analytically when WebGPU is available.
- Word presets include normal hit words plus counter/hole stress tests such as `POPO`, `BOP`, and `A?O`.
- Size and transform presets stress small, normal, huge, rotated, stretched-wide, and stretched-tall rendering without changing the source glyph asset.
- Canvas and WebGPU both use the V1 even-odd parity fill rule so counters/holes can be compared directly.
- Debug overlays can show glyph bounds, baseline, contours, segment/control-point marks, GPU status, and segment-cap warnings.
- Metrics report the transformed word bounds, uploaded/total segment count, max curves per band, per-glyph segment counts, and truncation status.
- The static review cap is deliberately high enough for the current heavy fonts (`Rubik Glitch` and `Metal Mania`) so normal word presets do not collapse to the first glyph.
- If WebGPU is missing, blocked, or throws during shader setup, the panel reports the reason and keeps the Canvas fallback visible.
- The renderer is intentionally static: no glyph-body animation, combat promotion, Slug shader vendoring, band traversal optimization, or production layout path yet.

## WGSL Animated Glyph Renderer

The `WGSL Animated Glyph Renderer` section is updated through Slice 7G plus the first multi-font review pass. It proves continuous word-body glyph motion plus bounded runtime Bezier/contour deformation without changing source glyph assets.

- Transform presets: `POW force wave`, `WHIFF ribbon`, `BLOCK plate`, `Finisher curl`, and `Mob pressure stress`.
- Deformation review presets: `POW rubber smear`, `BAM impact dent`, `POW crash dent`, `WHIFF ribbon bend`, `BLOCK accordion plate`, `CRACK spiky fracture`, `WHAM corkscrew exit`, `POW wormhole zoom in`, `POW wormhole unfold`, `POW letter twist shrink`, and `POW flow ripple`.
- The wormhole/ripple review presets also have direct shortcut buttons beside the animated preset dropdown (`Worm In`, `Worm Out`, `Twist`, `Ripple`) so they are visible even if the native browser dropdown is cramped.
- Canvas and WebGPU use the same selected-font contours, same controller output, and the same runtime-deformed `GlyphBody` frame data.
- Animated instance data includes glyph transform, opacity, fill color, curve segment range, and debug bounds.
- The WebGPU shader maps screen pixels back into glyph-local space and uses even-odd parity fill against the glyph's local curve range.
- Controls cover play/pause, restart, scrub, playback speed, glyph bounds, phase label, flow-vector overlay, deformation mode/strength, original ghost, deformed bounds, GPU status, and stress count.
- Slice 7D keeps phase labels as derived review metadata, but motion is generated by a fixed-step simulated word body with velocity, drag, cohesion, reveal, readable hold, scatter, and fade.
- Slice 7E makes `1.5x` the default review speed and routes the eight sample-card typography scenes through the same controller/glyph-instance path, while leaving their scene drawings, lane guides, wipe/ring/bloom effects, and Canvas fallback intact.
- Slice 7F deforms runtime copies of the glyph contours only. The generated JSON assets remain unchanged, and turning deformation off restores the Slice 7E transform-only look.
- The wormhole zoom-in preset keeps `POW!` readable first, then pulls each letter's contour points into a bounded per-letter spiral until it collapses to nothing.
- The wormhole unfold preset starts from a compact twisted shape, opens each letter back into readable word form, then holds the word instead of immediately dissolving it.
- The letter twist shrink preset is the cleaner comparison pass: letters collapse one at a time, each glyph twists around its own center, and individual points rotate by slightly different amounts so the letter deforms inward instead of pulsing in/out.
- The flow ripple preset keeps the word intact while a larger, slower bounded distortion front travels through each glyph, creating a pressure-wave shimmer without collapsing the letters.
- The crash dent preset is the stronger cave-in counterpart to `impact_dent`: it pops into a mostly settled word quickly, then takes an `up_right` lower-left-to-upper-right crumple hit, tumbles, and fades. The dent sends a deterministic chain through the glyph body with large per-point shove variation plus velocity-like aftershock, while clamps keep counters and centerline placement readable.
- `POW force wave` is the current reference: P/O/W reveal in order, the full word reads, then one exit-side impulse carries it into late scatter.
- `WHIFF ribbon` rides one smooth airy miss rail with high drag and late separation; it avoids rebound, spring bob, and scale pop.
- `BLOCK plate` uses wider tracking plus a black outline-underlay instance so yellow block text stays readable without letter overlap.
- `Finisher curl` keeps curl/torque layered into the same outward motion; `BLOCK plate` is the one preset allowed to feel briefly locked before rebounding.
- True stroke geometry, sampled auto-contrast/background inversion, knockout, combat promotion, source glyph editing, and Slug-style band traversal are still deferred.
