Perfect, that helps narrow it: **3D from day one, GPU from day one, platformer camera**. We’ll treat everything we wrote before as “drafts” and merge them into one maximal, brutally concrete plan, updated with modern PBD/XPBD + GPU tricks.

I’ll break this into:

1. **Goals & constraints (very explicit)**
2. **Core simulation approach (XPBD-style unified particle solver)**
3. **Data layout & memory model (Rust + wgpu-friendly)**
4. **GPU simulation pipeline (compute passes + tricks)**
5. **3D metaball rendering pipeline**
6. **ECS & game integration**
7. **Optimization / scaling tricks inspired by existing projects**
8. **Step-by-step roadmap (what you actually implement in what order)**
9. **Risk / feasibility snapshot**

---

## 1. Goals & constraints

### 1.1 What you’re actually building

* **Game type**: 3D platformer with a *mostly fixed / guided camera* (side-scroller-ish but in full 3D).
* **Simulation focus**:

  * Enemies are **soft-bodied creatures** made of metaball-like blobs.
  * They **bounce, squish, stretch**, and **explode into splats** on walls/floors.
* **Performance target (rough)**:

  * ~**100 enemies visible**.
  * Each enemy: **50–500 particles** (some “hero” enemies up to ~2–3k).
  * Target: **60–120 FPS** on a modern midrange GPU.
* **Tech stack**:

  * **Rust** + **wgpu** + **WGSL**.
  * Some ECS library (`bevy_ecs` / `hecs` / `legion`) or custom ECS.
  * `glam` for math.

### 1.2 Non-goals (for now)

* No general-purpose rigid-body engine at first (just simple colliders / kinematic level geometry).
* No fully coupled fluids (jellies behaving like water) yet.
* No fully tetrahedral FEM like PhysX soft bodies; we’ll use particle/constraint-based methods which are standard for game-y soft bodies.([NVIDIA Omniverse][1])

---

## 2. Core simulation approach

We base the core on **XPBD-style particle-based soft bodies**, inspired by:

* **Position-Based Dynamics (PBD)** + **Extended Position-Based Dynamics (XPBD)**, which are widely used for real-time deformables in games and VR because they’re stable and controllable. ([Mmacklin][2])
* **Unified particle physics frameworks** (NVIDIA FleX / Unified Particle Physics), where *everything* is particles + constraints (fluids, cloth, soft, rigid). ([NVIDIA Docs][3])
* GPU-optimized PBD/XPBD implementations that use **graph coloring**, **parallel constraint batches**, and **uniform grids** for neighbor search. ([Chalmers Publication Library (CPL)][4])

### 2.1 Representation choice

You have two main families:

1. **Particle cloud with shape-matching + distance/volume constraints**
2. **Tetrahedral mesh (FEM-like) with XPBD constraints for edges/tets**([GitHub][5])

For your case (goo monsters, metaball visuals, not surgical-grade accuracy), **particle cloud + shape matching** is ideal:

* Natural metaball representation (each particle == blob).
* Simple to author from SDFs or volumes.
* Plays nicely with unified metaball rendering (no separate high-res target mesh needed).
* You can *later* add optional tetra-style volume constraints for heroes if needed.

We’ll design around **particle clouds** and borrow stability tricks from XPBD/FleX.

---

## 3. Data layout & memory model (Rust + wgpu)

### 3.1 Particles (GPU / SoA)

Global particle pool, SoA, GPU storage buffers:

* `positions_curr : [vec4]`

  * xyz = world-space position
  * w   = radius
* `positions_pred : [vec4]`

  * Predicted positions after integration.
* `velocities     : [vec4]`

  * xyz = velocity, w = maybe temp (e.g. inverse mass or damping).
* `rest_pos_local : [vec4]`

  * xyz = local-space rest position.
* `body_id        : [u16]`
* `material_id    : [u16]`
* `flags          : [u16]`

  * bits: BOUND / DETACHED / SPLAT / FROZEN / etc.
* `stress         : [f32]` (optional, or pack in w of velocities)

Use *one big pool* instead of per-body buffers to reduce bind overhead and simplify compute dispatch, as also recommended in GPU mass-spring and particle projects (they favor SSBOs with big arrays of Mass/Spring). ([jw0z96.github.io][6])

