// Keeps repeated compatible clips from winning every query without banning them.
export class RecentUseTracker {
  constructor(defaults = {}) {
    this.defaults = defaults;
    this.history = [];
  }

  record(id) {
    if (!id) return;
    this.history.push(id);
    this.history = this.history.slice(-this.historyLimit());
  }

  penalty(id) {
    if (!id) return 0;
    let penalty = 0;
    const recent = this.history.slice(-this.window());
    recent.forEach((seen, index) => {
      if (seen !== id) return;
      penalty += index === recent.length - 1 ? this.immediatePenalty() : this.repeatPenalty();
    });
    return penalty;
  }

  clear() {
    this.history = [];
  }

  snapshot() {
    return [...this.history];
  }

  window() {
    return this.defaults.window ?? 5;
  }

  historyLimit() {
    return this.defaults.historyLimit ?? 12;
  }

  immediatePenalty() {
    return this.defaults.immediatePenalty ?? 0.08;
  }

  repeatPenalty() {
    return this.defaults.repeatPenalty ?? 0.025;
  }
}
