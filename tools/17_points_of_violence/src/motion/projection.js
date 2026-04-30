export function projectionModeForClip(clip, fallback = "xy") {
  const provider = String(clip.provider?.name || clip.provider || "").toLowerCase();
  if (provider.includes("mixamo") || clip.provider?.projection) return "swap_xy";
  return fallback;
}

export function displayPoint(point, projection) {
  return projection === "swap_xy" ? { x: point.y, y: point.x } : { x: point.x, y: point.y };
}
