export class DebugOverlay {
  constructor(element, defaults) {
    this.element = element;
    this.defaults = defaults;
    this.enabled = defaults.enabled === true;
    this.elapsed = 0;
  }

  update(dt, snapshot) {
    this.elapsed += dt;
    if (!this.enabled || this.elapsed < (this.defaults.refreshSeconds || 0.12)) return;
    this.elapsed = 0;
    const loaded = snapshot.loadedData.map(item => `<li>${escapeHtml(item)}</li>`).join("");
    this.element.innerHTML = `
      <div><b>17 POV Debug</b></div>
      <div>FPS: ${snapshot.fps.toFixed(1)} | Frame: ${snapshot.frameMs.toFixed(2)}ms</div>
      <div>Updates: ${snapshot.updatesThisFrame} / ${snapshot.totalUpdates}</div>
      <div>Scene: ${escapeHtml(snapshot.scene)}</div>
      <div>Input: ${escapeHtml(snapshot.inputMode)} | Move: ${snapshot.move.x.toFixed(2)}, ${snapshot.move.y.toFixed(2)}</div>
      <div>Motion: ${snapshot.motion.clipCount} clips / ${snapshot.motion.matchedOverrides} sidecar matches</div>
      <div>Actor: ${escapeHtml(snapshot.motion.mode)} ${escapeHtml(snapshot.motion.clipId)} ${snapshot.motion.frame + 1}/${snapshot.motion.frameCount}</div>
      <div>Solver: ${escapeHtml(snapshot.motion.intent)} | ${snapshot.motion.candidateCount} candidates | ${escapeHtml(snapshot.motion.weaponScope)}</div>
      <div>${formatRoot(snapshot.motion.root)}</div>
      <div>${formatTransition(snapshot.motion)}${snapshot.motion.includeDiagnostics ? " | diagnostics" : ""}</div>
      <div>${escapeHtml(snapshot.motion.classification)}</div>
      <ul>${loaded}</ul>`;
  }

  render() {
    this.element.hidden = !this.enabled;
  }

  toggle() {
    this.enabled = !this.enabled;
    this.render();
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch]));
}

function formatTransition(motion) {
  const cost = Number.isFinite(motion.transition?.cost) ? motion.transition.cost : motion.selectedCost;
  const score = Number.isFinite(motion.transition?.score) ? motion.transition.score : motion.selectedScore;
  if (!Number.isFinite(cost)) return "Transition: none";
  return `Transition: cost ${cost.toFixed(3)} score ${score.toFixed(3)}`;
}

function formatRoot(root) {
  if (!root?.worldRoot) return "Root: none";
  return `Root: ${escapeHtml(root.policyId)} @ ${root.worldRoot.x.toFixed(1)}, ${root.worldRoot.y.toFixed(1)}`;
}
