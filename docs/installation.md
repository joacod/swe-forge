# Installation

SWE Forge is a portable repository first. Installation into another project or
global harness configuration is an explicit user action.

## Mode A: Standalone Repository

Use standalone mode to develop and version SWE Forge itself:

```bash
git clone <swe-forge-repository-url>
cd swe-forge
```

The repository's canonical source is `SWE-FORGE.md` plus the `.swe-forge/`
directory. Harness adapters are templates and are not installed globally by
default.

## Mode B: Project-Local Installation

Copy or link these portable files into the target software repository:

```text
AGENTS.md
SWE-FORGE.md
.swe-forge/
```

Review collisions before replacing an existing `AGENTS.md`, `SWE-FORGE.md`, or
`.swe-forge/` directory. Merge repository-specific instructions into
`AGENTS.md` while preserving its small optional-activation section. Do not
overwrite unrelated project instructions.

For a reviewed copy:

```bash
cp /path/to/swe-forge/AGENTS.md ./AGENTS.md
cp /path/to/swe-forge/SWE-FORGE.md ./SWE-FORGE.md
cp -R /path/to/swe-forge/.swe-forge ./
```

For a versioned link in a controlled environment:

```bash
ln -s /path/to/swe-forge/SWE-FORGE.md ./SWE-FORGE.md
ln -s /path/to/swe-forge/.swe-forge ./.swe-forge
```

Use links only when every contributor can resolve the target path. A copied
version is usually easier to review and publish with the project.

## Harness Bridges

Add only the bridge needed by the target harness:

- Claude Code: keep or add a tiny `CLAUDE.md` containing `@AGENTS.md`; link or
  copy the optional skill from `.swe-forge/adapters/claude-code/`.
- OpenCode: copy the explicit command to `.opencode/commands/swe-forge.md` and
  optionally add thin native-agent bridges under `.opencode/agents/`.
- Herdr: use `.swe-forge/adapters/herdr/` only when an execution decision
  selects isolated work; install Herdr's own official skill separately if
  needed.
- Other harnesses: use the natural-language activation contract until a thin
  adapter is justified and documented.

Do not copy the full canonical workflow into a harness-specific file.

## Mode C: Global or Personal Installation

Global installation is optional and must be user-controlled. A harness may
reference a canonical checkout from its user-level configuration, or a user may
link a skill or instruction shim into a personal directory. Keep the canonical
repository independently versioned and use a stable, user-controlled path.

Do not silently modify directories such as `~/.config/opencode/` or `~/.claude/`.
Do not commit machine-specific paths, credentials, local model IDs, or personal
run state.

## Updating

When updating an installation:

1. compare the canonical repository revision with the project copy or link
2. review changes to activation, contracts, policies, and adapters
3. preserve project-specific `AGENTS.md` instructions
4. remove stale generated adapter files only after review
5. run the repository's documentation and structural checks

Keep temporary run state outside the repository or under ignored
`.swe-forge/runs/`.
