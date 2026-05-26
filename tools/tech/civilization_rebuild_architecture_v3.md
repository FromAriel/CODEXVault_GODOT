# Civilization Reconstruction Handbook Architecture v3

Generated: 2026-05-13

## Consolidated verdict

The v2 architecture was already pointed in the right direction: **capability nodes** are the correct unit, and the 101-node typed DAG is the right canonical core. The v3 consolidation keeps that graph stable and strengthens what was still too implicit: resource ladders, source policy, high-risk readiness gates, editorial boundaries, and the distinction between *using salvage* and *rebuilding capability*.

The central definition is now:

> A capability exists when a community can build it, test it, teach it, repair it, inspect it, document it, reproduce it, and scale it to the maturity level required by the use case.

That is stricter than “knowing the idea,” stricter than “having one salvaged artifact,” and stricter than “one expert can do it once.”

## What v3 consolidates

| Source artifact | Role in v3 |
|---|---|
| `civilization_rebuild_dependency_graph_v2.json` | Canonical 101-node typed DAG, phase/trunk projections, critical paths, query index, validation. |
| `civilization_rebuild_capability_graph_v2.json` | Resource-ladder idea, older capability bands, edge-type framing, practical material progression. |
| `civilization_rebuild_architecture_v2.md` | Phase architecture, maturity model, artifact stack, confidence/risk framing. |
| `deep-research-report.md` | Source-grounded argument for dependency trunks and root operational loops. |
| `deep-research-report-alt.md` | Spines, acquisition modes, high-complexity caution, science-at-point-of-use rule. |
| `README.md` | Project scope, source policy, editorial safety rules, group-centered handbook assumptions. |

## Core model

The handbook is not one tree. It is seven synchronized views over one canonical graph:

| View | Purpose |
|---|---|
| Urgency view | What must happen first to keep people alive. |
| Reproduction view | What must exist before a capability can be remade without salvage. |
| Scale view | What turns one-off craft into public service or industrial chain. |
| Safety view | Which standards, inspections, training, and stop rules must exist before hazardous systems. |
| Resource-ladder view | How water, salt, lime, clay, iron, copper, glass, nitrogen, biomass, and information recur across phases. |
| Salvage view | How surviving artifacts accelerate use, repair, copying, and calibration without proving reproduction. |
| Source-review view | Which packets need current expert review because old sources can be unsafe or obsolete. |

## Phase architecture

| Phase | Nodes | Purpose | Dominant question |
|---|---:|---|---|
| `P0_orientation` | 10 | Keep the group alive as an organized learning-and-building system before larger technologies matter. | What exists, who can do what, what is dangerous, and how do we know? |
| `P1_survival` | 12 | Stop avoidable death from water, waste, exposure, hunger, trauma, and fire. | Can people remain alive and healthy enough to work? |
| `P2_village_surplus` | 17 | Create food surplus, storage, permanent shelter, kilns, transport, and copied knowledge. | Can the community support specialization and durable craft? |
| `P3_workshop` | 16 | Develop extraction, metallurgy, glassware, lab practice, precision references, and technical drawings. | Can the community make controlled materials and reliable tools? |
| `P4_industrial` | 15 | Cross the industrial threshold: machine tools, interchangeable parts, steam/pressure systems, electricity, urban water. | Can machines, power, and infrastructure be reproduced and maintained? |
| `P5_scientific_industrial` | 21 | Scale chemistry, medicine, refrigeration, communications, engines, electronics, and process control. | Can the society run hazardous, high-value systems under measured control? |
| `P6_high_complexity` | 10 | Represent apex technologies whose real prerequisites are purity, metrology, institutions, and safety culture. | Can the society maintain extreme precision, purity, regulation, and long supply chains? |

## Maturity rule

A node is not satisfied because someone can name it. It is satisfied at a specific maturity level:

| Level | Meaning |
|---|---|
| `M0_named` | Recognized and described in outline. |
| `M1_demonstrated_once` | A competent person can make it work once under favorable conditions. |
| `M2_repeatable_local` | A local team can repeat it with records, ordinary tools, and substitutions. |
| `M3_scaled_service` | It can serve a settlement/workshop with training and maintenance. |
| `M4_standardized_safe` | It has inspection intervals, pass/fail criteria, and compatible standards. |
| `M5_industrial_chain` | It is embedded in a multi-site chain with quality statistics and lifecycle governance. |

## Capability completion standard

Every capability packet should prove all of these before it is treated as dependable:

- define the capability in plain operational language
- identify prerequisites by type and required maturity
- produce a minimum viable output
- test it with pass/fail acceptance criteria
- record materials, measurements, failures, and revisions
- teach it to a second operator or crew
- inspect and maintain it on a schedule
- repair it without a vanished specialist
- reproduce it from local or documented inputs
- scale it only after quality and safety gates are stable

