import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

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
  const websitePatchedModules = new Set(["execution-view-model.js"]);

  assert.ok(sourceNames.includes("main.js"));
  for (const name of sourceNames) {
    if (websitePatchedModules.has(name)) continue;
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

test("website progress projection unwraps the Demo worker progress event", async () => {
  const source = await text(new URL("execution-view-model.js", appSourceRoot));
  const website = await text(new URL("execution-view-model.js", demoRoot));
  const expectedWebsite = source.replace(
    "const metrics = direct ?? correlatedActivityProgress(state, activitySnapshot) ?? {};",
    "const metrics = record(direct?.metrics) ?? direct ?? correlatedActivityProgress(state, activitySnapshot) ?? {};",
  );

  assert.notEqual(expectedWebsite, source, "expected application projection line was not found");
  assert.equal(website, expectedWebsite, "website projection contains an undocumented divergence");

  const [{ createExecutionViewModel }, { WORKFLOW_STATES }] = await Promise.all([
    import(new URL("execution-view-model.js", demoRoot)),
    import(new URL("workflow-state.js", demoRoot)),
  ]);
  const model = createExecutionViewModel({
    workflowState: {
      status: WORKFLOW_STATES.CLONING,
      generation: 1,
      inFlight: null,
      cloneStatus: {
        active: true,
        run_id: "website-demo-run",
        phase: "copying",
        cancellation_available: true,
        progress: {
          kind: "progress",
          metrics: {
            bytes_completed: 25,
            bytes_planned: 100,
            bytes_per_second: 5,
            eta_seconds: 15,
          },
        },
      },
      runCommunicationError: null,
      bootVerification: null,
      bootVerificationError: null,
      blockingError: null,
    },
  });

  assert.equal(model.progress.percent, 25);
  assert.equal(model.progress.bytesCompleted, 25);
  assert.equal(model.progress.bytesPlanned, 100);
  assert.equal(model.progress.indeterminate, false);
});

test("website entry embeds the real demo through relative GitHub Pages-safe paths", async () => {
  const homepage = await text(new URL("index.html", websiteRoot));
  assert.match(homepage, /src="\.\/demo\/index\.html"/u);
  assert.match(homepage, /href="\.\/demo\/index\.html"/u);
  assert.match(homepage, /Interactive simulation — no disk access\./u);
  assert.match(homepage, /id="fullscreen-demo-btn"/u);
  assert.doesNotMatch(homepage, /Interactive Console Sandbox/u);
});

test("website offers the published diskless Demo beside the embedded interface", async () => {
  const homepage = await text(new URL("index.html", websiteRoot));
  const stylesheet = await text(new URL("style.css", websiteRoot));

  assert.match(
    homepage,
    /href="https:\/\/fromariel\.github\.io\/CODEXVault_GODOT\/tools\/miniclone\/demo\/MiniClone-Demo\.exe"/u,
  );
  assert.match(homepage, /download="MiniClone-Demo\.exe"/u);
  assert.match(homepage, />Download the free demo<\/a>/u);
  assert.match(stylesheet, /\.btn\s*\{[^}]*padding:\s*12px 20px;/su);
  assert.match(stylesheet, /\.demo-download-link\s*\{/u);
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

test("embedded demo coalesces wheel bursts into immediate same-origin parent scrolling", async () => {
  const homepageScript = await text(new URL("app.js", websiteRoot));
  const bootstrap = await text(new URL("browser-bootstrap.js", demoRoot));

  assert.match(homepageScript, /event\.source !== frame\.contentWindow/u);
  assert.match(homepageScript, /event\.origin !== window\.location\.origin/u);
  assert.match(homepageScript, /event\.data\?\.type !== messageType/u);
  assert.doesNotMatch(homepageScript, /window\.scrollBy/u);
  assert.doesNotMatch(bootstrap, /scrollableAncestorCanConsume/u);
  assert.match(bootstrap, /embeddedDemoIsFullscreen/u);
  assert.match(bootstrap, /window\.parent\.postMessage/u);
  assert.match(bootstrap, /passive: false/u);

  const frameWindow = {};
  const frame = { contentWindow: frameWindow };
  const scrollingElement = {
    scrollLeft: 0,
    scrollTop: 100,
    style: { scrollBehavior: "smooth" },
  };
  let messageHandler = null;
  let pendingAnimationFrame = null;
  let animationFrameRequests = 0;
  const context = vm.createContext({
    console,
    document: {
      addEventListener() {},
      documentElement: scrollingElement,
      scrollingElement,
    },
    window: {
      addEventListener(type, handler) {
        if (type === "message") messageHandler = handler;
      },
      location: { origin: "https://miniclone.test" },
      requestAnimationFrame(callback) {
        animationFrameRequests += 1;
        pendingAnimationFrame = callback;
        return animationFrameRequests;
      },
    },
  });

  vm.runInContext(homepageScript, context);
  context.initDemoWheelBridge(frame);
  assert.equal(typeof messageHandler, "function");

  for (let packet = 0; packet < 20; packet += 1) {
    messageHandler({
      source: frameWindow,
      origin: "https://miniclone.test",
      data: { type: "miniclone-demo-wheel", deltaX: 0, deltaY: 10 },
    });
  }

  assert.equal(animationFrameRequests, 1);
  assert.equal(scrollingElement.scrollTop, 100);
  pendingAnimationFrame();
  assert.equal(scrollingElement.scrollTop, 300);
  assert.equal(scrollingElement.style.scrollBehavior, "smooth");

  messageHandler({
    source: {},
    origin: "https://miniclone.test",
    data: { type: "miniclone-demo-wheel", deltaX: 0, deltaY: 500 },
  });
  messageHandler({
    source: frameWindow,
    origin: "https://other.test",
    data: { type: "miniclone-demo-wheel", deltaX: 0, deltaY: 500 },
  });
  assert.equal(animationFrameRequests, 1);
  assert.equal(scrollingElement.scrollTop, 300);
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

test("website uses the live PayPal hosted checkout exactly once", async () => {
    const homepage = await text(new URL("index.html", websiteRoot));

  assert.equal((homepage.match(/www\.paypal\.com\/sdk\/js\?/gu) ?? []).length, 1);
  assert.equal((homepage.match(/id="paypal-container-6T72YME8CGZCN"/gu) ?? []).length, 1);
  assert.match(
    homepage,
    /client-id=BAA3X0UIMqAlzwV-3OM4554YnFfTxD8_w0CGXKeG03qHDgTxRfhY0Zzf3uvvjR-hukMm8jFnAKiB5I-BFc/u,
  );
  assert.match(homepage, /components=hosted-buttons/u);
  assert.match(homepage, /enable-funding=venmo/u);
  assert.match(homepage, /currency=USD/u);
    assert.match(homepage, /hostedButtonId:\s*["']6T72YME8CGZCN["']/u);
    assert.match(homepage, /Secure checkout powered by PayPal/u);
});

test("purchase card offers the free demo and both support contacts", async () => {
    const homepage = await text(new URL("index.html", websiteRoot));
  const stylesheet = await text(new URL("style.css", websiteRoot));

  assert.match(
    homepage,
    /href="https:\/\/fromariel\.github\.io\/CODEXVault_GODOT\/tools\/miniclone\/demo\/MiniClone-Demo\.exe"/u,
  );
  assert.match(homepage, />Download the Free Demo<\/a>/u);
    assert.match(homepage, /mailto:support@miniclone\.com/u);
    assert.match(homepage, /mailto:support@foxjammin\.com/u);
    assert.match(homepage, /If PayPal does not appear/u);
    assert.match(stylesheet, /\.purchase-options\s*\{[^}]*display:\s*grid;/su);
    assert.match(stylesheet, /@media \(max-width: 768px\)[\s\S]*?\.purchase-options\s*\{[^}]*grid-template-columns:\s*1fr;/u);
});

test("terms page, footer, and checkout trust routing are linked", async () => {
    const homepage = await text(new URL("index.html", websiteRoot));
    const terms = await text(new URL("terms.html", websiteRoot));
    const downloadsPage = await text(new URL("downloads/index.html", websiteRoot));
    const stylesheet = await text(new URL("style.css", websiteRoot));
    const sitemap = await text(new URL("sitemap.xml", websiteRoot));

    assert.match(homepage, /href="\/terms\.html"/u);
    assert.match(homepage, /href="\/terms\.html#refund-policy"/u);
    assert.match(homepage, /href="\/terms\.html#limitations"/u);
    assert.match(downloadsPage, /href="\.\.\/terms\.html"/u);
    assert.match(terms, /id="agreement"/u);
    assert.match(terms, /id="what-miniclone-is"/u);
    assert.match(terms, /id="refund-policy"/u);
    assert.match(terms, /id="limitations"/u);
    assert.match(terms, /id="warranty"/u);
    assert.match(terms, /id="contact"/u);
    assert.match(terms, /support@miniclone\.com/u);
    assert.match(terms, /Fox Jammin/u);
    assert.match(terms, /Ariel Williams/u);
    assert.match(sitemap, /https:\/\/miniclonehd\.com\/terms\.html/u);
    assert.match(stylesheet, /\.checkout-consent/u);
    assert.match(stylesheet, /\.paypal-checkout-state/u);
});

test("website no longer exposes the simulated Stripe purchase flow", async () => {
  const homepage = await text(new URL("index.html", websiteRoot));
  const homepageScript = await text(new URL("app.js", websiteRoot));
  const combined = `${homepage}\n${homepageScript}`;

  assert.doesNotMatch(combined, /Stripe|stripe-checkout|mock-checkout|checkout-card/u);
  assert.doesNotMatch(combined, /MC-2026-STABLE-RESTORE-ALPHA|triggerFakeDownload/u);
  assert.doesNotMatch(combined, /new Blob|createObjectURL/u);
  assert.doesNotMatch(combined, /fromariel@gmail\.com/iu);
});

test("downloads route uses relative assets and exposes both bounded artifacts", async () => {
  const homepage = await text(new URL("index.html", websiteRoot));
  const downloadsRoot = new URL("downloads/", websiteRoot);
  const downloadsPage = await text(new URL("index.html", downloadsRoot));
  const downloadsScript = await text(new URL("downloads.js", downloadsRoot));

  assert.match(homepage, /href="\.\/downloads\/"/u);
  assert.match(downloadsPage, /href="\.\/MiniCloneHD-Demo\.exe"/u);
  assert.match(
    downloadsPage,
    /href="\.\/MiniCloneHD-Release-Candidate-0\.1\.0-x64-setup\.exe"/u,
  );
  assert.match(downloadsPage, /href="\.\/SHA256SUMS\.txt"/u);
  assert.match(downloadsPage, /Destructive pre-release software\./u);
  assert.match(downloadsScript, /purchase.*=== 'complete'/u);
  assert.match(downloadsScript, /purchasedDownload\.click\(\)/u);
});

test("downloaded executables match the published SHA-256 manifest", async () => {
  const downloadsRoot = new URL("downloads/", websiteRoot);
  const manifest = await text(new URL("SHA256SUMS.txt", downloadsRoot));
  const entries = new Map(
    manifest.trim().split(/\r?\n/u).map((line) => {
      const [hash, name] = line.trim().split(/\s{2,}/u);
      return [name, hash];
    }),
  );

  assert.deepEqual([...entries.keys()].sort(), [
    "MiniCloneHD-Demo.exe",
    "MiniCloneHD-Release-Candidate-0.1.0-x64-setup.exe",
  ]);

  for (const [name, expectedHash] of entries) {
    const bytes = await readFile(new URL(name, downloadsRoot));
    assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), expectedHash);
  }
});
