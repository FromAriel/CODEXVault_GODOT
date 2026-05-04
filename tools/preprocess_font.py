"""Preprocess the first 17POV typography font asset.

This V1 spike intentionally produces inspectable JSON, not a compact runtime
binary. It extracts TrueType quadratic outlines with fontTools and writes enough
curve/band metadata for the later WGSL static glyph renderer lab.
"""

from __future__ import annotations

import argparse
import html
import json
import math
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont


REPO_ROOT = Path(__file__).resolve().parents[4]
TYPOGRAPHY_ROOT = REPO_ROOT / "game" / "17_points_of_violence" / "data" / "typography"
LAB_ROOT = REPO_ROOT / "game" / "17_points_of_violence" / "tools" / "typography_lab"
FONT_ID = "tac_one"
FONT_FAMILY = "Tac One"
FONT_FILENAME = "TacOne-Regular.ttf"
FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/tacone/TacOne-Regular.ttf"
LICENSE_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/tacone/OFL.txt"
CHARACTER_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.,- "
BAND_COUNT = 32
ROUND_DIGITS = 6


def rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def download_if_missing(url: str, path: Path, *, force: bool = False) -> None:
    if path.exists() and not force:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=45) as response:
        data = response.read()
    path.write_bytes(data)


def name_record(font: TTFont, name_id: int) -> str | None:
    table = font["name"]
    preferred = table.getName(name_id, 3, 1, 0x409) or table.getName(name_id, 1, 0, 0)
    return preferred.toUnicode() if preferred else None


def rounded(value: float) -> float:
    value = round(float(value), ROUND_DIGITS)
    return 0.0 if value == -0.0 else value


class SegmentCollectorPen(BasePen):
    def __init__(self, glyph_set, units_per_em: int):
        super().__init__(glyph_set)
        self.units = units_per_em
        self.contours: list[dict] = []
        self.current: dict | None = None
        self.warnings: list[str] = []

    def n(self, point) -> list[float]:
        return [rounded(point[0] / self.units), rounded(point[1] / self.units)]

    def _moveTo(self, point) -> None:
        self.current = {"closed": False, "segments": [], "start": self.n(point)}
        self.contours.append(self.current)

    def _lineTo(self, point) -> None:
        if self.current is None:
            self._moveTo(point)
            return
        self.current["segments"].append({
            "type": "line",
            "p0": self.n(self._getCurrentPoint()),
            "p1": self.n(point),
        })

    def _qCurveToOne(self, control, point) -> None:
        if self.current is None:
            self._moveTo(point)
            return
        self.current["segments"].append({
            "type": "quadratic",
            "p0": self.n(self._getCurrentPoint()),
            "p1": self.n(control),
            "p2": self.n(point),
        })

    def _curveToOne(self, p1, p2, p3) -> None:
        self.warnings.append("cubic curve encountered; preserved as cubic for inspection")
        if self.current is None:
            self._moveTo(p3)
            return
        self.current["segments"].append({
            "type": "cubic",
            "p0": self.n(self._getCurrentPoint()),
            "p1": self.n(p1),
            "p2": self.n(p2),
            "p3": self.n(p3),
        })

    def _closePath(self) -> None:
        if self.current is not None:
            self.current["closed"] = True

    def _endPath(self) -> None:
        self.current = None


def segment_points(segment: dict) -> list[list[float]]:
    return [value for key, value in segment.items() if key.startswith("p") and isinstance(value, list)]


def bounds_for_segments(segments: list[dict]) -> dict | None:
    points: list[list[float]] = []
    for segment in segments:
        points.extend(segment_points(segment))
    if not points:
        return None
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return {
        "minX": rounded(min(xs)),
        "minY": rounded(min(ys)),
        "maxX": rounded(max(xs)),
        "maxY": rounded(max(ys)),
    }


def curve_y_range(segment: dict) -> tuple[float, float]:
    ys = [point[1] for point in segment_points(segment)]
    return min(ys), max(ys)


