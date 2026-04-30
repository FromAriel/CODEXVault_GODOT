import { signatureFromClip, signatureFromFrame, signatureFrameIndex } from "./pose_signature.js";

// Score one possible clip start against the actor's current pose seed.
export function scoreCandidate(seedFrameOrSignature, entry, defaults, recentUse) {
  const current = coerceSignature(seedFrameOrSignature, defaults) || signatureFromClip(entry, "start", defaults);
  const target = signatureFromClip(entry, "start", defaults);
  const detail = transitionCost(current, target, resolveWeights(entry?.clip, defaults), defaults);
  const penalty = recentUse?.penalty?.(entry?.clip?.id || "") || 0;
  const cost = detail.cost + penalty;
  const sharpness = defaults?.scoreSharpness ?? 3.0;
  return {
    entry,
    baseCost: detail.cost,
    penalty,
    cost,
    score: Math.exp(-sharpness * cost),
    detail,
    startIndex: signatureFrameIndex(entry, "start")
  };
}

export function transitionCost(current, target, weights, defaults) {
  let poseSum = 0;
  let poseWeight = 0;
  let velocitySum = 0;
  let velocityWeight = 0;
  for (const joint of defaults?.signatureJoints || []) {
    const a = current?.joints?.[joint];
    const b = target?.joints?.[joint];
    if (!a || !b) continue;
    const confidence = (a.confidence ?? 1) * (b.confidence ?? 1);
    const weight = (weights[joint] ?? 1) * confidence;
    poseSum += weight * squaredDistance(a, b);
    poseWeight += weight;
    const va = current?.velocity?.[joint] || { x: 0, y: 0 };
    const vb = target?.velocity?.[joint] || { x: 0, y: 0 };
    velocitySum += weight * squaredDistance(va, vb);
    velocityWeight += weight;
  }
  // The epsilon only prevents divide-by-zero if a malformed clip lacks all weighted joints.
  const dPose = Math.sqrt(poseSum / Math.max(0.000001, poseWeight));
  const dVelocity = Math.sqrt(velocitySum / Math.max(0.000001, velocityWeight));
  const dContact = 0.5 * Math.abs((current?.stance?.leftFootContact ?? 0) - (target?.stance?.leftFootContact ?? 0))
    + 0.5 * Math.abs((current?.stance?.rightFootContact ?? 0) - (target?.stance?.rightFootContact ?? 0));
  const lean = Math.abs((current?.stance?.torsoLean ?? 0) - (target?.stance?.torsoLean ?? 0));
  const costWeights = defaults?.costWeights || {};
  const cost = (costWeights.pose ?? 1.0) * dPose
    + (costWeights.velocity ?? 0.35) * dVelocity
    + (costWeights.footContact ?? 0.20) * dContact
    + (costWeights.torsoLean ?? 0.15) * lean;
  return { cost, dPose, dVelocity, dContact, lean };
}

export function resolveWeights(clip, defaults) {
  const weights = { ...(defaults?.jointWeights || {}) };
  const raw = clip?.transitionScoring?.weights || {};
  if (Array.isArray(raw)) {
    (defaults?.signatureJoints || []).forEach((joint, index) => {
      if (Number.isFinite(raw[index])) weights[joint] = raw[index];
    });
  } else {
    for (const [joint, weight] of Object.entries(raw)) {
      if (Number.isFinite(weight)) weights[joint] = weight;
    }
  }
  return weights;
}

function coerceSignature(value, defaults) {
  if (!value) return null;
  if (value.velocity || value.stance) return value;
  if (value.joints) return signatureFromFrame(value, null, null, defaults);
  return null;
}

function squaredDistance(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}
