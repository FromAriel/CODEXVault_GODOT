import { clamp } from "./pose_morph.js";

// Build the compact pose/velocity signature used by transition scoring.
export function signatureFromClip(entry, slot, defaults) {
  const signature = entry?.clip?.signatures?.[slot];
  if (signature?.joints) return signature;
  return signatureForFrame(entry, signatureFrameIndex(entry, slot), defaults);
}

export function signatureForFrame(entry, index, defaults) {
  const frame = frameAtIndex(entry, index);
  const frames = entry?.clip?.frames || [];
  const prev = frameAtIndex(entry, Math.max(0, index - 1));
  const next = frameAtIndex(entry, Math.min(frames.length - 1, index + 1));
  return signatureFromFrame(frame, prev, next, defaults);
}

export function signatureFromFrame(frame, prev, next, defaults) {
  const joints = {};
  const velocity = {};
  for (const joint of signatureJoints(defaults)) {
    const point = frame?.joints?.[joint];
    if (!point) continue;
    joints[joint] = { x: point.x, y: point.y, confidence: point.confidence ?? 1 };
    const p0 = prev?.joints?.[joint];
    const p1 = next?.joints?.[joint];
    const dt = signatureDeltaSeconds(prev, next);
    velocity[joint] = p0 && p1 ? { x: (p1.x - p0.x) / dt, y: (p1.y - p0.y) / dt } : { x: 0, y: 0 };
  }
  return { joints, velocity, stance: stanceFromJoints(frame?.joints || {}, defaults) };
}

export function signatureFrameIndex(entry, slot) {
  const frames = entry?.clip?.frames || [];
  const last = Math.max(0, frames.length - 1);
  const signature = entry?.clip?.signatures?.[slot];
  const localFrame = signature?.localFrame ?? signature?.frame;
  if (Number.isFinite(localFrame)) return clamp(Math.round(localFrame), 0, last);
  if (slot === "end") return last;
  if (slot === "impact" && Number.isFinite(entry?.clip?.clip?.impactFrame)) return clamp(entry.clip.clip.impactFrame, 0, last);
  return 0;
}

export function frameAtIndex(entry, index) {
  const frames = entry?.clip?.frames || [];
  return frames[clamp(index, 0, Math.max(0, frames.length - 1))] || { frame: 0, timeSec: 0, joints: {} };
}

export function signatureJoints(defaults) {
  return defaults?.signatureJoints || [];
}

function stanceFromJoints(joints, defaults) {
  const root = joints.root || { x: 0, y: 0 };
  const chest = joints.chest || root;
  const leftFoot = joints.left_foot || root;
  const rightFoot = joints.right_foot || root;
  return {
    stanceWidth: Math.abs((leftFoot.y ?? 0) - (rightFoot.y ?? 0)),
    rootHeightOverFeet: (root.x ?? 0) - Math.min(leftFoot.x ?? root.x ?? 0, rightFoot.x ?? root.x ?? 0),
    torsoLean: (chest.y ?? 0) - (root.y ?? 0),
    leftFootContact: footContact(leftFoot, leftFoot, rightFoot, defaults),
    rightFootContact: footContact(rightFoot, leftFoot, rightFoot, defaults)
  };
}

function footContact(foot, leftFoot, rightFoot, defaults) {
  const floor = Math.min(leftFoot.x ?? 0, rightFoot.x ?? 0);
  const threshold = defaults?.footContactThreshold ?? 0.06;
  return Math.abs((foot.x ?? 0) - floor) < threshold ? 1 : 0;
}

function signatureDeltaSeconds(prev, next) {
  if (Number.isFinite(prev?.timeSec) && Number.isFinite(next?.timeSec)) {
    const delta = next.timeSec - prev.timeSec;
    if (delta > 0.001) return delta;
  }
  // 30fps is the exporter/runtime fallback when adjacent frame times are unavailable.
  return 1 / 30;
}