**Rust side**: mirror the layouts with `#[repr(C)]` structs and `bytemuck::Pod` or similar so you can copy directly into buffers.

### 3.2 Soft bodies (per-body data)

`SoftBody` (GPU or small storage buffer):

* `particle_start : u32`
* `particle_count : u32`
* `rest_com       : vec3`
* `stiffness      : f32` (shape matching)
* `distance_stiffness : f32`
* `volume_stiffness   : f32`
* `damping           : f32`
* `gravity_scale     : f32`
* `fracture_threshold: f32`
* `max_stretch       : f32`
* `state_flags       : u32` (ALIVE / EXPLODING / DEAD / etc.)

### 3.3 Constraints / adjacency

Precomputed **constraint graph** per body, stored in flattened arrays:

* `edges : [u32; 2]` pairs of particle indices (distance constraints).
* `edge_rest_length : f32`
* `edge_stiffness   : f32` (allows per-edge stiffness).
* `edge_body_id     : u16`

Optional volume/cluster constraints later.

We’ll also need some property like **graph-color batches** per constraint set if you want more parallel stability (see GPU PBD papers that split constraints into independent partitions). ([Chalmers Publication Library (CPL)][4])

### 3.4 Spatial grid

Buffers:

* `grid_keys        : [u32]` (packed `cell_id`, `particle_index` or separate arrays)
* `grid_sorted_ids  : [u32]` (particle index per sorted entry)
* `grid_cell_start  : [u32]` (per cell)
* `grid_cell_end    : [u32]` (per cell)

Uniform/hashing scheme as in NVIDIA’s grid-based neighbor search for particles. ([NVIDIA Developer Forums][7])

### 3.5 Command & result buffers (CPU↔GPU interface)

**Command buffer (CPU → GPU, per frame):**

* Body-level commands:

  * impulses (e.g. jump, hit recoil)
  * parameter changes (stiffness, gravity_scale)
  * spawn/despawn requests
* Optional per-particle commands (rare; try to keep this small).

**Result buffer (GPU → CPU, per frame):**

* Per body:

  * `body_id`
  * `com : vec3`
  * `avg_orientation : quat` (if you compute approximate orientation from particles or shape-matching transform)
  * aggregated `damage`, `max_stress`, etc.

**Splat event buffer (GPU → CPU):**

* `position : vec3`
* `normal   : vec3`
* `body_id  : u16`
* `material_id : u16`
* `energy   : f32`

Small fixed-sized ring buffer; if it overflows you can drop some events (visual only).

---

## 4. GPU simulation pipeline (3D XPBD-style)

We use **PBD/XPBD on the GPU** with techniques from unified particle physics and GPU PBD implementations: constraint batches, uniform grid neighbors, and multi-substep integration. ([Mmacklin][8])

### 4.1 Core loop shape (per frame)

Let `dt_frame` be the frame delta. We’ll use **substeps** and do **1 XPBD iteration per substep**, as suggested in “Small Steps in Physics Simulation” for better convergence and GPU-friendliness. ([Mmacklin][9])

**High-level:**

For each graphics frame:

1. Upload `command_buffer`.
2. For `s` in `0..num_substeps`:

   1. Apply forces + integrate to predicted positions (`dt = dt_frame / num_substeps`).
   2. Build or update the spatial grid (maybe once per substep or every few substeps).
   3. Solve constraints (shape matching, distance, collisions) **once**.
   4. Update velocities from position deltas.
3. Generate fracture & splat events, finalize positions.
4. Aggregate per-body COM/orientation into `result_buffer`.

### 4.2 Pass breakdown

**1. Apply commands & external forces**

Compute shader: one thread per particle.

* For each body command:

  * Write to a small per-body param buffer or apply an impulse (either as direct velocity change or as a force buffer).
* For each particle:

  * `vel += gravity * gravity_scale * dt + applied_impulses/mass`
  * `positions_pred = positions_curr + vel * dt`

**2. Build/update spatial grid**

Compute shader(s):

* `build_grid_keys`:

  * For each particle:

    * cell coordinate = floor(pos / cell_size)
    * `cell_id = hash(cell_coord)`
    * write `(cell_id, particle_index)` into `grid_keys`.
