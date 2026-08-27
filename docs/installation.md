# Installation

SWE Forge ships as a source checkout for development or a standalone executable
for users. Standalone installs use one active immutable canonical release;
source-checkout installs use the reviewed checkout directly. Projects are
operated on, not installed into. Installation availability, support tier, and
real-harness validation are separate.

## Commands

### Standalone release executable

A compiled release executable carries a validated canonical payload and has no
runtime npm dependencies. It installs and runs without a repository checkout,
Bun, Node.js, or Python:

```bash
./swe-forge --version
./swe-forge install <harness>
./swe-forge verify <harness>
./swe-forge status <harness>
./swe-forge doctor <harness>
./swe-forge update
./swe-forge uninstall <harness>
```

`install` and `update` activate the release represented by the running
executable. `update` reconciles every managed harness manifest; release
activation is global rather than harness-specific. Neither command downloads
updates.

The release flow targets macOS arm64 and Linux x64 using glibc; an artifact is
distributable only after its native clean-room gate passes. Windows, Linux
arm64, macOS x64, musl Linux, and other architectures are not claimed.

### Source-checkout developer mode

The Bun-based source-checkout installer handles one harness per invocation:

```bash
scripts/swe-forge --version
scripts/swe-forge install <harness>
scripts/swe-forge verify <harness>
scripts/swe-forge status <harness>
scripts/swe-forge doctor <harness>
scripts/swe-forge update <harness>
scripts/swe-forge uninstall <harness>
```

This mode requires Bun and runs the reviewed TypeScript checkout through
`src/install/cli.ts`. Checkout updates remain per-harness and do not activate
managed standalone releases. Runtime package dependencies remain zero.

Harnesses are `opencode`, `omp`, `claude`, `codex`, `cursor`, and `pi`. See
[compatibility](compatibility.md) for support tiers and evidence.

## Source-checkout developer mode

This section is for maintainers or users intentionally running a reviewed
checkout. It is not the standalone installation path. A local checkout can be
created with Git:

```bash
git clone https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
```

Until a release tag is published, `main` is development-only. After reviewing
the checkout, use the source-checkout commands above and install each desired
harness explicitly:

```bash
scripts/swe-forge install opencode
scripts/swe-forge install omp
scripts/swe-forge install claude
scripts/swe-forge install codex
scripts/swe-forge install cursor
scripts/swe-forge install pi
```

The installer does not modify harness settings, permissions, models,
credentials, or personal/project configuration. Harness project configuration
is separate.

## Bun global package

The package manifest exposes `swe-forge` as a Bun global command without
postinstall hooks or runtime npm dependencies. It intentionally runs
source-checkout mode and therefore requires Bun:

```bash
bun add --global swe-forge@<version>
swe-forge --version
```

The package name was checked as unclaimed in the public npm registry. This task
does not publish it. Until publication, use a checkout or a standalone
artifact.

## Standalone release lifecycle
The executable validates its embedded inventory, `VERSION`, and canonical
payload identity before materializing a release in the managed user-level root:

```text
$XDG_DATA_HOME/swe-forge/versions/<version>/canonical
```

`$XDG_DATA_HOME` defaults to `$HOME/.local/share` when unset. Activation
atomically updates the stable:

```text
$XDG_DATA_HOME/swe-forge/current -> versions/<version>
```

Harness projections and manifests target
`$XDG_DATA_HOME/swe-forge/current/canonical`; they never persist a direct
`versions/<version>` target. The standalone runtime pointer at
`$XDG_DATA_HOME/swe-forge-runtime` points to the executable that activated the
current release, allowing canonical tools to run without Bun, Node.js, or
Python.

Release directories are immutable after publication. Reinstalling the same
version verifies and reuses its exact contents; a failed harness projection
leaves the valid version available for retry. Older versions are retained and
are not garbage-collected automatically.

## Release artifacts

Maintainers build a target-specific artifact from a clean checkout:

```bash
bun run build:release -- --target bun-darwin-arm64
bun run build:release -- --target bun-linux-x64
```

The output directory is
`build/releases/v<version>/`. Each artifact is named
`swe-forge-v<version>-<platform>-<architecture>` and has:

- a `.json` metadata sidecar with the version, target, Bun version, source
  commit/tree state, asset count, artifact SHA-256, and embedded payload
  SHA-256;
- a `.sha256` sidecar in the standard `sha256  filename` format.

The builder uses tracked files, `VERSION`, an explicit Bun target, and no build
timestamp. Cross-target compilation may download Bun's target runtime; this is
maintainer build-time behavior, not standalone update behavior. The canonical
payload identity is deterministic for those inputs; Bun's compiled runtime may
still make the complete binary non-bit-identical between builds. Windows and
targets outside the support matrix are not built or claimed. Use
`scripts/test-standalone-release.ts` to validate an artifact before any manual
distribution.

The first alpha deliberately has no curl/bootstrap installer. Without an
externally published artifact URL and checksum manifest, a bootstrap would add
another distribution policy rather than simplify installation; revisit it
after the release channel exists.

## Projection locations

| Harness | Entry points | Canonical support link |
| --- | --- | --- |
| OpenCode | `~/.config/opencode/commands/` | `~/.config/opencode/swe-forge/` |
| OMP | `~/.omp/agent/prompts/`, `~/.omp/agent/extensions/`, `~/.omp/agent/agents/` | `~/.omp/agent/swe-forge/` |
| Claude Code | `~/.claude/skills/swe-forge/` | `~/.claude/swe-forge/` |
| Codex | `~/.agents/skills/swe-forge/` | `~/.agents/swe-forge/` |
| Cursor | `~/.agents/skills/swe-forge/` | `~/.agents/swe-forge/` |
| Pi | `~/.pi/agent/prompts/`, `~/.pi/agent/extensions/` | `~/.pi/agent/swe-forge/` |

