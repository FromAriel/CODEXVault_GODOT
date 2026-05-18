# VicVec User Guide

VicVec is a canvas-first game vector scene and animation author. It is meant to help game developers make usable vector packs quickly without becoming a full Illustrator or Inkscape replacement.

The most important rule:

**Edit Rest changes the real vector art. Animate writes sparse keyed poses over that art.**

## What VicVec Edits

A VicVec pack is built from:

- **Shapes**: named objects with tags, style, and z order.
- **Loops**: paths inside shapes. Loops have roles such as `outer`, `cutout`, `detail`, `hitZone`, and `effectZone`.
- **Points**: anchors inside loops. Points may have relative `in` and `out` Bezier handles.
- **Animation clips**: sparse graph keys that pose loops, points, handles, and style over time.

Static exports remain Duhrng v1-compatible by default. Graph animation export is explicit.

## Interface Map

- **Top bar**: File actions, Undo/Redo, Edit Rest / Animate, Auto Key, Manual, and Export.
- **Left rail**: Point, Path Select, Move, Brush, Lasso, Pick Fill, and Pick Stroke.
- **Canvas**: the primary surface for drawing and posing.
- **Right inspector**: Object, Loop, Style, Tools, Anim, and Pack panels.
- **Bottom timeline**: clip selection, playback, scrub time, FPS snap, preview, rows, and keys.

## Edit Rest vs Animate

Use **Edit Rest** when you want to change the source art:

- draw or delete points
- move points or whole loops as permanent geometry
- clean, optimize, scale, or rotate geometry
- change shape metadata, roles, tags, fill, stroke, and z order

Use **Animate** when you want motion or keyed style changes:

- move whole loops as `loop.transform`
- move points as `point.positionDelta`
- move handles as `point.inHandleDelta` or `point.outHandleDelta`
- brush points as sparse point deltas
- key fill, stroke, stroke width, or opacity

When **Auto Key** is on, canvas edits in Animate mode write keys at the playhead. Rest geometry should remain unchanged while you scrub or play.

## Quick Start: Static Vector Pack

1. Stay in **Edit Rest**.
2. Optional: open a source image from the Pack panel.
3. Use **Point** to place anchors. Click the first point again to close a loop.
4. Use the **Loop** panel to set role and loop id.
5. Use the **Object** panel to set shape id, label, tags, and z order.
6. Use the **Style** panel to set fill, stroke, and stroke width.
7. Use **Export v1** for the compatibility-safe Duhrng pack.

## Selecting And Editing

- **Point**: click a point to select it. Shift-click toggles point selection. Clicking empty canvas adds a point.
- **Path Select**: click a filled loop to select it. Shift-click toggles loops.
- **Lasso**: selects multiple points inside selected paths.
- **S + Lasso**: selects all filled paths under the lasso.
- **Move**: selected points move first. If no points are selected, selected paths move.
- **Brush**: affects all points under the cursor by default, even across shapes. Enable **Selected Only** to scope the brush.

## Cleanup And Optimization

Use the small cleanup tools for conservative repair:

- **Remove Near-Duplicates** removes consecutive points that are almost on top of each other.
- **Simplify Straight** removes middle points that barely change a straight segment.
- **Close Gap** snaps a tiny open gap and closes the loop.
- **Reverse** reverses point order while preserving curve continuity.

Use **Optimize Path** when you want aggressive point reduction. It samples the current path, fits fewer Bezier anchors, previews the candidate, and only changes geometry when you click Apply.

## Transform And Brush

**Transform Selection** previews scale and rotation before applying to rest geometry. Choose an origin from Selection Center, Active Loop Center, Canvas Center, or Custom. Pick Origin lets you set the custom point from the canvas.

**Falloff Brush** moves points under the cursor by drag delta:

- Radius controls the area of influence.
- Strength controls total movement.
- Falloff controls soft edge behavior.
- Pinch concentrates movement toward the center.
- Bubble lifts the middle band of the falloff curve.
- Affect Handles also sculpts handle vectors.
- Selected Only limits the brush to selected paths or the active loop.

In Edit Rest, Brush rewrites geometry. In Animate, Brush writes point-delta keys.

## Animation Workflow

This is the safe hand-authored flow:

1. Select the loop or points you want to animate.
2. Open the **Anim** panel.
3. Click **Add** to create a clip.
4. Click **Add Track**. This enters Animate mode and creates graph rows for the selection.
5. At `0ms`, click **Set Key** or **Rest Key Selected**.
6. Move the playhead to a later time.
7. Pose directly on the canvas with Move, Brush, handles, or style fields.
8. Click **Set Key** when you use numeric fields, or when you want to confirm the selected row.
9. Scrub or press Play to preview.
10. Use **Export Graph v2** when you want the sparse animation contract.

Graph animation stores only changed outputs. It does not export every frame.

## Export Modes

- **Export v1**: safest static Duhrng-compatible pack. It omits schema-v2 graph animation.
- **Save JSON**: saves the current export mode from the export drawer.
- **Export Graph v2**: explicit sparse animation export for runtime handoff.

Editor-only state is never exported: selections, tool mode, source opacity, brush settings, optimization preview, transform preview, pose preview, playhead time, FPS, snap, open drawers, and UI layout.

## Troubleshooting

### Animation changed my real points

You were probably editing in Edit Rest. Use Animate mode for motion. Add Clip and Add Track now enter Animate mode automatically.

### Nothing plays

Check that:

- a clip is selected
- timeline Preview is on
- graph rows exist
- keys exist at more than one time
- Auto Key is on when posing from the canvas

### The start pose does not come back

Set a rest key at `0ms`, or use **Rest Key Selected** before posing later frames.

### Brush moved too much

Lower Radius or Strength. Enable Selected Only if you only want selected paths or the active loop to move.

### Export does not include animation

Use **Export Graph v2**. The default v1 export intentionally stays compatibility-safe and omits schema-v2 graph animation.

### Duhrng ignores graph animation

Use the v1 export for static runtime compatibility until Duhrng's schema-v2 graph evaluator is active.

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