* `sort_grid_keys`:

  * Radix sort or similar parallel sort.
* `build_cell_ranges`:

  * Walk sorted `grid_keys` to fill `grid_cell_start/end` for each occupied cell.

This follows classical GPU particle neighbor search used in NVIDIA samples and HOOMD-like tools. ([NVIDIA Developer Forums][7])

**3. Constraint solving (XPBD)**

We run this once per substep; internally it may have mini-batches or graph-colored passes for distance constraints, but we’ll keep the first version simple.

a) **Shape matching per body**

* One workgroup per body or per body-chunk.
* For all particles in that body:

  * Compute COM and covariance matrix.
  * Compute rotation (`R`) that best maps `rest_pos_local` to current predicted positions (classic shape matching).([ResearchGate][10])
  * Compute goal positions: `goal = body_com + R * rest_pos_local`.
  * XPBD style: move predicted positions towards `goal` using compliance `α`:

    * `delta = goal - x_pred`
    * `x_pred += stiffness * delta` (or full XPBD formula with λ if you want physically meaningful compliance).
* This keeps the global shape (horse/donut) recognizable while allowing squish.

b) **Distance constraints**

* For each edge (particle i, j):

  * Get `x_i`, `x_j`, rest length `L`.
  * Compute constraint `C = |x_j - x_i| - L`.
  * Solve XPBD distance constraint, adjusting `x_i` and `x_j` along the line between them, based on masses and compliance. ([Matthias Research][11])

You can:

* In **v1**: just do a Jacobi-ish pass (each edge reads/writes positions in a double-buffered way).
* In **v2**: use **graph coloring** to batch non-conflicting constraints and allow in-place Gauss–Seidel style updates, following GPU PBD papers. ([Chalmers Publication Library (CPL)][4])

c) **Self-collision & inter-body contact**

Using grid:

* For each particle:

  * Identify cell and neighboring cells.
  * For each neighbor within range:

    * If distance < (r_i + r_j), push them apart along the normal.
    * Optionally treat same-body vs other-body differently.

You can model this as XPBD constraints as well (contacts), or simpler “penalty” position corrections.

d) **World collisions**

* For each particle:

  * Sample environment collider:

    * For early:

      * Simple shapes: ground plane, boxes, capsules.
      * Later: a signed distance field (SDF) for more complex rocks/level geometry.
  * If SDF < 0 or intersection with analytic shape:

    * Push particle out; accumulate `impact_magnitude` and add to `stress` accumulator.

**4. Update velocities & stress / fracture**

Compute shader:

* For each particle:

  * `v_new = (x_pred - x_curr) / dt`
  * `v_new *= (1.0 - damping)`
  * `x_curr = x_pred`
  * Update `stress` based on how much constraints were violated or clamped.
  * If `stress > fracture_threshold`:

    * Set flag `DETACHED`, optionally remove edges in adjacency (or mark them inactive).

**5. Detached & splat events**

Compute shader:

* For each **detached** particle:

  * Integrate as simple ballistic with collisions (still using grid + world).
  * If colliding with static world and impact speed > splat threshold:

    * Append a `SplatEvent` to `splat_event_buffer` using atomics.
    * Optionally:

      * Mark particle as `SPLAT` and stop simming it.
      * Or recycle into a “goo puddle” representation.

**6. Aggregate per-body results**

Compute shader:

* For each body:

  * Recompute COM from its particles (or reuse shape-matching COM).
  * Optionally approximate orientation via best-fit rotation or from a designated body frame.
  * Summarize `max_stress`.
  * Write to `result_buffer`.

CPU reads `result_buffer` and `splat_event_buffer` once per frame (small, fixed size): no full particle readback.

---

## 5. 3D metaball rendering pipeline

We want 3D from the start, but we can still use robust, real-time metaball rendering techniques. A good reference is the **point-based visualization of metaballs** in GPU Gems 3, where the implicit surface is represented by particles and rendered as a smooth surface at interactive rates. ([NVIDIA Developer][12])

### 5.1 Baseline: 3D world, screen-space metaball surface

You have a real 3D world and camera. The metaball field is defined by particles in 3D; we **render in screen space**:

