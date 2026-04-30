import { normalizeSourcePath, sourcesMatchByTail } from "./path_matching.js";

export function extractOverlayEntries(json) {
  if (!json || typeof json !== "object") return {};
  if (json.entries && typeof json.entries === "object") return json.entries;
  if (json.overrides && typeof json.overrides === "object") return json.overrides;
  return {};
}

export function normalizeClassification(classification) {
  const out = { ...(classification || {}) };
  if (!out.turnType) out.turnType = out.movementType === "turn" ? "turn" : "none";
  if (out.movementType === "turn") out.movementType = "in_place";
  out.actionType = out.actionType || "unknown";
  out.weaponScope = out.weaponScope || "unarmed";
  out.targetZone = out.targetZone || "unknown";
  out.movementType = out.movementType || "unknown";
  out.stance = out.stance || "unknown";
  return out;
}

export function classificationFromClip(entry) {
  const tags = entry.clip.tags || {};
  const libraryTags = entry.meta.libraryItem?.tags || {};
  const quality = entry.clip.quality || entry.meta.libraryItem?.quality || {};
  const actionType = tags.actionType || libraryTags.actionType || "unknown";
  return normalizeClassification({
    schema: "sticky.motionClassification.fallback.v1",
    actionType,
    weaponScope: inferWeaponScope(entry),
    targetZone: tags.targetZone || libraryTags.targetZone || "unknown",
    movementType: tags.motionDirection || libraryTags.motionDirection || "unknown",
    turnType: tags.turnType || libraryTags.turnType || "none",
    stance: inferStance(entry.clip),
    includeInCombat: !["unknown"].includes(actionType) && quality.needsReview !== true,
    needsReview: quality.needsReview === true || actionType === "unknown",
    contactCandidates: tags.contactCandidates || [],
    clipId: entry.clip.id || "",
    sourcePath: entry.meta.libraryItem?.path || entry.meta.clipUrl || ""
  });
}

export function findOverrideForClip(entry, overrides) {
  for (const key of clipMatchKeys(entry)) {
    if (overrides[key]) return overrides[key];
  }
  for (const [key, override] of Object.entries(overrides)) {
    if (overrideMatchesClip(key, override, entry)) return override;
  }
  return null;
}

function clipMatchKeys(entry) {
  const id = entry.clip?.id || "clip";
  const keys = [entry.key, id, `${id}::`, ...clipSourceCandidates(entry).map(source => `${id}::${source}`)];
  return [...new Set(keys.filter(Boolean))];
}

export function clipKey(entryOrClip, sourcePath) {
  const clip = entryOrClip.clip || entryOrClip;
  const source = clipSourceCandidates(entryOrClip, sourcePath)[0] || "";
  return `${clip.id || "clip"}::${source}`;
}

export function clipSourceCandidates(entryOrClip, sourcePath) {
  const clip = entryOrClip.clip || entryOrClip;
  const meta = entryOrClip.meta || {};
  const item = meta.libraryItem || {};
  const provider = clip.provider || {};
  const source = clip.source || {};
  const values = [
    sourcePath,
    meta.clipUrl,
    item.path,
    provider.sourcePath,
    provider.sourceFile,
    provider.source,
    source.sourceFile,
    source.fileName,
    source.videoName
  ];
  return [...new Set(values.map(normalizeSourcePath).filter(Boolean))];
}

function overrideMatchesClip(key, override, entry) {
  const id = entry.clip?.id || "clip";
  const rawKey = String(key || "");
  const keyId = rawKey.includes("::") ? rawKey.split("::")[0] : rawKey;
  const overrideId = override?.clipId || override?.id || "";
  if (overrideId && overrideId !== id) return false;
  if (!overrideId && keyId && keyId !== id && keyId !== "clip") return false;
  const sources = new Set(clipSourceCandidates(entry));
  const keySource = normalizeSourcePath(rawKey.includes("::") ? rawKey.split("::").slice(1).join("::") : "");
  const overrideSources = [override?.sourcePath, override?.sourceUrl, ...(override?.normalizedSources || [])].map(normalizeSourcePath).filter(Boolean);
  const allOverrideSources = [keySource, ...overrideSources].filter(Boolean);
  if (allOverrideSources.some(source => sources.has(source))) return true;
  if (overrideId === id && sourcesMatchByTail(sources, allOverrideSources)) return true;
  return overrideId === id && (!allOverrideSources.length || keyId === "clip");
}

function inferWeaponScope(entry) {
  const text = [
    entry.clip.id,
    entry.clip.displayName,
    entry.meta.sourceName,
    entry.meta.libraryItem?.pack,
    entry.clip.provider?.pack,
    entry.clip.provider?.sourcePath,
    entry.meta.libraryItem?.path
  ].filter(Boolean).join(" ").toLowerCase();
  if (/great sword|great_sword/.test(text)) return "great_sword";
  if (/rifle/.test(text)) return "rifle";
  if (/pistol|handgun/.test(text)) return "pistol";
  if (/sword/.test(text)) return "sword";
  if (/tool|shovel/.test(text)) return "tool";
  return "unarmed";
}

function inferStance(clip) {
  const frame = clip.frames?.[Math.floor((clip.frames?.length || 1) / 2)] || clip.frames?.[0];
  const joints = frame?.joints || {};
  if (!joints.root || !joints.head || !joints.left_foot || !joints.right_foot) return "unknown";
  const height = Math.abs(joints.head.x - Math.min(joints.left_foot.x, joints.right_foot.x));
  return height < 0.65 ? "crouch" : "standing";
}
