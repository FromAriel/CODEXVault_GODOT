import { displayPoint } from "./projection.js";

export function computeActorBounds(actor, config) {
  const poseBounds = computePoseBounds(actor.currentFrame, actor.entry?.projection, actor.renderCalibration, actor.worldRoot);
  return {
    poseBounds,
    gameplayBounds: expandBounds(poseBounds, config?.boundsPadding || { x: 28, y: 18 })
  };
}

export function worldPointFromPose(point, projection, calibration, worldRoot) {
  const p = displayPoint(point, projection);
  const scale = calibration?.scale || 1;
  return {
    x: worldRoot.x + (p.x - (calibration?.anchorX ?? 0)) * scale,
    y: worldRoot.y - (p.y - (calibration?.floorY ?? 0)) * scale
  };
}

function computePoseBounds(frame, projection, calibration, worldRoot) {
  const points = Object.values(frame?.joints || {}).map(point => worldPointFromPose(point, projection, calibration, worldRoot));
  if (!points.length) return { x: worldRoot.x, y: worldRoot.y, w: 0, h: 0, minX: worldRoot.x, minY: worldRoot.y, maxX: worldRoot.x, maxY: worldRoot.y };
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, minX, minY, maxX, maxY };
}

function expandBounds(bounds, padding) {
  const x = padding.x ?? 0;
  const y = padding.y ?? 0;
  return {
    x: bounds.x - x,
    y: bounds.y - y,
    w: bounds.w + x * 2,
    h: bounds.h + y * 2,
    minX: bounds.minX - x,
    minY: bounds.minY - y,
    maxX: bounds.maxX + x,
    maxY: bounds.maxY + y
  };
}
