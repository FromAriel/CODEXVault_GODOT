export class GameLoop {
  constructor({ fixedStepSeconds, maxAccumulatedSeconds, update, render }) {
    this.fixedStepSeconds = fixedStepSeconds;
    this.maxAccumulatedSeconds = maxAccumulatedSeconds;
    this.update = update;
    this.render = render;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.frameStats = {
      fps: 0,
      frameMs: 0,
      updatesThisFrame: 0,
      totalUpdates: 0
    };
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(time => this.tick(time));
  }

  stop() {
    this.running = false;
  }

  tick(now) {
    if (!this.running) return;
    const deltaSeconds = Math.min(this.maxAccumulatedSeconds, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.accumulator += deltaSeconds;
    this.frameStats.updatesThisFrame = 0;

    while (this.accumulator >= this.fixedStepSeconds) {
      this.update(this.fixedStepSeconds);
      this.accumulator -= this.fixedStepSeconds;
      this.frameStats.updatesThisFrame++;
      this.frameStats.totalUpdates++;
    }

    const alpha = this.accumulator / this.fixedStepSeconds;
    this.frameStats.frameMs = deltaSeconds * 1000;
    this.frameStats.fps = deltaSeconds > 0 ? 1 / deltaSeconds : 0;
    this.render(alpha, this.frameStats);
    requestAnimationFrame(time => this.tick(time));
  }
}
