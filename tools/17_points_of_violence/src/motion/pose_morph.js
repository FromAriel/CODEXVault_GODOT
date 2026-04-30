import { STICK_JOINTS } from "./motion_constants.js";

// Frame cloning keeps actor state detached from read-only clip JSON.
export function cloneFrame(frame) {
  return {
    ...(frame || {}),
    joints: Object.fromEntries(Object.entries(frame?.joints || {}).map(([name, point]) => [name, { ...point }]))
  };
}

export function blendFrames(from, to, amount, joints = STICK_JOINTS) {
  const eased = clamp(amount, 0, 1);
  const frame = {
    ...(to || {}),
    timeSec: lerpFinite(from?.timeSec, to?.timeSec, eased),
    delayMs: to?.delayMs ?? from?.delayMs,
    joints: {}
  };
  for (const joint of joints) {
    const a = from?.joints?.[joint];
    const b = to?.joints?.[joint];
    if (a && b) {
      frame.joints[joint] = {
        x: lerp(a.x, b.x, eased),
        y: lerp(a.y, b.y, eased),
        confidence: lerpFinite(a.confidence ?? 1, b.confidence ?? 1, eased)
      };
    } else if (b) {
      frame.joints[joint] = { ...b };
    } else if (a) {
      frame.joints[joint] = { ...a };
    }
  }
  return frame;
}

export function morphDurationForCost(cost, defaults) {
  // These fallbacks mirror transition_defaults.json and are only safety values for missing data.
  const morph = defaults?.morph || {};
  const base = morph.baseSeconds ?? 0.05;
  const scale = morph.costScale ?? 0.14;
  return clamp(base + cost * scale, morph.minSeconds ?? 0.05, morph.maxSeconds ?? 0.18);
}

export function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpFinite(a, b, t) {
  if (Number.isFinite(a) && Number.isFinite(b)) return lerp(a, b, t);
  return Number.isFinite(b) ? b : a;
}
