(() => {
  "use strict";

  const codexUsage = [{"date":"2025-08-30","millions":92.7},{"date":"2025-08-31","millions":39.2},{"date":"2025-09-01","millions":1.2},{"date":"2025-09-02","millions":17.4},{"date":"2025-09-03","millions":3.0},{"date":"2025-09-04","millions":46.2},{"date":"2025-09-05","millions":53.2},{"date":"2025-09-06","millions":91.8},{"date":"2025-09-07","millions":34.9},{"date":"2025-09-08","millions":52.3},{"date":"2025-09-09","millions":6.9},{"date":"2025-09-10","millions":34.2},{"date":"2025-09-11","millions":51.8},{"date":"2025-09-12","millions":12.6},{"date":"2025-09-13","millions":51.4},{"date":"2025-09-14","millions":116.2},{"date":"2025-09-15","millions":23.7},{"date":"2025-09-16","millions":81.9},{"date":"2025-09-17","millions":96.0},{"date":"2025-09-18","millions":128.0},{"date":"2025-09-19","millions":89.9},{"date":"2025-09-20","millions":94.3},{"date":"2025-09-21","millions":15.4},{"date":"2025-09-22","millions":45.0},{"date":"2025-09-23","millions":20.0},{"date":"2025-09-24","millions":57.6},{"date":"2025-09-25","millions":102.9},{"date":"2025-09-26","millions":153.2},{"date":"2025-09-27","millions":7.8},{"date":"2025-09-28","millions":74.9},{"date":"2025-09-29","millions":96.2},{"date":"2025-09-30","millions":0.2404},{"date":"2025-10-01","millions":0.0},{"date":"2025-10-02","millions":0.0},{"date":"2025-10-03","millions":262.4},{"date":"2025-10-04","millions":23.9},{"date":"2025-10-05","millions":84.1},{"date":"2025-10-06","millions":101.4},{"date":"2025-10-07","millions":55.7},{"date":"2025-10-08","millions":71.2},{"date":"2025-10-09","millions":43.6},{"date":"2025-10-10","millions":91.9},{"date":"2025-10-11","millions":127.6},{"date":"2025-10-12","millions":32.4},{"date":"2025-10-13","millions":74.1},{"date":"2025-10-14","millions":62.4},{"date":"2025-10-15","millions":41.9},{"date":"2025-10-16","millions":125.9},{"date":"2025-10-17","millions":98.2},{"date":"2025-10-18","millions":65.4},{"date":"2025-10-19","millions":66.2},{"date":"2025-10-20","millions":137.6},{"date":"2025-10-21","millions":153.3},{"date":"2025-10-22","millions":60.9},{"date":"2025-10-23","millions":97.6},{"date":"2025-10-24","millions":109.3},{"date":"2025-10-25","millions":79.7},{"date":"2025-10-26","millions":45.3},{"date":"2025-10-27","millions":184.0},{"date":"2025-10-28","millions":267.9},{"date":"2025-10-29","millions":88.4},{"date":"2025-10-30","millions":31.1},{"date":"2025-10-31","millions":56.3},{"date":"2025-11-01","millions":64.2},{"date":"2025-11-02","millions":45.7},{"date":"2025-11-03","millions":119.3},{"date":"2025-11-04","millions":244.9},{"date":"2025-11-05","millions":250.1},{"date":"2025-11-06","millions":94.9},{"date":"2025-11-07","millions":126.2},{"date":"2025-11-08","millions":197.4},{"date":"2025-11-09","millions":159.3},{"date":"2025-11-10","millions":104.3},{"date":"2025-11-11","millions":296.7},{"date":"2025-11-12","millions":113.0},{"date":"2025-11-13","millions":305.8},{"date":"2025-11-14","millions":211.0},{"date":"2025-11-15","millions":210.1},{"date":"2025-11-16","millions":180.2},{"date":"2025-11-17","millions":171.6},{"date":"2025-11-18","millions":268.2},{"date":"2025-11-19","millions":86.0},{"date":"2025-11-20","millions":95.1},{"date":"2025-11-21","millions":88.2},{"date":"2025-11-22","millions":22.7},{"date":"2025-11-23","millions":44.0},{"date":"2025-11-24","millions":134.4},{"date":"2025-11-25","millions":103.4},{"date":"2025-11-26","millions":58.1},{"date":"2025-11-27","millions":140.6},{"date":"2025-11-28","millions":152.1},{"date":"2025-11-29","millions":113.4},{"date":"2025-11-30","millions":63.2},{"date":"2025-12-01","millions":130.8},{"date":"2025-12-02","millions":160.5},{"date":"2025-12-03","millions":36.7},{"date":"2025-12-04","millions":87.4},{"date":"2025-12-05","millions":70.4},{"date":"2025-12-06","millions":29.4},{"date":"2025-12-07","millions":57.3},{"date":"2025-12-08","millions":92.5},{"date":"2025-12-09","millions":100.4},{"date":"2025-12-10","millions":91.2},{"date":"2025-12-11","millions":111.3},{"date":"2025-12-12","millions":106.3},{"date":"2025-12-13","millions":144.4},{"date":"2025-12-14","millions":104.4},{"date":"2025-12-15","millions":125.2},{"date":"2025-12-16","millions":98.2},{"date":"2025-12-17","millions":63.6},{"date":"2025-12-18","millions":90.9},{"date":"2025-12-19","millions":111.4},{"date":"2025-12-20","millions":119.1},{"date":"2025-12-21","millions":73.4},{"date":"2025-12-22","millions":82.9},{"date":"2025-12-23","millions":98.7},{"date":"2025-12-24","millions":49.7},{"date":"2025-12-25","millions":74.6},{"date":"2025-12-26","millions":113.0},{"date":"2025-12-27","millions":51.9},{"date":"2025-12-28","millions":13.7},{"date":"2025-12-29","millions":102.3},{"date":"2025-12-30","millions":82.6},{"date":"2025-12-31","millions":37.8},{"date":"2026-01-01","millions":135.7},{"date":"2026-01-02","millions":30.2},{"date":"2026-01-03","millions":132.4},{"date":"2026-01-04","millions":73.0},{"date":"2026-01-05","millions":21.0},{"date":"2026-01-06","millions":57.0},{"date":"2026-01-07","millions":15.7},{"date":"2026-01-08","millions":52.8},{"date":"2026-01-09","millions":102.2},{"date":"2026-01-10","millions":61.8},{"date":"2026-01-11","millions":107.5},{"date":"2026-01-12","millions":76.0},{"date":"2026-01-13","millions":32.1},{"date":"2026-01-14","millions":114.2},{"date":"2026-01-15","millions":54.4},{"date":"2026-01-16","millions":25.6},{"date":"2026-01-17","millions":71.9},{"date":"2026-01-18","millions":75.5},{"date":"2026-01-19","millions":21.3},{"date":"2026-01-20","millions":35.2},{"date":"2026-01-21","millions":28.3},{"date":"2026-01-22","millions":25.8},{"date":"2026-01-23","millions":106.4},{"date":"2026-01-24","millions":65.2},{"date":"2026-01-25","millions":62.5},{"date":"2026-01-26","millions":64.9},{"date":"2026-01-27","millions":95.0},{"date":"2026-01-28","millions":45.9},{"date":"2026-01-29","millions":50.5},{"date":"2026-01-30","millions":94.7},{"date":"2026-01-31","millions":42.8},{"date":"2026-02-01","millions":32.5},{"date":"2026-02-02","millions":146.2},{"date":"2026-02-03","millions":39.7},{"date":"2026-02-04","millions":0.0},{"date":"2026-02-05","millions":19.4},{"date":"2026-02-06","millions":49.6},{"date":"2026-02-07","millions":86.1},{"date":"2026-02-08","millions":9.7},{"date":"2026-02-09","millions":81.0},{"date":"2026-02-10","millions":47.6},{"date":"2026-02-11","millions":47.0},{"date":"2026-02-12","millions":67.0},{"date":"2026-02-13","millions":197.3},{"date":"2026-02-14","millions":100.2},{"date":"2026-02-15","millions":68.4},{"date":"2026-02-16","millions":130.4},{"date":"2026-02-17","millions":101.6},{"date":"2026-02-18","millions":59.8},{"date":"2026-02-19","millions":218.2},{"date":"2026-02-20","millions":36.7},{"date":"2026-02-21","millions":23.7},{"date":"2026-02-22","millions":71.8},{"date":"2026-02-23","millions":0.0},{"date":"2026-02-24","millions":97.7},{"date":"2026-02-25","millions":39.6},{"date":"2026-02-26","millions":40.0},{"date":"2026-02-27","millions":12.2},{"date":"2026-02-28","millions":44.7},{"date":"2026-03-01","millions":41.6},{"date":"2026-03-02","millions":109.5},{"date":"2026-03-03","millions":115.8},{"date":"2026-03-04","millions":43.8},{"date":"2026-03-05","millions":15.8},{"date":"2026-03-06","millions":27.9},{"date":"2026-03-07","millions":5.8},{"date":"2026-03-08","millions":15.2},{"date":"2026-03-09","millions":46.8},{"date":"2026-03-10","millions":47.5},{"date":"2026-03-11","millions":112.4},{"date":"2026-03-12","millions":25.6},{"date":"2026-03-13","millions":39.8},{"date":"2026-03-14","millions":30.4},{"date":"2026-03-15","millions":73.1},{"date":"2026-03-16","millions":71.7},{"date":"2026-03-17","millions":101.4},{"date":"2026-03-18","millions":66.5},{"date":"2026-03-19","millions":44.8},{"date":"2026-03-20","millions":183.9},{"date":"2026-03-21","millions":33.2},{"date":"2026-03-22","millions":31.9},{"date":"2026-03-23","millions":95.6},{"date":"2026-03-24","millions":0.0},{"date":"2026-03-25","millions":62.1},{"date":"2026-03-26","millions":181.8},{"date":"2026-03-27","millions":73.2},{"date":"2026-03-28","millions":171.6},{"date":"2026-03-29","millions":62.8},{"date":"2026-03-30","millions":15.0},{"date":"2026-03-31","millions":0.3265},{"date":"2026-04-01","millions":0.9104},{"date":"2026-04-02","millions":84.8},{"date":"2026-04-03","millions":100.4},{"date":"2026-04-04","millions":40.8},{"date":"2026-04-05","millions":100.5},{"date":"2026-04-06","millions":101.2},{"date":"2026-04-07","millions":172.1},{"date":"2026-04-08","millions":74.4},{"date":"2026-04-09","millions":93.5},{"date":"2026-04-10","millions":149.4},{"date":"2026-04-11","millions":76.5},{"date":"2026-04-12","millions":106.1},{"date":"2026-04-13","millions":13.9},{"date":"2026-04-14","millions":144.7},{"date":"2026-04-15","millions":59.2},{"date":"2026-04-16","millions":38.1},{"date":"2026-04-17","millions":97.6},{"date":"2026-04-18","millions":14.3},{"date":"2026-04-19","millions":0.0},{"date":"2026-04-20","millions":0.0},{"date":"2026-04-21","millions":0.0},{"date":"2026-04-22","millions":0.0},{"date":"2026-04-23","millions":27.3},{"date":"2026-04-24","millions":96.2},{"date":"2026-04-25","millions":29.0},{"date":"2026-04-26","millions":6.0},{"date":"2026-04-27","millions":0.0},{"date":"2026-04-28","millions":67.4},{"date":"2026-04-29","millions":67.4},{"date":"2026-04-30","millions":18.3},{"date":"2026-05-01","millions":128.5},{"date":"2026-05-02","millions":287.6},{"date":"2026-05-03","millions":179.9},{"date":"2026-05-04","millions":218.1},{"date":"2026-05-05","millions":169.7},{"date":"2026-05-06","millions":212.0},{"date":"2026-05-07","millions":67.1},{"date":"2026-05-08","millions":5.8},{"date":"2026-05-09","millions":121.6},{"date":"2026-05-10","millions":84.4},{"date":"2026-05-11","millions":110.1},{"date":"2026-05-12","millions":7.8},{"date":"2026-05-13","millions":26.2},{"date":"2026-05-14","millions":155.9},{"date":"2026-05-15","millions":41.3},{"date":"2026-05-16","millions":86.1},{"date":"2026-05-17","millions":83.4},{"date":"2026-05-18","millions":95.5},{"date":"2026-05-19","millions":163.3},{"date":"2026-05-20","millions":171.5},{"date":"2026-05-21","millions":102.0},{"date":"2026-05-22","millions":122.0},{"date":"2026-05-23","millions":145.0},{"date":"2026-05-24","millions":90.1},{"date":"2026-05-25","millions":56.5},{"date":"2026-05-26","millions":71.7},{"date":"2026-05-27","millions":72.3},{"date":"2026-05-28","millions":57.3},{"date":"2026-05-29","millions":133.6},{"date":"2026-05-30","millions":103.7},{"date":"2026-05-31","millions":132.3},{"date":"2026-06-01","millions":139.2},{"date":"2026-06-02","millions":28.0},{"date":"2026-06-03","millions":82.1},{"date":"2026-06-04","millions":60.6},{"date":"2026-06-05","millions":110.2},{"date":"2026-06-06","millions":1.9},{"date":"2026-06-07","millions":0.0},{"date":"2026-06-08","millions":0.0},{"date":"2026-06-09","millions":43.8},{"date":"2026-06-10","millions":18.7},{"date":"2026-06-11","millions":206.1},{"date":"2026-06-12","millions":204.4},{"date":"2026-06-13","millions":1.6},{"date":"2026-06-14","millions":33.5},{"date":"2026-06-15","millions":335.2},{"date":"2026-06-16","millions":273.3},{"date":"2026-06-17","millions":303.3},{"date":"2026-06-18","millions":302.0},{"date":"2026-06-19","millions":181.3},{"date":"2026-06-20","millions":149.6},{"date":"2026-06-21","millions":135.7},{"date":"2026-06-22","millions":223.9},{"date":"2026-06-23","millions":330.9},{"date":"2026-06-24","millions":87.3},{"date":"2026-06-25","millions":327.3},{"date":"2026-06-26","millions":125.2},{"date":"2026-06-27","millions":35.1},{"date":"2026-06-28","millions":111.1},{"date":"2026-06-29","millions":190.4},{"date":"2026-06-30","millions":279.3},{"date":"2026-07-01","millions":348.6},{"date":"2026-07-02","millions":138.8},{"date":"2026-07-03","millions":100.9},{"date":"2026-07-04","millions":246.4},{"date":"2026-07-05","millions":371.1},{"date":"2026-07-06","millions":130.7},{"date":"2026-07-07","millions":69.1},{"date":"2026-07-08","millions":27.7},{"date":"2026-07-09","millions":79.7},{"date":"2026-07-10","millions":528.9},{"date":"2026-07-11","millions":411.7},{"date":"2026-07-12","millions":532.3}];

  const field = document.querySelector("[data-codex-field]");
  if (!field) return;

  const canvas = field.querySelector("[data-signal-canvas]");
  const visual = field.querySelector("[data-signal-visual]");
  const tooltip = field.querySelector("[data-signal-tooltip]");
  const tooltipDate = field.querySelector("[data-signal-tooltip-date]");
  const tooltipValue = field.querySelector("[data-signal-tooltip-value]");
  const tooltipNote = field.querySelector("[data-signal-tooltip-note]");
  const motionToggle = field.querySelector("[data-signal-motion]");
  const liveStatus = field.querySelector("[data-signal-live]");
  const tableBody = field.querySelector("[data-signal-table] tbody");
  const context = canvas?.getContext("2d", { alpha: true });
  const heatLayer = document.createElement("canvas");
  const heatContext = heatLayer.getContext("2d");

  if (!canvas || !visual || !tooltip || !motionToggle || !context || !heatContext) {
    field.classList.add("signal-field--unavailable");
    return;
  }

  const snapshotMode = new URLSearchParams(window.location.search).has("snapshot");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dayMs = 86400000;
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
  const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short" });
  const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
  const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
  const compactFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let pausedByUser = snapshotMode;
  let inViewport = !("IntersectionObserver" in window);
  let particles = [];
  let sparks = [];
  let cells = [];
  let cellByKey = new Map();
  let hotCells = [];
  let animationId = 0;
  let resizeId = 0;
  let lastTime = performance.now();
  let keyboardIndex = -1;
  let activeCell = null;
  let palette;
  let pointer = { x: -9999, y: -9999, active: false, speed: 0, influence: 0, lastMove: -Infinity };
  let layout = { left: 46, top: 38, right: 14, bottom: 25, cellW: 10, cellH: 22, weeks: 46 };

  const totalMillions = codexUsage.reduce((sum, day) => sum + day.millions, 0);
  const activeDays = codexUsage.filter(day => day.millions > 0).length;
  const averageMillions = totalMillions / codexUsage.length;
  const sortedValues = [...codexUsage].sort((a, b) => b.millions - a.millions);
  const peakDay = sortedValues[0];
  const maxValue = peakDay.millions;
  const rankByDate = new Map(sortedValues.map((day, index) => [day.date, index + 1]));

  const parseLocalDate = iso => {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  };

  const firstDate = parseLocalDate(codexUsage[0].date);
  const lastDate = parseLocalDate(codexUsage[codexUsage.length - 1].date);
  const mondayIndex = date => (date.getDay() + 6) % 7;
  const gridStart = new Date(firstDate);
  gridStart.setDate(gridStart.getDate() - mondayIndex(gridStart));
  const weeks = Math.floor((lastDate - gridStart) / dayMs / 7) + 1;

  function formatValue(value) {
    if (value === 0) return "0 tokens";
    if (value < 1) return `${numberFormat.format(value * 1000)} thousand tokens`;
    return `${numberFormat.format(value)} million tokens`;
  }

  function formatMillions(value) {
    return `${compactFormat.format(value)}M`;
  }

  function setText(selector, value) {
    const element = field.querySelector(selector);
    if (element) element.textContent = value;
  }

  function populateSummary() {
    const dateRange = `${dateFormat.format(firstDate)} through ${dateFormat.format(lastDate)}.`;
    setText("[data-signal-total]", `${compactFormat.format(totalMillions / 1000)}B`);
    setText("[data-signal-peak]", formatMillions(peakDay.millions));
    setText("[data-signal-average]", formatMillions(averageMillions));
    setText("[data-signal-active]", String(activeDays));
    setText("[data-signal-days]", String(codexUsage.length));
    setText("[data-signal-range]", dateRange);
    canvas.setAttribute("aria-label", `Interactive calendar of daily Codex token usage from ${dateRange} Focus the field and use arrow keys to explore dates.`);
  }

  function populateAccessibleTable() {
    if (!tableBody) return;
    const fragment = document.createDocumentFragment();
    codexUsage.forEach(day => {
      const row = document.createElement("tr");
      const date = document.createElement("td");
      const value = document.createElement("td");
      date.textContent = dateFormat.format(parseLocalDate(day.date));
      value.textContent = formatValue(day.millions);
      row.append(date, value);
      fragment.append(row);
    });
    tableBody.replaceChildren(fragment);
  }

  function cssValue(name, fallback) {
    return getComputedStyle(field).getPropertyValue(name).trim() || fallback;
  }

  function parseHex(value, fallback) {
    const normalized = value.trim().replace("#", "");
    const hex = normalized.length === 3
      ? normalized.split("").map(character => character + character).join("")
      : normalized;
    if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16)
    ];
  }

  const rgba = (color, alpha) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

  function mixColor(a, b, amount) {
    return a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount));
  }

  function readPalette() {
    const light = document.documentElement.dataset.theme === "light";
    palette = {
      light,
      zero: parseHex(cssValue("--sf-data-zero", "#657589"), [101, 117, 137]),
      stops: [
        parseHex(cssValue("--sf-data-low", "#8778d8"), [135, 120, 216]),
        parseHex(cssValue("--sf-data-mid", "#648fd5"), [100, 143, 213]),
        parseHex(cssValue("--sf-data-high", "#67d6e8"), [103, 214, 232]),
        parseHex(cssValue("--sf-data-peak", "#e7fbff"), [231, 251, 255])
      ],
      label: cssValue("--sf-faint", "#8491a0"),
      grid: cssValue("--sf-grid", "rgba(103, 214, 232, .09)"),
      pointer: cssValue("--sf-pointer", "rgba(103, 214, 232, .08)")
    };
  }

  function colorFor(intensity, alpha) {
    const scaled = Math.max(0, Math.min(1, intensity)) * (palette.stops.length - 1);
    const index = Math.min(palette.stops.length - 2, Math.floor(scaled));
    return rgba(mixColor(palette.stops[index], palette.stops[index + 1], scaled - index), alpha);
  }

  function intensityFor(value) {
    if (value <= 0) return 0;
    return Math.pow(value / maxValue, .38);
  }

  function mulberry32(seed) {
    return () => {
      let value = seed += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function hashDate(iso) {
    let hash = 2166136261;
    for (let index = 0; index < iso.length; index += 1) {
      hash ^= iso.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function motionAllowed() {
    return !snapshotMode && !pausedByUser && !reducedMotion.matches && inViewport && !document.hidden;
  }

  function resetParticles() {
    particles.forEach(particle => {
      particle.x = particle.baseX;
      particle.y = particle.baseY;
      particle.vx = 0;
      particle.vy = 0;
    });
    sparks = [];
    pointer.active = false;
    pointer.influence = 0;
  }

  function stopAnimation(renderStatic = false, resetToSeed = false) {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = 0;
    if (renderStatic && width > 0 && height > 0) {
      if (resetToSeed) resetParticles();
      else {
        sparks = [];
        pointer.active = false;
        pointer.influence = 0;
      }
      draw(false);
    }
  }

  function scheduleResize() {
    if (resizeId) cancelAnimationFrame(resizeId);
    resizeId = requestAnimationFrame(() => {
      resizeId = 0;
      resize();
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    stopAnimation(false);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    heatLayer.width = canvas.width;
    heatLayer.height = canvas.height;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    heatContext.setTransform(dpr, 0, 0, dpr, 0, 0);

    const compact = width < 620;
    layout.left = compact ? 29 : 46;
    layout.right = compact ? 7 : 14;
    layout.top = compact ? 44 : 38;
    layout.bottom = compact ? 24 : 25;
    layout.weeks = weeks;
    layout.cellW = (width - layout.left - layout.right) / weeks;
    layout.cellH = (height - layout.top - layout.bottom) / 7;

    buildField();
    pointer.active = false;
    pointer.influence = 0;
    if (keyboardIndex >= 0) showKeyboardCell(keyboardIndex);
    else updateTooltip(null, { x: 0, y: 0 });
    ensureAnimation();
  }

  function buildField() {
    particles = [];
    sparks = [];
    cells = [];
    cellByKey = new Map();
    const motionScale = Math.max(.9, Math.min(1.55, layout.cellW / 10));

    codexUsage.forEach((day, index) => {
      const date = parseLocalDate(day.date);
      const dayOffset = Math.round((date - gridStart) / dayMs);
      const column = Math.floor(dayOffset / 7);
      const row = mondayIndex(date);
      const x = layout.left + (column + .5) * layout.cellW;
      const y = layout.top + (row + .5) * layout.cellH;
      const intensity = intensityFor(day.millions);
      const random = mulberry32(hashDate(day.date));
      const cell = {
        ...day,
        index,
        dateObject: date,
        column,
        row,
        x,
        y,
        intensity,
        rank: rankByDate.get(day.date),
        flowPhase: random() * Math.PI * 2,
        flowSpeed: .38 + random() * .34,
        flowDrift: (2.4 + intensity * 3.6) * motionScale,
        particleStart: particles.length
      };

      const count = day.millions === 0 ? 1 : Math.round(3 + intensity * 18);
      const spreadX = Math.max(1.3, layout.cellW * .3);
      const spreadY = Math.max(3, layout.cellH * .3);

      for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random());
        const baseX = x + Math.cos(angle) * radius * spreadX;
        const baseY = y + Math.sin(angle) * radius * spreadY;
        const size = day.millions === 0 ? .55 : .48 + random() * (1.08 + intensity * .85);
        particles.push({
          x: baseX,
          y: baseY,
          baseX,
          baseY,
          vx: 0,
          vy: 0,
          size,
          phase: random() * Math.PI * 2,
          speed: .68 + random() * .92,
          drift: (2.1 + random() * 3.8) * motionScale,
          intensity,
          dormant: day.millions === 0,
          cell
        });
      }

      cell.particleEnd = particles.length;
      cells.push(cell);
      cellByKey.set(`${column}:${row}`, cell);
    });

    hotCells = cells.filter(cell => cell.millions > 100);
    renderHeatLayer();
    draw(false);
  }

  function renderHeatLayer() {
    heatContext.clearRect(0, 0, width, height);
    heatContext.save();
    cells.forEach(cell => {
      if (cell.millions === 0) return;
      const radius = Math.max(3.2, Math.min(layout.cellH * .48, 3.5 + cell.intensity * 10));
      const gradient = heatContext.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, radius);
      gradient.addColorStop(0, colorFor(cell.intensity, (palette.light ? .11 : .16) + cell.intensity * .2));
      gradient.addColorStop(.34, colorFor(cell.intensity, .06 + cell.intensity * .1));
      gradient.addColorStop(1, colorFor(cell.intensity, 0));
      heatContext.fillStyle = gradient;
      heatContext.beginPath();
      heatContext.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
      heatContext.fill();
    });
    heatContext.restore();
  }

  function drawScaffolding() {
    context.save();
    context.font = "700 9px ui-sans-serif, system-ui, sans-serif";
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillStyle = palette.label;

    weekdays.forEach((label, row) => {
      const y = layout.top + (row + .5) * layout.cellH;
      context.fillText(label, layout.left - 10, y);
    });

    let previousMonth = -1;
    let lastDrawnX = -999;
    cells.forEach(cell => {
      const month = cell.dateObject.getMonth();
      if (cell.dateObject.getDate() <= 7 && month !== previousMonth) {
        const x = layout.left + cell.column * layout.cellW;
        if (x - lastDrawnX > 22) {
          context.textAlign = "left";
          context.textBaseline = "alphabetic";
          context.fillText(monthFormat.format(cell.dateObject).toUpperCase(), x + 2, 19);
          context.strokeStyle = palette.grid;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(x, layout.top - 5);
          context.lineTo(x, height - layout.bottom + 3);
          context.stroke();
          lastDrawnX = x;
        }
        previousMonth = month;
      }
    });
    context.restore();
  }

  function drawActiveAnchor(animate, now) {
    if (!activeCell) return;
    const pulse = animate ? (Math.sin(now * .006) + 1) * .5 : .55;
    const haloRadius = 8 + activeCell.intensity * 5 + pulse * 4;
    const coreRadius = 1.8 + activeCell.intensity * 1.15 + pulse * .8;
    const glow = context.createRadialGradient(
      activeCell.x,
      activeCell.y,
      0,
      activeCell.x,
      activeCell.y,
      haloRadius
    );

    context.save();
    context.globalCompositeOperation = palette.light ? "source-over" : "lighter";
    glow.addColorStop(0, colorFor(Math.max(.62, activeCell.intensity), .72));
    glow.addColorStop(.28, colorFor(activeCell.intensity, .3 + pulse * .16));
    glow.addColorStop(1, colorFor(activeCell.intensity, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(activeCell.x, activeCell.y, haloRadius, 0, Math.PI * 2);
    context.fill();

    context.shadowColor = colorFor(Math.max(.7, activeCell.intensity), .92);
    context.shadowBlur = 10 + pulse * 12;
    context.fillStyle = colorFor(Math.max(.72, activeCell.intensity), .96);
    context.beginPath();
    context.arc(activeCell.x, activeCell.y, coreRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function updateParticle(particle, delta, time) {
    const cell = particle.cell;
    const sharedX = Math.sin(time * cell.flowSpeed + cell.flowPhase) * cell.flowDrift;
    const sharedY = Math.cos(time * cell.flowSpeed * .72 + cell.flowPhase) * cell.flowDrift * .78;
    const localX = Math.sin(time * particle.speed + particle.phase) * particle.drift
      + Math.sin(time * particle.speed * .37 + particle.phase * 1.73) * particle.drift * .34;
    const localY = Math.cos(time * particle.speed * .78 + particle.phase) * particle.drift * .78
      + Math.sin(time * particle.speed * .29 + particle.phase * .83) * particle.drift * .34;
    const targetX = particle.baseX + sharedX + localX;
    const targetY = particle.baseY + sharedY + localY;

    if (pointer.active) {
      const deltaX = particle.x - pointer.x;
      const deltaY = particle.y - pointer.y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      const radius = Math.max(30, layout.cellH * 1.35);
      if (distanceSquared < radius * radius && distanceSquared > .001) {
        const distance = Math.sqrt(distanceSquared);
        const force = Math.pow(1 - distance / radius, 1.7);
        const speedBoost = Math.min(1.9, pointer.speed * .035);
        particle.vx += deltaX / distance * force * (.34 + speedBoost) * pointer.influence;
        particle.vy += deltaY / distance * force * (.34 + speedBoost) * pointer.influence;
      }
    }

    const spring = .16;
    particle.vx += (targetX - particle.x) * spring * delta;
    particle.vy += (targetY - particle.y) * spring * delta;
    particle.vx *= Math.pow(.86, delta);
    particle.vy *= Math.pow(.86, delta);
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
  }

  function maybeSpawnSpark() {
    if (sparks.length >= 24 || !hotCells.length || Math.random() > .045) return;
    const weighted = hotCells[Math.floor(Math.pow(Math.random(), .52) * hotCells.length)];
    if (Math.random() > .08 + weighted.intensity * .14) return;

    const angle = Math.random() * Math.PI * 2;
    const speed = .05 + Math.random() * .13;
    sparks.push({
      x: weighted.x + (Math.random() - .5) * layout.cellW * .35,
      y: weighted.y + (Math.random() - .5) * layout.cellH * .35,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - .035,
      life: 1,
      decay: .006 + Math.random() * .01,
      size: .55 + Math.random() * 1.1,
      intensity: weighted.intensity
    });
  }

  function draw(animate, now = performance.now()) {
    const delta = Math.min(2.4, Math.max(.2, (now - lastTime) / 16.67));
    lastTime = now;
    context.clearRect(0, 0, width, height);
    drawScaffolding();
    context.drawImage(heatLayer, 0, 0, heatLayer.width, heatLayer.height, 0, 0, width, height);
    drawActiveAnchor(animate, now);

    context.save();
    context.globalCompositeOperation = palette.light ? "source-over" : "lighter";
    const time = now * .001;
    pointer.influence = pointer.active ? Math.max(0, 1 - (now - pointer.lastMove) / 850) : 0;
    if (pointer.influence <= 0) pointer.active = false;

    particles.forEach(particle => {
      if (animate) updateParticle(particle, delta, time);
      const twinkle = animate && !particle.dormant
        ? .58 + .11 * Math.sin(now * .00065 * particle.speed + particle.phase)
        : .58;
      const alpha = particle.dormant
        ? (palette.light ? .42 : .25)
        : (palette.light ? .34 + particle.intensity * .5 : .22 + particle.intensity * .68) * twinkle;
      context.fillStyle = particle.dormant
        ? rgba(palette.zero, alpha)
        : colorFor(particle.intensity, Math.max(.08, alpha));
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    });

    if (animate) maybeSpawnSpark();
    else sparks = [];

    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      spark.x += spark.vx * delta;
      spark.y += spark.vy * delta;
      spark.vx *= .992;
      spark.vy *= .992;
      spark.life -= spark.decay * delta;
      if (spark.life <= 0) {
        sparks.splice(index, 1);
        continue;
      }
      context.fillStyle = colorFor(spark.intensity, Math.max(0, spark.life * .32));
      context.beginPath();
      context.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
      context.fill();
    }

    if (animate && pointer.active) {
      const gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 31);
      gradient.addColorStop(0, palette.pointer);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.globalAlpha = pointer.influence;
      context.beginPath();
      context.arc(pointer.x, pointer.y, 31, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }

    context.restore();
    pointer.speed *= .84;
  }

  function animationFrame(now) {
    animationId = 0;
    if (!motionAllowed()) return;
    draw(true, now);
    ensureAnimation();
  }

  function ensureAnimation() {
    if (!animationId && motionAllowed()) {
      lastTime = performance.now();
      animationId = requestAnimationFrame(animationFrame);
    }
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function cellAt(x, y) {
    const column = Math.floor((x - layout.left) / layout.cellW);
    const row = Math.floor((y - layout.top) / layout.cellH);
    if (column < 0 || column >= weeks || row < 0 || row > 6) return null;
    return cellByKey.get(`${column}:${row}`) || null;
  }

  function tooltipNoteFor(cell) {
    if (cell.millions === 0) return "A recorded zero-use day.";
    if (cell.rank === 1) return `Highest recorded day · ${(cell.millions / averageMillions).toFixed(1)}× the daily average.`;
    if (cell.rank <= 5) {
      const ordinal = cell.rank === 2 ? "2nd" : cell.rank === 3 ? "3rd" : `${cell.rank}th`;
      return `Top-five day · ${ordinal} highest in the record.`;
    }
    return `${(cell.millions / averageMillions).toFixed(1)}× the daily average · #${cell.rank} of ${codexUsage.length}.`;
  }

  function updateTooltip(cell, point, announce = false) {
    activeCell = cell;
    if (!cell) {
      tooltip.classList.remove("visible");
      tooltip.setAttribute("aria-hidden", "true");
      if (!motionAllowed() && width > 0 && height > 0) draw(false);
      return;
    }

    const note = tooltipNoteFor(cell);
    tooltipDate.textContent = dateFormat.format(cell.dateObject);
    tooltipValue.textContent = formatValue(cell.millions);
    tooltipNote.textContent = note;

    const visualRect = visual.getBoundingClientRect();
    const tipWidth = tooltip.offsetWidth || 205;
    const tipHeight = tooltip.offsetHeight || 84;
    let left = point.x + 16;
    let top = point.y - tipHeight - 12;
    if (left + tipWidth > visualRect.width - 8) left = point.x - tipWidth - 16;
    if (top < 8) top = point.y + 17;
    left = Math.max(8, Math.min(visualRect.width - tipWidth - 8, left));
    top = Math.max(8, Math.min(visualRect.height - tipHeight - 8, top));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add("visible");
    tooltip.setAttribute("aria-hidden", "false");
    if (!motionAllowed() && width > 0 && height > 0) draw(false);

    if (announce && liveStatus) {
      liveStatus.textContent = `${dateFormat.format(cell.dateObject)}: ${formatValue(cell.millions)}. ${note}`;
    }
  }

  function showKeyboardCell(index) {
    keyboardIndex = Math.max(0, Math.min(cells.length - 1, index));
    const cell = cells[keyboardIndex];
    if (!cell) return;
    updateTooltip(cell, { x: cell.x, y: cell.y }, true);
  }

  function handlePointerMove(event) {
    const point = pointFromEvent(event);
    const previousX = pointer.active ? pointer.x : point.x;
    const previousY = pointer.active ? pointer.y : point.y;
    pointer.speed = Math.min(60, Math.hypot(point.x - previousX, point.y - previousY));
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.active = motionAllowed() && (event.pointerType === "mouse" || event.buttons > 0);
    pointer.influence = pointer.active ? 1 : 0;
    pointer.lastMove = performance.now();
    updateTooltip(cellAt(point.x, point.y), point);
    ensureAnimation();
  }

  function handlePointerDown(event) {
    handlePointerMove(event);
    const point = pointFromEvent(event);
    const cell = cellAt(point.x, point.y);
    if (!cell) return;
    keyboardIndex = cell.index;
    updateTooltip(cell, point, true);
  }

  function handlePointerLeave() {
    pointer.active = false;
    pointer.influence = 0;
    pointer.x = -9999;
    pointer.y = -9999;
    if (document.activeElement === canvas && keyboardIndex >= 0) {
      showKeyboardCell(keyboardIndex);
    } else {
      updateTooltip(null, { x: 0, y: 0 });
    }
  }

  function handleKeydown(event) {
    if (!cells.length) return;
    let nextIndex = keyboardIndex < 0 ? cells.length - 1 : keyboardIndex;
    switch (event.key) {
      case "ArrowLeft": nextIndex -= 7; break;
      case "ArrowRight": nextIndex += 7; break;
      case "ArrowUp": nextIndex -= 1; break;
      case "ArrowDown": nextIndex += 1; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = cells.length - 1; break;
      case "Escape":
        keyboardIndex = -1;
        updateTooltip(null, { x: 0, y: 0 });
        if (liveStatus) liveStatus.textContent = "Date selection cleared.";
        event.preventDefault();
        return;
      default: return;
    }
    event.preventDefault();
    showKeyboardCell(nextIndex);
  }

  function updateMotionControl() {
    const preferenceBlocksMotion = reducedMotion.matches;
    motionToggle.hidden = snapshotMode;
    motionToggle.disabled = preferenceBlocksMotion;
    motionToggle.setAttribute("aria-pressed", String(!pausedByUser && !preferenceBlocksMotion));
    motionToggle.title = preferenceBlocksMotion ? "Motion is disabled by your reduced-motion setting." : "";
  }

  canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("pointerdown", handlePointerDown, { passive: true });
  canvas.addEventListener("pointerup", () => { pointer.active = false; });
  canvas.addEventListener("pointercancel", handlePointerLeave);
  canvas.addEventListener("focus", () => {
    if (keyboardIndex < 0 && cells.length) showKeyboardCell(cells.length - 1);
  });
  canvas.addEventListener("blur", () => {
    keyboardIndex = -1;
    updateTooltip(null, { x: 0, y: 0 });
  });
  canvas.addEventListener("keydown", handleKeydown);

  motionToggle.addEventListener("click", () => {
    pausedByUser = !pausedByUser;
    updateMotionControl();
    if (pausedByUser) stopAnimation(true, false);
    else ensureAnimation();
  });

  reducedMotion.addEventListener?.("change", () => {
    updateMotionControl();
    if (reducedMotion.matches) stopAnimation(true, true);
    else ensureAnimation();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimation(false);
    else ensureAnimation();
  });

  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      inViewport = Boolean(entry?.isIntersecting);
      if (inViewport) ensureAnimation();
      else stopAnimation(false);
    }, { threshold: .08 });
    visibilityObserver.observe(field);
  }

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(visual);
  } else {
    window.addEventListener("resize", scheduleResize, { passive: true });
  }
  window.addEventListener("codex-field:resize", scheduleResize);

  const themeObserver = new MutationObserver(mutations => {
    if (!mutations.some(mutation => mutation.attributeName === "data-theme")) return;
    readPalette();
    if (width > 0 && height > 0) {
      renderHeatLayer();
      draw(false);
      ensureAnimation();
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  populateSummary();
  populateAccessibleTable();
  readPalette();
  if (snapshotMode) field.classList.add("visible");
  updateMotionControl();
  resize();
})();