def build_bands(bounds: dict | None, curve_indices: list[int], curves: list[dict]) -> tuple[list[dict], int]:
    if not bounds or not curve_indices:
        return [], 0
    min_y = bounds["minY"]
    max_y = bounds["maxY"]
    height = max(max_y - min_y, 0.0001)
    bands: list[dict] = []
    max_count = 0
    for index in range(BAND_COUNT):
        y0 = min_y + (height * index) / BAND_COUNT
        y1 = min_y + (height * (index + 1)) / BAND_COUNT
        hits: list[int] = []
        for curve_index in curve_indices:
            c0, c1 = curve_y_range(curves[curve_index])
            if c1 >= y0 and c0 <= y1:
                hits.append(curve_index)
        max_count = max(max_count, len(hits))
        if hits:
            bands.append({
                "index": index,
                "minY": rounded(y0),
                "maxY": rounded(y1),
                "curveIndices": hits,
            })
    return bands, max_count


def extract_glyph(font: TTFont, char: str, curves: list[dict], units: int) -> dict:
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap() or {}
    glyph_name = cmap.get(ord(char))
    hmtx = font["hmtx"].metrics
    diagnostics: list[str] = []
    if glyph_name is None:
        return {"char": char, "missing": True, "diagnostics": ["missing from cmap"]}

    advance_width, left_side_bearing = hmtx.get(glyph_name, (0, 0))
    pen = SegmentCollectorPen(glyph_set, units)
    glyph_set[glyph_name].draw(pen)

    local_curve_indices: list[int] = []
    contours: list[dict] = []
    for contour_index, contour in enumerate(pen.contours):
        output_segments = []
        for segment_index, segment in enumerate(contour["segments"]):
            curve_index = len(curves)
            curve_record = {
                "index": curve_index,
                "glyph": char,
                "glyphName": glyph_name,
                "contour": contour_index,
                "segment": segment_index,
                **segment,
            }
            curves.append(curve_record)
            local_curve_indices.append(curve_index)
            output_segments.append({"curveIndex": curve_index, **segment})
        contours.append({
            "closed": bool(contour["closed"]),
            "start": contour.get("start"),
            "segments": output_segments,
        })

    if pen.warnings:
        diagnostics.extend(pen.warnings)
    bounds = bounds_for_segments([curves[index] for index in local_curve_indices])
    bands, max_curves = build_bands(bounds, local_curve_indices, curves)
    if char == " " and local_curve_indices:
        diagnostics.append("space has unexpected outline data")
    if char != " " and not local_curve_indices:
        diagnostics.append("visible glyph has no outline segments")

    return {
        "char": char,
        "glyphName": glyph_name,
        "metrics": {
            "advanceWidth": advance_width,
            "leftSideBearing": left_side_bearing,
            "advanceEm": rounded(advance_width / units),
            "leftSideBearingEm": rounded(left_side_bearing / units),
            "bounds": bounds,
            "contourCount": len(contours),
            "curveCount": len(local_curve_indices),
        },
        "contours": contours,
        "bands": bands,
        "bandSummary": {
            "bandCount": BAND_COUNT,
            "nonEmptyBands": len(bands),
            "maxCurvesPerBand": max_curves,
        },
        "diagnostics": diagnostics,
    }


def build_svg_path(glyph: dict) -> str:
    parts: list[str] = []
    for contour in glyph.get("contours", []):
        if not contour.get("segments"):
            continue
        first = contour["segments"][0]["p0"]
        parts.append(f"M {first[0]} {-first[1]}")
        for segment in contour["segments"]:
            if segment["type"] == "line":
                p1 = segment["p1"]
                parts.append(f"L {p1[0]} {-p1[1]}")
            elif segment["type"] == "quadratic":
                p1 = segment["p1"]
                p2 = segment["p2"]
                parts.append(f"Q {p1[0]} {-p1[1]} {p2[0]} {-p2[1]}")
            elif segment["type"] == "cubic":
                p1 = segment["p1"]
                p2 = segment["p2"]
                p3 = segment["p3"]
                parts.append(f"C {p1[0]} {-p1[1]} {p2[0]} {-p2[1]} {p3[0]} {-p3[1]}")
        if contour.get("closed"):
            parts.append("Z")
    return " ".join(parts)


