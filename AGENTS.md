# Agent Instructions

Use the repository normally unless the user explicitly requests SWE Forge.

## SWE Forge

SWE Forge is an optional advanced software-engineering workflow defined in:

`SWE-FORGE.md`

Do not automatically load or execute SWE Forge.

Activate it only when the user explicitly:

- says "Use SWE Forge"
- says "Follow SWE Forge"
- references `SWE-FORGE.md`
- invokes a harness-specific SWE Forge command such as `/swe-forge`

When activated, read `SWE-FORGE.md` and follow the workflow it defines.

## Maintaining SWE Forge

When changing this repository itself:

- Run state is ephemeral internal implementation state. Only the current
  schema is supported; reject obsolete state rather than migrating it. Update
  producers, consumers, validation, adapters, and fixtures atomically. Do not
  add compatibility shims, legacy fallbacks, or duplicate compatibility fields
  without a concrete current need. Keep one canonical owner; retain derived
  projections only for a real recovery purpose.
- Preserve root/orchestrator authority, bounded task-specific worker context,
  no peer-to-peer worker communication, proportional worker results, compact
  root-accepted dependency digests, conservative read-only fan-out/fan-in, and
  stage-triggered minimal policy loading. Add deterministic enforcement only
  where the risk/reward is clear.
- Prefer deletion, consolidation, canonical ownership, small deterministic
  guards, and low-risk changes over new orchestration/state/message
  frameworks, telemetry, benchmarks, speculative abstractions, or unneeded
  compatibility machinery. Detailed contracts and policies remain canonical
  in `SWE-FORGE.md` and `.swe-forge/`.

## Installation Requests

Installation is separate from workflow activation. When the user explicitly
asks to install SWE Forge for a harness, for example `install swe-forge
opencode`, read `docs/installation.md` and the requested adapter README.

- Ask where to install it when the user did not provide a repository, folder, or
  `global` scope.
- Use `scripts/swe-forge install <harness> --target <path>` for a project or
  `scripts/swe-forge install <harness> --global` for user-level harness access.
- Pi's adapter is global-only: use `scripts/swe-forge install pi --global`.
- Codex and Cursor support project and global skill installations through the
  matching `scripts/swe-forge install` command.
- Run the matching `scripts/swe-forge verify` command after installation.
- Never modify global harness configuration unless the user explicitly chose
  `global`.
- Do not overwrite or merge conflicting instruction files without showing the
  user the conflict first.
