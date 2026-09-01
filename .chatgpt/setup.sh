#!/usr/bin/env bash
# setup.sh — lightweight Godot bootstrap for ChatGPT Linux sandboxes
#
# Design goals:
#   * optimize for ephemeral Debian/Ubuntu containers where shell egress may be
#     blocked even though the host can stage external files;
#   * install only the standard Godot editor/runtime needed for GDScript checks;
#   * keep all writable state under /mnt/data instead of modifying /opt, /etc,
#     or /usr/local;
#   * reuse an already-installed binary, an extracted cache, or a staged ZIP
#     before attempting any download;
#   * avoid .NET/Mono, GDToolkit, pre-commit, GUI/audio packages, and APT unless
#     a project actually needs those separate tools.
#
# Typical ChatGPT flow:
#   1. Stage the official Godot ZIP at /mnt/data/<zip-name> using the host's
#      controlled downloader.
#   2. Run: bash .chatgpt/setup.sh
#   3. Use: /mnt/data/.chatgpt-tools/bin/godot --headless ...

set -euo pipefail

################################################################################
# User-tweakable settings                                                   ####
################################################################################
: "${GODOT_TAG:=4.7.2-stable}"
: "${GODOT_ARCH:=auto}"                  # auto | x86_64 | x86_32 | arm64 | arm32
: "${PROJECT_DIR:=$PWD}"
: "${TOOL_ROOT:=/mnt/data/.chatgpt-tools}"
: "${CACHE_ROOT:=/mnt/data/.cache/godot}"
: "${GODOT_ZIP_PATH:=}"                 # explicit pre-staged ZIP, if any
: "${ALLOW_NETWORK_DOWNLOAD:=auto}"      # auto | 0 | 1
: "${WARM_IMPORT_CACHE:=1}"              # 1 → import project after install

# Official SHA-256 for the default 4.7.2-stable Linux x86_64 standard build.
# Other versions/architectures can supply GODOT_ZIP_SHA256 explicitly.
: "${GODOT_ZIP_SHA256:=}"

################################################################################
# Helpers                                                                    ####
################################################################################
die() {
  echo "❌  $*" >&2
  exit 1
}

note() {
  echo "• $*"
}

detect_godot_arch() {
  case "$(uname -m 2>/dev/null || true)" in
    x86_64|amd64) echo "x86_64" ;;
    i386|i686) echo "x86_32" ;;
    aarch64|arm64) echo "arm64" ;;
    armv7l|armv6l) echo "arm32" ;;
    *) die "Unsupported CPU architecture: $(uname -m 2>/dev/null || echo unknown)" ;;
  esac
}

network_available() {
  command -v curl >/dev/null 2>&1 || return 1
  curl -fsSI --max-time 4 https://github.com >/dev/null 2>&1
}

matches_requested_version() {
  local bin="$1"
  local wanted="${GODOT_TAG%%-*}"
  [[ -x "$bin" ]] || return 1
  "$bin" --version 2>/dev/null | grep -q "^${wanted}"
}

################################################################################
# Resolve paths                                                              ####
################################################################################
[[ "$GODOT_ARCH" == "auto" ]] && GODOT_ARCH="$(detect_godot_arch)"

GODOT_ZIP="Godot_v${GODOT_TAG}_linux.${GODOT_ARCH}.zip"
GODOT_EXE="Godot_v${GODOT_TAG}_linux.${GODOT_ARCH}"
INSTALL_DIR="${TOOL_ROOT}/godot/${GODOT_TAG}/${GODOT_ARCH}"
GODOT_BIN="${INSTALL_DIR}/${GODOT_EXE}"
BIN_DIR="${TOOL_ROOT}/bin"
CACHE_ZIP="${CACHE_ROOT}/${GODOT_ZIP}"
DOWNLOAD_URL="https://github.com/godotengine/godot/releases/download/${GODOT_TAG}/${GODOT_ZIP}"

if [[ -z "$GODOT_ZIP_SHA256" && "$GODOT_TAG" == "4.7.2-stable" && "$GODOT_ARCH" == "x86_64" ]]; then
  GODOT_ZIP_SHA256="cadd3204e728a35d3f13adb7fd0d7902636b79f6b95c40c265eb73b6c35329e4"
fi

mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$CACHE_ROOT"

################################################################################
# Reuse first: system Godot, extracted cache, then staged ZIP                ####
################################################################################
if command -v godot >/dev/null 2>&1 && matches_requested_version "$(command -v godot)"; then
  SYSTEM_GODOT="$(command -v godot)"
  ln -sfn "$SYSTEM_GODOT" "${BIN_DIR}/godot"
  GODOT_BIN="$SYSTEM_GODOT"
  note "Reusing existing Godot: $GODOT_BIN"
