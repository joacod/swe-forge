# Installation

SWE Forge is a portable repository first. Keep one stable clone as the source
of truth and install links to that checkout. Installation into another project
or global harness configuration is always an explicit user action.

The repository includes a dependency-free installer. The first alpha tag
`v0.1.0-alpha.1` is reserved but not currently published; use a `main` checkout
only for personal development until the tag is available:

```bash
scripts/swe-forge version
scripts/swe-forge install <opencode|claude|codex|cursor|pi> [options]
scripts/swe-forge verify <opencode|claude|codex|cursor|pi> [options]
scripts/swe-forge status <harness> [options]
scripts/swe-forge doctor <harness> [options]
scripts/swe-forge update <harness> [options]
scripts/swe-forge uninstall <harness> [options]
```

The default mode is `link`. A link installation follows changes in this
checkout after `git pull`. Use `--mode copy` only when a self-contained snapshot
is more important than automatic updates.

`--target` always means the exact existing directory supplied. The installer
does not widen a nested folder to its enclosing Git root. Global installation is
link-only; `--global --mode copy` is rejected.

If no target is supplied from an interactive terminal, the installer asks for a
repository, folder, or `global`. Non-interactive callers must use `--target` or
`--global`.

## Recommended Installation

After the first alpha tag is published, keep a tagged source checkout at a
stable path:

```bash
# Usable after v0.1.0-alpha.1 is published:
git clone --branch v0.1.0-alpha.1 --depth 1 \
  https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
```

Before publication, use a development clone without claiming that the tag is
downloadable.

For development-only checkouts, `git pull` may follow `main`. Do not use a
mutable development checkout in public installation instructions.

Install into a project or folder:

```bash
scripts/swe-forge install opencode --target /path/to/project
scripts/swe-forge install claude --target /path/to/project
scripts/swe-forge install codex --target /path/to/project
scripts/swe-forge install cursor --target /path/to/project
```

Install each requested harness explicitly. For example:

```bash
scripts/swe-forge install opencode --global
scripts/swe-forge install codex --global
```

Install the Pi global prompt-template bridge separately:

```bash
scripts/swe-forge install pi --global
scripts/swe-forge verify pi --global
```

There is no multi-harness install command. The installer deliberately handles
one harness per invocation, and never guesses a global installation. `global`
must be explicitly requested.

## Mode A: Standalone Repository

Use standalone mode to develop and version SWE Forge itself:

```bash
git clone <swe-forge-repository-url>
cd swe-forge
```

The repository's canonical source is `SWE-FORGE.md` plus the `.swe-forge/`
directory. Harness adapters are templates until the installer links the
requested bridge.

## Mode B: Project-Local Installation

The installer links these portable files into the target software repository:

```text
AGENTS.md
SWE-FORGE.md
.swe-forge/                 canonical core only; adapter catalog stays in source checkout
```

Review collisions before installing over an existing `AGENTS.md`,
`SWE-FORGE.md`, or `.swe-forge/` directory. The installer stops on a conflict so
repository-specific instructions can be merged manually without risking an
overwrite.

For a source-linked installation:

```bash
~/tools/swe-forge/scripts/swe-forge install opencode --target .
```

The installer also links the requested harness bridge:

```bash
# OpenCode: .opencode/commands/swe-forge.md and atomic delivery commands
# Claude Code: CLAUDE.md and .claude/skills/swe-forge/
# Codex and Cursor: .agents/skills/swe-forge/
# Pi: ~/.pi/agent/prompts/swe-forge.md and atomic delivery prompts
```

OpenCode and Pi also receive the explicit atomic delivery helpers
`git-commit`, `git-push`, `git-pr`, and `git-sync`. They load the canonical
`.swe-forge/policies/delivery.md`; they do not redefine the workflow. The push
helper only pushes, while the PR helper creates or reports a PR separately. The
sync helper verifies that the PR was merged before returning to the default
branch; `git-sync merged` is the explicit post-merge form.

The source checkout path must remain available to the user. Existing conflicting
files stop the install before canonical or selected adapter files are written. A
compatible prior installation is reused idempotently, but conflicting or stale
managed files are not overwritten. The installer never merges project
instructions.

For a reviewed snapshot instead:

```bash
~/tools/swe-forge/scripts/swe-forge install opencode --target . --mode copy
```

Copied installations can be updated in place after the source checkout
changes. Run `update` only after reviewing the source; it replaces unchanged
managed files and refuses locally modified copies. If an installation predates
managed manifests, recreate it explicitly rather than relying on guessed
ownership.

## Harness Bridges

Add only the bridge needed by the target harness:

- Claude Code: the project installer links a tiny `CLAUDE.md` bridge and the
  explicit skill from `.swe-forge/adapters/claude-code/`.
- OpenCode: the project installer links the explicit command to
  `.opencode/commands/swe-forge.md` and does not add model or permission config.
- Codex and Cursor: use the shared Agent Skill projection at
  `.agents/skills/swe-forge/`; the global installer uses
  `~/.agents/skills/swe-forge/` and `~/.agents/swe-forge/`. Codex installation
  does not modify `~/.codex/AGENTS.md` or Codex configuration.