1. **Depth & thickness pass**

   * Render each particle as a sphere mesh (could be a low-poly icosphere) or view-aligned billboard, but still placed in 3D.
   * For each fragment:

     * Write **scene depth** normally (if you want metaballs to occlude other objects).
     * Accumulate **thickness** in a separate RT (additive blending), representing how much goo is along the view ray.

2. **Blur thickness**

   * Separable blur (horizontal + vertical) on the thickness buffer to merge blobs smoothly.
   * This merges overlapping spheres into a continuous field.

3. **Reconstruct normals & surface mask**

   * From blurred thickness (and/or depth) compute screen-space gradient → approximate normals.
   * Use thickness threshold to decide “inside goo” vs outside.

4. **Shading pass**

   * For each pixel where thickness > threshold:

     * Compute color based on body/material ID (creature type).
     * Use normals + depth to do standard PBR-ish or stylized shading (jelly, subsurface-y).
   * Combine with rest of scene via composition (alpha blending, or treat as opaque if desired).

This approach:

* Works with your 3D camera and environment.
* Avoids the cost of generating marching-cubes meshes every frame.
* Scales to many particles, as shown by particle-based metaball rendering techniques. ([NVIDIA Developer][12])

### 5.2 Option B (later): raymarching SDF in 3D

* Build a 3D grid of scalar field values by summing metaball contributions.
* Raymarch along view rays until you find an iso-surface.
* Pros: more precise surfaces, easy to get internal effects.
* Cons: heavy; probably best reserved for hero cutscenes or special effects.

### 5.3 Option C (later): marching cubes / meshes

* For hero characters only:

  * Run marching cubes in a 3D grid tightly bounding the body (in compute).
  * Output triangle mesh and render with normal pipeline.
* Inspired by GPU XPBD implementations that use tetrahedral simulation mesh and then apply deformation to a high-res render mesh. ([GitHub][13])

For now, use **screen-space metaball shading** with 3D positions as your baseline.

---

## 6. ECS & game integration (3D platformer flavoured)

### 6.1 ECS components

* `SoftBodyHandle`

  * `body_id : u16`
* `SoftBodyParams`

  * overrides for stiffness/damping/gravity per entity.
* `Transform`

  * world-space transform (position from COM, rotation from shape-matching).
* `AIState / Behavior`

  * for the platformer enemies (patrol, jump, chase).
* `SoftBodyHealth`

  * HP; maybe tie fracture thresholds to health.
* `SplatterDecal`

  * pos, normal, color, size, lifetime.

### 6.2 Frame ordering in the engine

Each frame:

1. **Input / AI / Behavior Systems**

   * Use player input, AI logic, etc., to decide:

     * Which jelly jumps.
     * Who gets hit by bullets.
     * New forces/impulses.

2. **Soft-body command build**

   * Iterate entities with `SoftBodyHandle`:

     * Convert gameplay events into `Command` entries in the CPU-side buffer:

       * e.g. “apply impulse to body_id X”, “increase softness for 0.2s”.
   * Upload/update `command_buffer` to GPU.

3. **GPU simulation dispatch**

   * Submit compute passes for substeps.
   * This may run on asynchronous compute queues overlapping with rendering if your hardware + wgpu backend cooperate.

4. **Result harvest**

   * Map `result_buffer` + `splat_event_buffer` (small) after GPU completes sim for the frame.
   * For each `BodyResult`:

     * Update ECS `Transform` (position & orientation).
   * For each `SplatEvent`:

     * Spawn `SplatterDecal` entity:

       * That gets rendered as a decal or small local metaball smear.

5. **Rendering**

   * Build render lists, using `SoftBodyHandle` to know which bodies are active and in view.
   * Run metaball rendering passes; then world geometry, UI, etc.

---

## 7. Optimization & scaling tricks, informed by existing work

Here’s where we bring in “bare metal” tricks from FleX, XPBD research, GPU mass-spring work, etc.

### 7.1 XPBD & small steps vs many iterations

* Recent work suggests that using **more substeps with a single XPBD iteration each** can be competitive with sophisticated global solvers, and is easier to parallelize and stabilise. ([Mmacklin][9])
* Benefits:

  * Constraint solving is simpler: one pass per substep per constraint type.
  * Easier to avoid divergence in compute shaders.
