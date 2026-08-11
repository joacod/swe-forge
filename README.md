# SWE Forge

Portable, opt-in workflow orchestration for AI coding harnesses.

SWE Forge helps an AI coding agent turn a software ticket into a bounded,
evidence-backed change: inspect the repository, choose a proportionate
execution mode, implement, verify, review, and report.

It is a workflow layer, not a coding harness, model provider, or always-on
multi-agent swarm.

## Install

The easiest way to install SWE Forge is to open this repository in a coding
harness and ask the agent in plain language:

```text
Install SWE Forge for OpenCode globally.
```

Other useful requests:

```text
Install SWE Forge for OpenCode in this project.
Install SWE Forge for Claude Code globally.
Install SWE Forge for Codex in this project.
Install SWE Forge for Cursor globally.
Install SWE Forge for OpenCode, Claude Code, Codex, and Cursor globally.
```

The agent should read `AGENTS.md`, [the installation guide](docs/installation.md),
and the requested harness adapter documentation. It should run the installer
and matching verification command, then report any conflicts. Say `global`
explicitly; if no project or folder is named, the agent should ask where to
install.

The installer runs from this repository. Keep one stable checkout if you want
link installations to follow updates:

```bash
git clone https://github.com/joacod/swe-forge.git ~/tools/swe-forge
cd ~/tools/swe-forge
git pull
```

For deterministic shell commands, use the installer directly:

```bash
scripts/swe-forge install opencode --global
scripts/swe-forge verify opencode --global
```

Replace `opencode` with `claude`, `codex`, or `cursor` for the corresponding
harness, or with `all` to install OpenCode, Claude Code, Codex, and Cursor. Pi
uses its own global command:

```bash
scripts/swe-forge install pi --global
scripts/swe-forge verify pi --global
```

For a project-local installation:

```bash
scripts/swe-forge install opencode --target /path/to/project
scripts/swe-forge verify opencode --target /path/to/project
```

`all` is a shortcut for OpenCode, Claude Code, Codex, and Cursor. Pi is
installed separately and currently supports global installation only. Link mode
is the default; global installation is link-only. See [Installation](docs/installation.md) for
copy mode, collisions, paths, updates, and filesystem safety.

## Use It Explicitly

Installation makes the integration available; it does not activate SWE Forge.
Ordinary prompts continue to use the harness normally:

```text
Fix this typo.
```

Explicitly invoke the workflow:

```text
Use SWE Forge for this ticket:
<ticket>
```

Installed OpenCode, Claude Code, Pi, and Cursor integrations support:

```text
/swe-forge <ticket>
/swe-forge solo <ticket>
/swe-forge subagents <ticket>
/swe-forge herdr <ticket>
```

Codex exposes the same workflow as an explicit skill:

```text
$swe-forge <ticket>
$swe-forge solo <ticket>
```

If no native integration is available, place `AGENTS.md`, `SWE-FORGE.md`, and
`.swe-forge/` in the target repository and use the natural-language request.

## Supported Harnesses

| Harness | Project scope | Global scope | Entry point |
| --- | --- | --- | --- |
| [OpenCode](.swe-forge/adapters/opencode/README.md) | Yes | Yes | `/swe-forge` command |
| [Claude Code](.swe-forge/adapters/claude-code/README.md) | Yes | Yes | `/swe-forge` skill |
| [Pi](.swe-forge/adapters/pi/README.md) | No in V1 | Yes | `/swe-forge` prompt template |
| [Codex](.swe-forge/adapters/codex/README.md) | Yes | Yes | `$swe-forge` skill |
| [Cursor](.swe-forge/adapters/cursor/README.md) | Yes | Yes | `/swe-forge` skill |

Herdr is an optional execution-isolation layer for `HERDR` mode, not a harness
target for `scripts/swe-forge install`. See the [Herdr adapter](.swe-forge/adapters/herdr/README.md)
when separate worktrees, harness sessions, or execution environments provide
real value.

## How It Works

For each explicit ticket, SWE Forge automatically chooses the smallest useful
execution mode: `SOLO`, `SUBAGENTS`, or `HERDR`. It adapts the amount of
planning, delegation, validation, and review to the ticket instead of adding
ceremony to trivial work.

An explicit mode can be requested with the `/swe-forge` forms above, but it does
not bypass safety, validation, scope, or delivery authorization. See the
[workflow specification](SWE-FORGE.md) for the complete rules.

## Safety

- SWE Forge activates only after an explicit user request.
- Existing conflicting files stop installation instead of being overwritten.
- Global installation changes only the requested harness entry and its private support path; it does not modify settings, models, permissions, credentials, or JSON files.
- Normal completion stops at the reviewed, verified diff.
- Commit, push, pull-request creation, and merge require explicit authorization.

The complete activation, checkout, authorization, verification, and acceptance
rules live in [SWE-FORGE.md](SWE-FORGE.md).

## Documentation

- [Installation guide](docs/installation.md): scopes, modes, collisions, verification, updates, and filesystem safety.
- [Workflow specification](SWE-FORGE.md): canonical activation, execution, safety, and acceptance rules.
- [Architecture](docs/architecture.md): how canonical files, roles, contracts, policies, and adapters fit together.
- [Adding a harness](docs/adding-a-harness.md): how to research and build a thin adapter.
- [Adapter index](.swe-forge/adapters/README.md): harness-specific installation and integration notes.

Harness adapters are thin projections of the canonical files. They must not
become a second source of workflow truth.

## Contributing

Keep workflow behavior in `SWE-FORGE.md` and `.swe-forge/`; keep `AGENTS.md`
small; and add harness-specific behavior only as a thin adapter. Add roles or
orchestration only when evaluation evidence shows they improve real tickets.

Validate installer and structural changes with:

```bash
sh -n scripts/swe-forge scripts/test-swe-forge
scripts/check-swe-forge
scripts/test-swe-forge
```

See the contributor guides in [docs/](docs/) before extending the repository.
