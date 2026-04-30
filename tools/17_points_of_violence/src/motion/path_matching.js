export function normalizeSourcePath(value) {
  let raw = String(value || "").trim();
  if (!raw) return "";
  raw = raw.replace(/\\/g, "/");
  const alreadyRelative = /^(?:\.generated|\.import|tools|game)\//i.test(raw);
  const absoluteish = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(raw);
  if (!alreadyRelative && absoluteish && !/^[a-z]:\//i.test(raw)) {
    try {
      raw = new URL(raw, location.href).pathname;
    } catch {}
  }
  raw = decodeURIComponent(raw).replace(/\\/g, "/").replace(/[?#].*$/, "");
  const repoMatch = raw.match(/(?:^|\/)(\.generated\/.*|\.import\/.*|game\/.*)$/i);
  if (repoMatch) raw = repoMatch[1];
  else {
    const toolsMatch = raw.match(/(?:^|\/)(tools\/.*)$/i);
    if (toolsMatch) raw = toolsMatch[1];
  }
  return raw.replace(/^\/+/, "").toLowerCase();
}

export function pathTail(path) {
  const clean = normalizeSourcePath(path);
  return clean.split("/").filter(Boolean).pop() || "";
}

export function sourcesMatchByTail(sources, overrideSources) {
  const tails = new Set([...sources].map(pathTail).filter(Boolean));
  return overrideSources.some(source => tails.has(pathTail(source)));
}
