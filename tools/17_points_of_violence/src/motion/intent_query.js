// Classification filtering stays separate from scoring so combat/input can reuse it later.
export function queryIntent(library, intent, options = {}) {
  const entries = library.entries.filter(entry => isEligible(entry, intent, options));
  const strict = entries.filter(entry => intentMatches(entry, intent));
  const relaxed = strict.length ? strict : entries.filter(entry => relaxedIntentMatches(entry, intent));
  return strict.length ? strict : relaxed;
}

export function intentById(intentMap, id) {
  return (intentMap?.intents || []).find(intent => intent.id === id)
    || (intentMap?.intents || []).find(intent => intent.id === intentMap?.defaultIntent)
    || intentMap?.intents?.[0]
    || null;
}

export function weaponScopesForLibrary(library) {
  const scopes = new Set(["unarmed", "all"]);
  for (const entry of library.entries) {
    const scope = entry.classification?.weaponScope;
    if (scope) scopes.add(scope);
  }
  return [...scopes];
}

function isEligible(entry, intent, options) {
  const c = entry.classification || {};
  const action = c.actionType || "unknown";
  const includeDiagnostics = options.includeDiagnostics === true;
  const diagnosticActions = new Set(options.diagnosticActions || ["unknown", "emote", "hit_flinch", "fall", "land"]);
  if (intent?.diagnosticsOnly && !includeDiagnostics) return false;
  if (c.needsReview === true && !includeDiagnostics) return false;
  if (c.includeInCombat !== true && !includeDiagnostics) return false;
  if (diagnosticActions.has(action) && !includeDiagnostics) return false;
  const weaponScope = options.weaponScope || "unarmed";
  if (weaponScope !== "all" && c.weaponScope !== weaponScope) return false;
  return true;
}

function intentMatches(entry, intent) {
  if (!intent) return false;
  const c = entry.classification || {};
  if (intent.actions && !intent.actions.includes(c.actionType)) return false;
  if (intent.targets && !intent.targets.includes(c.targetZone || "unknown")) return false;
  if (intent.movement && !intent.movement.includes(c.movementType || "unknown")) return false;
  if (intent.turnTypes && !intent.turnTypes.includes(c.turnType || "none")) return false;
  return true;
}

function relaxedIntentMatches(entry, intent) {
  const c = entry.classification || {};
  if (intent?.actions?.includes(c.actionType)) return true;
  if (intent?.id === "approach" && c.movementType === "advance") return true;
  if (intent?.id === "retreat" && c.movementType === "retreat") return true;
  if (intent?.id === "turn" && c.turnType && c.turnType !== "none") return true;
  return false;
}
