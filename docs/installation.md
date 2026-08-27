# Installation

SWE Forge is a harness-agnostic workflow with a portable canonical repository.
Keep one stable checkout as source of truth and install user-level harness
projections as links to it. Projects are operated on, not installed into.
Installation availability, support tier, and real-harness validation are
separate.

## Commands

The dependency-free installer uses the user's home directory and handles one
harness per invocation:

```bash
scripts/swe-forge version
scripts/swe-forge install <harness>
scripts/swe-forge verify <harness>
scripts/swe-forge status <harness>
scripts/swe-forge doctor <harness>
scripts/swe-forge update <harness>
scripts/swe-forge uninstall <harness>
```

Install Bun for the typed canonical tools and delegated workers. Harnesses are
`opencode`, `omp`, `claude`, `codex`, `cursor`, and `pi`. Links reflect reviewed
source changes. See [compatibility](compatibility.md) for tiers and evidence.

## Source checkout

After the planned first alpha is published, use a tagged stable checkout:

```bash
# Only after the v0.1.0-alpha.1 tag and release are published:
git clone --branch v0.1.0-alpha.1 --depth 1 \
  https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
```

Before publication, use a development clone; do not claim the tag is available.
A personal checkout may follow `main`, but public installations should use a
release tag.

Install each desired harness explicitly:

```bash
scripts/swe-forge install opencode
scripts/swe-forge install omp
scripts/swe-forge install claude
scripts/swe-forge install codex
scripts/swe-forge install cursor
scripts/swe-forge install pi
```

The installer does not modify harness settings, permissions, models,
credentials, or personal/project configuration. Harness project configuration is
separate.

## Projection locations

| Harness | Entry points | Canonical support link |
| --- | --- | --- |
| OpenCode | `~/.config/opencode/commands/` | `~/.config/opencode/swe-forge/` |
| OMP | `~/.omp/agent/prompts/`, `~/.omp/agent/extensions/`, `~/.omp/agent/agents/` | `~/.omp/agent/swe-forge/` |
| Claude Code | `~/.claude/skills/swe-forge/` | `~/.claude/swe-forge/` |
| Codex | `~/.agents/skills/swe-forge/` | `~/.agents/swe-forge/` |
| Cursor | `~/.agents/skills/swe-forge/` | `~/.agents/swe-forge/` |
| Pi | `~/.pi/agent/prompts/`, `~/.pi/agent/extensions/` | `~/.pi/agent/swe-forge/` |

Codex and Cursor share the Agent Skill projection. There is no multi-harness
install command.

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
The package adds bounded child-agent capability when routing selects
`SUBAGENTS`; otherwise Forge uses `SOLO`/sequential. The main installer does
not install it. It is not published to npm; use a reviewed local source path:

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

`version` reports release, source commit, and tree state. `status` reports
source, harness, managed paths, and verification; `doctor` adds remediation.
Use `--dry-run` with `install` or `update` for preflight/conflict checks without
creating a lock, link, directory, or manifest:

```bash
scripts/swe-forge install opencode --dry-run
scripts/swe-forge update opencode --dry-run
```

Successful installation records an exact manifest at
`~/.swe-forge-install-state/<harness>.tsv`, including source revision and every
managed link. `update` restores missing links, relinks changed source
projections, removes stale managed links, and refuses modified or ambiguous
entries. `uninstall` removes only links matching the manifest and refuses
modified entries. Shared support links remain while another harness owns them.

Without a current manifest, `verify`, `status`, and `doctor` can inspect an
installation; `update` and `uninstall` refuse it until recreated. Obsolete
pre-alpha project or copied installations are not managed; review them before
recreating a supported installation.

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

For development, fetch and review source changes manually. For a pinned public
installation, review a newer release tag first:

1. update the stable source checkout;
2. run `scripts/swe-forge version`;
3. run `status`, `doctor`, and `verify <harness>`;
4. run `scripts/swe-forge update <harness>`; and
5. review activation, contracts, policies, and adapter changes.

`update` never fetches, switches branches, or publishes. Keep temporary run
state outside the repository or under ignored `.swe-forge/runs/`.

## Filesystem safety

The installer rejects symlinked directories beneath the user home, serializes
cooperating installs with a home-level lock, and rolls back links/directories it
created after failure. It does not remove or restore pre-existing entries;
conflicts stop before links are written.

Portable POSIX shell cannot provide descriptor-relative no-follow operations.
Do not install under a hierarchy concurrently controlled by an untrusted
process. Remove a stale `.swe-forge-install.lock` only after confirming no
installation is active.
