# VicVec User Guide

VicVec is a canvas-first game vector scene and animation author. It is built for making Duhrng-ready vector packs quickly, not for becoming a full Illustrator or Inkscape replacement.

The most important rule:

**Edit Rest changes the real source art. Animate writes sparse posed keys over that art.**

## What VicVec Edits

A VicVec pack is built from:

- **Shapes**: named objects with tags, style, and z order.
- **Loops**: paths inside shapes. Loops have roles such as `outer`, `cutout`, `detail`, `hitZone`, and `effectZone`.
- **Points**: anchors inside loops. Points may have relative `in` and `out` Bezier handles.
- **Animation clips**: sparse graph keys that pose loops, points, handles, and style over time.

Static exports remain Duhrng v1-compatible by default. Graph animation export is explicit and runtime-gated until Duhrng evaluates schema-v2 graph animation.

## Interface Map

- **Top bar**: File actions, Undo/Redo, Edit Rest / Animate, Auto Key, Manual, and Export.
- **Left rail**: Point, Path Select, Move, Brush, Lasso, Pick Fill, and Pick Stroke.
- **Canvas**: the primary surface for drawing rest art and posing animation.
- **Right inspector**: Object, Loop, Style, Tools, Anim, and Pack panels.
- **Bottom timeline**: clip selection, playback, scrub time, FPS snap, preview, rows, and keys.

## Edit Rest vs Animate

Use **Edit Rest** when you want to change the source art:

- draw or delete points
- move points or whole loops as permanent geometry
- clean, optimize, group, separate, or merge loops
- change shape ids, labels, tags, loop ids, roles, and z order
- apply rest transforms when you want the base art itself to change

Use **Animate** when you want motion or keyed style changes:

- move whole loops as `loop.transform`
- move points as `point.positionDelta`
- move handles as `point.inHandleDelta` or `point.outHandleDelta`
- brush points as sparse point-delta keys
- scale or rotate selected loops/points with Transform Selection
- key fill, stroke, stroke width, or opacity

When **Auto Key** is on, canvas edits in Animate mode write keys at the playhead. Rest geometry stays unchanged while you scrub or play. When Auto Key is off, canvas posing is blocked instead of silently changing rest art.

## Tool Policy

**Rest-only tools and actions** work in Edit Rest and are blocked or disabled in Animate:

- shape and loop structure: add, duplicate, delete, reorder, open, close, clear
- metadata: shape id, label, tags, z, loop id, loop role, tag presets
- organization: group, separate, merge into active
- cleanup and optimization: remove near-duplicates, simplify straight, close gap, reverse, optimize path
- destructive point actions: delete points and clear rest handles

**Animate-keyable tools and fields** write graph keys in Animate:

- Move selected loops or points
- Brush affected points
- Drag point handles or Alt-drag out handles
- Transform Selection preview/apply for selected loops or points
- Style fields for fill, stroke, and stroke width

**View-only or session-only controls** do not export editor state:

- selection, lasso selection, scrub/play, timeline zoom, FPS, snap, source image opacity, export drawer, source preview, previews, and active tool mode

## Quick Start: Static Vector Pack

1. Stay in **Edit Rest**.
2. Optional: open a source image from the Pack panel.
3. Use **Point** to place anchors. Click the first point again or use **Close** to close a loop.
4. Use the **Loop** panel to set role and loop id.
5. Use the **Object** panel to set shape id, label, tags, and z order.
6. Use the **Style** panel to set fill, stroke, and stroke width.
7. Use **Export v1** for the compatibility-safe Duhrng pack.

## Selecting And Editing

- **Point**: click a point to select it. Shift-click toggles point selection. Clicking empty canvas adds a point in Edit Rest.
- **Path Select**: click a filled loop to select it. Shift-click toggles loops.
- **Lasso**: selects multiple points inside selected paths. Hold **S** while using Lasso to select all filled paths under the lasso.
- **Move**: selected points move first. If no points are selected, selected paths move.
- **Brush**: affects all points under the cursor by default, even across shapes. Enable **Selected Only** to scope the brush.

