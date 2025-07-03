#!/usr/bin/env bash
# setup_script.sh — reproducible CI setup for Godot-mono + .NET + GDToolkit
# The goal is to spin up “just enough” tooling, warm Godot’s import cache,
# and then get out of the way.  All heavy-hitters can be toggled off.

set -euo pipefail

################################################################################
# User-tweakable switches (export before running to override)               ####
################################################################################
: "${INSTALL_DOTNET:=1}"        # 1 → install the .NET SDK/runtime, 0 → skip
: "${INSTALL_GODOT:=1}"         # 1 → download & cache Godot-mono, 0 → skip
: "${VERBOSE_IMPORT:=1}"        # 1 → echo “warming cache…” messages
: "${GODOT_VERSION:=4.4.1}"     # which Godot-mono release to use
: "${GODOT_CHANNEL:=stable}"    # “stable”, “rc”, etc.
: "${DOTNET_SDK_MAJOR:=8.0}"    # .NET major version (used only if enabled)

################################################################################
# Package lists (trim or append as you wish)                               ####
################################################################################
# Day-to-day CLI utilities
BASIC_PACKAGES=(
  unzip wget curl git
  python3 python3-pip
  ca-certificates gnupg lsb-release software-properties-common
  binutils util-linux bsdextrautils xxd less
  w3m lynx elinks links html2text vim-common
)

# Runtime libs Godot needs in a headless container
pick_icu()   { apt-cache --names-only search '^libicu[0-9]\+$' | awk '{print $1}' | sort -V | tail -1; }
pick_asound(){ apt-cache --names-only search '^libasound2'       | awk '{print $1}' | sort -V | head -1; }

RUNTIME_LIBS=(
  "$(pick_icu)"
  libvulkan1 mesa-vulkan-drivers
  libgl1 libglu1-mesa
  libxi6 libxrandr2 libxinerama1 libxcursor1 libx11-6
  "$(pick_asound)" libpulse0
)

################################################################################
# Derived constants – rarely changed                                        ####
################################################################################
GODOT_DIR="/opt/godot-mono/${GODOT_VERSION}"
GODOT_BIN="${GODOT_DIR}/Godot_v${GODOT_VERSION}-${GODOT_CHANNEL}_mono_linux.x86_64"
ONLINE_DOCS_URL="https://docs.godotengine.org/en/stable/"

################################################################################
# Small helper functions                                                    ####
################################################################################
retry() {                       # retry <count> <cmd …>
  local n=$1 d=2 a=1; shift
  while true; do "$@" && break || {
    (( a++ > n )) && return 1
    echo "↻  retry $((a-1))/$n: $*" >&2; sleep $d
  }; done
}

# Warm the .import cache – NEW: doesn’t fail if no Godot project present
godot_import_pass() {
  [[ "$INSTALL_GODOT" == 0 ]] && return            # nothing to do
  # --- NEW -------------------------------------------------------------------
  if [[ ! -f project.godot && ! -f engine.cfg ]]; then
    (( VERBOSE_IMPORT )) && echo '⚠️  No Godot project found – skipping cache warm-up.'
    return 0
  fi
  # ---------------------------------------------------------------------------
  (( VERBOSE_IMPORT )) && echo '🔄  Warming Godot import cache (headless)…'
  if ! retry 3 godot --headless --editor --import --quiet --quit --path .; then
    echo '⚠️  Godot import failed; continuing anyway.' >&2
  fi
  (( VERBOSE_IMPORT )) && echo '   …done.'
}

################################################################################
# 1 · Base OS packages                                                      ####
################################################################################
echo '🔄  apt update …'
retry 5 apt-get update -y -qq

echo '📦  Installing basics …'
retry 5 apt-get install -y --no-install-recommends "${BASIC_PACKAGES[@]}"

################################################################################
# 2 · Godot runtime dependencies                                            ####
################################################################################
if [[ "$INSTALL_GODOT" == 1 ]]; then
  echo '📦  Ensuring Godot runtime libraries …'
  retry 5 apt-get install -y --no-install-recommends \
        $(printf '%s\n' "${RUNTIME_LIBS[@]}" | grep -v '^$')
