# Player Leveling System

## Goals
- Convert existing score/EXP pips into a true leveling loop that supports extremely long survival runs without overflow or stat rollover.
- Deliver consistent per-level power growth while letting individual ship archetypes define their own rate curves and milestone rewards.
- Expose hooks so enemy health, damage, and spawn pacing scale in step with the player's level.
- Record detailed run / lifetime statistics across arbitrarily large values for balancing and player-facing records.

## EXP & Level Curve
- Source: score pips now grant `ExpValue` (retune drop tables after loot resolver lands).
- Storage: `PlayerLevelManager` tracks `TotalExp`, `CurrentLevel`, `ExpIntoLevel`, and `ExpRequired`.
- Curve definition lives in `Config/Progression/exp_curve.json`:
  - `base_cost`: EXP for level 1 ➔ 2.
  - `curve_segments`: ordered list with `{ start_level, mode, a, b, c }` supporting linear, quadratic, exponential-small, and log-sustain growth to keep progression smooth during multi-hour runs.
  - Supports content overrides per stage/event (e.g., double EXP weekends).
- HUD: new EXP bar under health; tooltip previews `+stats` from the next level and upcoming milestones.

## Stat Growth Model
- Every numeric stat follows a parametric formula so we can seed different growth per ship:

  ```
  value(L) = (base + add_per_level * L + Σ milestone_add)
             * (1 + mult_per_level * L + Σ milestone_mult)
  ```

  - `base`: starting stat value for the ship.
  - `add_per_level`: flat growth per level (can be negative).
  - `mult_per_level`: percentage growth applied to base (defaults to 0).
  - `growth_curve`: optional enum controlling non-linear scaling (Linear, Quadratic, ExponentialSmall, LogSustain). Implemented as modifiers to `add_per_level` / `mult_per_level`.
  - `softcap`: optional level after which additive growth tapers (e.g., apply 50% of `add_per_level` past L200).
  - `clamp_min/max`: guard rails to avoid negative health, zero fire rate, etc.
- Core stats we scale by default:
  - `WeaponPower` (+% damage to projectile/burst)
  - `AttackInterval` (multiplier applied to volley wait; negative growth reduces cooldown)
  - `ProjectileSpeed`
  - `ProjectileLifetime`
  - `PierceCapacity`
  - `CritChance`, `CritDamage`
  - `MaxHull` (player health)
  - `PassiveRegen` (HP/sec)
  - `DamageReduction` (flat reduction before armor)
  - `ThrusterSpeed` (movement)
  - `PickupRadius` (loot magnet)
  - `ShieldCapacity` / `ShieldRecharge` (if active)
- Exotic traits (Luck, Curse, Reroll, etc.) remain for cards, loot, or meta progression to preserve build identity.

## Ship Archetypes & Milestones
- `Config/Ships/<ship_id>.json` seeds:
  - Base stats (`base`)
  - Growth rates (`add_per_level`, `mult_per_level`, optional `growth_curve`)
  - Milestone table `{ level, rewards[] }` with reward payloads:
    - `StatAdd` / `StatMult` (extra injections beyond baseline growth)
    - `ProjectileCount+1` with cap (e.g., Interceptor gains +1 at L10/20/30 up to +3)
    - `GrantCard` (e.g., Support Frigate gets `fire_tri_merge` at L20)
    - `GrantRevive`, `UnlockAbility`, `UnlockPassive`
  - Optional ship-specific EXP adjustments (`exp_gain_multiplier`, `level_cap_override`).
- Level-up pipeline:
  1. `PlayerLevelManager` adds EXP, loops level-ups while `ExpIntoLevel >= ExpRequired`.
  2. For each level gained, fetch archetype config, apply baseline stat growth + milestone rewards.
  3. Emit `LevelUpEvent { shipId, newLevel, rewards[] }` for UI, audio, analytics, enemy scaling.
  4. Update cached `PlayerStatSnapshot` consumed by weapons, damage, movement, magnet, etc.
- UI:
  - Level-up panel shows raw stat deltas and milestone rewards.
  - Toast message leverages existing HUD feed.

