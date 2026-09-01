# TOOLS.md
> Complete inventory of languages, runtimes, CLI tools, libraries and helper
> commands installed by the Dockerfile **and** `.codex/setup.sh`.

---

## 1 · Base APT Packages

The image begins on **Ubuntu 24.04** and installs these core packages:

| Category | Packages |
|----------|----------|
| Build / tool-chain | `build-essential` · `binutils` · `make` · `pkg-config` · `cmake` · `ccache` |
| VCS / DevOps | `git` · `git-lfs` · `bzr` · `rsync` |
| Networking | `curl` · `wget` · `dnsutils` · `iputils-ping` · `netcat-openbsd` · `openssh-client` · `jq` |
| Compression / archive | `unzip` · `zip` · `xz-utils` · `zlib1g` · `zlib1g-dev` |
| Text / search | `gettext` · `ripgrep` · `moreutils` · `less` · `html2text` · `vim-common` |
| Misc CLI | `sudo` · `inotify-tools` · `software-properties-common` · `tzdata` |
| Browsers (tty) | `w3m` · `lynx` · `elinks` · `links` |

### Extra dev libraries (C/C++ headers, DB, SSL, etc.)

`libbz2-dev` · `libcurl4-openssl-dev` · `libdb-dev` · `libedit2` · `libffi-dev` ·  
`libgdbm-compat-dev` · `libgdbm-dev` · `libgdiplus` · `libgssapi-krb5-2` ·  
`liblzma-dev` · `libncurses-dev` · `libncursesw5-dev` · `libnss3-dev` ·  
`libpq-dev` · `libpsl-dev` · `libreadline-dev` · `libsqlite3-dev` ·  
`libssl-dev` · `libunwind8` · `libuuid1` · `uuid-dev` · `libxml2-dev` ·  
`libz3-dev` · `unixodbc-dev` · _and ICU picked dynamically via `apt-cache`._

### Runtime libs for Godot GUI / audio

`libvulkan1` · `mesa-vulkan-drivers` · `libgl1` · `libglu1-mesa` ·  
`libxi6` · `libxrandr2` · `libxinerama1` · `libxcursor1` · `libx11-6` ·  
`libasound2t64` · `libpulse0`

---

## 2 · Language / Runtime Tool-chains

| Language | Installed via | Versions & Commands |
|----------|---------------|---------------------|
| **Python** | `pyenv` + `pipx` | 3.10 · **3.11.12 (global)** · 3.12 · 3.13<br/>Global CLI: `python`, `pip`, **`poetry`**, **`uv`**<br/>Per-version dev deps: `ruff`, `black`, `mypy`, `pyright`, `isort` |
| **Node.js** | `nvm` | Node 18, 20, **22** (default) & `corepack`<br/>Global: `npm`, `yarn`, `pnpm`, `prettier`, `eslint`, `typescript` |
| **Bun** | direct ZIP | `bun` 1.2.14 |
| **.NET** | MS apt repo + `.codex/setup.sh` | SDK **8.0** (includes matching runtime) → command `dotnet` |
| **Godot-mono** | official GitHub release ZIP | Godot **4.7.2-stable (mono)** → command `godot` |
| **Java** | Ubuntu OpenJDK | JDK **21** + **Gradle 8.14** (`gradle`) |
| **Swift** | `swiftly` | Swift **6.1** (`swift`, `swiftc`) |
| **Ruby** | `ruby-full` | System Ruby (`ruby`, `gem`, `irb`) |
| **Rust** | `rustup` | Latest stable tool-chain (`cargo`, `rustc`) |
| **Go** | manual tarball | **1.23.8** → commands `go`, `gofmt` |
| **Bazel** | Bazelisk | `bazel` (via wrapper `bazelisk`) |
| **LLVM / Clang** | llvm.sh script | Full LLVM tool-suite (`clang`, `lld`, etc.) |

---

## 3 · Polyglot Dev Helpers

| Tool | How | Command(s) |
|------|-----|------------|
| **GDToolkit** | `pip3 install gdtoolkit` | `gdformat`, `gdlint` |
| **pre-commit** | `pip3 install pre-commit` | `pre-commit` (hooks auto-installed) |
| **protobuf-compiler** | apt | `protoc` |
| **bazelisk** | GitHub release | `bazel`, `bazelisk` |
| **icu** | apt helper | newest `libicuXX` at build time |

---

## 4 · User-facing Entry & Helper Scripts

| Path | Purpose |
|------|---------|
| `/opt/codex/setup_universal.sh` | extra project-specific bootstrap (copied in Dockerfile) |
| `/opt/entrypoint.sh` | **ENTRYPOINT** for container runs |
| `.codex/setup.sh` | full Codex/CI Godot-mono + .NET + GDToolkit provisioning |
| `.chatgpt/setup.sh` | lightweight ChatGPT sandbox bootstrap for standard Godot/GDScript validation |

---

## 5 · Commands Added by `.codex/setup.sh`

1. **`retry`** — small bash function for retry/back-off  
2. **`pick_icu`** — helper to grab latest ICU runtime package name  
3. **`godot_import_pass`** — wrapper that:
   - runs `godot --headless --editor --import`
   - exits gracefully if no Godot project is present

These helpers live only in the CI container lifetime but are part of the tooling surface.

---

## 6 · Paths & Environment

| Variable | Value |
|----------|-------|
| `GODOT_REPO` | `godotengine/godot` |
| `GODOT_TAG` | empty by default; explicit tags such as `4.7.2-stable` override version/channel |
| `GODOT_VERSION` | `4.7.2` |
| `GODOT_CHANNEL` | `stable` |
| `GODOT_ARCH` | `auto` (or `x86_64`, `x86_32`, `arm64`, `arm32`) |
| `GODOT_DIR` | `/opt/godot-mono/${GODOT_TAG}` |
| `GODOT_BIN` | `${GODOT_DIR}/Godot_v${GODOT_TAG}_mono_linux.${GODOT_ARCH}` |
| `DOTNET_SDK_MAJOR` | `8.0` |
| `ONLINE_DOCS_URL` | https://docs.godotengine.org/en/stable/ |
| `UV_NO_PROGRESS` | `1` (quiets `uv` output during installs) |

### ChatGPT sandbox defaults

`.chatgpt/setup.sh` intentionally avoids system-wide installation and defaults to:

- `TOOL_ROOT=/mnt/data/.chatgpt-tools`
- `CACHE_ROOT=/mnt/data/.cache/godot`
- standard (non-Mono) Godot `4.7.2-stable`
- staged ZIP reuse before any network attempt
- no .NET, GDToolkit, pre-commit, GUI/audio APT stack, or `/usr/local/bin` mutation

---

### ✅ That’s every tool, library, runtime and helper command delivered by the Dockerfile and the two Godot bootstrap scripts. Keep this file as the one-stop reference for contributors and CI.