fi

################################################################################
# 3 · .NET SDK (optional)                                                   ####
################################################################################
if [[ "$INSTALL_DOTNET" == 1 && ! $(command -v dotnet) ]]; then
  echo "⬇️  Installing .NET SDK ${DOTNET_SDK_MAJOR} …"
  install -d /etc/apt/keyrings
  retry 3 curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
         | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/microsoft.gpg] \
https://packages.microsoft.com/debian/12/prod bookworm main" \
  > /etc/apt/sources.list.d/microsoft.list
  retry 5 apt-get update -y -qq
  retry 5 apt-get install -y --no-install-recommends \
          "dotnet-sdk-${DOTNET_SDK_MAJOR}" "dotnet-runtime-${DOTNET_SDK_MAJOR}"
fi

################################################################################
# 4 · Godot-mono (optional)                                                 ####
################################################################################
if [[ "$INSTALL_GODOT" == 1 && ! -x "$GODOT_BIN" ]]; then
  echo "⬇️  Fetching Godot-mono ${GODOT_VERSION}-${GODOT_CHANNEL} …"
  tmp="$(mktemp -d)"
  zip="Godot_v${GODOT_VERSION}-${GODOT_CHANNEL}_mono_linux_x86_64.zip"
  url="https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-${GODOT_CHANNEL}/${zip}"
  retry 5 wget -q --show-progress -O "${tmp}/${zip}" "$url"
  unzip -q "${tmp}/${zip}" -d "${tmp}"
  install -d "$GODOT_DIR"
  mv "${tmp}/Godot_v${GODOT_VERSION}-${GODOT_CHANNEL}_mono_linux_x86_64"/{GodotSharp,"Godot_v${GODOT_VERSION}-${GODOT_CHANNEL}_mono_linux.x86_64"} "$GODOT_DIR"
  ln -sf "$GODOT_BIN" /usr/local/bin/godot
  chmod +x /usr/local/bin/godot
  rm -rf "$tmp"
  echo "✔️  Godot-mono installed → /usr/local/bin/godot"
fi

################################################################################
# 5 · GDToolkit + pre-commit                                               ####
################################################################################
echo '🐍  Installing GDToolkit & pre-commit …'
retry 5 pip3 install --no-cache-dir --upgrade 'gdtoolkit==4.*' 'pre-commit>=4.2,<5'

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo '🔧  Installing pre-commit hooks …'
  retry 3 pre-commit install --install-hooks
fi

################################################################################
# 6 · Sanity check + cache warm-up                                          ####
################################################################################
MANDATORY_CMDS=(git curl wget unzip python3 pip3 gdformat gdlint)
[[ "$INSTALL_DOTNET" == 1 ]] && MANDATORY_CMDS+=(dotnet)
[[ "$INSTALL_GODOT"  == 1 ]] && MANDATORY_CMDS+=(godot)

for cmd in "${MANDATORY_CMDS[@]}"; do
  command -v "$cmd" >/dev/null || { echo "❌  $cmd missing"; exit 1; }
done

echo -e '\n✅  Base setup complete!'
set +x
printf "♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥\n"
printf "♥███████████████████♥\n"
printf "♥███████████████████♥\n"
printf "♥████♥ Protect ♥████♥\n"
printf "♥████♥ Trans   ♥████♥\n"
printf "♥████♥ Kids    ♥████♥\n"
printf "♥███████████████████♥\n"
printf "♥███████████████████♥\n"
printf "♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥\n"
set -x
[[ "$INSTALL_GODOT" == 1 ]]  && echo " • Godot-mono: $(command -v godot)"
[[ "$INSTALL_DOTNET" == 1 ]] && echo " • .NET SDK:    $(command -v dotnet)"
echo " • Docs:        ${ONLINE_DOCS_URL} (offline fetch disabled)"

godot_import_pass   # no-op when INSTALL_GODOT=0 or no project found
echo '✅  Done.'
