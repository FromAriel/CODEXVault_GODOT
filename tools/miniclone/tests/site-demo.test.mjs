import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const websiteRoot = new URL("../", import.meta.url);
const repositoryRoot = new URL("../../", import.meta.url);
const appSourceRoot = new URL("crates/miniclone-ui/src/", repositoryRoot);
const demoRoot = new URL("demo/", websiteRoot);

async function text(url) {
  return readFile(url, "utf8");
}

test("website demo preserves the application JavaScript modules byte for byte", async () => {
  const sourceNames = (await readdir(appSourceRoot))
    .filter((name) => name.endsWith(".js"))
    .sort();

  assert.ok(sourceNames.includes("main.js"));
  for (const name of sourceNames) {
    assert.equal(
      await text(new URL(name, demoRoot)),
      await text(new URL(name, appSourceRoot)),
      `${name} drifted from the application snapshot`,
    );
  }
  assert.equal(
    await text(new URL("styles.css", demoRoot)),
    await text(new URL("styles.css", appSourceRoot)),
  );
});

test("website entry embeds the real demo through relative GitHub Pages-safe paths", async () => {
  const homepage = await text(new URL("index.html", websiteRoot));
  assert.match(homepage, /src="\.\/demo\/index\.html"/u);
  assert.match(homepage, /href="\.\/demo\/index\.html"/u);
  assert.match(homepage, /Interactive simulation — no disk access\./u);
  assert.match(homepage, /id="fullscreen-demo-btn"/u);
  assert.doesNotMatch(homepage, /Interactive Console Sandbox/u);
});

test("browser bootstrap exposes only simulated runtime mode and refuses native commands", async () => {
  const bootstrap = await text(new URL("browser-bootstrap.js", demoRoot));
  assert.match(bootstrap, /command === "runtime_mode"/u);
  assert.match(bootstrap, /mode: "demo"/u);
  assert.match(bootstrap, /simulated: true/u);
  assert.match(bootstrap, /website_demo_native_command_refused/u);
  assert.doesNotMatch(bootstrap, /inspect_host|product_clone_start|product_clone_status|preflight_target/u);

  const demoHtml = await text(new URL("index.html", demoRoot));
  assert.match(demoHtml, /src="\.\/browser-bootstrap\.js"/u);
  assert.match(demoHtml, /href="\.\.\/favicon\.svg"/u);
  assert.match(demoHtml, /COPY TIMING ACCELERATED/u);
});

test("embedded demo forwards otherwise trapped wheel movement to its same-origin parent", async () => {
  const homepageScript = await text(new URL("app.js", websiteRoot));
  const bootstrap = await text(new URL("browser-bootstrap.js", demoRoot));

  assert.match(homepageScript, /event\.source !== frame\.contentWindow/u);
  assert.match(homepageScript, /event\.origin !== window\.location\.origin/u);
  assert.match(homepageScript, /event\.data\?\.type !== messageType/u);
  assert.match(homepageScript, /window\.scrollBy/u);
  assert.match(bootstrap, /scrollableAncestorCanConsume/u);
  assert.match(bootstrap, /embeddedDemoIsFullscreen/u);
  assert.match(bootstrap, /window\.parent\.postMessage/u);
  assert.match(bootstrap, /\{ passive: false \}/u);
});

test("successful website copy phase contains sixty monotonic half-second frames", async () => {
  const fixture = JSON.parse(await text(new URL("demo-fixtures/current-flow.json", demoRoot)));
  const frames = fixture.execution_timelines.success.filter(
    (stage) => typeof stage === "object" && stage.phase === "copying",
  );

  assert.equal(frames.length, 60);
  assert.equal(frames.length * 500, 30_000);
  assert.equal(frames[0].bytes_completed, 0);
  assert.equal(frames.at(-1).bytes_completed, frames.at(-1).bytes_planned);
  assert.equal(frames.at(-1).eta_seconds, 0);

  for (let index = 1; index < frames.length; index += 1) {
    assert.ok(frames[index].bytes_completed > frames[index - 1].bytes_completed);
    assert.equal(frames[index].bytes_planned, frames[0].bytes_planned);
    assert.ok(frames[index].eta_seconds <= frames[index - 1].eta_seconds);
  }

  const controller = await text(new URL("workflow-controller.js", demoRoot));
  assert.match(controller, /const CLONE_POLL_INTERVAL_MS = 500;/u);
});
