export function resolveRootMotionPolicy(entry, config, overrides = {}) {
  const override = policyOverrideForEntry(entry, overrides);
  const policyId = override?.policyId || inferPolicyId(entry);
  return tunePolicyForEntry(policyById(config, policyId), entry);
}

export function policyById(config, policyId) {
  const policies = config?.policies || {};
  return policies[policyId] || policies.anchored || {
    id: "anchored",
    label: "Anchored",
    type: "anchored",
    travelX: 0,
    jumpHeight: 0,
    curve: "linear"
  };
}

function inferPolicyId(entry) {
  const c = entry?.classification || {};
  const action = c.actionType || "unknown";
  const movement = c.movementType || "unknown";
  const sourceText = clipSearchText(entry);
  if (action === "jump" && /\b(mantle|vault|climb)\b/.test(sourceText)) return "mantle_up_placeholder";
  if (action === "jump" && /\b(jump[_ ]?down|jumping[_ ]?down|drop[_ ]?down)\b/.test(sourceText)) return "mantle_down_placeholder";
  if (action === "jump" && movement === "advance") return "jump_forward";
  if (action === "jump" && movement === "retreat") return "jump_retreat";
  if (action === "jump") return "jump_up";
  if (action === "locomotion" && movement === "advance") return "locomotion_advance";
  if (action === "locomotion" && movement === "retreat") return "locomotion_retreat";
  if (action === "locomotion" && movement === "lateral") return "locomotion_lateral";
  if (action === "dodge") return "dodge";
  if (["punch", "kick", "weapon_attack"].includes(action) && ["advance", "retreat"].includes(movement)) return "attack_lunge";
  if (["punch", "kick", "weapon_attack"].includes(action)) return "combo_in_place";
  return "anchored";
}

function tunePolicyForEntry(policy, entry) {
  const movement = entry?.classification?.movementType || "unknown";
  const tuned = { ...policy };
  if (movement === "retreat" && Number.isFinite(policy.retreatX)) tuned.travelX = policy.retreatX;
  if (movement === "lateral" && Number.isFinite(policy.lateralX)) tuned.travelX = policy.lateralX;
  return tuned;
}

function policyOverrideForEntry(entry, overrides) {
  const raw = overrides?.overrides || overrides || {};
  const id = entry?.clip?.id || "";
  const keys = [entry?.key, id, `${id}::${entry?.meta?.libraryItem?.path || ""}`].filter(Boolean);
  return keys.map(key => raw[key]).find(Boolean) || null;
}

function clipSearchText(entry) {
  return [
    entry?.clip?.id,
    entry?.clip?.displayName,
    entry?.meta?.libraryItem?.path,
    entry?.clip?.provider?.sourcePath,
    entry?.clip?.source?.sourceFile
  ].filter(Boolean).join(" ").toLowerCase();
}
