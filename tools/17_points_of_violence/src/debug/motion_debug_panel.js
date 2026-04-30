import { weaponScopesForLibrary } from "../motion/intent_query.js";

export class MotionDebugPanel {
  constructor(element, { library, actor, solver, onHold, onResetSeed }) {
    this.element = element;
    this.library = library;
    this.actor = actor;
    this.solver = solver;
    this.onHold = onHold;
    this.onResetSeed = onResetSeed;
    this.lastRenderKey = "";
    this.renderShell();
    this.populateWeaponScopes();
    this.populateClips();
    this.renderIntentButtons();
    this.renderCandidates();
  }

  selectedEntry() {
    const id = this.element.querySelector("[data-motion-clip]")?.value || "";
    return this.library.findById(id);
  }

  renderShell() {
    this.element.innerHTML = `
      <div class="motion-panel-title">Motion Solver</div>
      <label>Weapon Scope<select data-motion-weapon></select></label>
      <label class="motion-panel-toggle"><input data-motion-diagnostics type="checkbox" /> diagnostics</label>
      <div data-motion-intents class="motion-intent-grid"></div>
      <div class="motion-panel-buttons">
        <button data-motion-play-best>Play Best</button>
        <button data-motion-play-selected>Play Selected</button>
        <button data-motion-hold>Hold</button>
        <button data-motion-reset>Reset Seed</button>
      </div>
      <div data-motion-summary class="motion-panel-summary"></div>
      <div class="motion-root-debug">
        <label class="motion-panel-toggle"><input data-root-debug type="checkbox" /> root debug</label>
        <div data-root-summary class="motion-panel-summary"></div>
      </div>
      <div data-motion-candidates class="motion-candidate-list"></div>
      <details class="motion-direct-debug">
        <summary>Direct Clip Debug</summary>
        <label>Clip<select data-motion-clip></select></label>
        <button data-motion-direct-play>Play Clip</button>
      </details>`;

    this.element.querySelector("[data-motion-play-best]").onclick = () => this.playCandidate("best");
    this.element.querySelector("[data-motion-play-selected]").onclick = () => this.playCandidate("selected");
    this.element.querySelector("[data-motion-hold]").onclick = () => this.onHold();
    this.element.querySelector("[data-motion-reset]").onclick = () => {
      this.onResetSeed();
      this.populateClips();
      this.renderCandidates(true);
    };
    this.element.querySelector("[data-motion-direct-play]").onclick = () => {
      this.solver.playDirect(this.selectedEntry());
      this.renderCandidates(true);
    };
    this.element.querySelector("[data-motion-diagnostics]").onchange = event => {
      this.solver.setDiagnostics(event.target.checked);
      this.populateClips();
      this.renderIntentButtons();
      this.renderCandidates(true);
    };
    this.element.querySelector("[data-motion-weapon]").onchange = event => {
      this.solver.setWeaponScope(event.target.value);
      this.renderCandidates(true);
    };
    this.element.querySelector("[data-root-debug]").checked = this.actor.rootDebugEnabled;
    this.element.querySelector("[data-root-debug]").onchange = event => {
      this.actor.setRootDebugEnabled(event.target.checked);
    };
  }

  populateWeaponScopes() {
    const select = this.element.querySelector("[data-motion-weapon]");
    select.innerHTML = "";
    for (const scope of weaponScopesForLibrary(this.library)) {
      const option = document.createElement("option");
      option.value = scope;
      option.textContent = scope === "all" ? "all scopes" : scope;
      select.appendChild(option);
    }
    select.value = this.solver.weaponScope;
  }

  populateClips() {
    const select = this.element.querySelector("[data-motion-clip]");
    const current = select.value;
    const entries = this.solver.includeDiagnostics ? this.library.entries : this.library.eligibleEntries();
    select.innerHTML = "";
    for (const entry of entries) {
      const option = document.createElement("option");
      option.value = entry.clip.id;
      const c = entry.classification || {};
      option.textContent = `${entry.clip.id} (${c.actionType || "unknown"} ${c.targetZone || ""})`;
      select.appendChild(option);
    }
    if (entries.some(entry => entry.clip.id === current)) select.value = current;
  }

