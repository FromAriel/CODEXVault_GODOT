import { frameDuration } from "./frame_timing.js";

export function createRootMotion(entry, policy, facing = 1, startIndex = 0) {
  const duration = clipRemainingDuration(entry?.clip?.frames || [], startIndex);
  return {
    policy,
    elapsed: 0,
    duration,
    facing: facing >= 0 ? 1 : -1,
    startRoot: null,
    currentDisplacement: { x: 0, y: 0 },
    path: rootMotionPath(policy, facing, 12)
  };
}

export function startRootMotion(rootMotion, worldRoot) {
  if (!rootMotion) return null;
  rootMotion.startRoot = { ...worldRoot };
  rootMotion.currentDisplacement = { x: 0, y: 0 };
  return rootMotion;
}

export function updateRootMotion(rootMotion, dt) {
  if (!rootMotion?.startRoot) return null;
  rootMotion.elapsed += dt;
  const progress = Math.min(1, rootMotion.elapsed / Math.max(0.001, rootMotion.duration));
  rootMotion.currentDisplacement = displacementForPolicy(rootMotion.policy, progress, rootMotion.facing);
  return {
    x: rootMotion.startRoot.x + rootMotion.currentDisplacement.x,
    y: rootMotion.startRoot.y + rootMotion.currentDisplacement.y
  };
}

export function completeRootMotion(rootMotion) {
  if (!rootMotion?.startRoot) return null;
  rootMotion.currentDisplacement = displacementForPolicy(rootMotion.policy, 1, rootMotion.facing);
  return {
    x: rootMotion.startRoot.x + rootMotion.currentDisplacement.x,
    y: rootMotion.startRoot.y + rootMotion.currentDisplacement.y
  };
}

export function rootMotionSnapshot(rootMotion) {
  if (!rootMotion) {
    return {
      policyId: "none",
      displacement: { x: 0, y: 0 },
      progress: 0,
      path: []
    };
  }
  return {
    policyId: rootMotion.policy?.id || "anchored",
    displacement: { ...rootMotion.currentDisplacement },
    progress: Math.min(1, rootMotion.elapsed / Math.max(0.001, rootMotion.duration)),
    path: rootMotion.path || []
  };
}

export function displacementForPolicy(policy, progress, facing = 1) {
  const t = curve(progress, policy?.curve || "linear");
  const travelX = travelForPolicy(policy) * (facing >= 0 ? 1 : -1);
  const x = travelX * t;
  const jumpHeight = policy?.type === "jump" ? policy.jumpHeight || 0 : 0;
  return {
    x,
    y: -jumpHeight * Math.sin(Math.PI * Math.min(1, Math.max(0, progress)))
  };
}

export function rootMotionPath(policy, facing = 1, steps = 12) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    return displacementForPolicy(policy, progress, facing);
  });
}

function travelForPolicy(policy) {
  if (!policy || ["anchored", "placeholder"].includes(policy.type)) return 0;
  return policy.travelX || 0;
}

function clipRemainingDuration(frames, startIndex) {
  if (!frames.length) return 1 / 30;
  let duration = 0;
  for (let index = Math.max(0, startIndex); index < frames.length; index++) {
    duration += frameDuration(frames, index);
  }
  return Math.max(duration, 1 / 30);
}

function curve(progress, type) {
  const t = Math.min(1, Math.max(0, progress));
  if (type === "smoothstep") return t * t * (3 - 2 * t);
  return t;
}
