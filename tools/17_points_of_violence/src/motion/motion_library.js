import { loadJson } from "../data/json_loader.js";
import { clipKey, findOverrideForClip, classificationFromClip, normalizeClassification, extractOverlayEntries } from "./classification.js";
import { projectionModeForClip } from "./projection.js";

export class MotionLibrary {
  constructor({ entries, matchedOverrides, sourceName }) {
    this.entries = entries;
    this.matchedOverrides = matchedOverrides;
    this.sourceName = sourceName;
  }

  static async load(sources, defaults) {
    const manifest = await loadJson(sources.libraryUrl);
    if (manifest.schema !== "sticky.motionLibrary.v1") throw new Error("Motion source is not sticky.motionLibrary.v1");
    const sidecar = await loadJson(sources.classificationUrl);
    const overrides = extractOverlayEntries(sidecar);
    const base = new URL(sources.libraryUrl, location.href);
    const entries = (await mapWithConcurrency(manifest.clips || [], 6, async item => {
      const clipUrl = new URL(item.path, base);
      try {
        const clip = await loadJson(clipUrl.href);
        if (clip.schema !== "sticky.motionClip.v1" || !Array.isArray(clip.frames)) return null;
        const entry = makeEntry(clip, {
          sourceName: sources.sourceName || "motion library",
          clipUrl: clipUrl.href,
          libraryItem: item,
          projectionFallback: defaults.projectionFallback || "xy"
        });
        const override = findOverrideForClip(entry, overrides);
        entry.matchedOverride = override;
        entry.classification = normalizeClassification(override || classificationFromClip(entry));
        return entry;
      } catch (error) {
        console.warn("Motion clip load failed", item.path, error);
        return null;
      }
    })).filter(Boolean);
    entries.sort((a, b) => (a.clip.id || "").localeCompare(b.clip.id || ""));
    return new MotionLibrary({
      entries,
      matchedOverrides: entries.filter(entry => entry.matchedOverride).length,
      sourceName: sources.sourceName || "motion library"
    });
  }

  eligibleEntries({ includeDiagnostics = false } = {}) {
    return this.entries.filter(entry => isEligible(entry, includeDiagnostics));
  }

  findById(id) {
    return this.entries.find(entry => entry.clip.id === id);
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

function makeEntry(clip, meta) {
  const entry = {
    clip,
    meta,
    key: "",
    matchedOverride: null,
    classification: null,
    projection: projectionModeForClip(clip, meta.projectionFallback)
  };
  entry.key = clipKey(entry, meta.clipUrl);
  return entry;
}

function isEligible(entry, includeDiagnostics) {
  const c = entry.classification || {};
  const action = c.actionType || "unknown";
  if (c.needsReview === true) return false;
  if (!includeDiagnostics && action === "unknown") return false;
  if (!includeDiagnostics && ["emote"].includes(action)) return false;
  return c.includeInCombat === true || includeDiagnostics || ["idle", "guard"].includes(action);
}