* Plan:

  * For gameplay ~60 FPS:

    * `dt_frame ≈ 1/60`.
    * `num_substeps = 2–4` (tunable).
    * `1` XPBD iteration per substep.

### 7.2 Graph coloring / constraint batching

* GPU PBD implementations often **partition constraints** into batches, such that constraints within a batch don’t share particles (no write conflicts), allowing in-place updates. ([Chalmers Publication Library (CPL)][4])
* You can:

  * Precompute color IDs for distance constraints offline.
  * Solve constraints in sequence of batches: `batch0`, `batch1`, etc., each in a separate compute dispatch or inside a loop in one dispatch.

### 7.3 Unified solver vs separate systems

* FleX uses a **unified particle representation**: all soft, fluid, cloth, etc., share the same solver with different constraint types, which keeps the implementation simple and interactions seamless. ([NVIDIA Docs][3])
* For you:

  * Initially only soft bodies + maybe some simple detach-splatter.
  * But if you later add goo puddles / liquids, you can reuse the same solver.

### 7.4 Buffer and memory tricks

* Use **SSBO-like storage buffers** (which wgpu maps to native GPU equivalents) with SoA layout; this pattern is used successfully to get 1.5M springs at real-time rates in mass-spring demos. ([jw0z96.github.io][6])
* Use **persistent buffers**:

  * Don’t recreate / rebind every frame.
  * Use offset ranges for active particles/bodies (simple freelist allocator on CPU).
* Consider **f16 (half) precision** for:

  * Radii, rest positions (local space).
  * Some parameters, especially for far LOD bodies.

### 7.5 Culling & LOD for platformer

You’re in a **directed 3D level**, not an open world; you can exploit that:

* **Simulation LOD**:

  * Bodies far from camera or occluded:

    * Lower particle count shapes.
    * Fewer substeps.
    * Or temporarily freeze if totally offscreen and not relevant.
* **Rendering LOD**:

  * Distant jellies:

    * Render as simple meshes (prebaked wobble animation) instead of metaballs.
    * Or use low-res thickness buffers.

### 7.6 Collision simplifications

* For platformer-like levels, you can represent environment as:

  * A set of analytic colliders (planes, boxes, capsules).
  * A coarse SDF volume baked offline.
* XPBD & PBD frameworks often use SDFs for robust collision. ([Animation RWTH Aachen][14])

---

## 8. Step-by-step roadmap (maximal detail, 3D + GPU from the start)

I’ll break this into phases. Phases are meant as *real dev milestones* you can check off.

### Phase 0 – Core scaffolding (Rust + wgpu + ECS)

**Goal**: A 3D app with a camera and a basic compute shader that can read/write a buffer, plus ECS loop.

**Tasks:**

1. Create workspace with crates:

   * `engine_core` (entry point, main loop)
   * `gfx` (wgpu device/queue/swapchain)
   * `ecs_core` (ECS of choice)
   * `softbody_sim` (GPU sim module)
   * `rendering` (pipelines)
2. Initialize `wgpu`:

   * Request adapter, device, queue.
   * Create swapchain surface, format, depth buffer.
3. Implement **one simple compute shader**:

   * Takes a buffer of floats, adds 1.0 to each; write back.
   * Dispatch and verify buffer contents on CPU.
4. Create a **simple 3D scene**:

   * Basic perspective camera.
   * Draw a cube on the screen (just to check transforms).

**Exit criteria:**

* You have a 3D camera + cube rendering.
* You can run a compute shader and read back results.

---

### Phase 1 – 3D particle storage + trivial GPU integration

**Goal**: 3D particles updated by compute, rendered as points/spheres in 3D.

**Tasks:**

1. Implement **global particle buffers** as described in data layout.
2. Write compute shader `integrate_particles`:

   * Inputs: `positions_curr`, `velocities`, global `dt`, `gravity`.
   * Output: `positions_curr` updated.
3. Render particles:

   * As instanced spheres or camera-facing billboards.
   * Use `positions_curr` as instance buffer or storage buffer (via vertex shader fetch).
4. Create a **test scene**:

   * 1–3 blobs of 100 particles each, initial positions arranged in a cluster.
   * Apply gravity; they just fall and pass through the floor for now.