## Resource ladder atlas

The smaller v2 graph had the better material-ladder intuition. V3 normalizes those ladders into the 101-node canonical graph with valid node IDs.

| Ladder | Resource | Nodes | Early progression |
|---|---|---:|---|
| `water_ladder` | water | 8 | source protection → settling/filtration → boiling/disinfection → sanitation separation → pumps/lift → ... |
| `wood_biomass_ladder` | wood_biomass | 7 | shelter/tools → cooking fuel → charcoal → high-temperature reducing fuel → mill and workshop frames → ... |
| `clay_ceramic_ladder` | clay_ceramics | 7 | raw clay containers → fired pottery → brick/tile → pipes and drains → kiln furniture → ... |
| `lime_calcium_ladder` | limestone_lime_calcium | 7 | mortar/plaster → sanitation works → glass ingredient/flux → soil pH correction → masonry/civil works → ... |
| `salt_chlorine_ladder` | salt_brine_chlorine_alkali | 7 | salt source survey → food preservation → brine concentration control → electrolyte service → chlor-alkali feedstock → ... |
| `copper_nonferrous_ladder` | copper_nonferrous_metals | 8 | native/ore copper → bronze/castings → pipes/solder/bearings → wire/conductors → coils/generators → ... |
| `iron_steel_ladder` | iron_steel | 10 | ore beneficiation → bloom/direct iron → forge tools → controlled steel → shafts/gears/bearings → ... |
| `glass_optics_ladder` | silica_glass_optics | 6 | basic glass → sealed labware → lenses → microscopes → vacuum tubes → ... |
| `nitrogen_nutrient_ladder` | nitrogen_nutrients_soil | 7 | seed survival → manure/compost → crop rotation/field systems → irrigation/drainage → basic soil observation → ... |
| `information_ladder` | information_records_standards | 12 | oral memory → durable records → arithmetic/maps → printing → inspection/standards → ... |

## Readiness gates

These are explicit “do not attempt yet” gates. They keep the graph from implying that hazardous regimes are just late recipes.

| Gate | Trigger nodes | Minimum gate nodes |
|---|---|---|
| `pressure_system_gate` | `pressure_vessels_boilers`, `steam_engines` | `risk_register`, `test_inspection_culture`, `units_measurement`, `gauges_calibration`, `steelmaking_heat_treatment`... |
| `sterile_medical_gate` | `sterilization_surgery`, `vaccination_biologics`, `antibiotics_pharma` | `clean_water_basic`, `sanitation_waste_separation`, `clinical_records_vitals`, `soap_antiseptics_disinfectants`, `microscopy_optics`... |
| `grid_electrical_gate` | `generators_motors`, `power_distribution_grid`, `precision_electrical_measurement` | `conductors_insulators`, `electromagnetism_basics`, `risk_register`, `test_inspection_culture`, `maintenance_spares` |
| `industrial_chemistry_gate` | `chlor_alkali_process`, `industrial_chemistry_batch`, `fertilizer_industry` | `lab_glassware`, `distillation_extraction`, `mineral_acids_bases`, `soap_antiseptics_disinfectants`, `quality_statistics`... |
| `semiconductor_clean_gate` | `semiconductor_materials`, `photolithography_microfabrication`, `integrated_circuits` | `advanced_metrology`, `precision_electrical_measurement`, `cleanrooms_contamination`, `continuous_process_control`, `software_databases`... |
| `nuclear_civil_gate` | `nuclear_science_civil`, `nuclear_fuel_cycle_civil`, `reactor_systems_civil`, `nuclear_power_operations` | `advanced_metrology`, `spectroscopy_radiation_detection`, `power_distribution_grid`, `quality_statistics`, `continuous_process_control`... |

## Critical paths preserved

| Path | Nodes | Endpoint |
|---|---:|---|
| `stick_to_machine_tool` | 12 | `cutting_abrasion_tools` → `machine_tools` |
| `lever_to_nuclear_power` | 17 | `simple_machines` → `nuclear_power_operations` |
| `container_to_chemistry` | 10 | `containers_basic` → `continuous_process_control` |
| `wash_to_modern_medicine` | 11 | `clean_water_basic` → `antibiotics_pharma` |
| `fire_to_electric_grid` | 11 | `fire_control` → `power_distribution_grid` |
| `records_to_semiconductors` | 14 | `durable_records` → `integrated_circuits` |
| `salt_to_industrial_chemistry` | 6 | `salt_sources_brine` → `fertilizer_industry` |
| `agriculture_to_industrial_surplus` | 10 | `seed_saving` → `internal_combustion` |

