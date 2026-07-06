# EOTFW Icon Intake

Status: review-approved visual resource intake.

This directory stores SVG icons for the offline EOTFW app. Ariel reviewed the intake on 2026-07-06 and approved the set for use except for the icons listed in `resources/icons/icon_review_rejects.json`.

OCHA icons are especially suitable for extensive EOTFW use. Iconify icons are also usable candidates unless they are listed in the reject sidecar.

## Commands

Dry run without writing files:

```powershell
python tools/intake_icons.py --dry-run
```

Download OCHA and Iconify candidates, then generate the gallery:

```powershell
python tools/intake_icons.py --download --gallery
```

Validate the manifest and local SVG files:

```powershell
python tools/intake_icons.py --status
```

## Outputs

- `resources/icons/ocha/` contains OCHA/MapAction humanitarian SVGs.
- `resources/icons/iconify/` contains Iconify API-selected SVGs.
- `resources/icons/icon_manifest.json` is the canonical metadata index.
- `resources/icons/icon_review_rejects.json` is Ariel's reject-only review decision.
- `resources/icons/review_gallery.html` is the local review page.

## Review Sidecar

The review gallery treats every icon as keep-by-default until Ariel marks it rejected. Rejections are stored in browser local storage under `eotfw:icon-review:v1` and can be copied or downloaded from the gallery as `eotfw_icon_review_rejects.json`.

The sidecar intentionally lists only rejected icons. Any icon omitted from the sidecar remains a candidate for later approval.

Current recorded decision:

- Total icons: 646
- Approved usable candidates: 643
- Rejected: 3
- Rejected IDs: `iconify:game-icons:chemical-arrow`, `iconify:game-icons:dice-fire`, `iconify:game-icons:fire-gem`

After changing the sidecar, run:

```powershell
python tools/intake_icons.py --apply-review --gallery --status
```

## Provenance And Licensing

OCHA icons are acquired from the MapAction OCHA Humanitarian Icons for GIS v2.1 SVG package. The manifest records OCHA as the origin and MapAction as the GIS/SVG package source. Suggested credit is recorded as `Source: OCHA & MapAction`.

Iconify icons are acquired at build time from the Iconify public API. Each manifest entry records the Iconify prefix, icon name, source URL, download URL, license title, SPDX value when available, attribution text, and matched search query.

CC0, MIT, and Apache-licensed icons are still recorded with provenance. CC-BY, OFL, unknown, or other licenses are flagged in the gallery before any product use.