Codex and Cursor share the Agent Skill projection. Install still handles one
harness at a time; standalone `update` is the only command that reconciles all
managed harness manifests.

### OMP native `SUBAGENTS`

The OMP adapter also links its runtime extension, prompt, three confined
profiles, and canonical support. It uses OMP's native `task`, per-task
`outputSchema`/strict output, and `task.batch`; no separate worker executor is
needed.

Read-only workers may batch when canonical routing permits. Writable results are
materialized and accepted sequentially in the canonical checkout. Missing or
incompatible capabilities use visible `SOLO`/sequential fallback. OMP delegated
sessions are headless; profile confinement and root-owned delivery authorization
remain the boundary, not an interactive approval prompt. The adapter does not
change OMP settings or project configuration. See the [OMP adapter](../.swe-forge/adapters/omp/README.md).

### Optional Pi `SUBAGENTS`

The standard Pi bridge works without the optional `swe_forge_subagent` package.
The standalone executable does not download or install that package. It adds
bounded child-agent capability when routing selects `SUBAGENTS`; otherwise
Forge uses `SOLO`/sequential. The main installer does not install it. It is
not published to npm; use a reviewed local source path:
```bash
SWE_FORGE_DIR="$HOME/tools/swe-forge"
SUBAGENTS_DIR="$HOME/tools/swe-forge-pi-subagents"

mkdir -p "$HOME/tools"
git clone https://github.com/joacod/swe-forge.git "$SWE_FORGE_DIR"
git clone https://github.com/joacod/swe-forge-pi-subagents.git "$SUBAGENTS_DIR"

"$SWE_FORGE_DIR/scripts/swe-forge" install pi
(
  cd "$SUBAGENTS_DIR"
  npm ci
)
pi install "$SUBAGENTS_DIR"
```

If Forge is already cloned and installed, skip its clone and installer. If only
the package is missing, clone it, run `npm ci`, and install
`pi install /absolute/path/to/swe-forge-pi-subagents`. It requires Node.js
`>=22.19.0`; review it before trusting a package with full user permissions.

Restart Pi or run `/reload`, then check:

```bash
pi list
```

When an npm release exists, use:

```bash
pi install npm:swe-forge-pi-subagents@<version>
```

The main Forge installation remains required because the package reads
`~/.pi/agent/swe-forge/`.

## Lifecycle and manifests

`version` and `--version` report release identity; source-checkout mode also
reports commit and tree state. `status` reports source, harness, managed paths,
and verification. `doctor` adds remediation.

Source-checkout dry runs preserve their per-harness interface:

```bash
scripts/swe-forge install opencode --dry-run
scripts/swe-forge update opencode --dry-run
```

Standalone dry runs use a temporary materialized release and do not change the
managed data root:

```bash
./swe-forge install opencode --dry-run
./swe-forge update --dry-run
```

Successful installation records an exact manifest at
`~/.swe-forge-install-state/<harness>.tsv`, including source revision and every
managed link. In standalone mode, each manifest's logical `source_root` is
`$XDG_DATA_HOME/swe-forge/current/canonical`; the physical link resolves to the
active immutable version. Source-checkout `update <harness>` reconciles only
that harness. Standalone `update` activates its running release and reconciles
every managed harness.

Both modes restore missing links, relink changed source projections, remove
stale managed links, and refuse modified or ambiguous entries. `uninstall`
removes only links matching the manifest and refuses modified entries. Shared
support links remain while another harness owns them. Without a current
manifest, `verify`, `status`, and `doctor` can inspect an installation;
`update` and `uninstall` refuse it until recreated.

## Verify and first use

Installation verifies automatically and can be repeated:

```bash
scripts/swe-forge verify opencode
scripts/swe-forge verify omp
scripts/swe-forge verify claude
scripts/swe-forge verify codex
scripts/swe-forge verify cursor
scripts/swe-forge verify pi
```

Verification checks canonical files, source links, locations, adapter
references, and dangling links. It is projection evidence, not real harness
validation. For a harness you will exercise, run a small explicit invocation:

```text
/swe-forge <small test ticket>
```

For Codex:

```text
$swe-forge <small test ticket>
```

Ordinary prompts remain ordinary.

## Update

For a standalone release executable, review the artifact and activation:

1. run `./swe-forge --version` and `./swe-forge payload inspect`;
2. verify the artifact's `.sha256` sidecar;
3. run `./swe-forge update --dry-run`; and
4. run `./swe-forge update`.

This activates the running executable's validated release globally and
reconciles every managed harness manifest. It does not fetch, switch branches,
contact a registry, publish, or garbage-collect older immutable versions.

For a source checkout, fetch and review source changes manually, then run
`scripts/swe-forge --version`, `status`, `doctor`, and
`verify <harness>` before `scripts/swe-forge update <harness>`. Source-checkout
update remains per-harness and does not activate managed standalone releases.

Keep temporary run state outside the repository or under ignored
`.swe-forge/runs/`.

## Filesystem safety

The installer uses host filesystem APIs. Checkout mode runs them through Bun;
standalone mode carries the runtime in the executable. Both reject symlinked
directories beneath the user home, serialize cooperating installs with a
home-level lock, and roll back links/directories they created after failure.
They do not remove or restore pre-existing entries; conflicts stop before links
are written.

Path-based filesystem operations cannot provide descriptor-relative no-follow
semantics. Do not install under a hierarchy concurrently controlled by an
untrusted process. Remove a stale `.swe-forge-install.lock` only after
confirming no installation is active.