- Pi: the global installer links the explicit prompt template to
  `~/.pi/agent/prompts/swe-forge.md` and does not modify Pi settings or install
  an extension.
- Herdr: the optional execution provider is documented under
  `.swe-forge/providers/herdr/` and is used only when canonical routing selects
  `ISOLATED`; install Herdr's own official skill separately if it is needed and
  already authorized. The SWE Forge installer never installs Herdr.
- Other harnesses: use the natural-language activation contract until a thin
  adapter is justified and documented.

Do not copy the full canonical workflow into a harness-specific file.

## Mode C: Global or Personal Installation

Global installation is optional and must be explicitly requested. The installer
creates source-linked harness entries in these locations:

- OpenCode: `~/.config/opencode/commands/swe-forge.md` plus the atomic
  delivery commands, and `~/.config/opencode/swe-forge/`
- Claude Code: `~/.claude/skills/swe-forge/` and `~/.claude/swe-forge/`
- Codex and Cursor: `~/.agents/skills/swe-forge/` and
  `~/.agents/swe-forge/`
- Pi: `~/.pi/agent/prompts/swe-forge.md` plus the atomic delivery prompts,
  and `~/.pi/agent/swe-forge/`

The global loaders point back to the support directory, which points back to
the canonical checkout. This makes the explicit harness entry available across
projects without copying canonical files into every project.

The installer does not modify `opencode.json`, `~/.config/opencode/AGENTS.md`,
`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, permissions, models, credentials,
or other personal configuration. It stops on conflicts instead of replacing
them.

Do not commit generated global support directories, machine-specific paths,
credentials, local model IDs, or personal run state. Run
`scripts/check-release prepare` for release-readiness evidence; tag and release
publication remain manual.

## Lifecycle commands

`version` reports the release version, source commit, and whether the source
checkout is dirty. `status` reports the source, harness, scope, mode, managed
manifest, paths, and verification result. `doctor` runs the same checks with
remediation-oriented diagnostics.

Use `--dry-run` with `install` or `update` to perform preflight and conflict
checks without creating a lock, file, link, directory, or manifest:

```bash
scripts/swe-forge install opencode --target /path/to/project --dry-run
scripts/swe-forge update opencode --target /path/to/project --dry-run
```

Each successful installation records an exact manifest under the hidden
`.swe-forge-install-state/` directory at the selected target or global support
root. The manifest records the source revision, mode, and every managed file,
link, and fingerprint. `update` replaces only unchanged copied files and
refuses modified or ambiguous entries. `uninstall` removes only entries that
still match the recorded link target or copy fingerprint and refuses modified
copies, changed links, missing manifests, and ambiguous ownership. It never
force-removes directories or shared canonical files owned by another harness.

Legacy installations created before manifests were introduced remain usable by
`verify`, `status`, and `doctor`, but `update` and `uninstall` stop safely with a
migration message rather than guessing what is managed. Review the installation
and recreate it explicitly if destructive lifecycle management is needed.

## Verification

Installation runs verification automatically. It can also be run later:

```bash
scripts/swe-forge verify opencode --target /path/to/project
scripts/swe-forge verify opencode --target /path/to/copied-project --mode copy
scripts/swe-forge verify codex --target /path/to/project
scripts/swe-forge verify cursor --target /path/to/project
scripts/swe-forge verify claude --global
scripts/swe-forge verify codex --global
scripts/swe-forge verify cursor --global
scripts/swe-forge verify pi --global
```

Verification checks the canonical files, current source contents, harness
locations, adapter references, explicit invocation settings, and dangling
links. Verification is mode-specific: link mode requires links to the current
source, while copy mode rejects symlinks and requires regular matching files.
A successful filesystem check should be followed by the harness smoke test:

```text
/swe-forge <small test ticket>
```

For Codex, invoke the installed skill explicitly:

```text
$swe-forge <small test ticket>
```

Ordinary prompts must continue to behave normally; SWE Forge remains explicitly
invoked.

## Updating the source and installed projections

For a development checkout, review and fetch source changes manually. For a
pinned public installation, choose and review a newer release tag first:

1. update the stable source checkout explicitly
2. run `scripts/swe-forge version`
3. run `status`, `doctor`, and the matching `verify` command for each install
4. use `scripts/swe-forge update <harness>` for a managed copy or link
5. review changes to activation, contracts, policies, and adapters
6. preserve project-specific `AGENTS.md` instructions
7. remove stale generated adapter files only after review
8. run the repository's documentation and structural checks

`update` never fetches, switches branches, or publishes changes. Keep temporary
run state outside the repository or under ignored `.swe-forge/runs/`.

## Filesystem Safety

The installer rejects symlinked directories beneath the selected target,
serializes cooperating installs with a target-local lock, publishes copied
files without replacing an existing destination leaf, and rolls back files and
directories created by a failed run. It does not remove or restore pre-existing
entries.

These checks prevent accidental redirection and cooperating installer races.
Portable POSIX shell cannot provide descriptor-relative no-follow operations,
so do not install into a hierarchy concurrently controlled by an untrusted
process. A stale `.swe-forge-install.lock` may be removed only after confirming
that no installation is active.