**Exit criteria:**

* You see clouds of spheres in 3D, falling under gravity.
* All simulation steps are done on GPU.

---

### Phase 2 – Spatial grid & neighbor search (3D)

**Goal**: Build GPU uniform grid neighbor search in 3D.

**Tasks:**

1. Choose **cell size** ~ slightly larger than maximum interaction radius.
2. Implement grid building:

   * `build_grid_keys` compute pass (per particle).
   * `sort_grid_keys` (GPU radix sort; you can port a standard algorithm or borrow from examples).
   * `build_cell_ranges` compute pass.
3. Debug visualization:

   * Draw bounding boxes of occupied cells as debug lines.
   * Optionally color code cells with number of particles.
4. Implement a simple **debug neighbor query**:

   * For each particle, count neighbors within a small radius via grid.
   * Store neighbor count in a buffer.
   * Color particles by neighbor count when rendering.

**Exit criteria:**

* Neighbor counts look sane (dense clusters show high counts).
* Grid cell debug visualization matches where particles are.

---

### Phase 3 – Add XPBD distance constraints (jelly blobs)

**Goal**: Get **soft, squishy blobs** in 3D that maintain rough shape via distance constraints.

**Tasks:**

1. Offline or in-code:

   * For a test shape (sphere or cube):

     * Sample ~100–300 particles in volume.
     * Build adjacency:

       * Connect each particle to k nearest neighbors within a radius.
       * Store edges + rest lengths.
2. Implement `solve_distance_constraints` compute pass:

   * XPBD formula for distance constraints (or PBD with simple position correction if you want to keep math light initially). ([Matthias Research][11])
   * Use `positions_pred` double-buffer to avoid race conditions at first.
3. Add simple “gauss-seidel-ish” iterations per frame:

   * For now, do 2–4 iterations per frame *without* substeps, just to get a feel.
4. Combine with integration:

   * Predict positions → solve distance constraints → update velocities.

**Exit criteria:**

* A blob squishes when hitting floor (we’ll add floor collisions next), but retains volume-ish shape (not just scattering particles).
* Internal structure looks coherent.

---

### Phase 4 – 3D world collision + shape matching (recognizable shapes)

**Goal**: Blobs that collide with the ground/walls and hold a meaningful rest shape (horse/donut-ish).

**Tasks:**

1. Implement simple 3D colliders:

   * Ground plane.
   * A few axis-aligned boxes / ramps.
2. `collision_world` pass:

   * For each particle:

     * If below ground: push up, adjust velocity.
     * If inside box: project out along shortest axis.
3. Implement **shape matching** per body: ([ResearchGate][10])

   * For test body:

     * Store `rest_pos_local` for each particle (local shape).
   * In compute:

     * For each body:

       * Compute COM of current predicted positions.
       * Compute covariance matrix between rest and current.
       * Extract best-fit rotation.
       * Compute target positions and blend with predicted.
   * Combine this with distance constraints (shape matching as low-frequency global stiffness, distances as high-frequency local detail).
4. Author a simple **3D “donut” shape**:

   * Sample particles in a torus volume.
   * Use that for shape-matching rest positions.

**Exit criteria:**

* Donut of particles stays donut-shaped when dropped onto the floor, squishing and bouncing but not collapsing into a blob.
* It responds plausibly when colliding with simple 3D world geometry.

---

### Phase 5 – Proper XPBD with substeps + stress/fracture

**Goal**: Stabilize solver and introduce **breakable goo**.

**Tasks:**

1. Rework integration to **substepping**:

   * Choose `num_substeps` (start with 2, maybe 4).
   * For each substep:

     * integrate → grid → constraints → collisions → velocities.
   * Drop iteration count to ~1 per substep (XPBD-friendly). ([Mmacklin][9])
2. Add stress tracking:

   * For each constraint:

     * Track `|C|` (constraint violation).
   * For each particle:

     * Accumulate some measure of local stress (average or max of constraints involving it).
   * Smooth with a decay to avoid spikes.
3. Introduce **fracture rules**:

   * If `stress > fracture_threshold` and body has `health > 0`:

     * Mark some edges as inactive (tear).
     * Mark some particles as `DETACHED` (spawn ballistic goo blobs).

**Exit criteria:**

