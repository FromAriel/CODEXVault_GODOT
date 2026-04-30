export function frameDuration(frames, index) {
  const frame = frames[index] || {};
  const next = frames[index + 1];
  if (next && Number.isFinite(next.timeSec) && Number.isFinite(frame.timeSec)) {
    const delta = next.timeSec - frame.timeSec;
    if (delta > 0.001) return clamp(delta, 0.016, 0.25);
  }
  if (Number.isFinite(frame.delayMs) && frame.delayMs > 0) return clamp(frame.delayMs / 1000, 0.016, 0.25);
  return 1 / 30;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
