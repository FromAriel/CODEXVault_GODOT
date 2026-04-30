export async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}: ${response.status} ${response.statusText}`.trim());
  }
  return response.json();
}

export async function loadJsonSet(paths) {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => {
    return [key, { path, data: await loadJson(path) }];
  }));
  return Object.fromEntries(entries);
}
