export class StageScene {
  constructor(stage, layers) {
    this.stage = stage;
    this.layers = [...layers.layers].sort((a, b) => a.order - b.order);
    this.elapsed = 0;
  }

  load() {
    return Promise.resolve();
  }

  update(dt) {
    this.elapsed += dt;
  }

  render(renderer, alpha, actors = []) {
    renderer.beginFrame(this.stage.background);
    for (const layer of this.layers) {
      renderer.drawLayer(layer.id, this.stage.primitives || []);
      if (layer.id === "actors") {
        for (const actor of actors) {
          renderer.drawStick17Actor(actor);
          if (actor.rootDebugEnabled) renderer.drawStick17ActorDebug(actor);
        }
      }
    }
    renderer.endFrame();
  }

  dispose() {}
}
