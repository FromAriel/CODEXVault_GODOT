import { frameDuration } from "../motion/frame_timing.js";
import { blendFrames, cloneFrame, morphDurationForCost, smoothstep } from "../motion/pose_morph.js";
import { frameAtIndex, signatureForFrame, signatureFromFrame } from "../motion/pose_signature.js";
import { displayPoint } from "../motion/projection.js";
import { computeActorBounds } from "../motion/root_motion_bounds.js";
import { completeRootMotion, createRootMotion, rootMotionSnapshot, startRootMotion, updateRootMotion } from "../motion/root_motion_runtime.js";

export class PlayerActor {
  constructor(defaults, rootMotionConfig = {}) {
    this.defaults = defaults;
    this.rootMotionConfig = rootMotionConfig;
    this.entry = null;
    this.frameIndex = 0;
    this.frameElapsed = 0;
    this.mode = "idle";
    this.currentFrame = null;
    this.currentFrameIsClipFrame = false;
    this.transition = null;
    this.transitionSummary = null;
    this.solverSummary = null;
    this.renderCalibration = null;
    this.worldRoot = initialWorldRoot(defaults);
    this.facing = 1;
    this.activeRootMotion = null;
    this.rootMotionPolicy = null;
    this.rootDebugEnabled = rootMotionConfig?.debug?.enabled === true;
    this.poseBounds = null;
    this.gameplayBounds = null;
    this.holdVersion = 0;
  }

  seed(library) {
    const eligible = library.eligibleEntries({ includeDiagnostics: true });
    const preferred = library.findById(this.defaults.seedClipId);
    const fallbackActions = new Set(this.defaults.fallbackActions || ["idle", "guard"]);
    const seed = preferred
      || eligible.find(entry => fallbackActions.has(entry.classification?.actionType))
      || eligible[0]
      || library.entries[0];
    if (!seed) return;
    this.entry = seed;
    this.frameIndex = Math.max(0, seed.clip.frames.length - 1);
    this.frameElapsed = 0;
    this.mode = "hold";
    this.transition = null;
    this.transitionSummary = null;
    this.worldRoot = initialWorldRoot(this.defaults);
    this.activeRootMotion = null;
    this.rootMotionPolicy = null;
    this.currentFrame = cloneFrame(seed.clip.frames[this.frameIndex]);
    this.currentFrameIsClipFrame = true;
    this.renderCalibration = buildRenderCalibration(this.currentFrame, seed.projection, this.defaults);
    this.updateBounds();
    this.holdVersion++;
  }

  play(entry, rootMotionPlan = null) {
    if (!entry?.clip?.frames?.length) return;
    this.entry = entry;
    this.frameIndex = 0;
    this.frameElapsed = 0;
    this.mode = "play";
    this.transition = null;
    this.transitionSummary = null;
    this.startRootMotion(rootMotionPlan, 0);
    this.currentFrame = cloneFrame(entry.clip.frames[0]);
    this.currentFrameIsClipFrame = true;
    this.updateBounds();
  }

  playTransition(candidate, transitionDefaults, rootMotionPlan = null) {
    if (!candidate?.entry?.clip?.frames?.length) return;
    const startIndex = candidate.startIndex ?? 0;
    const startFrame = frameAtIndex(candidate.entry, startIndex);
    this.entry = candidate.entry;
    this.frameIndex = startIndex;
    this.frameElapsed = 0;
    this.mode = "morph";
    this.transition = {
      candidate,
      elapsed: 0,
      morphDuration: morphDurationForCost(candidate.cost, transitionDefaults),
      from: cloneFrame(this.currentFrame || startFrame),
      to: cloneFrame(startFrame),
      startIndex,
      rootMotionPlan
    };
    this.transitionSummary = {
      cost: candidate.cost,
      score: candidate.score,
      baseCost: candidate.baseCost,
      penalty: candidate.penalty
    };
    this.currentFrame = cloneFrame(this.transition.from);
    this.currentFrameIsClipFrame = false;
    this.activeRootMotion = null;
    this.rootMotionPolicy = rootMotionPlan;
    this.updateBounds();
  }

  hold() {
    this.mode = "hold";
    this.transition = null;
    this.activeRootMotion = null;
    this.holdVersion++;
  }

  update(dt) {
    if (this.mode === "morph") {
      this.updateMorph(dt);
      return;
    }
    if (this.mode !== "play" || !this.entry) return;
    const frames = this.entry.clip.frames || [];
    this.frameElapsed += dt;
    this.updateActiveRootMotion(dt);
    while (this.mode === "play") {
      const duration = frameDuration(frames, this.frameIndex);
      if (this.frameElapsed < duration) break;
      this.frameElapsed -= duration;
      this.frameIndex++;
      if (this.frameIndex >= frames.length) {
        this.frameIndex = frames.length - 1;
        this.completeActiveRootMotion();
        this.currentFrame = cloneFrame(frames[this.frameIndex]);
        this.currentFrameIsClipFrame = true;
        this.mode = "hold";
        this.transition = null;
        this.activeRootMotion = null;
        this.updateBounds();
        this.holdVersion++;
        return;
      }
    }
    this.currentFrame = cloneFrame(frames[this.frameIndex]);
    this.currentFrameIsClipFrame = true;
    this.updateBounds();
  }