  renderIntentButtons() {
    const grid = this.element.querySelector("[data-motion-intents]");
    grid.innerHTML = "";
    for (const intent of this.solver.intentMap.intents || []) {
      if (intent.diagnosticsOnly && !this.solver.includeDiagnostics) continue;
      const button = document.createElement("button");
      button.textContent = intent.label;
      button.dataset.intent = intent.id;
      button.className = intent.id === this.solver.activeIntent?.id ? "active" : "";
      button.onclick = () => {
        this.solver.query(intent.id);
        this.renderIntentButtons();
        this.renderCandidates(true);
      };
      grid.appendChild(button);
    }
  }

  renderCandidates(force = false) {
    const list = this.element.querySelector("[data-motion-candidates]");
    const candidates = this.solver.candidates.slice(0, this.solver.intentMap.candidateLimit || 10);
    const key = candidates.map(candidate => `${candidate.entry.clip.id}:${candidate.cost.toFixed(4)}`).join("|")
      + `:${this.solver.selectedIndex}:${this.solver.activeIntent?.id}:${this.solver.includeDiagnostics}:${this.solver.weaponScope}`;
    if (!force && key === this.lastRenderKey) return;
    this.lastRenderKey = key;
    list.innerHTML = "";
    if (!candidates.length) {
      const empty = document.createElement("div");
      empty.className = "motion-candidate-empty";
      empty.textContent = "No matching candidates.";
      list.appendChild(empty);
      return;
    }
    for (const [index, candidate] of candidates.entries()) {
      const c = candidate.entry.classification || {};
      const button = document.createElement("button");
      button.className = `motion-candidate${index === this.solver.selectedIndex ? " active" : ""}`;
      button.onclick = () => {
        this.solver.select(index);
        this.renderCandidates(true);
      };
      button.ondblclick = () => this.playCandidate("selected");
      const turn = c.turnType && c.turnType !== "none" ? ` ${c.turnType}` : "";
      button.innerHTML = `
        <span><b>${escapeHtml(candidate.entry.clip.id || "clip")}</b><br>
        <small>${escapeHtml(c.actionType || "unknown")} ${escapeHtml(c.targetZone || "")} ${escapeHtml(c.movementType || "")}${escapeHtml(turn)}</small></span>
        <span class="motion-score">${candidate.score.toFixed(3)} / ${candidate.cost.toFixed(3)}</span>`;
      list.appendChild(button);
    }
  }

  playCandidate(which) {
    const candidate = which === "best" ? this.solver.playBest() : this.solver.playSelected();
    if (candidate) this.renderCandidates(true);
  }

  update() {
    const snap = this.actor.snapshot();
    const summary = this.element.querySelector("[data-motion-summary]");
    const solver = snap.solver || {};
    const transition = snap.transition || {};
    const cost = Number.isFinite(transition.cost) ? transition.cost : solver.selectedCost;
    const score = Number.isFinite(transition.score) ? transition.score : solver.selectedScore;
    summary.textContent = [
      `${snap.mode}; ${snap.clipId}; frame ${Math.min(snap.frame + 1, snap.frameCount)} / ${snap.frameCount}`,
      solver.intentLabel ? `intent ${solver.intentLabel}` : "",
      `candidates ${solver.candidateCount ?? 0}`,
      Number.isFinite(cost) ? `cost ${formatNumber(cost)} score ${formatNumber(score)}` : "",
      `${solver.weaponScope || "unarmed"}${solver.includeDiagnostics ? " diagnostics" : ""}`
    ].filter(Boolean).join("; ");
    this.updateRootSummary(snap.root || {});
    this.renderCandidates();
  }

  updateRootSummary(root) {
    const summary = this.element.querySelector("[data-root-summary]");
    const bounds = root.gameplayBounds || {};
    const displacement = root.displacement || { x: 0, y: 0 };
    summary.textContent = [
      `policy ${root.policyId || "none"}`,
      root.worldRoot ? `root ${formatNumber(root.worldRoot.x)}, ${formatNumber(root.worldRoot.y)}` : "",
      `move ${formatNumber(displacement.x)}, ${formatNumber(displacement.y)}`,
      Number.isFinite(bounds.w) ? `bounds ${formatNumber(bounds.w)} x ${formatNumber(bounds.h)}` : ""
    ].filter(Boolean).join("; ");
  }
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(3) : "";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch]));
}