def write_report(asset: dict, report_path: Path) -> None:
    rows = []
    for char in asset["characterSet"]:
        glyph = asset["glyphs"][char]
        label = "space" if char == " " else html.escape(char)
        path = build_svg_path(glyph)
        curve_count = glyph.get("metrics", {}).get("curveCount", 0)
        max_band = glyph.get("bandSummary", {}).get("maxCurvesPerBand", 0)
        warnings = ", ".join(glyph.get("diagnostics", []))
        svg = "<span class='empty'>advance only</span>" if not path else (
            "<svg viewBox='-0.25 -1.1 1.5 1.35' aria-hidden='true'>"
            f"<path d='{html.escape(path)}'></path></svg>"
        )
        rows.append(
            "<article class='glyph'>"
            f"<h2>{label}</h2>{svg}"
            f"<p>{html.escape(glyph.get('glyphName', 'missing'))}</p>"
            f"<dl><dt>curves</dt><dd>{curve_count}</dd><dt>bands</dt><dd>{max_band}</dd></dl>"
            f"<small>{html.escape(warnings)}</small>"
            "</article>"
        )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tac One Glyph Inspection</title>
  <style>
    body {{ margin: 0; background: #050505; color: #f8f7f0; font-family: Arial, sans-serif; }}
    header {{ padding: 24px; border-bottom: 4px solid #d90000; }}
    h1 {{ margin: 0; font: 900 56px/0.9 Impact, Arial Black, sans-serif; text-transform: uppercase; }}
    main {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; padding: 16px; }}
    .glyph {{ border: 1px solid #5b4b00; background: #151512; padding: 12px; min-height: 230px; }}
    h2 {{ margin: 0 0 8px; color: #f2c300; }}
    svg {{ width: 100%; height: 120px; background: #f8f7f0; border: 1px solid #806a00; }}
    path {{ fill: #050505; stroke: #d90000; stroke-width: 0.006; }}
    p, small {{ color: #d8d0b8; overflow-wrap: anywhere; }}
    dl {{ display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; margin: 8px 0; }}
    dt {{ color: #aaa28b; }} dd {{ margin: 0; font-weight: 800; }}
    .empty {{ display: grid; place-items: center; height: 120px; border: 1px solid #806a00; color: #aaa28b; }}
  </style>
</head>
<body>
  <header>
    <h1>Tac One Glyph Inspection</h1>
    <p>Generated {html.escape(asset['generatedAt'])}. JSON: {html.escape(asset['fontId'])}.glyphs.json</p>
    <p>Worst curves per band: {asset['summary']['maxCurvesPerBand']} · Total curves: {len(asset['curves'])}</p>
  </header>
  <main>{''.join(rows)}</main>
</body>
</html>
""", encoding="utf-8")


def write_classic_script_bridge(asset: dict, bridge_path: Path, source_asset_path: Path) -> None:
    """Write a classic-script wrapper so the standalone lab can load from file://."""
    bridge_path.parent.mkdir(parents=True, exist_ok=True)
    source = rel(source_asset_path)
    body = json.dumps(asset, indent=2, ensure_ascii=False)
    bridge_path.write_text(
        "// Generated from "
        + source
        + ".\n"
        + "// Keep the JSON asset as source of truth; this classic-script bridge preserves file:// lab loading.\n"
        + "(function () {\n"
        + "  \"use strict\";\n"
        + "  window.STICKY_TYPOGRAPHY_GLYPH_ASSETS = window.STICKY_TYPOGRAPHY_GLYPH_ASSETS || {};\n"
        + f"  window.STICKY_TYPOGRAPHY_GLYPH_ASSETS.{FONT_ID} = "
        + body
        + ";\n"
        + "})();\n",
        encoding="utf-8",
    )


def validate_asset(asset: dict) -> None:
    required = list(CHARACTER_SET)
    missing = [char for char in required if char not in asset["glyphs"] or asset["glyphs"][char].get("missing")]
    if asset["fontId"] != FONT_ID:
        raise RuntimeError(f"fontId mismatch: {asset['fontId']}")
    if missing:
        raise RuntimeError(f"missing required glyphs: {missing}")
    for char in required:
        glyph = asset["glyphs"][char]
        curves = glyph.get("metrics", {}).get("curveCount", 0)
        if char == " ":
            if curves != 0:
                raise RuntimeError("space glyph should be advance-only")
        elif curves <= 0:
            raise RuntimeError(f"visible glyph {char!r} has no curves")
    if asset["summary"]["maxCurvesPerBand"] <= 0:
        raise RuntimeError("band metadata did not report any curves")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Generate Tac One glyph JSON for the typography renderer spike.")
    parser.add_argument("--force-download", action="store_true", help="Refresh cached source font and license files.")
    parser.add_argument("--output-root", type=Path, default=TYPOGRAPHY_ROOT)
    args = parser.parse_args(argv)

    output_root = args.output_root.resolve()
    source_font = output_root / "source_fonts" / FONT_FILENAME
    license_file = output_root / "source_fonts" / "OFL.txt"
    download_if_missing(FONT_URL, source_font, force=args.force_download)
    download_if_missing(LICENSE_URL, license_file, force=args.force_download)

    font = TTFont(source_font)
    units = font["head"].unitsPerEm
    os2 = font.get("OS/2")
    head = font["head"]
    hhea = font["hhea"]
    curves: list[dict] = []
    glyphs = {char: extract_glyph(font, char, curves, units) for char in CHARACTER_SET}
    max_curves_per_band = max(glyph.get("bandSummary", {}).get("maxCurvesPerBand", 0) for glyph in glyphs.values())
    asset = {
        "schema": "sticky.typographyGlyphAsset.v1",
        "fontId": FONT_ID,
        "family": FONT_FAMILY,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "fontUrl": FONT_URL,
            "licenseUrl": LICENSE_URL,
            "cachedFontPath": rel(source_font),
            "cachedLicensePath": rel(license_file),
            "license": "SIL Open Font License 1.1",
        },
        "fontNames": {
            "family": name_record(font, 1),
            "subfamily": name_record(font, 2),
            "uniqueId": name_record(font, 3),
            "fullName": name_record(font, 4),
            "version": name_record(font, 5),
            "copyright": name_record(font, 0),
        },
        "metrics": {
            "unitsPerEm": units,
            "ascender": hhea.ascent,
            "descender": hhea.descent,
            "lineGap": hhea.lineGap,
            "capHeight": getattr(os2, "sCapHeight", None) if os2 else None,
            "xHeight": getattr(os2, "sxHeight", None) if os2 else None,
            "bounds": {"xMin": head.xMin, "yMin": head.yMin, "xMax": head.xMax, "yMax": head.yMax},
        },
        "normalization": {
            "coordinateSpace": "em",
            "scale": f"font units / {units}",
            "yAxis": "positive up",
            "curveTypes": ["line", "quadratic"],
            "bandMode": "per-glyph local y range",
            "bandCount": BAND_COUNT,
        },
        "characterSet": list(CHARACTER_SET),
        "glyphs": glyphs,
        "curves": curves,
        "summary": {
            "glyphCount": len(glyphs),
            "totalCurves": len(curves),
            "maxCurvesPerBand": max_curves_per_band,
            "glyphsWithWarnings": [char for char, glyph in glyphs.items() if glyph.get("diagnostics")],
        },
    }
    validate_asset(asset)

    fonts_dir = output_root / "fonts"
    reports_dir = output_root / "reports"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)
    asset_path = fonts_dir / f"{FONT_ID}.glyphs.json"
    manifest_path = output_root / "font_manifest.json"
    report_path = reports_dir / f"{FONT_ID}_inspection.html"
    bridge_path = LAB_ROOT / f"{FONT_ID}_glyph_asset.generated.js"

    asset_path.write_text(json.dumps(asset, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    manifest = {
        "schema": "sticky.typographyFontManifest.v1",
        "generatedAt": asset["generatedAt"],
        "fonts": [{
            "fontId": FONT_ID,
            "family": FONT_FAMILY,
            "role": "impact",
            "asset": rel(asset_path),
            "inspectionReport": rel(report_path),
            "sourceFont": rel(source_font),
            "license": rel(license_file),
            "characterSet": "uppercase A-Z, digits 0-9, !?.,-, and space",
        }],
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    write_report(asset, report_path)
    write_classic_script_bridge(asset, bridge_path, asset_path)

    print(f"wrote {rel(asset_path)}")
    print(f"wrote {rel(manifest_path)}")
    print(f"wrote {rel(report_path)}")
    print(f"wrote {rel(bridge_path)}")
    print(f"total curves: {len(curves)}; max curves per band: {max_curves_per_band}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