## Editorial policy integrated from the project README

- Use primary or near-primary sources where possible: government, UN agency, university extension, public-health, engineering, standards, or original field manuals.
- Rewrite into original, teachable, community-scale instructions; do not compile copied source pages.
- Mark old sources as old and require current review for health, medicine, electrical work, chemicals, and structural safety.
- Prefer robust, repairable, low-energy, locally inspectable methods over fragile high-tech dependencies.
- Write for groups, not lone heroes: crews, records, child care, disability access, conflict reduction, training paths, and role handoff matter.
- Keep weapons, explosives, offensive tactics, evasion, clandestine harm, and other harmful operational material out of the manual.
- Separate immediate survival action, stable community practice, materials/tools, failure signs, source notes, and local expert review needs.

## Source verification snapshot

These are the external anchor URLs used to sanity-check the architecture. They should become entries in the project source ledger, not merely prose citations.

| ID | Source | URL | Use in architecture |
|---|---|---|---|
| nist_traceability | NIST metrological traceability | https://www.nist.gov/metrology/metrological-traceability | Supports treating calibration chains and uncertainty as first-class infrastructure. |
| who_wash | WHO drinking-water and WASH fact material | https://www.who.int/news-room/fact-sheets/detail/drinking-water | Supports early WASH, sanitation, hygiene, and public-health stabilization. |
| iaea_milestones | IAEA Milestones Approach | https://www.iaea.org/topics/infrastructure-development/milestones-approach | Supports late placement of nuclear as infrastructure, law, regulator, grid, workforce, and owner/operator capability. |
| eia_generation | EIA electricity generation overview | https://www.eia.gov/energyexplained/electricity/how-electricity-is-generated.php | Supports treating electricity as rotating machinery, conductors, magnets, generators, and distribution before advanced electronics. |
| fda_aseptic | FDA sterile drug products aseptic processing guidance | https://www.fda.gov/regulatory-information/search-fda-guidance-documents/sterile-drug-products-produced-aseptic-processing-current-good-manufacturing-practice | Supports treating sterile medicine as facilities, personnel, monitoring, validation, and process control. |
| nist_chips_metrology | NIST CHIPS Metrology Program | https://www.nist.gov/chips/research-development-programs/metrology-program | Supports late semiconductor placement behind accurate, precise, fit-for-purpose microelectronics metrology. |
| asme_bpvc | ASME BPVC certification | https://www.asme.org/certification-accreditation/boiler-and-pressure-vessel-certification | Supports pressure-vessel readiness gates involving design, fabrication, assembly, inspection, and quality systems. |
| epa_chlor_alkali | EPA AP-42 chlor-alkali process | https://www.epa.gov/sites/default/files/2020-09/documents/8.11_chlor-alkali.pdf | Supports the salt/brine ladder into chlorine, hydrogen, and caustic solution under industrial controls. |

## Validation

I validated the v3 graph and added validations for the new overlays.

| Check | Result |
|---|---:|
| Capability nodes | 101 |
| Typed prerequisite edges | 507 |
| Missing edge references | 0 |
| Cycles | 0 |
| DAG valid | True |
| Resource ladders | 10 |
| Missing resource-ladder refs | 0 |
| Readiness gates | 6 |
| Missing readiness-gate refs | 0 |
| Missing critical-path refs | 0 |
| Query index entries | 13 |
| V3 consolidation valid | True |

## Realistic confidence

| Reconstruction zone | Confidence that this architecture gives the right organizing strategy |
|---|---:|
| Survival, WASH, food preservation, seed saving, first aid | 90-95% |
| Village surplus, kilns, pottery, lime, roads, mills, printing | 85-90% |
| Workshop metallurgy, iron, steel, glassware, balances, gauges | 80-90% |
| Machine tools, interchangeable parts, pressure, steam, local electricity | 75-85% |
| Industrial chemistry, public health, refrigeration, communications, early electronics | 65-80% |
| Semiconductors or civil nuclear from near-zero baseline | 25-40% |
| Preserving the route back to semiconductors/nuclear if industrial remnants survive | 75-90% |

The high-complexity systems are not low-confidence because the physics is mysterious. They are low-confidence because they depend on extreme purity, deep metrology, trained institutions, maintenance culture, long supply chains, and safety governance.

## Best next move

The next productive artifact is not another prose overview. It is a **node packet generator**: take the 101 nodes, emit a folder of `manual/capabilities/<node_id>.md` files using the v3 capability packet template, then begin filling them from source ledgers. That transforms the architecture into the actual handbook.
