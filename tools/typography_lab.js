(function () {
  "use strict";

  const WIDTH = 512;
  const HEIGHT = 320;
  const FLOOR_Y = 262;
  const PAPER = "#f8f7f0";
  const BLACK = "#050505";
  const RED = "#d90000";
  const YELLOW = "#f2c300";
  const SOFT_INK = "#595959";
  const FRAME_STEP = 1 / 60;
  const PHASE_ORDER = ["impact", "build", "read", "move", "separate", "fade"];
  const DEFAULT_REVIEW_SPEED = 1.5;
  const SAMPLE_CARD_CONTROLLER_FIT_SCALE = 0.62;

  const state = {
    playing: true,
    playbackSpeed: DEFAULT_REVIEW_SPEED,
    focusId: "all",
    scrubTime: 0,
    scrubMax: 2,
    autoplay: true,
    slowMotion: false,
    reducedFlash: false,
    guides: true,
    protectedLane: true,
    wordBounds: false,
    intensity: 1,
    samples: []
  };

  const glyphFontListeners = [];

  function glyphAssetMap() {
    const assets = window.STICKY_TYPOGRAPHY_GLYPH_ASSETS;
    return assets && typeof assets === "object" ? assets : {};
  }

  function availableGlyphAssets() {
    const assets = Object.values(glyphAssetMap()).filter(asset => asset?.fontId && asset?.glyphs);
    return assets.sort((a, b) => {
      if (a.fontId === "tac_one") return -1;
      if (b.fontId === "tac_one") return 1;
      return String(a.family || a.fontId).localeCompare(String(b.family || b.fontId));
    });
  }

  function glyphAssetLabel(asset) {
    return asset?.family || asset?.fontId || "Unknown font";
  }

  function selectedGlyphFontId() {
    const select = document.querySelector("[data-glyph-font]");
    const assets = glyphAssetMap();
    if (select?.value && assets[select.value]) return select.value;
    if (assets.tac_one) return "tac_one";
    const first = availableGlyphAssets()[0];
    return first?.fontId || "";
  }

  function selectedGlyphAsset() {
    const assets = glyphAssetMap();
    const selected = assets[selectedGlyphFontId()];
    return selected || assets.tac_one || availableGlyphAssets()[0] || null;
  }

  function updateGlyphFontDetail() {
    const detail = document.querySelector("[data-glyph-font-detail]");
    if (!detail) return;
    const asset = selectedGlyphAsset();
    if (!asset) {
      detail.textContent = "No generated glyph assets loaded.";
      return;
    }
    const summary = asset.summary || {};
    detail.textContent = `${glyphAssetLabel(asset)} · ${asset.role || "impact"} · ${summary.totalCurves || asset.curves?.length || 0} curves · max band ${summary.maxCurvesPerBand || 0}`;
  }

  function renderCurrentSamples() {
    for (const sample of state.samples || []) {
      sample.render(clamp(sample.elapsed || 0, 0, sample.definition.duration));
    }
  }

  function onGlyphFontChange(listener) {
    glyphFontListeners.push(listener);
  }

  function populateGlyphFontSelect() {
    const select = document.querySelector("[data-glyph-font]");
    if (!select) return;
    const assets = availableGlyphAssets();
    const previous = select.value || "tac_one";
    select.textContent = "";
    for (const asset of assets) {
      const option = document.createElement("option");
      option.value = asset.fontId;
      option.textContent = glyphAssetLabel(asset);
      select.appendChild(option);
    }
    if (assets.length > 0) {
      select.value = assets.some(asset => asset.fontId === previous) ? previous : selectedGlyphFontId();
    }
    if (!select.dataset.glyphFontWired) {
      select.dataset.glyphFontWired = "true";
      select.addEventListener("change", () => {
        updateGlyphFontDetail();
        renderCurrentSamples();
        for (const listener of glyphFontListeners) listener(selectedGlyphAsset());
      });
    }
    updateGlyphFontDetail();
  }

  class TextBody {
    constructor(options = {}) {
      this.id = options.id || "";
      this.tier = options.tier || "combat";
      this.text = options.text || "POW";
      this.styleToken = options.styleToken || "impact";
      this.fontToken = options.fontToken || "impact";
      this.position = { ...(options.position || { x: 0, y: 0 }) };
      this.velocity = { ...(options.velocity || { x: 0, y: 0 }) };
      this.rotation = options.rotation || 0;
      this.angularVelocity = options.angularVelocity || 0;
      this.scale = options.scale ?? 1;
      this.scaleX = options.scaleX ?? 1;
      this.scaleY = options.scaleY ?? 1;
      this.opacity = options.opacity ?? 1;
      this.size = options.size || 64;
      this.weight = options.weight || 900;
      this.fill = options.fill || BLACK;
      this.stroke = options.stroke || "white";
      this.strokeWidth = options.strokeWidth ?? 6;
      this.readableHoldSeconds = options.readableHoldSeconds || 0.16;
      this.lifetimeSeconds = options.lifetimeSeconds || 0.8;
      this.sourcePoint = options.sourcePoint || null;
      this.forceVector = options.forceVector || { x: 1, y: 0 };
      this.breakupMode = options.breakupMode || "none";
      this.glyphMode = options.glyphMode || "word";
    }
  }

  class GlyphBody {
    constructor(options = {}) {
      this.wordId = options.wordId || "";
      this.glyphIndex = options.glyphIndex || 0;
      this.char = options.char || "";
      this.glyphId = options.glyphId || this.char;
      this.localAdvance = options.localAdvance || 0;
      this.localOffset = { ...(options.localOffset || { x: 0, y: 0 }) };
      this.position = { ...(options.position || { x: 0, y: 0 }) };
      this.velocity = { ...(options.velocity || { x: 0, y: 0 }) };
      this.rotation = options.rotation || 0;
      this.angularVelocity = options.angularVelocity || 0;
      this.scale = options.scale ?? 1;
      this.scaleX = options.scaleX ?? 1;
      this.scaleY = options.scaleY ?? 1;
      this.opacity = options.opacity ?? 1;
      this.phase = options.phase || 0;
      this.role = options.role || "read";
    }
  }

  class ChoreographyPreset {
    constructor(options = {}, sample = {}) {
      this.id = options.id || "main";
      this.text = options.text || "POW";
      this.styleToken = options.styleToken || "impact";
      this.fontToken = options.fontToken || "impact";
      this.style = { ...(options.style || {}) };
      this.phases = normalizePhaseList(options.phases || sample.phases || [], sample.duration || 1);
      this.origin = { ...(options.origin || { x: 360, y: 120 }) };
      this.direction = normalize(options.direction || { x: 1, y: 0 });
      this.path = options.path ? {
        ...options.path,
        start: { ...(options.path.start || this.origin) },
        control: { ...(options.path.control || this.origin) },
        end: { ...(options.path.end || this.origin) }
      } : null;
      this.rotation = options.rotation || 0;
      this.opacity = options.opacity ?? 1;
      this.trailSteps = options.trailSteps ?? 3;
      this.trailPhase = options.trailPhase || "move";
      this.protectedLane = options.protectedLane || null;
      this.build = {
        entryDistance: 18,
        settleDistance: 8,
        birthSeconds: 0.15,
        ...options.build
      };
      this.motion = {
        distance: 42,
        postDriftSpeed: 26,
        yScale: 0.55,
        ...options.motion
      };
      this.separate = {
        forwardDistance: 24,
        spreadDistance: 14,
        gravity: 16,
        rotation: 0.18,
        ...options.separate
      };
      this.squash = {
        amount: 0,
        start: null,
        end: null,
        ...options.squash
      };
      this.boundsPadding = options.boundsPadding ?? 10;
      this.controller = options.controller || null;
    }

    phase(name) {
      return this.phases.find(phase => phase.name === name) || null;
    }
  }

  class CanvasTextRenderer {
    constructor(ctx) {
      this.ctx = ctx;
    }

    font(style = {}) {
      const weight = style.weight || 900;
      const size = style.size || 64;
      const family = style.font || "Impact, Arial Black, sans-serif";
      return `${weight} ${size}px ${family}`;
    }

    measureWord(text, style = {}) {
      const ctx = this.ctx;
      ctx.save();
      ctx.font = this.font(style);
      const width = ctx.measureText(String(text || "")).width;
      ctx.restore();
      return {
        width,
        height: style.size || 64
      };
    }

    layoutGlyphs(text, style = {}) {
      const ctx = this.ctx;
      const chars = Array.from(String(text || ""));
      const tracking = style.tracking ?? 2;
      ctx.save();
      ctx.font = this.font(style);
      const widths = chars.map(char => ctx.measureText(char).width + tracking);
      const total = widths.reduce((sum, value) => sum + value, 0);
      let cursor = -total * 0.5;
      const glyphs = chars.map((char, index) => {
        const width = widths[index];
        const x = cursor + width * 0.5;
        cursor += width;
        return new GlyphBody({
          glyphIndex: index,
          char,
          glyphId: char,
          localAdvance: width,
          localOffset: { x, y: 0 },
          role: "layout"
        });
      });
      ctx.restore();
      return glyphs;
    }

    drawWord(body) {
      const ctx = this.ctx;
      if (!body || !body.text || body.opacity <= 0) return;
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.rotation || 0);
      ctx.scale((body.scale || 1) * (body.scaleX || 1), (body.scale || 1) * (body.scaleY || 1));
      ctx.globalAlpha = clamp(body.opacity ?? 1, 0, 1);
      ctx.font = this.font(body);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      if ((body.strokeWidth || 0) > 0) {
        ctx.strokeStyle = body.stroke || "white";
        ctx.lineWidth = body.strokeWidth;
        ctx.strokeText(body.text, 0, 0);
      }
      ctx.fillStyle = body.fill || BLACK;
      ctx.fillText(body.text, 0, 0);
      ctx.restore();
    }

    drawGlyphs(glyphs, style = {}) {
      const ctx = this.ctx;
      ctx.save();
      ctx.font = this.font(style);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      for (const glyph of glyphs) {
        if (!glyph.char || glyph.opacity <= 0) continue;
        ctx.save();
        ctx.translate(glyph.position.x, glyph.position.y);
        ctx.rotate(glyph.rotation || 0);
        ctx.scale((glyph.scale || 1) * (glyph.scaleX || 1), (glyph.scale || 1) * (glyph.scaleY || 1));
        ctx.globalAlpha = clamp(glyph.opacity ?? 1, 0, 1);
        if ((style.strokeWidth || 0) > 0) {
          ctx.strokeStyle = style.stroke || "white";
          ctx.lineWidth = style.strokeWidth;
          ctx.strokeText(glyph.char, 0, 0);
        }
        ctx.fillStyle = style.fill || BLACK;
        ctx.fillText(glyph.char, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  class StaticGlyphCanvasRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
    }

    draw(asset, settings) {
      const geometry = buildStaticWordGeometry(asset, settings, this.canvas.width, this.canvas.height);
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      drawStaticGuides(ctx, geometry, settings);
      const path = pathForStaticGeometry(geometry);
      ctx.save();
      ctx.fillStyle = BLACK;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1.25;
      ctx.fill(path, "evenodd");
      ctx.stroke(path);
      ctx.restore();
      drawStaticOverlays(ctx, geometry, settings);
      drawSampleFrame(ctx);
      return geometry;
    }
  }

  class WebGpuStaticGlyphRenderer {
    constructor(canvas, status, detail) {
      this.canvas = canvas;
      this.status = status;
      this.detail = detail;
      this.device = null;
      this.context = null;
      this.pipeline = null;
      this.format = "unknown";
      this.initPromise = null;
    }

    async render(geometry) {
      if (!geometry) return;
      if (!("gpu" in navigator)) {
        this.drawUnavailable("WebGPU unavailable", "Canvas fallback is the active renderer.");
        return;
      }
      try {
        await this.init();
        this.drawGeometry(geometry);
        this.status.textContent = "WebGPU static render complete.";
        const truncated = geometry.truncated ? " Segment cap warning: geometry was truncated." : "";
        this.detail.textContent = `Rendered ${geometry.word} with ${geometry.fillRule} fill from ${geometry.segments.length} uploaded segments.${truncated}`;
      } catch (error) {
        this.drawUnavailable("WebGPU render unavailable", error?.message || "Unknown WebGPU failure.");
      }
    }

    async init() {
      if (this.pipeline) return;
      if (this.initPromise) return this.initPromise;
      this.initPromise = this.initDevice();
      return this.initPromise;
    }

    async initDevice() {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error("navigator.gpu exists, but no adapter was granted.");
      this.device = await adapter.requestDevice();
      this.format = typeof navigator.gpu.getPreferredCanvasFormat === "function"
        ? navigator.gpu.getPreferredCanvasFormat()
        : "bgra8unorm";
      this.context = this.canvas.getContext("webgpu");
      if (!this.context) throw new Error("Unable to create a WebGPU canvas context.");
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      });
      const module = this.device.createShaderModule({ code: STATIC_GLYPH_WGSL });
      this.pipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module,
          entryPoint: "vs_main"
        },
        fragment: {
          module,
          entryPoint: "fs_main",
          targets: [{ format: this.format }]
        },
        primitive: { topology: "triangle-list" }
      });
    }

    drawGeometry(geometry) {
      const device = this.device;
      const segmentFloats = flattenSegmentsForGpu(geometry.segments);
      const segmentBuffer = createGpuBuffer(
        device,
        segmentFloats,
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      );
      const uniforms = new Float32Array([
        this.canvas.width,
        this.canvas.height,
        Math.min(geometry.segments.length, MAX_GPU_SEGMENTS),
        0
      ]);
      const uniformBuffer = createGpuBuffer(
        device,
        uniforms,
        GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      );
      const bindGroup = device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: segmentBuffer } },
          { binding: 1, resource: { buffer: uniformBuffer } }
        ]
      });
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.9725, g: 0.9686, b: 0.9412, a: 1 },
          loadOp: "clear",
          storeOp: "store"
        }]
      });
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    }

    drawUnavailable(title, detail) {
      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = PAPER;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = BLACK;
        ctx.font = "900 28px Impact, Arial Black, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GPU PENDING", this.canvas.width * 0.5, this.canvas.height * 0.46);
        ctx.font = "700 13px Arial, sans-serif";
        ctx.fillText("Canvas fallback remains active", this.canvas.width * 0.5, this.canvas.height * 0.6);
        drawSampleFrame(ctx);
      }
      this.status.textContent = title;
      this.detail.textContent = detail;
    }
  }

  class StaticGlyphLab {
    constructor() {
      this.wordSelect = document.querySelector("[data-wgsl-word]");
      this.sizeSelect = document.querySelector("[data-wgsl-size]");
      this.transformSelect = document.querySelector("[data-wgsl-transform]");
      this.renderButton = document.querySelector("[data-wgsl-render]");
      this.status = document.querySelector("[data-wgsl-status]");
      this.detail = document.querySelector("[data-wgsl-detail]");
      this.metrics = document.querySelector("[data-wgsl-metrics]");
      this.statusRow = document.querySelector(".wgsl-status-row");
      this.debugControls = {
        showBounds: document.querySelector("[data-wgsl-show-bounds]"),
        showContours: document.querySelector("[data-wgsl-show-contours]"),
        showSegments: document.querySelector("[data-wgsl-show-segments]"),
        showBaseline: document.querySelector("[data-wgsl-show-baseline]"),
        showStatus: document.querySelector("[data-wgsl-show-status]"),
        showCapWarning: document.querySelector("[data-wgsl-show-cap-warning]")
      };
      this.canvasRenderer = new StaticGlyphCanvasRenderer(document.querySelector("[data-static-canvas]"));
      this.gpuRenderer = new WebGpuStaticGlyphRenderer(
        document.querySelector("[data-wgsl-canvas]"),
        this.status,
        this.detail
      );
      const rerender = () => this.render();
      this.renderButton.addEventListener("click", rerender);
      for (const input of [this.wordSelect, this.sizeSelect, this.transformSelect]) {
        input?.addEventListener("change", rerender);
      }
      for (const input of Object.values(this.debugControls)) {
        input?.addEventListener("change", rerender);
      }
      onGlyphFontChange(rerender);
      this.render();
    }

    settings() {
      const asset = selectedGlyphAsset();
      const word = normalizeStaticWord(this.wordSelect?.value, asset);
      const size = STATIC_SIZE_PRESETS[this.sizeSelect?.value] ? this.sizeSelect.value : "normal";
      const transform = STATIC_TRANSFORM_PRESETS[this.transformSelect?.value] ? this.transformSelect.value : "none";
      return {
        word,
        size,
        transform,
        fillRule: "evenodd",
        showBounds: Boolean(this.debugControls.showBounds?.checked),
        showContours: Boolean(this.debugControls.showContours?.checked),
        showSegments: Boolean(this.debugControls.showSegments?.checked),
        showBaseline: Boolean(this.debugControls.showBaseline?.checked),
        showStatus: Boolean(this.debugControls.showStatus?.checked),
        showCapWarning: Boolean(this.debugControls.showCapWarning?.checked)
      };
    }

    render() {
      const asset = selectedGlyphAsset();
      if (!asset) {
        this.status.textContent = "Glyph asset bridge missing.";
        this.detail.textContent = "Run the font preprocessor or check tac_one_glyph_asset.generated.js.";
        return;
      }
      const settings = this.settings();
      if (this.wordSelect) this.wordSelect.value = settings.word;
      if (this.sizeSelect) this.sizeSelect.value = settings.size;
      if (this.transformSelect) this.transformSelect.value = settings.transform;
      if (this.statusRow) this.statusRow.hidden = !settings.showStatus;
      const geometry = this.canvasRenderer.draw(asset, settings);
      this.metrics.textContent = staticMetricsText(asset, geometry);
      this.metrics.classList.toggle("warning", Boolean(geometry.truncated && settings.showCapWarning));
      this.status.textContent = `Canvas fallback rendered from ${glyphAssetLabel(asset)} curves.`;
      this.detail.textContent = `Attempting isolated WebGPU ${settings.fillRule} render for comparison.`;
      this.gpuRenderer.render(geometry);
    }
  }

  const MAX_GPU_SEGMENTS = 4096;
  const STATIC_SIZE_PRESETS = {
    small: { label: "small", scale: 0.48 },
    normal: { label: "normal", scale: 0.82 },
    huge: { label: "huge", scale: 1.22 }
  };
  const STATIC_TRANSFORM_PRESETS = {
    none: { label: "none", rotation: 0, scaleX: 1, scaleY: 1 },
    rotated: { label: "rotated", rotation: -0.16, scaleX: 1, scaleY: 1 },
    wide: { label: "stretched wide", rotation: 0, scaleX: 1.34, scaleY: 0.88 },
    tall: { label: "stretched tall", rotation: 0, scaleX: 0.88, scaleY: 1.28 }
  };
  const STATIC_GLYPH_WGSL = `
struct Segment {
  a: vec4f,
  b: vec4f,
};

struct Uniforms {
  canvas: vec4f,
};

@group(0) @binding(0) var<storage, read> segments: array<Segment>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

struct VertexOut {
  @builtin(position) position: vec4f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOut {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var out: VertexOut;
  out.position = vec4f(positions[vertex_index], 0.0, 1.0);
  return out;
}

fn line_cross(point: vec2f, a: vec2f, b: vec2f) -> u32 {
  let min_y = min(a.y, b.y);
  let max_y = max(a.y, b.y);
  if (point.y < min_y || point.y >= max_y || abs(b.y - a.y) < 0.0001) {
    return 0u;
  }
  let x = a.x + (point.y - a.y) * (b.x - a.x) / (b.y - a.y);
  if (x > point.x) {
    return 1u;
  }
  return 0u;
}

fn quadratic_point(a: vec2f, b: vec2f, c: vec2f, t: f32) -> vec2f {
  let mt = 1.0 - t;
  return a * mt * mt + b * 2.0 * mt * t + c * t * t;
}

fn inside_at(point: vec2f) -> f32 {
  var hits: u32 = 0u;
  let count = u32(uniforms.canvas.z);
  for (var i: u32 = 0u; i < ${MAX_GPU_SEGMENTS}u; i = i + 1u) {
    if (i >= count) {
      break;
    }
    let segment = segments[i];
    let p0 = segment.a.xy;
    let p1 = segment.a.zw;
    let p2 = segment.b.xy;
    if (segment.b.z < 0.5) {
      hits = hits + line_cross(point, p0, p2);
    } else {
      var previous = p0;
      for (var step: u32 = 1u; step <= 14u; step = step + 1u) {
        let t = f32(step) / 14.0;
        let next = quadratic_point(p0, p1, p2, t);
        hits = hits + line_cross(point, previous, next);
        previous = next;
      }
    }
  }
  return f32(hits & 1u);
}

@fragment
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let offsets = array<vec2f, 9>(
    vec2f(0.0, 0.0),
    vec2f(-0.32, -0.32),
    vec2f(0.32, -0.32),
    vec2f(-0.32, 0.32),
    vec2f(0.32, 0.32),
    vec2f(-0.44, 0.0),
    vec2f(0.44, 0.0),
    vec2f(0.0, -0.44),
    vec2f(0.0, 0.44)
  );
  var coverage = 0.0;
  for (var i: u32 = 0u; i < 9u; i = i + 1u) {
    coverage = coverage + inside_at(position.xy + offsets[i]);
  }
  coverage = coverage / 9.0;
  let paper = vec3f(0.9725, 0.9686, 0.9412);
  let ink = vec3f(0.0196, 0.0196, 0.0196);
  return vec4f(mix(paper, ink, coverage), 1.0);
}
`;

  const MAX_ANIMATED_SEGMENTS = 4096;
  const MAX_ANIMATED_INSTANCES = 96;
  const ANIMATED_GLYPH_PRESETS = {
    "pow-force-wave": {
      title: "POW force wave",
      word: "POW!",
      duration: 2.45,
      fit: 0.76,
      fill: "#050505",
      anchor: { x: 250, y: 114 },
      direction: { x: 1, y: -0.08 },
      moveDistance: 46,
      separateDistance: 30,
      spreadDistance: 13,
      rotation: -0.04,
      behavior: "force",
      recipe: {
        mass: 1,
        drag: 2.15,
        angularDrag: 2.4,
        revealStarts: [0.14, 0.42, 0.7, 0.86],
        revealSeconds: [0.34, 0.42, 0.32, 0.24],
        entryDistance: 34,
        readableHoldSeconds: 0.28,
        impulses: [
          { start: 0.92, seconds: 0.44, force: { x: 430, y: -34 }, torque: -0.16 },
          { start: 1.26, seconds: 0.48, force: { x: 240, y: -28 }, torque: 0.1 }
        ],
        cohesion: { spring: 32, damping: 8.5, decayStart: 1.42, decaySeconds: 0.62 },
        scatter: { start: 1.48, seconds: 0.64, force: 82, spread: 58, gravity: 52, torque: 1.2 },
        fade: { start: 1.92, seconds: 0.48 },
        livingDrift: { amount: 1.4, hz: 1.1 },
        glyphAccents: [
          { index: 0, start: 0.2, seconds: 0.32, scaleX: 0.08, scaleY: 0.04 },
          { index: 1, start: 0.5, seconds: 0.36, scaleX: 0.11, scaleY: 0.11 },
          { index: 2, start: 0.77, seconds: 0.22, scaleX: 0.16, scaleY: -0.04 },
          { index: 3, start: 0.92, seconds: 0.18, scaleX: 0.08, scaleY: 0.04 }
        ]
      }
    },
    "whiff-ribbon": {
      title: "WHIFF ribbon",
      word: "WHIFF",
      duration: 2.25,
      fit: 0.62,
      fill: "#303030",
      anchor: { x: 260, y: 94 },
      direction: { x: 1, y: -0.18 },
      moveDistance: 74,
      separateDistance: 44,
      spreadDistance: 11,
      rotation: -0.12,
      behavior: "ribbon",
      recipe: {
        mass: 0.78,
        drag: 3.1,
        angularDrag: 4.2,
        revealStart: 0.12,
        revealStagger: 0.075,
        revealSeconds: 0.34,
        entryDistance: 26,
        readableHoldSeconds: 0.38,
        railPath: {
          start: { x: 184, y: 124 },
          control: { x: 300, y: 46 },
          end: { x: 430, y: 108 },
          startTime: 0.24,
          endTime: 1.52,
          spring: 34
        },
        impulses: [
          { start: 0.2, seconds: 0.76, force: { x: 74, y: -18 }, torque: 0.04 }
        ],
        cohesion: { spring: 22, damping: 10, decayStart: 1.48, decaySeconds: 0.54 },
        scatter: { start: 1.56, seconds: 0.42, force: 18, spread: 34, gravity: 8, torque: 0.24 },
        fade: { start: 1.62, seconds: 0.52 },
        ribbonScaleY: 0.76,
        livingDrift: { amount: 0, hz: 1 }
      }
    },
    "block-plate": {
      title: "BLOCK plate",
      word: "BLOCK",
      duration: 1.95,
      fit: 0.68,
      trackingEm: 0.095,
      fill: "#f2c300",
      outlineFill: "#050505",
      outlineScale: 1.055,
      contrastMode: "outlined",
      anchor: { x: 258, y: 118 },
      direction: { x: -0.18, y: 0 },
      moveDistance: 20,
      separateDistance: 14,
      spreadDistance: 3,
      rotation: 0,
      behavior: "plate",
      recipe: {
        mass: 1.8,
        drag: 5.4,
        angularDrag: 7,
        revealStart: 0.08,
        revealStagger: 0.045,
        revealSeconds: 0.28,
        entryDistance: 16,
        readableHoldSeconds: 0.36,
        impulses: [
          { start: 0.34, seconds: 0.22, force: { x: -132, y: 0 }, torque: -0.02 },
          { start: 0.58, seconds: 0.32, force: { x: 112, y: -8 }, torque: 0.05 }
        ],
        cohesion: { spring: 46, damping: 11, decayStart: 1.22, decaySeconds: 0.42, floor: 0.72 },
        scatter: { start: 1.34, seconds: 0.38, force: 18, spread: 9, gravity: 14, torque: 0.18 },
        fade: { start: 1.55, seconds: 0.36 },
        compression: { start: 0.36, seconds: 0.42, scaleX: 0.1, scaleY: -0.14 },
        plateLock: { start: 0.42, seconds: 0.34 },
        livingDrift: { amount: 0.35, hz: 1.6 }
      }
    },
    "finisher-curl": {
      title: "Finisher curl",
      word: "WHAM!",
      duration: 2.45,
      fit: 0.8,
      fill: "#050505",
      anchor: { x: 252, y: 112 },
      direction: { x: 1, y: -0.22 },
      moveDistance: 42,
      separateDistance: 72,
      spreadDistance: 18,
      rotation: -0.08,
      behavior: "curl",
      recipe: {
        mass: 1.2,
        drag: 1.75,
        angularDrag: 2.1,
        revealStart: 0.12,
        revealStagger: 0.055,
        revealSeconds: 0.34,
        entryDistance: 30,
        readableHoldSeconds: 0.3,
        impulses: [
          { start: 0.54, seconds: 0.78, force: { x: 315, y: -86 }, torque: -0.5 },
          { start: 1.1, seconds: 0.7, force: { x: 180, y: -38 }, torque: 0.4 }
        ],
        cohesion: { spring: 28, damping: 8, decayStart: 1.1, decaySeconds: 0.8 },
        scatter: { start: 1.12, seconds: 0.82, force: 72, spread: 82, gravity: 32, torque: 1.7, curl: 62 },
        fade: { start: 1.92, seconds: 0.48 },
        livingDrift: { amount: 1.2, hz: 0.9 }
      }
    },
    "mob-pressure": {
      title: "Mob pressure stress",
      word: "GO!",
      duration: 2.1,
      fit: 0.31,
      fill: "#050505",
      anchor: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      moveDistance: 18,
      separateDistance: 18,
      spreadDistance: 7,
      rotation: 0,
      behavior: "stress",
      recipe: {
        mass: 1,
        drag: 2.4,
        angularDrag: 3.2,
        revealStart: 0.08,
        revealStagger: 0.05,
        revealSeconds: 0.26,
        entryDistance: 12,
        readableHoldSeconds: 0.24,
        impulses: [
          { start: 0.28, seconds: 0.88, force: { x: 120, y: 0 }, torque: 0.08 }
        ],
        cohesion: { spring: 24, damping: 8, decayStart: 1.04, decaySeconds: 0.5 },
        scatter: { start: 1.05, seconds: 0.54, force: 32, spread: 30, gravity: 14, torque: 0.42 },
        fade: { start: 1.52, seconds: 0.46 },
        livingDrift: { amount: 3.2, hz: 1.4 },
        stress: true
      }
    }
  };

  ANIMATED_GLYPH_PRESETS["pow-rubber-smear"] = {
    ...ANIMATED_GLYPH_PRESETS["pow-force-wave"],
    title: "POW rubber smear",
    deformation: {
      type: "rubber_smear",
      start: 1.16,
      seconds: 0.68,
      strength: 0.82,
      curve: "pulse",
      maxOffsetEm: 0.13,
      axis: "x"
    }
  };

  ANIMATED_GLYPH_PRESETS["bam-impact-dent"] = {
    ...ANIMATED_GLYPH_PRESETS["pow-force-wave"],
    title: "BAM impact dent",
    word: "BAM!",
    duration: 2.25,
    fit: 0.72,
    anchor: { x: 250, y: 118 },
    direction: { x: 1, y: 0.02 },
    recipe: {
      ...ANIMATED_GLYPH_PRESETS["pow-force-wave"].recipe,
      revealStarts: [0.12, 0.34, 0.56, 0.7],
      revealSeconds: [0.3, 0.34, 0.32, 0.22],
      impulses: [
        { start: 0.72, seconds: 0.5, force: { x: 335, y: -10 }, torque: -0.08 },
        { start: 1.15, seconds: 0.5, force: { x: 180, y: 26 }, torque: 0.12 }
      ],
      cohesion: { spring: 34, damping: 8.8, decayStart: 1.3, decaySeconds: 0.56 },
      scatter: { start: 1.48, seconds: 0.56, force: 62, spread: 42, gravity: 46, torque: 0.72 },
      fade: { start: 1.82, seconds: 0.42 },
      livingDrift: { amount: 1, hz: 0.95 }
    },
    deformation: {
      type: "impact_dent",
      start: 0.8,
      seconds: 0.64,
      strength: 0.78,
      curve: "pulse",
      maxOffsetEm: 0.11,
      side: "left"
    }
  };

  ANIMATED_GLYPH_PRESETS["pow-crash-dent"] = {
    ...ANIMATED_GLYPH_PRESETS["pow-force-wave"],
    title: "POW crash dent",
    duration: 1.78,
    fit: 0.72,
    anchor: { x: 246, y: 116 },
    direction: { x: 1, y: -0.01 },
    recipe: {
      ...ANIMATED_GLYPH_PRESETS["pow-force-wave"].recipe,
      revealStarts: [0.03, 0.075, 0.12, 0.155],
      revealSeconds: [0.12, 0.115, 0.11, 0.1],
      entryDistance: 2,
      readableHoldSeconds: 0.28,
      impulses: [
        { start: 1.05, seconds: 0.28, force: { x: 34, y: -18 }, torque: -0.58 }
      ],
      cohesion: { spring: 82, damping: 18, decayStart: 1.08, decaySeconds: 0.28, floor: 0.42 },
      scatter: { start: 1.08, seconds: 0.42, force: 40, spread: 36, gravity: 16, torque: 1.05, curl: 12 },
      fade: { start: 1.42, seconds: 0.32 },
      livingDrift: { amount: 0.08, hz: 0.45 },
      glyphAccents: []
    },
    deformation: {
      type: "crash_dent",
      start: 0.34,
      seconds: 0.6,
      strength: 1.22,
      curve: "hold",
      maxOffsetEm: 0.34,
      direction: "up_right",
      frontWidth: 0.74,
      pushDepth: 1.08,
      minSpacing: 0.18,
      buckle: 1.05,
      rebound: 0.24,
      shoveNoise: 0.9,
      chainWave: 1,
      velocityShove: 0.58,
      crumpleFrequency: 6.2,
      phase: 0.08,
      seed: "pow-crash-dent"
    }
  };

  ANIMATED_GLYPH_PRESETS["whiff-ribbon-bend"] = {
    ...ANIMATED_GLYPH_PRESETS["whiff-ribbon"],
    title: "WHIFF ribbon bend",
    deformation: {
      type: "ribbon_bend",
      start: 0.82,
      seconds: 0.98,
      strength: 0.62,
      curve: "hold",
      maxOffsetEm: 0.1,
      phase: 0.15
    }
  };

  ANIMATED_GLYPH_PRESETS["block-accordion"] = {
    ...ANIMATED_GLYPH_PRESETS["block-plate"],
    title: "BLOCK accordion plate",
    deformation: {
      type: "accordion_plate",
      start: 0.36,
      seconds: 0.56,
      strength: 0.58,
      curve: "pulse",
      maxOffsetEm: 0.07
    }
  };

  ANIMATED_GLYPH_PRESETS["crack-spiky-fracture"] = {
    ...ANIMATED_GLYPH_PRESETS["finisher-curl"],
    title: "CRACK spiky fracture",
    word: "CRACK!",
    duration: 2.35,
    fit: 0.74,
    fill: "#050505",
    anchor: { x: 250, y: 116 },
    direction: { x: 1, y: -0.12 },
    recipe: {
      ...ANIMATED_GLYPH_PRESETS["finisher-curl"].recipe,
      revealStart: 0.08,
      revealStagger: 0.045,
      impulses: [
        { start: 0.58, seconds: 0.46, force: { x: 350, y: -42 }, torque: -0.34 },
        { start: 1.08, seconds: 0.56, force: { x: 210, y: -12 }, torque: 0.26 }
      ],
      scatter: { start: 1.1, seconds: 0.78, force: 92, spread: 74, gravity: 28, torque: 1.6, curl: 18 },
      fade: { start: 1.84, seconds: 0.44 }
    },
    deformation: {
      type: "spiky_fracture",
      start: 0.78,
      seconds: 0.92,
      strength: 0.74,
      curve: "hold",
      maxOffsetEm: 0.075,
      seed: "crack"
    }
  };

  ANIMATED_GLYPH_PRESETS["wham-corkscrew-exit"] = {
    ...ANIMATED_GLYPH_PRESETS["finisher-curl"],
    title: "WHAM corkscrew exit",
    deformation: {
      type: "corkscrew_exit",
      start: 1.08,
      seconds: 0.9,
      strength: 0.72,
      curve: "ramp",
      maxOffsetEm: 0.14,
      twist: 0.55
    }
  };

  ANIMATED_GLYPH_PRESETS["pow-wormhole-dissolve"] = {
    ...ANIMATED_GLYPH_PRESETS["pow-force-wave"],
    title: "POW wormhole zoom in",
    duration: 3.18,
    fit: 0.72,
    recipe: {
      ...ANIMATED_GLYPH_PRESETS["pow-force-wave"].recipe,
      impulses: [
        { start: 0.92, seconds: 0.42, force: { x: 92, y: -6 }, torque: -0.03 }
      ],
      cohesion: { spring: 56, damping: 12.5, decayStart: 2.22, decaySeconds: 0.42, floor: 0.82 },
      scatter: { start: 2.5, seconds: 0.42, force: 4, spread: 4, gravity: 0, torque: 0.02, curl: 0 },
      fade: { start: 2.58, seconds: 0.42 },
      livingDrift: { amount: 0.55, hz: 0.55 }
    },
    deformation: {
      type: "wormhole_spiral",
      start: 1.5,
      seconds: 1.22,
      glyphStagger: 0.16,
      strength: 1,
      curve: "ramp",
      maxOffsetEm: 0.68,
      turns: 2.35,
      inward: 0.96,
      direction: 1,
      seed: "pow-wormhole-zoom-in"
    }
  };

  ANIMATED_GLYPH_PRESETS["pow-wormhole-unfold"] = {
    ...ANIMATED_GLYPH_PRESETS["pow-force-wave"],
    title: "POW wormhole unfold",
    duration: 3.18,
    fit: 0.72,
    recipe: {
      ...ANIMATED_GLYPH_PRESETS["pow-force-wave"].recipe,
      revealStarts: [0.04, 0.1, 0.16, 0.22],
      revealSeconds: [0.26, 0.3, 0.28, 0.22],
      entryDistance: 4,
      impulses: [
        { start: 1.18, seconds: 0.38, force: { x: 74, y: -5 }, torque: 0.035 }
      ],
      cohesion: { spring: 62, damping: 13, decayStart: 2.36, decaySeconds: 0.46, floor: 0.88 },
      scatter: { start: 2.52, seconds: 0.36, force: 8, spread: 8, gravity: 0, torque: 0.035, curl: 0 },
      fade: { start: 2.76, seconds: 0.34 },
      livingDrift: { amount: 0.5, hz: 0.48 },
      glyphAccents: []
    },
    deformation: {
      type: "wormhole_spiral",
      start: 0.02,
      seconds: 1.32,
      glyphStagger: 0.08,
      strength: 1,
      curve: "reverse_ramp",
      maxOffsetEm: 0.68,
      turns: 2.35,
      inward: 0.96,
      direction: -1,
      readabilityGate: false,
      seed: "pow-wormhole-unfold"
    }
  };

  ANIMATED_GLYPH_PRESETS["pow-letter-twist-shrink"] = {
    ...ANIMATED_GLYPH_PRESETS["pow-force-wave"],
    title: "POW letter twist shrink",
    duration: 3.15,
    fit: 0.72,
    recipe: {
      ...ANIMATED_GLYPH_PRESETS["pow-force-wave"].recipe,
      impulses: [
        { start: 0.86, seconds: 0.38, force: { x: 126, y: -8 }, torque: -0.04 }
      ],
      cohesion: { spring: 52, damping: 11, decayStart: 1.65, decaySeconds: 0.72, floor: 0.72 },
      scatter: { start: 2.2, seconds: 0.44, force: 6, spread: 6, gravity: 0, torque: 0.04, curl: 0 },
      fade: { start: 2.52, seconds: 0.5 },
      livingDrift: { amount: 0.7, hz: 0.65 }
    },
    deformation: {
      type: "letter_twist_shrink",
      start: 1.12,
      seconds: 0.98,
      glyphStagger: 0.2,
      strength: 1,
      curve: "ramp",
      maxOffsetEm: 0.42,
      turns: 1.45,
      twistVariance: 0.75,
      shrinkMin: 0.09,
      direction: 1,
      seed: "pow-letter-twist"
    }
  };

  ANIMATED_GLYPH_PRESETS["pow-flow-ripple"] = {
    ...ANIMATED_GLYPH_PRESETS["pow-force-wave"],
    title: "POW flow ripple",
    duration: 3.05,
    fit: 0.72,
    recipe: {
      ...ANIMATED_GLYPH_PRESETS["pow-force-wave"].recipe,
      impulses: [
        { start: 0.86, seconds: 0.46, force: { x: 132, y: -8 }, torque: -0.035 },
        { start: 1.82, seconds: 0.5, force: { x: 74, y: -3 }, torque: 0.045 }
      ],
      cohesion: { spring: 52, damping: 12, decayStart: 2.14, decaySeconds: 0.56, floor: 0.72 },
      scatter: { start: 2.24, seconds: 0.54, force: 20, spread: 18, gravity: 5, torque: 0.14, curl: 2 },
      fade: { start: 2.58, seconds: 0.4 },
      livingDrift: { amount: 0.62, hz: 0.52 }
    },
    deformation: {
      type: "flow_ripple",
      start: 1.08,
      seconds: 1.22,
      glyphStagger: 0.05,
      strength: 0.95,
      curve: "hold",
      maxOffsetEm: 0.2,
      rippleWidth: 0.62,
      rippleCycles: 0.72,
      rippleAmplitude: 1.42,
      direction: 1,
      phase: 0.1,
      seed: "pow-flow-ripple"
    }
  };

  const ANIMATED_GLYPH_WGSL = `
struct Segment {
  a: vec4f,
  b: vec4f,
};

struct GlyphInstance {
  inv: vec4f,
  data: vec4f,
  bounds: vec4f,
  color: vec4f,
};

struct Uniforms {
  canvas: vec4f,
};

@group(0) @binding(0) var<storage, read> segments: array<Segment>;
@group(0) @binding(1) var<storage, read> instances: array<GlyphInstance>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

struct VertexOut {
  @builtin(position) position: vec4f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOut {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var out: VertexOut;
  out.position = vec4f(positions[vertex_index], 0.0, 1.0);
  return out;
}

fn line_cross(point: vec2f, a: vec2f, b: vec2f) -> u32 {
  let min_y = min(a.y, b.y);
  let max_y = max(a.y, b.y);
  if (point.y < min_y || point.y >= max_y || abs(b.y - a.y) < 0.00001) {
    return 0u;
  }
  let x = a.x + (point.y - a.y) * (b.x - a.x) / (b.y - a.y);
  if (x > point.x) {
    return 1u;
  }
  return 0u;
}

fn quadratic_point(a: vec2f, b: vec2f, c: vec2f, t: f32) -> vec2f {
  let mt = 1.0 - t;
  return a * mt * mt + b * 2.0 * mt * t + c * t * t;
}

fn inside_instance(local_point: vec2f, offset: u32, count: u32, total: u32) -> f32 {
  var hits: u32 = 0u;
  for (var j: u32 = 0u; j < ${MAX_ANIMATED_SEGMENTS}u; j = j + 1u) {
    if (j >= count) {
      break;
    }
    let index = offset + j;
    if (index >= total) {
      break;
    }
    let segment = segments[index];
    let p0 = segment.a.xy;
    let p1 = segment.a.zw;
    let p2 = segment.b.xy;
    if (segment.b.z < 0.5) {
      hits = hits + line_cross(local_point, p0, p2);
    } else {
      var previous = p0;
      for (var step: u32 = 1u; step <= 12u; step = step + 1u) {
        let t = f32(step) / 12.0;
        let next = quadratic_point(p0, p1, p2, t);
        hits = hits + line_cross(local_point, previous, next);
        previous = next;
      }
    }
  }
  return f32(hits & 1u);
}

fn sample_frame(point: vec2f) -> vec4f {
  let instance_count = u32(uniforms.canvas.z);
  let segment_count = u32(uniforms.canvas.w);
  var color = vec3f(0.9725, 0.9686, 0.9412);
  for (var i: u32 = 0u; i < ${MAX_ANIMATED_INSTANCES}u; i = i + 1u) {
    if (i >= instance_count) {
      break;
    }
    let instance = instances[i];
    if (
      point.x < instance.bounds.x || point.x > instance.bounds.z ||
      point.y < instance.bounds.y || point.y > instance.bounds.w ||
      instance.color.a <= 0.001
    ) {
      continue;
    }
    let delta = point - instance.data.xy;
    let local_point = vec2f(
      instance.inv.x * delta.x + instance.inv.z * delta.y,
      instance.inv.y * delta.x + instance.inv.w * delta.y
    );
    let coverage = inside_instance(
      local_point,
      u32(instance.data.z),
      u32(instance.data.w),
      segment_count
    );
    let alpha = clamp(coverage * instance.color.a, 0.0, 1.0);
    color = mix(color, instance.color.rgb, alpha);
  }
  return vec4f(color, 1.0);
}

@fragment
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let offsets = array<vec2f, 5>(
    vec2f(0.0, 0.0),
    vec2f(-0.35, -0.35),
    vec2f(0.35, -0.35),
    vec2f(-0.35, 0.35),
    vec2f(0.35, 0.35)
  );
  var color = vec4f(0.0);
  for (var i: u32 = 0u; i < 5u; i = i + 1u) {
    color = color + sample_frame(position.xy + offsets[i]);
  }
  return color / 5.0;
}
`;

  class AnimatedGlyphCanvasRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
    }

    draw(frame, settings) {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      drawAnimatedReference(ctx, frame);
      if (settings.showOriginal) drawAnimatedOriginalGhost(ctx, frame);
      for (const instance of frame.instances) {
        if (instance.opacity <= 0.001) continue;
        ctx.save();
        ctx.setTransform(
          instance.matrix.a,
          instance.matrix.b,
          instance.matrix.c,
          instance.matrix.d,
          instance.matrix.tx,
          instance.matrix.ty
        );
        ctx.globalAlpha = clamp(instance.opacity, 0, 1);
        ctx.fillStyle = instance.fill;
        ctx.fill(animatedGlyphPath(instance.contours), "evenodd");
        ctx.restore();
      }
      if (settings.showBounds) drawAnimatedBounds(ctx, frame);
      if (settings.showDeformedBounds) drawAnimatedDeformedBounds(ctx, frame);
      if (settings.showFlow) drawAnimatedFlowVectors(ctx, frame);
      if (settings.showPhase) drawAnimatedPhase(ctx, frame);
      drawSampleFrame(ctx);
    }
  }

  class WebGpuAnimatedGlyphRenderer {
    constructor(canvas, status, detail) {
      this.canvas = canvas;
      this.status = status;
      this.detail = detail;
      this.device = null;
      this.context = null;
      this.pipeline = null;
      this.format = "unknown";
      this.initPromise = null;
    }

    async render(frame) {
      if (!frame) return;
      if (!("gpu" in navigator)) {
        this.drawUnavailable("WebGPU unavailable", "Canvas animated fallback is the active renderer.");
        return;
      }
      try {
        await this.init();
        this.drawFrame(frame);
        const warning = frame.truncated ? " Segment or instance cap was reached." : "";
        this.status.textContent = "WebGPU animated glyph render complete.";
        this.detail.textContent = `${frame.preset.title}: ${frame.instances.length} instances, ${frame.segments.length} uploaded segments.${warning}`;
      } catch (error) {
        this.drawUnavailable("WebGPU animated render unavailable", error?.message || "Unknown WebGPU failure.");
      }
    }

    async init() {
      if (this.pipeline) return;
      if (this.initPromise) return this.initPromise;
      this.initPromise = this.initDevice();
      return this.initPromise;
    }

    async initDevice() {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error("navigator.gpu exists, but no adapter was granted.");
      this.device = await adapter.requestDevice();
      this.format = typeof navigator.gpu.getPreferredCanvasFormat === "function"
        ? navigator.gpu.getPreferredCanvasFormat()
        : "bgra8unorm";
      this.context = this.canvas.getContext("webgpu");
      if (!this.context) throw new Error("Unable to create a WebGPU canvas context.");
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque"
      });
      const module = this.device.createShaderModule({ code: ANIMATED_GLYPH_WGSL });
      this.pipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: "vs_main" },
        fragment: {
          module,
          entryPoint: "fs_main",
          targets: [{ format: this.format }]
        },
        primitive: { topology: "triangle-list" }
      });
    }

    drawFrame(frame) {
      const device = this.device;
      const segmentBuffer = createGpuBuffer(
        device,
        flattenSegmentsForGpu(frame.segments),
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      );
      const instanceBuffer = createGpuBuffer(
        device,
        flattenAnimatedInstances(frame.instances),
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      );
      const uniforms = new Float32Array([
        this.canvas.width,
        this.canvas.height,
        Math.min(frame.instances.length, MAX_ANIMATED_INSTANCES),
        Math.min(frame.segments.length, MAX_ANIMATED_SEGMENTS)
      ]);
      const uniformBuffer = createGpuBuffer(
        device,
        uniforms,
        GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      );
      const bindGroup = device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: segmentBuffer } },
          { binding: 1, resource: { buffer: instanceBuffer } },
          { binding: 2, resource: { buffer: uniformBuffer } }
        ]
      });
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.9725, g: 0.9686, b: 0.9412, a: 1 },
          loadOp: "clear",
          storeOp: "store"
        }]
      });
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    }

    drawUnavailable(title, detail) {
      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = PAPER;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = BLACK;
        ctx.font = "900 25px Impact, Arial Black, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GPU ANIMATION PENDING", this.canvas.width * 0.5, this.canvas.height * 0.46);
        ctx.font = "700 13px Arial, sans-serif";
        ctx.fillText("Canvas fallback remains active", this.canvas.width * 0.5, this.canvas.height * 0.6);
        drawSampleFrame(ctx);
      }
      this.status.textContent = title;
      this.detail.textContent = detail;
    }
  }

  class AnimatedGlyphLab {
    constructor() {
      this.presetSelect = document.querySelector("[data-anim-preset]");
      this.presetButtons = Array.from(document.querySelectorAll("[data-anim-preset-jump]"));
      this.toggleButton = document.querySelector("[data-anim-toggle]");
      this.restartButton = document.querySelector("[data-anim-restart]");
      this.speedSelect = document.querySelector("[data-anim-speed]");
      this.scrub = document.querySelector("[data-anim-scrub]");
      this.scrubOut = document.querySelector("[data-anim-scrub-out]");
      this.stress = document.querySelector("[data-anim-stress-count]");
      this.stressOut = document.querySelector("[data-anim-stress-out]");
      this.deformStrength = document.querySelector("[data-anim-deform-strength]");
      this.deformStrengthOut = document.querySelector("[data-anim-deform-strength-out]");
      this.status = document.querySelector("[data-anim-status]");
      this.detail = document.querySelector("[data-anim-detail]");
      this.statusRow = document.querySelector("[data-anim-status-row]");
      this.metrics = document.querySelector("[data-anim-metrics]");
      this.debugControls = {
        showBounds: document.querySelector("[data-anim-show-bounds]"),
        showPhase: document.querySelector("[data-anim-show-phase]"),
        showFlow: document.querySelector("[data-anim-show-flow]"),
        showStatus: document.querySelector("[data-anim-show-status]"),
        deformMode: document.querySelector("[data-anim-deform-mode]"),
        showOriginal: document.querySelector("[data-anim-show-original]"),
        showDeformedBounds: document.querySelector("[data-anim-show-deformed-bounds]"),
        reducedDeform: document.querySelector("[data-anim-reduced-deform]")
      };
      this.canvasRenderer = new AnimatedGlyphCanvasRenderer(document.querySelector("[data-anim-canvas]"));
      this.gpuRenderer = new WebGpuAnimatedGlyphRenderer(
        document.querySelector("[data-anim-wgsl-canvas]"),
        this.status,
        this.detail
      );
      this.time = 0;
      this.playing = true;
      this.lastPresetId = this.presetSelect?.value || "pow-force-wave";
      this.wire();
      this.render();
    }

    wire() {
      this.toggleButton?.addEventListener("click", () => {
        this.playing = !this.playing;
        this.syncControls();
      });
      this.restartButton?.addEventListener("click", () => {
        this.time = 0;
        this.playing = true;
        this.render();
      });
      this.presetSelect?.addEventListener("change", () => {
        this.setPreset(this.presetId());
      });
      for (const button of this.presetButtons) {
        button.addEventListener("click", () => this.setPreset(button.dataset.animPresetJump));
      }
      this.speedSelect?.addEventListener("change", () => this.render());
      this.scrub?.addEventListener("input", event => {
        this.time = Number(event.target.value) || 0;
        this.playing = false;
        this.render();
      });
      this.stress?.addEventListener("input", () => this.render());
      this.deformStrength?.addEventListener("input", () => this.render());
      for (const input of Object.values(this.debugControls)) {
        input?.addEventListener("change", () => this.render());
      }
      onGlyphFontChange(() => this.render());
    }

    presetId() {
      return ANIMATED_GLYPH_PRESETS[this.presetSelect?.value]
        ? this.presetSelect.value
        : "pow-force-wave";
    }

    setPreset(presetId) {
      if (!ANIMATED_GLYPH_PRESETS[presetId]) return;
      if (this.presetSelect) this.presetSelect.value = presetId;
      this.time = 0;
      this.playing = true;
      this.lastPresetId = presetId;
      this.render();
    }

    settings() {
      return {
        presetId: this.presetId(),
        speed: Number(this.speedSelect?.value) || DEFAULT_REVIEW_SPEED,
        stressCount: clamp(Math.round(Number(this.stress?.value) || 8), 1, 18),
        deformationMode: this.debugControls.deformMode?.value || "current",
        deformationStrength: clamp(Number(this.deformStrength?.value) || 1, 0, 1.6),
        showBounds: Boolean(this.debugControls.showBounds?.checked),
        showPhase: Boolean(this.debugControls.showPhase?.checked),
        showFlow: Boolean(this.debugControls.showFlow?.checked),
        showStatus: Boolean(this.debugControls.showStatus?.checked),
        showOriginal: Boolean(this.debugControls.showOriginal?.checked),
        showDeformedBounds: Boolean(this.debugControls.showDeformedBounds?.checked),
        reducedDeform: Boolean(this.debugControls.reducedDeform?.checked)
      };
    }

    update(dt) {
      if (!selectedGlyphAsset()) return;
      const settings = this.settings();
      const preset = ANIMATED_GLYPH_PRESETS[settings.presetId];
      if (this.playing) {
        this.time += dt * settings.speed;
        if (this.time > preset.duration) this.time = 0;
        this.render();
      }
    }

    render() {
      const asset = selectedGlyphAsset();
      if (!asset) {
        this.status.textContent = "Glyph asset bridge missing.";
        this.detail.textContent = "Run the font preprocessor or check tac_one_glyph_asset.generated.js.";
        return;
      }
      const settings = this.settings();
      const preset = ANIMATED_GLYPH_PRESETS[settings.presetId];
      this.time = clamp(this.time, 0, preset.duration);
      if (this.statusRow) this.statusRow.hidden = !settings.showStatus;
      if (this.scrub) {
        this.scrub.max = preset.duration.toFixed(4);
        this.scrub.value = this.time.toFixed(4);
      }
      if (this.scrubOut) this.scrubOut.textContent = `${this.time.toFixed(2)} / ${preset.duration.toFixed(2)}s`;
      if (this.stressOut) this.stressOut.textContent = String(settings.stressCount);
      if (this.deformStrengthOut) this.deformStrengthOut.textContent = settings.deformationStrength.toFixed(2);
      this.syncControls();
      const frame = buildAnimatedGlyphFrame(
        asset,
        preset,
        this.time,
        settings.stressCount,
        this.canvasRenderer.canvas.width,
        this.canvasRenderer.canvas.height,
        settings
      );
      this.canvasRenderer.draw(frame, settings);
      this.metrics.textContent = animatedMetricsText(frame);
      this.metrics.classList.toggle("warning", frame.truncated);
      this.status.textContent = `Canvas animated fallback rendered from ${glyphAssetLabel(asset)} curves.`;
      this.detail.textContent = "Attempting isolated WebGPU animated glyph render for comparison.";
      this.gpuRenderer.render(frame);
    }

    syncControls() {
      if (this.toggleButton) this.toggleButton.textContent = this.playing ? "Pause" : "Play";
      if (this.presetSelect) this.presetSelect.value = this.presetId();
    }
  }

  class TypographySample {
    constructor(definition, parent) {
      this.definition = definition;
      this.elapsed = 0;
      this.delay = 0;
      this.element = document.createElement("article");
      this.element.className = "sample-card";
      this.element.innerHTML = `
        <header>
          <div>
            <h2>${escapeHtml(definition.title)}</h2>
            <p>${escapeHtml(definition.note)}</p>
          </div>
          <button type="button" data-play>Play</button>
        </header>
        <canvas width="${WIDTH}" height="${HEIGHT}" aria-label="${escapeHtml(definition.title)} sample"></canvas>
        <div class="phase-row">
          <span data-phase-label>phase: ready</span>
          <span data-time-label>0.00 / ${definition.duration.toFixed(2)}s</span>
        </div>
        <div class="diagnostic-row" data-diagnostics>read 0% · glyphs 0 · lane n/a</div>
        <div class="sample-timeline" data-timeline aria-label="${escapeHtml(definition.title)} timing"></div>
        <div class="tags"></div>
      `;
      this.canvas = this.element.querySelector("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.renderer = new CanvasTextRenderer(this.ctx);
      this.phaseLabel = this.element.querySelector("[data-phase-label]");
      this.timeLabel = this.element.querySelector("[data-time-label]");
      this.diagnostics = this.element.querySelector("[data-diagnostics]");
      this.timeline = this.element.querySelector("[data-timeline]");
      renderTimelineBands(this.timeline, definition.phases || [], definition.duration);
      this.playhead = document.createElement("div");
      this.playhead.className = "timeline-playhead";
      this.timeline.appendChild(this.playhead);
      const tags = this.element.querySelector(".tags");
      for (const tag of definition.tags || []) {
        const span = document.createElement("span");
        span.className = `tag${tag === "flash" || tag === "finisher" ? " warn" : ""}`;
        span.textContent = tag;
        tags.appendChild(span);
      }
      this.element.querySelector("[data-play]").addEventListener("click", () => this.restart());
      parent.appendChild(this.element);
      this.restart();
    }

    restart(delay = 0) {
      this.elapsed = 0;
      this.delay = Math.max(0, delay);
      this.render(0);
    }

    setTime(time) {
      this.delay = 0;
      this.elapsed = clamp(time, 0, this.definition.duration);
      this.render(this.elapsed);
    }

    update(dt) {
      if (this.delay > 0) {
        this.delay -= dt;
        this.render(0);
        return;
      }
      const timeScale = (state.slowMotion ? 0.35 : 1) * state.playbackSpeed;
      this.elapsed += dt * timeScale;
      if (state.autoplay && this.elapsed > this.definition.duration + 0.45) {
        this.restart();
      }
      this.render(this.elapsed);
    }

    render(t) {
      const ctx = this.ctx;
      this.lastChoreographyReports = [];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const shake = this.shake(t);
      ctx.save();
      ctx.translate(shake.x, shake.y);
      this.definition.draw(this, ctx, clamp(t, 0, this.definition.duration));
      drawActiveWordBounds(ctx, this, t);
      ctx.restore();
      drawSampleFrame(ctx);
      this.updateTimelineUi(clamp(t, 0, this.definition.duration));
    }

    updateTimelineUi(t) {
      const phase = phaseAt(this.definition, t);
      this.phaseLabel.textContent = `${this.definition.title}: ${phase}`;
      this.timeLabel.textContent = `${t.toFixed(2)} / ${this.definition.duration.toFixed(2)}s`;
      const pct = this.definition.duration > 0 ? clamp(t / this.definition.duration, 0, 1) * 100 : 0;
      this.playhead.style.left = `${pct}%`;
      this.updateDiagnostics(t);
    }

    updateDiagnostics(t) {
      const reports = this.lastChoreographyReports || [];
      if (reports.length === 0) {
        this.diagnostics.textContent = "read 0% · glyphs 0 · lane n/a";
        return;
      }
      const visibleGlyphs = reports.reduce((sum, report) => sum + report.visibleGlyphs, 0);
      const readProgress = Math.max(...reports.map(report => report.readProgress));
      const laneRank = { risk: 3, clear: 2, allowed: 1, none: 0 };
      const lane = reports.reduce((best, report) => {
        const value = laneRank[report.laneStatus] ?? 0;
        return value > (laneRank[best] ?? 0) ? report.laneStatus : best;
      }, "none");
      const laneText = lane === "none" ? "lane n/a" : `lane ${lane}`;
      this.diagnostics.textContent = `read ${Math.round(readProgress * 100)}% · glyphs ${visibleGlyphs} · ${laneText}`;
    }

    shake(t) {
      const impact = this.definition.impact ?? 0.2;
      const amount = this.definition.shake || 0;
      const s = clamp(1 - Math.abs(t - impact) / 0.25, 0, 1) * amount * state.intensity;
      return {
        x: Math.sin((t + this.definition.id.length) * 78) * s,
        y: Math.cos((t + this.definition.id.length) * 61) * s * 0.55
      };
    }
  }

  function renderTimelineBands(container, phases, duration) {
    container.textContent = "";
    const safeDuration = Math.max(0.0001, duration || 1);
    for (const phase of phases || []) {
      const start = clamp(phase.start ?? 0, 0, safeDuration);
      const end = clamp(phase.end ?? start + 0.02, start + 0.001, safeDuration);
      const band = document.createElement("div");
      band.className = `phase-band phase-${phase.name}`;
      band.title = `${phase.name}: ${start.toFixed(2)}-${end.toFixed(2)}s`;
      band.style.left = `${(start / safeDuration) * 100}%`;
      band.style.width = `${Math.max(0.6, ((end - start) / safeDuration) * 100)}%`;
      container.appendChild(band);
    }
  }

  function normalizePhaseList(phases, duration) {
    const safeDuration = Math.max(0.0001, duration || 1);
    return (phases || [])
      .filter(phase => phase && phase.name)
      .map(phase => {
        const start = clamp(phase.start ?? 0, 0, safeDuration);
        const end = clamp(phase.end ?? start + 0.02, start + 0.001, safeDuration);
        return { name: phase.name, start, end };
      })
      .sort((a, b) => a.start - b.start || PHASE_ORDER.indexOf(a.name) - PHASE_ORDER.indexOf(b.name));
  }

  function prepareSampleDefinition(definition) {
    if (definition._prepared) return definition;
    definition.choreographies = (definition.choreographies || []).map(item => new ChoreographyPreset(item, definition));
    definition.phases = deriveSamplePhases(definition);
    definition._prepared = true;
    return definition;
  }

  function deriveSamplePhases(definition) {
    const phases = [];
    for (const preset of definition.choreographies || []) {
      for (const phase of preset.phases) phases.push({ ...phase });
    }
    if (phases.length === 0) return normalizePhaseList(definition.phases || [], definition.duration);
    return phases.sort((a, b) => a.start - b.start || PHASE_ORDER.indexOf(a.name) - PHASE_ORDER.indexOf(b.name));
  }

  function phaseAt(definition, t) {
    const phases = definition.phases || [];
    const impact = phases.find(phase => phase.name === "impact" && t >= phase.start && t < phase.end);
    if (impact) return "impact";
    for (const name of PHASE_ORDER) {
      if (name === "impact") continue;
      const phase = phases.find(item => item.name === name && t >= item.start && t < item.end);
      if (phase) return name;
    }
    if (t <= 0) return "ready";
    return t >= definition.duration ? "done" : "between";
  }

  function activeWordBounds(sample, t) {
    if (!state.wordBounds) return null;
    const phase = phaseAt(sample.definition, t);
    if (phase !== "build" && phase !== "read" && phase !== "move") return null;
    const reports = sample.lastChoreographyReports || [];
    return reports
      .map(report => report.bounds)
      .filter(Boolean);
  }

  function drawActiveWordBounds(ctx, sample, t) {
    const boundsList = activeWordBounds(sample, t);
    if (!boundsList || boundsList.length === 0) return;
    ctx.save();
    ctx.strokeStyle = "rgba(72, 200, 120, 0.9)";
    ctx.fillStyle = "rgba(72, 200, 120, 0.08)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    for (const bounds of boundsList) {
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.fillStyle = "rgba(5, 5, 5, 0.78)";
      ctx.font = "700 11px Arial, sans-serif";
      ctx.fillText("generated word envelope", bounds.x + 6, bounds.y - 6);
      ctx.fillStyle = "rgba(72, 200, 120, 0.08)";
    }
    ctx.restore();
  }

  function renderChoreography(sample, presetId, t) {
    const preset = (sample.definition.choreographies || []).find(item => item.id === presetId);
    if (!preset) return null;
    const asset = selectedGlyphAsset();
    if (asset?.glyphs) {
      const report = buildControllerChoreographyReport(sample, preset, t, asset);
      drawControllerChoreography(sample.ctx, report);
      sample.lastChoreographyReports.push(report);
      return report;
    }
    const report = buildChoreographyReport(sample.renderer, preset, t);
    if (report.glyphs.length > 0) {
      const trailSteps = t >= (preset.phase(preset.trailPhase)?.start ?? Infinity) ? preset.trailSteps : 0;
      if (trailSteps > 0) drawGlyphTrail(sample.renderer, report.glyphs, report.style, report.trailDirection, trailSteps);
      sample.renderer.drawGlyphs(report.glyphs, report.style);
    }
    sample.lastChoreographyReports.push(report);
    return report;
  }

  function buildControllerChoreographyReport(sample, preset, t, asset) {
    const controllerPreset = controllerPresetForChoreography(sample.definition, preset);
    const delay = controllerPreset.delay || 0;
    const localTime = clamp(t - delay, 0, controllerPreset.duration);
    const frame = t < delay
      ? emptyControllerFrame(controllerPreset, localTime, WIDTH, HEIGHT)
      : buildAnimatedGlyphFrame(
        asset,
        controllerPreset,
        localTime,
        controllerPreset.stressCount || 1,
        WIDTH,
        HEIGHT
      );
    const bounds = boundsForAnimatedFrame(frame);
    const readProgress = frame.channels?.readability ?? controllerReadProgress(controllerPreset, localTime);
    return {
      presetId: preset.id,
      controllerPreset,
      frame,
      style: {
        fill: controllerPreset.fill || BLACK,
        stroke: controllerPreset.outlineFill || "white",
        strokeWidth: controllerPreset.outlineScale && controllerPreset.outlineScale > 1 ? 4 : 0
      },
      glyphs: [],
      visibleGlyphs: frame.instances.filter(instance => instance.role !== "outline" && instance.opacity > 0.001).length,
      readProgress,
      trailDirection: normalize(controllerPreset.direction || preset.direction || { x: 1, y: 0 }),
      bounds,
      laneStatus: laneStatusForBounds(bounds, preset)
    };
  }

  function drawControllerChoreography(ctx, report) {
    const frame = report?.frame;
    if (!frame || !frame.instances.length) return;
    for (const instance of frame.instances) {
      if (instance.opacity <= 0.001) continue;
      ctx.save();
      ctx.transform(
        instance.matrix.a,
        instance.matrix.b,
        instance.matrix.c,
        instance.matrix.d,
        instance.matrix.tx,
        instance.matrix.ty
      );
      ctx.globalAlpha = clamp(instance.opacity, 0, 1);
      ctx.fillStyle = instance.fill;
      ctx.fill(animatedGlyphPath(instance.contours), "evenodd");
      ctx.restore();
    }
  }

  function emptyControllerFrame(preset, time, width, height) {
    return {
      preset,
      word: preset.word,
      time,
      duration: preset.duration,
      phase: "birth",
      channels: {
        cohesion: 0,
        impulse: 0,
        drag: 0,
        settle: 0,
        scatter: 0,
        fade: 0,
        readability: 0
      },
      flowLabel: "idle",
      wordSpeed: 0,
      wordEnergy: 0,
      width,
      height,
      segments: [],
      totalSegments: 0,
      instances: [],
      truncated: false,
      copyCount: 1
    };
  }

  function controllerPresetForChoreography(sampleDefinition, preset) {
    const controller = preset.controller || {};
    const delay = controller.delay ?? 0;
    const duration = Math.max(0.2, controller.duration ?? (sampleDefinition.duration - delay));
    const style = preset.style || {};
    const text = controller.word || preset.text || "POW";
    return {
      title: controller.title || `${sampleDefinition.title} ${preset.id}`,
      word: text,
      duration,
      delay,
      fit: (controller.fit ?? fitFromLegacyStyle(style)) * SAMPLE_CARD_CONTROLLER_FIT_SCALE,
      trackingEm: controller.trackingEm ?? trackingEmFromLegacyStyle(style),
      fill: controller.fill || style.fill || BLACK,
      outlineFill: controller.outlineFill || (style.strokeWidth > 0 ? style.stroke : null),
      outlineScale: controller.outlineScale ?? outlineScaleFromLegacyStyle(style),
      contrastMode: controller.contrastMode || (controller.outlineFill || style.strokeWidth > 0 ? "outlined" : "none"),
      anchor: { ...(controller.anchor || preset.origin || { x: WIDTH * 0.5, y: HEIGHT * 0.5 }) },
      direction: normalize(controller.direction || preset.direction || { x: 1, y: 0 }),
      rotation: controller.rotation ?? preset.rotation ?? 0,
      behavior: controller.behavior || "sample-controller",
      stressCount: controller.stressCount || 1,
      recipe: {
        ...sampleControllerRecipe(sampleDefinition, preset, duration),
        ...(controller.recipe || {})
      }
    };
  }

  function sampleControllerRecipe(sampleDefinition, preset, duration) {
    const build = relativePhase(preset, "build", duration, { start: 0.1, end: 0.38 });
    const read = relativePhase(preset, "read", duration, { start: build.end, end: Math.min(duration, build.end + 0.26) });
    const move = relativePhase(preset, "move", duration, { start: read.end, end: Math.min(duration, read.end + 0.34) });
    const separate = relativePhase(preset, "separate", duration, { start: move.end, end: Math.min(duration, move.end + 0.25) });
    const fade = relativePhase(preset, "fade", duration, { start: separate.end, end: duration });
    const direction = normalize(preset.direction || { x: 1, y: 0 });
    const motion = preset.motion || {};
    const separateData = preset.separate || {};
    const moveSeconds = Math.max(0.12, move.end - move.start);
    const moveDistance = motion.distance ?? 36;
    const force = Math.max(48, (moveDistance / moveSeconds) * 2.6);
    const recipe = {
      mass: 1,
      drag: 2.35,
      angularDrag: 3.1,
      revealStart: build.start,
      revealStagger: 0.06,
      revealSeconds: Math.max(0.14, Math.min(0.38, (build.end - build.start) * 0.74)),
      entryDistance: preset.build?.entryDistance ?? 24,
      readableHoldSeconds: Math.max(0.18, read.end - read.start),
      impulses: [
        {
          start: Math.max(build.start, read.start + 0.04),
          seconds: Math.max(0.18, move.end - read.start),
          force: {
            x: direction.x * force,
            y: direction.y * force * 0.72
          },
          torque: preset.rotation ? preset.rotation * 0.55 : 0.04 * direction.y
        }
      ],
      cohesion: {
        spring: 30,
        damping: 8.4,
        decayStart: separate.start,
        decaySeconds: Math.max(0.18, separate.end - separate.start + 0.12),
        floor: 0.16
      },
      scatter: {
        start: separate.start,
        seconds: Math.max(0.18, separate.end - separate.start + 0.12),
        force: Math.max(16, separateData.forwardDistance ?? 28),
        spread: Math.max(4, separateData.spreadDistance ?? 14),
        gravity: separateData.gravity ?? 14,
        torque: separateData.rotation ?? 0.28
      },
      fade: {
        start: fade.start,
        seconds: Math.max(0.12, fade.end - fade.start)
      },
      livingDrift: { amount: sampleDefinition.id === "whiff-arc" ? 0 : 0.65, hz: 1.05 }
    };
    if (preset.path?.type === "quadratic") {
      recipe.railPath = {
        start: preset.path.start,
        control: preset.path.control,
        end: preset.path.end,
        startTime: move.start,
        endTime: move.end,
        spring: 30
      };
      recipe.drag = 3.1;
      recipe.livingDrift = { amount: 0, hz: 1 };
    }
    if ((preset.squash?.amount || 0) > 0) {
      recipe.compression = {
        start: preset.squash.start ?? build.start,
        seconds: Math.max(0.16, (preset.squash.end ?? read.end) - (preset.squash.start ?? build.start)),
        scaleX: preset.squash.amount,
        scaleY: -preset.squash.amount * 0.45
      };
    }
    if (sampleDefinition.id === "block-plate") {
      recipe.mass = 1.8;
      recipe.drag = 5.2;
      recipe.angularDrag = 7;
      recipe.cohesion.spring = 46;
      recipe.cohesion.damping = 11;
      recipe.cohesion.floor = 0.74;
      recipe.scatter.force = 14;
      recipe.scatter.spread = 5;
      recipe.scatter.gravity = 5;
      recipe.plateLock = { start: read.start, seconds: Math.max(0.16, read.end - read.start) };
      recipe.livingDrift = { amount: 0.2, hz: 1.4 };
    }
    if (sampleDefinition.id === "thud-floor") {
      recipe.mass = 1.45;
      recipe.drag = 3.8;
      recipe.cohesion.floor = 0.42;
      recipe.scatter.gravity = 34;
      recipe.livingDrift = { amount: 0.15, hz: 0.7 };
    }
    if (sampleDefinition.id === "mob-pressure") {
      recipe.stress = true;
      recipe.drag = 2.4;
      recipe.livingDrift = { amount: 3.2, hz: 1.4 };
    }
    return recipe;
  }

  function relativePhase(preset, name, duration, fallback) {
    const delay = preset.controller?.delay ?? 0;
    const phase = preset.phase(name);
    const safeDuration = Math.max(0.001, duration);
    if (!phase) return {
      start: clamp(fallback.start ?? 0, 0, safeDuration),
      end: clamp(fallback.end ?? safeDuration, 0, safeDuration)
    };
    const start = clamp(phase.start - delay, 0, safeDuration);
    return {
      start,
      end: clamp(Math.max(start + 0.02, phase.end - delay), start + 0.001, safeDuration)
    };
  }

  function fitFromLegacyStyle(style = {}) {
    return clamp((style.size || 56) / 128, 0.22, 0.72);
  }

  function trackingEmFromLegacyStyle(style = {}) {
    return clamp((style.tracking ?? 2) * 0.018, 0.015, 0.12);
  }

  function outlineScaleFromLegacyStyle(style = {}) {
    const width = style.strokeWidth || 0;
    if (width <= 0) return 1;
    return clamp(1 + width * 0.008, 1.018, 1.085);
  }

  function boundsForAnimatedFrame(frame) {
    const fillInstances = (frame.instances || []).filter(instance => instance.role !== "outline" && instance.opacity > 0.001);
    if (!fillInstances.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const instance of fillInstances) {
      minX = Math.min(minX, instance.bounds.x);
      minY = Math.min(minY, instance.bounds.y);
      maxX = Math.max(maxX, instance.bounds.x + instance.bounds.width);
      maxY = Math.max(maxY, instance.bounds.y + instance.bounds.height);
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  function controllerReadProgress(preset, time) {
    const recipe = normalizeAnimatedRecipe(preset);
    const starts = Array.from(String(preset.word || "")).map((_, index) => {
      if (Array.isArray(recipe.revealStarts) && Number.isFinite(recipe.revealStarts[index])) {
        return recipe.revealStarts[index];
      }
      return recipe.revealStart + index * recipe.revealStagger;
    });
    if (!starts.length) return 0;
    return average(starts.map((start, index) => {
      const seconds = Array.isArray(recipe.revealSecondsList) && Number.isFinite(recipe.revealSecondsList[index])
        ? recipe.revealSecondsList[index]
        : recipe.revealSeconds;
      return easeOut(range(time, start, start + seconds));
    }));
  }

  function buildChoreographyReport(renderer, preset, t) {
    const style = {
      size: preset.style.size ?? 58,
      weight: preset.style.weight ?? 900,
      fill: preset.style.fill || BLACK,
      stroke: preset.style.stroke || "white",
      strokeWidth: preset.style.strokeWidth ?? 6,
      tracking: preset.style.tracking ?? 3,
      font: preset.style.font
    };
    const layout = renderer.layoutGlyphs(preset.text, style);
    const build = preset.phase("build") || { start: 0, end: 0.2 };
    const read = preset.phase("read") || { start: build.end, end: build.end + 0.2 };
    const move = preset.phase("move") || { start: read.end, end: read.end + 0.2 };
    const separate = preset.phase("separate") || { start: move.end, end: move.end + 0.2 };
    const fade = preset.phase("fade") || { start: separate.end, end: separate.end + 0.2 };
    const impact = preset.phase("impact") || build;
    const moveProgress = easeInOut(range(t, move.start, move.end));
    const separateProgress = easeOut(range(t, separate.start, separate.end));
    const fadeProgress = easeInOut(range(t, fade.start, fade.end));
    const anchor = choreographyAnchor(preset, t, moveProgress, separateProgress, fadeProgress);
    const tangent = choreographyTangent(preset, moveProgress);
    const direction = normalize(tangent || preset.direction);
    const normal = { x: -direction.y, y: direction.x };
    const glyphCount = Math.max(1, layout.length);
    const buildSpan = Math.max(0.001, build.end - build.start);
    const birthSeconds = Math.min(preset.build.birthSeconds, Math.max(0.04, buildSpan * 0.7));
    const stagger = glyphCount > 1 ? Math.max(0, (buildSpan - birthSeconds) / (glyphCount - 1)) : 0;
    const squashStart = preset.squash.start ?? impact.start;
    const squashEnd = preset.squash.end ?? Math.max(impact.end, build.end);
    const squashPulse = Math.sin(range(t, squashStart, squashEnd) * Math.PI) * (preset.squash.amount || 0) * state.intensity;
    const readProgress = range(t, read.start, read.end);
    const baseOpacity = preset.opacity * (1 - fadeProgress);
    const glyphs = layout.map(glyph => {
      const glyphStart = build.start + glyph.glyphIndex * stagger;
      const birth = easeOutBack(range(t, glyphStart, glyphStart + birthSeconds));
      const localT = Math.max(0, t - glyphStart);
      const center = glyph.glyphIndex - (glyphCount - 1) * 0.5;
      const entryBack = (1 - birth) * (preset.build.entryDistance + glyph.glyphIndex * 1.8);
      const settle = birth * preset.build.settleDistance;
      const forwardSeparate = separateProgress * (preset.separate.forwardDistance + glyph.glyphIndex * 5);
      const lateralSeparate = separateProgress * center * preset.separate.spreadDistance;
      const wobble = Math.sin(localT * 8 + glyph.glyphIndex * 1.9) * 1.8 * birth * (moveProgress + separateProgress * 0.45);
      const gravity = separateProgress * separateProgress * preset.separate.gravity;
      return new GlyphBody({
        ...glyph,
        position: {
          x: anchor.x + glyph.localOffset.x + direction.x * (settle - entryBack + forwardSeparate) + normal.x * (lateralSeparate + wobble),
          y: anchor.y + glyph.localOffset.y + direction.y * ((settle - entryBack) * 0.4 + forwardSeparate * 0.5) + normal.y * (lateralSeparate + wobble) + gravity
        },
        rotation: preset.rotation + Math.atan2(direction.y, direction.x) * (preset.path ? 0.22 : 0) + separateProgress * (preset.separate.rotation + center * 0.08),
        scale: birth * (1 + Math.sin(clamp((t - glyphStart) / birthSeconds, 0, 1) * Math.PI) * 0.08) * (1 - separateProgress * 0.06),
        scaleX: (preset.style.scaleX ?? 1) * (1 + squashPulse),
        scaleY: (preset.style.scaleY ?? 1) * (1 - squashPulse * 0.45),
        opacity: baseOpacity * birth,
        phase: phaseAt({ phases: preset.phases, duration: fade.end }, t),
        role: separateProgress > 0 ? "debris" : "read"
      });
    }).filter(glyph => glyph.opacity > 0.015 && glyph.scale > 0.015);
    const bounds = generatedGlyphBounds(glyphs, style, preset.boundsPadding);
    return {
      presetId: preset.id,
      style,
      glyphs,
      visibleGlyphs: glyphs.length,
      readProgress,
      trailDirection: direction,
      bounds,
      laneStatus: laneStatusForBounds(bounds, preset)
    };
  }

  function choreographyAnchor(preset, t, moveProgress, separateProgress, fadeProgress) {
    const move = preset.phase("move") || { start: 0, end: 0.2 };
    const postMove = Math.max(0, t - move.end);
    if (preset.path?.type === "quadratic") {
      const startT = preset.path.startT ?? 0.08;
      const endT = preset.path.endT ?? 0.86;
      const p = quadraticPoint(preset.path.start, preset.path.control, preset.path.end, startT + (endT - startT) * moveProgress);
      const tangent = normalize(quadraticTangent(preset.path.start, preset.path.control, preset.path.end, endT));
      return {
        x: p.x + tangent.x * postMove * preset.motion.postDriftSpeed,
        y: p.y + tangent.y * postMove * preset.motion.postDriftSpeed + fadeProgress * fadeProgress * 8
      };
    }
    const drift = moveProgress * preset.motion.distance + postMove * preset.motion.postDriftSpeed;
    return {
      x: preset.origin.x + preset.direction.x * drift,
      y: preset.origin.y + preset.direction.y * drift * preset.motion.yScale + separateProgress * fadeProgress * 4
    };
  }

  function choreographyTangent(preset, moveProgress) {
    if (preset.path?.type !== "quadratic") return preset.direction;
    const startT = preset.path.startT ?? 0.08;
    const endT = preset.path.endT ?? 0.86;
    return quadraticTangent(preset.path.start, preset.path.control, preset.path.end, startT + (endT - startT) * moveProgress);
  }

  function generatedGlyphBounds(glyphs, style, padding) {
    if (!glyphs || glyphs.length === 0) return null;
    const approxWidth = Math.max(8, (style.size || 58) * 0.7);
    const approxHeight = Math.max(8, style.size || 58);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const glyph of glyphs) {
      const width = approxWidth * Math.max(0.1, glyph.scale * (glyph.scaleX || 1));
      const height = approxHeight * Math.max(0.1, glyph.scale * (glyph.scaleY || 1));
      minX = Math.min(minX, glyph.position.x - width * 0.5);
      minY = Math.min(minY, glyph.position.y - height * 0.5);
      maxX = Math.max(maxX, glyph.position.x + width * 0.5);
      maxY = Math.max(maxY, glyph.position.y + height * 0.5);
    }
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }

  function laneStatusForBounds(bounds, preset) {
    if (!preset.protectedLane || !bounds) return "none";
    if (preset.protectedLane.allowOverlap) return "allowed";
    const heroX = preset.protectedLane.heroX;
    const enemyX = preset.protectedLane.enemyX;
    const left = Math.min(heroX, enemyX) + 28;
    const right = Math.max(heroX, enemyX) - 24;
    if (right <= left) return "none";
    const lane = { x: left, y: 50, width: right - left, height: FLOOR_Y - 50 };
    return rectsOverlap(bounds, lane) ? "risk" : "clear";
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.width
      && a.x + a.width > b.x
      && a.y < b.y + b.height
      && a.y + a.height > b.y;
  }

  function normalizeStaticWord(word, asset) {
    const fallback = "POW!";
    const next = String(word || fallback).toUpperCase();
    const glyphs = asset?.glyphs || {};
    const valid = Array.from(next).every(char => glyphs[char]);
    return valid ? next : fallback;
  }

  function buildStaticWordGeometry(asset, settings, width, height) {
    const trackingEm = 0.028;
    const word = normalizeStaticWord(settings?.word, asset);
    const sizePreset = STATIC_SIZE_PRESETS[settings?.size] || STATIC_SIZE_PRESETS.normal;
    const transformPreset = STATIC_TRANSFORM_PRESETS[settings?.transform] || STATIC_TRANSFORM_PRESETS.none;
    const chars = Array.from(word);
    const layouts = [];
    let cursor = 0;
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const char of chars) {
      const glyph = asset.glyphs[char];
      layouts.push({ char, glyph, cursor });
      const glyphBounds = glyph.metrics?.bounds;
      if (glyphBounds) {
        bounds.minX = Math.min(bounds.minX, cursor + glyphBounds.minX);
        bounds.minY = Math.min(bounds.minY, glyphBounds.minY);
        bounds.maxX = Math.max(bounds.maxX, cursor + glyphBounds.maxX);
        bounds.maxY = Math.max(bounds.maxY, glyphBounds.maxY);
      }
      cursor += (glyph.metrics?.advanceEm ?? 0.25) + trackingEm;
    }
    if (!Number.isFinite(bounds.minX)) {
      bounds.minX = 0;
      bounds.minY = 0;
      bounds.maxX = Math.max(0.1, cursor);
      bounds.maxY = 0.55;
    }
    const padding = 26;
    const emWidth = Math.max(0.001, bounds.maxX - bounds.minX);
    const emHeight = Math.max(0.001, bounds.maxY - bounds.minY);
    const baseScale = Math.min((width - padding * 2) / emWidth, (height - padding * 2) / emHeight);
    const scale = baseScale * sizePreset.scale;
    const drawnWidth = emWidth * scale;
    const drawnHeight = emHeight * scale;
    const center = { x: width * 0.5, y: height * 0.5 };
    const offsetX = center.x - drawnWidth * 0.5 - bounds.minX * scale;
    const top = center.y - drawnHeight * 0.5;
    const offsetY = top + bounds.maxY * scale;
    const rawPoint = (point, cursorEm) => ({
      x: offsetX + (cursorEm + point[0]) * scale,
      y: offsetY - point[1] * scale
    });
    const transformPoint = (point, cursorEm) => transformStaticPoint(
      rawPoint(point, cursorEm),
      center,
      transformPreset
    );
    const rawScreenBounds = {
      x: offsetX + bounds.minX * scale,
      y: offsetY - bounds.maxY * scale,
      width: drawnWidth,
      height: drawnHeight
    };
    const screenBounds = boundsFromPoints([
      transformStaticPoint({ x: rawScreenBounds.x, y: rawScreenBounds.y }, center, transformPreset),
      transformStaticPoint({ x: rawScreenBounds.x + rawScreenBounds.width, y: rawScreenBounds.y }, center, transformPreset),
      transformStaticPoint({ x: rawScreenBounds.x + rawScreenBounds.width, y: rawScreenBounds.y + rawScreenBounds.height }, center, transformPreset),
      transformStaticPoint({ x: rawScreenBounds.x, y: rawScreenBounds.y + rawScreenBounds.height }, center, transformPreset)
    ]);
    const segments = [];
    const contours = [];
    const glyphReports = [];
    let totalSegments = 0;
    for (const layout of layouts) {
      const before = segments.length;
      let glyphTotal = 0;
      for (const contour of layout.glyph.contours || []) {
        const contourSegments = [];
        let firstPoint = null;
        let lastPoint = null;
        for (const segment of contour.segments || []) {
          totalSegments += 1;
          glyphTotal += 1;
          if (segments.length >= MAX_GPU_SEGMENTS) continue;
          let nextSegment = null;
          if (segment.type === "line") {
            nextSegment = {
              type: "line",
              p0: transformPoint(segment.p0, layout.cursor),
              p1: transformPoint(segment.p1, layout.cursor)
            };
          } else if (segment.type === "quadratic") {
            nextSegment = {
              type: "quadratic",
              p0: transformPoint(segment.p0, layout.cursor),
              p1: transformPoint(segment.p1, layout.cursor),
              p2: transformPoint(segment.p2, layout.cursor)
            };
          }
          if (nextSegment) {
            if (!firstPoint) firstPoint = nextSegment.p0;
            lastPoint = segmentEndpoint(nextSegment);
            segments.push(nextSegment);
            contourSegments.push(nextSegment);
          }
        }
        if (firstPoint && lastPoint && distanceBetween(firstPoint, lastPoint) > 0.01) {
          totalSegments += 1;
          glyphTotal += 1;
          if (segments.length < MAX_GPU_SEGMENTS) {
            const closeSegment = {
              type: "line",
              p0: lastPoint,
              p1: firstPoint,
              syntheticClose: true
            };
            segments.push(closeSegment);
            contourSegments.push(closeSegment);
          }
        }
        if (contourSegments.length > 0) contours.push(contourSegments);
      }
      glyphReports.push({
        char: layout.char,
        curves: segments.length - before,
        totalCurves: glyphTotal,
        maxBand: layout.glyph.bandSummary?.maxCurvesPerBand || 0,
        advanceEm: layout.glyph.metrics?.advanceEm || 0
      });
    }
    return {
      word: chars.join(""),
      width,
      height,
      scale,
      baseScale,
      sizePreset,
      transformPreset,
      fillRule: settings?.fillRule || "evenodd",
      bounds,
      rawScreenBounds,
      screenBounds,
      baseline: {
        start: transformStaticPoint({ x: 18, y: offsetY }, center, transformPreset),
        end: transformStaticPoint({ x: width - 18, y: offsetY }, center, transformPreset)
      },
      segments,
      contours,
      glyphReports,
      totalSegments,
      truncated: totalSegments > segments.length
    };
  }

  function transformStaticPoint(point, center, transformPreset) {
    const scaleX = transformPreset.scaleX ?? 1;
    const scaleY = transformPreset.scaleY ?? 1;
    const rotation = transformPreset.rotation || 0;
    const x = (point.x - center.x) * scaleX;
    const y = (point.y - center.y) * scaleY;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      x: center.x + x * cos - y * sin,
      y: center.y + x * sin + y * cos
    };
  }

  function segmentEndpoint(segment) {
    return segment.type === "quadratic" ? segment.p2 : segment.p1;
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function boundsFromPoints(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of points || []) {
      if (!point) continue;
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  function pathForStaticGeometry(geometry) {
    const path = new Path2D();
    for (const contour of geometry.contours || []) {
      if (!contour.length) continue;
      path.moveTo(contour[0].p0.x, contour[0].p0.y);
      for (const segment of contour) {
        if (segment.type === "line") {
          path.lineTo(segment.p1.x, segment.p1.y);
        } else {
          path.quadraticCurveTo(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y);
        }
      }
      path.closePath();
    }
    return path;
  }

  function drawStaticGuides(ctx, geometry, settings = {}) {
    ctx.save();
    if (settings.showBaseline) {
      ctx.strokeStyle = "rgba(5,5,5,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(geometry.baseline.start.x, geometry.baseline.start.y);
      ctx.lineTo(geometry.baseline.end.x, geometry.baseline.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (settings.showBounds) {
      ctx.strokeStyle = "rgba(217,0,0,0.72)";
      ctx.lineWidth = 1.25;
      ctx.strokeRect(
        geometry.screenBounds.x,
        geometry.screenBounds.y,
        geometry.screenBounds.width,
        geometry.screenBounds.height
      );
    }
    ctx.fillStyle = "rgba(5,5,5,0.72)";
    ctx.font = "700 11px Arial, sans-serif";
    ctx.fillText(
      `${geometry.word} · ${geometry.sizePreset.label} · ${geometry.transformPreset.label} · ${geometry.segments.length}/${geometry.totalSegments} segments`,
      12,
      geometry.height - 12
    );
    ctx.restore();
  }

  function drawStaticOverlays(ctx, geometry, settings = {}) {
    if (!settings.showContours && !settings.showSegments) return;
    ctx.save();
    if (settings.showContours) {
      const colors = ["rgba(0,105,255,0.78)", "rgba(0,160,100,0.78)", "rgba(155,70,255,0.72)"];
      geometry.contours.forEach((contour, index) => {
        const path = pathForStaticContour(contour);
        ctx.strokeStyle = colors[index % colors.length];
        ctx.lineWidth = 1.15;
        ctx.stroke(path);
      });
    }
    if (settings.showSegments) {
      ctx.lineWidth = 0.85;
      for (const segment of geometry.segments) {
        const end = segment.type === "quadratic" ? segment.p2 : segment.p1;
        ctx.strokeStyle = segment.type === "quadratic"
          ? "rgba(217,0,0,0.46)"
          : "rgba(5,5,5,0.3)";
        ctx.beginPath();
        ctx.moveTo(segment.p0.x, segment.p0.y);
        if (segment.type === "quadratic") {
          ctx.lineTo(segment.p1.x, segment.p1.y);
          ctx.lineTo(end.x, end.y);
        } else {
          ctx.lineTo(end.x, end.y);
        }
        ctx.stroke();
        drawStaticPoint(ctx, segment.p0, "rgba(5,5,5,0.62)", 1.7);
        drawStaticPoint(ctx, end, "rgba(5,5,5,0.62)", 1.7);
        if (segment.type === "quadratic") {
          drawStaticPoint(ctx, segment.p1, "rgba(217,0,0,0.78)", 2.05);
        }
      }
    }
    ctx.restore();
  }

  function pathForStaticContour(contour) {
    const path = new Path2D();
    if (!contour.length) return path;
    path.moveTo(contour[0].p0.x, contour[0].p0.y);
    for (const segment of contour) {
      if (segment.type === "line") {
        path.lineTo(segment.p1.x, segment.p1.y);
      } else {
        path.quadraticCurveTo(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y);
      }
    }
    path.closePath();
    return path;
  }

  function drawStaticPoint(ctx, point, fill, radius) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function flattenSegmentsForGpu(segments) {
    const safeSegments = segments.slice(0, MAX_GPU_SEGMENTS);
    const data = new Float32Array(Math.max(1, safeSegments.length) * 8);
    safeSegments.forEach((segment, index) => {
      const base = index * 8;
      data[base] = segment.p0.x;
      data[base + 1] = segment.p0.y;
      data[base + 2] = segment.type === "quadratic" ? segment.p1.x : 0;
      data[base + 3] = segment.type === "quadratic" ? segment.p1.y : 0;
      const end = segment.type === "quadratic" ? segment.p2 : segment.p1;
      data[base + 4] = end.x;
      data[base + 5] = end.y;
      data[base + 6] = segment.type === "quadratic" ? 1 : 0;
      data[base + 7] = 0;
    });
    return data;
  }

  function createGpuBuffer(device, data, usage) {
    const buffer = device.createBuffer({
      size: Math.max(4, alignTo(data.byteLength, 4)),
      usage,
      mappedAtCreation: true
    });
    const view = data instanceof Float32Array
      ? new Float32Array(buffer.getMappedRange())
      : new Uint8Array(buffer.getMappedRange());
    view.set(data);
    buffer.unmap();
    return buffer;
  }

  function alignTo(value, alignment) {
    return Math.ceil(value / alignment) * alignment;
  }

  function staticMetricsText(asset, geometry) {
    const maxBand = Math.max(0, ...geometry.glyphReports.map(item => item.maxBand));
    const glyphSummary = geometry.glyphReports
      .map(item => {
        const label = item.char === " " ? "space" : item.char;
        return `${label}:${item.curves}/${item.totalCurves}`;
      })
      .join(" · ");
    const bounds = geometry.screenBounds;
    const truncated = geometry.truncated ? ` · WARNING truncated to ${MAX_GPU_SEGMENTS} segment cap` : "";
    return [
      `${asset.fontId} · ${geometry.word}`,
      `fill ${geometry.fillRule}`,
      `size ${geometry.sizePreset.label}`,
      `transform ${geometry.transformPreset.label}`,
      `bounds ${bounds.x.toFixed(1)},${bounds.y.toFixed(1)} ${bounds.width.toFixed(1)}x${bounds.height.toFixed(1)}px`,
      `segments ${geometry.segments.length}/${geometry.totalSegments}`,
      `max curves/band ${maxBand}`,
      glyphSummary
    ].join(" · ") + truncated;
  }

  function buildAnimatedGlyphFrame(asset, preset, time, stressCount, width, height, options = {}) {
    const word = normalizeStaticWord(preset.word, asset);
    const layout = animatedGlyphLayout(asset, word, preset, width, height);
    const controller = new AnimatedWordMotionController(preset, layout, width, height);
    const deformationConfig = normalizeAnimatedDeformation(preset, options);
    const copyCount = controller.recipe.stress ? stressCount : 1;
    const segments = [];
    const instances = [];
    const wordReports = [];
    const deformationReports = [];
    let totalSegments = 0;
    let instanceTruncated = false;
    for (let copyIndex = 0; copyIndex < copyCount; copyIndex += 1) {
      const copyTime = controller.recipe.stress
        ? (time + copyIndex * controller.stressTimeOffset(copyIndex)) % preset.duration
        : time;
      const wordFrame = controller.build(copyTime, copyIndex, copyCount);
      wordReports.push(wordFrame.word);
      for (const motion of wordFrame.motions) {
        if (motion.opacity <= 0.001 || motion.scale <= 0.001) continue;
        const glyphLayout = motion.glyphLayout;
        const sourceContourData = animatedGlyphContours(glyphLayout.glyph);
        const deformation = animatedDeformationState(deformationConfig, copyTime, motion, glyphLayout, copyIndex);
        const contourData = deformation.active
          ? deformAnimatedGlyphContours(sourceContourData, glyphLayout.glyph.metrics?.bounds, deformation, glyphLayout)
          : sourceContourData;
        if (deformation.active) deformationReports.push(deformation);
        totalSegments += contourData.segments.length;
        if (instances.length >= MAX_ANIMATED_INSTANCES) continue;
        const remaining = Math.max(0, MAX_ANIMATED_SEGMENTS - segments.length);
        const uploaded = contourData.segments.slice(0, remaining);
        if (uploaded.length === 0) continue;
        const segmentOffset = segments.length;
        segments.push(...uploaded);
        const matrix = animatedMatrix(motion, controller.baseScale);
        const localBounds = boundsForAnimatedContours(contourData.contours) || glyphLayout.glyph.metrics?.bounds;
        const sourceLocalBounds = glyphLayout.glyph.metrics?.bounds;
        const bounds = transformedGlyphBounds(localBounds, matrix);
        const sourceBounds = transformedGlyphBounds(sourceLocalBounds, matrix);
        const outlineScale = animatedOutlineScale(preset);
        if (outlineScale > 1) {
          const outlineMatrix = scaleGlyphMatrixAroundBounds(matrix, localBounds, outlineScale);
          const outlineBounds = transformedGlyphBounds(localBounds, outlineMatrix);
          if (instances.length + 1 < MAX_ANIMATED_INSTANCES) {
            instances.push({
              char: glyphLayout.char,
              glyphIndex: glyphLayout.index,
              copyIndex,
              role: "outline",
              contours: contourData.contours,
              originalContours: sourceContourData.contours,
              matrix: outlineMatrix,
              inverse: inverseMatrix(outlineMatrix),
              bounds: outlineBounds,
              sourceBounds,
              fill: preset.outlineFill || "#050505",
              color: hexToRgb(preset.outlineFill || "#050505"),
              opacity: motion.opacity,
              phase: motion.phase,
              channels: motion.channels,
              flowVector: motion.flowVector,
              deformation: deformation.active ? deformation : null,
              segmentOffset,
              segmentCount: uploaded.length
            });
          } else {
            instanceTruncated = true;
          }
        }
        if (instances.length >= MAX_ANIMATED_INSTANCES) {
          instanceTruncated = true;
          continue;
        }
        instances.push({
          char: glyphLayout.char,
          glyphIndex: glyphLayout.index,
          copyIndex,
          role: "fill",
          contours: contourData.contours,
          originalContours: sourceContourData.contours,
          matrix,
          inverse: inverseMatrix(matrix),
          bounds,
          sourceBounds,
          fill: motion.fill,
          color: hexToRgb(motion.fill),
          opacity: motion.opacity,
          phase: motion.phase,
          channels: motion.channels,
          flowVector: motion.flowVector,
          deformation: deformation.active ? deformation : null,
          segmentOffset,
          segmentCount: uploaded.length
        });
      }
    }
    const truncated = totalSegments > segments.length || instanceTruncated;
    const channels = summarizeAnimatedChannels(instances);
    const wordSpeed = average(wordReports.map(report => report.speed));
    const wordEnergy = average(wordReports.map(report => report.energy));
    const deformation = summarizeAnimatedDeformation(deformationConfig, deformationReports);
    return {
      preset,
      word,
      time,
      duration: preset.duration,
      phase: controller.phaseForTime(time),
      channels,
      flowLabel: dominantFlowLabel(channels),
      wordSpeed,
      wordEnergy,
      deformation,
      width,
      height,
      segments,
      totalSegments,
      instances,
      truncated,
      copyCount
    };
  }

  function animatedGlyphLayout(asset, word, preset = {}, width = 512, height = 220) {
    const trackingEm = Number.isFinite(preset.trackingEm) ? preset.trackingEm : 0.03;
    const chars = Array.from(word);
    const glyphs = [];
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    let cursor = 0;
    chars.forEach((char, index) => {
      const glyph = asset.glyphs[char];
      const glyphBounds = glyph.metrics?.bounds;
      glyphs.push({ char, glyph, cursor, index });
      if (glyphBounds) {
        bounds.minX = Math.min(bounds.minX, cursor + glyphBounds.minX);
        bounds.minY = Math.min(bounds.minY, glyphBounds.minY);
        bounds.maxX = Math.max(bounds.maxX, cursor + glyphBounds.maxX);
        bounds.maxY = Math.max(bounds.maxY, glyphBounds.maxY);
      }
      cursor += (glyph.metrics?.advanceEm ?? 0.25) + trackingEm;
    });
    if (!Number.isFinite(bounds.minX)) {
      bounds.minX = 0;
      bounds.minY = 0;
      bounds.maxX = Math.max(0.1, cursor);
      bounds.maxY = 0.55;
    }
    const emWidth = Math.max(0.001, bounds.maxX - bounds.minX);
    const emHeight = Math.max(0.001, bounds.maxY - bounds.minY);
    const scale = Math.min((Math.max(120, width) - 92) / emWidth, (Math.max(120, height) - 54) / emHeight);
    return {
      word,
      glyphs,
      bounds,
      centerEm: {
        x: (bounds.minX + bounds.maxX) * 0.5,
        y: (bounds.minY + bounds.maxY) * 0.5
      },
      scale
    };
  }

  function animatedOutlineScale(preset) {
    if (preset.contrastMode !== "outlined") return 1;
    const scale = Number(preset.outlineScale) || 1;
    return Math.max(1, scale);
  }

  function scaleGlyphMatrixAroundBounds(matrix, bounds, scale) {
    if (scale <= 1) return matrix;
    const safe = bounds || { minX: 0, minY: 0, maxX: 0.2, maxY: 0.5 };
    const center = {
      x: (safe.minX + safe.maxX) * 0.5,
      y: (safe.minY + safe.maxY) * 0.5
    };
    const before = transformByMatrix(center, matrix);
    const scaled = {
      a: matrix.a * scale,
      b: matrix.b * scale,
      c: matrix.c * scale,
      d: matrix.d * scale,
      tx: matrix.tx,
      ty: matrix.ty
    };
    const after = transformByMatrix(center, scaled);
    scaled.tx += before.x - after.x;
    scaled.ty += before.y - after.y;
    return scaled;
  }

  class AnimatedWordMotionController {
    constructor(preset, layout, width, height) {
      this.preset = preset;
      this.layout = layout;
      this.width = width;
      this.height = height;
      this.recipe = normalizeAnimatedRecipe(preset);
      this.direction = normalize(preset.direction || { x: 1, y: 0 });
      this.normal = { x: -this.direction.y, y: this.direction.x };
      this.baseScale = layout.scale * (preset.fit ?? 1);
      this.glyphCount = Math.max(1, layout.glyphs.length);
      this.readableStart = Math.max(...layout.glyphs.map(glyph => this.revealStart(glyph.index) + this.revealSeconds(glyph.index)));
      this.readableEnd = this.readableStart + this.recipe.readableHoldSeconds;
    }

    build(time, copyIndex, copyCount) {
      const targetTime = clamp(time, 0, this.preset.duration);
      const state = this.initialState(copyIndex, copyCount);
      let cursor = 0;
      while (cursor < targetTime) {
        const dt = Math.min(1 / 60, targetTime - cursor);
        cursor += dt;
        this.step(state, dt, cursor);
      }
      const motions = this.buildMotions(state, targetTime, copyIndex);
      const speed = Math.hypot(state.word.velocity.x, state.word.velocity.y);
      return {
        motions,
        phase: this.phaseForTime(targetTime),
        word: {
          speed,
          energy: 0.5 * this.recipe.mass * speed * speed / 10000
        }
      };
    }

    initialState(copyIndex, copyCount) {
      const anchor = this.anchorForCopy(copyIndex, copyCount, 0);
      const startAnchor = this.recipe.railPath?.start || anchor;
      const word = {
        position: { x: startAnchor.x, y: startAnchor.y },
        velocity: { ...(this.recipe.initialVelocity || { x: 0, y: 0 }) },
        rotation: this.preset.rotation || 0,
        angularVelocity: 0
      };
      const glyphs = this.layout.glyphs.map(glyphLayout => {
        const target = this.layoutOffset(glyphLayout);
        const center = this.centerForGlyph(glyphLayout.index);
        const entryDistance = this.recipe.entryDistance + Math.abs(center) * 2.4;
        return {
          glyphLayout,
          target,
          position: {
            x: target.x - this.direction.x * entryDistance + this.normal.x * center * 2.2,
            y: target.y - this.direction.y * entryDistance + this.normal.y * center * 2.2
          },
          velocity: { x: 0, y: 0 },
          rotation: 0,
          angularVelocity: 0
        };
      });
      return { word, glyphs, copyIndex, copyCount };
    }

    step(state, dt, time) {
      const wordForce = { x: 0, y: 0 };
      let torque = 0;
      for (const impulse of this.recipe.impulses) {
        const weight = smoothPulse(time, impulse.start, impulse.start + impulse.seconds);
        wordForce.x += (impulse.force?.x || 0) * weight;
        wordForce.y += (impulse.force?.y || 0) * weight;
        torque += (impulse.torque || 0) * weight;
      }
      if (this.recipe.railPath) {
        const rail = this.recipe.railPath;
        const progress = easeInOut(range(time, rail.startTime, rail.endTime));
        const target = quadraticPoint(rail.start, rail.control, rail.end, progress);
        const tangent = normalize(quadraticTangent(rail.start, rail.control, rail.end, progress));
        const railWeight = range(time, rail.startTime - 0.08, rail.endTime + 0.12);
        wordForce.x += (target.x - state.word.position.x) * rail.spring * railWeight + tangent.x * 48 * railWeight;
        wordForce.y += (target.y - state.word.position.y) * rail.spring * railWeight + tangent.y * 48 * railWeight;
      }
      state.word.velocity.x += (wordForce.x / this.recipe.mass) * dt;
      state.word.velocity.y += (wordForce.y / this.recipe.mass) * dt;
      const wordDrag = Math.exp(-this.recipe.drag * dt);
      state.word.velocity.x *= wordDrag;
      state.word.velocity.y *= wordDrag;
      state.word.position.x += state.word.velocity.x * dt;
      state.word.position.y += state.word.velocity.y * dt;
      state.word.angularVelocity += torque * dt;
      state.word.angularVelocity *= Math.exp(-this.recipe.angularDrag * dt);
      state.word.rotation += state.word.angularVelocity * dt;

      const scatter = this.scatterAt(time);
      const cohesion = this.cohesionAt(time);
      const glyphDamping = this.recipe.cohesion.damping;
      for (const glyph of state.glyphs) {
        const reveal = this.revealAt(glyph.glyphLayout.index, time);
        if (reveal <= 0) continue;
        const center = this.centerForGlyph(glyph.glyphLayout.index);
        const spring = this.recipe.cohesion.spring * cohesion * reveal;
        glyph.velocity.x += (glyph.target.x - glyph.position.x) * spring * dt;
        glyph.velocity.y += (glyph.target.y - glyph.position.y) * spring * dt;
        if (scatter > 0) {
          const scatterForce = this.recipe.scatter.force * scatter * reveal;
          const spreadForce = this.recipe.scatter.spread * center * scatter * reveal;
          const curlForce = (this.recipe.scatter.curl || 0) * scatter * reveal;
          glyph.velocity.x += (this.direction.x * scatterForce + this.normal.x * spreadForce - this.normal.x * curlForce * center) * dt;
          glyph.velocity.y += (this.direction.y * scatterForce + this.normal.y * spreadForce + this.recipe.scatter.gravity * scatter * reveal + this.normal.y * curlForce * center) * dt;
          glyph.angularVelocity += (center * this.recipe.scatter.torque * scatter + (this.recipe.scatter.curl || 0) * 0.006 * scatter) * dt;
        }
        const damping = Math.exp(-glyphDamping * dt);
        glyph.velocity.x *= damping;
        glyph.velocity.y *= damping;
        glyph.position.x += glyph.velocity.x * dt;
        glyph.position.y += glyph.velocity.y * dt;
        glyph.angularVelocity *= Math.exp(-this.recipe.angularDrag * dt);
        glyph.rotation += glyph.angularVelocity * dt;
      }
    }

    buildMotions(state, time, copyIndex) {
      const fade = this.fadeAt(time);
      const scatter = this.scatterAt(time);
      const cohesion = this.cohesionAt(time);
      const impulse = this.impulseAt(time);
      const wordSpeed = Math.hypot(state.word.velocity.x, state.word.velocity.y);
      const settle = this.settleAt(time);
      const readabilityBase = this.readabilityAt(time);
      return state.glyphs.map(glyph => {
        const index = glyph.glyphLayout.index;
        const center = this.centerForGlyph(index);
        const reveal = this.revealAt(index, time);
        const drift = this.livingDrift(index, copyIndex, time, readabilityBase, scatter);
        const local = rotateVector({
          x: glyph.position.x + drift.x,
          y: glyph.position.y + drift.y
        }, state.word.rotation);
        const compression = this.compressionAt(time);
        const accent = this.glyphAccentAt(index, time);
        const phase = this.phaseForTime(time);
        const flowVector = {
          x: state.word.velocity.x * 0.12 + glyph.velocity.x,
          y: state.word.velocity.y * 0.12 + glyph.velocity.y
        };
        const channels = {
          cohesion,
          impulse,
          drag: clamp(wordSpeed / 120, 0, 1),
          settle,
          scatter,
          fade,
          readability: clamp(readabilityBase * reveal, 0, 1)
        };
        return {
          glyphLayout: glyph.glyphLayout,
          x: state.word.position.x + local.x,
          y: state.word.position.y + local.y,
          rotation: state.word.rotation + glyph.rotation + center * 0.018 * scatter,
          scale: Math.max(0, reveal * (1 + accent.scale + settle * 0.015) * (1 - fade * 0.04)),
          scaleX: Math.max(0.05, (this.recipe.ribbonScaleX || 1) + compression.x + accent.scaleX),
          scaleY: Math.max(0.05, (this.recipe.ribbonScaleY || 1) + compression.y + accent.scaleY),
          opacity: clamp(reveal * (1 - fade), 0, 1),
          fill: this.preset.fill,
          channels,
          flowVector,
          phase
        };
      });
    }

    layoutOffset(glyphLayout) {
      return {
        x: (glyphLayout.cursor - this.layout.centerEm.x) * this.baseScale,
        y: this.layout.centerEm.y * this.baseScale
      };
    }

    anchorForCopy(copyIndex, copyCount, time) {
      if (!this.recipe.stress) return this.preset.anchor;
      const cols = Math.ceil(Math.sqrt(copyCount));
      const rows = Math.ceil(copyCount / cols);
      const col = copyIndex % cols;
      const row = Math.floor(copyIndex / cols);
      const xStep = cols > 1 ? (this.width - 144) / (cols - 1) : 0;
      const yStep = rows > 1 ? (this.height - 98) / (rows - 1) : 0;
      const hash = hash01(`${copyIndex}:${this.preset.word}`);
      return {
        x: 72 + col * xStep + Math.sin(time * 2.2 + hash * 6.28) * 4,
        y: 58 + row * yStep + Math.cos(time * 1.7 + hash * 6.28) * 3
      };
    }

    stressTimeOffset(copyIndex) {
      return 0.13 + hash01(`${this.preset.word}:${copyIndex}`) * 0.17;
    }

    centerForGlyph(index) {
      return index - (this.glyphCount - 1) * 0.5;
    }

    revealStart(index) {
      if (Array.isArray(this.recipe.revealStarts) && Number.isFinite(this.recipe.revealStarts[index])) {
        return this.recipe.revealStarts[index];
      }
      return this.recipe.revealStart + index * this.recipe.revealStagger;
    }

    revealSeconds(index) {
      if (Array.isArray(this.recipe.revealSecondsList) && Number.isFinite(this.recipe.revealSecondsList[index])) {
        return this.recipe.revealSecondsList[index];
      }
      return this.recipe.revealSeconds;
    }

    revealAt(index, time) {
      const start = this.revealStart(index);
      return easeOut(range(time, start, start + this.revealSeconds(index)));
    }

    averageRevealAt(time) {
      return average(this.layout.glyphs.map(glyph => this.revealAt(glyph.index, time)));
    }

    impulseAt(time) {
      if (!this.recipe.impulses.length) return 0;
      return clamp(Math.max(...this.recipe.impulses.map(impulse => smoothPulse(time, impulse.start, impulse.start + impulse.seconds))), 0, 1);
    }

    fadeAt(time) {
      return easeInOut(range(time, this.recipe.fade.start, this.recipe.fade.start + this.recipe.fade.seconds));
    }

    scatterAt(time) {
      return easeInOut(range(time, this.recipe.scatter.start, this.recipe.scatter.start + this.recipe.scatter.seconds));
    }

    cohesionAt(time) {
      const decay = easeInOut(range(time, this.recipe.cohesion.decayStart, this.recipe.cohesion.decayStart + this.recipe.cohesion.decaySeconds));
      const floor = this.recipe.cohesion.floor ?? 0.12;
      return clamp(1 - decay * (1 - floor), 0, 1);
    }

    settleAt(time) {
      const plate = this.recipe.plateLock
        ? smoothPulse(time, this.recipe.plateLock.start, this.recipe.plateLock.start + this.recipe.plateLock.seconds)
        : 0;
      const compression = this.recipe.compression
        ? smoothPulse(time, this.recipe.compression.start, this.recipe.compression.start + this.recipe.compression.seconds)
        : 0;
      return clamp(Math.max(plate, compression), 0, 1);
    }

    readabilityAt(time) {
      const reveal = this.averageRevealAt(time);
      const fade = this.fadeAt(time);
      const scatter = this.scatterAt(time);
      const hold = time >= this.readableStart && time <= this.readableEnd ? 1 : 0.82;
      return clamp(reveal * (1 - fade) * (1 - scatter * 0.25) * hold, 0, 1);
    }

    compressionAt(time) {
      if (!this.recipe.compression) return { x: 0, y: 0 };
      const pulse = smoothPulse(time, this.recipe.compression.start, this.recipe.compression.start + this.recipe.compression.seconds);
      return {
        x: pulse * this.recipe.compression.scaleX,
        y: pulse * this.recipe.compression.scaleY
      };
    }

    glyphAccentAt(index, time) {
      const result = { scale: 0, scaleX: 0, scaleY: 0 };
      for (const accent of this.recipe.glyphAccents) {
        if (accent.index !== index) continue;
        const pulse = smoothPulse(time, accent.start, accent.start + accent.seconds);
        result.scale += pulse * (accent.scale || 0);
        result.scaleX += pulse * (accent.scaleX || 0);
        result.scaleY += pulse * (accent.scaleY || 0);
      }
      return result;
    }

    livingDrift(index, copyIndex, time, readability, scatter) {
      const drift = this.recipe.livingDrift;
      const amount = (drift.amount || 0) * readability * (1 - scatter);
      if (amount <= 0) return { x: 0, y: 0 };
      const phase = time * (drift.hz || 1) * Math.PI * 2 + index * 1.47 + copyIndex * 0.83;
      return {
        x: this.normal.x * Math.sin(phase) * amount + this.direction.x * Math.cos(phase * 0.7) * amount * 0.4,
        y: this.normal.y * Math.sin(phase) * amount + this.direction.y * Math.cos(phase * 0.7) * amount * 0.4
      };
    }

    phaseForTime(time) {
      if (this.fadeAt(time) > 0.08) return "fade";
      if (this.scatterAt(time) > 0.16) return "scatter";
      if (this.averageRevealAt(time) < 0.98) return "birth";
      if (time <= this.readableEnd) return "readable";
      return "physicalizing";
    }
  }

  function normalizeAnimatedRecipe(preset) {
    const recipe = preset.recipe || {};
    const cohesion = recipe.cohesion || {};
    const scatter = recipe.scatter || {};
    const fade = recipe.fade || {};
    return {
      mass: Math.max(0.1, recipe.mass ?? 1),
      drag: recipe.drag ?? 2.4,
      angularDrag: recipe.angularDrag ?? 3,
      initialVelocity: recipe.initialVelocity || { x: 0, y: 0 },
      revealStart: recipe.revealStart ?? 0.1,
      revealStarts: recipe.revealStarts || null,
      revealStagger: recipe.revealStagger ?? 0.06,
      revealSeconds: Array.isArray(recipe.revealSeconds) ? 0.3 : (recipe.revealSeconds ?? 0.32),
      revealSecondsList: Array.isArray(recipe.revealSeconds) ? recipe.revealSeconds : null,
      entryDistance: recipe.entryDistance ?? 24,
      readableHoldSeconds: recipe.readableHoldSeconds ?? 0.28,
      impulses: recipe.impulses || [],
      railPath: recipe.railPath || null,
      cohesion: {
        spring: cohesion.spring ?? 28,
        damping: cohesion.damping ?? 8,
        decayStart: cohesion.decayStart ?? 1.2,
        decaySeconds: Math.max(0.001, cohesion.decaySeconds ?? 0.5),
        floor: cohesion.floor
      },
      scatter: {
        start: scatter.start ?? 1.2,
        seconds: Math.max(0.001, scatter.seconds ?? 0.5),
        force: scatter.force ?? 42,
        spread: scatter.spread ?? 30,
        gravity: scatter.gravity ?? 18,
        torque: scatter.torque ?? 0.4,
        curl: scatter.curl || 0
      },
      fade: {
        start: fade.start ?? Math.max(0, (preset.duration || 2) - 0.48),
        seconds: Math.max(0.001, fade.seconds ?? 0.42)
      },
      compression: recipe.compression || null,
      plateLock: recipe.plateLock || null,
      glyphAccents: recipe.glyphAccents || [],
      ribbonScaleX: recipe.ribbonScaleX || 1,
      ribbonScaleY: recipe.ribbonScaleY || 1,
      livingDrift: recipe.livingDrift || { amount: 0, hz: 1 },
      stress: Boolean(recipe.stress)
    };
  }

  function rotateVector(vector, angle) {
    if (!angle) return vector;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: vector.x * cos - vector.y * sin,
      y: vector.x * sin + vector.y * cos
    };
  }

  function average(values) {
    const safe = (values || []).filter(value => Number.isFinite(value));
    if (!safe.length) return 0;
    return safe.reduce((sum, value) => sum + value, 0) / safe.length;
  }

  function hash01(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 100000) / 100000;
  }

  function smoothPulse(time, start, end) {
    const p = range(time, start, Math.max(start + 0.001, end));
    return Math.sin(easeInOut(p) * Math.PI);
  }

  function summarizeAnimatedChannels(instances) {
    const totals = {
      cohesion: 0,
      impulse: 0,
      drag: 0,
      settle: 0,
      scatter: 0,
      fade: 0,
      readability: 0
    };
    const empty = { ...totals };
    if (!instances.length) return totals;
    for (const instance of instances) {
      const channels = instance.channels || empty;
      for (const key of Object.keys(totals)) {
        totals[key] += Number(channels[key]) || 0;
      }
    }
    for (const key of Object.keys(totals)) {
      totals[key] = clamp(totals[key] / instances.length, 0, 1);
    }
    return totals;
  }

  function dominantFlowLabel(channels) {
    if (!channels || channels.readability < 0.04 && channels.fade < 0.04) return "idle";
    if (channels.fade > 0.38) return "fade";
    if (channels.scatter > 0.42) return "scatter";
    if (channels.impulse > 0.34) return "impulse";
    if (channels.drag > 0.45) return "drag";
    if (channels.settle > 0.28) return "settle";
    if (channels.readability > 0.58) return "readability";
    if (channels.cohesion > 0.2) return "cohesion";
    return "idle";
  }

  function animatedGlyphContours(glyph) {
    const contours = [];
    const segments = [];
    for (const contour of glyph.contours || []) {
      const contourSegments = [];
      for (const segment of contour.segments || []) {
        const nextSegment = segment.type === "line"
          ? { type: "line", p0: pointFromArray(segment.p0), p1: pointFromArray(segment.p1) }
          : { type: "quadratic", p0: pointFromArray(segment.p0), p1: pointFromArray(segment.p1), p2: pointFromArray(segment.p2) };
        contourSegments.push(nextSegment);
        segments.push(nextSegment);
      }
      if (contourSegments.length > 0) {
        const firstPoint = contourSegments[0].p0;
        const lastPoint = segmentEndpoint(contourSegments[contourSegments.length - 1]);
        if (distanceBetween(firstPoint, lastPoint) > 0.00001) {
          const closeSegment = { type: "line", p0: lastPoint, p1: firstPoint, syntheticClose: true };
          contourSegments.push(closeSegment);
          segments.push(closeSegment);
        }
        contours.push(contourSegments);
      }
    }
    return { contours, segments };
  }

  function crashDirectionVector(value) {
    const diagonal = Math.SQRT1_2;
    const directions = {
      right: { x: 1, y: 0 },
      down_right: { x: diagonal, y: diagonal },
      down: { x: 0, y: 1 },
      down_left: { x: -diagonal, y: diagonal },
      left: { x: -1, y: 0 },
      up_left: { x: -diagonal, y: -diagonal },
      up: { x: 0, y: -1 },
      up_right: { x: diagonal, y: -diagonal }
    };
    if (typeof value === "string" && directions[value]) return directions[value];
    if (Number(value) < 0) return directions.left;
    return directions.right;
  }

  function crashDentOffset(point, nx, ny, width, height, deformation, glyphLayout) {
    const axis = crashDirectionVector(deformation.direction);
    const normal = { x: -axis.y, y: axis.x };
    const u = nx * axis.x + ny * axis.y;
    const v = nx * normal.x + ny * normal.y;
    const frontWidth = Math.max(0.08, deformation.frontWidth || 0.58);
    const pushDepth = Math.max(0.08, deformation.pushDepth || 0.78);
    const minSpacing = clamp(deformation.minSpacing ?? 0.18, 0.02, 0.86);
    const buckle = Math.max(0, deformation.buckle || 0);
    const rebound = Math.max(0, deformation.rebound || 0);
    const shoveNoise = clamp(deformation.shoveNoise ?? 0.12, 0, 1.4);
    const chainWave = clamp(deformation.chainWave ?? 0.5, 0, 1.5);
    const velocityShove = clamp(deformation.velocityShove ?? 0.24, 0, 1.4);
    const crumpleFrequency = Math.max(1, deformation.crumpleFrequency || 4.2);
    const progress = clamp(deformation.weight ?? deformation.strength, 0, 1);
    const front = easeOut(range(u, 1 - frontWidth, 1.08));
    const wave = Math.exp(-Math.pow((1 - u) / pushDepth, 2));
    const chainFront = 1.16 - progress * (1.85 + chainWave * 0.55);
    const chain = Math.exp(-Math.pow((u - chainFront) / Math.max(0.12, pushDepth * 0.28), 2));
    const hash = hash01(`${deformation.seed}:crash:${glyphLayout.index}:${point.x.toFixed(4)}:${point.y.toFixed(4)}`);
    const hash2 = hash01(`${deformation.seed}:crumple:${glyphLayout.index}:${point.y.toFixed(4)}:${point.x.toFixed(4)}`);
    const shoveVariance = clamp(1 + (hash - 0.5) * shoveNoise * 1.7, 0.18, 2.35);
    const temporalPulse = 0.5 + Math.sin((deformation.localTime || 0) * 11.3 + hash2 * Math.PI * 2 + u * 2.2) * 0.5;
    const velocityPulse = chain * velocityShove * (0.35 + temporalPulse) * (0.55 + hash2);
    const cave = clamp((front * 0.82 + wave * 0.34 + chain * chainWave * 0.74 + velocityPulse * 0.46) * deformation.strength * shoveVariance, 0, 1 - minSpacing * 0.45);
    const layerGuard = 0.42 + 0.58 * range(u, -1, 1);
    const inward = cave * layerGuard;
    const wrinkle = Math.sin(v * Math.PI * crumpleFrequency + (deformation.phase || 0) * Math.PI * 2 + u * 4.6 + hash * Math.PI * 2);
    const corrugation = Math.sin((v + hash2 * 0.42) * Math.PI * (crumpleFrequency * 0.55) + progress * Math.PI * 3.2 + u * 1.8);
    const edgeMask = clamp(front + wave * 0.42 + chain * 0.72, 0, 1);
    const brace = Math.exp(-Math.pow(u + 0.72, 2) / 0.55) * rebound * deformation.strength;
    const sideJolt = (hash2 - 0.5) * shoveNoise * chain * velocityShove * 0.05;
    return {
      x: -axis.x * width * 0.18 * inward
        + normal.x * width * (0.034 * wrinkle + 0.018 * corrugation + sideJolt) * buckle * edgeMask * deformation.strength
        + axis.x * width * 0.035 * brace,
      y: -axis.y * height * 0.18 * inward
        + normal.y * height * (0.034 * wrinkle + 0.018 * corrugation + sideJolt) * buckle * edgeMask * deformation.strength
        + axis.y * height * 0.035 * brace
    };
  }

  function normalizeAnimatedDeformation(preset, options = {}) {
    const mode = options.deformationMode || "current";
    if (mode === "off") return { enabled: false, mode: "off", label: "off" };
    const recipe = mode === "current"
      ? preset.deformation
      : defaultAnimatedDeformation(mode);
    if (!recipe?.type) return { enabled: false, mode, label: "none" };
    const strengthMultiplier = clamp(Number(options.deformationStrength) || 1, 0, 1.6)
      * (options.reducedDeform ? 0.55 : 1);
    return {
      enabled: true,
      mode,
      type: recipe.type,
      label: mode === "current" ? recipe.type : `${recipe.type} manual`,
      start: recipe.start ?? 0.72,
      seconds: Math.max(0.001, recipe.seconds ?? 0.72),
      curve: recipe.curve || "pulse",
      strength: Math.max(0, recipe.strength ?? 0.6),
      strengthMultiplier,
      maxOffsetEm: Math.max(0.005, recipe.maxOffsetEm ?? 0.09),
      side: recipe.side || "left",
      seed: recipe.seed || preset.title || preset.word || recipe.type,
      twist: recipe.twist ?? 0.5,
      turns: recipe.turns ?? 2.5,
      inward: recipe.inward ?? 0.82,
      glyphStagger: Math.max(0, recipe.glyphStagger ?? 0),
      twistVariance: recipe.twistVariance ?? 0.45,
      shrinkMin: recipe.shrinkMin ?? 0.12,
      rippleWidth: recipe.rippleWidth ?? 0.42,
      rippleCycles: recipe.rippleCycles ?? 1.15,
      rippleAmplitude: recipe.rippleAmplitude ?? 1,
      readabilityGate: recipe.readabilityGate !== false,
      direction: recipe.direction ?? 1,
      frontWidth: recipe.frontWidth ?? 0.58,
      pushDepth: recipe.pushDepth ?? 0.78,
      minSpacing: clamp(recipe.minSpacing ?? 0.18, 0.02, 0.86),
      buckle: recipe.buckle ?? 0.55,
      rebound: recipe.rebound ?? 0.14,
      shoveNoise: recipe.shoveNoise ?? 0.12,
      chainWave: recipe.chainWave ?? 0.5,
      velocityShove: recipe.velocityShove ?? 0.24,
      crumpleFrequency: recipe.crumpleFrequency ?? 4.2,
      phase: recipe.phase || 0
    };
  }

  function defaultAnimatedDeformation(type) {
    const defaults = {
      rubber_smear: { type, start: 0.9, seconds: 0.7, strength: 0.8, curve: "pulse", maxOffsetEm: 0.13 },
      impact_dent: { type, start: 0.72, seconds: 0.62, strength: 0.78, curve: "pulse", maxOffsetEm: 0.11, side: "left" },
      ribbon_bend: { type, start: 0.58, seconds: 1.0, strength: 0.6, curve: "hold", maxOffsetEm: 0.1 },
      accordion_plate: { type, start: 0.32, seconds: 0.58, strength: 0.56, curve: "pulse", maxOffsetEm: 0.07 },
      spiky_fracture: { type, start: 0.76, seconds: 0.9, strength: 0.72, curve: "hold", maxOffsetEm: 0.075, seed: "manual-spike" },
      corkscrew_exit: { type, start: 1.02, seconds: 0.9, strength: 0.72, curve: "ramp", maxOffsetEm: 0.14, twist: 0.55 },
      wormhole_spiral: { type, start: 1.08, seconds: 0.82, strength: 0.9, curve: "ramp", maxOffsetEm: 0.32, turns: 3.0, inward: 0.9, seed: "manual-wormhole" },
      wormhole_unfold: { type: "wormhole_spiral", start: 0.02, seconds: 1.28, strength: 1, curve: "reverse_ramp", maxOffsetEm: 0.68, turns: 2.35, inward: 0.96, direction: -1, readabilityGate: false, seed: "manual-wormhole-unfold" },
      letter_twist_shrink: { type, start: 1.08, seconds: 0.98, glyphStagger: 0.2, strength: 1, curve: "ramp", maxOffsetEm: 0.42, turns: 1.45, twistVariance: 0.75, shrinkMin: 0.09, seed: "manual-letter-twist" },
      flow_ripple: { type, start: 1.02, seconds: 1.22, glyphStagger: 0.05, strength: 0.95, curve: "hold", maxOffsetEm: 0.2, rippleWidth: 0.62, rippleCycles: 0.72, rippleAmplitude: 1.42, seed: "manual-flow-ripple" },
      crash_dent: { type, start: 0.84, seconds: 0.78, strength: 1.08, curve: "hold", maxOffsetEm: 0.28, direction: "up_right", frontWidth: 0.68, pushDepth: 0.96, minSpacing: 0.18, buckle: 0.92, rebound: 0.22, shoveNoise: 0.72, chainWave: 0.82, velocityShove: 0.42, crumpleFrequency: 5.4, seed: "manual-crash-dent" }
    };
    return defaults[type] || null;
  }

  function animatedDeformationState(config, time, motion, glyphLayout, copyIndex) {
    if (!config?.enabled) return { active: false };
    const glyphDelay = (config.glyphStagger || 0) * Math.max(0, glyphLayout.index || 0);
    const localTime = time - glyphDelay;
    const curveWeight = animatedDeformationCurveWeight(config, localTime);
    const readableGate = config.readabilityGate === false
      ? 1
      : clamp((motion.channels?.readability || 0) * 1.35 - 0.18, 0, 1);
    const weight = clamp(curveWeight * readableGate, 0, 1);
    const strength = config.strength * config.strengthMultiplier * weight;
    return {
      ...config,
      active: strength > 0.002,
      weight,
      strength,
      time,
      localTime,
      glyphDelay,
      copyIndex,
      glyphIndex: glyphLayout.index
    };
  }

  function animatedDeformationCurveWeight(config, time) {
    const start = config.start;
    const end = start + config.seconds;
    if (config.curve === "ramp") return easeInOut(range(time, start, end));
    if (config.curve === "reverse_ramp") return 1 - easeInOut(range(time, start, end));
    if (config.curve === "hold") {
      const attack = easeOut(range(time, start, start + config.seconds * 0.28));
      const release = 1 - easeInOut(range(time, start + config.seconds * 0.74, end));
      return clamp(attack * release, 0, 1);
    }
    return smoothPulse(time, start, end);
  }

  function deformAnimatedGlyphContours(contourData, glyphBounds, deformation, glyphLayout) {
    const contours = [];
    const segments = [];
    for (const contour of contourData.contours || []) {
      const nextContour = [];
      for (const segment of contour) {
        const nextSegment = segment.type === "line"
          ? {
            type: "line",
            p0: deformAnimatedPoint(segment.p0, glyphBounds, deformation, glyphLayout),
            p1: deformAnimatedPoint(segment.p1, glyphBounds, deformation, glyphLayout),
            syntheticClose: segment.syntheticClose
          }
          : {
            type: "quadratic",
            p0: deformAnimatedPoint(segment.p0, glyphBounds, deformation, glyphLayout),
            p1: deformAnimatedPoint(segment.p1, glyphBounds, deformation, glyphLayout),
            p2: deformAnimatedPoint(segment.p2, glyphBounds, deformation, glyphLayout),
            syntheticClose: segment.syntheticClose
          };
        nextContour.push(nextSegment);
        segments.push(nextSegment);
      }
      if (nextContour.length) contours.push(nextContour);
    }
    return { contours, segments };
  }

  function deformAnimatedPoint(point, bounds, deformation, glyphLayout) {
    const safe = bounds || { minX: -0.1, minY: -0.1, maxX: 0.1, maxY: 0.6 };
    const width = Math.max(0.001, safe.maxX - safe.minX);
    const height = Math.max(0.001, safe.maxY - safe.minY);
    const center = { x: (safe.minX + safe.maxX) * 0.5, y: (safe.minY + safe.maxY) * 0.5 };
    const nx = clamp((point.x - center.x) / (width * 0.5), -1.6, 1.6);
    const ny = clamp((point.y - center.y) / (height * 0.5), -1.6, 1.6);
    const maxOffset = deformation.maxOffsetEm;
    let dx = 0;
    let dy = 0;

    if (deformation.type === "rubber_smear") {
      const front = easeOut(range(nx, -0.18, 1.08));
      const centerBand = 1 - Math.min(0.65, Math.abs(ny) * 0.24);
      dx += front * centerBand * width * 0.16 * deformation.strength;
      dy += Math.sin((ny + 1 + deformation.phase) * Math.PI) * width * 0.012 * deformation.strength;
    } else if (deformation.type === "impact_dent") {
      const sideSign = deformation.side === "right" ? 1 : -1;
      const hitSide = sideSign < 0 ? -1 : 1;
      const dent = Math.exp(-Math.pow(nx - hitSide, 2) / 0.28);
      const bulge = Math.exp(-Math.pow(nx + hitSide * 0.45, 2) / 0.58);
      dx += -sideSign * dent * width * 0.12 * deformation.strength;
      dx += sideSign * bulge * width * 0.052 * deformation.strength;
      dy += Math.sign(ny || 1) * bulge * height * 0.042 * deformation.strength;
    } else if (deformation.type === "crash_dent") {
      const crash = crashDentOffset(point, nx, ny, width, height, deformation, glyphLayout);
      dx += crash.x;
      dy += crash.y;
    } else if (deformation.type === "ribbon_bend") {
      const along = range(nx, -1.05, 1.05);
      const ribbon = Math.sin((along + deformation.phase) * Math.PI);
      dy += ribbon * height * 0.13 * deformation.strength;
      dx += Math.sin(along * Math.PI * 2) * width * 0.015 * deformation.strength;
    } else if (deformation.type === "accordion_plate") {
      const fold = Math.sin((nx + 1) * Math.PI * 2.5);
      dx += fold * width * 0.018 * deformation.strength;
      dy += -ny * height * 0.055 * deformation.strength;
    } else if (deformation.type === "spiky_fracture") {
      const edge = range(Math.max(Math.abs(nx), Math.abs(ny)), 0.35, 1.05);
      const length = Math.max(0.001, Math.hypot(nx, ny));
      const hash = hash01(`${deformation.seed}:${glyphLayout.index}:${point.x.toFixed(4)}:${point.y.toFixed(4)}`);
      const pulse = 0.7 + Math.sin(deformation.time * 22 + hash * Math.PI * 2) * 0.3;
      const offset = edge * pulse * deformation.strength * maxOffset * (0.45 + hash * 0.95);
      dx += (nx / length) * offset;
      dy += (ny / length) * offset;
    } else if (deformation.type === "corkscrew_exit") {
      const radius = clamp(Math.hypot(nx, ny) / 1.35, 0, 1.25);
      const angle = deformation.strength * (deformation.twist || 0.5) * radius * 1.55;
      const rel = { x: point.x - center.x, y: point.y - center.y };
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotated = {
        x: rel.x * cos - rel.y * sin,
        y: rel.x * sin + rel.y * cos
      };
      dx += rotated.x - rel.x + nx * width * 0.028 * deformation.strength * radius;
      dy += rotated.y - rel.y + ny * height * 0.028 * deformation.strength * radius;
    } else if (deformation.type === "wormhole_spiral") {
      const rel = { x: point.x - center.x, y: point.y - center.y };
      const length = Math.max(0.001, Math.hypot(rel.x, rel.y));
      const radius = clamp(Math.hypot(nx, ny) / 1.35, 0, 1.25);
      const progress = easeInOut(clamp(deformation.weight * deformation.strengthMultiplier, 0, 1));
      const glyphHash = hash01(`${deformation.seed}:spiral:${glyphLayout.index}`);
      const direction = Number(deformation.direction) < 0 ? -1 : 1;
      const turns = Math.max(0.25, deformation.turns || 3);
      const inward = clamp(deformation.inward ?? 0.9, 0, 0.96);
      const collapseScale = Math.max(0.055, 1 - progress * inward);
      const angle = direction * progress * (
        turns * Math.PI * 2 +
        radius * Math.PI * 1.35 +
        (glyphHash - 0.5) * 0.75
      );
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotated = {
        x: rel.x * cos - rel.y * sin,
        y: rel.x * sin + rel.y * cos
      };
      const target = {
        x: center.x + rotated.x * collapseScale,
        y: center.y + rotated.y * collapseScale
      };
      const tangent = { x: -rel.y / length, y: rel.x / length };
      const coil = Math.sin(radius * turns * Math.PI * 2 + progress * Math.PI * 5 + glyphHash * Math.PI * 2);
      const coilOffset = coil * maxOffset * 0.12 * progress * (1 - progress * 0.35);
      dx += (target.x - point.x) * clamp(deformation.strength * 1.08, 0, 1.05);
      dy += (target.y - point.y) * clamp(deformation.strength * 1.08, 0, 1.05);
      dx += tangent.x * coilOffset;
      dy += tangent.y * coilOffset;
    } else if (deformation.type === "letter_twist_shrink") {
      const rel = { x: point.x - center.x, y: point.y - center.y };
      const radius = clamp(Math.hypot(nx, ny) / 1.4, 0, 1.25);
      const progress = easeInOut(clamp(deformation.weight * deformation.strengthMultiplier, 0, 1));
      const hash = hash01(`${deformation.seed}:letter:${glyphLayout.index}:${point.x.toFixed(4)}:${point.y.toFixed(4)}`);
      const direction = Number(deformation.direction) < 0 ? -1 : 1;
      const turns = Math.max(0.1, deformation.turns || 1.45);
      const variance = Math.max(0, deformation.twistVariance || 0.75);
      const pointTwist = 1 + (hash - 0.5) * variance + radius * variance * 0.45;
      const angle = direction * progress * turns * Math.PI * 2 * pointTwist;
      const shrinkFloor = clamp(deformation.shrinkMin ?? 0.1, 0.04, 0.45);
      const pointShrink = shrinkFloor + hash * 0.045;
      const shrink = 1 - progress * (1 - pointShrink);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotated = {
        x: rel.x * cos - rel.y * sin,
        y: rel.x * sin + rel.y * cos
      };
      const target = {
        x: center.x + rotated.x * shrink,
        y: center.y + rotated.y * shrink
      };
      dx += target.x - point.x;
      dy += target.y - point.y;
    } else if (deformation.type === "flow_ripple") {
      const progress = clamp((deformation.localTime - deformation.start) / deformation.seconds, 0, 1);
      const direction = Number(deformation.direction) < 0 ? -1 : 1;
      const sweep = direction > 0
        ? -1.2 + progress * 2.4
        : 1.2 - progress * 2.4;
      const widthScale = Math.max(0.08, deformation.rippleWidth || 0.42);
      const distance = nx - sweep;
      const envelope = Math.exp(-Math.pow(distance / widthScale, 2));
      const cycles = Math.max(0.2, deformation.rippleCycles || 1.15);
      const phase = (distance / widthScale) * Math.PI * cycles + (deformation.phase || 0) * Math.PI * 2;
      const wave = Math.sin(phase) * envelope * deformation.strength;
      const verticalBias = 0.65 + Math.min(0.45, Math.abs(ny) * 0.18);
      const drag = Math.cos(phase) * envelope * deformation.strength;
      const amplitude = Math.max(0.05, deformation.rippleAmplitude || 1);
      dx += direction * drag * width * 0.025 * amplitude;
      dy += wave * height * 0.075 * verticalBias * amplitude;
    }

    const offsetLength = Math.hypot(dx, dy);
    if (offsetLength > maxOffset) {
      const scale = maxOffset / offsetLength;
      dx *= scale;
      dy *= scale;
    }
    return { x: point.x + dx, y: point.y + dy };
  }

  function boundsForAnimatedContours(contours) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const contour of contours || []) {
      for (const segment of contour) {
        for (const point of [segment.p0, segment.p1, segment.p2]) {
          if (!point) continue;
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      }
    }
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
  }

  function summarizeAnimatedDeformation(config, reports) {
    if (!config?.enabled) return { label: "off", active: false, strength: 0, weight: 0 };
    return {
      label: config.label,
      type: config.type,
      active: reports.length > 0,
      strength: average(reports.map(report => report.strength)),
      weight: average(reports.map(report => report.weight))
    };
  }

  function pointFromArray(point) {
    return { x: point[0], y: point[1] };
  }

  function animatedMatrix(motion, baseScale) {
    const scale = baseScale * motion.scale;
    const sx = scale * motion.scaleX;
    const sy = -scale * motion.scaleY;
    const cos = Math.cos(motion.rotation || 0);
    const sin = Math.sin(motion.rotation || 0);
    return {
      a: cos * sx,
      b: sin * sx,
      c: -sin * sy,
      d: cos * sy,
      tx: motion.x,
      ty: motion.y
    };
  }

  function inverseMatrix(matrix) {
    const det = matrix.a * matrix.d - matrix.b * matrix.c;
    if (Math.abs(det) < 0.000001) {
      return { a: 1, b: 0, c: 0, d: 1 };
    }
    return {
      a: matrix.d / det,
      b: -matrix.b / det,
      c: -matrix.c / det,
      d: matrix.a / det
    };
  }

  function transformedGlyphBounds(bounds, matrix) {
    const safe = bounds || { minX: 0, minY: 0, maxX: 0.2, maxY: 0.5 };
    return boundsFromPoints([
      transformByMatrix({ x: safe.minX, y: safe.minY }, matrix),
      transformByMatrix({ x: safe.maxX, y: safe.minY }, matrix),
      transformByMatrix({ x: safe.maxX, y: safe.maxY }, matrix),
      transformByMatrix({ x: safe.minX, y: safe.maxY }, matrix)
    ]);
  }

  function transformByMatrix(point, matrix) {
    return {
      x: matrix.a * point.x + matrix.c * point.y + matrix.tx,
      y: matrix.b * point.x + matrix.d * point.y + matrix.ty
    };
  }

  function animatedGlyphPath(contours) {
    const path = new Path2D();
    for (const contour of contours || []) {
      if (!contour.length) continue;
      path.moveTo(contour[0].p0.x, contour[0].p0.y);
      for (const segment of contour) {
        if (segment.type === "line") {
          path.lineTo(segment.p1.x, segment.p1.y);
        } else {
          path.quadraticCurveTo(segment.p1.x, segment.p1.y, segment.p2.x, segment.p2.y);
        }
      }
      path.closePath();
    }
    return path;
  }

  function flattenAnimatedInstances(instances) {
    const safeInstances = instances.slice(0, MAX_ANIMATED_INSTANCES);
    const data = new Float32Array(Math.max(1, safeInstances.length) * 16);
    safeInstances.forEach((instance, index) => {
      const base = index * 16;
      data[base] = instance.inverse.a;
      data[base + 1] = instance.inverse.b;
      data[base + 2] = instance.inverse.c;
      data[base + 3] = instance.inverse.d;
      data[base + 4] = instance.matrix.tx;
      data[base + 5] = instance.matrix.ty;
      data[base + 6] = instance.segmentOffset;
      data[base + 7] = instance.segmentCount;
      data[base + 8] = instance.bounds.x;
      data[base + 9] = instance.bounds.y;
      data[base + 10] = instance.bounds.x + instance.bounds.width;
      data[base + 11] = instance.bounds.y + instance.bounds.height;
      data[base + 12] = instance.color.r;
      data[base + 13] = instance.color.g;
      data[base + 14] = instance.color.b;
      data[base + 15] = instance.opacity;
    });
    return data;
  }

  function drawAnimatedReference(ctx, frame) {
    ctx.save();
    ctx.strokeStyle = "rgba(5,5,5,0.13)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(20, frame.height * 0.5);
    ctx.lineTo(frame.width - 20, frame.height * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawAnimatedBounds(ctx, frame) {
    ctx.save();
    ctx.strokeStyle = "rgba(72, 200, 120, 0.52)";
    ctx.lineWidth = 1;
    for (const instance of frame.instances) {
      ctx.strokeRect(instance.bounds.x, instance.bounds.y, instance.bounds.width, instance.bounds.height);
    }
    ctx.restore();
  }

  function drawAnimatedOriginalGhost(ctx, frame) {
    ctx.save();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = "rgba(0, 92, 190, 0.34)";
    ctx.fillStyle = "rgba(0, 92, 190, 0.06)";
    for (const instance of frame.instances) {
      if (instance.role === "outline" || !instance.originalContours || !instance.deformation) continue;
      ctx.save();
      ctx.setTransform(
        instance.matrix.a,
        instance.matrix.b,
        instance.matrix.c,
        instance.matrix.d,
        instance.matrix.tx,
        instance.matrix.ty
      );
      const path = animatedGlyphPath(instance.originalContours);
      ctx.fill(path, "evenodd");
      ctx.stroke(path);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawAnimatedDeformedBounds(ctx, frame) {
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(220, 0, 165, 0.75)";
    for (const instance of frame.instances) {
      if (!instance.deformation || instance.role === "outline") continue;
      ctx.strokeRect(instance.bounds.x, instance.bounds.y, instance.bounds.width, instance.bounds.height);
      if (instance.sourceBounds) {
        ctx.save();
        ctx.strokeStyle = "rgba(0, 92, 190, 0.38)";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(instance.sourceBounds.x, instance.sourceBounds.y, instance.sourceBounds.width, instance.sourceBounds.height);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawAnimatedFlowVectors(ctx, frame) {
    ctx.save();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(0, 92, 190, 0.52)";
    ctx.fillStyle = "rgba(230, 0, 0, 0.62)";
    for (const instance of frame.instances) {
      if (instance.role === "outline") continue;
      const vector = instance.flowVector || { x: 0, y: 0 };
      const length = Math.hypot(vector.x, vector.y);
      if (length < 0.5) continue;
      const cx = instance.bounds.x + instance.bounds.width * 0.5;
      const cy = instance.bounds.y + instance.bounds.height * 0.5;
      const drawLength = clamp(length * 0.35, 4, 42);
      const ux = vector.x / length;
      const uy = vector.y / length;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ux * drawLength, cy + uy * drawLength);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + ux * drawLength, cy + uy * drawLength, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAnimatedPhase(ctx, frame) {
    ctx.save();
    ctx.fillStyle = "rgba(5,5,5,0.68)";
    ctx.font = "800 11px Arial, sans-serif";
    ctx.fillText(
      `${frame.preset.title} · ${frame.phase} · ${frame.flowLabel} · deform ${frame.deformation?.label || "off"} · ${frame.instances.length} glyphs`,
      12,
      frame.height - 12
    );
    ctx.restore();
  }

  function animatedMetricsText(frame) {
    const warning = frame.truncated ? " · WARNING cap/truncation active" : "";
    const channels = frame.channels || {};
    const outlineCount = frame.instances.filter(instance => instance.role === "outline").length;
    const fillCount = frame.instances.length - outlineCount;
    const flow = [
      `coh ${channelText(channels.cohesion)}`,
      `imp ${channelText(channels.impulse)}`,
      `drag ${channelText(channels.drag)}`,
      `set ${channelText(channels.settle)}`,
      `scat ${channelText(channels.scatter)}`,
      `fade ${channelText(channels.fade)}`,
      `read ${channelText(channels.readability)}`
    ].join(" ");
    return [
      frame.preset.title,
      `controller ${frame.phase}/${frame.flowLabel}`,
      flow,
      `word ${channelText(frame.wordSpeed)}px/s energy ${channelText(frame.wordEnergy)}`,
      `deform ${frame.deformation?.label || "off"} ${frame.deformation?.active ? channelText(frame.deformation.strength) : "idle"}`,
      `${fillCount} glyphs + ${outlineCount} outlines / ${MAX_ANIMATED_INSTANCES} instances`,
      `${frame.segments.length}/${frame.totalSegments} segments`,
      `${frame.copyCount} word copies`,
      `${frame.time.toFixed(2)}s`
    ].join(" · ") + warning;
  }

  function channelText(value) {
    return (Number(value) || 0).toFixed(2);
  }

  function hexToRgb(hex) {
    const value = String(hex || "#050505").replace("#", "");
    const parsed = Number.parseInt(value.length === 3
      ? value.split("").map(char => char + char).join("")
      : value, 16);
    if (!Number.isFinite(parsed)) return { r: 0.02, g: 0.02, b: 0.02 };
    return {
      r: ((parsed >> 16) & 255) / 255,
      g: ((parsed >> 8) & 255) / 255,
      b: (parsed & 255) / 255
    };
  }

  const SAMPLES = [
    {
      id: "pow-exits-skull",
      title: "POW exits skull",
      note: "Far-side head impact: letters appear outside the body, keep moving, then splash away.",
      tags: ["hit", "glyphs", "exit-side"],
      duration: 1.8,
      impact: 0.18,
      shake: 4,
      choreographies: [
        {
          id: "pow",
          text: "POW",
          phases: [
            { name: "impact", start: 0.18, end: 0.24 },
            { name: "build", start: 0.14, end: 0.45 },
            { name: "read", start: 0.45, end: 0.73 },
            { name: "move", start: 0.73, end: 1.07 },
            { name: "separate", start: 1.07, end: 1.27 },
            { name: "fade", start: 1.27, end: 1.61 }
          ],
          origin: { x: 414, y: 97 },
          direction: { x: 1, y: -0.18 },
          style: { size: 58, fill: BLACK, stroke: "white", strokeWidth: 8, tracking: 3 },
          controller: { fit: 0.43, trackingEm: 0.05 },
          protectedLane: { heroX: 150, enemyX: 290 },
          motion: { distance: 46, postDriftSpeed: 34, yScale: 0.55 },
          separate: { forwardDistance: 28, spreadDistance: 15, gravity: 18, rotation: 0.18 },
          trailSteps: 3
        }
      ],
      draw: drawPowExitsSkull
    },
    {
      id: "bam-compression",
      title: "BAM torso compression",
      note: "Torso hit stays outside the lane, compresses, then keeps drifting with impact momentum.",
      tags: ["hit", "squash", "torso"],
      duration: 1.2,
      impact: 0.16,
      shake: 3.5,
      choreographies: [
        {
          id: "bam",
          text: "BAM",
          phases: [
            { name: "impact", start: 0.16, end: 0.22 },
            { name: "build", start: 0.14, end: 0.32 },
            { name: "read", start: 0.32, end: 0.54 },
            { name: "move", start: 0.54, end: 0.82 },
            { name: "separate", start: 0.82, end: 0.98 },
            { name: "fade", start: 0.98, end: 1.18 }
          ],
          origin: { x: 418, y: 159 },
          direction: { x: 1, y: -0.08 },
          style: { size: 70, fill: BLACK, stroke: "white", strokeWidth: 8, tracking: 3 },
          controller: { fit: 0.5, trackingEm: 0.055 },
          protectedLane: { heroX: 150, enemyX: 292 },
          motion: { distance: 44, postDriftSpeed: 38, yScale: 0.55 },
          separate: { forwardDistance: 18, spreadDistance: 10, gravity: 12, rotation: 0.08 },
          squash: { amount: 0.32, start: 0.14, end: 0.36 },
          trailSteps: 3
        }
      ],
      draw: drawBamCompression
    },
    {
      id: "whiff-arc",
      title: "WHIFF arc",
      note: "A miss gets thin grey text outside the fight lane: build, read, arc away, fade.",
      tags: ["whiff", "arc", "no-red"],
      duration: 1.9,
      impact: 0.24,
      shake: 0.4,
      choreographies: [
        {
          id: "whiff",
          text: "WHIFF",
          phases: [
            { name: "impact", start: 0.24, end: 0.3 },
            { name: "build", start: 0.16, end: 0.58 },
            { name: "read", start: 0.58, end: 0.8 },
            { name: "move", start: 0.8, end: 1.24 },
            { name: "separate", start: 1.28, end: 1.46 },
            { name: "fade", start: 1.46, end: 1.82 }
          ],
          path: {
            type: "quadratic",
            start: { x: 380, y: 84 },
            control: { x: 430, y: 42 },
            end: { x: 500, y: 96 },
            startT: 0.08,
            endT: 0.84
          },
          style: { size: 38, fill: SOFT_INK, stroke: "white", strokeWidth: 4, tracking: 1 },
          controller: { fit: 0.28, trackingEm: 0.03, fill: SOFT_INK, outlineFill: "white", outlineScale: 1.025 },
          opacity: 0.78,
          protectedLane: { heroX: 160, enemyX: 328 },
          build: { entryDistance: 14, settleDistance: 4, birthSeconds: 0.16 },
          motion: { postDriftSpeed: 24, yScale: 1 },
          separate: { forwardDistance: 22, spreadDistance: 11, gravity: 10, rotation: 0.1 },
          trailSteps: 2
        }
      ],
      draw: drawWhiffArc
    },
    {
      id: "block-plate",
      title: "BLOCK plate",
      note: "Block text may live in the gap, but it stays compact, flat, and short-lived.",
      tags: ["block", "yellow", "gap-ok"],
      duration: 1.05,
      impact: 0.18,
      shake: 2,
      choreographies: [
        {
          id: "clack",
          text: "CLACK",
          phases: [
            { name: "impact", start: 0.18, end: 0.24 },
            { name: "build", start: 0.16, end: 0.28 },
            { name: "read", start: 0.28, end: 0.46 },
            { name: "move", start: 0.46, end: 0.58 },
            { name: "separate", start: 0.58, end: 0.74 },
            { name: "fade", start: 0.74, end: 0.98 }
          ],
          origin: { x: 229, y: 141 },
          direction: { x: 1, y: -0.22 },
          style: { size: 48, fill: BLACK, stroke: YELLOW, strokeWidth: 6, tracking: 1, scaleX: 1.38, scaleY: 0.66 },
          controller: { fit: 0.35, trackingEm: 0.09, fill: YELLOW, outlineFill: BLACK, outlineScale: 1.06, contrastMode: "outlined" },
          protectedLane: { heroX: 166, enemyX: 288, allowOverlap: true },
          build: { entryDistance: 6, settleDistance: 2, birthSeconds: 0.08 },
          motion: { distance: 16, postDriftSpeed: 22, yScale: 0.75 },
          separate: { forwardDistance: 10, spreadDistance: 5, gravity: 4, rotation: 0.05 },
          squash: { amount: 0.18, start: 0.16, end: 0.32 },
          trailSteps: 1
        }
      ],
      draw: drawBlockPlate
    },
    {
      id: "thud-floor",
      title: "THUD floor",
      note: "A ground/body word rides the floor outside the bodies, then smears into dust.",
      tags: ["floor", "body", "settle"],
      duration: 1.25,
      impact: 0.2,
      shake: 3,
      choreographies: [
        {
          id: "thud",
          text: "THUD",
          phases: [
            { name: "impact", start: 0.2, end: 0.26 },
            { name: "build", start: 0.2, end: 0.35 },
            { name: "read", start: 0.35, end: 0.58 },
            { name: "move", start: 0.58, end: 0.86 },
            { name: "separate", start: 0.86, end: 1.02 },
            { name: "fade", start: 1.02, end: 1.22 }
          ],
          origin: { x: 411, y: FLOOR_Y + 4 },
          direction: { x: 1, y: 0.08 },
          style: { size: 58, fill: BLACK, stroke: "white", strokeWidth: 7, tracking: 2, scaleX: 1.1, scaleY: 0.78 },
          controller: { fit: 0.38, trackingEm: 0.045 },
          protectedLane: { heroX: 150, enemyX: 295 },
          motion: { distance: 42, postDriftSpeed: 28, yScale: 0.7 },
          separate: { forwardDistance: 18, spreadDistance: 8, gravity: 12, rotation: 0.2 },
          squash: { amount: 0.12, start: 0.2, end: 0.42 },
          trailSteps: 3
        }
      ],
      draw: drawThudFloor
    },
    {
      id: "afterbeat-double",
      title: "Afterbeat double hit",
      note: "Primary punch word keeps flowing; the terminal glyph accent catches up and overtakes it.",
      tags: ["afterbeat", "cadence", "glyphs"],
      duration: 2.05,
      impact: 0.17,
      shake: 5,
      choreographies: [
        {
          id: "pow",
          text: "POW",
          phases: [
            { name: "impact", start: 0.17, end: 0.24 },
            { name: "build", start: 0.17, end: 0.48 },
            { name: "read", start: 0.48, end: 0.72 },
            { name: "move", start: 0.72, end: 1.08 },
            { name: "separate", start: 1.08, end: 1.46 },
            { name: "fade", start: 1.46, end: 1.92 }
          ],
          origin: { x: 408, y: 127 },
          direction: { x: 1, y: -0.1 },
          style: { size: 52, fill: BLACK, stroke: "white", strokeWidth: 7, tracking: 3 },
          controller: { fit: 0.38, trackingEm: 0.05 },
          protectedLane: { heroX: 150, enemyX: 292 },
          motion: { distance: 38, postDriftSpeed: 30, yScale: 0.55 },
          separate: { forwardDistance: 20, spreadDistance: 13, gravity: 14, rotation: 0.14 },
          trailSteps: 3
        },
        {
          id: "pak",
          text: "PAK",
          phases: [
            { name: "impact", start: 0.68, end: 0.75 },
            { name: "build", start: 0.68, end: 0.9 },
            { name: "read", start: 0.9, end: 1.08 },
            { name: "move", start: 1.08, end: 1.24 },
            { name: "separate", start: 1.24, end: 1.46 },
            { name: "fade", start: 1.46, end: 1.92 }
          ],
          origin: { x: 442, y: 109 },
          direction: { x: 1, y: -0.22 },
          style: { size: 54, fill: RED, stroke: BLACK, strokeWidth: 5, tracking: 2 },
          controller: { delay: 0.56, duration: 1.34, fit: 0.4, trackingEm: 0.045, fill: RED, outlineFill: BLACK, outlineScale: 1.045 },
          protectedLane: { heroX: 150, enemyX: 292 },
          build: { entryDistance: 12, settleDistance: 7, birthSeconds: 0.1 },
          motion: { distance: 46, postDriftSpeed: 42, yScale: 0.6 },
          separate: { forwardDistance: 32, spreadDistance: 12, gravity: 12, rotation: 0.18 },
          trailSteps: 3
        }
      ],
      draw: drawAfterbeatDouble
    },
    {
      id: "finisher-wipe",
      title: "Finisher frame wipe + word",
      note: "Circular frame wipe frames the beat while one heavy word stays readable.",
      tags: ["finisher", "flash", "wipe"],
      duration: 1.9,
      impact: 0.2,
      shake: 6,
      choreographies: [
        {
          id: "crack",
          text: "CRACK",
          phases: [
            { name: "impact", start: 0.2, end: 0.27 },
            { name: "build", start: 0.24, end: 0.54 },
            { name: "read", start: 0.54, end: 0.82 },
            { name: "move", start: 0.82, end: 1.15 },
            { name: "separate", start: 1.15, end: 1.35 },
            { name: "fade", start: 1.35, end: 1.7 }
          ],
          origin: { x: 436, y: 99 },
          direction: { x: 1, y: -0.16 },
          style: { size: 50, fill: BLACK, stroke: RED, strokeWidth: 6, tracking: 2 },
          controller: { fit: 0.36, trackingEm: 0.04, outlineFill: RED, outlineScale: 1.04 },
          protectedLane: { heroX: 146, enemyX: 290 },
          build: { entryDistance: 12, settleDistance: 6, birthSeconds: 0.1 },
          motion: { distance: 44, postDriftSpeed: 36, yScale: 0.55 },
          separate: { forwardDistance: 34, spreadDistance: 13, gravity: 8, rotation: 0.22 },
          trailSteps: 3
        }
      ],
      draw: drawFinisherWipe
    },
    {
      id: "mob-pressure",
      title: "Mob pressure wall",
      note: "Background text weather builds pressure before silhouettes emerge through it.",
      tags: ["atmosphere", "mob", "world"],
      duration: 1.6,
      impact: 0.55,
      shake: 0.8,
      choreographies: [
        {
          id: "pressure",
          text: "GOGOGO",
          phases: [
            { name: "build", start: 0.1, end: 0.62 },
            { name: "impact", start: 0.55, end: 0.62 },
            { name: "read", start: 0.62, end: 0.9 },
            { name: "move", start: 0.9, end: 1.15 },
            { name: "separate", start: 1.15, end: 1.35 },
            { name: "fade", start: 1.35, end: 1.6 }
          ],
          origin: { x: 344, y: 78 },
          direction: { x: 0.7, y: 0.03 },
          style: { size: 44, fill: BLACK, stroke: "white", strokeWidth: 5, tracking: 1 },
          controller: { fit: 0.22, trackingEm: 0.035, stressCount: 9 },
          build: { entryDistance: 8, settleDistance: 3, birthSeconds: 0.14 },
          motion: { distance: 26, postDriftSpeed: 22, yScale: 0.8 },
          separate: { forwardDistance: 22, spreadDistance: 9, gravity: 6, rotation: 0.08 },
          trailSteps: 2
        }
      ],
      draw: drawMobPressure
    }
  ];

  function drawPowExitsSkull(sample, ctx, t) {
    const heroX = 150;
    const enemyX = 290;
    const contact = { x: enemyX - 7, y: 117 };
    drawSceneBase(ctx, heroX, enemyX, { enemyPose: "hit", contact });
    drawImpactBloom(ctx, contact, t, 0.18, 42, 0.45);
    drawForceArrow(ctx, contact, { x: 1, y: -0.08 });
    renderChoreography(sample, "pow", t);
  }

  function drawBamCompression(sample, ctx, t) {
    const heroX = 150;
    const enemyX = 292;
    const contact = { x: enemyX - 9, y: 167 };
    drawSceneBase(ctx, heroX, enemyX, { enemyPose: "torso-hit", contact });
    drawImpactBloom(ctx, contact, t, 0.16, 48, 0.42);
    drawImpactRing(ctx, contact, t, 0.16, 72, RED, 4);
    renderChoreography(sample, "bam", t);
  }

  function drawWhiffArc(sample, ctx, t) {
    const heroX = 160;
    const enemyX = 328;
    drawSceneBase(ctx, heroX, enemyX, { heroPose: "whiff", enemyPose: "idle", noContact: true });
    const swingStart = { x: heroX + 88, y: 126 };
    const swingControl = { x: 300, y: 54 };
    const swingEnd = { x: 442, y: 118 };
    drawSwingArc(ctx, swingStart, swingControl, swingEnd, SOFT_INK, 0.38);
    renderChoreography(sample, "whiff", t);
  }

  function drawBlockPlate(sample, ctx, t) {
    const heroX = 166;
    const enemyX = 288;
    const contact = { x: 229, y: 151 };
    drawSceneBase(ctx, heroX, enemyX, { heroPose: "guard", enemyPose: "punch", contact, block: true });
    drawBurst(ctx, contact, t, 0.18, YELLOW, 9, 28);
    renderChoreography(sample, "clack", t);
  }

  function drawThudFloor(sample, ctx, t) {
    const heroX = 150;
    const enemyX = 295;
    const contact = { x: enemyX + 8, y: FLOOR_Y - 11 };
    drawSceneBase(ctx, heroX, enemyX, { enemyPose: "fallen", contact, low: true });
    drawImpactBloom(ctx, contact, t, 0.2, 34, 0.35);
    drawFloorCrack(ctx, contact, t, 0.2);
    const report = renderChoreography(sample, "thud", t);
    const dustX = report?.bounds ? report.bounds.x + report.bounds.width * 0.25 : enemyX + 68;
    drawDust(ctx, { x: dustX, y: FLOOR_Y + 5 }, t, 0.62, BLACK);
    drawFloorLine(ctx);
  }

  function drawAfterbeatDouble(sample, ctx, t) {
    const heroX = 150;
    const enemyX = 292;
    const contact = { x: enemyX - 7, y: 145 };
    drawSceneBase(ctx, heroX, enemyX, { enemyPose: "hit", contact });
    drawImpactBloom(ctx, contact, t, 0.17, 38, 0.38);
    renderChoreography(sample, "pow", t);
    const secondContact = { x: contact.x + 17, y: contact.y - 18 };
    drawImpactBloom(ctx, secondContact, t, 0.68, 46, 0.52);
    drawImpactRing(ctx, secondContact, t, 0.68, 74, RED, 4);
    renderChoreography(sample, "pak", t);
  }

  function drawFinisherWipe(sample, ctx, t) {
    const heroX = 146;
    const enemyX = 290;
    const contact = { x: enemyX - 6, y: 127 };
    drawSceneBase(ctx, heroX, enemyX, { enemyPose: "falling", contact });
    const wipe = range(t, 0.2, 0.72);
    const alphaScale = state.reducedFlash ? 0.35 : 1;
    if (wipe > 0 && wipe < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - wipe) * 0.58 * alphaScale;
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 58 * (1 - wipe * 0.25);
      ctx.beginPath();
      ctx.arc(contact.x, contact.y, 18 + wipe * 360, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawImpactRing(ctx, contact, t, 0.2, 118, RED, 4);
    renderChoreography(sample, "crack", t);
  }

  function drawMobPressure(sample, ctx, t) {
    drawFloorLine(ctx);
    const build = easeInOut(range(t, 0.1, 1.1));
    drawPressureTextField(ctx, t, build);
    const emerge = range(t, 0.62, 1.4);
    for (let index = 0; index < 5; index++) {
      const x = 270 + index * 32 + Math.sin(t * 5 + index) * 4;
      const y = FLOOR_Y;
      ctx.save();
      ctx.globalAlpha = clamp((emerge - index * 0.08) * 1.6, 0, 0.9);
      drawEnemyStick(ctx, x, y, "idle", 0.72);
      ctx.restore();
    }
    const heroX = 132;
    drawHeroStick(ctx, heroX, FLOOR_Y, "guard");
    renderChoreography(sample, "pressure", t);
    if (state.guides) {
      drawLabel(ctx, "background pressure text should feel spatial, not UI", 22, 34);
    }
  }

  function drawSceneBase(ctx, heroX, enemyX, options = {}) {
    drawFloorLine(ctx);
    if (state.protectedLane) drawProtectedLane(ctx, heroX, enemyX);
    drawHeroStick(ctx, heroX, FLOOR_Y, options.heroPose || "punch");
    drawEnemyStick(ctx, enemyX, FLOOR_Y, options.enemyPose || "idle");
    if (options.contact && state.guides) {
      drawContactGuide(ctx, options.contact, options.block ? YELLOW : RED);
    }
    if (options.noContact && state.guides) {
      drawLabel(ctx, "no red impact: miss/air only", 26, 34);
    }
  }

  function drawFloorLine(ctx) {
    ctx.save();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    ctx.lineTo(WIDTH, FLOOR_Y);
    ctx.stroke();
    ctx.restore();
  }

  function drawProtectedLane(ctx, heroX, enemyX) {
    const left = Math.min(heroX, enemyX) + 28;
    const right = Math.max(heroX, enemyX) - 24;
    if (right <= left) return;
    ctx.save();
    ctx.fillStyle = "rgba(217, 0, 0, 0.055)";
    ctx.fillRect(left, 50, right - left, FLOOR_Y - 50);
    ctx.strokeStyle = "rgba(217, 0, 0, 0.18)";
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(left, 50, right - left, FLOOR_Y - 50);
    ctx.restore();
  }

  function drawHeroStick(ctx, x, floorY, pose = "punch") {
    const p = heroPose(x, floorY, pose);
    ctx.save();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawLimb(ctx, p.root, p.chest, p.head);
    drawLimb(ctx, p.leftShoulder, p.leftElbow, p.leftHand);
    drawLimb(ctx, p.rightShoulder, p.rightElbow, p.rightHand);
    drawLimb(ctx, p.leftHip, p.leftKnee, p.leftFoot);
    drawLimb(ctx, p.rightHip, p.rightKnee, p.rightFoot);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(p.head.x, p.head.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 4;
    ctx.stroke();
    drawBandana(ctx, p.head, pose);
    ctx.restore();
  }

  function drawEnemyStick(ctx, x, floorY, pose = "idle", alpha = 1) {
    const p = enemyPose(x, floorY, pose);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawLimb(ctx, p.root, p.chest, p.head);
    drawLimb(ctx, p.leftShoulder, p.leftElbow, p.leftHand);
    drawLimb(ctx, p.rightShoulder, p.rightElbow, p.rightHand);
    drawLimb(ctx, p.leftHip, p.leftKnee, p.leftFoot);
    drawLimb(ctx, p.rightHip, p.rightKnee, p.rightFoot);
    ctx.fillStyle = BLACK;
    ctx.beginPath();
    ctx.arc(p.head.x, p.head.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLimb(ctx, a, b, c) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
    ctx.stroke();
  }

  function heroPose(x, floorY, pose) {
    const base = {
      root: { x, y: floorY - 78 },
      chest: { x: x + 7, y: floorY - 130 },
      head: { x: x + 9, y: floorY - 170 },
      leftShoulder: { x: x - 13, y: floorY - 130 },
      rightShoulder: { x: x + 24, y: floorY - 130 },
      leftHip: { x: x - 13, y: floorY - 80 },
      rightHip: { x: x + 13, y: floorY - 80 },
      leftKnee: { x: x - 26, y: floorY - 38 },
      rightKnee: { x: x + 35, y: floorY - 42 },
      leftFoot: { x: x - 44, y: floorY - 2 },
      rightFoot: { x: x + 58, y: floorY - 2 }
    };
    if (pose === "guard") {
      return {
        ...base,
        leftElbow: { x: x + 16, y: floorY - 138 },
        leftHand: { x: x + 54, y: floorY - 142 },
        rightElbow: { x: x + 30, y: floorY - 118 },
        rightHand: { x: x + 58, y: floorY - 122 }
      };
    }
    if (pose === "whiff") {
      return {
        ...base,
        leftElbow: { x: x + 34, y: floorY - 160 },
        leftHand: { x: x + 92, y: floorY - 138 },
        rightElbow: { x: x + 2, y: floorY - 108 },
        rightHand: { x: x + 40, y: floorY - 96 }
      };
    }
    return {
      ...base,
      leftElbow: { x: x + 42, y: floorY - 142 },
      leftHand: { x: x + 122, y: floorY - 145 },
      rightElbow: { x: x + 20, y: floorY - 112 },
      rightHand: { x: x + 62, y: floorY - 102 }
    };
  }

  function enemyPose(x, floorY, pose) {
    const hitLean = pose === "hit" || pose === "torso-hit" ? 18 : 0;
    const fall = pose === "falling" ? 34 : 0;
    if (pose === "fallen") {
      return {
        root: { x: x + 24, y: floorY - 34 },
        chest: { x: x - 4, y: floorY - 48 },
        head: { x: x - 48, y: floorY - 52 },
        leftShoulder: { x: x - 12, y: floorY - 48 },
        rightShoulder: { x: x + 18, y: floorY - 42 },
        leftElbow: { x: x - 56, y: floorY - 32 },
        leftHand: { x: x - 92, y: floorY - 20 },
        rightElbow: { x: x + 58, y: floorY - 28 },
        rightHand: { x: x + 96, y: floorY - 17 },
        leftHip: { x: x + 10, y: floorY - 32 },
        rightHip: { x: x + 42, y: floorY - 28 },
        leftKnee: { x: x - 8, y: floorY - 6 },
        leftFoot: { x: x - 38, y: floorY - 2 },
        rightKnee: { x: x + 88, y: floorY - 10 },
        rightFoot: { x: x + 130, y: floorY - 2 }
      };
    }
    return {
      root: { x: x + hitLean + fall * 0.25, y: floorY - 78 + fall * 0.35 },
      chest: { x: x + hitLean * 1.4 + fall, y: floorY - 130 + fall },
      head: { x: x + hitLean * 1.8 + fall * 1.35, y: floorY - 170 + fall * 1.1 },
      leftShoulder: { x: x - 18 + hitLean, y: floorY - 130 + fall },
      rightShoulder: { x: x + 22 + hitLean * 1.5 + fall, y: floorY - 130 + fall },
      leftElbow: { x: x - 48 + hitLean, y: floorY - 114 + fall * 0.7 },
      leftHand: { x: x - 76 + hitLean, y: floorY - 95 + fall * 0.4 },
      rightElbow: { x: x + 50 + hitLean, y: floorY - 112 + fall * 0.6 },
      rightHand: { x: x + 74 + hitLean, y: floorY - 98 + fall * 0.5 },
      leftHip: { x: x - 13, y: floorY - 80 },
      rightHip: { x: x + 13, y: floorY - 80 },
      leftKnee: { x: x - 35, y: floorY - 42 },
      rightKnee: { x: x + 28, y: floorY - 39 },
      leftFoot: { x: x - 58, y: floorY - 2 },
      rightFoot: { x: x + 48, y: floorY - 2 }
    };
  }

  function drawBandana(ctx, head, pose) {
    ctx.save();
    ctx.translate(head.x - 1, head.y - 6);
    ctx.rotate(-0.46);
    ctx.fillStyle = RED;
    ctx.fillRect(-21, -4, 42, 8);
    ctx.restore();
    const tail = pose === "whiff" ? 8 : 0;
    ctx.save();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(head.x - 15, head.y - 5);
    ctx.quadraticCurveTo(head.x - 44, head.y - 8 + tail, head.x - 62, head.y + 8 + tail);
    ctx.stroke();
    ctx.restore();
  }

  function drawGlyphTrail(renderer, glyphs, style, direction, count = 2) {
    const d = normalize(direction || { x: 1, y: 0 });
    const steps = Math.max(0, Math.floor(count));
    for (let index = steps; index >= 1; index--) {
      const ghosts = glyphs.map(glyph => new GlyphBody({
        ...glyph,
        position: {
          x: glyph.position.x - d.x * (index * 7),
          y: glyph.position.y - d.y * (index * 7)
        },
        scale: glyph.scale * (1 - index * 0.06),
        opacity: glyph.opacity * (0.14 / index)
      }));
      renderer.drawGlyphs(ghosts, {
        ...style,
        strokeWidth: Math.max(1, (style.strokeWidth || 0) - index)
      });
    }
  }

  function drawDust(ctx, origin, t, start, color) {
    const p = range(t, start, start + 0.46);
    if (p <= 0 || p >= 1) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = (1 - p) * 0.24 * state.intensity;
    for (let index = 0; index < 12; index++) {
      const a = index * 1.83;
      const spread = 8 + p * (20 + (index % 4) * 7);
      const x = origin.x + Math.cos(a) * spread + p * 24;
      const y = origin.y + Math.sin(a) * spread * 0.35 - p * (index % 3) * 5;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (index % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawImpactBloom(ctx, point, t, start, radius, alpha) {
    const p = range(t, start, start + 0.35);
    if (p <= 0 || p >= 1) return;
    ctx.save();
    ctx.globalAlpha = (1 - p) * alpha * state.intensity * (state.reducedFlash ? 0.6 : 1);
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius * easeOut(p), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawImpactRing(ctx, point, t, start, radius, color, width) {
    const p = range(t, start, start + 0.48);
    if (p <= 0 || p >= 1) return;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.75 * state.intensity * (state.reducedFlash ? 0.55 : 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 12 + radius * easeOut(p), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBurst(ctx, point, t, start, color, count, length) {
    const p = range(t, start, start + 0.28);
    if (p <= 0 || p >= 1) return;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.86 * state.intensity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.2;
      const inner = 10 + p * 5;
      const outer = inner + length * p;
      ctx.beginPath();
      ctx.moveTo(point.x + Math.cos(angle) * inner, point.y + Math.sin(angle) * inner);
      ctx.lineTo(point.x + Math.cos(angle) * outer, point.y + Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFloorCrack(ctx, point, t, start) {
    const p = range(t, start, start + 0.36);
    if (p <= 0) return;
    ctx.save();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x - 12, FLOOR_Y);
    ctx.lineTo(point.x - 32 * p, FLOOR_Y + 6);
    ctx.lineTo(point.x - 54 * p, FLOOR_Y + 1);
    ctx.moveTo(point.x + 8, FLOOR_Y);
    ctx.lineTo(point.x + 35 * p, FLOOR_Y + 8);
    ctx.lineTo(point.x + 68 * p, FLOOR_Y + 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawSwingArc(ctx, start, control, end, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawForceArrow(ctx, point, direction) {
    if (!state.guides) return;
    const d = normalize(direction);
    ctx.save();
    ctx.strokeStyle = "rgba(217,0,0,0.65)";
    ctx.fillStyle = "rgba(217,0,0,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + d.x * 52, point.y + d.y * 52);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point.x + d.x * 52, point.y + d.y * 52, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawContactGuide(ctx, point, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x - 8, point.y);
    ctx.lineTo(point.x + 8, point.y);
    ctx.moveTo(point.x, point.y - 8);
    ctx.lineTo(point.x, point.y + 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawPressureTextField(ctx, t, build) {
    const words = ["tap", "tap", "thud", "gogogo", "rush"];
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const word = words[(row + col) % words.length];
        const heavy = word === "gogogo" || word === "rush";
        const x = 250 + col * 46 + Math.sin(t * 2 + row) * 8;
        const y = 42 + row * 34 + Math.cos(t * 1.8 + col) * 4;
        ctx.save();
        ctx.globalAlpha = build * (heavy ? 0.17 : 0.32);
        ctx.translate(x, y);
        ctx.rotate(-0.08 + Math.sin(row + col) * 0.08);
        ctx.font = `${heavy ? 900 : 700} ${heavy ? 28 : 18}px Impact, Arial Black, sans-serif`;
        ctx.fillStyle = heavy ? BLACK : SOFT_INK;
        ctx.fillText(word.toUpperCase(), 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawLabel(ctx, text, x, y) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.font = "700 12px Arial, sans-serif";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawSampleFrame(ctx) {
    const canvas = ctx.canvas || { width: WIDTH, height: HEIGHT };
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    ctx.restore();
  }

  function quadraticPoint(a, b, c, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * a.x + 2 * mt * t * b.x + t * t * c.x,
      y: mt * mt * a.y + 2 * mt * t * b.y + t * t * c.y
    };
  }

  function quadraticTangent(a, b, c, t) {
    return {
      x: 2 * (1 - t) * (b.x - a.x) + 2 * t * (c.x - b.x),
      y: 2 * (1 - t) * (b.y - a.y) + 2 * t * (c.y - b.y)
    };
  }

  function normalize(vector) {
    const length = Math.hypot(vector.x || 0, vector.y || 0) || 1;
    return {
      x: (vector.x || 0) / length,
      y: (vector.y || 0) / length
    };
  }

  function range(t, start, end) {
    return clamp((t - start) / Math.max(0.0001, end - start), 0, 1);
  }

  function fadeAfter(t, start, end) {
    return 1 - easeInOut(range(t, start, end));
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  }

  function easeInOut(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function easeOutBack(t) {
    t = clamp(t, 0, 1);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function selectedSamples() {
    if (state.focusId === "all") return state.samples;
    return state.samples.filter(sample => sample.definition.id === state.focusId);
  }

  function activeSamples() {
    return selectedSamples().filter(sample => !sample.element.hidden);
  }

  function updateFocusVisibility() {
    for (const sample of state.samples) {
      sample.element.hidden = state.focusId !== "all" && sample.definition.id !== state.focusId;
    }
    updateScrubMax();
  }

  function updateScrubMax() {
    const samples = selectedSamples();
    state.scrubMax = Math.max(0.1, ...samples.map(sample => sample.definition.duration));
    state.scrubTime = clamp(state.scrubTime, 0, state.scrubMax);
  }

  function populateFocusSelect() {
    const select = document.querySelector("[data-focus]");
    select.textContent = "";
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All samples";
    select.appendChild(all);
    for (const sample of state.samples) {
      const option = document.createElement("option");
      option.value = sample.definition.id;
      option.textContent = sample.definition.title;
      select.appendChild(option);
    }
  }

  function setSelectedTime(time) {
    const nextTime = clamp(time, 0, state.scrubMax);
    state.scrubTime = nextTime;
    for (const sample of selectedSamples()) {
      sample.setTime(clamp(nextTime, 0, sample.definition.duration));
    }
    syncScrubControls();
  }

  function restartSelectedSamples() {
    state.scrubTime = 0;
    for (const sample of selectedSamples()) sample.restart();
    syncScrubControls();
  }

  function syncScrubFromSamples() {
    const samples = activeSamples();
    if (samples.length === 0) return;
    state.scrubTime = samples.length === 1
      ? samples[0].elapsed
      : Math.max(...samples.map(sample => Math.min(sample.elapsed, sample.definition.duration)));
    syncScrubControls();
  }

  function syncScrubControls() {
    const scrub = document.querySelector("[data-scrub-time]");
    const output = document.querySelector("[data-scrub-out]");
    scrub.max = state.scrubMax.toFixed(4);
    scrub.value = clamp(state.scrubTime, 0, state.scrubMax).toFixed(4);
    output.textContent = `${clamp(state.scrubTime, 0, state.scrubMax).toFixed(2)} / ${state.scrubMax.toFixed(2)}s`;
  }

  function syncControls() {
    document.querySelector("[data-toggle-play]").textContent = state.playing ? "Pause" : "Play";
    document.querySelector("[data-focus]").value = state.focusId;
    document.querySelector("[data-playback-speed]").value = String(state.playbackSpeed);
    document.querySelector("[data-autoplay]").checked = state.autoplay;
    document.querySelector("[data-slow-motion]").checked = state.slowMotion;
    document.querySelector("[data-reduced-flash]").checked = state.reducedFlash;
    document.querySelector("[data-guides]").checked = state.guides;
    document.querySelector("[data-protected-lane]").checked = state.protectedLane;
    document.querySelector("[data-word-bounds]").checked = state.wordBounds;
    document.querySelector("[data-intensity]").value = String(state.intensity);
    document.querySelector("[data-intensity-out]").textContent = state.intensity.toFixed(2);
    syncScrubControls();
  }

  function resetControls() {
    state.playing = true;
    state.playbackSpeed = DEFAULT_REVIEW_SPEED;
    state.focusId = "all";
    state.scrubTime = 0;
    state.autoplay = true;
    state.slowMotion = false;
    state.reducedFlash = false;
    state.guides = true;
    state.protectedLane = true;
    state.wordBounds = false;
    state.intensity = 1;
    updateFocusVisibility();
    syncControls();
    state.samples.forEach(sample => sample.restart());
  }

  function wireControls() {
    document.querySelector("[data-play-all]").addEventListener("click", () => {
      state.samples.forEach(sample => sample.restart());
      state.playing = true;
      state.scrubTime = 0;
      syncControls();
    });
    document.querySelector("[data-stagger]").addEventListener("click", () => {
      state.samples.forEach((sample, index) => sample.restart(index * 0.13));
      state.playing = true;
      syncControls();
    });
    document.querySelector("[data-toggle-play]").addEventListener("click", () => {
      state.playing = !state.playing;
      syncControls();
    });
    document.querySelector("[data-restart-focus]").addEventListener("click", () => {
      restartSelectedSamples();
      state.playing = true;
      syncControls();
    });
    document.querySelector("[data-step-back]").addEventListener("click", () => {
      state.playing = false;
      setSelectedTime(state.scrubTime - FRAME_STEP);
      syncControls();
    });
    document.querySelector("[data-step-forward]").addEventListener("click", () => {
      state.playing = false;
      setSelectedTime(state.scrubTime + FRAME_STEP);
      syncControls();
    });
    document.querySelector("[data-reset]").addEventListener("click", resetControls);
    document.querySelector("[data-focus]").addEventListener("change", event => {
      state.focusId = event.target.value;
      state.scrubTime = 0;
      updateFocusVisibility();
      setSelectedTime(0);
      syncControls();
    });
    document.querySelector("[data-playback-speed]").addEventListener("change", event => {
      state.playbackSpeed = Number(event.target.value) || DEFAULT_REVIEW_SPEED;
      syncControls();
    });
    document.querySelector("[data-scrub-time]").addEventListener("input", event => {
      state.playing = false;
      setSelectedTime(Number(event.target.value) || 0);
      syncControls();
    });
    document.querySelector("[data-autoplay]").addEventListener("change", event => {
      state.autoplay = event.target.checked;
    });
    document.querySelector("[data-slow-motion]").addEventListener("change", event => {
      state.slowMotion = event.target.checked;
    });
    document.querySelector("[data-reduced-flash]").addEventListener("change", event => {
      state.reducedFlash = event.target.checked;
      for (const sample of activeSamples()) sample.render(sample.elapsed);
    });
    document.querySelector("[data-guides]").addEventListener("change", event => {
      state.guides = event.target.checked;
      for (const sample of activeSamples()) sample.render(sample.elapsed);
    });
    document.querySelector("[data-protected-lane]").addEventListener("change", event => {
      state.protectedLane = event.target.checked;
      for (const sample of activeSamples()) sample.render(sample.elapsed);
    });
    document.querySelector("[data-word-bounds]").addEventListener("change", event => {
      state.wordBounds = event.target.checked;
      for (const sample of activeSamples()) sample.render(sample.elapsed);
    });
    document.querySelector("[data-intensity]").addEventListener("input", event => {
      state.intensity = Number(event.target.value) || 1;
      document.querySelector("[data-intensity-out]").textContent = state.intensity.toFixed(2);
      for (const sample of activeSamples()) sample.render(sample.elapsed);
    });
  }

  async function detectWebGpu() {
    const card = document.querySelector("[data-webgpu-card]");
    const status = document.querySelector("[data-webgpu-status]");
    const detail = document.querySelector("[data-webgpu-detail]");
    const facts = document.querySelector("[data-webgpu-facts]");
    const setFacts = items => {
      facts.textContent = "";
      for (const item of items) {
        const li = document.createElement("li");
        li.textContent = item;
        facts.appendChild(li);
      }
    };
    if (!("gpu" in navigator)) {
      card.classList.add("blocked");
      status.textContent = "WebGPU unavailable in this browser/context.";
      detail.textContent = "Canvas2D typography lab is still fully active. Try a WebGPU-capable browser for the later Slug renderer spike.";
      setFacts([
        "Renderer: Canvas2D active",
        "GPU target: WebGPU/WGSL only",
        "Adapter: unavailable",
        "Next asset path: font outlines -> quadratic curves -> bands -> glyph instances"
      ]);
      return;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      const format = typeof navigator.gpu.getPreferredCanvasFormat === "function"
        ? navigator.gpu.getPreferredCanvasFormat()
        : "unknown";
      if (!adapter) {
        card.classList.add("blocked");
        status.textContent = "WebGPU present, but no adapter was granted.";
        detail.textContent = "This can happen because of browser, OS, GPU, or privacy settings. Canvas2D remains active.";
        setFacts([
          "Renderer: Canvas2D active",
          "GPU target: WebGPU/WGSL only",
          `Preferred canvas format: ${format}`,
          "Adapter: not granted"
        ]);
        return;
      }
      const features = adapter.features;
      const limits = adapter.limits || {};
      const hasFeature = name => typeof features?.has === "function" && features.has(name);
      const valueOrUnknown = value => Number.isFinite(value) ? String(value) : "unknown";
      card.classList.add("ready");
      status.textContent = "WebGPU adapter available.";
      detail.textContent = `Canvas2D is still active. Preferred canvas format: ${format}. Slug/WGSL renderer remains pending.`;
      setFacts([
        "Renderer: Canvas2D active",
        "GPU target: WebGPU/WGSL only",
        `Preferred canvas format: ${format}`,
        `shader-f16: ${hasFeature("shader-f16") ? "available" : "not reported"}`,
        `float32-filterable: ${hasFeature("float32-filterable") ? "available" : "not reported"}`,
        `2D texture limit: ${valueOrUnknown(limits.maxTextureDimension2D)}`,
        `vertex attributes: ${valueOrUnknown(limits.maxVertexAttributes)}`
      ]);
    } catch (error) {
      card.classList.add("blocked");
      status.textContent = "WebGPU check failed.";
      detail.textContent = `Canvas2D remains active. ${error?.message || "No error detail available."}`;
      setFacts([
        "Renderer: Canvas2D active",
        "GPU target: WebGPU/WGSL only",
        "Adapter/device check: failed",
        "Next asset path: font outlines -> quadratic curves -> bands -> glyph instances"
      ]);
    }
  }

  function init() {
    const grid = document.getElementById("sampleGrid");
    state.samples = SAMPLES.map(definition => new TypographySample(prepareSampleDefinition(definition), grid));
    populateFocusSelect();
    updateFocusVisibility();
    wireControls();
    syncControls();
    populateGlyphFontSelect();
    detectWebGpu();
    new StaticGlyphLab();
    const animatedGlyphLab = new AnimatedGlyphLab();

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (state.playing) {
        for (const sample of activeSamples()) sample.update(dt);
        syncScrubFromSamples();
      }
      animatedGlyphLab.update(dt);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
