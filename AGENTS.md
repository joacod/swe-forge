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
- SWE Forge is Pi-first, not Pi-only: Pi is the first-class/reference harness;
  OpenCode is compatible/secondary; Claude Code, Codex, and Cursor are
  experimental. These tiers describe current maintenance and testing
  commitment, not a parity guarantee.
- Keep the canonical workflow portable and branch on semantic capabilities,
  not harness identity. Harness-specific APIs and lifecycle behavior belong in
  adapters, and missing optional capabilities use the documented fallback.
- New Pi functionality does not require parity implementations elsewhere. Do
  not add abstractions solely for hypothetical parity or delete an adapter
  because its support is experimental; tiers may change with real validation.

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
