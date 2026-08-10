# Installation

SWE Forge is a portable repository first. Keep one stable clone as the source
of truth and install links to that checkout. Installation into another project
or global harness configuration is always an explicit user action.

The repository includes a dependency-free installer:

```bash
scripts/swe-forge install <opencode|claude|all> [options]
scripts/swe-forge verify <opencode|claude|all> [options]
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

Keep the source checkout at a stable path:

```bash
git clone https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
git pull
```

Install into a project or folder:

```bash
scripts/swe-forge install opencode --target /path/to/project
scripts/swe-forge install claude --target /path/to/project
```

Install both harness bridges for the current user:

```bash
scripts/swe-forge install all --global
```

The installer never guesses a global installation. `global` must be explicitly
requested.

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
.swe-forge/
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
# OpenCode: .opencode/commands/swe-forge.md
# Claude Code: CLAUDE.md and .claude/skills/swe-forge/
```

The source checkout path must remain available to the user. Existing conflicting
files stop the install before canonical or adapter files are written. A
compatible prior installation is reused idempotently, but conflicting or stale
managed files are not overwritten. The installer never merges project
instructions.

For a reviewed snapshot instead:

```bash
~/tools/swe-forge/scripts/swe-forge install opencode --target . --mode copy
```

Copied installations do not update in place. After the source checkout changes,
review and remove the prior copied installation, then install the new snapshot.
This explicit replacement avoids silently overwriting locally modified copies.

## Harness Bridges

Add only the bridge needed by the target harness:

- Claude Code: the project installer links a tiny `CLAUDE.md` bridge and the
  explicit skill from `.swe-forge/adapters/claude-code/`.
- OpenCode: the project installer links the explicit command to
  `.opencode/commands/swe-forge.md` and does not add model or permission config.
- Herdr: use `.swe-forge/adapters/herdr/` only when an execution decision
  selects isolated work; install Herdr's own official skill separately if
  needed.
- Other harnesses: use the natural-language activation contract until a thin
  adapter is justified and documented.

Do not copy the full canonical workflow into a harness-specific file.

## Mode C: Global or Personal Installation

Global installation is optional and must be explicitly requested. The installer
creates source-linked harness entries in these locations:

- OpenCode: `~/.config/opencode/commands/swe-forge.md` and
  `~/.config/opencode/swe-forge/`
- Claude Code: `~/.claude/skills/swe-forge/` and `~/.claude/swe-forge/`

The global loaders point back to the support directory, which points back to
the canonical checkout. This makes `/swe-forge <ticket>` available across
projects without copying canonical files into every project.

The installer does not modify `opencode.json`, `~/.config/opencode/AGENTS.md`,
`~/.claude/CLAUDE.md`, permissions, models, credentials, or other personal
configuration. It stops on conflicts instead of replacing them.

Do not commit generated global support directories, machine-specific paths,
credentials, local model IDs, or personal run state.

## Verification

Installation runs verification automatically. It can also be run later:

```bash
scripts/swe-forge verify opencode --target /path/to/project
scripts/swe-forge verify opencode --target /path/to/copied-project --mode copy
scripts/swe-forge verify claude --global
```

Verification checks the canonical files, current source contents, harness
locations, adapter references, explicit invocation settings, and dangling
links. Verification is mode-specific: link mode requires links to the current
source, while copy mode rejects symlinks and requires regular matching files.
A successful filesystem check should be followed by the harness smoke test:

```text
/swe-forge <small test ticket>
```

Ordinary prompts must continue to behave normally; SWE Forge remains explicitly
invoked.

## Updating

When updating an installation:

1. run `git pull` in the stable source checkout
2. run the matching `verify` command for each installation
3. review changes to activation, contracts, policies, and adapters
4. preserve project-specific `AGENTS.md` instructions
5. remove stale generated adapter files only after review
6. run the repository's documentation and structural checks

Keep temporary run state outside the repository or under ignored
`.swe-forge/runs/`.

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
