import { intentById, queryIntent } from "./intent_query.js";
import { RecentUseTracker } from "./recent_use.js";
import { resolveRootMotionPolicy } from "./root_motion_policy.js";
import { scoreCandidate } from "./transition_scoring.js";

// Small orchestration layer between debug controls, actor playback, and pure motion scoring.
export class MotionSolver {
  constructor({ library, actor, intentMap, transitionDefaults, rootMotionPolicies, clipPolicyOverrides }) {
    this.library = library;
    this.actor = actor;
    this.intentMap = intentMap;
    this.transitionDefaults = transitionDefaults;
    this.rootMotionPolicies = rootMotionPolicies;
    this.clipPolicyOverrides = clipPolicyOverrides;
    this.recentUse = new RecentUseTracker(transitionDefaults.recentUse);
    this.includeDiagnostics = false;
    this.weaponScope = intentMap.defaultWeaponScope || "unarmed";
    this.activeIntent = intentById(intentMap, intentMap.defaultIntent);
    this.candidates = [];
    this.selectedIndex = 0;
    this.query(this.activeIntent?.id);
  }

  query(intentId) {
    this.activeIntent = intentById(this.intentMap, intentId);
    const entries = queryIntent(this.library, this.activeIntent, {
      includeDiagnostics: this.includeDiagnostics,
      weaponScope: this.weaponScope,
      diagnosticActions: this.intentMap.diagnosticActions
    });
    const seed = this.actor.currentSignature(this.transitionDefaults);
    this.candidates = entries
      .map(entry => scoreCandidate(seed, entry, this.transitionDefaults, this.recentUse))
      .sort((a, b) => a.cost - b.cost || (a.entry.clip.id || "").localeCompare(b.entry.clip.id || ""));
    this.selectedIndex = this.candidates.length ? 0 : -1;
    this.syncActorSummary();
    return this.candidates;
  }

  refresh() {
    return this.query(this.activeIntent?.id);
  }

  setDiagnostics(value) {
    this.includeDiagnostics = value === true;
    return this.refresh();
  }

  setWeaponScope(scope) {
    this.weaponScope = scope || this.intentMap.defaultWeaponScope || "unarmed";
    return this.refresh();
  }

  select(index) {
    this.selectedIndex = Math.max(-1, Math.min(index, this.candidates.length - 1));
    this.syncActorSummary();
    return this.selectedCandidate();
  }

  selectedCandidate() {
    return this.candidates[this.selectedIndex] || this.candidates[0] || null;
  }

  playBest() {
    this.select(0);
    return this.playSelected();
  }

  playSelected() {
    const candidate = this.selectedCandidate();
    if (!candidate) return null;
    this.actor.playTransition(candidate, this.transitionDefaults, this.rootMotionPlan(candidate.entry));
    this.recentUse.record(candidate.entry.clip.id || "clip");
    this.syncActorSummary(candidate);
    return candidate;
  }

  playDirect(entry) {
    if (!entry) return null;
    this.actor.play(entry, this.rootMotionPlan(entry));
    this.recentUse.record(entry.clip.id || "clip");
    this.syncActorSummary();
    return entry;
  }

  resetSeed() {
    this.actor.seed(this.library);
    this.recentUse.clear();
    return this.refresh();
  }

  snapshot() {
    const selected = this.selectedCandidate();
    return {
      intent: this.activeIntent,
      candidateCount: this.candidates.length,
      selected,
      selectedPolicy: selected ? this.rootMotionPlan(selected.entry) : null,
      includeDiagnostics: this.includeDiagnostics,
      weaponScope: this.weaponScope,
      recentUse: this.recentUse.snapshot()
    };
  }

  syncActorSummary(candidate = this.selectedCandidate()) {
    this.actor.setSolverSummary({
      intentId: this.activeIntent?.id || "",
      intentLabel: this.activeIntent?.label || "",
      candidateCount: this.candidates.length,
      selectedCost: candidate?.cost ?? null,
      selectedScore: candidate?.score ?? null,
      selectedPolicyId: candidate ? this.rootMotionPlan(candidate.entry).id : "",
      weaponScope: this.weaponScope,
      includeDiagnostics: this.includeDiagnostics
    });
  }

  rootMotionPlan(entry) {
    return resolveRootMotionPolicy(entry, this.rootMotionPolicies, this.clipPolicyOverrides);
  }
}