elif matches_requested_version "$GODOT_BIN"; then
  ln -sfn "$GODOT_BIN" "${BIN_DIR}/godot"
  note "Reusing cached Godot: $GODOT_BIN"
else
  ZIP_SOURCE=""

  if [[ -n "$GODOT_ZIP_PATH" ]]; then
    [[ -f "$GODOT_ZIP_PATH" ]] || die "GODOT_ZIP_PATH does not exist: $GODOT_ZIP_PATH"
    ZIP_SOURCE="$GODOT_ZIP_PATH"
  else
    for candidate in \
      "$CACHE_ZIP" \
      "/mnt/data/${GODOT_ZIP}" \
      "${PROJECT_DIR}/${GODOT_ZIP}"; do
      if [[ -f "$candidate" ]]; then
        ZIP_SOURCE="$candidate"
        break
      fi
    done
  fi

  if [[ -z "$ZIP_SOURCE" ]]; then
    CAN_DOWNLOAD=0
    case "$ALLOW_NETWORK_DOWNLOAD" in
      1) CAN_DOWNLOAD=1 ;;
      0) CAN_DOWNLOAD=0 ;;
      auto)
        if network_available; then CAN_DOWNLOAD=1; fi
        ;;
      *) die "ALLOW_NETWORK_DOWNLOAD must be auto, 0, or 1" ;;
    esac

    if [[ "$CAN_DOWNLOAD" == 1 ]]; then
      note "Downloading ${GODOT_ZIP} into the reusable sandbox cache …"
      curl -fL --retry 3 --retry-all-errors -o "$CACHE_ZIP" "$DOWNLOAD_URL"
      ZIP_SOURCE="$CACHE_ZIP"
    else
      cat >&2 <<MSG
❌  Godot is not installed and shell network access is unavailable.

Stage this official release ZIP with the ChatGPT host downloader, then rerun:
  ${DOWNLOAD_URL}

Expected destination:
  /mnt/data/${GODOT_ZIP}

Or point directly to another staged copy:
  GODOT_ZIP_PATH=/path/to/${GODOT_ZIP} bash .chatgpt/setup.sh
MSG
      exit 2
    fi
  fi

  if [[ -n "$GODOT_ZIP_SHA256" ]]; then
    command -v sha256sum >/dev/null 2>&1 || die "sha256sum is required for checksum verification"
    ACTUAL_SHA256="$(sha256sum "$ZIP_SOURCE" | awk '{print $1}')"
    [[ "$ACTUAL_SHA256" == "$GODOT_ZIP_SHA256" ]] || \
      die "Godot ZIP checksum mismatch: expected ${GODOT_ZIP_SHA256}, got ${ACTUAL_SHA256}"
    note "Verified Godot ZIP SHA-256."
  else
    note "No checksum pinned for ${GODOT_TAG}/${GODOT_ARCH}; skipping checksum verification."
  fi

  command -v unzip >/dev/null 2>&1 || die "unzip is required but is not installed"
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  unzip -q "$ZIP_SOURCE" -d "$INSTALL_DIR"
  [[ -f "$GODOT_BIN" ]] || die "Expected Godot executable was not found after extraction: $GODOT_BIN"
  chmod +x "$GODOT_BIN"
  ln -sfn "$GODOT_BIN" "${BIN_DIR}/godot"
fi

################################################################################
# Sanity check and optional import                                           ####
################################################################################
"$GODOT_BIN" --version

if [[ "$WARM_IMPORT_CACHE" == 1 && -f "${PROJECT_DIR}/project.godot" ]]; then
  note "Warming Godot import cache for ${PROJECT_DIR} …"
  "$GODOT_BIN" --headless --editor --import --quit --path "$PROJECT_DIR"
elif [[ "$WARM_IMPORT_CACHE" == 1 ]]; then
  note "No project.godot in ${PROJECT_DIR}; skipping import warm-up."
fi

cat <<MSG

✅  ChatGPT Godot bootstrap complete.

Godot:
  ${GODOT_BIN}

Convenience wrapper:
  ${BIN_DIR}/godot

For this shell:
  export PATH="${BIN_DIR}:\$PATH"

Example verification:
  ${BIN_DIR}/godot --headless --editor --import --quit --path "${PROJECT_DIR}"
  ${BIN_DIR}/godot --headless --check-only --quit --path "${PROJECT_DIR}"
MSG
