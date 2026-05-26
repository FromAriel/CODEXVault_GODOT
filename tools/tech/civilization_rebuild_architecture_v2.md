# Civilization-Rebuild Handbook Architecture v2

## Verdict

The provided dependency architecture is directionally strong and should be treated as the baseline to improve, not discarded. Its best idea is the use of **capability nodes** instead of academic subjects or game-like inventions. The main correction is that the final handbook needs a stricter distinction between:

1. **Urgency order**: what must be done first so people survive.
2. **Reproduction order**: what must exist before a capability can be made again without salvage.
3. **Scale order**: what must exist before one successful craft result becomes a reliable public system.
4. **Safety order**: what standards, inspection, records, and training must exist before a hazardous system is socially usable.

The v2 architecture therefore upgrades the pasted model into a typed dependency DAG with a salvage overlay, phase projections, trunk projections, query indexes, and explicit verification fields.

## What the pasted design got right

| Keep | Why it stays |
|---|---|
| Capability nodes | The right unit is not “physics” or “chemistry,” but a practical capability that solves a real problem. |
| Science inside nodes | Theory should appear where it enables building, testing, or safe operation. |
| WASH first | Water, sanitation, and hygiene prevent preventable death and protect labor capacity. |
| Gateway materials | Salt, lime, clay, glass, iron, and steel are better organizing anchors than huge material catalogs. |
| Metrology and standards | Repeatability, calibration, and inspection are central technologies, not paperwork. |
| Late semiconductors and nuclear | These are apex systems gated by purity, metrology, safety culture, and institutions. |

## What v2 changes

| Upgrade | Reason |
|---|---|
| Adds P0 orientation layer | Before “survival tech,” a group needs roles, maps, records, hazard logs, salvage triage, and inspection rules. |
| Adds salvage overlay | A post-collapse world is not a clean Stone Age. Salvage can accelerate use, but not reproduction. |
| Splits metrology into levels | Measuring sticks, balances, gauges, electrical meters, and advanced metrology are different gates. |
| Makes logistics first-class | Roads, carts, haulage, spares, and maintenance are not optional. They decide whether industries survive. |
| Makes quality culture first-class | A capability is not “unlocked” until it can be tested, inspected, repaired, and taught. |
| Adds scale maturity | The graph distinguishes one-off craft from repeatable local production, standardized safety, and industrial chains. |
| Adds query index | The JSON can answer “how do I make steel/glass/electricity/nuclear/medicine?” without reading the whole graph. |

## Handbook artifact stack

The final handbook should be built as six linked artifacts:

1. **Canonical JSON dependency graph**: the source of truth for nodes, prerequisites, edges, paths, and query indexes.
2. **Dependency atlas**: visual spreads showing each node’s prerequisites and unlocks.
3. **Node packet library**: one packet per capability with prerequisites, minimum theory, inputs, procedure outline, tests, failures, hazards, maintenance, and substitutions.
4. **Standards and tests volume**: calibration, inspection, acceptance criteria, purity thresholds, and maintenance intervals.
5. **Roadmaps and overlays**: first month/year/decade sequencing, salvage shortcuts, geographic variants, and “do not attempt yet” gates.
6. **Hazard and governance annex**: public health, mining, chemical, pressure, electrical, and radiation safety; inspection culture; institutional responsibilities.

## Phase architecture

| Phase | Purpose |
|---|---|
| P0_orientation | Keep the group functioning as a learning/building system. Survey resources, preserve knowledge, assign work, triage salvage, create hazard and test culture. |
| P1_survival | Stop avoidable death: clean water, sanitation, shelter, food preservation, fire, first aid, seed saving. |
| P2_village_surplus | Create surplus and durable craft: agriculture, soil fertility, kilns, lime, pottery, roads, mills, printing, education. |
| P3_workshop | Build extraction and controlled materials: mining, ores, iron, steel, casting, glass, labware, balances, technical drawing, gauges. |
| P4_industrial | Cross the industrial threshold: machine tools, interchangeable parts, maintenance, pressure systems, steam, electricity, grid, water/sewer systems. |
| P5_scientific_industrial | Scale chemistry, medicine, refrigeration, communications, engines, electronics, process control. |
| P6_high_complexity | Model apex systems: advanced metrology, cleanrooms, semiconductors, spectroscopy, nuclear science, civilian nuclear power governance. |

## Core dependency rule

A node is considered satisfied only when it reaches the required maturity level:

- **M0_named**: named and understood in outline.
- **M1_demonstrated_once**: works once under favorable conditions.
- **M2_repeatable_local**: can be repeated locally with records and substitutions.
- **M3_scaled_service**: serves a workshop/settlement with training and maintenance.
- **M4_standardized_safe**: has inspection intervals, pass/fail criteria, and compatible standards.
- **M5_industrial_chain**: embedded in a multi-site supply chain with quality statistics and lifecycle governance.

## Critical paths encoded in the JSON

- `stick_to_machine_tool`
- `lever_to_nuclear_power`
- `container_to_chemistry`
- `wash_to_modern_medicine`
- `fire_to_electric_grid`
- `records_to_semiconductors`
- `salt_to_industrial_chemistry`
- `agriculture_to_industrial_surplus`

## Validation

The JSON graph was generated and checked for:

- Node count: 101
- Directed edge count: 507
- Missing references: 0
- Cycles: 0
- DAG valid: True

## Practical confidence

This structure is strongest through survival, village surplus, workshop metallurgy, early industrialization, power, sanitation, and public health. It is also useful for late systems, but the confidence drops because semiconductors and nuclear power depend on extreme purity, precision, continuity of skilled labor, and safety institutions. The graph therefore treats them as late apex bundles rather than ordinary unlocks.
