import { RenderBackend } from "./render_backend.js";
import { STICK_JOINTS, STICK_LINES } from "../motion/motion_constants.js";
import { displayPoint } from "../motion/projection.js";

const STICK_POSES = {
  heroPunch: {
    head: [0, -150],
    root: [0, 0],
    chest: [0, -95],
    leftHand: [-95, -105],
    rightHand: [210, -120],
    leftFoot: [-90, 120],
    rightFoot: [145, 116],
    leftKnee: [-70, 45],
    rightKnee: [85, 34]
  },
  hitBack: {
    head: [75, -145],
    root: [0, 0],
    chest: [45, -80],
    leftHand: [-45, -40],
    rightHand: [130, 10],
    leftFoot: [-90, 115],
    rightFoot: [95, 130],
    leftKnee: [-50, 50],
    rightKnee: [42, 62]
  },
  fallen: {
    head: [-70, -45],
    root: [5, 15],
    chest: [-35, -15],
    leftHand: [-120, 0],
    rightHand: [70, 20],
    leftFoot: [-10, 90],
    rightFoot: [155, 72],
    leftKnee: [0, 52],
    rightKnee: [92, 40]
  },
  fallenWide: {
    head: [-30, -35],
    root: [0, 10],
    chest: [-10, -8],
    leftHand: [-165, -12],
    rightHand: [120, 35],
    leftFoot: [-95, 80],
    rightFoot: [160, 96],
    leftKnee: [-55, 50],
    rightKnee: [80, 66]
  }
};

