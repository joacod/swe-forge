# Harness Adapters

Adapters expose the canonical SWE Forge workflow through harness-native
features. They are optional integration layers, not alternate workflow
definitions.

## Source of Truth

Always update these canonical files first:

- `../../AGENTS.md`
- `../../SWE-FORGE.md`
- `../../.swe-forge/workflows/`
- `../../.swe-forge/agents/`
- `../../.swe-forge/contracts/`
- `../../.swe-forge/policies/`

An adapter may contain a loader, command, permission mapping, or runbook. It
must point the harness back to those files rather than copying their content.

## Installation Boundary

The files in this directory are portable templates and documentation. They are
not discovered automatically by a harness while they remain here. Installation
means copying or linking only the adapter files appropriate for a target
repository or user configuration.

For the supported V1 harnesses, prefer `scripts/swe-forge install` and
`scripts/swe-forge verify`. The installer links adapters to the canonical
checkout by default and accepts `--global` only when the user explicitly asks
for user-level harness access.

Do not modify global harness configuration as part of installing SWE Forge
unless the user explicitly requests it. Prefer project-local files or links
that can be reviewed and versioned.

## Adapters

- [OpenCode](opencode/README.md): project command and optional native-agent
  bridge pattern
- [Claude Code](claude-code/README.md): project skill and `CLAUDE.md` bridge
- [Herdr](herdr/README.md): optional isolated execution runbook
- [Codex](codex/README.md): portable `AGENTS.md` path with no V1-specific native
  configuration