## Level-Up Choice QoL
- **Reroll Charges**: players start with a ship-defined count (`Config/Ships/...`), gain more via milestones/loot. `LevelUpChoiceUI` consumes a charge to re-roll the current card pool; charges cap to prevent hoarding.
- **Banish List**: per-run set where players can permanently remove unwanted cards from future draws. Stored in run state; persists across rerolls so the pool keeps thinning.
- **Opt-Out Reward**: instead of selecting a card, players can bank `Card Shards`. Shards are tracked per run and can be exchanged at thresholds for guaranteed card rarity picks or specific weapon evolutions during downtime (e.g., 5 shards = rare reroll, 10 = choose any known card). Keeps unlucky streaks from bricking a run without trivializing choice pressure.
- **Future Hooks**: allow certain ships/cards to modify reroll/banish/shard economy (e.g., support ship gains +1 reroll every 15 levels, gambler card doubles shard payout but bans opt-out for two levels).

## Enemy Scaling Hooks
- `EnemyThreatController` subscribes to `LevelUpEvent`:
  - Applies per-level multipliers from `Config/Progression/enemy_scaling.json`:
    - `hp_mult`, `damage_mult`, `speed_mult`, `resistance_add`, `projectile_speed_mult`.
    - `spawn_intensity_curve` to drive `SpawnDirector` (increased enemies per tick / reduced spawn delay).
  - Stage modifiers stack multiplicatively (e.g., late stage + high level).
  - Supports soft caps or logarithmic scaling to maintain fairness at extreme levels.
- `SpawnDirector` uses scaling output to adjust spawn batches, elite/boss injection frequency, and wave pacing.
- Telemetry records both player stat multipliers and enemy scaling factors for balance review.

## Damage & Stat Logging
- Four buckets per ship:
  - `current_run`
  - `best_run_by_ship`
  - `global_best_run`
  - `lifetime_all_ships`
- Metrics captured:
  - Cumulative totals: damage dealt/taken, healing, mitigation, projectiles fired/hit, pickups collected, cards acquired, EXP gained, highest combo, longest survival, etc.
  - Peaks: single-tick DPS, biggest crit, max simultaneous projectiles, highest movement speed, largest shield recharge tick.
- Data types:
  - Use a custom 128-bit integer struct (`struct UInt128 { ulong hi; ulong lo; }`) for additive stats.
  - Provide safe arithmetic helpers (`Add`, `Multiply`, `FromDouble`) with overflow detection; auto-promote to `BigInteger` if ever exceeded.
  - For ratios (DPS, accuracy), store numerator/denominator separately as `UInt128`.
- Event pipeline:
  1. Gameplay systems raise lightweight events (`DamageEvent`, `PickupEvent`, `CardGrantEvent`).
  2. `StatsAccumulator` updates in-memory bucket totals.
  3. On level-up / wave clear / run end, write snapshots to disk.
  4. Best-run comparisons performed using raw big-int values to avoid rounding.
- Persistence:
  - Stored under `Saves/Stats/<ship_id>.json` with schema version + checksum.
  - Auto-save after major events; flush on shutdown.
  - Developer tools: `stats dump`, `stats reset`, `stats validate`.

## Large Number Formatting
- Display format uses short suffix notation; raw values remain exact.
- Suffix table:

  | Threshold | Suffix | Meaning | Power of 10 |
  |-----------|--------|---------|-------------|
  | ≥ 1,000,000 | `M` | Million | 10^6 |
  | ≥ 1,000,000,000 | `B` | Billion | 10^9 |
  | ≥ 1,000,000,000,000 | `T` | Trillion | 10^12 |
  | ≥ 1,000,000,000,000,000 | `Q` | Quadrillion | 10^15 |
  | ≥ 1e18 | `Qi` | Quintillion | 10^18 |
  | ≥ 1e21 | `Sx` | Sextillion | 10^21 |
  | ≥ 1e24 | `Sp` | Septillion | 10^24 |
  | ≥ 1e27 | `O` | Octillion | 10^27 |
  | ≥ 1e30 | `N` | Nonillion | 10^30 |
  | ≥ 1e33 | `D` | Decillion | 10^33 |
- Formatting rules:
  - Show up to three significant digits (`12.4B`, `6.02Q`).
  - Values below 1,000 stay un-suffixed with full precision.
  - On hover, tooltip displays scientific notation and exact value (`6.02Q (6.02 × 10^15)`).
  - Provide localization hooks so alternative suffix sets can be added later.

## Data Structures & Services
- `PlayerLevelManager`: holds EXP, level, stat curves, milestone state, publishes `PlayerStatSnapshot`.
- `PlayerStatSnapshot`: cached composite of all modifiers (base ship stats, level growth, cards, loot, buffs).
- `EnemyThreatController`: manages enemy scaling output consumed by `SpawnDirector` and enemy factories.
- `StatsService`: central accumulator + persistence layer covering all stat buckets and formatting helpers.
- `Config` files to author:
  - `Config/Progression/exp_curve.json`