* Under heavy impact, blobs tear or spray particles instead of just over-stretching.
* Simulation is stable (no explosions) under typical gameplay dt.

---

### Phase 6 – Detached particles & splat events

**Goal**: Jelly pieces fly off and stick to surfaces as splats.

**Tasks:**

1. For `DETACHED` particles:

   * They still have positions/velocities and go through:

     * integration → world collision.
   * Skip shape matching & distance constraints.
2. Splat detection:

   * If detached particle collides with static world:

     * If impact speed > threshold:

       * Write a `SplatEvent` to `splat_event_buffer` (using atomic counter).
       * Mark particle as `SPLAT` or despawn (recycle index later).
3. ECS-side:

   * Read `SplatEvent` buffer.
   * Spawn `SplatterDecal` entities:

     * Store position, normal, color, initial size, lifetime.
4. Rendering:

   * Render splats as:

     * Simple camera-facing quads projected on surfaces, or
     * Small metaballs stuck to the surface (smoothing with thickness pass).

**Exit criteria:**

* When you blast a blob, bits fly off and leave visible splats on walls/floor.
* Splats don’t break performance (bounded events per frame, simple rendering).

---

### Phase 7 – 3D metaball rendering pipeline

**Goal**: Replace “sphere clouds” with proper metaball-look goo surfaces in 3D.

**Tasks:**

1. Thickness pass:

   * Offscreen render target with e.g. R16F.
   * Render each particle as a sphere (instanced mesh):

     * For each fragment:

       * Output contribution (`thickness += f(distance)`) with additive blending.
2. Blur:

   * Horizontal + vertical blur on thickness buffer.
3. Surface mask + normals:

   * Compute gradient of blurred thickness in screen space to get normals.
   * Threshold thickness to know “inside goo.”
4. Goo shading:

   * In final pass:

     * If thickness > threshold:

       * Apply jelly shading (Fresnel, rim, etc.).
   * Early-out if thickness low.

**Exit criteria:**

* Jellies look like continuous blobs, not discrete balls.
* Overlapping pieces merge visually.

---

### Phase 8 – Multiple bodies, complex shapes, LOD

**Goal**: Scale to many creatures and more interesting shapes (horse/slime/donut combo) at decent FPS.

**Tasks:**

1. Offline **shape baker**:

   * Input: mesh or SDF for horse/donut/slime.
   * Output:

     * Particle positions + radii.
     * `rest_pos_local`.
     * Edges + rest lengths (adjacency).
     * Optional “body parts” labels for segmentation.
       (Take inspiration from GPU XPBD tetrahedra pipeline: they use a separate simulation mesh with different resolution from render mesh. ([GitHub][13]))
2. Integrate shape assets:

   * Spawning a creature:

     * Allocate range in particle pool.
     * Copy shape data into GPU buffers.
     * Register body in `SoftBody` buffer.
3. Add **per-body LOD**:

   * Different resolutions for same archetype.
   * Decisions:

     * Based on distance to camera.
     * Or maximum on-screen projected size.
4. Add ECS-driven spawn/despawn:

   * Spawner system that:

     * Requests ranges in particle pool.
     * Frees them when enemies die.

**Exit criteria:**

* You can have ~50–100 different bodies (horse-ish, donut-ish, blobs) in the scene with varied particle counts and still hit your frame budget.
* Enemy spawn/despawn works without memory leaks.

---

### Phase 9 – Gameplay hooks & polish

**Goal**: Foundation so you can start building the *game* instead of the engine.

**Tasks:**

1. Hook up:

   * Bullet/projectile system → raycasts or swept tests vs soft bodies.
   * On hit:

     * Apply impulse in sim via commands.
     * Increase fracture thresholds / stress on impacted region.
2. Enemy behavior:

   * Jumps, charges, idle jiggle:

     * Implement as body-level impulses or rest-shape motions.
3. Camera:

   * Side-scroller-ish rail camera using `Transform` of player, with some smoothing.
4. Debug UI:

   * Toggle debug overlays:

     * Particle view (colors by velocity, stress, body).
     * Grid cells.
     * Constraint lines.
   * Show perf stats per pass.

**Exit criteria:**

* You can run a small level with multiple jelly enemies walking, jumping, getting shot, and splattering without touching physics code constantly.