export class Canvas2DRenderer extends RenderBackend {
  constructor(canvas, { palette, layers, worldWidth, worldHeight }) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.palette = palette;
    this.layers = layers;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.view = { scale: 1, offsetX: 0, offsetY: 0 };
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(rect.width / this.worldWidth, rect.height / this.worldHeight);
    this.view = {
      scale,
      offsetX: (rect.width - this.worldWidth * scale) / 2,
      offsetY: (rect.height - this.worldHeight * scale) / 2
    };
  }

  beginFrame(background) {
    this.resize();
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.fillStyle = this.color(background || "white");
    this.ctx.fillRect(0, 0, rect.width, rect.height);
    this.ctx.save();
    this.ctx.translate(this.view.offsetX, this.view.offsetY);
    this.ctx.scale(this.view.scale, this.view.scale);
  }

  drawLayer(layerId, primitives) {
    for (const primitive of primitives.filter(item => item.layer === layerId)) {
      this.drawPrimitive(primitive);
    }
  }

  endFrame() {
    this.ctx.restore();
  }

  drawPrimitive(primitive) {
    switch (primitive.type) {
      case "line": return this.drawLine(primitive);
      case "polyline": return this.drawPolyline(primitive);
      case "repeatedLines": return this.drawRepeatedLines(primitive);
      case "rect": return this.drawRect(primitive);
      case "text": return this.drawText(primitive);
      case "menuButton": return this.drawMenuButton(primitive);
      case "hazardSign": return this.drawHazardSign(primitive);
      case "hazardElectric": return this.drawHazardElectric(primitive);
      case "splash": return this.drawSplash(primitive);
      case "slash": return this.drawSlash(primitive);
      case "stickFigure": return this.drawStickFigure(primitive);
      case "title": return this.drawTitle(primitive);
      default: return undefined;
    }
  }

  drawLine(primitive) {
    this.stroke(primitive);
    const [a, b] = primitive.points;
    this.ctx.beginPath();
    this.ctx.moveTo(a[0], a[1]);
    this.ctx.lineTo(b[0], b[1]);
    this.ctx.stroke();
  }

  drawPolyline(primitive) {
    this.stroke(primitive);
    this.ctx.beginPath();
    primitive.points.forEach(([x, y], index) => index ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y));
    this.ctx.stroke();
  }

  drawRepeatedLines(primitive) {
    for (let index = 0; index < primitive.count; index++) {
      const offsetX = primitive.dx * index;
      const offsetY = primitive.dy * index;
      this.drawLine({
        ...primitive,
        points: [
          [primitive.from[0] + offsetX, primitive.from[1] + offsetY],
          [primitive.to[0] + offsetX, primitive.to[1] + offsetY]
        ]
      });
    }
  }

  drawRect(primitive) {
    this.ctx.lineWidth = this.width(primitive.width || "normal");
    if (primitive.fill) {
      this.ctx.fillStyle = this.color(primitive.fill);
      this.ctx.fillRect(primitive.x, primitive.y, primitive.w, primitive.h);
    }
    if (primitive.stroke) {
      this.ctx.strokeStyle = this.color(primitive.stroke);
      this.ctx.strokeRect(primitive.x, primitive.y, primitive.w, primitive.h);
    }
  }

  drawText(primitive) {
    this.ctx.fillStyle = this.color(primitive.fill || "black");
    this.ctx.font = `${primitive.weight || 700} ${primitive.size || 32}px Impact, Arial Black, sans-serif`;
    this.ctx.textAlign = primitive.align || "left";
    this.ctx.textBaseline = "top";
    String(primitive.text || "").split("\\n").forEach((line, index) => {
      this.ctx.fillText(line, primitive.x, primitive.y + index * (primitive.size || 32) * 1.12);
    });
  }

  drawMenuButton(primitive) {
    const accent = this.color(primitive.accent);
    this.ctx.fillStyle = accent;
    this.ctx.beginPath();
    this.ctx.moveTo(primitive.x, primitive.y);
    this.ctx.lineTo(primitive.x + primitive.w, primitive.y);
    this.ctx.lineTo(primitive.x + primitive.w - 34, primitive.y + primitive.h);
    this.ctx.lineTo(primitive.x, primitive.y + primitive.h);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.fillStyle = this.color("white");
    this.ctx.font = "900 42px Impact, Arial Black, sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(primitive.label, primitive.x + 95, primitive.y + primitive.h / 2);
    if (primitive.accent === "red") this.drawPlayTriangle(primitive.x + 38, primitive.y + primitive.h / 2);
  }

  drawPlayTriangle(x, y) {
    this.ctx.fillStyle = this.color("white");
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - 24);
    this.ctx.lineTo(x, y + 24);
    this.ctx.lineTo(x + 40, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawHazardSign(primitive) {
    this.ctx.fillStyle = this.color("yellow");
    this.ctx.fillRect(primitive.x, primitive.y, primitive.w, primitive.h);
    this.ctx.strokeStyle = this.color("black");
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(primitive.x, primitive.y, primitive.w, primitive.h);
    this.ctx.fillStyle = this.color("black");
    const cx = primitive.x + primitive.w / 2;
    const cy = primitive.y + primitive.h / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx + 4, cy - primitive.h * 0.34);
    this.ctx.lineTo(cx - 12, cy + 2);
    this.ctx.lineTo(cx + 1, cy + 2);
    this.ctx.lineTo(cx - 5, cy + primitive.h * 0.34);
    this.ctx.lineTo(cx + 16, cy - 7);
    this.ctx.lineTo(cx + 3, cy - 7);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawHazardElectric(primitive) {
    this.ctx.strokeStyle = this.color("yellow");
    this.ctx.lineWidth = 5;
    for (let i = 0; i < 7; i++) {
      const x = primitive.x + i * 16;
      this.ctx.beginPath();
      this.ctx.moveTo(x, primitive.y + primitive.h);
      this.ctx.lineTo(x + 10, primitive.y + 50);
      this.ctx.lineTo(x + 2, primitive.y + 34);
      this.ctx.lineTo(x + 18, primitive.y + 10);
      this.ctx.stroke();
    }
  }

  drawSplash(primitive) {
    const spikes = primitive.spikes || 16;
    this.ctx.fillStyle = this.color(primitive.fill || "red");
    this.ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 ? primitive.radius * 0.28 : primitive.radius;
      const angle = (Math.PI * 2 * i) / (spikes * 2);
      const x = primitive.x + Math.cos(angle) * radius;
      const y = primitive.y + Math.sin(angle) * radius;
      i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawSlash(primitive) {
    this.ctx.strokeStyle = this.color(primitive.stroke || "red");
    this.ctx.lineWidth = primitive.width || 12;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    primitive.points.forEach(([x, y], index) => index ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y));
    this.ctx.stroke();
  }

  drawStickFigure(primitive) {
    const pose = STICK_POSES[primitive.pose] || STICK_POSES.heroPunch;
    const point = name => [primitive.x + pose[name][0] * primitive.scale, primitive.y + pose[name][1] * primitive.scale];
    this.ctx.strokeStyle = this.color(primitive.stroke || "black");
    this.ctx.lineWidth = this.width(primitive.width || "bold") * primitive.scale;
    this.ctx.lineCap = "round";
    for (const [a, b] of [["head", "chest"], ["chest", "root"], ["chest", "leftHand"], ["chest", "rightHand"], ["root", "leftKnee"], ["leftKnee", "leftFoot"], ["root", "rightKnee"], ["rightKnee", "rightFoot"]]) {
      const pa = point(a);
      const pb = point(b);
      this.ctx.beginPath();
      this.ctx.moveTo(pa[0], pa[1]);
      this.ctx.lineTo(pb[0], pb[1]);
      this.ctx.stroke();
    }
    const head = point("head");
    this.ctx.fillStyle = this.color("black");
    this.ctx.beginPath();
    this.ctx.arc(head[0], head[1], 32 * primitive.scale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawStick17Actor(actor) {
    const frame = actor.currentFrame;
    if (!frame?.joints || !actor.entry) return;
    const defaults = actor.defaults;
    const view = actorPoseView(frame, actor.entry.projection, defaults, actor.renderCalibration, actor.worldRoot);
    this.ctx.strokeStyle = this.color(defaults.stroke || "black");
    this.ctx.lineWidth = this.width(defaults.lineWidth || "hero");
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    for (const [a, b] of STICK_LINES) {
      const pa = frame.joints[a];
      const pb = frame.joints[b];
      if (!pa || !pb) continue;
      const A = projectActorPoint(pa, view);
      const B = projectActorPoint(pb, view);
      this.ctx.beginPath();
      this.ctx.moveTo(A.x, A.y);
      this.ctx.lineTo(B.x, B.y);
      this.ctx.stroke();
    }
    for (const joint of STICK_JOINTS) {
      const point = frame.joints[joint];
      if (!point) continue;
      const p = projectActorPoint(point, view);
      this.ctx.fillStyle = this.color("black");
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, joint === "head" ? 22 : 4.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawStick17ActorDebug(actor) {
    const root = actor.worldRoot || { x: 0, y: 0 };
    const debug = actor.rootMotionConfig?.debug || {};
    if (actor.poseBounds) drawDebugRect(this.ctx, actor.poseBounds, debug.poseBoundsColor || "rgba(0, 120, 255, 0.65)");
    if (actor.gameplayBounds) drawDebugRect(this.ctx, actor.gameplayBounds, debug.gameplayBoundsColor || "rgba(242, 195, 0, 0.85)");
    drawRootMotionPath(this.ctx, actor, debug.pathColor || "rgba(217, 0, 0, 0.55)");
    this.ctx.strokeStyle = debug.rootColor || "rgba(217, 0, 0, 0.9)";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(root.x - 10, root.y);
    this.ctx.lineTo(root.x + 10, root.y);
    this.ctx.moveTo(root.x, root.y - 10);
    this.ctx.lineTo(root.x, root.y + 10);
    this.ctx.stroke();
  }

  drawTitle(primitive) {
    this.ctx.save();
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.color("red");
    this.ctx.font = "900 260px Impact, Arial Black, sans-serif";
    this.ctx.translate(primitive.x - 210, primitive.y + 95);
    this.ctx.rotate(-0.08);
    this.ctx.fillText(primitive.main, 0, 0);
    this.ctx.restore();
    this.ctx.save();
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.color("black");
    this.ctx.font = "900 94px Impact, Arial Black, sans-serif";
    this.ctx.fillText("POINTS", primitive.x + 120, primitive.y + 30);
    this.ctx.font = "900 48px Impact, Arial Black, sans-serif";
    this.ctx.fillText("OF", primitive.x + 110, primitive.y + 96);
    this.ctx.fillStyle = this.color("red");
    this.ctx.font = "900 150px Impact, Arial Black, sans-serif";
    this.ctx.fillText(primitive.violence, primitive.x + 150, primitive.y + 190);
    this.ctx.strokeStyle = this.color("red");
    this.ctx.lineWidth = 11;
    this.ctx.beginPath();
    this.ctx.moveTo(primitive.x - 210, primitive.y + 270);
    this.ctx.quadraticCurveTo(primitive.x + 140, primitive.y + 335, primitive.x + 470, primitive.y + 260);
    this.ctx.stroke();
    this.ctx.restore();
  }

  stroke(primitive) {
    this.ctx.strokeStyle = this.color(primitive.stroke || "black");
    this.ctx.lineWidth = this.width(primitive.width || "normal");
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  color(name) {
    return this.palette.colors[name] || name || "#000000";
  }

  width(nameOrValue) {
    return Number.isFinite(nameOrValue) ? nameOrValue : (this.palette.lineWidths[nameOrValue] || 4);
  }
}

function actorPoseView(frame, projection, defaults, calibration, actorWorldRoot) {
  const points = Object.values(frame.joints || {}).map(point => displayPoint(point, projection));
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const stable = calibration?.projection === projection ? calibration : null;
  const scale = stable?.scale || (defaults.renderScale || 155);
  const root = frame.joints.root ? displayPoint(frame.joints.root, projection) : null;
  const worldRoot = actorWorldRoot || defaults.stagePosition || {};
  return {
    projection,
    scale,
    x: worldRoot.x || 0,
    y: worldRoot.y || 0,
    anchorX: stable?.anchorX ?? root?.x ?? (Math.min(...xs) + Math.max(...xs)) * 0.5,
    floorY: stable?.floorY ?? Math.min(...ys)
  };
}

function projectActorPoint(point, view) {
  const p = displayPoint(point, view.projection);
  return {
    x: view.x + (p.x - view.anchorX) * view.scale,
    y: view.y - (p.y - view.floorY) * view.scale
  };
}

function drawDebugRect(ctx, bounds, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.setLineDash([]);
}

function drawRootMotionPath(ctx, actor, color) {
  const active = actor.activeRootMotion;
  const path = active?.path || [];
  const start = active?.startRoot || actor.worldRoot;
  if (path.length < 2 || !start) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  path.forEach((point, index) => {
    const x = start.x + point.x;
    const y = start.y + point.y;
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}