- `Config/Progression/enemy_scaling.json`
- `Config/Ships/<ship_id>.json`
- `Config/Progression/level_milestones.json` (optional shared milestone definitions).

## Adaptive Difficulty Hooks
- `AdaptiveDifficultyManager` consumes live stat telemetry (damage dealt/taken, shield depletion rate, average time between hits).
- **Heavy Interceptor Spawns**:
  - Triggered when player shield damage intake stays below a configurable threshold over a rolling window (e.g., last 90 seconds) or when DPS far exceeds baseline.
  - Spawns 1–3 heavy interceptor ships:
    - Slower than player, high collision damage, limited but accurate burst fire.
    - Teleport-style pathing: if kited too far, they reposition ahead of player with warning telegraph.
    - On kill: drop extra loot, shards, or guaranteed rare card to reward the challenge.
  - Scaling: heavy unit health/damage inherits level-based multipliers plus an adaptive factor tied to player weapon power.
- **Push Waves**:
  - When player avoids significant hull/shield damage for extended periods, trigger radial spawn surge.
  - `PushWaveDirector` coordinates multi-direction spawn queues, brief warning (UI pulse / siren), then floods enemies for a fixed duration.
  - Monitor player incoming damage during the wave:
    - If damage spikes above threshold, throttle new spawns for the remainder of the wave.
    - If player continues to dominate, escalate with elite variants or mini-heavies.
  - Cooldown between waves so runs have breathing room.
- Telemetry fields:
  - `avg_shield_damage_per_min`, `time_since_last_hull_hit`, `player_dps_vs_expected`, `current_enemy_clear_rate`.
  - Adaptive manager writes decisions to log for tuning and exposes console overrides (`adaptive enable/disable`, `adaptive force_heavy`, `adaptive force_push`).
- Ties into loot economy: successful adaptive encounters grant bonus shards/credits so challenge carries tangible rewards.

## Validation & Tooling
- Add automated tests for:
  - EXP curve evaluation across 1–500+ levels.
  - Stat growth comparisons between ships.
  - Milestone application ordering and caps.
  - Enemy scaling outputs at high levels (e.g., 100, 250, 500).
  - `UInt128` arithmetic (overflow scenarios, BigInteger fallback).
- Developer utilities:
  - `level simulate <ship> <level>` prints stat snapshot and enemy scaling preview.
  - `stats format <value>` verifies suffix formatting.
  - `spawn preview <level>` visualizes spawn intensity curve for tuning.

## Player Pain Points & QoL Goals
- **Card Drought Frustration**: mitigated by reroll/banish/shard systems; milestone rewards can inject guaranteed rarity spikes at high levels.
- **Run Pacing Fatigue**: enemy scaling and EXP curve segments ensure consistent challenge; consider timed elite injections and optional fast-forward once players over-level a wave.
- **Power Spikes Leading to Instagib**: stat growth softcaps and enemy scaling caps prevent sudden double-damage swings; revive charges / milestone shields offer recovery without mandatory restart.
- **Overflow Bugs**: big-int telemetry and safe arithmetic prevent rollover to zero; nightly validation catches anomalies before release.
- **Information Overload**: level-up UI summarizes stat deltas, highlights milestones, and tooltips explain reroll/banish/shard usage.
- **Stale Early Choices**: ship configs rotate early milestone rewards (e.g., guaranteed form card by L5) so every run reaches a satisfying baseline quickly.

## QoL & Event Systems
- **Early-Game Ramp**:
  - Minute-1 booster (per ship toggle): +20–30% movement, +1 projectile until level 3.
  - Smart XP drip magnet: if no XP collected for 4–6 s, nearby gems slowly vacuum in (radius cap).
  - First-level guarantee: first two level-ups weighted to S/A-tier cards or archetype-aligned slots.
  - Micro-objectives: short tasks (e.g., “Defeat 25 Biters”) grant instant magnets or shards, managed via the QoL event deck.
- **RNG Softeners**:
  - Weighted roll system enhancements:
    - Cards carry `baseWeight`, `synergyTags`, `pityCounter`, `reversePityCounter`.
    - Weight formula: `weight = base * (1 + pity * pityScale) * (1 + tagMatches * synergyBias) * (1 - reversePity * decayFactor)`.
    - Pity increments when required components absent; reverse pity kicks in when a component is rejected to reduce duplicates briefly.
  - Banish memory: banished cards stay out for 3–4 future level-ups before re-entering the pool.
  - Opt-out shards (micro-crafting) as described earlier.