  currentSignature(transitionDefaults) {
    if (!this.currentFrame) return null;
    if (this.currentFrameIsClipFrame && this.entry) {
      return signatureForFrame(this.entry, this.frameIndex, transitionDefaults);
    }
    return signatureFromFrame(this.currentFrame, null, null, transitionDefaults);
  }

  setSolverSummary(summary) {
    this.solverSummary = summary;
  }

  setRootDebugEnabled(enabled) {
    this.rootDebugEnabled = enabled === true;
  }

  snapshot() {
    const classification = this.entry?.classification || {};
    const root = this.rootSnapshot();
    return {
      mode: this.mode,
      clipId: this.entry?.clip?.id || "none",
      frame: this.frameIndex,
      frameCount: this.entry?.clip?.frames?.length || 0,
      classification: [classification.actionType, classification.targetZone, classification.movementType, classification.turnType]
        .filter(Boolean)
        .join(" "),
      transition: this.transitionSummary,
      solver: this.solverSummary,
      root
    };
  }

  updateMorph(dt) {
    if (!this.transition) return;
    this.transition.elapsed += dt;
    const u = Math.min(1, this.transition.elapsed / this.transition.morphDuration);
    this.currentFrame = blendFrames(this.transition.from, this.transition.to, smoothstep(u));
    this.currentFrameIsClipFrame = false;
    if (u < 1) return;
    const rootMotionPlan = this.transition.rootMotionPlan;
    this.frameIndex = this.transition.startIndex;
    this.frameElapsed = 0;
    this.currentFrame = cloneFrame(frameAtIndex(this.entry, this.frameIndex));
    this.currentFrameIsClipFrame = true;
    this.transition = null;
    this.mode = "play";
    this.startRootMotion(rootMotionPlan, this.frameIndex);
    this.updateBounds();
  }

  startRootMotion(rootMotionPlan, startIndex) {
    this.rootMotionPolicy = rootMotionPlan || null;
    this.activeRootMotion = rootMotionPlan
      ? startRootMotion(createRootMotion(this.entry, rootMotionPlan, this.facing, startIndex), this.worldRoot)
      : null;
  }

  updateActiveRootMotion(dt) {
    const nextRoot = updateRootMotion(this.activeRootMotion, dt);
    if (nextRoot) this.worldRoot = nextRoot;
  }

  completeActiveRootMotion() {
    const finalRoot = completeRootMotion(this.activeRootMotion);
    if (finalRoot) this.worldRoot = finalRoot;
  }

  updateBounds() {
    const bounds = computeActorBounds(this, this.rootMotionConfig);
    this.poseBounds = bounds.poseBounds;
    this.gameplayBounds = bounds.gameplayBounds;
  }

  rootSnapshot() {
    const motion = rootMotionSnapshot(this.activeRootMotion);
    return {
      policyId: this.rootMotionPolicy?.id || motion.policyId,
      worldRoot: { ...this.worldRoot },
      displacement: motion.displacement,
      progress: motion.progress,
      poseBounds: this.poseBounds,
      gameplayBounds: this.gameplayBounds,
      path: motion.path,
      debugEnabled: this.rootDebugEnabled
    };
  }
}

function initialWorldRoot(defaults) {
  return {
    x: defaults.stagePosition?.x || 0,
    y: defaults.stagePosition?.y || 0
  };
}

function buildRenderCalibration(frame, projection, defaults) {
  const bounds = projectedPoseBounds(frame, projection);
  const root = frame?.joints?.root ? displayPoint(frame.joints.root, projection) : null;
  const desiredStandingHeight = defaults.renderScale || 155;
  return {
    projection,
    // renderScale is treated as desired standing height in stage pixels.
    scale: desiredStandingHeight / Math.max(0.001, bounds.height),
    anchorX: root?.x ?? bounds.centerX,
    floorY: bounds.minY,
    referenceHeight: bounds.height
  };
}

function projectedPoseBounds(frame, projection) {
  const points = Object.values(frame?.joints || {}).map(point => displayPoint(point, projection));
  if (!points.length) return { minY: 0, centerX: 0, height: 1 };
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const minY = Math.min(...ys);
  return {
    minY,
    centerX: (Math.min(...xs) + Math.max(...xs)) * 0.5,
    height: Math.max(...ys) - minY
  };
}
