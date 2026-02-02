/* =========================================================
   Foxjammin Studios — Sigilry landing page scripts
   - Theme switcher (3 "takes")
   - Mobile nav toggle
   - ASCII-ish hero canvas (pausable + reduced motion aware)
   - Sigil generator
   - Icon Forge (Iconify API /search)
   ========================================================= */

(function () {
  const THEME_STORAGE_KEY = "fj_theme";

  const THEMES = [
    { id: "terminal", label: "Terminal Cathedral" },
    { id: "obsidian", label: "Obsidian Atelier" },
    { id: "zine", label: "Zine Workshop" },
  ];

  const root = document.documentElement;

  function setMetaThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const themeColor = getComputedStyle(root).getPropertyValue("--meta-theme").trim();
    if (themeColor) meta.setAttribute("content", themeColor);
  }

  function setTheme(themeId) {
    const valid = THEMES.some((t) => t.id === themeId);
    const next = valid ? themeId : "terminal";
    root.dataset.theme = next;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (_) {
      /* ignore */
    }

    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) themeSelect.value = next;

    setMetaThemeColor();
  }

  (function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (_) {
      saved = null;
    }
    setTheme(saved || root.dataset.theme || "terminal");

    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) {
      themeSelect.addEventListener("change", (e) => setTheme(e.target.value));
    }
  })();

  /* ---------------------------
     Mobile nav
  --------------------------- */
  (function initNav() {
    const header = document.querySelector(".site-header");
    const btn = document.querySelector(".nav-toggle");
    const nav = document.getElementById("primary-nav");
    if (!header || !btn || !nav) return;

    function closeNav() {
      header.dataset.state = "closed";
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      header.dataset.state = expanded ? "closed" : "open";
      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
    });

    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      closeNav();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  })();

  /* ---------------------------
     Toast helper
  --------------------------- */
  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
  }

  /* ---------------------------
     Year in footer
  --------------------------- */
  (function setYear() {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  })();

  /* ---------------------------
     Sigil generator
  --------------------------- */
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateSigil(seed) {
    const w = 23;
    const h = 11;
    const chars = "/\\|_-+=*#@";
    const rng = mulberry32(seed);

    const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => " "));

    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x <= Math.floor(w / 2); x++) {
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        const weight = Math.max(0, 1 - dx / cx) * Math.max(0, 1 - dy / cy);

        // Fill probability is higher near the center
        const fillChance = 0.08 + 0.48 * weight;
        const filled = rng() < fillChance;

        const ch = filled ? chars[Math.floor(rng() * chars.length)] : " ";

        grid[y][x] = ch;
        grid[y][w - 1 - x] = ch;
      }
    }

    // Add a subtle "spine"
    for (let y = 1; y < h - 1; y++) {
      if (rng() < 0.55) grid[y][Math.floor(cx)] = rng() < 0.5 ? "|" : "+";
    }

    // Corner marks
    grid[0][0] = "+";
    grid[0][w - 1] = "+";
    grid[h - 1][0] = "+";
    grid[h - 1][w - 1] = "+";

    const lines = grid.map((row) => row.join(""));
    return lines.join("\n");
  }

  (function initSigilUI() {
    const out = document.getElementById("sigilOutput");
    const seedEl = document.getElementById("sigilSeed");
    const regen = document.getElementById("regenSigil");
    if (!out || !regen) return;

    let seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;

    function render() {
      out.textContent = generateSigil(seed);
      if (seedEl) seedEl.textContent = `seed: ${seed}`;
    }

    regen.addEventListener("click", () => {
      seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
      render();
    });

    // Click sigil to copy seed
    out.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(String(seed));
        toast("Copied sigil seed to clipboard");
      } catch (_) {
        toast("Could not copy seed (clipboard blocked)");
      }
    });

    render();
  })();

  /* ---------------------------
     ASCII-ish hero canvas
     - respects reduced motion
     - can be paused
     - auto-pauses when not visible
  --------------------------- */
  (function initAsciiCanvas() {
    const canvas = document.getElementById("asciiCanvas");
    const pauseBtn = document.getElementById("pauseAscii");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let running = !prefersReduced;
    let visible = true;

    let t = 0;
    let dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    function getColor(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function clamp01(x) {
      return Math.max(0, Math.min(1, x));
    }

    function field(x, y, time) {
      // A simple wave field that reads a bit like braided bands.
      const nx = x / 220;
      const ny = y / 220;
      const a = Math.sin((nx * 7.0 + time * 0.8) + Math.sin(ny * 2.2));
      const b = Math.cos((ny * 6.5 - time * 0.7) + Math.cos(nx * 2.0));
      const c = Math.sin((nx + ny) * 6.0 + time * 1.2);
      return (a + b + c) / 3;
    }

    function draw() {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const accent = getColor("--accent") || "#6dff95";
      const muted = getColor("--muted") || "#88b39a";

      ctx.clearRect(0, 0, w, h);

      const cell = Math.max(11, Math.floor(Math.min(w, h) / 34));
      const chars = " .:-=+*#%@";

      ctx.font = `${cell}px ${getColor("--font-mono") || "monospace"}`;
      ctx.textBaseline = "top";

      // soft background tint
      ctx.fillStyle = muted;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(0, 0, w, h);

      // glyph layer
      ctx.globalAlpha = 0.9;

      for (let y = 0; y < h + cell; y += cell) {
        for (let x = 0; x < w + cell; x += cell) {
          const v = field(x, y, t);
          const v01 = clamp01((v + 1) / 2);

          const idx = Math.floor(v01 * (chars.length - 1));
          const ch = chars[idx];

          // fade edges a bit
          const edgeX = Math.min(x / w, 1 - x / w);
          const edgeY = Math.min(y / h, 1 - y / h);
          const vignette = clamp01(Math.min(edgeX, edgeY) * 2.1);

          ctx.fillStyle = accent;
          ctx.globalAlpha = 0.12 + 0.78 * vignette;
          ctx.fillText(ch, x, y);
        }
      }

      ctx.globalAlpha = 1;
    }

    let last = 0;
    function frame(ts) {
      if (!running || !visible) return;

      // ~12fps throttle
      if (ts - last < 1000 / 12) {
        requestAnimationFrame(frame);
        return;
      }
      last = ts;

      t += 0.15;
      draw();
      requestAnimationFrame(frame);
    }

    // Observe visibility
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (visible && running) requestAnimationFrame(frame);
      },
      { threshold: 0.15 }
    );
    io.observe(canvas);

    // Pause toggle
    if (pauseBtn) {
      pauseBtn.disabled = prefersReduced;
      pauseBtn.setAttribute("aria-pressed", String(!running));

      if (prefersReduced) {
        pauseBtn.title = "Disabled due to reduced motion preference";
      }

      pauseBtn.addEventListener("click", () => {
        running = !running;
        pauseBtn.setAttribute("aria-pressed", String(!running));
        if (running && visible) requestAnimationFrame(frame);
      });
    }

    // Resize
    const ro = new ResizeObserver(() => {
      resize();
      if (running && visible) draw();
    });
    ro.observe(canvas);

    window.addEventListener("resize", () => {
      resize();
      if (running && visible) draw();
    });

    resize();
    if (running && visible) requestAnimationFrame(frame);
    else draw();
  })();

  /* ---------------------------
     Icon Forge (Iconify API /search)
  --------------------------- */
  (function initIconForge() {
    const form = document.getElementById("iconSearchForm");
    const q = document.getElementById("iconQuery");
    const prefix = document.getElementById("iconPrefix");
    const limit = document.getElementById("iconLimit");
    const results = document.getElementById("iconResults");
    const status = document.getElementById("iconStatus");

    if (!form || !q || !prefix || !limit || !results || !status) return;

    const API = "https://api.iconify.design/search";

    let abort = null;
    let debounceTimer = null;

    function setStatus(text) {
      status.textContent = text;
    }

    function clearResults() {
      results.innerHTML = "";
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        toast(`Copied: ${text}`);
      } catch (_) {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          toast(`Copied: ${text}`);
        } catch (e) {
          toast("Copy failed (clipboard blocked)");
        }
        document.body.removeChild(ta);
      }
    }

    function renderIcons(iconNames) {
      clearResults();

      for (const name of iconNames) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "icon-tile";
        btn.setAttribute("role", "listitem");
        btn.title = "Click to copy icon name";

        btn.innerHTML = `
          <iconify-icon icon="${name}" aria-hidden="true"></iconify-icon>
          <div class="icon-name">${name}</div>
        `;

        btn.addEventListener("click", () => copyText(name));
        results.appendChild(btn);
      }
    }

    async function doSearch() {
      const query = String(q.value || "").trim();
      const setPrefix = String(prefix.value || "").trim() || "game-icons";
      const lim = Math.max(32, Math.min(999, Number(limit.value || 64)));

      if (!query) {
        setStatus("Type a query to search.");
        clearResults();
        return;
      }

      if (abort) abort.abort();
      abort = new AbortController();

      setStatus(`Searching "${query}" in ${setPrefix}…`);
      clearResults();

      try {
        const url = new URL(API);
        url.searchParams.set("query", query);
        url.searchParams.set("prefix", setPrefix);
        url.searchParams.set("limit", String(lim));
        url.searchParams.set("pretty", "1");

        const res = await fetch(url.toString(), { signal: abort.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const icons = Array.isArray(data.icons) ? data.icons : [];
        const total = typeof data.total === "number" ? data.total : icons.length;

        if (!icons.length) {
          setStatus(`No results for "${query}" in ${setPrefix}.`);
          return;
        }

        setStatus(`Found ${total} result(s). Showing ${icons.length}. Click to copy.`);
        renderIcons(icons);
      } catch (e) {
        if (e && e.name === "AbortError") return;
        setStatus("Search failed. (Network/CORS/rate limit?) Try again.");
      }
    }

    function debouncedSearch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => doSearch(), 320);
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      doSearch();
    });

    q.addEventListener("input", debouncedSearch);
    prefix.addEventListener("input", debouncedSearch);

    setStatus("Search an icon name (stairs, potion, skull…). Click results to copy.");
  })();
})();
