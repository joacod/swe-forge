# Installation

SWE Forge is a portable repository first. Keep one stable checkout as the
source of truth and install the requested harness projection as links back to
that checkout. Projects are repositories SWE Forge operates on; SWE Forge is
not installed into them.

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

Supported harness names are `opencode`, `claude`, `codex`, `cursor`, and `pi`.
Installation is link-based, so a reviewed update to this checkout is reflected
in the installed projection. The user-level link model is the only supported
installation path.

## Recommended installation

After the planned first alpha tag and release are published, keep a tagged
source checkout at a stable path:

```bash
# Use only after the v0.1.0-alpha.1 tag and release are published:
git clone --branch v0.1.0-alpha.1 --depth 1 \
  https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
```

Before publication, use a development clone without claiming that the tag is
downloadable. A personal checkout may follow `main`, but public installations
should use a release tag.

Install the harnesses you use explicitly:

```bash
scripts/swe-forge install opencode
scripts/swe-forge install claude
scripts/swe-forge install codex
scripts/swe-forge install cursor
scripts/swe-forge install pi
```

The installer does not modify harness settings, permissions, models,
credentials, or other personal configuration. A harness may still support
project-specific configuration; that configuration is separate from the SWE
Forge installation.

## Harness locations

Each projection points to the stable checkout while keeping the harness entry
at its normal user-level location:

| Harness | Entry points | Canonical support link |
| --- | --- | --- |
| OpenCode | `~/.config/opencode/commands/` | `~/.config/opencode/swe-forge/` |
| Claude Code | `~/.claude/skills/swe-forge/` | `~/.claude/swe-forge/` |
| Codex | `~/.agents/skills/swe-forge/` | `~/.agents/swe-forge/` |
| Cursor | `~/.agents/skills/swe-forge/` | `~/.agents/swe-forge/` |
| Pi | `~/.pi/agent/prompts/`, `~/.pi/agent/extensions/` | `~/.pi/agent/swe-forge/` |

Codex and Cursor intentionally share the Agent Skill projection. Install each
harness only when it is needed; there is no multi-harness install command.

### Optional Pi SUBAGENTS backend

The standard Pi bridge is sufficient for normal SWE Forge usage. The optional
`swe_forge_subagent` package only adds the bounded child-agent capability used
when canonical routing selects `SUBAGENTS`; without it, SWE Forge keeps its
SOLO/sequential fallback. The main installer does not install this executable
extension or make it a hidden dependency.

The package is not published to npm yet. Until then, use a local source-path
installation. A fresh setup needs both repositories:

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

If SWE Forge is already cloned and installed, skip its clone and installer
command. If only the optional package is missing, clone that repository, run
`npm ci` inside it, and run `pi install /absolute/path/to/swe-forge-pi-subagents`.
The package requires Node.js `>=22.19.0`; review it before trusting a Pi
package because packages run with the user's full permissions.

Restart Pi or run `/reload` after installation. Confirm the optional package
with:

```bash
pi list
```

When an npm release becomes available, replace the package clone and local-path
install with:

```bash
pi install npm:swe-forge-pi-subagents@<version>
```

The main SWE Forge installation remains required because the optional package
reads the canonical support root from `~/.pi/agent/swe-forge/`.

## Lifecycle commands

`version` reports the release version, source commit, and source-tree state.
`status` reports the source, harness, managed manifest, paths, and verification
result. `doctor` adds remediation-oriented diagnostics.

Use `--dry-run` with `install` or `update` to perform preflight and conflict
checks without creating a lock, link, directory, or manifest:

```bash
scripts/swe-forge install opencode --dry-run
scripts/swe-forge update opencode --dry-run
```

Each successful installation records an exact managed manifest under
`~/.swe-forge-install-state/<harness>.tsv`. The manifest records the source
revision and every managed link. `update` restores missing links, relinks an
unchanged managed link when its source projection changes, removes stale
managed links, and refuses modified or ambiguous entries. `uninstall` removes
only links that still match the recorded target and refuses modified entries.
Shared canonical support links remain while another installed harness owns the
same path.

An installation without a current manifest can still be inspected with
`verify`, `status`, and `doctor`. `update` and `uninstall` refuse it until the
installation is reviewed and recreated. Obsolete project or copied
installations from earlier pre-alpha versions are not managed by the current
installer; review those files manually before recreating a supported
installation.

## Verification and first use

Installation verifies automatically. It can also be run later:

```bash
scripts/swe-forge verify opencode
scripts/swe-forge verify claude
scripts/swe-forge verify codex
scripts/swe-forge verify cursor
scripts/swe-forge verify pi
```

Verification checks the canonical files, source links, harness locations,
adapter references, and dangling links. After a successful filesystem check,
run a small explicit harness invocation:

```text
/swe-forge <small test ticket>
```

For Codex, invoke the installed skill explicitly:

```text
$swe-forge <small test ticket>
```

Ordinary prompts continue to behave normally; SWE Forge remains explicitly
invoked.

## Updating the source and installed projections

For a development checkout, review and fetch source changes manually. For a
pinned public installation, choose and review a newer release tag first:

1. update the stable source checkout explicitly
2. run `scripts/swe-forge version`
3. run `status`, `doctor`, and `verify <harness>` for each installation
4. run `scripts/swe-forge update <harness>`
5. review changes to activation, contracts, policies, and adapters
6. run the repository's structural and documentation checks

`update` never fetches, switches branches, or publishes changes. Keep temporary
run state outside the repository or under ignored `.swe-forge/runs/`.

## Filesystem safety

The installer rejects symlinked directories beneath the user home hierarchy,
serializes cooperating installs with a home-level lock, and rolls back links
and directories created by a failed run. It does not remove or restore
pre-existing entries. Conflicts stop before any installation link is written.

Portable POSIX shell cannot provide descriptor-relative no-follow operations, so
do not install into a hierarchy concurrently controlled by an untrusted
process. A stale `.swe-forge-install.lock` may be removed only after confirming
that no installation is active.