- **Visibility & Declutter**:
  - Auto-declutter: monitor `threatScore`; when above threshold, VFX/UI opacity drops 30–50% for ~1 s.
  - Gem compression: nearby low-value gems merge into larger orbs (same EXP).
  - Threat highlighting: final frames before impact tint collider edges; directional damage arrow fades over 300 ms.
  - Pre-hit bloom & grace buffer during level-up/loot freezes (hits stored and reapplied at 0.35x).
- **Pickup Flow**:
  - Smart magnet (already specced): radius grows with time since pickup and XP on screen; decays after large vacuums.
  - Boss-chest vacuum: on chest open, vacuum XP along path to chest.
  - Catch-up magnet: during level-up freeze, only XP spawned during freeze is auto-collected.
- **Evolution Visibility**:
  - Chain icon hint when both components in inventory (no stats revealed).
  - Lore riddles on drops/chests to hint recipes.
  - Post-run compendium updates: full recipe for completed evolutions, silhouettes for near-misses, signature mix cards logged in codex once earned.
- **Meta Progression QoL**:
  - Sidegrade nodes: tradeoffs instead of pure power (e.g., +10% EXP, −5% pickup radius).
  - Prestige siphon: overflow EXP becomes meta-currency only after boss timer to prevent mid-run snowball.
  - Loan tokens: take early meta perks at cost of future rerolls if the run ends early.
- **Wave Variety & Events**:
  - QoL event deck: 30–45 s micro-events (Nebulae, Twin Elites, Meteor Drizzle) with small rewards; enforces calm windows every few events.
  - Biome toys: per-map interactables (chargeable turrets, hazard toggles).
  - Push waves & heavy interceptors integrate here for scheduling and telegraphing.
- **Run Options**:
  - Condensed Mode: 15 min target, +20% EXP gain, +15% enemy HP, compressed events.
  - Boss Rush: sequential arenas lasting 8–10 min.
  - Warp Sigil: meta unlock granting a mid-run cash-out at minute 12/18 (single use per unlock).
- **Performance Adaptation**:
  - Stabilize state: if frame time > target for 1 s, reduce spawn density by 10% over 5 s, boost elite HP by 10%, grant temporary loot tier bump to maintain excitement.
  - VFX LOD / wing composites: pack multiple enemies into shared visuals when density spikes without reducing perceived threat.

## Open Questions
- Should certain stats (e.g., Pierce, ProjectileCount) have global hard caps to protect performance?
- Do we shift EXP gains when multiple players (future co-op) join a run?
- How do milestone rewards interact with temporary buffs (e.g., loot modifiers that grant pierce)?
- What retention strategy do we need for per-run stats (e.g., limit history size, rotate logs)?

## Implementation Checklist & Gaps
- **Leveling Flow**
  - [ ] Implement `PlayerLevelManager` that converts loot XP pickups into EXP, handles level-ups, and publishes `PlayerStatSnapshot`.
  - [ ] Replace `_score` usage in `Game1` with EXP accumulation and UI updates.
  - [ ] Parameterize ship starting stats and growth rates; remove hard-coded `BoidSettings` reliance for player max health, fire interval, etc.
- **Stat Precision & Logging**
  - [ ] Introduce `UInt128` (or BigInteger) for damage/score/EXP to prevent overflow; update `DamageTelemetry`, loot values, and other counters.
  - [ ] Build `StatsService` with per-run / best / lifetime buckets and persistence on disk.
- **Loot & Card Economy**
  - [ ] Externalize loot table definitions; feed `EnemyManager` and `Game1` via `LootResolver`.
  - [ ] Implement weighted roll system with pity and reverse-pity counters, shard opt-outs, reroll/banish tracking.
  - [ ] Extend `LootPickupManager` to support new pickup kinds (shards, shard bundles, adaptive rewards).
- **Adaptive Systems**
  - [ ] Stand up `AdaptiveDifficultyManager` consuming telemetry and triggering heavy interceptors, push waves, and stabilizer states.
  - [ ] Wire smart magnet behaviour, boss-chest vacuum, and catch-up magnet to `LootPickupManager`.
- **Documentation Sync**
  - [ ] Audit other docs (loot, card, weapon plans) against current code to keep references accurate as systems ship.