---

## 9. Risk / feasibility snapshot (with actual numbers)

Based on:

* Real-time particle/constraint engines like FleX and unified particle physics ([NVIDIA Docs][3])
* GPU PBD/XPBD implementations in research (surgical simulators, GPU tetra soft bodies) ([Dogademirel][15])
* Massively parallel particle & constraint systems running well on consumer GPUs ([jw0z96.github.io][6])

**My rough, honest estimates:**

* Getting **one 3D jelly blob** running with basic squish on GPU:

  * **~90–95%** chance.
* Getting:

  * ~**20–30 enemies** at 200–300 particles each,
  * with stable collisions and metaball rendering,
  * at 60 FPS on a midrange GPU:
  * **~70–80%** chance with persistence.
* Scaling to:

  * ~100 enemies / 50–500 particles each,
  * plus complex level geometry and all the game logic:
  * **~60–70%** chance *with* aggressive LOD and good profiling.

Main risk factors:

* Getting **XPBD + grid + constraints** fully stable in 3D on GPU is non-trivial.
* Dealing with **solver divergence** and constraint tuning may be emotionally exhausting.
* Performance curve: you may need several cycles of “oops, this doesn’t scale, refactor” as you crank particle counts.

But: given there are already working **GPU XPBD soft body implementations with tetrahedra and Vulkan** out there, and plenty of GPU mass-spring sims, we know the basic approach is sound. ([GitHub][13])

---

[1]: https://nvidia-omniverse.github.io/PhysX/physx/5.4.1/docs/SoftBodies.html?utm_source=chatgpt.com "Soft Bodies — physx 5.4.1 documentation"
[2]: https://mmacklin.com/EG2015PBD.pdf?utm_source=chatgpt.com "Position-Based Simulation Methods in Computer Graphics"
[3]: https://docs.nvidia.com/gameworks/content/gameworkslibrary/physx/flex/manual.html?utm_source=chatgpt.com "Manual — NVIDIA Flex 1.1.0 documentation"
[4]: https://publications.lib.chalmers.se/records/fulltext/219708/local_219708.pdf?utm_source=chatgpt.com "A GPU-based Implementation of Position Based Dynamics ..."
[5]: https://github.com/WilKam01/GPU_Soft_Body_Physics?utm_source=chatgpt.com "Real-time Soft Body Simulation using Extended Position ..."
[6]: https://jw0z96.github.io/resources/gpuMassSpring.pdf?utm_source=chatgpt.com "GPU Accelerated Mass Spring System - Joe Withers"
[7]: https://forums.developer.nvidia.com/t/position-based-dynamics/38532?utm_source=chatgpt.com "Position Based Dynamics - CUDA"
[8]: https://mmacklin.com/uppfrta_preprint.pdf?utm_source=chatgpt.com "Unified Particle Physics for Real-Time Applications"
[9]: https://mmacklin.com/smallsteps.pdf?utm_source=chatgpt.com "Small Steps in Physics Simulation"
[10]: https://www.researchgate.net/publication/235916278_Position-based_Methods_for_the_Simulation_of_Solid_Objects_in_Computer_Graphics?utm_source=chatgpt.com "(PDF) Position-based Methods for the Simulation of Solid ..."
[11]: https://matthias-research.github.io/pages/publications/XPBD.pdf?utm_source=chatgpt.com "Position-Based Simulation of Compliant Constrained Dynamics"
[12]: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-7-point-based-visualization-metaballs-gpu?utm_source=chatgpt.com "Chapter 7. Point-Based Visualization of Metaballs on a GPU"
[13]: https://github.com/WilKam01/GPU_Soft_Body_Physics "GitHub - WilKam01/GPU_Soft_Body_Physics: Bachelor Thesis - Real-time Soft Body Simulation using Extended Position-Based Dynamics and Tetrahedral Deformation"
[14]: https://animation.rwth-aachen.de/publication/055/?utm_source=chatgpt.com "Position-Based Simulation Methods in Computer Graphics"
[15]: https://dogademirel.com/Papers/HCII2023_GPU%20based%20PBD.pdf?utm_source=chatgpt.com "GPU based Position Based Dynamics for Surgical Simulators"
