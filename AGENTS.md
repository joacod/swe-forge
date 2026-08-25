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
- Optimize for one ticket to one reviewable delivery: one run owns one
  writable delivery checkout. Native subagents are bounded helpers; do not
  introduce concurrent writable workers, worker worktrees, external execution
  providers, fleet or scheduler layers, or cross-ticket orchestration.
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
- Before changing canonical workflow behavior, contracts, policies, routing,
  providers, delegation semantics, or harness integration boundaries, read
  `docs/architecture.md`. For adapter work, also read
  `docs/adding-a-harness.md`, `.swe-forge/adapters/README.md`, and the target
  adapter README.
- Keep the canonical workflow harness-agnostic. Canonical routing selects
  topology; adapters demonstrate and realize capabilities but do not choose a
  topology because a host exposes a native primitive.
- Keep harness-native APIs, paths, lifecycle hooks, approval models,
  task/subagent mechanisms, configuration, and host syntax inside adapters.
  Before changing canonical code for a host feature, map it to an existing
  semantic capability first; adapter-only translation is the default.
- If a core change is genuinely required, add the smallest harness-neutral
  semantic contract that is useful without the requesting harness. Do not
  introduce harness-name conditionals into canonical workflow semantics or
  user-facing Forge behavior solely to expose one host primitive.
- Capability asymmetry is valid and does not require parity work elsewhere.
  Adding a harness must not change existing harness behavior unless an
  independently justified canonical contract changes.

## Installation Requests

Installation is separate from workflow activation. When the user asks to
install SWE Forge for a harness, read `docs/installation.md` and that adapter's
README. Installation always means a user-level harness installation linked to
the stable SWE Forge checkout; only the harness name is needed.

- Use `scripts/swe-forge install <harness>` and then the matching `verify` command.
- Project-specific harness configuration is separate from SWE Forge installation
  and must not be confused with it.
- Do not overwrite or merge conflicting harness configuration without showing
  the user the conflict first.
