// TODO: Add a WebGL2 renderer after gameplay events and typography needs are stable.
// Keep this module as the planned backend seam so Canvas2D drawing calls do not
// leak into engine, input, or combat systems.
export class WebGL2Renderer {
  constructor() {
    throw new Error("WebGL2Renderer is planned but not implemented in Slice 1.");
  }
}