In Animate mode, visible posed points and handles are the editable reality. If a loop is animated away from its rest position, hit testing, lasso, handles, and brush target the displayed posed geometry and write graph keys back to the correct rest ids.

## Cleanup, Optimization, Transform, And Brush

Use cleanup for conservative rest-art repair:

- **Remove Near-Duplicates** removes consecutive points that are almost on top of each other.
- **Simplify Straight** removes middle points that barely change a straight segment.
- **Close Gap** snaps a tiny open gap and closes the loop.
- **Reverse** reverses point order while preserving curve continuity.

Use **Optimize Path** when you want aggressive point reduction. It samples the current path, fits fewer Bezier anchors, previews the candidate, and only changes rest geometry when you click Apply in Edit Rest.

**Transform Selection** previews scale, rotation, and origin choices before Apply:

- In **Edit Rest**, Apply rewrites base geometry.
- In **Animate**, Apply writes graph keys at the playhead and leaves rest geometry alone.

**Falloff Brush** moves points under the cursor by drag delta:

- In **Edit Rest**, Brush rewrites geometry.
- In **Animate**, Brush writes sparse point-delta keys.
- Radius controls area, Strength controls movement, Falloff controls softness, Pinch concentrates toward center, Bubble lifts the middle band, and Affect Handles also sculpts handle vectors.

## Animation Workflow

This is the safe hand-authored flow:

1. Select the loop or points you want to animate.
2. Open the **Anim** panel.
3. Click **Add** to create a clip.
4. Click **Add Track**. This enters Animate mode and creates graph rows for the selection.
5. At `0ms`, click **Set Key** or **Rest Key Selected**.
6. Move the playhead to a later time.
7. Pose directly on the canvas with Move, Brush, Transform Selection, handles, or style fields.
8. Scrub or press Play to preview.
9. Use **Export Graph v2** when you want the sparse animation contract.

Graph animation stores only changed outputs. It does not export every frame.

## Export Modes

- **Export v1**: safest static Duhrng-compatible pack. It omits schema-v2 graph animation.
- **Save JSON**: saves the current export mode from the export drawer.
- **Export Graph v2**: explicit sparse animation export for runtime handoff.

Stable loop and point ids may remain in exports so animation targets can resolve reliably. Editor-only state is never exported: selections, tool mode, source opacity, brush settings, optimization preview, transform preview, pose preview, playhead time, FPS, snap, open drawers, and UI layout.

## Troubleshooting

### Animation changed my real points

Undo, switch to Animate, and pose again. Add Clip and Add Track enter Animate mode automatically. Rest-only controls are disabled or blocked in Animate so they cannot silently rewrite source art.

### Nothing plays

Check that:

- a clip is selected
- timeline Preview is on
- graph rows exist
- keys exist at more than one time
- Auto Key is on when posing from the canvas

### The start pose does not come back

Set a rest key at `0ms`, or use **Rest Key Selected** before posing later frames.

### The points are not where I expect

In Animate mode, points and handles appear at the evaluated pose for the current playhead time. Scrub to `0ms` to see the rest pose, or switch to Edit Rest to edit base art.

### Brush moved too much

Lower Radius or Strength. Enable Selected Only if you only want selected paths or the active loop to move.

### Export does not include animation

Use **Export Graph v2**. The default v1 export intentionally stays compatibility-safe and omits schema-v2 graph animation.

### Duhrng ignores graph animation

Use the v1 export for static runtime compatibility until Duhrng's schema-v2 graph evaluator is active.

## Verification / Developer Checks

- `npm test`: runs the core and history tests.
- `npm run test:browser`: runs browser smoke tests for the previously broken scrub, pose, hit-test, transform, and export workflows.
- `npm run check`: runs syntax checks, core tests, and browser smoke tests.

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Point tool | `1` or `P` |
| Path Select | `2` |
| Move | `3` or `M` |
| Brush | `4` or `B` |
| Lasso | `5` or `L` |
| Fill/path highlight | Hold `S` |
| Reveal paths | Hold `G` |
| Nudge selection | Arrow keys |
| Larger nudge | Shift + Arrow |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl + Y or Ctrl/Cmd + Shift + Z |
