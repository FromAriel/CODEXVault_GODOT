import React, { useMemo, useState } from "react";

// --- Data helpers -----------------------------------------------------------
const clamp255 = (n) => Math.max(0, Math.min(255, n | 0));
const rgbToHex = ([r, g, b]) =>
  "#" + [clamp255(r), clamp255(g), clamp255(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
const hexToRgb = (hex) => {
  const m = /^#?([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})$/.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
};
const tuple = (arr) => `(${clamp255(arr[0])},${clamp255(arr[1])},${clamp255(arr[2])})`;

// --- Default palette (updated to your latest base/rim) + accents ------------
const DEFAULT_ELEMENTS = [
  { name: "Fire", base: [153, 33, 0], rim: [255, 158, 0], accent: [120, 135, 161] },
  { name: "Water", base: [26, 82, 213], rim: [98, 194, 254], accent: [0, 255, 170] },
  { name: "Earth", base: [99, 51, 18], rim: [172, 134, 104], accent: [162, 151, 129] },
  { name: "Air", base: [229, 243, 255], rim: [0, 225, 255], accent: [158, 186, 255] },
  { name: "Metal", base: [90, 87, 112], rim: [189, 166, 196], accent: [240, 240, 255] },
  { name: "Plant", base: [0, 112, 0], rim: [195, 126, 29], accent: [215, 66, 40] },
  { name: "Positive", base: [254, 251, 225], rim: [255, 250, 92], accent: [0, 0, 0] },
  { name: "Negative", base: [15, 2, 29], rim: [63, 0, 97], accent: [255, 255, 255] },
  { name: "Steam", base: [126, 187, 205], rim: [219, 246, 255], accent: [64, 96, 112] },
  { name: "Magma", base: [152, 27, 27], rim: [56, 25, 0], accent: [255, 110, 0] },
  { name: "Plasma", base: [179, 0, 0], rim: [42, 59, 255], accent: [255, 255, 255] },
  { name: "Slag", base: [255, 155, 41], rim: [255, 81, 0], accent: [35, 28, 22] },
  { name: "Smoke", base: [126, 126, 126], rim: [201, 201, 201], accent: [32, 32, 32] },
  { name: "Radiation", base: [0, 194, 65], rim: [0, 255, 140], accent: [255, 220, 0] },
  { name: "Abyssal Flame", base: [143, 0, 43], rim: [153, 0, 133], accent: [0, 255, 208] },
  { name: "Oil", base: [17, 17, 17], rim: [103, 81, 81], accent: [99, 0, 199] },
  { name: "Bubbles", base: [198, 243, 255], rim: [208, 108, 254], accent: [255, 150, 170] },
  { name: "Rust", base: [120, 71, 38], rim: [51, 13, 5], accent: [95, 131, 140] },
  { name: "Poison", base: [0, 255, 224], rim: [0, 255, 170], accent: [185, 56, 255] },
  { name: "Acid", base: [94, 255, 0], rim: [238, 255, 0], accent: [0, 56, 52] },
  { name: "Cryo", base: [0, 204, 255], rim: [250, 255, 255], accent: [0, 92, 179] },
  { name: "Sand", base: [156, 137, 84], rim: [226, 208, 138], accent: [58, 93, 99] },
  { name: "Gravity", base: [44, 7, 75], rim: [124, 84, 245], accent: [180, 244, 254] },
  { name: "Life", base: [0, 199, 133], rim: [0, 71, 214], accent: [255, 196, 0] },
  { name: "Crystal", base: [173, 244, 255], rim: [254, 215, 242], accent: [184, 158, 255] },
  { name: "Stone", base: [140, 140, 140], rim: [207, 207, 207], accent: [92, 116, 78] },
  { name: "Magnet", base: [0, 29, 255], rim: [255, 0, 38], accent: [230, 230, 245] },
  { name: "Pollen", base: [200, 240, 0], rim: [251, 255, 133], accent: [120, 72, 0] },
  { name: "Lightning", base: [255, 255, 0], rim: [255, 255, 224], accent: [0, 213, 255] },
  { name: "Vacuum", base: [1, 1, 4], rim: [48, 46, 120], accent: [255, 255, 255] },
  { name: "Nano", base: [87, 78, 116], rim: [224, 204, 255], accent: [0, 255, 220] },
  { name: "Vibro", base: [192, 90, 217], rim: [255, 150, 255], accent: [0, 120, 255] },
  { name: "Disrupto", base: [92, 0, 80], rim: [178, 0, 160], accent: [255, 210, 0] },
  { name: "Tentacle", base: [0, 112, 37], rim: [122, 0, 138], accent: [255, 160, 200] },
  { name: "Vampire", base: [77, 0, 9], rim: [153, 0, 31], accent: [10, 0, 0] },
  { name: "Null", base: [127, 127, 127], rim: [184, 184, 184], accent: [31, 31, 31] },
];

const deepCloneDefaults = () => DEFAULT_ELEMENTS.map((it) => ({
  name: it.name,
  base: [...it.base],
  rim: [...it.rim],
  accent: [...it.accent],
}));

// --- UI ---------------------------------------------------------------------
export default function ElementColorTuner() {
  const [items, setItems] = useState(deepCloneDefaults());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [tests, setTests] = useState([]);

  const selected = items[selectedIndex] ?? items[0];

  const exportText = useMemo(() => {
    return items
      .map((it, i) => `${i === 0 ? "• " : "  "}${it.name} ${tuple(it.base)}, ${tuple(it.rim)}, ${tuple(it.accent)}`)
      .join("\n");
  }, [items]);

  const handleColorChange = (idx, key, valueHex) => {
    const rgb = hexToRgb(valueHex);
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: rgb } : it)));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = exportText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const resetDefaults = () => setItems(deepCloneDefaults());

  // --- Self‑tests -----------------------------------------------------------
  const runSelfTests = () => {
    const results = [];
    const eqArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

    // Test 1: rgbToHex
    results.push({
      name: "rgbToHex([255,0,0]) => #ff0000",
      passed: rgbToHex([255, 0, 0]) === "#ff0000",
    });

    // Test 2: hexToRgb
    results.push({
      name: "hexToRgb(#00ff00) => [0,255,0]",
      passed: eqArr(hexToRgb("#00ff00"), [0, 255, 0]),
    });

    // Test 3: tuple
    results.push({
      name: "tuple([12,34,56]) => (12,34,56)",
      passed: tuple([12, 34, 56]) === "(12,34,56)",
    });

    // Test 4: export format (defaults with accent)
    const defaults = deepCloneDefaults();
    const defaultExport = defaults
      .map((it, i) => `${i === 0 ? "• " : "  "}${it.name} ${tuple(it.base)}, ${tuple(it.rim)}, ${tuple(it.accent)}`)
      .join("\n");
    const firstLine = defaultExport.split("\n")[0];
    const groups = firstLine.match(/\([^\)]+\)/g) || [];
    results.push({
      name: "exportText first line begins with bullet and Fire triples",
      passed: firstLine.startsWith("• Fire (153,33,0), (255,158,0), (120,135,161)"), (255,158,0), (0,97,255)") && groups.length === 3,
    });
    results.push({
      name: "exportText second line is indented two spaces",
      passed: defaultExport.includes("\n  Water ("),
    });

    setTests(results);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Element Color Tuner</h1>
          <p className="text-slate-400">Click an element name or color to preview. Edit with the pickers. Copy in your exact tuple format (now with accent).</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 active:bg-fuchsia-700 transition shadow-md"
            title="Copy all colors to clipboard in tuple format"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={resetDefaults}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 transition"
            title="Restore original palette"
          >
            Reset to Defaults
          </button>
        </div>
      </header>

      {/* Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* List / editor */}
        <section className="xl:col-span-3">
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700 overflow-hidden shadow-lg">
            <div className="grid grid-cols-[1.25fr,1fr,1fr,1fr] text-sm bg-slate-800/80 px-4 py-2 font-medium text-slate-300">
              <div>Element</div>
              <div className="text-center">Base</div>
              <div className="text-center">Rim</div>
              <div className="text-center">Accent</div>
            </div>
            <ul className="divide-y divide-slate-700 max-h-[65vh] overflow-auto">
              {items.map((it, i) => {
                const isSel = i === selectedIndex;
                return (
                  <li
                    key={it.name}
                    className={
                      "grid grid-cols-[1.25fr,1fr,1fr,1fr] items-center gap-2 px-3 py-2 hover:bg-slate-800/60 cursor-pointer " +
                      (isSel ? "bg-slate-800/80 ring-1 ring-fuchsia-500" : "")
                    }
                    onClick={() => setSelectedIndex(i)}
                    title={`Select ${it.name}`}
                  >
                    {/* Name + swatch (base fill, rim border, accent slash) */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="shrink-0 w-16 h-10 rounded-lg shadow-md border-4"
                        style={{
                          background: `linear-gradient(135deg, transparent 45%, rgb(${it.accent.join(",")}) 50%, transparent 55%), rgb(${it.base.join(",")})`,
                          borderColor: `rgb(${it.rim.join(",")})`,
                        }}
                        title={`${it.name} color swatch`}
                      />
                      <button
                        className={"text-left truncate " + (isSel ? "text-white" : "text-slate-200")}
                        onClick={() => setSelectedIndex(i)}
                      >
                        {it.name}
                      </button>
                    </div>

                    {/* Base editor */}
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="color"
                        value={rgbToHex(it.base)}
                        onChange={(e) => handleColorChange(i, "base", e.target.value)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(i);
                        }}
                        className="w-12 h-12 rounded-md border border-slate-600 bg-slate-900 p-0 cursor-pointer"
                        aria-label={`${it.name} base color`}
                        title={`${it.name} base ${tuple(it.base)}`}
                      />
                      <code className="text-xs text-slate-400">{tuple(it.base)}</code>
                    </div>

                    {/* Rim editor */}
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="color"
                        value={rgbToHex(it.rim)}
                        onChange={(e) => handleColorChange(i, "rim", e.target.value)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(i);
                        }}
                        className="w-12 h-12 rounded-md border border-slate-600 bg-slate-900 p-0 cursor-pointer"
                        aria-label={`${it.name} rim color`}
                        title={`${it.name} rim ${tuple(it.rim)}`}
                      />
                      <code className="text-xs text-slate-400">{tuple(it.rim)}</code>
                    </div>

                    {/* Accent editor */}
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="color"
                        value={rgbToHex(it.accent)}
                        onChange={(e) => handleColorChange(i, "accent", e.target.value)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(i);
                        }}
                        className="w-12 h-12 rounded-md border border-slate-600 bg-slate-900 p-0 cursor-pointer"
                        aria-label={`${it.name} accent color`}
                        title={`${it.name} accent ${tuple(it.accent)}`}
                      />
                      <code className="text-xs text-slate-400">{tuple(it.accent)}</code>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Export preview */}
          <details className="mt-4 rounded-xl bg-slate-800/60 border border-slate-700 shadow-lg">
            <summary className="px-4 py-3 cursor-pointer select-none text-sm text-slate-300">Preview exported text</summary>
            <pre className="px-4 pb-4 text-slate-200 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">{exportText}</pre>
          </details>

          {/* Self-tests */}
          <details className="mt-4 rounded-xl bg-slate-800/60 border border-slate-700 shadow-lg">
            <summary className="px-4 py-3 cursor-pointer select-none text-sm text-slate-300">Self‑tests</summary>
            <div className="px-4 pb-4">
              <button
                onClick={runSelfTests}
                className="mb-3 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-800 transition"
              >
                Run Self‑tests
              </button>
              {tests.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {tests.map((t, idx) => (
                    <li key={idx} className={t.passed ? "text-emerald-300" : "text-rose-300"}>
                      {t.passed ? "✅" : "❌"} {t.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </section>

        {/* Preview card */}
        <aside className="xl:col-span-2">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4 shadow-lg">
              <h2 className="text-lg font-medium mb-3">Preview</h2>
              <div className="flex items-center gap-4">
                <div
                  className="w-72 h-44 rounded-2xl shadow-2xl shrink-0"
                  style={{
                    background: `linear-gradient(135deg, transparent 43%, rgb(${selected.accent.join(",")}) 47%, rgb(${selected.accent.join(",")}) 53%, transparent 57%), rgb(${selected.base.join(",")})`,
                    border: `14px solid rgb(${selected.rim.join(",")})`,
                  }}
                  title={`${selected.name} preview`}
                />
                <div className="min-w-0">
                  <div className="text-sm text-slate-300">Element</div>
                  <div className="text-xl font-semibold mb-2">{selected.name}</div>
                  <div className="text-sm text-slate-300">Base</div>
                  <div className="mb-2"><code className="text-slate-200">{tuple(selected.base)}</code></div>
                  <div className="text-sm text-slate-300">Rim</div>
                  <div className="mb-2"><code className="text-slate-200">{tuple(selected.rim)}</code></div>
                  <div className="text-sm text-slate-300">Accent</div>
                  <div><code className="text-slate-200">{tuple(selected.accent)}</code></div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4 shadow-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-2">Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 active:bg-fuchsia-700 transition shadow-md"
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </button>
                <button
                  onClick={resetDefaults}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 transition"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
