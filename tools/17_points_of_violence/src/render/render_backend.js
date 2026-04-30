export class RenderBackend {
  beginFrame() {
    throw new Error("beginFrame must be implemented by a renderer backend.");
  }

  drawLayer() {
    throw new Error("drawLayer must be implemented by a renderer backend.");
  }

  endFrame() {
    throw new Error("endFrame must be implemented by a renderer backend.");
  }
}
